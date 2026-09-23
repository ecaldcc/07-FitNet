# Log de Decisiones Técnicas

Cada entrada sigue el formato: **fecha · contexto · alternativas consideradas · razón**.

---

## DEC-001 · Framework UI: React
**Fecha:** 2026-04-29  
**Contexto:** El proyecto necesita un framework para construir la interfaz. El anteproyecto dejaba abierta la elección entre React y Vue.  
**Alternativas:** Vue 3 (Composition API).  
**Razón:** React tiene mayor cantidad de ejemplos y referencias de integración con MediaPipe en GitHub, lo que reduce el riesgo de bloquearse al integrar la detección de poses. Ambos son viables técnicamente; el criterio fue disponibilidad de ejemplos del stack específico.

---

## DEC-002 · Build tool: Vite
**Fecha:** 2026-04-29  
**Contexto:** Se necesita un bundler/dev server para el proyecto React.  
**Alternativas:** Create React App (CRA).  
**Razón:** CRA está en modo mantenimiento y su ecosistema está en declive. Vite ofrece arranque en frío casi instantáneo, HMR nativo, y es el estándar actual de la industria para proyectos React nuevos. El template `react-ts` de Vite genera una configuración limpia y minimal.

---

## DEC-003 · Lenguaje: TypeScript
**Fecha:** 2026-04-29  
**Contexto:** El stack base es JavaScript; TypeScript es opcional pero suma tipado estático.  
**Alternativas:** JavaScript (ES2020+) plano.  
**Razón:** El equipo evaluó la curva de aprendizaje y decidió asumirla. El tipado explícito es especialmente valioso en este proyecto porque MediaPipe devuelve arrays de landmarks con estructura fija (33 puntos, cada uno con `x`, `y`, `z`, `visibility`); tener esos tipos definidos desde el inicio previene bugs silenciosos en los cálculos angulares.

---

## DEC-004 · API de MediaPipe: @mediapipe/tasks-vision (Tasks API)
**Fecha:** 2026-04-29  
**Contexto:** MediaPipe tiene dos APIs JS: la legacy (`@mediapipe/pose`) y la moderna (`@mediapipe/tasks-vision`).  
**Alternativas:** `@mediapipe/pose` (API legacy, basada en callbacks y archivos `.wasm` separados por solución).  
**Razón:** La API legacy está en modo solo-mantenimiento y su documentación oficial ya no recibe actualizaciones. `@mediapipe/tasks-vision` es la API unificada actual, tiene `PoseLandmarker` con modo `VIDEO` optimizado para streams de cámara, e incluye `DrawingUtils` para renderizar el esqueleto sin código manual de canvas. El modo `VIDEO` de `detectForVideo(video, timestampMs)` está diseñado específicamente para el patrón `requestAnimationFrame`.

---

## DEC-005 · Carga del WASM de MediaPipe: CDN (jsDelivr)
**Fecha:** 2026-04-29  
**Contexto:** Los archivos WASM de MediaPipe deben estar disponibles en tiempo de ejecución. Pueden servirse localmente (bundleados con Vite) o desde CDN.  
**Alternativas:** Copiar los archivos `.wasm` a `public/` y servirlos localmente.  
**Razón:** Bundlear WASM con Vite 8 requiere configuración no trivial (`assetsInlineLimit`, `optimizeDeps.exclude`, headers COOP/COEP para SharedArrayBuffer). Usar jsDelivr con versión fijada (`@0.10.22/wasm`) es la ruta recomendada en la documentación oficial de MediaPipe y elimina ese problema por completo. La desventaja es que requiere conexión a internet en el primer uso; aceptable para el alcance del proyecto.  
**Versión fijada:** `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm`

---

