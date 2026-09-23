import type { Landmark } from '@mediapipe/tasks-vision';

/**
 * Suavizado de landmarks con filtro One Euro (ver DEC-036).
 *
 * Problema: los `worldLandmarks` tiemblan entre 5 y 15 mm cuadro a cuadro aunque la
 * persona esté quieta. En segmentos cortos como el antebrazo, 15 mm equivalen a varios
 * grados de ángulo, y ese temblor se colaba en el conteo, en la velocidad que alimenta
 * la fatiga y en el visor 3D.
 *
 * Por qué One Euro y no un promedio móvil: un promedio fijo obliga a elegir entre
 * temblor y retraso. El One Euro adapta su frecuencia de corte a la velocidad de la
 * señal: filtra fuerte cuando el punto está casi quieto, donde el temblor es lo único
 * que hay, y deja pasar el movimiento cuando la articulación se mueve rápido, donde el
 * retraso sí importaría. Es la técnica estándar para este problema en seguimiento de
 * poses y manos en tiempo real.
 *
 * Referencia: Casiez, Roussel y Vogel, "1€ Filter", CHI 2012.
 */

/** Frecuencia de corte mínima en Hz: cuánto se suaviza con el punto quieto. */
const MIN_CUTOFF = 1.2;
/**
 * Cuánto sube la frecuencia de corte por cada metro por segundo de velocidad.
 * Valores más altos reducen el retraso en movimientos rápidos a costa de algo más de temblor.
 */
const BETA = 0.8;
/** Frecuencia de corte del estimador de velocidad. */
const DERIVATE_CUTOFF = 1.0;
/**
 * Pausa máxima entre cuadros antes de reiniciar el filtro. Si el detector pierde a la
 * persona un momento, arrastrar la posición vieja produciría una transición falsa.
 */
const MAX_GAP_MS = 500;

function smoothingFactor(cutoffHz: number, dtSeconds: number): number {
  const tau = 1 / (2 * Math.PI * cutoffHz);
  return 1 / (1 + tau / dtSeconds);
}

class OneEuroFilter {
  private prevValue = 0;
  private prevDerivative = 0;
  private initialized = false;

  filter(value: number, dtSeconds: number): number {
    if (!this.initialized) {
      this.initialized = true;
      this.prevValue = value;
      this.prevDerivative = 0;
      return value;
    }

    const rawDerivative = (value - this.prevValue) / dtSeconds;
    const aD = smoothingFactor(DERIVATE_CUTOFF, dtSeconds);
    const derivative = aD * rawDerivative + (1 - aD) * this.prevDerivative;

    const cutoff = MIN_CUTOFF + BETA * Math.abs(derivative);
    const a = smoothingFactor(cutoff, dtSeconds);
    const filtered = a * value + (1 - a) * this.prevValue;

    this.prevValue = filtered;
    this.prevDerivative = derivative;
    return filtered;
  }

  reset(): void {
    this.initialized = false;
  }
}

/** Mantiene un filtro por coordenada de cada uno de los 33 landmarks. */
export class LandmarkSmoother {
  private filters: OneEuroFilter[][] = [];
  private lastTimeMs = -Infinity;

  smooth(world: Landmark[], timeMs: number): Landmark[] {
    const gap = timeMs - this.lastTimeMs;
    if (gap > MAX_GAP_MS || gap <= 0) this.reset();

    // En el primer cuadro tras un reinicio el intervalo no importa: el filtro solo se inicializa.
    const dtSeconds = Number.isFinite(gap) && gap > 0 ? gap / 1000 : 1 / 30;
    this.lastTimeMs = timeMs;

    while (this.filters.length < world.length) {
      this.filters.push([new OneEuroFilter(), new OneEuroFilter(), new OneEuroFilter()]);
    }

    return world.map((p, i) => {
      const [fx, fy, fz] = this.filters[i];
      return {
        x: fx.filter(p.x, dtSeconds),
        y: fy.filter(p.y, dtSeconds),
        z: fz.filter(p.z, dtSeconds),
        // La visibilidad no se suaviza: los trackers la usan como compuerta y un valor
        // retrasado dejaría pasar cuadros donde el punto ya no se ve.
        visibility: p.visibility,
      };
    });
  }

  reset(): void {
    for (const trio of this.filters) for (const f of trio) f.reset();
    this.lastTimeMs = -Infinity;
  }
}
