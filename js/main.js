// ============================================================
// VARIABLES GLOBALES Y ESTADO (Configuración Principal)
// ============================================================
let esModoLogistica = false;
let esModoSuperAdmin = false;
let esModoEditor = false;
let sancionesManualesCache = [];
let sponsorsCache = [];
let formatoClashRoyale = 'single'; // 'single' o 'double'

let datosTorneo = { partidos: [], incidencias: [] };
let jugadoresCache = [];
let votosMvpCache = [];
let comentariosCache = [];
let apoyosCache = [];
let prediccionesCache = [];
let medalleroCache = [];
let sponsorsVisibles = false;
let previousScores = {}; // Para el observador de goles en vivo

// Configuración de Colores e Iniciales para los 9 Cursos/Equipos
const EQUIPOS_COLORES = {
  "Imperial Lions (1 Ciencias)": { bg: "#e11d48", initials: "IL", short: "1° Ciencias" },
  "Zero One (2 Ciencias)": { bg: "#2563eb", initials: "ZO", short: "2° Ciencias" },
  "Celans (3 Ciencias)": { bg: "#059669", initials: "CL", short: "3° Ciencias" },
  "Dements (4 Ciencias)": { bg: "#7c3aed", initials: "DM", short: "4° Ciencias" },
  "Phoenix Legacy (1 Psico)": { bg: "#f59e0b", initials: "PL", short: "1° Psico" },
  "Phisius (2 Psico)": { bg: "#0891b2", initials: "PH", short: "2° Psico" },
  "Danaus (3 Psico)": { bg: "#db2777", initials: "DN", short: "3° Psico" },
  "Hudex (4 Psico)": { bg: "#4f46e5", initials: "HX", short: "4° Psico" },
  "Águilas Doradas (5 Psico)": { bg: "#d97706", initials: "AD", short: "5° Psico" }
};

const CURSOS_EQUIPOS = Object.keys(EQUIPOS_COLORES);


// ============================================================
// SUSCRIPCIONES REALTIME (SUPABASE)
// ============================================================
// Asumiendo que 'dbClient' fue inicializado globalmente en supabase.js

try {
  dbClient
    .channel('cambios-partidos')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => cargarDatos())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'incidencias' }, () => cargarDatos())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jugadores' }, () => cargarDatos())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'config_accesos' }, () => cargarDatos())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sanciones_manuales' }, () => cargarDatos())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comentarios' }, () => cargarDatos())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'apoyos' }, () => cargarDatos())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'predicciones' }, () => cargarDatos())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sponsors' }, () => cargarDatos())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'votos_mvp' }, () => cargarDatos())
    .subscribe();
} catch (e) {
  console.log("Realtime error:", e);
}

// Reacciones: no recarga toda la página, solo dispara la animación flotante
try {
  dbClient
    .channel('reacciones-en-vivo')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reacciones' }, (payload) => {
      if (payload && payload.new && payload.new.emoji) {
        lanzarEmojiFlotante(payload.new.emoji);
      }
    })
    .subscribe();
} catch (e) {
  console.log("Realtime error (reacciones):", e);
}

