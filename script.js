// ============================================================
// CONFIGURACIÓN E INICIALIZACIÓN DE SUPABASE
// ============================================================
let esModoLogistica = false;
let esModoSuperAdmin = false;
let esModoEditor = false;

const SUPABASE_URL = "https://zkklifirmzvlwapivbrc.supabase.co";
const SUPABASE_KEY = "sb_publishable_Od54CMAGf_6wyGbeU-vvCw_FWzvrvbd";

// Inicializar cliente Supabase
const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
// GENERADOR DE LOGOS EN CANVAS
// ============================================================
function generarLogoDataURL(nombreEquipo, size = 40) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const config = EQUIPOS_COLORES[nombreEquipo] || { bg: "#d4af37", initials: "IF" };

  // Círculo de fondo con color único del equipo
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = config.bg;
  ctx.fill();

  // Borde dorado
  ctx.lineWidth = Math.max(1.5, size * 0.05);
  ctx.strokeStyle = "#d4af37";
  ctx.stroke();

  // Iniciales del curso en texto blanco
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.round(size * 0.42)}px 'Segoe UI', Tahoma, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(config.initials, size / 2, size / 2 + 1);

  return canvas.toDataURL("image/png");
}

function renderizarLogoHTML(nombreEquipo, size = 26) {
  if (!nombreEquipo || nombreEquipo === "Por definir") return "";
  const url = generarLogoDataURL(nombreEquipo, size);
  return `<img src="${url}" alt="${nombreEquipo}" class="team-logo-icon" style="width:${size}px; height:${size}px; vertical-align:middle; border-radius:50%; margin-right:6px; display:inline-block;">`;
}

