# Migraciones de DB — flujo

## Resumen

La DB de prod (Turso, libSQL) se sincroniza con el schema de Prisma vía un
endpoint admin idempotente, disparado automáticamente por GitHub Actions
en cada push a `main`.

## Componentes

| Archivo | Rol |
|---|---|
| `prisma/schema.prisma` | Source of truth del modelo |
| `app/api/admin/migrate/route.ts` | Endpoint idempotente que chequea `pragma_table_info` / `sqlite_master` y aplica los DDL faltantes |
| `.github/workflows/migrate-prod.yml` | Workflow que invoca el endpoint con `Authorization: Bearer ${AUTH_SECRET}` post-deploy |
| `docs/migrations/HU-XX-*.sql` | Referencia legible — útil para inspección / override manual |

## Para añadir un cambio de schema

1. Editá `prisma/schema.prisma`.
2. Aplicalo en local: `npx prisma db push`.
3. Registrá los DDL nuevos en `app/api/admin/migrate/route.ts`, en los catálogos `COLUMN_ADDS`, `TABLE_CREATES`, `INDEX_CREATES`. Mantené el formato (chequeable con `pragma_table_info` o `IF NOT EXISTS`).
4. Opcional pero recomendado: agregá un `docs/migrations/HU-XX-<nombre>.sql` con el mismo SQL como referencia.
5. Commit + PR. Al mergear a `main`, el workflow `migrate-prod` corre y aplica los DDL en Turso prod.

## Secrets requeridos en el repo de GitHub

Set en *Settings → Secrets and variables → Actions → Repository secrets*:

- `AUTH_SECRET` — mismo valor que tiene Vercel en su env de producción
  (el endpoint reusa ese secret para autenticar)
- `PROD_APP_URL` — URL completa de prod (ej. `https://macro-tracker-beta-topaz.vercel.app`)

## Override manual

Si necesitás aplicar algo fuera del flujo automático:

```bash
turso db shell macro-tracker < docs/migrations/HU-XX-<nombre>.sql
```

O invocar el endpoint manualmente:

```bash
curl -X POST "$PROD_APP_URL/api/admin/migrate" \
  -H "Authorization: Bearer $AUTH_SECRET"
```

## Historia

El flujo original era 100% manual y los DDL de HU-03 → HU-12 nunca se
aplicaron en prod. Cuando una usuaria intentó registrarse, la query a
`User` falló con `no such column: User.countryCode` y NextAuth lo
tradujo a `error=Configuration`. El endpoint + workflow se introdujeron
en respuesta a ese incidente para evitar repeticiones.
