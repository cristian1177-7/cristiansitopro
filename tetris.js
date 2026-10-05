const canvas = document.getElementById("tetris");
const ctx = canvas.getContext("2d");

const holdCanvas = document.getElementById("holdCanvas");
const holdCtx = holdCanvas.getContext("2d");

const nextCanvas = document.getElementById("nextCanvas");
const nextCtx = nextCanvas.getContext("2d");

const scoreElement = document.getElementById("score");
const linesElement = document.getElementById("lines");

const startButton = document.getElementById("startButton");
const helpButton = document.getElementById("helpButton");
const setSelector = document.getElementById("setSelector");

const holdCard = document.getElementById("holdCard");

const helpModal = document.getElementById("helpModal");
const gameOverModal = document.getElementById("gameOverModal");

const bestScoreElement = document.getElementById("bestScore");
const historyList = document.getElementById("historyList");


// =====================================================
// CONFIGURACIÓN
// =====================================================

const FILAS = 20;
const COLUMNAS = 10;
const TAMANO_BLOQUE = 30;
const TAMANO_MINI = 24;

const CLAVE_HISTORIAL = "tetris_grupo6_historial";
const MAX_HISTORIAL_GUARDADO = 50;
const MAX_HISTORIAL_VISIBLE = 10;

let tablero = [];

let piezaActual = null;

let siguienteTipo = null;

let piezaGuardada = null;

let puedeGuardar = true;

let intervaloCaida = null;

let juegoActivo = false;

let modalesAbiertos = 0;

let puntuacion = 0;

let lineas = 0;


// =====================================================
// PIEZAS
// =====================================================

const piezas = {

    I: [
        [1, 1, 1, 1]
    ],

    O: [
        [1, 1],
        [1, 1]
    ],

    T: [
        [0, 1, 0],
        [1, 1, 1]
    ],

    L: [
        [1, 0, 0],
        [1, 1, 1]
    ],

    J: [
        [0, 0, 1],
        [1, 1, 1]
    ],

    S: [
        [0, 1, 1],
        [1, 1, 0]
    ],

    Z: [
        [1, 1, 0],
        [0, 1, 1]
    ]
};


// =====================================================
// CREAR TABLERO
// =====================================================

function crearTablero() {

    tablero = [];

    for (let fila = 0; fila < FILAS; fila++) {

        tablero[fila] = [];

        for (let columna = 0; columna < COLUMNAS; columna++) {

            tablero[fila][columna] = 0;
        }
    }
}


// =====================================================
// OBTENER COLORES DESDE CSS (con caché por set)
// =====================================================

let cacheColores = {};

function obtenerColor(tipo) {

    if (!cacheColores[tipo]) {

        cacheColores[tipo] =
            getComputedStyle(document.body)
                .getPropertyValue(`--piece-${tipo}`)
                .trim() || "#ffffff";
    }

    return cacheColores[tipo];
}


function obtenerColorCuadricula() {

    if (!cacheColores.cuadricula) {

        cacheColores.cuadricula =
            getComputedStyle(document.body)
                .getPropertyValue("--grid-color")
                .trim() || "rgba(255,255,255,0.08)";
    }

    return cacheColores.cuadricula;
}


// =====================================================
// DIBUJAR BLOQUE (sirve para el tablero y los mini paneles)
// =====================================================

function dibujarBloque(
    contexto,
    columna,
    fila,
    color,
    tam = TAMANO_BLOQUE,
    offsetX = 0,
    offsetY = 0
) {

    const k = tam / 30;

    const x = offsetX + columna * tam;
    const y = offsetY + fila * tam;

    contexto.fillStyle = color;

    contexto.fillRect(x, y, tam, tam);


    contexto.strokeStyle = "rgba(0, 0, 0, 0.35)";

    contexto.lineWidth = 2 * k;

    contexto.strokeRect(
        x + k,
        y + k,
        tam - 2 * k,
        tam - 2 * k
    );


    // Brillo superior

    contexto.fillStyle = "rgba(255,255,255,0.20)";

    contexto.fillRect(
        x + 3 * k,
        y + 3 * k,
        tam - 6 * k,
        4 * k
    );
}


// =====================================================
// DIBUJAR TABLERO
// =====================================================