// ============================================================
// SISTEMA DE TOASTS Y CONFIRMACIONES PERSONALIZADAS
// ============================================================
function mostrarToast(mensaje, tipo = 'info', duracion = 3200) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;

  let icono = "ℹ️";
  if (tipo === 'success') icono = "✅";
  if (tipo === 'error') icono = "❌";
  if (tipo === 'warning') icono = "⚠️";

  toast.innerHTML = `<span>${icono}</span> <div>${escaparHTML(mensaje)}</div>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duracion);
}

function mostrarConfirmacion(mensaje, onConfirm) {
  const modal = document.getElementById("modal-confirmacion");
  const msgEl = document.getElementById("confirm-mensaje");
  const btnAceptar = document.getElementById("btn-confirm-aceptar");
  const btnCancelar = document.getElementById("btn-confirm-cancelar");

  if (!modal || !msgEl || !btnAceptar || !btnCancelar) return;

  msgEl.innerText = mensaje;
  modal.style.display = "block";
  bloquearScrollFondo();

  const cleanup = () => {
    modal.style.display = "none";
    liberarScrollFondo();
    btnAceptar.onclick = null;
    btnCancelar.onclick = null;
  };

  btnAceptar.onclick = () => {
    cleanup();
    if (typeof onConfirm === 'function') onConfirm();
  };

  btnCancelar.onclick = () => {
    cleanup();
  };
}

function escaparHTML(texto) {
  if (texto === null || texto === undefined) return "";
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizarTexto(txt) {
  if (!txt) return "";
  return txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function formatearFechaHora(valor) {
  if (!valor) return "Fecha a confirmar";
  if (valor.includes("T")) {
    const f = new Date(valor);
    if (!isNaN(f.getTime())) {
      const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      return `${dias[f.getDay()]} ${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')} · ${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')} hs`;
    }
  }
  return valor;
}

function bloquearScrollFondo() { document.body.style.overflow = "hidden"; }
function liberarScrollFondo() { document.body.style.overflow = ""; }

// ============================================================
// ACCESO ORGANIZACIÓN Y ROLES
// ============================================================
function abrirModalLogin() {
  document.getElementById("login-pass-input").value = "";
  document.getElementById("modal-login").style.display = "block";
  bloquearScrollFondo();
  document.getElementById("login-pass-input").focus();
}

function cerrarModalLogin() {
  document.getElementById("modal-login").style.display = "none";
  liberarScrollFondo();
}

async function procesarLoginModal() {
  const pass = document.getElementById("login-pass-input").value.trim();
  cerrarModalLogin();

  if (!pass) return;

  if (esModoLogistica || esModoSuperAdmin || esModoEditor) {
    esModoLogistica = false;
    esModoSuperAdmin = false;
    esModoEditor = false;
    document.body.classList.remove("modo-logistica", "modo-superadmin", "modo-editor");
    actualizarBadgeRol();
    mostrarToast("Modo Espectador activado.", "info");
    cargarDatos();
    return;
  }

  if (pass === "alucas") {
    esModoSuperAdmin = true;
    esModoLogistica = true;
    esModoEditor = true;
    document.body.classList.add("modo-superadmin", "modo-logistica", "modo-editor");
    actualizarBadgeRol();
    mostrarToast("¡Modo Super Admin activado!", "success");
    cargarDatos();
    return;
  }

  const claveLogistica = await obtenerClaveAcceso('logistica', '1234');
  const claveEditor = await obtenerClaveAcceso('editor', 'editor1');

  if (pass === claveLogistica) {
    esModoLogistica = true;
    esModoSuperAdmin = false;
    esModoEditor = false;
    document.body.classList.add("modo-logistica");
    document.body.classList.remove("modo-superadmin", "modo-editor");
    actualizarBadgeRol();
    mostrarToast("¡Modo Logística activado!", "success");
    cargarDatos();
  } else if (pass === claveEditor) {
    esModoEditor = true;
    esModoLogistica = false;
    esModoSuperAdmin = false;
    document.body.classList.add("modo-editor");
    document.body.classList.remove("modo-logistica", "modo-superadmin");
    actualizarBadgeRol();
    mostrarToast("¡Modo Editor activado! (Gestión de Jugadores)", "success");
    cargarDatos();
  } else {
    mostrarToast("Contraseña incorrecta.", "error");
  }
}

function actualizarBadgeRol() {
  const badge = document.getElementById("badge-modo-rol");
  if (!badge) return;

  if (esModoSuperAdmin) {
    badge.innerText = "👑 SuperAdmin";
    badge.style.display = "inline-block";
  } else if (esModoLogistica) {
    badge.innerText = "📋 Logística";
    badge.style.display = "inline-block";
  } else if (esModoEditor) {
    badge.innerText = "✏️ Editor";
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }
}

async function obtenerClaveAcceso(claveId, defecto) {
  try {
    const { data } = await dbClient
      .from('config_accesos')
      .select('valor')
      .eq('clave_id', claveId)
      .single();

    if (data && data.valor) return data.valor;
    return defecto;
  } catch (e) {
    return defecto;
  }
}

// Suscripción Realtime
try {
  dbClient
    .channel('cambios-partidos')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => cargarDatos())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'incidencias' }, () => cargarDatos())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jugadores' }, () => cargarDatos())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'config_accesos' }, () => cargarDatos())
    .subscribe();
} catch (e) {
  console.log("Realtime error:", e);
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

function dispararCelebracionGol(equipoAnotador, disciplina, gA, gB) {
  mostrarToast(`⚽ ¡GOOOOOOL DE ${renderizarNombreVisible(equipoAnotador).toUpperCase()}! (${gA} - ${gB})`, "success", 5000);

  const overlay = document.getElementById("celebracion-overlay");
  if (!overlay) return;

  const emojis = ['⚽', '🎉', '🔥', '🏆', '🥳', '⚽'];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement('div');
    el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.position = 'absolute';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = '-50px';
    el.style.fontSize = (Math.random() * 25 + 20) + 'px';
    el.style.animation = `caerGol ${Math.random() * 2 + 2}s linear forwards`;
    overlay.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
}

if (!document.getElementById("keyframes-gol")) {
  const style = document.createElement('style');
  style.id = "keyframes-gol";
  style.innerHTML = `
    @keyframes caerGol {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(105vh) rotate(360deg); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// ============================================================
// PESTAÑA EQUIPOS Y CUADRÍCULA DE 9 EQUIPOS
// ============================================================
function renderizarGridEquipos() {
  const container = document.getElementById("equipos-grid");
  if (!container) return;

  let html = "";
  CURSOS_EQUIPOS.forEach(eq => {
    const logoDataUrl = generarLogoDataURL(eq, 60);

    let pj = 0, pg = 0;
    datosTorneo.partidos.forEach(p => {
      if (p.estado === 'Finalizado' && (p.equipoA === eq || p.equipoB === eq)) {
        pj++;
        const gA = Number(p.golesA || 0);
        const gB = Number(p.golesB || 0);
        if ((p.equipoA === eq && gA > gB) || (p.equipoB === eq && gB > gA)) pg++;
      }
    });

    const numJugadores = jugadoresCache.filter(j => j.equipo === eq).length;

    html += `
      <div class="card-equipo" onclick="abrirModalEquipo('${eq}')">
        <img src="${logoDataUrl}" alt="${eq}" style="width:60px; height:60px; border-radius:50%; box-shadow: 0 0 10px rgba(212,175,55,0.3);">
        <div class="card-equipo-info">
          <h3>${renderizarNombreVisible(eq)}</h3>
          <p>${eq}</p>
          <div class="card-equipo-stats">
            <span>👥 ${numJugadores} Jugadores</span>
            <span>🏆 ${pg}V / ${pj}PJ</span>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ============================================================
// MODAL DE EQUIPO Y GESTIÓN DE JUGADORES
// ============================================================
function abrirModalEquipo(nombreEquipo) {
  const logoUrl = generarLogoDataURL(nombreEquipo, 70);

  document.getElementById("modal-equipo-header").innerHTML = `
    <img src="${logoUrl}" alt="${nombreEquipo}" style="width:70px; height:70px; border-radius:50%; margin-bottom:10px;">
    <h3 style="margin:0; color:#d4af37;">${renderizarNombreVisible(nombreEquipo)}</h3>
    <p style="margin:4px 0 0 0; color:#aaa; font-size:13px;">${nombreEquipo}</p>
  `;

  let pj = 0, pg = 0, pp = 0, gf = 0, gc = 0;
  datosTorneo.partidos.forEach(p => {
    if (p.estado === 'Finalizado' && (p.equipoA === nombreEquipo || p.equipoB === nombreEquipo)) {
      pj++;
      const esA = p.equipoA === nombreEquipo;
      const gMio = Number(esA ? p.golesA : p.golesB);
      const gRival = Number(esA ? p.golesB : p.golesA);
      gf += gMio;
      gc += gRival;
      if (gMio > gRival) pg++; else pp++;
    }
  });

  document.getElementById("modal-equipo-stats").innerHTML = `
    <div style="display:flex; justify-content:space-around; background:#0d0d0d; padding:10px; border-radius:8px; border:1px solid #222; text-align:center;">
      <div><b style="color:#d4af37; font-size:16px;">${pj}</b><br><small style="color:#aaa;">PJ</small></div>
      <div><b style="color:#10b981; font-size:16px;">${pg}</b><br><small style="color:#aaa;">PG</small></div>
      <div><b style="color:#ef4444; font-size:16px;">${pp}</b><br><small style="color:#aaa;">PP</small></div>
      <div><b style="color:#3b82f6; font-size:16px;">${gf}</b><br><small style="color:#aaa;">GF</small></div>
      <div><b style="color:#aaa; font-size:16px;">${gc}</b><br><small style="color:#aaa;">GC</small></div>
    </div>
  `;

  const jugadoresEquipo = jugadoresCache.filter(j => j.equipo === nombreEquipo);
  const disciplinas = ["Futsal", "Fútbol de Campo", "Vóley Mixto", "Pikivoley"];
  let htmlJugadores = "";

  disciplinas.forEach(disc => {
    const jugDisc = jugadoresEquipo.filter(j => j.disciplinas && j.disciplinas.includes(disc));
    let icono = "⚽";
    if (disc.includes("Vóley")) icono = "🏐";
    if (disc.includes("Pikivoley")) icono = "🦶🏐";

    htmlJugadores += `<h5 style="color:#d4af37; margin:15px 0 6px 0;">${icono} ${disc} (${jugDisc.length})</h5>`;

    if (jugDisc.length === 0) {
      htmlJugadores += `<p style="font-size:12px; color:#666; margin:0 0 10px 0;">Sin jugadores inscritos en esta disciplina.</p>`;
    } else {
      jugDisc.forEach(j => {
        htmlJugadores += `
          <div class="jugador-item-row">
            <span class="jugador-nombre-click" onclick="abrirFifaCard('${j.nombre}', '${nombreEquipo}')">👤 ${escaparHTML(j.nombre)}</span>
            <div class="solo-editor" style="display:none; gap:6px;">
              <button style="background:none; border:none; cursor:pointer; font-size:14px;" onclick="abrirModalEditarJugador(${JSON.stringify(j).replace(/"/g, '&quot;')})" title="Editar Jugador">✏️</button>
              <button style="background:none; border:none; cursor:pointer; font-size:14px;" onclick="eliminarJugador('${j.id}', '${escaparHTML(j.nombre)}')" title="Eliminar Jugador">🗑️</button>
            </div>
          </div>
        `;
      });
    }
  });

  document.getElementById("modal-equipo-jugadores").innerHTML = htmlJugadores;
  document.getElementById("modal-equipo").dataset.equipoActual = nombreEquipo;
  document.getElementById("modal-equipo").style.display = "block";
  bloquearScrollFondo();
}

function cerrarModalEquipo() {
  document.getElementById("modal-equipo").style.display = "none";
  liberarScrollFondo();
}

// ============================================================
// EDICIÓN / ADICIÓN / ELIMINACIÓN DE JUGADORES EN BD
// ============================================================
function abrirModalEditarJugador(jugadorObj) {
  if (!esModoEditor && !esModoSuperAdmin) {
    mostrarToast("No tienes permisos para editar jugadores.", "error");
    return;
  }

  const equipoActual = document.getElementById("modal-equipo").dataset.equipoActual;

  const selEquipo = document.getElementById("edit-jugador-equipo");
  selEquipo.innerHTML = `<option value="${equipoActual}">${renderizarNombreVisible(equipoActual)}</option>`;
  selEquipo.value = equipoActual;

  if (jugadorObj) {
    document.getElementById("titulo-modal-jugador").innerText = "✏️ Editar Jugador";
    document.getElementById("edit-jugador-id").value = jugadorObj.id;
    document.getElementById("edit-jugador-nombre").value = jugadorObj.nombre;

    const discs = jugadorObj.disciplinas || "";
    document.getElementById("check-disc-futsal").checked = discs.includes("Futsal");
    document.getElementById("check-disc-futbol").checked = discs.includes("Fútbol de Campo");
    document.getElementById("check-disc-voley").checked = discs.includes("Vóley Mixto");
    document.getElementById("check-disc-pikivoley").checked = discs.includes("Pikivoley");
  } else {
    document.getElementById("titulo-modal-jugador").innerText = "➕ Añadir Jugador";
    document.getElementById("edit-jugador-id").value = "";
    document.getElementById("edit-jugador-nombre").value = "";
    document.getElementById("check-disc-futsal").checked = true;
    document.getElementById("check-disc-futbol").checked = false;
    document.getElementById("check-disc-voley").checked = false;
    document.getElementById("check-disc-pikivoley").checked = false;
  }

  document.getElementById("modal-editar-jugador").style.display = "block";
}

function cerrarModalEditarJugador() {
  document.getElementById("modal-editar-jugador").style.display = "none";
}

async function guardarJugador() {
  if (!esModoEditor && !esModoSuperAdmin) {
    mostrarToast("Acceso denegado.", "error");
    return;
  }

  const id = document.getElementById("edit-jugador-id").value;
  const nombre = document.getElementById("edit-jugador-nombre").value.trim();
  const equipo = document.getElementById("modal-equipo").dataset.equipoActual;

  if (!nombre) {
    mostrarToast("Por favor ingrese el nombre del jugador.", "warning");
    return;
  }

  const seleccionadas = [];
  if (document.getElementById("check-disc-futsal").checked) seleccionadas.push("Futsal");
  if (document.getElementById("check-disc-futbol").checked) seleccionadas.push("Fútbol de Campo");
  if (document.getElementById("check-disc-voley").checked) seleccionadas.push("Vóley Mixto");
  if (document.getElementById("check-disc-pikivoley").checked) seleccionadas.push("Pikivoley");

  const disciplinasStr = seleccionadas.join(", ");

  if (id) {
    const { error } = await dbClient
      .from('jugadores')
      .update({ nombre: nombre, disciplinas: disciplinasStr })
      .eq('id', id);

    if (error) {
      mostrarToast("Error al actualizar jugador: " + error.message, "error");
    } else {
      mostrarToast("Jugador actualizado correctamente.", "success");
      cerrarModalEditarJugador();
      await cargarDatos();
      abrirModalEquipo(equipo);
    }
  } else {
    const idNuevo = "JUG-" + Date.now();
    const { error } = await dbClient
      .from('jugadores')
      .insert([{
        id: idNuevo,
        nombre: nombre,
        equipo: equipo,
        disciplinas: disciplinasStr
      }]);

    if (error) {
      mostrarToast("Error al añadir jugador: " + error.message, "error");
    } else {
      mostrarToast("Jugador registrado en la base de datos.", "success");
      cerrarModalEditarJugador();
      await cargarDatos();
      abrirModalEquipo(equipo);
    }
  }
}

function eliminarJugador(idJugador, nombreJugador) {
  if (!esModoEditor && !esModoSuperAdmin) {
    mostrarToast("Acceso denegado.", "error");
    return;
  }

  mostrarConfirmacion(`¿Estás seguro de eliminar a "${nombreJugador}" de la base de datos?`, async () => {
    const equipoActual = document.getElementById("modal-equipo").dataset.equipoActual;
    const { error } = await dbClient.from('jugadores').delete().eq('id', idJugador);

    if (error) {
      mostrarToast("Error al eliminar jugador: " + error.message, "error");
    } else {
      mostrarToast("Jugador eliminado.", "info");
      await cargarDatos();
      abrirModalEquipo(equipoActual);
    }
  });
}

// ============================================================
// PERFILES DE JUGADOR TIPO "CARTA FIFA"
// ============================================================
function abrirFifaCard(jugadorNombre, equipoNombre) {
  const jugadorObj = jugadoresCache.find(j => j.nombre === jugadorNombre && j.equipo === equipoNombre) || {
    nombre: jugadorNombre,
    equipo: equipoNombre,
    disciplinas: "Futsal, Fútbol de Campo"
  };

  const logoUrl = generarLogoDataURL(equipoNombre, 48);

  let golesTotales = 0;
  let amarillas = 0;
  let rojas = 0;

  datosTorneo.incidencias.forEach(inc => {
    if (inc.jugador_nombre === jugadorNombre) {
      if (inc.tipo_evento === 'Gol') golesTotales++;
      if (inc.tipo_evento === 'Tarjeta Amarilla') amarillas++;
      if (inc.tipo_evento === 'Tarjeta Roja') rojas++;
    }
  });

  const mvps = votosMvpCache.filter(v => v.jugador_nombre === jugadorNombre).length;
  const ovr = Math.min(99, Math.max(65, 75 + (golesTotales * 3) + (mvps * 5) - (rojas * 5)));

  const listDiscs = (jugadorObj.disciplinas || "Futsal").split(", ");
  const badgesDiscs = listDiscs.map(d => `<span class="badge-disciplina">${d}</span>`).join('');

  const container = document.getElementById("fifa-card-container");
  container.innerHTML = `
    <div class="fifa-card">
      <div class="fifa-card-header">
        <div class="fifa-ovr">${ovr}</div>
        <img src="${logoUrl}" alt="${equipoNombre}" style="width:48px; height:48px; border-radius:50%; border:2px solid #d4af37;">
      </div>
      
      <div class="fifa-card-name">${escaparHTML(jugadorNombre)}</div>
      <div class="fifa-card-team">🛡️ ${renderizarNombreVisible(equipoNombre)}</div>
      
      <div class="fifa-disciplinas">${badgesDiscs}</div>
      
      <div class="fifa-stats-grid">
        <div class="fifa-stat-item">
          <span class="fifa-stat-value">⚽ ${golesTotales}</span>
          <span class="fifa-stat-label">Goles</span>
        </div>
        <div class="fifa-stat-item">
          <span class="fifa-stat-value">⭐ ${mvps}</span>
          <span class="fifa-stat-label">MVPs</span>
        </div>
        <div class="fifa-stat-item">
          <span class="fifa-stat-value">🟨 ${amarillas}</span>
          <span class="fifa-stat-label">Amarillas</span>
        </div>
        <div class="fifa-stat-item">
          <span class="fifa-stat-value">🟥 ${rojas}</span>
          <span class="fifa-stat-label">Rojas</span>
        </div>
      </div>
    </div>
  `;

  document.getElementById("modal-fifa-card").style.display = "block";
  bloquearScrollFondo();
}

function cerrarFifaCard() {
  document.getElementById("modal-fifa-card").style.display = "none";
  liberarScrollFondo();
}

// ============================================================
// MESA DE CONTROL Y OPTIMIZACIÓN
// ============================================================
async function abrirModalAdmin(idPartido, disciplina = "", fase = "", eqA = "", eqB = "") {
  if (!esModoLogistica && !esModoSuperAdmin) return;

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

  document.getElementById("admin-penales").checked = partido ? !!partido.definidoPenales : false;

  const campoFecha = document.getElementById("admin-fecha-hora");
  if (campoFecha) {
    campoFecha.value = (partido && partido.fechaHora && partido.fechaHora.includes("T")) ? partido.fechaHora : "";
  }

  const selEquipo = document.getElementById("incidencia-equipo");
  selEquipo.innerHTML = "";
  if (eqA && eqA !== 'Por definir') selEquipo.innerHTML += `<option value="${eqA}">${renderizarNombreVisible(eqA)}</option>`;
  if (eqB && eqB !== 'Por definir') selEquipo.innerHTML += `<option value="${eqB}">${renderizarNombreVisible(eqB)}</option>`;

  actualizarSelectJugadoresIncidencia();

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
  bloquearScrollFondo();
}

function cerrarModalAdmin() {
  document.getElementById("modal-admin").style.display = "none";
  liberarScrollFondo();
}

function actualizarSelectJugadoresIncidencia() {
  const equipoSel = document.getElementById("incidencia-equipo").value;
  const disciplina = document.getElementById("modal-partido-titulo").dataset.disciplina || "";
  const selJugador = document.getElementById("incidencia-jugador-select");

  if (!selJugador) return;
  selJugador.innerHTML = "";

  const filtrados = jugadoresCache.filter(j => j.equipo === equipoSel);

  if (filtrados.length === 0) {
    selJugador.innerHTML = `<option value="">Sin jugadores inscritos (Agregar en Plantilla)</option>`;
  } else {
    filtrados.forEach(j => {
      selJugador.innerHTML += `<option value="${escaparHTML(j.nombre)}">${escaparHTML(j.nombre)}</option>`;
    });
  }
}

async function sumarPuntoRapido(equipoLado, cambio) {
  const idPartido = document.getElementById("admin-id-partido").value;
  let valA = Number(document.getElementById("goles-a").value || 0);
  let valB = Number(document.getElementById("goles-b").value || 0);

  if (equipoLado === 'A') valA = Math.max(0, valA + cambio);
  if (equipoLado === 'B') valB = Math.max(0, valB + cambio);

  document.getElementById("goles-a").value = valA;
  document.getElementById("goles-b").value = valB;

  const selEquipo = document.getElementById("incidencia-equipo");
  if (selEquipo && selEquipo.options.length > (equipoLado === 'A' ? 0 : 1)) {
    selEquipo.selectedIndex = equipoLado === 'A' ? 0 : 1;
    actualizarSelectJugadoresIncidencia();
  }

  const selTipo = document.getElementById("incidencia-tipo");
  if (selTipo) selTipo.value = "Gol";

  const selJugador = document.getElementById("incidencia-jugador-select");
  if (selJugador) selJugador.focus();

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
  const jugador = document.getElementById("incidencia-jugador-select").value;
  const tipo = document.getElementById("incidencia-tipo").value;

  if (!jugador) {
    mostrarToast("Por favor seleccione un jugador de la lista.", "warning");
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
    mostrarToast("Error al registrar incidencia: " + error.message, "error");
  } else {
    mostrarToast(`Incidencia agregada: ${jugador} (${tipo})`, "success");
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

    html += `<li>${icono} <b class="jugador-nombre-click" onclick="abrirFifaCard('${inc.jugador_nombre}', '${inc.curso_equipo}')">${inc.jugador_nombre}</b> (${renderizarNombreVisible(inc.curso_equipo)}) - ${inc.tipo_evento}</li>`;
  });
  listContainer.innerHTML = html;
}

async function enviarResultado() {
  const idPartido = document.getElementById("admin-id-partido").value;
  const golesA = document.getElementById("goles-a").value;
  const golesB = document.getElementById("goles-b").value;
  const esPenales = document.getElementById("admin-penales").checked;

  if (golesA === "" || golesB === "") {
    mostrarToast("Por favor ingrese ambos marcadores.", "warning");
    return;
  }

  const gA = parseInt(golesA);
  const gB = parseInt(golesB);
  const ahoraIso = new Date().toISOString();

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
      estado: 'Finalizado',
      definido_penales: esPenales,
      finalizado_at: ahoraIso
    }]);
  } else {
    await dbClient
      .from('partidos')
      .update({
        goles_a: gA,
        goles_b: gB,
        estado: 'Finalizado',
        definido_penales: esPenales,
        finalizado_at: ahoraIso
      })
      .eq('id', idPartido);
  }

  cerrarModalAdmin();
  mostrarToast("Partido finalizado y publicado correctamente.", "success");
  cargarDatos();
}

function eliminarPartido() {
  if (!esModoSuperAdmin) {
    mostrarToast("Función exclusiva del Super Administrador.", "error");
    return;
  }

  const idPartido = document.getElementById("admin-id-partido").value;

  mostrarConfirmacion("¿Estás seguro de eliminar este partido y todas sus incidencias?", async () => {
    await dbClient.from('incidencias').delete().eq('id_partido', idPartido);
    const { error } = await dbClient.from('partidos').delete().eq('id', idPartido);

    if (error) {
      mostrarToast("Error al eliminar partido: " + error.message, "error");
    } else {
      mostrarToast("Partido eliminado correctamente.", "info");
      cerrarModalAdmin();
      cargarDatos();
    }
  });
}

// ============================================================
// BOTÓN COMPARTIR
// ============================================================
function compartirResultado(idPartido) {
  const p = datosTorneo.partidos.find(part => part.id === idPartido);
  if (!p) return;

  const penalesTxt = p.definidoPenales ? " (Definido por penales)" : "";
  const texto = `🔥 ¡Partidazo en el InterFilo 2026! ⚽\n${renderizarNombreVisible(p.equipoA)} ${p.golesA} - ${p.golesB} ${renderizarNombreVisible(p.equipoB)}${penalesTxt}\n🏆 Disciplina: ${p.disciplina} (${p.fase})\n\nSigue los resultados en vivo aquí: ${window.location.href}`;

  if (navigator.share) {
    navigator.share({
      title: 'InterFilo 2026 - Resultado',
      text: texto
    }).catch(() => {});
  } else {
    const urlWa = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(urlWa, '_blank');
  }
}

// ============================================================
// VOTACIÓN DE MVP
// ============================================================
function abrirModalVotarMvp(idPartido) {
  const p = datosTorneo.partidos.find(part => part.id === idPartido);
  if (!p || p.estado !== 'Finalizado') return;

  const finalizadoMs = p.finalizadoAt ? new Date(p.finalizadoAt).getTime() : Date.now();
  const minPasados = (Date.now() - finalizadoMs) / (1000 * 60);

  if (minPasados > 15) {
    mostrarToast("La votación de MVP cerró (disponible solo durante 15 min tras finalizar).", "warning");
    return;
  }

  if (localStorage.getItem('voto_mvp_' + idPartido)) {
    mostrarToast("Ya emitiste tu voto de MVP para este partido.", "info");
    return;
  }

  document.getElementById("votar-mvp-sub").innerText = `${p.disciplina} — ${renderizarNombreVisible(p.equipoA)} vs ${renderizarNombreVisible(p.equipoB)}`;

  const jugA = jugadoresCache.filter(j => j.equipo === p.equipoA);
  const jugB = jugadoresCache.filter(j => j.equipo === p.equipoB);
  const todosJug = [...jugA, ...jugB];

  const container = document.getElementById("votar-mvp-opciones");

  if (todosJug.length === 0) {
    container.innerHTML = `<p style="color:#aaa;">No hay jugadores registrados en la nómina oficial para este encuentro.</p>`;
  } else {
    let html = `<select id="select-mvp-jugador" style="width:100%; padding:10px; background:#0d0d0d; color:#fff; border:1px solid #444; border-radius:6px;">`;
    todosJug.forEach(j => {
      html += `<option value="${escaparHTML(j.nombre)}|${escaparHTML(j.equipo)}">${escaparHTML(j.nombre)} (${renderizarNombreVisible(j.equipo)})</option>`;
    });
    html += `</select>`;
    container.innerHTML = html;
  }

  document.getElementById("modal-votar-mvp").dataset.idPartido = idPartido;
  document.getElementById("modal-votar-mvp").style.display = "block";
  bloquearScrollFondo();
}

function cerrarModalVotarMvp() {
  document.getElementById("modal-votar-mvp").style.display = "none";
  liberarScrollFondo();
}

async function enviarVotoMvp() {
  const idPartido = document.getElementById("modal-votar-mvp").dataset.idPartido;
  const selVal = document.getElementById("select-mvp-jugador") ? document.getElementById("select-mvp-jugador").value : null;

  if (!selVal) {
    mostrarToast("Seleccione un jugador para votar.", "warning");
    return;
  }

  const p = datosTorneo.partidos.find(part => part.id === idPartido);
  const parts = selVal.split("|");
  const jugNombre = parts[0];
  const eqNombre = parts;

  const idNuevo = "MVP-" + Date.now();

  const { error } = await dbClient.from('votos_mvp').insert([{
    id: idNuevo,
    id_partido: idPartido,
    jugador_nombre: jugNombre,
    equipo: eqNombre,
    disciplina: p ? p.disciplina : "General"
  }]);

  if (error) {
    mostrarToast("Error al registrar voto MVP: " + error.message, "error");
  } else {
    localStorage.setItem('voto_mvp_' + idPartido, 'true');
    mostrarToast("¡Voto MVP registrado correctamente!", "success");
    cerrarModalVotarMvp();
    cargarDatos();
  }
}

// ============================================================
// CUADRO DE HONOR Y MVPs POR DISCIPLINA
// ============================================================
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

  const obtenerTopMvpPorDisciplina = (filtroDisc) => {
    const conteo = {};
    votosMvpCache.forEach(v => {
      if (normalizarTexto(v.disciplina).includes(normalizarTexto(filtroDisc))) {
        conteo[v.jugador_nombre] = (conteo[v.jugador_nombre] || 0) + 1;
      }
    });

    let top = "Por definir";
    let max = 0;
    Object.keys(conteo).forEach(j => {
      if (conteo[j] > max) {
        max = conteo[j];
        top = `${j} (${max} voto${max===1?'':'s'})`;
      }
    });
    return top;
  };

  const mvpFutsal = obtenerTopMvpPorDisciplina("Futsal");
  const mvpFutbol = obtenerTopMvpPorDisciplina("Fútbol");
  const mvpVoley = obtenerTopMvpPorDisciplina("Volley") !== "Por definir" ? obtenerTopMvpPorDisciplina("Volley") : obtenerTopMvpPorDisciplina("Voley");
  const mvpPiki = obtenerTopMvpPorDisciplina("Pikivoley");

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
      <div style="background:#161616; border:1px solid #f59e0b; padding:15px; border-radius:8px;">
        <h3 style="color:#f59e0b; margin:0 0 8px 0;">⭐ MVP Futsal</h3>
        <p style="margin:0; font-size:15px; font-weight:bold;">${mvpFutsal}</p>
      </div>
      <div style="background:#161616; border:1px solid #f59e0b; padding:15px; border-radius:8px;">
        <h3 style="color:#f59e0b; margin:0 0 8px 0;">⭐ MVP Fútbol de Campo</h3>
        <p style="margin:0; font-size:15px; font-weight:bold;">${mvpFutbol}</p>
      </div>
      <div style="background:#161616; border:1px solid #f59e0b; padding:15px; border-radius:8px;">
        <h3 style="color:#f59e0b; margin:0 0 8px 0;">⭐ MVP Vóley Mixto</h3>
        <p style="margin:0; font-size:15px; font-weight:bold;">${mvpVoley}</p>
      </div>
      <div style="background:#161616; border:1px solid #f59e0b; padding:15px; border-radius:8px;">
        <h3 style="color:#f59e0b; margin:0 0 8px 0;">⭐ MVP Pikivoley</h3>
        <p style="margin:0; font-size:15px; font-weight:bold;">${mvpPiki}</p>
      </div>
    </div>
  `;
}

