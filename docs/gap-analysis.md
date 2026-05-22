# Gap Analysis — Integración HU-01 a HU-12

> Análisis de validación de las 12 historias de usuario contra el estado actual del codebase de Macro Tracker.
> Fecha: 2026-05-22
> Estado: Aprobado por el product owner

---

## 1. Inventario del codebase

### Stack exacto

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.4 |
| UI | React | 19.2.4 |
| Estilos | Tailwind CSS v4 | ^4 |
| ORM | Prisma v7 | ^7.8.0 |
| DB local | SQLite (via libSQL) | — |
| DB producción | Turso (libSQL) | @libsql/client ^0.17.3 |
| Auth | NextAuth.js v5 (beta) | ^5.0.0-beta.31 |
| IA imagen | Google Gemini 2.5 Flash | @google/generative-ai ^0.24.1 |
| Búsqueda alimentos | Open Food Facts REST API | integración manual |
| Email | Resend | ^6.12.2 |
| Blob storage | Vercel Blob | ^2.3.3 |
| Procesado imágenes | Sharp | ^0.34.5 |
| Hosting | Vercel | — |
| PWA | Service Worker manual | public/sw.js |

### Estructura de rutas y carpetas clave

```
app/
  api/
    analyze/route.ts         ← IA Gemini (foto → macros)
    export/route.ts          ← CSV con rango de fechas
    foods/route.ts           ← CRUD alimentos + búsqueda OFF
    foods/[id]/route.ts      ← DELETE alimento
    foods/[id]/use/route.ts  ← POST incrementa usageCount
    foods/user/route.ts      ← GET alimentos propios + recientes
    goals/route.ts           ← GET/PUT metas diarias
    history/route.ts         ← GET historial por día / búsqueda
    meals/route.ts           ← GET/POST comidas del día
    meals/[id]/route.ts      ← PATCH/DELETE comida individual
    meals/all/route.ts       ← DELETE todas las comidas
    profile/route.ts         ← GET/PUT perfil usuario
    account/route.ts         ← DELETE cuenta completa
  components/
    add/
      StepCamera.tsx         ← captura foto, envía a Gemini
      StepConfirm.tsx        ← revisión y guardado de ítems IA
      StepSearch.tsx         ← búsqueda textual + recientes
      StepMode.tsx           ← selector modo (foto / buscar)
    QuickAddFAB.tsx          ← FAB + bottom sheet (nuevo flujo)
    MealList.tsx, MacroSummary.tsx, DayHeader.tsx, …
  hooks/
    useFoodSearch.ts         ← debounced search hook
    useNotificationSchedule.ts
    useNotificationPermission.ts
    useTheme.ts
  settings/
    profile/page.tsx         ← nombre, edad, sexo, peso, altura, actividad, objetivo
    goals/page.tsx           ← metas manuales (cal, P, C, G)
    notifications/page.tsx   ← recordatorios vía SW
    appearance/page.tsx      ← tema claro/oscuro/sistema
    foods/page.tsx           ← alimentos personalizados
    data/page.tsx            ← exportar CSV, borrar historial, eliminar cuenta
lib/
  foods.ts                   ← 126 alimentos USDA en memoria (fallback offline)
  prisma.ts                  ← singleton PrismaClient
prisma/schema.prisma         ← modelos: User, Meal, Goal, Food, PasswordResetToken
public/sw.js                 ← SW: cache, notificaciones programadas
scripts/seed-foods.ts        ← semilla de los 126 alimentos USDA a DB
```

### Modelos de datos relevantes

**User** — id, email, passwordHash, name, avatarEmoji, age, sex, weightKg, heightCm, activityLevel, fitnessGoal
**Meal** — id, userId, date, dateLocal, category, name, imageUrl, weightG, calories, protein, carbs, fat, confidence, items (JSON string)
**Goal** — id, userId, calories, protein, carbs, fat
**Food** — id, nombre, categoria, cal, p, c, f, gramsPerUnit, unitLabel, **source** ("usda"|"openfoodfacts"|"user"), userId, usageCount, lastUsedAt
**PasswordResetToken** — id, userId, token, expiresAt

### Patrones existentes

