/**
 * Catálogo de ejercicios organizado por grupo muscular (ver DEC-030).
 *
 * Distinción importante y deliberada: solo tres ejercicios tienen análisis de técnica
 * por cámara, porque solo para esos tres existe un tracker con su máquina de estados y
 * sus umbrales angulares validados. El resto del catálogo existe para poder armar
 * rutinas de cuerpo completo, y se registra con conteo manual o con temporizador.
 *
 * El campo `tracking` hace explícita esa diferencia en toda la interfaz, para no
 * prometerle al usuario un análisis que no se está haciendo.
 */

export type MuscleGroup =
  | 'pecho' | 'espalda' | 'hombros' | 'biceps' | 'triceps'
  | 'cuadriceps' | 'isquiotibiales' | 'gluteos' | 'pantorrillas'
  | 'core' | 'cardio';

export type Difficulty = 'bajo' | 'medio' | 'alto';

/** `camera` = análisis de técnica en vivo; `reps` = conteo manual; `time` = temporizador. */
export type TrackingMode = 'camera' | 'reps' | 'time';

/** Identificador del tracker 3D asociado, cuando el ejercicio tiene análisis. */
export type TrackerId = 'squat' | 'curl' | 'press';

export interface ExerciseDefinition {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  secondary: MuscleGroup[];
  /** Dificultad técnica intrínseca del movimiento. */
  baseDifficulty: Difficulty;
  tracking: TrackingMode;
  trackerId?: TrackerId;
  equipment: string;
  cues: string;
}

export const MUSCLE_GROUPS: { id: MuscleGroup; label: string; emoji: string }[] = [
  { id: 'pecho',          label: 'Pecho',          emoji: '🫁' },
  { id: 'espalda',        label: 'Espalda',        emoji: '🔙' },
  { id: 'hombros',        label: 'Hombros',        emoji: '🤸' },
  { id: 'biceps',         label: 'Bíceps',         emoji: '💪' },
  { id: 'triceps',        label: 'Tríceps',        emoji: '🦾' },
  { id: 'cuadriceps',     label: 'Cuádriceps',     emoji: '🦵' },
  { id: 'isquiotibiales', label: 'Isquiotibiales', emoji: '🦿' },
  { id: 'gluteos',        label: 'Glúteos',        emoji: '🍑' },
  { id: 'pantorrillas',   label: 'Pantorrillas',   emoji: '🦶' },
  { id: 'core',           label: 'Core',           emoji: '🎯' },
  { id: 'cardio',         label: 'Cardio',         emoji: '❤️' },
];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  bajo:  'Bajo',
  medio: 'Medio',
  alto:  'Alto',
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  bajo:  '#30D158',
  medio: '#FF9F0A',
  alto:  '#FF375F',
};

/**
 * Volumen sugerido por nivel de dificultad.
 * Sirve como valor inicial al agregar un ejercicio a una rutina; el usuario lo ajusta.
 */
export const DIFFICULTY_PRESETS: Record<
  Difficulty,
  { sets: number; reps: number; restSeconds: number; holdSeconds: number }
> = {
  bajo:  { sets: 2, reps: 10, restSeconds: 90, holdSeconds: 20 },
  medio: { sets: 3, reps: 12, restSeconds: 75, holdSeconds: 40 },
  alto:  { sets: 4, reps: 15, restSeconds: 60, holdSeconds: 60 },
};

