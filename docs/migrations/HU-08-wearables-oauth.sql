-- HU-08: Wearables OAuth (Fitbit + Oura inicial; Garmin como follow-up)
-- Aplicar en producción Turso vía:
--   turso db shell macro-tracker-juanparce < docs/migrations/HU-08-wearables-oauth.sql
--
-- Local dev: ya se aplica vía `prisma db push`.
-- Rollback al final.

-- ── WearableConnection ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS WearableConnection (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  userId         INTEGER NOT NULL,
  provider       TEXT NOT NULL,
  providerUserId TEXT NOT NULL,
  accessToken    TEXT NOT NULL,
  refreshToken   TEXT NOT NULL,
  expiresAt      DATETIME NOT NULL,
  scopes         TEXT NOT NULL,
  connectedAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lastSyncedAt   DATETIME,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  UNIQUE(userId, provider)
);
CREATE INDEX IF NOT EXISTS WearableConnection_provider_expires_idx ON WearableConnection(provider, expiresAt);

-- ── ActivityData ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ActivityData (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  userId          INTEGER NOT NULL,
  date            TEXT NOT NULL,
  provider        TEXT NOT NULL,
  steps           INTEGER,
  caloriesBurned  INTEGER,
  activeMinutes   INTEGER,
  distanceKm      REAL,
  sleepMinutes    INTEGER,
  sleepEfficiency REAL,
  hrv             REAL,
  restingHR       INTEGER,
  rawJson         TEXT,
  createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt       DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  UNIQUE(userId, date, provider)
);
CREATE INDEX IF NOT EXISTS ActivityData_userId_date_idx ON ActivityData(userId, date);


-- ════════════════════════════════════════════════════════════════════
-- ROLLBACK
-- ════════════════════════════════════════════════════════════════════
-- DROP INDEX IF EXISTS ActivityData_userId_date_idx;
-- DROP TABLE IF EXISTS ActivityData;
-- DROP INDEX IF EXISTS WearableConnection_provider_expires_idx;
-- DROP TABLE IF EXISTS WearableConnection;
