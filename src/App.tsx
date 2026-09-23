import { useState } from 'react';
import { Navigate, RouterProvider, createHashRouter } from 'react-router-dom';
import { CameraView } from './ui/CameraView';
import { AppShell } from './ui/AppShell';
import { HomeScreen } from './ui/screens/HomeScreen';
import { RoutinesScreen } from './ui/screens/RoutinesScreen';
import { RoutineEditorScreen } from './ui/screens/RoutineEditorScreen';
import { ProfileScreen } from './ui/screens/ProfileScreen';
import { ExerciseLibraryScreen } from './ui/screens/ExerciseLibraryScreen';
import { ExerciseTutorialScreen } from './ui/screens/ExerciseTutorialScreen';
import { ManualWorkoutScreen } from './ui/screens/ManualWorkoutScreen';
import { OnboardingFlow } from './ui/Onboarding/OnboardingFlow';
import { RoutinesProvider } from './routines/RoutinesProvider';

const ONBOARDING_KEY = 'ob_complete_v1';

/**
 * Rutas de la app.
 *
 * Enrutado por fragmento (`#/rutinas`): el documento servido es siempre `index.html`,
 * así que no hacen falta reglas de reescritura en el hosting y la navegación funciona
 * con la PWA instalada y sin red (DEC-032).
 *
 * Se usa el enrutador de datos (`createHashRouter`) y no el componente `HashRouter`
 * porque solo el primero permite `useBlocker`, con el que el editor de rutinas pregunta
 * antes de descartar cambios sin guardar, incluido el gesto de volver de Android (DEC-042).
 */
const router = createHashRouter([
  // Pantallas de tarea que ocupan todo el alto: van fuera del contenedor con barra de
  // navegación. En medio de una serie o de la edición de una rutina solo distraería.
  { path: '/entrenar', element: <CameraView /> },
  { path: '/manual', element: <ManualWorkoutScreen /> },
  { path: '/rutinas/nueva', element: <RoutineEditorScreen isNew /> },
  { path: '/rutinas/:routineId', element: <RoutineEditorScreen /> },
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomeScreen /> },
      { path: '/rutinas', element: <RoutinesScreen /> },
      { path: '/ejercicios', element: <ExerciseLibraryScreen /> },
      { path: '/ejercicio/:exerciseId', element: <ExerciseTutorialScreen /> },
      { path: '/perfil', element: <ProfileScreen /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

function App() {
  const [ready, setReady] = useState(() => {
    try { return localStorage.getItem(ONBOARDING_KEY) === '1'; } catch { return false; }
  });

  const handleComplete = () => {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch { /* storage bloqueado o en modo privado */ }
    setReady(true);
  };

  if (!ready) return <OnboardingFlow onComplete={handleComplete} />;

  return (
    <RoutinesProvider>
      <RouterProvider router={router} />
    </RoutinesProvider>
  );
}

export default App;
