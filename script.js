// Claves obtenidas de Supabase (Project Settings > API)
const SUPABASE_URL = "https://zkklifirmzvlwapivbrc.supabase.co";
const SUPABASE_KEY = "sb_publishable_Od54CMAGf_6wyGbeU-vvCw_FWzvrvbd";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Escuchar cambios en Tiempo Real
supabase
  .channel('cambios-partidos')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, payload => {
    console.log('¡Cambio registrado en tiempo real!', payload);
    cargarDatos();
  })
  .subscribe();

// Función para Cargar Partidos desde Supabase
async function cargarDatos() {
  try {
    const { data: partidos, error } = await supabase
      .from('partidos')
      .select('*')
      .order('orden', { ascending: true });

    if (error) throw error;

    datosTorneo.partidos = partidos;

    // Renderizar Vistas
    renderizarArbolVisual("Futsal Masculino", "futsal-content");
    renderizarArbolVisual("Volley Mixto", "voley-content");
    renderizarPartidosDisciplina("Fútbol de Campo Masculino", "futbol-content");
    renderizarPartidosDisciplina("Pikivoley Masculino", "pikivoley-content");
    renderizarMedalleroSimulado();
    renderizarEstadisticasEquipos();
  } catch (err) {
    console.error("Error al cargar datos desde Supabase:", err);
  }
}

// Función para Crear Nuevo Partido en Supabase
async function enviarNuevoPartido() {
  const disciplina = document.getElementById("crear-disciplina").value;
  const orden = document.getElementById("crear-orden").value;
  const fase = document.getElementById("crear-fase").value;
  const equipoA = document.getElementById("crear-equipo-a").value;
  const equipoB = document.getElementById("crear-equipo-b").value;
  const fechaHora = document.getElementById("crear-fecha-hora").value;

  const idNuevo = "PAR-" + new Date().getTime();

  document.getElementById("crear-msj").innerText = "Creando partido en Supabase...";

  const { data, error } = await supabase
    .from('partidos')
    .insert([
      {
        id: idNuevo,
        disciplina: disciplina,
        fase: fase,
        equipo_a: equipoA,
        equipo_b: equipoB,
        fecha_hora: fechaHora,
        orden: parseInt(orden),
        estado: 'Pendiente'
      }
    ]);

  if (error) {
    document.getElementById("crear-msj").innerText = "Error: " + error.message;
  } else {
    document.getElementById("crear-msj").innerText = "¡Partido creado con éxito!";
    cerrarModalCrearPartido();
    cargarDatos();
  }
}

// Función para Actualizar Resultado en Supabase
async function enviarResultado() {
  const idPartido = document.getElementById("admin-id-partido").value;
  const golesA = document.getElementById("goles-a").value;
  const golesB = document.getElementById("goles-b").value;

  document.getElementById("admin-msj").innerText = "Guardando resultado...";

  const { error } = await supabase
    .from('partidos')
    .update({ goles_a: parseInt(golesA), goles_b: parseInt(golesB), estado: 'Finalizado' })
    .eq('id', idPartido);

  if (error) {
    document.getElementById("admin-msj").innerText = "Error: " + error.message;
  } else {
    document.getElementById("admin-msj").innerText = "¡Resultado actualizado!";
    cerrarModalAdmin();
    cargarDatos();
  }
}

// Modal Crear Nuevo Partido
function abrirModalCrearPartido(disciplinaPrevia = "") {
  if (disciplinaPrevia) {
    document.getElementById("crear-disciplina").value = disciplinaPrevia;
  }

  const selA = document.getElementById("crear-equipo-a");
  const selB = document.getElementById("crear-equipo-b");
  selA.innerHTML = ""; selB.innerHTML = "";

  CURSOS_EQUIPOS.forEach(c => {
    selA.innerHTML += `<option value="${c}">${c}</option>`;
    selB.innerHTML += `<option value="${c}">${c}</option>`;
  });

  document.getElementById("crear-orden").value = (datosTorneo.partidos.length + 1);
  document.getElementById("crear-msj").innerText = "";
  document.getElementById("modal-crear-partido").style.display = "block";
}

function cerrarModalCrearPartido() {
  document.getElementById("modal-crear-partido").style.display = "none";
}

