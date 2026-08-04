# Reporte de auditoría — Macro Tracker

**Fecha:** 2026-08-03
**Alcance:** rama `main` (commit `67897eb`). App completa: 47 rutas API, frontend React, lógica de dominio (`lib/`), capa de datos (Prisma 7 + libSQL/Turso), PWA/service worker, integraciones externas (Gemini, Fitbit, Oura, USDA, OpenFoodFacts, Resend, Vercel Blob, web-push).
**Método:** 7 auditorías en paralelo por subsistema + verificación manual de los hallazgos de mayor impacto (leyendo el código y reproduciendo comportamientos en Node) + `tsc`, `eslint`, `next build`, `vitest` (303/303 verdes), `npm audit`, comparación del schema real de `dev.db`.

> **Nota metodológica importante.** El proyecto pasa typecheck, lint, build y los 303 tests. **Ninguna de esas herramientas detecta los bugs de este reporte**, porque todas corren contra `schema.prisma` y contra los tests unitarios —que usan datos "correctos"— no contra el contrato real entre frontend y API ni contra el estado real de la base de producción (Turso). Ese es, en sí mismo, el hallazgo transversal: **la suite verde da una falsa sensación de seguridad.**

Los ítems marcados con ✓ los verifiqué personalmente sobre el código (no solo reportados por un agente). Los marcados con ⚠️ dependen del estado real de producción (Turso), que no puedo inspeccionar desde aquí y requieren una comprobación de tu parte.

---

## 1. Resumen ejecutivo

La app tiene una base sólida en varias áreas (cifrado AES-GCM correcto de tokens de wearables, CSRF-state en OAuth, anti-enumeración en forgot-password, `useSyncExternalStore` bien usado, scoping por `userId` correcto en casi todas las rutas). Pero acumula **una capa de deuda que rompe funcionalidad real hoy**, más **cuatro fallas de arquitectura raíz** que explican la mayoría de los bugs individuales.

### Lo que está roto en producción *ahora mismo* (P0 — bloqueante)

| # | Qué se rompe | Causa | Verif. |
|---|---|---|---|
| B1 | **Guardar una comida que no sea "snack"** (el flujo central de la app) | El frontend envía la categoría en español (`desayuno`/`almuerzo`/`cena`); el schema Zod del API solo acepta inglés → `400 Datos inválidos` | ✓ |
| B2 | **Ver cualquier comida con foto** (rompe el render de la página del día) | `<Image>` de `next/image` con URL de Vercel Blob, pero `next.config.ts` no declara `images.remotePatterns` | ✓ |
| B3 | **Abrir la app en el día correcto** | `/` es una página estática: el redirect quedó congelado con la fecha del build (`/day/2026-08-03` fijo en el HTML prerenderizado) | ✓ |
| B4 | **Conectar Fitbit u Oura** (500 al instante) | `Response.redirect()` crea headers inmutables; el código hace `headers.append("Set-Cookie", …)` → `TypeError: immutable` | ✓ |
| B5 | **Crear un plan de comidas con 5 comidas/día** (500) | Dos slots (`snack1`, `snack2`) mapean al mismo `mealType: "snack"` y violan `@@unique([planId,date,mealType])` | ✓ |
| B6 | **La pantalla de micronutrientes** siempre en cero | El cliente nunca envía `foodId` al crear la comida → el snapshot de micros nunca se calcula → `MicrosCard` no se renderiza jamás | ✓ |
| B7 | **Las notificaciones push** (feature entera muerta) | Ningún cliente llama nunca a `pushManager.subscribe`: la tabla de subscriptions siempre está vacía | ✓ |

### Las cuatro fallas de arquitectura raíz

1. **No hay una única fuente de verdad del "día del usuario".** Conviven la fecha UTC del servidor (`app/page.tsx`, `todayLocal()` en ~6 rutas), la fecha local del dispositivo (`DayHeader`, `StepConfirm.todayString()`, `BottomNav`) y timestamps híbridos (fecha local + hora UTC concatenadas). Para un usuario en Colombia (UTC−5), **de 19:00 a medianoche la app está en el día equivocado**: registra datos con fechas corridas, muestra "hoy" vacío, y la comida recién guardada no aparece en la pantalla donde se registró. Es la causa de ≥8 bugs distintos.

2. **Cuatro fuentes de verdad del esquema de base de datos que divergieron.** `schema.prisma` (correcto) · las 3 migraciones de `prisma/migrations/` (solo cubren ~5 de 17 modelos) · el catálogo DDL hardcodeado en `app/api/admin/migrate/route.ts` (el que se aplica a Turso) · los `docs/migrations/*.sql` (correctos pero solo de referencia). **El catálogo del endpoint —el único que toca producción— está mal transcrito**: para 5 tablas usa nombres de columna, tipos y constraints incompatibles con lo que el código Prisma espera.

3. **Contrato de dominio bilingüe inconsistente.** El dominio se modeló en español (`MealList` agrupa por `desayuno`/`almuerzo`/`cena`; la DB guarda español) pero la capa de validación Zod y el meal-planner hablan inglés (`breakfast`/`lunch`/…). Los dos idiomas se cruzan en los bordes y rompen tanto la creación de comidas (B1) como el log desde el plan (las comidas del plan se guardan en inglés y desaparecen de la lista aunque sí suman en los totales → "calorías fantasma").

