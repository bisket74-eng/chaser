/* CHASER BATTLESHIP - SEPARATE GAME FILE
2-player synced Battleship + optional computer opponent
*/
(function () {
"use strict";


const BOARD_SIZE = 10;

const SHIPS = [
    { id: "carrier", name: "Carrier", size: 5 },
    { id: "battleship", name: "Battleship", size: 4 },
    { id: "cruiser", name: "Cruiser", size: 3 },
    { id: "submarine", name: "Submarine", size: 3 },
    { id: "destroyer", name: "Destroyer", size: 2 }
];

const COMPUTER_ID = "battleship-computer";

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

function stage() {
    return document.getElementById("activeGameStage");
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function syncBattleship() {
    if (typeof channel !== "undefined" && channel && window.battleshipState) {
        channel.send({
            type: "broadcast",
            event: "battleship-sync-state",
            payload: {
                state: window.battleshipState,
                roomGameId: window.chaserGame && window.chaserGame.activeGameId ? window.chaserGame.activeGameId : null
            }
        });
    }
}

function setHeader() {
    const roomDisplay = document.getElementById("roomDisplayCode");
    const headerBtns = document.getElementById("headerActionButtonsContainer");
    const chatHeader = document.getElementById("chatHeader");

    if (roomDisplay) roomDisplay.innerText = "🚢 Battleship";
    if (headerBtns) headerBtns.style.display = "none";
    if (chatHeader) chatHeader.classList.add("game-active-mode");
}

function openStage() {
    const s = stage();
    if (s) s.classList.add("open");
}

function emptyBoard() {
    return Array.from({ length: BOARD_SIZE }, function () {
        return Array.from({ length: BOARD_SIZE }, function () {
            return {
                ship: null,
                shot: false
            };
        });
    });
}

function makePlayers() {
    const lobbyPlayers = window.chaserGame && window.chaserGame.players && window.chaserGame.players.length
        ? window.chaserGame.players
        : [{ id: getMyId(), name: myName(), seat: 0 }];

    return lobbyPlayers.slice(0, 2).map(function (p, idx) {
        return {
            id: p.id,
            name: p.name || "Player " + (idx + 1),
            isComputer: false,
            ready: false,
            hits: 0,
            board: emptyBoard(),
            ships: []
        };
    });
}

function createState() {
    return {
        phase: "setup",
        players: makePlayers(),
        turn: 0,
        winnerId: null,
        message: "Place your fleet or use Random Fleet.",
        lastShot: ""
    };
}

function currentPlayer() {
    const st = window.battleshipState;
    return st && st.players[st.turn];
}

function myPlayer() {
    const st = window.battleshipState;
    if (!st) return null;

    return st.players.find(function (p) {
        return p.id === getMyId();
    }) || null;
}

function opponentFor(playerId) {
    const st = window.battleshipState;
    if (!st) return null;

    return st.players.find(function (p) {
        return p.id !== playerId;
    }) || null;
}

function isMyTurn() {
    const p = currentPlayer();
    return p && p.id === getMyId();
}

function cloneBoard(board) {
    return board.map(function (row) {
        return row.map(function (cell) {
            return {
                ship: cell.ship,
                shot: !!cell.shot
            };
        });
    });
}

function canPlaceShip(board, row, col, size, horizontal) {
    for (let i = 0; i < size; i++) {
        const r = row + (horizontal ? 0 : i);
        const c = col + (horizontal ? i : 0);

        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
        if (board[r][c].ship) return false;
    }

    return true;
}

function placeShip(board, ship, row, col, horizontal) {
    const positions = [];

    for (let i = 0; i < ship.size; i++) {
        const r = row + (horizontal ? 0 : i);
        const c = col + (horizontal ? i : 0);

        board[r][c].ship = ship.id;
        positions.push({ r: r, c: c });
    }

    return {
        id: ship.id,
        name: ship.name,
        size: ship.size,
        positions: positions
    };
}

function randomFleet() {
    const board = emptyBoard();
    const placedShips = [];

    SHIPS.forEach(function (ship) {
        let placed = false;
        let tries = 0;

        while (!placed && tries < 500) {
            tries++;

            const horizontal = Math.random() < 0.5;
            const row = Math.floor(Math.random() * BOARD_SIZE);
            const col = Math.floor(Math.random() * BOARD_SIZE);

            if (canPlaceShip(board, row, col, ship.size, horizontal)) {
                placedShips.push(placeShip(board, ship, row, col, horizontal));
                placed = true;
            }
        }
    });

    return {
        board: board,
        ships: placedShips
    };
}

function shipIsSunk(player, shipId) {
    const ship = player.ships.find(function (s) {
        return s.id === shipId;
    });

    if (!ship) return false;

    return ship.positions.every(function (pos) {
        return player.board[pos.r][pos.c].shot;
    });
}

function allShipsSunk(player) {
    if (!player || !player.ships || !player.ships.length) return false;

    return player.ships.every(function (ship) {
        return shipIsSunk(player, ship.id);
    });
}

function countHits(player) {
    let hits = 0;

    player.board.forEach(function (row) {
        row.forEach(function (cell) {
            if (cell.shot && cell.ship) hits++;
        });
    });

    return hits;
}

function startBattleIfReady() {
    const st = window.battleshipState;
    if (!st) return;

    if (st.players.length < 2) {
        st.message = "Add a second player or play the computer.";
        return;
    }

    const allReady = st.players.every(function (p) {
        return p.ready && p.ships && p.ships.length === SHIPS.length;
    });

    if (allReady) {
        st.phase = "battle";

        if (!st.players[st.turn]) st.turn = 0;

        st.message = st.players[st.turn].name + "'s turn.";
    }
}

function nextTurn() {
    const st = window.battleshipState;
    if (!st) return;

    st.turn = (st.turn + 1) % st.players.length;
    st.message = st.players[st.turn].name + "'s turn.";
}

function fireAt(attackerId, targetId, row, col) {
    const st = window.battleshipState;
    if (!st || st.phase !== "battle") return;

    const attacker = st.players.find(function (p) {
        return p.id === attackerId;
    });

    const target = st.players.find(function (p) {
        return p.id === targetId;
    });

    if (!attacker || !target) return;

    const cell = target.board[row][col];

    if (!cell || cell.shot) return;

    cell.shot = true;

    let resultText = "";

    if (cell.ship) {
        attacker.hits = countHits(target);

        const sunk = shipIsSunk(target, cell.ship);
        const ship = target.ships.find(function (s) {
            return s.id === cell.ship;
        });

        if (sunk && ship) {
            resultText = attacker.name + " hit and sank " + target.name + "'s " + ship.name + "!";
        } else {
            resultText = attacker.name + " hit!";
        }
    } else {
        resultText = attacker.name + " missed.";
    }

    st.lastShot = resultText;

    if (allShipsSunk(target)) {
        st.phase = "gameover";
        st.winnerId = attacker.id;
        st.message = attacker.name + " wins!";
        return;
    }

    nextTurn();
}

function computerChooseShot(computer, human) {
    const hitCells = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = human.board[r][c];

            if (cell.shot && cell.ship && !shipIsSunk(human, cell.ship)) {
                hitCells.push({ r: r, c: c });
            }
        }
    }

    const choices = [];

    hitCells.forEach(function (hit) {
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(function (dir) {
            const nr = hit.r + dir[0];
            const nc = hit.c + dir[1];

            if (
                nr >= 0 &&
                nr < BOARD_SIZE &&
                nc >= 0 &&
                nc < BOARD_SIZE &&
                !human.board[nr][nc].shot
            ) {
                choices.push({ r: nr, c: nc });
            }
        });
    });

    if (choices.length) {
        return choices[Math.floor(Math.random() * choices.length)];
    }

    const open = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (!human.board[r][c].shot) {
                open.push({ r: r, c: c });
            }
        }
    }

    if (!open.length) return null;

    return open[Math.floor(Math.random() * open.length)];
}

