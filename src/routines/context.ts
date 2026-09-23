import { createContext, useContext } from 'react';
import type { Routine, WorkoutSession } from './types';

/**
 * Contrato del estado compartido de rutinas y sesiones (ver DEC-032).
 *
 * El objeto de contexto y el hook viven separados del componente proveedor porque la
 * recarga en caliente de Vite solo preserva el estado de un archivo si ese archivo
 * exporta únicamente componentes.
 */
export interface RoutinesContextValue {
  routines: Routine[];
  sessions: WorkoutSession[];
  activeRoutine: Routine | null;
  /** `false` cuando el navegador rechazó la escritura, para poder avisar al usuario. */
  storageAvailable: boolean;
  upsertRoutine(routine: Routine): void;
  deleteRoutine(routineId: string): void;
  setActive(routineId: string): void;
  /** Guarda una sesión terminada y la refleja de inmediato en el historial. */
  recordSession(session: WorkoutSession): void;
}

export const RoutinesContext = createContext<RoutinesContextValue | null>(null);

export function useRoutines(): RoutinesContextValue {
  const ctx = useContext(RoutinesContext);
  if (!ctx) throw new Error('useRoutines debe usarse dentro de RoutinesProvider');
  return ctx;
}
