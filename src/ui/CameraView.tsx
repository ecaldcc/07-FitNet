import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { startCamera, stopCamera } from '../pose/camera';
import { initPoseDetector, detectAndDraw } from '../pose/poseDetector';
import { LandmarkSmoother } from '../pose/landmarkFilter';
import { SquatTracker, GOOD_DEPTH_ANGLE } from '../exercises/squat';
import { BicepCurlTracker, GOOD_FORM_ANGLE } from '../exercises/bicepCurl';
import { ShoulderPressTracker, GOOD_LOCKOUT_ANGLE } from '../exercises/shoulderPress';
import type { SquatResult } from '../exercises/squat';
import type { BicepCurlResult } from '../exercises/bicepCurl';
import type { ShoulderPressResult } from '../exercises/shoulderPress';
import type { BaseExerciseResult } from '../exercises/types';
import { getExercise, getTrackedExercises, type TrackerId } from '../exercises/catalog';
import { hasSeenTutorial, markTutorialSeen } from '../exercises/tutorialProgress';
import { createId, type CompletedSet, type WorkoutSession } from '../routines/types';
import { useRoutines } from '../routines/context';
import { ExerciseOverlay } from './ExerciseOverlay';
import { TutorialSheet } from './tutorial/TutorialSheet';
import type { Pose3DHandle } from './Pose3DView';
import { useSpeech } from './useSpeech';

// Three.js pesa cerca de 540 kB sin comprimir. Cargarlo aparte deja que la cámara y
// el detector arranquen sin esperar a la librería de render (ver DEC-029).
const Pose3DView = lazy(() =>
  import('./Pose3DView').then(m => ({ default: m.Pose3DView }))
);

type Status = 'loading' | 'ready' | 'error';
type FacingMode = 'environment' | 'user';
type AnyResult = SquatResult | BicepCurlResult | ShoulderPressResult;

const TRACKED = getTrackedExercises();

/** Mapea el id del tracker al ejercicio del catálogo que lo usa. */
const TRACKER_TO_EXERCISE: Record<TrackerId, string> = {
  squat: 'sentadilla',
  curl:  'curl-biceps',
  press: 'press-hombro',
};

const FEEDBACK_3D_COLOR: Record<string, string> = {
  good: '#30D158', warning: '#FF9F0A', bad: '#FF375F', idle: '#4A9EFF',
};

const INSECURE_CONTEXT_MSG = 'Contexto no seguro: abre la app con HTTPS, no HTTP.';

const FIRST_TIME_INTRO =
  'Primera vez con este ejercicio. Mira la técnica correcta antes de empezar: ' +
  'es la misma que la app va a evaluar.';

/**
 * Traduce los errores de `getUserMedia` a mensajes accionables en español.
 * El navegador los entrega en inglés ("Permission denied"), y la interfaz debe
 * estar en español según la restricción 6 del proyecto.
 */
function describeCameraError(err: unknown): string {
  const name = err instanceof DOMException || err instanceof Error ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'No hay permiso para usar la cámara. Actívalo en la configuración del navegador y vuelve a intentar.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No se encontró una cámara disponible en este dispositivo.';
    case 'NotReadableError':
    case 'AbortError':
      return 'Otra aplicación está usando la cámara. Ciérrala y vuelve a intentar.';
  }
  if (err instanceof Error) return err.message;
  try { return JSON.stringify(err); } catch { return String(err); }
}

function repPhrase(n: number): string {
  if (n === 1) return 'Una';
  if (n % 10 === 0) return `${n}. ¡Excelente ritmo!`;
  if (n % 5 === 0) return `${n}. ¡Sigue así!`;
  return String(n);
}

