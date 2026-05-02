import { handlers } from "@/auth";
import type { NextRequest } from "next/server";

// Wrapper necesario por incompatibilidad de tipos entre next-auth@beta y Next.js 16
export async function GET(req: NextRequest) {
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  return handlers.POST(req);
}
