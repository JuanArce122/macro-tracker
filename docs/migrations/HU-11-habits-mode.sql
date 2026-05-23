-- HU-11: Modo hábitos opcional (sin tracking exacto)
-- Aplicar en producción Turso vía:
--   turso db shell macro-tracker-juanparce < docs/migrations/HU-11-habits-mode.sql
--
-- Local dev: ya se aplica vía `prisma db push`.
-- Rollback al final.

-- ── User: agregar trackingMode ──────────────────────────────────────
ALTER TABLE User ADD COLUMN trackingMode TEXT NOT NULL DEFAULT 'macros';

-- ── HabitEntry ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS HabitEntry (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  userId          INTEGER NOT NULL,
  date            TEXT NOT NULL,
  proteinPortions INTEGER NOT NULL DEFAULT 0,
  vegPortions     INTEGER NOT NULL DEFAULT 0,
  carbPortions    INTEGER NOT NULL DEFAULT 0,
  fatPortions     INTEGER NOT NULL DEFAULT 0,
  fruitPortions   INTEGER NOT NULL DEFAULT 0,
  createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt       DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  UNIQUE(userId, date)
);
CREATE INDEX IF NOT EXISTS HabitEntry_userId_date_idx ON HabitEntry(userId, date);


-- ════════════════════════════════════════════════════════════════════
-- ROLLBACK
-- ════════════════════════════════════════════════════════════════════
-- DROP INDEX IF EXISTS HabitEntry_userId_date_idx;
-- DROP TABLE IF EXISTS HabitEntry;
-- ALTER TABLE User DROP COLUMN trackingMode;
