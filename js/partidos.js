// ============================================================
// MESA DE CONTROL Y GESTIÓN DE PARTIDOS
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
      await dbClient.from('partidos').update({ goles_a: valA, goles_b: valB, estado: 'En Vivo' }).eq('id', idPartido);
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
      .insert([{ id: idGenerado, id_partido: idPartido, jugador_nombre: jugador, curso_equipo: equipo, tipo_evento: tipo }]);
  
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
  
    const { data: incidencias } = await dbClient.from('incidencias').select('*').eq('id_partido', idPartido);
  
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
        id: idReal, disciplina: disciplina, fase: fase, equipo_a: eqA, equipo_b: eqB,
        goles_a: gA, goles_b: gB, estado: 'Finalizado', definido_penales: esPenales, finalizado_at: ahoraIso
      }]);
    } else {
      await dbClient.from('partidos').update({
        goles_a: gA, goles_b: gB, estado: 'Finalizado', definido_penales: esPenales, finalizado_at: ahoraIso
      }).eq('id', idPartido);
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
  
      if (error) mostrarToast("Error al eliminar partido: " + error.message, "error");
      else {
        mostrarToast("Partido eliminado correctamente.", "info");
        cerrarModalAdmin();
        cargarDatos();
      }
    });
  }
  
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
      id: idNuevo, disciplina: disciplina, fase: fase, equipo_a: equipoA, equipo_b: equipoB,
      fecha_hora: fechaHoraRaw, orden: parseInt(orden), estado: 'Pendiente'
    }]);
  
    if (error) mostrarToast("Error: " + error.message, "error");
    else {
      cerrarModalCrearPartido();
      mostrarToast("Partido registrado con éxito.", "success");
      cargarDatos();
    }
  }
  
  async function cambiarEstadoPartido(nuevoEstado) {
    const idPartido = document.getElementById("admin-id-partido").value;
    const golesA = document.getElementById("goles-a").value;
    const golesB = document.getElementById("goles-b").value;
    const esPenales = document.getElementById("admin-penales").checked;
    const ahoraIso = new Date().toISOString();
  
    if (!idPartido) return;
  
    const partidoActual = datosTorneo.partidos.find(p => p.id === idPartido);
  
    // Si el partido ya existe en la base de datos (Actualización y Auditoría)
    if (partidoActual) {
      // 1. Creamos la "Foto" del estado ANTERIOR
      const valoresAnteriores = {
        estado: partidoActual.estado,
        goles_a: partidoActual.golesA,
        goles_b: partidoActual.golesB,
        finalizado_at: partidoActual.finalizadoAt,
        definido_penales: partidoActual.definidoPenales
      };
  
      // 2. Preparamos los datos nuevos
      const updateData = { 
        estado: nuevoEstado,
        goles_a: golesA !== "" ? parseInt(golesA) : 0,
        goles_b: golesB !== "" ? parseInt(golesB) : 0,
        definido_penales: esPenales,
        finalizado_at: nuevoEstado === 'Finalizado' ? ahoraIso : null
      };
  
      // 3. Hacemos el UPDATE en Supabase
      const { error: errUpdate } = await dbClient.from('partidos').update(updateData).eq('id', idPartido);
      if (errUpdate) return mostrarToast("Error al cambiar estado: " + errUpdate.message, "error");
  
      // 4. INYECTAMOS EL LOG DE AUDITORÍA
      await dbClient.from('auditoria').insert([{
        id: 'AUDIT-' + Date.now(),
        accion: 'Cambio de Estado/Marcador',
        detalle: `El partido pasó a estado: ${nuevoEstado} (${updateData.goles_a} - ${updateData.goles_b})`,
        tabla_afectada: 'partidos',
        registro_id: idPartido,
        valores_anteriores: valoresAnteriores,
        valores_nuevos: updateData,
        usuario: esModoSuperAdmin ? 'alucas' : 'Mesa de Control'
      }]);
  
    } else if (idPartido.startsWith("VIRTUAL-")) {
      // Si el partido proviene de un cruce virtual en los brackets (Creación nueva)
      const disciplina = document.getElementById("modal-partido-titulo").dataset.disciplina || "Futsal Masculino";
      const fase = document.getElementById("modal-partido-titulo").dataset.fase || "Semifinales";
      const eqA = document.getElementById("lbl-equipo-a").innerText;
      const eqB = document.getElementById("lbl-equipo-b").innerText;
  
      const idReal = "PAR-" + new Date().getTime();
      const payload = {
        id: idReal, disciplina: disciplina, fase: fase, equipo_a: eqA, equipo_b: eqB,
        goles_a: golesA !== "" ? parseInt(golesA) : 0, goles_b: golesB !== "" ? parseInt(golesB) : 0,
        estado: nuevoEstado, definido_penales: esPenales, finalizado_at: nuevoEstado === 'Finalizado' ? ahoraIso : null
      };
  
      const { error } = await dbClient.from('partidos').insert([payload]);
      if (error) return mostrarToast("Error al cambiar estado: " + error.message, "error");
      document.getElementById("admin-id-partido").value = idReal;
    }
  
    mostrarToast(`Estado cambiado a "${nuevoEstado}".`, "success");
    await cargarDatos();
  }
  
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
  
    if (!selVal) return mostrarToast("Seleccione un jugador para votar.", "warning");
  
    const p = datosTorneo.partidos.find(part => part.id === idPartido);
    const parts = selVal.split("|");
    const jugNombre = parts[0];
    const eqNombre = parts[1];
    const idNuevo = "MVP-" + Date.now();
  
    const { error } = await dbClient.from('votos_mvp').insert([{
      id: idNuevo, id_partido: idPartido, jugador_nombre: jugNombre, equipo: eqNombre, disciplina: p ? p.disciplina : "General"
    }]);
  
    if (error) mostrarToast("Error al registrar voto MVP: " + error.message, "error");
    else {
      localStorage.setItem('voto_mvp_' + idPartido, 'true');
      mostrarToast("¡Voto MVP registrado correctamente!", "success");
      cerrarModalVotarMvp();
      cargarDatos();
    }
  }