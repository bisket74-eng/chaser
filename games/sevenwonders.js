/* ENCODING-SAFE ASCII VERSION: Unicode symbols use JavaScript \u escapes so Android/browser decoding cannot corrupt them. */
/* CHASER WONDERS - COMPLETE SEPARATE GAME FILE
   Phone-first card-drafting civilization game for 3-7 players.
   Uses the existing Chaser room, player list and Supabase broadcast channel.

   IMPORTANT:
   - Screen title is "Wonders".
   - The visual design is original, but uses the familiar functional card colors:
     brown resources, gray goods, blue civic, yellow trade, red military,
     green science and purple guilds.
   - Keeps the existing Chaser entry-point names so no index.html change is needed.
*/
;(function () {
"use strict";

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 7;
const CARDS_PER_HAND = 7;
const RAW_RES = ["wood", "clay", "stone", "ore"];
const GOODS_RES = ["glass", "papyrus", "cloth"];
const RES_KEYS = RAW_RES.concat(GOODS_RES);
const TYPE_ORDER = ["raw", "manufactured", "civilian", "commercial", "military", "science", "guild"];

const RES_ICONS = {
    wood: "\uD83E\uDEB5",
    clay: "\uD83E\uDDF1",
    stone: "\uD83E\uDEA8",
    ore: "\u26CF\uFE0F",
    glass: "\uD83D\uDD37",
    papyrus: "\uD83D\uDCDC",
    cloth: "\uD83E\uDDF5",
    coins: "\uD83E\uDE99"
};

const RES_NAMES = {
    wood: "Wood",
    clay: "Clay",
    stone: "Stone",
    ore: "Ore",
    glass: "Glass",
    papyrus: "Papyrus",
    cloth: "Cloth"
};

const SCIENCE_ICONS = {
    compass: "\uD83E\uDDED",
    gear: "\u2699\uFE0F",
    tablet: "\uD83D\uDCD0"
};

const TYPE_INFO = {
    raw: { label: "Raw Material", short: "Brown", symbol: "\uD83D\uDFEB" },
    manufactured: { label: "Manufactured Good", short: "Gray", symbol: "\u2B1C" },
    civilian: { label: "Civic Structure", short: "Blue", symbol: "\uD83D\uDD35" },
    commercial: { label: "Commercial Structure", short: "Yellow", symbol: "\uD83D\uDFE1" },
    military: { label: "Military Structure", short: "Red", symbol: "\uD83D\uDD34" },
    science: { label: "Scientific Structure", short: "Green", symbol: "\uD83D\uDFE2" },
    guild: { label: "Guild", short: "Purple", symbol: "\uD83D\uDFE3" }
};

/* --------------------------------------------------------------------------
   WONDER BOARDS
   Day/Side-A boards only. Night/Side-B boards are not included in this file.
   The AGE I/II/III mark on a card identifies its card deck, not a board side.
   A card used for a stage is tucked under the board and is not discarded.
---------------------------------------------------------------------------- */
const WONDER_BOARDS = {
    Alexandria: {
        subtitle: "The Lighthouse",
        startResource: "glass",
        scene: "lighthouse",
        stages: [
            { cost: { stone: 2 }, vp: 3, label: "3 victory points", icon: "\uD83C\uDFC63" },
            { cost: { ore: 2 }, effect: "flexRaw", label: "Choose 1 raw material each turn", icon: "\uD83E\uDEB5/\uD83E\uDDF1/\uD83E\uDEA8/\u26CF\uFE0F" },
            { cost: { glass: 2 }, vp: 7, label: "7 victory points", icon: "\uD83C\uDFC67" }
        ]
    },
    Babylon: {
        subtitle: "The Hanging Gardens",
        startResource: "clay",
        scene: "gardens",
        stages: [
            { cost: { clay: 2 }, vp: 3, label: "3 victory points", icon: "\uD83C\uDFC63" },
            { cost: { wood: 3 }, effect: "scienceWild", label: "One science symbol of your choice", icon: "\uD83E\uDDED/\u2699\uFE0F/\uD83D\uDCD0" },
            { cost: { clay: 4 }, vp: 7, label: "7 victory points", icon: "\uD83C\uDFC67" }
        ]
    },
    Ephesos: {
        subtitle: "The Temple",
        startResource: "papyrus",
        scene: "temple",
        stages: [
            { cost: { stone: 2 }, vp: 3, label: "3 victory points", icon: "\uD83C\uDFC63" },
            { cost: { wood: 2 }, coins: 9, label: "Gain 9 coins", icon: "\uD83E\uDE999" },
            { cost: { papyrus: 2 }, vp: 7, label: "7 victory points", icon: "\uD83C\uDFC67" }
        ]
    },
    Giza: {
        subtitle: "The Great Pyramid",
        startResource: "stone",
        scene: "pyramid",
        stages: [
            { cost: { stone: 2 }, vp: 3, label: "3 victory points", icon: "\uD83C\uDFC63" },
            { cost: { wood: 3 }, vp: 5, label: "5 victory points", icon: "\uD83C\uDFC65" },
            { cost: { stone: 4 }, vp: 7, label: "7 victory points", icon: "\uD83C\uDFC67" }
        ]
    },
    Halikarnassos: {
        subtitle: "The Mausoleum",
        startResource: "cloth",
        scene: "mausoleum",
        stages: [
            { cost: { clay: 2 }, vp: 3, label: "3 victory points", icon: "\uD83C\uDFC63" },
            { cost: { ore: 3 }, effect: "buildDiscard", label: "Build 1 discarded card for free", icon: "\u267B\uFE0F" },
            { cost: { cloth: 2 }, vp: 7, label: "7 victory points", icon: "\uD83C\uDFC67" }
        ]
    },
    Olympia: {
        subtitle: "The Statue of Zeus",
        startResource: "wood",
        scene: "zeus",
        stages: [
            { cost: { wood: 2 }, vp: 3, label: "3 victory points", icon: "\uD83C\uDFC63" },
            { cost: { stone: 2 }, effect: "olympiaFree", label: "Build 1 Age card free each Age", icon: "\u27281/Age" },
            { cost: { ore: 2 }, vp: 7, label: "7 victory points", icon: "\uD83C\uDFC67" }
        ]
    },
    Rhodos: {
        subtitle: "The Colossus",
        startResource: "ore",
        scene: "colossus",
        stages: [
            { cost: { wood: 2 }, vp: 3, label: "3 victory points", icon: "\uD83C\uDFC63" },
            { cost: { clay: 3 }, shields: 2, label: "Gain 2 shields", icon: "\uD83D\uDEE1\uFE0F\uD83D\uDEE1\uFE0F" },
            { cost: { ore: 4 }, vp: 7, label: "7 victory points", icon: "\uD83C\uDFC67" }
        ]
    }
};

const WONDER_NAMES = Object.keys(WONDER_BOARDS);

const AI_LEADER_NAMES = {
    Alexandria: ["Sostratus", "Ptolemy"],
    Babylon: ["Nebuchadnezzar", "Semiramis"],
    Ephesos: ["Chersiphron", "Artemisia"],
    Giza: ["Khufu", "Hemiunu"],
    Halikarnassos: ["Mausolus", "Pytheos"],
    Olympia: ["Phidias", "Pelops"],
    Rhodos: ["Chares", "Helios"]
};

/* --------------------------------------------------------------------------
   CARD DATA
   thresholds: one physical copy is included for every listed player-count
   threshold at or below the table size. The fallback deck balancer below
   guarantees exactly seven cards per player even if this file is customized.
---------------------------------------------------------------------------- */
function card(def) {
    return Object.assign({
        age: 1,
        type: "civilian",
        thresholds: [3],
        cost: {},
        chainFrom: [],
        chainTo: [],
        description: ""
    }, def);
}

const AGE_CARDS = {
    1: [
        card({ name: "Lumber Yard", age: 1, type: "raw", thresholds: [3, 4], production: [{ options: ["wood"], count: 1, tradable: true }], description: "Produces 1 Wood each turn." }),
        card({ name: "Clay Pool", age: 1, type: "raw", thresholds: [3, 5], production: [{ options: ["clay"], count: 1, tradable: true }], description: "Produces 1 Clay each turn." }),
        card({ name: "Stone Pit", age: 1, type: "raw", thresholds: [3, 5], production: [{ options: ["stone"], count: 1, tradable: true }], description: "Produces 1 Stone each turn." }),
        card({ name: "Ore Vein", age: 1, type: "raw", thresholds: [3, 4], production: [{ options: ["ore"], count: 1, tradable: true }], description: "Produces 1 Ore each turn." }),
        card({ name: "Clay Pit", age: 1, type: "raw", thresholds: [3], cost: { coins: 1 }, production: [{ options: ["clay", "ore"], count: 1, tradable: true }], description: "Produces either 1 Clay or 1 Ore each turn." }),
        card({ name: "Timber Yard", age: 1, type: "raw", thresholds: [3], cost: { coins: 1 }, production: [{ options: ["stone", "wood"], count: 1, tradable: true }], description: "Produces either 1 Stone or 1 Wood each turn." }),
        card({ name: "Excavation", age: 1, type: "raw", thresholds: [4], cost: { coins: 1 }, production: [{ options: ["stone", "clay"], count: 1, tradable: true }], description: "Produces either 1 Stone or 1 Clay each turn." }),
        card({ name: "Forest Cave", age: 1, type: "raw", thresholds: [5], cost: { coins: 1 }, production: [{ options: ["wood", "ore"], count: 1, tradable: true }], description: "Produces either 1 Wood or 1 Ore each turn." }),
        card({ name: "Tree Farm", age: 1, type: "raw", thresholds: [6], cost: { coins: 1 }, production: [{ options: ["wood", "clay"], count: 1, tradable: true }], description: "Produces either 1 Wood or 1 Clay each turn." }),
        card({ name: "Mine", age: 1, type: "raw", thresholds: [6], cost: { coins: 1 }, production: [{ options: ["ore", "stone"], count: 1, tradable: true }], description: "Produces either 1 Ore or 1 Stone each turn." }),

        card({ name: "Glassworks", age: 1, type: "manufactured", thresholds: [3, 6], production: [{ options: ["glass"], count: 1, tradable: true }], description: "Produces 1 Glass each turn." }),
        card({ name: "Press", age: 1, type: "manufactured", thresholds: [3, 6], production: [{ options: ["papyrus"], count: 1, tradable: true }], description: "Produces 1 Papyrus each turn." }),
        card({ name: "Loom", age: 1, type: "manufactured", thresholds: [3, 6], production: [{ options: ["cloth"], count: 1, tradable: true }], description: "Produces 1 Cloth each turn." }),

        card({ name: "Baths", age: 1, type: "civilian", thresholds: [3, 7], cost: { stone: 1 }, vp: 3, chainTo: ["Aqueduct"], description: "Worth 3 victory points." }),
        card({ name: "Altar", age: 1, type: "civilian", thresholds: [3, 5], vp: 2, chainTo: ["Temple"], description: "Worth 2 victory points." }),
        card({ name: "Theater", age: 1, type: "civilian", thresholds: [3, 6], vp: 2, chainTo: ["Statue"], description: "Worth 2 victory points." }),
        card({ name: "Pawnshop", age: 1, type: "civilian", thresholds: [4, 7], vp: 3, description: "Worth 3 victory points." }),

        card({ name: "East Trading Post", age: 1, type: "commercial", thresholds: [3, 7], discount: { side: "right", group: "raw" }, chainTo: ["Forum"], description: "Starting next turn, raw materials bought from your right neighbor cost 1 coin each." }),
        card({ name: "West Trading Post", age: 1, type: "commercial", thresholds: [3, 7], discount: { side: "left", group: "raw" }, chainTo: ["Forum"], description: "Starting next turn, raw materials bought from your left neighbor cost 1 coin each." }),
        card({ name: "Marketplace", age: 1, type: "commercial", thresholds: [3, 6], discount: { side: "both", group: "goods" }, chainTo: ["Caravansery"], description: "Starting next turn, manufactured goods bought from either neighbor cost 1 coin each." }),
        card({ name: "Tavern", age: 1, type: "commercial", thresholds: [4, 5, 7], coins: 5, description: "Gain 5 coins when built." }),

        card({ name: "Stockade", age: 1, type: "military", thresholds: [3, 7], cost: { wood: 1 }, shields: 1, description: "Provides 1 shield." }),
        card({ name: "Barracks", age: 1, type: "military", thresholds: [3, 5], cost: { ore: 1 }, shields: 1, description: "Provides 1 shield." }),
        card({ name: "Guard Tower", age: 1, type: "military", thresholds: [3, 4], cost: { clay: 1 }, shields: 1, description: "Provides 1 shield." }),

        card({ name: "Apothecary", age: 1, type: "science", thresholds: [3, 5], cost: { cloth: 1 }, science: "compass", chainTo: ["Dispensary", "Stables"], description: "Adds 1 Compass science symbol." }),
        card({ name: "Workshop", age: 1, type: "science", thresholds: [3, 7], cost: { glass: 1 }, science: "gear", chainTo: ["Laboratory", "Archery Range"], description: "Adds 1 Gear science symbol." }),
        card({ name: "Scriptorium", age: 1, type: "science", thresholds: [3, 4], cost: { papyrus: 1 }, science: "tablet", chainTo: ["Library", "Courthouse"], description: "Adds 1 Tablet science symbol." })
    ],

    2: [
        card({ name: "Sawmill", age: 2, type: "raw", thresholds: [3, 4], cost: { coins: 1 }, production: [{ options: ["wood"], count: 2, tradable: true }], description: "Produces 2 Wood each turn." }),
        card({ name: "Brickyard", age: 2, type: "raw", thresholds: [3, 4], cost: { coins: 1 }, production: [{ options: ["clay"], count: 2, tradable: true }], description: "Produces 2 Clay each turn." }),
        card({ name: "Quarry", age: 2, type: "raw", thresholds: [3, 4], cost: { coins: 1 }, production: [{ options: ["stone"], count: 2, tradable: true }], description: "Produces 2 Stone each turn." }),
        card({ name: "Foundry", age: 2, type: "raw", thresholds: [3, 4], cost: { coins: 1 }, production: [{ options: ["ore"], count: 2, tradable: true }], description: "Produces 2 Ore each turn." }),

        card({ name: "Glassworks", age: 2, type: "manufactured", thresholds: [3, 5], production: [{ options: ["glass"], count: 1, tradable: true }], description: "Produces 1 Glass each turn." }),
        card({ name: "Press", age: 2, type: "manufactured", thresholds: [3, 5], production: [{ options: ["papyrus"], count: 1, tradable: true }], description: "Produces 1 Papyrus each turn." }),
        card({ name: "Loom", age: 2, type: "manufactured", thresholds: [3, 5], production: [{ options: ["cloth"], count: 1, tradable: true }], description: "Produces 1 Cloth each turn." }),

        card({ name: "Aqueduct", age: 2, type: "civilian", thresholds: [3, 7], cost: { stone: 3 }, vp: 5, chainFrom: ["Baths"], description: "Worth 5 victory points." }),
        card({ name: "Temple", age: 2, type: "civilian", thresholds: [3, 6], cost: { wood: 1, clay: 1, glass: 1 }, vp: 3, chainFrom: ["Altar"], chainTo: ["Pantheon"], description: "Worth 3 victory points." }),
        card({ name: "Statue", age: 2, type: "civilian", thresholds: [3, 7], cost: { wood: 1, ore: 2 }, vp: 4, chainFrom: ["Theater"], chainTo: ["Gardens"], description: "Worth 4 victory points." }),
        card({ name: "Courthouse", age: 2, type: "civilian", thresholds: [3, 5], cost: { clay: 2, cloth: 1 }, vp: 4, chainFrom: ["Scriptorium"], chainTo: ["Senate"], description: "Worth 4 victory points." }),

        card({ name: "Walls", age: 2, type: "military", thresholds: [3, 7], cost: { stone: 3 }, shields: 2, chainTo: ["Fortifications"], description: "Provides 2 shields." }),
        card({ name: "Training Ground", age: 2, type: "military", thresholds: [4, 6, 7], cost: { wood: 1, ore: 2 }, shields: 2, chainTo: ["Circus"], description: "Provides 2 shields." }),
        card({ name: "Stables", age: 2, type: "military", thresholds: [3, 5], cost: { wood: 1, clay: 1, ore: 1 }, shields: 2, chainFrom: ["Apothecary"], description: "Provides 2 shields." }),
        card({ name: "Archery Range", age: 2, type: "military", thresholds: [3, 6], cost: { wood: 2, ore: 1 }, shields: 2, chainFrom: ["Workshop"], description: "Provides 2 shields." }),

        card({ name: "Dispensary", age: 2, type: "science", thresholds: [3, 4], cost: { ore: 2, glass: 1 }, science: "compass", chainFrom: ["Apothecary"], chainTo: ["Lodge", "Arena"], description: "Adds 1 Compass science symbol." }),
        card({ name: "Laboratory", age: 2, type: "science", thresholds: [3, 5], cost: { clay: 2, papyrus: 1 }, science: "gear", chainFrom: ["Workshop"], chainTo: ["Observatory", "Siege Workshop"], description: "Adds 1 Gear science symbol." }),
        card({ name: "Library", age: 2, type: "science", thresholds: [3, 6], cost: { stone: 2, cloth: 1 }, science: "tablet", chainFrom: ["Scriptorium"], chainTo: ["University", "Senate"], description: "Adds 1 Tablet science symbol." }),
        card({ name: "School", age: 2, type: "science", thresholds: [3, 6, 7], cost: { wood: 1, papyrus: 1 }, science: "tablet", chainTo: ["Academy", "Study"], description: "Adds 1 Tablet science symbol." }),

        card({ name: "Forum", age: 2, type: "commercial", thresholds: [3, 6, 7], cost: { clay: 2 }, chainFrom: ["East Trading Post", "West Trading Post"], production: [{ options: GOODS_RES, count: 1, tradable: false }], description: "Produces one manufactured good of your choice each turn. Neighbors cannot buy it." }),
        card({ name: "Caravansery", age: 2, type: "commercial", thresholds: [3, 5], cost: { wood: 2 }, chainFrom: ["Marketplace"], production: [{ options: RAW_RES, count: 1, tradable: false }], description: "Produces one raw material of your choice each turn. Neighbors cannot buy it." }),
        card({ name: "Vineyard", age: 2, type: "commercial", thresholds: [3, 6], coinsPer: { type: "raw", scope: "selfNeighbors", multiplier: 1 }, description: "Gain 1 coin for each brown card in your city and both neighboring cities when built." }),
        card({ name: "Bazar", age: 2, type: "commercial", thresholds: [4, 7], coinsPer: { type: "manufactured", scope: "selfNeighbors", multiplier: 2 }, description: "Gain 2 coins for each gray card in your city and both neighboring cities when built." })
    ],

    3: [
        card({ name: "Pantheon", age: 3, type: "civilian", thresholds: [3, 7], cost: { clay: 2, ore: 1, glass: 1, papyrus: 1, cloth: 1 }, vp: 7, chainFrom: ["Temple"], description: "Worth 7 victory points." }),
        card({ name: "Gardens", age: 3, type: "civilian", thresholds: [3, 5], cost: { clay: 2, wood: 1 }, vp: 5, chainFrom: ["Statue"], description: "Worth 5 victory points." }),
        card({ name: "Town Hall", age: 3, type: "civilian", thresholds: [3, 4, 6], cost: { stone: 2, ore: 1, glass: 1 }, vp: 6, description: "Worth 6 victory points." }),
        card({ name: "Palace", age: 3, type: "civilian", thresholds: [3, 7], cost: { wood: 1, clay: 1, stone: 1, ore: 1, glass: 1, papyrus: 1, cloth: 1 }, vp: 8, description: "Worth 8 victory points." }),
        card({ name: "Senate", age: 3, type: "civilian", thresholds: [3, 6], cost: { wood: 2, stone: 1, ore: 1 }, vp: 6, chainFrom: ["Courthouse", "Library"], description: "Worth 6 victory points." }),

        card({ name: "Fortifications", age: 3, type: "military", thresholds: [3, 5], cost: { stone: 1, ore: 3 }, shields: 3, chainFrom: ["Walls"], description: "Provides 3 shields." }),
        card({ name: "Arsenal", age: 3, type: "military", thresholds: [3, 4, 7], cost: { wood: 2, ore: 1, cloth: 1 }, shields: 3, description: "Provides 3 shields." }),
        card({ name: "Siege Workshop", age: 3, type: "military", thresholds: [3, 5], cost: { wood: 1, clay: 3 }, shields: 3, chainFrom: ["Laboratory"], description: "Provides 3 shields." }),
        card({ name: "Circus", age: 3, type: "military", thresholds: [4, 7], cost: { stone: 3, ore: 1 }, shields: 3, chainFrom: ["Training Ground"], description: "Provides 3 shields." }),

        card({ name: "Lodge", age: 3, type: "science", thresholds: [3, 5], cost: { clay: 2, papyrus: 1, cloth: 1 }, science: "compass", chainFrom: ["Dispensary"], description: "Adds 1 Compass science symbol." }),
        card({ name: "Observatory", age: 3, type: "science", thresholds: [3, 6], cost: { ore: 2, glass: 1, cloth: 1 }, science: "gear", chainFrom: ["Laboratory"], description: "Adds 1 Gear science symbol." }),
        card({ name: "University", age: 3, type: "science", thresholds: [3, 4, 7], cost: { wood: 2, papyrus: 1, glass: 1 }, science: "tablet", chainFrom: ["Library"], description: "Adds 1 Tablet science symbol." }),
        card({ name: "Academy", age: 3, type: "science", thresholds: [3, 6], cost: { stone: 3, glass: 1 }, science: "compass", chainFrom: ["School"], description: "Adds 1 Compass science symbol." }),
        card({ name: "Study", age: 3, type: "science", thresholds: [3, 5], cost: { wood: 1, papyrus: 1, cloth: 1 }, science: "gear", chainFrom: ["School"], description: "Adds 1 Gear science symbol." }),

        card({ name: "Arena", age: 3, type: "commercial", thresholds: [3, 6], cost: { stone: 2, ore: 1 }, chainFrom: ["Dispensary"], commerceScore: { basis: "wonderStage", coinMultiplier: 3, vpMultiplier: 1 }, description: "Gain 3 coins per completed Wonder stage now; worth 1 point per completed stage at game end." }),
        card({ name: "Haven", age: 3, type: "commercial", thresholds: [3, 5], cost: { wood: 1, ore: 1, cloth: 1 }, commerceScore: { basis: "raw", coinMultiplier: 1, vpMultiplier: 1 }, description: "Gain 1 coin per brown card now; worth 1 point per brown card at game end." }),
        card({ name: "Lighthouse", age: 3, type: "commercial", thresholds: [3, 4, 7], cost: { stone: 1, glass: 1 }, chainFrom: ["Caravansery"], commerceScore: { basis: "commercial", coinMultiplier: 1, vpMultiplier: 1 }, description: "Gain 1 coin per yellow card now; worth 1 point per yellow card at game end." }),
        card({ name: "Chamber of Commerce", age: 3, type: "commercial", thresholds: [4, 6], cost: { clay: 2, papyrus: 1 }, chainFrom: ["Forum"], commerceScore: { basis: "manufactured", coinMultiplier: 2, vpMultiplier: 2 }, description: "Gain 2 coins per gray card now; worth 2 points per gray card at game end." })
    ]
};

const GUILD_CARDS = [
    card({ name: "Workers Guild", age: 3, type: "guild", cost: { ore: 2, stone: 1, clay: 1, cloth: 1 }, guild: { kind: "neighborsType", type: "raw", multiplier: 1 }, description: "Worth 1 point per brown card in both neighboring cities." }),
    card({ name: "Craftsmens Guild", age: 3, type: "guild", cost: { ore: 2, stone: 2 }, guild: { kind: "neighborsType", type: "manufactured", multiplier: 2 }, description: "Worth 2 points per gray card in both neighboring cities." }),
    card({ name: "Traders Guild", age: 3, type: "guild", cost: { glass: 1, papyrus: 1, cloth: 1 }, guild: { kind: "neighborsType", type: "commercial", multiplier: 1 }, description: "Worth 1 point per yellow card in both neighboring cities." }),
    card({ name: "Philosophers Guild", age: 3, type: "guild", cost: { clay: 3, papyrus: 1, cloth: 1 }, guild: { kind: "neighborsType", type: "science", multiplier: 1 }, description: "Worth 1 point per green card in both neighboring cities." }),
    card({ name: "Spies Guild", age: 3, type: "guild", cost: { clay: 3, glass: 1 }, guild: { kind: "neighborsType", type: "military", multiplier: 1 }, description: "Worth 1 point per red card in both neighboring cities." }),
    card({ name: "Magistrates Guild", age: 3, type: "guild", cost: { wood: 3, stone: 1, cloth: 1 }, guild: { kind: "neighborsType", type: "civilian", multiplier: 1 }, description: "Worth 1 point per blue card in both neighboring cities." }),
    card({ name: "Builders Guild", age: 3, type: "guild", cost: { stone: 2, clay: 2, glass: 1 }, guild: { kind: "wonderStagesAll", multiplier: 1 }, description: "Worth 1 point per completed Wonder stage in your city and both neighboring cities." }),
    card({ name: "Shipowners Guild", age: 3, type: "guild", cost: { wood: 3, glass: 1, papyrus: 1 }, guild: { kind: "selfTypes", types: ["raw", "manufactured", "guild"], multiplier: 1 }, description: "Worth 1 point per brown, gray and purple card in your own city, including this Guild." }),
    card({ name: "Scientists Guild", age: 3, type: "guild", cost: { wood: 2, ore: 2, papyrus: 1 }, guild: { kind: "scienceWild" }, description: "Adds one science symbol of your choice when science is scored." }),
    card({ name: "Strategists Guild", age: 3, type: "guild", cost: { ore: 2, stone: 1, cloth: 1 }, guild: { kind: "neighborDefeats", multiplier: 1 }, description: "Worth 1 point per military defeat token held by both neighboring cities." })
];

/* --------------------------------------------------------------------------
   BASIC HELPERS
---------------------------------------------------------------------------- */
function getMyId() {
    if (typeof window.myId === "function") return String(window.myId());
    if (typeof window.myId === "string") return window.myId;
    return localStorage.getItem("rider_id") || "local-player";
}

function myName() {
    const input = document.getElementById("username");
    return (input && input.value.trim()) || localStorage.getItem("rider_saved_name") || "Player";
}

function getChannel() {
    if (window.channel) return window.channel;
    if (typeof channel !== "undefined") return channel;
    return null;
}

function isHost() {
    return !!(window.chaserGame && window.chaserGame.hostId === getMyId());
}

function currentRoomGameId() {
    return window.chaserGame && window.chaserGame.activeGameId ? window.chaserGame.activeGameId : null;
}

function canvas() {
    return document.getElementById("gameCanvasContainer");
}

function escapeHtml(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function enc(value) {
    return encodeURIComponent(String(value == null ? "" : value));
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }
    return a;
}

function emptyResources() {
    return { wood: 0, clay: 0, stone: 0, ore: 0, glass: 0, papyrus: 0, cloth: 0 };
}

function resourceVectorKey(vec) {
    return RES_KEYS.map(function (k) { return vec[k] || 0; }).join(",");
}

function sumObject(obj) {
    return Object.keys(obj || {}).reduce(function (sum, k) { return sum + (obj[k] || 0); }, 0);
}

function romanAge(age) {
    return age === 1 ? "I" : age === 2 ? "II" : "III";
}

function roundKey(st) {
    return [st.gameToken, st.age, st.round].join(":");
}

function makeUid(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

function openStage() {
    const stage = document.getElementById("activeGameStage");
    if (stage) stage.classList.add("open");
}

function setHeader() {
    const roomDisplay = document.getElementById("roomDisplayCode");
    const headerBtns = document.getElementById("headerActionButtonsContainer");
    const chatHeader = document.getElementById("chatHeader");

    if (roomDisplay) roomDisplay.innerText = "\uD83C\uDFDB\uFE0F Wonders";
    if (headerBtns) headerBtns.style.display = "none";
    if (chatHeader) chatHeader.classList.add("game-active-mode");
}

/* --------------------------------------------------------------------------
   DECK BUILDING
---------------------------------------------------------------------------- */
function cloneCardInstance(def, ageNum, index) {
    const copy = clone(def);
    copy.uid = "w" + ageNum + "-" + index + "-" + Math.random().toString(36).slice(2, 8);
    return copy;
}

function expandByThreshold(cards, playerCount) {
    const result = [];
    cards.forEach(function (def) {
        (def.thresholds || [3]).forEach(function (threshold) {
            if (playerCount >= threshold) result.push(def);
        });
    });
    return result;
}

function balanceDeck(defs, needed, fillerDefs) {
    let list = defs.slice();
    const fillers = (fillerDefs && fillerDefs.length ? fillerDefs : defs).slice();

    while (list.length < needed) {
        list.push(fillers[list.length % fillers.length]);
    }

    if (list.length > needed) list = shuffle(list).slice(0, needed);
    return list;
}

function buildAgeDeck(ageNum, playerCount) {
    const needed = CARDS_PER_HAND * playerCount;
    let defs;

    if (ageNum === 3) {
        const guildCount = playerCount + 2;
        const nonGuildNeeded = needed - guildCount;
        const nonGuildDefs = balanceDeck(
            expandByThreshold(AGE_CARDS[3], playerCount),
            nonGuildNeeded,
            AGE_CARDS[3]
        );
        defs = nonGuildDefs.concat(shuffle(GUILD_CARDS).slice(0, guildCount));
    } else {
        defs = balanceDeck(
            expandByThreshold(AGE_CARDS[ageNum], playerCount),
            needed,
            AGE_CARDS[ageNum]
        );
    }

    return shuffle(defs).map(function (def, idx) {
        return cloneCardInstance(def, ageNum, idx);
    });
}

/* --------------------------------------------------------------------------
   PLAYERS AND STATE
---------------------------------------------------------------------------- */
function buildSeatedPlayers(targetCount) {
    const lobbyPlayers = window.chaserGame && Array.isArray(window.chaserGame.players) && window.chaserGame.players.length
        ? window.chaserGame.players
        : [{ id: getMyId(), name: myName(), seat: 0 }];

    const humans = lobbyPlayers.slice(0, MAX_PLAYERS);
    const finalCount = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, targetCount || humans.length || MIN_PLAYERS));
    const wonders = shuffle(WONDER_NAMES);
    const seats = [];

    humans.forEach(function (p, idx) {
        const wonder = wonders[idx % wonders.length];
        seats.push(makeSeat(String(p.id), p.name || ("Player " + (idx + 1)), false, wonder));
    });

    let aiIndex = 0;
    while (seats.length < finalCount) {
        const wonder = wonders[seats.length % wonders.length];
        const pool = AI_LEADER_NAMES[wonder] || ["Leader"];
        const aiName = pool[aiIndex % pool.length];
        seats.push(makeSeat("wonders-ai-" + seats.length, aiName, true, wonder));
        aiIndex++;
    }

    return seats;
}

function makeSeat(id, name, isComputer, wonder) {
    return {
        id: id,
        name: name,
        isComputer: !!isComputer,
        wonder: wonder,
        wonderStage: 0,
        wonderCards: [],
        tableau: [],
        hand: [],
        coins: 3,
        militaryVP: 0,
        defeatTokens: 0,
        victoryTokens: [],
        usedFreeBuildThisAge: false,
        pendingChoice: null,
        finalScore: null,
        scoreBreakdown: null
    };
}

function createState(targetCount) {
    const players = buildSeatedPlayers(targetCount);
    return {
        version: 4,
        gameToken: makeUid("wonders"),
        phase: "playing",
        age: 1,
        round: 1,
        direction: 1,
        players: players,
        discardPile: [],
        specialQueue: [],
        specialPlayerId: null,
        message: "Dealing Age I...",
        lastResult: "",
        turnStartCoins: {},
        history: []
    };
}

function findPlayer(st, id) {
    if (!st || !Array.isArray(st.players)) return null;
    return st.players.find(function (p) { return p.id === id; }) || null;
}

function myPlayer() {
    return findPlayer(window.sevenWondersState, getMyId());
}

function playerIndex(st, playerId) {
    return st.players.findIndex(function (p) { return p.id === playerId; });
}

function neighborsOf(st, playerId) {
    const idx = playerIndex(st, playerId);
    if (idx < 0) return { left: null, right: null, leftIndex: -1, rightIndex: -1 };
    const n = st.players.length;
    const leftIndex = (idx - 1 + n) % n;
    const rightIndex = (idx + 1) % n;
    return {
        left: st.players[leftIndex],
        right: st.players[rightIndex],
        leftIndex: leftIndex,
        rightIndex: rightIndex
    };
}

function snapshotTurnCoins(st) {
    st.turnStartCoins = {};
    st.players.forEach(function (p) {
        st.turnStartCoins[p.id] = p.coins;
    });
}

function dealAge(st, ageNum) {
    const deck = buildAgeDeck(ageNum, st.players.length);

    st.players.forEach(function (p, idx) {
        p.hand = deck.slice(idx * CARDS_PER_HAND, (idx + 1) * CARDS_PER_HAND);
        p.pendingChoice = null;
        p.usedFreeBuildThisAge = false;
    });

    st.age = ageNum;
    st.round = 1;
    st.direction = ageNum === 2 ? -1 : 1;
    st.phase = "playing";
    st.specialQueue = [];
    st.specialPlayerId = null;
    snapshotTurnCoins(st);
}

/* --------------------------------------------------------------------------
   PUBLIC CITY INFORMATION
---------------------------------------------------------------------------- */
function hasBuiltName(player, cardName) {
    return player.tableau.some(function (c) { return c.name === cardName; });
}

function hasChainInto(player, cardDef) {
    return (cardDef.chainFrom || []).some(function (requiredName) {
        return hasBuiltName(player, requiredName);
    });
}

function hasWonderEffect(player, effectName) {
    const board = WONDER_BOARDS[player.wonder];
    for (let i = 0; i < player.wonderStage; i++) {
        if (board.stages[i] && board.stages[i].effect === effectName) return true;
    }
    return false;
}

function canUseOlympiaFreeBuild(player) {
    return hasWonderEffect(player, "olympiaFree") && !player.usedFreeBuildThisAge;
}

function shieldCount(player) {
    let total = 0;
    player.tableau.forEach(function (c) { total += c.shields || 0; });
    const board = WONDER_BOARDS[player.wonder];
    for (let i = 0; i < player.wonderStage; i++) total += (board.stages[i].shields || 0);
    return total;
}

function scienceCounts(player) {
    const result = { compass: 0, gear: 0, tablet: 0, wild: 0 };
    player.tableau.forEach(function (c) {
        if (c.science) result[c.science] += 1;
        if (c.guild && c.guild.kind === "scienceWild") result.wild += 1;
    });
    if (hasWonderEffect(player, "scienceWild")) result.wild += 1;
    return result;
}

function cardCountByType(player, type) {
    return player.tableau.filter(function (c) { return c.type === type; }).length;
}

function wonderVP(player) {
    const board = WONDER_BOARDS[player.wonder];
    let total = 0;
    for (let i = 0; i < player.wonderStage; i++) total += board.stages[i].vp || 0;
    return total;
}

/* --------------------------------------------------------------------------
   RESOURCE PRODUCTION AND NEIGHBOR TRADING
---------------------------------------------------------------------------- */
function getProductionSources(player, tradableOnly) {
    const board = WONDER_BOARDS[player.wonder];
    const sources = [{ options: [board.startResource], count: 1, tradable: true, origin: "Wonder board" }];

    player.tableau.forEach(function (c) {
        (c.production || []).forEach(function (src) {
            if (!tradableOnly || src.tradable !== false) {
                sources.push({
                    options: (src.options || []).slice(),
                    count: src.count || 1,
                    tradable: src.tradable !== false,
                    origin: c.name
                });
            }
        });
    });

    if (!tradableOnly && hasWonderEffect(player, "flexRaw")) {
        sources.push({ options: RAW_RES.slice(), count: 1, tradable: false, origin: "Alexandria" });
    }

    return sources;
}

function productionVectors(player, tradableOnly, maxNeed) {
    const sources = getProductionSources(player, tradableOnly);
    let vectors = [emptyResources()];

    sources.forEach(function (src) {
        const next = [];
        const seen = new Set();
        const options = src.options && src.options.length ? src.options : [];

        vectors.forEach(function (vec) {
            options.forEach(function (resource) {
                const copyVec = Object.assign({}, vec);
                copyVec[resource] = (copyVec[resource] || 0) + (src.count || 1);
                if (maxNeed && maxNeed[resource] != null) {
                    copyVec[resource] = Math.min(copyVec[resource], maxNeed[resource]);
                }
                const key = resourceVectorKey(copyVec);
                if (!seen.has(key)) {
                    seen.add(key);
                    next.push(copyVec);
                }
            });
        });

        vectors = next.length ? next : vectors;
    });

    return vectors;
}

function tradeUnitCost(buyer, side, resource) {
    const raw = RAW_RES.indexOf(resource) >= 0;
    const goods = GOODS_RES.indexOf(resource) >= 0;
    let discounted = false;

    buyer.tableau.forEach(function (c) {
        if (!c.discount) return;
        const sideMatch = c.discount.side === "both" || c.discount.side === side;
        const groupMatch = (c.discount.group === "raw" && raw) || (c.discount.group === "goods" && goods);
        if (sideMatch && groupMatch) discounted = true;
    });

    return discounted ? 1 : 2;
}

function normalizeResourceCost(cost) {
    const result = emptyResources();
    RES_KEYS.forEach(function (k) { result[k] = (cost && cost[k]) || 0; });
    return result;
}

function planLabel(plan) {
    if (!plan) return "Not affordable";
    const parts = [];
    if (plan.bankCoins) parts.push("Bank " + plan.bankCoins + "\uD83E\uDE99");
    const leftRes = resourceList(plan.leftResources, false);
    const rightRes = resourceList(plan.rightResources, false);
    if (leftRes) parts.push("\u2190 " + leftRes + " (" + plan.leftCoins + "\uD83E\uDE99)");
    if (rightRes) parts.push("\u2192 " + rightRes + " (" + plan.rightCoins + "\uD83E\uDE99)");
    return parts.length ? parts.join(" \u00B7 ") : "Use your own resources";
}

function findPaymentPlans(st, player, cost, freeMode) {
    if (freeMode === "chain" || freeMode === "olympia" || freeMode === "discardFree") {
        return [{
            bankCoins: 0,
            leftCoins: 0,
            rightCoins: 0,
            totalCoins: 0,
            leftResources: emptyResources(),
            rightResources: emptyResources(),
            freeMode: freeMode
        }];
    }

    const resourceCost = normalizeResourceCost(cost || {});
    const bankCoins = (cost && cost.coins) || 0;
    const availableCoins = st.turnStartCoins && st.turnStartCoins[player.id] != null
        ? st.turnStartCoins[player.id]
        : player.coins;

    if (bankCoins > availableCoins) return [];

    const neighbors = neighborsOf(st, player.id);
    if (!neighbors.left || !neighbors.right) return [];

    const ownVectors = productionVectors(player, false, resourceCost);
    const leftVectors = productionVectors(neighbors.left, true, resourceCost);
    const rightVectors = productionVectors(neighbors.right, true, resourceCost);
    const plans = [];
    const seenPlans = new Set();

    ownVectors.forEach(function (own) {
        const missing = emptyResources();
        RES_KEYS.forEach(function (k) {
            missing[k] = Math.max(0, resourceCost[k] - (own[k] || 0));
        });

        leftVectors.forEach(function (leftCap) {
            rightVectors.forEach(function (rightCap) {
                const choices = [{
                    left: emptyResources(),
                    right: emptyResources(),
                    leftCoins: 0,
                    rightCoins: 0
                }];

                let viable = true;
                RES_KEYS.forEach(function (resource) {
                    if (!viable) return;
                    const need = missing[resource] || 0;
                    if (!need) return;

                    const newChoices = [];
                    choices.forEach(function (baseChoice) {
                        const maxLeft = Math.min(need, leftCap[resource] || 0);
                        for (let leftQty = 0; leftQty <= maxLeft; leftQty++) {
                            const rightQty = need - leftQty;
                            if (rightQty > (rightCap[resource] || 0)) continue;

                            const nextChoice = {
                                left: Object.assign({}, baseChoice.left),
                                right: Object.assign({}, baseChoice.right),
                                leftCoins: baseChoice.leftCoins,
                                rightCoins: baseChoice.rightCoins
                            };
                            nextChoice.left[resource] = leftQty;
                            nextChoice.right[resource] = rightQty;
                            nextChoice.leftCoins += leftQty * tradeUnitCost(player, "left", resource);
                            nextChoice.rightCoins += rightQty * tradeUnitCost(player, "right", resource);
                            newChoices.push(nextChoice);
                        }
                    });

                    choices.length = 0;
                    Array.prototype.push.apply(choices, newChoices);
                    if (!choices.length) viable = false;
                });

                if (!viable) return;

                choices.forEach(function (choice) {
                    const totalCoins = bankCoins + choice.leftCoins + choice.rightCoins;
                    if (totalCoins > availableCoins) return;

                    const key = resourceVectorKey(choice.left) + "|" + resourceVectorKey(choice.right) + "|" + totalCoins;
                    if (seenPlans.has(key)) return;
                    seenPlans.add(key);

                    plans.push({
                        bankCoins: bankCoins,
                        leftCoins: choice.leftCoins,
                        rightCoins: choice.rightCoins,
                        totalCoins: totalCoins,
                        leftResources: choice.left,
                        rightResources: choice.right,
                        freeMode: null
                    });
                });
            });
        });
    });

    plans.sort(function (a, b) {
        if (a.totalCoins !== b.totalCoins) return a.totalCoins - b.totalCoins;
        const aSpread = Math.abs(a.leftCoins - a.rightCoins);
        const bSpread = Math.abs(b.leftCoins - b.rightCoins);
        return aSpread - bSpread;
    });

    return plans.slice(0, 10);
}

function cheapestPlan(st, player, cost, freeMode) {
    const plans = findPaymentPlans(st, player, cost, freeMode);
    return plans.length ? plans[0] : null;
}

function canBuildCard(st, player, cardDef) {
    if (!cardDef || hasBuiltName(player, cardDef.name)) return { legal: false, reason: "You already built this structure.", plans: [] };
    if (hasChainInto(player, cardDef)) {
        return { legal: true, reason: "Free chain", plans: findPaymentPlans(st, player, cardDef.cost, "chain"), chainFree: true };
    }
    const plans = findPaymentPlans(st, player, cardDef.cost, null);
    return { legal: plans.length > 0, reason: plans.length ? "" : "Not enough resources or coins.", plans: plans, chainFree: false };
}

function canBuildWonder(st, player) {
    const board = WONDER_BOARDS[player.wonder];
    const stage = board.stages[player.wonderStage];
    if (!stage) return { legal: false, reason: "Your Wonder is complete.", plans: [] };
    const plans = findPaymentPlans(st, player, stage.cost, null);
    return { legal: plans.length > 0, reason: plans.length ? "" : "Not enough resources or coins.", plans: plans, stage: stage };
}

/* --------------------------------------------------------------------------
   PAYMENT AND EFFECT RESOLUTION
---------------------------------------------------------------------------- */
function applyPayment(st, player, plan) {
    if (!plan) return;
    const neighbors = neighborsOf(st, player.id);
    player.coins -= plan.totalCoins || 0;
    if (neighbors.left) neighbors.left.coins += plan.leftCoins || 0;
    if (neighbors.right) neighbors.right.coins += plan.rightCoins || 0;
}

function countScopeType(st, player, type, scope) {
    if (scope === "self") return cardCountByType(player, type);
    const n = neighborsOf(st, player.id);
    if (scope === "neighbors") return cardCountByType(n.left, type) + cardCountByType(n.right, type);
    return cardCountByType(player, type) + cardCountByType(n.left, type) + cardCountByType(n.right, type);
}

function commerceBasisCount(player, basis) {
    if (basis === "wonderStage") return player.wonderStage;
    return cardCountByType(player, basis);
}

function applyImmediateCardIncome(st, player, builtCard) {
    let gain = builtCard.coins || 0;
    if (builtCard.coinsPer) {
        gain += countScopeType(st, player, builtCard.coinsPer.type, builtCard.coinsPer.scope) * builtCard.coinsPer.multiplier;
    }
    if (builtCard.commerceScore) {
        gain += commerceBasisCount(player, builtCard.commerceScore.basis) * builtCard.commerceScore.coinMultiplier;
    }
    player.coins += gain;
    return gain;
}

function applyWonderStageImmediate(player, stage) {
    if (stage.coins) player.coins += stage.coins;
}

function removeCardFromHand(player, cardUid) {
    const idx = player.hand.findIndex(function (c) { return c.uid === cardUid; });
    if (idx < 0) return null;
    return player.hand.splice(idx, 1)[0];
}

function validatePaymentPlan(st, player, cost, submittedPlan, freeMode) {
    const plans = findPaymentPlans(st, player, cost, freeMode);
    if (!plans.length) return null;
    if (!submittedPlan) return plans[0];

    const wantedKey = resourceVectorKey(submittedPlan.leftResources || emptyResources()) + "|" +
        resourceVectorKey(submittedPlan.rightResources || emptyResources()) + "|" +
        (submittedPlan.totalCoins || 0);

    return plans.find(function (p) {
        const key = resourceVectorKey(p.leftResources) + "|" + resourceVectorKey(p.rightResources) + "|" + p.totalCoins;
        return key === wantedKey;
    }) || plans[0];
}

function validateChoice(st, player, choice) {
    if (!choice || choice.roundKey !== roundKey(st)) return null;
    const handCard = player.hand.find(function (c) { return c.uid === choice.cardUid; });
    if (!handCard) return null;

    if (choice.action === "discard") {
        return { action: "discard", cardUid: handCard.uid, roundKey: choice.roundKey };
    }

    if (choice.action === "wonder") {
        const board = WONDER_BOARDS[player.wonder];
        const stage = board.stages[player.wonderStage];
        if (!stage) return null;
        const plan = validatePaymentPlan(st, player, stage.cost, choice.payment, null);
        if (!plan) return null;
        return { action: "wonder", cardUid: handCard.uid, payment: plan, roundKey: choice.roundKey };
    }

    if (choice.action === "build") {
        if (hasBuiltName(player, handCard.name)) return null;
        let freeMode = null;
        if (choice.freeMode === "olympia" && canUseOlympiaFreeBuild(player)) freeMode = "olympia";
        else if (hasChainInto(player, handCard)) freeMode = "chain";

        const plan = validatePaymentPlan(st, player, handCard.cost, choice.payment, freeMode);
        if (!plan) return null;
        return { action: "build", cardUid: handCard.uid, payment: plan, freeMode: freeMode, roundKey: choice.roundKey };
    }

    return null;
}

function resolveRound() {
    const st = window.sevenWondersState;
    if (!st || !isHost() || st.phase !== "playing") return;

    st.players.forEach(function (p) {
        if (p.isComputer && !p.pendingChoice) p.pendingChoice = computerChoose(p, st);
    });

    if (!allChoicesIn(st)) return;

    const validated = [];
    st.players.forEach(function (p) {
        let choice = validateChoice(st, p, p.pendingChoice);
        if (!choice) {
            const fallbackCard = p.hand[0];
            choice = fallbackCard ? { action: "discard", cardUid: fallbackCard.uid, roundKey: roundKey(st) } : null;
        }
        validated.push({ player: p, choice: choice });
    });

    const builtThisTurn = [];
    const wonderBuiltThisTurn = [];
    const messages = [];

    /* Pay first. Income received this turn cannot be used to make the choice,
       because every choice was validated against turnStartCoins. */
    validated.forEach(function (entry) {
        if (!entry.choice) return;
        if (entry.choice.action === "build" || entry.choice.action === "wonder") {
            applyPayment(st, entry.player, entry.choice.payment);
        }
    });

    /* Place cards and Wonder stages. */
    validated.forEach(function (entry) {
        const p = entry.player;
        const choice = entry.choice;
        if (!choice) return;

        if (choice.action === "build") {
            const built = removeCardFromHand(p, choice.cardUid);
            if (!built) return;
            p.tableau.push(built);
            if (choice.freeMode === "olympia") p.usedFreeBuildThisAge = true;
            builtThisTurn.push({ player: p, card: built });
            messages.push(p.name + " built " + built.name + (choice.freeMode ? " for free" : ""));
            return;
        }

        if (choice.action === "wonder") {
            const used = removeCardFromHand(p, choice.cardUid);
            if (!used) return;
            const board = WONDER_BOARDS[p.wonder];
            const stageIndex = p.wonderStage;
            const stage = board.stages[stageIndex];
            p.wonderCards.push({ stageIndex: stageIndex, card: used });
            p.wonderStage += 1;
            wonderBuiltThisTurn.push({ player: p, stage: stage, stageIndex: stageIndex });
            applyWonderStageImmediate(p, stage);
            if (stage.effect === "buildDiscard") st.specialQueue.push(p.id);
            messages.push(p.name + " completed Wonder stage " + (stageIndex + 1));
            return;
        }

        const sold = removeCardFromHand(p, choice.cardUid);
        if (sold) st.discardPile.push(sold);
        p.coins += 3;
        messages.push(p.name + " sold a card");
    });

    /* Immediate income cards count every structure placed this turn. */
    builtThisTurn.forEach(function (entry) {
        applyImmediateCardIncome(st, entry.player, entry.card);
    });

    st.players.forEach(function (p) { p.pendingChoice = null; });
    st.message = messages.join(" \u00B7 ") + ".";
    st.history.push("Age " + romanAge(st.age) + ", Round " + st.round + ": " + st.message);
    if (st.history.length > 30) st.history.shift();

    if (st.specialQueue.length) {
        beginNextSpecial(st);
    } else {
        finalizeResolvedRound(st);
    }

    syncSevenWonders();
    renderSevenWonders();
}

function beginNextSpecial(st) {
    while (st.specialQueue.length) {
        const playerId = st.specialQueue.shift();
        const p = findPlayer(st, playerId);
        if (!p) continue;

        const legal = st.discardPile.filter(function (c) { return !hasBuiltName(p, c.name); });
        if (!legal.length) continue;

        st.phase = "special";
        st.specialPlayerId = p.id;
        st.message = p.name + " may build one card from the discard pile for free.";

        if (p.isComputer) {
            const chosen = bestDiscardCardForAI(p, legal);
            applyDiscardSpecial(st, p, chosen.uid);
            continue;
        }
        return;
    }

    st.phase = "playing";
    st.specialPlayerId = null;
    finalizeResolvedRound(st);
}

function applyDiscardSpecial(st, player, cardUid) {
    const idx = st.discardPile.findIndex(function (c) { return c.uid === cardUid; });
    if (idx < 0) return false;
    const chosen = st.discardPile[idx];
    if (hasBuiltName(player, chosen.name)) return false;

    st.discardPile.splice(idx, 1);
    player.tableau.push(chosen);
    applyImmediateCardIncome(st, player, chosen);
    st.message = player.name + " rebuilt " + chosen.name + " from the discard pile.";
    return true;
}

function finalizeResolvedRound(st) {
    const finalPick = st.players.length && st.players[0].hand.length === 1;

    if (finalPick) {
        st.players.forEach(function (p) {
            if (p.hand[0]) st.discardPile.push(p.hand[0]);
            p.hand = [];
        });
    }

    if (!st.players.length || st.players[0].hand.length === 0) {
        scoreMilitaryForAge(st, st.age);

        if (st.age >= 3) {
            finishGame(st);
            return;
        }

        const nextAge = st.age + 1;
        dealAge(st, nextAge);
        st.message = "Age " + romanAge(nextAge) + " begins. Choose one card.";
        return;
    }

    rotateHands(st);
    st.round += 1;
    snapshotTurnCoins(st);
    st.message = "Hands passed " + (st.direction === 1 ? "left" : "right") + ". Choose one card.";
}

function rotateHands(st) {
    const hands = st.players.map(function (p) { return p.hand; });
    const n = st.players.length;
    st.players.forEach(function (p, idx) {
        const sourceIdx = ((idx - st.direction) % n + n) % n;
        p.hand = hands[sourceIdx];
    });
}

function allChoicesIn(st) {
    return st.players.every(function (p) { return p.isComputer || !!p.pendingChoice; });
}

/* --------------------------------------------------------------------------
   AI
---------------------------------------------------------------------------- */
function cardHeuristic(player, cardDef) {
    let value = 0;
    value += (cardDef.vp || 0) * 4;
    value += (cardDef.shields || 0) * 4;
    value += cardDef.science ? 8 : 0;
    value += (cardDef.coins || 0) * 0.8;
    value += cardDef.production ? 7 : 0;
    value += cardDef.discount ? 5 : 0;
    value += cardDef.coinsPer ? 5 : 0;
    value += cardDef.commerceScore ? 8 : 0;
    value += cardDef.guild ? 9 : 0;
    value += (cardDef.chainTo || []).length * 1.5;
    if (hasBuiltName(player, cardDef.name)) value = -999;
    return value;
}

function wonderStageHeuristic(player) {
    const stage = WONDER_BOARDS[player.wonder].stages[player.wonderStage];
    if (!stage) return -999;
    return (stage.vp || 0) * 4 + (stage.coins || 0) + (stage.shields || 0) * 5 + (stage.effect ? 10 : 0);
}

function computerChoose(player, st) {
    const choices = [];

    player.hand.forEach(function (c) {
        const build = canBuildCard(st, player, c);
        if (build.legal) {
            choices.push({
                score: cardHeuristic(player, c) - (build.plans[0].totalCoins || 0) * 0.6,
                choice: { action: "build", cardUid: c.uid, payment: build.plans[0], roundKey: roundKey(st) }
            });
        } else if (canUseOlympiaFreeBuild(player) && !hasBuiltName(player, c.name)) {
            choices.push({
                score: cardHeuristic(player, c) - 1,
                choice: { action: "build", cardUid: c.uid, payment: findPaymentPlans(st, player, c.cost, "olympia")[0], freeMode: "olympia", roundKey: roundKey(st) }
            });
        }
    });

    const wonder = canBuildWonder(st, player);
    if (wonder.legal && player.hand.length) {
        choices.push({
            score: wonderStageHeuristic(player) - (wonder.plans[0].totalCoins || 0) * 0.5,
            choice: { action: "wonder", cardUid: player.hand[player.hand.length - 1].uid, payment: wonder.plans[0], roundKey: roundKey(st) }
        });
    }

    if (!choices.length) {
        return { action: "discard", cardUid: player.hand[0].uid, roundKey: roundKey(st) };
    }

    choices.sort(function (a, b) { return b.score - a.score; });
    return choices[0].choice;
}

function bestDiscardCardForAI(player, cards) {
    return cards.slice().sort(function (a, b) {
        return cardHeuristic(player, b) - cardHeuristic(player, a);
    })[0];
}

/* --------------------------------------------------------------------------
   MILITARY AND FINAL SCORING
---------------------------------------------------------------------------- */
function scoreMilitaryForAge(st, ageNum) {
    const winValue = ageNum === 1 ? 1 : ageNum === 2 ? 3 : 5;
    const seen = new Set();
    const n = st.players.length;

    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const key = [Math.min(i, j), Math.max(i, j)].join("-");
        if (seen.has(key)) continue;
        seen.add(key);

        const a = st.players[i];
        const b = st.players[j];
        const aShields = shieldCount(a);
        const bShields = shieldCount(b);

        if (aShields > bShields) {
            a.militaryVP += winValue;
            a.victoryTokens.push(winValue);
            b.militaryVP -= 1;
            b.defeatTokens += 1;
        } else if (bShields > aShields) {
            b.militaryVP += winValue;
            b.victoryTokens.push(winValue);
            a.militaryVP -= 1;
            a.defeatTokens += 1;
        }
    }
}

