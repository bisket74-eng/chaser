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

let botTimer = null;
let armyRevealTimer = null;
let actionFlashTimer = null;
let bonusStepTimer = null;

const zoomView = {
scale: 1,
x: 0,
y: 0
};

const ROUND_EVENTS = [
{ id: "harvest", icon: "🌧️", title: "Rainy Season", desc: "Farm gives +4 food this round." },
{ id: "market", icon: "🏪", title: "Busy Market", desc: "Sell gives +4 coins this round." },
{ id: "scholar", icon: "📚", title: "Scholar Visit", desc: "Study gives +3 study this round." },
{ id: "training", icon: "⚔️", title: "War Drums", desc: "Train gives +3 army this round." },
{ id: "bandits", icon: "🔥", title: "Bandits Nearby", desc: "Successful raids score +4 this round." },
{ id: "builder", icon: "🏛️", title: "Builder Boom", desc: "Wonder costs 1 less coin this round." },
{ id: "fortify", icon: "🛡️", title: "Fortify Walls", desc: "Guard gives +3 shield this round." }
];

const NO_EVENT = { id: "calm", icon: "☁️", title: "Calm Round", desc: "No special bonus this round." };

function buildRoundEventSchedule() {
const middleSlots = ROUND_EVENTS.concat([NO_EVENT]);

for (let i = middleSlots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = middleSlots[i];
    middleSlots[i] = middleSlots[j];
    middleSlots[j] = temp;
}

const schedule = [NO_EVENT];
schedule.push.apply(schedule, middleSlots);
schedule.push(NO_EVENT);

return schedule;
}

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

function roundEventFor(round) {
const st = window.tinyKingdomsState;
const schedule = (st && Array.isArray(st.roundEventSchedule) && st.roundEventSchedule.length)
    ? st.roundEventSchedule
    : buildRoundEventSchedule();
const idx = Math.max(0, Math.min(schedule.length - 1, Number(round || 1) - 1));
return schedule[idx];
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
        lastAction: ""
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
        lastAction: ""
    });
}

return players;

}

function createState() {
const schedule = buildRoundEventSchedule();
return {
phase: "playing",
round: 1,
maxRounds: MAX_ROUNDS,
roundEventSchedule: schedule,
roundEvent: schedule[0],
players: makePlayers(),
turnIndex: 0,
message: "Build your tiny kingdom.",
log: [],
finalMessage: "",
winners: [],
armyRevealUntil: 0,
armyRevealIds: [],
actionFlash: null,
scoringQueue: [],
scoringIndex: 0,
activeScoring: null
};
}

function addLog(st, text) {
st.log.unshift(text);
st.log = st.log.slice(0, 4);
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
const coinCost = currentEventId(st) === "builder" ? 1 : 2;
return { food: 2, coins: coinCost, science: 1 };
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
        return (b.coins + b.food + b.science + b.score + b.army + b.shield) -
            (a.coins + a.food + a.science + a.score + a.army + a.shield);
    })[0] || null;

}

function stealOneResource(fromPlayer, toPlayer) {
if (fromPlayer.coins > 0) {
fromPlayer.coins -= 1;
toPlayer.coins += 1;
return "coin";
}

if (fromPlayer.food > 0) {
    fromPlayer.food -= 1;
    toPlayer.food += 1;
    return "food";
}

if (fromPlayer.science > 0) {
    fromPlayer.science -= 1;
    toPlayer.science += 1;
    return "study";
}

return "";

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
if (!st || st.phase === "scoring" || !st.actionFlash || !st.actionFlash.until) return "";
if (Date.now() > st.actionFlash.until) return "";

const flash = st.actionFlash;
const resource = actionResource(flash.action);
if (resource !== resourceName) return "";

if (flash.action === "raid") {
    if (p.id === flash.playerId) return flash.label || "Raid";
    if (p.id === flash.targetId) return "Raid";
    return "";
}

if (p.id !== flash.playerId) return "";
return flash.label || "";

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
if (!st || !st.actionFlash || !st.actionFlash.until) return;

const wait = st.actionFlash.until - Date.now();

if (wait <= 0) {
    st.actionFlash = null;
    return;
}

actionFlashTimer = setTimeout(function () {
    const current = window.tinyKingdomsState;
    if (!current || !current.actionFlash || !current.actionFlash.until) return;

    if (Date.now() >= current.actionFlash.until) {
        current.actionFlash = null;
        renderTinyKingdomsNoBot();
        syncTinyKingdoms();
    }
}, wait + 50);

}

