import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { NextRequest } from "next/server";
import crypto from "crypto";
import { sha256Hex } from "@/lib/crypto";

// Respuesta genérica — nunca revelar si el email existe o no
const GENERIC_OK = { message: "Si ese email está registrado, recibirás un enlace en breve." };

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return Response.json({ error: "Email requerido." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    // Devolvemos 200 aunque el email no exista (evita enumeración de usuarios)
    if (!user) {
      return Response.json(GENERIC_OK);
    }

    // Eliminar tokens anteriores del mismo usuario
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    // Token aleatorio de 32 bytes: se envía en claro por email pero se guarda
    // HASHEADO (sha256) — un dump de la DB no permite tomar cuentas (S7).
    const rawToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token: sha256Hex(rawToken), expiresAt },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${appUrl}/auth/reset-password?token=${rawToken}`;

    await sendPasswordResetEmail(email, resetUrl);

    return Response.json(GENERIC_OK);
  } catch (error) {
    console.error("[forgot-password POST]", error);
    // No exponer detalles del error
    return Response.json(GENERIC_OK);
  }
}
