/* CHASER CRIBBAGE - WOODEN BOARD + CALLOUTS VERSION */
;(function () {
"use strict";

const WIN_SCORE = 121;
const BOT_ID = "cribbage-computer-player";
const BOT_DELAY = 1900;
const CALLOUT_MS = 1900; // how long each "fifteen two" style popup stays up

let botTimer = null;
let cardSerial = 0;

function byId(id) {
return document.getElementById(id);
}

function canvas() {
return byId("gameCanvasContainer");
}

function escapeHtml(value) {
return String(value || "")
.replace(/&/g, "&" + "amp;")
.replace(/</g, "&" + "lt;")
.replace(/>/g, "&" + "gt;")
.replace(/"/g, "&" + "quot;")
.replace(/'/g, "&" + "#039;");
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

function syncCribbage() {
if (typeof channel !== "undefined" && channel && window.cribbageState) {
channel.send({
type: "broadcast",
event: "cribbage-sync-state",
payload: {
state: window.cribbageState,
roomGameId: window.chaserGame && window.chaserGame.activeGameId ? window.chaserGame.activeGameId : null
}
});
}
}

function rankValue(rank) {
if (rank === "A") return 1;
if (rank === "J") return 11;
if (rank === "Q") return 12;
if (rank === "K") return 13;
return Number(rank);
}

function countValue(card) {
return Math.min(10, rankValue(card.rank));
}

function cardLabel(card) {
if (!card) return "";
return card.rank + card.suit;
}

function cardListText(cards) {
return (cards || []).map(cardLabel).join(" ");
}

function shuffle(cards) {
const arr = cards.slice();

for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
}

return arr;

}

function makeDeck() {
const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const deck = [];

suits.forEach(function (suit) {
    ranks.forEach(function (rank) {
        cardSerial += 1;
        deck.push({
            rank: rank,
            suit: suit,
            uid: "crib-" + cardSerial
        });
    });
});

return shuffle(deck);

}

function playerListFromChaser() {
const raw = window.chaserGame && Array.isArray(window.chaserGame.players)
? window.chaserGame.players.slice(0, 2)
: [];

let players = raw
    .filter(function (p) {
        return p && p.id;
    })
    .map(function (p, i) {
        return {
            id: p.id,
            name: p.name || "Player " + (i + 1),
            score: 0,
            prevScore: 0,
            isBot: false
        };
    });

if (!players.length) {
    players = [{
        id: getMyId(),
        name: myName(),
        score: 0,
        prevScore: 0,
        isBot: false
    }];
}

if (players.length < 2) {
    players.push({
        id: BOT_ID,
        name: "Computer",
        score: 0,
        prevScore: 0,
        isBot: true
    });
}

return players.slice(0, 2);

}

function createState() {
const players = playerListFromChaser();

const s = {
    players: players,
    dealerIndex: 1,
    round: 0,
    phase: "new",
    deck: [],
    hands: [[], []],
    playHands: [[], []],
    crib: [],
    selectedDiscards: [[], []],
    cutCard: null,
    peggingTotal: 0,
    peggingStack: [],
    goFlags: [false, false],
    lastPlayerToPlay: null,
    turnIndex: 0,
    message: "Cribbage ready.",
    log: [],
    countStages: [],
    countStageIndex: 0,
    calloutQueue: [],
    activeCallout: null
};

startNewRound(s, false);
return s;

}

function startNewRound(s, flipDealer) {
if (flipDealer) {
s.dealerIndex = 1 - s.dealerIndex;
}

s.round += 1;
s.deck = makeDeck();
s.hands = [[], []];
s.playHands = [[], []];
s.crib = [];
s.selectedDiscards = [[], []];
s.cutCard = null;
s.peggingTotal = 0;
s.peggingStack = [];
s.goFlags = [false, false];
s.lastPlayerToPlay = null;
s.turnIndex = 1 - s.dealerIndex;
s.phase = "discard";
s.countStages = [];
s.countStageIndex = 0;
s.calloutQueue = [];
s.activeCallout = null;
s.log = [];

for (let i = 0; i < 6; i++) {
    s.hands[0].push(s.deck.pop());
    s.hands[1].push(s.deck.pop());
}

addLog(s, "Round " + s.round + " started.");
s.message = "Choose 2 cards for the crib.";

}

function myPlayerIndex() {
const s = window.cribbageState;
const id = getMyId();

if (!s || !s.players) return 0;

const index = s.players.findIndex(function (p) {
    return p.id === id;
});

return index >= 0 ? index : 0;

}

function canLocalPlayerActFor(index) {
const s = window.cribbageState;
if (!s || !s.players[index]) return false;
if (s.players[index].isBot) return false;
return s.players[index].id === getMyId();
}

function addLog(s, text) {
s.log.unshift(text);
s.log = s.log.slice(0, 6);
}

/* ---------- scoring helper: keeps front/back peg history ---------- */
function addScore(s, playerIndex, points) {
const p = s.players[playerIndex];
if (!p || !points) return;
p.prevScore = p.score;
p.score += points;
}

/* ---------- on-screen "fifteen two, fifteen four..." callouts ---------- */
function queueCallouts(s, phrases) {
if (!phrases || !phrases.length) return;
s.calloutQueue = (s.calloutQueue || []).concat(phrases);
}

function runCalloutLoop(onComplete) {
if (window.__cribbageCalloutBusy) return;

const s = window.cribbageState;

if (!s || !s.calloutQueue || !s.calloutQueue.length) {
    if (s) s.activeCallout = null;
    if (onComplete) onComplete();
    return;
}

window.__cribbageCalloutBusy = true;
s.activeCallout = s.calloutQueue.shift();
renderCribbage();

clearTimeout(window.__cribbageCalloutTimer);
window.__cribbageCalloutTimer = setTimeout(function () {
    window.__cribbageCalloutBusy = false;
    runCalloutLoop(onComplete);
}, CALLOUT_MS);

}

function selectedDiscardIndexes(s, playerIndex) {
return (s.selectedDiscards[playerIndex] || []).slice().sort(function (a, b) {
return a - b;
});
}

function setSelectedDiscards(s, playerIndex, indexes) {
s.selectedDiscards[playerIndex] = indexes.slice().sort(function (a, b) {
return a - b;
});
}

function phaseLabel(s) {
if (!s) return "Cribbage";
if (s.phase === "discard") return "Stage 1: Choose Crib Cards";
if (s.phase === "cut") return "Stage 2: Cut Card";
if (s.phase === "pegging") return "Stage 3: Pegging";
if (s.phase === "counting") return "Stage 4: Counting";
if (s.phase === "roundover") return "Round Complete";
if (s.phase === "gameover") return "Game Over";
return "Cribbage";
}

function cribOwnerText(s) {
return s.players[s.dealerIndex].name + "'s crib";
}

window.toggleCribbageDiscard = function (cardIndex) {
const s = window.cribbageState;
const pIndex = myPlayerIndex();

if (!s || s.phase !== "discard") return;
if (!canLocalPlayerActFor(pIndex)) return;

const selected = selectedDiscardIndexes(s, pIndex);
const already = selected.indexOf(cardIndex) !== -1;
let next = selected.slice();

if (already) {
    next = next.filter(function (n) {
        return n !== cardIndex;
    });
} else {
    if (next.length >= 2) {
        s.message = "Only choose 2 cards.";
        renderCribbage();
        return;
    }

    next.push(cardIndex);
}

setSelectedDiscards(s, pIndex, next);
s.message = next.length === 2 ? "Tap Send to Crib." : "Choose 2 cards for the crib.";

renderCribbage();
syncCribbage();

};

window.confirmCribbageDiscards = function () {
const s = window.cribbageState;
const pIndex = myPlayerIndex();

if (!s || s.phase !== "discard") return;
if (!canLocalPlayerActFor(pIndex)) return;

discardForPlayer(s, pIndex);
maybeAdvanceAfterDiscards(s);

renderCribbage();
syncCribbage();
queueBot();

};

function discardForPlayer(s, playerIndex) {
const selected = selectedDiscardIndexes(s, playerIndex);

if (selected.length !== 2) {
    s.message = "Choose exactly 2 cards.";
    return false;
}

const hand = s.hands[playerIndex];

selected
    .slice()
    .sort(function (a, b) {
        return b - a;
    })
    .forEach(function (idx) {
        if (hand[idx]) {
            s.crib.push(hand.splice(idx, 1)[0]);
        }
    });

s.selectedDiscards[playerIndex] = [];
addLog(s, s.players[playerIndex].name + " sent 2 cards to " + cribOwnerText(s) + ".");
s.message = s.players[playerIndex].name + " sent 2 cards to the crib.";

return true;

}

function botChooseDiscards(s, playerIndex) {
const hand = s.hands[playerIndex];
if (!hand || hand.length <= 4) return;

const scored = hand.map(function (card, index) {
    let keepValue = countValue(card);

    if (card.rank === "5") keepValue += 8;
    if (card.rank === "J") keepValue += 2;
    if (card.rank === "A") keepValue += 1;

    return {
        index: index,
        keepValue: keepValue
    };
});

scored.sort(function (a, b) {
    return a.keepValue - b.keepValue;
});

setSelectedDiscards(s, playerIndex, [scored[0].index, scored[1].index]);
discardForPlayer(s, playerIndex);

}

function maybeAdvanceAfterDiscards(s) {
const bothReady = s.hands[0].length === 4 && s.hands[1].length === 4;

if (bothReady) {
    s.phase = "cut";
    s.message = "Cut the deck.";
    addLog(s, "Crib has 4 cards. Cut card is next.");
    queueCallouts(s, ["Tap the deck to cut!"]);
}

}

window.cutCribbageDeck = function () {
const s = window.cribbageState;
if (!s || s.phase !== "cut") return;

s.cutCard = s.deck.pop();
s.playHands = [
    s.hands[0].slice(),
    s.hands[1].slice()
];

s.phase = "pegging";
s.turnIndex = 1 - s.dealerIndex;
s.peggingTotal = 0;
s.peggingStack = [];
s.goFlags = [false, false];
s.lastPlayerToPlay = null;

addLog(s, "Cut card: " + cardLabel(s.cutCard) + ".");

if (s.cutCard.rank === "J") {
    addScore(s, s.dealerIndex, 2);
    addLog(s, s.players[s.dealerIndex].name + " scores 2 for his heels.");
    s.message = "Dealer scores 2 for his heels.";
    queueCallouts(s, ["His Heels for 2"]);
} else {
    s.message = "Pegging starts.";
}

if (!checkForWinner(s)) {
    renderCribbage();
    syncCribbage();
    runCalloutLoop();
    queueBot();
} else {
    renderCribbage();
    syncCribbage();
    runCalloutLoop();
}

};

function playableCards(s, playerIndex) {
return s.playHands[playerIndex].filter(function (card) {
return s.peggingTotal + countValue(card) <= 31;
});
}

function canPlayAny(s, playerIndex) {
return playableCards(s, playerIndex).length > 0;
}

window.playCribbageCard = function (uid) {
const s = window.cribbageState;
const pIndex = myPlayerIndex();

if (!s || s.phase !== "pegging") return;
if (s.turnIndex !== pIndex) return;
if (!canLocalPlayerActFor(pIndex)) return;

playCardByUid(s, pIndex, uid);

renderCribbage();
syncCribbage();
runCalloutLoop();
queueBot();

};

function playCardByUid(s, playerIndex, uid) {
const hand = s.playHands[playerIndex];
const cardIndex = hand.findIndex(function (c) {
return c.uid === uid;
});

if (cardIndex < 0) return false;

const card = hand[cardIndex];

if (s.peggingTotal + countValue(card) > 31) {
    s.message = "That card would go over 31.";
    return false;
}

hand.splice(cardIndex, 1);

s.peggingTotal += countValue(card);
s.peggingStack.push({
    card: card,
    playerIndex: playerIndex
});

s.goFlags[playerIndex] = false;
s.lastPlayerToPlay = playerIndex;

const totalAfter = s.peggingTotal;
const gained = peggingScoreForPlay(s);

if (gained.points > 0) {
    addScore(s, playerIndex, gained.points);
    addLog(s, s.players[playerIndex].name + " +" + gained.points + " for " + gained.reason + ".");
    s.message = "+" + gained.points + " for " + gained.reason + ". Count " + totalAfter + ".";
    queueCallouts(s, gained.phrases);
} else {
    addLog(s, s.players[playerIndex].name + " played " + cardLabel(card) + ". Count " + totalAfter + ".");
    s.message = "Count " + totalAfter + ".";
}

if (checkForWinner(s)) return true;

if (totalAfter === 31) {
    s.peggingTotal = 0;
    s.peggingStack = [];
    s.goFlags = [false, false];
    s.turnIndex = 1 - playerIndex;
    s.message += " Count resets.";
} else {
    s.turnIndex = 1 - playerIndex;
}

maybeEndPegging(s);
return true;

}

function peggingScoreForPlay(s) {
const items = [];

if (s.peggingTotal === 15) {
    items.push({ label: "Fifteen", points: 2 });
}

if (s.peggingTotal === 31) {
    items.push({ label: "Thirty-One", points: 2 });
}

const sameRankCount = countSameRankAtEnd(s.peggingStack);

if (sameRankCount === 2) {
    items.push({ label: "Pair", points: 2 });
} else if (sameRankCount === 3) {
    items.push({ label: "Three of a Kind", points: 6 });
} else if (sameRankCount === 4) {
    items.push({ label: "Four of a Kind", points: 12 });
}

const runPoints = peggingRunScore(s.peggingStack);

if (runPoints >= 3) {
    items.push({ label: "Run of " + runPoints, points: runPoints });
}

const points = items.reduce(function (acc, it) {
    return acc + it.points;
}, 0);

const phrases = items.map(function (it) {
    return it.label + " for " + it.points;
});

return {
    points: points,
    phrases: phrases,
    reason: items.map(function (it) { return it.label; }).join(" + ") || "play"
};

}

function countSameRankAtEnd(stack) {
if (!stack.length) return 0;

const lastRank = stack[stack.length - 1].card.rank;
let count = 0;

for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].card.rank === lastRank) count++;
    else break;
}

return count;

}

function peggingRunScore(stack) {
for (let len = Math.min(stack.length, 7); len >= 3; len--) {
const slice = stack.slice(stack.length - len);
const ranks = slice.map(function (entry) {
return rankValue(entry.card.rank);
});

    const unique = Array.from(new Set(ranks));

    if (unique.length !== len) continue;

    unique.sort(function (a, b) {
        return a - b;
    });

    if (unique[unique.length - 1] - unique[0] === len - 1) {
        return len;
    }
}

return 0;

}

window.cribbageGo = function () {
const s = window.cribbageState;
const pIndex = myPlayerIndex();

if (!s || s.phase !== "pegging") return;
if (s.turnIndex !== pIndex) return;
if (!canLocalPlayerActFor(pIndex)) return;

sayGo(s, pIndex);

renderCribbage();
syncCribbage();
runCalloutLoop();
queueBot();

};

function sayGo(s, playerIndex) {
if (canPlayAny(s, playerIndex)) {
s.message = "You still have a playable card.";
return;
}

s.goFlags[playerIndex] = true;
addLog(s, s.players[playerIndex].name + " says Go.");
queueCallouts(s, [s.players[playerIndex].name + " says GO!"]);

const other = 1 - playerIndex;

if (canPlayAny(s, other)) {
    s.turnIndex = other;
    s.message = s.players[other].name + " can still play.";
    return;
}

if (s.lastPlayerToPlay !== null && s.peggingTotal > 0) {
    addScore(s, s.lastPlayerToPlay, 1);
    addLog(s, s.players[s.lastPlayerToPlay].name + " scores 1 for Go.");
    s.message = s.players[s.lastPlayerToPlay].name + " scores 1 for Go. Count resets.";
    queueCallouts(s, ["Go for 1"]);

    if (checkForWinner(s)) return;
}

s.peggingTotal = 0;
s.peggingStack = [];
s.goFlags = [false, false];

if (s.lastPlayerToPlay !== null) {
    s.turnIndex = 1 - s.lastPlayerToPlay;
}

maybeEndPegging(s);

}

function maybeEndPegging(s) {
if (s.phase !== "pegging") return;

const noCardsLeft = s.playHands[0].length === 0 && s.playHands[1].length === 0;

if (!noCardsLeft) return;

if (s.peggingTotal > 0 && s.lastPlayerToPlay !== null) {
    addScore(s, s.lastPlayerToPlay, 1);
    addLog(s, s.players[s.lastPlayerToPlay].name + " scores 1 for last card.");
    queueCallouts(s, ["Last Card for 1"]);

    if (checkForWinner(s)) return;
}

prepareCountingStages(s);

}

/* ---------- counting: build a spoken-style breakdown per hand ---------- */
function scoreCribbageHandDetailed(hand, cutCard, isCrib) {
const allCards = hand.concat([cutCard]);
const breakdown = [];
let total = 0;

for (let size = 2; size <= allCards.length; size++) {
    combinations(allCards, size).forEach(function (combo) {
        const sum = combo.reduce(function (acc, card) {
            return acc + countValue(card);
        }, 0);

        if (sum === 15) {
            total += 2;
            breakdown.push({ label: "Fifteen", points: 2 });
        }
    });
}

combinations(allCards, 2).forEach(function (combo) {
    if (combo[0].rank === combo[1].rank) {
        total += 2;
        breakdown.push({ label: "Pair", points: 2 });
    }
});

let bestRunLength = 0;
let runCount = 0;

for (let size = 5; size >= 3; size--) {
    combinations(allCards, size).forEach(function (combo) {
        if (isRun(combo)) {
            if (size > bestRunLength) {
                bestRunLength = size;
                runCount = 1;
            } else if (size === bestRunLength) {
                runCount += 1;
            }
        }
    });

    if (bestRunLength) break;
}

for (let i = 0; i < runCount; i++) {
    total += bestRunLength;
    breakdown.push({ label: "Run of " + bestRunLength, points: bestRunLength });
}

const handSuits = hand.map(function (card) {
    return card.suit;
});

const allHandSameSuit = handSuits.length === 4 && handSuits.every(function (suit) {
    return suit === handSuits[0];
});

if (allHandSameSuit && hand.length === 4) {
    if (cutCard && cutCard.suit === handSuits[0]) {
        total += 5;
        breakdown.push({ label: "Flush", points: 5 });
    } else if (!isCrib) {
        total += 4;
        breakdown.push({ label: "Flush", points: 4 });
    }
}

hand.forEach(function (card) {
    if (card.rank === "J" && cutCard && card.suit === cutCard.suit) {
        total += 1;
        breakdown.push({ label: "His Nobs", points: 1 });
    }
});

let running = 0;

const phrases = breakdown.map(function (item) {
    running += item.points;
    return item.label + " " + running;
});

if (!phrases.length) {
    phrases.push("No points");
}

return {
    total: total,
    phrases: phrases
};

}

function combinations(arr, size) {
const result = [];

function walk(start, combo) {
    if (combo.length === size) {
        result.push(combo.slice());
        return;
    }

    for (let i = start; i < arr.length; i++) {
        combo.push(arr[i]);
        walk(i + 1, combo);
        combo.pop();
    }
}

walk(0, []);
return result;

}

function isRun(cards) {
const ranks = cards.map(function (card) {
return rankValue(card.rank);
});

const unique = Array.from(new Set(ranks));

if (unique.length !== cards.length) return false;

unique.sort(function (a, b) {
    return a - b;
});

return unique[unique.length - 1] - unique[0] === unique.length - 1;

}

function prepareCountingStages(s) {
const nonDealer = 1 - s.dealerIndex;
const dealer = s.dealerIndex;

const poneHand = scoreCribbageHandDetailed(s.hands[nonDealer], s.cutCard, false);
const dealerHand = scoreCribbageHandDetailed(s.hands[dealer], s.cutCard, false);
const cribScore = scoreCribbageHandDetailed(s.crib, s.cutCard, true);

s.countStages = [
    {
        shortTitle: s.players[nonDealer].name + "'s hand",
        playerIndex: nonDealer,
        score: poneHand.total,
        phrases: poneHand.phrases,
        applied: false
    },
    {
        shortTitle: s.players[dealer].name + "'s hand",
        playerIndex: dealer,
        score: dealerHand.total,
        phrases: dealerHand.phrases,
        applied: false
    },
    {
        shortTitle: "The crib",
        playerIndex: dealer,
        score: cribScore.total,
        phrases: cribScore.phrases,
        isCrib: true,
        applied: false
    }
];

s.countStageIndex = 0;
s.phase = "counting";
s.peggingTotal = 0;
s.peggingStack = [];
s.message = "Counting points.";
addLog(s, "Pegging finished. Counting starts.");

beginCountingStage(s);

}

function currentCountStage(s) {
if (!s || !s.countStages) return null;
return s.countStages[s.countStageIndex] || null;
}

function beginCountingStage(s) {
const stage = currentCountStage(s);

if (!stage) {
    s.phase = "roundover";
    s.message = "Round complete.";
    renderCribbage();
    syncCribbage();
    return;
}

s.message = "Counting " + stage.shortTitle + "...";

const phrases = (stage.phrases || []).slice();
phrases.push(stage.shortTitle + ": " + s.players[stage.playerIndex].name + " scores " + stage.score + "!");

queueCallouts(s, phrases);
renderCribbage();
syncCribbage();

runCalloutLoop(function () {
    finalizeCountingStage(s);
});

}

function finalizeCountingStage(s) {
const stage = currentCountStage(s);

if (stage && !stage.applied) {
    addScore(s, stage.playerIndex, stage.score);
    stage.applied = true;

    addLog(s, s.players[stage.playerIndex].name + " scores " + stage.score + ".");
    s.message = s.players[stage.playerIndex].name + " scores " + stage.score + ".";

    if (checkForWinner(s)) {
        renderCribbage();
        syncCribbage();
        return;
    }
}

s.countStageIndex += 1;
renderCribbage();
syncCribbage();

clearTimeout(window.__cribbageCountAdvanceTimer);
window.__cribbageCountAdvanceTimer = setTimeout(function () {
    beginCountingStage(s);
}, 500);

}

// Kept as a safe legacy alias in case anything elsewhere still calls it.
window.applyCribbageCountStage = function () {
const s = window.cribbageState;
if (!s || s.phase !== "counting") return;
finalizeCountingStage(s);
};

window.nextCribbageRound = function () {
const s = window.cribbageState;
if (!s || s.phase !== "roundover") return;

startNewRound(s, true);
renderCribbage();
syncCribbage();
queueBot();

};

function checkForWinner(s) {
const winner = s.players.find(function (p) {
return p.score >= WIN_SCORE;
});

if (!winner) return false;

s.phase = "gameover";
s.message = winner.name + " wins!";
addLog(s, winner.name + " wins the game.");
return true;

}

function botPlayIfNeeded() {
const s = window.cribbageState;
if (!s || s.phase === "gameover") return;

const botIndex = s.players.findIndex(function (p) {
    return p.isBot;
});

if (botIndex < 0) return;

if (s.phase === "discard" && s.hands[botIndex] && s.hands[botIndex].length === 6) {
    botChooseDiscards(s, botIndex);
    maybeAdvanceAfterDiscards(s);
    renderCribbage();
    syncCribbage();
    return;
}

if (s.phase === "pegging" && s.turnIndex === botIndex) {
    const playable = playableCards(s, botIndex);

    if (!playable.length) {
        sayGo(s, botIndex);
        renderCribbage();
        syncCribbage();
        runCalloutLoop();
        return;
    }

    playable.sort(function (a, b) {
        const aMakes15 = s.peggingTotal + countValue(a) === 15 ? -5 : 0;
        const bMakes15 = s.peggingTotal + countValue(b) === 15 ? -5 : 0;
        const aMakes31 = s.peggingTotal + countValue(a) === 31 ? -10 : 0;
        const bMakes31 = s.peggingTotal + countValue(b) === 31 ? -10 : 0;

        return (countValue(a) + aMakes15 + aMakes31) - (countValue(b) + bMakes15 + bMakes31);
    });

    playCardByUid(s, botIndex, playable[0].uid);
    renderCribbage();
    syncCribbage();
    runCalloutLoop();
}

}

function queueBot() {
clearTimeout(botTimer);

const s = window.cribbageState;
if (!s) return;

const botIndex = s.players.findIndex(function (p) {
    return p.isBot;
});

if (botIndex < 0) return;

const botNeedsDiscard = s.phase === "discard" && s.hands[botIndex] && s.hands[botIndex].length === 6;
const botNeedsPegging = s.phase === "pegging" && s.turnIndex === botIndex;

if (botNeedsDiscard || botNeedsPegging) {
    botTimer = setTimeout(botPlayIfNeeded, BOT_DELAY);
}

}

window.resetCribbageGame = function () {
window.cribbageState = createState();
renderCribbage();
syncCribbage();
queueBot();
};

window.handleIncomingCribbageSync = function (payload) {
if (!payload || !payload.state) return;

if (
    payload.roomGameId &&
    window.chaserGame &&
    window.chaserGame.activeGameId &&
    payload.roomGameId !== window.chaserGame.activeGameId
) {
    return;
}

window.cribbageState = payload.state;

if (window.chaserGame) {
    window.chaserGame.activeGame = "Cribbage";
}

renderCribbage();
runCalloutLoop();
queueBot();

};

window.initCribbageGame = function () {
window.chaserGame = window.chaserGame || {};
window.chaserGame.activeGame = "Cribbage";

const stage = byId("activeGameStage");
const roomDisplay = byId("roomDisplayCode");
const headerBtns = byId("headerActionButtonsContainer");
const chatHeader = byId("chatHeader");

if (stage) stage.classList.add("open");
if (roomDisplay) roomDisplay.innerText = "🃏 Cribbage";
if (headerBtns) headerBtns.style.display = "none";
if (chatHeader) chatHeader.classList.add("game-active-mode");

const amHost = window.chaserGame && window.chaserGame.hostId === getMyId();

if (amHost || !window.cribbageState) {
    window.cribbageState = createState();
    syncCribbage();
}

renderCribbage();
queueBot();

};

window.startCribbageFromLobby = function () {
window.initCribbageGame();
};

window.startCribbageGame = function () {
window.initCribbageGame();
};

function cardButton(card, onClick, selected, disabled) {
const red = card.suit === "♥" || card.suit === "♦";
const clickAttr = disabled ? "disabled" : 'onclick="' + onClick + '"';

return (
    '<button class="crib-card ' +
    (red ? "red" : "black") +
    (selected ? " selected" : "") +
    '" ' + clickAttr + ' type="button">' +
        '<span class="rank">' + escapeHtml(card.rank) + '</span>' +
        '<span class="suit">' + escapeHtml(card.suit) + '</span>' +
    '</button>'
);

}

function pegPercent(score) {
return Math.max(0, Math.min(100, (Number(score || 0) / WIN_SCORE) * 100));
}

function renderPegTrack(player, index) {
const frontPct = pegPercent(player.score);
const backPct = pegPercent(player.prevScore || 0);

return (
    '<div class="crib-track-row">' +
        '<div class="crib-track-label">' + escapeHtml(player.name) + ': ' + Number(player.score || 0) + '</div>' +
        '<div class="crib-track">' +
            '<div class="crib-track-fill"></div>' +
            '<div class="crib-peg back p' + index + '" style="left:' + backPct + '%" title="previous position"></div>' +
            '<div class="crib-peg front p' + index + '" style="left:' + frontPct + '%" title="current score"></div>' +
            '<div class="crib-track-num finish">121</div>' +
        '</div>' +
    '</div>'
);

}

function renderCribbage() {
const el = canvas();
const s = window.cribbageState;

if (!el || !s) return;

const oldContainerScroll = el.scrollTop || 0;
const oldWrap = el.querySelector(".crib-wrap");
const oldWrapScroll = oldWrap ? oldWrap.scrollTop : 0;

const meIndex = myPlayerIndex();
const me = s.players[meIndex] || s.players[0];
const opponentIndex = 1 - meIndex;
const opponent = s.players[opponentIndex] || s.players[1];

const myTurn = s.turnIndex === meIndex;
const selected = selectedDiscardIndexes(s, meIndex);
const myDiscardReady = s.phase === "discard" && selected.length === 2 && canLocalPlayerActFor(meIndex);
const myPlayable = s.phase === "pegging" ? playableCards(s, meIndex) : [];
const canSayGo = s.phase === "pegging" && myTurn && canLocalPlayerActFor(meIndex) && myPlayable.length === 0;

/* --- hand HTML --- */
let myHandHtml = "";
if (s.phase === "discard") {
    myHandHtml = s.hands[meIndex].map(function (card, i) {
        return cardButton(card, "toggleCribbageDiscard(" + i + ")", selected.indexOf(i) !== -1, !canLocalPlayerActFor(meIndex));
    }).join("");
} else if (s.phase === "pegging") {
    myHandHtml = s.playHands[meIndex].map(function (card) {
        const disabled = !myTurn || !canLocalPlayerActFor(meIndex) || (s.peggingTotal + countValue(card) > 31);
        return cardButton(card, "playCribbageCard('" + card.uid + "')", false, disabled);
    }).join("");
} else {
    myHandHtml = s.hands[meIndex].map(function (card) {
        return cardButton(card, "", false, true);
    }).join("");
}
if (!myHandHtml) {
    myHandHtml = '<div class="crib-empty-hand">No cards left.</div>';
}

/* --- pegging row --- */
const playedHtml = s.peggingStack.length
    ? s.peggingStack.map(function (entry) {
        return '<div class="crib-played-card">' + escapeHtml(cardLabel(entry.card)) + '</div>';
    }).join("")
    : '<div class="crib-empty-play">Pegging cards will show here.</div>';

/* --- cut card: tappable + pulsing when it is cut phase --- */
const cutCardRed = s.cutCard && (s.cutCard.suit === "♥" || s.cutCard.suit === "♦");
const cutHtml = s.cutCard
    ? '<div class="crib-cut-card ' + (cutCardRed ? "red" : "") + '">' + escapeHtml(cardLabel(s.cutCard)) + '</div>'
    : (s.phase === "cut"
        ? '<button class="crib-cut-card cut-prompt" onclick="cutCribbageDeck()" type="button"><div style="font-size:16px;line-height:1.1;">✂</div><div style="font-size:8px;letter-spacing:.5px;margin-top:2px;">TAP<br>TO CUT</div></button>'
        : '<div class="crib-cut-card empty">?</div>');

const dealerName = s.players[s.dealerIndex] ? s.players[s.dealerIndex].name : "Dealer";

/* --- GO button lives inside the pegging row --- */
const goBtnHtml = '<button class="crib-go-btn' + (canSayGo ? " active" : "") + '" onclick="cribbageGo()" ' + (canSayGo ? "" : "disabled") + ' type="button">GO</button>';

/* --- discard CTA replaces all bottom buttons during discard phase --- */
let discardCtaHtml = "";
if (s.phase === "discard" && canLocalPlayerActFor(meIndex)) {
    const rem = 2 - selected.length;
    if (rem > 0) {
        discardCtaHtml = '<div class="crib-discard-cta pending">Pick ' + rem + ' more card' + (rem === 1 ? "" : "s") + ' for the crib</div>';
    } else {
        discardCtaHtml = '<button class="crib-discard-cta ready" onclick="confirmCribbageDiscards()" type="button">Send to Crib \u2714</button>';
    }
}

/* --- score callout overlay --- */
const calloutHtml = s.activeCallout
    ? '<div class="crib-callout-wrap"><div class="crib-callout">' + escapeHtml(s.activeCallout) + '</div></div>'
    : "";

/* --- show the hand/crib being counted so you can follow along --- */
let countedHandHtml = "";
if (s.phase === "counting" || s.phase === "roundover") {
    const stageIndex = (s.phase === "roundover")
        ? Math.max(0, (s.countStages || []).length - 1)
        : s.countStageIndex;
    const stage = (s.countStages || [])[stageIndex] || null;
    if (stage) {
        const countedCards = stage.isCrib
            ? (s.crib || [])
            : (s.hands[stage.playerIndex] || []);
        const countedCardsHtml = countedCards.map(function (card) {
            return cardButton(card, "", false, true);
        }).join("") || '<div class="crib-empty-hand">No cards.</div>';
        countedHandHtml = [
            '<div class="crib-counting-hand">',
                '<div class="crib-counting-title">', escapeHtml(stage.shortTitle), '</div>',
                '<div class="crib-hand" style="margin:0 auto 4px;">', countedCardsHtml, '</div>',
            '</div>'
        ].join("");
    }
}

el.innerHTML = [
    '<style>',
        /* wrap */
        '.crib-wrap{position:relative;width:100%;height:100%;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;box-sizing:border-box;padding:4px 8px 40px;color:#e2f0d9;font-family:Arial,sans-serif;text-align:center;}',

        /* callout overlay – sticks near the top, takes no layout space */
        '.crib-callout-wrap{position:sticky;top:0;z-index:6;height:0;overflow:visible;pointer-events:none;}',
        '.crib-callout{display:inline-block;margin-top:6px;background:#1c1006;color:#ffd700;border:3px solid #ffd700;border-radius:12px;padding:10px 18px;font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:.4px;box-shadow:0 6px 18px rgba(0,0,0,.55);animation:cribCalloutPop 1.9s ease forwards;}',
        '@keyframes cribCalloutPop{0%{opacity:0;transform:scale(.75) translateY(-4px);}12%{opacity:1;transform:scale(1.08);}22%{transform:scale(1);}82%{opacity:1;}100%{opacity:0;transform:scale(.96);}}',

        /* stage label */
        '.crib-stage{color:#e2f0d9;font-size:13px;font-weight:900;text-transform:uppercase;margin:0 auto 5px;letter-spacing:.5px;}',

        /* player score row – one line each, name + score side by side */
        '.crib-score-row{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:0 auto 6px;max-width:560px;}',
        '.crib-player{background:#e2f0d9;color:#1e4620;border:3px solid transparent;border-radius:10px;padding:6px 10px;box-sizing:border-box;font-weight:900;min-height:36px;display:flex;flex-direction:row;justify-content:space-between;align-items:center;gap:4px;}',
        '.crib-player.turn{border-color:#ff8c00;background:#fff3e0;box-shadow:0 0 0 1px #ff8c00;}',
        '.crib-player.dealer{outline:2px solid #b8960c;outline-offset:1px;}',
        '.crib-player-name{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;}',
        '.crib-player-score{font-size:20px;line-height:1;flex-shrink:0;}',

        /* wooden cribbage board */
        '.crib-board{background:#3a2412;background-image:repeating-linear-gradient(100deg, rgba(255,255,255,.025) 0px, rgba(255,255,255,.025) 2px, transparent 2px, transparent 7px), linear-gradient(160deg,#4a2e15,#2c1a0c);border:4px solid #6b3f1d;border-radius:16px;box-shadow:inset 0 0 18px rgba(0,0,0,.6), 0 6px 16px rgba(0,0,0,.5);max-width:560px;margin:0 auto 6px;overflow:hidden;padding:9px 10px 5px;box-sizing:border-box;}',
        '.crib-track-row{margin:0 auto 9px;text-align:left;}',
        '.crib-track-label{font-size:11px;font-weight:900;color:#ffd700;margin:0 0 3px 2px;text-shadow:0 1px 1px rgba(0,0,0,.6);}',
        '.crib-track{height:22px;background:#241407;border:2px solid #8a5a2b;border-radius:999px;position:relative;box-sizing:border-box;overflow:visible;box-shadow:inset 0 3px 6px rgba(0,0,0,.7);}',
        '.crib-track-fill{position:absolute;left:6px;right:6px;top:0;bottom:0;background-image:radial-gradient(circle,#0a0500 0 1.6px,transparent 2.1px);background-size:9px 9px;background-position:0 5px,5px 14px;opacity:.95;}',
        '.crib-peg{position:absolute;top:50%;width:12px;height:12px;border-radius:50%;transform:translate(-50%,-50%);box-sizing:border-box;z-index:2;}',
        '.crib-peg.front{border:2px solid #fff2c4;box-shadow:0 0 5px rgba(0,0,0,.8), inset 0 -2px 2px rgba(0,0,0,.35), inset 0 1px 1px rgba(255,255,255,.7);}',
        '.crib-peg.back{width:9px;height:9px;opacity:.5;border:1.5px solid #fff2c4;box-shadow:0 0 3px rgba(0,0,0,.6);z-index:1;}',
        '.crib-peg.p0{background:radial-gradient(circle at 35% 30%, #ff8a80, #d6001c 70%);}',
        '.crib-peg.p1{background:radial-gradient(circle at 35% 30%, #8ec9ff, #1559a8 70%);}',
        '.crib-track-num{position:absolute;top:50%;transform:translateY(-50%);font-size:9px;font-weight:900;color:#e2f0d9;opacity:.75;z-index:1;}',
        '.crib-track-num.finish{right:8px;}',

        /* game table */
        '.crib-table{background:#123d18;border:2px solid #e2f0d9;border-radius:14px;box-shadow:0 6px 16px rgba(0,0,0,.35);max-width:560px;margin:0 auto 6px;overflow:hidden;}',
        '.crib-table-head{display:grid;grid-template-columns:1fr 86px 1fr;gap:6px;align-items:center;background:#0b2410;border-bottom:2px solid #ffd700;padding:7px;}',
        '.crib-count-box{background:#ffd700;color:#1e4620;border-radius:11px;padding:5px 4px;font-weight:900;}',
        '.crib-count-number{font-size:24px;line-height:1;}',
        '.crib-count-label{font-size:9px;text-transform:uppercase;}',
        '.crib-cut-label{font-size:10px;font-weight:900;color:#e2f0d9;text-transform:uppercase;}',
        '.crib-cut-card{width:46px;height:58px;margin:2px auto 0;background:#ffffff;color:#111;border-radius:8px;border:2px solid #ffd700;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:900;box-sizing:border-box;flex-direction:column;}',
        '.crib-cut-card.red{color:#dc3545;}',
        '.crib-cut-card.empty{background:#234b25;color:#ffd700;}',
        /* cut-prompt: pulsing tap target */
        '@keyframes cribCutPulse{0%,100%{border-color:#ffd700;box-shadow:none;}50%{border-color:#fff;box-shadow:0 0 10px #ffd700;}}',
        '.crib-cut-card.cut-prompt{background:#1a3d1c;color:#ffd700;border:2px dashed #ffd700;cursor:pointer;animation:cribCutPulse 1.1s ease-in-out infinite;font-size:11px;text-align:center;line-height:1.2;}',

        /* pegging row + GO button */
        '.crib-play-area{padding:6px 7px 7px;}',
        '.crib-pegging-header{display:flex;justify-content:space-between;align-items:center;margin:0 0 5px;}',
        '.crib-section-title{font-size:13px;font-weight:900;color:#ffd700;text-transform:uppercase;margin:0;}',
        '.crib-played-row{display:flex;gap:5px;justify-content:center;align-items:center;flex-wrap:wrap;min-height:38px;}',
        '.crib-played-card{background:#ffffff;color:#111;border:2px solid #ffd700;border-radius:8px;min-width:42px;padding:5px 4px;font-weight:900;box-sizing:border-box;}',
        '.crib-empty-play,.crib-empty-hand{color:#ffd700;font-size:13px;font-weight:900;padding:7px;}',

        /* circular GO button inside pegging row */
        '@keyframes cribPulseGo{0%,100%{box-shadow:0 0 0 0 rgba(192,24,42,.7);}60%{box-shadow:0 0 0 8px rgba(192,24,42,0);}}',
        '.crib-go-btn{width:44px;height:44px;border-radius:50%;border:3px solid #444;background:#2a2a2a;color:#666;font-size:11px;font-weight:900;letter-spacing:.5px;flex-shrink:0;cursor:default;}',
        '.crib-go-btn.active{border-color:#c0182a;background:#c0182a;color:#fff;cursor:pointer;animation:cribPulseGo 1s ease-out infinite;}',

        /* hand cards */
        '.crib-hand{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:0 auto 6px;max-width:560px;}',
        '.crib-card{position:relative;width:48px;height:66px;border-radius:8px;border:2px solid #ffffff;background:#ffffff;color:#111;font-weight:900;box-shadow:0 3px 7px rgba(0,0,0,.35);box-sizing:border-box;}',
        '.crib-card .rank{position:absolute;top:5px;left:6px;font-size:17px;}',
        '.crib-card .suit{position:absolute;bottom:5px;right:7px;font-size:22px;}',
        '.crib-card.red{color:#dc3545;}',
        '.crib-card.black{color:#111111;}',
        '.crib-card.selected{border:4px solid #ff8c00;transform:translateY(-5px);}',
        '.crib-card:disabled{opacity:.85;transform:none;}',

        /* inline discard CTA – replaces all bottom buttons */
        '.crib-discard-cta{display:block;width:calc(100% - 0px);max-width:400px;margin:4px auto 6px;border-radius:999px;padding:11px 16px;font-size:14px;font-weight:900;text-align:center;border:none;box-sizing:border-box;}',
        '.crib-discard-cta.pending{background:#223a24;color:#8dc990;border:2px dashed #4a7a50;}',
        '.crib-discard-cta.ready{background:#ffd700;color:#1e4620;box-shadow:0 4px 14px rgba(0,0,0,.4);cursor:pointer;}',

        /* counted hand panel – shown during counting so you can see what's being scored */
        '.crib-counting-hand{background:#0b2410;border:2px solid #ffd700;border-radius:12px;max-width:560px;margin:0 auto 6px;padding:8px 8px 5px;}',
        '.crib-counting-title{font-size:11px;font-weight:900;color:#ffd700;text-transform:uppercase;letter-spacing:.5px;margin:0 0 6px;}',

        '@media(max-width:390px),(max-height:735px){.crib-wrap{padding:4px 6px 32px;}.crib-stage{font-size:12px;}.crib-player{min-height:32px;padding:5px 8px;}.crib-player-score{font-size:18px;}.crib-card{width:44px;height:62px;}.crib-card .rank{font-size:15px;}.crib-card .suit{font-size:20px;}.crib-table-head{grid-template-columns:1fr 78px 1fr;}.crib-callout{font-size:15px;padding:8px 12px;}.crib-go-btn{width:40px;height:40px;font-size:10px;}}',
    '</style>',

    '<div class="crib-wrap">',
        calloutHtml,

        '<div class="crib-stage">', escapeHtml(phaseLabel(s)), '</div>',

        /* player boxes – one line: name left, score right, orange border = active turn */
        '<div class="crib-score-row">',
            '<div class="crib-player', (s.turnIndex === meIndex ? " turn" : ""), (s.dealerIndex === meIndex ? " dealer" : ""), '">',
                '<span class="crib-player-name">', escapeHtml(me.name), '</span>',
                '<span class="crib-player-score">', Number(me.score || 0), '</span>',
            '</div>',
            '<div class="crib-player', (s.turnIndex === opponentIndex ? " turn" : ""), (s.dealerIndex === opponentIndex ? " dealer" : ""), '">',
                '<span class="crib-player-name">', escapeHtml(opponent.name), '</span>',
                '<span class="crib-player-score">', Number(opponent.score || 0), '</span>',
            '</div>',
        '</div>',

        /* wooden peg board */
        '<div class="crib-board">',
            renderPegTrack(s.players[0], 0),
            renderPegTrack(s.players[1], 1),
        '</div>',

        /* game table */
        '<div class="crib-table">',
            '<div class="crib-table-head">',
                '<div>',
                    '<div class="crib-cut-label">Cut</div>',
                    cutHtml,
                '</div>',
                '<div class="crib-count-box">',
                    '<div class="crib-count-number">', Number(s.peggingTotal || 0), '</div>',
                    '<div class="crib-count-label">Count</div>',
                '</div>',
                '<div>',
                    '<div class="crib-cut-label">Crib</div>',
                    '<div class="crib-cut-card empty" style="font-size:11px;padding:3px;line-height:1.1;">', escapeHtml(dealerName), '</div>',
                '</div>',
            '</div>',
            '<div class="crib-play-area">',
                '<div class="crib-pegging-header">',
                    '<div class="crib-section-title">Pegging Row</div>',
                    goBtnHtml,
                '</div>',
                '<div class="crib-played-row">', playedHtml, '</div>',
            '</div>',
        '</div>',

        /* discard CTA – only shows during discard phase for local player */
        discardCtaHtml,

        /* counted hand – shows during counting/roundover so you can see what's being scored */
        countedHandHtml,

        /* your hand – no bottom button row */
        '<div class="crib-section-title" style="margin:6px 0 5px;">Your Cards</div>',
        '<div class="crib-hand">', myHandHtml, '</div>',
    '</div>'
].join("");

const newWrap = el.querySelector(".crib-wrap");

if (newWrap) {
    newWrap.scrollTop = oldWrapScroll;
}

el.scrollTop = oldContainerScroll;

setTimeout(function () {
    const wrapAgain = el.querySelector(".crib-wrap");

    if (wrapAgain) {
        wrapAgain.scrollTop = oldWrapScroll;
    }

    el.scrollTop = oldContainerScroll;
}, 0);

if (window.__cribbageAutoProgressTimer) {
    clearTimeout(window.__cribbageAutoProgressTimer);
    window.__cribbageAutoProgressTimer = null;
}

if (s.phase === "roundover") {
    window.__cribbageAutoProgressTimer = setTimeout(function () {
        if (window.cribbageState && window.cribbageState.phase === "roundover") {
            window.nextCribbageRound();
        }
    }, 1500);
}

queueBot();

}

window.renderCribbage = renderCribbage;

})();
