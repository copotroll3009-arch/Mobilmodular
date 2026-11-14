/*
 * config.js — CONFIGURACIÓN. Es el único archivo que tienes que editar
 * para conectar la herramienta con tu Google Sheet.
 */
window.CONFIG = {
  // 1) Pega aquí la URL de tu Apps Script publicado (termina en /exec).
  //    Si la dejas vacía, las respuestas se guardan en el dispositivo y se ofrecen para descargar.
  URL_APPS_SCRIPT: 'https://script.google.com/macros/s/AKfycbzMBeM_4m3NJp0RoxGgTVrImy4_gfUaqGmbVAlgc22WkY7ukTx733xnauIMo97ZIhiS/exec',

  // 2) La misma clave que pusiste en CLAVE_LECTURA dentro de Codigo.gs.
  //    Solo la usa resultados.html para leer la Sheet.
  CLAVE_LECTURA: 'rutina-4ae0acab9c',

  // 3) Modo demo de resultados.html (datos ficticios con ?demo=1).
  //    ANTES DEL TRABAJO DE CAMPO REAL: cámbialo a false.
  DEMO_PERMITIDO: true,

  // Umbrales del semáforo (proporción de "siempre" + "a veces")
  UMBRAL_VALIDADO: 0.70, // verde: 70 % o más
  UMBRAL_DUDOSO: 0.40,   // amarillo: 40 % a 69 %; rojo: menos de 40 %

  // Debajo de este número se muestra el aviso de "pocas respuestas"
  MIN_RESPUESTAS_CONFIABLES: 10
};
