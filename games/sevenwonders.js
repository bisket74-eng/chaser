/* CHASER 7 WONDERS - SEPARATE GAME FILE
Card-drafting civilization builder, 3-7 players (synced rooms)
Host fills any empty seats with AI civilization leaders on Start
*/
;(function () {
"use strict";

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 7;
const CARDS_PER_HAND = 7;

const RES_KEYS = ["wood", "clay", "stone", "ore", "glass", "papyrus", "cloth"];

const RES_ICONS = {
    wood: "🪵", clay: "🧱", stone: "🪨", ore: "⛏️",
    glass: "🔷", papyrus: "📜", cloth: "🧵", coins: "💰"
};

const SCIENCE_SYMBOLS = { compass: "🧭", gear: "⚙️", tablet: "📐" };

/* ---- Wonder boards: starting resource + 3 build stages each ---- */
const WONDER_BOARDS = {
    Alexandria: {
        startResource: "glass",
        stages: [
            { cost: { stone: 2 }, effect: "+2 Coins" },
            { cost: { ore: 2 }, effect: "+1 any resource/turn" },
            { cost: { papyrus: 1, cloth: 1, glass: 1 }, effect: "7 VP" }
        ]
    },
    Babylon: {
        startResource: "clay",
        stages: [
            { cost: { clay: 2 }, effect: "3 VP" },
            { cost: { wood: 1, papyrus: 1 }, effect: "Play last card of Age" },
            { cost: { clay: 1, glass: 1, papyrus: 1 }, effect: "7 VP" }
        ]
    },
    Ephesos: {
        startResource: "papyrus",
        stages: [
            { cost: { stone: 2 }, effect: "+3 Coins, 2 VP" },
            { cost: { wood: 2 }, effect: "+4 Coins, 1 VP" },
            { cost: { papyrus: 1, cloth: 1, glass: 1 }, effect: "7 VP" }
        ]
    },
    Giza: {
        startResource: "stone",
        stages: [
            { cost: { wood: 2 }, effect: "3 VP" },
            { cost: { clay: 3 }, effect: "5 VP" },
            { cost: { stone: 4 }, effect: "7 VP" }
        ]
    },
    Halikarnassos: {
        startResource: "ore",
        stages: [
            { cost: { ore: 2 }, effect: "Build free from discard" },
            { cost: { clay: 3 }, effect: "Build free from discard" },
            { cost: { cloth: 1, glass: 1, papyrus: 1 }, effect: "Build free from discard" }
        ]
    },
    Olympia: {
        startResource: "wood",
        stages: [
            { cost: { wood: 2 }, effect: "Build 1 free/Age" },
            { cost: { stone: 2 }, effect: "+1 free Science symbol" },
            { cost: { ore: 2, cloth: 1 }, effect: "7 VP" }
        ]
    },
    Rhodos: {
        startResource: "ore",
        stages: [
            { cost: { wood: 2 }, effect: "+2 Shields, 3 VP" },
            { cost: { clay: 3 }, effect: "+2 Shields, 4 VP" },
            { cost: { ore: 4 }, effect: "+2 Shields, 5 VP" }
        ]
    }
};

const WONDER_NAMES = Object.keys(WONDER_BOARDS);

/* AI civilization leaders, grouped by the wonder they're thematically
   tied to. Each AI is named to match whichever wonder board they are
   randomly assigned, so "Nebuchadnezzar" always ends up leading
   Babylon, never Giza. */
const AI_LEADER_NAMES = {
    Alexandria: ["Sostratus", "Ptolemy"],
    Babylon: ["Nebuchadnezzar", "Semiramis"],
    Ephesos: ["Chersiphron", "Artemisia"],
    Giza: ["Khufu", "Hemiunu"],
    Halikarnassos: ["Mausolus", "Pytheos"],
    Olympia: ["Phidias", "Pelops"],
    Rhodos: ["Chares", "Helios"]
};

/* ---- Card pool per Age. Trimmed but representative set. ---- */
const CARD_POOL = {
    1: [
        { name: "Lumber Yard", type: "raw", produces: { wood: 1 }, cost: {} },
        { name: "Clay Pool", type: "raw", produces: { clay: 1 }, cost: {} },
        { name: "Stone Pit", type: "raw", produces: { stone: 1 }, cost: {} },
        { name: "Ore Vein", type: "raw", produces: { ore: 1 }, cost: {} },
        { name: "Glassworks", type: "manufactured", produces: { glass: 1 }, cost: {} },
        { name: "Press", type: "manufactured", produces: { papyrus: 1 }, cost: {} },
        { name: "Loom", type: "manufactured", produces: { cloth: 1 }, cost: {} },
        { name: "Theater", type: "civilian", cost: {}, vp: 3, chainTo: "Statue" },
        { name: "Baths", type: "civilian", cost: { stone: 1 }, vp: 3, chainTo: "Aqueduct" },
        { name: "Altar", type: "civilian", cost: {}, vp: 2, chainTo: "Temple" },
        { name: "Tavern", type: "commercial", cost: {}, coins: 4 },
        { name: "Stockade", type: "military", cost: { wood: 1 }, shields: 1 },
        { name: "Barracks", type: "military", cost: { ore: 1 }, shields: 1 },
        { name: "Apothecary", type: "science", cost: { cloth: 1 }, science: "compass", chainTo: "Dispensary" },
        { name: "Workshop", type: "science", cost: { glass: 1 }, science: "gear", chainTo: "School" },
        { name: "Scriptorium", type: "science", cost: { papyrus: 1 }, science: "tablet", chainTo: "Library" }
    ],
    2: [
        { name: "Sawmill", type: "raw", produces: { wood: 2 }, cost: { coins: 1 } },
        { name: "Brickyard", type: "raw", produces: { clay: 2 }, cost: { coins: 1 } },
        { name: "Quarry", type: "raw", produces: { stone: 2 }, cost: { coins: 1 } },
        { name: "Aqueduct", type: "civilian", cost: { stone: 3 }, vp: 5 },
        { name: "Temple", type: "civilian", cost: { wood: 1, clay: 1, glass: 1 }, vp: 4, chainTo: "Pantheon" },
        { name: "Statue", type: "civilian", cost: { ore: 2, wood: 1 }, vp: 4, chainTo: "Gardens" },
        { name: "Courthouse", type: "civilian", cost: { clay: 2, cloth: 1 }, vp: 4 },
        { name: "Forum", type: "commercial", cost: { clay: 2 }, coins: 3 },
        { name: "Caravansery", type: "commercial", cost: { wood: 2 }, coins: 2 },
        { name: "Walls", type: "military", cost: { stone: 3 }, shields: 2 },
        { name: "Training Ground", type: "military", cost: { ore: 2, wood: 1 }, shields: 2 },
        { name: "Dispensary", type: "science", cost: { ore: 2, glass: 1 }, science: "compass", chainTo: "Arsenal" },
        { name: "Library", type: "science", cost: { stone: 2, cloth: 1 }, science: "tablet", chainTo: "University" },
        { name: "School", type: "science", cost: { wood: 1, papyrus: 1 }, science: "gear", chainTo: "Academy" }
    ],
    3: [
        { name: "Pantheon", type: "civilian", cost: { clay: 2, ore: 1, papyrus: 1, cloth: 1, glass: 1 }, vp: 7 },
        { name: "Gardens", type: "civilian", cost: { clay: 2, wood: 1 }, vp: 6 },
        { name: "Town Hall", type: "civilian", cost: { stone: 2, ore: 1, glass: 1 }, vp: 6 },
        { name: "Palace", type: "civilian", cost: { wood: 1, stone: 1, clay: 1, ore: 1, glass: 1, papyrus: 1, cloth: 1 }, vp: 8 },
        { name: "Arsenal", type: "military", cost: { ore: 3, wood: 2 }, shields: 3 },
        { name: "Fortifications", type: "military", cost: { ore: 3, stone: 1 }, shields: 3 },
        { name: "Siege Workshop", type: "military", cost: { wood: 3, clay: 1 }, shields: 3 },
        { name: "Lodge", type: "science", cost: { clay: 2, papyrus: 1 }, science: "compass" },
        { name: "Observatory", type: "science", cost: { ore: 2, glass: 1, papyrus: 1 }, science: "gear" },
        { name: "University", type: "science", cost: { wood: 2, papyrus: 1, glass: 1 }, science: "tablet" },
        { name: "Merchants Guild", type: "guild", cost: { stone: 1, clay: 1, cloth: 1 }, vp: 1 },
        { name: "Builders Guild", type: "guild", cost: { stone: 2, clay: 2, glass: 1 }, vp: 1 }
    ]
};

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

    if (roomDisplay) roomDisplay.innerText = "🏛️ 7 Wonders";
    if (headerBtns) headerBtns.style.display = "none";
    if (chatHeader) chatHeader.classList.add("game-active-mode");
}

function syncSevenWonders() {
    if (typeof channel !== "undefined" && channel && window.sevenWondersState) {
        channel.send({
            type: "broadcast",
            event: "sevenwonders-sync-state",
            payload: {
                state: window.sevenWondersState,
                roomGameId: window.chaserGame && window.chaserGame.activeGameId ? window.chaserGame.activeGameId : null
            }
        });
    }
}

function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
    }
    return a;
}

