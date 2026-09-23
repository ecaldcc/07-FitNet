/**
 * Acceso defensivo a `localStorage` (extiende el criterio de DEC-024 a todo el proyecto).
 *
 * Motivo: en Safari en modo privado, en iframes con sandbox y con storage bloqueado por
 * política del sistema, `localStorage.getItem` lanza una excepción en vez de devolver
 * `null`. Sin este envoltorio, cualquier lectura rompe el arranque de React.
 *
 * Además valida la forma del dato recuperado: un JSON corrupto o de una versión anterior
 * del esquema no debe propagarse al resto de la aplicación.
 */

export function readJSON<T>(
  key: string,
  fallback: T,
  validate?: (value: unknown) => value is T
): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;

    const parsed: unknown = JSON.parse(raw);
    if (validate && !validate(parsed)) return fallback;

    return parsed as T;
  } catch {
    // Storage bloqueado, JSON corrupto o cuota excedida: seguir con el valor por defecto.
    return fallback;
  }
}

/** Devuelve `false` si no se pudo escribir, para que la interfaz pueda avisar. */
export function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readString(key: string, fallback: string, allowed?: readonly string[]): string {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    if (allowed && !allowed.includes(raw)) return fallback;
    return raw;
  } catch {
    return fallback;
  }
}

export function writeString(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Sin storage no hay nada que borrar.
  }
}

export function isArrayOf<T>(
  value: unknown,
  itemCheck: (item: unknown) => boolean
): value is T[] {
  return Array.isArray(value) && value.every(itemCheck);
}
