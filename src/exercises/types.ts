import type { Landmark } from '@mediapipe/tasks-vision';
import type { FatigueState } from '../analysis/fatigue';
import type { RepMetrics } from '../analysis/movementQuality';
import type { BodyOrientation } from '../geometry/vectors3d';

export type FeedbackLevel = 'idle' | 'good' | 'warning' | 'bad';

/**
 * Contrato común de todos los trackers tras la migración a 3D (ver DEC-026).
 *
 * Los campos de análisis (`fatigue`, `lastRepMetrics`, `orientation`) son comunes a
 * todos los ejercicios; los campos angulares específicos los agrega cada tracker.
 */
export interface BaseExerciseResult {
  reps: number;
  feedbackLevel: FeedbackLevel;
  feedbackMessage: string;
  /** Ángulo principal del ejercicio, calculado en 3D. */
  primaryAngle: number;
  /** Orientación del torso respecto a la cámara. */
  orientation: BodyOrientation;
  /** Estado de fatiga acumulado en la serie en curso. */
  fatigue: FatigueState;
  /** Métricas de la última repetición válida. `null` hasta completar la primera. */
  lastRepMetrics: RepMetrics | null;
  /** Mensaje presente solo en el cuadro en que se descarta una repetición. */
  rejectionMessage: string | null;
  /** Velocidad angular instantánea, en grados por segundo. */
  velocity: number;
  /** Asimetría entre lados, 0–1. Vale 0 en ejercicios de un solo lado visible. */
  asymmetry: number;
}

/** Interfaz que implementan los tres trackers, para tratarlos de forma uniforme. */
export interface ExerciseTracker<TResult extends BaseExerciseResult> {
  update(world: Landmark[], timeMs: number): TResult;
  reset(): void;
}

/** Estado neutro devuelto cuando el cuerpo no es suficientemente visible. */
export const IDLE_FATIGUE: FatigueState = {
  level: 'fresh',
  score: 0,
  velocityDropPercent: 0,
  romLossPercent: 0,
  message: 'Ritmo sólido',
  shouldRest: false,
};