function scoreScienceWithWilds(science) {
    let best = -Infinity;
    const wild = science.wild || 0;

    for (let a = 0; a <= wild; a++) {
        for (let b = 0; b <= wild - a; b++) {
            const c = wild - a - b;
            const compass = science.compass + a;
            const gear = science.gear + b;
            const tablet = science.tablet + c;
            const sets = Math.min(compass, gear, tablet);
            const score = compass * compass + gear * gear + tablet * tablet + sets * 7;
            if (score > best) best = score;
        }
    }

    return best === -Infinity ? 0 : best;
}

function guildScoreForCard(st, player, guildCard) {
    const rule = guildCard.guild;
    if (!rule) return 0;
    const n = neighborsOf(st, player.id);

    if (rule.kind === "neighborsType") {
        return (cardCountByType(n.left, rule.type) + cardCountByType(n.right, rule.type)) * rule.multiplier;
    }
    if (rule.kind === "wonderStagesAll") {
        return (player.wonderStage + n.left.wonderStage + n.right.wonderStage) * rule.multiplier;
    }
    if (rule.kind === "selfTypes") {
        let count = 0;
        rule.types.forEach(function (type) { count += cardCountByType(player, type); });
        return count * rule.multiplier;
    }
    if (rule.kind === "neighborDefeats") {
        return (n.left.defeatTokens + n.right.defeatTokens) * rule.multiplier;
    }
    return 0;
}

