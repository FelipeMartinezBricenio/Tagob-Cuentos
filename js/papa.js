// js/papa.js

// Variables de estado globales para que todo el archivo tenga acceso
let todosLosCuentosGlobal = [];
let archivoPortadaGlobal = null;
let archivosCuerpoGlobal = []; 
let contadorPreguntas = 0;

// 1. FUNCIONES DE NAVEGACIÓN GLOBAL (Disponibles inmediatamente para los botones del HTML)
window.cambiarPestaña = function(destino) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.seccion-panel').forEach(panel => panel.classList.remove('active'));

    if (destino === 'crear') {
        const btnCrear = document.querySelector("button[onclick*='crear']");
        if (btnCrear) btnCrear.classList.add('active');
        const secCrear = document.getElementById('seccionCrear');
        if (secCrear) secCrear.classList.add('active');
    } else if (destino === 'ver') {
        const btnVer = document.querySelector("button[onclick*='ver']");
        if (btnVer) btnVer.classList.add('active');
        const secVer = document.getElementById('seccionVer');
        if (secVer) secVer.classList.add('active');
        
        // Ejecuta la recarga del historial al pulsar la pestaña
        if (typeof window.cargarHistorialGlobal === 'function') {
            window.cargarHistorialGlobal();
        }
    }
};

window.toggleDetalleCuento = function(id) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.style.display = (elemento.style.display === "none" || elemento.style.display === "") ? "block" : "none";
    }
};

window.abrirModal = function(url) {
    const modal = document.getElementById('imageModal');
    const target = document.getElementById('imgModalTarget');
    if (modal && target) {
        modal.style.display = "flex";
        target.src = url;
    }
};


