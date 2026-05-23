-- HU-07: Micronutrientes inteligentes
-- Aplicar en producción Turso vía:
--   turso db shell macro-tracker-juanparce < docs/migrations/HU-07-micronutrients.sql
--
-- Local dev: ya se aplica vía `prisma db push`.
-- Rollback al final.

-- ── Food: 15 micronutrientes + fdcId ─────────────────────────────────
ALTER TABLE Food ADD COLUMN fiber REAL;
ALTER TABLE Food ADD COLUMN sugar REAL;
ALTER TABLE Food ADD COLUMN sodium REAL;
ALTER TABLE Food ADD COLUMN potassium REAL;
ALTER TABLE Food ADD COLUMN calcium REAL;
ALTER TABLE Food ADD COLUMN iron REAL;
ALTER TABLE Food ADD COLUMN vitaminC REAL;
ALTER TABLE Food ADD COLUMN vitaminD REAL;
ALTER TABLE Food ADD COLUMN vitaminB12 REAL;
ALTER TABLE Food ADD COLUMN vitaminA REAL;
ALTER TABLE Food ADD COLUMN folate REAL;
ALTER TABLE Food ADD COLUMN magnesium REAL;
ALTER TABLE Food ADD COLUMN zinc REAL;
ALTER TABLE Food ADD COLUMN omega3 REAL;
ALTER TABLE Food ADD COLUMN omega6 REAL;
ALTER TABLE Food ADD COLUMN fdcId INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS Food_fdcId_unique ON Food(fdcId) WHERE fdcId IS NOT NULL;

-- ── Meal: snapshot de los mismos 15 micros ──────────────────────────
ALTER TABLE Meal ADD COLUMN fiber REAL;
ALTER TABLE Meal ADD COLUMN sugar REAL;
ALTER TABLE Meal ADD COLUMN sodium REAL;
ALTER TABLE Meal ADD COLUMN potassium REAL;
ALTER TABLE Meal ADD COLUMN calcium REAL;
ALTER TABLE Meal ADD COLUMN iron REAL;
ALTER TABLE Meal ADD COLUMN vitaminC REAL;
ALTER TABLE Meal ADD COLUMN vitaminD REAL;
ALTER TABLE Meal ADD COLUMN vitaminB12 REAL;
ALTER TABLE Meal ADD COLUMN vitaminA REAL;
ALTER TABLE Meal ADD COLUMN folate REAL;
ALTER TABLE Meal ADD COLUMN magnesium REAL;
ALTER TABLE Meal ADD COLUMN zinc REAL;
ALTER TABLE Meal ADD COLUMN omega3 REAL;
ALTER TABLE Meal ADD COLUMN omega6 REAL;


-- ════════════════════════════════════════════════════════════════════
-- ROLLBACK (correr solo si necesitas deshacer la migración)
-- ════════════════════════════════════════════════════════════════════
-- DROP INDEX IF EXISTS Food_fdcId_unique;
-- ALTER TABLE Food DROP COLUMN fdcId;
-- ALTER TABLE Food DROP COLUMN omega6;
-- ... (drop todas las 15 columnas en Food + 15 en Meal)
