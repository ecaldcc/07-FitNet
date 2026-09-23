import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRoutines } from '../../routines/context';
import { computeStats } from '../../profile/profile';
import {
  getExercise, getMuscleLabel, DIFFICULTY_COLORS, DIFFICULTY_LABELS,
} from '../../exercises/catalog';
import {
  METHOD_LABELS, WEEKDAY_LABELS, WEEKDAY_SHORT, type WeekDay, type RoutineDay,
} from '../../routines/types';
import { startPath, tutorialPath } from '../startExercise';

export function HomeScreen() {
  const navigate = useNavigate();
  const { activeRoutine, routines, sessions } = useRoutines();

  const today = new Date().getDay() as WeekDay;
  const stats = useMemo(() => computeStats(sessions), [sessions]);

  const todayDay: RoutineDay | null = useMemo(
    () => activeRoutine?.days.find(d => d.weekday === today) ?? null,
    [activeRoutine, today]
  );

  return (
    <div className="screen">
      <header className="screen-header">
        <p className="screen-eyebrow">{WEEKDAY_LABELS[today]}</p>
        <h1 className="screen-title">Hoy</h1>
      </header>

      {/* Tarjetas de resumen del progreso */}
      <section className="stat-row">
        <div className="stat-card">
          <span className="stat-value">{stats.currentStreak}</span>
          <span className="stat-label">Racha</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.sessionsThisWeek}</span>
          <span className="stat-label">Esta semana</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.totalReps}</span>
          <span className="stat-label">Reps totales</span>
        </div>
      </section>

      {/* Entrenamiento del día según la rutina activa */}
      {!activeRoutine && (
        <section className="empty-card">
          <h2>Sin rutina activa</h2>
          <p>Elige una rutina para que la app te arme el calendario de la semana.</p>
          <Link className="primary-btn" to="/rutinas">Ver rutinas</Link>
        </section>
      )}

      {activeRoutine && !todayDay && (
        <section className="empty-card">
          <h2>Día de descanso</h2>
          <p>
            Tu rutina <strong>{activeRoutine.name}</strong> no tiene sesión para hoy.
            El descanso también entrena.
          </p>
          <button className="ghost-btn" onClick={() => navigate('/entrenar')}>
            Entrenar igual
          </button>
        </section>
      )}

      {activeRoutine && todayDay && (
        <section className="day-card">
          <div className="day-card-head">
            <div>
              <h2>{todayDay.name}</h2>
              <p className="day-card-sub">{activeRoutine.name}</p>
            </div>
            <span
              className="difficulty-pill"
              style={{ background: DIFFICULTY_COLORS[activeRoutine.difficulty] }}
            >
              {DIFFICULTY_LABELS[activeRoutine.difficulty]}
            </span>
          </div>

          <div className="focus-tags">
            {todayDay.focus.map(m => (
              <span key={m} className="focus-tag">{getMuscleLabel(m)}</span>
            ))}
          </div>

          <ul className="exercise-list">
            {todayDay.exercises.map(entry => {
              const def = getExercise(entry.exerciseId);
              if (!def) return null;
              const isTracked = def.tracking === 'camera';
              const start = startPath(def.id, {
                routineId: activeRoutine.id,
                dayId: todayDay.dayId,
                entryId: entry.entryId,
                sets: entry.sets,
              });

              return (
                <li key={entry.entryId} className="exercise-row">
                  <button
                    className="exercise-row-main link-like"
                    onClick={() => navigate(tutorialPath(def.id))}
                    aria-label={`Ver técnica de ${def.name}`}
                  >
                    <span className="exercise-row-name">
                      {def.name}
                      {isTracked && <span className="tag tracked inline">3D</span>}
                    </span>
                    <span className="exercise-row-meta">
                      {def.tracking === 'time'
                        ? `${entry.sets} × ${entry.holdSeconds} s`
                        : `${entry.sets} × ${entry.reps}`}
                      {entry.method !== 'normal' && ` · ${METHOD_LABELS[entry.method]}`}
                      {' · ver técnica'}
                    </span>
                  </button>

                  <button
                    className={`row-action ${isTracked ? 'tracked' : 'start'}`}
                    onClick={() => navigate(start)}
                  >
                    {isTracked ? 'Analizar' : 'Empezar'}
                  </button>
                </li>
              );
            })}
          </ul>

          {todayDay.exercises.length === 0 && (
            <p className="muted">Este día todavía no tiene ejercicios.</p>
          )}

          <Link className="primary-btn" to={`/rutinas/${activeRoutine.id}`}>
            Editar rutina
          </Link>
        </section>
      )}

      {/* Vista rápida de la semana */}
      {activeRoutine && (
        <section className="week-strip" aria-label="Semana">
          {([0, 1, 2, 3, 4, 5, 6] as WeekDay[]).map(d => {
            const day = activeRoutine.days.find(x => x.weekday === d);
            return (
              <div key={d} className={`week-cell${d === today ? ' today' : ''}${day ? ' has-work' : ''}`}>
                <span className="week-cell-day">{WEEKDAY_SHORT[d]}</span>
                <span className="week-cell-name">{day ? day.name : '—'}</span>
              </div>
            );
          })}
        </section>
      )}

      {routines.length > 0 && !activeRoutine && (
        <p className="muted centered">
          Tienes {routines.length} rutinas guardadas. Activa una para verla aquí.
        </p>
      )}
    </div>
  );
}