// ============================================================
// SPONSORS Y TOGGLE DE SUPERADMIN
// ============================================================
function renderizarCarruselSponsors() {
  const el = document.getElementById("sponsor-carousel");
  if (!el) return;
  el.style.display = sponsorsVisibles ? "block" : "none";
}

async function toggleSponsorsVisibles() {
  if (!esModoSuperAdmin) {
    mostrarToast("Acceso exclusivo para SuperAdmin.", "error");
    return;
  }

  const nuevoEstado = !sponsorsVisibles;
  const { error } = await dbClient
    .from('config_accesos')
    .upsert({ clave_id: 'sponsors_visible', valor: String(nuevoEstado), updated_at: new Date().toISOString() }, { onConflict: 'clave_id' });

  if (error) {
    mostrarToast("Error al guardar preferencia de sponsors: " + error.message, "error");
  } else {
    sponsorsVisibles = nuevoEstado;
    renderizarCarruselSponsors();
    mostrarToast(`Carrusel de Auspiciantes ${nuevoEstado ? 'activado' : 'ocultado'} para todos.`, "success");
  }
}

// ============================================================
// OTRAS FUNCIONES Y VISTAS EXISTENTES
// ============================================================
function abrirModalCrearPartido(disciplinaPrevia = "") {
  if (!esModoLogistica && !esModoSuperAdmin) return;
  if (disciplinaPrevia) document.getElementById("crear-disciplina").value = disciplinaPrevia;

  const selA = document.getElementById("crear-equipo-a");
  const selB = document.getElementById("crear-equipo-b");
  selA.innerHTML = ""; selB.innerHTML = "";

  CURSOS_EQUIPOS.forEach(c => {
    selA.innerHTML += `<option value="${c}">${renderizarNombreVisible(c)}</option>`;
    selB.innerHTML += `<option value="${c}">${renderizarNombreVisible(c)}</option>`;
  });

  document.getElementById("crear-orden").value = (datosTorneo.partidos.length + 1);
  document.getElementById("modal-crear-partido").style.display = "block";
  bloquearScrollFondo();
}

