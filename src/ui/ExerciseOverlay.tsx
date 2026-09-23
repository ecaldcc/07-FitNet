import { FATIGUE_COLOR } from '../analysis/fatigue';
import type { BaseExerciseResult } from '../exercises/types';
import type { BodyOrientation } from '../geometry/vectors3d';

type FeedbackLevel = 'idle' | 'good' | 'warning' | 'bad';

interface Props {
  result: BaseExerciseResult;
  exerciseName: string;
  /** Serie en curso, empezando en 1. */
  currentSet: number;
  totalSets: number;
  /** Orientación que el ejercicio pide; si no coincide, se avisa al usuario. */
  preferredOrientation?: BodyOrientation;
}

const FEEDBACK_COLOR: Record<FeedbackLevel, string> = {
  good:    '#30D158',
  warning: '#FF9F0A',
  bad:     '#FF375F',
  idle:    'rgba(255,255,255,0.5)',
};

const ORIENTATION_LABEL: Record<BodyOrientation, string> = {
  frontal:  'De frente',
  diagonal: 'En diagonal',
  lateral:  'De perfil',
};

export function ExerciseOverlay({
  result, exerciseName, currentSet, totalSets, preferredOrientation,
}: Props) {
  const color = FEEDBACK_COLOR[result.feedbackLevel];
  const fatigueColor = FATIGUE_COLOR[result.fatigue.level];

  // El mensaje de rechazo dura un solo cuadro, así que tiene prioridad visual:
  // si no se muestra de inmediato, el usuario nunca se entera de por qué no contó.
  const message = result.rejectionMessage ?? result.feedbackMessage;
  const messageColor = result.rejectionMessage ? '#FF375F' : color;

  const orientationMismatch =
    preferredOrientation !== undefined &&
    preferredOrientation !== result.orientation;

  return (
    <div className="exercise-overlay">
      <div className="ex-top-row">
        <div className="ex-label">{exerciseName}</div>
        <div className="ex-set-badge">
          Serie {currentSet}<span className="ex-set-total">/{totalSets}</span>
        </div>
      </div>

      {/* Panel de métricas del análisis 3D */}
      <div className="ex-metrics">
        <div className="ex-metric">
          <span className="ex-metric-label">Ángulo</span>
          <span className="ex-metric-value">{Math.round(result.primaryAngle)}°</span>
        </div>
        <div className="ex-metric">
          <span className="ex-metric-label">Velocidad</span>
          <span className="ex-metric-value">{Math.abs(Math.round(result.velocity))}°/s</span>
        </div>
        <div className="ex-metric">
          <span className="ex-metric-label">Vista</span>
          <span className={`ex-metric-value${orientationMismatch ? ' warn' : ''}`}>
            {ORIENTATION_LABEL[result.orientation]}
          </span>
        </div>
        {result.asymmetry > 0 && (
          <div className="ex-metric">
            <span className="ex-metric-label">Simetría</span>
            <span className={`ex-metric-value${result.asymmetry > 0.18 ? ' warn' : ''}`}>
              {Math.round((1 - Math.min(1, result.asymmetry)) * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Barra de fatiga: aparece recién cuando hay línea base contra la cual comparar */}
      {result.fatigue.score > 0 && (
        <div className="ex-fatigue">
          <div className="ex-fatigue-head">
            <span>Fatiga</span>
            <span style={{ color: fatigueColor }}>{result.fatigue.message}</span>
          </div>
          <div className="ex-fatigue-track">
            <div
              className="ex-fatigue-fill"
              style={{ width: `${result.fatigue.score}%`, background: fatigueColor }}
            />
          </div>
          {result.fatigue.velocityDropPercent > 0 && (
            <div className="ex-fatigue-detail">
              Velocidad −{result.fatigue.velocityDropPercent}% respecto al inicio
            </div>
          )}
        </div>
      )}

      <div
        className="ex-bottom-bar"
        style={{ '--feedback-color': messageColor } as React.CSSProperties}
      >
        <p className="ex-feedback-text">{message}</p>

        <div className="ex-rep-section">
          {/* key={reps} → React remonta el span → reinicia @keyframes ex-rep-pop */}
          <span className="ex-reps" key={result.reps}>{result.reps}</span>
          <span className="ex-reps-label">REPS</span>
        </div>
      </div>
    </div>
  );
}
