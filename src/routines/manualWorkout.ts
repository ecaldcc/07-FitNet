import type { CompletedSet, RoutineExercise, TrainingMethod } from './types';

/**
 * Lógica del entrenamiento manual: series, rondas de método y descansos (ver DEC-037).
 *
 * Es un reductor puro, separado de la pantalla. El tiempo nunca se lee adentro: llega
 * en cada acción. Eso lo hace determinista y permite probar sin esperar relojes reales.
 */

/** Descanso entre mini-series de rest-pause. Es el valor clásico del método. */
export const REST_PAUSE_MS = 15_000;

export interface WorkoutPlan {
  totalSets: number;
  /** Rondas por serie: 1 normal, o 1 más las mini-series o descensos del método. */
  roundsPerSet: number;
  restMs: number;
  holdMs: number;
  method: TrainingMethod;
  timed: boolean;
  targetReps: number;
}

export function buildPlan(entry: RoutineExercise, timed: boolean): WorkoutPlan {
  const hasRounds = entry.method === 'rest_pause' || entry.method === 'dropset';
  return {
    totalSets: Math.max(1, entry.sets),
    roundsPerSet: hasRounds ? 1 + Math.max(1, entry.methodRounds) : 1,
    restMs: Math.max(0, entry.restSeconds) * 1000,
    holdMs: Math.max(5, entry.holdSeconds) * 1000,
    method: entry.method,
    timed,
    targetReps: entry.reps,
  };
}

export type Mode = 'work' | 'rest' | 'done';

export interface WorkoutState {
  mode: Mode;
  setNumber: number;
  /** 0 = ronda principal de la serie; 1 en adelante = mini-series o descensos. */
  round: number;
  /** Repeticiones de la ronda en curso. */
  count: number;
  /** Acumulado de la serie en curso, sumando todas sus rondas. */
  setReps: number;
  setSeconds: number;
  completed: CompletedSet[];
  restEndsAt: number | null;
  restLabel: string;
  /** Temporizador de trabajo, solo en ejercicios por tiempo. */
  timerRunning: boolean;
  timerEndsAt: number | null;
  timerRemainingMs: number;
  /** Indicación del método para la ronda en curso. */
  banner: string | null;
}

export type WorkoutAction =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'startTimer'; now: number }
  | { type: 'pauseTimer'; now: number }
  | { type: 'finishRound'; now: number }
  | { type: 'restDone' }
  | { type: 'addRest'; ms: number }
  | { type: 'finishEarly'; now: number };

export function initialState(plan: WorkoutPlan): WorkoutState {
  return {
    mode: 'work',
    setNumber: 1,
    round: 0,
    count: 0,
    setReps: 0,
    setSeconds: 0,
    completed: [],
    restEndsAt: null,
    restLabel: '',
    timerRunning: false,
    timerEndsAt: null,
    timerRemainingMs: plan.holdMs,
    banner: null,
  };
}

/** Segundos sostenidos en la ronda en curso de un ejercicio por tiempo. */
function heldSeconds(state: WorkoutState, plan: WorkoutPlan, now: number): number {
  const remaining = state.timerRunning && state.timerEndsAt !== null
    ? Math.max(0, state.timerEndsAt - now)
    : state.timerRemainingMs;
  return Math.round((plan.holdMs - remaining) / 1000);
}

function freshTimer(plan: WorkoutPlan) {
  return { timerRunning: false, timerEndsAt: null, timerRemainingMs: plan.holdMs };
}

