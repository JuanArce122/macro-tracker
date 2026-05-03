import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// DELETE /api/account — elimina el usuario y todos sus datos (cascada)
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    // Borrar en orden por foreign keys: comidas y alimentos del usuario antes que el usuario
    await prisma.$transaction([
      prisma.meal.deleteMany({ where: { userId } }),
      prisma.goal.deleteMany({ where: { userId } }),
      prisma.food.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[account DELETE]", error);
    return Response.json({ error: "Error al eliminar cuenta" }, { status: 500 });
  }
}
