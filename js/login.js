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
});

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

// CONTROL DEL MODAL DE ACCESO TÁCTIL
window.abrirLoginPIN = function(usuario) {
    usuarioSeleccionado = usuario;
    pinAcumulado = "";
    document.getElementById('nombreUsuarioCambiante').innerText = usuario;
    actualizarPuntosVisuales();
    document.getElementById('modalPin').style.display = 'flex';
};

window.cerrarModalPin = function() {
    document.getElementById('modalPin').style.display = 'none';
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
    
    if (datosUser && pinAcumulado === datosUser.pin) {
        // Ocultamos el teclado y avisamos que está ingresando
        document.getElementById('modalTitulo').innerText = "✨ ¡PIN Correcto! ✨";
        
        // Creamos el objeto de audio nativo apuntando a tu nueva carpeta
        const sonidoBienvenida = new Audio(datosUser.audio);
        
        // Intentamos reproducir el sonido
        sonidoBienvenida.play().then(() => {
            // Cuando el audio termine por completo, avanza de página automáticamente
            sonidoBienvenida.onended = () => {
                window.location.href = datosUser.url;
            };
            
            // Seguridad por si el audio dura demasiado (ej. más de 4 segundos), 
            // avanza de todos modos para que no se cansen de esperar.
            setTimeout(() => {
                window.location.href = datosUser.url;
            }, 4000);

        }).catch((error) => {
            // Si el navegador bloquea el audio por alguna restricción móvil, avanza sin trabarse
            console.log("El audio no pudo reproducirse, redirigiendo de inmediato...", error);
            window.location.href = datosUser.url;
        });

    } else {
        alert("❌ PIN incorrecto para " + usuarioSeleccionado + ". Intenta de nuevo.");
        pinAcumulado = "";
        actualizarPuntosVisuales();
    }
}