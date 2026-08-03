let esModoLogistica = false;

// Claves de Supabase  
const SUPABASE_URL = "https://zkklifirmzvlwapivbrc.supabase.co";  
const SUPABASE_KEY = "sb_publishable_Od54CMAGf_6wyGbeU-vvCw_FWzvrvbd";  
  
const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);  
  
let datosTorneo = { partidos: [], incidencias: [] };  
  
const CURSOS_EQUIPOS = [  
  "Dements (4 Ciencias)", "PsychoKings (2 Psico)", "Titanium (1 Psico)", "Insanos (3 Psico)",  
  "Alpha (1 Ciencias)", "Vanguardia (2 Ciencias)", "Legión (3 Ciencias)", "Mastery (5 Psico)", "Avanzada (4 Psico)"  
];  

// Alternar Modo Logística con el búho 🦉
function activarModoLogistica() {
  if (esModoLogistica) {
    esModoLogistica = false;
    document.body.classList.remove("modo-logistica");
    alert("Modo Espectador activado.");
    return;
  }

  const pass = prompt("Ingrese la contraseña de Logística:");
  if (pass === "1234") {
    esModoLogistica = true;
    document.body.classList.add("modo-logistica");
    alert("¡Modo Logística activado! Se han habilitado las funciones de gestión.");
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
  
    // Renderizar Vistas
    renderizarArbolGrafico("Futsal Masculino", "futsal-content");  
    renderizarArbolGrafico("Volley Mixto", "voley-content");  
    renderizarMedalleroGeneral();
    renderizarEstadisticasEquipos();
    renderizarCuadroHonor();
    renderizarComparativaCarreras();
  } catch (err) {  
    console.error("Error al cargar datos:", err);  
  }  
}  

