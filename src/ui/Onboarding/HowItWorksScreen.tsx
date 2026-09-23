interface Props {
  onNext: () => void;
}

export function HowItWorksScreen({ onNext }: Props) {
  return (
    <div className="ob-screen ob-how">
      <p className="ob-eyebrow">Cómo funciona</p>

      <h1 className="ob-h1">Tu cuerpo,<br />analizado en tiempo real</h1>

      <p className="ob-lead">
        MediaPipe detecta 33 puntos de tu cuerpo a través de la cámara
        y calcula tus ángulos articulares al instante.
      </p>

      <div className="ob-steps">
        {/* Paso 1 */}
        <div className="ob-step">
          <div className="ob-step-icon g">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="6" width="24" height="18" rx="4" stroke="#30D158" strokeWidth="2" />
              <circle cx="14" cy="15" r="4.5" stroke="#30D158" strokeWidth="2" />
              <rect x="10" y="3" width="8" height="4" rx="2" fill="#30D158" />
            </svg>
          </div>
          <div className="ob-step-body">
            <h3>Apunta tu cámara</h3>
            <p>Posiciona tu cuerpo completo en el encuadre y empieza el ejercicio.</p>
          </div>
        </div>

        {/* Paso 2 */}
        <div className="ob-step">
          <div className="ob-step-icon b">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              {/* Silueta persona */}
              <circle cx="14" cy="5" r="3" fill="#34AADC" />
              <line x1="14" y1="8" x2="14" y2="18" stroke="#34AADC" strokeWidth="2" strokeLinecap="round" />
              <line x1="14" y1="12" x2="8"  y2="16" stroke="#34AADC" strokeWidth="2" strokeLinecap="round" />
              <line x1="14" y1="12" x2="20" y2="16" stroke="#34AADC" strokeWidth="2" strokeLinecap="round" />
              <line x1="14" y1="18" x2="10" y2="25" stroke="#34AADC" strokeWidth="2" strokeLinecap="round" />
              <line x1="14" y1="18" x2="18" y2="25" stroke="#34AADC" strokeWidth="2" strokeLinecap="round" />
              {/* Dots */}
              <circle cx="8"  cy="16" r="1.8" fill="#FFD60A" />
              <circle cx="20" cy="16" r="1.8" fill="#FFD60A" />
              <circle cx="14" cy="18" r="1.8" fill="#FFD60A" />
              <circle cx="10" cy="25" r="1.8" fill="#FFD60A" />
              <circle cx="18" cy="25" r="1.8" fill="#FFD60A" />
            </svg>
          </div>
          <div className="ob-step-body">
            <h3>Detectamos tu pose</h3>
            <p>La IA analiza ángulos articulares en cada fotograma, sin enviar datos a ningún servidor.</p>
          </div>
        </div>

        {/* Paso 3 */}
        <div className="ob-step">
          <div className="ob-step-icon o">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 3L16.9 9.8L24 10.7L18.9 15.7L20.2 22.8L14 19.3L7.8 22.8L9.1 15.7L4 10.7L11.1 9.8L14 3Z"
                stroke="#FC4C02" strokeWidth="2" strokeLinejoin="round" />
              <path d="M10 14.5L12.5 17L18 11" stroke="#FC4C02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="ob-step-body">
            <h3>Mejora tu técnica</h3>
            <p>Feedback visual en verde, amarillo o rojo según tu forma. Conteo automático de repeticiones.</p>
          </div>
        </div>
      </div>

      <button className="ob-btn" onClick={onNext}>
        Continuar
      </button>
    </div>
  );
}
