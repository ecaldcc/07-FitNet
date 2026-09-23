/**
 * Detección de fatiga a partir de la degradación del patrón de movimiento (ver DEC-028).
 *
 * Fundamento: en entrenamiento de fuerza, la velocidad de la fase concéntrica cae de forma
 * monótona conforme se acumula fatiga dentro de una serie, incluso con la carga constante.
 * Es el principio del entrenamiento basado en velocidad. Junto con la pérdida de recorrido
 * y el aumento de asimetría entre lados, da una estimación razonable sin ningún sensor
 * adicional: todo sale de los mismos landmarks que ya se procesan.
 *
 * Esto NO es un diagnóstico médico. Es un indicador para sugerir descanso.
 */

import type { RepMetrics } from './movementQuality';

export type FatigueLevel = 'fresh' | 'moderate' | 'high' | 'critical';

export interface FatigueState {
  level: FatigueLevel;
  /** 0–100. Combina caída de velocidad, pérdida de recorrido y asimetría. */
  score: number;
  /** Caída porcentual de velocidad concéntrica respecto a la línea base. */
  velocityDropPercent: number;
  /** Pérdida porcentual de recorrido respecto a la línea base. */
  romLossPercent: number;
  message: string;
  /** true cuando conviene cortar la serie. */
  shouldRest: boolean;
}

/** Repeticiones iniciales que definen la línea base de la serie. */
const BASELINE_REPS = 3;

/** Umbrales de caída de velocidad, en porcentaje sobre la línea base. */
const VELOCITY_MODERATE = 10;
const VELOCITY_HIGH     = 20;
const VELOCITY_CRITICAL = 30;

const FATIGUE_MESSAGES: Record<FatigueLevel, string> = {
  fresh:    'Ritmo sólido',
  moderate: 'Fatiga leve — mantén la técnica',
  high:     'Fatiga alta — quedan pocas repeticiones buenas',
  critical: 'Fatiga crítica — corta la serie y descansa',
};

/**
 * Acumula las repeticiones de una serie y estima el nivel de fatiga.
 * Se reinicia con `reset` al empezar cada serie nueva.
 */
export class FatigueDetector {
  private reps: RepMetrics[] = [];
  private baselineVelocity = 0;
  private baselineRom = 0;
  /** Asimetría media reportada por el tracker en las repeticiones recientes. */
  private recentAsymmetry = 0;

  /** Registra una repetición validada. Devuelve el estado de fatiga actualizado. */
  addRep(metrics: RepMetrics, asymmetry = 0): FatigueState {
    this.reps.push(metrics);
    // Media móvil suave: una repetición aislada con un landmark ruidoso no debe
    // disparar la alarma por sí sola.
    this.recentAsymmetry = this.recentAsymmetry * 0.7 + asymmetry * 0.3;

    if (this.reps.length === BASELINE_REPS) this.computeBaseline();

    return this.evaluate();
  }

  getState(): FatigueState {
    return this.evaluate();
  }

  reset(): void {
    this.reps = [];
    this.baselineVelocity = 0;
    this.baselineRom = 0;
    this.recentAsymmetry = 0;
  }

  get repCount(): number {
    return this.reps.length;
  }

  private computeBaseline(): void {
    const base = this.reps.slice(0, BASELINE_REPS);
    this.baselineVelocity =
      base.reduce((acc, r) => acc + r.concentricVelocity, 0) / base.length;
    this.baselineRom =
      base.reduce((acc, r) => acc + r.romDegrees, 0) / base.length;
  }

  private evaluate(): FatigueState {
    const fresh: FatigueState = {
      level: 'fresh', score: 0, velocityDropPercent: 0, romLossPercent: 0,
      message: FATIGUE_MESSAGES.fresh, shouldRest: false,
    };

    // Sin línea base establecida no hay nada contra qué comparar.
    if (this.reps.length < BASELINE_REPS || this.baselineVelocity <= 0) return fresh;

    // Se comparan las últimas repeticiones, no la última sola, para que un cuadro
    // ruidoso no dispare un salto de nivel.
    const recent = this.reps.slice(-3);
    const recentVelocity =
      recent.reduce((acc, r) => acc + r.concentricVelocity, 0) / recent.length;
    const recentRom =
      recent.reduce((acc, r) => acc + r.romDegrees, 0) / recent.length;

    const velocityDropPercent = Math.max(
      0, ((this.baselineVelocity - recentVelocity) / this.baselineVelocity) * 100
    );
    const romLossPercent = this.baselineRom > 0
      ? Math.max(0, ((this.baselineRom - recentRom) / this.baselineRom) * 100)
      : 0;

    // La velocidad es el indicador principal; recorrido y asimetría lo corrigen.
    const score = Math.min(100,
      velocityDropPercent * 2 +
      romLossPercent * 1.5 +
      this.recentAsymmetry * 40
    );

    let level: FatigueLevel = 'fresh';
    if (velocityDropPercent >= VELOCITY_CRITICAL || score >= 70)      level = 'critical';
    else if (velocityDropPercent >= VELOCITY_HIGH || score >= 45)     level = 'high';
    else if (velocityDropPercent >= VELOCITY_MODERATE || score >= 22) level = 'moderate';

    return {
      level,
      score: Math.round(score),
      velocityDropPercent: Math.round(velocityDropPercent),
      romLossPercent: Math.round(romLossPercent),
      message: FATIGUE_MESSAGES[level],
      shouldRest: level === 'critical',
    };
  }
}

/** Color asociado a cada nivel, compartido por la interfaz. */
export const FATIGUE_COLOR: Record<FatigueLevel, string> = {
  fresh:    '#30D158',
  moderate: '#FFD60A',
  high:     '#FF9F0A',
  critical: '#FF375F',
};
