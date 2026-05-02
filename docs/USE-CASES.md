# Casos de Uso
## Macro Tracker — App Personal de Seguimiento Nutricional

**Versión:** 1.0  
**Fecha:** Mayo 2026  
**Actor principal:** Usuario (uso personal, sin autenticación)

---

## Diagrama de casos de uso (texto)

```
Usuario
  ├── UC-01: Registrar comida por foto con IA
  ├── UC-02: Registrar comida por búsqueda manual
  ├── UC-03: Editar y confirmar macros antes de guardar
  ├── UC-04: Ver resumen del día actual
  ├── UC-05: Navegar entre días
  ├── UC-06: Eliminar una comida registrada
  ├── UC-07: Consultar historial de días
  ├── UC-08: Buscar alimento en historial
  ├── UC-09: Ver detalle de alimento registrado
  ├── UC-10: Configurar metas diarias de macros
  └── UC-11: Instalar la app como PWA en iPhone
```

---

## UC-01: Registrar comida por foto con IA

**Actor:** Usuario  
**Precondición:** La app está abierta en la vista del día. El dispositivo tiene cámara o carrete con fotos.  
**Postcondición:** La comida queda guardada en la base de datos con sus macros y aparece en la lista del día.

### Flujo principal
1. El usuario toca el botón **"Agregar comida"** (verde, pantalla principal)
2. El sistema muestra la pantalla de selección de modo
3. El usuario selecciona **"Foto con IA"**
4. El sistema muestra la interfaz de captura de imagen con un campo opcional de peso
5. El usuario toca el área de foto — en iPhone se abre directamente la cámara trasera
6. El usuario toma la foto o la selecciona del carrete
7. El sistema muestra el preview de la imagen
8. *(Opcional)* El usuario ingresa el peso en gramos
9. El usuario toca **"Analizar con IA"**
10. El sistema envía la imagen en base64 a la API de Google Gemini 2.0 Flash
11. Gemini devuelve: nombre del alimento, peso estimado, calorías, proteína, carbs, grasa y nivel de confianza
12. El sistema navega a la pantalla de confirmación con los datos pre-cargados → **continúa en UC-03**

### Flujos alternativos
- **5a.** El usuario selecciona desde el carrete en vez de la cámara → continúa igual
- **8a.** El usuario no ingresa peso → Gemini lo estima visualmente (`peso_fue_estimado: true`)
- **11a.** Gemini devuelve confianza < 0.60 → el sistema muestra el indicador en rojo con recomendación de editar
- **11b.** La API de Gemini retorna error (rate limit, key inválida) → el sistema muestra mensaje de error. El usuario puede reintentar o volver atrás

---

## UC-02: Registrar comida por búsqueda manual

**Actor:** Usuario  
**Precondición:** La app está abierta en la vista del día.  
**Postcondición:** La comida queda guardada con macros calculados exactamente según la base de datos USDA.

### Flujo principal
1. El usuario toca **"Agregar comida"**
2. El sistema muestra la pantalla de selección de modo
3. El usuario selecciona **"Buscar alimento"**
4. El sistema muestra un campo de búsqueda con el teclado activo
5. El usuario escribe el nombre del alimento (ej: "pollo crudo")
6. El sistema filtra en tiempo real la base de datos de 192 alimentos
7. El sistema muestra hasta 8 resultados con valores por 100g
8. El usuario toca el alimento deseado (ej: "Pechuga de pollo cruda")
9. El sistema muestra la tarjeta del alimento seleccionado y el campo de peso
10. El usuario ingresa el peso en gramos (ej: 267)
11. El sistema calcula y muestra en tiempo real: `(267/100) × valores_base` = 320.4 kcal, 60.1g P, 0g C, 6.9g G
12. El usuario toca **"Continuar"**
13. El sistema navega a la pantalla de confirmación → **continúa en UC-03**

### Flujos alternativos
- **6a.** La búsqueda incluye variaciones de género (ej: "crudo" encuentra "cruda") gracias a comparación de raíz
- **6b.** No hay resultados → el sistema muestra "Sin resultados" y el usuario puede modificar la búsqueda
- **10a.** El usuario ingresa 0 o deja el campo vacío → el botón "Continuar" permanece deshabilitado

