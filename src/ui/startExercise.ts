import { getExercise } from '../exercises/catalog';

/**
 * Ruta para empezar un ejercicio.
 *
 * Es la única función que decide entre la pantalla de cámara y el modo manual, para que
 * ningún botón de la app pueda mandar un ejercicio sin tracker a la cámara, ni uno con
 * análisis 3D al modo manual.
 */
export function startPath(
  exerciseId: string,
  context: { routineId?: string; dayId?: string; entryId?: string; sets?: number } = {}
): string {
  const def = getExercise(exerciseId);
  const params = new URLSearchParams({ ejercicio: exerciseId });
  if (context.routineId) params.set('rutina', context.routineId);
  if (context.dayId) params.set('dia', context.dayId);
  if (context.entryId) params.set('entrada', context.entryId);
  if (context.sets) params.set('series', String(context.sets));

  const base = def?.tracking === 'camera' ? '/entrenar' : '/manual';
  return `${base}?${params.toString()}`;
}

export function tutorialPath(exerciseId: string): string {
  return `/ejercicio/${encodeURIComponent(exerciseId)}`;
}