- **Fetching**: `fetch()` nativo en Client Components; Server Components usan Prisma directamente
- **State**: `useState` + `useEffect` (sin Zustand/Redux/Context global)
- **Auth**: NextAuth JWT; `auth()` helper en API routes; protección manual por `session.user.id`
- **Validación**: manual inline en API routes (sin Zod/Yup)
- **Manejo errores**: try/catch silencioso en la mayoría de endpoints; no hay error boundary global

### Integraciones externas activas

| Servicio | Estado | Archivo |
|---|---|---|
| Google Gemini 2.5 Flash | Activo | `app/api/analyze/route.ts` |
| Open Food Facts (búsqueda texto) | Activo | `app/api/foods/route.ts` |
| Vercel Blob | Dep instalada | No usado aún para alimentos, sí para imágenes de comidas |
| Resend (email) | Activo | `lib/email.ts` — reset password |
| Turso / libSQL | Producción | `lib/prisma.ts` |

### Tests

**No hay suite de tests.** No existe directorio `__tests__`, `*.test.ts`, `*.spec.ts`, ni configuración de Jest/Vitest/Playwright. Coverage = 0%.

---

## 2. Validación por historia

### HU-01: Registro por foto con IA — PARCIAL

**Archivos relevantes:**
- `app/api/analyze/route.ts` — endpoint Gemini
- `app/components/add/StepCamera.tsx` — captura + envío
- `app/components/add/StepConfirm.tsx` — revisión ítems
- `prisma/schema.prisma` (Meal.confidence, Meal.items)

**Qué cumple:**
- Cámara y galería funcionales con normalización EXIF y resize a 1024px
- Gemini 2.5 Flash retorna ítems con porción en gramos y campo `confianza` (0–1)
- StepConfirm permite editar peso, eliminar ítems y confirmar
- Fallback a entrada manual si la IA falla
- Confianza guardada en `Meal.confidence`

**Qué falta:**
- Sin guía visual de encuadre (overlay)
- Ítems con confianza baja no se resaltan visualmente en StepConfirm
- Sin cache de fotos (ni las 20 últimas; las imágenes sí se suben a Vercel Blob pero solo para `imageUrl` del meal)
- Sin sistema de cuotas (gratis vs premium)
- Sin feedback loop de correcciones al modelo
- No hay enforcement del SLA de 5 segundos (timeout sí existe a nivel fetch pero sin indicador UX claro)

**Esfuerzo estimado:** M (1–2 días para resaltado de confianza + guía encuadre; XL para cuotas/feedback ML)

---

### HU-02: Registro por voz — FALTA

**Archivos relevantes:** ninguno

**Qué cumple:** nada

**Qué falta:** Todo. No hay micrófono, speech-to-text, parseo de cantidades en lenguaje natural, ni integración con LLM para matching.

**Esfuerzo estimado:** XL (Web Speech API + LLM parsing + validación regional)

---

### HU-03: Escaneo de código de barras — FALTA

**Archivos relevantes:** `app/api/foods/route.ts` (OFF por texto, no por barcode)

**Qué cumple:**
- Open Food Facts ya está integrado por búsqueda de texto y cachea resultados en DB

**Qué falta:**
- No hay integración con la API de barcode de OFF (`/api/v0/product/{barcode}.json`)
- No hay scanner de cámara para leer EAN/UPC
- Sin OCR de etiquetas nutricionales
- Sin sugerencia de variantes regionales

**Nota:** La infraestructura OFF existe; añadir lookup por barcode es un cambio de M. El scanner de cámara requiere librería (ej. `zxing-js`) — otro M.

**Esfuerzo estimado:** M (barcode lookup) + M (scanner UI) + L (OCR etiqueta) = L–XL total

---

### HU-04: Base de datos de dos capas — PARCIAL

**Archivos relevantes:**
- `prisma/schema.prisma` (Food.source)
- `app/api/foods/route.ts` (fuentes: "usda", "openfoodfacts", "user")
- `app/components/add/StepSearch.tsx`

**Qué cumple:**
- `Food.source` distingue "usda" / "openfoodfacts" / "user"
- Resultados locales (USDA+user) tienen prioridad sobre OFF en búsqueda
- `Food.usageCount` y `lastUsedAt` permiten ranking por popularidad

