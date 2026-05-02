# Business Requirements Document (BRD)
## Macro Tracker — App Personal de Seguimiento Nutricional

**Versión:** 1.0  
**Fecha:** Mayo 2026  
**Estado:** En desarrollo (Sprint 6 pendiente)

---

## 1. Resumen ejecutivo

Macro Tracker es una aplicación web personal instalable como PWA (Progressive Web App) diseñada para facilitar el seguimiento diario de macronutrientes. El usuario puede registrar sus comidas mediante dos mecanismos: análisis visual con inteligencia artificial (Google Gemini) o búsqueda en una base de datos nutricional local. La aplicación está optimizada para uso desde iPhone y no requiere autenticación ya que es de uso estrictamente personal.

---

## 2. Contexto y motivación

El seguimiento nutricional tradicional es lento y tedioso: requiere buscar alimentos en bases de datos extensas, estimar pesos, y calcular macros manualmente. Las apps existentes son complejas, requieren cuenta, y están orientadas al mercado masivo con funciones innecesarias.

**Oportunidad:** Una herramienta minimalista, rápida y personal que combine la estimación automática por IA con el cálculo preciso basado en base de datos, accesible desde el teléfono sin fricciones.

---

## 3. Objetivos del negocio

| # | Objetivo | Métrica de éxito |
|---|---|---|
| 1 | Reducir el tiempo de registro de una comida a menos de 30 segundos | El flujo completo (foto → guardar) toma ≤ 30s |
| 2 | Funcionar sin conexión a internet para consultas de historial | Historial disponible offline via PWA cache |
| 3 | Ser instalable como app nativa desde Safari en iPhone | `display: standalone` en manifest, instalable sin App Store |
| 4 | No depender exclusivamente de IA cuando hay datos conocidos | Modo de búsqueda manual disponible siempre |

---

## 4. Alcance

### 4.1 Dentro del alcance

- Registro de comidas por foto (análisis IA) o por búsqueda manual
- Base de datos nutricional local con 192 alimentos comunes (fuente: USDA)
- Vista diaria con sumario de macros y progreso vs. metas
- Navegación histórica por días
- Búsqueda de alimentos en registros pasados
- Configuración de metas diarias de macros
- Instalación como PWA en iPhone (Safari)
- Almacenamiento local con SQLite

### 4.2 Fuera del alcance

- Autenticación / múltiples usuarios
- Sincronización en la nube (datos son locales)
- Planes de dieta o recomendaciones personalizadas
- Integración con wearables o apps de salud (Apple Health, etc.)
- Escáner de códigos de barras
- Recetas o comidas compuestas
- Tracking de hidratación, suplementos o ejercicio
- Versión web pública o multiusuario
- Almacenamiento persistente de imágenes en producción (Vercel no tiene filesystem persistente)

---

## 5. Stakeholders

| Rol | Descripción |
|---|---|
| Usuario final | Una persona, uso personal exclusivo, acceso desde iPhone |
| Administrador | El mismo usuario — configura metas y mantiene el sistema |

---

## 6. Requisitos funcionales

### RF-01: Registro de comida por foto con IA
- El usuario puede tomar una foto con la cámara del iPhone o seleccionarla del carrete
- Puede ingresar el peso en gramos (opcional); si no lo ingresa, la IA lo estima visualmente
- El sistema llama a Google Gemini 2.0 Flash con la imagen y devuelve nombre, peso estimado, macros y nivel de confianza
- El usuario puede editar todos los campos antes de guardar

### RF-02: Registro de comida por búsqueda manual
- El usuario escribe el nombre de un alimento
- El sistema filtra en tiempo real sobre una base de datos de 192 alimentos (USDA)
- La búsqueda es tolerante a variaciones de género en español (crudo/cruda, cocido/cocida)
- Al seleccionar un alimento e ingresar el peso, el sistema calcula los macros automáticamente: `(peso / 100) × valores_por_100g`
- El resultado tiene confianza 1.0 (dato exacto de base de datos)

### RF-03: Pantalla de confirmación editable
- Antes de guardar, todos los campos son editables: nombre, categoría, peso, calorías, proteína, carbs, grasa
- La categoría se asigna automáticamente según la hora del día (Desayuno 5-10h, Almuerzo 11-15h, Cena 16-19h, Snack resto)
- El indicador de confianza muestra: verde (≥0.85), amarillo (0.60–0.84), rojo (<0.60)