function bonusPointsFor(p, resource) {
if (resource === "food") return Math.floor(p.food / 2);
if (resource === "coins") return Math.floor(p.coins / 2);
if (resource === "science") return p.science * 2;
if (resource === "army") return p.army;
if (resource === "shield") return p.shield;
if (resource === "wonder") return p.wonder * 3;
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
st.finalMessage = "";
st.winners = [];
st.scoringQueue = buildScoringQueue(st);
st.scoringIndex = 0;
st.activeScoring = null;

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
const eventId = currentEventId(st);

if (action === "farm") {
    const gain = eventId === "harvest" ? 4 : 3;
    p.food += gain;
    p.score += 1;
    text = "Farm +" + gain + " food";
    p.lastAction = "🍞 Farm +" + gain;
    triggerActionFlash(st, p.id, action, "+" + gain, "");
}

if (action === "sell") {
    const gain = eventId === "market" ? 4 : 3;
    p.coins += gain;
    p.score += 1;
    text = "Sell +" + gain + " coins";
    p.lastAction = "🪙 Sell +" + gain;
    triggerActionFlash(st, p.id, action, "+" + gain, "");
}

if (action === "study") {
    const gain = eventId === "scholar" ? 3 : 2;
    p.science += gain;
    p.score += 1;
    text = "Study +" + gain;
    p.lastAction = "📚 Study +" + gain;
    triggerActionFlash(st, p.id, action, "+" + gain, "");
}

if (action === "train") {
    const gain = eventId === "training" ? 3 : 2;
    p.army += gain;
    p.score += 1;
    text = "Train +" + gain + " army";
    p.lastAction = "⚔️ Train +" + gain;
    triggerActionFlash(st, p.id, action, "+" + gain, "");
}

if (action === "guard") {
    const gain = eventId === "fortify" ? 3 : 2;
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
    triggerActionFlash(st, p.id, action, "+" + (6 + p.wonder), "");
}

if (action === "raid") {
    const target = strongestOpponent(p);

    if (!target) {
        st.message = "No kingdom to raid.";
        return false;
    }

    revealRaidArmies(st, p, target);

    if (p.army >= target.army + 2) {
        if (target.shield > 0) {
            target.shield -= 1;
            p.score += 1;
            text = "Raid cracked shield +1";
            p.lastAction = "🔥 Shield cracked +1";
            triggerActionFlash(st, p.id, action, "+1", target.id);
        } else {
            stealOneResource(target, p);
            stealOneResource(target, p);
            const scoreGain = eventId === "bandits" ? 4 : 3;
            p.score += scoreGain;
            text = "Raid +" + scoreGain;
            p.lastAction = "🔥 Raid +" + scoreGain;
            triggerActionFlash(st, p.id, action, "+" + scoreGain, target.id);
        }
    } else {
        text = "Raid failed";
        p.lastAction = "🔥 Raid failed";
        triggerActionFlash(st, p.id, action, "Fail", target.id);
    }
}
p.acted = true;
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
    st.roundEvent = roundEventFor(st.round);

    st.players.forEach(function (p) {
        p.acted = false;
    });

    st.turnIndex = (st.round - 1) % st.players.length;
    st.message = "Round " + st.round + ": " + st.roundEvent.title;
    addLog(st, "Round " + st.round + ": " + st.roundEvent.title);
    return;
}

st.turnIndex = nextTurnIndex(st.turnIndex);

}

window.tinyKingdomsAction = function (action) {
const st = window.tinyKingdomsState;
const p = myPlayer();

if (!st || !p || st.phase !== "playing") return;
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
if (opponent && p.army > opponent.army + 1 && Math.random() < 0.42) return "raid";
if (opponent && opponent.army >= p.army && p.shield < 2 && Math.random() < 0.35) return "guard";
if (p.food < 2) return "farm";
if (p.coins < 2) return "sell";
if (p.science < 1) return "study";
if (opponent && p.army <= opponent.army && Math.random() < 0.36) return "train";

const choices = ["farm", "sell", "study", "train", "guard", "raid"];
return choices[Math.floor(Math.random() * choices.length)];

}

