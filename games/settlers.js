/* CHASER SETTLERS - SEPARATE GAME FILE - ASCII ICON SAFE
Mobile-optimized Hex Resource Game
3-4 player setup with named computer players, dice, resource cards, development cards, ports, trading, robber, and action availability
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

// Board generation tuning - higher attempt count + harsher penalties means
// number/color tiles are kept apart far more reliably than a single quick pass.
const BOARD_GEN_ATTEMPTS = 1500;

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
    ore: "&#129704;",
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

// Hard floor on bot pacing: no matter which code path triggers the next bot
// action, it can never fire sooner than COMPUTER_DELAY_MS after the bot's
// previous action actually executed. This is a backstop independent of the
// dedup-key scheduling below, so a bot can never appear to move instantly.
let lastComputerActionAt = 0;

// --- Game log ---------------------------------------------------------------
// logExpanded/lastSeenLogId are local-only UI state (not synced) so each
// device can expand/collapse its own log independently. LOG_POP_DURATION_MS
// is how long a freshly logged action (a roll, a build, a trade...) stays
// shown in the header before the header reverts to the live "whose turn /
// what to do" status line. createdAt on each entry is synced state, so every
// device computes "is this entry still fresh" the same way from the same
// timestamp rather than from local render timing.
const MAX_LOG_ENTRIES = 200;
const LOG_POP_DURATION_MS = 10000;
let logExpanded = false;
let lastSeenLogId = "";

// MIN_LOG_HOLD_MS guarantees every popped log entry gets shown for at least
// this long before a newer entry is allowed to replace it in the header,
// even if that newer entry was logged only moments later (e.g. the "X rolls
// N" line immediately followed by the "who got what" line). Without this,
// whichever entry is logged first in a fast back-to-back pair would only be
// visible for the tiny gap between the two log calls instead of its own
// full pop window. This is local/per-device on purpose: each device just
// needs to honor a minimum hold time for whatever it's currently showing,
// it doesn't need to agree with other devices on exact timing.
const MIN_LOG_HOLD_MS = 2200;
let headerHoldEntryId = "";
let headerHoldStartedAt = 0;

// Local-only transient "you can't do that yet" nudges (e.g. "roll first").
// These are NOT written to the shared gameLog since they're per-device
// validation feedback, not a game event everyone should see in history.
// They take priority over the live status line for a few seconds, then
// fall away on their own.
const TRANSIENT_MESSAGE_DURATION_MS = 3200;
let transientMessageText = "";
let transientMessageExpiresAt = 0;
let transientMessageTimer = null;

// --- Dice support ---------------------------------------------------------
// Math.random() is fine statistically, but its low bits can be weaker and
// some environments seed it in ways that feel "streaky" over a long game.
// rollDie() pulls from crypto.getRandomValues when available (better entropy)
// and falls back to Math.random() otherwise. recentRollTotals tracks the last
// few totals purely so we can gently break up an improbable run of the same
// total in a row (a real die doesn't avoid repeats, but folks notice streaks
// in a way that feels "off" in a digital game, so we nudge against them).
const recentRollTotals = [];
const MAX_SAME_TOTAL_STREAK = 2; // after this many repeats in a row, reroll once

function rollDie() {
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
        const buf = new Uint32Array(1);
        window.crypto.getRandomValues(buf);
        return (buf[0] % 6) + 1;
    }
    return Math.floor(Math.random() * 6) + 1;
}

function rollTwoDice() {
    let d1 = rollDie();
    let d2 = rollDie();
    let total = d1 + d2;

    // Break up long identical-total streaks (e.g. three 7s in a row) by
    // rerolling once. This does not change the long-run probabilities in any
    // meaningful way over a full game, it just smooths out short-term streaks
    // that read as "the dice are broken" even though they are mathematically fine.
    let streak = 0;
    for (let i = recentRollTotals.length - 1; i >= 0; i--) {
        if (recentRollTotals[i] === total) streak++;
        else break;
    }

    if (streak >= MAX_SAME_TOTAL_STREAK) {
        d1 = rollDie();
        d2 = rollDie();
        total = d1 + d2;
    }

    recentRollTotals.push(total);
    if (recentRollTotals.length > 8) recentRollTotals.shift();

    return { d1, d2, total };
}

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

// Single, unified scoring function for board candidates. This replaces the
// two separate (and inconsistent) scorers that used to exist - one in the
// main file, one in the bottom patch. The patch's harsher penalties are used
// here since they did a noticeably better job keeping same-color tiles and
// 6/8 tokens apart.
function scoreBoardCandidate(hexes) {
    let score = 0;

    for (let i = 0; i < hexes.length; i++) {
        for (let j = i + 1; j < hexes.length; j++) {
            if (!hexesAreAdjacent(hexes[i], hexes[j])) continue;

            const a = hexes[i];
            const b = hexes[j];

            if (a.resource && b.resource && a.resource === b.resource && a.resource !== "desert") {
                score -= 150;
            }

            if (a.token && b.token && a.token === b.token) {
                score -= 220;
            }

            if ((a.token === 6 || a.token === 8) && (b.token === 6 || b.token === 8)) {
                score -= 300;
            }

            if (a.token && b.token && Math.abs(a.token - b.token) === 1) {
                score -= 25;
            }
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
        const outX = Math.cos(edge.angle) * 92;
        const outY = Math.sin(edge.angle) * 92;
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

// Generates a fresh randomized set of hexes (resources + tokens) using the
// unified scorer above, trying many candidates and keeping the best one.
// Used both for first board creation and for the Shuffle button.
function generateScoredHexes(basePositions) {
    let best = null;
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < BOARD_GEN_ATTEMPTS; attempt++) {
        const positions = basePositions.map(h => ({ ...h }));
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
            best = positions;
        }
    }

    return best || basePositions.map(h => ({ ...h }));
}

function generateBoard() {
    const basePositions = makeBoardPositions();
    const finalHexes = generateScoredHexes(basePositions);

    return {
        hexes: finalHexes,
        ports: pickPortEdges(finalHexes, PORTS)
    };
}

function findDesertHex(hexes) {
    return (hexes || []).find(h => h.resource === "desert") || null;
}

function createState() {
    const players = getLobbyPlayers();
    const resources = {};
    const devHands = {};

    players.forEach(p => {
        resources[p.id] = emptyResourceSet();
        devHands[p.id] = [];
    });

    const board = generateBoard();
    const desertHex = findDesertHex(board.hexes);

    const setupOrder = buildSetupOrder(players.length);
    const firstPlayer = players[setupOrder[0] || 0] || players[0];

    return {
        // Game starts in "prestart" so the host can shuffle the board as many
        // times as they like before locking it in with Start Game.
        phase: "prestart",
        board,
        robber: desertHex ? { row: desertHex.row, col: desertHex.col } : null,
        players,
        turnIndex: setupOrder[0] || 0,
        turnNumber: 1,
        rolledThisTurn: false,
        lastRoll: null,
        highlightedRoll: null,
        pendingRoll: null,
        pendingRobberMove: null,
        resourceBurst: null,
        pendingTrade: null,
        message: isHostPlayer()
            ? "Shuffle the board until you like it, then hit Start Game."
            : "Waiting for the host to start the game.",
        gameLog: [],
        resources,
        devDeck: buildDevelopmentDeck(),
        devHands,
        devDiscard: [],
        playedKnights: {},
        freeRoads: null,
        setup: {
            active: false,
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

function ensureRobberState() {
    const st = window.settlersState;
    if (!st) return;

    if (!st.robber || typeof st.robber.row !== "number" || typeof st.robber.col !== "number") {
        const desertHex = findDesertHex(st.board && st.board.hexes);
        st.robber = desertHex ? { row: desertHex.row, col: desertHex.col } : null;
    }

    if (typeof st.pendingRobberMove === "undefined") st.pendingRobberMove = null;
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
    if (!st.phase) st.phase = "prestart";
    if (!Array.isArray(st.gameLog)) st.gameLog = [];

    ensureResourceBank();
    ensureDevelopmentState();
    ensureRobberState();

    if (st.phase === "setup" && !st.setup) {
        st.setup = {
            active: true,
            order: buildSetupOrder(st.players.length),
            stepIndex: 0,
            needed: "settlement",
            pendingSettlement: null
        };
    }

    if (!st.setup) {
        st.setup = {
            active: false,
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

function isRobberOnHex(hex) {
    const st = window.settlersState;
    if (!st || !st.robber || !hex) return false;
    return st.robber.row === hex.row && st.robber.col === hex.col;
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
        if (isRobberOnHex(hex)) return; // robber blocks this tile's payout entirely

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
    logSettlersEvent("Setup complete. The game has begun.");
    logSettlersEvent(`${first.name}'s turn.`, first.id);
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

    const next = currentSettlersPlayer();
    logSettlersEvent(`${next.name}'s turn to setup.`, next.id);
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

function getSettlersHeaderText() {
    const st = window.settlersState;
    if (!st) return "";

    const current = currentSettlersPlayer();
    const name = current && current.name ? current.name : "Player";

    if (st.phase === "prestart") {
        return isHostPlayer() ? "Shuffle the board, then hit Start Game." : "Waiting for the host to start the game.";
    }

    if (st.pendingRobberMove) {
        return `${playerName(st.pendingRobberMove.playerId)} rolled a 7 - move the robber.`;
    }

    if (st.setup && st.setup.active) {
        return `${name}'s turn to setup.`;
    }

    if (st.phase === "playing") {
        if (st.rolledThisTurn && st.lastRoll && typeof st.lastRoll.total === "number") {
            return `${name}'s turn - rolled ${st.lastRoll.total}.`;
        }
        return `${name}'s turn.`;
    }

    return st.message || `${name}'s turn.`;
}

// Companion to getSettlersHeaderText: returns the playerId that should get a
// colored dot next to the live status line, or null when no single player
// is the obvious subject (e.g. mid-robber-move messaging already names them
// in text, prestart has no current player yet).
function getSettlersHeaderDotPlayerId() {
    const st = window.settlersState;
    if (!st) return null;
    if (st.phase === "prestart") return null;

    if (st.pendingRobberMove) return st.pendingRobberMove.playerId;

    const current = currentSettlersPlayer();
    return current ? current.id : null;
}

function setMessage(text) {
    const st = window.settlersState;
    if (st) st.message = text;

    if (text) {
        transientMessageText = text;
        transientMessageExpiresAt = Date.now() + TRANSIENT_MESSAGE_DURATION_MS;

        if (transientMessageTimer) clearTimeout(transientMessageTimer);
        transientMessageTimer = setTimeout(() => {
            transientMessageTimer = null;
            renderSettlers();
        }, TRANSIENT_MESSAGE_DURATION_MS + 50);
    }

    const msg = document.getElementById("set-msg");
    if (!msg || !msg.parentNode) return;

    // Rebuild just the header element from the single shared header-builder
    // function, so setMessage can never drift out of sync with the
    // freshness/dot logic used everywhere else the header is rendered.
    msg.outerHTML = buildSettlersLogHeaderHtml();
}

window.setSettlersMessage = function (text) {
    setMessage(text);
};

// Appends a permanent entry to the shared game log. This is what the
// header's down-arrow history is built from, and is distinct from
// st.message, which is the transient "what to do right now" prompt.
// Every meaningful action (rolls, builds, trades, robber moves, dev cards)
// should call this so the full game history is reconstructable.
// dotPlayerId is optional: when set (used for "X's turn" lines), the log
// renderer prefixes the entry with a small dot in that player's color.
function logSettlersEvent(text, dotPlayerId) {
    const st = window.settlersState;
    if (!st || !text) return;

    if (!Array.isArray(st.gameLog)) st.gameLog = [];

    st.gameLog.push({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        text,
        turnNumber: st.turnNumber || 1,
        dotPlayerId: dotPlayerId || null,
        createdAt: Date.now()
    });

    if (st.gameLog.length > MAX_LOG_ENTRIES) {
        st.gameLog.splice(0, st.gameLog.length - MAX_LOG_ENTRIES);
    }
}

// Flashes the header briefly when a new entry lands, and schedules two
// re-renders: one shortly after MIN_LOG_HOLD_MS (so a newer entry that got
// held back can take over the header promptly once its minimum wait is up),
// and one after the full LOG_POP_DURATION_MS (so the header reverts to the
// live "whose turn" status even if nothing else changes state in the
// meantime, e.g. everyone is just staring at the board for 10+ seconds).
let logRevertTimer = null;
let logHoldAdvanceTimer = null;

function popSettlersLogHeader() {
    const header = document.getElementById("set-msg");
    if (header) {
        header.classList.remove("set-log-flash");
        void header.offsetWidth; // restart the flash animation
        header.classList.add("set-log-flash");
    }

    if (logHoldAdvanceTimer) clearTimeout(logHoldAdvanceTimer);
    logHoldAdvanceTimer = setTimeout(() => {
        logHoldAdvanceTimer = null;
        renderSettlers();
    }, MIN_LOG_HOLD_MS + 50);

    if (logRevertTimer) clearTimeout(logRevertTimer);
    logRevertTimer = setTimeout(() => {
        logRevertTimer = null;
        renderSettlers();
    }, LOG_POP_DURATION_MS + 50);
}

window.toggleSettlersLog = function () {
    logExpanded = !logExpanded;
    renderSettlers();
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
    return !!(st && st.phase === "playing" && isMySettlersTurn() && playerId === getMyId() && st.rolledThisTurn && !st.pendingRoll && !st.pendingRobberMove);
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
    logSettlersEvent(`${playerName(getMyId())} traded ${rate} ${RESOURCE_NAMES[giveType]} for 1 ${RESOURCE_NAMES[receiveType]} with the bank.`);

    closeSettlersOverlay("settlersTradeOverlay");
    closeSettlersOverlay("settlersDevOverlay");
    renderSettlers();
    syncSettlers();
};

function canPlayerTradeNow() {
    const st = window.settlersState;
    return !!(st && st.phase === "playing" && isMySettlersTurn() && st.rolledThisTurn && !st.pendingRoll && !st.pendingRobberMove);
}

function resourceOptionsHtml(selected) {
    return RESOURCE_TYPES.map(type => `<option value="${type}" ${selected === type ? "selected" : ""}>${RESOURCE_NAMES[type]}</option>`).join("");
}

// Only lists resources the player actually holds at least 1 of, with the
// held count shown alongside the name, so the "You give" dropdown can never
// be used to offer something the player doesn't have.
function myGiveableResourceOptionsHtml(selected) {
    const cards = getMyResourceCards();
    const holdings = RESOURCE_TYPES.filter(type => (cards[type] || 0) > 0);

    if (!holdings.length) {
        return `<option value="" disabled selected>No resources to give</option>`;
    }

    const chosen = holdings.includes(selected) ? selected : holdings[0];
    return holdings.map(type => `<option value="${type}" ${chosen === type ? "selected" : ""}>${RESOURCE_NAMES[type]} (have ${cards[type]})</option>`).join("");
}

function amountOptionsHtml(selected) {
    let html = "";
    for (let i = 1; i <= 4; i++) html += `<option value="${i}" ${selected === i ? "selected" : ""}>${i}</option>`;
    return html;
}

// Caps the "Give amount" dropdown at however many of the selected resource
// the player actually holds, instead of always offering up to 4.
function giveAmountOptionsHtml(giveType, selected) {
    const cards = getMyResourceCards();
    const max = Math.max(1, cards[giveType] || 0);
    let html = "";
    for (let i = 1; i <= max; i++) html += `<option value="${i}" ${selected === i ? "selected" : ""}>${i}</option>`;
    return html;
}

window.refreshSettlersGiveAmountOptions = function () {
    const giveTypeEl = document.getElementById("setTradeGiveType");
    const giveAmountEl = document.getElementById("setTradeGiveAmount");
    if (!giveTypeEl || !giveAmountEl) return;

    giveAmountEl.innerHTML = giveAmountOptionsHtml(giveTypeEl.value, 1);
};

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

    const myCards = getMyResourceCards();
    const canGiveAnything = RESOURCE_TYPES.some(type => (myCards[type] || 0) > 0);
    const defaultGiveType = RESOURCE_TYPES.find(type => (myCards[type] || 0) > 0) || "brick";

    canvas.insertAdjacentHTML("beforeend", `
        <div id="settlersPlayerTradeOverlay" class="set-overlay-backdrop">
            <div class="set-overlay-card set-trade-overlay-card">
                <button type="button" class="set-overlay-close set-floating-close" onclick="document.getElementById('settlersPlayerTradeOverlay').remove()">&times;</button>
                <div class="set-overlay-title">Player Trade</div>
                <div class="set-overlay-sub">Offer one resource trade to a player. Named computer players answer right away.</div>

                <div class="set-player-trade-grid">
                    <label>Trade with<select id="setTradeTarget">${otherPlayerOptionsHtml()}</select></label>
                    <label>You give<select id="setTradeGiveType" onchange="refreshSettlersGiveAmountOptions()" ${canGiveAnything ? "" : "disabled"}>${myGiveableResourceOptionsHtml(defaultGiveType)}</select></label>
                    <label>Give amount<select id="setTradeGiveAmount" ${canGiveAnything ? "" : "disabled"}>${giveAmountOptionsHtml(defaultGiveType, 1)}</select></label>
                    <label>You want<select id="setTradeWantType">${resourceOptionsHtml("wood")}</select></label>
                    <label>Want amount<select id="setTradeWantAmount">${amountOptionsHtml(1)}</select></label>
                </div>

                ${canGiveAnything ? "" : `<div class="set-port-note">You have no resources to offer right now.</div>`}
                <button type="button" class="set-player-trade-send" onclick="sendSettlersPlayerTradeOffer()" ${canGiveAnything ? "" : "disabled"}>Send Offer</button>
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
    const st = window.settlersState;
    const fromCards = getResourceCards(fromId);
    const toCards = getResourceCards(toId);

    if ((fromCards[giveType] || 0) < giveAmount) return false;
    if ((toCards[wantType] || 0) < wantAmount) return false;

    fromCards[giveType] -= giveAmount;
    toCards[giveType] += giveAmount;
    toCards[wantType] -= wantAmount;
    fromCards[wantType] += wantAmount;

    // Trigger the same floating "+N" burst animation used for rolls/bank
    // trades/dev cards, but for both sides of a player trade: the receiver
    // of each resource type sees a burst over their own resource counter.
    if (st) {
        const gains = {};
        gains[toId] = emptyResourceSet();
        gains[toId][giveType] += giveAmount;
        gains[fromId] = emptyResourceSet();
        gains[fromId][wantType] += wantAmount;
        st.resourceBurst = { id: `burst-${Date.now()}-${Math.floor(Math.random() * 9999)}`, gains };
    }

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

    if (!offer.giveType) {
        setMessage("You have no resources to offer right now.");
        return;
    }

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
            logSettlersEvent(`${playerName(getMyId())} traded ${offer.giveAmount} ${RESOURCE_NAMES[offer.giveType]} to ${target.name} for ${offer.wantAmount} ${RESOURCE_NAMES[offer.wantType]}.`);
        } else {
            st.message = `${target.name} declined your trade.`;
            logSettlersEvent(`${target.name} declined a trade offer from ${playerName(getMyId())}.`);
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
    logSettlersEvent(`${playerName(getMyId())} offered ${target.name} ${offer.giveAmount} ${RESOURCE_NAMES[offer.giveType]} for ${offer.wantAmount} ${RESOURCE_NAMES[offer.wantType]}.`);
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
    logSettlersEvent(ok
        ? `${playerName(t.toId)} accepted a trade with ${playerName(t.fromId)}: ${t.giveAmount} ${RESOURCE_NAMES[t.giveType]} for ${t.wantAmount} ${RESOURCE_NAMES[t.wantType]}.`
        : `A trade between ${playerName(t.fromId)} and ${playerName(t.toId)} failed (insufficient cards).`);
    st.pendingTrade = null;
    renderSettlers();
    syncSettlers();
};

window.declineSettlersPlayerTrade = function () {
    const st = window.settlersState;
    if (!st || !st.pendingTrade || st.pendingTrade.toId !== getMyId()) return;

    const fromName = playerName(st.pendingTrade.fromId);
    st.message = `${playerName(getMyId())} declined ${fromName}'s trade.`;
    logSettlersEvent(`${playerName(getMyId())} declined a trade offer from ${fromName}.`);
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

    const total = st.pendingRoll.total;
    st.pendingRoll.applied = true;
    st.highlightedRoll = null;

    if (total === 7) {
        // Robber activation: no resources change hands from tiles this turn.
        // Whoever rolled must move the robber before anything else can happen.
        const roller = currentSettlersPlayer();
        st.pendingRobberMove = { playerId: roller.id };
        st.message = `Rolled a ${total}. ${roller.name} must move the robber.`;
        logSettlersEvent(`${roller.name} rolls ${total}.`);
        logSettlersEvent(`Robber must move - no resources collected.`);
        st.pendingRoll = null;

        renderSettlers();
        syncSettlers();
        return;
    }

    const gains = st.pendingRoll.gains || {};
    applyResourceGains(gains);

    st.resourceBurst = {
        id: `burst-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        gains: JSON.parse(JSON.stringify(gains))
    };

    const roller = currentSettlersPlayer();

    const gainsBits = [];
    Object.keys(gains).forEach(ownerId => {
        const text = resourceParts(gains[ownerId]).join(" ");
        if (text) gainsBits.push(`${playerName(ownerId)}: ${text}`);
    });
    const gainsSummary = gainsBits.length ? gainsBits.join("; ") + "." : "No one collected resources.";

    st.message = `Rolled a ${total}. ${gainsSummary}`;

    logSettlersEvent(`${roller.name} rolls ${total}.`);
    logSettlersEvent(gainsSummary);

    st.pendingRoll = null;

    renderSettlers();
    syncSettlers();
}

function rollForCurrentPlayer() {
    const st = window.settlersState;
    if (!st || st.pendingRoll || st.rolledThisTurn || st.pendingRobberMove) return;

    const { d1, d2, total } = rollTwoDice();
    const gains = total === 7 ? {} : calculateResourcesForRoll(total);
    const rollId = `roll-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

    st.lastRoll = { d1, d2, total };
    st.rolledThisTurn = true;
    st.highlightedRoll = total;
    st.pendingRoll = { id: rollId, d1, d2, total, gains, applied: false };
    st.message = `${currentSettlersPlayer().name} rolls ${total}. Checking resource tiles...`;

    renderSettlers();
    syncSettlers();

    setTimeout(() => applyPendingSettlersRoll(rollId), ROLL_REVEAL_MS);
}

window.rollSettlersDice = function () {
    const st = window.settlersState;
    if (!st) return;
    normalizeSettlersState();

    if (st.phase === "prestart") {
        setMessage("Start the game first.");
        return;
    }

    if (st.setup && st.setup.active) {
        setMessage("Finish setup before rolling dice.");
        return;
    }

    if (st.pendingRobberMove) {
        setMessage("The robber needs to be moved first.");
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
    st.lastRoll = null;
    st.freeRoads = null;
    st.turnNumber += 1;
    yearPlentyPick = null;
    uiState = "IDLE";

    if (Array.isArray(st.players) && st.players.length > 1) st.turnIndex = (st.turnIndex + 1) % st.players.length;

    const current = currentSettlersPlayer();
    st.message = current.id === getMyId() ? "Your turn. Roll the dice." : `${current.name}'s turn.`;
    logSettlersEvent(`${current.name}'s turn.`, current.id);

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

    if (st.pendingRobberMove) {
        setMessage("Move the robber first.");
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

// --- Robber ----------------------------------------------------------------
// The robber starts parked on the desert tile. Whenever any player rolls a 7,
// that roll yields no resources and the roller must move the robber onto a
// different hex before play continues. While the robber sits on a hex, that
// hex's number is shown with a dark overlay and a robber icon, and it pays
// out nothing on future rolls until someone moves the robber off of it again.
function tryMoveRobberForPlayer(playerId, hex, options) {
    const st = window.settlersState;
    const opts = options || {};
    if (!st || !hex) return false;

    if (!st.pendingRobberMove || st.pendingRobberMove.playerId !== playerId) {
        if (!opts.silent) setMessage("It is not time to move the robber.");
        return false;
    }

    if (st.robber && st.robber.row === hex.row && st.robber.col === hex.col) {
        if (!opts.silent) setMessage("The robber is already there. Pick a different tile.");
        return false;
    }

    st.robber = { row: hex.row, col: hex.col };
    st.pendingRobberMove = null;

    const resourceLabel = hex.resource === "desert" ? "the desert" : RESOURCE_NAMES[hex.resource] || hex.resource;
    st.message = `${playerName(playerId)} moved the robber onto ${resourceLabel}.`;
    logSettlersEvent(`${playerName(playerId)} moved the robber onto ${resourceLabel}.`);
    uiState = "IDLE";
    return true;
}

window.moveSettlersRobber = function (row, col) {
    const st = window.settlersState;
    if (!st) return;
    normalizeSettlersState();

    if (!st.pendingRobberMove) return;

    if (st.pendingRobberMove.playerId !== getMyId()) {
        setMessage(`Waiting for ${playerName(st.pendingRobberMove.playerId)} to move the robber.`);
        return;
    }

    const hex = (st.board.hexes || []).find(h => h.row === row && h.col === col);
    if (!hex) return;

    if (tryMoveRobberForPlayer(getMyId(), hex, { silent: false })) {
        renderSettlers();
        syncSettlers();
    }
};

function computerPickRobberHex(playerId) {
    const st = window.settlersState;
    if (!st || !st.board || !Array.isArray(st.board.hexes)) return null;

    const candidates = st.board.hexes.filter(h => !(st.robber && st.robber.row === h.row && st.robber.col === h.col));
    if (!candidates.length) return null;

    // Prefer a hex that touches an opponent's settlement/city, favoring
    // higher-value tokens (6/8) to make the robber placement feel purposeful
    // rather than random.
    const scored = candidates.map(hex => {
        let score = Math.random();
        const touchesOpponent = st.pieces.settlements.concat(st.pieces.cities || []).some(p => p.owner !== playerId && pieceTouchesHex(p, hex));
        const touchesSelf = st.pieces.settlements.concat(st.pieces.cities || []).some(p => p.owner === playerId && pieceTouchesHex(p, hex));

        if (touchesOpponent) score += 6;
        if (touchesSelf) score -= 8;
        if (hex.token === 6 || hex.token === 8) score += 2;

        return { hex, score };
    }).sort((a, b) => b.score - a.score);

    return scored[0].hex;
}

function computerHandleRobberIfNeeded() {
    const st = window.settlersState;
    if (!st || !st.pendingRobberMove || !isHostPlayer()) return false;

    const mover = st.players.find(p => p.id === st.pendingRobberMove.playerId);
    if (!mover || !mover.isComputer) return false;

    const hex = computerPickRobberHex(mover.id);
    if (hex && tryMoveRobberForPlayer(mover.id, hex, { silent: true })) {
        lastComputerActionAt = Date.now();
        renderSettlers();
        syncSettlers();
    }
    return true;
}

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
        logSettlersEvent(`${playerName(playerId)} placed a setup settlement.`);
    } else {
        st.message = `${playerName(playerId)} built a settlement.`;
        logSettlersEvent(`${playerName(playerId)} built a settlement.`);
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
            logSettlersEvent(`${playerName(playerId)} placed 2 free roads (Road Building).`);
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

        // Log this player's road BEFORE advancing the setup turn, since
        // advanceSetupAfterRoad() logs the next player's "X's turn to setup"
        // line itself. Logging order must match the order these things
        // actually happened, or the log reads backwards.
        logSettlersEvent(`${playerName(playerId)} placed a setup road.${gainText && gainText !== "No resources collected." ? " " + gainText : ""}`);

        advanceSetupAfterRoad();

        if (st.setup && st.setup.active) {
            st.message = (gainText && gainText !== "No resources collected." ? gainText + " " : "") + nextSetupMessage();
        } else if (gainText && gainText !== "No resources collected.") {
            st.message = gainText + " Setup complete. " + st.message;
        }
    } else {
        st.message = `${playerName(playerId)} built a road.`;
        logSettlersEvent(`${playerName(playerId)} built a road.`);
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
    logSettlersEvent(`${playerName(playerId)} upgraded a settlement to a city.`);
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
    logSettlersEvent(`${playerName(playerId)} bought a development card.`);
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

    if (st.pendingRobberMove) {
        setMessage("Move the robber first.");
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

    if (st.pendingRobberMove) {
        setMessage("Move the robber first.");
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

    if (st.pendingRobberMove) {
        setMessage("Move the robber first.");
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

    if (st.pendingRobberMove) {
        setMessage("Move the robber first.");
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

    if (st.pendingRobberMove) {
        setMessage("Move the robber first.");
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
        logSettlersEvent(`${playerName(getMyId())} played a Knight.`);
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
        logSettlersEvent(`${playerName(getMyId())} played Road Building.`);
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
    logSettlersEvent(`${playerName(getMyId())} played Year of Plenty and took ${resourceParts(gains[getMyId()]).join(" ") || "2 resources"}.`);
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
    logSettlersEvent(`${playerName(getMyId())} played Monopoly on ${RESOURCE_NAMES[resource] || resource} and collected ${total}.`);
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
        const playable = canPlayDevCard(card) && isMySettlersTurn() && !st.pendingRoll && !st.pendingRobberMove;
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
    if (st.pendingRobberMove) return false;
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
    if (st.pendingRobberMove) return false;
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
    if (st.pendingRobberMove) return false;
    const current = currentSettlersPlayer();
    if (!current || current.id !== playerId || current.isComputer) return false;
    if (st.setup && st.setup.active) return false;
    if (st.pendingRoll || !st.rolledThisTurn) return false;
    return hasResources(playerId, COSTS.city) && ownedSettlementPieces(playerId).length > 0;
}

function canBuyCardAction(playerId) {
    const st = window.settlersState;
    if (!st) return false;
    if (st.pendingRobberMove) return false;
    const current = currentSettlersPlayer();
    if (!current || current.id !== playerId || current.isComputer) return false;
    if (st.setup && st.setup.active) return false;
    if (st.pendingRoll || !st.rolledThisTurn) return false;
    return st.devDeck.length > 0 && hasResources(playerId, COSTS.card);
}

function hideSettlersBuildMarkers() {
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

    if (cancelBtn) cancelBtn.style.display = "none";
}

function refreshSettlersActionSelection() {
    const roadBtn = document.querySelector(".set-actions button[onclick=\"setSettlersUiState('BUILD_ROAD')\"]");
    const settleBtn = document.querySelector(".set-actions button[onclick=\"setSettlersUiState('BUILD_SETTLEMENT')\"]");
    const cityBtn = document.querySelector(".set-actions button[onclick=\"setSettlersUiState('BUILD_CITY')\"]");

    [roadBtn, settleBtn, cityBtn].forEach(btn => {
        if (btn) btn.classList.remove("selected");
    });

    if (uiState === "BUILD_ROAD" && roadBtn) roadBtn.classList.add("selected");
    if (uiState === "BUILD_SETTLEMENT" && settleBtn) settleBtn.classList.add("selected");
    if (uiState === "BUILD_CITY" && cityBtn) cityBtn.classList.add("selected");
}

window.setSettlersUiState = function (newState) {
    const st = window.settlersState;
    const current = currentSettlersPlayer();
    const requestedState = newState || "IDLE";

    if (st && st.pendingRobberMove) {
        uiState = "IDLE";
        hideSettlersBuildMarkers();
        refreshSettlersActionSelection();
        setMessage(getSettlersHeaderText());
        return;
    }

    if (current && current.isComputer) {
        uiState = "IDLE";
        hideSettlersBuildMarkers();
        refreshSettlersActionSelection();
        setMessage(`${current.name} is thinking...`);
        return;
    }

    // Tap the same build button again to hide the purple markers.
    // No separate red Cancel button is needed.
    if (requestedState === uiState && ["BUILD_ROAD", "BUILD_SETTLEMENT", "BUILD_CITY"].includes(requestedState)) {
        uiState = "IDLE";
        hideSettlersBuildMarkers();
        refreshSettlersActionSelection();
        if (st) setMessage(st.message || "");
        return;
    }

    if (requestedState === "BUILD_ROAD" && !canSelectRoadAction(getMyId())) return;
    if (requestedState === "BUILD_SETTLEMENT" && !canSelectSettlementAction(getMyId())) return;
    if (requestedState === "BUILD_CITY" && !canSelectCityAction(getMyId())) return;

    uiState = requestedState;
    hideSettlersBuildMarkers();

    const snapNodes = document.getElementById("snap-nodes");
    const snapEdges = document.getElementById("snap-edges");
    const snapCities = document.getElementById("snap-cities");

    if (uiState === "BUILD_SETTLEMENT") {
        if (snapNodes) {
            snapNodes.style.opacity = "1";
            snapNodes.style.pointerEvents = "auto";
        }
        refreshSettlersActionSelection();
        setMessage(st && st.setup && st.setup.active ? "Tap a purple spot for your settlement." : "Tap a purple spot to build a settlement.");
        return;
    }

    if (uiState === "BUILD_ROAD") {
        if (snapEdges) {
            snapEdges.style.opacity = "1";
            snapEdges.style.pointerEvents = "auto";
        }
        refreshSettlersActionSelection();
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
        refreshSettlersActionSelection();
        setMessage("Tap one of your settlements to upgrade to a city.");
        return;
    }

    hideSettlersBuildMarkers();
    refreshSettlersActionSelection();
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
                    <div>&#127984; City = &#127806;&#127806; + &#129704;&#129704;&#129704;</div>
                    <div>&#127183; Dev Card = &#128017; + &#127806; + &#129704;</div>
                    <div>Ports = build on a port corner to trade better.</div>
                    <div>3:1 port = any 3 same resources for 1 resource.</div>
                    <div>2:1 port = two matching resources for 1 resource.</div>
                    <div>Rolling a 7 moves the robber. The tile it sits on pays out nothing until moved again.</div>
                </div>
                <div class="set-help-note">Setup goes forward, then backward. Starting resources come only from your second settlement.</div>
            </div>
        </div>
    `);
};

function portLabel(type) {
    if (type === "3:1") return "?";
    return ICONS[type];
}

// --- Tile texture patterns ---------------------------------------------------
// Each resource gets a small, repeating SVG pattern drawn in a close shade of
// its own base color, so the board still reads as clean color-coded tiles at
// a glance, but each one also visually hints at the resource it represents
// (wheat stalks, sheep/cloud puffs, ore flecks, brick courses, sand dunes).
// Patterns are defined once in <defs> and referenced by id from each hex.
function buildResourcePatternDefs() {
    return `
        <defs>
            <pattern id="pat-wheat" width="34" height="34" patternUnits="userSpaceOnUse">
                <rect width="34" height="34" fill="${COLORS.wheat}"/>
                <g stroke="#d8b400" stroke-width="1.6" opacity="0.45" stroke-linecap="round">
                    <line x1="6" y1="30" x2="6" y2="10"/>
                    <line x1="6" y1="10" x2="3" y2="14"/>
                    <line x1="6" y1="10" x2="9" y2="14"/>
                    <line x1="6" y1="16" x2="3" y2="20"/>
                    <line x1="6" y1="16" x2="9" y2="20"/>
                    <line x1="22" y1="32" x2="22" y2="14"/>
                    <line x1="22" y1="14" x2="19" y2="18"/>
                    <line x1="22" y1="14" x2="25" y2="18"/>
                    <line x1="22" y1="20" x2="19" y2="24"/>
                    <line x1="22" y1="20" x2="25" y2="24"/>
                </g>
            </pattern>

            <pattern id="pat-sheep" width="40" height="28" patternUnits="userSpaceOnUse">
                <rect width="40" height="28" fill="${COLORS.sheep}"/>
                <g fill="none" stroke="#d8d8d8" stroke-width="1.3" opacity="0.55">
                    <circle cx="10" cy="10" r="5"/>
                    <circle cx="16" cy="9" r="6"/>
                    <circle cx="22" cy="11" r="4.5"/>
                    <circle cx="31" cy="20" r="4.5"/>
                    <circle cx="36" cy="19" r="5.5"/>
                </g>
            </pattern>

            <pattern id="pat-ore" width="30" height="30" patternUnits="userSpaceOnUse">
                <rect width="30" height="30" fill="${COLORS.ore}"/>
                <g fill="#5e5e5e" opacity="0.5">
                    <polygon points="5,6 9,5 8,10 3,11"/>
                    <polygon points="18,14 23,13 22,18 17,19"/>
                    <polygon points="9,21 13,20 12,25 8,26"/>
                    <polygon points="24,3 27,4 26,8 23,7"/>
                </g>
            </pattern>

            <pattern id="pat-brick" width="32" height="18" patternUnits="userSpaceOnUse">
                <rect width="32" height="18" fill="${COLORS.brick}"/>
                <g stroke="#8a3c28" stroke-width="1.3" opacity="0.5">
                    <line x1="0" y1="9" x2="32" y2="9"/>
                    <line x1="0" y1="0" x2="0" y2="9"/>
                    <line x1="16" y1="0" x2="16" y2="9"/>
                    <line x1="32" y1="0" x2="32" y2="9"/>
                    <line x1="8" y1="9" x2="8" y2="18"/>
                    <line x1="24" y1="9" x2="24" y2="18"/>
                </g>
            </pattern>

            <pattern id="pat-wood" width="26" height="26" patternUnits="userSpaceOnUse">
                <rect width="26" height="26" fill="${COLORS.wood}"/>
                <g fill="#1e4f21" opacity="0.4">
                    <ellipse cx="7" cy="8" rx="5" ry="7"/>
                    <ellipse cx="19" cy="17" rx="5.5" ry="7.5"/>
                </g>
            </pattern>

            <pattern id="pat-desert" width="60" height="40" patternUnits="userSpaceOnUse">
                <rect width="60" height="40" fill="${COLORS.desert}"/>
                <path d="M0,28 Q15,18 30,28 T60,28 V40 H0 Z" fill="#c9ad5e" opacity="0.75"/>
                <path d="M0,34 Q15,26 30,34 T60,34 V40 H0 Z" fill="#b89645" opacity="0.7"/>
                <path d="M-5,12 Q10,5 25,12 T55,12" fill="none" stroke="#c9ad5e" stroke-width="2" opacity="0.5"/>
            </pattern>
        </defs>
    `;
}

const RESOURCE_PATTERN_IDS = {
    wheat: "pat-wheat",
    sheep: "pat-sheep",
    ore: "pat-ore",
    brick: "pat-brick",
    wood: "pat-wood",
    desert: "pat-desert"
};

function tileFillFor(resource) {
    const patternId = RESOURCE_PATTERN_IDS[resource];
    return patternId ? `url(#${patternId})` : (COLORS[resource] || "#ccc");
}

function buildSvgBoardHtml() {
    const st = window.settlersState;
    if (!st || !st.board) return "";

    let hexHtml = "";
    const snapNodes = new Map();
    const snapEdges = new Map();

    st.board.hexes.forEach(hex => {
        const rollHighlighted = st.highlightedRoll && hex.token === st.highlightedRoll;
        const robberHere = isRobberOnHex(hex);
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
                    fill="${tileFillFor(hex.resource)}"
                    stroke="${hexStroke}"
                    stroke-width="${hexStrokeWidth}"
                />
        `;

        if (robberHere) {
            // Dim the blocked tile and draw a simple robber token (dark circle + hat shape).
            hexHtml += `<polygon points="
                    0,${-HEX_SIZE}
                    ${HEX_WIDTH / 2},${-HEX_SIZE / 2}
                    ${HEX_WIDTH / 2},${HEX_SIZE / 2}
                    0,${HEX_SIZE}
                    ${-HEX_WIDTH / 2},${HEX_SIZE / 2}
                    ${-HEX_WIDTH / 2},${-HEX_SIZE / 2}"
                    fill="rgba(0,0,0,0.38)"
                    pointer-events="none"
                />`;
        }

        if (hex.token) {
            const isRed = hex.token === 6 || hex.token === 8;
            hexHtml += `
                <circle cx="0" cy="0" r="19" fill="#fff" stroke="#333" stroke-width="1.5"/>
                <text x="0" y="7" font-family="Arial" font-weight="900" font-size="21" text-anchor="middle" fill="${isRed ? "#dc3545" : "#111"}">${hex.token}</text>
            `;
        }

        if (robberHere) {
            hexHtml += `
                <g pointer-events="none">
                    <ellipse cx="0" cy="14" rx="13" ry="6" fill="#1b1b1b" opacity="0.5"/>
                    <circle cx="0" cy="2" r="13" fill="#3a3a3a" stroke="#000" stroke-width="2"/>
                    <circle cx="0" cy="-9" r="7" fill="#3a3a3a" stroke="#000" stroke-width="2"/>
                </g>
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
        const halfGlyph = 20;
        const viewMinX = -88;
        const viewMinY = -88;
        const viewMaxX = 418;
        const viewMaxY = 378;
        const safeMargin = 4;
        const rawLabelPoint = { x: port.lx, y: port.ly };
        const clampedLx = Math.max(viewMinX + halfGlyph + safeMargin, Math.min(viewMaxX - halfGlyph - safeMargin, rawLabelPoint.x));
        const clampedLy = Math.max(viewMinY + halfGlyph + safeMargin, Math.min(viewMaxY - halfGlyph - safeMargin, rawLabelPoint.y));
        const fontSize = port.type === "3:1" ? 34 : 32;

        // Two thin lines from the icon to the exact two hex-corner points
        // this port serves (so it's clear which intersections to build on),
        // but no circles/dots at the endpoints and no badge behind the
        // icon - just the lines, the bare glyph, and the ocean blue.
        portsHtml += `
            <g style="pointer-events:none;">
                <line x1="${clampedLx}" y1="${clampedLy}" x2="${port.x1}" y2="${port.y1}" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.95"/>
                <line x1="${clampedLx}" y1="${clampedLy}" x2="${port.x2}" y2="${port.y2}" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.95"/>
                <text x="${clampedLx}" y="${clampedLy + fontSize * 0.34}" text-anchor="middle" font-family="Arial" font-size="${fontSize}" font-weight="900" fill="#ffffff" stroke="#1e4620" stroke-width="2.5" paint-order="stroke fill">${label}</text>
            </g>
        `;
    });


    // Roads are drawn with a white outline underneath the player-colored
    // line so they read clearly against every hex color, matching how
    // settlements/cities already get a white border.
    let piecesHtml = "";

    st.pieces.roads.forEach(r => {
        piecesHtml += `<line x1="${r.x1}" y1="${r.y1}" x2="${r.x2}" y2="${r.y2}" stroke="#ffffff" stroke-width="12" stroke-linecap="round" />`;
    });

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
    const robberMoveActive = !!st.pendingRobberMove;

    const legalNodes = robberMoveActive ? [] : legalSettlementNodes(playerId, setupMode);
    snapNodes.forEach(node => {
        const legal = legalNodes.some(n => pointsMatch(n, node));
        if (!legal) return;

        snapNodesHtml += `<circle cx="${node.x}" cy="${node.y}" r="10" fill="rgba(138, 43, 226, 0.20)" stroke="${HIGHLIGHT_PURPLE}" stroke-width="3" style="cursor:pointer;" onclick="placeSettlement(${node.x}, ${node.y})" />`;
    });

    let snapEdgesHtml = "";
    const pendingSettlement = st.setup && st.setup.active ? st.setup.pendingSettlement : null;
    if (!robberMoveActive) {
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
    }

    let snapCitiesHtml = "";
    if (!robberMoveActive) {
        ownedSettlementPieces(getMyId()).forEach(s => {
            snapCitiesHtml += `<circle cx="${s.x}" cy="${s.y}" r="16" fill="rgba(138, 43, 226, 0.20)" stroke="${HIGHLIGHT_PURPLE}" stroke-width="4" style="cursor:pointer;" onclick="placeCity('${s.id}')" />`;
        });
    }

    let robberTargetsHtml = "";
    if (robberMoveActive && st.pendingRobberMove.playerId === getMyId()) {
        st.board.hexes.forEach(hex => {
            if (isRobberOnHex(hex)) return;
            robberTargetsHtml += `<polygon points="
                    ${hex.x},${hex.y - HEX_SIZE}
                    ${hex.x + HEX_WIDTH / 2},${hex.y - HEX_SIZE / 2}
                    ${hex.x + HEX_WIDTH / 2},${hex.y + HEX_SIZE / 2}
                    ${hex.x},${hex.y + HEX_SIZE}
                    ${hex.x - HEX_WIDTH / 2},${hex.y + HEX_SIZE / 2}
                    ${hex.x - HEX_WIDTH / 2},${hex.y - HEX_SIZE / 2}"
                    fill="rgba(138, 43, 226, 0.28)"
                    stroke="${HIGHLIGHT_PURPLE}"
                    stroke-width="4"
                    style="cursor:pointer;"
                    onclick="moveSettlersRobber(${hex.row}, ${hex.col})"
                />`;
        });
    }

    return `
        <div class="set-board-zoomer">
            <svg viewBox="-90 -90 510 470" preserveAspectRatio="xMidYMid meet">
                ${buildResourcePatternDefs()}
                <g id="hex-grid">${hexHtml}</g>
                <g id="placed-pieces">${piecesHtml}</g>
                <g id="ports-layer">${portsHtml}</g>
                <g id="snap-edges" style="opacity:0; pointer-events:none;">${snapEdgesHtml}</g>
                <g id="snap-nodes" style="opacity:0; pointer-events:none;">${snapNodesHtml}</g>
                <g id="snap-cities" style="opacity:0; pointer-events:none;">${snapCitiesHtml}</g>
                <g id="robber-targets">${robberTargetsHtml}</g>
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

    if (computerHandleRobberIfNeeded()) return;
    if (st.pendingRobberMove) return; // waiting on a human to move the robber

    const player = currentSettlersPlayer();
    if (!player || !player.isComputer) return;
    if (st.pendingRoll) return;

    if (st.setup && st.setup.active) {
        if (st.setup.needed === "settlement") {
            const node = computerPickSettlement(player.id, true);
            if (node) {
                tryPlaceSettlementForPlayer(player.id, node.x, node.y, { silent: true });
                lastComputerActionAt = Date.now();
                renderSettlers();
                syncSettlers();
            }
            return;
        }

        if (st.setup.needed === "road") {
            const edge = computerPickRoad(player.id, true, st.setup.pendingSettlement);
            if (edge) {
                tryPlaceRoadForPlayer(player.id, edge, { silent: true });
                lastComputerActionAt = Date.now();
                renderSettlers();
                syncSettlers();
            }
            return;
        }
    }

    if (st.phase === "playing") {
        if (!st.rolledThisTurn) {
            setTimeout(() => {
                lastComputerActionAt = Date.now();
                rollForCurrentPlayer();
            }, COMPUTER_ROLL_DELAY_MS);
            return;
        }

        computerTryBuild(player);
        lastComputerActionAt = Date.now();
        renderSettlers();
        syncSettlers();

        setTimeout(() => {
            const nowPlayer = currentSettlersPlayer();
            if (nowPlayer && nowPlayer.id === player.id && nowPlayer.isComputer && !window.settlersState.pendingRoll && !window.settlersState.pendingRobberMove) {
                endCurrentTurn();
            }
        }, COMPUTER_BUILD_DELAY_MS);
    }
}

function scheduleComputerIfNeeded(delay) {
    const st = window.settlersState;
    if (!st || !isHostPlayer()) return;

    // Never let a bot action fire sooner than COMPUTER_DELAY_MS after its
    // last action, regardless of what delay a caller asked for.
    const requestedDelay = delay || COMPUTER_DELAY_MS;
    const sinceLast = Date.now() - lastComputerActionAt;
    const effectiveDelay = Math.max(requestedDelay, COMPUTER_DELAY_MS - sinceLast);

    if (st.pendingRobberMove) {
        const mover = st.players.find(p => p.id === st.pendingRobberMove.playerId);
        if (mover && mover.isComputer) {
            if (computerTimer) clearTimeout(computerTimer);
            computerActionKey = "robber|" + st.pendingRobberMove.playerId;
            computerTimer = setTimeout(() => {
                computerTimer = null;
                computerTakeAction();
            }, effectiveDelay);
        }
        return;
    }

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
    }, effectiveDelay);
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

// --- Shuffle / Start (host pre-game controls) -------------------------------
window.shuffleSettlersBoard = function () {
    const st = window.settlersState;
    if (!st) return;
    normalizeSettlersState();

    if (!isHostPlayer()) {
        setMessage("Only the host can shuffle the board.");
        return;
    }

    const hasPieces = st.pieces && (
        (st.pieces.settlements && st.pieces.settlements.length) ||
        (st.pieces.roads && st.pieces.roads.length) ||
        (st.pieces.cities && st.pieces.cities.length)
    );

    if (hasPieces) {
        setMessage("You can only shuffle before anyone places pieces.");
        return;
    }

    const basePositions = st.board.hexes.map(h => ({ row: h.row, col: h.col, x: h.x, y: h.y }));
    const newHexes = generateScoredHexes(basePositions);

    st.board.hexes = newHexes;
    st.board.ports = pickPortEdges(newHexes, PORTS);

    const desertHex = findDesertHex(newHexes);
    st.robber = desertHex ? { row: desertHex.row, col: desertHex.col } : null;

    st.phase = "prestart";
    st.message = "Board shuffled. Hit Start Game when ready.";

    renderSettlers();
    syncSettlers();
};

window.startSettlersSetupGame = function () {
    const st = window.settlersState;
    if (!st) return;
    normalizeSettlersState();

    if (!isHostPlayer()) {
        setMessage("Only the host can start the game.");
        return;
    }

    const hasPieces = st.pieces && (
        (st.pieces.settlements && st.pieces.settlements.length) ||
        (st.pieces.roads && st.pieces.roads.length) ||
        (st.pieces.cities && st.pieces.cities.length)
    );

    if (hasPieces) return;

    const order = buildSetupOrder(st.players.length);

    st.phase = "setup";
    st.turnIndex = order[0] || 0;
    st.setup = {
        active: true,
        order,
        stepIndex: 0,
        needed: "settlement",
        pendingSettlement: null
    };

    const current = st.players[st.turnIndex] || { name: "Player 1" };
    st.message = `${current.name}: choose Settle below for your first settlement.`;
    logSettlersEvent("The game started. Setup phase begins.");
    logSettlersEvent(`${current.name}'s turn to setup.`, current.id);

    renderSettlers();
    syncSettlers();
};

// Small fixed color swatch in the corner of the board so it's always
// obvious which color you are, without adding any extra board piece that
// could be mistaken for an actual settlement. Styled like a tiny settlement
// (rounded square, white border) so it reads as "this is your piece color"
// at a glance, but positioned off in the corner where it won't be confused
// with anything actually placed on the board.
function mySettlersColorSwatchHtml() {
    const myId = getMyId();
    const color = playerColor(myId);
    if (!color) return "";

    return `<div class="set-my-color-swatch" style="background:${color};" title="Your color" aria-label="Your player color"></div>`;
}

function prestartControlsHtml() {
    const st = window.settlersState;
    if (!st || st.phase !== "prestart" || !isHostPlayer()) return "";

    return `
        <button type="button" onclick="shuffleSettlersBoard()" class="set-prestart-btn set-shuffle-btn">Shuffle</button>
        <button type="button" onclick="startSettlersSetupGame()" class="set-prestart-btn set-start-btn">Start Game</button>
    `;
}

function logDotHtml(dotPlayerId) {
    if (!dotPlayerId) return "";
    const color = playerColor(dotPlayerId);
    return `<span class="set-log-dot" style="background:${color};"></span>`;
}

function buildSettlersLogHeaderHtml() {
    const st = window.settlersState;
    const log = (st && Array.isArray(st.gameLog)) ? st.gameLog : [];
    const newestEntry = log.length ? log[log.length - 1] : null;

    const transientActive = transientMessageText && Date.now() < transientMessageExpiresAt;

    // Decide which log entry the header should actually display. Normally
    // that's just the newest one - but if we're still within MIN_LOG_HOLD_MS
    // of when we started showing the currently-held entry, keep showing that
    // one instead of jumping straight to the newest, so a fast back-to-back
    // pair of log lines (e.g. "X rolls N" then "who got what") each get a
    // real, consistent amount of time on screen instead of one flashing by.
    let displayEntry = newestEntry;

    if (!transientActive && newestEntry) {
        const heldEntry = log.find(e => e.id === headerHoldEntryId) || null;
        const heldStillFresh = heldEntry && typeof heldEntry.createdAt === "number" && (Date.now() - heldEntry.createdAt) < LOG_POP_DURATION_MS;
        const withinMinHold = headerHoldEntryId && (Date.now() - headerHoldStartedAt) < MIN_LOG_HOLD_MS;

        if (heldEntry && heldStillFresh && withinMinHold) {
            displayEntry = heldEntry;
        } else if (headerHoldEntryId !== newestEntry.id) {
            headerHoldEntryId = newestEntry.id;
            headerHoldStartedAt = Date.now();
        }
    }

    // Only show the freshly logged action ("Beverly rolls 12.", "Wood +1...")
    // for LOG_POP_DURATION_MS after it was logged. Otherwise the header
    // always reverts to the live "whose turn / what's happening" status,
    // which is what carries the persistent dotted "X's turn" line.
    const isFresh = !transientActive && displayEntry && typeof displayEntry.createdAt === "number" && (Date.now() - displayEntry.createdAt) < LOG_POP_DURATION_MS;

    let headerText;
    let headerDot;

    if (transientActive) {
        headerText = transientMessageText;
        headerDot = "";
    } else if (isFresh) {
        headerText = displayEntry.text;
        headerDot = logDotHtml(displayEntry.dotPlayerId);
    } else {
        headerText = getSettlersHeaderText();
        headerDot = logDotHtml(getSettlersHeaderDotPlayerId());
    }

    const historyEntries = log.slice(0, log.length - 1).slice().reverse();
    const arrowGlyph = logExpanded ? "&#9650;" : "&#9660;"; // up when open, down when closed

    const historyHtml = historyEntries.length ? historyEntries.map(entry => `
        <div class="set-log-row">${logDotHtml(entry.dotPlayerId)}${escapeHtml(entry.text)}</div>
    `).join("") : `<div class="set-log-row set-log-empty">No earlier actions yet.</div>`;

    return `
        <div class="set-header" id="set-msg">
            <div class="set-log-top">
                <span class="set-log-current">${headerDot}${escapeHtml(headerText)}</span>
                ${log.length > 0 ? `
                    <button type="button" class="set-log-toggle" onclick="toggleSettlersLog()" aria-label="Toggle game log">${arrowGlyph}</button>
                ` : ""}
            </div>
            ${logExpanded ? `<div class="set-log-history">${historyHtml}</div>` : ""}
        </div>
    `;
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
    const robberMoveActive = !!st.pendingRobberMove;
    const pendingRoll = st.pendingRoll && !st.pendingRoll.applied ? st.pendingRoll : null;
    const prestart = st.phase === "prestart";

    const roadEnabled = canSelectRoadAction(getMyId());
    const settleEnabled = canSelectSettlementAction(getMyId());
    const cityEnabled = canSelectCityAction(getMyId());
    const buyEnabled = canBuyCardAction(getMyId());
    const canRoll = myTurn && !st.rolledThisTurn && !setupActive && !pendingRoll && !computerTurn && !prestart && !robberMoveActive;
    const canEnd = myTurn && st.rolledThisTurn && !setupActive && !pendingRoll && !computerTurn && !robberMoveActive;
    const rollButtonActive = canRoll || canEnd;
    const rollButtonLabel = canEnd ? "End" : "Roll";
    const rollButtonIcon = canEnd ? "&rarr;" : "&#127922;";
    const rollButtonAction = canEnd ? "endSettlersTurn()" : "rollSettlersDice()";

    let burst = null;
    if (st.resourceBurst && st.resourceBurst.id !== lastResourceBurstId) {
        lastResourceBurstId = st.resourceBurst.id;
        burst = cloneResourceSet(st.resourceBurst.gains && st.resourceBurst.gains[getMyId()]);
    }

    const topLogEntry = st.gameLog && st.gameLog.length ? st.gameLog[st.gameLog.length - 1] : null;
    const isNewLogEntry = topLogEntry && topLogEntry.id !== lastSeenLogId;
    if (isNewLogEntry) lastSeenLogId = topLogEntry.id;

    el.innerHTML = `
        <style>
            .set-wrap { display:flex; flex-direction:column; height:100%; width:100%; background:${COLORS.ocean}; color:#111; font-family:Arial,sans-serif; overflow:hidden; position:relative; }
            .set-header { background:#1e4620; color:#ffd700; padding:0; text-align:left; font-weight:900; font-size:15px; box-shadow:0 4px 10px rgba(0,0,0,0.3); z-index:10; flex-shrink:0; max-height:46vh; overflow:hidden; display:flex; flex-direction:column; }
            .set-log-top { display:flex; align-items:center; gap:8px; padding:10px 12px; text-align:center; }
            .set-log-current { flex:1; text-align:center; }
            .set-log-toggle { flex-shrink:0; background:rgba(255,255,255,0.12); border:2px solid #ffd700; color:#ffd700; border-radius:999px; width:30px; height:30px; font-size:13px; line-height:1; display:flex; align-items:center; justify-content:center; }
            .set-log-toggle:active { transform:scale(0.92); }
            .set-log-history { overflow-y:auto; border-top:2px solid rgba(255,215,0,0.35); background:rgba(0,0,0,0.18); max-height:36vh; }
            .set-log-row { padding:8px 12px; font-size:13px; font-weight:700; color:#f3f3e6; border-bottom:1px solid rgba(255,255,255,0.08); text-align:left; }
            .set-log-row.set-log-empty { color:rgba(243,243,230,0.6); font-weight:600; font-style:italic; text-align:center; }
            .set-log-dot { display:inline-block; width:11px; height:11px; border-radius:3px; margin-right:7px; border:1.5px solid rgba(255,255,255,0.9); vertical-align:middle; flex-shrink:0; }
            @keyframes setLogFlash { 0% { background:rgba(255,215,0,0.45); } 100% { background:transparent; } }
            .set-log-flash { animation:setLogFlash 1.4s ease-out; }
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
            .set-my-color-swatch { position:absolute; left:14px; bottom:58px; width:22px; height:22px; border-radius:4px; border:2.5px solid #ffffff; box-shadow:0 2px 6px rgba(0,0,0,.35); z-index:45; }
            .set-prestart-btn { position:absolute; bottom:14px; border:2px solid #ffffff; border-radius:999px; font-weight:900; box-shadow:0 3px 10px rgba(0,0,0,.35); z-index:50; }
            .set-shuffle-btn { left:14px; background:#1d4ed8; color:#ffffff; padding:9px 14px; font-size:13px; }
            .set-start-btn { right:14px; background:#ffd700; color:#1e4620; padding:7px 11px; font-size:12px; }
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
            .set-act-btn.cancel-btn, #set-cancel { display:none !important; }
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
            ${buildSettlersLogHeaderHtml()}
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
                            ${prestartControlsHtml()}
                            ${mySettlersColorSwatchHtml()}
                        </div>

                        <div class="set-hand-ui">
                            <div class="set-resources">
                                <span class="set-res-item">&#129521; ${brick}${getResourceBurstHtml(burst && burst.brick)}</span>
                                <span class="set-res-item">&#127794; ${wood}${getResourceBurstHtml(burst && burst.wood)}</span>
                                <span class="set-res-item">&#128017; ${sheep}${getResourceBurstHtml(burst && burst.sheep)}</span>
                                <span class="set-res-item">&#127806; ${wheat}${getResourceBurstHtml(burst && burst.wheat)}</span>
                                <span class="set-res-item">&#129704; ${ore}${getResourceBurstHtml(burst && burst.ore)}</span>
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
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            ${pendingTradeOverlayHtml()}
        </div>
    `;

    if (computerTurn && !robberMoveActive) {
        uiState = "IDLE";
        setMessage(st.message || `${currentPlayer.name} is thinking...`);
    } else if (robberMoveActive) {
        uiState = "IDLE";
        setMessage(getSettlersHeaderText());
    } else if (myTurn && setupActive && uiState === "IDLE") {
        // Setup only ever needs exactly one specific thing at a time (a
        // settlement, then the road touching it), so it's unambiguous to
        // auto-highlight the right spots the moment it becomes the human's
        // turn, instead of waiting for them to tap the Settle/Road button.
        const autoState = st.setup.needed === "road" ? "BUILD_ROAD" : "BUILD_SETTLEMENT";
        window.setSettlersUiState(autoState);
    } else if (uiState !== "IDLE") {
        const keep = uiState;
        uiState = "IDLE";
        window.setSettlersUiState(keep);
    }

    initSettlersPanZoom();

    if (isNewLogEntry) popSettlersLogHeader();

    if (robberMoveActive) {
        scheduleComputerIfNeeded(COMPUTER_DELAY_MS);
    } else {
        scheduleComputerIfNeeded(computerTurn ? COMPUTER_DELAY_MS : 0);
    }
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
