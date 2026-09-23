/**
 * Fichas de técnica de los 60 ejercicios del catálogo (ver DEC-033).
 *
 * Todo el contenido es texto propio: funciona sin conexión y no depende de videos o
 * imágenes de terceros con derechos de autor. El campo `videoUrl` queda reservado para
 * que el equipo agregue grabaciones propias más adelante.
 *
 * Los músculos, el equipo y la dificultad no se repiten aquí: viven en `catalog.ts`
 * y la pantalla del tutorial los combina. Así hay una sola fuente de verdad por dato.
 */

export interface ExerciseTutorial {
  /** Pasos de ejecución en orden. */
  steps: string[];
  /** Errores frecuentes, redactados como lo que hay que evitar. */
  mistakes: string[];
  breathing: string;
  /** Solo en los ejercicios con análisis por cámara. */
  cameraSetup?: string;
  /** Advertencia específica en ejercicios con riesgo de lesión por mala técnica. */
  safety?: string;
  /** Reservado para grabaciones propias del equipo. */
  videoUrl?: string;
}

// Patrones de respiración compartidos: se repiten en decenas de ejercicios.
const BREATH_PUSH = 'Inhala en la fase de bajada y exhala mientras empujas.';
const BREATH_PULL = 'Exhala al tirar y vuelve a inhalar durante el regreso controlado.';
const BREATH_LIFT = 'Exhala al subir el peso e inhala al bajarlo.';
const BREATH_HOLD = 'Respira de forma continua y pausada. No contengas el aire.';
const BREATH_CARDIO =
  'Respira a ritmo constante. Si no puedes decir una frase corta, baja la intensidad.';

const SPINE_SAFETY =
  'Mantén la espalda neutra en todo momento. Si no puedes sostenerla, baja el peso: ' +
  'redondear la zona lumbar bajo carga es la causa más común de lesión en este movimiento.';

