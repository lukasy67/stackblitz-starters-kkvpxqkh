// Claves obtenidas de Supabase
const SUPABASE_URL = "https://zkklifirmzvlwapivbrc.supabase.co";
const SUPABASE_KEY = "sb_publishable_Od54CMAGf_6wyGbeU-vvCw_FWzvrvbd";

// Inicializar cliente con el nombre dbClient para evitar conflicto con window.supabase
const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let datosTorneo = { partidos: [], incidencias: [] };
let incidenciasTemp = [];

const CURSOS_EQUIPOS = [
  "Dements (4 Ciencias)", "PsychoKings (2 Psico)", "Titanium (1 Psico)", "Insanos (3 Psico)",
  "Alpha (1 Ciencias)", "Vanguardia (2 Ciencias)", "Legión (3 Ciencias)", "Mastery (5 Psico)", "Avanzada (4 Psico)"
];

// Suscripción en Tiempo Real
try {
  dbClient
    .channel('cambios-partidos')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
      cargarDatos();
    })
    .subscribe();
} catch (e) {
  console.log("Error al suscribir a Realtime:", e);
}

function renderizarArbolVisual(disciplina, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const partidos = datosTorneo.partidos.filter(p => p.disciplina === disciplina);
  const fases = ["Cuartos de Final", "Semifinales", "Final"];

  let html = `<div class="bracket-tree-container">`;

  fases.forEach(fase => {
    const partidosFase = partidos.filter(p => p.fase === fase);
    if (partidosFase.length > 0) {
      html += `<div class="bracket-round">`;
      html += `<div class="bracket-round-title">${fase}</div>`;

      partidosFase.forEach(p => {
        const winA = p.estado === 'Finalizado' && p.goles_a > p.goles_b ? 'winner' : '';
        const winB = p.estado === 'Finalizado' && p.goles_b > p.goles_a ? 'winner' : '';

        html += `
          <div class="bracket-card" onclick="abrirModalAdmin('${p.id}')">
            <div class="bracket-team-row ${winA}">
              <span>${p.equipo_a || 'Por definir'}</span>
              <span class="bracket-team-score">${p.goles_a ?? 0}</span>
            </div>
            <div class="bracket-team-row ${winB}">
              <span>${p.equipo_b || 'Por definir'}</span>
              <span class="bracket-team-score">${p.goles_b ?? 0}</span>
            </div>
          </div>
        `;
      });

      html += `</div>`;
    }
  });

  html += `</div>`;
  container.innerHTML = html;
}

// Conmutación de Pestañas
function openTab(evt, tabName) {
  if (evt) evt.preventDefault();
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tab-content");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tab-link");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  const targetTab = document.getElementById(tabName);
  if (targetTab) {
    targetTab.style.display = "block";
  }
  if (evt && evt.currentTarget) {
    evt.currentTarget.className += " active";
  }
}

