import { useMemo, useState } from 'react';
import { useRoutines } from '../../routines/context';
import {
  computeAchievements, computeStats, createGoal, goalProgress,
  loadProfile, saveProfile, GOAL_TYPE_LABELS, GOAL_UNITS,
  type ExperienceLevel, type GoalType, type UserProfile,
} from '../../profile/profile';
import { getExercise } from '../../exercises/catalog';
import { AchievementIcon } from '../icons/AchievementIcon';

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  principiante: 'Principiante',
  intermedio:   'Intermedio',
  avanzado:     'Avanzado',
};

export function ProfileScreen() {
  const { sessions } = useRoutines();
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [addingGoal, setAddingGoal] = useState(false);
  const [goalType, setGoalType] = useState<GoalType>('frecuencia');
  const [goalTarget, setGoalTarget] = useState(3);

  const stats = useMemo(() => computeStats(sessions), [sessions]);
  const achievements = useMemo(() => computeAchievements(stats), [stats]);

  function update(patch: Partial<UserProfile>) {
    const next = { ...profile, ...patch };
    setProfile(next);
    saveProfile(next);
  }

  function handleAddGoal() {
    const goal = createGoal(
      goalType, goalTarget,
      `${GOAL_TYPE_LABELS[goalType]}: ${goalTarget}`
    );
    update({ goals: [...profile.goals, goal] });
    setAddingGoal(false);
  }

  const maxReps = Math.max(1, ...stats.last14Days.map(d => d.reps));

  return (
    <div className="screen">
      <header className="screen-header">
        <h1 className="screen-title">Perfil</h1>
      </header>

      <section className="form-card">
        <label className="field">
          <span>Nombre</span>
          <input
            type="text"
            value={profile.name}
            onChange={e => update({ name: e.target.value })}
            placeholder="¿Cómo te llamas?"
          />
        </label>

        <div className="field">
          <span>Nivel</span>
          <div className="difficulty-picker">
            {(Object.keys(EXPERIENCE_LABELS) as ExperienceLevel[]).map(lvl => (
              <button
                key={lvl}
                className={`difficulty-option${profile.experience === lvl ? ' selected' : ''}`}
                onClick={() => update({ experience: lvl })}
              >
                {EXPERIENCE_LABELS[lvl]}
              </button>
            ))}
          </div>
        </div>

        <div className="number-fields">
          <label className="number-field">
            <span>Peso (kg)</span>
            <input
              type="number" min={0} max={300} value={profile.weightKg || ''}
              onChange={e => update({ weightKg: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="number-field">
            <span>Altura (cm)</span>
            <input
              type="number" min={0} max={250} value={profile.heightCm || ''}
              onChange={e => update({ heightCm: Number(e.target.value) || 0 })}
            />
          </label>
        </div>
      </section>

      {/* Progreso general */}
      <section className="stat-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.totalSessions}</span>
          <span className="stat-label">Sesiones</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.totalReps}</span>
          <span className="stat-label">Repeticiones</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.totalMinutes}</span>
          <span className="stat-label">Minutos</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.longestStreak}</span>
          <span className="stat-label">Mejor racha</span>
        </div>
      </section>

      {/* Actividad de las últimas dos semanas */}
      <section className="chart-card">
        <h2>Últimos 14 días</h2>
        <div className="bar-chart" role="img" aria-label="Repeticiones por día de los últimos 14 días">
          {stats.last14Days.map(d => (
            <div key={d.date} className="bar-col" title={`${d.date}: ${d.reps} reps`}>
              <div
                className="bar"
                style={{ height: `${Math.max(2, (d.reps / maxReps) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        {stats.totalReps === 0 && (
          <p className="muted centered">Todavía no hay entrenamientos registrados.</p>
        )}
      </section>

      {/* Objetivos */}
      <section className="form-card">
        <div className="section-head">
          <span className="field-title">Objetivos</span>
          <button className="ghost-btn" onClick={() => setAddingGoal(v => !v)}>
            {addingGoal ? 'Cancelar' : 'Nuevo'}
          </button>
        </div>

        {addingGoal && (
          <div className="goal-form">
            <div className="field">
              <span>Tipo</span>
              <div className="method-picker">
                {(Object.keys(GOAL_TYPE_LABELS) as GoalType[]).map(t => (
                  <button
                    key={t}
                    className={`method-option${goalType === t ? ' selected' : ''}`}
                    onClick={() => setGoalType(t)}
                  >
                    {GOAL_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <label className="number-field wide">
              <span>Meta ({GOAL_UNITS[goalType]})</span>
              <input
                type="number" min={1} value={goalTarget}
                onChange={e => setGoalTarget(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
            <button className="primary-btn" onClick={handleAddGoal}>Guardar objetivo</button>
          </div>
        )}

        <ul className="goal-list">
          {profile.goals.map(goal => {
            const progress = goalProgress(goal, stats);
            return (
              <li key={goal.id} className="goal-item">
                <div className="goal-head">
                  <span>{GOAL_TYPE_LABELS[goal.type]}</span>
                  <span className="goal-value">{progress}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress}%`, background: progress >= 100 ? '#30D158' : '#4A9EFF' }}
                  />
                </div>
                <div className="goal-foot">
                  <span className="muted small">Meta: {goal.target} {GOAL_UNITS[goal.type]}</span>
                  <button
                    className="ghost-btn danger small"
                    onClick={() => update({ goals: profile.goals.filter(g => g.id !== goal.id) })}
                  >
                    Quitar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {profile.goals.length === 0 && !addingGoal && (
          <p className="muted">Sin objetivos definidos todavía.</p>
        )}
      </section>

      {/* Logros */}
      <section className="form-card">
        <span className="field-title">Logros</span>
        <ul className="achievement-grid">
          {achievements.map(a => (
            <li key={a.id} className={`achievement${a.unlocked ? ' unlocked' : ''}`}>
              <span className="achievement-icon"><AchievementIcon name={a.icon} /></span>
              <span className="achievement-name">{a.name}</span>
              <span className="achievement-desc">{a.description}</span>
              {!a.unlocked && (
                <div className="progress-track slim">
                  <div className="progress-fill" style={{ width: `${a.progress}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Historial */}
      <section className="form-card">
        <span className="field-title">Historial reciente</span>
        <ul className="history-list">
          {sessions.slice(0, 10).map(s => {
            const names = s.entries
              .map(e => getExercise(e.exerciseId)?.name)
              .filter(Boolean)
              .join(', ');
            const minutes = Math.max(1, Math.round((s.endedAt - s.startedAt) / 60000));

            return (
              <li key={s.id} className="history-item">
                <div>
                  <span className="history-date">
                    {new Date(s.startedAt).toLocaleDateString('es', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  <span className="history-detail">{names || 'Entrenamiento'}</span>
                </div>
                <span className="history-reps">{s.totalReps} reps · {minutes} min</span>
              </li>
            );
          })}
        </ul>
        {sessions.length === 0 && <p className="muted">Sin sesiones registradas.</p>}
      </section>
    </div>
  );
}
