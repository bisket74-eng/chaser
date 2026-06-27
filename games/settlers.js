/* CHASER SETTLERS - SEPARATE GAME FILE - ASCII ICON SAFE
Mobile-optimized Hex Resource Game
3-4 player setup with named computer players, dice, resource cards, development cards, ports, trading, and action availability
*/
;(function () {
"use strict";

const MAX_PLAYERS = 4;
const MIN_PLAYERS = 3;
const HEX_SIZE = 48;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;
const NODE_KEY_PRECISION = 1;

const COMPUTER_DELAY_MS = 2600;
const COMPUTER_ROLL_DELAY_MS = 3100;
const COMPUTER_BUILD_DELAY_MS = 3200;
const ROLL_REVEAL_MS = 3000;

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

const ICONS = {
    brick: "&#129521;",
    wheat: "&#127806;",
    sheep: "&#128017;",
    wood: "&#127794;",
    ore: "&#9968;",
    desert: "Desert"
};

const RESOURCE_NAMES = {
    brick: "Brick",
    wheat: "Wheat",
    sheep: "Wool",
    wood: "Wood",
    ore: "Ore",
    desert: "Desert"
};

const DEV_CARD_INFO = {
    knight: { title: "Knight", icon: "&#9876;", desc: "Play for knight power. Robber is not added yet." },
    victory: { title: "Victory Point", icon: "&#11088;", desc: "Worth 1 hidden point." },
    roadBuilding: { title: "Road Building", icon: "&#128739;", desc: "Place 2 roads for free." },
    yearOfPlenty: { title: "Year of Plenty", icon: "&#127806;", desc: "Take any 2 resources." },
    monopoly: { title: "Monopoly", icon: "M", desc: "Choose 1 resource and take all of it from others." }
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

function makeBoardPositions() {
    const gridShape = [3, 4, 5, 4, 3];
    const hexes = [];

    for (let r = 0; r < gridShape.length; r++) {
        for (let q = 0; q < gridShape[r]; q++) {
            const y = r * (HEX_HEIGHT * 0.75);
            const xOffset = (5 - gridShape[r]) * (HEX_WIDTH / 2);
            const x = xOffset + (q * HEX_WIDTH);
            hexes.push({ row: r, col: q, x, y, resource: null, token: null });
        }
    }

    return hexes;
}

function hexesAreAdjacent(a, b) {
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    return Math.abs(dist - HEX_WIDTH) < 5;
}

function scoreBoardCandidate(hexes) {
    let score = 0;

    for (let i = 0; i < hexes.length; i++) {
        for (let j = i + 1; j < hexes.length; j++) {
            if (!hexesAreAdjacent(hexes[i], hexes[j])) continue;

            if (hexes[i].resource === hexes[j].resource && hexes[i].resource !== "desert") score -= 8;
            if ((hexes[i].token === 6 || hexes[i].token === 8) && (hexes[j].token === 6 || hexes[j].token === 8)) score -= 20;
            if (hexes[i].token && hexes[j].token && Math.abs(hexes[i].token - hexes[j].token) === 0) score -= 4;
        }
    }

    const center = { x: HEX_WIDTH * 2, y: HEX_HEIGHT * 1.5 };
    hexes.forEach(hex => {
        const nearCenter = Math.hypot(hex.x - center.x, hex.y - center.y) < HEX_WIDTH * 1.4;
        if (nearCenter && (hex.token === 6 || hex.token === 8)) score += 3;
        if (nearCenter && hex.resource === "desert") score -= 2;
    });

    return score;
}

function edgeKey(edge) {
    const a = `${Math.round(edge.x1)},${Math.round(edge.y1)}`;
    const b = `${Math.round(edge.x2)},${Math.round(edge.y2)}`;
    return [a, b].sort().join("|");
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

function getAllEdgesFromHexes(hexes) {
    const edges = new Map();
    hexes.forEach(hex => {
        const corners = hexCorners(hex);
        corners.forEach((c, i) => {
            const next = corners[(i + 1) % 6];
            const edge = { x1: c.x, y1: c.y, x2: next.x, y2: next.y, count: 0 };
            const key = edgeKey(edge);
            if (!edges.has(key)) edges.set(key, edge);
            edges.get(key).count++;
        });
    });
    return Array.from(edges.values());
}

function pickPortEdges(hexes, portTypes) {
    const center = {
        x: hexes.reduce((sum, h) => sum + h.x, 0) / hexes.length,
        y: hexes.reduce((sum, h) => sum + h.y, 0) / hexes.length
    };

    const boundary = getAllEdgesFromHexes(hexes)
        .filter(e => e.count === 1)
        .map(edge => {
            const mx = (edge.x1 + edge.x2) / 2;
            const my = (edge.y1 + edge.y2) / 2;
            const angle = Math.atan2(my - center.y, mx - center.x);
            return { ...edge, mx, my, angle };
        })
        .sort((a, b) => a.angle - b.angle);

    const chosen = [];
    const shuffledPorts = shuffle(portTypes);

    for (let i = 0; i < shuffledPorts.length; i++) {
        const idx = Math.floor((i * boundary.length) / shuffledPorts.length);
        const edge = boundary[idx];
        const outX = Math.cos(edge.angle) * 76;
        const outY = Math.sin(edge.angle) * 76;
        chosen.push({
            type: shuffledPorts[i],
            x1: edge.x1,
            y1: edge.y1,
            x2: edge.x2,
            y2: edge.y2,
            mx: edge.mx,
            my: edge.my,
            lx: edge.mx + outX,
            ly: edge.my + outY
        });
    }

    return chosen;
}

function generateBoard() {
    let best = null;
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < 450; attempt++) {
        const positions = makeBoardPositions();
        const resources = shuffle(RESOURCES);
        const tokens = shuffle(TOKENS);
        let tokenIndex = 0;

        positions.forEach((hex, i) => {
            hex.resource = resources[i];
            hex.token = hex.resource === "desert" ? null : tokens[tokenIndex++];
        });

        const score = scoreBoardCandidate(positions);
        if (score > bestScore) {
            bestScore = score;
            best = positions.map(h => ({ ...h }));
        }
    }

    const finalHexes = best || makeBoardPositions();

    return {
        hexes: finalHexes,
        ports: pickPortEdges(finalHexes, PORTS)
    };
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
        pendingTrade: null,
        message: `${firstPlayer.name}: choose Settle below for your first settlement.`,
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
    if (!st.board || !Array.isArray(st.board.hexes)) st.board = generateBoard();
    if (!Array.isArray(st.board.ports)) st.board.ports = pickPortEdges(st.board.hexes, PORTS);

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

function roundedPointKey(point) {
    return `${Math.round(point.x / NODE_KEY_PRECISION) * NODE_KEY_PRECISION},${Math.round(point.y / NODE_KEY_PRECISION) * NODE_KEY_PRECISION}`;
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
    if (cards.brick) parts.push(`brick +${cards.brick}`);
    if (cards.wheat) parts.push(`wheat +${cards.wheat}`);
    if (cards.sheep) parts.push(`wool +${cards.sheep}`);
    if (cards.wood) parts.push(`wood +${cards.wood}`);
    if (cards.ore) parts.push(`ore +${cards.ore}`);
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

    if (st.setup.needed === "road") return `${current.name}: choose Road below for the road touching that settlement.`;
    return `${current.name}: choose Settle below for your ${round} settlement.`;
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
    uiState = "IDLE";
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

function getPlayerPorts(playerId) {
    const st = window.settlersState;
    if (!st || !st.board || !Array.isArray(st.board.ports)) return [];

    const pieces = st.pieces.settlements.concat(st.pieces.cities || []).filter(p => p.owner === playerId);

    return st.board.ports.filter(port => {
        const a = { x: port.x1, y: port.y1 };
        const b = { x: port.x2, y: port.y2 };
        return pieces.some(piece => pointsMatch(piece, a) || pointsMatch(piece, b));
    }).map(port => port.type);
}

function bestTradeRate(playerId, giveType) {
    const ports = getPlayerPorts(playerId);
    if (ports.includes(giveType)) return 2;
    if (ports.includes("3:1")) return 3;
    return 4;
}

function canTradeNow(playerId) {
    const st = window.settlersState;
    return !!(st && st.phase === "playing" && isMySettlersTurn() && playerId === getMyId() && st.rolledThisTurn && !st.pendingRoll);
}

window.openSettlersTrade = function (giveType) {
    const st = window.settlersState;
    if (!st) return;

    if (!canTradeNow(getMyId())) {
        setMessage("You can trade during your turn after rolling.");
        return;
    }

    const rate = bestTradeRate(getMyId(), giveType);
    const cards = getMyResourceCards();
    if ((cards[giveType] || 0) < rate) {
        setMessage(`Need ${rate} ${giveType} to trade.`);
        return;
    }

    showTradeOverlay(giveType);
};

window.completeSettlersTrade = function (giveType, receiveType) {
    const st = window.settlersState;
    if (!st) return;

    if (!canTradeNow(getMyId())) {
        setMessage("You can trade during your turn after rolling.");
        return;
    }

    const rate = bestTradeRate(getMyId(), giveType);
    const cost = {};
    cost[giveType] = rate;

    if (!spendResources(getMyId(), cost)) {
        setMessage(`Need ${rate} ${giveType} to trade.`);
        return;
    }

    const gains = { [getMyId()]: emptyResourceSet() };
    gains[getMyId()][receiveType] = 1;
    applyResourceGains(gains);

    st.resourceBurst = { id: `burst-${Date.now()}-${Math.floor(Math.random() * 9999)}`, gains };
    st.message = `Traded ${rate} ${ICONS[giveType]} for 1 ${ICONS[receiveType]}.`;

    closeSettlersOverlay("settlersTradeOverlay");
    closeSettlersOverlay("settlersDevOverlay");
    renderSettlers();
    syncSettlers();
};

function canPlayerTradeNow() {
    const st = window.settlersState;
    return !!(st && st.phase === "playing" && isMySettlersTurn() && st.rolledThisTurn && !st.pendingRoll);
}

function resourceOptionsHtml(selected) {
    return RESOURCE_TYPES.map(type => `<option value="${type}" ${selected === type ? "selected" : ""}>${RESOURCE_NAMES[type]}</option>`).join("");
}

function amountOptionsHtml(selected) {
    let html = "";
    for (let i = 1; i <= 4; i++) html += `<option value="${i}" ${selected === i ? "selected" : ""}>${i}</option>`;
    return html;
}

function otherPlayerOptionsHtml() {
    const st = window.settlersState;
    return (st.players || []).filter(p => p.id !== getMyId()).map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
}

window.openSettlersPlayerTrade = function () {
    const canvas = document.getElementById("gameCanvasContainer");
    if (!canvas) return;

    if (!canPlayerTradeNow()) {
        setMessage("Player trades open during your turn after rolling.");
        return;
    }

    closeSettlersOverlay("settlersPlayerTradeOverlay");

    canvas.insertAdjacentHTML("beforeend", `
        <div id="settlersPlayerTradeOverlay" class="set-overlay-backdrop">
            <div class="set-overlay-card set-trade-overlay-card">
                <button type="button" class="set-overlay-close set-floating-close" onclick="document.getElementById('settlersPlayerTradeOverlay').remove()">&times;</button>
                <div class="set-overlay-title">Player Trade</div>
                <div class="set-overlay-sub">Offer one resource trade to a player. Named computer players answer right away.</div>

                <div class="set-player-trade-grid">
                    <label>Trade with<select id="setTradeTarget">${otherPlayerOptionsHtml()}</select></label>
                    <label>You give<select id="setTradeGiveType">${resourceOptionsHtml("brick")}</select></label>
                    <label>Give amount<select id="setTradeGiveAmount">${amountOptionsHtml(1)}</select></label>
                    <label>You want<select id="setTradeWantType">${resourceOptionsHtml("wood")}</select></label>
                    <label>Want amount<select id="setTradeWantAmount">${amountOptionsHtml(1)}</select></label>
                </div>

                <button type="button" class="set-player-trade-send" onclick="sendSettlersPlayerTradeOffer()">Send Offer</button>
            </div>
        </div>
    `);
};

function getSelectedTradeOffer() {
    const target = document.getElementById("setTradeTarget");
    const giveType = document.getElementById("setTradeGiveType");
    const giveAmount = document.getElementById("setTradeGiveAmount");
    const wantType = document.getElementById("setTradeWantType");
    const wantAmount = document.getElementById("setTradeWantAmount");

    if (!target || !giveType || !giveAmount || !wantType || !wantAmount) return null;

    return {
        targetId: target.value,
        giveType: giveType.value,
        giveAmount: Number(giveAmount.value || 1),
        wantType: wantType.value,
        wantAmount: Number(wantAmount.value || 1)
    };
}

function settlePlayerTrade(fromId, toId, giveType, giveAmount, wantType, wantAmount) {
    const fromCards = getResourceCards(fromId);
    const toCards = getResourceCards(toId);

    if ((fromCards[giveType] || 0) < giveAmount) return false;
    if ((toCards[wantType] || 0) < wantAmount) return false;

    fromCards[giveType] -= giveAmount;
    toCards[giveType] += giveAmount;
    toCards[wantType] -= wantAmount;
    fromCards[wantType] += wantAmount;

    return true;
}

window.sendSettlersPlayerTradeOffer = function () {
    const st = window.settlersState;
    if (!st) return;

    if (!canPlayerTradeNow()) {
        setMessage("Player trades open during your turn after rolling.");
        return;
    }

    const offer = getSelectedTradeOffer();
    if (!offer) return;

    if (offer.giveType === offer.wantType) {
        setMessage("Choose two different resources for a player trade.");
        return;
    }

    const myCards = getMyResourceCards();
    if ((myCards[offer.giveType] || 0) < offer.giveAmount) {
        setMessage("You do not have enough to offer that trade.");
        return;
    }

    const target = st.players.find(p => p.id === offer.targetId);
    if (!target) return;

    const targetCards = getResourceCards(target.id);

    if (target.isComputer) {
        const canAfford = (targetCards[offer.wantType] || 0) >= offer.wantAmount;
        const fairEnough = offer.giveAmount >= offer.wantAmount || Math.random() < 0.35;

        if (canAfford && fairEnough && settlePlayerTrade(getMyId(), target.id, offer.giveType, offer.giveAmount, offer.wantType, offer.wantAmount)) {
            st.message = `${target.name} accepted your trade.`;
        } else {
            st.message = `${target.name} declined your trade.`;
        }

        closeSettlersOverlay("settlersPlayerTradeOverlay");
        closeSettlersOverlay("settlersDevOverlay");
        renderSettlers();
        syncSettlers();
        return;
    }

    st.pendingTrade = {
        id: `trade-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        fromId: getMyId(),
        toId: target.id,
        giveType: offer.giveType,
        giveAmount: offer.giveAmount,
        wantType: offer.wantType,
        wantAmount: offer.wantAmount
    };

    st.message = `Trade offer sent to ${target.name}.`;
    closeSettlersOverlay("settlersPlayerTradeOverlay");
    closeSettlersOverlay("settlersDevOverlay");
    renderSettlers();
    syncSettlers();
};

window.acceptSettlersPlayerTrade = function () {
    const st = window.settlersState;
    if (!st || !st.pendingTrade || st.pendingTrade.toId !== getMyId()) return;

    const t = st.pendingTrade;
    const ok = settlePlayerTrade(t.fromId, t.toId, t.giveType, t.giveAmount, t.wantType, t.wantAmount);
    st.message = ok ? `${playerName(t.toId)} accepted ${playerName(t.fromId)}'s trade.` : "Trade failed because someone lacked the cards.";
    st.pendingTrade = null;
    renderSettlers();
    syncSettlers();
};

window.declineSettlersPlayerTrade = function () {
    const st = window.settlersState;
    if (!st || !st.pendingTrade || st.pendingTrade.toId !== getMyId()) return;

    const fromName = playerName(st.pendingTrade.fromId);
    st.message = `${playerName(getMyId())} declined ${fromName}'s trade.`;
    st.pendingTrade = null;
    renderSettlers();
    syncSettlers();
};

function pendingTradeOverlayHtml() {
    const st = window.settlersState;
    if (!st || !st.pendingTrade || st.pendingTrade.toId !== getMyId()) return "";

    const t = st.pendingTrade;
    return `
        <div class="set-trade-prompt">
            <div class="set-trade-prompt-title">Trade Offer</div>
            <div>${escapeHtml(playerName(t.fromId))} gives ${t.giveAmount} ${ICONS[t.giveType]}</div>
            <div>For ${t.wantAmount} ${ICONS[t.wantType]} from you</div>
            <div class="set-trade-prompt-buttons">
                <button type="button" onclick="acceptSettlersPlayerTrade()">Accept</button>
                <button type="button" onclick="declineSettlersPlayerTrade()">Decline</button>
            </div>
        </div>
    `;
}


function closeSettlersOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

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

    setTimeout(() => applyPendingSettlersRoll(rollId), ROLL_REVEAL_MS);
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
        setMessage("You already rolled. Build, trade, buy, or end your turn.");
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
    uiState = "IDLE";

    if (Array.isArray(st.players) && st.players.length > 1) st.turnIndex = (st.turnIndex + 1) % st.players.length;

    const current = currentSettlersPlayer();
    st.message = current.id === getMyId() ? "Your turn. Roll the dice." : `${current.name}'s turn.`;

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
        if (!opts.silent) setMessage("Settlement costs brick + wood + wool + wheat.");
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
        uiState = "IDLE";
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
        if (!opts.silent) setMessage("Road costs brick + wood.");
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
        if (!opts.silent) setMessage("City costs 2 wheat + 3 ore.");
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
        if (!opts.silent) setMessage("Development card costs wool + wheat + ore.");
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

    if (!st.rolledThisTurn) {
        setMessage("Roll first, then buy or build.");
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

    if (st.phase === "playing" && !st.rolledThisTurn) {
        setMessage("Roll first, then build.");
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

    if (st.phase === "playing" && !st.rolledThisTurn && !(st.freeRoads && st.freeRoads.playerId === getMyId())) {
        setMessage("Roll first, then build.");
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

    if (!st.rolledThisTurn) {
        setMessage("Roll first, then build.");
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
    const labels = { brick: ICONS.brick + " Brick", wheat: ICONS.wheat + " Wheat", sheep: ICONS.sheep + " Wool", wood: ICONS.wood + " Wood", ore: ICONS.ore + " Ore" };
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
                <button type="button" class="set-overlay-close" onclick="document.getElementById('settlersYearOverlay').remove()">&times;</button>
                <div class="set-overlay-title">&#127806; Year of Plenty</div>
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
                <button type="button" class="set-overlay-close" onclick="document.getElementById('settlersMonopolyOverlay').remove()">&times;</button>
                <div class="set-overlay-title">Monopoly</div>
                <div class="set-overlay-sub">Choose a resource to collect from everyone.</div>
                <div class="set-resource-choice-grid">${resourceChoiceButtons("chooseMonopolyResource", cardId)}</div>
            </div>
        </div>
    `);
}

function tradeButtonsHtml() {
    const cards = getMyResourceCards();
    const ports = getPlayerPorts(getMyId());
    const canTrade = canTradeNow(getMyId());

    const portText = ports.length
        ? ports.map(p => p === "3:1" ? "3:1 any" : `${ICONS[p]} 2:1`).join("  &bull;  ")
        : "No ports yet. Bank trades are 4:1.";

    const buttons = RESOURCE_TYPES.map(type => {
        const rate = bestTradeRate(getMyId(), type);
        const enough = (cards[type] || 0) >= rate;
        return `
            <button type="button" class="set-trade-btn" onclick="openSettlersTrade('${type}')" ${canTrade && enough ? "" : "disabled"}>
                ${rate} ${ICONS[type]} &rarr; 1 any
            </button>
        `;
    }).join("");

    return `
        <div class="set-port-box">
            <div class="set-port-title">Ports / Trade</div>
            <div class="set-port-owned">${portText}</div>
            <div class="set-trade-grid">${buttons}</div>
            <button type="button" class="set-player-trade-open" onclick="openSettlersPlayerTrade()" ${canTrade ? "" : "disabled"}>Offer Player Trade</button>
            <div class="set-port-note">Bank, port, and player trades open after you roll on your turn.</div>
        </div>
    `;
}

function showTradeOverlay(giveType) {
    const canvas = document.getElementById("gameCanvasContainer");
    if (!canvas) return;

    closeSettlersOverlay("settlersTradeOverlay");

    const rate = bestTradeRate(getMyId(), giveType);
    const receiveButtons = RESOURCE_TYPES.filter(type => type !== giveType).map(type => `
        <button type="button" onclick="completeSettlersTrade('${giveType}', '${type}')" style="
            background:#fff;
            color:#1e4620;
            border:2px solid #2d6a30;
            border-radius:12px;
            padding:10px;
            font-size:16px;
            font-weight:900;
        ">${ICONS[type]} ${type}</button>
    `).join("");

    canvas.insertAdjacentHTML("beforeend", `
        <div id="settlersTradeOverlay" class="set-overlay-backdrop">
            <div class="set-overlay-card">
                <button type="button" class="set-overlay-close set-floating-close" onclick="document.getElementById('settlersTradeOverlay').remove()">&times;</button>
                <div class="set-overlay-title">Trade</div>
                <div class="set-overlay-sub">Give ${rate} ${ICONS[giveType]} for 1 resource.</div>
                <div class="set-resource-choice-grid">${receiveButtons}</div>
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
                ${isNew ? `<div class="set-dev-new">New card - playable later</div>` : ""}
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
                <button type="button" class="set-overlay-close set-floating-close" onclick="document.getElementById('settlersDevOverlay').remove()">&times;</button>
                <div class="set-overlay-title">&#127183; My Cards</div>
                <div class="set-overlay-sub">You have ${hand.length} development card${hand.length === 1 ? "" : "s"}.</div>
                <div class="set-dev-grid">${cardsHtml}</div>
                ${tradeButtonsHtml()}
            </div>
        </div>
    `);
};

function canSelectRoadAction(playerId) {
    const st = window.settlersState;
    if (!st) return false;
    const current = currentSettlersPlayer();
    if (!current || current.id !== playerId || current.isComputer) return false;
    if (st.pendingRoll) return false;

    if (st.setup && st.setup.active) return st.setup.needed === "road";
    if (st.freeRoads && st.freeRoads.playerId === playerId && st.freeRoads.remaining > 0) return true;
    if (!st.rolledThisTurn) return false;
    return hasResources(playerId, COSTS.road) && legalRoadEdges(playerId, false, null).length > 0;
}

function canSelectSettlementAction(playerId) {
    const st = window.settlersState;
    if (!st) return false;
    const current = currentSettlersPlayer();
    if (!current || current.id !== playerId || current.isComputer) return false;
    if (st.pendingRoll) return false;

    if (st.setup && st.setup.active) return st.setup.needed === "settlement";
    if (!st.rolledThisTurn) return false;
    return hasResources(playerId, COSTS.settlement) && legalSettlementNodes(playerId, false).length > 0;
}

function canSelectCityAction(playerId) {
    const st = window.settlersState;
    if (!st) return false;
    const current = currentSettlersPlayer();
    if (!current || current.id !== playerId || current.isComputer) return false;
    if (st.setup && st.setup.active) return false;
    if (st.pendingRoll || !st.rolledThisTurn) return false;
    return hasResources(playerId, COSTS.city) && ownedSettlementPieces(playerId).length > 0;
}

function canBuyCardAction(playerId) {
    const st = window.settlersState;
    if (!st) return false;
    const current = currentSettlersPlayer();
    if (!current || current.id !== playerId || current.isComputer) return false;
    if (st.setup && st.setup.active) return false;
    if (st.pendingRoll || !st.rolledThisTurn) return false;
    return st.devDeck.length > 0 && hasResources(playerId, COSTS.card);
}

window.setSettlersUiState = function (newState) {
    const st = window.settlersState;
    const current = currentSettlersPlayer();

    if (current && current.isComputer) {
        uiState = "IDLE";
        setMessage(`${current.name} is thinking...`);
        return;
    }

    if (newState === "BUILD_ROAD" && !canSelectRoadAction(getMyId())) return;
    if (newState === "BUILD_SETTLEMENT" && !canSelectSettlementAction(getMyId())) return;
    if (newState === "BUILD_CITY" && !canSelectCityAction(getMyId())) return;

    uiState = newState || "IDLE";

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

    if (cancelBtn) cancelBtn.style.display = uiState === "IDLE" ? "none" : "flex";

    if (uiState === "BUILD_SETTLEMENT") {
        if (snapNodes) {
            snapNodes.style.opacity = "1";
            snapNodes.style.pointerEvents = "auto";
        }
        setMessage(st && st.setup && st.setup.active ? "Tap a purple spot for your settlement." : "Tap a purple spot to build a settlement.");
        return;
    }

    if (uiState === "BUILD_ROAD") {
        if (snapEdges) {
            snapEdges.style.opacity = "1";
            snapEdges.style.pointerEvents = "auto";
        }
        if (st && st.freeRoads && st.freeRoads.playerId === getMyId()) {
            setMessage(`Tap a purple road marker. Free roads left: ${st.freeRoads.remaining}.`);
        } else {
            setMessage(st && st.setup && st.setup.active ? "Tap a purple road marker touching that settlement." : "Tap a purple road marker to build a road.");
        }
        return;
    }

    if (uiState === "BUILD_CITY") {
        if (snapCities) {
            snapCities.style.opacity = "1";
            snapCities.style.pointerEvents = "auto";
        }
        setMessage("Tap one of your settlements to upgrade to a city.");
        return;
    }

    if (st) setMessage(st.message || "Choose an action below.");
};

window.showSettlersHelp = function () {
    const canvas = document.getElementById("gameCanvasContainer");
    if (!canvas) return;

    closeSettlersOverlay("settlersHelpOverlay");

    canvas.insertAdjacentHTML("beforeend", `
        <div id="settlersHelpOverlay" class="set-overlay-backdrop set-help-backdrop">
            <div class="set-overlay-card set-help-cost-card">
                <button type="button" class="set-overlay-close set-help-fixed-close" onclick="document.getElementById('settlersHelpOverlay').remove()">&times;</button>
                <div class="set-overlay-title">Build Costs</div>
                <div class="set-help-list">
                    <div>&#128739; Road = &#129521; + &#127794;</div>
                    <div>&#127968; Settlement = &#129521; + &#127794; + &#128017; + &#127806;</div>
                    <div>&#127984; City = &#127806;&#127806; + &#9968;&#9968;&#9968;</div>
                    <div>&#127183; Dev Card = &#128017; + &#127806; + &#9968;</div>
                    <div>Ports = build on a port corner to trade better.</div>
                    <div>3:1 port = any 3 same resources for 1 resource.</div>
                    <div>2:1 port = two matching resources for 1 resource.</div>
                </div>
                <div class="set-help-note">Setup goes forward, then backward. Starting resources come only from your second settlement.</div>
            </div>
        </div>
    `);
};

function portLabel(type) {
    if (type === "3:1") return "3:1";
    return `${ICONS[type]} 2:1`;
}

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
                <circle cx="0" cy="0" r="19" fill="#fff" stroke="#333" stroke-width="1.5"/>
                <text x="0" y="7" font-family="Arial" font-weight="900" font-size="21" text-anchor="middle" fill="${isRed ? "#dc3545" : "#111"}">${hex.token}</text>
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

    let portsHtml = "";
    (st.board.ports || []).forEach(port => {
        const label = portLabel(port.type);
        const labelWidth = port.type === "3:1" ? 52 : 68;
        const labelHeight = 31;
        const viewMinX = -90;
        const viewMinY = -90;
        const viewMaxX = 420;
        const viewMaxY = 380;
        const safeMargin = 8;
        const center = { x: port.mx, y: port.my };
        const rawLabelPoint = { x: port.lx, y: port.ly };
        const clampedLx = Math.max(viewMinX + labelWidth / 2 + safeMargin, Math.min(viewMaxX - labelWidth / 2 - safeMargin, rawLabelPoint.x));
        const clampedLy = Math.max(viewMinY + labelHeight / 2 + safeMargin, Math.min(viewMaxY - labelHeight / 2 - safeMargin, rawLabelPoint.y));
        const labelX = clampedLx - labelWidth / 2;
        const labelY = clampedLy - labelHeight / 2;
        const dx = (rawLabelPoint.x - center.x) || (clampedLx - center.x);
        const dy = (rawLabelPoint.y - center.y) || (clampedLy - center.y);
        const mag = Math.hypot(dx, dy) || 1;
        const ox = dx / mag * 10;
        const oy = dy / mag * 10;
        const p1x = port.x1 + ox;
        const p1y = port.y1 + oy;
        const p2x = port.x2 + ox;
        const p2y = port.y2 + oy;

        portsHtml += `
            <g pointer-events="none">
                <line x1="${clampedLx}" y1="${clampedLy}" x2="${p1x}" y2="${p1y}" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" opacity="0.98"/>
                <line x1="${clampedLx}" y1="${clampedLy}" x2="${p2x}" y2="${p2y}" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" opacity="0.98"/>
                <circle cx="${p1x}" cy="${p1y}" r="8.5" fill="#eaf4df" stroke="#1e4620" stroke-width="2.2"/>
                <circle cx="${p2x}" cy="${p2y}" r="8.5" fill="#eaf4df" stroke="#1e4620" stroke-width="2.2"/>
                <rect x="${labelX}" y="${labelY}" width="${labelWidth}" height="${labelHeight}" rx="10" fill="#eaf4df" stroke="#1e4620" stroke-width="2.2"/>
                <text x="${clampedLx}" y="${clampedLy + 6}" text-anchor="middle" font-family="Arial" font-size="15" font-weight="900" fill="#1e4620">${label}</text>
            </g>
        `;
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
            <svg viewBox="-90 -90 510 470" preserveAspectRatio="xMidYMid meet">
                <g id="hex-grid">${hexHtml}</g>
                <g id="placed-pieces">${piecesHtml}</g>
                <g id="ports-layer">${portsHtml}</g>
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
            if (hex.token === 6 || hex.token === 8) score += 5;
            if (hex.token === 5 || hex.token === 9) score += 4;
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

    if (hasResources(player.id, COSTS.card) && Math.random() < 0.45) {
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
            setTimeout(() => rollForCurrentPlayer(), COMPUTER_ROLL_DELAY_MS);
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

function getResourceBurstHtml(amount) {
    if (!amount) return "";
    return `<span class="set-resource-burst">+${amount}</span>`;
}

function buttonClass(enabled, selected, extra) {
    const parts = ["set-act-btn"];
    if (extra) parts.push(extra);
    parts.push(enabled ? "enabled" : "disabled-look");
    if (selected) parts.push("selected");
    return parts.join(" ");
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

    const roadEnabled = canSelectRoadAction(getMyId());
    const settleEnabled = canSelectSettlementAction(getMyId());
    const cityEnabled = canSelectCityAction(getMyId());
    const buyEnabled = canBuyCardAction(getMyId());
    const canRoll = myTurn && !st.rolledThisTurn && !setupActive && !pendingRoll && !computerTurn;
    const canEnd = myTurn && st.rolledThisTurn && !setupActive && !pendingRoll && !computerTurn;
    const rollButtonActive = canRoll || canEnd;
    const rollButtonLabel = canEnd ? "End" : "Roll";
    const rollButtonIcon = canEnd ? "&rarr;" : "&#127922;";
    const rollButtonAction = canEnd ? "endSettlersTurn()" : "rollSettlersDice()";

    let burst = null;
    if (st.resourceBurst && st.resourceBurst.id !== lastResourceBurstId) {
        lastResourceBurstId = st.resourceBurst.id;
        burst = cloneResourceSet(st.resourceBurst.gains && st.resourceBurst.gains[getMyId()]);
    }

    el.innerHTML = `
        <style>
            .set-wrap { display:flex; flex-direction:column; height:100%; width:100%; background:${COLORS.ocean}; color:#111; font-family:Arial,sans-serif; overflow:hidden; position:relative; }
            .set-header { background:#1e4620; color:#ffd700; padding:10px; text-align:center; font-weight:900; font-size:15px; box-shadow:0 4px 10px rgba(0,0,0,0.3); z-index:10; flex-shrink:0; }
            .set-zoom-shell { flex:1; overflow:hidden; touch-action:none; background:${COLORS.ocean}; position:relative; }
            #settlersPanZoom { width:100%; height:100%; transform-origin:top left; will-change:transform; }
            .set-play-area { width:100%; height:100%; display:flex; flex-direction:column; background:#d7e0cf; }
            .set-map-viewport { flex:1; min-height:300px; display:flex; align-items:center; justify-content:center; padding:6px; background:${COLORS.ocean}; border-bottom:3px solid #1e4620; box-sizing:border-box; position:relative; }
            .set-board-zoomer { width:100%; max-width:570px; margin:0 auto; }
            .set-board-zoomer svg { width:100%; height:auto; display:block; }
            .set-roll-overlay { position:absolute; left:50%; top:50%; transform:translate(-50%, -50%); z-index:40; background:rgba(255,255,255,0.94); border:4px solid ${HIGHLIGHT_PURPLE}; border-radius:18px; padding:14px 18px; box-shadow:0 6px 18px rgba(0,0,0,0.38); display:flex; flex-direction:column; align-items:center; gap:8px; color:#1e4620; font-weight:900; pointer-events:none; }
            .set-roll-big-dice { display:flex; gap:10px; }
            .set-roll-die { width:54px; height:54px; background:#fff; border:3px solid #111; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:34px; font-weight:900; color:#111; box-shadow:inset 0 0 0 2px rgba(0,0,0,0.08); }
            .set-roll-total { font-size:17px; color:${HIGHLIGHT_PURPLE}; }
            .set-hand-ui { background:#d7e0cf; border-top:3px solid #1e4620; padding:8px 8px 42px 8px; flex-shrink:0; display:flex; flex-direction:column; gap:8px; box-sizing:border-box; }
            .set-resources { display:flex; justify-content:space-between; align-items:center; gap:3px; font-size:16px; font-weight:900; color:#1e4620; background:#f5f5f5; padding:8px 6px; border-radius:14px; border:3px solid #2d6a30; }
            .set-res-item { position:relative; min-width:34px; text-align:center; white-space:nowrap; }
            .set-dev-res-btn { border:2px solid #1d4ed8; border-radius:10px; background:#102b63; color:#fff; padding:4px 6px; font-size:15px; font-weight:900; box-shadow:0 2px 6px rgba(0,0,0,.24); }
            .set-resource-burst { position:absolute; left:50%; top:-10px; transform:translateX(-50%); color:#ffd700; background:#1e4620; border:2px solid #fff; border-radius:999px; padding:1px 7px; font-size:16px; font-weight:900; animation:setFloatUp 1.25s ease-out forwards; pointer-events:none; box-shadow:0 3px 8px rgba(0,0,0,.35); }
            @keyframes setFloatUp { 0% { opacity:0; transform:translate(-50%, 10px) scale(.75); } 18% { opacity:1; transform:translate(-50%, -10px) scale(1.2); } 100% { opacity:0; transform:translate(-50%, -48px) scale(1); } }
            .set-actions { display:grid; grid-template-columns:repeat(6, minmax(0, 1fr)); gap:7px; }
            .set-act-btn { min-height:74px; padding:6px 3px; border-radius:14px; border:2px solid #2d6a30; background:#2d6a30; color:#fff; font-weight:900; cursor:pointer; box-shadow:0 3px 8px rgba(0,0,0,0.22); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; text-align:center; line-height:1.05; box-sizing:border-box; }
            .set-act-btn:active { transform:scale(0.96); }
            .set-act-btn .ico { font-size:25px; line-height:1; }
            .set-act-btn .lbl { font-size:11px; line-height:1.05; }
            .set-act-btn.enabled { opacity:1; filter:none; }
            .set-act-btn.disabled-look, .set-act-btn:disabled { opacity:.38; filter:grayscale(.35); cursor:default; box-shadow:none; }
            .set-act-btn.selected { box-shadow:0 0 0 3px ${HIGHLIGHT_PURPLE}, 0 3px 9px rgba(0,0,0,.32); }
            .set-act-btn.card-btn { background:#ffd700; color:#1e4620; border-color:#d3b200; }
            .set-act-btn.cancel-btn { background:#dc3545; border-color:#bd2130; display:none; }
            .set-roll-btn { background:#6b3fa0; border-color:#ffffff; }
            .set-roll-btn.active { background:#ff8c00; color:#111; border-color:#ffd700; box-shadow:0 0 0 3px #ffd700, 0 4px 10px rgba(0,0,0,0.35); opacity:1; filter:none; }
            .set-help-btn { background:#1d4ed8; border-color:#ffffff; }
            .set-overlay-backdrop { position:absolute; inset:0; z-index:99999; background:rgba(0,0,0,.76); display:flex; align-items:center; justify-content:center; padding:12px; box-sizing:border-box; }
            .set-overlay-card { width:96%; max-width:370px; max-height:92%; overflow:auto; background:#eaf4df; border:4px solid #ffd700; border-radius:18px; padding:12px; box-sizing:border-box; color:#1e4620; font-weight:900; box-shadow:0 6px 18px rgba(0,0,0,.45); position:relative; }
            .set-overlay-close { position:absolute; top:8px; right:8px; width:38px; height:38px; border-radius:999px; border:2px solid #fff; background:#dc3545; color:#fff; font-size:24px; font-weight:900; line-height:1; z-index:100005; }
            .set-help-cost-card { padding-bottom:72px; }
            .set-help-fixed-close { position:fixed !important; top:auto !important; right:34px !important; bottom:84px !important; width:54px !important; height:54px !important; font-size:32px !important; box-shadow:0 4px 12px rgba(0,0,0,.42); }
            .set-floating-close { position:fixed !important; top:auto !important; right:34px !important; bottom:84px !important; width:54px !important; height:54px !important; font-size:32px !important; box-shadow:0 4px 12px rgba(0,0,0,.42); }
            .set-dev-overlay-card, .set-trade-overlay-card { padding-bottom:76px !important; }
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
            .set-port-box { margin-top:12px; background:#fff; border:2px solid #2d6a30; border-radius:14px; padding:10px; }
            .set-port-title { font-family:Impact,sans-serif; font-size:22px; text-align:center; color:#1e4620; }
            .set-port-owned { text-align:center; color:#2d6a30; font-size:13px; margin:5px 0 8px; }
            .set-trade-grid { display:grid; grid-template-columns:1fr; gap:6px; }
            .set-trade-btn { border:2px solid #1e4620; border-radius:10px; background:#eaf4df; color:#1e4620; padding:8px; font-weight:900; }
            .set-trade-btn:disabled { opacity:.38; }
            .set-port-note { font-size:12px; color:#555; margin-top:6px; text-align:center; }
            .set-player-trade-open { width:100%; margin-top:8px; border:none; border-radius:12px; padding:10px; background:#1d4ed8; color:#fff; font-size:15px; font-weight:900; }
            .set-player-trade-open:disabled { opacity:.38; }
            .set-player-trade-grid { display:grid; grid-template-columns:1fr; gap:8px; }
            .set-player-trade-grid label { display:flex; flex-direction:column; gap:4px; color:#1e4620; font-size:14px; font-weight:900; }
            .set-player-trade-grid select { border:2px solid #2d6a30; border-radius:10px; padding:8px; font-size:15px; font-weight:900; background:#fff; color:#1e4620; }
            .set-player-trade-send { width:100%; margin-top:10px; border:none; border-radius:12px; padding:11px; background:#ffd700; color:#1e4620; font-size:17px; font-weight:900; }
            .set-trade-prompt { position:absolute; left:50%; top:50%; transform:translate(-50%, -50%); z-index:99998; width:86%; max-width:330px; background:#eaf4df; border:4px solid #ffd700; border-radius:18px; padding:14px; box-sizing:border-box; color:#1e4620; font-weight:900; text-align:center; box-shadow:0 6px 18px rgba(0,0,0,.42); }
            .set-trade-prompt-title { font-family:Impact,sans-serif; font-size:27px; margin-bottom:6px; }
            .set-trade-prompt-buttons { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px; }
            .set-trade-prompt-buttons button { border:none; border-radius:12px; padding:10px; color:#fff; font-size:16px; font-weight:900; }
            .set-trade-prompt-buttons button:first-child { background:#00b050; }
            .set-trade-prompt-buttons button:last-child { background:#dc3545; }
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
                                <span class="set-res-item">&#129521; ${brick}${getResourceBurstHtml(burst && burst.brick)}</span>
                                <span class="set-res-item">&#127806; ${wheat}${getResourceBurstHtml(burst && burst.wheat)}</span>
                                <span class="set-res-item">&#128017; ${sheep}${getResourceBurstHtml(burst && burst.sheep)}</span>
                                <span class="set-res-item">&#127794; ${wood}${getResourceBurstHtml(burst && burst.wood)}</span>
                                <span class="set-res-item">&#9968; ${ore}${getResourceBurstHtml(burst && burst.ore)}</span>
                                <button type="button" class="set-res-item set-dev-res-btn" onclick="showSettlersDevCards()">&#127183; ${myDevCount}</button>
                            </div>

                            <div class="set-actions">
                                <button type="button" class="${buttonClass(roadEnabled, uiState === "BUILD_ROAD", "")}" onclick="setSettlersUiState('BUILD_ROAD')" ${roadEnabled ? "" : "disabled"}>
                                    <span class="ico">&#128739;</span><span class="lbl">Road</span>
                                </button>
                                <button type="button" class="${buttonClass(settleEnabled, uiState === "BUILD_SETTLEMENT", "")}" onclick="setSettlersUiState('BUILD_SETTLEMENT')" ${settleEnabled ? "" : "disabled"}>
                                    <span class="ico">&#127968;</span><span class="lbl">Settle</span>
                                </button>
                                <button type="button" class="${buttonClass(cityEnabled, uiState === "BUILD_CITY", "")}" onclick="setSettlersUiState('BUILD_CITY')" ${cityEnabled ? "" : "disabled"}>
                                    <span class="ico">&#127984;</span><span class="lbl">City</span>
                                </button>
                                <button type="button" class="${buttonClass(buyEnabled, false, "card-btn")}" onclick="buySettlersDevelopmentCard()" ${buyEnabled ? "" : "disabled"}>
                                    <span class="ico">&#127183;</span><span class="lbl">Buy Card</span>
                                </button>
                                <button type="button" class="${buttonClass(rollButtonActive, false, "set-roll-btn " + (rollButtonActive ? "active" : ""))}" onclick="${rollButtonAction}" ${rollButtonActive ? "" : "disabled"}>
                                    <span class="ico">${rollButtonIcon}</span><span class="lbl">${rollButtonLabel}</span>
                                </button>
                                <button type="button" class="set-act-btn enabled set-help-btn" onclick="showSettlersHelp()">
                                    <span class="ico">?</span><span class="lbl">Help</span>
                                </button>
                                <button type="button" class="set-act-btn cancel-btn" id="set-cancel" onclick="setSettlersUiState('IDLE')">
                                    <span class="ico">X</span><span class="lbl">Cancel</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            ${pendingTradeOverlayHtml()}
        </div>
    `;

    if (computerTurn) {
        uiState = "IDLE";
        setMessage(st.message || `${currentPlayer.name} is thinking...`);
    } else if (uiState !== "IDLE") {
        const keep = uiState;
        uiState = "IDLE";
        window.setSettlersUiState(keep);
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

    if (roomDisplay) roomDisplay.innerText = "Settlers";
    if (headerBtns) headerBtns.style.display = "none";
    if (chatHeader) chatHeader.classList.add("game-active-mode");

    const amHost = window.chaserGame && window.chaserGame.hostId === getMyId();
    if (amHost || !window.settlersState) {
        zoomState = { scale: 1, x: 0, y: 0 };
        uiState = "IDLE";
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
