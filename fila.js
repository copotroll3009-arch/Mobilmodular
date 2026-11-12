/*
 * fila.js — Convierte las respuestas de una persona en UNA fila para la Google Sheet.
 * Lo usan el cuestionario (index.html) y los datos ficticios (resultados.html).
 * El orden de las claves aquí es el orden de las columnas en la Sheet.
 */
window.Fila = (function () {
  'use strict';
  var D = window.DATOS;

  function dos(n) { return String(n).padStart(2, '0'); }

  function etiqueta(lista, valor) {
    for (var i = 0; i < lista.length; i++) if (lista[i].valor === valor) return lista[i].etiqueta;
    return '';
  }

  // Quita saltos de línea y los separadores que usamos en la Sheet (" > " y " | ").
  function limpiar(texto, max) {
    return String(texto || '')
      .replace(/\s+/g, ' ')
      .replace(/[|>]/g, '/')
      .trim()
      .slice(0, max || 500);
  }

  function limiteNiveles(espacio) {
    var e = D.espacios.find(function (x) { return x.valor === espacio; });
    return e ? e.niveles : null;
  }

  function modulosOrdenados(ids) {
    return D.modulos.filter(function (m) { return ids.indexOf(m.id) !== -1; });
  }

  function cobertura(ids) {
    var s = new Set();
    modulosOrdenados(ids).forEach(function (m) { m.pasos.forEach(function (p) { s.add(p); }); });
    return s;
  }

  function fechaLocal(d) {
    return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate()) + ' ' +
      dos(d.getHours()) + ':' + dos(d.getMinutes()) + ':' + dos(d.getSeconds());
  }

  function textoClave(clave, propios) {
    if (clave.charAt(0) === 'p') {
      var p = D.pasos.find(function (x) { return 'p' + x.id === clave; });
      return p ? p.texto : clave;
    }
    var c = (propios || []).find(function (x) { return 'c' + x.id === clave; });
    return c ? c.texto : '';
  }

  /*
   * r = {
   *   id, fecha (Date), inicio (ISO), perfil:{edad,ocupacion,espacio,renta},
   *   frecuencias:{1:'siempre',...}, orden:['p3','c1',...], propios:[{id,texto}],
   *   simultaneos, movimientos, imprevistos, modulos:['aseo',...],
   *   respuestasModulo:{aseo:'si'}, cambios, intencion
   * }
   */
  function construir(r) {
    var f = {};
    var fecha = r.fecha || new Date();
    f.id_participante = r.id;
    f.fecha_hora = fechaLocal(fecha);
    f.edad = r.perfil.edad === '' || r.perfil.edad == null ? '' : Number(r.perfil.edad);
    f.ocupacion = etiqueta(D.ocupaciones, r.perfil.ocupacion);
    f.espacio = etiqueta(D.espacios, r.perfil.espacio);
    f.renta_o_se_muda = etiqueta(D.renta, r.perfil.renta);

    D.pasos.forEach(function (p) {
      f['frec_' + dos(p.id)] = etiqueta(D.frecuencias, r.frecuencias[p.id]);
    });

    f.orden_final = r.orden.map(function (k) {
      var t = limpiar(textoClave(k, r.propios), 120);
      return k.charAt(0) === 'c' ? '(propio) ' + t : t;
    }).join(' > ');

    D.pasos.forEach(function (p) {
      var i = r.orden.indexOf('p' + p.id);
      f['pos_' + dos(p.id)] = i >= 0 ? i + 1 : '';
    });

    f.total_pasos_ordenados = r.orden.length;
    f.movimientos_orden = r.movimientos || 0;
    f.pasos_simultaneos = limpiar(r.simultaneos);
    f.pasos_propios = (r.propios || []).map(function (c) { return limpiar(c.texto, 120); }).join(' | ');
    f.paso_que_se_pierde = limpiar(r.imprevistos);

    var mods = modulosOrdenados(r.modulos || []);
    var limite = limiteNiveles(r.perfil.espacio);
    f.modulos_elegidos = mods.map(function (m) { return m.nombre; }).join(' | ');
    f.niveles = mods.length;
    f.pasos_cubiertos = cobertura(r.modulos || []).size;
    f.excede_espacio = limite != null && mods.length > limite ? 'Sí' : 'No';
    f.respuesta_por_modulo = mods.map(function (m) {
      return m.nombre + ': ' + (etiqueta(D.respuestasModulo, (r.respuestasModulo || {})[m.id]) || 'Sin respuesta');
    }).join(' | ');
    f.que_cambiaria = limpiar(r.cambios, 1000);
    f.intencion_compra = etiqueta(D.intencion, r.intencion);

    var ini = r.inicio ? new Date(r.inicio) : null;
    f.duracion_min = ini && !isNaN(ini) ? Math.round((fecha - ini) / 6000) / 10 : '';
    f.version = D.version;
    return f;
  }

  return {
    construir: construir,
    etiqueta: etiqueta,
    cobertura: cobertura,
    limiteNiveles: limiteNiveles,
    modulosOrdenados: modulosOrdenados,
    textoClave: textoClave,
    fechaLocal: fechaLocal,
    dos: dos
  };
})();
