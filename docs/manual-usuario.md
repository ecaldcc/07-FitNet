# Manual de Usuario — Entrenador IA

**Universidad Mariano Gálvez de Guatemala**  
Facultad de Ingeniería en Sistemas de Información  
Curso: Inteligencia Artificial — IA26

**Versión de la aplicación:** 1.0  
**Fecha:** Mayo 2026  
**URL de la aplicación:** _(enlace de Vercel)_

---

## Tabla de contenido

1. [Introducción](#1-introducción)
2. [Requisitos del dispositivo](#2-requisitos-del-dispositivo)
3. [Acceso e instalación](#3-acceso-e-instalación)
   - 3.1 [Abrir desde el navegador](#31-abrir-desde-el-navegador)
   - 3.2 [Instalar como aplicación (PWA) en Android](#32-instalar-como-aplicación-pwa-en-android)
   - 3.3 [Instalar como aplicación (PWA) en iOS](#33-instalar-como-aplicación-pwa-en-ios)
4. [Primera vez: flujo de bienvenida](#4-primera-vez-flujo-de-bienvenida)
   - 4.1 [Pantalla de carga (Splash)](#41-pantalla-de-carga-splash)
   - 4.2 [Pantalla "Cómo funciona"](#42-pantalla-cómo-funciona)
   - 4.3 [Pantalla de permisos](#43-pantalla-de-permisos)
   - 4.4 [Pantalla de inicio](#44-pantalla-de-inicio)
5. [Interfaz principal](#5-interfaz-principal)
   - 5.1 [Vista de cámara y esqueleto](#51-vista-de-cámara-y-esqueleto)
   - 5.2 [Barra de retroalimentación](#52-barra-de-retroalimentación)
   - 5.3 [Selector de ejercicio](#53-selector-de-ejercicio)
   - 5.4 [Botón de cambio de cámara](#54-botón-de-cambio-de-cámara)
6. [Ejercicios disponibles](#6-ejercicios-disponibles)
   - 6.1 [Sentadilla](#61-sentadilla)
   - 6.2 [Curl de Bíceps](#62-curl-de-bíceps)
   - 6.3 [Press de Hombro](#63-press-de-hombro)
7. [Sistema de retroalimentación](#7-sistema-de-retroalimentación)
   - 7.1 [Retroalimentación visual](#71-retroalimentación-visual)
   - 7.2 [Retroalimentación de voz](#72-retroalimentación-de-voz)
8. [Cambiar de ejercicio](#8-cambiar-de-ejercicio)
9. [Cambiar de cámara durante el entrenamiento](#9-cambiar-de-cámara-durante-el-entrenamiento)
10. [Solución de problemas](#10-solución-de-problemas)
11. [Preguntas frecuentes](#11-preguntas-frecuentes)

---

## 1. Introducción

**Entrenador IA** es una aplicación web progresiva (PWA) gratuita que utiliza la cámara de tu celular para analizar tu postura corporal en tiempo real. Mediante el modelo de inteligencia artificial **MediaPipe Pose** de Google, la aplicación detecta 33 puntos clave de tu cuerpo en cada fotograma y calcula los ángulos de tus articulaciones para evaluar la calidad de tus ejercicios.

La aplicación:
- Cuenta repeticiones automáticamente.
- Emite retroalimentación visual en colores (verde, amarillo, rojo) según tu técnica.
- Habla en voz alta para guiarte sin que tengas que mirar la pantalla.
- Funciona completamente en tu dispositivo: el video de tu cámara **nunca sale de tu celular**.
- No requiere cuenta de usuario, suscripción ni conexión permanente a internet.

> **¿Qué necesito?** Un teléfono inteligente con cámara, navegador moderno y buena iluminación.

---

## 2. Requisitos del dispositivo

| Requisito | Detalle |
|---|---|
| **Sistema operativo** | Android 9 o superior / iOS 14.5 o superior |
| **Navegador** | Chrome 90+ (Android) · Safari 15+ (iOS) · Firefox 90+ |
| **Cámara** | Cámara trasera o frontal funcional |
| **Conexión** | Necesaria solo la primera vez para descargar el modelo de IA (~8 MB) |
| **Iluminación** | Ambiente bien iluminado (luz natural o artificial uniforme) |
| **Espacio** | Área libre donde el cuerpo completo sea visible desde la cintura hasta los pies |

> **Nota:** La aplicación no es compatible con navegadores privados o sin cookies en iOS, ya que requiere almacenamiento local para recordar tu configuración.

---

## 3. Acceso e instalación

### 3.1 Abrir desde el navegador

1. Abre el navegador de tu celular (Chrome en Android, Safari en iOS).
2. Escribe o pega la URL de la aplicación: `_(enlace de Vercel)_`
3. La aplicación carga directamente, sin necesidad de instalación previa.

---

### 3.2 Instalar como aplicación (PWA) en Android

Instalar la app te permite abrirla desde tu pantalla de inicio como cualquier otra aplicación, en pantalla completa y sin barra del navegador.

**[ CAPTURA DE PANTALLA: menú "Instalar aplicación" o "Añadir a pantalla de inicio" en Chrome Android ]**

1. Abre la app en **Chrome** en tu teléfono Android.
2. Toca el ícono de **tres puntos** (⋮) en la esquina superior derecha del navegador.
3. Selecciona **"Instalar aplicación"** o **"Añadir a pantalla de inicio"**.
4. En el diálogo que aparece, toca **"Instalar"**.
5. El ícono de Entrenador IA aparecerá en tu pantalla de inicio.

---

### 3.3 Instalar como aplicación (PWA) en iOS

**[ CAPTURA DE PANTALLA: menú Compartir de Safari con opción "Agregar a pantalla de inicio" en iOS ]**

1. Abre la app en **Safari** en tu iPhone o iPad.
2. Toca el botón **Compartir** (el ícono de caja con flecha hacia arriba, en la barra inferior del navegador).
3. Desplázate hacia abajo en el menú y toca **"Agregar a pantalla de inicio"**.
4. Cambia el nombre si lo deseas y toca **"Agregar"** en la esquina superior derecha.
5. El ícono de Entrenador IA aparecerá en tu pantalla de inicio.

> **Importante para iOS:** Siempre abre la app desde Safari la primera vez. Una vez instalada, ábrela desde su ícono en la pantalla de inicio.

---

## 4. Primera vez: flujo de bienvenida

La primera vez que abres la aplicación, un flujo de cuatro pantallas te guía para configurarla correctamente. Este flujo **solo aparece una vez**; en las siguientes aperturas irás directamente a la cámara.

---

### 4.1 Pantalla de carga (Splash)

**[ CAPTURA DE PANTALLA: pantalla de splash con logo "Entrenador IA" y loader de puntos ]**

Al abrir la app, aparece una pantalla con el logotipo de **Entrenador IA** y una animación de carga. Esta pantalla avanza automáticamente después de aproximadamente 3 segundos, no requiere ninguna acción de tu parte.

---

### 4.2 Pantalla "Cómo funciona"

**[ CAPTURA DE PANTALLA: pantalla "Tu cuerpo, analizado en tiempo real" con los tres pasos ]**

Esta pantalla explica el funcionamiento básico de la aplicación en tres pasos:

| Paso | Descripción |
|---|---|
| **1. Apunta tu cámara** | Posiciona tu cuerpo completo en el encuadre y empieza el ejercicio. |
| **2. Detectamos tu pose** | La IA analiza ángulos articulares en cada fotograma, sin enviar datos a ningún servidor. |
| **3. Mejora tu técnica** | Feedback visual en verde, amarillo o rojo según tu forma. Conteo automático de repeticiones. |

Toca **"Continuar"** para avanzar a la siguiente pantalla.

---

### 4.3 Pantalla de permisos

**[ CAPTURA DE PANTALLA: pantalla de permisos con tarjetas de Cámara y Notificaciones ]**

La aplicación solicita dos permisos:

| Permiso | Tipo | Para qué se usa |
|---|---|---|
| **Cámara** | Requerido | Detectar tu cuerpo y calcular ángulos articulares en tiempo real. |
| **Notificaciones** | Opcional | Recordatorios de entrenamiento y resumen de sesión al finalizar. |

Al tocar **"Dar permisos y continuar"**, el navegador mostrará el diálogo nativo de permisos de cámara.

**[ CAPTURA DE PANTALLA: diálogo nativo del navegador solicitando permiso de cámara ]**

- Toca **"Permitir"** para habilitar la cámara.
- Si tocas **"Denegar"**, la aplicación no podrá detectar tu pose. Puedes cambiar este permiso más tarde desde la configuración de tu navegador (ver sección [10. Solución de problemas](#10-solución-de-problemas)).

> **Privacidad:** Todo el procesamiento ocurre en tu dispositivo. El video de tu cámara nunca se envía a ningún servidor.

---

### 4.4 Pantalla de inicio

**[ CAPTURA DE PANTALLA: pantalla "¡Empecemos a entrenar!" con selector de cámara trasera/frontal ]**

Esta pantalla te permite elegir la cámara con la que vas a entrenar:

| Opción | Cuándo usarla |
|---|---|
| **Trasera** (recomendada) | Cuando apoyás el celular frente a ti: en una silla, una repisa o un soporte. Ofrece mayor campo visual y mejor calidad de imagen. |
| **Frontal** | Cuando sostenés el celular en la mano o lo apoyás sobre una superficie elevada con la pantalla hacia ti. Útil para ejercicios de brazos desde cerca. |

> Podés cambiar de cámara en cualquier momento mientras entrenás, sin necesidad de reiniciar la app.

Toca **"Comenzar a entrenar"** para entrar a la pantalla principal.

> **Nota técnica:** Este botón también desbloquea la función de voz en iOS Safari, que requiere una acción previa del usuario para emitir audio.

---

## 5. Interfaz principal

Una vez completado el onboarding, verás la pantalla principal de entrenamiento.

**[ CAPTURA DE PANTALLA ANOTADA: pantalla principal con (A) video cámara, (B) esqueleto superpuesto, (C) barra de feedback, (D) chips de ejercicio, (E) botón de cámara ]**

La interfaz tiene cinco elementos:

| Elemento | Descripción |
|---|---|
| **(A) Video de cámara** | Muestra en tiempo real la imagen de tu cámara. |
| **(B) Esqueleto superpuesto** | Líneas verdes y puntos amarillos que muestran los 33 puntos corporales detectados. |
| **(C) Barra de retroalimentación** | Mensaje de calidad de ejecución + contador de repeticiones, fija en la parte inferior. |
| **(D) Chips de ejercicio** | Selector deslizable para cambiar entre los tres ejercicios disponibles. |
| **(E) Botón de cámara** | Alterna entre cámara trasera y frontal. |

---

### 5.1 Vista de cámara y esqueleto

**[ CAPTURA DE PANTALLA: cámara activa con esqueleto de MediaPipe visible sobre el cuerpo del usuario ]**

Cuando la aplicación está activa y detecta tu cuerpo:

- Aparecen **líneas verdes** que conectan las articulaciones detectadas (esqueleto).
- Aparecen **puntos rojos/amarillos** en cada una de las 33 articulaciones detectadas.

Si la detección no es correcta (iluminación deficiente, cuerpo fuera de encuadre), el esqueleto puede aparecer distorsionado o desaparecer. En ese caso, la barra inferior mostrará: _"Asegúrate de que tu cuerpo completo sea visible"_.

> **Consejo:** Mantén al menos 1.5 metros de distancia entre la cámara y tu cuerpo para que las articulaciones principales sean visibles.

---

### 5.2 Barra de retroalimentación

**[ CAPTURA DE PANTALLA: barra de retroalimentación en estado verde con mensaje e "¡Excelente profundidad!" y contador "3 REPS" ]**

La barra inferior de la pantalla siempre visible contiene:

- **Mensaje de texto:** instrucción o evaluación de la ejecución actual.
- **Contador de repeticiones:** número grande que se anima con cada nueva repetición completada.
- **Borde izquierdo colorido:** indica el nivel de calidad de la ejecución (ver sección [7. Sistema de retroalimentación](#7-sistema-de-retroalimentación)).

---

### 5.3 Selector de ejercicio

**[ CAPTURA DE PANTALLA: chips de ejercicio en la barra inferior con "Sentadillas" activo (chip destacado) ]**

En la parte inferior de la pantalla hay tres chips deslizables, uno por ejercicio:

| Chip | Ejercicio |
|---|---|
| Ícono de persona en cuclillas | **Sentadillas** |
| Ícono de barra con discos | **Curl de Bíceps** |
| Ícono de persona con brazos levantados | **Press de Hombro** |

- El chip del ejercicio activo aparece **resaltado** (fondo blanco, texto oscuro).
- Los chips inactivos aparecen con fondo semitransparente.
- Si los chips no caben en la pantalla, podés **deslizar horizontalmente** para ver todos.

---

### 5.4 Botón de cambio de cámara

**[ CAPTURA DE PANTALLA: botón de cámara en esquina de la barra de controles ]**

El botón circular con el ícono de cámara con flechas alterna entre la cámara **trasera** y la cámara **frontal**. Durante el cambio, aparece brevemente el mensaje _"Cambiando cámara..."_ mientras el hardware del dispositivo libera la cámara anterior y activa la nueva.

---

## 6. Ejercicios disponibles

### 6.1 Sentadilla

**[ CAPTURA DE PANTALLA: ejercicio de sentadilla con chip "Sentadillas" activo y retroalimentación verde "¡Excelente profundidad!" ]**

#### Configuración de la cámara

- **Posición recomendada:** Cámara trasera colocada a la altura de la cadera, apuntando lateralmente o en ángulo de 45°. La cámara de frente también funciona, pero la vista lateral permite una mejor evaluación de la profundidad.
- **Distancia:** Al menos 1.5–2 metros entre la cámara y tu cuerpo para que caderas, rodillas y tobillos sean visibles simultáneamente.
- **Articulaciones que monitorea:** Caderas, rodillas y tobillos de ambas piernas.

#### Cómo ejecutar la sentadilla

**[ CAPTURA DE PANTALLA: posición inicial de pie con barra inferior en estado idle "Listo — baja para la sentadilla" ]**

1. Colócate frente a la cámara con el cuerpo completo visible.
2. Párate erguido. La barra inferior mostrará: _"Listo — baja para la sentadilla"_ (indicador inactivo, color blanco semitransparente).
3. Baja despacio doblando las rodillas, como si fueras a sentarte.
4. Desciende hasta que el ángulo de tus rodillas sea menor a 100°.

**[ CAPTURA DE PANTALLA: posición de bajada con barra amarilla "Baja un poco más" ]**

5. Si la barra muestra _"Baja un poco más"_ (amarillo), sigue bajando para lograr mayor profundidad.

**[ CAPTURA DE PANTALLA: posición de profundidad óptima con barra verde "¡Excelente profundidad!" ]**

6. Cuando alcanzás muslos paralelos al suelo (ángulo ≤ 90°), la barra cambia a verde: _"¡Excelente profundidad!"_.
7. Sube hasta la posición inicial. La repetición se contabiliza en ese momento.
8. La voz anuncia el número de la repetición completada.

#### Tabla de retroalimentación

| Estado | Color | Mensaje | Significado |
|---|---|---|---|
| De pie, listo | Blanco | "Listo — baja para la sentadilla" | Posición inicial correcta |
| Bajando, profundidad insuficiente | Amarillo | "Baja un poco más" | Ángulo de rodilla entre 90° y 100° |
| Bajando, profundidad óptima | Verde | "¡Excelente profundidad!" | Ángulo de rodilla ≤ 90° |
| Cuerpo fuera de encuadre | Blanco | "Asegúrate de que tu cuerpo completo sea visible" | Articulaciones no detectadas |

#### Consejos de posición

- Mantén la espalda recta y el pecho hacia adelante.
- Las rodillas deben seguir la dirección de los pies, sin colapsar hacia adentro.
- Los pies separados al ancho de los hombros o un poco más.

---

### 6.2 Curl de Bíceps

**[ CAPTURA DE PANTALLA: ejercicio de curl con chip "Curl de Bíceps" activo ]**

#### Configuración de la cámara

La aplicación detecta automáticamente la vista desde la que estás entrenando:

| Vista | Configuración | Cuándo usarla |
|---|---|---|
| **Frontal** | Cámara apuntando de frente a tu cuerpo | Curl con barra o mancuernas bilaterales |
| **Lateral** | Cámara apuntando al costado de tu cuerpo | Curl con mancuerna unilateral; la app detecta automáticamente qué brazo usar |

- **Distancia:** Al menos 1 metro para que hombros, codos y muñecas sean visibles.
- **Articulaciones que monitorea:** Hombros, codos y muñecas de ambos brazos.

#### Cómo ejecutar el curl de bíceps

**[ CAPTURA DE PANTALLA: posición inicial con brazos extendidos y barra idle "Listo — sube el peso" ]**

1. Párate erguido con los brazos extendidos hacia abajo, sosteniendo el peso (barra, mancuernas o banda elástica).
2. La barra inferior mostrará: _"Listo — sube el peso"_.
3. Dobla los codos levantando el peso hacia tus hombros.

**[ CAPTURA DE PANTALLA: posición de máxima contracción con barra verde "¡Contracción completa!" ]**

4. Cuando el ángulo del codo llega a menos de 50°, la barra muestra _"¡Contracción completa!"_ (verde).
5. Si la barra muestra _"Sube un poco más"_ (amarillo), el ángulo del codo está entre 50° y 60°.
6. Baja el peso controladamente hasta extender completamente el brazo. La repetición se registra en ese momento.

#### Modos de uso

**Mancuernas bilaterales (ambos brazos simultáneamente):**

**[ CAPTURA DE PANTALLA: curl bilateral con ambos brazos visibles de frente ]**

- Ambos brazos se procesan en paralelo.
- La repetición se contabiliza cuando **cualquiera** de los dos brazos completa el ciclo.
- Un mecanismo de cooldown de ~250 ms evita que el segundo brazo genere una repetición doble.

**Mancuernas alternas (un brazo por vez):**

**[ CAPTURA DE PANTALLA: curl alterno con un brazo en contracción ]**

- La aplicación detecta y monitorea ambos brazos por separado.
- Cada brazo puede completar su repetición de forma independiente con más de 250 ms de diferencia.

**Vista lateral (un brazo):**

**[ CAPTURA DE PANTALLA: curl lateral con un solo brazo visible ]**

- Si la diferencia de visibilidad entre ambos brazos es significativa (uno oculto por la posición), la app detecta automáticamente que estás en vista lateral.
- Solo el brazo más visible es procesado.

#### Tabla de retroalimentación

| Estado | Color | Mensaje | Significado |
|---|---|---|---|
| Brazo extendido, listo | Blanco | "Listo — sube el peso" | Posición inicial correcta |
| Subiendo, contracción incompleta | Amarillo | "Sube un poco más" | Ángulo del codo entre 50° y 60° |
| Contracción completa | Verde | "¡Contracción completa!" | Ángulo del codo ≤ 50° |
| Brazo fuera de encuadre | Blanco | "Asegúrate de que tu brazo sea visible" | Articulaciones no detectadas |

#### Consejos de posición

- Mantén los codos pegados a los costados del torso durante todo el movimiento.
- Evita balancear el cuerpo hacia atrás para ayudarte a levantar el peso.
- El movimiento debe ser controlado tanto al subir como al bajar.

---

### 6.3 Press de Hombro

**[ CAPTURA DE PANTALLA: ejercicio de press con chip "Press de Hombro" activo ]**

#### Configuración de la cámara

- **Posición recomendada:** Cámara de frente o ligeramente de costado, a la altura del pecho o la cintura.
- **Distancia:** Al menos 1.5 metros para que hombros, codos y muñecas sean visibles por encima de la cabeza.
- **Articulaciones que monitorea:** Hombros, codos y muñecas de ambos brazos.

> **Importante:** El movimiento de press es opuesto al curl: el esfuerzo **sube** las pesas sobre la cabeza, extendiendo el codo. La app detecta este patrón automáticamente.

#### Cómo ejecutar el press de hombro

**[ CAPTURA DE PANTALLA: posición inicial con pesas a nivel de hombros y barra idle "Listo — empuja hacia arriba" ]**

1. Sostén el peso (mancuernas, barra o banda) a la altura de los hombros con los codos doblados.
2. La barra inferior mostrará: _"Listo — empuja hacia arriba"_.
3. Empuja el peso hacia arriba extendiendo los brazos sobre la cabeza.

**[ CAPTURA DE PANTALLA: pesas sobre la cabeza con barra verde "¡Extensión completa!" ]**

4. Cuando el ángulo del codo supera los 145°, la barra muestra _"¡Extensión completa!"_ (verde).
5. Si la barra muestra _"Extiende un poco más"_ (amarillo), el ángulo del codo está entre 100° y 145°.
6. Baja el peso controladamente hasta la posición inicial. La repetición se contabiliza en ese momento.

**[ CAPTURA DE PANTALLA: posición de bajada excesiva con barra roja "No bajes tanto — cuida los hombros" ]**

> **Alerta de seguridad (rojo):** Si el ángulo del codo baja de 80° (codos más bajos que los hombros con carga), la barra muestra en rojo _"No bajes tanto — cuida los hombros"_. Esta posición puede comprimir el tendón supraespinoso y causar lesión. Sube el peso inmediatamente.

#### Tabla de retroalimentación

| Estado | Color | Mensaje | Significado |
|---|---|---|---|
| Pesas a nivel de hombros, listo | Blanco | "Listo — empuja hacia arriba" | Posición inicial correcta |
| Pesas overhead, extensión incompleta | Amarillo | "Extiende un poco más" | Ángulo del codo entre 100° y 145° |
| Pesas overhead, extensión completa | Verde | "¡Extensión completa!" | Ángulo del codo ≥ 145° |
| Bajada excesiva — riesgo de lesión | Rojo | "No bajes tanto — cuida los hombros" | Ángulo del codo < 80° |
| Brazo fuera de encuadre | Blanco | "Asegúrate de que tu brazo sea visible" | Articulaciones no detectadas |

#### Consejos de posición

- La espalda baja debe estar neutral (sin arquearse hacia atrás).
- Los codos deben apuntar hacia adelante, no hacia los lados, en la posición inicial.
- Evitá hiperextender los codos al llegar arriba (no los bloquees completamente).

---

## 7. Sistema de retroalimentación

La aplicación te da retroalimentación por dos canales simultáneos: visual y auditivo.

---

### 7.1 Retroalimentación visual

**[ CAPTURA DE PANTALLA: barra de retroalimentación en los tres estados: verde, amarillo y rojo ]**

La barra inferior cambia de color según la calidad de tu ejecución:

| Color del borde | Nivel | Significado general |
|---|---|---|
| **Verde** `#30D158` | Buena forma | Ejecución técnicamente correcta |
| **Amarillo** `#FF9F0A` | Forma mejorable | Puedes ajustar para mejor resultado |
| **Rojo** `#FF375F` | Posición de riesgo | Detente o ajusta inmediatamente |
| **Blanco semitransparente** | Inactivo | Esperando inicio de movimiento o cuerpo no detectado |

El fondo de la barra usa un efecto de desenfoque (cristal esmerilado) para ser legible sobre cualquier fondo de video.

---

### 7.2 Retroalimentación de voz

La aplicación habla en español para que puedas mantener la vista en el espejo o en el entorno sin necesidad de leer la pantalla.

**Momentos en que suena la voz:**

| Evento | Lo que dice |
|---|---|
| Al completar 1 repetición | _"Una"_ |
| Al completar 5 repeticiones | _"Cinco. ¡Sigue así!"_ |
| Al completar 10, 20, 30... repeticiones | _"Diez. ¡Excelente ritmo!"_ |
| Cualquier otro número de reps | El número (ej. _"Dos"_, _"Tres"_) |
| Al llegar al fondo de la sentadilla con profundidad óptima | _"¡Excelente profundidad!"_ |
| Al llegar al fondo de la sentadilla con profundidad insuficiente | _"Baja un poco más"_ |
| Al completar rep de curl con buena contracción | _"[número de rep]. ¡Excelente contracción!"_ |
| Al completar rep de curl con contracción incompleta | _"[número de rep]. Sube un poco más"_ |
| Al completar rep de press con buena extensión | _"[número de rep]. ¡Extensión completa!"_ |
| Al completar rep de press con extensión incompleta | _"[número de rep]. Extiende un poco más"_ |

> **Consejo:** Para mejor experiencia de voz, usa auriculares o sube el volumen del dispositivo.

> **iOS Safari:** La voz funciona correctamente después de haber tocado el botón "Comenzar a entrenar" en el onboarding. Si la voz no suena, asegúrate de que el modo silencioso del iPhone no esté activado.

---

## 8. Cambiar de ejercicio

**[ CAPTURA DE PANTALLA: secuencia de tap en chip "Curl de Bíceps" con el contador reseteado a 0 ]**

Para cambiar de ejercicio en cualquier momento:

1. Toca el chip del ejercicio que deseas en la barra inferior.
2. El chip seleccionado se resalta.
3. El **contador de repeticiones se resetea a 0** automáticamente.
4. El esqueleto y la retroalimentación se adaptan al nuevo ejercicio de inmediato.

> **Importante:** Al cambiar de ejercicio se pierde el conteo acumulado del ejercicio anterior. Si necesitás anotar tus repeticiones, hacelo antes de cambiar.

---

## 9. Cambiar de cámara durante el entrenamiento

**[ CAPTURA DE PANTALLA: botón de cambio de cámara con mensaje "Cambiando cámara..." ]**

1. Toca el botón circular con el ícono de cámara en la esquina inferior derecha.
2. Aparece brevemente el mensaje _"Cambiando cámara..."_ mientras se libera la cámara anterior.
3. En 1–2 segundos, la imagen cambia a la cámara seleccionada.
4. El conteo de repeticiones **no se resetea** al cambiar de cámara.

> **Nota técnica:** El breve tiempo de espera al cambiar de cámara es normal y necesario para que el hardware del dispositivo libere el sensor de la cámara anterior. Es más notable en dispositivos de gama baja y en modo PWA instalado.

---

## 10. Solución de problemas

### La cámara no inicia o muestra un error

**[ CAPTURA DE PANTALLA: pantalla de error con mensaje "Error al iniciar la cámara" ]**

| Problema | Causa probable | Solución |
|---|---|---|
| _"Contexto no seguro: abrí la app con HTTPS"_ | Estás accediendo por HTTP en lugar de HTTPS | Usa la URL correcta que empieza con `https://` |
| _"Error al iniciar la cámara"_ genérico | Permisos denegados previamente | Ver procedimiento de permisos abajo |
| Pantalla negra sin error | Hardware de cámara ocupado por otra app | Cierra otras apps que usen la cámara y recarga la página |
| Cámara inicia pero sin esqueleto | Iluminación insuficiente | Mejora la iluminación del ambiente |

---

### Cómo habilitar los permisos de cámara si fueron denegados

**En Android (Chrome):**

**[ CAPTURA DE PANTALLA: configuración de permisos de sitio en Chrome Android ]**

1. Toca el ícono de **candado** o ⓘ en la barra de dirección del navegador.
2. Toca **"Permisos"**.
3. Activa la opción **"Cámara"**.
4. Recarga la página.

**En iOS (Safari):**

**[ CAPTURA DE PANTALLA: configuración de Safari en Ajustes de iOS ]**

1. Ve a **Ajustes** del iPhone.
2. Desplázate hacia abajo y toca **"Safari"**.
3. Toca **"Cámara"** y selecciona **"Permitir"**.
4. Regresa a Safari y recarga la página de la aplicación.

---

### El esqueleto no aparece o aparece distorsionado

**[ CAPTURA DE PANTALLA: barra con mensaje "Asegúrate de que tu cuerpo completo sea visible" ]**

| Problema | Solución |
|---|---|
| Cuerpo fuera del encuadre | Aléjate de la cámara hasta que todo el cuerpo sea visible |
| Iluminación insuficiente | Enciende más luces o acércate a una fuente de luz |
| Ropa muy holgada que oculta la silueta | Usa ropa ajustada o de colores que contrasten con el fondo |
| Fondo muy oscuro o con muchos elementos visuales | Busca una pared lisa de un solo color como fondo |
| Varias personas en el encuadre | Asegúrate de ser la única persona visible en la cámara |

---

### La voz no funciona

| Problema | Solución |
|---|---|
| Voz en silencio en iPhone | Verifica que el switch de silencio físico del iPhone esté desactivado |
| La voz habla en otro idioma | La aplicación usa la voz del sistema. Ve a Ajustes → Accesibilidad → Contenido hablado → Voces y descarga la voz de español |
| La voz no inició nunca | Asegúrate de haber tocado el botón "Comenzar a entrenar" en el onboarding (requerido por iOS Safari) |
| No se escucha aunque hay volumen | Sube el volumen multimedia del dispositivo (distinto al volumen de llamadas) |

---

### El conteo de repeticiones no es preciso

| Síntoma | Posible causa | Solución |
|---|---|---|
| Cuenta de más | Movimientos bruscos o repentinos de la cámara | Asegura bien el soporte de la cámara |
| No cuenta algunas repeticiones | Rango de movimiento incompleto | Completa el ciclo completo del ejercicio (bajada total + subida total) |
| Cuenta de menos (curl) | Vista lateral sin el brazo correcto visible | Reposiciona la cámara o usa vista frontal |

---

## 11. Preguntas frecuentes

**¿Funciona sin conexión a internet?**
Sí, una vez que hayas abierto la app por primera vez y descargado el modelo de IA (~8 MB), la aplicación funciona completamente sin conexión. La PWA instalada cachea todos los recursos necesarios.

---

**¿El video de mi cámara se envía a algún servidor?**
No. Todo el procesamiento de video ocurre en tu dispositivo. La imagen de tu cámara nunca sale de tu celular.

---

**¿Por qué la primera carga tarda más que las siguientes?**
En la primera apertura, el navegador descarga el modelo de IA de MediaPipe (~8 MB) y lo guarda en el caché del dispositivo. Las aperturas siguientes son casi instantáneas porque el modelo ya está almacenado localmente.

---

**¿Funciona en tablet o computadora?**
La aplicación está diseñada para celulares. Puede funcionar en tablet con resultados similares. En computadoras de escritorio puede abrirse en el navegador, pero la experiencia no está optimizada para ese formato y el acceso a la cámara trasera no aplica.

---

**¿El conteo se guarda entre sesiones?**
La versión actual no guarda el historial de sesiones. Cada vez que abres la app, el contador comienza en cero.

---

**¿Por qué la app me pide permiso de cámara en cada navegador?**
Los permisos de cámara son por dominio y por navegador. Si instalas la PWA desde Chrome, los permisos otorgados en Chrome se aplican también a la PWA instalada. Si intentas abrir la misma URL en otro navegador, deberás otorgar los permisos nuevamente.

---

**¿Puedo usar la app en modo oscuro?**
La interfaz de la aplicación no cambia con el modo oscuro del sistema operativo. La pantalla de la cámara tiene contraste alto para ser visible en exteriores o ambientes bien iluminados.

---

**¿Qué hago si la aplicación se congela?**
1. Cierra la pestaña o la app completamente.
2. Vuelve a abrirla.
3. Si el problema persiste, intenta limpiar el caché del navegador o reinstalar la PWA.

---

*Documento elaborado para la entrega del curso Inteligencia Artificial — IA26.*  
*Universidad Mariano Gálvez de Guatemala — Mayo 2026.*