function dibujarTablero() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let fila = 0; fila < FILAS; fila++) {

        for (let columna = 0; columna < COLUMNAS; columna++) {

            const tipo = tablero[fila][columna];

            if (tipo !== 0) {

                dibujarBloque(
                    ctx,
                    columna,
                    fila,
                    obtenerColor(tipo)
                );
            }
        }
    }

    dibujarCuadricula();
}


// =====================================================
// DIBUJAR CUADRÍCULA
// =====================================================

function dibujarCuadricula() {

    ctx.strokeStyle = obtenerColorCuadricula();

    ctx.lineWidth = 1;

    for (let fila = 0; fila <= FILAS; fila++) {

        ctx.beginPath();

        ctx.moveTo(0, fila * TAMANO_BLOQUE);

        ctx.lineTo(canvas.width, fila * TAMANO_BLOQUE);

        ctx.stroke();
    }

    for (let columna = 0; columna <= COLUMNAS; columna++) {

        ctx.beginPath();

        ctx.moveTo(columna * TAMANO_BLOQUE, 0);

        ctx.lineTo(columna * TAMANO_BLOQUE, canvas.height);

        ctx.stroke();
    }
}


// =====================================================
// MINI PANELES (SIGUIENTE Y GUARDADA)
// =====================================================

function dibujarMini(contexto, lienzo, tipo) {

    contexto.clearRect(0, 0, lienzo.width, lienzo.height);

    if (!tipo) {
        return;
    }

    const forma = piezas[tipo];

    const ancho = forma[0].length * TAMANO_MINI;
    const alto = forma.length * TAMANO_MINI;

    const offsetX = (lienzo.width - ancho) / 2;
    const offsetY = (lienzo.height - alto) / 2;

    const color = obtenerColor(tipo);

    for (let fila = 0; fila < forma.length; fila++) {

        for (let columna = 0; columna < forma[fila].length; columna++) {

            if (forma[fila][columna] === 1) {

                dibujarBloque(
                    contexto,
                    columna,
                    fila,
                    color,
                    TAMANO_MINI,
                    offsetX,
                    offsetY
                );
            }
        }
    }
}


function dibujarPaneles() {

    dibujarMini(nextCtx, nextCanvas, siguienteTipo);

    dibujarMini(holdCtx, holdCanvas, piezaGuardada);

    holdCard.classList.toggle("bloqueado", !puedeGuardar);
}


// =====================================================
// CREAR PIEZA
// =====================================================

function tipoAleatorio() {

    const tipos = Object.keys(piezas);

    return tipos[Math.floor(Math.random() * tipos.length)];
}


// Devuelve el tipo de la pieza que sigue y prepara una nueva

function tomarSiguiente() {

    const tipo = siguienteTipo || tipoAleatorio();

    siguienteTipo = tipoAleatorio();

    return tipo;
}


function crearPieza(tipo) {

    piezaActual = {

        tipo: tipo,

        forma: piezas[tipo].map(fila => [...fila]),

        x: Math.floor((COLUMNAS - piezas[tipo][0].length) / 2),

        y: 0
    };

    // Comprobar Game Over

    if (hayColision(piezaActual, 0, 0)) {

        terminarJuego();
    }
}


// =====================================================
// DIBUJAR PIEZA
// =====================================================

function dibujarPieza() {

    if (!piezaActual) {
        return;
    }

    const color = obtenerColor(piezaActual.tipo);

    for (let fila = 0; fila < piezaActual.forma.length; fila++) {

        for (
            let columna = 0;
            columna < piezaActual.forma[fila].length;
            columna++
        ) {

            if (piezaActual.forma[fila][columna] === 1) {

                const x = piezaActual.x + columna;

                const y = piezaActual.y + fila;

                if (y >= 0) {

                    dibujarBloque(ctx, x, y, color);
                }
            }
        }
    }
}


// =====================================================
// DIBUJAR TODO
// =====================================================

function dibujarTodo() {

    dibujarTablero();

    dibujarPieza();

    dibujarPaneles();
}


// =====================================================
// COMPROBAR COLISIÓN
// =====================================================