export function CameraView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { recordSession } = useRoutines();

  // El ejercicio puede venir del calendario, de la biblioteca o de la selección manual.
  const initialTracker = (() => {
    const requested = searchParams.get('ejercicio');
    const def = requested ? getExercise(requested) : undefined;
    return def?.trackerId ?? 'squat';
  })();

  const targetSets = Number(searchParams.get('series')) || 3;
  const routineId = searchParams.get('rutina') ?? undefined;
  const dayId = searchParams.get('dia') ?? undefined;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const pose3DRef = useRef<Pose3DHandle | null>(null);

  // Trackers — uno por ejercicio, persisten entre cambios de cámara y de ejercicio
  const squatTrackerRef = useRef(new SquatTracker());
  const curlTrackerRef = useRef(new BicepCurlTracker());
  const pressTrackerRef = useRef(new ShoulderPressTracker());
  // Filtro de temblor de los landmarks: todo lo que mide pasa primero por aquí (DEC-036)
  const smootherRef = useRef(new LandmarkSmoother());

  // Referencia al ejercicio activo legible desde el bucle (evita cierre obsoleto)
  const activeExRef = useRef<TrackerId>(initialTracker);
  const prevRepsRef = useRef<number>(-1);
  // Arquitectura de voz sin colisiones (ver DEC-016)
  const curlFormFeedbackRef = useRef<string>('');
  const pressFormFeedbackRef = useRef<string>('');
  const lastSpeakTimeRef = useRef<number>(0);
  const cameraStopPendingRef = useRef(false);
  const show3DRef = useRef(true);
  /** Con el tutorial abierto no se analiza: nadie debe sumar repeticiones mientras lee. */
  const pausedRef = useRef(false);

  // Acumuladores de la sesión, fuera del estado de React para no re-renderizar por cuadro
  const sessionStartRef = useRef<number>(0);
  const completedSetsRef = useRef<CompletedSet[]>([]);
  const peakFatigueRef = useRef(0);
  const repsAtSetStartRef = useRef(0);

  // Sin `mediaDevices` no hay cámara posible. Se resuelve en el estado inicial y no
  // dentro del efecto, para no forzar un segundo render apenas monta el componente.
  const [status, setStatus] = useState<Status>(() =>
    navigator.mediaDevices ? 'loading' : 'error'
  );
  const [errorMsg, setErrorMsg] = useState(() =>
    navigator.mediaDevices ? '' : INSECURE_CONTEXT_MSG
  );
  const [switchingCamera, setSwitchingCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>(() => {
    try {
      const v = localStorage.getItem('preferred_camera');
      return (v === 'user' || v === 'environment') ? v : 'environment';
    } catch { return 'environment'; }
  });
  const [activeTracker, setActiveTracker] = useState<TrackerId>(initialTracker);
  const [exerciseResult, setExerciseResult] = useState<AnyResult | null>(null);
  const [show3D, setShow3D] = useState(true);
  const [currentSet, setCurrentSet] = useState(1);
  // Primera vez con este ejercicio: el tutorial se abre solo (DEC-033).
  const [tutorialOpen, setTutorialOpen] = useState(
    () => !hasSeenTutorial(TRACKER_TO_EXERCISE[initialTracker])
  );
  const [tutorialIsFirstTime, setTutorialIsFirstTime] = useState(tutorialOpen);

  const speak = useSpeech();

  const exerciseDef = useMemo(
    () => getExercise(TRACKER_TO_EXERCISE[activeTracker]),
    [activeTracker]
  );

  useEffect(() => { sessionStartRef.current = Date.now(); }, []);
  useEffect(() => { show3DRef.current = show3D; }, [show3D]);
  useEffect(() => { pausedRef.current = tutorialOpen; }, [tutorialOpen]);

  useEffect(() => {
    if (!navigator.mediaDevices) return;

    let cancelled = false;
    // El elemento de video no cambia durante la vida del efecto; guardarlo evita leer
    // una referencia que React ya pudo haber limpiado cuando corre la limpieza.
    const video = videoRef.current;

    async function setup() {
      try {
        // Si se acaba de detener una cámara, esperar a que el hardware se libere.
        // track.stop() es síncrono pero el dispositivo libera el sensor ~300-500 ms
        // después; llamar getUserMedia antes causa "Could not start video source".
        if (cameraStopPendingRef.current) {
          cameraStopPendingRef.current = false;
          await new Promise<void>(resolve => setTimeout(resolve, 450));
          if (cancelled) return;
        }

        // Variante `full`: sus worldLandmarks son bastante más estables que los de
        // `lite`, y el análisis 3D depende directamente de esa estabilidad (DEC-026).
        await initPoseDetector('full');
        if (cancelled || !video) return;

        const stream = await startCamera(video, facingMode);
        streamRef.current = stream;
        if (!cancelled) {
          setStatus('ready');
          setSwitchingCamera(false);
        }

        function loop() {
          if (cancelled || !videoRef.current || !canvasRef.current) return;

          // Con el tutorial abierto no se corre la detección: ahorra batería y GPU
          // mientras la demo 3D se anima encima.
          if (pausedRef.current) {
            rafRef.current = requestAnimationFrame(loop);
            return;
          }

          const timestamp = performance.now();
          const frame = detectAndDraw(videoRef.current, canvasRef.current, timestamp);

          if (frame.world.length > 0) {
            const ex = activeExRef.current;
            const world = smootherRef.current.smooth(frame.world[0], timestamp);

            const result: AnyResult = (() => {
              if (ex === 'squat') return squatTrackerRef.current.update(world, timestamp);
              if (ex === 'curl')  return curlTrackerRef.current.update(world, timestamp);
              return pressTrackerRef.current.update(world, timestamp);
            })();

            if (show3DRef.current) {
              pose3DRef.current?.update(
                world, FEEDBACK_3D_COLOR[result.feedbackLevel] ?? '#4A9EFF'
              );
            }

            if (result.fatigue.score > peakFatigueRef.current) {
              peakFatigueRef.current = result.fatigue.score;
            }

            handleVoice(ex, result);

            prevRepsRef.current = result.reps;
            setExerciseResult(result);
          }

          rafRef.current = requestAnimationFrame(loop);
        }

        function handleVoice(ex: TrackerId, result: AnyResult) {
          const prevReps = prevRepsRef.current;
          if (prevReps < 0) return;

          // Una repetición descartada se avisa por voz: sin eso, el usuario cree
          // que la app falló en vez de entender que el movimiento no fue válido.
          if (result.rejectionMessage && result.reps === prevReps) {
            if (performance.now() - lastSpeakTimeRef.current > 2000) {
              speak(result.rejectionMessage);
              lastSpeakTimeRef.current = performance.now();
            }
            return;
          }

          if (result.reps > prevReps) {
            if (ex === 'squat') {
              if (performance.now() - lastSpeakTimeRef.current > 1500) {
                speak(repPhrase(result.reps));
                lastSpeakTimeRef.current = performance.now();
              }
            } else if (ex === 'curl') {
              const formMsg = curlFormFeedbackRef.current;
              speak(formMsg ? `${repPhrase(result.reps)}. ${formMsg}` : repPhrase(result.reps));
              curlFormFeedbackRef.current = '';
              lastSpeakTimeRef.current = performance.now();
            } else {
              const formMsg = pressFormFeedbackRef.current;
              speak(formMsg ? `${repPhrase(result.reps)}. ${formMsg}` : repPhrase(result.reps));
              pressFormFeedbackRef.current = '';
              lastSpeakTimeRef.current = performance.now();
            }
            return;
          }

          if (ex === 'squat') {
            const r = result as SquatResult;
            if (r.atBottom) {
              speak(r.minAngleReached < GOOD_DEPTH_ANGLE
                ? '¡Excelente profundidad!'
                : 'Baja un poco más');
              lastSpeakTimeRef.current = performance.now();
            }
          } else if (ex === 'curl') {
            const r = result as BicepCurlResult;
            if (r.atTop) {
              curlFormFeedbackRef.current = r.minAngleReached < GOOD_FORM_ANGLE
                ? '¡Excelente contracción!'
                : 'Sube un poco más';
            }
          } else {
            const r = result as ShoulderPressResult;
            if (r.atPeak) {
              pressFormFeedbackRef.current = r.maxAngleReached >= GOOD_LOCKOUT_ANGLE
                ? '¡Extensión completa!'
                : 'Extiende un poco más';
            }
          }
        }

        rafRef.current = requestAnimationFrame(loop);
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(describeCameraError(err));
          setStatus('error');
          setSwitchingCamera(false);
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        stopCamera(streamRef.current);
        streamRef.current = null;
        // Limpiar srcObject para que el navegador libere la referencia al stream
        // detenido y el hardware suelte el sensor antes del siguiente getUserMedia.
        // Sin esto, algunos dispositivos ignoran el delay de 450 ms (DEC-021).
        if (video) video.srcObject = null;
        cameraStopPendingRef.current = true;
      }
    };
  }, [facingMode, speak]);

  function handleSelectExercise(next: TrackerId) {
    if (activeExRef.current === next) return;
    activeExRef.current = next;
    setActiveTracker(next);
    squatTrackerRef.current.reset();
    curlTrackerRef.current.reset();
    pressTrackerRef.current.reset();
    smootherRef.current.reset();
    prevRepsRef.current = -1;
    curlFormFeedbackRef.current = '';
    pressFormFeedbackRef.current = '';
    completedSetsRef.current = [];
    repsAtSetStartRef.current = 0;
    setCurrentSet(1);
    setExerciseResult(null);

    const firstTime = !hasSeenTutorial(TRACKER_TO_EXERCISE[next]);
    setTutorialIsFirstTime(firstTime);
    setTutorialOpen(firstTime);
  }

  function handleToggleCamera() {
    const next: FacingMode = facingMode === 'environment' ? 'user' : 'environment';
    try { localStorage.setItem('preferred_camera', next); } catch { /* storage bloqueado */ }
    setSwitchingCamera(true);
    setStatus('loading');
    setFacingMode(next);
  }

  const handleCloseTutorial = useCallback(() => {
    markTutorialSeen(TRACKER_TO_EXERCISE[activeExRef.current]);
    setTutorialOpen(false);
  }, []);

  /** Cierra la serie en curso, la registra y reinicia la línea base de fatiga. */
  const handleFinishSet = useCallback(() => {
    const result = exerciseResult;
    if (!result) return;

    const repsThisSet = result.reps - repsAtSetStartRef.current;
    if (repsThisSet > 0) {
      completedSetsRef.current.push({
        setNumber: currentSet,
        reps: repsThisSet,
        avgVelocity: result.lastRepMetrics?.concentricVelocity,
        avgRom: result.lastRepMetrics?.romDegrees,
        fatigueScore: result.fatigue.score,
        completedAt: Date.now(),
      });
    }

    repsAtSetStartRef.current = result.reps;
    setCurrentSet(s => s + 1);

    const tracker = activeExRef.current;
    if (tracker === 'squat') squatTrackerRef.current.startNewSet();
    else if (tracker === 'curl') curlTrackerRef.current.startNewSet();
    else pressTrackerRef.current.startNewSet();

    speak('Serie registrada. Descansa.');
  }, [exerciseResult, currentSet, speak]);

  /** Guarda la sesión en el historial y vuelve al inicio. */
  const handleFinishWorkout = useCallback(() => {
    const result = exerciseResult;

    // Incluir la serie en curso si tuvo repeticiones sin registrar.
    const sets = [...completedSetsRef.current];
    if (result) {
      const pending = result.reps - repsAtSetStartRef.current;
      if (pending > 0) {
        sets.push({
          setNumber: currentSet,
          reps: pending,
          fatigueScore: result.fatigue.score,
          completedAt: Date.now(),
        });
      }
    }

    const totalReps = sets.reduce((acc, s) => acc + s.reps, 0);

    if (totalReps > 0) {
      const session: WorkoutSession = {
        id: createId('ws'),
        routineId,
        dayId,
        startedAt: sessionStartRef.current,
        endedAt: Date.now(),
        entries: [{ exerciseId: TRACKER_TO_EXERCISE[activeExRef.current], sets }],
        totalReps,
        peakFatigue: peakFatigueRef.current,
      };
      // Pasa por el contexto para que el inicio y el perfil lo reflejen al instante.
      recordSession(session);
    }

    navigate('/');
  }, [exerciseResult, currentSet, routineId, dayId, navigate, recordSession]);

  const mirrorStyle = facingMode === 'user' ? { transform: 'scaleX(-1)' } : undefined;

  return (
    <div className="camera-container">
      {status === 'loading' && (
        <p className="status-msg">
          {switchingCamera ? 'Cambiando cámara...' : 'Inicializando detector de poses 3D...'}
        </p>
      )}
      {status === 'error' && (
        <div className="status-msg error">
          <p>{errorMsg}</p>
          <button className="ghost-btn" onClick={() => navigate('/')}>Volver al inicio</button>
        </div>
      )}

      <video ref={videoRef} className="camera-video" style={mirrorStyle} playsInline muted />
      <canvas ref={canvasRef} className="camera-canvas" style={mirrorStyle} />

      {status === 'ready' && show3D && !tutorialOpen && (
        <div className="pose3d-panel">
          <div className="pose3d-header">
            <span>Modelo 3D</span>
            <button
              className="pose3d-close"
              onClick={() => setShow3D(false)}
              aria-label="Ocultar modelo 3D"
            >×</button>
          </div>
          <Suspense fallback={<div className="pose3d-canvas pose3d-loading">Cargando 3D…</div>}>
            <Pose3DView ref={pose3DRef} className="pose3d-canvas" />
          </Suspense>
          <p className="pose3d-hint">Arrastra para rotar · doble toque para reiniciar</p>
        </div>
      )}

      {status === 'ready' && exerciseResult && exerciseDef && (
        <ExerciseOverlay
          result={exerciseResult as BaseExerciseResult}
          exerciseName={exerciseDef.name}
          currentSet={currentSet}
          totalSets={targetSets}
        />
      )}

      {status === 'ready' && (
        <div className="bottom-controls">
          {/* Selector de ejercicio — chips horizontales con scroll */}
          <div className="exercise-scroller" role="group" aria-label="Seleccionar ejercicio">
            {TRACKED.map(def => (
              <button
                key={def.id}
                className={`exercise-chip${activeTracker === def.trackerId ? ' active' : ''}`}
                onClick={() => def.trackerId && handleSelectExercise(def.trackerId)}
                aria-pressed={activeTracker === def.trackerId}
              >
                <span>{def.name}</span>
              </button>
            ))}
          </div>

          <div className="camera-actions">
            <button
              className="camera-control-btn"
              onClick={() => { setTutorialIsFirstTime(false); setTutorialOpen(true); }}
              aria-label="Ver técnica correcta"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </button>

            <button className="camera-control-btn" onClick={handleFinishSet} aria-label="Terminar serie">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </button>

            {!show3D && (
              <button className="camera-control-btn" onClick={() => setShow3D(true)} aria-label="Mostrar modelo 3D">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2 2 7l10 5 10-5-10-5Z" />
                  <path d="m2 17 10 5 10-5" />
                  <path d="m2 12 10 5 10-5" />
                </svg>
              </button>
            )}

            <button className="camera-control-btn" onClick={handleToggleCamera} aria-label="Cambiar cámara">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7h-3a2 2 0 0 1-2-2V2" />
                <path d="M9 2H4a2 2 0 0 0-2 2v4" />
                <path d="M2 17v3a2 2 0 0 0 2 2h3" />
                <path d="M15 22h3a2 2 0 0 0 2-2v-3" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>

            <button className="camera-control-btn finish" onClick={handleFinishWorkout} aria-label="Finalizar entrenamiento">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {tutorialOpen && exerciseDef && (
        <TutorialSheet
          exerciseId={exerciseDef.id}
          onClose={handleCloseTutorial}
          intro={tutorialIsFirstTime ? FIRST_TIME_INTRO : undefined}
          primaryAction={{ label: 'Entendido, empezar', onClick: handleCloseTutorial }}
        />
      )}
    </div>
  );
}
