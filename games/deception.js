/* CHASER - DEALS & DECEIT
   Save as: games/deception.js

   Opens from your index button:
   launchGameEngine('Deception', '🎭')

   Also works manually with:
   window.startDeceptionGame()
*/
;(function () {
  "use strict";

  const GAME_TITLE = "Deals & Deceit";
  const MAX_ROUNDS = 6;

  const COLORS = ["Red", "Blue", "Green", "Yellow"];
  const SHAPES = ["Circle", "Square", "Triangle", "Star"];

  const STARTING_MONEY = 20;
  const VOTER_BONUS = 3;
  const EXPOSE_REWARD = 5;

  const ROUND_PAYOUTS = [0, 20, 25, 30, 35, 40, 50];

  const BOT_NAMES = [
    "Alex", "Bailey", "Casey", "Dakota", "Emerson", "Finley", "Gray",
    "Harper", "Indigo", "Jordan", "Kai", "Logan", "Morgan", "Nova",
    "Parker", "Quinn", "River", "Skyler", "Taylor", "Wren"
  ];

  const SHAPE_SYMBOL = {
    Circle: "●",
    Square: "■",
    Triangle: "▲",
    Star: "★"
  };

  const COLOR_HEX = {
    Red: "#e34848",
    Blue: "#407ee8",
    Green: "#35a857",
    Yellow: "#f0bf2f"
  };

  const SECRET_GOALS = [
    {
      id: "bigSaver",
      title: "Big Saver",
      text: "Finish with at least $75 cash.",
      bonus: 15,
      test: function (player) {
        return player.money >= 75;
      }
    },
    {
      id: "kingmaker",
      title: "Kingmaker",
      text: "Vote for the round winner at least 3 times.",
      bonus: 15,
      test: function (player) {
        return player.stats.votedWinner >= 3;
      }
    },
    {
      id: "quietThreat",
      title: "Quiet Threat",
      text: "Win zero rounds but still finish top 3 before bonuses.",
      bonus: 20,
      test: function (player, context) {
        return player.stats.roundWins === 0 && context.baseRank <= 3;
      }
    },
    {
      id: "finalStrike",
      title: "Final Strike",
      text: "Win the final round.",
      bonus: 15,
      test: function (player) {
        return !!player.stats.finalRoundWin;
      }
    },
    {
      id: "honestBroker",
      title: "Honest Broker",
      text: "Accept at least 2 deals and break no promises.",
      bonus: 10,
      test: function (player) {
        return player.stats.acceptedDeals >= 2 && player.stats.promisesBroken === 0;
      }
    },
    {
      id: "Clean Liar",
      title: "Clean Liar",
      text: "Break at least 1 promise and never get exposed.",
      bonus: 15,
      test: function (player) {
        return player.stats.promisesBroken >= 1 && player.stats.exposed === 0;
      }
    },
    {
      id: "Crowd Favorite",
      title: "Crowd Favorite",
      text: "Win at least 2 rounds.",
      bonus: 10,
      test: function (player) {
        return player.stats.roundWins >= 2;
      }
    }
  ];

  let state = null;

  function $(id) {
    return document.getElementById(id);
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function money(value) {
    return "$" + Math.max(0, Math.floor(Number(value) || 0));
  }

  function clamp(num, min, max) {
    const n = Number(num);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function choice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function shuffle(list) {
    const copy = list.slice();

    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }

    return copy;
  }

  function isHuman(player) {
    return player && player.kind === "human";
  }

  function identityName(player) {
    if (!player) return "";
    return player.color + " " + player.shape;
  }

  function finalName(player) {
    if (!player) return "";
    if (player.kind === "human") return player.realName || "You";
    return player.realName || "Bot";
  }

  function iconHtml(player, small) {
    if (!player) return "";

    const sizeClass = small ? " dd-small-icon" : "";

    return (
      '<span class="dd-player-icon' + sizeClass + '" style="--dd-color:' + COLOR_HEX[player.color] + '">' +
        '<span>' + esc(SHAPE_SYMBOL[player.shape]) + '</span>' +
      '</span>'
    );
  }

  function getPlayer(id) {
    if (!state || !state.players) return null;
    return state.players.find(function (p) {
      return p.id === id;
    }) || null;
  }

  function otherPlayers(playerId) {
    return state.players.filter(function (p) {
      return p.id !== playerId;
    });
  }

  function currentHuman() {
    if (!state || !state.players) return null;
    return state.players.find(function (p) {
      return p.kind === "human";
    }) || null;
  }

  function makeDeckIdentities() {
    const identities = [];

    COLORS.forEach(function (color) {
      SHAPES.forEach(function (shape) {
        identities.push({
          color: color,
          shape: shape
        });
      });
    });

    return shuffle(identities);
  }

  function getRandomSecretGoal() {
    return choice(SECRET_GOALS);
  }

  function getGoalById(id) {
    return SECRET_GOALS.find(function (goal) {
      return goal.id === id;
    }) || SECRET_GOALS[0];
  }

  function installStyles() {
    if ($("deals-deceit-styles")) return;

    const style = document.createElement("style");
    style.id = "deals-deceit-styles";

    style.textContent = `
      .dd-wrap {
        width: 100%;
        min-height: 100%;
        padding: 12px;
        color: #24302b;
        box-sizing: border-box;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(255,255,255,.95), rgba(255,255,255,.18)),
          linear-gradient(135deg, #eafbe7, #e8f4ff 48%, #fff4d9);
      }

      .dd-card {
        background: rgba(255,255,255,.90);
        border: 1px solid rgba(36,48,43,.14);
        border-radius: 18px;
        box-shadow: 0 10px 26px rgba(0,0,0,.08);
        padding: 12px;
        margin: 10px 0;
        box-sizing: border-box;
      }

      .dd-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 10px;
      }

      .dd-title {
        font-size: 1.25rem;
        font-weight: 900;
        letter-spacing: -.02em;
        color: #1e4620;
      }

      .dd-subtitle {
        color: #607066;
        font-size: .88rem;
        margin-top: 3px;
        line-height: 1.25;
      }

      .dd-section-title {
        font-size: .98rem;
        font-weight: 900;
        margin: 0 0 8px;
        color: #1e4620;
      }

      .dd-pillrow {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
      }

      .dd-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 6px 9px;
        border-radius: 999px;
        background: #f4f8f3;
        border: 1px solid rgba(36,48,43,.12);
        font-size: .82rem;
        font-weight: 800;
        white-space: nowrap;
      }

      .dd-money {
        background: #fff7c8;
        color: #5f4b00;
      }

      .dd-danger {
        background: #ffe1df;
        color: #8e2920;
      }

      .dd-good {
        background: #daf6df;
        color: #216534;
      }

      .dd-secret {
        background: #fff4d9;
        color: #735000;
      }

      .dd-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(116px, 1fr));
        gap: 8px;
      }

      .dd-player {
        position: relative;
        border: 1px solid rgba(36,48,43,.14);
        border-radius: 16px;
        background: rgba(255,255,255,.78);
        padding: 10px;
        min-height: 88px;
        box-sizing: border-box;
      }

      .dd-player.me {
        outline: 3px solid rgba(75,139,90,.28);
      }

      .dd-player-icon {
        width: 38px;
        height: 38px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #ffffff;
        border: 3px solid var(--dd-color);
        color: var(--dd-color);
        font-size: 23px;
        box-shadow: 0 4px 10px rgba(0,0,0,.10);
        line-height: 1;
      }

      .dd-small-icon {
        width: 26px;
        height: 26px;
        font-size: 16px;
        border-width: 2px;
        vertical-align: middle;
      }

      .dd-player-name {
        font-weight: 900;
        margin-top: 6px;
        line-height: 1.15;
      }

      .dd-player-detail {
        color: #65736b;
        font-size: .82rem;
        margin-top: 3px;
        line-height: 1.25;
      }

      .dd-row {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }

      .dd-btn {
        appearance: none;
        border: 0;
        border-radius: 14px;
        padding: 10px 12px;
        font-weight: 900;
        background: #315c3d;
        color: white;
        box-shadow: 0 4px 0 rgba(0,0,0,.12);
        cursor: pointer;
        font-family: inherit;
      }

      .dd-btn:active {
        transform: translateY(1px);
        box-shadow: 0 2px 0 rgba(0,0,0,.14);
      }

      .dd-btn:disabled {
        opacity: .48;
        cursor: not-allowed;
      }

      .dd-btn.secondary {
        background: #eef5ec;
        color: #244030;
        border: 1px solid rgba(36,48,43,.14);
      }

      .dd-btn.warn {
        background: #9b5a2b;
      }

      .dd-btn.bad {
        background: #a8322b;
      }

      .dd-btn.gold {
        background: #d7951f;
        color: #2d2308;
      }

      .dd-btn.small {
        padding: 7px 9px;
        border-radius: 12px;
        font-size: .82rem;
      }

      .dd-input,
      .dd-select {
        min-height: 40px;
        box-sizing: border-box;
        border: 1px solid rgba(36,48,43,.18);
        border-radius: 12px;
        padding: 8px 10px;
        background: white;
        color: #24302b;
        font-weight: 750;
        font-family: inherit;
      }

      .dd-input {
        max-width: 150px;
      }

      .dd-label {
        display: grid;
        gap: 4px;
        font-size: .8rem;
        color: #617067;
        font-weight: 800;
      }

      .dd-log {
        max-height: 190px;
        overflow: auto;
        display: grid;
        gap: 6px;
      }

      .dd-logitem {
        background: rgba(244,248,243,.92);
        border: 1px solid rgba(36,48,43,.10);
        border-radius: 12px;
        padding: 8px;
        font-size: .88rem;
        line-height: 1.25;
      }

      .dd-muted {
        color: #66756d;
      }

      .dd-deal {
        border: 1px solid rgba(36,48,43,.13);
        border-radius: 14px;
        padding: 9px;
        background: rgba(255,255,255,.78);
        margin: 7px 0;
      }

      .dd-deal-top {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: center;
        margin-bottom: 5px;
      }

      .dd-two {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .dd-vote-card {
        text-align: left;
        width: 100%;
        justify-content: flex-start;
      }

      .dd-results-list {
        display: grid;
        gap: 7px;
      }

      .dd-rank {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 8px;
        align-items: center;
        border: 1px solid rgba(36,48,43,.13);
        border-radius: 14px;
        padding: 9px;
        background: rgba(255,255,255,.78);
      }

      .dd-rank-num {
        font-weight: 950;
        width: 34px;
        text-align: center;
      }

      .dd-hidden-note {
        font-size: .85rem;
        padding: 8px;
        border-radius: 12px;
        background: #fff7d7;
        color: #6c5200;
        border: 1px solid rgba(150,110,0,.20);
        line-height: 1.25;
      }

      .dd-rule-list {
        display: grid;
        gap: 6px;
      }

      @media (max-width: 720px) {
        .dd-wrap {
          padding: 10px;
        }

        .dd-header {
          flex-direction: column;
        }

        .dd-two {
          grid-template-columns: 1fr;
        }

        .dd-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .dd-btn {
          padding: 10px;
        }

        .dd-rank {
          grid-template-columns: auto 1fr;
        }

        .dd-rank .dd-pill {
          grid-column: 1 / -1;
          width: fit-content;
          margin-left: 42px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function findMount() {
    const ids = [
      "gameCanvasContainer",
      "gameBoard",
      "gameArea",
      "gamesArea",
      "game-container",
      "gameContainer",
      "app"
    ];

    for (let i = 0; i < ids.length; i += 1) {
      const el = $(ids[i]);
      if (el) return el;
    }

    let root = $("deals-deceit-root");

    if (!root) {
      root = document.createElement("div");
      root.id = "deals-deceit-root";
      document.body.appendChild(root);
    }

    return root;
  }

  function openChaserGameShell() {
    const hub = $("gameHubOverlay");
    const stage = $("activeGameStage");
    const canvas = $("gameCanvasContainer");
    const headerButtons = $("headerActionButtonsContainer");
    const chatHeader = $("chatHeader");
    const roomTitle = $("roomDisplayCode");

    if (hub) hub.classList.remove("open");

    if (
      typeof window.cleanupRunningGameEngine === "function" &&
      window.cleanupRunningGameEngine !== cleanupDeceptionGame
    ) {
      try {
        window.cleanupRunningGameEngine();
      } catch (e) {}
    }

    if (stage) {
      stage.classList.add("open");
      stage.classList.remove("game-board-hidden");
    }

    if (canvas) {
      canvas.innerHTML = "";
    }

    if (headerButtons) {
      headerButtons.style.display = "none";
    }

    if (chatHeader) {
      chatHeader.classList.add("game-active-mode");
    }

    if (roomTitle) {
      roomTitle.classList.remove("youtube-pill-title");
      roomTitle.innerText = GAME_TITLE;
      roomTitle.style.fontFamily = "'Trebuchet MS', 'Arial Black', sans-serif";
      roomTitle.style.fontWeight = "900";
      roomTitle.style.fontSize = "18px";
      roomTitle.style.textIndent = "0";
    }

    window.chaserGame = window.chaserGame || {};
    window.chaserGame.activeGame = GAME_TITLE;
    window.chaserGame.activeGameName = GAME_TITLE;

    window.cleanupRunningGameEngine = cleanupDeceptionGame;
  }

  function render(shouldSync, reason) {
    installStyles();

    const mount = findMount();
    mount.innerHTML = '<div class="dd-wrap" id="ddApp">' + renderCurrent() + '</div>';

    wireEvents();

    if (shouldSync) {
      syncState(reason || "render");
    }
  }

  function renderCurrent() {
    if (!state || state.phase === "lobby") return renderLobby();
    if (state.phase === "deal") return renderDealPhase();
    if (state.phase === "vote") return renderVotePhase();
    if (state.phase === "settlement") return renderSettlementPhase();
    if (state.phase === "expose") return renderExposePhase();
    if (state.phase === "final") return renderFinal();
    return renderLobby();
  }

  function renderHeader(extra) {
    const human = currentHuman();
    const identity = human ? identityName(human) : "Hidden";
    const cash = human ? money(human.money) : "$0";
    const goal = human ? getGoalById(human.secretGoalId) : null;

    return `
      <div class="dd-header">
        <div>
          <div class="dd-title">${GAME_TITLE}</div>
          <div class="dd-subtitle">${extra || "Names stay hidden until the final reveal."}</div>
        </div>
        <div class="dd-pillrow">
          <span class="dd-pill">Round ${state.round}/${MAX_ROUNDS}</span>
          <span class="dd-pill dd-money">${cash}</span>
          <span class="dd-pill">${esc(identity)}</span>
          ${goal ? '<span class="dd-pill dd-secret">Goal: ' + esc(goal.title) + '</span>' : ""}
        </div>
      </div>
    `;
  }

  function renderLobby() {
    return `
      <div class="dd-card">
        <div class="dd-header">
          <div>
            <div class="dd-title">${GAME_TITLE}</div>
            <div class="dd-subtitle">A six-round money, voting, and betrayal game for 6 to 16 players.</div>
          </div>
          <div class="dd-pill dd-good">Bots Included</div>
        </div>

        <div class="dd-hidden-note">
          Player names stay hidden during the game. Everyone is shown only as a color + shape,
          like <b>Blue Star</b> or <b>Red Circle</b>. Real names reveal at the end.
        </div>

        <div class="dd-card">
          <div class="dd-section-title">Start a test game</div>
          <div class="dd-row">
            <label class="dd-label">Your hidden real name
              <input class="dd-input" id="ddNameInput" value="You" maxlength="18" />
            </label>

            <label class="dd-label">Total players
              <select class="dd-select" id="ddPlayerCount">
                ${Array.from({ length: 11 }, function (_, i) {
                  const n = i + 6;
                  return '<option value="' + n + '"' + (n === 8 ? " selected" : "") + '>' + n + '</option>';
                }).join("")}
              </select>
            </label>

            <button class="dd-btn" id="ddStartBtn">Start Game</button>
          </div>
        </div>

        <div class="dd-card">
          <div class="dd-section-title">Prototype rules</div>
          <div class="dd-rule-list">
            <div class="dd-logitem">Everyone starts with ${money(STARTING_MONEY)}.</div>
            <div class="dd-logitem">Each round, players make deals, then secretly vote for one public identity.</div>
            <div class="dd-logitem">The player with the most votes wins the round payout.</div>
            <div class="dd-logitem">Promises are tracked, but not forced. You can pay, half-pay, or break them.</div>
            <div class="dd-logitem">Each player has one expose token. Exposing a broken promise takes ${money(EXPOSE_REWARD)} from the liar and gives it to the exposer.</div>
            <div class="dd-logitem">Secret goals can add bonus money at the final reveal.</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderPlayersGrid(showNames) {
    return `
      <div class="dd-grid">
        ${state.players.map(function (player) {
          const nameLine = showNames
            ? esc(identityName(player)) + '<div class="dd-player-detail">Real name: <b>' + esc(finalName(player)) + '</b></div>'
            : esc(identityName(player));

          return `
            <div class="dd-player ${isHuman(player) ? "me" : ""}">
              ${iconHtml(player)}
              <div class="dd-player-name">${nameLine}</div>
              <div class="dd-player-detail">
                ${showNames ? money(player.money) : "Name hidden"}
                · Expose: ${player.exposeToken ? "yes" : "used"}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderDealPhase() {
    const human = currentHuman();
    const goal = getGoalById(human.secretGoalId);

    return `
      ${renderHeader("Deal phase. Send offers, accept offers, reject offers, or move to voting.")}
      <div class="dd-card">
        <div class="dd-section-title">Your secret goal</div>
        <div class="dd-hidden-note">
          <b>${esc(goal.title)}:</b> ${esc(goal.text)}
          Bonus: <b>${money(goal.bonus)}</b>
        </div>
      </div>

      <div class="dd-card">
        <div class="dd-section-title">Players</div>
        ${renderPlayersGrid(false)}
      </div>

      <div class="dd-two">
        <div class="dd-card">
          <div class="dd-section-title">Make a deal</div>
          ${renderDealBuilder(human)}
        </div>

        <div class="dd-card">
          <div class="dd-section-title">Incoming deals</div>
          ${renderIncomingDeals(human)}
        </div>
      </div>

      <div class="dd-two">
        <div class="dd-card">
          <div class="dd-section-title">Accepted promises involving you</div>
          ${renderAcceptedDeals(human)}
        </div>

        <div class="dd-card">
          <div class="dd-section-title">Game log</div>
          ${renderLog()}
        </div>
      </div>

      <div class="dd-card">
        <button class="dd-btn gold" id="ddGoVoteBtn">Go to Secret Vote</button>
        <button class="dd-btn secondary" id="ddRestartBtn">Restart</button>
      </div>
    `;
  }

  function renderDealBuilder(human) {
    const targets = otherPlayers(human.id);

    return `
      <div class="dd-row">
        <label class="dd-label">Send to
          <select class="dd-select" id="ddDealTo">
            ${targets.map(function (p) {
              return '<option value="' + p.id + '">' + esc(identityName(p)) + '</option>';
            }).join("")}
          </select>
        </label>

        <label class="dd-label">Deal type
          <select class="dd-select" id="ddDealType">
            <option value="payForVote">I pay them to vote for me</option>
            <option value="sellVote">I vote for them if they pay me</option>
            <option value="voteTarget">We both vote for a target</option>
            <option value="winnerSplit">If I win, I pay them</option>
          </select>
        </label>

        <label class="dd-label">Money
          <input class="dd-input" id="ddDealAmount" type="number" min="0" max="99" value="8" />
        </label>

        <label class="dd-label">Target
          <select class="dd-select" id="ddDealTarget">
            ${targets.map(function (p) {
              return '<option value="' + p.id + '">' + esc(identityName(p)) + '</option>';
            }).join("")}
          </select>
        </label>
      </div>

      <p class="dd-muted">
        Money promises are tracked, but players can still break them later.
      </p>

      <button class="dd-btn" id="ddSendDealBtn">Send Deal</button>
    `;
  }

  function renderIncomingDeals(human) {
    const incoming = state.deals.filter(function (deal) {
      return deal.to === human.id && deal.status === "pending";
    });

    if (!incoming.length) {
      return '<div class="dd-logitem dd-muted">No incoming deals right now.</div>';
    }

    return incoming.map(function (deal) {
      return renderDealCard(deal, true);
    }).join("");
  }

  function renderAcceptedDeals(human) {
    const accepted = state.deals.filter(function (deal) {
      return deal.status === "accepted" &&
        (deal.from === human.id || deal.to === human.id || deal.target === human.id);
    });

    if (!accepted.length) {
      return '<div class="dd-logitem dd-muted">No accepted promises involving you yet.</div>';
    }

    return accepted.map(function (deal) {
      return renderDealCard(deal, false);
    }).join("");
  }

  function renderDealCard(deal, incoming) {
    const from = getPlayer(deal.from);
    const to = getPlayer(deal.to);

    return `
      <div class="dd-deal">
        <div class="dd-deal-top">
          <b>${iconHtml(from, true)} ${esc(identityName(from))} → ${iconHtml(to, true)} ${esc(identityName(to))}</b>
          <span class="dd-pill">${esc(deal.status)}</span>
        </div>

        <div>${esc(dealText(deal))}</div>

        ${incoming ? `
          <div class="dd-row" style="margin-top:8px">
            <button class="dd-btn small" data-accept-deal="${deal.id}">Accept</button>
            <button class="dd-btn small secondary" data-reject-deal="${deal.id}">Reject</button>
          </div>
        ` : ""}
      </div>
    `;
  }

  function renderVotePhase() {
    const human = currentHuman();

    return `
      ${renderHeader("Secret vote. Pick the color + shape identity you want to vote for.")}
      <div class="dd-card">
        <div class="dd-section-title">Your vote cards</div>
        <div class="dd-pillrow">
          <span class="dd-pill">Color card: Red / Blue</span>
          <span class="dd-pill">Color card: Green / Yellow</span>
          <span class="dd-pill">Shape card: Circle / Square</span>
          <span class="dd-pill">Shape card: Triangle / Star</span>
        </div>
      </div>

      <div class="dd-card">
        <div class="dd-section-title">Vote for one player</div>
        <div class="dd-grid">
          ${otherPlayers(human.id).map(function (p) {
            return `
              <button class="dd-btn secondary dd-vote-card" data-vote-for="${p.id}">
                ${iconHtml(p, true)} ${esc(identityName(p))}
              </button>
            `;
          }).join("")}
        </div>
      </div>

      <div class="dd-card">
        <div class="dd-section-title">Accepted promises involving you</div>
        ${renderAcceptedDeals(human)}
      </div>
    `;
  }

  function renderSettlementPhase() {
    const human = currentHuman();

    const owedByHuman = state.deals.filter(function (deal) {
      return deal.status === "accepted" &&
        deal.moneyOwed &&
        deal.payer === human.id &&
        deal.round === state.round &&
        deal.settlement === "unsettled";
    });

    return `
      ${renderHeader("Settlement phase. Decide whether to keep your money promises.")}
      <div class="dd-card">
        <div class="dd-section-title">Round ${state.round} results</div>
        ${renderVoteResults()}
      </div>

      <div class="dd-card">
        <div class="dd-section-title">Your promises to settle</div>
        ${owedByHuman.length ? owedByHuman.map(renderHumanSettlementCard).join("") : '<div class="dd-logitem dd-muted">You do not owe any unsettled money this round.</div>'}
      </div>

      <div class="dd-card">
        <button class="dd-btn gold" id="ddFinishSettlementBtn">Finish Settlement</button>
      </div>

      <div class="dd-card">
        <div class="dd-section-title">Game log</div>
        ${renderLog()}
      </div>
    `;
  }

  function renderHumanSettlementCard(deal) {
    const payee = getPlayer(deal.payee);
    const amount = deal.moneyOwed || 0;
    const half = Math.floor(amount / 2);

    return `
      <div class="dd-deal">
        <div>
          <b>You promised ${iconHtml(payee, true)} ${esc(identityName(payee))} ${money(amount)}.</b>
        </div>

        <div class="dd-muted">${esc(dealText(deal))}</div>

        <div class="dd-row" style="margin-top:8px">
          <button class="dd-btn small" data-settle-full="${deal.id}">Pay Full ${money(amount)}</button>
          <button class="dd-btn small warn" data-settle-half="${deal.id}">Pay Half ${money(half)}</button>
          <button class="dd-btn small bad" data-settle-break="${deal.id}">Break Promise</button>
        </div>
      </div>
    `;
  }

  function renderExposePhase() {
    const human = currentHuman();

    const brokenAgainstHuman = state.deals.filter(function (deal) {
      return deal.status === "accepted" &&
        deal.settlement === "broken" &&
        deal.payee === human.id &&
        !deal.exposed &&
        human.exposeToken;
    });

    return `
      ${renderHeader("Expose phase. You can punish one broken promise, or save your expose token.")}
      <div class="dd-card">
        <div class="dd-section-title">Broken promises against you</div>
        ${brokenAgainstHuman.length ? brokenAgainstHuman.map(function (deal) {
          const liar = getPlayer(deal.payer);

          return `
            <div class="dd-deal">
              <div>
                <b>${iconHtml(liar, true)} ${esc(identityName(liar))} broke a ${money(deal.moneyOwed)} promise to you.</b>
              </div>

              <button class="dd-btn small bad" data-expose="${deal.id}">Expose Them</button>
            </div>
          `;
        }).join("") : '<div class="dd-logitem dd-muted">No expose option right now.</div>'}
      </div>

      <div class="dd-card">
        <button class="dd-btn gold" id="ddNextRoundBtn">${state.round >= MAX_ROUNDS ? "Final Results" : "Next Round"}</button>
      </div>

      <div class="dd-card">
        <div class="dd-section-title">Game log</div>
        ${renderLog()}
      </div>
    `;
  }

  function renderFinal() {
    const ranked = finalRankedPlayers();

    return `
      <div class="dd-card">
        <div class="dd-header">
          <div>
            <div class="dd-title">Final Reveal</div>
            <div class="dd-subtitle">Names are revealed now. Top 3 win prizes.</div>
          </div>

          <button class="dd-btn secondary" id="ddRestartBtn">Restart</button>
        </div>

        <div class="dd-results-list">
          ${ranked.map(function (entry, index) {
            const p = entry.player;
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "#" + (index + 1);
            const goal = getGoalById(p.secretGoalId);

            return `
              <div class="dd-rank">
                <div class="dd-rank-num">${medal}</div>

                <div>
                  <b>${iconHtml(p, true)} ${esc(identityName(p))}</b>
                  <div class="dd-player-detail">
                    Real name: <b>${esc(finalName(p))}</b>${isHuman(p) ? " — you" : ""}
                  </div>
                  <div class="dd-player-detail">
                    Goal: <b>${esc(goal.title)}</b>
                    ${entry.goalBonus > 0 ? " +" + money(entry.goalBonus) : " missed"}
                  </div>
                </div>

                <div class="dd-pill dd-money">
                  ${money(entry.total)}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <div class="dd-card">
        <div class="dd-section-title">Final identities</div>
        ${renderPlayersGrid(true)}
      </div>

      <div class="dd-card">
        <div class="dd-section-title">Full game log</div>
        ${renderLog(70)}
      </div>
    `;
  }

  function renderVoteResults() {
    const entries = Object.keys(state.lastVoteCounts || {}).map(function (id) {
      return {
        player: getPlayer(id),
        count: state.lastVoteCounts[id]
      };
    }).filter(function (entry) {
      return entry.player;
    }).sort(function (a, b) {
      return b.count - a.count;
    });

    const winner = getPlayer(state.lastWinnerId);

    return `
      <div class="dd-logitem">
        Winner:
        <b>${iconHtml(winner, true)} ${esc(identityName(winner))}</b>
        earned <b>${money(ROUND_PAYOUTS[state.round])}</b>.
      </div>

      ${entries.map(function (entry) {
        return `
          <div class="dd-logitem">
            ${iconHtml(entry.player, true)} ${esc(identityName(entry.player))}:
            <b>${entry.count}</b> vote${entry.count === 1 ? "" : "s"}
          </div>
        `;
      }).join("")}
    `;
  }

  function renderLog(limit) {
    const count = limit || 12;
    const items = state.log.slice(-count).reverse();

    if (!items.length) {
      return '<div class="dd-logitem dd-muted">No log yet.</div>';
    }

    return '<div class="dd-log">' + items.map(function (item) {
      return '<div class="dd-logitem">' + esc(item) + '</div>';
    }).join("") + '</div>';
  }

  function wireEvents() {
    const root = $("ddApp") || document;

    const startBtn = $("ddStartBtn");
    if (startBtn) {
      startBtn.addEventListener("click", function () {
        const total = clamp($("ddPlayerCount").value, 6, 16);
        const name = $("ddNameInput").value.trim() || "You";
        startNewGame(total, name);
      });
    }

    const restartBtn = $("ddRestartBtn");
    if (restartBtn) {
      restartBtn.addEventListener("click", function () {
        state = {
          phase: "lobby",
          round: 1
        };

        render(true, "restart");
      });
    }

    const sendDealBtn = $("ddSendDealBtn");
    if (sendDealBtn) {
      sendDealBtn.addEventListener("click", makeHumanDeal);
    }

    root.querySelectorAll("[data-accept-deal]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        acceptDeal(btn.getAttribute("data-accept-deal"));
        render(true, "accept-deal");
      });
    });

    root.querySelectorAll("[data-reject-deal]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        rejectDeal(btn.getAttribute("data-reject-deal"));
        render(true, "reject-deal");
      });
    });

    const goVoteBtn = $("ddGoVoteBtn");
    if (goVoteBtn) {
      goVoteBtn.addEventListener("click", function () {
        state.phase = "vote";
        render(true, "go-vote");
      });
    }

    root.querySelectorAll("[data-vote-for]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        castHumanVote(btn.getAttribute("data-vote-for"));
      });
    });

    root.querySelectorAll("[data-settle-full]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        settleDeal(btn.getAttribute("data-settle-full"), "full");
        render(true, "settle-full");
      });
    });

    root.querySelectorAll("[data-settle-half]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        settleDeal(btn.getAttribute("data-settle-half"), "half");
        render(true, "settle-half");
      });
    });

    root.querySelectorAll("[data-settle-break]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        settleDeal(btn.getAttribute("data-settle-break"), "break");
        render(true, "settle-break");
      });
    });

    const finishSettlementBtn = $("ddFinishSettlementBtn");
    if (finishSettlementBtn) {
      finishSettlementBtn.addEventListener("click", function () {
        autoSettleUnsettledHumanDeals();
        autoExposeBots();
        state.phase = "expose";
        render(true, "finish-settlement");
      });
    }

    root.querySelectorAll("[data-expose]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        exposeDeal(btn.getAttribute("data-expose"), currentHuman().id);
        render(true, "human-expose");
      });
    });

    const nextRoundBtn = $("ddNextRoundBtn");
    if (nextRoundBtn) {
      nextRoundBtn.addEventListener("click", function () {
        if (state.round >= MAX_ROUNDS) {
          state.phase = "final";
          addLog("Final reveal started. Names and secret goals are now public.");
        } else {
          state.round += 1;
          startRound();
        }

        render(true, "next-round");
      });
    }
  }

  function startNewGame(totalPlayers, humanName) {
    const identities = makeDeckIdentities();
    const players = [];

    players.push(makePlayer("P0", "human", humanName, identities.shift()));

    const botPool = shuffle(BOT_NAMES);

    for (let i = 1; i < totalPlayers; i += 1) {
      players.push(makePlayer("P" + i, "bot", botPool[i - 1] || ("Bot " + i), identities.shift()));
    }

    state = {
      phase: "deal",
      round: 1,
      players: players,
      deals: [],
      votes: {},
      lastVoteCounts: {},
      lastWinnerId: null,
      log: [],
      dealSerial: 1,
      gameSerial: "dd-" + Date.now() + "-" + Math.floor(Math.random() * 99999)
    };

    addLog("Game started with " + totalPlayers + " players. Names are hidden until the final reveal.");
    startRound();
    render(true, "start-game");
  }

  function makePlayer(id, kind, realName, identity) {
    return {
      id: id,
      kind: kind,
      realName: realName,
      color: identity.color,
      shape: identity.shape,
      money: STARTING_MONEY,
      exposeToken: true,
      secretGoalId: getRandomSecretGoal().id,
      honesty: kind === "human" ? 0.5 : Math.random() * 0.45 + 0.35,
      boldness: kind === "human" ? 0.5 : Math.random() * 0.5 + 0.25,
      stats: {
        roundWins: 0,
        votedWinner: 0,
        promisesBroken: 0,
        promisesKept: 0,
        acceptedDeals: 0,
        exposed: 0,
        exposuresMade: 0,
        finalRoundWin: false
      }
    };
  }

  function startRound() {
    state.phase = "deal";
    state.votes = {};
    state.lastVoteCounts = {};
    state.lastWinnerId = null;

    const income = roundIncome(state.round);

    state.players.forEach(function (p) {
      p.money += income;
    });

    addLog("Round " + state.round + " income: everyone received " + money(income) + ".");

    state.deals.forEach(function (deal) {
      if (deal.status === "pending") {
        deal.status = "expired";
      }
    });

    generateBotDeals();
  }

  function roundIncome(round) {
    if (round <= 2) return 10;
    if (round <= 4) return 12;
    return 15;
  }

  function addLog(text) {
    if (!state.log) state.log = [];
    state.log.push(text);

    if (state.log.length > 140) {
      state.log.shift();
    }
  }

  function newDeal(data) {
    const deal = {
      id: "D" + (state.dealSerial++),
      round: state.round,
      from: data.from,
      to: data.to,
      type: data.type,
      target: data.target || null,
      amount: Math.max(0, Math.floor(Number(data.amount) || 0)),
      status: "pending",
      payer: data.payer || null,
      payee: data.payee || null,
      moneyOwed: data.moneyOwed || 0,
      voteExpectation: data.voteExpectation || null,
      settlement: data.moneyOwed ? "unsettled" : "none",
      exposed: false
    };

    state.deals.push(deal);
    return deal;
  }

  function dealText(deal) {
    const from = getPlayer(deal.from);
    const to = getPlayer(deal.to);
    const target = getPlayer(deal.target);

    const fromName = identityName(from);
    const toName = identityName(to);
    const targetName = target ? identityName(target) : "";
    const amt = money(deal.amount);

    if (deal.type === "payForVote") {
      return fromName + " promises " + toName + " " + amt + " if " + toName + " votes for " + fromName + ".";
    }

    if (deal.type === "sellVote") {
      return fromName + " says they will vote for " + toName + " if " + toName + " pays " + fromName + " " + amt + ".";
    }

    if (deal.type === "voteTarget") {
      return fromName + " asks " + toName + " to both vote for " + targetName + ".";
    }

    if (deal.type === "winnerSplit") {
      return fromName + " promises " + toName + " " + amt + " if " + fromName + " wins this round.";
    }

    return "Unknown deal.";
  }

  function makeHumanDeal() {
    const human = currentHuman();
    const toId = $("ddDealTo").value;
    const type = $("ddDealType").value;
    const amount = clamp($("ddDealAmount").value, 0, 99);
    const targetId = $("ddDealTarget").value;

    if (toId === human.id) return;

    const data = {
      from: human.id,
      to: toId,
      type: type,
      amount: amount,
      target: targetId
    };

    if (type === "payForVote") {
      data.target = human.id;
      data.payer = human.id;
      data.payee = toId;
      data.moneyOwed = amount;
      data.voteExpectation = {
        voter: toId,
        target: human.id
      };
    } else if (type === "sellVote") {
      data.target = toId;
      data.payer = toId;
      data.payee = human.id;
      data.moneyOwed = amount;
      data.voteExpectation = {
        voter: human.id,
        target: toId
      };
    } else if (type === "voteTarget") {
      data.amount = 0;
      data.payer = null;
      data.payee = null;
      data.moneyOwed = 0;
      data.voteExpectation = {
        voter: toId,
        target: targetId
      };
    } else if (type === "winnerSplit") {
      data.target = human.id;
      data.payer = human.id;
      data.payee = toId;
      data.moneyOwed = amount;
      data.voteExpectation = {
        voter: toId,
        target: human.id
      };
    }

    const deal = newDeal(data);
    const botAccepted = botRespondsToDeal(deal);

    addLog(
      "You sent a deal to " +
      identityName(getPlayer(toId)) +
      ". They " +
      (botAccepted ? "accepted" : "rejected") +
      "."
    );

    render(true, "human-deal");
  }

  function acceptDeal(id) {
    const deal = state.deals.find(function (d) {
      return d.id === id;
    });

    if (!deal || deal.status !== "pending") return;

    deal.status = "accepted";

    trackAcceptedDeal(deal);

    addLog(identityName(getPlayer(deal.to)) + " accepted a deal from " + identityName(getPlayer(deal.from)) + ".");
  }

  function rejectDeal(id) {
    const deal = state.deals.find(function (d) {
      return d.id === id;
    });

    if (!deal || deal.status !== "pending") return;

    deal.status = "rejected";

    addLog(identityName(getPlayer(deal.to)) + " rejected a deal from " + identityName(getPlayer(deal.from)) + ".");
  }

  function trackAcceptedDeal(deal) {
    const from = getPlayer(deal.from);
    const to = getPlayer(deal.to);

    if (from && from.stats) from.stats.acceptedDeals += 1;
    if (to && to.stats) to.stats.acceptedDeals += 1;
  }

  function botRespondsToDeal(deal) {
    const bot = getPlayer(deal.to);

    if (!bot || bot.kind !== "bot") return false;

    let acceptChance = 0.42;

    if (deal.amount >= 5) acceptChance += 0.16;
    if (deal.amount >= 10) acceptChance += 0.12;
    if (deal.amount >= 15) acceptChance += 0.10;
    if (deal.type === "voteTarget") acceptChance = 0.50;
    if (deal.payer === bot.id && deal.amount > bot.money) acceptChance -= 0.22;
    if (deal.type === "winnerSplit") acceptChance -= 0.05;

    const accepted = Math.random() < acceptChance;

    deal.status = accepted ? "accepted" : "rejected";

    if (accepted) {
      trackAcceptedDeal(deal);
    }

    return accepted;
  }

  function generateBotDeals() {
    const human = currentHuman();
    const bots = state.players.filter(function (p) {
      return p.kind === "bot";
    });

    const offers = Math.min(randomInt(1, 3), bots.length);
    const selected = shuffle(bots).slice(0, offers);

    selected.forEach(function (bot) {
      const type = choice(["payForVote", "sellVote", "voteTarget", "winnerSplit"]);
      const amount = randomInt(4, 14);
      const target = choice(otherPlayers(bot.id));

      const data = {
        from: bot.id,
        to: human.id,
        type: type,
        amount: amount,
        target: target.id
      };

      if (type === "payForVote") {
        data.target = bot.id;
        data.payer = bot.id;
        data.payee = human.id;
        data.moneyOwed = amount;
        data.voteExpectation = {
          voter: human.id,
          target: bot.id
        };
      } else if (type === "sellVote") {
        data.target = human.id;
        data.payer = human.id;
        data.payee = bot.id;
        data.moneyOwed = amount;
        data.voteExpectation = {
          voter: bot.id,
          target: human.id
        };
      } else if (type === "voteTarget") {
        data.amount = 0;
        data.moneyOwed = 0;
        data.voteExpectation = {
          voter: human.id,
          target: target.id
        };
      } else if (type === "winnerSplit") {
        data.target = bot.id;
        data.payer = bot.id;
        data.payee = human.id;
        data.moneyOwed = amount;
        data.voteExpectation = {
          voter: human.id,
          target: bot.id
        };
      }

      newDeal(data);
      addLog(identityName(bot) + " sent you a deal.");
    });
  }

  function castHumanVote(targetId) {
    const human = currentHuman();

    state.votes[human.id] = targetId;

    autoCastBotVotes();
    resolveVotes();

    state.phase = "settlement";

    render(true, "vote-resolved");
  }

  function autoCastBotVotes() {
    state.players.filter(function (p) {
      return p.kind === "bot";
    }).forEach(function (bot) {
      state.votes[bot.id] = chooseBotVote(bot);
    });
  }

  function chooseBotVote(bot) {
    const candidates = otherPlayers(bot.id);
    const scores = {};

    candidates.forEach(function (p) {
      scores[p.id] = Math.random() * 8;

      if (p.money > bot.money) scores[p.id] -= 2;
      if (p.money < bot.money) scores[p.id] += 1;
    });

    state.deals.forEach(function (deal) {
      if (deal.status !== "accepted" || deal.round !== state.round) return;

      if (deal.voteExpectation && deal.voteExpectation.voter === bot.id) {
        scores[deal.voteExpectation.target] = (scores[deal.voteExpectation.target] || 0) + 11 + (deal.amount || 0);
      }

      if (deal.type === "voteTarget" && deal.to === bot.id && deal.target) {
        scores[deal.target] = (scores[deal.target] || 0) + 8;
      }
    });

    let bestId = candidates[0].id;

    candidates.forEach(function (p) {
      if ((scores[p.id] || 0) > (scores[bestId] || 0)) {
        bestId = p.id;
      }
    });

    if (Math.random() < bot.boldness * 0.18) {
      bestId = choice(candidates).id;
    }

    return bestId;
  }

  function resolveVotes() {
    const counts = {};

    Object.keys(state.votes).forEach(function (voterId) {
      const targetId = state.votes[voterId];
      counts[targetId] = (counts[targetId] || 0) + 1;
    });

    let maxVotes = 0;

    Object.keys(counts).forEach(function (id) {
      maxVotes = Math.max(maxVotes, counts[id]);
    });

    const tied = Object.keys(counts).filter(function (id) {
      return counts[id] === maxVotes;
    });

    const winnerId = choice(tied);
    const winner = getPlayer(winnerId);

    state.lastVoteCounts = counts;
    state.lastWinnerId = winnerId;

    winner.money += ROUND_PAYOUTS[state.round];
    winner.stats.roundWins += 1;

    if (state.round === MAX_ROUNDS) {
      winner.stats.finalRoundWin = true;
    }

    Object.keys(state.votes).forEach(function (voterId) {
      if (state.votes[voterId] === winnerId && voterId !== winnerId) {
        const voter = getPlayer(voterId);
        voter.money += VOTER_BONUS;
        voter.stats.votedWinner += 1;
      }
    });

    addLog(identityName(winner) + " won round " + state.round + " with " + maxVotes + " vote" + (maxVotes === 1 ? "" : "s") + ".");

    if (tied.length > 1) {
      addLog("Tie breaker chose " + identityName(winner) + " from " + tied.length + " tied players.");
    }

    addLog("Anyone who voted for the winner earned a " + money(VOTER_BONUS) + " loyalty bonus.");

    state.deals.forEach(function (deal) {
      if (deal.status === "accepted" && deal.round === state.round && deal.type === "winnerSplit") {
        if (deal.payer !== winnerId) {
          deal.settlement = "none";
          deal.moneyOwed = 0;
        }
      }
    });

    autoSettleBotDeals();
  }

  function autoSettleBotDeals() {
    state.deals.filter(function (deal) {
      const payer = getPlayer(deal.payer);

      return deal.status === "accepted" &&
        deal.round === state.round &&
        deal.moneyOwed > 0 &&
        deal.settlement === "unsettled" &&
        payer &&
        payer.kind === "bot";
    }).forEach(function (deal) {
      const payer = getPlayer(deal.payer);
      const canAfford = payer.money >= deal.moneyOwed;

      let payChance = payer.honesty + (canAfford ? 0.25 : -0.20);

      if (deal.type === "winnerSplit" && payer.id === state.lastWinnerId) {
        payChance += 0.15;
      }

      if (Math.random() < payChance) {
        payDeal(deal, deal.moneyOwed, "full");
      } else if (Math.random() < 0.35 && payer.money > 0) {
        payDeal(deal, Math.floor(deal.moneyOwed / 2), "half");
      } else {
        deal.settlement = "broken";
        payer.stats.promisesBroken += 1;
        addLog(identityName(payer) + " broke a promise to " + identityName(getPlayer(deal.payee)) + ".");
      }
    });
  }

  function autoSettleUnsettledHumanDeals() {
    const human = currentHuman();

    state.deals.filter(function (deal) {
      return deal.status === "accepted" &&
        deal.round === state.round &&
        deal.moneyOwed > 0 &&
        deal.payer === human.id &&
        deal.settlement === "unsettled";
    }).forEach(function (deal) {
      settleDeal(deal.id, "break");
    });
  }

  function settleDeal(id, mode) {
    const deal = state.deals.find(function (d) {
      return d.id === id;
    });

    if (!deal || deal.settlement !== "unsettled") return;

    const amount = deal.moneyOwed || 0;

    if (mode === "full") {
      payDeal(deal, amount, "full");
    } else if (mode === "half") {
      payDeal(deal, Math.floor(amount / 2), "half");
    } else {
      const payer = getPlayer(deal.payer);
      deal.settlement = "broken";

      if (payer && payer.stats) {
        payer.stats.promisesBroken += 1;
      }

      addLog(identityName(getPlayer(deal.payer)) + " broke a promise to " + identityName(getPlayer(deal.payee)) + ".");
    }
  }

  function payDeal(deal, amount, label) {
    const payer = getPlayer(deal.payer);
    const payee = getPlayer(deal.payee);

    if (!payer || !payee) return;

    const paid = Math.min(payer.money, Math.max(0, Math.floor(amount)));

    payer.money -= paid;
    payee.money += paid;

    deal.settlement = label === "full" && paid >= deal.moneyOwed ? "paid" : "partial";

    if (deal.settlement === "paid") {
      payer.stats.promisesKept += 1;
    }

    addLog(identityName(payer) + " paid " + identityName(payee) + " " + money(paid) + ".");

    if (paid < deal.moneyOwed && label === "full") {
      deal.settlement = "partial";
      addLog(identityName(payer) + " could not afford the full promise.");
    }
  }

  function autoExposeBots() {
    state.deals.filter(function (deal) {
      const payee = getPlayer(deal.payee);

      return deal.status === "accepted" &&
        deal.round === state.round &&
        deal.settlement === "broken" &&
        payee &&
        payee.kind === "bot" &&
        payee.exposeToken &&
        !deal.exposed;
    }).forEach(function (deal) {
      const payee = getPlayer(deal.payee);

      if (Math.random() < 0.48) {
        exposeDeal(deal.id, payee.id);
      }
    });
  }

  function exposeDeal(dealId, exposerId) {
    const deal = state.deals.find(function (d) {
      return d.id === dealId;
    });

    const exposer = getPlayer(exposerId);
    const liar = getPlayer(deal && deal.payer);

    if (!deal || !exposer || !liar || !exposer.exposeToken || deal.exposed) return;

    deal.exposed = true;
    exposer.exposeToken = false;

    liar.money = Math.max(0, liar.money - EXPOSE_REWARD);
    exposer.money += EXPOSE_REWARD;

    liar.stats.exposed += 1;
    exposer.stats.exposuresMade += 1;

    addLog(
      identityName(exposer) +
      " exposed " +
      identityName(liar) +
      ". " +
      identityName(liar) +
      " lost " +
      money(EXPOSE_REWARD) +
      ", and " +
      identityName(exposer) +
      " gained " +
      money(EXPOSE_REWARD) +
      "."
    );
  }

  function baseRankMap() {
    const sorted = state.players.slice().sort(function (a, b) {
      return b.money - a.money;
    });

    const map = {};

    sorted.forEach(function (player, index) {
      map[player.id] = index + 1;
    });

    return map;
  }

  function goalBonusForPlayer(player, rankMap) {
    const goal = getGoalById(player.secretGoalId);
    const context = {
      baseRank: rankMap[player.id] || 99
    };

    try {
      return goal.test(player, context) ? goal.bonus : 0;
    } catch (e) {
      return 0;
    }
  }

  function finalRankedPlayers() {
    const ranks = baseRankMap();

    return state.players.map(function (player) {
      const goalBonus = goalBonusForPlayer(player, ranks);

      return {
        player: player,
        cash: player.money,
        goalBonus: goalBonus,
        total: player.money + goalBonus
      };
    }).sort(function (a, b) {
      return b.total - a.total;
    });
  }

  function syncState(reason) {
    if (!state) return;
    if (!window.channel || typeof window.channel.send !== "function") return;

    try {
      window.channel.send({
        type: "broadcast",
        event: "deception-sync-state",
        payload: {
          senderId: window.myId || "local",
          reason: reason || "sync",
          gameTitle: GAME_TITLE,
          state: JSON.parse(JSON.stringify(state))
        }
      });
    } catch (e) {}
  }

  window.handleIncomingDeceptionSync = function (payload) {
    if (!payload || !payload.state) return;
    if (payload.senderId && window.myId && payload.senderId === window.myId) return;

    const activeName = String(
      (window.chaserGame && (window.chaserGame.activeGame || window.chaserGame.activeGameName)) ||
      ""
    ).toLowerCase();

    if (activeName && !activeName.includes("deceit") && !activeName.includes("deception")) {
      return;
    }

    state = payload.state;

    openChaserGameShell();
    render(false, "incoming-sync");
  };

  function cleanupDeceptionGame() {
    state = null;

    const mount = $("gameCanvasContainer") || $("deals-deceit-root");

    if (mount) {
      const app = $("ddApp");
      if (app && app.parentElement === mount) {
        mount.innerHTML = "";
      }
    }
  }

  function startDeceptionGame() {
    openChaserGameShell();

    state = {
      phase: "lobby",
      round: 1
    };

    render(false, "open-lobby");
  }

  window.startDeceptionGame = startDeceptionGame;
  window.startDealsDeceitGame = startDeceptionGame;
  window.launchDeceptionGame = startDeceptionGame;
  window.initDeceptionGame = startDeceptionGame;
  window.renderDeceptionGame = startDeceptionGame;
  window.cleanupDeceptionGame = cleanupDeceptionGame;

  document.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-game]");
    if (!btn) return;

    const value = String(btn.getAttribute("data-game") || "").toLowerCase();

    if (
      value === "deception" ||
      value === "deals" ||
      value === "deals-deceit" ||
      value === "deals-and-deceit"
    ) {
      event.preventDefault();
      startDeceptionGame();
    }
  });

  window.CHASER_GAMES = window.CHASER_GAMES || {};
  window.CHASER_GAMES.deception = startDeceptionGame;
  window.CHASER_GAMES.dealsDeceit = startDeceptionGame;

})();
