/* CHASER SCRABBLE - SEPARATE GAME FILE
Bigger board + stable pinch zoom + pan + multi-tile exchange + one-tile undo + scrollable controls + online word check
+ Computer player (medium difficulty)
*/
(function () {
"use strict";

const LETTERS = "EEEEEEEEEEEEAAAAAAAAAIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ".split("");

const VALUES = {
A:1, B:3, C:3, D:2, E:1, F:4, G:2, H:4, I:1, J:8, K:5, L:1, M:3,
N:1, O:1, P:3, Q:10, R:1, S:1, T:1, U:1, V:4, W:4, X:8, Y:4, Z:10
};

const EXTRA_SCRABBLE_STYLE_WORDS = new Set([
"QI", "ZA", "JO", "OX", "AX", "EX", "XI", "XU", "KA", "KI", "KO", "KY",
"AA", "AB", "AD", "AE", "AG", "AH", "AI", "AL", "AM", "AN", "AR", "AS", "AT", "AW", "AY",
"BA", "BE", "BI", "BO", "BY", "DA", "DE", "DO", "ED", "EF", "EH", "EL", "EM", "EN", "ER", "ES", "ET",
"FA", "FE", "GI", "GO", "HA", "HE", "HI", "HM", "HO", "ID", "IF", "IN", "IS", "IT",
"LA", "LI", "LO", "MA", "ME", "MI", "MM", "MO", "MU", "MY", "NA", "NE", "NO", "NU",
"OD", "OE", "OF", "OH", "OI", "OM", "ON", "OP", "OR", "OS", "OW", "OY",
"PA", "PE", "PI", "PO", "RE", "SH", "SI", "SO", "TA", "TE", "TI", "TO", "UH", "UM", "UN", "UP", "US", "UT",
"WE", "WO", "YE", "YO"
]);

// Curated word bank the AI draws candidate plays from. Kept short/medium and
// common-ish on purpose -- this is what keeps the bot from playing like a
// dictionary-perfect opponent. Every word it actually plays still gets run
// through isValidWordOnline() just like a human move, so it can never place
// something fake.
const AI_WORD_BANK = [
"AT","BE","DO","GO","HE","IF","IN","IS","IT","ME","MY","NO","OF","ON","OR","SO","TO","UP","US","WE",
"AND","ARE","BUT","CAN","DAY","EAT","FOR","GET","HAD","HAS","HER","HIM","HIS","HOW","ITS","JOB","JOY",
"LET","LOT","MAN","MAP","MEN","NEW","NOT","NOW","OLD","ONE","OUR","OUT","OWN","PUT","RAN","RUN","SAY",
"SEE","SHE","SUN","TEA","TEN","THE","TOP","TRY","TWO","USE","WAY","WHO","WHY","WIN","YES","YOU","ZOO",
"ABLE","AREA","BAKE","BALL","BAND","BANK","BASE","BEAR","BEAT","BEEN","BEST","BIRD","BLUE","BOAT",
"BODY","BOLD","BOND","BONE","BOOK","BORN","BOTH","BURN","BUSY","CAKE","CALL","CALM","CAME","CAMP",
"CARD","CARE","CASE","CAST","CITY","CLUB","COAL","CODE","COLD","COME","COOK","COOL","COPE","COPY",
"CORE","COST","CROP","DARK","DATA","DATE","DEAL","DEAR","DEEP","DESK","DIET","DIRT","DISH","DOOR",
"DOSE","DOWN","DRAW","DROP","DRUM","DUTY","EACH","EARN","EASE","EAST","EASY","EDGE","EVEN","EVER",
"FACE","FACT","FAIR","FALL","FARM","FAST","FATE","FEAR","FEED","FEEL","FELT","FILE","FILL","FILM",
"FIND","FINE","FIRE","FIRM","FISH","FIVE","FLAG","FLAT","FLOW","FOOD","FOOT","FORM","FORT","FOUR",
"FREE","FROM","FUEL","FULL","FUND","GAIN","GAME","GATE","GAVE","GEAR","GIFT","GIRL","GIVE","GLAD",
"GOAL","GOAT","GOLD","GOLF","GONE","GOOD","GRAY","GREW","GREY","GRID","GRIP","GROW","HALF","HALL",
"HAND","HARD","HARM","HATE","HAVE","HEAD","HEAR","HEAT","HELD","HELP","HERE","HERO","HIDE","HIGH",
"HILL","HOLD","HOLE","HOLY","HOME","HOPE","HORN","HOST","HOUR","HUGE","HUNT","HURT","IDEA","INTO",
"IRON","ITEM","JOIN","JUMP","JURY","JUST","KEEN","KEEP","KEPT","KICK","KIND","KING","KNEE","KNEW",
"KNOW","LACK","LAKE","LAMP","LAND","LANE","LAST","LATE","LEAD","LEAF","LEAN","LEFT","LEND","LESS",
"LIFE","LIFT","LIKE","LINE","LINK","LIST","LIVE","LOAD","LOAN","LOCK","LOGO","LONG","LOOK","LOSE",
"LOSS","LOST","LOTS","LOUD","LOVE","LUCK","LUNG","MADE","MAIL","MAIN","MAKE","MALE","MANY","MARK",
"MASK","MATH","MEAL","MEAN","MEAT","MEET","MELT","MENU","MERE","MIND","MINE","MISS","MODE","MOOD",
"MOON","MORE","MOST","MOVE","MUCH","MUST","NAME","NAVY","NEAR","NEAT","NECK","NEED","NEWS","NEXT",
"NICE","NINE","NONE","NOSE","NOTE","ONCE","ONLY","ONTO","OPEN","ORAL","OVER","PACE","PACK","PAGE",
"PAID","PAIN","PAIR","PALE","PARK","PART","PASS","PAST","PATH","PEAK","PICK","PILE","PINK","PIPE",
"PLAN","PLAY","PLOT","PLUG","PLUS","POEM","POET","POLE","POLL","POND","POOL","POOR","PORT","POSE",
"POST","PULL","PURE","PUSH","RACE","RAIL","RAIN","RANK","RARE","RATE","READ","REAL","REST","RICE",
"RICH","RIDE","RING","RISE","RISK","ROAD","ROCK","ROLE","ROLL","ROOF","ROOM","ROOT","ROPE","ROSE",
"RULE","RUSH","SAFE","SAID","SAIL","SALE","SALT","SAME","SAND","SAVE","SEAT","SEED","SEEK","SEEM",
"SEEN","SELF","SELL","SEND","SENT","SHIP","SHOE","SHOP","SHOT","SHOW","SHUT","SICK","SIDE","SIGN",
"SILK","SING","SITE","SIZE","SKIN","SKIP","SKY","SLIP","SLOW","SNOW","SOAP","SOFT","SOIL","SOLD",
"SOLE","SOME","SONG","SOON","SORT","SOUL","SOUP","SPIN","SPOT","STAR","STAY","STEP","STOP","SUCH",
"SUIT","SURE","SWIM","TAKE","TALE","TALK","TALL","TANK","TAPE","TASK","TEAM","TELL","TEND","TENT",
"TERM","TEST","TEXT","THAN","THAT","THEM","THEN","THIN","THIS","TIDE","TIME","TINY","TIRE","TOLD",
"TONE","TOOK","TOOL","TOUR","TOWN","TREE","TRIM","TRIP","TRUE","TUNE","TURN","TWIN","TYPE","UNIT",
"UPON","USED","USER","VARY","VAST","VERY","VIEW","VOTE","WAGE","WAIT","WAKE","WALK","WALL","WANT",
"WARM","WASH","WAVE","WEAK","WEAR","WEEK","WELL","WENT","WERE","WEST","WHAT","WHEN","WIDE","WIFE",
"WILD","WILL","WIND","WINE","WING","WIRE","WISE","WISH","WITH","WORD","WORE","WORK","YARD","YEAR",
"ZERO","ZONE","ABOUT","ABOVE","ACTOR","ADULT","AFTER","AGAIN","AGENT","AGREE","AHEAD","ALARM","ALBUM",
"ALERT","ALIKE","ALIVE","ALLOW","ALONE","ALONG","ALTER","AMONG","ANGER","ANGLE","ANGRY","APART",
"APPLE","APPLY","ARGUE","ARISE","ARMOR","ARRAY","ASIDE","ASSET","AVOID","AWAKE","AWARD","AWARE",
"BADLY","BAKER","BASIC","BEACH","BEGAN","BEGIN","BEING","BELOW","BENCH","BIRTH","BLACK","BLAME",
"BLANK","BLAST","BLIND","BLOCK","BLOOD","BOARD","BOAST","BOOST","BOOTH","BOUND","BRAIN","BRAND",
"BRAVE","BREAD","BREAK","BREED","BRIEF","BRING","BROAD","BROKE","BROWN","BUILD","BUILT","BUNCH",
"BURST","CABIN","CABLE","CANDY","CARGO","CARRY","CATCH","CAUSE","CHAIN","CHAIR","CHALK","CHAOS",
"CHARM","CHART","CHASE","CHEAP","CHECK","CHEEK","CHEST","CHIEF","CHILD","CHOSE","CIVIL","CLAIM",
"CLASS","CLEAN","CLEAR","CLICK","CLIFF","CLIMB","CLOCK","CLOSE","CLOTH","CLOUD","COACH","COAST",
"COLOR","COUCH","COULD","COUNT","COURT","COVER","CRACK","CRAFT","CRASH","CRAZY","CREAM","CRIME",
"CROSS","CROWD","CROWN","CRUDE","CURVE","CYCLE","DAILY","DANCE","DEATH","DELAY","DEPTH","DOING",
"DOUBT","DOZEN","DRAFT","DRAMA","DRANK","DRAWN","DREAM","DRESS","DRIED","DRIFT","DRILL","DRINK",
"DRIVE","DROVE","DRUNK","DYING","EAGER","EARLY","EARTH","EIGHT","ELITE","EMPTY","ENJOY","ENTER",
"ENTRY","EQUAL","ERROR","EVENT","EVERY","EXACT","EXIST","EXTRA","FAITH","FALSE","FANCY","FATAL",
"FAULT","FAVOR","FENCE","FIBER","FIELD","FIFTH","FIFTY","FIGHT","FINAL","FIRST","FIXED","FLAME",
"FLASH","FLEET","FLESH","FLOAT","FLOOD","FLOOR","FLUID","FOCUS","FORCE","FORTH","FORUM","FOUND",
"FRAME","FRANK","FRESH","FRONT","FROST","FRUIT","FULLY","FUNNY","GIANT","GIVEN","GLASS","GLOBE",
"GLORY","GOING","GRACE","GRADE","GRAIN","GRAND","GRANT","GRASS","GRAVE","GREAT","GREEN","GREET",
"GRIEF","GROSS","GROUP","GROWN","GUARD","GUESS","GUEST","GUIDE","HABIT","HAPPY","HARSH","HEART",
"HEAVY","HENCE","HORSE","HOTEL","HOUSE","HUMAN","HUMOR","HURRY","IDEAL","IMAGE","IMPLY","INNER",
"INPUT","ISSUE","JOINT","JUDGE","JUICE","KNOWN","LABEL","LARGE","LASER","LATER","LAUGH","LAYER",
"LEARN","LEAST","LEAVE","LEGAL","LEMON","LEVEL","LIGHT","LIMIT","LOCAL","LOGIC","LOOSE","LOWER",
"LOYAL","LUCKY","LUNCH","MAGIC","MAJOR","MAKER","MARCH","MATCH","MAYOR","MEDIA","METAL","MIGHT",
"MINOR","MINUS","MIXED","MODEL","MONEY","MONTH","MORAL","MOTOR","MOUNT","MOUSE","MOUTH","MOVIE",
"MUSIC","NEEDS","NERVE","NEVER","NIGHT","NOISE","NORTH","NOTED","NOVEL","NURSE","OCCUR","OCEAN",
"OFFER","OFTEN","ORDER","OTHER","OUGHT","OUTER","OWNER","PAINT","PANEL","PAPER","PARTY","PEACE",
"PHASE","PHOTO","PIANO","PIECE","PILOT","PITCH","PLACE","PLAIN","PLANE","PLANT","PLATE","POINT",
"POUND","POWER","PRESS","PRICE","PRIDE","PRIME","PRINT","PRIOR","PRIZE","PROOF","PROUD","PROVE",
"QUEEN","QUERY","QUICK","QUIET","QUITE","RADIO","RAISE","RANGE","RAPID","RATIO","REACH","REACT",
"READY","REFER","RELAX","REPLY","RIDER","RIDGE","RIGHT","RIVAL","RIVER","ROBOT","ROUGH","ROUND",
"ROUTE","ROYAL","RURAL","SALAD","SAUCE","SCALE","SCARE","SCENE","SCOPE","SCORE","SENSE","SERVE",
"SEVEN","SHADE","SHAKE","SHALL","SHAPE","SHARE","SHARP","SHEET","SHELF","SHELL","SHIFT","SHINE",
"SHIRT","SHOCK","SHOOT","SHORT","SHOWN","SIGHT","SINCE","SIXTH","SIXTY","SKILL","SLEEP","SLICE",
"SLIDE","SMALL","SMART","SMELL","SMILE","SMOKE","SOLAR","SOLID","SOLVE","SORRY","SOUND","SOUTH",
"SPACE","SPARE","SPEAK","SPEED","SPEND","SPENT","SPLIT","SPOKE","SPORT","STAFF","STAGE","STAIR",
"STAKE","STAND","START","STATE","STEAM","STEEL","STEEP","STICK","STIFF","STILL","STOCK","STONE",
"STORE","STORM","STORY","STUDY","STUFF","STYLE","SUGAR","SUPER","SWEET","TABLE","TAKEN","TASTE",
"TEACH","THANK","THEME","THERE","THESE","THICK","THING","THINK","THIRD","THOSE","THREE","THREW",
"THROW","TIGHT","TIRED","TITLE","TODAY","TOTAL","TOUCH","TOUGH","TOWER","TRACK","TRADE","TRAIL",
"TRAIN","TREAT","TREND","TRIAL","TRIBE","TRICK","TRIED","TRUCK","TRULY","TRUST","TRUTH","TWICE",
"UNDER","UNION","UNITY","UNTIL","UPPER","UPSET","URBAN","USAGE","USUAL","VALID","VALUE","VIDEO",
"VISIT","VITAL","VOICE","WASTE","WATCH","WATER","WHEAT","WHEEL","WHERE","WHICH","WHILE","WHITE",
"WHOLE","WHOSE","WOMAN","WORLD","WORRY","WORSE","WORST","WORTH","WOULD","WOUND","WRITE","WRONG",
"YIELD","YOUNG","YOUTH"
];

const WORD_CACHE = {};

const boardView = {
scale: 1,
x: 0,
y: 0,
base: 0
};

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
const input = document.getElementById("username");
return (input && input.value.trim()) || localStorage.getItem("rider_saved_name") || "Player";
}

function canvas() {
return document.getElementById("gameCanvasContainer");
}

function syncScrabble() {
if (typeof channel !== "undefined" && channel && window.scrabbleState) {
channel.send({
type: "broadcast",
event: "scrabble-sync-state",
payload: {
state: window.scrabbleState,
roomGameId: window.chaserGame && window.chaserGame.activeGameId ? window.chaserGame.activeGameId : null
}
});
}
}

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

function isVowelTile(letter) {
return VOWELS.has(letter);
}

function shuffle(a) {
for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = a[i];
    a[i] = a[j];
    a[j] = temp;
}

return a;
}

