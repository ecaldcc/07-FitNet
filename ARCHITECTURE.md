# Arquitectura del proyecto

> Documento vivo. Se actualiza a medida que el proyecto evoluciona.  
> Última actualización: 2026-09-22 — Fase 6: análisis 3D, rutinas y perfil. Ver la sección final.

---

## Visión general

La aplicación es una PWA que corre completamente en el cliente (sin servidor). La cámara del celular alimenta un pipeline de detección de poses que produce landmarks en cada frame; esos landmarks se usan para calcular ángulos articulares, contar repeticiones y dar retroalimentación visual.

```
Cámara (getUserMedia)
      │
      ▼
 <video> element  ──────────────────────────────────┐
      │                                              │
      ▼                                              ▼
 MediaPipe PoseLandmarker              <canvas> overlay
 detectForVideo(video, timestamp)      DrawingUtils.drawConnectors()
      │                                DrawingUtils.drawLandmarks()
      ▼
 landmarks[33]  (x, y, z, visibility)
      │
      ▼
 geometry/angles.ts
 calculateAngle(A, B, C) → grados
      │
      ▼
 exercises/*.ts
 máquina de estados → phase, reps, feedback
      │
      ▼
 ui/FeedbackOverlay.tsx
 color según feedback (verde / amarillo / rojo)
```

---

## Módulos y responsabilidades

### `src/pose/camera.ts`
Único punto de contacto con la API del navegador para la cámara. Solicita el stream con `getUserMedia`, aplica las constraints de mobile (`facingMode: 'environment'`, resolución ideal 640×480), y conecta el stream al elemento `<video>`. Expone `startCamera()` y `stopCamera()` como funciones puras sin estado interno.

### `src/pose/poseDetector.ts`
Encapsula el ciclo de vida de `PoseLandmarker`. Tiene estado interno de módulo (singleton): una vez inicializado, el landmarker se reutiliza en todos los frames. Expone `initPoseDetector()` (async, llamar una vez al montar) y `detectAndDraw()` (llamar en cada frame del loop de animación). El dibujo del esqueleto vive aquí mientras no haya lógica de feedback por color; cuando exista `FeedbackOverlay`, el dibujo se separará.

### `src/ui/Onboarding/`
Flujo de onboarding de 4 pantallas que se muestra la primera vez que el usuario abre la app (controlado por `localStorage('ob_complete_v1')`).

- **`OnboardingFlow.tsx`** — Orquestador: mantiene el índice de pantalla activo y renderiza la pantalla correspondiente. La pantalla Splash auto-avanza a los 2.8s; las demás esperan acción del usuario.
- **`SplashScreen.tsx`** — Logo animado (SVG inline con gradiente verde-teal y landmarks amarillos), nombre de la app y loader de tres puntos pulsantes.
- **`HowItWorksScreen.tsx`** — Tres step-cards que explican el flujo: apuntar cámara → detección de pose → feedback de técnica. Iconos SVG inline por paso.
- **`PermissionsScreen.tsx`** — Solicita permisos de cámara (`getUserMedia`) y notificaciones (`Notification.requestPermission`) con contexto claro antes de que el navegador muestre el diálogo nativo. Si el usuario deniega la cámara, CameraView lo maneja con su propio mensaje de error.
- **`GetStartedScreen.tsx`** — Ilustración SVG del esqueleto de pose detection, selector visual de cámara frontal/trasera (guarda en `localStorage('preferred_camera')`), y botón CTA que llama `onComplete()`.
- **`onboarding.css`** — Todos los estilos del onboarding aislados. Usa `@keyframes` con `animation-delay` escalonado para el efecto stagger en cada pantalla. Design tokens en `:root`.

**Flujo de datos:**
```
App.tsx
  └─ localStorage('ob_complete_v1') === '1'?
       No → <OnboardingFlow onComplete={handleComplete} />
               └─ onComplete() → localStorage.setItem + setReady(true)
       Sí → <CameraView />
               └─ useState inicial lee localStorage('preferred_camera')
```