/* Fills any seats beyond the human players already in the lobby with
   AI civilization leaders, up to targetCount. Mirrors the role
   Texas Hold'em's DEALER_BOT_ID plays, but supports any number of
   fill-ins rather than exactly one. */
function buildSeatedPlayers(targetCount) {
    const lobbyPlayers = window.chaserGame && window.chaserGame.players && window.chaserGame.players.length
        ? window.chaserGame.players
        : [{ id: getMyId(), name: myName(), seat: 0 }];

    const humanSeats = lobbyPlayers.slice(0, MAX_PLAYERS);
    const finalCount = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, targetCount || humanSeats.length));

    const availableWonders = shuffle(WONDER_NAMES);
    const seats = [];

    humanSeats.forEach(function (p, idx) {
        const wonder = availableWonders[idx % availableWonders.length];
        seats.push(makeSeat(p.id, p.name || "Player " + (idx + 1), false, wonder));
    });

    let aiNeeded = Math.max(0, finalCount - seats.length);
    let aiIndex = 0;

    while (aiNeeded > 0) {
        const wonder = availableWonders[seats.length % availableWonders.length];
        const namePool = AI_LEADER_NAMES[wonder] || ["Leader"];
        const aiName = namePool[aiIndex % namePool.length];

        seats.push(makeSeat("7wonders-ai-" + seats.length, aiName, true, wonder));

        aiNeeded--;
        aiIndex++;
    }

    return seats;
}

function makeSeat(id, name, isComputer, wonder) {
    const board = WONDER_BOARDS[wonder];
    const resources = { wood: 0, clay: 0, stone: 0, ore: 0, glass: 0, papyrus: 0, cloth: 0 };
    resources[board.startResource] += 1;

    return {
        id: id,
        name: name,
        isComputer: isComputer,
        wonder: wonder,
        wonderStage: 0,
        resources: resources,
        coins: 3,
        tableau: [],
        shields: 0,
        science: { compass: 0, gear: 0, tablet: 0 },
        hand: [],
        pendingChoice: null
    };
}

function createState(targetCount) {
    const players = buildSeatedPlayers(targetCount);

    return {
        phase: "table",
        age: 1,
        round: 1,
        direction: 1,
        players: players,
        discardPile: [],
        message: "Dealing Age I...",
        lastResult: ""
    };
}

function myPlayer() {
    const st = window.sevenWondersState;
    if (!st) return null;
    return st.players.find(function (p) { return p.id === getMyId(); }) || null;
}

function canAfford(player, cost) {
    if (!cost) return true;
    if (player.coins < (cost.coins || 0)) return false;
    for (let i = 0; i < RES_KEYS.length; i++) {
        const k = RES_KEYS[i];
        if (cost[k] && player.resources[k] < cost[k]) return false;
    }
    return true;
}

function payCost(player, cost) {
    if (!cost) return;
    if (cost.coins) player.coins -= cost.coins;
    RES_KEYS.forEach(function (k) {
        if (cost[k]) player.resources[k] -= cost[k];
    });
}

function hasChainInto(player, cardName) {
    return player.tableau.some(function (c) { return c.chainTo === cardName; });
}

/* ---- Wonder special-effect helpers ---- */

function hasWonderStage(player, stageIndex) {
    return player.wonderStage > stageIndex;
}

/* Babylon stage 2 (index 1): normally, when 2 cards remain in everyone's
   hand, each player plays one and the other is discarded unseen forever.
   A player with this stage built gets to play (build/wonder/sell) that
   final card too, instead of losing it automatically. */
function hasBabylonLastCardPerk(player) {
    return player.wonder === "Babylon" && hasWonderStage(player, 1);
}

/* Olympia stage 1 (index 0): build one card per Age completely free,
   regardless of cost. Tracked via usedFreeBuildThisAge, reset each Age
   in dealAge(). */
