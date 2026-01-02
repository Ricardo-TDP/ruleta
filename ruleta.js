/**
 * Ruleta de la Suerte - Controlador Principal
 * Carga opciones desde XML y gestiona el giro de la ruleta
 */

// Variables globales
let canvas, ctx;
let opciones = [];
let anguloActual = 0;
let estaGirando = false;
let animacionId = null;

// Constantes de configuración
const ARCHIVO_XML = 'opciones.xml';
const DURACION_GIRO_MIN = 3000; // 3 segundos mínimo
const DURACION_GIRO_MAX = 6000; // 6 segundos máximo
const VUELTAS_MIN = 5;
const VUELTAS_MAX = 10;

// Colores por defecto si el XML no especifica
const COLORES_POR_DEFECTO = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#FF6F61'
];

/**
 * Inicializa la aplicación cuando el DOM está listo
 */
document.addEventListener('DOMContentLoaded', () => {
    // Obtener referencias al DOM
    canvas = document.getElementById('ruletaCanvas');
    ctx = canvas.getContext('2d');

    // Referencias a botones
    const btnCentral = document.getElementById('btnCentral');
    const btnRecargar = document.getElementById('btnRecargar');
    const btnCerrarModal = document.getElementById('btnCerrarModal');

    // Configurar eventos - el botón central activa el giro
    btnCentral.addEventListener('click', iniciarGiro);
    btnRecargar.addEventListener('click', cargarOpcionesXML);
    btnCerrarModal.addEventListener('click', cerrarModal);

    // Centrar la ruleta inicialmente
    dibujarRuleta();

    // Cargar opciones desde XML
    cargarOpcionesXML();
});

/**
 * Carga las opciones desde el archivo XML
 */
async function cargarOpcionesXML() {
    const estadoCarga = document.getElementById('estadoCarga');
    const btnCentral = document.getElementById('btnCentral');

    estadoCarga.textContent = '🔄 Cargando opciones desde XML...';
    estadoCarga.className = 'info-carga';

    try {
        const respuesta = await fetch(ARCHIVO_XML);

        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        const textoXML = await respuesta.text();
        opciones = parsearXML(textoXML);

        if (opciones.length === 0) {
            throw new Error('No se encontraron opciones en el XML');
        }

        estadoCarga.textContent = `✅ ${opciones.length} opciones cargadas correctamente`;
        estadoCarga.className = 'info-carga exito';
        btnCentral.disabled = false;

        // Redibujar ruleta con nuevas opciones
        dibujarRuleta();

    } catch (error) {
        console.error('Error al cargar XML:', error);
        estadoCarga.textContent = `❌ Error: ${error.message}`;
        estadoCarga.className = 'info-carga error';
        btnCentral.disabled = true;
    }
}

/**
 * Parsea el contenido XML y extrae las opciones
 * @param {string} xmlTexto - Contenido del archivo XML
 * @returns {Array} Array de objetos con nombre, color y texto
 */
function parsearXML(xmlTexto) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlTexto, 'text/xml');
    const elementosOpcion = doc.querySelectorAll('opcion');

    const opcionesParseadas = [];

    elementosOpcion.forEach((elemento, indice) => {
        opcionesParseadas.push({
            nombre: elemento.getAttribute('nombre') || `Opción ${indice + 1}`,
            color: elemento.getAttribute('color') || COLORES_POR_DEFECTO[indice % COLORES_POR_DEFECTO.length],
            texto: elemento.textContent || elemento.getAttribute('nombre') || `Opción ${indice + 1}`
        });
    });

    return opcionesParseadas;
}

/**
 * Dibuja la ruleta en el canvas
 */
