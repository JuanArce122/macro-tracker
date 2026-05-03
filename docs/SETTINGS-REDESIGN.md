# Rediseño de Ajustes — Plan de Sprints

> **Objetivo:** Convertir la pantalla de Ajustes en una experiencia iOS-style con sub-pantallas independientes, perfil de usuario completo y secciones adicionales que hacen la app más completa y profesional.

---

## Visión general

### Estructura final de Ajustes

```
/settings                    ← Lista de secciones (iOS-style)
  ├── /settings/profile      ← Perfil y cuenta
  ├── /settings/goals        ← Metas diarias (con auto-save)
  ├── /settings/foods        ← Mis alimentos personalizados
  ├── /settings/notifications← Recordatorios de comidas
  ├── /settings/appearance   ← Tema visual (sistema/claro/oscuro)
  ├── /settings/data         ← Exportar CSV, borrar historial
  └── /settings/about        ← Versión, créditos, feedback
```

### Dónde aparece el perfil en la app

| Lugar | Elemento | Razón UX |
|-------|----------|----------|
| **DayHeader** | Avatar emoji + "Buenos días, [Nombre]" | Primera interacción del día — crea conexión emocional y personaliza la experiencia |
| **Settings (top card)** | Card con avatar grande, nombre y objetivo activo | Punto de entrada al perfil, refuerza identidad antes de las secciones |
| **BottomNav** | Emoji del usuario reemplaza ícono de tuerca | Muy usado en apps fitness (MyFitnessPal, Strava) — más personal y reconocible |

---

## Sprint A — Shell de Settings + Perfil de usuario
**Esfuerzo estimado:** Alto  
**Valor:** Muy alto (base de todo lo demás)

### Qué se construye
1. **Rediseño de `/settings`** — Lista de ítems iOS-style con icono, título, descripción corta y chevron. Cada fila navega a su sub-pantalla.
2. **Card de perfil** en la parte superior de Settings con avatar emoji, nombre y objetivo.
3. **Nueva página `/settings/profile`:**
   - Picker de avatar emoji (grid de ~20 emojis)
   - Campo nombre
   - Datos físicos: edad, sexo (Hombre/Mujer), peso (kg), altura (cm)
   - Objetivo fitness: Perder grasa / Mantener / Ganar músculo
   - Botón Guardar (explícito en esta sub-pantalla)
4. **Integración en DayHeader:** saludo "Buenos días/tardes/noches, [Nombre]" + avatar pequeño.
5. **Integración en BottomNav:** avatar emoji reemplaza ícono de tuerca en pestaña Ajustes.

### Cambios técnicos requeridos
- **Prisma:** Añadir campos al modelo `User`:
  - `name String?`
  - `avatarEmoji String?` (default: "🙂")
  - `age Int?`
  - `sex String?` ("male" | "female")
  - `weightKg Float?`
  - `heightCm Float?`
  - `activityLevel String?` ("sedentary" | "light" | "moderate" | "active" | "very_active")
  - `fitnessGoal String?` ("lose" | "maintain" | "gain")
- **Migración DB:** `turso db shell macro-tracker "ALTER TABLE User ADD COLUMN name TEXT; ..."` (una por campo)
- **API:** `GET /api/profile` + `PUT /api/profile`
- **Componentes nuevos:** `SettingsRow.tsx` (fila reutilizable iOS-style)

---

## Sprint B — Metas en su propia sub-pantalla
**Esfuerzo estimado:** Bajo  
**Valor:** Alto

### Qué se construye
1. **Nueva página `/settings/goals`:**
   - Mismos campos de hoy (calorías, proteína, carbs, grasa)
   - **Auto-save con debounce** (600ms después de dejar de escribir) — sin botón guardar
   - Indicador visual sutil de "Guardado ✓" que aparece y desaparece
   - Distribución calórica estimada (P/C/G %) — solo lectura, se actualiza en vivo
2. **Eliminar** la sección de metas y el botón "Guardar metas" de la pantalla principal de Settings.
3. La fila en Settings muestra el resumen: *"2.000 kcal · 150g P"* como subtítulo.

### Cambios técnicos
- Mover lógica de `/settings` a `/settings/goals`
- Añadir debounce con `useEffect` + `setTimeout`

---

## Sprint C — Mis alimentos en su propia sub-pantalla
**Esfuerzo estimado:** Muy bajo  
**Valor:** Medio

### Qué se construye
1. **Nueva página `/settings/foods`:**
   - Extraer exactamente la sección "Mis alimentos" que existe hoy
   - Sin cambios funcionales
2. La fila en Settings muestra cuántos alimentos tiene: *"3 alimentos guardados"*

### Cambios técnicos
- Mover componente de `/settings` a `/settings/foods`
- Leer conteo de `custom_foods` en localStorage para el subtítulo

---

## Sprint D — Datos y privacidad
**Esfuerzo estimado:** Medio  
**Valor:** Alto (profesionalismo + utilidad)