function makeBoard() {
return Array.from({ length: 15 }, function () {
return Array(15).fill(null);
});
}

function rackVowelCount(rack) {
return rack.filter(function (letter) {
    return isVowelTile(letter);
}).length;
}

function takeTileFromBag(s, wantVowel) {
if (!s.bag.length) return null;

if (wantVowel === null || wantVowel === undefined) {
    return s.bag.pop();
}

for (let i = s.bag.length - 1; i >= 0; i--) {
    if (isVowelTile(s.bag[i]) === wantVowel) {
        return s.bag.splice(i, 1)[0];
    }
}

return s.bag.pop();
}

function drawTiles(s, player) {
while (player.rack.length < 7 && s.bag.length) {
    const vowels = rackVowelCount(player.rack);
    const rackSize = player.rack.length;
    const remainingSlots = 7 - rackSize;
    const roomAfterThisDraw = remainingSlots - 1;

    let wantVowel = null;

    if (vowels >= 4) {
        wantVowel = false;
    } else if ((2 - vowels) > roomAfterThisDraw) {
        wantVowel = true;
    } else if (vowels === 0 && rackSize >= 3) {
        wantVowel = true;
    } else if (vowels <= 1 && Math.random() < 0.65) {
        wantVowel = true;
    } else if (vowels >= 3 && Math.random() < 0.75) {
        wantVowel = false;
    }

    const tile = takeTileFromBag(s, wantVowel);

    if (tile) {
        player.rack.push(tile);
    }

}
}

