import type { Landmark } from '@mediapipe/tasks-vision';
import {
  LM, calculateAngle3D, getBodyOrientation, getTorsoInclination,
  asymmetryRatio, areVisible,
} from '../geometry/vectors3d';
import { MovementAnalyzer, REJECTION_MESSAGES } from '../analysis/movementQuality';
import { FatigueDetector } from '../analysis/fatigue';
import { IDLE_FATIGUE, type BaseExerciseResult, type ExerciseTracker } from './types';

const STANDING_ANGLE = 160; // > este valor → fase "standing"
const BOTTOM_ANGLE   = 100; // < este valor → fase "squatting"
export const GOOD_DEPTH_ANGLE = 90; // < este valor → profundidad óptima (paralelo o más)
/**
 * Grados que el ángulo debe subir por encima del mínimo alcanzado para confirmar que
 * se pasó el fondo (ver DEC-034).
 *
 * El criterio anterior exigía una subida de 2° entre un cuadro y el siguiente, lo que
 * hacía depender el conteo de la velocidad de cuadros: a 60 fps una subida controlada
 * avanza menos de 2° por cuadro y la repetición nunca se contaba. Medir contra el mínimo
 * acumulado no depende de cuántos cuadros haya, y 8° de margen supera con holgura el
 * temblor típico de los landmarks, que ronda 1 a 3 grados.
 */
const BOTTOM_CONFIRM_MARGIN = 8;
const MIN_VISIBILITY   = 0.5;

/**
 * Inclinación de tronco máxima tolerada, en grados respecto a la vertical.
 * Por encima, el usuario está convirtiendo la sentadilla en un buenos días y
 * transfiere carga de los cuádriceps a la zona lumbar.
 *
 * Esta validación solo es posible en 3D: en 2D la inclinación aparente del tronco
 * cambia con el ángulo de la cámara y no era medible de forma confiable (ver DEC-026).
 */
const MAX_TORSO_LEAN = 55;

/**
 * La sentadilla empieza bajando: el esfuerzo es la subida, después del fondo.
 * El fondo es el ángulo mínimo de rodilla.
 */
const SQUAT_SHAPE = { effortIsMinimum: true, concentricFirst: false } as const;

/** Umbrales de calidad ajustados a la cadencia natural de una sentadilla. */
const SQUAT_THRESHOLDS = {
  minRomDegrees: 40,
  minDurationMs: 800,
  maxDurationMs: 15000,
  minSmoothness: 0.35,
};

export type SquatPhase = 'standing' | 'squatting' | 'transition';

export interface SquatResult extends BaseExerciseResult {
  phase: SquatPhase;
  kneeAngle: number;
  /** true exactamente un cuadro cuando se detecta el punto más bajo del movimiento */
  atBottom: boolean;
  /** ángulo mínimo acumulado desde que entró a la fase squatting */
  minAngleReached: number;
  /** inclinación del tronco respecto a la vertical, en grados */
  torsoLean: number;
}

const KEY_INDICES = [
  LM.LEFT_HIP, LM.RIGHT_HIP,
  LM.LEFT_KNEE, LM.RIGHT_KNEE,
  LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
  LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
] as const;

export class SquatTracker implements ExerciseTracker<SquatResult> {
  private phase: SquatPhase = 'standing';
  private reps = 0;
  private minAngleSeen = 180;  // mínimo acumulado en la bajada actual
  private bottomFired = false; // garantiza que el evento dispare solo una vez por rep
  private maxLeanInRep = 0;    // peor inclinación de tronco vista en la rep en curso

  private analyzer = new MovementAnalyzer(SQUAT_THRESHOLDS);
  private fatigueDetector = new FatigueDetector();
  private lastRepMetrics: SquatResult['lastRepMetrics'] = null;

