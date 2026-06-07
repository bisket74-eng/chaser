/* ============================================================
   CHASER ARCADE ENGINE – games.js
   REBUILT VERSION – PART 1 OF 3
   Foundation + Lobby + Checkers
   ============================================================ */

(function () {
    "use strict";

    const GAME_VERSION = "chaser-games-rebuild-1";

    const $ = (id) => document.getElementById(id);

    const gameStage = $("activeGameStage");
    const gameCanvas = $("gameCanvasContainer");
    const gameTitle = $("activeGameLabelTitle");
    const gameHub = $("gameHubOverlay");

    if (!gameStage || !gameCanvas) {
        console.error("Chaser games.js could not find required game containers.");
        return;
    }

    window.chaserGame = {
        version: GAME_VERSION,
        activeGame: null,
        activeGameId: null,
        expectedPlayers: 1,
        mySeat: null,
        hostId: null,
        players: [],
        state: {},
        timers: [],
        currentLobby: null
    };

    function myGameId() {
        if (window.myId) return window.myId;
        const stored = localStorage.getItem("rider_id");
        return stored || "local-" + Math.random().toString(36).slice(2);
    }

    function myGameName() {
        const input = document.getElementById("username");
        return (input && input.value.trim()) || localStorage.getItem("rider_saved_name") || "Player";
    }

    function sendGameEvent(event, payload) {
        if (typeof channel !== "undefined" && channel && typeof channel.send === "function") {
            channel.send({
                type: "broadcast",
                event,
                payload: {
                    ...payload,
                    senderId: myGameId(),
                    senderName: myGameName(),
                    roomGameId: window.chaserGame.activeGameId
                }
            });
        }
    }

    function clearGameTimers() {
        window.chaserGame.timers.forEach(t => {
            clearInterval(t);
            clearTimeout(t);
        });
        window.chaserGame.timers = [];
    }

    function makeGameId(gameName) {
        return gameName.replace(/\s+/g, "-").toLowerCase() + "-" + Date.now() + "-" + Math.floor(Math.random() * 9999);
    }

    function setGameHeader(title) {
        if (gameTitle) {
            gameTitle.innerText = title;
        }

        const roomDisplay = document.getElementById("roomDisplayCode");
        const headerBtns = document.getElementById("headerActionButtonsContainer");
        const chatHeader = document.getElementById("chatHeader");

        if (roomDisplay) {
            roomDisplay.innerText = title;
            roomDisplay.style.fontFamily = "'Trebuchet MS', sans-serif";
            roomDisplay.style.fontWeight = "900";
            roomDisplay.style.fontSize = "18px";
        }

        if (headerBtns) headerBtns.style.display = "none";
        if (chatHeader) chatHeader.classList.add("game-active-mode");
    }

    function restoreChatHeader() {
        const roomDisplay = document.getElementById("roomDisplayCode");
        const headerBtns = document.getElementById("headerActionButtonsContainer");
        const chatHeader = document.getElementById("chatHeader");

        if (headerBtns) headerBtns.style.display = "flex";
        if (chatHeader) chatHeader.classList.remove("game-active-mode");

        if (roomDisplay) {
            roomDisplay.style.fontFamily = "'Trebuchet MS', 'Arial Black', sans-serif";
            roomDisplay.style.fontWeight = "900";
            roomDisplay.style.fontSize = "22px";

            if (typeof activeRoomCode !== "undefined" && activeRoomCode) {
                roomDisplay.innerText = "Chat Room: " + activeRoomCode;
            } else {
                roomDisplay.innerText = "Chat Room";
            }
        }
    }

    function openGameStage() {
        gameStage.classList.add("open");
        gameStage.style.height = "72vh";
        gameStage.style.maxHeight = "580px";
    }

    function closeGameStage() {
        gameStage.classList.remove("open");
        gameStage.style.height = "";
        gameStage.style.maxHeight = "";
    }

    window.cleanupRunningGameEngine = function () {
        clearGameTimers();

        window.chaserGame.activeGame = null;
        window.chaserGame.activeGameId = null;
        window.chaserGame.expectedPlayers = 1;
        window.chaserGame.mySeat = null;
        window.chaserGame.hostId = null;
        window.chaserGame.players = [];
        window.chaserGame.state = {};
        window.chaserGame.currentLobby = null;

        gameCanvas.innerHTML = "";
    };

    window.shutdownActiveGame = function () {
        window.cleanupRunningGameEngine();
        closeGameStage();
        restoreChatHeader();
    };

    window.chaserMasterExitSequence = window.shutdownActiveGame;

    /* ============================================================
       GAME LAUNCH + PLAYER LOBBY
       ============================================================ */

    const GAME_CONFIG = {
        "Checkers": {
            icon: "🔴",
            minPlayers: 2,
            maxPlayers: 2,
            fixedPlayers: 2,
            multiplayer: true,
            init: initCheckersGame
        },
        "Sequence": {
            icon: "⚔️",
            minPlayers: 2,
            maxPlayers: 2,
            fixedPlayers: 2,
            multiplayer: true,
            init: () => {
                if (typeof window.initSequenceGame === "function") window.initSequenceGame();
            }
        },
        "Battle Uno": {
            icon: "🃏",
            displayName: "Uno",
            minPlayers: 2,
            maxPlayers: 10,
            multiplayer: true,
            init: () => {
                if (typeof window.initChaserUnoGame === "function") window.initChaserUnoGame();
            }
        },
        "Crew Trivia": {
            icon: "🧠",
            displayName: "Trivia",
            minPlayers: 1,
            maxPlayers: 10,
            multiplayer: true,
            init: () => {
                if (typeof window.initTriviaGame === "function") window.initTriviaGame();
            }
        },
        "Solitaire": {
            icon: "🃏",
            minPlayers: 1,
            maxPlayers: 1,
            fixedPlayers: 1,
            multiplayer: false,
            init: () => {
                if (typeof window.initSolitaireGame === "function") window.initSolitaireGame();
            }
        },
        "Hangman": {
            icon: "🪓",
            minPlayers: 1,
            maxPlayers: 1,
            fixedPlayers: 1,
            multiplayer: false,
            init: () => {
                if (typeof window.initHangmanGame === "function") window.initHangmanGame();
            }
        }
    };

    window.launchGameEngine = function (gameName, gameIcon) {
        if (gameHub) gameHub.classList.remove("open");

        const config = GAME_CONFIG[gameName];
        if (!config) {
            gameCanvas.innerHTML = `<div style="color:white;padding:20px;">Game not found.</div>`;
            return;
        }

        window.cleanupRunningGameEngine();

        const displayName = config.displayName || gameName;
        window.chaserGame.activeGame = displayName;
        window.chaserGame.activeGameId = makeGameId(displayName);
        window.chaserGame.players = [];
        window.chaserGame.hostId = myGameId();

        openGameStage();
        setGameHeader(`${config.icon || gameIcon || "🎮"} ${displayName}`);

        if (config.fixedPlayers) {
            window.chaserGame.expectedPlayers = config.fixedPlayers;

            if (config.fixedPlayers === 1) {
                window.chaserGame.players = [{
                    id: myGameId(),
                    name: myGameName(),
                    seat: 0
                }];
                window.chaserGame.mySeat = 0;
                config.init();
                return;
            }

            createLobby(displayName, config, config.fixedPlayers);
            return;
        }

        showPlayerCountChooser(displayName, config);
    };

    function showPlayerCountChooser(gameName, config) {
        let buttons = "";

        for (let i = config.minPlayers; i <= config.maxPlayers; i++) {
            buttons += `
                <button onclick="window.chooseChaserGamePlayerCount(${i})"
                    style="background:#e2f0d9;color:#1e4620;border:3px solid #2d6a30;border-radius:10px;
                    font-size:22px;font-weight:900;padding:10px;cursor:pointer;box-shadow:0 3px 8px rgba(0,0,0,0.3);">
                    ${i}
                </button>`;
        }

        gameCanvas.innerHTML = `
            <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
                gap:14px;padding:16px;box-sizing:border-box;color:white;text-align:center;">
                <div style="font-size:26px;font-weight:900;color:#ffd700;font-family:Impact,sans-serif;">
                    ${gameName}
                </div>
                <div style="font-size:16px;color:#e2f0d9;font-weight:bold;">
                    How many players?
                </div>
                <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;width:100%;max-width:320px;">
                    ${buttons}
                </div>
            </div>`;

        window.chaserGame.pendingConfig = config;
        window.chaserGame.pendingGameName = gameName;
    }

    window.chooseChaserGamePlayerCount = function (count) {
        const config = window.chaserGame.pendingConfig;
        const gameName = window.chaserGame.pendingGameName;
        if (!config || !gameName) return;

        window.chaserGame.expectedPlayers = count;
        createLobby(gameName, config, count);
    };

    function createLobby(gameName, config, expectedPlayers) {
        const me = {
            id: myGameId(),
            name: myGameName(),
            seat: 0
        };

        window.chaserGame.players = [me];
        window.chaserGame.mySeat = 0;
        window.chaserGame.hostId = me.id;
        window.chaserGame.currentLobby = {
            gameName,
            expectedPlayers,
            config
        };

        sendGameEvent("chaser-game-lobby-open", {
            gameName,
            expectedPlayers,
            players: window.chaserGame.players,
            hostId: me.id
        });

        renderLobby(gameName, config);
    }

    function renderLobby(gameName, config) {
        const expected = window.chaserGame.expectedPlayers;
        const players = window.chaserGame.players || [];
        const waiting = Math.max(0, expected - players.length);
        const isHost = window.chaserGame.hostId === myGameId();

        let playerRows = players.map(p => `
            <div style="background:#e2f0d9;color:#1e4620;border-radius:8px;padding:8px 10px;
                font-size:16px;font-weight:900;display:flex;justify-content:space-between;">
                <span>✓ ${p.name}</span>
                <span>Seat ${p.seat + 1}</span>
            </div>
        `).join("");

        let emptyRows = "";
        for (let i = 0; i < waiting; i++) {
            emptyRows += `
                <div style="background:rgba(255,255,255,0.08);color:#a3cfbb;border:2px dashed rgba(226,240,217,0.25);
                    border-radius:8px;padding:8px 10px;font-size:16px;font-weight:bold;">
                    Waiting for player...
                </div>`;
        }

        gameCanvas.innerHTML = `
            <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
                gap:12px;padding:14px;box-sizing:border-box;text-align:center;">
                <div style="font-size:28px;font-weight:900;color:#ffd700;font-family:Impact,sans-serif;">
                    ${gameName}
                </div>
                <div style="font-size:15px;color:#e2f0d9;font-weight:bold;">
                    Expected Players: ${expected}
                </div>
                <div style="width:100%;max-width:320px;display:flex;flex-direction:column;gap:7px;">
                    ${playerRows}
                    ${emptyRows}
                </div>
                <div style="color:${waiting === 0 ? '#00b050' : '#ffd700'};font-weight:900;font-size:15px;">
                    ${waiting === 0 ? 'Ready to start!' : 'Waiting for ' + waiting + ' more player' + (waiting === 1 ? '' : 's') + '...'}
                </div>
                ${isHost ? `
                    <button onclick="window.startChaserLobbyGame()"
                        style="background:${waiting === 0 ? '#ffd700' : '#6c757d'};color:${waiting === 0 ? '#1e4620' : '#ffffff'};
                        border:none;border-radius:10px;padding:12px 22px;font-size:18px;font-weight:900;cursor:pointer;
                        font-family:Impact,sans-serif;box-shadow:0 4px 10px rgba(0,0,0,0.35);">
                        ${waiting === 0 ? 'START GAME' : 'START NOW'}
                    </button>
                ` : `
                    <div style="color:#a3cfbb;font-size:14px;font-weight:bold;">Host will start the game.</div>
                `}
            </div>`;
    }

    window.startChaserLobbyGame = function () {
        const lobby = window.chaserGame.currentLobby;
        if (!lobby || !lobby.config) return;

        sendGameEvent("chaser-game-lobby-start", {
            gameName: lobby.gameName,
            expectedPlayers: window.chaserGame.expectedPlayers,
            players: window.chaserGame.players,
            hostId: window.chaserGame.hostId
        });

        lobby.config.init();
    };

    function joinLobby(payload) {
        if (!payload || !payload.gameName || !payload.roomGameId) return;

        if (window.chaserGame.activeGame && window.chaserGame.activeGameId !== payload.roomGameId) {
            return;
        }

        const alreadyIn = (payload.players || []).some(p => p.id === myGameId());
        const full = (payload.players || []).length >= payload.expectedPlayers;

        if (alreadyIn || full) return;

        window.chaserGame.activeGame = payload.gameName;
        window.chaserGame.activeGameId = payload.roomGameId;
        window.chaserGame.expectedPlayers = payload.expectedPlayers;
        window.chaserGame.hostId = payload.hostId;
        window.chaserGame.players = payload.players || [];

        const mySeat = window.chaserGame.players.length;
        window.chaserGame.mySeat = mySeat;

        window.chaserGame.players.push({
            id: myGameId(),
            name: myGameName(),
            seat: mySeat
        });

        sendGameEvent("chaser-game-lobby-update", {
            gameName: payload.gameName,
            expectedPlayers: window.chaserGame.expectedPlayers,
            players: window.chaserGame.players,
            hostId: window.chaserGame.hostId
        });

        openGameStage();
        setGameHeader(payload.gameName);
        renderLobby(payload.gameName, GAME_CONFIG[payload.gameName] || GAME_CONFIG["Battle Uno"]);
    }

    function receiveLobbyUpdate(payload) {
        if (!payload || payload.roomGameId !== window.chaserGame.activeGameId) return;
        window.chaserGame.players = payload.players || window.chaserGame.players;
        window.chaserGame.expectedPlayers = payload.expectedPlayers || window.chaserGame.expectedPlayers;
        window.chaserGame.hostId = payload.hostId || window.chaserGame.hostId;

        const me = window.chaserGame.players.find(p => p.id === myGameId());
        if (me) window.chaserGame.mySeat = me.seat;

        if (window.chaserGame.currentLobby) {
            renderLobby(window.chaserGame.currentLobby.gameName, window.chaserGame.currentLobby.config);
        }
    }

    function receiveLobbyStart(payload) {
        if (!payload || payload.roomGameId !== window.chaserGame.activeGameId) return;

        window.chaserGame.players = payload.players || window.chaserGame.players;
        const me = window.chaserGame.players.find(p => p.id === myGameId());
        if (me) window.chaserGame.mySeat = me.seat;

        const config = GAME_CONFIG[payload.gameName] || GAME_CONFIG["Battle Uno"];
        if (config && config.init) config.init();
    }

    /* ============================================================
       INCOMING SYNC HANDLERS USED BY INDEX.HTML
       ============================================================ */

    window.handleIncomingCheckersSync = function (p) {
        if (!p) return;
        if (p.roomGameId && window.chaserGame.activeGameId && p.roomGameId !== window.chaserGame.activeGameId) return;

        window.checkersBoard = p.boardState;
        window.checkersTurnSeat = p.turnSeat;
        window.checkersPlayerSeats = p.playerSeats || window.checkersPlayerSeats;
        window.selectedCheckerIdx = null;
        window.consecutiveJumpsActive = p.consecutiveActive || false;
        window.lastJumpDestinationIdx = p.lastJumpDestinationIdx ?? null;

        if (gameStage.classList.contains("open") && window.chaserGame.activeGame === "Checkers") {
            renderCheckersGrid();
        }
    };

    window.handleIncomingUnoSync = function (p) {
        if (typeof window.receiveUnoSync === "function") window.receiveUnoSync(p);
    };

    window.handleIncomingTriviaSync = function (p) {
        if (typeof window.receiveTriviaSync === "function") window.receiveTriviaSync(p);
    };

    window.handleIncomingSequenceSync = function (p) {
        if (typeof window.receiveSequenceSync === "function") window.receiveSequenceSync(p);
    };

    window.handleIncomingChaserGameLobby = function (payload) {
        joinLobby(payload);
    };

    window.handleIncomingChaserGameLobbyUpdate = function (payload) {
        receiveLobbyUpdate(payload);
    };

    window.handleIncomingChaserGameLobbyStart = function (payload) {
        receiveLobbyStart(payload);
    };

    /* ============================================================
       1. CHECKERS – 2 PLAYER TURN LOCK
       ============================================================ */

    function initCheckersGame() {
        window.chaserGame.activeGame = "Checkers";

        const players = window.chaserGame.players && window.chaserGame.players.length
            ? window.chaserGame.players
            : [
                { id: myGameId(), name: myGameName(), seat: 0 },
                { id: "waiting-player", name: "Player 2", seat: 1 }
            ];

        window.checkersPlayerSeats = players.slice(0, 2);
        window.checkersMySeat = window.chaserGame.mySeat ?? 0;

        if (window.chaserGame.hostId === myGameId() || !window.checkersBoard) {
            window.checkersBoard = Array(64).fill(0).map((_, i) => {
                const r = Math.floor(i / 8);
                const c = i % 8;
                if ((r + c) % 2 === 1) {
                    if (r < 3) return 2;
                    if (r > 4) return 1;
                }
                return 0;
            });

            window.checkersTurnSeat = 0;
            window.selectedCheckerIdx = null;
            window.consecutiveJumpsActive = false;
            window.lastJumpDestinationIdx = null;

            syncCheckers();
        }

        renderCheckersGrid();
    }

    function syncCheckers() {
        sendGameEvent("checkers-sync-move", {
            boardState: window.checkersBoard,
            turnSeat: window.checkersTurnSeat,
            playerSeats: window.checkersPlayerSeats,
            consecutiveActive: window.consecutiveJumpsActive,
            lastJumpDestinationIdx: window.lastJumpDestinationIdx
        });
    }

    function checkerPieceBelongsToSeat(piece, seat) {
        if (seat === 0) return piece === 1 || piece === 3;
        if (seat === 1) return piece === 2 || piece === 4;
        return false;
    }

    function checkerPieceIsKing(piece) {
        return piece === 3 || piece === 4;
    }

    function checkerPieceSeat(piece) {
        if (piece === 1 || piece === 3) return 0;
        if (piece === 2 || piece === 4) return 1;
        return null;
    }

    function renderCheckersGrid() {
        const board = window.checkersBoard || [];
        const mySeat = window.chaserGame.mySeat ?? 0;
        const turnSeat = window.checkersTurnSeat ?? 0;
        const myTurn = mySeat === turnSeat;

        const boardPx = Math.min(336, Math.floor((window.innerWidth - 18) * 0.96));
        const cellPx = Math.floor(boardPx / 8);
        const actualBoardPx = cellPx * 8;
        const piecePx = Math.floor(cellPx * 0.80);

        const redName = window.checkersPlayerSeats?.[0]?.name || "Red";
        const blackName = window.checkersPlayerSeats?.[1]?.name || "Black";

        let html = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:100%;box-sizing:border-box;user-select:none;">
                <div style="width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;">
                    <div style="color:#ffd700;font-weight:900;font-size:15px;font-family:Impact,sans-serif;">
                        ${turnSeat === 0 ? "🔴 RED" : "⚫ BLACK"} TURN
                    </div>
                    <div style="color:${myTurn ? '#00b050' : '#a3cfbb'};font-weight:900;font-size:13px;">
                        ${myTurn ? "YOUR MOVE" : "WAITING"}
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:repeat(8,${cellPx}px);grid-template-rows:repeat(8,${cellPx}px);
                    width:${actualBoardPx}px;height:${actualBoardPx}px;border:4px solid #ffd700;border-radius:8px;overflow:hidden;
                    box-shadow:0 5px 16px rgba(0,0,0,0.5);">`;

        for (let i = 0; i < 64; i++) {
            const piece = board[i];
            const row = Math.floor(i / 8);
            const col = i % 8;
            const dark = (row + col) % 2 === 1;
            const bgColor = dark ? "#2d6a30" : "#e2f0d9";
            const selected = window.selectedCheckerIdx === i;

            let pieceHtml = "";
            if (piece) {
                const seat = checkerPieceSeat(piece);
                const isKing = checkerPieceIsKing(piece);
                const isRed = seat === 0;
                const grad = isRed
                    ? "radial-gradient(circle at 35% 30%,#ff8a8a,#c40000)"
                    : "radial-gradient(circle at 35% 30%,#666,#111)";

                pieceHtml = `
                    <div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:${grad};
                        border:${isKing ? "4px solid #ffd700" : "3px solid #ffffff"};
                        display:flex;align-items:center;justify-content:center;
                        box-shadow:0 3px 6px rgba(0,0,0,0.45);color:white;font-size:${Math.floor(piecePx * 0.45)}px;font-weight:900;">
                        ${isKing ? "♛" : ""}
                    </div>`;
            }

            html += `
                <div onclick="window.handleCheckerTap(${i})"
                    style="width:${cellPx}px;height:${cellPx}px;background:${bgColor};
                    display:flex;align-items:center;justify-content:center;box-sizing:border-box;cursor:pointer;
                    ${selected ? "outline:4px solid #ffd700;outline-offset:-4px;" : ""}">
                    ${pieceHtml}
                </div>`;
        }

        html += `
                </div>
                <div style="width:100%;display:flex;justify-content:space-between;color:#e2f0d9;font-size:12px;font-weight:bold;">
                    <span>🔴 ${redName}</span>
                    <span>⚫ ${blackName}</span>
                </div>
            </div>`;

        gameCanvas.innerHTML = html;
    }

    function getCheckerMoves(idx, board, seat, jumpOnly) {
        const piece = board[idx];
        if (!piece) return [];

        const isKing = checkerPieceIsKing(piece);
        const r = Math.floor(idx / 8);
        const c = idx % 8;
        const moves = [];

        const dirs = [];

        if (seat === 0 || isKing) dirs.push([-1, -1], [-1, 1]);
        if (seat === 1 || isKing) dirs.push([1, -1], [1, 1]);

        dirs.forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr > 7 || nc < 0 || nc > 7) return;

            const ni = nr * 8 + nc;
            const target = board[ni];

            if (!target && !jumpOnly) {
                moves.push(ni);
            } else if (target && checkerPieceSeat(target) !== seat) {
                const jr = nr + dr;
                const jc = nc + dc;
                if (jr < 0 || jr > 7 || jc < 0 || jc > 7) return;
                const ji = jr * 8 + jc;
                if (!board[ji]) moves.push(ji);
            }
        });

        return moves;
    }

    window.handleCheckerTap = function (idx) {
        const board = window.checkersBoard;
        const mySeat = window.chaserGame.mySeat ?? 0;
        const turnSeat = window.checkersTurnSeat ?? 0;

        if (!board || mySeat !== turnSeat) return;

        const piece = board[idx];

        if (window.selectedCheckerIdx === null) {
            if (checkerPieceBelongsToSeat(piece, mySeat)) {
                if (window.consecutiveJumpsActive && idx !== window.lastJumpDestinationIdx) return;
                window.selectedCheckerIdx = idx;
                renderCheckersGrid();
            }
            return;
        }

        const from = window.selectedCheckerIdx;
        const moves = getCheckerMoves(from, board, mySeat, window.consecutiveJumpsActive);

        if (!moves.includes(idx)) {
            if (checkerPieceBelongsToSeat(piece, mySeat) && !window.consecutiveJumpsActive) {
                window.selectedCheckerIdx = idx;
            } else if (!window.consecutiveJumpsActive) {
                window.selectedCheckerIdx = null;
            }
            renderCheckersGrid();
            return;
        }

        const isJump = Math.abs(idx - from) > 10;

        board[idx] = board[from];
        board[from] = 0;

        if (isJump) {
            board[Math.floor((from + idx) / 2)] = 0;
        }

        if (board[idx] === 1 && Math.floor(idx / 8) === 0) board[idx] = 3;
        if (board[idx] === 2 && Math.floor(idx / 8) === 7) board[idx] = 4;

        let hasMoreJumps = false;

        if (isJump) {
            const extra = getCheckerMoves(idx, board, mySeat, true);
            if (extra.length > 0) {
                hasMoreJumps = true;
                window.consecutiveJumpsActive = true;
                window.lastJumpDestinationIdx = idx;
                window.selectedCheckerIdx = idx;
            }
        }

        if (!hasMoreJumps) {
            window.selectedCheckerIdx = null;
            window.consecutiveJumpsActive = false;
            window.lastJumpDestinationIdx = null;
            window.checkersTurnSeat = turnSeat === 0 ? 1 : 0;
        }

        syncCheckers();
        renderCheckersGrid();
    };
   /* ============================================================
   CHASER ARCADE ENGINE – games.js
   REBUILT VERSION – PART 2 OF 3
   Sequence + Uno
   ============================================================ */

