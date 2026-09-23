import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  loadRoutines, saveRoutines, loadSessions, saveSession,
  setActiveRoutine as applyActive,
} from './storage';
import type { Routine, WorkoutSession } from './types';
import { RoutinesContext, type RoutinesContextValue } from './context';

/**
 * Proveedor del estado de rutinas y sesiones (ver DEC-032).
 *
 * Se eligió contexto de React en lugar de una librería de estado porque el árbol es
 * chico y el dato cabe entero en memoria. Cada escritura persiste de inmediato en
 * `localStorage`: no hay guardado explícito ni riesgo de perder cambios al cerrar la app.
 *
 * Envuelve a todas las rutas, incluidas las pantallas de entrenamiento. Por eso las
 * sesiones se registran a través de `recordSession`, que actualiza el estado en el
 * mismo instante: la pantalla de inicio refleja lo entrenado sin necesidad de recargar.
 */
export function RoutinesProvider({ children }: { children: ReactNode }) {
  const [routines, setRoutines] = useState<Routine[]>(() => loadRoutines());
  const [sessions, setSessions] = useState<WorkoutSession[]>(() => loadSessions());
  const [storageAvailable, setStorageAvailable] = useState(true);

  const persist = useCallback((next: Routine[]) => {
    setRoutines(next);
    setStorageAvailable(saveRoutines(next));
  }, []);

  const upsertRoutine = useCallback((routine: Routine) => {
    const exists = routines.some(r => r.id === routine.id);
    const stamped = { ...routine, updatedAt: Date.now() };
    persist(exists
      ? routines.map(r => (r.id === routine.id ? stamped : r))
      : [...routines, stamped]);
  }, [routines, persist]);

  const deleteRoutine = useCallback((routineId: string) => {
    persist(routines.filter(r => r.id !== routineId));
  }, [routines, persist]);

  const setActive = useCallback((routineId: string) => {
    persist(applyActive(routines, routineId));
  }, [routines, persist]);

  const recordSession = useCallback((session: WorkoutSession) => {
    setSessions(saveSession(session));
  }, []);

  const activeRoutine = useMemo(
    () => routines.find(r => r.isActive) ?? null,
    [routines]
  );

  const value = useMemo<RoutinesContextValue>(() => ({
    routines, sessions, activeRoutine, storageAvailable,
    upsertRoutine, deleteRoutine, setActive, recordSession,
  }), [
    routines, sessions, activeRoutine, storageAvailable,
    upsertRoutine, deleteRoutine, setActive, recordSession,
  ]);

  return <RoutinesContext.Provider value={value}>{children}</RoutinesContext.Provider>;
}