  update(world: Landmark[], timeMs: number): SquatResult {
    const orientationInfo = world.length > LM.RIGHT_SHOULDER
      ? getBodyOrientation(world[LM.LEFT_SHOULDER], world[LM.RIGHT_SHOULDER])
      : null;

    if (!areVisible(world, KEY_INDICES, MIN_VISIBILITY) || !orientationInfo) {
      return {
        phase: this.phase, reps: this.reps,
        feedbackLevel: 'idle',
        feedbackMessage: 'Asegúrate de que tu cuerpo completo sea visible',
        kneeAngle: 0, primaryAngle: 0, atBottom: false,
        minAngleReached: this.minAngleSeen, torsoLean: 0,
        orientation: orientationInfo?.orientation ?? 'frontal',
        fatigue: this.fatigueDetector.getState(),
        lastRepMetrics: this.lastRepMetrics,
        rejectionMessage: null, velocity: 0, asymmetry: 0,
      };
    }

    // Ángulos anatómicos reales: invariantes a la posición de la cámara.
    const leftAngle = calculateAngle3D(
      world[LM.LEFT_HIP], world[LM.LEFT_KNEE], world[LM.LEFT_ANKLE]
    );
    const rightAngle = calculateAngle3D(
      world[LM.RIGHT_HIP], world[LM.RIGHT_KNEE], world[LM.RIGHT_ANKLE]
    );
    const kneeAngle = (leftAngle + rightAngle) / 2;
    const asymmetry = asymmetryRatio(leftAngle, rightAngle);

    const torsoLean = getTorsoInclination(
      world[LM.LEFT_SHOULDER], world[LM.RIGHT_SHOULDER],
      world[LM.LEFT_HIP], world[LM.RIGHT_HIP]
    );

    this.analyzer.addSample(kneeAngle, timeMs);

    const prevPhase = this.phase;

    // ── Transiciones de fase con histéresis ──
    if (kneeAngle > STANDING_ANGLE) {
      this.phase = 'standing';
    } else if (kneeAngle < BOTTOM_ANGLE) {
      this.phase = 'squatting';
    }
    // else: zona 100–160°, la fase se mantiene

    if (this.phase === 'squatting' && prevPhase !== 'squatting') {
      this.maxLeanInRep = 0;
    }

    if (this.phase === 'squatting' && torsoLean > this.maxLeanInRep) {
      this.maxLeanInRep = torsoLean;
    }

    // ── Cierre de repetición ──
    // Además de los gates posicionales originales, el ciclo debe superar la validación
    // temporal: duración, recorrido y continuidad. Un tirón brusco ya no cuenta (DEC-027).
    let rejectionMessage: string | null = null;

    if (prevPhase === 'squatting' && this.phase === 'standing' && this.bottomFired) {
      const validation = this.analyzer.validateRep(SQUAT_SHAPE);

      if (validation.valid) {
        this.reps++;
        this.lastRepMetrics = validation.metrics;
        this.fatigueDetector.addRep(validation.metrics, asymmetry);
      } else if (validation.reason) {
        rejectionMessage = REJECTION_MESSAGES[validation.reason];
      }
    }

    // ── Detección del fondo real ──
    let atBottom = false;

    if (this.phase === 'squatting') {
      if (kneeAngle < this.minAngleSeen) {
        this.minAngleSeen = kneeAngle;
      }
      // El fondo se confirma cuando el ángulo ya subió BOTTOM_CONFIRM_MARGIN por encima
      // del mínimo acumulado: el usuario pasó el punto más bajo y está subiendo.
      // La fase se mantiene en 'squatting' por histéresis hasta los 160°, así que esta
      // confirmación siempre ocurre antes de que se cierre el ciclo (DEC-034).
      if (!this.bottomFired && kneeAngle > this.minAngleSeen + BOTTOM_CONFIRM_MARGIN) {
        atBottom = true;
        this.bottomFired = true;
      }
    }

    const minAngleReached = this.minAngleSeen;

    // Al volver de pie se cierra el ciclo: se resetea el fondo y el ciclo siguiente se
    // analiza desde aquí. Se marca después de validar para no vaciar la ventana actual.
    if (this.phase === 'standing' && prevPhase !== 'standing') {
      this.bottomFired = false;
      this.minAngleSeen = 180;
      this.analyzer.markCycleBoundary();
    }

    return {
      phase: this.phase,
      reps: this.reps,
      kneeAngle,
      primaryAngle: kneeAngle,
      atBottom,
      minAngleReached,
      torsoLean,
      orientation: orientationInfo.orientation,
      fatigue: this.fatigueDetector.getState(),
      lastRepMetrics: this.lastRepMetrics,
      rejectionMessage,
      velocity: this.analyzer.currentVelocity(),
      asymmetry,
      ...this.buildFeedback(kneeAngle, torsoLean, asymmetry),
    };
  }

  reset(): void {
    this.phase = 'standing';
    this.reps = 0;
    this.minAngleSeen = 180;
    this.bottomFired = false;
    this.maxLeanInRep = 0;
    this.lastRepMetrics = null;
    this.analyzer.reset();
    this.fatigueDetector.reset();
  }

  /** Cierra la serie en curso sin borrar el conteo: reinicia la línea base de fatiga. */
  startNewSet(): void {
    this.fatigueDetector.reset();
    this.analyzer.reset();
  }

  private buildFeedback(
    kneeAngle: number, torsoLean: number, asymmetry: number
  ): Pick<SquatResult, 'feedbackLevel' | 'feedbackMessage'> {
    const fatigue = this.fatigueDetector.getState();
    if (fatigue.shouldRest) {
      return { feedbackLevel: 'bad', feedbackMessage: fatigue.message };
    }

    if (this.phase === 'squatting') {
      // La seguridad de la espalda tiene prioridad sobre la profundidad.
      if (torsoLean > MAX_TORSO_LEAN) {
        return { feedbackLevel: 'bad', feedbackMessage: 'Pecho arriba — estás inclinando la espalda' };
      }
      if (asymmetry > 0.18) {
        return { feedbackLevel: 'warning', feedbackMessage: 'Reparte el peso entre las dos piernas' };
      }
      if (kneeAngle <= GOOD_DEPTH_ANGLE) {
        return { feedbackLevel: 'good', feedbackMessage: '¡Excelente profundidad!' };
      }
      return { feedbackLevel: 'warning', feedbackMessage: 'Baja un poco más' };
    }

    if (this.phase === 'standing') {
      if (fatigue.level === 'high') {
        return { feedbackLevel: 'warning', feedbackMessage: fatigue.message };
      }
      return { feedbackLevel: 'idle', feedbackMessage: 'Listo — baja para la sentadilla' };
    }

    return { feedbackLevel: 'idle', feedbackMessage: '' };
  }
}

export { IDLE_FATIGUE };
