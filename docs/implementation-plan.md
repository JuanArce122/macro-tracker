# Implementation Plan — Roadmap HU-01 a HU-12

> Plan de implementación priorizado por dependencias técnicas.
> Basado en `docs/gap-analysis.md`.
> Aprobado por el product owner el 2026-05-22.

---

## Decisiones de producto registradas

| ID | Decisión | Resolución |
|---|---|---|
| D1 | Fuente de micros para HU-07 | ✅ **USDA FoodData Central API** (gratuita, requiere API key) |
| D2 | Plataforma para HU-08 | ✅ **OAuth web only** (Fitbit, Garmin, Oura) — sin Capacitor |
| D3 | Cuota Gemini HU-01 | ⏸️ **Free/Premium** — diferido a sprint de Billing (no existe infra de cobros aún) |
| D4 | Comunidad HU-04 | ✅ **Usuarios propios votando** — modelo `FoodVote` |
| D5 | Países HU-12 | ✅ **CO primero, luego LAC** (MX, AR, PE, CL, etc.) |
| D6 | Dialectos HU-02 | ✅ **es-CO únicamente** |
| D7 | Umbrales TCA HU-11 | ✅ Recomendación: >12 registros/día, >5 ediciones/día, racha de 14+ días de tracking con goal cumplido al 100% exacto |

---

## 1. Orden de ejecución

El orden sigue el grafo de dependencias del gap analysis. Cada historia indica qué desbloquea.

```
Sprint 0:  Cimientos                        → desbloquea TODO
Sprint 1:  HU-12 (CO) + HU-10               → desbloquea HU-04 (regiones), GDPR
Sprint 2:  HU-04 (BD dos capas + votos)     → desbloquea HU-06, HU-07
Sprint 3:  HU-01 (visual) + HU-03 (barcode) → mejora UX core
Sprint 4:  HU-05 (targets adaptativos)      → desbloquea HU-09
Sprint 5:  HU-09 (coaching contextual)      → MVP de retención
Sprint 6:  HU-02 (voz es-CO)                → MVP voz
Sprint 7:  HU-11 (modo hábitos)             → diferenciador ético
Sprint 8:  HU-07 (micronutrientes)          → diferenciador vs MyFitnessPal
Sprint 9-10: HU-08 (wearables OAuth)        → diferenciador vs Cronometer
Sprint 11-12: HU-06 (meal planning)         → diferenciador vs Fitia
Sprint 13+ (futuro): Billing + cuotas HU-01 → monetización
```

---

## 2. Sprint 0 — Cimientos (1 semana)

🏗️ **CIMIENTO** · No es una historia, pero es prerequisito de todas.

### Objetivo
Habilitar TDD, validación tipada y enums seguros antes de tocar producto.

### Tareas

1. **Instalar Vitest + Testing Library**
   ```
   npm i -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
   ```
2. **Instalar Playwright** para E2E
   ```
   npm i -D @playwright/test
   npx playwright install
   ```
3. **Configurar `vitest.config.ts` y `playwright.config.ts`**
4. **GitHub Actions** workflow `.github/workflows/ci.yml`:
   - Lint
   - Vitest unit
   - Playwright E2E (smoke)
   - Prisma generate (no migrate en CI)
5. **Instalar Zod** para validación de API routes
   ```
   npm i zod
   ```
6. **Refactor de validación** en 3 endpoints clave:
   - `app/api/meals/route.ts`
   - `app/api/foods/route.ts`
   - `app/api/profile/route.ts`
7. **Crear `lib/schemas/`** con schemas Zod compartidos
8. **Smoke tests E2E:** auth, day page render, agregar comida básica

### Definition of Done
- [ ] `npm test` corre en local y CI sin errores
- [ ] 3+ E2E tests pasan
- [ ] Zod valida los 3 endpoints clave
- [ ] PR documentado en `/docs/testing.md`

**Esfuerzo:** 5 días-persona · **Riesgo:** Bajo

---

## 3. Estrategia de branching y PRs