---

## UC-03: Editar y confirmar macros antes de guardar

**Actor:** Usuario  
**Precondición:** El usuario viene de UC-01 o UC-02 con datos pre-cargados.  
**Postcondición:** La comida queda guardada en la base de datos.

### Flujo principal
1. El sistema muestra la pantalla de confirmación con:
   - Foto (si viene de UC-01) o badge de "Alta confianza" (si viene de UC-02)
   - Indicador de confianza con color (verde/amarillo/rojo)
   - Categoría pre-seleccionada según hora del día
   - Todos los campos editables: nombre, peso (g), calorías, proteína, carbs, grasa
2. El usuario revisa los valores
3. *(Opcional)* El usuario corrige cualquier campo tocándolo y editando
4. *(Opcional)* El usuario cambia la categoría (Desayuno/Almuerzo/Cena/Snack)
5. El usuario toca **"Guardar"**
6. El sistema hace POST a `/api/meals` con todos los datos
7. Si hay imagen, el sistema la redimensiona a 800px con sharp y la guarda en `/public/uploads/`
8. El sistema navega de vuelta a la vista del día
9. La lista se actualiza mostrando la nueva comida y los totales actualizados

### Flujos alternativos
- **5a.** El usuario toca "Cancelar" → vuelve al paso anterior (captura o búsqueda)
- **6a.** Error de red → el sistema muestra mensaje de error; el usuario puede reintentar

---

## UC-04: Ver resumen del día actual

**Actor:** Usuario  
**Precondición:** La app está instalada y se abre desde el ícono de pantalla de inicio o navegador.  
**Postcondición:** El usuario ve el estado nutricional del día en curso.

### Flujo principal
1. El usuario abre la app
2. El sistema redirige automáticamente a `/day/YYYY-MM-DD` con la fecha de hoy
3. El sistema consulta la base de datos por las comidas del día y las metas configuradas
4. El sistema muestra:
   - Header: "Hoy" en verde con flechas de navegación (flecha derecha deshabilitada)
   - Card de calorías: total consumido, barra de progreso vs. meta, restante
   - 3 cards (Proteína / Carbs / Grasa): valor consumido, barra de progreso, restante
   - Botón verde "Agregar comida"
   - Lista de comidas agrupadas por categoría con thumbnail, nombre, macros y botón de eliminar

### Flujos alternativos
- **3a.** No hay comidas registradas → la lista muestra el estado vacío: "Sin comidas registradas"
- **3b.** No hay metas configuradas → el sistema usa defaults (2000 kcal, 150g P, 200g C, 65g G)

---

## UC-05: Navegar entre días

**Actor:** Usuario  
**Precondición:** El usuario está en la vista de cualquier día.

### Flujo principal
1. El usuario toca la flecha **←** en el header
2. El sistema navega a `/day/YYYY-MM-DD` del día anterior
3. El sistema carga las comidas y totales de ese día
4. El header muestra el día de la semana y fecha en gris (no es hoy)

### Flujos alternativos
- **1a.** El usuario toca **→** → navega al día siguiente (solo disponible si no es el día actual)
- **1b.** El usuario toca un día en el Historial → navega directamente a ese día

---

## UC-06: Eliminar una comida registrada

**Actor:** Usuario  
**Precondición:** La vista del día muestra al menos una comida.

### Flujo principal
1. El usuario toca el ícono de basura en una comida
2. El sistema muestra una confirmación nativa del navegador: "¿Eliminar esta comida?"
3. El usuario confirma
4. El sistema hace DELETE a `/api/meals/[id]`
5. Si la comida tiene imagen guardada, el sistema la elimina del disco
6. La lista se actualiza y los totales se recalculan

### Flujos alternativos
- **3a.** El usuario cancela → no se realiza ninguna acción

---

## UC-07: Consultar historial de días

**Actor:** Usuario  
**Precondición:** El usuario tiene al menos un día con comidas registradas.

