import type { Landmark } from '@mediapipe/tasks-vision';
import { LM, calculateAngle3D, type Vec3 } from '../geometry/vectors3d';
import { GOOD_DEPTH_ANGLE } from './squat';
import { GOOD_FORM_ANGLE } from './bicepCurl';
import { GOOD_LOCKOUT_ANGLE } from './shoulderPress';

/**
 * Demostraciones animadas de técnica correcta para los ejercicios con análisis 3D
 * (ver DEC-033).
 *
 * El esqueleto se genera por cinemática directa: para cada instante se definen unos
 * pocos ángulos articulares y se calculan las 33 posiciones en el mismo sistema de
 * coordenadas que `worldLandmarks`. Eso tiene dos ventajas deliberadas:
 *
 * 1. La demo se dibuja con el mismo visor que el análisis en vivo, sin código aparte.
 * 2. El ángulo que se muestra durante la demo se mide con `calculateAngle3D`, la misma
 *    función que evalúa al usuario. Lo que se enseña y lo que se exige coinciden.
 *
 * Convención de ejes, idéntica a MediaPipe: X positivo hacia el lado izquierdo del
 * sujeto, Y positivo hacia abajo, Z negativo hacia adelante del sujeto.
 */

// ── Medidas corporales de referencia, en metros, para una persona de ~1.75 m ──
const HIP_HALF = 0.1;
const SHOULDER_HALF = 0.18;
const THIGH = 0.43;
const SHIN = 0.43;
const TORSO = 0.5;
const UPPER_ARM = 0.29;
const FOREARM = 0.26;
const NECK_TO_HEAD = 0.22;
const STANCE_HALF = 0.14;
/** Altura del tobillo cuando la cadera está en el origen y las piernas estiradas. */
const ANKLE_Y = THIGH + SHIN;

const DEG = Math.PI / 180;

