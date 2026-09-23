import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRoutines } from '../../routines/context';
import { createRoutineExercise } from '../../routines/storage';
import { createId, METHOD_LABELS } from '../../routines/types';
import {
  buildPlan, finishLabel, initialState, workoutReducer, type WorkoutPlan,
} from '../../routines/manualWorkout';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, getExercise } from '../../exercises/catalog';
import { TutorialSheet } from '../tutorial/TutorialSheet';
import { useSpeech } from '../useSpeech';

/** Intervalo de refresco de los relojes. Un cuarto de segundo basta para una cuenta en segundos. */
const TICK_MS = 250;

const FALLBACK_PLAN: WorkoutPlan = {
  totalSets: 1, roundsPerSet: 1, restMs: 0, holdMs: 30000,
  method: 'normal', timed: false, targetReps: 0,
};

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : String(s);
}

/**
 * Mantiene la pantalla encendida durante el entrenamiento.
 * Sin esto, el celular se bloquea en medio de un descanso de 90 segundos y el usuario
 * pierde de vista el reloj. El navegador suelta el bloqueo al ocultar la pestaña, así
 * que se vuelve a pedir cuando la app regresa a primer plano.
 */
function useWakeLock() {
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;

    async function acquire() {
      try {
        if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
        const lock = await navigator.wakeLock.request('screen');
        if (disposed) { lock.release().catch(() => {}); return; }
        sentinel = lock;
      } catch {
        // Sin soporte o sin permiso: la app funciona igual, solo sin mantener la pantalla.
      }
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') acquire();
    }

    acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      sentinel?.release().catch(() => {});
    };
  }, []);
}

