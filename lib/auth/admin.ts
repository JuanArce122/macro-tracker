/**
 * Verificación de permisos de administrador (HU-04).
 *
 * No tenemos roles persistidos en la DB todavía. Para evitar agregar otra
 * tabla en este sprint, la lista de admins se controla con la variable
 * de entorno ADMIN_EMAILS (CSV de direcciones).
 *
 * Ejemplo:
 *   ADMIN_EMAILS=jarceandrade@gmail.com,otro@admin.com
 */

import { auth } from "@/auth";

export type AdminSession = {
  userId: number;
  email: string;
};

/**
 * Devuelve la sesión si el usuario está autenticado Y es admin,
 * o `null` en otro caso. La distinción 401 vs 403 la hace el caller.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;

  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!allowlist.includes(session.user.email.toLowerCase())) return null;

  return {
    userId: Number(session.user.id),
    email: session.user.email,
  };
}

/**
 * Helper para endpoints admin: retorna `null` si OK, o un Response
 * 401/403 si no autorizado. El caller hace early return.
 *
 *   const guard = await requireAdmin();
 *   if (guard) return guard;
 *   // ... lógica autorizada ...
 */
export async function requireAdmin(): Promise<Response | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const admin = await getAdminSession();
  if (!admin) {
    return Response.json({ error: "Solo administradores" }, { status: 403 });
  }
  return null;
}