function canUseOlympiaFreeBuild(player) {
    return player.wonder === "Olympia" && hasWonderStage(player, 0) && !player.usedFreeBuildThisAge;
}

/* Alexandria stage 1 (index 1, the SECOND stage): produces one extra
   resource of the player's choice every turn, on top of the wonder's
   normal starting resource. For the AI and for simplicity we grant
   the resource the player currently holds the least of, so it tends
   to plug their biggest gap. */
function applyAlexandriaFlexResource(player) {
    if (player.wonder !== "Alexandria" || !hasWonderStage(player, 1)) return;

    let lowestKey = RES_KEYS[0];
    RES_KEYS.forEach(function (k) {
        if (player.resources[k] < player.resources[lowestKey]) lowestKey = k;
    });

    player.resources[lowestKey] += 1;
}

function buildCard(player, card, viaFreeOlympia) {
    const chainFree = hasChainInto(player, card.name);
    const olympiaFree = !chainFree && viaFreeOlympia;

    if (!chainFree && !olympiaFree) {
        payCost(player, card.cost);
    }

    if (olympiaFree) player.usedFreeBuildThisAge = true;

    if (card.produces) {
        Object.keys(card.produces).forEach(function (k) {
            player.resources[k] += card.produces[k];
        });
    }
    if (card.coins) player.coins += card.coins;
    if (card.shields) player.shields += card.shields;
    if (card.science) player.science[card.science] += 1;

    player.tableau.push(card);
    return { free: chainFree, olympiaFree: olympiaFree };
}

function dealAge(st, ageNum) {
    const seats = st.players.length;
    const pool = shuffle(CARD_POOL[ageNum]).slice(0, CARDS_PER_HAND * seats);

    st.players.forEach(function (p, idx) {
        p.hand = pool.slice(idx * CARDS_PER_HAND, (idx + 1) * CARDS_PER_HAND);
        p.pendingChoice = null;
        p.usedFreeBuildThisAge = false; // Olympia stage 1 resets each Age
    });

    st.direction = ageNum === 2 ? -1 : 1;
    st.round = 1;
}

/* ---- AI choice: picks build > wonder > Halikarnassos discard-pull > discard ---- */
function computerChoose(player, st) {
    const hand = player.hand;
    const affordableIdx = [];

    hand.forEach(function (c, i) {
        if (canAfford(player, c.cost) || hasChainInto(player, c.name)) affordableIdx.push(i);
    });

    if (affordableIdx.length > 0) {
        const idx = affordableIdx[Math.floor(Math.random() * affordableIdx.length)];
        return { action: "build", cardIdx: idx };
    }

    // Nothing affordable from hand — try Olympia's free build if available.
    if (canUseOlympiaFreeBuild(player) && hand.length) {
        return { action: "build", cardIdx: 0 };
    }

    // Try pulling a buildable card from the shared discard pile
    // (Halikarnassos only).
    if (player.wonder === "Halikarnassos" && hasWonderStage(player, 0) && st && st.discardPile.length && hand.length) {
        for (let i = 0; i < st.discardPile.length; i++) {
            const pileCard = st.discardPile[i];
            if (canAfford(player, pileCard.cost) || hasChainInto(player, pileCard.name)) {
                return { action: "discardFromPile", cardIdx: 0, discardIdx: i };
            }
        }
    }

    const board = WONDER_BOARDS[player.wonder];
    const nextStage = board.stages[player.wonderStage];

    if (nextStage && canAfford(player, nextStage.cost) && hand.length) {
        return { action: "wonder", cardIdx: 0 };
    }

    return { action: "discard", cardIdx: 0 };
}

/* Applies Alexandria's flex resource and any other "every turn"
   passive effects. Called once per player per round, regardless of
   what action they took, since the wonder boards' passive resource
   production happens every turn in the real game. */
function applyPerTurnWonderEffects(player) {
    applyAlexandriaFlexResource(player);
}

function applyChoice(st, player, choice) {
    if (choice.action === "build") {
        const card = player.hand[choice.cardIdx];
        if (!card) return;

        const useOlympia = choice.forceOlympiaFree ||
            (!hasChainInto(player, card.name) && !canAfford(player, card.cost) && canUseOlympiaFreeBuild(player));
        const result = buildCard(player, card, useOlympia);

        let suffix = "";
        if (result.free) suffix = " (free chain!)";
        else if (result.olympiaFree) suffix = " (free via Olympia!)";

        st.message = player.name + " built " + card.name + suffix + ".";
        player.hand.splice(choice.cardIdx, 1);

    } else if (choice.action === "wonder") {
        const board = WONDER_BOARDS[player.wonder];
        const stage = board.stages[player.wonderStage];
        if (!stage) return;

        payCost(player, stage.cost);
        const builtStageIndex = player.wonderStage;
        player.wonderStage += 1;

        // The card used to build the wonder stage is discarded face down,
        // same as in the real game — it does not enter the tableau.
        const usedCard = player.hand[choice.cardIdx];
        if (usedCard) {
            st.discardPile.push(usedCard);
            player.hand.splice(choice.cardIdx, 1);
        }

        st.message = player.name + " built a Wonder stage: " + stage.effect + ".";

        // Olympia stage 2 (index 1): immediately grants one free Science
        // symbol of the player's choice. We auto-pick whichever symbol
        // the player has fewest of, so it helps complete a set.
        if (player.wonder === "Olympia" && builtStageIndex === 1) {
            let weakest = "compass";
            ["compass", "gear", "tablet"].forEach(function (s) {
                if (player.science[s] < player.science[weakest]) weakest = s;
            });
            player.science[weakest] += 1;
            st.message += " Gained a free " + weakest + " symbol.";
        }

    } else if (choice.action === "discardFromPile") {
        // Halikarnassos: build a card pulled from the shared discard
        // pile for free, instead of from your own hand.
        const card = st.discardPile[choice.discardIdx];
        if (!card) return;

        buildCard(player, card, false);
        st.discardPile.splice(choice.discardIdx, 1);
        st.message = player.name + " pulled " + card.name + " from the discard pile (Halikarnassos).";

        // The hand card chosen alongside this action is still discarded,
        // matching how Halikarnassos works in the real game: you still
        // use up one of your hand cards' turn, you just build from the
        // pile instead of building/discarding that hand card directly.
        const handCard = player.hand[choice.cardIdx];
        if (handCard) {
            st.discardPile.push(handCard);
            player.hand.splice(choice.cardIdx, 1);
        }

    } else {
        // discard for coins
        const card = player.hand[choice.cardIdx];
        player.coins += 3;
        st.message = player.name + " sold a card for 3 coins.";
        if (card) {
            st.discardPile.push(card);
            player.hand.splice(choice.cardIdx, 1);
        }
    }

    applyPerTurnWonderEffects(player);
    player.pendingChoice = null;
}

