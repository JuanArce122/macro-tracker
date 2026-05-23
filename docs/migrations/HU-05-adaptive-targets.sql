-- HU-05: Targets adaptativos opcionales
-- Aplicar en producción Turso vía:
--   turso db shell macro-tracker-juanparce < docs/migrations/HU-05-adaptive-targets.sql
--
-- Local dev: ya se aplica vía `prisma db push`.
-- Rollback al final.

-- ── Goal: agregar adjustmentMode ────────────────────────────────────
ALTER TABLE Goal ADD COLUMN adjustmentMode TEXT NOT NULL DEFAULT 'manual';

-- ── WeightEntry ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS WeightEntry (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    INTEGER NOT NULL,
  date      TEXT NOT NULL,
  weightKg  REAL NOT NULL,
  source    TEXT NOT NULL DEFAULT 'manual',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  UNIQUE(userId, date)
);
CREATE INDEX IF NOT EXISTS WeightEntry_userId_date_idx ON WeightEntry(userId, date);

-- ── GoalAdjustmentLog ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS GoalAdjustmentLog (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  userId      INTEGER NOT NULL,
  goalId      INTEGER NOT NULL,
  oldCalories REAL NOT NULL,
  oldProtein  REAL NOT NULL,
  oldCarbs    REAL NOT NULL,
  oldFat      REAL NOT NULL,
  newCalories REAL NOT NULL,
  newProtein  REAL NOT NULL,
  newCarbs    REAL NOT NULL,
  newFat      REAL NOT NULL,
  reason      TEXT NOT NULL,
  mode        TEXT NOT NULL,
  createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (goalId) REFERENCES Goal(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS GoalAdjustmentLog_userId_idx ON GoalAdjustmentLog(userId, createdAt);


-- ════════════════════════════════════════════════════════════════════
-- ROLLBACK
-- ════════════════════════════════════════════════════════════════════
-- DROP INDEX IF EXISTS GoalAdjustmentLog_userId_idx;
-- DROP TABLE IF EXISTS GoalAdjustmentLog;
-- DROP INDEX IF EXISTS WeightEntry_userId_date_idx;
-- DROP TABLE IF EXISTS WeightEntry;
-- ALTER TABLE Goal DROP COLUMN adjustmentMode;