### Naming convention
| Tipo | Patrón | Ejemplo |
|---|---|---|
| Feature | `feat/HU-XX-slug` | `feat/HU-04-verified-badges` |
| Fix | `fix/HU-XX-slug` | `fix/HU-01-confidence-overflow` |
| Tests | `test/HU-XX-slug` | `test/HU-12-region-priority` |
| Chore | `chore/slug` | `chore/setup-vitest` |
| Migración | `db/HU-XX-slug` | `db/HU-04-foodvote-table` |

### Tamaño máximo de PR
- **400 líneas net (+/−), máx 8 archivos**
- Historias grandes se parten en sub-PRs:
  1. Migración + endpoints (sin UI)
  2. UI sin tests
  3. Tests
  4. Wiring final

### Feature flags
Variables de entorno para historias grandes (HU-06, HU-07, HU-08, HU-09):
```
NEXT_PUBLIC_FEATURE_COACHING=false
NEXT_PUBLIC_FEATURE_MICROS=false
NEXT_PUBLIC_FEATURE_WEARABLES=false
NEXT_PUBLIC_FEATURE_MEAL_PLANNING=false
```

---

## 4. Cronograma sugerido (1 dev full-time, sprints de 2 semanas)

| Sprint | Semanas | Historias | Etiqueta | DoD principal |
|---|---|---|---|---|
| 0 | 1 | Cimientos | 🏗️ | CI verde con tests |
| 1 | 2-3 | HU-12 + HU-10 | ⚡⚡ | CO support + JSON/PDF export |
| 2 | 4-5 | HU-04 | 🏗️ | Badges + votos en producción |
| 3 | 6-7 | HU-01 + HU-03 | ⚡⚡ | Barcode + foto completa |
| 4 | 8-9 | HU-05 | 🏗️ | WeightEntry + 3 modos |
| 5 | 10-11 | HU-09 | 🏗️ | Cron + insights semanales |
| 6 | 12-13 | HU-02 | ⚡ | Voz es-CO funcional |
| 7 | 14-15 | HU-11 | ⚡ | Modo hábitos toggle |
| 8 | 16-17 | HU-07 | 🏗️ | 15 micros + RDA + UI |
| 9-10 | 18-21 | HU-08 | 🏗️ | 3 OAuth integraciones |
| 11-12 | 22-25 | HU-06 | 🏗️ | Plan semanal + lista compras |

**Total: ~25 semanas (~6 meses) con un dev full-time.**

---

## 5. Quick Wins vs Cimientos

| Historia | Etiqueta | Sprint | Razón |
|---|---|---|---|
| HU-12 | ⚡ Quick Win | 1 | M effort, alto valor para CO/LAC |
| HU-10 | ⚡ Quick Win | 1 | 60% hecho |
| HU-04 | 🏗️ Cimiento | 2 | Desbloquea HU-06, HU-07 |
| HU-01 | ⚡ Quick Win | 3 | 70% hecho |
| HU-03 | ⚡ Quick Win | 3 | OFF ya integrado |
| HU-05 | 🏗️ Cimiento | 4 | Desbloquea HU-09 |
| HU-09 | 🏗️ Cimiento | 5 | Alto valor retención |
| HU-02 | ⚡ Quick Win | 6 | Web Speech plug-and-play |
| HU-11 | ⚡ Quick Win | 7 | Toggle simple |
| HU-07 | 🏗️ Cimiento | 8 | Edge competitivo |
| HU-08 | 🏗️ Cimiento | 9-10 | Edge competitivo |
| HU-06 | 🏗️ Cimiento | 11-12 | Feature killer |

---

## 6. Riesgos macro

| # | Riesgo | Mitigación |
|---|---|---|
| RM1 | Costo Gemini escala con uso | Implementar cuotas cuando se monte Billing (D3 diferida); cache de respuestas |
| RM2 | Deuda técnica sin tests | Sprint 0 obligatorio; cada PR de feature obliga test |
| RM3 | HU-08 OAuth Garmin requiere paperwork | Empezar por Fitbit/Oura; Garmin al final |
| RM4 | HU-07 sin USDA API key bloquea | Obtener API key en Sprint 7 (anticipado) |
| RM5 | HU-06 puede convertirse en re-write | Limitar 4 semanas; si excede → cortar scope |
| RM6 | Migraciones Turso producción | Toda migración con default safe; scripts de rollback; `turso db shell` test antes deploy |
| RM7 | Vercel timeout 10s | Para HU-06/HU-09 pesados → background jobs |
| RM8 | Fatiga del PO revisando 12+ PRs | Sprint review session 30 min cada 2 semanas |
| RM9 | Sin sistema de cobros para HU-01 cuotas | Sprint de Billing antes de cerrar HU-01 (post Sprint 12) |