function dibujarRuleta() {
    if (opciones.length === 0) return;

    const centroX = canvas.width / 2;
    const centroY = canvas.height / 2;
    const radio = Math.min(centroX, centroY) - 20;
    const anguloPorSeccion = (2 * Math.PI) / opciones.length;

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar cada sección de la ruleta
    opciones.forEach((opcion, indice) => {
        const anguloInicio = anguloActual + (indice * anguloPorSeccion);
        const anguloFin = anguloInicio + anguloPorSeccion;

        // Dibujar sector circular
        ctx.beginPath();
        ctx.moveTo(centroX, centroY);
        ctx.arc(centroX, centroY, radio, anguloInicio, anguloFin);
        ctx.closePath();
        ctx.fillStyle = opcion.color;
        ctx.fill();

        // Añadir borde a la sección
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Dibujar texto
        ctx.save();
        ctx.translate(centroX, centroY);
        ctx.rotate(anguloInicio + anguloPorSeccion / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = obtenerColorTexto(opcion.color);
        ctx.font = 'bold 16px Arial';
        ctx.fillText(opcion.texto.substring(0, 15), radio - 30, 5);
        ctx.restore();
    });

    // Dibujar círculo central
    ctx.beginPath();
    ctx.arc(centroX, centroY, 40, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 3;
    ctx.stroke();
}

/**
 * Determina si el texto debe ser claro u oscuro basado en el color de fondo
 * @param {string} color - Color en formato hexadecimal
 * @returns {string} Color de texto apropiado
 */
function obtenerColorTexto(color) {
    // Convertir hexadecimal a RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calcular luminancia
    const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminancia > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Inicia el giro de la ruleta
 */
function iniciarGiro() {
    if (estaGirando || opciones.length === 0) return;

    estaGirando = true;
    const btnCentral = document.getElementById('btnCentral');
    btnCentral.disabled = true;
    btnCentral.classList.add('girando');

    // Calcular parámetros del giro
    const duracionGiro = randomRange(DURACION_GIRO_MIN, DURACION_GIRO_MAX);
    const numVueltas = randomRange(VUELTAS_MIN, VUELTAS_MAX);
    const anguloTotal = (numVueltas * 2 * Math.PI) + randomRange(0, 2 * Math.PI);
    const anguloInicio = anguloActual;
    const tiempoInicio = performance.now();

    // Función de animación con easing
    function animate(tiempoActual) {
        const tiempoTranscurrido = tiempoActual - tiempoInicio;
        const progreso = Math.min(tiempoTranscurrido / duracionGiro, 1);

        // Easing easeOutCubic para desaceleración suave
        const easing = 1 - Math.pow(1 - progreso, 3);

        anguloActual = anguloInicio + (anguloTotal * easing);

        dibujarRuleta();

        if (progreso < 1) {
            animacionId = requestAnimationFrame(animate);
        } else {
            finalizarGiro();
        }
    }

    animacionId = requestAnimationFrame(animate);
}

/**
 * Finaliza el giro y determina el ganador
 */
function finalizarGiro() {
    estaGirando = false;
    const btnCentral = document.getElementById('btnCentral');
    btnCentral.classList.remove('girando');

    // Normalizar ángulo
    anguloActual = anguloActual % (2 * Math.PI);

    // Calcular qué opción está en la posición ganadora (arriba)
    const anguloPorSeccion = (2 * Math.PI) / opciones.length;

    // El triángulo está en la parte superior (12 en punto), que corresponde a 3π/2 radianes
    // Necesitamos calcular qué segmento queda bajo el triángulo después de rotar
    let anguloPuntero = (3 * Math.PI / 2 - anguloActual) % (2 * Math.PI);
    if (anguloPuntero < 0) anguloPuntero += 2 * Math.PI;
    const indiceGanador = Math.floor(anguloPuntero / anguloPorSeccion);

    const opcionGanadora = opciones[indiceGanador];

    // Mostrar resultado
    mostrarResultado(opcionGanadora);

    // Habilitar botón nuevamente
    btnCentral.disabled = false;
}

/**
 * Muestra el resultado en un modal
 * @param {Object} opcionGanadora - Objeto con la información de la opción ganadora
 */
function mostrarResultado(opcionGanadora) {
    const modal = document.getElementById('modalResultado');
    const nombreGanador = document.getElementById('nombreGanador');
    const detalleGanador = document.getElementById('detalleGanador');

    nombreGanador.textContent = opcionGanadora.nombre;
    nombreGanador.style.color = opcionGanadora.color;
    detalleGanador.textContent = `"${opcionGanadora.texto}"`;

    modal.classList.add('mostrar');
}

/**
 * Cierra el modal de resultado
 */
function cerrarModal() {
    const modal = document.getElementById('modalResultado');
    modal.classList.remove('mostrar');
}

/**
 * Genera un número aleatorio en un rango
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {number} Número aleatorio en el rango
 */
function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

// Cerrar modal al hacer clic fuera de él
document.getElementById('modalResultado').addEventListener('click', (e) => {
    if (e.target.id === 'modalResultado') {
        cerrarModal();
    }
});