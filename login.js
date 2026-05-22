// js/login.js

// Configuración Maestra de Credenciales, Destinos y Audios de Bienvenida
const CONFIG_PERFILES = {
    "Papá":   { pin: "0203", url: "papa.html", audio: "audios/papa.mp3" },
    "Thommy": { pin: "0208", url: "hijos.html?usuario=Thommy", audio: "audios/thommy.mp3" },
    "Alma":   { pin: "1111", url: "hijos.html?usuario=Alma", audio: "audios/alma.mp3" }
};

let usuarioSeleccionado = "";
let pinAcumulado = "";
let inputOcultoCelular = null;

document.addEventListener('DOMContentLoaded', () => {
    verificarFotosPersonalizadas();
    crearInputNumericoNativo();
});

// NUEVA FUNCIÓN: Crea un input invisible configurado para activar el teclado numérico del celular
function crearInputNumericoNativo() {
    inputOcultoCelular = document.createElement('input');
    
    // Estos atributos obligan al celular a abrir SOLO el teclado de números grandes
    inputOcultoCelular.type = 'text';
    inputOcultoCelular.inputMode = 'numeric';
    inputOcultoCelular.pattern = '[0-3]*';
    
    // Estilos para que no se vea en la pantalla pero siga operativo
    inputOcultoCelular.style.position = 'fixed';
    inputOcultoCelular.style.top = '-100px';
    inputOcultoCelular.style.left = '-100px';
    inputOcultoCelular.style.opacity = '0';
    inputOcultoCelular.style.zIndex = '-1';
    
    document.body.appendChild(inputOcultoCelular);

    // Escuchamos lo que se escribe en el teclado del celular
    inputOcultoCelular.addEventListener('input', (e) => {
        const valor = e.target.value;
        
        // Si el usuario borró caracteres con la tecla de retroceso
        if (valor.length < pinAcumulado.length) {
            pinAcumulado = valor;
            actualizarPuntosVisuales();
            return;
        }

        // Si introdujo un número, capturamos el último dígito
        if (valor.length > 0 && pinAcumulado.length < 4) {
            const ultimoDigito = valor.charAt(valor.length - 1);
            
            // Validamos que sea un número real
            if (/^[0-9]$/.test(ultimoDigito)) {
                pinAcumulado += ultimoDigito;
                actualizarPuntosVisuales();
                
                if (pinAcumulado.length === 4) {
                    // Quitamos el teclado de la pantalla cerrando el enfoque
                    inputOcultoCelular.blur();
                    setTimeout(verificarPIN, 200);
                }
            }
        }
        
        // Sincronizamos el input para evitar que se llene de texto infinito
        inputOcultoCelular.value = pinAcumulado;
    });
}

// CONTROL DEL MODAL DE ACCESO
window.abrirLoginPIN = function(usuario) {
    usuarioSeleccionado = usuario;
    pinAcumulado = "";
    
    if (inputOcultoCelular) {
        inputOcultoCelular.value = "";
    }
    
    const txtNombre = document.getElementById('nombreUsuarioCambiante');
    const modal = document.getElementById('modalPin');
    
    if (txtNombre) txtNombre.innerText = usuario;
    if (modal) {
        modal.style.display = 'flex';
        modal.style.zIndex = '99999';
    }
    
    actualizarPuntosVisuales();

    // LEVANTAR TECLADO CELULAR: Forzamos el enfoque inmediato al input numérico oculto
    if (inputOcultoCelular) {
        setTimeout(() => {
            inputOcultoCelular.focus();
        }, 100);
    }
};

window.cerrarModalPin = function() {
    const modal = document.getElementById('modalPin');
    if (modal) modal.style.display = 'none';
    pinAcumulado = "";
    if (inputOcultoCelular) inputOcultoCelular.blur();
};

// Mantenemos estas funciones por si usas la PC y das clics con el mouse en los botones de diseño celular
window.presionarNumero = function(num) {
    if (pinAcumulado.length < 4) {
        pinAcumulado += num;
        if (inputOcultoCelular) inputOcultoCelular.value = pinAcumulado;
        actualizarPuntosVisuales();
        
        if (pinAcumulado.length === 4) {
            setTimeout(verificarPIN, 200);
        }
    }
};

window.borrarUltimo = function() {
    if (pinAcumulado.length > 0) {
        pinAcumulado = pinAcumulado.slice(0, -1);
        if (inputOcultoCelular) inputOcultoCelular.value = pinAcumulado;
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
            
            setTimeout(() => {
                window.location.href = datosUser.url;
            }, 3500);

        }).catch((error) => {
            console.log("Audio omitido por restricciones del navegador, redirigiendo...", error);
            window.location.href = datosUser.url;
        });

    } else {
        alert("❌ PIN incorrecto para " + usuarioSeleccionado + ". Intenta de nuevo.");
        pinAcumulado = "";
        if (inputOcultoCelular) inputOcultoCelular.value = "";
        actualizarPuntosVisuales();
        
        // Reabre el teclado si fallan la contraseña
        if (inputOcultoCelular) inputOcultoCelular.focus();
    }
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