/**
 * Análisis de calidad de movimiento: velocidad, tempo, suavidad y validación de repeticiones.
 *
 * Problema que resuelve (ver DEC-027):
 * Los trackers originales contaban una repetición cuando el ángulo cruzaba dos umbrales
 * en secuencia. Ese criterio es puramente posicional y no distingue una sentadilla real
 * de un tirón brusco, de un ajuste de ropa o de un salto de landmarks de MediaPipe: si el
 * ángulo pasa por los valores correctos, cuenta. Por eso "cualquier movimiento" sumaba.
 *
 * Aquí se agrega la dimensión temporal. Una repetición legítima tiene duración mínima,
 * recorrido angular mínimo y un perfil de velocidad coherente. Un artefacto no cumple
 * las tres condiciones a la vez.
 */

/** Una muestra de ángulo con su marca de tiempo. */
interface AngleSample {
  angle: number;
  timeMs: number;
}

/** Métricas de una repetición ya validada. */
export interface RepMetrics {
  /** Recorrido angular total de la repetición, en grados. */
  romDegrees: number;
  /** Duración total, en milisegundos. */
  durationMs: number;
  /** Duración de la fase de esfuerzo (concéntrica), en milisegundos. */
  concentricMs: number;
  /** Duración de la fase de retorno (excéntrica), en milisegundos. */
  eccentricMs: number;
  /** Velocidad media de la fase concéntrica, en grados por segundo. */
  concentricVelocity: number;
  /** Velocidad máxima alcanzada, en grados por segundo. */
  peakVelocity: number;
  /** 0–1. Mide qué tan continuo fue el recorrido; 1 = perfectamente fluido. */
  smoothness: number;
  /** Momento en que se cerró la repetición. */
  completedAtMs: number;
}

export type RejectionReason =
  | 'too_fast'
  | 'too_slow'
  | 'insufficient_rom'
  | 'erratic';

export interface ValidationResult {
  valid: boolean;
  reason?: RejectionReason;
  metrics: RepMetrics;
}

export interface QualityThresholds {
  /** Recorrido angular mínimo para aceptar la repetición. */
  minRomDegrees: number;
  /** Duración mínima. Por debajo, el movimiento es un tirón, no una repetición. */
  minDurationMs: number;
  /**
   * Duración mínima de la fase de esfuerzo. Por debajo, el peso se movió con impulso
   * y no con el músculo. Atrapa el balanceo aunque el ciclo completo dure lo suficiente,
   * por ejemplo dos tirones seguidos que el detector ve como un solo ciclo.
   */
  minConcentricMs: number;
  /** Duración máxima. Por encima, es una pausa o el usuario abandonó el movimiento. */
  maxDurationMs: number;
  /** Suavidad mínima. Por debajo, el recorrido fue errático o hubo salto de landmarks. */
  minSmoothness: number;
}

/**
 * Valores por defecto, deliberadamente permisivos.
 *
 * Criterio: es preferible dejar pasar alguna repetición dudosa a rechazar repeticiones
 * legítimas de un usuario que entrena lento o con pausa. Cada ejercicio ajusta estos
 * números según su cadencia natural.
 */
export const DEFAULT_THRESHOLDS: QualityThresholds = {
  minRomDegrees: 35,
  minDurationMs: 600,
  // Una fase de esfuerzo controlada dura 400 ms o más, incluso a ritmo rápido.
  minConcentricMs: 250,
  maxDurationMs: 12000,
  minSmoothness: 0.35,
};

/** Mensajes para el usuario cuando se descarta una repetición. */
export const REJECTION_MESSAGES: Record<RejectionReason, string> = {
  too_fast:         'Movimiento muy rápido — controla el recorrido',
  too_slow:         'Repetición muy lenta — mantén el ritmo',
  insufficient_rom: 'Recorrido incompleto — no cuenta',
  erratic:          'Movimiento irregular — busca un recorrido continuo',
};


/**
 * Estructura temporal de un ejercicio: dónde está el esfuerzo dentro del ciclo.
 *
 * - `effortIsMinimum`: el punto de máximo esfuerzo es el ángulo MÍNIMO (fondo de la
 *   sentadilla, cima del curl) o el MÁXIMO (bloqueo del press).
 * - `concentricFirst`: el ciclo empieza con la fase de esfuerzo (curl y press: subes y
 *   luego bajas) o con la fase de bajada (sentadilla: bajas y luego subes).
 *
 * Sin estos dos datos no se puede saber cuál mitad del ciclo es la concéntrica, y la
 * detección de fatiga mide la fase equivocada (ver DEC-035).
 */
export interface CycleShape {
  effortIsMinimum: boolean;
  concentricFirst: boolean;
}

/**
 * Retroceso mínimo, en grados, para contar un cambio de dirección.
 *
 * El temblor de MediaPipe produce oscilaciones de 2 a 6 grados cuadro a cuadro. Contar
 * cada cambio de signo de la velocidad convertía ese ruido en decenas de "inversiones"
 * y hacía rechazar todas las repeticiones (DEC-035). Con histéresis, solo cuenta un
 * cambio de dirección cuando el ángulo retrocede más que este margen desde el último
 * extremo, algo que el ruido no alcanza y un titubeo real sí.
 */
