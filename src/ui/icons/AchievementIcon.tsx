import type { AchievementIconName } from '../../profile/profile';

/**
 * Íconos de los logros (ver DEC-041).
 *
 * Reemplazan a los emojis, que se veían distintos en cada sistema operativo y no
 * encajaban con el resto de la interfaz. Están dibujados con el mismo trazo que los
 * íconos de la barra de navegación: 24×24, línea de 2, puntas redondeadas.
 */
const PATHS: Record<AchievementIconName, React.ReactNode> = {
  // Primer paso: bandera de salida
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2.5 4.5L16 13H5" />
    </>
  ),
  // Constancia: llama
  flame: (
    <path d="M12 3c.6 3.2 4.5 5.3 4.5 10a4.5 4.5 0 0 1-9 0c0-2.3 1.2-3.8 2.3-4.8.3 1.7 1.2 2.8 2.2 2.8-.6-2.8-.8-5.2 0-8z" />
  ),
  // Veterano: copa
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 6H5.5a2.5 2.5 0 0 0 3 3.6" />
      <path d="M16 6h2.5a2.5 2.5 0 0 1-3 3.6" />
      <path d="M12 13v4" />
      <path d="M8.5 20h7" />
      <path d="M9.5 17h5" />
    </>
  ),
  // Cien repeticiones: ciclo
  repeat: (
    <>
      <path d="M17 3l3 3-3 3" />
      <path d="M4 11V9a3 3 0 0 1 3-3h13" />
      <path d="M7 21l-3-3 3-3" />
      <path d="M20 13v2a3 3 0 0 1-3 3H4" />
    </>
  ),
  // Mil repeticiones: rayo
  bolt: <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2z" />,
  // Tres seguidos: calendario
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
      <path d="M8 14h.01M12 14h.01M16 14h.01" />
    </>
  ),
  // Semana completa: calendario con marca
  'calendar-check': (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
      <path d="m9 15 2 2 4-4" />
    </>
  ),
  // Una hora: cronómetro
  timer: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 13.5V10" />
      <path d="M10 3h4" />
      <path d="M12 3v3" />
      <path d="m18.5 7 1.2-1.2" />
    </>
  ),
};

export function AchievementIcon({ name }: { name: AchievementIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
