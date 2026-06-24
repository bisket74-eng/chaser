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
       "Battleship": {
        icon: "🚢",
        displayName: "Battleship",
        minPlayers: 1,
        maxPlayers: 2,
        multiplayer: true,
        init: () => {
        if (typeof window.initBattleshipGame === "function") 
            window.initBattleshipGame();
        
    }
},
       
"Tiny Kingdoms": {
    icon: "🏰",
    displayName: "Tiny Kingdoms",
    minPlayers: 1,
    maxPlayers: 4,
    multiplayer: true,
    init: () => {
        if (typeof window.initTinyKingdomsGame === "function") {
            window.initTinyKingdomsGame();
        } else {
            alert("Tiny Kingdoms file did not load. Check /games/tinykingdoms.js and the script tag in index.html.");
        }
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
       "Coup": {
    icon: "🕶️",
    displayName: "Coup",
    minPlayers: 2,
    maxPlayers: 6,
    multiplayer: true,
    init: () => {
        if (typeof window.initCoupGame === "function") window.initCoupGame();
    }
},
      "Yahtzee": {
    icon: "🎲",
    displayName: "Yahtzee",
    minPlayers: 1,
    maxPlayers: 6,
    multiplayer: true,
    init: () => {
        if (typeof window.initYahtzeeGame === "function") window.initYahtzeeGame();
    }
},
       "Scrabble": {
    icon: "🔤",
    displayName: "Scrabble",
    minPlayers: 2,
    maxPlayers: 4,
    multiplayer: true,
    init: () => {
        if (typeof window.initScrabbleGame === "function") {
            window.initScrabbleGame();
        }
    }
},
       
       Cribbage: {
    icon:"🃏",
    displayName:"Cribbage",
    minPlayers:1,
    maxPlayers:2,
    multiplayer:true,
    init:()=>{
        if (typeof window.initCribbageGame === "function") {
            window.initCribbageGame();
        } else {
            alert("Cribbage file did not load. Check /games/cribbage.js and the script tag in index.html.");
        }
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
       "Texas Holdem": {
icon: "♠️",
displayName: "Texas Hold'em",
minPlayers: 1,
maxPlayers: 6,
multiplayer: true,
init: () => {
if (typeof window.initTexasHoldemGame === "function") {
window.initTexasHoldemGame();
} else {
alert("Texas Hold'em file did not load. Check /games/texasholdem.js and the script tag in index.html.");
}
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
            roomGameId: window.chaserGame.activeGameId,
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
      alert("LOBBY START RECEIVED: " + payload.gameName);
    if (!payload) return;

    const incomingRoomGameId = payload.roomGameId || window.chaserGame.activeGameId;

    if (incomingRoomGameId && window.chaserGame.activeGameId && incomingRoomGameId !== window.chaserGame.activeGameId) {
        return;
    }

    window.chaserGame.activeGame = payload.gameName;
    window.chaserGame.activeGameId = incomingRoomGameId;
    window.chaserGame.players = payload.players || window.chaserGame.players;
    window.chaserGame.expectedPlayers = payload.expectedPlayers || window.chaserGame.expectedPlayers;
    window.chaserGame.hostId = payload.hostId || window.chaserGame.hostId;

    const me = window.chaserGame.players.find(p => p.id === myGameId());
    if (me) window.chaserGame.mySeat = me.seat;

    openGameStage();
    setGameHeader(payload.gameName);

    let tries = 0;

    const tryStart = () => {
        tries++;

        const config = GAME_CONFIG[payload.gameName] || GAME_CONFIG["Battle Uno"];

        if (config && typeof config.init === "function") {
            config.init();
            return;
        }

        if (tries < 10) {
            setTimeout(tryStart, 250);
        }
    };

    tryStart();
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
   2. SEQUENCE – REAL STYLE 2 PLAYER VERSION (OFFICIAL RETAIL LAYOUT)
   ============================================================ */

// The correct, official commercial board mapping

    const SEQ_GRID = [
    "FREE", "2S",   "3S",   "4S",   "5S",   "6S",   "7S",   "8S",   "9S",   "FREE",
    "6C",   "5C",   "4C",   "3C",   "2C",   "AH",   "KH",   "QH",   "10H",  "10S",
    "7C",   "AS",   "2D",   "3D",   "4D",   "5D",   "6D",   "7D",   "9H",   "QS",
    "8C",   "KS",   "6C",   "5C",   "4C",   "3C",   "2C",   "8D",   "8H",   "KS",
    "9C",   "QS",   "7C",   "6H",   "5H",   "4H",   "AH",   "9D",   "7H",   "AS",
    "10C",  "10S",  "8C",   "7H",   "2H",   "3H",   "KH",   "10D",  "6H",   "2D",
    "QC",   "9S",   "9C",   "8H",   "9H",   "10H",  "QH",   "QD",   "5H",   "3D",
    "KC",   "8S",   "10C",  "QC",   "KC",   "AC",   "AD",   "KD",   "4H",   "4D",
    "AC",   "7S",   "6S",   "5S",   "4S",   "3S",   "2S",   "2H",   "3H",   "5D",
    "FREE", "AD",   "KD",   "QD",   "10D",  "9D",   "8D",   "7D",   "6D",   "FREE"
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
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
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
    if (typeof sendGameEvent === "function") {
        sendGameEvent("sequence-sync-state", { state: window.seqState });
    } else if (window.channel) {
        window.channel.send({
            type: "broadcast",
            event: "sequence-sync-state",
            payload: { state: window.seqState }
        });
    }
}

window.receiveSequenceSync = function (p) {
    if (!p || !p.state) return;
    window.seqState = p.state;
    renderSequenceBoard();
};

function countSequenceLines(board, locked, team) {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
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

    let html = `
        <div style="height:100%;width:100%;max-width:340px;display:flex;flex-direction:column;align-items:center;gap:5px;box-sizing:border-box;user-select:none;overflow:hidden;margin:0 auto;">
            <div style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:0 4px;box-sizing:border-box;">
                <div style="font-size:14px;font-weight:900;color:#ffd700;font-family:Impact,sans-serif;">
                    ${seqTeamName(s.turnTeam)} TURN
                </div>
                <div style="font-size:12px;font-weight:900;color:${myTurn ? '#00b050' : '#a3cfbb'};">
                    ${s.winner ? seqTeamName(s.winner) + " WINS" : myTurn ? "YOUR MOVE" : "WAITING"}
                </div>
                <div style="font-size:12px;color:#e2f0d9;font-weight:bold;">
                    🔵 ${s.sequences[0]} | 🔴 ${s.sequences[1]}
                </div>
            </div>

            <div style="font-size:12px;color:#ffd700;font-weight:bold;min-height:16px;text-align:center;">
                ${(s.message || "")}
            </div>

            <div style="width:92%;aspect-ratio:1/1;display:grid;grid-template-columns:repeat(10,1fr);
                grid-template-rows:repeat(10,1fr);gap:1px;background:#111;border:3px solid #ffd700;
                border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.5);box-sizing:border-box;">`;

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
                    background:${seqTeamColor(token)};border:${locked ? '2px solid #ffd700' : '1px solid #fff'};
                    box-shadow:0 1px 3px rgba(0,0,0,0.45);z-index:3;
                    display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:900;">
                    ${locked ? "★" : ""}
                </div>`;
        }

        html += `
            <div onclick="window.handleSequenceCellTap(${i})"
                style="position:relative;width:100%;height:100%;background:#fff;
                color:${card.red ? '#c40000' : '#111'};display:flex;flex-direction:column;align-items:center;justify-content:center;
                box-sizing:border-box;cursor:pointer;${canPlay ? 'box-shadow:inset 0 0 0 2px #ffd700;background:#fff3cd;' : ''}">
                ${card.free ? `
                    <span style="color:#111111;font-size:14px;text-shadow:none;font-weight:bold;">★</span>
                ` : `
                    <span style="font-size:12px;font-weight:900;line-height:1.1;">${card.rank}</span>
                    <span style="font-size:18px;line-height:1;">${card.suit}</span>
                `}
                ${chip}
            </div>`;
    }

    html += `
            </div>

            <div style="width:100%;display:flex;gap:4px;justify-content:center;align-items:center;padding-top:6px;box-sizing:border-box;">
    `;

    myHand.forEach((code, idx) => {
        const card = displayCard(code);
        const isSelected = s.selectedCardIdx === idx;
        const jackLabel = isTwoEyedJack(code) ? "Wild" : isOneEyedJack(code) ? "Remove" : "";

        html += `
            <button onclick="window.selectSequenceCard(${idx})"
                style="flex:1;max-width:44px;height:56px;border-radius:5px;border:${isSelected ? '2px solid #ffd700' : '1px solid #777'};
                background:#fff;color:${card.red ? '#c40000' : '#111'};display:flex;flex-direction:column;align-items:center;
                justify-content:center;padding:0;font-weight:900;cursor:pointer;box-shadow:0 2px 5px rgba(0,0,0,0.3);
                transform:${isSelected ? 'translateY(-4px)' : 'none'};transition:transform 0.1s;">
                <span style="font-size:14px;line-height:1;">${card.rank}</span>
                <span style="font-size:16px;line-height:1;">${card.suit}</span>
                ${jackLabel ? `<span style="font-size:10px;color:#2d6a30;font-weight:900;line-height:1;margin-top:1px;">${jackLabel}</span>` : ""}
            </button>`;
    });

    html += `
            </div>
        </div>`;

    const canvasContainer = document.getElementById("gameCanvasContainer");
    if (canvasContainer) {
        canvasContainer.innerHTML = html;
    }
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

    function renderUnoCard(card, onclick, mode = "normal", faded = false) {
    if (!card) return "";

    let width, height, fontSize;
    if (mode === "large") { width = 86; height = 126; fontSize = 48; } 
    else if (mode === "draw") { width = 60; height = 88; fontSize = 22; } 
    else if (mode === "small") { width = 50; height = 75; fontSize = 22; } 
    else { width = 60; height = 90; fontSize = 28; }

    let bg, content, border = "3px solid #fff";

    if (card.color === "Back") {
        bg = "#111"; 
        content = `<div style="z-index:2;color:#fff;font-family:Impact,sans-serif;font-weight:900;font-size:${fontSize}px;text-align:center;line-height:1;">UNO</div>`;
    } else if (card.color === "Wild") {
bg = "conic-gradient(#e63946 0deg 90deg, #ffb703 90deg 180deg, #00b0ff 180deg 270deg, #00b050 270deg 360deg)";

const wildFont = (mode === "large" || mode === "draw" || mode === "pile") ? 20 : 13;

content =
    "<div style=\"font-size:" + wildFont + "px;line-height:1.02;text-shadow:0 2px 5px rgba(0,0,0,.7);\">" +
        (card.value === "+4" ? "Wild<br>+4" : "Wild") +
    "</div>";
    } else {
        const colors = { Red: "#e63946", Yellow: "#ffb703", Green: "#00b050", Blue: "#00b0ff" };
        bg = colors[card.color] || "#202020";
        let displayVal = card.value;
        if (displayVal === "Reverse") displayVal = "↺";
        if (displayVal === "Skip") displayVal = "⊘";
        content = `
            <div style="position:absolute;width:130%;height:42%;background:rgba(255,255,255,0.16);border-radius:50%;transform:rotate(-25deg);"></div>
            <div style="z-index:2;color:#fff;font-family:Impact,sans-serif;font-weight:900;font-size:${fontSize}px;text-shadow:2px 2px 4px rgba(0,0,0,0.45);text-align:center;line-height:1;">
                ${displayVal}
            </div>
        `;
    }

    return `
        <div ${onclick ? `onclick="${onclick}"` : ""}
            style="flex-shrink:0;width:${width}px;height:${height}px;border-radius:8px;background:${bg};border:${border};box-shadow:0 4px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;cursor:${onclick && !faded ? 'pointer' : 'default'};opacity:${faded ? 0.45 : 1};box-sizing:border-box;">
            ${content}
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
            <div style="background:${idx === s.turn ? '#ffd700' : 'rgba(226,240,217,0.16)'};color:${idx === s.turn ? '#1e4620' : '#e2f0d9'};border-radius:8px;padding:6px 10px;font-size:13px;font-weight:900;">
                ${p.name}: ${s.hands[idx]?.length || 0}
            </div>`;
    }).join("");

    let html = `
        <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;gap:12px;box-sizing:border-box;user-select:none;overflow:hidden;">
            
            <div style="width:100%;display:flex;flex-direction:column;align-items:center;gap:4px;padding-top:10px;">
                <div style="font-size:24px;color:${myTurn ? '#00b050' : '#a3cfbb'};font-weight:900;font-family:Impact,sans-serif;letter-spacing:1px;">
                    ${s.winner ? s.winner.name + " WINS!" : myTurn ? "YOUR TURN" : "TURN: " + activeName.toUpperCase()}
                </div>
            </div>

            <div style="width:100%;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;min-height:30px;">
                ${opponents}
            </div>

            <div style="font-size:15px;color:#ffd700;font-weight:bold;min-height:18px;text-align:center;">
                ${s.message || ""}
            </div>

            <div style="display:flex;align-items:flex-end;justify-content:center;gap:24px;margin-top:10px;">
                <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                    <div style="font-size:12px;color:#a3cfbb;font-weight:900;">DRAW</div>
                    ${renderUnoCard({ color: "Back", value: "UNO" }, "window.unoDrawCard()", "large", !myTurn)}
                </div>
                <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                    <div style="font-size:12px;color:#a3cfbb;font-weight:900;">PLAY</div>
                    ${renderUnoCard(discard, "", "large")}
                </div>
            </div>
    `;

    if (s.wildChoosingSeat === mySeat) {
        html += `
            <div style="display:grid;grid-template-columns:repeat(4,50px);gap:8px;margin-top:10px;">
                ${["Red","Yellow","Green","Blue"].map(c => `
                    <button onclick="window.unoPickWildColor('${c}')" style="height:44px;border-radius:8px;border:3px solid #fff;background:${{Red:"#e63946",Yellow:"#ffb703",Green:"#00b050",Blue:"#00b0ff"}[c]};cursor:pointer;box-shadow:0 3px 8px rgba(0,0,0,0.35);"></button>
                `).join("")}
            </div>`;
    }

    // HAND CONTAINER (Flipped on X-axis to put scrollbar on top, pushed up 45px)
    html += `
            <div id="uno-hand-container" class="uno-top-scroll" style="width:100%;display:flex;overflow-x:auto;gap:6px;padding:15px 10px;box-sizing:border-box;-webkit-overflow-scrolling:touch;margin-top:auto;margin-bottom:45px;justify-content:flex-start;transform:rotateX(180deg);">
    `;

    hand.forEach((card, idx) => {
        const playable = myTurn && (card.color === discard.color || card.value === discard.value || card.color === "Wild" || discard.color === "Wild");
        // Individual cards flipped back to right-side up
        html += `<div style="transform:rotateX(180deg);">${renderUnoCard(card, `window.unoPlayCard(${idx})`, "small", !playable)}</div>`;
    });

    html += `
            </div>
        </div>`;

    const canvas = document.getElementById("gameCanvasContainer");
    if (canvas) {
        canvas.innerHTML = html;
        // Auto-scroll to the far right (newest card) whenever rendered
        setTimeout(() => {
            const handContainer = document.getElementById("uno-hand-container");
            if (handContainer) handContainer.scrollLeft = handContainer.scrollWidth;
        }, 50);
    }
}


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
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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
                totalRounds: 20,
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
                <div style="font-size:15px;color:#e2f0d9;font-weight:bold;">20 rounds • pick your answer fast</div>
                <button onclick="window.startTriviaRound()"
                    style="background:#ffd700;color:#1e4620;border:none;border-radius:10px;padding:14px 26px;
                    font-size:22px;font-weight:900;font-family:Impact,sans-serif;box-shadow:0 4px 10px rgba(0,0,0,0.35);">
                    START
                </button>
            </div>`;
    }

   async function getTriviaBatch() {
    const fallback = LOCAL_TRIVIA.slice();

    try {
        const used = JSON.parse(localStorage.getItem("chaser_used_trivia_questions") || "[]");

        let fresh = [];

        for (let attempt = 0; attempt < 3 && fresh.length < 20; attempt++) {
            const res = await fetch("https://opentdb.com/api.php?amount=20&category=9&difficulty=easy&type=multiple");
            const data = await res.json();

            if (!data.results || !data.results.length) throw new Error("No questions");

            fresh = fresh.concat(data.results.filter(item => !used.includes(item.question)));
        }

        if (!fresh.length) {
            localStorage.removeItem("chaser_used_trivia_questions");
            return fallback;
        }

        const picked = fresh.slice(0, 20);

        const newlyUsed = used.concat(picked.map(item => item.question)).slice(-300);
        localStorage.setItem("chaser_used_trivia_questions", JSON.stringify(newlyUsed));

        return picked.map(item => {
            const decode = (txt) => {
                const box = document.createElement("textarea");
                box.innerHTML = txt;
                return box.value;
            };

            const correct = decode(item.correct_answer);
            const answers = [
                correct,
                ...item.incorrect_answers.map(decode)
            ];

            return {
                q: decode(item.question),
                c: correct,
                a: shuffle(answers)
            };
        });
    } catch (e) {
        return fallback;
    }
}
window.startTriviaRound = async function () {
    const s = window.triviaState;
    if (!s) return;

    if (!s.questionBank || !s.questionBank.length) {
        s.questionBank = await getTriviaBatch();
        s.usedQuestions = [];
    }

    let q = s.questionBank.shift();

    while (q && s.usedQuestions && s.usedQuestions.includes(q.q)) {
        q = s.questionBank.shift();
    }

    if (!q) {
        s.questionBank = await getTriviaBatch();
        q = s.questionBank.shift();
    }

    s.usedQuestions = s.usedQuestions || [];
    s.usedQuestions.push(q.q);

    s.current = q;
    s.votes = {};
    s.phase = "vote";
    s.timer = 12;
    s.round++;

    syncTrivia();
    runTriviaTimer();
    renderTriviaScreen();
};

window.nextTriviaRound = function () {
    const s = window.triviaState;
    if (!s) return;

    if (s.round >= 20) {
        s.phase = "done";
        syncTrivia();
        renderTriviaScreen();
    } else {
        window.startTriviaRound();
    }
};

    function renderTriviaScreen() {
       const oldScroll = gameCanvas.scrollTop || 0;
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
       setTimeout(() => {
    gameCanvas.scrollTop = oldScroll;
}, 0);
    }
    
        /* ============================================================
   SOLITAIRE — CHASER MOBILE v7
   Visual v4 layout + restored working mechanics
   Removed redundant help box + centered Stock/Waste
   ============================================================ */

window.initSolitaireGame = function () {
    const canvas = document.getElementById("gameCanvasContainer");

    const suits = ["S", "C", "H", "D"];
    const symbols = { S:"♠", C:"♣", H:"♥", D:"♦" };
    const names = { S:"Spades", C:"Clubs", H:"Hearts", D:"Diamonds" };
    const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

    function colorOf(card) {
        return card.suit === "H" || card.suit === "D" ? "red" : "black";
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function newGame() {
        let deck = [];

        suits.forEach(suit => {
            ranks.forEach((rank, i) => {
                deck.push({
                    suit,
                    symbol: symbols[suit],
                    rank,
                    value: i + 1,
                    red: suit === "H" || suit === "D",
                    open: false
                });
            });
        });

        deck = shuffle(deck);

        window.solState = {
            stock: deck,
            waste: [],
            foundations: { S:[], C:[], H:[], D:[] },
            tableau: [[],[],[],[],[],[],[]],
            selected: null,
            message: "Tap a card to select. Then tap where it should go."
        };

        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                const card = window.solState.stock.pop();
                card.open = row === col;
                window.solState.tableau[col].push(card);
            }
        }

        render();
    }

    window.solNewGame = newGame;

    function cardBackHtml(small = false) {
        return `
            <div class="sol-card sol-back ${small ? "small" : ""}">
                <div class="sol-back-text">CHASER</div>
            </div>
        `;
    }

    function cardHtml(card, selected, isFoundation = false) {
    if (!card) return "";
    
    // Set up highlight styles
    const borderStyle = selected ? '2px solid #00b0ff' : '1px solid #ccc';
    const shadowStyle = selected ? '0 0 10px 2px #00b0ff' : '1px 1px 3px rgba(0,0,0,0.3)';
    const backBorderStyle = selected ? '3px solid #00b0ff' : '2px solid #ffd700';
    const backShadowStyle = selected ? '0 0 10px #00b0ff' : 'none';

    // The downward facing card back
    if (!card.open) {
        return `<div class="sol-card sol-card-back ${selected ? 'sol-selected' : ''}" style="display:flex;align-items:center;justify-content:center;background:#003300;border:${backBorderStyle};box-shadow:${backShadowStyle};border-radius:6px;width:100%;height:100%;box-sizing:border-box;">
                    <div style="font-family:Impact,sans-serif;font-size:18px;color:#fff;transform:rotate(-90deg);letter-spacing:2px;">CHASER</div>
                </div>`;
    }
    
    // Convert text letters to proper suit icons and colors
    let suitSymbol = card.suit;
    let color = '#111'; // Default Black
    
    if (suitSymbol === 'H' || suitSymbol === '♥') { suitSymbol = '♥'; color = '#e63946'; } // Red Heart
    else if (suitSymbol === 'D' || suitSymbol === '♦') { suitSymbol = '♦'; color = '#e63946'; } // Red Diamond
    else if (suitSymbol === 'S' || suitSymbol === '♠') { suitSymbol = '♠'; color = '#111'; } // Black Spade
    else if (suitSymbol === 'C' || suitSymbol === '♣') { suitSymbol = '♣'; color = '#111'; } // Black Club
    
    // The upward facing card layout
    return `
        <div class="sol-card ${selected ? 'sol-selected' : ''}" style="color:${color};position:relative;background:#fff;border-radius:6px;width:100%;height:100%;box-shadow:${shadowStyle};box-sizing:border-box;border:${borderStyle};overflow:hidden;">
            
            <div style="position:absolute;top:2px;left:4px;font-size:15px;font-weight:900;line-height:1;">${card.rank}</div>
            <div style="position:absolute;top:2px;right:4px;font-size:14px;line-height:1;">${suitSymbol}</div>
            
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);font-size:32px;opacity:0.85;">${suitSymbol}</div>
            
            <div style="position:absolute;bottom:2px;left:4px;font-size:14px;line-height:1;transform:rotate(180deg);">${suitSymbol}</div>
            <div style="position:absolute;bottom:2px;right:4px;font-size:15px;font-weight:900;line-height:1;transform:rotate(180deg);">${card.rank}</div>
            
        </div>
    `;
}




    function selectedCards() {
        const s = window.solState;
        if (!s.selected) return [];

        if (s.selected.type === "waste") {
            const c = s.waste[s.waste.length - 1];
            return c ? [c] : [];
        }

        if (s.selected.type === "tableau") {
            return s.tableau[s.selected.col].slice(s.selected.idx);
        }

        return [];
    }

    function removeSelectedCards() {
        const s = window.solState;
        if (!s.selected) return [];

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

    function canMoveToTableau(cards, targetCol) {
        const s = window.solState;
        if (!cards.length) return false;

        const first = cards[0];
        const pile = s.tableau[targetCol];
        const top = pile[pile.length - 1];

        if (!top) return first.value === 13;

        return top.open &&
            colorOf(top) !== colorOf(first) &&
            top.value === first.value + 1;
    }

    function canMoveToFoundation(card, suit) {
        const s = window.solState;
        if (!card || card.suit !== suit) return false;

        const pile = s.foundations[suit];
        const top = pile[pile.length - 1];

        if (!top) return card.value === 1;
        return card.value === top.value + 1;
    }

    window.solDraw = function () {
        const s = window.solState;
        s.selected = null;

        if (s.stock.length) {
            const card = s.stock.pop();
            card.open = true;
            s.waste.push(card);
            s.message = "Card drawn.";
        } else {
            s.stock = s.waste.reverse().map(c => ({ ...c, open:false }));
            s.waste = [];
            s.message = "Waste recycled.";
        }

        render();
    };

    window.solSelectWaste = function () {
        const s = window.solState;
        if (!s.waste.length) return;

        s.selected = { type:"waste" };
        s.message = "Waste card selected.";
        render();
    };

    window.solTapTableau = function (col, idx = null) {
        const s = window.solState;
        const pile = s.tableau[col];

        if (s.selected) {
            const sameCard =
                s.selected.type === "tableau" &&
                s.selected.col === col &&
                s.selected.idx === idx;

            if (sameCard) {
                s.selected = null;
                s.message = "Selection cleared.";
                render();
                return;
            }

            const moving = selectedCards();

            if (canMoveToTableau(moving, col)) {
                const cards = removeSelectedCards();
                s.tableau[col].push(...cards);
                s.message = "Moved.";
            } else {
                s.message = "That card cannot go there.";
            }

            s.selected = null;
            render();
            return;
        }

        if (idx === null) return;

        const card = pile[idx];
        if (!card || !card.open) return;

        s.selected = { type:"tableau", col, idx };
        s.message = card.rank + card.symbol + " selected.";
        render();
    };

    window.solMoveToFoundation = function (suit) {
        const s = window.solState;
        const moving = selectedCards();

        if (moving.length !== 1) {
            s.message = "Select one card first.";
            render();
            return;
        }

        const card = moving[0];

        if (canMoveToFoundation(card, suit)) {
            const cards = removeSelectedCards();
            s.foundations[suit].push(cards[0]);
            s.message = "Moved to " + names[suit] + ".";
        } else {
            s.message = "That card cannot go to " + names[suit] + ".";
        }

        s.selected = null;
        render();
    };

    window.solAutoFoundation = function () {
        const s = window.solState;
        let moved = false;

        function tryCard(sourceType, col = null) {
            let card;

            if (sourceType === "waste") card = s.waste[s.waste.length - 1];

            if (sourceType === "tableau") {
                const pile = s.tableau[col];
                card = pile[pile.length - 1];
            }

            if (!card || !card.open) return false;

            if (canMoveToFoundation(card, card.suit)) {
                if (sourceType === "waste") s.waste.pop();

                if (sourceType === "tableau") {
                    s.tableau[col].pop();
                    const pile = s.tableau[col];
                    if (pile.length && !pile[pile.length - 1].open) {
                        pile[pile.length - 1].open = true;
                    }
                }

                s.foundations[card.suit].push(card);
                return true;
            }

            return false;
        }

        let loop = true;

        while (loop) {
            loop = false;

            if (tryCard("waste")) {
                moved = true;
                loop = true;
            }

            for (let c = 0; c < 7; c++) {
                if (tryCard("tableau", c)) {
                    moved = true;
                    loop = true;
                }
            }
        }

        s.message = moved ? "Auto-moved available cards." : "No automatic moves available.";
        s.selected = null;
        render();
    };

    function checkWin() {
        const s = window.solState;
        return suits.every(suit => s.foundations[suit].length === 13);
    }

    function render() {
        const s = window.solState;
        const stockCard = s.stock.length ? cardBackHtml() : `<div class="sol-card sol-empty">↻</div>`;
        const wasteTop = s.waste[s.waste.length - 1];

        let html = `
            <style>
                .sol-board {
                    width:100%;
                    height:100%;
                    padding:14px 10px 18px 10px;
                    box-sizing:border-box;
                    background:linear-gradient(160deg,#06420f,#022808);
                    color:white;
                    font-family:Arial,sans-serif;
                    overflow:hidden;
                    position:relative;
                    user-select:none;
                }

                .sol-btn-row {
                    display:flex;
                    gap:12px;
                    margin-bottom:8px;
                    padding:0 4px;
                }

                .sol-btn {
                    flex:1;
                    border:2px solid #b99a22;
                    border-radius:999px;
                    padding:9px 8px;
                    background:#e2f0d9;
                    color:#1e4620;
                    font-weight:900;
                    font-size:15px;
                    box-shadow:0 3px 8px rgba(0,0,0,.35);
                }

                .sol-section-title {
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    gap:8px;
                    color:#e2f0d9;
                    font-size:15px;
                    font-weight:900;
                    margin:3px 0 5px 0;
                }

                .sol-section-title:before,
                .sol-section-title:after {
                    content:"";
                    height:1px;
                    background:#b99a22;
                    flex:1;
                    max-width:90px;
                }

                .sol-foundations {
                    display:grid;
                    grid-template-columns:repeat(4,1fr);
                    gap:7px;
                    margin-bottom:8px;
                }

                .sol-foundation-slot {
                    height:48px;
                    border-radius:8px;
                    border:2px solid rgba(226,240,217,.45);
                    background:rgba(255,255,255,.05);
                    color:rgba(255,215,0,.60);
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:24px;
                    font-weight:900;
                    overflow:visible;
                }

                .sol-message {
                    background:rgba(0,0,0,.28);
                    border:1px solid rgba(255,215,0,.45);
                    border-radius:9px;
                    padding:7px 8px;
                    text-align:center;
                    font-size:15px;
                    font-weight:900;
                    color:#e2f0d9;
                    margin:6px 0;
                }

                .sol-tableau {
                    display:grid;
                    grid-template-columns:repeat(7,1fr);
                    gap:5px;
                    align-items:start;
                    height:315px;
                    margin-top:4px;
                }

                .sol-col {
                    position:relative;
                    min-height:300px;
                }

                .sol-card-pos {
                    position:absolute;
                    left:0;
                    width:100%;
                }

                .sol-bottom-zone {
                    position:absolute;
                    left:50%;
                    bottom:20px;
                    transform:translateX(-50%);
                    display:grid;
                    grid-template-columns:18% 18%;
                    width: 100%;
                    gap:10%;
                    align-items:end;
                    justify-content:center;
                }

                .sol-bottom-pile-label {
                    color:#e2f0d9;
                    font-size:13px;
                    font-weight:900;
                    text-align:center;
                    margin-bottom:3px;
                }

                .sol-card {
                    width:100%;
                    aspect-ratio:0.70/1;
                    min-height:75px;
                    border-radius:7px;
                    box-sizing:border-box;
                    position:relative;
                    background:#fff;
                    box-shadow:0 3px 7px rgba(0,0,0,.35);
                    border:1px solid #eeeeee;
                    cursor:pointer;
                    overflow:hidden;
                }

                .sol-card.red { color:#c00000; }
                .sol-card.black { color:#111; }

                .sol-card.selected {
                    outline:3px solid #00bfff;
                    box-shadow:0 0 12px #00bfff;
                    transform:translateY(-2px);
                }

                .sol-empty {
                    background:rgba(255,255,255,.05);
                    border:2px solid rgba(226,240,217,.45);
                    color:rgba(255,215,0,.60);
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:22px;
                    font-weight:900;
                }

                .sol-back {
                    background:linear-gradient(145deg,#103f18,#06280c);
                    border:3px solid #ffd700;
                    color:#b7e3b2;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    text-align:center;
                    font-weight:900;
                }

                .sol-back-text {
                    writing-mode:vertical-rl;
                    text-orientation:mixed;
                    letter-spacing:3px;
                    font-size:12px;
                    line-height:1;
                }

                .sol-rank {
                    position:absolute;
                    font-weight:900;
                    font-size:13px;
                    line-height:1;
                    text-align:center;
                }

                .sol-rank.top {
                    top:4px;
                    left:5px;
                }

                .sol-rank.bottom {
                    right:5px;
                    bottom:4px;
                    transform:rotate(180deg);
                }

                .sol-big-symbol {
                    position:absolute;
                    left:50%;
                    top:50%;
                    transform:translate(-50%,-50%);
                    font-size:22px;
                    font-weight:900;
                    line-height:1;
                }

                .small-foundation-card {
                    width:100%;
                    min-height:48px;
                    height:48px;
                    aspect-ratio:auto;
                }

                .small-foundation-card .sol-big-symbol {
                    font-size:24px;
                }

                .small-foundation-card .sol-rank {
                    font-size:13px;
                }

                @media (max-width:390px) {
                    .sol-board {
                        padding:12px 9px 18px 9px;
                    }

                    .sol-card {
                        min-height:70px;
                    }

                    .sol-tableau {
                        gap:4px;
                        height:300px;
                    }

                    .sol-bottom-zone {
                        grid-template-columns:70px 70px;
                        gap:12px;
                    }

                    .sol-back-text {
                        font-size:19px;
                        letter-spacing:3px;
                    }

                    .sol-rank {
                        font-size:16px;
                    }

                    .sol-big-symbol {
                        font-size:30px;
                    }
                }
            </style>

            <div class="sol-board">
                <div class="sol-btn-row">
                    <button class="sol-btn" onclick="solNewGame()">New Deal</button>
                    <button class="sol-btn" onclick="solAutoFoundation()">Auto Move</button>
                </div>

                <div class="sol-section-title">Foundation</div>

                <div class="sol-foundations">
                    ${suits.map(suit => {
                        const pile = s.foundations[suit];
                        const top = pile[pile.length - 1];

                        return `
                            <div class="sol-foundation-slot" onclick="solMoveToFoundation('${suit}')">
                                ${top ? cardHtml(top, false, true) : symbols[suit]}
                            </div>
                        `;
                    }).join("")}
                </div>

                <div class="sol-message">${checkWin() ? "🏆 SOLITAIRE COMPLETE!" : s.message}</div>

                <div class="sol-section-title">Tableau</div>

                <div class="sol-tableau">
        `;

        for (let col = 0; col < 7; col++) {
            html += `<div class="sol-col" onclick="solTapTableau(${col}, null)">`;
let currentOffset = 0;

         s.tableau[col].forEach((card, idx) => {
                const selected =
                    s.selected &&
                    s.selected.type === "tableau" &&
                    s.selected.col === col &&
                    idx >= s.selected.idx;

                const topOffset = currentOffset;
currentOffset += card.open ? 18 : 12; 

               
                html += `
                    <div class="sol-card-pos" style="top:${topOffset}px;" onclick="event.stopPropagation(); solTapTableau(${col}, ${idx});">
                        ${cardHtml(card, selected)}
                    </div>
                `;
            });

            if (!s.tableau[col].length) {
                html += `<div class="sol-card sol-empty"></div>`;
            }

            html += `</div>`;
        }

        html += `
                </div>

                <div class="sol-bottom-zone">
                    <div>
                        <div class="sol-bottom-pile-label">Stock</div>
                        <div onclick="solDraw()">${stockCard}</div>
                    </div>

                    <div>
                        <div class="sol-bottom-pile-label">Waste</div>
                        <div onclick="solSelectWaste()">
                            ${wasteTop ? cardHtml(wasteTop, s.selected?.type === "waste") : `<div class="sol-card sol-empty"></div>`}
                        </div>
                    </div>
                </div>
            </div>
        `;

        canvas.innerHTML = html;
    }

    newGame();
};        
  /* ============================================================
      SINGLE PLAYER Hangman          
      =========================================================== */

    window.WORDS = [
        "JACKET", "QUARTZ", "MYSTERY", "VOLCANO", "ZIGZAG", "WHISPER", "FLAMINGO", "KANGAROO", "BLANKET", "WEATHER",
"PHANTOM", "GOGGLES", "RESCUE", "TURQUOISE", "UPGRADE", "HORIZON", "DYNAMITE", "XEROGRAPHY", "BLOSSOM", "VINTAGE",
"JOURNEY", "SQUIRREL", "ZEPHYR", "CRIMSON", "KNIGHT", "WOMBAT", "UMBRELLA", "OCTOPUS", "PIRATE", "GALAXY",
"SPHINX", "FEATHER", "SCORPION", "TRIGGER", "WIZARD", "TURTLE", "SAPPHIRE", "BICYCLE", "VELVET", "LIGHTNING",
"NIGHTMARE", "GIRAFFE", "MONKEY", "DOMINO", "QUIVER", "VULTURE", "COMPASS", "LAUNCH", "CHIMNEY", "DOLPHIN",
"PENGUIN", "SUBWAY", "HAMMER", "CRYSTAL", "ODYSSEY", "MAJESTY", "HARMONY", "GLACIER", "SPIDER", "TRIUMPH",
"DIAMOND", "BUFFALO", "OSTRICH", "YURT", "BADGER", "VIOLIN", "ASTRONAUT", "WAVEGUIDE", "CHALLENGE", "PYRAMID",
"VAMPIRE", "GARDEN", "PROPELLER", "SATELLITE", "FLUTE", "KITCHEN", "QUICKSTEP", "NEBULA", "ZEALOT", "TROPHY",
"WALRUS", "MERMAID", "DRAGON", "SKELETON", "HEDGEHOG", "PUMPKIN", "ANCHOR", "LANTERN", "COYOTE", "SCARECROW",
"GRIZZLY", "SHADOW", "CHEETAH", "BLIZZARD", "TSUNAMI", "ORCHID", "SCARF", "KEYBOARD", "CAMPFIRE", "GHOST",
"AQUARIUM", "PEACOCK", "MONSTER", "WINDOW", "IGUANA", "FEATHER", "PUNCHLINE", "PUPPET", "JUNGLE", "OXYGEN",
"VICTORY", "SPARROW", "EMERALD", "TROUSER", "BALLOON", "MUSEUM", "FAUCET", "GIGABYTE", "LOBSTER", "WRENCH",
"MARBLE", "TRAITOR", "PREMIUM", "NUGGET", "QUASAR", "SULTAN", "FALCON", "MUSTACHE", "TWILIGHT", "REPTILE",
"CACTUS", "GAVEL", "SHAMROCK", "OASIS", "VORTEX", "JUKEBOX", "POCKET", "SPOON", "CABINET", "PILLOW",
"MATTRESS", "GINGER", "CINNAMON", "BANJO", "GUTTER", "PUDDING", "COBALT", "MUSTARD", "SQUASH", "RADISH",
"OATMEAL", "TOASTER", "BLENDER", "KETTLE", "SKILLET", "POTATO", "CHERRY", "MAGNET", "THERMOS", "PADLOCK",
"STADIUM", "THEATER", "CHURCH", "TEMPLE", "STEEPLE", "FACTORY", "GARAGE", "COTTAGE", "MANSION", "PALACE",
"CASTLE", "DUNGEON", "FORTRESS", "HIGHWAY", "BRIDGE", "TUNNEL", "RUNWAY", "HELMET", "SWEATER", "SANDAL",
"SLIPPER", "MITTEN", "GIRDLING", "TROPHY", "BADGE", "RIBBON", "MEDAL", "SCROLL", "PARCHMENT", "JOURNAL",
"LEDGER", "STAMP", "POSTCARD", "ENVELOPE", "PARCEL", "LOCKER", "DRAWER", "SHELF", "MIRROR", "CANDLE",
"TORCH", "LANTERN", "BEACON", "BONFIRE", "FLAME", "SMOKE", "REPLICA", "MONUMENT", "STATUE", "FOUNTAIN",
"OBELISK", "COLUMN", "ARCHWAY", "GATEWAY", "PORTAL", "BARRIER", "FENCE", "LATTICE", "TRELLIS", "ARBOR",
"GARDEN", "MEADOW", "FOREST", "VALLEY", "CANYON", "PLATEAU", "MOUNTAIN", "HILLSIDE", "STREAM", "RIVER",
"OCEAN", "COAST", "BEACH", "ISLAND", "LAGOON", "SWAMP", "MARSH", "DESERT", "TUNDRA", "PRAIRIE",
"SAVANNA", "PASTURE", "ORCHARD", "VINEYARD", "NURSERY", "GREENHOUSE", "STABLE", "KENNEL", "COOP", "BARN",
"SILO", "WINDMILL", "TRACTOR", "PLOW", "HARVEST", "GRAIN", "WHEAT", "BARLEY", "FLOUR", "BREAD",
"BAKERY", "GROCERY", "MARKET", "BAZAAR", "BOUTIQUE", "GALLERY", "STUDIO", "WORKSHOP", "GARRET", "ATTIC",
"CELLAR", "BASEMENT", "PANTRY", "CLOSET", "HALLWAY", "BALCONY", "TERRACE", "VERANDA", "PORCH", "PATIO",
"COURTYARD", "SQUARE", "PLAZA", "AVENUE", "STREET", "ALLEY", "BOULEVARD", "FREEWAY", "PARKWAY", "DRIVEWAY",
"WALKWAY", "PATHWAY", "TRAIL", "TRACK", "CIRCUIT", "STADIUM", "ARENA", "RINK", "COURT", "FIELD",
"MEADOW", "PASTURE", "PADDOCK", "CORRAL", "RANGE", "SAFARI", "RESERVE", "SANCTUARY", "REFUGE", "ASYLUM",
"SHELTER", "HAVEN", "HARBOR", "PORT", "MARINA", "WHARF", "PIER", "DOCK", "ANCHORAGE", "MOORING",
"BEACON", "LIGHTHOUSE", "BUOY", "RAFT", "BARGE", "FERRY", "CRUISE", "YACHT", "VESSEL", "TANKER",
"FRIGATE", "GALLEON", "PIRATE", "CORSAIR", "BANDIT", "OUTLAW", "RANGER", "SCOUT", "GUIDE", "PILOT",
"CAPTAIN", "ADMIRAL", "GENERAL", "COLONEL", "MAJOR", "CAPTAIN", "LIEUTENANT", "SERGEANT", "SOLDIER", "WARRIOR",
"KNIGHT", "SQUIRE", "ARCHER", "SCOUT", "SPY", "AGENT", "DETECTIVE", "POLICE", "SHERIFF", "DEPUTY",
"MARSHAL", "WARDEN", "GUARD", "SENTINEL", "SENTRY", "WATCHMAN", "KEEPER", "STEWARD", "WARDEN", "TRUSTEE",
"REGENT", "MONARCH", "SULTAN", "PHARAOH", "EMPEROR", "PRINCE", "DUKE", "BARON", "KNIGHT", "HERO",
"CHAMPION", "WINNER", "VICTOR", "CONQUEROR", "MASTER", "EXPERT", "GENIUS", "WIZARD", "SORCERER", "MAGICIAN",
"WARLOCK", "WITCH", "FAIRY", "GOBLIN", "TROLL", "GIANT", "DWARF", "ELVES", "PIXIE", "SPRITE",
"NYMPH", "SIREN", "MERMAID", "TRITON", "NEPTUNE", "PEGASUS", "PHOENIX", "DRAGON", "GRIFFIN", "SPHINX",
"CENTAUR", "MINOTAUR", "MONSTER", "VAMPIRE", "ZOMBIE", "GHOST", "PHANTOM", "SPECTER", "SPIRIT", "SHADOW",
"SHADE", "GLOOM", "DUSK", "TWILIGHT", "SUNSET", "SUNRISE", "DAWN", "MORNING", "MIDDAY", "AFTERNOON",
"EVENING", "NIGHT", "MIDNIGHT", "TODAY", "TOMORROW", "YESTERDAY", "WEEKEND", "FORTNIGHT", "MONTH", "SEASON",
"SPRING", "SUMMER", "AUTUMN", "WINTER", "WEATHER", "CLIMATE", "TEMPEST", "STORM", "THUNDER", "LIGHTNING",
"BLIZZARD", "CYCLONE", "TORNADO", "HURRICANE", "TYPHOON", "GALE", "BREEZE", "ZEPHYR", "WHIRLWIND", "VORTEX",
"MALSTROM", "WHIRLPOOL", "CURRENT", "STREAM", "TORRENT", "CASCADE", "WATERFALL", "GEYSER", "FOUNTAIN", "SPRING",
"STREAM", "BROOK", "CREEK", "RIVER", "ESTUARY", "DELTA", "LAGOON", "BAYOU", "SWAMP", "MARSH",
"QUAGMIRE", "QUICKSAND", "DESERT", "OASIS", "DUNES", "CANYON", "VALLEY", "RAVINE", "GORGE", "CHASM",
"ABYSS", "CAVERN", "GROTTO", "TUNNEL", "SUBWAY", "METRO", "TRAIN", "ENGINE", "MOTOR", "TURBINE",
"PROPELLER", "ROTOR", "WHEEL", "GEAR", "PULLEY", "LEVER", "SPRING", "VALVE", "PISTON", "CYLINDER",
"CONCEAL", "CONCEDE", "CONCEIT", "CONCEPT", "CONCERN", "CONCERT", "CONCLUDE"

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

   

    // This tracks the words that haven't been played yet
window.chaserUnusedHangmanWords = window.WORDS.slice().sort(() => Math.random() - 0.5);

window.initHangmanGame = function () {
    // If the deck is empty, refill it with your 500 words and shuffle it
    if (window.chaserUnusedHangmanWords.length === 0) {
        window.chaserUnusedHangmanWords = WORDS.slice().sort(() => Math.random() - 0.5);
    }

    // Draw the top word from the shuffled deck
    const word = window.chaserUnusedHangmanWords.pop();

    window.hangmanState = {
        word: word,
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

        window.initHangmanGame = function () {
        const word = window.WORDS[Math.floor(Math.random() * window.WORDS.length)];
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
                totalRounds:20,
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
        if (window.chaserGame && window.chaserGame.hostId && window.chaserGame.hostId !== (window.myId || localStorage.getItem("rider_id"))) return;

        const s = window.triviaState;
        const item = TRIVIA_POOL[Math.floor(Math.random() * TRIVIA_POOL.length)];

        s.current = {
            q:item.q,
            c:item.c,
            a:shuffle(item.a)
        };

        s.votes = {};
        s.round++;

        startHostPhase("question", 8);
    };

    function hostAdvanceTriviaPhase() {
    if (!isHost()) return;

    const s = window.triviaState;
    if (!s) return;

    if (s.phase === "question") {
        startHostPhase("vote", 8);

    } else if (s.phase === "vote") {
        Object.keys(s.votes).forEach(pid => {
            if (s.votes[pid] === s.current.c) {
                s.score[pid] = (s.score[pid] || 0) + 1;
            }
        });

        startHostPhase("reveal", 5);

    } else if (s.phase === "reveal") {
        if (s.round >= s.totalRounds) {
            s.phase = "done";
            syncTrivia();
            renderTriviaBetter();
        } else {
            window.startTriviaRound();
        }
    }
}

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

                ${s.phase === "reveal" ? `
    <div style="font-weight:900; color:#1e4620; margin-top:8px;">
        Next question starting soon...
    </div>
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
            const res = await fetch("https://opentdb.com/api.php?amount=20&category=9&difficulty=easy&type=multiple");
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
        if (window.chaserGame && window.chaserGame.hostId && window.chaserGame.hostId !== (window.myId || localStorage.getItem("rider_id"))) return;

        const s = window.triviaState;
        if (!s) return;

        const item = await fetchFreshTriviaQuestion();

        s.current = item;
        s.votes = {};
        s.round++;
        s.phase = "question";
        s.timer = 8;
        s.phaseEndsAt = Date.now() + 8000;

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

   
/* ===========================================================
   COUP ENGINE — LOBBY VERSION
   Uses Chaser lobby players
   ============================================================ */

(function () {
    const ROLES = {
        Duke: { icon:"👑", action:"Tax: take 3 coins", block:"Blocks Foreign Aid" },
        Assassin: { icon:"🗡️", action:"Pay 3 to assassinate", block:"Blocked by Contessa" },
        Captain: { icon:"🏴‍☠️", action:"Steal 2 coins", block:"Blocked by Captain/Ambassador" },
        Ambassador: { icon:"🔄", action:"Exchange cards", block:"Blocks stealing" },
        Contessa: { icon:"🛡️", action:"No action", block:"Blocks Assassin" }
    };

    function myId() {
        return window.myId || localStorage.getItem("rider_id") || "local";
    }

    function sendCoup() {
        if (typeof channel !== "undefined" && channel && window.coupState) {
            channel.send({
                type:"broadcast",
                event:"coup-sync-state",
                payload:window.coupState
            });
        }
    }

    function makeDeck() {
        let d = [];
        Object.keys(ROLES).forEach(r => d.push(r, r, r));
        return d.sort(() => Math.random() - 0.5);
    }

    window.initCoupGame = function () {
        activeGameLabelTitle.innerText = "🕶️ Coup";

        const players = (window.chaserGame && window.chaserGame.players) || [];
        const hostId = window.chaserGame && window.chaserGame.hostId;
        const amHost = hostId === myId();

        if (amHost) {
            const deck = makeDeck();

            window.coupState = {
                phase:"playing",
                hostId,
                turn:0,
                deck,
                discard:[],
                log:["Coup started."],
                players:players.map(p => ({
                    id:p.id,
                    name:p.name,
                    seat:p.seat,
                    coins:2,
                    cards:[deck.pop(), deck.pop()],
                    revealed:[],
                    alive:true
                }))
            };

            sendCoup();
        }

        renderCoup();
    };

    window.handleIncomingCoupSync = function (state) {
        window.coupState = state;
        if (activeGameLabelTitle.innerText.includes("Coup")) renderCoup();
    };

    function currentPlayer() {
        return window.coupState.players[window.coupState.turn];
    }

    function nextTurn() {
        const s = window.coupState;
        let guard = 0;

        do {
            s.turn = (s.turn + 1) % s.players.length;
            guard++;
        } while (!s.players[s.turn].alive && guard < 20);

        const alive = s.players.filter(p => p.alive);
        if (alive.length === 1) {
            s.phase = "ended";
            s.log.push("🏆 " + alive[0].name + " wins!");
        }
    }

    function loseCard(target) {
        if (!target.cards.length) return;
        const lost = target.cards.shift();
        target.revealed.push(lost);
        if (!target.cards.length) {
            target.alive = false;
            window.coupState.log.push(target.name + " is out.");
        }
    }

    function cardHtml(role) {
        const r = ROLES[role];

        return `
            <div style="
                width:43vw;max-width:150px;min-height:190px;
                background:#f8f3df;color:#111;
                border:4px solid #ffd700;border-radius:14px;
                padding:10px;box-sizing:border-box;
                box-shadow:0 4px 12px rgba(0,0,0,.45);
                display:flex;flex-direction:column;
                justify-content:space-between;align-items:center;
                text-align:center;">
                <div style="font-size:46px;">${r.icon}</div>
                <div style="font-family:Impact;font-size:30px;color:#1e4620;">${role}</div>
                <div style="font-size:16px;font-weight:900;">${r.action}</div>
                <div style="font-size:14px;font-weight:900;color:#b00020;">${r.block}</div>
            </div>
        `;
    }

    function helpHtml() {
        return `
            <div id="coupHelpOverlay" style="
                position:absolute;inset:0;z-index:99999;
                background:rgba(0,0,0,.88);
                display:flex;align-items:center;justify-content:center;
                padding:10px;box-sizing:border-box;">
                <div style="
                    background:#e2f0d9;color:#1e4620;
                    border:4px solid #ffd700;border-radius:14px;
                    width:96%;max-width:340px;max-height:92%;
                    overflow:auto;padding:12px;box-sizing:border-box;">
                    <div style="font-family:Impact;font-size:34px;text-align:center;margin-bottom:8px;">
                        Coup Cheat Sheet
                    </div>
                    ${Object.keys(ROLES).map(role => `
                        <div style="background:white;border:2px solid #1e4620;border-radius:10px;padding:9px;margin-bottom:8px;">
                            <div style="font-size:22px;font-weight:900;">${ROLES[role].icon} ${role}</div>
                            <div style="font-size:17px;font-weight:900;">${ROLES[role].action}</div>
                            <div style="font-size:16px;font-weight:900;color:#b00020;">${ROLES[role].block}</div>
                        </div>
                    `).join("")}
                    <div style="background:#fff3cd;border:2px solid #ffd700;border-radius:10px;padding:8px;font-size:16px;font-weight:900;">
                        You may claim any role, even if you do not have it. That is the bluff.
                    </div>
                    <button onclick="document.getElementById('coupHelpOverlay').remove()" style="
                        margin-top:10px;width:100%;padding:12px;border:none;
                        border-radius:10px;background:#dc3545;color:white;
                        font-size:22px;font-weight:900;">Close</button>
                </div>
            </div>
        `;
    }

    window.showCoupHelpSheet = function () {
        if (!document.getElementById("coupHelpOverlay")) {
            gameCanvasContainer.insertAdjacentHTML("beforeend", helpHtml());
        }
    };

    function renderCoup() {
        const s = window.coupState;

        if (!s) {
            gameCanvasContainer.innerHTML = `
                <div style="color:white;font-size:22px;font-weight:900;text-align:center;padding:20px;">
                    Waiting for host to deal Coup...
                </div>
            `;
            return;
        }

        const me = s.players.find(p => p.id === myId());
        const active = currentPlayer();
        const isMyTurn = active && active.id === myId();

        gameCanvasContainer.innerHTML = `
            <div style="width:100%;height:100%;overflow:auto;padding:8px;box-sizing:border-box;color:white;font-family:Arial;">
                <button onclick="showCoupHelpSheet()" style="
                    position:absolute;top:6px;right:6px;z-index:20;
                    background:#ffd700;color:#1e4620;border:none;
                    border-radius:999px;padding:7px 12px;font-weight:900;">
                    Help
                </button>

                <div style="font-family:Impact;font-size:34px;color:#ffd700;text-align:center;">🕶️ COUP</div>

                <div style="background:#0b2410;border:2px solid #ffd700;border-radius:10px;padding:8px;text-align:center;margin:6px 0;">
                    <div style="font-size:20px;font-weight:900;color:#ffd700;">
                        ${s.phase === "ended" ? "GAME OVER" : "TURN: " + active.name}
                    </div>
                    ${isMyTurn && s.phase !== "ended" ? `<div style="font-size:18px;font-weight:900;color:#00bfff;">YOUR MOVE</div>` : ""}
                </div>

                ${s.players.map((p, i) => `
                    <div style="
                        display:flex;justify-content:space-between;align-items:center;
                        background:${p.alive ? "#e2f0d9" : "#555"};
                        color:${p.alive ? "#1e4620" : "#fff"};
                        border:${i === s.turn ? "3px solid #ffd700" : "2px solid transparent"};
                        border-radius:9px;padding:8px;margin-bottom:6px;font-weight:900;">
                        <div style="font-size:17px;max-width:38%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            ${i === s.turn ? "▶ " : ""}${p.name}
                        </div>
                        <div style="font-size:17px;">🪙 ${p.coins}</div>
                        <div style="font-size:14px;">Hidden: ${p.cards.length} | Out: ${p.revealed.join(", ") || "None"}</div>
                    </div>
                `).join("")}

                ${me ? `
                    <div style="color:#ffd700;font-size:22px;font-weight:900;text-align:center;margin-top:8px;">YOUR CARDS</div>
                    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:6px;">
                        ${me.cards.map(cardHtml).join("")}
                    </div>
                ` : ""}

                ${isMyTurn && me && me.alive && s.phase !== "ended" ? actionPanel(me) : ""}

                <div style="margin-top:10px;background:rgba(0,0,0,.35);border-radius:8px;padding:8px;">
                    <div style="color:#ffd700;font-size:18px;font-weight:900;">Log</div>
                    ${s.log.slice(-5).reverse().map(l => `<div style="font-size:15px;">• ${l}</div>`).join("")}
                </div>
            </div>
        `;
    }

    function actionPanel(me) {
        const mustCoup = me.coins >= 10;

        return `
            <div style="margin-top:10px;background:#123b16;border:2px solid #ffd700;border-radius:12px;padding:10px;">
                <div style="color:#ffd700;font-size:22px;font-weight:900;text-align:center;">Choose Action</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
                    ${!mustCoup ? btn("Income", "+1 coin", "coupIncome()") : ""}
                    ${!mustCoup ? btn("Foreign Aid", "+2 coins", "coupForeignAid()") : ""}
                    ${!mustCoup ? btn("Tax", "Claim Duke", "coupTax()") : ""}
                    ${!mustCoup ? btn("Exchange", "Claim Ambassador", "coupExchange()") : ""}
                    ${!mustCoup ? btn("Steal", "Claim Captain", "coupPickTarget('steal')") : ""}
                    ${!mustCoup ? btn("Assassinate", "Pay 3", "coupPickTarget('assassinate')") : ""}
                    ${btn("Coup", "Pay 7", "coupPickTarget('coup')")}
                </div>
                ${mustCoup ? `<div style="color:#dc3545;font-size:17px;font-weight:900;text-align:center;margin-top:8px;">10+ coins: you must Coup.</div>` : ""}
            </div>
        `;
    }

    function btn(title, sub, fn) {
        return `
            <button onclick="${fn}" style="
                background:#e2f0d9;color:#1e4620;border:2px solid #ffd700;
                border-radius:10px;padding:10px 6px;font-weight:900;min-height:64px;">
                <div style="font-family:Impact;font-size:22px;">${title}</div>
                <div style="font-size:14px;">${sub}</div>
            </button>
        `;
    }

    window.coupIncome = function () {
        const p = currentPlayer();
        p.coins += 1;
        window.coupState.log.push(p.name + " takes Income.");
        nextTurn(); sendCoup(); renderCoup();
    };

    window.coupForeignAid = function () {
        const p = currentPlayer();
        p.coins += 2;
        window.coupState.log.push(p.name + " takes Foreign Aid.");
        nextTurn(); sendCoup(); renderCoup();
    };

    window.coupTax = function () {
        const p = currentPlayer();
        p.coins += 3;
        window.coupState.log.push(p.name + " claims Duke and takes Tax.");
        nextTurn(); sendCoup(); renderCoup();
    };

    window.coupExchange = function () {
        const s = window.coupState;
        const p = currentPlayer();
        if (s.deck.length < 2) s.deck = s.deck.concat(s.discard).sort(() => Math.random() - 0.5);
        const pool = p.cards.concat([s.deck.pop(), s.deck.pop()].filter(Boolean));
        p.cards = pool.slice(0, 2);
        s.discard.push(...pool.slice(2));
        s.log.push(p.name + " claims Ambassador and exchanges.");
        nextTurn(); sendCoup(); renderCoup();
    };

    window.coupPickTarget = function (type) {
        const s = window.coupState;
        const targets = s.players.filter(p => p.alive && p.id !== myId());

        gameCanvasContainer.innerHTML = `
            <div style="width:100%;height:100%;overflow:auto;padding:14px;box-sizing:border-box;color:white;text-align:center;">
                <div style="font-family:Impact;font-size:32px;color:#ffd700;margin-bottom:10px;">Choose Target</div>
                ${targets.map(p => `
                    <button onclick="coupDoTarget('${type}','${p.id}')" style="
                        width:100%;padding:14px;margin-bottom:8px;border-radius:10px;
                        border:2px solid #ffd700;background:#e2f0d9;color:#1e4620;
                        font-size:22px;font-weight:900;">
                        ${p.name}
                    </button>
                `).join("")}
                <button onclick="renderCoup()" style="
                    width:100%;padding:12px;border:none;border-radius:10px;
                    background:#555;color:white;font-size:18px;font-weight:900;">Cancel</button>
            </div>
        `;
    };

    window.coupDoTarget = function (type, targetId) {
        const s = window.coupState;
        const actor = currentPlayer();
        const target = s.players.find(p => p.id === targetId);
        if (!target) return;

        if (type === "coup") {
            if (actor.coins < 7) return;
            actor.coins -= 7;
            loseCard(target);
            s.log.push(actor.name + " coups " + target.name + ".");
        }

        if (type === "assassinate") {
            if (actor.coins < 3) return;
            actor.coins -= 3;
            loseCard(target);
            s.log.push(actor.name + " claims Assassin against " + target.name + ".");
        }

        if (type === "steal") {
            const n = Math.min(2, target.coins);
            target.coins -= n;
            actor.coins += n;
            s.log.push(actor.name + " claims Captain and steals from " + target.name + ".");
        }

        nextTurn(); sendCoup(); renderCoup();
    };
})();
/* SOLITAIRE TAP + COMPACT LAYOUT FIX */
(function () {
    window.solSelectTableau = function (col, idx) {
        const s = window.solState;
        if (!s) return;

        const card = s.tableau[col][idx];
        if (!card || !card.open) return;

        if (s.selected) {
            const sameCard =
                s.selected.type === "tableau" &&
                s.selected.col === col &&
                s.selected.idx === idx;

            if (sameCard) {
                s.selected = null;
                s.message = "Selection cleared.";
                render(); // Make sure your render function is in scope
                return;
            }

            window.solMoveToTableau(col);
            return;
        }

        s.selected = { type:"tableau", col, idx };
        s.message = card.rank + card.symbol + " selected.";
        render();
    };

    const canvas = document.getElementById("gameCanvasContainer");

    const solFixObserver = new MutationObserver(() => {
        if (!window.chaserGame || window.chaserGame.activeGame !== "Solitaire") return;

        const board = canvas.querySelector(".sol-board");
        const tableau = canvas.querySelector(".sol-tableau");

        if (board) {
            board.style.padding = "6px";
            board.style.overflowX = "hidden";
        }

        if (tableau) {
            tableau.style.gap = "3px";
            tableau.style.gridTemplateColumns = "repeat(7, minmax(0, 1fr))";
        }
    });

    if (canvas) {
        solFixObserver.observe(canvas, { childList:true, subtree:true });
    }
})();

/* ============================================================
   CHASER PATCH C - UNO AESTHETICS & LOBBY RACE CONDITION FIX
   ============================================================ */
(function () {
    "use strict";

    // --- 1. LOBBY SYNC & DISCOVERY FIX ---
    const prevLaunch = window.launchGameEngine;
    
    window.launchGameEngine = function(gameName, gameIcon) {
        const hub = document.getElementById("gameHubOverlay");
        const stage = document.getElementById("activeGameStage");
        const canvas = document.getElementById("gameCanvasContainer");

        if (hub) hub.classList.remove("open");
        if (stage) stage.classList.add("open");

        // The Discovery Screen
        if (canvas) {
            canvas.innerHTML = `
                <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;gap:15px;user-select:none;">
                    <div style="font-size:32px;font-family:Impact,sans-serif;color:#ffd700;letter-spacing:1px;">${gameName.toUpperCase()}</div>
                    <div style="font-size:16px;color:#a3cfbb;font-weight:bold;">Searching for open games...</div>
                    <div style="width:40px;height:40px;border:4px solid rgba(255,255,255,0.2);border-top:4px solid #ffd700;border-radius:50%;animation:chaserSpin 1s linear infinite;"></div>
                    <style>@keyframes chaserSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
                </div>
            `;
        }

        // Wait 1.5s for incoming lobby broadcasts before creating a new one
        setTimeout(() => {
            if (prevLaunch) prevLaunch(gameName, gameIcon);
        }, 1500);
    };

    const prevHandleLobby = window.handleIncomingChaserGameLobby;
    window.handleIncomingChaserGameLobby = function(payload) {
        if (prevHandleLobby) prevHandleLobby(payload);

        // Auto-join if user is staring at the "How many players?" screen for this exact game
        const canvas = document.getElementById("gameCanvasContainer");
        if (canvas && canvas.innerHTML.includes("How many players?") && window.chaserGame && window.chaserGame.pendingGameName) {
            const normPending = window.chaserGame.pendingGameName.replace("Crew Trivia", "Trivia").replace("Battle Uno", "Uno");
            const normPayload = payload.gameName.replace("Crew Trivia", "Trivia").replace("Battle Uno", "Uno");

            // Snatch them out of the menu and pull them straight into their friend's lobby
            if (normPending === normPayload && typeof window.joinChaserOpenLobby === "function") {
                window.joinChaserOpenLobby(payload.roomGameId);
            }
        }
    };

    // --- 2. UNO AESTHETICS OVERHAUL ---
    function safeHtml(str) {
        return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    window.unoColorHex = function(color) {
        return { Red: "#e63946", Yellow: "#ffb703", Green: "#00b050", Blue: "#00b0ff", Wild: "#202020" }[color] || "#202020";
    };

    function nextUnoPlayer(from, steps = 1) {
        const s = window.unoState;
        const total = s.players.length;
        let idx = from;
        for (let i = 0; i < steps; i++) idx = (idx + s.direction + total) % total;
        return idx;
    }

    window.renderUnoCard = function(card, onclick, mode = "normal", faded = false) {
if (!card) return "";

function esc(v) {
    return String(v ?? "")
        .replace(/&/g, "&" + "amp;")
        .replace(/</g, "&" + "lt;")
        .replace(/>/g, "&" + "gt;")
        .replace(/"/g, "&" + "quot;")
        .replace(/'/g, "&" + "#039;");
}

let width = 54;
let height = 80;
let fontSize = 29;

if (mode === "large" || mode === "draw" || mode === "pile") {
    width = 104;
    height = 150;
    fontSize = 58;
} else if (mode === "small") {
    width = 52;
    height = 78;
    fontSize = 29;
}

let bg = "#202020";
let content = "";
let extraClass = "";
const clickAttr = onclick ? "onclick=\"" + onclick + "\"" : "";
const fadedStyle = faded ? "opacity:.48;filter:saturate(.65);" : "";

if (card.color === "Back") {
    bg = "#111111";
    extraClass = " uno-back-card";

    const backFont = mode === "large" || mode === "draw" || mode === "pile" ? 33 : 21;

    content =
        "<div class=\"uno-back-word\" style=\"font-size:" + backFont + "px;letter-spacing:-2px;max-width:100%;overflow:hidden;white-space:nowrap;line-height:1;\">" +
            "UNO" +
        "</div>";
} else if (card.color === "Wild") {
    bg = "conic-gradient(#e63946 0deg 90deg, #ffb703 90deg 180deg, #00b0ff 180deg 270deg, #00b050 270deg 360deg)";

    content =
        "<div style=\"font-size:" + Math.max(15, Math.floor(fontSize * .44)) + "px;line-height:1.02;text-shadow:0 2px 5px rgba(0,0,0,.7);\">" +
            (card.value === "+4" ? "Wild<br>+4" : "Wild") +
        "</div>";
} else {
    bg = window.unoColorHex(card.color);

    let displayVal = esc(card.value);

    if (displayVal === "Reverse") displayVal = "↺";
    if (displayVal === "Skip") displayVal = "⊘";

    content =
        "<div style=\"font-size:" + fontSize + "px;line-height:1;font-weight:900;text-shadow:0 3px 6px rgba(0,0,0,.35);\">" +
            displayVal +
        "</div>";
}

return (
    "<div class=\"uno-card uno-card-" + esc(mode) + extraClass + "\" " + clickAttr + " style=\"" +
        "width:" + width + "px;" +
        "height:" + height + "px;" +
        "min-width:" + width + "px;" +
        "border-radius:11px;" +
        "border:3px solid #ffffff;" +
        "background:" + bg + ";" +
        "color:#ffffff;" +
        "display:flex;" +
        "align-items:center;" +
        "justify-content:center;" +
        "font-family:Arial,sans-serif;" +
        "font-weight:900;" +
        "box-shadow:0 4px 9px rgba(0,0,0,.35);" +
        "position:relative;" +
        "box-sizing:border-box;" +
        "overflow:hidden;" +
        "text-align:center;" +
        "flex:0 0 auto;" +
        fadedStyle +
    "\">" +
        "<div style=\"position:absolute;left:-12%;top:18%;width:124%;height:47%;border-radius:50%;background:rgba(255,255,255,.13);transform:rotate(-9deg);\"></div>" +
        "<div style=\"position:relative;z-index:2;max-width:100%;box-sizing:border-box;padding:0 4px;\">" +
            content +
        "</div>" +
    "</div>"
);

};
    window.renderUnoLayout = function() {
const s = window.unoState;
if (!s) return;

function esc(v) {
    return String(v ?? "")
        .replace(/&/g, "&" + "amp;")
        .replace(/</g, "&" + "lt;")
        .replace(/>/g, "&" + "gt;")
        .replace(/"/g, "&" + "quot;")
        .replace(/'/g, "&" + "#039;");
}

const mySeat = window.chaserGame.mySeat ?? 0;
const hand = s.hands[mySeat] || [];
const discard = s.discard || { color: "Red", value: "0" };
const myTurn = s.turn === mySeat && !s.winner;
const activeName = s.players[s.turn]?.name || "Player " + (s.turn + 1);

const opponents = s.players.map((p, idx) => {
    if (idx === mySeat) return "";

    return (
        "<div class=\"uno-opponent-pill\">" +
            esc(p.name) + ": " + ((s.hands[idx] || []).length) +
        "</div>"
    );
}).join("");

let handHtml = "";

hand.forEach((card, idx) => {
    const playable = myTurn && (
        card.color === discard.color ||
        card.value === discard.value ||
        card.color === "Wild" ||
        discard.color === "Wild"
    );

    handHtml += window.renderUnoCard(card, "window.unoPlayCard(" + idx + ")", "small", !playable);
});

let colorPickerHtml = "";

if (s.wildChoosingSeat === mySeat) {
    colorPickerHtml =
        "<div class=\"uno-color-picker\">" +
            ["Red", "Yellow", "Green", "Blue"].map(c => {
                return "<button onclick=\"window.unoPickWildColor('" + c + "')\" style=\"background:" + window.unoColorHex(c) + ";\" type=\"button\">" + c + "</button>";
            }).join("") +
        "</div>";
}

let html = [
    "<style>",
        ".uno-wrap{height:100%;overflow:hidden;padding:10px 12px 84px;box-sizing:border-box;font-family:Arial,sans-serif;color:#e2f0d9;background:#06260d;display:flex;flex-direction:column;align-items:center;}",
        ".uno-turn-title{font-size:34px;font-weight:900;letter-spacing:6px;color:#00b050;margin:0 0 14px;text-align:center;text-transform:uppercase;line-height:1.05;}",
        ".uno-opponents{min-height:20px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:0 auto 6px;}",
        ".uno-opponent-pill{background:#e2f0d9;color:#1e4620;border-radius:999px;padding:3px 9px;font-size:12px;font-weight:900;}",
        ".uno-message{color:#ffd700;font-size:21px;font-weight:900;text-align:center;min-height:28px;margin:0 auto 8px;line-height:1.15;}",
        ".uno-pile-row{display:flex;align-items:flex-start;justify-content:center;gap:38px;margin:2px auto 22px;width:100%;}",
        ".uno-pile-box{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;}",
        ".uno-pile-label{color:#b7d8c0;font-size:18px;font-weight:900;letter-spacing:1px;margin-bottom:6px;text-transform:uppercase;}",
        ".uno-color-picker{display:flex;gap:7px;justify-content:center;flex-wrap:wrap;margin:-8px auto 8px;}",
        ".uno-color-picker button{border:2px solid #ffffff;border-radius:999px;color:#ffffff;font-size:12px;font-weight:900;padding:7px 10px;text-shadow:0 2px 4px rgba(0,0,0,.45);}",
        ".uno-hand-zone{width:100%;margin-top:10px;}",
        "#uno-hand-container{display:flex;gap:7px!important;justify-content:flex-start;align-items:center;overflow-x:auto;overflow-y:hidden;width:100%;padding:0 9px 10px!important;box-sizing:border-box;scrollbar-width:thin;}",
        "#uno-hand-container .uno-card{margin-left:0!important;}",
        "#uno-hand-container .uno-card + .uno-card{margin-left:0!important;}",
        "#uno-hand-container::-webkit-scrollbar{height:9px;}",
        "#uno-hand-container::-webkit-scrollbar-track{background:rgba(0,0,0,.35);border-radius:999px;}",
        "#uno-hand-container::-webkit-scrollbar-thumb{background:#ffd700;border-radius:999px;}",
        "@media(max-width:390px){",
            ".uno-wrap{padding:8px 10px 84px;}",
            ".uno-turn-title{font-size:30px;margin-bottom:12px;}",
            ".uno-message{font-size:20px;margin-bottom:7px;}",
            ".uno-pile-row{gap:28px;margin-bottom:19px;}",
            ".uno-pile-label{font-size:17px;}",
            "#uno-hand-container{gap:6px!important;padding-left:8px!important;padding-right:8px!important;}",
        "}",
    "</style>",

    "<div class=\"uno-wrap\">",
        "<div class=\"uno-turn-title\">",
            s.winner ? esc(s.winner.name) + " WINS!" : myTurn ? "YOUR TURN" : "TURN: " + esc(activeName).toUpperCase(),
        "</div>",

        "<div class=\"uno-opponents\">", opponents, "</div>",
        "<div class=\"uno-message\">", esc(s.message || ""), "</div>",

        "<div class=\"uno-pile-row\">",
            "<div class=\"uno-pile-box\">",
                "<div class=\"uno-pile-label\">Draw</div>",
                window.renderUnoCard({ color: "Back", value: "UNO" }, "window.unoDrawCard()", "pile", !myTurn),
            "</div>",
            "<div class=\"uno-pile-box\">",
                "<div class=\"uno-pile-label\">Play</div>",
                window.renderUnoCard(discard, "", "pile"),
            "</div>",
        "</div>",

        colorPickerHtml,

        "<div class=\"uno-hand-zone\">",
            "<div id=\"uno-hand-container\" class=\"uno-top-scroll\">",
                handHtml,
            "</div>",
        "</div>",
    "</div>"
].join("");

const canvas = document.getElementById("gameCanvasContainer");

if (canvas) {
canvas.innerHTML = html;

function scrollUnoHandRight() {
    const handContainer = document.getElementById("uno-hand-container");

    if (!handContainer) return;

    handContainer.scrollLeft = handContainer.scrollWidth;
    handContainer.scrollTo({
        left: handContainer.scrollWidth,
        behavior: "auto"
    });
}

setTimeout(scrollUnoHandRight, 0);
setTimeout(scrollUnoHandRight, 80);
setTimeout(scrollUnoHandRight, 180);

}
};

    window.unoPlayCard = function(idx) {
        const s = window.unoState;
        if (!s || s.winner) return;

        const mySeat = window.chaserGame.mySeat ?? 0;
        if (s.turn !== mySeat) return;

        const card = s.hands[mySeat][idx];
        const discard = s.discard;

        const playable = card.color === discard.color || card.value === discard.value || card.color === "Wild" || discard.color === "Wild";
        if (!playable) return;

        if (card.color === "Wild") {
            s.wildChoosingSeat = mySeat;
            s.pendingWildCardIndex = idx;
            s.message = "Choose a color.";
            window.renderUnoLayout();
            return;
        }

        window.playUnoCardNow(mySeat, idx, card);
    };

    window.playUnoCardNow = function(seat, idx, card, chosenColor = null) {
        const s = window.unoState;
        s.hands[seat].splice(idx, 1);

        s.discard = chosenColor ? { color: chosenColor, value: card.value } : card;

        if (s.hands[seat].length === 0) {
            s.winner = s.players[seat];
            s.message = `${s.players[seat].name} wins!`;
            syncUno();
            window.renderUnoLayout();
            return;
        }

        let steps = 1;
        if (card.value === "Reverse") {
            s.direction *= -1;
            if (s.players.length === 2) steps = 2;
        }
        if (card.value === "Skip") steps = 2;

        if (card.value === "+2") {
            const target = nextUnoPlayer(seat, 1);
            for (let i = 0; i < 2; i++) if (s.deck.length) s.hands[target].push(s.deck.pop());
            steps = 2;
            s.message = `${s.players[target].name} draws 2.`;
        } else if (card.value === "+4") {
            const target = nextUnoPlayer(seat, 1);
            for (let i = 0; i < 4; i++) if (s.deck.length) s.hands[target].push(s.deck.pop());
            steps = 2;
            s.message = `${s.players[target].name} draws 4.`;
        } else {
            s.message = `${s.players[seat].name} played ${card.value}.`;
        }

        s.turn = nextUnoPlayer(seat, steps);
        s.wildChoosingSeat = null;
        s.pendingWildCardIndex = null;

        syncUno();
        window.renderUnoLayout();
    };

    window.unoPickWildColor = function(color) {
        const s = window.unoState;
        if (!s) return;
        const mySeat = window.chaserGame.mySeat ?? 0;
        if (s.wildChoosingSeat !== mySeat) return;

        const idx = s.pendingWildCardIndex;
        const card = s.hands[mySeat][idx];
        if (!card) return;

        window.playUnoCardNow(mySeat, idx, card, color);
    };

    function syncUno() {
        if (typeof channel !== "undefined" && channel && window.chaserGame) {
            channel.send({
                type: "broadcast",
                event: "uno-sync-discard",
                payload: {
                    state: window.unoState,
                    senderId: window.myId || localStorage.getItem("rider_id"),
                    roomGameId: window.chaserGame.activeGameId
                }
            });
        }
    }

    // Override existing receiver to call new Uno renderer
    const oldUnoReceive = window.receiveUnoSync;
    window.receiveUnoSync = function(p) {
        if (!p || !p.state) return;
        window.unoState = p.state;
        if (window.chaserGame) window.chaserGame.activeGame = "Uno";
        window.renderUnoLayout();
    };

})();

/* ============================================================
   CHASER PATCH D - SOLITAIRE RESPONSIVE LAYOUT
   ============================================================ */
(function() {
    "use strict";
    const style = document.createElement('style');
    style.innerHTML = `
        .sol-board { display: flex !important; flex-direction: column !important; height: 100% !important; max-height: 100vh !important; overflow: hidden !important; }
        .sol-tableau { flex: 1 !important; overflow-y: auto !important; margin-bottom: 10px !important; scrollbar-width: none; }
        .sol-tableau::-webkit-scrollbar { display: none; }
        .sol-bottom-zone { flex-shrink: 0 !important; margin-top: auto !important; z-index: 10 !important; padding-top:10px; background: inherit; }
    `;
    document.head.appendChild(style);
})();
/* ============================================================
   CHASER PATCH G - SOLITAIRE LAYOUT TWEAKS
   ============================================================ */
(function() {
    "use strict";
    const style = document.createElement('style');
    style.innerHTML = `
        /* Hide the message box entirely to save space */
        .sol-message { display: none !important; }

        /* Make the board relative so we can pin things to the bottom */
        .sol-board { 
            position: relative !important; 
            display: flex !important; 
            flex-direction: column !important; 
            height: 100% !important; 
            padding-bottom: 135px !important; /* Increased to account for higher buttons */
            box-sizing: border-box !important;
        }

        /* Push the tableau to take up all middle space and scroll */
        .sol-tableau { 
            flex: 1 !important; 
            overflow-y: auto !important; 
            scrollbar-width: none; 
            margin-bottom: 0 !important;
        }
        .sol-tableau::-webkit-scrollbar { display: none; }

        /* Pin the New Deal / Auto Move buttons to Bottom-Left, shifted UP */
        .sol-btn-row { 
            position: absolute !important; 
            bottom: 45px !important; /* Shifted UP to clear Exit Game text */
            left: 10px !important; 
            display: flex !important; 
            flex-direction: column !important; 
            gap: 10px !important; 
            width: auto !important;
            margin: 0 !important;
            z-index: 999 !important;
            background: transparent !important;
        }

        /* Pin the Stock / Waste piles firmly to the Bottom-Right */
        .sol-bottom-zone { 
            position: absolute !important; 
            bottom: 45px !important; /* Shifted UP to align with buttons */
            right: 5px !important; /* Pinned flush to the right edge */
            left: auto !important; 
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            gap: 10px !important; 
            align-items: flex-end !important;
            justify-content: flex-end !important; /* Force to the right wall */
            width: auto !important; 
            z-index: 900 !important;
            background: transparent !important;
        }

        /* Force Foundation Cards to stay inside the borders */
        .sol-foundation-slot .sol-card {
            width: 100% !important;
            height: 100% !important;
            box-sizing: border-box !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            margin: 0 !important;
        }
        .sol-foundation-slot {
            position: relative !important;
            overflow: hidden !important; 
        }
    `;
    document.head.appendChild(style);
})();

/* ============================================================
   CHASER PATCH H - UNO TOP SCROLLBAR VISIBILITY
   ============================================================ */
(function() {
    "use strict";
    const style = document.createElement('style');
    style.innerHTML = `
        /* Force a thick, bright gold scrollbar track */
        .uno-top-scroll::-webkit-scrollbar {
            height: 14px !important;
        }
        .uno-top-scroll::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.4) !important;
            border-radius: 8px !important;
        }
        .uno-top-scroll::-webkit-scrollbar-thumb {
            background: #ffd700 !important; 
            border-radius: 8px !important;
            border: 2px solid #111 !important;
        }
    `;
    document.head.appendChild(style);
})();
/* ============================================================
   COUP PATCH — cleaner layout + bluff/challenge actions
   Paste at VERY BOTTOM of games.js
   ============================================================ */

(function () {
    const ROLES = {
        Duke: { icon:"👑", action:"Tax: take 3 coins", block:"Blocks Foreign Aid" },
        Assassin: { icon:"🗡️", action:"Pay 3 to assassinate", block:"Blocked by Contessa" },
        Captain: { icon:"🏴‍☠️", action:"Steal 2 coins", block:"Blocked by Captain/Ambassador" },
        Ambassador: { icon:"🔄", action:"Exchange cards", block:"Blocks stealing" },
        Contessa: { icon:"🛡️", action:"Blocks Assassin", block:"Blocks Assassin" }
    };

    function myId() {
        return window.myId || localStorage.getItem("rider_id") || "local";
    }

    function sendCoup() {
        if (typeof channel !== "undefined" && channel && window.coupState) {
            channel.send({
                type:"broadcast",
                event:"coup-sync-state",
                payload:{
                    ...window.coupState,
                    roomGameId: window.chaserGame?.activeGameId || null
                }
            });
        }
    }

    function shuffle(arr) {
        return arr.sort(() => Math.random() - 0.5);
    }

    function makeDeck() {
        let d = [];
        Object.keys(ROLES).forEach(r => d.push(r, r, r));
        return shuffle(d);
    }

    function currentPlayer() {
        return window.coupState.players[window.coupState.turn];
    }

    function alivePlayers() {
        return window.coupState.players.filter(p => p.alive);
    }

    function nextTurn() {
        const s = window.coupState;

        if (alivePlayers().length === 1) {
            s.phase = "ended";
            s.log.push("🏆 " + alivePlayers()[0].name + " wins!");
            return;
        }

        let guard = 0;
        do {
            s.turn = (s.turn + 1) % s.players.length;
            guard++;
        } while (!s.players[s.turn].alive && guard < 20);
    }

    function loseCard(player) {
        if (!player || !player.cards.length) return;
        const lost = player.cards.shift();
        player.revealed.push(lost);

        if (!player.cards.length) {
            player.alive = false;
            window.coupState.log.push(player.name + " is out.");
        }
    }

    function replaceRevealedClaim(actor, claim) {
        const s = window.coupState;
        const idx = actor.cards.indexOf(claim);
        if (idx === -1) return;

        actor.cards.splice(idx, 1);
        s.deck.push(claim);
        s.deck = shuffle(s.deck);

        if (s.deck.length) {
            actor.cards.push(s.deck.pop());
        }
    }

    window.initCoupGame = function () {
        const players = (window.chaserGame && window.chaserGame.players) || [];
        const hostId = window.chaserGame && window.chaserGame.hostId;
        const amHost = hostId === myId();

        if (amHost) {
            const deck = makeDeck();

            window.coupState = {
                phase:"playing",
                hostId,
                turn:0,
                deck,
                discard:[],
                pending:null,
                log:["Coup started."],
                players:players.map(p => ({
                    id:p.id,
                    name:p.name,
                    seat:p.seat,
                    coins:2,
                    cards:[deck.pop(), deck.pop()],
                    revealed:[],
                    alive:true
                }))
            };

            sendCoup();
        }

        renderCoupPatched();
    };

    window.handleIncomingCoupSync = function (state) {
        if (!state) return;
        if (state.roomGameId && window.chaserGame?.activeGameId && state.roomGameId !== window.chaserGame.activeGameId) return;

        window.coupState = state;
        renderCoupPatched();
    };

    function renderCoupPatched() {
        const s = window.coupState;
        const gameCanvas = document.getElementById("gameCanvasContainer");

        if (!s || !gameCanvas) {
            gameCanvas.innerHTML = `<div style="color:white;font-size:22px;font-weight:900;text-align:center;padding:20px;">Waiting for host to deal Coup...</div>`;
            return;
        }

        const me = s.players.find(p => p.id === myId());
        const active = currentPlayer();
        const isMyTurn = active && active.id === myId();
        const pending = s.pending;

        gameCanvas.innerHTML = `
            <div style="width:100%;height:100%;overflow:auto;padding:8px;box-sizing:border-box;color:white;font-family:Arial;">

                ${s.players.map((p, i) => `
                    <div style="
                        display:flex;justify-content:space-between;align-items:center;
                        background:${p.alive ? "#e2f0d9" : "#555"};
                        color:${p.alive ? "#1e4620" : "#fff"};
                        border:${i === s.turn ? "4px solid #ff0000" : "2px solid transparent"};
                        border-radius:9px;padding:8px;margin-bottom:6px;font-weight:900;">
                        <div style="font-size:17px;max-width:38%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            ${i === s.turn ? `<span style="color:#ff0000;font-size:24px;font-weight:900;">▶</span> ` : ""}${p.name}
                        </div>
                        <div style="font-size:17px;">🪙 ${p.coins}</div>
                        <div style="font-size:14px;">Hidden: ${p.cards.length} | Out: ${p.revealed.join(", ") || "None"}</div>
                    </div>
                `).join("")}

                ${me ? `
                    <div style="color:#ffd700;font-size:22px;font-weight:900;text-align:center;margin-top:8px;">YOUR CARDS</div>
                    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:6px;">
                        ${me.cards.map(cardHtml).join("")}
                    </div>
                ` : ""}

                ${pending ? pendingPanel(pending, me) : ""}
                ${!pending && isMyTurn && me && me.alive && s.phase !== "ended" ? actionPanel(me) : ""}

                <div style="margin-top:10px;background:rgba(0,0,0,.35);border-radius:8px;padding:8px;">
                    <div style="color:#ffd700;font-size:18px;font-weight:900;">Log</div>
                    ${s.log.slice(-6).reverse().map(l => `<div style="font-size:15px;">• ${l}</div>`).join("")}
                </div>
            </div>
        `;
    }

    function cardHtml(role) {
        const r = ROLES[role];
        return `
            <div style="
                width:43vw;max-width:150px;min-height:180px;
                background:#f8f3df;color:#111;
                border:4px solid #ffd700;border-radius:14px;
                padding:10px;box-sizing:border-box;
                box-shadow:0 4px 12px rgba(0,0,0,.45);
                display:flex;flex-direction:column;
                justify-content:space-between;align-items:center;
                text-align:center;">
                <div style="font-size:42px;">${r.icon}</div>
                <div font-size:${role === "Ambassador" ? "22px" : "28px"};color:#1e4620;">${role}</div>
                <div style="font-size:15px;font-weight:900;">${r.action}</div>
                <div style="font-size:13px;font-weight:900;color:#b00020;">${r.block}</div>
            </div>
        `;
    }

    function actionPanel(me) {
        const mustCoup = me.coins >= 10;

        return `
            <div style="margin-top:10px;background:#123b16;border:2px solid #ffd700;border-radius:12px;padding:10px;">
                <div style="color:#ffd700;font-size:22px;font-weight:900;text-align:center;">Choose Action</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
                    ${!mustCoup ? btn("Income", "+1 coin", "coupIncome()") : ""}
                    ${!mustCoup ? btn("Foreign Aid", "+2 coins", "coupForeignAid()") : ""}
                    ${!mustCoup ? btn("Tax", "Claim Duke", "coupClaimAction('tax','Duke')") : ""}
                    ${!mustCoup ? btn("Exchange", "Claim Ambassador", "coupClaimAction('exchange','Ambassador')") : ""}
                    ${!mustCoup ? btn("Steal", "Claim Captain", "coupPickTarget('steal')") : ""}
                    ${!mustCoup ? btn("Assassinate", "Claim Assassin", "coupPickTarget('assassinate')") : ""}
                    ${btn("Coup", "Pay 7", "coupPickTarget('coup')")}
                </div>
                ${mustCoup ? `<div style="color:#dc3545;font-size:17px;font-weight:900;text-align:center;margin-top:8px;">10+ coins: you must Coup.</div>` : ""}
            </div>
        `;
    }

    function pendingPanel(pending, me) {
        const actor = window.coupState.players.find(p => p.id === pending.actorId);
        const target = window.coupState.players.find(p => p.id === pending.targetId);

        return `
            <div style="margin-top:10px;background:#0b2410;border:3px solid #ffd700;border-radius:12px;padding:10px;text-align:center;">
                <div style="color:#ffd700;font-size:21px;font-weight:900;">
                    ${actor.name} claims ${pending.claim}
                </div>
                <div style="font-size:15px;font-weight:900;color:#e2f0d9;margin-top:4px;">
                    Action: ${pending.kind}${target ? " → " + target.name : ""}
                </div>

                ${me && me.alive && me.id !== pending.actorId ? `
                    <button onclick="coupChallengeClaim()"
                        style="margin-top:9px;width:100%;padding:11px;border:none;border-radius:10px;
                        background:#dc3545;color:white;font-size:18px;font-weight:900;">
                        CHALLENGE / CALL BLUFF
                    </button>
                ` : ""}

                ${me && me.id === pending.actorId ? `
                    <button onclick="coupResolvePendingAction()"
                        style="margin-top:9px;width:100%;padding:11px;border:none;border-radius:10px;
                        background:#00b050;color:white;font-size:18px;font-weight:900;">
                        RESOLVE ACTION
                    </button>
                ` : `
                    <div style="color:#a3cfbb;font-weight:bold;margin-top:8px;">Waiting...</div>
                `}
            </div>
        `;
    }

    function btn(title, sub, fn) {
        return `
            <button onclick="${fn}" style="
                background:#e2f0d9;color:#1e4620;border:2px solid #ffd700;
                border-radius:10px;padding:10px 6px;font-weight:900;min-height:64px;">
                <div style="font-family:Impact;font-size:22px;">${title}</div>
                <div style="font-size:14px;">${sub}</div>
            </button>
        `;
    }

    window.coupClaimAction = function (kind, claim, targetId = null) {
        const s = window.coupState;
        const actor = currentPlayer();
        if (!actor || actor.id !== myId()) return;

        s.pending = { kind, claim, actorId:actor.id, targetId };
        s.log.push(actor.name + " claims " + claim + ".");
        sendCoup();
        renderCoupPatched();
    };

    window.coupChallengeClaim = function () {
        const s = window.coupState;
        const pending = s.pending;
        if (!pending) return;

        const challenger = s.players.find(p => p.id === myId());
        const actor = s.players.find(p => p.id === pending.actorId);
        if (!challenger || !actor || challenger.id === actor.id) return;

        if (actor.cards.includes(pending.claim)) {
            s.log.push(challenger.name + " challenged and was wrong. " + actor.name + " had " + pending.claim + ".");
            loseCard(challenger);
            replaceRevealedClaim(actor, pending.claim);
            applyPendingAction();
        } else {
            s.log.push(challenger.name + " caught the bluff! " + actor.name + " did not have " + pending.claim + ".");
            loseCard(actor);
            s.pending = null;
            nextTurn();
        }

        sendCoup();
        renderCoupPatched();
    };

    function applyPendingAction() {
        const s = window.coupState;
        const pending = s.pending;
        if (!pending) return;

        const actor = s.players.find(p => p.id === pending.actorId);
        const target = s.players.find(p => p.id === pending.targetId);

        if (pending.kind === "tax") {
            actor.coins += 3;
            s.log.push(actor.name + " takes Tax.");
        }

        if (pending.kind === "exchange") {
            if (s.deck.length < 2) s.deck = shuffle(s.deck.concat(s.discard));
            const pool = actor.cards.concat([s.deck.pop(), s.deck.pop()].filter(Boolean));
            actor.cards = pool.slice(0, 2);
            s.discard.push(...pool.slice(2));
            s.log.push(actor.name + " exchanges cards.");
        }

        if (pending.kind === "steal" && target) {
            const n = Math.min(2, target.coins);
            target.coins -= n;
            actor.coins += n;
            s.log.push(actor.name + " steals " + n + " coins from " + target.name + ".");
        }

        if (pending.kind === "assassinate" && target) {
            if (actor.coins >= 3) {
                actor.coins -= 3;
                loseCard(target);
                s.log.push(actor.name + " assassinates " + target.name + ".");
            }
        }

        s.pending = null;
        nextTurn();
    }

    window.coupResolvePendingAction = function () {
        const s = window.coupState;
        if (!s.pending) return;
        if (s.pending.actorId !== myId()) return;

        applyPendingAction();
        sendCoup();
        renderCoupPatched();
    };

    window.coupIncome = function () {
        const p = currentPlayer();
        if (!p || p.id !== myId()) return;
        p.coins += 1;
        window.coupState.log.push(p.name + " takes Income.");
        nextTurn();
        sendCoup();
        renderCoupPatched();
    };

    window.coupForeignAid = function () {
        const p = currentPlayer();
        if (!p || p.id !== myId()) return;
        p.coins += 2;
        window.coupState.log.push(p.name + " takes Foreign Aid.");
        nextTurn();
        sendCoup();
        renderCoupPatched();
    };

    window.coupPickTarget = function (type) {
        const s = window.coupState;
        const targets = s.players.filter(p => p.alive && p.id !== myId());
        const gameCanvas = document.getElementById("gameCanvasContainer");

        gameCanvas.innerHTML = `
            <div style="width:100%;height:100%;overflow:auto;padding:14px;box-sizing:border-box;color:white;text-align:center;">
                <div style="font-family:Impact;font-size:32px;color:#ffd700;margin-bottom:10px;">Choose Target</div>
                ${targets.map(p => `
                    <button onclick="coupDoTarget('${type}','${p.id}')"
                        style="width:100%;padding:14px;margin-bottom:8px;border-radius:10px;
                        border:2px solid #ffd700;background:#e2f0d9;color:#1e4620;
                        font-size:22px;font-weight:900;">
                        ${p.name}
                    </button>
                `).join("")}
                <button onclick="window.initCoupGame()"
                    style="width:100%;padding:12px;border:none;border-radius:10px;
                    background:#555;color:white;font-size:18px;font-weight:900;">Cancel</button>
            </div>
        `;
    };

    window.coupDoTarget = function (type, targetId) {
        const s = window.coupState;
        const actor = currentPlayer();
        const target = s.players.find(p => p.id === targetId);
        if (!actor || actor.id !== myId() || !target) return;

        if (type === "coup") {
            if (actor.coins < 7) return;
            actor.coins -= 7;
            loseCard(target);
            s.log.push(actor.name + " coups " + target.name + ".");
            nextTurn();
        }

        if (type === "steal") {
            s.pending = { kind:"steal", claim:"Captain", actorId:actor.id, targetId };
            s.log.push(actor.name + " claims Captain to steal from " + target.name + ".");
        }

        if (type === "assassinate") {
            if (actor.coins < 3) return;
            s.pending = { kind:"assassinate", claim:"Assassin", actorId:actor.id, targetId };
            s.log.push(actor.name + " claims Assassin against " + target.name + ".");
        }

        sendCoup();
        renderCoupPatched();
    };
})();
/* ============================================================
   SOLITAIRE WIN TORNADO PATCH
   Paste at VERY BOTTOM of games.js
   ============================================================ */

(function () {
    const oldAutoFoundation = window.solAutoFoundation;
    const oldMoveToFoundation = window.solMoveToFoundation;

    function solitaireIsWon() {
        const s = window.solState;
        if (!s || !s.foundations) return false;
        return ["S", "C", "H", "D"].every(suit => s.foundations[suit].length === 13);
    }

    function launchSolitaireTornado() {
        if (document.getElementById("solWinTornado")) return;

        const canvas = document.getElementById("gameCanvasContainer");
        if (!canvas) return;

        const overlay = document.createElement("div");
        overlay.id = "solWinTornado";
        overlay.innerHTML = `
            <style>
                @keyframes solSpinWin {
                    0% {
                        transform: translate(-50%, -50%) rotate(0deg) scale(.4);
                        opacity: 0;
                    }
                    15% { opacity: 1; }
                    70% {
                        transform: translate(var(--x), var(--y)) rotate(720deg) scale(1);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(-50%, -50%) rotate(1080deg) scale(.2);
                        opacity: 0;
                    }
                }

                .sol-win-card {
                    position:absolute;
                    left:50%;
                    top:50%;
                    width:42px;
                    height:58px;
                    border-radius:7px;
                    background:#fff;
                    border:2px solid #ffd700;
                    color:#1e4620;
                    font-weight:900;
                    font-size:15px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    box-shadow:0 4px 10px rgba(0,0,0,.45);
                    animation:solSpinWin 2.4s ease-in-out forwards;
                    animation-delay:var(--delay);
                }
            </style>

            <div style="position:absolute;inset:0;z-index:99999;pointer-events:none;overflow:hidden;">
                <div style="position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);
                    color:#ffd700;font-family:Impact,sans-serif;font-size:34px;font-weight:900;
                    text-shadow:2px 3px 6px #000;">
                    SOLITAIRE COMPLETE!
                </div>
            </div>
        `;

        canvas.appendChild(overlay);

        const layer = overlay.querySelector("div");
        const symbols = ["A♠","K♥","Q♦","J♣","10♠","9♥","8♦","7♣","6♠","5♥","4♦","3♣","2♠"];

        for (let i = 0; i < 42; i++) {
            const card = document.createElement("div");
            card.className = "sol-win-card";
            card.textContent = symbols[i % symbols.length];

            const angle = i * 28;
            const radius = 80 + (i % 7) * 22;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            card.style.setProperty("--x", `${x}px`);
            card.style.setProperty("--y", `${y}px`);
            card.style.setProperty("--delay", `${i * 0.035}s`);

            layer.appendChild(card);
        }

        setTimeout(() => overlay.remove(), 3400);
    }

    function checkAndCelebrate() {
        setTimeout(() => {
            if (solitaireIsWon()) launchSolitaireTornado();
        }, 120);
    }

    window.solMoveToFoundation = function (suit) {
        if (typeof oldMoveToFoundation === "function") {
            oldMoveToFoundation(suit);
            checkAndCelebrate();
        }
    };

    window.solAutoFoundation = function () {
        if (typeof oldAutoFoundation === "function") {
            oldAutoFoundation();
            checkAndCelebrate();
        }
    };
})();

   
/* CHASER GAME FOOTER BUTTON ROW — exit left, Coup help right */
(function () {
    const style = document.createElement("style");
    style.innerHTML = `
        #activeGameStage {
            padding-bottom: 42px !important;
        }

        #gameCanvasContainer {
            padding-bottom: 8px !important;
        }

        .canvas-exit-anchor-box {
            position: absolute !important;
            bottom: 6px !important;
            left: 10px !important;
            z-index: 9999 !important;
            background: #dc3545 !important;
            border: 1px solid #ffffff !important;
            border-radius: 999px !important;
            padding: 4px 9px !important;
            gap: 4px !important;
            box-shadow: 0 2px 7px rgba(0,0,0,.35) !important;
        }

        .canvas-exit-x-glyph,
        .canvas-exit-label-str {
            color: #ffffff !important;
            text-shadow: none !important;
            font-weight: 900 !important;
        }

        .canvas-exit-x-glyph {
            font-size: 13px !important;
        }

        .canvas-exit-label-str {
            font-size: 11px !important;
        }

        #coupHelpBtn {
            position: absolute !important;
            top: auto !important;
            bottom: 6px !important;
            right: 10px !important;
            left: auto !important;
            z-index: 9999 !important;
            background: #ffd700 !important;
            color: #1e4620 !important;
            border: 1px solid #ffffff !important;
            border-radius: 999px !important;
            padding: 5px 11px !important;
            font-size: 12px !important;
            font-weight: 900 !important;
            box-shadow: 0 2px 7px rgba(0,0,0,.35) !important;
        }
    `;
    document.head.appendChild(style);
})();

/* ============================================================
   COUP FINAL VISUAL PATCH
   - Help button lives in same bottom row as Exit Game
   - Help popup has red X only, no scroll, no bluff text
   - Block text is red, action text is white
   - Ambassador card title fits
   ============================================================ */
(function () {
    "use strict";

    const style = document.createElement("style");
    style.innerHTML = `
        /* Keep footer row space available */
        #activeGameStage {
            padding-bottom: 48px !important;
        }

        /* Exit button: left side of footer row */
        .canvas-exit-anchor-box {
            position: absolute !important;
            bottom: 7px !important;
            left: 10px !important;
            right: auto !important;
            z-index: 9999 !important;
        }

        /* Help button: right side of the EXACT SAME footer row */
        #coupHelpBtn {
            position: absolute !important;
            top: auto !important;
            bottom: 7px !important;
            right: 10px !important;
            left: auto !important;
            z-index: 9999 !important;
            background: #ffd700 !important;
            color: #1e4620 !important;
            border: 2px solid #ffffff !important;
            border-radius: 999px !important;
            padding: 6px 16px !important;
            font-size: 14px !important;
            font-weight: 900 !important;
            box-shadow: 0 2px 8px rgba(0,0,0,.4) !important;
        }
    `;
    document.head.appendChild(style);

    function isCoupOpen() {
        return window.chaserGame && String(window.chaserGame.activeGame || "").toLowerCase() === "coup";
    }

   function placeCoupHelpButton() {
    const stage = document.getElementById("activeGameStage");
    const oldBtn = document.getElementById("coupHelpBtn");
    const canvas = document.getElementById("gameCanvasContainer");

    if (!stage || !isCoupOpen()) {
        if (oldBtn) oldBtn.remove();
        return;
    }

    const showingChooseAction = canvas && canvas.innerText.includes("Choose Action");

    if (!showingChooseAction) {
        if (oldBtn) oldBtn.remove();
        return;
    }

    let btn = oldBtn;

    if (!btn) {
        btn = document.createElement("button");
        btn.id = "coupHelpBtn";
        btn.type = "button";
        btn.textContent = "Help";
        btn.onclick = window.toggleCoupHelpSheet;
    }

    if (btn.parentElement !== stage) {
        stage.appendChild(btn);
    }
}

    window.toggleCoupHelpSheet = function () {
       const existing =
          document.getElementById("coupHelpOverlay");
       if (existing) {
          existing.remove();
          return;
       }
        const canvas = document.getElementById("gameCanvasContainer");
        if (!canvas || document.getElementById("coupHelpOverlay")) return;

        canvas.insertAdjacentHTML("beforeend", `
            <div id="coupHelpOverlay" style="
                position:absolute;
                inset:0;
                z-index:99999;
                background:rgba(0,0,0,.88);
                display:flex;
                align-items:center;
                justify-content:center;
                padding:8px;
                box-sizing:border-box;
            ">
                <div style="
                    position:relative;
                    background:#123b16;
                    color:#ffffff;
                    border:3px solid #ffd700;
                    border-radius:14px;
                    width:96%;
                    max-width:330px;
                    overflow:hidden;
                    padding:12px;
                    box-sizing:border-box;
                    font-weight:900;
                ">
                   

                    <div style="font-family:Impact,sans-serif;font-size:27px;text-align:center;margin-bottom:8px;color:#ffd700;">
                        Coup Help
                    </div>

                    <div style="font-size:14px;"><b>👑 Duke</b><br><span style="color:#ffffff;">Tax: take 3 coins</span><br><span style="color:#dc3545;">Blocks Foreign Aid</span></div><hr>
                    <div style="font-size:14px;"><b>🗡️ Assassin</b><br><span style="color:#ffffff;">Pay 3 coins to assassinate</span><br><span style="color:#dc3545;">Blocked by Contessa</span></div><hr>
                    <div style="font-size:14px;"><b>🏴‍☠️ Captain</b><br><span style="color:#ffffff;">Steal 2 coins</span><br><span style="color:#dc3545;">Blocks stealing</span></div><hr>
                    <div style="font-size:14px;"><b>🔄 Ambassador</b><br><span style="color:#ffffff;">Exchange cards</span><br><span style="color:#dc3545;">Blocks stealing</span></div><hr>
                    <div style="font-size:14px;"><b>🛡️ Contessa</b><br><span style="color:#dc3545;">Blocks assassination</span></div>
                </div>
            </div>
        `);
    };

    /* Shrink Ambassador only when Coup card renders */
    const observer = new MutationObserver(() => {
        if (!isCoupOpen()) return;

        placeCoupHelpButton();

        document.querySelectorAll("#gameCanvasContainer div").forEach(el => {
            if (el.textContent && el.textContent.trim() === "Ambassador") {
                el.style.fontSize = "22px";
                el.style.letterSpacing = "-1px";
                el.style.whiteSpace = "nowrap";
            }
        });
    });

    const canvas = document.getElementById("gameCanvasContainer");
    if (canvas) observer.observe(canvas, { childList:true, subtree:true });

    setInterval(placeCoupHelpButton, 500);
})();
/* COUP RESPONSE FLOW PATCH — block/call bluff before resolve */
(function () {
    "use strict";

    const ROLES = {
        Duke: { icon:"👑", action:"Tax: take 3 coins", block:"Blocks Foreign Aid" },
        Assassin: { icon:"🗡️", action:"Pay 3 to assassinate", block:"Blocked by Contessa" },
        Captain: { icon:"🏴‍☠️", action:"Steal 2 coins", block:"Blocks stealing" },
        Ambassador: { icon:"🔄", action:"Exchange cards", block:"Blocks stealing" },
        Contessa: { icon:"🛡️", action:"Blocks Assassin", block:"Blocks assassination" }
    };

    function myId() {
        return window.myId || localStorage.getItem("rider_id") || "local";
    }

    function safe(x) {
        return String(x ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }

    function sendCoup() {
        if (typeof channel !== "undefined" && channel && window.coupState) {
            channel.send({
                type:"broadcast",
                event:"coup-sync-state",
                payload:{
                    ...window.coupState,
                    roomGameId: window.chaserGame?.activeGameId || null
                }
            });
        }
    }

    function shuffle(a) {
        return a.sort(() => Math.random() - 0.5);
    }

    function makeDeck() {
        const deck = [];
        Object.keys(ROLES).forEach(r => deck.push(r, r, r));
        return shuffle(deck);
    }

    function currentPlayer() {
        const s = window.coupState;
        return s.players[s.turn];
    }

    function alivePlayers() {
        return window.coupState.players.filter(p => p.alive);
    }

    function nextTurn() {
        const s = window.coupState;

        if (alivePlayers().length === 1) {
            s.phase = "ended";
            s.pending = null;
            s.log.push("🏆 " + alivePlayers()[0].name + " wins!");
            return;
        }

        let guard = 0;
        do {
            s.turn = (s.turn + 1) % s.players.length;
            guard++;
        } while (!s.players[s.turn].alive && guard < 20);
    }

    function loseCard(player) {
        if (!player || !player.cards.length) return;
        const lost = player.cards.shift();
        player.revealed.push(lost);

        if (!player.cards.length) {
            player.alive = false;
            window.coupState.log.push(player.name + " is out.");
        }
    }

    function replaceClaimCard(player, role) {
        const s = window.coupState;
        const idx = player.cards.indexOf(role);
        if (idx === -1) return;

        player.cards.splice(idx, 1);
        s.deck.push(role);
        shuffle(s.deck);

        if (s.deck.length) {
            player.cards.push(s.deck.pop());
        }
    }

    function requiredResponders(pending) {
        const s = window.coupState;
        const actorId = pending.actorId;

        if (pending.kind === "steal" || pending.kind === "assassinate") {
            return s.players.filter(p => p.alive && p.id === pending.targetId).map(p => p.id);
        }

        if (pending.kind === "foreignAid") {
            return s.players.filter(p => p.alive && p.id !== actorId).map(p => p.id);
        }

        return s.players.filter(p => p.alive && p.id !== actorId).map(p => p.id);
    }

    function blockRolesFor(pending, responderId) {
        if (pending.kind === "foreignAid") return ["Duke"];

        if (pending.kind === "steal" && responderId === pending.targetId) {
            return ["Captain", "Ambassador"];
        }

        if (pending.kind === "assassinate" && responderId === pending.targetId) {
            return ["Contessa"];
        }

        return [];
    }

    function allResponsesIn(pending) {
        const need = requiredResponders(pending);
        return need.every(id => pending.responses && pending.responses[id]);
    }

    function startPending(kind, claim, targetId = null) {
        const actor = currentPlayer();
        const s = window.coupState;

        s.pending = {
            kind,
            claim,
            actorId: actor.id,
            targetId,
            status: "waiting",
            responses: {}
        };

        s.log.push(actor.name + (claim ? " claims " + claim + "." : " starts " + kind + "."));
        sendCoup();
        renderCoupFlow();
    }

    function applyPendingAction() {
        const s = window.coupState;
        const p = s.pending;
        if (!p) return;

        const actor = s.players.find(x => x.id === p.actorId);
        const target = s.players.find(x => x.id === p.targetId);

        if (p.kind === "foreignAid") {
            actor.coins += 2;
            s.log.push(actor.name + " takes Foreign Aid.");
        }

        if (p.kind === "tax") {
            actor.coins += 3;
            s.log.push(actor.name + " takes Tax.");
        }

        if (p.kind === "exchange") {
            if (s.deck.length < 2) s.deck = shuffle(s.deck.concat(s.discard || []));
            const pool = actor.cards.concat([s.deck.pop(), s.deck.pop()].filter(Boolean));
            actor.cards = pool.slice(0, 2);
            s.discard = s.discard || [];
            s.discard.push(...pool.slice(2));
            s.log.push(actor.name + " exchanges cards.");
        }

        if (p.kind === "steal" && target) {
            const n = Math.min(2, target.coins);
            target.coins -= n;
            actor.coins += n;
            s.log.push(actor.name + " steals " + n + " coins from " + target.name + ".");
        }

        if (p.kind === "assassinate" && target) {
            actor.coins -= 3;
            loseCard(target);
            s.log.push(actor.name + " assassinates " + target.name + ".");
        }

        s.pending = null;
        nextTurn();
    }

    window.coupRespondAllow = function () {
        const s = window.coupState;
        const p = s.pending;
        if (!p || p.status !== "waiting") return;

        p.responses[myId()] = { type:"allow" };

        if (allResponsesIn(p)) {
            p.status = "ready";
            s.log.push("No one blocked or challenged. Action can resolve.");
        }

        sendCoup();
        renderCoupFlow();
    };

    window.coupRespondChallenge = function () {
        const s = window.coupState;
        const p = s.pending;
        if (!p || p.status !== "waiting" || !p.claim) return;

        const challenger = s.players.find(x => x.id === myId());
        const actor = s.players.find(x => x.id === p.actorId);

        if (actor.cards.includes(p.claim)) {
            s.log.push(challenger.name + " called bluff and was wrong. " + actor.name + " had " + p.claim + ".");
            loseCard(challenger);
            replaceClaimCard(actor, p.claim);
            applyPendingAction();
        } else {
            s.log.push(challenger.name + " caught the bluff! " + actor.name + " did not have " + p.claim + ".");
            loseCard(actor);
            s.pending = null;
            nextTurn();
        }

        sendCoup();
        renderCoupFlow();
    };

    window.coupRespondBlock = function (role) {
        const s = window.coupState;
        const p = s.pending;
        if (!p || p.status !== "waiting") return;

        const blocker = s.players.find(x => x.id === myId());
        p.status = "blocked";
        p.block = {
            blockerId: blocker.id,
            role
        };

        s.log.push(blocker.name + " blocks with " + role + ".");
        sendCoup();
        renderCoupFlow();
    };

    window.coupAcceptBlock = function () {
        const s = window.coupState;
        const p = s.pending;
        if (!p || p.status !== "blocked") return;
        if (p.actorId !== myId()) return;

        const blocker = s.players.find(x => x.id === p.block.blockerId);
        s.log.push("Block accepted. " + blocker.name + " stops the action.");
        s.pending = null;
        nextTurn();

        sendCoup();
        renderCoupFlow();
    };

    window.coupChallengeBlock = function () {
        const s = window.coupState;
        const p = s.pending;
        if (!p || p.status !== "blocked") return;
        if (p.actorId !== myId()) return;

        const actor = s.players.find(x => x.id === p.actorId);
        const blocker = s.players.find(x => x.id === p.block.blockerId);
        const role = p.block.role;

        if (blocker.cards.includes(role)) {
            s.log.push(actor.name + " challenged the block and was wrong. " + blocker.name + " had " + role + ".");
            loseCard(actor);
            replaceClaimCard(blocker, role);
            s.pending = null;
            nextTurn();
        } else {
            s.log.push(actor.name + " caught the block bluff! " + blocker.name + " did not have " + role + ".");
            loseCard(blocker);
            applyPendingAction();
        }

        sendCoup();
        renderCoupFlow();
    };

    window.coupResolvePendingAction = function () {
        const s = window.coupState;
        const p = s.pending;
        if (!p || p.status !== "ready") return;
        if (p.actorId !== myId()) return;

        applyPendingAction();
        sendCoup();
        renderCoupFlow();
    };

    window.coupIncome = function () {
        const s = window.coupState;
        const p = currentPlayer();
        if (!p || p.id !== myId()) return;

        p.coins += 1;
        s.log.push(p.name + " takes Income.");
        nextTurn();

        sendCoup();
        renderCoupFlow();
    };

    window.coupForeignAid = function () {
        const p = currentPlayer();
        if (!p || p.id !== myId()) return;
        startPending("foreignAid", null);
    };

    window.coupClaimAction = function (kind, claim) {
        const p = currentPlayer();
        if (!p || p.id !== myId()) return;
        startPending(kind, claim);
    };

    window.coupPickTarget = function (type) {
        const s = window.coupState;
        const targets = s.players.filter(p => p.alive && p.id !== myId());
        const canvas = document.getElementById("gameCanvasContainer");

        canvas.innerHTML = `
            <div style="width:100%;height:100%;overflow:auto;padding:14px;box-sizing:border-box;color:white;text-align:center;">
                <div style="font-family:Impact;font-size:32px;color:#ffd700;margin-bottom:10px;">Choose Target</div>
                ${targets.map(p => `
                    <button onclick="coupDoTarget('${type}','${p.id}')"
                        style="width:100%;padding:14px;margin-bottom:8px;border-radius:10px;
                        border:2px solid #ffd700;background:#e2f0d9;color:#1e4620;
                        font-size:22px;font-weight:900;">
                        ${safe(p.name)}
                    </button>
                `).join("")}
                <button onclick="renderCoupFlow()"
                    style="width:100%;padding:12px;border:none;border-radius:10px;
                    background:#555;color:white;font-size:18px;font-weight:900;">Cancel</button>
            </div>
        `;
    };

    window.coupDoTarget = function (type, targetId) {
        const s = window.coupState;
        const actor = currentPlayer();
        const target = s.players.find(p => p.id === targetId);
        if (!actor || actor.id !== myId() || !target) return;

        if (type === "coup") {
            if (actor.coins < 7) return;
            actor.coins -= 7;
            loseCard(target);
            s.log.push(actor.name + " coups " + target.name + ".");
            nextTurn();
            sendCoup();
            renderCoupFlow();
            return;
        }

        if (type === "steal") {
            startPending("steal", "Captain", targetId);
            return;
        }

        if (type === "assassinate") {
            if (actor.coins < 3) return;
            startPending("assassinate", "Assassin", targetId);
        }
    };

    function cardHtml(role) {
        const r = ROLES[role];
        const titleSize = role === "Ambassador" ? "22px" : "28px";

        return `
            <div style="width:43vw;max-width:150px;min-height:180px;background:#f8f3df;color:#111;
                border:4px solid #ffd700;border-radius:14px;padding:10px;box-sizing:border-box;
                box-shadow:0 4px 12px rgba(0,0,0,.45);display:flex;flex-direction:column;
                justify-content:space-between;align-items:center;text-align:center;">
                <div style="font-size:42px;">${r.icon}</div>
                <div style="font-family:Impact;font-size:${titleSize};color:#1e4620;white-space:nowrap;">${role}</div>
                <div style="font-size:15px;font-weight:900;color:#111;">${r.action}</div>
                <div style="font-size:13px;font-weight:900;color:#b00020;">${r.block}</div>
            </div>
        `;
    }

    function pendingPanel(me) {
        const s = window.coupState;
        const p = s.pending;
        if (!p) return "";

        const actor = s.players.find(x => x.id === p.actorId);
        const target = s.players.find(x => x.id === p.targetId);
        const iAmActor = me && me.id === p.actorId;
        const iRespond = me && requiredResponders(p).includes(me.id);
        const already = p.responses && p.responses[myId()];
        const blocks = me ? blockRolesFor(p, me.id) : [];

        if (p.status === "blocked") {
            const blocker = s.players.find(x => x.id === p.block.blockerId);

            return `
                <div style="margin-top:10px;background:#0b2410;border:3px solid #ffd700;border-radius:12px;padding:10px;text-align:center;">
                    <div style="color:#ffd700;font-size:21px;font-weight:900;">${safe(blocker.name)} blocks with ${safe(p.block.role)}</div>
                    ${iAmActor ? `
                        <button onclick="coupChallengeBlock()" style="margin-top:9px;width:100%;padding:11px;border:none;border-radius:10px;background:#dc3545;color:white;font-size:18px;font-weight:900;">
                            CALL BLOCK BLUFF
                        </button>
                        <button onclick="coupAcceptBlock()" style="margin-top:9px;width:100%;padding:11px;border:none;border-radius:10px;background:#777;color:white;font-size:18px;font-weight:900;">
                            ACCEPT BLOCK
                        </button>
                    ` : `<div style="color:#a3cfbb;font-weight:bold;margin-top:8px;">Waiting for ${safe(actor.name)}...</div>`}
                </div>
            `;
        }

        return `
            <div style="margin-top:10px;background:#0b2410;border:3px solid #ffd700;border-radius:12px;padding:10px;text-align:center;">
                <div style="color:#ffd700;font-size:21px;font-weight:900;">
                    ${safe(actor.name)} ${p.claim ? "claims " + safe(p.claim) : "takes Foreign Aid"}
                </div>
                <div style="font-size:15px;font-weight:900;color:#e2f0d9;margin-top:4px;">
                    ${safe(p.kind)}${target ? " → " + safe(target.name) : ""}
                </div>

                ${iAmActor && p.status === "waiting" ? `
                    <div style="color:#a3cfbb;font-weight:bold;margin-top:8px;">Waiting for responses...</div>
                ` : ""}

                ${iAmActor && p.status === "ready" ? `
                    <button onclick="coupResolvePendingAction()" style="margin-top:9px;width:100%;padding:11px;border:none;border-radius:10px;background:#00b050;color:white;font-size:18px;font-weight:900;">
                        RESOLVE ACTION
                    </button>
                ` : ""}

                ${iRespond && !iAmActor && p.status === "waiting" && !already ? `
                    ${p.claim ? `
                        <button onclick="coupRespondChallenge()" style="margin-top:9px;width:100%;padding:11px;border:none;border-radius:10px;background:#dc3545;color:white;font-size:18px;font-weight:900;">
                            CALL BLUFF
                        </button>
                    ` : ""}

                    ${blocks.map(role => `
                        <button onclick="coupRespondBlock('${role}')" style="margin-top:9px;width:100%;padding:11px;border:none;border-radius:10px;background:#ffd700;color:#1e4620;font-size:18px;font-weight:900;">
                            BLOCK WITH ${role.toUpperCase()}
                        </button>
                    `).join("")}

                    <button onclick="coupRespondAllow()" style="margin-top:9px;width:100%;padding:11px;border:none;border-radius:10px;background:#777;color:white;font-size:18px;font-weight:900;">
                        LET IT HAPPEN
                    </button>
                ` : ""}

                ${already ? `<div style="color:#a3cfbb;font-weight:bold;margin-top:8px;">You responded. Waiting...</div>` : ""}
            </div>
        `;
    }

    function actionPanel(me) {
        const mustCoup = me.coins >= 10;

        return `
            <div style="margin-top:10px;background:#123b16;border:2px solid #ffd700;border-radius:12px;padding:10px;">
                <div style="color:#ffd700;font-size:22px;font-weight:900;text-align:center;">Choose Action</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
                    ${!mustCoup ? btn("Income", "+1 coin", "coupIncome()") : ""}
                    ${!mustCoup ? btn("Foreign Aid", "+2 coins", "coupForeignAid()") : ""}
                    ${!mustCoup ? btn("Tax", "Claim Duke", "coupClaimAction('tax','Duke')") : ""}
                    ${!mustCoup ? btn("Exchange", "Claim Ambassador", "coupClaimAction('exchange','Ambassador')") : ""}
                    ${!mustCoup ? btn("Steal", "Claim Captain", "coupPickTarget('steal')") : ""}
                    ${!mustCoup ? btn("Assassinate", "Claim Assassin", "coupPickTarget('assassinate')") : ""}
                    ${btn("Coup", "Pay 7", "coupPickTarget('coup')")}
                </div>
            </div>
        `;
    }

    function btn(title, sub, fn) {
        return `
            <button onclick="${fn}" style="background:#e2f0d9;color:#1e4620;border:2px solid #ffd700;
                border-radius:10px;padding:10px 6px;font-weight:900;min-height:64px;">
                <div style="font-family:Impact;font-size:22px;">${title}</div>
                <div style="font-size:14px;">${sub}</div>
            </button>
        `;
    }

    window.renderCoupFlow = function () {
        const s = window.coupState;
        const canvas = document.getElementById("gameCanvasContainer");
        if (!canvas || !s) return;

        const me = s.players.find(p => p.id === myId());
        const active = currentPlayer();
        const isMyTurn = active && active.id === myId();

        canvas.innerHTML = `
            <div style="width:100%;height:100%;overflow:auto;padding:8px;box-sizing:border-box;color:white;font-family:Arial;">
                ${s.players.map((p, i) => `
                    <div style="display:flex;justify-content:space-between;align-items:center;background:${p.alive ? "#e2f0d9" : "#555"};
                        color:${p.alive ? "#1e4620" : "#fff"};border:${i === s.turn ? "4px solid #ff0000" : "2px solid transparent"};
                        border-radius:9px;padding:8px;margin-bottom:6px;font-weight:900;">
                        <div>${i === s.turn ? "▶ " : ""}${safe(p.name)}</div>
                        <div>🪙 ${p.coins}</div>
                        <div>Hidden: ${p.cards.length} | Out: ${safe(p.revealed.join(", ") || "None")}</div>
                    </div>
                `).join("")}

                ${me ? `
    <div class="coup-cards-header-row">
        <div class="coup-cards-title">YOUR CARDS</div>
        <button id="coupInlineHelpBtn" type="button" onclick="window.toggleCoupHelpSheet ? window.toggleCoupHelpSheet() : window.showCoupHelpSheet()">
            Help
        </button>
    </div>

    <div class="coup-player-cards-row">
        ${me.cards.map(cardHtml).join("")}
    </div>
` : ""}

                ${s.pending ? pendingPanel(me) : ""}
                ${!s.pending && isMyTurn && me && me.alive && s.phase !== "ended" ? actionPanel(me) : ""}

                <div style="margin-top:10px;background:rgba(0,0,0,.35);border-radius:8px;padding:8px;">
                    <div style="color:#ffd700;font-size:18px;font-weight:900;text-align:center;">Log</div>
                    ${s.log.slice(-6).reverse().map(l => `<div style="font-size:15px;">• ${safe(l)}</div>`).join("")}
                </div>
            </div>
        `;
    };

    window.initCoupGame = function () {
        const players = (window.chaserGame && window.chaserGame.players) || [];
        const hostId = window.chaserGame && window.chaserGame.hostId;
        const amHost = hostId === myId();

        if (amHost || !window.coupState) {
            const deck = makeDeck();

            window.coupState = {
                phase:"playing",
                hostId,
                turn:0,
                deck,
                discard:[],
                pending:null,
                log:["Coup started."],
                players:players.map(p => ({
                    id:p.id,
                    name:p.name,
                    seat:p.seat,
                    coins:2,
                    cards:[deck.pop(), deck.pop()],
                    revealed:[],
                    alive:true
                }))
            };

            sendCoup();
        }

        renderCoupFlow();
    };

    window.handleIncomingCoupSync = function (state) {
        if (!state) return;
        if (state.roomGameId && window.chaserGame?.activeGameId && state.roomGameId !== window.chaserGame.activeGameId) return;

        window.coupState = state;
        renderCoupFlow();
    };
})();
/* ============================================================
   CHASER PATCH — Lobby Heartbeat
   Re-announces open waiting lobby so late joiners can see it
   ============================================================ */
(function () {
    "use strict";

    if (window.__chaserLobbyHeartbeatPatchInstalled) return;
    window.__chaserLobbyHeartbeatPatchInstalled = true;

    setInterval(() => {
        const g = window.chaserGame;
        if (!g || !g.currentLobby) return;
        if (!g.players || !g.expectedPlayers) return;
        if (g.hostId !== (window.myId || localStorage.getItem("rider_id"))) return;
        if (g.players.length >= g.expectedPlayers) return;

        if (typeof sendGameEvent === "function") {
            sendGameEvent("chaser-game-lobby-open", {
                gameName: g.currentLobby.gameName,
                expectedPlayers: g.expectedPlayers,
                players: g.players,
                hostId: g.hostId
            });
        }
    }, 4000);
})();
/* COUP STYLE FIX — supports the new YOUR CARDS + Help row */
(function () {
    if (window.__coupInlineHelpStyleFix) return;
    window.__coupInlineHelpStyleFix = true;

    const style = document.createElement("style");
    style.innerHTML = `
        #coupHelpBtn {
            display:none !important;
        }

        .coup-cards-header-row {
            width:100% !important;
            max-width:520px !important;
            margin:6px auto 8px auto !important;
            display:flex !important;
            align-items:center !important;
            justify-content:space-between !important;
            gap:10px !important;
            box-sizing:border-box !important;
        }

        .coup-cards-title {
            color:#ffd700 !important;
            font-family:Impact,"Arial Black",sans-serif !important;
            font-size:25px !important;
            font-weight:900 !important;
            letter-spacing:1px !important;
            text-align:left !important;
            white-space:nowrap !important;
            line-height:1 !important;
        }

        #coupInlineHelpBtn {
            width:78px !important;
            min-width:78px !important;
            height:30px !important;
            border-radius:999px !important;
            border:2px solid #ffffff !important;
            background:#ffd700 !important;
            color:#1e4620 !important;
            font-size:13px !important;
            font-weight:900 !important;
            box-shadow:0 3px 9px rgba(0,0,0,.4) !important;
        }

        .coup-player-cards-row {
            display:grid !important;
            grid-template-columns:repeat(2, minmax(0, 1fr)) !important;
            gap:8px !important;
            width:100% !important;
            max-width:520px !important;
            margin:0 auto 12px auto !important;
            box-sizing:border-box !important;
        }

        .coup-player-cards-row > div {
            width:100% !important;
            max-width:none !important;
            min-width:0 !important;
            box-sizing:border-box !important;
            padding-left:4px !important;
            padding-right:4px !important;
        }

        @media (max-width:430px), (max-height:740px) {
            .coup-cards-title {
                font-size:23px !important;
            }

            #coupInlineHelpBtn {
                width:72px !important;
                min-width:72px !important;
                height:28px !important;
                font-size:12px !important;
            }

            .coup-player-cards-row {
                gap:7px !important;
            }
        }
    `;
    document.head.appendChild(style);
})();
/* COUP HELP FIX v4 — compact blue help cheat sheet */
(function () {
    if (window.__coupHelpCompactBlueV4) return;
    window.__coupHelpCompactBlueV4 = true;

    const style = document.createElement("style");
    style.innerHTML = `
        #coupHelpBtn {
            display:none !important;
        }

        #coupInlineHelpBtn,
        .coup-cards-header-row button {
            background:#1d4ed8 !important;
            color:#ffffff !important;
            border:2px solid #ffffff !important;
            border-radius:999px !important;
            width:78px !important;
            min-width:78px !important;
            height:30px !important;
            padding:0 !important;
            margin:0 !important;
            font-size:13px !important;
            font-weight:900 !important;
            line-height:1 !important;
            text-align:center !important;
            display:flex !important;
            align-items:center !important;
            justify-content:center !important;
            box-sizing:border-box !important;
            box-shadow:0 3px 9px rgba(0,0,0,.4) !important;
        }

        #gameCanvasContainer {
            position:relative !important;
        }

        #coupHelpOverlay {
            position:absolute !important;
            left:0 !important;
            right:0 !important;
            top:0 !important;
            bottom:58px !important;
            background:rgba(0,0,0,.72) !important;
            z-index:10080 !important;
            border-radius:22px 22px 0 0 !important;
            padding:8px 14px 0 14px !important;
            box-sizing:border-box !important;
            overflow:hidden !important;
            display:flex !important;
            flex-direction:column !important;
        }

        #coupHelpCloseBtn {
            position:absolute !important;
            top:8px !important;
            right:8px !important;
            width:40px !important;
            height:40px !important;
            border-radius:999px !important;
            border:2px solid #ffffff !important;
            background:#1d4ed8 !important;
            color:#ffffff !important;
            font-size:22px !important;
            font-weight:900 !important;
            line-height:1 !important;
            display:flex !important;
            align-items:center !important;
            justify-content:center !important;
            z-index:10090 !important;
            box-shadow:0 4px 12px rgba(0,0,0,.55) !important;
        }

        .coup-help-list {
            flex:1 1 auto !important;
            min-height:0 !important;
            background:#eaf4df !important;
            border:4px solid #ffd700 !important;
            border-radius:18px !important;
            padding:42px 10px 10px 10px !important;
            box-sizing:border-box !important;
            overflow-y:auto !important;
        }

        .coup-help-role {
            background:#ffffff !important;
            border:2px solid #1e4620 !important;
            border-radius:12px !important;
            margin:6px 0 !important;
            padding:7px 6px !important;
            color:#1e4620 !important;
            text-align:center !important;
            font-weight:900 !important;
            box-sizing:border-box !important;
        }

        .coup-help-role-name {
            font-size:23px !important;
            line-height:1.05 !important;
        }

        .coup-help-role-action {
            font-size:17px !important;
            line-height:1.1 !important;
            margin-top:3px !important;
        }

        .coup-help-role-block {
            color:#a6002b !important;
            font-size:17px !important;
            line-height:1.1 !important;
            margin-top:3px !important;
        }

        @media (max-width:430px), (max-height:740px) {
            .coup-help-list {
                padding:40px 8px 8px 8px !important;
            }

            .coup-help-role {
                margin:5px 0 !important;
                padding:6px 5px !important;
            }

            .coup-help-role-name {
                font-size:21px !important;
            }

            .coup-help-role-action,
            .coup-help-role-block {
                font-size:16px !important;
            }
        }
    `;
    document.head.appendChild(style);

    function closeCoupHelp() {
        const overlay = document.getElementById("coupHelpOverlay");
        if (overlay) overlay.remove();
    }

    function openCoupHelp() {
        closeCoupHelp();

        const canvas = document.getElementById("gameCanvasContainer");
        if (!canvas) return;

        const overlay = document.createElement("div");
        overlay.id = "coupHelpOverlay";

        overlay.innerHTML = `
            <button id="coupHelpCloseBtn" type="button">×</button>

            <div class="coup-help-list">
                <div class="coup-help-role">
                    <div class="coup-help-role-name">👑 Duke</div>
                    <div class="coup-help-role-action">Tax: take 3 coins</div>
                    <div class="coup-help-role-block">Blocks Foreign Aid</div>
                </div>

                <div class="coup-help-role">
                    <div class="coup-help-role-name">🗡️ Assassin</div>
                    <div class="coup-help-role-action">Pay 3 to assassinate</div>
                    <div class="coup-help-role-block">Blocked by Contessa</div>
                </div>

                <div class="coup-help-role">
                    <div class="coup-help-role-name">🏴‍☠️ Captain</div>
                    <div class="coup-help-role-action">Steal 2 coins</div>
                    <div class="coup-help-role-block">Blocked by Captain/Ambassador</div>
                </div>

                <div class="coup-help-role">
                    <div class="coup-help-role-name">🔁 Ambassador</div>
                    <div class="coup-help-role-action">Exchange cards</div>
                    <div class="coup-help-role-block">Blocks stealing</div>
                </div>

                <div class="coup-help-role">
                    <div class="coup-help-role-name">🛡️ Contessa</div>
                    <div class="coup-help-role-action">No action</div>
                    <div class="coup-help-role-block">Blocks Assassin</div>
                </div>
            </div>
        `;

        canvas.appendChild(overlay);

        const closeBtn = document.getElementById("coupHelpCloseBtn");
        if (closeBtn) closeBtn.onclick = closeCoupHelp;
    }

    function toggleCoupHelp(e) {
        if (e) e.stopPropagation();

        if (document.getElementById("coupHelpOverlay")) {
            closeCoupHelp();
        } else {
            openCoupHelp();
        }
    }

    window.showCoupHelpSheet = openCoupHelp;
    window.toggleCoupHelpSheet = toggleCoupHelp;

    function wireHelpButton() {
        const helpBtn =
            document.getElementById("coupInlineHelpBtn") ||
            document.querySelector(".coup-cards-header-row button");

        if (helpBtn) {
            helpBtn.textContent = "Help";
            helpBtn.onclick = toggleCoupHelp;
        }
    }

    setInterval(wireHelpButton, 200);
})();
/* CHASER PATCH — Uno hand overlap + consistent hand spacing */
(function () {
if (document.getElementById("uno-hand-overlap-fix-style")) return;

const style = document.createElement("style");
style.id = "uno-hand-overlap-fix-style";
style.innerHTML = `
    #uno-hand-container,
    .uno-top-scroll {
        gap:0 !important;
        padding-left:22px !important;
        padding-right:18px !important;
        box-sizing:border-box !important;
    }

    #uno-hand-container .uno-card,
    .uno-top-scroll .uno-card {
        flex:0 0 auto !important;
    }

    #uno-hand-container .uno-card + .uno-card,
    .uno-top-scroll .uno-card + .uno-card {
        margin-left:-10px !important;
    }

    @media(max-width:390px) {
        #uno-hand-container .uno-card + .uno-card,
        .uno-top-scroll .uno-card + .uno-card {
            margin-left:-12px !important;
        }
    }
