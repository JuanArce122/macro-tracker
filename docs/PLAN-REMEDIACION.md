# Plan de remediación — Macro Tracker

**Basado en:** [`docs/AUDITORIA-2026-08.md`](./AUDITORIA-2026-08.md)
**Estado:** propuesta — **pendiente de aprobación. No se toca código hasta el OK.**

---

## Principios de este plan

1. **Causa raíz antes que síntoma.** El reporte lista ~60 hallazgos, pero la mayoría son síntomas de 4 fallas raíz. Arreglar la raíz cierra muchos de golpe. Por eso las fases están organizadas por *causa*, no por *severidad plana*.
2. **Orden: que funcione → que sea correcto → que sea seguro → que sea robusto.** Primero desbloquear el flujo central (la app hoy no deja registrar comidas normales), luego corregir la lógica, luego cerrar seguridad, al final robustez y proceso.
3. **Riesgo escalonado.** Los cambios de esquema en producción (Turso) son los de mayor blast-radius y van con backup previo y verificación explícita, no mezclados con lo mecánico.
4. **Cada fase es entregable y verificable por sí sola** — se puede parar entre fases sin dejar la app peor que antes.
5. **Sin lógica de negocio sin confirmación** (regla de `CLAUDE.md`). Las fases que tocan cálculos (metas, tendencia, macros) se marcan y se validan contra sus tests antes de darlas por cerradas.

---

## Decisiones que necesito de ti antes de empezar

> **✅ Confirmadas (2026-08-03):** D-A = **español** · D-B = **derivar de `countryCode`** · D-C = **Vercel KV/Upstash**. Pendiente únicamente la **aprobación para empezar** (el usuario está revisando el plan primero).

Tres decisiones cambian el trabajo de las fases 2, 3 y 6. Las detallo aquí y las resumo al final para que respondas junto con la aprobación.

**D-A · Idioma canónico de las categorías de comida.** Hoy conviven español (DB + `MealList`) e inglés (Zod + meal-planner). Hay que unificar.
- **Opción 1 (recomendada): español.** Es lo que ya guarda la DB y lo que agrupa la UI → menos cambios y sin tocar datos existentes. Se ajusta el enum Zod y el meal-planner a español, con una capa de mapeo en el borde del plan.
- Opción 2: inglés. Requiere migrar los valores ya guardados en `Meal.category` y cambiar la UI.

