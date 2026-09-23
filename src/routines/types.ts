import type { Difficulty, MuscleGroup } from '../exercises/catalog';

/**
 * Modelo de dominio de rutinas y calendario semanal (ver DEC-030).
 *
 * Todo vive en el dispositivo: sin backend, según la restricción 2 del proyecto.
 * Los identificadores se generan localmente y las fechas se guardan como epoch en
 * milisegundos para evitar ambigüedad de zona horaria al serializar.
 */

/** 0 = domingo, según la convención de `Date.getDay()`. */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_LABELS: Record<WeekDay, string> = {
  0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves', 5: 'Viernes', 6: 'Sábado',
};

export const WEEKDAY_SHORT: Record<WeekDay, string> = {
  0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb',
};

/**
 * Métodos de intensificación aplicables a un ejercicio.
 *
 * - `normal`: series rectas con descanso completo.
 * - `rest_pause`: se llega al fallo, se descansa muy poco y se exprimen mini-series.
 * - `dropset`: al fallo se baja la carga y se sigue sin descanso.
 * - `superset`: dos ejercicios encadenados sin descanso entre ellos.
 */
export type TrainingMethod = 'normal' | 'rest_pause' | 'dropset' | 'superset';

export const METHOD_LABELS: Record<TrainingMethod, string> = {
  normal:     'Series normales',
  rest_pause: 'Rest-pause',
  dropset:    'Dropset',
  superset:   'Superserie',
};

export const METHOD_DESCRIPTIONS: Record<TrainingMethod, string> = {
  normal:     'Series rectas con descanso completo entre cada una.',
  rest_pause: 'Llegás al fallo, descansás 15 segundos y exprimís mini-series extra.',
  dropset:    'Al llegar al fallo bajás la carga y seguís sin descanso.',
  superset:   'Dos ejercicios seguidos sin descanso entre ellos.',
};

/** Un ejercicio dentro de una rutina, con su volumen y método. */
export interface RoutineExercise {
  /** Identificador único de esta entrada (no del ejercicio del catálogo). */
  entryId: string;
  /** Referencia a `ExerciseDefinition.id`. */
  exerciseId: string;
  difficulty: Difficulty;
  sets: number;
  /** Repeticiones objetivo. Se ignora en ejercicios de tipo temporizado. */
  reps: number;
  /** Segundos de sostén. Solo aplica a ejercicios de tipo temporizado. */
  holdSeconds: number;
  restSeconds: number;
  method: TrainingMethod;
  /** Mini-series del rest-pause o descensos de carga del dropset. */
  methodRounds: number;
  /** Entrada con la que se encadena en una superserie. */
  supersetWith?: string;
  notes?: string;
}

/** Un día de entrenamiento dentro de una rutina. */
export interface RoutineDay {
  dayId: string;
  weekday: WeekDay;
  /** Nombre del día, por ejemplo "Empuje" o "Pierna". */
  name: string;
  /** Grupos musculares que cubre; se usa para el resumen del calendario. */
  focus: MuscleGroup[];
  exercises: RoutineExercise[];
  /** Un día marcado como descanso conserva su nombre pero no tiene ejercicios. */
  isRestDay: boolean;
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  /** Dificultad global; cada ejercicio puede tener la suya. */
  difficulty: Difficulty;
  days: RoutineDay[];
  createdAt: number;
  updatedAt: number;
  /** Solo una rutina puede estar activa: es la que manda en el calendario. */
  isActive: boolean;
  /** Marca las plantillas incluidas con la app, para distinguirlas de las del usuario. */
  isTemplate: boolean;
}

/** Registro de una serie completada durante un entrenamiento. */
export interface CompletedSet {
  setNumber: number;
  reps: number;
  /** Solo presente en ejercicios temporizados. */
  seconds?: number;
  /** Métricas del análisis 3D. Ausentes en ejercicios de conteo manual. */
  avgVelocity?: number;
  avgRom?: number;
  fatigueScore?: number;
  completedAt: number;
}

/** Registro de un entrenamiento realizado. Alimenta el historial del perfil. */
export interface WorkoutSession {
  id: string;
  routineId?: string;
  dayId?: string;
  startedAt: number;
  endedAt: number;
  entries: {
    exerciseId: string;
    sets: CompletedSet[];
  }[];
  totalReps: number;
  /** Fatiga máxima alcanzada en toda la sesión, 0–100. */
  peakFatigue: number;
  notes?: string;
}

/**
 * Identificador local. `crypto.randomUUID` no existe en contextos no seguros
 * ni en algunos navegadores móviles antiguos, de ahí el respaldo manual.
 */
export function createId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}
