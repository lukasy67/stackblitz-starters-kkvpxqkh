// ============================================================
// CONFIGURACIÓN E INICIALIZACIÓN DE SUPABASE
// ============================================================
let esModoLogistica = false;
let esModoSuperAdmin = false;

const SUPABASE_URL = "https://zkklifirmzvlwapivbrc.supabase.co";
const SUPABASE_KEY = "sb_publishable_Od54CMAGf_6wyGbeU-vvCw_FWzvrvbd";

// Inicializar cliente Supabase con el identificador dbClient
const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let datosTorneo = { partidos: [], incidencias: [] };
let incidenciasTemp = [];

// Estado de las nuevas funciones interactivas
let comentariosCache = [];
let apoyosCache = [];
let prediccionesCache = [];

function escaparHTML(texto) {
  if (texto === null || texto === undefined) return "";
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Lista Oficial de los 9 Cursos de la Facultad de Filosofía (UNA - San Estanislao)
const CURSOS_EQUIPOS = [
  "Imperial Lions (1 Ciencias)", 
  "Zero One (2 Ciencias)", 
  "Celans (3 Ciencias)", 
  "Dements (4 Ciencias)",
  "Phoenix Legacy (1 Psico)", 
  "Phisius (2 Psico)", 
  "Danaus (3 Psico)", 
  "Hudex (4 Psico)", 
  "Águilas Doradas (5 Psico)"
];

function normalizarTexto(txt) {
  if (!txt) return "";
  return txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Alternar Modo Logística (1234) / Super Admin (alucas) / Espectador
function activarModoLogistica() {
  if (esModoLogistica || esModoSuperAdmin) {
    esModoLogistica = false;
    esModoSuperAdmin = false;
    document.body.classList.remove("modo-logistica", "modo-superadmin");
    alert("Modo Espectador activado.");
    cargarDatos();
    return;
  }

  const pass = prompt("Ingrese contraseña de acceso de la Organización:");
  if (pass === "1234") {
    esModoLogistica = true;
    esModoSuperAdmin = false;
    document.body.classList.add("modo-logistica");
    alert("¡Modo Logística activado!");
    cargarDatos();
  } else if (pass === "alucas") {
    esModoLogistica = true;
    esModoSuperAdmin = true;
    document.body.classList.add("modo-logistica", "modo-superadmin");
    alert("¡Modo Super Admin (Lucas) activado!");
    cargarDatos();
  } else if (pass !== null) {
    alert("Contraseña incorrecta.");
  }
}

// Suscripción en Tiempo Real (Realtime WebSockets)
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

// Comentarios, apoyos y predicciones: refrescar datos cuando cambian
try {
  dbClient
    .channel('cambios-interactividad')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comentarios' }, () => cargarDatos())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'apoyos' }, () => cargarDatos())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'predicciones' }, () => cargarDatos())
    .subscribe();
} catch (e) {
  console.log("Error al suscribir a Realtime (interactividad):", e);
}

// Reacciones: no recarga toda la página, solo dispara la animación flotante
// para que se vea al instante en la pantalla de TODOS los conectados.
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
  console.log("Error al suscribir a Realtime (reacciones):", e);
}

// ============================================================
// CARGA Y PROCESAMIENTO DE DATOS
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

    comentariosCache = comentarios || [];
    apoyosCache = apoyos || [];
    prediccionesCache = predicciones || [];

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

    datosTorneo.incidencias = incidencias || [];

    // Renderizar Portada Dinámica y Pestañas
    renderizarPortadaEnVivo();
    renderizarArbolGrafico("Futsal Masculino", "futsal-content");
    renderizarPartidosDisciplina("Fútbol de Campo Masculino", "futbol-content");
    renderizarArbolGrafico("Volley Mixto", "voley-content");
    renderizarPartidosDisciplina("Pikivoley Masculino", "pikivoley-content");

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

function renderizarNombreVisible(nombreCompleto) {
  if (!nombreCompleto) return "Por definir";
  return nombreCompleto.split(" (")[0];
}

// ============================================================
// PORTADA DINÁMICA: "EN VIVO / PRÓXIMO ENCUENTRO"
// ============================================================
function renderizarPortadaEnVivo() {
  const container = document.getElementById("envivo-content");
  if (!container) return;

  const partidoEnVivo = datosTorneo.partidos.find(p => p.estado === 'En Vivo');

  if (partidoEnVivo) {
    const panelTarget = mapearDisciplinaAPanel(partidoEnVivo.disciplina);
    container.innerHTML = `
      <div class="live-match-card" onclick="manejarClicPartido('${partidoEnVivo.id}', '${partidoEnVivo.disciplina}', '${partidoEnVivo.fase}', '${partidoEnVivo.equipoA}', '${partidoEnVivo.equipoB}')" style="cursor:pointer;">
        <span class="badge-live">🔴 EN VIVO AHORA</span>
        <h3 style="color:#d4af37; margin:12px 0 8px 0; font-size:18px;">${partidoEnVivo.disciplina} — ${partidoEnVivo.fase}</h3>
        <div class="marcador-box">
          <span>${renderizarNombreVisible(partidoEnVivo.equipoA)}</span>
          <strong style="font-size:26px;">${partidoEnVivo.golesA !== "" ? partidoEnVivo.golesA : "0"} : ${partidoEnVivo.golesB !== "" ? partidoEnVivo.golesB : "0"}</strong>
          <span>${renderizarNombreVisible(partidoEnVivo.equipoB)}</span>
        </div>
        <button class="btn-ir-bracket" onclick="event.stopPropagation(); openTab(event, '${panelTarget}')">🏆 Ver Posiciones / Bracket de ${partidoEnVivo.disciplina}</button>
        ${generarBarraApoyoHTML(partidoEnVivo.id, partidoEnVivo.equipoA, partidoEnVivo.equipoB)}
      </div>
    `;
  } else {
    const proximo = datosTorneo.partidos.find(p => p.estado === 'Pendiente') || datosTorneo.partidos[0];
    if (proximo) {
      const panelTarget = mapearDisciplinaAPanel(proximo.disciplina);
      container.innerHTML = `
        <div class="card-partido" onclick="manejarClicPartido('${proximo.id}', '${proximo.disciplina}', '${proximo.fase}', '${proximo.equipoA}', '${proximo.equipoB}')" style="border-color:#3b82f6; cursor:pointer;">
          <div class="card-header-info">
            <span class="badge-orden" style="background:#1e40af;">PRÓXIMO ENCUENTRO</span>
            <span class="badge-fase">${proximo.fase}</span>
          </div>
          <h3 style="color:#d4af37; margin:10px 0;">${proximo.disciplina}</h3>
          <div class="marcador-box">
            <span>${renderizarNombreVisible(proximo.equipoA)}</span>
            <strong style="color:#aaa; font-size:18px;">VS</strong>
            <span>${renderizarNombreVisible(proximo.equipoB)}</span>
          </div>
          <small style="color:#aaa;">📅 ${proximo.fechaHora} | Orden #${proximo.orden}</small>
          <button class="btn-ir-bracket" onclick="event.stopPropagation(); openTab(event, '${panelTarget}')">🏆 Ir a Pestaña de ${proximo.disciplina}</button>
          ${generarBarraApoyoHTML(proximo.id, proximo.equipoA, proximo.equipoB)}
        </div>
      `;
    } else {
      container.innerHTML = `<p style="color:#aaa;">No hay encuentros agendados por el momento.</p>`;
    }
  }
}

function mapearDisciplinaAPanel(disc) {
  const d = normalizarTexto(disc);
  if (d.includes("futsal")) return "panel-futsal";
  if (d.includes("futbol")) return "panel-futbol";
  if (d.includes("volley") || d.includes("voley")) return "panel-voley";
  if (d.includes("piki")) return "panel-pikivoley";
  return "panel-medallero";
}

// Clic Inteligente: Muestras detalles a Espectadores / Carga a Organización
function manejarClicPartido(idPartido, disciplina, fase, eqA, eqB) {
  if (esModoLogistica) {
    abrirModalAdmin(idPartido, disciplina, fase, eqA, eqB);
  } else {
    abrirModalDetalles(idPartido, disciplina, fase, eqA, eqB);
  }
}

// ============================================================
// VISTA EN ÁRBOL GRÁFICO (BRACKETS PARA FUTSAL Y VÓLEY)
// ============================================================
function obtenerGanador(p) {
  if (!p || p.estado !== 'Finalizado') return null;
  const gA = Number(p.golesA);
  const gB = Number(p.golesB);
  if (gA > gB) return p.equipoA;
  if (gB > gA) return p.equipoB;
  return null;
}

function renderizarArbolGrafico(disciplina, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const partidos = datosTorneo.partidos.filter(p => normalizarTexto(p.disciplina) === normalizarTexto(disciplina));

  const r1 = partidos.filter(p => {
    const f = normalizarTexto(p.fase);
    return f.includes("ronda") || f.includes("cuartos") || f.includes("eliminatoria");
  }).sort((a,b) => a.orden - b.orden);

  const semisBD = partidos.filter(p => normalizarTexto(p.fase).includes("semi")).sort((a,b) => a.orden - b.orden);
  const finalBD = partidos.find(p => normalizarTexto(p.fase).includes("final") && !normalizarTexto(p.fase).includes("semi"));

  // Avance Automático de Ganadores
  const ganR1_0 = obtenerGanador(r1[0]);
  const ganR1_1 = obtenerGanador(r1[1]);
  const ganR1_2 = obtenerGanador(r1[2]);
  const ganR1_3 = obtenerGanador(r1[3]);

  const semi1 = {
    id: semisBD[0] ? semisBD[0].id : `VIRTUAL-SEMI-1-${disciplina}`,
    fase: "Semifinales",
    disciplina: disciplina,
    equipoA: ganR1_0 || (semisBD[0] ? semisBD[0].equipoA : 'Por definir'),
    equipoB: ganR1_1 || (semisBD[0] ? semisBD[0].equipoB : 'Por definir'),
    golesA: semisBD[0] ? semisBD[0].golesA : '',
    golesB: semisBD[0] ? semisBD[0].golesB : '',
    estado: semisBD[0] ? semisBD[0].estado : 'Pendiente'
  };

  const semi2 = {
    id: semisBD[1] ? semisBD[1].id : `VIRTUAL-SEMI-2-${disciplina}`,
    fase: "Semifinales",
    disciplina: disciplina,
    equipoA: ganR1_2 || (semisBD[1] ? semisBD[1].equipoA : 'Por definir'),
    equipoB: ganR1_3 || (semisBD[1] ? semisBD[1].equipoB : 'Por definir'),
    golesA: semisBD[1] ? semisBD[1].golesA : '',
    golesB: semisBD[1] ? semisBD[1].golesB : '',
    estado: semisBD[1] ? semisBD[1].estado : 'Pendiente'
  };

  const ganSemi1 = obtenerGanador(semi1);
  const ganSemi2 = obtenerGanador(semi2);

  const finalMatch = {
    id: finalBD ? finalBD.id : `VIRTUAL-FINAL-${disciplina}`,
    fase: "Final",
    disciplina: disciplina,
    equipoA: ganSemi1 || (finalBD ? finalBD.equipoA : 'Por definir'),
    equipoB: ganSemi2 || (finalBD ? finalBD.equipoB : 'Por definir'),
    golesA: finalBD ? finalBD.golesA : '',
    golesB: finalBD ? finalBD.golesB : '',
    estado: finalBD ? finalBD.estado : 'Pendiente'
  };

  const ganFinal = obtenerGanador(finalMatch);
  const campeonTexto = ganFinal ? renderizarNombreVisible(ganFinal) : "Por Definir";

  let html = `<div class="bracket-tree-wrapper">`;

  html += `<div class="bracket-col"><div class="bracket-title">1ª Ronda Eliminatoria</div>`;
  for (let i = 0; i < r1.length; i += 2) {
    html += `<div class="bracket-match-pair">`;
    if (r1[i]) html += crearNodoHTML(r1[i]);
    if (r1[i + 1]) html += crearNodoHTML(r1[i + 1]);
    html += `</div>`;
  }
  html += `</div>`;

  html += `<div class="bracket-col"><div class="bracket-title">Semifinales</div>`;
  html += `<div style="margin: auto 0;">${crearNodoHTML(semi1)}</div>`;
  html += `<div style="margin: auto 0;">${crearNodoHTML(semi2)}</div>`;
  html += `</div>`;

  html += `<div class="bracket-col"><div class="bracket-title">Final</div>`;
  html += `<div style="margin: auto 0;">${crearNodoHTML(finalMatch)}</div>`;
  html += `</div>`;

  html += `
    <div class="bracket-col">
      <div class="bracket-title">🏆 Campeón</div>
      <div class="champion-box">${campeonTexto}</div>
    </div>
  `;

  html += `</div>`;
  container.innerHTML = html;
}

function crearNodoHTML(p) {
  const winA = p.estado === 'Finalizado' && Number(p.golesA) > Number(p.golesB) ? 'winner' : '';
  const winB = p.estado === 'Finalizado' && Number(p.golesB) > Number(p.golesA) ? 'winner' : '';

  return `
    <div class="bracket-node" onclick="manejarClicPartido('${p.id}', '${p.disciplina}', '${p.fase}', '${p.equipoA}', '${p.equipoB}')">
      <div class="team ${winA}">
        <span>${renderizarNombreVisible(p.equipoA)}</span>
        <b>${p.estado === 'Finalizado' || p.estado === 'En Vivo' ? p.golesA : '-'}</b>
      </div>
      <div class="team ${winB}">
        <span>${renderizarNombreVisible(p.equipoB)}</span>
        <b>${p.estado === 'Finalizado' || p.estado === 'En Vivo' ? p.golesB : '-'}</b>
      </div>
    </div>
  `;
}

// ============================================================
// VISTA EN TARJETAS (FÚTBOL DE CAMPO Y PIKIVOLEY)
// ============================================================
function renderizarPartidosDisciplina(disciplina, contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  const partidos = datosTorneo.partidos.filter(p => normalizarTexto(p.disciplina) === normalizarTexto(disciplina));

  if (partidos.length === 0) {
    contenedor.innerHTML = `<p style="color:#aaa;">No hay partidos programados para ${disciplina}.</p>`;
    return;
  }

  let html = `<div class="grid-partidos">`;
  partidos.forEach(p => {
    html += `
      <div class="card-partido" onclick="manejarClicPartido('${p.id}', '${p.disciplina}', '${p.fase}', '${p.equipoA}', '${p.equipoB}')" style="cursor:pointer;">
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
          <small style="color:#aaa;">📅 ${p.fechaHora} | Estado: <b>${p.estado}</b></small>
          ${generarBarraApoyoHTML(p.id, p.equipoA, p.equipoB)}
        </div>
        <button class="btn-cargar-card solo-logistica" onclick="event.stopPropagation(); abrirModalAdmin('${p.id}', '${p.disciplina}', '${p.fase}', '${p.equipoA}', '${p.equipoB}')">✏️ Cargar Resultado / Tarjetas</button>
      </div>
    `;
  });
  html += `</div>`;
  contenedor.innerHTML = html;
}

// Filtros por Categoría de Sexo
function marcarSubTabActiva(boton) {
  if (!boton || !boton.parentElement) return;
  const hermanos = boton.parentElement.getElementsByClassName("sub-link");
  for (let i = 0; i < hermanos.length; i++) {
    hermanos[i].classList.remove("active");
  }
  boton.classList.add("active");
}

function filtrarFutsalSexo(sexo, evt) {
  const disciplina = sexo === 'M' ? "Futsal Masculino" : "Futsal Femenino";
  renderizarArbolGrafico(disciplina, "futsal-content");
  marcarSubTabActiva((evt && evt.currentTarget) || (window.event && window.event.currentTarget));
}

function filtrarFutbolSexo(sexo, evt) {
  const disciplina = sexo === 'M' ? "Fútbol de Campo Masculino" : "Fútbol de Campo Femenino";
  renderizarPartidosDisciplina(disciplina, "futbol-content");
  marcarSubTabActiva((evt && evt.currentTarget) || (window.event && window.event.currentTarget));
}

function openTab(evt, tabName) {
  if (evt) evt.preventDefault();
  const tabcontent = document.getElementsByClassName("tab-content");
  for (let i = 0; i < tabcontent.length; i++) { tabcontent[i].style.display = "none"; }
  const tablinks = document.getElementsByClassName("tab-link");
  for (let i = 0; i < tablinks.length; i++) { tablinks[i].className = tablinks[i].className.replace(" active", ""); }
  const targetTab = document.getElementById(tabName);
  if (targetTab) targetTab.style.display = "block";
  if (evt && evt.currentTarget) evt.currentTarget.className += " active";
}

// ============================================================
// MODALES Y OPERACIONES DE ORGANIZACIÓN (LOGÍSTICA Y SUPER ADMIN)
// ============================================================

// Modal Solo Lectura para Espectadores
async function abrirModalDetalles(idPartido, disciplina = "", fase = "", eqA = "", eqB = "") {
  let partido = datosTorneo.partidos.find(p => p.id === idPartido);

  document.getElementById("detalles-partido-titulo").innerText = `${disciplina}: ${renderizarNombreVisible(eqA)} vs ${renderizarNombreVisible(eqB)}`;
  document.getElementById("detalles-partido-fase").innerText = `Fase: ${fase} | Estado: ${partido ? partido.estado : 'Pendiente'}`;
  document.getElementById("detalles-equipo-a").innerText = renderizarNombreVisible(eqA);
  document.getElementById("detalles-equipo-b").innerText = renderizarNombreVisible(eqB);
  document.getElementById("detalles-marcador").innerText = `${partido && partido.golesA !== "" ? partido.golesA : "-"} : ${partido && partido.golesB !== "" ? partido.golesB : "-"}`;

  const ul = document.getElementById("detalles-lista-incidencias");
  ul.innerHTML = "<li>Cargando incidencias...</li>";

  const { data: incidencias } = await dbClient
    .from('incidencias')
    .select('*')
    .eq('id_partido', idPartido);

  if (!incidencias || incidencias.length === 0) {
    ul.innerHTML = "<li style='color:#aaa;'>Sin incidencias ni tarjetas registradas en este encuentro.</li>";
  } else {
    let html = "";
    incidencias.forEach(inc => {
      let icono = "⚽";
      if (inc.tipo_evento === "Tarjeta Amarilla") icono = "🟨";
      if (inc.tipo_evento === "Tarjeta Roja") icono = "🟥";
      if (inc.tipo_evento === "Tarjeta Azul") icono = "🟦";

      html += `<li>${icono} <b>${inc.jugador_nombre}</b> (${renderizarNombreVisible(inc.curso_equipo)}) - ${inc.tipo_evento}</li>`;
    });
    ul.innerHTML = html;
  }

  document.getElementById("modal-detalles-partido").style.display = "block";
}

function cerrarModalDetalles() {
  document.getElementById("modal-detalles-partido").style.display = "none";
}

async function cambiarEstadoPartido(nuevoEstado) {
  const idPartido = document.getElementById("admin-id-partido").value;
  await dbClient.from('partidos').update({ estado: nuevoEstado }).eq('id', idPartido);
  cargarDatos();
}

async function abrirModalAdmin(idPartido, disciplina = "", fase = "", eqA = "", eqB = "") {
  if (!esModoLogistica) return;

  let partido = datosTorneo.partidos.find(p => p.id === idPartido);

  document.getElementById("admin-id-partido").value = idPartido;
  document.getElementById("modal-partido-titulo").innerText = `${eqA || 'Por definir'} vs ${eqB || 'Por definir'}`;
  document.getElementById("modal-partido-titulo").dataset.disciplina = disciplina;
  document.getElementById("modal-partido-titulo").dataset.fase = fase;
  document.getElementById("lbl-equipo-a").innerText = renderizarNombreVisible(eqA) || "Equipo A";
  document.getElementById("lbl-equipo-b").innerText = renderizarNombreVisible(eqB) || "Equipo B";

  document.getElementById("btn-quick-lbl-a").innerText = renderizarNombreVisible(eqA) || "Equipo A";
  document.getElementById("btn-quick-lbl-b").innerText = renderizarNombreVisible(eqB) || "Equipo B";

  document.getElementById("goles-a").value = partido && partido.golesA !== undefined ? partido.golesA : "";
  document.getElementById("goles-b").value = partido && partido.golesB !== undefined ? partido.golesB : "";

  const selEquipo = document.getElementById("incidencia-equipo");
  selEquipo.innerHTML = "";
  if (eqA && eqA !== 'Por definir') selEquipo.innerHTML += `<option value="${eqA}">${renderizarNombreVisible(eqA)}</option>`;
  if (eqB && eqB !== 'Por definir') selEquipo.innerHTML += `<option value="${eqB}">${renderizarNombreVisible(eqB)}</option>`;

  const selTipoIncidencia = document.getElementById("incidencia-tipo");
  selTipoIncidencia.innerHTML = "";
  const discNorm = normalizarTexto(disciplina);

  if (!discNorm.includes("volley") && !discNorm.includes("voley") && !discNorm.includes("piki")) {
    selTipoIncidencia.innerHTML += `<option value="Gol">⚽ Gol</option>`;
  }
  selTipoIncidencia.innerHTML += `
    <option value="Tarjeta Amarilla">🟨 Tarjeta Amarilla</option>
    <option value="Tarjeta Roja">🟥 Tarjeta Roja</option>
    <option value="Tarjeta Azul">🟦 Tarjeta Azul</option>
  `;

  await cargarIncidenciasModal(idPartido);
  document.getElementById("modal-admin").style.display = "block";
}

function cerrarModalAdmin() {
  document.getElementById("modal-admin").style.display = "none";
}

async function sumarPuntoRapido(equipo, cambio) {
  const idPartido = document.getElementById("admin-id-partido").value;
  let valA = Number(document.getElementById("goles-a").value || 0);
  let valB = Number(document.getElementById("goles-b").value || 0);

  if (equipo === 'A') valA = Math.max(0, valA + cambio);
  if (equipo === 'B') valB = Math.max(0, valB + cambio);

  document.getElementById("goles-a").value = valA;
  document.getElementById("goles-b").value = valB;

  const existe = datosTorneo.partidos.find(p => p.id === idPartido);

  if (!existe && idPartido.startsWith("VIRTUAL-")) {
    const disciplina = document.getElementById("modal-partido-titulo").dataset.disciplina || "Volley Mixto";
    const fase = document.getElementById("modal-partido-titulo").dataset.fase || "Semifinales";
    const eqA = document.getElementById("lbl-equipo-a").innerText;
    const eqB = document.getElementById("lbl-equipo-b").innerText;

    const idReal = "PAR-" + new Date().getTime();
    await dbClient.from('partidos').insert([{
      id: idReal,
      disciplina: disciplina,
      fase: fase,
      equipo_a: eqA,
      equipo_b: eqB,
      goles_a: valA,
      goles_b: valB,
      estado: 'En Vivo'
    }]);
  } else {
    await dbClient.from('partidos').update({
      goles_a: valA,
      goles_b: valB,
      estado: 'En Vivo'
    }).eq('id', idPartido);
  }

  cargarDatos();
}

async function agregarIncidencia() {
  const idPartido = document.getElementById("admin-id-partido").value;
  const equipo = document.getElementById("incidencia-equipo").value;
  const jugador = document.getElementById("incidencia-jugador").value.trim();
  const tipo = document.getElementById("incidencia-tipo").value;

  if (!jugador) {
    alert("Por favor ingrese el nombre del jugador.");
    return;
  }

  const idGenerado = "INC-" + new Date().getTime();

  const { error } = await dbClient
    .from('incidencias')
    .insert([{
      id: idGenerado,
      id_partido: idPartido,
      jugador_nombre: jugador,
      curso_equipo: equipo,
      tipo_evento: tipo
    }]);

  if (error) {
    alert("Error al registrar incidencia: " + error.message);
  } else {
    document.getElementById("incidencia-jugador").value = "";
    await cargarIncidenciasModal(idPartido);
  }
}

async function cargarIncidenciasModal(idPartido) {
  const listContainer = document.getElementById("lista-incidencias");
  if (!listContainer) return;

  const { data: incidencias } = await dbClient
    .from('incidencias')
    .select('*')
    .eq('id_partido', idPartido);

  if (!incidencias || incidencias.length === 0) {
    listContainer.innerHTML = "<li style='color:#aaa;'>Sin incidencias registradas.</li>";
    return;
  }

  let html = "";
  incidencias.forEach(inc => {
    let icono = "⚽";
    if (inc.tipo_evento === "Tarjeta Amarilla") icono = "🟨";
    if (inc.tipo_evento === "Tarjeta Roja") icono = "🟥";
    if (inc.tipo_evento === "Tarjeta Azul") icono = "🟦";

    html += `<li>${icono} <b>${inc.jugador_nombre}</b> (${renderizarNombreVisible(inc.curso_equipo)}) - ${inc.tipo_evento}</li>`;
  });
  listContainer.innerHTML = html;
}

async function enviarResultado() {
  const idPartido = document.getElementById("admin-id-partido").value;
  const golesA = document.getElementById("goles-a").value;
  const golesB = document.getElementById("goles-b").value;

  if (golesA === "" || golesB === "") {
    alert("Por favor ingrese ambos marcadores.");
    return;
  }

  const gA = parseInt(golesA);
  const gB = parseInt(golesB);

  const existe = datosTorneo.partidos.find(p => p.id === idPartido);

  if (!existe && idPartido.startsWith("VIRTUAL-")) {
    const disciplina = document.getElementById("modal-partido-titulo").dataset.disciplina || "Futsal Masculino";
    const fase = document.getElementById("modal-partido-titulo").dataset.fase || "Semifinales";
    const eqA = document.getElementById("lbl-equipo-a").innerText;
    const eqB = document.getElementById("lbl-equipo-b").innerText;

    const idReal = "PAR-" + new Date().getTime();
    await dbClient.from('partidos').insert([{
      id: idReal,
      disciplina: disciplina,
      fase: fase,
      equipo_a: eqA,
      equipo_b: eqB,
      goles_a: gA,
      goles_b: gB,
      estado: 'Finalizado'
    }]);
  } else {
    await dbClient
      .from('partidos')
      .update({
        goles_a: gA,
        goles_b: gB,
        estado: 'Finalizado'
      })
      .eq('id', idPartido);
  }

  cerrarModalAdmin();
  cargarDatos();
}

async function eliminarPartido() {
  if (!esModoSuperAdmin) {
    alert("Esta función es exclusiva del Super Administrador.");
    return;
  }

  const idPartido = document.getElementById("admin-id-partido").value;
  if (!confirm("¿Estás seguro de que deseas eliminar este partido y sus incidencias?")) return;

  await dbClient.from('incidencias').delete().eq('id_partido', idPartido);
  const { error } = await dbClient.from('partidos').delete().eq('id', idPartido);

  if (error) {
    alert("Error al eliminar partido: " + error.message);
  } else {
    alert("Partido eliminado correctamente.");
    cerrarModalAdmin();
    cargarDatos();
  }
}

function abrirModalCrearPartido(disciplinaPrevia = "") {
  if (!esModoLogistica) return;

  if (disciplinaPrevia) {
    document.getElementById("crear-disciplina").value = disciplinaPrevia;
  }

  const selA = document.getElementById("crear-equipo-a");
  const selB = document.getElementById("crear-equipo-b");
  selA.innerHTML = ""; selB.innerHTML = "";

  CURSOS_EQUIPOS.forEach(c => {
    selA.innerHTML += `<option value="${c}">${renderizarNombreVisible(c)}</option>`;
    selB.innerHTML += `<option value="${c}">${renderizarNombreVisible(c)}</option>`;
  });

  document.getElementById("crear-orden").value = (datosTorneo.partidos.length + 1);
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

  let fechaHoraFormateada = fechaHoraRaw;
  if (fechaHoraRaw && !fechaHoraRaw.includes("/")) {
    const f = new Date(fechaHoraRaw);
    if (!isNaN(f.getTime())) {
      fechaHoraFormateada = `${String(f.getDate()).padStart(2,'0')}/${String(f.getMonth()+1).padStart(2,'0')} ${String(f.getHours()).padStart(2,'0')}:${String(f.getMinutes()).padStart(2,'0')} HS`;
    }
  }

  const idNuevo = "PAR-" + new Date().getTime();

  const { error } = await dbClient
    .from('partidos')
    .insert([{
      id: idNuevo,
      disciplina: disciplina,
      fase: fase,
      equipo_a: equipoA,
      equipo_b: equipoB,
      fecha_hora: fechaHoraFormateada,
      orden: parseInt(orden),
      estado: 'Pendiente'
    }]);

  if (error) {
    document.getElementById("crear-msj").innerText = "Error: " + error.message;
  } else {
    cerrarModalCrearPartido();
    cargarDatos();
  }
}

function abrirModalAjustarPuntos() {
  if (!esModoSuperAdmin) return;
  const selCurso = document.getElementById("ajuste-curso-select");
  if (!selCurso) return;
  selCurso.innerHTML = "";

  CURSOS_EQUIPOS.forEach(c => {
    selCurso.innerHTML += `<option value="${c}">${renderizarNombreVisible(c)}</option>`;
  });

  document.getElementById("ajuste-puntos-input").value = "";
  document.getElementById("ajuste-msj").innerText = "";
  document.getElementById("modal-ajustar-puntos").style.display = "block";
}

function cerrarModalAjustarPuntos() {
  document.getElementById("modal-ajustar-puntos").style.display = "none";
}

async function guardarPuntosManuales() {
  const curso = document.getElementById("ajuste-curso-select").value;
  const disciplinaKey = document.getElementById("ajuste-disciplina-select").value;
  const puntos = document.getElementById("ajuste-puntos-input").value;

  if (!puntos) {
    document.getElementById("ajuste-msj").innerText = "Ingrese los puntos.";
    return;
  }

  document.getElementById("ajuste-msj").innerText = "Guardando ajuste...";

  try {
    const { error } = await dbClient
      .from('medallero')
      .upsert({
        curso_equipo: curso,
        [disciplinaKey]: parseInt(puntos)
      }, { onConflict: 'curso_equipo' });

    if (error) {
      document.getElementById("ajuste-msj").innerText = "Error: " + error.message;
    } else {
      document.getElementById("ajuste-msj").innerText = "¡Puntos ajustados!";
      setTimeout(cerrarModalAjustarPuntos, 1000);
      renderizarMedalleroReal();
    }
  } catch (err) {
    document.getElementById("ajuste-msj").innerText = "Error de conexión";
  }
}

// ============================================================
// TABLAS ESTADÍSTICAS Y VISTAS GENERALES
// ============================================================
async function renderizarMedalleroReal() {
  const contenedor = document.getElementById("medallero-content");
  if (!contenedor) return;

  try {
    const { data: medallero } = await dbClient.from('medallero').select('*');

    if (!medallero || medallero.length === 0) {
      renderizarMedalleroGeneral();
      return;
    }

    medallero.sort((a, b) => {
      const totA = (a.futsalM||0)+(a.futsalF||0)+(a.futbol||0)+(a.voley||0)+(a.pikivoley||0)+(a.esports||0)+(a.ajedrez||0)+(a.maraton||0)+(a.ciclismo||0);
      const totB = (b.futsalM||0)+(b.futsalF||0)+(b.futbol||0)+(b.voley||0)+(b.pikivoley||0)+(b.esports||0)+(b.ajedrez||0)+(b.maraton||0)+(b.ciclismo||0);
      return totB - totA;
    });

    let html = `<div style="overflow-x:auto;"><table class="tabla-deportiva"><thead><tr><th>Pos.</th><th>Curso / Equipo</th><th>Futsal M</th><th>Futsal F</th><th>Fútbol</th><th>Vóley</th><th>Pikivoley</th><th>E-Sports</th><th>Ajedrez</th><th>Maratón</th><th>Ciclismo</th><th>TOTAL PTS</th></tr></thead><tbody>`;

    medallero.forEach((f, index) => {
      const total = (f.futsalM||0)+(f.futsalF||0)+(f.futbol||0)+(f.voley||0)+(f.pikivoley||0)+(f.esports||0)+(f.ajedrez||0)+(f.maraton||0)+(f.ciclismo||0);
      html += `<tr><td><b>#${index + 1}</b></td><td><strong>${renderizarNombreVisible(f.curso_equipo)}</strong></td><td>${f.futsalM||0}</td><td>${f.futsalF||0}</td><td>${f.futbol||0}</td><td>${f.voley||0}</td><td>${f.pikivoley||0}</td><td>${f.esports||0}</td><td>${f.ajedrez||0}</td><td>${f.maraton||0}</td><td>${f.ciclismo||0}</td><td><b style="color:#d4af37; font-size:15px;">${total} PTS</b></td></tr>`;
    });

    html += `</tbody></table></div>`;
    contenedor.innerHTML = html;
  } catch (e) {
    console.error("Error al renderizar medallero real:", e);
  }
}

function renderizarMedalleroGeneral() {
  renderizarMedalleroReal();
}

function renderizarEstadisticasEquipos() {
  const container = document.getElementById("estadisticas-content");
  if (!container) return;

  const stats = {};
  CURSOS_EQUIPOS.forEach(eq => {
    stats[eq] = { pj: 0, pg: 0, pp: 0, gf: 0, gc: 0 };
  });

  datosTorneo.partidos.forEach(p => {
    if (p.estado === 'Finalizado') {
      const gA = Number(p.golesA);
      const gB = Number(p.golesB);

      if (stats[p.equipoA]) {
        stats[p.equipoA].pj++;
        stats[p.equipoA].gf += gA;
        stats[p.equipoA].gc += gB;
        if (gA > gB) stats[p.equipoA].pg++;
        else stats[p.equipoA].pp++;
      }

      if (stats[p.equipoB]) {
        stats[p.equipoB].pj++;
        stats[p.equipoB].gf += gB;
        stats[p.equipoB].gc += gA;
        if (gB > gA) stats[p.equipoB].pg++;
        else stats[p.equipoB].pp++;
      }
    }
  });

  const lista = Object.keys(stats).map(eq => ({ equipo: eq, ...stats[eq] }));

  let html = `<div style="overflow-x:auto;"><table class="tabla-deportiva"><thead><tr><th>Equipo / Curso</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>Dif. Goles</th></tr></thead><tbody>`;

  lista.forEach(item => {
    html += `<tr><td><b>${renderizarNombreVisible(item.equipo)}</b></td><td>${item.pj}</td><td>${item.pg}</td><td>${item.pp}</td><td>${item.gf}</td><td>${item.gc}</td><td>${item.gf - item.gc}</td></tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function renderizarCuadroHonor() {
  const container = document.getElementById("cuadro-honor-content");
  if (!container) return;

  const goleadoresFutsal = {};
  let tarjetasPorEquipo = {};

  datosTorneo.incidencias.forEach(inc => {
    if (inc.tipo_evento === 'Gol') {
      goleadoresFutsal[inc.jugador_nombre] = (goleadoresFutsal[inc.jugador_nombre] || 0) + 1;
    }
    if (inc.tipo_evento && inc.tipo_evento.includes('Tarjeta')) {
      tarjetasPorEquipo[inc.curso_equipo] = (tarjetasPorEquipo[inc.curso_equipo] || 0) + 1;
    }
  });

  let topGoleador = "Por definir";
  let maxGoles = 0;
  Object.keys(goleadoresFutsal).forEach(j => {
    if (goleadoresFutsal[j] > maxGoles) {
      maxGoles = goleadoresFutsal[j];
      topGoleador = `${j} (${maxGoles} goles)`;
    }
  });

  let equipoFairPlay = "Por definir";
  let minTarjetas = 999;
  CURSOS_EQUIPOS.forEach(eq => {
    const cant = tarjetasPorEquipo[eq] || 0;
    if (cant < minTarjetas) {
      minTarjetas = cant;
      equipoFairPlay = `${renderizarNombreVisible(eq)} (${cant} tarjetas)`;
    }
  });

  container.innerHTML = `
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:15px; margin-top:15px;">
      <div style="background:#161616; border:1px solid #333; padding:15px; border-radius:8px;">
        <h3 style="color:#d4af37; margin:0 0 8px 0;">⚽ Máximo Goleador</h3>
        <p style="margin:0; font-size:15px; font-weight:bold;">${topGoleador}</p>
      </div>
      <div style="background:#161616; border:1px solid #333; padding:15px; border-radius:8px;">
        <h3 style="color:#d4af37; margin:0 0 8px 0;">🕊️ Premio Fair Play</h3>
        <p style="margin:0; font-size:15px; font-weight:bold;">${equipoFairPlay}</p>
      </div>
    </div>
  `;
}

function renderizarComparativaCarreras() {
  const container = document.getElementById("comparativa-content");
  if (!container) return;

  let victoriasPsico = 0;
  let victoriasEdu = 0;
  let golesPsico = 0;
  let golesEdu = 0;

  datosTorneo.partidos.forEach(p => {
    if (p.estado === 'Finalizado') {
      const gA = Number(p.golesA);
      const gB = Number(p.golesB);

      if (p.equipoA && p.equipoA.includes("Psico")) golesPsico += gA;
      if (p.equipoA && p.equipoA.includes("Ciencias")) golesEdu += gA;
      if (p.equipoB && p.equipoB.includes("Psico")) golesPsico += gB;
      if (p.equipoB && p.equipoB.includes("Ciencias")) golesEdu += gB;

      if (gA !== gB) {
        const gan = gA > gB ? p.equipoA : p.equipoB;
        if (gan && gan.includes("Psico")) victoriasPsico++;
        if (gan && gan.includes("Ciencias")) victoriasEdu++;
      }
    }
  });

  const totalPartidos = victoriasPsico + victoriasEdu;
  const pctPsico = totalPartidos > 0 ? ((victoriasPsico / totalPartidos) * 100).toFixed(1) : 0;
  const pctEdu = totalPartidos > 0 ? ((victoriasEdu / totalPartidos) * 100).toFixed(1) : 0;

  container.innerHTML = `
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:15px; margin-top:15px;">
      <div style="background:#161616; border:1px solid #d4af37; padding:15px; border-radius:8px;">
        <h3 style="color:#d4af37; margin:0 0 8px 0;">🧠 Carrera de Psicología</h3>
        <p style="margin:0; font-size:18px; font-weight:bold;">${victoriasPsico} Victorias (${pctPsico}%)</p>
        <small style="color:#aaa;">Goles Convertidos: ${golesPsico}</small>
      </div>
      <div style="background:#161616; border:1px solid #d4af37; padding:15px; border-radius:8px;">
        <h3 style="color:#d4af37; margin:0 0 8px 0;">📚 Ciencias de la Educación</h3>
        <p style="margin:0; font-size:18px; font-weight:bold;">${victoriasEdu} Victorias (${pctEdu}%)</p>
        <small style="color:#aaa;">Goles Convertidos: ${golesEdu}</small>
      </div>
    </div>
  `;
}

// ============================================================
// TABLA DE GOLEADORES / ANOTADORES
// ============================================================
function renderizarGoleadoresTop() {
  const container = document.getElementById("goleadores-content");
  if (!container) return;

  const goleadores = {};

  datosTorneo.incidencias.forEach(inc => {
    if (inc.tipo_evento === 'Gol') {
      const clave = `${inc.jugador_nombre}|${inc.curso_equipo || ''}`;
      if (!goleadores[clave]) {
        goleadores[clave] = {
          jugador: inc.jugador_nombre,
          equipo: inc.curso_equipo || '',
          goles: 0
        };
      }
      goleadores[clave].goles++;
    }
  });

  const lista = Object.values(goleadores).sort((a, b) => b.goles - a.goles).slice(0, 15);

  if (lista.length === 0) {
    container.innerHTML = `<p style="color:#aaa;">Aún no hay goles registrados.</p>`;
    return;
  }

  let html = `<div style="overflow-x:auto;"><table class="tabla-deportiva"><thead><tr><th>Pos.</th><th>Jugador</th><th>Curso / Equipo</th><th>Goles</th></tr></thead><tbody>`;
  lista.forEach((g, index) => {
    html += `<tr><td><b>#${index + 1}</b></td><td>${g.jugador}</td><td>${renderizarNombreVisible(g.equipo)}</td><td><b style="color:#d4af37;">${g.goles}</b></td></tr>`;
  });
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

// ============================================================
// FIXTURE GENERAL (CRONOGRAMA COMPLETO)
// ============================================================
function renderizarFixtureGeneral() {
  const container = document.getElementById("fixture-content");
  if (!container) return;

  if (!datosTorneo.partidos || datosTorneo.partidos.length === 0) {
    container.innerHTML = `<p style="color:#aaa;">Aún no hay partidos cargados.</p>`;
    return;
  }

  const partidosOrdenados = [...datosTorneo.partidos].sort((a, b) => a.orden - b.orden);

  const badgeEstado = (estado) => {
    if (estado === 'En Vivo') return `<span style="color:#ef4444; font-weight:bold;">🔴 En Vivo</span>`;
    if (estado === 'Finalizado') return `<span style="color:#10b981; font-weight:bold;">🟢 Finalizado</span>`;
    return `<span style="color:#f59e0b; font-weight:bold;">🟡 Próximamente</span>`;
  };

  let html = `<div style="overflow-x:auto;"><table class="tabla-deportiva"><thead><tr><th>#</th><th>Disciplina</th><th>Fase</th><th>Partido</th><th>Resultado</th><th>Fecha / Hora</th><th>Estado</th></tr></thead><tbody>`;

  partidosOrdenados.forEach(p => {
    const resultado = (p.golesA !== "" && p.golesB !== "") ? `${p.golesA} - ${p.golesB}` : "vs";
    html += `
      <tr onclick="manejarClicPartido('${p.id}', '${p.disciplina}', '${p.fase}', '${p.equipoA}', '${p.equipoB}')" style="cursor:pointer;">
        <td>${p.orden}</td>
        <td>${p.disciplina}</td>
        <td>${p.fase}</td>
        <td>${renderizarNombreVisible(p.equipoA)} vs ${renderizarNombreVisible(p.equipoB)}</td>
        <td>${resultado}</td>
        <td>${p.fechaHora || '-'}</td>
        <td>${badgeEstado(p.estado)}</td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

// ============================================================
// REPORTE DE JUGADORES SUSPENDIDOS / INHABILITADOS
// ============================================================
function renderizarSuspendidos() {
  const container = document.getElementById("suspendidos-content");
  if (!container) return;

  const conteo = {};

  datosTorneo.incidencias.forEach(inc => {
    if (inc.tipo_evento && inc.tipo_evento.includes('Tarjeta')) {
      const clave = `${inc.jugador_nombre}|${inc.curso_equipo || ''}`;
      if (!conteo[clave]) {
        conteo[clave] = {
          jugador: inc.jugador_nombre,
          equipo: inc.curso_equipo || '',
          amarillas: 0,
          rojas: 0,
          azules: 0
        };
      }
      if (inc.tipo_evento === 'Tarjeta Amarilla') conteo[clave].amarillas++;
      if (inc.tipo_evento === 'Tarjeta Roja') conteo[clave].rojas++;
      if (inc.tipo_evento === 'Tarjeta Azul') conteo[clave].azules++;
    }
  });

  // Un jugador queda suspendido con tarjeta roja directa o al acumular 2 amarillas
  const suspendidos = Object.values(conteo).filter(j => j.rojas >= 1 || j.amarillas >= 2);

  if (suspendidos.length === 0) {
    container.innerHTML = `<p style="color:#aaa;">No hay jugadores suspendidos por el momento.</p>`;
    return;
  }

  let html = `<div style="overflow-x:auto;"><table class="tabla-deportiva"><thead><tr><th>Jugador</th><th>Curso / Equipo</th><th>🟨</th><th>🟥</th><th>🟦</th><th>Motivo</th></tr></thead><tbody>`;

  suspendidos.forEach(j => {
    const motivo = j.rojas >= 1 ? "Tarjeta Roja Directa" : "Acumulación de Amarillas (2)";
    html += `<tr><td><b>${j.jugador}</b></td><td>${renderizarNombreVisible(j.equipo)}</td><td>${j.amarillas}</td><td>${j.rojas}</td><td>${j.azules}</td><td style="color:#ef4444; font-weight:bold;">${motivo}</td></tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

// ============================================================
// BARRA DE APOYO / HINCHADA
// ============================================================
function generarBarraApoyoHTML(idPartido, equipoA, equipoB) {
  // No se puede votar en cruces virtuales de brackets (aún no existen en la BD)
  if (!idPartido || idPartido.startsWith('VIRTUAL-')) return '';
  if (!equipoA || !equipoB || equipoA === 'Por definir' || equipoB === 'Por definir') return '';

  const votos = apoyosCache.filter(v => v.id_partido === idPartido);
  const votosA = votos.filter(v => v.equipo === 'A').length;
  const votosB = votos.filter(v => v.equipo === 'B').length;
  const total = votosA + votosB;
  const pctA = total > 0 ? Math.round((votosA / total) * 100) : 50;
  const pctB = 100 - pctA;
  const yaVoto = localStorage.getItem('voto_apoyo_' + idPartido);

  return `
    <div class="apoyo-box" onclick="event.stopPropagation();">
      <div class="apoyo-header">🔥 BARRA DE APOYO</div>
      <div class="apoyo-barra">
        <div class="apoyo-fill-a" style="width:${pctA}%;"></div>
        <div class="apoyo-fill-b" style="width:${pctB}%;"></div>
      </div>
      <div class="apoyo-botones">
        <button class="btn-apoyo" ${yaVoto ? 'disabled' : ''} onclick="votarApoyo('${idPartido}', 'A')">
          <span>👊 ${renderizarNombreVisible(equipoA)}</span><b>${pctA}%</b>
        </button>
        <button class="btn-apoyo" ${yaVoto ? 'disabled' : ''} onclick="votarApoyo('${idPartido}', 'B')">
          <span>${renderizarNombreVisible(equipoB)} 👊</span><b>${pctB}%</b>
        </button>
      </div>
      <small class="apoyo-total">${total} voto${total === 1 ? '' : 's'} registrado${total === 1 ? '' : 's'}${yaVoto ? ' · ¡ya votaste!' : ''}</small>
    </div>
  `;
}

async function votarApoyo(idPartido, lado) {
  if (localStorage.getItem('voto_apoyo_' + idPartido)) {
    alert('Ya emitiste tu voto de apoyo en este partido.');
    return;
  }

  const idNuevo = 'APOYO-' + new Date().getTime();
  const { error } = await dbClient.from('apoyos').insert([{
    id: idNuevo,
    id_partido: idPartido,
    equipo: lado
  }]);

  if (error) {
    alert('Error al registrar tu voto: ' + error.message);
    return;
  }

  localStorage.setItem('voto_apoyo_' + idPartido, lado);
  cargarDatos();
}

// ============================================================
// REACCIONES RÁPIDAS FLOTANTES
// ============================================================
async function enviarReaccion(emoji) {
  lanzarEmojiFlotante(emoji); // feedback inmediato para quien reacciona

  const partidoActual = datosTorneo.partidos.find(p => p.estado === 'En Vivo');
  const idNuevo = 'REAC-' + new Date().getTime();

  try {
    await dbClient.from('reacciones').insert([{
      id: idNuevo,
      id_partido: partidoActual ? partidoActual.id : null,
      emoji: emoji
    }]);
  } catch (e) {
    console.log('Error al enviar reacción:', e);
  }
}

function lanzarEmojiFlotante(emoji) {
  const overlay = document.getElementById('reacciones-overlay');
  if (!overlay) return;

  const span = document.createElement('span');
  span.className = 'emoji-flotante';
  span.textContent = emoji;
  span.style.left = (10 + Math.random() * 80) + '%';
  span.style.setProperty('--drift', (Math.random() * 80 - 40) + 'px');

  overlay.appendChild(span);
  setTimeout(() => span.remove(), 2700);
}

// ============================================================
// MURO DE COMENTARIOS ANÓNIMOS (COLA FIFO, MÁX. 10)
// ============================================================
async function enviarComentario() {
  const input = document.getElementById('comentario-input');
  if (!input) return;
  const texto = input.value.trim();

  if (!texto) return;
  if (texto.length > 200) {
    alert('El comentario no puede superar los 200 caracteres.');
    return;
  }

  const idNuevo = 'COM-' + new Date().getTime();
  const { error } = await dbClient.from('comentarios').insert([{ id: idNuevo, mensaje: texto }]);

  if (error) {
    alert('Error al enviar el comentario: ' + error.message);
    return;
  }

  input.value = '';
  await limpiarComentariosExcedentes();
  cargarDatos();
}

// Mantiene la cola FIFO: si hay más de 10 comentarios, borra los más antiguos
async function limpiarComentariosExcedentes() {
  const { data: todos } = await dbClient
    .from('comentarios')
    .select('*')
    .order('created_at', { ascending: true });

  if (todos && todos.length > 10) {
    const sobrantes = todos.slice(0, todos.length - 10);
    for (const c of sobrantes) {
      await dbClient.from('comentarios').delete().eq('id', c.id);
    }
  }
}

function renderizarMuroComentarios() {
  const lista = document.getElementById('muro-comentarios-lista');
  if (!lista) return;

  if (!comentariosCache || comentariosCache.length === 0) {
    lista.innerHTML = `<li style="color:#aaa;">Sé el primero en comentar 👀</li>`;
    return;
  }

  // Mostrar el más reciente arriba
  const html = [...comentariosCache].reverse().map(c =>
    `<li class="comentario-item">💬 ${escaparHTML(c.mensaje)}</li>`
  ).join('');

  lista.innerHTML = html;
}

// ============================================================
// QUINIELA / PREDICCIONES
// ============================================================
function renderizarFormularioQuiniela() {
  const selCurso = document.getElementById('quiniela-curso');
  const selFutsal = document.getElementById('quiniela-pred-futsal');
  const selFutbol = document.getElementById('quiniela-pred-futbol');
  const selVoley = document.getElementById('quiniela-pred-voley');
  const selPiki = document.getElementById('quiniela-pred-pikivoley');

  if (!selCurso || !selFutsal || !selFutbol || !selVoley || !selPiki) return;

  // Evitar re-poblar si el alumno ya está eligiendo algo (para no resetear el form en cada recarga)
  if (selCurso.dataset.cargado === 'true') return;

  const opciones = CURSOS_EQUIPOS.map(c => `<option value="${c}">${renderizarNombreVisible(c)}</option>`).join('');
  selCurso.innerHTML = opciones;
  selFutsal.innerHTML = opciones;
  selFutbol.innerHTML = opciones;
  selVoley.innerHTML = opciones;
  selPiki.innerHTML = opciones;

  selCurso.dataset.cargado = 'true';

  if (localStorage.getItem('ya_predije')) {
    document.getElementById('quiniela-msj').innerText = 'Ya enviaste tu predicción desde este dispositivo. ¡Suerte!';
  }
}

async function enviarPrediccion() {
  const nombre = document.getElementById('quiniela-nombre').value.trim();
  const curso = document.getElementById('quiniela-curso').value;
  const predFutsal = document.getElementById('quiniela-pred-futsal').value;
  const predFutbol = document.getElementById('quiniela-pred-futbol').value;
  const predVoley = document.getElementById('quiniela-pred-voley').value;
  const predPiki = document.getElementById('quiniela-pred-pikivoley').value;
  const msj = document.getElementById('quiniela-msj');

  if (!nombre) {
    msj.innerText = 'Por favor ingresá tu nombre.';
    return;
  }

  if (localStorage.getItem('ya_predije')) {
    msj.innerText = 'Ya enviaste tu predicción desde este dispositivo.';
    return;
  }

  const idNuevo = 'PRED-' + new Date().getTime();
  msj.innerText = 'Enviando predicción...';

  const { error } = await dbClient.from('predicciones').insert([{
    id: idNuevo,
    nombre: nombre,
    curso: curso,
    pred_futsal: predFutsal,
    pred_futbol: predFutbol,
    pred_voley: predVoley,
    pred_pikivoley: predPiki
  }]);

  if (error) {
    msj.innerText = 'Error: ' + error.message;
    return;
  }

  localStorage.setItem('ya_predije', 'true');
  msj.innerText = '¡Predicción registrada! Buena suerte 🎯';
  cargarDatos();
}

// Determina el campeón de una disciplina buscando el ganador de su partido de "Final"
function obtenerCampeonDisciplina(disciplina) {
  const partidos = datosTorneo.partidos.filter(p => normalizarTexto(p.disciplina) === normalizarTexto(disciplina));
  const finalMatch = partidos.find(p => {
    const f = normalizarTexto(p.fase);
    return f.includes('final') && !f.includes('semi');
  });
  return obtenerGanador(finalMatch);
}

function renderizarQuinielaRanking() {
  const container = document.getElementById('quiniela-ranking-content');
  if (!container) return;

  if (!prediccionesCache || prediccionesCache.length === 0) {
    container.innerHTML = `<p style="color:#aaa;">Todavía nadie cargó su predicción. ¡Sé el primero!</p>`;
    return;
  }

  const campFutsal = obtenerCampeonDisciplina('Futsal Masculino');
  const campFutbol = obtenerCampeonDisciplina('Fútbol de Campo Masculino');
  const campVoley = obtenerCampeonDisciplina('Volley Mixto');
  const campPiki = obtenerCampeonDisciplina('Pikivoley Masculino');

  const ranking = prediccionesCache.map(p => {
    let aciertos = 0;
    if (campFutsal && p.pred_futsal === campFutsal) aciertos++;
    if (campFutbol && p.pred_futbol === campFutbol) aciertos++;
    if (campVoley && p.pred_voley === campVoley) aciertos++;
    if (campPiki && p.pred_pikivoley === campPiki) aciertos++;
    return { nombre: p.nombre, curso: p.curso, aciertos };
  }).sort((a, b) => b.aciertos - a.aciertos);

  let html = `<div style="overflow-x:auto;"><table class="tabla-deportiva"><thead><tr><th>Pos.</th><th>Alumno</th><th>Curso</th><th>Aciertos</th></tr></thead><tbody>`;

  ranking.forEach((r, index) => {
    const claseBadge = index === 0 ? 'badge-posicion-1' : index === 1 ? 'badge-posicion-2' : index === 2 ? 'badge-posicion-3' : '';
    html += `<tr><td><b class="${claseBadge}">#${index + 1}</b></td><td>${escaparHTML(r.nombre)}</td><td>${renderizarNombreVisible(r.curso)}</td><td><b style="color:#d4af37;">${r.aciertos} / 4</b></td></tr>`;
  });

  html += `</tbody></table></div>
  <p style="color:#888; font-size:11px; margin-top:8px;">Los aciertos se actualizan automáticamente a medida que se juegan las finales de cada disciplina.</p>`;
  container.innerHTML = html;
}

window.onload = function() {
  cargarDatos();
};