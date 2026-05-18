// js/papa.js
document.addEventListener('DOMContentLoaded', () => {
    const fechaInput = document.getElementById('fecha');
    const hoy = new Date().toISOString().split('T')[0];
    if (fechaInput) fechaInput.value = hoy;

    const portadaInput = document.getElementById('portada');
    const dropZone = document.getElementById('dropZone');
    const triggerFile = document.getElementById('triggerFile');
    const previewContainer = document.getElementById('previewContainer');
    const imgPreview = document.getElementById('imgPreview');

    // Filtros
    const selectTituloPapa = document.getElementById('selectTituloPapa');
    const filtrarDestinatario = document.getElementById('filtrarDestinatario');
    const filtrarFechaPapa = document.getElementById('filtrarFechaPapa');

    let archivoImagenGlobal = null;
    let todosLosCuentosGlobal = [];

    cargarHistorial();

    window.cambiarPestaña = function(destino) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.seccion-panel').forEach(panel => panel.classList.remove('active'));

        if(destino === 'crear') {
            document.querySelector("button[onclick=\"cambiarPestaña('crear')\"]").classList.add('active');
            document.getElementById('seccionCrear').classList.add('active');
        } else {
            document.querySelector("button[onclick=\"cambiarPestaña('ver')\"]").classList.add('active');
            document.getElementById('seccionVer').classList.add('active');
            cargarHistorial();
        }
    };

    if (triggerFile && portadaInput) {
        triggerFile.addEventListener('click', (e) => { e.stopPropagation(); portadaInput.click(); });
    }

    document.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                const file = new File([blob], `portada_${Date.now()}.png`, { type: 'image/png' });
                archivoImagenGlobal = file;
                mostrarVistaPrevia(file);
                break;
            }
        }
    });

    if (portadaInput) {
        portadaInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                archivoImagenGlobal = e.target.files[0];
                mostrarVistaPrevia(e.target.files[0]);
            }
        });
    }

    function mostrarVistaPrevia(file) {
        const reader = new FileReader();
        reader.onload = (e) => { imgPreview.src = e.target.result; previewContainer.style.display = 'block'; };
        reader.readAsDataURL(file);
    }

    if(selectTituloPapa) selectTituloPapa.addEventListener('change', aplicarFiltros);
    if(filtrarDestinatario) filtrarDestinatario.addEventListener('change', aplicarFiltros);
    if(filtrarFechaPapa) filtrarFechaPapa.addEventListener('change', aplicarFiltros);

    document.getElementById('cuentoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const titulo = document.getElementById('titulo').value.trim();
        const fecha = fechaInput ? fechaInput.value : hoy;
        const contenido = document.getElementById('contenido').value.trim();
        const destinatario = document.getElementById('destinatario').value;

        if (!archivoImagenGlobal) { alert('❌ Selecciona o pega una imagen de portada.'); return; }

        const preguntas = [
            document.getElementById('p1').value.trim(),
            document.getElementById('p2').value.trim(),
            document.getElementById('p3').value.trim(),
            document.getElementById('p4').value.trim(),
            document.getElementById('p5').value.trim()
        ];

        try {
            const nombreArchivo = `portada_${Date.now()}.png`;
            const { error: uploadError } = await window.supabaseClient.storage
                .from('portadas')
                .upload(nombreArchivo, archivoImagenGlobal);

            if (uploadError) throw uploadError;

            const { data: urlData } = window.supabaseClient.storage.from('portadas').getPublicUrl(nombreArchivo);

            const { error: insertError } = await window.supabaseClient.from('cuentos').insert([{
                titulo, contenido, fecha_publicacion: fecha, imagen_url: urlData.publicUrl, preguntas, destinatario
            }]);

            if (insertError) throw insertError;

            alert('¡Cuentazo guardado con éxito! 🚀');
            document.getElementById('cuentoForm').reset();
            previewContainer.style.display = 'none';
            archivoImagenGlobal = null;
            if (fechaInput) fechaInput.value = hoy;
            cargarHistorial();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    });

    async function cargarHistorial() {
        const contenedor = document.getElementById('historialContenedor');
        if (!contenedor) return;

        try {
            const { data: cuentos, error } = await window.supabaseClient
                .from('cuentos')
                .select('id, titulo, contenido, fecha_publicacion, preguntas, imagen_url, destinatario, respuestas_hijos(lector, pregunta_index, respuesta_texto, respuesta_archivo_url, tipo_archivo)')
                .order('fecha_publicacion', { ascending: false });

            if (error) throw error;
            todosLosCuentosGlobal = cuentos || [];
            
            if(selectTituloPapa) {
                const valorSeleccionadoPrevio = selectTituloPapa.value;
                selectTituloPapa.innerHTML = '<option value="Todos">👁️ Todos los cuentos</option>';
                todosLosCuentosGlobal.forEach(c => {
                    selectTituloPapa.innerHTML += `<option value="${c.titulo}">${c.titulo}</option>`;
                });
                if(valorSeleccionadoPrevio) selectTituloPapa.value = valorSeleccionadoPrevio;
            }

            aplicarFiltros();
        } catch (err) { contenedor.innerHTML = 'Error al cargar.'; }
    }

    function aplicarFiltros() {
        const contenedor = document.getElementById('historialContenedor');
        if (!contenedor) return;

        const cuentoSeleccionado = selectTituloPapa.value || 'Todos';
        const filtroDest = filtrarDestinatario.value;
        const fechaFiltro = filtrarFechaPapa.value;

        const cuentosFiltrados = todosLosCuentosGlobal.filter(c => {
            const coincideTitulo = (cuentoSeleccionado === 'Todos') || (c.titulo === cuentoSeleccionado);
            const coincideDest = (filtroDest === 'Todos') || (c.destinatario === filtroDest);
            const coincideFecha = !fechaFiltro || (c.fecha_publicacion === fechaFiltro);
            return coincideTitulo && coincideDest && coincideFecha;
        });

        if (cuentosFiltrados.length === 0) {
            contenedor.innerHTML = '<p style="color:#7f8c8d; padding:10px;">No se encontraron registros con esos filtros.</p>';
            return;
        }

        contenedor.innerHTML = '';
        cuentosFiltrados.forEach(c => {
            const card = document.createElement('div');
            card.style = "background:white; border:1px solid #e2e8f0; border-radius:8px; padding:15px; margin-bottom:15px; box-shadow:0 2px 5px rgba(0,0,0,0.02);";
            
            // 1. ANALIZAR QUIÉN RESPONDIÓ (Mapeo de respuestas de la subtabla)
            const respuestas = c.respuestas_hijos || [];
            const tieneRespuestasDe = (nombre) => respuestas.some(r => r.lector.toLowerCase() === nombre.toLowerCase());

            let estadoLectoresHtml = '';
            if (c.destinatario === 'Thommy' || c.destinatario === 'Ambos') {
                const respondio = tieneRespuestasDe('Thommy');
                estadoLectoresHtml += `<span style="background:${respondio ? '#2ecc71' : '#e74c3c'}; color:white; font-size:11px; padding:2px 8px; border-radius:10px; margin-right:5px; font-weight:bold;">👦 Thommy: ${respondio ? '✅ Respondió' : '⏳ Pendiente'}</span>`;
            }
            if (c.destinatario === 'Alma' || c.destinatario === 'Ambos') {
                const respondio = tieneRespuestasDe('Alma');
                estadoLectoresHtml += `<span style="background:${respondio ? '#2ecc71' : '#e74c3c'}; color:white; font-size:11px; padding:2px 8px; border-radius:10px; font-weight:bold;">👶 Alma: ${respondio ? '✅ Respondió' : '⏳ Pendiente'}</span>`;
            }

            // 2. CONSTRUIR VISTA DE PREGUNTAS Y RESPUESTAS AGRUPADAS POR PREGUNTA (Para el bloque expandible)
            let preguntasAgrupadasHtml = '';
            if (c.preguntas && c.preguntas.length > 0) {
                c.preguntas.forEach((pregunta, pIndex) => {
                    if (!pregunta) return; // Saltar campos vacíos si los hay

                    // Buscar respuestas de esta pregunta específica para Thommy y Alma
                    const respThommy = respuestas.find(r => r.pregunta_index === pIndex && r.lector.toLowerCase() === 'thommy');
                    const respAlma = respuestas.find(r => r.pregunta_index === pIndex && r.lector.toLowerCase() === 'alma');

                    // Función interna para renderizar el bloque multimedia de texto/audio/foto
                    const construirBloqueRespuesta = (r, colorFondo) => {
                        if (!r) return `<div style="background:${colorFondo}; padding:8px; border-radius:4px; font-size:13px; color:#7f8c8d; font-style:italic; border-left:3px solid #ccc;">Sin respuesta aún.</div>`;
                        
                        let archivoHtml = '';
                        if (r.respuesta_archivo_url) {
                            if (r.tipo_archivo === 'audio') {
                                archivoHtml = `<br><audio controls src="${r.respuesta_archivo_url}" style="margin-top:5px; height:28px; width:100%; max-width:240px;"></audio>`;
                            } else {
                                archivoHtml = `<br><img src="${r.respuesta_archivo_url}" class="thumbnail-img" style="max-height:80px; margin-top:5px; border-radius:4px; cursor:pointer;" onclick="event.stopPropagation(); abrirModal('${r.respuesta_archivo_url}')">`;
                            }
                        }
                        return `
                            <div style="background:${colorFondo}; padding:8px; border-radius:4px; font-size:13px; border-left:3px solid #34495e;">
                                💬 ${r.respuesta_texto || '<span style="color:#7f8c8d; font-style:italic;">Adjuntó archivo</span>'} ${archivoHtml}
                            </div>
                        `;
                    };

                    let bloquesRespuestaParalelos = '';
                    if (c.destinatario === 'Ambos') {
                        bloquesRespuestaParalelos = `
                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-top:5px;">
                                <div><b style="font-size:11px; color:#27ae60;">👦 Resp. Thommy:</b> ${construirBloqueRespuesta(respThommy, '#ebf5fb')}</div>
                                <div><b style="font-size:11px; color:#8e44ad;">👶 Resp. Alma:</b> ${construirBloqueRespuesta(respAlma, '#f5eef8')}</div>
                            </div>
                        `;
                    } else if (c.destinatario === 'Thommy') {
                        bloquesRespuestaParalelos = `<div style="margin-top:5px;"><b style="font-size:11px; color:#27ae60;">👦 Resp. Thommy:</b> ${construirBloqueRespuesta(respThommy, '#ebf5fb')}</div>`;
                    } else {
                        bloquesRespuestaParalelos = `<div style="margin-top:5px;"><b style="font-size:11px; color:#8e44ad;">👶 Resp. Alma:</b> ${construirBloqueRespuesta(respAlma, '#f5eef8')}</div>`;
                    }

                    preguntasAgrupadasHtml += `
                        <div style="margin-bottom:12px; background:#fcfcfc; padding:10px; border-radius:6px; border:1px solid #edf2f7;">
                            <div style="font-weight:bold; color:#2c3e50; font-size:13px;">❓ ${pIndex + 1}. ${pregunta}</div>
                            ${bloquesRespuestaParalelos}
                        </div>
                    `;
                });
            }

            // 3. ESTRUCTURA HTML DE LA FILA (RESUMEN + SECCIÓN EXPANDIBLE OCULTA)
            const detalleId = `detalle-cuento-${c.id}`;
            card.innerHTML = `
                <div style="display:flex; gap:15px; align-items:center; justify-content:space-between; cursor:pointer; flex-wrap:wrap;" onclick="toggleDetalleCuento('${detalleId}')">
                    <div style="display:flex; gap:12px; align-items:center;">
                        <img src="${c.imagen_url}" style="width:45px; height:45px; object-fit:cover; border-radius:6px; border:1px solid #e2e8f0;">
                        <div>
                            <h4 style="margin:0; color:#2c3e50; font-size:15px;">📖 ${c.titulo}</h4>
                            <span style="color:#7f8c8d; font-size:12px;">📅 ${c.fecha_publicacion}</span>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
                        ${estadoLectoresHtml}
                        <span id="flecha-${detalleId}" style="font-size:16px; color:#7f8c8d; margin-left:10px; transition:0.2s;">▼</span>
                    </div>
                </div>

                <div id="${detalleId}" style="display:none; margin-top:15px; border-top:1px dashed #cbd5e1; padding-top:15px;">
                    <div style="background:#f8fafc; border-radius:6px; padding:12px; margin-bottom:15px; font-size:13px; color:#475569; max-height:120px; overflow-y:auto; white-space:pre-wrap;">
                        <b>Cuerpo del cuento leído:</b><br>${c.contenido}
                    </div>
                    <h5 style="margin:0 0 10px 0; color:#e67e22; font-size:13px; font-weight:bold;">📊 Cuestionario y Respuestas de los Niños:</h5>
                    ${preguntasAgrupadasHtml}
                </div>
            `;
            contenedor.appendChild(card);
        });
    }

    // Función global para manejar el acordeón dinámico
    window.toggleDetalleCuento = function(id) {
        const elemento = document.getElementById(id);
        const flecha = document.getElementById(`flecha-${id}`);
        if (elemento.style.display === "none") {
            elemento.style.display = "block";
            if(flecha) flecha.style.transform = "rotate(180deg)";
        } else {
            elemento.style.display = "none";
            if(flecha) flecha.style.transform = "rotate(0deg)";
        }
    };

    window.abrirModal = function(url) {
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('imgModalTarget');
        modal.style.display = "flex";
        modalImg.src = url;
    };

    const closeModal = document.getElementById('closeModal');
    if(closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('imageModal').style.display = "none";
        });
    }
});