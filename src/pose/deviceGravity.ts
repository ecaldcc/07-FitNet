import type { Landmark } from '@mediapipe/tasks-vision';
import type { Vec3 } from '../geometry/vectors3d';

/**
 * Alineación del esqueleto con la gravedad real usando el acelerómetro (ver DEC-040).
 *
 * Problema: los `worldLandmarks` de MediaPipe están alineados con la CÁMARA, no con el
 * suelo. MediaPipe no tiene acceso a los sensores del teléfono, así que su eje "abajo"
 * es el borde inferior de la imagen. Si el celular está inclinado 20°, el esqueleto
 * completo aparece inclinado 20°, piernas incluidas, y todas las medidas que usan la
 * vertical como referencia salen corridas: inclinación del tronco en sentadilla, arqueo
 * lumbar en press y balanceo del codo en curl.
 *
 * Solución: el acelerómetro mide la gravedad en los ejes del teléfono. Con eso se sabe
 * dónde está el "abajo" real en los ejes de la cámara, y se gira el esqueleto para que
 * coincida. Los ángulos articulares no cambian con la rotación; lo que se corrige son
 * las medidas contra la vertical.
 *
 * Por qué acelerómetro y no `deviceorientation`: los ángulos de Euler de ese evento
 * entran en bloqueo de cardán justo con el celular en vertical, que es como se usa esta
 * app. Una inclinación lateral tipo volante no se puede leer ahí. El vector de gravedad
 * del acelerómetro no tiene ese problema.
 */

const DEG = Math.PI / 180;

/** Constante de tiempo del suavizado: absorbe el pulso de la mano sin retrasar un reacomodo del celular. */
const SMOOTHING_MS = 400;
/**
 * Rango aceptado para el módulo de la lectura, en m/s². Fuera de él, el teléfono se
 * está moviendo y la lectura no es solo gravedad: se descarta.
 */
const MIN_G = 6.5;
const MAX_G = 13;
/**
 * Fracción mínima de la gravedad sobre el eje vertical de la pantalla. Por debajo, el
 * celular está casi horizontal: no puede estar filmando a una persona de pie, y el
 * signo de la lectura deja de ser confiable.
 */
const MIN_UPRIGHT = 0.35;
/** Inclinación máxima que se corrige. Más allá, algo no cuadra y es mejor no tocar nada. */
const MAX_CORRECTION_DEG = 60;

