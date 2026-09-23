# Entrenador Personal con Estimación de Poses en Tiempo Real

> Contexto persistente del proyecto para Claude Code. Este archivo se lee al inicio de cada sesión.

---

## 1. Qué es este proyecto

Aplicación web progresiva (PWA) que funciona como entrenador personal usando la cámara del celular del usuario. La app detecta el cuerpo en tiempo real con el modelo pre-entrenado **MediaPipe Pose** de Google, calcula ángulos articulares, cuenta repeticiones, y entrega retroalimentación visual sobre la calidad de ejecución.

**Área de IA del curso:** Análisis de imágenes (visión por computadora, detección de poses).

**Contexto académico:** Proyecto final del curso de Inteligencia Artificial (IA26), Universidad Mariano Gálvez de Guatemala, Facultad de Ingeniería en Sistemas. Equipo de 5 integrantes. Entrega final: 22/05/2026. Presentación: 23/05/2026. Valor: 15 puntos.

---

## 2. Restricciones duras (no negociables)

Estas restricciones existen por requerimientos del curso, del equipo, o del alcance acordado en el anteproyecto. Claude Code debe respetarlas siempre.

1. **Mobile-first obligatorio.** La app corre en el navegador del celular del usuario, usando la cámara del dispositivo vía `getUserMedia`. No se desarrolla para webcam de escritorio. Cualquier prueba o demo se hace en celular.
2. **Sin backend.** Todo el procesamiento ocurre en el dispositivo del usuario. No hay servidor, no hay base de datos remota, no hay APIs de pago. Si se necesita persistencia, se usa `localStorage` o `IndexedDB`.
3. **Stack fijo.** MediaPipe JS SDK + JavaScript + HTML5 Canvas + `getUserMedia`. Framework frontend a elegir entre **React** o **Vue** (decisión pendiente, ver sección 5). No introducir otros frameworks (Angular, Svelte, etc.) sin discusión explícita con el equipo.
4. **Deploy gratuito.** GitHub Pages, Vercel o Netlify (plan free). No usar servicios que requieran tarjeta de crédito.
5. **Cero costos económicos.** El proyecto no tiene presupuesto. Cualquier sugerencia de servicios de pago debe declinarse y proponer alternativa gratuita.
6. **Documentación e interfaz en español.** El equipo y el curso son en español. Comentarios de código pueden ir en español o inglés (consistencia dentro del archivo), pero los textos visibles al usuario y la documentación entregable son en español.

---

## 3. Alcance comprometido vs. alcance aspiracional

### Comprometido (parte de la entrega del 22/05)

- Detección de pose en tiempo real desde cámara del celular usando MediaPipe Pose JS.
- Cálculo de ángulos articulares (rodilla, codo, hombro, cadera) mediante trigonometría.
- Máquina de estados para conteo de repeticiones por ejercicio.
- Sistema de evaluación de forma con retroalimentación visual (verde/amarillo/rojo) basado en rangos angulares.
- Entre **5 y 6 rutinas concretas**: sentadillas, bíceps curl, press de hombro, plancha, lunges (los últimos dos son opcionales según tiempo).
- Instalable como PWA (manifest, service worker básico).
- Deploy funcional en URL pública.

### Aspiracional (solo si sobra tiempo, no comprometido)

Estas ideas están registradas pero el equipo NO se comprometió a entregarlas. No invertir esfuerzo aquí hasta que el alcance comprometido esté cerrado.

1. Clasificador automático de ejercicio (Random Forest o SVM con scikit-learn, entrenado con secuencias de los 33 keypoints).
2. Clasificador binario de "buena forma vs. mala forma" entrenado con ejemplos reales en lugar de reglas fijas.
3. Historial de sesiones con análisis de tendencias (mejora/retroceso del usuario en el tiempo).

**Nota sobre legitimidad de IA:** El equipo discutió que MediaPipe por sí solo es inferencia con un modelo pre-entrenado, lo cual sí califica como aplicación de IA (visión por computadora) pero deja todo el "sabor a ML" del lado de Google. Si el catedrático cuestiona el componente propio de IA, las extensiones aspiracionales (especialmente el clasificador de ejercicios) son la respuesta. Esto está documentado para que el equipo lo tenga presente, no como compromiso.

---

## 4. Stack tecnológico

