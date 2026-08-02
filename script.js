const API_URL = "https://script.google.com/macros/s/AKfycbzqkLS7-VmjpksfIfSLouknRIt7IYR0Xhh37CmLXSs8ps4j1y9_yyGSF81pKXtmLJRx/exec";

let datosTorneo = { partidos: [], incidencias: [] };
let incidenciasTemp = [];

const CURSOS_LISTA = [
  "Psicología 1°", "Psicología 2°", "Psicología 3°", "Psicología 4°", "Psicología 5°",
  "Ciencias de la Educación 1°", "Ciencias de la Educación 2°", "Ciencias de la Educación 3°", "Ciencias de la Educación 4°"
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
    
    renderizarMedalleroSimulado();
    renderizarEstadisticasEquipos();
    renderizarCuadroHonor();
    renderizarComparativaCarreras();
    renderizarPartidosDisciplina("Futsal Masculino", "futsal-content");
    renderizarPartidosDisciplina("Fútbol de Campo", "futbol-content");
    renderizarPartidosDisciplina("Volley Mixto", "voley-content");
    renderizarPartidosDisciplina("Pikivoley Masculino", "pikivoley-content");
  } catch (err) {
    console.error("Error al cargar datos:", err);
  }
}

function renderizarNombreVisible(nombreCompleto) {
  if (!nombreCompleto) return "";
  return nombreCompleto.split(" (")[0];
}

// Clic directo en la tarjeta del partido para editar
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

function renderizarPartidosDisciplina(disciplina, contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  const partidos = datosTorneo.partidos.filter(p => p.disciplina === disciplina);

  if (partidos.length === 0) {
    contenedor.innerHTML = `<p style="color:#aaa;">No hay partidos cargados para ${disciplina}.</p>`;
    return;
  }

  let html = `<div class="grid-partidos">`;
  partidos.forEach(p => {
    html += `
      <div class="card-partido">
        <div>
          <span class="badge-fase">${p.fase}</span>
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

// Modal Agregar Partido de Reingreso
function abrirModalNuevoPartido(disciplina) {
  document.getElementById("nuevo-disciplina").value = disciplina;
  
  const selA = document.getElementById("nuevo-equipo-a");
  const selB = document.getElementById("nuevo-equipo-b");
  selA.innerHTML = ""; selB.innerHTML = "";
  
  CURSOS_LISTA.forEach(c => {
    selA.innerHTML += `<option value="${c}">${c}</option>`;
    selB.innerHTML += `<option value="${c}">${c}</option>`;
  });

  document.getElementById("modal-nuevo-partido").style.display = "block";
}

function cerrarModalNuevoPartido() {
  document.getElementById("modal-nuevo-partido").style.display = "none";
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
      document.getElementById("admin-msj").innerText = "¡Resultado e incidencias guardados!";
      cargarDatos();
      setTimeout(cerrarModalAdmin, 1500);
    } else {
      document.getElementById("admin-msj").innerText = "Error: " + data.message;
    }
  } catch (err) {
    document.getElementById("admin-msj").innerText = "Error de conexión";
  }
}

function renderizarMedalleroSimulado() {
  const contenedor = document.getElementById("medallero-content");
  const cursos = [
    { curso: "Psicología 1°", futM: 100, futF: 0, futb: 50, vol: 50, piki: 0, ajedrez: 0, clash: 100, total: 300 },
    { curso: "Psicología 2°", futM: 50, futF: 100, futb: 0, vol: 100, piki: 100, ajedrez: 50, clash: 0, total: 400 },
    { curso: "Ciencias de la Educación 3°", futM: 0, futF: 50, futb: 100, vol: 0, piki: 0, ajedrez: 100, clash: 50, total: 300 }
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
  contenedor.innerHTML = `
    <table class="tabla-deportiva">
      <thead><tr><th>Curso / Equipo</th><th>Goles a Favor</th><th>Goles en Contra</th><th>Diferencia Goles</th><th>Tarjetas</th><th>Efectividad</th></tr></thead>
      <tbody>
        <tr><td><strong>Dements (4 Ciencias)</strong></td><td>12</td><td>4</td><td>+8</td><td>2 Amarillas</td><td>75%</td></tr>
        <tr><td><strong>PsychoKings (2 Psico)</strong></td><td>15</td><td>2</td><td>+13</td><td>1 Amarilla</td><td>100%</td></tr>
      </tbody>
    </table>
  `;
}

function renderizarCuadroHonor() {
  const contenedor = document.getElementById("cuadro-honor-content");
  contenedor.innerHTML = `
    <table class="tabla-deportiva">
      <thead><tr><th>Reconocimiento / Récord</th><th>Equipo Destacado</th><th>Registro</th></tr></thead>
      <tbody>
        <tr><td>⚽ Máximo Goleador (Mejor Ataque)</td><td><strong>PsychoKings (2 Psico)</strong></td><td>15 Goles</td></tr>
        <tr><td>🛡️ Valla Menos Vencida (Mejor Defensa)</td><td><strong>PsychoKings (2 Psico)</strong></td><td>2 Goles recibidos</td></tr>
      </tbody>
    </table>
  `;
}

function renderizarComparativaCarreras() {
  const contenedor = document.getElementById("comparativa-content");
  contenedor.innerHTML = `
    <table class="tabla-deportiva">
      <thead><tr><th>Métrica Consolidada</th><th>Psicología (5 Cursos)</th><th>Ciencias de la Educación (4 Cursos)</th></tr></thead>
      <tbody>
        <tr><td>⚽ Goles Totales Convertidos</td><td>23 Goles</td><td>20 Goles</td></tr>
        <tr><td>🏆 Puntos Totales (Copa InterFilo)</td><td>700 Pts</td><td>600 Pts</td></tr>
      </tbody>
    </table>
  `;
}

function filtrarFutsalSexo(sexo) {
  const disc = sexo === 'M' ? "Futsal Masculino" : "Futsal Femenino";
  renderizarPartidosDisciplina(disc, "futsal-content");
}

window.onload = cargarDatos;