(function () {
    "use strict";

    const $ = (id) => document.getElementById(id);
    const gameCanvas = $("gameCanvasContainer");
    const gameStage = $("activeGameStage");

    function myGameId() {
        return window.myId || localStorage.getItem("rider_id") || "local-player";
    }

    function myGameName() {
        const input = document.getElementById("username");
        return (input && input.value.trim()) || localStorage.getItem("rider_saved_name") || "Player";
    }

    function sendGameEvent(event, payload) {
        if (typeof channel !== "undefined" && channel && typeof channel.send === "function") {
            channel.send({
                type: "broadcast",
                event,
                payload: {
                    ...payload,
                    senderId: myGameId(),
                    senderName: myGameName(),
                    roomGameId: window.chaserGame?.activeGameId || null
                }
            });
        }
    }

    function shuffle(arr) {
        const copy = arr.slice();
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    function escapeHtml(str) {
        return String(str ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /* ============================================================
       2. SEQUENCE – REAL STYLE 2 PLAYER VERSION
       ============================================================ */

    const SEQ_GRID = [
        "FREE","2S","3S","4S","5S","6S","7S","8S","9S","FREE",
        "6C","5C","4C","3C","2C","AH","KH","QH","10H","10S",
        "7C","AS","2D","3D","4D","5D","6D","7D","9H","QS",
        "8C","KS","6C","5C","4C","3C","2C","8D","8H","KS",
        "9C","QS","7C","6H","5H","4H","AS","9D","7H","AS",
        "10C","10S","8C","7H","2H","3H","KS","10D","6H","2D",
        "QC","JS","9C","8H","AD","KD","QD","JD","5H","3D",
        "KC","QC","10C","9H","10H","QH","KH","AH","4H","4D",
        "AC","3D","2D","AS","KS","QS","JS","10S","9S","5D",
        "FREE","AC","KC","QC","JC","10C","9C","8C","7C","FREE"
    ];

    const SUIT_SYMBOL = {
        S: "♠",
        C: "♣",
        H: "♥",
        D: "♦"
    };

    function displayCard(code) {
        if (code === "FREE") return { rank: "★", suit: "", red: false, free: true };
        const suit = code.slice(-1);
        const rank = code.slice(0, -1);
        return {
            rank,
            suit: SUIT_SYMBOL[suit],
            red: suit === "H" || suit === "D",
            free: false
        };
    }

    function buildSequenceDeck() {
        const suits = ["S", "C", "H", "D"];
        const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
        let deck = [];
        for (let d = 0; d < 2; d++) {
            suits.forEach(s => ranks.forEach(r => deck.push(r + s)));
        }
        return shuffle(deck);
    }

    function isOneEyedJack(card) {
        return card === "JS" || card === "JH";
    }

    function isTwoEyedJack(card) {
        return card === "JC" || card === "JD";
    }

    function seqTeamName(team) {
        return team === 1 ? "BLUE" : "RED";
    }

    function seqTeamColor(team) {
        return team === 1 ? "#00b0ff" : "#e63946";
    }

    window.initSequenceGame = function () {
        window.chaserGame.activeGame = "Sequence";
        window.seqMySeat = window.chaserGame.mySeat ?? 0;
        window.seqMyTeam = window.seqMySeat === 0 ? 1 : 2;

        const isHost = window.chaserGame.hostId === myGameId();

        if (isHost || !window.seqState) {
            const deck = buildSequenceDeck();
            const hands = [[], []];

            for (let p = 0; p < 2; p++) {
                for (let i = 0; i < 7; i++) {
                    hands[p].push(deck.pop());
                }
            }

            window.seqState = {
                board: Array(100).fill(0),
                locked: Array(100).fill(0),
                deck,
                hands,
                turnTeam: 1,
                selectedCardIdx: null,
                sequences: [0, 0],
                winner: null,
                message: "Blue starts."
            };

            syncSequence();
        }

        renderSequenceBoard();
    };

    function syncSequence() {
        sendGameEvent("sequence-sync-state", {
            state: window.seqState
        });
    }

    window.receiveSequenceSync = function (p) {
        if (!p || !p.state) return;
        if (p.roomGameId && window.chaserGame.activeGameId && p.roomGameId !== window.chaserGame.activeGameId) return;

        window.seqState = p.state;
        if (gameStage && gameStage.classList.contains("open") && window.chaserGame.activeGame === "Sequence") {
            renderSequenceBoard();
        }
    };

    function countSequenceLines(board, locked, team) {
        const dirs = [
            [0, 1],
            [1, 0],
            [1, 1],
            [1, -1]
        ];

        const cornerIndexes = [0, 9, 90, 99];
        let lines = [];

        function ownerAt(idx) {
            if (cornerIndexes.includes(idx)) return team;
            return board[idx];
        }

        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 10; c++) {
                dirs.forEach(([dr, dc]) => {
                    let cells = [];
                    for (let k = 0; k < 5; k++) {
                        const nr = r + dr * k;
                        const nc = c + dc * k;
                        if (nr < 0 || nr >= 10 || nc < 0 || nc >= 10) return;
                        cells.push(nr * 10 + nc);
                    }

                    if (cells.length === 5 && cells.every(idx => ownerAt(idx) === team)) {
                        const alreadyLocked = cells.filter(idx => locked[idx] === team).length;
                        if (alreadyLocked < 5) {
                            lines.push(cells);
                        }
                    }
                });
            }
        }

        return lines;
    }

    function applyNewSequences(team) {
        const s = window.seqState;
        const lines = countSequenceLines(s.board, s.locked, team);
        let added = 0;

        lines.forEach(line => {
            let usable = line.some(idx => s.locked[idx] !== team);
            if (!usable) return;

            line.forEach(idx => {
                if (SEQ_GRID[idx] !== "FREE") s.locked[idx] = team;
            });

            added++;
        });

        if (added > 0) {
            s.sequences[team - 1] += added;
            s.message = `${seqTeamName(team)} made a sequence!`;

            if (s.sequences[team - 1] >= 2) {
                s.winner = team;
                s.message = `${seqTeamName(team)} wins!`;
            }
        }
    }

    function drawSequenceReplacementCard(handIdx) {
        const s = window.seqState;
        if (!s.deck.length) {
            s.hands[handIdx].splice(s.selectedCardIdx, 1);
            return;
        }
        s.hands[handIdx][s.selectedCardIdx] = s.deck.pop();
    }

    function renderSequenceBoard() {
        const s = window.seqState;
        if (!s) return;

        const mySeat = window.chaserGame.mySeat ?? 0;
        const myTeam = mySeat === 0 ? 1 : 2;
        const myHand = s.hands[mySeat] || [];
        const myTurn = s.turnTeam === myTeam && !s.winner;
        const selectedCard = s.selectedCardIdx !== null ? myHand[s.selectedCardIdx] : null;

        const screenW = Math.min(window.innerWidth - 16, 352);
        const cellPx = Math.floor(screenW / 10);
        const gridPx = cellPx * 10;

        let html = `
            <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;gap:5px;box-sizing:border-box;user-select:none;overflow:hidden;">
                <div style="width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;">
                    <div style="font-size:15px;font-weight:900;color:#ffd700;font-family:Impact,sans-serif;">
                        ${seqTeamName(s.turnTeam)} TURN
                    </div>
                    <div style="font-size:13px;font-weight:900;color:${myTurn ? '#00b050' : '#a3cfbb'};">
                        ${s.winner ? seqTeamName(s.winner) + " WINS" : myTurn ? "YOUR MOVE" : "WAITING"}
                    </div>
                    <div style="font-size:12px;color:#e2f0d9;font-weight:bold;">
                        🔵 ${s.sequences[0]} | 🔴 ${s.sequences[1]}
                    </div>
                </div>

                <div style="font-size:12px;color:#ffd700;font-weight:bold;min-height:16px;text-align:center;">
                    ${escapeHtml(s.message || "")}
                </div>

                <div style="width:${gridPx}px;height:${gridPx}px;display:grid;grid-template-columns:repeat(10,${cellPx}px);
                    grid-template-rows:repeat(10,${cellPx}px);gap:1px;background:#111;border:4px solid #ffd700;
                    border-radius:8px;overflow:hidden;box-shadow:0 5px 16px rgba(0,0,0,0.5);">`;

        for (let i = 0; i < 100; i++) {
            const code = SEQ_GRID[i];
            const card = displayCard(code);
            const token = s.board[i];
            const locked = s.locked[i];

            let canPlay = false;
            if (myTurn && selectedCard && !s.winner) {
                if (isTwoEyedJack(selectedCard) && !token && code !== "FREE") canPlay = true;
                else if (isOneEyedJack(selectedCard) && token && token !== myTeam && !locked) canPlay = true;
                else if (!selectedCard.startsWith("J") && selectedCard === code && !token && code !== "FREE") canPlay = true;
            }

            let chip = "";
            if (token) {
                chip = `
                    <div style="position:absolute;width:72%;height:72%;border-radius:50%;
                        background:${seqTeamColor(token)};border:${locked ? '3px solid #ffd700' : '2px solid #fff'};
                        box-shadow:0 2px 5px rgba(0,0,0,0.45);z-index:3;
                        display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:900;">
                        ${locked ? "★" : ""}
                    </div>`;
            }

            html += `
                <div onclick="window.handleSequenceCellTap(${i})"
                    style="position:relative;width:${cellPx}px;height:${cellPx}px;background:${card.free ? '#1e4620' : '#fff'};
                    color:${card.red ? '#c40000' : '#111'};display:flex;flex-direction:column;align-items:center;justify-content:center;
                    box-sizing:border-box;cursor:pointer;${canPlay ? 'box-shadow:inset 0 0 0 3px #ffd700;background:#fff3cd;' : ''}">
                    ${card.free ? `
                        <span style="color:#ffd700;font-size:${Math.floor(cellPx * 0.48)}px;text-shadow:1px 1px 2px #000;">★</span>
                    ` : `
                        <span style="font-size:${Math.floor(cellPx * 0.32)}px;font-weight:900;line-height:1;">${card.rank}</span>
                        <span style="font-size:${Math.floor(cellPx * 0.38)}px;line-height:1;">${card.suit}</span>
                    `}
                    ${chip}
                </div>`;
        }

        html += `
                </div>

                <div style="width:100%;display:flex;gap:5px;justify-content:center;align-items:center;padding-top:4px;box-sizing:border-box;">
        `;

        myHand.forEach((code, idx) => {
            const card = displayCard(code);
            const isSelected = s.selectedCardIdx === idx;
            const jackLabel = isTwoEyedJack(code) ? "Wild" : isOneEyedJack(code) ? "Remove" : "";

            html += `
                <button onclick="window.selectSequenceCard(${idx})"
                    style="width:43px;height:58px;border-radius:6px;border:${isSelected ? '3px solid #ffd700' : '1px solid #666'};
                    background:#fff;color:${card.red ? '#c40000' : '#111'};display:flex;flex-direction:column;align-items:center;
                    justify-content:center;padding:0;font-weight:900;cursor:pointer;box-shadow:0 3px 7px rgba(0,0,0,0.35);
                    transform:${isSelected ? 'translateY(-4px)' : 'none'};">
                    <span style="font-size:17px;line-height:1;">${card.rank}</span>
                    <span style="font-size:20px;line-height:1;">${card.suit}</span>
                    ${jackLabel ? `<span style="font-size:8px;color:#2d6a30;font-weight:900;">${jackLabel}</span>` : ""}
                </button>`;
        });

        html += `
                </div>
            </div>`;

        gameCanvas.innerHTML = html;
    }

    window.selectSequenceCard = function (idx) {
        const s = window.seqState;
        if (!s || s.winner) return;

        const mySeat = window.chaserGame.mySeat ?? 0;
        const myTeam = mySeat === 0 ? 1 : 2;
        if (s.turnTeam !== myTeam) return;

        s.selectedCardIdx = s.selectedCardIdx === idx ? null : idx;
        renderSequenceBoard();
    };

    window.handleSequenceCellTap = function (idx) {
        const s = window.seqState;
        if (!s || s.winner) return;

        const mySeat = window.chaserGame.mySeat ?? 0;
        const myTeam = mySeat === 0 ? 1 : 2;
        if (s.turnTeam !== myTeam) return;

        if (s.selectedCardIdx === null) return;

        const hand = s.hands[mySeat];
        const card = hand[s.selectedCardIdx];
        const target = SEQ_GRID[idx];
        const token = s.board[idx];
        const locked = s.locked[idx];

        let valid = false;

        if (isTwoEyedJack(card)) {
            if (!token && target !== "FREE") {
                s.board[idx] = myTeam;
                valid = true;
            }
        } else if (isOneEyedJack(card)) {
            if (token && token !== myTeam && !locked && target !== "FREE") {
                s.board[idx] = 0;
                valid = true;
            }
        } else {
            if (card === target && !token && target !== "FREE") {
                s.board[idx] = myTeam;
                valid = true;
            }
        }

        if (!valid) return;

        drawSequenceReplacementCard(mySeat);
        s.selectedCardIdx = null;

        applyNewSequences(myTeam);

        if (!s.winner) {
            s.turnTeam = myTeam === 1 ? 2 : 1;
            s.message = `${seqTeamName(s.turnTeam)} turn.`;
        }

        syncSequence();
        renderSequenceBoard();
    };

    /* ============================================================
       3. UNO – 2 TO 10 PLAYER ROOM GAME
       ============================================================ */

    function buildUnoDeck() {
        const colors = ["Red", "Yellow", "Green", "Blue"];
        let deck = [];

        colors.forEach(color => {
            deck.push({ color, value: "0" });
            ["1","2","3","4","5","6","7","8","9","Skip","Reverse","+2"].forEach(value => {
                deck.push({ color, value }, { color, value });
            });
        });

        for (let i = 0; i < 4; i++) {
            deck.push({ color: "Wild", value: "Wild" });
            deck.push({ color: "Wild", value: "+4" });
        }

        return shuffle(deck);
    }

    function unoColorHex(color) {
        return {
            Red: "#e63946",
            Yellow: "#ffb703",
            Green: "#00b050",
            Blue: "#00b0ff",
            Wild: "#202020"
        }[color] || "#202020";
    }

    function nextUnoPlayer(from, steps = 1) {
        const s = window.unoState;
        const total = s.players.length;
        let idx = from;
        for (let i = 0; i < steps; i++) {
            idx = (idx + s.direction + total) % total;
        }
        return idx;
    }

    window.initChaserUnoGame = function () {
        window.chaserGame.activeGame = "Uno";

        const isHost = window.chaserGame.hostId === myGameId();

        if (isHost || !window.unoState) {
            const players = (window.chaserGame.players || []).slice(0, window.chaserGame.expectedPlayers || 2);
            const deck = buildUnoDeck();
            const hands = players.map(() => []);

            for (let p = 0; p < players.length; p++) {
                for (let i = 0; i < 7; i++) {
                    hands[p].push(deck.pop());
                }
            }

            let discard = deck.pop();
            while (discard && discard.color === "Wild") {
                deck.unshift(discard);
                discard = deck.pop();
            }

            window.unoState = {
                players,
                hands,
                deck,
                discard,
                turn: 0,
                direction: 1,
                wildChoosingSeat: null,
                pendingWildCardIndex: null,
                winner: null,
                message: `${players[0]?.name || "Player 1"} starts.`
            };

            syncUno();
        }

        renderUnoLayout();
    };

    function syncUno() {
        sendGameEvent("uno-sync-discard", {
            state: window.unoState
        });
    }

    window.receiveUnoSync = function (p) {
        if (!p || !p.state) return;
        if (p.roomGameId && window.chaserGame.activeGameId && p.roomGameId !== window.chaserGame.activeGameId) return;

        window.unoState = p.state;
        if (gameStage && gameStage.classList.contains("open") && window.chaserGame.activeGame === "Uno") {
            renderUnoLayout();
        }
    };

    function renderUnoCard(card, onclick, small = false, faded = false) {
        if (!card) return "";

        const bg = card.color === "Wild"
            ? "linear-gradient(45deg,#e63946,#ffb703,#00b050,#00b0ff)"
            : unoColorHex(card.color);

        return `
            <div ${onclick ? `onclick="${onclick}"` : ""}
                style="flex-shrink:0;width:${small ? 54 : 66}px;height:${small ? 80 : 98}px;border-radius:8px;
                background:${bg};border:3px solid #fff;box-shadow:0 4px 8px rgba(0,0,0,0.4);
                display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;cursor:${onclick ? 'pointer' : 'default'};
                opacity:${faded ? 0.45 : 1};box-sizing:border-box;">
                <div style="position:absolute;width:130%;height:42%;background:rgba(255,255,255,0.16);border-radius:50%;transform:rotate(-25deg);"></div>
                <div style="z-index:2;color:#fff;font-family:Impact,sans-serif;font-weight:900;
                    font-size:${card.value === "Reverse" || card.value === "Skip" || card.value === "Wild" ? (small ? 15 : 18) : (small ? 30 : 36)}px;
                    text-shadow:2px 2px 4px rgba(0,0,0,0.45);text-align:center;line-height:1;">
                    ${escapeHtml(card.value)}
                </div>
            </div>`;
    }

    function renderUnoLayout() {
        const s = window.unoState;
        if (!s) return;

        const mySeat = window.chaserGame.mySeat ?? 0;
        const hand = s.hands[mySeat] || [];
        const discard = s.discard || { color: "Red", value: "0" };
        const myTurn = s.turn === mySeat && !s.winner;
        const activeName = s.players[s.turn]?.name || `Player ${s.turn + 1}`;

        let opponents = s.players.map((p, idx) => {
            if (idx === mySeat) return "";
            return `
                <div style="background:${idx === s.turn ? '#ffd700' : 'rgba(226,240,217,0.16)'};color:${idx === s.turn ? '#1e4620' : '#e2f0d9'};
                    border-radius:8px;padding:6px 8px;font-size:12px;font-weight:900;">
                    ${escapeHtml(p.name)}: ${s.hands[idx]?.length || 0}
                </div>`;
        }).join("");

        let html = `
            <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;gap:8px;box-sizing:border-box;user-select:none;overflow:hidden;">
                <div style="width:100%;display:flex;justify-content:space-between;gap:6px;align-items:center;">
                    <div style="font-size:15px;color:#ffd700;font-weight:900;font-family:Impact,sans-serif;">
                        UNO
                    </div>
                    <div style="font-size:13px;color:${myTurn ? '#00b050' : '#a3cfbb'};font-weight:900;">
                        ${s.winner ? escapeHtml(s.winner.name) + " WINS" : myTurn ? "YOUR TURN" : "TURN: " + escapeHtml(activeName)}
                    </div>
                    <div style="font-size:12px;color:#e2f0d9;font-weight:bold;">
                        ${s.direction === 1 ? "↻" : "↺"}
                    </div>
                </div>

                <div style="width:100%;display:flex;gap:5px;justify-content:center;flex-wrap:wrap;min-height:30px;">
                    ${opponents}
                </div>

                <div style="font-size:12px;color:#ffd700;font-weight:bold;min-height:15px;text-align:center;">
                    ${escapeHtml(s.message || "")}
                </div>

                <div style="display:flex;align-items:flex-end;justify-content:center;gap:36px;margin-top:2px;">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                        <div style="font-size:11px;color:#a3cfbb;font-weight:900;">DRAW</div>
                        ${renderUnoCard({ color: "Wild", value: "UNO" }, "window.unoDrawCard()", true, !myTurn)}
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                        <div style="font-size:11px;color:#a3cfbb;font-weight:900;">PLAY</div>
                        ${renderUnoCard(discard, "", false)}
                    </div>
                </div>
        `;

        if (s.wildChoosingSeat === mySeat) {
            html += `
                <div style="display:grid;grid-template-columns:repeat(4,54px);gap:6px;margin-top:2px;">
                    ${["Red","Yellow","Green","Blue"].map(c => `
                        <button onclick="window.unoPickWildColor('${c}')"
                            style="height:42px;border-radius:8px;border:3px solid #fff;background:${unoColorHex(c)};
                            cursor:pointer;box-shadow:0 3px 8px rgba(0,0,0,0.35);"></button>
                    `).join("")}
                </div>`;
        }

        html += `
                <div style="width:100%;display:flex;overflow-x:auto;gap:7px;padding:10px 6px 14px 6px;box-sizing:border-box;-webkit-overflow-scrolling:touch;">
        `;

        hand.forEach((card, idx) => {
            const playable = myTurn && (
                card.color === discard.color ||
                card.value === discard.value ||
                card.color === "Wild"
            );

            html += renderUnoCard(card, `window.unoPlayCard(${idx})`, true, !playable);
        });

        html += `
                </div>
            </div>`;

        gameCanvas.innerHTML = html;
    }

    window.unoPlayCard = function (idx) {
        const s = window.unoState;
        if (!s || s.winner) return;

        const mySeat = window.chaserGame.mySeat ?? 0;
        if (s.turn !== mySeat) return;

        const card = s.hands[mySeat][idx];
        const discard = s.discard;

        const playable = card.color === discard.color || card.value === discard.value || card.color === "Wild";
        if (!playable) return;

        if (card.color === "Wild") {
            s.wildChoosingSeat = mySeat;
            s.pendingWildCardIndex = idx;
            s.message = "Choose a color.";
            renderUnoLayout();
            return;
        }

        playUnoCardNow(mySeat, idx, card);
    };

    function playUnoCardNow(seat, idx, card, chosenColor = null) {
        const s = window.unoState;
        s.hands[seat].splice(idx, 1);

        s.discard = chosenColor
            ? { color: chosenColor, value: card.value }
            : card;

        if (s.hands[seat].length === 0) {
            s.winner = s.players[seat];
            s.message = `${s.players[seat].name} wins!`;
            syncUno();
            renderUnoLayout();
            return;
        }

        let steps = 1;

        if (card.value === "Reverse") {
            s.direction *= -1;
            if (s.players.length === 2) steps = 2;
        }

        if (card.value === "Skip") {
            steps = 2;
        }

        if (card.value === "+2") {
            const target = nextUnoPlayer(seat, 1);
            for (let i = 0; i < 2; i++) {
                if (s.deck.length) s.hands[target].push(s.deck.pop());
            }
            steps = 2;
            s.message = `${s.players[target].name} draws 2.`;
        } else if (card.value === "+4") {
            const target = nextUnoPlayer(seat, 1);
            for (let i = 0; i < 4; i++) {
                if (s.deck.length) s.hands[target].push(s.deck.pop());
            }
            steps = 2;
            s.message = `${s.players[target].name} draws 4.`;
        } else {
            s.message = `${s.players[seat].name} played ${card.value}.`;
        }

        s.turn = nextUnoPlayer(seat, steps);
        s.wildChoosingSeat = null;
        s.pendingWildCardIndex = null;

        syncUno();
        renderUnoLayout();
    }

    window.unoPickWildColor = function (color) {
        const s = window.unoState;
        if (!s) return;

        const mySeat = window.chaserGame.mySeat ?? 0;
        if (s.wildChoosingSeat !== mySeat) return;

        const idx = s.pendingWildCardIndex;
        const card = s.hands[mySeat][idx];
        if (!card) return;

        playUnoCardNow(mySeat, idx, card, color);
    };

    window.unoDrawCard = function () {
        const s = window.unoState;
        if (!s || s.winner) return;

        const mySeat = window.chaserGame.mySeat ?? 0;
        if (s.turn !== mySeat) return;

        if (!s.deck.length) {
            s.message = "No cards left to draw.";
            renderUnoLayout();
            return;
        }

        s.hands[mySeat].push(s.deck.pop());
        s.message = `${s.players[mySeat].name} drew a card.`;
        s.turn = nextUnoPlayer(mySeat, 1);

        syncUno();
        renderUnoLayout();
    };
/* ============================================================
   CHASER ARCADE ENGINE – games.js
   REBUILT VERSION – PART 3 OF 3
   Trivia + Solitaire + Hangman
   ============================================================ */

(function () {
    "use strict";

    const $ = (id) => document.getElementById(id);
    const gameCanvas = $("gameCanvasContainer");
    const gameStage = $("activeGameStage");

    function myGameId() {
        return window.myId || localStorage.getItem("rider_id") || "local-player";
    }

    function sendGameEvent(event, payload) {
        if (typeof channel !== "undefined" && channel && typeof channel.send === "function") {
            channel.send({
                type: "broadcast",
                event,
                payload: {
                    ...payload,
                    senderId: myGameId(),
                    roomGameId: window.chaserGame?.activeGameId || null
                }
            });
        }
    }

    function shuffle(arr) {
        const copy = arr.slice();
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    function escapeHtml(str) {
        return String(str ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    /* ============================================================
       4. TRIVIA – 1 TO 10 PLAYERS
       ============================================================ */

    const LOCAL_TRIVIA = [
        { q: "What planet is known as the Red Planet?", c: "Mars", a: ["Venus", "Mars", "Jupiter", "Saturn"] },
        { q: "How many sides does a hexagon have?", c: "6", a: ["5", "6", "7", "8"] },
        { q: "Which ocean is the largest?", c: "Pacific Ocean", a: ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"] },
        { q: "What is the capital of France?", c: "Paris", a: ["Rome", "Madrid", "Paris", "Berlin"] },
        { q: "Which animal is known as man's best friend?", c: "Dog", a: ["Cat", "Horse", "Dog", "Rabbit"] },
        { q: "What color do you get by mixing red and blue?", c: "Purple", a: ["Green", "Orange", "Purple", "Yellow"] },
        { q: "How many days are in a leap year?", c: "366", a: ["365", "366", "364", "360"] },
        { q: "What gas do plants absorb?", c: "Carbon dioxide", a: ["Oxygen", "Hydrogen", "Carbon dioxide", "Nitrogen"] },
        { q: "Which country invented pizza?", c: "Italy", a: ["France", "Italy", "Mexico", "Greece"] },
        { q: "How many continents are there?", c: "7", a: ["5", "6", "7", "8"] }
    ];

    window.initTriviaGame = function () {
        window.chaserGame.activeGame = "Trivia";

        const isHost = window.chaserGame.hostId === myGameId();

        if (isHost || !window.triviaState) {
            window.triviaState = {
                players: window.chaserGame.players || [{ id: myGameId(), name: "Player", seat: 0 }],
                round: 0,
                totalRounds: 10,
                score: {},
                votes: {},
                current: null,
                phase: "menu",
                timer: 0,
                winner: null
            };

            window.triviaState.players.forEach(p => {
                window.triviaState.score[p.id] = 0;
            });

            syncTrivia();
        }

        renderTriviaMenu();
    };

    function syncTrivia() {
        sendGameEvent("sync-room-trivia", {
            state: window.triviaState
        });
    }

    window.receiveTriviaSync = function (p) {
        if (!p || !p.state) return;
        if (p.roomGameId && window.chaserGame.activeGameId && p.roomGameId !== window.chaserGame.activeGameId) return;

        window.triviaState = p.state;

        if (gameStage && gameStage.classList.contains("open") && window.chaserGame.activeGame === "Trivia") {
            renderTriviaScreen();
        }
    };

    function renderTriviaMenu() {
        gameCanvas.innerHTML = `
            <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
                gap:14px;text-align:center;color:white;padding:18px;box-sizing:border-box;">
                <div style="font-size:30px;color:#ffd700;font-family:Impact,sans-serif;font-weight:900;">TRIVIA</div>
                <div style="font-size:15px;color:#e2f0d9;font-weight:bold;">10 rounds • pick your answer fast</div>
                <button onclick="window.startTriviaRound()"
                    style="background:#ffd700;color:#1e4620;border:none;border-radius:10px;padding:14px 26px;
                    font-size:22px;font-weight:900;font-family:Impact,sans-serif;box-shadow:0 4px 10px rgba(0,0,0,0.35);">
                    START
                </button>
            </div>`;
    }

    window.startTriviaRound = function () {
        const s = window.triviaState;
        if (!s) return;

        const q = LOCAL_TRIVIA[Math.floor(Math.random() * LOCAL_TRIVIA.length)];
        s.current = { ...q, a: shuffle(q.a) };
        s.votes = {};
        s.phase = "vote";
        s.timer = 12;
        s.round++;

        syncTrivia();
        runTriviaTimer();
        renderTriviaScreen();
    };

    function runTriviaTimer() {
        if (window.triviaTimer) clearInterval(window.triviaTimer);

        window.triviaTimer = setInterval(() => {
            const s = window.triviaState;
            if (!s || s.phase !== "vote") {
                clearInterval(window.triviaTimer);
                return;
            }

            s.timer--;

            if (s.timer <= 0) {
                clearInterval(window.triviaTimer);
                revealTriviaAnswer();
            } else {
                renderTriviaScreen();
            }
        }, 1000);
    }

    function revealTriviaAnswer() {
        const s = window.triviaState;
        if (!s || !s.current) return;

        s.phase = "reveal";

        Object.keys(s.votes).forEach(playerId => {
            if (s.votes[playerId] === s.current.c) {
                s.score[playerId] = (s.score[playerId] || 0) + 1;
            }
        });

        syncTrivia();
        renderTriviaScreen();
    }

    window.submitTriviaAnswer = function (answer) {
        const s = window.triviaState;
        if (!s || s.phase !== "vote") return;

        s.votes[myGameId()] = answer;
        syncTrivia();
        renderTriviaScreen();
    };

    window.nextTriviaRound = function () {
        const s = window.triviaState;
        if (!s) return;

        if (s.round >= s.totalRounds) {
            s.phase = "done";
            syncTrivia();
            renderTriviaScreen();
        } else {
            window.startTriviaRound();
        }
    };

    function renderTriviaScreen() {
        const s = window.triviaState;
        if (!s) return;

        if (s.phase === "menu") {
            renderTriviaMenu();
            return;
        }

        if (s.phase === "done") {
            const sorted = s.players.slice().sort((a, b) => (s.score[b.id] || 0) - (s.score[a.id] || 0));
            const winner = sorted[0];

            gameCanvas.innerHTML = `
                <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
                    gap:12px;text-align:center;color:white;padding:18px;box-sizing:border-box;">
                    <div style="font-size:30px;color:#ffd700;font-family:Impact,sans-serif;">TRIVIA COMPLETE</div>
                    <div style="font-size:22px;color:#00b050;font-weight:900;">Winner: ${escapeHtml(winner?.name || "Player")}</div>
                    <div style="width:100%;max-width:320px;display:flex;flex-direction:column;gap:6px;">
                        ${sorted.map(p => `
                            <div style="background:#e2f0d9;color:#1e4620;border-radius:8px;padding:8px;font-weight:900;
                                display:flex;justify-content:space-between;">
                                <span>${escapeHtml(p.name)}</span>
                                <span>${s.score[p.id] || 0}</span>
                            </div>
                        `).join("")}
                    </div>
                    <button onclick="window.initTriviaGame()"
                        style="background:#ffd700;color:#1e4620;border:none;border-radius:10px;padding:12px 22px;
                        font-size:18px;font-weight:900;font-family:Impact,sans-serif;">NEW GAME</button>
                </div>`;
            return;
        }

        const voted = !!s.votes[myGameId()];
        const q = s.current;

        gameCanvas.innerHTML = `
            <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;gap:8px;
                color:white;padding:8px;box-sizing:border-box;user-select:none;">
                <div style="width:100%;display:flex;justify-content:space-between;color:#ffd700;font-weight:900;font-size:13px;">
                    <span>Round ${s.round}/${s.totalRounds}</span>
                    <span>${s.phase === "vote" ? "Time: " + s.timer : "Reveal"}</span>
                    <span>Score: ${s.score[myGameId()] || 0}</span>
                </div>

                <div style="background:rgba(0,0,0,0.45);border:3px solid #ffd700;border-radius:10px;
                    padding:12px;font-size:18px;font-weight:900;text-align:center;line-height:1.2;width:100%;box-sizing:border-box;">
                    ${escapeHtml(q.q)}
                </div>

                <div style="display:flex;flex-direction:column;gap:7px;width:100%;">
                    ${q.a.map(ans => {
                        let bg = "#e2f0d9";
                        let color = "#1e4620";

                        if (s.phase === "reveal") {
                            if (ans === q.c) {
                                bg = "#00b050";
                                color = "#fff";
                            } else if (s.votes[myGameId()] === ans) {
                                bg = "#dc3545";
                                color = "#fff";
                            }
                        } else if (s.votes[myGameId()] === ans) {
                            bg = "#00b0ff";
                            color = "#fff";
                        }

                        return `
                            <button onclick="window.submitTriviaAnswer('${String(ans).replace(/'/g, "\\'")}')"
                                ${s.phase !== "vote" || voted ? "disabled" : ""}
                                style="background:${bg};color:${color};border:none;border-radius:8px;padding:11px;
                                font-size:15px;font-weight:900;text-align:left;box-shadow:0 2px 5px rgba(0,0,0,0.25);">
                                ${escapeHtml(ans)}
                            </button>`;
                    }).join("")}
                </div>

                <div style="font-size:12px;color:#a3cfbb;font-weight:bold;">
                    Votes: ${Object.keys(s.votes).length}/${s.players.length}
                </div>

                ${s.phase === "reveal" ? `
                    <button onclick="window.nextTriviaRound()"
                        style="background:#ffd700;color:#1e4620;border:none;border-radius:8px;padding:10px 20px;
                        font-size:16px;font-weight:900;font-family:Impact,sans-serif;">
                        ${s.round >= s.totalRounds ? "FINISH" : "NEXT"}
                    </button>
                ` : ""}
            </div>`;
    }

    /* ============================================================
       5. SOLITAIRE – DRAW 1, CLEAN MOBILE LAYOUT
       ============================================================ */

    window.initSolitaireGame = function () {
        const suits = ["S", "C", "H", "D"];
        const symbols = { S: "♠", C: "♣", H: "♥", D: "♦" };
        const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

        let deck = [];

        suits.forEach(s => {
            ranks.forEach((r, idx) => {
                deck.push({
                    suit: s,
                    symbol: symbols[s],
                    rank: r,
                    value: idx + 1,
                    red: s === "H" || s === "D",
                    open: false
                });
            });
        });

        deck = shuffle(deck);

        window.solState = {
            tableau: Array(7).fill(0).map(() => []),
            stock: deck,
            waste: [],
            foundations: { S: [], C: [], H: [], D: [] },
            selected: null
        };

        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                const card = window.solState.stock.pop();
                card.open = row === col;
                window.solState.tableau[col].push(card);
            }
        }

        renderSolitaireBoard();
    };

    function cardHtml(card, onclick, selected, small = false) {
        if (!card) return "";

        const w = small ? 42 : 44;
        const h = small ? 58 : 62;

        if (!card.open) {
            return `
                <div ${onclick ? `onclick="${onclick}"` : ""}
                    style="width:${w}px;height:${h}px;border-radius:6px;background:linear-gradient(135deg,#222,#111);
                    border:2px solid #ffd700;display:flex;align-items:center;justify-content:center;
                    color:#ffd700;font-size:22px;font-weight:900;box-sizing:border-box;box-shadow:0 2px 5px rgba(0,0,0,0.35);">
                    ⚡
                </div>`;
        }

        return `
            <div ${onclick ? `onclick="${onclick}"` : ""}
                style="width:${w}px;height:${h}px;border-radius:6px;background:#fff;color:${card.red ? '#c40000' : '#111'};
                border:${selected ? '3px solid #ffd700' : '1px solid #555'};box-sizing:border-box;position:relative;
                display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 5px rgba(0,0,0,0.35);overflow:hidden;">
                <div style="position:absolute;top:3px;left:4px;font-size:15px;font-weight:900;line-height:1;">
                    ${card.rank}
                </div>
                <div style="font-size:30px;font-weight:900;line-height:1;">
                    ${card.symbol}
                </div>
                <div style="position:absolute;bottom:3px;right:4px;font-size:15px;font-weight:900;line-height:1;transform:rotate(180deg);">
                    ${card.rank}
                </div>
            </div>`;
    }

    function renderSolitaireBoard() {
        const s = window.solState;
        if (!s) return;

        let html = `
            <div style="height:100%;width:100%;display:flex;flex-direction:column;gap:8px;
                padding:6px;box-sizing:border-box;user-select:none;overflow:auto;">
                <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
                    <div onclick="window.drawSolitaireCard()"
                        style="width:44px;height:62px;border-radius:6px;background:${s.stock.length ? 'linear-gradient(135deg,#222,#111)' : 'rgba(255,255,255,0.08)'};
                        border:2px solid #ffd700;color:#ffd700;display:flex;align-items:center;justify-content:center;
                        font-size:22px;font-weight:900;box-sizing:border-box;cursor:pointer;">
                        ${s.stock.length ? "⚡" : "↻"}
                    </div>

                    <div onclick="window.selectSolWaste()">
                        ${s.waste.length ? cardHtml(s.waste[s.waste.length - 1], "", s.selected?.type === "waste") :
                            `<div style="width:44px;height:62px;border-radius:6px;border:2px dashed rgba(255,255,255,0.25);"></div>`}
                    </div>

                    <div style="flex:1;"></div>

                    ${["S", "C", "H", "D"].map(suit => {
                        const pile = s.foundations[suit];
                        const top = pile[pile.length - 1];
                        return `
                            <div onclick="window.moveSolToFoundation('${suit}')" style="margin-left:4px;">
                                ${top ? cardHtml(top, "", false, true) :
                                    `<div style="width:42px;height:58px;border-radius:6px;border:2px dashed rgba(255,215,0,0.35);
                                    color:rgba(255,215,0,0.5);display:flex;align-items:center;justify-content:center;font-weight:900;">
                                    ${suit}</div>`}
                            </div>`;
                    }).join("")}
                </div>

                <div style="display:flex;justify-content:space-between;align-items:flex-start;width:100%;min-height:340px;">
        `;

        for (let col = 0; col < 7; col++) {
            const pile = s.tableau[col];

            html += `
                <div onclick="window.moveSolToColumn(${col})"
                    style="width:44px;min-height:62px;position:relative;border-radius:6px;
                    ${pile.length ? '' : 'border:2px dashed rgba(255,215,0,0.25);'}">`;

            pile.forEach((card, idx) => {
                const selected = s.selected?.type === "tableau" && s.selected.col === col && s.selected.idx === idx;
                const top = idx * (card.open ? 22 : 9);

                html += `
                    <div style="position:absolute;top:${top}px;left:0;"
                        onclick="event.stopPropagation(); window.selectSolTableau(${col}, ${idx})">
                        ${cardHtml(card, "", selected)}
                    </div>`;
            });

            html += `</div>`;
        }

        html += `
                </div>
            </div>`;

        gameCanvas.innerHTML = html;
    }

    window.drawSolitaireCard = function () {
        const s = window.solState;
        if (!s) return;

        s.selected = null;

        if (s.stock.length) {
            const card = s.stock.pop();
            card.open = true;
            s.waste.push(card);
        } else {
            s.stock = s.waste.reverse().map(c => ({ ...c, open: false }));
            s.waste = [];
        }

        renderSolitaireBoard();
    };

    window.selectSolWaste = function () {
        const s = window.solState;
        if (!s || !s.waste.length) return;
        s.selected = { type: "waste" };
        renderSolitaireBoard();
    };

    window.selectSolTableau = function (col, idx) {
        const s = window.solState;
        if (!s || !s.tableau[col][idx]?.open) return;
        s.selected = { type: "tableau", col, idx };
        renderSolitaireBoard();
    };

    function selectedSolCards() {
        const s = window.solState;
        if (!s || !s.selected) return [];

        if (s.selected.type === "waste") {
            return [s.waste[s.waste.length - 1]];
        }

        return s.tableau[s.selected.col].slice(s.selected.idx);
    }

    function removeSelectedSolCards() {
        const s = window.solState;
        if (s.selected.type === "waste") {
            return [s.waste.pop()];
        }

        const moving = s.tableau[s.selected.col].splice(s.selected.idx);
        const origin = s.tableau[s.selected.col];
        if (origin.length && !origin[origin.length - 1].open) {
            origin[origin.length - 1].open = true;
        }
        return moving;
    }

    window.moveSolToColumn = function (toCol) {
        const s = window.solState;
        if (!s || !s.selected) return;

        const moving = selectedSolCards();
        if (!moving.length) return;

        const first = moving[0];
        const targetPile = s.tableau[toCol];
        const top = targetPile[targetPile.length - 1];

        let valid = false;

        if (!top && first.value === 13) valid = true;
        if (top && top.open && top.red !== first.red && top.value === first.value + 1) valid = true;

        if (valid) {
            const cards = removeSelectedSolCards();
            s.tableau[toCol].push(...cards);
        }

        s.selected = null;
        renderSolitaireBoard();
    };

    window.moveSolToFoundation = function (suit) {
        const s = window.solState;
        if (!s || !s.selected) return;

        const moving = selectedSolCards();
        if (moving.length !== 1) return;

        const card = moving[0];
        if (card.suit !== suit) return;

        const foundation = s.foundations[suit];
        const top = foundation[foundation.length - 1];

        let valid = false;
        if (!top && card.value === 1) valid = true;
        if (top && card.value === top.value + 1) valid = true;

        if (valid) {
            const cards = removeSelectedSolCards();
            foundation.push(cards[0]);
        }

        s.selected = null;
        renderSolitaireBoard();
    };

    /* ============================================================
       6. HANGMAN – CLEAN SINGLE PLAYER
       ============================================================ */

    const WORDS = [
        "CHASER", "UNICYCLE", "ADVENTURE", "BATTERY", "ROUTE",
        "POSTAL", "NAVIGATOR", "HIGHWAY", "HELMET", "COMPASS"
    ];

    window.initHangmanGame = function () {
        const word = WORDS[Math.floor(Math.random() * WORDS.length)];
        window.hangmanState = {
            word,
            guessed: [],
            wrong: 0,
            maxWrong: 6
        };
        renderHangmanGame();
    };

    function renderHangmanGame() {
        const s = window.hangmanState;
        if (!s) return;

        const won = s.word.split("").every(l => s.guessed.includes(l));
        const lost = s.wrong >= s.maxWrong;

        const body = [
            "O",
            "|",
            "/",
            "\\",
            "/",
            "\\"
        ].slice(0, s.wrong).join(" ");

        gameCanvas.innerHTML = `
            <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
                gap:10px;color:white;text-align:center;padding:12px;box-sizing:border-box;user-select:none;">
                <div style="font-size:28px;color:#ffd700;font-family:Impact,sans-serif;">HANGMAN</div>
                <div style="height:46px;color:${lost ? '#dc3545' : '#e2f0d9'};font-size:24px;font-weight:900;">
                    ${body}
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">
                    ${s.word.split("").map(l => `
                        <div style="border-bottom:4px solid #e2f0d9;width:24px;height:34px;font-size:26px;font-weight:900;color:#ffd700;">
                            ${s.guessed.includes(l) || lost ? l : ""}
                        </div>
                    `).join("")}
                </div>

                ${won || lost ? `
                    <div style="font-size:20px;font-weight:900;color:${won ? '#00b050' : '#dc3545'};">
                        ${won ? "YOU GOT IT!" : "GAME OVER"}
                    </div>
                    <button onclick="window.initHangmanGame()"
                        style="background:#ffd700;color:#1e4620;border:none;border-radius:8px;padding:10px 20px;
                        font-size:18px;font-weight:900;font-family:Impact,sans-serif;">NEW GAME</button>
                ` : `
                    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;width:100%;max-width:330px;">
                        ${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l => {
                            const used = s.guessed.includes(l);
                            return `
                                <button onclick="window.pickHangmanLetter('${l}')" ${used ? "disabled" : ""}
                                    style="height:34px;border:none;border-radius:5px;background:${used ? '#6c757d' : '#e2f0d9'};
                                    color:${used ? '#fff' : '#1e4620'};font-size:17px;font-weight:900;">
                                    ${l}
                                </button>`;
                        }).join("")}
                    </div>
                `}
            </div>`;
    }

    window.pickHangmanLetter = function (letter) {
        const s = window.hangmanState;
        if (!s || s.guessed.includes(letter)) return;

        s.guessed.push(letter);
        if (!s.word.includes(letter)) s.wrong++;

        renderHangmanGame();
    };

})();
})();

})();

