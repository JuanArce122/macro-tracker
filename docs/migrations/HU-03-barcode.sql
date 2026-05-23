-- HU-03: Escaneo de código de barras
-- Aplicar en producción Turso vía:
--   turso db shell macro-tracker-juanparce < docs/migrations/HU-03-barcode.sql
--
-- Local dev: ya se aplica vía `prisma db push`.
-- Rollback al final.

-- ── Food: agregar barcode (UNIQUE NULL-tolerant) ─────────────────────
-- SQLite trata NULLs como distintos en UNIQUE, así que múltiples filas
-- con barcode NULL no colisionan.
ALTER TABLE Food ADD COLUMN barcode TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS Food_barcode_unique ON Food(barcode) WHERE barcode IS NOT NULL;

-- ── Verificación ───────────────────────────────────────────────────
-- SELECT name FROM pragma_table_info('Food') WHERE name = 'barcode';
-- SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'Food_barcode_unique';


-- ════════════════════════════════════════════════════════════════════
-- ROLLBACK (solo correr si necesitas deshacer la migración)
-- ════════════════════════════════════════════════════════════════════
-- DROP INDEX IF EXISTS Food_barcode_unique;
-- ALTER TABLE Food DROP COLUMN barcode;
