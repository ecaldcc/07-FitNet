import {
  DIFFICULTY_COLORS, DIFFICULTY_LABELS, getExercise, getMuscleLabel,
} from '../../exercises/catalog';
import { getTutorial, TUTORIAL_DISCLAIMER } from '../../exercises/tutorials';
import { ExerciseDemo3D } from './ExerciseDemo3D';

/**
 * Ficha de técnica de un ejercicio (ver DEC-033).
 *
 * Se reutiliza en tres lugares: la pantalla dedicada, la hoja deslizable del editor y
 * del selector, y el aviso automático antes de la primera sesión con cámara. Por eso no
 * incluye botones de acción: cada contenedor agrega los suyos.
 */
export function ExerciseTutorialContent({ exerciseId }: { exerciseId: string }) {
  const def = getExercise(exerciseId);
  const tutorial = getTutorial(exerciseId);

  if (!def || !tutorial) {
    return <p className="muted">No hay ficha disponible para este ejercicio.</p>;
  }

  const trackingLabel = def.tracking === 'camera'
    ? 'Análisis 3D por cámara'
    : def.tracking === 'time' ? 'Con temporizador' : 'Conteo manual';

  return (
    <article className="tutorial">
      <header className="tutorial-head">
        <h2 className="tutorial-title">{def.name}</h2>
        <div className="tutorial-tags">
          <span
            className="difficulty-pill"
            style={{ background: DIFFICULTY_COLORS[def.baseDifficulty] }}
          >
            {DIFFICULTY_LABELS[def.baseDifficulty]}
          </span>
          <span className={`tag ${def.tracking === 'camera' ? 'tracked' : 'timed'}`}>
            {trackingLabel}
          </span>
        </div>
        <p className="tutorial-meta">
          <strong>{getMuscleLabel(def.muscleGroup)}</strong>
          {def.secondary.length > 0 && ` · también ${def.secondary.map(getMuscleLabel).join(', ').toLowerCase()}`}
          {' · '}{def.equipment}
        </p>
      </header>

      <ExerciseDemo3D exerciseId={exerciseId} />

      <p className="tutorial-cue">{def.cues}</p>

      <section className="tutorial-section">
        <h3>Cómo hacerlo</h3>
        <ol className="tutorial-steps">
          {tutorial.steps.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
      </section>

      <section className="tutorial-section">
        <h3>Errores comunes</h3>
        <ul className="tutorial-mistakes">
          {tutorial.mistakes.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
      </section>

      <section className="tutorial-section">
        <h3>Respiración</h3>
        <p>{tutorial.breathing}</p>
      </section>

      {tutorial.cameraSetup && (
        <section className="tutorial-section tutorial-camera">
          <h3>Dónde colocar el celular</h3>
          <p>{tutorial.cameraSetup}</p>
        </section>
      )}

      {tutorial.safety && (
        <section className="tutorial-section tutorial-safety" role="note">
          <h3>Seguridad</h3>
          <p>{tutorial.safety}</p>
        </section>
      )}

      <p className="tutorial-disclaimer">{TUTORIAL_DISCLAIMER}</p>
    </article>
  );
}
