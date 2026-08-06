// ============================================================
// ACCESO ORGANIZACIÓN Y ROLES
// ============================================================

function abrirModalLogin() {
    const userInput = document.getElementById("login-user-input");
    const passInput = document.getElementById("login-pass-input");
    if(userInput) userInput.value = "";
    if(passInput) passInput.value = "";
    
    document.getElementById("modal-login").style.display = "block";
    bloquearScrollFondo();
    if(userInput) userInput.focus();
  }
  
  function cerrarModalLogin() {
    document.getElementById("modal-login").style.display = "none";
    liberarScrollFondo();
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
  
  function actualizarBadgeRol(nombreUsuario = null) {
    const badge = document.getElementById("badge-modo-rol");
    if (!badge) return;
  
    if (esModoSuperAdmin) {
      badge.innerText = "👑 SuperAdmin";
      badge.style.display = "inline-block";
    } else if (esModoLogistica && esModoEditor) {
      badge.innerText = `🛡️ Staff: ${nombreUsuario}`;
      badge.style.display = "inline-block";
    } else if (esModoLogistica) {
      badge.innerText = `📋 Logística (${nombreUsuario || 'Mesa'})`;
      badge.style.display = "inline-block";
    } else if (esModoEditor) {
      badge.innerText = `✏️ Editor (${nombreUsuario || 'Nóminas'})`;
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
  }
  
  async function procesarLoginModal() {
    const user = document.getElementById("login-user-input").value.trim();
    const pass = document.getElementById("login-pass-input").value.trim();
    cerrarModalLogin();
  
    // Si ya hay alguien logueado, esto funciona como botón de CERRAR SESIÓN
    if (esModoLogistica || esModoSuperAdmin || esModoEditor) {
      esModoLogistica = false;
      esModoSuperAdmin = false;
      esModoEditor = false;
      document.body.classList.remove("modo-logistica", "modo-superadmin", "modo-editor");
      actualizarBadgeRol();
      mostrarToast("Sesión cerrada. Modo Espectador activado.", "info");
      cargarDatos();
      return;
    }
  
    if (!pass) return mostrarToast("Debes ingresar una contraseña.", "warning");
  
    // 1. OBTENER LAS CLAVES MAESTRAS DESDE SUPABASE
    const claveSuperAdmin = await obtenerClaveAcceso('superadmin', null);
    const claveLogistica = await obtenerClaveAcceso('logistica', null);
    const claveEditor = await obtenerClaveAcceso('editor', null);
  
    // 2. VERIFICAR ACCESO SUPERADMIN
    if (claveSuperAdmin && pass === claveSuperAdmin) {
      esModoSuperAdmin = true;
      esModoLogistica = true;
      esModoEditor = true;
      document.body.classList.add("modo-superadmin", "modo-logistica", "modo-editor");
      actualizarBadgeRol("SuperAdmin");
      mostrarToast("¡Modo Super Admin activado!", "success");
      cargarDatos();
      
      // Cargar el panel de auditoría exclusivo
      if(typeof cargarPanelAuditoria === 'function') cargarPanelAuditoria();
      return;
    }
  
    // 3. BUSCAR EN LA TABLA DE OPERADORES SECUNDARIOS (Usuarios dinámicos)
    if (user && pass) {
      const { data, error } = await dbClient
        .from('operadores')
        .select('*')
        .eq('usuario', user)
        .eq('password', pass)
        .single();
  
      if (data) {
        esModoLogistica = data.permisos.includes('Logistica');
        esModoEditor = data.permisos.includes('Editor');
        
        if (esModoLogistica) document.body.classList.add("modo-logistica");
        if (esModoEditor) document.body.classList.add("modo-editor");
        
        actualizarBadgeRol(data.usuario);
        mostrarToast(`¡Bienvenido, ${data.usuario}!`, "success");
        cargarDatos();
        return;
      }
    }
  
    // 4. VERIFICAR CLAVES GENÉRICAS (Mesa / Editor)
    if (claveLogistica && pass === claveLogistica) {
      esModoLogistica = true;
      document.body.classList.add("modo-logistica");
      actualizarBadgeRol("Mesa de Control");
      mostrarToast("¡Modo Logística activado!", "success");
      cargarDatos();
    } else if (claveEditor && pass === claveEditor) {
      esModoEditor = true;
      document.body.classList.add("modo-editor");
      actualizarBadgeRol("Editor de Nóminas");
      mostrarToast("¡Modo Editor activado!", "success");
      cargarDatos();
    } else {
      // Si la contraseña no coincide con nada en Supabase
      mostrarToast("Usuario o contraseña incorrectos.", "error");
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
  
  // ============================================================
  // AUDITORÍA Y GESTIÓN DE OPERADORES (EXCLUSIVO SUPERADMIN)
  // ============================================================
  
  async function cargarPanelAuditoria() {
    if (!esModoSuperAdmin) return;
    await Promise.all([cargarOperadores(), cargarHistorialAuditoria()]);
  }
  
  async function cargarOperadores() {
    const { data, error } = await dbClient.from('operadores').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error);
    
    let html = `<div style="overflow-x:auto;"><table class="tabla-deportiva" style="font-size:13px;"><thead><tr><th>Usuario</th><th>Permisos Otorgados</th><th>Fecha de Alta</th><th class="solo-superadmin-celda">Acción</th></tr></thead><tbody>`;
    
    (data || []).forEach(op => {
      const fecha = new Date(op.created_at).toLocaleDateString();
      const badges = op.permisos.map(p => `<span class="badge-rol">${p}</span>`).join(' ');
      
      html += `<tr>
        <td><b>${op.usuario}</b></td>
        <td>${badges || '<span style="color:#aaa">Sin permisos</span>'}</td>
        <td style="color:#aaa;">${fecha}</td>
        <td class="solo-superadmin-celda"><button class="btn-eliminar-fila" onclick="eliminarOperador('${op.id}')" title="Revocar Acceso">🗑️</button></td>
      </tr>`;
    });
    
    html += `</tbody></table></div>`;
    document.getElementById('lista-operadores').innerHTML = html;
  }
  
  async function guardarOperador() {
    const usuario = document.getElementById("operador-nombre").value.trim();
    const pass = document.getElementById("operador-pass").value.trim();
    const pLog = document.getElementById("perm-logistica").checked;
    const pEd = document.getElementById("perm-editor").checked;
  
    if (!usuario || !pass) return mostrarToast("Completa el usuario y la contraseña.", "warning");
    
    let permisos = [];
    if (pLog) permisos.push('Logistica');
    if (pEd) permisos.push('Editor');
  
    const { error } = await dbClient.from('operadores').insert([{ 
      id: 'OP-' + Date.now(), 
      usuario: usuario, 
      password: pass, 
      permisos: permisos 
    }]);
  
    if (error) return mostrarToast("Error al crear operador: " + error.message, "error");
    
    mostrarToast("Nuevo operador habilitado.", "success");
    document.getElementById("operador-nombre").value = "";
    document.getElementById("operador-pass").value = "";
    cargarOperadores();
  }
  
  async function eliminarOperador(id) {
    mostrarConfirmacion("¿Revocar el acceso a este operador?", async () => {
      await dbClient.from('operadores').delete().eq('id', id);
      mostrarToast("Acceso revocado.", "info");
      cargarOperadores();
    });
  }
  
  // === LÓGICA DE AUDITORÍA Y REVERSIÓN === //
  
  async function cargarHistorialAuditoria() {
    const { data, error } = await dbClient.from('auditoria').select('*').order('created_at', { ascending: false }).limit(25);
    if (error) return console.error(error);
  
    let html = `<div style="overflow-x:auto;"><table class="tabla-deportiva" style="font-size:12px;"><thead><tr><th>Fecha / Hora</th><th>Acción</th><th>Detalle</th><th>Usuario</th><th class="solo-superadmin-celda">Reversión Rápida</th></tr></thead><tbody>`;
    
    (data || []).forEach(log => {
      const fecha = new Date(log.created_at).toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'medium' });
      const deshabilitado = log.revertido ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : '';
      const txtBtn = log.revertido ? 'Anulado ✅' : '↩️ Anular Acción';
      const colorBtn = log.revertido ? 'background:#333; color:#aaa; border-color:#444;' : '';
      
      html += `<tr>
        <td style="color:#aaa;">${fecha}</td>
        <td style="color:#f59e0b; font-weight:bold;">${log.accion}</td>
        <td>${log.detalle}</td>
        <td><span class="badge-rol" style="background:#1f2937;">${log.usuario || 'Sistema'}</span></td>
        <td class="solo-superadmin-celda">
          <button class="btn-eliminar" style="margin:0; padding:6px 10px; font-size:11px; ${colorBtn}" onclick="revertirCambioAudit('${log.id}', '${log.tabla_afectada}', '${log.registro_id}')" ${deshabilitado}>${txtBtn}</button>
        </td>
      </tr>`;
    });
    
    html += `</tbody></table></div>`;
    document.getElementById('audit-log-content').innerHTML = html;
  }
  
  async function revertirCambioAudit(logId, tabla, registroId) {
    mostrarConfirmacion("⚠️ ¿Anular esta acción y restaurar la base de datos a su estado anterior?", async () => {
      
      // 1. Buscar la "foto" de cómo estaban los datos
      const { data: logData } = await dbClient.from('auditoria').select('valores_anteriores').eq('id', logId).single();
      
      if (!logData || !logData.valores_anteriores) {
        return mostrarToast("No se encontró el estado anterior para restaurar.", "error");
      }
  
      // 2. Restaurar los valores en la tabla original (Ej: volver a poner los goles anteriores)
      const { error: errRestaurar } = await dbClient.from(tabla).update(logData.valores_anteriores).eq('id', registroId);
      
      if (errRestaurar) {
        return mostrarToast("Error crítico al restaurar: " + errRestaurar.message, "error");
      }
  
      // 3. Marcar el log como "revertido" para que el botón se desactive
      await dbClient.from('auditoria').update({ revertido: true }).eq('id', logId);
      
      mostrarToast("¡Acción revertida! Base de datos restaurada.", "success");
      cargarDatos(); // Recargar toda la app
      cargarPanelAuditoria(); // Refrescar el log
    });
  }