function hayColision(
    pieza,
    movimientoX,
    movimientoY,
    nuevaForma = pieza.forma
) {

    for (let fila = 0; fila < nuevaForma.length; fila++) {

        for (
            let columna = 0;
            columna < nuevaForma[fila].length;
            columna++
        ) {

            if (nuevaForma[fila][columna] === 0) {
                continue;
            }

            const nuevaX = pieza.x + columna + movimientoX;

            const nuevaY = pieza.y + fila + movimientoY;

            // Lados

            if (nuevaX < 0 || nuevaX >= COLUMNAS) {
                return true;
            }

            // Fondo

            if (nuevaY >= FILAS) {
                return true;
            }

            // Piezas colocadas

            if (nuevaY >= 0 && tablero[nuevaY][nuevaX] !== 0) {
                return true;
            }
        }
    }

    return false;
}


// =====================================================
// MOVER PIEZA
// =====================================================

function moverPieza(direccion) {

    if (!juegoActivo || !piezaActual) {
        return;
    }

    if (!hayColision(piezaActual, direccion, 0)) {

        piezaActual.x += direccion;
    }

    dibujarTodo();
}


// =====================================================
// BAJAR PIEZA
// =====================================================

function bajarPieza() {

    if (!juegoActivo || !piezaActual) {
        return;
    }

    if (!hayColision(piezaActual, 0, 1)) {

        piezaActual.y++;

    } else {

        fijarPieza();

        eliminarLineas();

        puedeGuardar = true;

        crearPieza(tomarSiguiente());
    }

    dibujarTodo();
}


// =====================================================
// GUARDAR PIEZA (HOLD)
// =====================================================

function guardarPieza() {

    if (!juegoActivo || !piezaActual || !puedeGuardar) {
        return;
    }

    const tipoActual = piezaActual.tipo;

    puedeGuardar = false;

    if (piezaGuardada === null) {

        // Primera vez: se guarda y entra la siguiente

        piezaGuardada = tipoActual;

        crearPieza(tomarSiguiente());

    } else {

        // Intercambio con la pieza guardada

        const tipoRecuperado = piezaGuardada;

        piezaGuardada = tipoActual;

        crearPieza(tipoRecuperado);
    }

    dibujarTodo();
}


// =====================================================
// FIJAR PIEZA
// =====================================================

function fijarPieza() {

    for (let fila = 0; fila < piezaActual.forma.length; fila++) {

        for (
            let columna = 0;
            columna < piezaActual.forma[fila].length;
            columna++
        ) {

            if (piezaActual.forma[fila][columna] === 1) {

                const x = piezaActual.x + columna;

                const y = piezaActual.y + fila;

                if (y >= 0 && y < FILAS && x >= 0 && x < COLUMNAS) {

                    // Se guarda el tipo para que el color siga al set

                    tablero[y][x] = piezaActual.tipo;
                }
            }
        }
    }
}


// =====================================================
// ROTAR MATRIZ
// =====================================================

function rotarMatriz(matriz) {

    const filas = matriz.length;

    const columnas = matriz[0].length;

    const nuevaMatriz = [];

    for (let columna = 0; columna < columnas; columna++) {

        nuevaMatriz[columna] = [];

        for (let fila = filas - 1; fila >= 0; fila--) {

            nuevaMatriz[columna].push(matriz[fila][columna]);
        }
    }

    return nuevaMatriz;
}


// =====================================================
// ROTAR PIEZA
// =====================================================

function rotarPieza() {

    if (!juegoActivo || !piezaActual) {
        return;
    }

    const formaAnterior = piezaActual.forma;

    const xAnterior = piezaActual.x;

    piezaActual.forma = rotarMatriz(piezaActual.forma);

    // Intentar corregir posición cuando está cerca de un borde

    if (hayColision(piezaActual, 0, 0)) {

        if (!hayColision(piezaActual, -1, 0)) {

            piezaActual.x--;

        } else if (!hayColision(piezaActual, 1, 0)) {

            piezaActual.x++;

        } else {

            piezaActual.forma = formaAnterior;

            piezaActual.x = xAnterior;
        }
    }

    dibujarTodo();
}


// =====================================================
// ELIMINAR LÍNEAS
// =====================================================

function eliminarLineas() {

    let lineasEliminadas = 0;

    for (let fila = FILAS - 1; fila >= 0; fila--) {

        const lineaCompleta = tablero[fila].every(celda => celda !== 0);

        if (lineaCompleta) {

            tablero.splice(fila, 1);

            tablero.unshift(Array(COLUMNAS).fill(0));

            lineasEliminadas++;

            fila++;
        }
    }

    if (lineasEliminadas > 0) {

        actualizarPuntuacion(lineasEliminadas);
    }
}