export const TUTORIALS: Record<string, ExerciseTutorial> = {
  // ─────────────────────────────── Pecho ───────────────────────────────
  'press-banca': {
    steps: [
      'Acuéstate en el banco con los ojos debajo de la barra y los pies firmes en el suelo.',
      'Toma la barra un poco más abierta que el ancho de hombros y junta las escápulas.',
      'Baja la barra controlada hasta rozar la parte baja del pecho.',
      'Empuja hacia arriba y ligeramente hacia atrás hasta extender los brazos.',
    ],
    mistakes: [
      'Rebotar la barra en el pecho para ganar impulso.',
      'Abrir los codos a 90 grados del torso; lo seguro es unos 45 a 70 grados.',
      'Despegar la cadera del banco al empujar.',
    ],
    breathing: BREATH_PUSH,
    safety: 'Con peso alto, entrena siempre con alguien que te asista desde atrás.',
  },
  'press-banca-mancuernas': {
    steps: [
      'Siéntate con las mancuernas sobre los muslos y recuéstate llevándolas al pecho.',
      'Empuja hasta extender los brazos, con las mancuernas sobre la línea de los hombros.',
      'Baja despacio hasta que los codos queden un poco por debajo del banco.',
      'Empuja de nuevo, acercando levemente las mancuernas arriba sin chocarlas.',
    ],
    mistakes: [
      'Bajar demasiado rápido y perder el control en el punto más bajo.',
      'Dejar que una mano suba más que la otra.',
      'Soltar las mancuernas de golpe al terminar la serie.',
    ],
    breathing: BREATH_PUSH,
  },
  'press-inclinado': {
    steps: [
      'Ajusta el banco entre 30 y 45 grados.',
      'Apoya la espalda completa y junta las escápulas.',
      'Baja la barra o las mancuernas hacia la parte alta del pecho.',
      'Empuja hasta extender los brazos sin bloquear los codos con fuerza.',
    ],
    mistakes: [
      'Inclinar el banco de más, lo que pasa el trabajo a los hombros.',
      'Arquear la espalda para convertirlo en un press plano.',
      'Bajar la barra hacia el abdomen en lugar del pecho alto.',
    ],
    breathing: BREATH_PUSH,
  },
  'aperturas': {
    steps: [
      'Acuéstate en el banco con las mancuernas arriba y las palmas enfrentadas.',
      'Flexiona apenas los codos y mantén ese ángulo fijo todo el tiempo.',
      'Abre los brazos en arco hasta sentir el estiramiento del pecho.',
      'Cierra el arco llevando las mancuernas de vuelta arriba.',
    ],
    mistakes: [
      'Doblar y estirar los codos, que lo convierte en un press.',
      'Bajar más allá de la línea de los hombros con peso alto.',
      'Usar demasiado peso: este ejercicio es de control, no de fuerza.',
    ],
    breathing: 'Inhala al abrir los brazos y exhala al cerrarlos.',
  },
  'cruce-poleas': {
    steps: [
      'Coloca las poleas altas y da un paso al frente con un pie adelantado.',
      'Inclina levemente el torso con los codos un poco flexionados.',
      'Trae las manos en arco hasta juntarlas frente al esternón.',
      'Sostén un instante y vuelve abriendo despacio.',
    ],
    mistakes: [
      'Tirar con los brazos en lugar de cerrar desde el pecho.',
      'Balancear el torso para mover más peso.',
      'Soltar rápido en el regreso y perder la tensión.',
    ],
    breathing: 'Exhala al cerrar e inhala al abrir.',
  },
  'flexiones': {
    steps: [
      'Apoya las manos un poco más abiertas que los hombros.',
      'Estira las piernas y forma una línea recta de la cabeza a los talones.',
      'Baja el pecho hasta casi tocar el suelo, con los codos a unos 45 grados.',
      'Empuja el suelo hasta extender los brazos sin romper la línea del cuerpo.',
    ],
    mistakes: [
      'Hundir la cadera o levantarla en forma de pico.',
      'Abrir los codos en forma de T.',
      'Hacer medio recorrido sin bajar el pecho.',
    ],
    breathing: BREATH_PUSH,
  },
  'flexiones-inclinadas': {
    steps: [
      'Apoya las manos en un banco o cajón estable.',
      'Aleja los pies hasta que el cuerpo quede recto e inclinado.',
      'Baja el pecho hacia el borde del apoyo.',
      'Empuja hasta estirar los brazos.',
    ],
    mistakes: [
      'Usar un apoyo que se mueve o resbala.',
      'Doblar la cadera en vez de mantener el cuerpo recto.',
      'Quedarte en esta variante cuando ya puedes hacer flexiones en el suelo.',
    ],
    breathing: BREATH_PUSH,
  },
  'fondos-paralelas': {
    steps: [
      'Sube a las paralelas con los brazos extendidos y los hombros abajo.',
      'Inclina el torso adelante para cargar el pecho.',
      'Baja hasta que los codos lleguen a unos 90 grados.',
      'Empuja hasta extender los brazos.',
    ],
    mistakes: [
      'Bajar demasiado, lo que sobrecarga la parte delantera del hombro.',
      'Encoger los hombros hacia las orejas.',
      'Balancear las piernas para subir.',
    ],
    breathing: BREATH_PUSH,
    safety: 'Si sientes molestia delante del hombro, reduce el recorrido o cambia a fondos en banco.',
  },

  // ─────────────────────────────── Espalda ───────────────────────────────
  'dominadas': {
    steps: [
      'Cuélgate de la barra con agarre algo más abierto que los hombros.',
      'Baja los hombros alejándolos de las orejas antes de empezar.',
      'Sube llevando los codos hacia las costillas hasta pasar el mentón.',
      'Baja controlado hasta estirar los brazos.',
    ],
    mistakes: [
      'Balancear las piernas para impulsarte.',
      'Hacer medio recorrido sin estirar abajo.',
      'Adelantar el mentón para "llegar" a la barra.',
    ],
    breathing: BREATH_PULL,
  },
  'jalon-pecho': {
    steps: [
      'Siéntate con los muslos firmes bajo los rodillos.',
      'Toma la barra con agarre abierto y lleva el pecho levemente afuera.',
      'Tira de la barra hasta la parte alta del pecho.',
      'Sube controlado hasta estirar los brazos.',
    ],
    mistakes: [
      'Llevar la barra detrás de la nuca.',
      'Echarse muy atrás para usar el peso del cuerpo.',
      'Soltar de golpe en el regreso.',
    ],
    breathing: BREATH_PULL,
  },
  'remo-barra': {
    steps: [
      'Párate con los pies al ancho de cadera y la barra frente a los muslos.',
      'Flexiona las rodillas y lleva la cadera atrás hasta dejar el torso a unos 45 grados.',
      'Tira de la barra hacia el ombligo juntando las escápulas.',
      'Baja la barra controlada sin cambiar la inclinación del torso.',
    ],
    mistakes: [
      'Redondear la espalda.',
      'Enderezar el torso en cada repetición para ayudarte.',
      'Tirar con los brazos en lugar de con la espalda.',
    ],
    breathing: BREATH_PULL,
    safety: SPINE_SAFETY,
  },
  'remo-mancuerna': {
    steps: [
      'Apoya una mano y una rodilla en el banco con la espalda plana.',
      'Toma la mancuerna con el brazo libre estirado.',
      'Tira llevando el codo hacia la cadera.',
      'Baja despacio hasta estirar el brazo.',
    ],
    mistakes: [
      'Rotar el torso para subir más peso.',
      'Llevar el codo hacia afuera en lugar de hacia atrás.',
      'Encoger el hombro al tirar.',
    ],
    breathing: BREATH_PULL,
  },
  'remo-polea': {
    steps: [
      'Siéntate con las rodillas levemente flexionadas y la espalda recta.',
      'Toma el agarre con los brazos estirados.',
      'Tira hacia el abdomen juntando las escápulas al final.',
      'Vuelve estirando los brazos sin encorvar la espalda.',
    ],
    mistakes: [
      'Balancear el torso adelante y atrás.',
      'Encorvar la espalda en el regreso.',
      'Terminar el tirón sin juntar las escápulas.',
    ],
    breathing: BREATH_PULL,
  },
  'peso-muerto': {
    steps: [
      'Párate con la barra sobre la mitad del pie y los pies al ancho de cadera.',
      'Baja la cadera y toma la barra por fuera de las piernas, con la espalda neutra.',
      'Empuja el suelo con las piernas y extiende la cadera, con la barra pegada al cuerpo.',
      'Termina de pie, sin echar el torso atrás, y baja invirtiendo el camino.',
    ],
    mistakes: [
      'Redondear la espalda al despegar la barra del suelo.',
      'Alejar la barra de las piernas.',
      'Hiperextender la espalda arriba.',
    ],
    breathing: 'Toma aire y aprieta el abdomen antes de tirar. Exhala al llegar arriba.',
    safety: SPINE_SAFETY,
  },
  'pullover': {
    steps: [
      'Recuéstate con la parte alta de la espalda sobre el banco.',
      'Sostén una mancuerna con ambas manos sobre el pecho.',
      'Lleva la mancuerna en arco hacia atrás de la cabeza.',
      'Regresa por el mismo arco hasta sobre el pecho.',
    ],
    mistakes: [
      'Bajar más allá de lo que el hombro tolera.',
      'Doblar los codos y convertirlo en un press de tríceps.',
      'Dejar caer la cadera.',
    ],
    breathing: 'Inhala al llevar el peso atrás y exhala al traerlo de vuelta.',
  },
  'face-pull': {
    steps: [
      'Coloca la polea a la altura de la cara con una cuerda.',
      'Toma la cuerda con las palmas hacia abajo y da un paso atrás.',
      'Tira hacia la frente separando las manos al final.',
      'Vuelve despacio hasta estirar los brazos.',
    ],
    mistakes: [
      'Tirar hacia el cuello o el pecho.',
      'Usar demasiado peso y compensar con la espalda baja.',
      'No separar las manos, lo que quita el trabajo del hombro posterior.',
    ],
    breathing: BREATH_PULL,
  },

  // ─────────────────────────────── Hombros ───────────────────────────────
  'press-hombro': {
    steps: [
      'Párate con los pies al ancho de cadera y las pesas a la altura de los hombros.',
      'Aprieta el abdomen y los glúteos para fijar la espalda.',
      'Empuja las pesas hacia arriba hasta casi estirar los brazos.',
      'Baja controlado hasta la altura de los hombros.',
    ],
    mistakes: [
      'Arquear la zona lumbar para subir el peso.',
      'Bajar las pesas muy por debajo de los hombros.',
      'Bloquear los codos con fuerza en la extensión.',
    ],
    breathing: BREATH_LIFT,
    cameraSetup:
      'Coloca el celular a la altura del pecho, a unos 2 o 3 metros. Deja espacio arriba ' +
      'para que las manos no salgan del cuadro en la extensión, e incluye la cadera: la app ' +
      'la usa para medir si arqueas la espalda.',
  },
  'elevaciones-laterales': {
    steps: [
      'Párate con una mancuerna en cada mano a los costados.',
      'Flexiona apenas los codos.',
      'Sube los brazos hacia los lados hasta la altura de los hombros.',
      'Baja despacio sin dejar caer las pesas.',
    ],
    mistakes: [
      'Subir por encima de la línea de los hombros.',
      'Encoger los hombros hacia las orejas.',
      'Balancear el cuerpo para ganar impulso.',
    ],
    breathing: BREATH_LIFT,
  },
  'elevaciones-frontales': {
    steps: [
      'Párate con las pesas frente a los muslos.',
      'Sube un brazo o ambos al frente hasta la altura de los hombros.',
      'Sostén un instante arriba.',
      'Baja controlado.',
    ],
    mistakes: [
      'Balancear la cadera.',
      'Subir por encima de la cabeza.',
      'Arquear la espalda.',
    ],
    breathing: BREATH_LIFT,
  },
  'pajaros': {
    steps: [
      'Inclina el torso hasta quedar casi paralelo al suelo, con la espalda recta.',
      'Deja colgar las mancuernas con los codos apenas flexionados.',
      'Abre los brazos hacia los lados hasta la altura del torso.',
      'Baja despacio.',
    ],
    mistakes: [
      'Enderezar el torso durante la serie.',
      'Juntar las escápulas y convertirlo en un remo.',
      'Usar demasiado peso.',
    ],
    breathing: BREATH_LIFT,
  },
  'press-arnold': {
    steps: [
      'Siéntate con las mancuernas frente al pecho y las palmas hacia ti.',
      'Empuja hacia arriba mientras rotas las muñecas.',
      'Termina con las palmas hacia el frente y los brazos casi estirados.',
      'Baja invirtiendo la rotación.',
    ],
    mistakes: [
      'Rotar de golpe al final en vez de hacerlo durante el recorrido.',
      'Arquear la espalda.',
      'Bajar con prisa.',
    ],
    breathing: BREATH_LIFT,
  },
  'encogimientos': {
    steps: [
      'Párate con el peso a los costados o frente a los muslos.',
      'Sube los hombros en línea recta hacia las orejas.',
      'Sostén un segundo arriba.',
      'Baja despacio.',
    ],
    mistakes: [
      'Rotar los hombros en círculos.',
      'Doblar los codos para ayudarte.',
      'Adelantar la cabeza.',
    ],
    breathing: BREATH_LIFT,
  },

  // ─────────────────────────────── Bíceps ───────────────────────────────
  'curl-biceps': {
    steps: [
      'Párate con las pesas a los costados y las palmas hacia adelante.',
      'Pega los codos al cuerpo y déjalos fijos durante toda la serie.',
      'Sube las pesas doblando solo los codos, hasta la altura de los hombros.',
      'Baja despacio hasta estirar los brazos por completo.',
    ],
    mistakes: [
      'Balancear el torso o la cadera para subir el peso.',
      'Adelantar los codos al subir.',
      'Bajar a medias sin estirar el brazo.',
    ],
    breathing: BREATH_LIFT,
    cameraSetup:
      'Coloca el celular a la altura del pecho, a unos 2 metros, con hombros, codos y ' +
      'muñecas dentro del cuadro. De perfil la app detecta mejor si adelantas el codo; ' +
      'de frente evalúa los dos brazos a la vez.',
  },
  'curl-martillo': {
    steps: [
      'Párate con las pesas a los costados y las palmas enfrentadas.',
      'Sube doblando los codos sin rotar las muñecas.',
      'Llega hasta la altura de los hombros.',
      'Baja controlado.',
    ],
    mistakes: [
      'Rotar las muñecas durante la subida.',
      'Balancear el cuerpo.',
      'Separar los codos del torso.',
    ],
    breathing: BREATH_LIFT,
  },
  'curl-predicador': {
    steps: [
      'Siéntate con la parte de atrás de los brazos apoyada en el atril.',
      'Toma la barra con las palmas hacia arriba.',
      'Sube hasta que los antebrazos queden casi verticales.',
      'Baja despacio sin estirar del todo el codo.',
    ],
    mistakes: [
      'Despegar los brazos del atril.',
      'Dejar caer el peso en la bajada.',
      'Estirar el codo por completo con carga alta.',
    ],
    breathing: BREATH_LIFT,
    safety: 'La extensión completa con peso alto estresa el tendón del bíceps: deja una leve flexión abajo.',
  },
  'curl-concentrado': {
    steps: [
      'Siéntate con las piernas abiertas y apoya el codo en la cara interna del muslo.',
      'Deja colgar la mancuerna con el brazo estirado.',
      'Sube despacio hacia el hombro.',
      'Baja controlado.',
    ],
    mistakes: [
      'Mover el hombro para ayudarte.',
      'Hacerlo rápido: este ejercicio es de control.',
      'Apoyar el codo en la rodilla en lugar del muslo.',
    ],
    breathing: BREATH_LIFT,
  },
  'curl-polea': {
    steps: [
      'Párate frente a la polea baja con una barra corta.',
      'Pega los codos al cuerpo.',
      'Sube la barra hasta la altura del pecho.',
      'Baja manteniendo la tensión del cable.',
    ],
    mistakes: [
      'Soltar la tensión en el punto bajo.',
      'Echar el torso atrás.',
      'Separar los codos del cuerpo.',
    ],
    breathing: BREATH_LIFT,
  },

  // ─────────────────────────────── Tríceps ───────────────────────────────
  'extension-polea': {
    steps: [
      'Párate frente a la polea alta con una barra o cuerda.',
      'Pega los codos a los costados.',
      'Empuja hacia abajo hasta estirar los brazos.',
      'Sube despacio sin mover los codos.',
    ],
    mistakes: [
      'Mover los codos hacia adelante y atrás.',
      'Inclinarte sobre la polea para empujar con el peso del cuerpo.',
      'Hacer medio recorrido.',
    ],
    breathing: BREATH_PUSH,
  },
  'press-frances': {
    steps: [
      'Acuéstate en el banco con la barra sobre el pecho y los brazos estirados.',
      'Dobla solo los codos para bajar la barra hacia la frente.',
      'Mantén los codos apuntando al techo.',
      'Extiende los brazos para volver arriba.',
    ],
    mistakes: [
      'Abrir los codos hacia los lados.',
      'Mover los hombros y convertirlo en un press.',
      'Bajar con prisa hacia la cabeza.',
    ],
    breathing: BREATH_PUSH,
    safety: 'Baja siempre despacio: la barra pasa cerca de la cara.',
  },
  'fondos-banco': {
    steps: [
      'Siéntate en el borde del banco con las manos junto a la cadera.',
      'Adelanta la cadera fuera del banco con las piernas flexionadas.',
      'Baja doblando los codos hasta unos 90 grados.',
      'Empuja hasta estirar los brazos.',
    ],
    mistakes: [
      'Bajar más de 90 grados de codo.',
      'Alejar la cadera del banco.',
      'Encoger los hombros.',
    ],
    breathing: BREATH_PUSH,
  },
  'patada-triceps': {
    steps: [
      'Inclina el torso con una mano apoyada en el banco.',
      'Sube el codo de trabajo a la altura del torso y déjalo fijo.',
      'Estira el brazo hacia atrás hasta extenderlo por completo.',
      'Sostén un instante y vuelve despacio.',
    ],
    mistakes: [
      'Dejar caer el codo durante la serie.',
      'Balancear el peso.',
      'No llegar a la extensión completa.',
    ],
    breathing: BREATH_PUSH,
  },
  'extension-sobre-cabeza': {
    steps: [
      'Sostén una mancuerna con ambas manos sobre la cabeza.',
      'Baja la pesa detrás de la cabeza doblando los codos.',
      'Mantén los codos apuntando al frente.',
      'Extiende los brazos para volver arriba.',
    ],
    mistakes: [
      'Abrir los codos hacia los lados.',
      'Arquear la espalda.',
      'Bajar demasiado rápido.',
    ],
    breathing: BREATH_PUSH,
  },

  // ─────────────────────────────── Cuádriceps ───────────────────────────────
  'sentadilla': {
    steps: [
      'Párate con los pies un poco más abiertos que la cadera y las puntas levemente hacia afuera.',
      'Lleva la cadera atrás y abajo, como si fueras a sentarte en una silla.',
      'Baja hasta que los muslos queden paralelos al suelo, con el pecho arriba.',
      'Empuja con los talones para volver a subir.',
    ],
    mistakes: [
      'Cerrar las rodillas hacia adentro.',
      'Despegar los talones del suelo.',
      'Inclinar demasiado el torso hacia adelante.',
    ],
    breathing: BREATH_PUSH,
    cameraSetup:
      'Coloca el celular a la altura de la cadera, a unos 2 o 3 metros, de modo que se vea ' +
      'tu cuerpo completo de la cabeza a los pies. Funciona de frente o de perfil; de perfil ' +
      'la app mide mejor la inclinación de tu espalda.',
  },
  'sentadilla-frontal': {
    steps: [
      'Apoya la barra sobre la parte delantera de los hombros con los codos altos.',
      'Separa los pies al ancho de hombros.',
      'Baja con el torso lo más vertical posible.',
      'Sube empujando con toda la planta.',
    ],
    mistakes: [
      'Dejar caer los codos, lo que hace rodar la barra.',
      'Inclinar el torso adelante.',
      'Bajar a medias.',
    ],
    breathing: 'Toma aire y aprieta el abdomen antes de bajar. Exhala al terminar la subida.',
    safety: SPINE_SAFETY,
  },
  'prensa': {
    steps: [
      'Siéntate con la espalda completa apoyada en el respaldo.',
      'Coloca los pies al ancho de cadera en el centro de la plataforma.',
      'Baja la plataforma hasta que las rodillas lleguen a unos 90 grados.',
      'Empuja hasta casi estirar las piernas.',
    ],
    mistakes: [
      'Bloquear las rodillas al extender.',
      'Despegar la cadera del asiento al bajar.',
      'Cerrar las rodillas hacia adentro.',
    ],
    breathing: BREATH_PUSH,
    safety: 'Nunca bloquees las rodillas por completo: bajo carga alta pueden hiperextenderse.',
  },
  'extension-cuadriceps': {
    steps: [
      'Siéntate con la espalda apoyada y el rodillo sobre los tobillos.',
      'Toma las agarraderas para fijar la cadera.',
      'Extiende las piernas hasta estirarlas.',
      'Baja despacio.',
    ],
    mistakes: [
      'Patear el peso con impulso.',
      'Despegar la cadera del asiento.',
      'Dejar caer el peso en la bajada.',
    ],
    breathing: BREATH_LIFT,
  },
  'zancadas': {
    steps: [
      'Párate derecho con los pies juntos.',
      'Da un paso largo al frente.',
      'Baja hasta que la rodilla de atrás casi toque el suelo.',
      'Empuja con el pie de adelante para volver.',
    ],
    mistakes: [
      'Dar un paso demasiado corto.',
      'Dejar que la rodilla de adelante se cierre hacia adentro.',
      'Inclinar el torso adelante.',
    ],
    breathing: BREATH_PUSH,
  },
  'sentadilla-bulgara': {
    steps: [
      'Párate de espaldas a un banco y apoya el empeine de un pie sobre él.',
      'Adelanta el otro pie lo suficiente.',
      'Baja con el torso erguido hasta que el muslo de adelante quede paralelo.',
      'Sube empujando con el pie de adelante.',
    ],
    mistakes: [
      'Empujar con el pie de atrás.',
      'Colocar el pie de adelante demasiado cerca del banco.',
      'Perder el equilibrio por apurarte.',
    ],
    breathing: BREATH_PUSH,
  },
  'sentadilla-goblet': {
    steps: [
      'Sostén una mancuerna o pesa rusa pegada al pecho.',
      'Separa los pies un poco más que la cadera.',
      'Baja con los codos por dentro de las rodillas.',
      'Sube empujando con los talones.',
    ],
    mistakes: [
      'Alejar el peso del pecho.',
      'Redondear la espalda.',
      'Cerrar las rodillas.',
    ],
    breathing: BREATH_PUSH,
  },

  // ─────────────────────────────── Isquiotibiales ───────────────────────────────
  'peso-muerto-rumano': {
    steps: [
      'Párate con la barra o las mancuernas frente a los muslos.',
      'Flexiona apenas las rodillas y déjalas fijas.',
      'Lleva la cadera atrás bajando el peso pegado a las piernas.',
      'Baja hasta sentir el estiramiento atrás del muslo y sube extendiendo la cadera.',
    ],
    mistakes: [
      'Redondear la espalda para bajar más.',
      'Doblar las rodillas y convertirlo en una sentadilla.',
      'Alejar el peso de las piernas.',
    ],
    breathing: 'Inhala al bajar y exhala al extender la cadera.',
    safety: SPINE_SAFETY,
  },
  'curl-femoral': {
    steps: [
      'Acuéstate boca abajo con el rodillo sobre los tobillos.',
      'Toma las agarraderas y pega la cadera al banco.',
      'Dobla las rodillas llevando los talones hacia los glúteos.',
      'Baja despacio.',
    ],
    mistakes: [
      'Levantar la cadera del banco.',
      'Hacer el movimiento con impulso.',
      'Soltar el peso en la bajada.',
    ],
    breathing: BREATH_LIFT,
  },
  'buenos-dias': {
    steps: [
      'Apoya una barra liviana sobre la parte alta de la espalda.',
      'Flexiona apenas las rodillas.',
      'Inclina el torso llevando la cadera atrás, con la espalda neutra.',
      'Vuelve a la posición erguida extendiendo la cadera.',
    ],
    mistakes: [
      'Usar peso alto.',
      'Redondear la espalda.',
      'Bajar más de lo que tu flexibilidad permite.',
    ],
    breathing: 'Inhala al inclinarte y exhala al volver.',
    safety: SPINE_SAFETY,
  },

  // ─────────────────────────────── Glúteos ───────────────────────────────
  'hip-thrust': {
    steps: [
      'Apoya la parte alta de la espalda en el banco con la barra sobre la cadera.',
      'Coloca los pies firmes al ancho de cadera.',
      'Empuja con los talones hasta que el torso quede paralelo al suelo.',
      'Aprieta los glúteos arriba y baja controlado.',
    ],
    mistakes: [
      'Arquear la espalda baja arriba en lugar de extender la cadera.',
      'Colocar los pies demasiado lejos o cerca.',
      'Mirar al techo; lleva el mentón levemente al pecho.',
    ],
    breathing: 'Exhala al subir la cadera e inhala al bajarla.',
  },
  'puente-gluteo': {
    steps: [
      'Acuéstate boca arriba con las rodillas flexionadas y los pies apoyados.',
      'Empuja con los talones y sube la cadera.',
      'Forma una línea recta de las rodillas a los hombros.',
      'Aprieta los glúteos y baja despacio.',
    ],
    mistakes: [
      'Arquear la zona lumbar.',
      'Empujar con las puntas de los pies.',
      'Bajar de golpe.',
    ],
    breathing: 'Exhala al subir e inhala al bajar.',
  },
  'patada-gluteo': {
    steps: [
      'Apóyate en cuatro puntos o sujeta la polea con el tobillo.',
      'Mantén el abdomen firme.',
      'Lleva una pierna atrás y arriba extendiendo la cadera.',
      'Vuelve despacio sin apoyar la rodilla.',
    ],
    mistakes: [
      'Arquear la espalda para subir más la pierna.',
      'Rotar la cadera.',
      'Balancear la pierna con impulso.',
    ],
    breathing: 'Exhala al extender la pierna.',
  },
  'abduccion': {
    steps: [
      'Siéntate en la máquina o coloca una banda sobre las rodillas.',
      'Inclina levemente el torso al frente.',
      'Abre las rodillas hacia afuera.',
      'Vuelve despacio sin soltar la tensión.',
    ],
    mistakes: [
      'Cerrar de golpe.',
      'Hacer medio recorrido.',
      'Usar impulso del torso.',
    ],
    breathing: 'Exhala al abrir e inhala al cerrar.',
  },

  // ─────────────────────────────── Pantorrillas ───────────────────────────────
  'elevacion-talones-pie': {
    steps: [
      'Párate con la punta de los pies sobre un escalón.',
      'Baja los talones por debajo del borde.',
      'Sube sobre las puntas lo más alto posible.',
      'Sostén un segundo arriba y baja despacio.',
    ],
    mistakes: [
      'Rebotar abajo.',
      'Hacer medio recorrido.',
      'Doblar las rodillas.',
    ],
    breathing: BREATH_LIFT,
  },
  'elevacion-talones-sentado': {
    steps: [
      'Siéntate con el rodillo sobre los muslos cerca de las rodillas.',
      'Apoya las puntas de los pies en la plataforma.',
      'Sube los talones despacio.',
      'Baja hasta sentir el estiramiento.',
    ],
    mistakes: [
      'Moverte rápido.',
      'Hacer poco recorrido.',
      'Empujar con los muslos.',
    ],
    breathing: BREATH_LIFT,
  },

  // ─────────────────────────────── Core ───────────────────────────────
  'plancha': {
    steps: [
      'Apoya los antebrazos con los codos debajo de los hombros.',
      'Estira las piernas y apóyate en las puntas de los pies.',
      'Forma una línea recta de la cabeza a los talones.',
      'Aprieta el abdomen y los glúteos y sostén la posición.',
    ],
    mistakes: [
      'Hundir la cadera.',
      'Levantar la cadera en forma de pico.',
      'Mirar al frente y tensar el cuello.',
    ],
    breathing: BREATH_HOLD,
  },
  'plancha-lateral': {
    steps: [
      'Acuéstate de lado apoyado en un antebrazo, con el codo bajo el hombro.',
      'Apila los pies o adelanta el de arriba para más estabilidad.',
      'Sube la cadera hasta formar una línea recta.',
      'Sostén la posición sin dejar caer la cadera.',
    ],
    mistakes: [
      'Dejar caer la cadera.',
      'Rotar el torso hacia el suelo.',
      'Apoyar el codo lejos del hombro.',
    ],
    breathing: BREATH_HOLD,
  },
  'abdominales': {
    steps: [
      'Acuéstate boca arriba con las rodillas flexionadas.',
      'Coloca las manos al pecho o apenas detrás de las orejas.',
      'Despega los hombros del suelo acercando las costillas a la cadera.',
      'Baja despacio.',
    ],
    mistakes: [
      'Tirar del cuello con las manos.',
      'Subir con impulso.',
      'Despegar la zona lumbar del suelo.',
    ],
    breathing: 'Exhala al subir e inhala al bajar.',
  },
  'elevacion-piernas': {
    steps: [
      'Acuéstate boca arriba con las piernas estiradas.',
      'Pega la zona lumbar al suelo.',
      'Sube las piernas hasta que queden verticales.',
      'Baja despacio sin tocar el suelo.',
    ],
    mistakes: [
      'Despegar la zona lumbar al bajar.',
      'Balancear las piernas.',
      'Bajar de golpe.',
    ],
    breathing: 'Exhala al subir las piernas e inhala al bajarlas.',
  },
  'russian-twist': {
    steps: [
      'Siéntate con las rodillas flexionadas e inclina el torso atrás.',
      'Sostén un disco o balón frente al pecho.',
      'Rota el torso hacia un lado.',
      'Rota hacia el otro lado sin perder la inclinación.',
    ],
    mistakes: [
      'Mover solo los brazos sin rotar el torso.',
      'Redondear la espalda.',
      'Hacerlo con prisa.',
    ],
    breathing: 'Exhala en cada rotación.',
  },
  'mountain-climbers': {
    steps: [
      'Colócate en posición de plancha con los brazos estirados.',
      'Lleva una rodilla hacia el pecho.',
      'Cambia de pierna de forma alternada.',
      'Mantén la cadera baja y el ritmo constante.',
    ],
    mistakes: [
      'Levantar la cadera.',
      'Apoyar las manos lejos de los hombros.',
      'Perder la forma por ir muy rápido.',
    ],
    breathing: BREATH_CARDIO,
  },
  'rueda-abdominal': {
    steps: [
      'Arrodíllate y toma la rueda frente a ti.',
      'Aprieta el abdomen.',
      'Rueda hacia adelante hasta donde puedas sin arquear la espalda.',
      'Vuelve tirando con el abdomen.',
    ],
    mistakes: [
      'Arquear la zona lumbar al extender.',
      'Ir más lejos de lo que controlas.',
      'Volver con los brazos en vez del abdomen.',
    ],
    breathing: 'Inhala al rodar hacia adelante y exhala al volver.',
    safety: 'Empieza con recorridos cortos: la extensión completa exige un core muy fuerte.',
  },

  // ─────────────────────────────── Cardio ───────────────────────────────
  'burpees': {
    steps: [
      'Párate derecho.',
      'Baja y apoya las manos en el suelo.',
      'Lleva los pies atrás a posición de plancha.',
      'Regresa los pies y salta con los brazos arriba.',
    ],
    mistakes: [
      'Hundir la cadera en la plancha.',
      'Caer con las rodillas rígidas.',
      'Sacrificar la técnica por velocidad.',
    ],
    breathing: BREATH_CARDIO,
  },
  'saltar-cuerda': {
    steps: [
      'Sostén la cuerda con los codos cerca del cuerpo.',
      'Gira la cuerda con las muñecas.',
      'Salta bajo, sobre la punta de los pies.',
      'Mantén un ritmo constante.',
    ],
    mistakes: [
      'Saltar demasiado alto.',
      'Girar la cuerda con los brazos completos.',
      'Caer sobre los talones.',
    ],
    breathing: BREATH_CARDIO,
  },
  'caminadora': {
    steps: [
      'Empieza con 3 a 5 minutos a paso suave.',
      'Sube la velocidad o la inclinación de forma gradual.',
      'Camina o corre con postura erguida.',
      'Termina bajando el ritmo antes de detenerte.',
    ],
    mistakes: [
      'Sostenerte de las barandas.',
      'Mirar hacia abajo todo el tiempo.',
      'Detenerte de golpe.',
    ],
    breathing: BREATH_CARDIO,
  },
  'bicicleta': {
    steps: [
      'Ajusta el asiento a la altura de la cadera.',
      'Pedalea con una leve flexión de rodilla abajo.',
      'Mantén la espalda recta.',
      'Ajusta la resistencia de forma progresiva.',
    ],
    mistakes: [
      'Asiento demasiado bajo, que carga las rodillas.',
      'Balancear la cadera.',
      'Pedalear sin resistencia.',
    ],
    breathing: BREATH_CARDIO,
  },
  'remo-ergometro': {
    steps: [
      'Siéntate con los pies sujetos y toma el mango.',
      'Empuja primero con las piernas.',
      'Inclina levemente el torso atrás y luego tira con los brazos.',
      'Vuelve en orden inverso: brazos, torso y piernas.',
    ],
    mistakes: [
      'Tirar con los brazos antes de empujar con las piernas.',
      'Redondear la espalda.',
      'Echarse muy atrás.',
    ],
    breathing: 'Exhala en el tirón e inhala al volver.',
  },
};

export function getTutorial(exerciseId: string): ExerciseTutorial | undefined {
  return TUTORIALS[exerciseId];
}

/** Aviso general que acompaña a todas las fichas. */
export const TUTORIAL_DISCLAIMER =
  'Esta guía no reemplaza a un profesional. Si sientes dolor agudo, detente.';
