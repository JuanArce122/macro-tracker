@AGENTS.md

# Macro Tracker — Project Context

PWA personal mobile-first (iPhone) para trackear macros con foto + IA. La app está en rediseño hacia una estética editorial premium (light-first, serif/sans dual, paleta tierra). La arquitectura técnica detallada vive en [`docs/architecture.md`](./docs/architecture.md).

## Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.2.4 |
| UI runtime | React + React DOM | 19.2.4 |
| Lenguaje | TypeScript (`strict: true`) | 5.x |
| Estilos | Tailwind CSS v4 (`@tailwindcss/postcss`) | 4.x |
| Iconos | lucide-react (outline, stroke 1.5) — *pendiente de instalar* | — |
| Fuentes | Inter + Fraunces (`next/font/google`) — *pendiente de migración desde Geist* | — |
| ORM | Prisma + `@prisma/adapter-libsql` | 7.x |
| Base de datos | SQLite local (`file:./dev.db`) / Turso libSQL (prod) | — |
| Auth | Auth.js v5 (Credentials + JWT) + bcryptjs | 5.0.0-beta |
| IA | `@google/generative-ai` (`gemini-2.0-flash`) | 0.24 |
| Storage | `@vercel/blob` | 2.3 |
| Email | Resend | 6.12 |
| Procesado imagen | `sharp` | 0.34 |
| Fechas | `date-fns` (locale `es`) | 4.x |
| Lint | ESLint 9 + `eslint-config-next` | — |
| Package manager | npm | — |

> ⚠️ `AGENTS.md` advierte: esta versión de Next puede tener APIs distintas a tu memoria. Consultar `node_modules/next/dist/docs/` antes de escribir código nuevo.

## Estructura

```
/                        # raíz: auth.ts, prisma.config.ts, next.config.ts, eslint.config.mjs,
                         #       postcss.config.mjs, tsconfig.json, vercel.json
├── app/
│   ├── layout.tsx       # html, fuentes, SessionProvider, ServiceWorker, contenedor 430px
│   ├── globals.css      # tokens CSS (light + dark) expuestos vía @theme inline (Tailwind v4)
│   ├── page.tsx         # redirect → /day/<hoy>
│   ├── api/             # route handlers (auth, meals, goals, foods, analyze, history, export, profile)
│   ├── auth/            # login, registro, forgot/reset password
│   ├── day/[date]/      # vista diaria + flujo /add
│   ├── history/         # historial con buscador
│   ├── settings/        # ajustes (profile, goals, foods, notifications, appearance, data, about)
│   ├── components/
│   │   ├── ui/          # primitivos del design system (Button, Card, Input, Icon, Avatar, Stat, …)
│   │   └── *.tsx        # componentes de feature (BottomNav, MacroSummary, MealList, EditMealSheet, …)
│   ├── components/add/  # StepMode, StepCamera, StepSearch, StepConfirm
│   ├── hooks/           # useTheme, useFoodSearch, useNotificationPermission, useNotificationSchedule
│   └── generated/prisma/  # cliente Prisma generado (ignorado por git)
├── lib/                 # prisma.ts, foods.ts, email.ts
├── prisma/              # schema.prisma + migrations/
├── public/              # manifest.json, sw.js, /icons
├── scripts/seed-foods.ts
├── types/next-auth.d.ts
└── docs/
    ├── architecture.md  # documentación técnica detallada (schema, endpoints, sprints, decisiones)
    ├── BRD.md
    ├── SETTINGS-REDESIGN.md
    └── USE-CASES.md
```

## Convenciones