function commercialEndVP(player) {
    return player.tableau.reduce(function (sum, c) {
        if (!c.commerceScore) return sum;
        return sum + commerceBasisCount(player, c.commerceScore.basis) * c.commerceScore.vpMultiplier;
    }, 0);
}

function totalGuildVP(st, player) {
    return player.tableau.reduce(function (sum, c) {
        return sum + (c.type === "guild" ? guildScoreForCard(st, player, c) : 0);
    }, 0);
}

function finishGame(st) {
    st.players.forEach(function (p) {
        const civilian = p.tableau.reduce(function (sum, c) { return sum + (c.vp || 0); }, 0);
        const coins = Math.floor(p.coins / 3);
        const wonder = wonderVP(p);
        const science = scoreScienceWithWilds(scienceCounts(p));
        const commercial = commercialEndVP(p);
        const guilds = totalGuildVP(st, p);
        const military = p.militaryVP || 0;
        const total = civilian + coins + wonder + science + commercial + guilds + military;

        p.scoreBreakdown = {
            military: military,
            coins: coins,
            wonder: wonder,
            civilian: civilian,
            science: science,
            commercial: commercial,
            guilds: guilds,
            total: total
        };
        p.finalScore = total;
    });

    const ranked = st.players.slice().sort(function (a, b) {
        if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
        return b.coins - a.coins;
    });

    st.phase = "ended";
    st.specialPlayerId = null;
    st.message = ranked[0].name + " wins with " + ranked[0].finalScore + " points!";
    st.lastResult = ranked.map(function (p) { return p.name + ": " + p.finalScore; }).join(" \u00B7 ");
}