**Qué falta:**
- Sin badge visible en UI (Verificado / Comunidad)
- Sin modelo de votos (no existe tabla `Vote` ni campo `votes`)
- Sin detección de outliers
- USDA = 126 alimentos en memoria, no API live USDA FoodData Central
- "openfoodfacts" no es "comunidad verificada", es externa no curada
- Sin sistema de moderación

**Conflicto menor:** el campo `source` usa strings libres sin enum — riesgo de inconsistencias al agregar nuevas fuentes.

**Esfuerzo estimado:** M (badges UI) + L (modelo votos + moderación)

---

### HU-05: Targets adaptativos opcionales — FALTA

**Archivos relevantes:**
- `prisma/schema.prisma` (Goal: cal/prot/carbs/fat estáticos; User.weightKg como snapshot)
- `app/settings/goals/page.tsx`
- `app/api/goals/route.ts`

**Qué cumple:**
- Metas manuales editables (modo "Manual" del criterio de aceptación)
- Perfil tiene `weightKg`, `activityLevel`, `fitnessGoal` como base para cálculo TDEE

**Qué falta:**
- Sin historial de peso (`WeightEntry` model no existe)
- Sin modos "Sugerido" y "Automático"
- Sin algoritmo de regresión de tendencia de peso
- Sin log de cambios de metas

**Conflicto:** `User.weightKg` es un único float — almacenar historial requiere nuevo modelo `WeightEntry(userId, date, weightKg)`.

**Esfuerzo estimado:** L (nuevo modelo + algoritmo tendencia + UI modos)

---

### HU-06: Planificación de comidas — FALTA

**Archivos relevantes:** ninguno

**Qué cumple:** nada

**Qué falta:** Todo. No existe modelo de recetas, motor de planificación, lista de compras, ni base de recetas. Es la historia más compleja del conjunto.

**Esfuerzo estimado:** XL (2+ semanas — motor de optimización + base de recetas + UI de plan semanal)

---

### HU-07: Micronutrientes inteligentes — FALTA

**Archivos relevantes:**
- `prisma/schema.prisma` (Food: solo cal, p, c, f; Meal: solo calories, protein, carbs, fat)
- `lib/foods.ts`

**Qué cumple:** nada

**Qué falta:**
- El modelo `Food` no tiene ningún campo de micronutrientes (vitaminas, minerales, fibra, etc.)
- El modelo `Meal` tampoco los almacena
- Sin cálculo de RDA por perfil
- Sin priorización de micros por perfil de salud

**Conflicto crítico:** Agregar 84+ micronutrientes al modelo `Food` es una migración destructiva que afecta el schema, el seed, todos los endpoints de alimentos y el motor de búsqueda. Además, los datos de Open Food Facts contienen micros opcionales — la cobertura sería muy parcial. Necesitaría USDA FoodData Central API para datos completos.

**Esfuerzo estimado:** XL (migración schema + fuente de datos + RDA engine + UI)

---

### HU-08: Integración con wearables — FALTA

**Archivos relevantes:** ninguno

**Qué cumple:** nada

**Qué falta:** Todo. No hay HealthKit, Health Connect, Fitbit API, Garmin, Whoop ni Oura. La app es una PWA sin acceso a APIs nativas iOS/Android salvo Notification y ServiceWorker. Para HealthKit/Health Connect se necesitaría wrapper nativo (Capacitor/Expo) o deep link.

**Conflicto:** La arquitectura es PWA pura en Vercel. HealthKit solo funciona en apps nativas iOS. Health Connect funciona en Android nativo. Para PWA, la única opción viable es OAuth con Fitbit/Garmin/Oura vía sus APIs REST — pero requiere backend persistente (no serverless edge).

**Esfuerzo estimado:** XL (cambio de plataforma para HealthKit; solo Fitbit/Garmin por OAuth en PWA actual)

---

### HU-09: Coaching contextual — FALTA

**Archivos relevantes:**
- `public/sw.js` (notificaciones programadas por SW)
- `app/settings/notifications/page.tsx`

**Qué cumple:**
- Infraestructura de notificaciones push via SW existe
- Recordatorios de comida funcionan

**Qué falta:**
- Sin motor de detección de patrones
- Sin generación de insights
- Sin límite de 2 notificaciones/semana para insights
- Sin historial de insights descartados
- Sin refuerzo positivo para hitos