- **Naming**: Componentes `PascalCase.tsx` con default export; hooks `useXxx.ts` named export; rutas y archivos del App Router en kebab-case (`forgot-password`, `reset-password`); texto UI y dominio en **español** (`nombre`, `categoria`, `desayuno`/`almuerzo`/`cena`/`snack`). Variables prefijadas con `_` (ej. `_id`, `_date`) marcan ítems intencionalmente sin uso; ESLint las ignora (configurado en `eslint.config.mjs`).
- **Estilos**: Tailwind v4 utility-first inline. **Tokens vía CSS variables** expuestas a Tailwind con `@theme inline` (ej. `bg-bg-primary`, `text-text-primary`, `text-macro-protein`). Dark mode con clase `.dark` en `<html>` (toggle en Apariencia, default = claro). **Nunca clases dinámicas** (`"bg-" + color`) — Tailwind v4 purga clases no literales.
- **Componentes**: Server Components por defecto; `"use client"` solo donde haya hooks/interactividad. Props con `type Props = {...}` inline. Primitivos del design system viven en `app/components/ui/`; componentes de feature en `app/components/`.
- **Iconos**: siempre via `<Icon name={...}>` (wrapper de `lucide-react`), stroke 1.5, tamaño por defecto 20. **Cero emojis nativos** en JSX.
- **Fuentes**: `font-sans` (Inter) para UI; `font-serif` (Fraunces) para números hero y títulos de pantalla. Números con `tabular-nums`.
- **Patrones de estado**:
  - Para leer de un *external store* (localStorage, Notification API, prefs del SO), usar `useSyncExternalStore` en lugar de `useState + useEffect`. Hooks de referencia: `useTheme`, `useNotificationPermission`, `useNotificationSchedule`.
  - Para sincronizar un prop a múltiples states (típicamente al cambiar una entidad seleccionada), usar el patrón `key` prop en el parent en vez de un `useEffect` reactivo. Ejemplo: `MealList → <EditMealSheet key={editingMeal.id} meal={editingMeal} />`.
  - Evitar `setState` síncrono dentro del cuerpo de `useEffect` (regla `react-hooks/set-state-in-effect`). Si necesitas estado derivado, calcúlalo durante el render.

## Comandos