function cerrarModalCrearPartido() {
  document.getElementById("modal-crear-partido").style.display = "none";
  liberarScrollFondo();
}

async function enviarNuevoPartido() {
  const disciplina = document.getElementById("crear-disciplina").value;
  const orden = document.getElementById("crear-orden").value;
  const fase = document.getElementById("crear-fase").value;
  const equipoA = document.getElementById("crear-equipo-a").value;
  const equipoB = document.getElementById("crear-equipo-b").value;
  const fechaHoraRaw = document.getElementById("crear-fecha-hora").value;

  const idNuevo = "PAR-" + new Date().getTime();

  const { error } = await dbClient.from('partidos').insert([{
    id: idNuevo,
    disciplina: disciplina,
    fase: fase,
    equipo_a: equipoA,
    equipo_b: equipoB,
    fecha_hora: fechaHoraRaw,
    orden: parseInt(orden),
    estado: 'Pendiente'
  }]);

  if (error) {
    mostrarToast("Error: " + error.message, "error");
  } else {
    cerrarModalCrearPartido();
    mostrarToast("Partido registrado con éxito.", "success");
    cargarDatos();
  }
}

function abrirModalCambiarClave() {
  if (!esModoSuperAdmin) {
    mostrarToast("Esta función es exclusiva del Super Administrador.", "error");
    return;
  }
  document.getElementById("nueva-clave-logistica").value = "";
  document.getElementById("nueva-clave-editor").value = "";
  document.getElementById("clave-msj").innerText = "";
  document.getElementById("modal-cambiar-clave").style.display = "block";
  bloquearScrollFondo();
}