**D-B · Estrategia de zona horaria** (la falla raíz #1).
- **Opción 1 (recomendada para empezar): derivar del `countryCode`.** Ya existe la columna con 21 países; un mapa `CO→America/Bogota`, etc., resuelve el "día del usuario" en servidor y cliente **sin migración**. Fallback a `America/Bogota` si es null. Limitación: países con múltiples husos (US, MX) usan un huso representativo.
- Opción 2: guardar `User.timezone` (IANA) explícito, capturado en Ajustes. Más preciso, pero **suma una columna** → se coordina con la Fase 4.
- Opción 3: calcular "hoy" siempre en el cliente y pasarlo a toda API; el servidor nunca lo adivina. Más invasivo en el frontend.

**D-C · Rate limiting** (hallazgo S6). Requiere un almacén compartido (serverless no permite memoria en proceso).
- **Opción 1 (recomendada): Vercel KV / Upstash Redis.** Es una **dependencia nueva** → necesito tu OK explícito (regla de `CLAUDE.md`).
- Opción 2: diferir S6 a una fase posterior y proteger `/api/analyze` mientras tanto solo con `auth()` (Fase 6).

---

## Fase 0 — Preparación, decisiones y red de seguridad

**Objetivo:** no romper nada al arreglar. Establecer la verdad del estado de producción y las herramientas para detectar regresiones.

| Paso | Detalle | Riesgo |
|---|---|---|
| 0.1 | **Backup de Turso** antes de cualquier cambio de esquema (`turso db dump`). | — |
| 0.2 | **Inspeccionar el esquema real de Turso** para las 5 tablas con drift (`pragma table_info` de `GoalAdjustmentLog`, `Insight`, `WearableConnection`, `ActivityData`, `Food`, más `User`). Esto convierte los ⚠️ del reporte en hechos: sabremos si prod está roto o si las tablas se crearon bien desde los `.sql`. *(Necesito acceso al `turso` CLI o que corras tú los comandos que te pase.)* | Solo lectura |
| 0.3 | **Crear una rama** `fix/audit-remediation` desde `main` y trabajar por fases con commits atómicos (un commit por hallazgo o grupo coherente). | — |
| 0.4 | Confirmar las decisiones D-A, D-B, D-C. | — |

**Verificación de la fase:** tenemos backup, diff real de esquema dev↔prod, y rama lista.
**Depende de:** nada. **Bloquea:** Fases 2, 3, 4.

> **✅ Resultados Fase 0 (2026-08-04) — ejecutada:**
> - **0.1 Backup:** `backups/turso-2026-08-04.turso-dump.sql` (77 KB, 303 filas, gitignored). ⚠️ Nota: `turso db dump` **no existe** en el CLI v1.0.22 (era una suposición del plan); el backup válido se hace con `turso db shell macro-tracker ".dump"`.
> - **0.2 Diff esquema real vs Prisma:** producción **SÍ tiene el drift** — se materializó desde el catálogo roto. Confirmado con `.schema` real. Pero **prod está casi vacía** → riesgo de Fase 4 mucho menor de lo temido:
>   - `GoalAdjustmentLog`, `Insight`, `WearableConnection`, `ActivityData`: **rotas y con 0 filas** → DROP+CREATE correcto, riesgo nulo. Hoy HU-05/HU-08/HU-09 fallan en prod.
>   - `Food`: **rota pero con 287 filas** → ALTER no destructivo (agregar `voteScore`, `voteCount`, `verifiedBy`; índices UNIQUE en `barcode`/`fdcId`; opcional drop de `votosPositivos`/`votosNegativos`/`verified` fantasma).
>   - `User`: **sana**, tiene las 8 columnas de perfil → login/perfil funcionan. **D3 se rebaja** de "posible bug de prod" a solo "hueco de catálogo/disaster-recovery".
>   - Volumen: Food 287, Meal 7, User 2, Goal 1, HabitEntry 1; resto en 0.
> - **0.3 ✓** rama con commit base. **0.4 ✓** decisiones confirmadas.

---

## Fase 1 — Desbloquear el flujo principal (P0 contenidos y mecánicos)

**Objetivo:** que la app vuelva a ser usable. Cambios pequeños, aislados, sin decisiones de diseño. Máximo impacto / mínimo esfuerzo.

| # | Hallazgo | Cambio concreto | Riesgo | Esfuerzo |
|---|---|---|---|---|
| 1.1 | **B2/F2** — fotos rompen el render | Añadir `images.remotePatterns` en `next.config.ts` con el host de Vercel Blob (`*.public.blob.vercel-storage.com`). | Bajo | S |
| 1.2 | **B4/I1** — OAuth wearables 500 | Cambiar `Response.redirect()` + `headers.append` por `NextResponse.redirect(url)` (mutable) o `new Response(null,{status:302,headers:{Location,"Set-Cookie"}})` en `connect` y en las 3 ramas de `callback`. | Bajo | S |
| 1.3 | **B5** — plan de 5 comidas/día 500 | En `lib/meal-planner.ts`, dar a `snack1`/`snack2` valores de `mealType` distintos (p. ej. `snack` y `snack2`) o incluir el slot en la clave; alinear con `@@unique([planId,date,mealType])` y con el render del plan. | Bajo-medio | S |

**Verificación:** `next build` OK; crear comida con foto (tras Fase 2), conectar Fitbit no da 500, generar plan de 5 comidas no da 500. Tests existentes verdes.
**Depende de:** Fase 0. **Nota:** 1.1 y 1.2 son independientes entre sí; se pueden hacer en cualquier orden.

> **✅ Ejecutada (2026-08-04, commit `cf5f8a7`):**
> - **1.1 B2:** `images.remotePatterns` en `next.config.ts` (`*.public.blob.vercel-storage.com`). Validado por `next build`.
> - **1.2 B4:** `NextResponse.redirect` + `cookies.set` en `connect` y `callback` de wearables. Verificado en runtime: 302 con `Location` + `Set-Cookie`, sin `TypeError`.
> - **1.3 B5:** slots `snack1/snack2` con `mealType` distinto; `log-meal` los colapsa a `snack`; página del plan los etiqueta "Snack". + test de regresión de unicidad `(date, mealType)`.
> - Verificación: `tsc --noEmit` limpio, **304 tests** verdes (+1 nuevo), `next build` (webpack, por el symlink de node_modules en el worktree; los cambios son agnósticos al bundler).

---

## Fase 2 — Raíz #3: contrato de dominio (idioma de categorías)

**Objetivo:** cerrar B1 —el bug más grave: no se puede guardar una comida que no sea "snack"— unificando el idioma del dominio.

**Depende de decisión D-A.** Asumiendo **Opción 1 (español):**

| # | Hallazgo | Cambio concreto |
|---|---|---|
| 2.1 | **B1/F1** | Cambiar `MealCategorySchema` en `lib/schemas/meal.ts` a `["desayuno","almuerzo","cena","snack"]`. Crear `lib/categories.ts` con el set canónico + labels de UI (fuente única). |
| 2.2 | **B5 (API-func)** — comidas del plan invisibles | En `app/api/meal-plans/[id]/log-meal/route.ts`, mapear `planned.mealType` (inglés) → categoría española canónica antes de escribir `Meal.category`. |
| 2.3 | consistencia | Reemplazar los arrays `CATEGORIES` duplicados de `StepConfirm.tsx` y `MealList.tsx` por el de `lib/categories.ts`. |
| 2.4 | test de contrato | Añadir un test que haga `POST /api/meals` con `category:"almuerzo"` y espere 201 (el test que habría atrapado esto). |

**Riesgo:** bajo (español ya es lo que guarda la DB). **Esfuerzo:** M.
**Verificación:** registrar desayuno/almuerzo/cena por foto/búsqueda/voz/barcode → 201; comida logueada desde el plan aparece en `MealList`.
**Depende de:** Fase 0 (D-A).

> **✅ Ejecutada (2026-08-04, commit `4d18b4d`):**
> - Fuente única `lib/categories.ts` (`MEAL_CATEGORIES` español + labels + `plannedTypeToCategory`).
> - `MealCategorySchema` deriva de `MEAL_CATEGORIES` → **B1 cerrado** (el schema ya acepta `desayuno/almuerzo/cena`).
> - `log-meal` traduce el `mealType` del plan (inglés) → categoría español (las comidas del plan ya no se guardan invisibles).
> - `StepConfirm` y `MealList` tipan sus categorías contra `MealCategory` (anti-drift). `EditMealSheet` ya usaba español (sin cambios).
> - Test de contrato: acepta español, rechaza inglés. Verificado: `tsc`, **305 tests**, `next build`.
> - Nota: los `breakfast/lunch/dinner` de `notifications`/`useNotificationSchedule` son claves de *recordatorio* (`ReminderKey`), concepto separado de `Meal.category` — no se tocan.

---

## Fase 3 — Raíz #1: fuente única del "día del usuario"

**Objetivo:** eliminar la mezcla UTC-servidor / local-cliente / timestamp-híbrido que rompe la app de noche en UTC−5. Cierra ~8 hallazgos.

**Depende de decisión D-B.** Asumiendo **Opción 1 (derivar de `countryCode`):**

| # | Hallazgo | Cambio concreto |
|---|---|---|
| 3.1 | núcleo | Crear `lib/user-date.ts`: `tzForCountry(code)` (mapa CO→`America/Bogota`, … con fallback), `getUserToday(user)` (servidor, con `date-fns-tz` o `Intl`) y `todayLocalClient()` (cliente, única implementación local). **Nota:** `date-fns-tz` sería dependencia nueva → si prefieres evitarla, se hace con `Intl.DateTimeFormat` sin dependencia (lo confirmo en D-C/D-B). |
| 3.2 | **L2 / API-func #7** | Reemplazar los `new Date().toISOString().split("T")[0]` de `micros/today`, `micros/details`, `habits`, `weight` (servidor) por `getUserToday(user)`. |
| 3.3 | **B3/F3** | Hacer `/` (`app/page.tsx`) dinámica y redirigir al día del usuario (no al del build ni al UTC del server). |
| 3.4 | **F5 / day page** | Unificar el `isToday` del server (`day/[date]/page.tsx`) y del `DayHeader`/`BottomNav` contra el mismo helper para eliminar el hydration mismatch y el desфase de banners. |
| 3.5 | **F7 / F6** | En `StepConfirm`: construir `date` con hora local coherente (no fecha local + hora UTC) y usar el `date` de la URL como default de `selectedDate` (no siempre hoy). |
| 3.6 | **F-hist / API-func #18** | En `history`, navegar "ver día" con `dateLocal`, no con `meal.date` (UTC). |
| 3.7 | **P9** | Reprogramar el cron de wearables a una hora que caiga a mediodía local, o calcular la ventana de días en la tz del usuario. |
| 3.8 | clientes | `micros/page.tsx` y `settings/weight/page.tsx`: usar `todayLocalClient()`. |

**Riesgo:** medio (toca muchos archivos; es lógica de fechas → validar con casos UTC−5 nocturnos). **Esfuerzo:** L.
**Verificación:** a las 20:00 simuladas en UTC−5, registrar comida/peso los archiva en el día correcto y se ven en la pantalla donde se registraron; `/` abre el día correcto; banners y header coinciden.
**Depende de:** Fase 0 (D-B). **Nota:** 3.3 desbloquea parcialmente P4 (offline start_url), que se cierra en Fase 8.

> **✅ Ejecutada (2026-08-04, commit `053177e`):**
> - `lib/user-date.ts` (tz por `countryCode`, sin dependencias — usa `Intl`) + `lib/user-date-server.ts` (`getUserTodayById`).
> - Redirect raíz dinámico + tz → **`/` ya no queda congelada con la fecha del build** (verificado: fuera del prerender-manifest).
> - Defaults de "hoy" en API (`micros/today`, `micros/details`, `habits`, `weight`) y en day page (`isToday`); `DayHeader` recibe `isToday` del servidor (anti-hydration).
> - `BottomNav` "Hoy" → `/`; `micros/page` y `weight/page` dejan que el server resuelva "hoy".
> - `StepConfirm`: default = día de la URL (F6), `date` a mediodía UTC estable (F7/F12), `max`=hoy (evita fecha futura, L6).
> - `history` navega/muestra por `dateLocal`. Cron wearables 04:00→17:00 UTC (mediodía Bogotá, P9 práctico).
> - Test `user-date` con la regresión del bug nocturno UTC-5. Verificado: `tsc`, **310 tests**, `next build`.
> - Pendiente relacionado: la ventana UTC de `sync.ts` (wearables) se pule en Fase 5; el fallback offline del start_url (P4) en Fase 8.

---

## Fase 4 — Raíz #2: drift de esquema e integridad de datos (⚠️ riesgo producción)

**Objetivo:** que el esquema real de Turso coincida con `schema.prisma`, y que el endpoint de migración deje de ser una fuente de verdad divergente. **Es la fase de mayor riesgo** → backup (0.1) obligatorio y ejecución supervisada.

> **✅ Alcance confirmado en Fase 0 (2026-08-04):** el diff real contra Turso confirmó las 5 tablas con drift, pero 4 tienen **0 filas**, así que la reparación es de bajo riesgo:
> - **DROP + CREATE** (desde los `.sql` correctos): `GoalAdjustmentLog`, `Insight`, `WearableConnection`, `ActivityData` — 0 filas, sin pérdida de datos.
> - **ALTER aditivo** en `Food` (287 filas): `ADD COLUMN voteScore/voteCount/verifiedBy` + `CREATE UNIQUE INDEX` en `barcode` y `fdcId`; opcional `DROP COLUMN` de las 3 fantasma. No destructivo.
> - **4.4 (`User`) se reduce**: prod ya tiene las 8 columnas de perfil → solo hay que registrarlas en el catálogo, sin tocar prod.
> - Backup 0.1 ya tomado (`backups/turso-2026-08-04.turso-dump.sql`).

| # | Hallazgo | Cambio concreto |
|---|---|---|
| 4.1 | **D1** | Según el diff de 0.2: para cada una de las 5 tablas con drift, escribir el DDL correctivo (en SQLite/libSQL puede requerir *table rebuild*: crear tabla nueva correcta → copiar datos → drop → rename). Aplicar en Turso con backup previo. |
| 4.2 | **D1/D2** | Reescribir el catálogo `COLUMN_ADDS`/`TABLE_CREATES` de `app/api/admin/migrate/route.ts` copiando **literalmente** los `docs/migrations/*.sql` (que sí son correctos). |
| 4.3 | **D2** | Añadir un **modo `verify`** al endpoint que compare `pragma_table_info` contra las columnas que Prisma espera (no solo existencia de tabla) y reporte discrepancias. Es la red de seguridad contra futuros drifts. |
| 4.4 | **D3** | Registrar las 8 columnas de perfil de `User` en el catálogo/DDL (hoy no están en ninguna fuente versionada). Confirmar contra el estado real de prod (0.2). |
| 4.5 | **D4** | Borrado de cuenta: hacer `deleteMany` explícito por cada tabla del usuario (no depender de cascadas) **y** fijar `PRAGMA foreign_keys=ON` en la conexión libSQL. Incluir `WeightEntry/HabitEntry/Insight/PushSubscription/WearableConnection/ActivityData/MealPlan/PasswordResetToken` en el export previo. Añadir test que cuente filas residuales = 0. |
| 4.6 | **D6** | `@@unique([userId])` en `Goal` + reemplazar find+create por `upsert`. |
| 4.7 | **D5** | `seed-foods.ts`: pasar de delete+create a `upsert` (evita el fallo por FK RESTRICT y la pérdida de IDs/micros). |
| 4.8 | **D7/D8** | Añadir los índices faltantes al catálogo; corregir la contradicción de docs (`CLAUDE.md` vs `README` de migraciones). |

**Riesgo:** ALTO (datos de prod). **Esfuerzo:** L.
**Verificación:** el modo `verify` reporta 0 discrepancias; login/perfil/wearables/insights/metas-adaptativas funcionan contra Turso; borrar cuenta deja 0 filas residuales en un entorno de prueba.
**Depende de:** Fase 0 (0.1 backup, 0.2 diff). **Coordina con:** Fase 3 si D-B = Opción 2 (columna `timezone`).

---

## Fase 5 — Features muertas o rotas (micros, push, wearables)

**Objetivo:** encender funcionalidades que hoy están silenciosamente inertes.

| # | Hallazgo | Cambio concreto | Esfuerzo |
|---|---|---|---|
| 5.1 | **B6/I7** — micros siempre en cero | Propagar `foodId` en el flujo de agregar: añadir el campo al ítem (`AnalysisResult`/`MealItem`), capturarlo cuando se elige un alimento en `StepSearch`/`StepVoice`/`StepBarcode` (ya se conoce en `applyFoodFromDB`), e incluirlo en el body de `POST /api/meals`. El snapshot server-side ya existe. | M |
| 5.2 | **B7** — push muerto | Implementar la suscripción cliente: en `settings/notifications`, tras conceder permiso, llamar `pushManager.subscribe` con la VAPID public key y `POST /api/push/subscribe`. Manejar `unsubscribe` en el `DELETE`. | M |
| 5.3 | **I2** — redirect_uri wearables | Reemplazar `NEXTAUTH_URL ?? localhost` por `NEXT_PUBLIC_APP_URL` (la env estándar del proyecto) en `fitbit.ts`/`oura.ts`; documentar en `SERVICES.md`. | S |
| 5.4 | **I3** — refresh no atómico | Persistir el token refrescado inmediatamente y en transacción; añadir un campo/estado de "conexión rota" a `WearableConnection` (coordina con Fase 4) para marcarla cuando el refresh falla, y reflejarlo en la UI de Ajustes. | M |
| 5.5 | **I4** — `lastSyncedAt` miente | Solo actualizar `lastSyncedAt` si se importó ≥1 dato; propagar el error de día para marcar la conexión, no tragarlo. | S |

**Riesgo:** medio. **Verificación:** `MicrosCard` se renderiza con datos reales; llega un push de prueba; conectar/refrescar wearable refleja estado real.
**Depende de:** Fase 1 (1.2 para que el OAuth arranque), Fase 4 (5.4 si añade columna).

---

## Fase 6 — Seguridad

**Objetivo:** cerrar la superficie de abuso y las fugas de datos.

| # | Hallazgo | Cambio concreto | Prioridad |
|---|---|---|---|
| 6.1 | **S1** | `auth()` obligatorio en `/api/analyze` + límite de tamaño/tipo de imagen server-side + validar `weightG`/`mimeType`. | Alta |
| 6.2 | **S2** | Normalizar email a minúsculas en registro/login/forgot/reset; índice `COLLATE NOCASE` en Turso (coordina Fase 4). Cierra también la escalada a admin. | Alta |
| 6.3 | **S3** | Separar `MIGRATE_SECRET` de `AUTH_SECRET`; actualizar el workflow. | Alta |
| 6.4 | **S4/S5/I6** | Blobs `access:"private"` con URL firmada de vida corta (export de cuenta); `addRandomSuffix:true` + path por `userId` (fotos); borrar el blob con `del()` al borrar meal/cuenta; job de expiración del export. | Alta |
| 6.5 | **S6** | Rate limiting en auth/analyze/forgot-password (según D-C). | Alta |
| 6.6 | **S7** | Guardar `sha256(token)` de reset, no el token en claro. | Media |
| 6.7 | **S8** | Invalidar sesiones al cambiar contraseña (versión de credencial en el JWT o columna `tokenVersion`). | Media |
| 6.8 | **S9/S11** | Scoping por pertenencia en `push/subscribe` (update), `foods/[id]/use` y `/vote`. | Media |
| 6.9 | **S10** | Allowlist de hosts de push (FCM/Mozilla/Apple) en el schema del endpoint. | Media |
| 6.10 | **S12/S13/S14** | Manejar P2002 en registro (409 no 500) + hash dummy anti-timing en login; validar `callbackUrl` relativo; añadir `CSP`/`HSTS`/`Referrer-Policy` en `vercel.json`. | Baja-media |

**Riesgo:** medio (6.2 y 6.4 tocan datos/prod). **Esfuerzo:** L.
**Depende de:** Fase 4 (6.2 índice, 6.4 relación con esquema). D-C (6.5).

---

## Fase 7 — Raíz #4: manejo de errores honesto + correctitud de lógica

**Objetivo:** que los fallos dejen de simular éxito, y corregir los cálculos incorrectos.

**Manejo de errores (raíz #4):**
- **I5** — Resend: distinguir "email no existe" de "fallo de envío"; no devolver `GENERIC_OK` ante error real; validar que `RESEND_FROM_EMAIL`/`NEXT_PUBLIC_APP_URL` estén configurados (fail-fast en arranque).
- **F9/F12/F13/F16 + goals** — barrido de `res.ok`: `history`, `settings/goals`, `HabitsDashboard`, `InsightCard`, `settings/foods`, `AuthForm.handleLogin` (try/catch) — mostrar error real, no "Guardado"/loader eterno.
- **I8** — validar la respuesta de Gemini con Zod (como hace `parse-voice`); 502 con mensaje útil en vez de 500 genérico.

**Correctitud de lógica (⚠️ lógica de negocio — validar con tests):**
- **L1** — `apply-suggestion`: re-verificar las guardas de `suggest` (cooldown, mín. pesos, adherencia) o extraer la validación a una función compartida.
- **L3** — outlier detection: bajar el umbral/usar σ muestral, o subir `MIN_SAMPLES` a ≥12 y documentar por qué.
- **L4 / API-func #10** — tendencia de peso: filtrar por rango de fechas real y usar la fecha como eje X (no el índice); `window`=días, no `take`.
- **L5** — micros de solo-límite (azúcar): status "en rango"/"alto", nunca "bajo/rojo" por defecto.
- **L6/L8** — ventanas de adherencia/TCA/déficit: corregir el off-by-one (15 vs 14 días) y contar solo días consecutivos de calendario reales.
- **L7/L9** — insights: hitos de racha compatibles con cron semanal (rango, no igualdad exacta); implementar el dedupe de 24h documentado.
- **L10** — `matchesRegion`: completar el mapa `countryWord` de los 21 países (evita falsos +/−).
- **L11/L12** — corregir tags "vegano" con lácteos en el seed; aplicar el cap de repetición en meal-planner.
- **F14 / API-func #13** — "Recientes" global: mover `usageCount`/`lastUsedAt` a por-usuario (tabla `FoodUsage` o join). *Requiere schema → coordina con Fase 4.*

**Frontend restante:** F4 (spinner cámara), F5-remaining, F8 (race con `AbortController`), F10 (`sendBeacon` para el delete diferido), F11 (`router.refresh` en las 3 mutaciones), F15 (etiqueta kcal por unidad).
**Integraciones restantes:** I9 (USDA forma full vs search), I10 (User-Agent OFF + unificar UPC/EAN), I11 (API key en header, throttle).

**Riesgo:** medio; la parte de lógica es sensible → cada cambio con su test. **Esfuerzo:** L.
**Depende de:** nada estructural, pero conviene tras Fases 2-4.

---

## Fase 8 — PWA/SW, robustez y proceso

**Objetivo:** cerrar la capa PWA y dejar guardas que impidan que estos bugs vuelvan.

**Service worker / PWA:**
- **P1** — cachear en `/_next/static/` solo si `res.ok`.
- **P2/P3** — invalidar el cache SWR tras mutaciones y en `signOut` (`caches.delete`); considerar `Vary`/no-cache para APIs con datos de usuario.
- **P4** — página offline de fallback + start_url cacheable (tras 3.3).
- **P5** — recordatorios: sustituir `setTimeout` en el SW por notificaciones programadas reales o dejar claro en la UI que requieren app abierta; quitar el `periodicsync` muerto.
- **P6** — workflow de migración: esperar el deploy del commit correcto (verificar SHA/health endpoint, no un 401 genérico); migrar antes de enrutar tráfico o gatear el deploy con CI.
- **P7/P8/P10** — aviso antes del auto-reload; responder 503 con mensaje en mutaciones offline; corregir `theme_color`/`background_color` del manifest.

**Robustez y proceso (la recomendación transversal del reporte):**
- **Tests de contrato** frontend↔API con los payloads reales (habría atrapado B1).
- **Test de integridad de esquema** (`pragma_table_info` real vs Prisma) en CI (habría atrapado D1).
- `npm audit fix`; planificar salida del `next-auth@5.0.0-beta.31` (2 CVEs críticas) y `sharp <0.35`.
- Hacer que el CI **gatee** el deploy (hoy `e2e` es `continue-on-error`).

**Riesgo:** bajo-medio. **Esfuerzo:** L.

---

## Mapa hallazgo → fase (cobertura completa)

| Fase | Hallazgos cubiertos |
|---|---|
| 1 | B2/F2, B4/I1, B5(planner) |
| 2 | B1/F1, log-meal(API#5), duplicación categorías |
| 3 | B3/F3, L2, F5, F6, F7, historia-fecha, P9(parcial), clientes de fecha |
| 4 | D1, D2, D3, D4, D5, D6, D7, D8 |
| 5 | B6/I7, B7, I2, I3, I4 |
| 6 | S1–S14, I6(blobs) |
| 7 | I5, F9, F12, F13, F16, I8, L1, L3, L4, L5, L6, L7, L8, L9, L10, L11, L12, F14, F4, F8, F10, F11, F15, I9, I10, I11 |
| 8 | P1, P2, P3, P4, P5, P6, P7, P8, P10 + tests de contrato/esquema + deps + CI gate |

---

## Secuencia recomendada y esfuerzo

```
Fase 0  (prep)          ──►  Fase 1 (desbloqueo mecánico)  ──►  Fase 2 (categorías)
                                                              └► Fase 3 (fechas)
Fase 0 ──► Fase 4 (esquema, con backup) ──► Fase 5 (features) ──► Fase 6 (seguridad)
                                                              └► Fase 7 (errores+lógica)
                                                              └► Fase 8 (PWA+proceso)
```

- **Fases 1–3 son las que devuelven la app a un estado usable** — si el tiempo es limitado, son la prioridad absoluta.
- **Fase 4 es la de mayor riesgo**: no empezarla sin backup (0.1) y sin el diff real (0.2).
- Fases 6, 7 y 8 pueden solaparse una vez cerradas 1–4.
- Sugiero **una rama y PR por fase** (o por sub-grupo en las fases L), para que revises cada una por separado y el historial quede legible.

**Estimación relativa** (proyecto personal, orientativa): Fase 1 ~S, Fase 2 ~M, Fase 3 ~L, Fase 4 ~L, Fase 5 ~M-L, Fase 6 ~L, Fase 7 ~L, Fase 8 ~L.

---

*Decisiones D-A/D-B/D-C confirmadas (ver arriba). Plan pendiente solo de la aprobación para empezar. No modificaré código hasta tu OK.*
