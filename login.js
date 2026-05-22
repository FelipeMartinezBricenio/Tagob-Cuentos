// js/login.js

// Configuración Maestra de Credenciales, Destinos y Audios de Bienvenida
const CONFIG_PERFILES = {
    "Papá":   { pin: "0203", url: "papa.html", audio: "audios/papa.mp3" },
    "Thommy": { pin: "0208", url: "hijos.html?usuario=Thommy", audio: "audios/thommy.mp3" },
    "Alma":   { pin: "1111", url: "hijos.html?usuario=Alma", audio: "audios/alma.mp3" }
};

let usuarioSeleccionado = "";
let pinAcumulado = "";

document.addEventListener('DOMContentLoaded', () => {
    verificarFotosPersonalizadas();
    asignarEventosTactilesTarjetas();
});

// NUEVA FUNCIÓN: Asegura que en celulares el toque del dedo abra el modal al instante
function asignartEventosTactilesTarjetas() {
    // Buscamos todas las tarjetas de usuario configuradas
    Object.keys(CONFIG_PERFILES).forEach(nombre => {
        // Buscamos el contenedor o tarjeta que tenga el texto o ID del usuario
        // Nota: Si tus tarjetas en el HTML tienen un ID específico como "tarjeta-Thommy", puedes usarlo aquí.
        const tarjeta = document.getElementById(`tarjeta-${nombre}`) || document.querySelector(`[onclick*="${nombre}"]`);
        
        if (tarjeta) {
            // Escuchamos el toque del dedo en móviles para que no se congele
            tarjeta.addEventListener('touchstart', (e) => {
                // Evita que se duplique el evento si el celular detecta touch y click al mismo tiempo
                e.preventDefault(); 
                window.abrirLoginPIN(nombre);
            }, { passive: false });
        }
    });
}

// Función de respaldo para fotos de Supabase
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

// CONTROL DEL MODAL DE ACCESO TÁCTIL (Optimizado para verse en celulares)
window.abrirLoginPIN = function(usuario) {
    usuarioSeleccionado = usuario;
    pinAcumulado = "";
    
    const txtNombre = document.getElementById('nombreUsuarioCambiante');
    const modal = document.getElementById('modalPin');
    
    if (txtNombre) txtNombre.innerText = usuario;
    
    if (modal) {
        // Forzamos a que el modal se muestre arriba de todo en la pantalla del celular
        modal.style.display = 'flex';
        modal.style.zIndex = '99999'; 
        
        // Desplazar la pantalla hacia arriba automáticamente para que el teclado no quede cortado abajo
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    actualizarPuntosVisuales();
};

window.cerrarModalPin = function() {
    const modal = document.getElementById('modalPin');
    if (modal) modal.style.display = 'none';
    pinAcumulado = "";
};

window.presionarNumero = function(num) {
    if (pinAcumulado.length < 4) {
        pinAcumulado += num;
        actualizarPuntosVisuales();
        
        if (pinAcumulado.length === 4) {
            setTimeout(verificarPIN, 200);
        }
    }
};

window.borrarUltimo = function() {
    if (pinAcumulado.length > 0) {
        pinAcumulado = pinAcumulado.slice(0, -1);
        actualizarPuntosVisuales();
    }
};

function actualizarPuntosVisuales() {
    for (let i = 0; i < 4; i++) {
        const punto = document.getElementById(`p${i}`);
        if (punto) {
            if (i < pinAcumulado.length) {
                punto.classList.add('activo');
            } else {
                punto.classList.remove('activo');
            }
        }
    }
}

// COMPARADOR DE SEGURIDAD CON REPRODUCTOR DE AUDIO
function verificarPIN() {
    const datosUser = CONFIG_PERFILES[usuarioSeleccionado];
    const tituloModal = document.getElementById('modalTitulo');
    
    if (datosUser && pinAcumulado === datosUser.pin) {
        if (tituloModal) tituloModal.innerText = "✨ ¡PIN Correcto! ✨";
        
        const sonidoBienvenida = new Audio(datosUser.audio);
        
        sonidoBienvenida.play().then(() => {
            sonidoBienvenida.onended = () => {
                window.location.href = datosUser.url;
            };
            
            // Si el audio es largo, avanza a los 3.5 segundos máximo
            setTimeout(() => {
                window.location.href = datosUser.url;
            }, 3500);

        }).catch((error) => {
            // Si el móvil bloquea el auto-play de audio por seguridad, redirige de inmediato
            console.log("Audio bloqueado por el navegador móvil, redirigiendo...", error);
            window.location.href = datosUser.url;
        });

    } else {
        alert("❌ PIN incorrecto para " + usuarioSeleccionado + ". Intenta de nuevo.");
        pinAcumulado = "";
        actualizarPuntosVisuales();
    }
}