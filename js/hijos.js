// js/hijos.js
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const lector = params.get('usuario') || 'Hijo';
    
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

    // Gestión del Modal Fullscreen para visualizar Capturas
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

    // CARGAR CUENTOS DESDE SUPABASE
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

    // CONTROL DE LECTURA ADAPTADO A REGLAS DE SEGURIDAD MÓVILES
    window.openLectorSeguro = window.abrirCuentoParaLeer = function(cuento) {
        if(!cuentoAbiertoContenedor || !listaCatalogo || !zonaFiltrosHijos) return;

        if(cuento.musica_fondo_url) {
            if(audioFondoCuento) { audioFondoCuento.pause(); }
            audioFondoCuento = new Audio(cuento.musica_fondo_url);
            audioFondoCuento.loop = true;
            audioFondoCuento.volume = 0.4;
            audioFondoCuento.play().catch(e => console.log("Interacción requerida para audio"));
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

        let cuestionarioHtml = '';
        if(cuento.preguntas && Array.isArray(cuento.preguntas) && cuento.preguntas.length > 0) {
            cuestionarioHtml = `
                <div class="cuestionario-caja">
                    <h3 style="margin-top:0; margin-bottom:15px; color:#1e293b; text-align:center; font-size:18px;">🌟 ¡Responde las preguntas de Papá!</h3>
            `;

            cuento.preguntas.forEach((preguntaTexto, idx) => {
                cuestionarioHtml += `
                    <div class="pregunta-item" data-index="${idx}" style="text-align:left;">
                        <p>📌 Pregunta ${idx + 1}: ${preguntaTexto}</p>
                        
                        <textarea class="respuesta-texto-hijo" data-index="${idx}" rows="2" placeholder="Escribe tu respuesta aquí..." style="width:100%; padding:10px; border-radius:8px; border:1px solid #cbd5e1; font-family:inherit; resize:none; margin-bottom:10px; font-size:14px; box-sizing:border-box;"></textarea>
                        
                        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; background:#f1f5f9; padding:8px; border-radius:8px;">
                            
                            <label class="btn" style="background:#0ea5e9; color:white; font-size:12px; padding:6px 10px; border-radius:6px; cursor:pointer; display:inline-block; border:none; margin:0;">
                                📸 Foto / Video
                                <input type="file" accept="image/*,video/*" capture="environment" style="display:none;" onchange="procesarCamaraDirecta(this, ${idx})">
                            </label>
                            
                            <div style="display:flex; gap:5px; align-items:center;">
                                <button type="button" id="btn_grab_start_${idx}" class="btn" style="background:#e11d48; color:white; font-size:12px; padding:6px 10px; border-radius:6px; border:none; cursor:pointer;" onclick="iniciarGrabacionVoz(${idx})">🎙️ Voz</button>
                                <button type="button" id="btn_grab_stop_${idx}" class="btn" style="background:#475569; color:white; font-size:12px; padding:6px 10px; border-radius:6px; border:none; display:none; cursor:pointer;" onclick="detenerGrabacionVoz(${idx})">🛑 Parar</button>
                            </div>
                            <span id="status_grab_${idx}" style="font-size:11px; color:#64748b;">Sin adjuntos</span>
                        </div>
                        
                        <div id="preview_multimedia_${idx}" style="margin-top:8px;"></div>
                        <div id="preview_audio_${idx}" style="margin-top:8px;"></div>
                    </div>
                `;
            });

            cuestionarioHtml += `
                    <button type="button" id="btnEnviarTodoElCuestionario" data-id="${cuento.id}" data-titulo="${cuento.titulo.replace(/"/g, '&quot;')}" class="btn" style="background:#10b981; color:white; font-size:16px; margin-top:15px; width:100%; padding:12px; border-radius:8px; border:none; font-weight:bold; cursor:pointer;">🚀 Guardar y Enviar a Papá</button>
                </div>
            `;
        } else {
            cuestionarioHtml = '<p style="color:#64748b; font-style:italic; text-align:center; padding:15px; background:#f1f5f9; border-radius:12px; margin-top:20px; font-size:14px;">¡Este cuento es para disfrutar la lectura! No tiene preguntas asignadas. 📖✨</p>';
        }

        cuentoAbiertoContenedor.innerHTML = `
            <button type="button" class="btn btn-regresar" onclick="regresarAlCatalogo()">⬅ Volver al Catálogo</button>
            <h2 style="color:#1e293b; margin-bottom:15px; font-size:22px;">${cuento.titulo}</h2>
            ${portadaHtml}
            <div style="font-size:15px; line-height:1.6; color:#334155; white-space:pre-wrap; margin-bottom:20px; text-align:left;">${cuento.contenido}</div>
            ${galeriaHtml}
            ${cuestionarioHtml}
        `;
        cuentoAbiertoContenedor.style.display = 'block';

        const btnEnviar = document.getElementById('btnEnviarTodoElCuestionario');
        if(btnEnviar) {
            btnEnviar.addEventListener('click', function() {
                const idCuento = this.getAttribute('data-id');
                const tituloCuento = this.getAttribute('data-titulo');
                window.enviarCuestionarioCompleto(idCuento, tituloCuento);
            });
        }
    }

    // PROCESAMIENTO SEGURO DEL ARCHIVO MULTIMEDIA CAPTURADO
    window.procesarCamaraDirecta = function(inputElement, index) {
        const file = inputElement.files[0];
        if(!file) return;

        const esVideo = file.type.startsWith('video/');
        const tipoMultimedia = esVideo ? 'video' : 'image';

        archivosTemporalesCuestionario[index] = {
            archivo: file,
            tipo: tipoMultimedia
        };

        const divPreview = document.getElementById(`preview_multimedia_${index}`);
        const statusGrab = document.getElementById(`status_grab_${index}`);
        if(statusGrab) statusGrab.innerText = "✅ Archivo cargado";
        
        if(divPreview) {
            const urlObj = URL.createObjectURL(file);
            if(esVideo) {
                divPreview.innerHTML = `
                    <p style="color:#0284c7; font-size:12px; margin:5px 0 0 0;">🎥 Video listo:</p>
                    <video src="${urlObj}" controls style="max-width:120px; max-height:100px; border-radius:6px; margin-top:5px;"></video>
                `;
            } else {
                divPreview.innerHTML = `
                    <p style="color:#0f766e; font-size:12px; margin:5px 0 0 0;">📸 Foto lista:</p>
                    <img src="${urlObj}" style="width:70px; height:70px; object-fit:cover; border-radius:6px; margin-top:5px;">
                `;
            }
        }
    }

    window.regresarAlCatalogo = function() {
        if(audioFondoCuento) {
            audioFondoCuento.pause();
            audioFondoCuento = null;
        }
        if(cuentoAbiertoContenedor && listaCatalogo && zonaFiltrosHijos) {
            cuentoAbiertoContenedor.style.display = 'none';
            listaCatalogo.style.display = 'block';
            zonaFiltrosHijos.style.display = 'block';
            archivosTemporalesCuestionario = {};
        }
    }

    window.iniciarGrabacionVoz = async function(index) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (e) => { if(e.data.size > 0) audioChunks.push(e.data); };
            
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                archivosTemporalesCuestionario[index] = {
                    archivo: audioBlob,
                    tipo: 'audio'
                };
                
                const previewDiv = document.getElementById(`preview_audio_${index}`);
                if(previewDiv) {
                    const audioUrl = URL.createObjectURL(audioBlob);
                    previewDiv.innerHTML = `<audio controls src="${audioUrl}" style="width:100%; max-width:240px; margin-top:5px; height:32px;"></audio>`;
                }
                
                const status = document.getElementById(`status_grab_${index}`);
                if(status) status.innerText = "✅ Grabado listo";
            };

            mediaRecorder.start();
            document.getElementById(`btn_grab_start_${index}`).style.display = 'none';
            document.getElementById(`btn_grab_stop_${index}`).style.display = 'inline-block';
            document.getElementById(`status_grab_${index}`).innerText = "🔴 Grabando voz...";

        } catch(err) { alert("Permiso de micrófono denegado o no soportado."); }
    }

    window.detenerGrabacionVoz = function(index) {
        if(mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            document.getElementById(`btn_grab_start_${index}`).style.display = 'inline-block';
            document.getElementById(`btn_grab_stop_${index}`).style.display = 'none';
        }
    }

    window.enviarCuestionarioCompleto = async function(cuentoId, cuentoTitulo) {
        try {
            const itemsPreguntas = document.querySelectorAll('.pregunta-item');
            
            for(let itemNodo of itemsPreguntas) {
                const itemIndex = parseInt(itemNodo.getAttribute('data-index'));
                const textEl = itemNodo.querySelector('.respuesta-texto-hijo');
                const textoRespuesta = textEl ? textEl.value.trim() : "";
                const fileObj = archivosTemporalesCuestionario[itemIndex];

                let urlPublica = null;
                let tipoArchivoFinal = null;

                if(fileObj && fileObj.archivo) {
                    tipoArchivoFinal = fileObj.tipo;
                    const extension = tipoArchivoFinal === 'audio' ? 'mp3' : (tipoArchivoFinal === 'video' ? 'mp4' : 'png');
                    const nombreArchivo = `resp_${lector}_c${cuentoId}_p${itemIndex}_${Date.now()}.${extension}`;
                    
                    const { error: uploadError } = await window.supabaseClient.storage
                        .from('respuestas-hijos')
                        .upload(nombreArchivo, fileObj.archivo);
                    
                    if(uploadError) throw uploadError;
                    
                    const { data } = window.supabaseClient.storage.from('respuestas-hijos').getPublicUrl(nombreArchivo);
                    urlPublica = data.publicUrl;
                }

                const { error: insertError } = await window.supabaseClient
                    .from('responses_hijos' in window ? 'responses_hijos' : 'respuestas_hijos')
                    .insert([{
                        cuento_id: cuentoId,
                        cuento_titulo: cuentoTitulo,
                        lector: lector,
                        pregunta_index: itemIndex,
                        respuesta_texto: textoRespuesta || null,
                        respuesta_archivo_url: urlPublica,
                        tipo_archivo: tipoArchivoFinal,
                        fecha_respuesta: new Date().toISOString().split('T')[0]
                    }]);

                if (insertError) throw insertError;
            }

            alert("¡Todo tu cuestionario ha sido guardado y enviado a Papá con éxito! 🌟👏");
            regresarAlCatalogo();
            cargarCuentosHijo();

        } catch (err) {
            alert("Error al guardar tus respuestas: " + err.message);
        }
    };

    cargarCuentosHijo();
});