async function enviarNuevoPartido() {
  const clave = document.getElementById("crear-clave").value;
  const disciplina = document.getElementById("crear-disciplina").value;
  const orden = document.getElementById("crear-orden").value;
  const fase = document.getElementById("crear-fase").value;
  const equipoA = document.getElementById("crear-equipo-a").value;
  const equipoB = document.getElementById("crear-equipo-b").value;
  const fechaHora = document.getElementById("crear-fecha-hora").value;

  const payload = {
    clave: clave,
    accion: "crear_partido",
    disciplina: disciplina,
    orden: parseInt(orden),
    fase: fase,
    equipoA: equipoA,
    equipoB: equipoB,
    fechaHora: fechaHora
  };

  document.getElementById("crear-msj").innerText = "Creando partido...";

  try {
    const res = await fetch(API_URL, { method: "POST", body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.status === "success") {
      document.getElementById("crear-msj").innerText = "¡Partido creado con éxito!";
      cargarDatos();
      setTimeout(cerrarModalCrearPartido, 1500);
    } else {
      document.getElementById("crear-msj").innerText = "Error: " + data.message;
    }
  } catch (err) {
    document.getElementById("crear-msj").innerText = "Error de conexión";
  }
}

function renderizarMedalleroSimulado() {
  const contenedor = document.getElementById("medallero-content");
  const cursos = [
    { curso: "Psicología 1°", futM: 100, futF: 0, futb: 50, vol: 50, piki: 0, ajedrez: 0, clash: 100, total: 300 },
    { curso: "Psicología 2°", futM: 50, futF: 100, futb: 0, vol: 100, piki: 100, ajedrez: 50, clash: 0, total: 400 }
  ];
  let html = `<table class="tabla-deportiva"><thead><tr><th>Curso / Equipo</th><th>Futsal M</th><th>Futsal F</th><th>Fútbol</th><th>Vóley</th><th>Pikivoley</th><th>E-Sports</th><th>Ajedrez</th><th>TOTAL PTS</th></tr></thead><tbody>`;
  cursos.forEach(f => {
    html += `<tr><td><strong>${f.curso}</strong></td><td>${f.futM}</td><td>${f.futF}</td><td>${f.futb}</td><td>${f.vol}</td><td>${f.piki}</td><td>${f.clash}</td><td>${f.ajedrez}</td><td><span class="badge-total">${f.total} Pts</span></td></tr>`;
  });
  html += `</tbody></table>`;
  contenedor.innerHTML = html;
}

function renderizarEstadisticasEquipos() {
  const contenedor = document.getElementById("estadisticas-content");
  contenedor.innerHTML = `<table class="tabla-deportiva"><thead><tr><th>Curso / Equipo</th><th>Goles a Favor</th><th>Goles en Contra</th><th>Diferencia Goles</th><th>Tarjetas</th><th>Efectividad</th></tr></thead><tbody><tr><td><strong>Dements (4 Ciencias)</strong></td><td>12</td><td>4</td><td>+8</td><td>2 Amarillas</td><td>75%</td></tr></tbody></table>`;
}

function renderizarCuadroHonor() {
  const contenedor = document.getElementById("cuadro-honor-content");
  contenedor.innerHTML = `<table class="tabla-deportiva"><thead><tr><th>Reconocimiento / Récord</th><th>Equipo Destacado</th><th>Registro</th></tr></thead><tbody><tr><td>⚽ Máximo Goleador (Mejor Ataque)</td><td><strong>PsychoKings (2 Psico)</strong></td><td>15 Goles</td></tr></tbody></table>`;
}

function renderizarComparativaCarreras() {
  const contenedor = document.getElementById("comparativa-content");
  contenedor.innerHTML = `<table class="tabla-deportiva"><thead><tr><th>Métrica Consolidada</th><th>Psicología (5 Cursos)</th><th>Ciencias de la Educación (4 Cursos)</th></tr></thead><tbody><tr><td>⚽ Goles Totales Convertidos</td><td>23 Goles</td><td>20 Goles</td></tr></tbody></table>`;
}

window.onload = cargarDatos;

// Renderizado del Árbol Gráfico para Futsal y Vóley
function renderizarArbolVisual(disciplina, contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  const partidos = datosTorneo.partidos.filter(p => p.disciplina === disciplina);

  if (partidos.length === 0) {
    contenedor.innerHTML = `<p style="color:#aaa;">No hay partidos cargados para ${disciplina}.</p>`;
    return;
  }

  // Mapa de partidos por ID para rápido acceso
  const mapaPartidos = {};
  partidos.forEach(p => mapaPartidos[p.id] = p);

  // Obtener ganadores automáticos
  function obtenerGanador(partidoId) {
    const p = mapaPartidos[partidoId];
    if (!p || p.estado !== "Finalizado") return "Por Definir";
    return parseInt(p.golesA) > parseInt(p.golesB) ? p.equipoA : p.equipoB;
  }

  // Estructura de ejemplo para 8 equipos (Cuartos -> Semis -> Final)
  const c1_ganador = obtenerGanador("FUT-C1");
  const c2_ganador = obtenerGanador("FUT-C2");
  const c3_ganador = obtenerGanador("FUT-C3");
  const c4_ganador = obtenerGanador("FUT-C4");

  const semi1_A = c1_ganador !== "Por Definir" ? c1_ganador : (mapaPartidos["FUT-S1"]?.equipoA || "Ganador C1");
  const semi1_B = c2_ganador !== "Por Definir" ? c2_ganador : (mapaPartidos["FUT-S1"]?.equipoB || "Ganador C2");

  const semi2_A = c3_ganador !== "Por Definir" ? c3_ganador : (mapaPartidos["FUT-S2"]?.equipoA || "Ganador C3");
  const semi2_B = c4_ganador !== "Por Definir" ? c4_ganador : (mapaPartidos["FUT-S2"]?.equipoB || "Ganador C4");

  const s1_ganador = obtenerGanador("FUT-S1");
  const s2_ganador = obtenerGanador("FUT-S2");

  const final_A = s1_ganador !== "Por Definir" ? s1_ganador : (mapaPartidos["FUT-FIN"]?.equipoA || "Finalista 1");
  const final_B = s2_ganador !== "Por Definir" ? s2_ganador : (mapaPartidos["FUT-FIN"]?.equipoB || "Finalista 2");

  const campeonFinal = obtenerGanador("FUT-FIN");

  let html = `
    <div class="bracket-container">
      
      <!-- Ronda 1: Cuartos de Final (Izquierda) -->
      <div class="bracket-round">
        <div class="bracket-match">
          <div class="bracket-team"><span>${renderizarNombreVisible(mapaPartidos["FUT-C1"]?.equipoA || "Equipo 1")}</span><strong>${mapaPartidos["FUT-C1"]?.golesA ?? "-"}</strong></div>
          <div class="bracket-team"><span>${renderizarNombreVisible(mapaPartidos["FUT-C1"]?.equipoB || "Equipo 2")}</span><strong>${mapaPartidos["FUT-C1"]?.golesB ?? "-"}</strong></div>
        </div>
        <div class="bracket-match">
          <div class="bracket-team"><span>${renderizarNombreVisible(mapaPartidos["FUT-C2"]?.equipoA || "Equipo 3")}</span><strong>${mapaPartidos["FUT-C2"]?.golesA ?? "-"}</strong></div>
          <div class="bracket-team"><span>${renderizarNombreVisible(mapaPartidos["FUT-C2"]?.equipoB || "Equipo 4")}</span><strong>${mapaPartidos["FUT-C2"]?.golesB ?? "-"}</strong></div>
        </div>
      </div>

      <!-- Ronda 2: Semifinal (Izquierda) -->
      <div class="bracket-round">
        <div class="bracket-match">
          <div class="bracket-team"><span>${renderizarNombreVisible(semi1_A)}</span><strong>${mapaPartidos["FUT-S1"]?.golesA ?? "-"}</strong></div>
          <div class="bracket-team"><span>${renderizarNombreVisible(semi1_B)}</span><strong>${mapaPartidos["FUT-S1"]?.golesB ?? "-"}</strong></div>
        </div>
      </div>

      <!-- Centro: CAMPEÓN DE LA MODALIDAD -->
      <div class="bracket-champion">
        <h4>🏆 CAMPEÓN</h4>
        <span>${renderizarNombreVisible(campeonFinal)}</span>
      </div>

      <!-- Ronda 2: Semifinal (Derecha) -->
      <div class="bracket-round">
        <div class="bracket-match">
          <div class="bracket-team"><span>${renderizarNombreVisible(semi2_A)}</span><strong>${mapaPartidos["FUT-S2"]?.golesA ?? "-"}</strong></div>
          <div class="bracket-team"><span>${renderizarNombreVisible(semi2_B)}</span><strong>${mapaPartidos["FUT-S2"]?.golesB ?? "-"}</strong></div>
        </div>
      </div>

      <!-- Ronda 1: Cuartos de Final (Derecha) -->
      <div class="bracket-round">
        <div class="bracket-match">
          <div class="bracket-team"><span>${renderizarNombreVisible(mapaPartidos["FUT-C3"]?.equipoA || "Equipo 5")}</span><strong>${mapaPartidos["FUT-C3"]?.golesA ?? "-"}</strong></div>
          <div class="bracket-team"><span>${renderizarNombreVisible(mapaPartidos["FUT-C3"]?.equipoB || "Equipo 6")}</span><strong>${mapaPartidos["FUT-C3"]?.golesB ?? "-"}</strong></div>
        </div>
        <div class="bracket-match">
          <div class="bracket-team"><span>${renderizarNombreVisible(mapaPartidos["FUT-C4"]?.equipoA || "Equipo 7")}</span><strong>${mapaPartidos["FUT-C4"]?.golesA ?? "-"}</strong></div>
          <div class="bracket-team"><span>${renderizarNombreVisible(mapaPartidos["FUT-C4"]?.equipoB || "Equipo 8")}</span><strong>${mapaPartidos["FUT-C4"]?.golesB ?? "-"}</strong></div>
        </div>
      </div>

    </div>
  `;

  contenedor.innerHTML = html;
}