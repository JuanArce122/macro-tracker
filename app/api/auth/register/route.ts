import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ error: "Email y contraseña son requeridos." }, { status: 400 });
    }

    if (!EMAIL_RE.test(email)) {
      return Response.json({ error: "El email no es válido." }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json({ error: "Ya existe una cuenta con ese email." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    return Response.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (error) {
    console.error("[register POST]", error);
    return Response.json({ error: "Error al crear la cuenta." }, { status: 500 });
  }
}
