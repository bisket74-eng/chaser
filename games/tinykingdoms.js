/* CHASER TINY KINGDOMS - SEPARATE GAME FILE
Small-screen strategy kingdom game.
1 player vs computer or 2-4 players synced.
*/
;(function () {
"use strict";

const MAX_ROUNDS = 8;
const MAX_PLAYERS = 4;
const BOT_ID = "tiny-kingdoms-computer";
const BOT_DELAY = 6000;
const ARMY_REVEAL_MS = 2800;
const ACTION_FLASH_MS = 1500;

let botTimer = null;
let armyRevealTimer = null;
let actionFlashTimer = null;

const zoomView = {
    scale: 1,
    x: 0,
    y: 0
};

function byId(id) {
    return document.getElementById(id);
}

function canvas() {
    return byId("gameCanvasContainer");
}

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
    const input = byId("username");
    return (input && input.value.trim()) || localStorage.getItem("rider_saved_name") || "Player";
}

function openStage() {
    const stage = byId("activeGameStage");
    if (stage) stage.classList.add("open");
}

function setHeader() {
    const roomDisplay = byId("roomDisplayCode");
    const headerBtns = byId("headerActionButtonsContainer");
    const chatHeader = byId("chatHeader");

    if (roomDisplay) roomDisplay.innerText = "🏰 Tiny Kingdoms";
    if (headerBtns) headerBtns.style.display = "none";
    if (chatHeader) chatHeader.classList.add("game-active-mode");
}

function resetZoom() {
    zoomView.scale = 1;
    zoomView.x = 0;
    zoomView.y = 0;
}

function syncTinyKingdoms() {
    if (typeof channel !== "undefined" && channel && window.tinyKingdomsState) {
        channel.send({
            type: "broadcast",
            event: "tinykingdoms-sync-state",
            payload: {
                state: window.tinyKingdomsState,
                roomGameId: window.chaserGame && window.chaserGame.activeGameId ? window.chaserGame.activeGameId : null
            }
        });
    }
}

function makePlayers() {
    const lobbyPlayers = window.chaserGame && Array.isArray(window.chaserGame.players) && window.chaserGame.players.length
        ? window.chaserGame.players
        : [{ id: getMyId(), name: myName(), seat: 0 }];

    const players = lobbyPlayers.slice(0, MAX_PLAYERS).map(function (p, idx) {
        return {
            id: p.id,
            name: p.name || "Player " + (idx + 1),
            isComputer: false,
            food: 2,
            coins: 2,
            science: 0,
            army: 1,
            wonder: 0,
            score: 0,
            endBonus: 0,
            acted: false,
            lastAction: ""
        };
    });

    if (players.length === 1) {
        players.push({
            id: BOT_ID,
            name: "Computer",
            isComputer: true,
            food: 2,
            coins: 2,
            science: 0,
            army: 1,
            wonder: 0,
            score: 0,
            endBonus: 0,
            acted: false,
            lastAction: ""
        });
    }

    return players;
}

function createState() {
    return {
        phase: "playing",
        round: 1,
        maxRounds: MAX_ROUNDS,
        players: makePlayers(),
        turnIndex: 0,
        message: "Build your tiny kingdom.",
        log: [],
        finalMessage: "",
        winners: [],
        armyRevealUntil: 0,
        armyRevealIds: [],
        actionFlash: null
    };
}

function addLog(st, text) {
    st.log.unshift(text);
    st.log = st.log.slice(0, 4);
}

function myPlayer() {
    const st = window.tinyKingdomsState;
    if (!st) return null;

    return st.players.find(function (p) {
        return p.id === getMyId();
    }) || null;
}

function currentPlayer() {
    const st = window.tinyKingdomsState;
    if (!st) return null;
    return st.players[st.turnIndex] || null;
}

function isMyTurn() {
    const p = currentPlayer();
    return p && p.id === getMyId();
}

function nextTurnIndex(fromIndex) {
    const st = window.tinyKingdomsState;
    if (!st || !st.players.length) return 0;

    for (let i = 1; i <= st.players.length; i++) {
        const idx = (fromIndex + i) % st.players.length;
        const p = st.players[idx];

        if (p && !p.acted) return idx;
    }

    return fromIndex;
}

function allPlayersActed(st) {
    return st.players.every(function (p) {
        return p.acted;
    });
}

function canBuildWonder(p) {
    return p && p.food >= 2 && p.coins >= 2 && p.science >= 1;
}

function strongestOpponent(player) {
    const st = window.tinyKingdomsState;
    if (!st) return null;

    return st.players
        .filter(function (p) {
            return p.id !== player.id;
        })
        .sort(function (a, b) {
            return (b.coins + b.food + b.science + b.score) - (a.coins + a.food + a.science + a.score);
        })[0] || null;
}

function stealOneResource(fromPlayer, toPlayer) {
    if (fromPlayer.coins > 0) {
        fromPlayer.coins -= 1;
        toPlayer.coins += 1;
        return "coin";
    }

    if (fromPlayer.food > 0) {
        fromPlayer.food -= 1;
        toPlayer.food += 1;
        return "food";
    }

    if (fromPlayer.science > 0) {
        fromPlayer.science -= 1;
        toPlayer.science += 1;
        return "study";
    }

    return "";
}

function revealRaidArmies(st, attacker, target) {
    st.armyRevealUntil = Date.now() + ARMY_REVEAL_MS;
    st.armyRevealIds = [attacker.id, target.id];
}

function isArmyRevealed(playerId) {
    const st = window.tinyKingdomsState;
    if (!st || !st.armyRevealUntil || !Array.isArray(st.armyRevealIds)) return false;
    if (Date.now() > st.armyRevealUntil) return false;
    return st.armyRevealIds.indexOf(playerId) !== -1;
}

function shouldHideArmy(p) {
    const st = window.tinyKingdomsState;
    const me = myPlayer();

    if (!st || !p || !me) return false;
    if (st.phase === "gameover") return false;
    if (p.id === me.id) return false;
    if (isArmyRevealed(p.id)) return false;

    return true;
}

function triggerActionFlash(st, playerId, action, label, targetId) {
    st.actionFlash = {
        playerId: playerId,
        targetId: targetId || "",
        action: action,
        label: label || "",
        until: Date.now() + ACTION_FLASH_MS
    };
}

function actionResource(action) {
    if (action === "farm") return "food";
    if (action === "trade") return "coins";
    if (action === "study") return "science";
    if (action === "train") return "army";
    if (action === "wonder") return "wonder";
    if (action === "raid") return "army";
    return "";
}

function actionFlashLabel(p, resourceName) {
    const st = window.tinyKingdomsState;
    if (!st || !st.actionFlash || !st.actionFlash.until) return "";
    if (Date.now() > st.actionFlash.until) return "";

    const flash = st.actionFlash;
    const resource = actionResource(flash.action);
    if (resource !== resourceName) return "";

    if (flash.action === "raid") {
        if (p.id === flash.playerId) return flash.label || "Raid";
        if (p.id === flash.targetId) return "Raid";
        return "";
    }

    if (p.id !== flash.playerId) return "";
    return flash.label || "";
}

function scheduleArmyRevealHide() {
    clearTimeout(armyRevealTimer);

    const st = window.tinyKingdomsState;
    if (!st || !st.armyRevealUntil) return;

    const wait = st.armyRevealUntil - Date.now();

    if (wait <= 0) {
        st.armyRevealUntil = 0;
        st.armyRevealIds = [];
        return;
    }

    armyRevealTimer = setTimeout(function () {
        const current = window.tinyKingdomsState;
        if (!current || !current.armyRevealUntil) return;

        if (Date.now() >= current.armyRevealUntil) {
            current.armyRevealUntil = 0;
            current.armyRevealIds = [];
            renderTinyKingdomsNoBot();
            syncTinyKingdoms();
        }
    }, wait + 50);
}

function scheduleActionFlashHide() {
    clearTimeout(actionFlashTimer);

    const st = window.tinyKingdomsState;
    if (!st || !st.actionFlash || !st.actionFlash.until) return;

    const wait = st.actionFlash.until - Date.now();

    if (wait <= 0) {
        st.actionFlash = null;
        return;
    }

    actionFlashTimer = setTimeout(function () {
        const current = window.tinyKingdomsState;
        if (!current || !current.actionFlash || !current.actionFlash.until) return;

        if (Date.now() >= current.actionFlash.until) {
            current.actionFlash = null;
            renderTinyKingdomsNoBot();
            syncTinyKingdoms();
        }
    }, wait + 50);
}

function applyAction(st, p, action) {
    let text = "";

    if (action === "farm") {
        p.food += 3;
        p.score += 1;
        text = "Farm +3 food";
        p.lastAction = "🍞 Farm +3";
        triggerActionFlash(st, p.id, action, "+3", "");
    }

    if (action === "trade") {
        p.coins += 3;
        p.score += 1;
        text = "Trade +3 coins";
        p.lastAction = "🪙 Trade +3";
        triggerActionFlash(st, p.id, action, "+3", "");
    }

    if (action === "study") {
        p.science += 2;
        p.score += 1;
        text = "Study +2";
        p.lastAction = "📚 Study +2";
        triggerActionFlash(st, p.id, action, "+2", "");
    }

    if (action === "train") {
        p.army += 2;
        p.score += 1;
        text = "Train +2 army";
        p.lastAction = "⚔️ Train +2";
        triggerActionFlash(st, p.id, action, "+2", "");
    }

    if (action === "wonder") {
        if (!canBuildWonder(p)) {
            st.message = "Need 🍞2 🪙2 📚1";
            return false;
        }

        p.food -= 2;
        p.coins -= 2;
        p.science -= 1;
        p.wonder += 1;
        p.score += 6 + p.wonder;
        text = "Wonder +" + (6 + p.wonder);
        p.lastAction = "✨ Wonder +" + (6 + p.wonder);
        triggerActionFlash(st, p.id, action, "+" + (6 + p.wonder), "");
    }

    if (action === "raid") {
        const target = strongestOpponent(p);

        if (!target) {
            st.message = "No kingdom to raid.";
            return false;
        }

        revealRaidArmies(st, p, target);

        if (p.army > target.army) {
            stealOneResource(target, p);
            stealOneResource(target, p);
            p.score += 3;
            text = "Raid +3";
            p.lastAction = "🔥 Raid +3";
            triggerActionFlash(st, p.id, action, "+3", target.id);
        } else {
            p.army += 1;
            p.score += 1;
            text = "Raid failed";
            p.lastAction = "🔥 Raid failed";
            triggerActionFlash(st, p.id, action, "+1", target.id);
        }
    }

    p.acted = true;
    st.message = p.name + ": " + text;
    addLog(st, p.name + ": " + p.lastAction);

    return true;
}

function advanceAfterAction(st) {
    if (allPlayersActed(st)) {
        if (st.round >= st.maxRounds) {
            finishGame(st);
            return;
        }

        st.round += 1;

        st.players.forEach(function (p) {
            p.acted = false;
        });

        st.turnIndex = (st.round - 1) % st.players.length;
        st.message = "Round " + st.round;
        addLog(st, "Round " + st.round);
        return;
    }

    st.turnIndex = nextTurnIndex(st.turnIndex);
}

function finalBonus(p) {
    return Math.floor(p.food / 2) +
        Math.floor(p.coins / 2) +
        (p.science * 2) +
        p.army +
        (p.wonder * 3);
}

function finishGame(st) {
    st.phase = "gameover";
    st.armyRevealUntil = 0;
    st.armyRevealIds = [];
    st.actionFlash = null;

    st.players.forEach(function (p) {
        p.endBonus = finalBonus(p);
        p.score += p.endBonus;
        p.acted = true;
    });

    const bestScore = Math.max.apply(null, st.players.map(function (p) {
        return p.score;
    }));

    const winners = st.players.filter(function (p) {
        return p.score === bestScore;
    });

    st.winners = winners.map(function (p) {
        return p.id;
    });

    st.finalMessage = winners.map(function (p) {
        return p.name;
    }).join(" & ") + " win: " + bestScore;

    st.message = st.finalMessage;
    addLog(st, st.finalMessage);
}

window.tinyKingdomsAction = function (action) {
    const st = window.tinyKingdomsState;
    const p = myPlayer();

    if (!st || !p || st.phase !== "playing") return;
    if (!isMyTurn()) return;
    if (p.acted) return;

    const ok = applyAction(st, p, action);

    if (!ok) {
        renderTinyKingdoms();
        return;
    }

    advanceAfterAction(st);
    renderTinyKingdoms();
    syncTinyKingdoms();
    maybeComputerAction();
};

function computerPickAction(p) {
    const opponent = strongestOpponent(p);

    if (canBuildWonder(p) && Math.random() < 0.55) return "wonder";
    if (opponent && p.army > opponent.army + 1 && Math.random() < 0.45) return "raid";
    if (p.food < 2) return "farm";
    if (p.coins < 2) return "trade";
    if (p.science < 1) return "study";
    if (opponent && p.army <= opponent.army && Math.random() < 0.4) return "train";

    const choices = ["farm", "trade", "study", "train", "raid"];
    return choices[Math.floor(Math.random() * choices.length)];
}

function computerAction() {
    const st = window.tinyKingdomsState;
    const p = currentPlayer();

    if (!st || st.phase !== "playing" || !p || !p.isComputer || p.acted) return;

    const action = computerPickAction(p);
    const ok = applyAction(st, p, action);

    if (ok) {
        advanceAfterAction(st);
    }

    renderTinyKingdoms();
    syncTinyKingdoms();
    maybeComputerAction();
}

function maybeComputerAction() {
    clearTimeout(botTimer);

    const st = window.tinyKingdomsState;
    if (!st || st.phase !== "playing") return;

    const p = currentPlayer();
    if (!p || !p.isComputer) return;

    st.message = "Computer thinking...";
    renderTinyKingdomsNoBot();

    botTimer = setTimeout(computerAction, BOT_DELAY);
}

function resourceTile(icon, label, value, hidden, flashLabel) {
    const amount = Number(value || 0);
    const hasValue = amount > 0 ? " has-value" : "";
    const hiddenClass = hidden ? " army-hidden" : "";
    const flashClass = flashLabel ? " action-flash" : "";
    const shownIcon = hidden ? "☁️" : icon;
    const shownAmount = hidden ? "?" : amount;

    return (
        '<div class="tk-resource' + hasValue + hiddenClass + flashClass + '">' +
            '<div class="tk-resource-icon">' + shownIcon + '</div>' +
            '<div class="tk-resource-num">' + shownAmount + '</div>' +
            '<div class="tk-resource-label">' + label + '</div>' +
            (flashLabel ? '<div class="tk-float">' + escapeHtml(flashLabel) + '</div>' : '') +
        '</div>'
    );
}

function playerCard(p, index) {
    const st = window.tinyKingdomsState;
    const turn = st.phase === "playing" && st.turnIndex === index;
    const winner = st.winners.indexOf(p.id) !== -1;
    const hideArmy = shouldHideArmy(p);

    return (
        '<div class="tk-player-card ' + (turn ? "turn " : "") + (winner ? "winner " : "") + '">' +
            '<div class="tk-player-header">' +
                '<div class="tk-player-name">' + escapeHtml(p.name) + '</div>' +
                '<div class="tk-last">' + escapeHtml(p.lastAction || (p.acted ? "Waiting" : "To act")) + '</div>' +
                '<div class="tk-score">' + Number(p.score || 0) + '</div>' +
            '</div>' +
            '<div class="tk-resource-grid">' +
                resourceTile("🍞", "Food", p.food, false, actionFlashLabel(p, "food")) +
                resourceTile("🪙", "Coins", p.coins, false, actionFlashLabel(p, "coins")) +
                resourceTile("📚", "Study", p.science, false, actionFlashLabel(p, "science")) +
                resourceTile("⚔️", "Army", p.army, hideArmy, actionFlashLabel(p, "army")) +
                resourceTile("✨", "Wonder", p.wonder, false, actionFlashLabel(p, "wonder")) +
            '</div>' +
            (st.phase === "gameover" ? '<div class="tk-bonus">Bonus +' + Number(p.endBonus || 0) + '</div>' : '') +
        '</div>'
    );
}

function actionButton(action, icon, title, sub, disabled, extraClass) {
    return (
        '<button class="tk-action ' + (extraClass || "") + '" onclick="tinyKingdomsAction(\'' + action + '\')" ' + (disabled ? "disabled" : "") + ' type="button">' +
            '<span>' + icon + '</span>' +
            '<b>' + title + '</b>' +
            '<small>' + sub + '</small>' +
        '</button>'
    );
}

window.openTinyKingdomsHelp = function () {
    window.__tinyKingdomsHelpOpen = true;
    renderTinyKingdomsNoBot();
};

window.closeTinyKingdomsHelp = function () {
    window.__tinyKingdomsHelpOpen = false;
    renderTinyKingdomsNoBot();
};

function helpOverlayHtml() {
    if (!window.__tinyKingdomsHelpOpen) return "";

    return (
        '<div class="tk-help-overlay">' +
            '<button class="tk-help-close-x" onclick="closeTinyKingdomsHelp()" type="button">✕</button>' +
            '<div class="tk-help-card">' +
                '<div class="tk-help-title">How to Play</div>' +
                '<p><b>Goal:</b> Earn the highest score at the end of 8 rounds.</p>' +
                '<p><b>Players:</b> 1 player vs computer, or up to 4 players synced.</p>' +
                
                '<h3 class="tk-help-section-title">1. Points Earned During Your Turn</h3>' +
                '<p>Taking actions updates your score instantly:</p>' +
                '<div class="tk-help-row"><b>🍞 Farm, 🪙 Trade, 📚 Study, ⚔️ Train:</b> Gives you <b>+1 point</b>.</div>' +
                '<div class="tk-help-row"><b>🔥 Raid:</b> Compares your ⚔️ Army level against your opponent. <br>' +
                '• <b>Win</b> (Your Army is higher): Steal 2 random resources and earn <b>+3 points</b>.<br>' +
                '• <b>Fail</b> (Your Army is equal/lower): You steal nothing, but learn from it getting +1 Army level and <b>+1 point</b>.</div>' +
                '<div class="tk-help-row"><b>✨ Wonder:</b> Costs <b>🍞2, 🪙2, and 📚1</b> to build. Gives a massive point boost equal to <b>6 points + the total number of Wonders you own</b>. (Your first is worth 7 points, your second is worth 8, etc.)</div>' +

                '<h3 class="tk-help-section-title">2. Ending Bonus Points (Round 8)</h3>' +
                '<p>When the game ends, your hoarded resources are converted into extra points:</p>' +
                '<div class="tk-help-row"><b>📚 Study:</b> Worth <b>2 points</b> each.</div>' +
                '<div class="tk-help-row"><b>✨ Wonder:</b> Worth <b>3 points</b> each.</div>' +
                '<div class="tk-help-row"><b>⚔️ Army:</b> Worth <b>1 point</b> per level.</div>' +
                '<div class="tk-help-row"><b>🍞 Food & 🪙 Coins:</b> Worth <b>0.5 points</b> each (grouped into pairs; every 2 leftover food or 2 coins equals 1 point. Odd leftovers round down to 0).</div>' +
                
                '<p style="margin-top:20px; font-size:13px; opacity:0.8; text-align:center;">Pinch the game screen to zoom. Drag to move around. Double tap to reset view.</p>' +
            '</div>' +
        '</div>'
    );
}

function setupWholeGameZoom() {
    const root = canvas();
    if (!root) return;

    function applyView() {
        const viewport = root.querySelector(".tk-zoom-viewport");
        const content = root.querySelector(".tk-zoom-content");

        if (!viewport || !content) return;

        const viewportW = viewport.clientWidth || 1;
        const viewportH = viewport.clientHeight || 1;
        const contentW = content.offsetWidth || viewportW;
        const contentH = content.offsetHeight || viewportH;

        const scaledW = contentW * zoomView.scale;
        const scaledH = contentH * zoomView.scale;

        if (zoomView.scale <= 1.01) {
            zoomView.scale = 1;
            zoomView.x = 0;
            zoomView.y = 0;
        } else {
            const minX = Math.min(0, viewportW - scaledW);
            const minY = Math.min(0, viewportH - scaledH);

            zoomView.x = Math.max(minX, Math.min(0, zoomView.x));
            zoomView.y = Math.max(minY, Math.min(0, zoomView.y));
        }

        content.style.transformOrigin = "top left";
        content.style.transform =
            "translate3d(" + zoomView.x + "px, " + zoomView.y + "px, 0) scale(" + zoomView.scale + ")";
    }

    applyView();

    if (root.__tinyKingdomsWholeZoomWired) return;
    root.__tinyKingdomsWholeZoomWired = true;

    let lastPinchDistance = 0;
    let startFingerX = 0;
    let startFingerY = 0;
    let startX = 0;
    let startY = 0;
    let moved = false;
    let lastTap = 0;

    function insideGame(e) {
        return e.target && e.target.closest && e.target.closest(".tk-zoom-viewport");
    }

    function touchDistance(t1, t2) {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function touchMidpoint(e) {
        const viewport = root.querySelector(".tk-zoom-viewport");
        if (!viewport) return { x: 0, y: 0 };

        const rect = viewport.getBoundingClientRect();

        return {
            x: ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left,
            y: ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top
        };
    }

    root.addEventListener("touchstart", function (e) {
        if (!insideGame(e)) return;

        moved = false;

        if (e.touches.length === 2) {
            e.preventDefault();
            lastPinchDistance = touchDistance(e.touches[0], e.touches[1]);
            return;
        }

        if (e.touches.length === 1) {
            startFingerX = e.touches[0].clientX;
            startFingerY = e.touches[0].clientY;
            startX = zoomView.x;
            startY = zoomView.y;
        }
    }, { passive: false });

    root.addEventListener("touchmove", function (e) {
        if (!insideGame(e)) return;

        if (e.touches.length === 2) {
            e.preventDefault();
            moved = true;

            const newDistance = touchDistance(e.touches[0], e.touches[1]);

            if (!lastPinchDistance) {
                lastPinchDistance = newDistance;
                return;
            }

            const mid = touchMidpoint(e);

            const contentPointX = (mid.x - zoomView.x) / zoomView.scale;
            const contentPointY = (mid.y - zoomView.y) / zoomView.scale;

            let nextScale = zoomView.scale * (newDistance / lastPinchDistance);
            nextScale = Math.max(1, Math.min(2.8, nextScale));

            zoomView.scale = nextScale;
            zoomView.x = mid.x - contentPointX * zoomView.scale;
            zoomView.y = mid.y - contentPointY * zoomView.scale;

            lastPinchDistance = newDistance;

            applyView();
            return;
        }

        if (e.touches.length === 1 && zoomView.scale > 1.01) {
            e.preventDefault();

            const dx = e.touches[0].clientX - startFingerX;
            const dy = e.touches[0].clientY - startFingerY;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                moved = true;
            }

            zoomView.x = startX + dx;
            zoomView.y = startY + dy;

            applyView();
        }
    }, { passive: false });

    root.addEventListener("touchend", function (e) {
        if (!insideGame(e)) return;

        if (e.touches.length === 1) {
            startFingerX = e.touches[0].clientX;
            startFingerY = e.touches[0].clientY;
            startX = zoomView.x;
            startY = zoomView.y;
            lastPinchDistance = 0;
            return;
        }

        if (e.touches.length === 0) {
            lastPinchDistance = 0;

            const now = Date.now();

            if (!moved && now - lastTap < 300) {
                resetZoom();
                applyView();
            }

            if (!moved) {
                lastTap = now;
            }
        }
    }, { passive: false });
}

function renderTinyKingdomsNoBot() {
    renderTinyKingdoms(true);
}

function renderTinyKingdoms(skipBotCheck) {
    const el = canvas();
    const st = window.tinyKingdomsState;

    if (!el || !st) return;

    const me = myPlayer();
    const canAct = st.phase === "playing" && isMyTurn() && me && !me.acted && !me.isComputer;
    const buildDisabled = !canAct || !canBuildWonder(me);

    const displayPlayers = st.players.map(function (p, index) {
        return { p: p, index: index };
    }).sort(function (a, b) {
        if (me && a.p.id === me.id && b.p.id !== me.id) return 1;
        if (me && b.p.id === me.id && a.p.id !== me.id) return -1;
        return a.index - b.index;
    });

    const playersHtml = displayPlayers.map(function (item) {
        return playerCard(item.p, item.index);
    }).join("");

    const actionsHtml = st.phase === "playing"
        ? (
            '<div class="tk-actions ' + (canAct ? "my-turn" : "") + '">' +
                actionButton("farm", "🍞", "Farm", "+3 food", !canAct, "") +
                actionButton("trade", "🪙", "Trade", "+3 coins", !canAct, "") +
                actionButton("study", "📚", "Study", "+2 study", !canAct, "") +
                actionButton("train", "⚔️", "Train", "+2 army", !canAct, "") +
                actionButton("wonder", "✨", "Wonder", "big points", buildDisabled, "gold") +
                actionButton("raid", "🔥", "Raid", "army test", !canAct, "red") +
            '</div>'
        )
        : (
            '<div class="tk-actions">' +
                '<button class="tk-new" onclick="resetTinyKingdomsGame()" type="button">New Kingdom</button>' +
            '</div>'
        );

    const messageText = st.message || "";

    el.innerHTML = [
        '<style>',
            '.tk-wrap{width:100%;height:100%;overflow:hidden;box-sizing:border-box;color:#e2f0d9;font-family:Arial,sans-serif;text-align:center;background:linear-gradient(180deg,#092a12,#031906);}',
            '.tk-zoom-viewport{width:100%;height:100%;overflow:hidden;touch-action:none;box-sizing:border-box;padding:8px 8px 86px;}',
            '.tk-zoom-content{width:100%;max-width:760px;margin:0 auto;transform-origin:top left;will-change:transform;}',
            '.tk-top{display:grid;grid-template-columns:1fr 106px;gap:8px;align-items:stretch;margin:0 auto 8px;}',
            '.tk-round{background:#e2f0d9;color:#1e4620;border-radius:14px;padding:9px 8px;font-weight:900;box-shadow:0 3px 8px rgba(0,0,0,.35);font-size:21px;line-height:1;}',
            '.tk-round small{display:block;font-size:12px;margin-top:3px;color:#366b3d;}',
            '.tk-help-btn{border:none;border-radius:14px;background:#ffd700;color:#1e4620;font-weight:900;font-size:20px;box-shadow:0 3px 8px rgba(0,0,0,.35);}',
            '.tk-message{margin:0 auto 8px;color:#ffd700;font-size:19px;font-weight:900;line-height:1.15;min-height:22px;}',
            '.tk-board{display:grid;grid-template-columns:1fr;gap:12px;margin:0 auto;}',
            '.tk-player-card{background:#e2f0d9;color:#1e4620;border:3px solid transparent;border-radius:14px;padding:8px;box-sizing:border-box;box-shadow:0 3px 8px rgba(0,0,0,.35);}',
            '.tk-player-card.turn{border-color:transparent;box-shadow:0 3px 8px rgba(0,0,0,.35);}',
            '.tk-player-card.winner{border-color:#ffd700;box-shadow:0 0 0 2px #ffd700,0 3px 8px rgba(0,0,0,.35);}',
            '.tk-player-header{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px;}',
            '.tk-player-name{font-size:18px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;flex:1;}',
            '.tk-player-card.turn .tk-player-name{color:#ff0000;font-size:21px;}',
            '.tk-last{font-size:12px;font-weight:900;color:#7a1b1b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;flex:1;}',
            '.tk-score{background:#1e4620;color:#ffd700;border-radius:999px;min-width:36px;padding:4px 6px;font-size:18px;font-weight:900;flex-shrink:0;}',
            '.tk-resource-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;}',
            '.tk-resource{position:relative;background:#ffffff;border:2px solid #cfe4c3;border-radius:10px;padding:4px 2px;box-sizing:border-box;min-width:0;box-shadow:inset 0 2px 4px rgba(0,0,0,.12);overflow:visible;}',
            '.tk-resource.has-value{border-color:#ffd700;}',
            '.tk-resource.army-hidden{background:linear-gradient(180deg,#ffffff,#e9f4ff);border-color:#dbe9ff;box-shadow:inset 0 2px 4px rgba(0,0,0,.12),0 0 10px rgba(255,255,255,.55);}',
            '.tk-resource.army-hidden .tk-resource-icon{filter:drop-shadow(0 1px 2px rgba(0,0,0,.18));}',
            '.tk-resource.army-hidden .tk-resource-num{color:#1e4620;font-size:22px;}',
            '.tk-resource.action-flash{animation:tkPulseBox 1.5s ease-out;z-index:2;}',
            '.tk-resource.action-flash .tk-resource-icon{animation:tkIconPop 1.5s ease-out;}',
            '.tk-float{position:absolute;left:50%;top:-10px;transform:translateX(-50%);background:#ffd700;color:#1e4620;border:2px solid #ffffff;border-radius:999px;padding:2px 7px;font-size:13px;font-weight:900;line-height:1;box-shadow:0 2px 8px rgba(0,0,0,.35);animation:tkFloatUp 1.5s ease-out forwards;pointer-events:none;white-space:nowrap;}',
            '@keyframes tkPulseBox{0%{transform:scale(1);box-shadow:inset 0 2px 4px rgba(0,0,0,.12),0 0 0 rgba(255,215,0,0);}25%{transform:scale(1.08);box-shadow:inset 0 2px 4px rgba(0,0,0,.12),0 0 16px rgba(255,215,0,.95);}100%{transform:scale(1);box-shadow:inset 0 2px 4px rgba(0,0,0,.12),0 0 0 rgba(255,215,0,0);}}',
            '@keyframes tkIconPop{0%{transform:translateY(0);}25%{transform:translateY(-4px) scale(1.2);}100%{transform:translateY(0) scale(1);}}',
            '@keyframes tkFloatUp{0%{opacity:0;transform:translate(-50%,8px) scale(.8);}20%{opacity:1;}100%{opacity:0;transform:translate(-50%,-24px) scale(1.05);}}',
            '.tk-resource-icon{font-size:20px;line-height:1;}',
            '.tk-resource-num{font-size:18px;font-weight:900;line-height:1.05;margin-top:2px;color:#1e4620;}',
            '.tk-resource-label{font-size:9px;font-weight:900;text-transform:uppercase;color:#366b3d;}',
            '.tk-bonus{font-size:14px;font-weight:900;color:#1e4620;margin-top:8px;}',
            '.tk-actions{margin:8px auto 6px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;border:3px solid transparent;border-radius:15px;padding:5px;box-sizing:border-box;}',
            '.tk-actions.my-turn{border-color:#ff0000;}',
            '.tk-action,.tk-new{border:none;border-radius:12px;background:#e2f0d9;color:#1e4620;font-weight:900;box-shadow:0 3px 6px rgba(0,0,0,.35);padding:6px 4px;min-height:58px;}',
            '.tk-action span{display:block;font-size:22px;line-height:1;}',
            '.tk-action b{display:block;font-size:14px;margin-top:2px;}',
            '.tk-action small{display:block;font-size:10px;line-height:1.1;color:#3c6f41;}',
            '.tk-action.gold{background:#ffd700;}',
            '.tk-action.red{background:#ffc9c9;color:#7a1010;}',
            '.tk-action:disabled{background:#777!important;color:#222!important;box-shadow:none!important;opacity:.55;}',
            '.tk-new{grid-column:1 / -1;background:#ffd700;font-size:20px;min-height:52px;}',
            '.tk-mini-log{background:rgba(0,0,0,.22);border:2px solid rgba(255,215,0,.35);border-radius:12px;padding:7px;color:#e2f0d9;font-size:13px;font-weight:900;line-height:1.2;margin-top:7px;min-height:18px;}',
            '.tk-help-overlay{position:fixed;inset:0;background:#e2f0d9;z-index:70000;overflow-y:auto;-webkit-overflow-scrolling:touch;}',
            '.tk-help-close-x{position:fixed;top:12px;right:16px;border:none;background:#b00020;color:#ffffff;font-size:22px;font-weight:900;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,.3);z-index:70001;}',
            '.tk-help-card{max-width:640px;margin:0 auto;width:100%;min-height:100%;text-align:left;padding:40px 20px 60px;box-sizing:border-box;color:#1e4620;font-size:16px;line-height:1.4;}',
            '.tk-help-title{text-align:center;color:#1e4620;font-size:28px;font-weight:900;margin-bottom:12px;}',
            '.tk-help-section-title{font-size:18px;font-weight:900;color:#092a12;margin:20px 0 8px;border-bottom:2px solid #1e4620;padding-bottom:4px;}',
            '.tk-help-card p{margin:8px 0;}',
            '.tk-help-row{background:#ffffff;border-radius:12px;padding:10px;margin:10px 0;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.1);}',
            '@media(max-width:430px){.tk-zoom-viewport{padding:6px 6px 86px;}.tk-top{grid-template-columns:1fr 88px;gap:6px;margin-bottom:6px;}.tk-round{font-size:16px;padding:6px 4px;}.tk-round small{font-size:10px;}.tk-help-btn{font-size:15px;}.tk-message{font-size:15px;margin-bottom:5px;min-height:18px;}.tk-board{gap:6px;}.tk-player-card{padding:6px;border-radius:12px;}.tk-player-name{font-size:16px;}.tk-player-card.turn .tk-player-name{font-size:18px;}.tk-last{font-size:11px;}.tk-score{font-size:16px;min-width:32px;padding:4px 5px;}.tk-resource-grid{gap:4px;}.tk-resource{padding:4px 1px;border-radius:8px;border-width:2px;}.tk-resource-icon{font-size:18px;}.tk-resource-num{font-size:16px;}.tk-resource-label{font-size:8px;}.tk-resource.army-hidden .tk-resource-num{font-size:20px;}.tk-float{font-size:11px;padding:2px 6px;top:-9px;}.tk-actions{gap:4px;margin-top:6px;padding:4px;border-radius:13px;}.tk-action{min-height:54px;padding:5px 2px;}.tk-action span{font-size:20px;}.tk-action b{font-size:12px;}.tk-action small{font-size:8px;}.tk-mini-log{font-size:11px;padding:5px;}.tk-help-card{font-size:14px;padding:35px 14px 50px;}.tk-help-title{font-size:22px;}.tk-help-section-title{font-size:16px;}}',
        '</style>',

        '<div class="tk-wrap">',
            '<div class="tk-zoom-viewport">',
                '<div class="tk-zoom-content">',
                    '<div class="tk-top">',
                        '<div class="tk-round">Round ' + Number(st.round || 1) + ' / ' + Number(st.maxRounds || MAX_ROUNDS) + '<small>Score in green circle</small></div>',
                        '<button class="tk-help-btn" onclick="openTinyKingdomsHelp()" type="button">Help ?</button>',
                    '</div>',

                    '<div class="tk-message">' + escapeHtml(messageText) + '</div>',
                    '<div class="tk-board">' + playersHtml + '</div>',
                    actionsHtml,
                    '<div class="tk-mini-log">' + escapeHtml(st.log[0] || "Tap one action.") + '</div>',
                '</div>',
            '</div>',
        '</div>',

        helpOverlayHtml()
    ].join("");

    setupWholeGameZoom();
    scheduleArmyRevealHide();
    scheduleActionFlashHide();

    if (!skipBotCheck) {
        maybeComputerAction();
    }
}

window.resetTinyKingdomsGame = function () {
    clearTimeout(armyRevealTimer);
    clearTimeout(actionFlashTimer);
    resetZoom();
    window.__tinyKingdomsHelpOpen = false;
    window.tinyKingdomsState = createState();
    renderTinyKingdoms();
    syncTinyKingdoms();
    maybeComputerAction();
};

window.handleIncomingTinyKingdomsSync = function (payload) {
    if (!payload || !payload.state) return;

    if (
        payload.roomGameId &&
        window.chaserGame &&
        window.chaserGame.activeGameId &&
        payload.roomGameId !== window.chaserGame.activeGameId
    ) {
        return;
    }

    window.tinyKingdomsState = payload.state;

    if (window.chaserGame) {
        window.chaserGame.activeGame = "TinyKingdoms";
    }

    renderTinyKingdoms();
    maybeComputerAction();
};

window.initTinyKingdomsGame = function () {
    window.chaserGame = window.chaserGame || {};
    window.chaserGame.activeGame = "TinyKingdoms";

    openStage();
    setHeader();

    const amHost = window.chaserGame && window.chaserGame.hostId === getMyId();

    if (amHost || !window.tinyKingdomsState) {
        resetZoom();
        window.__tinyKingdomsHelpOpen = false;
        window.tinyKingdomsState = createState();
        syncTinyKingdoms();
    }

    renderTinyKingdoms();
    maybeComputerAction();
};

window.startTinyKingdomsFromLobby = window.initTinyKingdomsGame;
window.startTinyKingdomsGame = window.initTinyKingdomsGame;
window.initTinyKingdoms = window.initTinyKingdomsGame;
window.renderTinyKingdoms = renderTinyKingdoms;

})();
