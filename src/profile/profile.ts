import { readJSON, writeJSON } from '../storage/localStore';
import { createId, type WorkoutSession } from '../routines/types';

/**
 * Perfil de usuario, objetivos y logros (ver DEC-031).
 *
 * Todo el progreso se deriva del historial de sesiones que ya se guarda localmente;
 * no se duplica ningún dato acumulado. Así el historial es la única fuente de verdad
 * y no existe la posibilidad de que un contador quede desincronizado.
 */

export type ExperienceLevel = 'principiante' | 'intermedio' | 'avanzado';

export type GoalType =
  | 'frecuencia'     // entrenar N veces por semana
  | 'repeticiones'   // acumular N repeticiones
  | 'sesiones'       // completar N sesiones
  | 'racha';         // mantener una racha de N días

export interface Goal {
  id: string;
  type: GoalType;
  /** Valor a alcanzar. Su unidad depende del tipo. */
  target: number;
  label: string;
  createdAt: number;
  /** Fecha límite opcional, como epoch en milisegundos. */
  deadline?: number;
  completedAt?: number;
}

export interface UserProfile {
  name: string;
  experience: ExperienceLevel;
  /** Peso en kilogramos. 0 = sin declarar. */
  weightKg: number;
  /** Altura en centímetros. 0 = sin declarar. */
  heightCm: number;
  goals: Goal[];
  createdAt: number;
}

const PROFILE_KEY = 'fitnet_profile_v1';

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  experience: 'principiante',
  weightKg: 0,
  heightCm: 0,
  goals: [],
  createdAt: Date.now(),
};

function isProfile(value: unknown): value is UserProfile {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Partial<UserProfile>;
  return typeof p.name === 'string' && Array.isArray(p.goals);
}

export function loadProfile(): UserProfile {
  return readJSON<UserProfile>(PROFILE_KEY, DEFAULT_PROFILE, isProfile);
}

export function saveProfile(profile: UserProfile): boolean {
  return writeJSON(PROFILE_KEY, profile);
}

export function createGoal(type: GoalType, target: number, label: string): Goal {
  return { id: createId('goal'), type, target, label, createdAt: Date.now() };
}

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  frecuencia:   'Entrenar por semana',
  repeticiones: 'Repeticiones acumuladas',
  sesiones:     'Sesiones completadas',
  racha:        'Días de racha',
};

export const GOAL_UNITS: Record<GoalType, string> = {
  frecuencia:   'sesiones por semana',
  repeticiones: 'repeticiones',
  sesiones:     'sesiones',
  racha:        'días seguidos',
};

// ── Estadísticas derivadas del historial ──

export interface ProgressStats {
  totalSessions: number;
  totalReps: number;
  /** Minutos acumulados de entrenamiento. */
  totalMinutes: number;
  sessionsThisWeek: number;
  repsThisWeek: number;
  /** Días consecutivos con al menos una sesión, contando hacia atrás desde hoy. */
  currentStreak: number;
  longestStreak: number;
  /** Fatiga media de las últimas diez sesiones, 0–100. */
  avgFatigue: number;
  /** Repeticiones por día de los últimos catorce días, del más antiguo al más reciente. */
  last14Days: { date: string; reps: number }[];
}

/** Clave local YYYY-MM-DD. Se arma con componentes locales, no con `toISOString`,
 *  que convierte a UTC y correría un día entero en zonas horarias negativas. */
