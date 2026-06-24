/* CHASER TINY KINGDOMS - SEPARATE GAME FILE
Small-screen strategy kingdom game.
1 player vs computer or 2-player synced.
*/
;(function () {
"use strict";

const MAX_ROUNDS = 8;
const MAX_PLAYERS = 2;
const BOT_ID = "tiny-kingdoms-computer";
const BOT_DELAY = 6000;

let botTimer = null;

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
        winners: []
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

function applyAction(st, p, action) {
    let text = "";

    if (action === "farm") {
        p.food += 3;
        p.score += 1;
        text = "Farm +3 food";
        p.lastAction = "🍞 Farm +3";
    }

    if (action === "trade") {
        p.coins += 3;
        p.score += 1;
        text = "Trade +3 coins";
        p.lastAction = "🪙 Trade +3";
    }

    if (action === "study") {
        p.science += 2;
        p.score += 1;
        text = "Study +2";
        p.lastAction = "📚 Study +2";
    }

    if (action === "train") {
        p.army += 2;
        p.score += 1;
        text = "Train +2 army";
        p.lastAction = "⚔️ Train +2";
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
    }

    if (action === "raid") {
        const target = strongestOpponent(p);

        if (!target) {
            st.message = "No kingdom to raid.";
            return false;
        }

        if (p.army > target.army) {
            stealOneResource(target, p);
            stealOneResource(target, p);
            p.score += 3;
            text = "Raid +3";
            p.lastAction = "🔥 Raid +3";
        } else {
            p.army += 1;
            p.score += 1;
            text = "Raid failed";
            p.lastAction = "🔥 Raid failed";
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

function resourceTile(icon, label, value) {
    const amount = Number(value || 0);
    const hasValue = amount > 0 ? " has-value" : "";

    return (
        '<div class="tk-resource' + hasValue + '">' +
            '<div class="tk-resource-icon">' + icon + '</div>' +
            '<div class="tk-resource-num">' + amount + '</div>' +
            '<div class="tk-resource-label">' + label + '</div>' +
        '</div>'
    );
}

function playerCard(p, index) {
    const st = window.tinyKingdomsState;
    const turn = st.phase === "playing" && st.turnIndex === index;
    const winner = st.winners.indexOf(p.id) !== -1;

    return (
        '<div class="tk-player-card ' + (turn ? "turn " : "") + (winner ? "winner " : "") + '">' +
            '<div class="tk-player-top">' +
                '<div class="tk-player-name">' + escapeHtml(p.name) + '</div>' +
                '<div class="tk-score">' + Number(p.score || 0) + '</div>' +
            '</div>' +
            '<div class="tk-last">' + escapeHtml(p.lastAction || "") + '</div>' +
            '<div class="tk-resource-grid">' +
                resourceTile("🍞", "Food", p.food) +
                resourceTile("🪙", "Coins", p.coins) +
                resourceTile("📚", "Study", p.science) +
                resourceTile("⚔️", "Army", p.army) +
                resourceTile("✨", "Wonder", p.wonder) +
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
            '<div class="tk-help-card">' +
                '<div class="tk-help-title">How to Play</div>' +

                '<p><b>Goal:</b> Most points after 8 rounds.</p>' +
                '<p>Each turn, tap one action. Red border shows whose turn it is.</p>' +

                '<div class="tk-help-row"><b>🍞 Farm:</b> +3 food, +1 point. Food helps build Wonders.</div>' +
                '<div class="tk-help-row"><b>🪙 Trade:</b> +3 coins, +1 point. Coins help build Wonders.</div>' +
                '<div class="tk-help-row"><b>📚 Study:</b> +2 study, +1 point. Study gives good end bonus.</div>' +
                '<div class="tk-help-row"><b>⚔️ Train:</b> +2 army, +1 point. Army helps with Raid.</div>' +
                '<div class="tk-help-row"><b>✨ Wonder:</b> Costs 🍞2 🪙2 📚1. Big points.</div>' +
                '<div class="tk-help-row"><b>🔥 Raid:</b> If your army is higher, steal resources and get +3.</div>' +

                '<p><b>End bonus:</b> Leftover resources add points.</p>' +
                '<p><b>Zoom:</b> Pinch anywhere on the game. Drag to move. Double tap to reset.</p>' +

                '<button class="tk-help-close" onclick="closeTinyKingdomsHelp()" type="button">Close ✕</button>' +
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

    const playersHtml = st.players.map(function (p, index) {
        return playerCard(p, index);
    }).join("");

    const actionsHtml = st.phase === "playing"
        ? (
            '<div class="tk-actions">' +
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
            '.tk-board{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 auto;}',
            '.tk-player-card{background:#e2f0d9;color:#1e4620;border:4px solid transparent;border-radius:17px;padding:9px;box-sizing:border-box;box-shadow:0 4px 12px rgba(0,0,0,.35);}',
            '.tk-player-card.turn{border-color:#ff0000;box-shadow:0 0 0 2px #ff0000,0 4px 12px rgba(0,0,0,.35);}',
            '.tk-player-card.winner{border-color:#ffd700;box-shadow:0 0 0 2px #ffd700,0 4px 12px rgba(0,0,0,.35);}',
            '.tk-player-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px;}',
            '.tk-player-name{font-size:18px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;}',
            '.tk-score{background:#1e4620;color:#ffd700;border-radius:999px;min-width:46px;padding:7px 9px;font-size:23px;font-weight:900;}',
            '.tk-last{height:19px;font-size:13px;font-weight:900;color:#7a1b1b;margin:3px 0 7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.tk-resource-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;}',
            '.tk-resource{background:#ffffff;border:3px solid #cfe4c3;border-radius:12px;padding:6px 2px;box-sizing:border-box;min-width:0;box-shadow:inset 0 2px 5px rgba(0,0,0,.12);}',
            '.tk-resource.has-value{border-color:#ffd700;}',
            '.tk-resource-icon{font-size:25px;line-height:1;}',
            '.tk-resource-num{font-size:23px;font-weight:900;line-height:1.05;margin-top:2px;color:#1e4620;}',
            '.tk-resource-label{font-size:10px;font-weight:900;text-transform:uppercase;color:#366b3d;}',
            '.tk-bonus{font-size:13px;font-weight:900;color:#1e4620;margin-top:5px;}',
            '.tk-actions{margin:10px auto 7px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}',
            '.tk-action,.tk-new{border:none;border-radius:14px;background:#e2f0d9;color:#1e4620;font-weight:900;box-shadow:0 3px 8px rgba(0,0,0,.35);padding:8px 5px;min-height:74px;}',
            '.tk-action span{display:block;font-size:28px;line-height:1;}',
            '.tk-action b{display:block;font-size:17px;margin-top:3px;}',
            '.tk-action small{display:block;font-size:11px;line-height:1.1;color:#3c6f41;}',
            '.tk-action.gold{background:#ffd700;}',
            '.tk-action.red{background:#ffc9c9;color:#7a1010;}',
            '.tk-action:disabled{background:#777!important;color:#222!important;box-shadow:none!important;opacity:.55;}',
            '.tk-new{grid-column:1 / -1;background:#ffd700;font-size:20px;min-height:52px;}',
            '.tk-mini-log{background:rgba(0,0,0,.22);border:2px solid rgba(255,215,0,.35);border-radius:12px;padding:7px;color:#e2f0d9;font-size:13px;font-weight:900;line-height:1.2;margin-top:7px;min-height:18px;}',
            '.tk-help-overlay{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:70000;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;}',
            '.tk-help-card{position:relative;background:#e2f0d9;color:#1e4620;border:4px solid #ffd700;border-radius:18px;max-width:560px;width:100%;max-height:82vh;overflow-y:auto;text-align:left;padding:16px 16px 66px;box-sizing:border-box;box-shadow:0 8px 24px rgba(0,0,0,.55);font-size:15px;line-height:1.25;}',
            '.tk-help-title{text-align:center;color:#1e4620;font-size:24px;font-weight:900;margin-bottom:8px;}',
            '.tk-help-card p{margin:7px 0;}',
            '.tk-help-row{background:#ffffff;border-radius:10px;padding:7px 8px;margin:6px 0;font-weight:700;}',
            '.tk-help-close{position:absolute;right:12px;bottom:12px;border:none;border-radius:999px;background:#b00020;color:#ffffff;font-size:16px;font-weight:900;padding:10px 15px;}',
            '@media(max-width:430px){.tk-zoom-viewport{padding:7px 6px 88px;}.tk-top{grid-template-columns:1fr 94px;gap:6px;margin-bottom:7px;}.tk-round{font-size:18px;padding:8px 6px;}.tk-help-btn{font-size:17px;}.tk-message{font-size:17px;margin-bottom:7px;}.tk-board{gap:6px;}.tk-player-card{padding:7px;border-radius:14px;}.tk-player-name{font-size:15px;}.tk-score{font-size:20px;min-width:36px;padding:6px 7px;}.tk-last{font-size:11px;height:16px;margin-bottom:5px;}.tk-resource-grid{gap:3px;}.tk-resource{padding:5px 1px;border-radius:9px;border-width:2px;}.tk-resource-icon{font-size:20px;}.tk-resource-num{font-size:20px;}.tk-resource-label{font-size:8px;}.tk-actions{gap:6px;margin-top:8px;}.tk-action{min-height:65px;padding:7px 3px;}.tk-action span{font-size:23px;}.tk-action b{font-size:14px;}.tk-action small{font-size:9px;}.tk-mini-log{font-size:12px;padding:6px;}.tk-help-card{font-size:14px;max-height:84vh;padding:14px 13px 62px;}.tk-help-title{font-size:22px;}}',
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

    if (!skipBotCheck) {
        maybeComputerAction();
    }
}

window.resetTinyKingdomsGame = function () {
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