/* --------------------------------------------------------------------------
   NETWORKING - HOST AUTHORITATIVE
   Non-host devices send only their locked choice. The host resolves the round
   and broadcasts the resulting state, preventing whole-state overwrite races.
---------------------------------------------------------------------------- */
function syncSevenWonders() {
    const ch = getChannel();
    if (!ch || !window.sevenWondersState) return;
    ch.send({
        type: "broadcast",
        event: "sevenwonders-sync-state",
        payload: {
            state: window.sevenWondersState,
            roomGameId: currentRoomGameId()
        }
    });
}

function sendNetworkEvent(eventName, payload) {
    const ch = getChannel();
    if (!ch) return false;
    ch.send({ type: "broadcast", event: eventName, payload: payload });
    return true;
}

function roomPayloadMatches(payload) {
    if (!payload) return false;
    const activeId = currentRoomGameId();
    return !payload.roomGameId || !activeId || payload.roomGameId === activeId;
}

function registerNetworkHandlers() {
    if (window.__wondersNetworkRegistered) return;
    const ch = getChannel();
    if (!ch || typeof ch.on !== "function") return;

    ch.on("broadcast", { event: "wonders-submit-action" }, function (message) {
        const payload = message && message.payload ? message.payload : message;
        if (!isHost() || !roomPayloadMatches(payload)) return;
        hostReceiveAction(payload);
    });

    ch.on("broadcast", { event: "wonders-special-choice" }, function (message) {
        const payload = message && message.payload ? message.payload : message;
        if (!isHost() || !roomPayloadMatches(payload)) return;
        hostReceiveSpecialChoice(payload);
    });

    ch.on("broadcast", { event: "wonders-request-state" }, function (message) {
        const payload = message && message.payload ? message.payload : message;
        if (!isHost() || !roomPayloadMatches(payload)) return;
        syncSevenWonders();
    });

    window.__wondersNetworkRegistered = true;
}

function hostReceiveAction(payload) {
    const st = window.sevenWondersState;
    if (!st || st.phase !== "playing" || !payload || !payload.playerId || !payload.choice) return;
    if (payload.choice.roundKey !== roundKey(st)) return;

    const p = findPlayer(st, payload.playerId);
    if (!p || p.isComputer || p.pendingChoice) return;

    const valid = validateChoice(st, p, payload.choice);
    if (!valid) return;

    p.pendingChoice = valid;
    st.message = p.name + " locked in a choice.";
    syncSevenWonders();
    renderSevenWonders();

    if (allChoicesIn(st)) setTimeout(resolveRound, 250);
}

function submitMyChoice(choice) {
    const st = window.sevenWondersState;
    const me = myPlayer();
    if (!st || !me || me.pendingChoice || st.phase !== "playing") return;

    choice.roundKey = roundKey(st);
    const valid = validateChoice(st, me, choice);
    if (!valid) return;

    if (isHost()) {
        me.pendingChoice = valid;
        st.message = me.name + " locked in a choice.";
        syncSevenWonders();
        renderSevenWonders();
        if (allChoicesIn(st)) setTimeout(resolveRound, 250);
        return;
    }

    localUi.submittedRoundKey = roundKey(st);
    localUi.selectedCardUid = null;
    const sent = sendNetworkEvent("wonders-submit-action", {
        roomGameId: currentRoomGameId(),
        playerId: me.id,
        choice: valid
    });
    if (!sent) {
        localUi.submittedRoundKey = null;
        st.message = "The room connection is not ready. Try the choice again.";
    }
    renderSevenWonders();
}

function hostReceiveSpecialChoice(payload) {
    const st = window.sevenWondersState;
    if (!st || st.phase !== "special" || !payload) return;
    if (payload.playerId !== st.specialPlayerId) return;
    const p = findPlayer(st, payload.playerId);
    if (!p) return;

    if (!applyDiscardSpecial(st, p, payload.cardUid)) return;
    st.specialPlayerId = null;
    beginNextSpecial(st);
    syncSevenWonders();
    renderSevenWonders();
}

function requestState() {
    sendNetworkEvent("wonders-request-state", {
        roomGameId: currentRoomGameId(),
        playerId: getMyId()
    });
}

/* --------------------------------------------------------------------------
   LOCAL UI ACTIONS
---------------------------------------------------------------------------- */
const localUi = {
    selectedCardUid: null,
    modal: null,
    modalData: null,
    submittedRoundKey: null,
    paymentContext: null,
    zoomScale: 1
};

function selectedHandCard() {
    const me = myPlayer();
    if (!me || !localUi.selectedCardUid) return null;
    return me.hand.find(function (c) { return c.uid === localUi.selectedCardUid; }) || null;
}

window.wondersTapHandCard = function (cardUidEncoded) {
    const uid = decodeURIComponent(cardUidEncoded);
    const me = myPlayer();
    if (!me || me.pendingChoice) return;
    const found = me.hand.find(function (c) { return c.uid === uid; });
    if (!found) return;
    localUi.selectedCardUid = uid;
    localUi.modal = "card";
    localUi.modalData = { playerId: me.id, cardUid: uid, fromHand: true };
    renderSevenWonders();
};

window.wondersOpenBuiltCard = function (playerIdEncoded, cardUidEncoded) {
    localUi.modal = "card";
    localUi.modalData = {
        playerId: decodeURIComponent(playerIdEncoded),
        cardUid: decodeURIComponent(cardUidEncoded),
        fromHand: false
    };
    renderSevenWonders();
};

window.wondersCloseModal = function () {
    localUi.modal = null;
    localUi.modalData = null;
    localUi.paymentContext = null;
    renderSevenWonders();
};

window.wondersOpenOpponent = function (playerIdEncoded) {
    localUi.modal = "opponent";
    localUi.modalData = { playerId: decodeURIComponent(playerIdEncoded) };
    renderSevenWonders();
};

window.wondersOpenBoard = function (playerIdEncoded) {
    localUi.modal = "board";
    localUi.modalData = { playerId: decodeURIComponent(playerIdEncoded) };
    renderSevenWonders();
};

window.wondersOpenHistory = function () {
    localUi.modal = "history";
    localUi.modalData = null;
    renderSevenWonders();
};

window.wondersBuildSelected = function () {
    beginSelectedPayment("build");
};

