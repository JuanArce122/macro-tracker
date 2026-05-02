// Middleware mínimo — la protección se maneja en Server Components y API routes
// Auth.js no es compatible con Vercel Edge Runtime, así que todos los endpoints
// y páginas llaman a auth() directamente para verificar sesión y redirigir al login si es necesario.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // No hacer nada aquí — la autenticación se verifica en cada Server Component y API route
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
