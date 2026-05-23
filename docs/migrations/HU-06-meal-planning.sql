-- HU-06: Meal Planning (Sprint 11 MVP)
-- Aplicar en producción Turso vía:
--   turso db shell macro-tracker-juanparce < docs/migrations/HU-06-meal-planning.sql
--
-- Local dev: ya se aplica vía `prisma db push`.

-- ── Recipe ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Recipe (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  name               TEXT NOT NULL,
  description        TEXT,
  instructions       TEXT NOT NULL,
  prepTimeMin        INTEGER NOT NULL,
  cookTimeMin        INTEGER NOT NULL,
  servings           INTEGER NOT NULL DEFAULT 1,
  dietTags           TEXT NOT NULL DEFAULT '',
  allergyTags        TEXT NOT NULL DEFAULT '',
  costLevel          INTEGER NOT NULL DEFAULT 2,
  cuisineCode        TEXT,
  source             TEXT NOT NULL DEFAULT 'seed',
  userId             INTEGER,
  imageUrl           TEXT,
  caloriesPerServing INTEGER,
  proteinPerServing  REAL,
  carbsPerServing    REAL,
  fatPerServing      REAL,
  createdAt          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS Recipe_cuisineCode_idx ON Recipe(cuisineCode);
CREATE INDEX IF NOT EXISTS Recipe_userId_idx ON Recipe(userId);

-- ── RecipeIngredient ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS RecipeIngredient (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  recipeId        INTEGER NOT NULL,
  foodId          INTEGER NOT NULL,
  gramsPerServing REAL NOT NULL,
  optional        INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (recipeId) REFERENCES Recipe(id) ON DELETE CASCADE,
  FOREIGN KEY (foodId) REFERENCES Food(id)
);
CREATE INDEX IF NOT EXISTS RecipeIngredient_recipeId_idx ON RecipeIngredient(recipeId);
CREATE INDEX IF NOT EXISTS RecipeIngredient_foodId_idx ON RecipeIngredient(foodId);

-- ── MealPlan ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS MealPlan (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  userId      INTEGER NOT NULL,
  startDate   TEXT NOT NULL,
  endDate     TEXT NOT NULL,
  preferences TEXT NOT NULL,
  isActive    INTEGER NOT NULL DEFAULT 1,
  createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS MealPlan_userId_startDate_idx ON MealPlan(userId, startDate);
CREATE INDEX IF NOT EXISTS MealPlan_userId_isActive_idx ON MealPlan(userId, isActive);

-- ── PlannedMeal ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS PlannedMeal (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  planId     INTEGER NOT NULL,
  date       TEXT NOT NULL,
  mealType   TEXT NOT NULL,
  recipeId   INTEGER NOT NULL,
  servings   REAL NOT NULL DEFAULT 1,
  consumed   INTEGER NOT NULL DEFAULT 0,
  consumedAt DATETIME,
  FOREIGN KEY (planId) REFERENCES MealPlan(id) ON DELETE CASCADE,
  FOREIGN KEY (recipeId) REFERENCES Recipe(id),
  UNIQUE(planId, date, mealType)
);
CREATE INDEX IF NOT EXISTS PlannedMeal_planId_date_idx ON PlannedMeal(planId, date);
CREATE INDEX IF NOT EXISTS PlannedMeal_recipeId_idx ON PlannedMeal(recipeId);


-- ════════════════════════════════════════════════════════════════════
-- ROLLBACK
-- ════════════════════════════════════════════════════════════════════
-- DROP TABLE IF EXISTS PlannedMeal;
-- DROP TABLE IF EXISTS MealPlan;
-- DROP TABLE IF EXISTS RecipeIngredient;
-- DROP TABLE IF EXISTS Recipe;
