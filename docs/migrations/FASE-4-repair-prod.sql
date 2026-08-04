-- ============================================================================
-- FASE 4 — Reparación del drift de esquema en PRODUCCIÓN (Turso)
-- ============================================================================
-- Contexto: producción se materializó (en parte) desde el catálogo roto de
-- app/api/admin/migrate/route.ts. 5 tablas divergen de schema.prisma, lo que
-- rompe HU-05 (metas adaptativas), HU-08 (wearables), HU-09 (insights) y los
-- votos/verificación de Food.
--
-- La Fase 0 (2026-08-04) confirmó contra Turso:
--   - GoalAdjustmentLog, Insight, WearableConnection, ActivityData: 0 filas
--     → DROP + CREATE con la definición correcta (sin pérdida de datos).
--   - Food: 287 filas, 0 duplicados de barcode/fdcId → ALTER aditivo.
--
-- Backup previo tomado: backups/turso-2026-08-04.turso-dump.sql
-- Rollback ante cualquier problema: restaurar ese dump (es lo más simple y
-- seguro; recrear las tablas viejas rotas no tendría sentido).
--
-- Ejecutar (UNA sola vez — no es idempotente por los ADD COLUMN):
--   turso db shell macro-tracker < docs/migrations/FASE-4-repair-prod.sql
--
-- PRE-FLIGHT obligatorio (deben dar 0 — si no, PARAR: hay datos que preservar):
--   SELECT
--     (SELECT COUNT(*) FROM GoalAdjustmentLog) gal,
--     (SELECT COUNT(*) FROM Insight) ins,
--     (SELECT COUNT(*) FROM WearableConnection) wc,
--     (SELECT COUNT(*) FROM ActivityData) act;
-- ============================================================================

BEGIN TRANSACTION;

-- ── 1) Tablas vacías con drift → DROP + CREATE (definición = schema.prisma) ──
-- Son tablas hoja (ninguna otra las referencia) y están vacías → DROP seguro.

DROP TABLE IF EXISTS GoalAdjustmentLog;
CREATE TABLE GoalAdjustmentLog (
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
CREATE INDEX GoalAdjustmentLog_userId_idx ON GoalAdjustmentLog(userId, createdAt);

DROP TABLE IF EXISTS Insight;
CREATE TABLE Insight (
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
CREATE INDEX Insight_userId_createdAt_idx   ON Insight(userId, createdAt);
CREATE INDEX Insight_userId_dismissedAt_idx ON Insight(userId, dismissedAt);

DROP TABLE IF EXISTS WearableConnection;
CREATE TABLE WearableConnection (
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
CREATE INDEX WearableConnection_provider_expires_idx ON WearableConnection(provider, expiresAt);

DROP TABLE IF EXISTS ActivityData;
CREATE TABLE ActivityData (
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
CREATE INDEX ActivityData_userId_date_idx ON ActivityData(userId, date);

-- ── 2) Food (287 filas) → ALTER aditivo, no destructivo ─────────────────────
-- Faltan 3 columnas que el código lee/escribe (voteScore/voteCount/verifiedBy).
-- (verifiedAt y needsReview ya existen en prod.)
ALTER TABLE Food ADD COLUMN verifiedBy TEXT;
ALTER TABLE Food ADD COLUMN voteScore  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE Food ADD COLUMN voteCount  INTEGER NOT NULL DEFAULT 0;

-- Índices: reemplazar el de barcode (hoy NO-único) por el ÚNICO parcial, y
-- crear el de fdcId (no existía). Parcial = solo filas con valor (NULLs libres).
-- Verificado en Fase 0: 0 duplicados de barcode y de fdcId.
DROP INDEX IF EXISTS Food_barcode_idx;
CREATE UNIQUE INDEX IF NOT EXISTS Food_barcode_unique ON Food(barcode) WHERE barcode IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS Food_fdcId_unique   ON Food(fdcId)   WHERE fdcId IS NOT NULL;
CREATE INDEX IF NOT EXISTS Food_needsReview_idx ON Food(needsReview);

-- Backfill HU-04: los alimentos seed (USDA + regionales curados) son fuentes
-- verificadas. Afecta 125 filas (verificado). Único cambio de DATOS del script;
-- recomendado para que la BD de dos capas (verificada vs comunitaria) funcione.
UPDATE Food
SET verifiedAt = COALESCE(verifiedAt, CURRENT_TIMESTAMP),
    verifiedBy = COALESCE(verifiedBy, 'system')
WHERE source = 'usda' OR (source = 'user' AND userId IS NULL);

COMMIT;

-- ── 3) OPCIONAL — limpiar columnas fantasma de Food (del catálogo roto) ─────
-- No rompen nada (Prisma solo lee sus columnas conocidas), pero son basura.
-- Descomentar para eliminarlas (libSQL soporta DROP COLUMN; fuera de la txn):
-- ALTER TABLE Food DROP COLUMN votosPositivos;
-- ALTER TABLE Food DROP COLUMN votosNegativos;
-- ALTER TABLE Food DROP COLUMN verified;

-- ── POST-FLIGHT (verificación; ninguna debe dar error) ──────────────────────
--   SELECT goalId, oldProtein, newFat FROM GoalAdjustmentLog LIMIT 0;
--   SELECT dataJson, dismissReason, pushedAt FROM Insight LIMIT 0;
--   SELECT accessToken, refreshToken, scopes, connectedAt, lastSyncedAt FROM WearableConnection LIMIT 0;
--   SELECT provider, caloriesBurned, distanceKm, sleepEfficiency, rawJson, updatedAt FROM ActivityData LIMIT 0;
--   SELECT voteScore, voteCount, verifiedBy FROM Food LIMIT 0;
--   SELECT COUNT(*) FROM Food WHERE verifiedBy = 'system';  -- ~125