export function workoutReducer(
  plan: WorkoutPlan
): (state: WorkoutState, action: WorkoutAction) => WorkoutState {
  return (state, action) => {
    switch (action.type) {
      case 'increment':
        return state.mode === 'work' ? { ...state, count: state.count + 1 } : state;

      case 'decrement':
        return state.mode === 'work' ? { ...state, count: Math.max(0, state.count - 1) } : state;

      case 'startTimer':
        if (state.mode !== 'work' || state.timerRunning) return state;
        return {
          ...state,
          timerRunning: true,
          timerEndsAt: action.now + state.timerRemainingMs,
        };

      case 'pauseTimer':
        if (!state.timerRunning || state.timerEndsAt === null) return state;
        return {
          ...state,
          timerRunning: false,
          timerEndsAt: null,
          timerRemainingMs: Math.max(0, state.timerEndsAt - action.now),
        };

      case 'finishRound': {
        if (state.mode !== 'work') return state;
        const roundSeconds = plan.timed ? heldSeconds(state, plan, action.now) : 0;
        const roundReps = plan.timed ? 0 : state.count;
        const setReps = state.setReps + roundReps;
        const setSeconds = state.setSeconds + roundSeconds;

        // Quedan rondas del método dentro de esta misma serie.
        if (state.round < plan.roundsPerSet - 1) {
          const base = {
            ...state, ...freshTimer(plan),
            round: state.round + 1, count: 0, setReps, setSeconds,
          };
          if (plan.method === 'rest_pause') {
            return {
              ...base, mode: 'rest',
              restEndsAt: action.now + REST_PAUSE_MS,
              restLabel: 'Mini descanso', banner: null,
            };
          }
          // Dropset: sin descanso, se baja la carga y se sigue.
          return {
            ...base, mode: 'work',
            banner: 'Baja la carga entre un 20 y un 30 % y sigue sin descansar',
          };
        }

        // Serie cerrada.
        const finished: CompletedSet = {
          setNumber: state.setNumber,
          reps: setReps,
          ...(plan.timed ? { seconds: setSeconds } : {}),
          completedAt: action.now,
        };
        const completed = [...state.completed, finished];

        if (state.setNumber >= plan.totalSets) {
          return {
            ...state, ...freshTimer(plan), completed,
            mode: 'done', count: 0, setReps: 0, setSeconds: 0, banner: null,
          };
        }

        const next = {
          ...state, ...freshTimer(plan), completed,
          setNumber: state.setNumber + 1, round: 0, count: 0, setReps: 0, setSeconds: 0,
        };
        // En superserie el descanso se hace después del ejercicio pareado, no aquí.
        if (plan.method === 'superset' || plan.restMs === 0) {
          return {
            ...next, mode: 'work', restEndsAt: null,
            banner: plan.method === 'superset'
              ? 'Superserie: pasa al ejercicio pareado y vuelve sin descansar'
              : null,
          };
        }
        return {
          ...next, mode: 'rest',
          restEndsAt: action.now + plan.restMs,
          restLabel: 'Descanso', banner: null,
        };
      }

      case 'restDone':
        return state.mode === 'rest'
          ? { ...state, mode: 'work', restEndsAt: null, restLabel: '' }
          : state;

      case 'addRest':
        return state.mode === 'rest' && state.restEndsAt !== null
          ? { ...state, restEndsAt: state.restEndsAt + action.ms }
          : state;

      case 'finishEarly': {
        if (state.mode === 'done') return state;
        // Lo hecho en la serie en curso se guarda: terminar antes no debe perder trabajo.
        const roundSeconds = plan.timed && state.mode === 'work' ? heldSeconds(state, plan, action.now) : 0;
        const roundReps = plan.timed || state.mode !== 'work' ? 0 : state.count;
        const setReps = state.setReps + roundReps;
        const setSeconds = state.setSeconds + roundSeconds;
        const completed = setReps > 0 || setSeconds > 0
          ? [...state.completed, {
              setNumber: state.setNumber,
              reps: setReps,
              ...(plan.timed ? { seconds: setSeconds } : {}),
              completedAt: action.now,
            }]
          : state.completed;
        return {
          ...state, ...freshTimer(plan), completed,
          mode: 'done', count: 0, setReps: 0, setSeconds: 0,
          restEndsAt: null, banner: null,
        };
      }
    }
  };
}

/** Texto de la acción principal según el punto del método en que se esté. */
export function finishLabel(state: WorkoutState, plan: WorkoutPlan): string {
  if (state.round === 0 && plan.roundsPerSet > 1) {
    return plan.method === 'rest_pause' ? 'Llegué al fallo' : 'Llegué al fallo, bajo la carga';
  }
  if (state.round > 0) {
    const isLast = state.round === plan.roundsPerSet - 1;
    if (plan.method === 'rest_pause') return isLast ? 'Terminar serie' : 'Terminar mini-serie';
    return isLast ? 'Terminar serie' : 'Terminar descenso';
  }
  return 'Terminar serie';
}
