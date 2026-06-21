/* CHASER SCRABBLE - SEPARATE GAME FILE */
(function () {
    "use strict";

    const LETTERS = "EEEEEEEEEEEEAAAAAAAAAIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ".split("");
    const VALUES = { A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10 };

    function myId() {
        return window.myId || localStorage.getItem("rider_id") || "local-player";
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
            message: "Place tiles, then submit your word."
        };

        s.players.forEach(p => drawTiles(s, p));
        return s;
    }

    function currentPlayer() {
        const s = window.scrabbleState;
        return s.players[s.turn];
    }

    function isMyTurn() {
        const p = currentPlayer();
        return p && p.id === myId();
    }

    function scorePending(s) {
        let total = 0;
        s.pending.forEach(t => total += VALUES[t.letter] || 0);
        return Math.max(total, 0);
    }

    window.initScrabbleGame = function () {
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
        s.message = "Tile placed. Submit or undo.";

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
        s.message = "Move undone.";

        renderScrabble();
        syncScrabble();
    };

    window.submitScrabbleMove = function () {
        const s = window.scrabbleState;
        const p = currentPlayer();

        if (!s || !p || !isMyTurn() || !s.pending.length) return;

        const gained = scorePending(s);
        p.score += gained;

        s.pending.forEach(t => {
            if (s.board[t.r][t.c]) s.board[t.r][t.c].pending = false;
        });

        s.pending = [];
        drawTiles(s, p);
        s.turn = (s.turn + 1) % s.players.length;
        s.selectedRack = null;
        s.message = p.name + " scored " + gained + " points.";

        renderScrabble();
        syncScrabble();
    };

    window.passScrabbleTurn = function () {
        const s = window.scrabbleState;
        if (!s || !isMyTurn()) return;

        undoScrabbleMove();
        s.turn = (s.turn + 1) % s.players.length;
        s.message = "Turn passed.";

        renderScrabble();
        syncScrabble();
    };

    window.handleIncomingScrabbleSync = function (payload) {
        if (!payload || !payload.state) return;
        if (payload.roomGameId && window.chaserGame?.activeGameId && payload.roomGameId !== window.chaserGame.activeGameId) return;

        window.scrabbleState = payload.state;
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
            row.map((cell, c) => `
                <button class="sc-cell ${cell?.pending ? "pending" : ""}" onclick="placeScrabbleTile(${r},${c})">
                    ${cell ? `<b>${cell.letter}</b><small>${VALUES[cell.letter] || 0}</small>` : ""}
                </button>
            `).join("")
        ).join("");

        const rackHtml = me.rack.map((l, i) => `
            <button class="sc-tile ${s.selectedRack === i ? "selected" : ""}" onclick="pickScrabbleTile(${i})">
                <b>${l}</b><small>${VALUES[l] || 0}</small>
            </button>
        `).join("");

        el.innerHTML = `
            <style>
                .sc-wrap{height:100%;overflow:auto;padding:8px 8px 58px;box-sizing:border-box;color:#e2f0d9;font-family:Arial,sans-serif;}
                .sc-title{text-align:center;color:#ffd700;font-size:28px;font-weight:900;margin-bottom:6px;}
                .sc-score{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:6px;}
                .sc-player{background:#e2f0d9;color:#1e4620;border-radius:8px;padding:5px 8px;font-weight:900;}
                .sc-player.turn{border:3px solid #ff0000;}
                .sc-board{display:grid;grid-template-columns:repeat(15,1fr);gap:1px;background:#0b2410;border:3px solid #ffd700;border-radius:8px;padding:3px;max-width:520px;margin:0 auto;}
                .sc-cell{aspect-ratio:1/1;border:1px solid rgba(255,255,255,.25);background:#d9ead3;color:#1e4620;font-size:13px;font-weight:900;padding:0;position:relative;}
                .sc-cell.pending{background:#ffd700;}
                .sc-cell small,.sc-tile small{position:absolute;right:2px;bottom:1px;font-size:8px;}
                .sc-rack{display:flex;justify-content:center;gap:5px;margin:8px auto;flex-wrap:wrap;}
                .sc-tile{position:relative;width:38px;height:42px;border-radius:8px;border:2px solid #1e4620;background:#fff3c4;color:#1e4620;font-size:20px;font-weight:900;box-shadow:0 2px 5px rgba(0,0,0,.35);}
                .sc-tile.selected{border:4px solid #ff0000;transform:translateY(-4px);}
                .sc-msg{text-align:center;color:#ffd700;font-weight:900;margin:6px;}
                .sc-actions{display:flex;gap:8px;justify-content:center;margin-bottom:10px;}
                .sc-actions button{border:none;border-radius:10px;padding:9px 12px;font-weight:900;background:#ffd700;color:#1e4620;}
                .sc-actions button:disabled{background:#777;color:#222;}
            </style>

            <div class="sc-wrap">
                <div class="sc-title">SCRABBLE</div>

                <div class="sc-score">
                    ${s.players.map(x => `
                        <div class="sc-player ${x.id === p.id ? "turn" : ""}">
                            ${x.name}: ${x.score}
                        </div>
                    `).join("")}
                </div>

                <div class="sc-msg">${p.name}'s turn ${myTurn ? "— your move" : "— waiting"}<br>${s.message}</div>

                <div class="sc-board">${boardHtml}</div>

                <div class="sc-rack">${rackHtml}</div>

                <div class="sc-actions">
                    <button onclick="submitScrabbleMove()" ${myTurn && s.pending.length ? "" : "disabled"}>Submit</button>
                    <button onclick="undoScrabbleMove()" ${myTurn && s.pending.length ? "" : "disabled"}>Undo</button>
                    <button onclick="passScrabbleTurn()" ${myTurn ? "" : "disabled"}>Pass</button>
                </div>
            </div>
        `;
    }
})();
