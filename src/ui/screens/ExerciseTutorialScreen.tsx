import { useNavigate, useParams } from 'react-router-dom';
import { getExercise } from '../../exercises/catalog';
import { markTutorialSeen } from '../../exercises/tutorialProgress';
import { ExerciseTutorialContent } from '../tutorial/ExerciseTutorialContent';
import { startPath } from '../startExercise';

export function ExerciseTutorialScreen() {
  const { exerciseId = '' } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const def = getExercise(exerciseId);

  if (!def) {
    return (
      <div className="screen">
        <section className="empty-card">
          <h2>Ejercicio no encontrado</h2>
          <button className="primary-btn" onClick={() => navigate('/ejercicios')}>
            Ver todos los ejercicios
          </button>
        </section>
      </div>
    );
  }

  function handleStart() {
    // Ver la ficha completa cuenta como haberla visto: no se vuelve a abrir sola
    // al entrar a la cámara.
    markTutorialSeen(exerciseId);
    navigate(startPath(exerciseId));
  }

  return (
    <div className="screen tutorial-screen">
      <header className="screen-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Volver">‹</button>
        <h1 className="screen-title">Técnica</h1>
      </header>

      <ExerciseTutorialContent exerciseId={exerciseId} />

      <div className="sticky-action">
        <button className="primary-btn wide" onClick={handleStart}>
          {def.tracking === 'camera' ? 'Empezar con análisis 3D' : 'Empezar entrenamiento'}
        </button>
      </div>
    </div>
  );
}
