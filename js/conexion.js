// js/conexion.js
const SUPABASE_URL = "https://xfuyipynauqdbqamzvzh.supabase.co";
const SUPABASE_KEY = "sb_publishable_butEU7uDjycoQmtDp6PiSQ_DODyRhoO";

// Objeto global de conexión
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);