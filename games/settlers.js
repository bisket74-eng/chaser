/* CHASER SETTLERS - SEPARATE GAME FILE
Mobile-optimized Hex Resource Game
1-4 players, synced rooms, SVG board, whole-play-area pinch zoom
*/
;(function () {
"use strict";

const MAX_PLAYERS = 4;
const HEX_SIZE = 48;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;

const RESOURCES = [
    "desert",
    "wood", "wood", "wood", "wood",
    "sheep", "sheep", "sheep", "sheep",
    "wheat", "wheat", "wheat", "wheat",
    "brick", "brick", "brick",
    "ore", "ore", "ore"
];

const TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
const PORTS = ["3:1", "3:1", "3:1", "3:1", "wood", "sheep", "wheat", "brick", "ore"];

const COLORS = {
    wood: "#2d6a30",
    sheep: "#f7f7f7",
    wheat: "#f2d21b",
    brick: "#b5543a",
    ore: "#8a8a8a",
    desert: "#e3d486",
    ocean: "#5aa5f0"
};

const PLAYER_COLORS = ["#dc3545", "#1d4ed8", "#f59e0b", "#7c3aed"];
const HIGHLIGHT_PURPLE = "#8a2be2";

let uiState = "IDLE";
let zoomState = {
    scale: 1,
    x: 0,
    y: 0
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
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function playerColor(ownerId) {
    const players = window.settlersState && Array.isArray(window.settlersState.players)
        ? window.settlersState.players
        : [];
    const idx = players.findIndex(p => p.id === ownerId);
    return PLAYER_COLORS[idx >= 0 ? idx % PLAYER_COLORS.length : 0];
}

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
            const y = r * (HEX_HEIGHT * 0.75);
            const xOffset = (5 - gridShape[r]) * (HEX_WIDTH / 2);
            const x = xOffset + (q * HEX_WIDTH);

            hexes.push({
                row: r,
                col: q,
                x,
                y,
                resource: res,
                token: res === "desert" ? null : shuffledTok[tokenIdx++]
            });
        }
    }

    return {
        hexes,
        ports: shuffledPorts
    };
}

function getLobbyPlayers() {
    const g = window.chaserGame || {};
    const players = Array.isArray(g.players) && g.players.length
        ? g.players.slice(0, MAX_PLAYERS)
        : [{ id: getMyId(), name: myName(), seat: 0 }];

    return players.map((p, idx) => ({
        id: p.id || (idx === 0 ? getMyId() : "player-" + idx),
        name: p.name || (idx === 0 ? myName() : "Player " + (idx + 1)),
        seat: typeof p.seat === "number" ? p.seat : idx
    }));
}

function createState() {
    const players = getLobbyPlayers();

    return {
        phase: "playing",
        board: generateBoard(),
        players,
        turnIndex: 0,
        message: players.length > 1 ? `${players[0].name}'s turn.` : "Build test mode. Tap Road or Settle.",
        resources: {},
        pieces: {
            settlements: [],
            cities: [],
            roads: []
        }
    };
}

