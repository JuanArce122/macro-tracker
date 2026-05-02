-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Food" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "cal" REAL NOT NULL,
    "p" REAL NOT NULL,
    "c" REAL NOT NULL,
    "f" REAL NOT NULL,
    "gramsPerUnit" REAL,
    "unitLabel" TEXT,
    "source" TEXT NOT NULL DEFAULT 'usda',
    "userId" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" DATETIME
);
INSERT INTO "new_Food" ("c", "cal", "categoria", "f", "gramsPerUnit", "id", "nombre", "p", "source", "unitLabel", "userId") SELECT "c", "cal", "categoria", "f", "gramsPerUnit", "id", "nombre", "p", "source", "unitLabel", "userId" FROM "Food";
DROP TABLE "Food";
ALTER TABLE "new_Food" RENAME TO "Food";
CREATE INDEX "Food_nombre_idx" ON "Food"("nombre");
CREATE INDEX "Food_userId_idx" ON "Food"("userId");
CREATE INDEX "Food_lastUsedAt_idx" ON "Food"("lastUsedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
