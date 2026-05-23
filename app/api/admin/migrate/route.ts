/**
 * Endpoint de migración ad-hoc para aplicar los .sql de docs/migrations/
 * en Turso producción de forma idempotente.
 *
 * Motivación: el flujo manual `turso db shell ... < migration.sql` se
 * saltó en algún punto y producción quedó con un schema desfasado
 * (faltaba User.countryCode entre otros). Cualquier query del User
 * fallaba con "no such column".
 *
 * Seguridad:
 *   - Requiere `Authorization: Bearer <AUTH_SECRET>` (reutilizamos el
 *     secret que ya está en Vercel).
 *   - Idempotente: lee `pragma_table_info` antes de cada ALTER y
 *     `sqlite_master` antes de cada CREATE TABLE, de modo que correr
 *     el endpoint múltiples veces no falla.
 *   - Solo aplica DDL (ALTER/CREATE/CREATE INDEX). No toca datos.
 *
 * Uso:
 *   curl -X POST https://.../api/admin/migrate \
 *     -H "Authorization: Bearer $AUTH_SECRET"
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

type ColumnSpec = { name: string; sql: string };
type TableSpec = { name: string; sql: string };
type IndexSpec = { name: string; sql: string };

// ─── Catálogo de migraciones declaradas en docs/migrations/*.sql ─────
//
// Cada entrada es la *intención* de la migración expresada como
// secuencia de pasos chequeables. No leemos los .sql en runtime — los
// transcribimos aquí para tener control sobre la idempotencia.

const COLUMN_ADDS: Array<{ table: string; column: ColumnSpec }> = [
  // HU-03: barcode en Food
  { table: "Food", column: { name: "barcode", sql: "ALTER TABLE Food ADD COLUMN barcode TEXT" } },
  // HU-04: votos y verificación en Food
  { table: "Food", column: { name: "votosPositivos", sql: "ALTER TABLE Food ADD COLUMN votosPositivos INTEGER NOT NULL DEFAULT 0" } },
  { table: "Food", column: { name: "votosNegativos", sql: "ALTER TABLE Food ADD COLUMN votosNegativos INTEGER NOT NULL DEFAULT 0" } },
  { table: "Food", column: { name: "needsReview", sql: "ALTER TABLE Food ADD COLUMN needsReview INTEGER NOT NULL DEFAULT 0" } },
  { table: "Food", column: { name: "verified", sql: "ALTER TABLE Food ADD COLUMN verified INTEGER NOT NULL DEFAULT 0" } },
  { table: "Food", column: { name: "verifiedAt", sql: "ALTER TABLE Food ADD COLUMN verifiedAt DATETIME" } },
  // HU-05: adjustmentMode en Goal
  { table: "Goal", column: { name: "adjustmentMode", sql: "ALTER TABLE Goal ADD COLUMN adjustmentMode TEXT NOT NULL DEFAULT 'manual'" } },
  // HU-07: 15 micros en Food (por 100 g)
  { table: "Food", column: { name: "fdcId", sql: "ALTER TABLE Food ADD COLUMN fdcId INTEGER" } },
  { table: "Food", column: { name: "fiber", sql: "ALTER TABLE Food ADD COLUMN fiber REAL" } },
  { table: "Food", column: { name: "sugar", sql: "ALTER TABLE Food ADD COLUMN sugar REAL" } },
  { table: "Food", column: { name: "sodium", sql: "ALTER TABLE Food ADD COLUMN sodium REAL" } },
  { table: "Food", column: { name: "potassium", sql: "ALTER TABLE Food ADD COLUMN potassium REAL" } },
  { table: "Food", column: { name: "calcium", sql: "ALTER TABLE Food ADD COLUMN calcium REAL" } },
  { table: "Food", column: { name: "iron", sql: "ALTER TABLE Food ADD COLUMN iron REAL" } },
  { table: "Food", column: { name: "vitaminC", sql: "ALTER TABLE Food ADD COLUMN vitaminC REAL" } },
  { table: "Food", column: { name: "vitaminD", sql: "ALTER TABLE Food ADD COLUMN vitaminD REAL" } },
  { table: "Food", column: { name: "vitaminB12", sql: "ALTER TABLE Food ADD COLUMN vitaminB12 REAL" } },
  { table: "Food", column: { name: "vitaminA", sql: "ALTER TABLE Food ADD COLUMN vitaminA REAL" } },
  { table: "Food", column: { name: "folate", sql: "ALTER TABLE Food ADD COLUMN folate REAL" } },
  { table: "Food", column: { name: "magnesium", sql: "ALTER TABLE Food ADD COLUMN magnesium REAL" } },
  { table: "Food", column: { name: "zinc", sql: "ALTER TABLE Food ADD COLUMN zinc REAL" } },
  { table: "Food", column: { name: "omega3", sql: "ALTER TABLE Food ADD COLUMN omega3 REAL" } },
  { table: "Food", column: { name: "omega6", sql: "ALTER TABLE Food ADD COLUMN omega6 REAL" } },
  // HU-07: snapshot de micros en Meal
  { table: "Meal", column: { name: "fiber", sql: "ALTER TABLE Meal ADD COLUMN fiber REAL" } },
  { table: "Meal", column: { name: "sugar", sql: "ALTER TABLE Meal ADD COLUMN sugar REAL" } },
  { table: "Meal", column: { name: "sodium", sql: "ALTER TABLE Meal ADD COLUMN sodium REAL" } },
  { table: "Meal", column: { name: "potassium", sql: "ALTER TABLE Meal ADD COLUMN potassium REAL" } },
  { table: "Meal", column: { name: "calcium", sql: "ALTER TABLE Meal ADD COLUMN calcium REAL" } },
  { table: "Meal", column: { name: "iron", sql: "ALTER TABLE Meal ADD COLUMN iron REAL" } },
  { table: "Meal", column: { name: "vitaminC", sql: "ALTER TABLE Meal ADD COLUMN vitaminC REAL" } },
  { table: "Meal", column: { name: "vitaminD", sql: "ALTER TABLE Meal ADD COLUMN vitaminD REAL" } },
  { table: "Meal", column: { name: "vitaminB12", sql: "ALTER TABLE Meal ADD COLUMN vitaminB12 REAL" } },
  { table: "Meal", column: { name: "vitaminA", sql: "ALTER TABLE Meal ADD COLUMN vitaminA REAL" } },
  { table: "Meal", column: { name: "folate", sql: "ALTER TABLE Meal ADD COLUMN folate REAL" } },
  { table: "Meal", column: { name: "magnesium", sql: "ALTER TABLE Meal ADD COLUMN magnesium REAL" } },
  { table: "Meal", column: { name: "zinc", sql: "ALTER TABLE Meal ADD COLUMN zinc REAL" } },
  { table: "Meal", column: { name: "omega3", sql: "ALTER TABLE Meal ADD COLUMN omega3 REAL" } },
  { table: "Meal", column: { name: "omega6", sql: "ALTER TABLE Meal ADD COLUMN omega6 REAL" } },
  // HU-11: trackingMode en User
  { table: "User", column: { name: "trackingMode", sql: "ALTER TABLE User ADD COLUMN trackingMode TEXT NOT NULL DEFAULT 'macros'" } },
  // HU-12: countryCode en User + regionCode en Food (este es el que rompe el login)
  { table: "User", column: { name: "countryCode", sql: "ALTER TABLE User ADD COLUMN countryCode TEXT" } },
  { table: "Food", column: { name: "regionCode", sql: "ALTER TABLE Food ADD COLUMN regionCode TEXT" } },
];

const TABLE_CREATES: TableSpec[] = [
  {
    name: "FoodVote",
    sql: `CREATE TABLE IF NOT EXISTS FoodVote (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      userId    INTEGER NOT NULL,
      foodId    INTEGER NOT NULL,
      vote      INTEGER NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
      FOREIGN KEY (foodId) REFERENCES Food(id) ON DELETE CASCADE,
      UNIQUE(userId, foodId)
    )`,
  },
  {
    name: "WeightEntry",
    sql: `CREATE TABLE IF NOT EXISTS WeightEntry (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      userId    INTEGER NOT NULL,
      date      TEXT NOT NULL,
      weightKg  REAL NOT NULL,
      source    TEXT NOT NULL DEFAULT 'manual',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
      UNIQUE(userId, date)
    )`,
  },
  {
    name: "GoalAdjustmentLog",
    sql: `CREATE TABLE IF NOT EXISTS GoalAdjustmentLog (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      userId        INTEGER NOT NULL,
      previousCalories INTEGER NOT NULL,
      newCalories      INTEGER NOT NULL,
      reason        TEXT,
      mode          TEXT NOT NULL,
      createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`,
  },
  {
    name: "Insight",
    sql: `CREATE TABLE IF NOT EXISTS Insight (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      userId      INTEGER NOT NULL,
      type        TEXT NOT NULL,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      severity    TEXT NOT NULL DEFAULT 'info',
      dismissedAt DATETIME,
      createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`,
  },
  {
    name: "PushSubscription",
    sql: `CREATE TABLE IF NOT EXISTS PushSubscription (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      userId    INTEGER NOT NULL,
      endpoint  TEXT NOT NULL UNIQUE,
      p256dh    TEXT NOT NULL,
      auth      TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`,
  },
  {
    name: "HabitEntry",
    sql: `CREATE TABLE IF NOT EXISTS HabitEntry (
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
    )`,
  },
  {
    name: "WearableConnection",
    sql: `CREATE TABLE IF NOT EXISTS WearableConnection (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      userId              INTEGER NOT NULL,
      provider            TEXT NOT NULL,
      providerUserId      TEXT,
      accessTokenEncrypted TEXT NOT NULL,
      refreshTokenEncrypted TEXT,
      expiresAt           DATETIME,
      scope               TEXT,
      createdAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt           DATETIME NOT NULL,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
      UNIQUE(userId, provider)
    )`,
  },
  {
    name: "ActivityData",
    sql: `CREATE TABLE IF NOT EXISTS ActivityData (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      userId        INTEGER NOT NULL,
      date          TEXT NOT NULL,
      source        TEXT NOT NULL,
      steps         INTEGER,
      caloriesOut   INTEGER,
      activeMinutes INTEGER,
      restingHr     INTEGER,
      hrv           REAL,
      sleepMinutes  INTEGER,
      createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
      UNIQUE(userId, date, source)
    )`,
  },
  {
    name: "Recipe",
    sql: `CREATE TABLE IF NOT EXISTS Recipe (
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
    )`,
  },
  {
    name: "RecipeIngredient",
    sql: `CREATE TABLE IF NOT EXISTS RecipeIngredient (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      recipeId        INTEGER NOT NULL,
      foodId          INTEGER NOT NULL,
      gramsPerServing REAL NOT NULL,
      optional        INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (recipeId) REFERENCES Recipe(id) ON DELETE CASCADE,
      FOREIGN KEY (foodId) REFERENCES Food(id)
    )`,
  },
  {
    name: "MealPlan",
    sql: `CREATE TABLE IF NOT EXISTS MealPlan (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      userId      INTEGER NOT NULL,
      startDate   TEXT NOT NULL,
      endDate     TEXT NOT NULL,
      preferences TEXT NOT NULL,
      isActive    INTEGER NOT NULL DEFAULT 1,
      createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`,
  },
  {
    name: "PlannedMeal",
    sql: `CREATE TABLE IF NOT EXISTS PlannedMeal (
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
    )`,
  },
  {
    name: "PasswordResetToken",
    sql: `CREATE TABLE IF NOT EXISTS PasswordResetToken (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      userId    INTEGER NOT NULL,
      token     TEXT NOT NULL UNIQUE,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`,
  },
];

const INDEX_CREATES: IndexSpec[] = [
  { name: "Food_regionCode_idx", sql: "CREATE INDEX IF NOT EXISTS Food_regionCode_idx ON Food(regionCode)" },
  { name: "Food_barcode_idx", sql: "CREATE INDEX IF NOT EXISTS Food_barcode_idx ON Food(barcode)" },
  { name: "Recipe_cuisineCode_idx", sql: "CREATE INDEX IF NOT EXISTS Recipe_cuisineCode_idx ON Recipe(cuisineCode)" },
  { name: "MealPlan_userId_isActive_idx", sql: "CREATE INDEX IF NOT EXISTS MealPlan_userId_isActive_idx ON MealPlan(userId, isActive)" },
  { name: "PlannedMeal_planId_date_idx", sql: "CREATE INDEX IF NOT EXISTS PlannedMeal_planId_date_idx ON PlannedMeal(planId, date)" },
  { name: "HabitEntry_userId_date_idx", sql: "CREATE INDEX IF NOT EXISTS HabitEntry_userId_date_idx ON HabitEntry(userId, date)" },
  { name: "Insight_userId_createdAt_idx", sql: "CREATE INDEX IF NOT EXISTS Insight_userId_createdAt_idx ON Insight(userId, createdAt)" },
  { name: "WearableConnection_userId_idx", sql: "CREATE INDEX IF NOT EXISTS WearableConnection_userId_idx ON WearableConnection(userId)" },
  { name: "ActivityData_userId_date_idx", sql: "CREATE INDEX IF NOT EXISTS ActivityData_userId_date_idx ON ActivityData(userId, date)" },
];

type Result =
  | { action: "skip-column"; table: string; column: string }
  | { action: "added-column"; table: string; column: string }
  | { action: "skip-table"; name: string }
  | { action: "created-table"; name: string }
  | { action: "ensured-index"; name: string }
  | { action: "error"; step: string; message: string };

async function tableHasColumn(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM pragma_table_info('${table}') WHERE name = ?`,
    column
  );
  return rows.length > 0;
}

async function tableExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`,
    name
  );
  return rows.length > 0;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = process.env.AUTH_SECRET;
  if (!expected) return Response.json({ error: "AUTH_SECRET no configurado" }, { status: 500 });
  if (auth !== `Bearer ${expected}`) return Response.json({ error: "no autorizado" }, { status: 401 });

  const results: Result[] = [];

  // 1) Tablas (primero, antes que sus columnas / índices dependientes)
  for (const t of TABLE_CREATES) {
    try {
      const exists = await tableExists(t.name);
      if (exists) {
        results.push({ action: "skip-table", name: t.name });
        continue;
      }
      await prisma.$executeRawUnsafe(t.sql);
      results.push({ action: "created-table", name: t.name });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      results.push({ action: "error", step: `table:${t.name}`, message });
    }
  }

  // 2) Columnas faltantes en tablas existentes
  for (const { table, column } of COLUMN_ADDS) {
    try {
      const has = await tableHasColumn(table, column.name);
      if (has) {
        results.push({ action: "skip-column", table, column: column.name });
        continue;
      }
      await prisma.$executeRawUnsafe(column.sql);
      results.push({ action: "added-column", table, column: column.name });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      results.push({ action: "error", step: `column:${table}.${column.name}`, message });
    }
  }

  // 3) Índices (idempotentes con IF NOT EXISTS)
  for (const idx of INDEX_CREATES) {
    try {
      await prisma.$executeRawUnsafe(idx.sql);
      results.push({ action: "ensured-index", name: idx.name });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      results.push({ action: "error", step: `index:${idx.name}`, message });
    }
  }

  const summary = {
    addedColumns: results.filter((r) => r.action === "added-column").length,
    skippedColumns: results.filter((r) => r.action === "skip-column").length,
    createdTables: results.filter((r) => r.action === "created-table").length,
    skippedTables: results.filter((r) => r.action === "skip-table").length,
    ensuredIndexes: results.filter((r) => r.action === "ensured-index").length,
    errors: results.filter((r) => r.action === "error").length,
  };

  return Response.json({ summary, results });
}