**Conflicto:** El SW usa `setTimeout` que se reinicia con el SW — no puede ejecutar cron jobs. Insights semanales requerirían o bien un cron job en Vercel, o Periodic Background Sync (solo Chrome/Android), o un endpoint que evalúe patrones al abrir la app.

**Esfuerzo estimado:** L (análisis de patrones en servidor + UI de insights) + M (integración con notificaciones existentes)

---

### HU-10: Exportar datos y portabilidad — PARCIAL

**Archivos relevantes:**
- `app/api/export/route.ts` — CSV con rango de fechas
- `app/settings/data/page.tsx` — UI de export + pickers
- `app/history/page.tsx` — enlace de descarga rápida

**Qué cumple:**
- CSV completo con todas las comidas
- Filtro por rango de fechas (from/to)
- Botón de descarga en Settings y en Historial

**Qué falta:**
- Sin exportación JSON
- Sin exportación PDF con resumen visual
- Sin write-back a Apple Health
- Sin flujo "exportar antes de eliminar cuenta" (el DELETE /api/account borra directamente sin exportar)
- Sin cumplimiento GDPR/LGPD formal

**Esfuerzo estimado:** M (JSON + PDF básico) + L (PDF con gráficas + flujo GDPR)

---

### HU-11: Modo "sin tracking" / hábitos — FALTA

**Archivos relevantes:** ninguno

**Qué cumple:** nada

**Qué falta:** Todo. No existe concepto de "porción visual", modo hábitos, ni detección de señales de TCA. Requiere nuevo modelo de datos para hábitos y cambios en el dashboard.

**Esfuerzo estimado:** L (modo hábitos básico) + XL (detección TCA responsable)

---

### HU-12: Soporte regional auténtico — PARCIAL

**Archivos relevantes:**
- `app/api/foods/route.ts` (OFF con `lc=es`)
- `app/settings/foods/page.tsx` (alimentos propios)
- `prisma/schema.prisma` (Food.source, Food.categoria)

**Qué cumple:**
- Open Food Facts se consulta en español (`lc=es`)
- Usuarios pueden agregar alimentos propios (workaround regional informal)
- `Food.source` puede distinguir "regional" si se añade como valor

**Qué falta:**
- Sin campo `country`/`region` en User profile
- Sin partición de BD por región
- Sin priorización de resultados por país al buscar
- Los 126 alimentos USDA son genéricos (en español pero sin foco latinoamericano)
- Sin cola de "alimentos pendientes de validación regional"

**Esfuerzo estimado:** M (campo región en perfil + priorización en búsqueda) + L (base de datos regional curada)

---

## 3. Mapa de dependencias

```
HU-12 (soporte regional) → HU-04 (porque sin datos regionales validados, la BD de dos capas queda incompleta)
HU-03 (barcode)          → HU-04 (porque el barcode agrega entradas a la BD comunitaria)
HU-04 (BD dos capas)     → HU-07 (porque sin USDA FoodData Central completo no hay datos de micros)
HU-04 (BD dos capas)     → HU-06 (porque el planificador necesita base de alimentos rica)
HU-05 (targets adapt.)   → HU-09 (porque el coaching necesita tendencia de peso/adherencia para generar insights)
HU-08 (wearables)        → HU-09 (porque el coaching es más preciso con datos de actividad real)
HU-07 (micronutrientes)  → HU-09 (porque algunos insights serían sobre déficits de micros)
```

---

## 4. Nodos raíz recomendados para empezar

Historias que no dependen de otras, están parcialmente implementadas, y desbloquean múltiples derivadas:

1. **HU-10** (exportar datos) — ya tiene el 60% hecho; completarla es rápido y da valor inmediato + cumplimiento mínimo GDPR
2. **HU-01** (foto IA) — ya tiene el 70% hecho; completar los criterios faltantes (resaltado confianza, guía encuadre) con esfuerzo M
3. **HU-04** (BD dos capas) — el campo `source` ya existe; agregar badges en UI y modelo de votos desbloquea HU-07 y HU-06
4. **HU-12** (soporte regional) — añadir campo `region` al perfil + ajustar búsqueda tiene esfuerzo M y mejora la experiencia core para el público objetivo