### `src/ui/CameraView.tsx`
Componente React responsable del ciclo de vida de la cámara y del ejercicio activo.
- `squatTrackerRef` / `curlTrackerRef` — instancias en `useRef`. Persisten entre cambios de cámara y de ejercicio.
- `activeExRef` — ref (no estado) al ejercicio activo, leído en el RAF loop para evitar stale closures.
- En cada iteración del RAF: llama `detectAndDraw()`, pasa landmarks al tracker activo, dispara voz en transiciones, actualiza `exerciseResult`.
- Botón inferior izquierdo: selector de ejercicio (cicla squat → curl → …). Al cambiar, ambos trackers se resetean.
- Botón inferior derecho: selector de cámara frontal/trasera (sin cambios respecto a v1).
- Renderiza `<ExerciseOverlay>` con el resultado y el nombre del ejercicio activo.

### `src/ui/ExerciseOverlay.tsx`
Overlay DOM sobre el video (no canvas). Recibe una interfaz mínima `OverlayResult { reps, feedbackLevel, feedbackMessage }` y un prop `exerciseName: string`. Compatible estructuralmente con `SquatResult` y `BicepCurlResult`. Renderiza:
- Label de ejercicio (top-left, pill semitransparente)
- Barra inferior (`ex-bottom-bar`): fondo negro 80% + blur, borde izquierdo colorido via `--feedback-color` CSS custom property, mensaje de feedback (izquierda) y contador de reps (derecha).
- El contador usa `key={result.reps}` para que React remonte el `<span>` y reinicie la animación CSS `ex-rep-pop` en cada nueva rep.
- `pointer-events: none` en el contenedor — los toques pasan al botón de cámara (z-index: 10).

**Detección de fondo en `SquatTracker`:**

```
Frame N:   kneeAngle baja → minAngleSeen se actualiza, prevKneeAngle = N
Frame N+1: kneeAngle sube > prevKneeAngle + 2° → atBottom = true (un solo frame)
           voz evalúa minAngleSeen (no kneeAngle actual)
Frame N+2: bottomFired = true → atBottom = false en todos los frames restantes
Al volver a standing → reset: bottomFired = false, minAngleSeen = 180
```

`GOOD_DEPTH_ANGLE` se exporta desde `squat.ts` para que `CameraView` use el mismo umbral sin duplicarlo.

### `src/ui/useSpeech.ts`
Hook de voz que envuelve `window.speechSynthesis`. Expone `speak(text)` memoizado con `useCallback`. Cancela la locución anterior antes de cada nueva para evitar cola de mensajes. Idioma: `es-ES`. Disparado desde `CameraView` solo en transiciones de estado (no por frame) vía `prevRef`.

### `src/geometry/angles.ts`
Módulo de geometría pura sin dependencias externas. Expone:
- `Point2D` — tipo mínimo `{ x: number; y: number }`. Compatible estructuralmente con `NormalizedLandmark` de MediaPipe (que tiene campos adicionales `z` y `visibility`).
- `calculateAngle(A, B, C): number` — ángulo en el vértice B usando `atan2`. Rango: 0–180°. Sin efectos secundarios; apto para pruebas unitarias aisladas.

```
radians = atan2(Cy−By, Cx−Bx) − atan2(Ay−By, Ax−Bx)
degrees = |radians × 180/π|
if degrees > 180 → degrees = 360 − degrees
```

### `src/exercises/squat.ts`
Máquina de estados para sentadilla. Exporta la clase `SquatTracker` con:
- `update(landmarks: NormalizedLandmark[]): SquatResult` — recibe los 33 landmarks del frame actual, devuelve fase, reps, nivel de feedback y mensaje.
- `reset()` — reinicia la fase y el contador.

