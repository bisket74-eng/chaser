/* CHASER TEXAS HOLDEM - SEPARATE GAME FILE
   Fake-chip Texas Hold'em
   1-6 players, synced rooms, solo vs computer Dealer
*/
;(function () {
"use strict";

const STARTING_CHIPS = 1000;
const SMALL_BLIND    = 10;
const BIG_BLIND      = 20;
const MAX_PLAYERS    = 6;
const DEALER_BOT_ID  = "texas-holdem-dealer-bot";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = [
    { r: "2", v: 2 }, { r: "3", v: 3 }, { r: "4", v: 4 }, { r: "5", v: 5 },
    { r: "6", v: 6 }, { r: "7", v: 7 }, { r: "8", v: 8 }, { r: "9", v: 9 },
    { r: "10", v: 10 }, { r: "J", v: 11 }, { r: "Q", v: 12 },
    { r: "K", v: 13  }, { r: "A", v: 14 }
];

/* ── Utilities ── */

function getMyId() {
    if (typeof window.myId === "function") return window.myId();
    if (typeof window.myId === "string")   return window.myId;
    return localStorage.getItem("rider_id") || "local-player";
}

function myName() {
    const input = document.getElementById("username");
    return (input && input.value.trim()) || localStorage.getItem("rider_saved_name") || "Player";
}

function canvas() { return document.getElementById("gameCanvasContainer"); }

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function openStage() {
    const stage = document.getElementById("activeGameStage");
    if (stage) stage.classList.add("open");
}

function setHeader() {
    const roomDisplay  = document.getElementById("roomDisplayCode");
    const headerBtns   = document.getElementById("headerActionButtonsContainer");
    const chatHeader   = document.getElementById("chatHeader");
    if (roomDisplay) roomDisplay.innerText = "♠️ Texas Hold'em";
    if (headerBtns)  headerBtns.style.display = "none";
    if (chatHeader)  chatHeader.classList.add("game-active-mode");
}

function syncTexas() {
    if (typeof channel !== "undefined" && channel && window.texasHoldemState) {
        channel.send({
            type: "broadcast",
            event: "texasholdem-sync-state",
            payload: {
                state: window.texasHoldemState,
                roomGameId: window.chaserGame && window.chaserGame.activeGameId
                    ? window.chaserGame.activeGameId : null
            }
        });
    }
}

/* ── Deck ── */

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
    return deck;
}

function makeDeck() {
    const deck = [];
    SUITS.forEach(function (suit) {
        RANKS.forEach(function (rank) {
            deck.push({ suit: suit, rank: rank.r, value: rank.v });
        });
    });
    return shuffleDeck(deck);
}

/* ── Players / State ── */

function makePlayers() {
    const lobby = window.chaserGame && window.chaserGame.players && window.chaserGame.players.length
        ? window.chaserGame.players
        : [{ id: getMyId(), name: myName(), seat: 0 }];

    const players = lobby.slice(0, MAX_PLAYERS).map(function (p, idx) {
        return {
            id: p.id, name: p.name || "Player " + (idx + 1), isComputer: false,
            chips: STARTING_CHIPS, hand: [], folded: false, allIn: false,
            bet: 0, acted: false, lastAction: ""
        };
    });

    if (players.length === 1) {
        players.push({
            id: DEALER_BOT_ID, name: "Computer", isComputer: true,
            chips: STARTING_CHIPS, hand: [], folded: false, allIn: false,
            bet: 0, acted: false, lastAction: ""
        });
    }
    return players;
}

function createState() {
    return {
        phase: "table", handNumber: 0, deck: [], community: [],
        players: makePlayers(), dealerIndex: 0, turnIndex: 0,
        round: "waiting", pot: 0, currentBet: 0, minRaise: BIG_BLIND,
        message: "Tap Deal Hand to start.", lastResult: "", winners: []
    };
}

/* ── Player queries ── */

function playersInHand() {
    const st = window.texasHoldemState;
    if (!st) return [];
    return st.players.filter(function (p) { return p.hand && p.hand.length; });
}

function livePlayers() {
    return playersInHand().filter(function (p) { return !p.folded; });
}

function myPlayer() {
    const st = window.texasHoldemState;
    if (!st) return null;
    return st.players.find(function (p) { return p.id === getMyId(); }) || null;
}

function currentPlayer() {
    const st = window.texasHoldemState;
    if (!st) return null;
    return st.players[st.turnIndex] || null;
}

function isMyTurn() {
    const p = currentPlayer();
    return p && p.id === getMyId();
}

/* ── Index helpers ── */

function nextIndexFrom(startIndex, filterFn) {
    const st = window.texasHoldemState;
    if (!st || !st.players.length) return 0;
    for (let step = 1; step <= st.players.length; step++) {
        const idx = (startIndex + step) % st.players.length;
        if (filterFn(st.players[idx], idx)) return idx;
    }
    return startIndex;
}

function firstActiveIndexAfter(startIndex) {
    return nextIndexFrom(startIndex, function (p) {
        return p.hand.length && !p.folded && !p.allIn && p.chips > 0;
    });
}

/* ── Betting primitives ── */

function resetBetsForNewRound() {
    const st = window.texasHoldemState;
    st.currentBet = 0;
    st.minRaise   = BIG_BLIND;
    st.players.forEach(function (p) { p.bet = 0; p.acted = false; });
}

function commitBet(player, amount) {
    const paid = Math.max(0, Math.min(player.chips, amount));
    player.chips -= paid;
    player.bet   += paid;
    window.texasHoldemState.pot += paid;
    if (player.chips <= 0) { player.chips = 0; player.allIn = true; }
    return paid;
}

function postBlind(index, amount, label) {
    const st = window.texasHoldemState;
    const p  = st.players[index];
    commitBet(p, amount);
    p.acted     = false;
    p.lastAction = label + " " + amount;
    if (p.bet > st.currentBet) st.currentBet = p.bet;
}

/* ── Deal ── */

function dealHand() {
    const st = window.texasHoldemState;
    if (!st) return;

    window.texasPendingBet = 0;

    let seated = st.players.filter(function (p) { return p.chips > 0; });
    if (seated.length < 2) { st.players = makePlayers(); seated = st.players; }

    st.phase = "playing"; st.round = "preflop"; st.handNumber++;
    st.deck = makeDeck(); st.community = []; st.pot = 0;
    st.currentBet = 0; st.minRaise = BIG_BLIND; st.winners = []; st.lastResult = "";

    st.players.forEach(function (p) {
        p.hand = []; p.folded = false; p.allIn = false;
        p.bet = 0; p.acted = false; p.lastAction = "";
    });
    st.players.forEach(function (p) {
        if (p.chips > 0) { p.hand.push(st.deck.pop()); p.hand.push(st.deck.pop()); }
    });

    const handPlayers = playersInHand();
    if (handPlayers.length < 2) {
        st.message = "Need at least two players with chips.";
        st.phase = "table"; return;
    }

    st.dealerIndex = nextIndexFrom(st.dealerIndex - 1 + st.players.length, function (p) {
        return p.hand.length && p.chips >= 0;
    });

    let sbIdx, bbIdx;
    if (handPlayers.length === 2) {
        sbIdx = st.dealerIndex;
        bbIdx = nextIndexFrom(sbIdx, function (p) { return p.hand.length; });
    } else {
        sbIdx = nextIndexFrom(st.dealerIndex, function (p) { return p.hand.length; });
        bbIdx = nextIndexFrom(sbIdx,           function (p) { return p.hand.length; });
    }

    postBlind(sbIdx, SMALL_BLIND, "SB");
    postBlind(bbIdx, BIG_BLIND,   "BB");

    st.turnIndex = nextIndexFrom(bbIdx, function (p) {
        return p.hand.length && !p.folded && !p.allIn && p.chips > 0;
    });
    st.message = st.players[st.turnIndex].name + " to act.";

    renderTexas();
    syncTexas();
    maybeComputerAction();
}

/* ── Round management ── */

function bettingRoundComplete() {
    const st   = window.texasHoldemState;
    const live = livePlayers();
    if (live.length <= 1) return true;
    return live.every(function (p) {
        if (p.allIn || p.chips <= 0) return true;
        return p.acted && p.bet === st.currentBet;
    });
}

function advanceRound() {
    const st = window.texasHoldemState;
    window.texasPendingBet = 0;

    if (livePlayers().length <= 1) { finishHand(); return; }

    if (st.round === "preflop") {
        resetBetsForNewRound();
        st.community.push(st.deck.pop()); st.community.push(st.deck.pop()); st.community.push(st.deck.pop());
        st.round = "flop";
    } else if (st.round === "flop") {
        resetBetsForNewRound(); st.community.push(st.deck.pop()); st.round = "turn";
    } else if (st.round === "turn") {
        resetBetsForNewRound(); st.community.push(st.deck.pop()); st.round = "river";
    } else if (st.round === "river") {
        finishHand(); return;
    }

    st.turnIndex = firstActiveIndexAfter(st.dealerIndex);
    st.message   = st.players[st.turnIndex].name + " to act.";
}

function advanceTurn() {
    const st = window.texasHoldemState;
    if (bettingRoundComplete()) { advanceRound(); return; }
    st.turnIndex = nextIndexFrom(st.turnIndex, function (p) {
        return p.hand.length && !p.folded && !p.allIn && p.chips > 0;
    });
    st.message = st.players[st.turnIndex].name + " to act.";
}

/* ── Player actions ── */

function playerFold() {
    const st = window.texasHoldemState;
    const p  = myPlayer();
    if (!st || !p || !isMyTurn() || st.phase !== "playing") return;
    window.texasPendingBet = 0;
    p.folded = true; p.acted = true; p.lastAction = "Fold";
    st.message = p.name + " folded.";
    advanceTurn(); renderTexas(); syncTexas(); maybeComputerAction();
}

function playerCheckCall() {
    const st = window.texasHoldemState;
    const p  = myPlayer();
    if (!st || !p || !isMyTurn() || st.phase !== "playing") return;
    window.texasPendingBet = 0;
    const toCall = Math.max(0, st.currentBet - p.bet);
    if (toCall > 0) {
        const paid = commitBet(p, toCall);
        p.lastAction = "Call " + paid; st.message = p.name + " called.";
    } else {
        p.lastAction = "Check"; st.message = p.name + " checked.";
    }
    p.acted = true;
    advanceTurn(); renderTexas(); syncTexas(); maybeComputerAction();
}

function playerBetRaise() {
    const st = window.texasHoldemState;
    const p  = myPlayer();
    if (!st || !p || !isMyTurn() || st.phase !== "playing") return;

    const pending = window.texasPendingBet || 0;
    window.texasPendingBet = 0;

    // pending = how much MORE than the call she wants to raise BY
    // if nothing tapped, default to minimum raise
    let targetBet;
    if (st.currentBet <= 0) {
        // No bet yet: bet the pending amount (or min big blind)
        targetBet = pending > 0 ? pending : BIG_BLIND;
    } else {
        // Raise: current bet + raise amount (at least minRaise)
        const raiseBy = pending > 0 ? Math.max(pending, st.minRaise) : st.minRaise;
        targetBet = st.currentBet + raiseBy;
    }

    const needed = Math.max(0, Math.min(targetBet - p.bet, p.chips));
    if (needed <= 0) return;

    const paid = commitBet(p, needed);

    if (p.bet > st.currentBet) {
        st.currentBet = p.bet;
        st.players.forEach(function (other) {
            if (other.id !== p.id && other.hand.length && !other.folded && !other.allIn) {
                other.acted = false;
            }
        });
        p.lastAction = p.allIn ? "All-in" : "Raise " + p.bet;
        st.message   = p.name + (p.allIn ? " is all-in!" : " raised to " + p.bet + ".");
    } else {
        p.lastAction = "All-in " + paid;
        st.message   = p.name + " is all-in for " + paid + ".";
    }

    p.acted = true;
    advanceTurn(); renderTexas(); syncTexas(); maybeComputerAction();
}

/* ── Computer ── */

function computerAction() {
    const st = window.texasHoldemState;
    const p  = currentPlayer();
    if (!st || !p || !p.isComputer || st.phase !== "playing") return;

    const toCall   = Math.max(0, st.currentBet - p.bet);
    const strength = roughComputerStrength(p);

    if (toCall > 0 && strength < 24 && Math.random() < 0.35) {
        p.folded = true; p.acted = true; p.lastAction = "Fold";
        st.message = p.name + " folded.";
    } else if (strength > 62 && p.chips > toCall + st.minRaise && Math.random() < 0.25) {
        const targetBet = st.currentBet + st.minRaise;
        const needed    = Math.max(0, targetBet - p.bet);
        commitBet(p, needed);
        st.currentBet = p.bet;
        st.players.forEach(function (other) {
            if (other.id !== p.id && other.hand.length && !other.folded && !other.allIn)
                other.acted = false;
        });
        p.acted = true; p.lastAction = "Raise";
        st.message = p.name + " raised.";
    } else {
        if (toCall > 0) {
            const paid = commitBet(p, toCall);
            p.lastAction = "Call " + paid; st.message = p.name + " called.";
        } else {
            p.lastAction = "Check"; st.message = p.name + " checked.";
        }
        p.acted = true;
    }

    advanceTurn(); renderTexas(); syncTexas(); maybeComputerAction();
}

function maybeComputerAction() {
    const st = window.texasHoldemState;
    if (!st || st.phase !== "playing") return;
    const p = currentPlayer();
    if (!p || !p.isComputer) return;
    if (window.__texasComputerThinking) return;
    window.__texasComputerThinking = true;
    setTimeout(function () {
        window.__texasComputerThinking = false;
        computerAction();
    }, 700);
}

function roughComputerStrength(player) {
    const cards  = player.hand.concat(window.texasHoldemState.community || []);
    if (!cards.length) return 0;
    const values = cards.map(function (c) { return c.value; }).sort(function (a, b) { return b - a; });
    const counts = {};
    values.forEach(function (v) { counts[v] = (counts[v] || 0) + 1; });
    let score = values[0] * 2;
    Object.keys(counts).forEach(function (k) {
        if (counts[k] === 2) score += 25;
        if (counts[k] === 3) score += 45;
        if (counts[k] >= 4)  score += 70;
    });
    if (player.hand.length === 2 && player.hand[0].suit  === player.hand[1].suit)  score += 8;
    if (player.hand.length === 2 && player.hand[0].value === player.hand[1].value) score += 30;
    return score;
}

/* ── Hand evaluation ── */

function finishHand() {
    const st   = window.texasHoldemState;
    const live = livePlayers();

    if (live.length === 1) {
        live[0].chips += st.pot;
        st.winners    = [live[0].id];
        st.lastResult  = live[0].name + " wins " + st.pot + " chips.";
        st.message     = st.lastResult;
        st.pot = 0; st.phase = "handOver"; st.round = "showdown";
        return;
    }

    const scored = live.map(function (p) {
        return { player: p, score: bestHand(p.hand.concat(st.community)) };
    });
    scored.sort(function (a, b) { return compareScores(b.score, a.score); });
    const best    = scored[0].score;
    const winners = scored.filter(function (item) { return compareScores(item.score, best) === 0; });
    const share   = Math.floor(st.pot / winners.length);
    winners.forEach(function (item) { item.player.chips += share; });
    st.winners    = winners.map(function (item) { return item.player.id; });
    st.lastResult = winners.map(function (item) { return item.player.name; }).join(" & ") +
                    " win " + st.pot + " chips with " + best.name + ".";
    st.message    = st.lastResult;
    st.pot = 0; st.phase = "handOver"; st.round = "showdown";
}

function combinations(cards, choose) {
    const result = [];
    function walk(start, combo) {
        if (combo.length === choose) { result.push(combo.slice()); return; }
        for (let i = start; i < cards.length; i++) {
            combo.push(cards[i]); walk(i + 1, combo); combo.pop();
        }
    }
    walk(0, []);
    return result;
}

function bestHand(cards) {
    const all  = combinations(cards, 5);
    let   best = evaluateFive(all[0]);
    for (let i = 1; i < all.length; i++) {
        const score = evaluateFive(all[i]);
        if (compareScores(score, best) > 0) best = score;
    }
    return best;
}

function evaluateFive(cards) {
    const values       = cards.map(function (c) { return c.value; }).sort(function (a, b) { return b - a; });
    const suits        = cards.map(function (c) { return c.suit; });
    const flush        = suits.every(function (s) { return s === suits[0]; });
    const uniqueValues = Array.from(new Set(values)).sort(function (a, b) { return b - a; });
    const straightHigh = getStraightHigh(uniqueValues);
    const counts = {};
    values.forEach(function (v) { counts[v] = (counts[v] || 0) + 1; });
    const groups = Object.keys(counts).map(function (v) {
        return { value: Number(v), count: counts[v] };
    }).sort(function (a, b) {
        if (b.count !== a.count) return b.count - a.count;
        return b.value - a.value;
    });

    if (flush && straightHigh)
        return { rank: 8, name: straightHigh === 14 ? "Royal Flush" : "Straight Flush", kickers: [straightHigh] };
    if (groups[0].count === 4)
        return { rank: 7, name: "Four of a Kind", kickers: [groups[0].value, groups[1].value] };
    if (groups[0].count === 3 && groups[1].count === 2)
        return { rank: 6, name: "Full House", kickers: [groups[0].value, groups[1].value] };
    if (flush)
        return { rank: 5, name: "Flush", kickers: values };
    if (straightHigh)
        return { rank: 4, name: "Straight", kickers: [straightHigh] };
    if (groups[0].count === 3)
        return { rank: 3, name: "Three of a Kind",
            kickers: [groups[0].value].concat(groups.slice(1).map(function (g) { return g.value; })) };
    if (groups[0].count === 2 && groups[1].count === 2)
        return { rank: 2, name: "Two Pair", kickers: [groups[0].value, groups[1].value, groups[2].value] };
    if (groups[0].count === 2)
        return { rank: 1, name: "Pair",
            kickers: [groups[0].value].concat(groups.slice(1).map(function (g) { return g.value; })) };
    return { rank: 0, name: "High Card", kickers: values };
}

function getStraightHigh(uniqueValues) {
    const vals = uniqueValues.slice();
    if (vals.indexOf(14) !== -1) vals.push(1);
    for (let i = 0; i <= vals.length - 5; i++) {
        let ok = true;
        for (let j = 1; j < 5; j++) {
            if (vals[i + j] !== vals[i] - j) { ok = false; break; }
        }
        if (ok) return vals[i];
    }
    return 0;
}

function compareScores(a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    const len = Math.max(a.kickers.length, b.kickers.length);
    for (let i = 0; i < len; i++) {
        const av = a.kickers[i] || 0, bv = b.kickers[i] || 0;
        if (av !== bv) return av - bv;
    }
    return 0;
}

/* ══════════════════════════════════════════
   RENDERING
═══════════════════════════════════════════ */

function cardHtml(card, size) {
    const red  = card.suit === "♥" || card.suit === "♦";
    const cls  = size === "big" ? "th-card-big" : "th-card-small";
    return (
        "<div class=\"th-card " + cls + " " + (red ? "red" : "black") + "\">" +
            "<span>" + escapeHtml(card.rank) + "</span>" +
            "<b>" + escapeHtml(card.suit) + "</b>" +
        "</div>"
    );
}

function buildSeatTagHtml(p) {
    const st      = window.texasHoldemState;
    const current = currentPlayer();
    const isTurn  = current && current.id === p.id && st.phase === "playing";
    const isWinner = st.winners.indexOf(p.id) !== -1;
    const isDealer = st.players[st.dealerIndex] && st.players[st.dealerIndex].id === p.id;
    const inHand   = p.hand && p.hand.length > 0 && !p.folded;

    let actionText = p.lastAction || "";
    if (p.folded)         actionText = "Folded";
    else if (isTurn)      actionText = "Thinking…";
    else if (!actionText && st.phase === "playing") actionText = "Waiting";

    let cls = "th-seat";
    if (isTurn)   cls += " turn";
    if (p.folded) cls += " folded";
    if (isWinner) cls += " winner";

    // Mini card backs — shown when player holds cards
    const miniCards = inHand
        ? "<div class=\"th-mini-cards\"><i class=\"th-mc\"></i><i class=\"th-mc\"></i></div>"
        : (p.folded ? "<div class=\"th-mini-cards\"><i class=\"th-mc mc-folded\"></i><i class=\"th-mc mc-folded\"></i></div>"
                    : "<div class=\"th-mini-cards\"></div>");

    return (
        "<div class=\"" + cls + "\">" +
            "<div class=\"th-seat-header\">" +
                "<div class=\"th-sdot\"></div>" +
                "<div class=\"th-sname\">" + escapeHtml(p.name) +
                    (isDealer ? "&nbsp;<span class=\"th-dchip\">D</span>" : "") +
                "</div>" +
            "</div>" +
            miniCards +
            "<div class=\"th-schips\">" + Number(p.chips || 0) +
                (p.bet ? " &middot; <span class=\"th-sbet\">" + p.bet + " in</span>" : "") +
            "</div>" +
            "<div class=\"th-saction\">" + escapeHtml(actionText) + "</div>" +
        "</div>"
    );
}

function buildCommunityHtml() {
    const st = window.texasHoldemState;
    let html = "";
    for (let i = 0; i < 5; i++) {
        html += st.community[i]
            ? cardHtml(st.community[i], "small")
            : "<div class=\"th-card th-card-small th-empty\"></div>";
    }
    return html;
}

function buildShowdownHtml() {
    const st   = window.texasHoldemState;
    const live = livePlayers().length ? livePlayers() : playersInHand();
    return live.map(function (p) {
        const win   = st.winners.indexOf(p.id) !== -1;
        const cards = p.hand.length
            ? cardHtml(p.hand[0], "small") + cardHtml(p.hand[1], "small")
            : "";
        return (
            "<div class=\"th-show-player " + (win ? "winner" : "") + "\">" +
                "<div class=\"th-show-name\">" + (win ? "★ " : "") + escapeHtml(p.name) + "</div>" +
                "<div class=\"th-show-cards\">" + cards + "</div>" +
            "</div>"
        );
    }).join("");
}

const SEAT_SLOT_ORDER = ["across", "across-left", "across-right", "left", "right"];

function buildSeatWrapHtml() {
    const st      = window.texasHoldemState;
    const me      = myPlayer();
    const myIndex = me ? st.players.indexOf(me) : -1;
    const order   = myIndex === -1 ? st.players.slice() : (function () {
        const arr = [];
        for (let step = 1; step <= st.players.length; step++)
            arr.push(st.players[(myIndex + step) % st.players.length]);
        return arr;
    })();
    const others = order.filter(function (p) { return !me || p.id !== me.id; });
    if (!others.length) return "";

    const slots = { across: [], "across-left": [], "across-right": [], left: [], right: [] };
    others.forEach(function (p, idx) {
        const slot = SEAT_SLOT_ORDER[Math.min(idx, SEAT_SLOT_ORDER.length - 1)];
        slots[slot].push(p);
    });

    function renderSlot(name) {
        if (!slots[name].length) return "";
        return "<div class=\"th-sslot th-sslot-" + name + "\">" + slots[name].map(buildSeatTagHtml).join("") + "</div>";
    }

    return (
        "<div class=\"th-seatwrap\">" +
            renderSlot("left") +
            "<div class=\"th-swcenter\">" +
                renderSlot("across-left") +
                renderSlot("across") +
                renderSlot("across-right") +
            "</div>" +
            renderSlot("right") +
        "</div>"
    );
}

/* The chip tray shown to the right of my cards when it's my turn */
function buildChipTrayHtml() {
    const st      = window.texasHoldemState;
    const pending = window.texasPendingBet || 0;

    let topLine;
    if (pending > 0) {
        topLine = (st.currentBet > 0 ? "Raise +" : "Bet ") +
                  "<strong>" + pending + "</strong>";
    } else {
        topLine = st.currentBet > 0
            ? "Raise? <small>min +" + st.minRaise + "</small>"
            : "Bet?&nbsp;<small>min " + BIG_BLIND + "</small>";
    }

    const clearBtn = pending > 0
        ? "<button class=\"th-chip-clear\" onclick=\"texasClearPendingBet()\" type=\"button\">✕</button>"
        : "";

    return (
        "<div class=\"th-chiptray\">" +
            "<div class=\"th-pending-line\">" + topLine + "</div>" +
            "<div class=\"th-chips-row\">" +
                "<button class=\"th-chip th-chip-w\" onclick=\"texasAddChip(10)\"  type=\"button\"><span>10</span></button>" +
                "<button class=\"th-chip th-chip-r\" onclick=\"texasAddChip(50)\"  type=\"button\"><span>50</span></button>" +
                "<button class=\"th-chip th-chip-b\" onclick=\"texasAddChip(100)\" type=\"button\"><span>100</span></button>" +
                clearBtn +
            "</div>" +
        "</div>"
    );
}

/* ── Main render ── */

function renderTexas() {
    const el = canvas();
    const st = window.texasHoldemState;
    if (!el || !st) return;

    const me      = myPlayer();
    const myTurn  = isMyTurn();
    const current = currentPlayer();
    const toCall  = me ? Math.max(0, st.currentBet - me.bet) : 0;
    const canAct  = st.phase === "playing" && myTurn && me && !me.folded && !me.allIn && me.chips > 0;

    const callText = toCall > 0 ? "Call " + toCall : "Check";

    const pending    = window.texasPendingBet || 0;
    const defRaise   = st.currentBet > 0 ? st.minRaise : BIG_BLIND;
    const raiseBy    = pending > 0 ? pending : defRaise;
    const raiseLabel = st.currentBet > 0 ? "Raise +" + raiseBy : "Bet " + raiseBy;

    const isShowdown = st.phase === "handOver" && st.round === "showdown";

    const myCardsHtml = me && me.hand.length
        ? cardHtml(me.hand[0], "big") + cardHtml(me.hand[1], "big")
        : "<div class=\"th-card th-card-big th-empty\"></div>" +
          "<div class=\"th-card th-card-big th-empty\"></div>";

    const titleLine = st.phase === "playing" && current
        ? current.name + " to act."
        : (st.message || "");

    const tableMiddle = isShowdown
        ? "<div class=\"th-sub-title\">Showdown</div><div class=\"th-show-row\">" + buildShowdownHtml() + "</div>"
        : "<div class=\"th-pot-badge\">POT&nbsp;&nbsp;" + Number(st.pot || 0) + "</div>" +
          "<div class=\"th-sub-title\">Community Cards</div>" +
          "<div class=\"th-community\">" + buildCommunityHtml() + "</div>";

    const myBetBadge = me && me.bet
        ? "<span class=\"th-mybet-badge\">" + me.bet + " in pot</span>"
        : "";

    const chiptray = canAct ? buildChipTrayHtml() : "";

    const actionButtons = st.phase === "playing"
        ? "<div class=\"th-actions\">" +
              "<button onclick=\"texasFold()\"       " + (canAct ? "" : "disabled") + " class=\"th-btn-danger\" type=\"button\">Fold</button>" +
              "<button onclick=\"texasCheckCall()\"  " + (canAct ? "" : "disabled") + " class=\"th-btn-neutral\" type=\"button\">" + callText + "</button>" +
              "<button onclick=\"texasBetRaise()\"   " + (canAct ? "" : "disabled") + " class=\"th-btn-gold\"    type=\"button\">" + raiseLabel + "</button>" +
          "</div>"
        : "";

    const dealButton = st.phase !== "playing"
        ? "<div class=\"th-actions\">" +
              "<button onclick=\"texasDealHand()\"   class=\"th-btn-gold\"    type=\"button\">Deal Hand</button>" +
              "<button onclick=\"texasResetTable()\" class=\"th-btn-neutral\" type=\"button\">Reset Table</button>" +
          "</div>"
        : "";

    /* ── CSS ── */
    const css = [
        ".th-wrap{height:100%;overflow:auto;padding:8px 8px 82px;box-sizing:border-box;",
            "font-family:Arial,sans-serif;color:#e2f0d9;",
            "background:radial-gradient(ellipse at 50% 30%,#14302a 0%,#091a12 100%);}",

        /* Top pills */
        ".th-top{display:flex;gap:6px;max-width:540px;margin:0 auto 8px;justify-content:center;}",
        ".th-pill{flex:1;max-width:140px;background:linear-gradient(160deg,#e8e3d4,#cec8b4);",
            "color:#1a1a1a;border-radius:11px;padding:5px 10px;text-align:center;",
            "box-shadow:0 2px 8px rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.4);}",
        ".th-pill-val{font-size:15px;font-weight:900;line-height:1.1;}",
        ".th-pill-lbl{font-size:9px;text-transform:uppercase;letter-spacing:.6px;opacity:.65;margin-top:1px;}",

        /* Status */
        ".th-message{text-align:center;color:#ffd700;font-weight:900;font-size:14px;",
            "line-height:1.25;max-width:540px;margin:3px auto 3px;text-shadow:0 1px 5px rgba(0,0,0,.6);}",
        ".th-last{text-align:center;color:#a8e6cf;font-size:12px;font-weight:700;",
            "max-width:540px;margin:0 auto 5px;opacity:.95;}",

        /* ── Poker table oval ── */
        ".th-table{max-width:540px;margin:0 auto 10px;",
            "background:radial-gradient(ellipse 92% 80% at 50% 50%,#2e7d52 0%,#1d5c39 50%,#113d26 100%);",
            "border-radius:100px;",
            /* Wooden rail: layer cake of shadows for depth */
            "border:15px solid #5c3319;",
            "box-shadow:",
                "inset 0 3px 10px rgba(255,255,255,.09),",
                "inset 0 -4px 14px rgba(0,0,0,.55),",
                "0 0 0 3px #3c2110,",   /* dark inner rim */
                "0 0 0 5px #8a5030,",   /* lighter wood edge */
                "0 0 0 7px #3c2110,",   /* outer dark rim */
                "0 10px 36px rgba(0,0,0,.75);",
            "padding:16px 14px 14px;position:relative;}",
        /* Inner felt stripe */
        ".th-table::before{content:'';position:absolute;inset:4px;border-radius:85px;",
            "border:1.5px solid rgba(255,255,255,.11);pointer-events:none;}",

        /* Pot badge (center of felt) */
        ".th-pot-badge{text-align:center;color:#ffd700;font-weight:900;font-size:13px;",
            "letter-spacing:.8px;margin:0 0 5px;text-shadow:0 1px 6px rgba(0,0,0,.7);}",
        ".th-sub-title{text-align:center;color:rgba(255,255,255,.45);font-size:9px;",
            "text-transform:uppercase;letter-spacing:1.2px;font-weight:700;margin:0 0 5px;}",
        ".th-community{display:flex;gap:4px;justify-content:center;margin:0 auto;}",

        /* Opponent seat layout */
        ".th-seatwrap{display:flex;align-items:flex-start;justify-content:space-between;",
            "gap:5px;margin:0 0 14px;min-height:60px;}",
        ".th-swcenter{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;flex:1 1 auto;}",
        ".th-sslot{display:flex;flex-direction:column;gap:5px;}",
        ".th-sslot-left,.th-sslot-right{justify-content:center;}",

        /* Seat tag */
        ".th-seat{background:linear-gradient(160deg,rgba(8,26,16,.93),rgba(4,16,9,.97));",
            "border:1.5px solid rgba(255,255,255,.12);border-radius:9px;",
            "padding:5px 7px;min-width:80px;text-align:center;}",
        ".th-seat.turn  {border-color:#ff4444;box-shadow:0 0 0 1.5px #ff4444,0 0 10px rgba(255,68,68,.4);}",
        ".th-seat.folded{opacity:.4;}",
        ".th-seat.winner{border-color:#ffd700;box-shadow:0 0 0 1.5px #ffd700,0 0 10px rgba(255,215,0,.4);}",

        ".th-seat-header{display:flex;align-items:center;gap:4px;justify-content:center;margin-bottom:3px;}",
        ".th-sdot{width:7px;height:7px;border-radius:50%;background:#4caf50;flex-shrink:0;}",
        ".th-seat.turn   .th-sdot{background:#ff4444;box-shadow:0 0 5px #ff0;}",
        ".th-seat.winner .th-sdot{background:#ffd700;box-shadow:0 0 5px #ffd700;}",
        ".th-seat.folded .th-sdot{background:#444;}",
        ".th-sname{font-size:11px;font-weight:900;color:#e2f0d9;",
            "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:66px;}",
        ".th-dchip{display:inline-block;background:#ffd700;color:#1a1a1a;font-size:8px;",
            "font-weight:900;width:14px;height:14px;border-radius:50%;line-height:14px;",
            "text-align:center;margin-left:2px;vertical-align:middle;}",

        /* Mini card backs */
        ".th-mini-cards{display:flex;gap:2px;justify-content:center;margin:3px 0 3px;}",
        ".th-mc{display:inline-block;width:13px;height:19px;border-radius:2px;",
            "background:linear-gradient(150deg,#1976d2,#0d47a1);",
            "border:1px solid rgba(255,255,255,.3);}",
        ".th-mc.mc-folded{background:#2a2a2a;opacity:.45;}",

        ".th-schips{font-size:9px;color:rgba(226,240,217,.7);font-weight:700;white-space:nowrap;}",
        ".th-sbet{color:#ffd700;}",
        ".th-saction{font-size:10px;font-weight:900;color:#ff8a80;height:12px;overflow:hidden;margin-top:1px;}",
        ".th-seat.folded .th-saction{color:#666;}",
        ".th-seat.winner .th-saction{color:#ffd700;}",

        /* Showdown strip */
        ".th-show-row{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;}",
        ".th-show-player{background:rgba(8,25,14,.95);border:1.5px solid rgba(255,255,255,.13);",
            "border-radius:9px;padding:6px 8px;text-align:center;}",
        ".th-show-player.winner{border-color:#ffd700;box-shadow:0 0 0 1.5px #ffd700,0 0 10px rgba(255,215,0,.3);}",
        ".th-show-name{font-size:11px;font-weight:900;color:#e2f0d9;margin-bottom:4px;white-space:nowrap;}",
        ".th-show-cards{display:flex;gap:3px;justify-content:center;}",

        /* Playing cards */
        ".th-card{background:#fff;border-radius:7px;border:2px solid #ddd;",
            "box-shadow:0 2px 6px rgba(0,0,0,.45);display:flex;flex-direction:column;",
            "align-items:center;justify-content:center;font-weight:900;line-height:1;}",
        ".th-card-small{width:37px;height:52px;}",
        ".th-card-small span{font-size:13px;} .th-card-small b{font-size:16px;margin-top:2px;}",
        ".th-card-big{width:62px;height:88px;border-width:3px;}",
        ".th-card-big span{font-size:20px;} .th-card-big b{font-size:28px;margin-top:3px;}",
        ".th-card.red{color:#c41c1c;} .th-card.black{color:#111;}",
        ".th-card.th-empty{background:rgba(255,255,255,.07);border:2px dashed rgba(255,255,255,.22);box-shadow:none;}",

        /* My player area */
        ".th-myarea{max-width:540px;margin:0 auto 4px;",
            "background:rgba(0,0,0,.28);border-radius:13px;padding:9px 11px;}",
        ".th-myinfo{display:flex;align-items:center;gap:7px;margin-bottom:7px;flex-wrap:wrap;}",
        ".th-myname{font-weight:900;font-size:14px;color:#e2f0d9;}",
        ".th-mychips{font-size:12px;font-weight:900;color:#ffd700;",
            "background:rgba(0,0,0,.35);border-radius:8px;padding:2px 9px;}",
        ".th-mybet-badge{font-size:10px;color:rgba(226,240,217,.55);margin-left:auto;font-weight:700;}",
        ".th-myrow{display:flex;align-items:center;gap:10px;}",
        ".th-mycards{display:flex;gap:7px;flex-shrink:0;}",

        /* Chip tray */
        ".th-chiptray{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;}",
        ".th-pending-line{font-size:12px;font-weight:700;color:#ffd700;text-align:center;}",
        ".th-pending-line strong{font-size:14px;}",
        ".th-pending-line small{font-size:10px;color:rgba(226,240,217,.55);font-weight:400;}",
        ".th-chips-row{display:flex;gap:8px;align-items:center;justify-content:center;}",

        /* Poker chip button: triple ring effect via box-shadow */
        ".th-chip{width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;",
            "display:flex;align-items:center;justify-content:center;",
            "font-weight:900;font-size:12px;",
            "-webkit-tap-highlight-color:transparent;",
            "transition:transform .08s,opacity .08s;}",
        ".th-chip:active{transform:scale(.88);opacity:.85;}",
        ".th-chip span{font-size:12px;font-weight:900;pointer-events:none;}",

        /* White chip — cream body, mocha rings */
        ".th-chip-w{background:#f0ead8;color:#2a2a2a;",
            "box-shadow:0 0 0 3px #b8ae98,0 0 0 6px #f0ead8,0 0 0 9px #b8ae98,0 3px 9px rgba(0,0,0,.55);}",
        /* Red chip */
        ".th-chip-r{background:#c0392b;color:#fff;",
            "box-shadow:0 0 0 3px #8b1a10,0 0 0 6px #c0392b,0 0 0 9px #8b1a10,0 3px 9px rgba(0,0,0,.55);}",
        /* Black chip with gold rings */
        ".th-chip-b{background:#1a1a2e;color:#ffd700;",
            "box-shadow:0 0 0 3px #c9a84c,0 0 0 6px #1a1a2e,0 0 0 9px #c9a84c,0 3px 9px rgba(0,0,0,.55);}",

        ".th-chip-clear{width:28px;height:28px;border-radius:50%;border:1.5px solid rgba(255,255,255,.3);",
            "background:rgba(255,255,255,.12);color:#fff;font-size:13px;cursor:pointer;",
            "display:flex;align-items:center;justify-content:center;",
            "-webkit-tap-highlight-color:transparent;transition:transform .08s;}",
        ".th-chip-clear:active{transform:scale(.85);}",

        /* Action buttons */
        ".th-actions{display:flex;gap:7px;justify-content:center;flex-wrap:wrap;",
            "margin:8px auto 5px;max-width:540px;}",
        ".th-actions button{border:none;border-radius:12px;padding:10px 15px;",
            "font-size:14px;font-weight:900;cursor:pointer;",
            "-webkit-tap-highlight-color:transparent;",
            "box-shadow:0 3px 9px rgba(0,0,0,.4);}",
        ".th-btn-neutral{background:#dde8d5;color:#1a2e1a;}",
        ".th-btn-gold   {background:#ffd700;color:#1a1a1a;}",
        ".th-btn-danger {background:#c0392b;color:#fff;}",
        ".th-actions button:disabled{background:rgba(255,255,255,.1) !important;",
            "color:rgba(255,255,255,.3) !important;box-shadow:none;cursor:default;}",

        /* Rules footer */
        ".th-rules{font-size:10px;text-align:center;color:rgba(226,240,217,.4);",
            "max-width:540px;margin:5px auto 0;line-height:1.4;}",

        /* Responsive */
        "@media(max-width:390px){",
            ".th-wrap{padding:5px 5px 80px;}",
            ".th-card-small{width:32px;height:46px;}",
            ".th-card-small span{font-size:11px;} .th-card-small b{font-size:14px;}",
            ".th-card-big{width:54px;height:76px;}",
            ".th-card-big span{font-size:17px;} .th-card-big b{font-size:24px;}",
            ".th-chip{width:46px;height:46px;}",
            ".th-seat{min-width:74px;}",
        "}"
    ].join("");

    el.innerHTML = [
        "<style>", css, "</style>",
        "<div class=\"th-wrap\">",

        /* Top stats pills: Pot | Round | My Chips */
        "<div class=\"th-top\">",
            "<div class=\"th-pill\">",
                "<div class=\"th-pill-val\">", Number(st.pot || 0), "</div>",
                "<div class=\"th-pill-lbl\">pot</div>",
            "</div>",
            "<div class=\"th-pill\">",
                "<div class=\"th-pill-val\">", escapeHtml((st.round || "table").toUpperCase()), "</div>",
                "<div class=\"th-pill-lbl\">", SMALL_BLIND, " / ", BIG_BLIND, " blinds</div>",
            "</div>",
            "<div class=\"th-pill\">",
                "<div class=\"th-pill-val\">", Number(me ? me.chips : 0), "</div>",
                "<div class=\"th-pill-lbl\">my chips</div>",
            "</div>",
        "</div>",

        /* Status */
        "<div class=\"th-message\">", escapeHtml(titleLine), "</div>",
        st.lastResult ? "<div class=\"th-last\">" + escapeHtml(st.lastResult) + "</div>" : "",

        /* The table */
        "<div class=\"th-table\">",
            buildSeatWrapHtml(),
            tableMiddle,
        "</div>",

        /* My area: name + chips header, then cards left / chip tray right */
        "<div class=\"th-myarea\">",
            "<div class=\"th-myinfo\">",
                "<span class=\"th-myname\">", escapeHtml(me ? me.name : "You"), "</span>",
                "<span class=\"th-mychips\">&#9672; ", Number(me ? me.chips : 0), "</span>",
                myBetBadge,
            "</div>",
            "<div class=\"th-myrow\">",
                "<div class=\"th-mycards\">", myCardsHtml, "</div>",
                chiptray,
            "</div>",
        "</div>",

        actionButtons,
        dealButton,
        "<div class=\"th-rules\">Fake chips only &middot; Texas Hold'em &middot; Best five-card hand wins the pot.</div>",
        "</div>"
    ].join("");

    maybeComputerAction();
}

/* ── Chip tap API (called from inline onclick) ── */

window.texasPendingBet = 0;

window.texasAddChip = function (amount) {
    const p = myPlayer();
    if (!window.texasHoldemState || !p || !isMyTurn() || window.texasHoldemState.phase !== "playing") return;
    window.texasPendingBet = Math.min((window.texasPendingBet || 0) + amount, p.chips);
    renderTexas();
};

window.texasClearPendingBet = function () {
    window.texasPendingBet = 0;
    renderTexas();
};

/* ── Public game API ── */

window.texasDealHand    = dealHand;
window.texasFold        = playerFold;
window.texasCheckCall   = playerCheckCall;
window.texasBetRaise    = playerBetRaise;

window.texasResetTable = function () {
    window.texasHoldemState = createState();
    window.texasPendingBet  = 0;
    renderTexas();
    syncTexas();
};

window.initTexasHoldemGame = function () {
    window.chaserGame = window.chaserGame || {};
    window.chaserGame.activeGame = "TexasHoldem";
    openStage();
    setHeader();
    const amHost = window.chaserGame && window.chaserGame.hostId === getMyId();
    if (amHost || !window.texasHoldemState) {
        window.texasHoldemState = createState();
        window.texasPendingBet  = 0;
        syncTexas();
    }
    renderTexas();
};

window.handleIncomingTexasHoldemSync = function (payload) {
    if (!payload || !payload.state) return;
    if (payload.roomGameId && window.chaserGame && window.chaserGame.activeGameId &&
        payload.roomGameId !== window.chaserGame.activeGameId) return;
    window.texasHoldemState = payload.state;
    if (window.chaserGame) window.chaserGame.activeGame = "TexasHoldem";
    renderTexas();
};

/* Alias entries */
window.startTexasHoldemFromLobby = window.initTexasHoldemGame;
window.startTexasHoldemGame      = window.initTexasHoldemGame;
window.initTexasHoldem           = window.initTexasHoldemGame;
window.initTexasHoldEmGame       = window.initTexasHoldemGame;
window.startTexasHoldEmGame      = window.initTexasHoldemGame;

})();
