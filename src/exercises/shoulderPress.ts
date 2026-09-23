import type { Landmark } from '@mediapipe/tasks-vision';
import {
  LM, calculateAngle3D, getBodyOrientation, getTorsoInclination,
  asymmetryRatio,
} from '../geometry/vectors3d';
import { MovementAnalyzer, REJECTION_MESSAGES } from '../analysis/movementQuality';
import { FatigueDetector } from '../analysis/fatigue';
import { type BaseExerciseResult, type ExerciseTracker } from './types';

const PRESSED_ANGLE = 150; // > este valor → fase "pressed" (pesas overhead)
const LOWERED_ANGLE = 100; // < este valor → fase "lowered" (pesas a nivel de hombro)
// Confirmación de pico por cuadros consecutivos (ver DEC-016, DEC-017)
const FALLING_PER_FRAME  = 0.5; // decremento mínimo por cuadro para contar como "bajando"
const MIN_FALLING_FRAMES = 3;   // cuadros consecutivos de bajada para confirmar el pico
export const GOOD_LOCKOUT_ANGLE = 145; // mínimo para "extensión completa" (evita hiperextensión)
export const SAFE_LOW_ANGLE = 80; // < este valor → alerta roja (riesgo de impingement)
// Cooldown post-rep: absorbe la señal del segundo brazo en press bilaterales (DEC-022/023)
const REP_COOLDOWN_FRAMES = 15;
const MIN_VISIBILITY   = 0.5;
const LATERAL_VIS_DIFF = 0.35; // diferencia de visibilidad para detectar vista lateral

/**
 * Inclinación de tronco máxima tolerada en el press, en grados.
 *
 * Por encima, el movimiento deja de ser press de hombro y se convierte en press
 * inclinado: el usuario arquea la espalda para reclutar pectoral. Medible solo en 3D,
 * porque la inclinación aparente en 2D depende de dónde esté puesta la cámara (DEC-026).
 */
const MAX_BACK_ARCH = 25;

/**
 * El press empieza con el esfuerzo: empujas y luego bajas.
 * Polaridad invertida respecto al curl: el bloqueo es el ángulo MÁXIMO de codo.
 */
const PRESS_SHAPE = { effortIsMinimum: false, concentricFirst: true } as const;

/** Umbrales de calidad ajustados a la cadencia natural de un press. */
const PRESS_THRESHOLDS = {
  minRomDegrees: 45,
  minDurationMs: 700,
  maxDurationMs: 10000,
  minSmoothness: 0.3,
};

export type PressPhase = 'lowered' | 'pressed';

export interface ShoulderPressResult extends BaseExerciseResult {
  phase: PressPhase;
  elbowAngle: number;
  /** true exactamente un cuadro cuando se detecta el pico del movimiento */
  atPeak: boolean;
  /** ángulo máximo acumulado en la fase pressed actual (mayor = mejor extensión) */
  maxAngleReached: number;
  activeArm: 'left' | 'right' | 'both';
  /** inclinación del tronco respecto a la vertical, en grados */
  backArch: number;
}

// Tracker de un solo brazo — polaridad inversa al curl (pico = ángulo MÁXIMO).
// No mantiene contador propio; el contador vive en ShoulderPressTracker (DEC-023).
class ArmPressTracker {
  phase: PressPhase = 'lowered';
  prevAngle = 0;     // inicializa bajo porque el brazo empieza a nivel de hombro (~90°)
  maxAngleSeen = 0;  // acumula el MÁXIMO (opuesto al minAngleSeen del curl)
  peakFired = false;
  fallingFrames = 0;

  update(angle: number): {
    repCompleted: boolean; atPeak: boolean; maxAngleReached: number;
    phase: PressPhase; cycleStarted: boolean;
  } {
    const prevPhase = this.phase;

    // Transiciones con histéresis: zona 100°–150° conserva la fase actual
    if      (angle > PRESSED_ANGLE) this.phase = 'pressed';
    else if (angle < LOWERED_ANGLE) this.phase = 'lowered';

    const cycleStarted = this.phase === 'pressed' && prevPhase !== 'pressed';

    const repCompleted =
      prevPhase === 'pressed' && this.phase === 'lowered' && this.peakFired;

    // Detección de pico real por confirmación de cuadros consecutivos (ver DEC-016).
    // El pico es el MÁXIMO de ángulo → se confirma cuando el ángulo empieza a BAJAR.
    let atPeak = false;
    if (this.phase === 'pressed') {
      if (angle > this.maxAngleSeen) this.maxAngleSeen = angle;
      // Solo se resetea fallingFrames si el ángulo sube claramente; los cuadros estables
      // (ruido de MediaPipe en el pico overhead) no deben interrumpir la confirmación.
      if (angle < this.prevAngle - FALLING_PER_FRAME) {
        this.fallingFrames++;
      } else if (angle > this.prevAngle + FALLING_PER_FRAME) {
        this.fallingFrames = 0;
      }
      if (!this.peakFired && this.fallingFrames >= MIN_FALLING_FRAMES) {
        atPeak = true;
        this.peakFired = true;
      }
    }

    const maxAngleReached = this.maxAngleSeen;

    // Resetear al volver el brazo a posición lowered
    if (this.phase === 'lowered' && prevPhase !== 'lowered') {
      this.peakFired = false;
      this.maxAngleSeen = 0;
      this.fallingFrames = 0;
    }

    this.prevAngle = angle;
    return { repCompleted, atPeak, maxAngleReached, phase: this.phase, cycleStarted };
  }