interface MotionPermissionApi {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

/** iOS 13 en adelante exige pedir permiso explícito para leer los sensores de movimiento. */
export function motionPermissionRequired(): boolean {
  return typeof DeviceMotionEvent !== 'undefined' &&
    typeof (DeviceMotionEvent as unknown as MotionPermissionApi).requestPermission === 'function';
}

/**
 * Pide permiso para los sensores de movimiento. En iOS debe llamarse directamente desde
 * un toque del usuario, antes de cualquier `await`, o Safari lo rechaza sin preguntar.
 * En Android y escritorio no hace falta permiso y devuelve `true` de inmediato.
 */
export async function requestMotionPermission(): Promise<boolean> {
  if (typeof DeviceMotionEvent === 'undefined') return false;
  const api = DeviceMotionEvent as unknown as MotionPermissionApi;
  if (typeof api.requestPermission !== 'function') return true;
  try {
    return (await api.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

function screenAngleDeg(): number {
  try {
    return screen.orientation?.angle ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Sigue la dirección de la gravedad con el acelerómetro, suavizada en el tiempo.
 * Se instancia una vez por pantalla de cámara, con `start` al montar y `stop` al salir.
 */
export class DeviceGravityTracker {
  /** "Abajo" en ejes de pantalla: x a la derecha, y hacia arriba, z saliendo de la pantalla. */
  private screenDown: Vec3 | null = null;
  private lastSampleMs = 0;
  private listening = false;

  start(): void {
    if (this.listening || typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return;
    window.addEventListener('devicemotion', this.onMotion);
    this.listening = true;
  }

  stop(): void {
    if (!this.listening) return;
    window.removeEventListener('devicemotion', this.onMotion);
    this.listening = false;
  }

  /** `true` desde que llegó al menos una lectura válida. */
  get hasReading(): boolean {
    return this.screenDown !== null;
  }

  private onMotion = (e: DeviceMotionEvent): void => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null || a.y == null || a.z == null) return;

    // Los ejes del sensor son los del teléfono; la imagen de la cámara sigue a la
    // pantalla. Si la pantalla está girada, se rota la lectura para igualarlos.
    const angle = screenAngleDeg() * DEG;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const sx = a.x * cos - a.y * sin;
    const sy = a.x * sin + a.y * cos;
    const sz = a.z;

    const magnitude = Math.hypot(sx, sy, sz);
    if (magnitude < MIN_G || magnitude > MAX_G) return;
    if (Math.abs(sy) / magnitude < MIN_UPRIGHT) return;

    // Android reporta la reacción del apoyo (apunta hacia arriba) e iOS reporta la
    // gravedad (apunta hacia abajo): la especificación y los navegadores no coinciden en
    // el signo. Con el celular en vertical, "abajo" siempre apunta hacia el borde inferior
    // de la pantalla, así que se elige el signo que cumple eso. No hace falta detectar
    // el navegador.
    const sign = sy > 0 ? -1 : 1;
    const sample: Vec3 = {
      x: (sign * sx) / magnitude,
      y: (sign * sy) / magnitude,
      z: (sign * sz) / magnitude,
    };

    const now = performance.now();
    if (!this.screenDown) {
      this.screenDown = sample;
    } else {
      const dt = Math.max(0, now - this.lastSampleMs);
      const k = 1 - Math.exp(-dt / SMOOTHING_MS);
      const d = this.screenDown;
      this.screenDown = {
        x: d.x + (sample.x - d.x) * k,
        y: d.y + (sample.y - d.y) * k,
        z: d.z + (sample.z - d.z) * k,
      };
    }
    this.lastSampleMs = now;
  };

  /**
   * Dirección "abajo" expresada en los ejes de `worldLandmarks`, o `null` si no hay una
   * lectura confiable. Esos ejes siguen a la imagen: x a la derecha, y hacia abajo, z
   * alejándose de la cámara.
   */
  worldDown(facing: 'environment' | 'user'): Vec3 | null {
    return this.screenDown ? screenDownToWorld(this.screenDown, facing) : null;
  }
}

/**
 * Pasa "abajo" de ejes de pantalla a ejes de `worldLandmarks`.
 *
 * Cámara trasera: mira hacia atrás del teléfono, así que alejarse de ella es ir contra
 * el eje z de la pantalla, y la derecha de la imagen es la derecha de la pantalla.
 * Cámara frontal: mira hacia el usuario, así que alejarse es ir a favor del eje z, y la
 * imagen sin espejar tiene la derecha invertida respecto de la pantalla.
 */
export function screenDownToWorld(down: Vec3, facing: 'environment' | 'user'): Vec3 {
  return facing === 'environment'
    ? { x: down.x, y: -down.y, z: -down.z }
    : { x: -down.x, y: -down.y, z: down.z };
}

/**
 * Gira los landmarks para que `worldDown` pase a ser el eje Y positivo.
 *
 * Usa la rotación mínima que lleva un vector al otro, alrededor del eje perpendicular a
 * ambos (fórmula de Rodrigues). Así no se introduce ningún giro alrededor de la vertical:
 * hacia dónde mira el usuario se conserva. El origen de `worldLandmarks` es el centro de
 * la cadera, que queda fijo.
 */
export function alignToGravity(world: Landmark[], worldDown: Vec3): Landmark[] {
  const len = Math.hypot(worldDown.x, worldDown.y, worldDown.z);
  if (len === 0) return world;
  const d = { x: worldDown.x / len, y: worldDown.y / len, z: worldDown.z / len };

  // Eje de giro = d × (0,1,0); coseno = d · (0,1,0).
  const kx = -d.z;
  const kz = d.x;
  const sinA = Math.hypot(kx, kz);
  const cosA = d.y;

  if (sinA < 1e-4) return world; // ya alineado
  if (Math.atan2(sinA, cosA) > MAX_CORRECTION_DEG * DEG) return world;

  const ux = kx / sinA;
  const uz = kz / sinA;

  return world.map(p => {
    // v' = v·cos + (k × v)·sin + k·(k·v)·(1 − cos), con k = (ux, 0, uz)
    const kDotV = ux * p.x + uz * p.z;
    const crossX = -uz * p.y;
    const crossY = uz * p.x - ux * p.z;
    const crossZ = ux * p.y;
    return {
      x: p.x * cosA + crossX * sinA + ux * kDotV * (1 - cosA),
      y: p.y * cosA + crossY * sinA,
      z: p.z * cosA + crossZ * sinA + uz * kDotV * (1 - cosA),
      visibility: p.visibility,
    };
  });
}
