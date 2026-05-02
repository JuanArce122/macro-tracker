import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/auth",
  "/api/auth",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

const STATIC_PATHS = [
  "/_next/",
  "/favicon.ico",
  "/manifest.json",
  "/sw.js",
  "/icons/",
  "/uploads/",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Permitir archivos estáticos sin verificación
  if (STATIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Permitir rutas públicas (auth pages y endpoints de next-auth)
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Sin sesión → redirigir al login
  if (!req.auth) {
    const loginUrl = new URL("/auth", req.url);
    // Guardar la ruta original para redirigir de vuelta después del login
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Aplica a todas las rutas excepto las de Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
  // Auth.js requiere Node.js runtime, no Edge Runtime
  runtime: "nodejs",
};
