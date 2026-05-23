# HU-08 Follow-up: Integración con Garmin Connect

> **Estado:** Diferido a Sprint futuro post-MVP
> **Razón:** Garmin Connect requiere aprobación del Connect IQ Developer Program — paperwork formal de 1-2 semanas, no compatible con un sprint estándar.

---

## Por qué quedó fuera del PR principal

Durante el desarrollo de HU-08 (Wearables OAuth) confirmamos:

1. **Fitbit** tiene OAuth público y sandbox inmediato. ✅ Implementado.
2. **Oura** tiene OAuth público y requiere aplicar para una API key (proceso de 24-48h). ✅ Implementado.
3. **Garmin Connect** requiere ser miembro aprobado del [Connect IQ Developer Program](https://developer.garmin.com/connect-iq/overview/) Y firmar acuerdos comerciales con Garmin para usar la Health API. **Sin esto, no hay sandbox usable.**

Por eso este PR cierra HU-08 con Fitbit + Oura funcionando, y Garmin queda con un placeholder visible en `/settings/wearables` ("Próximamente — requiere Connect IQ Developer").

---

## Trabajo pendiente cuando se desbloquee Garmin

### 1. Aprobación del programa

- Aplicar en https://developer.garmin.com/health-api/overview/
- Firmar el Garmin Health API License Agreement
- Esperar aprobación (típicamente 7-14 días)
- Una vez aprobado, recibir `CONSUMER_KEY` y `CONSUMER_SECRET`

### 2. Implementación técnica (~3-5 días de trabajo)

Toda la infraestructura ya está lista — solo falta:

- **`lib/wearables/garmin.ts`** siguiendo el patrón de `fitbit.ts` y `oura.ts`. Particularidades:
  - Garmin usa **OAuth 1.0a**, no 2.0 — requiere firmar requests con HMAC-SHA1
  - El refresh token no existe en OAuth 1.0a — los tokens son long-lived (sin caducidad), pero se pueden revocar
  - Endpoints relevantes:
    - `https://connectapi.garmin.com/oauth-service/oauth/preauthorized` — request token
    - `https://connect.garmin.com/oauthConfirm` — user authorization
    - `https://connectapi.garmin.com/oauth-service/oauth/access_token` — access token
    - `https://apis.garmin.com/wellness-api/rest/dailies` — actividad diaria
    - `https://apis.garmin.com/wellness-api/rest/sleeps` — sueño
    - `https://apis.garmin.com/wellness-api/rest/userMetrics` — peso

- **Adaptar `lib/wearables/sync.ts`**:
  - Agregar caso `syncGarmin(conn)` que use el cliente Garmin
  - Como OAuth 1.0a no tiene refresh, `ensureFreshToken` para Garmin solo decrypta el access token (no hay expiración)

- **Adaptar `lib/wearables/providers.ts`**:
  - Agregar "garmin" a `SUPPORTED_PROVIDERS`
  - Implementar `getAuthUrl` y `exchangeCode` (con flujo OAuth 1.0a)

- **UI**: cambiar `available: false` a `true` en `app/settings/wearables/page.tsx`

### 3. Variables de entorno nuevas

```
GARMIN_CONSUMER_KEY=...
GARMIN_CONSUMER_SECRET=...
```

### 4. Tests

- `__tests__/lib/wearables/garmin.test.ts` con mock del OAuth 1.0a flow
- Tests de firma HMAC-SHA1 (función pura, fácil de testear)
- E2E con mock de fetch

---

## Alternativa: Garmin Connect IQ (PWA → app)

Si la aprobación del Health API tarda mucho o se rechaza, hay una alternativa más liviana pero más limitada:

- Convertir la PWA actual a una app embedded con Capacitor
- Usar el [Connect IQ SDK](https://developer.garmin.com/connect-iq/overview/) que sí tiene aprobación open
- Trade-off: solo funciona con la app instalada en el reloj, no en la PWA web

Esta ruta NO es prioritaria. El path principal sigue siendo Health API + PWA estándar.

---

## Estimación

| Tarea | Tiempo |
|---|---|
| Aprobación Garmin (espera) | 7-14 días |
| Implementación de `lib/wearables/garmin.ts` | 2 días |
| Integración en `sync.ts` y `providers.ts` | 0.5 días |
| Tests | 1 día |
| QA con device real | 1 día |
| **Total trabajo activo** | **~4.5 días** |
