import { lazy, Suspense, useEffect, useRef } from 'react';
import { getDemo, sampleDemo } from '../../exercises/demoPoses';
import type { Pose3DHandle } from '../Pose3DView';

// Three.js se carga aparte: la ficha escrita se muestra de inmediato y la demo aparece
// cuando la librería termina de llegar (DEC-029).
const Pose3DView = lazy(() =>
  import('../Pose3DView').then(m => ({ default: m.Pose3DView }))
);

const DEMO_COLOR = '#30D158';

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Demostración animada de la técnica correcta (ver DEC-033).
 *
 * El texto de fase y el ángulo se escriben directo en el DOM desde el bucle de
 * animación, sin pasar por el estado de React: actualizar estado 60 veces por segundo
 * solo para dos textos cortos sería trabajo desperdiciado en el celular.
 */
export function ExerciseDemo3D({ exerciseId }: { exerciseId: string }) {
  const def = getDemo(exerciseId);
  const viewRef = useRef<Pose3DHandle | null>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);
  const angleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!def) return;
    let frame = 0;
    let lastText = 0;
    const start = performance.now();

    const loop = (now: number) => {
      const { p, phase } = sampleDemo(def, now - start);
      const world = def.pose(p);
      viewRef.current?.update(world, DEMO_COLOR);

      // El texto cambia unas 12 veces por segundo: suficiente para leerse fluido.
      if (now - lastText > 80) {
        if (phaseRef.current) phaseRef.current.textContent = phase.label;
        if (angleRef.current) angleRef.current.textContent = `${Math.round(def.measure(world))}°`;
        lastText = now;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [def]);

  if (!def) return null;

  return (
    <figure className="demo3d">
      <div className="demo3d-stage">
        <Suspense fallback={<div className="demo3d-canvas demo3d-loading">Cargando demostración…</div>}>
          <Pose3DView
            ref={viewRef}
            className="demo3d-canvas"
            initialRotation={def.initialRotation}
            autoRotateSpeed={prefersReducedMotion() ? 0 : 0.003}
          />
        </Suspense>
        <div className="demo3d-readout" aria-hidden="true">
          <span className="demo3d-readout-label">{def.measureLabel}</span>
          <span className="demo3d-readout-value" ref={angleRef}>—</span>
        </div>
      </div>
      <figcaption className="demo3d-caption">
        <span className="demo3d-phase" ref={phaseRef} aria-live="off">{def.phases[0].label}</span>
        <span className="demo3d-target">{def.targetText}</span>
        <span className="demo3d-hint">Arrastra para girar el modelo · doble toque para reiniciar</span>
      </figcaption>
    </figure>
  );
}