const REVERSAL_THRESHOLD = 12;

/**
 * Distancia al extremo de reposo, en grados, dentro de la cual se considera que el
 * usuario todavía no empezó a moverse. Se usa para recortar la pausa entre repeticiones.
 */
const REST_BAND = 6;

/**
 * Acumula muestras de ángulo y evalúa si un ciclo completo merece contarse.
 *
 * Se instancia una vez por ejercicio y vive mientras dura la serie. El tracker le
 * entrega cada cuadro con `addSample`, marca con `markCycleBoundary` cada vuelta a la
 * posición de reposo y, cuando su máquina de estados cree haber cerrado un ciclo,
 * llama a `validateRep` para decidir si ese ciclo era real.
 */
export class MovementAnalyzer {
  private samples: AngleSample[] = [];
  /** Índice dentro de `samples` de la última vuelta a la posición de reposo. */
  private boundaryIndex = 0;
  private thresholds: QualityThresholds;

  /** Límite del buffer: a 60 fps son ~20 s de historial, suficiente para una repetición lenta. */
  private static readonly MAX_SAMPLES = 1200;

  constructor(thresholds: Partial<QualityThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  addSample(angle: number, timeMs: number): void {
    this.samples.push({ angle, timeMs });

    if (this.samples.length > MovementAnalyzer.MAX_SAMPLES) {
      const removed = this.samples.length - MovementAnalyzer.MAX_SAMPLES;
      this.samples.splice(0, removed);
      // El índice se desplaza con el recorte para seguir apuntando al mismo cuadro.
      this.boundaryIndex = Math.max(0, this.boundaryIndex - removed);
    }
  }

  /**
   * Marca el cuadro actual como vuelta a la posición de reposo.
   *
   * El ciclo siguiente se analiza desde aquí. La pausa que el usuario haga en reposo
   * antes de moverse se recorta después, en `validateRep`, así que marcar temprano no
   * infla la duración de la repetición.
   */
  markCycleBoundary(): void {
    this.boundaryIndex = Math.max(0, this.samples.length - 1);
  }

  /**
   * Velocidad angular instantánea en grados por segundo, sobre los últimos cuadros.
   *
   * Se promedia una ventana corta en lugar de usar solo el último par de muestras
   * porque el ruido cuadro a cuadro de MediaPipe domina la derivada puntual.
   */
  currentVelocity(windowSize = 5): number {
    const n = this.samples.length;
    if (n < 2) return 0;

    const start = Math.max(0, n - windowSize);
    const first = this.samples[start];
    const last  = this.samples[n - 1];

    const dt = last.timeMs - first.timeMs;
    if (dt <= 0) return 0;

    return ((last.angle - first.angle) / dt) * 1000;
  }

  /** Evalúa el ciclo en curso y decide si es una repetición legítima. */
  validateRep(shape: CycleShape): ValidationResult {
    const window = this.trimToMovement(this.samples.slice(this.boundaryIndex), shape);
    const metrics = computeMetrics(window, shape);

    if (metrics.romDegrees < this.thresholds.minRomDegrees) {
      return { valid: false, reason: 'insufficient_rom', metrics };
    }
    if (metrics.durationMs < this.thresholds.minDurationMs) {
      return { valid: false, reason: 'too_fast', metrics };
    }
    if (metrics.concentricMs < this.thresholds.minConcentricMs) {
      return { valid: false, reason: 'too_fast', metrics };
    }
    if (metrics.durationMs > this.thresholds.maxDurationMs) {
      return { valid: false, reason: 'too_slow', metrics };
    }
    if (metrics.smoothness < this.thresholds.minSmoothness) {
      return { valid: false, reason: 'erratic', metrics };
    }

    return { valid: true, metrics };
  }

  reset(): void {
    this.samples = [];
    this.boundaryIndex = 0;
  }

  /**
   * Recorta la pausa en reposo al inicio de la ventana.
   *
   * La ventana arranca en la última vuelta al reposo, pero el usuario puede quedarse
   * quieto varios segundos antes de la siguiente repetición. El movimiento real empieza
   * en el último cuadro, antes del punto de esfuerzo, en que el ángulo todavía estaba
   * dentro de la banda de reposo.
   */
  private trimToMovement(window: AngleSample[], shape: CycleShape): AngleSample[] {
    if (window.length < 3) return window;

    const effortIndex = findEffortIndex(window, shape.effortIsMinimum);

    // El reposo es el extremo opuesto al esfuerzo, buscado antes de este.
    let restAngle = window[0].angle;
    for (let i = 0; i <= effortIndex; i++) {
      const a = window[i].angle;
      if (shape.effortIsMinimum ? a > restAngle : a < restAngle) restAngle = a;
    }

    let start = 0;
    for (let i = effortIndex; i >= 0; i--) {
      if (Math.abs(window[i].angle - restAngle) <= REST_BAND) {
        start = i;
        break;
      }
    }
    return window.slice(start);
  }
}

function findEffortIndex(window: AngleSample[], effortIsMinimum: boolean): number {
  let index = 0;
  let value = window[0].angle;
  for (let i = 1; i < window.length; i++) {
    const a = window[i].angle;
    if (effortIsMinimum ? a < value : a > value) {
      value = a;
      index = i;
    }
  }
  return index;
}

function computeMetrics(window: AngleSample[], shape: CycleShape): RepMetrics {
  const empty: RepMetrics = {
    romDegrees: 0, durationMs: 0, concentricMs: 0, eccentricMs: 0,
    concentricVelocity: 0, peakVelocity: 0, smoothness: 0, completedAtMs: 0,
  };
  if (window.length < 3) return empty;

  const first = window[0];
  const last  = window[window.length - 1];
  const durationMs = last.timeMs - first.timeMs;

  const effortIndex = findEffortIndex(window, shape.effortIsMinimum);
  const effort = window[effortIndex];

  let minAngle = Infinity;
  let maxAngle = -Infinity;
  for (const s of window) {
    if (s.angle < minAngle) minAngle = s.angle;
    if (s.angle > maxAngle) maxAngle = s.angle;
  }
  const romDegrees = maxAngle - minAngle;

  // El punto de esfuerzo parte el ciclo en sus dos fases. Cuál es la concéntrica
  // depende del ejercicio: en el curl es la primera mitad, en la sentadilla la segunda.
  const firstHalfMs  = effort.timeMs - first.timeMs;
  const secondHalfMs = last.timeMs - effort.timeMs;
  const concentricMs = shape.concentricFirst ? firstHalfMs : secondHalfMs;
  const eccentricMs  = shape.concentricFirst ? secondHalfMs : firstHalfMs;

  const concentricTravel = shape.concentricFirst
    ? Math.abs(effort.angle - first.angle)
    : Math.abs(last.angle - effort.angle);
  const concentricVelocity = concentricMs > 0
    ? concentricTravel / (concentricMs / 1000)
    : 0;

  // Velocidad pico sobre una ventana de ~100 ms: la derivada cuadro a cuadro está
  // dominada por el ruido y daría picos que no existen en el movimiento real.
  let peakVelocity = 0;
  let j = 0;
  for (let i = 1; i < window.length; i++) {
    while (window[i].timeMs - window[j].timeMs > 100) j++;
    const dt = window[i].timeMs - window[j].timeMs;
    if (dt <= 0) continue;
    const v = Math.abs(window[i].angle - window[j].angle) / (dt / 1000);
    if (v > peakVelocity) peakVelocity = v;
  }

  return {
    romDegrees,
    durationMs,
    concentricMs,
    eccentricMs,
    concentricVelocity,
    peakVelocity,
    smoothness: computeSmoothness(window),
    completedAtMs: last.timeMs,
  };
}

/**
 * Suavidad del recorrido en escala 0–1, a partir de los cambios de dirección reales.
 *
 * Una repetición tiene un solo cambio de dirección: el punto de esfuerzo. Un titubeo
 * a mitad de recorrido agrega dos (retrocede y vuelve a avanzar). Se toleran hasta dos
 * titubeos antes de considerar el movimiento irregular, siguiendo el criterio de
 * DEC-027 de preferir aceptar una repetición dudosa antes que rechazar una legítima.
 */
function computeSmoothness(window: AngleSample[]): number {
  const reversals = countReversals(window.map(s => s.angle), REVERSAL_THRESHOLD);
  const excess = Math.max(0, reversals - 1);
  return Math.max(0, 1 - excess / 6);
}

/**
 * Cuenta cambios de dirección con histéresis: solo cuenta cuando el ángulo retrocede
 * más de `threshold` grados desde el último extremo alcanzado.
 */
export function countReversals(angles: number[], threshold: number): number {
  if (angles.length < 2) return 0;

  let direction = 0; // 0 = todavía sin dirección, 1 = subiendo, -1 = bajando
  let extreme = angles[0];
  let lowSinceStart = angles[0];
  let highSinceStart = angles[0];
  let reversals = 0;

  for (const a of angles) {
    if (direction === 0) {
      if (a < lowSinceStart) lowSinceStart = a;
      if (a > highSinceStart) highSinceStart = a;
      if (a - lowSinceStart >= threshold) { direction = 1; extreme = a; }
      else if (highSinceStart - a >= threshold) { direction = -1; extreme = a; }
    } else if (direction === 1) {
      if (a > extreme) extreme = a;
      else if (extreme - a >= threshold) { direction = -1; extreme = a; reversals++; }
    } else {
      if (a < extreme) extreme = a;
      else if (a - extreme >= threshold) { direction = 1; extreme = a; reversals++; }
    }
  }
  return reversals;
}
