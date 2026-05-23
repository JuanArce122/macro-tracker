import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/auth";
import { getAuthUrl, isSupportedProvider } from "@/lib/wearables/providers";

export const runtime = "nodejs";

const STATE_COOKIE_PREFIX = "wearable_oauth_state_";
const STATE_TTL_SECONDS = 10 * 60; // 10 minutos para completar el flow

type Params = { params: Promise<{ provider: string }> };

/**
 * GET /api/wearables/connect/[provider]
 *
 * Inicia el flow OAuth:
 *  1. Genera un token CSRF random
 *  2. Lo guarda en cookie HttpOnly Secure SameSite=Lax (10 min)
 *  3. Redirige al usuario al authorize URL del provider con el state
 *
 * Validamos `provider` contra la allowlist para evitar redirects abiertos.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { provider } = await params;
  if (!isSupportedProvider(provider)) {
    return Response.json({ error: "Provider no soportado" }, { status: 400 });
  }

  const state = randomBytes(32).toString("hex");
  const authUrl = getAuthUrl(provider, state);

  // Redirigir y setear la cookie de state. Lax permite el redirect post-OAuth.
  const response = Response.redirect(authUrl, 302);
  response.headers.append(
    "Set-Cookie",
    [
      `${STATE_COOKIE_PREFIX}${provider}=${state}`,
      "Path=/",
      `Max-Age=${STATE_TTL_SECONDS}`,
      "HttpOnly",
      "SameSite=Lax",
      process.env.NODE_ENV === "production" ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; ")
  );
  return response;
}