function syncSettlers() {
    if (typeof channel !== "undefined" && channel && typeof channel.send === "function" && window.settlersState) {
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

function setMessage(text) {
    if (window.settlersState) window.settlersState.message = text;
    const msg = document.getElementById("set-msg");
    if (msg) msg.innerText = text;
}

window.setSettlersMessage = function (text) {
    setMessage(text);
};

window.setSettlersUiState = function (newState) {
    uiState = newState || "IDLE";

    const snapNodes = document.getElementById("snap-nodes");
    const snapEdges = document.getElementById("snap-edges");
    const cancelBtn = document.getElementById("set-cancel");

    if (snapNodes) {
        snapNodes.style.opacity = "0";
        snapNodes.style.pointerEvents = "none";
    }

    if (snapEdges) {
        snapEdges.style.opacity = "0";
        snapEdges.style.pointerEvents = "none";
    }

    if (cancelBtn) {
        cancelBtn.style.display = uiState === "IDLE" ? "none" : "flex";
    }

    if (uiState === "BUILD_SETTLEMENT") {
        if (snapNodes) {
            snapNodes.style.opacity = "1";
            snapNodes.style.pointerEvents = "auto";
        }
        setMessage("Tap a purple circle to build a settlement.");
        return;
    }

    if (uiState === "BUILD_ROAD") {
        if (snapEdges) {
            snapEdges.style.opacity = "1";
            snapEdges.style.pointerEvents = "auto";
        }
        setMessage("Tap a purple road marker to build a road.");
        return;
    }

    if (uiState === "BUILD_CITY") {
        setMessage("City upgrades are not wired up yet.");
        return;
    }

    if (window.settlersState) {
        setMessage(window.settlersState.message || "Build test mode. Tap Road or Settle.");
    }
};

window.placeSettlement = function (x, y) {
    const st = window.settlersState;
    if (!st) return;

    const occupiedSettlement = st.pieces.settlements.some(s => Math.round(s.x) === Math.round(x) && Math.round(s.y) === Math.round(y));
    const occupiedCity = st.pieces.cities && st.pieces.cities.some(c => Math.round(c.x) === Math.round(x) && Math.round(c.y) === Math.round(y));

    if (occupiedSettlement || occupiedCity) {
        setMessage("That spot is already taken.");
        return;
    }

    st.pieces.settlements.push({
        id: `set-${Math.round(x)}-${Math.round(y)}-${Date.now()}`,
        x,
        y,
        owner: getMyId()
    });

    st.message = "Settlement placed.";
    uiState = "IDLE";
    renderSettlers();
    syncSettlers();
};

window.placeRoad = function (x1, y1, x2, y2) {
    const st = window.settlersState;
    if (!st) return;

    const a = `${Math.round(x1)},${Math.round(y1)}`;
    const b = `${Math.round(x2)},${Math.round(y2)}`;

    const occupied = st.pieces.roads.some(r => {
        const ra = `${Math.round(r.x1)},${Math.round(r.y1)}`;
        const rb = `${Math.round(r.x2)},${Math.round(r.y2)}`;
        return (ra === a && rb === b) || (ra === b && rb === a);
    });

    if (occupied) {
        setMessage("That road is already built.");
        return;
    }

    st.pieces.roads.push({
        id: `rd-${Math.round(x1)}-${Math.round(y1)}-${Math.round(x2)}-${Math.round(y2)}-${Date.now()}`,
        x1,
        y1,
        x2,
        y2,
        owner: getMyId()
    });

    st.message = "Road placed.";
    uiState = "IDLE";
    renderSettlers();
    syncSettlers();
};

function buildSvgBoardHtml() {
    const st = window.settlersState;
    if (!st || !st.board) return "";

    let hexHtml = "";
    const snapNodes = new Map();
    const snapEdges = new Map();

    st.board.hexes.forEach(hex => {
        hexHtml += `
            <g transform="translate(${hex.x}, ${hex.y})">
                <polygon points="
                    0,${-HEX_SIZE}
                    ${HEX_WIDTH / 2},${-HEX_SIZE / 2}
                    ${HEX_WIDTH / 2},${HEX_SIZE / 2}
                    0,${HEX_SIZE}
                    ${-HEX_WIDTH / 2},${HEX_SIZE / 2}
                    ${-HEX_WIDTH / 2},${-HEX_SIZE / 2}"
                    fill="${COLORS[hex.resource]}"
                    stroke="#1e4620"
                    stroke-width="2"
                />
        `;

        if (hex.token) {
            const isRed = hex.token === 6 || hex.token === 8;
            hexHtml += `
                <circle cx="0" cy="0" r="15" fill="#fff" stroke="#333" stroke-width="1"/>
                <text x="0" y="5" font-family="Arial" font-weight="900" font-size="16" text-anchor="middle" fill="${isRed ? "#dc3545" : "#111"}">
                    ${hex.token}
                </text>
            `;
        }

        hexHtml += `</g>`;

        const corners = [
            { x: hex.x, y: hex.y - HEX_SIZE },
            { x: hex.x + HEX_WIDTH / 2, y: hex.y - HEX_SIZE / 2 },
            { x: hex.x + HEX_WIDTH / 2, y: hex.y + HEX_SIZE / 2 },
            { x: hex.x, y: hex.y + HEX_SIZE },
            { x: hex.x - HEX_WIDTH / 2, y: hex.y + HEX_SIZE / 2 },
            { x: hex.x - HEX_WIDTH / 2, y: hex.y - HEX_SIZE / 2 }
        ];

        corners.forEach((c, i) => {
            const key = `${Math.round(c.x)},${Math.round(c.y)}`;
            if (!snapNodes.has(key)) snapNodes.set(key, c);

            const nextC = corners[(i + 1) % 6];
            const edgeKey = [
                `${Math.round(c.x)},${Math.round(c.y)}`,
                `${Math.round(nextC.x)},${Math.round(nextC.y)}`
            ].sort().join("|");

            if (!snapEdges.has(edgeKey)) {
                snapEdges.set(edgeKey, {
                    x1: c.x,
                    y1: c.y,
                    x2: nextC.x,
                    y2: nextC.y
                });
            }
        });
    });

    let piecesHtml = "";

    st.pieces.roads.forEach(r => {
        piecesHtml += `
            <line
                x1="${r.x1}"
                y1="${r.y1}"
                x2="${r.x2}"
                y2="${r.y2}"
                stroke="${playerColor(r.owner)}"
                stroke-width="8"
                stroke-linecap="round"
            />
        `;
    });

    st.pieces.settlements.forEach(s => {
        const color = playerColor(s.owner);
        piecesHtml += `
            <rect
                x="${s.x - 10}"
                y="${s.y - 10}"
                width="20"
                height="20"
                rx="3"
                fill="${color}"
                stroke="#fff"
                stroke-width="2"
            />
        `;
    });

    if (Array.isArray(st.pieces.cities)) {
        st.pieces.cities.forEach(c => {
            const color = playerColor(c.owner);
            piecesHtml += `
                <path
                    d="M ${c.x - 13} ${c.y + 10} L ${c.x - 13} ${c.y - 4} L ${c.x - 4} ${c.y - 12} L ${c.x + 13} ${c.y - 12} L ${c.x + 13} ${c.y + 10} Z"
                    fill="${color}"
                    stroke="#fff"
                    stroke-width="2"
                />
            `;
        });
    }

    let snapNodesHtml = "";
    snapNodes.forEach(node => {
        const occupiedSettlement = st.pieces.settlements.some(s => Math.round(s.x) === Math.round(node.x) && Math.round(s.y) === Math.round(node.y));
        const occupiedCity = st.pieces.cities && st.pieces.cities.some(c => Math.round(c.x) === Math.round(node.x) && Math.round(c.y) === Math.round(node.y));

        if (!occupiedSettlement && !occupiedCity) {
            snapNodesHtml += `
                <circle
                    cx="${node.x}"
                    cy="${node.y}"
                    r="10"
                    fill="rgba(138, 43, 226, 0.20)"
                    stroke="${HIGHLIGHT_PURPLE}"
                    stroke-width="3"
                    style="cursor:pointer;"
                    onclick="placeSettlement(${node.x}, ${node.y})"
                />
            `;
        }
    });

    let snapEdgesHtml = "";
    snapEdges.forEach(edge => {
        const edgeA = `${Math.round(edge.x1)},${Math.round(edge.y1)}`;
        const edgeB = `${Math.round(edge.x2)},${Math.round(edge.y2)}`;

        const occupied = st.pieces.roads.some(r => {
            const roadA = `${Math.round(r.x1)},${Math.round(r.y1)}`;
            const roadB = `${Math.round(r.x2)},${Math.round(r.y2)}`;
            return (roadA === edgeA && roadB === edgeB) || (roadA === edgeB && roadB === edgeA);
        });

        if (!occupied) {
            const mx = (edge.x1 + edge.x2) / 2;
            const my = (edge.y1 + edge.y2) / 2;
            const dx = edge.x2 - edge.x1;
            const dy = edge.y2 - edge.y1;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const halfVisible = 10;
            const vx1 = mx - ux * halfVisible;
            const vy1 = my - uy * halfVisible;
            const vx2 = mx + ux * halfVisible;
            const vy2 = my + uy * halfVisible;

            snapEdgesHtml += `
                <g style="cursor:pointer;">
                    <line
                        x1="${edge.x1}"
                        y1="${edge.y1}"
                        x2="${edge.x2}"
                        y2="${edge.y2}"
                        stroke="rgba(0,0,0,0)"
                        stroke-width="18"
                        stroke-linecap="round"
                        pointer-events="stroke"
                        onclick="placeRoad(${edge.x1}, ${edge.y1}, ${edge.x2}, ${edge.y2})"
                    />
                    <line
                        x1="${vx1}"
                        y1="${vy1}"
                        x2="${vx2}"
                        y2="${vy2}"
                        stroke="${HIGHLIGHT_PURPLE}"
                        stroke-width="6"
                        stroke-linecap="round"
                        opacity="0.95"
                        pointer-events="none"
                    />
                </g>
            `;
        }
    });

    return `
        <div class="set-board-zoomer">
            <svg viewBox="-70 -70 470 430" preserveAspectRatio="xMidYMid meet">
                <g id="hex-grid">${hexHtml}</g>
                <g id="placed-pieces">${piecesHtml}</g>
                <g id="snap-edges" style="opacity:0; pointer-events:none;">${snapEdgesHtml}</g>
                <g id="snap-nodes" style="opacity:0; pointer-events:none;">${snapNodesHtml}</g>
            </svg>
        </div>
    `;
}

function initSettlersPanZoom() {
    const shell = document.querySelector(".set-zoom-shell");
    const zoomer = document.getElementById("settlersPanZoom");
    if (!shell || !zoomer) return;

    let scale = zoomState.scale || 1;
    let x = zoomState.x || 0;
    let y = zoomState.y || 0;
    let panStartX = 0;
    let panStartY = 0;
    let startDist = 0;
    let startScale = 1;
    let mode = "";
    let lastTap = 0;

    const minScale = 1;
    const maxScale = 2.6;

    function clamp(n, min, max) {
        return Math.max(min, Math.min(max, n));
    }

    function dist(t1, t2) {
        return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    }

    function applyTransform() {
        const w = shell.clientWidth || 1;
        const h = shell.clientHeight || 1;

        if (scale <= 1.01) {
            scale = 1;
            x = 0;
            y = 0;
        } else {
            const minX = w - w * scale;
            const minY = h - h * scale;
            x = clamp(x, minX, 0);
            y = clamp(y, minY, 0);
        }

        zoomState = { scale, x, y };
        zoomer.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }

    applyTransform();

    shell.addEventListener("touchstart", function (e) {
        if (e.touches.length === 2) {
            mode = "pinch";
            startDist = dist(e.touches[0], e.touches[1]);
            startScale = scale;
        } else if (e.touches.length === 1) {
            mode = "pan";
            panStartX = e.touches[0].clientX - x;
            panStartY = e.touches[0].clientY - y;
        }
    }, { passive: false });

    shell.addEventListener("touchmove", function (e) {
        if (mode === "pinch" && e.touches.length === 2) {
            e.preventDefault();
            const newDist = dist(e.touches[0], e.touches[1]);
            scale = clamp(startScale * (newDist / startDist), minScale, maxScale);
            applyTransform();
        } else if (mode === "pan" && e.touches.length === 1 && scale > 1) {
            e.preventDefault();
            x = e.touches[0].clientX - panStartX;
            y = e.touches[0].clientY - panStartY;
            applyTransform();
        }
    }, { passive: false });

    shell.addEventListener("touchend", function (e) {
        if (e.touches.length === 1) {
            mode = "pan";
            panStartX = e.touches[0].clientX - x;
            panStartY = e.touches[0].clientY - y;
            return;
        }

        mode = "";
        const now = Date.now();
        if (now - lastTap < 280) {
            scale = 1;
            x = 0;
            y = 0;
            applyTransform();
        }
        lastTap = now;
    }, { passive: false });

    shell.addEventListener("wheel", function (e) {
        e.preventDefault();
        scale = clamp(scale + (e.deltaY < 0 ? 0.12 : -0.12), minScale, maxScale);
        applyTransform();
    }, { passive: false });
}

function renderSettlers() {
    const el = document.getElementById("gameCanvasContainer");
    const st = window.settlersState;
    if (!el || !st) return;

    const brick = st.resources && st.resources.brick ? st.resources.brick : 0;
    const wheat = st.resources && st.resources.wheat ? st.resources.wheat : 0;
    const sheep = st.resources && st.resources.sheep ? st.resources.sheep : 0;
    const wood = st.resources && st.resources.wood ? st.resources.wood : 0;
    const ore = st.resources && st.resources.ore ? st.resources.ore : 0;

    el.innerHTML = `
        <style>
            .set-wrap {
                display: flex;
                flex-direction: column;
                height: 100%;
                width: 100%;
                background: ${COLORS.ocean};
                color: #111;
                font-family: Arial, sans-serif;
                overflow: hidden;
            }

            .set-header {
                background: #1e4620;
                color: #ffd700;
                padding: 10px;
                text-align: center;
                font-weight: 900;
                font-size: 15px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                z-index: 10;
                flex-shrink: 0;
            }

            .set-zoom-shell {
                flex: 1;
                overflow: hidden;
                touch-action: none;
                background: ${COLORS.ocean};
                position: relative;
            }

            #settlersPanZoom {
                width: 100%;
                height: 100%;
                transform-origin: top left;
                will-change: transform;
            }

            .set-play-area {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                background: #d7e0cf;
            }

            .set-map-viewport {
                flex: 1;
                min-height: 300px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 8px;
                background: ${COLORS.ocean};
                border-bottom: 3px solid #1e4620;
                box-sizing: border-box;
            }

            .set-board-zoomer {
                width: 100%;
                max-width: 560px;
                margin: 0 auto;
            }

            .set-board-zoomer svg {
                width: 100%;
                height: auto;
                display: block;
            }

            .set-hand-ui {
                background: #d7e0cf;
                border-top: 3px solid #1e4620;
                padding: 10px 8px 42px 8px;
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
                gap: 10px;
                box-sizing: border-box;
            }

            .set-resources {
                display: flex;
                justify-content: space-around;
                align-items: center;
                font-size: 16px;
                font-weight: 900;
                color: #1e4620;
                background: #f5f5f5;
                padding: 10px 6px;
                border-radius: 14px;
                border: 3px solid #2d6a30;
            }

            .set-actions {
                display: grid;
                grid-template-columns: repeat(5, minmax(0, 1fr));
                gap: 8px;
            }

            .set-act-btn {
                min-height: 88px;
                padding: 8px 4px;
                border-radius: 14px;
                border: 2px solid #2d6a30;
                background: #2d6a30;
                color: #fff;
                font-weight: 900;
                cursor: pointer;
                box-shadow: 0 3px 8px rgba(0,0,0,0.22);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 5px;
                text-align: center;
                line-height: 1.05;
            }

            .set-act-btn:active {
                transform: scale(0.96);
            }

            .set-act-btn .ico {
                font-size: 27px;
                line-height: 1;
            }

            .set-act-btn .lbl {
                font-size: 12px;
                line-height: 1.05;
            }

            .set-act-btn.card-btn {
                background: #ffd700;
                color: #1e4620;
                border-color: #d3b200;
            }

            .set-act-btn.cancel-btn {
                background: #dc3545;
                border-color: #bd2130;
                display: none;
            }
        </style>

        <div class="set-wrap">
            <div class="set-header" id="set-msg">${escapeHtml(st.message)}</div>

            <div class="set-zoom-shell">
                <div id="settlersPanZoom">
                    <div class="set-play-area">
                        <div class="set-map-viewport">
                            ${buildSvgBoardHtml()}
                        </div>

                        <div class="set-hand-ui">
                            <div class="set-resources">
                                <span>🧱 ${brick}</span>
                                <span>🌾 ${wheat}</span>
                                <span>🐑 ${sheep}</span>
                                <span>🌲 ${wood}</span>
                                <span>⛰️ ${ore}</span>
                            </div>

                            <div class="set-actions">
                                <button type="button" class="set-act-btn" onclick="setSettlersUiState('BUILD_ROAD')">
                                    <span class="ico">🛣️</span>
                                    <span class="lbl">Road</span>
                                </button>

                                <button type="button" class="set-act-btn" onclick="setSettlersUiState('BUILD_SETTLEMENT')">
                                    <span class="ico">🏠</span>
                                    <span class="lbl">Settle</span>
                                </button>

                                <button type="button" class="set-act-btn" onclick="setSettlersUiState('BUILD_CITY')">
                                    <span class="ico">🏰</span>
                                    <span class="lbl">City</span>
                                </button>

                                <button type="button" class="set-act-btn card-btn" onclick="setSettlersMessage('Development cards are not wired up yet.')">
                                    <span class="ico">🃏</span>
                                    <span class="lbl">Card</span>
                                </button>

                                <button type="button" class="set-act-btn cancel-btn" id="set-cancel" onclick="setSettlersUiState('IDLE')">
                                    <span class="ico">✕</span>
                                    <span class="lbl">Cancel</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    window.setSettlersUiState(uiState);
    initSettlersPanZoom();
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

    if (payload.roomGameId && window.chaserGame && window.chaserGame.activeGameId && payload.roomGameId !== window.chaserGame.activeGameId) {
        return;
    }

    window.settlersState = payload.state;
    if (window.chaserGame) window.chaserGame.activeGame = "Settlers";
    renderSettlers();
};

window.startSettlersFromLobby = window.initSettlersGame;
window.startSettlersGame = window.initSettlersGame;

})();
