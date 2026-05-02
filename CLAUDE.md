@AGENTS.md

# Macro Tracker — Documentación técnica

App web personal (PWA) para trackear macros diarios subiendo fotos de comida. La IA analiza la imagen y estima los macros. Instalable desde Safari en iPhone.

---

## Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | 16.x |
| Base de datos | SQLite vía libsql | — |
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
GEMINI_API_KEY=AIza...                  # Obtener en https://aistudio.google.com/app/apikey
DATABASE_URL="file:./dev.db"            # Ruta relativa a la DB SQLite
BLOB_READ_WRITE_TOKEN=...               # Token de Vercel Blob (auto-inyectado en Vercel)
AUTH_SECRET="..."                       # Clave secreta de Auth.js — genera con: openssl rand -base64 32
RESEND_API_KEY="re_..."                 # API key de Resend para emails de recuperación de contraseña
RESEND_FROM_EMAIL="onboarding@resend.dev"  # Email remitente (cambiar por dominio propio en producción)
NEXT_PUBLIC_APP_URL="http://localhost:3000" # URL base de la app (cambiar en producción)
```

---

## Cómo correr localmente

```bash
npm install          # instala dependencias + genera Prisma client (via postinstall)
npx prisma migrate dev --name init   # solo la primera vez
npm run dev          # servidor en http://localhost:3000
```

---

## Estructura de carpetas

```
/app
  /api
    /analyze          → POST: análisis de imagen con Gemini
    /meals            → GET (listar), POST (crear)
    /meals/[id]       → PUT (editar), DELETE (eliminar)
    /goals            → GET, PUT
    /export           → GET: exportar historial como CSV
    /history          → GET: lista de días o búsqueda con ?q=texto
  /day/[date]
    page.tsx          → Vista de un día específico (Server Component)
    loading.tsx       → Skeleton de carga del día
    /add/page.tsx     → Flujo multi-paso de agregar comida
  /history            → Historial con buscador
  /settings           → Configuración de metas
  /components
    BottomNav.tsx
    DayHeader.tsx
    MacroSummary.tsx
    MealList.tsx
    AddMealButton.tsx
    EditMealSheet.tsx → Bottom sheet para editar comida/ingredientes
    Toast.tsx         → Notificaciones con acción de deshacer
    ServiceWorkerRegistration.tsx
    /add
      StepMode.tsx    → Selección de modo (foto / búsqueda)
      StepCamera.tsx  → Captura de foto + análisis IA
      StepSearch.tsx  → Búsqueda manual en base de datos local
      StepConfirm.tsx → Confirmación y edición de macros antes de guardar
  /generated/prisma   → Cliente Prisma generado (no editar, ignorado por git)
  globals.css
  layout.tsx          → Layout base mobile-first (max-w 430px), PWA meta tags
  page.tsx            → Redirect a /day/[hoy]

/lib
  prisma.ts           → Singleton del cliente Prisma (con adapter libsql)
  foods.ts            → Base de datos de 192 alimentos USDA con searchFoods() y calcMacros()

/prisma
  schema.prisma       → Modelos: Meal, Goal
  prisma.config.ts    → Config de Prisma v7 con datasource URL
  migrations/         → Migraciones SQL
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
| `middleware.ts` | Protege todas las rutas; redirige a `/auth?callbackUrl=...` si no hay sesión |
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

Cada usuario solo ve y modifica sus propias comidas y metas. Todas las rutas API y Server Components llaman a `auth()` y filtran por `userId`. El middleware redirige cualquier ruta no pública al login si no hay sesión.

### Nota de producción

SQLite no soporta escrituras concurrentes de múltiples usuarios. Para escalar a más de un usuario simultáneo, migrar a **Turso (libSQL cloud)** o **PostgreSQL**.

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
| imageUrl | String? | URL de Vercel Blob |
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

## Notas de Prisma v7

Prisma v7 requiere un driver adapter explícito. Para SQLite se usa `@prisma/adapter-libsql` con `@libsql/client`. El singleton está en `lib/prisma.ts`. La URL de conexión se pasa directamente al adapter (no en `schema.prisma`), configurada en `prisma/prisma.config.ts`.

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
| `/settings` | Configuración de metas y cuenta |
| `/api/analyze` | POST — análisis de imagen con Gemini |
| `/api/meals` | GET / POST |
| `/api/meals/[id]` | PUT / DELETE |
| `/api/goals` | GET / PUT |
| `/api/history` | GET (días) / GET?q= (búsqueda) |
| `/api/export` | GET — exportar CSV con ?from=YYYY-MM-DD&to=YYYY-MM-DD |

---

## API — Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/analyze` | Recibe `{ imageBase64, mimeType }`, llama a Gemini 2.0 Flash, devuelve JSON con `nombre_plato` e `items[]` |
| GET | `/api/meals?date=YYYY-MM-DD` | Lista comidas del día (consulta por `dateLocal` con fallback a `date`) |
| POST | `/api/meals` | Crea comida. Soporta `dateLocal`, `items` (JSON), e imagen via Vercel Blob |
| PUT | `/api/meals/[id]` | Edita campos: `name, category, weightG, calories, protein, carbs, fat, items` |
| DELETE | `/api/meals/[id]` | Elimina comida y borra imagen de Vercel Blob |
| GET | `/api/goals` | Retorna metas (defaults: 2000 cal, 150g prot, 200g carbs, 65g fat) |
| PUT | `/api/goals` | Crea o actualiza las metas |
| GET | `/api/history` | Sin params: días con totales. Con `?q=texto`: busca en nombres de comidas |
| GET | `/api/export` | CSV de todas las comidas. Acepta `?from=YYYY-MM-DD&to=YYYY-MM-DD` |

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
| Sprint Auth-2 | ✅ Completo | Auth.js v5 config, registro, login, middleware de protección, SessionProvider |
| Sprint Auth-3 | ✅ Completo | Página /auth (Server Component), AuthForm con tabs Login/Registro, indicador de fortaleza, validación, callbackUrl |
| Sprint Auth-4 | ✅ Completo | Recuperación de contraseña: forgot-password + reset-password, emails vía Resend, tokens seguros |
| Sprint Auth-5 | ✅ Completo | Sección "Mi cuenta" en Ajustes: email del usuario, botón de logout con modal de confirmación, documentación auth en CLAUDE.md |
