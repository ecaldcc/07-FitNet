import { useState } from 'react';

type FacingMode = 'environment' | 'user';

interface Props {
  onComplete: () => void;
}

export function GetStartedScreen({ onComplete }: Props) {
  const [camera, setCamera] = useState<FacingMode>('environment');

  const handleStart = () => {
    // Persiste la preferencia para que CameraView la tome como estado inicial
    localStorage.setItem('preferred_camera', camera);
    onComplete();
  };

  return (
    <div className="ob-screen ob-start">
      <p className="ob-eyebrow">Todo listo</p>

      <h1 className="ob-h1">¡Empecemos<br />a entrenar!</h1>

      {/* Ilustración pose detection */}
      <div className="ob-illus">
        <svg viewBox="0 0 300 230" fill="none" style={{ width: '100%', height: 'auto' }}>
          {/* Fondo */}
          <rect width="300" height="230" rx="24" fill="#F5F5F7" />

          {/* Líneas de escaneo */}
          {[35, 65, 95, 125, 155, 185, 215].map(y => (
            <line key={y} x1="24" y1={y} x2="276" y2={y}
              stroke="#30D158" strokeWidth="0.6" opacity="0.25" />
          ))}

          {/* Brackets de visor */}
          <path d="M24 24 L24 44 M24 24 L44 24" stroke="#30D158" strokeWidth="2" strokeLinecap="round" />
          <path d="M276 24 L276 44 M276 24 L256 24" stroke="#30D158" strokeWidth="2" strokeLinecap="round" />
          <path d="M24 206 L24 186 M24 206 L44 206" stroke="#30D158" strokeWidth="2" strokeLinecap="round" />
          <path d="M276 206 L276 186 M276 206 L256 206" stroke="#30D158" strokeWidth="2" strokeLinecap="round" />

          {/* ── Esqueleto persona ── */}
          {/* Cabeza */}
          <circle cx="150" cy="48" r="16" fill="#E5E5EA" stroke="#C7C7CC" strokeWidth="1.5" />

          {/* Cuello → hombros */}
          <line x1="150" y1="64" x2="150" y2="76" stroke="#C7C7CC" strokeWidth="3" strokeLinecap="round" />
          <line x1="112" y1="82" x2="188" y2="82" stroke="#C7C7CC" strokeWidth="3" strokeLinecap="round" />

          {/* Torso */}
          <line x1="150" y1="82" x2="150" y2="130" stroke="#C7C7CC" strokeWidth="3" strokeLinecap="round" />

          {/* Brazo izquierdo */}
          <line x1="112" y1="82" x2="92"  y2="114" stroke="#C7C7CC" strokeWidth="3" strokeLinecap="round" />
          <line x1="92"  y1="114" x2="82" y2="142" stroke="#C7C7CC" strokeWidth="3" strokeLinecap="round" />

          {/* Brazo derecho */}
          <line x1="188" y1="82"  x2="208" y2="114" stroke="#C7C7CC" strokeWidth="3" strokeLinecap="round" />
          <line x1="208" y1="114" x2="218" y2="142" stroke="#C7C7CC" strokeWidth="3" strokeLinecap="round" />

          {/* Caderas */}
          <line x1="130" y1="130" x2="170" y2="130" stroke="#C7C7CC" strokeWidth="3" strokeLinecap="round" />

          {/* Pierna izquierda */}
          <line x1="130" y1="130" x2="118" y2="172" stroke="#C7C7CC" strokeWidth="3" strokeLinecap="round" />
          <line x1="118" y1="172" x2="114" y2="210" stroke="#C7C7CC" strokeWidth="3" strokeLinecap="round" />

          {/* Pierna derecha */}
          <line x1="170" y1="130" x2="182" y2="172" stroke="#C7C7CC" strokeWidth="3" strokeLinecap="round" />
          <line x1="182" y1="172" x2="186" y2="210" stroke="#C7C7CC" strokeWidth="3" strokeLinecap="round" />

          {/* ── Puntos de landmarks ── */}
          {/* Cuello */}
          <circle cx="150" cy="75"  r="4.5" fill="#30D158" />
          {/* Hombros */}
          <circle cx="112" cy="82"  r="4.5" fill="#30D158" />
          <circle cx="188" cy="82"  r="4.5" fill="#30D158" />
          {/* Codos */}
          <circle cx="92"  cy="114" r="4"   fill="#30D158" />
          <circle cx="208" cy="114" r="4"   fill="#30D158" />
          {/* Muñecas */}
          <circle cx="82"  cy="142" r="4"   fill="#34AADC" />
          <circle cx="218" cy="142" r="4"   fill="#34AADC" />
          {/* Cadera */}
          <circle cx="150" cy="130" r="4.5" fill="#30D158" />
          <circle cx="130" cy="130" r="4"   fill="#30D158" />
          <circle cx="170" cy="130" r="4"   fill="#30D158" />
          {/* Rodillas */}
          <circle cx="118" cy="172" r="5"   fill="#FFD60A" />
          <circle cx="182" cy="172" r="5"   fill="#FFD60A" />
          {/* Tobillos */}
          <circle cx="114" cy="210" r="4"   fill="#30D158" />
          <circle cx="186" cy="210" r="4"   fill="#30D158" />

          {/* Label "33 puntos" */}
          <rect x="96" y="10" width="108" height="22" rx="11" fill="rgba(48,209,88,0.12)" />
          <text x="150" y="25" textAnchor="middle" fontSize="11" fontWeight="700"
            fill="#30D158" fontFamily="-apple-system, sans-serif">
            33 puntos corporales
          </text>
        </svg>
      </div>

      {/* Selector de cámara */}
      <div className="ob-cam-toggle">
        <button
          className={`ob-cam-btn${camera === 'environment' ? ' active' : ''}`}
          onClick={() => setCamera('environment')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="14" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8" cy="8.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="5.5" y="1" width="5" height="3" rx="1.5" fill="currentColor" />
          </svg>
          Trasera
        </button>
        <button
          className={`ob-cam-btn${camera === 'user' ? ' active' : ''}`}
          onClick={() => setCamera('user')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="14" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8" cy="8.5" r="0.8" fill="currentColor" />
            <rect x="5.5" y="1" width="5" height="3" rx="1.5" fill="currentColor" />
          </svg>
          Frontal
        </button>
      </div>

      <p className="ob-start-hint">
        Puedes cambiar de cámara en cualquier momento dentro de la app.
      </p>

      <button className="ob-btn" onClick={handleStart}>
        Comenzar a entrenar
      </button>
    </div>
  );
}