---

## 7. Sprint 13+ (futuro) — Billing & cuotas HU-01

**No incluido en los 12 sprints anteriores.** Decisión D3 pospone esto hasta tener:

- Stripe o Paddle integrado
- Modelo `Subscription` (userId, tier, status, currentPeriodEnd)
- Modelo `UsageEvent` (userId, eventType, count, period)
- Webhook handlers
- UI de upgrade en `/settings/billing`

Una vez exista la infraestructura de cobros:
- Implementar cuota Gemini (5 fotos/día free, ilimitado premium)
- Implementar cuota OCR etiquetas (HU-03)
- Implementar cuota voz (HU-02)

**Esfuerzo estimado:** 2-3 semanas-persona (Stripe + UI + flujos)

---

## 8. Archivos por historia

Cada historia tiene su archivo detallado en `docs/stories/HU-XX.md` con:
- Objetivo en una línea
- Archivos a crear/modificar (rutas exactas)
- Modelo de datos y migraciones (SQL exacto)
- Endpoints con contratos (request/response)
- Componentes UI (jerarquía)
- Tests TDD intercalados
- Criterios de aceptación → tests verificables
- Definition of Done checkable
- Esfuerzo en días-persona
- Riesgos específicos

**Listado:**
- [docs/stories/HU-01.md](./stories/HU-01.md) — Foto IA (completar)
- [docs/stories/HU-02.md](./stories/HU-02.md) — Voz es-CO
- [docs/stories/HU-03.md](./stories/HU-03.md) — Barcode + OCR
- [docs/stories/HU-04.md](./stories/HU-04.md) — BD dos capas + votos
- [docs/stories/HU-05.md](./stories/HU-05.md) — Targets adaptativos
- [docs/stories/HU-06.md](./stories/HU-06.md) — Meal planning
- [docs/stories/HU-07.md](./stories/HU-07.md) — Micronutrientes
- [docs/stories/HU-08.md](./stories/HU-08.md) — Wearables OAuth
- [docs/stories/HU-09.md](./stories/HU-09.md) — Coaching contextual
- [docs/stories/HU-10.md](./stories/HU-10.md) — Export JSON/PDF/GDPR
- [docs/stories/HU-11.md](./stories/HU-11.md) — Modo hábitos
- [docs/stories/HU-12.md](./stories/HU-12.md) — Soporte regional CO

---

## 9. Cómo proceder con cada sprint

1. **Crear branch** siguiendo naming convention
2. **Abrir el archivo `HU-XX.md`** correspondiente
3. **Implementar en el orden indicado**: migración → endpoints → UI → tests → wiring
4. **PR único** o sub-PRs según tamaño
5. **Tests obligatorios** antes de merge
6. **Sprint review** al cierre de cada sprint

---

## 10. Métricas de éxito por sprint

| Sprint | KPI técnico | KPI producto |
|---|---|---|
| 0 | Coverage ≥ 30% para módulos críticos | — |
| 1 | 100% rutas exports funcionan | Users CO tienen alimentos regionales priorizados |
| 2 | Outliers detectados < 5% falsos positivos | Badges visibles, votos funcionan |
| 3 | Barcode lookup < 2s p95 | Tiempo de registro de producto -50% |
| 4 | Algoritmo tendencia con MAPE < 10% | 30% usuarios prueban modo Sugerido |
| 5 | Insights generados sin spam (≤2/sem) | CTR insights > 25% |
| 6 | Voz parsing precision > 80% | Adopción voz > 15% de registros |
| 7 | TCA detection sin falsos positivos en QA | — |
| 8 | 15 micros cargados desde USDA FDC | — |
| 9-10 | 3 OAuth funcionan en producción | 10% usuarios conectan wearable |
| 11-12 | Plan generado en < 5s | 20% usuarios prueban meal planning |