## DEC-007 · Directorio de desarrollo: C:\Dev-AI (fuera de OneDrive)
**Fecha:** 2026-04-29  
**Contexto:** El proyecto estaba alojado dentro de la carpeta de OneDrive (`OneDrive - Universidad Mariano Gálvez\NOVENO SEMESTRE\INTELIGENCIA ARTIFICAL\Project-Training-AI\`). Al iniciar el servidor de desarrollo de Vite, se producía el error `EPERM -4048: operation not permitted, rmdir node_modules\.vite\deps` porque OneDrive bloqueaba archivos de `node_modules` durante la sincronización en tiempo real.  
**Alternativas:** (a) Pausar OneDrive manualmente cada vez que se desarrolla; (b) excluir `node_modules` de la sincronización vía atributos del sistema; (c) mover el proyecto fuera de OneDrive.  
**Razón:** OneDrive no es adecuado como entorno de desarrollo activo: sincroniza `node_modules` (>150 MB, miles de archivos pequeños), genera locks que rompen herramientas de build, y no agrega valor porque el versionado real se hará con Git/GitHub. `C:\Dev-AI` es una ruta local sin sincronización en la nube, limpia y sin espacios en el path. OneDrive queda para almacenar documentos y entregables del curso, no código fuente.  
**Impacto:** El `CLAUDE.md` se movió al interior de `entrenador-personal-ia\` (donde le corresponde según la estructura del proyecto). Las sesiones futuras de Claude Code deben iniciarse desde `C:\Dev-AI\entrenador-personal-ia`.

---

## DEC-014 · Detección de fondo real: mínimo local por giro de ángulo
**Fecha:** 2026-05-06  
**Contexto:** La voz disparaba al entrar a la fase "squatting" (primer frame con `kneeAngle < 100°`), no en el punto más bajo real. Esto causaba discrepancia: la voz decía "Baja un poco más" con el ángulo de entrada (~98°), pero el visual luego mostraba verde cuando el usuario llegaba a 85°.  
**Raíz del problema:** Dos relojes distintos: el visual se actualiza cada frame con el ángulo actual; la voz disparaba una sola vez en la transición de fase, con el ángulo de ese instante preciso.  
**Solución:** Detección de mínimo local por inversión de tendencia. El tracker acumula `minAngleSeen` (mínimo ángulo visto desde que entró a squatting) y detecta el fondo cuando `kneeAngle > prevKneeAngle + 2°` (el ángulo empezó a subir más de 2°). En ese frame exacto: `atBottom = true`, se evalúa `minAngleSeen` y se dispara la voz. La condición estricta `>` (no `>=`) más el umbral de 2° previene falsos positivos por ruido de landmarks.  
**Flujo temporal resultante:**
```
bajando      → silencio (acumulando minAngleSeen)
fondo real   → voz evalúa minAngleSeen: "¡Excelente!" o "Baja más"
subiendo     → silencio
standing     → voz dice solo el número de rep
```
**Por qué no "bottom = cuando kneeAngle es mínimo":** El mínimo solo se conoce a posteriori (necesitarías ver el siguiente frame para saber que era el más bajo). La inversión de tendencia (+2°) es el primer frame donde es matemáticamente confirmable que el mínimo ya pasó.

---

## DEC-013 · Retroalimentación por voz: Web Speech API (SpeechSynthesis)
**Fecha:** 2026-05-06  
**Contexto:** Los usuarios que usan la cámara frontal tienen los ojos en el espejo de la pantalla y no pueden leer el texto del overlay fácilmente. Se evaluó cómo dar feedback auditivo sin costos ni dependencias externas.  
**Alternativas:** (a) Audio pregrabado (MP3s) — requiere assets, más MB, gestión de AudioContext; (b) Servicio TTS en la nube (AWS Polly, Google TTS) — costo, latencia, requiere backend; (c) Web Speech API nativa (`SpeechSynthesis`) — sin dependencias, sin costo, disponible en iOS Safari y Android Chrome modernos.  
**Razón:** `SpeechSynthesis` es la opción correcta para este proyecto: zero costo, zero dependencias, cero bytes extra en el bundle, y la API es estable. La voz en `es-ES` está disponible en todos los dispositivos móviles del mercado objetivo (Android 5+ y iOS 7+).  
**Detalle de implementación:** Hook `useSpeech()` con `speechSynthesis.cancel()` antes de cada locución para evitar acumulación. Disparos solo en transiciones de estado (no por frame): (1) rep completada → número + elogio cada 5/10; (2) llegada al fondo → "¡Buena profundidad!" o "Baja un poco más". El callback de `useSpeech` está memoizado con `useCallback` para evitar que el `useEffect` de RAF se re-ejecute innecesariamente.  
**Limitación iOS conocida:** El primer `speak()` debe ocurrir en el contexto de un evento de usuario. El tap "Comenzar a entrenar" en el onboarding desbloquea el contexto de audio; las llamadas posteriores desde RAF funcionan correctamente.

---

## DEC-012 · Overlay de feedback: barra inferior de ancho completo con CSS custom property
**Fecha:** 2026-05-06  
**Contexto:** La pill original (fondo 18% de opacidad, texto pequeño) era poco visible sobre el video en condiciones de luz variable. El rep counter separado requería que el usuario mirara dos zonas distintas de la pantalla.  
**Alternativas:** (a) Mantener pill + counter separados pero hacerlos más grandes; (b) overlay semitransparente sobre toda la pantalla; (c) barra inferior de ancho completo con el mensaje y el counter en la misma fila.  
**Razón:** La barra inferior unifica en un solo bloque toda la información relevante (mensaje + reps). El fondo oscuro al 80% con `backdrop-filter: blur(16px)` garantiza legibilidad sobre cualquier fondo de video. El borde izquierdo colorido (`border-left: 5px solid var(--feedback-color)`) da la señal semántica de color sin depender de que el usuario lea el texto. El counter a la derecha es inmediatamente reconocible como número de reps (patrón establecido por Peloton, Apple Fitness+). La animación pop en el counter (`key={result.reps}` → remount de React → reinicio de `@keyframes`) da feedback inmediato de que la rep fue registrada.

---

## DEC-011 · Feedback de ejercicio: overlay DOM sobre canvas (no dibujo en canvas)
**Fecha:** 2026-05-06  
**Contexto:** El contador de reps y el mensaje de feedback necesitan renderizarse sobre el video. Dos opciones principales: (a) dibujar texto/formas directamente en el canvas 2D junto al esqueleto, o (b) un componente React superpuesto con `position: absolute`.  
**Alternativas:** (a) Canvas 2D con `ctx.fillText()` y `ctx.fillRect()` para fondo/texto; (b) componente DOM con `position: absolute; z-index: 5; pointer-events: none`.  
**Razón:** El overlay DOM permite usar backdrop-filter blur, border-radius y las mismas fuentes del sistema que usa el onboarding, sin código de layout manual en canvas. El `pointer-events: none` en el contenedor del overlay garantiza que los toques pasen al botón de cambio de cámara (z-index: 10). El re-render de React a ~60fps es aceptable para actualizar un número y un string; React solo modifica los nodos del DOM que cambiaron.  
**Estado en RAF:** `setExerciseResult()` se llama cada frame. Se decidió no throttlear por ahora — el contador debe ser inmediato. Si en celulares de gama baja aparece jank, el primer paso sería memoizar el componente con `React.memo`.

---

## DEC-009 · Cálculo de ángulos: atan2 con tipo propio Point2D
**Fecha:** 2026-05-06  
**Contexto:** La función de cálculo angular necesita recibir landmarks de MediaPipe pero `geometry/angles.ts` no debería depender del paquete `@mediapipe/tasks-vision` para mantenerse aislado y testeable.  
**Alternativas:** (a) Importar `NormalizedLandmark` directamente; (b) usar un tipo local compatible estructuralmente; (c) recibir `x, y` como parámetros separados.  
**Razón:** Se define `Point2D { x, y }` en el propio módulo. `NormalizedLandmark` tiene `x`, `y`, `z`, `visibility` — es compatible estructuralmente, así que puede pasarse donde se espera `Point2D` sin casting. El módulo de geometría queda sin dependencias externas, lo que facilita pruebas unitarias aisladas.  
**Fórmula:** `atan2(Cy−By, Cx−Bx) − atan2(Ay−By, Ax−Bx)`, valor absoluto, espejo si > 180°. Rango de salida: 0–180°.

---

## DEC-010 · Máquina de estados de sentadilla: histéresis de umbral doble
**Fecha:** 2026-05-06  
**Contexto:** Detectar la fase "abajo" / "arriba" de la sentadilla a partir del ángulo de rodilla. Una solución naive con un único umbral genera "flutter" (oscilación rápida entre estados) cuando el ángulo oscila alrededor del umbral por ruido en los landmarks.  
**Alternativas:** (a) Umbral único con debounce por tiempo; (b) promedio de N frames; (c) histéresis con umbral doble (zona muerta).  
**Razón:** La histéresis con zona muerta (100°–160°) es la solución estándar para máquinas de estados con señales ruidosas. La zona intermedia conserva el estado anterior, eliminando el flutter sin introducir latencia artificial. Es determinista, sin parámetros de tiempo y comprensible por cualquier integrante del equipo.  
**Umbrales:** `STANDING_ANGLE = 160°` (entrada al estado "de pie"), `BOTTOM_ANGLE = 100°` (entrada al estado "abajo"), `GOOD_DEPTH_ANGLE = 90°` (feedback verde). Calibrados empíricamente para sentadilla estándar con vista lateral o de 45°.  
**Conteo de reps:** Transición `squatting → standing` = +1 rep. Esto garantiza que la rep se cuente solo cuando el usuario vuelve a la posición alta completa.

---

## DEC-008 · Onboarding: implementado en React con CSS nativo
**Fecha:** 2026-05-06  
**Contexto:** El alcance del MVP no incluía onboarding, pero el equipo decidió agregarlo antes de la entrega porque la app arranca directamente en la cámara sin contexto para el usuario. Se evaluó si usar una librería de animaciones o slides (Framer Motion, Swiper).  
**Alternativas:** (a) Framer Motion para animaciones; (b) Swiper.js para el swipe entre pantallas; (c) CSS puro con `@keyframes`.  
**Razón:** CSS nativo con `@keyframes` y `animation-delay` escalonado produce el mismo resultado visual sin agregar dependencias al `package.json`. Framer Motion (~150 KB) y Swiper son overkill para 4 pantallas estáticas con transición slide-in unidireccional. La animación de "stagger" se logra con `:nth-child` + `animation-delay`, técnica estándar y sin JS.  
**Decisiones de diseño:**  
- Design system combinado: Apple Fitness (tipografía bold, blanco puro) + Samsung Health (cards redondeadas en gris claro) + Strava (CTA naranja `#FC4C02`).  
- Splash auto-avanza a los 2.8s; las demás pantallas requieren acción del usuario.  
- PermissionsScreen llama a `getUserMedia` con el contexto visible para que el navegador muestre el diálogo de permiso con sentido para el usuario.  
- GetStartedScreen guarda la preferencia de cámara en `localStorage('preferred_camera')` y `CameraView` la lee en el `useState` inicial, sin props drilling.  
- `localStorage('ob_complete_v1')` controla si el onboarding ya fue completado; la clave incluye versión para poder forzar re-show si se cambia el flujo en el futuro.

---

## DEC-015 · Curl de bíceps: detección de cima por inversión de tendencia + soporte frontal/lateral
**Fecha:** 2026-05-15  
**Contexto:** Segundo ejercicio de la app. El curl de bíceps puede ejecutarse con la cámara frontal (vista de frente, ambos brazos visibles) o lateral (perfil, un solo brazo dominante en frame). Necesitaba decidir cómo manejar ambas vistas con un único tracker.  
**Alternativas:** (a) Dos trackers separados (uno para cada brazo) con lógica de selección manual; (b) un único tracker que detecta automáticamente el modo de vista; (c) pedir al usuario que indique si usa vista frontal o lateral.  
**Razón:** Se implementó detección automática de vista por diferencia de visibilidad: si `|visibilidad_izquierda - visibilidad_derecha| > 0.35`, la app infiere vista lateral y usa solo el brazo más visible. Si la diferencia es menor, usa ambos brazos (vista frontal o de 45°). El umbral 0.35 es empírico — un brazo mirando de frente al objetivo es significativamente más visible que el opuesto.  
**Detección de cima:** Igual que el fondo en sentadillas — inversión de tendencia (+2°). El ángulo de codo sube durante la contracción (menor grado = más contraído); cuando el ángulo vuelve a crecer más de 2°, se confirma que se pasó la cima. `GOOD_FORM_ANGLE = 50°` es el umbral de "contracción completa".  
**Ángulos:** `EXTENDED_ANGLE = 160°` (brazo extendido), `FLEXED_ANGLE = 60°` (entrada a fase contraída), `GOOD_FORM_ANGLE = 50°` (contracción completa).  
**Conteo de reps:** Cada `ArmTracker` cuenta sus propias reps; `BicepCurlTracker` suma ambos. Esto permite contar reps alternas (curl con mancuernas alternando brazos) y reps simultáneas (barra).

---

## DEC-018 · Press de Hombro: ángulos seguros, polaridad invertida y detección de pico
**Fecha:** 2026-05-15  
**Contexto:** Tercer ejercicio. El shoulder press usa los mismos landmarks que el curl (shoulder-elbow-wrist), pero la polaridad del movimiento es inversa: el esfuerzo AUMENTA el ángulo del codo (pesas overhead = ángulo alto ≈ 150-165°). El pico del movimiento es el MÁXIMO de ángulo, no el mínimo.  
**Umbrales y justificación clínica:**  
- `PRESSED_ANGLE = 150°`: entrada a fase "pressed". Zona de histéresis: 100°–150° (50° de zona muerta).  
- `LOWERED_ANGLE = 100°`: entrada a fase "lowered" (pesas a nivel de hombro, codo ≈ 90°).  
- `GOOD_LOCKOUT_ANGLE = 145°`: mínimo para feedback verde. Se usa 145° en lugar de 170°+ para no exigir hiperextensión del codo bajo carga; MediaPipe también tiende a subestimar ligeramente el ángulo en vista frontal.  
- `SAFE_LOW_ANGLE = 80°`: feedback rojo por debajo de este valor. Bajar el codo por debajo de la línea del hombro con carga externa comprime el tendón supraespinoso entre el acromion y la cabeza humeral (síndrome de impingement). 80° es el límite clínico conservador para press frontal.  
**Detección de pico:** Análoga al curl pero invertida. `fallingFrames` cuenta frames donde el ángulo desciende ≥ 0.5°/frame; `atPeak` se confirma con 3 frames consecutivos. `maxAngleSeen` acumula el máximo (vs. `minAngleSeen` del curl). `peakFired` actúa como gate del conteo (DEC-017).  
**Ángulo primario:** `Math.max(left, right)` — el brazo más extendido indica la calidad del press (vs. `Math.min` del curl donde menor = más contraído).  
**Estrategia de voz:** Clasificado como "pico al fin del esfuerzo" (DEC-016): `atPeak` guarda en `pressFormFeedbackRef`, `reps++` emite utterance combinado `"${n}. ¡Extensión completa!"`.

---

## DEC-017 · Conteo de reps: gate obligatorio por confirmación de cima/fondo
**Fecha:** 2026-05-15  
**Contexto:** Al probar el curl en celular se detectó que movimientos bruscos del dispositivo o la aparición momentánea de un brazo en frame disparaban reps falsas. El ángulo del codo puede saltar de 165° a 45° y volver en 2 frames por ruido o movimiento de cámara, cumpliendo la condición `flexed → extended` sin que el usuario haya hecho ningún curl.  
**Raíz del problema:** El conteo de reps solo chequeaba la transición de fase (`flexed → extended`), pero no si el movimiento había sido validado como intencional. El mecanismo de confirmación (`topFired` / `bottomFired`) ya existía para detectar el punto extremo del movimiento, pero no estaba siendo usado como prerequisito del conteo.  
**Consecuencia secundaria:** Sin `topFired`, `curlFormFeedbackRef` estaba vacío cuando el conteo disparaba → el usuario solo escuchaba el número, sin evaluación de forma.  
**Solución:** Agregar `&& this.topFired` (curl) / `&& this.bottomFired` (sentadilla, aplicar en futura revisión) al condicional de `reps++`. Una rep solo se registra si previamente se confirmó el punto extremo del movimiento mediante N frames consecutivos de tendencia sostenida.  
**Garantía resultante:** `atTop` siempre ocurre ANTES de `reps++` (son eventos excluyentes en el mismo frame; `topFired` solo se resetea en el mismo frame que `reps++`). Esto garantiza que `curlFormFeedbackRef` siempre tiene el mensaje de forma cuando el conteo dispara.  
**Patrón para todos los ejercicios:** Todo tracker debe tener un flag `peakConfirmed` (o `topFired`/`bottomFired`) que actúe como gate del conteo. Nunca contar una rep solo por transición de fase.

---

## DEC-016 · Arquitectura de feedback de voz: confirmación por frames y prioridad sin colisiones
**Fecha:** 2026-05-15  
**Contexto:** Durante pruebas del curl de bíceps se detectaron dos problemas: (1) la voz disparaba con pequeños movimientos de ruido de MediaPipe, dando feedback incorrecto antes de que el usuario completara la contracción; (2) el feedback de forma (`atTop`/`atBottom`) y el conteo de reps (`reps > prevReps`) disparaban en secuencia rápida, y como `useSpeech` cancela la locución anterior, el conteo cortaba el feedback de forma o viceversa.  
**Raíz del problema 1:** `DESCENDING_THRESHOLD = 2°` en un solo frame es insuficiente para landmarks de brazo, que tienen más ruido que los de pierna. Un spike de ruido de 3° confirma falsamente que se pasó la cima.  
**Raíz del problema 2:** Para el curl, `atTop` y `reps++` ocurren dentro de ~200ms (la confirmación de cima precede en pocos frames a la extensión completa). `speechSynthesis.cancel()` en `useSpeech` hace que el último utterance siempre gane, suprimiendo el primero.  
**Solución 1 — Confirmación por frames consecutivos:** Reemplazar el threshold de un frame por un contador de `risingFrames`. `atTop` solo se confirma después de `MIN_RISING_FRAMES = 3` frames consecutivos donde `angle > prevAngle + 0.5°`. Esto requiere ~50ms de tendencia sostenida a 60fps, filtrando spikes de ruido sin latencia perceptible. El parámetro `MIN_RISING_FRAMES` puede calibrarse por ejercicio según el ruido esperado del joint (brazo > pierna).  
**Solución 2 — Estrategia por tipo de ejercicio:**  
- **Ejercicios cuyo peak/bottom es el fin del esfuerzo** (curl, press de hombro): `atTop` no habla; guarda el mensaje en un ref `curlFormFeedbackRef`. Cuando `reps++`, se emite un único utterance combinado: `"3. ¡Excelente contracción!"`. Sin colisión posible.  
- **Ejercicios cuyo peak/bottom es el punto medio del recorrido** (sentadilla, lunge): `atBottom` habla de inmediato (el feedback "baja más" es accionable mientras el usuario sigue abajo). Cuando `reps++`, se respeta un cooldown de 1500ms desde la última locución; si está dentro del cooldown, el conteo de esa rep se suprime (el usuario ya recibió audio en ese ciclo).  
**Patrón para futuros ejercicios:** Al diseñar cada ejercicio, clasificar el peak/bottom según si ocurre al fin del esfuerzo o a mitad, y elegir la estrategia correspondiente. Documentar la clasificación en el tracker del ejercicio.  
**Impacto:** `ArmTracker` agrega `risingFrames: number` al estado; `CameraView` agrega `curlFormFeedbackRef` y `lastSpeakTimeRef`.

---

## DEC-006 · PWA implementada manualmente (sin vite-plugin-pwa)
**Fecha original de diferimiento:** 2026-04-29 · **Fecha de resolución:** 2026-05-15  
**Contexto:** `vite-plugin-pwa` falló por incompatibilidad de peer dependency con Vite 8 (solo soporta hasta Vite 7). Se había diferido para la semana 5-6.  
**Alternativas evaluadas en semana 5-6:** (a) Downgrade a Vite 7 — riesgo de romper otras dependencias; (b) `--legacy-peer-deps` — plug-in sin probar con Vite 8, posibles bugs silenciosos; (c) implementación manual del SW + manifest.  
**Decisión:** Implementación manual. El `public/manifest.json` declara `display: standalone`, `theme_color: #FC4C02`, `background_color: #0a0a0a` y referencia `favicon.svg` como único ícono (escalable SVG, compatible con Chrome/Edge/Firefox; Safari requiere `apple-touch-icon` separado, cubierto con `<link>` en `index.html`). El `public/sw.js` usa estrategia **cache-first para app shell** (mismo origen) y **network-only para CDN externos** (archivos WASM y modelo de MediaPipe son demasiado grandes para el cache del SW; el cache HTTP del browser ya los maneja). El SW se registra en `main.tsx` en el evento `load` para no bloquear el hilo principal durante el arranque. La versión del cache (`CACHE = 'entrenador-ia-v2'`) se sube manualmente con cada deploy para forzar re-descarga en los usuarios con el PWA instalado.  
**Por qué no Workbox CLI:** Agrega un paso de build extra y una dependencia de CLI. Para un SW de 30 líneas con una sola estrategia, el overhead no está justificado.

---

## DEC-019 · Plataforma de deploy: Vercel
**Fecha:** 2026-05-15  
**Contexto:** Cierra la decisión pendiente de sección 5.3 del anteproyecto (GitHub Pages vs. Vercel vs. Netlify). La app necesita deploy en URL pública para la entrega del 22/05.  
**Alternativas:** (a) GitHub Pages — requiere rama `gh-pages` o configurar Actions; no tiene preview deployments automáticos por PR; solo soporta sitios estáticos sin rewrite rules; (b) Netlify — similar a Vercel en features, interface menos familiar; (c) Vercel — integración directa con GitHub, deploy automático en cada push a `main`, preview URL por rama, zero-config para proyectos Vite (detecta automáticamente el framework y usa `vite build`).  
**Decisión:** Vercel. El proyecto Vite se detecta automáticamente; no requiere `vercel.json` ni configuración adicional. El output directory `dist/` y el comando `vite build` son inferidos por Vercel. El plan Hobby (gratuito) es suficiente para el alcance del proyecto y no requiere tarjeta de crédito (cumple restricción dura 5).  
**Impacto:** Cada push a `main` dispara un deploy automático. La URL de producción queda fija para incluir en los entregables del curso.

---

## DEC-020 · HTTPS en desarrollo local: @vitejs/plugin-basic-ssl
**Fecha:** 2026-05-15  
**Contexto:** La API `getUserMedia` con `facingMode: 'environment'` (cámara trasera) exige un contexto seguro (HTTPS o `localhost`). Al exponer el dev server en la red local con `host: true` para probar desde el celular, `localhost` ya no aplica — el celular accede por IP (ej. `192.168.x.x`), que es HTTP sin TLS. Cierra la decisión pendiente de sección 5.4 (ngrok vs. deploy continuo).  
**Alternativas:** (a) ngrok — tunnel HTTPS gratuito pero requiere instalar la herramienta, autenticarse, y la URL cambia en cada sesión; (b) usar directamente la URL de Vercel como entorno de pruebas — implica hacer push por cada cambio, ciclo muy lento; (c) certificado local autofirmado con mkcert — requiere instalar la CA en cada celular de prueba; (d) `@vitejs/plugin-basic-ssl` — genera un certificado autofirmado en memoria, el navegador del celular muestra la advertencia "sitio no seguro" pero se puede ignorar una vez para desarrollo.  
**Decisión:** `@vitejs/plugin-basic-ssl`. No requiere instalación externa, no tiene tokens que expiren, la URL es siempre la IP local del equipo, y el certificado autofirmado es aceptable para desarrollo (el deploy de producción en Vercel tiene TLS real). La advertencia del navegador se ignora una vez y no vuelve a aparecer en la misma sesión.  
**Limitación:** iOS Safari rechaza certificados autofirmados con más severidad que Android Chrome. Si se necesita probar en iOS, la alternativa es usar la URL de preview de Vercel.

---

## DEC-021 · Delay de 450 ms al cambiar de cámara en PWA instalada
**Fecha:** 2026-05-15  
**Contexto:** Al cambiar entre cámara frontal y trasera desde el PWA instalado (modo standalone), `getUserMedia` lanzaba "Could not start video source" de forma intermitente — error que no aparecía al usar la app desde el navegador. La causa: `track.stop()` es síncrono en la API JavaScript, pero el hardware del dispositivo (sensor de cámara) no libera el recurso de forma inmediata; llamar `getUserMedia` antes de que el hardware esté libre produce la colisión.  
**Por qué solo en PWA instalada:** El navegador introduce su propio buffer de tiempo entre páginas o pestañas, lo que da margen suficiente para que el hardware se libere. El PWA standalone no tiene ese buffer — el cambio de cámara ocurre dentro del mismo proceso y el ciclo stop → start es inmediato.  
**Solución:** Flag `cameraStopPendingRef` (booleano) que se activa en el cleanup del `useEffect` cuando se detiene un stream. Al inicio del siguiente `setup()`, si el flag está activo, se espera 450 ms antes de llamar `getUserMedia`. Los 450 ms son un valor empírico conservador que cubre la mayoría de dispositivos Android e iOS. El flag se resetea al inicio del delay para no acumular esperas en cambios rápidos sucesivos.  
**Alternativas descartadas:** (a) reintentar `getUserMedia` con backoff exponencial — mayor complejidad y el usuario ve el error momentáneamente; (b) detectar el error específico "Could not start video source" y recuperar — frágil, el mensaje de error varía por navegador y versión.

---

## DEC-023 · Press de hombro: conteo unificado con cooldown (sin conteo por brazo)
**Fecha:** 2026-05-16  
**Contexto:** El diseño original de `ShoulderPressTracker` mantenía un contador de reps independiente en cada `ArmPressTracker` (`left.reps + right.reps`), igual que el diseño original del curl antes de DEC-022. En press bilateral (ambos brazos simultáneos), cada brazo completaba su ciclo de pressed → lowered y ambos contadores incrementaban, resultando en el doble de reps reales. El bug fue identificado por Codex al auditar el código tras DEC-022.  
**Decisión:** Aplicar exactamente el mismo patrón de DEC-022. `ArmPressTracker` deja de mantener su propio contador y emite `repCompleted: boolean` cuando su ciclo cumple todos los gates (`peakFired` confirmado). `ShoulderPressTracker` tiene el único contador `reps` y lo incrementa con OR logic + cooldown de **15 frames (~250 ms a 60 fps)**.  
**Comportamiento resultante:** Idéntico al DEC-022: press bilateral = 1 rep; press alterno = 1 rep por brazo; vista lateral = 1 rep por ciclo.  
**Por qué no se detectó antes:** El ejercicio se implementó (DEC-018) antes de que el bug del curl se corrigiera (DEC-022); al corregir el curl se documentó el patrón pero no se auditó el press.

---

## DEC-024 · localStorage defensivo: try/catch y validación de valor
**Fecha:** 2026-05-16  
**Contexto:** `App.tsx` y `CameraView.tsx` leían y escribían `localStorage` directamente sin manejo de errores. En Safari en modo privado y en algunos navegadores con storage bloqueado por política del sistema operativo o del propio navegador (sandboxed iframes, restricciones corporativas), `localStorage.getItem()` lanza `SecurityError`, rompiendo la inicialización de React. Adicionalmente, `CameraView.tsx` hacía `localStorage.getItem('preferred_camera') as FacingMode` —un cast exclusivamente de TypeScript que no valida en runtime— lo que permitía que un valor inválido (ej. `'back'`, `null`, vacío) llegara como constraint a `getUserMedia`, causando que la cámara fallara con un error críptico.  
**Decisión:** Envolver los cuatro puntos de acceso (2 `getItem` + 2 `setItem`) en bloques `try/catch`. En el catch, retornar el valor por defecto seguro (`false` para el onboarding, `'environment'` para la cámara) y continuar sin lanzar. En `CameraView`, reemplazar el cast por validación explícita: `v === 'user' || v === 'environment'`; cualquier otro valor cae al default.  
**Por qué no solo `?? 'environment'`:** El operador `??` cubre `null` y `undefined` pero no valores inválidos presentes en storage (`'back'`, `'front'`, una cadena vacía), ni el lanzamiento de excepciones de storage bloqueado. La combinación try/catch + validación explícita cubre ambos casos.

---

## DEC-025 · Service Worker: network-first para HTML, cache-first para assets estáticos
**Fecha:** 2026-05-16  
**Contexto:** El SW original (`v2`) aplicaba cache-first a todas las requests del mismo origen, incluido `index.html`. `index.html` no tiene hash en su nombre (a diferencia de `assets/index-HASH.js`), por lo que puede quedar cacheado indefinidamente en una versión vieja después de un deploy. Un usuario con la PWA instalada recibiría el HTML antiguo que apunta a assets ya eliminados del servidor, dejando la app inoperable o mostrando versiones obsoletas. El bug fue identificado por Codex.  
**Decisión:** Separar la estrategia según el tipo de request:  
- **Requests de navegación** (`e.request.mode === 'navigate'`, corresponde a `index.html`): **network-first**. Siempre se intenta la red; el resultado se guarda en cache. Si la red falla (offline), se sirve el HTML cacheado como fallback. Esto garantiza que el usuario siempre recibe el HTML del deploy actual, con las referencias correctas a los assets hasheados.  
- **Assets estáticos** (JS, CSS, iconos): **cache-first**. Los assets de Vite son content-hashed; si el contenido cambia, el nombre cambia. Son inmutables por definición: una URL dada siempre corresponde al mismo contenido. Cache-first es correcto y eficiente para ellos.  
- **CDN externos** (WASM, modelo MediaPipe): sin cambio, siguen siendo network-only (demasiado grandes; el cache HTTP del browser los maneja).  
**Bump de versión:** `v2 → v3` en la constante `CACHE` para forzar que el `activate` del nuevo SW limpie el cache viejo y todos los clientes con la PWA instalada reciban el comportamiento correcto.  
**Por qué no precaching en install:** El precaching requiere conocer los nombres de los assets hasheados en tiempo de build. Sin `vite-plugin-pwa` (descartado en DEC-006 por incompatibilidad con Vite 8), inyectar ese manifiesto requeriría un script custom de post-build. La combinación network-first para HTML + cache-first para assets resuelve el problema raíz sin necesidad de precaching.

---

## DEC-022 · Curl de bíceps: conteo unificado con cooldown (sin conteo por brazo)
**Fecha:** 2026-05-15  
**Contexto:** El diseño original de `BicepCurlTracker` mantenía un contador de reps independiente en cada `ArmTracker` (`left.reps + right.reps`). En vista frontal con curls bilaterales (ambos brazos simultáneos), cada brazo completaba su ciclo y ambos contadores incrementaban, resultando en el doble de reps reales. Sin un modelo de IA que clasifique automáticamente si el ejercicio es unilateral o bilateral, no es posible distinguir el caso sin introducir heurísticas adicionales frágiles.  
**Alternativas consideradas:**  
(a) Pedir al usuario que seleccione el modo (unilateral / bilateral) — agrega fricción en la UI y requiere que el usuario entienda la distinción.  
(b) Detectar el modo automáticamente por correlación temporal entre ambos brazos — requiere buffer de historial de ángulos y lógica de correlación, complejidad desproporcionada al alcance.  
(c) Conteo unificado en `BicepCurlTracker` con OR logic + cooldown de frames — simple, determinista, cubre los dos casos sin intervención del usuario.  
**Decisión:** Opción (c). `ArmTracker` ya no mantiene contador propio; emite `repCompleted: boolean` cuando su ciclo cumple todos los gates. `BicepCurlTracker` tiene el único contador `reps` y lo incrementa cuando `leftRes.repCompleted || rightRes.repCompleted` con `repCooldown === 0`. Tras contar, activa un cooldown de **15 frames (~250 ms a 60 fps)**. El cooldown absorbe la señal del segundo brazo en curls bilaterales (llega en 0-50 ms) sin bloquear curls alternos donde el segundo brazo dispara típicamente >500 ms después.  
**Comportamiento resultante:**  
- Curl bilateral (barra o mancuernas simultáneas): 1 rep por ciclo.  
- Curl alterno (mancuernas, un brazo después del otro): 1 rep por brazo → 2 reps por ciclo completo.  
- Vista lateral (un solo brazo visible): 1 rep por ciclo, igual que antes.  
**Trade-off aceptado:** En curls alternos muy rápidos (<250 ms entre brazos), el cooldown podría suprimir el segundo brazo. A 60 fps y con la cadencia normal de un curl (>500 ms por brazo), este caso no debería ocurrir en condiciones reales de entrenamiento.

---

## DEC-026 · Migración del análisis a 3D con `worldLandmarks`
**Fecha:** 2026-09-19  
**Contexto:** Todos los cálculos angulares operaban sobre `result.landmarks`, las coordenadas normalizadas de pantalla. Ese espacio es una proyección: el ángulo medido depende de la posición y orientación de la cámara respecto al usuario. Un usuario girado 45° produce segmentos proyectados más cortos y ángulos sistemáticamente sobreestimados, al punto de que una sentadilla profunda real podía medirse como 120° en vez de 85°. La consecuencia práctica era pérdida de precisión y conteo poco confiable cuando el celular no estaba colocado en el ángulo ideal.  
**Hallazgo clave:** `PoseLandmarker` ya devolvía en cada cuadro un segundo conjunto, `result.worldLandmarks`, con coordenadas métricas 3D, origen en el punto medio de la cadera e independientes de la cámara. La aplicación lo recibía y lo descartaba. No hizo falta cambiar de modelo ni agregar ninguna dependencia de visión: el dato ya estaba disponible.  
**Alternativas consideradas:**  
(a) Corregir la proyección 2D con un factor derivado de la orientación estimada — requiere calibración, es frágil y solo compensa parcialmente.  
(b) Pedirle al usuario que se coloque siempre en el mismo ángulo — traslada el problema a la persona y no resuelve la imprecisión.  
(c) Usar `worldLandmarks` y calcular ángulos con producto punto en 3D.  
**Decisión:** Opción (c). Se agrega `src/geometry/vectors3d.ts` con `calculateAngle3D` basada en producto punto, más utilidades de orientación corporal, inclinación de tronco y asimetría. `detectAndDraw` pasa a devolver `PoseFrame` con ambos conjuntos: `screen` para dibujar el esqueleto sobre el video y `world` para toda la matemática. Los tres trackers se migran a `update(world, timeMs)`.  
**Por qué producto punto y no `atan2`:** En 3D no existe un sentido de giro bien definido sin un plano de referencia, y para una articulación solo importa la apertura. El coseno se limita a [-1, 1] antes de `Math.acos` porque la acumulación de error en punto flotante puede producir 1.0000000002, cuyo arcocoseno es NaN.  
**Validaciones nuevas que esto habilita:** Inclinación de tronco en sentadilla, arqueo lumbar en press y desplazamiento del codo en curl. Las tres eran indetectables en 2D porque el movimiento ocurre en profundidad, fuera del plano de la imagen, sin que la proyección cambie.  
**Se conserva `angles.ts`:** El módulo 2D no se elimina. Queda como referencia y para cualquier cálculo que deba operar sobre coordenadas de pantalla.

---

## DEC-027 · Validación temporal de repeticiones
**Fecha:** 2026-09-19  
**Contexto:** El criterio de conteo era puramente posicional: si el ángulo cruzaba dos umbrales en secuencia, la repetición contaba. Ese criterio no distingue una sentadilla real de un tirón brusco, de un movimiento de ajuste o de un salto de landmarks de MediaPipe. Por eso "cualquier movimiento" sumaba repeticiones, que era la queja principal del usuario junto con la imprecisión de DEC-026.  
**Decisión:** Agregar `src/analysis/movementQuality.ts` con la clase `MovementAnalyzer`, que acumula muestras de ángulo con marca de tiempo y evalúa cada ciclo antes de aceptarlo. Una repetición legítima debe cumplir cuatro condiciones a la vez: recorrido angular mínimo, duración mínima, duración máxima y continuidad del recorrido. Un artefacto no cumple las cuatro.  
**Umbrales por ejercicio:** Cada tracker ajusta los valores a la cadencia natural de su movimiento. La sentadilla exige 40° de recorrido y 800 ms; el curl 50° y 700 ms; el press 45° y 700 ms.  
**Criterio de calibración:** Los umbrales se eligieron deliberadamente permisivos. Es preferible dejar pasar alguna repetición dudosa a rechazar repeticiones legítimas de alguien que entrena lento o con pausa, porque el segundo error destruye la confianza en la aplicación mientras que el primero solo la degrada.  
**Medición de suavidad:** Se cuentan las inversiones de signo de la velocidad angular, no la magnitud del jerk. Una repetición real tiene dos fases y por lo tanto un solo cambio de dirección significativo; un movimiento errático produce muchos. Contar inversiones es más robusto frente al ruido de MediaPipe porque no se deja arrastrar por un único cuadro atípico con derivada enorme. Se aplica un piso de ruido para que el temblor del modelo no cuente como inversión.  
**Retroalimentación al usuario:** Cuando una repetición se descarta, el motivo se informa por texto y por voz. Sin ese aviso el usuario concluye que la aplicación falló, en vez de entender que el movimiento no fue válido.
**Actualización 2026-09-22:** La medición de suavidad descrita arriba rechazaba todas las repeticiones con el temblor normal de MediaPipe. Se reemplazó por conteo de cambios de dirección con histéresis, y se agregó una duración mínima de la fase de esfuerzo. Ver DEC-035.  

---

## DEC-028 · Detección de fatiga por degradación del patrón de movimiento
**Fecha:** 2026-09-19  
**Contexto:** El usuario pidió detección de fatiga como parte del alcance de Fitnet. No hay sensores adicionales disponibles ni se pueden agregar sin romper la restricción de costo cero.  
**Fundamento:** En entrenamiento de fuerza la velocidad de la fase concéntrica cae de forma monótona conforme se acumula fatiga dentro de una serie, incluso con la carga constante. Es el principio del entrenamiento basado en velocidad. Junto con la pérdida de recorrido y el aumento de asimetría entre lados, da una estimación razonable a partir de los mismos landmarks que ya se procesan.  
**Decisión:** Agregar `src/analysis/fatigue.ts` con `FatigueDetector`. Las primeras tres repeticiones de cada serie establecen la línea base de velocidad y recorrido. A partir de ahí se compara el promedio de las últimas tres contra esa línea base. El puntaje combina caída de velocidad con peso 2, pérdida de recorrido con peso 1.5 y asimetría con peso 40, y se limita a 100.  
**Por qué promediar las últimas tres y no la última:** Una repetición con un landmark ruidoso no debe disparar un salto de nivel. La asimetría además se suaviza con media móvil.  
**Niveles:** fresco, moderado a partir de 10% de caída, alto a partir de 20% y crítico a partir de 30%. El nivel crítico activa `shouldRest` y el mensaje pasa a tener prioridad sobre el resto de la retroalimentación.  
**Limitación declarada:** No es un diagnóstico médico ni una medición de fatiga fisiológica. Es un indicador de degradación del patrón, útil para sugerir descanso.  
**Alcance de la línea base:** Se reinicia con `startNewSet` al cerrar cada serie, no con `reset`, para que el contador de repeticiones no se pierda al empezar una serie nueva.
**Actualización 2026-09-22:** En curl y press la ventana de análisis empezaba cuando el brazo ya había subido, y lo que se medía como fase de esfuerzo era la bajada. La caída de velocidad al subir era invisible. Corregido en DEC-035.  

---

## DEC-029 · Visor 3D del esqueleto con Three.js
**Fecha:** 2026-09-19  
**Contexto:** El análisis pasó a 3D en DEC-026, pero la pantalla seguía mostrando únicamente la proyección plana del esqueleto sobre el video. No había forma de verificar visualmente que la profundidad se estuviera midiendo, ni de mostrarle al usuario qué información nueva tiene el sistema.  
**Alternativas consideradas:**  
(a) Proyectar el esqueleto 3D a mano sobre el canvas 2D existente — sin dependencias, pero con rotación, iluminación y orden de profundidad resueltos manualmente.  
(b) Three.js.  
**Decisión:** Opción (b), autorizada explícitamente por el usuario tras plantearle el costo. Se agrega `src/ui/Pose3DView.tsx`.  
**Decisiones de implementación:**  
- Actualización por API imperativa mediante `useImperativeHandle`, no por props. El bucle de detección corre a 60 cuadros por segundo y provocar un render de React por cuadro dejaría sin margen al hilo principal del celular.  
- Los huesos son un único `LineSegments` cuyos vértices se reescriben en el lugar, y las articulaciones un `InstancedMesh` de 33 esferas. Ambas decisiones evitan crear objetos por cuadro.  
- Se rota un grupo contenedor y no la cámara, para que la luz quede fija respecto al espectador y el esqueleto no se oscurezca al girar.  
- El eje Y de `worldLandmarks` apunta hacia abajo y Three.js lo usa hacia arriba, de ahí la inversión de signo al copiar las coordenadas.  
- La limpieza descarta geometrías, materiales y el contexto WebGL a mano. El recolector de basura de JavaScript no libera memoria de GPU.  
**Carga diferida:** Three.js agregaba cerca de 540 kB al paquete principal y hacía que la cámara esperara a la librería de render. Se carga con `React.lazy`, por lo que queda en un fragmento aparte que solo se descarga al abrir el visor. El paquete inicial bajó de 999 kB a 458 kB.
**Actualización 2026-09-22:** La escala original de la escena hacía que un cuerpo real midiera casi 7 unidades con una cámara que veía menos de 5: los pies quedaban fuera del cuadro. Se corrigió la escala y el encuadre, y se anclaron los pies al suelo. El mismo visor reproduce ahora las demos del tutorial (DEC-033).  

---

## DEC-030 · Catálogo de ejercicios y modelo de rutinas
**Fecha:** 2026-09-19  
**Contexto:** El usuario pidió un menú para crear y calendarizar rutinas de todos los músculos del cuerpo, con nivel de dificultad por ejercicio. La aplicación solo sabe analizar tres ejercicios por cámara, porque solo para esos tres existe un tracker con máquina de estados y umbrales validados.  
**Tensión de fondo:** Un catálogo de cuerpo completo implica que la mayoría de los ejercicios no tendrán análisis de técnica. Ocultar esa diferencia le prometería al usuario algo que no se está haciendo.  
**Decisión:** Catálogo mixto de 60 ejercicios en 11 grupos musculares, con un campo `tracking` que distingue tres modos: `camera` para los tres con análisis 3D, `reps` para conteo manual y `time` para temporizador. La distinción se muestra de forma explícita en toda la interfaz, con una etiqueta 3D en el selector y un botón "Analizar" contra una etiqueta "Manual" en la pantalla de inicio.  
**Modelo de rutinas:** Una rutina agrupa días; cada día tiene un día de la semana, un nombre libre, los grupos musculares que cubre y sus ejercicios. Cada entrada de ejercicio lleva su propia dificultad, series, repeticiones, segundos de sostén, descanso y método. Solo una rutina puede estar activa, y es la que manda en el calendario de la pantalla de inicio.  
**Dificultad:** Bajo, medio y alto. Al elegir un nivel se aplica un preajuste de volumen que el usuario puede ajustar después. El nivel no es solo una etiqueta: cambia series, repeticiones y descanso.  
**Métodos de entrenamiento:** Se incluyen series normales, rest-pause, dropset y superserie, pedidos explícitamente. La división empuje, tirón y pierna se entrega como plantilla sembrada en el primer arranque, junto con una de cuerpo completo y una división por músculo.  
**Persistencia:** `localStorage`, según la restricción de no usar backend. Los identificadores se generan localmente y las fechas se guardan como epoch en milisegundos para evitar ambigüedad de zona horaria al serializar.

---

## DEC-031 · Perfil, progreso y logros derivados del historial
**Fecha:** 2026-09-19  
**Contexto:** El alcance de Fitnet pide perfil de usuario con progresos, logros y definición de objetivos.  
**Decisión de diseño principal:** Nada de progreso se almacena de forma acumulada. Todas las estadísticas, el progreso de objetivos y los logros se derivan del historial de sesiones en cada render. El historial es la única fuente de verdad.  
**Razón:** Un contador acumulado puede desincronizarse por un error y quedar contradiciendo lo que muestra el historial, sin forma de saber cuál de los dos miente. Derivar elimina esa clase de error por completo. El costo de recalcular es despreciable frente al límite de 300 sesiones guardadas.  
**Cálculo de racha:** Se cuenta hacia atrás desde hoy. Si hoy todavía no se entrenó, la racha sigue viva cuando ayer sí, porque el día aún no terminó. Las claves de día se arman con componentes locales y no con `toISOString`, que convierte a UTC y corre un día entero en zonas horarias negativas como la de Guatemala.  
**Objetivos:** Cuatro tipos, según frecuencia semanal, repeticiones acumuladas, sesiones completadas o días de racha. Cada uno se contrasta contra la estadística que le corresponde.  
**Logros:** Ocho, con progreso parcial visible cuando aún no se desbloquean.

---

## DEC-032 · Navegación: HashRouter y contexto de React
**Fecha:** 2026-09-19  
**Contexto:** La aplicación pasó de una sola pantalla de cámara a cinco vistas: inicio, rutinas, editor de rutina, entrenamiento y perfil. Hacía falta navegación y estado compartido.  
**Decisión de enrutado:** `HashRouter` de react-router-dom, no `BrowserRouter`.  
**Actualización 2026-09-23:** Se migró de `HashRouter` a `createHashRouter`, que mantiene el enrutado por fragmento pero habilita `useBlocker`. Ver DEC-042.  
**Razón:** Con rutas basadas en fragmento, el documento servido es siempre `index.html`. Eso evita depender de reglas de reescritura del hosting, que el proyecto no tiene configuradas, y mantiene la navegación funcionando con la PWA instalada y sin red. Con `BrowserRouter`, abrir directamente una ruta profunda devolvería 404 salvo que se agregue configuración en Vercel, y el service worker network-first de DEC-025 tendría que resolver el caso sin conexión.  
**Estructura de rutas:** La pantalla de entrenamiento queda fuera del contenedor con barra de navegación, porque ocupa todo el alto y no debe compartir espacio con la barra.  
**Decisión de estado:** Contexto de React, sin librería de estado. El árbol es chico y el dato cabe entero en memoria. Cada escritura persiste de inmediato en `localStorage`, por lo que no hay guardado explícito ni riesgo de perder cambios al cerrar la aplicación.  
**Registro de sesiones (corregido 2026-09-22):** La versión inicial de esta entrada afirmaba que la pantalla de cámara vivía fuera del proveedor de contexto, y releía el historial al recibir el evento `focus` de la ventana. Era falso: todas las rutas están dentro del proveedor, y la navegación interna no dispara `focus`, así que la pantalla de inicio no reflejaba lo entrenado hasta cambiar de ventana. Las pantallas de entrenamiento registran ahora la sesión con `recordSession` del contexto, que la guarda y actualiza el estado en el mismo instante. El contexto y el hook se separaron del componente proveedor para que la recarga en caliente de Vite funcione.  
**Acceso defensivo generalizado:** El criterio de DEC-024 se extiende a todo el proyecto en `src/storage/localStore.ts`, que además valida la forma del dato recuperado. Un JSON corrupto o de una versión anterior del esquema no debe propagarse al resto de la aplicación.

---

## DEC-033 · Tutorial de técnica por ejercicio
**Fecha:** 2026-09-22  
**Contexto:** El usuario pidió un tutorial de cada ejercicio para ver la forma correcta de hacerlo. El catálogo tiene 60 ejercicios; solo 3 tienen análisis por cámara.  
**Alternativas consideradas:**  
(a) Videos o GIF de internet — descartado por derechos de autor, por depender de la red en una PWA pensada para funcionar sin conexión, y por no poder controlar la calidad.  
(b) Ilustraciones de inicio y fin de cada movimiento — 120 imágenes hechas a mano, con calidad difícil de sostener.  
(c) Ficha escrita para los 60, más demo 3D animada en los 3 con análisis.  
(d) Ficha escrita más demo 3D en los cerca de 20 ejercicios de peso corporal.  
**Decisión:** Opción (c), elegida por el usuario. La demo aporta más donde la app evalúa, porque muestra exactamente la técnica contra la que se compara al usuario. En ejercicios con máquina o polea, un esqueleto sin el equipo no enseña nada.  
**Ficha:** Pasos, errores comunes, respiración, músculos, equipo, consejo clave, y en los 3 con cámara, dónde colocar el celular. Once ejercicios de riesgo llevan una advertencia de seguridad. Todo en `src/exercises/tutorials.ts`, texto propio. El campo `videoUrl` queda reservado para grabaciones propias del equipo.  
**Demo 3D por cinemática directa:** `src/exercises/demoPoses.ts` genera los 33 landmarks a partir de unos pocos ángulos articulares por fase, en el mismo sistema de coordenadas que `worldLandmarks`. Se dibuja con el mismo `Pose3DView` del análisis en vivo, y el ángulo que se muestra se calcula con `calculateAngle3D`, la función que evalúa al usuario. Lo que se enseña y lo que se exige coinciden por construcción.  
**Consecuencia no planeada, y la más valiosa:** Las demos sirvieron como datos de prueba del motor. Alimentar los trackers reales con ellas destapó tres errores graves (DEC-034 y DEC-035) que habrían llegado al celular.  
**Cuándo se muestra:** A pedido, desde la biblioteca, el inicio, el editor de rutinas, el selector de ejercicios, el modo manual y la vista de cámara. Además, por elección del usuario, se abre solo la primera vez que alguien entrena cada ejercicio con cámara. Mientras está abierto, la detección se pausa: nadie debe sumar repeticiones mientras lee.  
**Por qué la hoja usa un portal:** El selector de ejercicios usa `backdrop-filter`, que convierte a su contenedor en el marco de referencia de los elementos fijos. Sin `createPortal`, la hoja del tutorial quedaría atrapada dentro del selector.

---

## DEC-034 · Sentadilla: confirmación del fondo independiente de la velocidad de cuadros
**Fecha:** 2026-09-22  
**Contexto:** Al pasar la demo de sentadilla por el tracker real, a 60 cuadros por segundo se contaron **cero** repeticiones, aunque el ángulo recorría de 80° a 173° y la retroalimentación salía verde.  
**Causa:** El fondo se confirmaba solo si el ángulo subía más de 2° entre un cuadro y el siguiente. Eso hace depender el conteo de la velocidad de cuadros: a 60 fps, una subida controlada avanza menos de 2° por cuadro y nunca se confirma. El error viene del código original y el cambio a 3D lo heredó. En curl y press el equipo ya había corregido este patrón en DEC-016, pero la sentadilla quedó con la versión vieja. Es una explicación plausible del conteo errático en celulares rápidos.  
**Decisión:** El fondo se confirma cuando el ángulo ya subió 8° por encima del mínimo acumulado en la bajada. No depende de cuántos cuadros haya, y 8° de margen supera con holgura el temblor de los landmarks. La histéresis de fases, que mantiene `squatting` hasta los 160°, garantiza que la confirmación ocurra antes de cerrar el ciclo.  
**Verificado:** 5 de 5 repeticiones contadas a 15, 30 y 60 fps.

---

## DEC-035 · Analizador de movimiento: histéresis, forma del ciclo y fase de esfuerzo mínima
**Fecha:** 2026-09-22  
**Contexto:** El banco de pruebas encontró dos defectos graves en el diseño de DEC-027 y DEC-028.  
**Defecto 1, el más serio:** Con 8 mm de temblor por landmark, que es lo normal en MediaPipe, se rechazaban **todas** las repeticiones como "movimiento irregular". La suavidad contaba cada cambio de signo de la velocidad cuadro a cuadro, y el ruido producía decenas por repetición. En un celular real, la validación de DEC-027 habría dejado la app contando cero.  
**Corrección 1:** Cambios de dirección con histéresis. Solo cuenta un cambio cuando el ángulo retrocede más de 12° desde el último extremo. El temblor no alcanza ese margen; un titubeo real sí. Se toleran hasta dos titubeos antes de considerar el movimiento irregular, siguiendo el criterio de DEC-027 de preferir aceptar una repetición dudosa antes que rechazar una legítima.  
**Defecto 2:** En curl y press la ventana de análisis empezaba al entrar en la fase de contracción, cuando el brazo ya había subido. Lo que se medía como fase de esfuerzo era en realidad la bajada, así que la fatiga al subir era invisible.  
**Corrección 2:** Cada ejercicio declara la forma de su ciclo: si el esfuerzo es el ángulo mínimo o el máximo, y si el ciclo empieza con el esfuerzo (curl y press) o con la bajada (sentadilla). La ventana arranca en la última vuelta a la posición de reposo, y la pausa en reposo antes de moverse se recorta buscando el último cuadro dentro de 6° del extremo de reposo.  
**Corrección 3:** Con el filtro de DEC-036, dos tirones seguidos de press podían fusionarse en un ciclo de más de 800 ms. Lo que los delata es la fase de empuje, de 167 ms. Se agregó una duración mínima de la fase de esfuerzo de 250 ms. Una fase controlada dura 400 ms o más incluso a ritmo rápido, y el banco confirma que un ciclo de 1.5 s sigue contando.  
**Descartado:** Subir la duración mínima del press a 800 ms. Se probó, no resolvía el caso, y se revirtió.

---

## DEC-036 · Filtro One Euro sobre los landmarks
**Fecha:** 2026-09-22  
**Contexto:** Aun con la histéresis de DEC-035, un temblor de 15 mm seguía rompiendo el conteo en curl y press. En segmentos cortos como el antebrazo, 15 mm equivalen a varios grados.  
**Alternativas consideradas:**  
(a) Subir el umbral de histéresis — tapa el síntoma y debilita la detección de movimientos erráticos reales.  
(b) Promedio móvil sobre los landmarks — obliga a elegir entre temblor y retraso.  
(c) Filtro One Euro.  
**Decisión:** Opción (c), en `src/pose/landmarkFilter.ts`. Adapta su frecuencia de corte a la velocidad: filtra fuerte con el punto casi quieto, donde el temblor es lo único que hay, y deja pasar el movimiento rápido, donde el retraso sí importaría. Es la técnica estándar para estabilizar poses y manos en tiempo real (Casiez, Roussel y Vogel, CHI 2012).  
**Dónde se aplica:** Una sola vez, en la vista de cámara, antes de los trackers y del visor 3D. Todo lo que mide trabaja sobre la señal filtrada. La visibilidad no se filtra: los trackers la usan como compuerta y un valor retrasado dejaría pasar cuadros donde el punto ya no se ve.  
**Parámetros:** Corte mínimo 1.2 Hz, beta 0.8, corte de derivada 1 Hz. El filtro se reinicia si pasan más de 500 ms sin cuadros, para no arrastrar una posición vieja cuando el detector pierde a la persona.  
**Verificado:** 5 de 5 repeticiones con 8 y 15 mm de temblor en los tres ejercicios.

---

## DEC-037 · Modo manual para los ejercicios sin cámara
**Fecha:** 2026-09-22  
**Contexto:** De los 60 ejercicios del catálogo, 57 se podían agregar a una rutina pero no ejecutar: no existía contador manual ni temporizador. En la pantalla de inicio figuraban con una etiqueta "Manual" que no llevaba a ninguna parte.  
**Decisión:** Pantalla de entrenamiento manual en `/manual`, con contador de repeticiones de botones grandes, temporizador circular para los ejercicios por tiempo, cronómetro de descanso, y registro en el historial para que cuente en el perfil y los logros. Una sola función, `startPath`, decide si un ejercicio va a la cámara o al modo manual, para que ningún botón pueda mandar un ejercicio al lugar equivocado.  
**Lógica en un reductor puro:** `src/routines/manualWorkout.ts`. El tiempo nunca se lee adentro: llega en cada acción. Eso lo hace determinista y comprobable sin relojes reales.  
**Métodos de entrenamiento:**  
- Rest-pause: tras la serie principal, mini-series con 15 s de descanso entre ellas; todo suma en una sola serie.  
- Dropset: tras la serie principal, descensos de carga sin descanso, con la indicación de bajar entre 20 y 30 %.  
- Superserie: sin descanso tras la serie, con la indicación de pasar al ejercicio pareado.  
**Limitación declarada de la superserie:** La app indica alternar, pero no encadena los dos ejercicios en una misma pantalla, y el editor todavía no permite elegir con qué ejercicio se empareja. El campo `supersetWith` existe en el modelo pero no tiene interfaz.  
**Pantalla encendida:** Se pide `navigator.wakeLock` durante el entrenamiento y se vuelve a pedir al regresar a primer plano. Sin esto, el celular se bloquea en medio de un descanso de 90 segundos. Si el navegador no lo soporta, la app funciona igual.  
**Relojes:** Basados en marcas de tiempo de fin, no en contadores que se decrementan. Un intervalo puede atrasarse o frenarse en segundo plano; la resta contra la hora real no.  
**Terminar antes:** Lo hecho en la serie en curso se guarda. Salir con trabajo hecho lleva al resumen en vez de perderlo.

---

## DEC-038 · Banco de pruebas del motor sin cámara
**Fecha:** 2026-09-22  
**Contexto:** Todo el análisis de movimiento se había escrito sin poder probarlo en celular. Tres errores graves solo aparecieron al pasar movimientos sintéticos por los trackers reales.  
**Decisión:** `scripts/pruebas-motor.mjs`, que se corre con `npm run test:motor`. Compila los módulos puros con el TypeScript del proyecto y los alimenta con las demos del tutorial, a distintas velocidades de cuadro y con ruido gaussiano de semilla fija. No agrega dependencias.  
**Qué cubre:** 37 pruebas. Técnica correcta a 15, 30 y 60 fps; temblor de 8 y 15 mm; ritmo rápido legítimo; tirones; recorridos parciales; fatiga progresiva; y los cuatro métodos del modo manual, con pausas del temporizador y salidas anticipadas.  
**Qué no cubre, y hay que decirlo:** La calidad de los landmarks reales ni el comportamiento con una persona frente a la cámara. Las demos son movimientos perfectos con ruido agregado; una persona real se mueve distinto. El banco sirve para no romper lo que ya funciona, no para calibrar umbrales: eso solo se hace en celular.

---

## DEC-039 · Registro de la interfaz: tuteo
**Fecha:** 2026-09-22  
**Contexto:** La app original usa "tú" ("Apunta tu cámara", "Baja un poco más", "Asegúrate"), y el usuario también escribe en "tú". En la fase 6 se introdujo voseo ("Bajá", "Pegá", "Tenés") en todos los textos nuevos, y el onboarding original ya tenía un caso aislado ("Posicioná... empezá").  
**Decisión:** Tuteo en toda la interfaz. Se corrigieron 68 casos con un mapa exacto de formas verbales, aplicado solo sobre palabras completas y verificado después con un escáner que reconoce tildes.  
**Mensajes de error de cámara:** El navegador los entrega en inglés ("Permission denied"). Se traducen a mensajes accionables en español según el tipo de error, por la restricción 6 del proyecto.

---

## DEC-040 · Nivelación con el acelerómetro y partes del cuerpo estimadas
**Fecha:** 2026-09-23  
**Contexto:** En la primera prueba en celular, el usuario reportó que el modelo 3D lo mostraba inclinado entero, piernas incluidas, cuando solo se había inclinado de la cadera para arriba para tomar el teléfono.  
**Causa, primera parte:** Los `worldLandmarks` de MediaPipe están alineados con la cámara, no con el suelo. MediaPipe no tiene acceso a los sensores del teléfono, así que su "abajo" es el borde inferior de la imagen. Con el celular inclinado, el esqueleto entero aparece inclinado. No es solo visual: la inclinación del tronco en sentadilla, el arqueo en press y el balanceo del codo en curl se miden contra esa vertical falsa. El banco de pruebas confirma que con el celular inclinado 32° el press daba avisos de arqueo sin que existiera ninguno.  
**Causa, segunda parte:** Cuando una parte del cuerpo sale del cuadro, MediaPipe igual estima su posición, con baja visibilidad. El visor dibujaba esas partes igual que las vistas, y hacía creer que se estaban midiendo.  
**Alternativas consideradas:**  
(a) Estimar la vertical desde el cuerpo, asumiendo que las piernas están rectas — falla justo en la sentadilla, donde la cadera queda detrás de los tobillos.  
(b) Estimar el plano del suelo con los talones y las puntas de los pies — solo sirve con los pies en cuadro, que no es el caso en curl ni en press.  
(c) Ángulos de orientación del dispositivo (`deviceorientation`) — entran en bloqueo de cardán con el celular en vertical, que es justo como se usa la app, y no pueden leer una inclinación lateral tipo volante.  
(d) Vector de gravedad del acelerómetro (`devicemotion`).  
**Decisión:** Opción (d), en `src/pose/deviceGravity.ts`. La gravedad medida en ejes de pantalla se pasa a los ejes de la cámara, distintos para la trasera y la frontal, y el esqueleto se gira con la rotación mínima que lleva ese "abajo" al eje vertical. Se aplica una sola vez, después del filtro de DEC-036 y antes de los trackers y del visor. Los ángulos articulares no cambian; lo que se corrige son las medidas contra la vertical.  
**Signo de la lectura:** Android reporta la reacción del apoyo, que apunta hacia arriba, e iOS reporta la gravedad, hacia abajo. En lugar de detectar el navegador, se elige el signo que hace apuntar "abajo" hacia el borde inferior de la pantalla, lo cual siempre es cierto con el celular en vertical.  
**Salvaguardas:** Se descartan las lecturas con el teléfono en movimiento brusco y con el teléfono casi horizontal. Tampoco se corrigen inclinaciones de más de 60°. Sin sensor, la app mide como antes.  
**Permiso en iOS:** Safari exige pedirlo desde un toque, antes de cualquier espera. Se pide en el onboarding, antes que la cámara; al cerrar el tutorial en la vista de cámara; y con un botón "Nivelar" en el panel 3D si hace falta. En Android no requiere permiso. El panel muestra "Nivelado" cuando la corrección está activa.  
**Partes estimadas:** El visor dibuja tenues y sin articulaciones los huesos cuyos extremos tienen visibilidad menor a 0.5, el mismo umbral que usan los trackers.  
**Actualización 2026-09-23:** En la prueba siguiente el sensor funcionaba ("Nivelado") y el cuerpo seguía inclinado. La causa restante era un error de profundidad del modelo, que se corrige en DEC-043.  
**Verificado:** 13 pruebas nuevas en el banco. Recupera la vertical con inclinaciones de hasta 30° combinadas con giro, interpreta bien el signo de Android y de iPhone, y elimina los avisos falsos de arqueo en el press. **No verificado con sensores reales:** falta confirmar en un iPhone y en un Android que el signo y los ejes se comportan como en el modelo.

---

## DEC-041 · Íconos en lugar de emojis
**Fecha:** 2026-09-23  
**Contexto:** El usuario pidió no usar emojis: se ven distintos en cada sistema operativo y no encajan con el resto de la interfaz. Había 11 en los filtros de grupos musculares y 8 en los logros.  
**Decisión:** Los filtros de grupos musculares quedan solo con texto, que es lo más limpio para un filtro. Los logros usan íconos propios en `src/ui/icons/AchievementIcon.tsx`, dibujados con el mismo trazo que la barra de navegación. No se agregó ninguna librería de íconos.  
**Verificado:** El escáner de caracteres pictográficos da cero en todo `src/`.

---

## DEC-042 · Editor de rutinas con guardado explícito
**Fecha:** 2026-09-23  
**Contexto:** El usuario reportó que el editor de rutinas no tenía botón de guardar. Cada cambio se guardaba al instante, sin que el usuario lo supiera, y no había forma de arrepentirse. Crear una rutina además la guardaba vacía antes de agregarle nada.  
**Decisión:** El editor trabaja sobre un borrador, y solo "Crear rutina" o "Guardar cambios" lo persisten. Una barra fija abajo tiene "Cancelar" y la acción principal, siempre a la vista mientras se agregan ejercicios. Sin cambios, la acción principal dice "Listo". Crear una rutina ya no guarda nada hasta confirmar, y el nombre es obligatorio.  
**Salir con cambios pendientes:** Aparece una confirmación con "Guardar y salir", "Descartar" y "Seguir editando". Cubre el botón de volver, "Cancelar" y el gesto de volver de Android. Cerrar la pestaña con cambios pendientes también avisa.  
**Cambio de enrutador:** Para bloquear la navegación hace falta `useBlocker`, que solo existe con el enrutador de datos de React Router. Se migró de `HashRouter` a `createHashRouter`. El enrutado por fragmento de DEC-032 no cambia.  
**Editor a pantalla completa:** El editor sale del contenedor con barra de navegación, igual que las pantallas de entrenamiento. Dos barras apiladas abajo no dejan espacio en un celular, y editar es una tarea que se termina o se cancela.  
**Verificado en navegador:** Guardar sin nombre muestra el error. Cancelar con cambios pide confirmación, y "Seguir editando" conserva el borrador. Crear persiste la rutina y vuelve a la lista sin preguntar. El retroceso del historial queda bloqueado con cambios pendientes. Descartar no guarda nada.

---

## DEC-043 · Calibración de la vertical con la postura de pie
**Fecha:** 2026-09-23  
**Contexto:** En la segunda prueba en celular, con DEC-040 activo y el panel mostrando "Nivelado", el visor 3D seguía mostrando el cuerpo entero inclinado unos 20°. En la imagen de la cámara el usuario estaba derecho, de frente, y el celular parecía vertical. Visto de costado en el visor, el cuerpo era una línea recta inclinada de pies a cabeza.  
**Causa:** No es una inclinación del celular, que el acelerómetro ya corrige, sino un error de profundidad del modelo. Con una sola cámara, la profundidad es lo que peor estima MediaPipe: a una persona de frente suele ubicarle los pies más cerca o más lejos de la cámara que la cabeza, y el esqueleto entero queda rotado como un bloque. El acelerómetro no puede ver ese error. Afecta las mismas medidas que DEC-040: el banco de pruebas muestra avisos falsos de "Pecho arriba" en la sentadilla con 20° de error del modelo.  
**Alternativas consideradas:**  
(a) Subir los umbrales de inclinación de tronco y de arqueo — esconde el error sin corregirlo, y deja de detectar las malas posturas reales.  
(b) Pedirle al usuario una calibración explícita al empezar — funciona, pero agrega un paso cada vez que se abre la cámara.  
(c) Calibración automática con la postura de pie.  
**Decisión:** Opción (c), en `src/pose/standingCalibration.ts`. De pie y con las piernas estiradas, el eje de tobillos a hombros es vertical en la realidad. Cuando la persona está así, se mide cuánto se desvía ese eje en lo que estima el modelo, se suaviza, y se descuenta de todos los cuadros siguientes. Pasa sola al comienzo de cada serie de sentadillas y entre repeticiones.  
**Condiciones para aprender:** hombros, caderas, rodillas y tobillos visibles con 0.6 o más; rodillas por encima de 160°; ángulo hombro-cadera-rodilla por encima de 155°; y desviación menor a 35°. En el fondo de una sentadilla, o con la espalda arqueada, no se actualiza. Así la inclinación del tronco se sigue midiendo, contra la postura de pie de la misma persona frente a la misma cámara.  
**Orden en el procesamiento:** filtro de temblor, acelerómetro, calibración, trackers. La calibración aprende sobre el esqueleto ya nivelado por el sensor, así que captura solo el error del modelo y sigue valiendo si después se mueve el celular. Se reinicia al cambiar de cámara.  
**Diagnóstico en pantalla:** El panel 3D muestra "Calibrado" y cuántos grados corrige del modelo y del celular. Sirve para saber que está activa, y para distinguir las dos fuentes si una prueba vuelve a mostrar el cuerpo inclinado. Sin calibración, indica cómo lograrla: pararse derecho, de cuerpo entero.  
**Limitación:** Necesita los tobillos a la vista. En curl y press con encuadre de medio cuerpo solo se aplica el acelerómetro.  
**Error relacionado, corregido en el mismo cambio:** La captura de la prueba mostraba "Baja un poco más" con el usuario casi de pie. En la sentadilla, la fase "abajo" dura hasta que la rodilla supera 160°, y durante toda la subida, entre 90° y 160°, se pedía bajar más. Venía del código original. Ahora, después del fondo, el mensaje evalúa la profundidad que se alcanzó. La voz, que decía lo mismo justo al empezar a subir, ahora dice "La próxima, baja un poco más".  
**Verificado:** 10 pruebas nuevas en el banco, 60 de 60 en total. La calibración mide los 20° de error del modelo con menos de 3° de desvío y se mantiene estable durante cinco repeticiones. Elimina los avisos falsos de espalda sin perder repeticiones y no aprende de posturas que no son de pie. Con celular y modelo inclinados a la vez, deja el tronco a menos de 1° de la verdad. Durante la subida ya no se pide bajar más. **No verificado todavía:** con movimientos reales en el celular.