export function ManualWorkoutScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { routines, recordSession } = useRoutines();
  const speak = useSpeech();

  const exerciseId = params.get('ejercicio') ?? '';
  const routineId = params.get('rutina') ?? undefined;
  const dayId = params.get('dia') ?? undefined;
  const entryId = params.get('entrada') ?? undefined;

  const def = getExercise(exerciseId);

  // Si viene de una rutina, se respeta lo configurado ahí. Si no, se usa el volumen
  // sugerido para la dificultad natural del ejercicio.
  const entry = useMemo(() => {
    const fromRoutine = routines
      .find(r => r.id === routineId)?.days
      .find(d => d.dayId === dayId)?.exercises
      .find(e => e.entryId === entryId);
    if (fromRoutine) return fromRoutine;
    return def ? createRoutineExercise(def.id, def.baseDifficulty) : null;
  }, [routines, routineId, dayId, entryId, def]);

  const plan = useMemo(
    () => (entry && def ? buildPlan(entry, def.tracking === 'time') : null),
    [entry, def]
  );
  // Los hooks no pueden ser condicionales: con un ejercicio inválido se usa un plan de
  // respaldo, y la pantalla muestra el error antes de llegar a usarlo.
  const effectivePlan = plan ?? FALLBACK_PLAN;
  const reducer = useMemo(() => workoutReducer(effectivePlan), [effectivePlan]);
  const [state, dispatch] = useReducer(reducer, effectivePlan, initialState);

  const [now, setNow] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const startedAtRef = useRef(0);

  useWakeLock();

  useEffect(() => { startedAtRef.current = Date.now(); }, []);

  // Reloj: solo corre cuando hay algo que contar, para no gastar batería en reposo.
  const clockActive = state.mode === 'rest' || state.timerRunning;
  useEffect(() => {
    if (!clockActive) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);

      if (state.mode === 'rest' && state.restEndsAt !== null && t >= state.restEndsAt) {
        dispatch({ type: 'restDone' });
        speak(state.restLabel === 'Mini descanso' ? 'Sigue' : `Serie ${state.setNumber}`);
        navigator.vibrate?.(200);
      }
      if (state.timerRunning && state.timerEndsAt !== null && t >= state.timerEndsAt) {
        dispatch({ type: 'finishRound', now: t });
        speak('Tiempo');
        navigator.vibrate?.([150, 80, 150]);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [clockActive, state.mode, state.restEndsAt, state.restLabel, state.setNumber,
      state.timerRunning, state.timerEndsAt, speak]);

  const act = useCallback((type: 'startTimer' | 'pauseTimer' | 'finishRound' | 'finishEarly') => {
    const t = Date.now();
    setNow(t);
    dispatch({ type, now: t });
  }, []);

  function handleSave() {
    if (!def) return;
    if (state.completed.length > 0) {
      recordSession({
        id: createId('ws'),
        routineId,
        dayId,
        startedAt: startedAtRef.current,
        endedAt: Date.now(),
        entries: [{ exerciseId: def.id, sets: state.completed }],
        totalReps: state.completed.reduce((acc, s) => acc + s.reps, 0),
        // Sin cámara no hay análisis de movimiento del que derivar fatiga.
        peakFatigue: 0,
      });
    }
    navigate('/');
  }

  function handleExit() {
    // Salir con trabajo hecho lleva al resumen en vez de perderlo.
    const hasProgress = state.completed.length > 0 || state.count > 0 || state.timerRunning;
    if (hasProgress && state.mode !== 'done') act('finishEarly');
    else navigate(-1);
  }

  if (!def || !plan || !entry) {
    return (
      <div className="manual-screen">
        <section className="empty-card">
          <h2>Ejercicio no encontrado</h2>
          <button className="primary-btn" onClick={() => navigate('/ejercicios')}>Ver ejercicios</button>
        </section>
      </div>
    );
  }

  const timerRemaining = state.timerRunning && state.timerEndsAt !== null
    ? Math.max(0, state.timerEndsAt - now)
    : state.timerRemainingMs;
  const timerProgress = 1 - timerRemaining / plan.holdMs;
  const restRemaining = state.restEndsAt !== null ? Math.max(0, state.restEndsAt - now) : 0;

  return (
    <div className="manual-screen">
      <header className="manual-head">
        <button className="back-btn" onClick={handleExit} aria-label="Salir">‹</button>
        <div className="manual-head-main">
          <h1 className="manual-title">{def.name}</h1>
          <p className="manual-sub">
            <span className="difficulty-dot" style={{ background: DIFFICULTY_COLORS[entry.difficulty] }} />
            {DIFFICULTY_LABELS[entry.difficulty]}
            {entry.method !== 'normal' && ` · ${METHOD_LABELS[entry.method]}`}
          </p>
        </div>
        <button className="info-btn" onClick={() => setShowTutorial(true)} aria-label="Ver técnica">?</button>
      </header>

      {state.mode !== 'done' && (
        <div className="set-dots" aria-label={`Serie ${state.setNumber} de ${plan.totalSets}`}>
          {Array.from({ length: plan.totalSets }, (_, i) => (
            <span
              key={i}
              className={`set-dot${i < state.completed.length ? ' done' : ''}${i === state.setNumber - 1 ? ' current' : ''}`}
            />
          ))}
          <span className="set-dots-label">Serie {state.setNumber} de {plan.totalSets}</span>
        </div>
      )}

      {state.banner && state.mode === 'work' && <p className="method-banner">{state.banner}</p>}

      {/* ── Trabajo por repeticiones ── */}
      {state.mode === 'work' && !plan.timed && (
        <section className="manual-work">
          <p className="manual-round">
            {state.round === 0
              ? `Objetivo: ${plan.targetReps} repeticiones`
              : entry.method === 'rest_pause'
                ? `Mini-serie ${state.round} de ${plan.roundsPerSet - 1}`
                : `Descenso ${state.round} de ${plan.roundsPerSet - 1}`}
          </p>
          <div className="rep-counter">
            <button
              className="rep-btn minus"
              onClick={() => dispatch({ type: 'decrement' })}
              aria-label="Restar una repetición"
            >−</button>
            <span className="rep-value" aria-live="polite">{state.count}</span>
            <button
              className="rep-btn plus"
              onClick={() => dispatch({ type: 'increment' })}
              aria-label="Sumar una repetición"
            >+</button>
          </div>
          <p className="muted centered">Toca + en cada repetición completada.</p>
          <button className="primary-btn wide" onClick={() => act('finishRound')}>
            {finishLabel(state, plan)}
          </button>
        </section>
      )}

      {/* ── Trabajo por tiempo ── */}
      {state.mode === 'work' && plan.timed && (
        <section className="manual-work">
          <p className="manual-round">Sostén {Math.round(plan.holdMs / 1000)} segundos</p>
          <div className="timer-ring" role="timer" aria-live="off">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className="timer-track" cx="60" cy="60" r="52" />
              <circle
                className="timer-fill"
                cx="60" cy="60" r="52"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * (1 - timerProgress)}
              />
            </svg>
            <span className="timer-value">{formatClock(timerRemaining)}</span>
          </div>
          <div className="manual-actions">
            {state.timerRunning ? (
              <button className="ghost-btn" onClick={() => act('pauseTimer')}>Pausar</button>
            ) : (
              <button className="primary-btn" onClick={() => act('startTimer')}>
                {timerRemaining < plan.holdMs ? 'Reanudar' : 'Iniciar'}
              </button>
            )}
            {timerRemaining < plan.holdMs && (
              <button className="ghost-btn" onClick={() => act('finishRound')}>Terminar aquí</button>
            )}
          </div>
        </section>
      )}

      {/* ── Descanso ── */}
      {state.mode === 'rest' && (
        <section className="manual-rest">
          <p className="manual-round">{state.restLabel}</p>
          <span className="rest-value" role="timer">{formatClock(restRemaining)}</span>
          <p className="muted centered">
            {state.restLabel === 'Mini descanso'
              ? 'Respira y vuelve a la misma carga'
              : `Siguiente: serie ${state.setNumber} de ${plan.totalSets}`}
          </p>
          <div className="manual-actions">
            <button className="ghost-btn" onClick={() => dispatch({ type: 'addRest', ms: 15000 })}>+15 s</button>
            <button className="primary-btn" onClick={() => dispatch({ type: 'restDone' })}>Saltar descanso</button>
          </div>
        </section>
      )}

      {/* ── Resumen ── */}
      {state.mode === 'done' && (
        <section className="manual-done">
          <h2>{state.completed.length > 0 ? '¡Ejercicio completado!' : 'Sin series registradas'}</h2>
          {state.completed.length > 0 && (
            <ul className="summary-list">
              {state.completed.map(s => (
                <li key={s.setNumber}>
                  <span>Serie {s.setNumber}</span>
                  <strong>{plan.timed ? `${s.seconds ?? 0} s` : `${s.reps} reps`}</strong>
                </li>
              ))}
            </ul>
          )}
          <div className="manual-actions">
            {state.completed.length > 0 && (
              <button className="ghost-btn" onClick={() => navigate('/')}>Descartar</button>
            )}
            <button className="primary-btn" onClick={handleSave}>
              {state.completed.length > 0 ? 'Guardar entrenamiento' : 'Volver al inicio'}
            </button>
          </div>
        </section>
      )}

      {state.mode !== 'done' && (
        <button className="text-btn" onClick={() => act('finishEarly')}>Terminar ahora</button>
      )}

      {showTutorial && (
        <TutorialSheet exerciseId={def.id} onClose={() => setShowTutorial(false)} />
      )}
    </div>
  );
}