function allChoicesIn(st) {
    return st.players.every(function (p) { return p.isComputer || p.pendingChoice !== null; });
}

function resolveRound() {
    const st = window.sevenWondersState;
    if (!st) return;

    // Detect whether this round began with exactly 2 cards in hand —
    // the final pick of the Age. Normally the 2nd card vanishes
    // unseen; Babylon's last stage lets that player build it instead.
    const isFinalPickOfAge = st.players[0].hand.length === 2;

    st.players.forEach(function (p) {
        if (p.isComputer) {
            p.pendingChoice = computerChoose(p, st);
        }
    });

    st.players.forEach(function (p) {
        if (p.pendingChoice) applyChoice(st, p, p.pendingChoice);
    });

    if (isFinalPickOfAge) {
        st.players.forEach(function (p) {
            const leftoverCard = p.hand[0];
            if (!leftoverCard) return;

            if (hasBabylonLastCardPerk(p)) {
                // Auto-build if affordable/chainable, otherwise sell it
                // for coins rather than losing it for nothing.
                if (canAfford(p, leftoverCard.cost) || hasChainInto(p, leftoverCard.name)) {
                    buildCard(p, leftoverCard, false);
                    st.message = (st.message || "") + " " + p.name + " played their last card via Babylon!";
                } else {
                    p.coins += 3;
                    st.message = (st.message || "") + " " + p.name + " sold their last card via Babylon.";
                }
            } else {
                st.discardPile.push(leftoverCard);
            }

            p.hand = [];
        });
    }

    if (st.players[0].hand.length === 0) {
        scoreMilitaryForAge(st, st.age);

        st.age += 1;

        if (st.age > 3) {
            finishGame(st);
            return;
        }

        dealAge(st, st.age);
        st.message = "Age " + (st.age === 2 ? "II" : "III") + " begins.";
    } else {
        rotateHands(st);
        st.round += 1;
    }

    syncSevenWonders();
    renderSevenWonders();
    maybeComputerAutoResolve();
}

function rotateHands(st) {
    const seats = st.players;
    const hands = seats.map(function (p) { return p.hand; });
    const n = seats.length;

    seats.forEach(function (p, idx) {
        const sourceIdx = ((idx - st.direction) % n + n) % n;
        p.hand = hands[sourceIdx];
    });
}

/* Resolves military conflict for the Age that just ended. Real rules:
   compare shields against BOTH neighbors for THIS age only, award
   conflict tokens (+1/+3/+5 VP by age) for wins, -1 VP for losses,
   ties give nothing. Tokens accumulate across ages, this just adds
   this age's result to the running total. */
function scoreMilitaryForAge(st, ageJustEnded) {
    const n = st.players.length;
    const ageMultiplier = { 1: 1, 2: 3, 3: 5 };
    const winPoints = ageMultiplier[ageJustEnded] || 1;

    st.players.forEach(function (p) {
        p.militaryVP = p.militaryVP || 0;
        p.conflictLog = p.conflictLog || [];
    });

    st.players.forEach(function (p, idx) {
        const leftIdx = (idx - 1 + n) % n;
        const rightIdx = (idx + 1) % n;

        [leftIdx, rightIdx].forEach(function (neighborIdx) {
            const neighbor = st.players[neighborIdx];

            if (p.shields > neighbor.shields) {
                p.militaryVP += winPoints;
                p.conflictLog.push("Age " + ageJustEnded + ": won vs " + neighbor.name + " (+" + winPoints + ")");
            } else if (p.shields < neighbor.shields) {
                p.militaryVP -= 1;
                p.conflictLog.push("Age " + ageJustEnded + ": lost vs " + neighbor.name + " (-1)");
            }
        });
    });
}

function finishGame(st) {
    // Military is already scored per-Age via scoreMilitaryForAge, called
    // from resolveRound each time an Age ends. Nothing more to add here.

    st.players.forEach(function (p) {
        const civilianVP = p.tableau.reduce(function (sum, c) { return sum + (c.vp || 0); }, 0);
        const coinVP = Math.floor(p.coins / 3);
        const scienceVP = scoreScience(p.science);
        p.finalScore = civilianVP + coinVP + scienceVP + (p.militaryVP || 0);
    });

    const ranked = st.players.slice().sort(function (a, b) { return b.finalScore - a.finalScore; });

    st.phase = "ended";
    st.message = ranked[0].name + " wins with " + ranked[0].finalScore + " points!";
    st.lastResult = ranked.map(function (p) { return p.name + ": " + p.finalScore; }).join(" · ");
}

function scoreScience(science) {
    const sets = Math.min(science.compass, science.gear, science.tablet);
    const squares = (science.compass * science.compass) + (science.gear * science.gear) + (science.tablet * science.tablet);
    return squares + (sets * 7);
}

function maybeComputerAutoResolve() {
    const st = window.sevenWondersState;
    if (!st || st.phase !== "table") return;
    if (!window.chaserGame || window.chaserGame.hostId !== getMyId()) return;
}

/* ---- Player actions ---- */

window.sevenWondersChooseCard = function (idx) {
    const st = window.sevenWondersState;
    const me = myPlayer();
    if (!st || !me || me.pendingChoice) return;

    me.pendingChoice = { action: "select", cardIdx: idx };
    renderSevenWonders();
};

window.sevenWondersConfirmBuild = function () {
    const st = window.sevenWondersState;
    const me = myPlayer();
    if (!st || !me || !me.pendingChoice) return;

    const card = me.hand[me.pendingChoice.cardIdx];
    if (!card) return;
    if (!canAfford(me, card.cost) && !hasChainInto(me, card.name)) return;

    me.pendingChoice = { action: "build", cardIdx: me.pendingChoice.cardIdx };
    finishMyTurnIfHost();
};

window.sevenWondersConfirmWonder = function () {
    const st = window.sevenWondersState;
    const me = myPlayer();
    if (!st || !me || !me.pendingChoice) return;

    const board = WONDER_BOARDS[me.wonder];
    const stage = board.stages[me.wonderStage];
    if (!stage || !canAfford(me, stage.cost)) return;

    me.pendingChoice = { action: "wonder", cardIdx: me.pendingChoice.cardIdx };
    finishMyTurnIfHost();
};

