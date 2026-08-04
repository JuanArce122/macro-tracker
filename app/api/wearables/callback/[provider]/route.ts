import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import {
  exchangeCode,
  isSupportedProvider,
} from "@/lib/wearables/providers";

export const runtime = "nodejs";

const STATE_COOKIE_PREFIX = "wearable_oauth_state_";

type Params = { params: Promise<{ provider: string }> };

function clearStateCookie(response: NextResponse, provider: string): void {
  response.cookies.set(`${STATE_COOKIE_PREFIX}${provider}`, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * GET /api/wearables/callback/[provider]?code=...&state=...
 *
 * Flow del callback OAuth:
 *  1. Verifica state CSRF contra la cookie
 *  2. Intercambia code → tokens
 *  3. Encripta y guarda en WearableConnection (upsert)
 *  4. Limpia la cookie de state
 *  5. Redirige a /settings/wearables?connected={provider}
 *
 * Si algo falla, redirige a /settings/wearables?error=...
 */
export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const { provider } = await params;
  if (!isSupportedProvider(provider)) {
    return Response.json({ error: "Provider no soportado" }, { status: 400 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Helper para redirigir con error
  const base = process.env.NEXTAUTH_URL ?? `${url.protocol}//${url.host}`;
  function redirectError(reason: string) {
    const response = NextResponse.redirect(
      `${base}/settings/wearables?error=${encodeURIComponent(reason)}`,
      302
    );
    clearStateCookie(response, provider);
    return response;
  }

  // El usuario canceló o el provider rechazó
  if (error) {
    return redirectError(error);
  }

  if (!code || !state) {
    return redirectError("missing_params");
  }

  // Validar state contra cookie
  const cookieState = req.cookies.get(`${STATE_COOKIE_PREFIX}${provider}`)?.value;
  if (!cookieState || cookieState !== state) {
    return redirectError("state_mismatch");
  }

  // Intercambiar code → tokens
  let tokens;
  try {
    tokens = await exchangeCode(provider, code);
  } catch (err) {
    console.error(`[wearables/callback/${provider}] exchange failed:`, err);
    return redirectError("token_exchange_failed");
  }

  // Upsert en DB con tokens encriptados
  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
  try {
    await prisma.wearableConnection.upsert({
      where: { userId_provider: { userId, provider } },
      create: {
        userId,
        provider,
        providerUserId: tokens.providerUserId,
        accessToken: encrypt(tokens.accessToken),
        refreshToken: encrypt(tokens.refreshToken),
        expiresAt,
        scopes: "", // los scopes se manejan en la lib client; podemos persistirlos en futuro
      },
      update: {
        providerUserId: tokens.providerUserId,
        accessToken: encrypt(tokens.accessToken),
        refreshToken: encrypt(tokens.refreshToken),
        expiresAt,
      },
    });
  } catch (err) {
    console.error(`[wearables/callback/${provider}] db upsert failed:`, err);
    return redirectError("db_failed");
  }

  // Éxito — redirigir limpio
  const response = NextResponse.redirect(
    `${base}/settings/wearables?connected=${provider}`,
    302
  );
  clearStateCookie(response, provider);
  return response;
}