function resetBoardView() {
boardView.scale = 1;
boardView.x = 0;
boardView.y = 0;
boardView.base = 0;
}

const AI_LEADER_NAMES = [
"Botbot the Reckoner",
"Lex the Lexicon-Bot",
"Tessera the Tile-Turner",
"Mister Wordsworth-9000"
];

function pickAiName(s) {
const used = new Set(s.players.filter(function (p) { return p.isAi; }).map(function (p) { return p.name; }));
const free = AI_LEADER_NAMES.filter(function (n) { return !used.has(n); });
return free.length ? free[0] : "Computer " + (s.players.filter(function (p) { return p.isAi; }).length + 1);
}

function createState() {
const players = window.chaserGame && window.chaserGame.players && window.chaserGame.players.length
? window.chaserGame.players
: [{ id: getMyId(), name: myName(), seat: 0 }];

const s = {
    board: makeBoard(),
    bag: shuffle(LETTERS.slice()),
    players: players.map(function (p, i) {
        return {
            id: p.id,
            name: p.name || "Player " + (i + 1),
            score: 0,
            rack: [],
            isAi: false
        };
    }),
    turn: 0,
    selectedRack: [],
    pending: [],
    message: "",
    lastMessage: "",
    aiThinking: false
};

s.players.forEach(function (p) {
    drawTiles(s, p);
});

return s;

}

window.addScrabbleComputerPlayer = function () {
const s = window.scrabbleState;
if (!s) return;

const amHost = window.chaserGame && window.chaserGame.hostId === getMyId();
if (!amHost) {
    s.message = "Only the host can add a computer player.";
    renderScrabble();
    return;
}

if (s.players.length >= 4) {
    s.message = "Table is full (max 4 players).";
    renderScrabble();
    return;
}

const aiPlayer = {
    id: "ai-" + Math.random().toString(36).slice(2, 9),
    name: pickAiName(s),
    score: 0,
    rack: [],
    isAi: true
};

drawTiles(s, aiPlayer);
s.players.push(aiPlayer);
s.message = "";
s.lastMessage = aiPlayer.name + " joined the table.";

renderScrabble();
syncScrabble();
maybeTriggerAiTurn();

};

function currentPlayer() {
const s = window.scrabbleState;
return s && s.players[s.turn];
}

function isMyTurn() {
const p = currentPlayer();
return p && !p.isAi && p.id === getMyId();
}

function selectedRackIndexes(s) {
if (!s) return [];

if (Array.isArray(s.selectedRack)) {
    return s.selectedRack
        .filter(function (n) {
            return typeof n === "number" && n >= 0;
        })
        .sort(function (a, b) {
            return a - b;
        });
}

if (s.selectedRack !== null && s.selectedRack !== undefined) {
    return [s.selectedRack];
}

return [];

}

function setSelectedRackIndexes(s, indexes) {
s.selectedRack = indexes.slice().sort(function (a, b) {
return a - b;
});
}

const TW = new Set(["0,0","0,7","0,14","7,0","7,14","14,0","14,7","14,14"]);
const DW = new Set(["1,1","2,2","3,3","4,4","7,7","10,10","11,11","12,12","13,13","1,13","2,12","3,11","4,10","10,4","11,3","12,2","13,1"]);
const TL = new Set(["1,5","1,9","5,1","5,5","5,9","5,13","9,1","9,5","9,9","9,13","13,5","13,9"]);
const DL = new Set(["0,3","0,11","2,6","2,8","3,0","3,7","3,14","6,2","6,6","6,8","6,12","7,3","7,11","8,2","8,6","8,8","8,12","11,0","11,7","11,14","12,6","12,8","14,3","14,11"]);

function premiumAt(r, c) {
const key = r + "," + c;
if (TW.has(key)) return "TW";
if (DW.has(key)) return r === 7 && c === 7 ? "★" : "DW";
if (TL.has(key)) return "TL";
if (DL.has(key)) return "DL";
return "";
}

function boardHasPermanentTiles(s) {
return s.board.some(function (row) {
return row.some(function (cell) {
return cell && !cell.pending;
});
});
}

function cellHasTile(s, r, c) {
return r >= 0 && r < 15 && c >= 0 && c < 15 && !!s.board[r][c];
}

function touchesPermanentTile(s, r, c) {
return [[1,0],[-1,0],[0,1],[0,-1]].some(function (dir) {
const nr = r + dir[0];
const nc = c + dir[1];

    return nr >= 0 &&
        nr < 15 &&
        nc >= 0 &&
        nc < 15 &&
        s.board[nr][nc] &&
        !s.board[nr][nc].pending;
});

}

function collectWord(s, r, c, dr, dc) {
let sr = r;
let sc = c;

while (cellHasTile(s, sr - dr, sc - dc)) {
    sr -= dr;
    sc -= dc;
}

const cells = [];
let word = "";
let cr = sr;
let cc = sc;

while (cellHasTile(s, cr, cc)) {
    const cell = s.board[cr][cc];

    word += cell.letter;
    cells.push({
        r: cr,
        c: cc,
        letter: cell.letter,
        pending: !!cell.pending
    });

    cr += dr;
    cc += dc;
}

return { word: word, cells: cells };

}