export const EXERCISE_CATALOG: ExerciseDefinition[] = [
  // ── Pecho ──
  { id: 'press-banca', name: 'Press de banca', muscleGroup: 'pecho', secondary: ['triceps', 'hombros'], baseDifficulty: 'medio', tracking: 'reps', equipment: 'Barra y banco', cues: 'Escápulas retraídas, pies firmes en el suelo.' },
  { id: 'press-banca-mancuernas', name: 'Press con mancuernas', muscleGroup: 'pecho', secondary: ['triceps', 'hombros'], baseDifficulty: 'medio', tracking: 'reps', equipment: 'Mancuernas y banco', cues: 'Baja hasta que los codos queden a la altura del torso.' },
  { id: 'press-inclinado', name: 'Press inclinado', muscleGroup: 'pecho', secondary: ['hombros', 'triceps'], baseDifficulty: 'medio', tracking: 'reps', equipment: 'Banco inclinado', cues: 'Inclinación de 30 a 45 grados, ni más.' },
  { id: 'aperturas', name: 'Aperturas con mancuernas', muscleGroup: 'pecho', secondary: [], baseDifficulty: 'medio', tracking: 'reps', equipment: 'Mancuernas y banco', cues: 'Codos con una flexión leve y fija durante todo el recorrido.' },
  { id: 'cruce-poleas', name: 'Cruce de poleas', muscleGroup: 'pecho', secondary: [], baseDifficulty: 'medio', tracking: 'reps', equipment: 'Poleas', cues: 'Junta las manos por delante del esternón y sostén un instante.' },
  { id: 'flexiones', name: 'Flexiones de brazos', muscleGroup: 'pecho', secondary: ['triceps', 'core'], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Peso corporal', cues: 'Cuerpo en línea recta de la cabeza a los talones.' },
  { id: 'flexiones-inclinadas', name: 'Flexiones inclinadas', muscleGroup: 'pecho', secondary: ['triceps'], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Banco o cajón', cues: 'Cuanto más alto el apoyo, menos carga.' },
  { id: 'fondos-paralelas', name: 'Fondos en paralelas', muscleGroup: 'pecho', secondary: ['triceps', 'hombros'], baseDifficulty: 'alto', tracking: 'reps', equipment: 'Paralelas', cues: 'Inclinar el torso adelante carga más el pecho.' },

  // ── Espalda ──
  { id: 'dominadas', name: 'Dominadas', muscleGroup: 'espalda', secondary: ['biceps'], baseDifficulty: 'alto', tracking: 'reps', equipment: 'Barra fija', cues: 'Sube llevando los codos hacia las costillas, no con los brazos.' },
  { id: 'jalon-pecho', name: 'Jalón al pecho', muscleGroup: 'espalda', secondary: ['biceps'], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Polea alta', cues: 'Lleva la barra al pecho, nunca detrás de la nuca.' },
  { id: 'remo-barra', name: 'Remo con barra', muscleGroup: 'espalda', secondary: ['biceps', 'isquiotibiales'], baseDifficulty: 'alto', tracking: 'reps', equipment: 'Barra', cues: 'Espalda neutra, torso a unos 45 grados.' },
  { id: 'remo-mancuerna', name: 'Remo con mancuerna', muscleGroup: 'espalda', secondary: ['biceps'], baseDifficulty: 'medio', tracking: 'reps', equipment: 'Mancuerna y banco', cues: 'Un lado a la vez, sin rotar la cadera.' },
  { id: 'remo-polea', name: 'Remo en polea baja', muscleGroup: 'espalda', secondary: ['biceps'], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Polea baja', cues: 'Pecho afuera, junta las escápulas al final.' },
  { id: 'peso-muerto', name: 'Peso muerto', muscleGroup: 'espalda', secondary: ['isquiotibiales', 'gluteos'], baseDifficulty: 'alto', tracking: 'reps', equipment: 'Barra', cues: 'La barra pegada al cuerpo todo el recorrido.' },
  { id: 'pullover', name: 'Pullover', muscleGroup: 'espalda', secondary: ['pecho'], baseDifficulty: 'medio', tracking: 'reps', equipment: 'Mancuerna y banco', cues: 'Controla el estiramiento, no fuerces el hombro.' },
  { id: 'face-pull', name: 'Face pull', muscleGroup: 'espalda', secondary: ['hombros'], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Polea con cuerda', cues: 'Lleva la cuerda a la frente separando las manos.' },

  // ── Hombros ──
  { id: 'press-hombro', name: 'Press de hombro', muscleGroup: 'hombros', secondary: ['triceps'], baseDifficulty: 'medio', tracking: 'camera', trackerId: 'press', equipment: 'Mancuernas o barra', cues: 'Abdomen apretado, sin arquear la espalda.' },
  { id: 'elevaciones-laterales', name: 'Elevaciones laterales', muscleGroup: 'hombros', secondary: [], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Mancuernas', cues: 'Sube hasta la altura del hombro, no más.' },
  { id: 'elevaciones-frontales', name: 'Elevaciones frontales', muscleGroup: 'hombros', secondary: [], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Mancuernas o disco', cues: 'Sin balanceo de cadera.' },
  { id: 'pajaros', name: 'Pájaros (deltoides posterior)', muscleGroup: 'hombros', secondary: ['espalda'], baseDifficulty: 'medio', tracking: 'reps', equipment: 'Mancuernas', cues: 'Torso paralelo al suelo, codos apenas flexionados.' },
  { id: 'press-arnold', name: 'Press Arnold', muscleGroup: 'hombros', secondary: ['triceps'], baseDifficulty: 'alto', tracking: 'reps', equipment: 'Mancuernas', cues: 'Rota las muñecas durante la subida.' },
  { id: 'encogimientos', name: 'Encogimientos de trapecio', muscleGroup: 'hombros', secondary: [], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Mancuernas o barra', cues: 'Sube los hombros en línea recta, sin rotarlos.' },

  // ── Bíceps ──
  { id: 'curl-biceps', name: 'Curl de bíceps', muscleGroup: 'biceps', secondary: [], baseDifficulty: 'bajo', tracking: 'camera', trackerId: 'curl', equipment: 'Mancuernas o barra', cues: 'Codos pegados al cuerpo, sin impulso.' },
  { id: 'curl-martillo', name: 'Curl martillo', muscleGroup: 'biceps', secondary: [], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Mancuernas', cues: 'Palmas enfrentadas durante todo el recorrido.' },
  { id: 'curl-predicador', name: 'Curl predicador', muscleGroup: 'biceps', secondary: [], baseDifficulty: 'medio', tracking: 'reps', equipment: 'Banco Scott', cues: 'No extiendas del todo el codo en el punto bajo.' },
  { id: 'curl-concentrado', name: 'Curl concentrado', muscleGroup: 'biceps', secondary: [], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Mancuerna', cues: 'Codo apoyado en el muslo, movimiento lento.' },
  { id: 'curl-polea', name: 'Curl en polea', muscleGroup: 'biceps', secondary: [], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Polea baja', cues: 'Tensión constante, sin soltar en el punto bajo.' },

  // ── Tríceps ──
  { id: 'extension-polea', name: 'Extensión en polea', muscleGroup: 'triceps', secondary: [], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Polea alta', cues: 'Codos fijos a los costados.' },
  { id: 'press-frances', name: 'Press francés', muscleGroup: 'triceps', secondary: [], baseDifficulty: 'medio', tracking: 'reps', equipment: 'Barra Z y banco', cues: 'Baja la barra hacia la frente con codos quietos.' },
  { id: 'fondos-banco', name: 'Fondos en banco', muscleGroup: 'triceps', secondary: ['hombros'], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Banco', cues: 'No bajes más allá de 90 grados de codo.' },
  { id: 'patada-triceps', name: 'Patada de tríceps', muscleGroup: 'triceps', secondary: [], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Mancuerna', cues: 'Extiende completo y sostén un instante arriba.' },
  { id: 'extension-sobre-cabeza', name: 'Extensión sobre la cabeza', muscleGroup: 'triceps', secondary: [], baseDifficulty: 'medio', tracking: 'reps', equipment: 'Mancuerna', cues: 'Codos apuntando al frente, no abiertos.' },

  // ── Cuádriceps ──
  { id: 'sentadilla', name: 'Sentadillas', muscleGroup: 'cuadriceps', secondary: ['gluteos', 'core'], baseDifficulty: 'medio', tracking: 'camera', trackerId: 'squat', equipment: 'Peso corporal o barra', cues: 'Rodillas en línea con los pies, pecho arriba.' },
  { id: 'sentadilla-frontal', name: 'Sentadilla frontal', muscleGroup: 'cuadriceps', secondary: ['core'], baseDifficulty: 'alto', tracking: 'reps', equipment: 'Barra', cues: 'Codos altos para sostener la barra.' },
  { id: 'prensa', name: 'Prensa de piernas', muscleGroup: 'cuadriceps', secondary: ['gluteos'], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Máquina de prensa', cues: 'No bloquees las rodillas al extender.' },
  { id: 'extension-cuadriceps', name: 'Extensión de cuádriceps', muscleGroup: 'cuadriceps', secondary: [], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Máquina', cues: 'Movimiento controlado, sin impulso.' },
  { id: 'zancadas', name: 'Zancadas', muscleGroup: 'cuadriceps', secondary: ['gluteos'], baseDifficulty: 'medio', tracking: 'reps', equipment: 'Peso corporal o mancuernas', cues: 'La rodilla de atrás casi toca el suelo.' },
  { id: 'sentadilla-bulgara', name: 'Sentadilla búlgara', muscleGroup: 'cuadriceps', secondary: ['gluteos'], baseDifficulty: 'alto', tracking: 'reps', equipment: 'Banco y mancuernas', cues: 'El pie de atrás solo da equilibrio, no empuja.' },
  { id: 'sentadilla-goblet', name: 'Sentadilla goblet', muscleGroup: 'cuadriceps', secondary: ['core'], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Mancuerna o pesa rusa', cues: 'Peso pegado al pecho, codos por dentro de las rodillas.' },

  // ── Isquiotibiales ──
  { id: 'peso-muerto-rumano', name: 'Peso muerto rumano', muscleGroup: 'isquiotibiales', secondary: ['gluteos', 'espalda'], baseDifficulty: 'medio', tracking: 'reps', equipment: 'Barra o mancuernas', cues: 'Cadera atrás, rodillas casi fijas.' },
  { id: 'curl-femoral', name: 'Curl femoral', muscleGroup: 'isquiotibiales', secondary: [], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Máquina', cues: 'Cadera pegada al banco todo el recorrido.' },
  { id: 'buenos-dias', name: 'Buenos días', muscleGroup: 'isquiotibiales', secondary: ['espalda'], baseDifficulty: 'alto', tracking: 'reps', equipment: 'Barra', cues: 'Poco peso: la técnica manda en este movimiento.' },

  // ── Glúteos ──
  { id: 'hip-thrust', name: 'Hip thrust', muscleGroup: 'gluteos', secondary: ['isquiotibiales'], baseDifficulty: 'medio', tracking: 'reps', equipment: 'Barra y banco', cues: 'Mentón hacia el pecho, aprieta arriba.' },
  { id: 'puente-gluteo', name: 'Puente de glúteo', muscleGroup: 'gluteos', secondary: ['core'], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Peso corporal', cues: 'Empuja con los talones.' },
  { id: 'patada-gluteo', name: 'Patada de glúteo', muscleGroup: 'gluteos', secondary: [], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Polea o peso corporal', cues: 'Sin arquear la zona lumbar.' },
  { id: 'abduccion', name: 'Abducción de cadera', muscleGroup: 'gluteos', secondary: [], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Máquina o banda', cues: 'Torso levemente inclinado al frente.' },

  // ── Pantorrillas ──
  { id: 'elevacion-talones-pie', name: 'Elevación de talones de pie', muscleGroup: 'pantorrillas', secondary: [], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Peso corporal o máquina', cues: 'Recorrido completo, pausa arriba.' },
  { id: 'elevacion-talones-sentado', name: 'Elevación de talones sentado', muscleGroup: 'pantorrillas', secondary: [], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Máquina', cues: 'Trabaja el sóleo: sube lento.' },

  // ── Core ──
  { id: 'plancha', name: 'Plancha', muscleGroup: 'core', secondary: ['hombros'], baseDifficulty: 'bajo', tracking: 'time', equipment: 'Peso corporal', cues: 'Cadera ni alta ni hundida, glúteos apretados.' },
  { id: 'plancha-lateral', name: 'Plancha lateral', muscleGroup: 'core', secondary: [], baseDifficulty: 'medio', tracking: 'time', equipment: 'Peso corporal', cues: 'Hombro alineado sobre el codo.' },
  { id: 'abdominales', name: 'Abdominales', muscleGroup: 'core', secondary: [], baseDifficulty: 'bajo', tracking: 'reps', equipment: 'Peso corporal', cues: 'Sin tirar del cuello con las manos.' },
  { id: 'elevacion-piernas', name: 'Elevación de piernas', muscleGroup: 'core', secondary: [], baseDifficulty: 'medio', tracking: 'reps', equipment: 'Peso corporal o barra', cues: 'Zona lumbar pegada al suelo.' },
  { id: 'russian-twist', name: 'Russian twist', muscleGroup: 'core', secondary: [], baseDifficulty: 'medio', tracking: 'reps', equipment: 'Disco o balón', cues: 'Rota desde el tronco, no desde los brazos.' },
  { id: 'mountain-climbers', name: 'Mountain climbers', muscleGroup: 'core', secondary: ['cardio'], baseDifficulty: 'medio', tracking: 'time', equipment: 'Peso corporal', cues: 'Cadera baja, ritmo sostenido.' },
  { id: 'rueda-abdominal', name: 'Rueda abdominal', muscleGroup: 'core', secondary: ['espalda'], baseDifficulty: 'alto', tracking: 'reps', equipment: 'Rueda', cues: 'No dejes que la lumbar se arquee al extender.' },

  // ── Cardio ──
  { id: 'burpees', name: 'Burpees', muscleGroup: 'cardio', secondary: ['core', 'pecho'], baseDifficulty: 'alto', tracking: 'time', equipment: 'Peso corporal', cues: 'Ritmo constante antes que velocidad.' },
  { id: 'saltar-cuerda', name: 'Saltar la cuerda', muscleGroup: 'cardio', secondary: ['pantorrillas'], baseDifficulty: 'medio', tracking: 'time', equipment: 'Cuerda', cues: 'Saltos bajos, muñecas relajadas.' },
  { id: 'caminadora', name: 'Caminadora', muscleGroup: 'cardio', secondary: [], baseDifficulty: 'bajo', tracking: 'time', equipment: 'Caminadora', cues: 'Usa la inclinación antes que la velocidad.' },
  { id: 'bicicleta', name: 'Bicicleta estática', muscleGroup: 'cardio', secondary: ['cuadriceps'], baseDifficulty: 'bajo', tracking: 'time', equipment: 'Bicicleta', cues: 'Ajusta el asiento a la altura de la cadera.' },
  { id: 'remo-ergometro', name: 'Remo ergómetro', muscleGroup: 'cardio', secondary: ['espalda'], baseDifficulty: 'medio', tracking: 'time', equipment: 'Ergómetro', cues: 'Primero piernas, después espalda, al final brazos.' },
];

const BY_ID = new Map(EXERCISE_CATALOG.map(e => [e.id, e]));

export function getExercise(id: string): ExerciseDefinition | undefined {
  return BY_ID.get(id);
}

export function getExercisesByMuscle(group: MuscleGroup): ExerciseDefinition[] {
  return EXERCISE_CATALOG.filter(e => e.muscleGroup === group);
}

export function getTrackedExercises(): ExerciseDefinition[] {
  return EXERCISE_CATALOG.filter(e => e.tracking === 'camera');
}

export function getMuscleLabel(group: MuscleGroup): string {
  return MUSCLE_GROUPS.find(m => m.id === group)?.label ?? group;
}

export function searchExercises(query: string): ExerciseDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return EXERCISE_CATALOG;
  return EXERCISE_CATALOG.filter(
    e => e.name.toLowerCase().includes(q) || getMuscleLabel(e.muscleGroup).toLowerCase().includes(q)
  );
}
