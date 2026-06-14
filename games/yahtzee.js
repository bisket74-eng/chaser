alert("YAHTZEE JS FILE LOADED");

/* ============================================================
   CHASER YAHTZEE GAME - FULL FILE
   Updated layout + upper bonus + compact dice + Use These Dice
   Compact mode hides top player/new game row
   ============================================================ */
(function () {
    "use strict";

    const YAHTZEE_CATS = [
        { id: "ones", label: "Ones" },
        { id: "twos", label: "Twos" },
        { id: "threes", label: "Threes" },
        { id: "fours", label: "Fours" },
        { id: "fives", label: "Fives" },
        { id: "sixes", label: "Sixes" },
        { id: "threeKind", label: "3 of a Kind" },
        { id: "fourKind", label: "4 of a Kind" },
        { id: "fullHouse", label: "Full House" },
        { id: "smallStraight", label: "Small Straight" },
        { id: "largeStraight", label: "Large Straight" },
        { id: "yahtzee", label: "Yahtzee" },
        { id: "chance", label: "Chance" }
    ];

    const UPPER_IDS = ["ones", "twos", "threes", "fours", "fives", "sixes"];

    function myId() {
        return window.myId || localStorage.getItem("rider_id") || "local-player";
    }

    function myName() {
        const input = document.getElementById("username");
        return (input && input.value.trim()) || localStorage.getItem("rider_saved_name") || "Player";
    }

    function makeGameId() {
        return "yahtzee-" + Date.now() + "-" + Math.floor(Math.random() * 9999);
    }

    function getCanvas() {
        return document.getElementById("gameCanvasContainer");
    }

    function getStage() {
        return document.getElementById("activeGameStage");
    }

    function openStage() {
        const stage = getStage();
        if (!stage) return;
        stage.classList.add("open");
        stage.style.height = "72vh";
        stage.style.maxHeight = "580px";
    }

    function setHeader() {
        const roomDisplay = document.getElementById("roomDisplayCode");
        const headerBtns = document.getElementById("headerActionButtonsContainer");
        const chatHeader = document.getElementById("chatHeader");

        if (roomDisplay) {
            roomDisplay.innerText = "🎲 Yahtzee";
            roomDisplay.style.fontFamily = "'Trebuchet MS', sans-serif";
            roomDisplay.style.fontWeight = "900";
            roomDisplay.style.fontSize = "18px";
        }

        if (headerBtns) headerBtns.style.display = "none";
        if (chatHeader) chatHeader.classList.add("game-active-mode");
    }

    function syncYahtzee() {
        if (typeof channel !== "undefined" && channel && window.yahtzeeState) {
            channel.send({
                type: "broadcast",
                event: "trivia-sync-state",
                payload: {
                    yahtzee: true,
                    state: window.yahtzeeState,
                    senderId: myId(),
                    roomGameId: window.chaserGame?.activeGameId || null
                }
            });
        }
    }

    function diceCounts(dice) {
        const counts = {};
        dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
        return counts;
    }

    function sumDice(dice) {
        return dice.reduce((a, b) => a + (b || 0), 0);
    }

    function hasStraight(dice, needed) {
        const unique = [...new Set(dice)].sort((a, b) => a - b).join("");
        const straights = needed === 5 ? ["12345", "23456"] : ["1234", "2345", "3456"];
        return straights.some(s => unique.includes(s));
    }

    function scoreCategory(cat, dice) {
        if (!dice || dice.some(d => !d)) return 0;

        const counts = diceCounts(dice);
        const total = sumDice(dice);
        const values = Object.values(counts);

        switch (cat) {
            case "ones": return dice.filter(d => d === 1).length;
            case "twos": return dice.filter(d => d === 2).length * 2;
            case "threes": return dice.filter(d => d === 3).length * 3;
            case "fours": return dice.filter(d => d === 4).length * 4;
            case "fives": return dice.filter(d => d === 5).length * 5;
            case "sixes": return dice.filter(d => d === 6).length * 6;
            case "threeKind": return values.some(v => v >= 3) ? total : 0;
            case "fourKind": return values.some(v => v >= 4) ? total : 0;
            case "fullHouse": return values.includes(3) && values.includes(2) ? 25 : 0;
            case "smallStraight": return hasStraight(dice, 4) ? 30 : 0;
            case "largeStraight": return hasStraight(dice, 5) ? 40 : 0;
            case "yahtzee": return values.some(v => v === 5) ? 50 : 0;
            case "chance": return total;
            default: return 0;
        }
    }

    function upperSubtotal(scores) {
        return UPPER_IDS.reduce((sum, id) => sum + (Number(scores[id]) || 0), 0);
    }

    function upperBonus(scores) {
        return upperSubtotal(scores) >= 63 ? 35 : 0;
    }

    function totalFor(scores) {
        const base = Object.values(scores).reduce((sum, val) => sum + (Number(val) || 0), 0);
        return base + upperBonus(scores);
    }

    function allScoresFilled(scores) {
        return YAHTZEE_CATS.every(cat => scores[cat.id] !== null && scores[cat.id] !== undefined);
    }

    function createScoreCard() {
        return YAHTZEE_CATS.reduce((obj, cat) => {
            obj[cat.id] = null;
            return obj;
        }, {});
    }

    function createYahtzeeState() {
        const existingPlayers = window.chaserGame?.players?.length
            ? window.chaserGame.players
            : [{ id: myId(), name: myName(), seat: 0 }];

        return {
            players: existingPlayers.map((p, idx) => ({
                id: p.id,
                name: p.name || ("Player " + (idx + 1)),
                seat: idx,
                scores: createScoreCard()
            })),
            turn: 0,
            round: 1,
            dice: [null, null, null, null, null],
            held: [false, false, false, false, false],
            rollsLeft: 3,
            choosingScore: false,
            gameOver: false,
            message: "Roll the dice."
        };
    }

    function currentPlayer() {
        const s = window.yahtzeeState;
        return s.players[s.turn] || s.players[0];
    }

    function pipHtml(value) {
        if (!value) return `<span class="yz-question">?</span>`;

        const positions = {
            1: ["center"],
            2: ["top-left", "bottom-right"],
            3: ["top-left", "center", "bottom-right"],
            4: ["top-left", "top-right", "bottom-left", "bottom-right"],
            5: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
            6: ["top-left", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-right"]
        };

        return positions[value].map(pos => `<span class="yz-pip ${pos}"></span>`).join("");
    }

    function renderDiceButton(value, idx, held) {
        return `
            <button class="yz-die ${held ? "held" : ""}" onclick="toggleYahtzeeHold(${idx})" type="button">
                ${pipHtml(value)}
            </button>
        `;
    }

    window.initYahtzeeGame = function () {
        window.chaserGame = window.chaserGame || {};
        window.chaserGame.activeGame = "Yahtzee";

        if (!window.chaserGame.activeGameId) {
            window.chaserGame.activeGameId = makeGameId();
        }

        if (!window.chaserGame.players || !window.chaserGame.players.length) {
            if (!window.chaserGame.players || !window.chaserGame.players.length) {
    window.chaserGame.players = [{ id: myId(), name: myName(), seat: 0 }];
}
            window.chaserGame.mySeat = 0;
            window.chaserGame.hostId = myId();
            window.chaserGame.expectedPlayers = window.chaserGame.players.length || 1;
        window.yahtzeeState = createYahtzeeState();
        openStage();
        setHeader();
        renderYahtzee();
        syncYahtzee();
    };

    window.rollYahtzeeDice = function () {
        const s = window.yahtzeeState;
        if (!s || s.gameOver || s.rollsLeft <= 0) return;

        const p = currentPlayer();
        if (p.id !== myId() && s.players.length > 1) return;

        for (let i = 0; i < 5; i++) {
            if (!s.held[i]) s.dice[i] = Math.floor(Math.random() * 6) + 1;
        }

        s.rollsLeft--;
        s.choosingScore = false;
        s.message = s.rollsLeft > 0 ? "Roll again, hold dice, or use these dice." : "Choose a score box.";

        renderYahtzee();
        syncYahtzee();
    };

    window.useYahtzeeDice = function () {
        const s = window.yahtzeeState;
        if (!s || s.gameOver) return;
        if (s.dice.some(d => !d)) return;

        s.choosingScore = true;
        s.message = "Choose a score box.";

        renderYahtzee();
        syncYahtzee();
    };

    window.toggleYahtzeeHold = function (idx) {
        const s = window.yahtzeeState;
        if (!s || s.gameOver || !s.dice[idx] || s.rollsLeft === 3 || s.choosingScore) return;

        const p = currentPlayer();
        if (p.id !== myId() && s.players.length > 1) return;

        s.held[idx] = !s.held[idx];
        renderYahtzee();
        syncYahtzee();
    };

    window.scoreYahtzeeCategory = function (catId) {
        const s = window.yahtzeeState;
        if (!s || s.gameOver || s.dice.some(d => !d)) return;

        const p = currentPlayer();
        if (p.id !== myId() && s.players.length > 1) return;
        if (p.scores[catId] !== null && p.scores[catId] !== undefined) return;

        p.scores[catId] = scoreCategory(catId, s.dice);

        if (s.players.every(player => allScoresFilled(player.scores))) {
            s.gameOver = true;
            const winner = s.players.slice().sort((a, b) => totalFor(b.scores) - totalFor(a.scores))[0];
            s.message = winner.name + " wins with " + totalFor(winner.scores) + " points!";
            renderYahtzee();
            syncYahtzee();
            return;
        }

        s.turn = (s.turn + 1) % s.players.length;
        if (s.turn === 0) s.round++;

        s.dice = [null, null, null, null, null];
        s.held = [false, false, false, false, false];
        s.rollsLeft = 3;
        s.choosingScore = false;
        s.message = currentPlayer().name + "'s turn. Roll the dice.";

        renderYahtzee();
        syncYahtzee();
    };

    window.newYahtzeeGame = function () {
        window.yahtzeeState = createYahtzeeState();
        renderYahtzee();
        syncYahtzee();
    };

    function renderYahtzee() {
        const canvas = getCanvas();
        const s = window.yahtzeeState;
        if (!canvas || !s) return;

        const p = currentPlayer();
        const myTurn = p && p.id === myId();
        const canAct = myTurn || s.players.length === 1;

        const upperNow = upperSubtotal(p.scores);
        const bonusNow = upperBonus(p.scores);
        const totalNow = totalFor(p.scores);
        const bonusNeeded = Math.max(0, 63 - upperNow);

        const diceCompact = (s.choosingScore || s.rollsLeft === 0) && !s.gameOver;
        const showTopbar = !diceCompact;

        const topDice = diceCompact
            ? s.dice.map((die, idx) => renderDiceButton(die, idx, s.held[idx])).join("")
            : s.dice.slice(0, 3).map((die, idx) => renderDiceButton(die, idx, s.held[idx])).join("");

        const bottomDice = diceCompact
            ? ""
            : s.dice.slice(3, 5).map((die, idx) => renderDiceButton(die, idx + 3, s.held[idx + 3])).join("");

        let scoreRows = "";

        YAHTZEE_CATS.forEach(cat => {
            const actual = p.scores[cat.id];
            const preview = scoreCategory(cat.id, s.dice);
            const used = actual !== null && actual !== undefined;
            const clickable = canAct && !used && !s.gameOver && !s.dice.some(d => !d);

            scoreRows += `
                <div class="yz-score-row ${used ? "used" : ""}">
                    <div class="yz-score-name">${cat.label}</div>
                    <div class="yz-score-value">${used ? actual : preview}</div>
                    <button onclick="scoreYahtzeeCategory('${cat.id}')" ${clickable ? "" : "disabled"} class="yz-score-btn ${clickable ? "active" : ""}" type="button">
                        ${used ? "Used" : "Score"}
                    </button>
                </div>
            `;

            if (cat.id === "sixes") {
                scoreRows += `
                    <div class="yz-bonus-row">
                        <div>Upper Total</div>
                        <div>${upperNow}/63</div>
                        <div>${bonusNow ? "+35" : bonusNeeded + " needed"}</div>
                    </div>
                    <div class="yz-bonus-row yz-bonus-final">
                        <div>Upper Bonus</div>
                        <div>${bonusNow ? "35 earned" : "0 so far"}</div>
                        <div>${bonusNow ? "✅" : "—"}</div>
                    </div>
                `;
            }
        });

        canvas.innerHTML = `
            <style>
                .yz-wrap { height:100%; overflow:auto; box-sizing:border-box; padding:10px; color:#e2f0d9; font-family:'Trebuchet MS', sans-serif; }
                .yz-topbar { display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; margin-bottom:8px; }
                .yz-player-card { background:rgba(0,0,0,.28); border:2px solid rgba(226,240,217,.5); border-radius:14px; padding:9px 10px; min-width:0; }
                .yz-player-name { font-size:17px; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#ffd700; }
                .yz-player-score { font-size:13px; font-weight:900; color:#e2f0d9; margin-top:2px; }
                .yz-new-btn { padding:11px 12px; border-radius:12px; border:2px solid #e2f0d9; background:#1e4620; color:#e2f0d9; font-weight:900; box-shadow:0 3px 8px rgba(0,0,0,.35); }

                .yz-main-panel { background:rgba(0,0,0,.25); border:2px solid rgba(226,240,217,.55); border-radius:14px; padding:10px; margin-bottom:8px; text-align:center; }
                .yz-turn-line { font-weight:900; margin-bottom:4px; color:#ffd700; }
                .yz-message { font-size:14px; margin-bottom:10px; color:#e2f0d9; }

                .yz-dice-area { display:flex; flex-direction:column; align-items:center; gap:10px; margin:8px auto 12px; max-width:340px; }
                .yz-dice-row { display:flex; justify-content:center; gap:10px; width:100%; }

                .yz-die { position:relative; width:86px; height:86px; border-radius:18px; border:4px solid #111; background:linear-gradient(145deg,#ffffff,#dcdcdc); box-shadow:inset -4px -4px 8px rgba(0,0,0,.18), inset 4px 4px 8px rgba(255,255,255,.85), 0 5px 12px rgba(0,0,0,.45); padding:0; flex:0 0 auto; }
                .yz-die.held { border-color:#ffd700; background:linear-gradient(145deg,#fff9cc,#ecd86d); transform:translateY(-3px); }

                .yz-pip { position:absolute; width:12px; height:12px; background:#111; border-radius:50%; transform:translate(-50%,-50%); }
                .yz-pip.top-left { left:28%; top:28%; }
                .yz-pip.top-right { left:72%; top:28%; }
                .yz-pip.middle-left { left:28%; top:50%; }
                .yz-pip.middle-right { left:72%; top:50%; }
                .yz-pip.center { left:50%; top:50%; }
                .yz-pip.bottom-left { left:28%; top:72%; }
                .yz-pip.bottom-right { left:72%; top:72%; }

                .yz-question { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#111; font-size:44px; font-weight:900; }

                .yz-compact-dice { margin:0 auto 4px !important; gap:4px !important; max-width:100% !important; }
                .yz-compact-dice .yz-dice-row { flex-direction:row !important; gap:5px !important; }
                .yz-compact-dice .yz-die { width:48px !important; height:48px !important; border-radius:10px !important; border-width:3px !important; }
                .yz-compact-dice .yz-pip { width:8px !important; height:8px !important; }
                .yz-compact-dice .yz-question { font-size:26px !important; }

                .yz-roll-btn, .yz-use-btn { width:100%; max-width:280px; padding:12px; border-radius:14px; border:3px solid #111; color:#111; font-size:17px; font-weight:900; box-shadow:0 3px 8px rgba(0,0,0,.35); }
                .yz-roll-btn.active { background:#ffd700; }
                .yz-roll-btn:disabled { background:#777; color:#222; }
                .yz-use-btn { margin-top:8px; background:#e2f0d9; color:#1e4620; border-color:#ffd700; }

                .yz-score-panel { background:rgba(0,0,0,.25); border:2px solid rgba(226,240,217,.55); border-radius:14px; padding:10px; margin-top:6px; margin-bottom:15px; }
                .yz-score-head, .yz-score-row, .yz-bonus-row { display:grid; grid-template-columns:1.5fr .7fr .9fr; gap:6px; align-items:center; }
                .yz-score-head { font-weight:900; margin-bottom:6px; color:#ffd700; font-size:13px; }
                .yz-score-row { padding:7px 8px; border-bottom:1px solid rgba(255,255,255,.15); background:rgba(0,0,0,.18); border-radius:8px; margin-bottom:5px; }
                .yz-score-row.used { background:rgba(255,255,255,.08); }
                .yz-score-name { font-weight:900; font-size:14px; }
                .yz-score-value { text-align:center; font-weight:900; }
                .yz-score-btn { padding:6px; border-radius:8px; border:2px solid #e2f0d9; background:#777; color:#111; font-weight:900; }
                .yz-score-btn.active { background:#ffd700; }

                .yz-bonus-row { padding:8px; margin:5px 0; border-radius:8px; background:rgba(255,215,0,.14); color:#ffd700; font-weight:900; font-size:13px; }
                .yz-bonus-final { background:rgba(255,215,0,.22); margin-bottom:10px; }
                .yz-total-footer { text-align:center; color:#ffd700; font-size:16px; font-weight:900; padding:8px 0 12px; }

                @media (max-width:390px) {
                    .yz-die { width:76px; height:76px; }
                }
            </style>

            <div class="yz-wrap">
                ${showTopbar ? `
                    <div class="yz-topbar">
                        <div class="yz-player-card">
                            <div class="yz-player-name">${p.name}</div>
                            <div class="yz-player-score">Total: ${totalNow} pts • Bonus: ${bonusNow ? "+35" : "0"}</div>
                        </div>
                        <button onclick="newYahtzeeGame()" class="yz-new-btn" type="button">New Game</button>
                    </div>
                ` : ""}

                <div class="yz-main-panel">
                    <div class="yz-turn-line">Round ${s.round} • ${p.name}'s Turn</div>
                    <div class="yz-message">${s.message}</div>

                    <div class="yz-dice-area ${diceCompact ? "yz-compact-dice" : ""}">
                        <div class="yz-dice-row">${topDice}</div>
                        ${bottomDice ? `<div class="yz-dice-row">${bottomDice}</div>` : ""}
                    </div>

                    <button onclick="rollYahtzeeDice()" ${canAct && !s.gameOver && s.rollsLeft > 0 && !s.choosingScore ? "" : "disabled"} class="yz-roll-btn ${canAct && !s.gameOver && s.rollsLeft > 0 && !s.choosingScore ? "active" : ""}" type="button">
                        Roll Dice (${s.rollsLeft} left)
                    </button>

                    ${canAct && !s.gameOver && !s.dice.some(d => !d) && s.rollsLeft > 0 && !s.choosingScore ? `
                        <button onclick="useYahtzeeDice()" class="yz-use-btn" type="button">
                            Use These Dice
                        </button>
                    ` : ""}
                </div>

                <div class="yz-score-panel">
                    <div class="yz-score-head">
                        <div>Category</div>
                        <div style="text-align:center;">Score</div>
                        <div style="text-align:center;">Pick</div>
                    </div>
                    ${scoreRows}
                </div>

                <div class="yz-total-footer">Current Total: ${totalNow} points</div>
            </div>
        `;
    }

    const oldLaunchGameEngine = window.launchGameEngine;

    window.launchGameEngine = function (gameName, gameIcon) {
        const normalized = String(gameName || "").trim().toLowerCase();

        if (normalized === "yahtzee") {
            if (typeof window.cleanupRunningGameEngine === "function") {
                window.cleanupRunningGameEngine();
            }

            window.chaserGame = window.chaserGame || {};
            window.chaserGame.activeGame = "Yahtzee";
            window.chaserGame.activeGameId = makeGameId();
            window.chaserGame.players = [{ id: myId(), name: myName(), seat: 0 }];
            window.chaserGame.mySeat = 0;
            window.chaserGame.hostId = myId();
            window.chaserGame.expectedPlayers = 1;

            const hub = document.getElementById("gameHubOverlay");
            if (hub) hub.classList.remove("open");

            openStage();
            setHeader();
            window.initYahtzeeGame();
            return;
        }

        if (typeof oldLaunchGameEngine === "function") {
            oldLaunchGameEngine(gameName, gameIcon);
        }
    };

    const oldReceiveTriviaSync = window.receiveTriviaSync;

    window.receiveTriviaSync = function (payload) {
        if (payload && payload.yahtzee && payload.state) {
            window.yahtzeeState = payload.state;
            if (window.chaserGame) window.chaserGame.activeGame = "Yahtzee";
            renderYahtzee();
            return;
        }

        if (typeof oldReceiveTriviaSync === "function") {
            oldReceiveTriviaSync(payload);
        }
    };

    const oldShutdown = window.shutdownActiveGame;
    const oldMasterExit = window.chaserMasterExitSequence;

    function restoreAfterYahtzee() {
        const hub = document.getElementById("gameHubOverlay");
        const canvas = document.getElementById("gameCanvasContainer");
        const stage = document.getElementById("activeGameStage");

        if (canvas) {
            canvas.innerHTML = "";
            canvas.style.pointerEvents = "";
            canvas.style.display = "";
        }

        if (stage) {
            stage.classList.remove("open");
            stage.style.pointerEvents = "";
            stage.style.display = "";
            stage.style.height = "";
            stage.style.maxHeight = "";
        }

        if (hub) {
            hub.classList.remove("open");
            hub.style.display = "";
            hub.style.pointerEvents = "";
            hub.style.visibility = "";
            hub.style.opacity = "";
        }
    }

    window.shutdownActiveGame = function (...args) {
        restoreAfterYahtzee();
        if (typeof oldShutdown === "function") return oldShutdown.apply(this, args);
    };

    window.chaserMasterExitSequence = function (...args) {
        restoreAfterYahtzee();
        if (typeof oldMasterExit === "function") return oldMasterExit.apply(this, args);
        if (typeof oldShutdown === "function") return oldShutdown.apply(this, args);
    };
})();