`;

document.head.appendChild(style);

})();

/* CHASER PATCH — FINAL UNO VISUAL FIX V2
Paste at the very bottom of games.js.

Fixes:

- First Uno screen redraws with the same layout as the active/play screen
- Smaller Wild text so it fits on the discard/play pile
- All player pillboxes always visible
- Current turn pill highlighted
- Dark green Uno board/hand area stops shrinking
- Hand auto-scrolls to the newest/right-side cards
- Bigger draw/play piles
  */
  (function () {
  window.__chaserFinalUnoVisualFixV2Installed = true;

function esc(v) {
    return String(v ?? "")
        .replace(/&/g, "&" + "amp;")
        .replace(/</g, "&" + "lt;")
        .replace(/>/g, "&" + "gt;")
        .replace(/"/g, "&" + "quot;")
        .replace(/'/g, "&" + "#039;");
}

function unoHex(color) {
    if (typeof window.unoColorHex === "function") {
        return window.unoColorHex(color);
    }

    const map = {
        Red: "#e63946",
        Yellow: "#d6c313",
        Green: "#00a651",
        Blue: "#00aeef",
        Wild: "#222222",
        Back: "#111111"
    };

    return map[color] || "#222222";
}

function scrollUnoHandRight() {
    const handContainer = document.getElementById("uno-hand-container");

    if (!handContainer) return;

    handContainer.scrollLeft = handContainer.scrollWidth;

    if (typeof handContainer.scrollTo === "function") {
        handContainer.scrollTo({
            left: handContainer.scrollWidth,
            behavior: "auto"
        });
    }
}

function forceUnoFirstRender() {
    setTimeout(function () {
        if (window.unoState && typeof window.renderUnoLayout === "function") {
            window.renderUnoLayout();
        }
    }, 0);

    setTimeout(function () {
        if (window.unoState && typeof window.renderUnoLayout === "function") {
            window.renderUnoLayout();
        }
    }, 120);

    setTimeout(function () {
        if (window.unoState && typeof window.renderUnoLayout === "function") {
            window.renderUnoLayout();
        }
    }, 260);
}

window.renderUnoCard = function(card, onclick, mode = "normal", faded = false) {
    if (!card) return "";

    let width = 54;
    let height = 80;
    let fontSize = 33;

    if (mode === "large" || mode === "draw" || mode === "pile") {
        width = 112;
        height = 158;
        fontSize = 62;
    } else if (mode === "small") {
        width = 54;
        height = 80;
        fontSize = 33;
    }

    let bg = "#202020";
    let content = "";
    let extraClass = "";
    const clickAttr = onclick ? "onclick=\"" + onclick + "\"" : "";
    const fadedStyle = faded ? "opacity:.48;filter:saturate(.65);" : "";

    if (card.color === "Back") {
        bg = "#111111";
        extraClass = " uno-back-card";

        const backFont = (mode === "large" || mode === "draw" || mode === "pile") ? 34 : 21;

        content =
            "<div class=\"uno-back-word\" style=\"font-size:" + backFont + "px;letter-spacing:-2px;max-width:100%;overflow:hidden;white-space:nowrap;line-height:1;\">" +
                "UNO" +
            "</div>";
    } else if (card.color === "Wild" && (card.value === "Wild" || card.value === "+4")) {
        bg = "conic-gradient(#e63946 0deg 90deg, #ffb703 90deg 180deg, #00b0ff 180deg 270deg, #00b050 270deg 360deg)";

        const wildFont = (mode === "large" || mode === "draw" || mode === "pile") ? 22 : 14;

        content =
            "<div style=\"font-size:" + wildFont + "px;line-height:1.02;font-weight:900;text-shadow:0 2px 5px rgba(0,0,0,.7);white-space:normal;max-width:100%;\">" +
                (card.value === "+4" ? "Wild<br>+4" : "Wild") +
            "</div>";
    } else {
        bg = unoHex(card.color);

        let displayVal = esc(card.value);

        if (displayVal === "Reverse") displayVal = "↺";
        if (displayVal === "Skip") displayVal = "⊘";

        if (card.value === "Wild" || card.value === "+4") {
            const wildFont = (mode === "large" || mode === "draw" || mode === "pile") ? 22 : 14;

            content =
                "<div style=\"font-size:" + wildFont + "px;line-height:1.02;font-weight:900;text-shadow:0 2px 5px rgba(0,0,0,.7);white-space:normal;max-width:100%;\">" +
                    (card.value === "+4" ? "Wild<br>+4" : "Wild") +
                "</div>";
        } else {
            content =
                "<div style=\"font-size:" + fontSize + "px;line-height:1;font-weight:900;text-shadow:0 3px 6px rgba(0,0,0,.35);\">" +
                    displayVal +
                "</div>";
        }
    }

    return (
        "<div class=\"uno-card uno-card-" + esc(mode) + extraClass + "\" " + clickAttr + " style=\"" +
            "width:" + width + "px;" +
            "height:" + height + "px;" +
            "min-width:" + width + "px;" +
            "border-radius:11px;" +
            "border:3px solid #ffffff;" +
            "background:" + bg + ";" +
            "color:#ffffff;" +
            "display:flex;" +
            "align-items:center;" +
            "justify-content:center;" +
            "font-family:Arial,sans-serif;" +
            "font-weight:900;" +
            "box-shadow:0 4px 9px rgba(0,0,0,.35);" +
            "position:relative;" +
            "box-sizing:border-box;" +
            "overflow:hidden;" +
            "text-align:center;" +
            "flex:0 0 auto;" +
            fadedStyle +
        "\">" +
            "<div style=\"position:absolute;left:-12%;top:18%;width:124%;height:47%;border-radius:50%;background:rgba(255,255,255,.13);transform:rotate(-9deg);\"></div>" +
            "<div style=\"position:relative;z-index:2;max-width:100%;box-sizing:border-box;padding:0 4px;\">" +
                content +
            "</div>" +
        "</div>"
    );
};

window.renderUnoLayout = function() {
    const s = window.unoState;
    if (!s) return;

    const mySeat = window.chaserGame && window.chaserGame.mySeat !== undefined
        ? window.chaserGame.mySeat
        : 0;

    const hand = s.hands && s.hands[mySeat] ? s.hands[mySeat] : [];
    const discard = s.discard || { color: "Red", value: "0" };
    const myTurn = s.turn === mySeat && !s.winner;
    const activeName = s.players && s.players[s.turn] ? s.players[s.turn].name : "Player " + (Number(s.turn || 0) + 1);

    const opponents = (s.players || []).map(function (p, idx) {
        const cardCount = s.hands && s.hands[idx] ? s.hands[idx].length : 0;
        const isActive = idx === s.turn && !s.winner;

        return (
            "<div class=\"uno-opponent-pill " + (isActive ? "active" : "") + "\">" +
                esc(p.name || ("Player " + (idx + 1))) + ": " + cardCount +
            "</div>"
        );
    }).join("");

    let handHtml = "";

    hand.forEach(function (card, idx) {
        const playable = myTurn && (
            card.color === discard.color ||
            card.value === discard.value ||
            card.color === "Wild" ||
            discard.color === "Wild" ||
            card.value === "Wild" ||
            card.value === "+4"
        );

        handHtml += window.renderUnoCard(card, "window.unoPlayCard(" + idx + ")", "small", !playable);
    });

    let colorPickerHtml = "";

    if (s.wildChoosingSeat === mySeat) {
        colorPickerHtml =
            "<div class=\"uno-color-picker\">" +
                ["Red", "Yellow", "Green", "Blue"].map(function (c) {
                    return "<button onclick=\"window.unoPickWildColor('" + c + "')\" style=\"background:" + unoHex(c) + ";\" type=\"button\">" + c + "</button>";
                }).join("") +
            "</div>";
    }

    const html = [
        "<style>",
            ".uno-wrap{height:100%;min-height:100%;overflow:hidden;padding:8px 12px 84px;box-sizing:border-box;font-family:Arial,sans-serif;color:#e2f0d9;background:#06260d;display:flex;flex-direction:column;align-items:center;}",
            ".uno-turn-title{font-size:34px;font-weight:900;letter-spacing:6px;color:#00b050;margin:0 0 8px;text-align:center;text-transform:uppercase;line-height:1.05;}",
            ".uno-opponents{min-height:28px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:0 auto 8px;max-width:100%;}",
            ".uno-opponent-pill{background:#e2f0d9;color:#1e4620;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:900;border:2px solid transparent;box-sizing:border-box;}",
            ".uno-opponent-pill.active{background:#ffd700!important;color:#1e4620!important;border:2px solid #ffffff!important;}",
            ".uno-message{color:#ffd700;font-size:21px;font-weight:900;text-align:center;min-height:28px;margin:0 auto 8px;line-height:1.15;}",
            ".uno-pile-row{display:flex;align-items:flex-start;justify-content:center;gap:34px;margin:0 auto 15px;width:100%;}",
            ".uno-pile-box{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;}",
            ".uno-pile-label{color:#b7d8c0;font-size:18px;font-weight:900;letter-spacing:1px;margin-bottom:6px;text-transform:uppercase;}",
            ".uno-color-picker{display:flex;gap:7px;justify-content:center;flex-wrap:wrap;margin:-6px auto 8px;}",
            ".uno-color-picker button{border:2px solid #ffffff;border-radius:999px;color:#ffffff;font-size:12px;font-weight:900;padding:7px 10px;text-shadow:0 2px 4px rgba(0,0,0,.45);}",
            ".uno-hand-zone{width:100%;min-height:112px;margin-top:0;display:flex;align-items:flex-start;}",
            "#uno-hand-container{display:flex;gap:7px!important;justify-content:flex-start;align-items:center;overflow-x:auto;overflow-y:hidden;width:100%;min-height:98px;padding:0 9px 10px!important;box-sizing:border-box;scrollbar-width:thin;}",
            "#uno-hand-container .uno-card{margin-left:0!important;}",
            "#uno-hand-container .uno-card + .uno-card{margin-left:0!important;}",
            "#uno-hand-container::-webkit-scrollbar{height:9px;}",
            "#uno-hand-container::-webkit-scrollbar-track{background:rgba(0,0,0,.35);border-radius:999px;}",
            "#uno-hand-container::-webkit-scrollbar-thumb{background:#ffd700;border-radius:999px;}",
            "@media(max-width:390px){",
                ".uno-wrap{padding:7px 10px 84px;}",
                ".uno-turn-title{font-size:30px;margin-bottom:7px;}",
                ".uno-message{font-size:20px;margin-bottom:7px;}",
                ".uno-pile-row{gap:26px;margin-bottom:14px;}",
                ".uno-pile-label{font-size:17px;}",
                "#uno-hand-container{gap:6px!important;padding-left:8px!important;padding-right:8px!important;}",
            "}",
        "</style>",

        "<div class=\"uno-wrap\">",
            "<div class=\"uno-turn-title\">",
                s.winner ? esc(s.winner.name) + " WINS!" : myTurn ? "YOUR TURN" : "TURN: " + esc(activeName).toUpperCase(),
            "</div>",

            "<div class=\"uno-opponents\">", opponents, "</div>",
            "<div class=\"uno-message\">", esc(s.message || ""), "</div>",

            "<div class=\"uno-pile-row\">",
                "<div class=\"uno-pile-box\">",
                    "<div class=\"uno-pile-label\">Draw</div>",
                    window.renderUnoCard({ color: "Back", value: "UNO" }, "window.unoDrawCard()", "pile", !myTurn),
                "</div>",
                "<div class=\"uno-pile-box\">",
                    "<div class=\"uno-pile-label\">Play</div>",
                    window.renderUnoCard(discard, "", "pile"),
                "</div>",
            "</div>",

            colorPickerHtml,

            "<div class=\"uno-hand-zone\">",
                "<div id=\"uno-hand-container\" class=\"uno-top-scroll\">",
                    handHtml,
                "</div>",
            "</div>",
        "</div>"
    ].join("");

    const canvas = document.getElementById("gameCanvasContainer");

    if (canvas) {
        canvas.innerHTML = html;

        setTimeout(scrollUnoHandRight, 0);
        setTimeout(scrollUnoHandRight, 80);
        setTimeout(scrollUnoHandRight, 180);
    }
};

if (typeof window.initUnoGame === "function" && !window.__unoInitWrappedForFinalPatchV2) {
    window.__unoInitWrappedForFinalPatchV2 = true;

    const oldInitUnoGame = window.initUnoGame;

    window.initUnoGame = function () {
        oldInitUnoGame.apply(this, arguments);
        forceUnoFirstRender();
    };
}

if (typeof window.startUnoFromLobby === "function" && !window.__unoLobbyStartWrappedForFinalPatchV2) {
    window.__unoLobbyStartWrappedForFinalPatchV2 = true;

    const oldStartUnoFromLobby = window.startUnoFromLobby;

    window.startUnoFromLobby = function () {
        oldStartUnoFromLobby.apply(this, arguments);
        forceUnoFirstRender();
    };
}

if (typeof window.startUnoGame === "function" && !window.__unoStartWrappedForFinalPatchV2) {
    window.__unoStartWrappedForFinalPatchV2 = true;

    const oldStartUnoGame = window.startUnoGame;

    window.startUnoGame = function () {
        oldStartUnoGame.apply(this, arguments);
        forceUnoFirstRender();
    };
}

if (typeof window.launchGameEngine === "function" && !window.__unoLaunchWrappedForFinalPatchV2) {
    window.__unoLaunchWrappedForFinalPatchV2 = true;

    const oldLaunchGameEngine = window.launchGameEngine;

    window.launchGameEngine = function (gameName, icon) {
        const result = oldLaunchGameEngine.apply(this, arguments);

        if (String(gameName || "").toLowerCase().includes("uno")) {
            forceUnoFirstRender();
        }

        return result;
    };
}

})();

/* CHASER PATCH — Force Battle Uno first screen to use final Uno layout */
(function () {
function forceUnoFirstRenderAgain() {
setTimeout(function () {
if (window.unoState && typeof window.renderUnoLayout === "function") {
window.renderUnoLayout();
}
}, 0);

    setTimeout(function () {
        if (window.unoState && typeof window.renderUnoLayout === "function") {
            window.renderUnoLayout();
        }
    }, 150);

    setTimeout(function () {
        if (window.unoState && typeof window.renderUnoLayout === "function") {
            window.renderUnoLayout();
        }
    }, 350);
}

if (typeof window.initChaserUnoGame === "function" && !window.__finalUnoInitChaserWrapped) {
    window.__finalUnoInitChaserWrapped = true;

    const oldInitChaserUnoGame = window.initChaserUnoGame;

    window.initChaserUnoGame = function () {
        const result = oldInitChaserUnoGame.apply(this, arguments);
        forceUnoFirstRenderAgain();
        return result;
    };
}

if (typeof window.startChaserLobbyGame === "function" && !window.__finalUnoLobbyStartWrapped) {
    window.__finalUnoLobbyStartWrapped = true;

    const oldStartChaserLobbyGame = window.startChaserLobbyGame;

    window.startChaserLobbyGame = function () {
        const result = oldStartChaserLobbyGame.apply(this, arguments);
        forceUnoFirstRenderAgain();
        return result;
    };
}

})();

/* CHASER PATCH — Global game session cleanup guard
Put at the very bottom of games.js.

Fixes:

- Old games repainting over new games
- Trivia popping back up after closing
- Uno staying stuck over other games
- Old game timers firing after a different game opens
  */
  (function () {
  if (window.__chaserGlobalGameSessionGuardInstalled) return;
  window.__chaserGlobalGameSessionGuardInstalled = true;

const nativeSetTimeout = window.setTimeout.bind(window);
const nativeSetInterval = window.setInterval.bind(window);
const nativeClearTimeout = window.clearTimeout.bind(window);
const nativeClearInterval = window.clearInterval.bind(window);

let currentSessionId = 0;
let currentGameName = "";
let launchDepth = 0;

const sessionTimers = new Map();

function getStage() {
    return document.getElementById("activeGameStage");
}

function gameStageIsOpen() {
    const stage = getStage();
    return !!(stage && stage.classList.contains("open"));
}

function cleanGameName(name) {
    return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getActiveGameName() {
    const fromChaser =
        window.chaserGame &&
        (window.chaserGame.activeGame || window.chaserGame.activeGameName);

    const fromTitle =
        window.activeGameLabelTitle &&
        window.activeGameLabelTitle.innerText;

    return String(fromChaser || fromTitle || currentGameName || "");
}

function trackTimer(type, id, sessionId) {
    if (!sessionTimers.has(sessionId)) {
        sessionTimers.set(sessionId, {
            timeouts:new Set(),
            intervals:new Set()
        });
    }

    const bucket = sessionTimers.get(sessionId);

    if (type === "timeout") {
        bucket.timeouts.add(id);
    } else {
        bucket.intervals.add(id);
    }
}

function untrackTimer(type, id, sessionId) {
    const bucket = sessionTimers.get(sessionId);
    if (!bucket) return;

    if (type === "timeout") {
        bucket.timeouts.delete(id);
    } else {
        bucket.intervals.delete(id);
    }
}

function clearSessionTimers(sessionId) {
    const bucket = sessionTimers.get(sessionId);
    if (!bucket) return;

    bucket.timeouts.forEach(id => nativeClearTimeout(id));
    bucket.intervals.forEach(id => nativeClearInterval(id));

    bucket.timeouts.clear();
    bucket.intervals.clear();

    sessionTimers.delete(sessionId);
}

function clearOldSessionsExcept(sessionIdToKeep) {
    Array.from(sessionTimers.keys()).forEach(sessionId => {
        if (sessionId !== sessionIdToKeep) {
            clearSessionTimers(sessionId);
        }
    });
}

function clearAllGameSessions() {
    Array.from(sessionTimers.keys()).forEach(sessionId => {
        clearSessionTimers(sessionId);
    });
}

function beginGameSession(gameName) {
    currentSessionId++;
    currentGameName = String(gameName || "");

    window.__chaserCurrentGameSessionId = currentSessionId;
    window.__chaserCurrentGameName = currentGameName;

    clearOldSessionsExcept(currentSessionId);
}

function endGameSession() {
    currentSessionId++;
    currentGameName = "";

    window.__chaserCurrentGameSessionId = currentSessionId;
    window.__chaserCurrentGameName = "";

    clearAllGameSessions();
}

window.__chaserBeginGameSession = beginGameSession;
window.__chaserEndGameSession = endGameSession;

window.setTimeout = function (fn, delay, ...args) {
    const sessionAtCreate = currentSessionId;
    const shouldTrack =
        sessionAtCreate > 0 &&
        (launchDepth > 0 || gameStageIsOpen());

    let id = null;

    const wrapped = function (...callbackArgs) {
        if (shouldTrack) {
            untrackTimer("timeout", id, sessionAtCreate);

            if (sessionAtCreate !== currentSessionId) {
                return;
            }
        }

        if (typeof fn === "function") {
            return fn.apply(this, callbackArgs);
        }
    };

    id = nativeSetTimeout(wrapped, delay, ...args);

    if (shouldTrack) {
        trackTimer("timeout", id, sessionAtCreate);
    }

    return id;
};

window.setInterval = function (fn, delay, ...args) {
    const sessionAtCreate = currentSessionId;
    const shouldTrack =
        sessionAtCreate > 0 &&
        (launchDepth > 0 || gameStageIsOpen());

    let id = null;

    const wrapped = function (...callbackArgs) {
        if (shouldTrack && sessionAtCreate !== currentSessionId) {
            nativeClearInterval(id);
            untrackTimer("interval", id, sessionAtCreate);
            return;
        }

        if (typeof fn === "function") {
            return fn.apply(this, callbackArgs);
        }
    };

    id = nativeSetInterval(wrapped, delay, ...args);

    if (shouldTrack) {
        trackTimer("interval", id, sessionAtCreate);
    }

    return id;
};

window.clearTimeout = function (id) {
    sessionTimers.forEach((bucket, sessionId) => {
        bucket.timeouts.delete(id);
    });

    return nativeClearTimeout(id);
};

window.clearInterval = function (id) {
    sessionTimers.forEach((bucket, sessionId) => {
        bucket.intervals.delete(id);
    });

    return nativeClearInterval(id);
};

function wrapLaunchGameEngine() {
    if (typeof window.launchGameEngine !== "function") return;
    if (window.launchGameEngine.__chaserSessionGuarded) return;

    const oldLaunchGameEngine = window.launchGameEngine;

    window.launchGameEngine = function (gameName, icon) {
        beginGameSession(gameName);

        launchDepth++;

        try {
            return oldLaunchGameEngine.apply(this, arguments);
        } finally {
            launchDepth--;
            clearOldSessionsExcept(currentSessionId);
        }
    };

    window.launchGameEngine.__chaserSessionGuarded = true;
}

function wrapCleanupRunningGameEngine() {
    if (typeof window.cleanupRunningGameEngine !== "function") return;
    if (window.cleanupRunningGameEngine.__chaserSessionGuarded) return;

    const oldCleanupRunningGameEngine = window.cleanupRunningGameEngine;

    window.cleanupRunningGameEngine = function () {
        if (launchDepth === 0) {
            endGameSession();
        } else {
            clearOldSessionsExcept(currentSessionId);
        }

        return oldCleanupRunningGameEngine.apply(this, arguments);
    };

    window.cleanupRunningGameEngine.__chaserSessionGuarded = true;
}

function wrapMasterExit() {
    if (typeof window.chaserMasterExitSequence !== "function") return;
    if (window.chaserMasterExitSequence.__chaserSessionGuarded) return;

    const oldExit = window.chaserMasterExitSequence;

    window.chaserMasterExitSequence = function () {
        endGameSession();
        return oldExit.apply(this, arguments);
    };

    window.chaserMasterExitSequence.__chaserSessionGuarded = true;
}

function gameMatchesActiveGame(gameKey) {
    const active = cleanGameName(getActiveGameName());
    const key = cleanGameName(gameKey);

    if (!active || !key) return false;

    if (key === "uno") return active.includes("uno");
    if (key === "trivia") return active.includes("trivia");
    if (key === "battleship") return active.includes("battleship");
    if (key === "checkers") return active.includes("checkers");
    if (key === "sequence") return active.includes("sequence");
    if (key === "coup") return active.includes("coup");
    if (key === "yahtzee") return active.includes("yahtzee");
    if (key === "scrabble") return active.includes("scrabble");
    if (key === "cribbage") return active.includes("cribbage");
    if (key === "texasholdem") return active.includes("texasholdem") || active.includes("holdem");

    return active.includes(key);
}

function wrapSyncHandler(functionName, gameKey) {
    const fn = window[functionName];

    if (typeof fn !== "function") return;
    if (fn.__chaserSessionGuarded) return;

    window[functionName] = function () {
        if (!gameStageIsOpen()) return;

        if (!gameMatchesActiveGame(gameKey)) {
            return;
        }

        return fn.apply(this, arguments);
    };

    window[functionName].__chaserSessionGuarded = true;
}

function wrapKnownGameSyncHandlers() {
    wrapSyncHandler("handleIncomingUnoSync", "uno");
    wrapSyncHandler("handleIncomingTriviaSync", "trivia");
    wrapSyncHandler("handleIncomingBattleshipSync", "battleship");
    wrapSyncHandler("handleIncomingCheckersSync", "checkers");
    wrapSyncHandler("handleIncomingSequenceSync", "sequence");
    wrapSyncHandler("handleIncomingCoupSync", "coup");
    wrapSyncHandler("handleIncomingYahtzeeSync", "yahtzee");
    wrapSyncHandler("handleIncomingScrabbleSync", "scrabble");
    wrapSyncHandler("handleIncomingCribbageSync", "cribbage");
    wrapSyncHandler("handleIncomingTexasHoldemSync", "texasholdem");
}

function installGuards() {
    wrapLaunchGameEngine();
    wrapCleanupRunningGameEngine();
    wrapMasterExit();
    wrapKnownGameSyncHandlers();
}

installGuards();

nativeSetInterval(installGuards, 700);

})();

