import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EXERCISE_CATALOG, MUSCLE_GROUPS, DIFFICULTY_COLORS, DIFFICULTY_LABELS,
  getMuscleLabel, type MuscleGroup,
} from '../../exercises/catalog';
import { tutorialPath } from '../startExercise';

/** Biblioteca de los 60 ejercicios, navegable por grupo muscular y con búsqueda. */
export function ExerciseLibraryScreen() {
  const navigate = useNavigate();
  const [group, setGroup] = useState<MuscleGroup | 'todos'>('todos');
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISE_CATALOG.filter(e =>
      (group === 'todos' || e.muscleGroup === group) &&
      (q === '' || e.name.toLowerCase().includes(q))
    );
  }, [group, query]);

  return (
    <div className="screen">
      <header className="screen-header">
        <h1 className="screen-title">Ejercicios</h1>
      </header>

      <input
        className="library-search"
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Buscar ejercicio"
        aria-label="Buscar ejercicio"
      />

      <div className="picker-groups" role="group" aria-label="Filtrar por grupo muscular">
        <button
          className={`group-chip${group === 'todos' ? ' active' : ''}`}
          onClick={() => setGroup('todos')}
        >
          Todos
        </button>
        {MUSCLE_GROUPS.map(m => (
          <button
            key={m.id}
            className={`group-chip${group === m.id ? ' active' : ''}`}
            onClick={() => setGroup(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="muted">
        {results.length} ejercicios. Los marcados con 3D tienen análisis de técnica por cámara.
      </p>

      <ul className="picker-list library-list">
        {results.map(ex => (
          <li key={ex.id}>
            <button className="picker-item" onClick={() => navigate(tutorialPath(ex.id))}>
              <div className="picker-item-main">
                <span className="picker-item-name">{ex.name}</span>
                <span className="picker-item-meta">
                  {getMuscleLabel(ex.muscleGroup)} · {ex.equipment}
                </span>
              </div>
              <div className="picker-item-tags">
                {ex.tracking === 'camera' && <span className="tag tracked">3D</span>}
                {ex.tracking === 'time' && <span className="tag timed">Tiempo</span>}
                <span
                  className="tag difficulty"
                  style={{ background: DIFFICULTY_COLORS[ex.baseDifficulty] }}
                >
                  {DIFFICULTY_LABELS[ex.baseDifficulty]}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {results.length === 0 && (
        <p className="muted centered">Ningún ejercicio coincide con la búsqueda.</p>
      )}
    </div>
  );
}