function cerrarModalCambiarClave() {
  document.getElementById("modal-cambiar-clave").style.display = "none";
  liberarScrollFondo();
}

async function cambiarEstadoPartido(nuevoEstado) {
  const idPartido = document.getElementById("admin-id-partido").value;
  if (!idPartido) return;

  const golesA = document.getElementById("goles-a").value;
  const golesB = document.getElementById("goles-b").value;

  const gA = golesA !== "" ? parseInt(golesA) : 0;
  const gB = golesB !== "" ? parseInt(golesB) : 0;
  const ahoraIso = new Date().toISOString();

  const existe = datosTorneo.partidos.find(p => p.id === idPartido);

  // Si el partido proviene de un cruce virtual en los brackets
  if (!existe && idPartido.startsWith("VIRTUAL-")) {
    const disciplina = document.getElementById("modal-partido-titulo").dataset.disciplina || "Futsal Masculino";
    const fase = document.getElementById("modal-partido-titulo").dataset.fase || "Semifinales";
    const eqA = document.getElementById("lbl-equipo-a").innerText;
    const eqB = document.getElementById("lbl-equipo-b").innerText;
    const esPenales = document.getElementById("admin-penales").checked;

    const idReal = "PAR-" + new Date().getTime();
    const payload = {
      id: idReal,
      disciplina: disciplina,
      fase: fase,
      equipo_a: eqA,
      equipo_b: eqB,
      goles_a: gA,
      goles_b: gB,
      estado: nuevoEstado,
      definido_penales: esPenales,
      finalizado_at: nuevoEstado === 'Finalizado' ? ahoraIso : null
    };

    const { error } = await dbClient.from('partidos').insert([payload]);
    if (error) {
      mostrarToast("Error al cambiar estado: " + error.message, "error");
      return;
    }
    document.getElementById("admin-id-partido").value = idReal;
  } else {
    // Si ya es un partido registrado en la base de datos
    const updateData = {
      estado: nuevoEstado
    };
    if (nuevoEstado === 'Finalizado') {
      updateData.finalizado_at = ahoraIso;
    }

    const { error } = await dbClient.from('partidos').update(updateData).eq('id', idPartido);
    if (error) {
      mostrarToast("Error al cambiar estado: " + error.message, "error");
      return;
    }
  }

  mostrarToast(`Estado cambiado a "${nuevoEstado}".`, "success");
  await cargarDatos();
}
async function guardarNuevasClaves() {
  if (!esModoSuperAdmin) return;

  const nuevaLog = document.getElementById("nueva-clave-logistica").value.trim();
  const nuevaEd = document.getElementById("nueva-clave-editor").value.trim();

  if (nuevaLog) {
    await dbClient.from('config_accesos').upsert({ clave_id: 'logistica', valor: nuevaLog, updated_at: new Date().toISOString() }, { onConflict: 'clave_id' });
  }
  if (nuevaEd) {
    await dbClient.from('config_accesos').upsert({ clave_id: 'editor', valor: nuevaEd, updated_at: new Date().toISOString() }, { onConflict: 'clave_id' });
  }

  mostrarToast("Contraseñas actualizadas correctamente.", "success");
  cerrarModalCambiarClave();
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
  bloquearScrollFondo();
}

function cerrarModalAjustarPuntos() {
  document.getElementById("modal-ajustar-puntos").style.display = "none";
  liberarScrollFondo();
}

async function guardarPuntosManuales() {
  const curso = document.getElementById("ajuste-curso-select").value;
  const disciplinaKey = document.getElementById("ajuste-disciplina-select").value;
  const puntos = document.getElementById("ajuste-puntos-input").value;

  if (!puntos) {
    mostrarToast("Ingrese los puntos.", "warning");
    return;
  }

  const { error } = await dbClient
    .from('medallero')
    .upsert({ curso_equipo: curso, [disciplinaKey]: parseInt(puntos) }, { onConflict: 'curso_equipo' });

  if (error) {
    mostrarToast("Error: " + error.message, "error");
  } else {
    mostrarToast("¡Puntos ajustados!", "success");
    cerrarModalAjustarPuntos();
    renderizarMedalleroReal();
  }
}

async function abrirModalDetalles(idPartido, disciplina = "", fase = "", eqA = "", eqB = "") {
  let partido = datosTorneo.partidos.find(p => p.id === idPartido);

  document.getElementById("detalles-partido-titulo").innerText = `${disciplina}: ${renderizarNombreVisible(eqA)} vs ${renderizarNombreVisible(eqB)}`;
  document.getElementById("detalles-partido-fase").innerText = `Fase: ${fase} | Estado: ${partido ? partido.estado : 'Pendiente'}`;
  document.getElementById("detalles-equipo-a").innerHTML = `${renderizarLogoHTML(eqA)} ${renderizarNombreVisible(eqA)}`;
  document.getElementById("detalles-equipo-b").innerHTML = `${renderizarNombreVisible(eqB)} ${renderizarNombreVisible(eqB)}`;
  document.getElementById("detalles-marcador").innerText = `${partido && partido.golesA !== "" ? partido.golesA : "-"} : ${partido && partido.golesB !== "" ? partido.golesB : "-"}`;

  const ul = document.getElementById("detalles-lista-incidencias");
  ul.innerHTML = "<li>Cargando incidencias...</li>";

  const { data: incidencias } = await dbClient.from('incidencias').select('*').eq('id_partido', idPartido);

  if (!incidencias || incidencias.length === 0) {
    ul.innerHTML = "<li style='color:#aaa;'>Sin incidencias registradas en este encuentro.</li>";
  } else {
    let html = "";
    incidencias.forEach(inc => {
      let icono = "⚽";
      if (inc.tipo_evento === "Tarjeta Amarilla") icono = "🟨";
      if (inc.tipo_evento === "Tarjeta Roja") icono = "🟥";
      if (inc.tipo_evento === "Tarjeta Azul") icono = "🟦";

      html += `<li>${icono} <b class="jugador-nombre-click" onclick="abrirFifaCard('${inc.jugador_nombre}', '${inc.curso_equipo}')">${inc.jugador_nombre}</b> (${renderizarNombreVisible(inc.curso_equipo)}) - ${inc.tipo_evento}</li>`;
    });
    ul.innerHTML = html;
  }

  document.getElementById("modal-detalles-partido").style.display = "block";
  bloquearScrollFondo();
}

