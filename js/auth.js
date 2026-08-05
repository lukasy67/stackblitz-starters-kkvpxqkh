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