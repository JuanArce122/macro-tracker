import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { searchFoods } from "@/lib/foods"; // fallback offline
import { FoodCreateSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/api/validate";
import { rankFoods } from "@/lib/foods/ranking";

// ─── Tipos Open Food Facts ────────────────────────────────────────────────────

type OFFProduct = {
  product_name?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
};

type OFFResponse = {
  products?: OFFProduct[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function searchOpenFoodFacts(query: string, limit = 8): Promise<OFFProduct[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&fields=product_name,nutriments&page_size=${limit}&lc=es`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

  try {
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data: OFFResponse = await res.json();
    return data.products ?? [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeOFFProduct(p: OFFProduct): {
  nombre: string; cal: number; p: number; c: number; f: number;
} | null {
  const name = p.product_name?.trim();
  if (!name) return null;

  const cal = p.nutriments?.["energy-kcal_100g"] ?? 0;
  const prot = p.nutriments?.proteins_100g ?? 0;
  const carbs = p.nutriments?.carbohydrates_100g ?? 0;
  const fat = p.nutriments?.fat_100g ?? 0;

  // Descartar productos sin datos nutricionales útiles
  if (cal === 0 && prot === 0) return null;
  // Descartar valores imposibles
  if (cal > 1000 || prot > 100 || carbs > 100 || fat > 100) return null;

  return {
    nombre: name,
    cal: Math.round(cal * 10) / 10,
    p: Math.round(prot * 10) / 10,
    c: Math.round(carbs * 10) / 10,
    f: Math.round(fat * 10) / 10,
  };
}

// ─── POST: crear alimento del usuario ────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const parsed = await validateBody(req, FoodCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { nombre, cal, p, c, f, gramsPerUnit, unitLabel } = parsed.data;

  const food = await prisma.food.create({
    data: {
      nombre,
      categoria: "user",
      cal,
      p,
      c,
      f,
      gramsPerUnit: gramsPerUnit ?? null,
      unitLabel: unitLabel ?? null,
      source: "user",
      userId,
    },
  });

  return NextResponse.json({ food }, { status: 201 });
}

// ─── GET endpoint ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "10"), 20);
  const userId = Number(session.user.id);

  if (!q || q.length < 2) return NextResponse.json({ foods: [] });

  try {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);

    // HU-12: priorización regional según countryCode del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { countryCode: true },
    });
    const userCountry = user?.countryCode ?? null;

    // 1. Buscar en DB local (USDA + usuario + cache de OFF + regionales)
    //    Pedimos más de `limit` para poder priorizar regionales en JS.
    const dbFoods = await prisma.food.findMany({
      where: {
        AND: words.map((word) => ({ nombre: { contains: word } })),
        OR: [{ userId: null }, { userId }],
      },
      orderBy: [{ source: "asc" }, { nombre: "asc" }],
      take: limit * 3,
    });

    // HU-12: ordenar por prioridad regional (ver lib/foods/ranking.ts)
    const dbFoodsRanked = rankFoods(dbFoods, userCountry, limit);

    // 2. Si hay suficientes resultados locales, retornar sin llamar a OFF
    if (dbFoodsRanked.length >= 5) {
      return NextResponse.json({ foods: dbFoodsRanked });
    }
    // Para el resto del flujo seguimos usando dbFoods (que ya tiene los datos)
    // pero la respuesta final usa el ranking.

    // 3. Consultar Open Food Facts en paralelo
    const offProducts = await searchOpenFoodFacts(q, 10);
    const normalized = offProducts.map(normalizeOFFProduct).filter(Boolean) as ReturnType<typeof normalizeOFFProduct>[];

    // 4. Cachear en DB los que no existan ya (por nombre exacto)
    const existingNames = new Set(dbFoods.map((f) => f.nombre.toLowerCase()));
    const toCache = normalized.filter((p) => p && !existingNames.has(p.nombre.toLowerCase()));

    // Cachear en DB — buscar si ya existe por nombre+source antes de insertar
    const existingOFF = await prisma.food.findMany({
      where: {
        source: "openfoodfacts",
        userId: null,
        nombre: { in: toCache.map((f) => f!.nombre) },
      },
      select: { nombre: true },
    });
    const alreadyCached = new Set(existingOFF.map((f) => f.nombre.toLowerCase()));
    const toInsert = toCache.filter((f) => f && !alreadyCached.has(f.nombre.toLowerCase()));

    let cachedFoods: { id: number; nombre: string; cal: number; p: number; c: number; f: number; source: string }[] = [];
    if (toInsert.length > 0) {
      await prisma.food.createMany({
        data: toInsert.slice(0, 8).map((food) => ({
          nombre: food!.nombre,
          categoria: "otros",
          cal: food!.cal,
          p: food!.p,
          c: food!.c,
          f: food!.f,
          source: "openfoodfacts",
          userId: null,
        })),
      });
      // Recuperar los recién insertados para retornarlos
      cachedFoods = await prisma.food.findMany({
        where: {
          source: "openfoodfacts",
          userId: null,
          nombre: { in: toInsert.map((f) => f!.nombre) },
        },
      });
    }

    // 5. Combinar: ranked locales primero, luego OFF cacheados
    const allFoods = [
      ...dbFoodsRanked,
      ...cachedFoods.filter((f) => !existingNames.has(f.nombre.toLowerCase())),
    ].slice(0, limit);

    return NextResponse.json({ foods: allFoods });

  } catch {
    // Fallback offline: búsqueda en array estático
    const localResults = searchFoods(q);
    return NextResponse.json({ foods: localResults, source: "local" });
  }
}