function scoreWord(s, wordObj) {
let total = 0;
let wordMultiplier = 1;

wordObj.cells.forEach(function (pos) {
    const letterVal = VALUES[pos.letter] || 0;
    let letterMultiplier = 1;

    if (pos.pending) {
        const premium = premiumAt(pos.r, pos.c);

        if (premium === "DL") letterMultiplier = 2;
        if (premium === "TL") letterMultiplier = 3;
        if (premium === "DW" || premium === "★") wordMultiplier *= 2;
        if (premium === "TW") wordMultiplier *= 3;
    }

    total += letterVal * letterMultiplier;
});

return total * wordMultiplier;

}

async function isValidWordOnline(word) {
const clean = String(word || "").trim().toUpperCase();

if (!/^[A-Z]{2,15}$/.test(clean)) return false;

if (EXTRA_SCRABBLE_STYLE_WORDS.has(clean)) return true;

if (WORD_CACHE[clean] !== undefined) {
    return WORD_CACHE[clean];
}

if (typeof window.chaserScrabbleWordChecker === "function") {
    try {
        const ok = await window.chaserScrabbleWordChecker(clean);
        WORD_CACHE[clean] = !!ok;
        return !!ok;
    } catch (err) {
        WORD_CACHE[clean] = false;
        return false;
    }
}

try {
    const url = "https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(clean.toLowerCase());
    const res = await fetch(url);

    WORD_CACHE[clean] = res.ok;
    return res.ok;
} catch (err) {
    WORD_CACHE[clean] = false;
    return false;
}

}

async function validateMove(s) {
if (!s.pending.length) {
return { ok: false, message: "Place at least one tile." };
}

const rows = Array.from(new Set(s.pending.map(function (t) { return t.r; })));
const cols = Array.from(new Set(s.pending.map(function (t) { return t.c; })));

if (rows.length > 1 && cols.length > 1) {
    return { ok: false, message: "Tiles must be in one row or one column." };
}

const firstMove = !boardHasPermanentTiles(s);

if (firstMove && !s.pending.some(function (t) { return t.r === 7 && t.c === 7; })) {
    return { ok: false, message: "First word must touch the center star." };
}

if (!firstMove && !s.pending.some(function (t) { return touchesPermanentTile(s, t.r, t.c); })) {
    return { ok: false, message: "New tiles must connect to existing tiles." };
}

const horizontal = rows.length === 1;
const vertical = cols.length === 1;

if (s.pending.length > 1) {
    if (horizontal) {
        const r = rows[0];
        const minC = Math.min.apply(null, s.pending.map(function (t) { return t.c; }));
        const maxC = Math.max.apply(null, s.pending.map(function (t) { return t.c; }));

        for (let c = minC; c <= maxC; c++) {
            if (!cellHasTile(s, r, c)) {
                return { ok: false, message: "No gaps allowed in a word." };
            }
        }
    }

    if (vertical) {
        const c = cols[0];
        const minR = Math.min.apply(null, s.pending.map(function (t) { return t.r; }));
        const maxR = Math.max.apply(null, s.pending.map(function (t) { return t.r; }));

        for (let r = minR; r <= maxR; r++) {
            if (!cellHasTile(s, r, c)) {
                return { ok: false, message: "No gaps allowed in a word." };
            }
        }
    }
}

let mainWord;

if (horizontal) {
    mainWord = collectWord(s, s.pending[0].r, s.pending[0].c, 0, 1);
} else if (vertical) {
    mainWord = collectWord(s, s.pending[0].r, s.pending[0].c, 1, 0);
} else {
    const one = s.pending[0];
    const h = collectWord(s, one.r, one.c, 0, 1);
    const v = collectWord(s, one.r, one.c, 1, 0);

    mainWord = h.word.length >= v.word.length ? h : v;
}

const words = [];

if (mainWord.word.length > 1) {
    words.push(mainWord);
}

s.pending.forEach(function (t) {
    const cross = horizontal
        ? collectWord(s, t.r, t.c, 1, 0)
        : collectWord(s, t.r, t.c, 0, 1);

    if (cross.word.length > 1) {
        words.push(cross);
    }
});

const uniqueWords = [];
const seen = new Set();

words.forEach(function (w) {
    const key = w.cells.map(function (c) {
        return c.r + "," + c.c;
    }).join("|");

    if (!seen.has(key)) {
        seen.add(key);
        uniqueWords.push(w);
    }
});

if (!uniqueWords.length) {
    return { ok: false, message: "Make a word of at least 2 letters." };
}

const invalid = [];

for (const w of uniqueWords) {
    const checkWord = w.word.toUpperCase();
    const ok = await isValidWordOnline(checkWord);

    if (!ok) invalid.push(checkWord);
}

if (invalid.length) {
    return { ok: false, message: invalid.join(", ") + " not in dictionary." };
}

let score = uniqueWords.reduce(function (sum, w) {
    return sum + scoreWord(s, w);
}, 0);

if (s.pending.length === 7) score += 50;

return {
    ok: true,
    words: uniqueWords.map(function (w) { return w.word.toUpperCase(); }),
    score: score,
    message: uniqueWords.map(function (w) { return w.word.toUpperCase(); }).join(", ") + " scored " + score + "."
};

}

/* ---------------------------------------------------------------------
COMPUTER PLAYER LOGIC (medium difficulty)

Strategy:
1. Build a list of "anchor" squares -- empty cells adjacent to an existing
   tile (or the center square if the board is empty).
2. For each anchor, try words from AI_WORD_BANK that the AI's rack can form,
   placing them horizontally or vertically through that anchor so they
   actually touch/use the anchor tile's letter when one is already there.
3. Score every candidate placement the same way a human move is scored.
4. Instead of always taking the top result (which would make the bot feel
   unbeatably sharp), the bot ranks candidates and picks randomly from the
   upper-middle slice -- "decent player", not "perfect machine".
5. If nothing decent is found, it exchanges tiles (if possible) or passes,
   the way a person stuck with a bad rack might.
6. Every chosen word is still re-validated with isValidWordOnline before
   being committed, so the AI can never place a non-word.
--------------------------------------------------------------------- */

function rackLetterCounts(rack) {
const counts = {};
rack.forEach(function (l) {
    counts[l] = (counts[l] || 0) + 1;
});
return counts;
}

function canFormWordFromRackPlusBoard(word, rackCounts, fixedLetters) {
// fixedLetters: letters in `word` positions that are already on the board
// (so they don't need to come from the rack).
const need = {};

for (let i = 0; i < word.length; i++) {
    if (fixedLetters[i]) continue;
    const ch = word[i];
    need[ch] = (need[ch] || 0) + 1;
}

for (const ch in need) {
    if ((rackCounts[ch] || 0) < need[ch]) return false;
}

return true;
}

function getAnchors(s) {
const anchors = [];

if (!boardHasPermanentTiles(s)) {
    anchors.push({ r: 7, c: 7 });
    return anchors;
}

for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
        if (s.board[r][c]) continue;

        const touches = [[1,0],[-1,0],[0,1],[0,-1]].some(function (dir) {
            const nr = r + dir[0];
            const nc = c + dir[1];
            return nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && s.board[nr][nc];
        });

        if (touches) anchors.push({ r: r, c: c });
    }
}

return anchors;

}

