/* CHASER TINY KINGDOMS - SEPARATE GAME FILE
Small-screen strategy kingdom game.
1 player vs computer or 2-player synced.
*/
;(function () {
"use strict";

const MAX_ROUNDS = 8;
const MAX_PLAYERS = 2;
const BOT_ID = "tiny-kingdoms-computer";
const BOT_DELAY = 900;

let botTimer = null;

function byId(id) {
return document.getElementById(id);
}

function canvas() {
return byId("gameCanvasContainer");
}

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

```
if (roomDisplay) roomDisplay.innerText = "🏰 Tiny Kingdoms";
if (headerBtns) headerBtns.style.display = "none";
if (chatHeader) chatHeader.classList.add("game-active-mode");
```

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

```
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
```

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
st.log = st.log.slice(0, 5);
}

function myPlayer() {
const st = window.tinyKingdomsState;
if (!st) return null;

```
return st.players.find(function (p) {
    return p.id === getMyId();
}) || null;
```

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

```
for (let i = 1; i <= st.players.length; i++) {
    const idx = (fromIndex + i) % st.players.length;
    const p = st.players[idx];

    if (p && !p.acted) return idx;
}

return fromIndex;
```

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

```
return st.players
    .filter(function (p) {
        return p.id !== player.id;
    })
    .sort(function (a, b) {
        return (b.coins + b.food + b.science + b.score) - (a.coins + a.food + a.science + a.score);
    })[0] || null;
```

}

function stealOneResource(fromPlayer, toPlayer) {
if (fromPlayer.coins > 0) {
fromPlayer.coins -= 1;
toPlayer.coins += 1;
return "coin";
}

```
if (fromPlayer.food > 0) {
    fromPlayer.food -= 1;
    toPlayer.food += 1;
    return "food";
}

if (fromPlayer.science > 0) {
    fromPlayer.science -= 1;
    toPlayer.science += 1;
    return "science";
}

return "";
```

}

function applyAction(st, p, action) {
let text = "";

```
if (action === "farm") {
    p.food += 3;
    p.score += 1;
    text = "grew food";
    p.lastAction = "🍞 Farm +3";
}

if (action === "trade") {
    p.coins += 3;
    p.score += 1;
    text = "filled the market";
    p.lastAction = "🪙 Trade +3";
}

if (action === "study") {
    p.science += 2;
    p.score += 1;
    text = "studied old maps";
    p.lastAction = "📚 Study +2";
}

if (action === "train") {
    p.army += 2;
    p.score += 1;
    text = "trained guards";
    p.lastAction = "⚔️ Train +2";
}

if (action === "wonder") {
    if (!canBuildWonder(p)) {
        st.message = "Need 🍞2, 🪙2, and 📚1 to build a Wonder.";
        return false;
    }

    p.food -= 2;
    p.coins -= 2;
    p.science -= 1;
    p.wonder += 1;
    p.score += 6 + p.wonder;
    text = "built a Wonder";
    p.lastAction = "✨ Wonder +" + (6 + p.wonder);
}

if (action === "raid") {
    const target = strongestOpponent(p);

    if (!target) {
        st.message = "No kingdom to raid.";
        return false;
    }

    if (p.army > target.army) {
        const stolenA = stealOneResource(target, p);
        const stolenB = stealOneResource(target, p);
        p.score += 3;
        text = "raided " + target.name;

        if (stolenA || stolenB) {
            p.lastAction = "🔥 Raid +3";
        } else {
            p.lastAction = "🔥 Raid +3";
        }
    } else {
        p.army += 1;
        p.score += 1;
        text = "failed a raid, but learned";
        p.lastAction = "🔥 Raid failed";
    }
}

p.acted = true;
st.message = p.name + " " + text + ".";
addLog(st, p.name + ": " + p.lastAction);

return true;
```

}

function advanceAfterAction(st) {
if (allPlayersActed(st)) {
if (st.round >= st.maxRounds) {
finishGame(st);
return;
}

```
    st.round += 1;

    st.players.forEach(function (p) {
        p.acted = false;
    });

    st.turnIndex = (st.round - 1) % st.players.length;
    st.message = "Round " + st.round + " begins. " + st.players[st.turnIndex].name + " goes first.";
    addLog(st, "Round " + st.round + " begins.");
    return;
}

st.turnIndex = nextTurnIndex(st.turnIndex);
st.message = st.players[st.turnIndex].name + " to act.";
```

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

```
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
}).join(" & ") + " win with " + bestScore + " points.";

st.message = st.finalMessage;
addLog(st, st.finalMessage);
```

}

window.tinyKingdomsAction = function (action) {
const st = window.tinyKingdomsState;
const p = myPlayer();

```
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
```

};

function computerPickAction(p) {
const opponent = strongestOpponent(p);

```
if (canBuildWonder(p) && Math.random() < 0.55) return "wonder";

if (opponent && p.army > opponent.army + 1 && Math.random() < 0.45) return "raid";

if (p.food < 2) return "farm";
if (p.coins < 2) return "trade";
if (p.science < 1) return "study";
if (opponent && p.army <= opponent.army && Math.random() < 0.4) return "train";

const choices = ["farm", "trade", "study", "train", "raid"];
return choices[Math.floor(Math.random() * choices.length)];
```

}

function computerAction() {
const st = window.tinyKingdomsState;
const p = currentPlayer();

```
if (!st || st.phase !== "playing" || !p || !p.isComputer || p.acted) return;

const action = computerPickAction(p);
const ok = applyAction(st, p, action);

if (ok) {
    advanceAfterAction(st);
}

renderTinyKingdoms();
syncTinyKingdoms();
maybeComputerAction();
```

}

function maybeComputerAction() {
clearTimeout(botTimer);

```
const st = window.tinyKingdomsState;
if (!st || st.phase !== "playing") return;

const p = currentPlayer();
if (!p || !p.isComputer) return;

botTimer = setTimeout(computerAction, BOT_DELAY);
```

}

function resourceTile(icon, label, value) {
return (
'<div class="tk-resource">' +
'<div class="tk-resource-icon">' + icon + '</div>' +
'<div class="tk-resource-num">' + Number(value || 0) + '</div>' +
'<div class="tk-resource-label">' + label + '</div>' +
'</div>'
);
}

function playerCard(p, index) {
const st = window.tinyKingdomsState;
const turn = st.phase === "playing" && st.turnIndex === index;
const winner = st.winners.indexOf(p.id) !== -1;

```
return (
    '<div class="tk-player-card ' + (turn ? "turn " : "") + (winner ? "winner " : "") + '">' +
        '<div class="tk-player-top">' +
            '<div class="tk-player-name">' + escapeHtml(p.name) + '</div>' +
            '<div class="tk-score">' + Number(p.score || 0) + '</div>' +
        '</div>' +
        '<div class="tk-last">' + escapeHtml(p.lastAction || "Kingdom ready") + '</div>' +
        '<div class="tk-resource-grid">' +
            resourceTile("🍞", "Food", p.food) +
            resourceTile("🪙", "Coins", p.coins) +
            resourceTile("📚", "Study", p.science) +
            resourceTile("⚔️", "Army", p.army) +
            resourceTile("✨", "Wonder", p.wonder) +
        '</div>' +
        '<div class="tk-map-row">' +
            '<span class="tk-building farm">🌾</span>' +
            '<span class="tk-building market">🏪</span>' +
            '<span class="tk-building library">🏛️</span>' +
            '<span class="tk-building barracks">🛡️</span>' +
            '<span class="tk-building wonder">🗼</span>' +
        '</div>' +
        (st.phase === "gameover" ? '<div class="tk-bonus">End bonus: +' + Number(p.endBonus || 0) + '</div>' : '') +
    '</div>'
);
```

}

function actionButton(action, icon, title, sub, disabled, extraClass) {
return (
'<button class="tk-action ' + (extraClass || "") + '" onclick="tinyKingdomsAction('' + action + '')" ' + (disabled ? "disabled" : "") + ' type="button">' +
'<span>' + icon + '</span>' +
'<b>' + title + '</b>' +
'<small>' + sub + '</small>' +
'</button>'
);
}

function renderTinyKingdoms() {
const el = canvas();
const st = window.tinyKingdomsState;

```
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
            actionButton("wonder", "✨", "Wonder", "costs resources", buildDisabled, "gold") +
            actionButton("raid", "🔥", "Raid", "army test", !canAct, "red") +
        '</div>'
    )
    : (
        '<div class="tk-actions">' +
            '<button class="tk-new" onclick="resetTinyKingdomsGame()" type="button">New Kingdom</button>' +
        '</div>'
    );

const logHtml = st.log.length
    ? st.log.map(function (line) {
        return '<div class="tk-log-line">' + escapeHtml(line) + '</div>';
    }).join("")
    : '<div class="tk-log-line">Choose one action each turn.</div>';

el.innerHTML = [
    '<style>',
        '.tk-wrap{width:100%;height:100%;overflow-y:auto;overflow-x:hidden;box-sizing:border-box;padding:8px 8px 84px;color:#e2f0d9;font-family:Arial,sans-serif;text-align:center;background:linear-gradient(180deg,#092a12,#031906);}',
        '.tk-title{color:#ffd700;font-size:22px;font-weight:900;margin:2px auto 4px;text-shadow:0 2px 5px rgba(0,0,0,.5);}',
        '.tk-top{max-width:620px;margin:0 auto 7px;display:grid;grid-template-columns:1fr 1fr;gap:7px;}',
        '.tk-pill{background:#e2f0d9;color:#1e4620;border-radius:13px;padding:7px 6px;font-weight:900;box-shadow:0 3px 8px rgba(0,0,0,.35);}',
        '.tk-pill small{display:block;font-size:11px;margin-top:1px;}',
        '.tk-message{max-width:620px;margin:0 auto 8px;color:#ffd700;font-size:14px;font-weight:900;line-height:1.2;min-height:18px;}',
        '.tk-board{max-width:720px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:8px;}',
        '.tk-player-card{background:#e2f0d9;color:#1e4620;border:3px solid transparent;border-radius:16px;padding:8px;box-sizing:border-box;box-shadow:0 4px 12px rgba(0,0,0,.35);}',
        '.tk-player-card.turn{border-color:#ff0000;box-shadow:0 0 0 2px #ff0000,0 4px 12px rgba(0,0,0,.35);}',
        '.tk-player-card.winner{border-color:#ffd700;box-shadow:0 0 0 2px #ffd700,0 4px 12px rgba(0,0,0,.35);}',
        '.tk-player-top{display:flex;align-items:center;justify-content:space-between;gap:8px;}',
        '.tk-player-name{font-size:15px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;}',
        '.tk-score{background:#1e4620;color:#ffd700;border-radius:999px;min-width:36px;padding:5px 7px;font-size:17px;font-weight:900;}',
        '.tk-last{height:17px;font-size:11px;font-weight:900;color:#7a1b1b;margin:3px 0 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
        '.tk-resource-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;}',
        '.tk-resource{background:#ffffff;border:2px solid #cfe4c3;border-radius:10px;padding:4px 2px;box-sizing:border-box;min-width:0;}',
        '.tk-resource-icon{font-size:18px;line-height:1;}',
        '.tk-resource-num{font-size:17px;font-weight:900;line-height:1.05;margin-top:1px;}',
        '.tk-resource-label{font-size:8px;font-weight:900;text-transform:uppercase;color:#366b3d;}',
        '.tk-map-row{display:flex;justify-content:center;gap:4px;margin-top:7px;flex-wrap:wrap;}',
        '.tk-building{background:#123d18;color:#ffd700;border:2px solid #ffd700;border-radius:9px;width:30px;height:28px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:inset 0 2px 5px rgba(0,0,0,.35);}',
        '.tk-bonus{font-size:11px;font-weight:900;color:#1e4620;margin-top:5px;}',
        '.tk-actions{max-width:620px;margin:9px auto 6px;display:grid;grid-template-columns:repeat(3,1fr);gap:7px;}',
        '.tk-action,.tk-new{border:none;border-radius:13px;background:#e2f0d9;color:#1e4620;font-weight:900;box-shadow:0 3px 8px rgba(0,0,0,.35);padding:7px 5px;min-height:64px;}',
        '.tk-action span{display:block;font-size:20px;line-height:1;}',
        '.tk-action b{display:block;font-size:13px;margin-top:2px;}',
        '.tk-action small{display:block;font-size:9px;line-height:1.1;color:#3c6f41;}',
        '.tk-action.gold{background:#ffd700;}',
        '.tk-action.red{background:#ffc9c9;color:#7a1010;}',
        '.tk-action:disabled{background:#777!important;color:#222!important;box-shadow:none!important;opacity:.55;}',
        '.tk-new{grid-column:1 / -1;background:#ffd700;font-size:18px;min-height:48px;}',
        '.tk-log{max-width:620px;margin:7px auto 0;background:rgba(0,0,0,.22);border:2px solid rgba(255,215,0,.35);border-radius:12px;padding:6px;color:#e2f0d9;font-size:11px;font-weight:900;line-height:1.25;}',
        '.tk-log-line{padding:1px 0;}',
        '.tk-help{max-width:620px;margin:6px auto 0;color:#e2f0d9;font-size:10px;line-height:1.2;opacity:.85;}',
        '@media(max-width:430px){.tk-wrap{padding:7px 6px 88px;}.tk-title{font-size:19px;}.tk-board{gap:6px;}.tk-player-card{padding:6px;border-radius:14px;}.tk-player-name{font-size:13px;}.tk-score{font-size:15px;min-width:30px;padding:4px 5px;}.tk-resource-grid{gap:3px;}.tk-resource{padding:3px 1px;border-radius:8px;}.tk-resource-icon{font-size:15px;}.tk-resource-num{font-size:15px;}.tk-resource-label{font-size:7px;}.tk-building{width:25px;height:24px;font-size:14px;}.tk-actions{gap:6px;}.tk-action{min-height:58px;padding:6px 3px;}.tk-action span{font-size:18px;}.tk-action b{font-size:12px;}.tk-action small{font-size:8px;}}',
    '</style>',

    '<div class="tk-wrap">',
        '<div class="tk-title">🏰 Tiny Kingdoms</div>',
        '<div class="tk-top">',
            '<div class="tk-pill">Round ' + Number(st.round || 1) + ' / ' + Number(st.maxRounds || MAX_ROUNDS) + '<small>Build before winter</small></div>',
            '<div class="tk-pill">' + escapeHtml(st.phase === "gameover" ? "Final Score" : "Turn") + '<small>' + escapeHtml(currentPlayer() ? currentPlayer().name : "Done") + '</small></div>',
        '</div>',
        '<div class="tk-message">' + escapeHtml(st.message || "") + '</div>',
        '<div class="tk-board">' + playersHtml + '</div>',
        actionsHtml,
        '<div class="tk-log">' + logHtml + '</div>',
        '<div class="tk-help">Actions are visual: 🍞 food, 🪙 coins, 📚 study, ⚔️ army, ✨ wonders, 🔥 raid. After 8 rounds, leftover resources become bonus points.</div>',
    '</div>'
].join("");

maybeComputerAction();
```

}

window.resetTinyKingdomsGame = function () {
window.tinyKingdomsState = createState();
renderTinyKingdoms();
syncTinyKingdoms();
maybeComputerAction();
};

window.handleIncomingTinyKingdomsSync = function (payload) {
if (!payload || !payload.state) return;

```
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
```

};

window.initTinyKingdomsGame = function () {
window.chaserGame = window.chaserGame || {};
window.chaserGame.activeGame = "TinyKingdoms";

```
openStage();
setHeader();

const amHost = window.chaserGame && window.chaserGame.hostId === getMyId();

if (amHost || !window.tinyKingdomsState) {
    window.tinyKingdomsState = createState();
    syncTinyKingdoms();
}

renderTinyKingdoms();
maybeComputerAction();
```

};

window.startTinyKingdomsFromLobby = window.initTinyKingdomsGame;
window.startTinyKingdomsGame = window.initTinyKingdomsGame;
window.initTinyKingdoms = window.initTinyKingdomsGame;
window.renderTinyKingdoms = renderTinyKingdoms;

})();

