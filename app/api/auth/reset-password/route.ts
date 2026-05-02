import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return Response.json({ error: "Token y contraseña son requeridos." }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!record) {
      return Response.json({ error: "El enlace no es válido." }, { status: 400 });
    }

    if (record.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { token } });
      return Response.json({ error: "El enlace ha expirado. Solicita uno nuevo." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Actualizar contraseña y eliminar token en una transacción
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.delete({ where: { token } }),
    ]);

    return Response.json({ message: "Contraseña actualizada correctamente." });
  } catch (error) {
    console.error("[reset-password POST]", error);
    return Response.json({ error: "Error al restablecer la contraseña." }, { status: 500 });
  }
}