function renderizarArbolGrafico(disciplina, containerId) {  
  const container = document.getElementById(containerId);  
  if (!container) return;  
  
  const partidos = datosTorneo.partidos.filter(p => p.disciplina === disciplina);  
  const fases = ["1ª Ronda Eliminatoria", "Semifinales", "Final"];  
  
  let html = `<div class="bracket-tree-wrapper">`;  
  
  fases.forEach((fase) => {  
    const partidosFase = partidos.filter(p => p.fase === fase);  
    
    html += `<div class="bracket-col">`;  
    html += `<div class="bracket-title">${fase}</div>`;  
  
    if (fase === "1ª Ronda Eliminatoria") {  
      for (let i = 0; i < partidosFase.length; i += 2) {  
        html += `<div class="bracket-match-pair">`;  
        if (partidosFase[i]) html += crearNodoHTML(partidosFase[i]);  
        if (partidosFase[i + 1]) html += crearNodoHTML(partidosFase[i + 1]);  
        html += `</div>`;  
      }  
    } else {  
      partidosFase.forEach(p => {  
        html += `<div style="margin: auto 0;">${crearNodoHTML(p)}</div>`;  
      });  
    }  
  
    html += `</div>`;  
  });  
  
  // Campeón de la disciplina
  const partidoFinal = partidos.find(p => p.fase === "Final" && p.estado === "Finalizado");
  let campeonTexto = "🏆 Por Definir";
  if (partidoFinal) {
    const gA = Number(partidoFinal.golesA);
    const gB = Number(partidoFinal.golesB);
    if (gA > gB) campeonTexto = `🏆 ${partidoFinal.equipoA}`;
    else if (gB > gA) campeonTexto = `🏆 ${partidoFinal.equipoB}`;
  }

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
    <div class="bracket-node" onclick="abrirModalAdmin('${p.id}')">  
      <div class="team ${winA}">  
        <span>${p.equipoA || 'Por definir'}</span>  
        <b>${p.estado === 'Finalizado' ? p.golesA : '-'}</b>  
      </div>  
      <div class="team ${winB}">  
        <span>${p.equipoB || 'Por definir'}</span>  
        <b>${p.estado === 'Finalizado' ? p.golesB : '-'}</b>  
      </div>  
    </div>  
  `;  
}  

async function abrirModalAdmin(idPartido) {  
  if (!esModoLogistica) return;  

  const partido = datosTorneo.partidos.find(p => p.id === idPartido);  
  if (!partido) return;  

  document.getElementById("admin-id-partido").value = partido.id;  
  document.getElementById("modal-partido-titulo").innerText = `${partido.equipoA || 'Por definir'} vs ${partido.equipoB || 'Por definir'}`;  
  document.getElementById("lbl-equipo-a").innerText = partido.equipoA || "Equipo A";  
  document.getElementById("lbl-equipo-b").innerText = partido.equipoB || "Equipo B";  
  document.getElementById("goles-a").value = partido.golesA !== undefined ? partido.golesA : "";  
  document.getElementById("goles-b").value = partido.golesB !== undefined ? partido.golesB : "";  

  const selEquipo = document.getElementById("incidencia-equipo");
  selEquipo.innerHTML = "";
  if (partido.equipoA) selEquipo.innerHTML += `<option value="${partido.equipoA}">${partido.equipoA}</option>`;
  if (partido.equipoB) selEquipo.innerHTML += `<option value="${partido.equipoB}">${partido.equipoB}</option>`;

  await cargarIncidenciasModal(partido.id);
  document.getElementById("modal-admin").style.display = "block";  
}  

function cerrarModalAdmin() {  
  document.getElementById("modal-admin").style.display = "none";  
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

  const { error } = await dbClient
    .from('incidencias')
    .insert([
      {
        id_partido: idPartido,
        jugador_nombre: jugador,
        curso_equipo: equipo,
        tipo_evento: tipo
      }
    ]);

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

    html += `<li>${icono} <b>${inc.jugador_nombre}</b> (${inc.curso_equipo}) - ${inc.tipo_evento}</li>`;
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

  const partidoActual = datosTorneo.partidos.find(p => p.id === idPartido);
  const gA = parseInt(golesA);
  const gB = parseInt(golesB);

  const { error } = await dbClient  
    .from('partidos')  
    .update({  
      goles_a: gA,  
      goles_b: gB,  
      estado: 'Finalizado'  
    })  
    .eq('id', idPartido);  

  if (error) {  
    alert("Error al guardar: " + error.message);  
    return;
  }  

  if (partidoActual && gA !== gB) {
    const ganador = gA > gB ? partidoActual.equipoA : partidoActual.equipoB;
    await clasificarGanador(partidoActual, ganador);
  }

  cerrarModalAdmin();  
  cargarDatos();  
}  

// Avance automático de ganadores garantizando inserción o actualización de la fila en Supabase
async function clasificarGanador(partidoActual, ganador) {
  const partidosDisciplina = datosTorneo.partidos
    .filter(p => p.disciplina === partidoActual.disciplina)
    .sort((a, b) => a.orden - b.orden);

  if (partidoActual.fase === "1ª Ronda Eliminatoria") {
    const r1 = partidosDisciplina.filter(p => p.fase === "1ª Ronda Eliminatoria");
    const idx = r1.findIndex(p => p.id === partidoActual.id);
    const semis = partidosDisciplina.filter(p => p.fase === "Semifinales");

    if (idx !== -1) {
      const targetSemiIdx = Math.floor(idx / 2);
      const targetSemi = semis[targetSemiIdx];

      if (!targetSemi) {
        const idSemi = `PAR-SEMI-${partidoActual.disciplina.replace(/\s+/g, '-')}-${targetSemiIdx + 1}`;
        const nuevoEquipoA = (idx % 2 === 0) ? ganador : null;
        const nuevoEquipoB = (idx % 2 !== 0) ? ganador : null;

        await dbClient.from('partidos').insert([{
          id: idSemi,
          disciplina: partidoActual.disciplina,
          fase: "Semifinales",
          equipo_a: nuevoEquipoA,
          equipo_b: nuevoEquipoB,
          estado: 'Pendiente',
          orden: 10 + targetSemiIdx
        }]);
      } else {
        const campoAActualizar = (idx % 2 === 0) ? { equipo_a: ganador } : { equipo_b: ganador };
        await dbClient.from('partidos').update(campoAActualizar).eq('id', targetSemi.id);
      }
    }
  } else if (partidoActual.fase === "Semifinales") {
    const semis = partidosDisciplina.filter(p => p.fase === "Semifinales");
    const idx = semis.findIndex(p => p.id === partidoActual.id);
    const finales = partidosDisciplina.filter(p => p.fase === "Final");
    const targetFinal = finales[0];

    if (!targetFinal) {
      const idFinal = `PAR-FINAL-${partidoActual.disciplina.replace(/\s+/g, '-')}`;
      const nuevoEquipoA = (idx === 0) ? ganador : null;
      const nuevoEquipoB = (idx !== 0) ? ganador : null;

      await dbClient.from('partidos').insert([{
        id: idFinal,
        disciplina: partidoActual.disciplina,
        fase: "Final",
        equipo_a: nuevoEquipoA,
        equipo_b: nuevoEquipoB,
        estado: 'Pendiente',
        orden: 99
      }]);
    } else {
      const campoAActualizar = (idx === 0) ? { equipo_a: ganador } : { equipo_b: ganador };
      await dbClient.from('partidos').update(campoAActualizar).eq('id', targetFinal.id);
    }
  }
}

// -------------------------------------------------------------
// PESTAÑAS DE ESTADÍSTICAS Y PROMEDIOS CALCULADOS
// -------------------------------------------------------------

function renderizarMedalleroGeneral() {
  const container = document.getElementById("medallero-content");
  if (!container) return;

  const stats = {};
  CURSOS_EQUIPOS.forEach(eq => {
    stats[eq] = { pj: 0, pg: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
  });

  datosTorneo.partidos.forEach(p => {
    if (p.estado === 'Finalizado') {
      const gA = Number(p.golesA);
      const gB = Number(p.golesB);

      if (stats[p.equipoA]) {
        stats[p.equipoA].pj++;
        stats[p.equipoA].gf += gA;
        stats[p.equipoA].gc += gB;
        if (gA > gB) { stats[p.equipoA].pg++; stats[p.equipoA].pts += 3; }
        else { stats[p.equipoA].pp++; }
      }

      if (stats[p.equipoB]) {
        stats[p.equipoB].pj++;
        stats[p.equipoB].gf += gB;
        stats[p.equipoB].gc += gA;
        if (gB > gA) { stats[p.equipoB].pg++; stats[p.equipoB].pts += 3; }
        else { stats[p.equipoB].pp++; }
      }
    }
  });

  const lista = Object.keys(stats)
    .map(eq => ({ equipo: eq, ...stats[eq] }))
    .sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc));

  let html = `
    <table class="tabla-deportiva">
      <thead>
        <tr>
          <th>Pos.</th>
          <th>Equipo / Curso</th>
          <th>PJ</th>
          <th>PG</th>
          <th>PP</th>
          <th>GF</th>
          <th>GC</th>
          <th>Dif</th>
          <th>Puntos</th>
        </tr>
      </thead>
      <tbody>
  `;

  lista.forEach((item, index) => {
    html += `
      <tr>
        <td><b>#${index + 1}</b></td>
        <td>${item.equipo}</td>
        <td>${item.pj}</td>
        <td>${item.pg}</td>
        <td>${item.pp}</td>
        <td>${item.gf}</td>
        <td>${item.gc}</td>
        <td>${item.gf - item.gc}</td>
        <td><b style="color:#d4af37">${item.pts}</b></td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

function renderizarEstadisticasEquipos() {
  const container = document.getElementById("estadisticas-content");
  if (!container) return;
  renderizarMedalleroGeneral();
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
      equipoFairPlay = `${eq} (${cant} tarjetas)`;
    }
  });

  container.innerHTML = `
    <div class="grid-honor">
      <div class="card-honor">
        <h3>⚽ Máximo Goleador (Futsal)</h3>
        <p>${topGoleador}</p>
      </div>
      <div class="card-honor">
        <h3>🕊️ Premio Fair Play (Menos Tarjetas)</h3>
        <p>${equipoFairPlay}</p>
      </div>
      <div class="card-honor">
        <h3>🏐 Vóley Mixto - Liderazgo</h3>
        <p>En Competencia</p>
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
    <div class="grid-honor">
      <div class="card-honor">
        <h3>🧠 Psicología</h3>
        <p style="color:#d4af37">${victoriasPsico} Victorias (${pctPsico}%)</p>
        <span style="font-size:12px; color:#aaa;">Goles Convertidos: ${golesPsico}</span>
      </div>
      <div class="card-honor">
        <h3>📚 Ciencias de la Educación</h3>
        <p style="color:#d4af37">${victoriasEdu} Victorias (${pctEdu}%)</p>
        <span style="font-size:12px; color:#aaa;">Goles Convertidos: ${golesEdu}</span>
      </div>
    </div>
  `;
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
    selA.innerHTML += `<option value="${c}">${c}</option>`;  
    selB.innerHTML += `<option value="${c}">${c}</option>`;  
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
  if (fechaHoraRaw) {  
    const f = new Date(fechaHoraRaw);  
    fechaHoraFormateada = `${String(f.getDate()).padStart(2,'0')}/${String(f.getMonth()+1).padStart(2,'0')} ${String(f.getHours()).padStart(2,'0')}:${String(f.getMinutes()).padStart(2,'0')} HS`;  
  }  

  const idNuevo = "PAR-" + new Date().getTime();  

  const { error } = await dbClient  
    .from('partidos')  
    .insert([  
      {  
        id: idNuevo,  
        disciplina: disciplina,  
        fase: fase,  
        equipo_a: equipoA,  
        equipo_b: equipoB,  
        fecha_hora: fechaHoraFormateada,  
        orden: parseInt(orden),  
        estado: 'Pendiente'  
      }  
    ]);  

  if (error) {  
    document.getElementById("crear-msj").innerText = "Error: " + error.message;  
  } else {  
    cerrarModalCrearPartido();  
    cargarDatos();  
  }  
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
  if (targetTab) {  
    targetTab.style.display = "block";  
  }  
  if (evt && evt.currentTarget) {  
    evt.currentTarget.className += " active";  
  }  
}  

function filtrarFutsalSexo(sexo) {  
  const disciplina = sexo === 'M' ? "Futsal Masculino" : "Futsal Femenino";  
  renderizarArbolGrafico(disciplina, "futsal-content");  
}  

window.onload = function() {  
  cargarDatos();  
};