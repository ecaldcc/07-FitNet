import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoutines } from '../../routines/context';
import { createEmptyRoutine } from '../../routines/storage';
import { WEEKDAY_SHORT, type WeekDay } from '../../routines/types';
import {
  DIFFICULTY_COLORS, DIFFICULTY_LABELS, getMuscleLabel, type Difficulty,
} from '../../exercises/catalog';

export function RoutinesScreen() {
  const navigate = useNavigate();
  const { routines, activeRoutine, setActive, deleteRoutine, upsertRoutine, storageAvailable } = useRoutines();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<Difficulty>('medio');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;

    const routine = createEmptyRoutine(name, newDifficulty);
    upsertRoutine(routine);
    setCreating(false);
    setNewName('');
    navigate(`/rutinas/${routine.id}`);
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h1 className="screen-title">Rutinas</h1>
        <button className="primary-btn compact" onClick={() => setCreating(v => !v)}>
          {creating ? 'Cancelar' : 'Nueva'}
        </button>
      </header>

      {!storageAvailable && (
        <p className="warning-banner">
          El navegador está bloqueando el almacenamiento. Los cambios no se van a guardar.
        </p>
      )}

      {creating && (
        <section className="form-card">
          <label className="field">
            <span>Nombre de la rutina</span>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Por ejemplo: Fuerza 4 días"
              autoFocus
            />
          </label>

          <div className="field">
            <span>Dificultad</span>
            <div className="difficulty-picker">
              {(['bajo', 'medio', 'alto'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  className={`difficulty-option${newDifficulty === d ? ' selected' : ''}`}
                  style={newDifficulty === d ? { background: DIFFICULTY_COLORS[d] } : undefined}
                  onClick={() => setNewDifficulty(d)}
                >
                  {DIFFICULTY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>

          <button className="primary-btn" onClick={handleCreate} disabled={!newName.trim()}>
            Crear y agregar días
          </button>
        </section>
      )}

      <ul className="routine-list">
        {routines.map(routine => {
          const isActive = activeRoutine?.id === routine.id;
          const totalExercises = routine.days.reduce((acc, d) => acc + d.exercises.length, 0);
          const focus = [...new Set(routine.days.flatMap(d => d.focus))];

          return (
            <li key={routine.id} className={`routine-card${isActive ? ' active' : ''}`}>
              <div className="routine-card-head">
                <div>
                  <h2>{routine.name}</h2>
                  {routine.description && <p className="routine-desc">{routine.description}</p>}
                </div>
                <span
                  className="difficulty-pill"
                  style={{ background: DIFFICULTY_COLORS[routine.difficulty] }}
                >
                  {DIFFICULTY_LABELS[routine.difficulty]}
                </span>
              </div>

              <div className="routine-days">
                {([0, 1, 2, 3, 4, 5, 6] as WeekDay[]).map(d => {
                  const day = routine.days.find(x => x.weekday === d);
                  return (
                    <span key={d} className={`routine-day-dot${day ? ' filled' : ''}`}>
                      {WEEKDAY_SHORT[d].charAt(0)}
                    </span>
                  );
                })}
              </div>

              <p className="routine-meta">
                {routine.days.length} días · {totalExercises} ejercicios
                {routine.isTemplate && ' · plantilla'}
              </p>

              {focus.length > 0 && (
                <div className="focus-tags">
                  {focus.slice(0, 5).map(m => (
                    <span key={m} className="focus-tag">{getMuscleLabel(m)}</span>
                  ))}
                  {focus.length > 5 && <span className="focus-tag">+{focus.length - 5}</span>}
                </div>
              )}

              <div className="routine-actions">
                {isActive ? (
                  <span className="active-badge">Activa</span>
                ) : (
                  <button className="ghost-btn" onClick={() => setActive(routine.id)}>
                    Activar
                  </button>
                )}
                <button className="ghost-btn" onClick={() => navigate(`/rutinas/${routine.id}`)}>
                  Editar
                </button>
                {confirmDelete === routine.id ? (
                  <>
                    <button
                      className="ghost-btn danger"
                      onClick={() => { deleteRoutine(routine.id); setConfirmDelete(null); }}
                    >
                      Confirmar
                    </button>
                    <button className="ghost-btn" onClick={() => setConfirmDelete(null)}>
                      No
                    </button>
                  </>
                ) : (
                  <button className="ghost-btn danger" onClick={() => setConfirmDelete(routine.id)}>
                    Borrar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {routines.length === 0 && (
        <section className="empty-card">
          <h2>Todavía no hay rutinas</h2>
          <p>Crea la primera y empieza a armar tu semana.</p>
        </section>
      )}
    </div>
  );
}
