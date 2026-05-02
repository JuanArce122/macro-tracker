@AGENTS.md

# Macro Tracker — Documentación técnica

App web personal (PWA) para trackear macros diarios subiendo fotos de comida. La IA analiza la imagen y estima los macros. Instalable desde Safari en iPhone.

---

## Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | 16.x |
| Base de datos local | SQLite vía libsql (`file:./dev.db`) | — |
| Base de datos producción | **Turso** (libSQL cloud) | — |
| ORM | Prisma | 7.x |
| IA | Google Gemini API (`gemini-2.0-flash`) | — |
| Estilos | Tailwind CSS | 4.x |
| Almacenamiento imágenes | Vercel Blob | — |
| Procesamiento img | sharp | 0.34.x |
| Autenticación | Auth.js v5 (next-auth@beta) | 5.x |
| Hashing contraseñas | bcryptjs | — |
| Email transaccional | Resend | — |

---

## Variables de entorno

Crear `.env.local` en la raíz del proyecto (nunca commitear):

```env
GEMINI_API_KEY=AIza...                       # Obtener en https://aistudio.google.com/app/apikey
DATABASE_URL="file:./dev.db"                 # Local: SQLite. Producción: libsql://xxx.turso.io
DATABASE_AUTH_TOKEN="..."                    # Solo en producción con Turso (dejar vacío en local)
BLOB_READ_WRITE_TOKEN=...                    # Token de Vercel Blob (auto-inyectado en Vercel)
AUTH_SECRET="..."                            # Clave secreta de Auth.js — genera con: openssl rand -base64 32
RESEND_API_KEY="re_..."                      # API key de Resend para emails de recuperación de contraseña
RESEND_FROM_EMAIL="onboarding@resend.dev"   # Email remitente (cambiar por dominio propio en producción)
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # URL base de la app (cambiar en producción)
```

---

## Cómo correr localmente

```bash
npm install                              # instala dependencias + genera Prisma client (via postinstall)
npx prisma migrate dev --name init       # solo la primera vez
npx tsx scripts/seed-foods.ts            # opcional: poblar DB con 125 alimentos USDA
npm run dev                              # servidor en http://localhost:3000
```

---

## Producción (Turso + Vercel)

La base de datos en producción es **Turso** (libSQL cloud). Las migraciones **no** se aplican con `prisma migrate deploy` (no soporta URLs libsql directamente); se aplican manualmente:

```bash
turso db shell macro-tracker < prisma/migrations/<nombre>/migration.sql
```

Si el SQL de la migración usa `PRAGMA` (SQLite-specific), reescribir manualmente como `ALTER TABLE ADD COLUMN` para Turso.

---

## Estructura de carpetas

