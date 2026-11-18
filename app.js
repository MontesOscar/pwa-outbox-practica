let eventoInstalacionDiferido = null;

let streamActual = null;

let modoCamaraActual = 'environment';

let solicitudEnCurso = false;

const visorVideo = document.getElementById('visor-camara');
const visorVacio = document.getElementById('visor-vacio');
const mensajeEstado = document.getElementById('mensaje-estado');
const btnInstalar = document.getElementById('btn-instalar');
const btnPreparar = document.getElementById('btn-preparar-camara');
const avisoPermiso = document.getElementById('aviso-permiso');
const btnConfirmar = document.getElementById('btn-confirmar-permiso');
const btnCancelar = document.getElementById('btn-cancelar-permiso');
const btnAlternar = document.getElementById('btn-alternar-camara');
const btnApagar = document.getElementById('btn-apagar-camara');

function actualizarMensajeEstado(texto) {
  mensajeEstado.textContent = texto;
}

function esDispositivoIOS() {
  const ua = navigator.userAgent;
  const iosClasico = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const iPadModerno = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iosClasico || iPadModerno;
}

function appEstaInstalada() {
  return window.navigator.standalone === true ||
         window.matchMedia('(display-mode: standalone)').matches;
}

function actualizarControles(camaraEncendida) {
  btnAlternar.disabled = !camaraEncendida || solicitudEnCurso;
  btnApagar.disabled = !camaraEncendida || solicitudEnCurso;
  btnPreparar.hidden = camaraEncendida;
  visorVacio.hidden = camaraEncendida;
}

window.addEventListener('beforeinstallprompt', (event) => {

  event.preventDefault();
  eventoInstalacionDiferido = event;

  btnInstalar.hidden = false;
});

btnInstalar.addEventListener('click', () => {
  if (!eventoInstalacionDiferido) {
    return;
  }

  eventoInstalacionDiferido.prompt();

  eventoInstalacionDiferido.userChoice
    .then((resultado) => {
      if (resultado.outcome === 'accepted') {
        btnInstalar.hidden = true;
        actualizarMensajeEstado('¡App instalada! Ábrela desde tu pantalla de inicio.');
      } else {
        actualizarMensajeEstado('Instalación cancelada. Puedes instalarla más tarde.');
      }
    })
    .catch((error) => {
      actualizarMensajeEstado(`No se pudo completar la instalación: ${error.message}`);
    })
    .finally(() => {

      eventoInstalacionDiferido = null;
    });
});

window.addEventListener('appinstalled', () => {
  btnInstalar.hidden = true;
  eventoInstalacionDiferido = null;
});

function verificarEntornoIOS() {
  const esIOS = esDispositivoIOS();
  const estaInstalada = appEstaInstalada();

  if (esIOS && !estaInstalada) {
    const guiaIOS = document.getElementById('instrucciones-ios');
    if (guiaIOS) {
      guiaIOS.hidden = false;
    }
  }

  if (esIOS) {
    const notaPermisoIOS = document.getElementById('nota-permiso-ios');
    if (notaPermisoIOS) {
      notaPermisoIOS.hidden = false;
    }
  }
}

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Este navegador no soporta Service Workers.');
    return;
  }

  navigator.serviceWorker.register('./sw.js')
    .then((registro) => {
      console.log('Service Worker registrado. Scope:', registro.scope);
    })
    .catch((error) => {
      console.error('Error al registrar el Service Worker:', error);
    });
}

function detenerCamaraActiva() {
  if (streamActual) {
    streamActual.getTracks().forEach((track) => {
      track.stop();
    });
    streamActual = null;
  }
}

function iniciarCamara(modo) {

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    actualizarMensajeEstado('Tu navegador no permite usar la cámara. Abre la app desde HTTPS (GitHub Pages).');
    return Promise.resolve();
  }

  if (solicitudEnCurso) {
    return Promise.resolve();
  }
  solicitudEnCurso = true;
  btnAlternar.disabled = true;
  btnApagar.disabled = true;
  btnConfirmar.disabled = true;

  detenerCamaraActiva();
  visorVideo.srcObject = null;

  const restricciones = {
    video: { facingMode: modo },
    audio: false
  };

  actualizarMensajeEstado('Encendiendo cámara...');

  return navigator.mediaDevices.getUserMedia(restricciones)
    .then((stream) => {
      streamActual = stream;
      visorVideo.srcObject = stream;

      visorVideo.classList.toggle('espejo', modo === 'user');

      const reproduccion = visorVideo.play();
      if (reproduccion && typeof reproduccion.catch === 'function') {
        reproduccion.catch(() => {

        });
      }

      actualizarControles(true);
      actualizarMensajeEstado(`Cámara activa (${modo === 'environment' ? 'Trasera' : 'Frontal'})`);
    })
    .catch((error) => {
      actualizarControles(false);
      if (error.name === 'NotAllowedError') {
        actualizarMensajeEstado('Permiso denegado. Habilita el acceso a la cámara en los ajustes de tu navegador.');
      } else if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
        actualizarMensajeEstado('No se detectó el sensor de cámara solicitado en este dispositivo.');
      } else if (error.name === 'NotReadableError') {
        actualizarMensajeEstado('La cámara está ocupada por otra app o no se liberó a tiempo. Intenta de nuevo.');
      } else {
        actualizarMensajeEstado(`Error al acceder al hardware: ${error.message}`);
      }
    })
    .finally(() => {

      solicitudEnCurso = false;
      btnConfirmar.disabled = false;
      actualizarControles(streamActual !== null);
    });
}

btnPreparar.addEventListener('click', () => {
  avisoPermiso.hidden = false;
  btnPreparar.hidden = true;
  avisoPermiso.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

btnConfirmar.addEventListener('click', () => {
  avisoPermiso.hidden = true;
  iniciarCamara(modoCamaraActual);
});

btnCancelar.addEventListener('click', () => {
  avisoPermiso.hidden = true;
  btnPreparar.hidden = false;
  actualizarMensajeEstado('Acceso a cámara cancelado. No se solicitó ningún permiso.');
});

btnAlternar.addEventListener('click', () => {
  modoCamaraActual = modoCamaraActual === 'environment' ? 'user' : 'environment';

  iniciarCamara(modoCamaraActual);
});

btnApagar.addEventListener('click', () => {
  detenerCamaraActiva();
  visorVideo.srcObject = null;
  visorVideo.classList.remove('espejo');
  actualizarControles(false);
  actualizarMensajeEstado('Cámara apagada. El sensor fue liberado.');
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && streamActual) {
    detenerCamaraActiva();
    visorVideo.srcObject = null;
    actualizarControles(false);
    actualizarMensajeEstado('La cámara se apagó al salir de la app. Pulsa "Solicitar Acceso a Cámara" para volver a encenderla.');
  }
});

window.addEventListener('load', () => {
  registrarServiceWorker();
});

verificarEntornoIOS();
actualizarControles(false);

if (appEstaInstalada()) {
  btnInstalar.hidden = true;
}
