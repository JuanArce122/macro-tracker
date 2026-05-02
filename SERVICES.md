# Servicios externos — Macro Tracker

Referencia concreta de cada servicio de terceros que usa el proyecto: para qué sirve, cómo está integrado, límites del plan gratuito y restricciones conocidas.

---

## 1. Google Gemini API

**Uso:** Análisis de imágenes de comida. Recibe una foto en base64 y devuelve un JSON con el nombre del plato y un desglose de ingredientes con macros estimados.

**Integración:**
- Endpoint: `POST /api/analyze`
- Modelo: `gemini-2.0-flash`
- Librería: `@google/genai`
- La clave se obtiene en https://aistudio.google.com/app/apikey (**no** en Google Cloud Console — solo AI Studio tiene el free tier)

**Plan gratuito (Free Tier):**
| Límite | Valor |
|---|---|
| Requests por minuto (RPM) | 15 |
| Tokens por minuto (TPM) | 1.000.000 |
| Requests por día (RPD) | 1.500 |

**Restricciones importantes:**
- Si se genera la clave desde Google Cloud Console en vez de AI Studio, **no tiene free tier** y cobra desde la primera llamada.
- El modelo `gemini-2.0-flash` es multimodal (acepta imágenes). No sustituir por `gemini-2.0-flash-lite` sin verificar que siga soportando imágenes.
- Las respuestas de la IA son estimaciones — la confianza se devuelve como un campo `confianza` (0.0–1.0) por ingrediente.
- Variable de entorno: `GEMINI_API_KEY`

---

## 2. Turso (libSQL Cloud)

**Uso:** Base de datos SQLite en la nube para producción. Almacena usuarios, comidas, metas y la tabla de alimentos.

**Integración:**
- Librería: `@libsql/client` + `@prisma/adapter-libsql`
- La URL tiene formato: `libsql://<nombre>.aws-us-east-1.turso.io`
- El ORM Prisma se conecta vía adapter (no driver nativo)
- Variables de entorno: `DATABASE_URL` y `DATABASE_AUTH_TOKEN`

**Plan gratuito (Starter):**
| Límite | Valor |
|---|---|
| Bases de datos | 500 |
| Almacenamiento total | 9 GB |
| Reads por mes | 1.000 millones |
| Writes por mes | 25 millones |
| Instancias por DB | 3 |

**Restricciones importantes:**
- `prisma migrate deploy` **no funciona** con URLs `libsql://`. Las migraciones se aplican manualmente: `turso db shell <nombre-db> < migration.sql`
- Los archivos de migración generados por Prisma usan `PRAGMA` (SQLite-specific). Si contienen `DROP TABLE` + recreación, verificar que la sintaxis sea compatible con Turso antes de ejecutar. Si no, reescribir como `ALTER TABLE ADD COLUMN`.
- SQLite (y Turso) no soportan escrituras concurrentes masivas. Suficiente para uso personal o pocos usuarios simultáneos. Para escalar: migrar a PostgreSQL (Supabase, Neon) o usar Turso con réplicas.
- El auth token de Turso no expira por defecto, pero puede revocarse manualmente desde el dashboard o CLI.

---

## 3. Vercel

**Uso:** Hosting y despliegue de la aplicación Next.js. Cada push a `main` dispara un deploy automático.

**Integración:**
- Framework preset: Next.js (detectado automáticamente)
- Build command: `next build` (+ `postinstall` que ejecuta `prisma generate`)
- Las variables de entorno se configuran en: Vercel Dashboard → Project → Settings → Environment Variables

**Variables de entorno requeridas en Vercel:**
```
GEMINI_API_KEY
DATABASE_URL          # URL de Turso: libsql://...
DATABASE_AUTH_TOKEN   # Token de Turso
BLOB_READ_WRITE_TOKEN # Token de Vercel Blob
AUTH_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
NEXT_PUBLIC_APP_URL   # URL pública de la app (ej: https://macro-tracker.vercel.app)
```

**Plan gratuito (Hobby):**
| Límite | Valor |
|---|---|
| Deployments | 100/día |
| Serverless Function duration | 10 segundos |
| Edge Function duration | 30 ms CPU |
| Bandwidth | 100 GB/mes |
| Builds por día | 100 |

**Restricciones importantes:**
- **Edge Runtime incompatibilidad con Auth.js v5:** Auth.js usa módulos Node.js (`node:crypto`, `node:fs`, `node:path`, etc.) que no están disponibles en el Edge Runtime de Vercel. Por eso `middleware.ts` fue eliminado. La protección de rutas se hace a nivel de Server Component y API Route con `auth()` de `@/auth`.
- El timeout de 10 segundos afecta a la función `/api/analyze` (llamada a Gemini). Si Gemini tarda más de 10s en responder en producción, fallará. Actualmente no ha sido un problema con `gemini-2.0-flash`.
- Para hacer redeploy manual: ir a Vercel Dashboard → Deployments → hacer click en el commit más reciente → "Redeploy". **No** usar el botón "Redeploy" de un deployment viejo porque re-despliega ese commit, no el último.

---

## 4. Vercel Blob

**Uso:** Almacenamiento de imágenes de comida. Las fotos se comprimen con `sharp` antes de subir (600px, JPEG 75%).

**Integración:**
- Librería: `@vercel/blob`
- Función: `put(filename, buffer, { access: "public" })`
- El token se auto-inyecta en proyectos Vercel vinculados al Blob Store
- Variable de entorno: `BLOB_READ_WRITE_TOKEN`

**Plan gratuito:**
| Límite | Valor |
|---|---|
| Almacenamiento | 500 MB |
| Transferencia | 1 GB/mes |
| Requests | Sin límite especificado |