```
/app
  /api
    /analyze          → POST: análisis de imagen con Gemini
    /meals            → GET (listar por fecha), POST (crear)
    /meals/[id]       → PUT (editar), DELETE (eliminar)
    /goals            → GET, PUT
    /export           → GET: exportar historial como CSV
    /history          → GET: lista de días o búsqueda con ?q=texto
    /foods            → GET: buscar alimentos (DB + Open Food Facts), POST: crear alimento propio
    /foods/[id]       → DELETE: eliminar alimento propio del usuario
    /foods/[id]/use   → POST: registrar uso de alimento (actualiza usageCount + lastUsedAt)
    /foods/user       → GET: alimentos propios del usuario + últimos 5 recientes
  /auth               → Login/Registro, Forgot Password, Reset Password
  /day/[date]
    page.tsx          → Vista de un día específico (Server Component)
    loading.tsx       → Skeleton de carga del día
    /add/page.tsx     → Flujo multi-paso de agregar comida
  /history            → Historial con buscador
  /hooks
    useFoodSearch.ts  → Hook: búsqueda debounced (300ms) en /api/foods con fallback offline
  /settings           → Configuración de metas y cuenta (gestión de alimentos propios)
  /components
    BottomNav.tsx
    DayHeader.tsx
    MacroSummary.tsx  → Cards de calorías + barras de macros (fillColor como prop estático)
    MealList.tsx
    AddMealButton.tsx
    EditMealSheet.tsx → Bottom sheet para editar comida/ingredientes (con buscador de alimentos)
    Toast.tsx         → Notificaciones con acción de deshacer
    ServiceWorkerRegistration.tsx
    /add
      StepMode.tsx    → Selección de modo (foto / búsqueda)
      StepCamera.tsx  → Captura de foto + análisis IA
      StepSearch.tsx  → Búsqueda en DB (USDA + usuario + OFF); recientes desde API
      StepConfirm.tsx → Confirmación/edición de macros antes de guardar (buscador por ingrediente)
  /generated/prisma   → Cliente Prisma generado (no editar, ignorado por git)
  globals.css
  layout.tsx          → Layout base mobile-first (max-w 430px), PWA meta tags
  page.tsx            → Redirect a /day/[hoy]

/lib
  prisma.ts           → Singleton del cliente Prisma (con adapter libsql)
  foods.ts            → 125 alimentos USDA en memoria; searchFoods() y calcMacros()

/scripts
  seed-foods.ts       → Siembra los 125 alimentos USDA en la DB (prisma.food.createMany)

/prisma
  schema.prisma       → Modelos: User, Meal, Goal, PasswordResetToken, Food
  prisma.config.ts    → Config de Prisma v7 con datasource URL
  migrations/
    20260502155850_add_auth/        → Agrega User, PasswordResetToken, userId a Meal y Goal
    20260502192107_add_food_table/  → Crea tabla Food (USDA + source + userId + gramsPerUnit)
    20260502192941_add_food_usage/  → Agrega usageCount e lastUsedAt a Food
  dev.db              → Base de datos SQLite local (ignorada por git)

/public
  manifest.json       → PWA manifest (display: standalone, theme: emerald)
  sw.js               → Service worker custom (stale-while-revalidate para API, cache-first para assets)
  /icons
    icon-192x192.png
    icon-512x512.png
```

---

## Autenticación

Implementada con **Auth.js v5** (Credentials provider) + **JWT strategy** (stateless, sin DB de sesiones).

> ⚠️ **`middleware.ts` fue eliminado.** Auth.js v5 usa módulos Node.js (node:crypto, node:fs, etc.) incompatibles con el Vercel Edge Runtime. La protección de rutas se hace a nivel de Server Component y API route mediante `auth()` de `@/auth`.

### Flujo

- **Registro**: `POST /api/auth/register` — crea usuario con contraseña hasheada (bcrypt, 12 rondas)
- **Login**: `POST /api/auth/signin` (manejado por Auth.js) — verifica credenciales, emite JWT
- **Sesión**: JWT almacenado en cookie httpOnly. Persiste hasta logout manual o limpieza de cookies
- **Logout**: `signOut()` de next-auth/react — invalida la cookie y redirige a `/auth`
- **Recuperación de contraseña**: token aleatorio (32 bytes) enviado por email vía Resend, expira en 15 min, de un solo uso

### Archivos clave

| Archivo | Descripción |
|---|---|
| `auth.ts` | Config central de Auth.js (provider, callbacks JWT, páginas personalizadas) |
| `types/next-auth.d.ts` | Extiende el tipo `Session` para incluir `user.id` |
| `app/auth/page.tsx` | Página de login/registro (Server Component) |
| `app/auth/AuthForm.tsx` | Formulario con tabs Login/Registro, validación, indicador de fortaleza |
| `app/auth/forgot-password/` | Flujo de solicitud de recuperación de contraseña |
| `app/auth/reset-password/` | Flujo de nueva contraseña (valida token en el servidor) |
| `app/api/auth/register/route.ts` | Endpoint de registro |
| `app/api/auth/forgot-password/route.ts` | Genera y envía token de recuperación |
| `app/api/auth/reset-password/route.ts` | Valida token y actualiza contraseña (transacción atómica) |
| `lib/email.ts` | Módulo de envío de emails con Resend |
| `app/components/SessionProvider.tsx` | Wrapper client-side de next-auth/react SessionProvider |

### Rutas de autenticación

