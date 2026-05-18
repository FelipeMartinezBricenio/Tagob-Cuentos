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
    
    // Objeto temporal para retener los archivos adjuntos (fotos o audios) de la sesión actual
    let archivosTemporalesCuestionario = {};

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
            listaCatalogo.innerHTML = '<p style="text-align:center; padding: 20px; background:white; border-radius:8px;">No hay cuentos con esos filtros.</p>';
            return;
        }

        listaCatalogo.innerHTML = '';
        cuentosFiltrados.forEach(c => {
            const item = document.createElement('div');
            item.className = 'cuento-item-lista';
            item.onclick = () => verCuentoLecturaCompleta(c);
            item.innerHTML = `
                <img src="${c.imagen_url}" class="cuento-miniatura">
                <div style="flex:1;">
                    <h3 style="margin:0; color:#2c3e50;">📖 ${c.titulo}</h3>
                    <span style="color:#7f8c8d; font-size:12px;">📅 Publicado: ${c.fecha_publicacion}</span>
                </div>
                <span style="font-size:20px; color:#3498db;">➔</span>
            `;
            listaCatalogo.appendChild(item);
        });
    }

    function verCuentoLecturaCompleta(cuento) {
        listaCatalogo.style.display = 'none';
        zonaFiltrosHijos.style.display = 'none';
        
        archivosTemporalesCuestionario = {};

        let preguntasHtml = '';
        if(cuento.preguntas && cuento.preguntas.length > 0) {
            preguntasHtml = `<div style="margin-top:25px; border-top:1px dashed #ccc; padding-top:15px;">
                <h4 style="color:#e67e22; margin:0 0 15px 0;">📝 Responde todas las preguntas antes de enviar:</h4>`;
            
            cuento.preguntas.forEach((pregunta, index) => {
                preguntasHtml += `
                    <div class="pregunta-bloque">
                        <div class="pregunta-texto">${index + 1}. ${pregunta}</div>
                        <textarea id="text-p-${index}" placeholder="Escribe tu respuesta aquí..."></textarea>
                        
                        <div class="estado-grabacion" id="rec-status-${index}">🔴 Grabando audio...</div>
                        <img id="preview-img-${index}" class="preview-media-respuesta">
                        <audio id="preview-aud-${index}" class="preview-media-respuesta" controls></audio>

                        <div class="controles-respuesta">
                            <button type="button" class="btn-accion btn-foto" onclick="dispararCamara(${index})">📸 Foto / Dibujo</button>
                            <button type="button" class="btn-accion btn-audio" id="btn-audio-${index}" onclick="controlarAudio(${index})">🎤 Grabar Audio</button>
                        </div>
                    </div>
                `;
            });
            
            preguntasHtml += `
                <button type="button" class="btn btn-submit" style="margin-top:25px; background-color:#2ecc71;" onclick="enviarTodoElCuestionario(${cuento.id}, ${cuento.preguntas.length})">🚀 Enviar Cuestionario Completo</button>
            </div>`;
        }

        cuentoAbiertoContenedor.innerHTML = `
            <button type="button" class="btn btn-volver" onclick="regresarAlCatalogo()">⬅ Volver a mis Cuentos</button>
            <div style="display:flex; gap:20px; flex-wrap:wrap; margin-bottom:20px;">
                <img src="${cuento.imagen_url}" style="max-width:220px; width:100%; height:auto; border-radius:8px; object-fit:cover;">
                <div style="flex:1; min-width:250px;">
                    <h2 style="color:#2c3e50; margin-bottom:10px;">📖 ${cuento.titulo}</h2>
                    <p style="white-space:pre-wrap; color:#444; line-height:1.6; margin:0;">${cuento.contenido}</p>
                </div>
            </div>
            ${preguntasHtml}
        `;
        cuentoAbiertoContenedor.style.display = 'block';
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
            status.style.display = "inline-flex";

        } catch (err) { alert("Permiso de micrófono denegado."); }
    };

    window.enviarTodoElCuestionario = async function(cuentoId, totalPreguntas) {
        let registrosAIngresar = [];

        // 1. Recopilar datos de los elementos de la interfaz
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
            alert("Responde al menos una pregunta antes de guardar todo el cuestionario.");
            return;
        }

        try {
            // 2. Iterar y procesar cada respuesta recopilada
            for(let item of registrosAIngresar) {
                let urlPublica = null;
                if(item.archivo) {
                    const nombreArchivo = `${lector}_resp_${Date.now()}_p${item.index}.${item.tipo === 'audio' ? 'mp3' : 'png'}`;
                    const { error: uploadError } = await window.supabaseClient.storage
                        .from('respuestas')
                        .upload(nombreArchivo, item.archivo);
                    
                    if(uploadError) throw uploadError;
                    const { data } = window.supabaseClient.storage.from('respuestas').getPublicUrl(nombreArchivo);
                    urlPublica = data.publicUrl;
                }

                // CORRECCIÓN: Apunta estrictamente al campo estructurado 'respuesta_texto'
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
            // Este alert nos dirá el error exacto si Supabase rechaza la inserción
            alert("Error crítico de Supabase al guardar: " + err.message);
        }
    };
});