window.wondersBuildSelectedFree = function () {
    const st = window.sevenWondersState;
    const me = myPlayer();
    const selected = selectedHandCard();
    if (!st || !me || !selected || !canUseOlympiaFreeBuild(me) || hasBuiltName(me, selected.name)) return;
    const plan = findPaymentPlans(st, me, selected.cost, "olympia")[0];
    submitMyChoice({ action: "build", cardUid: selected.uid, payment: plan, freeMode: "olympia" });
    window.wondersCloseModal();
};

window.wondersWonderSelected = function () {
    beginSelectedPayment("wonder");
};

window.wondersSellSelected = function () {
    const selected = selectedHandCard();
    if (!selected) return;
    submitMyChoice({ action: "discard", cardUid: selected.uid });
    window.wondersCloseModal();
};

function beginSelectedPayment(actionType) {
    const st = window.sevenWondersState;
    const me = myPlayer();
    const selected = selectedHandCard();
    if (!st || !me || !selected) return;

    let plans = [];
    let freeMode = null;

    if (actionType === "build") {
        if (hasBuiltName(me, selected.name)) return;
        if (hasChainInto(me, selected)) freeMode = "chain";
        plans = findPaymentPlans(st, me, selected.cost, freeMode);
    } else {
        const board = WONDER_BOARDS[me.wonder];
        const stage = board.stages[me.wonderStage];
        if (!stage) return;
        plans = findPaymentPlans(st, me, stage.cost, null);
    }

    if (!plans.length) return;

    if (plans.length === 1 || plans[0].totalCoins === 0) {
        submitMyChoice({
            action: actionType,
            cardUid: selected.uid,
            payment: plans[0],
            freeMode: freeMode
        });
        window.wondersCloseModal();
        return;
    }

    localUi.modal = "payment";
    localUi.paymentContext = {
        actionType: actionType,
        cardUid: selected.uid,
        freeMode: freeMode,
        plans: plans
    };
    renderSevenWonders();
}

window.wondersChoosePayment = function (planIndex) {
    const ctx = localUi.paymentContext;
    if (!ctx || !ctx.plans[planIndex]) return;
    submitMyChoice({
        action: ctx.actionType,
        cardUid: ctx.cardUid,
        payment: ctx.plans[planIndex],
        freeMode: ctx.freeMode
    });
    window.wondersCloseModal();
};

window.wondersChooseDiscardSpecial = function (cardUidEncoded) {
    const st = window.sevenWondersState;
    const me = myPlayer();
    if (!st || !me || st.phase !== "special" || st.specialPlayerId !== me.id) return;
    const cardUid = decodeURIComponent(cardUidEncoded);

    if (isHost()) {
        hostReceiveSpecialChoice({ playerId: me.id, cardUid: cardUid });
    } else {
        sendNetworkEvent("wonders-special-choice", {
            roomGameId: currentRoomGameId(),
            playerId: me.id,
            cardUid: cardUid
        });
        localUi.modal = null;
        renderSevenWonders();
    }
};


/* The top game header is intentionally part of the same zoom surface.
   Do not make .wo-top sticky: sticky positioning inside a transformed
   pinch-zoom surface causes the header to drift away from the board. */

/* --------------------------------------------------------------------------
   PINCH-TO-ZOOM FOR THE WHOLE WONDERS PLAY AREA
   This is self-contained inside the game canvas, so Chaser's surrounding
   controls do not need to change and the main index file can stay untouched.
---------------------------------------------------------------------------- */
function clampWondersZoom(value) {
    return Math.max(1, Math.min(2.6, value));
}

function touchDistance(a, b) {
    const dx = b.clientX - a.clientX;
    const dy = b.clientY - a.clientY;
    return Math.sqrt((dx * dx) + (dy * dy));
}

function applyWondersZoom(root, shell, surface, scale) {
    if (!root || !shell || !surface) return;
    const next = clampWondersZoom(scale);
    localUi.zoomScale = next;

    const baseWidth = Math.max(1, root.clientWidth);
    surface.style.width = baseWidth + "px";
    surface.style.transformOrigin = "0 0";
    surface.style.transform = "scale(" + next + ")";

    shell.style.width = Math.ceil(baseWidth * next) + "px";
    shell.style.height = Math.ceil(surface.scrollHeight * next) + "px";
    root.classList.toggle("wo-is-zoomed", next > 1.01);
}

function installWondersPinchZoom() {
    const root = document.querySelector("#gameCanvasContainer .wo-root");
    const shell = root && root.querySelector(".wo-zoom-shell");
    const surface = shell && shell.querySelector(".wo-zoom-surface");
    if (!root || !shell || !surface) return;

    applyWondersZoom(root, shell, surface, localUi.zoomScale || 1);

    let pinch = null;

    root.addEventListener("touchstart", function (event) {
        if (event.touches.length !== 2) return;

        const rect = root.getBoundingClientRect();
        const midX = ((event.touches[0].clientX + event.touches[1].clientX) / 2) - rect.left;
        const midY = ((event.touches[0].clientY + event.touches[1].clientY) / 2) - rect.top;
        const startScale = localUi.zoomScale || 1;

        pinch = {
            distance: Math.max(1, touchDistance(event.touches[0], event.touches[1])),
            scale: startScale,
            contentX: (root.scrollLeft + midX) / startScale,
            contentY: (root.scrollTop + midY) / startScale
        };

        root.classList.add("wo-pinching");
        event.preventDefault();
    }, { passive: false });

    root.addEventListener("touchmove", function (event) {
        if (!pinch || event.touches.length !== 2) return;

        const rect = root.getBoundingClientRect();
        const midX = ((event.touches[0].clientX + event.touches[1].clientX) / 2) - rect.left;
        const midY = ((event.touches[0].clientY + event.touches[1].clientY) / 2) - rect.top;
        const ratio = touchDistance(event.touches[0], event.touches[1]) / pinch.distance;
        const nextScale = clampWondersZoom(pinch.scale * ratio);

        applyWondersZoom(root, shell, surface, nextScale);
        root.scrollLeft = Math.max(0, (pinch.contentX * nextScale) - midX);
        root.scrollTop = Math.max(0, (pinch.contentY * nextScale) - midY);
        event.preventDefault();
    }, { passive: false });

    function endPinch(event) {
        if (event.touches && event.touches.length >= 2) return;
        pinch = null;
        root.classList.remove("wo-pinching");
    }

    root.addEventListener("touchend", endPinch, { passive: true });
    root.addEventListener("touchcancel", endPinch, { passive: true });

    window.setTimeout(function () {
        applyWondersZoom(root, shell, surface, localUi.zoomScale || 1);
    }, 0);
}

/* --------------------------------------------------------------------------
   VISUAL HELPERS
---------------------------------------------------------------------------- */
function resourceList(resources, includeZero) {
    const parts = [];
    RES_KEYS.forEach(function (k) {
        const qty = (resources && resources[k]) || 0;
        if (qty > 0 || includeZero) parts.push(RES_ICONS[k] + (qty > 1 ? qty : ""));
    });
    return parts.join(" ");
}

function costHtml(cost) {
    if (!cost || !Object.keys(cost).length) return "FREE";
    const parts = [];
    if (cost.coins) parts.push("\uD83E\uDE99" + cost.coins);
    RES_KEYS.forEach(function (k) {
        if (cost[k]) parts.push(RES_ICONS[k] + (cost[k] > 1 ? cost[k] : ""));
    });
    return parts.join(" ");
}

function productionIcon(cardDef) {
    if (!cardDef.production) return "";
    return cardDef.production.map(function (src) {
        const joined = src.options.map(function (k) { return RES_ICONS[k]; }).join("/");
        return (src.count || 1) > 1 ? joined + "\u00D7" + src.count : joined;
    }).join(" ");
}

function primaryEffectHtml(cardDef) {
    if (cardDef.production) return productionIcon(cardDef);
    if (cardDef.vp) return "<span class='wo-vp-big'>" + cardDef.vp + "</span><span class='wo-vp-trophy'>\uD83C\uDFC6</span>";
    if (cardDef.shields) return "<span class='wo-shield-row'>" + "\uD83D\uDEE1\uFE0F".repeat(cardDef.shields) + "</span>";
    if (cardDef.science) return "<span class='wo-science-big'>" + SCIENCE_ICONS[cardDef.science] + "</span>";
    if (cardDef.coins) return "<span class='wo-coin-big'>\uD83E\uDE99" + cardDef.coins + "</span>";
    if (cardDef.discount) {
        const arrow = cardDef.discount.side === "left" ? "\u2190" : cardDef.discount.side === "right" ? "\u2192" : "\u2194";
        const icons = cardDef.discount.group === "raw" ? "\uD83E\uDEB5\uD83E\uDDF1\uD83E\uDEA8\u26CF\uFE0F" : "\uD83D\uDD37\uD83D\uDCDC\uD83E\uDDF5";
        return "<span class='wo-trade-big'>" + arrow + " \uD83E\uDE991<br><small>" + icons + "</small></span>";
    }
    if (cardDef.coinsPer) {
        const typeSymbol = TYPE_INFO[cardDef.coinsPer.type].symbol;
        return "<span class='wo-formula-big'>" + typeSymbol + " \u00D7 " + cardDef.coinsPer.multiplier + "\uD83E\uDE99</span>";
    }
    if (cardDef.commerceScore) {
        const basis = cardDef.commerceScore.basis === "wonderStage" ? "\uD83C\uDFDB\uFE0F" : TYPE_INFO[cardDef.commerceScore.basis].symbol;
        return "<span class='wo-formula-big'>" + basis + " \u00D7 " + cardDef.commerceScore.coinMultiplier + "\uD83E\uDE99<br>" + basis + " \u00D7 " + cardDef.commerceScore.vpMultiplier + "\uD83C\uDFC6</span>";
    }
    if (cardDef.guild) return guildEffectIcon(cardDef.guild);
    return "\u2726";
}

function guildEffectIcon(rule) {
    if (!rule) return "\uD83D\uDC51";
    if (rule.kind === "neighborsType") return "\u2190 " + TYPE_INFO[rule.type].symbol + " \u00D7 " + rule.multiplier + "\uD83C\uDFC6 \u2192";
    if (rule.kind === "wonderStagesAll") return "\u2190 \uD83C\uDFDB\uFE0F + \uD83C\uDFDB\uFE0F + \uD83C\uDFDB\uFE0F \u2192";
    if (rule.kind === "selfTypes") return "\uD83D\uDFEB + \u2B1C + \uD83D\uDFE3";
    if (rule.kind === "scienceWild") return "\uD83E\uDDED / \u2699\uFE0F / \uD83D\uDCD0";
    if (rule.kind === "neighborDefeats") return "\u2190 -1 \u00D7 \uD83C\uDFC6 \u2192";
    return "\uD83D\uDC51";
}

function chainFromLabel(cardDef) {
    if (!cardDef.chainFrom || !cardDef.chainFrom.length) return "";
    return "FREE WITH: " + cardDef.chainFrom.join(" OR ");
}

function chainToLabel(cardDef) {
    if (!cardDef.chainTo || !cardDef.chainTo.length) return "";
    return "BUILDS FREE: " + cardDef.chainTo.join(" \u00B7 ");
}

function thresholdLabel(cardDef) {
    return (cardDef.thresholds || [3]).map(function (n) { return n + "+"; }).join(" ");
}

function cardFrontHtml(cardDef, options) {
    const opts = options || {};
    const selected = !!opts.selected;
    const compact = !!opts.compact;
    const disabled = !!opts.disabled;
    const click = opts.onclick || "";
    const classes = ["wo-card", "wo-type-" + cardDef.type];
    if (selected) classes.push("wo-selected");
    if (compact) classes.push("wo-card-compact");
    if (disabled) classes.push("wo-card-disabled");

    const chainLines = [];
    if (cardDef.chainFrom && cardDef.chainFrom.length) {
        chainLines.push("<div class=\"wo-card-chain-from\">FREE WITH: " + escapeHtml(cardDef.chainFrom.join(" OR ")) + "</div>");
    }
    if (cardDef.chainTo && cardDef.chainTo.length) {
        chainLines.push("<div class=\"wo-card-chain-to\">BUILDS FREE: " + escapeHtml(cardDef.chainTo.join(" \u00B7 ")) + "</div>");
    }

    return (
        "<div class=\"" + classes.join(" ") + "\"" + (click ? " onclick=\"" + click + "\"" : "") + ">" +
            "<div class=\"wo-card-cost\">" + costHtml(cardDef.cost) + "</div>" +
            "<div class=\"wo-card-age\"><span>AGE</span><b>" + romanAge(cardDef.age) + "</b></div>" +
            (cardDef.chainFrom && cardDef.chainFrom.length ? "<div class=\"wo-chain-in\">\u26D3</div>" : "") +
            "<div class=\"wo-card-type-label\">" + escapeHtml(TYPE_INFO[cardDef.type].label) + "</div>" +
            "<div class=\"wo-card-effect\">" + primaryEffectHtml(cardDef) + "</div>" +
            "<div class=\"wo-card-rule-text\">" + escapeHtml(cardDef.description || "") + "</div>" +
            (chainLines.length ? "<div class=\"wo-card-chain-panel\">" + chainLines.join("") + "</div>" : "") +
            "<div class=\"wo-card-name\">" + escapeHtml(cardDef.name) + "</div>" +
            (cardDef.chainTo && cardDef.chainTo.length ? "<div class=\"wo-chain-out\">\u26D3 " + escapeHtml(cardDef.chainTo.join(" \u00B7 ")) + "</div>" : "") +
            "<div class=\"wo-card-count\">" + escapeHtml(thresholdLabel(cardDef)) + "</div>" +
        "</div>"
    );
}

function tradableResourceSummary(player) {
    const max = { wood: 9, clay: 9, stone: 9, ore: 9, glass: 9, papyrus: 9, cloth: 9 };
    const vectors = productionVectors(player, true, max);
    const maximum = emptyResources();
    vectors.forEach(function (vec) {
        RES_KEYS.forEach(function (k) { maximum[k] = Math.max(maximum[k], vec[k] || 0); });
    });
    return maximum;
}

function ownResourceSummary(player) {
    const max = { wood: 9, clay: 9, stone: 9, ore: 9, glass: 9, papyrus: 9, cloth: 9 };
    const vectors = productionVectors(player, false, max);
    const maximum = emptyResources();
    vectors.forEach(function (vec) {
        RES_KEYS.forEach(function (k) { maximum[k] = Math.max(maximum[k], vec[k] || 0); });
    });
    return maximum;
}

function compactResourceChips(resources) {
    return RES_KEYS.filter(function (k) { return resources[k] > 0; }).map(function (k) {
        return "<span class='wo-mini-resource'>" + RES_ICONS[k] + (resources[k] > 1 ? resources[k] : "") + "</span>";
    }).join("") || "<span class='wo-faint'>none</span>";
}

function wonderStageEffectHtml(stage) {
    if (stage.vp) {
        return "<span class='wo-stage-vp'><b>" + stage.vp + "</b><span>\uD83C\uDFC6</span></span>";
    }
    return escapeHtml(stage.icon || stage.label);
}

function wonderBoardHtml(player, interactive) {
    const board = WONDER_BOARDS[player.wonder];
    const stages = board.stages.map(function (stage, index) {
        const built = index < player.wonderStage;
        const tucked = player.wonderCards.find(function (x) { return x.stageIndex === index; });
        return (
            "<div class='wo-stage-wrap'>" +
                (tucked ? "<div class='wo-tucked-card'><span>AGE " + romanAge(tucked.card.age) + "</span></div>" : "") +
                "<div class='wo-stage " + (built ? "wo-stage-built" : "") + "'>" +
                    "<div class='wo-stage-number'>" + (index + 1) + "</div>" +
                    "<div class='wo-stage-cost'>" + costHtml(stage.cost) + "</div>" +
                    "<div class='wo-stage-effect'>" + wonderStageEffectHtml(stage) + "</div>" +
                    (built ? "<div class='wo-stage-check'>\u2713</div>" : "") +
                "</div>" +
            "</div>"
        );
    }).join("");

    const boardClick = interactive ? " onclick=\"window.wondersOpenBoard('" + enc(player.id) + "')\"" : "";
    const boardClass = interactive ? " wo-wonder-tappable" : "";

    return (
        "<section class='wo-wonder wo-scene-" + board.scene + boardClass + "'" + boardClick + ">" +
            "<div class='wo-sky-glow'></div>" +
            "<div class='wo-landmark' aria-hidden='true'></div>" +
            "<div class='wo-wonder-heading'>" +
                "<div><div class='wo-wonder-city'>" + escapeHtml(player.wonder) + "</div><div class='wo-wonder-subtitle'>" + escapeHtml(board.subtitle) + "</div></div>" +
                "<div class='wo-start-resource'><span>START</span>" + RES_ICONS[board.startResource] + "</div>" +
            "</div>" +
            "<div class='wo-stage-row'>" + stages + "</div>" +
            (interactive ? "<div class='wo-board-zoom-hint'>\uD83D\uDD0D TAP TO ENLARGE</div>" : "") +
        "</section>"
    );
}

