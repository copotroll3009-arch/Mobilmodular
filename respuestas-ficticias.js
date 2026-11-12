/*
 * ⚠️  RESPUESTAS FICTICIAS — SOLO PARA PROBAR resultados.html  ⚠️
 * No son personas reales. Se cargan con resultados.html?demo=1
 * y solo si CONFIG.DEMO_PERMITIDO es true.
 * Todas tienen id "FICTICIA-..." y resultados.html las excluye de los datos reales.
 *
 * frec: 14 letras, una por paso del 1 al 14 → S = siempre, A = a veces, N = nunca
 * orden: números de paso y textos (pasos propios), en el orden que "dio" la persona
 */
(function () {
  'use strict';
  var mapa = { S: 'siempre', A: 'a_veces', N: 'nunca' };

  var crudas = [
    {
      id: 'FICTICIA-01', fecha: '2026-11-03T22:14:00', edad: 22, ocupacion: 'estudiante', espacio: 'muy_poco', renta: 'si',
      frec: 'SSNASSANASSSSA',
      orden: [1, 2, 'Le doy de comer a mi gato', 4, 5, 10, 7, 6, 9, 11, 12, 13, 14],
      simultaneos: 'Ceno mientras veo series', imprevistos: 'Planificar el día siguiente',
      modulos: ['aseo', 'carga', 'mascotas'], resp: { carga: 'si', aseo: 'tal_vez', mascotas: 'si' },
      cambios: '[FICTICIA] Que el módulo de carga tenga lugar para audífonos.', intencion: 'lo_haria', movimientos: 9
    },
    {
      id: 'FICTICIA-02', fecha: '2026-11-04T23:02:00', edad: 26, ocupacion: 'horario_fijo', espacio: 'pared_pequena', renta: 'no',
      frec: 'SSSSSSAAASSSSS',
      orden: [1, 2, 3, 4, 5, 10, 11, 6, 8, 9, 12, 7, 13, 14],
      simultaneos: 'Cargo el celular mientras lo uso para relajarme', imprevistos: 'Lavar los platos',
      modulos: ['cierre', 'cocina', 'ropa', 'checklist', 'carga'],
      resp: { cierre: 'si', cocina: 'no', ropa: 'si', checklist: 'si', carga: 'si' },
      cambios: '[FICTICIA] La bandeja de cocina la haría más pequeña.', intencion: 'compraria', movimientos: 14
    },
    {
      id: 'FICTICIA-03', fecha: '2026-11-05T21:40:00', edad: 24, ocupacion: 'freelance', espacio: 'amplio', renta: 'si',
      frec: 'AANNASNASSSSSN',
      orden: ['Saco a pasear a mi perro', 10, 11, 1, 2, 6, 5, 8, 9, 12, 13],
      simultaneos: '', imprevistos: 'El aseo, me quedo dormido viendo el celular',
      modulos: ['cierre', 'mascotas', 'ropa', 'aseo', 'bitacora', 'checklist', 'carga'],
      resp: { bitacora: 'si', carga: 'si', mascotas: 'si', aseo: 'tal_vez', ropa: 'no', checklist: 'si', cierre: 'tal_vez' },
      cambios: '[FICTICIA] Quitaría el de ropa, ya tengo clóset.', intencion: 'compraria', movimientos: 11
    },
    {
      id: 'FICTICIA-04', fecha: '2026-11-06T00:25:00', edad: 21, ocupacion: 'ambas', espacio: 'muy_poco', renta: 'si',
      frec: 'SNNASANNASSSSN',
      orden: [1, 5, 4, 10, 6, 9, 11, 12, 13],
      simultaneos: 'Me relajo y pongo la alarma al mismo tiempo', imprevistos: 'Organizar mis cosas para mañana',
      modulos: ['ropa', 'bitacora', 'checklist', 'carga'],
      resp: { carga: 'si', checklist: 'tal_vez', bitacora: 'no', ropa: 'si' },
      cambios: '[FICTICIA] Algo que se doble cuando no lo uso.', intencion: 'lo_haria', movimientos: 6
    },
    {
      id: 'FICTICIA-05', fecha: '2026-11-07T22:50:00', edad: 29, ocupacion: 'horario_fijo', espacio: 'pared_pequena', renta: 'no',
      frec: 'SSANSSSASSSSSA',
      orden: [1, 2, 3, 5, 6, 7, 10, 8, 9, 11, 12, 13, 14],
      simultaneos: 'Planifico y reviso el día al mismo tiempo', imprevistos: 'Revisar cómo me fue',
      modulos: ['cierre', 'cocina', 'checklist', 'carga'],
      resp: { cierre: 'si', checklist: 'si', carga: 'si', cocina: 'tal_vez' },
      cambios: '[FICTICIA] Que tenga un lugar para llaves y cartera.', intencion: 'no_usaria', movimientos: 0
    }
  ];

  window.RESPUESTAS_FICTICIAS = crudas.map(function (c) {
    var frecuencias = {};
    c.frec.split('').forEach(function (l, i) { frecuencias[i + 1] = mapa[l]; });
    var propios = [];
    var orden = c.orden.map(function (x, i) {
      if (typeof x === 'number') return 'p' + x;
      var id = 'f' + i;
      propios.push({ id: id, texto: x });
      return 'c' + id;
    });
    var fecha = new Date(c.fecha);
    return window.Fila.construir({
      id: c.id,
      fecha: fecha,
      inicio: new Date(fecha.getTime() - 5.5 * 60000).toISOString(),
      perfil: { edad: c.edad, ocupacion: c.ocupacion, espacio: c.espacio, renta: c.renta },
      frecuencias: frecuencias,
      orden: orden,
      propios: propios,
      simultaneos: c.simultaneos,
      movimientos: c.movimientos,
      imprevistos: c.imprevistos,
      modulos: c.modulos,
      respuestasModulo: c.resp,
      cambios: c.cambios,
      intencion: c.intencion
    });
  });
})();