function tryPlacement(s, word, anchor, horizontal, rackCounts) {
// Try placing `word` so that it passes through anchor.r/c at every
// possible offset within the word, return the best-scoring valid
// placement (geometry-wise; dictionary check happens later).
let best = null;

for (let offset = 0; offset < word.length; offset++) {
    const startR = horizontal ? anchor.r : anchor.r - offset;
    const startC = horizontal ? anchor.c - offset : anchor.c;

    if (startR < 0 || startC < 0) continue;
    if (horizontal && startC + word.length > 15) continue;
    if (!horizontal && startR + word.length > 15) continue;

    const placements = [];
    const fixedLetters = [];
    let touchesAnchor = false;
    let touchesExisting = !boardHasPermanentTiles(s); // first move doesn't need this
    let valid = true;

    for (let i = 0; i < word.length; i++) {
        const r = horizontal ? startR : startR + i;
        const c = horizontal ? startC + i : startC;
        const existing = s.board[r][c];

        if (existing) {
            if (existing.letter !== word[i]) {
                valid = false;
                break;
            }
            fixedLetters[i] = true;
            touchesExisting = true;
            if (r === anchor.r && c === anchor.c) touchesAnchor = true;
        } else {
            fixedLetters[i] = false;
            if (r === anchor.r && c === anchor.c) touchesAnchor = true;

            // adjacency check for cross-word connectivity bonus isn't required
            // here -- validateMove() will do full legality checking. We just
            // need geometry + rack feasibility for candidate generation.
        }
    }

    if (!valid || !touchesAnchor || !touchesExisting) continue;
    if (!canFormWordFromRackPlusBoard(word, rackCounts, fixedLetters)) continue;

    for (let i = 0; i < word.length; i++) {
        const r = horizontal ? startR : startR + i;
        const c = horizontal ? startC + i : startC;
        if (!fixedLetters[i]) {
            placements.push({ r: r, c: c, letter: word[i] });
        }
    }

    if (!placements.length) continue; // word fully exists already, not a new move

    if (!best || placements.length < best.placements.length) {
        best = { word: word, placements: placements, startR: startR, startC: startC, horizontal: horizontal };
    }
}

return best;

}

function scoreCandidatePlacement(s, candidate) {
// Temporarily place tiles, score using the same logic as a real move, then
// revert. This mirrors validateMove()'s scoring without touching s.pending.
const restore = [];

candidate.placements.forEach(function (t) {
    restore.push({ r: t.r, c: t.c, prev: s.board[t.r][t.c] });
    s.board[t.r][t.c] = { letter: t.letter, pending: true };
});

const rows = Array.from(new Set(candidate.placements.map(function (t) { return t.r; })));
const horizontal = rows.length === 1 || candidate.placements.length === 1 ? candidate.horizontal : candidate.horizontal;

let mainWord;
const first = candidate.placements[0];

if (candidate.horizontal) {
    mainWord = collectWord(s, first.r, first.c, 0, 1);
} else {
    mainWord = collectWord(s, first.r, first.c, 1, 0);
}

const words = [];
if (mainWord.word.length > 1) words.push(mainWord);

candidate.placements.forEach(function (t) {
    const cross = candidate.horizontal
        ? collectWord(s, t.r, t.c, 1, 0)
        : collectWord(s, t.r, t.c, 0, 1);
    if (cross.word.length > 1) words.push(cross);
});

const seen = new Set();
const uniqueWords = [];
words.forEach(function (w) {
    const key = w.cells.map(function (c) { return c.r + "," + c.c; }).join("|");
    if (!seen.has(key)) {
        seen.add(key);
        uniqueWords.push(w);
    }
});

let score = uniqueWords.reduce(function (sum, w) {
    return sum + scoreWord(s, w);
}, 0);

if (candidate.placements.length === 7) score += 50;

restore.forEach(function (r) {
    s.board[r.r][r.c] = r.prev;
});

return { score: score, allWords: uniqueWords.map(function (w) { return w.word.toUpperCase(); }) };

}

function generateAiCandidates(s, aiPlayer) {
const rackCounts = rackLetterCounts(aiPlayer.rack);
const anchors = getAnchors(s);
const candidates = [];
const seenKey = new Set();

// Cap how many bank words we try per anchor to keep this fast and to keep
// the bot from being an exhaustive solver -- it samples a chunk of the
// bank rather than checking literally every entry against every anchor.
const sampleWords = shuffle(AI_WORD_BANK.slice()).slice(0, 220);

anchors.forEach(function (anchor) {
    sampleWords.forEach(function (word) {
        [true, false].forEach(function (horizontal) {
            const placement = tryPlacement(s, word, anchor, horizontal, rackCounts);
            if (!placement) return;

            const key = placement.horizontal + ":" + placement.startR + ":" + placement.startC + ":" + placement.word;
            if (seenKey.has(key)) return;
            seenKey.add(key);

            const scored = scoreCandidatePlacement(s, placement);
            if (scored.score <= 0) return;

            candidates.push({
                placements: placement.placements,
                score: scored.score,
                allWords: scored.allWords
            });
        });
    });
});

candidates.sort(function (a, b) { return b.score - a.score; });

return candidates;

}

function pickMediumDifficultyCandidate(candidates) {
if (!candidates.length) return null;

// "Medium" = don't always take the best move, but don't play randomly bad
// ones either. Take the top ~40% of candidates (at least 3 if available)
// and pick one of those at random, with a mild bias toward the better end.
const poolSize = Math.max(3, Math.ceil(candidates.length * 0.4));
const pool = candidates.slice(0, Math.min(poolSize, candidates.length));

// Weighted pick: earlier (better) entries are somewhat more likely.
const weights = pool.map(function (_, i) { return pool.length - i; });
const totalWeight = weights.reduce(function (a, b) { return a + b; }, 0);

let r = Math.random() * totalWeight;
for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
}

return pool[pool.length - 1];

}

function aiExchangeOrPass(s, aiPlayer) {
const exchangeCount = Math.min(aiPlayer.rack.length, Math.floor(Math.random() * 3) + 2);

if (s.bag.length >= exchangeCount && exchangeCount > 0 && Math.random() < 0.7) {
    const rackCopy = aiPlayer.rack.slice();
    const indexesToSwap = [];

    while (indexesToSwap.length < exchangeCount) {
        const idx = Math.floor(Math.random() * aiPlayer.rack.length);
        if (indexesToSwap.indexOf(idx) === -1) indexesToSwap.push(idx);
    }

    const oldTiles = [];
    indexesToSwap
        .slice()
        .sort(function (a, b) { return b - a; })
        .forEach(function (idx) {
            oldTiles.push(aiPlayer.rack.splice(idx, 1)[0]);
        });

    oldTiles.forEach(function (tile) { s.bag.unshift(tile); });
    shuffle(s.bag);
    drawTiles(s, aiPlayer);

    s.lastMessage = aiPlayer.name + " exchanged " + oldTiles.length + " tile" + (oldTiles.length === 1 ? "." : "s.");
} else {
    s.lastMessage = aiPlayer.name + " passed.";
}

s.turn = (s.turn + 1) % s.players.length;
}

