/* CHASER SCRABBLE - SEPARATE GAME FILE
Bigger board + stable pinch zoom + pan + multi-tile exchange + one-tile undo + online word check
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

const WORD_CACHE = {};

const boardView = {
    scale: 1,
    x: 0,
    y: 0,
    base: 0
};

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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

function shuffle(a) {
    return a.sort(function () {
        return Math.random() - 0.5;
    });
}

function makeBoard() {
    return Array.from({ length: 15 }, function () {
        return Array(15).fill(null);
    });
}

function drawTiles(s, player) {
    while (player.rack.length < 7 && s.bag.length) {
        player.rack.push(s.bag.pop());
    }
}

function resetBoardView() {
    boardView.scale = 1;
    boardView.x = 0;
    boardView.y = 0;
    boardView.base = 0;
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
                rack: []
            };
        }),
        turn: 0,
        selectedRack: [],
        pending: [],
        message: "",
        lastMessage: ""
    };

    s.players.forEach(function (p) {
        drawTiles(s, p);
    });

    return s;
}

function currentPlayer() {
    const s = window.scrabbleState;
    return s && s.players[s.turn];
}

function isMyTurn() {
    const p = currentPlayer();
    return p && p.id === getMyId();
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

    function clampView() {
        const scaled = base * boardView.scale;

        if (boardView.scale <= 1.02) {
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
            "translate(" + boardView.x + "px, " + boardView.y + "px) scale(" + boardView.scale + ")";
    }

    applyView();

    if (viewport.__scrabbleTransformZoomWired) return;
    viewport.__scrabbleTransformZoomWired = true;

    let startDistance = 0;
    let startScale = 1;
    let startX = 0;
    let startY = 0;
    let pinchBoardX = 0;
    let pinchBoardY = 0;
    let pinchMidX = 0;
    let pinchMidY = 0;
    let startFingerX = 0;
    let startFingerY = 0;
    let moved = false;
    let lastTap = 0;

    function touchDistance(t1, t2) {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    viewport.addEventListener("touchstart", function (e) {
        moved = false;

        if (e.touches.length === 2) {
            const rect = viewport.getBoundingClientRect();

            startDistance = touchDistance(e.touches[0], e.touches[1]);
            startScale = boardView.scale;
            startX = boardView.x;
            startY = boardView.y;

            pinchMidX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
            pinchMidY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;

            pinchBoardX = (pinchMidX - startX) / startScale;
            pinchBoardY = (pinchMidY - startY) / startScale;
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
            if (!startDistance) return;

            const rect = viewport.getBoundingClientRect();
            const currentMidX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
            const currentMidY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;

            let nextScale = startScale * (newDistance / startDistance);
            nextScale = Math.max(1, Math.min(3.0, nextScale));

            boardView.scale = nextScale;
            boardView.x = currentMidX - pinchBoardX * boardView.scale;
            boardView.y = currentMidY - pinchBoardY * boardView.scale;

            applyView();
        }

        if (e.touches.length === 1 && boardView.scale > 1.02) {
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

    viewport.addEventListener("touchend", function () {
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
    }, { passive:true });
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
    const multipleSelected = selectedRack.length > 1;

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
            "<div class=\"sc-player " + (x.id === p.id ? "turn" : "") + "\">" +
                "<div class=\"sc-player-name\">" + escapeHtml(x.name) + "</div>" +
                "<div class=\"sc-player-score\">" + Number(x.score || 0) + " points</div>" +
            "</div>"
        );
    }).join("");

    const canSubmit = myTurn && s.pending.length && !multipleSelected;
    const canUndo = myTurn && s.pending.length;
    const canExchange = myTurn && !s.pending.length && selectedRack.length > 0;
    const canPass = myTurn && !multipleSelected;

    const messageText = s.message || s.lastMessage || "";
    const messageClass = s.message ? " error" : "";

    el.innerHTML = [
        "<style>",
            ".sc-wrap{height:100%;overflow:hidden;padding:0 0 58px;box-sizing:border-box;color:#e2f0d9;font-family:Arial,sans-serif;display:flex;flex-direction:column;}",
            ".sc-score{flex:0 0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:7px;width:calc(100% - 12px);max-width:540px;margin:2px auto 4px;}",
            ".sc-player{background:#e2f0d9;color:#1e4620;border:3px solid #e2f0d9;border-radius:9px;padding:4px 8px;font-weight:900;text-align:center;box-sizing:border-box;min-width:0;}",
            ".sc-player.turn{border-color:#ff0000;box-shadow:0 0 0 2px #ff0000;}",
            ".sc-player-name{font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.05;}",
            ".sc-player-score{font-size:13px;line-height:1.05;margin-top:1px;}",

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
            ".sc-cell small,.sc-tile small{position:absolute;right:2px;bottom:1px;font-size:8px;}",

            ".sc-rack{flex:0 0 auto;display:flex;justify-content:center;gap:4px;margin:6px auto 4px;flex-wrap:nowrap;width:100%;max-width:100%;overflow:visible;}",
            ".sc-tile{position:relative;width:clamp(34px,12.5vw,44px);height:clamp(38px,13.5vw,48px);border-radius:8px;border:2px solid #1e4620;background:#fff3c4;color:#1e4620;font-size:20px;font-weight:900;box-shadow:0 2px 5px rgba(0,0,0,.35);flex:0 0 auto;}",
            ".sc-tile.selected{border:4px solid #ff0000;transform:translateY(-4px);}",

            ".sc-msg{flex:0 0 auto;text-align:center;color:#ffd700;font-weight:900;margin:1px auto 4px;max-width:500px;min-height:16px;font-size:13px;line-height:1.1;}",
            ".sc-msg.error{color:#ffffff;background:#b00020;border-radius:8px;padding:4px 6px;}",

            ".sc-actions{flex:0 0 auto;display:flex;gap:6px;justify-content:center;margin:0 auto 2px;flex-wrap:wrap;}",
            ".sc-actions button{border:none;border-radius:10px;padding:8px 10px;font-size:13px;font-weight:900;background:#ffd700;color:#1e4620;}",
            ".sc-actions button:disabled{background:#777;color:#222;}",
            ".sc-exchange-btn{background:#1d4ed8!important;color:#ffffff!important;}",
            ".sc-exchange-btn.ready{box-shadow:0 0 0 3px #ffffff,0 0 12px #1d4ed8;}",

            "@media(max-width:390px),(max-height:735px){",
                ".sc-player{padding:3px 6px;}",
                ".sc-player-name{font-size:14px;}",
                ".sc-player-score{font-size:12px;}",
                ".sc-rack{gap:3px;margin:5px auto 3px;}",
                ".sc-actions{gap:4px;}",
                ".sc-actions button{padding:7px 8px;font-size:12px;}",
            "}",
        "</style>",

        "<div class=\"sc-wrap\">",
            "<div class=\"sc-score\">", scoreHtml, "</div>",

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
                "<button onclick=\"submitScrabbleMove()\" ", canSubmit ? "" : "disabled", " type=\"button\">Submit</button>",
                "<button onclick=\"undoScrabbleMove()\" ", canUndo ? "" : "disabled", " type=\"button\">Undo</button>",
                "<button onclick=\"exchangeScrabbleSelectedTile()\" ", canExchange ? "" : "disabled", " class=\"sc-exchange-btn ", canExchange ? "ready" : "", "\" type=\"button\">Exchange</button>",
                "<button onclick=\"passScrabbleTurn()\" ", canPass ? "" : "disabled", " type=\"button\">Pass</button>",
            "</div>",
        "</div>"
    ].join("");

    setupBoardView();
}

})();
