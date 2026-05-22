// js/login.js

// Configuración Maestra de Credenciales y Destinos de Redirección
const CONFIG_PERFILES = {
    "Papá":   { pin: "0203", url: "papa.html" },
    "Thommy": { pin: "0208", url: "hijos.html?usuario=Thommy" },
    "Alma":   { pin: "1111", url: "hijos.html?usuario=Alma" }
};

document.addEventListener('DOMContentLoaded', () => {
    verificarFotosPersonalizadas();
});

// FUNCIÓN PRINCIPAL: Abre la ventana nativa clásica para escribir la clave
window.abrirLoginPIN = function(usuario) {
    const datosUser = CONFIG_PERFILES[usuario];
    if (!datosUser) return;

    // Abre el prompt nativo del sistema
    const pinIngresado = prompt(`🔑 Ingresa el PIN de acceso para ${usuario}:`);

    // Si el usuario cancela o lo deja vacío, no hace nada
    if (pinIngresado === null) return;

    // Validación de la clave
    if (pinIngresado === datosUser.pin) {
        // Redirección INSTANTÁNEA a la vista correspondiente
        window.location.href = datosUser.url;
    } else {
        alert(`❌ PIN incorrecto para ${usuario}. Intenta de nuevo.`);
    }
};

// Función opcional de respaldo para fotos de Supabase
async function verificarFotosPersonalizadas() {
    const supabase = window.supabaseClient;
    if (!supabase) return;

    try {
        const { data: perfiles, error } = await supabase.from('perfiles').select('nombre, foto_url');
        if (error) throw error;

        if (perfiles && perfiles.length > 0) {
            perfiles.forEach(p => {
                const contenedor = document.getElementById(`foto-${p.nombre}`);
                if (contenedor && p.foto_url) {
                    contenedor.innerHTML = `<img src="${p.foto_url}" alt="${p.nombre}">`;
                }
            });
        }
    } catch (err) {
        console.log("Usando las imágenes predeterminadas de la carpeta local.");
    }
}