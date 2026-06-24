/* CHASER TEXAS HOLDEM - SEPARATE GAME FILE
Fake-chip Texas Hold'em
1-6 players, synced rooms, solo vs computer Dealer
*/
;(function () {
"use strict";


const STARTING_CHIPS = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const MAX_PLAYERS = 6;
const DEALER_BOT_ID = "texas-holdem-dealer-bot";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = [
    { r: "2", v: 2 },
    { r: "3", v: 3 },
    { r: "4", v: 4 },
    { r: "5", v: 5 },
    { r: "6", v: 6 },
    { r: "7", v: 7 },
    { r: "8", v: 8 },
    { r: "9", v: 9 },
    { r: "10", v: 10 },
    { r: "J", v: 11 },
    { r: "Q", v: 12 },
    { r: "K", v: 13 },
    { r: "A", v: 14 }
];

function getMyId() {
    if (typeof window.myId === "function") return window.myId();
    if (typeof window.myId === "string") return window.myId;
    return localStorage.getItem("rider_id") || "local-player";
}

function myName() {
    const input = document.getElementById("username");
    return (input && input.value.trim()) || localStorage.getItem("rider_saved_name") || "Player";
}

function canvas() {
    return document.getElementById("gameCanvasContainer");
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function openStage() {
    const stage = document.getElementById("activeGameStage");
    if (stage) stage.classList.add("open");
}

function setHeader() {
    const roomDisplay = document.getElementById("roomDisplayCode");
    const headerBtns = document.getElementById("headerActionButtonsContainer");
    const chatHeader = document.getElementById("chatHeader");

    if (roomDisplay) roomDisplay.innerText = "♠️ Texas Hold'em";
    if (headerBtns) headerBtns.style.display = "none";
    if (chatHeader) chatHeader.classList.add("game-active-mode");
}

function syncTexas() {
    if (typeof channel !== "undefined" && channel && window.texasHoldemState) {
        channel.send({
            type: "broadcast",
            event: "texasholdem-sync-state",
            payload: {
                state: window.texasHoldemState,
                roomGameId: window.chaserGame && window.chaserGame.activeGameId ? window.chaserGame.activeGameId : null
            }
        });
    }
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = deck[i];
        deck[i] = deck[j];
        deck[j] = temp;
    }

    return deck;
}

function makeDeck() {
    const deck = [];

    SUITS.forEach(function (suit) {
        RANKS.forEach(function (rank) {
            deck.push({
                suit: suit,
                rank: rank.r,
                value: rank.v
            });
        });
    });

    return shuffleDeck(deck);
}

function makePlayers() {
    const lobbyPlayers = window.chaserGame && window.chaserGame.players && window.chaserGame.players.length
        ? window.chaserGame.players
        : [{ id: getMyId(), name: myName(), seat: 0 }];

    const players = lobbyPlayers.slice(0, MAX_PLAYERS).map(function (p, idx) {
        return {
            id: p.id,
            name: p.name || "Player " + (idx + 1),
            isComputer: false,
            chips: STARTING_CHIPS,
            hand: [],
            folded: false,
            allIn: false,
            bet: 0,
            acted: false,
            lastAction: ""
        };
    });

    if (players.length === 1) {
        players.push({
            id: DEALER_BOT_ID,
            name: "Dealer",
            isComputer: true,
            chips: STARTING_CHIPS,
            hand: [],
            folded: false,
            allIn: false,
            bet: 0,
            acted: false,
            lastAction: ""
        });
    }

    return players;
}

function createState() {
    return {
        phase: "table",
        handNumber: 0,
        deck: [],
        community: [],
        players: makePlayers(),
        dealerIndex: 0,
        turnIndex: 0,
        round: "waiting",
        pot: 0,
        currentBet: 0,
        minRaise: BIG_BLIND,
        message: "Tap Deal Hand to start.",
        lastResult: "",
        winners: []
    };
}

function activePlayers() {
    const st = window.texasHoldemState;
    if (!st) return [];

    return st.players.filter(function (p) {
        return p.chips > 0 || p.hand.length;
    });
}

function playersInHand() {
    const st = window.texasHoldemState;
    if (!st) return [];

    return st.players.filter(function (p) {
        return p.hand && p.hand.length;
    });
}

function livePlayers() {
    return playersInHand().filter(function (p) {
        return !p.folded;
    });
}

function myPlayer() {
    const st = window.texasHoldemState;
    if (!st) return null;

    return st.players.find(function (p) {
        return p.id === getMyId();
    }) || null;
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

function nextIndexFrom(startIndex, filterFn) {
    const st = window.texasHoldemState;
    if (!st || !st.players.length) return 0;

    for (let step = 1; step <= st.players.length; step++) {
        const idx = (startIndex + step) % st.players.length;
        const p = st.players[idx];

        if (filterFn(p, idx)) return idx;
    }

    return startIndex;
}

function firstActiveIndexAfter(startIndex) {
    return nextIndexFrom(startIndex, function (p) {
        return p.hand.length && !p.folded && !p.allIn && p.chips > 0;
    });
}

function resetBetsForNewRound() {
    const st = window.texasHoldemState;

    st.currentBet = 0;
    st.minRaise = BIG_BLIND;

    st.players.forEach(function (p) {
        p.bet = 0;
        p.acted = false;
    });
}

function commitBet(player, amount) {
    const st = window.texasHoldemState;
    const paid = Math.max(0, Math.min(player.chips, amount));

    player.chips -= paid;
    player.bet += paid;
    st.pot += paid;

    if (player.chips <= 0) {
        player.chips = 0;
        player.allIn = true;
    }

    return paid;
}

function postBlind(index, amount, label) {
    const st = window.texasHoldemState;
    const p = st.players[index];

    commitBet(p, amount);
    p.acted = false;
    p.lastAction = label + " " + amount;

    if (p.bet > st.currentBet) {
        st.currentBet = p.bet;
    }
}

function dealHand() {
    const st = window.texasHoldemState;
    if (!st) return;

    let seated = st.players.filter(function (p) {
        return p.chips > 0;
    });

    if (seated.length < 2) {
        st.players = makePlayers();
        seated = st.players;
    }

    st.phase = "playing";
    st.round = "preflop";
    st.handNumber++;
    st.deck = makeDeck();
    st.community = [];
    st.pot = 0;
    st.currentBet = 0;
    st.minRaise = BIG_BLIND;
    st.winners = [];
    st.lastResult = "";

    st.players.forEach(function (p) {
        p.hand = [];
        p.folded = false;
        p.allIn = false;
        p.bet = 0;
        p.acted = false;
        p.lastAction = "";
    });

    st.players.forEach(function (p) {
        if (p.chips > 0) {
            p.hand.push(st.deck.pop());
            p.hand.push(st.deck.pop());
        }
    });

    const handPlayers = playersInHand();

    if (handPlayers.length < 2) {
        st.message = "Need at least two players with chips.";
        st.phase = "table";
        return;
    }

    st.dealerIndex = nextIndexFrom(st.dealerIndex - 1 + st.players.length, function (p) {
        return p.hand.length && p.chips >= 0;
    });

    let smallBlindIndex;
    let bigBlindIndex;

    if (handPlayers.length === 2) {
        smallBlindIndex = st.dealerIndex;
        bigBlindIndex = nextIndexFrom(smallBlindIndex, function (p) {
            return p.hand.length;
        });
    } else {
        smallBlindIndex = nextIndexFrom(st.dealerIndex, function (p) {
            return p.hand.length;
        });

        bigBlindIndex = nextIndexFrom(smallBlindIndex, function (p) {
            return p.hand.length;
        });
    }

    postBlind(smallBlindIndex, SMALL_BLIND, "Small blind");
    postBlind(bigBlindIndex, BIG_BLIND, "Big blind");

    st.turnIndex = nextIndexFrom(bigBlindIndex, function (p) {
        return p.hand.length && !p.folded && !p.allIn && p.chips > 0;
    });

    st.message = st.players[st.turnIndex].name + " to act.";

    renderTexas();
    syncTexas();
    maybeComputerAction();
}

function bettingRoundComplete() {
    const st = window.texasHoldemState;
    const live = livePlayers();

    if (live.length <= 1) return true;

    return live.every(function (p) {
        if (p.allIn || p.chips <= 0) return true;
        return p.acted && p.bet === st.currentBet;
    });
}

function advanceRound() {
    const st = window.texasHoldemState;

    if (livePlayers().length <= 1) {
        finishHand();
        return;
    }

    if (st.round === "preflop") {
        resetBetsForNewRound();
        st.community.push(st.deck.pop());
        st.community.push(st.deck.pop());
        st.community.push(st.deck.pop());
        st.round = "flop";
    } else if (st.round === "flop") {
        resetBetsForNewRound();
        st.community.push(st.deck.pop());
        st.round = "turn";
    } else if (st.round === "turn") {
        resetBetsForNewRound();
        st.community.push(st.deck.pop());
        st.round = "river";
    } else if (st.round === "river") {
        finishHand();
        return;
    }

    st.turnIndex = firstActiveIndexAfter(st.dealerIndex);
    st.message = st.players[st.turnIndex].name + " to act.";
}

function advanceTurn() {
    const st = window.texasHoldemState;

    if (bettingRoundComplete()) {
        advanceRound();
        return;
    }

    st.turnIndex = nextIndexFrom(st.turnIndex, function (p) {
        return p.hand.length && !p.folded && !p.allIn && p.chips > 0;
    });

    st.message = st.players[st.turnIndex].name + " to act.";
}

function playerFold() {
    const st = window.texasHoldemState;
    const p = myPlayer();

    if (!st || !p || !isMyTurn() || st.phase !== "playing") return;

    p.folded = true;
    p.acted = true;
    p.lastAction = "Fold";

    st.message = p.name + " folded.";

    advanceTurn();
    renderTexas();
    syncTexas();
    maybeComputerAction();
}

function playerCheckCall() {
    const st = window.texasHoldemState;
    const p = myPlayer();

    if (!st || !p || !isMyTurn() || st.phase !== "playing") return;

    const toCall = Math.max(0, st.currentBet - p.bet);

    if (toCall > 0) {
        const paid = commitBet(p, toCall);
        p.lastAction = "Call " + paid;
        st.message = p.name + " called.";
    } else {
        p.lastAction = "Check";
        st.message = p.name + " checked.";
    }

    p.acted = true;

    advanceTurn();
    renderTexas();
    syncTexas();
    maybeComputerAction();
}

function playerBetRaise() {
    const st = window.texasHoldemState;
    const p = myPlayer();

    if (!st || !p || !isMyTurn() || st.phase !== "playing") return;

    const targetBet = st.currentBet <= 0 ? BIG_BLIND : st.currentBet + st.minRaise;
    const needed = Math.max(0, targetBet - p.bet);

    if (needed <= 0) return;

    const paid = commitBet(p, needed);

    if (p.bet > st.currentBet) {
        st.currentBet = p.bet;

        st.players.forEach(function (other) {
            if (other.id !== p.id && other.hand.length && !other.folded && !other.allIn) {
                other.acted = false;
            }
        });

        p.lastAction = st.currentBet === BIG_BLIND ? "Bet " + paid : "Raise";
        st.message = p.name + " raised.";
    } else {
        p.lastAction = "Call " + paid;
        st.message = p.name + " called all-in.";
    }

    p.acted = true;

    advanceTurn();
    renderTexas();
    syncTexas();
    maybeComputerAction();
}

function computerAction() {
    const st = window.texasHoldemState;
    const p = currentPlayer();

    if (!st || !p || !p.isComputer || st.phase !== "playing") return;

    const toCall = Math.max(0, st.currentBet - p.bet);
    const strength = roughComputerStrength(p);

    if (toCall > 0 && strength < 24 && Math.random() < 0.35) {
        p.folded = true;
        p.acted = true;
        p.lastAction = "Fold";
        st.message = p.name + " folded.";
    } else if (strength > 62 && p.chips > toCall + st.minRaise && Math.random() < 0.25) {
        const targetBet = st.currentBet + st.minRaise;
        const needed = Math.max(0, targetBet - p.bet);
        commitBet(p, needed);
        st.currentBet = p.bet;

        st.players.forEach(function (other) {
            if (other.id !== p.id && other.hand.length && !other.folded && !other.allIn) {
                other.acted = false;
            }
        });

        p.acted = true;
        p.lastAction = "Raise";
        st.message = p.name + " raised.";
    } else {
        if (toCall > 0) {
            const paid = commitBet(p, toCall);
            p.lastAction = "Call " + paid;
            st.message = p.name + " called.";
        } else {
            p.lastAction = "Check";
            st.message = p.name + " checked.";
        }

        p.acted = true;
    }

    advanceTurn();
    renderTexas();
    syncTexas();
    maybeComputerAction();
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
    const cards = player.hand.concat(window.texasHoldemState.community || []);

    if (!cards.length) return 0;

    const values = cards.map(function (c) { return c.value; }).sort(function (a, b) { return b - a; });
    const counts = {};

    values.forEach(function (v) {
        counts[v] = (counts[v] || 0) + 1;
    });

    let score = values[0] * 2;

    Object.keys(counts).forEach(function (k) {
        if (counts[k] === 2) score += 25;
        if (counts[k] === 3) score += 45;
        if (counts[k] >= 4) score += 70;
    });

    if (player.hand.length === 2 && player.hand[0].suit === player.hand[1].suit) score += 8;
    if (player.hand.length === 2 && player.hand[0].value === player.hand[1].value) score += 30;

    return score;
}

function finishHand() {
    const st = window.texasHoldemState;
    const live = livePlayers();

    if (live.length === 1) {
        live[0].chips += st.pot;
        st.winners = [live[0].id];
        st.lastResult = live[0].name + " wins " + st.pot + " chips.";
        st.message = st.lastResult;
        st.pot = 0;
        st.phase = "handOver";
        st.round = "showdown";
        return;
    }

    const scored = live.map(function (p) {
        return {
            player: p,
            score: bestHand(p.hand.concat(st.community))
        };
    });

    scored.sort(function (a, b) {
        return compareScores(b.score, a.score);
    });

    const best = scored[0].score;

    const winners = scored.filter(function (item) {
        return compareScores(item.score, best) === 0;
    });

    const share = Math.floor(st.pot / winners.length);

    winners.forEach(function (item) {
        item.player.chips += share;
    });

    st.winners = winners.map(function (item) {
        return item.player.id;
    });

    st.lastResult = winners.map(function (item) {
        return item.player.name;
    }).join(" & ") + " win " + st.pot + " chips with " + best.name + ".";

    st.message = st.lastResult;
    st.pot = 0;
    st.phase = "handOver";
    st.round = "showdown";
}

function combinations(cards, choose) {
    const result = [];

    function walk(start, combo) {
        if (combo.length === choose) {
            result.push(combo.slice());
            return;
        }

        for (let i = start; i < cards.length; i++) {
            combo.push(cards[i]);
            walk(i + 1, combo);
            combo.pop();
        }
    }

    walk(0, []);
    return result;
}

function bestHand(cards) {
    const all = combinations(cards, 5);
    let best = evaluateFive(all[0]);

    for (let i = 1; i < all.length; i++) {
        const score = evaluateFive(all[i]);

        if (compareScores(score, best) > 0) {
            best = score;
        }
    }

    return best;
}

function evaluateFive(cards) {
    const values = cards.map(function (c) { return c.value; }).sort(function (a, b) { return b - a; });
    const suits = cards.map(function (c) { return c.suit; });
    const flush = suits.every(function (s) { return s === suits[0]; });

    const uniqueValues = Array.from(new Set(values)).sort(function (a, b) { return b - a; });
    const straightHigh = getStraightHigh(uniqueValues);

    const counts = {};
    values.forEach(function (v) {
        counts[v] = (counts[v] || 0) + 1;
    });

    const groups = Object.keys(counts).map(function (v) {
        return { value: Number(v), count: counts[v] };
    }).sort(function (a, b) {
        if (b.count !== a.count) return b.count - a.count;
        return b.value - a.value;
    });

    if (flush && straightHigh) {
        return { rank: 8, name: straightHigh === 14 ? "Royal Flush" : "Straight Flush", kickers: [straightHigh] };
    }

    if (groups[0].count === 4) {
        return {
            rank: 7,
            name: "Four of a Kind",
            kickers: [groups[0].value, groups[1].value]
        };
    }

    if (groups[0].count === 3 && groups[1].count === 2) {
        return {
            rank: 6,
            name: "Full House",
            kickers: [groups[0].value, groups[1].value]
        };
    }

    if (flush) {
        return {
            rank: 5,
            name: "Flush",
            kickers: values
        };
    }

    if (straightHigh) {
        return {
            rank: 4,
            name: "Straight",
            kickers: [straightHigh]
        };
    }

    if (groups[0].count === 3) {
        return {
            rank: 3,
            name: "Three of a Kind",
            kickers: [groups[0].value].concat(groups.slice(1).map(function (g) { return g.value; }))
        };
    }

    if (groups[0].count === 2 && groups[1].count === 2) {
        return {
            rank: 2,
            name: "Two Pair",
            kickers: [groups[0].value, groups[1].value, groups[2].value]
        };
    }

    if (groups[0].count === 2) {
        return {
            rank: 1,
            name: "Pair",
            kickers: [groups[0].value].concat(groups.slice(1).map(function (g) { return g.value; }))
        };
    }

    return {
        rank: 0,
        name: "High Card",
        kickers: values
    };
}

function getStraightHigh(uniqueValues) {
    const vals = uniqueValues.slice();

    if (vals.indexOf(14) !== -1) {
        vals.push(1);
    }

    for (let i = 0; i <= vals.length - 5; i++) {
        let ok = true;

        for (let j = 1; j < 5; j++) {
            if (vals[i + j] !== vals[i] - j) {
                ok = false;
                break;
            }
        }

        if (ok) return vals[i];
    }

    return 0;
}

function compareScores(a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;

    const len = Math.max(a.kickers.length, b.kickers.length);

    for (let i = 0; i < len; i++) {
        const av = a.kickers[i] || 0;
        const bv = b.kickers[i] || 0;

        if (av !== bv) return av - bv;
    }

    return 0;
}

function cardHtml(card, hidden) {
    if (hidden) {
        return "<div class=\"th-card th-back\">◆</div>";
    }

    const red = card.suit === "♥" || card.suit === "♦";

    return (
        "<div class=\"th-card " + (red ? "red" : "black") + "\">" +
            "<span>" + escapeHtml(card.rank) + "</span>" +
            "<b>" + escapeHtml(card.suit) + "</b>" +
        "</div>"
    );
}

function buildPlayerHtml(p) {
    const st = window.texasHoldemState;
    const me = myPlayer();
    const current = currentPlayer();
    const isMe = me && p.id === me.id;
    const isWinner = st.winners.indexOf(p.id) !== -1;
    const showCards = isMe || p.isComputer || st.round === "showdown" || st.phase === "handOver";

    return (
        "<div class=\"th-player " +
        (current && current.id === p.id && st.phase === "playing" ? "turn " : "") +
        (p.folded ? "folded " : "") +
        (isWinner ? "winner " : "") +
        "\">" +
            "<div class=\"th-player-top\">" +
                "<strong>" + escapeHtml(p.name) + "</strong>" +
                "<span>" + Number(p.chips || 0) + " chips</span>" +
            "</div>" +
            "<div class=\"th-mini-action\">" + escapeHtml(p.lastAction || (p.folded ? "Folded" : "")) + "</div>" +
            "<div class=\"th-hand\">" +
                (p.hand[0] ? cardHtml(p.hand[0], !showCards) : "<div class=\"th-card th-empty\"></div>") +
                (p.hand[1] ? cardHtml(p.hand[1], !showCards) : "<div class=\"th-card th-empty\"></div>") +
            "</div>" +
            "<div class=\"th-bet\">Bet: " + Number(p.bet || 0) + "</div>" +
        "</div>"
    );
}

function buildCommunityHtml() {
    const st = window.texasHoldemState;
    let html = "";

    for (let i = 0; i < 5; i++) {
        if (st.community[i]) {
            html += cardHtml(st.community[i], false);
        } else {
            html += "<div class=\"th-card th-empty\"></div>";
        }
    }

    return html;
}

function renderTexas() {
    const el = canvas();
    const st = window.texasHoldemState;

    if (!el || !st) return;

    const me = myPlayer();
    const myTurn = isMyTurn();
    const current = currentPlayer();
    const toCall = me ? Math.max(0, st.currentBet - me.bet) : 0;
    const canAct = st.phase === "playing" && myTurn && me && !me.folded && !me.allIn && me.chips > 0;
    const callText = toCall > 0 ? "Call " + toCall : "Check";
    const raiseText = st.currentBet > 0 ? "Raise " + st.minRaise : "Bet " + BIG_BLIND;

    const tablePlayers = st.players.map(buildPlayerHtml).join("");

    const actionButtons = st.phase === "playing" ? (
        "<div class=\"th-actions\">" +
            "<button onclick=\"texasFold()\" " + (canAct ? "" : "disabled") + " type=\"button\">Fold</button>" +
            "<button onclick=\"texasCheckCall()\" " + (canAct ? "" : "disabled") + " type=\"button\">" + callText + "</button>" +
            "<button onclick=\"texasBetRaise()\" " + (canAct ? "" : "disabled") + " class=\"th-gold\" type=\"button\">" + raiseText + "</button>" +
        "</div>"
    ) : "";

    const dealButton = st.phase !== "playing" ? (
        "<div class=\"th-actions\">" +
            "<button onclick=\"texasDealHand()\" class=\"th-gold\" type=\"button\">Deal Hand</button>" +
            "<button onclick=\"texasResetTable()\" type=\"button\">Reset Table</button>" +
        "</div>"
    ) : "";

    let titleLine = st.message || "";

    if (st.phase === "playing" && current) {
        titleLine = current.name + " to act.";
    }

    el.innerHTML = [
        "<style>",
            ".th-wrap{height:100%;overflow:auto;padding:8px 8px 70px;box-sizing:border-box;font-family:Arial,sans-serif;color:#e2f0d9;background:radial-gradient(circle at center,#125c35 0%,#063012 65%,#031d0b 100%);}",
            ".th-top{display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:560px;margin:0 auto 8px;}",
            ".th-pill{background:#e2f0d9;color:#1e4620;border-radius:13px;padding:7px 8px;text-align:center;font-weight:900;box-shadow:0 3px 8px rgba(0,0,0,.35);}",
            ".th-pill span{display:block;font-size:12px;margin-top:1px;}",
            ".th-message{text-align:center;color:#ffd700;font-weight:900;font-size:15px;line-height:1.15;max-width:620px;margin:6px auto;}",
            ".th-last{text-align:center;color:#ffffff;font-size:12px;font-weight:900;max-width:620px;margin:-2px auto 5px;opacity:.92;}",
            ".th-table{max-width:720px;margin:0 auto;border:3px solid #d4af37;border-radius:26px;background:rgba(0,0,0,.18);padding:10px;box-shadow:inset 0 0 25px rgba(0,0,0,.45),0 4px 15px rgba(0,0,0,.4);}",
            ".th-community-title{text-align:center;color:#ffd700;font-weight:900;font-size:14px;margin:2px 0 5px;}",
            ".th-community{display:flex;gap:6px;justify-content:center;margin:0 auto 9px;}",
            ".th-players{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:8px;}",
            ".th-player{background:rgba(226,240,217,.95);color:#1e4620;border:3px solid transparent;border-radius:14px;padding:7px;box-sizing:border-box;min-width:0;}",
            ".th-player.turn{border-color:#ff0000;box-shadow:0 0 0 2px #ff0000;}",
            ".th-player.folded{opacity:.55;}",
            ".th-player.winner{border-color:#ffd700;box-shadow:0 0 0 2px #ffd700;}",
            ".th-player-top{display:flex;justify-content:space-between;gap:6px;align-items:center;font-size:13px;font-weight:900;}",
            ".th-player-top strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            ".th-player-top span{font-size:11px;white-space:nowrap;}",
            ".th-mini-action{height:14px;font-size:11px;font-weight:900;text-align:center;color:#b00020;margin:1px 0;}",
            ".th-hand{display:flex;justify-content:center;gap:5px;margin:4px 0;}",
            ".th-card{width:42px;height:58px;background:#fff;border-radius:8px;border:2px solid #ddd;box-shadow:0 2px 4px rgba(0,0,0,.32);display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;position:relative;}",
            ".th-card span{font-size:16px;line-height:1;}",
            ".th-card b{font-size:20px;line-height:1;margin-top:2px;}",
            ".th-card.red{color:#c1121f;}",
            ".th-card.black{color:#111827;}",
            ".th-card.th-back{background:linear-gradient(135deg,#1d4ed8,#0f172a);color:#ffd700;font-size:23px;}",
            ".th-card.th-empty{background:rgba(255,255,255,.14);border:2px dashed rgba(255,255,255,.4);box-shadow:none;}",
            ".th-bet{text-align:center;font-size:11px;font-weight:900;}",
            ".th-actions{display:flex;gap:7px;justify-content:center;flex-wrap:wrap;margin:9px auto 6px;max-width:620px;}",
            ".th-actions button{border:none;border-radius:12px;padding:9px 13px;font-size:14px;font-weight:900;background:#e2f0d9;color:#1e4620;box-shadow:0 2px 6px rgba(0,0,0,.3);}",
            ".th-actions button.th-gold{background:#ffd700;color:#1e4620;}",
            ".th-actions button:disabled{background:#777;color:#222;box-shadow:none;}",
            ".th-rules{font-size:11px;line-height:1.2;text-align:center;color:#e2f0d9;max-width:620px;margin:6px auto 0;opacity:.9;}",
            "@media(max-width:390px){.th-wrap{padding:6px 6px 70px;}.th-card{width:36px;height:50px;border-radius:7px;}.th-card span{font-size:14px;}.th-card b{font-size:18px;}.th-community{gap:4px;}.th-player{padding:6px;}.th-actions button{font-size:13px;padding:8px 10px;}}",
        "</style>",
        "<div class=\"th-wrap\">",
            "<div class=\"th-top\">",
                "<div class=\"th-pill\">Pot<span>", Number(st.pot || 0), " chips</span></div>",
                "<div class=\"th-pill\">", escapeHtml((st.round || "table").toUpperCase()), "<span>Blinds ", SMALL_BLIND, " / ", BIG_BLIND, "</span></div>",
            "</div>",
            "<div class=\"th-message\">", escapeHtml(titleLine), "</div>",
            st.lastResult ? "<div class=\"th-last\">" + escapeHtml(st.lastResult) + "</div>" : "",
            "<div class=\"th-table\">",
                "<div class=\"th-community-title\">Community Cards</div>",
                "<div class=\"th-community\">", buildCommunityHtml(), "</div>",
                "<div class=\"th-players\">", tablePlayers, "</div>",
            "</div>",
            actionButtons,
            dealButton,
            "<div class=\"th-rules\">Fake chips only. Texas Holdem uses two private cards plus five community cards. Best five-card hand wins the pot.</div>",
        "</div>"
    ].join("");

    maybeComputerAction();
}

window.texasDealHand = dealHand;
window.texasFold = playerFold;
window.texasCheckCall = playerCheckCall;
window.texasBetRaise = playerBetRaise;

window.texasResetTable = function () {
    window.texasHoldemState = createState();
    renderTexas();
    syncTexas();
};

window.initTexasHoldemGame = function () {
    window.chaserGame = window.chaserGame || {};
    window.chaserGame.activeGame = "TexasHoldem";

    openStage();
    setHeader();

    const amHost = window.chaserGame && window.chaserGame.hostId === getMyId();

    if (amHost || !window.TexasHoldemState) {
        window.TexasHoldemState = createState();
        syncTexas();
    }

    renderTexas();
};

window.handleIncomingTexasHoldemSync = function (payload) {
    if (!payload || !payload.state) return;

    if (
        payload.roomGameId &&
        window.chaserGame &&
        window.chaserGame.activeGameId &&
        payload.roomGameId !== window.chaserGame.activeGameId
    ) {
        return;
    }

    window.TexasHoldemState = payload.state;

    if (window.chaserGame) window.chaserGame.activeGame = "TexasHoldem";

    renderTexas();
};

window.startTexasHoldemFromLobby = window.initTexasHoldemGame;
window.startTexasHoldemGame = window.initTexasHoldemGame;
window.initTexasHoldem = window.initTexasHoldemGame;
window.initTexasHoldEmGame = window.initTexasHoldemGame;
window.startTexasHoldEmGame = window.initTexasHoldemGame;

})();
