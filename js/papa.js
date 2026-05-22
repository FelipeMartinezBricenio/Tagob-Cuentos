// js/papa.js

// Variables de estado globales
let todosLosCuentosGlobal = [];
let archivoPortadaGlobal = null;
let archivosCuerpoGlobal = []; 
let contadorPreguntas = 0;

// 1. FUNCIONES DE NAVEGACIÓN GLOBAL
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

// 2. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    let supabase = window.supabaseClient;

    function obtenerClienteSupabase() {
        if (!supabase) supabase = window.supabaseClient;
        return supabase;
    }

    const fechaInput = document.getElementById('fecha');
    if (fechaInput) fechaInput.value = new Date().toISOString().split('T')[0];

    // Configuración de elementos del DOM
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
                <label style="font-size: 12px; font-weight: bold; color: #4f46e5; display: block; margin-bottom: 5px;">Escribe las alternativas:</label>
                <input type="text" class="opcion-item-${idPregunta}" placeholder="Alternativa A" style="width: 100%; padding: 7px; margin: 4px 0; border: 1px solid #e2e8f0; border-radius: 6px; box-sizing: border-box; font-size: 13px;">
                <input type="text" class="opcion-item-${idPregunta}" placeholder="Alternativa B" style="width: 100%; padding: 7px; margin: 4px 0; border: 1px solid #e2e8f0; border-radius: 6px; box-sizing: border-box; font-size: 13px;">
                <input type="text" class="opcion-item-${idPregunta}" placeholder="Alternativa C" style="width: 100%; padding: 7px; margin: 4px 0; border: 1px solid #e2e8f0; border-radius: 6px; box-sizing: border-box; font-size: 13px;">
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
            const enunciado = bloque.querySelector('.input-enunciado-pregunta');
            const tipoSelect = bloque.querySelector('.select-tipo-pregunta');
            
            if (enunciado && enunciado.value.trim() !== "") {
                const tipo = tipoSelect ? tipoSelect.value : 'tradicional';
                let objetoPregunta = { texto: enunciado.value.trim(), tipo: tipo };

                if (tipo === 'multiple') {
                    let opciones = [];
                    const idPregunta = tipoSelect.getAttribute('data-id');
                    bloque.querySelectorAll(`.opcion-item-${idPregunta}`).forEach(inp => {
                        if (inp.value.trim() !== "") opciones.push(inp.value.trim());
                    });
                    objetoPregunta.opciones = opciones;
                }
                preguntasArr.push(objetoPregunta);
            }
        });
        return preguntasArr;
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
                archivoPortadaGlobal = null; archivosCuerpoGlobal = []; contadorPreguntas = 0;
                agregarNuevaPregunta();
            } catch (error) {
                alert("Error: " + error.message);
            } finally {
                if (btn) { btn.disabled = false; btn.innerText = "🚀 Publicar Cuento Mágico"; }
            }
        });
    }

    // --- CARGA HISTORIAL ---
    window.cargarHistorialGlobal = async function() {
        const contenedor = document.getElementById('historialContenedor');
        const client = obtenerClienteSupabase();
        if (!client || !contenedor) return;

        try {
            const { data: cuentos } = await client.from('cuentos').select('*').order('fecha_publicacion', { ascending: false });
            const { data: respuestas } = await client.from('respuestas_hijos').select('*');
            todosLosCuentosGlobal = cuentos || [];
            llenarFiltrosDeTitulos(todosLosCuentosGlobal);
            renderizarHistorialFiltrado(todosLosCuentosGlobal, respuestas || []);
        } catch (err) {
            contenedor.innerHTML = `<p style="color:red; padding:10px;">Error: ${err.message}</p>`;
        }
    };

    function llenarFiltrosDeTitulos(cuentos) {
        if (!selectTituloPapa) return;
        selectTituloPapa.innerHTML = '<option value="Todos">👁️ Ver Todos los Cuentos</option>';
        [...new Set(cuentos.map(c => c.titulo))].forEach(t => {
            const opt = document.createElement('option');
            opt.value = t; opt.innerText = t;
            selectTituloPapa.appendChild(opt);
        });
    }

    function renderizarHistorialFiltrado(cuentos, respuestas) {
        const contenedor = document.getElementById('historialContenedor');
        if (!contenedor) return;
        contenedor.innerHTML = '';

        const fTitulo = selectTituloPapa?.value || 'Todos';
        const fDest = filtrarDestinatario?.value || 'Todos';
        const fFecha = filtrarFechaPapa?.value || '';

        const filtrados = cuentos.filter(c => {
            return (fTitulo === 'Todos' || c.titulo === fTitulo) &&
                   (fDest === 'Todos' || c.destinatario === fDest) &&
                   (!fFecha || c.fecha_publicacion === fFecha);
        });

        filtrados.forEach(c => {
            const res = respuestas.filter(r => r.cuento_id === c.id);
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div style="cursor:pointer;" onclick="toggleDetalleCuento('det-${c.id}')">
                    <h4>${c.titulo}</h4>
                    <small>📅 ${c.fecha_publicacion} | 🎯 ${c.destinatario}</small>
                </div>
                <div id="det-${c.id}" style="display:none; margin-top:10px;">
                    <p>${c.contenido}</p>
                </div>
            `;
            contenedor.appendChild(card);
        });
    }

    // Inicialización de listeners
    [selectTituloPapa, filtrarDestinatario, filtrarFechaPapa].forEach(el => {
        el?.addEventListener('change', window.cargarHistorialGlobal);
    });

    setTimeout(window.cargarHistorialGlobal, 200);
});