function v(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}
function add(a: Vec3, b: Vec3): Vec3 {
  return v(a.x + b.x, a.y + b.y, a.z + b.z);
}
function scale(a: Vec3, s: number): Vec3 {
  return v(a.x * s, a.y * s, a.z * s);
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Dirección en el plano sagital a `deg` grados de la vertical descendente, girando hacia adelante. */
function sagittalDown(deg: number): Vec3 {
  return v(0, Math.cos(deg * DEG), -Math.sin(deg * DEG));
}
/** Dirección en el plano sagital a `deg` grados de la vertical ascendente, girando hacia adelante. */
function sagittalUp(deg: number): Vec3 {
  return v(0, -Math.cos(deg * DEG), -Math.sin(deg * DEG));
}

interface Skeleton {
  hipL: Vec3; hipR: Vec3;
  kneeL: Vec3; kneeR: Vec3;
  ankleL: Vec3; ankleR: Vec3;
  shoulderL: Vec3; shoulderR: Vec3;
  elbowL: Vec3; elbowR: Vec3;
  wristL: Vec3; wristR: Vec3;
  /** Vector unitario de la columna, de cadera a hombros. */
  spineUp: Vec3;
  /** Vector unitario hacia donde mira el pecho. */
  chestForward: Vec3;
}

/**
 * Completa los 33 landmarks a partir de las articulaciones principales.
 * Cara, manos y pies se colocan con desplazamientos fijos: no participan en ningún
 * cálculo angular y solo existen para que el esqueleto se lea como un cuerpo.
 */
function toLandmarks(s: Skeleton): Landmark[] {
  const out: Vec3[] = new Array(33);

  const shoulderMid = scale(add(s.shoulderL, s.shoulderR), 0.5);
  const head = add(shoulderMid, scale(s.spineUp, NECK_TO_HEAD));
  const up = s.spineUp;
  const fwd = s.chestForward;

  const face = (side: number, upOff: number, fwdOff: number): Vec3 =>
    add(add(add(head, v(side, 0, 0)), scale(up, upOff)), scale(fwd, fwdOff));

  out[0] = face(0, 0, 0.09);             // nariz
  out[1] = face(0.02, 0.03, 0.08);       // ojo izquierdo interior
  out[2] = face(0.035, 0.03, 0.075);     // ojo izquierdo
  out[3] = face(0.05, 0.03, 0.065);      // ojo izquierdo exterior
  out[4] = face(-0.02, 0.03, 0.08);
  out[5] = face(-0.035, 0.03, 0.075);
  out[6] = face(-0.05, 0.03, 0.065);
  out[7] = face(0.075, 0.01, 0);         // oreja izquierda
  out[8] = face(-0.075, 0.01, 0);
  out[9] = face(0.025, -0.04, 0.08);     // boca
  out[10] = face(-0.025, -0.04, 0.08);

  out[LM.LEFT_SHOULDER] = s.shoulderL;
  out[LM.RIGHT_SHOULDER] = s.shoulderR;
  out[LM.LEFT_ELBOW] = s.elbowL;
  out[LM.RIGHT_ELBOW] = s.elbowR;
  out[LM.LEFT_WRIST] = s.wristL;
  out[LM.RIGHT_WRIST] = s.wristR;

  // Manos: continúan la dirección del antebrazo.
  const hand = (elbow: Vec3, wrist: Vec3, side: number) => {
    const dx = wrist.x - elbow.x, dy = wrist.y - elbow.y, dz = wrist.z - elbow.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    const dir = v(dx / len, dy / len, dz / len);
    return {
      pinky: add(add(wrist, scale(dir, 0.07)), v(side * 0.025, 0, 0)),
      index: add(wrist, scale(dir, 0.08)),
      thumb: add(add(wrist, scale(dir, 0.04)), v(-side * 0.03, 0, 0)),
    };
  };
  const hl = hand(s.elbowL, s.wristL, 1);
  const hr = hand(s.elbowR, s.wristR, -1);
  out[17] = hl.pinky; out[18] = hr.pinky;
  out[19] = hl.index; out[20] = hr.index;
  out[21] = hl.thumb; out[22] = hr.thumb;

  out[LM.LEFT_HIP] = s.hipL;
  out[LM.RIGHT_HIP] = s.hipR;
  out[LM.LEFT_KNEE] = s.kneeL;
  out[LM.RIGHT_KNEE] = s.kneeR;
  out[LM.LEFT_ANKLE] = s.ankleL;
  out[LM.RIGHT_ANKLE] = s.ankleR;

  // Pies apoyados en el suelo: talón detrás y punta delante del tobillo.
  out[LM.LEFT_HEEL] = add(s.ankleL, v(0, 0.06, 0.05));
  out[LM.RIGHT_HEEL] = add(s.ankleR, v(0, 0.06, 0.05));
  out[LM.LEFT_FOOT] = add(s.ankleL, v(0.02, 0.07, -0.17));
  out[LM.RIGHT_FOOT] = add(s.ankleR, v(-0.02, 0.07, -0.17));

  return out.map(p => ({ x: p.x, y: p.y, z: p.z, visibility: 1 }));
}

/** Piernas estiradas y torso erguido: la base de curl y press. */
function standingBase(): Pick<Skeleton, 'hipL' | 'hipR' | 'kneeL' | 'kneeR' | 'ankleL' | 'ankleR' | 'shoulderL' | 'shoulderR' | 'spineUp' | 'chestForward'> {
  const spineUp = v(0, -1, 0);
  const shoulderMid = scale(spineUp, TORSO);
  return {
    hipL: v(HIP_HALF, 0, 0),
    hipR: v(-HIP_HALF, 0, 0),
    kneeL: v(HIP_HALF + 0.01, THIGH, -0.01),
    kneeR: v(-HIP_HALF - 0.01, THIGH, -0.01),
    ankleL: v(HIP_HALF + 0.02, ANKLE_Y, 0),
    ankleR: v(-HIP_HALF - 0.02, ANKLE_Y, 0),
    shoulderL: add(shoulderMid, v(SHOULDER_HALF, 0, 0)),
    shoulderR: add(shoulderMid, v(-SHOULDER_HALF, 0, 0)),
    spineUp,
    chestForward: v(0, 0, -1),
  };
}

// ─────────────────────────────── Sentadilla ───────────────────────────────
/**
 * p = 0 de pie, p = 1 en el fondo.
 * Los pies quedan fijos en el suelo y todo lo demás se calcula hacia arriba desde ellos,
 * que es como se mueve el cuerpo real: la cadera baja y retrocede, las rodillas avanzan.
 */
function squatPose(p: number): Landmark[] {
  const kneeFlex = lerp(5, 100, p);      // 0 = pierna recta
  const ankleDorsi = lerp(0, 30, p);     // inclinación de la tibia hacia adelante
  const torsoLean = lerp(3, 38, p);      // inclinación del tronco hacia adelante
  const armRaise = lerp(15, 85, p);      // brazos al frente para equilibrar

  const shinDir = sagittalUp(ankleDorsi);
  // El muslo va del fémur hacia atrás: su ángulo con la vertical es flexión menos dorsiflexión.
  const thighAngle = kneeFlex - ankleDorsi;
  const thighDir = v(0, -Math.cos(thighAngle * DEG), Math.sin(thighAngle * DEG));

  const leg = (side: number) => {
    const ankle = v(side * STANCE_HALF, ANKLE_Y, 0);
    // Las rodillas siguen la línea de los pies, levemente abiertas: es la técnica que se enseña.
    const knee = add(add(ankle, scale(shinDir, SHIN)), v(side * 0.03 * p, 0, 0));
    const hip = add(v(side * HIP_HALF, knee.y, knee.z), scale(thighDir, THIGH));
    return { ankle, knee, hip };
  };
  const L = leg(1);
  const R = leg(-1);

  const hipMid = scale(add(L.hip, R.hip), 0.5);
  const spineUp = sagittalUp(torsoLean);
  const chestForward = v(0, Math.sin(torsoLean * DEG), -Math.cos(torsoLean * DEG));
  const shoulderMid = add(hipMid, scale(spineUp, TORSO));
  const shoulderL = add(shoulderMid, v(SHOULDER_HALF, 0, 0));
  const shoulderR = add(shoulderMid, v(-SHOULDER_HALF, 0, 0));

  const armDir = sagittalDown(armRaise);
  const elbowL = add(shoulderL, scale(armDir, UPPER_ARM));
  const elbowR = add(shoulderR, scale(armDir, UPPER_ARM));

  return toLandmarks({
    hipL: v(HIP_HALF, hipMid.y, hipMid.z), hipR: v(-HIP_HALF, hipMid.y, hipMid.z),
    kneeL: L.knee, kneeR: R.knee, ankleL: L.ankle, ankleR: R.ankle,
    shoulderL, shoulderR,
    elbowL, elbowR,
    wristL: add(elbowL, scale(armDir, FOREARM)),
    wristR: add(elbowR, scale(armDir, FOREARM)),
    spineUp, chestForward,
  });
}

// ─────────────────────────────── Curl de bíceps ───────────────────────────────
/**
 * p = 0 brazos extendidos, p = 1 contracción máxima.
 * El brazo queda vertical y fijo: el único movimiento es la flexión del codo. Esa
 * quietud del brazo es justamente lo que el tracker vigila para detectar balanceo.
 */
function curlPose(p: number): Landmark[] {
  const base = standingBase();
  const elbowFlex = lerp(12, 142, p);    // 0 = brazo recto; el ángulo interior es 180 − esto
  const forearmDir = sagittalDown(elbowFlex);

  const elbowL = add(base.shoulderL, v(0.02, UPPER_ARM, -0.02));
  const elbowR = add(base.shoulderR, v(-0.02, UPPER_ARM, -0.02));

  return toLandmarks({
    ...base,
    elbowL, elbowR,
    wristL: add(elbowL, scale(forearmDir, FOREARM)),
    wristR: add(elbowR, scale(forearmDir, FOREARM)),
  });
}

// ─────────────────────────────── Press de hombro ───────────────────────────────
/**
 * p = 0 pesas a la altura de los hombros, p = 1 bloqueo arriba.
 * El movimiento ocurre en el plano frontal. El brazo sube desde la horizontal hasta
 * casi vertical, y el antebrazo se mantiene cerca de la vertical todo el recorrido.
 */
function pressPose(p: number): Landmark[] {
  const base = standingBase();
  const upperArmAngle = lerp(-5, 75, p);   // grados sobre la horizontal
  const elbowAngle = lerp(90, 170, p);     // ángulo interior del codo
  // El antebrazo forma con el brazo el ángulo interior pedido, girando hacia arriba.
  const forearmAngle = upperArmAngle + (180 - elbowAngle);

  const arm = (shoulder: Vec3, side: number) => {
    const ua = upperArmAngle * DEG;
    const fa = forearmAngle * DEG;
    const elbow = add(shoulder, v(side * Math.cos(ua) * UPPER_ARM, -Math.sin(ua) * UPPER_ARM, -0.04));
    const wrist = add(elbow, v(side * Math.cos(fa) * FOREARM, -Math.sin(fa) * FOREARM, 0));
    return { elbow, wrist };
  };
  const L = arm(base.shoulderL, 1);
  const R = arm(base.shoulderR, -1);

  return toLandmarks({
    ...base,
    elbowL: L.elbow, elbowR: R.elbow,
    wristL: L.wrist, wristR: R.wrist,
  });
}

// ─────────────────────────────── Definición de las demos ───────────────────────────────

export interface DemoPhase {
  /** Texto que acompaña a la fase en pantalla. */
  label: string;
  durationMs: number;
  /** Valor de `p` al inicio y al final de la fase. */
  from: number;
  to: number;
}

export interface DemoDefinition {
  /** Giro inicial del visor: de perfil para movimientos sagitales, de frente para el press. */
  initialRotation: number;
  phases: DemoPhase[];
  pose(p: number): Landmark[];
  /** Ángulo clave que se muestra en vivo, medido con la misma función que usa el tracker. */
  measure(world: Landmark[]): number;
  measureLabel: string;
  /** Qué exige la app para considerar la técnica correcta. */
  targetText: string;
}

export const DEMOS: Record<string, DemoDefinition> = {
  sentadilla: {
    initialRotation: -Math.PI / 2.6,
    phases: [
      { label: 'Posición inicial', durationMs: 600, from: 0, to: 0 },
      { label: 'Baja controlado, cadera atrás', durationMs: 1700, from: 0, to: 1 },
      { label: 'Fondo: muslos paralelos al suelo', durationMs: 400, from: 1, to: 1 },
      { label: 'Empuja con los talones', durationMs: 1200, from: 1, to: 0 },
    ],
    pose: squatPose,
    measure: w => (
      calculateAngle3D(w[LM.LEFT_HIP], w[LM.LEFT_KNEE], w[LM.LEFT_ANKLE]) +
      calculateAngle3D(w[LM.RIGHT_HIP], w[LM.RIGHT_KNEE], w[LM.RIGHT_ANKLE])
    ) / 2,
    measureLabel: 'Rodilla',
    targetText: `La app cuenta la profundidad como buena por debajo de ${GOOD_DEPTH_ANGLE}° de rodilla.`,
  },
  'curl-biceps': {
    initialRotation: -Math.PI / 2.6,
    phases: [
      { label: 'Brazos extendidos', durationMs: 500, from: 0, to: 0 },
      { label: 'Sube sin mover el codo', durationMs: 1100, from: 0, to: 1 },
      { label: 'Aprieta arriba', durationMs: 400, from: 1, to: 1 },
      { label: 'Baja despacio hasta estirar', durationMs: 1700, from: 1, to: 0 },
    ],
    pose: curlPose,
    measure: w => Math.min(
      calculateAngle3D(w[LM.LEFT_SHOULDER], w[LM.LEFT_ELBOW], w[LM.LEFT_WRIST]),
      calculateAngle3D(w[LM.RIGHT_SHOULDER], w[LM.RIGHT_ELBOW], w[LM.RIGHT_WRIST]),
    ),
    measureLabel: 'Codo',
    targetText: `La app cuenta la contracción como completa por debajo de ${GOOD_FORM_ANGLE}° de codo.`,
  },
  'press-hombro': {
    initialRotation: -Math.PI / 7,
    phases: [
      { label: 'Pesas a la altura de los hombros', durationMs: 500, from: 0, to: 0 },
      { label: 'Empuja hacia arriba', durationMs: 1100, from: 0, to: 1 },
      { label: 'Extensión sin bloquear', durationMs: 400, from: 1, to: 1 },
      { label: 'Baja controlado', durationMs: 1700, from: 1, to: 0 },
    ],
    pose: pressPose,
    measure: w => Math.max(
      calculateAngle3D(w[LM.LEFT_SHOULDER], w[LM.LEFT_ELBOW], w[LM.LEFT_WRIST]),
      calculateAngle3D(w[LM.RIGHT_SHOULDER], w[LM.RIGHT_ELBOW], w[LM.RIGHT_WRIST]),
    ),
    measureLabel: 'Codo',
    targetText: `La app cuenta la extensión como completa por encima de ${GOOD_LOCKOUT_ANGLE}° de codo.`,
  },
};

export function getDemo(exerciseId: string): DemoDefinition | undefined {
  return DEMOS[exerciseId];
}

/**
 * Posición de la demo en un instante dado.
 * Suaviza cada fase con una curva que acelera y frena, porque una interpolación lineal
 * se ve mecánica y no transmite el control que se le pide al usuario.
 */
export function sampleDemo(def: DemoDefinition, elapsedMs: number): { p: number; phase: DemoPhase } {
  const total = def.phases.reduce((acc, ph) => acc + ph.durationMs, 0);
  let t = elapsedMs % total;

  for (const phase of def.phases) {
    if (t < phase.durationMs) {
      const x = phase.durationMs > 0 ? t / phase.durationMs : 1;
      const eased = x * x * (3 - 2 * x);
      return { p: lerp(phase.from, phase.to, eased), phase };
    }
    t -= phase.durationMs;
  }
  const last = def.phases[def.phases.length - 1];
  return { p: last.to, phase: last };
}