function maybeComputerMove() {
    const st = window.battleshipState;
    if (!st || st.phase !== "battle") return;

    const p = currentPlayer();
    if (!p || !p.isComputer) return;

    if (window.__battleshipComputerThinking) return;
    window.__battleshipComputerThinking = true;

    setTimeout(function () {
        window.__battleshipComputerThinking = false;

        const current = currentPlayer();
        if (!current || !current.isComputer || st.phase !== "battle") return;

        const target = st.players.find(function (player) {
            return !player.isComputer;
        });

        if (!target) return;

        const shot = computerChooseShot(current, target);
        if (!shot) return;

        fireAt(current.id, target.id, shot.r, shot.c);
        renderBattleship();
        syncBattleship();
    }, 750);
}

window.initBattleshipGame = function () {
    window.chaserGame = window.chaserGame || {};
    window.chaserGame.activeGame = "Battleship";

    openStage();
    setHeader();

    const amHost = window.chaserGame && window.chaserGame.hostId === getMyId();

    if (amHost || !window.battleshipState) {
        window.battleshipState = createState();
        syncBattleship();
    }

    renderBattleship();
};

window.handleIncomingBattleshipSync = function (payload) {
    if (!payload || !payload.state) return;

    if (
        payload.roomGameId &&
        window.chaserGame &&
        window.chaserGame.activeGameId &&
        payload.roomGameId !== window.chaserGame.activeGameId
    ) {
        return;
    }

    window.battleshipState = payload.state;

    if (window.chaserGame) window.chaserGame.activeGame = "Battleship";

    renderBattleship();
};

