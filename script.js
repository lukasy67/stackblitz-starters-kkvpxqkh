// URL Corregida de Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbzqkLS7-VmjpksfIfSLouknRIt7IYR0Xhh37CmLXSs8ps4j1y9_yyGSF81pKXtmLJRx/exec";

let datosTorneo = { partidos: [], incidencias: [] };

// Cambio de Pestañas Principales
function openTab(evt, tabName) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tab-content");
  for (i = 0; i < tabcontent.length; i++) { 
    tabcontent[i].style.display = "none"; 
  }
  tablinks = document.getElementsByClassName("tab-link");
  for (i = 0; i < tablinks.length; i++) { 
    tablinks[i].className = tablinks[i].className.replace(" active", ""); 
  }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

// Carga Inicial de Datos desde la Base de Datos
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
    poblarSelectPartidos();
  } catch (err) {
    console.error("Error al cargar datos:", err);
  }
}

// Lógica de Parsing para Atribución por Carrera
function renderizarNombreVisible(nombreCompleto) {
  if (!nombreCompleto) return "";
  return nombreCompleto.split(" (")[0];
}

function obtenerCarrera(nombreCompleto) {
  if (!nombreCompleto) return "Desconocida";
  const minuscula = nombreCompleto.toLowerCase();
  if (minuscula.includes("psico")) return "Psicología";
  if (minuscula.includes("ciencias") || minuscula.includes("edu")) return "Ciencias de la Educación";
  return "General";
}

// Renderizado de Medallero General
function renderizarMedalleroSimulado() {
  const contenedor = document.getElementById("medallero-content");
  
  const cursos = [
    { curso: "Psicología 1°", futM: 100, futF: 0, futb: 50, vol: 50, piki: 0, ajedrez: 0, clash: 100, total: 300 },
    { curso: "Psicología 2°", futM: 50, futF: 100, futb: 0, vol: 100, piki: 100, ajedrez: 50, clash: 0, total: 400 },
    { curso: "Psicología 3°", futM: 0, futF: 0, futb: 0, vol: 0, piki: 0, ajedrez: 0, clash: 0, total: 0 },
    { curso: "Ciencias de la Educación 3°", futM: 0, futF: 50, futb: 100, vol: 0, piki: 0, ajedrez: 100, clash: 50, total: 300 }
  ];

  let html = `
    <table class="tabla-deportiva">
      <thead>
        <tr>
          <th>Curso / Equipo</th>
          <th>Futsal M</th>
          <th>Futsal F</th>
          <th>Fútbol</th>
          <th>Vóley</th>
          <th>Pikivoley</th>
          <th>E-Sports</th>
          <th>Ajedrez</th>
          <th>TOTAL PTS</th>
        </tr>
      </thead>
      <tbody>
  `;

  cursos.forEach(f => {
    html += `
      <tr>
        <td><strong>${f.curso}</strong></td>
        <td>${f.futM}</td>
        <td>${f.futF}</td>
        <td>${f.futb}</td>
        <td>${f.vol}</td>
        <td>${f.piki}</td>
        <td>${f.clash}</td>
        <td>${f.ajedrez}</td>
        <td><span class="badge-total">${f.total} Pts</span></td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  contenedor.innerHTML = html;
}

// Renderizado de Estadísticas de Equipos
function renderizarEstadisticasEquipos() {
  const contenedor = document.getElementById("estadisticas-content");
  let html = `
    <table class="tabla-deportiva">
      <thead>
        <tr>
          <th>Curso / Equipo</th>
          <th>Goles a Favor</th>
          <th>Goles en Contra</th>
          <th>Diferencia Goles</th>
          <th>Tarjetas</th>
          <th>Efectividad</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><strong>Dements (4 Ciencias)</strong></td><td>12</td><td>4</td><td>+8</td><td>2 Amarillas</td><td>75%</td></tr>
        <tr><td><strong>PsychoKings (2 Psico)</strong></td><td>15</td><td>2</td><td>+13</td><td>1 Amarilla</td><td>100%</td></tr>
        <tr><td><strong>Insanos (3 Psico)</strong></td><td>8</td><td>9</td><td>-1</td><td>4 Amarillas, 1 Roja</td><td>40%</td></tr>
      </tbody>
    </table>
  `;
  contenedor.innerHTML = html;
}

// Renderizado de Cuadro de Honor
function renderizarCuadroHonor() {
  const contenedor = document.getElementById("cuadro-honor-content");
  let html = `
    <table class="tabla-deportiva">
      <thead>
        <tr><th>Reconocimiento / Récord</th><th>Equipo Destacado</th><th>Registro</th></tr>
      </thead>
      <tbody>
        <tr><td>⚽ Máximo Goleador (Mejor Ataque)</td><td><strong>PsychoKings (2 Psico)</strong></td><td>15 Goles</td></tr>
        <tr><td>🛡️ Valla Menos Vencida (Mejor Defensa)</td><td><strong>PsychoKings (2 Psico)</strong></td><td>2 Goles recibidos</td></tr>
        <tr><td>🕊️ Premio Juego Limpio (Fair Play)</td><td><strong>Dements (4 Ciencias)</strong></td><td>1 Amarilla</td></tr>
      </tbody>
    </table>
  `;
  contenedor.innerHTML = html;
}

// Renderizado de Comparativa de Carreras
function renderizarComparativaCarreras() {
  const contenedor = document.getElementById("comparativa-content");
  let html = `
    <table class="tabla-deportiva">
      <thead>
        <tr><th>Métrica Consolidada</th><th>Psicología (5 Cursos)</th><th>Ciencias de la Educación (4 Cursos)</th></tr>
      </thead>
      <tbody>
        <tr><td>⚽ Goles Totales Convertidos</td><td>23 Goles</td><td>20 Goles</td></tr>
        <tr><td>🏆 Puntos Totales (Copa InterFilo)</td><td>700 Pts</td><td>600 Pts</td></tr>
        <tr><td>📈 Efectividad Global</td><td>65% Victorias</td><td>58% Victorias</td></tr>
      </tbody>
    </table>
  `;
  contenedor.innerHTML = html;
}

// Renderizado de Partidos por Disciplina
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
        <span class="badge-fase">${p.fase}</span>
        <div class="marcador-box">
          <span>${renderizarNombreVisible(p.equipoA)}</span>
          <strong>${p.golesA !== "" ? p.golesA : "-"} : ${p.golesB !== "" ? p.golesB : "-"}</strong>
          <span>${renderizarNombreVisible(p.equipoB)}</span>
        </div>
        <small style="color:#aaa;">${p.fechaHora} | Estado: ${p.estado}</small>
      </div>
    `;
  });
  html += `</div>`;
  contenedor.innerHTML = html;
}

