import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoutines } from '../../routines/context';
import { createDay, createRoutineExercise, recomputeFocus } from '../../routines/storage';
import {
  METHOD_DESCRIPTIONS, METHOD_LABELS, WEEKDAY_LABELS, WEEKDAY_SHORT,
  type RoutineDay, type RoutineExercise, type TrainingMethod, type WeekDay,
} from '../../routines/types';
import {
  DIFFICULTY_COLORS, DIFFICULTY_LABELS, DIFFICULTY_PRESETS,
  getExercise, getMuscleLabel, type Difficulty, type ExerciseDefinition,
} from '../../exercises/catalog';
import { ExercisePicker } from './ExercisePicker';
import { TutorialSheet } from '../tutorial/TutorialSheet';

const ALL_WEEKDAYS: WeekDay[] = [1, 2, 3, 4, 5, 6, 0];

export function RoutineEditorScreen() {
  const { routineId } = useParams<{ routineId: string }>();
  const navigate = useNavigate();
  const { routines, upsertRoutine } = useRoutines();

  const routine = routines.find(r => r.id === routineId);

  const [pickerForDay, setPickerForDay] = useState<string | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [tutorialFor, setTutorialFor] = useState<string | null>(null);

  if (!routine) {
    return (
      <div className="screen">
        <section className="empty-card">
          <h2>Rutina no encontrada</h2>
          <button className="primary-btn" onClick={() => navigate('/rutinas')}>
            Volver a rutinas
          </button>
        </section>
      </div>
    );
  }

  function updateDays(days: RoutineDay[]) {
    if (!routine) return;
    upsertRoutine({ ...routine, days });
  }

  function addDay(weekday: WeekDay) {
    if (!routine) return;
    if (routine.days.some(d => d.weekday === weekday)) return;

    const day = createDay(weekday, WEEKDAY_LABELS[weekday]);
    // Se mantiene el orden de la semana empezando en lunes, como se lee el calendario.
    const days = [...routine.days, day].sort(
      (a, b) => ALL_WEEKDAYS.indexOf(a.weekday) - ALL_WEEKDAYS.indexOf(b.weekday)
    );
    updateDays(days);
  }

  function removeDay(dayId: string) {
    if (!routine) return;
    updateDays(routine.days.filter(d => d.dayId !== dayId));
  }

  function renameDay(dayId: string, name: string) {
    if (!routine) return;
    updateDays(routine.days.map(d => (d.dayId === dayId ? { ...d, name } : d)));
  }

  function addExercise(dayId: string, def: ExerciseDefinition) {
    if (!routine) return;
    const entry = createRoutineExercise(def.id, def.baseDifficulty);
    updateDays(routine.days.map(d =>
      d.dayId === dayId
        ? recomputeFocus({ ...d, exercises: [...d.exercises, entry] })
        : d
    ));
    setPickerForDay(null);
    setExpandedEntry(entry.entryId);
  }

  function removeExercise(dayId: string, entryId: string) {
    if (!routine) return;
    updateDays(routine.days.map(d =>
      d.dayId === dayId
        ? recomputeFocus({ ...d, exercises: d.exercises.filter(e => e.entryId !== entryId) })
        : d
    ));
  }

  function updateEntry(dayId: string, entryId: string, patch: Partial<RoutineExercise>) {
    if (!routine) return;
    updateDays(routine.days.map(d =>
      d.dayId === dayId
        ? {
            ...d,
            exercises: d.exercises.map(e => (e.entryId === entryId ? { ...e, ...patch } : e)),
          }
        : d
    ));
  }

  /** Cambiar el nivel reajusta series, repeticiones y descanso al preajuste de ese nivel. */
  function changeEntryDifficulty(dayId: string, entryId: string, difficulty: Difficulty) {
    const preset = DIFFICULTY_PRESETS[difficulty];
    updateEntry(dayId, entryId, {
      difficulty,
      sets: preset.sets,
      reps: preset.reps,
      holdSeconds: preset.holdSeconds,
      restSeconds: preset.restSeconds,
    });
  }

  const usedWeekdays = new Set(routine.days.map(d => d.weekday));

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="back-btn" onClick={() => navigate('/rutinas')} aria-label="Volver">
          ‹
        </button>
        <h1 className="screen-title">Editar rutina</h1>
      </header>

      <section className="form-card">
        <label className="field">
          <span>Nombre</span>
          <input
            type="text"
            value={routine.name}
            onChange={e => upsertRoutine({ ...routine, name: e.target.value })}
          />
        </label>

        <label className="field">
          <span>Descripción</span>
          <input
            type="text"
            value={routine.description}
            onChange={e => upsertRoutine({ ...routine, description: e.target.value })}
            placeholder="Opcional"
          />
        </label>

        <div className="field">
          <span>Dificultad general</span>
          <div className="difficulty-picker">
            {(['bajo', 'medio', 'alto'] as Difficulty[]).map(d => (
              <button
                key={d}
                className={`difficulty-option${routine.difficulty === d ? ' selected' : ''}`}
                style={routine.difficulty === d ? { background: DIFFICULTY_COLORS[d] } : undefined}
                onClick={() => upsertRoutine({ ...routine, difficulty: d })}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Selector de días de la semana */}
      <section className="form-card">
        <span className="field-title">Días de entrenamiento</span>
        <div className="weekday-picker">
          {ALL_WEEKDAYS.map(d => (
            <button
              key={d}
              className={`weekday-btn${usedWeekdays.has(d) ? ' selected' : ''}`}
              onClick={() => {
                const existing = routine.days.find(x => x.weekday === d);
                if (existing) removeDay(existing.dayId);
                else addDay(d);
              }}
              aria-pressed={usedWeekdays.has(d)}
            >
              {WEEKDAY_SHORT[d]}
            </button>
          ))}
        </div>
        <p className="muted">Toca un día para agregarlo o quitarlo de la rutina.</p>
      </section>

      {/* Un bloque por día con sus ejercicios */}
      {routine.days.map(day => (
        <section key={day.dayId} className="day-editor">
          <div className="day-editor-head">
            <input
              className="day-name-input"
              type="text"
              value={day.name}
              onChange={e => renameDay(day.dayId, e.target.value)}
              aria-label={`Nombre del ${WEEKDAY_LABELS[day.weekday]}`}
            />
            <span className="day-weekday">{WEEKDAY_SHORT[day.weekday]}</span>
          </div>

          {day.focus.length > 0 && (
            <div className="focus-tags">
              {day.focus.map(m => (
                <span key={m} className="focus-tag">{getMuscleLabel(m)}</span>
              ))}
            </div>
          )}

          <ul className="editor-exercise-list">
            {day.exercises.map(entry => {
              const def = getExercise(entry.exerciseId);
              if (!def) return null;
              const isExpanded = expandedEntry === entry.entryId;
              const isTimed = def.tracking === 'time';

              return (
                <li key={entry.entryId} className="editor-exercise">
                  <button
                    className="editor-exercise-head"
                    onClick={() => setExpandedEntry(isExpanded ? null : entry.entryId)}
                    aria-expanded={isExpanded}
                  >
                    <div className="editor-exercise-main">
                      <span className="editor-exercise-name">
                        {def.name}
                        {def.tracking === 'camera' && <span className="tag tracked inline">3D</span>}
                      </span>
                      <span className="editor-exercise-meta">
                        {isTimed
                          ? `${entry.sets} × ${entry.holdSeconds}s`
                          : `${entry.sets} × ${entry.reps}`}
                        {' · '}{entry.restSeconds}s descanso
                        {entry.method !== 'normal' && ` · ${METHOD_LABELS[entry.method]}`}
                      </span>
                    </div>
                    <span
                      className="difficulty-dot"
                      style={{ background: DIFFICULTY_COLORS[entry.difficulty] }}
                      aria-label={DIFFICULTY_LABELS[entry.difficulty]}
                    />
                  </button>

                  {isExpanded && (
                    <div className="editor-exercise-body">
                      <div className="field">
                        <span>Dificultad</span>
                        <div className="difficulty-picker">
                          {(['bajo', 'medio', 'alto'] as Difficulty[]).map(d => (
                            <button
                              key={d}
                              className={`difficulty-option${entry.difficulty === d ? ' selected' : ''}`}
                              style={entry.difficulty === d ? { background: DIFFICULTY_COLORS[d] } : undefined}
                              onClick={() => changeEntryDifficulty(day.dayId, entry.entryId, d)}
                            >
                              {DIFFICULTY_LABELS[d]}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="number-fields">
                        <label className="number-field">
                          <span>Series</span>
                          <input
                            type="number" min={1} max={10} value={entry.sets}
                            onChange={e => updateEntry(day.dayId, entry.entryId, {
                              sets: clamp(Number(e.target.value), 1, 10),
                            })}
                          />
                        </label>

                        {isTimed ? (
                          <label className="number-field">
                            <span>Segundos</span>
                            <input
                              type="number" min={5} max={600} step={5} value={entry.holdSeconds}
                              onChange={e => updateEntry(day.dayId, entry.entryId, {
                                holdSeconds: clamp(Number(e.target.value), 5, 600),
                              })}
                            />
                          </label>
                        ) : (
                          <label className="number-field">
                            <span>Reps</span>
                            <input
                              type="number" min={1} max={100} value={entry.reps}
                              onChange={e => updateEntry(day.dayId, entry.entryId, {
                                reps: clamp(Number(e.target.value), 1, 100),
                              })}
                            />
                          </label>
                        )}

                        <label className="number-field">
                          <span>Descanso</span>
                          <input
                            type="number" min={0} max={600} step={15} value={entry.restSeconds}
                            onChange={e => updateEntry(day.dayId, entry.entryId, {
                              restSeconds: clamp(Number(e.target.value), 0, 600),
                            })}
                          />
                        </label>
                      </div>

                      <div className="field">
                        <span>Método</span>
                        <div className="method-picker">
                          {(Object.keys(METHOD_LABELS) as TrainingMethod[]).map(m => (
                            <button
                              key={m}
                              className={`method-option${entry.method === m ? ' selected' : ''}`}
                              onClick={() => updateEntry(day.dayId, entry.entryId, { method: m })}
                            >
                              {METHOD_LABELS[m]}
                            </button>
                          ))}
                        </div>
                        <p className="muted small">{METHOD_DESCRIPTIONS[entry.method]}</p>
                      </div>

                      {(entry.method === 'rest_pause' || entry.method === 'dropset') && (
                        <label className="number-field wide">
                          <span>{entry.method === 'rest_pause' ? 'Mini-series' : 'Descensos de carga'}</span>
                          <input
                            type="number" min={1} max={5} value={entry.methodRounds}
                            onChange={e => updateEntry(day.dayId, entry.entryId, {
                              methodRounds: clamp(Number(e.target.value), 1, 5),
                            })}
                          />
                        </label>
                      )}

                      <p className="muted small">{def.cues}</p>

                      <div className="editor-entry-actions">
                        <button className="ghost-btn" onClick={() => setTutorialFor(def.id)}>
                          Ver técnica
                        </button>
                        <button
                          className="ghost-btn danger"
                          onClick={() => removeExercise(day.dayId, entry.entryId)}
                        >
                          Quitar ejercicio
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <button className="add-exercise-btn" onClick={() => setPickerForDay(day.dayId)}>
            + Agregar ejercicio
          </button>
        </section>
      ))}

      {routine.days.length === 0 && (
        <section className="empty-card">
          <h2>Sin días todavía</h2>
          <p>Elige arriba los días de la semana en que vas a entrenar.</p>
        </section>
      )}

      {pickerForDay && (
        <ExercisePicker
          onPick={def => addExercise(pickerForDay, def)}
          onClose={() => setPickerForDay(null)}
        />
      )}

      {tutorialFor && (
        <TutorialSheet exerciseId={tutorialFor} onClose={() => setTutorialFor(null)} />
      )}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