| Ruta | Descripción |
|---|---|
| `/auth` | Login y registro (tabs) |
| `/auth/forgot-password` | Solicitar enlace de recuperación |
| `/auth/reset-password?token=...` | Formulario para nueva contraseña |
| `/api/auth/[...nextauth]` | Handler de Auth.js (sign-in, sign-out, session) |
| `/api/auth/register` | POST — crear cuenta |
| `/api/auth/forgot-password` | POST — enviar email de recuperación |
| `/api/auth/reset-password` | POST — cambiar contraseña con token |

### Aislamiento de datos

Cada usuario solo ve y modifica sus propias comidas y metas. Todas las rutas API y Server Components llaman a `auth()` y filtran por `userId`.

---

## Modelos de base de datos

### User
| Campo | Tipo | Descripción |
|---|---|---|
| id | Int | PK autoincrement |
| email | String | Único, usado para login |
| passwordHash | String | Hash bcrypt (12 rondas) |
| createdAt | DateTime | Timestamp de creación |

### PasswordResetToken
| Campo | Tipo | Descripción |
|---|---|---|
| id | Int | PK autoincrement |
| userId | Int | FK a User |
| token | String | 32 bytes aleatorios en hex (único) |
| expiresAt | DateTime | 15 minutos tras creación |
| createdAt | DateTime | Timestamp de creación |

### Meal
| Campo | Tipo | Descripción |
|---|---|---|
| id | Int | PK autoincrement |
| userId | Int | FK a User (aislamiento multi-usuario) |
| date | DateTime | Fecha UTC de la comida |
| dateLocal | String? | Fecha local YYYY-MM-DD (timezone-safe, indexada) |
| category | String | "desayuno" \| "almuerzo" \| "cena" \| "snack" |
| name | String | Nombre del alimento o plato |
| imageUrl | String? | URL de Vercel Blob (puede ser null si el upload falló) |
| weightG | Float | Peso total en gramos |
| calories | Float | Calorías |
| protein | Float | Proteína en gramos |
| carbs | Float | Carbohidratos en gramos |
| fat | Float | Grasa en gramos |
| confidence | Float | Confianza de la IA (0-1) |
| items | String? | JSON con desglose por ingredientes (MealItem[]) |
| createdAt | DateTime | Timestamp de creación |

### Goal
| Campo | Tipo | Descripción |
|---|---|---|
| id | Int | PK autoincrement |
| userId | Int | FK a User (un Goal por usuario) |
| calories | Float | Meta de calorías diarias |
| protein | Float | Meta de proteína (g) |
| carbs | Float | Meta de carbohidratos (g) |
| fat | Float | Meta de grasa (g) |

### Food
| Campo | Tipo | Descripción |
|---|---|---|
| id | Int | PK autoincrement |
| nombre | String | Nombre del alimento |
| categoria | String | Categoría nutricional |
| cal | Float | Calorías por 100g (o por `gramsPerUnit` si aplica) |
| p | Float | Proteína por 100g |
| c | Float | Carbohidratos por 100g |
| f | Float | Grasa por 100g |
| gramsPerUnit | Float? | Gramos por unidad (ej: 60g para 1 huevo) |
| unitLabel | String? | Etiqueta de la unidad (ej: "huevo", "rebanada") |
| source | String | `"usda"` \| `"openfoodfacts"` \| `"user"` |
| userId | Int? | null = alimento global; non-null = alimento propio del usuario |
| usageCount | Int | Contador de veces usado (default 0) |
| lastUsedAt | DateTime? | Última vez usado (para sección "Recientes") |

### Tipo MealItem (serializado en `items` como JSON)
```typescript
type MealItem = {
  nombre: string;
  unidades: number;
  pesoG: number;
  calorias: number;
  proteina: number;
  carbs: number;
  grasa: number;
  confianza: number;
}
```

---

## Base de datos de alimentos (Food)

### Fuentes de datos (`source`)

| Valor | Descripción |
|---|---|
| `"usda"` | 125 alimentos sembrados desde datos USDA (`scripts/seed-foods.ts`) |
| `"openfoodfacts"` | Resultados cacheados de la API de Open Food Facts (se cachean en la primera búsqueda) |
| `"user"` | Alimentos creados por el usuario desde /settings |

### Búsqueda en `/api/foods?q=`

1. Busca en DB local (USDA + propios del usuario + cache OFF) con `contains` sobre `nombre`
2. Si hay menos de 5 resultados locales, llama a Open Food Facts API (timeout 5s) y cachea los nuevos resultados en DB
3. Devuelve `{ foods: DBFood[] }`