| Capa | Tecnología | Notas |
|---|---|---|
| Detección de pose | MediaPipe Pose JS SDK | 33 puntos corporales, modelo pre-entrenado de Google |
| Cámara | API `getUserMedia` (browser nativa) | Constraints: `facingMode: 'environment'` o `'user'` según ejercicio |
| Lenguaje | JavaScript (ES2020+) | TypeScript opcional, decidir al inicio |
| Framework UI | React **o** Vue (pendiente) | Ver sección 5 |
| Renderizado overlay | HTML5 Canvas API | Dibujar esqueleto y feedback sobre el video |
| Cálculos | Trigonometría propia, `Math.atan2` | Sin librerías de ML adicionales |
| PWA | Service Worker + Web App Manifest | Workbox opcional para simplificar el SW |
| Versionado | Git + GitHub | Repo público o privado del equipo |
| Deploy | GitHub Pages / Vercel / Netlify | Decidir cuál al final de semana 1 |
| Editor | VS Code (recomendado) | Live Server para desarrollo local |

---

## 5. Decisiones técnicas pendientes

Decisiones que el equipo debe tomar en la primera semana. Si Claude Code se topa con una de estas, debe pausar y preguntar al usuario en lugar de elegir por su cuenta.

1. **React vs. Vue.** Ambos son viables. Criterio sugerido: cuál conoce mejor la mayoría del equipo. Si están iguales, React tiene más ejemplos de MediaPipe en GitHub.
2. **JavaScript vs. TypeScript.** TypeScript da seguridad de tipos pero suma curva de aprendizaje. Para 6 semanas y un equipo de 5, JS plano probablemente es más realista.
3. **Plataforma de deploy.** GitHub Pages es la más simple si el repo es público. Vercel da preview deployments por PR (útil si trabajan con ramas). Netlify es similar a Vercel.
4. **Estrategia de testing en celulares.** ngrok para exponer localhost al celular durante desarrollo, o usar el deploy de Vercel/Netlify como entorno de pruebas continuo.

---

## 6. Estructura de carpetas propuesta

Esta es una propuesta inicial. Ajustar al framework elegido (la estructura cambia un poco entre React y Vue).

```
entrenador-personal-ia/
├── CLAUDE.md                    # Este archivo
├── README.md                    # Descripción pública del proyecto
├── ARCHITECTURE.md              # Decisiones de diseño (crear cuando aplique)
├── DECISIONS.md                 # Log de decisiones técnicas (crear al tomar la primera)
├── package.json
├── public/
│   ├── manifest.json            # Web App Manifest (PWA)
│   ├── icons/                   # Íconos de la PWA
│   └── service-worker.js        # Service Worker
├── src/
│   ├── pose/                    # Lógica de MediaPipe e integración de cámara
│   │   ├── poseDetector.js
│   │   └── camera.js
│   ├── exercises/               # Un archivo por ejercicio + máquina de estados
│   │   ├── squat.js
│   │   ├── bicepCurl.js
│   │   ├── shoulderPress.js
│   │   └── plank.js
│   ├── geometry/                # Cálculo de ángulos y utilidades
│   │   └── angles.js
│   ├── ui/                      # Componentes de interfaz
│   │   ├── ExerciseSelector.*
│   │   ├── FeedbackOverlay.*
│   │   └── RepCounter.*
│   ├── storage/                 # localStorage / IndexedDB para historial
│   └── App.*                    # Entry point
├── docs/
│   ├── manual-usuario.md        # Manual de usuario (entregable del curso)
│   └── descripcion-proyecto.md  # Documento de descripción (entregable del curso)
└── .github/
    └── workflows/               # GitHub Actions para deploy automático
```

---

## 7. División de responsabilidades del equipo

| Rol | Responsabilidad principal | Archivos/módulos |
|---|---|---|
| Integrante 1 | MediaPipe + cámara | `src/pose/`, integración de `getUserMedia` |
| Integrantes 2 y 3 | Lógica de ejercicios | `src/exercises/`, `src/geometry/` |
| Integrante 4 | UI/UX móvil | `src/ui/`, `public/manifest.json`, estilos |
| Integrante 5 | Testing, docs, deploy, PM | `docs/`, `.github/workflows/`, informes de avance |

El **PM** es quien sube los informes de avance a Canvas en las fechas comprometidas (30/04 y 16/05). Cada informe no entregado penaliza 10% de la nota final.

---

## 8. Cronograma (6 semanas)

| Semana | Fechas aprox. | Hito | Entregable interno |
|---|---|---|---|
| 1-2 | 13/04 - 26/04 | Setup + detección de pose funcionando en celular | Prototipo con cámara + esqueleto en pantalla |
| 3-4 | 27/04 - 10/05 | Motor de ejercicios completo (3-5 ejercicios) | Conteo de reps y feedback funcional. **Informe 30/04.** |
| 5-6 | 11/05 - 22/05 | UI final, testing, docs, deploy | App lista. **Informe 16/05.** Entrega 22/05. |

---