function opponentsHtml(st, me) {
    return st.players.filter(function (p) { return p.id !== me.id; }).map(function (p) {
        const ready = p.pendingChoice || p.isComputer;
        const initials = (p.name || "?").trim().slice(0, 1).toUpperCase();
        const trade = compactResourceChips(tradableResourceSummary(p));
        return (
            "<button class='wo-opponent " + (ready ? "wo-opponent-ready" : "") + "' onclick=\"window.wondersOpenOpponent('" + enc(p.id) + "')\">" +
                "<span class='wo-avatar'>" + escapeHtml(initials) + "</span>" +
                "<span class='wo-opp-info'><b>" + escapeHtml(p.name) + "</b><small>" + escapeHtml(p.wonder) + " \u00B7 \uD83D\uDEE1\uFE0F" + shieldCount(p) + " \u00B7 \uD83E\uDE99" + p.coins + "</small><span class='wo-opp-trade'>" + trade + "</span></span>" +
                "<span class='wo-ready-dot'>" + (ready ? "\u2713" : "\u2026") + "</span>" +
            "</button>"
        );
    }).join("");
}

function resourceAndTradeHtml(st, me) {
    const own = compactResourceChips(ownResourceSummary(me));
    const n = neighborsOf(st, me.id);
    const left = compactResourceChips(tradableResourceSummary(n.left));
    const right = compactResourceChips(tradableResourceSummary(n.right));

    return (
        "<section class='wo-resource-panel'>" +
            "<div class='wo-resource-cell wo-own-res'><span class='wo-res-title'>YOUR PRODUCTION</span><div>" + own + "</div></div>" +
            "<button class='wo-resource-cell' onclick=\"window.wondersOpenOpponent('" + enc(n.left.id) + "')\"><span class='wo-res-title'>\u2190 BUY FROM " + escapeHtml(n.left.name) + "</span><div>" + left + "</div></button>" +
            "<button class='wo-resource-cell' onclick=\"window.wondersOpenOpponent('" + enc(n.right.id) + "')\"><span class='wo-res-title'>BUY FROM " + escapeHtml(n.right.name) + " \u2192</span><div>" + right + "</div></button>" +
        "</section>"
    );
}

function tableauHtml(player) {
    if (!player.tableau.length) {
        return "<div class='wo-empty-city'>Your first built card will appear here.</div>";
    }

    return TYPE_ORDER.map(function (type) {
        const cards = player.tableau.filter(function (c) { return c.type === type; });
        if (!cards.length) return "";
        return (
            "<div class='wo-city-row wo-city-row-" + type + "'>" +
                "<div class='wo-city-row-label'>" + TYPE_INFO[type].symbol + " " + escapeHtml(TYPE_INFO[type].label) + "</div>" +
                "<div class='wo-city-cards'>" + cards.map(function (c) {
                    return cardFrontHtml(c, {
                        compact: true,
                        onclick: "window.wondersOpenBuiltCard('" + enc(player.id) + "','" + enc(c.uid) + "')"
                    });
                }).join("") + "</div>" +
            "</div>"
        );
    }).join("");
}

function handHtml(st, me) {
    if (me.pendingChoice || localUi.submittedRoundKey === roundKey(st)) {
        return "<div class='wo-waiting-panel'><div class='wo-hourglass'>\u231B</div><b>Choice locked in</b><span>Waiting for the other cities.</span></div>";
    }

    return (
        "<div class='wo-hand-scroll'>" + me.hand.map(function (c) {
            const status = canBuildCard(st, me, c);
            const disabled = hasBuiltName(me, c.name);
            return cardFrontHtml(c, {
                selected: c.uid === localUi.selectedCardUid,
                disabled: disabled,
                onclick: "window.wondersTapHandCard('" + enc(c.uid) + "')"
            });
        }).join("") + "</div>"
    );
}

function actionBarHtml(st, me) {
    if (me.pendingChoice || localUi.submittedRoundKey === roundKey(st) || st.phase !== "playing") return "";
    const selected = selectedHandCard();
    if (!selected) return "<div class='wo-action-hint'>Tap a card to enlarge it and choose what to do.</div>";

    const build = canBuildCard(st, me, selected);
    const wonder = canBuildWonder(st, me);
    const olympia = canUseOlympiaFreeBuild(me) && !hasBuiltName(me, selected.name);
    const bestBuild = build.plans && build.plans[0] ? planLabel(build.plans[0]) : build.reason;
    const bestWonder = wonder.plans && wonder.plans[0] ? planLabel(wonder.plans[0]) : wonder.reason;

    return (
        "<div class='wo-selected-summary'><b>" + escapeHtml(selected.name) + "</b><span>Build: " + escapeHtml(bestBuild) + "</span></div>" +
        "<div class='wo-action-row'>" +
            "<button class='wo-action wo-build' " + (!build.legal ? "disabled" : "") + " onclick='window.wondersBuildSelected()'>BUILD</button>" +
            "<button class='wo-action wo-stage-action' " + (!wonder.legal ? "disabled" : "") + " onclick='window.wondersWonderSelected()'>WONDER</button>" +
            "<button class='wo-action wo-sell' onclick='window.wondersSellSelected()'>SELL +3</button>" +
        "</div>" +
        (olympia ? "<button class='wo-olympia-free' onclick='window.wondersBuildSelectedFree()'>\u2728 Use Olympia: build this card free</button>" : "") +
        (wonder.legal ? "<div class='wo-wonder-payment'>Wonder stage: " + escapeHtml(bestWonder) + "</div>" : "")
    );
}

function scoreBoardHtml(st) {
    const ranked = st.players.slice().sort(function (a, b) {
        if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
        return b.coins - a.coins;
    });

    return (
        "<div class='wo-end-screen'>" +
            "<div class='wo-end-title'>WONDERS COMPLETE</div>" +
            "<div class='wo-winner'>" + escapeHtml(st.message) + "</div>" +
            "<div class='wo-score-list'>" + ranked.map(function (p, idx) {
                const b = p.scoreBreakdown;
                return (
                    "<div class='wo-score-card " + (idx === 0 ? "wo-first" : "") + "'>" +
                        "<div class='wo-rank'>" + (idx + 1) + "</div>" +
                        "<div class='wo-score-name'><b>" + escapeHtml(p.name) + "</b><small>" + escapeHtml(p.wonder) + "</small></div>" +
                        "<div class='wo-score-total'>" + p.finalScore + "</div>" +
                        "<div class='wo-score-breakdown'>\uD83D\uDEE1\uFE0F" + b.military + " \u00B7 \uD83E\uDE99" + b.coins + " \u00B7 \uD83C\uDFDB\uFE0F" + b.wonder + " \u00B7 \uD83D\uDD35" + b.civilian + " \u00B7 \uD83D\uDFE2" + b.science + " \u00B7 \uD83D\uDFE1" + b.commercial + " \u00B7 \uD83D\uDFE3" + b.guilds + "</div>" +
                    "</div>"
                );
            }).join("") + "</div>" +
        "</div>"
    );
}

/* --------------------------------------------------------------------------
   MODALS
---------------------------------------------------------------------------- */
function modalShell(title, body, extraClass) {
    const boxClass = extraClass || "";
    const overlayClass = boxClass ? " " + boxClass + "-overlay" : "";
    return (
        "<div class='wo-modal-overlay" + overlayClass + "' onclick='window.wondersCloseModal()'>" +
            "<div class='wo-modal-box " + boxClass + "' onclick='event.stopPropagation()'>" +
                "<button class='wo-modal-x' onclick='window.wondersCloseModal()'>\u00D7</button>" +
                (title ? "<div class='wo-modal-title'>" + escapeHtml(title) + "</div>" : "") +
                body +
            "</div>" +
        "</div>"
    );
}

function cardModalHtml(st) {
    const data = localUi.modalData || {};
    const p = findPlayer(st, data.playerId);
    if (!p) return "";

    let c = null;
    if (data.fromHand && p.id === getMyId()) c = p.hand.find(function (x) { return x.uid === data.cardUid; });
    if (!c) c = p.tableau.find(function (x) { return x.uid === data.cardUid; });
    if (!c) return "";

    const me = myPlayer();
    const isOwnHand = data.fromHand && me && p.id === me.id;
    const buildStatus = isOwnHand ? canBuildCard(st, me, c) : null;
    const wonderStatus = isOwnHand ? canBuildWonder(st, me) : null;

    let actionButtons = "";
    if (isOwnHand && !me.pendingChoice && st.phase === "playing") {
        actionButtons = (
            "<div class='wo-modal-actions'>" +
                "<button class='wo-action wo-build' " + (!buildStatus.legal ? "disabled" : "") + " onclick='window.wondersBuildSelected()'>BUILD</button>" +
                "<button class='wo-action wo-stage-action' " + (!wonderStatus.legal ? "disabled" : "") + " onclick='window.wondersWonderSelected()'>WONDER</button>" +
                "<button class='wo-action wo-sell' onclick='window.wondersSellSelected()'>SELL +3</button>" +
            "</div>" +
            (canUseOlympiaFreeBuild(me) && !hasBuiltName(me, c.name) ? "<button class='wo-olympia-free' onclick='window.wondersBuildSelectedFree()'>\u2728 Build free with Olympia</button>" : "")
        );
    }

    const body = (
        "<div class='wo-card-modal-content'>" +
            "<div class='wo-large-card-wrap'>" + cardFrontHtml(c, { onclick: "window.wondersCloseModal()" }) + "</div>" +
            actionButtons +
        "</div>"
    );

    return modalShell("", body, "wo-card-modal");
}

function boardModalHtml(st) {
    const p = findPlayer(st, localUi.modalData && localUi.modalData.playerId);
    if (!p) return "";
    const body = "<div class='wo-zoomed-board-wrap'>" + wonderBoardHtml(p, false) + "</div>";
    return modalShell(p.name + " \u2014 " + p.wonder, body, "wo-board-modal");
}

function opponentModalHtml(st) {
    const p = findPlayer(st, localUi.modalData && localUi.modalData.playerId);
    if (!p) return "";
    const trade = tradableResourceSummary(p);
    const body = (
        "<div class='wo-opponent-summary'>" +
            "<span>\uD83E\uDE99 " + p.coins + "</span><span>\uD83D\uDEE1\uFE0F " + shieldCount(p) + "</span><span>\uD83C\uDFDB\uFE0F " + p.wonderStage + "/3</span>" +
        "</div>" +
        wonderBoardHtml(p, false) +
        "<div class='wo-modal-section-title'>Resources neighbors may buy</div>" +
        "<div class='wo-modal-resources'>" + compactResourceChips(trade) + "</div>" +
        "<div class='wo-modal-section-title'>Built city</div>" +
        "<div class='wo-modal-city'>" + tableauHtml(p) + "</div>"
    );
    return modalShell(p.name + " \u2014 " + p.wonder, body, "wo-opponent-modal");
}

function paymentModalHtml(st) {
    const ctx = localUi.paymentContext;
    if (!ctx) return "";
    const me = myPlayer();
    const selected = selectedHandCard();
    if (!me || !selected) return "";

    const body = (
        "<div class='wo-payment-intro'>Choose which neighbor receives the trade coins. Your own resources are always used first.</div>" +
        "<div class='wo-payment-options'>" + ctx.plans.map(function (plan, idx) {
            return (
                "<button class='wo-payment-option' onclick='window.wondersChoosePayment(" + idx + ")'>" +
                    "<b>Pay " + plan.totalCoins + " coin" + (plan.totalCoins === 1 ? "" : "s") + "</b>" +
                    "<span>" + escapeHtml(planLabel(plan)) + "</span>" +
                "</button>"
            );
        }).join("") + "</div>"
    );
    return modalShell(ctx.actionType === "wonder" ? "Pay for Wonder stage" : "Pay for " + selected.name, body, "wo-payment-modal");
}

function specialModalHtml(st) {
    const me = myPlayer();
    if (!me || st.phase !== "special" || st.specialPlayerId !== me.id) return "";
    const legal = st.discardPile.filter(function (c) { return !hasBuiltName(me, c.name); });
    const body = (
        "<div class='wo-payment-intro'>Choose one discarded Age card. It is built free and does not use the card currently under your Wonder.</div>" +
        "<div class='wo-discard-grid'>" + legal.map(function (c) {
            return "<div class='wo-discard-choice' onclick=\"window.wondersChooseDiscardSpecial('" + enc(c.uid) + "')\">" + cardFrontHtml(c, { compact: true }) + "</div>";
        }).join("") + "</div>"
    );
    return modalShell("Halikarnassos \u2014 build from discard", body, "wo-special-modal");
}

function historyModalHtml(st) {
    const lines = st.history.length ? st.history.slice().reverse() : ["No turns have resolved yet."];
    return modalShell("Game history", "<div class='wo-history-list'>" + lines.map(function (line) { return "<div>" + escapeHtml(line) + "</div>"; }).join("") + "</div>", "wo-history-modal");
}

function activeModalHtml(st) {
    if (st.phase === "special" && st.specialPlayerId === getMyId()) return specialModalHtml(st);
    if (localUi.modal === "card") return cardModalHtml(st);
    if (localUi.modal === "board") return boardModalHtml(st);
    if (localUi.modal === "opponent") return opponentModalHtml(st);
    if (localUi.modal === "payment") return paymentModalHtml(st);
    if (localUi.modal === "history") return historyModalHtml(st);
    return "";
}

