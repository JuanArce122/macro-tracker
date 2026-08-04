/**
 * Endpoint de migración idempotente para aplicar el esquema HU-03…HU-12 en
 * Turso producción.
 *
 * Motivación: el flujo manual `turso db shell < migration.sql` se saltó en
 * algún punto y producción quedó con un schema desfasado. Este catálogo
 * declara el DDL de forma chequeable e idempotente.
 *
 * IMPORTANTE (Fase 4, 2026-08-04): este catálogo fue reescrito para coincidir
 * EXACTO con `prisma/schema.prisma` y con `docs/migrations/*.sql`. La versión
 * anterior había divergido (nombres de columna, tipos y constraints) y
 * materializó 5 tablas rotas en prod (GoalAdjustmentLog, Insight,
 * WearableConnection, ActivityData, Food). Se repararon con
 * `docs/migrations/FASE-4-repair-prod.sql`. NO reintroducir columnas fantasma
 * (votosPositivos/votosNegativos/verified) ni nombres antiguos.
 *
 * Seguridad:
 *   - Requiere `Authorization: Bearer <AUTH_SECRET>`.
 *   - Idempotente: chequea `pragma_table_info` / `sqlite_master` antes de cada
 *     ALTER / CREATE.
 *   - Solo DDL (ALTER/CREATE/CREATE INDEX). No toca datos.
 *
 * Modos:
 *   - POST                → aplica el catálogo.
 *   - POST ?mode=verify   → NO aplica: compara el esquema real contra las
 *                           columnas esperadas y reporta discrepancias (red de
 *                           seguridad contra futuros drifts).
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

const MICROS = [
  "fiber", "sugar", "sodium", "potassium", "calcium", "iron", "vitaminC",
  "vitaminD", "vitaminB12", "vitaminA", "folate", "magnesium", "zinc",
  "omega3", "omega6",
] as const;

// ─── Catálogo de columnas (ALTER TABLE ADD COLUMN) ───────────────────
const COLUMN_ADDS: Array<{ table: string; column: ColumnSpec }> = [
  // HU-03: barcode en Food
  { table: "Food", column: { name: "barcode", sql: "ALTER TABLE Food ADD COLUMN barcode TEXT" } },

  // HU-04: verificación + votos denormalizados en Food
  { table: "Food", column: { name: "verifiedAt", sql: "ALTER TABLE Food ADD COLUMN verifiedAt DATETIME" } },
  { table: "Food", column: { name: "verifiedBy", sql: "ALTER TABLE Food ADD COLUMN verifiedBy TEXT" } },
  { table: "Food", column: { name: "needsReview", sql: "ALTER TABLE Food ADD COLUMN needsReview INTEGER NOT NULL DEFAULT 0" } },
  { table: "Food", column: { name: "voteScore", sql: "ALTER TABLE Food ADD COLUMN voteScore INTEGER NOT NULL DEFAULT 0" } },
  { table: "Food", column: { name: "voteCount", sql: "ALTER TABLE Food ADD COLUMN voteCount INTEGER NOT NULL DEFAULT 0" } },

  // HU-05: adjustmentMode en Goal
  { table: "Goal", column: { name: "adjustmentMode", sql: "ALTER TABLE Goal ADD COLUMN adjustmentMode TEXT NOT NULL DEFAULT 'manual'" } },

  // HU-07: fdcId + 15 micros en Food
  { table: "Food", column: { name: "fdcId", sql: "ALTER TABLE Food ADD COLUMN fdcId INTEGER" } },
  ...MICROS.map((m) => ({ table: "Food", column: { name: m, sql: `ALTER TABLE Food ADD COLUMN ${m} REAL` } })),

  // HU-07: snapshot de 15 micros en Meal
  ...MICROS.map((m) => ({ table: "Meal", column: { name: m, sql: `ALTER TABLE Meal ADD COLUMN ${m} REAL` } })),

  // Perfil de User (columnas nullable). Registradas aquí para que el catálogo
  // pueda reconstruir prod desde cero (disaster-recovery).
  { table: "User", column: { name: "name", sql: "ALTER TABLE User ADD COLUMN name TEXT" } },
  { table: "User", column: { name: "avatarEmoji", sql: "ALTER TABLE User ADD COLUMN avatarEmoji TEXT" } },
  { table: "User", column: { name: "age", sql: "ALTER TABLE User ADD COLUMN age INTEGER" } },
  { table: "User", column: { name: "sex", sql: "ALTER TABLE User ADD COLUMN sex TEXT" } },
  { table: "User", column: { name: "weightKg", sql: "ALTER TABLE User ADD COLUMN weightKg REAL" } },
  { table: "User", column: { name: "heightCm", sql: "ALTER TABLE User ADD COLUMN heightCm REAL" } },
  { table: "User", column: { name: "activityLevel", sql: "ALTER TABLE User ADD COLUMN activityLevel TEXT" } },
  { table: "User", column: { name: "fitnessGoal", sql: "ALTER TABLE User ADD COLUMN fitnessGoal TEXT" } },

  // HU-11: trackingMode en User
  { table: "User", column: { name: "trackingMode", sql: "ALTER TABLE User ADD COLUMN trackingMode TEXT NOT NULL DEFAULT 'macros'" } },

  // HU-12: countryCode en User + regionCode en Food
  { table: "User", column: { name: "countryCode", sql: "ALTER TABLE User ADD COLUMN countryCode TEXT" } },
  { table: "Food", column: { name: "regionCode", sql: "ALTER TABLE Food ADD COLUMN regionCode TEXT" } },
];

// ─── Catálogo de tablas (CREATE TABLE IF NOT EXISTS) ─────────────────
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
    )`,
  },
  {
    name: "Insight",
    sql: `CREATE TABLE IF NOT EXISTS Insight (
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
    )`,
  },
  {
    name: "ActivityData",
    sql: `CREATE TABLE IF NOT EXISTS ActivityData (
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

// ─── Catálogo de índices ─────────────────────────────────────────────
// barcode/fdcId: índices ÚNICOS parciales (NULLs libres), como en el schema.
const INDEX_CREATES: IndexSpec[] = [
  { name: "Food_barcode_unique", sql: "CREATE UNIQUE INDEX IF NOT EXISTS Food_barcode_unique ON Food(barcode) WHERE barcode IS NOT NULL" },
  { name: "Food_fdcId_unique", sql: "CREATE UNIQUE INDEX IF NOT EXISTS Food_fdcId_unique ON Food(fdcId) WHERE fdcId IS NOT NULL" },
  { name: "Food_regionCode_idx", sql: "CREATE INDEX IF NOT EXISTS Food_regionCode_idx ON Food(regionCode)" },
  { name: "Food_needsReview_idx", sql: "CREATE INDEX IF NOT EXISTS Food_needsReview_idx ON Food(needsReview)" },
  { name: "FoodVote_foodId_idx", sql: "CREATE INDEX IF NOT EXISTS FoodVote_foodId_idx ON FoodVote(foodId)" },
  { name: "WeightEntry_userId_date_idx", sql: "CREATE INDEX IF NOT EXISTS WeightEntry_userId_date_idx ON WeightEntry(userId, date)" },
  { name: "GoalAdjustmentLog_userId_idx", sql: "CREATE INDEX IF NOT EXISTS GoalAdjustmentLog_userId_idx ON GoalAdjustmentLog(userId, createdAt)" },
  { name: "Insight_userId_createdAt_idx", sql: "CREATE INDEX IF NOT EXISTS Insight_userId_createdAt_idx ON Insight(userId, createdAt)" },
  { name: "Insight_userId_dismissedAt_idx", sql: "CREATE INDEX IF NOT EXISTS Insight_userId_dismissedAt_idx ON Insight(userId, dismissedAt)" },
  { name: "PushSubscription_userId_idx", sql: "CREATE INDEX IF NOT EXISTS PushSubscription_userId_idx ON PushSubscription(userId)" },
  { name: "HabitEntry_userId_date_idx", sql: "CREATE INDEX IF NOT EXISTS HabitEntry_userId_date_idx ON HabitEntry(userId, date)" },
  { name: "WearableConnection_provider_expires_idx", sql: "CREATE INDEX IF NOT EXISTS WearableConnection_provider_expires_idx ON WearableConnection(provider, expiresAt)" },
  { name: "ActivityData_userId_date_idx", sql: "CREATE INDEX IF NOT EXISTS ActivityData_userId_date_idx ON ActivityData(userId, date)" },
  { name: "Recipe_cuisineCode_idx", sql: "CREATE INDEX IF NOT EXISTS Recipe_cuisineCode_idx ON Recipe(cuisineCode)" },
  { name: "Recipe_userId_idx", sql: "CREATE INDEX IF NOT EXISTS Recipe_userId_idx ON Recipe(userId)" },
  { name: "RecipeIngredient_recipeId_idx", sql: "CREATE INDEX IF NOT EXISTS RecipeIngredient_recipeId_idx ON RecipeIngredient(recipeId)" },
  { name: "RecipeIngredient_foodId_idx", sql: "CREATE INDEX IF NOT EXISTS RecipeIngredient_foodId_idx ON RecipeIngredient(foodId)" },
  { name: "MealPlan_userId_startDate_idx", sql: "CREATE INDEX IF NOT EXISTS MealPlan_userId_startDate_idx ON MealPlan(userId, startDate)" },
  { name: "MealPlan_userId_isActive_idx", sql: "CREATE INDEX IF NOT EXISTS MealPlan_userId_isActive_idx ON MealPlan(userId, isActive)" },
  { name: "PlannedMeal_planId_date_idx", sql: "CREATE INDEX IF NOT EXISTS PlannedMeal_planId_date_idx ON PlannedMeal(planId, date)" },
  { name: "PlannedMeal_recipeId_idx", sql: "CREATE INDEX IF NOT EXISTS PlannedMeal_recipeId_idx ON PlannedMeal(recipeId)" },
];

// ─── Modo verify: columnas esperadas por tabla (según schema.prisma) ─
// Red de seguridad: si prod pierde alguna, `?mode=verify` lo reporta.
const EXPECTED_COLUMNS: Record<string, string[]> = {
  User: ["id", "email", "passwordHash", "createdAt", "name", "avatarEmoji", "age", "sex", "weightKg", "heightCm", "activityLevel", "fitnessGoal", "countryCode", "trackingMode"],
  Food: ["id", "nombre", "categoria", "cal", "p", "c", "f", "gramsPerUnit", "unitLabel", "source", "userId", "usageCount", "lastUsedAt", "regionCode", "verifiedAt", "verifiedBy", "needsReview", "voteScore", "voteCount", "barcode", "fdcId", ...MICROS],
  GoalAdjustmentLog: ["id", "userId", "goalId", "oldCalories", "oldProtein", "oldCarbs", "oldFat", "newCalories", "newProtein", "newCarbs", "newFat", "reason", "mode", "createdAt"],
  Insight: ["id", "userId", "type", "title", "body", "dataJson", "createdAt", "dismissedAt", "dismissReason", "pushedAt"],
  WearableConnection: ["id", "userId", "provider", "providerUserId", "accessToken", "refreshToken", "expiresAt", "scopes", "connectedAt", "lastSyncedAt"],
  ActivityData: ["id", "userId", "date", "provider", "steps", "caloriesBurned", "activeMinutes", "distanceKm", "sleepMinutes", "sleepEfficiency", "hrv", "restingHR", "rawJson", "createdAt", "updatedAt"],
};

type Result =
  | { action: "skip-column"; table: string; column: string }
  | { action: "added-column"; table: string; column: string }
  | { action: "skip-table"; name: string }
  | { action: "created-table"; name: string }
  | { action: "ensured-index"; name: string }
  | { action: "error"; step: string; message: string };

async function getColumns(table: string): Promise<string[] | null> {
  const exists = await tableExists(table);
  if (!exists) return null;
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM pragma_table_info('${table}')`
  );
  return rows.map((r) => r.name);
}

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

/** Compara el esquema real contra EXPECTED_COLUMNS. No aplica cambios. */
async function runVerify() {
  const discrepancies: Array<{ table: string; issue: string; missing?: string[] }> = [];
  for (const [table, expected] of Object.entries(EXPECTED_COLUMNS)) {
    const existing = await getColumns(table);
    if (existing === null) {
      discrepancies.push({ table, issue: "tabla-no-existe" });
      continue;
    }
    const missing = expected.filter((c) => !existing.includes(c));
    if (missing.length > 0) {
      discrepancies.push({ table, issue: "columnas-faltantes", missing });
    }
  }
  return discrepancies;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = process.env.AUTH_SECRET;
  if (!expected) return Response.json({ error: "AUTH_SECRET no configurado" }, { status: 500 });
  if (auth !== `Bearer ${expected}`) return Response.json({ error: "no autorizado" }, { status: 401 });

  // Modo verify: solo reporta, no aplica.
  if (new URL(req.url).searchParams.get("mode") === "verify") {
    const discrepancies = await runVerify();
    return Response.json({ mode: "verify", ok: discrepancies.length === 0, discrepancies });
  }

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