### RF-04: Vista diaria de macros
- Por defecto muestra el día actual; navegable con flechas ← →
- Muestra calorías totales con barra de progreso vs. meta
- Muestra proteína, carbs y grasa en tarjetas individuales con barra de progreso
- Agrupa comidas por categoría: Desayuno, Almuerzo, Cena, Snack
- Permite eliminar comidas con confirmación

### RF-05: Historial
- Lista de días ordenados del más reciente al más antiguo
- Cada día muestra: día de semana, fecha, calorías totales, proteína, carbs y grasa
- Buscador en tiempo real (debounce 300ms) sobre todos los registros históricos por nombre
- Al tocar un resultado de búsqueda muestra un detalle del alimento (bottom sheet)
- Al tocar un día navega a la vista de ese día

### RF-06: Configuración de metas
- El usuario puede configurar sus metas diarias: calorías (kcal), proteína (g), carbohidratos (g) y grasa (g)
- Muestra la distribución calórica en porcentaje (P·C·G)
- Los valores se persisten en la base de datos y se usan en las barras de progreso

### RF-07: PWA instalable en iPhone
- La app es instalable desde Safari → "Agregar a pantalla de inicio"
- Funciona en modo standalone (sin barra del navegador)
- Tiene manifest.json con íconos 192×192 y 512×512
- Service worker con cache de assets estáticos para funcionamiento offline parcial

---

## 7. Requisitos no funcionales

| Categoría | Requisito |
|---|---|
| **Rendimiento** | El análisis de IA completa en ≤ 5 segundos bajo condiciones normales |
| **Usabilidad** | Diseño mobile-first para iPhone 14 (390px). Botones con área de toque ≥ 44px |
| **Precisión nutricional** | Datos de la base de datos local basados en USDA FoodData Central |
| **Disponibilidad** | La app funciona sin internet para historial; solo requiere conexión para análisis IA |
| **Seguridad** | API key de Gemini almacenada en variable de entorno, nunca expuesta al cliente |
| **Mantenibilidad** | Stack estándar (Next.js, Prisma, Tailwind) con documentación en CLAUDE.md |
| **Compatibilidad** | Safari en iOS 16+, Chrome en Android, navegadores desktop modernos |

---

## 8. Restricciones técnicas

| Restricción | Detalle |
|---|---|
| Google Gemini free tier | 1,500 requests/día con API key de Google AI Studio. Clave de Google Cloud Console puede tener `limit: 0` en free tier |
| Vercel filesystem | No hay almacenamiento persistente en Vercel. Las imágenes subidas se pierden entre deploys. Solución: Cloudflare R2 o Supabase Storage para producción |
| SQLite en producción | Vercel no soporta SQLite con archivo local. Se debe migrar a libSQL (Turso) o PostgreSQL para deploy |
| Tamaño de imágenes | Se redimensionan a máximo 800px con sharp antes de guardar y antes de enviar a Gemini |

---

## 9. Dependencias externas

| Dependencia | Propósito | Criticidad |
|---|---|---|
| Google Gemini API (`gemini-2.0-flash`) | Análisis de imágenes de comida | Alta — modo foto no funciona sin ella |
| USDA FoodData Central | Fuente de datos nutricionales (embebida en `lib/foods.ts`) | Baja — ya embebida, no requiere conexión |
| Vercel | Hosting del frontend y API routes | Alta para producción |

---

## 10. Criterios de aceptación

| Funcionalidad | Criterio |
|---|---|
| Registro por foto | La IA devuelve macros razonables para una imagen de comida reconocible |
| Registro manual | 267g de pechuga de pollo cruda → 320.4 kcal, 60.1g P, 0g C, 6.9g G |
| Vista diaria | Los totales suman correctamente el aporte de todas las comidas del día |
| Historial | La búsqueda "pollo" devuelve todos los registros con esa palabra en el nombre |
| Metas | Un cambio guardado en Ajustes se refleja inmediatamente en las barras de progreso |
| PWA | La app puede instalarse desde Safari y funciona en modo standalone |

---

## 11. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| API key de Gemini sin cuota free tier | Alta | Medio | Modo búsqueda manual siempre disponible como fallback |
| Pérdida de imágenes en Vercel | Alta | Bajo | Usar almacenamiento externo (R2/Supabase) en producción |
| Identificación incorrecta de alimentos por IA | Media | Bajo | Pantalla de confirmación editable antes de guardar |
| Base de datos de alimentos incompleta | Media | Bajo | Usuario puede editar macros en pantalla de confirmación |