4. **Manejo de errores que simula éxito.** Patrón repetido en todo el código: `catch` que devuelve `200`/`GENERIC_OK`, `fetch` sin comprobar `res.ok`, blobs que nunca se borran, `lastSyncedAt` que se actualiza aunque no se sincronizara ningún dato. El resultado es que **los fallos son invisibles**: el usuario ve "Guardado"/"recibirás un enlace" y nada ocurrió.

### Dependencias con vulnerabilidades conocidas

`npm audit` (solo prod): **16 vulnerabilidades (2 críticas, 7 altas)**. Las críticas están en `next-auth@5.0.0-beta.31` / `@auth/core` (entre ellas *"Configuration errors can cause existence-based auth checks to fail open"* — relevante porque la protección de la app depende 100% de `auth()`). También `next@16.2.4` (varias altas, incl. bypass de middleware/proxy y cache-poisoning de redirects) y `sharp <0.35` (CVEs de libvips, y `sharp` procesa imágenes subidas por el usuario). Correr `npm audit fix` y priorizar salir del `beta.31` de Auth.js.

---

## 2. Seguridad

**S1 · [ALTA] ✓ `/api/analyze` es público — sin auth, sin rate-limit, sin límites de tamaño/tipo.** Es la única ruta de negocio sin `auth()` (verificado: no importa `@/auth`). Contrasta con `/api/parse-voice`, que sí exige sesión y valida con Zod. Cualquiera en internet puede quemar la cuota facturable de `GEMINI_API_KEY` en bucle, usando la app como proxy de visión gratuito. `mimeType` y `weightG` del atacante se interpolan en el prompt sin validar (inyección de prompt). — `app/api/analyze/route.ts:83`

**S2 · [ALTA] ✓ Escalada a admin por diferencia de mayúsculas en el email.** El allowlist de admins compara en minúsculas (`admin.ts:32`), pero el registro guarda el email tal cual y SQLite compara con colación BINARY (case-sensitive). Con `ADMIN_EMAILS=jarceandrade@gmail.com`, un atacante registra `JArceandrade@gmail.com`: es otra fila (no colisiona con el índice único), pero `requireAdmin()` lo acepta → acceso a `/api/admin/foods/*` (verificar/sync-USDA). El mismo defecto genera cuentas duplicadas y rompe login/recuperación case-sensitive. — `lib/auth/admin.ts:32` + `app/api/auth/register/route.ts:23`

**S3 · [ALTA] ✓ El endpoint de DDL se autentica con `AUTH_SECRET`, la clave de firma de las sesiones.** No es invocable sin auth (bien), pero reutiliza el secreto con el que Auth.js firma los JWT. Ese secreto ahora vive también en GitHub Secrets, en el entorno de un runner, y viaja como bearer en cada push. Quien lo obtenga puede **forjar la sesión de cualquier usuario** (ATO total), no solo migrar. Debe ser un `MIGRATE_SECRET` independiente. — `app/api/admin/migrate/route.ts:325`

**S4 · [MEDIA-ALTA] ✓ El export GDPR completo se sube a un blob público y nunca se borra.** Al borrar la cuenta se genera un JSON con email, perfil, peso, país e historial completo, y se sube con `access: "public"` sin expiración ni `del()` posterior. El email promete que "estará disponible por tiempo limitado" y que "tu información ya fue eliminada permanentemente" — ambas afirmaciones son falsas: los datos del usuario "borrado" siguen accesibles por URL indefinidamente. — `app/api/account/route.ts:37`

**S5 · [MEDIA] ✓ Fotos de comida en blobs públicos con nombre predecible.** `put(\`meal-${Date.now()}.jpg\`, …, { access: "public" })` sin `addRandomSuffix` (que en `@vercel/blob` v2 es `false` por defecto). La URL es `…/meal-<epoch_ms>.jpg`, enumerable por fuerza bruta de timestamps → las fotos de comida de todos los usuarios son accesibles sin sesión. Además, dos subidas en el mismo milisegundo colisionan y, sin `allowOverwrite`, el `put` lanza → la comida se guarda sin foto en silencio. — `app/api/meals/route.ts:102`

**S6 · [MEDIA] ✓ Sin rate-limiting en ninguna ruta.** Fuerza bruta de contraseñas ilimitada en el login (la política de fortaleza solo se aplica en el cliente), email-bombing en forgot-password, creación masiva de cuentas, abuso de Gemini. No hay ninguna implementación (`grep` de rate-limit/upstash/throttle → 0).

**S7 · [MEDIA] Tokens de reset guardados en texto plano.** La generación (CSPRNG 256-bit) y expiración (15 min, un uso) son correctas, pero el token se guarda tal cual. Un dump de DB o un `DATABASE_AUTH_TOKEN` filtrado permite tomar cualquier cuenta con un reset activo. Guardar `sha256(token)`. — `app/api/auth/forgot-password/route.ts:31`

