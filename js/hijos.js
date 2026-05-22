// js/hijos.js
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const lector = params.get('usuario') || 'Hijo';
    
    const saludo = document.getElementById('saludoHijo');
    if (saludo) saludo.innerText = `📖 ¡Hola ${lector}, listos para leer! ✨`;

    const listaCatalogo = document.getElementById('listaCuentosCatalogo');
    const cuentoAbiertoContenedor = document.getElementById('cuentoAbiertoContenedor');
    const zonaFiltrosHijos = document.getElementById('zonaFiltrosHijos');
    const cameraInput = document.getElementById('cameraInput');
    
    const buscarTituloHijo = document.getElementById('buscarTituloHijo');
    const buscarFechaHijo = document.getElementById('buscarFechaHijo');

    const hoy = new Date().toISOString().split('T')[0];
    if (buscarFechaHijo) buscarFechaHijo.value = hoy;

    let mediaRecorder = null;
    let audioChunks = [];
    let preguntaActivaIndex = null;
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
                .or(`destinatario.eq.Todos,destinatario.eq.${lector}`)
                .order('fecha_creacion', { ascending: false });

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

            const portada = cuento.portada_url || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=150';
            
            item.innerHTML = `
                <img src="${portada}" alt="Portada">
                <div class="info">
                    <h4>${cuento.titulo}</h4>
                    <p>📅 Creado: ${cuento.fecha_creacion}</p>
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
            const coincideFch = fch ? (cuento.fecha_creacion === fch) : true;
            return coincideTxt && coincideFch;
        });
        renderizarCatalogoHijo(filtrados);
    }

    if(buscarTituloHijo) buscarTituloHijo.addEventListener('input', aplicarFiltrosHijo);
    if(buscarFechaHijo) buscarFechaHijo.addEventListener('change', aplicarFiltrosHijo);

    window.abrirCuentoParaLeer = function(cuento) {
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

        const portadaHtml = cuento.portada_url ? `<img class="cuento-banner-portada" src="${cuento.portada_url}">` : '';
        
        let galeriaHtml = '';
        if(cuento.imagenes_cuerpo && cuento.imagenes_cuerpo.length > 0) {
            galeriaHtml = '<div class="galeria-cuerpo">';
            cuento.imagenes_cuerpo.forEach(imgUrl => {
                galeriaHtml += `<img src="${imgUrl}" onclick="abrirHijoModal('${imgUrl}', 'image')" style="cursor:pointer;">`;
            });
            galeriaHtml += '</div>';
        }

        let cuestionarioHtml = '';
        if(cuento.cuestionario && cuento.cuestionario.length > 0) {
            cuestionarioHtml = `
                <div class="cuestionario-caja">
                    <h3 style="margin-top:0; margin-bottom:15px; color:#1e293b; text-align:center;">🌟 ¡Responde las preguntas de Papá!</h3>
            `;

            cuento.cuestionario.forEach(q => {
                let inputAccionHtml = '';
                if(q.tipo === 'texto') {
                    inputAccionHtml = `<textarea class="respuesta-texto-hijo" data-index="${q.index}" rows="3" placeholder="Escribe tu respuesta aquí con calma..."></textarea>`;
                } else if(q.tipo === 'multimedia') {
                    inputAccionHtml = `
                        <button type="button" class="btn-app" style="background:#0ea5e9; font-size:14px;" onclick="activarCamaraHijo(${q.index})">📸 Grabar Video o Foto</button>
                        <div id="preview_multimedia_${q.index}" style="margin-top:10px; font-weight:bold; color:#0f766e;"></div>
                    `;
                } else if(q.tipo === 'audio') {
                    inputAccionHtml = `
                        <div style="display:flex; gap:10px; align-items:center;">
                            <button type="button" id="btn_grab_start_${q.index}" class="btn-app" style="background:#e11d48; padding:10px;" onclick="iniciarGrabacionVoz(${q.index})">🎙 Grabar</button>
                            <button type="button" id="btn_grab_stop_${q.index}" class="btn-app" style="background:#475569; padding:10px; display:none;" onclick="detenerGrabacionVoz(${q.index})">🛑 Parar</button>
                            <span id="status_grab_${q.index}" style="font-size:13px; color:#64748b;">Sin grabar</span>
                        </div>
                        <div id="preview_audio_${q.index}" style="margin-top:10px;"></div>
                    `;
                }

                cuestionarioHtml += `
                    <div class="pregunta-item" data-tipo="${q.tipo}">
                        <p>Pregunta ${q.index}: ${q.pregunta}</p>
                        ${inputAccionHtml}
                    </div>
                `;
            });

            cuestionarioHtml += `
                    <button type="button" class="btn-app" style="background:#10b981; font-size:16px; margin-top:15px;" onclick="enviarCuestionarioCompleto(${cuento.id})">🚀 Guardar y Enviar a Papá</button>
                </div>
            `;
        }

        cuentoAbiertoContenedor.innerHTML = `
            <button type="button" class="btn-app btn-regresar" onclick="regresarAlCatalogo()">⬅ Volver al Catálogo</button>
            <h2 style="color:#1e293b; margin-bottom:15px;">${cuento.titulo}</h2>
            ${portadaHtml}
            <div style="font-size:16px; line-height:1.7; color:#334155; white-space:pre-wrap; margin-bottom:20px;">${cuento.contenido}</div>
            ${galeriaHtml}
            ${cuestionarioHtml}
        `;
        cuentoAbiertoContenedor.style.display = 'block';
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

    window.activarCamaraHijo = function(index) {
        preguntaActivaIndex = index;
        if(cameraInput) cameraInput.click();
    }

    if(cameraInput) {
        cameraInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(!file || preguntaActivaIndex === null) return;

            const esVideo = file.type.startsWith('video/');
            const tipoMultimedia = esVideo ? 'video' : 'image';

            archivosTemporalesCuestionario[preguntaActivaIndex] = {
                archivo: file,
                tipo: tipoMultimedia
            };

            const divPreview = document.getElementById(`preview_multimedia_${preguntaActivaIndex}`);
            if(divPreview) {
                const urlObj = URL.createObjectURL(file);
                if(esVideo) {
                    divPreview.innerHTML = `
                        <p style="color:#0284c7;">🎥 Video cargado listo:</p>
                        <video src="${urlObj}" controls style="max-width:100px; max-height:100px; border-radius:6px; margin-top:5px;"></video>
                    `;
                } else {
                    divPreview.innerHTML = `
                        <p style="color:#0f766e;">📸 Foto cargada lista:</p>
                        <img src="${urlObj}" style="width:70px; height:70px; object-fit:cover; border-radius:6px; margin-top:5px;">
                    `;
                }
            }
        });
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
                    previewDiv.innerHTML = `<audio controls src="${audioUrl}" style="width:100%; max-width:240px;"></audio>`;
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

    window.enviarCuestionarioCompleto = async function(cuentoId) {
        try {
            const itemsPreguntas = document.querySelectorAll('.pregunta-item');
            
            for(let itemNodo of itemsPreguntas) {
                const tipo = itemNodo.getAttribute('data-tipo');
                let textoRespuesta = null;
                let itemIndex = null;
                let fileObj = null;

                if(tipo === 'texto') {
                    const textEl = itemNodo.querySelector('.respuesta-texto-hijo');
                    textoRespuesta = textEl.value.trim();
                    itemIndex = parseInt(textEl.getAttribute('data-index'));
                } else {
                    if(tipo === 'multimedia') {
                        const btn = itemNodo.querySelector('button');
                        const onclickStr = btn.getAttribute('onclick');
                        itemIndex = parseInt(onclickStr.match(/\d+/)[0]);
                    } else if(tipo === 'audio') {
                        const btn = itemNodo.querySelector('button');
                        const idStr = btn.id;
                        itemIndex = parseInt(idStr.split('_').pop());
                    }
                    fileObj = archivosTemporalesCuestionario[itemIndex];
                }

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
                    .from('respuestas_hijos')
                    .insert([{
                        cuento_id: cuentoId,
                        lector: lector,
                        pregunta_index: itemIndex,
                        respuesta_texto: textoRespuesta,
                        respuesta_archivo_url: urlPublica,
                        tipo_archivo: tipoArchivoFinal
                    }]);

                if (insertError) throw insertError;
            }

            alert("¡Todo tu cuestionario ha sido guardado y enviado a Papá con éxito! 🌟👏");
            regresarAlCatalogo();

        } catch (err) {
            alert("Error de supabase al guardar: " + err.message);
        }
    };

    cargarCuentosHijo();
});