### Hook `useFoodSearch`

`app/hooks/useFoodSearch.ts` — debounce 300ms, llama a `/api/foods?q=`, fallback offline a `searchFoods()` de `lib/foods.ts`.

```typescript
export type FoodWithSource = Food & { source: string };
const { results, loading } = useFoodSearch(query);
```

### Alimentos propios del usuario

- Se crean desde `/settings` → POST `/api/foods` (requiere auth, guarda con `source: "user"`, `userId`)
- Se eliminan con DELETE `/api/foods/[id]` (solo el dueño puede eliminar)
- Se listan con GET `/api/foods/user` → `{ myFoods, recentFoods }`
- Cada vez que se selecciona un alimento (búsqueda o confirmación), se llama POST `/api/foods/[id]/use` para actualizar `usageCount` y `lastUsedAt`
- `recentFoods` = últimos 5 alimentos usados (cualquier source) ordenados por `lastUsedAt DESC`

---

## Notas de Prisma v7

Prisma v7 requiere un driver adapter explícito. Para SQLite/Turso se usa `@prisma/adapter-libsql` con `@libsql/client`. El singleton está en `lib/prisma.ts`. La URL de conexión se pasa directamente al adapter (no en `schema.prisma`), configurada en `prisma/prisma.config.ts`.

```typescript
// lib/prisma.ts
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,  // undefined en local, string en Turso
});
```

---

## UX / Diseño

- Mobile-first, optimizado para iPhone 14 (390px → contenedor max 430px)
- `max-w-[430px]` centrado con `mx-auto` en el body
- Números de macros siempre redondeados a 1 decimal
- `date-fns` para manejo y formato de fechas (locale `es`)
- Autenticación multi-usuario con email y contraseña
- `-webkit-tap-highlight-color: transparent` para feel nativo en iOS
- Dark mode automático basado en `prefers-color-scheme`
- `viewport-fit=cover` para soporte de notch en iPhone
- Toast animado (`toast-slide-up`) para feedback de acciones
- **Tailwind**: nunca construir clases dinámicamente (ej: `"bg-" + color`). Tailwind purga clases no literales en el build. Siempre pasar clases completas como props o strings estáticos.

---

## Rutas de la app

| Ruta | Descripción |
|---|---|
| `/` | Redirect al día de hoy |
| `/auth` | Login y registro |
| `/auth/forgot-password` | Recuperación de contraseña |
| `/auth/reset-password` | Nueva contraseña (con token) |
| `/day/[date]` | Vista de un día específico (YYYY-MM-DD) |
| `/day/[date]/add` | Flujo de agregar comida |
| `/history` | Historial con buscador |
| `/settings` | Configuración de metas, cuenta y alimentos propios |

---

## API — Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/analyze` | Recibe `{ imageBase64, mimeType }`, llama a Gemini 2.0 Flash, devuelve JSON con `nombre_plato` e `items[]` |
| GET | `/api/meals?date=YYYY-MM-DD` | Lista comidas del día (consulta por `dateLocal` con fallback a `date`) |
| POST | `/api/meals` | Crea comida. Soporta `dateLocal`, `items` (JSON), imagen via Vercel Blob (no-fatal si falla) |
| PUT | `/api/meals/[id]` | Edita campos: `name, category, weightG, calories, protein, carbs, fat, items` |
| DELETE | `/api/meals/[id]` | Elimina comida y borra imagen de Vercel Blob |
| GET | `/api/goals` | Retorna metas (defaults: 2000 cal, 150g prot, 200g carbs, 65g fat) |
| PUT | `/api/goals` | Crea o actualiza las metas |
| GET | `/api/history` | Sin params: días con totales. Con `?q=texto`: busca en nombres de comidas |
| GET | `/api/export` | CSV de todas las comidas. Acepta `?from=YYYY-MM-DD&to=YYYY-MM-DD` |
| GET | `/api/foods?q=texto` | Busca alimentos en DB + Open Food Facts. Devuelve `{ foods: DBFood[] }` |
| POST | `/api/foods` | Crea alimento propio `{ nombre, cal, p, c, f }`. Requiere auth |
| DELETE | `/api/foods/[id]` | Elimina alimento propio (solo el dueño) |
| POST | `/api/foods/[id]/use` | Registra uso: incrementa `usageCount`, actualiza `lastUsedAt` |
| GET | `/api/foods/user` | Devuelve `{ myFoods, recentFoods }` del usuario autenticado |

