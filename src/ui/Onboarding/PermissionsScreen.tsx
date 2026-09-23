import { requestMotionPermission } from '../../pose/deviceGravity';

interface Props {
  onNext: () => void;
}

export function PermissionsScreen({ onNext }: Props) {
  const handleContinue = async () => {
    // Sensores de movimiento primero: iOS solo concede este permiso si se pide directo
    // desde el toque, y la espera del permiso de cámara consumiría ese toque (DEC-040).
    // Se lanza sin esperar su resultado; en Android resuelve al instante sin preguntar.
    const motion = requestMotionPermission();

    // Solicita permiso de cámara con context claro para el navegador
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      // El usuario denegó o el dispositivo no tiene cámara.
      // Dejamos continuar igual — CameraView manejará el error con mensaje claro.
    }

    // Solicita permiso de notificaciones (opcional)
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    // El resultado del sensor no condiciona nada: sin él, la app mide contra la vertical
    // de la cámara como antes.
    await motion;
    onNext();
  };

  return (
    <div className="ob-screen ob-perms">
      <p className="ob-eyebrow">Permisos</p>

      <h1 className="ob-h1">Necesitamos<br />tu autorización</h1>

      <p className="ob-lead">
        Solo solicitamos lo necesario para que el entrenador funcione correctamente.
      </p>

      <div className="ob-perm-list">
        {/* Cámara */}
        <div className="ob-perm-card">
          <div className="ob-perm-ico cam">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <rect x="1" y="5" width="24" height="18" rx="4" stroke="#30D158" strokeWidth="2" />
              <circle cx="13" cy="14" r="5" stroke="#30D158" strokeWidth="2" />
              <circle cx="13" cy="14" r="2" fill="#30D158" />
              <rect x="9" y="2" width="8" height="4" rx="2" fill="#30D158" />
            </svg>
          </div>
          <div className="ob-perm-info">
            <h3>
              Cámara
              <span className="ob-badge req">Requerida</span>
            </h3>
            <p>Necesaria para detectar tu cuerpo y calcular los ángulos articulares en tiempo real.</p>
          </div>
        </div>

        {/* Sensores de movimiento */}
        <div className="ob-perm-card">
          <div className="ob-perm-ico level">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <rect x="2" y="8.5" width="22" height="9" rx="4.5" stroke="#FF9F0A" strokeWidth="2" />
              <circle cx="13" cy="13" r="2" fill="#FF9F0A" />
              <path d="M9.5 8.5v9M16.5 8.5v9" stroke="#FF9F0A" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="ob-perm-info">
            <h3>
              Sensores de movimiento
              <span className="ob-badge opt">Opcional</span>
            </h3>
            <p>Para saber si el celular está inclinado y medir tu postura contra la vertical real.</p>
          </div>
        </div>

        {/* Notificaciones */}
        <div className="ob-perm-card">
          <div className="ob-perm-ico bell">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M13 3C9.1 3 6 6.1 6 10v6l-2 3h18l-2-3v-6c0-3.9-3.1-7-7-7z"
                stroke="#34AADC" strokeWidth="2" strokeLinejoin="round" />
              <path d="M10.5 22c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5"
                stroke="#34AADC" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="ob-perm-info">
            <h3>
              Notificaciones
              <span className="ob-badge opt">Opcional</span>
            </h3>
            <p>Para recordatorios de entrenamiento y resumen de tu sesión al finalizar.</p>
          </div>
        </div>
      </div>

      {/* Nota de privacidad */}
      <p className="ob-privacy">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1L2 3v4c0 3 2.2 5.5 5 6.4C9.8 12.5 12 10 12 7V3L7 1z"
            stroke="#6e6e73" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
        Todo el procesamiento ocurre en tu dispositivo. Sin servidores.
      </p>

      <button className="ob-btn" onClick={handleContinue}>
        Dar permisos y continuar
      </button>
    </div>
  );
}
