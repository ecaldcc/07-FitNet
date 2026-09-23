// Banco de pruebas del motor de análisis y del modo manual (ver DEC-038).
//
// Corre sin cámara, sin navegador y sin dependencias nuevas: compila los módulos puros
// con el TypeScript del proyecto y los alimenta con movimientos sintéticos generados por
// cinemática directa, los mismos que usan las demos del tutorial.
//
// Uso:  npm run test:motor
//
// Qué verifica:
//  - Que la técnica correcta cuente a 15, 30 y 60 cuadros por segundo.
//  - Que el temblor de MediaPipe (8 y 15 mm) no rompa el conteo.
//  - Que un ritmo rápido pero controlado cuente, y un tirón brusco no.
//  - Que un recorrido parcial no cuente.
//  - Que la fatiga se detecte cuando la fase de esfuerzo se hace más lenta.
//  - Que el reductor del modo manual respete series, rondas de método y descansos.
//
// Lo que NO verifica: la calidad de los landmarks reales ni el comportamiento con una
// persona frente a la cámara. Eso solo se prueba en celular (sección 10 del CLAUDE.md).

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'node_modules', '.cache', 'pruebas-motor');
const require = createRequire(import.meta.url);

// ── Compilación ──
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
try {
  execFileSync(process.execPath, [
    tsc, '--ignoreConfig',
    join(root, 'src/exercises/demoPoses.ts'),
    join(root, 'src/pose/landmarkFilter.ts'),
    join(root, 'src/routines/manualWorkout.ts'),
    '--outDir', out, '--rootDir', join(root, 'src'),
    '--module', 'commonjs', '--moduleResolution', 'node10', '--ignoreDeprecations', '6.0',
    '--target', 'es2022', '--skipLibCheck', '--esModuleInterop',
  ], { stdio: 'pipe' });
} catch (err) {
  // tsc sale con código distinto de cero ante avisos de configuración aunque emita
  // el JavaScript igual; solo se aborta si de verdad no hay salida.
  try { require.resolve(join(out, 'exercises/demoPoses.js')); }
  catch { console.error(String(err.stdout ?? err)); process.exit(1); }
}

const load = p => require(join(out, p));
const { DEMOS, sampleDemo } = load('exercises/demoPoses.js');
const { SquatTracker } = load('exercises/squat.js');
const { BicepCurlTracker } = load('exercises/bicepCurl.js');
const { ShoulderPressTracker } = load('exercises/shoulderPress.js');
const { LandmarkSmoother } = load('pose/landmarkFilter.js');
const { buildPlan, initialState, workoutReducer, REST_PAUSE_MS } = load('routines/manualWorkout.js');

const results = [];
const check = (group, name, ok, detail = '') => results.push({ group, name, ok: !!ok, detail });

// ═══════════════════════════════ Motor de análisis ═══════════════════════════════

const MAKERS = {
  sentadilla: () => new SquatTracker(),
  'curl-biceps': () => new BicepCurlTracker(),
  'press-hombro': () => new ShoulderPressTracker(),
};

// Ruido gaussiano con semilla fija: los resultados son reproducibles entre corridas.
let seed = 42;
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
const jitter = (world, sigma) => !sigma ? world
  : world.map(p => ({ ...p, x: p.x + gauss() * sigma, y: p.y + gauss() * sigma, z: p.z + gauss() * sigma }));

/**
 * Reproduce `cycles` repeticiones de la demo y devuelve lo que contó el tracker.
 * speed multiplica la duración del ciclo; pMax limita el recorrido; slowdown alarga
 * la fase de esfuerzo en cada ciclo para simular fatiga.
 */
function run(id, { fps = 60, cycles = 5, speed = 1, pMax = 1, noise = 0, slowdown = 0 } = {}) {
  const def = DEMOS[id];
  const tracker = MAKERS[id]();
  // Igual que la app real: los landmarks pasan por el filtro antes de llegar al tracker.
  const smoother = new LandmarkSmoother();
  const rejections = new Set();
  let res, t = 0;

  for (let c = 0; c < cycles; c++) {
    const phases = def.phases.map((ph, i) => {
      const isEffort = id === 'sentadilla' ? i === 3 : i === 1;
      return {
        ...ph,
        durationMs: ph.durationMs * speed * (isEffort ? 1 + slowdown * c : 1),
        from: ph.from * pMax,
        to: ph.to * pMax,
      };
    });
    const cycleMs = phases.reduce((a, p) => a + p.durationMs, 0);
    const local = { ...def, phases };
    const frames = Math.round(cycleMs / (1000 / fps));
    for (let f = 0; f < frames; f++) {
      const { p } = sampleDemo(local, f * (1000 / fps));
      res = tracker.update(smoother.smooth(jitter(def.pose(p), noise), t), t);
      if (res.rejectionMessage) rejections.add(res.rejectionMessage);
      t += 1000 / fps;
    }
  }
  for (let f = 0; f < 30; f++) {
    res = tracker.update(smoother.smooth(jitter(def.pose(0), noise), t), t);
    if (res.rejectionMessage) rejections.add(res.rejectionMessage);
    t += 1000 / fps;
  }
  return { reps: res.reps, rejections: [...rejections], fatigue: res.fatigue };
}

const why = r => `reps ${r.reps}${r.rejections.length ? ` · rechazos: ${r.rejections.join(' | ')}` : ''}`;

