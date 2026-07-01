/* CHASER TINY KINGDOMS - SEPARATE GAME FILE
Small-screen strategy kingdom game.
1 player vs computer or 2-4 players synced.
*/
;(function () {
"use strict";

const MAX_ROUNDS = 10;
const MAX_PLAYERS = 4;
const BOT_ID = "tiny-kingdoms-computer";
const BOT_DELAY = 6000;
const ARMY_REVEAL_MS = 2800;
const ACTION_FLASH_MS = 1500;
const BONUS_STEP_MS = 2000;
const SECRET_GOAL_POINTS = 5;
const ROUND_NUMBER_MS = 3000;
const ROUND_EVENT_MS = 3000;
const ROUND_EFFECT_MS = 1700;

let botTimer = null;
let armyRevealTimer = null;
let actionFlashTimer = null;
let bonusStepTimer = null;
let roundIntroTimer = null;

const zoomView = {
scale: 1,
x: 0,
y: 0
};

const ROUND_EVENTS = [
{ id: "good_harvest", icon: "🌾", title: "Good Harvest", desc: "Everyone gains 1 food.", resource: "food", amount: 1, good: true },
{ id: "trade_gift", icon: "🎁", title: "Trade Gift", desc: "Everyone gains 1 coin.", resource: "coins", amount: 1, good: true },
{ id: "library_day", icon: "📚", title: "Library Day", desc: "Everyone gains 1 study.", resource: "science", amount: 1, good: true },
{ id: "new_recruits", icon: "⚔️", title: "New Recruits", desc: "Everyone gains 1 army.", resource: "army", amount: 1, good: true },
{ id: "stone_delivery", icon: "🛡️", title: "Stone Delivery", desc: "Everyone gains 1 shield.", resource: "shield", amount: 1, good: true },
{ id: "drought", icon: "☀️", title: "Drought", desc: "Everyone loses 1 food.", resource: "food", amount: -1, good: false },
{ id: "tax_day", icon: "💸", title: "Tax Day", desc: "Everyone loses 1 coin.", resource: "coins", amount: -1, good: false },
{ id: "snow_day", icon: "❄️", title: "Snow Day", desc: "Everyone loses 1 study.", resource: "science", amount: -1, good: false },
{ id: "desertion", icon: "🪖", title: "Desertion", desc: "Everyone loses 1 army.", resource: "army", amount: -1, good: false },
{ id: "cracked_walls", icon: "🧱", title: "Cracked Walls", desc: "Everyone loses 1 shield.", resource: "shield", amount: -1, good: false }
];

const SECRET_GOALS = [
{ id: "bread", title: "Bread Baron", desc: "Have the most food at the end.", resource: "food" },
{ id: "coins", title: "Coin Crown", desc: "Have the most coins at the end.", resource: "coins" },
{ id: "study", title: "Scholar King", desc: "Have the most study at the end.", resource: "science" },
{ id: "army", title: "War Leader", desc: "Have the most army at the end.", resource: "army" },
{ id: "wonder", title: "Great Builder", desc: "Have the most wonders at the end.", resource: "wonder" },
{ id: "shield", title: "Stone Wall", desc: "Have the most shield at the end.", resource: "shield" }
];

function byId(id) {
return document.getElementById(id);
}

function canvas() {
return byId("gameCanvasContainer");
}

function escapeHtml(value) {
return String(value || "")
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;")
    .replace(/'/g, "\u0026#039;");
}

function getMyId() {
if (typeof window.myId === "function") return window.myId();
if (typeof window.myId === "string") return window.myId;
return localStorage.getItem("rider_id") || "local-player";
}

function myName() {
const input = byId("username");
return (input && input.value.trim()) || localStorage.getItem("rider_saved_name") || "Player";
}

function openStage() {
const stage = byId("activeGameStage");
if (stage) stage.classList.add("open");
}

function setHeader() {
const roomDisplay = byId("roomDisplayCode");
const headerBtns = byId("headerActionButtonsContainer");
const chatHeader = byId("chatHeader");

if (roomDisplay) roomDisplay.innerText = "🏰 Tiny Kingdoms";
if (headerBtns) headerBtns.style.display = "none";
if (chatHeader) chatHeader.classList.add("game-active-mode");
}

function resetZoom() {
zoomView.scale = 1;
zoomView.x = 0;
zoomView.y = 0;
}

function syncTinyKingdoms() {
if (typeof channel !== "undefined" && channel && window.tinyKingdomsState) {
    channel.send({
        type: "broadcast",
        event: "tinykingdoms-sync-state",
        payload: {
            state: window.tinyKingdomsState,
            roomGameId: window.chaserGame && window.chaserGame.activeGameId ? window.chaserGame.activeGameId : null
        }
    });
}
}

function isTinyKingdomsHost() {
if (!window.chaserGame || !window.chaserGame.hostId) return true;
return window.chaserGame.hostId === getMyId();
}

function shuffleCopy(arr) {
const copy = arr.slice();

for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
}

return copy;
}

function makeRoundEventDeck(totalRounds) {
const deck = [];

while (deck.length < totalRounds) {
    shuffleCopy(ROUND_EVENTS).forEach(function (event) {
        if (deck.length < totalRounds) deck.push(event);
    });
}

if (deck.length > 1 && deck[0] && deck[0].amount < 0) {
    const firstGoodIndex = deck.findIndex(function (event) {
        return event.amount > 0;
    });

    if (firstGoodIndex > 0) {
        const temp = deck[0];
        deck[0] = deck[firstGoodIndex];
        deck[firstGoodIndex] = temp;
    }
}

return deck;
}

function roundEventFor(round) {
const idx = Math.abs((Number(round || 1) - 1) % ROUND_EVENTS.length);
return ROUND_EVENTS[idx];
}

function goalForIndex(index) {
return SECRET_GOALS[index % SECRET_GOALS.length];
}

function shuffledSecretGoals() {
const goals = SECRET_GOALS.slice();

for (let i = goals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = goals[i];
    goals[i] = goals[j];
    goals[j] = temp;
}

return goals;
}

function makePlayers() {
const lobbyPlayers = window.chaserGame && Array.isArray(window.chaserGame.players) && window.chaserGame.players.length
? window.chaserGame.players
: [{ id: getMyId(), name: myName(), seat: 0 }];

const secretGoalOrder = shuffledSecretGoals();

const players = lobbyPlayers.slice(0, MAX_PLAYERS).map(function (p, idx) {
    const goal = secretGoalOrder[idx % secretGoalOrder.length];

    return {
        id: p.id,
        name: p.name || "Player " + (idx + 1),
        isComputer: false,
        food: 0,
        coins: 0,
        science: 0,
        army: 0,
        shield: 0,
        wonder: 0,
        score: 0,
        endBonus: 0,
        secretBonus: 0,
        secretGoal: goal.id,
        acted: false,
        lastAction: "",
        lastActionCode: ""
    };
});

if (players.length === 1) {
    const goal = secretGoalOrder[1 % secretGoalOrder.length];

    players.push({
        id: BOT_ID,
        name: "Computer",
        isComputer: true,
        food: 0,
        coins: 0,
        science: 0,
        army: 0,
        shield: 0,
        wonder: 0,
        score: 0,
        endBonus: 0,
        secretBonus: 0,
        secretGoal: goal.id,
        acted: false,
        lastAction: "",
        lastActionCode: ""
    });
}

return players;
}

function createState() {
const roundEvents = makeRoundEventDeck(MAX_ROUNDS);

return {
    phase: "playing",
    round: 1,
    maxRounds: MAX_ROUNDS,
    roundEvents: roundEvents,
    roundEvent: roundEvents[0] || roundEventFor(1),
    players: makePlayers(),
    turnIndex: 0,
    message: "Round 1",
    log: [],
    finalMessage: "",
    winners: [],
    armyRevealUntil: 0,
    armyRevealIds: [],
    actionFlash: null,
    resourceFlashes: [],
    eventAppliedRound: 0,
    lastActionMeta: null,
    scoringQueue: [],
    scoringIndex: 0,
    activeScoring: null,
    roundIntroMode: "number",
    roundIntroUntil: Date.now() + ROUND_NUMBER_MS
};
}

function addLog(st, text) {
st.log.unshift(text);
st.log = st.log.slice(0, 4);
}

function isHiddenMilitaryAction(action) {
return action === "train" || action === "guard";
}

function eventFlashLabel(amount) {
return (amount > 0 ? "+" : "") + amount;
}

function triggerResourceFlash(st, playerId, resource, label, action) {
if (!st) return;
if (!Array.isArray(st.resourceFlashes)) st.resourceFlashes = [];

st.resourceFlashes.push({
    playerId: playerId,
    resource: resource,
    label: label || "",
    action: action || "",
    until: Date.now() + ACTION_FLASH_MS
});
}

function clearResourceFlashes(st) {
if (!st) return;
st.actionFlash = null;
st.resourceFlashes = [];
}

function applyRoundEvent(st) {
if (!st || !st.roundEvent || !Array.isArray(st.players)) return;
if (st.eventAppliedRound === st.round) return;

const ev = st.roundEvent;
const resource = ev.resource;
const amount = Number(ev.amount || 0);

st.eventAppliedRound = st.round;

if (!resource || !amount) {
    st.message = "Round " + st.round + ": " + ev.title;
    addLog(st, ev.title);
    return;
}

st.players.forEach(function (p) {
    const before = Number(p[resource] || 0);
    const after = Math.max(0, before + amount);
    const diff = after - before;

    p[resource] = after;

    if (diff !== 0) {
        triggerResourceFlash(st, p.id, resource, eventFlashLabel(diff), "roundEvent");
    }
});

st.message = "Round " + st.round + ": " + ev.title;
addLog(st, ev.title + ": " + ev.desc);
}

function startRoundIntro(st) {
clearTimeout(roundIntroTimer);

if (!st) return;

st.roundIntroMode = "number";
st.roundIntroUntil = Date.now() + ROUND_NUMBER_MS;
st.eventAppliedRound = 0;
st.lastActionMeta = null;
clearResourceFlashes(st);
st.message = "Round " + st.round;
}

function scheduleRoundIntro() {
clearTimeout(roundIntroTimer);

const st = window.tinyKingdomsState;

if (!st || !st.roundIntroMode) return;
if (!isTinyKingdomsHost()) return;

const wait = Math.max(0, Number(st.roundIntroUntil || 0) - Date.now());

roundIntroTimer = setTimeout(function () {
    const current = window.tinyKingdomsState;

    if (!current || !current.roundIntroMode) return;

    if (current.roundIntroMode === "number") {
        current.roundIntroMode = "event";
        current.roundIntroUntil = Date.now() + ROUND_EVENT_MS;
        current.message = current.roundEvent ? current.roundEvent.title : "Round Event";
        renderTinyKingdomsNoBot();
        syncTinyKingdoms();
        scheduleRoundIntro();
        return;
    }

    if (current.roundIntroMode === "event") {
        current.roundIntroMode = "effect";
        current.roundIntroUntil = Date.now() + ROUND_EFFECT_MS;
        clearResourceFlashes(current);
        applyRoundEvent(current);
        renderTinyKingdomsNoBot();
        syncTinyKingdoms();
        scheduleRoundIntro();
        return;
    }

    if (current.roundIntroMode === "effect") {
        current.roundIntroMode = "";
        current.roundIntroUntil = 0;
        current.message = "Round " + current.round + ": " + (current.roundEvent ? current.roundEvent.title : "Begin");
        renderTinyKingdomsNoBot();
        syncTinyKingdoms();
        maybeComputerAction();
    }
}, wait + 60);
}

function displayLastActionForViewer(p) {
const st = window.tinyKingdomsState;
const me = myPlayer();

if (!p || !p.lastAction) return p && p.acted ? "Waiting" : "To act";

if (
    st &&
    st.phase === "playing" &&
    isHiddenMilitaryAction(p.lastActionCode) &&
    me &&
    me.id !== p.id
) {
    return "Military";
}

return p.lastAction;
}

function displayMessageForViewer(st) {
const me = myPlayer();

if (!st) return "";

const msg = String(st.message || "");
const meta = st.lastActionMeta || null;
const messageIsExactMilitary =
    msg.indexOf("Train") !== -1 ||
    msg.indexOf("Guard") !== -1 ||
    msg.indexOf("army") !== -1 ||
    msg.indexOf("shield") !== -1;

if (
    st.phase === "playing" &&
    meta &&
    isHiddenMilitaryAction(meta.action) &&
    messageIsExactMilitary &&
    me &&
    me.id !== meta.playerId
) {
    return meta.playerName + ": Military";
}

return msg;
}

function myPlayer() {
const st = window.tinyKingdomsState;
if (!st) return null;

return st.players.find(function (p) {
    return p.id === getMyId();
}) || null;
}

function currentPlayer() {
const st = window.tinyKingdomsState;
if (!st) return null;
return st.players[st.turnIndex] || null;
}

function isMyTurn() {
const p = currentPlayer();
return p && p.id === getMyId();
}

function nextTurnIndex(fromIndex) {
const st = window.tinyKingdomsState;
if (!st || !st.players.length) return 0;

for (let i = 1; i <= st.players.length; i++) {
    const idx = (fromIndex + i) % st.players.length;
    const p = st.players[idx];

    if (p && !p.acted) return idx;
}

return fromIndex;
}

function allPlayersActed(st) {
return st.players.every(function (p) {
    return p.acted;
});
}

function currentEventId(st) {
const ev = st && st.roundEvent ? st.roundEvent : roundEventFor(st ? st.round : 1);
return ev.id;
}

function wonderCost(st) {
return { food: 3, coins: 3, science: 2 };
}

function canBuildWonder(p) {
const st = window.tinyKingdomsState;
const cost = wonderCost(st);
return p && p.food >= cost.food && p.coins >= cost.coins && p.science >= cost.science;
}

function strongestOpponent(player) {
const st = window.tinyKingdomsState;
if (!st) return null;

return st.players
    .filter(function (p) {
        return p.id !== player.id;
    })
    .sort(function (a, b) {
        return b.score - a.score;
    })[0] || null;
}

function stealOneResource(fromPlayer, toPlayer) {
const order = [
    { key: "coins", label: "coin" },
    { key: "food", label: "food" },
    { key: "science", label: "study" }
];

for (let i = 0; i < order.length; i++) {
    const item = order[i];

    if (fromPlayer[item.key] > 0) {
        fromPlayer[item.key] -= 1;
        toPlayer[item.key] += 1;
        return item;
    }
}

return null;
}

function revealRaidArmies(st, attacker, target) {
st.armyRevealUntil = Date.now() + ARMY_REVEAL_MS;
st.armyRevealIds = [attacker.id, target.id];
}

function isArmyRevealed(playerId) {
const st = window.tinyKingdomsState;
if (!st || !st.armyRevealUntil || !Array.isArray(st.armyRevealIds)) return false;
if (Date.now() > st.armyRevealUntil) return false;
return st.armyRevealIds.indexOf(playerId) !== -1;
}

function shouldHideBattleStat(p) {
const st = window.tinyKingdomsState;
const me = myPlayer();

if (!st || !p || !me) return false;
if (st.phase === "scoring" || st.phase === "gameover") return false;
if (p.id === me.id) return false;
if (isArmyRevealed(p.id)) return false;

return true;
}

function triggerActionFlash(st, playerId, action, label, targetId) {
st.actionFlash = {
    playerId: playerId,
    targetId: targetId || "",
    action: action,
    label: label || "",
    until: Date.now() + ACTION_FLASH_MS
};

const resource = actionResource(action);

if (resource) {
    triggerResourceFlash(st, playerId, resource, label || "", action);
}
}

function actionResource(action) {
if (action === "farm") return "food";
if (action === "sell") return "coins";
if (action === "study") return "science";
if (action === "train") return "army";
if (action === "guard") return "shield";
if (action === "wonder") return "wonder";
if (action === "raid") return "army";
return "";
}

function actionFlashLabel(p, resourceName) {
const st = window.tinyKingdomsState;
if (!st || st.phase === "scoring") return "";

if ((resourceName === "army" || resourceName === "shield") && shouldHideBattleStat(p)) {
    return "";
}

const now = Date.now();
const flashes = Array.isArray(st.resourceFlashes) ? st.resourceFlashes : [];

const labels = flashes
    .filter(function (flash) {
        return flash.playerId === p.id && flash.resource === resourceName && flash.until > now;
    })
    .map(function (flash) {
        return flash.label;
    })
    .filter(Boolean);

return labels.join(" ");
}

function scoringFlashLabel(p, resourceName) {
const st = window.tinyKingdomsState;
if (!st || st.phase !== "scoring" || !st.activeScoring || !st.activeScoring.until) return "";
if (Date.now() > st.activeScoring.until) return "";
if (st.activeScoring.playerId !== p.id) return "";
if (st.activeScoring.resource !== resourceName) return "";
return "+" + Number(st.activeScoring.points || 0) + " PT";
}

function scheduleArmyRevealHide() {
clearTimeout(armyRevealTimer);

const st = window.tinyKingdomsState;
if (!st || !st.armyRevealUntil) return;

const wait = st.armyRevealUntil - Date.now();

if (wait <= 0) {
    st.armyRevealUntil = 0;
    st.armyRevealIds = [];
    return;
}

armyRevealTimer = setTimeout(function () {
    const current = window.tinyKingdomsState;
    if (!current || !current.armyRevealUntil) return;

    if (Date.now() >= current.armyRevealUntil) {
        current.armyRevealUntil = 0;
        current.armyRevealIds = [];
        renderTinyKingdomsNoBot();
        syncTinyKingdoms();
    }
}, wait + 50);
}

function scheduleActionFlashHide() {
clearTimeout(actionFlashTimer);

const st = window.tinyKingdomsState;
if (!st) return;

const now = Date.now();

if (Array.isArray(st.resourceFlashes)) {
    st.resourceFlashes = st.resourceFlashes.filter(function (flash) {
        return flash.until > now;
    });
} else {
    st.resourceFlashes = [];
}

if (!st.resourceFlashes.length) {
    st.actionFlash = null;
    return;
}

const nextUntil = Math.min.apply(null, st.resourceFlashes.map(function (flash) {
    return flash.until;
}));

const wait = nextUntil - now;

actionFlashTimer = setTimeout(function () {
    const current = window.tinyKingdomsState;
    if (!current) return;

    const currentNow = Date.now();

    current.resourceFlashes = (current.resourceFlashes || []).filter(function (flash) {
        return flash.until > currentNow;
    });

    if (!current.resourceFlashes.length) current.actionFlash = null;

    renderTinyKingdomsNoBot();
    syncTinyKingdoms();
}, Math.max(0, wait) + 50);
}

function bonusPointsFor(p, resource) {
if (resource === "food") return Math.floor(p.food / 2);
if (resource === "coins") return Math.floor(p.coins / 2);
if (resource === "science") return p.science * 1;
if (resource === "army") return p.army;
if (resource === "shield") return p.shield;
if (resource === "wonder") return p.wonder * 2;
if (resource === "secret") return secretGoalMet(p) ? SECRET_GOAL_POINTS : 0;
return 0;
}

function resourceDisplayName(resource) {
if (resource === "food") return "Food";
if (resource === "coins") return "Coins";
if (resource === "science") return "Study";
if (resource === "army") return "Army";
if (resource === "shield") return "Shield";
if (resource === "wonder") return "Wonder";
if (resource === "secret") return "Secret Goal";
return "Bonus";
}

function secretGoalById(id) {
return SECRET_GOALS.find(function (g) {
    return g.id === id;
}) || SECRET_GOALS[0];
}

function highestResourceValue(resource) {
const st = window.tinyKingdomsState;
if (!st || !st.players.length) return 0;

return Math.max.apply(null, st.players.map(function (p) {
    return Number(p[resource] || 0);
}));
}

function secretGoalMet(p) {
const st = window.tinyKingdomsState;
if (!st || !st.players || !st.players.length || !p) return false;

const goal = secretGoalById(p.secretGoal);
const value = Number(p[goal.resource] || 0);

if (value <= 0) return false;

return st.players.every(function (otherPlayer) {
    if (otherPlayer.id === p.id) return true;
    return value > Number(otherPlayer[goal.resource] || 0);
});
}

function secretGoalText(p, reveal) {
const goal = secretGoalById(p.secretGoal);
const me = myPlayer();
const canSee = reveal || (me && me.id === p.id);

if (!canSee) return "Secret Goal: ???";
return "Secret Goal: " + goal.title + " - " + goal.desc;
}

function mySecretGoalHtml(st) {
const me = myPlayer();
if (!st || !me || st.phase !== "playing") return "";
return '<div class="tk-my-secret">🎯 ' + escapeHtml(secretGoalText(me, true)) + '</div>';
}

function bottomInfoHtml(st) {
const me = myPlayer();

if (st && st.phase === "playing" && me) {
    return '<div class="tk-mini-log tk-secret-bottom">🎯 ' + escapeHtml(secretGoalText(me, true)) + '</div>';
}

return '<div class="tk-mini-log">' + escapeHtml(st.log[0] || "Tap one action.") + '</div>';
}

function buildScoringQueue(st) {
const resources = ["food", "coins", "science", "army", "shield", "wonder", "secret"];
const queue = [];

st.players.forEach(function (p) {
    resources.forEach(function (resource) {
        const points = bonusPointsFor(p, resource);

        if (points > 0) {
            queue.push({
                playerId: p.id,
                resource: resource,
                points: points
            });
        }
    });
});

return queue;
}

function finishGame(st) {
st.phase = "scoring";
st.armyRevealUntil = 0;
st.armyRevealIds = [];
st.actionFlash = null;
st.resourceFlashes = [];
st.finalMessage = "";
st.winners = [];
st.scoringQueue = buildScoringQueue(st);
st.scoringIndex = 0;
st.activeScoring = null;
st.roundIntroMode = "";

st.players.forEach(function (p) {
    p.endBonus = 0;
    p.secretBonus = 0;
    p.acted = true;
});

st.message = "Counting bonus points...";
addLog(st, "Counting bonus points");
startNextScoringStep(st);
}

function startNextScoringStep(st) {
if (!st || st.phase !== "scoring") return;

if (!Array.isArray(st.scoringQueue)) st.scoringQueue = [];
if (typeof st.scoringIndex !== "number") st.scoringIndex = 0;

if (st.scoringIndex >= st.scoringQueue.length) {
    completeScoring(st);
    return;
}

const step = st.scoringQueue[st.scoringIndex];
st.scoringIndex += 1;

const p = st.players.find(function (player) {
    return player.id === step.playerId;
});

if (!p) {
    startNextScoringStep(st);
    return;
}

const points = Number(step.points || 0);
p.score += points;
p.endBonus += points;
if (step.resource === "secret") p.secretBonus += points;

st.activeScoring = {
    playerId: p.id,
    resource: step.resource,
    points: points,
    until: Date.now() + BONUS_STEP_MS
};

st.message = p.name + ": " + resourceDisplayName(step.resource) + " +" + points;
addLog(st, p.name + " bonus +" + points);
}

function completeScoring(st) {
st.phase = "gameover";
st.activeScoring = null;
st.scoringQueue = [];
st.scoringIndex = 0;

const bestScore = Math.max.apply(null, st.players.map(function (p) {
    return p.score;
}));

const winners = st.players.filter(function (p) {
    return p.score === bestScore;
});

st.winners = winners.map(function (p) {
    return p.id;
});

st.finalMessage = winners.map(function (p) {
    return p.name;
}).join(" & ") + " win: " + bestScore;

st.message = st.finalMessage;
addLog(st, st.finalMessage);
}

function scheduleBonusScoring() {
clearTimeout(bonusStepTimer);

const st = window.tinyKingdomsState;
if (!st || st.phase !== "scoring" || !st.activeScoring || !st.activeScoring.until) return;

const wait = st.activeScoring.until - Date.now();

if (wait <= 0) {
    if (isTinyKingdomsHost()) {
        startNextScoringStep(st);
        renderTinyKingdomsNoBot();
        syncTinyKingdoms();
    }
    return;
}

bonusStepTimer = setTimeout(function () {
    const current = window.tinyKingdomsState;
    if (!current || current.phase !== "scoring") return;

    if (Date.now() >= current.activeScoring.until && isTinyKingdomsHost()) {
        startNextScoringStep(current);
        renderTinyKingdomsNoBot();
        syncTinyKingdoms();
    } else {
        renderTinyKingdomsNoBot();
    }
}, wait + 50);
}

function applyAction(st, p, action) {
let text = "";
let ok = true;

clearResourceFlashes(st);

if (action === "farm") {
    const gain = 3;
    p.food += gain;
    p.score += 1;
    text = "Farm +" + gain + " food";
    p.lastAction = "🍞 Farm +" + gain;
    triggerActionFlash(st, p.id, action, "+" + gain, "");
}

if (action === "sell") {
    const gain = 3;
    p.coins += gain;
    p.score += 1;
    text = "Sell +" + gain + " coins";
    p.lastAction = "🪙 Sell +" + gain;
    triggerActionFlash(st, p.id, action, "+" + gain, "");
}

if (action === "study") {
    const gain = 2;
    p.science += gain;
    p.score += 1;
    text = "Study +" + gain;
    p.lastAction = "📚 Study +" + gain;
    triggerActionFlash(st, p.id, action, "+" + gain, "");
}

if (action === "train") {
    const gain = 2;
    p.army += gain;
    p.score += 1;
    text = "Train +" + gain + " army";
    p.lastAction = "⚔️ Train +" + gain;
    triggerActionFlash(st, p.id, action, "+" + gain, "");
}

if (action === "guard") {
    const gain = 2;
    p.shield += gain;
    p.score += 1;
    text = "Guard +" + gain + " shield";
    p.lastAction = "🛡️ Guard +" + gain;
    triggerActionFlash(st, p.id, action, "+" + gain, "");
}

if (action === "wonder") {
    const cost = wonderCost(st);

    if (!canBuildWonder(p)) {
        st.message = "Need 🍞" + cost.food + " 🪙" + cost.coins + " 📚" + cost.science;
        return false;
    }

    p.food -= cost.food;
    p.coins -= cost.coins;
    p.science -= cost.science;
    p.wonder += 1;
    p.score += 6 + p.wonder;
    text = "Wonder +" + (6 + p.wonder);
    p.lastAction = "✨ Wonder +" + (6 + p.wonder);
    triggerResourceFlash(st, p.id, "food", "-" + cost.food, action);
    triggerResourceFlash(st, p.id, "coins", "-" + cost.coins, action);
    triggerResourceFlash(st, p.id, "science", "-" + cost.science, action);
    triggerResourceFlash(st, p.id, "wonder", "+1", action);
}

if (action === "raid") {
    const target = strongestOpponent(p);

    if (!target) {
        st.message = "No kingdom to raid.";
        return false;
    }

    revealRaidArmies(st, p, target);

    const effectiveDefense = target.army + target.shield * 0.5;
    const margin = p.army - effectiveDefense;
    const successChance = Math.max(0.05, Math.min(0.92, 0.5 + margin * 0.1));
    const succeeded = Math.random() < successChance;

    if (succeeded) {
        const shielded = target.shield > 0;
        const stealCount = shielded ? 1 : 2;
        const scoreGain = 1;
        const stolen = [];

        if (shielded) {
            target.shield -= 1;
            triggerResourceFlash(st, target.id, "shield", "-1", action);
        }

        for (let i = 0; i < stealCount; i++) {
            const item = stealOneResource(target, p);

            if (item) {
                stolen.push(item.label);
                triggerResourceFlash(st, p.id, item.key, "+1", action);
                triggerResourceFlash(st, target.id, item.key, "-1", action);
            }
        }

        p.score += scoreGain;
        triggerResourceFlash(st, p.id, "army", "Raid +" + scoreGain, action);

        if (shielded) {
            text = "Raid broke shield, stole " + (stolen.length ? stolen.join(" + ") : "nothing") + ", +" + scoreGain;
            p.lastAction = "🔥 Shield raid +" + scoreGain;
        } else {
            text = "Raid stole " + (stolen.length ? stolen.join(" + ") : "nothing") + ", +" + scoreGain;
            p.lastAction = "🔥 Raid +" + scoreGain;
        }
    } else {
        text = "Raid failed";
        p.lastAction = "🔥 Raid failed";
        triggerResourceFlash(st, p.id, "army", "Fail", action);
    }
}

if (!text) ok = false;
if (!ok) return false;

p.acted = true;
p.lastActionCode = action;

st.lastActionMeta = {
    playerId: p.id,
    playerName: p.name,
    action: action
};

st.message = p.name + ": " + text;
addLog(st, p.name + ": " + p.lastAction);

return true;
}

function advanceAfterAction(st) {
if (allPlayersActed(st)) {
    if (st.round >= st.maxRounds) {
        finishGame(st);
        return;
    }

    st.round += 1;
    st.roundEvent = st.roundEvents && st.roundEvents[st.round - 1] ? st.roundEvents[st.round - 1] : roundEventFor(st.round);
    st.eventAppliedRound = 0;
    st.lastActionMeta = null;
    clearResourceFlashes(st);

    st.players.forEach(function (p) {
        p.acted = false;
    });

    st.turnIndex = (st.round - 1) % st.players.length;
    startRoundIntro(st);
    return;
}

st.turnIndex = nextTurnIndex(st.turnIndex);
}

window.tinyKingdomsAction = function (action) {
const st = window.tinyKingdomsState;
const p = myPlayer();

if (!st || !p || st.phase !== "playing") return;
if (st.roundIntroMode) return;
if (!isMyTurn()) return;
if (p.acted) return;

const ok = applyAction(st, p, action);

if (!ok) {
    renderTinyKingdoms();
    return;
}

advanceAfterAction(st);
renderTinyKingdoms();
syncTinyKingdoms();
maybeComputerAction();
};

function computerPickAction(p) {
const opponent = strongestOpponent(p);

if (canBuildWonder(p) && Math.random() < 0.55) return "wonder";
if (opponent && p.army > opponent.army && Math.random() < 0.38) return "raid";
if (opponent && opponent.army >= p.army && p.shield < 2 && Math.random() < 0.33) return "guard";
if (p.food < 2) return "farm";
if (p.coins < 2) return "sell";
if (p.science < 1) return "study";
if (opponent && p.army <= opponent.army && Math.random() < 0.34) return "train";

const choices = ["farm", "sell", "study", "train", "guard", "raid"];
return choices[Math.floor(Math.random() * choices.length)];
}

function computerAction() {
const st = window.tinyKingdomsState;
const p = currentPlayer();

if (!st || st.phase !== "playing" || st.roundIntroMode || !p || !p.isComputer || p.acted) return;

const action = computerPickAction(p);
const ok = applyAction(st, p, action);

if (ok) {
    advanceAfterAction(st);
}

renderTinyKingdoms();
syncTinyKingdoms();
maybeComputerAction();
}

function maybeComputerAction() {
clearTimeout(botTimer);

const st = window.tinyKingdomsState;
if (!st || st.phase !== "playing") return;

if (st.roundIntroMode) {
    scheduleRoundIntro();
    return;
}

const p = currentPlayer();
if (!p || !p.isComputer) return;

st.message = "Computer thinking...";
renderTinyKingdomsNoBot();

botTimer = setTimeout(computerAction, BOT_DELAY);
}

function resourceTile(icon, label, value, hidden, flashLabel, bonusLabel, extraClass) {
const amount = Number(value || 0);
const hasValue = amount > 0 ? " has-value" : "";
const hiddenClass = hidden ? " army-hidden" : "";
const flashClass = flashLabel ? " action-flash" : "";
const bonusClass = bonusLabel ? " bonus-flash" : "";
const shownIcon = hidden ? "☁️" : icon;
const shownAmount = hidden ? "?" : amount;
const floatLabel = bonusLabel || flashLabel || "";

return (
    '<div class="tk-resource ' + (extraClass || "") + hasValue + hiddenClass + flashClass + bonusClass + '">' +
        '<div class="tk-resource-icon">' + shownIcon + '</div>' +
        '<div class="tk-resource-num">' + shownAmount + '</div>' +
        '<div class="tk-resource-label">' + label + '</div>' +
        (floatLabel ? '<div class="tk-float">' + escapeHtml(floatLabel) + '</div>' : '') +
    '</div>'
);
}

function playerCard(p, index) {
const st = window.tinyKingdomsState;
const turn = st.phase === "playing" && st.turnIndex === index && !st.roundIntroMode;
const winner = st.winners.indexOf(p.id) !== -1;
const hideBattle = shouldHideBattleStat(p);
const revealSecrets = st.phase === "gameover" || st.phase === "scoring";
const secretLabel = scoringFlashLabel(p, "secret");

return (
    '<div class="tk-player-card ' + (turn ? "turn " : "") + (winner ? "winner " : "") + '">' +
        '<div class="tk-player-header">' +
            '<div class="tk-player-name">' + escapeHtml(p.name) + '</div>' +
            '<div class="tk-last">' + escapeHtml(displayLastActionForViewer(p)) + '</div>' +
            '<div class="tk-score">' + Number(p.score || 0) + '</div>' +
        '</div>' +
        '<div class="tk-resource-grid">' +
            resourceTile("🍞", "Food", p.food, false, actionFlashLabel(p, "food"), scoringFlashLabel(p, "food"), "") +
            resourceTile("🪙", "Coins", p.coins, false, actionFlashLabel(p, "coins"), scoringFlashLabel(p, "coins"), "") +
            resourceTile("📚", "Study", p.science, false, actionFlashLabel(p, "science"), scoringFlashLabel(p, "science"), "") +
            resourceTile("⚔️", "Army", p.army, hideBattle, actionFlashLabel(p, "army"), scoringFlashLabel(p, "army"), "") +
            resourceTile("🛡️", "Shield", p.shield, hideBattle, actionFlashLabel(p, "shield"), scoringFlashLabel(p, "shield"), "") +
            resourceTile("✨", "Wonder", p.wonder, false, actionFlashLabel(p, "wonder"), scoringFlashLabel(p, "wonder"), "") +
        '</div>' +
        (revealSecrets ? '<div class="tk-secret ' + (secretLabel ? "bonus-flash" : "") + '">' + escapeHtml(secretGoalText(p, true)) +
            (secretLabel ? '<div class="tk-float secret-float">' + escapeHtml(secretLabel) + '</div>' : '') +
        '</div>' : '') +
        (st.phase === "scoring" || st.phase === "gameover" ? '<div class="tk-bonus">Bonus +' + Number(p.endBonus || 0) + '</div>' : '') +
    '</div>'
);
}

function actionButton(action, icon, title, sub, disabled, extraClass) {
return (
    '<button class="tk-action ' + (extraClass || "") + '" onclick="tinyKingdomsAction(&quot;' + action + '&quot;)" ' + (disabled ? "disabled" : "") + ' type="button">' +
        '<span>' + icon + '</span>' +
        '<b>' + title + '</b>' +
        '<small>' + sub + '</small>' +
    '</button>'
);
}

function setTinyKingdomsHelpMode(isOpen) {
window.__tinyKingdomsHelpOpen = isOpen;

document.querySelectorAll("button").forEach(function (btn) {
    const txt = (btn.textContent || "").trim();

    if (txt.indexOf("Hide Board") !== -1 || txt.indexOf("Show Board") !== -1) {
        if (isOpen) {
            btn.setAttribute("data-tk-help-hidden", "yes");
            btn.style.visibility = "hidden";
            btn.style.pointerEvents = "none";
        } else if (btn.getAttribute("data-tk-help-hidden") === "yes") {
            btn.removeAttribute("data-tk-help-hidden");
            btn.style.visibility = "";
            btn.style.pointerEvents = "";
        }
    }
});
}

window.openTinyKingdomsHelp = function () {
setTinyKingdomsHelpMode(true);
renderTinyKingdomsNoBot();
};

window.closeTinyKingdomsHelp = function () {
setTinyKingdomsHelpMode(false);
renderTinyKingdomsNoBot();
};

function helpOverlayHtml() {
if (!window.__tinyKingdomsHelpOpen) return "";

return (
    '<div class="tk-help-overlay">' +
        '<button class="tk-help-close-x" onclick="closeTinyKingdomsHelp()" type="button">✕</button>' +
        '<div class="tk-help-card">' +
            '<div class="tk-help-title">How to Play</div>' +
            '<p><b>Goal:</b> Earn the highest score at the end of 10 rounds.</p>' +
            '<p><b>Round Start:</b> The round number gets big first, then the round event gets big. After that, the event gives or takes resources from everyone before turns begin.</p>' +
            '<p><b>Round Events:</b> Every round has a random event that affects everyone automatically. Good events add resources. Bad events remove resources, but nobody goes below zero.</p>' +

            '<h3 class="tk-help-section-title">1. Turn Actions</h3>' +
            '<div class="tk-help-row"><b>🍞 Farm:</b> Gain +3 food and +1 point.</div>' +
            '<div class="tk-help-row"><b>🪙 Sell:</b> Gain +3 coins and +1 point.</div>' +
            '<div class="tk-help-row"><b>📚 Study:</b> Gain +2 study and +1 point.</div>' +
            '<div class="tk-help-row"><b>⚔️ Train:</b> Gain +2 army and +1 point. Opponents cannot see your army unless a raid reveals it.</div>' +
            '<div class="tk-help-row"><b>🛡️ Guard:</b> Gain +2 shield and +1 point. Opponents cannot see your shield unless a raid reveals it.</div>' +
            '<div class="tk-help-row"><b>🔥 Raid:</b> The higher your army is above the current score leader\'s army (and their shield, which counts as partial defense), the better your odds of success - but it is never a guaranteed win or loss. If you succeed and they have no shield, you steal 2 resources and score +1. If they have shield, you break 1 shield, steal 1 resource, and score +1. If the raid fails, nothing happens.</div>' +
            '<div class="tk-help-row"><b>✨ Wonder:</b> Costs 🍞3 food, 🪙3 coins, and 📚2 study. Your first Wonder scores 7, second scores 8, and so on.</div>' +

            '<h3 class="tk-help-section-title">2. Automatic Round Events</h3>' +
            '<div class="tk-help-row"><b>🌾 Good Harvest:</b> Everyone gains 1 food.</div>' +
            '<div class="tk-help-row"><b>🎁 Trade Gift:</b> Everyone gains 1 coin.</div>' +
            '<div class="tk-help-row"><b>📚 Library Day:</b> Everyone gains 1 study.</div>' +
            '<div class="tk-help-row"><b>⚔️ New Recruits:</b> Everyone gains 1 army.</div>' +
            '<div class="tk-help-row"><b>🛡️ Stone Delivery:</b> Everyone gains 1 shield.</div>' +
            '<div class="tk-help-row"><b>☀️ Drought:</b> Everyone loses 1 food.</div>' +
            '<div class="tk-help-row"><b>💸 Tax Day:</b> Everyone loses 1 coin.</div>' +
            '<div class="tk-help-row"><b>❄️ Snow Day:</b> Everyone loses 1 study.</div>' +
            '<div class="tk-help-row"><b>🪖 Desertion:</b> Everyone loses 1 army.</div>' +
            '<div class="tk-help-row"><b>🧱 Cracked Walls:</b> Everyone loses 1 shield.</div>' +

            '<h3 class="tk-help-section-title">3. Floating Results</h3>' +
            '<p>Resource boxes show what changed. Round events show +1 or -1 on every affected kingdom. Raids show exactly what was stolen from the target and what the attacker gained.</p>' +

            '<h3 class="tk-help-section-title">4. Secret Goals</h3>' +
            '<p>Each player has a secret end-game goal worth <b>+5 points</b>. You can see yours during the game. Everyone&apos;s goals reveal during scoring.</p>' +

            '<h3 class="tk-help-section-title">5. Ending Bonus Points</h3>' +
            '<div class="tk-help-row"><b>📚 Study:</b> Worth 1 point each.</div>' +
            '<div class="tk-help-row"><b>✨ Wonder:</b> Worth 2 points each.</div>' +
            '<div class="tk-help-row"><b>⚔️ Army:</b> Worth 1 point each.</div>' +
            '<div class="tk-help-row"><b>🛡️ Shield:</b> Worth 1 point each.</div>' +
            '<div class="tk-help-row"><b>🍞 Food & 🪙 Coins:</b> Every 2 leftover food or coins equals 1 point. Odd leftovers round down.</div>' +

            '<p style="margin-top:20px; font-size:13px; opacity:0.8; text-align:center;">Pinch the game screen to zoom. Drag to move around. Double tap to reset view.</p>' +
        '</div>' +
    '</div>'
);
}

function setupWholeGameZoom() {
const root = canvas();
if (!root) return;

function applyView() {
    const viewport = root.querySelector(".tk-zoom-viewport");
    const content = root.querySelector(".tk-zoom-content");

    if (!viewport || !content) return;

    const viewportW = viewport.clientWidth || 1;
    const viewportH = viewport.clientHeight || 1;
    const contentW = content.offsetWidth || viewportW;
    const contentH = content.offsetHeight || viewportH;

    const scaledW = contentW * zoomView.scale;
    const scaledH = contentH * zoomView.scale;

    if (zoomView.scale <= 1.01) {
        zoomView.scale = 1;
        zoomView.x = 0;
        zoomView.y = 0;
    } else {
        const minX = Math.min(0, viewportW - scaledW);
        const minY = Math.min(0, viewportH - scaledH);

        zoomView.x = Math.max(minX, Math.min(0, zoomView.x));
        zoomView.y = Math.max(minY, Math.min(0, zoomView.y));
    }

    content.style.transformOrigin = "top left";
    content.style.transform =
        "translate3d(" + zoomView.x + "px, " + zoomView.y + "px, 0) scale(" + zoomView.scale + ")";
}

applyView();

if (root.__tinyKingdomsWholeZoomWired) return;
root.__tinyKingdomsWholeZoomWired = true;

let lastPinchDistance = 0;
let startFingerX = 0;
let startFingerY = 0;
let startX = 0;
let startY = 0;
let moved = false;
let lastTap = 0;

function insideGame(e) {
    return e.target && e.target.closest && e.target.closest(".tk-zoom-viewport");
}

function touchDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function touchMidpoint(e) {
    const viewport = root.querySelector(".tk-zoom-viewport");
    if (!viewport) return { x: 0, y: 0 };

    const rect = viewport.getBoundingClientRect();

    return {
        x: ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left,
        y: ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top
    };
}

root.addEventListener("touchstart", function (e) {
    if (!insideGame(e)) return;

    moved = false;

    if (e.touches.length === 2) {
        e.preventDefault();
        lastPinchDistance = touchDistance(e.touches[0], e.touches[1]);
        return;
    }

    if (e.touches.length === 1) {
        startFingerX = e.touches[0].clientX;
        startFingerY = e.touches[0].clientY;
        startX = zoomView.x;
        startY = zoomView.y;
    }
}, { passive: false });

root.addEventListener("touchmove", function (e) {
    if (!insideGame(e)) return;

    if (e.touches.length === 2) {
        e.preventDefault();
        moved = true;

        const newDistance = touchDistance(e.touches[0], e.touches[1]);

        if (!lastPinchDistance) {
            lastPinchDistance = newDistance;
            return;
        }

        const mid = touchMidpoint(e);

        const contentPointX = (mid.x - zoomView.x) / zoomView.scale;
        const contentPointY = (mid.y - zoomView.y) / zoomView.scale;

        let nextScale = zoomView.scale * (newDistance / lastPinchDistance);
        nextScale = Math.max(1, Math.min(2.8, nextScale));

        zoomView.scale = nextScale;
        zoomView.x = mid.x - contentPointX * zoomView.scale;
        zoomView.y = mid.y - contentPointY * zoomView.scale;

        lastPinchDistance = newDistance;

        applyView();
        return;
    }

    if (e.touches.length === 1 && zoomView.scale > 1.01) {
        e.preventDefault();

        const dx = e.touches[0].clientX - startFingerX;
        const dy = e.touches[0].clientY - startFingerY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            moved = true;
        }

        zoomView.x = startX + dx;
        zoomView.y = startY + dy;

        applyView();
    }
}, { passive: false });

root.addEventListener("touchend", function (e) {
    if (!insideGame(e)) return;

    if (e.touches.length === 1) {
        startFingerX = e.touches[0].clientX;
        startFingerY = e.touches[0].clientY;
        startX = zoomView.x;
        startY = zoomView.y;
        lastPinchDistance = 0;
        return;
    }

    if (e.touches.length === 0) {
        lastPinchDistance = 0;

        const now = Date.now();

        if (!moved && now - lastTap < 300) {
            resetZoom();
            applyView();
        }

        if (!moved) {
            lastTap = now;
        }
    }
}, { passive: false });
}

function renderTinyKingdomsNoBot() {
renderTinyKingdoms(true);
}

function roundEventHtml(st) {
const ev = st.roundEvent || roundEventFor(st.round);
const roundNum = Number(st.round || 1);

return (
    '<div class="tk-event">' +
        '<div class="tk-event-round">' +
            '<span>ROUND</span>' +
            '<b>' + roundNum + '</b>' +
        '</div>' +
        '<div class="tk-event-info">' +
            '<div class="tk-event-label">ROUND EVENT</div>' +
            '<div class="tk-event-title">' + escapeHtml(ev.icon + ' ' + ev.title) + '</div>' +
            '<div class="tk-event-desc">' + escapeHtml(ev.desc) + '</div>' +
        '</div>' +
    '</div>'
);
}

function renderTinyKingdoms(skipBotCheck) {
const el = canvas();
const st = window.tinyKingdomsState;

if (!el || !st) return;
if (!st.roundEvent) st.roundEvent = roundEventFor(st.round || 1);

const me = myPlayer();
const canAct = st.phase === "playing" && !st.roundIntroMode && isMyTurn() && me && !me.acted && !me.isComputer;
const buildDisabled = !canAct || !canBuildWonder(me);

const displayPlayers = st.players.map(function (p, index) {
    return { p: p, index: index };
}).sort(function (a, b) {
    if (me && a.p.id === me.id && b.p.id !== me.id) return 1;
    if (me && b.p.id === me.id && a.p.id !== me.id) return -1;
    return a.index - b.index;
});

const playersHtml = displayPlayers.map(function (item) {
    return playerCard(item.p, item.index);
}).join("");

let actionsHtml = "";

if (st.phase === "playing") {
    const cost = wonderCost(st);

    actionsHtml = (
        '<div class="tk-actions ' + (canAct ? "my-turn" : "") + (st.roundIntroMode ? " tk-round-locked" : "") + '">' +
            actionButton("farm", "🍞", "Farm", "+3 food", !canAct, "pos-farm") +
            actionButton("sell", "🪙", "Sell", "+3 coins", !canAct, "pos-sell") +
            actionButton("study", "📚", "Study", "+2 study", !canAct, "pos-study") +
            actionButton("wonder", "✨", "Wonder", "cost " + cost.food + "/" + cost.coins + "/" + cost.science, buildDisabled, "gold pos-wonder") +
            actionButton("guard", "🛡️", "Guard", "+2 shield", !canAct, "pos-guard") +
            actionButton("train", "⚔️", "Train", "+2 army", !canAct, "pos-train") +
            actionButton("raid", "🔥", "Raid", "odds-based", !canAct, "red pos-raid") +
            '<button class="tk-action help pos-help" onclick="openTinyKingdomsHelp()" type="button"><span>?</span><b>Help</b><small>rules</small></button>' +
        '</div>'
    );
} else if (st.phase === "scoring") {
    actionsHtml = '<div class="tk-actions tk-scoring-actions"><button class="tk-new" disabled type="button">Scoring...</button></div>';
} else {
    actionsHtml = '<div class="tk-actions"><button class="tk-new" onclick="resetTinyKingdomsGame()" type="button">New Kingdom</button></div>';
}

const messageText = displayMessageForViewer(st);

el.innerHTML = [
    '<style>',
        '.tk-wrap{position:relative;width:100%;height:100%;overflow:hidden;box-sizing:border-box;color:#e2f0d9;font-family:Arial,sans-serif;text-align:center;background:linear-gradient(180deg,#092a12,#031906);}',
        '.tk-zoom-viewport{width:100%;height:100%;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;touch-action:pan-y;box-sizing:border-box;padding:8px 8px 116px;}',
        '.tk-zoom-content{width:100%;max-width:760px;margin:0 auto;transform-origin:top left;will-change:transform;}',
        '.tk-event{position:relative;display:grid;grid-template-columns:34% 66%;align-items:center;background:linear-gradient(180deg,#fff5b8,#ffd700);color:#1e4620;border:3px solid #ffffff;border-radius:16px;padding:5px 10px;margin:0 auto 8px;box-shadow:0 0 0 2px #ffd700,0 4px 10px rgba(0,0,0,.34);line-height:1.05;min-height:52px;}',
        '.tk-event-round{border-right:2px solid rgba(30,70,32,.28);height:100%;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:0;padding-left:22px;padding-right:48px;box-sizing:border-box;}',
        '.tk-event-round span{font-size:15px;font-weight:900;letter-spacing:2px;line-height:1;}',
        '.tk-event-round b{font-size:38px;font-weight:900;line-height:.82;margin-top:1px;}',
        '.tk-event-info{padding-left:10px;text-align:center;}',
        '.tk-event-label{display:inline-block;background:#1e4620;color:#ffd700;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:900;letter-spacing:.5px;margin-bottom:4px;}',
        '.tk-event-title{font-size:21px;font-weight:900;color:#1e4620;}',
        '.tk-event-desc{font-size:13px;font-weight:900;color:#1e4620;margin-top:4px;}',
        '.tk-message{margin:0 auto 6px;color:#ffd700;font-size:19px;font-weight:900;line-height:1.15;min-height:22px;}',
        '.tk-board{display:grid;grid-template-columns:1fr;gap:12px;margin:0 auto;}',
        '.tk-player-card{background:#e2f0d9;color:#1e4620;border:3px solid transparent;border-radius:14px;padding:8px;box-sizing:border-box;box-shadow:0 3px 8px rgba(0,0,0,.35);}',
        '.tk-player-card.turn{border-color:transparent;box-shadow:0 3px 8px rgba(0,0,0,.35);}',
        '.tk-player-card.winner{border-color:#ffd700;box-shadow:0 0 0 2px #ffd700,0 3px 8px rgba(0,0,0,.35);}',
        '.tk-player-header{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px;}',
        '.tk-player-name{font-size:18px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;flex:1;}',
        '.tk-player-card.turn .tk-player-name{color:#ff0000;font-size:21px;}',
        '.tk-last{font-size:12px;font-weight:900;color:#7a1b1b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;flex:1;}',
        '.tk-score{background:#1e4620;color:#ffd700;border-radius:999px;min-width:36px;padding:4px 6px;font-size:18px;font-weight:900;flex-shrink:0;}',
        '.tk-resource-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;}',
        '.tk-resource{position:relative;background:#ffffff;border:2px solid #cfe4c3;border-radius:10px;padding:4px 2px;box-sizing:border-box;min-width:0;box-shadow:inset 0 2px 4px rgba(0,0,0,.12);overflow:visible;}',
        '.tk-resource.has-value{border-color:#ffd700;}',
        '.tk-resource.army-hidden{background:linear-gradient(180deg,#ffffff,#e9f4ff);border-color:#dbe9ff;box-shadow:inset 0 2px 4px rgba(0,0,0,.12),0 0 10px rgba(255,255,255,.55);}',
        '.tk-resource.army-hidden .tk-resource-icon{filter:drop-shadow(0 1px 2px rgba(0,0,0,.18));}',
        '.tk-resource.army-hidden .tk-resource-num{color:#1e4620;font-size:22px;}',
        '.tk-resource.action-flash{animation:tkPulseBox 1.5s ease-out;z-index:2;}',
        '.tk-resource.bonus-flash,.tk-secret.bonus-flash{animation:tkBonusBox 2s ease-out;z-index:3;border-color:#ffd700;}',
        '.tk-resource.action-flash .tk-resource-icon,.tk-resource.bonus-flash .tk-resource-icon{animation:tkIconPop 1.5s ease-out;}',
        '.tk-resource.bonus-flash .tk-resource-num{animation:tkNumberPop 2s ease-out;}',
        '.tk-float{position:absolute;left:50%;top:-10px;transform:translateX(-50%);background:#ffd700;color:#1e4620;border:2px solid #ffffff;border-radius:999px;padding:2px 7px;font-size:13px;font-weight:900;line-height:1;box-shadow:0 2px 8px rgba(0,0,0,.35);animation:tkFloatUp 1.5s ease-out forwards;pointer-events:none;white-space:nowrap;}',
        '.tk-resource.bonus-flash .tk-float,.tk-secret.bonus-flash .tk-float{animation:tkFloatUpBonus 2s ease-out forwards;}',
        '@keyframes tkPulseBox{0%{transform:scale(1);box-shadow:inset 0 2px 4px rgba(0,0,0,.12),0 0 0 rgba(255,215,0,0);}25%{transform:scale(1.08);box-shadow:inset 0 2px 4px rgba(0,0,0,.12),0 0 16px rgba(255,215,0,.95);}100%{transform:scale(1);box-shadow:inset 0 2px 4px rgba(0,0,0,.12),0 0 0 rgba(255,215,0,0);}}',
        '@keyframes tkBonusBox{0%{transform:scale(1);box-shadow:inset 0 2px 4px rgba(0,0,0,.12),0 0 0 rgba(255,215,0,0);}20%{transform:scale(1.1);box-shadow:inset 0 2px 4px rgba(0,0,0,.12),0 0 20px rgba(255,215,0,1);}80%{transform:scale(1.04);box-shadow:inset 0 2px 4px rgba(0,0,0,.12),0 0 12px rgba(255,215,0,.65);}100%{transform:scale(1);box-shadow:inset 0 2px 4px rgba(0,0,0,.12),0 0 0 rgba(255,215,0,0);}}',
        '@keyframes tkIconPop{0%{transform:translateY(0);}25%{transform:translateY(-4px) scale(1.2);}100%{transform:translateY(0) scale(1);}}',
        '@keyframes tkNumberPop{0%{transform:scale(1);}20%{transform:scale(1.35);}100%{transform:scale(1);}}',
        '@keyframes tkFloatUp{0%{opacity:0;transform:translate(-50%,8px) scale(.8);}20%{opacity:1;}100%{opacity:0;transform:translate(-50%,-24px) scale(1.05);}}',
        '@keyframes tkFloatUpBonus{0%{opacity:0;transform:translate(-50%,8px) scale(.8);}20%{opacity:1;}70%{opacity:1;}100%{opacity:0;transform:translate(-50%,-28px) scale(1.08);}}',
        '.tk-resource-icon{font-size:18px;line-height:1;}',
        '.tk-resource-num{font-size:17px;font-weight:900;line-height:1.05;margin-top:2px;color:#1e4620;}',
        '.tk-resource-label{font-size:8px;font-weight:900;text-transform:uppercase;color:#366b3d;}',
        '.tk-secret{position:relative;background:#ffffff;border:2px solid #cfe4c3;border-radius:10px;margin-top:7px;padding:5px 7px;font-size:11px;font-weight:900;color:#1e4620;text-align:left;line-height:1.15;}',
        '.tk-secret .secret-float{top:-12px;}',
        '.tk-bonus{font-size:14px;font-weight:900;color:#1e4620;margin-top:8px;}',
        '.tk-actions{margin:8px auto 6px;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:54px 54px;gap:5px;border:3px solid transparent;border-radius:15px;padding:6px;box-sizing:border-box;align-items:stretch;}',
        '.tk-actions.my-turn{border-color:#ff0000;}',
        '.tk-action,.tk-new{border:none;border-radius:12px;background:#e2f0d9;color:#1e4620;font-weight:900;box-shadow:0 3px 6px rgba(0,0,0,.35);padding:4px 2px;min-height:0;width:100%;height:100%;}',
        '.tk-action.pos-farm{grid-column:1;grid-row:1;}',
        '.tk-action.pos-sell{grid-column:2;grid-row:1;}',
        '.tk-action.pos-study{grid-column:3;grid-row:1;}',
        '.tk-action.pos-wonder{grid-column:4;grid-row:1;}',
        '.tk-action.pos-guard{grid-column:1;grid-row:2;}',
        '.tk-action.pos-train{grid-column:2;grid-row:2;}',
        '.tk-action.pos-raid{grid-column:3;grid-row:2;}',
        '.tk-action.pos-help{grid-column:4;grid-row:2;}',
        '.tk-action span{display:block;font-size:20px;line-height:1;}',
        '.tk-action b{display:block;font-size:12px;margin-top:1px;}',
        '.tk-action small{display:block;font-size:9px;line-height:1.05;color:#3c6f41;}',
        '.tk-action.gold{background:#ffd700;}',
        '.tk-action.red{background:#ffc9c9;color:#7a1010;}',
        '.tk-action.blue{background:#cfe4ff;color:#103b6f;}',
        '.tk-action.help{background:#0d47a1;color:#ffffff;}',
        '.tk-action.help small{color:#d9ecff;}',
        '.tk-action:disabled,.tk-new:disabled{background:#777!important;color:#222!important;box-shadow:none!important;opacity:.55;}',
        '.tk-action.help:disabled{background:#0d47a1!important;color:#ffffff!important;opacity:1!important;}',
        '.tk-actions.tk-round-locked{border-color:#777!important;}',
        '.tk-actions.tk-round-locked .tk-action:not(.help){background:#777!important;color:#222!important;box-shadow:none!important;opacity:.55!important;}',
        '.tk-new{grid-column:1 / -1;background:#ffd700;font-size:20px;min-height:52px;}',
        '.tk-secret-bottom{background:#ffffff;color:#1e4620;border:2px solid #ffd700;border-radius:14px;box-shadow:0 2px 7px rgba(0,0,0,.28);margin-top:10px;}',
        '.tk-help-overlay{position:fixed;inset:0;background:#e2f0d9!important;z-index:2147483000!important;overflow-y:auto;-webkit-overflow-scrolling:touch;color:#1e4620!important;text-shadow:none!important;filter:none!important;opacity:1!important;}',
        '.tk-help-close-x{position:fixed;bottom:20px;right:16px;border:none;background:#b00020!important;color:#ffffff!important;font-size:22px;font-weight:900;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,.3);z-index:2147483001!important;text-shadow:none!important;filter:none!important;opacity:1!important;}',
        '.tk-help-card{max-width:640px;margin:0 auto;width:100%;min-height:100%;text-align:left;padding:40px 20px 90px;box-sizing:border-box;color:#1e4620!important;font-size:16px;line-height:1.4;text-shadow:none!important;filter:none!important;opacity:1!important;background:#e2f0d9!important;}',
        '.tk-help-card *{color:#1e4620!important;text-shadow:none!important;filter:none!important;opacity:1!important;}',
        '.tk-help-card b{color:#1e4620!important;font-weight:900!important;}',
        '.tk-help-title{text-align:center;color:#1e4620!important;font-size:28px;font-weight:900;margin-bottom:12px;}',
        '.tk-help-section-title{font-size:18px;font-weight:900;color:#092a12!important;margin:20px 0 8px;border-bottom:2px solid #1e4620;padding-bottom:4px;}',
        '.tk-help-card p{margin:8px 0;color:#1e4620!important;}',
        '.tk-help-row{background:#ffffff!important;color:#1e4620!important;border-radius:12px;padding:10px;margin:10px 0;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.1);text-shadow:none!important;filter:none!important;opacity:1!important;}',
        '.tk-round-intro-overlay{position:absolute;inset:0;z-index:50000;display:flex;align-items:center;justify-content:center;text-align:center;pointer-events:none;background:rgba(3,25,6,.72);animation:tkRoundIntroPop .25s ease-out;}',
        '.tk-round-intro-box{background:linear-gradient(180deg,#fff5b8,#ffd700);color:#1e4620;border:4px solid #ffffff;border-radius:24px;padding:22px 18px;box-shadow:0 8px 30px rgba(0,0,0,.65);max-width:92%;box-sizing:border-box;}',
        '.tk-round-intro-label{font-size:28px;font-weight:900;letter-spacing:3px;line-height:1;}',
        '.tk-round-intro-number{font-size:112px;font-weight:900;line-height:.9;font-family:Impact,Arial Black,sans-serif;}',
        '.tk-round-intro-event-icon{font-size:62px;line-height:1;margin-bottom:4px;}',
        '.tk-round-intro-event-title{font-size:34px;font-weight:900;line-height:1.05;}',
        '.tk-round-intro-event-desc{font-size:18px;font-weight:900;line-height:1.2;margin-top:8px;}',
        '@keyframes tkRoundIntroPop{from{opacity:0;transform:scale(.96);}to{opacity:1;transform:scale(1);}}',
        '@media(max-width:430px){.tk-zoom-viewport{padding:6px 6px 126px;}.tk-event{grid-template-columns:33% 67%;padding:4px 7px;margin-bottom:5px;border-width:3px;min-height:46px;}.tk-event-round{align-items:flex-start;padding-left:14px;padding-right:38px;}.tk-event-round span{font-size:12px;letter-spacing:1.5px;}.tk-event-round b{font-size:30px;line-height:.82;}.tk-event-info{padding-left:7px;}.tk-event-label{font-size:9px;padding:2px 7px;margin-bottom:3px;}.tk-event-title{font-size:17px;}.tk-event-desc{font-size:11px;}.tk-message{font-size:15px;margin-bottom:5px;min-height:18px;}.tk-board{gap:6px;}.tk-player-card{padding:6px;border-radius:12px;}.tk-player-name{font-size:16px;}.tk-player-card.turn .tk-player-name{font-size:18px;}.tk-last{font-size:11px;}.tk-score{font-size:16px;min-width:32px;padding:4px 5px;}.tk-resource-grid{gap:4px;}.tk-resource{padding:4px 1px;border-radius:8px;border-width:2px;}.tk-resource-icon{font-size:16px;}.tk-resource-num{font-size:15px;}.tk-resource-label{font-size:7px;}.tk-resource.army-hidden .tk-resource-num{font-size:18px;}.tk-secret{font-size:10px;padding:4px 6px;margin-top:5px;}.tk-float{font-size:11px;padding:2px 6px;top:-9px;}.tk-actions{grid-template-columns:repeat(4,1fr);grid-template-rows:50px 50px;gap:4px;margin-top:6px;padding:4px;border-radius:13px;}.tk-action{padding:4px 1px;}.tk-action span{font-size:18px;}.tk-action b{font-size:11px;}.tk-action small{font-size:10px;}.tk-mini-log{font-size:11px;padding:5px;}.tk-secret-bottom{margin-top:8px;}.tk-help-card{font-size:14px;padding:35px 14px 90px;}.tk-help-title{font-size:22px;}.tk-help-section-title{font-size:16px;}.tk-round-intro-box{padding:18px 14px;border-radius:20px;}.tk-round-intro-label{font-size:23px;}.tk-round-intro-number{font-size:92px;}.tk-round-intro-event-icon{font-size:50px;}.tk-round-intro-event-title{font-size:27px;}.tk-round-intro-event-desc{font-size:15px;}}',
    '</style>',

    '<div class="tk-wrap">',
        '<div class="tk-zoom-viewport">',
            '<div class="tk-zoom-content">',
                roundEventHtml(st),
                '<div class="tk-message">' + escapeHtml(messageText) + '</div>',
                '<div class="tk-board">' + playersHtml + '</div>',
                bottomInfoHtml(st),
                actionsHtml,
            '</div>',
        '</div>',
        roundIntroOverlayHtml(st),
    '</div>',

    helpOverlayHtml()
].join("");

setupWholeGameZoom();
scheduleArmyRevealHide();
scheduleActionFlashHide();
scheduleBonusScoring();

if (st.roundIntroMode) {
    scheduleRoundIntro();
} else if (!skipBotCheck) {
    maybeComputerAction();
}
}

function roundIntroOverlayHtml(st) {
if (!st || (st.roundIntroMode !== "number" && st.roundIntroMode !== "event")) return "";

if (st.roundIntroMode === "number") {
    return (
        '<div class="tk-round-intro-overlay">' +
            '<div class="tk-round-intro-box">' +
                '<div class="tk-round-intro-label">ROUND</div>' +
                '<div class="tk-round-intro-number">' + Number(st.round || 1) + '</div>' +
            '</div>' +
        '</div>'
    );
}

const ev = st.roundEvent || roundEventFor(st.round);

return (
    '<div class="tk-round-intro-overlay">' +
        '<div class="tk-round-intro-box">' +
            '<div class="tk-round-intro-event-icon">' + escapeHtml(ev.icon) + '</div>' +
            '<div class="tk-round-intro-event-title">' + escapeHtml(ev.title) + '</div>' +
            '<div class="tk-round-intro-event-desc">' + escapeHtml(ev.desc) + '</div>' +
        '</div>' +
    '</div>'
);
}

window.resetTinyKingdomsGame = function () {
clearTimeout(botTimer);
clearTimeout(armyRevealTimer);
clearTimeout(actionFlashTimer);
clearTimeout(bonusStepTimer);
clearTimeout(roundIntroTimer);
resetZoom();
window.__tinyKingdomsHelpOpen = false;
window.tinyKingdomsState = createState();
renderTinyKingdoms();
syncTinyKingdoms();
maybeComputerAction();
};

window.handleIncomingTinyKingdomsSync = function (payload) {
if (!payload || !payload.state) return;

if (
    payload.roomGameId &&
    window.chaserGame &&
    window.chaserGame.activeGameId &&
    payload.roomGameId !== window.chaserGame.activeGameId
) {
    return;
}

window.tinyKingdomsState = payload.state;

if (window.chaserGame) {
    window.chaserGame.activeGame = "TinyKingdoms";
}

renderTinyKingdoms();
maybeComputerAction();
};

window.initTinyKingdomsGame = function () {
window.chaserGame = window.chaserGame || {};
window.chaserGame.activeGame = "TinyKingdoms";

openStage();
setHeader();

const amHost = window.chaserGame && window.chaserGame.hostId === getMyId();

if (amHost || !window.tinyKingdomsState) {
    resetZoom();
    window.__tinyKingdomsHelpOpen = false;
    window.tinyKingdomsState = createState();
    syncTinyKingdoms();
}

renderTinyKingdoms();
maybeComputerAction();
};

window.startTinyKingdomsFromLobby = window.initTinyKingdomsGame;
window.startTinyKingdomsGame = window.initTinyKingdomsGame;
window.initTinyKingdoms = window.initTinyKingdomsGame;
window.renderTinyKingdoms = renderTinyKingdoms;

})();
