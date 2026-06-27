/* CHASER SETTLERS - SEPARATE GAME FILE
Mobile-optimized Hex Resource Game
3-4 player setup with named computer players, dice, resource cards, development cards, build costs, SVG board, whole-play-area pinch zoom
*/
;(function () {
"use strict";

const MAX_PLAYERS = 4;
const MIN_PLAYERS = 3;
const HEX_SIZE = 48;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;
const NODE_KEY_PRECISION = 1;

const COMPUTER_DELAY_MS = 1800;
const COMPUTER_ROLL_DELAY_MS = 2100;
const COMPUTER_BUILD_DELAY_MS = 1900;

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
const COMPUTER_NAMES = ["Riley", "Morgan"];

const COSTS = {
    road: { brick: 1, wood: 1 },
    settlement: { brick: 1, wood: 1, sheep: 1, wheat: 1 },
    city: { wheat: 2, ore: 3 },
    card: { sheep: 1, wheat: 1, ore: 1 }
};

const DEV_CARD_INFO = {
    knight: { title: "Knight", icon: "⚔️", desc: "Play for knight power. Robber is not added yet." },
    victory: { title: "Victory Point", icon: "⭐", desc: "Worth 1 hidden point." },
    roadBuilding: { title: "Road Building", icon: "🛣️", desc: "Place 2 roads for free." },
    yearOfPlenty: { title: "Year of Plenty", icon: "🌾", desc: "Take any 2 resources." },
    monopoly: { title: "Monopoly", icon: "🧲", desc: "Choose 1 resource and take all of it from others." }
};

let uiState = "IDLE";
let zoomState = { scale: 1, x: 0, y: 0 };
let computerTimer = null;
let computerActionKey = "";
let lastResourceBurstId = "";
let yearPlentyPick = null;

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

function randomItem(items) {
    if (!items || !items.length) return null;
    return items[Math.floor(Math.random() * items.length)];
}

function emptyResourceSet() {
    return { brick: 0, wheat: 0, sheep: 0, wood: 0, ore: 0 };
}

function cloneResourceSet(cards) {
    return {
        brick: cards && cards.brick ? cards.brick : 0,
        wheat: cards && cards.wheat ? cards.wheat : 0,
        sheep: cards && cards.sheep ? cards.sheep : 0,
        wood: cards && cards.wood ? cards.wood : 0,
        ore: cards && cards.ore ? cards.ore : 0
    };
}

function buildDevelopmentDeck() {
    const deck = [];

    function add(type, count) {
        for (let i = 0; i < count; i++) deck.push(type);
    }

    add("knight", 14);
    add("victory", 5);
    add("roadBuilding", 2);
    add("yearOfPlenty", 2);
    add("monopoly", 2);

    return shuffle(deck);
}

function getLobbyPlayers() {
    const g = window.chaserGame || {};
    const humans = Array.isArray(g.players) && g.players.length
        ? g.players.slice(0, MAX_PLAYERS)
        : [{ id: getMyId(), name: myName(), seat: 0 }];

    const players = humans.map((p, idx) => ({
        id: p.id || (idx === 0 ? getMyId() : "player-" + idx),
        name: p.name || (idx === 0 ? myName() : "Player " + (idx + 1)),
        seat: idx,
        isComputer: false
    }));

    let computerIndex = 0;
    while (players.length < MIN_PLAYERS && players.length < MAX_PLAYERS && computerIndex < COMPUTER_NAMES.length) {
        const name = COMPUTER_NAMES[computerIndex];
        players.push({
            id: "computer-" + name.toLowerCase(),
            name,
            seat: players.length,
            isComputer: true
        });
        computerIndex++;
    }

    return players.slice(0, MAX_PLAYERS).map((p, idx) => ({ ...p, seat: idx }));
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

    return { hexes, ports: shuffledPorts };
}

function createState() {
    const players = getLobbyPlayers();
    const resources = {};
    const devHands = {};

    players.forEach(p => {
        resources[p.id] = emptyResourceSet();
        devHands[p.id] = [];
    });

    const setupOrder = buildSetupOrder(players.length);
    const firstPlayer = players[setupOrder[0] || 0] || players[0];

    return {
        phase: "setup",
        board: generateBoard(),
        players,
        turnIndex: setupOrder[0] || 0,
        turnNumber: 1,
        rolledThisTurn: false,
        lastRoll: null,
        highlightedRoll: null,
        pendingRoll: null,
        resourceBurst: null,
        message: `${firstPlayer.name}: place your first settlement.`,
        resources,
        devDeck: buildDevelopmentDeck(),
        devHands,
        devDiscard: [],
        playedKnights: {},
        freeRoads: null,
        setup: {
            active: true,
            order: setupOrder,
            stepIndex: 0,
            needed: "settlement",
            pendingSettlement: null
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

    if (!st.resources || typeof st.resources !== "object") st.resources = {};

    const players = Array.isArray(st.players) && st.players.length
        ? st.players
        : [{ id: getMyId(), name: myName(), seat: 0, isComputer: false }];

    players.forEach(p => {
        if (!st.resources[p.id]) st.resources[p.id] = emptyResourceSet();
        RESOURCE_TYPES.forEach(type => {
            if (typeof st.resources[p.id][type] !== "number") st.resources[p.id][type] = 0;
        });
    });
}

function ensureDevelopmentState() {
    const st = window.settlersState;
    if (!st) return;

    if (!Array.isArray(st.devDeck)) st.devDeck = buildDevelopmentDeck();
    if (!st.devHands || typeof st.devHands !== "object") st.devHands = {};
    if (!Array.isArray(st.devDiscard)) st.devDiscard = [];
    if (!st.playedKnights || typeof st.playedKnights !== "object") st.playedKnights = {};

    (st.players || []).forEach(p => {
        if (!Array.isArray(st.devHands[p.id])) st.devHands[p.id] = [];
        if (typeof st.playedKnights[p.id] !== "number") st.playedKnights[p.id] = 0;
    });
}

function normalizeSettlersState() {
    const st = window.settlersState;
    if (!st) return;

    if (!Array.isArray(st.players) || !st.players.length) st.players = getLobbyPlayers();
    st.players.forEach((p, idx) => {
        if (typeof p.seat !== "number") p.seat = idx;
        if (typeof p.isComputer !== "boolean") p.isComputer = String(p.id || "").startsWith("computer-");
    });

    if (!st.pieces) st.pieces = { settlements: [], cities: [], roads: [] };
    if (!Array.isArray(st.pieces.settlements)) st.pieces.settlements = [];
    if (!Array.isArray(st.pieces.cities)) st.pieces.cities = [];
    if (!Array.isArray(st.pieces.roads)) st.pieces.roads = [];

    if (typeof st.turnNumber !== "number") st.turnNumber = 1;
    if (typeof st.rolledThisTurn !== "boolean") st.rolledThisTurn = false;

    ensureResourceBank();
    ensureDevelopmentState();

    if (st.phase === "setup" && !st.setup) {
        st.setup = {
            active: true,
            order: buildSetupOrder(st.players.length),
            stepIndex: 0,
            needed: "settlement",
            pendingSettlement: null
        };
    }
}

function playerColor(ownerId) {
    const st = window.settlersState;
    const players = st && Array.isArray(st.players) ? st.players : [];
    const idx = players.findIndex(p => p.id === ownerId);
    return PLAYER_COLORS[idx >= 0 ? idx % PLAYER_COLORS.length : 0];
}

function playerName(playerId) {
    const st = window.settlersState;
    const p = st && st.players ? st.players.find(x => x.id === playerId) : null;
    return p ? p.name : "Player";
}

function currentSettlersPlayer() {
    const st = window.settlersState;
    if (!st || !Array.isArray(st.players) || !st.players.length) {
        return { id: getMyId(), name: myName(), seat: 0, isComputer: false };
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

function isHostPlayer() {
    const g = window.chaserGame || {};
    return !g.hostId || g.hostId === getMyId();
}

function getResourceCards(playerId) {
    ensureResourceBank();
    const st = window.settlersState;
    if (!st || !st.resources) return emptyResourceSet();
    if (!st.resources[playerId]) st.resources[playerId] = emptyResourceSet();
    return st.resources[playerId];
}

function getMyResourceCards() {
    return getResourceCards(getMyId());
}

function getDevHand(playerId) {
    ensureDevelopmentState();
    const st = window.settlersState;
    if (!st.devHands[playerId]) st.devHands[playerId] = [];
    return st.devHands[playerId];
}

function hasResources(playerId, cost) {
    const cards = getResourceCards(playerId);
    return Object.keys(cost).every(type => (cards[type] || 0) >= cost[type]);
}

function spendResources(playerId, cost) {
    if (!hasResources(playerId, cost)) return false;
    const cards = getResourceCards(playerId);
    Object.keys(cost).forEach(type => {
        cards[type] -= cost[type];
    });
    return true;
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

function roundedPointKey(point) {
    return `${Math.round(point.x / NODE_KEY_PRECISION) * NODE_KEY_PRECISION},${Math.round(point.y / NODE_KEY_PRECISION) * NODE_KEY_PRECISION}`;
}

function edgeKey(edge) {
    const a = `${Math.round(edge.x1)},${Math.round(edge.y1)}`;
    const b = `${Math.round(edge.x2)},${Math.round(edge.y2)}`;
    return [a, b].sort().join("|");
}

function pointsMatch(a, b) {
    return Math.round(a.x) === Math.round(b.x) && Math.round(a.y) === Math.round(b.y);
}

function pieceTouchesHex(piece, hex) {
    return hexCorners(hex).some(c => pointsMatch(c, piece));
}

function edgeTouchesPoint(edge, point) {
    if (!edge || !point) return false;
    return pointsMatch({ x: edge.x1, y: edge.y1 }, point) || pointsMatch({ x: edge.x2, y: edge.y2 }, point);
}

function getAllNodes() {
    const st = window.settlersState;
    const nodes = new Map();
    if (!st || !st.board || !Array.isArray(st.board.hexes)) return [];

    st.board.hexes.forEach(hex => {
        hexCorners(hex).forEach(c => {
            const key = roundedPointKey(c);
            if (!nodes.has(key)) nodes.set(key, { x: c.x, y: c.y });
        });
    });

    return Array.from(nodes.values());
}

function getAllEdges() {
    const st = window.settlersState;
    const edges = new Map();
    if (!st || !st.board || !Array.isArray(st.board.hexes)) return [];

    st.board.hexes.forEach(hex => {
        const corners = hexCorners(hex);
        corners.forEach((c, i) => {
            const next = corners[(i + 1) % 6];
            const edge = { x1: c.x, y1: c.y, x2: next.x, y2: next.y };
            const key = edgeKey(edge);
            if (!edges.has(key)) edges.set(key, edge);
        });
    });

    return Array.from(edges.values());
}

function settlementIsTooClose(x, y) {
    const st = window.settlersState;
    if (!st) return false;

    const all = st.pieces.settlements.concat(st.pieces.cities || []);
    return all.some(piece => Math.hypot(piece.x - x, piece.y - y) < HEX_SIZE + 4);
}

function nodeIsOccupied(x, y) {
    const st = window.settlersState;
    if (!st) return false;
    return st.pieces.settlements.concat(st.pieces.cities || []).some(p => Math.round(p.x) === Math.round(x) && Math.round(p.y) === Math.round(y));
}

function edgeIsOccupied(edge) {
    const st = window.settlersState;
    if (!st) return false;
    const key = edgeKey(edge);
    return st.pieces.roads.some(r => edgeKey(r) === key);
}

function nodeHasOwnRoad(playerId, node) {
    const st = window.settlersState;
    if (!st) return false;
    return st.pieces.roads.some(r => r.owner === playerId && edgeTouchesPoint(r, node));
}

function edgeConnectsToOwnNetwork(playerId, edge) {
    const st = window.settlersState;
    if (!st) return false;

    const a = { x: edge.x1, y: edge.y1 };
    const b = { x: edge.x2, y: edge.y2 };

    const ownPieceTouches = st.pieces.settlements.concat(st.pieces.cities || []).some(p =>
        p.owner === playerId && (pointsMatch(p, a) || pointsMatch(p, b))
    );

    const ownRoadTouches = st.pieces.roads.some(r =>
        r.owner === playerId && (edgeTouchesPoint(r, a) || edgeTouchesPoint(r, b))
    );

    return ownPieceTouches || ownRoadTouches;
}

function legalSettlementNodes(playerId, setupMode) {
    return getAllNodes().filter(node => {
        if (nodeIsOccupied(node.x, node.y)) return false;
        if (settlementIsTooClose(node.x, node.y)) return false;
        if (!setupMode && !nodeHasOwnRoad(playerId, node)) return false;
        return true;
    });
}

function legalRoadEdges(playerId, setupMode, pendingSettlement) {
    return getAllEdges().filter(edge => {
        if (edgeIsOccupied(edge)) return false;
        if (setupMode && pendingSettlement) return edgeTouchesPoint(edge, pendingSettlement);
        if (!setupMode && !edgeConnectsToOwnNetwork(playerId, edge)) return false;
        return true;
    });
}

function ownedSettlementPieces(playerId) {
    const st = window.settlersState;
    if (!st) return [];
    return st.pieces.settlements.filter(s => s.owner === playerId);
}

function addResourceToPlayer(ownerId, resource, amount, gains) {
    const st = window.settlersState;
    if (!st || !resource || resource === "desert" || !amount) return;

    ensureResourceBank();

    if (!st.resources[ownerId]) st.resources[ownerId] = emptyResourceSet();
    st.resources[ownerId][resource] += amount;

    if (gains) {
        if (!gains[ownerId]) gains[ownerId] = emptyResourceSet();
        gains[ownerId][resource] += amount;
    }
}

function calculateResourcesForRoll(total) {
    const st = window.settlersState;
    const gains = {};
    if (!st || !st.board || !Array.isArray(st.board.hexes)) return gains;

    function addGain(ownerId, resource, amount) {
        if (!resource || resource === "desert") return;
        if (!gains[ownerId]) gains[ownerId] = emptyResourceSet();
        gains[ownerId][resource] += amount;
    }

    st.board.hexes.forEach(hex => {
        if (hex.token !== total || hex.resource === "desert") return;

        st.pieces.settlements.forEach(settlement => {
            if (pieceTouchesHex(settlement, hex)) addGain(settlement.owner, hex.resource, 1);
        });

        st.pieces.cities.forEach(city => {
            if (pieceTouchesHex(city, hex)) addGain(city.owner, hex.resource, 2);
        });
    });

    return gains;
}

function applyResourceGains(gains) {
    if (!gains) return;
    ensureResourceBank();
    Object.keys(gains).forEach(ownerId => {
        RESOURCE_TYPES.forEach(type => {
            addResourceToPlayer(ownerId, type, gains[ownerId][type] || 0, null);
        });
    });
}

function collectStartingResourcesForSettlement(settlement) {
    const st = window.settlersState;
    const gains = {};
    if (!st || !settlement || !st.board || !Array.isArray(st.board.hexes)) return gains;

    st.board.hexes.forEach(hex => {
        if (hex.resource === "desert") return;
        if (pieceTouchesHex(settlement, hex)) addResourceToPlayer(settlement.owner, hex.resource, 1, gains);
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

function nextSetupMessage() {
    const st = window.settlersState;
    if (!st || !st.setup || !st.setup.active) return "";

    const current = currentSettlersPlayer();
    const round = setupRoundName();

    if (st.setup.needed === "road") return `${current.name}: now place a road touching that settlement.`;
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
    st.highlightedRoll = null;
    st.pendingRoll = null;
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

function applyPendingSettlersRoll(rollId) {
    const st = window.settlersState;
    if (!st || !st.pendingRoll) return;
    if (st.pendingRoll.id !== rollId) return;
    if (st.pendingRoll.applied) return;

    const gains = st.pendingRoll.gains || {};
    applyResourceGains(gains);

    st.resourceBurst = {
        id: `burst-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        gains: JSON.parse(JSON.stringify(gains))
    };

    st.pendingRoll.applied = true;
    st.highlightedRoll = null;
    st.message = `Rolled ${st.pendingRoll.d1} + ${st.pendingRoll.d2} = ${st.pendingRoll.total}. ${summarizeMyGains(gains)}`;
    st.pendingRoll = null;

    renderSettlers();
    syncSettlers();

    const current = currentSettlersPlayer();
    if (current && current.isComputer && isHostPlayer()) scheduleComputerIfNeeded(COMPUTER_BUILD_DELAY_MS);
}

function rollForCurrentPlayer() {
    const st = window.settlersState;
    if (!st || st.pendingRoll || st.rolledThisTurn) return;

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;
    const gains = calculateResourcesForRoll(total);
    const rollId = `roll-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

    st.lastRoll = { d1, d2, total };
    st.rolledThisTurn = true;
    st.highlightedRoll = total;
    st.pendingRoll = { id: rollId, d1, d2, total, gains, applied: false };
    st.message = `${currentSettlersPlayer().name} rolled ${d1} + ${d2} = ${total}. Checking resource tiles...`;

    renderSettlers();
    syncSettlers();

    setTimeout(() => applyPendingSettlersRoll(rollId), 2800);
}

window.rollSettlersDice = function () {
    const st = window.settlersState;
    if (!st) return;
    normalizeSettlersState();

    if (st.setup && st.setup.active) {
        setMessage("Finish setup before rolling dice.");
        return;
    }

    if (!isMySettlersTurn()) {
        setMessage(`Waiting for ${currentSettlersPlayer().name}'s turn.`);
        return;
    }

    if (st.pendingRoll) {
        setMessage("Wait for the dice roll to finish.");
        return;
    }

    if (st.rolledThisTurn) {
        setMessage("You already rolled. Build, then end your turn.");
        return;
    }

    rollForCurrentPlayer();
};

function endCurrentTurn() {
    const st = window.settlersState;
    if (!st) return;

    st.rolledThisTurn = false;
    st.highlightedRoll = null;
    st.pendingRoll = null;
    st.freeRoads = null;
    st.turnNumber += 1;
    yearPlentyPick = null;

    if (Array.isArray(st.players) && st.players.length > 1) st.turnIndex = (st.turnIndex + 1) % st.players.length;

    const current = currentSettlersPlayer();
    st.message = current.id === getMyId() ? "Your turn. Roll the dice." : `${current.name}'s turn.`;

    uiState = "IDLE";
    renderSettlers();
    syncSettlers();
}

window.endSettlersTurn = function () {
    const st = window.settlersState;
    if (!st) return;
    normalizeSettlersState();

    if (st.setup && st.setup.active) {
        setMessage("Finish setup placements first.");
        return;
    }

    if (st.pendingRoll) {
        setMessage("Wait for the dice roll to finish first.");
        return;
    }

    if (!isMySettlersTurn()) {
        setMessage(`Waiting for ${currentSettlersPlayer().name}'s turn.`);
        return;
    }

    endCurrentTurn();
};

function tryPlaceSettlementForPlayer(playerId, x, y, options) {
    const st = window.settlersState;
    const opts = options || {};
    normalizeSettlersState();
    if (!st) return false;

    const setupActive = st.setup && st.setup.active;

    if (setupActive) {
        const current = currentSettlersPlayer();
        if (!current || current.id !== playerId) return false;
        if (st.setup.needed !== "settlement") return false;
    }

    if (nodeIsOccupied(x, y)) {
        if (!opts.silent) setMessage("That spot is already taken.");
        return false;
    }

    if (settlementIsTooClose(x, y)) {
        if (!opts.silent) setMessage("That settlement is too close to another settlement.");
        return false;
    }

    if (!setupActive && !nodeHasOwnRoad(playerId, { x, y })) {
        if (!opts.silent) setMessage("A new settlement must connect to one of your roads.");
        return false;
    }

    if (!setupActive && !spendResources(playerId, COSTS.settlement)) {
        if (!opts.silent) setMessage("Settlement costs 🧱 + 🌲 + 🐑 + 🌾.");
        return false;
    }

    const settlement = {
        id: `set-${Math.round(x)}-${Math.round(y)}-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        x,
        y,
        owner: playerId,
        setupRound: setupActive ? (setupRoundName() === "second" ? 2 : 1) : null
    };

    st.pieces.settlements.push(settlement);

    if (setupActive) {
        st.setup.pendingSettlement = settlement;
        st.setup.needed = "road";
        uiState = "BUILD_ROAD";
        st.message = nextSetupMessage();
    } else {
        st.message = `${playerName(playerId)} built a settlement.`;
        uiState = "IDLE";
    }

    return true;
}

function tryPlaceRoadForPlayer(playerId, edge, options) {
    const st = window.settlersState;
    const opts = options || {};
    normalizeSettlersState();
    if (!st || !edge) return false;

    const setupActive = st.setup && st.setup.active;
    const usingFreeRoad = st.freeRoads && st.freeRoads.playerId === playerId && st.freeRoads.remaining > 0;

    if (setupActive) {
        const current = currentSettlersPlayer();
        if (!current || current.id !== playerId) return false;
        if (st.setup.needed !== "road" || !st.setup.pendingSettlement) return false;
        if (!edgeTouchesPoint(edge, st.setup.pendingSettlement)) {
            if (!opts.silent) setMessage("That road must touch the settlement you just placed.");
            return false;
        }
    }

    if (edgeIsOccupied(edge)) {
        if (!opts.silent) setMessage("That road is already built.");
        return false;
    }

    if (!setupActive && !edgeConnectsToOwnNetwork(playerId, edge)) {
        if (!opts.silent) setMessage("A new road must connect to your road or settlement.");
        return false;
    }

    if (!setupActive && !usingFreeRoad && !spendResources(playerId, COSTS.road)) {
        if (!opts.silent) setMessage("Road costs 🧱 + 🌲.");
        return false;
    }

    st.pieces.roads.push({
        id: `rd-${Math.round(edge.x1)}-${Math.round(edge.y1)}-${Math.round(edge.x2)}-${Math.round(edge.y2)}-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        x1: edge.x1,
        y1: edge.y1,
        x2: edge.x2,
        y2: edge.y2,
        owner: playerId
    });

    if (usingFreeRoad) {
        st.freeRoads.remaining -= 1;
        if (st.freeRoads.remaining <= 0) {
            st.freeRoads = null;
            uiState = "IDLE";
            st.message = `${playerName(playerId)} placed 2 free roads.`;
        } else {
            uiState = "BUILD_ROAD";
            st.message = `${playerName(playerId)}: place 1 more free road.`;
        }
        return true;
    }

    if (setupActive) {
        let gainText = "";
        const pending = st.setup.pendingSettlement;
        const isSecondSetupSettlement = pending && pending.setupRound === 2;

        if (isSecondSetupSettlement) {
            const gains = collectStartingResourcesForSettlement(pending);
            gainText = summarizeGainsForPlayer(gains, pending.owner);
            st.resourceBurst = { id: `burst-${Date.now()}-${Math.floor(Math.random() * 9999)}`, gains: JSON.parse(JSON.stringify(gains)) };
        }

        advanceSetupAfterRoad();

        if (st.setup && st.setup.active) {
            st.message = (gainText && gainText !== "No resources collected." ? gainText + " " : "") + nextSetupMessage();
        } else if (gainText && gainText !== "No resources collected.") {
            st.message = gainText + " Setup complete. " + st.message;
        }
    } else {
        st.message = `${playerName(playerId)} built a road.`;
        uiState = "IDLE";
    }

    return true;
}

function tryUpgradeCityForPlayer(playerId, settlementId, options) {
    const st = window.settlersState;
    const opts = options || {};
    normalizeSettlersState();
    if (!st || st.phase === "setup") return false;

    const idx = st.pieces.settlements.findIndex(s => s.id === settlementId && s.owner === playerId);
    if (idx < 0) {
        if (!opts.silent) setMessage("Choose one of your settlements to upgrade.");
        return false;
    }

    if (!spendResources(playerId, COSTS.city)) {
        if (!opts.silent) setMessage("City costs 🌾🌾 + ⛰️⛰️⛰️.");
        return false;
    }

    const settlement = st.pieces.settlements.splice(idx, 1)[0];
    st.pieces.cities.push({ id: `city-${settlement.id}`, x: settlement.x, y: settlement.y, owner: playerId });
    st.message = `${playerName(playerId)} upgraded to a city.`;
    uiState = "IDLE";
    return true;
}

function buyDevelopmentCardForPlayer(playerId, options) {
    const st = window.settlersState;
    const opts = options || {};
    normalizeSettlersState();
    if (!st || st.phase === "setup") return false;

    if (!st.devDeck.length) {
        if (!opts.silent) setMessage("No development cards left.");
        return false;
    }

    if (!spendResources(playerId, COSTS.card)) {
        if (!opts.silent) setMessage("Development card costs 🐑 + 🌾 + ⛰️.");
        return false;
    }

    const type = st.devDeck.pop();
    const hand = getDevHand(playerId);
    hand.push({
        id: `dev-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        type,
        boughtTurn: st.turnNumber
    });

    st.message = playerId === getMyId() ? "You bought a development card." : `${playerName(playerId)} bought a development card.`;
    return true;
}

window.buySettlersDevelopmentCard = function () {
    const st = window.settlersState;
    if (!st) return;
    normalizeSettlersState();

    const current = currentSettlersPlayer();
    if (current && current.isComputer) {
        setMessage(`${current.name} is thinking...`);
        return;
    }

    if (!isMySettlersTurn()) {
        setMessage(`Waiting for ${current.name}.`);
        return;
    }

    if (st.setup && st.setup.active) {
        setMessage("Development cards are after setup.");
        return;
    }

    if (st.pendingRoll) {
        setMessage("Wait for the roll to finish first.");
        return;
    }

    if (buyDevelopmentCardForPlayer(getMyId(), { silent: false })) {
        renderSettlers();
        syncSettlers();
    }
};

window.placeSettlement = function (x, y) {
    const st = window.settlersState;
    if (!st) return;
    normalizeSettlersState();

    const current = currentSettlersPlayer();
    if (current && current.isComputer) {
        setMessage(`${current.name} is thinking...`);
        return;
    }

    if (!isMySettlersTurn()) {
        setMessage(`Waiting for ${current.name}.`);
        return;
    }

    if (tryPlaceSettlementForPlayer(getMyId(), x, y, { silent: false })) {
        renderSettlers();
        syncSettlers();
    }
};

window.placeRoad = function (x1, y1, x2, y2) {
    const st = window.settlersState;
    if (!st) return;
    normalizeSettlersState();

    const current = currentSettlersPlayer();
    if (current && current.isComputer) {
        setMessage(`${current.name} is thinking...`);
        return;
    }

    if (!isMySettlersTurn()) {
        setMessage(`Waiting for ${current.name}.`);
        return;
    }

    if (tryPlaceRoadForPlayer(getMyId(), { x1, y1, x2, y2 }, { silent: false })) {
        renderSettlers();
        syncSettlers();
    }
};

window.placeCity = function (settlementId) {
    const st = window.settlersState;
    if (!st) return;
    normalizeSettlersState();

    const current = currentSettlersPlayer();
    if (current && current.isComputer) {
        setMessage(`${current.name} is thinking...`);
        return;
    }

    if (!isMySettlersTurn()) {
        setMessage(`Waiting for ${current.name}.`);
        return;
    }

    if (tryUpgradeCityForPlayer(getMyId(), settlementId, { silent: false })) {
        renderSettlers();
        syncSettlers();
    }
};

function removeDevCard(playerId, cardId) {
    const hand = getDevHand(playerId);
    const idx = hand.findIndex(c => c.id === cardId);
    if (idx < 0) return null;
    return hand.splice(idx, 1)[0];
}

function canPlayDevCard(card) {
    const st = window.settlersState;
    if (!st || !card) return false;
    if (card.type === "victory") return false;
    return card.boughtTurn !== st.turnNumber;
}

window.playSettlersDevCard = function (cardId) {
    const st = window.settlersState;
    if (!st) return;
    normalizeSettlersState();

    if (!isMySettlersTurn()) {
        setMessage(`Waiting for ${currentSettlersPlayer().name}.`);
        return;
    }

    if (st.pendingRoll) {
        setMessage("Wait for the roll to finish first.");
        return;
    }

    const hand = getDevHand(getMyId());
    const card = hand.find(c => c.id === cardId);
    if (!card) return;

    if (!canPlayDevCard(card)) {
        setMessage("You cannot play a new development card until a later turn.");
        return;
    }

    if (card.type === "knight") {
        removeDevCard(getMyId(), cardId);
        st.playedKnights[getMyId()] = (st.playedKnights[getMyId()] || 0) + 1;
        st.devDiscard.push(card.type);
        st.message = "You played a Knight.";
        closeSettlersOverlay("settlersDevOverlay");
        renderSettlers();
        syncSettlers();
        return;
    }

    if (card.type === "roadBuilding") {
        removeDevCard(getMyId(), cardId);
        st.devDiscard.push(card.type);
        st.freeRoads = { playerId: getMyId(), remaining: 2 };
        st.message = "Road Building: place 2 free roads.";
        uiState = "BUILD_ROAD";
        closeSettlersOverlay("settlersDevOverlay");
        renderSettlers();
        syncSettlers();
        return;
    }

    if (card.type === "yearOfPlenty") {
        yearPlentyPick = { cardId, picks: [] };
        showYearOfPlentyOverlay(cardId);
        return;
    }

    if (card.type === "monopoly") {
        showMonopolyOverlay(cardId);
    }
};

function closeSettlersOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

window.chooseYearPlentyResource = function (cardId, resource) {
    const st = window.settlersState;
    if (!st || !yearPlentyPick || yearPlentyPick.cardId !== cardId) return;

    yearPlentyPick.picks.push(resource);

    if (yearPlentyPick.picks.length < 2) {
        showYearOfPlentyOverlay(cardId);
        return;
    }

    const card = removeDevCard(getMyId(), cardId);
    if (!card) return;

    st.devDiscard.push(card.type);
    const gains = { [getMyId()]: emptyResourceSet() };
    yearPlentyPick.picks.forEach(type => {
        gains[getMyId()][type] += 1;
    });
    applyResourceGains(gains);
    st.resourceBurst = { id: `burst-${Date.now()}-${Math.floor(Math.random() * 9999)}`, gains };
    st.message = "Year of Plenty: you took 2 resources.";
    yearPlentyPick = null;
    closeSettlersOverlay("settlersYearOverlay");
    closeSettlersOverlay("settlersDevOverlay");
    renderSettlers();
    syncSettlers();
};

window.chooseMonopolyResource = function (cardId, resource) {
    const st = window.settlersState;
    if (!st) return;

    const card = removeDevCard(getMyId(), cardId);
    if (!card) return;

    st.devDiscard.push(card.type);
    let total = 0;

    st.players.forEach(p => {
        if (p.id === getMyId()) return;
        const cards = getResourceCards(p.id);
        total += cards[resource] || 0;
        cards[resource] = 0;
    });

    const gains = { [getMyId()]: emptyResourceSet() };
    gains[getMyId()][resource] = total;
    applyResourceGains(gains);

    st.resourceBurst = { id: `burst-${Date.now()}-${Math.floor(Math.random() * 9999)}`, gains };
    st.message = `Monopoly: you collected ${total} ${resource}.`;
    closeSettlersOverlay("settlersMonopolyOverlay");
    closeSettlersOverlay("settlersDevOverlay");
    renderSettlers();
    syncSettlers();
};

function resourceChoiceButtons(onclickName, cardId) {
    const labels = { brick: "🧱 Brick", wheat: "🌾 Wheat", sheep: "🐑 Sheep", wood: "🌲 Wood", ore: "⛰️ Ore" };
    return RESOURCE_TYPES.map(type => `
        <button type="button" onclick="${onclickName}('${cardId}', '${type}')" style="
            background:#fff;
            color:#1e4620;
            border:2px solid #2d6a30;
            border-radius:12px;
            padding:10px;
            font-size:16px;
            font-weight:900;
        ">${labels[type]}</button>
    `).join("");
}

function showYearOfPlentyOverlay(cardId) {
    const canvas = document.getElementById("gameCanvasContainer");
    if (!canvas) return;

    closeSettlersOverlay("settlersYearOverlay");
    const picked = yearPlentyPick && yearPlentyPick.picks.length ? yearPlentyPick.picks.join(", ") : "none yet";

    canvas.insertAdjacentHTML("beforeend", `
        <div id="settlersYearOverlay" class="set-overlay-backdrop">
            <div class="set-overlay-card">
                <button type="button" class="set-overlay-close" onclick="document.getElementById('settlersYearOverlay').remove()">×</button>
                <div class="set-overlay-title">🌾 Year of Plenty</div>
                <div class="set-overlay-sub">Pick 2 resources. Picked: ${escapeHtml(picked)}</div>
                <div class="set-resource-choice-grid">${resourceChoiceButtons("chooseYearPlentyResource", cardId)}</div>
            </div>
        </div>
    `);
}

function showMonopolyOverlay(cardId) {
    const canvas = document.getElementById("gameCanvasContainer");
    if (!canvas) return;

    closeSettlersOverlay("settlersMonopolyOverlay");
    canvas.insertAdjacentHTML("beforeend", `
        <div id="settlersMonopolyOverlay" class="set-overlay-backdrop">
            <div class="set-overlay-card">
                <button type="button" class="set-overlay-close" onclick="document.getElementById('settlersMonopolyOverlay').remove()">×</button>
                <div class="set-overlay-title">🧲 Monopoly</div>
                <div class="set-overlay-sub">Choose a resource to collect from everyone.</div>
                <div class="set-resource-choice-grid">${resourceChoiceButtons("chooseMonopolyResource", cardId)}</div>
            </div>
        </div>
    `);
}

window.showSettlersDevCards = function () {
    const canvas = document.getElementById("gameCanvasContainer");
    if (!canvas) return;

    normalizeSettlersState();
    closeSettlersOverlay("settlersDevOverlay");

    const hand = getDevHand(getMyId());
    const st = window.settlersState;

    const cardsHtml = hand.length ? hand.map(card => {
        const info = DEV_CARD_INFO[card.type] || DEV_CARD_INFO.knight;
        const playable = canPlayDevCard(card) && isMySettlersTurn() && !st.pendingRoll;
        const isNew = card.boughtTurn === st.turnNumber;
        const isVictory = card.type === "victory";

        return `
            <div class="set-dev-card">
                <div class="set-dev-card-icon">${info.icon}</div>
                <div class="set-dev-card-title">${escapeHtml(info.title)}</div>
                <div class="set-dev-card-desc">${escapeHtml(info.desc)}</div>
                ${isNew ? `<div class="set-dev-new">New card — playable later</div>` : ""}
                ${isVictory ? `<div class="set-dev-vp">Kept for points</div>` : `
                    <button type="button" class="set-dev-play" onclick="playSettlersDevCard('${card.id}')" ${playable ? "" : "disabled"}>Play</button>
                `}
            </div>
        `;
    }).join("") : `
        <div style="background:#fff;border:2px dashed #2d6a30;border-radius:14px;padding:16px;font-weight:900;color:#1e4620;text-align:center;">
            No development cards yet.
        </div>
    `;

    canvas.insertAdjacentHTML("beforeend", `
        <div id="settlersDevOverlay" class="set-overlay-backdrop">
            <div class="set-overlay-card set-dev-overlay-card">
                <button type="button" class="set-overlay-close" onclick="document.getElementById('settlersDevOverlay').remove()">×</button>
                <div class="set-overlay-title">🃏 Development Cards</div>
                <div class="set-overlay-sub">You have ${hand.length} card${hand.length === 1 ? "" : "s"}.</div>
                <div class="set-dev-grid">${cardsHtml}</div>
            </div>
        </div>
    `);
};

window.setSettlersUiState = function (newState) {
    const st = window.settlersState;
    const current = currentSettlersPlayer();

    if (current && current.isComputer) {
        uiState = "IDLE";
        setMessage(`${current.name} is thinking...`);
        return;
    }

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
    const snapCities = document.getElementById("snap-cities");
    const cancelBtn = document.getElementById("set-cancel");

    [snapNodes, snapEdges, snapCities].forEach(group => {
        if (group) {
            group.style.opacity = "0";
            group.style.pointerEvents = "none";
        }
    });

    if (cancelBtn) cancelBtn.style.display = uiState === "IDLE" || (st && st.setup && st.setup.active) ? "none" : "flex";

    if (uiState === "BUILD_SETTLEMENT") {
        if (snapNodes) {
            snapNodes.style.opacity = "1";
            snapNodes.style.pointerEvents = "auto";
        }
        setMessage(st && st.setup && st.setup.active ? nextSetupMessage() : "Tap a purple circle to build a settlement.");
        return;
    }

    if (uiState === "BUILD_ROAD") {
        if (snapEdges) {
            snapEdges.style.opacity = "1";
            snapEdges.style.pointerEvents = "auto";
        }
        if (st && st.freeRoads && st.freeRoads.playerId === getMyId()) {
            setMessage(`Place ${st.freeRoads.remaining} free road${st.freeRoads.remaining === 1 ? "" : "s"}.`);
        } else {
            setMessage(st && st.setup && st.setup.active ? nextSetupMessage() : "Tap a purple road marker to build a road.");
        }
        return;
    }

    if (uiState === "BUILD_CITY") {
        if (st && st.setup && st.setup.active) {
            uiState = setupExpectedNeed() === "road" ? "BUILD_ROAD" : "BUILD_SETTLEMENT";
            window.setSettlersUiState(uiState);
            return;
        }

        if (snapCities) {
            snapCities.style.opacity = "1";
            snapCities.style.pointerEvents = "auto";
        }
        setMessage("Tap one of your settlements to upgrade to a city.");
        return;
    }

    if (st) setMessage(st.message || "Your turn.");
};

window.showSettlersHelp = function () {
    const canvas = document.getElementById("gameCanvasContainer");
    if (!canvas) return;

    closeSettlersOverlay("settlersHelpOverlay");

    canvas.insertAdjacentHTML("beforeend", `
        <div id="settlersHelpOverlay" class="set-overlay-backdrop">
            <div class="set-overlay-card">
                <button type="button" class="set-overlay-close" onclick="document.getElementById('settlersHelpOverlay').remove()">×</button>
                <div class="set-overlay-title">Build Costs</div>
                <div class="set-help-list">
                    <div>🛣️ Road = 🧱 + 🌲</div>
                    <div>🏠 Settlement = 🧱 + 🌲 + 🐑 + 🌾</div>
                    <div>🏰 City = 🌾🌾 + ⛰️⛰️⛰️</div>
                    <div>🃏 Dev Card = 🐑 + 🌾 + ⛰️</div>
                </div>
                <div class="set-help-note">Setup goes forward, then backward. Starting resources come only from your second settlement.</div>
            </div>
        </div>
    `);
};

function buildSvgBoardHtml() {
    const st = window.settlersState;
    if (!st || !st.board) return "";

    let hexHtml = "";
    const snapNodes = new Map();
    const snapEdges = new Map();

    st.board.hexes.forEach(hex => {
        const rollHighlighted = st.highlightedRoll && hex.token === st.highlightedRoll;
        const hexStroke = rollHighlighted ? HIGHLIGHT_PURPLE : "#1e4620";
        const hexStrokeWidth = rollHighlighted ? 7 : 2;

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
                    stroke="${hexStroke}"
                    stroke-width="${hexStrokeWidth}"
                />
        `;

        if (hex.token) {
            const isRed = hex.token === 6 || hex.token === 8;
            hexHtml += `
                <circle cx="0" cy="0" r="15" fill="#fff" stroke="#333" stroke-width="1"/>
                <text x="0" y="5" font-family="Arial" font-weight="900" font-size="16" text-anchor="middle" fill="${isRed ? "#dc3545" : "#111"}">${hex.token}</text>
            `;
        }

        hexHtml += `</g>`;

        const corners = hexCorners(hex);
        corners.forEach((c, i) => {
            const key = roundedPointKey(c);
            if (!snapNodes.has(key)) snapNodes.set(key, c);

            const nextC = corners[(i + 1) % 6];
            const edge = { x1: c.x, y1: c.y, x2: nextC.x, y2: nextC.y };
            const keyEdge = edgeKey(edge);
            if (!snapEdges.has(keyEdge)) snapEdges.set(keyEdge, edge);
        });
    });

    let piecesHtml = "";

    st.pieces.roads.forEach(r => {
        piecesHtml += `<line x1="${r.x1}" y1="${r.y1}" x2="${r.x2}" y2="${r.y2}" stroke="${playerColor(r.owner)}" stroke-width="8" stroke-linecap="round" />`;
    });

    st.pieces.settlements.forEach(s => {
        const color = playerColor(s.owner);
        piecesHtml += `<rect x="${s.x - 10}" y="${s.y - 10}" width="20" height="20" rx="3" fill="${color}" stroke="#fff" stroke-width="2" />`;
    });

    st.pieces.cities.forEach(c => {
        const color = playerColor(c.owner);
        piecesHtml += `<path d="M ${c.x - 13} ${c.y + 10} L ${c.x - 13} ${c.y - 4} L ${c.x - 4} ${c.y - 12} L ${c.x + 13} ${c.y - 12} L ${c.x + 13} ${c.y + 10} Z" fill="${color}" stroke="#fff" stroke-width="2" />`;
    });

    let snapNodesHtml = "";
    const setupMode = !!(st.setup && st.setup.active);
    const current = currentSettlersPlayer();
    const playerId = current ? current.id : getMyId();

    const legalNodes = legalSettlementNodes(playerId, setupMode);
    snapNodes.forEach(node => {
        const legal = legalNodes.some(n => pointsMatch(n, node));
        if (!legal) return;

        snapNodesHtml += `<circle cx="${node.x}" cy="${node.y}" r="10" fill="rgba(138, 43, 226, 0.20)" stroke="${HIGHLIGHT_PURPLE}" stroke-width="3" style="cursor:pointer;" onclick="placeSettlement(${node.x}, ${node.y})" />`;
    });

    let snapEdgesHtml = "";
    const pendingSettlement = st.setup && st.setup.active ? st.setup.pendingSettlement : null;
    legalRoadEdges(playerId, setupMode, pendingSettlement).forEach(edge => {
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
                <line x1="${edge.x1}" y1="${edge.y1}" x2="${edge.x2}" y2="${edge.y2}" stroke="rgba(0,0,0,0)" stroke-width="18" stroke-linecap="round" pointer-events="stroke" onclick="placeRoad(${edge.x1}, ${edge.y1}, ${edge.x2}, ${edge.y2})" />
                <line x1="${vx1}" y1="${vy1}" x2="${vx2}" y2="${vy2}" stroke="${HIGHLIGHT_PURPLE}" stroke-width="6" stroke-linecap="round" opacity="0.95" pointer-events="none" />
            </g>
        `;
    });

    let snapCitiesHtml = "";
    ownedSettlementPieces(getMyId()).forEach(s => {
        snapCitiesHtml += `<circle cx="${s.x}" cy="${s.y}" r="16" fill="rgba(138, 43, 226, 0.20)" stroke="${HIGHLIGHT_PURPLE}" stroke-width="4" style="cursor:pointer;" onclick="placeCity('${s.id}')" />`;
    });

    return `
        <div class="set-board-zoomer">
            <svg viewBox="-70 -70 470 430" preserveAspectRatio="xMidYMid meet">
                <g id="hex-grid">${hexHtml}</g>
                <g id="placed-pieces">${piecesHtml}</g>
                <g id="snap-edges" style="opacity:0; pointer-events:none;">${snapEdgesHtml}</g>
                <g id="snap-nodes" style="opacity:0; pointer-events:none;">${snapNodesHtml}</g>
                <g id="snap-cities" style="opacity:0; pointer-events:none;">${snapCitiesHtml}</g>
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
        return { x: ((t1.clientX + t2.clientX) / 2) - rect.left, y: ((t1.clientY + t2.clientY) / 2) - rect.top };
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
            x += touch.clientX - lastTouchX;
            y += touch.clientY - lastTouchY;
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
        const center = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const oldScale = scale;
        scale = clamp(scale + (e.deltaY < 0 ? 0.15 : -0.15), minScale, maxScale);
        const zoomRatio = scale / oldScale;
        x = center.x - (center.x - x) * zoomRatio;
        y = center.y - (center.y - y) * zoomRatio;
        applyTransform();
    }, { passive: false });
}

function computerPickSettlement(playerId, setupMode) {
    const nodes = legalSettlementNodes(playerId, setupMode);
    if (!nodes.length) return null;

    const st = window.settlersState;
    const scored = nodes.map(node => {
        let score = 0;
        st.board.hexes.forEach(hex => {
            if (!pieceTouchesHex(node, hex)) return;
            if (hex.resource === "desert") score -= 10;
            else score += 2;
            if (hex.token === 6 || hex.token === 8) score += 4;
            if (hex.token === 5 || hex.token === 9) score += 3;
            if (hex.token === 4 || hex.token === 10) score += 2;
        });
        return { node, score: score + Math.random() };
    }).sort((a, b) => b.score - a.score);

    return scored[0].node;
}

function computerPickRoad(playerId, setupMode, pendingSettlement) {
    const edges = legalRoadEdges(playerId, setupMode, pendingSettlement);
    return randomItem(edges);
}

function computerTryBuild(player) {
    if (!player) return false;

    const st = window.settlersState;
    if (!st || st.phase !== "playing") return false;

    const settlements = ownedSettlementPieces(player.id);
    if (settlements.length && hasResources(player.id, COSTS.city)) {
        const target = randomItem(settlements);
        if (target && tryUpgradeCityForPlayer(player.id, target.id, { silent: true })) return true;
    }

    if (hasResources(player.id, COSTS.settlement)) {
        const node = computerPickSettlement(player.id, false);
        if (node && tryPlaceSettlementForPlayer(player.id, node.x, node.y, { silent: true })) return true;
    }

    if (hasResources(player.id, COSTS.road)) {
        const edge = computerPickRoad(player.id, false, null);
        if (edge && tryPlaceRoadForPlayer(player.id, edge, { silent: true })) return true;
    }

    if (hasResources(player.id, COSTS.card) && Math.random() < 0.55) {
        if (buyDevelopmentCardForPlayer(player.id, { silent: true })) return true;
    }

    return false;
}

function computerTakeAction() {
    const st = window.settlersState;
    if (!st || !isHostPlayer()) return;
    normalizeSettlersState();

    const player = currentSettlersPlayer();
    if (!player || !player.isComputer) return;
    if (st.pendingRoll) return;

    if (st.setup && st.setup.active) {
        if (st.setup.needed === "settlement") {
            const node = computerPickSettlement(player.id, true);
            if (node) {
                tryPlaceSettlementForPlayer(player.id, node.x, node.y, { silent: true });
                renderSettlers();
                syncSettlers();
                scheduleComputerIfNeeded(COMPUTER_BUILD_DELAY_MS);
            }
            return;
        }

        if (st.setup.needed === "road") {
            const edge = computerPickRoad(player.id, true, st.setup.pendingSettlement);
            if (edge) {
                tryPlaceRoadForPlayer(player.id, edge, { silent: true });
                renderSettlers();
                syncSettlers();
                scheduleComputerIfNeeded(COMPUTER_BUILD_DELAY_MS);
            }
            return;
        }
    }

    if (st.phase === "playing") {
        if (!st.rolledThisTurn) {
            rollForCurrentPlayer();
            return;
        }

        computerTryBuild(player);
        renderSettlers();
        syncSettlers();

        setTimeout(() => {
            const nowPlayer = currentSettlersPlayer();
            if (nowPlayer && nowPlayer.id === player.id && nowPlayer.isComputer && !window.settlersState.pendingRoll) {
                endCurrentTurn();
            }
        }, COMPUTER_BUILD_DELAY_MS);
    }
}

function scheduleComputerIfNeeded(delay) {
    const st = window.settlersState;
    if (!st || !isHostPlayer()) return;

    const player = currentSettlersPlayer();
    if (!player || !player.isComputer) return;

    const key = [
        st.phase,
        st.setup && st.setup.active ? st.setup.stepIndex : "play",
        st.setup && st.setup.active ? st.setup.needed : st.turnIndex,
        st.rolledThisTurn ? "rolled" : "notrolled",
        st.pendingRoll ? "pending" : "free",
        st.freeRoads ? st.freeRoads.remaining : "nofree"
    ].join("|");

    if (computerActionKey === key && computerTimer) return;

    computerActionKey = key;
    if (computerTimer) clearTimeout(computerTimer);

    computerTimer = setTimeout(() => {
        computerTimer = null;
        computerTakeAction();
    }, delay || COMPUTER_DELAY_MS);
}

function getResourceBurstHtml(type, amount) {
    if (!amount) return "";
    return `<span class="set-resource-burst">+${amount}</span>`;
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
    const myDevCount = getDevHand(getMyId()).length;

    const currentPlayer = currentSettlersPlayer();
    const myTurn = isMySettlersTurn();
    const computerTurn = currentPlayer && currentPlayer.isComputer;
    const setupActive = !!(st.setup && st.setup.active);
    const pendingRoll = st.pendingRoll && !st.pendingRoll.applied ? st.pendingRoll : null;
    const canRoll = myTurn && !st.rolledThisTurn && !setupActive && !pendingRoll && !computerTurn;
    const canEnd = myTurn && st.rolledThisTurn && !setupActive && !pendingRoll && !computerTurn;
    const rollButtonActive = canRoll || canEnd;
    const rollButtonLabel = canEnd ? "End" : "Roll";
    const rollButtonIcon = canEnd ? "➡️" : "🎲";
    const rollButtonAction = canEnd ? "endSettlersTurn()" : "rollSettlersDice()";

    let burst = null;
    if (st.resourceBurst && st.resourceBurst.id !== lastResourceBurstId) {
        lastResourceBurstId = st.resourceBurst.id;
        burst = cloneResourceSet(st.resourceBurst.gains && st.resourceBurst.gains[getMyId()]);
    }

    el.innerHTML = `
        <style>
            .set-wrap { display:flex; flex-direction:column; height:100%; width:100%; background:${COLORS.ocean}; color:#111; font-family:Arial,sans-serif; overflow:hidden; }
            .set-header { background:#1e4620; color:#ffd700; padding:10px; text-align:center; font-weight:900; font-size:15px; box-shadow:0 4px 10px rgba(0,0,0,0.3); z-index:10; flex-shrink:0; }
            .set-zoom-shell { flex:1; overflow:hidden; touch-action:none; background:${COLORS.ocean}; position:relative; }
            #settlersPanZoom { width:100%; height:100%; transform-origin:top left; will-change:transform; }
            .set-play-area { width:100%; height:100%; display:flex; flex-direction:column; background:#d7e0cf; }
            .set-map-viewport { flex:1; min-height:300px; display:flex; align-items:center; justify-content:center; padding:8px; background:${COLORS.ocean}; border-bottom:3px solid #1e4620; box-sizing:border-box; position:relative; }
            .set-board-zoomer { width:100%; max-width:560px; margin:0 auto; }
            .set-board-zoomer svg { width:100%; height:auto; display:block; }
            .set-roll-overlay { position:absolute; left:50%; top:50%; transform:translate(-50%, -50%); z-index:40; background:rgba(255,255,255,0.94); border:4px solid ${HIGHLIGHT_PURPLE}; border-radius:18px; padding:14px 18px; box-shadow:0 6px 18px rgba(0,0,0,0.38); display:flex; flex-direction:column; align-items:center; gap:8px; color:#1e4620; font-weight:900; pointer-events:none; }
            .set-roll-big-dice { display:flex; gap:10px; }
            .set-roll-die { width:54px; height:54px; background:#fff; border:3px solid #111; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:34px; font-weight:900; color:#111; box-shadow:inset 0 0 0 2px rgba(0,0,0,0.08); }
            .set-roll-total { font-size:17px; color:${HIGHLIGHT_PURPLE}; }
            .set-hand-ui { background:#d7e0cf; border-top:3px solid #1e4620; padding:10px 8px 42px 8px; flex-shrink:0; display:flex; flex-direction:column; gap:9px; box-sizing:border-box; }
            .set-resources { display:flex; justify-content:space-around; align-items:center; font-size:16px; font-weight:900; color:#1e4620; background:#f5f5f5; padding:10px 6px; border-radius:14px; border:3px solid #2d6a30; }
            .set-res-item { position:relative; min-width:42px; text-align:center; }
            .set-resource-burst { position:absolute; left:50%; top:-10px; transform:translateX(-50%); color:#ffd700; background:#1e4620; border:2px solid #fff; border-radius:999px; padding:1px 7px; font-size:16px; font-weight:900; animation:setFloatUp 1.25s ease-out forwards; pointer-events:none; box-shadow:0 3px 8px rgba(0,0,0,.35); }
            @keyframes setFloatUp { 0% { opacity:0; transform:translate(-50%, 10px) scale(.75); } 18% { opacity:1; transform:translate(-50%, -10px) scale(1.2); } 100% { opacity:0; transform:translate(-50%, -48px) scale(1); } }
            .set-dev-pile-row { display:flex; justify-content:center; margin-top:-2px; }
            .set-dev-pile-btn { background:#102b63; color:#fff; border:2px solid #fff; border-radius:999px; padding:6px 14px; font-size:13px; font-weight:900; box-shadow:0 3px 8px rgba(0,0,0,.28); }
            .set-actions { display:grid; grid-template-columns:repeat(6, minmax(0, 1fr)); gap:8px; }
            .set-act-btn { min-height:78px; padding:7px 3px; border-radius:14px; border:2px solid #2d6a30; background:#2d6a30; color:#fff; font-weight:900; cursor:pointer; box-shadow:0 3px 8px rgba(0,0,0,0.22); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; text-align:center; line-height:1.05; }
            .set-act-btn:active { transform:scale(0.96); }
            .set-act-btn:disabled { opacity:.55; cursor:default; }
            .set-act-btn .ico { font-size:25px; line-height:1; }
            .set-act-btn .lbl { font-size:11px; line-height:1.05; }
            .set-act-btn.card-btn { background:#ffd700; color:#1e4620; border-color:#d3b200; }
            .set-act-btn.cancel-btn { background:#dc3545; border-color:#bd2130; display:none; }
            .set-roll-btn { background:#6b3fa0; border-color:#ffffff; }
            .set-roll-btn.active { background:#ff8c00; color:#111; border-color:#ffd700; box-shadow:0 0 0 3px #ffd700, 0 4px 10px rgba(0,0,0,0.35); }
            .set-help-btn { background:#1d4ed8; border-color:#ffffff; }
            .set-overlay-backdrop { position:absolute; inset:0; z-index:99999; background:rgba(0,0,0,.76); display:flex; align-items:center; justify-content:center; padding:12px; box-sizing:border-box; }
            .set-overlay-card { width:96%; max-width:370px; max-height:92%; overflow:auto; background:#eaf4df; border:4px solid #ffd700; border-radius:18px; padding:12px; box-sizing:border-box; color:#1e4620; font-weight:900; box-shadow:0 6px 18px rgba(0,0,0,.45); position:relative; }
            .set-overlay-close { position:absolute; top:8px; right:8px; width:38px; height:38px; border-radius:999px; border:2px solid #fff; background:#dc3545; color:#fff; font-size:24px; font-weight:900; line-height:1; }
            .set-overlay-title { font-family:Impact,sans-serif; font-size:28px; color:#1e4620; text-align:center; margin-bottom:10px; padding-right:34px; }
            .set-overlay-sub { text-align:center; color:#2d6a30; font-size:14px; margin-bottom:10px; }
            .set-help-list { display:flex; flex-direction:column; gap:8px; font-size:17px; }
            .set-help-list div { background:#fff; border:2px solid #2d6a30; border-radius:12px; padding:9px; }
            .set-help-note { margin-top:10px; background:#fff3cd; border:2px solid #d3b200; border-radius:12px; padding:9px; font-size:14px; }
            .set-dev-grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:9px; }
            .set-dev-card { background:#fff; border:2px solid #2d6a30; border-radius:14px; padding:9px; min-height:150px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:5px; box-sizing:border-box; }
            .set-dev-card-icon { font-size:30px; }
            .set-dev-card-title { font-family:Impact,sans-serif; color:#1e4620; font-size:20px; }
            .set-dev-card-desc { font-size:12px; color:#334; line-height:1.15; }
            .set-dev-new, .set-dev-vp { font-size:11px; color:#8a2be2; font-weight:900; }
            .set-dev-play { margin-top:auto; width:100%; border:none; border-radius:10px; padding:7px; background:#1d4ed8; color:#fff; font-weight:900; }
            .set-dev-play:disabled { background:#999; color:#eee; }
            .set-resource-choice-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        </style>

        <div class="set-wrap">
            <div class="set-header" id="set-msg">${escapeHtml(st.message)}</div>
            <div class="set-zoom-shell">
                <div id="settlersPanZoom">
                    <div class="set-play-area">
                        <div class="set-map-viewport">
                            ${pendingRoll ? `
                                <div class="set-roll-overlay">
                                    <div class="set-roll-big-dice">
                                        <div class="set-roll-die">${pendingRoll.d1}</div>
                                        <div class="set-roll-die">${pendingRoll.d2}</div>
                                    </div>
                                    <div class="set-roll-total">Total: ${pendingRoll.total}</div>
                                </div>
                            ` : ""}
                            ${buildSvgBoardHtml()}
                        </div>

                        <div class="set-hand-ui">
                            <div class="set-resources">
                                <span class="set-res-item">🧱 ${brick}${getResourceBurstHtml("brick", burst && burst.brick)}</span>
                                <span class="set-res-item">🌾 ${wheat}${getResourceBurstHtml("wheat", burst && burst.wheat)}</span>
                                <span class="set-res-item">🐑 ${sheep}${getResourceBurstHtml("sheep", burst && burst.sheep)}</span>
                                <span class="set-res-item">🌲 ${wood}${getResourceBurstHtml("wood", burst && burst.wood)}</span>
                                <span class="set-res-item">⛰️ ${ore}${getResourceBurstHtml("ore", burst && burst.ore)}</span>
                            </div>

                            <div class="set-dev-pile-row">
                                <button type="button" class="set-dev-pile-btn" onclick="showSettlersDevCards()">🃏 My Cards: ${myDevCount}</button>
                            </div>

                            <div class="set-actions">
                                <button type="button" class="set-act-btn" onclick="setSettlersUiState('BUILD_ROAD')" ${computerTurn ? "disabled" : ""}>
                                    <span class="ico">🛣️</span><span class="lbl">Road</span>
                                </button>
                                <button type="button" class="set-act-btn" onclick="setSettlersUiState('BUILD_SETTLEMENT')" ${computerTurn ? "disabled" : ""}>
                                    <span class="ico">🏠</span><span class="lbl">Settle</span>
                                </button>
                                <button type="button" class="set-act-btn" onclick="setSettlersUiState('BUILD_CITY')" ${computerTurn || setupActive ? "disabled" : ""}>
                                    <span class="ico">🏰</span><span class="lbl">City</span>
                                </button>
                                <button type="button" class="set-act-btn card-btn" onclick="buySettlersDevelopmentCard()" ${computerTurn || setupActive ? "disabled" : ""}>
                                    <span class="ico">🃏</span><span class="lbl">Buy Card</span>
                                </button>
                                <button type="button" class="set-act-btn set-roll-btn ${rollButtonActive ? "active" : ""}" onclick="${rollButtonAction}" ${rollButtonActive ? "" : "disabled"}>
                                    <span class="ico">${rollButtonIcon}</span><span class="lbl">${rollButtonLabel}</span>
                                </button>
                                <button type="button" class="set-act-btn set-help-btn" onclick="showSettlersHelp()">
                                    <span class="ico">❔</span><span class="lbl">Help</span>
                                </button>
                                <button type="button" class="set-act-btn cancel-btn" id="set-cancel" onclick="setSettlersUiState('IDLE')">
                                    <span class="ico">✕</span><span class="lbl">Cancel</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (setupActive) uiState = setupExpectedNeed() === "road" ? "BUILD_ROAD" : "BUILD_SETTLEMENT";

    if (!computerTurn) {
        window.setSettlersUiState(uiState);
    } else {
        uiState = "IDLE";
        setMessage(st.message || `${currentPlayer.name} is thinking...`);
    }

    initSettlersPanZoom();
    scheduleComputerIfNeeded(computerTurn ? COMPUTER_DELAY_MS : 0);
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
        computerActionKey = "";
        lastResourceBurstId = "";
        yearPlentyPick = null;
        if (computerTimer) clearTimeout(computerTimer);
        computerTimer = null;
        window.settlersState = createState();
        syncSettlers();
    }

    normalizeSettlersState();
    renderSettlers();
};

window.handleIncomingSettlersSync = function (payload) {
    if (!payload || !payload.state) return;

    if (payload.roomGameId && window.chaserGame && window.chaserGame.activeGameId && payload.roomGameId !== window.chaserGame.activeGameId) return;

    window.settlersState = payload.state;
    if (window.chaserGame) window.chaserGame.activeGame = "Settlers";
    normalizeSettlersState();
    renderSettlers();
};

window.startSettlersFromLobby = window.initSettlersGame;
window.startSettlersGame = window.initSettlersGame;

})();
