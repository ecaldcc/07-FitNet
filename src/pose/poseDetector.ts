import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
  type NormalizedLandmark,
  type Landmark,
} from '@mediapipe/tasks-vision';

// Versión debe coincidir exactamente con el paquete instalado (0.10.35)
const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';

/**
 * Variantes del modelo. `lite` prioriza fps; `full` entrega worldLandmarks
 * notablemente más estables, que es lo que alimenta el análisis 3D (ver DEC-026).
 */
const MODEL_URLS = {
  lite: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  full: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
} as const;

export type ModelVariant = keyof typeof MODEL_URLS;

let landmarker: PoseLandmarker | null = null;
let drawingUtils: DrawingUtils | null = null;
let currentVariant: ModelVariant | null = null;

/**
 * Resultado de un cuadro de detección.
 *
 * `screen` son coordenadas normalizadas de pantalla: sirven para dibujar sobre el video.
 * `world` son coordenadas métricas 3D con origen en el centro de la cadera, independientes
 * de la cámara: son las que alimentan todos los cálculos angulares y el visor 3D.
 */
export interface PoseFrame {
  screen: NormalizedLandmark[][];
  world: Landmark[][];
}

const EMPTY_FRAME: PoseFrame = { screen: [], world: [] };

export async function initPoseDetector(variant: ModelVariant = 'full'): Promise<void> {
  if (landmarker && currentVariant === variant) return;

  // Cambiar de variante exige liberar el grafo anterior: cada PoseLandmarker
  // retiene su propio backend de WASM y no se reutiliza entre modelos.
  if (landmarker) {
    landmarker.close();
    landmarker = null;
    drawingUtils = null;
  }

  const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

  landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URLS[variant],
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numPoses: 1,
  });

  currentVariant = variant;
}

export function getModelVariant(): ModelVariant | null {
  return currentVariant;
}

export function detectAndDraw(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  timestampMs: number,
  drawSkeleton = true
): PoseFrame {
  if (!landmarker || video.readyState < 2) return EMPTY_FRAME;

  const ctx = canvas.getContext('2d');
  if (!ctx) return EMPTY_FRAME;

  // Sincronizar dimensiones internas del canvas con el stream real
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const result = landmarker.detectForVideo(video, timestampMs);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (drawSkeleton) {
    if (!drawingUtils) drawingUtils = new DrawingUtils(ctx);

    for (const landmarks of result.landmarks) {
      drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 2,
      });
      drawingUtils.drawLandmarks(landmarks, {
        color: '#FF3333',
        lineWidth: 1,
        radius: 3,
      });
    }
  }

  return { screen: result.landmarks, world: result.worldLandmarks };
}
