// ============================================================
// FUNCIONES DE UTILIDAD VISUAL
// ============================================================
function renderizarNombreVisible(nombreCompleto) {
    if (!nombreCompleto) return "Por definir";
    return nombreCompleto.split(" (")[0];
  }
  
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
  
    btnAceptar.onclick = () => { cleanup(); if (typeof onConfirm === 'function') onConfirm(); };
    btnCancelar.onclick = () => { cleanup(); };
  }
  
  function escaparHTML(texto) {
    if (texto === null || texto === undefined) return "";
    return String(texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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
  // GENERADOR DE LOGOS
  // ============================================================
  function generarLogoDataURL(nombreEquipo, size = 40) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
  
    const config = EQUIPOS_COLORES[nombreEquipo] || { bg: "#d4af37", initials: "IF" };
  
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = config.bg;
    ctx.fill();
  
    ctx.lineWidth = Math.max(1.5, size * 0.05);
    ctx.strokeStyle = "#d4af37";
    ctx.stroke();
  
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
  // RENDERIZADO DE LA INTERFAZ PRINCIPAL
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
  
  // ============================================================
  // NAVEGACIÓN Y TABS
  // ============================================================
  function manejarClicPartido(idPartido, disciplina, fase, eqA, eqB) {
    if (esModoLogistica || esModoSuperAdmin) abrirModalAdmin(idPartido, disciplina, fase, eqA, eqB);
    else abrirModalDetalles(idPartido, disciplina, fase, eqA, eqB);
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
    for (let i = 0; i < tabcontent.length; i++) tabcontent[i].style.display = "none";
    const tablinks = document.getElementsByClassName("tab-link");
    for (let i = 0; i < tablinks.length; i++) tablinks[i].className = tablinks[i].className.replace(" active", "");
    const targetTab = document.getElementById(tabName);
    if (targetTab) targetTab.style.display = "block";
    if (evt && evt.currentTarget) evt.currentTarget.className += " active";
  }
  
  function marcarSubTabActiva(boton) {
    if (!boton || !boton.parentElement) return;
    const hermanos = boton.parentElement.getElementsByClassName("sub-link");
    for (let i = 0; i < hermanos.length; i++) hermanos[i].classList.remove("active");
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
  
  // ============================================================
  // TABLAS, MEDALLERO Y ESTADÍSTICAS
  // ============================================================
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
        if (stats[p.equipoA]) { stats[p.equipoA].pj++; stats[p.equipoA].gf += gA; stats[p.equipoA].gc += gB; if (gA > gB) stats[p.equipoA].pg++; else stats[p.equipoA].pp++; }
        if (stats[p.equipoB]) { stats[p.equipoB].pj++; stats[p.equipoB].gf += gB; stats[p.equipoB].gc += gA; if (gB > gA) stats[p.equipoB].pg++; else stats[p.equipoB].pp++; }
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
        if (!goleadores[clave]) goleadores[clave] = { jugador: inc.jugador_nombre, equipo: inc.curso_equipo || '', goles: 0 };
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
  
  function renderizarCuadroHonor() {
    const container = document.getElementById("cuadro-honor-content");
    if (!container) return;
  
    const goleadoresFutsal = {};
    let tarjetasPorEquipo = {};
  
    datosTorneo.incidencias.forEach(inc => {
      if (inc.tipo_evento === 'Gol') goleadoresFutsal[inc.jugador_nombre] = (goleadoresFutsal[inc.jugador_nombre] || 0) + 1;
      if (inc.tipo_evento && inc.tipo_evento.includes('Tarjeta')) tarjetasPorEquipo[inc.curso_equipo] = (tarjetasPorEquipo[inc.curso_equipo] || 0) + 1;
    });
  
    let topGoleador = "Por definir", maxGoles = 0;
    Object.keys(goleadoresFutsal).forEach(j => {
      if (goleadoresFutsal[j] > maxGoles) { maxGoles = goleadoresFutsal[j]; topGoleador = `${j} (${maxGoles} goles)`; }
    });
  
    let equipoFairPlay = "Por definir", minTarjetas = 999;
    CURSOS_EQUIPOS.forEach(eq => {
      const cant = tarjetasPorEquipo[eq] || 0;
      if (cant < minTarjetas) { minTarjetas = cant; equipoFairPlay = `${renderizarNombreVisible(eq)} (${cant} tarjetas)`; }
    });
  
    const obtenerTopMvpPorDisciplina = (filtroDisc) => {
      const conteo = {};
      votosMvpCache.forEach(v => {
        if (normalizarTexto(v.disciplina).includes(normalizarTexto(filtroDisc))) conteo[v.jugador_nombre] = (conteo[v.jugador_nombre] || 0) + 1;
      });
  
      let top = "Por definir", max = 0;
      Object.keys(conteo).forEach(j => {
        if (conteo[j] > max) { max = conteo[j]; top = `${j} (${max} voto${max===1?'':'s'})`; }
      });
      return top;
    };
  
    const mvpFutsal = obtenerTopMvpPorDisciplina("Futsal");
    const mvpFutbol = obtenerTopMvpPorDisciplina("Fútbol");
    const mvpVoley = obtenerTopMvpPorDisciplina("Volley") !== "Por definir" ? obtenerTopMvpPorDisciplina("Volley") : obtenerTopMvpPorDisciplina("Voley");
    const mvpPiki = obtenerTopMvpPorDisciplina("Pikivoley");
  
    container.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:15px; margin-top:15px;">
        <div style="background:#161616; border:1px solid #333; padding:15px; border-radius:8px;"><h3 style="color:#d4af37; margin:0 0 8px 0;">⚽ Máximo Goleador</h3><p style="margin:0; font-size:15px; font-weight:bold;">${topGoleador}</p></div>
        <div style="background:#161616; border:1px solid #333; padding:15px; border-radius:8px;"><h3 style="color:#d4af37; margin:0 0 8px 0;">🕊️ Premio Fair Play</h3><p style="margin:0; font-size:15px; font-weight:bold;">${equipoFairPlay}</p></div>
        <div style="background:#161616; border:1px solid #f59e0b; padding:15px; border-radius:8px;"><h3 style="color:#f59e0b; margin:0 0 8px 0;">⭐ MVP Futsal</h3><p style="margin:0; font-size:15px; font-weight:bold;">${mvpFutsal}</p></div>
        <div style="background:#161616; border:1px solid #f59e0b; padding:15px; border-radius:8px;"><h3 style="color:#f59e0b; margin:0 0 8px 0;">⭐ MVP Fútbol de Campo</h3><p style="margin:0; font-size:15px; font-weight:bold;">${mvpFutbol}</p></div>
        <div style="background:#161616; border:1px solid #f59e0b; padding:15px; border-radius:8px;"><h3 style="color:#f59e0b; margin:0 0 8px 0;">⭐ MVP Vóley Mixto</h3><p style="margin:0; font-size:15px; font-weight:bold;">${mvpVoley}</p></div>
        <div style="background:#161616; border:1px solid #f59e0b; padding:15px; border-radius:8px;"><h3 style="color:#f59e0b; margin:0 0 8px 0;">⭐ MVP Pikivoley</h3><p style="margin:0; font-size:15px; font-weight:bold;">${mvpPiki}</p></div>
      </div>
    `;
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
          <td>${p.orden}</td><td>${p.disciplina}</td><td>${p.fase}</td>
          <td>${renderizarLogoHTML(p.equipoA, 20)} ${renderizarNombreVisible(p.equipoA)} vs ${renderizarNombreVisible(p.equipoB)} ${renderizarLogoHTML(p.equipoB, 20)}</td>
          <td>${resultado}</td><td>${formatearFechaHora(p.fechaHora)}</td><td>${badgeEstado(p.estado)}</td>
        </tr>
      `;
    });
  
    html += `</tbody></table></div>`;
    container.innerHTML = html;
  }
  
  // ============================================================
  // MODALES (Equipos, Detalles, Ajustes)
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
            <div class="card-equipo-stats"><span>👥 ${numJugadores} Jugadores</span><span>🏆 ${pg}V / ${pj}PJ</span></div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }
  
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
        gf += gMio; gc += gRival;
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
  
  function abrirModalAjustarPuntos() {
    if (!esModoSuperAdmin) return;
    const selCurso = document.getElementById("ajuste-curso-select");
    if (!selCurso) return;
    selCurso.innerHTML = "";
  
    CURSOS_EQUIPOS.forEach(c => { selCurso.innerHTML += `<option value="${c}">${renderizarNombreVisible(c)}</option>`; });
  
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
  
    if (!puntos) return mostrarToast("Ingrese los puntos.", "warning");
  
    const { error } = await dbClient.from('medallero').upsert({ curso_equipo: curso, [disciplinaKey]: parseInt(puntos) }, { onConflict: 'curso_equipo' });
  
    if (error) mostrarToast("Error: " + error.message, "error");
    else {
      mostrarToast("¡Puntos ajustados!", "success");
      cerrarModalAjustarPuntos();
      renderizarMedalleroReal();
    }
  }
  
  // ============================================================
  // GESTIÓN DE JUGADORES (CRUD, MASIVA, FIFA CARDS)
  // ============================================================
  function abrirModalEditarJugador(jugadorObj) {
    if (!esModoEditor && !esModoSuperAdmin) return mostrarToast("No tienes permisos para editar jugadores.", "error");
    const equipoActual = document.getElementById("modal-equipo").dataset.equipoActual;
    const selEquipo = document.getElementById("edit-jugador-equipo");
    selEquipo.innerHTML = `<option value="${equipoActual}">${renderizarNombreVisible(equipoActual)}</option>`;
    selEquipo.value = equipoActual;
  
    if (jugadorObj) {
      document.getElementById("titulo-modal-jugador").innerText = "✏️ Editar Jugador";
      document.getElementById("edit-jugador-id").value = jugadorObj.id;
      document.getElementById("edit-jugador-nombre").value = jugadorObj.nombre;
      const discs = jugadorObj.disciplinas || "";
      document.getElementById("check-disc-futsal-m").checked = discs.includes("Futsal Masculino");
      document.getElementById("check-disc-futsal-f").checked = discs.includes("Futsal Femenino");
      document.getElementById("check-disc-futbol-m").checked = discs.includes("Fútbol de Campo Masculino");
      document.getElementById("check-disc-futbol-f").checked = discs.includes("Fútbol de Campo Femenino");
      document.getElementById("check-disc-voley").checked = discs.includes("Volley Mixto");
      document.getElementById("check-disc-pikivoley").checked = discs.includes("Pikivoley Masculino");
      document.getElementById("check-disc-clash").checked = discs.includes("Clash Royale");
    } else {
      document.getElementById("titulo-modal-jugador").innerText = "➕ Añadir Jugador";
      document.getElementById("edit-jugador-id").value = "";
      document.getElementById("edit-jugador-nombre").value = "";
    }
    document.getElementById("modal-editar-jugador").style.display = "block";
  }
  
  function cerrarModalEditarJugador() {
    document.getElementById("modal-editar-jugador").style.display = "none";
  }
  
  async function guardarJugador() {
    if (!esModoEditor && !esModoSuperAdmin) return mostrarToast("Acceso denegado.", "error");
  
    const id = document.getElementById("edit-jugador-id").value;
    const nombre = document.getElementById("edit-jugador-nombre").value.trim();
    const equipo = document.getElementById("modal-equipo").dataset.equipoActual;
  
    if (!nombre) return mostrarToast("Por favor ingrese el nombre del jugador.", "warning");
  
    const seleccionadas = [];
    if (document.getElementById("check-disc-futsal-m").checked) seleccionadas.push("Futsal Masculino");
    if (document.getElementById("check-disc-futsal-f").checked) seleccionadas.push("Futsal Femenino");
    if (document.getElementById("check-disc-futbol-m").checked) seleccionadas.push("Fútbol de Campo Masculino");
    if (document.getElementById("check-disc-futbol-f").checked) seleccionadas.push("Fútbol de Campo Femenino");
    if (document.getElementById("check-disc-voley").checked) seleccionadas.push("Volley Mixto");
    if (document.getElementById("check-disc-pikivoley").checked) seleccionadas.push("Pikivoley Masculino");
    if (document.getElementById("check-disc-clash").checked) seleccionadas.push("Clash Royale");
    
    const disciplinasStr = seleccionadas.join(", ");
  
    if (id) {
      const { error } = await dbClient.from('jugadores').update({ nombre: nombre, disciplinas: disciplinasStr }).eq('id', id);
      if (error) return mostrarToast("Error al actualizar jugador: " + error.message, "error");
      mostrarToast("Jugador actualizado correctamente.", "success");
    } else {
      const idNuevo = "JUG-" + Date.now();
      const { error } = await dbClient.from('jugadores').insert([{ id: idNuevo, nombre: nombre, equipo: equipo, disciplinas: disciplinasStr }]);
      if (error) return mostrarToast("Error al añadir jugador: " + error.message, "error");
      mostrarToast("Jugador registrado en la base de datos.", "success");
    }
  
    cerrarModalEditarJugador();
    await cargarDatos();
    abrirModalEquipo(equipo);
  }
  
  function abrirModalCargaMasiva() {
    if (!esModoEditor && !esModoSuperAdmin) return mostrarToast("No tienes permisos para agregar jugadores.", "error");
    const equipoActual = document.getElementById("modal-equipo").dataset.equipoActual;
    const selEquipo = document.getElementById("masiva-equipo-select");
    selEquipo.innerHTML = `<option value="${equipoActual}">${renderizarNombreVisible(equipoActual)}</option>`;
    selEquipo.value = equipoActual;
  
    const filtroActual = document.getElementById("modal-equipo-filtro-disciplina").value;
    if (filtroActual !== "TODAS") document.getElementById("masiva-disciplina-select").value = filtroActual;
  
    document.getElementById("masiva-nombres-input").value = "";
    document.getElementById("modal-carga-masiva").style.display = "block";
  }
  
  function cerrarModalCargaMasiva() {
    document.getElementById("modal-carga-masiva").style.display = "none";
  }
  
  async function guardarJugadoresMasivo() {
    if (!esModoEditor && !esModoSuperAdmin) return;
    const equipo = document.getElementById("modal-equipo").dataset.equipoActual;
    const disciplina = document.getElementById("masiva-disciplina-select").value;
    const textoBruto = document.getElementById("masiva-nombres-input").value;
  
    const lineas = textoBruto.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lineas.length === 0) return mostrarToast("Ingresa al menos un nombre para cargar.", "warning");
  
    const nuevosRegistros = lineas.map((nombre, idx) => ({
      id: "JUG-" + Date.now() + "-" + idx, nombre: nombre, equipo: equipo, disciplinas: disciplina
    }));
  
    const { error } = await dbClient.from('jugadores').insert(nuevosRegistros);
    if (error) mostrarToast("Error al cargar masivamente: " + error.message, "error");
    else {
      mostrarToast(`¡Se registraron ${nuevosRegistros.length} jugadores en ${disciplina}!`, "success");
      cerrarModalCargaMasiva();
      await cargarDatos();
      abrirModalEquipo(equipo);
    }
  }
  
  function eliminarJugador(idJugador, nombreJugador) {
    if (!esModoEditor && !esModoSuperAdmin) return mostrarToast("Acceso denegado.", "error");
    mostrarConfirmacion(`¿Estás seguro de eliminar a "${nombreJugador}" de la base de datos?`, async () => {
      const equipoActual = document.getElementById("modal-equipo").dataset.equipoActual;
      const { error } = await dbClient.from('jugadores').delete().eq('id', idJugador);
      if (error) mostrarToast("Error al eliminar jugador: " + error.message, "error");
      else {
        mostrarToast("Jugador eliminado.", "info");
        await cargarDatos();
        abrirModalEquipo(equipoActual);
      }
    });
  }
  
  function abrirFifaCard(jugadorNombre, equipoNombre) {
    const jugadorObj = jugadoresCache.find(j => j.nombre === jugadorNombre && j.equipo === equipoNombre) || {
      nombre: jugadorNombre, equipo: equipoNombre, disciplinas: "Futsal, Fútbol de Campo"
    };
  
    const logoUrl = generarLogoDataURL(equipoNombre, 48);
    let golesTotales = 0, amarillas = 0, rojas = 0;
  
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
        <div class="fifa-card-header"><div class="fifa-ovr">${ovr}</div><img src="${logoUrl}" alt="${equipoNombre}" style="width:48px; height:48px; border-radius:50%; border:2px solid #d4af37;"></div>
        <div class="fifa-card-name">${escaparHTML(jugadorNombre)}</div>
        <div class="fifa-card-team">🛡️ ${renderizarNombreVisible(equipoNombre)}</div>
        <div class="fifa-disciplinas">${badgesDiscs}</div>
        <div class="fifa-stats-grid">
          <div class="fifa-stat-item"><span class="fifa-stat-value">⚽ ${golesTotales}</span><span class="fifa-stat-label">Goles</span></div>
          <div class="fifa-stat-item"><span class="fifa-stat-value">⭐ ${mvps}</span><span class="fifa-stat-label">MVPs</span></div>
          <div class="fifa-stat-item"><span class="fifa-stat-value">🟨 ${amarillas}</span><span class="fifa-stat-label">Amarillas</span></div>
          <div class="fifa-stat-item"><span class="fifa-stat-value">🟥 ${rojas}</span><span class="fifa-stat-label">Rojas</span></div>
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
  
  function filtrarPlantillaModalEquipo() {
    const nombreEquipo = document.getElementById("modal-equipo").dataset.equipoActual;
    const filtroDisc = document.getElementById("modal-equipo-filtro-disciplina").value;
    const jugadoresEquipo = jugadoresCache.filter(j => j.equipo === nombreEquipo);
    const disciplinasList = ["Futsal Masculino", "Futsal Femenino", "Fútbol de Campo Masculino", "Fútbol de Campo Femenino", "Volley Mixto", "Pikivoley Masculino", "Clash Royale"];
    
    let htmlJugadores = "";
    disciplinasList.forEach(disc => {
      if (filtroDisc !== "TODAS" && filtroDisc !== disc) return;
      const jugDisc = jugadoresEquipo.filter(j => j.disciplinas && j.disciplinas.includes(disc));
      let icono = "⚽";
      if (disc.includes("Volley") || disc.includes("Vóley")) icono = "🏐";
      if (disc.includes("Pikivoley")) icono = "🦶🏐";
      if (disc.includes("Clash")) icono = "🎮";
  
      htmlJugadores += `<h5 style="color:#d4af37; margin:15px 0 6px 0;">${icono} ${disc} (${jugDisc.length})</h5>`;
  
      if (jugDisc.length === 0) {
        htmlJugadores += `<p style="font-size:12px; color:#666; margin:0 0 10px 0;">Sin jugadores inscritos en esta disciplina.</p>`;
      } else {
        jugDisc.forEach(j => {
          htmlJugadores += `
            <div class="jugador-item-row">
              <span class="jugador-nombre-click" onclick="abrirFifaCard('${escaparHTML(j.nombre)}', '${nombreEquipo}')">👤 ${escaparHTML(j.nombre)}</span>
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
  }
  
  // ============================================================
  // REACCIONES Y CELEBRACIONES EN VIVO
  // ============================================================
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
  
  // ============================================================
  // MURO DE COMENTARIOS Y BARRA DE APOYO
  // ============================================================
  const COMENTARIO_VIDA_MS = 10 * 60 * 1000;
  
  async function enviarComentario() {
    const input = document.getElementById("comentario-input");
    const mensaje = input.value.trim();
  
    if (!mensaje) return;
    if (mensaje.length > 200) return mostrarToast("El comentario no puede superar 200 caracteres.", "warning");
  
    const idGenerado = "COM-" + Date.now();
    const { error } = await dbClient.from('comentarios').insert([{ id: idGenerado, mensaje: mensaje }]);
  
    if (error) mostrarToast("Error al enviar comentario: " + error.message, "error");
    else { input.value = ""; cargarDatos(); }
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
          <button class="btn-apoyo" ${yaVoto ? 'disabled' : ''} onclick="votarApoyo('${idPartido}', 'A')"><span>👊 ${renderizarNombreVisible(equipoA)}</span><b>${pctA}%</b></button>
          <button class="btn-apoyo" ${yaVoto ? 'disabled' : ''} onclick="votarApoyo('${idPartido}', 'B')"><span>${renderizarNombreVisible(equipoB)} 👊</span><b>${pctB}%</b></button>
        </div>
        <small class="apoyo-total">${total} voto${total === 1 ? '' : 's'}${yaVoto ? ' · ¡ya votaste!' : ''}</small>
      </div>
    `;
  }
  
  async function votarApoyo(idPartido, lado) {
    if (localStorage.getItem('voto_apoyo_' + idPartido)) return mostrarToast("Ya emitiste tu voto de apoyo en este partido.", "info");
  
    const idNuevo = 'APOYO-' + new Date().getTime();
    const { error } = await dbClient.from('apoyos').insert([{ id: idNuevo, id_partido: idPartido, equipo: lado }]);
  
    if (error) mostrarToast('Error al registrar voto: ' + error.message, "error");
    else {
      localStorage.setItem('voto_apoyo_' + idPartido, lado);
      mostrarToast("¡Voto registrado!", "success");
      cargarDatos();
    }
  }
  
  // ============================================================
  // GESTIÓN DE SPONSORS Y QUINIELA
  // ============================================================
  async function toggleSponsorsVisibles() {
    if (!esModoSuperAdmin) return mostrarToast("Acceso exclusivo para SuperAdmin.", "error");
  
    const nuevoEstado = !sponsorsVisibles;
    sponsorsVisibles = nuevoEstado;
    renderizarCarruselSponsors();
  
    const { error } = await dbClient.from('config_accesos').upsert({ clave_id: 'sponsors_visible', valor: String(nuevoEstado), updated_at: new Date().toISOString() }, { onConflict: 'clave_id' });
  
    if (error) mostrarToast("Error al guardar preferencia de sponsors: " + error.message, "error");
    else mostrarToast(`Carrusel de Auspiciantes ${nuevoEstado ? 'activado' : 'ocultado'} para todos.`, "success");
  }
  
  function abrirModalGestionarSponsors() {
    if (!esModoSuperAdmin) return mostrarToast("Acceso exclusivo para el SuperAdmin.", "error");
    document.getElementById("sponsor-edit-id").value = "";
    document.getElementById("sponsor-nombre-input").value = "";
    document.getElementById("sponsor-subtitulo-input").value = "";
    document.getElementById("sponsor-icono-input").value = "🏪";
    document.getElementById("titulo-form-sponsor").innerText = "➕ Agregar Nuevo Sponsor";
  
    renderizarListaSponsorsGestion();
    document.getElementById("modal-gestionar-sponsors").style.display = "block";
    bloquearScrollFondo();
  }
  
  function cerrarModalGestionarSponsors() { document.getElementById("modal-gestionar-sponsors").style.display = "none"; liberarScrollFondo(); }
  
  function renderizarListaSponsorsGestion() {
    const container = document.getElementById("lista-sponsors-gestion");
    if (!container) return;
    if (!sponsorsCache || sponsorsCache.length === 0) {
      container.innerHTML = `<p style="color:#aaa; font-size:12px;">No hay auspiciadores cargados aún.</p>`;
      return;
    }
    let html = "";
    sponsorsCache.forEach(sp => {
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#111; padding:8px 12px; border-radius:6px; margin-bottom:6px; border:1px solid #222;">
          <div><b>${sp.icono || '🏪'} ${escaparHTML(sp.nombre)}</b><span style="font-size:11px; color:#aaa; display:block;">${escaparHTML(sp.subtitulo || '')}</span></div>
          <div style="display:flex; gap:6px;">
            <button style="background:none; border:none; cursor:pointer; font-size:14px;" onclick="cargarSponsorParaEditar('${sp.id}')" title="Editar">✏️</button>
            <button style="background:none; border:none; cursor:pointer; font-size:14px;" onclick="eliminarSponsorDinamico('${sp.id}')" title="Eliminar">🗑️</button>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }
  
  function cargarSponsorParaEditar(idSponsor) {
    const sp = sponsorsCache.find(s => s.id === idSponsor);
    if (!sp) return;
    document.getElementById("sponsor-edit-id").value = sp.id;
    document.getElementById("sponsor-nombre-input").value = sp.nombre;
    document.getElementById("sponsor-subtitulo-input").value = sp.subtitulo || '';
    document.getElementById("sponsor-icono-input").value = sp.icono || '🏪';
    document.getElementById("titulo-form-sponsor").innerText = "✏️ Editar Sponsor";
  }
  
  async function guardarSponsorDinamico() {
    if (!esModoSuperAdmin) return;
    const id = document.getElementById("sponsor-edit-id").value;
    const nombre = document.getElementById("sponsor-nombre-input").value.trim();
    const subtitulo = document.getElementById("sponsor-subtitulo-input").value.trim();
    const icono = document.getElementById("sponsor-icono-input").value.trim() || "🏪";
  
    if (!nombre) return mostrarToast("Ingrese el nombre del sponsor.", "warning");
  
    if (id) {
      const { error } = await dbClient.from('sponsors').update({ nombre, subtitulo, icono }).eq('id', id);
      if (error) mostrarToast("Error: " + error.message, "error"); else mostrarToast("Sponsor actualizado.", "success");
    } else {
      const idNuevo = "SPON-" + Date.now();
      const { error } = await dbClient.from('sponsors').insert([{ id: idNuevo, nombre, subtitulo, icono }]);
      if (error) mostrarToast("Error: " + error.message, "error"); else mostrarToast("Sponsor registrado correctamente.", "success");
    }
  
    document.getElementById("sponsor-edit-id").value = "";
    document.getElementById("sponsor-nombre-input").value = "";
    document.getElementById("sponsor-subtitulo-input").value = "";
    document.getElementById("titulo-form-sponsor").innerText = "➕ Agregar Nuevo Sponsor";
    await cargarDatos();
    renderizarListaSponsorsGestion();
  }
  
  function eliminarSponsorDinamico(idSponsor) {
    if (!esModoSuperAdmin) return;
    mostrarConfirmacion("¿Desea eliminar este auspiciador de la lista?", async () => {
      const { error } = await dbClient.from('sponsors').delete().eq('id', idSponsor);
      if (error) mostrarToast("Error: " + error.message, "error");
      else { mostrarToast("Sponsor eliminado.", "info"); await cargarDatos(); renderizarListaSponsorsGestion(); }
    });
  }
  
  function renderizarCarruselSponsors() {
    const el = document.getElementById("sponsor-carousel");
    const track = document.getElementById("sponsor-track-content") || document.querySelector(".sponsor-track");
    if (!el || !track) return;
    el.style.display = sponsorsVisibles ? "block" : "none";
  
    if (sponsorsCache && sponsorsCache.length > 0) {
      let html = "";
      sponsorsCache.forEach(sp => {
        html += `<div class="sponsor-card"><b>${sp.icono || '🏪'} ${escaparHTML(sp.nombre)}</b><span>${escaparHTML(sp.subtitulo || 'Auspiciador Oficial')}</span></div>`;
      });
      track.innerHTML = html;
    } else {
      track.innerHTML = `
        <div class="sponsor-card">🏪 <b>Bodega Central</b><span>Auspiciador Oficial</span></div>
        <div class="sponsor-card">🖨️ <b>Copiprint Santaní</b><span>Impresiones & Diseño</span></div>
        <div class="sponsor-card">🏋️ <b>Gym Filo Fitness</b><span>Entrenamiento Deportivo</span></div>
        <div class="sponsor-card">🍔 <b>Burger House Santaní</b><span>Gastronomía Local</span></div>
      `;
    }
  }
  
  // Formularios Quiniela
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
    selCurso.innerHTML = opciones; selFutsal.innerHTML = opciones; selFutbol.innerHTML = opciones;
    selVoley.innerHTML = opciones; selPiki.innerHTML = opciones; selGeneral.innerHTML = opciones;
    selCurso.dataset.cargado = 'true';
  
    if (localStorage.getItem('ya_predije')) document.getElementById('quiniela-msj').innerText = 'Ya enviaste tu predicción desde este dispositivo. ¡Suerte!';
  }
  
  async function enviarPrediccion() {
    const nombre = document.getElementById("quiniela-nombre").value.trim();
    const curso = document.getElementById("quiniela-curso").value;
    const predFutsal = document.getElementById("quiniela-pred-futsal").value;
    const predFutbol = document.getElementById("quiniela-pred-futbol").value;
    const predVoley = document.getElementById("quiniela-pred-voley").value;
    const predPiki = document.getElementById("quiniela-pred-pikivoley").value;
    const predGeneral = document.getElementById("quiniela-pred-general").value;
  
    if (!nombre) return mostrarToast("Por favor ingresá tu nombre.", "warning");
    if (localStorage.getItem('ya_predije')) return mostrarToast("Ya enviaste tu predicción desde este dispositivo.", "info");
  
    const { data: existentes } = await dbClient.from('predicciones').select('id').ilike('nombre', nombre);
    if (existentes && existentes.length > 0) return mostrarToast("Ya existe una predicción con ese nombre.", "warning");
  
    const idGenerado = "PRED-" + Date.now();
    const { error } = await dbClient.from('predicciones').insert([{
      id: idGenerado, nombre: nombre, curso: curso, pred_futsal: predFutsal, pred_futbol: predFutbol,
      pred_voley: predVoley, pred_pikivoley: predPiki, pred_general: predGeneral
    }]);
  
    if (error) mostrarToast("Error: " + error.message, "error");
    else {
      localStorage.setItem('ya_predije', 'true');
      mostrarToast("¡Predicción registrada! Buena suerte 🎯", "success");
      cargarDatos();
    }
  }
  
  function obtenerCampeonDisciplina(disciplina) {
    const partidos = datosTorneo.partidos.filter(p => normalizarTexto(p.disciplina) === normalizarTexto(disciplina));
    const finalMatch = partidos.find(p => { const f = normalizarTexto(p.fase); return f.includes('final') && !f.includes('semi'); });
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
        <td class="celda-desplegar">▾</td><td><b>#${index + 1}</b></td><td>${escaparHTML(r.nombre)}</td><td>${renderizarNombreVisible(r.curso)}</td>
        <td><b style="color:#d4af37;">${r.aciertos} / 5</b></td><td style="color:#aaa; font-size:12px;">${r.fecha}</td>
        <td class="solo-superadmin-celda"><button class="btn-eliminar-fila" onclick="event.stopPropagation(); eliminarPrediccion('${r.id}')" title="Eliminar predicción">🗑️</button></td>
      </tr>`;
  
      html += `<tr id="${filaId}" class="fila-detalle-prediccion" style="display:none;"><td colspan="7"><div class="detalle-prediccion-box">`;
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
  
    html += `</tbody></table></div>`;
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
  
  // ============================================================
  // SANCIONES Y E-SPORTS
  // ============================================================
  function abrirModalSancionManual() {
    if (!esModoSuperAdmin) return mostrarToast("Función exclusiva del SuperAdmin.", "error");
    const selEquipo = document.getElementById("sancion-jugador-equipo");
    selEquipo.innerHTML = "";
    CURSOS_EQUIPOS.forEach(c => { selEquipo.innerHTML += `<option value="${c}">${renderizarNombreVisible(c)}</option>`; });
  
    document.getElementById("sancion-jugador-nombre").value = "";
    document.getElementById("modal-sancion-manual").style.display = "block";
    bloquearScrollFondo();
  }
  
  function cerrarModalSancionManual() {
    document.getElementById("modal-sancion-manual").style.display = "none";
    liberarScrollFondo();
  }
  
  async function guardarSancionManual() {
    if (!esModoSuperAdmin) return;
    const nombre = document.getElementById("sancion-jugador-nombre").value.trim();
    const equipo = document.getElementById("sancion-jugador-equipo").value;
    const motivo = document.getElementById("sancion-motivo").value;
  
    if (!nombre) return mostrarToast("Ingrese el nombre del jugador.", "warning");
  
    const idNuevo = "SAN-" + Date.now();
    const { error } = await dbClient.from('sanciones_manuales').insert([{ id: idNuevo, jugador_nombre: nombre, curso_equipo: equipo, motivo: motivo }]);
  
    if (error) mostrarToast("Error al registrar sanción: " + error.message, "error");
    else {
      mostrarToast("Sanción disciplinaria registrada.", "success");
      cerrarModalSancionManual();
      cargarDatos();
    }
  }
  
  function renderizarSuspendidos() {
    const container = document.getElementById("suspendidos-content");
    if (!container) return;
  
    const conteo = {};
    datosTorneo.incidencias.forEach(inc => {
      if (inc.tipo_evento === 'Tarjeta Roja') {
        const clave = `${inc.jugador_nombre}|${inc.curso_equipo || ''}`;
        if (!conteo[clave]) conteo[clave] = { jugador: inc.jugador_nombre, equipo: inc.curso_equipo || '', motivo: "Tarjeta Roja Directa en Encuentro" };
      }
    });
  
    sancionesManualesCache.forEach(s => {
      const clave = `${s.jugador_nombre}|${s.curso_equipo || ''}`;
      conteo[clave] = { jugador: s.jugador_nombre, equipo: s.curso_equipo || '', motivo: s.motivo || "Sanción Disciplinaria Manual", idSancion: s.id };
    });
  
    const suspendidos = Object.values(conteo);
    if (suspendidos.length === 0) {
      container.innerHTML = `<p style="color:#aaa;">No hay jugadores suspendidos registrados por el momento.</p>`;
      return;
    }
  
    let html = `<div style="overflow-x:auto;"><table class="tabla-deportiva"><thead><tr><th>Jugador</th><th>Curso / Equipo</th><th>Motivo de la Suspensión</th><th class="solo-superadmin-celda"></th></tr></thead><tbody>`;
    suspendidos.forEach(j => {
      html += `
        <tr>
          <td><b class="jugador-nombre-click" onclick="abrirFifaCard('${escaparHTML(j.jugador)}', '${j.equipo}')">${escaparHTML(j.jugador)}</b></td>
          <td>${renderizarLogoHTML(j.equipo, 20)} ${renderizarNombreVisible(j.equipo)}</td>
          <td style="color:#ef4444; font-weight:bold;">${escaparHTML(j.motivo)}</td>
          <td class="solo-superadmin-celda">${j.idSancion ? `<button class="btn-eliminar-fila" onclick="eliminarSancionManual('${j.idSancion}')" title="Levantar Sanción">🗑️</button>` : ''}</td>
        </tr>
      `;
    });
  
    html += `</tbody></table></div>`;
    container.innerHTML = html;
  }
  
  async function eliminarSancionManual(idSancion) {
    if (!esModoSuperAdmin) return;
    mostrarConfirmacion("¿Desea levantar esta sanción disciplinaria manual?", async () => {
      const { error } = await dbClient.from('sanciones_manuales').delete().eq('id', idSancion);
      if (error) mostrarToast("Error: " + error.message, "error");
      else { mostrarToast("Sanción levantada.", "info"); cargarDatos(); }
    });
  }
  
  function abrirModalJugadorClashRoyale(jugadorObj = null) {
    if (!esModoSuperAdmin) return mostrarToast("Función exclusiva del SuperAdmin.", "error");
  
    const selEquipo = document.getElementById("clash-jugador-equipo");
    selEquipo.innerHTML = "";
    CURSOS_EQUIPOS.forEach(c => { selEquipo.innerHTML += `<option value="${c}">${renderizarNombreVisible(c)}</option>`; });
  
    if (jugadorObj) {
      document.getElementById("titulo-modal-clash-jugador").innerText = "✏️ Editar Jugador de Clash Royale";
      document.getElementById("clash-jugador-id").value = jugadorObj.id;
      document.getElementById("clash-jugador-nombre").value = jugadorObj.nombre;
      selEquipo.value = jugadorObj.equipo;
    } else {
      document.getElementById("titulo-modal-clash-jugador").innerText = "🎮 Registrar Jugador de Clash Royale";
      document.getElementById("clash-jugador-id").value = "";
      document.getElementById("clash-jugador-nombre").value = "";
    }
    document.getElementById("modal-clash-jugador").style.display = "block";
    bloquearScrollFondo();
  }
  
  function cerrarModalJugadorClashRoyale() {
    document.getElementById("modal-clash-jugador").style.display = "none";
    liberarScrollFondo();
  }
  
  async function guardarJugadorClashRoyale() {
    if (!esModoSuperAdmin) return;
    const id = document.getElementById("clash-jugador-id").value;
    const nombre = document.getElementById("clash-jugador-nombre").value.trim();
    const equipo = document.getElementById("clash-jugador-equipo").value;
  
    if (!nombre) return mostrarToast("Ingrese el nombre del jugador.", "warning");
  
    if (id) {
      const { error } = await dbClient.from('jugadores').update({ nombre, equipo, disciplinas: "Clash Royale" }).eq('id', id);
      if (error) mostrarToast("Error: " + error.message, "error"); else mostrarToast("Jugador eSports actualizado.", "success");
    } else {
      const idNuevo = "CR-" + Date.now();
      const { error } = await dbClient.from('jugadores').insert([{ id: idNuevo, nombre, equipo, disciplinas: "Clash Royale" }]);
      if (error) mostrarToast("Error: " + error.message, "error"); else mostrarToast("Jugador eSports registrado.", "success");
    }
  
    cerrarModalJugadorClashRoyale();
    cargarDatos();
  }
  
  function renderizarEstadisticasClashRoyale() {
    const container = document.getElementById("clashroyale-stats-content");
    if (!container) return;
  
    const jugadoresCR = jugadoresCache.filter(j => j.disciplinas && j.disciplinas.includes("Clash Royale"));
    if (jugadoresCR.length === 0) {
      container.innerHTML = `<p style="color:#aaa;">No hay participantes registrados para Clash Royale aún.</p>`;
      return;
    }
  
    let html = `<div style="overflow-x:auto;"><table class="tabla-deportiva"><thead><tr><th>Pos.</th><th>Participante</th><th>Curso / Equipo</th><th>Coronas / Pts</th><th class="solo-superadmin-celda">Acciones (SuperAdmin)</th></tr></thead><tbody>`;
  
    jugadoresCR.forEach((j, index) => {
      let coronas = 0;
      datosTorneo.incidencias.forEach(inc => {
        if (inc.jugador_nombre === j.nombre && (inc.tipo_evento === 'Gol' || inc.tipo_evento === 'Corona')) coronas++;
      });
  
      html += `
        <tr>
          <td><b>#${index + 1}</b></td>
          <td><b class="jugador-nombre-click" onclick="abrirFifaCard('${escaparHTML(j.nombre)}', '${j.equipo}')">🎮 ${escaparHTML(j.nombre)}</b></td>
          <td>${renderizarLogoHTML(j.equipo, 20)} ${renderizarNombreVisible(j.equipo)}</td>
          <td><b style="color:#d4af37;">${coronas} 👑</b></td>
          <td class="solo-superadmin-celda">
            <button style="background:none; border:none; cursor:pointer; font-size:14px;" onclick='abrirModalJugadorClashRoyale(${JSON.stringify(j).replace(/"/g, "&quot;")})' title="Editar">✏️</button>
            <button style="background:none; border:none; cursor:pointer; font-size:14px;" onclick="eliminarJugador('${j.id}', '${escaparHTML(j.nombre)}')" title="Eliminar">🗑️</button>
          </td>
        </tr>
      `;
    });
  
    html += `</tbody></table></div>`;
    container.innerHTML = html;
  }