import type { Landmark } from '@mediapipe/tasks-vision';
import {
  LM, calculateAngle3D, angleBetween, subtract, getBodyOrientation,
  asymmetryRatio,
} from '../geometry/vectors3d';
import { MovementAnalyzer, REJECTION_MESSAGES } from '../analysis/movementQuality';
import { FatigueDetector } from '../analysis/fatigue';
import { type BaseExerciseResult, type ExerciseTracker } from './types';

const EXTENDED_ANGLE = 160;  // > este valor → brazo extendido (abajo)
const FLEXED_ANGLE   = 60;   // < este valor → brazo en cima del curl
export const GOOD_FORM_ANGLE = 50; // < este valor → contracción completa
// Confirmación de cima por cuadros consecutivos (ver DEC-016)
const RISING_PER_FRAME  = 0.5; // delta mínimo para contar cuadro como "subiendo" o "bajando"
const MIN_RISING_FRAMES = 3;   // cuadros consecutivos de subida para confirmar que se pasó la cima
// Validación de rango de movimiento: el brazo debe haber estado a ≥ este ángulo
// antes del curl para que la rep cuente (evita falsas reps por movimientos parciales)
const MIN_START_ANGLE = 130;
// Cooldown post-rep: bloquea el segundo brazo en curls bilaterales (~15 cuadros ≈ 250 ms
// a 60 fps) sin bloquear curls alternos donde el segundo brazo dispara >500 ms después (DEC-022)
const REP_COOLDOWN_FRAMES = 15;
const MIN_VISIBILITY   = 0.5;
const LATERAL_VIS_DIFF = 0.35; // diferencia de visibilidad para detectar vista lateral

/**
 * Desviación máxima tolerada del brazo respecto a la vertical, en grados.
 *
 * Detecta el balanceo: usar impulso de hombro y cadera en vez de bíceps. En 2D era
 * indetectable porque el codo puede desplazarse hacia adelante (fuera del plano de la
 * imagen) sin que su proyección cambie. En 3D el desplazamiento en profundidad es
 * directamente medible (ver DEC-026).
 */
const MAX_UPPER_ARM_DRIFT = 25;

/**
 * El curl empieza con el esfuerzo: subes y luego bajas.
 * La contracción máxima es el ángulo mínimo de codo.
 */
const CURL_SHAPE = { effortIsMinimum: true, concentricFirst: true } as const;

/** Umbrales de calidad ajustados a la cadencia natural de un curl. */
const CURL_THRESHOLDS = {
  minRomDegrees: 50,
  minDurationMs: 700,
  maxDurationMs: 10000,
  minSmoothness: 0.3,
};

export type CurlPhase = 'extended' | 'flexed';

export interface BicepCurlResult extends BaseExerciseResult {
  phase: CurlPhase;
  elbowAngle: number;
  /** true exactamente un cuadro cuando se detecta la cima del movimiento */
  atTop: boolean;
  /** ángulo mínimo acumulado en la fase flexed (menor = mejor contracción) */
  minAngleReached: number;
  activeArm: 'left' | 'right' | 'both';
  /** desviación del brazo respecto a la vertical, en grados */
  upperArmDrift: number;
}

// Tracker de un solo brazo — señaliza eventos sin mantener contador de reps propio.
// El contador vive en BicepCurlTracker para unificar curls bilaterales y alternos (DEC-022).
class ArmTracker {
  phase: CurlPhase = 'extended';
  prevAngle = 180;
  minAngleSeen = 180;
  maxAngleSeen = 0;        // máximo ángulo mientras está en 'extended'
  maxAngleBeforeCurl = 0;  // capturado al entrar a 'flexed'; gate de rango mínimo
  topFired = false;
  risingFrames = 0;

