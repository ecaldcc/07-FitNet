/**
 * Geometría vectorial en 3D sobre los `worldLandmarks` de MediaPipe.
 *
 * Diferencia crítica con `angles.ts` (2D):
 * `angles.ts` opera sobre `landmarks` (coordenadas normalizadas de PANTALLA), por lo
 * que el ángulo medido depende del ángulo de la cámara. Un usuario girado 45° respecto
 * al lente produce segmentos proyectados más cortos y ángulos sistemáticamente
 * sobreestimados (una sentadilla profunda real puede medirse como 120° en vez de 85°).
 *
 * Este módulo opera sobre `worldLandmarks`: coordenadas métricas con origen en el punto
 * medio de la cadera, independientes de la posición y orientación de la cámara. El ángulo
 * resultante es el ángulo anatómico real, no su proyección. Ver DEC-026.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Índices de landmarks de MediaPipe Pose (33 puntos). Compartido por todos los trackers. */
export const LM = {
  NOSE:            0,
  LEFT_SHOULDER:  11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW:     13,
  RIGHT_ELBOW:    14,
  LEFT_WRIST:     15,
  RIGHT_WRIST:    16,
  LEFT_HIP:       23,
  RIGHT_HIP:      24,
  LEFT_KNEE:      25,
  RIGHT_KNEE:     26,
  LEFT_ANKLE:     27,
  RIGHT_ANKLE:    28,
  LEFT_HEEL:      29,
  RIGHT_HEEL:     30,
  LEFT_FOOT:      31,
  RIGHT_FOOT:     32,
} as const;

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function magnitude(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function normalize(v: Vec3): Vec3 {
  const m = magnitude(v);
  if (m === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / m, y: v.y / m, z: v.z / m };
}

export function midpoint(a: Vec3, b: Vec3): Vec3 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

/** Distancia euclidiana en 3D. En worldLandmarks el resultado está en metros. */
export function distance3D(a: Vec3, b: Vec3): number {
  return magnitude(subtract(a, b));
}

/**
 * Ángulo real en el vértice B formado por los segmentos BA y BC. Rango 0–180°.
 *
 * Usa producto punto en lugar de `atan2`: en 3D no existe un "sentido de giro"
 * bien definido sin un plano de referencia, y para articulaciones solo importa la
 * apertura. El clamp del coseno a [-1, 1] es obligatorio porque la acumulación de
 * error en punto flotante puede producir 1.0000000002, y `Math.acos` de eso es NaN.
 */
export function calculateAngle3D(A: Vec3, B: Vec3, C: Vec3): number {
  const ba = subtract(A, B);
  const bc = subtract(C, B);

  const magBa = magnitude(ba);
  const magBc = magnitude(bc);
  if (magBa === 0 || magBc === 0) return 0;

  const cosine = Math.max(-1, Math.min(1, dot(ba, bc) / (magBa * magBc)));
  return (Math.acos(cosine) * 180) / Math.PI;
}

/** Ángulo entre dos vectores libres (no requiere vértice común). Rango 0–180°. */
export function angleBetween(u: Vec3, v: Vec3): number {
  const magU = magnitude(u);
  const magV = magnitude(v);
  if (magU === 0 || magV === 0) return 0;

  const cosine = Math.max(-1, Math.min(1, dot(u, v) / (magU * magV)));
  return (Math.acos(cosine) * 180) / Math.PI;
}

export type BodyOrientation = 'frontal' | 'diagonal' | 'lateral';

export interface OrientationInfo {
  /** 0° = hombros perpendiculares al lente (de frente); 90° = de perfil. */
  yawDegrees: number;
  orientation: BodyOrientation;
  /** Hacia qué lado apunta el cuerpo cuando está de perfil. */
  facing: 'left' | 'right' | 'camera';
}

/**
 * Determina la orientación del torso respecto a la cámara.
 *
 * En worldLandmarks el eje X corre paralelo al plano de la imagen y el eje Z mide
 * profundidad. Si el usuario está de frente, el vector entre hombros es casi puro X;
 * si está de perfil, ese mismo vector se vuelca sobre Z. La proporción entre ambas
 * componentes da el ángulo de giro sin necesidad de calibración.
 *
 * Esto NO se usa para corregir los ángulos (el cálculo 3D ya es invariante a la
 * orientación), sino para dos cosas distintas: elegir qué validaciones aplican en
 * cada ejercicio y avisarle al usuario cuando se colocó mal para ese movimiento.
 */
export function getBodyOrientation(shoulderL: Vec3, shoulderR: Vec3): OrientationInfo {
  const shoulderVec = subtract(shoulderR, shoulderL);

  const yawDegrees =
    (Math.atan2(Math.abs(shoulderVec.z), Math.abs(shoulderVec.x)) * 180) / Math.PI;

  let orientation: BodyOrientation;
  if (yawDegrees < 30) orientation = 'frontal';
  else if (yawDegrees < 60) orientation = 'diagonal';
  else orientation = 'lateral';

  let facing: OrientationInfo['facing'] = 'camera';
  if (orientation === 'lateral') {
    // z negativo = más cerca del lente. Si el hombro derecho está delante, el
    // usuario mira hacia su izquierda desde el punto de vista de la cámara.
    facing = shoulderVec.z < 0 ? 'left' : 'right';
  }

  return { yawDegrees, orientation, facing };
}

/**
 * Inclinación del torso respecto a la vertical, en grados.
 * 0° = tronco erguido; 90° = tronco horizontal (posición de plancha o peso muerto bajo).
 *
 * El eje Y de worldLandmarks apunta hacia abajo, por eso la vertical de referencia
 * es (0, -1, 0): el vector que va de la cadera hacia la cabeza.
 */
export function getTorsoInclination(
  shoulderL: Vec3, shoulderR: Vec3,
  hipL: Vec3, hipR: Vec3
): number {
  const shoulderMid = midpoint(shoulderL, shoulderR);
  const hipMid      = midpoint(hipL, hipR);
  const torsoVec    = subtract(shoulderMid, hipMid);

  return angleBetween(torsoVec, { x: 0, y: -1, z: 0 });
}

/**
 * Asimetría entre el lado izquierdo y el derecho, como fracción del promedio.
 * 0 = perfectamente simétrico; 0.2 = un lado se mueve 20% distinto al otro.
 *
 * Es un indicador temprano de compensación: cuando un lado se fatiga, el cuerpo
 * transfiere carga al contrario y la asimetría crece antes de que el usuario lo note.
 */
export function asymmetryRatio(leftValue: number, rightValue: number): number {
  const mean = (leftValue + rightValue) / 2;
  if (mean === 0) return 0;
  return Math.abs(leftValue - rightValue) / mean;
}

/**
 * Verifica que un conjunto de landmarks supere el umbral de visibilidad.
 * Los worldLandmarks conservan el campo `visibility` de su equivalente 2D.
 */
export function areVisible(
  landmarks: { visibility?: number }[],
  indices: readonly number[],
  minVisibility = 0.5
): boolean {
  return indices.every(i => (landmarks[i]?.visibility ?? 0) >= minVisibility);
}