**S8 · [MEDIA] El reset de contraseña no invalida sesiones existentes.** Con `strategy: "jwt"` y nada en el token ligado a la contraseña, un atacante con una cookie de sesión la conserva ~30 días *después* de que la víctima cambie la clave. El flujo "me hackearon → cambio contraseña" no expulsa al atacante. — `app/api/auth/reset-password/route.ts:31`

**S9 · [MEDIA] Un usuario puede robar la suscripción push de otro.** `pushSubscription.upsert({ where: { endpoint } })` con `update: { userId }` no verifica pertenencia: quien conozca el `endpoint` de otra persona se apropia de sus notificaciones. — `app/api/push/subscribe/route.ts:26`

**S10 · [BAJA-MEDIA] SSRF ciego vía endpoint de push arbitrario.** `endpoint: z.url()` acepta cualquier URL (p. ej. `http://169.254.169.254/…`); el cron de insights hará POSTs firmados hacia allí. Falta allowlist de push services. — `lib/schemas/push.ts:11`

**S11 · [BAJA] `/api/foods/[id]/use` y `/vote` sin scoping por Food.** Se puede incrementar `usageCount`/`lastUsedAt` o votar negativo alimentos privados ajenos (enumerando ids), envenenando el ranking y forzando el panel de revisión de admin. — `app/api/foods/[id]/use/route.ts:9`

**S12 · [BAJA] Enumeración de usuarios en el registro** (409 si existe vs 201 si no) — anula el cuidado anti-enumeración de forgot-password. Y **timing attack** en el login (email inexistente responde en ms; existente paga un bcrypt de ~250 ms). — `register/route.ts:23`, `auth.ts:19`

**S13 · [BAJA] Open redirect potencial** en `callbackUrl` del login: se pasa a `router.push` sin validar que sea ruta relativa. — `app/auth/AuthForm.tsx:82`

**S14 · [BAJA] Faltan cabeceras de seguridad** (`Content-Security-Policy`, `Strict-Transport-Security`, `Referrer-Policy`). El token de reset viaja en la query string, así que sin `Referrer-Policy` restrictiva se puede filtrar por el header `Referer`. — `vercel.json`

---

## 3. Datos y migraciones

> El eje de esta sección: **el catálogo DDL de `app/api/admin/migrate/route.ts` no es una transcripción fiel de `schema.prisma`.** Como ese endpoint es el que materializa las tablas en Turso, cualquier tabla creada por él tiene un esquema incompatible con el cliente Prisma. Confirmé leyendo ambos archivos y comparándolos columna por columna; `dev.db` (creado con `prisma db push`) sí tiene el esquema correcto, lo que confirma que el drift es **dev-vs-prod**.

**D1 · [CRÍTICA] ⚠️✓ Drift de esquema en 5 tablas entre el catálogo de migración y Prisma.** Verificado (código ✓; impacto en prod ⚠️ según cómo se crearon las tablas en Turso):

| Tabla | El catálogo crea… | Prisma/código espera… | Rompe |
|---|---|---|---|
| `GoalAdjustmentLog` | `previousCalories, newCalories, reason?, mode` | `goalId` + `oldCalories/oldProtein/oldCarbs/oldFat/newCalories/newProtein/newCarbs/newFat` (8, NOT NULL) + `reason` NOT NULL | HU-05 (targets adaptativos): todo INSERT falla |
| `Insight` | `severity` (fantasma); **falta `dataJson`** (NOT NULL), `dismissReason`, `pushedAt` | `dataJson`, `dismissReason`, `pushedAt` | HU-09 (coaching + push): create/find fallan |
| `WearableConnection` | `accessTokenEncrypted, refreshTokenEncrypted, scope, createdAt, updatedAt` | `accessToken, refreshToken, scopes, connectedAt, lastSyncedAt` | HU-08 (wearables): upsert falla |
| `ActivityData` | `source, caloriesOut, restingHr`; faltan `distanceKm, sleepEfficiency, rawJson, updatedAt`; UNIQUE por `source` | `provider, caloriesBurned, restingHR, …`; UNIQUE por `provider` | Sync de wearables: upsert por `provider` falla |
| `Food` | añade `votosPositivos, votosNegativos, verified` (fantasma) | omite `voteScore, voteCount, verifiedBy`; sin UNIQUE en `barcode`/`fdcId` | Búsqueda de alimentos, votos, dedup USDA |

**Acción:** inspeccionar el esquema real de Turso (`turso db shell macro-tracker "pragma table_info(GoalAdjustmentLog)"`, etc.) para esas 5 tablas y repararlas con `ALTER TABLE` manuales; luego reescribir el catálogo copiando literalmente los `docs/migrations/*.sql`, que sí son correctos. — `app/api/admin/migrate/route.ts:43-207`

**D2 · [CRÍTICA] ✓ La idempotencia "por existencia de tabla" congela el drift para siempre.** `tableExists()` → `skip-table` sin comparar columnas. Corregir el catálogo **no** repara las tablas ya creadas mal: hace falta DDL manual. El mismo mecanismo hace inerte la entrada de `PasswordResetToken` con FK (la tabla ya existía sin FK desde la migración inicial). — `app/api/admin/migrate/route.ts:332`

