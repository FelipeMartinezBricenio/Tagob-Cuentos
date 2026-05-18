// js/login.js

// Función global que activan los botones del HTML
window.seleccionarUsuario = function(usuario) {
    document.getElementById('usuarioSeleccionado').value = usuario;
    
    // Marcar visualmente el botón seleccionado
    document.querySelectorAll('.avatar-btn').forEach(btn => btn.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    
    // Cambiar texto de ayuda y mostrar contenedor de clave
    const label = document.getElementById('labelClave');
    if(usuario === 'Papa') label.innerHTML = '🔑 Contraseña de Administrador (Papá):';
    if(usuario === 'Thommy') label.innerHTML = '🔑 Contraseña de Thommy:';
    if(usuario === 'Alma') label.innerHTML = '🔑 Contraseña de Alma:';
    
    document.getElementById('seccionClave').style.display = 'block';
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordInput').focus();
}

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const usuario = document.getElementById('usuarioSeleccionado').value;
    const clave = document.getElementById('passwordInput').value.trim();

    // AQUÍ COLOCAS LAS CONTRASEÑAS QUE TÚ QUIERAS ASIGNARLES
    if (usuario === 'Papa' && clave === '0203') {
        window.location.href = 'papa.html';
    } else if (usuario === 'Thommy' && clave === '0208') {
        window.location.href = 'hijos.html?usuario=Thommy';
    } else if (usuario === 'Alma' && clave === '1111') {
        window.location.href = 'hijos.html?usuario=Alma';
    } else {
        alert('❌ Contraseña incorrecta. Inténtalo de nuevo.');
    }
});