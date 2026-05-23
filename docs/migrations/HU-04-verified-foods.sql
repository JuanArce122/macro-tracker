-- HU-04: BD dos capas (verificada vs comunitaria) + votos
-- Aplicar en producción Turso vía:
--   turso db shell macro-tracker-juanparce < docs/migrations/HU-04-verified-foods.sql
--
-- Local dev: ya se aplica vía `prisma db push`.
-- Rollback al final.

-- ── Food: agregar columnas para verificación y votos denormalizados ──
ALTER TABLE Food ADD COLUMN verifiedAt DATETIME;
ALTER TABLE Food ADD COLUMN verifiedBy TEXT;
ALTER TABLE Food ADD COLUMN needsReview INTEGER NOT NULL DEFAULT 0;
ALTER TABLE Food ADD COLUMN voteScore INTEGER NOT NULL DEFAULT 0;
ALTER TABLE Food ADD COLUMN voteCount INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS Food_needsReview_idx ON Food(needsReview);

-- ── FoodVote: tabla nueva ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS FoodVote (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    INTEGER NOT NULL,
  foodId    INTEGER NOT NULL,
  vote      INTEGER NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (foodId) REFERENCES Food(id) ON DELETE CASCADE,
  UNIQUE(userId, foodId)
);
CREATE INDEX IF NOT EXISTS FoodVote_foodId_idx ON FoodVote(foodId);

-- ── Backfill: marcar USDA + alimentos CO curados como verificados ───
-- (Los alimentos USDA originales y los regionales que cargamos como seed
-- son fuentes verificadas por nosotros.)
UPDATE Food
SET verifiedAt = CURRENT_TIMESTAMP,
    verifiedBy = 'system'
WHERE source = 'usda'
   OR (source = 'user' AND userId IS NULL); -- regionales curados (HU-12)

-- ── Verificación ───────────────────────────────────────────────────
-- SELECT COUNT(*) FROM Food WHERE verifiedAt IS NOT NULL; -- ~126+58
-- SELECT COUNT(*) FROM Food WHERE source = 'openfoodfacts' AND verifiedAt IS NULL;


-- ════════════════════════════════════════════════════════════════════
-- ROLLBACK (correr solo si necesitas deshacer la migración)
-- ════════════════════════════════════════════════════════════════════
-- DROP TABLE IF EXISTS FoodVote;
-- DROP INDEX IF EXISTS Food_needsReview_idx;
-- ALTER TABLE Food DROP COLUMN voteCount;
-- ALTER TABLE Food DROP COLUMN voteScore;
-- ALTER TABLE Food DROP COLUMN needsReview;
-- ALTER TABLE Food DROP COLUMN verifiedBy;
-- ALTER TABLE Food DROP COLUMN verifiedAt;
