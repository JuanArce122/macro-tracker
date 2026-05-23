# HU-06 Sprint 12 — Stretch goals (post-MVP)

El MVP de HU-06 está cerrado en Sprint 11 con:

- Modelos `Recipe`, `RecipeIngredient`, `MealPlan`, `PlannedMeal`
- Motor greedy `generatePlan` (lib/meal-planner.ts) con tests unit
- Schemas Zod (preferences, plan, log-meal)
- 42 recetas seeded (CO + LATAM + intl)
- Endpoints `POST/GET /api/meal-plans` + `POST /api/meal-plans/[id]/log-meal`
- UI `/plan/setup` (wizard 3 pasos) + `/plan` (calendario semanal)

Los stretch goals que no entraron al MVP están aquí, listos para retomarse
en Sprint 12 o como historias independientes según prioridad de producto.

---

## Stretch 1 — Lista de compras consolidada

**Objetivo:** generar una lista única de ingredientes con cantidades
sumadas para toda la semana, exportable como texto.

**API propuesta:**
```
GET /api/meal-plans/[id]/shopping-list
→ { items: [{ name, totalG, units, foodId, category }] }
```

**Estrategia:**
1. Cargar `MealPlan` con `plannedMeals → recipe → ingredients → food`
2. Para cada ingredient: `totalG = gramsPerServing × servings × veces_que_aparece`
3. Agrupar por `foodId`, sumar gramos
4. Categorizar (proteínas / carbs / vegetales / lácteos / otros) usando
   `Food.tags` o heurística por nombre

**UI sugerida:** página `/plan/shopping` con checkboxes (persistir en
localStorage) + botón "compartir" (Web Share API).

**Riesgo:** ingredientes en unidades distintas (1 huevo vs 50g huevo).
Mitigación: siempre normalizar a gramos en el seed.

---

## Stretch 2 — Reemplazar comida individual

**Objetivo:** si al user no le gusta una receta planificada, reemplazarla
por otra con macros similares sin regenerar todo el plan.

**API propuesta:**
```
POST /api/meal-plans/[id]/planned-meals/[pmid]/replace
body: { excludeIds?: number[] }
→ { plannedMeal: <updated> }
```

**Estrategia:**
1. Cargar el `PlannedMeal` actual + `mealPlan.preferences`
2. Cargar candidatas con `filterRecipesByPreferences`
3. Excluir: la receta actual + `excludeIds`
4. Excluir: recetas ya usadas ≥2 veces esta semana
5. Calcular `targetCal` de ese slot (mismo ratio que el original)
6. Tomar la receta con mejor score (calorías) que no esté excluida
7. Update del `PlannedMeal` con `recipeId` + `servings` reescaladas

**UI sugerida:** botón "Cambiar" en cada card del calendario (icon
RotateCcw). Opcional: bottom-sheet con 3-5 candidatas para elegir.

---

## Stretch 3 — Importar receta vía URL (JSON-LD)

**Objetivo:** el user pega una URL (NYTCooking, AllRecipes, blogs); el
servidor extrae nombre/ingredientes/instrucciones de los metadatos
schema.org/Recipe y crea un `Recipe` con `source = "imported"`.

**API propuesta:**
```
POST /api/recipes/import
body: { url: string }
→ { recipe: <created>, warnings: string[] }
```

**Estrategia:**
1. Fetch del HTML (timeout 8s, max 2MB)
2. Parsear `<script type="application/ld+json">` → buscar `@type: Recipe`
3. Mapear:
   - `name` → `name`
   - `recipeInstructions[].text` → `instructions` (join "\n\n")
   - `prepTime` (ISO 8601 PT15M) → `prepTimeMin`
   - `cookTime` → `cookTimeMin`
   - `recipeYield` → `servings`
   - `recipeIngredient[]` → guardar como string en `description` (no
     intentar resolver Food IDs en el import; el user puede etiquetarlos
     después)
4. Estimar macros vía Gemini (opcional, behind feature flag):
   prompt: "Dado este nombre + ingredients, estima cal/protein/carb/fat
   por porción promedio". Falla suave → null.

**Riesgos:**
- Sitios sin schema.org → fallback: pedir al user llenar manual
- HTML enorme (sitios SPA) → timeout estricto + sanitizar
- Recetas con licencia restringida → guardar URL fuente, no contenido completo

**UI sugerida:** botón "Importar receta" en `/settings/foods` o página
dedicada `/recipes/new` con tab "Pegar URL" vs "Crear manual".

---

## Stretch 4 — Mejoras al algoritmo greedy

Tunings ya identificados pero no críticos para MVP:

- **Anti-monotonía:** penalizar más fuerte si la misma `cuisineCode`
  aparece en 2 slots consecutivos del mismo día (ej. 2 colombianas
  seguidas).
- **Macros target por slot:** además de calorías, balancear proteína
  por slot (desayuno ≥20g, almuerzo/cena ≥30g).
- **Variedad de proteína principal:** marcar `proteinSource` en cada
  receta (pollo, res, pescado, vegetal) y limitar a max 3/semana.
- **Local optima vs global:** evaluar simulated annealing o swap-based
  refinement post-greedy si tests user muestran planes monótonos.

---

## Stretch 5 — Tuning del seed

3 recetas con 0 ingredientes matcheados en seed (`scripts/seed-recipes.ts`
log de warning):

- **Asado argentino** → hint `"Carne de res"` no encuentra; el Food
  existente está como `"res molida"` o similar
- **Fajitas de res** → mismo problema
- **Cereal con banana** → hint `"Cereal"` no encuentra; los Foods son
  más específicos (`"Cereal de avena"`, `"Cereal de maíz"`)

**Fix:** ajustar `ingredientHints` en `lib/recipes-seed.ts` a substrings
más cortos (`"res molida"` → `"res"`) o añadir múltiples hints por
ingrediente y matchear el primero que devuelva food.

No bloqueante: las recetas se siembran igual, solo sin asociaciones de
RecipeIngredient (que hoy no se usan en el motor — el motor usa macros
denormalizadas en `Recipe.caloriesPerServing` etc.).

---

## Métricas a vigilar tras lanzar MVP

- % de users que abren `/plan` (engagement)
- % de users que completan el wizard (vs. abandonan)
- p95 de tiempo de generación
- Cantidad de planes regenerados en la misma sesión (señal de mal fit)
- % de comidas marcadas como "consumidas" del plan (adherencia)

Si la adherencia < 30% en 2 semanas → priorizar Stretch 2 (reemplazar
comida individual) para reducir fricción.