function cerrarModalDetalles() {
  document.getElementById("modal-detalles-partido").style.display = "none";
  liberarScrollFondo();
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
    estado: semisBD[0] ? semisBD[0].estado : 'Pendiente',
    definidoPenales: semisBD[0] ? semisBD[0].definidoPenales : false
  };

  const semi2 = {
    id: semisBD ? semisBD.id : `VIRTUAL-SEMI-2-${disciplina}`,
    fase: "Semifinales",
    disciplina: disciplina,
    equipoA: ganR1_2 || (semisBD ? semisBD.equipoA : 'Por definir'),
    equipoB: ganR1_3 || (semisBD ? semisBD.equipoB : 'Por definir'),
    golesA: semisBD ? semisBD.golesA : '',
    golesB: semisBD ? semisBD.golesB : '',
    estado: semisBD ? semisBD.estado : 'Pendiente',
    definidoPenales: semisBD ? semisBD.definidoPenales : false
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
    estado: finalBD ? finalBD.estado : 'Pendiente',
    definidoPenales: finalBD ? finalBD.definidoPenales : false
  };

  const ganFinal = obtenerGanador(finalMatch);
  const campeonTexto = ganFinal ? `${renderizarLogoHTML(ganFinal, 28)} ${renderizarNombreVisible(ganFinal)}` : "Por Definir";

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
  const penalesBadge = p.definidoPenales ? `<span class="badge-penales">(P)</span>` : '';

  return `
    <div class="bracket-node" onclick="manejarClicPartido('${p.id}', '${p.disciplina}', '${p.fase}', '${p.equipoA}', '${p.equipoB}')">
      <div class="team ${winA}">
        <span>${renderizarLogoHTML(p.equipoA, 22)} ${renderizarNombreVisible(p.equipoA)}</span>
        <b>${p.estado === 'Finalizado' || p.estado === 'En Vivo' ? p.golesA : '-'}${winA ? penalesBadge : ''}</b>
      </div>
      <div class="team ${winB}">
        <span>${renderizarLogoHTML(p.equipoB, 22)} ${renderizarNombreVisible(p.equipoB)}</span>
        <b>${p.estado === 'Finalizado' || p.estado === 'En Vivo' ? p.golesB : '-'}${winB ? penalesBadge : ''}</b>
      </div>
    </div>
  `;
}

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
    const penalesBadge = p.definidoPenales ? `<span class="badge-penales">(P)</span>` : '';
    const esFinalizado = p.estado === 'Finalizado';
    const finalizadoMs = p.finalizadoAt ? new Date(p.finalizadoAt).getTime() : Date.now();
    const minPasados = (Date.now() - finalizadoMs) / (1000 * 60);
    const puedeVotarMvp = esFinalizado && minPasados <= 15;

    html += `
      <div class="card-partido" onclick="manejarClicPartido('${p.id}', '${p.disciplina}', '${p.fase}', '${p.equipoA}', '${p.equipoB}')" style="cursor:pointer;">
        <div>
          <div class="card-header-info">
            <span class="badge-orden">Partido #${p.orden || 1}</span>
            <span class="badge-fase">${p.fase}</span>
          </div>
          <div class="marcador-box">
            <span>${renderizarLogoHTML(p.equipoA, 22)} ${renderizarNombreVisible(p.equipoA)}</span>
            <strong>${p.golesA !== "" ? p.golesA : "-"} : ${p.golesB !== "" ? p.golesB : "-"}${penalesBadge}</strong>
            <span>${renderizarNombreVisible(p.equipoB)} ${renderizarLogoHTML(p.equipoB, 22)}</span>
          </div>
          <small style="color:#aaa;">📅 ${formatearFechaHora(p.fechaHora)} | Estado: <b>${p.estado}</b></small>
          
          ${esFinalizado ? `<button class="btn-compartir" onclick="event.stopPropagation(); compartirResultado('${p.id}')">📲 Compartir Resultado</button>` : ''}
          ${puedeVotarMvp ? `<button class="btn-votar-mvp" onclick="event.stopPropagation(); abrirModalVotarMvp('${p.id}')">⭐ Votar MVP del Partido</button>` : ''}
          
          ${generarBarraApoyoHTML(p.id, p.equipoA, p.equipoB)}
        </div>
        <button class="btn-cargar-card solo-logistica" onclick="event.stopPropagation(); abrirModalAdmin('${p.id}', '${p.disciplina}', '${p.fase}', '${p.equipoA}', '${p.equipoB}')">✏️ Cargar Resultado / Tarjetas</button>
      </div>
    `;
  });
  html += `</div>`;
  contenedor.innerHTML = html;
}

function renderizarPortadaEnVivo() {
  const container = document.getElementById("envivo-content");
  if (!container) return;

  const partidoEnVivo = datosTorneo.partidos.find(p => p.estado === 'En Vivo');

  if (partidoEnVivo) {
    const panelTarget = mapearDisciplinaAPanel(partidoEnVivo.disciplina);
    const penalesBadge = partidoEnVivo.definidoPenales ? `<span class="badge-penales">(P)</span>` : '';

    container.innerHTML = `
      <div class="live-match-card" onclick="manejarClicPartido('${partidoEnVivo.id}', '${partidoEnVivo.disciplina}', '${partidoEnVivo.fase}', '${partidoEnVivo.equipoA}', '${partidoEnVivo.equipoB}')" style="cursor:pointer;">
        <span class="badge-live">🔴 EN VIVO AHORA</span>
        <h3 style="color:#d4af37; margin:12px 0 8px 0; font-size:18px;">${partidoEnVivo.disciplina} — ${partidoEnVivo.fase}</h3>
        <div class="marcador-box">
          <span>${renderizarLogoHTML(partidoEnVivo.equipoA, 28)} ${renderizarNombreVisible(partidoEnVivo.equipoA)}</span>
          <strong style="font-size:26px;">${partidoEnVivo.golesA !== "" ? partidoEnVivo.golesA : "0"} : ${partidoEnVivo.golesB !== "" ? partidoEnVivo.golesB : "0"}${penalesBadge}</strong>
          <span>${renderizarNombreVisible(partidoEnVivo.equipoB)} ${renderizarLogoHTML(partidoEnVivo.equipoB, 28)}</span>
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
            <span>${renderizarLogoHTML(proximo.equipoA, 26)} ${renderizarNombreVisible(proximo.equipoA)}</span>
            <strong style="color:#aaa; font-size:18px;">VS</strong>
            <span>${renderizarNombreVisible(proximo.equipoB)} ${renderizarLogoHTML(proximo.equipoB, 26)}</span>
          </div>
          <small style="color:#aaa;">📅 ${formatearFechaHora(proximo.fechaHora)} | Orden #${proximo.orden}</small>
          <button class="btn-ir-bracket" onclick="event.stopPropagation(); openTab(event, '${panelTarget}')">🏆 Ir a Pestaña de ${proximo.disciplina}</button>
          ${generarBarraApoyoHTML(proximo.id, proximo.equipoA, proximo.equipoB)}
        </div>
      `;
    } else {
      container.innerHTML = `<p style="color:#aaa;">No hay encuentros agendados por el momento.</p>`;
    }
  }
}

