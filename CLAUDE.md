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
| IA | Google Gemini API (`gemini-1.5-flash`) | — |
| Estilos | Tailwind CSS | 4.x |
| PWA | next-pwa | 5.x |
| Procesamiento img | sharp | 0.34.x |

---

## Variables de entorno

Crear `.env.local` en la raíz del proyecto (nunca commitear):

```env
GEMINI_API_KEY=AIza...          # Obtener en https://aistudio.google.com/app/apikey
DATABASE_URL="file:./dev.db"   # Ruta relativa a la DB SQLite
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
  /day/[date]         → Vista de un día específico (YYYY-MM-DD)
  /history            → Historial y búsqueda
  /settings           → Configuración de metas
  /generated/prisma   → Cliente Prisma generado (no editar, ignorado por git)
  globals.css
  layout.tsx          → Layout base mobile-first (max-w 430px)
  page.tsx            → Pantalla principal (vista del día de hoy)

/lib
  prisma.ts           → Singleton del cliente Prisma (con adapter libsql)

/prisma
  schema.prisma       → Modelos: Meal, Goal
  migrations/         → Migraciones SQL
  dev.db              → Base de datos SQLite local (ignorada por git)

/public
  /uploads            → Imágenes de comidas subidas (ignoradas por git)
```

---

## Modelos de base de datos

### Meal
| Campo | Tipo | Descripción |
|---|---|---|
| id | Int | PK autoincrement |
| date | DateTime | Fecha de la comida |
| category | String | "desayuno" \| "almuerzo" \| "cena" \| "snack" |
| name | String | Nombre del alimento |
| imageUrl | String? | Ruta relativa a /public/uploads/ |
| weightG | Float | Peso en gramos |
| calories | Float | Calorías |
| protein | Float | Proteína en gramos |
| carbs | Float | Carbohidratos en gramos |
| fat | Float | Grasa en gramos |
| confidence | Float | Confianza de la IA (0-1) |
| createdAt | DateTime | Timestamp de creación |

### Goal
| Campo | Tipo | Descripción |
|---|---|---|
| id | Int | PK autoincrement |
| calories | Float | Meta de calorías diarias |
| protein | Float | Meta de proteína (g) |
| carbs | Float | Meta de carbohidratos (g) |
| fat | Float | Meta de grasa (g) |

---

## Notas de Prisma v7

Prisma v7 requiere un driver adapter explícito. Para SQLite se usa `@prisma/adapter-libsql` con `@libsql/client`. El singleton está en `lib/prisma.ts`. La URL de conexión se pasa directamente al adapter (no en `schema.prisma`).

---

## UX / Diseño

- Mobile-first, optimizado para iPhone 14 (390px → contenedor max 430px)
- `max-w-[430px]` centrado con `mx-auto` en el body
- Números de macros siempre redondeados a 1 decimal
- `date-fns` para manejo y formato de fechas
- Sin autenticación (app de uso personal)
- `-webkit-tap-highlight-color: transparent` para feel nativo en iOS

---

## Rutas de la app

| Ruta | Descripción |
|---|---|
| `/` | Pantalla del día (hoy por defecto) |
| `/day/[date]` | Vista de un día específico (YYYY-MM-DD) |
| `/history` | Historial con buscador |
| `/settings` | Configuración de metas |
| `/api/analyze` | POST — análisis de imagen con Gemini |
| `/api/meals` | GET / POST |
| `/api/meals/[id]` | PUT / DELETE |
| `/api/goals` | GET / PUT |

---

## API — Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/analyze` | Recibe `{ imageBase64, mimeType, weightG? }`, llama a Gemini 2.0 Flash vision, devuelve JSON de macros |
| GET | `/api/meals?date=YYYY-MM-DD` | Lista comidas del día |
| POST | `/api/meals` | Crea comida. Campos requeridos: `date, category, name, weightG, calories, protein, carbs, fat, confidence`. Opcional: `imageBase64, mimeType` — si se envía imagen, se redimensiona a 800px con sharp y se guarda en `/public/uploads/` |
| PUT | `/api/meals/[id]` | Edita campos parciales: `name, weightG, calories, protein, carbs, fat` |
| DELETE | `/api/meals/[id]` | Elimina comida y borra la imagen del disco |
| GET | `/api/goals` | Retorna metas (defaults: 2000 cal, 150g prot, 200g carbs, 65g fat) |
| PUT | `/api/goals` | Crea o actualiza las metas |
| GET | `/api/history` | Sin params: lista de días con totales. Con `?q=texto`: búsqueda de alimentos por nombre |

### Respuesta del endpoint /api/analyze

```json
{
  "nombre": "Pechuga de pollo a la plancha",
  "peso_estimado_g": 180,
  "peso_fue_estimado": true,
  "confianza": 0.85,
  "calorias": 297,
  "proteina_g": 55,
  "carbs_g": 0,
  "grasa_g": 6.5,
  "notas": "Parece cocida sin aceite."
}
```

### Modelo Gemini
Modelo: `gemini-2.0-flash` (la clave debe ser generada en https://aistudio.google.com/app/apikey para tener free tier habilitado).

---

## Estado del desarrollo

| Sprint | Estado | Descripción |
|---|---|---|
| Sprint 1 | ✅ Completo | Setup: Next.js, Tailwind, Prisma, SQLite, estructura de rutas |
| Sprint 2 | ✅ Completo | API completa (analyze, meals, goals, history) |
| Sprint 3 | ✅ Completo | Pantalla principal: header de fechas, cards de macros, lista por categoría, bottom nav |
| Sprint 4 | ✅ Completo | Flujo agregar comida: modo foto+IA y búsqueda manual con DB local (192 alimentos) |
| Sprint 5 | ✅ Completo | Historial con búsqueda de alimentos y detalle, pantalla de ajustes de metas |
| Sprint 6 | Pendiente | PWA + pulido final + deploy |
    Paso 1: Manifest y configuración PWA
Crear /public/manifest.json con display: "standalone", theme_color: "#10b981", íconos 192×192 y 512×512
Generar íconos PNG con fondo verde esmeralda y texto "M"
Agregar meta tags en app/layout.tsx: apple-mobile-web-app-capable, apple-mobile-web-app-status-bar-style, apple-mobile-web-app-title
Paso 2: Service Worker con next-pwa
Configurar next-pwa en next.config.ts con cache de assets estáticos
Verificar que next-pwa está instalado (ya está en el proyecto)
Configurar estrategia de cache: StaleWhileRevalidate para páginas, CacheFirst para assets
Paso 3: Pulido visual y UX
Transiciones suaves entre pasos del flujo "Agregar comida" (fade/slide)
Loading skeletons en la pantalla del día mientras carga la data
Manejo visual del error de Gemini API con mensaje claro y botón "Usar búsqueda manual"
Haptic feedback simulation en botones clave (CSS active states más pronunciados)
Paso 4: Optimizaciones finales
Asegurar que el botón "Agregar comida" tiene área de toque ≥ 44px en todos los flujos
Revisar contraste de colores para accesibilidad básica
Verificar que viewport tiene viewport-fit=cover para iPhone con notch
Paso 5: Actualizar CLAUDE.md
Marcar Sprint 6 como completado
Documentar instrucciones de instalación PWA en iPhone