// Filtros por Categoría
function filtrarFutsalSexo(sexo) {
  const disc = sexo === 'M' ? "Futsal Masculino" : "Futsal Femenino";
  renderizarPartidosDisciplina(disc, "futsal-content");
}

function filtrarFutbolFase(fase) {
  renderizarPartidosDisciplina("Fútbol de Campo", "futbol-content");
}

function filtrarPikivoleyFase(fase) {
  renderizarPartidosDisciplina("Pikivoley Masculino", "pikivoley-content");
}

// Gestión del Modal Admin
function abrirModalAdmin() {
  document.getElementById("modal-admin").style.display = "block";
}
function cerrarModalAdmin() {
  document.getElementById("modal-admin").style.display = "none";
}

function poblarSelectPartidos() {
  const select = document.getElementById("admin-partido-select");
  select.innerHTML = "";
  datosTorneo.partidos.forEach(p => {
    select.innerHTML += `<option value="${p.id}">${p.disciplina}: ${renderizarNombreVisible(p.equipoA)} vs ${renderizarNombreVisible(p.equipoB)}</option>`;
  });
}

async function enviarResultado() {
  const clave = document.getElementById("admin-clave").value;
  const idPartido = document.getElementById("admin-partido-select").value;
  const golesA = document.getElementById("goles-a").value;
  const golesB = document.getElementById("goles-b").value;

  const payload = {
    clave: clave,
    accion: "actualizar_partido",
    idPartido: idPartido,
    golesA: parseInt(golesA),
    golesB: parseInt(golesB)
  };

  document.getElementById("admin-msj").innerText = "Enviando resultado...";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.status === "success") {
      document.getElementById("admin-msj").innerText = "¡Resultado actualizado con éxito!";
      cargarDatos();
      setTimeout(cerrarModalAdmin, 1500);
    } else {
      document.getElementById("admin-msj").innerText = "Error: " + data.message;
    }
  } catch (err) {
    document.getElementById("admin-msj").innerText = "Error de conexión";
  }
}

// Iniciar al cargar la ventana
window.onload = cargarDatos;