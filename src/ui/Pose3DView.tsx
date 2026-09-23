import { useEffect, useImperativeHandle, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { PoseLandmarker, type Landmark } from '@mediapipe/tasks-vision';
import { LM } from '../geometry/vectors3d';

/**
 * Visor 3D del esqueleto reconstruido a partir de `worldLandmarks` (ver DEC-029).
 *
 * No es decoración. Es la ventana que permite verificar que el análisis 3D está
 * funcionando: el esqueleto se puede rotar con el dedo, y al girarlo se ve la
 * profundidad real que el motor está midiendo y que la vista de cámara no muestra.
 * El mismo componente reproduce las demostraciones animadas del tutorial (DEC-033).
 *
 * Se actualiza por API imperativa (`update`) en lugar de props de React: el bucle de
 * detección corre a 60 fps y provocar un render de React por cuadro haría que el hilo
 * principal del celular no diera abasto.
 */

export interface Pose3DHandle {
  update(world: Landmark[], color: string): void;
}

interface Props {
  ref?: RefObject<Pose3DHandle | null>;
  className?: string;
  /** Giro inicial en radianes alrededor del eje vertical. 0 = de frente. */
  initialRotation?: number;
  /** Radianes por cuadro del giro automático. 0 lo desactiva. */
  autoRotateSpeed?: number;
}

/**
 * Escala de metros a unidades de escena.
 *
 * Con la cámara a 6.3 unidades y 50° de campo visual, la altura visible es de unas
 * 5.9 unidades. Un cuerpo de 1.75 m con los brazos arriba mide unos 2 m, que a esta
 * escala ocupan 4.3, con margen arriba y abajo. Un valor mayor corta pies o manos.
 */
const SCENE_SCALE = 2.1;
/** Altura del suelo en unidades de escena. */
const GROUND_Y = -1.95;
/**
 * Distancia por defecto de la cadera al suelo, en metros. Se usa mientras los pies
 * no son visibles, para que el esqueleto no salte cuando entran o salen del cuadro.
 */
const DEFAULT_HIP_HEIGHT = 0.92;
const JOINT_COUNT = 33;

const FOOT_INDICES = [
  LM.LEFT_ANKLE, LM.RIGHT_ANKLE, LM.LEFT_HEEL, LM.RIGHT_HEEL,
  LM.LEFT_FOOT, LM.RIGHT_FOOT,
];

export function Pose3DView({
  ref, className, initialRotation = 0, autoRotateSpeed = 0.006,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Pose3DHandle | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();

    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);

    // Encuadre para el caso más alto: brazos extendidos sobre la cabeza en el press,
    // unos 2 m de los talones a las manos. Más cerca, las manos salen del cuadro.
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0.25, 6.3);
    camera.lookAt(0, 0.25, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(2, 3, 4);
    scene.add(keyLight);

    // Grupo contenedor: rotarlo a él y no a la cámara mantiene la luz fija
    // respecto al espectador, de modo que el esqueleto no se oscurece al girar.
    const group = new THREE.Group();
    scene.add(group);

    // ── Huesos: un único LineSegments cuyos vértices se reescriben cada cuadro ──
    const connections = PoseLandmarker.POSE_CONNECTIONS;
    const boneGeometry = new THREE.BufferGeometry();
    const bonePositions = new Float32Array(connections.length * 2 * 3);
    boneGeometry.setAttribute('position', new THREE.BufferAttribute(bonePositions, 3));
    const boneMaterial = new THREE.LineBasicMaterial({ color: 0x30d158 });
    const bones = new THREE.LineSegments(boneGeometry, boneMaterial);
    group.add(bones);

    // ── Articulaciones: InstancedMesh para dibujar 33 esferas en una sola llamada ──
    const jointGeometry = new THREE.SphereGeometry(0.045, 10, 10);
    const jointMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.4, metalness: 0.1,
    });
    const joints = new THREE.InstancedMesh(jointGeometry, jointMaterial, JOINT_COUNT);
    joints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(joints);

    // Plano de suelo: da referencia visual de profundidad al rotar.
    const grid = new THREE.GridHelper(4, 8, 0x444444, 0x2a2a2a);
    grid.position.y = GROUND_Y;
    group.add(grid);

    const dummy = new THREE.Object3D();
    const points: THREE.Vector3[] = Array.from(
      { length: JOINT_COUNT }, () => new THREE.Vector3()
    );
    let hasData = false;
    // Altura de cadera suavizada: evita que el esqueleto tiemble cuando el detector
    // corrige la posición de los pies entre un cuadro y el siguiente.
    let hipHeight = DEFAULT_HIP_HEIGHT;

    // ── Rotación: arrastre del usuario más giro automático lento ──
    let rotationY = initialRotation;
    let rotationX = 0;
    let autoRotate = autoRotateSpeed > 0;
    let pointerDown = false;
    let lastX = 0;
    let lastY = 0;

    function onPointerDown(e: PointerEvent) {
      pointerDown = true;
      autoRotate = false;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!pointerDown) return;
      rotationY += (e.clientX - lastX) * 0.01;
      rotationX += (e.clientY - lastY) * 0.01;
      // Limitar el cabeceo evita que el esqueleto quede boca abajo y se pierda la referencia.
      rotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotationX));
      lastX = e.clientX;
      lastY = e.clientY;
    }
    function onPointerUp(e: PointerEvent) {
      pointerDown = false;
      if (renderer.domElement.hasPointerCapture(e.pointerId)) {
        renderer.domElement.releasePointerCapture(e.pointerId);
      }
    }
    function onDoubleClick() {
      rotationX = 0;
      rotationY = initialRotation;
      autoRotate = autoRotateSpeed > 0;
    }

    const canvasEl = renderer.domElement;
    canvasEl.style.touchAction = 'none';
    canvasEl.addEventListener('pointerdown', onPointerDown);
    canvasEl.addEventListener('pointermove', onPointerMove);
    canvasEl.addEventListener('pointerup', onPointerUp);
    canvasEl.addEventListener('pointercancel', onPointerUp);
    canvasEl.addEventListener('dblclick', onDoubleClick);

    const resizeObserver = new ResizeObserver(() => {
      if (mount.clientWidth === 0 || mount.clientHeight === 0) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    });
    resizeObserver.observe(mount);

    apiRef.current = {
      update(world: Landmark[], color: string) {
        if (world.length < JOINT_COUNT) return;

        // Anclaje al suelo. worldLandmarks tiene el origen en la cadera, así que en una
        // sentadilla real son los pies los que "suben" hacia el origen. Tomar el punto
        // más bajo de los pies visibles como suelo hace que en pantalla baje la cadera,
        // que es lo que el usuario espera ver.
        let lowestFoot = -Infinity;
        for (const i of FOOT_INDICES) {
          if ((world[i].visibility ?? 0) >= 0.5 && world[i].y > lowestFoot) {
            lowestFoot = world[i].y;
          }
        }
        const target = Number.isFinite(lowestFoot) ? lowestFoot : DEFAULT_HIP_HEIGHT;
        hipHeight += (target - hipHeight) * 0.25;

        // worldLandmarks tiene el eje Y hacia abajo; Three.js lo usa hacia arriba.
        for (let i = 0; i < JOINT_COUNT; i++) {
          points[i].set(
            world[i].x * SCENE_SCALE,
            (hipHeight - world[i].y) * SCENE_SCALE + GROUND_Y,
            -world[i].z * SCENE_SCALE
          );
        }

        for (let c = 0; c < connections.length; c++) {
          const { start, end } = connections[c];
          const o = c * 6;
          bonePositions[o + 0] = points[start].x;
          bonePositions[o + 1] = points[start].y;
          bonePositions[o + 2] = points[start].z;
          bonePositions[o + 3] = points[end].x;
          bonePositions[o + 4] = points[end].y;
          bonePositions[o + 5] = points[end].z;
        }
        boneGeometry.attributes.position.needsUpdate = true;
        boneGeometry.computeBoundingSphere();

        for (let i = 0; i < JOINT_COUNT; i++) {
          dummy.position.copy(points[i]);
          // Las articulaciones que se evalúan se dibujan más grandes que el resto.
          dummy.scale.setScalar(KEY_JOINTS.has(i) ? 1.5 : 0.85);
          dummy.updateMatrix();
          joints.setMatrixAt(i, dummy.matrix);
        }
        joints.instanceMatrix.needsUpdate = true;

        boneMaterial.color.set(color);
        hasData = true;
      },
    };

    let frameId = 0;
    function renderLoop() {
      if (autoRotate) rotationY += autoRotateSpeed;
      group.rotation.y = rotationY;
      group.rotation.x = rotationX;
      if (hasData) renderer.render(scene, camera);
      frameId = requestAnimationFrame(renderLoop);
    }
    frameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      canvasEl.removeEventListener('pointermove', onPointerMove);
      canvasEl.removeEventListener('pointerup', onPointerUp);
      canvasEl.removeEventListener('pointercancel', onPointerUp);
      canvasEl.removeEventListener('dblclick', onDoubleClick);

      // WebGL no libera memoria de GPU con el recolector de basura de JS:
      // cada geometría, material y el contexto deben descartarse a mano.
      boneGeometry.dispose();
      boneMaterial.dispose();
      jointGeometry.dispose();
      jointMaterial.dispose();
      joints.dispose();
      grid.dispose();
      renderer.dispose();
      if (canvasEl.parentNode === mount) mount.removeChild(canvasEl);
      apiRef.current = null;
    };
  }, [initialRotation, autoRotateSpeed]);

  useImperativeHandle(ref, () => ({
    update(world: Landmark[], color: string) {
      apiRef.current?.update(world, color);
    },
  }), []);

  return <div ref={mountRef} className={className} />;
}

/** Articulaciones que participan en algún cálculo angular; se resaltan en el visor. */
const KEY_JOINTS = new Set<number>([
  LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
  LM.LEFT_ELBOW, LM.RIGHT_ELBOW,
  LM.LEFT_WRIST, LM.RIGHT_WRIST,
  LM.LEFT_HIP, LM.RIGHT_HIP,
  LM.LEFT_KNEE, LM.RIGHT_KNEE,
  LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
]);