function computerAction() {
const st = window.tinyKingdomsState;
const p = currentPlayer();

if (!st || st.phase !== "playing" || !p || !p.isComputer || p.acted) return;

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
const turn = st.phase === "playing" && st.turnIndex === index;
const winner = st.winners.indexOf(p.id) !== -1;
const hideBattle = shouldHideBattleStat(p);
const revealSecrets = st.phase === "gameover" || st.phase === "scoring";
const secretLabel = scoringFlashLabel(p, "secret");

return (
    '<div class="tk-player-card ' + (turn ? "turn " : "") + (winner ? "winner " : "") + '">' +
        '<div class="tk-player-header">' +
            '<div class="tk-player-name">' + escapeHtml(p.name) + '</div>' +
            '<div class="tk-last">' + escapeHtml(p.lastAction || (p.acted ? "Waiting" : "To act")) + '</div>' +
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
            '<p><b>Players:</b> 1 player vs computer, or up to 4 players synced.</p>' +

            '<h3 class="tk-help-section-title">1. Turn Actions</h3>' +
            '<div class="tk-help-row"><b>🍞 Farm:</b> Gain +3 food and +1 point. Rainy Season makes it +4 food.</div>' +
            '<div class="tk-help-row"><b>🪙 Sell:</b> Gain +3 coins and +1 point. Busy Market makes it +4 coins.</div>' +
            '<div class="tk-help-row"><b>📚 Study:</b> Gain +2 study and +1 point. Scholar Visit makes it +3 study.</div>' +
            '<div class="tk-help-row"><b>⚔️ Train:</b> Gain +2 army and +1 point. War Drums makes it +3 army.</div>' +
            '<div class="tk-help-row"><b>🛡️ Guard:</b> Gain +2 shield and +1 point. Fortify Walls makes it +3 shield. Opponent shield is hidden like army.</div>' +
           '<div class="tk-help-row"><b>🔥 Raid:</b> Your army must be at least 2 higher than the strongest opponent to win. If they have shield, one shield breaks, you steal nothing, and score +1. If they have no shield, you steal 2 resources and score +3. Bandits Nearby makes a full unshielded raid worth +4. If raid fails, you get nothing.</div>' +
            '<div class="tk-help-row"><b>✨ Wonder:</b> Costs  🍞2 food 🪙2 coin 📚1 study. Builder Boom lowers the coin cost to 🪙1. Your first Wonder scores 7, second scores 8, and so on.</div>' +

            '<h3 class="tk-help-section-title">2. Round Events</h3>' +
            '<p>Each round has one event shown under the round box. Use it to decide which action is stronger that round.</p>' +
            '<div class="tk-help-row"><b>🌧️ Rainy Season:</b> Farm gives +4 food.</div>' +
            '<div class="tk-help-row"><b>🏪 Busy Market:</b> Sell gives +4 coins.</div>' +
            '<div class="tk-help-row"><b>📚 Scholar Visit:</b> Study gives +3 study.</div>' +
            '<div class="tk-help-row"><b>⚔️ War Drums:</b> Train gives +3 army.</div>' +
            '<div class="tk-help-row"><b>🔥 Bandits Nearby:</b> Full raid scores +4.</div>' +
            '<div class="tk-help-row"><b>🏛️ Builder Boom:</b> Wonder costs 1 less coin.</div>' +
           '<div class="tk-help-row"><b>🛡️ Fortify Walls:</b> Guard gives +3 shield.</div>' +

            '<h3 class="tk-help-section-title">3. Secret Goals</h3>' +
            '<p>Each player has a secret end-game goal worth <b>+5 points</b>. During the game, you can see yours, but opponents see question marks. At scoring time, everyone&apos;s goals reveal.</p>' +

            '<h3 class="tk-help-section-title">4. Ending Bonus Points</h3>' +
            '<div class="tk-help-row"><b>📚 Study:</b> Worth 2 points each.</div>' +
            '<div class="tk-help-row"><b>✨ Wonder:</b> Worth 3 points each.</div>' +
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
const canAct = st.phase === "playing" && isMyTurn() && me && !me.acted && !me.isComputer;
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
    '<div class="tk-actions ' + (canAct ? "my-turn" : "") + '">' +
        actionButton("farm", "🍞", "Farm", currentEventId(st) === "harvest" ? "+4 food" : "+3 food", !canAct, "pos-farm") +
        actionButton("sell", "🪙", "Sell", currentEventId(st) === "market" ? "+4 coins" : "+3 coins", !canAct, "pos-sell") +
        actionButton("study", "📚", "Study", currentEventId(st) === "scholar" ? "+3 study" : "+2 study", !canAct, "pos-study") +
        actionButton("wonder", "✨", "Wonder", "cost " + cost.food + "/" + cost.coins + "/" + cost.science, buildDisabled, "gold pos-wonder") +
        actionButton("guard", "🛡️", "Guard", currentEventId(st) === "fortify" ? "+3 shield" : "+2 shield", !canAct, "blue pos-guard") +
        actionButton("train", "⚔️", "Train", currentEventId(st) === "training" ? "+3 army" : "+2 army", !canAct, "pos-train") +
        actionButton("raid", "🔥", "Raid", currentEventId(st) === "bandits" ? "raid +4" : "army test", !canAct, "red pos-raid") +
        '<button class="tk-action help pos-help" onclick="openTinyKingdomsHelp()" type="button"><span>?</span><b>Help</b><small>rules</small></button>' +
    '</div>'

    );
} else if (st.phase === "scoring") {
    actionsHtml = '<div class="tk-actions tk-scoring-actions"><button class="tk-new" disabled type="button">Scoring...</button></div>';
} else {
    actionsHtml = '<div class="tk-actions"><button class="tk-new" onclick="resetTinyKingdomsGame()" type="button">New Kingdom</button></div>';
}