/* ============================================================
   CHASER LOBBY FIX PATCH
   Stops auto-joining people who are only sitting in chat.
   Players must tap the same game and choose Join.
   ============================================================ */

(function () {
    "use strict";

    const openLobbyRegistry = {};
    const originalLaunchGameEngine = window.launchGameEngine;
    const originalLobbyUpdateHandler = window.handleIncomingChaserGameLobbyUpdate;
    const originalLobbyStartHandler = window.handleIncomingChaserGameLobbyStart;

    const gameCanvas = document.getElementById("gameCanvasContainer");
    const gameStage = document.getElementById("activeGameStage");
    const gameHub = document.getElementById("gameHubOverlay");
    const roomDisplayCode = document.getElementById("roomDisplayCode");
    const headerButtons = document.getElementById("headerActionButtonsContainer");
    const chatHeader = document.getElementById("chatHeader");

    function myGameId() {
        return window.myId || localStorage.getItem("rider_id") || "local-player";
    }

    function myGameName() {
        const input = document.getElementById("username");
        return (input && input.value.trim()) || localStorage.getItem("rider_saved_name") || "Player";
    }

    function normalizeGameName(name) {
        if (name === "Battle Uno") return "Uno";
        if (name === "Crew Trivia") return "Trivia";
        return name;
    }

    function iconForGame(name) {
        return {
            "Checkers": "🔴",
            "Sequence": "⚔️",
            "Uno": "🃏",
            "Trivia": "🧠"
        }[normalizeGameName(name)] || "🎮";
    }

    function sendGameEvent(event, payload) {
        if (typeof channel !== "undefined" && channel && typeof channel.send === "function") {
            channel.send({
                type: "broadcast",
                event,
                payload: {
                    ...payload,
                    senderId: myGameId(),
                    senderName: myGameName(),
                    roomGameId: window.chaserGame?.activeGameId || payload.roomGameId || null
                }
            });
        }
    }

    function openGameShell(title) {
        if (gameHub) gameHub.classList.remove("open");
        if (gameStage) gameStage.classList.add("open");

        if (roomDisplayCode) {
            roomDisplayCode.innerText = title;
            roomDisplayCode.classList.remove("youtube-pill-title");
            roomDisplayCode.style.fontSize = "18px";
        }

        if (headerButtons) headerButtons.style.display = "none";
        if (chatHeader) chatHeader.classList.add("game-active-mode");
    }

    function renderJoinChoice(lobby, requestedGameName) {
        const gameName = normalizeGameName(requestedGameName);
        const hostName = lobby.hostName || lobby.players?.[0]?.name || "Host";
        const currentCount = lobby.players?.length || 1;
        const expected = lobby.expectedPlayers || 2;

        openGameShell(`${iconForGame(gameName)} ${gameName}`);

        gameCanvas.innerHTML = `
            <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
                gap:14px;padding:16px;box-sizing:border-box;text-align:center;color:white;">
                <div style="font-size:28px;color:#ffd700;font-family:Impact,sans-serif;font-weight:900;">
                    ${iconForGame(gameName)} ${gameName}
                </div>

                <div style="background:#e2f0d9;color:#1e4620;border-radius:12px;padding:12px;width:100%;max-width:300px;
                    font-weight:900;box-sizing:border-box;">
                    ${hostName} has an open game<br>
                    ${currentCount}/${expected} players joined
                </div>

                <button onclick="window.joinChaserOpenLobby('${lobby.roomGameId}')"
                    style="background:#00b050;color:white;border:none;border-radius:10px;padding:13px 18px;
                    width:100%;max-width:300px;font-size:18px;font-weight:900;font-family:Impact,sans-serif;
                    box-shadow:0 4px 10px rgba(0,0,0,0.35);">
                    JOIN THIS GAME
                </button>

                <button onclick="window.startSeparateChaserGame('${requestedGameName}')"
                    style="background:#ffd700;color:#1e4620;border:none;border-radius:10px;padding:13px 18px;
                    width:100%;max-width:300px;font-size:18px;font-weight:900;font-family:Impact,sans-serif;
                    box-shadow:0 4px 10px rgba(0,0,0,0.35);">
                    START NEW GAME
                </button>
            </div>
        `;
    }

    function renderJoinedLobby() {
        const g = window.chaserGame;
        const players = g.players || [];
        const waiting = Math.max(0, (g.expectedPlayers || 2) - players.length);

        openGameShell(`${iconForGame(g.activeGame)} ${g.activeGame}`);

        gameCanvas.innerHTML = `
            <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
                gap:12px;padding:16px;box-sizing:border-box;text-align:center;color:white;">
                <div style="font-size:28px;color:#ffd700;font-family:Impact,sans-serif;font-weight:900;">
                    ${iconForGame(g.activeGame)} ${g.activeGame}
                </div>

                <div style="font-size:15px;color:#e2f0d9;font-weight:bold;">
                    Expected Players: ${g.expectedPlayers}
                </div>

                <div style="width:100%;max-width:320px;display:flex;flex-direction:column;gap:7px;">
                    ${players.map(p => `
                        <div style="background:#e2f0d9;color:#1e4620;border-radius:8px;padding:8px 10px;
                            font-size:16px;font-weight:900;display:flex;justify-content:space-between;">
                            <span>✓ ${p.name}</span>
                            <span>Seat ${p.seat + 1}</span>
                        </div>
                    `).join("")}

                    ${Array.from({ length: waiting }).map(() => `
                        <div style="background:rgba(255,255,255,0.08);color:#a3cfbb;border:2px dashed rgba(226,240,217,0.25);
                            border-radius:8px;padding:8px 10px;font-size:16px;font-weight:bold;">
                            Waiting for player...
                        </div>
                    `).join("")}
                </div>

                <div style="color:#a3cfbb;font-size:14px;font-weight:bold;">
                    Waiting for host to start...
                </div>
            </div>
        `;
    }

    window.handleIncomingChaserGameLobby = function (payload) {
        if (!payload || !payload.roomGameId || !payload.gameName) return;

        payload.hostName = payload.senderName || payload.players?.[0]?.name || "Host";
        openLobbyRegistry[payload.roomGameId] = payload;
    };

    window.handleIncomingChaserGameLobbyUpdate = function (payload) {
        if (!payload || !payload.roomGameId) return;

        if (openLobbyRegistry[payload.roomGameId]) {
            openLobbyRegistry[payload.roomGameId] = {
                ...openLobbyRegistry[payload.roomGameId],
                ...payload
            };
        }

        if (window.chaserGame && window.chaserGame.activeGameId === payload.roomGameId) {
            window.chaserGame.players = payload.players || window.chaserGame.players;
            window.chaserGame.expectedPlayers = payload.expectedPlayers || window.chaserGame.expectedPlayers;
            window.chaserGame.hostId = payload.hostId || window.chaserGame.hostId;

            const me = window.chaserGame.players.find(p => p.id === myGameId());
            if (me) window.chaserGame.mySeat = me.seat;

            renderJoinedLobby();
        }

        if (originalLobbyUpdateHandler) {
            try { originalLobbyUpdateHandler(payload); } catch(e) {}
        }
    };

    window.launchGameEngine = function (gameName, gameIcon) {
        const normalized = normalizeGameName(gameName);

        const matchingLobby = Object.values(openLobbyRegistry).find(lobby => {
            const lobbyName = normalizeGameName(lobby.gameName);
            const players = lobby.players || [];
            const expected = lobby.expectedPlayers || 2;
            const alreadyIn = players.some(p => p.id === myGameId());

            return lobbyName === normalized && !alreadyIn && players.length < expected;
        });

        if (matchingLobby) {
            renderJoinChoice(matchingLobby, gameName);
            return;
        }

        originalLaunchGameEngine(gameName, gameIcon);
    };

    window.joinChaserOpenLobby = function (roomGameId) {
        const lobby = openLobbyRegistry[roomGameId];
        if (!lobby) return;

        const players = lobby.players || [];
        const expected = lobby.expectedPlayers || 2;

        if (players.length >= expected) {
            alert("That game is already full.");
            return;
        }

        const alreadyIn = players.some(p => p.id === myGameId());
        if (alreadyIn) return;

        const mySeat = players.length;

        const updatedPlayers = players.concat([{
            id: myGameId(),
            name: myGameName(),
            seat: mySeat
        }]);

        window.chaserGame = window.chaserGame || {};
        window.chaserGame.activeGame = normalizeGameName(lobby.gameName);
        window.chaserGame.activeGameId = roomGameId;
        window.chaserGame.expectedPlayers = expected;
        window.chaserGame.hostId = lobby.hostId;
        window.chaserGame.players = updatedPlayers;
        window.chaserGame.mySeat = mySeat;
        window.chaserGame.currentLobby = {
            gameName: normalizeGameName(lobby.gameName),
            expectedPlayers: expected
        };

        openLobbyRegistry[roomGameId] = {
            ...lobby,
            players: updatedPlayers
        };

        sendGameEvent("chaser-game-lobby-update", {
            roomGameId,
            gameName: normalizeGameName(lobby.gameName),
            expectedPlayers: expected,
            players: updatedPlayers,
            hostId: lobby.hostId
        });

        renderJoinedLobby();
    };

    window.startSeparateChaserGame = function (gameName) {
        originalLaunchGameEngine(gameName, iconForGame(gameName));
    };
})();
/* CHASER SEQUENCE OVERRIDE – paste at bottom of games.js */
(function () {
    const gameCanvas = document.getElementById("gameCanvasContainer");
    const gameStage = document.getElementById("activeGameStage");

    const SUITS = ["S","H","D","C"];
    const RANKS = ["A","K","Q","10","9","8","7","6","5","4","3","2"];
    const SYMBOL = { S:"♠", H:"♥", D:"♦", C:"♣" };

    const SPIRAL = [
        0,1,2,3,4,5,6,7,8,9,19,29,39,49,59,69,79,89,99,98,97,96,95,94,93,92,91,90,
        80,70,60,50,40,30,20,10,11,12,13,14,15,16,17,18,28,38,48,58,68,78,88,87,
        86,85,84,83,82,81,71,61,51,41,31,21,22,23,24,25,26,27,37,47,57,67,77,76,
        75,74,73,72,62,52,42,32,33,34,35,36,46,56,66,65,64,63,53,43,44,45,55,54
    ];

    function buildSeqLayout() {
        const grid = Array(100).fill(null);
        [0,9,90,99].forEach(i => grid[i] = "FREE");

        let cards = [];
        for (let copy = 0; copy < 2; copy++) {
            SUITS.forEach(s => RANKS.forEach(r => cards.push(r + s)));
        }

        let cardIndex = 0;
        SPIRAL.forEach(i => {
            if (grid[i] === null) grid[i] = cards[cardIndex++];
        });

        return grid;
    }

    const SEQ_LAYOUT = buildSeqLayout();

    function myId() {
        return window.myId || localStorage.getItem("rider_id") || "local-player";
    }

    function send(event, payload) {
        if (typeof channel !== "undefined" && channel) {
            channel.send({
                type:"broadcast",
                event,
                payload:{ ...payload, roomGameId:window.chaserGame?.activeGameId || null, senderId:myId() }
            });
        }
    }

    function buildDeck() {
        let deck = [];
        for (let copy = 0; copy < 2; copy++) {
            ["S","H","D","C"].forEach(s => {
                ["A","K","Q","J","10","9","8","7","6","5","4","3","2"].forEach(r => deck.push(r+s));
            });
        }
        return deck.sort(() => Math.random() - 0.5);
    }

    function cardParts(card) {
        if (card === "FREE") return { r:"★", s:"", red:false };
        const s = card.slice(-1);
        return { r:card.slice(0,-1), s:SYMBOL[s], red:s==="H" || s==="D" };
    }

    function twoEyedJack(c) { return c === "JC" || c === "JD"; }
    function oneEyedJack(c) { return c === "JS" || c === "JH"; }

    window.initSequenceGame = function () {
        window.chaserGame.activeGame = "Sequence";
        const host = window.chaserGame.hostId === myId();

        if (host || !window.seqState) {
            const deck = buildDeck();
            const hands = [[],[]];
            for (let p=0; p<2; p++) for (let i=0; i<7; i++) hands[p].push(deck.pop());

            window.seqState = {
                board:Array(100).fill(0),
                locked:Array(100).fill(0),
                deck,
                hands,
                turn:1,
                selected:null,
                sequences:[0,0],
                winner:null,
                msg:"Blue starts."
            };
            syncSeq();
        }
        renderSeq();
    };

    function syncSeq() {
        send("sequence-sync-state", { state:window.seqState });
    }

    window.receiveSequenceSync = function (p) {
        if (!p || !p.state) return;
        if (p.roomGameId && window.chaserGame?.activeGameId && p.roomGameId !== window.chaserGame.activeGameId) return;
        window.seqState = p.state;
        if (gameStage?.classList.contains("open") && window.chaserGame.activeGame === "Sequence") renderSeq();
    };

    function team() {
        return (window.chaserGame.mySeat || 0) === 0 ? 1 : 2;
    }

    function teamName(t) { return t === 1 ? "BLUE" : "RED"; }
    function teamColor(t) { return t === 1 ? "#00b0ff" : "#e63946"; }

    function countNewSequences(t) {
        const st = window.seqState;
        const dirs = [[1,0],[0,1],[1,1],[1,-1]];
        let added = 0;

        function owned(i) {
            return SEQ_LAYOUT[i] === "FREE" || st.board[i] === t;
        }

        for (let r=0; r<10; r++) for (let c=0; c<10; c++) {
            dirs.forEach(([dr,dc]) => {
                let cells = [];
                for (let k=0; k<5; k++) {
                    const nr = r + dr*k, nc = c + dc*k;
                    if (nr<0 || nr>9 || nc<0 || nc>9) return;
                    cells.push(nr*10+nc);
                }
                if (cells.length === 5 && cells.every(owned) && cells.some(i => st.locked[i] !== t && SEQ_LAYOUT[i] !== "FREE")) {
                    cells.forEach(i => { if (SEQ_LAYOUT[i] !== "FREE") st.locked[i] = t; });
                    added++;
                }
            });
        }
        return added;
    }

    function drawReplacement(seat) {
        const st = window.seqState;
        if (st.deck.length) st.hands[seat][st.selected] = st.deck.pop();
        else st.hands[seat].splice(st.selected, 1);
    }

    function renderSeq() {
        const st = window.seqState;
        if (!st) return;

        const seat = window.chaserGame.mySeat || 0;
        const myTeam = team();
        const hand = st.hands[seat] || [];
        const selectedCard = st.selected !== null ? hand[st.selected] : null;
        const myTurn = st.turn === myTeam && !st.winner;

        const boardMax = Math.min(window.innerWidth - 34, 310);
        const cell = Math.floor(boardMax / 10);
        const boardSize = cell * 10;

        let html = `
        <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;gap:4px;overflow:hidden;box-sizing:border-box;">
            <div style="width:100%;display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:900;">
                <span style="color:#ffd700;">${teamName(st.turn)} TURN</span>
                <span style="color:${myTurn ? "#00b050" : "#a3cfbb"};">${st.winner ? teamName(st.winner)+" WINS" : myTurn ? "YOUR MOVE" : "WAITING"}</span>
                <span style="color:#e2f0d9;">🔵 ${st.sequences[0]} | 🔴 ${st.sequences[1]}</span>
            </div>
            <div style="color:#ffd700;font-size:11px;font-weight:bold;height:14px;">${st.msg || ""}</div>
            <div style="width:${boardSize}px;height:${boardSize}px;display:grid;grid-template-columns:repeat(10,${cell}px);grid-template-rows:repeat(10,${cell}px);gap:1px;background:#111;border:3px solid #ffd700;border-radius:6px;overflow:hidden;">`;

        for (let i=0; i<100; i++) {
            const code = SEQ_LAYOUT[i];
            const p = cardParts(code);
            const chip = st.board[i];
            const locked = st.locked[i];

            let playable = false;
            if (myTurn && selectedCard && code !== "FREE") {
                if (twoEyedJack(selectedCard) && !chip) playable = true;
                else if (oneEyedJack(selectedCard) && chip && chip !== myTeam && !locked) playable = true;
                else if (!selectedCard.includes("J") && selectedCard === code && !chip) playable = true;
            }

            html += `
            <div onclick="handleSequenceCellTap(${i})" style="position:relative;background:${code==="FREE" ? "#1e4620" : playable ? "#fff3cd" : "#fff"};color:${p.red ? "#c40000" : "#111"};display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;${playable ? "box-shadow:inset 0 0 0 2px #ffd700;" : ""}">
                <span style="font-size:${code==="FREE" ? 17 : 10}px;font-weight:900;line-height:1;">${p.r}</span>
                <span style="font-size:13px;line-height:1;">${p.s}</span>
                ${chip ? `<div style="position:absolute;width:70%;height:70%;border-radius:50%;background:${teamColor(chip)};border:${locked ? "3px solid #ffd700" : "2px solid white"};box-shadow:0 2px 4px rgba(0,0,0,.45);z-index:2;color:white;font-size:10px;display:flex;align-items:center;justify-content:center;">${locked ? "★" : ""}</div>` : ""}
            </div>`;
        }

        html += `</div><div style="display:flex;gap:4px;justify-content:center;width:100%;padding-top:3px;">`;

        hand.forEach((c, idx) => {
            const p = cardParts(c);
            const sel = st.selected === idx;
            html += `
            <button onclick="selectSequenceCard(${idx})" style="width:40px;height:54px;border-radius:6px;border:${sel ? "3px solid #ffd700" : "1px solid #555"};background:#fff;color:${p.red ? "#c40000" : "#111"};font-weight:900;box-shadow:0 2px 5px rgba(0,0,0,.35);padding:0;">
                <div style="font-size:15px;line-height:1;">${p.r}</div>
                <div style="font-size:18px;line-height:1;">${p.s}</div>
                ${twoEyedJack(c) ? `<div style="font-size:8px;color:#2d6a30;">Wild</div>` : oneEyedJack(c) ? `<div style="font-size:8px;color:#dc3545;">Remove</div>` : ""}
            </button>`;
        });

        html += `</div></div>`;
        gameCanvas.innerHTML = html;
    }

    window.selectSequenceCard = function (idx) {
        const st = window.seqState;
        if (!st || st.winner || st.turn !== team()) return;
        st.selected = st.selected === idx ? null : idx;
        renderSeq();
    };

    window.handleSequenceCellTap = function (idx) {
        const st = window.seqState;
        if (!st || st.winner || st.turn !== team() || st.selected === null) return;

        const seat = window.chaserGame.mySeat || 0;
        const myTeam = team();
        const card = st.hands[seat][st.selected];
        const target = SEQ_LAYOUT[idx];

        let valid = false;

        if (target !== "FREE") {
            if (twoEyedJack(card) && !st.board[idx]) {
                st.board[idx] = myTeam;
                valid = true;
            } else if (oneEyedJack(card) && st.board[idx] && st.board[idx] !== myTeam && !st.locked[idx]) {
                st.board[idx] = 0;
                valid = true;
            } else if (!card.includes("J") && card === target && !st.board[idx]) {
                st.board[idx] = myTeam;
                valid = true;
            }
        }

        if (!valid) return;

        drawReplacement(seat);
        st.selected = null;

        const added = countNewSequences(myTeam);
        if (added) {
            st.sequences[myTeam - 1] += added;
            st.msg = `${teamName(myTeam)} made a sequence!`;
        }

        if (st.sequences[myTeam - 1] >= 2) {
            st.winner = myTeam;
            st.msg = `${teamName(myTeam)} wins!`;
        } else {
            st.turn = myTeam === 1 ? 2 : 1;
        }

        syncSeq();
        renderSeq();
    };
})();
/* CHASER QUICK FIX PACK – paste at bottom of games.js */
(function () {
    function myId() {
        return window.myId || localStorage.getItem("rider_id") || "local-player";
    }

    function syncGame(event, payload) {
        if (typeof channel !== "undefined" && channel) {
            channel.send({
                type: "broadcast",
                event,
                payload: {
                    ...payload,
                    senderId: myId(),
                    roomGameId: window.chaserGame?.activeGameId || payload.roomGameId || null
                }
            });
        }
    }

    function normalizeGameName(name) {
        if (name === "Crew Trivia") return "Trivia";
        if (name === "Battle Uno") return "Uno";
        return name;
    }

    window.handleIncomingChaserGameLobbyStart = function (payload) {
        if (!payload) return;

        if (window.chaserGame && payload.roomGameId && window.chaserGame.activeGameId !== payload.roomGameId) {
            return;
        }

        const gameName = normalizeGameName(payload.gameName);

        window.chaserGame = window.chaserGame || {};
        window.chaserGame.activeGame = gameName;
        window.chaserGame.activeGameId = payload.roomGameId;
        window.chaserGame.expectedPlayers = payload.expectedPlayers;
        window.chaserGame.players = payload.players || [];
        window.chaserGame.hostId = payload.hostId;

        const me = window.chaserGame.players.find(p => p.id === myId());
        if (me) window.chaserGame.mySeat = me.seat;

        if (gameName === "Trivia" && typeof window.initTriviaGame === "function") {
            window.initTriviaGame();
        } else if (gameName === "Uno" && typeof window.initChaserUnoGame === "function") {
            window.initChaserUnoGame();
        } else if (gameName === "Sequence" && typeof window.initSequenceGame === "function") {
            window.initSequenceGame();
        }
    };

    window.unoDrawCard = function () {
        const s = window.unoState;
        if (!s || s.winner) return;

        const mySeat = window.chaserGame.mySeat || 0;
        if (s.turn !== mySeat) return;

        const discard = s.discard;
        let drawn = 0;
        let foundPlayable = false;

        while (s.deck.length) {
            const card = s.deck.pop();
            s.hands[mySeat].push(card);
            drawn++;

            if (
                card.color === discard.color ||
                card.value === discard.value ||
                card.color === "Wild"
            ) {
                foundPlayable = true;
                break;
            }
        }

        s.message = foundPlayable
            ? `Drew ${drawn} card${drawn === 1 ? "" : "s"} and found a play.`
            : `Drew ${drawn} card${drawn === 1 ? "" : "s"}, no play found.`;

        syncGame("uno-sync-discard", { state: s });

        if (typeof window.receiveUnoSync === "function") {
            window.receiveUnoSync({ state: s, roomGameId: window.chaserGame.activeGameId });
        }

        setTimeout(() => {
            const scrollers = document.querySelectorAll('[style*="overflow-x:auto"], [style*="overflow-x: auto"]');
            scrollers.forEach(scroller => {
                scroller.scrollLeft = scroller.scrollWidth;
            });
        }, 80);
    };

    const gameCanvas = document.getElementById("gameCanvasContainer");

    const visualFixObserver = new MutationObserver(() => {
        if (!window.chaserGame) return;

        if (window.chaserGame.activeGame === "Sequence") {
            const root = gameCanvas.firstElementChild;
            if (root) {
                root.style.overflow = "auto";
                root.style.paddingRight = "10px";
                root.style.paddingBottom = "10px";
            }

            const board = Array.from(gameCanvas.querySelectorAll("div")).find(d =>
                d.style.gridTemplateColumns && d.style.gridTemplateColumns.includes("repeat(10")
            );

            if (board) {
                board.style.transform = "scale(0.88)";
                board.style.transformOrigin = "top left";
                board.style.marginRight = "26px";
                board.style.marginBottom = "26px";
            }
        }

        if (window.chaserGame.activeGame === "Uno") {
            setTimeout(() => {
                const scrollers = document.querySelectorAll('[style*="overflow-x:auto"], [style*="overflow-x: auto"]');
                scrollers.forEach(scroller => {
                    scroller.scrollLeft = scroller.scrollWidth;
                });
            }, 80);
        }
    });

    if (gameCanvas) {
        visualFixObserver.observe(gameCanvas, { childList: true, subtree: true });
    }

    const WORDS = [
        "CHASER", "UNICYCLE", "ADVENTURE", "BATTERY", "ROUTE",
        "POSTAL", "NAVIGATOR", "HIGHWAY", "HELMET", "COMPASS"
    ];

    window.initHangmanGame = function () {
        const word = WORDS[Math.floor(Math.random() * WORDS.length)];
        window.hangmanState = {
            word,
            guessed: [],
            wrong: 0,
            maxWrong: 6
        };
        renderSafeHangman();
    };

    function buildChaserBot(wrong, lost) {
        const red = lost ? "#dc3545" : "#e2f0d9";
        const shake = lost ? "animation:botShake .45s ease-in-out 4;" : "";

        return `
            <svg viewBox="0 0 160 130" width="150" height="120" style="display:block;margin:0 auto;${shake}">
                <style>
                    @keyframes botShake {
                        0%,100% { transform:translateX(0); }
                        25% { transform:translateX(-4px); }
                        75% { transform:translateX(4px); }
                    }
                </style>

                <line x1="20" y1="118" x2="140" y2="118" stroke="#ffd700" stroke-width="5" stroke-linecap="round"/>
                <line x1="45" y1="118" x2="45" y2="18" stroke="#ffd700" stroke-width="5" stroke-linecap="round"/>
                <line x1="45" y1="18" x2="112" y2="18" stroke="#ffd700" stroke-width="5" stroke-linecap="round"/>
                <line x1="112" y1="18" x2="112" y2="34" stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>

                ${wrong >= 1 ? `<circle cx="112" cy="47" r="14" fill="none" stroke="${red}" stroke-width="4"/>` : ""}
                ${wrong >= 1 && lost ? `
                    <text x="102" y="52" fill="${red}" font-size="14" font-weight="900">X X</text>
                ` : wrong >= 1 ? `
                    <circle cx="106" cy="44" r="2" fill="${red}"/>
                    <circle cx="118" cy="44" r="2" fill="${red}"/>
                    <path d="M105 53 Q112 58 119 53" stroke="${red}" stroke-width="2" fill="none"/>
                ` : ""}

                ${wrong >= 2 ? `<rect x="99" y="62" width="26" height="34" rx="8" fill="none" stroke="${red}" stroke-width="4"/>` : ""}
                ${wrong >= 3 ? `<line x1="99" y1="70" x2="78" y2="88" stroke="${red}" stroke-width="4" stroke-linecap="round"/>` : ""}
                ${wrong >= 4 ? `<line x1="125" y1="70" x2="146" y2="88" stroke="${red}" stroke-width="4" stroke-linecap="round"/>` : ""}
                ${wrong >= 5 ? `<line x1="105" y1="96" x2="90" y2="118" stroke="${red}" stroke-width="4" stroke-linecap="round"/>` : ""}
                ${wrong >= 6 ? `<line x1="119" y1="96" x2="134" y2="118" stroke="${red}" stroke-width="4" stroke-linecap="round"/>` : ""}
            </svg>
        `;
    }

    function renderSafeHangman() {
        const s = window.hangmanState;
        if (!s || !gameCanvas) return;

        const won = s.word.split("").every(l => s.guessed.includes(l));
        const lost = s.wrong >= s.maxWrong;

        gameCanvas.innerHTML = `
            <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
                gap:7px;color:white;text-align:center;padding:8px;box-sizing:border-box;user-select:none;overflow:auto;">
                
                <div style="font-size:24px;color:#ffd700;font-family:Impact,sans-serif;font-weight:900;">HANGMAN</div>

                ${buildChaserBot(s.wrong, lost)}

                <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:center;">
                    ${s.word.split("").map(l => `
                        <div style="border-bottom:4px solid #e2f0d9;width:23px;height:31px;font-size:24px;font-weight:900;color:#ffd700;">
                            ${s.guessed.includes(l) || lost ? l : ""}
                        </div>
                    `).join("")}
                </div>

                ${won || lost ? `
                    <div style="font-size:18px;font-weight:900;color:${won ? "#00b050" : "#dc3545"};">
                        ${won ? "YOU GOT IT!" : "GAME OVER"}
                    </div>
                    <button onclick="window.initHangmanGame()"
                        style="background:#ffd700;color:#1e4620;border:none;border-radius:8px;padding:9px 18px;
                        font-size:17px;font-weight:900;font-family:Impact,sans-serif;">NEW GAME</button>
                ` : `
                    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;width:100%;max-width:330px;">
                        ${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l => {
                            const used = s.guessed.includes(l);
                            return `
                                <button onclick="window.pickHangmanLetter('${l}')" ${used ? "disabled" : ""}
                                    style="height:31px;border:none;border-radius:5px;background:${used ? "#6c757d" : "#e2f0d9"};
                                    color:${used ? "#fff" : "#1e4620"};font-size:16px;font-weight:900;">
                                    ${l}
                                </button>`;
                        }).join("")}
                    </div>
                `}
            </div>
        `;
    }

    window.pickHangmanLetter = function (letter) {
        const s = window.hangmanState;
        if (!s || s.guessed.includes(letter)) return;

        s.guessed.push(letter);
        if (!s.word.includes(letter)) s.wrong++;

        renderSafeHangman();
    };
})();
/* CHASER PATCH A – Sequence layout + Hangman spacing + Trivia host/timer */
(function () {
    const gameCanvas = document.getElementById("gameCanvasContainer");
    const gameStage = document.getElementById("activeGameStage");

    function myId() {
        return window.myId || localStorage.getItem("rider_id") || "local-player";
    }

    function isHost() {
        return window.chaserGame && window.chaserGame.hostId === myId();
    }

    function send(event, payload) {
        if (typeof channel !== "undefined" && channel) {
            channel.send({
                type: "broadcast",
                event,
                payload: {
                    ...payload,
                    senderId: myId(),
                    roomGameId: window.chaserGame?.activeGameId || null
                }
            });
        }
    }

    /* -------- Sequence visual centering fix -------- */
    const seqVisualObserver = new MutationObserver(() => {
        if (!gameCanvas || !window.chaserGame || window.chaserGame.activeGame !== "Sequence") return;

        const root = gameCanvas.firstElementChild;
        if (root) {
            root.style.width = "100%";
            root.style.alignItems = "center";
            root.style.justifyContent = "flex-start";
            root.style.overflow = "auto";
            root.style.paddingLeft = "0";
            root.style.paddingRight = "0";
            root.style.boxSizing = "border-box";
        }

        const board = Array.from(gameCanvas.querySelectorAll("div")).find(d =>
            d.style.gridTemplateColumns && d.style.gridTemplateColumns.includes("repeat(10")
        );

        if (board) {
            board.style.transform = "none";
            board.style.marginLeft = "auto";
            board.style.marginRight = "auto";
            board.style.marginBottom = "10px";
            board.style.boxSizing = "content-box";
            board.style.border = "5px solid #ffd700";
            board.style.overflow = "visible";
        }
    });

    if (gameCanvas) {
        seqVisualObserver.observe(gameCanvas, { childList: true, subtree: true });
    }

    /* -------- Hangman override with taller stand and better spacing -------- */
    const WORDS = [
        "CHASER", "UNICYCLE", "ADVENTURE", "BATTERY", "ROUTE",
        "POSTAL", "NAVIGATOR", "HIGHWAY", "HELMET", "COMPASS"
    ];

    window.initHangmanGame = function () {
        const word = WORDS[Math.floor(Math.random() * WORDS.length)];
        window.hangmanState = {
            word,
            guessed: [],
            wrong: 0,
            maxWrong: 6
        };
        renderBetterHangman();
    };

    function buildBetterHangmanSVG(wrong, lost) {
        const bodyColor = lost ? "#dc3545" : "#e2f0d9";
        const shake = lost ? "animation:hangShake .45s ease-in-out 4;" : "";

        return `
            <svg viewBox="0 0 170 160" width="160" height="145" style="display:block;margin:0 auto;${shake}">
                <style>
                    @keyframes hangShake {
                        0%,100% { transform:translateX(0); }
                        25% { transform:translateX(-4px); }
                        75% { transform:translateX(4px); }
                    }
                </style>

                <line x1="20" y1="150" x2="145" y2="150" stroke="#ffd700" stroke-width="5" stroke-linecap="round"/>
                <line x1="45" y1="150" x2="45" y2="18" stroke="#ffd700" stroke-width="5" stroke-linecap="round"/>
                <line x1="45" y1="18" x2="120" y2="18" stroke="#ffd700" stroke-width="5" stroke-linecap="round"/>
                <line x1="120" y1="18" x2="120" y2="38" stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>

                <g style="${shake}">
                    ${wrong >= 1 ? `<circle cx="120" cy="53" r="14" stroke="${bodyColor}" stroke-width="4" fill="none"/>` : ""}
                    ${wrong >= 1 && lost ? `
                        <text x="110" y="58" fill="${bodyColor}" font-size="13" font-weight="900">X X</text>
                    ` : wrong >= 1 ? `
                        <circle cx="114" cy="50" r="2" fill="${bodyColor}"/>
                        <circle cx="126" cy="50" r="2" fill="${bodyColor}"/>
                        <path d="M114 60 Q120 64 126 60" stroke="${bodyColor}" stroke-width="2" fill="none"/>
                    ` : ""}

                    ${wrong >= 2 ? `<line x1="120" y1="68" x2="120" y2="105" stroke="${bodyColor}" stroke-width="4" stroke-linecap="round"/>` : ""}
                    ${wrong >= 3 ? `<line x1="120" y1="77" x2="99" y2="94" stroke="${bodyColor}" stroke-width="4" stroke-linecap="round"/>` : ""}
                    ${wrong >= 4 ? `<line x1="120" y1="77" x2="141" y2="94" stroke="${bodyColor}" stroke-width="4" stroke-linecap="round"/>` : ""}
                    ${wrong >= 5 ? `<line x1="120" y1="105" x2="103" y2="136" stroke="${bodyColor}" stroke-width="4" stroke-linecap="round"/>` : ""}
                    ${wrong >= 6 ? `<line x1="120" y1="105" x2="137" y2="136" stroke="${bodyColor}" stroke-width="4" stroke-linecap="round"/>` : ""}
                </g>
            </svg>
        `;
    }

    function renderBetterHangman() {
        const s = window.hangmanState;
        if (!s || !gameCanvas) return;

        const won = s.word.split("").every(l => s.guessed.includes(l));
        const lost = s.wrong >= s.maxWrong;

        gameCanvas.innerHTML = `
            <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;
                justify-content:flex-start;gap:6px;color:white;text-align:center;padding:6px 10px 12px 10px;
                box-sizing:border-box;user-select:none;overflow:auto;">

                <div style="font-size:23px;color:#ffd700;font-family:Impact,sans-serif;font-weight:900;line-height:1;">
                    HANGMAN
                </div>

                ${buildBetterHangmanSVG(s.wrong, lost)}

                <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:center;margin:4px 0 14px 0;">
                    ${s.word.split("").map(l => `
                        <div style="border-bottom:4px solid #e2f0d9;width:23px;height:31px;
                            font-size:24px;font-weight:900;color:#ffd700;">
                            ${s.guessed.includes(l) || lost ? l : ""}
                        </div>
                    `).join("")}
                </div>

                ${won || lost ? `
                    <div style="font-size:18px;font-weight:900;color:${won ? "#00b050" : "#dc3545"};">
                        ${won ? "YOU GOT IT!" : "GAME OVER"}
                    </div>
                    <button onclick="window.initHangmanGame()"
                        style="background:#ffd700;color:#1e4620;border:none;border-radius:8px;padding:9px 18px;
                        font-size:17px;font-weight:900;font-family:Impact,sans-serif;">NEW GAME</button>
                ` : `
                    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;width:100%;max-width:330px;margin-top:2px;">
                        ${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l => {
                            const used = s.guessed.includes(l);
                            return `
                                <button onclick="window.pickHangmanLetter('${l}')" ${used ? "disabled" : ""}
                                    style="height:32px;border:none;border-radius:5px;background:${used ? "#6c757d" : "#e2f0d9"};
                                    color:${used ? "#fff" : "#1e4620"};font-size:16px;font-weight:900;">
                                    ${l}
                                </button>`;
                        }).join("")}
                    </div>
                `}
            </div>
        `;
    }

    window.pickHangmanLetter = function (letter) {
        const s = window.hangmanState;
        if (!s || s.guessed.includes(letter)) return;

        s.guessed.push(letter);
        if (!s.word.includes(letter)) s.wrong++;

        renderBetterHangman();
    };

    /* -------- Trivia host-controlled synced phases -------- */
    const TRIVIA_POOL = [
        { q:"What planet is known as the Red Planet?", c:"Mars", a:["Venus","Mars","Jupiter","Saturn"] },
        { q:"How many sides does a hexagon have?", c:"6", a:["5","6","7","8"] },
        { q:"Which ocean is the largest?", c:"Pacific Ocean", a:["Atlantic Ocean","Indian Ocean","Pacific Ocean","Arctic Ocean"] },
        { q:"What is the capital of France?", c:"Paris", a:["Rome","Madrid","Paris","Berlin"] },
        { q:"What color do you get by mixing red and blue?", c:"Purple", a:["Green","Orange","Purple","Yellow"] },
        { q:"How many days are in a leap year?", c:"366", a:["365","366","364","360"] },
        { q:"What gas do plants absorb?", c:"Carbon dioxide", a:["Oxygen","Hydrogen","Carbon dioxide","Nitrogen"] },
        { q:"Which country invented pizza?", c:"Italy", a:["France","Italy","Mexico","Greece"] },
        { q:"How many continents are there?", c:"7", a:["5","6","7","8"] },
        { q:"Which animal is known as man's best friend?", c:"Dog", a:["Cat","Horse","Dog","Rabbit"] }
    ];

    function shuffle(arr) {
        const a = arr.slice();
        for (let i=a.length-1; i>0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function safe(str) {
        return String(str ?? "")
            .replace(/&/g,"&amp;")
            .replace(/</g,"&lt;")
            .replace(/>/g,"&gt;");
    }

    window.initTriviaGame = function () {
        window.chaserGame.activeGame = "Trivia";

        if (isHost() || !window.triviaState) {
            window.triviaState = {
                players: window.chaserGame.players || [{ id:myId(), name:"Player", seat:0 }],
                round:0,
                totalRounds:10,
                score:{},
                votes:{},
                current:null,
                phase:"menu",
                timer:0,
                phaseEndsAt:0
            };

            window.triviaState.players.forEach(p => {
                window.triviaState.score[p.id] = 0;
            });

            syncTrivia();
        }

        renderTriviaBetter();
    };

    function syncTrivia() {
        send("sync-room-trivia", { state:window.triviaState });
    }

    window.receiveTriviaSync = function (p) {
        if (!p || !p.state) return;
        if (p.roomGameId && window.chaserGame?.activeGameId && p.roomGameId !== window.chaserGame.activeGameId) return;

        window.triviaState = p.state;

        if (window.chaserGame) window.chaserGame.activeGame = "Trivia";

        renderTriviaBetter();
        runLocalTriviaClock();
    };

    function startHostPhase(phase, seconds) {
        const s = window.triviaState;
        s.phase = phase;
        s.timer = seconds;
        s.phaseEndsAt = Date.now() + seconds * 1000;
        syncTrivia();
        renderTriviaBetter();
        runLocalTriviaClock();
    }

    window.startTriviaRound = function () {
        if (!isHost()) return;

        const s = window.triviaState;
        const item = TRIVIA_POOL[Math.floor(Math.random() * TRIVIA_POOL.length)];

        s.current = {
            q:item.q,
            c:item.c,
            a:shuffle(item.a)
        };

        s.votes = {};
        s.round++;

        startHostPhase("question", 5);
    };

    function hostAdvanceTriviaPhase() {
        if (!isHost()) return;
        const s = window.triviaState;
        if (!s) return;

        if (s.phase === "question") {
            startHostPhase("vote", 5);
        } else if (s.phase === "vote") {
            Object.keys(s.votes).forEach(pid => {
                if (s.votes[pid] === s.current.c) {
                    s.score[pid] = (s.score[pid] || 0) + 1;
                }
            });
            startHostPhase("reveal", 3);
        }
    }

    window.nextTriviaRound = function () {
        if (!isHost()) return;

        const s = window.triviaState;
        if (!s) return;

        if (s.round >= s.totalRounds) {
            s.phase = "done";
            syncTrivia();
            renderTriviaBetter();
        } else {
            window.startTriviaRound();
        }
    };

    function runLocalTriviaClock() {
        if (window.triviaBetterTimer) clearInterval(window.triviaBetterTimer);

        window.triviaBetterTimer = setInterval(() => {
            const s = window.triviaState;
            if (!s || !s.phaseEndsAt || ["menu","done"].includes(s.phase)) {
                clearInterval(window.triviaBetterTimer);
                return;
            }

            const remaining = Math.max(0, Math.ceil((s.phaseEndsAt - Date.now()) / 1000));
            s.timer = remaining;
            renderTriviaBetter();

            if (remaining <= 0) {
                clearInterval(window.triviaBetterTimer);
                if (isHost()) hostAdvanceTriviaPhase();
            }
        }, 350);
    }

    window.submitTriviaAnswer = function (answer) {
        const s = window.triviaState;
        if (!s || s.phase !== "vote") return;

        s.votes[myId()] = answer;
        syncTrivia();
        renderTriviaBetter();
    };

    function renderTriviaBetter() {
        const s = window.triviaState;
        if (!s || !gameCanvas) return;

        if (s.phase === "menu") {
            gameCanvas.innerHTML = `
                <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
                    gap:14px;text-align:center;color:white;padding:18px;box-sizing:border-box;">
                    <div style="font-size:30px;color:#ffd700;font-family:Impact,sans-serif;font-weight:900;">TRIVIA</div>
                    <div style="font-size:15px;color:#e2f0d9;font-weight:bold;">Question → Answers → Reveal</div>
                    ${isHost() ? `
                        <button onclick="window.startTriviaRound()"
                            style="background:#ffd700;color:#1e4620;border:none;border-radius:10px;padding:14px 26px;
                            font-size:22px;font-weight:900;font-family:Impact,sans-serif;box-shadow:0 4px 10px rgba(0,0,0,.35);">
                            START
                        </button>
                    ` : `<div style="color:#a3cfbb;font-weight:bold;">Waiting for host to start...</div>`}
                </div>`;
            return;
        }

        if (s.phase === "done") {
            const sorted = s.players.slice().sort((a,b) => (s.score[b.id] || 0) - (s.score[a.id] || 0));
            const winner = sorted[0];

            gameCanvas.innerHTML = `
                <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
                    gap:12px;text-align:center;color:white;padding:18px;box-sizing:border-box;">
                    <div style="font-size:30px;color:#ffd700;font-family:Impact,sans-serif;">TRIVIA COMPLETE</div>
                    <div style="font-size:22px;color:#00b050;font-weight:900;">Winner: ${safe(winner?.name || "Player")}</div>
                    <div style="width:100%;max-width:320px;display:flex;flex-direction:column;gap:6px;">
                        ${sorted.map(p => `
                            <div style="background:#e2f0d9;color:#1e4620;border-radius:8px;padding:8px;font-weight:900;
                                display:flex;justify-content:space-between;">
                                <span>${safe(p.name)}</span>
                                <span>${s.score[p.id] || 0}</span>
                            </div>
                        `).join("")}
                    </div>
                </div>`;
            return;
        }

        const q = s.current;
        const voted = !!s.votes[myId()];

        gameCanvas.innerHTML = `
            <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;gap:8px;
                color:white;padding:8px;box-sizing:border-box;user-select:none;overflow:auto;">

                <div style="width:100%;display:flex;justify-content:space-between;color:#ffd700;font-weight:900;font-size:13px;">
                    <span>Round ${s.round}/${s.totalRounds}</span>
                    <span>${s.phase.toUpperCase()}: ${s.timer}</span>
                    <span>Score: ${s.score[myId()] || 0}</span>
                </div>

                <div style="background:rgba(0,0,0,.45);border:3px solid #ffd700;border-radius:10px;
                    padding:12px;font-size:18px;font-weight:900;text-align:center;line-height:1.2;width:100%;box-sizing:border-box;">
                    ${safe(q.q)}
                </div>

                ${s.phase === "question" ? `
                    <div style="margin-top:20px;color:#a3cfbb;font-weight:900;font-size:18px;">
                        Answers coming up...
                    </div>
                ` : `
                    <div style="display:flex;flex-direction:column;gap:7px;width:100%;">
                        ${q.a.map(ans => {
                            let bg = "#e2f0d9";
                            let color = "#1e4620";

                            if (s.phase === "reveal") {
                                if (ans === q.c) {
                                    bg = "#00b050";
                                    color = "#fff";
                                } else if (s.votes[myId()] === ans) {
                                    bg = "#dc3545";
                                    color = "#fff";
                                }
                            } else if (s.votes[myId()] === ans) {
                                bg = "#00b0ff";
                                color = "#fff";
                            }

                            return `
                                <button onclick="window.submitTriviaAnswer('${String(ans).replace(/'/g, "\\'")}')"
                                    ${s.phase !== "vote" || voted ? "disabled" : ""}
                                    style="background:${bg};color:${color};border:none;border-radius:8px;padding:11px;
                                    font-size:15px;font-weight:900;text-align:left;box-shadow:0 2px 5px rgba(0,0,0,.25);">
                                    ${safe(ans)}
                                </button>`;
                        }).join("")}
                    </div>
                `}

                <div style="font-size:12px;color:#a3cfbb;font-weight:bold;">
                    Votes: ${Object.keys(s.votes || {}).length}/${s.players.length}
                </div>

                ${s.phase === "reveal" && isHost() ? `
                    <button onclick="window.nextTriviaRound()"
                        style="background:#ffd700;color:#1e4620;border:none;border-radius:8px;padding:10px 20px;
                        font-size:16px;font-weight:900;font-family:Impact,sans-serif;">
                        ${s.round >= s.totalRounds ? "FINISH" : "NEXT QUESTION"}
                    </button>
                ` : s.phase === "reveal" ? `
                    <div style="color:#a3cfbb;font-weight:bold;">Waiting for host...</div>
                ` : ""}
            </div>`;
    }
})();
/* CHASER PATCH B – Sequence tweaks + bigger trivia variety + Uno header centering */
(function () {
    const gameCanvas = document.getElementById("gameCanvasContainer");

    function myId() {
        return window.myId || localStorage.getItem("rider_id") || "local-player";
    }

    function isHost() {
        return window.chaserGame && window.chaserGame.hostId === myId();
    }

    function send(event, payload) {
        if (typeof channel !== "undefined" && channel) {
            channel.send({
                type: "broadcast",
                event,
                payload: {
                    ...payload,
                    senderId: myId(),
                    roomGameId: window.chaserGame?.activeGameId || null
                }
            });
        }
    }

    function decodeHTML(str) {
        const txt = document.createElement("textarea");
        txt.innerHTML = str;
        return txt.value;
    }

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    /* Sequence visual tweaks */
    const sequenceTweakObserver = new MutationObserver(() => {
        if (!window.chaserGame || window.chaserGame.activeGame !== "Sequence" || !gameCanvas) return;

        const allDivs = Array.from(gameCanvas.querySelectorAll("div"));

        allDivs.forEach(d => {
            if ((d.textContent || "").trim() === "Blue starts.") {
                d.textContent = "";
                d.style.display = "none";
            }
        });

        allDivs.forEach(d => {
            const txt = (d.textContent || "").trim();
            if (txt === "YOUR MOVE") {
                const turnText = allDivs.find(x => (x.textContent || "").includes("BLUE TURN") || (x.textContent || "").includes("RED TURN"));
                const isBlue = turnText && turnText.textContent.includes("BLUE");
                const isRed = turnText && turnText.textContent.includes("RED");
                d.style.color = isBlue ? "#00b0ff" : isRed ? "#e63946" : "#00b050";
            }
        });
    });

    if (gameCanvas) {
        sequenceTweakObserver.observe(gameCanvas, { childList: true, subtree: true });
    }

    /* Uno header centering */
    const unoTweakObserver = new MutationObserver(() => {
        if (!window.chaserGame || window.chaserGame.activeGame !== "Uno" || !gameCanvas) return;

        const topRows = Array.from(gameCanvas.querySelectorAll("div")).filter(d =>
            d.style && d.style.justifyContent === "space-between"
        );

        topRows.forEach(row => {
            if ((row.textContent || "").includes("UNO") && (row.textContent || "").includes("TURN")) {
                row.style.display = "flex";
                row.style.flexDirection = "column";
                row.style.alignItems = "center";
                row.style.justifyContent = "center";
                row.style.gap = "3px";
                row.style.textAlign = "center";
            }
        });
    });

    if (gameCanvas) {
        unoTweakObserver.observe(gameCanvas, { childList: true, subtree: true });
    }

    /* Trivia: fetch broad online questions and avoid repeats */
    window.chaserUsedTriviaQuestions = window.chaserUsedTriviaQuestions || [];

    async function fetchFreshTriviaQuestion() {
        try {
            const res = await fetch("https://opentdb.com/api.php?amount=1&type=multiple");
            const data = await res.json();

            if (!data.results || !data.results.length) throw new Error("No trivia returned");

            const item = data.results[0];
            const q = decodeHTML(item.question);

            if (window.chaserUsedTriviaQuestions.includes(q) && window.chaserUsedTriviaQuestions.length < 500) {
                return fetchFreshTriviaQuestion();
            }

            window.chaserUsedTriviaQuestions.push(q);
            if (window.chaserUsedTriviaQuestions.length > 500) {
                window.chaserUsedTriviaQuestions.shift();
            }

            const correct = decodeHTML(item.correct_answer);
            const choices = shuffle([
                correct,
                ...item.incorrect_answers.map(decodeHTML)
            ]);

            return { q, c: correct, a: choices };
        } catch (err) {
            const fallback = [
                { q:"Which planet is closest to the Sun?", c:"Mercury", a:["Venus","Mercury","Mars","Earth"] },
                { q:"What is the largest mammal?", c:"Blue whale", a:["Elephant","Blue whale","Giraffe","Orca"] },
                { q:"Which instrument has keys, pedals, and strings?", c:"Piano", a:["Guitar","Piano","Violin","Flute"] },
                { q:"What is the hardest natural substance?", c:"Diamond", a:["Gold","Iron","Diamond","Quartz"] },
                { q:"Which country is shaped like a boot?", c:"Italy", a:["Spain","Italy","Greece","Chile"] }
            ];
            return fallback[Math.floor(Math.random() * fallback.length)];
        }
    }

    window.startTriviaRound = async function () {
        if (!isHost()) return;

        const s = window.triviaState;
        if (!s) return;

        const item = await fetchFreshTriviaQuestion();

        s.current = item;
        s.votes = {};
        s.round++;
        s.phase = "question";
        s.timer = 5;
        s.phaseEndsAt = Date.now() + 5000;

        send("sync-room-trivia", { state: s });

        if (typeof window.receiveTriviaSync === "function") {
            window.receiveTriviaSync({ state: s, roomGameId: window.chaserGame.activeGameId });
        }
    };
})();
/* CHASER UNO SYNC FIX – only host deals, others wait for sync */
(function () {
    const gameCanvas = document.getElementById("gameCanvasContainer");

    function myId() {
        return window.myId || localStorage.getItem("rider_id") || "local-player";
    }

    function isHost() {
        return window.chaserGame && window.chaserGame.hostId === myId();
    }

    const oldUnoInit = window.initChaserUnoGame;
    const oldUnoReceive = window.receiveUnoSync;

    window.initChaserUnoGame = function () {
        window.chaserGame.activeGame = "Uno";

        if (isHost()) {
            window.unoState = null;
            oldUnoInit();
            return;
        }

        gameCanvas.innerHTML = `
            <div style="color:#ffd700;font-size:22px;font-weight:900;font-family:Impact,sans-serif;text-align:center;padding:30px;">
                Waiting for host to deal...
            </div>
        `;
    };

    window.receiveUnoSync = function (p) {
        if (!p || !p.state) return;
        window.unoState = p.state;
        window.chaserGame.activeGame = "Uno";

        if (oldUnoReceive) oldUnoReceive(p);
    };
})();