async function runAiTurn() {
const s = window.scrabbleState;
if (!s) return;

const aiPlayer = currentPlayer();
if (!aiPlayer || !aiPlayer.isAi) return;

const amHost = window.chaserGame && window.chaserGame.hostId === getMyId();
if (!amHost) return; // only the host's client drives AI moves, to avoid duplicate/conflicting state

if (s.aiThinking) return;
s.aiThinking = true;
s.message = aiPlayer.name + " is thinking...";
renderScrabble();

// Small human-feeling delay instead of an instant move.
await new Promise(function (resolve) { setTimeout(resolve, 850 + Math.random() * 900); });

const candidates = generateAiCandidates(s, aiPlayer);
const choice = pickMediumDifficultyCandidate(candidates);

if (!choice) {
    aiExchangeOrPass(s, aiPlayer);
    s.aiThinking = false;
    s.message = "";
    renderScrabble();
    syncScrabble();
    maybeTriggerAiTurn();
    return;
}

// Commit the chosen placement onto the board as pending tiles, then run it
// through the exact same validation/dictionary path a human move uses.
choice.placements.forEach(function (t) {
    s.board[t.r][t.c] = { letter: t.letter, pending: true, owner: aiPlayer.id };
});
s.pending = choice.placements.map(function (t) {
    return { r: t.r, c: t.c, letter: t.letter };
});

choice.placements.forEach(function (t) {
    const idx = aiPlayer.rack.indexOf(t.letter);
    if (idx !== -1) aiPlayer.rack.splice(idx, 1);
});

const result = await validateMove(s);

if (!result.ok) {
    // Bank word didn't pass live dictionary validation (rare) -- revert and
    // just pass this turn rather than getting stuck.
    s.pending.forEach(function (t) {
        s.board[t.r][t.c] = null;
    });
    choice.placements.forEach(function (t) {
        aiPlayer.rack.push(t.letter);
    });
    s.pending = [];
    aiExchangeOrPass(s, aiPlayer);
    s.aiThinking = false;
    s.message = "";
    renderScrabble();
    syncScrabble();
    maybeTriggerAiTurn();
    return;
}

aiPlayer.score += result.score;

s.pending.forEach(function (t) {
    if (s.board[t.r][t.c]) s.board[t.r][t.c].pending = false;
});

s.pending = [];
drawTiles(s, aiPlayer);
s.turn = (s.turn + 1) % s.players.length;
s.lastMessage = aiPlayer.name + ": " + result.message;
s.aiThinking = false;
s.message = "";

renderScrabble();
syncScrabble();
maybeTriggerAiTurn();

}

function maybeTriggerAiTurn() {
const s = window.scrabbleState;
if (!s) return;

const p = currentPlayer();
if (p && p.isAi) {
    runAiTurn();
}

}

/* --------------------------------------------------------------------- */

function setupBoardView() {
const root = canvas();
if (!root) return;

const wrap = root.querySelector(".sc-wrap");
const viewport = root.querySelector(".sc-board-viewport");
const shell = root.querySelector(".sc-board-shell");
const board = root.querySelector(".sc-board");

if (!wrap || !viewport || !shell || !board) return;

const score = root.querySelector(".sc-score");
const rack = root.querySelector(".sc-rack");
const msg = root.querySelector(".sc-msg");
const actions = root.querySelector(".sc-actions");

const scoreH = score ? score.offsetHeight : 0;
const rackH = rack ? rack.offsetHeight : 0;
const msgH = msg ? msg.offsetHeight : 0;
const actionsH = actions ? actions.offsetHeight : 0;

const reservedHeight = scoreH + rackH + msgH + actionsH + 6;
const availableHeight = Math.max(220, wrap.clientHeight - reservedHeight);
const availableWidth = Math.max(280, wrap.clientWidth - 8);
const calculatedBase = Math.floor(Math.min(availableWidth, availableHeight, 760));

if (!boardView.base || calculatedBase > boardView.base) {
    boardView.base = calculatedBase;
}

const base = boardView.base;

viewport.style.width = base + "px";
viewport.style.height = base + "px";
viewport.style.overflow = "hidden";
viewport.style.touchAction = "none";

shell.style.width = base + "px";
shell.style.height = base + "px";
shell.style.minWidth = base + "px";
shell.style.minHeight = base + "px";
shell.style.overflow = "hidden";
shell.style.position = "relative";

board.style.width = base + "px";
board.style.height = base + "px";
board.style.minWidth = base + "px";
board.style.minHeight = base + "px";
board.style.willChange = "transform";

function clampView() {
    const scaled = base * boardView.scale;

    if (boardView.scale <= 1.01) {
        boardView.scale = 1;
        boardView.x = 0;
        boardView.y = 0;
        return;
    }

    const minX = Math.min(0, base - scaled);
    const minY = Math.min(0, base - scaled);

    boardView.x = Math.max(minX, Math.min(0, boardView.x));
    boardView.y = Math.max(minY, Math.min(0, boardView.y));
}

function applyView() {
    clampView();

    board.style.transformOrigin = "top left";
    board.style.transform =
        "translate3d(" + boardView.x + "px, " + boardView.y + "px, 0) scale(" + boardView.scale + ")";
}

applyView();

if (viewport.__scrabbleTransformZoomWired) return;
viewport.__scrabbleTransformZoomWired = true;

let lastPinchDistance = 0;
let startFingerX = 0;
let startFingerY = 0;
let startX = 0;
let startY = 0;
let moved = false;
let lastTap = 0;

function touchDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function touchMidpoint(e) {
    const rect = viewport.getBoundingClientRect();

    return {
        x: ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left,
        y: ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top
    };
}

viewport.addEventListener("touchstart", function (e) {
    moved = false;

    if (e.touches.length === 2) {
        e.preventDefault();
        lastPinchDistance = touchDistance(e.touches[0], e.touches[1]);
        return;
    }

    if (e.touches.length === 1) {
        startFingerX = e.touches[0].clientX;
        startFingerY = e.touches[0].clientY;
        startX = boardView.x;
        startY = boardView.y;
    }
}, { passive:false });

viewport.addEventListener("touchmove", function (e) {
    if (e.touches.length === 2) {
        e.preventDefault();
        moved = true;

        const newDistance = touchDistance(e.touches[0], e.touches[1]);

        if (!lastPinchDistance) {
            lastPinchDistance = newDistance;
            return;
        }

        const mid = touchMidpoint(e);

        const boardPointX = (mid.x - boardView.x) / boardView.scale;
        const boardPointY = (mid.y - boardView.y) / boardView.scale;

        let nextScale = boardView.scale * (newDistance / lastPinchDistance);
        nextScale = Math.max(1, Math.min(3.0, nextScale));

        boardView.scale = nextScale;
        boardView.x = mid.x - boardPointX * boardView.scale;
        boardView.y = mid.y - boardPointY * boardView.scale;

        lastPinchDistance = newDistance;

        applyView();
        return;
    }

    if (e.touches.length === 1 && boardView.scale > 1.01) {
        e.preventDefault();

        const dx = e.touches[0].clientX - startFingerX;
        const dy = e.touches[0].clientY - startFingerY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            moved = true;
        }

        boardView.x = startX + dx;
        boardView.y = startY + dy;

        applyView();
    }
}, { passive:false });

viewport.addEventListener("touchend", function (e) {
    if (e.touches.length === 1) {
        startFingerX = e.touches[0].clientX;
        startFingerY = e.touches[0].clientY;
        startX = boardView.x;
        startY = boardView.y;
        lastPinchDistance = 0;
        return;
    }

    if (e.touches.length === 0) {
        lastPinchDistance = 0;

        const now = Date.now();

        if (!moved && now - lastTap < 300) {
            boardView.scale = 1;
            boardView.x = 0;
            boardView.y = 0;
            applyView();
        }

        if (!moved) {
            lastTap = now;
        }
    }
}, { passive:false });

}