const messageText = st.message || "";

el.innerHTML = [
    '<style>',
        '.tk-wrap{position:relative;width:100%;height:100%;overflow:hidden;box-sizing:border-box;color:#e2f0d9;font-family:Arial,sans-serif;text-align:center;background:linear-gradient(180deg,#092a12,#031906);}',
        '.tk-zoom-viewport{width:100%;height:100%;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;touch-action:pan-y;box-sizing:border-box;padding:8px 8px 116px;}',
        '.tk-zoom-content{width:100%;max-width:760px;margin:0 auto;transform-origin:top left;will-change:transform;}',
        '.tk-message{margin:0 auto 6px;color:#ffd700;font-size:19px;font-weight:900;line-height:1.15;min-height:22px;}',
    '</style>',
    '<div class="tk-wrap">',
        '<div class="tk-zoom-viewport">',
            '<div class="tk-zoom-content">',
              roundEventHtml(st),
                '<div class="tk-message">' + escapeHtml(messageText) + '</div>',
                '<div class="tk-board">' + playersHtml + '</div>',
                actionsHtml,
                bottomInfoHtml(st),
            '</div>',
        '</div>',
    '</div>',
    helpOverlayHtml()
].join("");

setupWholeGameZoom();
scheduleArmyRevealHide();
scheduleActionFlashHide();
scheduleBonusScoring();