**Diagrama de estados:**
```
         kneeAngle > 160°               kneeAngle < 100°
standing ──────────────────► transition ◄──────────────────── squatting
   ▲                           │   ▲                              │
   │     kneeAngle > 160°      ▼   │      kneeAngle < 100°        │
   └─────────────────────── (zona) ────────────────────────────────┘
                           100°–160°
                         (conserva fase)

Rep contada: squatting → standing
```

**Umbrales:** `STANDING_ANGLE=160°`, `BOTTOM_ANGLE=100°`, `GOOD_DEPTH=90°`.  
**Feedback:** verde `<90°`, amarillo `100–90°`, idle en transición/de pie.  
**Visibilidad:** si algún landmark clave (caderas, rodillas, tobillos) tiene `visibility < 0.5`, se retorna feedback idle sin resetear el estado interno.

### `src/exercises/bicepCurl.ts`
Segundo ejercicio implementado. Exporta `BicepCurlTracker` con el mismo contrato que `SquatTracker` (`update()` / `reset()`).

**Landmarks usados:** LEFT_SHOULDER(11)→LEFT_ELBOW(13)→LEFT_WRIST(15) y RIGHT_SHOULDER(12)→RIGHT_ELBOW(14)→RIGHT_WRIST(16).

**Detección de vista:**
- Visibilidad mínima del trío hombro-codo-muñeca por lado.
- Si `|visLeft - visRight| > 0.35` → vista lateral: solo el brazo más visible.
- Si diferencia menor → vista frontal/45°: ambos brazos.

**Clase interna `ArmTracker`:** Máquina de estados para un solo brazo. Usa el mismo algoritmo de "inversión de tendencia" que `SquatTracker` para detectar la cima real:
```
bajando (ángulo decreciente) → silencio (acumulando minAngleSeen)
cima real (ángulo sube +2°)  → atTop = true, evalúa minAngleSeen
subiendo → silencio
extendido → voz dice el número de rep
```

**Umbrales:** `EXTENDED_ANGLE=160°`, `FLEXED_ANGLE=60°`, `GOOD_FORM_ANGLE=50°`.

**Conteo:** Cada `ArmTracker` lleva sus propias reps; `BicepCurlTracker.reps` = suma de ambos. Soporta reps alternas (mancuernas) y simultáneas (barra).

### `src/exercises/` (próximas semanas)
Los ejercicios pendientes (press de hombro, plancha, lunges) seguirán el patrón de `SquatTracker` y `BicepCurlTracker`. Cuando haya 3+ ejercicios se evaluará si extraer `baseExercise.ts` con la lógica compartida.

### `src/storage/session.ts` (próximas semanas)
Wrapper de `localStorage` para persistir el historial de sesiones (ejercicio, reps, duración, fecha). No depende de ningún otro módulo del proyecto.

---

## Decisiones de diseño

### Video + Canvas superpuestos
El video ocupa la pantalla completa con `object-fit: cover`. El canvas se superpone con `position: absolute; inset: 0` y el mismo tamaño CSS. El canvas tiene fondo transparente por defecto, así el video se ve a través de él y solo el esqueleto dibujado es visible.

**Por qué no dibujar directamente sobre el video:** El elemento `<video>` no expone un contexto 2D. El canvas es el único mecanismo estándar para superponer gráficos sobre un stream de video en el browser.

**Dimensiones internas del canvas:** En cada frame, `canvas.width` y `canvas.height` se sincronizan con `video.videoWidth` y `video.videoHeight` (resolución real del stream). El CSS estira el canvas para llenar el contenedor. Esto garantiza que los landmarks (que vienen normalizados 0–1 por MediaPipe) se dibujen con la misma relación de aspecto que el video real.

### Singleton de módulo para PoseLandmarker
`PoseLandmarker` se crea una vez y se guarda en una variable de módulo (`let landmarker`). La inicialización es cara (descarga del modelo ~5 MB, compilación WASM); rehacerla en cada render o en cada montaje de componente sería un error de rendimiento severo. El patrón de singleton de módulo es más simple que un Context de React y suficiente para este caso donde solo hay una instancia activa de la cámara.