### Qué se construye
1. **Nueva página `/settings/data`:**
   - **Exportar CSV:** botón que llama a `/api/export` (ya existe) — descarga directa
   - **Exportar por rango:** selector de fecha inicio/fin opcional antes de exportar
   - **Borrar historial:** botón rojo con modal de confirmación ("Escribe BORRAR para confirmar") — llama a nueva API que elimina todas las comidas del usuario
   - **Borrar cuenta:** opción destructiva con confirmación doble — elimina usuario y todos sus datos
2. La fila en Settings muestra: *"Exportar · Privacidad"*

### Cambios técnicos
- **API:** `DELETE /api/meals/all` (borrar todas las comidas del usuario)
- **API:** `DELETE /api/account` (borrar usuario completo con cascada)
- Modal de confirmación con campo de texto

---

## Sprint E — Notificaciones
**Esfuerzo estimado:** Medio  
**Valor:** Alto (retención de usuarios)

### Qué se construye
1. **Nueva página `/settings/notifications`:**
   - Toggle "Recordatorio de desayuno" con selector de hora
   - Toggle "Recordatorio de almuerzo" con selector de hora  
   - Toggle "Recordatorio de cena" con selector de hora
   - Toggle "Resumen diario" (hora fija, e.g. 21:00)
   - Botón para activar permisos de notificación del navegador
2. Usa **Web Push Notifications** via Service Worker (ya registrado)
3. Las horas se guardan en `localStorage`; la lógica de disparo vive en el SW

### Cambios técnicos
- Añadir lógica de `Notification.requestPermission()` en la UI
- Añadir manejador de `notificationclick` al SW
- `setInterval`/`setTimeout` en SW para verificar horarios

> **Nota:** Las PWA tienen limitaciones con notificaciones en iOS (requiere iOS 16.4+). Se mostrará aviso contextual.

---

## Sprint F — Apariencia
**Esfuerzo estimado:** Bajo  
**Valor:** Medio

### Qué se construye
1. **Nueva página `/settings/appearance`:**
   - Selector de tema: **Sistema** (default) / **Claro** / **Oscuro**
   - Tres opciones visuales con preview (radio buttons estilo card)
   - Guardado en `localStorage` + aplica clase `dark` al `<html>` manualmente
2. La fila en Settings muestra el tema actual: *"Sistema"*

### Cambios técnicos
- Cambiar `globals.css` de `@media (prefers-color-scheme: dark)` a clase `.dark` en `<html>`
- Leer preferencia en `layout.tsx` (o via script inline para evitar flash)
- Hook `useTheme()` reutilizable

---

## Sprint G — Sobre la app
**Esfuerzo estimado:** Muy bajo  
**Valor:** Bajo-Medio (profesionalismo)

### Qué se construye
1. **Nueva página `/settings/about`:**
   - Logo/nombre de la app + versión (e.g. v1.4.0)
   - Descripción corta
   - Enlace "Enviar feedback" (abre mailto o formulario simple)
   - Enlace "Política de privacidad" (texto estático)
   - Créditos: "Hecho con ❤️ usando Next.js + Gemini AI"
2. La fila en Settings muestra: *"v1.4.0"*

### Cambios técnicos
- Página estática, sin API
- Versión leída de `package.json`

---

## Orden de implementación recomendado

| Orden | Sprint | Razón |
|-------|--------|-------|
| 1 | **A — Perfil + Shell** | Todo lo demás depende del shell. El perfil es el cambio más visible y con mayor impacto en UX |
| 2 | **B — Metas** | Alto uso diario, flujo muy mejorado con auto-save |
| 3 | **C — Mis alimentos** | Simple, bajo esfuerzo |
| 4 | **D — Datos** | Importante para usuarios que quieren control sobre sus datos |
| 5 | **E — Notificaciones** | Retención — pero requiere más infra |
| 6 | **F — Apariencia** | El dark mode ya funciona automáticamente, esto es mejora |
| 7 | **G — Sobre la app** | Último porque es puramente cosmético |

---

## Vista previa del Settings principal (diseño final)

```
┌─────────────────────────────┐
│  [🙂] Juan García           │  ← Card de perfil (tap → /profile)
│       Perder grasa          │
├─────────────────────────────┤
│  CUENTA                     │
│  👤 Perfil          >       │
├─────────────────────────────┤
│  NUTRICIÓN                  │
│  🎯 Metas diarias   >       │  subtítulo: "2.000 kcal · 150g P"
│  🥗 Mis alimentos   >       │  subtítulo: "3 alimentos"
├─────────────────────────────┤
│  PREFERENCIAS               │
│  🔔 Notificaciones  >       │  subtítulo: "3 activos"
│  🎨 Apariencia      >       │  subtítulo: "Sistema"
├─────────────────────────────┤
│  PRIVACIDAD                 │
│  📊 Datos           >       │  subtítulo: "Exportar · Borrar"
├─────────────────────────────┤
│  INFO                       │
│  ℹ️  Sobre Macro Tracker >  │  subtítulo: "v1.4.0"
└─────────────────────────────┘
```

---

*Documento creado: 2026-05-03*  
*Estado: Planificación — pendiente de implementación*
