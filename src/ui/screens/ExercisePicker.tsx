import { useMemo, useState } from 'react';
import {
  EXERCISE_CATALOG, MUSCLE_GROUPS, DIFFICULTY_COLORS, DIFFICULTY_LABELS,
  getMuscleLabel, type ExerciseDefinition, type MuscleGroup,
} from '../../exercises/catalog';
import { TutorialSheet } from '../tutorial/TutorialSheet';

interface Props {
  onPick(exercise: ExerciseDefinition): void;
  onClose(): void;
}

/**
 * Selector de ejercicios por grupo muscular, con búsqueda.
 * Marca explícitamente cuáles tienen análisis de técnica por cámara y cuáles no,
 * para que el usuario sepa qué esperar antes de agregarlos a la rutina.
 */
export function ExercisePicker({ onPick, onClose }: Props) {
  const [group, setGroup] = useState<MuscleGroup | 'todos'>('todos');
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<ExerciseDefinition | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISE_CATALOG.filter(e => {
      const matchesGroup = group === 'todos' || e.muscleGroup === group;
      const matchesQuery = q === '' || e.name.toLowerCase().includes(q);
      return matchesGroup && matchesQuery;
    });
  }, [group, query]);

  return (
    <div className="picker-backdrop" role="dialog" aria-modal="true" aria-label="Elegir ejercicio">
      <div className="picker-sheet">
        <header className="picker-head">
          <h2>Agregar ejercicio</h2>
          <button className="picker-close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <input
          className="picker-search"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar ejercicio"
        />

        <div className="picker-groups">
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
              {m.emoji} {m.label}
            </button>
          ))}
        </div>

        <ul className="picker-list">
          {results.map(ex => (
            <li key={ex.id} className="picker-row">
              {/* Dos botones hermanos y no anidados: un botón dentro de otro no es HTML válido. */}
              <button className="picker-item" onClick={() => onPick(ex)}>
                <div className="picker-item-main">
                  <span className="picker-item-name">{ex.name}</span>
                  <span className="picker-item-meta">
                    {getMuscleLabel(ex.muscleGroup)} · {ex.equipment}
                  </span>
                </div>
                <div className="picker-item-tags">
                  {ex.tracking === 'camera' && (
                    <span className="tag tracked" title="Análisis de técnica en 3D">3D</span>
                  )}
                  {ex.tracking === 'time' && <span className="tag timed">Tiempo</span>}
                  <span
                    className="tag difficulty"
                    style={{ background: DIFFICULTY_COLORS[ex.baseDifficulty] }}
                  >
                    {DIFFICULTY_LABELS[ex.baseDifficulty]}
                  </span>
                </div>
              </button>
              <button
                className="info-btn"
                onClick={() => setPreview(ex)}
                aria-label={`Ver técnica de ${ex.name}`}
              >
                ?
              </button>
            </li>
          ))}
        </ul>

        {results.length === 0 && (
          <p className="muted centered">Ningún ejercicio coincide con la búsqueda.</p>
        )}
      </div>

      {preview && (
        <TutorialSheet
          exerciseId={preview.id}
          onClose={() => setPreview(null)}
          primaryAction={{
            label: 'Agregar a la rutina',
            onClick: () => { setPreview(null); onPick(preview); },
          }}
        />
      )}
    </div>
  );
}