### Separación de inicialización y detección
`initPoseDetector()` es una operación async de una sola vez. `detectAndDraw()` es síncrona y se llama 30-60 veces por segundo. Mantenerlas separadas permite que el componente muestre un estado de carga mientras el modelo se descarga, sin bloquear el hilo principal.

### Loop de animación en React (`useEffect` + `requestAnimationFrame`)
El loop de `requestAnimationFrame` se inicia dentro de `useEffect` y se cancela con `cancelAnimationFrame` en el cleanup. La variable `cancelled` (flag booleano local al efecto) previene actualizaciones de estado sobre un componente ya desmontado, lo que generaría memory leaks y warnings de React.

### `facingMode: 'environment'` como default
La cámara trasera del celular tiene mejor calidad óptica y permite al usuario verse a sí mismo durante el ejercicio usando la pantalla como espejo. Para ejercicios donde el usuario necesita ver sus propias manos (bíceps curl), esta configuración es la correcta. Si en el futuro se necesita la cámara frontal, se expone como parámetro de `startCamera()`.

### Mobile-first: `dvw` / `dvh` y `viewport-fit=cover`
Se usa `100dvw` / `100dvh` (dynamic viewport units) en lugar de `100vw` / `100vh` porque en móviles las barras del navegador cambian de tamaño al hacer scroll, y las unidades dinámicas se adaptan a ese cambio. `viewport-fit=cover` en el meta viewport permite que el contenido llegue hasta el notch en iPhones con `padding-safe-area` cuando sea necesario.

---

## Lo que está pendiente de arquitectura

| Área | Decisión pendiente |
|---|---|
| Separación de dibujo y feedback | Cuando exista la lógica de color (verde/rojo/amarillo), `detectAndDraw` se dividirá: MediaPipe detecta, `FeedbackOverlay` dibuja según el nivel de feedback |
| Routing entre pantallas | Al agregar `ExerciseSelector`, se necesita decidir si usar estado de React (`useState`) o un router mínimo (`wouter` o React Router). Preferir estado hasta que la complejidad lo justifique |
| Plugin PWA | Diferido hasta semana 5-6. Ver DEC-006 en `DECISIONS.md` |
| Plataforma de deploy | GitHub Pages, Vercel o Netlify. Sin decidir aún |

---

# Fase 6 · Arquitectura de Fitnet

> Agregado el 2026-09-22. Todo lo anterior en este documento describe la aplicación
> tal como se entregó al curso el 22/05/2026 y sigue siendo válido salvo donde esta
> sección lo corrige explícitamente.

## Qué cambió en el flujo de datos

El cambio de fondo es que el pipeline dejó de operar sobre coordenadas de pantalla y
pasó a operar sobre coordenadas métricas 3D. El diagrama de la sección de visión general
sigue siendo correcto hasta el detector; de ahí en adelante se bifurca.

```
 MediaPipe PoseLandmarker
 detectForVideo(video, timestamp)
      │
      ├─── result.landmarks[33]  (normalizados de PANTALLA)
      │         └──► DrawingUtils ──► <canvas> overlay   [solo dibujo]
      │
      └─── result.worldLandmarks[33]  (METROS, origen en cadera)
                │
                ▼
           pose/landmarkFilter.ts   filtro One Euro: quita el temblor (DEC-036)
                │
                ├──► geometry/vectors3d.ts
                │    calculateAngle3D, getBodyOrientation,
                │    getTorsoInclination, asymmetryRatio
                │         │
                │         ▼
                │    exercises/*.ts   máquina de estados
                │         │
                │         ├──► analysis/movementQuality.ts
                │         │    ¿el ciclo fue un movimiento real?
                │         │         │
                │         │         ▼
                │         └──► analysis/fatigue.ts
                │              ¿está cayendo el rendimiento?
                │                    │
                │                    ▼
                │              ui/ExerciseOverlay.tsx
                │
                └──► ui/Pose3DView.tsx   [Three.js, esqueleto rotable]
```