**D3 · [ALTA] ✓ Las 8 columnas de perfil de `User` no están en ninguna fuente DDL versionada.** El catálogo solo añade `trackingMode` y `countryCode`; `name, age, sex, weightKg, heightCm, activityLevel, fitnessGoal, avatarEmoji` no están en migraciones ni catálogo. Pero `auth.ts:19` hace `findUnique` sin `select` (selecciona todas las columnas) y `/api/profile` selecciona `avatarEmoji`. Si Turso no tiene esas columnas, login y perfil están rotos; si las tiene (añadidas a mano), el catálogo no puede reconstruir prod (disaster-recovery imposible) y `CLAUDE.md:146` está desactualizado. En cualquier caso hay una fuente de verdad rota. — `schema.prisma:17-24`

**D4 · [ALTA] ✓ Borrar la cuenta puede fallar o dejar huérfanos.** `account/route.ts` solo borra explícitamente `Meal`, `Goal`, `Food`, `User`. El resto (`WeightEntry`, `Insight`, `PushSubscription`, `WearableConnection` con tokens OAuth cifrados, `ActivityData`, `MealPlan`, etc.) depende de `ON DELETE CASCADE`. Dos problemas: (a) `RecipeIngredient.foodId → Food` es `RESTRICT`: si un food propio está en una receta, `food.deleteMany` viola la FK → **el usuario no puede borrar su cuenta (500)**; (b) en libSQL el enforcement de FK es por conexión y `lib/prisma.ts` no fija `PRAGMA foreign_keys=ON` → si Turso no lo activa, las cascadas no ocurren y quedan huérfanos masivos. `PasswordResetToken` no tiene FK y no se borra nunca. — `app/api/account/route.ts:66`

**D5 · [ALTA] ✓ `scripts/seed-foods.ts` es destructivo (no upsert).** `deleteMany({ userId:null, source:"usda" })` + `createMany`: al re-ejecutar con recetas ya sembradas, `RecipeIngredient` (RESTRICT) hace fallar el delete; si pasara, cambian todos los IDs y se pierden `verifiedAt`/micros/`fdcId`. — `scripts/seed-foods.ts:12`

**D6 · [MEDIA] `Goal` sin `@@unique([userId])`.** `goals/route.ts` hace find+create no atómico → dos PUT concurrentes crean 2 goals; las lecturas usan `findFirst orderBy id desc`, dejando duplicados como basura silenciosa. — `schema.prisma:84`

**D7 · [MEDIA] Índices faltantes en el catálogo** (9 de ~20): faltan varios índices de FK (`RecipeIngredient_foodId`, `PlannedMeal_recipeId`) que encarecen los DELETE en cascada, más `Food_needsReview`, `Insight_userId_dismissedAt`, etc. — `app/api/admin/migrate/route.ts:287`

**D8 · [MEDIA] Documentación contradictoria de migraciones.** `CLAUDE.md:82` dice "DB local: `npx prisma migrate dev`", pero `docs/migrations/README.md` dice usar `prisma db push`. Un clon que corra `migrate dev` obtiene un reset/drift. — `CLAUDE.md:82`

---

## 4. Lógica de dominio y cálculos

**L1 · [ALTA] ✓ Ajuste de metas repetible sin guardas → deriva de −200 kcal por llamada.** `/api/goals/suggest` aplica 4 guardas (≥14 pesos, adherencia ≥50%, cooldown 14 días); `/api/goals/apply-suggestion` recomputa la sugerencia pero **no re-valida ninguna**. Como la tendencia no cambia entre llamadas, cada POST repetido (reintento de red, dos pestañas, llamada directa) recorta otros −200 kcal y registra su propio log. Con 0 pesos, `calcTrendSlope([]) = 0` produce un ajuste no nulo igualmente. — `app/api/goals/apply-suggestion/route.ts:46`

