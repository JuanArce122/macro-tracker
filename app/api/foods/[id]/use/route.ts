import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

type Params = { params: Promise<{ id: string }> };

// POST /api/foods/[id]/use — registrar uso de un alimento
// Actualiza usageCount y lastUsedAt para mostrar recientes
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);
  const { id } = await params;
  const foodId = Number(id);

  try {
    // Solo alimentos globales o propios: no permitir tocar usageCount /
    // lastUsedAt de un alimento privado de OTRO usuario (S11). updateMany no
    // lanza si el filtro no matchea.
    const result = await prisma.food.updateMany({
      where: { id: foodId, OR: [{ userId: null }, { userId }] },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: result.count > 0 });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
