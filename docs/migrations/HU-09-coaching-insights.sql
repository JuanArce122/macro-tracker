-- HU-09: Coaching contextual — Insight + PushSubscription
-- Aplicar en producción Turso vía:
--   turso db shell macro-tracker-juanparce < docs/migrations/HU-09-coaching-insights.sql
--
-- Local dev: ya se aplica vía `prisma db push`.
-- Rollback al final.

-- ── Insight ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Insight (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  userId        INTEGER NOT NULL,
  type          TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  dataJson      TEXT NOT NULL,
  createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dismissedAt   DATETIME,
  dismissReason TEXT,
  pushedAt      DATETIME,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS Insight_userId_createdAt_idx ON Insight(userId, createdAt);
CREATE INDEX IF NOT EXISTS Insight_userId_dismissedAt_idx ON Insight(userId, dismissedAt);

-- ── PushSubscription ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS PushSubscription (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    INTEGER NOT NULL,
  endpoint  TEXT UNIQUE NOT NULL,
  p256dh    TEXT NOT NULL,
  auth      TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS PushSubscription_userId_idx ON PushSubscription(userId);


-- ════════════════════════════════════════════════════════════════════
-- ROLLBACK
-- ════════════════════════════════════════════════════════════════════
-- DROP INDEX IF EXISTS PushSubscription_userId_idx;
-- DROP TABLE IF EXISTS PushSubscription;
-- DROP INDEX IF EXISTS Insight_userId_dismissedAt_idx;
-- DROP INDEX IF EXISTS Insight_userId_createdAt_idx;
-- DROP TABLE IF EXISTS Insight;
