-- HU-12: Soporte regional auténtico (CO → LAC)
-- Aplicar en producción Turso vía:
--   turso db shell macro-tracker-juanparce < docs/migrations/HU-12-regional-co.sql
--
-- Local dev: ya se aplica vía `prisma db push` (cambios reflejados en prisma/schema.prisma).
-- Rollback al final.

-- ── User: agregar countryCode ──────────────────────────────────────
ALTER TABLE User ADD COLUMN countryCode TEXT;

-- ── Food: agregar regionCode + índice ──────────────────────────────
ALTER TABLE Food ADD COLUMN regionCode TEXT;
CREATE INDEX IF NOT EXISTS Food_regionCode_idx ON Food(regionCode);

-- ── Verificación ───────────────────────────────────────────────────
-- SELECT name FROM pragma_table_info('User') WHERE name = 'countryCode';
-- SELECT name FROM pragma_table_info('Food') WHERE name = 'regionCode';
-- SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = 'Food_regionCode_idx';


-- ════════════════════════════════════════════════════════════════════
-- ROLLBACK (solo correr si necesitas deshacer la migración)
-- ════════════════════════════════════════════════════════════════════
-- DROP INDEX IF EXISTS Food_regionCode_idx;
-- ALTER TABLE Food DROP COLUMN regionCode;
-- ALTER TABLE User DROP COLUMN countryCode;
