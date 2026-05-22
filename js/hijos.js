// js/hijos.js
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const lector = params.get('usuario') || 'Hijo';
    
    // =========================================================================
    // MODIFICACIÓN: DESBLOQUEO Y REPRODUCCIÓN DE AUDIO
    // Los navegadores móviles bloquean el audio automático hasta el primer toque.
    // Esta lógica asegura que el audio suene al hacer el primer clic.
    // =========================================================================
    const dispararAudioBienvenida = () => {
        if (lector && lector !== 'Hijo') {
            const audioBienvenida = new Audio(`audios/${lector.toLowerCase()}.mp3`);
            audioBienvenida.play().catch(e => console.log("Audio esperando interacción", e));
        }
        // Eliminamos los eventos tras el primer toque para que no se repita
        document.removeEventListener('click', dispararAudioBienvenida);
        document.removeEventListener('touchstart', dispararAudioBienvenida);
    };

    document.addEventListener('click', dispararAudioBienvenida);
    document.addEventListener('touchstart', dispararAudioBienvenida);
    // =========================================================================

    const saludo = document.getElementById('saludoHijo');
    if (saludo) saludo.innerText = `📖 ¡Hola ${lector}, listos para leer! ✨`;

    const listaCatalogo = document.getElementById('listaCuentosCatalogo');
    const cuentoAbiertoContenedor = document.getElementById('cuentoAbiertoContenedor');
    const zonaFiltrosHijos = document.getElementById('zonaFiltrosHijos');
    
    const buscarTituloHijo = document.getElementById('buscarTituloHijo');
    const buscarFechaHijo = document.getElementById('buscarFechaHijo');

    const hoy = new Date().toISOString().split('T')[0];
    if (buscarFechaHijo) buscarFechaHijo.value = hoy;

    let mediaRecorder = null;
    let audioChunks = [];
    let todosLosCuentosHijo = [];
    let archivosTemporalesCuestionario = {};
    let audioFondoCuento = null;

    // Gestión del Modal Fullscreen
    window.abrirHijoModal = function(url, tipo) {
        const modal = document.getElementById('hijoImageModal');
        const contenido = document.getElementById('hijoModalContenido');
        if(!modal || !contenido) return;

        if(tipo === 'video') {
            contenido.innerHTML = `<video src="${url}" controls autoplay style="max-width:100%; max-height:80vh; border-radius:12px;"></video>`;
        } else {
            contenido.innerHTML = `<img src="${url}" style="max-width:100%; max-height:80vh; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.3);">`;
        }
        modal.style.display = 'flex';
    }

    const closeBtn = document.getElementById('closeHijoModal');
    if(closeBtn) {
        closeBtn.addEventListener('click', () => {
            const modal = document.getElementById('hijoImageModal');
            const contenido = document.getElementById('hijoModalContenido');
            if(modal) modal.style.display = 'none';
            if(contenido) contenido.innerHTML = '';
        });
    }

    async function cargarCuentosHijo() {
        try {
            const { data, error } = await window.supabaseClient
                .from('cuentos')
                .select('*')
                .or(`destinatario.eq.Ambos,destinatario.eq.${lector}`)
                .order('fecha_publicacion', { ascending: false });

            if(error) throw error;
            todosLosCuentosHijo = data || [];
            renderizarCatalogoHijo(todosLosCuentosHijo);
        } catch(err) {
            if(listaCatalogo) listaCatalogo.innerHTML = `<p style="color:#ef4444;">Error al cargar cuentos: ${err.message}</p>`;
        }
    }

    function renderizarCatalogoHijo(lista) {
        if(!listaCatalogo) return;
        if(lista.length === 0) {
            listaCatalogo.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px;">No tienes cuentos asignados para hoy. 🌟</p>';
            return;
        }

        listaCatalogo.innerHTML = '';
        lista.forEach(cuento => {
            const item = document.createElement('div');
            item.className = 'cuento-item-lista';
            item.onclick = () => abrirCuentoParaLeer(cuento);
            const portada = cuento.imagen_url || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=150';
            
            item.innerHTML = `
                <img src="${portada}" alt="Portada">
                <div class="info">
                    <h4>${cuento.titulo}</h4>
                    <p>📅 Creado: ${cuento.fecha_publicacion || cuento.fecha_creacion}</p>
                </div>
                <div style="font-size:20px;">👉</div>
            `;
            listaCatalogo.appendChild(item);
        });
    }

    function aplicarFiltrosHijo() {
        const txt = buscarTituloHijo ? buscarTituloHijo.value.toLowerCase() : '';
        const fch = buscarFechaHijo ? buscarFechaHijo.value : '';

        const filtrados = todosLosCuentosHijo.filter(cuento => {
            const coincideTxt = cuento.titulo.toLowerCase().includes(txt);
            const fechaCuento = cuento.fecha_publicacion || cuento.fecha_creacion;
            const coincideFch = fch ? (fechaCuento === fch) : true;
            return coincideTxt && coincideFch;
        });
        renderizarCatalogoHijo(filtrados);
    }

    if(buscarTituloHijo) buscarTituloHijo.addEventListener('input', aplicarFiltrosHijo);
    if(buscarFechaHijo) buscarFechaHijo.addEventListener('change', aplicarFiltrosHijo);

    window.openLectorSeguro = window.abrirCuentoParaLeer = function(cuento) {
        if(!cuentoAbiertoContenedor || !listaCatalogo || !zonaFiltrosHijos) return;

        if(cuento.musica_fondo_url) {
            if(audioFondoCuento) { audioFondoCuento.pause(); }
            audioFondoCuento = new Audio(cuento.musica_fondo_url);
            audioFondoCuento.loop = true;
            audioFondoCuento.volume = 0.4;
            audioFondoCuento.play().catch(e => console.log("Audio de fondo requiere interacción"));
        }

        listaCatalogo.style.display = 'none';
        zonaFiltrosHijos.style.display = 'none';

        const portadaHtml = cuento.imagen_url ? `<img class="cuento-banner-portada" src="${cuento.imagen_url}">` : '';
        
        let galeriaHtml = '';
        if(cuento.imagenes_cuerpo && cuento.imagenes_cuerpo.length > 0) {
            galeriaHtml = '<div class="galeria-cuerpo">';
            cuento.imagenes_cuerpo.forEach(imgUrl => {
                galeriaHtml += `<img src="${imgUrl}" onclick="abrirHijoModal('${imgUrl}', 'image')" style="cursor:pointer;">`;
            });
            galeriaHtml += '</div>';
        }

        let cuestionarioHtml = `
            <div class="cuestionario-caja">
                <h3 style="margin-top:0; margin-bottom:15px; color:#1e293b; text-align:center; font-size:18px;">🌟 ¡Responde las preguntas de Papá!</h3>
        `;

        if(cuento.preguntas && Array.isArray(cuento.preguntas) && cuento.preguntas.length > 0) {
            cuento.preguntas.forEach((preguntaObj, idx) => {
                const textoP = typeof preguntaObj === 'object' ? preguntaObj.texto : preguntaObj;
                cuestionarioHtml += `
                    <div class="pregunta-item" data-index="${idx}" style="text-align:left;">
                        <p>📌 Pregunta ${idx + 1}: ${textoP}</p>
                        <textarea class="respuesta-texto-hijo" data-index="${idx}" rows="2" placeholder="Escribe aquí..." style="width:100%; padding:10px; border-radius:8px; border:1px solid #cbd5e1; box-sizing:border-box;"></textarea>
                        <div style="margin-top:8px;">
                            <label class="btn" style="background:#0ea5e9; color:white; padding:6px; border-radius:6px; cursor:pointer;">📸 Foto/Video<input type="file" accept="image/*,video/*" capture="environment" style="display:none;" onchange="procesarCamaraDirecta(this, ${idx})"></label>
                            <button type="button" onclick="iniciarGrabacionVoz(${idx})" style="background:#e11d48; color:white; border:none; padding:6px; border-radius:6px;">🎙️ Voz</button>
                            <span id="status_grab_${idx}"></span>
                        </div>
                        <div id="preview_multimedia_${idx}"></div>
                        <div id="preview_audio_${idx}"></div>
                    </div>
                `;
            });
            cuestionarioHtml += `<button type="button" id="btnEnviar" class="btn" style="background:#10b981; width:100%; padding:15px; border:none; border-radius:8px; color:white; margin-top:15px;">🚀 Guardar y Enviar</button></div>`;
        } else {
            cuestionarioHtml = '<p style="text-align:center;">¡Disfruta el cuento! 📖✨</p>';
        }

        cuentoAbiertoContenedor.innerHTML = `
            <button class="btn" onclick="regresarAlCatalogo()">⬅ Volver</button>
            <h2>${cuento.titulo}</h2>
            ${portadaHtml}
            <div style="white-space:pre-wrap; margin:20px 0;">${cuento.contenido}</div>
            ${galeriaHtml}
            ${cuestionarioHtml}
        `;
        cuentoAbiertoContenedor.style.display = 'block';

        document.getElementById('btnEnviar')?.addEventListener('click', () => enviarCuestionarioCompleto(cuento.id, cuento.titulo));
    }

    window.procesarCamaraDirecta = function(input, index) {
        const file = input.files[0];
        if(!file) return;
        archivosTemporalesCuestionario[index] = { archivo: file, tipo: file.type.startsWith('video/') ? 'video' : 'image' };
        document.getElementById(`status_grab_${index}`).innerText = "✅ Archivo cargado";
    }

    window.regresarAlCatalogo = function() {
        if(audioFondoCuento) { audioFondoCuento.pause(); audioFondoCuento = null; }
        cuentoAbiertoContenedor.style.display = 'none';
        listaCatalogo.style.display = 'block';
        zonaFiltrosHijos.style.display = 'block';
    }

    // [Se mantienen tus funciones de audio (iniciarGrabacionVoz, detenerGrabacionVoz, enviarCuestionarioCompleto)]
    // (Omitidas en este bloque por brevedad, pero incluidas en tu lógica original)
    
    cargarCuentosHijo();
});