## 9. Convenciones de código

- **Idioma de comentarios:** español preferido para lógica de dominio (ejercicios, ángulos), inglés aceptable para utilidades genéricas. Consistencia dentro del archivo.
- **Nombres de variables:** inglés (estándar de la industria, mejor para colaboración futura).
- **Formato:** Prettier con configuración por defecto. ESLint con `eslint:recommended`.
- **Commits:** mensajes en español o inglés, consistentes. Formato sugerido: `tipo(scope): descripción` (ej. `feat(squat): agregar deteccion de fase descendente`).
- **Branches:** `main` siempre desplegable. Trabajo en ramas `feat/*`, `fix/*`. PRs revisados por al menos otro integrante antes de merge.

---

## 10. Cómo Claude Code debe trabajar en este proyecto

Instrucciones operativas para las sesiones interactivas.

1. **Antes de cualquier cambio significativo, proponer plan.** Si el usuario pide "implementá la detección de sentadillas", primero mostrá qué archivos vas a tocar/crear y qué lógica vas a aplicar. Esperá aprobación antes de escribir código.
2. **No instalar dependencias sin avisar.** Cualquier `npm install` se discute primero. El equipo quiere mantener `package.json` limpio y entendible.
3. **No introducir tecnologías fuera del stack acordado** sin discusión explícita. Si encontrás que falta algo, proponelo como opción, no lo agregues unilateralmente.
4. **Probar en celular es la verdad.** Cualquier código relacionado con cámara o detección debe asumir que la prueba real es en celular. Comentar limitaciones de testing en desktop cuando aplique.
5. **Documentar decisiones en `DECISIONS.md`.** Cuando el equipo tome una decisión técnica (React vs. Vue, plataforma de deploy, etc.), agregar entrada en ese archivo con fecha, contexto, alternativas consideradas y razón.
6. **Respetar el alcance comprometido vs. aspiracional.** No empezar a entrenar clasificadores de scikit-learn hasta que el alcance core esté entregado.
7. **Comentarios en código:** explicar el "por qué" de decisiones no obvias (especialmente en cálculos geométricos y máquinas de estados), no el "qué" (que ya se ve en el código).

---

## 11. Recursos de referencia

- MediaPipe Pose (oficial): https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
- MediaPipe JS examples: https://github.com/google/mediapipe
- LearnOpenCV tutoriales: https://learnopencv.com/
- MDN PWA: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- `getUserMedia` MDN: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

---

## 12. Entregables del curso

Lo que se entrega en Canvas el 22/05 y se presenta el 23/05.

1. **Link de la PWA desplegada**, accesible desde cualquier navegador móvil.
2. **Documento de descripción del proyecto** (arquitectura, decisiones técnicas, resultados). Vive en `docs/descripcion-proyecto.md`.
3. **Manual de usuario** con instrucciones de uso. Vive en `docs/manual-usuario.md`.
4. **Código fuente** en repositorio de GitHub (link incluido).

---

## 13. Estado actual del proyecto

> **Esta sección se actualiza cada vez que el proyecto avanza.** Claude Code debe mantenerla viva.

**Última actualización:** 2026-09-22

**Directorio de trabajo:** `C:\Users\Edwar\Documents\entrenador-personal-ia`. El directorio histórico `C:\Dev-AI\entrenador-personal-ia` (DEC-007) corresponde a la máquina donde se desarrolló la entrega del curso; este es un clon posterior del repositorio de GitHub. El criterio de DEC-007, mantenerse fuera de OneDrive, se sigue cumpliendo.

**Hito actual:** Fase 6 — Expansión post-entrega hacia **Fitnet**, una aplicación de gimnasio completa. El proyecto del curso se entregó el 22/05/2026 y esa entrega está cerrada. A partir del 19/09/2026 se trabaja sobre un clon del repositorio en un alcance nuevo y más amplio, pedido por el usuario y fuera del alcance académico original.

**Lo entregado en el curso (sin cambios):** los 3 ejercicios operativos, PWA instalable, deploy en Vercel y la documentación de Canvas en `docs/`.