  update(angle: number): {
    repCompleted: boolean; atTop: boolean; minAngleReached: number;
    phase: CurlPhase; cycleStarted: boolean;
  } {
    const prevPhase = this.phase;

    // Transiciones con histéresis: zona 60–160° conserva la fase actual
    if      (angle > EXTENDED_ANGLE) this.phase = 'extended';
    else if (angle < FLEXED_ANGLE)   this.phase = 'flexed';

    if (this.phase === 'extended' && angle > this.maxAngleSeen) {
      this.maxAngleSeen = angle;
    }

    // Capturar el máximo del tramo extendido justo al entrar a 'flexed'
    const cycleStarted = this.phase === 'flexed' && prevPhase !== 'flexed';
    if (cycleStarted) {
      this.maxAngleBeforeCurl = this.maxAngleSeen;
    }

    const repCompleted = prevPhase === 'flexed' && this.phase === 'extended'
      && this.topFired && this.maxAngleBeforeCurl >= MIN_START_ANGLE;

    // Detección de cima real por confirmación de cuadros consecutivos (ver DEC-016)
    let atTop = false;
    if (this.phase === 'flexed') {
      if (angle < this.minAngleSeen) this.minAngleSeen = angle;
      // Solo resetear risingFrames si el ángulo baja claramente; cuadros estables por
      // ruido de MediaPipe en la cima no deben interrumpir la confirmación.
      if (angle > this.prevAngle + RISING_PER_FRAME) {
        this.risingFrames++;
      } else if (angle < this.prevAngle - RISING_PER_FRAME) {
        this.risingFrames = 0;
      }
      if (!this.topFired && this.risingFrames >= MIN_RISING_FRAMES) {
        atTop = true;
        this.topFired = true;
      }
    }

    const minAngleReached = this.minAngleSeen;

    // Resetear al volver al brazo extendido
    if (this.phase === 'extended' && prevPhase !== 'extended') {
      this.topFired = false;
      this.minAngleSeen = 180;
      this.risingFrames = 0;
      this.maxAngleSeen = 0;
      this.maxAngleBeforeCurl = 0;
    }

    this.prevAngle = angle;
    return { repCompleted, atTop, minAngleReached, phase: this.phase, cycleStarted };
  }

  reset(): void {
    this.phase = 'extended';
    this.prevAngle = 180;
    this.minAngleSeen = 180;
    this.maxAngleSeen = 0;
    this.maxAngleBeforeCurl = 0;
    this.topFired = false;
    this.risingFrames = 0;
  }
}

export class BicepCurlTracker implements ExerciseTracker<BicepCurlResult> {
  private left = new ArmTracker();
  private right = new ArmTracker();
  private reps = 0;
  private repCooldown = 0; // cuadros restantes de cooldown post-rep

  private analyzer = new MovementAnalyzer(CURL_THRESHOLDS);
  private fatigueDetector = new FatigueDetector();
  private lastRepMetrics: BicepCurlResult['lastRepMetrics'] = null;
  private maxDriftInRep = 0;
  /** Fase combinada de ambos brazos en el cuadro anterior, para detectar el fin del ciclo. */
  private prevAggregatePhase: CurlPhase = 'extended';