// =====================================================
// ACTUALIZAR PUNTUACIÓN
// =====================================================

function actualizarPuntuacion(lineasEliminadas) {

    const puntos = {
        1: 100,
        2: 300,
        3: 500,
        4: 800
    };

    puntuacion += puntos[lineasEliminadas] || 0;

    lineas += lineasEliminadas;

    scoreElement.textContent = puntuacion;

    linesElement.textContent = lineas;
}


// =====================================================
// HISTORIAL DE PUNTAJES (localStorage)
// =====================================================

function leerHistorial() {

    try {

        const datos = JSON.parse(
            localStorage.getItem(CLAVE_HISTORIAL)
        );

        return Array.isArray(datos) ? datos : [];

    } catch (error) {

        return [];
    }
}


function escribirHistorial(historial) {

    try {

        localStorage.setItem(
            CLAVE_HISTORIAL,
            JSON.stringify(historial)
        );

    } catch (error) {

        // Si el navegador bloquea el almacenamiento, el juego sigue igual
    }
}


function mejorPuntaje(historial) {

    return historial.reduce(
        (mejor, partida) => Math.max(mejor, partida.puntos),
        0
    );
}


function guardarPuntaje() {

    const historial = leerHistorial();

    const mejorAnterior = mejorPuntaje(historial);

    historial.push({
        puntos: puntuacion,
        lineas: lineas,
        set: setSelector.options[setSelector.selectedIndex].text,
        fecha: Date.now()
    });

    escribirHistorial(
        historial.slice(-MAX_HISTORIAL_GUARDADO)
    );

    mostrarHistorial();

    return puntuacion > 0 && puntuacion > mejorAnterior;
}


function mostrarHistorial() {

    const historial = leerHistorial();

    const mejor = mejorPuntaje(historial);

    bestScoreElement.textContent = mejor;

    historyList.innerHTML = "";

    if (historial.length === 0) {

        const vacio = document.createElement("li");

        vacio.className = "history-empty";

        vacio.textContent = "Aún no hay partidas guardadas.";

        historyList.appendChild(vacio);

        return;
    }

    historial
        .slice(-MAX_HISTORIAL_VISIBLE)
        .reverse()
        .forEach(function(partida) {

            const item = document.createElement("li");

            const izquierda = document.createElement("span");

            const fecha = new Date(partida.fecha);

            const textoFecha =
                fecha.toLocaleDateString("es", {
                    day: "2-digit",
                    month: "short"
                }) +
                " " +
                fecha.toLocaleTimeString("es", {
                    hour: "2-digit",
                    minute: "2-digit"
                });

            const meta = document.createElement("span");

            meta.className = "h-meta";

            meta.textContent =
                textoFecha +
                " · " +
                partida.lineas +
                " líneas · " +
                partida.set;

            izquierda.appendChild(meta);

            const puntos = document.createElement("span");

            puntos.className = "h-score";

            puntos.textContent =
                (partida.puntos === mejor && mejor > 0 ? "★ " : "") +
                partida.puntos;

            item.appendChild(izquierda);

            item.appendChild(puntos);

            historyList.appendChild(item);
        });
}


function borrarHistorial() {

    if (!confirm("¿Borrar todo el historial de puntajes?")) {
        return;
    }

    escribirHistorial([]);

    mostrarHistorial();
}


// =====================================================
// VENTANAS EMERGENTES
// =====================================================

function abrirModal(modal) {

    if (!modal.hidden) {
        return;
    }

    modal.hidden = false;

    modalesAbiertos++;

    // Pausa la caída mientras haya una ventana abierta

    if (intervaloCaida) {

        clearInterval(intervaloCaida);

        intervaloCaida = null;
    }
}


function cerrarModal(modal) {

    if (modal.hidden) {
        return;
    }

    modal.hidden = true;

    modalesAbiertos = Math.max(0, modalesAbiertos - 1);

    if (modalesAbiertos === 0 && juegoActivo) {

        iniciarCaida();
    }
}


// =====================================================
// GAME OVER
// =====================================================

