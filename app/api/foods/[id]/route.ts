import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/foods/[id] — eliminar alimento del usuario
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);
  const { id } = await params;
  const foodId = Number(id);

  const food = await prisma.food.findUnique({ where: { id: foodId } });
  if (!food) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Solo puede eliminar sus propios alimentos
  if (food.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.food.delete({ where: { id: foodId } });
  return NextResponse.json({ ok: true });
}