  update(world: Landmark[], timeMs: number): BicepCurlResult {
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
        phase: 'extended', reps: this.reps,
        feedbackLevel: 'idle', feedbackMessage: 'Asegúrate de que tu brazo sea visible',
        elbowAngle: 0, primaryAngle: 0, atTop: false, minAngleReached: 180,
        activeArm: 'both', upperArmDrift: 0,
        orientation: orientationInfo?.orientation ?? 'frontal',
        fatigue: this.fatigueDetector.getState(),
        lastRepMetrics: this.lastRepMetrics,
        rejectionMessage: null, velocity: 0, asymmetry: 0,
      };
    }

    if (this.repCooldown > 0) this.repCooldown--;

    let leftRes = null;
    let rightRes = null;
    let leftAngle = 180;
    let rightAngle = 180;
    let leftDrift = 0;
    let rightDrift = 0;

    if (leftCanUse) {
      leftAngle = calculateAngle3D(
        world[LM.LEFT_SHOULDER], world[LM.LEFT_ELBOW], world[LM.LEFT_WRIST]
      );
      leftDrift = upperArmDrift(world[LM.LEFT_SHOULDER], world[LM.LEFT_ELBOW]);
      leftRes = this.left.update(leftAngle);
    }
    if (rightCanUse) {
      rightAngle = calculateAngle3D(
        world[LM.RIGHT_SHOULDER], world[LM.RIGHT_ELBOW], world[LM.RIGHT_WRIST]
      );
      rightDrift = upperArmDrift(world[LM.RIGHT_SHOULDER], world[LM.RIGHT_ELBOW]);
      rightRes = this.right.update(rightAngle);
    }

    // Ángulo primario: el brazo más contraído (menor ángulo)
    const elbowAngle = leftCanUse && rightCanUse
      ? Math.min(leftAngle, rightAngle)
      : leftCanUse ? leftAngle : rightAngle;

    const drift = leftCanUse && rightCanUse
      ? Math.max(leftDrift, rightDrift)
      : leftCanUse ? leftDrift : rightDrift;

    const asymmetry = leftCanUse && rightCanUse
      ? asymmetryRatio(leftAngle, rightAngle)
      : 0;

    this.analyzer.addSample(elbowAngle, timeMs);

    if ((leftRes?.cycleStarted ?? false) || (rightRes?.cycleStarted ?? false)) {
      this.maxDriftInRep = 0;
    }
    if (drift > this.maxDriftInRep) this.maxDriftInRep = drift;

    // OR logic: cualquier brazo que complete el ciclo dispara la rep.
    // El cooldown absorbe la señal del segundo brazo en curls bilaterales (DEC-022).
    // La validación temporal se suma encima: el ciclo además debe ser un movimiento
    // real y no un tirón (DEC-027).
    const eitherRepCompleted =
      (leftRes?.repCompleted ?? false) || (rightRes?.repCompleted ?? false);

    let rejectionMessage: string | null = null;

    if (eitherRepCompleted && this.repCooldown === 0) {
      const validation = this.analyzer.validateRep(CURL_SHAPE);

      if (validation.valid) {
        this.reps++;
        this.lastRepMetrics = validation.metrics;
        this.fatigueDetector.addRep(validation.metrics, asymmetry);
        this.repCooldown = REP_COOLDOWN_FRAMES;
      } else if (validation.reason) {
        rejectionMessage = REJECTION_MESSAGES[validation.reason];
        // Cooldown igual: evita que el segundo brazo reintente y vuelva a rechazar.
        this.repCooldown = REP_COOLDOWN_FRAMES;
      }
    }

    // Fase agregada: flexed si cualquier brazo está contraído
    const phase: CurlPhase =
      leftRes?.phase === 'flexed' || rightRes?.phase === 'flexed' ? 'flexed' : 'extended';

    // Con los dos brazos de vuelta abajo se cierra el ciclo. Se marca después de validar
    // para no vaciar la ventana que se acaba de evaluar.
    if (this.prevAggregatePhase === 'flexed' && phase === 'extended') {
      this.analyzer.markCycleBoundary();
    }
    this.prevAggregatePhase = phase;

    const atTop = (leftRes?.atTop ?? false) || (rightRes?.atTop ?? false);
    const minAngleReached = atTop
      ? Math.min(
          leftRes?.atTop ? leftRes.minAngleReached : 180,
          rightRes?.atTop ? rightRes.minAngleReached : 180,
        )
      : Math.min(leftRes?.minAngleReached ?? 180, rightRes?.minAngleReached ?? 180);

    const activeArm: BicepCurlResult['activeArm'] = isLateral
      ? (leftCanUse ? 'left' : 'right')
      : 'both';

    return {
      phase,
      reps: this.reps,
      elbowAngle,
      primaryAngle: elbowAngle,
      atTop,
      minAngleReached,
      activeArm,
      upperArmDrift: drift,
      orientation: orientationInfo.orientation,
      fatigue: this.fatigueDetector.getState(),
      lastRepMetrics: this.lastRepMetrics,
      rejectionMessage,
      velocity: this.analyzer.currentVelocity(),
      asymmetry,
      ...this.buildFeedback(elbowAngle, phase, drift, asymmetry),
    };
  }

  reset(): void {
    this.left.reset();
    this.right.reset();
    this.reps = 0;
    this.repCooldown = 0;
    this.maxDriftInRep = 0;
    this.prevAggregatePhase = 'extended';
    this.lastRepMetrics = null;
    this.analyzer.reset();
    this.fatigueDetector.reset();
  }

  startNewSet(): void {
    this.fatigueDetector.reset();
    this.analyzer.reset();
  }

  private buildFeedback(
    elbowAngle: number, phase: CurlPhase, drift: number, asymmetry: number
  ): Pick<BicepCurlResult, 'feedbackLevel' | 'feedbackMessage'> {
    const fatigue = this.fatigueDetector.getState();
    if (fatigue.shouldRest) {
      return { feedbackLevel: 'bad', feedbackMessage: fatigue.message };
    }

    // El balanceo invalida el estímulo del bíceps: se avisa antes que la contracción.
    if (drift > MAX_UPPER_ARM_DRIFT) {
      return { feedbackLevel: 'bad', feedbackMessage: 'Pega el codo al cuerpo — estás usando impulso' };
    }

    if (phase === 'flexed') {
      if (asymmetry > 0.2) {
        return { feedbackLevel: 'warning', feedbackMessage: 'Un brazo va adelantado — iguala el recorrido' };
      }
      if (elbowAngle <= GOOD_FORM_ANGLE) {
        return { feedbackLevel: 'good', feedbackMessage: '¡Contracción completa!' };
      }
      return { feedbackLevel: 'warning', feedbackMessage: 'Sube un poco más' };
    }

    if (fatigue.level === 'high') {
      return { feedbackLevel: 'warning', feedbackMessage: fatigue.message };
    }
    return { feedbackLevel: 'idle', feedbackMessage: 'Listo — sube el peso' };
  }
}

/**
 * Desviación del brazo (hombro→codo) respecto a la vertical descendente.
 * El eje Y de worldLandmarks apunta hacia abajo, por eso la referencia es (0, 1, 0).
 */
function upperArmDrift(shoulder: Landmark, elbow: Landmark): number {
  return angleBetween(subtract(elbow, shoulder), { x: 0, y: 1, z: 0 });
}
