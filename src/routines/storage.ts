import { readJSON, writeJSON } from '../storage/localStore';
import { DIFFICULTY_PRESETS, getExercise, type Difficulty } from '../exercises/catalog';
import {
  createId, type Routine, type RoutineDay, type RoutineExercise,
  type WeekDay, type WorkoutSession,
} from './types';

const ROUTINES_KEY = 'fitnet_routines_v1';
const SESSIONS_KEY = 'fitnet_sessions_v1';

/** Historial acotado: evita que el storage crezca sin techo en un dispositivo de uso diario. */
const MAX_SESSIONS = 300;

function isRoutine(value: unknown): value is Routine {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Partial<Routine>;
  return typeof r.id === 'string'
    && typeof r.name === 'string'
    && Array.isArray(r.days);
}

function isSession(value: unknown): value is WorkoutSession {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Partial<WorkoutSession>;
  return typeof s.id === 'string'
    && typeof s.startedAt === 'number'
    && Array.isArray(s.entries);
}

// ── Rutinas ──

export function loadRoutines(): Routine[] {
  const stored = readJSON<Routine[]>(
    ROUTINES_KEY, [],
    (v): v is Routine[] => Array.isArray(v) && v.every(isRoutine)
  );
  // Primer arranque: sembrar las plantillas para que el usuario tenga de dónde partir.
  if (stored.length === 0) {
    const templates = buildTemplates();
    saveRoutines(templates);
    return templates;
  }
  return stored;
}

export function saveRoutines(routines: Routine[]): boolean {
  return writeJSON(ROUTINES_KEY, routines);
}

export function getActiveRoutine(routines: Routine[]): Routine | null {
  return routines.find(r => r.isActive) ?? null;
}

/** Activa una rutina y desactiva el resto: solo una manda en el calendario. */
export function setActiveRoutine(routines: Routine[], routineId: string): Routine[] {
  return routines.map(r => ({
    ...r,
    isActive: r.id === routineId,
    updatedAt: r.id === routineId ? Date.now() : r.updatedAt,
  }));
}

export function createEmptyRoutine(name: string, difficulty: Difficulty): Routine {
  const now = Date.now();
  return {
    id: createId('rt'),
    name,
    description: '',
    difficulty,
    days: [],
    createdAt: now,
    updatedAt: now,
    isActive: false,
    isTemplate: false,
  };
}

export function createDay(weekday: WeekDay, name: string): RoutineDay {
  return {
    dayId: createId('day'),
    weekday,
    name,
    focus: [],
    exercises: [],
    isRestDay: false,
  };
}

/**
 * Crea la entrada de un ejercicio con el volumen sugerido para el nivel elegido.
 * El usuario puede ajustar cualquiera de esos números después.
 */
export function createRoutineExercise(
  exerciseId: string, difficulty: Difficulty
): RoutineExercise {
  const preset = DIFFICULTY_PRESETS[difficulty];
  return {
    entryId: createId('ex'),
    exerciseId,
    difficulty,
    sets: preset.sets,
    reps: preset.reps,
    holdSeconds: preset.holdSeconds,
    restSeconds: preset.restSeconds,
    method: 'normal',
    methodRounds: 2,
  };
}

/** Recalcula los grupos musculares que cubre un día a partir de sus ejercicios. */
export function recomputeFocus(day: RoutineDay): RoutineDay {
  const focus = new Set<RoutineDay['focus'][number]>();
  for (const entry of day.exercises) {
    const def = getExercise(entry.exerciseId);
    if (def) focus.add(def.muscleGroup);
  }
  return { ...day, focus: [...focus] };
}

// ── Historial de sesiones ──

export function loadSessions(): WorkoutSession[] {
  return readJSON<WorkoutSession[]>(
    SESSIONS_KEY, [],
    (v): v is WorkoutSession[] => Array.isArray(v) && v.every(isSession)
  );
}

export function saveSession(session: WorkoutSession): WorkoutSession[] {
  const sessions = [session, ...loadSessions()].slice(0, MAX_SESSIONS);
  writeJSON(SESSIONS_KEY, sessions);
  return sessions;
}

// ── Plantillas incluidas ──

/**
 * Plantillas de arranque. Se siembran una sola vez, en el primer uso.
 *
 * La división empuje/tirón/pierna está incluida porque es la estructura más difundida
 * para organizar una semana completa, y porque el usuario la pidió explícitamente.
 */
function buildTemplates(): Routine[] {
  const now = Date.now();

  const ppl = makeTemplate(
    'Empuje / Tirón / Pierna',
    'La división clásica de tres días. Cada sesión agrupa músculos que trabajan juntos.',
    'medio',
    [
      { weekday: 1, name: 'Empuje', ids: ['press-banca', 'press-hombro', 'press-inclinado', 'elevaciones-laterales', 'extension-polea'] },
      { weekday: 3, name: 'Tirón',  ids: ['dominadas', 'remo-barra', 'jalon-pecho', 'curl-biceps', 'face-pull'] },
      { weekday: 5, name: 'Pierna', ids: ['sentadilla', 'peso-muerto-rumano', 'prensa', 'zancadas', 'elevacion-talones-pie'] },
    ],
    now
  );
  ppl.isActive = true;

  const fullBody = makeTemplate(
    'Cuerpo completo',
    'Tres sesiones que cubren todo el cuerpo. Buena entrada para quien arranca.',
    'bajo',
    [
      { weekday: 1, name: 'Sesión A', ids: ['sentadilla', 'flexiones', 'remo-mancuerna', 'plancha'] },
      { weekday: 3, name: 'Sesión B', ids: ['press-hombro', 'jalon-pecho', 'puente-gluteo', 'abdominales'] },
      { weekday: 5, name: 'Sesión C', ids: ['sentadilla-goblet', 'press-banca-mancuernas', 'remo-polea', 'plancha-lateral'] },
    ],
    now
  );

  const split = makeTemplate(
    'División por músculo',
    'Cinco días, un grupo muscular grande por sesión. Volumen alto.',
    'alto',
    [
      { weekday: 1, name: 'Pecho',   ids: ['press-banca', 'press-inclinado', 'aperturas', 'cruce-poleas', 'fondos-paralelas'] },
      { weekday: 2, name: 'Espalda', ids: ['dominadas', 'remo-barra', 'jalon-pecho', 'remo-polea', 'pullover'] },
      { weekday: 3, name: 'Pierna',  ids: ['sentadilla', 'prensa', 'extension-cuadriceps', 'curl-femoral', 'elevacion-talones-pie'] },
      { weekday: 4, name: 'Hombro',  ids: ['press-hombro', 'elevaciones-laterales', 'pajaros', 'encogimientos'] },
      { weekday: 5, name: 'Brazo',   ids: ['curl-biceps', 'curl-martillo', 'press-frances', 'extension-polea', 'curl-concentrado'] },
    ],
    now
  );

  return [ppl, fullBody, split];
}

function makeTemplate(
  name: string,
  description: string,
  difficulty: Difficulty,
  days: { weekday: WeekDay; name: string; ids: string[] }[],
  now: number
): Routine {
  return {
    id: createId('tpl'),
    name,
    description,
    difficulty,
    createdAt: now,
    updatedAt: now,
    isActive: false,
    isTemplate: true,
    days: days.map(d => recomputeFocus({
      dayId: createId('day'),
      weekday: d.weekday,
      name: d.name,
      focus: [],
      isRestDay: false,
      exercises: d.ids
        .filter(id => getExercise(id) !== undefined)
        .map(id => createRoutineExercise(id, difficulty)),
    })),
  };
}
