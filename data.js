/*
 * data.js — CONTENIDO del cuestionario.
 * Edita aquí pasos, módulos, preguntas y opciones sin tocar la lógica.
 *
 * Reglas para no romper nada:
 *  - No cambies los "id" ni los "valor" una vez que empiece el trabajo de campo
 *    (el análisis y la Google Sheet dependen de ellos). Sí puedes cambiar textos.
 *  - Los pasos deben seguir numerados del 1 al 14 en el orden del blueprint.
 */
window.DATOS = {
  version: '1.0',

  proyecto: {
    nombre: 'Validación de rutina de cierre de día',
    curso: 'Proyecto universitario de Diseño de Servicios'
  },

  bienvenida: {
    titulo: 'Tu noche, paso a paso',
    lineas: [
      'Estamos diseñando un mueble modular que ayude a cerrar el día y descansar mejor. Queremos saber cómo es de verdad tu rutina, no cómo creemos que es.',
      'Toma unos 5 minutos. Vas a marcar qué haces, ordenarlo arrastrando y armar tu propio mueble.',
      'No pedimos tu nombre ni datos de contacto. Tus respuestas son anónimas y solo se usan para este proyecto escolar.'
    ],
    consentimiento: 'Acepto participar de forma voluntaria y anónima.',
    boton: 'Empezar'
  },

  /* ---------- PERFIL ---------- */
  perfil: {
    titulo: 'Un poco de ti',
    preguntaEdad: '¿Qué edad tienes?',
    edadMin: 15,
    edadMax: 99,
    preguntaOcupacion: '¿A qué te dedicas?',
    preguntaEspacio: '¿Cuánto espacio tienes para un mueble en tu cuarto?',
    preguntaRenta: '¿Rentas o te mudas seguido?'
  },

  ocupaciones: [
    { valor: 'estudiante', etiqueta: 'Estudiante' },
    { valor: 'horario_fijo', etiqueta: 'Trabajo con horario fijo' },
    { valor: 'freelance', etiqueta: 'Freelance o sin horario fijo' },
    { valor: 'ambas', etiqueta: 'Estudio y trabajo' }
  ],

  // "niveles" = cuántos niveles del mueble caben, aproximadamente.
  espacios: [
    { valor: 'muy_poco', etiqueta: 'Muy poco espacio', niveles: 3 },
    { valor: 'pared_pequena', etiqueta: 'Una pared pequeña', niveles: 5 },
    { valor: 'amplio', etiqueta: 'Espacio amplio', niveles: 8 }
  ],

  renta: [
    { valor: 'si', etiqueta: 'Sí, rento o me mudo seguido' },
    { valor: 'no', etiqueta: 'No' }
  ],

  /* ---------- PASOS DEL BLUEPRINT (supuestos a validar) ---------- */
  pasos: [
    { id: 1, texto: 'Cierro mis actividades de trabajo o estudio', corto: 'Cerrar trabajo o estudio' },
    { id: 2, texto: 'Guardo mis herramientas de trabajo en un espacio determinado', corto: 'Guardar herramientas' },
    { id: 3, texto: 'Hago la cena en casa', corto: 'Cenar en casa' },
    { id: 4, texto: 'Lavo platos o tiro residuos después de cenar', corto: 'Lavar platos o tirar residuos' },
    { id: 5, texto: 'Me cambio a ropa de descanso y dejo la ropa sucia en un lugar', corto: 'Ropa de descanso' },
    { id: 6, texto: 'Hago mi aseo (dientes, cara, cabello)', corto: 'Aseo' },
    { id: 7, texto: 'Reviso cómo me fue en el día', corto: 'Revisar el día' },
    { id: 8, texto: 'Planifico el día siguiente por la noche', corto: 'Planificar mañana' },
    { id: 9, texto: 'Dejo organizados mis objetos para mañana', corto: 'Organizar objetos' },
    { id: 10, texto: 'Hago algo para relajarme (música, lectura, podcast, pantalla)', corto: 'Relajarme' },
    { id: 11, texto: 'Dejo el celular cargando', corto: 'Cargar celular' },
    { id: 12, texto: 'Programo la alarma', corto: 'Programar alarma' },
    { id: 13, texto: 'Apago la alarma al despertar y reviso cómo dormí', corto: 'Despertar y revisar sueño' },
    { id: 14, texto: 'Desayuno en casa', corto: 'Desayunar en casa' }
  ],

  validarPasos: {
    titulo: '¿Qué haces de verdad?',
    instruccion: 'Piensa en una noche normal entre semana. ¿Con qué frecuencia haces esto?'
  },

  frecuencias: [
    { valor: 'siempre', etiqueta: 'Siempre' },
    { valor: 'a_veces', etiqueta: 'A veces' },
    { valor: 'nunca', etiqueta: 'Nunca' }
  ],

  /* ---------- ORDENAR ---------- */
  ordenar: {
    titulo: 'Ordena tu noche',
    instruccion: 'Los pasos aparecen revueltos. Arrástralos desde el ícono de puntos hasta dejarlos en el orden en que los haces, del primero al último. También puedes usar las flechas.',
    avisoSinMover: 'Aún no has movido ningún paso. ¿Ese es de verdad tu orden? Si sí, toca “Siguiente” otra vez.',
    vacio: 'Marcaste todos los pasos como “nunca”. Puedes agregar tus propios pasos abajo o continuar.',
    preguntaPropios: '¿Haces algo más que no aparece? Agrégalo y ordénalo.',
    ejemploPropio: 'Ej.: Le doy de comer a mi perro',
    preguntaSimultaneos: '¿Hay pasos que haces al mismo tiempo? ¿Cuáles?',
    ejemploSimultaneos: 'Ej.: Ceno mientras veo series'
  },

  /* ---------- IMPREVISTOS ---------- */
  imprevistos: {
    titulo: 'Noches difíciles',
    pregunta: 'En una noche con imprevistos, ¿qué paso se pierde primero?',
    ejemplo: 'Ej.: Dejo de planificar el día siguiente'
  },

  /* ---------- MÓDULOS DEL MUEBLE ---------- */
  // "pasos" = ids de los pasos que cubre. "extra: true" = cubre pasos propios (no cuenta en los 14).
  modulos: [
    { id: 'cierre', nombre: 'Cierre de trabajo', corto: 'Cierre de trabajo', pasos: [1, 2],
      descripcion: 'Charola para dejar laptop, cuadernos y cargadores al terminar.' },
    { id: 'cocina', nombre: 'Bandeja de cocina y mañana', corto: 'Cocina y mañana', pasos: [3, 4, 14],
      descripcion: 'Bandeja para llevar y recoger la cena y el desayuno.' },
    { id: 'mascotas', nombre: 'Mascotas', corto: 'Mascotas', pasos: [], extra: true,
      descripcion: 'Espacio para comida, correa y cosas de tu mascota.',
      cubreTexto: 'Pasos propios, como alimentar a tu mascota' },
    { id: 'ropa', nombre: 'Ropa de descanso y zapatos', corto: 'Ropa y zapatos', pasos: [5],
      descripcion: 'Gancho y repisa para la pijama, la ropa usada y los zapatos.' },
    { id: 'aseo', nombre: 'Aseo', corto: 'Aseo', pasos: [6],
      descripcion: 'Organizador para cepillo, crema y cosas de aseo.' },
    { id: 'bitacora', nombre: 'Bitácora y relajación', corto: 'Bitácora y relax', pasos: [7, 10],
      descripcion: 'Lugar para una libreta, un libro o audífonos.' },
    { id: 'checklist', nombre: 'Checklist de mañana', corto: 'Checklist mañana', pasos: [8, 9],
      descripcion: 'Pizarra y charola para dejar listo lo de mañana.' },
    { id: 'carga', nombre: 'Carga y alarma', corto: 'Carga y alarma', pasos: [11, 12, 13],
      descripcion: 'Base de carga con despertador de luz gradual.' }
  ],

  // Medidas de referencia (por validar)
  medidas: { baseAncho: 40, baseFondo: 30, altoNivel: 30 },

  mueble: {
    titulo: 'Arma tu mueble',
    instruccion: 'Activa solo los módulos que usarías. El mueble se arma por niveles, uno por módulo.',
    preguntaModulo: '¿Lo pondrías en tu cuarto?',
    preguntaCambios: '¿Qué quitarías o cambiarías?',
    ejemploCambios: 'Ej.: Lo haría más bajo, quitaría la bandeja…',
    preguntaIntencion: 'Si existiera, ¿qué harías?'
  },

  respuestasModulo: [
    { valor: 'si', etiqueta: 'Sí' },
    { valor: 'tal_vez', etiqueta: 'Tal vez' },
    { valor: 'no', etiqueta: 'No' }
  ],

  intencion: [
    { valor: 'compraria', etiqueta: 'Lo compraría' },
    { valor: 'lo_haria', etiqueta: 'Lo haría yo mismo' },
    { valor: 'no_usaria', etiqueta: 'No lo usaría' }
  ],

  /* ---------- GRACIAS ---------- */
  gracias: {
    titulo: '¡Gracias!',
    texto: 'Tu respuesta nos ayuda a confirmar o descartar lo que suponíamos. Así quedó tu noche y tu mueble:'
  }
};
