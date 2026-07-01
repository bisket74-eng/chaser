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

/* ---- Wonder boards: starting resource + 3 build stages each (side A) ----
   Corrected against cross-referenced retail rules/strategy sources. The
   real pattern on side A for six of the seven boards is: Stage 1 = 3 VP,
   Stage 2 = the wonder's unique special power, Stage 3 = 7 VP. Giza is
   the outlier — no special power, just 3/5/7 VP across all three stages.
   Several of these were previously assigned to the wrong stage (e.g.
   Babylon's science-symbol power and Halikarnassos's discard-pull power
   were both spread across all 3 stages instead of just stage 2; Rhodes'
   and Alexandria's stage 1 was giving coins instead of the correct 3 VP).
   One honest caveat: the *resource costs* on each stage (the exact
   "how many wood/clay/etc." numbers) are printed only on the physical
   card art, not in any text rulebook I can pull from search — so those
   are my best-sourced estimate rather than a verified transcription. If
   you want those numbers pixel-perfect, a photo of your boards would let
   me nail them exactly. */
const WONDER_BOARDS = {
    Alexandria: {
        startResource: "glass",
        stages: [
            { cost: { stone: 2 }, effect: "3 VP" },
            { cost: { ore: 2 }, effect: "+1 any resource/turn" },
            { cost: { papyrus: 1, cloth: 1, glass: 1 }, effect: "7 VP" }
        ]
    },
    Babylon: {
        startResource: "clay",
        stages: [
            { cost: { clay: 2 }, effect: "3 VP" },
            { cost: { wood: 1, papyrus: 1 }, effect: "Choose a Science symbol" },
            { cost: { clay: 1, glass: 1, papyrus: 1 }, effect: "7 VP" }
        ]
    },
    Ephesos: {
        startResource: "papyrus",
        stages: [
            { cost: { stone: 2 }, effect: "3 VP" },
            { cost: { wood: 2 }, effect: "+4 Coins" },
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
            { cost: { ore: 2 }, effect: "3 VP" },
            { cost: { clay: 3 }, effect: "Build free from discard" },
            { cost: { cloth: 1, glass: 1, papyrus: 1 }, effect: "7 VP" }
        ]
    },
    Olympia: {
        startResource: "wood",
        stages: [
            { cost: { wood: 2 }, effect: "3 VP" },
            { cost: { stone: 2 }, effect: "Build 1 free/Age" },
            { cost: { ore: 2, cloth: 1 }, effect: "7 VP" }
        ]
    },
    Rhodos: {
        startResource: "ore",
        stages: [
            { cost: { wood: 2 }, effect: "3 VP" },
            { cost: { clay: 3 }, effect: "+2 Shields" },
            { cost: { ore: 4 }, effect: "7 VP" }
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

/* ---- Card pool per Age. -----------------------------------------
   Each entry carries a `qty` (how many copies exist in the physical
   deck) instead of relying on a single copy per unique card, which
   is what was silently starving hands in games with more than 2
   players. buildAgeDeck() below expands qty into real instances and,
   as a safety net, tops the deck up with extra shuffled copies if a
   given table size still needs more than the base pool provides
   (7-player games need 49 cards in Age I alone). This is a curated
   set inspired by the retail game's categories/colors/costs rather
   than a guaranteed exact reprint of the official print run — happy
   to tighten specific cards to match your physical set if you want
   to send me the numbers off the cards themselves.
------------------------------------------------------------------ */
const CARD_POOL = {
    1: [
        { name: "Lumber Yard", type: "raw", produces: { wood: 1 }, cost: {}, qty: 3 },
        { name: "Clay Pool", type: "raw", produces: { clay: 1 }, cost: {}, qty: 3 },
        { name: "Stone Pit", type: "raw", produces: { stone: 1 }, cost: {}, qty: 3 },
        { name: "Ore Vein", type: "raw", produces: { ore: 1 }, cost: {}, qty: 3 },
        { name: "Glassworks", type: "manufactured", produces: { glass: 1 }, cost: {}, qty: 2 },
        { name: "Press", type: "manufactured", produces: { papyrus: 1 }, cost: {}, qty: 2 },
        { name: "Loom", type: "manufactured", produces: { cloth: 1 }, cost: {}, qty: 2 },
        { name: "Pawnshop", type: "civilian", cost: {}, vp: 3, qty: 2 },
        { name: "Theater", type: "civilian", cost: {}, vp: 3, chainTo: "Statue", qty: 2 },
        { name: "Baths", type: "civilian", cost: { stone: 1 }, vp: 3, chainTo: "Aqueduct", qty: 2 },
        { name: "Altar", type: "civilian", cost: {}, vp: 2, chainTo: "Temple", qty: 2 },
        { name: "Tavern", type: "commercial", cost: {}, coins: 4, qty: 3 },
        { name: "Stockade", type: "military", cost: { wood: 1 }, shields: 1, qty: 2 },
        { name: "Barracks", type: "military", cost: { ore: 1 }, shields: 1, qty: 2 },
        { name: "Guard Tower", type: "military", cost: { clay: 1 }, shields: 1, qty: 2 },
        { name: "Apothecary", type: "science", cost: { cloth: 1 }, science: "compass", chainTo: "Dispensary", qty: 2 },
        { name: "Workshop", type: "science", cost: { glass: 1 }, science: "gear", chainTo: "School", qty: 2 },
        { name: "Scriptorium", type: "science", cost: { papyrus: 1 }, science: "tablet", chainTo: "Library", qty: 2 }
    ],
    2: [
        { name: "Sawmill", type: "raw", produces: { wood: 2 }, cost: { coins: 1 }, qty: 2 },
        { name: "Brickyard", type: "raw", produces: { clay: 2 }, cost: { coins: 1 }, qty: 2 },
        { name: "Quarry", type: "raw", produces: { stone: 2 }, cost: { coins: 1 }, qty: 2 },
        { name: "Foundry", type: "raw", produces: { ore: 2 }, cost: { coins: 1 }, qty: 2 },
        { name: "Glass Furnace", type: "manufactured", produces: { glass: 1 }, cost: {}, qty: 2 },
        { name: "Drying Room", type: "manufactured", produces: { papyrus: 1 }, cost: {}, qty: 2 },
        { name: "Weaver's Guild", type: "manufactured", produces: { cloth: 1 }, cost: {}, qty: 2 },
        { name: "Aqueduct", type: "civilian", cost: { stone: 3 }, vp: 5, qty: 2 },
        { name: "Temple", type: "civilian", cost: { wood: 1, clay: 1, glass: 1 }, vp: 4, chainTo: "Pantheon", qty: 2 },
        { name: "Statue", type: "civilian", cost: { ore: 2, wood: 1 }, vp: 4, chainTo: "Gardens", qty: 2 },
        { name: "Courthouse", type: "civilian", cost: { clay: 2, cloth: 1 }, vp: 4, qty: 2 },
        { name: "Amphitheater", type: "civilian", cost: { stone: 2, papyrus: 1 }, vp: 5, qty: 2 },
        { name: "Forum", type: "commercial", cost: { clay: 2 }, coins: 3, qty: 2 },
        { name: "Caravansery", type: "commercial", cost: { wood: 2 }, coins: 2, qty: 2 },
        { name: "Walls", type: "military", cost: { stone: 3 }, shields: 2, qty: 2 },
        { name: "Training Ground", type: "military", cost: { ore: 2, wood: 1 }, shields: 2, qty: 2 },
        { name: "Dispensary", type: "science", cost: { ore: 2, glass: 1 }, science: "compass", chainTo: "Arsenal", qty: 2 },
        { name: "Library", type: "science", cost: { stone: 2, cloth: 1 }, science: "tablet", chainTo: "University", qty: 2 },
        { name: "School", type: "science", cost: { wood: 1, papyrus: 1 }, science: "gear", chainTo: "Academy", qty: 2 }
    ],
    3: [
        { name: "Pantheon", type: "civilian", cost: { clay: 2, ore: 1, papyrus: 1, cloth: 1, glass: 1 }, vp: 7, qty: 2 },
        { name: "Gardens", type: "civilian", cost: { clay: 2, wood: 1 }, vp: 6, qty: 2 },
        { name: "Town Hall", type: "civilian", cost: { stone: 2, ore: 1, glass: 1 }, vp: 6, qty: 2 },
        { name: "Palace", type: "civilian", cost: { wood: 1, stone: 1, clay: 1, ore: 1, glass: 1, papyrus: 1, cloth: 1 }, vp: 8, qty: 2 },
        { name: "Senate", type: "civilian", cost: { wood: 2, stone: 1, ore: 1 }, vp: 6, qty: 2 },
        { name: "Arsenal", type: "military", cost: { ore: 3, wood: 2 }, shields: 3, qty: 2 },
        { name: "Fortifications", type: "military", cost: { ore: 3, stone: 1 }, shields: 3, qty: 2 },
        { name: "Siege Workshop", type: "military", cost: { wood: 3, clay: 1 }, shields: 3, qty: 2 },
        { name: "Lodge", type: "science", cost: { clay: 2, papyrus: 1 }, science: "compass", qty: 2 },
        { name: "Observatory", type: "science", cost: { ore: 2, glass: 1, papyrus: 1 }, science: "gear", qty: 2 },
        { name: "University", type: "science", cost: { wood: 2, papyrus: 1, glass: 1 }, science: "tablet", qty: 2 },
        {
            name: "Merchants Guild", type: "guild", cost: { stone: 1, clay: 1, cloth: 1 }, qty: 2,
            guild: { countType: "commercial", perCard: 1, scope: "neighbors" }
        },
        {
            name: "Builders Guild", type: "guild", cost: { stone: 2, clay: 2, glass: 1 }, qty: 2,
            guild: { countType: "wonderStage", perCard: 1, scope: "neighbors" }
        },
        {
            name: "Craftsmen's Guild", type: "guild", cost: { ore: 2, stone: 2 }, qty: 2,
            guild: { countType: "manufactured", perCard: 2, scope: "neighbors" }
        },
        {
            name: "Magistrates Guild", type: "guild", cost: { wood: 3, stone: 1, cloth: 1 }, qty: 2,
            guild: { countType: "civilian", perCard: 1, scope: "neighbors" }
        }
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

/* ---- THE CORE FIX ---------------------------------------------
   Old code did: shuffle(CARD_POOL[age]).slice(0, 7 * seats)
   CARD_POOL[1] only had 15 *unique* card definitions (1 copy each),
   so with 3+ players it needed 21+ cards but the pool only ever had
   15 to give out. .slice() on a too-short array just quietly hands
   back whatever's left — so whichever seat came last in the deal
   order got a tiny leftover hand (sometimes just 1 card), and every
   other seat that rotates a hand in from them inherits that same
   shortfall on later turns. That's exactly the "7 cards, then 1
   card" bug.

   Fix: expand each card's `qty` into real copies, and if the table
   still needs more than that (e.g. a full 7-player game), keep
   adding shuffled full copies of the pool until there's enough for
   everyone. This makes it structurally impossible to run out.
------------------------------------------------------------------ */
function buildAgeDeck(ageNum, playerCount) {
    const base = CARD_POOL[ageNum];
    let expanded = [];
    base.forEach(function (card) {
        const copies = card.qty || 1;
        for (let i = 0; i < copies; i++) {
            expanded.push(Object.assign({}, card));
        }
    });

    const needed = CARDS_PER_HAND * playerCount;
    let safety = 0;
    while (expanded.length < needed && safety < 20) {
        base.forEach(function (card) {
            expanded.push(Object.assign({}, card));
        });
        safety++;
    }

    return shuffle(expanded).slice(0, needed);
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

function canUseOlympiaFreeBuild(player) {
    return player.wonder === "Olympia" && hasWonderStage(player, 1) && !player.usedFreeBuildThisAge;
}

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
    const pool = buildAgeDeck(ageNum, seats);

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

    if (canUseOlympiaFreeBuild(player) && hand.length) {
        return { action: "build", cardIdx: 0 };
    }

    if (player.wonder === "Halikarnassos" && hasWonderStage(player, 1) && st && st.discardPile.length && hand.length) {
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
        const stageIndexBuilt = player.wonderStage;
        const stage = board.stages[stageIndexBuilt];
        if (!stage) return;

        payCost(player, stage.cost);
        player.wonderStage += 1;

        const usedCard = player.hand[choice.cardIdx];
        if (usedCard) {
            st.discardPile.push(usedCard);
            player.hand.splice(choice.cardIdx, 1);
        }

        st.message = player.name + " built a Wonder stage: " + stage.effect + ".";

        // Babylon Stage 2 (the real A-side power): grants one Science
        // symbol of the player's choice, once, immediately. There's no
        // in-UI picker for this yet, so it auto-picks whichever symbol
        // the player has the fewest of — which tends to help complete a
        // matching set, the strongest way to spend it.
        if (player.wonder === "Babylon" && stageIndexBuilt === 1) {
            let weakest = "compass";
            ["compass", "gear", "tablet"].forEach(function (s) {
                if (player.science[s] < player.science[weakest]) weakest = s;
            });
            player.science[weakest] += 1;
            st.message += " Gained a free " + weakest + " symbol.";
        }

    } else if (choice.action === "discardFromPile") {
        const card = st.discardPile[choice.discardIdx];
        if (!card) return;

        buildCard(player, card, false);
        st.discardPile.splice(choice.discardIdx, 1);
        st.message = player.name + " pulled " + card.name + " from the discard pile (Halikarnassos).";

        const handCard = player.hand[choice.cardIdx];
        if (handCard) {
            st.discardPile.push(handCard);
            player.hand.splice(choice.cardIdx, 1);
        }

    } else {
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

            st.discardPile.push(leftoverCard);
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

/* Guild (purple) cards score based on neighbors' and/or your own
   tableau at game end. countType matches against a card's `type`
   field, except "wonderStage" which counts built wonder stages. */
function scoreGuilds(st) {
    const n = st.players.length;

    st.players.forEach(function (p, idx) {
        let guildVP = 0;

        p.tableau.forEach(function (card) {
            if (card.type !== "guild" || !card.guild) return;

            const targets = [];
            if (card.guild.scope === "neighbors" || card.guild.scope === "all") {
                const leftIdx = (idx - 1 + n) % n;
                const rightIdx = (idx + 1) % n;
                targets.push(st.players[leftIdx], st.players[rightIdx]);
            }
            if (card.guild.scope === "self" || card.guild.scope === "all") {
                targets.push(p);
            }

            targets.forEach(function (target) {
                if (!target) return;
                let count = 0;
                if (card.guild.countType === "wonderStage") {
                    count = target.wonderStage;
                } else {
                    count = target.tableau.filter(function (c) { return c.type === card.guild.countType; }).length;
                }
                guildVP += count * card.guild.perCard;
            });
        });

        p.guildVP = guildVP;
    });
}

function finishGame(st) {
    scoreGuilds(st);

    st.players.forEach(function (p) {
        const civilianVP = p.tableau.reduce(function (sum, c) { return sum + (c.vp || 0); }, 0);
        const coinVP = Math.floor(p.coins / 3);
        const scienceVP = scoreScience(p.science);
        p.finalScore = civilianVP + coinVP + scienceVP + (p.militaryVP || 0) + (p.guildVP || 0);
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
    if (!me.hand[idx]) return;

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

    me.pendingChoice = { action: "build", cardIdx: me.pendingChoice.cardIdx, forceOlympiaFree: true };
    finishMyTurnIfHost();
};

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
    if (card.type === "guild") return "👑";
    if (card.type === "civilian") return "🏛️";
    if (card.coins) return "💰";
    if (card.type === "commercial") return "🤝";
    return "❔";
}

function costLabel(cost) {
    if (!cost || Object.keys(cost).length === 0) return "Free";
    const parts = [];
    if (cost.coins) parts.push("💰" + cost.coins);
    RES_KEYS.forEach(function (k) { if (cost[k]) parts.push(RES_ICONS[k] + cost[k]); });
    return parts.join(" ");
}

/* The prominent value line shown directly under the card name —
   VP for civilian/guild cards, coin gain for commercial, shield
   count for military, science symbol count for science. */
function valueLabel(card) {
    if (card.type === "guild" && card.guild) return "👑 Guild";
    if (card.vp) return "🏆 " + card.vp + " VP";
    if (card.coins) return "+" + card.coins + " 💰";
    if (card.shields) return "+" + card.shields + " ⚔️";
    if (card.science) return "+1 " + SCIENCE_SYMBOLS[card.science];
    if (card.produces) {
        const entries = Object.entries(card.produces);
        if (entries.length === 1 && entries[0][1] > 1) return "×" + entries[0][1];
    }
    return "";
}

function swCardHtml(card, idx, me, selected) {
    const freeChain = hasChainInto(me, card.name);
    const affordable = freeChain || canAfford(me, card.cost);
    const val = valueLabel(card);

    return (
        "<div class=\"sw-card sw-type-" + card.type + (selected ? " sw-selected" : "") + (affordable ? "" : " sw-unafford") + "\" onclick=\"window.sevenWondersChooseCard(" + idx + ")\">" +
            "<div class=\"sw-card-top\">" +
                "<div class=\"sw-cost-badge\">" + (freeChain ? "FREE" : costLabel(card.cost)) + "</div>" +
                (card.chainTo ? "<div class=\"sw-chain-badge\" title=\"chains to " + escapeHtml(card.chainTo) + "\">⛓</div>" : "<div></div>") +
            "</div>" +
            "<div class=\"sw-card-body\">" +
                "<div class=\"sw-card-icon\">" + cardMainIcon(card) + "</div>" +
            "</div>" +
            "<div class=\"sw-card-name\">" + escapeHtml(card.name) + "</div>" +
            (val ? "<div class=\"sw-card-value\">" + escapeHtml(val) + "</div>" : "") +
        "</div>"
    );
}

function swTabCardHtml(card) {
    const val = valueLabel(card);
    return (
        "<div class=\"sw-tab-card sw-type-" + card.type + "\">" +
            "<div class=\"sw-tab-icon\">" + cardMainIcon(card) + "</div>" +
            "<div class=\"sw-tab-name\">" + escapeHtml(card.name) + "</div>" +
            (val ? "<div class=\"sw-tab-value\">" + escapeHtml(val) + "</div>" : "") +
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
    const hasSelection = !!(choice && choice.action === "select" && me.hand[choice.cardIdx]);
    const card = hasSelection ? me.hand[choice.cardIdx] : null;
    const locked = !!(choice && choice.action !== "select");

    const buildDisabled = !hasSelection || locked || !(canAfford(me, card.cost) || hasChainInto(me, card.name));
    const board = WONDER_BOARDS[me.wonder];
    const nextStage = board.stages[me.wonderStage];
    const wonderDisabled = !hasSelection || locked || me.wonderStage >= 3 || !nextStage || !canAfford(me, nextStage.cost);
    const discardDisabled = !hasSelection || locked;

    if (locked) {
        return "<div class=\"sw-waiting-msg\">Choice locked in. Waiting for other players...</div>";
    }

    let extraButtons = "";

    const olympiaAvailable = hasSelection && canUseOlympiaFreeBuild(me) && card && !hasChainInto(me, card.name);
    if (olympiaAvailable) {
        extraButtons += "<button class=\"sw-btn sw-btn-olympia\" onclick=\"window.sevenWondersConfirmOlympiaFree()\">Build Free (Olympia)</button>";
    }

    const halikarnassosAvailable = hasSelection && me.wonder === "Halikarnassos" && hasWonderStage(me, 1) &&
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

/* ---- Styles: sized up considerably ("zoomed in") vs. the original.
   Base font bumped, wonder board/card/hand card dimensions increased,
   so the whole table reads clearly on a phone screen. ---- */
function swStyles() {
    return (
        "<style>" +
            ".sw-wrap{height:100%;overflow:auto;box-sizing:border-box;font-family:Georgia,'Times New Roman',serif;color:#e8dcc4;background:linear-gradient(180deg,#1d1611,#2b2017);padding-bottom:84px;font-size:16px;}" +
            ".sw-topbar{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:rgba(0,0,0,.25);border-bottom:1px solid rgba(201,162,39,.3);}" +
            ".sw-opponents{display:flex;gap:8px;flex-wrap:wrap;}" +
            ".sw-opp-avatar{width:42px;height:42px;border-radius:50%;border:2px solid #c9a227;display:flex;align-items:center;justify-content:center;font-size:17px;background:#6b6359;position:relative;cursor:pointer;color:#fff;}" +
            ".sw-mil-badge{position:absolute;bottom:-5px;right:-5px;background:#b3342c;border-radius:50%;width:19px;height:19px;font-size:11px;display:flex;align-items:center;justify-content:center;border:1px solid #1d1611;}" +
            ".sw-age-indicator{text-align:right;font-size:12px;color:#c9a227;text-transform:uppercase;}" +
            ".sw-age-line{font-size:19px;font-weight:bold;color:#e8dcc4;}" +
            ".sw-age-line .sw-age-label{color:#c9a227;font-size:12px;margin-right:5px;}" +
            ".sw-round-line{font-size:11px;opacity:.7;margin-top:2px;}" +
            ".sw-wonder-board{margin:10px 12px 0;border-radius:10px;background:linear-gradient(160deg,#d9c89a,#c4b07e);border:2px solid #8a6f1c;padding:12px;color:#2b2017;}" +
            ".sw-wonder-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;}" +
            ".sw-wonder-title{font-weight:bold;font-size:19px;}" +
            ".sw-wonder-start{font-size:13px;background:rgba(0,0,0,.12);padding:3px 10px;border-radius:12px;font-weight:bold;}" +
            ".sw-wstage-row{display:flex;gap:8px;}" +
            ".sw-wstage{flex:1;background:rgba(255,255,255,.35);border:1.5px dashed rgba(43,32,23,.4);border-radius:8px;padding:10px 6px;text-align:center;min-height:76px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;}" +
            ".sw-wstage.sw-built{background:#c9a227;border-style:solid;border-color:#8a6f1c;}" +
            ".sw-wcost{font-size:19px;font-weight:bold;margin-bottom:5px;line-height:1;}" +
            ".sw-weffect{font-size:13px;font-weight:600;line-height:1.25;}" +
            ".sw-wcheck{position:absolute;top:3px;right:5px;font-size:16px;}" +
            ".sw-res-bar{display:flex;gap:10px;padding:10px 14px;overflow-x:auto;background:rgba(0,0,0,.2);margin-top:8px;font-size:15px;}" +
            ".sw-res-chip{padding:4px 10px;border-radius:12px;background:rgba(255,255,255,.08);white-space:nowrap;flex-shrink:0;}" +
            ".sw-res-coins{background:rgba(201,162,39,.25);color:#c9a227;font-weight:bold;}" +
            ".sw-tableau-area{padding:14px 14px;}" +
            ".sw-tableau-label{font-size:13px;text-transform:uppercase;color:rgba(232,220,196,.5);margin-bottom:8px;}" +
            ".sw-tableau{display:flex;flex-wrap:wrap;gap:8px;}" +
            ".sw-tab-card{width:70px;height:92px;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;text-align:center;border:1px solid rgba(255,255,255,.15);padding:4px;color:#fff;}" +
            ".sw-tab-icon{font-size:26px;line-height:1;}" +
            ".sw-tab-name{font-size:9.5px;line-height:1.15;}" +
            ".sw-tab-value{font-size:9.5px;font-weight:bold;color:#ffd700;}" +
            ".sw-empty-tableau{font-size:14px;color:rgba(232,220,196,.35);font-style:italic;padding:16px 0;}" +
            ".sw-hand-area{background:rgba(0,0,0,.35);border-top:1px solid rgba(201,162,39,.3);padding:12px 0 14px;}" +
            ".sw-hand-label{font-size:13px;text-transform:uppercase;color:#c9a227;padding:0 14px 8px;display:flex;justify-content:space-between;}" +
            ".sw-hand-scroll{display:flex;gap:10px;overflow-x:auto;padding:0 14px 6px;}" +
            ".sw-card{flex-shrink:0;width:120px;height:180px;border-radius:9px;padding:0;border:2px solid rgba(0,0,0,.35);cursor:pointer;background:#e8dcc4;overflow:hidden;display:flex;flex-direction:column;position:relative;}" +
            ".sw-card.sw-selected{transform:translateY(-10px);box-shadow:0 5px 18px rgba(201,162,39,.6);border-color:#c9a227;}" +
            ".sw-card.sw-unafford{opacity:.5;}" +
            ".sw-card-top{display:flex;justify-content:space-between;align-items:flex-start;padding:5px 6px 0;height:22px;}" +
            ".sw-cost-badge{background:rgba(255,255,255,.85);color:#2b2017;border-radius:9px;padding:2px 6px;font-size:11px;font-weight:bold;border:1px solid rgba(0,0,0,.2);white-space:nowrap;}" +
            ".sw-chain-badge{background:#fff;border-radius:50%;width:19px;height:19px;display:flex;align-items:center;justify-content:center;font-size:11px;border:1px solid rgba(0,0,0,.3);}" +
            ".sw-card-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px;text-align:center;}" +
            ".sw-card-icon{font-size:46px;line-height:1;letter-spacing:-2px;}" +
            ".sw-card-name{background:rgba(0,0,0,.55);color:#fff;font-size:11.5px;font-weight:bold;text-align:center;padding:5px 4px 2px;line-height:1.2;}" +
            ".sw-card-value{background:rgba(0,0,0,.55);color:#ffd700;font-size:12px;font-weight:900;text-align:center;padding:0 4px 6px;line-height:1.2;}" +
            ".sw-type-raw .sw-card-body{background:linear-gradient(160deg,#6b4226,#4a2d18);}" +
            ".sw-type-manufactured .sw-card-body{background:linear-gradient(160deg,#8d8d90,#6b6b6e);}" +
            ".sw-type-civilian .sw-card-body{background:linear-gradient(160deg,#3b6ea5,#2a4f78);}" +
            ".sw-type-commercial .sw-card-body{background:linear-gradient(160deg,#e0a82e,#b8851c);}" +
            ".sw-type-military .sw-card-body{background:linear-gradient(160deg,#b3342c,#8a241e);}" +
            ".sw-type-science .sw-card-body{background:linear-gradient(160deg,#3f8f5f,#2c6943);}" +
            ".sw-type-guild .sw-card-body{background:linear-gradient(160deg,#7b4397,#5c2f73);}" +
            ".sw-tab-card.sw-type-raw{background:#6b4226;} .sw-tab-card.sw-type-manufactured{background:#8d8d90;} .sw-tab-card.sw-type-civilian{background:#3b6ea5;} .sw-tab-card.sw-type-commercial{background:#e0a82e;color:#2b2017;} .sw-tab-card.sw-type-military{background:#b3342c;} .sw-tab-card.sw-type-science{background:#3f8f5f;} .sw-tab-card.sw-type-guild{background:#7b4397;}" +
            ".sw-action-bar{display:flex;gap:10px;padding:0 14px;margin-top:10px;}" +
            ".sw-btn{flex:1;padding:13px;border-radius:8px;border:none;font-size:14px;font-weight:bold;text-transform:uppercase;cursor:pointer;}" +
            ".sw-btn-build{background:#c9a227;color:#2b2017;}" +
            ".sw-btn-wonder{background:rgba(255,255,255,.12);color:#e8dcc4;}" +
            ".sw-btn-discard{background:rgba(179,52,44,.4);color:#e8dcc4;}" +
            ".sw-btn:disabled{opacity:.35;cursor:not-allowed;}" +
            ".sw-action-bar-extra{margin-top:8px;}" +
            ".sw-btn-olympia{background:rgba(63,143,95,.55);color:#fff;}" +
            ".sw-btn-halikarnassos{background:rgba(123,67,151,.55);color:#fff;}" +
            ".sw-waiting-msg{text-align:center;font-size:15px;color:#c9a227;font-weight:bold;padding:8px 14px;}" +
            ".sw-message{text-align:center;color:#ffd700;font-weight:900;font-size:16px;padding:8px 14px;}" +
            "#swModalOverlay{position:absolute;inset:0;background:rgba(0,0,0,.7);display:none;align-items:center;justify-content:center;z-index:50;padding:20px;}" +
            "#swModalOverlay.sw-show{display:flex;}" +
            "#swModalBox{background:#2b2017;border:1px solid #c9a227;border-radius:12px;padding:18px;width:100%;max-width:400px;max-height:72vh;overflow-y:auto;color:#e8dcc4;}" +
            "#swModalBox h3{margin:0 0 12px;color:#c9a227;font-size:18px;}" +
            "#swModalClose{display:block;margin:16px auto 0;background:#c9a227;color:#2b2017;border:none;padding:9px 22px;border-radius:7px;font-weight:bold;font-size:14px;}" +
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
            "<div class=\"sw-wrap\" style=\"display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;text-align:center;padding:24px;\">" +
                "<div style=\"font-size:30px;color:#ffd700;font-weight:900;\">GAME OVER</div>" +
                "<div style=\"font-size:18px;color:#e8dcc4;font-weight:bold;\">" + escapeHtml(st.message) + "</div>" +
                "<div style=\"font-size:14px;color:#a3cfbb;\">" + escapeHtml(st.lastResult || "") + "</div>" +
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
                        const selected = me.pendingChoice && me.pendingChoice.action === "select" && me.pendingChoice.cardIdx === idx;
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

/* Incoming syncs used to blow away your in-progress card selection if
   another player's action synced first (you'd tap a card, then it
   would silently deselect because the whole state object gets
   replaced wholesale). Now we snapshot a local, not-yet-broadcast
   "select" choice and re-apply it after the incoming state lands. */
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

    const myId = getMyId();
    const previous = window.sevenWondersState;
    const previousMe = previous && previous.players ? previous.players.find(function (p) { return p.id === myId; }) : null;
    const unsyncedSelection = (previousMe && previousMe.pendingChoice && previousMe.pendingChoice.action === "select")
        ? previousMe.pendingChoice
        : null;

    window.sevenWondersState = payload.state;

    if (unsyncedSelection) {
        const newMe = window.sevenWondersState.players.find(function (p) { return p.id === myId; });
        if (newMe && !newMe.pendingChoice && newMe.hand[unsyncedSelection.cardIdx]) {
            newMe.pendingChoice = unsyncedSelection;
        }
    }

    if (window.chaserGame) window.chaserGame.activeGame = "7 Wonders";

    renderSevenWonders();
};

window.startSevenWondersFromLobby = window.initSevenWondersGame;
window.startSevenWondersGame = window.initSevenWondersGame;

})();
