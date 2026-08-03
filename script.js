let esModoLogistica = false;
let esModoSuperAdmin = false;

// Claves obtenidas de Supabase
const SUPABASE_URL = "https://zkklifirmzvlwapivbrc.supabase.co";
const SUPABASE_KEY = "sb_publishable_Od54CMAGf_6wyGbeU-vvCw_FWzvrvbd";

const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let datosTorneo = { partidos: [], incidencias: [] };

const CURSOS_EQUIPOS = [
  "Imperial Lions (1 Ciencias)", "Zero One (2 Ciencias)", "Celans (3 Ciencias)", "Dements (4 Ciencias)",
  "Phoenix Legacy (1 Psico)", "Phisius (2 Psico)", "Danaus (3 Psico)", "Hudex (4 Psico)", "Águilas Doradas (5 Psico)"
];

function normalizarTexto(txt) {
  if (!txt) return "";
  return txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Alternar Modo Logística (1234) / Super Admin (alucas)
function activarModoLogistica() {
  if (esModoLogistica || esModoSuperAdmin) {
    esModoLogistica = false;
    esModoSuperAdmin = false;
    document.body.classList.remove("modo-logistica", "modo-superadmin");
    alert("Modo Espectador activado.");
    return;
  }

  const pass = prompt("Ingrese contraseña de acceso:");
  if (pass === "1234") {
    esModoLogistica = true;
    esModoSuperAdmin = false;
    document.body.classList.add("modo-logistica");
    alert("¡Modo Logística activado!");
  } else if (pass === "alucas") {
    esModoLogistica = true;
    esModoSuperAdmin = true;
    document.body.classList.add("modo-logistica", "modo-superadmin");
    alert("¡Modo Super Admin (Lucas) activado!");
  } else if (pass !== null) {
    alert("Contraseña incorrecta.");
  }
}

// Suscripción Realtime
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

async function cargarDatos() {
  try {
    const { data: partidos } = await dbClient
      .from('partidos')
      .select('*')
      .order('orden', { ascending: true });

    const { data: incidencias } = await dbClient
      .from('incidencias')
      .select('*');

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

    renderizarArbolGrafico("Futsal Masculino", "futsal-content");
    renderizarArbolGrafico("Fútbol de Campo Masculino", "futbol-content");
    renderizarArbolGrafico("Volley Mixto", "voley-content");
    renderizarArbolGrafico("Pikivoley Masculino", "pikivoley-content");

    renderizarMedalleroReal();
    renderizarEstadisticasEquipos();
    renderizarCuadroHonor();
    renderizarComparativaCarreras();
  } catch (err) {
    console.error("Error al cargar datos:", err);
  }
}

function renderizarNombreVisible(nombreCompleto) {
  if (!nombreCompleto) return "Por definir";
  return nombreCompleto.split(" (")[0];
}

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

  const ganR1_0 = obtenerGanador(r1[0]);
  const ganR1_1 = obtenerGanador(r1);
  const ganR1_2 = obtenerGanador(r1);
  const ganR1_3 = obtenerGanador(r1);

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
    id: semisBD ? semisBD.id : `VIRTUAL-SEMI-2-${disciplina}`,
    fase: "Semifinales",
    disciplina: disciplina,
    equipoA: ganR1_2 || (semisBD ? semisBD.equipoA : 'Por definir'),
    equipoB: ganR1_3 || (semisBD ? semisBD.equipoB : 'Por definir'),
    golesA: semisBD ? semisBD.golesA : '',
    golesB: semisBD ? semisBD.golesB : '',
    estado: semisBD ? semisBD.estado : 'Pendiente'
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
    <div class="bracket-node" onclick="abrirModalAdmin('${p.id}', '${p.disciplina}', '${p.fase}', '${p.equipoA}', '${p.equipoB}')">
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
        <button class="btn-cargar-card solo-logistica" onclick="abrirModalAdmin('${p.id}', '${p.disciplina}', '${p.fase}', '${p.equipoA}', '${p.equipoB}')">✏️ Cargar Resultado / Tarjetas</button>
      </div>
    `;
  });
  html += `</div>`;
  contenedor.innerHTML = html;
}

function openTab(evt, tabName) {
  if (evt) evt.preventDefault();
  const tabcontent = document.getElementsByClassName("tab-content");
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  const tablinks = document.getElementsByClassName("tab-link");
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  const targetTab = document.getElementById(tabName);
  if (targetTab) targetTab.style.display = "block";
  if (evt && evt.currentTarget) evt.currentTarget.className += " active";
}

function filtrarFutsalSexo(sexo) {
  const disciplina = sexo === 'M' ? "Futsal Masculino" : "Futsal Femenino";
  renderizarArbolGrafico(disciplina, "futsal-content");
}

function filtrarFutbolSexo(sexo) {
  const disciplina = sexo === 'M' ? "Fútbol de Campo Masculino" : "Fútbol de Campo Femenino";
  renderizarArbolGrafico(disciplina, "futbol-content");
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

  const { data: incidencias, error } = await dbClient
    .from('incidencias')
    .select('*')
    .eq('id_partido', idPartido);

  if (error || !incidencias || incidencias.length === 0) {
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

async function renderizarMedalleroReal() {
  const contenedor = document.getElementById("medallero-content");
  if (!contenedor) return;

  try {
    const { data: medallero, error } = await dbClient.from('medallero').select('*');

    if (error || !medallero || medallero.length === 0) {
      renderizarMedalleroGeneral();
      return;
    }

    medallero.sort((a, b) => {
      const totA = (a.futsalM||0)+(a.futsalF||0)+(a.futbol||0)+(a.voley||0)+(a.pikivoley||0)+(a.esports||0)+(a.ajedrez||0)+(a.maraton||0)+(a.ciclismo||0);
      const totB = (b.futsalM||0)+(b.futsalF||0)+(b.futbol||0)+(b.voley||0)+(b.pikivoley||0)+(b.esports||0)+(b.ajedrez||0)+(b.maraton||0)+(b.ciclismo||0);
      return totB - totA;
    });

    let html = `<div style="overflow-x:auto;"><table class="tabla-deportiva"><thead><tr><th>Pos.</th><th>Curso / Equipo</th><th>Futsal M</th><th>Futsal F</th><th>Fútbol</th><th>Vóley</th><th>Pikivoley</th><th>E-Sports</th><th>Ajedrez</th><th>TOTAL PTS</th></tr></thead><tbody>`;

    medallero.forEach((f, index) => {
      const total = (f.futsalM||0)+(f.futsalF||0)+(f.futbol||0)+(f.voley||0)+(f.pikivoley||0)+(f.esports||0)+(f.ajedrez||0)+(f.maraton||0)+(f.ciclismo||0);
      html += `<tr><td><b>#${index + 1}</b></td><td><strong>${renderizarNombreVisible(f.curso_equipo)}</strong></td><td>${f.futsalM||0}</td><td>${f.futsalF||0}</td><td>${f.futbol||0}</td><td>${f.voley||0}</td><td>${f.pikivoley||0}</td><td>${f.esports||0}</td><td>${f.ajedrez||0}</td><td><b style="color:#d4af37; font-size:15px;">${total} PTS</b></td></tr>`;
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

window.onload = function() {
  cargarDatos();
};