/* --------------------------------------------------------------------------
   STYLES
---------------------------------------------------------------------------- */
function swStyles() {
    return "<style>" +
        ".wo-root{--ink:#21160f;--parchment:#ead9b7;--gold:#d7ad49;--deep:#17100c;position:relative;height:100%;overflow:auto;background:radial-gradient(circle at 50% -15%,#6d5138 0,#2e2118 42%,#17100c 100%);color:#f7edd8;font-family:Georgia,'Times New Roman',serif;box-sizing:border-box;padding-bottom:110px;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;overscroll-behavior:contain;}" +
        ".wo-root *{box-sizing:border-box}.wo-root button{font-family:inherit}.wo-zoom-shell{position:relative;min-width:100%;min-height:100%}.wo-zoom-surface{position:relative;will-change:transform}.wo-pinching{user-select:none;-webkit-user-select:none}.wo-is-zoomed{cursor:grab}.wo-is-zoomed:active{cursor:grabbing}" +
        ".wo-top{position:relative;z-index:12;background:linear-gradient(180deg,rgba(18,12,8,.98),rgba(31,21,14,.94));border-bottom:1px solid rgba(215,173,73,.45);box-shadow:0 5px 18px rgba(0,0,0,.35);}" +
        ".wo-status{display:flex;align-items:center;justify-content:space-between;padding:8px 11px 6px;gap:8px;}" +
        ".wo-game-name{font-size:20px;letter-spacing:2px;font-weight:900;color:#f3d784;text-shadow:0 2px 5px #000;}" +
        ".wo-age-box{text-align:center;line-height:1;min-width:74px}.wo-age-box b{display:block;font-size:22px;color:#f3d784}.wo-age-box small{font-size:10px;letter-spacing:1px;opacity:.7;}" +
        ".wo-money-box{display:flex;gap:9px;align-items:center;font-size:14px;font-weight:bold}.wo-history-btn{width:30px;height:30px;border:1px solid rgba(215,173,73,.5);border-radius:50%;background:rgba(255,255,255,.07);color:#f3d784;font-size:15px;}" +
        ".wo-opponents-strip{display:flex;gap:7px;overflow-x:auto;padding:0 9px 8px;scrollbar-width:none}.wo-opponents-strip::-webkit-scrollbar{display:none;}" +
        ".wo-opponent{min-width:155px;max-width:175px;border:1px solid rgba(215,173,73,.28);border-radius:9px;background:rgba(255,255,255,.055);color:#f7edd8;padding:6px;display:flex;align-items:center;gap:6px;text-align:left;position:relative;}" +
        ".wo-opponent-ready{border-color:rgba(104,190,121,.65);}.wo-avatar{width:31px;height:31px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#8f7453,#433224);border:1px solid #d7ad49;font-weight:bold;flex:0 0 auto;}" +
        ".wo-opp-info{min-width:0;display:block;flex:1}.wo-opp-info b{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}.wo-opp-info small{font-size:9px;opacity:.72;display:block;white-space:nowrap}.wo-opp-trade{display:flex;gap:1px;margin-top:2px;overflow:hidden;height:14px}.wo-ready-dot{font-size:12px;color:#79d58b;}" +
        ".wo-message{padding:7px 12px;text-align:center;color:#f5d66f;font-size:12px;font-weight:bold;background:rgba(0,0,0,.18);border-bottom:1px solid rgba(255,255,255,.05);}" +

        ".wo-wonder{position:relative;margin:10px;border-radius:13px;min-height:218px;overflow:hidden;border:2px solid #b98e35;box-shadow:0 9px 24px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.2);background:linear-gradient(180deg,#8cc5d3 0,#d9ba7b 56%,#6e5034 100%);}" +
        ".wo-sky-glow{position:absolute;inset:0;background:radial-gradient(circle at 72% 15%,rgba(255,245,188,.8),transparent 28%),linear-gradient(180deg,rgba(255,255,255,.1),transparent 60%);}" +
        ".wo-landmark{position:absolute;left:7%;right:7%;top:38px;bottom:57px;opacity:.72;filter:drop-shadow(0 5px 5px rgba(0,0,0,.35));}" +
        ".wo-scene-pyramid .wo-landmark{clip-path:polygon(50% 4%,95% 94%,5% 94%);background:linear-gradient(120deg,#d8bd77 0 49%,#9e7842 50% 100%);}" +
        ".wo-scene-lighthouse .wo-landmark{left:39%;right:39%;clip-path:polygon(35% 0,65% 0,70% 16%,76% 16%,82% 100%,18% 100%,24% 16%,30% 16%);background:linear-gradient(90deg,#d9d2bd,#f5ead1 50%,#8f806e);}" +
        ".wo-scene-gardens .wo-landmark{clip-path:polygon(4% 86%,4% 65%,18% 65%,18% 45%,34% 45%,34% 25%,66% 25%,66% 45%,82% 45%,82% 65%,96% 65%,96% 86%);background:linear-gradient(180deg,#5f9f57,#8fb66b 50%,#bca66a 51%);}" +
        ".wo-scene-temple .wo-landmark{clip-path:polygon(8% 26%,50% 0,92% 26%,86% 26%,86% 92%,76% 92%,76% 34%,64% 34%,64% 92%,55% 92%,55% 34%,45% 34%,45% 92%,36% 92%,36% 34%,24% 34%,24% 92%,14% 92%,14% 26%);background:linear-gradient(90deg,#bca57c,#f1dfb4,#9b8057);}" +
        ".wo-scene-mausoleum .wo-landmark{clip-path:polygon(17% 90%,17% 42%,28% 42%,28% 27%,39% 27%,39% 13%,50% 0,61% 13%,61% 27%,72% 27%,72% 42%,83% 42%,83% 90%);background:linear-gradient(90deg,#b8b0a0,#ebe1cc,#8f8678);}" +
        ".wo-scene-zeus .wo-landmark{left:34%;right:34%;clip-path:polygon(40% 0,60% 0,70% 14%,68% 32%,82% 52%,72% 100%,28% 100%,18% 52%,32% 32%,30% 14%);background:linear-gradient(90deg,#9d7f42,#f0d989,#87652c);}" +
        ".wo-scene-colossus .wo-landmark{left:34%;right:34%;clip-path:polygon(37% 0,63% 0,70% 18%,62% 43%,82% 100%,60% 100%,50% 62%,40% 100%,18% 100%,38% 43%,30% 18%);background:linear-gradient(90deg,#8e6e3a,#e2bc64,#755226);}" +
        ".wo-wonder-heading{position:relative;z-index:2;display:flex;justify-content:space-between;align-items:flex-start;padding:11px 12px;color:#24170d;text-shadow:0 1px rgba(255,255,255,.3)}.wo-wonder-city{font-size:22px;font-weight:900;letter-spacing:1px;text-transform:uppercase}.wo-wonder-subtitle{font-size:11px;font-style:italic;opacity:.78}.wo-start-resource{display:flex;align-items:center;gap:4px;background:rgba(249,239,205,.8);border:1px solid rgba(64,38,17,.35);border-radius:20px;padding:4px 8px;font-size:18px;font-weight:bold}.wo-start-resource span{font-size:8px;letter-spacing:1px;}" +
        ".wo-stage-row{position:absolute;z-index:3;left:8px;right:8px;bottom:8px;display:flex;gap:7px;align-items:flex-end}.wo-stage-wrap{position:relative;flex:1;padding-top:12px}.wo-stage{position:relative;min-height:66px;border-radius:8px;border:2px solid rgba(52,31,14,.72);background:linear-gradient(180deg,rgba(247,230,180,.92),rgba(188,149,83,.94));color:#2b1a0c;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:5px;text-align:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,.32)}.wo-stage-built{background:linear-gradient(180deg,#e6c465,#a77b28);}.wo-stage-number{position:absolute;top:3px;left:5px;font-size:9px;border:1px solid rgba(0,0,0,.3);border-radius:50%;width:15px;height:15px;display:grid;place-items:center}.wo-stage-cost{font-size:13px;font-weight:bold;white-space:nowrap}.wo-stage-effect{font-size:11px;font-weight:900;margin-top:4px;line-height:1.1}.wo-stage-vp{display:inline-flex;align-items:center;justify-content:center;gap:2px}.wo-stage-vp b{font-size:17px}.wo-stage-vp span{font-size:14px}.wo-stage-check{position:absolute;right:5px;top:2px;font-size:18px;color:#1d6d2b}.wo-tucked-card{position:absolute;z-index:-1;left:11%;right:11%;top:0;height:31px;border-radius:5px 5px 0 0;background:repeating-linear-gradient(45deg,#3d2a1a,#3d2a1a 4px,#61452c 4px,#61452c 8px);border:1px solid #1c1009;color:#e8ca7d;text-align:center;font-size:8px;padding-top:3px;transform:rotate(-1deg);}" +

        ".wo-resource-panel{margin:0 10px 10px;display:grid;grid-template-columns:1.15fr 1fr 1fr;border:1px solid rgba(215,173,73,.28);border-radius:10px;overflow:hidden;background:rgba(0,0,0,.22)}.wo-resource-cell{min-width:0;border:0;border-right:1px solid rgba(215,173,73,.18);background:transparent;color:#f7edd8;padding:7px 6px;text-align:center}.wo-resource-cell:last-child{border-right:0}.wo-res-title{font-size:8px;letter-spacing:.5px;color:#d9bd78;display:block;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wo-mini-resource{display:inline-block;font-size:13px;margin:0 1px}.wo-faint{font-size:10px;opacity:.45}.wo-own-res{background:rgba(215,173,73,.08)}" +
        ".wo-city-section{padding:0 10px 12px}.wo-section-heading{display:flex;justify-content:space-between;align-items:center;margin:5px 1px 7px;font-size:11px;letter-spacing:1px;color:#d9bd78;text-transform:uppercase}.wo-section-heading span:last-child{opacity:.6}.wo-empty-city{border:1px dashed rgba(255,255,255,.18);border-radius:9px;padding:18px;text-align:center;font-size:12px;opacity:.55}.wo-city-row{margin-bottom:7px}.wo-city-row-label{font-size:9px;opacity:.65;margin:0 0 3px 2px;text-transform:uppercase}.wo-city-cards{display:flex;gap:5px;overflow-x:auto;padding-bottom:3px;scrollbar-width:none}.wo-city-cards::-webkit-scrollbar{display:none;}" +

        ".wo-hand-section{border-top:1px solid rgba(215,173,73,.3);background:linear-gradient(180deg,rgba(8,5,3,.25),rgba(8,5,3,.55));padding:10px 0 14px}.wo-hand-heading{display:flex;justify-content:space-between;padding:0 11px 8px;color:#e8cd86;font-size:11px;letter-spacing:.7px;text-transform:uppercase}.wo-hand-scroll{display:flex;gap:9px;overflow-x:auto;padding:7px 11px 13px;scroll-snap-type:x proximity;scrollbar-width:none}.wo-hand-scroll::-webkit-scrollbar{display:none;}" +
        ".wo-card{position:relative;flex:0 0 112px;width:112px;height:170px;border-radius:8px;overflow:hidden;border:2px solid rgba(20,12,7,.65);box-shadow:0 6px 12px rgba(0,0,0,.34);scroll-snap-align:center;cursor:pointer;transform-origin:center bottom;transition:transform .15s,filter .15s;background:linear-gradient(145deg,#73503a,#3d281d);color:#fff}.wo-card:active{transform:scale(.98)}.wo-card.wo-selected{transform:translateY(-8px);outline:3px solid #f4d66c;box-shadow:0 8px 20px rgba(240,199,74,.5)}.wo-card-disabled{filter:grayscale(.7);opacity:.47}.wo-card-cost{position:absolute;z-index:3;top:5px;left:5px;max-width:80px;border-radius:10px;background:rgba(249,242,218,.92);color:#21160f;padding:2px 5px;font-size:9px;font-weight:900;white-space:nowrap}.wo-card-age{position:absolute;z-index:3;right:5px;top:5px;min-width:40px;height:20px;border-radius:11px;display:flex;align-items:center;justify-content:center;gap:2px;background:rgba(24,16,10,.78);color:#f7e4aa;border:1px solid rgba(255,255,255,.42);font-weight:bold;letter-spacing:.2px;padding:0 5px;white-space:nowrap}.wo-card-age span{font-size:5px;opacity:.78}.wo-card-age b{font-size:8px}.wo-chain-in{position:absolute;z-index:3;left:5px;top:29px;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.88);color:#222;font-size:10px}.wo-card-effect{position:absolute;left:0;right:0;top:0;bottom:45px;display:flex;align-items:center;justify-content:center;text-align:center;padding:35px 7px 8px;color:#fff;text-shadow:0 2px 3px rgba(0,0,0,.75);font-size:31px;font-weight:900}.wo-card-name{position:absolute;z-index:2;bottom:17px;left:0;right:0;min-height:28px;padding:5px 3px 2px;background:rgba(13,9,6,.34);color:#fff;text-align:center;font-size:10px;font-weight:900;line-height:1.05}.wo-chain-out{position:absolute;z-index:3;left:3px;right:3px;bottom:3px;color:#f7e6b2;font-size:6.5px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wo-card-count{position:absolute;z-index:4;right:4px;bottom:3px;color:#fff;font-size:6px;opacity:.7}.wo-vp-big{font-size:46px}.wo-vp-trophy{font-size:23px;margin-left:2px}.wo-shield-row{font-size:24px;letter-spacing:-8px;padding-right:7px}.wo-science-big{font-size:46px}.wo-coin-big{font-size:30px}.wo-trade-big{font-size:27px;line-height:1}.wo-trade-big small{font-size:12px}.wo-formula-big{font-size:20px;line-height:1.35}.wo-card.wo-type-raw{background:linear-gradient(145deg,#7a4829,#4b2817)}.wo-card.wo-type-raw .wo-card-effect{background:transparent}.wo-card.wo-type-manufactured{background:linear-gradient(145deg,#a4a5a7,#696a6d)}.wo-card.wo-type-manufactured .wo-card-effect{background:transparent}.wo-card.wo-type-civilian{background:linear-gradient(145deg,#2e7db1,#164d79)}.wo-card.wo-type-civilian .wo-card-effect{background:transparent}.wo-card.wo-type-commercial{background:linear-gradient(145deg,#e8b52f,#b97805)}.wo-card.wo-type-commercial .wo-card-effect{background:transparent}.wo-card.wo-type-military{background:linear-gradient(145deg,#cf3830,#7e1818)}.wo-card.wo-type-military .wo-card-effect{background:transparent}.wo-card.wo-type-science{background:linear-gradient(145deg,#3a9964,#1c653d)}.wo-card.wo-type-science .wo-card-effect{background:transparent}.wo-card.wo-type-guild{background:linear-gradient(145deg,#8d4cad,#4e216a)}.wo-card.wo-type-guild .wo-card-effect{background:transparent}" +
        ".wo-card-compact{flex-basis:67px;width:67px;height:92px;border-width:1px;border-radius:5px;box-shadow:0 3px 7px rgba(0,0,0,.3)}.wo-card-compact .wo-card-cost{top:2px;left:2px;font-size:6px;padding:1px 3px;max-width:48px}.wo-card-compact .wo-card-age{min-width:27px;height:12px;top:2px;right:2px;padding:0 2px;gap:1px}.wo-card-compact .wo-card-age span{font-size:3px}.wo-card-compact .wo-card-age b{font-size:4.8px}.wo-card-compact .wo-chain-in{display:none}.wo-card-compact .wo-card-effect{bottom:28px;padding:20px 3px 2px;font-size:20px}.wo-card-compact .wo-vp-big{font-size:26px}.wo-card-compact .wo-vp-trophy{font-size:12px}.wo-card-compact .wo-science-big{font-size:25px}.wo-card-compact .wo-shield-row{font-size:13px;letter-spacing:-5px}.wo-card-compact .wo-coin-big{font-size:16px}.wo-card-compact .wo-formula-big,.wo-card-compact .wo-trade-big{font-size:11px}.wo-card-compact .wo-card-name{bottom:8px;min-height:20px;font-size:6.5px;padding:3px 2px 1px}.wo-card-compact .wo-chain-out{font-size:4px;bottom:1px}.wo-card-compact .wo-card-count{display:none}" +

        ".wo-selected-summary{margin:0 11px 6px;display:flex;flex-direction:column;align-items:center;text-align:center}.wo-selected-summary b{font-size:14px;color:#f2d270}.wo-selected-summary span{font-size:10px;opacity:.72;margin-top:2px}.wo-action-row,.wo-modal-actions{display:flex;gap:7px;padding:0 11px}.wo-action{flex:1;min-height:44px;border:0;border-radius:8px;font-weight:900;font-size:12px;letter-spacing:.5px;color:#fff;box-shadow:inset 0 -3px rgba(0,0,0,.2)}.wo-action:disabled{opacity:.27;filter:grayscale(1)}.wo-build{background:linear-gradient(#3c9a60,#246840)}.wo-stage-action{background:linear-gradient(#c79835,#806019)}.wo-sell{background:linear-gradient(#a84a43,#6d2a26)}.wo-olympia-free{display:block;width:calc(100% - 22px);margin:7px 11px 0;border:1px solid #7dd89b;border-radius:8px;background:rgba(43,137,79,.35);color:#dff9e8;padding:9px;font-weight:bold}.wo-wonder-payment{text-align:center;font-size:9px;opacity:.65;padding-top:5px}.wo-action-hint{margin:3px 11px 0;border:1px dashed rgba(255,255,255,.22);border-radius:8px;padding:11px;text-align:center;font-size:11px;color:#e2c77e}.wo-waiting-panel{margin:5px 11px 8px;border:1px solid rgba(215,173,73,.28);border-radius:10px;padding:18px;text-align:center;display:flex;flex-direction:column;gap:4px;color:#e8cc81}.wo-waiting-panel span{font-size:11px;opacity:.7}.wo-hourglass{font-size:24px}" +

        ".wo-wonder-tappable{cursor:zoom-in}.wo-board-zoom-hint{position:absolute;z-index:5;right:9px;bottom:84px;background:rgba(30,19,10,.7);border:1px solid rgba(255,255,255,.35);border-radius:12px;padding:3px 7px;color:#fff4cc;font-size:7px;font-weight:900;letter-spacing:.5px;pointer-events:none}.wo-board-modal-overlay{align-items:center;padding:6px;overflow:hidden}.wo-board-modal{box-sizing:border-box;width:100%;max-width:510px;max-height:calc(100% - 12px);overflow:hidden;padding:10px}.wo-zoomed-board-wrap{padding-top:22px}.wo-board-modal .wo-wonder{margin:0;min-height:410px;border-width:3px}.wo-board-modal .wo-wonder-city{font-size:31px}.wo-board-modal .wo-wonder-subtitle{font-size:14px}.wo-board-modal .wo-start-resource{font-size:25px;padding:7px 12px}.wo-board-modal .wo-start-resource span{font-size:10px}.wo-board-modal .wo-wonder-heading{padding:16px}.wo-board-modal .wo-stage-row{left:12px;right:12px;bottom:14px;gap:10px}.wo-board-modal .wo-stage{min-height:112px;padding:10px 6px}.wo-board-modal .wo-stage-number{width:22px;height:22px;font-size:12px}.wo-board-modal .wo-stage-cost{font-size:19px}.wo-board-modal .wo-stage-effect{font-size:15px;margin-top:8px}.wo-board-modal .wo-stage-vp b{font-size:28px}.wo-board-modal .wo-stage-vp span{font-size:23px}.wo-board-modal .wo-stage-check{font-size:25px}.wo-board-modal .wo-tucked-card{height:45px;font-size:10px;padding-top:5px}.wo-board-modal .wo-modal-x{z-index:20}.wo-modal-overlay{position:absolute;z-index:80;inset:0;min-height:100%;background:rgba(7,4,2,.82);backdrop-filter:blur(3px);display:flex;align-items:flex-start;justify-content:center;padding:18px 12px 40px;overflow:auto}.wo-modal-box{position:relative;width:100%;max-width:440px;border-radius:14px;background:linear-gradient(180deg,#332319,#1d140f);border:1px solid #c9a14a;color:#f7edd8;padding:16px;box-shadow:0 18px 50px rgba(0,0,0,.65)}.wo-modal-x{position:absolute;z-index:5;right:8px;top:7px;width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.24);background:rgba(0,0,0,.5);color:#fff;font-size:25px;line-height:28px}.wo-modal-title{text-align:center;color:#f0cf75;font-weight:900;font-size:18px;padding:2px 38px 12px;text-transform:uppercase;letter-spacing:.7px}.wo-large-card-wrap{display:flex;justify-content:center;padding:4px 0 13px}.wo-large-card-wrap .wo-card{width:190px;height:286px;flex-basis:190px;border-radius:12px}.wo-large-card-wrap .wo-card-cost{font-size:14px;padding:4px 8px;top:8px;left:8px;max-width:145px}.wo-large-card-wrap .wo-card-age{min-width:55px;height:27px;top:8px;right:8px;padding:0 7px;gap:3px}.wo-large-card-wrap .wo-card-age span{font-size:7px}.wo-large-card-wrap .wo-card-age b{font-size:11px}.wo-large-card-wrap .wo-chain-in{top:48px;left:8px;width:28px;height:28px;font-size:15px}.wo-large-card-wrap .wo-card-effect{bottom:72px;padding-top:55px;font-size:50px}.wo-large-card-wrap .wo-vp-big{font-size:78px}.wo-large-card-wrap .wo-vp-trophy{font-size:35px}.wo-large-card-wrap .wo-science-big{font-size:78px}.wo-large-card-wrap .wo-shield-row{font-size:38px}.wo-large-card-wrap .wo-card-name{bottom:28px;min-height:46px;font-size:18px;padding:9px 6px 4px}.wo-large-card-wrap .wo-chain-out{bottom:7px;font-size:10px;left:6px;right:6px}.wo-large-card-wrap .wo-card-count{font-size:9px;bottom:7px}.wo-card-details{border-top:1px solid rgba(215,173,73,.23);padding-top:11px}.wo-card-details p{font-size:13px;line-height:1.4;margin:10px 0}.wo-detail-grid{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:5px 8px;align-items:center;font-size:11px}.wo-detail-grid span{opacity:.55;font-size:9px}.wo-chain-detail{border-radius:7px;background:rgba(255,255,255,.06);padding:7px;margin:5px 0;font-size:10px}.wo-chain-free{color:#8de0a1}.wo-free-banner{background:#2b7b49;color:#fff;border-radius:7px;padding:8px;text-align:center;font-weight:bold;font-size:11px}.wo-payment-preview{text-align:center;color:#ecd27f;font-size:11px;margin:8px 0}.wo-modal-actions{padding:8px 0 0}" +
        ".wo-opponent-summary{display:flex;justify-content:center;gap:16px;font-weight:bold;margin-bottom:8px}.wo-opponent-modal .wo-wonder{margin:8px 0}.wo-modal-section-title{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#d5b763;margin:14px 0 6px}.wo-modal-resources{background:rgba(255,255,255,.05);border-radius:8px;padding:10px;text-align:center}.wo-modal-city .wo-city-row{margin-bottom:9px}.wo-payment-intro{font-size:12px;line-height:1.4;opacity:.8;margin-bottom:10px;text-align:center}.wo-payment-options{display:flex;flex-direction:column;gap:8px}.wo-payment-option{border:1px solid rgba(215,173,73,.35);border-radius:9px;background:rgba(255,255,255,.06);color:#fff;padding:11px;text-align:left}.wo-payment-option b{display:block;color:#efd078;font-size:14px}.wo-payment-option span{display:block;font-size:10px;opacity:.72;margin-top:3px}.wo-discard-grid{display:flex;flex-wrap:wrap;gap:9px;justify-content:center}.wo-discard-choice{cursor:pointer}.wo-history-list{display:flex;flex-direction:column;gap:7px}.wo-history-list div{font-size:11px;line-height:1.35;padding:8px;background:rgba(255,255,255,.045);border-radius:7px}" +

        ".wo-end-screen{padding:24px 12px 40px;text-align:center}.wo-end-title{font-size:28px;color:#f2d475;font-weight:900;letter-spacing:2px}.wo-winner{margin:10px 0 18px;font-size:16px}.wo-score-list{display:flex;flex-direction:column;gap:9px}.wo-score-card{display:grid;grid-template-columns:34px 1fr 58px;grid-template-rows:auto auto;align-items:center;text-align:left;background:rgba(255,255,255,.07);border:1px solid rgba(215,173,73,.25);border-radius:10px;padding:9px}.wo-score-card.wo-first{border-color:#efd15d;background:rgba(215,173,73,.15)}.wo-rank{grid-row:1/3;font-size:22px;color:#e8c65c;text-align:center}.wo-score-name b{display:block}.wo-score-name small{opacity:.65}.wo-score-total{grid-row:1/3;grid-column:3;font-size:28px;font-weight:900;color:#f2d475;text-align:right}.wo-score-breakdown{font-size:9px;opacity:.68;margin-top:4px}" +
        ".wo-card-type-label,.wo-card-rule-text,.wo-card-chain-panel{display:none}" +
        ".wo-card-modal-overlay{align-items:center;padding:8px;overflow:hidden}.wo-card-modal{box-sizing:border-box;width:100%;max-width:360px;max-height:calc(100% - 12px);overflow:hidden;padding:10px 10px 12px}.wo-card-modal .wo-modal-x{right:5px;top:5px;width:31px;height:31px;font-size:23px;line-height:25px;background:rgba(20,12,7,.82)}.wo-card-modal-content{display:flex;flex-direction:column;align-items:stretch}.wo-card-modal .wo-large-card-wrap{padding:0 0 8px}.wo-card-modal .wo-large-card-wrap .wo-card{width:184px;height:270px;flex-basis:184px;border-radius:11px}.wo-card-modal .wo-large-card-wrap .wo-card-cost{font-size:13px;padding:4px 8px;top:8px;left:8px;max-width:138px}.wo-card-modal .wo-large-card-wrap .wo-card-age{min-width:54px;height:25px;top:8px;right:8px;padding:0 6px;gap:3px}.wo-card-modal .wo-large-card-wrap .wo-card-age span{font-size:6.5px}.wo-card-modal .wo-large-card-wrap .wo-card-age b{font-size:10.5px}.wo-card-modal .wo-large-card-wrap .wo-chain-in,.wo-card-modal .wo-large-card-wrap .wo-chain-out{display:none}.wo-card-modal .wo-large-card-wrap .wo-card-type-label{display:block;position:absolute;z-index:4;top:48px;left:18px;right:18px;text-align:center;font-size:12px;line-height:1.1;font-weight:900;color:#fff;background:rgba(18,12,8,.34);border:1px solid rgba(255,255,255,.26);border-radius:12px;padding:4px 6px;text-shadow:0 1px 2px rgba(0,0,0,.75)}.wo-card-modal .wo-large-card-wrap .wo-card-effect{bottom:118px;padding:72px 8px 38px;font-size:43px}.wo-card-modal .wo-large-card-wrap .wo-vp-big{font-size:68px}.wo-card-modal .wo-large-card-wrap .wo-vp-trophy{font-size:31px}.wo-card-modal .wo-large-card-wrap .wo-science-big{font-size:66px}.wo-card-modal .wo-large-card-wrap .wo-shield-row{font-size:34px}.wo-card-modal .wo-large-card-wrap .wo-coin-big{font-size:38px}.wo-card-modal .wo-large-card-wrap .wo-trade-big{font-size:31px}.wo-card-modal .wo-large-card-wrap .wo-formula-big{font-size:22px}.wo-card-modal .wo-large-card-wrap .wo-card-rule-text{display:block;position:absolute;z-index:4;left:10px;right:10px;bottom:82px;max-height:34px;overflow:hidden;text-align:center;font-size:9.5px;line-height:1.12;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.8)}.wo-card-modal .wo-large-card-wrap .wo-card-chain-panel{display:flex;position:absolute;z-index:5;left:9px;right:9px;bottom:57px;min-height:22px;flex-direction:column;justify-content:center;gap:1px;text-align:center;background:rgba(22,14,9,.38);border-radius:7px;padding:3px 5px;color:#ffe8a0;font-size:8.5px;line-height:1.08;font-weight:900}.wo-card-modal .wo-large-card-wrap .wo-card-chain-from{color:#a8efb9}.wo-card-modal .wo-large-card-wrap .wo-card-name{bottom:17px;min-height:38px;font-size:17px;padding:8px 5px 4px}.wo-card-modal .wo-large-card-wrap .wo-card-count{font-size:8px;bottom:4px;right:5px}.wo-card-modal .wo-modal-actions{padding:0;gap:7px}.wo-card-modal .wo-action{min-height:42px;font-size:12px}.wo-card-modal .wo-olympia-free{width:100%;margin:7px 0 0;padding:8px}.wo-card-modal .wo-card-details,.wo-card-modal .wo-detail-grid,.wo-card-modal .wo-chain-detail,.wo-card-modal .wo-free-banner,.wo-card-modal .wo-payment-preview{display:none}" +
        "@media (max-height:700px){.wo-board-modal .wo-wonder{min-height:330px}.wo-board-modal .wo-stage{min-height:88px}.wo-board-modal .wo-wonder-city{font-size:25px}.wo-board-modal .wo-start-resource{font-size:20px}.wo-board-modal .wo-stage-cost{font-size:16px}.wo-board-modal .wo-stage-effect{font-size:12px}}@media (max-width:360px){.wo-card{flex-basis:104px;width:104px;height:158px}.wo-resource-panel{grid-template-columns:1fr 1fr}.wo-own-res{grid-column:1/3}.wo-wonder{min-height:210px}.wo-stage-effect{font-size:9px}.wo-opponent{min-width:145px}.wo-game-name{font-size:17px}}" +
    "</style>";
}