La separación importante es que `landmarks` quedó reducido a un rol puramente visual.
Ninguna decisión del sistema se toma ya sobre coordenadas de pantalla.

## Módulos nuevos

### `src/geometry/vectors3d.ts`
Álgebra vectorial sobre los `worldLandmarks`. `calculateAngle3D` usa producto punto en
lugar de `atan2` porque en tres dimensiones no hay un sentido de giro definido sin un
plano de referencia, y para una articulación solo importa la apertura. Incluye además
orientación del torso respecto a la cámara, inclinación de tronco y asimetría entre lados.
Exporta `LM`, la tabla de índices de landmarks que antes estaba duplicada en cada tracker.

### `src/analysis/movementQuality.ts`
`MovementAnalyzer` acumula muestras de ángulo con marca de tiempo en un buffer acotado y
evalúa cada ciclo antes de aceptarlo como repetición. Es el módulo que separa un
movimiento real de un artefacto. Cada tracker le declara la forma de su ciclo: si el
esfuerzo es el ángulo mínimo o el máximo, y si el ciclo empieza con el esfuerzo o con la
bajada. Sin ese dato no se sabe cuál mitad es la concéntrica (DEC-035).

La suavidad se mide contando cambios de dirección con histéresis: solo cuenta un cambio
cuando el ángulo retrocede más de 12° desde el último extremo. La primera versión contaba
cada cambio de signo de la velocidad y el temblor normal de MediaPipe hacía rechazar todas
las repeticiones.

### `src/analysis/fatigue.ts`
`FatigueDetector` establece una línea base con las primeras repeticiones de la serie y
después mide la degradación. Es independiente del ejercicio: consume las métricas que
produce `MovementAnalyzer` y no sabe nada de ángulos ni de anatomía.

### `src/exercises/types.ts`
Contrato común de los tres trackers. Antes cada uno definía su propio tipo de resultado
sin nada en común, lo que obligaba a la interfaz a hacer verificaciones de tipo para
leer campos compartidos. Ahora todos extienden `BaseExerciseResult`.

### `src/exercises/catalog.ts`
Catálogo de 60 ejercicios en 11 grupos musculares. El campo `tracking` distingue los que
tienen análisis por cámara de los de conteo manual o temporizador, y esa distinción se
propaga a toda la interfaz.

### `src/routines/` y `src/profile/`
Dominio puro, sin dependencias de React salvo el contexto. `types.ts` define el modelo,
`storage.ts` la persistencia y las plantillas sembradas, `context.ts` el contrato y el
hook, y `RoutinesProvider.tsx` el componente proveedor. Están separados porque la recarga
en caliente de Vite solo preserva el estado de archivos que exportan únicamente
componentes. El perfil deriva todas sus estadísticas del historial de sesiones en vez de
mantener contadores acumulados.

Las sesiones se registran con `recordSession` del contexto, que guarda y actualiza el
estado en el mismo instante. Todas las rutas, incluidas las de entrenamiento, viven
dentro del proveedor.

### `src/routines/manualWorkout.ts`
Reductor puro del modo manual: series, rondas de rest-pause y dropset, descansos y
temporizador. El tiempo llega en cada acción y nunca se lee adentro, lo que lo vuelve
determinista y comprobable sin relojes reales (DEC-037). La pantalla
`ui/screens/ManualWorkoutScreen.tsx` solo le agrega relojes, voz, vibración y el bloqueo
de pantalla apagada.

### `src/pose/landmarkFilter.ts`
Filtro One Euro por coordenada de cada landmark (DEC-036). Se aplica una sola vez en la
vista de cámara, antes de los trackers y del visor, así que todo lo que mide trabaja
sobre la señal filtrada.

### `src/exercises/tutorials.ts` y `src/exercises/demoPoses.ts`
Fichas de técnica de los 60 ejercicios y demos animadas de los 3 con análisis (DEC-033).
Las demos generan los 33 landmarks por cinemática directa, en el mismo sistema de
coordenadas que `worldLandmarks`. Eso permite dibujarlas con el mismo visor y usarlas como
datos de prueba del motor.