window.randomizeBattleshipFleet = function () {
    const st = window.battleshipState;
    const me = myPlayer();

    if (!st || !me || st.phase !== "setup") return;

    const fleet = randomFleet();

    me.board = fleet.board;
    me.ships = fleet.ships;
    me.ready = false;
    st.message = "Fleet placed. Tap Ready when you are done.";

    renderBattleship();
    syncBattleship();
};

window.readyBattleshipFleet = function () {
    const st = window.battleshipState;
    const me = myPlayer();

    if (!st || !me || st.phase !== "setup") return;

    if (!me.ships || me.ships.length !== SHIPS.length) {
        st.message = "Place your fleet first.";
        renderBattleship();
        return;
    }

    me.ready = true;
    st.message = me.name + " is ready.";

    startBattleIfReady();

    renderBattleship();
    syncBattleship();
    maybeComputerMove();
};

window.playBattleshipComputer = function () {
    const st = window.battleshipState;
    if (!st || st.phase !== "setup") return;

    if (st.players.some(function (p) { return p.id === COMPUTER_ID; })) return;

    if (st.players.length >= 2) {
        st.message = "This game already has two players.";
        renderBattleship();
        return;
    }

    const fleet = randomFleet();

    st.players.push({
        id: COMPUTER_ID,
        name: "Computer",
        isComputer: true,
        ready: true,
        hits: 0,
        board: fleet.board,
        ships: fleet.ships
    });

    st.message = "Computer added. Place your fleet and tap Ready.";

    renderBattleship();
    syncBattleship();
};

window.fireBattleshipShot = function (row, col) {
    const st = window.battleshipState;
    const me = myPlayer();

    if (!st || !me || st.phase !== "battle") return;
    if (!isMyTurn()) return;

    const enemy = opponentFor(me.id);
    if (!enemy) return;

    if (enemy.board[row][col].shot) return;

    fireAt(me.id, enemy.id, row, col);

    renderBattleship();
    syncBattleship();
    maybeComputerMove();
};

window.newBattleshipGame = function () {
    window.battleshipState = createState();
    renderBattleship();
    syncBattleship();
};

function buildScoreHtml(st) {
    return st.players.map(function (p, idx) {
        const active = st.phase === "battle" && idx === st.turn;
        const ready = st.phase === "setup" && p.ready;

        return (
            "<div class=\"bs-player " + (active ? "turn" : "") + "\">" +
                "<div class=\"bs-player-name\">" + escapeHtml(p.name) + "</div>" +
                "<div class=\"bs-player-info\">" +
                    (st.phase === "setup" ? (ready ? "Ready" : "Not ready") : (Number(p.hits || 0) + " hits")) +
                "</div>" +
            "</div>"
        );
    }).join("");
}