window.initScrabbleGame = function () {
window.chaserGame = window.chaserGame || {};
window.chaserGame.activeGame = "Scrabble";

const stage = document.getElementById("activeGameStage");
const roomDisplay = document.getElementById("roomDisplayCode");
const headerBtns = document.getElementById("headerActionButtonsContainer");
const chatHeader = document.getElementById("chatHeader");

if (stage) stage.classList.add("open");
if (roomDisplay) roomDisplay.innerText = "🔤 Scrabble";
if (headerBtns) headerBtns.style.display = "none";
if (chatHeader) chatHeader.classList.add("game-active-mode");

const amHost = window.chaserGame && window.chaserGame.hostId === getMyId();

if (amHost || !window.scrabbleState) {
    resetBoardView();
    window.scrabbleState = createState();
    syncScrabble();
}

renderScrabble();
maybeTriggerAiTurn();

};

window.pickScrabbleTile = function (idx) {
const s = window.scrabbleState;
if (!s || !isMyTurn()) return;

const selected = selectedRackIndexes(s);
const alreadySelected = selected.indexOf(idx) !== -1;

let nextSelected;

if (alreadySelected) {
    nextSelected = selected.filter(function (n) {
        return n !== idx;
    });
} else {
    nextSelected = selected.concat(idx);
}

setSelectedRackIndexes(s, nextSelected);

if (nextSelected.length > 1) {
    s.message = "Exchange tiles or tap a tile again to unselect it.";
} else {
    s.message = "";
}

renderScrabble();

};

window.placeScrabbleTile = function (r, c) {
const s = window.scrabbleState;
const p = currentPlayer();

if (!s || !p || !isMyTurn()) return;
if (s.board[r][c]) return;

const selected = selectedRackIndexes(s);

if (selected.length === 0) return;

if (selected.length > 1) {
    s.message = "You selected multiple tiles. Tap Exchange to swap them.";
    renderScrabble();
    return;
}

const rackIndex = selected[0];
const letter = p.rack[rackIndex];

if (!letter) return;

s.board[r][c] = { letter: letter, pending: true, owner: p.id };
s.pending.push({ r: r, c: c, letter: letter });
p.rack.splice(rackIndex, 1);

setSelectedRackIndexes(s, []);
s.message = "";

renderScrabble();
syncScrabble();

};

window.undoScrabbleMove = function () {
const s = window.scrabbleState;
const p = currentPlayer();

if (!s || !p || !isMyTurn()) return;

const lastTile = s.pending.pop();

if (!lastTile) return;

p.rack.push(lastTile.letter);
s.board[lastTile.r][lastTile.c] = null;

setSelectedRackIndexes(s, []);
s.message = "";

renderScrabble();
syncScrabble();

};

window.submitScrabbleMove = async function () {
const s = window.scrabbleState;
const p = currentPlayer();

if (!s || !p || !isMyTurn() || !s.pending.length) return;

s.message = "Checking word...";
renderScrabble();

const result = await validateMove(s);

if (!result.ok) {
    s.message = result.message;
    renderScrabble();
    syncScrabble();
    return;
}

p.score += result.score;

s.pending.forEach(function (t) {
    if (s.board[t.r][t.c]) s.board[t.r][t.c].pending = false;
});

s.pending = [];
drawTiles(s, p);
s.turn = (s.turn + 1) % s.players.length;
setSelectedRackIndexes(s, []);
s.lastMessage = p.name + ": " + result.message;
s.message = "";

renderScrabble();
syncScrabble();
maybeTriggerAiTurn();

};

window.passScrabbleTurn = function () {
const s = window.scrabbleState;
const p = currentPlayer();

if (!s || !p || !isMyTurn()) return;

s.pending.forEach(function (t) {
    p.rack.push(t.letter);
    s.board[t.r][t.c] = null;
});

s.pending = [];
setSelectedRackIndexes(s, []);
s.turn = (s.turn + 1) % s.players.length;
s.lastMessage = p.name + " passed.";
s.message = "";

renderScrabble();
syncScrabble();
maybeTriggerAiTurn();

};

window.exchangeScrabbleSelectedTile = function () {
const s = window.scrabbleState;
const p = currentPlayer();

if (!s || !p || !isMyTurn()) return;

if (s.pending.length) {
    s.message = "Undo placed tiles before exchanging.";
    renderScrabble();
    return;
}

const selected = selectedRackIndexes(s);

if (!selected.length) {
    s.message = "Select one or more tiles to exchange.";
    renderScrabble();
    return;
}

if (s.bag.length < selected.length) {
    s.message = "Not enough tiles left to exchange that many.";
    renderScrabble();
    return;
}

const oldTiles = [];

selected
    .slice()
    .sort(function (a, b) {
        return b - a;
    })
    .forEach(function (idx) {
        if (idx >= 0 && idx < p.rack.length) {
            oldTiles.push(p.rack.splice(idx, 1)[0]);
        }
    });

oldTiles.forEach(function (tile) {
    s.bag.unshift(tile);
});

shuffle(s.bag);
drawTiles(s, p);

setSelectedRackIndexes(s, []);
s.turn = (s.turn + 1) % s.players.length;
s.lastMessage = p.name + " exchanged " + oldTiles.length + " tile" + (oldTiles.length === 1 ? "." : "s.");
s.message = "";

renderScrabble();
syncScrabble();
maybeTriggerAiTurn();

};

window.handleIncomingScrabbleSync = function (payload) {
if (!payload || !payload.state) return;

if (
    payload.roomGameId &&
    window.chaserGame &&
    window.chaserGame.activeGameId &&
    payload.roomGameId !== window.chaserGame.activeGameId
) {
    return;
}

window.scrabbleState = payload.state;
if (window.chaserGame) window.chaserGame.activeGame = "Scrabble";
renderScrabble();

};