**L2 · [ALTA] ✓ Timezone UTC vs local** (falla raíz #1, detalle). Los `todayLocal()` de `micros/today`, `micros/details`, `habits`, `weight` (servidor) y de `micros/page.tsx`, `settings/weight/page.tsx` (cliente) usan `new Date().toISOString().split("T")[0]` = **día UTC**, mientras las comidas se guardan con `dateLocal` local real. En UTC−5 de noche: micros/hábitos/peso consultan "mañana" (vacío) y el peso se registra con fecha corrida (parte la serie de tendencia). — múltiples archivos

**L3 · [ALTA] ✓ La detección de outliers es matemáticamente imposible en el caso típico.** Con σ poblacional y `MIN_SAMPLES=10`, el z máximo alcanzable en una muestra de n=10 es `(n−1)/√n = 2.846 < 3` (cota de Samuelson), así que una categoría de 10 alimentos **nunca** flaguea nada. El caso canónico "9 valores iguales + 1 basura" da z = **exactamente 3.0** para cualquier n=10 y el umbral es estricto (`z > 3`) → no dispara. Recién funciona con n≥12. — `lib/foods/outlier-detection.ts:16,54`

**L4 · [ALTA] ✓ La pendiente de peso asume pesajes diarios consecutivos, pero los callers no lo garantizan.** `calcTrendSlope` usa el índice como eje X y multiplica por 7; los callers hacen `take: 30` sin filtrar por densidad. Un usuario que se pesa cada 2 días perdiendo 0,25 kg/sem reales reporta **0,5 kg/sem (el doble)** → dispara `trend_loss_too_fast` y sube calorías erróneamente. Además `weight/trend` usa el parámetro `window` (días) como `take` (nº de entradas). — `lib/weight-trend.ts:80` + `app/api/weight/trend/route.ts:23`

**L5 · [MEDIA] ✓ El azúcar siempre se muestra en rojo "Bajo".** Para nutrientes de solo-límite (sugar: `min=0, max=50`), `pctOfTarget=0` y el status cae en `"low"` salvo que superes 50 g. La UI pinta "low" como déficit rojo: 15 g de azúcar (óptimo) se ven como alerta de déficit. Falta el caso "menos es mejor". — `lib/micros-aggregate.ts:73`

**L6 · [MEDIA] Off-by-one en la ventana de adherencia (>100%).** `since = hoy − 14` con `gte` inclusivo cubre 15 fechas → un usuario que registra todos los días da `15/14 ≈ 1.07`, contradiciendo el contrato "(0..1)". Sin cota superior; un `dateLocal` futuro suma más. Mismo patrón en insights y TCA. — `lib/weight-adherence.ts:16`

**L7 · [MEDIA] Los hitos de racha casi nunca pueden dispararse con cron semanal.** `ruleStreak` exige igualdad exacta con {7,14,30,60,90} y el cron corre solo los domingos: para una racha ininterrumpida los valores observados forman una progresión de paso 7, y como 30/60/90 son residuos distintos mod 7, a lo sumo uno es alcanzable por usuario. El docstring ("evitar spam diario") revela que se diseñó para un cron diario. — `lib/insights/rules.ts:41`

**L8 · [MEDIA] "Días consecutivos" que no verifican contigüidad de calendario.** Tanto `consecutiveDeficitDays` (micros) como la detección TCA (`safe-use/check`) iteran solo los días *con registro*: días separados por semanas cuentan como "consecutivos", y el día en curso a media mañana casi siempre es déficit e infla la racha. El contrato TCA dice "0 si sin registro" pero esos días se omiten. — `lib/micros-aggregate.ts:134`, `lib/tca-detection.ts:99`

**L9 · [MEDIA] Dedupe de insights de 24h documentado pero no implementado** (solo se chequea la cuota semanal) → re-trigger el mismo día duplica el insight. — `lib/insights/generator.ts:14`

**L10 · [MEDIA] `matchesRegion` por substring falla para 12 de 21 países.** El mapa `countryWord` solo cubre 9 países; para el resto usa el código de 2 letras como substring: `DO` + `"indonesia"` → match (falso positivo); `GT` + `"guatemala"` → `"guatemala".includes("gt")` = false (falso negativo con su propio país). — `lib/barcode.ts:66` + `lib/regions.ts:16`

**L11 · [BAJA] Recetas etiquetadas "vegano" con lácteos** ("Café con leche y tostada…" tiene `dietTags:["vegano"]` + `allergyTags:["lacteos"]`); un vegano sin alergia declarada la recibe en su plan. — `lib/recipes-seed.ts:769`

**L12 · [BAJA] `meal-planner`: el "cap a 2 usos" documentado en el test no está implementado** (`calDiff` sin cap puede superar el bonus negativo) → una receta puede repetirse 3+ veces en el plan. — `lib/meal-planner.ts:137`

---

## 5. Frontend / UX

**F1 · [CRÍTICA] ✓ Categorías español↔inglés rompen crear comida** (= B1 / falla raíz #3). El único emisor de `POST /api/meals` (`StepConfirm`) envía `category` en español; el schema Zod acepta inglés → solo "snack" pasa. — `app/components/add/StepConfirm.tsx:15,229` vs `lib/schemas/meal.ts:8`

**F2 · [CRÍTICA] ✓ `next/image` sin `remotePatterns` rompe el render con fotos** (= B2). — `app/components/MealList.tsx:58` + `next.config.ts`

**F3 · [CRÍTICA] ✓ Redirect raíz congelado a la fecha del build** (= B3). — `app/page.tsx:4`

**F4 · [ALTA] ✓ Spinner infinito al quitar la foto pre-seleccionada en la cámara.** `processing = !!initialFile && !previewUrl && !displayError`; al tocar la X, `previewUrl=null` deja `processing=true` para siempre, sin selector de cámara ni botón activo. Única salida: "Atrás". — `app/components/add/StepCamera.tsx:83`

**F5 · [ALTA] ✓ Renombrar un ingrediente a mano es imposible y corrompe datos.** El texto solo vive en `nameSearch`; al hacer click fuera se descarta y revierte. Si se vacía el campo, la coerción `Number(value) || 0` convierte `nombre` en el número `0` → falla el schema (StepConfirm) o persiste "0" (EditMealSheet, que no valida). Duplicado en ambos componentes. — `StepConfirm.tsx:139` + `EditMealSheet.tsx:152`

**F6 · [ALTA] ✓ La fecha de la URL se ignora al agregar comida.** Estando en un día pasado, "Agregar comida" guarda en *hoy* salvo que el usuario note el campo de fecha (`StepConfirm` descarta el prop `date` e inicializa con `todayString()`). — `app/components/add/StepConfirm.tsx:81`

**F7 · [MEDIA] ✓ Timestamp híbrido: fecha local + hora UTC.** `date: \`${selectedDate}T${new Date().toISOString().split("T")[1]}\``: una cena a las 20:30 en Bogotá se guarda como `…T01:30Z`, que el historial (`format(parseISO(date))`) muestra **un día antes**. — `StepConfirm.tsx:227` + `history/page.tsx:58`

**F8 · [MEDIA] ✓ Race condition en la búsqueda de alimentos.** El debounce limpia el timer pero no ignora respuestas en vuelo (sin `AbortController` ni flag): una respuesta lenta pisa a una rápida posterior con resultados stale. — `app/hooks/useFoodSearch.ts:62`

**F9 · [MEDIA] ✓ `history` crashea o cuelga ante errores.** `runSearch` sin try/catch → "Buscando…" eterno offline; sin `res.ok` → un 401/500 hace `setSearchResults({error})` → `.map is not a function` crashea la página. Igual en la carga inicial (`days.map`). — `app/history/page.tsx:105`

**F10 · [MEDIA] ✓ Borrado diferido de 5s frágil.** Si el usuario cierra la app dentro de los 5s, el DELETE nunca corre pese al toast "Comida eliminada" (sin `sendBeacon`); la comida reaparece. El botón "Deshacer" no expira y tras 5s falla en silencio. — `app/components/MealList.tsx:139`

**F11 · [MEDIA] ✓ Mutaciones sin `router.refresh()`** dejan la UI stale: "Aplicar ajuste" (SuggestionBanner), cambio de tracking-mode, y marcar "consumido" en el plan no refrescan la vista del día. — varios

**F12 · [MEDIA] ✓ Auto-save de metas guarda 0 al vaciar un campo.** Debounce 700ms + `Number("") || 0` → si tardas en reescribir se guarda `calories: 0` (el schema acepta `min(0)`). Sin `res.ok` → muestra "Guardado" ante un error. — `app/settings/goals/page.tsx:64`

**F13 · [MEDIA] ✓ Dashboards que cuelgan en loader eterno offline** (`HabitsDashboard`, `MicrosCard` al cambiar de día) por catch silencioso sin estado de error. `AuthForm.handleLogin` sin try/catch → botón "Entrando…" bloqueado para siempre si `signIn` lanza. — varios

**F14 · [MEDIA] ✓ "Recientes" es global entre usuarios.** `lastUsedAt`/`usageCount` viven en `Food` (no por usuario): los recientes incluyen alimentos globales usados por *cualquiera*. — `app/api/foods/user/route.ts:18`

**F15 · [BAJA] ✓ Etiqueta de macros engañosa en alimentos por unidad** (muestra kcal/100g como si fueran por unidad: "155 kcal por 1 huevo" cuando son ~93). El cálculo es correcto, solo la etiqueta miente. — `StepSearch.tsx:131`

**F16 · [BAJA] ✓ Doble conteo de uso** (`registerUse` en `handleSelect` y `handleConfirm`), **dismiss/delete sin `res.ok`** (foods, insights), **inputs numéricos que no se pueden vaciar** (saltan a 0), **ruta huérfana** `/day/[date]/add` con menos features que el FAB. — varios

---

## 6. PWA / Service Worker / Infra

**P1 · [ALTA] ✓ El SW cachea respuestas de error de chunks para siempre.** La rama `/_next/static/` es cache-first y hace `cache.put` **sin comprobar `res.ok`** (las otras dos ramas sí lo hacen). Un 404/500 transitorio del CDN para un chunk queda cacheado y se sirve indefinidamente → `ChunkLoadError`/pantalla rota hasta bumpear `CACHE_NAME`. Es la misma clase de incidente ("la app no abre") que motivó la v5. — `public/sw.js:72`

**P2 · [ALTA] ✓ Datos stale tras cada mutación (SWR sin invalidación).** `/api/meals|history|goals` devuelven `cached ?? fetch` y ninguna mutación invalida el cache. Registrar el almuerzo → abrir Historial muestra el cache anterior (sin el almuerzo); cambiar metas → Ajustes muestra las viejas; "borrar todos mis datos" → el historial sigue mostrándolas. — `public/sw.js:54`

**P3 · [ALTA] ✓ El cache sobrevive al logout → fuga entre usuarios.** El cache se indexa solo por URL (sin `Vary: Cookie`) y nada llama `caches.delete()` en `signOut`. En un dispositivo compartido, el usuario B ve el `/api/history` y `/api/goals` cacheados del usuario A. — `public/sw.js` + `settings/page.tsx`

**P4 · [ALTA] ✓ Offline roto: el `start_url` nunca es cacheable.** `/` responde un redirect 307 → en el SW la navegación solo cachea `res.ok`, y un redirect es `opaqueredirect` (`ok===false`) → "/" nunca se cachea, y el `/day/<fecha>` destino cambia cada día. Abrir la PWA sin red = pantalla de error del navegador. No hay página offline de fallback. — `public/sw.js:84` + `app/page.tsx`

**P5 · [ALTA] ✓ Recordatorios con `setTimeout` dentro del SW no disparan con la app cerrada.** El navegador mata el SW a los ~30s de inactividad (iOS aún más agresivo); un timer de horas muere con él. La UI promete que "instalada en pantalla de inicio" basta — falso. `periodicsync` es un no-op y nadie llama `periodicSync.register()`. — `public/sw.js:136`

**P6 · [ALTA] ✓ Carrera en el workflow de migración: aplica el catálogo *viejo* y reporta éxito.** El paso "esperar deploy" considera listo cualquier `401`, pero el deploy *anterior* ya devuelve 401 desde el primer intento. El Action arranca al instante del push mientras Vercel tarda minutos → aplica migraciones contra el código viejo, responde `errors:0`, y el schema nuevo entra minutos después sin migrar → exactamente el "no such column" que este workflow debía prevenir. Además el deploy va vivo **antes** de migrar (ventana de schema viejo) y el CI no gatea el deploy (`e2e` es `continue-on-error`). — `.github/workflows/migrate-prod.yml:36`

**P7 · [MEDIA] ✓ Auto-reload por `SW_UPDATED` descarta lo que el usuario esté escribiendo.** Con `skipWaiting`, al detectar un `sw.js` nuevo todas las pestañas hacen `location.reload()` inmediato sin mirar si hay un formulario a medias. (No hay reload-loop: verificado.) — `ServiceWorkerRegistration.tsx:26`

**P8 · [MEDIA] ✓ `POST/PUT/DELETE` offline responden error ininteligible + rejection online.** La rama SWR no filtra por método: offline, un POST cae en `.catch(()=>undefined)` → `TypeError: Failed to fetch` genérico, sin cola offline; online, `cache.put` con POST rechaza por spec (Cache API solo admite GET) → unhandled rejection en cada mutación. — `public/sw.js:54`

**P9 · [MEDIA] ✓ Cron de wearables en horario que pierde la última hora del día local.** `0 4 * * *` UTC = 23:00 en Bogotá; `sync.ts` calcula "yesterday+today" en UTC → a esa hora pide el día local en curso (incompleto, nunca se re-consulta) y un día futuro vacío. Los otros dos crons están bien pensados. Nota: Vercel Hobby limita a **2 crons** y hay **3** declarados + `maxDuration` de 300s en dos rutas — si el plan es Hobby, el deploy falla o el 3.º cron no corre. — `vercel.json:12` + `lib/wearables/sync.ts:21`

**P10 · [BAJA] `theme_color` y `background_color` del manifest desactualizados** (`#0F0F0F`/`#F5F1EA` vs el fondo real `#FAFAF9`): barra de estado tinta sobre app crema en Android. — `manifest.json:7`

---

## 7. Integraciones externas

**I1 · [CRÍTICA] ✓ OAuth de wearables muerto en runtime** (= B4). `Response.redirect()` + `headers.append("Set-Cookie")` → `TypeError: immutable` (reproducido en Node 26). Aplica a `connect` y a todas las ramas de `callback`. Usar `NextResponse.redirect` o `new Response(null, {status:302, headers})`. — `app/api/wearables/connect/[provider]/route.ts:38`

**I2 · [ALTA] ✓ `redirect_uri` de wearables depende de `NEXTAUTH_URL` con fallback a `localhost`.** Esa env no está en la lista de `SERVICES.md` y ningún otro código la usa (el proyecto estandariza `NEXT_PUBLIC_APP_URL`). Sin ella en prod, se envía a Fitbit un `redirect_uri=http://localhost:3000/…` → rechazado. — `lib/wearables/fitbit.ts:22`, `oura.ts:22`

**I3 · [ALTA] ✓ Refresh de tokens no atómico y sin estado de "conexión rota".** Si el refresh tiene éxito en el provider pero el `update` de Prisma falla (o la función muere: el cron recorre todas las conexiones en serie), el refresh token rotado se pierde → conexión rota permanentemente (Fitbit invalida el anterior). No hay lock (dos syncs concurrentes → `invalid_grant`) ni campo de estado: la UI sigue diciendo "Conectado". — `lib/wearables/sync.ts:42`

**I4 · [ALTA] ✓ `lastSyncedAt` miente.** Los errores por día se tragan (`catch → console.warn`), `syncConnection` actualiza `lastSyncedAt` igual → si el usuario revoca el acceso en Fitbit, el cron reporta `succeeded` y la UI muestra "Última sync: hace 2h" eternamente sin traer un dato. — `lib/wearables/sync.ts:146,183`

**I5 · [ALTA] ✓ Resend: resets de contraseña rotos en silencio.** El `from` cae a `onboarding@resend.dev` si falta `RESEND_FROM_EMAIL` (ese remitente sandbox solo entrega al dueño de la cuenta), y el `catch` de forgot-password devuelve `GENERIC_OK` ante cualquier error, incluido el `throw` de Resend. Env mal configurada en prod → todos los resets fallan y cada usuario ve "recibirás un enlace en breve". `appUrl` también cae a `localhost`. — `lib/email.ts:17` + `app/api/auth/forgot-password/route.ts:35,41`

**I6 · [ALTA] ✓ Vercel Blob: fotos nunca se borran** (huérfanas al borrar meal/cuenta; `SERVICES.md:116` afirma lo contrario) **+ públicas con nombre predecible** (= S5). El export de cuenta público y eterno contradice el email de eliminación (= S4). — `app/api/meals/[id]/route.ts:66` + `account/route.ts`

**I7 · [ALTA] ✓ El snapshot de micros (HU-07) es código muerto** (= B6): el frontend nunca envía `foodId`, así que todos los `Meal` quedan con micros NULL → `MicrosCard`/`/micros` siempre en cero. — `app/api/meals/route.ts:87` + `StepConfirm.tsx`

**I8 · [MEDIA] ✓ Gemini: respuesta sin validar + drift con parse-voice.** `analyze` reenvía el JSON del modelo sin schema Zod: si viene sin `items`, `StepCamera` hace `data.items.map` → TypeError mostrado como "No se pudo conectar". Si viene con prosa alrededor, `JSON.parse` revienta → 500 genérico (parse-voice sí devuelve 502 útil y sanea con `sanitizeItems`). Sin manejo de 429/safety-block. — `app/api/analyze/route.ts:112`

**I9 · [MEDIA] ✓ USDA: el modo `{ fdcIds }` probablemente importa 0.** `extractMicros` espera la forma "abridged" del endpoint de *búsqueda* (`nutrientId`/`value`); el endpoint de detalle `/food/{fdcId}` devuelve la forma "full" (`nutrient.id`/`amount`) → `{}` → todos `skipped` reportando `ok:true`. También errores de API (429/403) indistinguibles de "sin resultados". — `lib/usda/client.ts:131`

**I10 · [MEDIA] OpenFoodFacts: sin `User-Agent` (su política lo exige; bloquean UAs genéricos) + barcodes UPC-A/EAN-13 no unificados** (mismo producto → dos filas duplicadas). — `lib/barcode.ts:44,108`

**I11 · [BAJA] ✓ USDA API key en query string** (`?api_key=…`, se filtra a logs; existe header `X-Api-Key`) + hasta 50 fetch en `Promise.all` sin throttle contra el rate-limit. — `lib/usda/client.ts:116`

---

## 8. Priorización recomendada

**Arreglar antes de que alguien use la app en serio (P0 — rompe funcionalidad hoy):**
1. B1/F1 — mapear categorías español↔inglés (o unificar el dominio a un solo idioma). Es el flujo central.
2. B2/F2 — añadir `images.remotePatterns` para el host de Vercel Blob en `next.config.ts`.
3. B3/F3 — hacer `/` dinámica y calcular "hoy" en la zona del usuario (no en el servidor).
4. D1/D2 — auditar el esquema real de Turso y reparar las 5 tablas con drift; reescribir el catálogo desde los `.sql` correctos.
5. B4/I1 — cambiar `Response.redirect` por `NextResponse.redirect` en el OAuth de wearables.
6. Falla raíz #1 — centralizar el cálculo del "día del usuario" en un solo helper con timezone del cliente, y usarlo en todas partes.

**Alto (rompe features secundarias o expone datos):**
7. B5 (`snack1/snack2`), B6/I7 (micros muertos), B7 (push muerto).
8. S1 (auth+rate-limit en `/api/analyze`), S2 (normalizar email a minúsculas), S3 (`MIGRATE_SECRET` aparte).
9. P1 (SW: cachear solo `res.ok`), P2/P3 (invalidar cache en mutación y logout), P6 (carrera del workflow).
10. I5 (Resend), I6/S4/S5 (blobs), I3/I4 (wearables refresh/estado).
11. L1 (guardas en apply-suggestion), L2 (timezone), L3/L4 (peso/outliers).

**Medio/Bajo:** el resto de las secciones 4–7, más `npm audit fix` y salir del `beta.31` de Auth.js.

**Recomendación transversal de proceso:** los 303 tests pasan porque prueban unidades con datos correctos; **faltan tests de contrato** (frontend↔API con los payloads reales) y **de integración de esquema** (comparar `pragma_table_info` de la DB real contra lo que Prisma espera). Un solo test que hiciera `POST /api/meals` con `category:"almuerzo"` habría atrapado el bug más grave.

---

*Generado por auditoría multi-agente (7 revisores en paralelo por subsistema) con verificación manual de los hallazgos de mayor severidad. Los ítems ✓ fueron confirmados leyendo el código directamente; los ⚠️ requieren inspección del estado real de producción (Turso).*
