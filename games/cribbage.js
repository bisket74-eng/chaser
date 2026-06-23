/* CHASER CRIBBAGE - SEPARATE GAME FILE
1-player vs computer or 2-player synced through Chaser.
Staged flow: discard -> cut -> pegging -> count hands -> count crib -> next round.
*/
(function () {
"use strict";

```
const WIN_SCORE = 121;
const BOT_ID = "cribbage-computer-player";
const BOT_DELAY = 1900;

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

function shuffle(a) {
    const arr = a.slice();

    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }

    return arr;
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
                isBot: false
            };
        });

    if (!players.length) {
        players = [{
            id: getMyId(),
            name: myName(),
            score: 0,
            isBot: false
        }];
    }

    if (players.length < 2) {
        players.push({
            id: BOT_ID,
            name: "Computer",
            score: 0,
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
        countStageIndex: 0
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
    s.log = [];

    for (let i = 0; i < 6; i++) {
        s.hands[0].push(s.deck.pop());
        s.hands[1].push(s.deck.pop());
    }

    addLog(s, "Round " + s.round + " started. " + s.players[s.dealerIndex].name + " has the crib.");
    s.message = "Choose 2 cards for the crib. Dealer / crib: " + s.players[s.dealerIndex].name + ".";
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
    s.log = s.log.slice(0, 9);
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
    if (s.phase === "pegging") return "Stage 3: Pegging to 31";
    if (s.phase === "counting") return "Stage 4: Count the Points";
    if (s.phase === "roundover") return "Stage 5: Round Complete";
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
            s.message = "Only choose 2 cards for the crib.";
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
        s.message = "Both players sent cards to the crib. Cut the deck.";
        addLog(s, "Crib now has 4 cards. Cut card is next.");
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
        s.players[s.dealerIndex].score += 2;
        addLog(s, s.players[s.dealerIndex].name + " scores 2 for his heels.");
        s.message = "Cut card is " + cardLabel(s.cutCard) + ". Dealer scores 2 for his heels. Pegging starts.";
    } else {
        s.message = "Cut card is " + cardLabel(s.cutCard) + ". Pegging starts with " + s.players[s.turnIndex].name + ".";
    }

    if (!checkForWinner(s)) {
        renderCribbage();
        syncCribbage();
        queueBot();
    } else {
        renderCribbage();
        syncCribbage();
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
        s.players[playerIndex].score += gained.points;
        addLog(s, s.players[playerIndex].name + " played " + cardLabel(card) + ". Count " + totalAfter + ". +" + gained.points + " for " + gained.reason + ".");
        s.message = s.players[playerIndex].name + " played " + cardLabel(card) + ". Count is " + totalAfter + ". Scores " + gained.points + " for " + gained.reason + ".";
    } else {
        addLog(s, s.players[playerIndex].name + " played " + cardLabel(card) + ". Count " + totalAfter + ". No points.");
        s.message = s.players[playerIndex].name + " played " + cardLabel(card) + ". Count is " + totalAfter + ". No points.";
    }

    if (checkForWinner(s)) return true;

    if (totalAfter === 31) {
        s.peggingTotal = 0;
        s.peggingStack = [];
        s.goFlags = [false, false];
        s.turnIndex = 1 - playerIndex;
        s.message += " Count resets to 0.";
    } else {
        s.turnIndex = 1 - playerIndex;
    }

    maybeEndPegging(s);
    return true;
}

function peggingScoreForPlay(s) {
    let points = 0;
    const reasons = [];

    if (s.peggingTotal === 15) {
        points += 2;
        reasons.push("15");
    }

    if (s.peggingTotal === 31) {
        points += 2;
        reasons.push("31");
    }

    const sameRankCount = countSameRankAtEnd(s.peggingStack);

    if (sameRankCount === 2) {
        points += 2;
        reasons.push("pair");
    } else if (sameRankCount === 3) {
        points += 6;
        reasons.push("three of a kind");
    } else if (sameRankCount === 4) {
        points += 12;
        reasons.push("four of a kind");
    }

    const runPoints = peggingRunScore(s.peggingStack);

    if (runPoints >= 3) {
        points += runPoints;
        reasons.push("run of " + runPoints);
    }

    return {
        points: points,
        reason: reasons.join(" + ") || "play"
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
    queueBot();
};

function sayGo(s, playerIndex) {
    if (canPlayAny(s, playerIndex)) {
        s.message = "You still have a playable card.";
        return;
    }

    s.goFlags[playerIndex] = true;
    addLog(s, s.players[playerIndex].name + " says Go.");

    const other = 1 - playerIndex;

    if (canPlayAny(s, other)) {
        s.turnIndex = other;
        s.message = s.players[playerIndex].name + " says Go. " + s.players[other].name + " can still play.";
        return;
    }

    if (s.lastPlayerToPlay !== null && s.peggingTotal > 0) {
        s.players[s.lastPlayerToPlay].score += 1;
        addLog(s, s.players[s.lastPlayerToPlay].name + " scores 1 for Go.");
        s.message = "Both players are stuck. " + s.players[s.lastPlayerToPlay].name + " scores 1 for Go. Count resets.";
        if (checkForWinner(s)) return;
    }

    s.peggingTotal = 0;
    s.peggingStack = [];
    s.goFlags = [false, false];

    if (s.lastPlayerToPlay !== null) {
        s.turnIndex = 1 - s.lastPlayerToPlay;
    }

    maybeEndPegging(s);

    if (s.phase === "pegging") {
        s.message += " " + s.players[s.turnIndex].name + " starts the next count.";
    }
}

function maybeEndPegging(s) {
    if (s.phase !== "pegging") return;

    const noCardsLeft = s.playHands[0].length === 0 && s.playHands[1].length === 0;

    if (!noCardsLeft) return;

    if (s.peggingTotal > 0 && s.lastPlayerToPlay !== null) {
        s.players[s.lastPlayerToPlay].score += 1;
        addLog(s, s.players[s.lastPlayerToPlay].name + " scores 1 for last card.");
        if (checkForWinner(s)) return;
    }

    prepareCountingStages(s);
}

function prepareCountingStages(s) {
    const nonDealer = 1 - s.dealerIndex;
    const dealer = s.dealerIndex;

    const poneHand = scoreCribbageHand(s.hands[nonDealer], s.cutCard, false);
    const dealerHand = scoreCribbageHand(s.hands[dealer], s.cutCard, false);
    const cribScore = scoreCribbageHand(s.crib, s.cutCard, true);

    s.countStages = [
        {
            title: "Count " + s.players[nonDealer].name + "'s Hand",
            shortTitle: "Pone Hand",
            playerIndex: nonDealer,
            cards: s.hands[nonDealer].slice(),
            cutCard: s.cutCard,
            score: poneHand.total,
            lines: poneHand.lines,
            applied: false,
            kind: "hand"
        },
        {
            title: "Count " + s.players[dealer].name + "'s Hand",
            shortTitle: "Dealer Hand",
            playerIndex: dealer,
            cards: s.hands[dealer].slice(),
            cutCard: s.cutCard,
            score: dealerHand.total,
            lines: dealerHand.lines,
            applied: false,
            kind: "hand"
        },
        {
            title: "Count " + s.players[dealer].name + "'s Crib",
            shortTitle: "Crib",
            playerIndex: dealer,
            cards: s.crib.slice(),
            cutCard: s.cutCard,
            score: cribScore.total,
            lines: cribScore.lines,
            applied: false,
            kind: "crib"
        }
    ];

    s.countStageIndex = 0;
    s.phase = "counting";
    s.peggingTotal = 0;
    s.peggingStack = [];
    s.message = "Pegging is done. Review each hand before adding points.";
    addLog(s, "Pegging finished. Counting starts with " + s.players[nonDealer].name + ".");
}

function currentCountStage(s) {
    if (!s || !s.countStages) return null;
    return s.countStages[s.countStageIndex] || null;
}

window.applyCribbageCountStage = function () {
    const s = window.cribbageState;
    if (!s || s.phase !== "counting") return;

    const stage = currentCountStage(s);

    if (!stage) {
        s.phase = "roundover";
        s.message = "Round complete. Tap Next Round.";
        renderCribbage();
        syncCribbage();
        return;
    }

    if (!stage.applied) {
        s.players[stage.playerIndex].score += stage.score;
        stage.applied = true;

        addLog(s, stage.shortTitle + ": " + s.players[stage.playerIndex].name + " scores " + stage.score + ".");
        s.message = s.players[stage.playerIndex].name + " scores " + stage.score + " for " + stage.shortTitle + ".";

        if (checkForWinner(s)) {
            renderCribbage();
            syncCribbage();
            return;
        }
    }

    s.countStageIndex += 1;

    if (s.countStageIndex >= s.countStages.length) {
        s.phase = "roundover";
        s.message = "Round complete. Tap Next Round.";
    } else {
        const next = currentCountStage(s);
        s.message += " Next: " + next.title + ".";
    }

    renderCribbage();
    syncCribbage();
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

function scoreCribbageHand(hand, cutCard, isCrib) {
    const allCards = hand.concat([cutCard]);
    let total = 0;
    const lines = [];

    for (let size = 2; size <= allCards.length; size++) {
        combinations(allCards, size).forEach(function (combo) {
            const sum = combo.reduce(function (acc, card) {
                return acc + countValue(card);
            }, 0);

            if (sum === 15) {
                total += 2;
                lines.push(cardListText(combo) + " = 15 for 2");
            }
        });
    }

    combinations(allCards, 2).forEach(function (combo) {
        if (combo[0].rank === combo[1].rank) {
            total += 2;
            lines.push(cardListText(combo) + " pair for 2");
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

    if (bestRunLength) {
        total += bestRunLength * runCount;

        if (runCount > 1) {
            lines.push(runCount + " runs of " + bestRunLength + " for " + (bestRunLength * runCount));
        } else {
            lines.push("Run of " + bestRunLength + " for " + bestRunLength);
        }
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
            lines.push("Flush for 5");
        } else if (!isCrib) {
            total += 4;
            lines.push("Flush for 4");
        }
    }

    hand.forEach(function (card) {
        if (card.rank === "J" && cutCard && card.suit === cutCard.suit) {
            total += 1;
            lines.push("Nobs: " + cardLabel(card) + " matches cut suit for 1");
        }
    });

    if (!lines.length) {
        lines.push("No points in this hand.");
    }

    return {
        total: total,
        lines: lines
    };
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
    const clickAttr = disabled ? "disabled" : "onclick=\"" + onClick + "\"";

    return (
        "<button class=\"crib-card " +
        (red ? "red" : "black") +
        (selected ? " selected" : "") +
        "\" " + clickAttr + " type=\"button\">" +
            "<span class=\"rank\">" + escapeHtml(card.rank) + "</span>" +
            "<span class=\"suit\">" + escapeHtml(card.suit) + "</span>" +
        "</button>"
    );
}

function hiddenCard(count) {
    let html = "";

    for (let i = 0; i < count; i++) {
        html += "<div class=\"crib-card back\"><span>?</span></div>";
    }

    return html;
}

function pegPercent(score) {
    return Math.max(0, Math.min(100, (Number(score || 0) / WIN_SCORE) * 100));
}

function renderPegTrack(player, index) {
    return (
        "<div class=\"crib-track-row\">" +
            "<div class=\"crib-track-label\">" + escapeHtml(player.name) + ": " + Number(player.score || 0) + "</div>" +
            "<div class=\"crib-track\">" +
                "<div class=\"crib-track-fill\"></div>" +
                "<div class=\"crib-peg p" + index + "\" style=\"left:" + pegPercent(player.score) + "%\"></div>" +
                "<div class=\"crib-track-num start\">0</div>" +
                "<div class=\"crib-track-num finish\">121</div>" +
            "</div>" +
        "</div>"
    );
}

function renderCountStage(s) {
    const stage = currentCountStage(s);

    if (!stage) {
        return "<div class=\"crib-count-review\"><div class=\"crib-review-title\">Counting complete.</div></div>";
    }

    const cardsHtml = stage.cards.map(function (card) {
        return cardButton(card, "", false, true);
    }).join("");

    const cutHtml = stage.cutCard
        ? cardButton(stage.cutCard, "", false, true)
        : "<div class=\"crib-card back\"><span>?</span></div>";

    const lineHtml = stage.lines.map(function (line) {
        return "<div class=\"crib-break-line\">" + escapeHtml(line) + "</div>";
    }).join("");

    return (
        "<div class=\"crib-count-review\">" +
            "<div class=\"crib-review-title\">" + escapeHtml(stage.title) + "</div>" +
            "<div class=\"crib-review-subtitle\">Review the cards, then tap Add Points / Next Count.</div>" +
            "<div class=\"crib-count-cards\">" +
                "<div>" +
                    "<div class=\"crib-tiny-label\">Hand</div>" +
                    "<div class=\"crib-hand review\">" + cardsHtml + "</div>" +
                "</div>" +
                "<div>" +
                    "<div class=\"crib-tiny-label\">Cut</div>" +
                    "<div class=\"crib-hand review\">" + cutHtml + "</div>" +
                "</div>" +
            "</div>" +
            "<div class=\"crib-breakdown\">" +
                lineHtml +
                "<div class=\"crib-total-line\">Total: " + Number(stage.score || 0) + "</div>" +
            "</div>" +
        "</div>"
    );
}

function renderCribbage() {
    const el = canvas();
    const s = window.cribbageState;

    if (!el || !s) return;

    const meIndex = myPlayerIndex();
    const me = s.players[meIndex] || s.players[0];
    const opponentIndex = 1 - meIndex;
    const opponent = s.players[opponentIndex] || s.players[1];

    const myTurn = s.turnIndex === meIndex;
    const selected = selectedDiscardIndexes(s, meIndex);
    const myDiscardReady = s.phase === "discard" && selected.length === 2 && canLocalPlayerActFor(meIndex);
    const canCut = s.phase === "cut";
    const myPlayable = s.phase === "pegging" ? playableCards(s, meIndex) : [];
    const canSayGo = s.phase === "pegging" && myTurn && canLocalPlayerActFor(meIndex) && myPlayable.length === 0;
    const canCountNext = s.phase === "counting";
    const canNextRound = s.phase === "roundover";
    const gameOver = s.phase === "gameover";

    let myHandHtml = "";
    let opponentHandHtml = "";

    if (s.phase === "discard") {
        myHandHtml = s.hands[meIndex].map(function (card, i) {
            return cardButton(card, "toggleCribbageDiscard(" + i + ")", selected.indexOf(i) !== -1, !canLocalPlayerActFor(meIndex));
        }).join("");

        opponentHandHtml = hiddenCard(s.hands[opponentIndex].length);
    } else if (s.phase === "pegging") {
        myHandHtml = s.playHands[meIndex].map(function (card) {
            const disabled = !myTurn || !canLocalPlayerActFor(meIndex) || (s.peggingTotal + countValue(card) > 31);
            return cardButton(card, "playCribbageCard('" + card.uid + "')", false, disabled);
        }).join("");

        opponentHandHtml = hiddenCard(s.playHands[opponentIndex].length);
    } else if (s.phase === "counting" || s.phase === "roundover" || s.phase === "gameover") {
        myHandHtml = s.hands[meIndex].map(function (card) {
            return cardButton(card, "", false, true);
        }).join("");

        opponentHandHtml = s.hands[opponentIndex].map(function (card) {
            return cardButton(card, "", false, true);
        }).join("");
    } else {
        myHandHtml = s.hands[meIndex].map(function (card) {
            return cardButton(card, "", false, true);
        }).join("");
    }

    if (!myHandHtml) {
        myHandHtml = "<div class=\"crib-empty-hand\">No cards left in hand.</div>";
    }

    if (!opponentHandHtml) {
        opponentHandHtml = "<div class=\"crib-empty-hand\">No cards showing.</div>";
    }

    const playedHtml = s.peggingStack.length
        ? s.peggingStack.map(function (entry) {
            return (
                "<div class=\"crib-played-card\">" +
                    "<div>" + escapeHtml(cardLabel(entry.card)) + "</div>" +
                    "<small>" + escapeHtml(s.players[entry.playerIndex].name) + "</small>" +
                "</div>"
            );
        }).join("")
        : "<div class=\"crib-empty-play\">Pegging cards will show here.</div>";

    const logHtml = s.log && s.log.length
        ? s.log.map(function (line) {
            return "<div class=\"crib-log-line\">" + escapeHtml(line) + "</div>";
        }).join("")
        : "<div class=\"crib-log-line\">Game log will show here.</div>";

    const cutHtml = s.cutCard
        ? "<div class=\"crib-cut-card " + ((s.cutCard.suit === "♥" || s.cutCard.suit === "♦") ? "red" : "") + "\">" + escapeHtml(cardLabel(s.cutCard)) + "</div>"
        : "<div class=\"crib-cut-card empty\">?</div>";

    const countStageHtml = s.phase === "counting" ? renderCountStage(s) : "";

    el.innerHTML = [
        "<style>",
            ".crib-wrap{width:100%;height:100%;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;box-sizing:border-box;padding:7px 8px 90px;color:#e2f0d9;font-family:Arial,sans-serif;text-align:center;}",
            ".crib-title{color:#ffd700;font-size:26px;font-weight:900;margin:0 0 4px;text-shadow:0 3px 8px rgba(0,0,0,.7);}",
            ".crib-stage{color:#e2f0d9;font-size:13px;font-weight:900;text-transform:uppercase;margin:0 auto 6px;letter-spacing:.5px;}",
            ".crib-message{background:#0b2410;border:2px solid #ffd700;border-radius:12px;color:#ffd700;font-weight:900;font-size:14px;line-height:1.2;padding:7px 8px;margin:0 auto 8px;max-width:560px;box-sizing:border-box;}",
            ".crib-score-row{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:0 auto 8px;max-width:560px;}",
            ".crib-player{background:#e2f0d9;color:#1e4620;border:3px solid transparent;border-radius:12px;padding:7px 5px;box-sizing:border-box;font-weight:900;}",
            ".crib-player.turn{border-color:#ff0000;box-shadow:0 0 0 2px #ff0000;}",
            ".crib-player.dealer{outline:2px solid #ffd700;}",
            ".crib-player-name{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            ".crib-player-score{font-size:23px;line-height:1;margin-top:2px;}",
            ".crib-mini{font-size:11px;margin-top:2px;color:#2d6a30;text-transform:uppercase;}",
            ".crib-board{background:#123d18;border:3px solid #e2f0d9;border-radius:16px;box-shadow:0 8px 20px rgba(0,0,0,.45);max-width:560px;margin:0 auto 8px;overflow:hidden;padding:8px;box-sizing:border-box;}",
            ".crib-track-row{margin:0 auto 8px;text-align:left;}",
            ".crib-track-label{font-size:12px;font-weight:900;color:#ffd700;margin:0 0 3px 2px;}",
            ".crib-track{height:24px;background:#0b2410;border:2px solid #ffd700;border-radius:999px;position:relative;box-sizing:border-box;overflow:hidden;}",
            ".crib-track-fill{position:absolute;left:0;top:0;bottom:0;width:100%;background:repeating-linear-gradient(90deg,rgba(226,240,217,.16) 0,rgba(226,240,217,.16) 7px,rgba(255,215,0,.12) 7px,rgba(255,215,0,.12) 14px);}",
            ".crib-peg{position:absolute;top:50%;width:17px;height:17px;border-radius:50%;transform:translate(-50%,-50%);border:3px solid #ffffff;box-shadow:0 0 9px rgba(0,0,0,.8);z-index:2;}",
            ".crib-peg.p0{background:#ff0000;}",
            ".crib-peg.p1{background:#3d85c6;}",
            ".crib-track-num{position:absolute;top:50%;transform:translateY(-50%);font-size:9px;font-weight:900;color:#e2f0d9;opacity:.75;z-index:1;}",
            ".crib-track-num.start{left:8px;}",
            ".crib-track-num.finish{right:8px;}",
            ".crib-table{background:#123d18;border:3px solid #e2f0d9;border-radius:16px;box-shadow:0 8px 20px rgba(0,0,0,.45);max-width:560px;margin:0 auto 8px;overflow:hidden;}",
            ".crib-table-head{display:grid;grid-template-columns:1fr 90px 1fr;gap:6px;align-items:center;background:#0b2410;border-bottom:2px solid #ffd700;padding:8px;}",
            ".crib-count-box{background:#ffd700;color:#1e4620;border-radius:12px;padding:6px 4px;font-weight:900;}",
            ".crib-count-number{font-size:25px;line-height:1;}",
            ".crib-count-label{font-size:10px;text-transform:uppercase;}",
            ".crib-cut-label{font-size:11px;font-weight:900;color:#e2f0d9;text-transform:uppercase;}",
            ".crib-cut-card{width:54px;height:70px;margin:2px auto 0;background:#ffffff;color:#111;border-radius:8px;border:2px solid #ffd700;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;}",
            ".crib-cut-card.red{color:#dc3545;}",
            ".crib-cut-card.empty{background:#234b25;color:#ffd700;}",
            ".crib-play-area{padding:8px;}",
            ".crib-played-row{display:flex;gap:5px;justify-content:center;align-items:center;flex-wrap:wrap;min-height:46px;}",
            ".crib-played-card{background:#ffffff;color:#111;border:2px solid #ffd700;border-radius:8px;min-width:45px;padding:5px 4px;font-weight:900;box-sizing:border-box;}",
            ".crib-played-card small{display:block;font-size:8px;color:#1e4620;max-width:52px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            ".crib-empty-play,.crib-empty-hand{color:#ffd700;font-size:13px;font-weight:900;padding:8px;}",
            ".crib-section-title{font-size:13px;font-weight:900;color:#ffd700;text-transform:uppercase;margin:8px 0 5px;}",
            ".crib-hand{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;margin:0 auto 8px;max-width:560px;}",
            ".crib-hand.review{margin-bottom:4px;}",
            ".crib-card{position:relative;width:48px;height:66px;border-radius:8px;border:2px solid #ffffff;background:#ffffff;color:#111;font-weight:900;box-shadow:0 3px 7px rgba(0,0,0,.35);box-sizing:border-box;}",
            ".crib-card .rank{position:absolute;top:5px;left:6px;font-size:17px;}",
            ".crib-card .suit{position:absolute;bottom:5px;right:7px;font-size:22px;}",
            ".crib-card.red{color:#dc3545;}",
            ".crib-card.black{color:#111111;}",
            ".crib-card.selected{border:4px solid #ff0000;transform:translateY(-5px);}",
            ".crib-card:disabled{opacity:.85;transform:none;}",
            ".crib-card.back{background:#0b2410;color:#ffd700;border-color:#ffd700;display:flex;align-items:center;justify-content:center;font-size:24px;}",
            ".crib-actions{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:7px auto 8px;max-width:560px;}",
            ".crib-actions button{border:none;border-radius:999px;padding:9px 12px;font-size:13px;font-weight:900;background:#ffd700;color:#1e4620;box-shadow:0 3px 9px rgba(0,0,0,.35);}",
            ".crib-actions button:disabled{background:#777!important;color:#222!important;box-shadow:none!important;}",
            ".crib-count-review{background:#0b2410;border:3px solid #ffd700;border-radius:16px;max-width:560px;margin:0 auto 8px;padding:9px;box-sizing:border-box;}",
            ".crib-review-title{font-size:20px;font-weight:900;color:#ffd700;margin-bottom:3px;}",
            ".crib-review-subtitle{font-size:12px;color:#e2f0d9;font-weight:900;margin-bottom:7px;}",
            ".crib-count-cards{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start;}",
            ".crib-tiny-label{font-size:11px;font-weight:900;color:#ffd700;text-transform:uppercase;margin-bottom:3px;}",
            ".crib-breakdown{background:#e2f0d9;color:#1e4620;border-radius:12px;margin-top:8px;padding:7px 8px;text-align:left;font-weight:900;}",
            ".crib-break-line{font-size:12px;line-height:1.25;border-bottom:1px dashed rgba(30,70,32,.25);padding:3px 0;}",
            ".crib-total-line{font-size:17px;color:#b00020;text-align:center;padding-top:6px;}",
            ".crib-log{background:#0b2410;border:2px solid rgba(255,215,0,.7);border-radius:12px;max-width:560px;margin:0 auto;padding:6px 8px;box-sizing:border-box;text-align:left;}",
            ".crib-log-line{font-size:12px;line-height:1.25;color:#e2f0d9;border-bottom:1px dashed rgba(226,240,217,.25);padding:3px 0;}",
            ".crib-log-line:last-child{border-bottom:0;}",
            "@media(max-width:390px),(max-height:735px){",
                ".crib-wrap{padding:6px 6px 92px;}",
                ".crib-title{font-size:23px;}",
                ".crib-message{font-size:13px;padding:6px;}",
                ".crib-card{width:44px;height:62px;}",
                ".crib-card .rank{font-size:15px;}",
                ".crib-card .suit{font-size:20px;}",
                ".crib-player-score{font-size:20px;}",
                ".crib-actions button{padding:8px 10px;font-size:12px;}",
                ".crib-count-cards{grid-template-columns:1fr;}",
            "}",
        "</style>",

        "<div class=\"crib-wrap\">",
            "<div class=\"crib-title\">Cribbage</div>",
            "<div class=\"crib-stage\">", escapeHtml(phaseLabel(s)), "</div>",
            "<div class=\"crib-message\">", escapeHtml(s.message), "</div>",

            "<div class=\"crib-score-row\">",
                "<div class=\"crib-player ", s.turnIndex === meIndex ? "turn " : "", s.dealerIndex === meIndex ? "dealer" : "", "\">",
                    "<div class=\"crib-player-name\">", escapeHtml(me.name), "</div>",
                    "<div class=\"crib-player-score\">", Number(me.score || 0), "</div>",
                    "<div class=\"crib-mini\">", s.dealerIndex === meIndex ? "Dealer / Crib" : "Pone", "</div>",
                "</div>",
                "<div class=\"crib-player ", s.turnIndex === opponentIndex ? "turn " : "", s.dealerIndex === opponentIndex ? "dealer" : "", "\">",
                    "<div class=\"crib-player-name\">", escapeHtml(opponent.name), "</div>",
                    "<div class=\"crib-player-score\">", Number(opponent.score || 0), "</div>",
                    "<div class=\"crib-mini\">", s.dealerIndex === opponentIndex ? "Dealer / Crib" : "Pone", "</div>",
                "</div>",
            "</div>",

            "<div class=\"crib-board\">",
                renderPegTrack(s.players[0], 0),
                renderPegTrack(s.players[1], 1),
            "</div>",

            "<div class=\"crib-table\">",
                "<div class=\"crib-table-head\">",
                    "<div>",
                        "<div class=\"crib-cut-label\">Cut Card</div>",
                        cutHtml,
                    "</div>",
                    "<div class=\"crib-count-box\">",
                        "<div class=\"crib-count-number\">", Number(s.peggingTotal || 0), "</div>",
                        "<div class=\"crib-count-label\">Count to 31</div>",
                    "</div>",
                    "<div>",
                        "<div class=\"crib-cut-label\">Crib Owner</div>",
                        "<div class=\"crib-cut-card empty\" style=\"font-size:12px;padding:4px;line-height:1.1;\">", escapeHtml(s.players[s.dealerIndex].name), "</div>",
                    "</div>",
                "</div>",
                "<div class=\"crib-play-area\">",
                    "<div class=\"crib-section-title\">Pegging Row</div>",
                    "<div class=\"crib-played-row\">", playedHtml, "</div>",
                "</div>",
            "</div>",

            countStageHtml,

            "<div class=\"crib-section-title\">Your Cards</div>",
            "<div class=\"crib-hand\">", myHandHtml, "</div>",

            "<div class=\"crib-section-title\">Other Player</div>",
            "<div class=\"crib-hand\">", opponentHandHtml, "</div>",

            "<div class=\"crib-actions\">",
                "<button onclick=\"confirmCribbageDiscards()\" ", myDiscardReady ? "" : "disabled", " type=\"button\">Send to Crib</button>",
                "<button onclick=\"cutCribbageDeck()\" ", canCut ? "" : "disabled", " type=\"button\">Cut Card</button>",
                "<button onclick=\"cribbageGo()\" ", canSayGo ? "" : "disabled", " type=\"button\">Go</button>",
                "<button onclick=\"applyCribbageCountStage()\" ", canCountNext ? "" : "disabled", " type=\"button\">Add Points / Next Count</button>",
                "<button onclick=\"nextCribbageRound()\" ", canNextRound ? "" : "disabled", " type=\"button\">Next Round</button>",
                "<button onclick=\"resetCribbageGame()\" type=\"button\">New Game</button>",
            "</div>",

            "<div class=\"crib-log\">", logHtml, "</div>",
        "</div>"
    ].join("");

    queueBot();
}

window.renderCribbage = renderCribbage;
```

})();
