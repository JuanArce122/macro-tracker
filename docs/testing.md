# Testing — Macro Tracker

> Setup hecho en Sprint 0 (Cimientos). Esta guía cubre cómo correr, escribir y mantener tests.

---

## Stack

| Capa | Tool | Versión |
|---|---|---|
| Unit / Integration | Vitest | ^4 |
| DOM / Component | @testing-library/react | ^16 |
| Matchers extra | @testing-library/jest-dom | ^6 |
| E2E | Playwright | ^1.60 |
| Validación API | Zod | ^4 |
| CI | GitHub Actions | — |

---

## Comandos

```bash
# Unit + integration (Vitest)
npm test              # corre una vez (modo CI)
npm run test:watch    # modo watch interactivo
npm run test:coverage # reporte de coverage

# E2E (Playwright)
npm run test:e2e         # corre los specs en headless
npm run test:e2e:headed  # con ventana del browser visible
```

---

## Estructura

```
__tests__/
├── lib/              # Tests unitarios de utilidades
│   ├── foods.test.ts
│   └── validate.test.ts
└── schemas/          # Tests de validación Zod
    ├── meal.test.ts
    ├── food.test.ts
    └── profile.test.ts

e2e/
├── auth.spec.ts
├── landing.spec.ts
└── api-validation.spec.ts

vitest.config.ts
vitest.setup.ts
playwright.config.ts
```

**Convención:** un archivo de test por módulo de producción. Si `lib/foo.ts` tiene >5 funciones, crear `__tests__/lib/foo/*.test.ts`.

---

## Escribir un test unitario

```ts
import { describe, it, expect } from "vitest";
import { calcMacros } from "@/lib/foods";

describe("calcMacros", () => {
  it("scales correctly for 200g", () => {
    const food = { id: 1, nombre: "X", categoria: "proteina", cal: 100, p: 20, c: 0, f: 2 };
    const result = calcMacros(food, 200);
    expect(result.calorias).toBe(200);
  });
});
```

**Convenciones:**
- Cada `describe` agrupa por unidad bajo test (función, schema, componente)
- `it` empieza con verbo en presente: `"scales correctly..."`, `"returns null when..."`
- Usar `expect(x).toBe(y)` para primitivos, `toEqual` para objetos profundos

---

## Escribir un test E2E

```ts
import { test, expect } from "@playwright/test";

test("usuario ve home tras login", async ({ page }) => {
  await page.goto("/auth");
  await page.fill('input[type="email"]', "user@test.com");
  await page.fill('input[type="password"]', "test123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/day/);
});
```

**Convenciones:**
- `data-testid` se prefiere a clases para selectores específicos
- Evitar `waitForTimeout` (flaky). Usar `waitFor*` específicos
- Cada test debe ser independiente — no encadenar estado

---

## Validación con Zod

Los schemas viven en `lib/schemas/*` y se reutilizan en API + tests.

```ts
// app/api/foo/route.ts
import { FooSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/api/validate";

export async function POST(req: NextRequest) {
  const parsed = await validateBody(req, FooSchema);
  if (!parsed.ok) return parsed.response;  // 400 con issues[]
  const data = parsed.data; // tipado completamente
  // ... usar data ...
}
```

Cliente recibe:
```json
{
  "error": "Datos inválidos",
  "issues": [
    { "path": "weightG", "message": "Debe ser mayor o igual a 0" }
  ]
}
```

---

## Convenciones de Zod

- Schemas en PascalCase: `MealCreateSchema`
- Tipos derivados con `z.infer`: `type MealCreateInput = z.infer<typeof MealCreateSchema>`
- Mensajes en español: `z.string().min(1, "Nombre requerido")`
- Mover comunes a `lib/schemas/common.ts` (DateLocal, ISO, PositiveNumber, etc.)
- Nunca usar `z.any()` en endpoints — preferir union de schemas

---

## CI

`.github/workflows/ci.yml` corre en cada push/PR a `main`:

1. **lint-and-test** (bloqueante):
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npm test` (Vitest)
2. **e2e** (opcional, no bloquea merge):
   - Build de Next.js
   - `npx playwright test`
   - Subir report como artifact si falla

---

## Coverage objetivo

| Módulo | Mínimo |
|---|---|
| `lib/schemas/` | 95% |
| `lib/api/` | 90% |
| `lib/foods.ts`, otras utils | 80% |
| Componentes UI complejos | 60% |
| Componentes UI simples | (sin requerimiento) |

Correr `npm run test:coverage` para ver el reporte HTML en `coverage/index.html`.

---

## TDD en el roadmap

Cada historia (`docs/stories/HU-XX.md`) lista tests específicos a escribir **antes** del wiring final del feature. Orden recomendado:

1. Test del schema/contract (rápido)
2. Test de la lógica de negocio (lib/)
3. Test del endpoint API (mockeando Prisma si aplica)
4. Test E2E del flujo completo

---

## Snags conocidos

- Vitest emite `DEP0205` warning de Node sobre `module.register()`. Es del runtime, no afecta resultados.
- Playwright `webServer` reusa el `npm run dev` si ya está corriendo (`reuseExistingServer: true`).
- En CI E2E corre `npm start` (no `dev`) para reflejar el build de producción.