/* --------------------------------------------------------------------------
   MAIN RENDER
---------------------------------------------------------------------------- */
function renderSevenWonders() {
    const el = canvas();
    const st = window.sevenWondersState;
    if (!el || !st) return;

    const me = myPlayer();
    if (!me) {
        el.innerHTML = swStyles() + "<div class='wo-root'><div style='padding:30px;text-align:center'>You are not seated at this Wonders table.</div></div>";
        return;
    }

    if (localUi.submittedRoundKey && localUi.submittedRoundKey !== roundKey(st)) {
        localUi.submittedRoundKey = null;
        localUi.selectedCardUid = null;
    }

    if (localUi.selectedCardUid && !me.hand.some(function (c) { return c.uid === localUi.selectedCardUid; })) {
        localUi.selectedCardUid = null;
    }

    if (st.phase === "ended") {
        el.innerHTML = swStyles() +
            "<div class='wo-root'>" +
                "<div class='wo-zoom-shell'><div class='wo-zoom-surface'>" + scoreBoardHtml(st) + "</div></div>" +
                activeModalHtml(st) +
            "</div>";
        installWondersPinchZoom();
        return;
    }

    el.innerHTML = swStyles() +
        "<div class='wo-root'>" +
            "<div class='wo-zoom-shell'><div class='wo-zoom-surface'>" +
            "<header class='wo-top'>" +
                "<div class='wo-status'>" +
                    "<div class='wo-game-name'>WONDERS</div>" +
                    "<div class='wo-age-box'><small>AGE</small><b>" + romanAge(st.age) + "</b><small>ROUND " + st.round + "</small></div>" +
                    "<div class='wo-money-box'><span>\uD83E\uDE99" + me.coins + "</span><span>\uD83D\uDEE1\uFE0F" + shieldCount(me) + "</span><button class='wo-history-btn' onclick='window.wondersOpenHistory()'>\u2630</button></div>" +
                "</div>" +
                "<div class='wo-opponents-strip'>" + opponentsHtml(st, me) + "</div>" +
                (st.message ? "<div class='wo-message'>" + escapeHtml(st.message) + "</div>" : "") +
            "</header>" +

            wonderBoardHtml(me, true) +
            resourceAndTradeHtml(st, me) +

            "<section class='wo-city-section'>" +
                "<div class='wo-section-heading'><span>Your city</span><span>Tap any card to enlarge</span></div>" +
                tableauHtml(me) +
            "</section>" +

            "<section class='wo-hand-section'>" +
                "<div class='wo-hand-heading'><span>Your hand</span><span>" + me.hand.length + " cards</span></div>" +
                handHtml(st, me) +
                actionBarHtml(st, me) +
            "</section>" +
            "</div></div>" +
            activeModalHtml(st) +
        "</div>";

    installWondersPinchZoom();
}

/* --------------------------------------------------------------------------
   CHASER ENTRY POINTS AND INCOMING STATE
---------------------------------------------------------------------------- */
window.initSevenWondersGame = function () {
    window.chaserGame = window.chaserGame || {};
    window.chaserGame.activeGame = "Wonders";

    openStage();
    setHeader();
    registerNetworkHandlers();

    if (isHost()) {
        if (!window.sevenWondersState || window.sevenWondersState.version !== 4 || window.sevenWondersState.phase === "ended") {
            const humanCount = window.chaserGame.players ? window.chaserGame.players.length : 1;
            const requested = window.chaserGame.expectedPlayers || humanCount;
            const targetCount = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, requested));
            window.sevenWondersState = createState(targetCount);
            dealAge(window.sevenWondersState, 1);
            window.sevenWondersState.message = "Age I begins. Tap a card to inspect it.";
            syncSevenWonders();
        }
    } else if (!window.sevenWondersState) {
        requestState();
    }

    renderSevenWonders();
};

window.handleIncomingSevenWondersSync = function (payload) {
    if (!payload || !payload.state || !roomPayloadMatches(payload)) return;

    const incoming = payload.state;
    if (!incoming.players || !incoming.players.length) return;

    window.sevenWondersState = incoming;
    if (window.chaserGame) window.chaserGame.activeGame = "Wonders";

    const me = myPlayer();
    if (me && me.pendingChoice) localUi.submittedRoundKey = roundKey(incoming);
    if (incoming.phase !== "special" || incoming.specialPlayerId !== getMyId()) {
        if (localUi.modal === "special") localUi.modal = null;
    }

    renderSevenWonders();
};

window.startSevenWondersFromLobby = window.initSevenWondersGame;
window.startSevenWondersGame = window.initSevenWondersGame;
window.renderSevenWonders = renderSevenWonders;

/* Small debug surface for syntax/deck/simulation checks. */
window.__wondersDebug = {
    AGE_CARDS: AGE_CARDS,
    GUILD_CARDS: GUILD_CARDS,
    WONDER_BOARDS: WONDER_BOARDS,
    buildAgeDeck: buildAgeDeck,
    createState: createState,
    dealAge: dealAge,
    productionVectors: productionVectors,
    findPaymentPlans: findPaymentPlans,
    scoreScienceWithWilds: scoreScienceWithWilds,
    computerChoose: computerChoose,
    resolveRound: resolveRound,
    shieldCount: shieldCount,
    scienceCounts: scienceCounts,
    finishGame: finishGame,
    render: renderSevenWonders
};

})();
