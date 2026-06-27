/* CHASER SETTLERS - SEPARATE GAME FILE
Mobile-optimized Hex Resource Game
1-4 players, synced rooms, setup phase, dice, resource cards, SVG board, whole-play-area pinch zoom
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
const RESOURCE_TYPES = ["brick", "wheat", "sheep", "wood", "ore"];

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

function emptyResourceSet() {
    return {
        brick: 0,
        wheat: 0,
        sheep: 0,
        wood: 0,
        ore: 0
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

function buildSetupOrder(count) {
    const forward = [];
    for (let i = 0; i < count; i++) forward.push(i);

    const backward = [];
    for (let i = count - 1; i >= 0; i--) backward.push(i);

    return forward.concat(backward);
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

function createState() {
    const players = getLobbyPlayers();
    const resources = {};

    players.forEach(p => {
        resources[p.id] = emptyResourceSet();
    });

    const setupOrder = buildSetupOrder(players.length);

    return {
        phase: "setup",
        board: generateBoard(),
        players,
        turnIndex: setupOrder[0] || 0,
        rolledThisTurn: false,
        lastRoll: null,
        message: `${players[setupOrder[0] || 0].name}: place your first settlement.`,
        resources,
        setup: {
            active: true,
            order: setupOrder,
            stepIndex: 0,
            needed: "settlement",
            pendingSettlement: null,
            startingResourcesIssued: false
        },
        pieces: {
            settlements: [],
            cities: [],
            roads: []
        }
    };
}

function ensureResourceBank() {
    const st = window.settlersState;
    if (!st) return;

    if (!st.resources || typeof st.resources !== "object") {
        st.resources = {};
    }

    const players = Array.isArray(st.players) && st.players.length
        ? st.players
        : [{ id: getMyId(), name: myName(), seat: 0 }];

    players.forEach(p => {
        if (!st.resources[p.id]) {
            st.resources[p.id] = emptyResourceSet();
        }

        RESOURCE_TYPES.forEach(type => {
            if (typeof st.resources[p.id][type] !== "number") {
                st.resources[p.id][type] = 0;
            }
        });
    });
}

function normalizeSettlersState() {
    const st = window.settlersState;
    if (!st) return;

    if (!Array.isArray(st.players) || !st.players.length) {
        st.players = getLobbyPlayers();
    }

    if (!st.pieces) {
        st.pieces = { settlements: [], cities: [], roads: [] };
    }

    if (!Array.isArray(st.pieces.settlements)) st.pieces.settlements = [];
    if (!Array.isArray(st.pieces.cities)) st.pieces.cities = [];
    if (!Array.isArray(st.pieces.roads)) st.pieces.roads = [];

    ensureResourceBank();

    if (!st.setup && st.phase === "setup") {
        st.setup = {
            active: true,
            order: buildSetupOrder(st.players.length),
            stepIndex: 0,
            needed: "settlement",
            pendingSettlement: null,
            startingResourcesIssued: false
        };
    }
}

function playerColor(ownerId) {
    const st = window.settlersState;
    const players = st && Array.isArray(st.players) ? st.players : [];
    const idx = players.findIndex(p => p.id === ownerId);
    return PLAYER_COLORS[idx >= 0 ? idx % PLAYER_COLORS.length : 0];
}

function currentSettlersPlayer() {
    const st = window.settlersState;
    if (!st || !Array.isArray(st.players) || !st.players.length) {
        return { id: getMyId(), name: myName(), seat: 0 };
    }

    if (st.setup && st.setup.active && Array.isArray(st.setup.order) && st.setup.order.length) {
        const seat = st.setup.order[st.setup.stepIndex] ?? 0;
        return st.players[seat] || st.players[0];
    }

    return st.players[st.turnIndex % st.players.length] || st.players[0];
}

function isMySettlersTurn() {
    const current = currentSettlersPlayer();
    return current && current.id === getMyId();
}

function getMyResourceCards() {
    ensureResourceBank();

    const st = window.settlersState;
    if (!st || !st.resources) return emptyResourceSet();

    if (!st.resources[getMyId()]) {
        st.resources[getMyId()] = emptyResourceSet();
    }

    return st.resources[getMyId()];
}

function hexCorners(hex) {
    return [
        { x: hex.x, y: hex.y - HEX_SIZE },
        { x: hex.x + HEX_WIDTH / 2, y: hex.y - HEX_SIZE / 2 },
        { x: hex.x + HEX_WIDTH / 2, y: hex.y + HEX_SIZE / 2 },
        { x: hex.x, y: hex.y + HEX_SIZE },
        { x: hex.x - HEX_WIDTH / 2, y: hex.y + HEX_SIZE / 2 },
        { x: hex.x - HEX_WIDTH / 2, y: hex.y - HEX_SIZE / 2 }
    ];
}

function pointsMatch(a, b) {
    return Math.round(a.x) === Math.round(b.x) && Math.round(a.y) === Math.round(b.y);
}

function pieceTouchesHex(piece, hex) {
    return hexCorners(hex).some(c => pointsMatch(c, piece));
}

function edgeTouchesPoint(edge, point) {
    if (!edge || !point) return false;

    const a = { x: edge.x1, y: edge.y1 };
    const b = { x: edge.x2, y: edge.y2 };

    return pointsMatch(a, point) || pointsMatch(b, point);
}

function addResourceToPlayer(ownerId, resource, amount, gains) {
    const st = window.settlersState;
    if (!st || !resource || resource === "desert") return;

    ensureResourceBank();

    if (!st.resources[ownerId]) {
        st.resources[ownerId] = emptyResourceSet();
    }

    st.resources[ownerId][resource] += amount;

    if (gains) {
        if (!gains[ownerId]) gains[ownerId] = emptyResourceSet();
        gains[ownerId][resource] += amount;
    }
}

function collectResourcesForRoll(total) {
    const st = window.settlersState;
    const gains = {};

    if (!st || !st.board || !Array.isArray(st.board.hexes)) return gains;

    st.board.hexes.forEach(hex => {
        if (hex.token !== total) return;
        if (hex.resource === "desert") return;

        st.pieces.settlements.forEach(settlement => {
            if (pieceTouchesHex(settlement, hex)) {
                addResourceToPlayer(settlement.owner, hex.resource, 1, gains);
            }
        });

        st.pieces.cities.forEach(city => {
            if (pieceTouchesHex(city, hex)) {
                addResourceToPlayer(city.owner, hex.resource, 2, gains);
            }
        });
    });

    return gains;
}

function collectStartingResourcesForSettlement(settlement) {
    const st = window.settlersState;
    const gains = {};

    if (!st || !settlement || !st.board || !Array.isArray(st.board.hexes)) return gains;

    st.board.hexes.forEach(hex => {
        if (hex.resource === "desert") return;
        if (pieceTouchesHex(settlement, hex)) {
            addResourceToPlayer(settlement.owner, hex.resource, 1, gains);
        }
    });

    return gains;
}

function resourceParts(cards) {
    const parts = [];
    if (cards.brick) parts.push(`🧱 +${cards.brick}`);
    if (cards.wheat) parts.push(`🌾 +${cards.wheat}`);
    if (cards.sheep) parts.push(`🐑 +${cards.sheep}`);
    if (cards.wood) parts.push(`🌲 +${cards.wood}`);
    if (cards.ore) parts.push(`⛰️ +${cards.ore}`);
    return parts;
}

function summarizeGainsForPlayer(gains, playerId) {
    const cards = gains[playerId];
    if (!cards) return "No resources collected.";

    const parts = resourceParts(cards);
    return parts.length ? `Collected ${parts.join(" ")}.` : "No resources collected.";
}

function summarizeMyGains(gains) {
    return summarizeGainsForPlayer(gains, getMyId());
}

function setupRoundName() {
    const st = window.settlersState;
    if (!st || !st.setup || !Array.isArray(st.players)) return "first";
    return st.setup.stepIndex >= st.players.length ? "second" : "first";
}

function setupExpectedNeed() {
    const st = window.settlersState;
    if (!st || !st.setup || !st.setup.active) return null;
    return st.setup.needed || "settlement";
}

function settlementIsTooClose(x, y) {
    const st = window.settlersState;
    if (!st) return false;

    const candidate = { x, y };
    const all = st.pieces.settlements.concat(st.pieces.cities || []);

    return all.some(piece => {
        const d = Math.hypot(piece.x - candidate.x, piece.y - candidate.y);
        return d < HEX_SIZE + 4;
    });
}

function nextSetupMessage() {
    const st = window.settlersState;
    if (!st || !st.setup || !st.setup.active) return "";

    const current = currentSettlersPlayer();
    const round = setupRoundName();

    if (st.setup.needed === "road") {
        return `${current.name}: now place a road touching that settlement.`;
    }

    return `${current.name}: place your ${round} settlement.`;
}

function finishSetupIfReady() {
    const st = window.settlersState;
    if (!st || !st.setup || !st.setup.active) return false;

    if (st.setup.stepIndex < st.setup.order.length) return false;

    st.setup.active = false;
    st.phase = "playing";
    st.turnIndex = 0;
    st.rolledThisTurn = false;
    st.lastRoll = null;
    uiState = "IDLE";

    const first = st.players[0] || { name: "Player 1" };
    st.message = `${first.name}'s turn. Roll the dice.`;

    return true;
}

function advanceSetupAfterRoad() {
    const st = window.settlersState;
    if (!st || !st.setup || !st.setup.active) return;

    st.setup.pendingSettlement = null;
    st.setup.needed = "settlement";
    st.setup.stepIndex += 1;

    if (finishSetupIfReady()) return;

    st.turnIndex = st.setup.order[st.setup.stepIndex] || 0;
    uiState = "BUILD_SETTLEMENT";
    st.message = nextSetupMessage();
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
    const st = window.settlersState;

    if (st && st.setup && st.setup.active) {
        const needed = setupExpectedNeed();

        if (newState === "BUILD_ROAD" && needed !== "road") {
            uiState = "BUILD_SETTLEMENT";
            setMessage("Place your settlement first, then place its road.");
        } else if ((newState === "BUILD_SETTLEMENT" || newState === "BUILD_CITY") && needed !== "settlement") {
            uiState = "BUILD_ROAD";
            setMessage("Now place a road touching your new settlement.");
        } else if (newState === "IDLE") {
            uiState = needed === "road" ? "BUILD_ROAD" : "BUILD_SETTLEMENT";
            setMessage(nextSetupMessage());
        } else {
            uiState = newState || (needed === "road" ? "BUILD_ROAD" : "BUILD_SETTLEMENT");
        }
    } else {
        uiState = newState || "IDLE";
    }

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
        cancelBtn.style.display = uiState === "IDLE" || (st && st.setup && st.setup.active) ? "none" : "flex";
    }

    if (uiState === "BUILD_SETTLEMENT") {
        if (snapNodes) {
            snapNodes.style.opacity = "1";
            snapNodes.style.pointerEvents = "auto";
        }

        if (st && st.setup && st.setup.active) {
            setMessage(nextSetupMessage());
        } else {
            setMessage("Tap a purple circle to build a settlement.");
        }
        return;
    }

    if (uiState === "BUILD_ROAD") {
        if (snapEdges) {
            snapEdges.style.opacity = "1";
            snapEdges.style.pointerEvents = "auto";
        }

        if (st && st.setup && st.setup.active) {
            setMessage(nextSetupMessage());
        } else {
            setMessage("Tap a purple road marker to build a road.");
        }
        return;
    }

    if (uiState === "BUILD_CITY") {
        setMessage("City upgrades are not wired up yet.");
        return;
    }

    if (st) {
        setMessage(st.message || "Build test mode. Tap Road or Settle.");
    }
};

window.placeSettlement = function (x, y) {
    const st = window.settlersState;
    if (!st) return;
    normalizeSettlersState();

    if (st.setup && st.setup.active) {
        if (!isMySettlersTurn()) {
            setMessage(`Waiting for ${currentSettlersPlayer().name}.`);
            return;
        }

        if (st.setup.needed !== "settlement") {
            setMessage("You already placed the settlement. Place the road next.");
            return;
        }
    }

    const occupiedSettlement = st.pieces.settlements.some(s => Math.round(s.x) === Math.round(x) && Math.round(s.y) === Math.round(y));
    const occupiedCity = st.pieces.cities.some(c => Math.round(c.x) === Math.round(x) && Math.round(c.y) === Math.round(y));

    if (occupiedSettlement || occupiedCity) {
        setMessage("That spot is already taken.");
        return;
    }

    if (settlementIsTooClose(x, y)) {
        setMessage("That settlement is too close to another settlement.");
        return;
    }

    const settlement = {
        id: `set-${Math.round(x)}-${Math.round(y)}-${Date.now()}`,
        x,
        y,
        owner: getMyId(),
        setupRound: st.setup && st.setup.active ? (setupRoundName() === "second" ? 2 : 1) : null
    };

    st.pieces.settlements.push(settlement);

    if (st.setup && st.setup.active) {
        st.setup.pendingSettlement = settlement;
        st.setup.needed = "road";
        uiState = "BUILD_ROAD";
        st.message = nextSetupMessage();
    } else {
        st.message = "Settlement placed.";
        uiState = "IDLE";
    }

    renderSettlers();
    syncSettlers();
};

window.placeRoad = function (x1, y1, x2, y2) {
    const st = window.settlersState;
    if (!st) return;
    normalizeSettlersState();

    const edge = { x1, y1, x2, y2 };

    if (st.setup && st.setup.active) {
        if (!isMySettlersTurn()) {
            setMessage(`Waiting for ${currentSettlersPlayer().name}.`);
            return;
        }

        if (st.setup.needed !== "road" || !st.setup.pendingSettlement) {
            setMessage("Place your settlement first.");
            return;
        }

        if (!edgeTouchesPoint(edge, st.setup.pendingSettlement)) {
            setMessage("That road must touch the settlement you just placed.");
            return;
        }
    }

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

    if (st.setup && st.setup.active) {
        let gainText = "";
        const pending = st.setup.pendingSettlement;
        const isSecondSetupSettlement = pending && pending.setupRound === 2;

        if (isSecondSetupSettlement) {
            const gains = collectStartingResourcesForSettlement(pending);
            gainText = " " + summarizeGainsForPlayer(gains, pending.owner);
        }

        advanceSetupAfterRoad();

        if (st.setup && st.setup.active) {
            st.message = (gainText.trim() ? gainText.trim() + " " : "") + nextSetupMessage();
        } else if (gainText.trim()) {
            st.message = gainText.trim() + " Setup complete. " + st.message;
        }

        renderSettlers();
        syncSettlers();
        return;
    }

    st.message = "Road placed.";
    uiState = "IDLE";
    renderSettlers();
    syncSettlers();
};

window.rollSettlersDice = function () {
    const st = window.settlersState;
    if (!st) return;
    normalizeSettlersState();

    if (st.setup && st.setup.active) {
        setMessage("Finish setup before rolling dice.");
        return;
    }

    if (!isMySettlersTurn()) {
        const current = currentSettlersPlayer();
        setMessage(`Waiting for ${current.name}'s turn.`);
        return;
    }

    if (st.rolledThisTurn) {
        setMessage("You already rolled. Build, then end your turn.");
        return;
    }

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;

    st.lastRoll = { d1, d2, total };
    st.rolledThisTurn = true;

    const gains = collectResourcesForRoll(total);
    st.message = `Rolled ${d1} + ${d2} = ${total}. ${summarizeMyGains(gains)}`;

    renderSettlers();
    syncSettlers();
};

window.endSettlersTurn = function () {
    const st = window.settlersState;
    if (!st) return;
    normalizeSettlersState();

    if (st.setup && st.setup.active) {
        setMessage("Finish setup placements first.");
        return;
    }

    if (!isMySettlersTurn()) {
        const current = currentSettlersPlayer();
        setMessage(`Waiting for ${current.name}'s turn.`);
        return;
    }

    st.rolledThisTurn = false;

    if (Array.isArray(st.players) && st.players.length > 1) {
        st.turnIndex = (st.turnIndex + 1) % st.players.length;
    }

    const current = currentSettlersPlayer();
    st.message = current.id === getMyId()
        ? "Your turn. Roll the dice."
        : `${current.name}'s turn.`;

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

        const corners = hexCorners(hex);

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

    let snapNodesHtml = "";
    snapNodes.forEach(node => {
        const occupiedSettlement = st.pieces.settlements.some(s => Math.round(s.x) === Math.round(node.x) && Math.round(s.y) === Math.round(node.y));
        const occupiedCity = st.pieces.cities.some(c => Math.round(c.x) === Math.round(node.x) && Math.round(c.y) === Math.round(node.y));
        const tooClose = settlementIsTooClose(node.x, node.y);

        if (!occupiedSettlement && !occupiedCity && !tooClose) {
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

        if (occupied) return;

        if (st.setup && st.setup.active && st.setup.needed === "road" && st.setup.pendingSettlement) {
            if (!edgeTouchesPoint(edge, st.setup.pendingSettlement)) return;
        }

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

    let lastTouchX = 0;
    let lastTouchY = 0;
    let startDist = 0;
    let startScale = scale;
    let mode = "";
    let lastTap = 0;

    const minScale = 1;
    const maxScale = 3;

    function clamp(n, min, max) {
        return Math.max(min, Math.min(max, n));
    }

    function distance(t1, t2) {
        return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    }

    function midpoint(t1, t2) {
        const rect = shell.getBoundingClientRect();
        return {
            x: ((t1.clientX + t2.clientX) / 2) - rect.left,
            y: ((t1.clientY + t2.clientY) / 2) - rect.top
        };
    }

    function clampPan() {
        const w = shell.clientWidth || 1;
        const h = shell.clientHeight || 1;

        if (scale <= 1.01) {
            scale = 1;
            x = 0;
            y = 0;
            return;
        }

        const minX = w - (w * scale);
        const minY = h - (h * scale);

        x = clamp(x, minX, 0);
        y = clamp(y, minY, 0);
    }

    function applyTransform() {
        clampPan();
        zoomState = { scale, x, y };
        zoomer.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }

    applyTransform();

    shell.addEventListener("touchstart", function (e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            mode = "pinch";
            startDist = distance(e.touches[0], e.touches[1]);
            startScale = scale;
        } else if (e.touches.length === 1) {
            mode = "pan";
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
        }
    }, { passive: false });

    shell.addEventListener("touchmove", function (e) {
        if (mode === "pinch" && e.touches.length === 2) {
            e.preventDefault();

            const oldScale = scale;
            const center = midpoint(e.touches[0], e.touches[1]);
            const newDist = distance(e.touches[0], e.touches[1]);

            scale = clamp(startScale * (newDist / startDist), minScale, maxScale);

            const zoomRatio = scale / oldScale;

            x = center.x - (center.x - x) * zoomRatio;
            y = center.y - (center.y - y) * zoomRatio;

            applyTransform();
            return;
        }

        if (mode === "pan" && e.touches.length === 1 && scale > 1) {
            e.preventDefault();

            const touch = e.touches[0];
            const dx = touch.clientX - lastTouchX;
            const dy = touch.clientY - lastTouchY;

            x += dx;
            y += dy;

            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;

            applyTransform();
        }
    }, { passive: false });

    shell.addEventListener("touchend", function (e) {
        if (e.touches.length === 1) {
            mode = "pan";
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
            return;
        }

        mode = "";

        const now = Date.now();
        if (e.touches.length === 0 && now - lastTap < 280) {
            scale = 1;
            x = 0;
            y = 0;
            applyTransform();
        }

        lastTap = now;
    }, { passive: false });

    shell.addEventListener("wheel", function (e) {
        e.preventDefault();

        const rect = shell.getBoundingClientRect();
        const center = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        const oldScale = scale;
        scale = clamp(scale + (e.deltaY < 0 ? 0.15 : -0.15), minScale, maxScale);

        const zoomRatio = scale / oldScale;

        x = center.x - (center.x - x) * zoomRatio;
        y = center.y - (center.y - y) * zoomRatio;

        applyTransform();
    }, { passive: false });
}

function renderSettlers() {
    normalizeSettlersState();

    const el = document.getElementById("gameCanvasContainer");
    const st = window.settlersState;
    if (!el || !st) return;

    const myCards = getMyResourceCards();
    const brick = myCards.brick || 0;
    const wheat = myCards.wheat || 0;
    const sheep = myCards.sheep || 0;
    const wood = myCards.wood || 0;
    const ore = myCards.ore || 0;

    const currentPlayer = currentSettlersPlayer();
    const myTurn = isMySettlersTurn();
    const setupActive = !!(st.setup && st.setup.active);
    const lastRoll = st.lastRoll || { d1: 1, d2: 1, total: 2 };
    const canRoll = myTurn && !st.rolledThisTurn && !setupActive;
    const diceTitle = setupActive
        ? "Setup"
        : myTurn
            ? (st.rolledThisTurn ? "Build / End" : "Your Roll")
            : escapeHtml(currentPlayer.name) + "'s Turn";

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
                position: relative;
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

            .set-dice-panel {
                position: absolute;
                top: 8px;
                right: 8px;
                z-index: 30;
                background: rgba(255,255,255,0.92);
                border: 3px solid #1e4620;
                border-radius: 14px;
                padding: 7px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.28);
                min-width: 92px;
            }

            .set-dice-panel.active {
                border-color: #ffd700;
                box-shadow: 0 0 0 3px #ffd700, 0 5px 12px rgba(0,0,0,0.35);
            }

            .set-turn-label {
                color: #1e4620;
                font-size: 11px;
                font-weight: 900;
                text-align: center;
                line-height: 1.05;
                max-width: 100px;
            }

            .set-dice-btn {
                background: #1e4620;
                color: #fff;
                border: none;
                border-radius: 10px;
                padding: 5px 6px;
                display: flex;
                gap: 5px;
                align-items: center;
                justify-content: center;
                font-weight: 900;
                cursor: pointer;
            }

            .set-dice-btn:disabled {
                opacity: 0.55;
                cursor: default;
            }

            .set-die {
                width: 28px;
                height: 28px;
                background: #fff;
                color: #111;
                border: 2px solid #111;
                border-radius: 7px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                font-weight: 900;
                box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12);
            }

            .set-end-btn {
                width: 100%;
                border: none;
                border-radius: 9px;
                background: #ffd700;
                color: #1e4620;
                font-size: 12px;
                font-weight: 900;
                padding: 5px;
                cursor: pointer;
            }

            .set-end-btn:disabled {
                background: #999;
                color: #eee;
                cursor: default;
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
                            <div class="set-dice-panel ${canRoll ? "active" : ""}">
                                <div class="set-turn-label">${diceTitle}</div>

                                <button type="button" class="set-dice-btn" onclick="rollSettlersDice()" ${canRoll ? "" : "disabled"}>
                                    <span class="set-die">${lastRoll.d1}</span>
                                    <span class="set-die">${lastRoll.d2}</span>
                                </button>

                                <button type="button" class="set-end-btn" onclick="endSettlersTurn()" ${myTurn && !setupActive ? "" : "disabled"}>
                                    End
                                </button>
                            </div>

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

    if (setupActive) {
        uiState = setupExpectedNeed() === "road" ? "BUILD_ROAD" : "BUILD_SETTLEMENT";
    }

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
        zoomState = { scale: 1, x: 0, y: 0 };
        uiState = "BUILD_SETTLEMENT";
        window.settlersState = createState();
        syncSettlers();
    }

    normalizeSettlersState();
    renderSettlers();
};

window.handleIncomingSettlersSync = function (payload) {
    if (!payload || !payload.state) return;

    if (payload.roomGameId && window.chaserGame && window.chaserGame.activeGameId && payload.roomGameId !== window.chaserGame.activeGameId) {
        return;
    }

    window.settlersState = payload.state;
    if (window.chaserGame) window.chaserGame.activeGame = "Settlers";
    normalizeSettlersState();
    renderSettlers();
};

window.startSettlersFromLobby = window.initSettlersGame;
window.startSettlersGame = window.initSettlersGame;

})();
