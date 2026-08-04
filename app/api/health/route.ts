export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — endpoint público (sin auth). Expone el SHA del commit
 * desplegado para que el workflow de migración (`.github/workflows/migrate-prod.yml`)
 * migre SOLO cuando el deploy del commit actual está vivo. Antes esperaba un 401
 * de `/api/admin/migrate`, pero el deploy VIEJO también responde 401 → se migraba
 * contra código viejo (P6).
 */
export async function GET() {
  return Response.json({
    ok: true,
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  });
}