function renderScrabble() {
const el = canvas();
const s = window.scrabbleState;

if (!el || !s) return;

const p = currentPlayer();
const me = s.players.find(function (x) {
    return x.id === getMyId();
}) || s.players[0];

const myTurn = isMyTurn();
const selectedRack = selectedRackIndexes(s);

const amHost = window.chaserGame && window.chaserGame.hostId === getMyId();
const canAddAi = amHost && s.players.length < 4 && !boardHasPermanentTiles(s) && s.players.every(function (pl) { return pl.score === 0; });

const boardHtml = s.board.map(function (row, r) {
    return row.map(function (cell, c) {
        const premium = premiumAt(r, c);
        const premiumClass = premium === "★" ? "center" : premium.toLowerCase();
        let cellInner = "";

        if (cell) {
            cellInner =
                "<b>" + escapeHtml(cell.letter) + "</b>" +
                "<small>" + (VALUES[cell.letter] || 0) + "</small>";
        } else {
            cellInner = "<span>" + escapeHtml(premium) + "</span>";
        }

        return (
            "<button class=\"sc-cell " +
            premiumClass +
            (cell && cell.pending ? " pending" : "") +
            "\" onclick=\"placeScrabbleTile(" +
            r +
            "," +
            c +
            ")\" type=\"button\">" +
            cellInner +
            "</button>"
        );
    }).join("");
}).join("");

const rackHtml = me.rack.map(function (l, i) {
    return (
        "<button class=\"sc-tile " +
        (selectedRack.indexOf(i) !== -1 ? "selected" : "") +
        "\" onclick=\"pickScrabbleTile(" +
        i +
        ")\" type=\"button\">" +
        "<b>" +
        escapeHtml(l) +
        "</b><small>" +
        (VALUES[l] || 0) +
        "</small></button>"
    );
}).join("");

const scoreHtml = s.players.map(function (x) {
    return (
        "<div class=\"sc-player " + (x.id === p.id ? "turn" : "") + (x.isAi ? " ai" : "") + "\">" +
            "<div class=\"sc-player-name\">" + (x.isAi ? "🤖 " : "") + escapeHtml(x.name) + "</div>" +
            "<div class=\"sc-player-score\">" + Number(x.score || 0) + " points</div>" +
        "</div>"
    );
}).join("");

const hasSelectedRackTiles = selectedRack.length > 0;
const hasPlacedTiles = s.pending.length > 0;

const canSubmit = myTurn && hasPlacedTiles;
const canUndo = myTurn && hasPlacedTiles;
const canExchange = myTurn && hasSelectedRackTiles && !hasPlacedTiles;
const canPass = myTurn && !hasSelectedRackTiles && !hasPlacedTiles;

const messageText = s.message || s.lastMessage || "";
const messageClass = s.message ? " error" : "";

el.innerHTML = [
    "<style>",
        ".sc-wrap{height:100%;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;padding:0 0 90px;box-sizing:border-box;color:#e2f0d9;font-family:Arial,sans-serif;display:flex;flex-direction:column;}",
        ".sc-score{flex:0 0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:7px;width:calc(100% - 12px);max-width:540px;margin:2px auto 4px;}",
        ".sc-player{background:#e2f0d9;color:#1e4620;border:3px solid #e2f0d9;border-radius:9px;padding:4px 8px;font-weight:900;text-align:center;box-sizing:border-box;min-width:0;}",
        ".sc-player.turn{border-color:#ff0000;box-shadow:0 0 0 2px #ff0000;}",
        ".sc-player.ai{background:#dce8f5;}",
        ".sc-player-name{font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.05;}",
        ".sc-player-score{font-size:13px;line-height:1.05;margin-top:1px;}",

        ".sc-add-ai-row{flex:0 0 auto;display:flex;justify-content:center;margin:0 auto 4px;}",
        ".sc-add-ai-btn{border:none;border-radius:9px;padding:6px 10px;font-size:12px;font-weight:900;background:#1d4ed8;color:#fff;}",

        ".sc-board-zone{flex:0 0 auto;min-height:0;display:flex;align-items:center;justify-content:center;width:100%;margin:0 auto;}",
        ".sc-board-viewport{overflow:hidden;touch-action:none;-webkit-overflow-scrolling:touch;box-sizing:content-box;border:3px solid #ffd700;border-radius:8px;background:#0b2410;max-width:100%;max-height:100%;}",
        ".sc-board-shell{position:relative;transform-origin:top left;overflow:hidden;}",
        ".sc-board{margin:0;border:0;border-radius:0;padding:3px;display:grid;grid-template-columns:repeat(15,1fr);grid-template-rows:repeat(15,1fr);gap:1px;box-sizing:border-box;transform-origin:top left;}",

        ".sc-cell{width:100%;height:100%;min-width:0;min-height:0;aspect-ratio:1/1;border:1px solid rgba(0,0,0,.45);background:#d9ead3;color:#1e4620;font-size:12px;font-weight:900;padding:0;position:relative;overflow:hidden;line-height:1;box-sizing:border-box;display:flex;align-items:center;justify-content:center;}",
        ".sc-cell span{font-size:8px;font-weight:900;opacity:.78;}",
        ".sc-cell.tw{background:#e06666;color:#ffffff;}",
        ".sc-cell.dw{background:#f4cccc;color:#7a0000;}",
        ".sc-cell.tl{background:#3d85c6;color:#ffffff;}",
        ".sc-cell.dl{background:#9fc5e8;color:#073763;}",
        ".sc-cell.center{background:#f4cccc;color:#7a0000;}",
        ".sc-cell.pending{background:#ffd700!important;color:#1e4620!important;}",
        ".sc-cell b{font-size:15px;display:block;line-height:1;}",
        ".sc-cell small{position:absolute;right:2px;bottom:1px;font-size:4px;}",
        ".sc-tile small{position:absolute;right:4px;bottom:2px;font-size:12px;font-weight:900;}",

        ".sc-rack{flex:0 0 auto;display:flex;justify-content:center;gap:2px;margin:4px auto 3px;flex-wrap:nowrap;width:100%;max-width:100%;overflow:visible;padding:0 2px;box-sizing:border-box;}",
        ".sc-tile{position:relative;width:clamp(32px,12vw,43px);height:clamp(36px,13vw,47px);border-radius:8px;border:2px solid #1e4620;background:#fff3c4;color:#1e4620;font-size:20px;font-weight:900;box-shadow:0 2px 5px rgba(0,0,0,.35);flex:0 0 auto;}",
        ".sc-tile.selected{border:4px solid #ff0000;transform:translateY(-4px);}",

        ".sc-msg{flex:0 0 auto;text-align:center;color:#ffd700;font-weight:900;margin:1px auto 4px;max-width:500px;min-height:16px;font-size:13px;line-height:1.1;}",
        ".sc-msg.error{color:#ffffff;background:#b00020;border-radius:8px;padding:4px 6px;}",

        ".sc-actions{flex:0 0 auto;display:flex;gap:6px;justify-content:center;margin:0 auto 2px;flex-wrap:wrap;}",
        ".sc-actions button{border:none;border-radius:10px;padding:8px 10px;font-size:13px;font-weight:900;background:#ffd700;color:#1e4620;}",
        ".sc-actions button:disabled{background:#777!important;color:#222!important;box-shadow:none!important;}",
        ".sc-exchange-btn{background:#777!important;color:#222!important;box-shadow:none!important;}",
        ".sc-exchange-btn.ready{background:#1d4ed8!important;color:#ffffff!important;box-shadow:0 0 0 3px #ffffff,0 0 12px #1d4ed8!important;}",

        "@media(max-width:390px),(max-height:735px){",
            ".sc-player{padding:3px 6px;}",
            ".sc-player-name{font-size:14px;}",
            ".sc-player-score{font-size:12px;}",
            ".sc-rack{gap:1px;margin:3px auto 2px;}",
            ".sc-actions{gap:4px;}",
            ".sc-actions button{padding:7px 8px;font-size:12px;}",
        "}",
    "</style>",

    "<div class=\"sc-wrap\">",
        "<div class=\"sc-score\">", scoreHtml, "</div>",

        canAddAi ? "<div class=\"sc-add-ai-row\"><button class=\"sc-add-ai-btn\" onclick=\"addScrabbleComputerPlayer()\" type=\"button\">🤖 Add Computer Player</button></div>" : "",

        "<div class=\"sc-board-zone\">",
            "<div class=\"sc-board-viewport\">",
                "<div class=\"sc-board-shell\">",
                    "<div class=\"sc-board\">", boardHtml, "</div>",
                "</div>",
            "</div>",
        "</div>",

        "<div class=\"sc-rack\">", rackHtml, "</div>",
        "<div class=\"sc-msg", messageClass, "\">", messageText ? escapeHtml(messageText) : "&nbsp;", "</div>",

        "<div class=\"sc-actions\">",
            "<button onclick=\"passScrabbleTurn()\" ", canPass ? "" : "disabled", " type=\"button\">Pass</button>",
            "<button onclick=\"undoScrabbleMove()\" ", canUndo ? "" : "disabled", " type=\"button\">Undo</button>",
            "<button onclick=\"exchangeScrabbleSelectedTile()\" ", canExchange ? "" : "disabled", " class=\"sc-exchange-btn ", canExchange ? "ready" : "", "\" type=\"button\">Exchange</button>",
            "<button onclick=\"submitScrabbleMove()\" ", canSubmit ? "" : "disabled", " type=\"button\">Submit</button>",
        "</div>",
    "</div>"
].join("");

setupBoardView();

}

})();