// Cargar Datos desde Supabase
async function cargarDatos() {
  try {
    const { data: partidos, error } = await dbClient
      .from('partidos')
      .select('*')
      .order('orden', { ascending: true });

    if (error) {
      console.error("Error al consultar Supabase:", error);
    } else {
      datosTorneo.partidos = (partidos || []).map(p => ({
        id: p.id,
        disciplina: p.disciplina,
        fase: p.fase,
        equipoA: p.equipo_a,
        equipoB: p.equipo_b,
        golesA: p.goles_a !== null && p.goles_a !== undefined ? p.goles_a : "",
        golesB: p.goles_b !== null && p.goles_b !== undefined ? p.goles_b : "",
        estado: p.estado || 'Pendiente',
        fechaHora: p.fecha_hora,
        orden: p.orden || 1
      }));
    }

    renderizarPartidosDisciplina("Futsal Masculino", "futsal-content");
    renderizarPartidosDisciplina("Fútbol de Campo Masculino", "futbol-content");
    renderizarPartidosDisciplina("Volley Mixto", "voley-content");
    renderizarPartidosDisciplina("Pikivoley Masculino", "pikivoley-content");
    renderizarMedalleroSimulado();
    renderizarEstadisticasEquipos();
    renderizarCuadroHonor();
    renderizarComparativaCarreras();
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
  if (!contenedor) return;

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

function filtrarFutsalSexo(sexo) {
  const disc = sexo === 'M' ? "Futsal Masculino" : "Futsal Femenino";
  renderizarPartidosDisciplina(disc, "futsal-content");
}

function filtrarFutbolSexo(sexo) {
  const disc = sexo === 'M' ? "Fútbol de Campo Masculino" : "Fútbol de Campo Femenino";
  renderizarPartidosDisciplina(disc, "futbol-content");
}

// Modal Cargar Marcador
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
  const idPartido = document.getElementById("admin-id-partido").value;
  const golesA = document.getElementById("goles-a").value;
  const golesB = document.getElementById("goles-b").value;

  document.getElementById("admin-msj").innerText = "Guardando...";

  try {
    const { error } = await dbClient
      .from('partidos')
      .update({ 
        goles_a: parseInt(golesA), 
        goles_b: parseInt(golesB), 
        estado: 'Finalizado' 
      })
      .eq('id', idPartido);

    if (error) {
      document.getElementById("admin-msj").innerText = "Error: " + error.message;
    } else {
      document.getElementById("admin-msj").innerText = "¡Resultado actualizado!";
      setTimeout(cerrarModalAdmin, 1000);
      cargarDatos();
    }
  } catch (err) {
    document.getElementById("admin-msj").innerText = "Error de conexión";
  }
}

// Modal Crear Partido
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
  const disciplina = document.getElementById("crear-disciplina").value;
  const orden = document.getElementById("crear-orden").value;
  const fase = document.getElementById("crear-fase").value;
  const equipoA = document.getElementById("crear-equipo-a").value;
  const equipoB = document.getElementById("crear-equipo-b").value;
  const fechaHoraRaw = document.getElementById("crear-fecha-hora").value;

// Formatea la fecha elegida a un formato amigable (ej: "10/08 15:30 HS")
let fechaHoraFormateada = fechaHoraRaw;
if (fechaHoraRaw) {
  const fecha = new Date(fechaHoraRaw);
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const hora = String(fecha.getHours()).padStart(2, '0');
  const mins = String(fecha.getMinutes()).padStart(2, '0');
  fechaHoraFormateada = `${dia}/${mes} ${hora}:${mins} HS`;
}

  const idNuevo = "PAR-" + new Date().getTime();

  document.getElementById("crear-msj").innerText = "Guardando...";

  try {
    const { error } = await dbClient
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
      setTimeout(cerrarModalCrearPartido, 1000);
      cargarDatos();
    }
  } catch (err) {
    document.getElementById("crear-msj").innerText = "Error de conexión";
  }
}

// Tablas Auxiliares
function renderizarMedalleroSimulado() {
  const contenedor = document.getElementById("medallero-content");
  if (!contenedor) return;
  contenedor.innerHTML = `
    <table class="tabla-deportiva">
      <thead><tr><th>Curso / Equipo</th><th>Futsal M</th><th>Futsal F</th><th>Fútbol</th><th>Vóley</th><th>Pikivoley</th><th>E-Sports</th><th>Ajedrez</th><th>TOTAL PTS</th></tr></thead>
      <tbody>
        <tr><td><strong>Psicología 1°</strong></td><td>100</td><td>0</td><td>50</td><td>50</td><td>0</td><td>100</td><td>0</td><td><span class="badge-total">300 Pts</span></td></tr>
        <tr><td><strong>Psicología 2°</strong></td><td>50</td><td>100</td><td>0</td><td>100</td><td>100</td><td>0</td><td>50</td><td><span class="badge-total">400 Pts</span></td></tr>
      </tbody>
    </table>
  `;
}

function renderizarEstadisticasEquipos() {
  const contenedor = document.getElementById("estadisticas-content");
  if (!contenedor) return;
  contenedor.innerHTML = `<table class="tabla-deportiva"><thead><tr><th>Curso / Equipo</th><th>Goles a Favor</th><th>Goles en Contra</th><th>Diferencia Goles</th><th>Tarjetas</th><th>Efectividad</th></tr></thead><tbody><tr><td><strong>Dements (4 Ciencias)</strong></td><td>12</td><td>4</td><td>+8</td><td>2 Amarillas</td><td>75%</td></tr></tbody></table>`;
}

function renderizarCuadroHonor() {
  const contenedor = document.getElementById("cuadro-honor-content");
  if (!contenedor) return;
  contenedor.innerHTML = `<table class="tabla-deportiva"><thead><tr><th>Reconocimiento / Récord</th><th>Equipo Destacado</th><th>Registro</th></tr></thead><tbody><tr><td>⚽ Máximo Goleador (Mejor Ataque)</td><td><strong>PsychoKings (2 Psico)</strong></td><td>15 Goles</td></tr></tbody></table>`;
}

function renderizarComparativaCarreras() {
  const contenedor = document.getElementById("comparativa-content");
  if (!contenedor) return;
  contenedor.innerHTML = `<table class="tabla-deportiva"><thead><tr><th>Métrica Consolidada</th><th>Psicología (5 Cursos)</th><th>Ciencias de la Educación (4 Cursos)</th></tr></thead><tbody><tr><td>⚽ Goles Totales Convertidos</td><td>23 Goles</td><td>20 Goles</td></tr></tbody></table>`;
}

// Escuchar evento DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cargarDatos);
} else {
  cargarDatos();
}