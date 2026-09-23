import { useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
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
      {/* HashRouter y no BrowserRouter: con rutas basadas en fragmento, el documento
          servido es siempre index.html. Eso evita depender de reglas de reescritura del
          hosting y mantiene la navegación funcionando con la PWA instalada y sin red
          (ver DEC-032). */}
      <HashRouter>
        <Routes>
          {/* Las pantallas de entrenamiento ocupan todo el alto: van fuera del contenedor
              con barra de navegación, que en medio de una serie solo distraería. */}
          <Route path="/entrenar" element={<CameraView />} />
          <Route path="/manual" element={<ManualWorkoutScreen />} />

          <Route element={<AppShell />}>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/rutinas" element={<RoutinesScreen />} />
            <Route path="/rutinas/:routineId" element={<RoutineEditorScreen />} />
            <Route path="/ejercicios" element={<ExerciseLibraryScreen />} />
            <Route path="/ejercicio/:exerciseId" element={<ExerciseTutorialScreen />} />
            <Route path="/perfil" element={<ProfileScreen />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </RoutinesProvider>
  );
}

export default App;
