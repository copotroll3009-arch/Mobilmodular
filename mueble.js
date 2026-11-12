/*
 * mueble.js — Dibuja el mueble modular (marco de tubo negro, tipo PVC)
 * en SVG para la pantalla y en <canvas> para la imagen PNG.
 */
window.Mueble = (function () {
  'use strict';
  var D = window.DATOS;
  var contador = 0;

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function geom(n) {
    var g = { LV: 56, TOP: 26, PATA: 20, X1: 40, X2: 200, W: 240 };
    g.niveles = Math.max(n, 1);
    g.base = g.TOP + g.niveles * g.LV;
    g.H = g.base + g.PATA + 8;
    return g;
  }

  function medidas(n) {
    var m = D.medidas;
    return { ancho: m.baseAncho, fondo: m.baseFondo, alto: n * m.altoNivel };
  }

  function descripcion(mods, limite) {
    if (!mods.length) return 'Mueble vacío: todavía no hay módulos activos.';
    var t = 'Mueble de ' + mods.length + (mods.length === 1 ? ' nivel' : ' niveles') +
      ', de abajo hacia arriba: ' + mods.map(function (m) { return m.nombre; }).join(', ') + '.';
    if (limite && mods.length > limite) t += ' Rebasa los ' + limite + ' niveles que caben en tu espacio.';
    return t;
  }

  /* ---------- SVG ---------- */
  function svg(ids, limite) {
    var mods = window.Fila.modulosOrdenados(ids);
    var n = mods.length;
    var g = geom(n);
    var pid = 'rayas-' + (++contador);
    var s = [];
    s.push('<svg viewBox="0 0 ' + g.W + ' ' + g.H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(descripcion(mods, limite)) + '">');
    s.push('<defs><pattern id="' + pid + '" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect width="10" height="10" class="nivel"/><line x1="0" y1="0" x2="0" y2="10" class="raya" stroke-opacity=".45"/></pattern></defs>');

    // Niveles (rellenos)
    if (n === 0) {
      s.push('<rect x="' + (g.X1 + 4) + '" y="' + (g.TOP + 4) + '" width="' + (g.X2 - g.X1 - 8) + '" height="' + (g.LV - 8) +
        '" fill="none" class="tubo-delgado" stroke-dasharray="6 6"/>');
      s.push('<text x="' + g.W / 2 + '" y="' + (g.TOP + g.LV / 2 + 5) + '" text-anchor="middle" class="vacio-texto">Activa un módulo</text>');
    }
    mods.forEach(function (m, i) {
      var y = g.base - (i + 1) * g.LV;
      var excede = limite && i >= limite;
      s.push('<rect x="' + (g.X1 + 4) + '" y="' + (y + 4) + '" width="' + (g.X2 - g.X1 - 8) + '" height="' + (g.LV - 8) +
        '" rx="4" class="nivel"' + (excede ? ' style="fill:url(#' + pid + ')"' : '') + '/>');
      s.push('<text x="' + g.W / 2 + '" y="' + (y + g.LV / 2 + 5) + '" text-anchor="middle" class="nivel-texto">' + esc(m.corto) + '</text>');
    });

    // Marco de tubo
    var arriba = g.base - g.niveles * g.LV;
    s.push('<line x1="' + g.X1 + '" y1="' + arriba + '" x2="' + g.X1 + '" y2="' + (g.base + g.PATA) + '" class="tubo"/>');
    s.push('<line x1="' + g.X2 + '" y1="' + arriba + '" x2="' + g.X2 + '" y2="' + (g.base + g.PATA) + '" class="tubo"/>');
    for (var k = 0; k <= g.niveles; k++) {
      var yy = g.base - k * g.LV;
      s.push('<line x1="' + g.X1 + '" y1="' + yy + '" x2="' + g.X2 + '" y2="' + yy + '" class="tubo"/>');
      s.push('<circle cx="' + g.X1 + '" cy="' + yy + '" r="6.5" fill="currentColor" class="codo"/>');
      s.push('<circle cx="' + g.X2 + '" cy="' + yy + '" r="6.5" fill="currentColor" class="codo"/>');
    }
    // Patas
    s.push('<line x1="' + (g.X1 - 10) + '" y1="' + (g.base + g.PATA) + '" x2="' + (g.X1 + 10) + '" y2="' + (g.base + g.PATA) + '" class="tubo"/>');
    s.push('<line x1="' + (g.X2 - 10) + '" y1="' + (g.base + g.PATA) + '" x2="' + (g.X2 + 10) + '" y2="' + (g.base + g.PATA) + '" class="tubo"/>');

    // Línea de límite
    if (limite && n > limite) {
      var yl = g.base - limite * g.LV;
      s.push('<line x1="8" y1="' + yl + '" x2="' + (g.W - 8) + '" y2="' + yl + '" class="limite"/>');
      s.push('<text x="2" y="' + (yl - 5) + '" class="limite-texto">LÍMITE</text>');
    }
    s.push('</svg>');
    // Los círculos usan currentColor: el contenedor define color con var(--tinta)
    return s.join('');
  }

  /* ---------- Canvas (para el PNG) ---------- */
  // Dibuja el mueble con su esquina superior izquierda en (x, y) y escala "e". Devuelve el alto usado.
  function dibujarCanvas(ctx, ids, limite, x, y, e, colores) {
    var mods = window.Fila.modulosOrdenados(ids);
    var n = mods.length;
    var g = geom(n);
    var c = colores;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(e, e);

    mods.forEach(function (m, i) {
      var yy = g.base - (i + 1) * g.LV;
      var excede = limite && i >= limite;
      ctx.fillStyle = c.tarjeta;
      redondeado(ctx, g.X1 + 4, yy + 4, g.X2 - g.X1 - 8, g.LV - 8, 4);
      ctx.fill();
      if (excede) {
        ctx.save();
        redondeado(ctx, g.X1 + 4, yy + 4, g.X2 - g.X1 - 8, g.LV - 8, 4);
        ctx.clip();
        ctx.strokeStyle = c.mal; ctx.lineWidth = 3; ctx.globalAlpha = 0.4;
        for (var r = -g.LV; r < g.X2; r += 10) {
          ctx.beginPath(); ctx.moveTo(g.X1 + r, yy + g.LV); ctx.lineTo(g.X1 + r + g.LV, yy); ctx.stroke();
        }
        ctx.restore();
      }
      ctx.fillStyle = c.tinta;
      ctx.font = '700 13px "Open Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.corto, g.W / 2, yy + g.LV / 2 + 1);
    });
    if (n === 0) {
      ctx.fillStyle = c.tinta;
      ctx.font = '600 13px "Open Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sin módulos', g.W / 2, g.TOP + g.LV / 2 + 4);
    }

    ctx.strokeStyle = c.tinta;
    ctx.fillStyle = c.tinta;
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    var arriba = g.base - g.niveles * g.LV;
    linea(ctx, g.X1, arriba, g.X1, g.base + g.PATA);
    linea(ctx, g.X2, arriba, g.X2, g.base + g.PATA);
    for (var k = 0; k <= g.niveles; k++) {
      var yk = g.base - k * g.LV;
      linea(ctx, g.X1, yk, g.X2, yk);
      ctx.beginPath(); ctx.arc(g.X1, yk, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(g.X2, yk, 6.5, 0, Math.PI * 2); ctx.fill();
    }
    linea(ctx, g.X1 - 10, g.base + g.PATA, g.X1 + 10, g.base + g.PATA);
    linea(ctx, g.X2 - 10, g.base + g.PATA, g.X2 + 10, g.base + g.PATA);

    if (limite && n > limite) {
      var yl = g.base - limite * g.LV;
      ctx.strokeStyle = c.mal; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
      linea(ctx, 8, yl, g.W - 8, yl);
      ctx.setLineDash([]);
      ctx.fillStyle = c.mal; ctx.font = '700 10px "Open Sans", sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('LÍMITE', 2, yl - 5);
    }
    ctx.restore();
    return g.H * e;
  }

  function linea(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function redondeado(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  return { svg: svg, dibujarCanvas: dibujarCanvas, geom: geom, medidas: medidas, descripcion: descripcion };
})();
