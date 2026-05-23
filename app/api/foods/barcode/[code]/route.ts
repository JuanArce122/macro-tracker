import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  isValidBarcode,
  normalizeBarcode,
  fetchFromOFF,
  normalizeOFFProduct,
  matchesRegion,
} from "@/lib/barcode";

type Params = { params: Promise<{ code: string }> };

/**
 * GET /api/foods/barcode/[code]
 *
 * Flujo:
 *   1. Normalizar y validar el código
 *   2. Buscar en DB local (cache + entradas previas)
 *   3. Si no existe → llamar a Open Food Facts
 *   4. Si OFF retorna producto → guardar en DB con source=openfoodfacts
 *      y barcode normalizado, retornar { food, cached: false }
 *   5. Si OFF retorna 404/status:0 → retornar 404 con suggestion=create_manual
 *
 * Si OFF retorna múltiples versiones (productos en distintos países),
 * priorizamos los que matchean User.countryCode (HU-12).
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const { code: rawCode } = await params;
  const code = normalizeBarcode(rawCode);

  if (!isValidBarcode(code)) {
    return NextResponse.json(
      { error: "Código de barras inválido", code: rawCode },
      { status: 400 }
    );
  }

  // ── 1. Buscar en DB local ──────────────────────────────────────────
  const cached = await prisma.food.findUnique({
    where: { barcode: code },
  });
  if (cached) {
    return NextResponse.json({ food: cached, cached: true });
  }

  // ── 2. Consultar Open Food Facts ───────────────────────────────────
  const offResponse = await fetchFromOFF(code);
  if (!offResponse || offResponse.status !== 1 || !offResponse.product) {
    return NextResponse.json(
      {
        error: "Producto no encontrado",
        suggestion: "create_manual",
        barcode: code,
      },
      { status: 404 }
    );
  }

  const normalized = normalizeOFFProduct(offResponse.product);
  if (!normalized) {
    // OFF lo conoce pero los datos están corruptos / vacíos
    return NextResponse.json(
      {
        error: "El producto existe pero no tiene datos nutricionales válidos",
        suggestion: "create_manual",
        barcode: code,
      },
      { status: 404 }
    );
  }

  // ── 3. Determinar regionCode si OFF marca el país del usuario ───────
  const userCountry = await prisma.user
    .findUnique({ where: { id: userId }, select: { countryCode: true } })
    .then((u) => u?.countryCode ?? null);

  const isRegional = matchesRegion(offResponse.product.countries_tags, userCountry);

  // ── 4. Guardar en DB y retornar ────────────────────────────────────
  // Si por alguna razón hubo race condition y otro insert ya creó este
  // barcode, retornamos el existente.
  let food;
  try {
    food = await prisma.food.create({
      data: {
        nombre: normalized.nombre,
        categoria: "otros",
        cal: normalized.cal,
        p: normalized.p,
        c: normalized.c,
        f: normalized.f,
        source: "openfoodfacts",
        userId: null,
        barcode: code,
        regionCode: isRegional && userCountry ? userCountry : null,
      },
    });
  } catch {
    // Posible UNIQUE conflict por race condition — re-query
    food = await prisma.food.findUnique({ where: { barcode: code } });
    if (!food) {
      return NextResponse.json(
        { error: "No se pudo guardar el producto" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ food, cached: false });
}
