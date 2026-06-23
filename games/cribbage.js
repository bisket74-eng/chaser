
/* CHASER CRIBBAGE - SEPARATE GAME FILE
1-player vs computer or 2-player synced through Chaser.
*/
(function () {
"use strict";

const WIN_SCORE = 121;
const BOT_ID = "cribbage-computer-player";

let botTimer = null;

function byId(id) {
    return document.getElementById(id);
}

function canvas() {
    return byId("gameCanvasContainer");
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

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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

function makeDeck() {
    const suits = ["♠", "♥", "♦", "♣"];
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const deck = [];

    suits.forEach(function (suit) {
        ranks.forEach(function (rank) {
            deck.push({
                rank: rank,
                suit: suit,
                uid: rank + suit + "-" + Math.random().toString(36).slice(2, 8)
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
        .filter(function (p) { return p && p.id; })
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
        log: []
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
    s.log = [];

    for (let i = 0; i < 6; i++) {
        s.hands[0].push(s.deck.pop());
        s.hands[1].push(s.deck.pop());
    }

    s.message = "Choose 2 cards for the crib. Dealer: " + s.players[s.dealerIndex].name + ".";
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

function isBotTurn() {
    const s = window.cribbageState;
    return !!(s && s.players[s.turnIndex] && s.players[s.turnIndex].isBot);
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

window.toggleCribbageDiscard = function (cardIndex) {
    const s = window.cribbageState;
    const pIndex = myPlayerIndex();

    if (!s || s.phase !== "discard") return;
    if (!canLocalPlayerActFor(pIndex)) return;

    const selected = selectedDiscardIndexes(s, pIndex);
    const already = selected.indexOf(cardIndex) !== -1;
    let next = selected.slice();

    if (already) {
        next = next.filter(function (n) { return n !== cardIndex; });
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
        .sort(function (a, b) { return b - a; })
        .forEach(function (idx) {
            if (hand[idx]) {
                s.crib.push(hand.splice(idx, 1)[0]);
            }
        });

    s.selectedDiscards[playerIndex] = [];
    addLog(s, s.players[playerIndex].name + " sent 2 cards to the crib.");
    return true;
}

function botChooseDiscards(s, playerIndex) {
    const hand = s.hands[playerIndex];
    if (!hand || hand.length <= 4) return;

    const scored = hand.map(function (card, index) {
        let value = countValue(card);

        if (card.rank === "5") value += 7;
        if (card.rank === "J") value += 2;

        return { index: index, keepValue: value };
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
    }

    s.message = s.players[s.turnIndex].name + " starts pegging.";

    checkForWinner(s);
    renderCribbage();
    syncCribbage();
    queueBot();
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

    let gained = peggingScoreForPlay(s);

    if (gained.points > 0) {
        s.players[playerIndex].score += gained.points;
        addLog(s, s.players[playerIndex].name + " played " + cardLabel(card) + " and scored " + gained.points + " for " + gained.reason + ".");
    } else {
        addLog(s, s.players[playerIndex].name + " played " + cardLabel(card) + ".");
    }

    if (s.peggingTotal === 31) {
        s.message = s.players[playerIndex].name + " hit 31.";
        s.peggingTotal = 0;
        s.peggingStack = [];
        s.goFlags = [false, false];
        s.turnIndex = 1 - playerIndex;
    } else {
        s.turnIndex = 1 - playerIndex;
        s.message = s.players[s.turnIndex].name + "'s turn.";
    }

    checkForWinner(s);
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

        unique.sort(function (a, b) { return a - b; });

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
        s.message = s.players[other].name + " can still play.";
        return;
    }

    if (s.lastPlayerToPlay !== null && s.peggingTotal > 0) {
        s.players[s.lastPlayerToPlay].score += 1;
        addLog(s, s.players[s.lastPlayerToPlay].name + " scores 1 for Go.");
        checkForWinner(s);
    }

    s.peggingTotal = 0;
    s.peggingStack = [];
    s.goFlags = [false, false];

    if (s.lastPlayerToPlay !== null) {
        s.turnIndex = 1 - s.lastPlayerToPlay;
    }

    s.message = s.players[s.turnIndex].name + " starts the next count.";
    maybeEndPegging(s);
}

function maybeEndPegging(s) {
    if (s.phase !== "pegging") return;

    const noCardsLeft = s.playHands[0].length === 0 && s.playHands[1].length === 0;

    if (!noCardsLeft) return;

    if (s.peggingTotal > 0 && s.lastPlayerToPlay !== null) {
        s.players[s.lastPlayerToPlay].score += 1;
        addLog(s, s.players[s.lastPlayerToPlay].name + " scores 1 for last card.");
    }

    scoreShow(s);
}

function scoreShow(s) {
    if (s.phase === "gameover") return;

    s.phase = "show";

    const nonDealer = 1 - s.dealerIndex;
    const dealer = s.dealerIndex;

    const nonDealerScore = scoreCribbageHand(s.hands[nonDealer], s.cutCard, false);
    s.players[nonDealer].score += nonDealerScore.total;
    addLog(s, s.players[nonDealer].name + " hand: " + nonDealerScore.total + " points.");

    if (checkForWinner(s)) return;

    const dealerScore = scoreCribbageHand(s.hands[dealer], s.cutCard, false);
    s.players[dealer].score += dealerScore.total;
    addLog(s, s.players[dealer].name + " hand: " + dealerScore.total + " points.");

    if (checkForWinner(s)) return;

    const cribScore = scoreCribbageHand(s.crib, s.cutCard, true);
    s.players[dealer].score += cribScore.total;
    addLog(s, s.players[dealer].name + " crib: " + cribScore.total + " points.");

    if (checkForWinner(s)) return;

    s.message = "Round complete. Tap Next Round.";
}

window.nextCribbageRound = function () {
    const s = window.cribbageState;
    if (!s || s.phase !== "show") return;

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

    unique.sort(function (a, b) { return a - b; });

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
                lines.push("15 for 2");
            }
        });
    }

    combinations(allCards, 2).forEach(function (combo) {
        if (combo[0].rank === combo[1].rank) {
            total += 2;
            lines.push("Pair for 2");
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
                    runCount++;
                }
            }
        });

        if (bestRunLength) break;
    }

    if (bestRunLength) {
        total += bestRunLength * runCount;
        lines.push((runCount > 1 ? runCount + "x " : "") + "Run of " + bestRunLength + " for " + (bestRunLength * runCount));
    }

    const handSuits = hand.map(function (card) { return card.suit; });
    const allHandSameSuit = handSuits.every(function (suit) {
        return suit === handSuits[0];
    });

    if (allHandSameSuit && hand.length === 4) {
        if (cutCard.suit === handSuits[0]) {
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
            lines.push("Nobs for 1");
        }
    });

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
            return countValue(a) - countValue(b);
        });

        playCardByUid(s, botIndex, playable[0].uid);
        renderCribbage();
        syncCribbage();
    }
}

function queueBot() {
    clearTimeout(botTimer);
    botTimer = setTimeout(botPlayIfNeeded, 650);
}

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

function cardButton(card, index, mode, selected, disabled) {
    const red = card.suit === "♥" || card.suit === "♦";

    return (
        "<button class=\"crib-card " + (red ? "red" : "black") + (selected ? " selected" : "") + "\" " +
        (disabled ? "disabled " : "") +
        "onclick=\"" + mode + "(" + (mode === "playCribbageCard" ? "'" + card.uid + "'" : index) + ")\" type=\"button\">" +
            "<span class=\"rank\">" + escapeHtml(card.rank) + "</span>" +
            "<span class=\"suit\">" + escapeHtml(card.suit) + "</span>" +
        "</button>"
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
    const canNextRound = s.phase === "show";
    const gameOver = s.phase === "gameover";

    let handHtml = "";

    if (s.phase === "discard") {
        handHtml = s.hands[meIndex].map(function (card, i) {
            return cardButton(card, i, "toggleCribbageDiscard", selected.indexOf(i) !== -1, !canLocalPlayerActFor(meIndex));
        }).join("");
    } else if (s.phase === "pegging") {
        handHtml = s.playHands[meIndex].map(function (card) {
            const disabled = !myTurn || !canLocalPlayerActFor(meIndex) || (s.peggingTotal + countValue(card) > 31);
            return cardButton(card, 0, "playCribbageCard", false, disabled);
        }).join("");
    } else {
        handHtml = s.hands[meIndex].map(function (card, i) {
            return cardButton(card, i, "toggleCribbageDiscard", false, true);
        }).join("");
    }

    if (!handHtml) {
        handHtml = "<div class=\"crib-empty-hand\">No cards left in hand.</div>";
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
        : "<div class=\"crib-empty-play\">No pegging cards yet.</div>";

    const logHtml = s.log && s.log.length
        ? s.log.map(function (line) {
            return "<div class=\"crib-log-line\">" + escapeHtml(line) + "</div>";
        }).join("")
        : "<div class=\"crib-log-line\">Game log will show here.</div>";

    const cutHtml = s.cutCard
        ? "<div class=\"crib-cut-card\">" + escapeHtml(cardLabel(s.cutCard)) + "</div>"
        : "<div class=\"crib-cut-card empty\">?</div>";

    el.innerHTML = [
        "<style>",
            ".crib-wrap{width:100%;height:100%;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;box-sizing:border-box;padding:8px 8px 88px;color:#e2f0d9;font-family:Arial,sans-serif;text-align:center;}",
            ".crib-title{color:#ffd700;font-size:28px;font-weight:900;margin:0 0 5px;text-shadow:0 3px 8px rgba(0,0,0,.7);}",
            ".crib-message{background:#0b2410;border:2px solid #ffd700;border-radius:12px;color:#ffd700;font-weight:900;font-size:14px;line-height:1.2;padding:7px 8px;margin:0 auto 8px;max-width:520px;box-sizing:border-box;}",
            ".crib-score-row{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:0 auto 8px;max-width:540px;}",
            ".crib-player{background:#e2f0d9;color:#1e4620;border:3px solid transparent;border-radius:12px;padding:7px 5px;box-sizing:border-box;font-weight:900;}",
            ".crib-player.turn{border-color:#ff0000;box-shadow:0 0 0 2px #ff0000;}",
            ".crib-player.dealer{outline:2px solid #ffd700;}",
            ".crib-player-name{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            ".crib-player-score{font-size:23px;line-height:1;margin-top:2px;}",
            ".crib-mini{font-size:11px;margin-top:2px;color:#2d6a30;text-transform:uppercase;}",
            ".crib-table{background:#123d18;border:3px solid #e2f0d9;border-radius:16px;box-shadow:0 8px 20px rgba(0,0,0,.45);max-width:560px;margin:0 auto 8px;overflow:hidden;}",
            ".crib-table-head{display:grid;grid-template-columns:1fr 90px 1fr;gap:6px;align-items:center;background:#0b2410;border-bottom:2px solid #ffd700;padding:8px;}",
            ".crib-count-box{background:#ffd700;color:#1e4620;border-radius:12px;padding:6px 4px;font-weight:900;}",
            ".crib-count-number{font-size:25px;line-height:1;}",
            ".crib-count-label{font-size:10px;text-transform:uppercase;}",
            ".crib-cut-label{font-size:11px;font-weight:900;color:#e2f0d9;text-transform:uppercase;}",
            ".crib-cut-card{width:54px;height:70px;margin:2px auto 0;background:#ffffff;color:#111;border-radius:8px;border:2px solid #ffd700;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;}",
            ".crib-cut-card.empty{background:#234b25;color:#ffd700;}",
            ".crib-play-area{padding:8px;}",
            ".crib-played-row{display:flex;gap:5px;justify-content:center;align-items:center;flex-wrap:wrap;min-height:46px;}",
            ".crib-played-card{background:#ffffff;color:#111;border:2px solid #ffd700;border-radius:8px;min-width:45px;padding:5px 4px;font-weight:900;box-sizing:border-box;}",
            ".crib-played-card small{display:block;font-size:8px;color:#1e4620;max-width:52px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            ".crib-empty-play,.crib-empty-hand{color:#ffd700;font-size:13px;font-weight:900;padding:8px;}",
            ".crib-section-title{font-size:13px;font-weight:900;color:#ffd700;text-transform:uppercase;margin:8px 0 5px;}",
            ".crib-hand{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;margin:0 auto 8px;max-width:540px;}",
            ".crib-card{position:relative;width:48px;height:66px;border-radius:8px;border:2px solid #ffffff;background:#ffffff;color:#111;font-weight:900;box-shadow:0 3px 7px rgba(0,0,0,.35);}",
            ".crib-card .rank{position:absolute;top:5px;left:6px;font-size:17px;}",
            ".crib-card .suit{position:absolute;bottom:5px;right:7px;font-size:22px;}",
            ".crib-card.red{color:#dc3545;}",
            ".crib-card.black{color:#111111;}",
            ".crib-card.selected{border:4px solid #ff0000;transform:translateY(-5px);}",
            ".crib-card:disabled{opacity:.55;transform:none;}",
            ".crib-actions{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:7px auto 8px;max-width:540px;}",
            ".crib-actions button{border:none;border-radius:999px;padding:9px 12px;font-size:13px;font-weight:900;background:#ffd700;color:#1e4620;box-shadow:0 3px 9px rgba(0,0,0,.35);}",
            ".crib-actions button:disabled{background:#777!important;color:#222!important;box-shadow:none!important;}",
            ".crib-log{background:#0b2410;border:2px solid rgba(255,215,0,.7);border-radius:12px;max-width:540px;margin:0 auto;padding:6px 8px;box-sizing:border-box;text-align:left;}",
            ".crib-log-line{font-size:12px;line-height:1.25;color:#e2f0d9;border-bottom:1px dashed rgba(226,240,217,.25);padding:3px 0;}",
            ".crib-log-line:last-child{border-bottom:0;}",
            "@media(max-width:390px),(max-height:735px){",
                ".crib-wrap{padding:6px 6px 90px;}",
                ".crib-title{font-size:24px;}",
                ".crib-message{font-size:13px;padding:6px;}",
                ".crib-card{width:44px;height:62px;}",
                ".crib-card .rank{font-size:15px;}",
                ".crib-card .suit{font-size:20px;}",
                ".crib-player-score{font-size:20px;}",
                ".crib-actions button{padding:8px 10px;font-size:12px;}",
            "}",
        "</style>",

        "<div class=\"crib-wrap\">",
            "<div class=\"crib-title\">Cribbage</div>",
            "<div class=\"crib-message\">", escapeHtml(s.message), "</div>",

            "<div class=\"crib-score-row\">",
                "<div class=\"crib-player ", s.turnIndex === meIndex ? "turn " : "", s.dealerIndex === meIndex ? "dealer" : "", "\">",
                    "<div class=\"crib-player-name\">", escapeHtml(me.name), "</div>",
                    "<div class=\"crib-player-score\">", Number(me.score || 0), "</div>",
                    "<div class=\"crib-mini\">", s.dealerIndex === meIndex ? "Dealer" : "Pone", "</div>",
                "</div>",
                "<div class=\"crib-player ", s.turnIndex === opponentIndex ? "turn " : "", s.dealerIndex === opponentIndex ? "dealer" : "", "\">",
                    "<div class=\"crib-player-name\">", escapeHtml(opponent.name), "</div>",
                    "<div class=\"crib-player-score\">", Number(opponent.score || 0), "</div>",
                    "<div class=\"crib-mini\">", s.dealerIndex === opponentIndex ? "Dealer" : "Pone", "</div>",
                "</div>",
            "</div>",

            "<div class=\"crib-table\">",
                "<div class=\"crib-table-head\">",
                    "<div>",
                        "<div class=\"crib-cut-label\">Cut Card</div>",
                        cutHtml,
                    "</div>",
                    "<div class=\"crib-count-box\">",
                        "<div class=\"crib-count-number\">", Number(s.peggingTotal || 0), "</div>",
                        "<div class=\"crib-count-label\">Count</div>",
                    "</div>",
                    "<div>",
                        "<div class=\"crib-cut-label\">Crib</div>",
                        "<div class=\"crib-cut-card empty\">", s.crib ? s.crib.length : 0, "</div>",
                    "</div>",
                "</div>",
                "<div class=\"crib-play-area\">",
                    "<div class=\"crib-section-title\">Pegging Row</div>",
                    "<div class=\"crib-played-row\">", playedHtml, "</div>",
                "</div>",
            "</div>",

            "<div class=\"crib-section-title\">Your Cards</div>",
            "<div class=\"crib-hand\">", handHtml, "</div>",

            "<div class=\"crib-actions\">",
                "<button onclick=\"confirmCribbageDiscards()\" ", myDiscardReady ? "" : "disabled", " type=\"button\">Send to Crib</button>",
                "<button onclick=\"cutCribbageDeck()\" ", canCut ? "" : "disabled", " type=\"button\">Cut Card</button>",
                "<button onclick=\"cribbageGo()\" ", canSayGo ? "" : "disabled", " type=\"button\">Go</button>",
                "<button onclick=\"nextCribbageRound()\" ", canNextRound ? "" : "disabled", " type=\"button\">Next Round</button>",
                "<button onclick=\"window.cribbageState=createState();renderCribbage();syncCribbage();\" ", gameOver ? "" : "", " type=\"button\">New Game</button>",
            "</div>",

            "<div class=\"crib-log\">", logHtml, "</div>",
        "</div>"
    ].join("");

    queueBot();
}

})();
