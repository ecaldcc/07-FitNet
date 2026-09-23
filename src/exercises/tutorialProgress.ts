import { readJSON, writeJSON, isArrayOf } from '../storage/localStore';

/**
 * Registro de los tutoriales que el usuario ya vio (ver DEC-033).
 *
 * Se usa para abrir el tutorial automáticamente la primera vez que alguien entrena un
 * ejercicio con análisis por cámara, y nunca más después. Si el almacenamiento está
 * bloqueado, el tutorial se mostraría en cada uso: es preferible a no mostrarlo nunca.
 */

const SEEN_KEY = 'fitnet_tutorials_seen_v1';

function readSeen(): string[] {
  return readJSON<string[]>(
    SEEN_KEY, [],
    (v): v is string[] => isArrayOf<string>(v, x => typeof x === 'string')
  );
}

export function hasSeenTutorial(exerciseId: string): boolean {
  return readSeen().includes(exerciseId);
}

export function markTutorialSeen(exerciseId: string): void {
  const seen = readSeen();
  if (!seen.includes(exerciseId)) writeJSON(SEEN_KEY, [...seen, exerciseId]);
}
