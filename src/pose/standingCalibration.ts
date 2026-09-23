import type { Landmark } from '@mediapipe/tasks-vision';
import {
  LM, angleBetween, calculateAngle3D, midpoint, normalize, subtract, type Vec3,
} from '../geometry/vectors3d';
import { alignToGravity } from './deviceGravity';

/**
 * Calibración de la vertical con la postura de pie (ver DEC-043).
 *
 * Problema: aun con el acelerómetro corrigiendo la inclinación del celular (DEC-040), la
 * primera prueba real mostró el cuerpo entero inclinado unos 20° en el visor 3D, con la
 * persona derecha y el celular vertical. No es un error de la cámara sino del modelo: con
 * una sola cámara, la profundidad es lo que peor estima MediaPipe. A una persona de frente
 * suele ubicarle los pies más cerca o más lejos de la cámara que la cabeza, y el esqueleto
 * completo queda rotado como un bloque. El acelerómetro no puede ver ese error.
 *
 * Solución: de pie y con las piernas estiradas, el eje que va del centro de los tobillos al
 * centro de los hombros es vertical en la realidad. Se mide cuánto se desvía ese eje en lo
 * que estima el modelo y se descuenta esa desviación de todos los cuadros siguientes.
 *
 * Solo se aprende de posturas de pie. En el fondo de una sentadilla o con la espalda
 * arqueada no se actualiza, así que medir la inclinación del tronco sigue teniendo sentido:
 * se mide contra la postura de pie de la misma persona, frente a la misma cámara.
 */

/** Rodillas por encima de este ángulo cuentan como estiradas. */
const STRAIGHT_KNEE = 160;
/** Ángulo hombro-cadera-rodilla mínimo: el tronco sigue la línea de las piernas. */
const STRAIGHT_HIP = 155;
/** Visibilidad exigida: calibrar con puntos estimados fuera del cuadro sería peor que no calibrar. */
const MIN_VISIBILITY = 0.6;
/** Una desviación mayor no es un error de profundidad sino otra postura o una mala detección. */
const MAX_CORRECTION_DEG = 35;
/** Suavizado del eje: absorbe el temblor sin tardar en seguir un cambio de lugar del celular. */
const SMOOTHING_MS = 800;
/** Tiempo de pie acumulado antes de aplicar la corrección, para no corregir con un solo cuadro. */
const MIN_STANDING_MS = 500;
/** Salto máximo entre cuadros que se toma como tiempo de pie. Evita que una pausa larga cuente. */
const MAX_FRAME_GAP_MS = 100;

const UP: Vec3 = { x: 0, y: -1, z: 0 };

const REQUIRED = [
  LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP,
  LM.LEFT_KNEE, LM.RIGHT_KNEE, LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
] as const;

/** De pie, cuerpo completo a la vista, rodillas y cadera estiradas. */
export function isStandingStraight(world: Landmark[]): boolean {
  if (world.length <= LM.RIGHT_ANKLE) return false;
  if (!REQUIRED.every(i => (world[i].visibility ?? 0) >= MIN_VISIBILITY)) return false;

  const kneeL = calculateAngle3D(world[LM.LEFT_HIP], world[LM.LEFT_KNEE], world[LM.LEFT_ANKLE]);
  const kneeR = calculateAngle3D(world[LM.RIGHT_HIP], world[LM.RIGHT_KNEE], world[LM.RIGHT_ANKLE]);
  const hipL = calculateAngle3D(world[LM.LEFT_SHOULDER], world[LM.LEFT_HIP], world[LM.LEFT_KNEE]);
  const hipR = calculateAngle3D(world[LM.RIGHT_SHOULDER], world[LM.RIGHT_HIP], world[LM.RIGHT_KNEE]);

  return kneeL > STRAIGHT_KNEE && kneeR > STRAIGHT_KNEE &&
    hipL > STRAIGHT_HIP && hipR > STRAIGHT_HIP;
}

/** Eje del cuerpo, de tobillos a hombros, normalizado. */
function bodyAxis(world: Landmark[]): Vec3 {
  const ankles = midpoint(world[LM.LEFT_ANKLE], world[LM.RIGHT_ANKLE]);
  const shoulders = midpoint(world[LM.LEFT_SHOULDER], world[LM.RIGHT_SHOULDER]);
  return normalize(subtract(shoulders, ankles));
}

export class StandingCalibrator {
  /** Eje del cuerpo de pie, suavizado. Apunta hacia arriba (y negativa en worldLandmarks). */
  private axis: Vec3 | null = null;
  private standingMs = 0;
  private lastTimeMs = -Infinity;

  /** Aprende de un cuadro si la persona está de pie y derecha. No modifica los landmarks. */
  update(world: Landmark[], timeMs: number): void {
    const gap = timeMs - this.lastTimeMs;
    this.lastTimeMs = timeMs;
    if (!isStandingStraight(world)) return;

    const sample = bodyAxis(world);
    if (angleBetween(sample, UP) > MAX_CORRECTION_DEG) return;

    const dt = gap > 0 && gap <= MAX_FRAME_GAP_MS ? gap : 0;
    if (!this.axis) {
      this.axis = sample;
    } else {
      const k = 1 - Math.exp(-dt / SMOOTHING_MS);
      this.axis = normalize({
        x: this.axis.x + (sample.x - this.axis.x) * k,
        y: this.axis.y + (sample.y - this.axis.y) * k,
        z: this.axis.z + (sample.z - this.axis.z) * k,
      });
    }
    this.standingMs += dt;
  }

  get calibrated(): boolean {
    return this.axis !== null && this.standingMs >= MIN_STANDING_MS;
  }

  /** Grados que se corrigen, o `null` si todavía no hay calibración. */
  get correctionDeg(): number | null {
    return this.calibrated && this.axis ? angleBetween(this.axis, UP) : null;
  }

  /** Gira el esqueleto para que el eje de pie aprendido quede vertical. */
  apply(world: Landmark[]): Landmark[] {
    if (!this.calibrated || !this.axis) return world;
    // Llevar el eje "arriba" a (0,-1,0) es lo mismo que llevar su opuesto a (0,1,0).
    return alignToGravity(world, { x: -this.axis.x, y: -this.axis.y, z: -this.axis.z });
  }

  reset(): void {
    this.axis = null;
    this.standingMs = 0;
    this.lastTimeMs = -Infinity;
  }
}
