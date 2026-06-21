/* CHASER SCRABBLE - SEPARATE GAME FILE
   UI cleanup + real bonus board + basic word validation
*/
(function () {
    "use strict";

    const LETTERS = "EEEEEEEEEEEEAAAAAAAAAIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ".split("");

    const VALUES = {
        A:1, B:3, C:3, D:2, E:1, F:4, G:2, H:4, I:1, J:8, K:5, L:1, M:3,
        N:1, O:1, P:3, Q:10, R:1, S:1, T:1, U:1, V:4, W:4, X:8, Y:4, Z:10
    };

    const SMALL_BACKUP_WORDS = new Set(`
        A I AN AS AT AM ARE BE BY DO GO HE HI IF IN IS IT ME MY NO OF OH ON OR OX
        SO TO UP US WE
        CAT DOG HAT BAT RAT MAT SAT FAT PAT CAP MAP TAP SAP CAR BAR FAR WAR ART ARM
        SUN RUN FUN GUN BUN CUP CUT CUTE COT COG LOG FOG HOG HOT NOT POT ROT LOT
        ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT NINE TEN
        TAX DUKE COIN COINS STEAL BLOCK BLOCKS CARD CARDS GAME PLAY WORD WORDS TILE TILES
        HELLO HELP TEST TREE ROAD HOME HOUSE WATER FIRE FOOD GOOD BAD BIG SMALL
    `.trim().split(/\s+/));

    let WORD_SET = SMALL_BACKUP_WORDS;
    let dictionaryLoaded = false;

    async function loadDictionary() {
        if (dictionaryLoaded) return;
        dictionaryLoaded = true;

        if (window.SCRABBLE_WORD_SET instanceof Set) {
            WORD_SET = window.SCRABBLE_WORD_SET;
            return;
        }

        try {
            const res = await fetch("./games/scrabble-words.txt?v=1", { cache: "no-store" });
            if (!res.ok) return;

            const text = await res.text();
            const words = text
                .split(/\r?\n/)
                .map(w => w.trim().toUpperCase())
                .filter(w => /^[A-Z]{2,15}$/.test(w));

            if (words.length > 100) {
                WORD_SET = new Set(words);
            }
        } catch (err) {
            // Uses small backup dictionary if file does not exist yet.
        }
    }

    function myId() {
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
                    roomGameId: window.chaserGame?.activeGameId || null
                }
            });
        }
    }

    function shuffle(a) {
        return a.sort(() => Math.random() - 0.5);
    }

    function makeBoard() {
        return Array.from({ length: 15 }, () => Array(15).fill(null));
    }

    function drawTiles(s, player) {
        while (player.rack.length < 7 && s.bag.length) {
            player.rack.push(s.bag.pop());
        }
    }

    function createState() {
        const players = window.chaserGame?.players?.length
            ? window.chaserGame.players
            : [{ id: myId(), name: myName(), seat: 0 }];

        const s = {
            board: makeBoard(),
            bag: shuffle(LETTERS.slice()),
            players: players.map((p, i) => ({
                id: p.id,
                name: p.name || "Player " + (i + 1),
                score: 0,
                rack: []
            })),
            turn: 0,
            selectedRack: null,
            pending: [],
            message: "",
            lastMessage: ""
        };

        s.players.forEach(p => drawTiles(s, p));
        return s;
    }

    function currentPlayer() {
        const s = window.scrabbleState;
        return s && s.players[s.turn];
    }

    function isMyTurn() {
        const p = currentPlayer();
        return p && p.id === myId();
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

    function isPendingCell(s, r, c) {
        return s.pending.some(t => t.r === r && t.c === c);
    }

    function boardHasPermanentTiles(s) {
        return s.board.some(row => row.some(cell => cell && !cell.pending));
    }

    function cellHasTile(s, r, c) {
        return r >= 0 && r < 15 && c >= 0 && c < 15 && !!s.board[r][c];
    }

    function touchesPermanentTile(s, r, c) {
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        return dirs.some(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            return nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && s.board[nr][nc] && !s.board[nr][nc].pending;
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
            cells.push({ r: cr, c: cc, letter: cell.letter, pending: !!cell.pending });
            cr += dr;
            cc += dc;
        }

        return { word, cells };
    }

    function scoreWord(s, wordObj) {
        let total = 0;
        let wordMultiplier = 1;

        wordObj.cells.forEach(pos => {
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

    function validateMove(s) {
        if (!s.pending.length) {
            return { ok: false, message: "Place at least one tile." };
        }

        const rows = [...new Set(s.pending.map(t => t.r))];
        const cols = [...new Set(s.pending.map(t => t.c))];

        if (rows.length > 1 && cols.length > 1) {
            return { ok: false, message: "Tiles must be in one row or one column." };
        }

        const firstMove = !boardHasPermanentTiles(s);

        if (firstMove && !s.pending.some(t => t.r === 7 && t.c === 7)) {
            return { ok: false, message: "First word must touch the center star." };
        }

        if (!firstMove && !s.pending.some(t => touchesPermanentTile(s, t.r, t.c))) {
            return { ok: false, message: "New tiles must connect to existing tiles." };
        }

        const horizontal = rows.length === 1;
        const vertical = cols.length === 1;

        if (s.pending.length > 1) {
            if (horizontal) {
                const r = rows[0];
                const minC = Math.min(...s.pending.map(t => t.c));
                const maxC = Math.max(...s.pending.map(t => t.c));

                for (let c = minC; c <= maxC; c++) {
                    if (!cellHasTile(s, r, c)) {
                        return { ok: false, message: "No gaps allowed in a word." };
                    }
                }
            }

            if (vertical) {
                const c = cols[0];
                const minR = Math.min(...s.pending.map(t => t.r));
                const maxR = Math.max(...s.pending.map(t => t.r));

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

        s.pending.forEach(t => {
            const cross = horizontal
                ? collectWord(s, t.r, t.c, 1, 0)
                : collectWord(s, t.r, t.c, 0, 1);

            if (cross.word.length > 1) {
                words.push(cross);
            }
        });

        const uniqueWords = [];
        const seen = new Set();

        words.forEach(w => {
            const key = w.cells.map(c => c.r + "," + c.c).join("|");
            if (!seen.has(key)) {
                seen.add(key);
                uniqueWords.push(w);
            }
        });

        if (!uniqueWords.length) {
            return { ok: false, message: "Make a word of at least 2 letters." };
        }

        const invalid = uniqueWords
            .map(w => w.word.toUpperCase())
            .filter(w => !WORD_SET.has(w));

        if (invalid.length) {
            return { ok: false, message: invalid.join(", ") + " not in dictionary." };
        }

        let score = uniqueWords.reduce((sum, w) => sum + scoreWord(s, w), 0);

        if (s.pending.length === 7) score += 50;

        return {
            ok: true,
            words: uniqueWords.map(w => w.word.toUpperCase()),
            score,
            message: uniqueWords.map(w => w.word.toUpperCase()).join(", ") + " scored " + score + "."
        };
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

        const amHost = window.chaserGame?.hostId === myId();

        if (amHost || !window.scrabbleState) {
            window.scrabbleState = createState();
            syncScrabble();
        }

        loadDictionary().then(() => renderScrabble());
        renderScrabble();
    };

    window.pickScrabbleTile = function (idx) {
        const s = window.scrabbleState;
        if (!s || !isMyTurn()) return;

        s.selectedRack = idx;
        renderScrabble();
    };

    window.placeScrabbleTile = function (r, c) {
        const s = window.scrabbleState;
        const p = currentPlayer();

        if (!s || !p || !isMyTurn()) return;
        if (s.board[r][c]) return;
        if (s.selectedRack === null) return;

        const letter = p.rack[s.selectedRack];
        if (!letter) return;

        s.board[r][c] = { letter, pending: true, owner: p.id };
        s.pending.push({ r, c, letter });
        p.rack.splice(s.selectedRack, 1);
        s.selectedRack = null;
        s.message = "";

        renderScrabble();
        syncScrabble();
    };

    window.undoScrabbleMove = function () {
        const s = window.scrabbleState;
        const p = currentPlayer();

        if (!s || !p || !isMyTurn()) return;

        s.pending.forEach(t => {
            p.rack.push(t.letter);
            s.board[t.r][t.c] = null;
        });

        s.pending = [];
        s.selectedRack = null;
        s.message = "";

        renderScrabble();
        syncScrabble();
    };

    window.submitScrabbleMove = function () {
        const s = window.scrabbleState;
        const p = currentPlayer();

        if (!s || !p || !isMyTurn() || !s.pending.length) return;

        const result = validateMove(s);

        if (!result.ok) {
            s.message = result.message;
            renderScrabble();
            syncScrabble();
            return;
        }

        p.score += result.score;

        s.pending.forEach(t => {
            if (s.board[t.r][t.c]) s.board[t.r][t.c].pending = false;
        });

        s.pending = [];
        drawTiles(s, p);
        s.turn = (s.turn + 1) % s.players.length;
        s.selectedRack = null;
        s.lastMessage = p.name + ": " + result.message;
        s.message = "";

        renderScrabble();
        syncScrabble();
    };

    window.passScrabbleTurn = function () {
        const s = window.scrabbleState;
        const p = currentPlayer();

        if (!s || !p || !isMyTurn()) return;

        s.pending.forEach(t => {
            p.rack.push(t.letter);
            s.board[t.r][t.c] = null;
        });

        s.pending = [];
        s.selectedRack = null;
        s.turn = (s.turn + 1) % s.players.length;
        s.lastMessage = p.name + " passed.";
        s.message = "";

        renderScrabble();
        syncScrabble();
    };

    window.handleIncomingScrabbleSync = function (payload) {
        if (!payload || !payload.state) return;
        if (payload.roomGameId && window.chaserGame?.activeGameId && payload.roomGameId !== window.chaserGame.activeGameId) return;

        window.scrabbleState = payload.state;
        if (window.chaserGame) window.chaserGame.activeGame = "Scrabble";
        renderScrabble();
    };

    function renderScrabble() {
        const el = canvas();
        const s = window.scrabbleState;
        if (!el || !s) return;

        const p = currentPlayer();
        const me = s.players.find(x => x.id === myId()) || s.players[0];
        const myTurn = isMyTurn();

        const boardHtml = s.board.map((row, r) =>
            row.map((cell, c) => {
                const premium = premiumAt(r, c);
                const premiumClass = premium === "★" ? "center" : premium.toLowerCase();

                return `
                    <button class="sc-cell ${premiumClass} ${cell?.pending ? "pending" : ""}" onclick="placeScrabbleTile(${r},${c})" type="button">
                        ${cell ? `<b>${cell.letter}</b><small>${VALUES[cell.letter] || 0}</small>` : `<span>${premium}</span>`}
                    </button>
                `;
            }).join("")
        ).join("");

        const rackHtml = me.rack.map((l, i) => `
            <button class="sc-tile ${s.selectedRack === i ? "selected" : ""}" onclick="pickScrabbleTile(${i})" type="button">
                <b>${l}</b><small>${VALUES[l] || 0}</small>
            </button>
        `).join("");

        el.innerHTML = `
            <style>
                .sc-wrap {
                    height:100%;
                    overflow:auto;
                    padding:8px 8px 76px;
                    box-sizing:border-box;
                    color:#e2f0d9;
                    font-family:Arial,sans-serif;
                }

                .sc-score {
                    display:grid;
                    grid-template-columns:repeat(2,minmax(0,1fr));
                    gap:7px;
                    max-width:500px;
                    margin:0 auto 8px;
                }

                .sc-player {
                    background:#e2f0d9;
                    color:#1e4620;
                    border:3px solid #e2f0d9;
                    border-radius:9px;
                    padding:6px 8px;
                    font-weight:900;
                    text-align:center;
                    box-sizing:border-box;
                    min-width:0;
                }

                .sc-player.turn {
                    border-color:#ff0000;
                    box-shadow:0 0 0 2px #ff0000;
                }

                .sc-player-name {
                    font-size:17px;
                    white-space:nowrap;
                    overflow:hidden;
                    text-overflow:ellipsis;
                    line-height:1.1;
                }

                .sc-player-score {
                    font-size:14px;
                    line-height:1.1;
                    margin-top:2px;
                }

                .sc-board {
                    display:grid;
                    grid-template-columns:repeat(15,1fr);
                    gap:1px;
                    background:#0b2410;
                    border:3px solid #ffd700;
                    border-radius:8px;
                    padding:3px;
                    max-width:520px;
                    margin:0 auto;
                }

                .sc-cell {
                    aspect-ratio:1/1;
                    border:1px solid rgba(0,0,0,.45);
                    background:#d9ead3;
                    color:#1e4620;
                    font-size:12px;
                    font-weight:900;
                    padding:0;
                    position:relative;
                    overflow:hidden;
                    line-height:1;
                }

                .sc-cell span {
                    font-size:9px;
                    font-weight:900;
                    opacity:.78;
                }

                .sc-cell.tw { background:#e06666; color:#ffffff; }
                .sc-cell.dw { background:#f4cccc; color:#7a0000; }
                .sc-cell.tl { background:#3d85c6; color:#ffffff; }
                .sc-cell.dl { background:#9fc5e8; color:#073763; }
                .sc-cell.center { background:#f4cccc; color:#7a0000; }

                .sc-cell.pending {
                    background:#ffd700 !important;
                    color:#1e4620 !important;
                }

                .sc-cell b {
                    font-size:15px;
                    display:block;
                    line-height:1;
                }

                .sc-cell small,
                .sc-tile small {
                    position:absolute;
                    right:2px;
                    bottom:1px;
                    font-size:8px;
                }

                .sc-rack {
                    display:flex;
                    justify-content:center;
                    gap:5px;
                    margin:8px auto;
                    flex-wrap:wrap;
                }

                .sc-tile {
                    position:relative;
                    width:38px;
                    height:42px;
                    border-radius:8px;
                    border:2px solid #1e4620;
                    background:#fff3c4;
                    color:#1e4620;
                    font-size:20px;
                    font-weight:900;
                    box-shadow:0 2px 5px rgba(0,0,0,.35);
                }

                .sc-tile.selected {
                    border:4px solid #ff0000;
                    transform:translateY(-4px);
                }

                .sc-msg {
                    text-align:center;
                    color:#ffd700;
                    font-weight:900;
                    margin:4px auto 6px;
                    max-width:500px;
                    font-size:13px;
                    line-height:1.15;
                }

                .sc-msg.error {
                    color:#ffffff;
                    background:#b00020;
                    border-radius:8px;
                    padding:5px 6px;
                }

                .sc-actions {
                    display:flex;
                    gap:8px;
                    justify-content:center;
                    margin-bottom:10px;
                }

                .sc-actions button {
                    border:none;
                    border-radius:10px;
                    padding:9px 12px;
                    font-weight:900;
                    background:#ffd700;
                    color:#1e4620;
                }

                .sc-actions button:disabled {
                    background:#777;
                    color:#222;
                }

                @media (max-width:390px) {
                    .sc-player-name { font-size:15px; }
                    .sc-player-score { font-size:13px; }
                    .sc-cell span { font-size:7px; }
                    .sc-cell b { font-size:13px; }
                    .sc-tile { width:35px; height:39px; }
                }
            </style>

            <div class="sc-wrap">
                <div class="sc-score">
                    ${s.players.map(x => `
                        <div class="sc-player ${x.id === p.id ? "turn" : ""}">
                            <div class="sc-player-name">${x.name}</div>
                            <div class="sc-player-score">${x.score} points</div>
                        </div>
                    `).join("")}
                </div>

                <div class="sc-board">${boardHtml}</div>

                <div class="sc-rack">${rackHtml}</div>

                ${s.message ? `<div class="sc-msg error">${s.message}</div>` : ""}
                ${s.lastMessage && !s.message ? `<div class="sc-msg">${s.lastMessage}</div>` : ""}

                <div class="sc-actions">
                    <button onclick="submitScrabbleMove()" ${myTurn && s.pending.length ? "" : "disabled"} type="button">Submit</button>
                    <button onclick="undoScrabbleMove()" ${myTurn && s.pending.length ? "" : "disabled"} type="button">Undo</button>
                    <button onclick="passScrabbleTurn()" ${myTurn ? "" : "disabled"} type="button">Pass</button>
                </div>
            </div>
        `;
    }
})();
/* SCRABBLE BOARD FIX v2 — stable board + phone pan/pinch zoom */
(function () {
    if (window.__scrabbleBoardPanZoomFixV2) return;
    window.__scrabbleBoardPanZoomFixV2 = true;

    let boardScale = 1;
    let lastScrollLeft = null;
    let lastScrollTop = null;

    const style = document.createElement("style");
    style.innerHTML = `
        .sc-board-zoom-wrap {
            width:100% !important;
            max-width:520px !important;
            margin:0 auto !important;
            overflow:auto !important;
            -webkit-overflow-scrolling:touch !important;
            touch-action:pan-x pan-y !important;
            box-sizing:border-box !important;
            border:3px solid #ffd700 !important;
            border-radius:8px !important;
            background:#0b2410 !important;
        }

        .sc-board-scale-shell {
            position:relative !important;
            width:500px !important;
            height:500px !important;
            min-width:500px !important;
            min-height:500px !important;
            transform-origin:top left !important;
        }

        .sc-board {
            width:500px !important;
            height:500px !important;
            min-width:500px !important;
            min-height:500px !important;
            max-width:none !important;
            margin:0 !important;
            border:0 !important;
            border-radius:0 !important;
            display:grid !important;
            grid-template-columns:repeat(15, 1fr) !important;
            grid-template-rows:repeat(15, 1fr) !important;
            gap:1px !important;
            box-sizing:border-box !important;
            transform-origin:top left !important;
            flex-shrink:0 !important;
        }

        .sc-cell {
            width:auto !important;
            height:auto !important;
            min-width:0 !important;
            min-height:0 !important;
            aspect-ratio:auto !important;
            box-sizing:border-box !important;
            touch-action:manipulation !important;
        }

        .sc-cell b {
            font-size:15px !important;
            line-height:1 !important;
        }

        .sc-cell span {
            font-size:8px !important;
            line-height:1 !important;
        }

        @media (max-width:430px) {
            .sc-board-scale-shell {
                width:480px !important;
                height:480px !important;
                min-width:480px !important;
                min-height:480px !important;
            }

            .sc-board {
                width:480px !important;
                height:480px !important;
                min-width:480px !important;
                min-height:480px !important;
            }
        }
    `;
    document.head.appendChild(style);

    function isScrabbleOpen() {
        return window.chaserGame &&
            String(window.chaserGame.activeGame || "").toLowerCase() === "scrabble";
    }

    function getBaseSize() {
        return window.innerWidth <= 430 ? 480 : 500;
    }

    function distance(t1, t2) {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function applyBoardScale(board, shell) {
        const base = getBaseSize();
        const scaled = base * boardScale;

        shell.style.width = scaled + "px";
        shell.style.height = scaled + "px";
        shell.style.minWidth = scaled + "px";
        shell.style.minHeight = scaled + "px";

        board.style.transform = "scale(" + boardScale + ")";
    }

    function centerBoardIfNeeded(wrap) {
        requestAnimationFrame(() => {
            if (lastScrollLeft === null) {
                wrap.scrollLeft = Math.max(0, (wrap.scrollWidth - wrap.clientWidth) / 2);
                wrap.scrollTop = 0;
            } else {
                wrap.scrollLeft = lastScrollLeft;
                wrap.scrollTop = lastScrollTop || 0;
            }
        });
    }

    function setupScrabbleBoardZoom() {
        if (!isScrabbleOpen()) return;

        const canvas = document.getElementById("gameCanvasContainer");
        if (!canvas) return;

        const board = canvas.querySelector(".sc-board");
        if (!board) return;

        let wrap = board.closest(".sc-board-zoom-wrap");
        let shell = board.closest(".sc-board-scale-shell");

        if (!wrap || !shell) {
            const originalParent = board.parentElement;

            wrap = document.createElement("div");
            wrap.className = "sc-board-zoom-wrap";

            shell = document.createElement("div");
            shell.className = "sc-board-scale-shell";

            originalParent.insertBefore(wrap, board);
            wrap.appendChild(shell);
            shell.appendChild(board);

            centerBoardIfNeeded(wrap);
        }

        applyBoardScale(board, shell);

        if (wrap.__scrabbleZoomWiredV2) return;
        wrap.__scrabbleZoomWiredV2 = true;

        wrap.addEventListener("scroll", function () {
            lastScrollLeft = wrap.scrollLeft;
            lastScrollTop = wrap.scrollTop;
        }, { passive:true });

        let startDistance = 0;
        let startScale = boardScale;

        wrap.addEventListener("touchstart", function (e) {
            if (e.touches.length === 2) {
                startDistance = distance(e.touches[0], e.touches[1]);
                startScale = boardScale;
            }
        }, { passive:false });

        wrap.addEventListener("touchmove", function (e) {
            if (e.touches.length === 2) {
                e.preventDefault();

                const newDistance = distance(e.touches[0], e.touches[1]);
                if (!startDistance) return;

                let nextScale = startScale * (newDistance / startDistance);
                nextScale = Math.max(0.85, Math.min(2.2, nextScale));

                boardScale = nextScale;
                applyBoardScale(board, shell);
            }
        }, { passive:false });

        wrap.addEventListener("dblclick", function () {
            boardScale = 1;
            lastScrollLeft = null;
            lastScrollTop = null;
            applyBoardScale(board, shell);
            centerBoardIfNeeded(wrap);
        });
    }

    setInterval(setupScrabbleBoardZoom, 150);
})();