window.sevenWondersConfirmDiscard = function () {
    const st = window.sevenWondersState;
    const me = myPlayer();
    if (!st || !me || !me.pendingChoice) return;

    me.pendingChoice = { action: "discard", cardIdx: me.pendingChoice.cardIdx };
    finishMyTurnIfHost();
};

window.sevenWondersConfirmOlympiaFree = function () {
    const me = myPlayer();
    if (!me || !me.pendingChoice || !canUseOlympiaFreeBuild(me)) return;

    // Mark this as a build action; applyChoice() detects Olympia's free
    // build automatically when the card isn't otherwise affordable, but
    // since the player explicitly tapped this button we want it to
    // apply even if they happen to also be able to afford it normally.
    me.pendingChoice = { action: "build", cardIdx: me.pendingChoice.cardIdx, forceOlympiaFree: true };
    finishMyTurnIfHost();
};

/* Halikarnassos: opens a small inline picker over the discard pile so
   the player can choose which card to pull, since unlike Build/Wonder/
   Discard there's more than one possible target. */
window.sevenWondersOpenDiscardPile = function () {
    const st = window.sevenWondersState;
    const me = myPlayer();
    if (!st || !me || !me.pendingChoice) return;

    const modal = document.getElementById("swModalOverlay");
    const title = document.getElementById("swModalTitle");
    const content = document.getElementById("swModalContent");
    if (!modal || !title || !content) return;

    title.textContent = "Build from the discard pile";

    if (!st.discardPile.length) {
        content.innerHTML = "<div style='font-size:13px;opacity:.7;'>The discard pile is empty.</div>";
    } else {
        content.innerHTML = "<div style='display:flex;flex-wrap:wrap;gap:8px;'>" +
            st.discardPile.map(function (card, i) {
                const affordable = canAfford(me, card.cost) || hasChainInto(me, card.name);
                return (
                    "<div class=\"sw-tab-card sw-type-" + card.type + "\" style=\"cursor:" + (affordable ? "pointer" : "not-allowed") + ";opacity:" + (affordable ? "1" : ".4") + ";\" " +
                        (affordable ? "onclick=\"window.sevenWondersConfirmHalikarnassos(" + i + ")\"" : "") + ">" +
                        "<div class=\"sw-tab-icon\">" + cardMainIcon(card) + "</div>" +
                        "<div class=\"sw-tab-name\">" + escapeHtml(card.name) + "</div>" +
                    "</div>"
                );
            }).join("") +
        "</div>";
    }

    modal.classList.add("sw-show");
};

window.sevenWondersConfirmHalikarnassos = function (discardIdx) {
    const me = myPlayer();
    if (!me || !me.pendingChoice) return;

    const pileCard = window.sevenWondersState.discardPile[discardIdx];
    if (!pileCard) return;
    if (!canAfford(me, pileCard.cost) && !hasChainInto(me, pileCard.name)) return;

    me.pendingChoice = { action: "discardFromPile", cardIdx: me.pendingChoice.cardIdx, discardIdx: discardIdx };
    window.sevenWondersCloseModal();
    finishMyTurnIfHost();
};

function finishMyTurnIfHost() {
    const st = window.sevenWondersState;
    syncSevenWonders();
    renderSevenWonders();

    const amHost = window.chaserGame && window.chaserGame.hostId === getMyId();
    if (amHost && allChoicesIn(st)) {
        setTimeout(resolveRound, 400);
    }
}

window.sevenWondersOpenOpponent = function (playerId) {
    const st = window.sevenWondersState;
    if (!st) return;
    const p = st.players.find(function (x) { return x.id === playerId; });
    if (!p) return;

    const modal = document.getElementById("swModalOverlay");
    const title = document.getElementById("swModalTitle");
    const content = document.getElementById("swModalContent");
    if (!modal || !title || !content) return;

    title.textContent = p.name + "'s city — " + p.wonder;

    const resLine = RES_KEYS.filter(function (k) { return p.resources[k] > 0; })
        .map(function (k) { return RES_ICONS[k] + p.resources[k]; }).join(" ") || "No resources yet";

    const tableauHtml = p.tableau.length
        ? p.tableau.map(function (c) { return swTabCardHtml(c); }).join("")
        : "<span style='font-size:12px;opacity:.6;'>Nothing built yet</span>";

    content.innerHTML =
        "<div style='margin-bottom:8px;font-size:13px;'>💰 " + p.coins + " &nbsp; ⚔️ " + p.shields + " shields &nbsp; 🏛️ stage " + p.wonderStage + "/3</div>" +
        "<div style='margin-bottom:10px;font-size:13px;'>" + escapeHtml(resLine) + "</div>" +
        "<div style='display:flex;flex-wrap:wrap;gap:5px;'>" + tableauHtml + "</div>";

    modal.classList.add("sw-show");
};

window.sevenWondersCloseModal = function () {
    const modal = document.getElementById("swModalOverlay");
    if (modal) modal.classList.remove("sw-show");
};

/* ---- Card visuals ---- */

function cardMainIcon(card) {
    if (card.produces) {
        const keys = Object.keys(card.produces);
        if (keys.length === 1) return RES_ICONS[keys[0]];
        return keys.map(function (k) { return RES_ICONS[k]; }).join("");
    }
    if (card.science) return SCIENCE_SYMBOLS[card.science];
    if (card.shields) return "⚔️".repeat(Math.min(card.shields, 3));
    if (card.type === "civilian") return "🏛️";
    if (card.coins) return "💰";
    if (card.type === "commercial") return "🤝";
    if (card.type === "guild") return "👑";
    return "❔";
}

function costLabel(cost) {
    if (!cost || Object.keys(cost).length === 0) return "Free";
    const parts = [];
    if (cost.coins) parts.push("💰" + cost.coins);
    RES_KEYS.forEach(function (k) { if (cost[k]) parts.push(RES_ICONS[k] + cost[k]); });
    return parts.join(" ");
}

function effectLabel(card) {
    if (card.produces) {
        const entries = Object.entries(card.produces);
        if (entries.length === 1 && entries[0][1] === 1) return "";
        return entries.map(function (e) { return "×" + e[1]; }).join(" ");
    }
    if (card.science || card.shields) return "";
    if (card.vp) return card.vp + " VP";
    if (card.coins) return "+" + card.coins + " 💰";
    return "";
}