### Flujo principal
1. El usuario toca **"Historial"** en la barra de navegación inferior
2. El sistema muestra la pantalla `/history`
3. El sistema carga todos los días con comidas, ordenados del más reciente al más antiguo
4. Cada día muestra: día de semana, fecha completa, calorías totales, y desglose P/C/G
5. El usuario toca un día
6. El sistema navega a `/day/YYYY-MM-DD` de ese día → continúa UC-04

---

## UC-08: Buscar alimento en historial

**Actor:** Usuario  
**Precondición:** El usuario está en la pantalla de Historial.

### Flujo principal
1. El usuario escribe en el campo de búsqueda (ej: "avena")
2. El sistema espera 300ms (debounce) y consulta `/api/history?q=avena`
3. El sistema muestra los resultados: todos los registros históricos que contengan "avena" en el nombre
4. Cada resultado muestra: thumbnail, nombre, fecha y calorías
5. El usuario toca un resultado → continúa UC-09

### Flujos alternativos
- **3a.** Sin resultados → el sistema muestra "Sin resultados para 'avena'"
- **1a.** El usuario borra la búsqueda → el sistema vuelve a mostrar la lista de días (UC-07)

---

## UC-09: Ver detalle de alimento registrado

**Actor:** Usuario  
**Precondición:** El usuario ha seleccionado un resultado en UC-08.

### Flujo principal
1. El sistema muestra un bottom sheet (panel deslizable desde abajo) con:
   - Foto o ícono del alimento
   - Nombre, categoría, peso en gramos, fecha
   - Grid de macros: calorías, proteína, carbs, grasa
   - Botón "Ver día completo →"
2. El usuario puede cerrar el panel tocando fuera de él
3. *(Opcional)* El usuario toca "Ver día completo →" → navega al día completo de esa comida

---

## UC-10: Configurar metas diarias de macros

**Actor:** Usuario  
**Precondición:** El usuario está en cualquier pantalla.

### Flujo principal
1. El usuario toca **"Ajustes"** en la barra de navegación inferior
2. El sistema muestra la pantalla `/settings` con los valores actuales pre-cargados
3. El sistema muestra un campo de entrada por cada macro (Calorías, Proteína, Carbohidratos, Grasa)
4. El sistema muestra un resumen con la distribución calórica en porcentaje (P·C·G)
5. El usuario modifica los valores deseados
6. El usuario toca **"Guardar metas"**
7. El sistema hace PUT a `/api/goals`
8. El botón cambia a **"✓ Metas guardadas"** en verde por 2.5 segundos
9. Las barras de progreso en la vista del día reflejan los nuevos valores

### Flujos alternativos
- **2a.** Primera vez (sin metas configuradas) → el sistema pre-carga los valores por defecto: 2000 kcal, 150g P, 200g C, 65g G

---

## UC-11: Instalar la app como PWA en iPhone

**Actor:** Usuario  
**Precondición:** El usuario tiene Safari en iPhone y acceso a la URL de la app.

### Flujo principal
1. El usuario abre la URL de la app en Safari en su iPhone
2. El usuario toca el botón **Compartir** (ícono de caja con flecha hacia arriba)
3. El usuario selecciona **"Agregar a pantalla de inicio"**
4. El sistema muestra el nombre "Macro Tracker" y el ícono de la app
5. El usuario confirma tocando **"Agregar"**
6. La app aparece como ícono en la pantalla de inicio del iPhone
7. Al abrirla, se ejecuta en modo standalone (sin barra de Safari) con tema de color verde esmeralda

### Postcondición
- La app funciona como una aplicación nativa
- Los assets estáticos están cacheados por el service worker
- El historial y datos locales persisten entre sesiones

---

## Resumen de casos de uso por pantalla

| Pantalla | Casos de uso |
|---|---|
| `/day/[date]` | UC-04, UC-05, UC-06 |
| `/day/[date]/add` | UC-01, UC-02, UC-03 |
| `/history` | UC-07, UC-08, UC-09 |
| `/settings` | UC-10 |
| iPhone (Safari) | UC-11 |