---

## 5. Riesgos y supuestos

| # | Riesgo / Supuesto | Impacto |
|---|---|---|
| R1 | **Sin tests**: cualquier cambio de schema o lógica puede romper silenciosamente flows existentes. Se asume que no hay suite de tests y que cualquier PR requiere QA manual. | Alto |
| R2 | **Migraciones Turso manuales**: el ORM usa `provider = "sqlite"` sin `directUrl` diferenciada. En producción las migraciones se hacen con `turso db shell` + ALTER TABLE. Un campo obligatorio sin default rompería producción. | Alto |
| R3 | **HU-07 es una migración destructiva**: añadir micronutrientes al modelo `Food` (84+ columnas) requiere una migración que afecta todos los endpoints, seeds, imports/exports y el schema de Meal. Si el proyecto no tiene datos reales de micros para los 126 alimentos, esta historia queda vacía de contenido. | Alto |
| R4 | **HealthKit/Health Connect no son accesibles desde PWA pura**: HU-08 requiere o bien wrappers nativos (Capacitor), o limitarse a OAuth con Fitbit/Garmin/Oura. La arquitectura actual no lo soporta. | Alto |
| R5 | **Los 126 alimentos USDA son un fallback offline, no una fuente viva**: `lib/foods.ts` es un array en memoria. No hay sincronización con USDA FoodData Central API. Para HU-04 y HU-07 se necesita la API viva. | Medio |
| R6 | **SW setTimeout no es confiable para cron de coaching**: HU-09 requiere análisis semanal. El SW se reinicia frecuentemente. Insights necesitarían Vercel Cron Jobs o evaluación on-demand al abrir la app. | Medio |
| R7 | **Open Food Facts no garantiza calidad nutricional**: los datos de OFF son colaborativos y con campos opcionales. Para HU-04 (BD verificada) y HU-07 (micros), OFF solo sirve como capa "comunidad", no como fuente verificada. | Medio |
| R8 | **Vercel serverless tiene timeout de 10s en plan hobby**: HU-06 (planificación con LLM) y HU-09 (análisis de patrones) pueden exceder ese límite. Se asume plan Pro o uso de background jobs. | Bajo–Medio |

---

## 6. Preguntas abiertas

1. **HU-05**: ¿El peso del usuario se va a registrar periódicamente dentro de la app, o se importaría desde wearables (HU-08)? Esto define si necesitamos `WeightEntry` model antes de HU-05.

2. **HU-07**: ¿Cuál sería la fuente de datos de micronutrientes? ¿USDA FoodData Central API (requiere API key), OFF (cobertura parcial), o un dataset curado propio? Sin resolver esto, HU-07 es inviable técnicamente.

3. **HU-04**: ¿"comunidad" significa usuarios de esta app votando, o se reutiliza la comunidad de OFF? Definir esto cambia el modelo de datos significativamente.

4. **HU-08**: ¿Se contempla convertir la app a Capacitor/React Native para tener acceso a HealthKit, o el alcance es solo OAuth con Fitbit/Garmin/Oura desde PWA?

5. **HU-03 + HU-01**: ¿Hay cuota o presupuesto definido para el uso de la API de Gemini? Las fotos usan tokens de visión que son más caros. Sin cuota definida no se puede diseñar el sistema de tier gratuito vs premium.

6. **Prioridad**: ¿Las 12 historias se implementarán todas, o hay un subconjunto del MVP? Recomendaría arrancar con HU-01 (completar), HU-10 (completar), HU-03 (barcode), HU-12 (regional básico), HU-04 (badges UI) antes de las XL.

---

## Resumen ejecutivo

| Estado | Historias | % |
|---|---|---|
| PARCIAL | HU-01, HU-04, HU-10, HU-12 | 33% |
| FALTA | HU-02, HU-03, HU-05, HU-06, HU-07, HU-08, HU-09, HU-11 | 67% |
| EXISTE | — | 0% |
| CONFLICTO | HU-07 (schema), HU-08 (plataforma) | — |

Las 4 historias PARCIAL representan ~50% del valor percibido del usuario final. Las 2 historias con CONFLICTO (HU-07 y HU-08) tienen riesgos de arquitectura que conviene resolver como decisiones de diseño antes de codificar.
