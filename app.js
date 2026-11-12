/*
 * app.js — Lógica del cuestionario. El contenido vive en data.js.
 */
(function () {
  'use strict';

  var D = window.DATOS, F = window.Fila, M = window.Mueble, E = window.Envio;
  var PANTALLAS = ['bienvenida', 'perfil', 'pasos', 'ordenar', 'imprevistos', 'mueble', 'gracias'];
  var CLAVE_SESION = 'validacion-rutina-borrador-v1';
  var reducido = window.matchMedia('(prefers-reduced-motion: reduce)');

  var ICONO = {
    agarre: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><circle cx="9" cy="5.5" r="2"/><circle cx="15" cy="5.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="18.5" r="2"/><circle cx="15" cy="18.5" r="2"/></g></svg>',
    arriba: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m0 0l-6 6m6-6l6 6" stroke="currentColor" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    abajo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m0 0l-6-6m6 6l6-6" stroke="currentColor" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    ok: '<svg class="estado-envio__icono" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M7 12.5l3.2 3.2L17 9" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error: '<svg class="estado-envio__icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 18H2z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 10v4.5M12 17.5v.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    carga: '<svg class="estado-envio__icono girando" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>'
  };

  /* ---------- Utilidades ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function obtener(ruta) { return ruta.split('.').reduce(function (o, k) { return o && o[k]; }, D); }
  function el(tag, clase, texto) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto != null) n.textContent = texto;
    return n;
  }
  function barajar(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function generarId() {
    var b = new Uint8Array(5);
    (window.crypto || window.msCrypto).getRandomValues(b);
    return 'P-' + Array.prototype.map.call(b, function (x) { return x.toString(16).padStart(2, '0'); }).join('').toUpperCase();
  }
  function anunciar(t) {
    var a = $('#anuncio');
    a.textContent = '';
    setTimeout(function () { a.textContent = t; }, 60);
  }

  /* ---------- Estado ---------- */
  function nuevoEstado() {
    return {
      id: generarId(),
      inicio: new Date().toISOString(),
      pantalla: 'bienvenida',
      consentimiento: false,
      perfil: { edad: '', ocupacion: '', espacio: '', renta: '' },
      frecuencias: {},
      pasoActual: 0,
      orden: [],
      propios: [],
      simultaneos: '',
      movimientos: 0,
      imprevistos: '',
      modulos: [],
      respuestasModulo: {},
      cambios: '',
      intencion: '',
      fila: null,
      enviado: false
    };
  }
  function cargar() {
    try { var t = sessionStorage.getItem(CLAVE_SESION); return t ? JSON.parse(t) : null; } catch (e) { return null; }
  }
  function guardar() {
    try { sessionStorage.setItem(CLAVE_SESION, JSON.stringify(estado)); } catch (e) { /* modo privado */ }
  }
  var estado = cargar() || nuevoEstado();
  var avisoOrdenMostrado = false;
  var temporizadorPaso = null;
  var enviando = false;

  function textoDe(clave) { return F.textoClave(clave, estado.propios); }
  function pasosQueHace() {
    return D.pasos.filter(function (p) { var f = estado.frecuencias[p.id]; return f && f !== 'nunca'; });
  }

  /* ==========================================================
     Construcción inicial
     ========================================================== */
  function iniciar() {
    $$('[data-t]').forEach(function (n) { var v = obtener(n.dataset.t); if (v != null) n.textContent = v; });
    $$('[data-ph]').forEach(function (n) { var v = obtener(n.dataset.ph); if (v != null) n.placeholder = v; });

    var lista = $('#bienvenida-lineas');
    D.bienvenida.lineas.forEach(function (t) { lista.appendChild(el('li', null, t)); });

    construirOpciones($('#op-ocupacion'), 'ocupacion', D.ocupaciones, estado.perfil.ocupacion);
    construirOpciones($('#op-espacio'), 'espacio', D.espacios, estado.perfil.espacio);
    construirOpciones($('#op-renta'), 'renta', D.renta, estado.perfil.renta);
    construirOpciones($('#op-intencion'), 'intencion', D.intencion, estado.intencion);

    var frec = $('#frecuencias');
    D.frecuencias.forEach(function (f) {
      var b = el('button', 'frecuencia');
      b.type = 'button';
      b.dataset.valor = f.valor;
      b.setAttribute('aria-pressed', 'false');
      b.appendChild(el('span', null, f.etiqueta));
      b.appendChild(el('span', 'frecuencia__marca'));
      frec.appendChild(b);
    });
    $('#progreso').setAttribute('aria-valuemax', D.pasos.length);

    var mapa = $('#mapa-pasos');
    D.pasos.forEach(function (p, i) {
      var li = el('li');
      var b = el('button', null, String(p.id));
      b.type = 'button';
      b.dataset.indice = i;
      li.appendChild(b);
      mapa.appendChild(li);
    });

    // Valores guardados
    $('#consentimiento').checked = !!estado.consentimiento;
    $('#edad').value = estado.perfil.edad;
    $('#simultaneos').value = estado.simultaneos;
    $('#imprevistos').value = estado.imprevistos;
    $('#cambios').value = estado.cambios;

    eventos();

    window.Ordenable($('#lista-orden'), {
      alSoltar: function (claves, clave, cambio) {
        if (!cambio) return;
        estado.orden = claves;
        estado.movimientos++;
        guardar();
        pintarOrden();
        anunciar(textoDe(clave) + ': posición ' + (claves.indexOf(clave) + 1) + ' de ' + claves.length + '.');
      },
      alMover: moverItem
    });

    var inicial = PANTALLAS.indexOf(estado.pantalla) >= 0 ? estado.pantalla : 'bienvenida';
    history.replaceState({ pantalla: inicial }, '', '#' + inicial);
    ir(inicial, { sinHistorial: true, foco: false });

    revisarPendientes();
    E.reintentarPendientes().then(function (n) { if (n) revisarPendientes(); });
  }

  function construirOpciones(cont, nombre, lista, valor) {
    cont.innerHTML = '';
    lista.forEach(function (o) {
      var label = el('label', 'opcion');
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = nombre;
      input.value = o.valor;
      input.checked = o.valor === valor;
      label.appendChild(input);
      label.appendChild(el('span', null, o.etiqueta));
      cont.appendChild(label);
    });
  }

  function revisarPendientes() {
    var p = E.pendientes();
    var caja = $('#aviso-pendientes');
    if (!p.length) { caja.hidden = true; return; }
    caja.hidden = false;
    $('#aviso-pendientes-texto').textContent = p.length === 1
      ? 'Hay 1 respuesta guardada en este dispositivo que aún no llega a la hoja de respuestas.'
      : 'Hay ' + p.length + ' respuestas guardadas en este dispositivo que aún no llegan a la hoja de respuestas.';
  }

  /* ==========================================================
     Eventos
     ========================================================== */
  function eventos() {
    $('#btn-empezar').addEventListener('click', function () {
      var errores = validar('bienvenida');
      if (errores.length) return mostrarErrores('bienvenida', errores);
      ir('perfil');
    });
    $('#consentimiento').addEventListener('change', function (e) {
      estado.consentimiento = e.target.checked; guardar(); limpiarCampo(e.target);
    });
    $('#btn-descargar-pendientes').addEventListener('click', function () {
      E.descargarJSON(E.pendientes(), 'respuestas-pendientes.json');
    });

    $('#edad').addEventListener('input', function (e) {
      var v = e.target.value.replace(/\D/g, '').slice(0, 2);
      if (v !== e.target.value) e.target.value = v;
      estado.perfil.edad = v; guardar(); limpiarCampo(e.target);
    });

    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t.type !== 'radio') return;
      if (['ocupacion', 'espacio', 'renta'].indexOf(t.name) >= 0) estado.perfil[t.name] = t.value;
      else if (t.name === 'intencion') estado.intencion = t.value;
      else if (t.name.indexOf('pm-') === 0) estado.respuestasModulo[t.name.slice(3)] = t.value;
      guardar();
      limpiarCampo(t);
    });

    // Validar pasos
    $('#frecuencias').addEventListener('click', function (e) {
      var b = e.target.closest('.frecuencia');
      if (b) elegirFrecuencia(b.dataset.valor);
    });
    $('#mapa-pasos').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || b.disabled) return;
      clearTimeout(temporizadorPaso);
      estado.pasoActual = Number(b.dataset.indice);
      guardar();
      pintarPaso(true);
      $('#paso-texto').focus();
    });

    // Ordenar
    $('#btn-agregar').addEventListener('click', agregarPropio);
    $('#propio-texto').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); agregarPropio(); }
    });
    $('#lista-orden').addEventListener('click', function (e) {
      var b = e.target.closest('.item-orden__quitar');
      if (b) quitarPropio(b.closest('.item-orden').dataset.clave);
    });

    // Campos abiertos
    [['simultaneos', 'simultaneos'], ['imprevistos', 'imprevistos'], ['cambios', 'cambios']].forEach(function (par) {
      $('#' + par[0]).addEventListener('input', function (e) { estado[par[1]] = e.target.value; guardar(); });
    });

    // Mueble
    $('#modulos').addEventListener('click', function (e) {
      var b = e.target.closest('.modulo');
      if (!b) return;
      var id = b.dataset.id;
      var i = estado.modulos.indexOf(id);
      if (i >= 0) estado.modulos.splice(i, 1); else estado.modulos.push(id);
      guardar();
      pintarMueble();
      var m = D.modulos.find(function (x) { return x.id === id; });
      anunciar(m.nombre + (i >= 0 ? ' desactivado.' : ' activado.'));
    });

    // Gracias
    $('#btn-png').addEventListener('click', generarPNG);
    $('#btn-otra-persona').addEventListener('click', function () {
      try { sessionStorage.removeItem(CLAVE_SESION); } catch (e) { /* nada */ }
      location.replace(location.pathname);
    });
    $('#estado-envio').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.accion === 'reintentar') enviarRespuesta();
      if (b.dataset.accion === 'descargar') E.descargarJSON([estado.fila], 'respuesta-' + estado.id + '.json');
      if (b.dataset.accion === 'descargar-todas') E.descargarJSON(E.pendientes(), 'respuestas-pendientes.json');
    });

    // Barra inferior
    $('#btn-siguiente').addEventListener('click', siguiente);
    $('#btn-atras').addEventListener('click', atras);

    window.addEventListener('popstate', function (e) {
      var destino = e.state && e.state.pantalla;
      if (!destino) return;
      if (estado.enviado && destino !== 'gracias') {
        history.pushState({ pantalla: 'gracias' }, '', '#gracias');
        return;
      }
      var actual = PANTALLAS.indexOf(estado.pantalla);
      var meta = PANTALLAS.indexOf(destino);
      for (var i = actual; i < meta; i++) {
        if (validar(PANTALLAS[i]).length || PANTALLAS[i + 1] === 'gracias') {
          history.replaceState({ pantalla: estado.pantalla }, '', '#' + estado.pantalla);
          return;
        }
      }
      ir(destino, { sinHistorial: true });
    });
  }

  /* ==========================================================
     Navegación
     ========================================================== */
  var alEntrar = {
    pasos: function () { pintarPaso(false); },
    ordenar: function () { sincronizarOrden(); pintarOrden(); },
    mueble: function () { construirModulos(); pintarMueble(); },
    gracias: function () { pintarResumen(); if (!estado.enviado) enviarRespuesta(); else pintarEstado('ok'); }
  };

  function ir(nombre, op) {
    op = op || {};
    estado.pantalla = nombre;
    guardar();
    $$('.pantalla').forEach(function (p) { p.hidden = p.dataset.pantalla !== nombre; });
    $$('.error').forEach(function (e) { e.classList.remove('visible'); e.textContent = ''; });
    if (alEntrar[nombre]) alEntrar[nombre]();

    var idx = PANTALLAS.indexOf(nombre);
    $$('#etapas li').forEach(function (li, i) {
      li.className = i < idx ? 'hecha' : i === idx ? 'actual' : '';
    });
    pintarBarra();
    if (!op.sinHistorial) history.pushState({ pantalla: nombre }, '', '#' + nombre);
    window.scrollTo(0, 0);
    if (op.foco !== false) {
      var h = $('[data-pantalla="' + nombre + '"] h1');
      if (h) h.focus({ preventScroll: true });
    }
  }

  function pintarBarra() {
    var p = estado.pantalla;
    $('#barra').hidden = p === 'bienvenida' || p === 'gracias';
    var sig = $('#btn-siguiente');
    if (p === 'pasos') sig.textContent = estado.pasoActual < D.pasos.length - 1 ? 'Siguiente' : 'Continuar';
    else if (p === 'mueble') sig.textContent = 'Enviar respuestas';
    else sig.textContent = 'Siguiente';
  }

  function siguiente() {
    var p = estado.pantalla;
    if (p === 'pasos') {
      var paso = D.pasos[estado.pasoActual];
      if (!estado.frecuencias[paso.id]) {
        return mostrarErrores('pasos', [{ msj: 'Elige “Siempre”, “A veces” o “Nunca” para continuar.', foco: $('.frecuencia') }]);
      }
      if (estado.pasoActual < D.pasos.length - 1) {
        clearTimeout(temporizadorPaso);
        estado.pasoActual++;
        guardar();
        pintarPaso(true);
        $('#paso-texto').focus();
        return;
      }
    }
    var errores = validar(p);
    if (errores.length) return mostrarErrores(p, errores);

    if (p === 'ordenar' && estado.orden.length > 1 && estado.movimientos === 0 && !avisoOrdenMostrado) {
      avisoOrdenMostrado = true;
      return mostrarErrores('ordenar', [{ msj: D.ordenar.avisoSinMover, foco: $('#lista-orden .agarre') }]);
    }
    ir(PANTALLAS[PANTALLAS.indexOf(p) + 1]);
  }

  function atras() {
    var p = estado.pantalla;
    if (p === 'pasos' && estado.pasoActual > 0) {
      clearTimeout(temporizadorPaso);
      estado.pasoActual--;
      guardar();
      pintarPaso(true);
      $('#paso-texto').focus();
      return;
    }
    var anterior = PANTALLAS[PANTALLAS.indexOf(p) - 1];
    if (!anterior) return;
    if (anterior === 'pasos') estado.pasoActual = D.pasos.length - 1;
    ir(anterior);
  }

  /* ---------- Validación ---------- */
  function validar(p) {
    var e = [];
    if (p === 'bienvenida' && !estado.consentimiento) {
      e.push({ msj: 'Para empezar, marca la casilla de participación voluntaria.', foco: $('#consentimiento') });
    }
    if (p === 'perfil') {
      var edad = Number(estado.perfil.edad);
      if (!estado.perfil.edad || edad < D.perfil.edadMin || edad > D.perfil.edadMax) {
        e.push({ msj: 'Escribe tu edad (entre ' + D.perfil.edadMin + ' y ' + D.perfil.edadMax + ' años).', foco: $('#edad') });
      }
      if (!estado.perfil.ocupacion) e.push({ msj: 'Elige a qué te dedicas.', foco: $('input[name="ocupacion"]') });
      if (!estado.perfil.espacio) e.push({ msj: 'Elige cuánto espacio tienes.', foco: $('input[name="espacio"]') });
      if (!estado.perfil.renta) e.push({ msj: 'Dinos si rentas o te mudas seguido.', foco: $('input[name="renta"]') });
    }
    if (p === 'pasos') {
      var falta = D.pasos.findIndex(function (x) { return !estado.frecuencias[x.id]; });
      if (falta >= 0) e.push({ msj: 'Falta responder el paso ' + (falta + 1) + '.', irAPaso: falta });
    }
    if (p === 'mueble') {
      F.modulosOrdenados(estado.modulos).forEach(function (m) {
        if (!estado.respuestasModulo[m.id]) {
          e.push({ msj: 'Responde si pondrías “' + m.nombre + '” en tu cuarto.', foco: $('input[name="pm-' + m.id + '"]') });
        }
      });
      if (!estado.intencion) e.push({ msj: 'Elige qué harías si existiera el mueble.', foco: $('input[name="intencion"]') });
    }
    return e;
  }

  function mostrarErrores(p, errores) {
    var caja = $('#error-' + p);
    if (errores[0].irAPaso != null) {
      estado.pasoActual = errores[0].irAPaso;
      pintarPaso(true);
    }
    caja.textContent = '';
    if (errores.length === 1) caja.textContent = errores[0].msj;
    else {
      caja.appendChild(el('p', null, 'Revisa lo siguiente:'));
      var ul = el('ul');
      errores.forEach(function (x) { ul.appendChild(el('li', null, x.msj)); });
      caja.appendChild(ul);
    }
    caja.classList.add('visible');
    errores.forEach(function (x) {
      var c = x.foco && x.foco.closest('.campo');
      if (c) c.classList.add('campo--invalido');
    });
    var f = errores[0].foco;
    if (f) {
      f.focus({ preventScroll: true });
      (f.closest('.campo') || caja).scrollIntoView({ block: 'center', behavior: reducido.matches ? 'auto' : 'smooth' });
    } else {
      caja.scrollIntoView({ block: 'center' });
    }
  }

  function limpiarCampo(n) {
    var c = n.closest('.campo');
    if (c) c.classList.remove('campo--invalido');
  }

  /* ==========================================================
     3. Validar pasos
     ========================================================== */
  function pintarPaso(animar) {
    var total = D.pasos.length;
    var i = estado.pasoActual;
    var p = D.pasos[i];
    var respondidos = D.pasos.filter(function (x) { return estado.frecuencias[x.id]; }).length;

    $('#progreso-relleno').style.width = (respondidos / total * 100) + '%';
    $('#progreso').setAttribute('aria-valuenow', respondidos);
    $('#progreso-texto').textContent = 'Paso ' + (i + 1) + ' de ' + total + ' · ' + respondidos + ' respondidos';
    $('#paso-num').textContent = F.dos(p.id);
    $('#paso-texto').textContent = p.texto;
    $$('.frecuencia').forEach(function (b) {
      b.setAttribute('aria-pressed', String(estado.frecuencias[p.id] === b.dataset.valor));
    });

    var primeroSinResponder = D.pasos.findIndex(function (x) { return !estado.frecuencias[x.id]; });
    var limite = primeroSinResponder < 0 ? total - 1 : primeroSinResponder;
    $$('#mapa-pasos button').forEach(function (b, k) {
      var r = estado.frecuencias[D.pasos[k].id];
      b.className = r ? 'r-' + r : '';
      b.disabled = k > limite;
      if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.setAttribute('aria-label', 'Paso ' + (k + 1) + (r ? ': ' + F.etiqueta(D.frecuencias, r) : ': sin responder'));
    });

    if (animar && !reducido.matches) {
      var t = $('#tarjeta-paso');
      t.classList.remove('entra');
      void t.offsetWidth;
      t.classList.add('entra');
    }
    pintarBarra();
  }

  function elegirFrecuencia(valor) {
    var i = estado.pasoActual;
    var p = D.pasos[i];
    estado.frecuencias[p.id] = valor;
    guardar();
    $('#error-pasos').classList.remove('visible');
    pintarPaso(false);
    clearTimeout(temporizadorPaso);
    if (i < D.pasos.length - 1) {
      temporizadorPaso = setTimeout(function () {
        if (estado.pantalla !== 'pasos' || estado.pasoActual !== i) return;
        estado.pasoActual = i + 1;
        guardar();
        pintarPaso(true);
        $('#paso-texto').focus();
      }, reducido.matches ? 120 : 340);
    } else {
      anunciar('Respondiste los ' + D.pasos.length + ' pasos. Toca Continuar.');
    }
  }

  /* ==========================================================
     4. Ordenar
     ========================================================== */
  function sincronizarOrden() {
    var incluidos = pasosQueHace().map(function (p) { return 'p' + p.id; })
      .concat(estado.propios.map(function (c) { return 'c' + c.id; }));
    var orden = estado.orden.filter(function (k) { return incluidos.indexOf(k) >= 0; });
    var faltan = incluidos.filter(function (k) { return orden.indexOf(k) < 0; });
    // La primera vez aparecen revueltos, para no sugerir el orden del blueprint.
    estado.orden = orden.concat(barajar(faltan));
    guardar();
  }

  function pintarOrden(enfocar) {
    var ol = $('#lista-orden');
    ol.innerHTML = '';
    var n = estado.orden.length;
    $('#lista-vacia').hidden = n > 0;

    estado.orden.forEach(function (k, i) {
      var propio = k.charAt(0) === 'c';
      var texto = textoDe(k);
      var li = el('li', 'item-orden' + (propio ? ' item-orden--propio' : ''));
      li.dataset.clave = k;

      var ag = el('button', 'agarre');
      ag.type = 'button';
      ag.innerHTML = ICONO.agarre;
      ag.setAttribute('aria-label', 'Mover: ' + texto + '. Posición ' + (i + 1) + ' de ' + n + '. Usa flechas arriba y abajo.');
      li.appendChild(ag);

      var cuerpo = el('div', 'item-orden__cuerpo');
      cuerpo.appendChild(el('span', 'item-orden__num', '#' + (i + 1)));
      var t = el('span', 'item-orden__texto', texto);
      if (propio) t.appendChild(el('span', 'etiqueta-propio', 'Propio'));
      cuerpo.appendChild(t);
      if (propio) {
        var q = el('button', 'item-orden__quitar', 'Quitar');
        q.type = 'button';
        q.setAttribute('aria-label', 'Quitar paso propio: ' + texto);
        cuerpo.appendChild(q);
      }
      li.appendChild(cuerpo);

      var mov = el('div', 'item-orden__mover');
      [[-1, 'arriba', 'Subir'], [1, 'abajo', 'Bajar']].forEach(function (d) {
        var b = el('button', 'mover');
        b.type = 'button';
        b.dataset.dir = d[0];
        b.innerHTML = ICONO[d[1]];
        b.setAttribute('aria-label', d[2] + ': ' + texto);
        b.disabled = (d[0] < 0 && i === 0) || (d[0] > 0 && i === n - 1);
        mov.appendChild(b);
      });
      li.appendChild(mov);
      ol.appendChild(li);
    });

    if (enfocar) {
      var item = ol.querySelector('[data-clave="' + enfocar.clave + '"]');
      if (!item) return;
      var objetivo = enfocar.origen === 'teclado' ? item.querySelector('.agarre')
        : item.querySelector('.mover[data-dir="' + enfocar.dir + '"]');
      if (!objetivo || objetivo.disabled) objetivo = item.querySelector('.mover:not([disabled])') || item.querySelector('.agarre');
      objetivo.focus();
      if (!reducido.matches) item.scrollIntoView({ block: 'nearest' });
    }
  }

  function moverItem(clave, dir, origen) {
    var i = estado.orden.indexOf(clave);
    var j = i + dir;
    if (i < 0 || j < 0 || j >= estado.orden.length) return;
    var t = estado.orden[i]; estado.orden[i] = estado.orden[j]; estado.orden[j] = t;
    estado.movimientos++;
    guardar();
    pintarOrden({ clave: clave, dir: dir, origen: origen });
    anunciar(textoDe(clave) + ': posición ' + (j + 1) + ' de ' + estado.orden.length + '.');
  }

  function agregarPropio() {
    var input = $('#propio-texto');
    var texto = input.value.replace(/\s+/g, ' ').trim();
    if (texto.length < 2) {
      mostrarErrores('ordenar', [{ msj: 'Escribe el paso que quieres agregar.', foco: input }]);
      return;
    }
    if (estado.propios.length >= 8) {
      mostrarErrores('ordenar', [{ msj: 'Puedes agregar hasta 8 pasos propios.', foco: input }]);
      return;
    }
    var id = Date.now().toString(36);
    estado.propios.push({ id: id, texto: texto });
    estado.orden.push('c' + id);
    guardar();
    input.value = '';
    $('#error-ordenar').classList.remove('visible');
    pintarOrden();
    anunciar('Agregaste “' + texto + '” al final. Muévelo a su lugar.');
    var nuevo = $('#lista-orden [data-clave="c' + id + '"]');
    if (nuevo && !reducido.matches) nuevo.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function quitarPropio(clave) {
    var texto = textoDe(clave);
    estado.propios = estado.propios.filter(function (c) { return 'c' + c.id !== clave; });
    estado.orden = estado.orden.filter(function (k) { return k !== clave; });
    guardar();
    pintarOrden();
    anunciar('Quitaste “' + texto + '”.');
    $('#propio-texto').focus();
  }

  /* ==========================================================
     6. Mueble
     ========================================================== */
  function construirModulos() {
    var cont = $('#modulos');
    cont.innerHTML = '';
    D.modulos.forEach(function (m) {
      var b = el('button', 'modulo');
      b.type = 'button';
      b.dataset.id = m.id;
      b.setAttribute('aria-pressed', 'false');
      b.appendChild(el('span', 'modulo__nombre', m.nombre));
      b.appendChild(el('span', 'interruptor'));
      b.lastChild.setAttribute('aria-hidden', 'true');
      b.appendChild(el('span', 'modulo__desc', m.descripcion));

      var cubre = el('span', 'modulo__cubre');
      cubre.appendChild(el('span', null, 'Cubre en tu rutina:'));
      var chips = el('span', 'chips');
      if (m.pasos.length) {
        m.pasos.forEach(function (pid) {
          var p = D.pasos.find(function (x) { return x.id === pid; });
          var nunca = estado.frecuencias[pid] === 'nunca';
          var c = el('span', nunca ? 'no-lo-hace' : null, pid + '. ' + p.corto);
          if (nunca) c.appendChild(el('span', 'sr-only', ' (no lo haces)'));
          chips.appendChild(c);
        });
      } else {
        chips.appendChild(el('span', null, m.cubreTexto || 'Pasos propios'));
      }
      cubre.appendChild(chips);
      b.appendChild(cubre);
      cont.appendChild(b);
    });
  }

  function pintarMueble() {
    var limite = F.limiteNiveles(estado.perfil.espacio);
    var n = estado.modulos.length;
    $('#mueble-svg').innerHTML = M.svg(estado.modulos, limite);

    var cubiertos = F.cobertura(estado.modulos);
    var mios = pasosQueHace();
    var mios_cubiertos = mios.filter(function (p) { return cubiertos.has(p.id); }).length;

    var cob = $('#dato-cobertura');
    cob.textContent = String(cubiertos.size);
    cob.appendChild(el('small', null, ' de ' + D.pasos.length + ' pasos cubiertos'));
    $('#dato-tus').textContent = 'De los pasos que tú haces: ' + mios_cubiertos + ' de ' + mios.length + '.';

    var med = M.medidas(n);
    $('#dato-medidas').textContent = n
      ? 'Tamaño aprox.: ' + med.ancho + ' × ' + med.fondo + ' cm de base, ' + med.alto + ' cm de alto (' + n + (n === 1 ? ' nivel)' : ' niveles)') + '.'
      : 'Base de ' + med.ancho + ' × ' + med.fondo + ' cm. Cada nivel suma ' + D.medidas.altoNivel + ' cm.';

    var aviso = $('#aviso-espacio');
    if (limite && n > limite) {
      var esp = F.etiqueta(D.espacios, estado.perfil.espacio);
      aviso.textContent = 'Tu mueble tiene ' + n + ' niveles y en “' + esp + '” caben unos ' + limite + '. ¿Quitarías alguno?';
      aviso.hidden = false;
    } else {
      aviso.hidden = true;
    }

    $$('#modulos .modulo').forEach(function (b) {
      b.setAttribute('aria-pressed', String(estado.modulos.indexOf(b.dataset.id) >= 0));
    });
    pintarPreguntasModulo();
  }

  function pintarPreguntasModulo() {
    var cont = $('#preguntas-modulo');
    cont.innerHTML = '';
    var mods = F.modulosOrdenados(estado.modulos);
    if (!mods.length) return;
    cont.appendChild(el('h2', null, D.mueble.preguntaModulo));
    mods.forEach(function (m) {
      var fs = el('fieldset', 'campo');
      fs.appendChild(el('legend', null, m.nombre));
      var op = el('div', 'opciones opciones--fila');
      construirOpciones(op, 'pm-' + m.id, D.respuestasModulo, estado.respuestasModulo[m.id]);
      fs.appendChild(op);
      cont.appendChild(fs);
    });
  }

  /* ==========================================================
     7. Gracias: envío, resumen e imagen
     ========================================================== */
  function pintarResumen() {
    var ol = $('#resumen-rutina');
    ol.innerHTML = '';
    if (!estado.orden.length) ol.appendChild(el('li', null, 'Sin pasos ordenados'));
    estado.orden.forEach(function (k) { ol.appendChild(el('li', null, textoDe(k))); });
    var limite = F.limiteNiveles(estado.perfil.espacio);
    $('#resumen-mueble').innerHTML = M.svg(estado.modulos, limite);
    var n = estado.modulos.length;
    $('#resumen-mueble-datos').textContent = n
      ? n + (n === 1 ? ' nivel' : ' niveles') + ' · cubre ' + F.cobertura(estado.modulos).size + ' de ' + D.pasos.length +
        ' pasos · ' + D.medidas.baseAncho + ' × ' + D.medidas.baseFondo + ' × ' + M.medidas(n).alto + ' cm'
      : 'No elegiste módulos.';
  }

  async function enviarRespuesta() {
    if (enviando) return;
    enviando = true;
    if (!estado.fila) {
      estado.fila = F.construir({
        id: estado.id, fecha: new Date(), inicio: estado.inicio, perfil: estado.perfil,
        frecuencias: estado.frecuencias, orden: estado.orden, propios: estado.propios,
        simultaneos: estado.simultaneos, movimientos: estado.movimientos, imprevistos: estado.imprevistos,
        modulos: estado.modulos, respuestasModulo: estado.respuestasModulo,
        cambios: estado.cambios, intencion: estado.intencion
      });
      guardar();
    }
    // Primero se guarda en el dispositivo: si se cierra la pestaña, no se pierde.
    E.guardarPendiente(estado.fila);
    pintarEstado('enviando');
    var r = await E.enviar(estado.fila);
    enviando = false;
    if (r.ok) {
      E.quitarPendiente(estado.fila.id_participante);
      estado.enviado = true;
      guardar();
      pintarEstado('ok');
    } else {
      pintarEstado('error', r.motivo);
    }
  }

  function pintarEstado(tipo, motivo) {
    var c = $('#estado-envio');
    c.className = 'tarjeta estado-envio' + (tipo === 'ok' ? ' estado-envio--ok' : tipo === 'error' ? ' estado-envio--error' : '');
    c.innerHTML = '';
    var icono = document.createElement('div');
    icono.innerHTML = tipo === 'ok' ? ICONO.ok : tipo === 'error' ? ICONO.error : ICONO.carga;
    c.appendChild(icono.firstChild);
    var cuerpo = el('div');
    c.appendChild(cuerpo);

    if (tipo === 'enviando') {
      cuerpo.appendChild(el('strong', null, 'Enviando tus respuestas…'));
      return;
    }
    if (tipo === 'ok') {
      cuerpo.appendChild(el('strong', null, 'Respuesta recibida. ¡Listo!'));
      return;
    }
    var titulo, texto;
    if (motivo === 'sin-url') {
      titulo = 'Modo de prueba: no hay hoja de respuestas conectada.';
      texto = 'Tu respuesta quedó guardada en este dispositivo. Puedes descargarla como archivo.';
    } else {
      titulo = 'No pudimos enviar tus respuestas.';
      texto = 'Quedaron guardadas en este dispositivo. Revisa tu conexión y vuelve a intentarlo, o descárgalas y compártelas con el equipo.';
    }
    cuerpo.appendChild(el('strong', null, titulo));
    cuerpo.appendChild(el('p', null, texto));
    var acc = el('div', 'acciones');
    if (motivo !== 'sin-url') acc.appendChild(boton('Reintentar envío', 'reintentar', true));
    acc.appendChild(boton('Descargar mis respuestas (JSON)', 'descargar', motivo === 'sin-url'));
    var pend = E.pendientes().length;
    if (pend > 1) acc.appendChild(boton('Descargar las ' + pend + ' respuestas guardadas aquí', 'descargar-todas', false));
    cuerpo.appendChild(acc);
  }

  function boton(texto, accion, primario) {
    var b = el('button', 'btn btn--chico' + (primario ? ' btn--primario' : ''), texto);
    b.type = 'button';
    b.dataset.accion = accion;
    return b;
  }

  /* ---------- Imagen PNG ---------- */
  function partirLineas(ctx, texto, ancho) {
    var palabras = texto.split(' ');
    var lineas = [];
    var actual = '';
    palabras.forEach(function (p) {
      var prueba = actual ? actual + ' ' + p : p;
      if (ctx.measureText(prueba).width > ancho && actual) { lineas.push(actual); actual = p; }
      else actual = prueba;
    });
    if (actual) lineas.push(actual);
    return lineas;
  }

  async function generarPNG() {
    var btn = $('#btn-png');
    btn.disabled = true;
    try {
      if (document.fonts && document.fonts.load) {
        await Promise.all([
          document.fonts.load('96px Anton'),
          document.fonts.load('600 30px "Open Sans"'),
          document.fonts.load('700 13px "Open Sans"')
        ]).catch(function () {});
      }
      var col = { fondo: '#FDF7B8', tinta: '#111111', suave: '#3b3a2c', tarjeta: '#FFFCE6', mal: '#8a1414' };
      var W = 1080, P = 80, ANCHO_TEXTO = W - P * 2 - 80;
      var lienzo = document.createElement('canvas');
      var ctx = lienzo.getContext('2d');

      ctx.font = '600 32px "Open Sans", sans-serif';
      var items = (estado.orden.length ? estado.orden.map(textoDe) : ['Sin pasos ordenados']).map(function (t) {
        return partirLineas(ctx, t, ANCHO_TEXTO);
      });
      var altoLista = items.reduce(function (s, l) { return s + Math.max(56, l.length * 42) + 14; }, 0);
      var escala = 2.4;
      var altoMueble = M.geom(estado.modulos.length).H * escala;
      var H = P + 40 + 110 + 60 + altoLista + 60 + 90 + altoMueble + 70 + 90 + P;

      lienzo.width = W;
      lienzo.height = Math.round(H);
      ctx.fillStyle = col.fondo;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = col.tinta;
      ctx.lineWidth = 6;
      ctx.strokeRect(24, 24, W - 48, H - 48);

      var y = P;
      ctx.fillStyle = col.tinta;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.font = '700 24px "Open Sans", sans-serif';
      ctx.fillText('MI RUTINA DE CIERRE DE DÍA', P, y + 24);
      y += 40;
      ctx.font = '110px Anton, Impact, sans-serif';
      ctx.fillText('MI NOCHE', P, y + 100);
      y += 110 + 60;

      items.forEach(function (lineas, i) {
        var alto = Math.max(56, lineas.length * 42);
        ctx.fillStyle = col.tinta;
        ctx.beginPath();
        ctx.arc(P + 26, y + 26, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = col.fondo;
        ctx.font = '30px Anton, Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(i + 1), P + 26, y + 37);
        ctx.textAlign = 'left';
        ctx.fillStyle = col.tinta;
        ctx.font = '600 32px "Open Sans", sans-serif';
        lineas.forEach(function (l, k) { ctx.fillText(l, P + 80, y + 38 + k * 42); });
        y += alto + 14;
      });

      y += 30;
      ctx.fillRect(P, y, W - P * 2, 4);
      y += 30;
      ctx.font = '80px Anton, Impact, sans-serif';
      ctx.fillText('MI MUEBLE', P, y + 74);
      y += 90;

      var limite = F.limiteNiveles(estado.perfil.espacio);
      var anchoMueble = M.geom(0).W * escala;
      M.dibujarCanvas(ctx, estado.modulos, limite, (W - anchoMueble) / 2, y, escala, col);
      y += altoMueble + 20;

      var n = estado.modulos.length;
      ctx.fillStyle = col.tinta;
      ctx.textAlign = 'center';
      ctx.font = '700 30px "Open Sans", sans-serif';
      ctx.fillText(n
        ? n + (n === 1 ? ' nivel' : ' niveles') + ' · cubre ' + F.cobertura(estado.modulos).size + ' de ' + D.pasos.length +
          ' pasos · ' + D.medidas.baseAncho + ' × ' + D.medidas.baseFondo + ' × ' + M.medidas(n).alto + ' cm'
        : 'Sin módulos', W / 2, y + 30);
      y += 90;
      ctx.font = '400 22px "Open Sans", sans-serif';
      ctx.fillStyle = col.suave;
      ctx.fillText(D.proyecto.curso + ' · respuesta anónima · ' + new Date().toLocaleDateString('es-MX'), W / 2, y + 10);

      await new Promise(function (resolver) {
        lienzo.toBlob(function (blob) {
          var a = document.createElement('a');
          a.download = 'mi-noche-y-mi-mueble.png';
          a.href = blob ? URL.createObjectURL(blob) : lienzo.toDataURL('image/png');
          document.body.appendChild(a);
          a.click();
          setTimeout(function () { if (blob) URL.revokeObjectURL(a.href); a.remove(); resolver(); }, 1500);
        }, 'image/png');
      });
      anunciar('Imagen descargada.');
    } catch (e) {
      anunciar('No se pudo crear la imagen.');
      console.error(e);
    } finally {
      btn.disabled = false;
    }
  }

  iniciar();
})();
