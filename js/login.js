// js/login.js

// Configuración Maestra de Credenciales, Destinos y Audios de Bienvenida
const CONFIG_PERFILES = {
    "Papá":   { pin: "0203", url: "papa.html", audio: "audios/papa.mp3" },
    "Thommy": { pin: "0208", url: "hijos.html?usuario=Thommy", audio: "audios/thommy.mp3" },
    "Alma":   { pin: "1111", url: "hijos.html?usuario=Alma", audio: "audios/alma.mp3" }
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
        
        // Intentar reproducir el audio de bienvenida
        const sonidoBienvenida = new Audio(datosUser.audio);
        
        sonidoBienvenida.play().then(() => {
            // Avanza de página cuando el audio termina por completo
            sonidoBienvenida.onended = () => {
                window.location.href = datosUser.url;
            };
            
            // Seguro por si el audio es muy largo, avanza máximo a los 3.5 segundos
            setTimeout(() => {
                window.location.href = datosUser.url;
            }, 3500);

        }).catch((error) => {
            // Si el navegador bloquea el auto-play del audio por seguridad móvil, avanza directo
            console.log("Audio omitido por restricciones de privacidad del navegador.");
            window.location.href = datosUser.url;
        });

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