function buildTargetBoard(enemy, disabled) {
    if (!enemy) {
        return "<div class=\"bs-empty-note\">Waiting for opponent.</div>";
    }

    let html = "";

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = enemy.board[r][c];
            const cls = cell.shot ? (cell.ship ? "hit" : "miss") : "";
            const label = cell.shot ? (cell.ship ? "✹" : "•") : "";

            html += (
                "<button class=\"bs-cell " + cls + "\" " +
                (disabled || cell.shot ? "disabled" : "") +
                " onclick=\"fireBattleshipShot(" + r + "," + c + ")\" type=\"button\">" +
                label +
                "</button>"
            );
        }
    }

    return html;
}

function buildOwnBoard(player) {
    if (!player) return "";

    let html = "";

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = player.board[r][c];
            let cls = "";
            let label = "";

            if (cell.ship) {
                cls += " ship";
                label = "■";
            }

            if (cell.shot && cell.ship) {
                cls += " hit";
                label = "✹";
            }

            if (cell.shot && !cell.ship) {
                cls += " miss";
                label = "•";
            }

            html += "<button class=\"bs-cell " + cls + "\" disabled type=\"button\">" + label + "</button>";
        }
    }

    return html;
}

function buildShipStatus(player) {
    if (!player || !player.ships || !player.ships.length) {
        return "No fleet placed yet.";
    }

    return player.ships.map(function (ship) {
        return (shipIsSunk(player, ship.id) ? "☠ " : "🚢 ") + ship.name;
    }).join(" · ");
}