### `src/ui/startExercise.ts`
Única función que decide si un ejercicio arranca en la cámara o en el modo manual. Ningún
botón de la app arma esa ruta por su cuenta.

### `src/ui/tutorial/`
La ficha (`ExerciseTutorialContent`), la demo (`ExerciseDemo3D`) y la hoja deslizable
(`TutorialSheet`). La ficha no incluye botones: cada contenedor agrega los suyos. La hoja
se monta con un portal porque el selector de ejercicios usa `backdrop-filter`, que
atraparía a cualquier elemento fijo dentro de él.

### `scripts/pruebas-motor.mjs`
Banco de 37 pruebas sin cámara ni dependencias nuevas, con `npm run test:motor`
(DEC-038). Compila los módulos puros y los alimenta con las demos a distintas velocidades
de cuadro y con ruido.

### `src/storage/localStore.ts`
Generaliza a todo el proyecto el acceso defensivo que DEC-024 había aplicado punto por
punto. Además de capturar excepciones, valida la forma del dato recuperado, de modo que
un JSON corrupto o de un esquema anterior no se propague.

### `src/ui/Pose3DView.tsx`
Visor Three.js. Se actualiza por API imperativa y no por props, porque un render de React
por cuadro a 60 cuadros por segundo no deja margen al hilo principal en un celular.
Se carga de forma diferida para que Three.js no bloquee el arranque de la cámara.
Ancla el punto más bajo de los pies visibles al suelo de la escena: como `worldLandmarks`
tiene el origen en la cadera, sin esto en una sentadilla subirían los pies en vez de bajar
la cadera.

## Decisiones de diseño nuevas

### Los trackers ya no reciben el tiempo implícitamente
`update(world, timeMs)` recibe la marca de tiempo del cuadro como parámetro. Antes la
máquina de estados era puramente posicional y no necesitaba saber cuándo ocurría cada
cuadro. La validación temporal y la detección de fatiga dependen de esa marca, y pasarla
explícitamente en vez de leer `performance.now()` dentro del tracker mantiene a los
trackers deterministas y testeables.

### Separación entre reiniciar y empezar serie nueva
`reset` borra todo, incluido el contador de repeticiones. `startNewSet` reinicia solo la
línea base de fatiga y el buffer de análisis. Sin esa distinción, cerrar una serie
perdería el conteo acumulado del ejercicio.

### La interfaz no re-renderiza por cuadro
Los acumuladores de la sesión viven en referencias y no en estado de React. Solo el
resultado del ejercicio provoca render, porque es lo único que el usuario ve cambiar.

## Lo que quedó pendiente

| Área | Pendiente |
|---|---|
| Prueba en celular | Nada de la fase 6 se probó con una persona frente a la cámara. El banco de pruebas y el navegador de escritorio cubren todo lo demás, pero la sección 10 del CLAUDE.md es clara: la prueba que vale es en celular |
| Calibración | Los umbrales de validación, de fatiga y del filtro pasan el banco de pruebas con movimientos sintéticos. Falta ajustarlos con movimientos de personas reales |
| Capa de IA aprendida | Conversada y no construida. Reemplazaría los umbrales por segmentación de fases con un modelo temporal sobre los 33 puntos normalizados. Las demos por cinemática directa y el banco de pruebas son una base útil para generar y validar datos |
| Ejercicios con análisis | Siguen siendo tres. Los otros 57 se ejecutan en el modo manual, sin análisis de técnica |
| Superserie | La app indica alternar ejercicios pero no los encadena, y el editor no permite elegir el ejercicio pareado |
| Tamaño del paquete | El fragmento principal pasa de 500 kB por el contenido de las fichas y las pantallas nuevas. Se puede partir por ruta con `React.lazy` si la carga inicial en celular resulta lenta |