function swCardHtml(card, idx, me, selected) {
    const freeChain = hasChainInto(me, card.name);
    const affordable = freeChain || canAfford(me, card.cost);
    const eff = effectLabel(card);

    return (
        "<div class=\"sw-card sw-type-" + card.type + (selected ? " sw-selected" : "") + (affordable ? "" : " sw-unafford") + "\" onclick=\"window.sevenWondersChooseCard(" + idx + ")\">" +
            "<div class=\"sw-card-top\">" +
                "<div class=\"sw-cost-badge\">" + (freeChain ? "FREE" : costLabel(card.cost)) + "</div>" +
                (card.chainTo ? "<div class=\"sw-chain-badge\" title=\"chains to " + escapeHtml(card.chainTo) + "\">⛓</div>" : "<div></div>") +
            "</div>" +
            "<div class=\"sw-card-body\">" +
                "<div class=\"sw-card-icon\">" + cardMainIcon(card) + "</div>" +
                (eff ? "<div class=\"sw-card-effect\">" + escapeHtml(eff) + "</div>" : "") +
            "</div>" +
            "<div class=\"sw-card-name\">" + escapeHtml(card.name) + "</div>" +
        "</div>"
    );
}

function swTabCardHtml(card) {
    return (
        "<div class=\"sw-tab-card sw-type-" + card.type + "\">" +
            "<div class=\"sw-tab-icon\">" + cardMainIcon(card) + "</div>" +
            "<div class=\"sw-tab-name\">" + escapeHtml(card.name) + "</div>" +
        "</div>"
    );
}

function swWonderBoardHtml(me) {
    const board = WONDER_BOARDS[me.wonder];

    const stagesHtml = board.stages.map(function (stage, i) {
        const built = i < me.wonderStage;
        const costStr = Object.keys(stage.cost).length
            ? Object.entries(stage.cost).map(function (e) { return RES_ICONS[e[0]] + e[1]; }).join(" ")
            : "Free";

        return (
            "<div class=\"sw-wstage" + (built ? " sw-built" : "") + "\">" +
                (built ? "<div class=\"sw-wcheck\">✓</div>" : "") +
                "<div class=\"sw-wcost\">" + costStr + "</div>" +
                "<div class=\"sw-weffect\">" + escapeHtml(stage.effect) + "</div>" +
            "</div>"
        );
    }).join("");

    return (
        "<div class=\"sw-wonder-board\">" +
            "<div class=\"sw-wonder-header\">" +
                "<div class=\"sw-wonder-title\">" + escapeHtml(me.wonder) + "</div>" +
                "<div class=\"sw-wonder-start\">" + RES_ICONS[board.startResource] + " produces 1/turn</div>" +
            "</div>" +
            "<div class=\"sw-wstage-row\">" + stagesHtml + "</div>" +
        "</div>"
    );
}

function swResourceBarHtml(me) {
    let html = "<div class=\"sw-res-chip sw-res-coins\">💰" + me.coins + "</div>";
    RES_KEYS.forEach(function (k) {
        if (me.resources[k] > 0) {
            html += "<div class=\"sw-res-chip\">" + RES_ICONS[k] + me.resources[k] + "</div>";
        }
    });
    return html;
}

function swOpponentsHtml(st, me) {
    return st.players.filter(function (p) { return p.id !== me.id; }).map(function (p) {
        const badge = p.shields > 0 ? "<div class=\"sw-mil-badge\">" + p.shields + "</div>" : "";
        return (
            "<div class=\"sw-opp-avatar\" onclick=\"window.sevenWondersOpenOpponent('" + p.id + "')\">" +
                escapeHtml(p.name[0]) + badge +
            "</div>"
        );
    }).join("");
}

function swActionBarHtml(me, st) {
    const choice = me.pendingChoice;
    const hasSelection = choice && choice.action === "select";
    const card = hasSelection ? me.hand[choice.cardIdx] : null;
    const locked = choice && choice.action !== "select";

    const buildDisabled = !hasSelection || locked || !(canAfford(me, card.cost) || hasChainInto(me, card.name));
    const board = WONDER_BOARDS[me.wonder];
    const nextStage = board.stages[me.wonderStage];
    const wonderDisabled = !hasSelection || locked || me.wonderStage >= 3 || !nextStage || !canAfford(me, nextStage.cost);
    const discardDisabled = !hasSelection || locked;

    if (locked) {
        return "<div class=\"sw-waiting-msg\">Choice locked in. Waiting for other players...</div>";
    }

    let extraButtons = "";

    // Olympia stage 1: build the selected card completely free, once
    // per Age, regardless of its normal cost.
    const olympiaAvailable = hasSelection && canUseOlympiaFreeBuild(me) && card && !hasChainInto(me, card.name);
    if (olympiaAvailable) {
        extraButtons += "<button class=\"sw-btn sw-btn-olympia\" onclick=\"window.sevenWondersConfirmOlympiaFree()\">Build Free (Olympia)</button>";
    }

    // Halikarnassos: pull any buildable card from the shared discard
    // pile, using up the selected hand card in the process.
    const halikarnassosAvailable = hasSelection && me.wonder === "Halikarnassos" && hasWonderStage(me, 0) &&
        st && st.discardPile && st.discardPile.length > 0;

    if (halikarnassosAvailable) {
        extraButtons += "<button class=\"sw-btn sw-btn-halikarnassos\" onclick=\"window.sevenWondersOpenDiscardPile()\">Build from Discard</button>";
    }

    return (
        "<div class=\"sw-action-bar\">" +
            "<button class=\"sw-btn sw-btn-build\" " + (buildDisabled ? "disabled" : "") + " onclick=\"window.sevenWondersConfirmBuild()\">Build</button>" +
            "<button class=\"sw-btn sw-btn-wonder\" " + (wonderDisabled ? "disabled" : "") + " onclick=\"window.sevenWondersConfirmWonder()\">Build Wonder</button>" +
            "<button class=\"sw-btn sw-btn-discard\" " + (discardDisabled ? "disabled" : "") + " onclick=\"window.sevenWondersConfirmDiscard()\">Sell for 💰3</button>" +
        "</div>" +
        (extraButtons ? "<div class=\"sw-action-bar sw-action-bar-extra\">" + extraButtons + "</div>" : "")
    );
}

