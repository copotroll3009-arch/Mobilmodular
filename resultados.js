/*
 * resultados.js — Lee la Google Sheet (doGet del Apps Script) y calcula el análisis.
 * Modo demo: resultados.html?demo=1 (solo si CONFIG.DEMO_PERMITIDO = true).
 */
(function () {
  'use strict';
  var D = window.DATOS, C = window.CONFIG, F = window.Fila;
  var demo = new URLSearchParams(location.search).get('demo') === '1';

  var filasFuente = [];   // de la Sheet o del demo
  var filasRespaldo = []; // de archivos JSON cargados a mano
  var datos = [];         // filas preparadas para el análisis
  var crudas = [];        // filas tal como vienen (para el CSV completo)

  /* ---------- Utilidades ---------- */
  function $(s) { return document.querySelector(s); }
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(t) {
    return String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }
  function valorDe(lista, etiqueta) {
    var n = norm(etiqueta);
    if (!n) return '';
    var o = lista.find(function (x) { return norm(x.etiqueta) === n || norm(x.valor) === n; });
    return o ? o.valor : '';
  }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function pctTxt(a, b) { return b ? pct(a, b) + ' %' : '—'; }
  function media(arr) { return arr.length ? arr.reduce(function (s, x) { return s + x; }, 0) / arr.length : null; }
  function dec(x, d) { return x == null ? '—' : x.toFixed(d == null ? 1 : d).replace('.', '.'); }
  function urlScript() {
    var u = String(C.URL_APPS_SCRIPT || '').trim();
    return /^https:\/\/script\.google(usercontent)?\.com\/.+/.test(u) ? u : '';
  }

  /* ---------- Carga ---------- */
  function cargarScript(src) {
    return new Promise(function (ok, mal) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = function () { mal(new Error('No se pudo cargar ' + src)); };
      document.body.appendChild(s);
    });
  }

  async function cargar() {
    error('');
    $('#fuente').textContent = 'Cargando…';
    filasFuente = [];
    var textoFuente = '';

    if (demo) {
      if (!C.DEMO_PERMITIDO) {
        textoFuente = 'El modo demo está desactivado en config.js. Quita “?demo=1” de la dirección para ver los datos reales.';
      } else {
        try {
          await cargarScript('respuestas-ficticias.js');
          filasFuente = window.RESPUESTAS_FICTICIAS.slice();
          textoFuente = 'Fuente: ' + filasFuente.length + ' respuestas FICTICIAS (modo demo).';
          $('#banda-demo').hidden = false;
        } catch (e) {
          error(e.message);
        }
      }
    } else {
      var u = urlScript();
      if (!u) {
        textoFuente = 'No hay URL del Apps Script en config.js. Puedes cargar respaldos JSON' +
          (C.DEMO_PERMITIDO ? ' o abrir el modo demo.' : '.');
        if (C.DEMO_PERMITIDO) {
          $('#fuente').innerHTML = esc(textoFuente) + ' <a href="?demo=1">Abrir modo demo</a>';
          textoFuente = null;
        }
      } else {
        try {
          var sep = u.indexOf('?') >= 0 ? '&' : '?';
          var res = await fetch(u + sep + 'clave=' + encodeURIComponent(C.CLAVE_LECTURA) + '&t=' + Date.now());
          var j = await res.json();
          if (!j.ok) {
            error(j.error === 'clave-incorrecta'
              ? 'La clave de lectura no coincide. Revisa que CLAVE_LECTURA sea igual en config.js y en Codigo.gs.'
              : 'El Apps Script respondió con un error: ' + j.error);
          } else {
            filasFuente = (j.filas || []).filter(function (f) { return !/^(FICTICIA|PRUEBA)/i.test(f.id_participante); });
            textoFuente = 'Fuente: Google Sheet · ' + filasFuente.length + ' respuestas · actualizado a las ' +
              new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) + '.';
          }
        } catch (e) {
          error('No se pudo leer la Sheet. Revisa la URL en config.js y que el Apps Script esté publicado con acceso para “Cualquier usuario”.');
        }
      }
    }
    if (textoFuente !== null) $('#fuente').textContent = textoFuente || '';
    combinar();
  }

  function combinar() {
    var vistos = {};
    crudas = [];
    filasFuente.concat(filasRespaldo).forEach(function (f) {
      if (!f || !f.id_participante || vistos[f.id_participante]) return;
      vistos[f.id_participante] = true;
      crudas.push(f);
    });
    datos = crudas.map(preparar);
    pintar();
  }

  function error(t) {
    var e = $('#error-resultados');
    e.textContent = t;
    e.classList.toggle('visible', !!t);
  }

  /* ---------- Preparar cada fila ---------- */
  function preparar(f) {
    var r = {
      id: f.id_participante,
      fecha: f.fecha_hora,
      edad: Number(f.edad) || null,
      ocupacion: valorDe(D.ocupaciones, f.ocupacion),
      espacio: valorDe(D.espacios, f.espacio),
      renta: valorDe(D.renta, f.renta_o_se_muda),
      frec: {}, pos: {},
      total: Number(f.total_pasos_ordenados) || 0,
      movimientos: f.movimientos_orden === '' || f.movimientos_orden == null ? null : Number(f.movimientos_orden),
      simultaneos: f.pasos_simultaneos || '',
      propios: String(f.pasos_propios || '').split(' | ').filter(Boolean),
      pierde: f.paso_que_se_pierde || '',
      cambios: f.que_cambiaria || '',
      intencion: valorDe(D.intencion, f.intencion_compra),
      excede: norm(f.excede_espacio) === 'si',
      duracion: Number(f.duracion_min) || null,
      modulos: [], respMod: {}
    };
    if (!r.total && f.orden_final) r.total = String(f.orden_final).split(' > ').length;
    D.pasos.forEach(function (p) {
      r.frec[p.id] = valorDe(D.frecuencias, f['frec_' + F.dos(p.id)]);
      var v = f['pos_' + F.dos(p.id)];
      r.pos[p.id] = v === '' || v == null || isNaN(Number(v)) ? null : Number(v);
    });
    String(f.modulos_elegidos || '').split(' | ').forEach(function (nombre) {
      var m = D.modulos.find(function (x) { return norm(x.nombre) === norm(nombre); });
      if (m) r.modulos.push(m.id);
    });
    String(f.respuesta_por_modulo || '').split(' | ').forEach(function (par) {
      var k = par.lastIndexOf(': ');
      if (k < 0) return;
      var m = D.modulos.find(function (x) { return norm(x.nombre) === norm(par.slice(0, k)); });
      if (m) r.respMod[m.id] = valorDe(D.respuestasModulo, par.slice(k + 2));
    });
    return r;
  }

  /* ---------- Cálculos ---------- */
  function estadoPaso(hace) {
    if (hace == null) return { clase: 'mal', texto: 'Sin datos' };
    if (hace >= C.UMBRAL_VALIDADO) return { clase: 'ok', texto: 'Validado' };
    if (hace >= C.UMBRAL_DUDOSO) return { clase: 'duda', texto: 'Dudoso' };
    return { clase: 'mal', texto: 'Conviene descartar' };
  }

  function statsPasos(filas) {
    return D.pasos.map(function (p) {
      var s = 0, a = 0, n = 0, pos = [], rel = [];
      filas.forEach(function (r) {
        var f = r.frec[p.id];
        if (f === 'siempre') s++; else if (f === 'a_veces') a++; else if (f === 'nunca') n++;
        var x = r.pos[p.id];
        if (x != null) {
          pos.push(x);
          rel.push(r.total > 1 ? (x - 1) / (r.total - 1) : 0.5);
        }
      });
      var resp = s + a + n;
      var hace = resp ? (s + a) / resp : null;
      return {
        paso: p, siempre: s, aveces: a, nunca: n, resp: resp, sinResp: filas.length - resp,
        hace: hace, estado: estadoPaso(hace),
        lugar: media(pos), relativa: media(rel), nOrden: pos.length
      };
    });
  }

  function ordenPropuesto(stats) {
    var conDatos = stats.filter(function (s) { return s.nOrden > 0; });
    var porBlueprint = conDatos.slice().sort(function (a, b) { return a.paso.id - b.paso.id; });
    var propuesto = conDatos.slice().sort(function (a, b) { return a.relativa - b.relativa || a.paso.id - b.paso.id; });
    var filas = propuesto.map(function (s, i) {
      var lugarBp = porBlueprint.indexOf(s) + 1;
      return { stats: s, lugar: i + 1, lugarBp: lugarBp, cambio: lugarBp - (i + 1) };
    });
    var k = filas.length, rho = null;
    if (k >= 3) {
      var d2 = filas.reduce(function (sum, f) { return sum + f.cambio * f.cambio; }, 0);
      rho = 1 - (6 * d2) / (k * (k * k - 1));
    }
    return { filas: filas, rho: rho };
  }

  function statsModulos(filas) {
    return D.modulos.map(function (m) {
      var elegido = 0, si = 0, talvez = 0, no = 0;
      filas.forEach(function (r) {
        if (r.modulos.indexOf(m.id) < 0) return;
        elegido++;
        var v = r.respMod[m.id];
        if (v === 'si') si++; else if (v === 'tal_vez') talvez++; else if (v === 'no') no++;
      });
      return { modulo: m, elegido: elegido, si: si, talvez: talvez, no: no };
    }).sort(function (a, b) { return b.elegido - a.elegido || b.si - a.si; });
  }

  /* ---------- Pintar ---------- */
  function pintar() {
    var n = datos.length;
    $('#contenido').hidden = n === 0;
    var pocas = $('#banda-pocas');
    if (n < C.MIN_RESPUESTAS_CONFIABLES) {
      pocas.hidden = false;
      pocas.innerHTML = '<h2>' + (n === 0 ? 'Todavía no hay respuestas' : 'Solo hay ' + n + (n === 1 ? ' respuesta' : ' respuestas')) + '</h2>' +
        '<p>Con menos de ' + C.MIN_RESPUESTAS_CONFIABLES + ' respuestas cada persona mueve mucho los porcentajes. ' +
        'Úsalos como señales para seguir preguntando, no como conclusiones.</p>';
    } else {
      pocas.hidden = true;
    }
    if (!n) return;

    var stats = statsPasos(datos);
    pintarKpis(stats);
    pintarPasos(stats);
    pintarOrden(stats);
    pintarModulos();
    pintarSegmentos();
    pintarVoces();
    pintarCalidad();
  }

  function pintarKpis(stats) {
    var validados = stats.filter(function (s) { return s.estado.clase === 'ok'; }).length;
    var dudosos = stats.filter(function (s) { return s.estado.clase === 'duda'; }).length;
    var descartar = stats.length - validados - dudosos;
    var edades = datos.map(function (r) { return r.edad; }).filter(Boolean);
    var compraria = datos.filter(function (r) { return r.intencion === 'compraria'; }).length;
    var kpi = function (v, t) { return '<div class="kpi"><div class="kpi__valor">' + esc(v) + '</div><div class="kpi__etiqueta">' + esc(t) + '</div></div>'; };
    $('#kpis').innerHTML =
      kpi(datos.length, 'respuestas') +
      kpi(edades.length ? Math.min.apply(null, edades) + '–' + Math.max.apply(null, edades) : '—', 'rango de edad') +
      kpi(validados, 'pasos validados') +
      kpi(dudosos, 'pasos dudosos') +
      kpi(descartar, 'pasos para descartar') +
      kpi(pctTxt(compraria, datos.length), 'lo compraría');
  }

  function pintarPasos(stats) {
    $('#leyenda-semaforo').innerHTML =
      '<span><b class="semaforo semaforo--ok">Validado</b> ' + Math.round(C.UMBRAL_VALIDADO * 100) + ' % o más lo hace</span>' +
      '<span><b class="semaforo semaforo--duda">Dudoso</b> ' + Math.round(C.UMBRAL_DUDOSO * 100) + '–' + (Math.round(C.UMBRAL_VALIDADO * 100) - 1) + ' %</span>' +
      '<span><b class="semaforo semaforo--mal">Conviene descartar</b> menos de ' + Math.round(C.UMBRAL_DUDOSO * 100) + ' %</span>';

    $('#filas-pasos').innerHTML = stats.map(function (s) {
      var t = s.resp + s.sinResp || 1;
      var ancho = function (x) { return (x / t * 100).toFixed(2) + '%'; };
      return '<article class="fila-paso fila-paso--' + s.estado.clase + '">' +
        '<div class="fila-paso__num" aria-hidden="true">' + F.dos(s.paso.id) + '</div>' +
        '<div class="fila-paso__titulo"><span class="sr-only">Paso ' + s.paso.id + ': </span>' + esc(s.paso.texto) + '</div>' +
        '<div class="fila-paso__barra"><div class="barra-apilada" role="img" aria-label="Siempre ' + pctTxt(s.siempre, s.resp) +
          ', a veces ' + pctTxt(s.aveces, s.resp) + ', nunca ' + pctTxt(s.nunca, s.resp) + '">' +
          '<span class="b-siempre" style="width:' + ancho(s.siempre) + '"></span>' +
          '<span class="b-aveces" style="width:' + ancho(s.aveces) + '"></span>' +
          '<span class="b-nunca" style="width:' + ancho(s.nunca) + '"></span>' +
          '<span class="b-sinresp" style="width:' + ancho(s.sinResp) + '"></span></div></div>' +
        '<div class="fila-paso__meta">' +
          '<b class="semaforo semaforo--' + s.estado.clase + '">' + s.estado.texto + '</b>' +
          '<span><b>' + pctTxt(s.siempre + s.aveces, s.resp) + '</b> lo hace</span>' +
          '<span>Siempre ' + pctTxt(s.siempre, s.resp) + ' · A veces ' + pctTxt(s.aveces, s.resp) + ' · Nunca ' + pctTxt(s.nunca, s.resp) + '</span>' +
          '<span>Lugar promedio: <b>' + dec(s.lugar) + '</b>' + (s.relativa != null ? ' (relativa ' + Math.round(s.relativa * 100) + ' %)' : '') + '</span>' +
        '</div></article>';
    }).join('');
  }

  function pintarOrden(stats) {
    var o = ordenPropuesto(stats);
    var rho = o.rho;
    $('#coincidencia').innerHTML = rho == null
      ? 'Se necesitan al menos 3 pasos ordenados para comparar.'
      : 'Coincidencia con el blueprint (correlación de Spearman): <b>' + dec(rho, 2) + '</b>. ' +
        (rho >= 0.8 ? 'El orden supuesto se parece mucho al real.'
          : rho >= 0.5 ? 'El orden supuesto se parece en lo general, con cambios importantes.'
          : 'El orden real es bastante distinto al supuesto.') +
        ' (1 = idéntico, 0 = sin relación.)';
    $('#tabla-orden').innerHTML =
      '<thead><tr><th class="num">Lugar propuesto</th><th>Paso</th><th class="num">Lugar en blueprint</th><th class="num">Cambio</th><th class="num">Lo ordenaron</th></tr></thead><tbody>' +
      o.filas.map(function (f) {
        var c = f.cambio === 0 ? '=' : f.cambio > 0
          ? '<span class="cambio-sube">↑ ' + f.cambio + '<span class="sr-only"> lugares antes</span></span>'
          : '<span class="cambio-baja">↓ ' + (-f.cambio) + '<span class="sr-only"> lugares después</span></span>';
        return '<tr><td class="num">' + f.lugar + '</td><td>' + f.stats.paso.id + '. ' + esc(f.stats.paso.corto) +
          '</td><td class="num">' + f.lugarBp + '</td><td class="num">' + c + '</td><td class="num">' + f.stats.nOrden + '</td></tr>';
      }).join('') + '</tbody>';
  }

  function pintarModulos() {
    var mods = statsModulos(datos);
    var max = Math.max.apply(null, mods.map(function (m) { return m.elegido; }).concat(1));
    $('#tabla-modulos').innerHTML =
      '<thead><tr><th>#</th><th>Módulo</th><th>Lo eligieron</th><th class="num">Sí lo pondría</th><th class="num">Tal vez</th><th class="num">No</th></tr></thead><tbody>' +
      mods.map(function (m, i) {
        return '<tr><td>' + (i + 1) + '</td><td><b>' + esc(m.modulo.nombre) + '</b></td><td style="white-space:nowrap">' +
          '<span class="mini-barra" style="width:' + Math.round(m.elegido / max * 70) + 'px"></span>' +
          m.elegido + ' (' + pctTxt(m.elegido, datos.length) + ')</td>' +
          '<td class="num">' + m.si + '</td><td class="num">' + m.talvez + '</td><td class="num">' + m.no + '</td></tr>';
      }).join('') + '</tbody>';

    var cuenta = D.intencion.map(function (op) {
      var c = datos.filter(function (r) { return r.intencion === op.valor; }).length;
      return '<b>' + esc(op.etiqueta) + ':</b> ' + c + ' (' + pctTxt(c, datos.length) + ')';
    });
    var niveles = media(datos.map(function (r) { return r.modulos.length; }));
    $('#intencion').innerHTML = 'Intención: ' + cuenta.join(' · ') + '<br>Niveles promedio del mueble armado: <b>' + dec(niveles) + '</b>.';
  }

  function pintarSegmentos() {
    var clave = $('#segmento').value;
    var lista = { ocupacion: D.ocupaciones, espacio: D.espacios, renta: D.renta }[clave];
    var grupos = lista.map(function (op) {
      return { etiqueta: op.etiqueta, filas: datos.filter(function (r) { return r[clave] === op.valor; }) };
    });
    var sinDato = datos.filter(function (r) { return !r[clave]; });
    if (sinDato.length) grupos.push({ etiqueta: 'Sin dato', filas: sinDato });

    var statsG = grupos.map(function (g) { return statsPasos(g.filas); });
    var cab = '<thead><tr><th>Paso / módulo</th>' + grupos.map(function (g) {
      return '<th class="num">' + esc(g.etiqueta) + '<br><small>n = ' + g.filas.length + '</small></th>';
    }).join('') + '</tr></thead>';

    var cuerpo = '<tbody><tr><td colspan="' + (grupos.length + 1) + '"><b>% que hace cada paso</b></td></tr>' +
      D.pasos.map(function (p, i) {
        return '<tr><td>' + p.id + '. ' + esc(p.corto) + '</td>' + statsG.map(function (sg) {
          var s = sg[i];
          return '<td class="num">' + (s.resp ? pct(s.siempre + s.aveces, s.resp) + ' %' : '—') + '</td>';
        }).join('') + '</tr>';
      }).join('') +
      '<tr><td colspan="' + (grupos.length + 1) + '"><b>% que eligió cada módulo</b></td></tr>' +
      D.modulos.map(function (m) {
        return '<tr><td>' + esc(m.nombre) + '</td>' + grupos.map(function (g) {
          var c = g.filas.filter(function (r) { return r.modulos.indexOf(m.id) >= 0; }).length;
          return '<td class="num">' + pctTxt(c, g.filas.length) + '</td>';
        }).join('') + '</tr>';
      }).join('') +
      '<tr><td><b>Lo compraría</b></td>' + grupos.map(function (g) {
        var c = g.filas.filter(function (r) { return r.intencion === 'compraria'; }).length;
        return '<td class="num"><b>' + pctTxt(c, g.filas.length) + '</b></td>';
      }).join('') + '</tr>' +
      '<tr><td>Niveles promedio</td>' + grupos.map(function (g) {
        return '<td class="num">' + dec(media(g.filas.map(function (r) { return r.modulos.length; }))) + '</td>';
      }).join('') + '</tr></tbody>';

    $('#tabla-segmentos').innerHTML = cab + cuerpo;
  }

  function pintarVoces() {
    var bloque = function (titulo, items) {
      return '<div><h3>' + esc(titulo) + ' <small>(' + items.length + ')</small></h3>' +
        (items.length
          ? '<ul>' + items.map(function (x) {
              return '<li>' + esc(x.texto) + '<small>' + esc(x.id) + ' · ' + esc(F.etiqueta(D.ocupaciones, x.ocupacion) || 'sin ocupación') + '</small></li>';
            }).join('') + '</ul>'
          : '<p class="vacio-msj">Nadie respondió esto todavía.</p>') + '</div>';
    };
    var recoger = function (campo) {
      var out = [];
      datos.forEach(function (r) {
        var v = r[campo];
        (Array.isArray(v) ? v : [v]).forEach(function (t) {
          if (String(t || '').trim()) out.push({ texto: t, id: r.id, ocupacion: r.ocupacion });
        });
      });
      return out;
    };
    $('#voces').innerHTML =
      bloque('Pasos propios', recoger('propios')) +
      bloque('Pasos que hacen al mismo tiempo', recoger('simultaneos')) +
      bloque('Lo primero que se pierde con imprevistos', recoger('pierde')) +
      bloque('Qué quitarían o cambiarían del mueble', recoger('cambios'));
  }

  function pintarCalidad() {
    var sinMover = datos.filter(function (r) { return r.movimientos === 0 && r.total > 1; });
    var excede = datos.filter(function (r) { return r.excede; }).length;
    var dur = media(datos.map(function (r) { return r.duracion; }).filter(Boolean));
    $('#calidad').innerHTML = '<ul>' +
      '<li><b>' + sinMover.length + '</b> ' + (sinMover.length === 1 ? 'persona no movió' : 'personas no movieron') +
        ' ningún paso al ordenar (los pasos aparecen revueltos, así que su orden puede no ser real)' +
        (sinMover.length ? ': ' + sinMover.map(function (r) { return esc(r.id); }).join(', ') : '') + '.</li>' +
      '<li><b>' + excede + '</b> ' + (excede === 1 ? 'persona armó' : 'personas armaron') + ' un mueble más grande de lo que cabe en su espacio.</li>' +
      '<li>Duración promedio: <b>' + dec(dur) + '</b> minutos.</li>' +
      '</ul>';
  }

  /* ---------- CSV ---------- */
  function csv(filas) {
    return '﻿' + filas.map(function (f) {
      return f.map(function (v) {
        var t = String(v == null ? '' : v);
        if (/^[=+\-@]/.test(t) && isNaN(Number(t))) t = "'" + t;
        return /[",\n;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
      }).join(',');
    }).join('\r\n');
  }
  function descargar(nombre, contenido) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function prefijo() { return (demo ? 'DEMO-FICTICIO-' : '') + new Date().toISOString().slice(0, 10) + '-'; }

  function csvPasos() {
    var stats = statsPasos(datos);
    var o = ordenPropuesto(stats);
    var lugarProp = {};
    o.filas.forEach(function (f) { lugarProp[f.stats.paso.id] = f; });
    var filas = [['paso', 'texto', 'respondieron', 'siempre_%', 'a_veces_%', 'nunca_%', 'hace_%', 'estado', 'lugar_promedio', 'posicion_relativa_%', 'lo_ordenaron', 'lugar_propuesto', 'lugar_blueprint']];
    stats.forEach(function (s) {
      var lp = lugarProp[s.paso.id];
      filas.push([s.paso.id, s.paso.texto, s.resp, pct(s.siempre, s.resp), pct(s.aveces, s.resp), pct(s.nunca, s.resp),
        pct(s.siempre + s.aveces, s.resp), s.estado.texto, s.lugar == null ? '' : s.lugar.toFixed(2),
        s.relativa == null ? '' : Math.round(s.relativa * 100), s.nOrden, lp ? lp.lugar : '', lp ? lp.lugarBp : '']);
    });
    descargar(prefijo() + 'resumen-por-paso.csv', csv(filas));
  }
  function csvModulos() {
    var filas = [['lugar', 'modulo', 'pasos_que_cubre', 'lo_eligieron', 'lo_eligieron_%', 'si_lo_pondria', 'tal_vez', 'no']];
    statsModulos(datos).forEach(function (m, i) {
      filas.push([i + 1, m.modulo.nombre, m.modulo.pasos.join(' '), m.elegido, pct(m.elegido, datos.length), m.si, m.talvez, m.no]);
    });
    descargar(prefijo() + 'modulos.csv', csv(filas));
  }
  function csvRespuestas() {
    var claves = [];
    crudas.forEach(function (f) { Object.keys(f).forEach(function (k) { if (claves.indexOf(k) < 0) claves.push(k); }); });
    var filas = [claves].concat(crudas.map(function (f) { return claves.map(function (k) { return f[k]; }); }));
    descargar(prefijo() + 'respuestas-completas.csv', csv(filas));
  }

  /* ---------- Respaldos JSON ---------- */
  function leerRespaldos(archivos) {
    var lecturas = Array.prototype.map.call(archivos, function (a) {
      return a.text().then(function (t) {
        var j = JSON.parse(t);
        var lista = Array.isArray(j) ? j : Array.isArray(j.respuestas) ? j.respuestas : [j];
        return lista.filter(function (f) { return f && f.id_participante; });
      });
    });
    Promise.all(lecturas).then(function (res) {
      var nuevas = [].concat.apply([], res).filter(function (f) { return demo || !/^(FICTICIA|PRUEBA)/i.test(f.id_participante); });
      filasRespaldo = filasRespaldo.concat(nuevas);
      combinar();
      $('#fuente').textContent += ' + ' + nuevas.length + ' de respaldos JSON.';
    }).catch(function () {
      error('Alguno de los archivos no es un respaldo válido (JSON descargado desde el cuestionario).');
    });
  }

  /* ---------- Eventos ---------- */
  $('#btn-actualizar').addEventListener('click', cargar);
  $('#segmento').addEventListener('change', pintarSegmentos);
  $('#csv-pasos').addEventListener('click', function () { if (datos.length) csvPasos(); });
  $('#csv-modulos').addEventListener('click', function () { if (datos.length) csvModulos(); });
  $('#csv-respuestas').addEventListener('click', function () { if (datos.length) csvRespuestas(); });
  $('#archivo-respaldo').addEventListener('change', function (e) {
    if (e.target.files.length) leerRespaldos(e.target.files);
    e.target.value = '';
  });
  $('#lbl-respaldo').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#archivo-respaldo').click(); }
  });

  cargar();
})();