  reset(): void {
    this.phase = 'lowered';
    this.prevAngle = 0;
    this.maxAngleSeen = 0;
    this.peakFired = false;
    this.fallingFrames = 0;
  }
}

export class ShoulderPressTracker implements ExerciseTracker<ShoulderPressResult> {
  private left = new ArmPressTracker();
  private right = new ArmPressTracker();
  private reps = 0;
  private repCooldown = 0; // cuadros restantes de cooldown post-rep

  private analyzer = new MovementAnalyzer(PRESS_THRESHOLDS);
  private fatigueDetector = new FatigueDetector();
  private lastRepMetrics: ShoulderPressResult['lastRepMetrics'] = null;
  /** Fase combinada de ambos brazos en el cuadro anterior, para detectar el fin del ciclo. */
  private prevAggregatePhase: PressPhase = 'lowered';

  update(world: Landmark[], timeMs: number): ShoulderPressResult {
    // Visibilidad mínima del trío hombro-codo-muñeca por lado
    const leftVis = Math.min(
      world[LM.LEFT_SHOULDER]?.visibility ?? 0,
      world[LM.LEFT_ELBOW]?.visibility ?? 0,
      world[LM.LEFT_WRIST]?.visibility ?? 0,
    );
    const rightVis = Math.min(
      world[LM.RIGHT_SHOULDER]?.visibility ?? 0,
      world[LM.RIGHT_ELBOW]?.visibility ?? 0,
      world[LM.RIGHT_WRIST]?.visibility ?? 0,
    );

    // Vista lateral: un brazo supera al otro en más de LATERAL_VIS_DIFF
    const isLateral = Math.abs(leftVis - rightVis) > LATERAL_VIS_DIFF;
    const useLeft   = !isLateral || leftVis >= rightVis;
    const useRight  = !isLateral || rightVis > leftVis;

    const leftCanUse  = useLeft  && leftVis  >= MIN_VISIBILITY;
    const rightCanUse = useRight && rightVis >= MIN_VISIBILITY;

    const orientationInfo = world.length > LM.RIGHT_SHOULDER
      ? getBodyOrientation(world[LM.LEFT_SHOULDER], world[LM.RIGHT_SHOULDER])
      : null;

    if ((!leftCanUse && !rightCanUse) || !orientationInfo) {
      return {
        phase: 'lowered', reps: this.reps,
        feedbackLevel: 'idle', feedbackMessage: 'Asegúrate de que tu brazo sea visible',
        elbowAngle: 0, primaryAngle: 0, atPeak: false, maxAngleReached: 0,
        activeArm: 'both', backArch: 0,
        orientation: orientationInfo?.orientation ?? 'frontal',
        fatigue: this.fatigueDetector.getState(),
        lastRepMetrics: this.lastRepMetrics,
        rejectionMessage: null, velocity: 0, asymmetry: 0,
      };
    }

    if (this.repCooldown > 0) this.repCooldown--;

    let leftRes = null;
    let rightRes = null;
    let leftAngle = 0;
    let rightAngle = 0;

    if (leftCanUse) {
      leftAngle = calculateAngle3D(
        world[LM.LEFT_SHOULDER], world[LM.LEFT_ELBOW], world[LM.LEFT_WRIST]
      );
      leftRes = this.left.update(leftAngle);
    }
    if (rightCanUse) {
      rightAngle = calculateAngle3D(
        world[LM.RIGHT_SHOULDER], world[LM.RIGHT_ELBOW], world[LM.RIGHT_WRIST]
      );
      rightRes = this.right.update(rightAngle);
    }

    const backArch = getTorsoInclination(
      world[LM.LEFT_SHOULDER], world[LM.RIGHT_SHOULDER],
      world[LM.LEFT_HIP], world[LM.RIGHT_HIP]
    );

    // Ángulo primario: el brazo más extendido (MÁXIMO — opuesto al curl que usa mínimo)
    const elbowAngle = leftCanUse && rightCanUse
      ? Math.max(leftAngle, rightAngle)
      : leftCanUse ? leftAngle : rightAngle;

    const asymmetry = leftCanUse && rightCanUse
      ? asymmetryRatio(leftAngle, rightAngle)
      : 0;

    this.analyzer.addSample(elbowAngle, timeMs);

    // OR logic: cualquier brazo que complete el ciclo dispara la rep.
    // El cooldown absorbe la señal del segundo brazo en press bilaterales (DEC-023).
    // Encima se suma la validación temporal del movimiento (DEC-027).
    const eitherRepCompleted =
      (leftRes?.repCompleted ?? false) || (rightRes?.repCompleted ?? false);

    let rejectionMessage: string | null = null;

    if (eitherRepCompleted && this.repCooldown === 0) {
      // Polaridad invertida: en el press el extremo del recorrido es el ángulo MÁXIMO.
      const validation = this.analyzer.validateRep(PRESS_SHAPE);

      if (validation.valid) {
        this.reps++;
        this.lastRepMetrics = validation.metrics;
        this.fatigueDetector.addRep(validation.metrics, asymmetry);
      } else if (validation.reason) {
        rejectionMessage = REJECTION_MESSAGES[validation.reason];
      }
      this.repCooldown = REP_COOLDOWN_FRAMES;
    }

    // Fase agregada: pressed si cualquier brazo está overhead
    const phase: PressPhase =
      leftRes?.phase === 'pressed' || rightRes?.phase === 'pressed' ? 'pressed' : 'lowered';

    // Con los dos brazos de vuelta a la altura de los hombros se cierra el ciclo.
    // Se marca después de validar para no vaciar la ventana que se acaba de evaluar.
    if (this.prevAggregatePhase === 'pressed' && phase === 'lowered') {
      this.analyzer.markCycleBoundary();
    }
    this.prevAggregatePhase = phase;

    const atPeak = (leftRes?.atPeak ?? false) || (rightRes?.atPeak ?? false);
    const maxAngleReached = atPeak
      ? Math.max(
          leftRes?.atPeak ? leftRes.maxAngleReached : 0,
          rightRes?.atPeak ? rightRes.maxAngleReached : 0,
        )
      : Math.max(leftRes?.maxAngleReached ?? 0, rightRes?.maxAngleReached ?? 0);

    const activeArm: ShoulderPressResult['activeArm'] = isLateral
      ? (leftCanUse ? 'left' : 'right')
      : 'both';

    return {
      phase,
      reps: this.reps,
      elbowAngle,
      primaryAngle: elbowAngle,
      atPeak,
      maxAngleReached,
      activeArm,
      backArch,
      orientation: orientationInfo.orientation,
      fatigue: this.fatigueDetector.getState(),
      lastRepMetrics: this.lastRepMetrics,
      rejectionMessage,
      velocity: this.analyzer.currentVelocity(),
      asymmetry,
      ...this.buildFeedback(elbowAngle, phase, backArch, asymmetry),
    };
  }

