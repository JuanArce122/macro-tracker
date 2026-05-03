import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// DELETE /api/meals/all — elimina todas las comidas del usuario autenticado
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const { count } = await prisma.meal.deleteMany({ where: { userId } });

    return Response.json({ ok: true, deleted: count });
  } catch (error) {
    console.error("[meals/all DELETE]", error);
    return Response.json({ error: "Error al borrar historial" }, { status: 500 });
  }
}
