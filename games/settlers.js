/* CHASER SETTLERS - SEPARATE GAME FILE
Mobile-optimized Hex Resource Game
1-4 players, synced rooms, SVG Pinch/Zoom board
*/
;(function () {
"use strict";

const MAX_PLAYERS = 4;
const HEX_SIZE = 48; // Size of the hexes in the SVG
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;

const RESOURCES = [
    'desert',
    'wood', 'wood', 'wood', 'wood',
    'sheep', 'sheep', 'sheep', 'sheep',
    'wheat', 'wheat', 'wheat', 'wheat',
    'brick', 'brick', 'brick',
    'ore', 'ore', 'ore'
];

const TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
const PORTS = ['3:1', '3:1', '3:1', '3:1', 'wood', 'sheep', 'wheat', 'brick', 'ore'];

const COLORS = {
    wood: '#2d6a30', sheep: '#90ee90', wheat: '#ffd700', 
    brick: '#b22222', ore: '#808080', desert: '#eedd82',
    ocean: '#4da6ff'
};

function getMyId() {
    if (typeof window.myId === "function") return window.myId();
    if (typeof window.myId === "string") return window.myId;
    return localStorage.getItem("rider_id") || "local-player";
}

function myName() {
    const input = document.getElementById("username");
    return (input && input.value.trim()) || localStorage.getItem("rider_saved_name") || "Player";
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function shuffle(array) {
    let arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Generates the randomized board layout
function generateBoard() {
    const shuffledRes = shuffle(RESOURCES);
    const shuffledTok = shuffle(TOKENS);
    const shuffledPorts = shuffle(PORTS);
    
    const gridShape = [3, 4, 5, 4, 3];
    const hexes = [];
    let tokenIdx = 0;
    
    for (let r = 0; r < gridShape.length; r++) {
        for (let q = 0; q < gridShape[r]; q++) {
            const res = shuffledRes.shift();
            
            // Calculate screen coordinates for the SVG
            const y = r * (HEX_HEIGHT * 0.75);
            const xOffset = (5 - gridShape[r]) * (HEX_WIDTH / 2);
            const x = xOffset + (q * HEX_WIDTH);

            hexes.push({
                row: r, col: q,
                x: x, y: y,
                resource: res,
                token: res === 'desert' ? null : shuffledTok[tokenIdx++]
            });
        }
    }
    
    return { hexes: hexes, ports: shuffledPorts };
}

function createState() {
    return {
        phase: "waiting", // waiting, playing, ended
        board: generateBoard(),
        players: [],
        turnIndex: 0,
        message: "Waiting for players to join...",
        pieces: {
            settlements: [], // {id, x, y, owner}
            roads: []        // {id, x1, y1, x2, y2, owner}
        }
    };
}

function syncSettlers() {
    if (typeof channel !== "undefined" && channel && window.settlersState) {
        channel.send({
            type: "broadcast",
            event: "settlers-sync-state",
            payload: {
                state: window.settlersState,
                roomGameId: window.chaserGame && window.chaserGame.activeGameId ? window.chaserGame.activeGameId : null
            }
        });
    }
}

// --- STATE MACHINE FOR SELECT & DROP ---
let uiState = 'IDLE'; // IDLE, BUILD_SETTLEMENT, BUILD_ROAD

window.setSettlersUiState = function(newState) {
    uiState = newState;
    const snapNodes = document.getElementById('snap-nodes');
    const snapEdges = document.getElementById('snap-edges');
    
    if (!snapNodes || !snapEdges) return;

    // Hide everything first
    snapNodes.style.opacity = '0';
    snapNodes.style.pointerEvents = 'none';
    snapEdges.style.opacity = '0';
    snapEdges.style.pointerEvents = 'none';

    if (uiState === 'BUILD_SETTLEMENT') {
        snapNodes.style.opacity = '1';
        snapNodes.style.pointerEvents = 'auto';
        document.getElementById('set-msg').innerText = "Tap an intersection to build.";
    } else if (uiState === 'BUILD_ROAD') {
        snapEdges.style.opacity = '1';
        snapEdges.style.pointerEvents = 'auto';
        document.getElementById('set-msg').innerText = "Tap a path to build.";
    } else {
        document.getElementById('set-msg').innerText = window.settlersState.message;
    }
};

window.placeSettlement = function(x, y) {
    const st = window.settlersState;
    if (!st) return;

    // In a full implementation, validate resources and distance rule here
    st.pieces.settlements.push({
        id: `set-${Math.round(x)}-${Math.round(y)}`,
        x: x, y: y,
        owner: getMyId()
    });
    
    window.setSettlersUiState('IDLE');
    renderSettlers();
    syncSettlers();
};

window.placeRoad = function(x1, y1, x2, y2) {
    const st = window.settlersState;
    if (!st) return;

    st.pieces.roads.push({
        id: `rd-${Math.round(x1)}-${Math.round(y1)}`,
        x1: x1, y1: y1, x2: x2, y2: y2,
        owner: getMyId()
    });
    
    window.setSettlersUiState('IDLE');
    renderSettlers();
    syncSettlers();
};

// Generates the SVG board, Hexes, and Snap Points dynamically
function buildSvgBoardHtml() {
    const st = window.settlersState;
    if (!st || !st.board) return "";
    
    let hexHtml = "";
    let snapNodes = new Map(); // Store unique intersections for "Select & Drop"
    let snapEdges = new Map(); // Store unique edges

    st.board.hexes.forEach(hex => {
        // Draw Hex
        hexHtml += `
            <g transform="translate(${hex.x}, ${hex.y})">
                <polygon points="
                    0,${-HEX_SIZE} 
                    ${HEX_WIDTH/2},${-HEX_SIZE/2} 
                    ${HEX_WIDTH/2},${HEX_SIZE/2} 
                    0,${HEX_SIZE} 
                    ${-HEX_WIDTH/2},${HEX_SIZE/2} 
                    ${-HEX_WIDTH/2},${-HEX_SIZE/2}" 
                    fill="${COLORS[hex.resource]}" 
                    stroke="#1e4620" stroke-width="2" />`;
        
        // Draw Number Token
        if (hex.token) {
            const isRed = hex.token === 6 || hex.token === 8;
            hexHtml += `
                <circle cx="0" cy="0" r="15" fill="#fff" stroke="#333" stroke-width="1"/>
                <text x="0" y="5" font-family="Arial" font-weight="900" font-size="16" text-anchor="middle" fill="${isRed ? '#dc3545' : '#111'}">
                    ${hex.token}
                </text>`;
        }
        hexHtml += `</g>`;

        // Calculate all 6 vertices of this hex for snapping
        const corners = [
            { x: hex.x, y: hex.y - HEX_SIZE },
            { x: hex.x + HEX_WIDTH/2, y: hex.y - HEX_SIZE/2 },
            { x: hex.x + HEX_WIDTH/2, y: hex.y + HEX_SIZE/2 },
            { x: hex.x, y: hex.y + HEX_SIZE },
            { x: hex.x - HEX_WIDTH/2, y: hex.y + HEX_SIZE/2 },
            { x: hex.x - HEX_WIDTH/2, y: hex.y - HEX_SIZE/2 }
        ];

        // Store unique vertices (rounded to prevent floating point duplicate errors)
        corners.forEach((c, i) => {
            const key = `${Math.round(c.x)},${Math.round(c.y)}`;
            if (!snapNodes.has(key)) snapNodes.set(key, c);

            // Store edges between this corner and the next
            const nextC = corners[(i + 1) % 6];
            const edgeKey = [
                `${Math.round(c.x)},${Math.round(c.y)}`, 
                `${Math.round(nextC.x)},${Math.round(nextC.y)}`
            ].sort().join('|');
            
            if (!snapEdges.has(edgeKey)) {
                snapEdges.set(edgeKey, { x1: c.x, y1: c.y, x2: nextC.x, y2: nextC.y });
            }
        });
    });

    // Render Placed Pieces
    let piecesHtml = "";
    st.pieces.roads.forEach(r => {
        piecesHtml += `<line x1="${r.x1}" y1="${r.y1}" x2="${r.x2}" y2="${r.y2}" stroke="#dc3545" stroke-width="8" stroke-linecap="round"/>`;
    });
    st.pieces.settlements.forEach(s => {
        piecesHtml += `<rect x="${s.x - 10}" y="${s.y - 10}" width="20" height="20" fill="#dc3545" stroke="#fff" stroke-width="2"/>`;
    });

    // Render Snap Points (Invisible until state changes)
    let snapNodesHtml = "";
    snapNodes.forEach((node, key) => {
        // Check if piece already exists here
        const occupied = st.pieces.settlements.some(s => Math.round(s.x) === Math.round(node.x) && Math.round(s.y) === Math.round(node.y));
        if (!occupied) {
            snapNodesHtml += `<circle cx="${node.x}" cy="${node.y}" r="15" fill="#ffd700" stroke="#111" stroke-width="2" style="cursor:pointer; transition: transform 0.1s;" class="snap-hover" onclick="placeSettlement(${node.x}, ${node.y})"/>`;
        }
    });

    let snapEdgesHtml = "";
    snapEdges.forEach((edge, key) => {
        const occupied = st.pieces.roads.some(r => Math.round(r.x1) === Math.round(edge.x1) && Math.round(r.y1) === Math.round(edge.y1));
        if (!occupied) {
            snapEdgesHtml += `<line x1="${edge.x1}" y1="${edge.y1}" x2="${edge.x2}" y2="${edge.y2}" stroke="#ffd700" stroke-width="12" stroke-linecap="round" style="cursor:pointer;" class="snap-hover" onclick="placeRoad(${edge.x1}, ${edge.y1}, ${edge.x2}, ${edge.y2})"/>`;
        }
    });

    return `
        <svg viewBox="-50 -50 480 480" width="100%" height="100%" style="min-width:500px; min-height:500px;">
            <g id="hex-grid">${hexHtml}</g>
            <g id="placed-pieces">${piecesHtml}</g>
            <g id="snap-edges" style="opacity:0; pointer-events:none;">${snapEdgesHtml}</g>
            <g id="snap-nodes" style="opacity:0; pointer-events:none;">${snapNodesHtml}</g>
        </svg>
    `;
}

function renderSettlers() {
    const el = document.getElementById("gameCanvasContainer");
    const st = window.settlersState;
    if (!el || !st) return;

    el.innerHTML = `
        <style>
            .set-wrap { display: flex; flex-direction: column; height: 100%; width: 100%; background: ${COLORS.ocean}; color: #111; font-family: Arial, sans-serif; overflow: hidden; }
            
            .set-header { background: #1e4620; color: #ffd700; padding: 10px; text-align: center; font-weight: 900; font-size: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 10; flex-shrink: 0; }
            
            /* Magic CSS property that enables buttery smooth native mobile pinch-zoom and panning */
            .set-map-viewport { flex: 1; overflow: auto; touch-action: pan-x pan-y pinch-zoom; display: flex; align-items: center; justify-content: center; }
            
            .set-hand-ui { background: #e2f0d9; border-top: 3px solid #1e4620; padding: 8px 6px 42px 6px; flex-shrink: 0; z-index: 10; display: flex; flex-direction: column; gap: 8px; }
            
            .set-resources { display: flex; justify-content: space-around; font-size: 16px; font-weight: 900; color: #1e4620; background: #fff; padding: 6px; border-radius: 8px; border: 2px solid #2d6a30; }
            
            .set-actions { display: flex; gap: 6px; justify-content: space-between; }
            .set-actions button { flex: 1; padding: 10px 4px; border-radius: 8px; border: 2px solid #2d6a30; background: #2d6a30; color: #fff; font-weight: 900; font-size: 12px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
            .set-actions button:active { transform: scale(0.95); }
            .set-actions button.cancel-btn { background: #dc3545; border-color: #bd2130; display: none; }
            
            .snap-hover:hover { filter: brightness(1.2); }
            .snap-hover:active { transform: scale(0.9); }
        </style>
        
        <div class="set-wrap">
            <div class="set-header" id="set-msg">${escapeHtml(st.message)}</div>
            
            <div class="set-map-viewport">
                ${buildSvgBoardHtml()}
            </div>
            
            <div class="set-hand-ui">
                <div class="set-resources">
                    <span>🧱 0</span>
                    <span>🌾 0</span>
                    <span>🐑 0</span>
                    <span>🪵 0</span>
                    <span>⛰️ 0</span>
                </div>
                <div class="set-actions">
                    <button type="button" onclick="setSettlersUiState('BUILD_ROAD')">🛣️ Road</button>
                    <button type="button" onclick="setSettlersUiState('BUILD_SETTLEMENT')">🏠 Settle</button>
                    <button type="button" onclick="setSettlersUiState('BUILD_CITY')">🏰 City</button>
                    <button type="button" style="background:#ffd700; color:#1e4620; border-color:#e2f0d9;">🃏 Card</button>
                    <button type="button" class="cancel-btn" id="set-cancel" onclick="setSettlersUiState('IDLE')">✕ Cancel</button>
                </div>
            </div>
        </div>
    `;

    // Ensure state toggle updates button visibility
    const ogSetState = window.setSettlersUiState;
    window.setSettlersUiState = function(newState) {
        ogSetState(newState);
        const cancelBtn = document.getElementById('set-cancel');
        if (cancelBtn) cancelBtn.style.display = newState === 'IDLE' ? 'none' : 'block';
    };
}

window.initSettlersGame = function () {
    window.chaserGame = window.chaserGame || {};
    window.chaserGame.activeGame = "Settlers";

    const stage = document.getElementById("activeGameStage");
    if (stage) stage.classList.add("open");

    const roomDisplay = document.getElementById("roomDisplayCode");
    const headerBtns = document.getElementById("headerActionButtonsContainer");
    const chatHeader = document.getElementById("chatHeader");

    if (roomDisplay) roomDisplay.innerText = "🌾 Settlers";
    if (headerBtns) headerBtns.style.display = "none";
    if (chatHeader) chatHeader.classList.add("game-active-mode");

    const amHost = window.chaserGame && window.chaserGame.hostId === getMyId();
    if (amHost || !window.settlersState) {
        window.settlersState = createState();
        syncSettlers();
    }

    renderSettlers();
};

window.handleIncomingSettlersSync = function (payload) {
    if (!payload || !payload.state) return;
    
    // Only accept payloads meant for this room
    if (payload.roomGameId && window.chaserGame && window.chaserGame.activeGameId && payload.roomGameId !== window.chaserGame.activeGameId) {
        return;
    }

    window.settlersState = payload.state;
    if (window.chaserGame) window.chaserGame.activeGame = "Settlers";
    renderSettlers();
};

// Aliases for routing
window.startSettlersFromLobby = window.initSettlersGame;
window.startSettlersGame = window.initSettlersGame;

})();
