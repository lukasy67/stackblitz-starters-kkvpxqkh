let esModoLogistica = false;

// Claves obtenidas de Supabase  
const SUPABASE_URL = "https://zkklifirmzvlwapivbrc.supabase.co";  
const SUPABASE_KEY = "sb_publishable_Od54CMAGf_6wyGbeU-vvCw_FWzvrvbd";  
  
const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);  
  
let datosTorneo = { partidos: [], incidencias: [] };  
  
const CURSOS_EQUIPOS = [  
  "Dements (4 Ciencias)", "PsychoKings (2 Psico)", "Titanium (1 Psico)", "Insanos (3 Psico)",  
  "Alpha (1 Ciencias)", "Vanguardia (2 Ciencias)", "Legión (3 Ciencias)", "Mastery (5 Psico)", "Avanzada (4 Psico)"  
];  

// Alternar Modo Logística mediante el búho 🦉
function activarModoLogistica() {
  if (esModoLogistica) {
    esModoLogistica = false;
    document.body.classList.remove("modo-logistica");
    alert("Modo Espectador activado.");
    return;
  }

  const pass = prompt("Ingrese la contraseña de Logística:");
  if (pass === "1234") { // Contraseña por defecto
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
    const { data: partidos, error } = await dbClient  
      .from('partidos')  
      .select('*')  
      .order('orden', { ascending: true });  
  
    if (!error) {  
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
  
    renderizarArbolGrafico("Futsal Masculino", "futsal-content");  
    renderizarArbolGrafico("Volley Mixto", "voley-content");  
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
  
  html += `  
    <div class="bracket-col">  
      <div class="bracket-title">🏆 Campeón</div>  
      <div class="champion-box">🏆 Por Definir</div>  
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

function abrirModalAdmin(idPartido) {  
  if (!esModoLogistica) {  
    return; // Para el público no abre edición  
  }  

  const partido = datosTorneo.partidos.find(p => p.id === idPartido);  
  if (!partido) return;  

  document.getElementById("admin-id-partido").value = partido.id;  
  document.getElementById("modal-partido-titulo").innerText = `${partido.equipoA || 'Por definir'} vs ${partido.equipoB || 'Por definir'}`;  
  document.getElementById("lbl-equipo-a").innerText = partido.equipoA || "Equipo A";  
  document.getElementById("lbl-equipo-b").innerText = partido.equipoB || "Equipo B";  
  document.getElementById("goles-a").value = partido.golesA !== undefined ? partido.golesA : "";  
  document.getElementById("goles-b").value = partido.golesB !== undefined ? partido.golesB : "";  

  document.getElementById("modal-admin").style.display = "block";  
}  

function cerrarModalAdmin() {  
  document.getElementById("modal-admin").style.display = "none";  
}  

async function enviarResultado() {  
  const idPartido = document.getElementById("admin-id-partido").value;  
  const golesA = document.getElementById("goles-a").value;  
  const golesB = document.getElementById("goles-b").value;  

  if (golesA === "" || golesB === "") {  
    alert("Por favor ingrese ambos marcadores.");  
    return;  
  }  

  const { error } = await dbClient  
    .from('partidos')  
    .update({  
      goles_a: parseInt(golesA),  
      goles_b: parseInt(golesB),  
      estado: 'Finalizado'  
    })  
    .eq('id', idPartido);  

  if (error) {  
    alert("Error al guardar: " + error.message);  
  } else {  
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