  reset(): void {
    this.left.reset();
    this.right.reset();
    this.reps = 0;
    this.repCooldown = 0;
    this.prevAggregatePhase = 'lowered';
    this.lastRepMetrics = null;
    this.analyzer.reset();
    this.fatigueDetector.reset();
  }

  startNewSet(): void {
    this.fatigueDetector.reset();
    this.analyzer.reset();
  }

  private buildFeedback(
    elbowAngle: number, phase: PressPhase, backArch: number, asymmetry: number
  ): Pick<ShoulderPressResult, 'feedbackLevel' | 'feedbackMessage'> {
    const fatigue = this.fatigueDetector.getState();
    if (fatigue.shouldRest) {
      return { feedbackLevel: 'bad', feedbackMessage: fatigue.message };
    }

    // El arqueo lumbar es el riesgo principal del press de pie: va antes que todo.
    if (backArch > MAX_BACK_ARCH) {
      return { feedbackLevel: 'bad', feedbackMessage: 'Aprieta el abdomen — estás arqueando la espalda' };
    }

    if (phase === 'pressed') {
      if (asymmetry > 0.2) {
        return { feedbackLevel: 'warning', feedbackMessage: 'Un brazo sube más que el otro' };
      }
      if (elbowAngle >= GOOD_LOCKOUT_ANGLE) {
        return { feedbackLevel: 'good', feedbackMessage: '¡Extensión completa!' };
      }
      return { feedbackLevel: 'warning', feedbackMessage: 'Extiende un poco más' };
    }

    // phase === 'lowered'
    if (elbowAngle < SAFE_LOW_ANGLE && elbowAngle > 0) {
      return { feedbackLevel: 'bad', feedbackMessage: 'No bajes tanto — cuida los hombros' };
    }
    if (fatigue.level === 'high') {
      return { feedbackLevel: 'warning', feedbackMessage: fatigue.message };
    }
    return { feedbackLevel: 'idle', feedbackMessage: 'Listo — empuja hacia arriba' };
  }
}