if (!skipBotCheck) {
    maybeComputerAction();
}

}
/* === TINY KINGDOMS ONE-PASTE PATCH: HIDDEN MILITARY + ROUND HEADER FIX === */
;(function () {
    function tkIsHiddenMilitaryAction(action) {
        return action === "train" || action === "guard";
    }

    function tkDisplayLastActionForViewer(p) {
        const st = window.tinyKingdomsState;
        const me = myPlayer();

        if (!p || !p.lastAction) {
            return p && p.acted ? "Waiting" : "To act";
        }

        if (
            st &&
            st.phase === "playing" &&
            tkIsHiddenMilitaryAction(p.lastActionCode) &&
            me &&
            me.id !== p.id
        ) {
            return "Military";
        }

        return p.lastAction;
    }

    function tkDisplayMessageForViewer(st) {
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
            tkIsHiddenMilitaryAction(meta.action) &&
            messageIsExactMilitary &&
            me &&
            me.id !== meta.playerId
        ) {
            return meta.playerName + ": Military";
        }

        return msg;
    }

    const tkOriginalApplyAction = applyAction;

    applyAction = function (st, p, action) {
        const ok = tkOriginalApplyAction(st, p, action);

        if (ok && p && st) {
            p.lastActionCode = action;
            st.lastActionMeta = {
                playerId: p.id,
                playerName: p.name,
                action: action
            };
        }

        return ok;
    };

    actionFlashLabel = function (p, resourceName) {
        const st = window.tinyKingdomsState;
        if (!st || st.phase === "scoring" || !st.actionFlash || !st.actionFlash.until) return "";
        if (Date.now() > st.actionFlash.until) return "";

        const flash = st.actionFlash;
        const resource = actionResource(flash.action);
        if (resource !== resourceName) return "";

        const me = myPlayer();

        if (tkIsHiddenMilitaryAction(flash.action)) {
            if (!me || me.id !== flash.playerId) return "";
        }

        if (flash.action === "raid") {
            if (p.id === flash.playerId) return flash.label || "Raid";
            if (p.id === flash.targetId) return "Raid";
            return "";
        }

        if (p.id !== flash.playerId) return "";
        return flash.label || "";
    };

    roundEventHtml = function (st) {
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
    };

    const tkOriginalRenderTinyKingdoms = renderTinyKingdoms;

    renderTinyKingdoms = function (skipBotCheck) {
        tkOriginalRenderTinyKingdoms(skipBotCheck);
        tkPatchTinyKingdomsDom();
    };

    renderTinyKingdomsNoBot = function () {
        renderTinyKingdoms(true);
    };

    function tkPatchTinyKingdomsDom() {
        const root = canvas();
        const st = window.tinyKingdomsState;
        if (!root || !st) return;

        let patchStyle = root.querySelector("#tk-one-paste-patch-style");

        if (!patchStyle) {
            patchStyle = document.createElement("style");
            patchStyle.id = "tk-one-paste-patch-style";
            root.appendChild(patchStyle);
        }

        patchStyle.textContent =
            ".tk-event-round{border-right:2px solid rgba(30,70,32,.28)!important;height:100%!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:0!important;padding-left:22px!important;padding-right:48px!important;box-sizing:border-box!important;}" +
            ".tk-event-round span{font-size:15px!important;font-weight:900!important;letter-spacing:2px!important;line-height:1!important;}" +
            ".tk-event-round b{font-size:48px!important;font-weight:900!important;line-height:.82!important;margin-top:3px!important;}" +
            ".tk-help-btn{position:absolute!important;top:8px!important;left:34%!important;right:auto!important;transform:translateX(-50%)!important;z-index:30!important;border:2px solid #ffffff!important;border-radius:999px!important;background:#2f80ed!important;color:#ffffff!important;font-weight:900!important;font-size:14px!important;line-height:1!important;width:62px!important;height:48px!important;box-shadow:0 3px 9px rgba(0,0,0,.4)!important;}" +
            ".tk-secret-bottom{margin:8px auto 7px!important;}" +
            "@media(max-width:430px){.tk-event-round{align-items:flex-start!important;padding-left:14px!important;padding-right:38px!important;}.tk-event-round span{font-size:12px!important;letter-spacing:1.5px!important;}.tk-event-round b{font-size:39px!important;line-height:.82!important;}.tk-help-btn{top:7px!important;left:33%!important;right:auto!important;width:54px!important;height:42px!important;font-size:12px!important;}}";

        const messageEl = root.querySelector(".tk-message");
        if (messageEl) {
            messageEl.textContent = tkDisplayMessageForViewer(st);
        }

        const me = myPlayer();

        const displayPlayers = st.players.map(function (p, index) {
            return { p: p, index: index };
        }).sort(function (a, b) {
            if (me && a.p.id === me.id && b.p.id !== me.id) return 1;
            if (me && b.p.id === me.id && a.p.id !== me.id) return -1;
            return a.index - b.index;
        });

        const lastEls = root.querySelectorAll(".tk-player-card .tk-last");

        displayPlayers.forEach(function (item, index) {
            if (lastEls[index]) {
                lastEls[index].textContent = tkDisplayLastActionForViewer(item.p);
            }
        });

        const secretGoal = root.querySelector(".tk-secret-bottom");
        const actions = root.querySelector(".tk-actions");

        if (secretGoal && actions && actions.parentNode && secretGoal.parentNode !== actions.parentNode) {
            actions.parentNode.insertBefore(secretGoal, actions);
        } else if (secretGoal && actions && actions.parentNode) {
            actions.parentNode.insertBefore(secretGoal, actions);
        }
    }
})();
/* === END TINY KINGDOMS ONE-PASTE PATCH === */
window.resetTinyKingdomsGame = function () {
clearTimeout(armyRevealTimer);
clearTimeout(actionFlashTimer);
clearTimeout(bonusStepTimer);
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