function swStyles() {
    return (
        "<style>" +
            ".sw-wrap{height:100%;overflow:auto;box-sizing:border-box;font-family:Georgia,'Times New Roman',serif;color:#e8dcc4;background:linear-gradient(180deg,#1d1611,#2b2017);padding-bottom:70px;}" +
            ".sw-topbar{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:rgba(0,0,0,.25);border-bottom:1px solid rgba(201,162,39,.3);}" +
            ".sw-opponents{display:flex;gap:6px;flex-wrap:wrap;}" +
            ".sw-opp-avatar{width:34px;height:34px;border-radius:50%;border:2px solid #c9a227;display:flex;align-items:center;justify-content:center;font-size:14px;background:#6b6359;position:relative;cursor:pointer;color:#fff;}" +
            ".sw-mil-badge{position:absolute;bottom:-4px;right:-4px;background:#b3342c;border-radius:50%;width:15px;height:15px;font-size:9px;display:flex;align-items:center;justify-content:center;border:1px solid #1d1611;}" +
            ".sw-age-indicator{text-align:right;font-size:11px;color:#c9a227;text-transform:uppercase;}" +
            ".sw-age-line{font-size:15px;font-weight:bold;color:#e8dcc4;}" +
            ".sw-age-line .sw-age-label{color:#c9a227;font-size:11px;margin-right:4px;}" +
            ".sw-round-line{font-size:10px;opacity:.7;margin-top:2px;}" +
            ".sw-wonder-board{margin:8px 10px 0;border-radius:8px;background:linear-gradient(160deg,#d9c89a,#c4b07e);border:2px solid #8a6f1c;padding:8px;color:#2b2017;}" +
            ".sw-wonder-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}" +
            ".sw-wonder-title{font-weight:bold;font-size:14px;}" +
            ".sw-wonder-start{font-size:11px;background:rgba(0,0,0,.12);padding:2px 8px;border-radius:10px;font-weight:bold;}" +
            ".sw-wstage-row{display:flex;gap:6px;}" +
            ".sw-wstage{flex:1;background:rgba(255,255,255,.35);border:1.5px dashed rgba(43,32,23,.4);border-radius:6px;padding:7px 5px;text-align:center;min-height:58px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;}" +
            ".sw-wstage.sw-built{background:#c9a227;border-style:solid;border-color:#8a6f1c;}" +
            ".sw-wcost{font-size:15px;font-weight:bold;margin-bottom:4px;line-height:1;}" +
            ".sw-weffect{font-size:11px;font-weight:600;line-height:1.2;}" +
            ".sw-wcheck{position:absolute;top:2px;right:4px;font-size:13px;}" +
            ".sw-res-bar{display:flex;gap:8px;padding:7px 12px;overflow-x:auto;background:rgba(0,0,0,.2);margin-top:6px;font-size:12px;}" +
            ".sw-res-chip{padding:3px 7px;border-radius:10px;background:rgba(255,255,255,.08);white-space:nowrap;flex-shrink:0;}" +
            ".sw-res-coins{background:rgba(201,162,39,.25);color:#c9a227;font-weight:bold;}" +
            ".sw-tableau-area{padding:10px 12px;}" +
            ".sw-tableau-label{font-size:11px;text-transform:uppercase;color:rgba(232,220,196,.5);margin-bottom:6px;}" +
            ".sw-tableau{display:flex;flex-wrap:wrap;gap:6px;}" +
            ".sw-tab-card{width:54px;height:72px;border-radius:5px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;text-align:center;border:1px solid rgba(255,255,255,.15);padding:3px;color:#fff;}" +
            ".sw-tab-icon{font-size:20px;line-height:1;}" +
            ".sw-tab-name{font-size:8px;line-height:1.1;}" +
            ".sw-empty-tableau{font-size:12px;color:rgba(232,220,196,.35);font-style:italic;padding:14px 0;}" +
            ".sw-hand-area{background:rgba(0,0,0,.35);border-top:1px solid rgba(201,162,39,.3);padding:10px 0 12px;}" +
            ".sw-hand-label{font-size:11px;text-transform:uppercase;color:#c9a227;padding:0 12px 6px;display:flex;justify-content:space-between;}" +
            ".sw-hand-scroll{display:flex;gap:8px;overflow-x:auto;padding:0 12px 4px;}" +
            ".sw-card{flex-shrink:0;width:92px;height:140px;border-radius:7px;padding:0;border:2px solid rgba(0,0,0,.35);cursor:pointer;background:#e8dcc4;overflow:hidden;display:flex;flex-direction:column;position:relative;}" +
            ".sw-card.sw-selected{transform:translateY(-8px);box-shadow:0 4px 14px rgba(201,162,39,.6);border-color:#c9a227;}" +
            ".sw-card.sw-unafford{opacity:.5;}" +
            ".sw-card-top{display:flex;justify-content:space-between;align-items:flex-start;padding:4px 5px 0;height:18px;}" +
            ".sw-cost-badge{background:rgba(255,255,255,.85);color:#2b2017;border-radius:8px;padding:1px 5px;font-size:9px;font-weight:bold;border:1px solid rgba(0,0,0,.2);white-space:nowrap;}" +
            ".sw-chain-badge{background:#fff;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:9px;border:1px solid rgba(0,0,0,.3);}" +
            ".sw-card-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2px 4px;text-align:center;}" +
            ".sw-card-icon{font-size:34px;line-height:1;letter-spacing:-2px;}" +
            ".sw-card-effect{font-size:9px;color:#fff;font-weight:bold;line-height:1.2;text-shadow:0 1px 2px rgba(0,0,0,.4);}" +
            ".sw-card-name{background:rgba(0,0,0,.55);color:#fff;font-size:10px;font-weight:bold;text-align:center;padding:4px 3px;line-height:1.15;}" +
            ".sw-type-raw .sw-card-body{background:linear-gradient(160deg,#6b4226,#4a2d18);}" +
            ".sw-type-manufactured .sw-card-body{background:linear-gradient(160deg,#8d8d90,#6b6b6e);}" +
            ".sw-type-civilian .sw-card-body{background:linear-gradient(160deg,#3b6ea5,#2a4f78);}" +
            ".sw-type-commercial .sw-card-body{background:linear-gradient(160deg,#e0a82e,#b8851c);}" +
            ".sw-type-military .sw-card-body{background:linear-gradient(160deg,#b3342c,#8a241e);}" +
            ".sw-type-science .sw-card-body{background:linear-gradient(160deg,#3f8f5f,#2c6943);}" +
            ".sw-type-guild .sw-card-body{background:linear-gradient(160deg,#7b4397,#5c2f73);}" +
            ".sw-tab-card.sw-type-raw{background:#6b4226;} .sw-tab-card.sw-type-manufactured{background:#8d8d90;} .sw-tab-card.sw-type-civilian{background:#3b6ea5;} .sw-tab-card.sw-type-commercial{background:#e0a82e;color:#2b2017;} .sw-tab-card.sw-type-military{background:#b3342c;} .sw-tab-card.sw-type-science{background:#3f8f5f;} .sw-tab-card.sw-type-guild{background:#7b4397;}" +
            ".sw-action-bar{display:flex;gap:8px;padding:0 12px;margin-top:8px;}" +
            ".sw-btn{flex:1;padding:10px;border-radius:6px;border:none;font-size:13px;font-weight:bold;text-transform:uppercase;cursor:pointer;}" +
            ".sw-btn-build{background:#c9a227;color:#2b2017;}" +
            ".sw-btn-wonder{background:rgba(255,255,255,.12);color:#e8dcc4;}" +
            ".sw-btn-discard{background:rgba(179,52,44,.4);color:#e8dcc4;}" +
            ".sw-btn:disabled{opacity:.35;cursor:not-allowed;}" +
            ".sw-action-bar-extra{margin-top:6px;}" +
            ".sw-btn-olympia{background:rgba(63,143,95,.55);color:#fff;}" +
            ".sw-btn-halikarnassos{background:rgba(123,67,151,.55);color:#fff;}" +
            ".sw-waiting-msg{text-align:center;font-size:13px;color:#c9a227;font-weight:bold;padding:6px 12px;}" +
            ".sw-message{text-align:center;color:#ffd700;font-weight:900;font-size:14px;padding:6px 12px;}" +
            "#swModalOverlay{position:absolute;inset:0;background:rgba(0,0,0,.7);display:none;align-items:center;justify-content:center;z-index:50;padding:20px;}" +
            "#swModalOverlay.sw-show{display:flex;}" +
            "#swModalBox{background:#2b2017;border:1px solid #c9a227;border-radius:10px;padding:16px;width:100%;max-width:360px;max-height:70vh;overflow-y:auto;color:#e8dcc4;}" +
            "#swModalBox h3{margin:0 0 10px;color:#c9a227;font-size:16px;}" +
            "#swModalClose{display:block;margin:14px auto 0;background:#c9a227;color:#2b2017;border:none;padding:8px 20px;border-radius:6px;font-weight:bold;}" +
        "</style>"
    );
}

