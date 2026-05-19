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

    // Visor adaptativo de pantalla completa para las imágenes
    const modalHtml = `
        <div id="hijoImageModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:99999; justify-content:center; align-items:center; flex-direction:column; padding:10px; box-sizing:border-box;">
            <span id="closeHijoModal" style="position:absolute; top:20px; right:25px; color:white; font-size:45px; font-weight:bold; cursor:pointer; user-select:none; background:rgba(255,255,255,0.2); width:50px; height:50px; display:flex; justify-content:center; align-items:center; border-radius:50%;">&times;</span>
            <img id="imgHijoModalTarget" style="max-width:100%; max-height:85vh; object-fit:contain; border-radius:8px; box-shadow:0 4px 20px rgba(255,255,255,0.15);">
            <p style="color:#aaa; font-size:14px; margin-top:12px; font-family:sans-serif; text-align:center;">✨ Toca la X arriba para regresar a tu lectura</p>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('closeHijoModal').onclick = () => {
        document.getElementById('hijoImageModal').style.display = "none";
    };
    document.getElementById('hijoImageModal').onclick = (e) => {
        if(e.target.id === 'hijoImageModal') document.getElementById('hijoImageModal').style.display = "none";
    };

    window.abrirImagenPantallaCompleta = function(url) {
        const m = document.getElementById('hijoImageModal');
        const img = document.getElementById('imgHijoModalTarget');
        img.src = url;
        m.style.display = "flex";
    };

    descargarCuentosBase();

    if (buscarTituloHijo) buscarTituloHijo.addEventListener('input', aplicarFiltrosHijos);
    if (buscarFechaHijo) buscarFechaHijo.addEventListener('change', aplicarFiltrosHijos);

    async function descargarCuentosBase() {
        try {
            const { data: cuentos, error } = await window.supabaseClient
                .from('cuentos')
                .select('*')
                .or(`destinatario.eq.${lector},destinatario.eq.Ambos`)
                .order('fecha_publicacion', { ascending: false });

            if (error) throw error;
            todosLosCuentosHijo = cuentos || [];
            aplicarFiltrosHijos();

        } catch (err) {
            listaCatalogo.innerHTML = `<p style="color:red;">Error al cargar tus lecturas: ${err.message}</p>`;
        }
    }

    function aplicarFiltrosHijos() {
        if (!listaCatalogo) return;

        const textoFiltro = buscarTituloHijo.value.toLowerCase().trim();
        const fechaFiltro = buscarFechaHijo.value;

        const cuentosFiltrados = todosLosCuentosHijo.filter(c => {
            const coincideTexto = c.titulo.toLowerCase().includes(textoFiltro);
            const coincideFecha = !fechaFiltro || (c.fecha_publicacion === fechaFiltro);
            return coincideTexto && coincideFecha;
        });

        if (cuentosFiltrados.length === 0) {
            listaCatalogo.innerHTML = '<p style="text-align:center; padding: 25px; background:white; border-radius:12px; font-size:16px;">No hay cuentos con esos filtros.</p>';
            return;
        }

        listaCatalogo.innerHTML = '';
        cuentosFiltrados.forEach(c => {
            const item = document.createElement('div');
            item.style = "display:flex; align-items:center; gap:15px; background:white; padding:12px; border-radius:12px; margin-bottom:12px; box-shadow:0 3px 10px rgba(0,0,0,0.03); cursor:pointer; -webkit-tap-highlight-color: transparent;";
            item.onclick = () => verCuentoLecturaCompleta(c);
            item.innerHTML = `
                <img src="${c.imagen_url}" style="width:65px; height:65px; object-fit:cover; border-radius:10px;">
                <div style="flex:1;">
                    <h3 style="margin:0; color:#2c3e50; font-size:16px; font-weight:bold; line-height:1.3;">📖 ${c.titulo}</h3>
                    <span style="color:#7f8c8d; font-size:12px;">📅 Publicado: ${c.fecha_publicacion}</span>
                </div>
                <span style="font-size:22px; color:#3498db; font-weight:bold; padding-right:5px;">➔</span>
            `;
            listaCatalogo.appendChild(item);
        });
    }

    function verCuentoLecturaCompleta(cuento) {
        listaCatalogo.style.display = 'none';
        zonaFiltrosHijos.style.display = 'none';
        
        archivosTemporalesCuestionario = {};

        let ilustracionesCuerpoHtml = '';
        // Mapeo flexible para las columnas de imágenes del cuerpo
        let arrayImagenes = cuento.imagenes_cuerpo || cuento.imagenes_imagenes || [];
        
        if (typeof arrayImagenes === 'string') {
            try { arrayImagenes = JSON.parse(arrayImagenes); } catch(e) { arrayImagenes = []; }
        }

        if (Array.isArray(arrayImagenes) && arrayImagenes.length > 0) {
            ilustracionesCuerpoHtml = `<div style="display:flex; flex-direction:column; gap:20px; margin:25px 0;">`;
            arrayImagenes.forEach((url) => {
                if(url) {
                    ilustracionesCuerpoHtml += `
                        <div style="text-align:center; width:100%;">
                            <img src="${url}" 
                                 style="max-width:100%; width:auto; max-height:380px; border-radius:14px; box-shadow:0 6px 18px rgba(0,0,0,0.06); object-fit:contain; cursor:pointer; transition: transform 0.2s; -webkit-tap-highlight-color: transparent;" 
                                 onclick="abrirImagenPantallaCompleta('${url}')"
                                 alt="Imagen del cuento. Toca para ver en pantalla completa">
                            <div style="color:#7f8c8d; font-size:12px; margin-top:5px; font-style:italic;">👆 Toca la foto para verla en grande</div>
                        </div>
                    `;
                }
            });
            ilustracionesCuerpoHtml += `</div>`;
        }

        let preguntasHtml = '';
        if(cuento.preguntas && cuento.preguntas.length > 0) {
            preguntasHtml = `<div style="margin-top:35px; border-top:2px dashed #cbd5e1; padding-top:25px;">
                <h4 style="color:#e67e22; margin:0 0 15px 0; font-size:18px; font-weight:bold; text-align:center;">📝 Responde las preguntas para Papá:</h4>`;
            
            cuento.preguntas.forEach((pregunta, index) => {
                if (!pregunta) return;
                preguntasHtml += `
                    <div class="pregunta-bloque" style="background:#fff; border:1px solid #e2e8f0; padding:16px; border-radius:12px; margin-bottom:16px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
                        <div class="pregunta-texto" style="font-weight:bold; color:#2c3e50; font-size:15px; margin-bottom:12px; line-height:1.4;">${index + 1}. ${pregunta}</div>
                        <textarea id="text-p-${index}" placeholder="Escribe aquí tu respuesta..." style="width:100%; min-height:85px; border-radius:8px; padding:12px; border:1px solid #cbd5e1; font-size:15px; box-sizing:border-box; font-family:sans-serif; line-height:1.4; resize:vertical;"></textarea>
                        
                        <div class="estado-grabacion" id="rec-status-${index}" style="color:#e74c3c; display:none; margin-top:8px; font-weight:bold; font-size:14px; align-items:center; gap:5px;">🔴 Grabando audio...</div>
                        <img id="preview-img-${index}" class="preview-media-respuesta" style="max-width:100%; max-height:160px; display:none; margin-top:12px; border-radius:8px; object-fit:cover;">
                        <audio id="preview-aud-${index}" style="display:none; margin-top:12px; width:100%;" controls></audio>

                        <div class="controles-respuesta" style="display:flex; gap:12px; margin-top:14px;">
                            <button type="button" style="flex:1; padding:12px 10px; font-size:14px; font-weight:bold; background:#edf2f7; border:1px solid #cbd5e1; border-radius:8px; cursor:pointer; display:inline-flex; justify-content:center; align-items:center; gap:5px; -webkit-tap-highlight-color: transparent;" onclick="dispararCamara(${index})">📸 Foto / Dibujo</button>
                            <button type="button" id="btn-audio-${index}" style="flex:1; padding:12px 10px; font-size:14px; font-weight:bold; background:#edf2f7; border:1px solid #cbd5e1; border-radius:8px; cursor:pointer; display:inline-flex; justify-content:center; align-items:center; gap:5px; -webkit-tap-highlight-color: transparent;" onclick="controlarAudio(${index})">🎤 Grabar Audio</button>
                        </div>
                    </div>
                `;
            });
            
            preguntasHtml += `
                <button type="button" style="margin-top:25px; background-color:#2ecc71; width:100%; padding:15px; font-size:17px; font-weight:bold; color:white; border:none; border-radius:12px; cursor:pointer; box-shadow:0 4px 12px rgba(46,204,113,0.2); -webkit-tap-highlight-color: transparent;" onclick="enviarTodoElCuestionario(${cuento.id}, ${cuento.preguntas.length})">🚀 Enviar Todo Completo</button>
            </div>`;
        }

        cuentoAbiertoContenedor.innerHTML = `
            <button type="button" style="padding:10px 16px; font-size:14px; font-weight:bold; background:#7f8c8d; color:white; border:none; border-radius:8px; margin-bottom:20px; cursor:pointer; -webkit-tap-highlight-color: transparent;" onclick="regresarAlCatalogo()">⬅ Volver a mis Cuentos</button>
            <div style="margin-bottom:20px;">
                <h2 style="color:#2c3e50; margin-bottom:15px; text-align:center; font-size:22px; font-weight:bold; line-height:1.3;">📖 ${cuento.titulo}</h2>
                <div style="text-align:center; margin-bottom:20px;">
                    <img src="${cuento.imagen_url}" style="max-width:100%; width:auto; max-height:280px; border-radius:12px; object-fit:cover; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
                </div>
                <div style="white-space:pre-wrap; color:#2c3e50; font-size:17px; line-height:1.7; margin:0; background:#fff; padding:16px; border-radius:12px; border:1px solid #edf2f7; box-shadow:0 2px 6px rgba(0,0,0,0.01); text-align:justify; font-family:sans-serif;">${cuento.contenido || '<span style="color:#aaa; font-style:italic;">Cuento ilustrado en imágenes a continuación:</span>'}</div>
            </div>
            ${ilustracionesCuerpoHtml}
            ${preguntasHtml}
        `;
        cuentoAbiertoContenedor.style.display = 'block';
        window.scrollTo(0, 0);
    }

    window.regresarAlCatalogo = function() {
        cuentoAbiertoContenedor.style.display = 'none';
        listaCatalogo.style.display = 'block';
        zonaFiltrosHijos.style.display = 'flex';
        aplicarFiltrosHijos();
    };

    window.dispararCamara = function(pIndex) {
        preguntaActivaIndex = pIndex;
        cameraInput.click();
    };

    if(cameraInput) {
        cameraInput.addEventListener('change', (e) => {
            if(e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                archivosTemporalesCuestionario[`file_${preguntaActivaIndex}`] = file;
                archivosTemporalesCuestionario[`type_${preguntaActivaIndex}`] = 'imagen';
                
                const previewImg = document.getElementById(`preview-img-${preguntaActivaIndex}`);
                if(previewImg) {
                    previewImg.src = URL.createObjectURL(file);
                    previewImg.style.display = 'block';
                }
            }
        });
    }

    window.controlarAudio = async function(pIndex) {
        const btn = document.getElementById(`btn-audio-${pIndex}`);
        const status = document.getElementById(`rec-status-${pIndex}`);

        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            btn.innerText = "🎤 Grabar Audio";
            btn.style.background = "#edf2f7";
            btn.style.color = "#333";
            status.style.display = "none";
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunks = [];
            mediaRecorder = new MediaRecorder(stream);
            preguntaActivaIndex = pIndex;

            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
            
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                const file = new File([audioBlob], `audio_${Date.now()}.mp3`, { type: 'audio/mp3' });
                
                archivosTemporalesCuestionario[`file_${pIndex}`] = file;
                archivosTemporalesCuestionario[`type_${pIndex}`] = 'audio';

                const previewAud = document.getElementById(`preview-aud-${pIndex}`);
                if(previewAud) {
                    previewAud.src = URL.createObjectURL(file);
                    previewAud.style.display = 'block';
                }
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            btn.innerText = "🛑 Detener";
            btn.style.background = "#e74c3c";
            btn.style.color = "white";
            status.style.display = "inline-flex";

        } catch (err) { alert("Permiso de micrófono denegado."); }
    };

    window.enviarTodoElCuestionario = async function(cuentoId, totalPreguntas) {
        let registrosAIngresar = [];

        for(let i = 0; i < totalPreguntas; i++) {
            const txtInput = document.getElementById(`text-p-${i}`);
            const texto = txtInput ? txtInput.value.trim() : "";
            const archivo = archivosTemporalesCuestionario[`file_${i}`];
            const tipo = archivosTemporalesCuestionario[`type_${i}`];

            if(texto || archivo) {
                registrosAIngresar.push({
                    index: i,
                    texto: texto,
                    archivo: archivo,
                    tipo: tipo
                });
            }
        }

        if(registrosAIngresar.length === 0) {
            alert("Por favor, responde al menos una pregunta antes de enviar.");
            return;
        }

        try {
            for(let item of registrosAIngresar) {
                let urlPublica = null;
                if(item.archivo) {
                    const nombreArchivo = `${lector}_resp_${Date.now()}_p${item.index}.${item.tipo === 'audio' ? 'mp3' : 'png'}`;
                    
                    // CORRECCIÓN CLAVE: Apunta exactamente a tu Bucket "respuestas-hijos"
                    const { error: uploadError } = await window.supabaseClient.storage
                        .from('respuestas-hijos')
                        .upload(nombreArchivo, item.archivo);
                    
                    if(uploadError) throw uploadError;
                    
                    const { data } = window.supabaseClient.storage.from('respuestas-hijos').getPublicUrl(nombreArchivo);
                    urlPublica = data.publicUrl;
                }

                const { error: insertError } = await window.supabaseClient
                    .from('respuestas_hijos')
                    .insert([{
                        cuento_id: cuentoId,
                        lector: lector,
                        pregunta_index: item.index,
                        respuesta_texto: item.texto, 
                        respuesta_archivo_url: urlPublica,
                        tipo_archivo: item.tipo || null
                    }]);

                if (insertError) throw insertError;
            }

            alert("¡Todo tu cuestionario ha sido guardado y enviado a Papá con éxito! 🌟👏");
            regresarAlCatalogo();

        } catch (err) {
            alert("Error de supabase al guardar: " + err.message);
        }
    };
});