function renderBattleship() {
    const el = canvas();
    const st = window.battleshipState;

    if (!el || !st) return;

    const me = myPlayer();
    const enemy = me ? opponentFor(me.id) : null;
    const myTurn = isMyTurn();
    const setup = st.phase === "setup";
    const battle = st.phase === "battle";
    const gameOver = st.phase === "gameover";

    const hasComputer = st.players.some(function (p) {
        return p.isComputer;
    });

    const canFire = battle && myTurn && enemy && !currentPlayer().isComputer;

    let mainMessage = st.message || "";

    if (battle && myTurn) {
        mainMessage = "Your turn. Fire at the enemy board.";
    }

    if (battle && !myTurn) {
        mainMessage = "Waiting for " + currentPlayer().name + ".";
    }

    if (gameOver) {
        const winner = st.players.find(function (p) {
            return p.id === st.winnerId;
        });

        mainMessage = (winner ? winner.name : "Someone") + " wins!";
    }

    const setupButtons = setup ? (
        "<div class=\"bs-actions\">" +
            "<button onclick=\"randomizeBattleshipFleet()\" type=\"button\">Random Fleet</button>" +
            "<button onclick=\"readyBattleshipFleet()\" type=\"button\">Ready</button>" +
            (!hasComputer && st.players.length < 2 ? "<button onclick=\"playBattleshipComputer()\" class=\"bs-blue\" type=\"button\">Play Computer</button>" : "") +
            "<button onclick=\"newBattleshipGame()\" type=\"button\">New</button>" +
        "</div>"
    ) : "";

    const gameButtons = !setup ? (
        "<div class=\"bs-actions\">" +
            "<button onclick=\"newBattleshipGame()\" type=\"button\">New Game</button>" +
        "</div>"
    ) : "";

    el.innerHTML = [
        "<style>",
            ".bs-wrap{height:100%;overflow:auto;padding:8px 8px 70px;box-sizing:border-box;font-family:Arial,sans-serif;color:#e2f0d9;}",
            ".bs-score{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;width:100%;max-width:560px;margin:0 auto 8px;}",
            ".bs-player{background:#e2f0d9;color:#1e4620;border:3px solid #e2f0d9;border-radius:9px;padding:6px 8px;text-align:center;font-weight:900;box-sizing:border-box;min-width:0;}",
            ".bs-player.turn{border-color:#ff0000;box-shadow:0 0 0 2px #ff0000;}",
            ".bs-player-name{font-size:16px;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            ".bs-player-info{font-size:13px;line-height:1.05;margin-top:2px;}",
            ".bs-msg{text-align:center;color:#ffd700;font-weight:900;font-size:14px;line-height:1.15;margin:4px auto 8px;max-width:560px;}",
            ".bs-last{text-align:center;color:#e2f0d9;font-size:12px;font-weight:900;margin:-2px auto 6px;max-width:560px;}",

            ".bs-section-title{text-align:center;color:#ffd700;font-size:17px;font-weight:900;margin:8px auto 5px;}",
            ".bs-boards{display:grid;grid-template-columns:1fr;gap:8px;max-width:560px;margin:0 auto;}",
            ".bs-board{display:grid;grid-template-columns:repeat(10,1fr);gap:2px;background:#0b2410;border:3px solid #ffd700;border-radius:10px;padding:4px;box-sizing:border-box;touch-action:manipulation;}",
            ".bs-cell{aspect-ratio:1/1;border:1px solid rgba(255,255,255,.28);border-radius:4px;background:#8fc5e8;color:#082f49;font-size:15px;font-weight:900;display:flex;align-items:center;justify-content:center;padding:0;line-height:1;box-sizing:border-box;}",
            ".bs-cell.ship{background:#78909c;color:#ffffff;}",
            ".bs-cell.hit{background:#dc3545!important;color:#ffffff!important;}",
            ".bs-cell.miss{background:#e2f0d9!important;color:#1e4620!important;}",
            ".bs-cell:disabled{opacity:1;}",
            ".bs-empty-note{text-align:center;background:rgba(0,0,0,.25);border:2px dashed #ffd700;border-radius:10px;padding:16px;font-weight:900;color:#ffd700;}",

            ".bs-actions{display:flex;gap:7px;justify-content:center;flex-wrap:wrap;margin:8px auto 10px;max-width:560px;}",
            ".bs-actions button{border:none;border-radius:10px;padding:9px 11px;font-weight:900;background:#ffd700;color:#1e4620;}",
            ".bs-actions button.bs-blue{background:#1d4ed8;color:#ffffff;}",
            ".bs-status{font-size:12px;line-height:1.2;text-align:center;max-width:560px;margin:5px auto;color:#e2f0d9;font-weight:900;}",

            "@media(min-width:700px){",
                ".bs-boards{grid-template-columns:1fr 1fr;max-width:920px;}",
            "}",
            "@media(max-height:760px){",
                ".bs-wrap{padding-top:4px;}",
                ".bs-msg{font-size:13px;margin:3px auto 5px;}",
                ".bs-section-title{font-size:15px;margin:5px auto 3px;}",
                ".bs-actions button{padding:7px 9px;font-size:12px;}",
            "}",
        "</style>",

        "<div class=\"bs-wrap\">",
            "<div class=\"bs-score\">", buildScoreHtml(st), "</div>",
            "<div class=\"bs-msg\">", escapeHtml(mainMessage), "</div>",
            st.lastShot ? "<div class=\"bs-last\">" + escapeHtml(st.lastShot) + "</div>" : "",

            setupButtons,

            "<div class=\"bs-boards\">",
                "<div>",
                    "<div class=\"bs-section-title\">Enemy Waters</div>",
                    "<div class=\"bs-board\">", buildTargetBoard(enemy, !canFire), "</div>",
                    enemy ? "<div class=\"bs-status\">" + escapeHtml(buildShipStatus(enemy)) + "</div>" : "",
                "</div>",

                "<div>",
                    "<div class=\"bs-section-title\">Your Fleet</div>",
                    "<div class=\"bs-board\">", buildOwnBoard(me), "</div>",
                    me ? "<div class=\"bs-status\">" + escapeHtml(buildShipStatus(me)) + "</div>" : "",
                "</div>",
            "</div>",

            gameButtons,
        "</div>"
    ].join("");

    maybeComputerMove();
}


})();

