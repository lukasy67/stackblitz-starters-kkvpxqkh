// ============================================================
// INICIALIZACIÓN DE SUPABASE
// ============================================================
const SUPABASE_URL = "https://zkklifirmzvlwapivbrc.supabase.co";
const SUPABASE_KEY = "sb_publishable_Od54CMAGf_6wyGbeU-vvCw_FWzvrvbd";

// Inicializar cliente Supabase globalmente
const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);