// ============================================================
// CARGA Y PROCESAMIENTO GENERAL DE DATOS
// ============================================================
async function cargarDatos() {
  try {
    const { data: partidos } = await dbClient
      .from('partidos')
      .select('*')
      .order('orden', { ascending: true });

    const { data: incidencias } = await dbClient
      .from('incidencias')
      .select('*');

    const { data: jugadores } = await dbClient
      .from('jugadores')
      .select('*');

    const { data: votosMvp } = await dbClient
      .from('votos_mvp')
      .select('*');

    const { data: comentarios } = await dbClient
      .from('comentarios')
      .select('*')
      .order('created_at', { ascending: true });

    const { data: apoyos } = await dbClient
      .from('apoyos')
      .select('*');

    const { data: predicciones } = await dbClient
      .from('predicciones')
      .select('*')
      .order('created_at', { ascending: true });

    const { data: config } = await dbClient
      .from('config_accesos')
      .select('*');

    const confClash = (config || []).find(c => c.clave_id === 'clash_formato');
    formatoClashRoyale = confClash ? confClash.valor : 'single';

    const btnSingle = document.getElementById("btn-cr-single");
    const btnDouble = document.getElementById("btn-cr-double");
    if (btnSingle && btnDouble) {
      btnSingle.classList.toggle("active", formatoClashRoyale === 'single');
      btnDouble.classList.toggle("active", formatoClashRoyale === 'double');
    }

    comentariosCache = comentarios || [];
    apoyosCache = apoyos || [];
    prediccionesCache = predicciones || [];
    jugadoresCache = jugadores || [];
    votosMvpCache = votosMvp || [];

    const confSponsors = (config || []).find(c => c.clave_id === 'sponsors_visible');
    sponsorsVisibles = confSponsors ? (confSponsors.valor === 'true') : false;
    renderizarCarruselSponsors();

    const nuevosPartidos = (partidos || []).map(p => ({
      id: p.id,
      disciplina: p.disciplina,
      fase: p.fase,
      equipoA: p.equipo_a,
      equipoB: p.equipo_b,
      golesA: p.goles_a !== null && p.goles_a !== undefined ? p.goles_a : "",
      golesB: p.goles_b !== null && p.goles_b !== undefined ? p.goles_b : "",
      estado: p.estado || 'Pendiente',
      fechaHora: p.fecha_hora,
      orden: p.orden || 1,
      definidoPenales: p.definido_penales || false,
      finalizadoAt: p.finalizado_at || p.created_at
    }));

    verificarGolesEnVivo(nuevosPartidos);

    datosTorneo.partidos = nuevosPartidos;
    datosTorneo.incidencias = incidencias || [];

    renderizarPortadaEnVivo();
    renderizarArbolGrafico("Futsal Masculino", "futsal-content");
    renderizarPartidosDisciplina("Fútbol de Campo Masculino", "futbol-content");
    renderizarArbolGrafico("Volley Mixto", "voley-content");
    renderizarPartidosDisciplina("Pikivoley Masculino", "pikivoley-content");

    renderizarGridEquipos();
    renderizarClashRoyaleTab();
    renderizarMedalleroReal();
    renderizarEstadisticasEquipos();
    renderizarGoleadoresTop();
    renderizarCuadroHonor();
    renderizarComparativaCarreras();
    renderizarFixtureGeneral();
    renderizarSuspendidos();
    renderizarMuroComentarios();
    renderizarFormularioQuiniela();
    renderizarQuinielaRanking();
  } catch (err) {
    console.error("Error al cargar datos desde Supabase:", err);
  }
}

// ============================================================
// OBSERVADOR DE GOLES EN VIVO Y CELEBRACIÓN
// ============================================================
function verificarGolesEnVivo(nuevosPartidos) {
    nuevosPartidos.forEach(p => {
      if (p.estado === 'En Vivo') {
        const key = p.id;
        const prev = previousScores[key];
  
        if (prev) {
          const gA_nuevo = parseInt(p.golesA || 0);
          const gB_nuevo = parseInt(p.golesB || 0);
  
          if (gA_nuevo > prev.golesA || gB_nuevo > prev.golesB) {
            const equipoAnotador = gA_nuevo > prev.golesA ? p.equipoA : p.equipoB;
            dispararCelebracionGol(equipoAnotador, p.disciplina, gA_nuevo, gB_nuevo);
          }
        }
  
        previousScores[key] = {
          golesA: parseInt(p.golesA || 0),
          golesB: parseInt(p.golesB || 0)
        };
      }
    });
  }

// ============================================================
// INICIALIZADOR DE LA APLICACIÓN
// ============================================================
window.onload = function() {
  cargarDatos();
  setInterval(renderizarMuroComentarios, 30000);
};