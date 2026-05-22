// js/papa.js
document.addEventListener('DOMContentLoaded', () => {
    // Declaramos la variable del cliente
    let supabase = window.supabaseClient;

    const fechaInput = document.getElementById('fecha');
    const hoy = new Date().toISOString().split('T')[0];
    if (fechaInput) fechaInput.value = hoy;

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

    let archivoPortadaGlobal = null;
    let archivosCuerpoGlobal = []; 
    let todosLosCuentosGlobal = [];

    // FUNCIÓN DE CONTROL: Asegura obtener el cliente de Supabase pase lo que pase
    function obtenerClienteSupabase() {
        if (!supabase) {
            supabase = window.supabaseClient;
        }
        return supabase;
    }

    // Retrasamos unos milisegundos la carga inicial para garantizar que conexion.js ya se ejecutó en el navegador
    setTimeout(() => {
        cargarHistorial();
    }, 150);

    // Navegación de Pestañas estilo App
    window.cambiarPestaña = function(destino) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.seccion-panel').forEach(panel => panel.classList.remove('active'));

        if(destino === 'crear') {
            const btnCrear = document.querySelector("button[onclick*='crear']");
            if(btnCrear) btnCrear.classList.add('active');
            const secCrear = document.getElementById('seccionCrear');
            if(secCrear) secCrear.classList.add('active');
        } else if(destino === 'ver') {
            const btnVer = document.querySelector("button[onclick*='ver']");
            if(btnVer) btnVer.classList.add('active');
            const secVer = document.getElementById('seccionVer');
            if(secVer) secVer.classList.add('active');
            cargarHistorial();
        } else if(destino === 'configuracion') {
            const btnConf = document.querySelector("button[onclick*='configuracion']");
            if(btnConf) btnConf.classList.add('active');
            const secConf = document.getElementById('seccionConfiguracion');
            if(secConf) secConf.classList.add('active');
        }
    };

    // --- LOGICA GESTIÓN PORTADA ---
    if (dropZone && portadaInput) {
        dropZone.addEventListener('click', () => portadaInput.click());
        
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.background = '#dcfce7'; });
        dropZone.addEventListener('dragleave', () => { dropZone.style.background = '#f0fdf4'; });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.background = '#f0fdf4';
            if(e.dataTransfer.files.length > 0) {
                procesarPortada(e.dataTransfer.files[0]);
            }
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

    // --- ILUSTRACIONES MÚLTIPLES PARA EL CUERPO ---
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

    // --- ENVÍO COMPLETO A SUPABASE ---
    if (cuentoForm) {
        cuentoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const client = obtenerClienteSupabase();
            if (!client) {
                alert("Error: No se pudo establecer conexión con Supabase. Reensa tu archivo conexion.js");
                return;
            }

            const btn = e.target.querySelector('button[type="submit"]');
            if (btn) {
                btn.disabled = true;
                btn.innerText = "⚡ Subiendo archivos y publicando...";
            }

            try {
                let urlPortada = "";
                if (archivoPortadaGlobal) {
                    const namePort = `portada_${Date.now()}_${archivoPortadaGlobal.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
                    const { error: errP } = await client.storage.from('cuentos-imagenes').upload(namePort, archivoPortadaGlobal);
                    if(errP) throw errP;
                    urlPortada = client.storage.from('cuentos-imagenes').getPublicUrl(namePort).data.publicUrl;
                }

                let urlsCuerpo = [];
                for (let file of archivosCuerpoGlobal) {
                    const nameCuerpo = `cuerpo_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
                    const { error: errC } = await client.storage.from('cuentos-imagenes').upload(nameCuerpo, file);
                    if(errC) throw errC;
                    const urlC = client.storage.from('cuentos-imagenes').getPublicUrl(nameCuerpo).data.publicUrl;
                    urlsCuerpo.push(urlC);
                }

                const p1 = document.getElementById('p1')?.value.trim();
                const p2 = document.getElementById('p2')?.value.trim();
                const p3 = document.getElementById('p3')?.value.trim();
                const p4 = document.getElementById('p4')?.value.trim();
                const p5 = document.getElementById('p5')?.value.trim();
                let preguntasArr = [];
                if(p1) preguntasArr.push(p1);
                if(p2) preguntasArr.push(p2);
                if(p3) preguntasArr.push(p3);
                if(p4) preguntasArr.push(p4);
                if(p5) preguntasArr.push(p5);

                const payload = {
                    titulo: document.getElementById('titulo').value.trim(),
                    fecha_publicacion: document.getElementById('fecha').value,
                    contenido: document.getElementById('contenido').value.trim(),
                    destinatario: document.getElementById('destinatario').value,
                    imagen_url: urlPortada,
                    imagenes_cuerpo: urlsCuerpo,
                    preguntas: preguntasArr
                };

                const { error: insertError } = await client.from('cuentos').insert([payload]);
                if (insertError) throw insertError;

                alert("🚀 ¡Cuento publicado perfectamente con todo su multimedia!");
                cuentoForm.reset();
                if (previewContainer) previewContainer.style.display = 'none';
                if (previewCuerpoContainer) previewCuerpoContainer.innerHTML = '';
                if (dropZone) dropZone.innerText = "📸 Arrastra, pega (Ctrl+V) o toca aquí para subir la Portada";
                archivoPortadaGlobal = null;
                archivosCuerpoGlobal = [];
                if (fechaInput) fechaInput.value = hoy;

            } catch (error) {
                alert("Error al guardar: " + error.message);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = "🚀 Publicar Cuento Mágico";
                }
            }
        });
    }

    // --- CARGAR HISTORIAL Y RESPUESTAS ---
    async function cargarHistorial() {
        const contenedor = document.getElementById('historialContenedor');
        const client = obtenerClienteSupabase();
        if (!client) {
            if (contenedor) contenedor.innerHTML = `<p style="color:#64748b; text-align:center;">Esperando conexión con la base de datos...</p>`;
            return;
        }
        try {
            const { data: cuentos, error: errC } = await client.from('cuentos').select('*').order('fecha_publicacion', { ascending: false });
            if(errC) throw errC;
            const { data: respuestas, error: errR } = await client.from('respuestas_hijos').select('*');
            if(errR) throw errR;

            todosLosCuentosGlobal = cuentos || [];
            llenarFiltrosDeTitulos(todosLosCuentosGlobal);
            renderizarHistorialFiltrado(todosLosCuentosGlobal, respuestas || []);

        } catch (err) {
            if (contenedor) contenedor.innerHTML = `<p style="color:red;">Error de conexión: ${err.message}</p>`;
        }
    }

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

    // Escuchadores de Filtro Dinámicos y Seguros
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
            contenedor.innerHTML = '<p style="text-align:center;color:#64748b;padding:20px;">No se encontraron cuentos con esos filtros.</p>';
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
                miniGaleriaCuerpoHtml = `<div style="display:flex; gap:8px; margin-top:10px; overflow-x:auto; padding-bottom:5px;">`;
                c.imagenes_cuerpo.forEach(urlImg => {
                    miniGaleriaCuerpoHtml += `<img src="${urlImg}" onclick="abrirModal('${urlImg}')" style="width:55px; height:55px; object-fit:cover; border-radius:8px; cursor:pointer; border:1px solid #cbd5e1;">`;
                });
                miniGaleriaCuerpoHtml += `</div>`;
            }

            let preguntasAgrupadasHtml = "";
            if(c.preguntas && c.preguntas.length > 0) {
                c.preguntas.forEach((preg, idx) => {
                    preguntasAgrupadasHtml += `<div style="margin-top:10px; background:#f8fafc; padding:10px; border-radius:10px; border-left:3px solid #6366f1;">
                        <b style="font-size:13px; color:#1e293b;">P${idx+1}: ${preg}</b>`;
                    
                    const respuestasDeEstaP = respuestasEsteCuento.filter(r => r.pregunta_index === idx);
                    if(respuestasDeEstaP.length === 0) {
                        preguntasAgrupadasHtml += `<p style="font-size:12px; color:#94a3b8; margin:4px 0 0 0;">Ninguno ha respondido aún.</p>`;
                    } else {
                        respuestasDeEstaP.forEach(resp => {
                            let archivoHtml = "";
                            if(resp.respuesta_archivo_url) {
                                if(resp.tipo_archivo === 'audio') {
                                    archivoHtml = `<br><audio controls src="${resp.respuesta_archivo_url}" style="margin-top:5px; height:32px; max-width:100%;"></audio>`;
                                } else if(resp.tipo_archivo === 'foto') {
                                    archivoHtml = `<br><img src="${resp.respuesta_archivo_url}" onclick="abrirModal('${resp.respuesta_archivo_url}')" style="max-width:100px; max-height:100px; object-fit:cover; border-radius:8px; margin-top:5px; cursor:pointer; border:1px solid #e2e8f0;">`;
                                }
                            }
                            preguntasAgrupadasHtml += `<p style="font-size:12px; margin:4px 0 0 0; color:#334155;">
                                <b>${resp.lector}:</b> ${resp.respuesta_texto || '<i>[Sin comentarios escritos]</i>'} ${archivoHtml}
                            </p>`;
                        });
                    }
                    preguntasAgrupadasHtml += `</div>`;
                });
            } else {
                preguntasAgrupadasHtml = `<p style="font-size:12px; color:#64748b;">Este cuento no tiene cuestionario configurado.</p>`;
            }

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="toggleDetalleCuento('det-${c.id}')">
                    <div>
                        <h4 style="margin:0 0 5px 0; font-size:16px; color:#1e293b;">${c.titulo}</h4>
                        <small style="color:#64748b;">📅 ${c.fecha_publicacion} | 🎯 Destinatario: <b>${c.destinatario}</b></small>
                        <div style="margin-top:6px; font-size:12px; color:#475569;">${checksHtml}</div>
                    </div>
                    <span id="flecha-det-${c.id}" style="font-size:18px; transition:0.3s; color:#6366f1;">▼</span>
                </div>
                <div id="det-${c.id}" style="display:none; margin-top:15px; border-top:1px dashed #e2e8f0; padding-top:15px;">
                    ${c.imagen_url ? `<img src="${c.imagen_url}" onclick="abrirModal('${c.imagen_url}')" style="width:100%; max-height:140px; object-fit:cover; border-radius:12px; margin-bottom:10px; cursor:pointer;">` : ''}
                    <div style="font-size:13px; color:#334155; max-height:150px; overflow-y:auto; white-space:pre-wrap; background:#f1f5f9; padding:10px; border-radius:12px;">
                        <b>Cuerpo del Cuento:</b><br>${c.contenido}
                    </div>
                    ${miniGaleriaCuerpoHtml}
                    <h5 style="margin:15px 0 5px 0; color:#4f46e5; font-size:13px; font-weight:bold;">📊 Respuestas y Actividades:</h5>
                    ${preguntasAgrupadasHtml}
                </div>
            `;
            contenedor.appendChild(card);
        });
    }

    window.toggleDetalleCuento = function(id) {
        const elemento = document.getElementById(id);
        const flecha = document.getElementById(`flecha-${id}`);
        if (elemento) {
            if (elemento.style.display === "none" || elemento.style.display === "") {
                elemento.style.display = "block";
                if(flecha) flecha.style.transform = "rotate(180deg)";
            } else {
                elemento.style.display = "none";
                if(flecha) flecha.style.transform = "rotate(0deg)";
            }
        }
    };

    window.abrirModal = function(url) {
        const modal = document.getElementById('imageModal');
        const target = document.getElementById('imgModalTarget');
        if(modal && target) {
            modal.style.display = "flex";
            target.src = url;
        }
    };

    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const modal = document.getElementById('imageModal');
            if(modal) modal.style.display = "none";
        });
    }

    // --- CONFIGURACIÓN DINÁMICA DE PERFILES ---
    window.guardarConfigHijo = async () => {
        const client = obtenerClienteSupabase();
        if (!client) return;
        const hijoSel = document.getElementById('hijoSelect');
        const fotoInput = document.getElementById('fotoHijoInput');
        const musicaInput = document.getElementById('musicaHijoInput');
        
        if(!hijoSel) return;
        const nombre = hijoSel.value;
        const foto = fotoInput ? fotoInput.files[0] : null;
        const musica = musicaInput ? musicaInput.files[0] : null;

        try {
            let fUrl = null; let mUrl = null;
            if(foto) {
                const nameF = `avatar_${nombre}_${Date.now()}.png`;
                await client.storage.from('perfiles').upload(nameF, foto, {upsert:true});
                fUrl = client.storage.from('perfiles').getPublicUrl(nameF).data.publicUrl;
            }
            if(musica) {
                const nameM = `musica_${nombre}_${Date.now()}.mp3`;
                await client.storage.from('perfiles').upload(nameM, musica, {upsert:true});
                mUrl = client.storage.from('perfiles').getPublicUrl(nameM).data.publicUrl;
            }

            const updatePayload = { nombre };
            if (fUrl) updatePayload.foto_url = fUrl;
            if (mUrl) updatePayload.musica_fondo_url = mUrl;

            await client.from('perfiles_hijos').upsert(updatePayload, { onConflict: 'nombre' });
            alert(`✅ ¡Perfil de ${nombre} guardado y actualizado con éxito!`);
            if(fotoInput) fotoInput.value = '';
            if(musicaInput) musicaInput.value = '';
        } catch(e) { 
            alert("Error al configurar perfil: " + e.message); 
        }
    };
});