function terminarJuego() {

    juegoActivo = false;

    if (intervaloCaida) {

        clearInterval(intervaloCaida);

        intervaloCaida = null;
    }

    dibujarTodo();

    const esRecord = guardarPuntaje();

    document.getElementById("finalScore").textContent = puntuacion;

    document.getElementById("finalLines").textContent = lineas;

    document.getElementById("recordMsg").hidden = !esRecord;

    startButton.textContent = "Iniciar Juego";

    setTimeout(function() {

        abrirModal(gameOverModal);

    }, 150);
}


// =====================================================
// CAÍDA AUTOMÁTICA
// =====================================================

function iniciarCaida() {

    if (intervaloCaida) {

        clearInterval(intervaloCaida);
    }

    intervaloCaida = setInterval(function() {

        bajarPieza();

    }, 700);
}


// =====================================================
// INICIAR JUEGO
// =====================================================

function iniciarJuego() {

    // Si se reinicia a mitad de partida, se guarda el puntaje

    if (juegoActivo && puntuacion > 0) {

        guardarPuntaje();
    }

    if (intervaloCaida) {

        clearInterval(intervaloCaida);

        intervaloCaida = null;
    }

    crearTablero();

    puntuacion = 0;

    lineas = 0;

    scoreElement.textContent = "0";

    linesElement.textContent = "0";

    piezaGuardada = null;

    puedeGuardar = true;

    siguienteTipo = tipoAleatorio();

    juegoActivo = true;

    crearPieza(tomarSiguiente());

    dibujarTodo();

    if (juegoActivo && modalesAbiertos === 0) {

        iniciarCaida();
    }

    startButton.textContent = "Reiniciar Juego";

    startButton.blur();
}


// =====================================================
// CAMBIAR SET
// =====================================================

function cambiarSet() {

    document.body.className = `set-${setSelector.value}`;

    cacheColores = {};

    setSelector.blur();

    dibujarTodo();
}


// =====================================================
// ACCIONES (teclado y botones táctiles)
// =====================================================

function ejecutarAccion(accion) {

    if (!juegoActivo || modalesAbiertos > 0) {
        return;
    }

    switch (accion) {

        case "izquierda":
            moverPieza(-1);
            break;

        case "derecha":
            moverPieza(1);
            break;

        case "abajo":
            bajarPieza();
            break;

        case "rotar":
            rotarPieza();
            break;

        case "guardar":
            guardarPieza();
            break;
    }
}


// =====================================================
// CONTROLES DEL TECLADO
// =====================================================

const teclas = {
    ArrowLeft: "izquierda",
    ArrowRight: "derecha",
    ArrowDown: "abajo",
    ArrowUp: "rotar",
    c: "guardar",
    C: "guardar",
    Shift: "guardar"
};

document.addEventListener("keydown", function(event) {

    if (event.key === "Escape") {

        cerrarModal(helpModal);

        return;
    }

    const accion = teclas[event.key];

    if (!accion || !juegoActivo || modalesAbiertos > 0) {
        return;
    }

    event.preventDefault();

    if (event.repeat && accion === "guardar") {
        return;
    }

    ejecutarAccion(accion);
});


// Botones táctiles

document.querySelectorAll("[data-accion]").forEach(function(boton) {

    boton.addEventListener("pointerdown", function(event) {

        event.preventDefault();

        ejecutarAccion(boton.dataset.accion);
    });
});


// =====================================================
// EVENTOS
// =====================================================

startButton.addEventListener("click", iniciarJuego);

setSelector.addEventListener("change", cambiarSet);

helpButton.addEventListener("click", function() {

    abrirModal(helpModal);
});

document.getElementById("closeHelp").addEventListener("click", function() {

    cerrarModal(helpModal);
});

// Cerrar la ayuda al hacer clic fuera de la caja

helpModal.addEventListener("click", function(event) {

    if (event.target === helpModal) {

        cerrarModal(helpModal);
    }
});

document.getElementById("playAgain").addEventListener("click", function() {

    cerrarModal(gameOverModal);

    iniciarJuego();
});

document.getElementById("clearHistory").addEventListener("click", borrarHistorial);


// =====================================================
// INICIALIZACIÓN
// =====================================================

crearTablero();

document.body.className = "set-clasico";

dibujarTablero();

mostrarHistorial();

// Ventana de ayuda al abrir la página

helpModal.hidden = true;

abrirModal(helpModal);
