import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExerciseTutorialContent } from './ExerciseTutorialContent';

interface Action {
  label: string;
  onClick(): void;
}

interface Props {
  exerciseId: string;
  onClose(): void;
  /** Acción principal, por ejemplo "Agregar a la rutina" o "Entendido, empezar". */
  primaryAction?: Action;
  /** Encabezado opcional sobre la ficha, para el aviso de primera vez. */
  intro?: string;
}

/**
 * Hoja deslizable con la ficha de técnica.
 *
 * Se monta en `document.body` con un portal: el selector de ejercicios usa
 * `backdrop-filter`, que convierte a su contenedor en el marco de referencia de los
 * elementos fijos, y la hoja quedaría atrapada dentro de él.
 */
export function TutorialSheet({ exerciseId, onClose, primaryAction, intro }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="tutorial-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Técnica del ejercicio"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="tutorial-sheet">
        <div className="tutorial-sheet-bar">
          <span className="tutorial-sheet-grip" aria-hidden="true" />
          <button className="picker-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="tutorial-sheet-body">
          {intro && <p className="tutorial-intro">{intro}</p>}
          <ExerciseTutorialContent exerciseId={exerciseId} />
        </div>

        <div className="tutorial-sheet-actions">
          {primaryAction ? (
            <>
              <button className="ghost-btn" onClick={onClose}>Cerrar</button>
              <button className="primary-btn" onClick={primaryAction.onClick}>
                {primaryAction.label}
              </button>
            </>
          ) : (
            <button className="primary-btn" onClick={onClose}>Entendido</button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