for (const id of Object.keys(MAKERS)) {
  for (const fps of [15, 30, 60]) {
    const r = run(id, { fps });
    check(id, `técnica correcta a ${fps} fps cuenta 5`, r.reps === 5 && r.rejections.length === 0, why(r));
  }
  for (const mm of [8, 15]) {
    const r = run(id, { fps: 30, noise: mm / 1000 });
    check(id, `con temblor de ${mm} mm cuenta 5`, r.reps === 5, why(r));
  }
  const brisk = run(id, { fps: 30, speed: 0.4 });
  check(id, 'ritmo rápido pero controlado cuenta 5', brisk.reps === 5, why(brisk));

  const jerk = run(id, { fps: 30, speed: 0.12 });
  check(id, 'tirón brusco no cuenta', jerk.reps === 0, why(jerk));

  const partial = run(id, { fps: 30, pMax: 0.3 });
  check(id, 'recorrido parcial no cuenta', partial.reps === 0, why(partial));

  const tired = run(id, { fps: 30, cycles: 8, slowdown: 0.22 });
  check(id, 'subida cada vez más lenta eleva la fatiga',
    tired.reps >= 6 && tired.fatigue.level !== 'fresh',
    `fatiga ${tired.fatigue.level} (${tired.fatigue.score}), caída de velocidad ${tired.fatigue.velocityDropPercent}%`);
}

// ═══════════════════════════════ Modo manual ═══════════════════════════════

const entry = over => ({
  entryId: 'e', exerciseId: 'x', difficulty: 'medio', sets: 3, reps: 10,
  holdSeconds: 30, restSeconds: 60, method: 'normal', methodRounds: 2, ...over,
});
function play(over, timed, steps) {
  const plan = buildPlan(entry(over), timed);
  const reduce = workoutReducer(plan);
  return steps.reduce((s, a) => reduce(s, a), initialState(plan));
}
const reps = n => Array.from({ length: n }, () => ({ type: 'increment' }));
const M = 'modo manual';

{
  const s = play({}, false, [
    ...reps(10), { type: 'finishRound', now: 1 }, { type: 'restDone' },
    ...reps(9), { type: 'finishRound', now: 2 }, { type: 'restDone' },
    ...reps(8), { type: 'finishRound', now: 3 },
  ]);
  check(M, 'series normales se registran con sus repeticiones',
    s.mode === 'done' && s.completed.map(c => c.reps).join() === '10,9,8', s.completed.map(c => c.reps).join());
}
{
  const s = play({}, false, [...reps(10), { type: 'finishRound', now: 5000 }]);
  check(M, 'tras una serie empieza el descanso configurado', s.mode === 'rest' && s.restEndsAt === 65000);
}
{
  const s = play({ method: 'rest_pause', sets: 1 }, false, [
    ...reps(10), { type: 'finishRound', now: 0 }, { type: 'restDone' },
    ...reps(3), { type: 'finishRound', now: 1 }, { type: 'restDone' },
    ...reps(2), { type: 'finishRound', now: 2 },
  ]);
  check(M, 'rest-pause suma principal y mini-series en una sola serie',
    s.mode === 'done' && s.completed.length === 1 && s.completed[0].reps === 15);
}
{
  const s = play({ method: 'rest_pause' }, false, [...reps(10), { type: 'finishRound', now: 1000 }]);
  check(M, 'rest-pause descansa 15 s entre mini-series',
    s.mode === 'rest' && s.restEndsAt === 1000 + REST_PAUSE_MS);
}
{
  const s = play({ method: 'dropset' }, false, [...reps(8), { type: 'finishRound', now: 0 }]);
  check(M, 'dropset sigue sin descanso e indica bajar la carga',
    s.mode === 'work' && s.round === 1 && /Baja la carga/.test(s.banner ?? ''));
}
{
  const s = play({ method: 'superset' }, false, [...reps(10), { type: 'finishRound', now: 0 }]);
  check(M, 'superserie pasa al ejercicio pareado sin descanso',
    s.mode === 'work' && s.setNumber === 2 && /pareado/.test(s.banner ?? ''));
}
{
  const s = play({ sets: 1 }, true, [
    { type: 'startTimer', now: 0 }, { type: 'pauseTimer', now: 10000 },
    { type: 'startTimer', now: 50000 }, { type: 'finishRound', now: 70000 },
  ]);
  check(M, 'temporizador descuenta bien con pausa y reanudación',
    s.mode === 'done' && s.completed[0].seconds === 30, JSON.stringify(s.completed[0]));
}
{
  const s = play({}, false, [
    ...reps(10), { type: 'finishRound', now: 0 }, { type: 'restDone' },
    ...reps(4), { type: 'finishEarly', now: 9 },
  ]);
  check(M, 'terminar antes conserva la serie a medias', s.completed.map(c => c.reps).join() === '10,4');
}
{
  const s = play({}, false, [{ type: 'finishEarly', now: 0 }]);
  check(M, 'terminar sin hacer nada no inventa series', s.mode === 'done' && s.completed.length === 0);
}
{
  const s = play({}, false, [...reps(10), { type: 'finishRound', now: 0 }, ...reps(5)]);
  check(M, 'durante el descanso los toques no suman', s.mode === 'rest' && s.count === 0);
}

// ═══════════════════════════════ Reporte ═══════════════════════════════

let failures = 0;
let lastGroup = '';
for (const r of results) {
  if (r.group !== lastGroup) { console.log(`\n${r.group}`); lastGroup = r.group; }
  if (!r.ok) failures++;
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}${!r.ok && r.detail ? `  →  ${r.detail}` : ''}`);
}
console.log(`\n${results.length - failures} de ${results.length} pruebas pasan`);
process.exit(failures ? 1 : 0);
