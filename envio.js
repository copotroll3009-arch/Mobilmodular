/*
 * envio.js — Manda la fila al Apps Script. Si no hay URL o falla,
 * la guarda en este dispositivo (localStorage) y permite descargarla como JSON.
 */
window.Envio = (function () {
  'use strict';
  var CLAVE = 'validacion-rutina-pendientes-v1';

  function url() {
    var u = String((window.CONFIG && window.CONFIG.URL_APPS_SCRIPT) || '').trim();
    return /^https:\/\/script\.google(usercontent)?\.com\/.+/.test(u) ? u : '';
  }

  async function enviar(fila) {
    var u = url();
    if (!u) return { ok: false, motivo: 'sin-url' };
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 20000);
    try {
      // text/plain evita la verificación CORS previa que Apps Script no soporta
      var res = await fetch(u, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tipo: 'respuesta', fila: fila }),
        signal: ctrl.signal,
        redirect: 'follow'
      });
      var texto = await res.text();
      var j = null;
      try { j = JSON.parse(texto); } catch (e) { /* no es JSON */ }
      if (j && j.ok) return { ok: true };
      if (j && j.error) return { ok: false, motivo: j.error };
      return { ok: false, motivo: 'respuesta-invalida' };
    } catch (e) {
      return { ok: false, motivo: e.name === 'AbortError' ? 'tiempo-agotado' : 'sin-conexion' };
    } finally {
      clearTimeout(t);
    }
  }

  function pendientes() {
    try { return JSON.parse(localStorage.getItem(CLAVE) || '[]'); } catch (e) { return []; }
  }

  function guardarPendiente(fila) {
    try {
      var lista = pendientes().filter(function (f) { return f.id_participante !== fila.id_participante; });
      lista.push(fila);
      localStorage.setItem(CLAVE, JSON.stringify(lista));
      return true;
    } catch (e) { return false; }
  }

  function quitarPendiente(id) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(pendientes().filter(function (f) { return f.id_participante !== id; })));
    } catch (e) { /* nada */ }
  }

  // Reintenta en segundo plano. El Apps Script ignora duplicados por id.
  async function reintentarPendientes() {
    if (!url()) return 0;
    var enviados = 0;
    var lista = pendientes();
    for (var i = 0; i < lista.length; i++) {
      var r = await enviar(lista[i]);
      if (r.ok) { quitarPendiente(lista[i].id_participante); enviados++; }
    }
    return enviados;
  }

  function descargarJSON(filas, nombre) {
    var datos = {
      proyecto: window.DATOS.proyecto.nombre,
      nota: 'Respaldo de respuestas no enviadas. Cárgalo en resultados.html con "Cargar respaldos" o pásalo a la Sheet.',
      exportado: new Date().toISOString(),
      respuestas: filas
    };
    var blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre || 'respuesta-rutina.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  return {
    url: url,
    enviar: enviar,
    pendientes: pendientes,
    guardarPendiente: guardarPendiente,
    quitarPendiente: quitarPendiente,
    reintentarPendientes: reintentarPendientes,
    descargarJSON: descargarJSON
  };
})();
