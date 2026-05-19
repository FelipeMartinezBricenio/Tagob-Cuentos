// js/papa.js
document.addEventListener('DOMContentLoaded', () => {
    const fechaInput = document.getElementById('fecha');
    const hoy = new Date().toISOString().split('T')[0];
    if (fechaInput) fechaInput.value = hoy;

    const portadaInput = document.getElementById('portada');
    const fotosCuerpoInput = document.getElementById('fotosCuerpo');
    const previewCuerpoContainer = document.getElementById('previewCuerpoContainer');
    const dropZone = document.getElementById('dropZone');
    const triggerFile = document.getElementById('triggerFile');
    const previewContainer = document.getElementById('previewContainer');
    const imgPreview = document.getElementById('imgPreview');
    const contenidoTextArea = document.getElementById('contenido'); // Cuadro de texto del cuento

    const selectTituloPapa = document.getElementById('selectTituloPapa');
    const filtrarDestinatario = document.getElementById('filtrarDestinatario');
    const filtrarFechaPapa = document.getElementById('filtrarFechaPapa');

    let archivoPortadaGlobal = null;
    let archivosCuerpoGlobal = []; 
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

    // =========================================================================
    // FUNCIÓN MEJORADA: CAPTURA ENFOQUE TOTAL PARA CTRL + V
    // =========================================================================
    const procesarPegadoEspecial = (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        let imagenDetectada = false;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                imagenDetectada = true;
                
                // Si no hay portada principal, el primer pegado la asigna
                if (!archivoPortadaGlobal) {
                    archivoPortadaGlobal = new File([blob], `portada_${Date.now()}.png`, { type: 'image/png' });
                    mostrarVistaPrevia(archivoPortadaGlobal);
                } else {
                    // Los siguientes pegados se acumulan en el cuerpo de forma ilimitada
                    const nuevoArchivoCuerpo = new File([blob], `cuerpo_${Date.now()}_${Math.floor(Math.random()*1000)}.png`, { type: 'image/png' });
                    archivosCuerpoGlobal.push(nuevoArchivoCuerpo);
                    actualizarVistaPreviaCuerpo();
                }
            }
        }
        // Si pegaste una imagen dentro del cuadro de texto, evitamos que pinte texto basura en el área
        if (imagenDetectada) { e.preventDefault(); }
    };

    // Escuchar el comando en toda la página, en el área de texto y en la zona de soltar archivos
    document.addEventListener('paste', procesarPegadoEspecial);
    if (contenidoTextArea) contenidoTextArea.addEventListener('paste', procesarPegadoEspecial);
    if (dropZone) dropZone.addEventListener('paste', procesarPegadoEspecial);

    function mostrarVistaPrevia(file) {
        const reader = new FileReader();
        reader.onload = (e) => { imgPreview.src = e.target.result; previewContainer.style.display = 'block'; };
        reader.readAsDataURL(file);
    }

    if (fotosCuerpoInput) {
        fotosCuerpoInput.addEventListener('change', (e) => {
            if (e.target.files) {
                const nuevosArchivos = Array.from(e.target.files);
                archivosCuerpoGlobal = archivosCuerpoGlobal.concat(nuevosArchivos);
                actualizarVistaPreviaCuerpo();
            }
        });
    }

    function actualizarVistaPreviaCuerpo() {
        if (!previewCuerpoContainer) return;
        previewCuerpoContainer.innerHTML = '';
        
        archivosCuerpoGlobal.forEach((file, index) => {
            const wrapper = document.createElement('div');
            wrapper.style = "position:relative; display:inline-block; margin:6px;";

            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.style = "width:75px; height:75px; object-fit:cover; border-radius:8px; border:2px solid #3498db;";
            
            const btnBorrar = document.createElement('span');
            btnBorrar.innerHTML = "&times;";
            btnBorrar.style = "position:absolute; top:-6px; right:-6px; background:#e74c3c; color:white; border-radius:50%; width:18px; height:18px; display:flex; justify-content:center; align-items:center; font-size:12px; cursor:pointer; font-weight:bold; box-shadow:0 1px 4px rgba(0,0,0,0.3);";
            btnBorrar.onclick = (e) => {
                e.stopPropagation();
                archivosCuerpoGlobal.splice(index, 1);
                actualizarVistaPreviaCuerpo();
            };

            wrapper.appendChild(img);
            wrapper.appendChild(btnBorrar);
            previewCuerpoContainer.appendChild(wrapper);
        });
    }
    // =========================================================================

    if(selectTituloPapa) selectTituloPapa.addEventListener('change', aplicarFiltros);
    if(filtrarDestinatario) filtrarDestinatario.addEventListener('change', aplicarFiltros);
    if(filtrarFechaPapa) filtrarFechaPapa.addEventListener('change', aplicarFiltros);

    document.getElementById('cuentoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const titulo = document.getElementById('titulo').value.trim();
        const contenido = document.getElementById('contenido').value.trim();
        const destinatario = document.getElementById('destinatario').value;
        const fecha = fechaInput ? fechaInput.value : hoy;

        if (!archivoPortadaGlobal) { alert('❌ Por favor añade una imagen de portada principal.'); return; }

        const preguntas = [
            document.getElementById('p1').value.trim(),
            document.getElementById('p2').value.trim(),
            document.getElementById('p3').value.trim(),
            document.getElementById('p4').value.trim(),
            document.getElementById('p5').value.trim()
        ];

        try {
            // 1. Guardar Portada en bucket "portadas"
            const nombreArchivoPortada = `portada_${Date.now()}.png`;
            const { error: uploadPortadaError } = await window.supabaseClient.storage
                .from('portadas')
                .upload(nombreArchivoPortada, archivoPortadaGlobal);

            if (uploadPortadaError) throw uploadPortadaError;
            const { data: urlDataPortada } = window.supabaseClient.storage.from('portadas').getPublicUrl(nombreArchivoPortada);
            const urlPortadaFinal = urlDataPortada.publicUrl;

            // 2. Guardar archivos del cuerpo en bucket "respuestas-hijos"
            let urlsImagenesCuerpo = [];
            for (let i = 0; i < archivosCuerpoGlobal.length; i++) {
                const file = archivosCuerpoGlobal[i];
                const nombreArchivoCuerpo = `cuerpo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.png`;
                
                const { error: uploadCuerpoError } = await window.supabaseClient.storage
                    .from('respuestas-hijos') // Corregido para usar tu bucket verificado
                    .upload(nombreArchivoCuerpo, file);
                
                if (uploadCuerpoError) throw uploadCuerpoError;
                
                const { data: urlDataCuerpo } = window.supabaseClient.storage.from('respuestas-hijos').getPublicUrl(nombreArchivoCuerpo);
                urlsImagenesCuerpo.push(urlDataCuerpo.publicUrl);
            }

            const { error: insertError } = await window.supabaseClient.from('cuentos').insert([{
                titulo, contenido, fecha_publicacion: fecha, imagen_url: urlPortadaFinal, preguntas, destinatario, imagenes_cuerpo: urlsImagenesCuerpo
            }]);

            if (insertError) throw insertError;

            alert('¡Libro ilustrado publicado con éxito! 🚀');
            document.getElementById('cuentoForm').reset();
            previewContainer.style.display = 'none';
            if (previewCuerpoContainer) previewCuerpoContainer.innerHTML = '';
            archivoPortadaGlobal = null;
            archivosCuerpoGlobal = [];
            if (fechaInput) fechaInput.value = hoy;
            cargarHistorial();

        } catch (err) { alert('Error al guardar cuento: ' + err.message); }
    });

    async function cargarHistorial() {
        const contenedor = document.getElementById('historialContenedor');
        if (!contenedor) return;

        try {
            const { data: cuentos, error } = await window.supabaseClient
                .from('cuentos')
                .select('id, titulo, contenido, fecha_publicacion, preguntas, imagen_url, destinatario, imagenes_cuerpo, respuestas_hijos(lector, pregunta_index, respuesta_texto, respuesta_archivo_url, tipo_archivo)')
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
        } catch (err) { contenedor.innerHTML = 'Error al cargar el historial.'; }
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
            card.style = "background:white; border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-bottom:15px; box-shadow:0 2px 8 rgba(0,0,0,0.04);";
            
            const respuestas = c.respuestas_hijos || [];
            const tieneRespuestasDe = (nombre) => respuestas.some(r => r.lector.toLowerCase() === nombre.toLowerCase());

            let estadoLectoresHtml = '';
            if (c.destinatario === 'Thommy' || c.destinatario === 'Ambos') {
                const respondio = tieneRespuestasDe('Thommy');
                estadoLectoresHtml += `<span style="background:${respondio ? '#2ecc71' : '#e74c3c'}; color:white; font-size:11px; padding:3px 8px; border-radius:20px; margin-right:5px; font-weight:bold; display:inline-block; margin-bottom:4px;">👦 Thommy: ${respondio ? '✅' : '⏳'}</span>`;
            }
            if (c.destinatario === 'Alma' || c.destinatario === 'Ambos') {
                const respondio = tieneRespuestasDe('Alma');
                estadoLectoresHtml += `<span style="background:${respondio ? '#2ecc71' : '#e74c3c'}; color:white; font-size:11px; padding:3px 8px; border-radius:20px; font-weight:bold; display:inline-block; margin-bottom:4px;">👶 Alma: ${respondio ? '✅' : '⏳'}</span>`;
            }

            let preguntasAgrupadasHtml = '';
            if (c.preguntas && c.preguntas.length > 0) {
                c.preguntas.forEach((pregunta, pIndex) => {
                    if (!pregunta) return;

                    const respThommy = respuestas.find(r => r.pregunta_index === pIndex && r.lector.toLowerCase() === 'thommy');
                    const respAlma = respuestas.find(r => r.pregunta_index === pIndex && r.lector.toLowerCase() === 'alma');

                    const construirBloqueRespuesta = (r, colorFondo) => {
                        if (!r) return `<div style="background:${colorFondo}; padding:8px; border-radius:6px; font-size:13px; color:#7f8c8d; font-style:italic; border-left:3px solid #ccc;">Sin respuesta aún.</div>`;
                        
                        let archivoHtml = '';
                        if (r.respuesta_archivo_url) {
                            if (r.tipo_archivo === 'audio') {
                                archivoHtml = `<br><audio controls src="${r.respuesta_archivo_url}" style="margin-top:5px; height:32px; width:100%; max-width:240px;"></audio>`;
                            } else {
                                archivoHtml = `<br><img src="${r.respuesta_archivo_url}" style="max-height:90px; margin-top:5px; border-radius:6px; cursor:pointer;" onclick="event.stopPropagation(); abrirModal('${r.respuesta_archivo_url}')">`;
                            }
                        }
                        return `
                            <div style="background:${colorFondo}; padding:10px; border-radius:6px; font-size:13px; border-left:3px solid #34495e;">
                                💬 ${r.respuesta_texto || '<span style="color:#7f8c8d; font-style:italic;">Adjuntó archivo</span>'} ${archivoHtml}
                            </div>
                        `;
                    };

                    let bloquesRespuestaParalelos = '';
                    if (c.destinatario === 'Ambos') {
                        bloquesRespuestaParalelos = `
                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:10px; margin-top:5px;">
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
                        <div style="margin-bottom:12px; background:#fcfcfc; padding:12px; border-radius:8px; border:1px solid #edf2f7;">
                            <div style="font-weight:bold; color:#2c3e50; font-size:13px; margin-bottom:5px;">❓ ${pIndex + 1}. ${pregunta}</div>
                            ${bloquesRespuestaParalelos}
                        </div>
                    `;
                });
            }

            let miniGaleriaCuerpoHtml = '';
            if (c.imagenes_cuerpo && c.imagenes_cuerpo.length > 0) {
                miniGaleriaCuerpoHtml = `<div style="display:flex; gap:6px; margin: 10px 0; flex-wrap:wrap;">`;
                c.imagenes_cuerpo.forEach(url => {
                    miniGaleriaCuerpoHtml += `<img src="${url}" style="width:55px; height:55px; object-fit:cover; border-radius:6px; border:1px solid #ddd; cursor:pointer;" onclick="event.stopPropagation(); abrirModal('${url}')">`;
                });
                miniGaleriaCuerpoHtml += `</div>`;
            }

            const detalleId = `detalle-cuento-${c.id}`;
            card.innerHTML = `
                <div style="display:flex; gap:15px; align-items:center; justify-content:space-between; cursor:pointer; flex-wrap:wrap;" onclick="toggleDetalleCuento('${detalleId}')">
                    <div style="display:flex; gap:12px; align-items:center; min-width:200px;">
                        <img src="${c.imagen_url}" style="width:50px; height:50px; object-fit:cover; border-radius:8px; border:1px solid #e2e8f0;">
                        <div>
                            <h4 style="margin:0; color:#2c3e50; font-size:15px;">📖 ${c.titulo}</h4>
                            <span style="color:#7f8c8d; font-size:11px;">📅 ${c.fecha_publicacion}</span>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
                        ${estadoLectoresHtml}
                        <span id="flecha-${detalleId}" style="font-size:16px; color:#7f8c8d; margin-left:10px; transition:0.2s;">▼</span>
                    </div>
                </div>

                <div id="${detalleId}" style="display:none; margin-top:15px; border-top:1px dashed #cbd5e1; padding-top:15px;">
                    <div style="background:#f8fafc; border-radius:8px; padding:12px; margin-bottom:10px; font-size:13px; color:#475569; max-height:150px; overflow-y:auto; white-space:pre-wrap; line-height:1.5;">
                        <b>Cuerpo del cuento leído:</b><br>${c.contenido}
                    </div>
                    ${miniGaleriaCuerpoHtml}
                    <h5 style="margin:15px 0 10px 0; color:#e67e22; font-size:13px; font-weight:bold;">📊 Cuestionario y Respuestas de los Niños:</h5>
                    ${preguntasAgrupadasHtml}
                </div>
            `;
            contenedor.appendChild(card);
        });
    }

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