**Lo agregado en la fase 6 (en árbol de trabajo, sin commit todavía):**
- **Análisis 3D real (DEC-026).** El motor pasó de `landmarks` (proyección de pantalla) a `worldLandmarks` (coordenadas métricas 3D, independientes de la cámara), que MediaPipe ya entregaba y la app descartaba. `src/geometry/vectors3d.ts` con `calculateAngle3D` por producto punto, orientación corporal, inclinación de tronco y asimetría. Habilita validaciones antes imposibles: inclinación en sentadilla, arqueo lumbar en press y desplazamiento de codo en curl.
- **Filtro de temblor (DEC-036).** Filtro One Euro sobre los landmarks antes de cualquier cálculo, en `src/pose/landmarkFilter.ts`.
- **Validación temporal de repeticiones (DEC-027, corregida en DEC-035).** Una repetición exige recorrido, duración, fase de esfuerzo mínima y continuidad. La continuidad se mide con cambios de dirección con histéresis. El motivo del rechazo se informa por texto y por voz.
- **Sentadilla sin dependencia de la velocidad de cuadros (DEC-034).** El criterio original no contaba nada a 60 fps.
- **Detección de fatiga (DEC-028, corregida en DEC-035).** Caída de velocidad concéntrica, pérdida de recorrido y asimetría contra una línea base de 3 repeticiones.
- **Visor 3D con Three.js (DEC-029).** Rotable con el dedo, carga diferida, pies anclados al suelo.
- **Catálogo y rutinas (DEC-030).** 60 ejercicios en 11 grupos musculares. Rutinas con días de la semana, dificultad por ejercicio y métodos rest-pause, dropset y superserie. Tres plantillas sembradas, incluida empuje/tirón/pierna.
- **Tutorial por ejercicio (DEC-033).** Ficha escrita para los 60 y demo 3D animada en los 3 con cámara. Se abre sola la primera vez con cada ejercicio de cámara. Biblioteca navegable por grupo muscular.
- **Modo manual (DEC-037).** Los 57 ejercicios sin cámara se ejecutan con contador, temporizador y descansos, con los cuatro métodos, y quedan en el historial.
- **Perfil (DEC-031).** Objetivos, progreso, racha, logros e historial, todo derivado del historial de sesiones.
- **Navegación (DEC-032).** Siete pantallas con `HashRouter` y contexto de React. Las sesiones se registran con `recordSession` del contexto.
- **Banco de pruebas (DEC-038).** `npm run test:motor`, 37 pruebas sin cámara ni dependencias nuevas.
- **Interfaz en tuteo (DEC-039),** incluidos los mensajes de error de cámara, que el navegador entregaba en inglés.

**Dependencias nuevas:** `three`, `@types/three` y `react-router-dom`, autorizadas explícitamente por el usuario tras plantearle el costo.

**Decisiones técnicas tomadas:** React, Vite, TypeScript, `@mediapipe/tasks-vision` (Tasks API), WASM vía CDN jsDelivr, onboarding CSS nativo, histéresis de umbral doble, overlay DOM con barra inferior, `SpeechSynthesis` para voz, `ArmTracker` y `ArmPressTracker`, conteo unificado OR+cooldown, PWA manual, SW network-first para HTML, deploy en Vercel, HTTPS local con `@vitejs/plugin-basic-ssl`, delay 450 ms al cambiar de cámara, localStorage defensivo, análisis 3D con `worldLandmarks`, filtro One Euro, validación temporal con histéresis, fatiga por velocidad, Three.js con carga diferida, catálogo mixto, HashRouter, tutorial con demo por cinemática directa, modo manual con reductor puro, tuteo. Documentadas en `DECISIONS.md` (DEC-001 a DEC-039).

**Estado de verificación (2026-09-22):**
- `npm run build`, `npx tsc` y `npm run lint` pasan limpios.
- `npm run test:motor`: 37 de 37. Cubre técnica correcta a 15, 30 y 60 fps, temblor de 8 y 15 mm, ritmo rápido, tirones, recorridos parciales, fatiga y el modo manual.
- Recorrido en navegador de escritorio con vista de celular: onboarding, inicio, biblioteca, fichas, demos 3D de press y sentadilla, editor, selector con ficha, tutorial de primera vez, modo manual por repeticiones y por tiempo, y actualización del inicio al guardar.
- **No se probó con una persona frente a la cámara.** El navegador de prueba no tiene cámara. Según la sección 10, esa es la prueba que vale para todo lo que toca detección. Los umbrales pasan con movimientos sintéticos y falta calibrarlos con movimientos reales.

**Próximo paso:**
1. Probar en celular con HTTPS y calibrar umbrales de validación, fatiga y filtro con movimientos reales.
2. Decidir sobre la capa de IA aprendida. Arquitectura conversada: normalización canónica de los 33 puntos 3D, segmentación de fases con modelo temporal, autocodificador para patrón incorrecto y clasificador de ejercicio, en el navegador con TensorFlow.js u ONNX Runtime Web. El cuello de botella es la data. Atajo: etiquetar fases automáticamente con el sistema de umbrales y entrenar con supervisión débil.
3. Interfaz para emparejar ejercicios en superserie.
4. Commit de la fase 6, que sigue sin hacerse.