### Respuesta del endpoint /api/analyze (multi-item)

```json
{
  "nombre_plato": "Almuerzo completo",
  "items": [
    {
      "nombre": "Pechuga de pollo a la plancha",
      "unidades": 1,
      "peso_g": 180,
      "calorias": 297,
      "proteina_g": 55,
      "carbs_g": 0,
      "grasa_g": 6.5,
      "confianza": 0.85
    }
  ]
}
```

### Modelo Gemini
Modelo: `gemini-2.0-flash`. La clave **debe** generarse en https://aistudio.google.com/app/apikey (no en Google Cloud Console) para tener el free tier habilitado.

---

## PWA — Instalación en iPhone

1. Abre la app en **Safari**
2. Toca el botón **Compartir** (caja con flecha ↑)
3. Selecciona **"Agregar a pantalla de inicio"**
4. Confirma tocando **"Agregar"**

La app se ejecuta en modo standalone (sin barra de Safari), con tema verde esmeralda. Los assets estáticos y las respuestas de API están cacheados por el service worker (`/public/sw.js`) para funcionamiento offline parcial.

---

## Estado del desarrollo

| Sprint | Estado | Descripción |
|---|---|---|
| Sprint 1 | ✅ Completo | Setup: Next.js, Tailwind, Prisma, SQLite, estructura de rutas |
| Sprint 2 | ✅ Completo | API completa (analyze, meals, goals, history) |
| Sprint 3 | ✅ Completo | Pantalla principal: header de fechas, cards de macros, lista por categoría, bottom nav |
| Sprint 4 | ✅ Completo | Flujo agregar comida: modo foto+IA y búsqueda manual con DB local (192 alimentos) |
| Sprint 5 | ✅ Completo | Historial con búsqueda de alimentos y detalle, pantalla de ajustes de metas |
| Sprint 6 | ✅ Completo | PWA (manifest, SW, íconos), dark mode, Vercel Blob, desglose por ingredientes, EditMealSheet, Toast+undo, EXIF fix, CSV export, dateLocal, viewport-fit=cover, loading skeleton, fallback búsqueda manual en error Gemini |
| Sprint Auth-1 | ✅ Completo | Schema multi-usuario (User, PasswordResetToken, userId en Meal y Goal), migración de DB |
| Sprint Auth-2 | ✅ Completo | Auth.js v5 config, registro, login, SessionProvider. Middleware eliminado (incompatible con Vercel Edge Runtime) |
| Sprint Auth-3 | ✅ Completo | Página /auth (Server Component), AuthForm con tabs Login/Registro, indicador de fortaleza, validación, callbackUrl |
| Sprint Auth-4 | ✅ Completo | Recuperación de contraseña: forgot-password + reset-password, emails vía Resend, tokens seguros |
| Sprint Auth-5 | ✅ Completo | Sección "Mi cuenta" en Ajustes: email del usuario, botón de logout con modal de confirmación |
| Sprint E-1 | ✅ Completo | Edición de ingredientes en StepConfirm: buscador con dropdown que recalcula macros al seleccionar alimento de la DB |
| Sprint E-2 | ✅ Completo | Misma funcionalidad de edición de ingredientes en EditMealSheet (post-guardado) |
| Sprint DB-1 | ✅ Completo | Modelo Food en Prisma, migración, seed de 125 alimentos USDA, endpoint GET /api/foods?q=, hook useFoodSearch con debounce y fallback offline |
| Sprint DB-2 | ✅ Completo | Integración Open Food Facts API: cacheo de resultados en DB, badge "OFF" en UI |
| Sprint DB-3 | ✅ Completo | Alimentos propios migrados de localStorage a DB; tracking de uso (usageCount + lastUsedAt) para sección "Recientes"; endpoints POST/DELETE /api/foods, POST /api/foods/[id]/use, GET /api/foods/user |
