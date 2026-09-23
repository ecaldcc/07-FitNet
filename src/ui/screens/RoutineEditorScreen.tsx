import { useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { useRoutines } from '../../routines/context';
import {
  createDay, createEmptyRoutine, createRoutineExercise, recomputeFocus,
} from '../../routines/storage';
import {
  METHOD_DESCRIPTIONS, METHOD_LABELS, WEEKDAY_LABELS, WEEKDAY_SHORT,
  type Routine, type RoutineDay, type RoutineExercise, type TrainingMethod, type WeekDay,
} from '../../routines/types';
import {
  DIFFICULTY_COLORS, DIFFICULTY_LABELS, DIFFICULTY_PRESETS,
  getExercise, getMuscleLabel, type Difficulty, type ExerciseDefinition,
} from '../../exercises/catalog';
import { ExercisePicker } from './ExercisePicker';
import { TutorialSheet } from '../tutorial/TutorialSheet';

const ALL_WEEKDAYS: WeekDay[] = [1, 2, 3, 4, 5, 6, 0];

/**
 * Editor de rutinas con guardado explícito (ver DEC-042).
 *
 * La versión anterior guardaba cada cambio al instante y no tenía botón de guardar:
 * el usuario no sabía si lo que armó había quedado registrado, ni tenía forma de
 * arrepentirse. Ahora se edita un borrador, y solo "Crear rutina" o "Guardar cambios"
 * lo persisten. Salir con cambios pendientes pide confirmación.
 */
export function RoutineEditorScreen({ isNew = false }: { isNew?: boolean }) {
  const { routineId } = useParams<{ routineId: string }>();
  const navigate = useNavigate();
  const { routines } = useRoutines();

  // La rutina nueva se crea una sola vez al montar: su id no debe cambiar entre renders.
  const [blank] = useState(() => createEmptyRoutine('', 'medio'));
  const source = isNew ? blank : routines.find(r => r.id === routineId);

  if (!source) {
    return (
      <div className="editor-shell">
        <div className="screen">
          <section className="empty-card">
            <h2>Rutina no encontrada</h2>
            <button className="primary-btn" onClick={() => navigate('/rutinas')}>
              Volver a rutinas
            </button>
          </section>
        </div>
      </div>
    );
  }

  // La clave reinicia el borrador si se navega de una rutina a otra sin desmontar.
  return <RoutineEditor key={source.id} initial={source} isNew={isNew} />;
}

function RoutineEditor({ initial, isNew }: { initial: Routine; isNew: boolean }) {
  const navigate = useNavigate();
  const { upsertRoutine } = useRoutines();

  const [draft, setDraft] = useState<Routine>(initial);
  const [baseline] = useState(() => JSON.stringify(initial));
  const isDirty = useMemo(() => JSON.stringify(draft) !== baseline, [draft, baseline]);

  const [pickerForDay, setPickerForDay] = useState<string | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [tutorialFor, setTutorialFor] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Tras guardar se navega fuera: esa salida no debe pedir confirmación.
  const leavingRef = useRef(false);

  // Cubre todas las salidas: botones de la pantalla, pestañas y el gesto de volver.
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    !leavingRef.current && isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  // Cerrar la pestaña o recargar con cambios pendientes también avisa.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  function goBack() {
    // Si se llegó desde otra pantalla de la app se vuelve a ella; si se abrió el editor
    // directo, retroceder sacaría al usuario de la app, así que se va a la lista.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/rutinas', { replace: true });
  }

  function save(): boolean {
    const name = draft.name.trim();
    if (!name) {
      setNameError(true);
      nameInputRef.current?.focus();
      nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    upsertRoutine({ ...draft, name });
    leavingRef.current = true;
    return true;
  }

  function handleSave() {
    if (save()) goBack();
  }

  // ── Edición del borrador ──

  function update(patch: Partial<Routine>) {
    setDraft(d => ({ ...d, ...patch }));
  }

  function updateDays(fn: (days: RoutineDay[]) => RoutineDay[]) {
    setDraft(d => ({ ...d, days: fn(d.days) }));
  }

  function toggleDay(weekday: WeekDay) {
    updateDays(days => {
      const existing = days.find(x => x.weekday === weekday);
      if (existing) return days.filter(d => d.dayId !== existing.dayId);
      // Se mantiene el orden de la semana empezando en lunes, como se lee el calendario.
      return [...days, createDay(weekday, WEEKDAY_LABELS[weekday])].sort(
        (a, b) => ALL_WEEKDAYS.indexOf(a.weekday) - ALL_WEEKDAYS.indexOf(b.weekday)
      );
    });
  }

  function renameDay(dayId: string, name: string) {
    updateDays(days => days.map(d => (d.dayId === dayId ? { ...d, name } : d)));
  }

  function addExercise(dayId: string, def: ExerciseDefinition) {
    const entry = createRoutineExercise(def.id, def.baseDifficulty);
    updateDays(days => days.map(d =>
      d.dayId === dayId ? recomputeFocus({ ...d, exercises: [...d.exercises, entry] }) : d
    ));
    setPickerForDay(null);
    setExpandedEntry(entry.entryId);
  }

  function removeExercise(dayId: string, entryId: string) {
    updateDays(days => days.map(d =>
      d.dayId === dayId
        ? recomputeFocus({ ...d, exercises: d.exercises.filter(e => e.entryId !== entryId) })
        : d
    ));
  }

  function updateEntry(dayId: string, entryId: string, patch: Partial<RoutineExercise>) {
    updateDays(days => days.map(d =>
      d.dayId === dayId
        ? { ...d, exercises: d.exercises.map(e => (e.entryId === entryId ? { ...e, ...patch } : e)) }
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

  const usedWeekdays = new Set(draft.days.map(d => d.weekday));
  const exerciseCount = draft.days.reduce((acc, d) => acc + d.exercises.length, 0);
  const primaryLabel = isNew ? 'Crear rutina' : isDirty ? 'Guardar cambios' : 'Listo';

  return (
    <div className="editor-shell">
      <div className="editor-content">
        <div className="screen">
          <header className="screen-header">
            <button className="back-btn" onClick={goBack} aria-label="Volver">‹</button>
            <h1 className="screen-title">{isNew ? 'Nueva rutina' : 'Editar rutina'}</h1>
            {isDirty && !isNew && <span className="unsaved-badge">Sin guardar</span>}
          </header>

          <section className="form-card">
            <label className="field">
              <span>Nombre</span>
              <input
                ref={nameInputRef}
                type="text"
                value={draft.name}
                onChange={e => { update({ name: e.target.value }); if (nameError) setNameError(false); }}
                placeholder="Por ejemplo: Fuerza 4 días"
                aria-invalid={nameError}
                className={nameError ? 'invalid' : undefined}
                autoFocus={isNew}
              />
              {nameError && <p className="field-error">Ponle un nombre a la rutina para guardarla.</p>}
            </label>

            <label className="field">
              <span>Descripción</span>
              <input
                type="text"
                value={draft.description}
                onChange={e => update({ description: e.target.value })}
                placeholder="Opcional"
              />
            </label>

            <div className="field">
              <span>Dificultad general</span>
              <div className="difficulty-picker">
                {(['bajo', 'medio', 'alto'] as Difficulty[]).map(d => (
                  <button
                    key={d}
                    className={`difficulty-option${draft.difficulty === d ? ' selected' : ''}`}
                    style={draft.difficulty === d ? { background: DIFFICULTY_COLORS[d] } : undefined}
                    onClick={() => update({ difficulty: d })}
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
                  onClick={() => toggleDay(d)}
                  aria-pressed={usedWeekdays.has(d)}
                >
                  {WEEKDAY_SHORT[d]}
                </button>
              ))}
            </div>
            <p className="muted">Toca un día para agregarlo o quitarlo de la rutina.</p>
          </section>

          {/* Un bloque por día con sus ejercicios */}
          {draft.days.map(day => (
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
                              ? `${entry.sets} × ${entry.holdSeconds} s`
                              : `${entry.sets} × ${entry.reps}`}
                            {' · '}{entry.restSeconds} s de descanso
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

          {draft.days.length === 0 && (
            <section className="empty-card">
              <h2>Sin días todavía</h2>
              <p>Elige arriba los días de la semana en que vas a entrenar.</p>
            </section>
          )}
        </div>
      </div>

      {/* Barra de acciones fija: siempre a la vista mientras se agregan ejercicios */}
      <div className="editor-actions">
        <p className="editor-summary">
          {draft.days.length} {draft.days.length === 1 ? 'día' : 'días'} · {exerciseCount}{' '}
          {exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
        </p>
        <div className="editor-actions-row">
          <button className="ghost-btn" onClick={goBack}>Cancelar</button>
          <button className="primary-btn" onClick={handleSave}>{primaryLabel}</button>
        </div>
      </div>

      {pickerForDay && (
        <ExercisePicker
          onPick={def => addExercise(pickerForDay, def)}
          onClose={() => setPickerForDay(null)}
        />
      )}

      {tutorialFor && (
        <TutorialSheet exerciseId={tutorialFor} onClose={() => setTutorialFor(null)} />
      )}

      {blocker.state === 'blocked' && (
        <div className="confirm-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="confirm-card">
            <h2 id="confirm-title">¿Salir sin guardar?</h2>
            <p>
              {isNew
                ? 'La rutina todavía no se creó. Si sales ahora, se pierde lo que armaste.'
                : 'Tienes cambios sin guardar en esta rutina.'}
            </p>
            <div className="confirm-actions">
              <button className="primary-btn" onClick={() => { if (save()) blocker.proceed(); else blocker.reset(); }}>
                {isNew ? 'Crear y salir' : 'Guardar y salir'}
              </button>
              <button className="ghost-btn danger" onClick={() => blocker.proceed()}>
                Descartar {isNew ? 'rutina' : 'cambios'}
              </button>
              <button className="ghost-btn" onClick={() => blocker.reset()}>Seguir editando</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