function renderSevenWonders() {
    const el = canvas();
    const st = window.sevenWondersState;
    if (!el || !st) return;

    const me = myPlayer();
    if (!me) {
        el.innerHTML = "<div style='color:white;padding:20px;text-align:center;'>You are not seated at this table.</div>";
        return;
    }

    if (st.phase === "ended") {
        el.innerHTML = swStyles() +
            "<div class=\"sw-wrap\" style=\"display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:14px;text-align:center;padding:20px;\">" +
                "<div style=\"font-size:26px;color:#ffd700;font-weight:900;\">GAME OVER</div>" +
                "<div style=\"font-size:16px;color:#e8dcc4;font-weight:bold;\">" + escapeHtml(st.message) + "</div>" +
                "<div style=\"font-size:13px;color:#a3cfbb;\">" + escapeHtml(st.lastResult || "") + "</div>" +
            "</div>";
        return;
    }

    const ageWords = { 1: "I", 2: "II", 3: "III" };

    el.innerHTML =
        swStyles() +
        "<div class=\"sw-wrap\">" +
            "<div class=\"sw-topbar\">" +
                "<div class=\"sw-opponents\">" + swOpponentsHtml(st, me) + "</div>" +
                "<div class=\"sw-age-indicator\">" +
                    "<div class=\"sw-age-line\"><span class=\"sw-age-label\">AGE</span>" + ageWords[st.age] + "</div>" +
                    "<div class=\"sw-round-line\">ROUND " + st.round + "</div>" +
                "</div>" +
            "</div>" +

            swWonderBoardHtml(me) +

            "<div class=\"sw-res-bar\">" + swResourceBarHtml(me) + "</div>" +

            (st.message ? "<div class=\"sw-message\">" + escapeHtml(st.message) + "</div>" : "") +

            "<div class=\"sw-tableau-area\">" +
                "<div class=\"sw-tableau-label\">Your city</div>" +
                "<div class=\"sw-tableau\">" +
                    (me.tableau.length ? me.tableau.map(swTabCardHtml).join("") : "<div class=\"sw-empty-tableau\">Nothing built yet — your first pick will start your city.</div>") +
                "</div>" +
            "</div>" +

            "<div class=\"sw-hand-area\">" +
                "<div class=\"sw-hand-label\"><span>Your hand — pick a card</span><span>💰" + me.coins + "</span></div>" +
                "<div class=\"sw-hand-scroll\">" +
                    me.hand.map(function (card, idx) {
                        const selected = me.pendingChoice && me.pendingChoice.cardIdx === idx;
                        return swCardHtml(card, idx, me, selected);
                    }).join("") +
                "</div>" +
                swActionBarHtml(me, st) +
            "</div>" +

            "<div id=\"swModalOverlay\">" +
                "<div id=\"swModalBox\">" +
                    "<h3 id=\"swModalTitle\">Player</h3>" +
                    "<div id=\"swModalContent\"></div>" +
                    "<button id=\"swModalClose\" onclick=\"window.sevenWondersCloseModal()\">Close</button>" +
                "</div>" +
            "</div>" +
        "</div>";
}

/* ---- Lobby integration ---- */

window.initSevenWondersGame = function () {
    window.chaserGame = window.chaserGame || {};
    window.chaserGame.activeGame = "7 Wonders";

    openStage();
    setHeader();

    const amHost = window.chaserGame && window.chaserGame.hostId === getMyId();

    if (amHost || !window.sevenWondersState) {
        const targetCount = window.chaserGame.expectedPlayers || (window.chaserGame.players ? window.chaserGame.players.length : MIN_PLAYERS);
        window.sevenWondersState = createState(targetCount);
        dealAge(window.sevenWondersState, 1);
        window.sevenWondersState.message = "Age I begins. Pick a card.";
        syncSevenWonders();
    }

    renderSevenWonders();
};

window.handleIncomingSevenWondersSync = function (payload) {
    if (!payload || !payload.state) return;

    if (
        payload.roomGameId &&
        window.chaserGame &&
        window.chaserGame.activeGameId &&
        payload.roomGameId !== window.chaserGame.activeGameId
    ) {
        return;
    }

    window.sevenWondersState = payload.state;

    if (window.chaserGame) window.chaserGame.activeGame = "7 Wonders";

    renderSevenWonders();
};

window.startSevenWondersFromLobby = window.initSevenWondersGame;
window.startSevenWondersGame = window.initSevenWondersGame;

})();
