const API_URL = "https://script.google.com/macros/s/AKfycbzqkLS7-VmjpksfIfSLouknRIt7IYR0Xhh37CmLXSs8ps4j1y9_yyGSF81pKXtmLJRx/exec";

let datosTorneo = { partidos: [], incidencias: [] };
let incidenciasTemp = [];

const CURSOS_EQUIPOS = [
  "Dements (4 Ciencias)", "PsychoKings (2 Psico)", "Titanium (1 Psico)", "Insanos (3 Psico)",
  "Alpha (1 Ciencias)", "Vanguardia (2 Ciencias)", "Legión (3 Ciencias)", "Mastery (5 Psico)", "Avanzada (4 Psico)"
];

function openTab(evt, tabName) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tab-content");
  for (i = 0; i < tabcontent.length; i++) { tabcontent[i].style.display = "none"; }
  tablinks = document.getElementsByClassName("tab-link");
  for (i = 0; i < tablinks.length; i++) { tablinks[i].className = tablinks[i].className.replace(" active", ""); }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

async function cargarDatos() {
  try {
    const res = await fetch(API_URL);
    datosTorneo = await res.json();

    // Llama al árbol gráfico para Futsal y Vóley
    renderizarArbolVisual("Futsal Masculino", "futsal-content");
    renderizarArbolVisual("Volley Mixto", "voley-content");

    // Llama al formato por tarjetas/listas para las demás modalidades
    renderizarPartidosDisciplina("Fútbol de Campo", "futbol-content");
    renderizarPartidosDisciplina("Pikivoley Masculino", "pikivoley-content");
  } catch (err) {
    console.error("Error al cargar datos:", err);
  }
}

function renderizarNombreVisible(nombreCompleto) {
  if (!nombreCompleto) return "";
  return nombreCompleto.split(" (")[0];
}

function renderizarPartidosDisciplina(disciplina, contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  const partidos = datosTorneo.partidos.filter(p => p.disciplina === disciplina);

  if (partidos.length === 0) {
    contenedor.innerHTML = `<p style="color:#aaa;">No hay partidos programados para ${disciplina}.</p>`;
    return;
  }

  let html = `<div class="grid-partidos">`;
  partidos.forEach(p => {
    html += `
      <div class="card-partido">
        <div>
          <div class="card-header-info">
            <span class="badge-orden">Partido #${p.orden || 1}</span>
            <span class="badge-fase">${p.fase}</span>
          </div>
          <div class="marcador-box">
            <span>${renderizarNombreVisible(p.equipoA)}</span>
            <strong>${p.golesA !== "" ? p.golesA : "-"} : ${p.golesB !== "" ? p.golesB : "-"}</strong>
            <span>${renderizarNombreVisible(p.equipoB)}</span>
          </div>
          <small style="color:#aaa;">${p.fechaHora} | Estado: ${p.estado}</small>
        </div>
        <button class="btn-cargar-card" onclick="abrirModalParaPartido('${p.id}', '${p.equipoA}', '${p.equipoB}', '${p.disciplina}')">✏️ Cargar Resultado / Tarjetas</button>
      </div>
    `;
  });
  html += `</div>`;
  contenedor.innerHTML = html;
}

// Modal Cargar Resultado de Partido Existente
function abrirModalParaPartido(idPartido, equipoA, equipoB, disciplina) {
  document.getElementById("admin-id-partido").value = idPartido;
  document.getElementById("modal-partido-titulo").innerText = `${disciplina}: ${renderizarNombreVisible(equipoA)} vs ${renderizarNombreVisible(equipoB)}`;
  document.getElementById("lbl-equipo-a").innerText = renderizarNombreVisible(equipoA);
  document.getElementById("lbl-equipo-b").innerText = renderizarNombreVisible(equipoB);

  const selectEq = document.getElementById("inc-equipo-select");
  selectEq.innerHTML = `
    <option value="${equipoA}">${renderizarNombreVisible(equipoA)}</option>
    <option value="${equipoB}">${renderizarNombreVisible(equipoB)}</option>
  `;

  incidenciasTemp = [];
  document.getElementById("lista-incidencias-temp").innerHTML = "";
  document.getElementById("admin-msj").innerText = "";
  document.getElementById("modal-admin").style.display = "block";
}

function cerrarModalAdmin() {
  document.getElementById("modal-admin").style.display = "none";
}

function agregarIncidenciaLista() {
  const jugador = document.getElementById("inc-jugador").value;
  const equipo = document.getElementById("inc-equipo-select").value;
  const tipo = document.getElementById("inc-tipo").value;

  if (!jugador) return;

  incidenciasTemp.push({ jugador, equipo, tipo });
  const ul = document.getElementById("lista-incidencias-temp");
  ul.innerHTML += `<li>• ${jugador} (${renderizarNombreVisible(equipo)}): ${tipo}</li>`;
  document.getElementById("inc-jugador").value = "";
}

async function enviarResultado() {
  const clave = document.getElementById("admin-clave").value;
  const idPartido = document.getElementById("admin-id-partido").value;
  const golesA = document.getElementById("goles-a").value;
  const golesB = document.getElementById("goles-b").value;

  const payload = {
    clave: clave,
    accion: "actualizar_partido",
    idPartido: idPartido,
    golesA: parseInt(golesA),
    golesB: parseInt(golesB),
    incidencias: incidenciasTemp
  };

  document.getElementById("admin-msj").innerText = "Enviando...";

  try {
    const res = await fetch(API_URL, { method: "POST", body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.status === "success") {
      document.getElementById("admin-msj").innerText = "¡Resultado actualizado!";
      cargarDatos();
      setTimeout(cerrarModalAdmin, 1500);
    } else {
      document.getElementById("admin-msj").innerText = "Error: " + data.message;
    }
  } catch (err) {
    document.getElementById("admin-msj").innerText = "Error de conexión";
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