- **dev**: `npm run dev` — Turbopack en http://localhost:3000
- **build**: `npm run build`
- **start**: `npm start`
- **lint**: `npm run lint`
- **typecheck**: `npx tsc --noEmit` (no hay script dedicado; `tsconfig.json` tiene `noEmit: true` y `strict: true`)
- **postinstall**: `prisma generate` (automático tras `npm install`)
- **DB local**: `npx prisma migrate dev --name <nombre>`
- **Seed**: `npx tsx scripts/seed-foods.ts`
- **DB prod (Turso)**: `turso db shell macro-tracker < prisma/migrations/<nombre>/migration.sql` (Prisma 7 no soporta `migrate deploy` contra libsql:// directamente)

## Design System

### Personalidad

Editorial, sofisticada, calmada — referencia: Kinfolk, Cereal Magazine, The Gentlewoman. Premium sin frialdad. Pensada para deportistas conscientes.

### Color tokens

Definidos como CSS variables en `app/globals.css`, expuestos a Tailwind v4 vía `@theme inline` como `bg-*`, `text-*`, `border-*`. **Usar los tokens, no la paleta Tailwind directa** (`bg-bg-primary` ✓, `bg-emerald-50` ✗).

**Modo claro (default)**

| Token | Hex | Uso |
|---|---|---|
| `--bg-primary` | `#EEEAE2` | Fondo principal (beige neutro) |
| `--bg-secondary` | `#FFFFFF` | Tarjetas |
| `--bg-tertiary` | `#E6E0D4` | Áreas elevadas, tracks de progreso, fondo de avatares |
| `--text-primary` | `#1A1A1A` | Texto principal y números hero |
| `--text-secondary` | `#6B6B6B` | Texto secundario |
| `--text-tertiary` | `#9A9A9A` | Labels, metadatos, placeholders |
| `--border` | `#DDD7CC` | Bordes y separadores |
| `--accent-primary` | `#3D5A3D` | Verde botánico (acciones, links, estado activo) |
| `--accent-warm` | `#C66B4A` | Terracota (highlights cálidos) |

**Macros** (reemplazan emerald/blue/amber/violet)

| Token | Hex | Macro |
|---|---|---|
| `--macro-protein` | `#3D5A3D` | Proteína (verde botánico) |
| `--macro-carbs` | `#C66B4A` | Carbohidratos (terracota) |
| `--macro-fat` | `#8A7355` | Grasa (mostaza tierra) |
| `--macro-calories` | `#1A1A1A` | Calorías totales (texto, no color saturado) |

**Modo oscuro** (opcional, Ajustes → Apariencia)

| Token | Hex |
|---|---|
| `--bg-primary` | `#1A1A1A` |
| `--bg-secondary` | `#242220` |
| `--bg-tertiary` | `#2E2A26` |
| `--text-primary` | `#F5F1EA` |
| `--text-secondary` | `#A8A29A` |
| `--text-tertiary` | `#6B6B6B` |
| `--border` | `#332F2A` |
| `--accent-primary` | `#7BA075` (verde botánico claro) |
| `--accent-warm` | `#E08A6A` |
| Macros | versiones con +10–15% luminancia respecto al modo claro |

### Tipografía

- **Display / números hero**: Fraunces (serif variable, Google Fonts) — tracking `-0.02em`.
- **UI / cuerpo**: Inter (Google Fonts).
- **Números**: siempre `font-variant-numeric: tabular-nums`.
- **Labels uppercase**: tracking `+0.08em`, `text-xs`, color `text-text-tertiary`.
- **Tamaños de referencia**: `text-[72px]` (hero kcal), `text-[40px]` (títulos de pantalla), `text-2xl` (headers de meal), `text-sm`/`text-base` (cuerpo), `text-xs` (labels).

### Iconografía

- Set único: **Lucide React** (outline, stroke `1.5px`, tamaño base `20`).
- Importar siempre via `<Icon name={...}>` (wrapper en `app/components/ui/Icon.tsx`) para mantener consistencia.
- **Cero emojis nativos** en JSX. El campo `User.avatarEmoji` queda en Prisma sin uso (no se migra para no romper Turso). El array `AVATARS` y el picker fueron eliminados; el avatar de usuario es un `<Avatar>` con iniciales sobre `bg-bg-tertiary`.

### Forma y espaciado

- **Border-radius máx 12px**: `rounded-xl` por defecto. `rounded-full` solo en pills, dots y avatares.
- **Sombras**: máx `0 1px 2px rgba(0,0,0,0.04)` (var `--shadow-subtle`). Preferir separación visual con `border border-border` antes que con sombra.
- **Espaciado**: cards `p-6`–`p-8`; entre secciones `mt-8`–`mt-12`.

### Movimiento

- Transiciones 200–300ms con easing `cubic-bezier(0.32, 0.72, 0, 1)` (var `--ease-editorial`).
- Sin bouncy, sin glow, sin gradientes vibrantes, sin glassmorphism, sin parallax.

### Primitivos en `app/components/ui/`

`Button` (variants: `primary` | `secondary` | `ghost` | `destructive`; sizes: `sm` | `md` | `lg`) · `Card` · `Input` (con `leadingIcon`/`trailingIcon`) · `Icon` (wrapper Lucide) · `Label` · `Stat` (número Fraunces + sub-label Inter) · `SectionHeader` · `Divider` · `Avatar` (iniciales en círculo).

## Reglas para Claude

- Nunca modificar lógica de negocio sin pedir confirmación.
- Mantener TypeScript estricto (`strict: true` en `tsconfig.json`).
- Correr lint/build después de cambios visuales antes de declarar terminado.
- Preferir CSS variables sobre valores hardcoded; usar tokens del design system (`bg-bg-*`, `text-text-*`, `text-macro-*`) en vez de Tailwind palette directa (`bg-emerald-500`, etc.).
- No introducir nuevas dependencias sin aprobación.
- Sin emojis nativos en JSX. Iconos siempre via `<Icon>`.