function manejarClicPartido(idPartido, disciplina, fase, eqA, eqB) {
  if (esModoLogistica || esModoSuperAdmin) {
    abrirModalAdmin(idPartido, disciplina, fase, eqA, eqB);
  } else {
    abrirModalDetalles(idPartido, disciplina, fase, eqA, eqB);
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

function marcarSubTabActiva(boton) {
  if (!boton || !boton.parentElement) return;
  const hermanos = boton.parentElement.getElementsByClassName("sub-link");
  for (let i = 0; i < hermanos.length; i++) { hermanos[i].classList.remove("active"); }
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

// Medallero, Estadísticas y Tablas
async function renderizarMedalleroReal() {
  const contenedor = document.getElementById("medallero-content");
  if (!contenedor) return;

  try {
    const { data: medallero } = await dbClient.from('medallero').select('*');

    if (!medallero || medallero.length === 0) {
      contenedor.innerHTML = `<p style="color:#aaa;">No hay puntuaciones registradas aún.</p>`;
      return;
    }

    medallero.sort((a, b) => {
      const totA = (a.futsalM||0)+(a.futsalF||0)+(a.futbol||0)+(a.voley||0)+(a.pikivoley||0)+(a.esports||0)+(a.ajedrez||0)+(a.maraton||0)+(a.ciclismo||0);
      const totB = (b.futsalM||0)+(b.futsalF||0)+(b.futbol||0)+(b.voley||0)+(b.pikivoley||0)+(b.esports||0)+(b.ajedrez||0)+(b.maraton||0)+(b.ciclismo||0);
      return totB - totA;
    });

    medalleroCache = medallero;

    let html = `<div style="overflow-x:auto;"><table class="tabla-deportiva"><thead><tr><th>Pos.</th><th>Curso / Equipo</th><th>Futsal M</th><th>Futsal F</th><th>Fútbol</th><th>Vóley</th><th>Pikivoley</th><th>E-Sports</th><th>Ajedrez</th><th>Maratón</th><th>Ciclismo</th><th>TOTAL PTS</th></tr></thead><tbody>`;

    medallero.forEach((f, index) => {
      const total = (f.futsalM||0)+(f.futsalF||0)+(f.futbol||0)+(f.voley||0)+(f.pikivoley||0)+(f.esports||0)+(f.ajedrez||0)+(f.maraton||0)+(f.ciclismo||0);
      html += `<tr><td><b>#${index + 1}</b></td><td>${renderizarLogoHTML(f.curso_equipo, 22)} <strong>${renderizarNombreVisible(f.curso_equipo)}</strong></td><td>${f.futsalM||0}</td><td>${f.futsalF||0}</td><td>${f.futbol||0}</td><td>${f.voley||0}</td><td>${f.pikivoley||0}</td><td>${f.esports||0}</td><td>${f.ajedrez||0}</td><td>${f.maraton||0}</td><td>${f.ciclismo||0}</td><td><b style="color:#d4af37; font-size:15px;">${total} PTS</b></td></tr>`;
    });

    html += `</tbody></table></div>`;
    contenedor.innerHTML = html;
  } catch (e) {
    console.error("Error al renderizar medallero:", e);
  }
}

function renderizarEstadisticasEquipos() {
  const container = document.getElementById("estadisticas-content");
  if (!container) return;

  const stats = {};
  CURSOS_EQUIPOS.forEach(eq => { stats[eq] = { pj: 0, pg: 0, pp: 0, gf: 0, gc: 0 }; });

  datosTorneo.partidos.forEach(p => {
    if (p.estado === 'Finalizado') {
      const gA = Number(p.golesA);
      const gB = Number(p.golesB);

      if (stats[p.equipoA]) {
        stats[p.equipoA].pj++;
        stats[p.equipoA].gf += gA;
        stats[p.equipoA].gc += gB;
        if (gA > gB) stats[p.equipoA].pg++; else stats[p.equipoA].pp++;
      }

      if (stats[p.equipoB]) {
        stats[p.equipoB].pj++;
        stats[p.equipoB].gf += gB;
        stats[p.equipoB].gc += gA;
        if (gB > gA) stats[p.equipoB].pg++; else stats[p.equipoB].pp++;
      }
    }
  });

  const lista = Object.keys(stats).map(eq => ({ equipo: eq, ...stats[eq] }));

  let html = `<div style="overflow-x:auto;"><table class="tabla-deportiva"><thead><tr><th>Equipo / Curso</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>Dif. Goles</th></tr></thead><tbody>`;

  lista.forEach(item => {
    html += `<tr><td>${renderizarLogoHTML(item.equipo, 22)} <b>${renderizarNombreVisible(item.equipo)}</b></td><td>${item.pj}</td><td>${item.pg}</td><td>${item.pp}</td><td>${item.gf}</td><td>${item.gc}</td><td>${item.gf - item.gc}</td></tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function renderizarComparativaCarreras() {
  const container = document.getElementById("comparativa-content");
  if (!container) return;

  let victoriasPsico = 0, victoriasEdu = 0, golesPsico = 0, golesEdu = 0;

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
    html += `<tr><td><b>#${index + 1}</b></td><td><b class="jugador-nombre-click" onclick="abrirFifaCard('${escaparHTML(g.jugador)}', '${g.equipo}')">${escaparHTML(g.jugador)}</b></td><td>${renderizarLogoHTML(g.equipo, 20)} ${renderizarNombreVisible(g.equipo)}</td><td><b style="color:#d4af37;">${g.goles}</b></td></tr>`;
  });
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

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
    const penalesBadge = p.definidoPenales ? ` (P)` : '';
    const resultado = (p.golesA !== "" && p.golesB !== "") ? `${p.golesA} - ${p.golesB}${penalesBadge}` : "vs";
    html += `
      <tr onclick="manejarClicPartido('${p.id}', '${p.disciplina}', '${p.fase}', '${p.equipoA}', '${p.equipoB}')" style="cursor:pointer;">
        <td>${p.orden}</td>
        <td>${p.disciplina}</td>
        <td>${p.fase}</td>
        <td>${renderizarLogoHTML(p.equipoA, 20)} ${renderizarNombreVisible(p.equipoA)} vs ${renderizarNombreVisible(p.equipoB)} ${renderizarLogoHTML(p.equipoB, 20)}</td>
        <td>${resultado}</td>
        <td>${formatearFechaHora(p.fechaHora)}</td>
        <td>${badgeEstado(p.estado)}</td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

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

  const suspendidos = Object.values(conteo).filter(j => j.rojas >= 1 || j.amarillas >= 2);

  if (suspendidos.length === 0) {
    container.innerHTML = `<p style="color:#aaa;">No hay jugadores suspendidos por el momento.</p>`;
    return;
  }

  let html = `<div style="overflow-x:auto;"><table class="tabla-deportiva"><thead><tr><th>Jugador</th><th>Curso / Equipo</th><th>🟨</th><th>🟥</th><th>🟦</th><th>Motivo</th></tr></thead><tbody>`;

  suspendidos.forEach(j => {
    const motivo = j.rojas >= 1 ? "Tarjeta Roja Directa" : "Acumulación de Amarillas (2)";
    html += `<tr><td><b class="jugador-nombre-click" onclick="abrirFifaCard('${escaparHTML(j.jugador)}', '${j.equipo}')">${escaparHTML(j.jugador)}</b></td><td>${renderizarLogoHTML(j.equipo, 20)} ${renderizarNombreVisible(j.equipo)}</td><td>${j.amarillas}</td><td>${j.rojas}</td><td>${j.azules}</td><td style="color:#ef4444; font-weight:bold;">${motivo}</td></tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

// Barra de Apoyo e Interactividad
function generarBarraApoyoHTML(idPartido, equipoA, equipoB) {
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
      <small class="apoyo-total">${total} voto${total === 1 ? '' : 's'}${yaVoto ? ' · ¡ya votaste!' : ''}</small>
    </div>
  `;
}

async function votarApoyo(idPartido, lado) {
  if (localStorage.getItem('voto_apoyo_' + idPartido)) {
    mostrarToast("Ya emitiste tu voto de apoyo en este partido.", "info");
    return;
  }

  const idNuevo = 'APOYO-' + new Date().getTime();
  const { error } = await dbClient.from('apoyos').insert([{ id: idNuevo, id_partido: idPartido, equipo: lado }]);

  if (error) {
    mostrarToast('Error al registrar voto: ' + error.message, "error");
    return;
  }

  localStorage.setItem('voto_apoyo_' + idPartido, lado);
  mostrarToast("¡Voto registrado!", "success");
  cargarDatos();
}

async function enviarReaccion(emoji) {
  lanzarEmojiFlotante(emoji);
  const partidoActual = datosTorneo.partidos.find(p => p.estado === 'En Vivo');
  const idNuevo = 'REAC-' + new Date().getTime();
  try {
    await dbClient.from('reacciones').insert([{ id: idNuevo, id_partido: partidoActual ? partidoActual.id : null, emoji: emoji }]);
  } catch (e) {}
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

// Muro de Comentarios Anónimos
const COMENTARIO_VIDA_MS = 10 * 60 * 1000;

async function enviarComentario() {
  const input = document.getElementById("comentario-input");
  const mensaje = input.value.trim();

  if (!mensaje) return;
  if (mensaje.length > 200) {
    mostrarToast("El comentario no puede superar 200 caracteres.", "warning");
    return;
  }

  const idGenerado = "COM-" + Date.now();
  const { error } = await dbClient.from('comentarios').insert([{ id: idGenerado, mensaje: mensaje }]);

  if (error) {
    mostrarToast("Error al enviar comentario: " + error.message, "error");
    return;
  }

  input.value = "";
  cargarDatos();
}

function renderizarMuroComentarios() {
  const lista = document.getElementById('muro-comentarios-lista');
  if (!lista) return;

  const ahora = Date.now();
  const vigentes = (comentariosCache || []).filter(c => (ahora - new Date(c.created_at).getTime()) <= COMENTARIO_VIDA_MS);

  if (vigentes.length === 0) {
    lista.innerHTML = `<li style="color:#aaa;">Sé el primero en comentar 👀</li>`;
    return;
  }

  const html = [...vigentes].reverse().map(c => {
    const hora = new Date(c.created_at).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
    return `<li class="comentario-item">💬 ${escaparHTML(c.mensaje)}<span class="comentario-hora">🕐 ${hora}</span></li>`;
  }).join('');

  lista.innerHTML = html;
}

// Quiniela (Predicciones)
function renderizarFormularioQuiniela() {
  const selCurso = document.getElementById('quiniela-curso');
  const selFutsal = document.getElementById('quiniela-pred-futsal');
  const selFutbol = document.getElementById('quiniela-pred-futbol');
  const selVoley = document.getElementById('quiniela-pred-voley');
  const selPiki = document.getElementById('quiniela-pred-pikivoley');
  const selGeneral = document.getElementById('quiniela-pred-general');

  if (!selCurso || !selFutsal || !selFutbol || !selVoley || !selPiki || !selGeneral) return;
  if (selCurso.dataset.cargado === 'true') return;

  const opciones = CURSOS_EQUIPOS.map(c => `<option value="${c}">${renderizarNombreVisible(c)}</option>`).join('');
  selCurso.innerHTML = opciones;
  selFutsal.innerHTML = opciones;
  selFutbol.innerHTML = opciones;
  selVoley.innerHTML = opciones;
  selPiki.innerHTML = opciones;
  selGeneral.innerHTML = opciones;
  selCurso.dataset.cargado = 'true';

  if (localStorage.getItem('ya_predije')) {
    document.getElementById('quiniela-msj').innerText = 'Ya enviaste tu predicción desde este dispositivo. ¡Suerte!';
  }
}

async function enviarPrediccion() {
  const nombre = document.getElementById("quiniela-nombre").value.trim();
  const curso = document.getElementById("quiniela-curso").value;
  const predFutsal = document.getElementById("quiniela-pred-futsal").value;
  const predFutbol = document.getElementById("quiniela-pred-futbol").value;
  const predVoley = document.getElementById("quiniela-pred-voley").value;
  const predPiki = document.getElementById("quiniela-pred-pikivoley").value;
  const predGeneral = document.getElementById("quiniela-pred-general").value;

  if (!nombre) {
    mostrarToast("Por favor ingresá tu nombre.", "warning");
    return;
  }
  if (localStorage.getItem('ya_predije')) {
    mostrarToast("Ya enviaste tu predicción desde este dispositivo.", "info");
    return;
  }

  const { data: existentes } = await dbClient.from('predicciones').select('id').ilike('nombre', nombre);
  if (existentes && existentes.length > 0) {
    mostrarToast("Ya existe una predicción con ese nombre.", "warning");
    return;
  }

  const idGenerado = "PRED-" + Date.now();
  const { error } = await dbClient.from('predicciones').insert([{
    id: idGenerado,
    nombre: nombre,
    curso: curso,
    pred_futsal: predFutsal,
    pred_futbol: predFutbol,
    pred_voley: predVoley,
    pred_pikivoley: predPiki,
    pred_general: predGeneral
  }]);

  if (error) {
    mostrarToast("Error: " + error.message, "error");
    return;
  }

  localStorage.setItem('ya_predije', 'true');
  mostrarToast("¡Predicción registrada! Buena suerte 🎯", "success");
  cargarDatos();
}

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
    container.innerHTML = `<p style="color:#aaa;">Todavía nadie cargó su predicción.</p>`;
    return;
  }

  const campFutsal = obtenerCampeonDisciplina('Futsal Masculino');
  const campFutbol = obtenerCampeonDisciplina('Fútbol de Campo Masculino');
  const campVoley = obtenerCampeonDisciplina('Volley Mixto');
  const campPiki = obtenerCampeonDisciplina('Pikivoley Masculino');
  const campGeneral = medalleroCache && medalleroCache.length > 0 ? medalleroCache[0].curso_equipo : null;

  const categorias = [
    { label: 'Futsal Masculino', campo: 'pred_futsal', actual: campFutsal },
    { label: 'Fútbol de Campo M.', campo: 'pred_futbol', actual: campFutbol },
    { label: 'Vóley Mixto', campo: 'pred_voley', actual: campVoley },
    { label: 'Pikivoley M.', campo: 'pred_pikivoley', actual: campPiki },
    { label: '🏆 Campeón General', campo: 'pred_general', actual: campGeneral }
  ];

  const ranking = prediccionesCache.map(p => {
    let aciertos = 0;
    categorias.forEach(c => { if (c.actual && p[c.campo] === c.actual) aciertos++; });
    const fecha = p.created_at ? new Date(p.created_at).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
    return { id: p.id, nombre: p.nombre, curso: p.curso, aciertos, fecha, prediccion: p };
  }).sort((a, b) => b.aciertos - a.aciertos);

  let html = `<div class="ranking-scroll"><table class="tabla-deportiva"><thead><tr><th></th><th>Pos.</th><th>Alumno</th><th>Curso</th><th>Aciertos</th><th>Fecha</th><th class="solo-superadmin-celda"></th></tr></thead><tbody>`;

  ranking.forEach((r, index) => {
    const filaId = `detalle-pred-${r.id}`;
    html += `<tr class="fila-prediccion" onclick="toggleDetallePrediccion('${filaId}')">
      <td class="celda-desplegar">▾</td>
      <td><b>#${index + 1}</b></td>
      <td>${escaparHTML(r.nombre)}</td>
      <td>${renderizarNombreVisible(r.curso)}</td>
      <td><b style="color:#d4af37;">${r.aciertos} / 5</b></td>
      <td style="color:#aaa; font-size:12px;">${r.fecha}</td>
      <td class="solo-superadmin-celda"><button class="btn-eliminar-fila" onclick="event.stopPropagation(); eliminarPrediccion('${r.id}')" title="Eliminar predicción">🗑️</button></td>
    </tr>`;

    html += `<tr id="${filaId}" class="fila-detalle-prediccion" style="display:none;"><td colspan="7">`;
    html += `<div class="detalle-prediccion-box">`;
    categorias.forEach(c => {
      const predVal = r.prediccion[c.campo];
      const definido = !!c.actual;
      const acerto = definido && predVal === c.actual;
      const icono = !definido ? '⏳' : (acerto ? '✅' : '❌');
      html += `<div class="detalle-prediccion-item ${definido ? (acerto ? 'acierto' : 'fallo') : ''}">
        <span>${icono} <b>${c.label}:</b> pronosticó ${renderizarNombreVisible(predVal || '-')}</span>
        <span class="detalle-prediccion-real">${definido ? 'Real: ' + renderizarNombreVisible(c.actual) : 'Aún sin definir'}</span>
      </div>`;
    });
    html += `</div></td></tr>`;
  });

  html += `</tbody>mtable></div>`;
  container.innerHTML = html;
}

function toggleDetallePrediccion(filaId) {
  const fila = document.getElementById(filaId);
  if (!fila) return;
  fila.style.display = fila.style.display === 'none' ? 'table-row' : 'none';
}

function eliminarPrediccion(id) {
  if (!esModoSuperAdmin) return;
  mostrarConfirmacion("¿Eliminar esta predicción?", async () => {
    const { error } = await dbClient.from('predicciones').delete().eq('id', id);
    if (error) mostrarToast("Error: " + error.message, "error");
    else cargarDatos();
  });
}

// Inicialización
window.onload = function() {
  cargarDatos();
  setInterval(renderizarMuroComentarios, 30000);
};