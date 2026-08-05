// ============================================================
// GENERACIÓN DE LLAVES Y BRACKETS
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
  
  // ============================================================
  // FORMATOS CLASH ROYALE
  // ============================================================
  async function cambiarFormatoClashRoyale(formato, evt) {
    if (!esModoSuperAdmin) {
      mostrarToast("Solo el SuperAdmin puede cambiar el formato de la llave.", "error");
      return;
    }
  
    formatoClashRoyale = formato;
    const btnSingle = document.getElementById("btn-cr-single");
    const btnDouble = document.getElementById("btn-cr-double");
  
    if (btnSingle && btnDouble) {
      btnSingle.classList.toggle("active", formato === 'single');
      btnDouble.classList.toggle("active", formato === 'double');
    }
  
    const { error } = await dbClient
      .from('config_accesos')
      .upsert({ clave_id: 'clash_formato', valor: formato, updated_at: new Date().toISOString() }, { onConflict: 'clave_id' });
  
    if (error) {
      mostrarToast("Error al guardar formato: " + error.message, "error");
    } else {
      mostrarToast(`Formato cambiado a: ${formato === 'single' ? 'Eliminación Directa' : 'Doble Eliminación'}`, "success");
      renderizarClashRoyaleTab();
    }
  }
  
  function renderizarClashRoyaleTab() {
    const bracketContainer = document.getElementById("clashroyale-bracket");
    if (bracketContainer) {
      renderizarArbolClashRoyale("Clash Royale", "clashroyale-bracket", formatoClashRoyale);
    }
    renderizarEstadisticasClashRoyale();
  }
  
  function renderizarArbolClashRoyale(disciplina, containerId, modoFormat) {
    const container = document.getElementById(containerId);
    if (!container) return;
  
    const partidos = datosTorneo.partidos.filter(p => normalizarTexto(p.disciplina) === normalizarTexto(disciplina));
  
    const r1 = partidos.filter(p => {
      const f = normalizarTexto(p.fase);
      return (f.includes("ronda") || f.includes("cuartos") || f.includes("eliminatoria")) && !f.includes("losers") && !f.includes("perdedores");
    }).sort((a,b) => a.orden - b.orden);
  
    const semisBD = partidos.filter(p => normalizarTexto(p.fase).includes("semi") && !normalizarTexto(p.fase).includes("losers")).sort((a,b) => a.orden - b.orden);
    const finalBD = partidos.find(p => normalizarTexto(p.fase).includes("final") && !normalizarTexto(p.fase).includes("semi") && !normalizarTexto(p.fase).includes("losers"));
  
    const ganR1_0 = obtenerGanador(r1[0]);
    const ganR1_1 = obtenerGanador(r1);
  
    const semi1 = {
      id: semisBD[0] ? semisBD[0].id : `VIRTUAL-CR-SEMI-1`,
      fase: "Semifinales",
      disciplina: disciplina,
      equipoA: ganR1_0 || (semisBD[0] ? semisBD[0].equipoA : 'Por definir'),
      equipoB: ganR1_1 || (semisBD[0] ? semisBD[0].equipoB : 'Por definir'),
      golesA: semisBD[0] ? semisBD[0].golesA : '',
      golesB: semisBD[0] ? semisBD[0].golesB : '',
      estado: semisBD[0] ? semisBD[0].estado : 'Pendiente'
    };
  
    const ganSemi1 = obtenerGanador(semi1);
  
    const finalMatch = {
      id: finalBD ? finalBD.id : `VIRTUAL-CR-FINAL`,
      fase: "Final",
      disciplina: disciplina,
      equipoA: ganSemi1 || (finalBD ? finalBD.equipoA : 'Por definir'),
      equipoB: finalBD ? finalBD.equipoB : 'Por definir',
      golesA: finalBD ? finalBD.golesA : '',
      golesB: finalBD ? finalBD.golesB : '',
      estado: finalBD ? finalBD.estado : 'Pendiente'
    };
  
    const ganFinal = obtenerGanador(finalMatch);
    const campeonTexto = ganFinal ? `${renderizarLogoHTML(ganFinal, 28)} ${renderizarNombreVisible(ganFinal)}` : "Por Definir";
  
    let html = `<div class="bracket-tree-wrapper">`;
  
    html += `<div class="bracket-col"><div class="bracket-title">Cuadro Principal (Winners)</div>`;
    if (r1[0]) html += crearNodoHTML(r1[0]);
    html += `<div>${crearNodoHTML(semi1)}</div>`;
    html += `<div>${crearNodoHTML(finalMatch)}</div>`;
    html += `</div>`;
  
    if (modoFormat === 'double') {
      const losersBD = partidos.filter(p => normalizarTexto(p.fase).includes("losers") || normalizarTexto(p.fase).includes("perdedores")).sort((a,b) => a.orden - b.orden);
  
      const matchLosers1 = {
        id: losersBD[0] ? losersBD[0].id : `VIRTUAL-CR-LOSERS-1`,
        fase: "Ronda de Perdedores",
        disciplina: disciplina,
        equipoA: losersBD[0] ? losersBD[0].equipoA : 'Por definir',
        equipoB: losersBD[0] ? losersBD[0].equipoB : 'Por definir',
        golesA: losersBD[0] ? losersBD[0].golesA : '',
        golesB: losersBD[0] ? losersBD[0].golesB : '',
        estado: losersBD[0] ? losersBD[0].estado : 'Pendiente'
      };
  
      html += `<div class="bracket-col"><div class="bracket-losers-title">🔻 Cuadro de Perdedores (Losers)</div>`;
      html += `<div>${crearNodoHTML(matchLosers1)}</div>`;
      html += `</div>`;
    }
  
    html += `
      <div class="bracket-col">
        <div class="bracket-title">👑 Campeón eSports</div>
        <div class="champion-box">${campeonTexto}</div>
      </div>
    `;
  
    html += `</div>`;
    container.innerHTML = html;
  }