**Restricciones importantes:**
- El upload es **no-fatal**: si falla (token inválido, límite alcanzado, etc.), la comida se guarda igualmente en la DB pero sin `imageUrl`. Esto fue un fix explícito — anteriormente un fallo de Blob devolvía 500 y la comida no se guardaba.
- El `BLOB_READ_WRITE_TOKEN` debe configurarse manualmente en las variables de entorno de Vercel si el proyecto no está vinculado automáticamente a un Blob Store en el dashboard.
- Las imágenes eliminadas con `DELETE /api/meals/[id]` se borran también del Blob Store. Si el Blob Store cambia o el token expira, las URLs de imágenes anteriores pueden quedar rotas.
- En desarrollo local el token no está disponible → las imágenes no se suben, pero la app funciona igual (la comida se guarda sin foto).

---

## 5. Open Food Facts API

**Uso:** Base de datos pública de alimentos con millones de productos. Se consulta como fallback cuando la búsqueda local devuelve menos de 5 resultados. Los resultados se **cachean en la DB** para no repetir llamadas.

**Integración:**
- URL: `https://world.openfoodfacts.org/cgi/search.pl?search_terms=QUERY&json=1&fields=product_name,nutriments`
- Timeout: 5 segundos (si no responde, se devuelven solo resultados locales)
- Los alimentos cacheados tienen `source: "openfoodfacts"` en la tabla `Food`
- Se muestran con el badge "OFF" en la UI

**Plan gratuito:**
- La API es completamente gratuita y abierta (proyecto sin fines de lucro)
- Sin límite de requests documentado, pero se recomienda no abusar (somos una app pequeña)
- Los datos son aportados por la comunidad — la calidad nutricional puede variar

**Restricciones importantes:**
- Los datos de Open Food Facts son en su mayoría de productos empaquetados con código de barras. Para alimentos frescos o genéricos (ej: "pechuga de pollo cruda"), los resultados pueden ser escasos o imprecisos.
- Los macros vienen en campos como `nutriments["energy-kcal_100g"]`, `nutriments["proteins_100g"]`, etc. Si un campo falta, se usa 0.
- El cacheo evita llamadas repetidas pero puede quedar desactualizado. No hay lógica de refresco automático.
- Al buscar en producción con internet lento, el timeout de 5s puede expirar y devolver solo resultados locales — comportamiento esperado.

---

## 6. Resend

**Uso:** Envío de emails transaccionales para la recuperación de contraseña. Envía el enlace con el token al email del usuario.

**Integración:**
- Librería: `resend` (SDK oficial)
- Módulo: `lib/email.ts`
- Llamado desde: `POST /api/auth/forgot-password`
- Variables de entorno: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

**Plan gratuito:**
| Límite | Valor |
|---|---|
| Emails por mes | 3.000 |
| Emails por día | 100 |
| Dominios personalizados | 1 |

**Restricciones importantes:**
- En el plan gratuito solo se puede enviar desde `onboarding@resend.dev` o desde un dominio propio verificado. En producción real, verificar un dominio propio para que los emails no caigan en spam.
- `RESEND_FROM_EMAIL` en producción debe coincidir con un dominio verificado en el dashboard de Resend.
- Los tokens de recuperación expiran en 15 minutos y son de un solo uso (se eliminan de la DB tras usarse o al generar uno nuevo).

---

## 7. Auth.js v5 (next-auth@beta)

**Uso:** Autenticación completa: login, registro, sesión JWT, y páginas protegidas.

**Integración:**
- Librería: `next-auth@beta` (v5)
- Estrategia: JWT (stateless — sin tabla de sesiones en DB)
- Provider: Credentials (email + contraseña)
- Config central: `auth.ts` en la raíz del proyecto
- Archivo de tipos: `types/next-auth.d.ts` (extiende Session para incluir `user.id`)

**Sin costo:** Es una librería open source, sin plan de pago.

**Restricciones importantes:**
- **Incompatible con Vercel Edge Runtime.** Usa `node:crypto`, `node:path`, `node:fs` internamente. Esto impide usar `middleware.ts` con Auth.js para proteger rutas. Solución actual: cada Server Component y API Route llama a `auth()` directamente.
- La v5 (beta) tiene breaking changes respecto a v4: la función principal es `auth()` en vez de `getServerSession()`, y los callbacks de JWT funcionan diferente.
- `AUTH_SECRET` debe ser una cadena aleatoria de al menos 32 bytes. Generar con: `openssl rand -base64 32`. Sin esta variable la app no arranca.

---

## 8. Prisma ORM

**Uso:** ORM para interactuar con la base de datos. Gestiona el schema, las migraciones y el cliente tipado.

**Integración:**
- Versión: Prisma v7
- Adapter: `@prisma/adapter-libsql` (requerido en v7 para SQLite/Turso)
- Cliente generado en: `app/generated/prisma/` (ignorado por git, regenerado en cada `npm install`)
- Config del datasource: `prisma/prisma.config.ts`
- Schema: `prisma/schema.prisma`

**Sin costo:** Es open source. Prisma Accelerate (proxy en la nube) es de pago pero no se usa en este proyecto.

**Restricciones importantes:**
- En Prisma v7, el datasource no admite `url = env("DATABASE_URL")` directamente para libsql. La URL se pasa al adapter en `lib/prisma.ts`.
- `npx prisma generate` debe ejecutarse tras cualquier cambio en `schema.prisma`. El `postinstall` lo hace automáticamente.
- `npx prisma migrate dev` funciona solo con la DB local (`file:./dev.db`). Para Turso en producción: aplicar el SQL de la migración manualmente.
- El cliente generado **no se commitea** al repo (está en `.gitignore`). Vercel lo regenera durante el build via `postinstall`.
