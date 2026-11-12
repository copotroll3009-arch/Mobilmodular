/*
 * ordenar.js — Arrastrar y soltar con Pointer Events (dedo, mouse y pluma),
 * sin librerías. El arrastre empieza solo desde la agarradera (.agarre),
 * así el resto de la tarjeta deja hacer scroll con el dedo.
 * Con teclado: flechas ↑ ↓ sobre la agarradera, o los botones Subir/Bajar.
 *
 * Uso: Ordenable(listaOl, {
 *   alSoltar: function (clavesEnOrden, claveMovida, cambio) {},
 *   alMover:  function (clave, direccion, origen) {}   // origen: 'teclado' | 'boton'
 * })
 */
window.Ordenable = function (lista, opciones) {
  'use strict';
  var sesion = null;
  var MARGEN = 90;

  function claves() {
    return Array.prototype.slice.call(lista.querySelectorAll('.item-orden:not(.hueco)'))
      .map(function (li) { return li.dataset.clave; });
  }

  function alturaBarra() {
    var b = document.querySelector('.barra');
    return b && !b.hidden ? b.getBoundingClientRect().height : 0;
  }

  function iniciar(e) {
    var agarre = e.target.closest('.agarre');
    if (!agarre || !lista.contains(agarre) || sesion) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    var item = agarre.closest('.item-orden');
    e.preventDefault();

    var r = item.getBoundingClientRect();
    var hueco = document.createElement('li');
    hueco.className = 'item-orden hueco';
    hueco.setAttribute('aria-hidden', 'true');
    hueco.style.height = r.height + 'px';
    lista.insertBefore(hueco, item);

    item.style.left = r.left + 'px';
    item.style.top = r.top + 'px';
    item.style.width = r.width + 'px';
    item.classList.add('arrastrando');

    sesion = {
      item: item, hueco: hueco, agarre: agarre, id: e.pointerId,
      dy: e.clientY - r.top, y: e.clientY,
      antes: claves().join('|'), raf: 0
    };
    try { agarre.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
    agarre.addEventListener('pointermove', mover);
    agarre.addEventListener('pointerup', terminar);
    agarre.addEventListener('pointercancel', terminar);
    agarre.addEventListener('lostpointercapture', terminar);
    sesion.raf = requestAnimationFrame(bucle);
  }

  function mover(e) {
    if (!sesion || e.pointerId !== sesion.id) return;
    e.preventDefault();
    sesion.y = e.clientY;
  }

  function bucle() {
    if (!sesion) return;
    // Auto-scroll cerca de los bordes
    var abajo = window.innerHeight - alturaBarra();
    if (sesion.y < MARGEN) window.scrollBy(0, -Math.min(12, Math.ceil((MARGEN - sesion.y) / 8)));
    else if (sesion.y > abajo - MARGEN) window.scrollBy(0, Math.min(12, Math.ceil((sesion.y - (abajo - MARGEN)) / 8)));

    sesion.item.style.top = (sesion.y - sesion.dy) + 'px';

    var hermanos = Array.prototype.filter.call(lista.children, function (n) {
      return n !== sesion.item && n !== sesion.hueco;
    });
    var destino = null;
    for (var i = 0; i < hermanos.length; i++) {
      var b = hermanos[i].getBoundingClientRect();
      if (sesion.y < b.top + b.height / 2) { destino = hermanos[i]; break; }
    }
    if (destino) {
      if (sesion.hueco.nextElementSibling !== destino) lista.insertBefore(sesion.hueco, destino);
    } else if (lista.lastElementChild !== sesion.hueco) {
      lista.appendChild(sesion.hueco);
    }
    sesion.raf = requestAnimationFrame(bucle);
  }

  function terminar() {
    if (!sesion) return;
    var s = sesion;
    sesion = null;
    cancelAnimationFrame(s.raf);
    s.agarre.removeEventListener('pointermove', mover);
    s.agarre.removeEventListener('pointerup', terminar);
    s.agarre.removeEventListener('pointercancel', terminar);
    s.agarre.removeEventListener('lostpointercapture', terminar);

    lista.insertBefore(s.item, s.hueco);
    s.hueco.remove();
    s.item.classList.remove('arrastrando');
    s.item.style.left = s.item.style.top = s.item.style.width = '';

    var ahora = claves();
    if (opciones.alSoltar) opciones.alSoltar(ahora, s.item.dataset.clave, ahora.join('|') !== s.antes);
  }

  lista.addEventListener('pointerdown', iniciar);

  // Evita el menú contextual por pulsación larga sobre la agarradera
  lista.addEventListener('contextmenu', function (e) {
    if (e.target.closest('.agarre')) e.preventDefault();
  });

  lista.addEventListener('keydown', function (e) {
    var agarre = e.target.closest('.agarre');
    if (!agarre) return;
    var dir = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (!dir) return;
    e.preventDefault();
    opciones.alMover(agarre.closest('.item-orden').dataset.clave, dir, 'teclado');
  });

  lista.addEventListener('click', function (e) {
    var b = e.target.closest('.mover');
    if (!b || b.disabled) return;
    opciones.alMover(b.closest('.item-orden').dataset.clave, Number(b.dataset.dir), 'boton');
  });
};
