-- CreateTable
CREATE TABLE "Food" (
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
    "userId" INTEGER
);

-- CreateIndex
CREATE INDEX "Food_nombre_idx" ON "Food"("nombre");

-- CreateIndex
CREATE INDEX "Food_userId_idx" ON "Food"("userId");