// 2. LOGICA DE INICIALIZACIÓN CUANDO EL HTML ESTÁ LISTO
document.addEventListener('DOMContentLoaded', () => {
    let supabase = window.supabaseClient;

    function obtenerClienteSupabase() {
        if (!supabase) supabase = window.supabaseClient;
        return supabase;
    }

    const fechaInput = document.getElementById('fecha');
    if (fechaInput) {
        fechaInput.value = new Date().toISOString().split('T')[0];
    }

    const portadaInput = document.getElementById('portada');
    const fotosCuerpoInput = document.getElementById('fotosCuerpo');
    const previewCuerpoContainer = document.getElementById('previewCuerpoContainer');
    const dropZone = document.getElementById('dropZone');
    const previewContainer = document.getElementById('previewContainer');
    const imgPreview = document.getElementById('imgPreview');

    const selectTituloPapa = document.getElementById('selectTituloPapa');
    const filtrarDestinatario = document.getElementById('filtrarDestinatario');
    const filtrarFechaPapa = document.getElementById('filtrarFechaPapa');
    const cuentoForm = document.getElementById('cuentoForm');
    const contenedorPreguntasDinamicas = document.getElementById('contenedorPreguntasDinamicas');
    const btnAgregarPregunta = document.getElementById('btnAgregarPregunta');

    // Inicializar cuestionario dinámico básico
    if (btnAgregarPregunta && contenedorPreguntasDinamicas) {
        btnAgregarPregunta.addEventListener('click', () => agregarNuevaPregunta());
        agregarNuevaPregunta(); 
    }

    function agregarNuevaPregunta() {
        if (!contenedorPreguntasDinamicas) return;
        
        const idPregunta = contadorPreguntas++;
        const divPregunta = document.createElement('div');
        divPregunta.className = 'bloque-pregunta-creada';
        divPregunta.id = `bloque_preg_${idPregunta}`;
        divPregunta.style = "background: rgba(248, 250, 252, 0.9); border: 1px solid #cbd5e1; padding: 15px; border-radius: 14px; margin-bottom: 15px; position: relative;";

        divPregunta.innerHTML = `
            <button type="button" class="btn-eliminar-preg" data-id="${idPregunta}" style="position: absolute; top: 12px; right: 12px; background: #ef4444; color: white; border: none; border-radius: 8px; padding: 5px 10px; cursor: pointer; font-size: 11px; font-weight: bold;">🗑️ Eliminar</button>
            <div style="margin-bottom: 10px; width: 80%;">
                <label style="font-size: 13px; font-weight: 700; color: #475569;">Pregunta:</label>
                <input type="text" class="input-enunciado-pregunta" placeholder="Ej. ¿De qué color era el dragón?" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box; font-size: 14px;" required>
            </div>
            <div style="margin-bottom: 5px;">
                <label style="font-size: 13px; font-weight: 700; color: #475569;">Tipo de formato:</label>
                <select class="select-tipo-pregunta" data-id="${idPregunta}" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; background: white;">
                    <option value="tradicional">📝 Abierta (Texto, Foto o Audio)</option>
                    <option value="multiple">🔢 Opción Múltiple (Alternativas)</option>
                </select>
            </div>
            <div id="zona_opciones_${idPregunta}" style="display: none; background: white; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; margin-top: 10px;">
                <label style="font-size: 12px; font-weight: bold; color: #4f46e5; display: block; margin-bottom: 5px;">Escribe las alternativas de respuesta:</label>
                <input type="text" class="opcion-item-${idPregunta}" placeholder="Alternativa A" style="width: 100%; padding: 7px; margin: 4px 0; border: 1px solid #e2e8f0; border-radius: 6px; box-sizing: border-box; font-size: 13px;">
                <input type="text" class="opcion-item-${idPregunta}" placeholder="Alternativa B" style="width: 100%; padding: 7px; margin: 4px 0; border: 1px solid #e2e8f0; border-radius: 6px; box-sizing: border-box; font-size: 13px;">
                <input type="text" class="opcion-item-${idPregunta}" placeholder="Alternativa C" style="width: 100%; padding: 7px; margin: 4px 0; border: 1px solid #e2e8f0; border-radius: 6px; box-sizing: border-box; font-size: 13px;">
                <input type="text" class="opcion-item-${idPregunta}" placeholder="Alternativa D" style="width: 100%; padding: 7px; margin: 4px 0; border: 1px solid #e2e8f0; border-radius: 6px; box-sizing: border-box; font-size: 13px;">
            </div>
        `;

        contenedorPreguntasDinamicas.appendChild(divPregunta);

        divPregunta.querySelector('.btn-eliminar-preg')?.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            document.getElementById(`bloque_preg_${id}`)?.remove();
        });

        divPregunta.querySelector('.select-tipo-pregunta')?.addEventListener('change', function() {
            const id = this.getAttribute('data-id');
            const zonaOpciones = document.getElementById(`zona_opciones_${id}`);
            if (zonaOpciones) zonaOpciones.style.display = this.value === 'multiple' ? 'block' : 'none';
        });
    }

    function recolectarPreguntasEstructuradas() {
        const bloques = document.querySelectorAll('.bloque-pregunta-creada');
        let preguntasArr = [];

        bloques.forEach(bloque => {
            const enunciadoInput = block => bloque.querySelector('.input-enunciado-pregunta');
            const enunciado = enunciadoInput(bloque);
            const tipoSelect = bloque.querySelector('.select-tipo-pregunta');
            
            if (enunciado && enunciado.value.trim() !== "") {
                const tipo = tipoSelect ? tipoSelect.value : 'tradicional';
                let objetoPregunta = { texto: enunciado.value.trim(), tipo: tipo };

                if (tipo === 'multiple') {
                    let opciones = [];
                    const idPregunta = tipoSelect.getAttribute('data-id');
                    const inputsOpciones = bloque.querySelectorAll(`.opcion-item-${idPregunta}`);
                    inputsOpciones.forEach(inp => {
                        if (inp.value.trim() !== "") opciones.push(inp.value.trim());
                    });
                    objetoPregunta.opciones = opciones;
                }
                preguntasArr.push(objetoPregunta);
            }
        });
        return preguntasArr;
    }

    // --- CARGA DE MULTIMEDIA INTERNA ---
    if (dropZone && portadaInput) {
        dropZone.addEventListener('click', () => portadaInput.click());
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.background = '#dcfce7'; });
        dropZone.addEventListener('dragleave', () => { dropZone.style.background = '#f0fdf4'; });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            if(e.dataTransfer.files.length > 0) procesarPortada(e.dataTransfer.files[0]);
        });
    }

    window.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                procesarPortada(item.getAsFile());
            }
        }
    });

    if (portadaInput) {
        portadaInput.addEventListener('change', (e) => {
            if(e.target.files.length > 0) procesarPortada(e.target.files[0]);
        });
    }

    function procesarPortada(file) {
        archivoPortadaGlobal = file;
        const reader = new FileReader();
        reader.onload = (event) => {
            if (imgPreview) imgPreview.src = event.target.result;
            if (previewContainer) previewContainer.style.display = 'block';
            if (dropZone) dropZone.innerText = "📸 ¡Portada cargada correctamente!";
        };
        reader.readAsDataURL(file);
    }

    if (fotosCuerpoInput) {
        fotosCuerpoInput.addEventListener('change', (e) => {
            archivosCuerpoGlobal = Array.from(e.target.files);
            if (previewCuerpoContainer) {
                previewCuerpoContainer.innerHTML = '';
                archivosCuerpoGlobal.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = document.createElement('img');
                        img.src = event.target.result;
                        img.className = 'preview-thumb';
                        previewCuerpoContainer.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                });
            }
        });
    }

    // --- SUBIDA A SUPABASE ---
    if (cuentoForm) {
        cuentoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const client = obtenerClienteSupabase();
            if (!client) return;

            const btn = e.target.querySelector('button[type="submit"]');
            if (btn) { btn.disabled = true; btn.innerText = "⚡ Publicando..."; }

            try {
                let urlPortada = "";
                if (archivoPortadaGlobal) {
                    const namePort = `portada_${Date.now()}_${archivoPortadaGlobal.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
                    await client.storage.from('cuentos-imagenes').upload(namePort, archivoPortadaGlobal);
                    urlPortada = client.storage.from('cuentos-imagenes').getPublicUrl(namePort).data.publicUrl;
                }

                let urlsCuerpo = [];
                for (let file of archivosCuerpoGlobal) {
                    const nameCuerpo = `cuerpo_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
                    await client.storage.from('cuentos-imagenes').upload(nameCuerpo, file);
                    urlsCuerpo.push(client.storage.from('cuentos-imagenes').getPublicUrl(nameCuerpo).data.publicUrl);
                }

                const payload = {
                    titulo: document.getElementById('titulo')?.value.trim() || 'Sin Título',
                    fecha_publicacion: document.getElementById('fecha')?.value || new Date().toISOString().split('T')[0],
                    contenido: document.getElementById('contenido')?.value.trim() || '',
                    destinatario: document.getElementById('destinatario')?.value || 'Ambos',
                    imagen_url: urlPortada,
                    imagenes_cuerpo: urlsCuerpo,
                    preguntas: recolectarPreguntasEstructuradas()
                };

                await client.from('cuentos').insert([payload]);
                alert("🚀 ¡Cuento publicado!");
                cuentoForm.reset();
                if (previewContainer) previewContainer.style.display = 'none';
                if (previewCuerpoContainer) previewCuerpoContainer.innerHTML = '';
                if (contenedorPreguntasDinamicas) contenedorPreguntasDinamicas.innerHTML = '';
                archivoPortadaGlobal = null; archivosCuerpoGlobal = []; contadorPreguntas = 0;
                if (fechaInput) fechaInput.value = new Date().toISOString().split('T')[0];
                agregarNuevaPregunta();

            } catch (error) {
                alert("Error: " + error.message);
            } finally {
                if (btn) { btn.disabled = false; btn.innerText = "🚀 Publicar Cuento Mágico"; }
            }
        });
    }

    // --- LOGICA INTERNA DEL HISTORIAL ---
    window.cargarHistorialGlobal = async function() {
        const contenedor = document.getElementById('historialContenedor');
        const client = obtenerClienteSupabase();
        if (!client || !contenedor) return;

        try {
            const { data: cuentos, error: errC } = await client.from('cuentos').select('*').order('fecha_publicacion', { ascending: false });
            if(errC) throw errC;
            const { data: respuestas, error: errR } = await client.from('respuestas_hijos').select('*');
            if(errR) throw errR;

            todosLosCuentosGlobal = cuentos || [];
            llenarFiltrosDeTitulos(todosLosCuentosGlobal);
            renderizarHistorialFiltrado(todosLosCuentosGlobal, respuestas || []);

        } catch (err) {
            contenedor.innerHTML = `<p style="color:red; padding:10px;">Error: ${err.message}</p>`;
        }
    };

    function llenarFiltrosDeTitulos(cuentos) {
        if (!selectTituloPapa) return;
        const opcionesPrevia = selectTituloPapa.value;
        selectTituloPapa.innerHTML = '<option value="Todos">👁️ Ver Todos los Cuentos</option>';
        const titulosUnicos = [...new Set(cuentos.map(c => c.titulo))];
        titulosUnicos.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t; opt.innerText = t;
            selectTituloPapa.appendChild(opt);
        });
        if(opcionesPrevia) selectTituloPapa.value = opcionesPrevia;
    }

    function renderizarHistorialFiltrado(cuentos, respuestas) {
        const contenedor = document.getElementById('historialContenedor');
        if (!contenedor) return;
        contenedor.innerHTML = '';

        const fTitulo = selectTituloPapa ? selectTituloPapa.value : 'Todos';
        const fDest = filtrarDestinatario ? filtrarDestinatario.value : 'Todos';
        const fFecha = filtrarFechaPapa ? filtrarFechaPapa.value : '';

        let filtrados = cuentos.filter(c => {
            if(fTitulo !== 'Todos' && c.titulo !== fTitulo) return false;
            if(fDest !== 'Todos' && c.destinatario !== fDest) return false;
            if(fFecha && c.fecha_publicacion !== fFecha) return false;
            return true;
        });

        if(filtrados.length === 0) {
            contenedor.innerHTML = '<p style="text-align:center;color:#64748b;padding:20px;">No hay cuentos con esos filtros.</p>';
            return;
        }

        filtrados.forEach(c => {
            const respuestasEsteCuento = respuestas.filter(r => r.cuento_id === c.id);
            const tieneThommy = respuestasEsteCuento.some(r => r.lector === 'Thommy');
            const tieneAlma = respuestasEsteCuento.some(r => r.lector === 'Alma');
            
            let checksHtml = "";
            if(c.destinatario === 'Ambos' || c.destinatario === 'Thommy') checksHtml += `<span>👦 Thommy: ${tieneThommy ? '✅ Respondió':'❌ Pendiente'}</span> `;
            if(c.destinatario === 'Ambos' || c.destinatario === 'Alma') checksHtml += `<span style="margin-left:10px;">👶 Alma: ${tieneAlma ? '✅ Respondió':'❌ Pendiente'}</span>`;

            let miniGaleriaCuerpoHtml = "";
            if (c.imagenes_cuerpo && c.imagenes_cuerpo.length > 0) {
                miniGaleriaCuerpoHtml = `<div style="display:flex; gap:8px; margin-top:10px; overflow-x:auto;">`;
                c.imagenes_cuerpo.forEach(urlImg => {
                    miniGaleriaCuerpoHtml += `<img src="${urlImg}" onclick="abrirModal('${urlImg}')" style="width:55px; height:55px; object-fit:cover; border-radius:8px; cursor:pointer;">`;
                });
                miniGaleriaCuerpoHtml += `</div>`;
            }

            let preguntasAgrupadasHtml = "";
            if(c.preguntas && c.preguntas.length > 0) {
                for(let idx = 0; idx < c.preguntas.length; idx++) {
                    const preguntaObj = c.preguntas[idx];
                    if(!preguntaObj) continue;

                    const esObjeto = typeof preguntaObj === 'object' && preguntaObj !== null;
                    const textoDeLaPregunta = esObjeto ? preguntaObj.texto : preguntaObj;
                    const tipoDeLaPregunta = esObjeto ? (preguntaObj.tipo || 'tradicional') : 'tradicional';

                    let detallesOpciones = "";
                    if(tipoDeLaPregunta === 'multiple' && preguntaObj.opciones) {
                        detallesOpciones = `<span style="display:block; font-size:11px; color:#6366f1;">[Opciones: ${preguntaObj.opciones.join(' | ')}]</span>`;
                    }

                    preguntasAgrupadasHtml += `<div style="margin-top:10px; background:#f8fafc; padding:10px; border-radius:10px; border-left:3px solid #6366f1;">
                        <b style="font-size:13px;">P${idx+1}: ${textoDeLaPregunta}</b>
                        ${detallesOpciones}`;
                    
                    const respuestasDeEstaP = respuestasEsteCuento.filter(r => r.pregunta_index === idx);
                    if(respuestasDeEstaP.length === 0) {
                        preguntasAgrupadasHtml += `<p style="font-size:12px; color:#94a3b8; margin:4px 0 0 0;">Nadie respondió aún.</p>`;
                    } else {
                        respuestasDeEstaP.forEach(resp => {
                            let archivoHtml = "";
                            if(resp.respuesta_archivo_url) {
                                if(resp.tipo_archivo === 'audio') {
                                    archivoHtml = `<br><audio controls src="${resp.respuesta_archivo_url}" style="height:32px; max-width:100%;"></audio>`;
                                } else {
                                    archivoHtml = `<br><img src="${resp.respuesta_archivo_url}" onclick="abrirModal('${resp.respuesta_archivo_url}')" style="max-width:100px; border-radius:8px;">`;
                                }
                            }
                            preguntasAgrupadasHtml += `<p style="font-size:12px; margin:4px 0 0 0;">
                                <b>${resp.lector}:</b> ${resp.respuesta_texto || '<i>[Sin texto]</i>'} ${archivoHtml}
                            </p>`;
                        });
                    }
                    preguntasAgrupadasHtml += `</div>`;
                }
            }

            const card = document.createElement('div');
            card.className = 'card';
            card.style = "background: white; border-radius: 16px; padding: 15px; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); text-align:left;";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="toggleDetalleCuento('det-${c.id}')">
                    <div>
                        <h4 style="margin:0; font-size:16px; color:#1e293b;">${c.titulo}</h4>
                        <small style="color:#64748b;">📅 ${c.fecha_publicacion} | 🎯 Destinatario: ${c.destinatario}</small>
                        <div style="margin-top:6px; font-size:12px; color:#334155;">${checksHtml}</div>
                    </div>
                    <span id="flecha-det-${c.id}">▼</span>
                </div>
                <div id="det-${c.id}" style="display:none; margin-top:15px; border-top:1px dashed #e2e8f0; padding-top:15px;">
                    ${c.imagen_url ? `<img src="${c.imagen_url}" onclick="abrirModal('${c.imagen_url}')" style="width:100%; max-height:140px; object-fit:cover; border-radius:12px; margin-bottom:10px;">` : ''}
                    <div style="font-size:13px; white-space:pre-wrap; background:#f1f5f9; padding:10px; border-radius:12px; color:#334155;">
                        ${c.contenido}
                    </div>
                    ${miniGaleriaCuerpoHtml}
                    ${preguntasAgrupadasHtml}
                </div>
            `;
            contenedor.appendChild(card);
        });
    }

    // Escuchadores de los select de filtrado
    [selectTituloPapa, filtrarDestinatario, filtrarFechaPapa].forEach(elem => {
        if (elem) {
            elem.addEventListener('change', async () => {
                const client = obtenerClienteSupabase();
                if (!client) return;
                const { data: respuestas } = await client.from('respuestas_hijos').select('*');
                renderizarHistorialFiltrado(todosLosCuentosGlobal, respuestas || []);
            });
        }
    });

    // Carga inicial automatica de datos en background
    setTimeout(() => {
        window.cargarHistorialGlobal();
    }, 200);
});