function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function computeStats(sessions: WorkoutSession[]): ProgressStats {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const totalReps = sessions.reduce((acc, s) => acc + s.totalReps, 0);
  const totalMinutes = Math.round(
    sessions.reduce((acc, s) => acc + Math.max(0, s.endedAt - s.startedAt), 0) / 60000
  );

  const thisWeek = sessions.filter(s => s.startedAt >= weekAgo);

  const recent = sessions.slice(0, 10);
  const avgFatigue = recent.length > 0
    ? Math.round(recent.reduce((acc, s) => acc + s.peakFatigue, 0) / recent.length)
    : 0;

  const trainedDays = new Set(sessions.map(s => dayKey(s.startedAt)));

  // Racha actual: se cuenta hacia atrás desde hoy. Si hoy todavía no se entrenó,
  // la racha sigue viva si ayer sí, porque el día aún no terminó.
  let currentStreak = 0;
  const cursor = new Date();
  if (!trainedDays.has(dayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (trainedDays.has(dayKey(cursor.getTime()))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const longestStreak = computeLongestStreak(trainedDays);

  const last14Days: ProgressStats['last14Days'] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d.getTime());
    const reps = sessions
      .filter(s => dayKey(s.startedAt) === key)
      .reduce((acc, s) => acc + s.totalReps, 0);
    last14Days.push({ date: key, reps });
  }

  return {
    totalSessions: sessions.length,
    totalReps,
    totalMinutes,
    sessionsThisWeek: thisWeek.length,
    repsThisWeek: thisWeek.reduce((acc, s) => acc + s.totalReps, 0),
    currentStreak,
    longestStreak,
    avgFatigue,
    last14Days,
  };
}

function computeLongestStreak(trainedDays: Set<string>): number {
  if (trainedDays.size === 0) return 0;

  const sorted = [...trainedDays].sort();
  let longest = 1;
  let running = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00`);
    const curr = new Date(`${sorted[i]}T00:00:00`);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);

    if (diffDays === 1) {
      running++;
      if (running > longest) longest = running;
    } else {
      running = 1;
    }
  }
  return longest;
}

/** Progreso de un objetivo, en porcentaje 0–100, según las estadísticas actuales. */
export function goalProgress(goal: Goal, stats: ProgressStats): number {
  if (goal.target <= 0) return 0;

  const current = (() => {
    switch (goal.type) {
      case 'frecuencia':   return stats.sessionsThisWeek;
      case 'repeticiones': return stats.totalReps;
      case 'sesiones':     return stats.totalSessions;
      case 'racha':        return stats.currentStreak;
    }
  })();

  return Math.min(100, Math.round((current / goal.target) * 100));
}

// ── Logros ──

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  /** Progreso hacia el desbloqueo, 0–100. */
  progress: number;
}

/**
 * Los logros se recalculan desde las estadísticas en cada render.
 * No se persisten: derivarlos evita que un logro quede marcado por un bug y
 * contradiga lo que muestra el historial.
 */
export function computeAchievements(stats: ProgressStats): Achievement[] {
  const defs: { id: string; name: string; description: string; emoji: string; current: number; target: number }[] = [
    { id: 'first',      name: 'Primer paso',     description: 'Completa tu primera sesión',        emoji: '🎯', current: stats.totalSessions, target: 1 },
    { id: 'ten',        name: 'Constancia',      description: 'Completa 10 sesiones',              emoji: '🔥', current: stats.totalSessions, target: 10 },
    { id: 'fifty',      name: 'Veterano',        description: 'Completa 50 sesiones',              emoji: '🏆', current: stats.totalSessions, target: 50 },
    { id: 'reps100',    name: 'Cien repeticiones', description: 'Acumula 100 repeticiones',        emoji: '💯', current: stats.totalReps, target: 100 },
    { id: 'reps1000',   name: 'Mil repeticiones', description: 'Acumula 1000 repeticiones',        emoji: '⚡', current: stats.totalReps, target: 1000 },
    { id: 'streak3',    name: 'Tres seguidos',   description: 'Entrena 3 días seguidos',           emoji: '📅', current: stats.longestStreak, target: 3 },
    { id: 'streak7',    name: 'Semana completa', description: 'Entrena 7 días seguidos',           emoji: '🗓️', current: stats.longestStreak, target: 7 },
    { id: 'hour',       name: 'Una hora',        description: 'Acumula 60 minutos de entrenamiento', emoji: '⏱️', current: stats.totalMinutes, target: 60 },
  ];

  return defs.map(d => ({
    id: d.id,
    name: d.name,
    description: d.description,
    emoji: d.emoji,
    unlocked: d.current >= d.target,
    progress: Math.min(100, Math.round((d.current / d.target) * 100)),
  }));
}
