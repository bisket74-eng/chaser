/*
Deception - Chaser mini game
Game card title in index.html: Deals and Deception
In-game short title: Deception

Save as:
./games/deception.js
*/
;(function () {
  "use strict";

  const GAME_CARD_TITLE = "Deals and Deception";
  const GAME_TITLE = "Deception";

  const MAX_ROUNDS = 6;
  const STARTING_MONEY = 20;
  const EXPOSE_REWARD = 5;
  const VOTER_BONUS = 3;
  const ROUND_PAYOUTS = [0, 20, 25, 30, 35, 40, 50];

  const COLORS = ["Red", "Blue", "Green", "Yellow"];
  const SHAPES = ["Circle", "Square", "Triangle", "Star"];

  const SHAPE_MARK = {
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

  const BOT_NAMES = [
    "Alex", "Bailey", "Casey", "Dakota", "Emerson", "Finley", "Gray", "Harper",
    "Indigo", "Jordan", "Kai", "Logan", "Morgan", "Nova", "Parker", "Quinn",
    "River", "Skyler", "Taylor", "Wren"
  ];

  const DEAL_TYPES = [
    { id: "payForVote", label: "my 🪙 → their ✓" },
    { id: "sellVote", label: "my ✓ → their 🪙" },
    { id: "voteTarget", label: "both ✓ target" },
    { id: "winnerSplit", label: "🏆 me → their 🪙" }
  ];

  let state = null;
  let previousCleanup = null;
  let ddPinchStartDistance = 0;
  let ddPinchStartZoom = 1;

  function byId(id) {
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

  function num(value) {
    return Math.max(0, Math.floor(Number(value) || 0));
  }

  function money(value) {
    return "🪙" + num(value);
  }

  function clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function chance(amount) {
    return Math.random() < amount;
  }

  function choice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function shuffle(list) {
    const copy = list.slice();

    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }

    return copy;
  }

  function human() {
    if (!state || !state.players) return null;
    return state.players.find(function (p) {
      return p.kind === "human";
    }) || null;
  }

  function getPlayer(id) {
    if (!state || !state.players) return null;
    return state.players.find(function (p) {
      return p.id === id;
    }) || null;
  }

  function others(playerId) {
    return state.players.filter(function (p) {
      return p.id !== playerId;
    });
  }

  function botPlayers() {
    return state.players.filter(function (p) {
      return p.kind === "bot";
    });
  }

  function realName(player) {
    if (!player) return "";
    return player.kind === "human" ? (player.realName || "You") : (player.realName || "Bot");
  }

  function identityText(player) {
    if (!player) return "";
    return player.color + " " + player.shape;
  }

  function icon(player, small) {
    if (!player) return "";

    return (
      "<span class=\"dd-id" + (small ? " dd-id-sm" : "") + "\" " +
        "style=\"--dd-color:" + COLOR_HEX[player.color] + "\" " +
        "title=\"" + esc(identityText(player)) + "\">" +
        esc(SHAPE_MARK[player.shape]) +
      "</span>"
    );
  }

  function identitiesDeck() {
    const deck = [];

    COLORS.forEach(function (color) {
      SHAPES.forEach(function (shape) {
        deck.push({
          color: color,
          shape: shape
        });
      });
    });

    return shuffle(deck);
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
      const el = byId(ids[i]);
      if (el) return el;
    }

    let fallback = byId("deceptionRoot");

    if (!fallback) {
      fallback = document.createElement("div");
      fallback.id = "deceptionRoot";
      document.body.appendChild(fallback);
    }

    return fallback;
  }

  function openChaserStage() {
    const stage = byId("activeGameStage");
    const hub = byId("gameHubOverlay");
    const roomTitle = byId("roomDisplayCode");
    const headerButtons = byId("headerActionButtonsContainer");
    const youtube = byId("youtubeStageWrapper");
    const canvas = byId("gameCanvasContainer");

    if (hub) hub.classList.remove("open");

    if (stage) {
      stage.classList.add("open");
      stage.classList.remove("game-board-hidden");
    }

    if (youtube) youtube.classList.remove("active");

    if (headerButtons) {
      headerButtons.style.display = "none";
    }

    if (roomTitle) {
      roomTitle.classList.remove("youtube-pill-title");
      roomTitle.textContent = GAME_TITLE;
    }

    if (canvas && youtube && youtube.parentElement === canvas) {
      canvas.innerHTML = "";
    }

    window.chaserGame = window.chaserGame || {};
    window.chaserGame.activeGame = GAME_TITLE;
    window.chaserGame.activeGameName = GAME_TITLE;
  }

  function installStyles() {
    if (byId("deceptionStyles")) return;

    const style = document.createElement("style");
    style.id = "deceptionStyles";

    style.textContent = `
      #gameCanvasContainer .dd-wrap,
      .dd-wrap {
        width: 100% !important;
        height: 100% !important;
        max-height: 100% !important;
        min-height: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        padding: 8px !important;
        box-sizing: border-box !important;
        color: #24302b !important;
        font-family: Arial, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        background: linear-gradient(135deg, #eafbe7, #e8f4ff 48%, #fff4d9) !important;
        overflow: hidden !important;
        text-align: left !important;
      }

      .dd-zoom-tools {
        flex: 0 0 auto !important;
        display: flex !important;
        justify-content: flex-end !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 4px 4px 8px !important;
        position: sticky !important;
        top: 0 !important;
        z-index: 80 !important;
        background: rgba(234, 251, 231, .88) !important;
        backdrop-filter: blur(8px) !important;
      }

      .dd-zoom-btn {
        min-width: 46px !important;
        height: 38px !important;
        border: 0 !important;
        border-radius: 999px !important;
        background: #17431f !important;
        color: #ffffff !important;
        font-size: 20px !important;
        font-weight: 950 !important;
        box-shadow: 0 4px 10px rgba(0,0,0,.18) !important;
      }

      .dd-zoom-label {
        min-width: 72px !important;
        height: 38px !important;
        border-radius: 999px !important;
        background: #17431f !important;
        color: #ffffff !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 14px !important;
        font-weight: 950 !important;
      }

      .dd-scroll {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        width: 100% !important;
        overflow: auto !important;
        -webkit-overflow-scrolling: touch !important;
        overscroll-behavior: contain !important;
        border-radius: 16px !important;
        box-sizing: border-box !important;
      }

      .dd-inner {
        transform-origin: top left !important;
        min-width: 100% !important;
        padding-bottom: 40px !important;
        box-sizing: border-box !important;
      }

      .dd-card {
        background: rgba(255,255,255,.90) !important;
        border: 1px solid rgba(36,48,43,.14) !important;
        border-radius: 18px !important;
        box-shadow: 0 8px 20px rgba(0,0,0,.10) !important;
        padding: 11px !important;
        margin: 9px 0 !important;
        box-sizing: border-box !important;
      }

      .dd-top-card {
        margin-bottom: 6px !important;
      }

      .dd-top {
        display: flex !important;
        justify-content: space-between !important;
        align-items: flex-start !important;
        gap: 8px !important;
      }

      .dd-title {
        font-size: 24px !important;
        font-weight: 950 !important;
        color: #1e4620 !important;
        line-height: 1 !important;
      }

      .dd-sub {
        color: #607066 !important;
        font-size: 12px !important;
        font-weight: 800 !important;
        margin-top: 5px !important;
      }

      .dd-pills,
      .dd-row {
        display: flex !important;
        gap: 7px !important;
        align-items: center !important;
        flex-wrap: wrap !important;
      }

      .dd-pill {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 5px !important;
        min-height: 28px !important;
        padding: 5px 9px !important;
        border-radius: 999px !important;
        background: #f4f8f3 !important;
        border: 1px solid rgba(36,48,43,.12) !important;
        color: #24302b !important;
        font-size: 12px !important;
        font-weight: 950 !important;
        box-sizing: border-box !important;
      }

      .dd-you-pill {
        background: #dcf7de !important;
        border-color: #2d6a30 !important;
        color: #17431f !important;
      }

      .dd-money-pill {
        background: #fff3bf !important;
        color: #594500 !important;
      }

      .dd-ok-pill {
        background: #daf6df !important;
        color: #216534 !important;
      }

      .dd-action-log {
        margin-top: 0 !important;
        margin-bottom: 9px !important;
        padding: 8px 10px !important;
        background: rgba(255, 250, 220, .94) !important;
        border-color: rgba(160, 125, 20, .22) !important;
      }

      .dd-current-action {
        font-size: 14px !important;
        font-weight: 950 !important;
        color: #3d3210 !important;
        line-height: 1.25 !important;
      }

      .dd-log-details {
        margin-top: 6px !important;
      }

      .dd-log-details summary {
        cursor: pointer !important;
        font-size: 12px !important;
        font-weight: 950 !important;
        color: #6a560f !important;
        list-style: none !important;
      }

      .dd-log-details summary::-webkit-details-marker {
        display: none !important;
      }

      .dd-log-details summary::after {
        content: " ▼" !important;
      }

      .dd-log-details[open] summary::after {
        content: " ▲" !important;
      }

      .dd-top-history {
        margin-top: 7px !important;
        max-height: 150px !important;
        overflow: auto !important;
      }

      .dd-id {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 42px !important;
        height: 42px !important;
        color: var(--dd-color) !important;
        font-size: 38px !important;
        line-height: 1 !important;
        font-weight: 950 !important;
        text-shadow:
          0 1px 0 rgba(255,255,255,.9),
          0 3px 6px rgba(0,0,0,.20) !important;
        vertical-align: middle !important;
        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
      }

      .dd-id-sm {
        width: 30px !important;
        height: 30px !important;
        font-size: 27px !important;
      }

      .dd-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)) !important;
        gap: 8px !important;
      }

      .dd-player {
        min-height: 104px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        border: 1px solid rgba(36,48,43,.14) !important;
        border-radius: 16px !important;
        background: rgba(255,255,255,.78) !important;
        padding: 8px !important;
        box-sizing: border-box !important;
      }

      .dd-player.me {
        outline: 3px solid rgba(45,106,48,.32) !important;
        background: rgba(220,247,222,.76) !important;
      }

      .dd-tag {
        font-size: 13px !important;
        font-weight: 950 !important;
        color: #607066 !important;
      }

      .dd-mini {
        font-size: 12px !important;
        font-weight: 850 !important;
        color: #607066 !important;
      }

      .dd-section {
        font-size: 16px !important;
        font-weight: 950 !important;
        color: #1e4620 !important;
        margin: 0 0 8px !important;
      }

      .dd-two {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 9px !important;
      }

      .dd-btn {
        appearance: none !important;
        border: 0 !important;
        border-radius: 14px !important;
        padding: 10px 12px !important;
        background: #315c3d !important;
        color: #ffffff !important;
        font-size: 14px !important;
        font-weight: 950 !important;
        box-shadow: 0 4px 0 rgba(0,0,0,.12) !important;
        cursor: pointer !important;
        box-sizing: border-box !important;
      }

      .dd-btn:disabled {
        opacity: .45 !important;
        cursor: not-allowed !important;
      }

      .dd-btn.light {
        background: #eef5ec !important;
        color: #244030 !important;
        border: 1px solid rgba(36,48,43,.14) !important;
      }

      .dd-btn.gold {
        background: #d7951f !important;
        color: #2d2308 !important;
      }

      .dd-btn.bad {
        background: #a8322b !important;
      }

      .dd-btn.warn {
        background: #9b5a2b !important;
      }

      .dd-btn.small {
        padding: 7px 10px !important;
        font-size: 16px !important;
        border-radius: 12px !important;
      }

      .dd-input {
        min-height: 42px !important;
        border: 1px solid rgba(36,48,43,.18) !important;
        border-radius: 12px !important;
        background: #ffffff !important;
        color: #24302b !important;
        padding: 8px 10px !important;
        font-size: 17px !important;
        font-weight: 900 !important;
        box-sizing: border-box !important;
        max-width: 105px !important;
      }

      .dd-label {
        display: grid !important;
        gap: 4px !important;
        color: #617067 !important;
        font-size: 12px !important;
        font-weight: 950 !important;
      }

      .dd-picker {
        position: relative !important;
        min-width: 90px !important;
      }

      .dd-picker-btn {
        width: 100% !important;
        min-height: 48px !important;
        border: 1px solid rgba(36,48,43,.18) !important;
        border-radius: 14px !important;
        background: #ffffff !important;
        color: #24302b !important;
        padding: 5px 10px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 6px !important;
        font-size: 17px !important;
        font-weight: 950 !important;
        box-sizing: border-box !important;
      }

      .dd-picker-menu {
        position: absolute !important;
        left: 0 !important;
        top: calc(100% + 5px) !important;
        min-width: 100% !important;
        max-height: 230px !important;
        overflow: auto !important;
        background: #1d241d !important;
        color: #ffffff !important;
        border-radius: 18px !important;
        box-shadow: 0 12px 30px rgba(0,0,0,.35) !important;
        z-index: 500 !important;
        padding: 6px !important;
        box-sizing: border-box !important;
      }

      .dd-picker-grid {
        display: grid !important;
        grid-template-columns: repeat(4, 56px) !important;
        gap: 4px !important;
      }

      .dd-picker-option {
        min-height: 52px !important;
        border: 0 !important;
        border-radius: 14px !important;
        background: transparent !important;
        color: #ffffff !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 18px !important;
        font-weight: 950 !important;
      }

      .dd-picker-option.selected {
        outline: 3px solid #b5d883 !important;
        background: rgba(255,255,255,.10) !important;
      }

      .dd-picker-type-menu {
        min-width: 250px !important;
      }

      .dd-picker-type-menu .dd-picker-option {
        justify-content: flex-start !important;
        padding: 10px 12px !important;
        font-size: 19px !important;
        min-height: 56px !important;
        border-bottom: 1px solid rgba(255,255,255,.12) !important;
      }

      .dd-deal,
      .dd-logitem,
      .dd-result {
        background: rgba(255,255,255,.76) !important;
        border: 1px solid rgba(36,48,43,.12) !important;
        border-radius: 14px !important;
        padding: 9px !important;
        margin: 7px 0 !important;
        color: #24302b !important;
        font-size: 14px !important;
        font-weight: 850 !important;
        box-sizing: border-box !important;
      }

      .dd-deal-top {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        gap: 6px !important;
        margin-bottom: 8px !important;
      }

      .dd-symbol-line {
        display: flex !important;
        align-items: center !important;
        flex-wrap: wrap !important;
        gap: 8px !important;
        font-size: 23px !important;
        font-weight: 950 !important;
      }

      .dd-offers-word {
        font-size: 20px !important;
        color: #24302b !important;
        font-weight: 950 !important;
      }

      .dd-offer-box {
        display: grid !important;
        gap: 6px !important;
        padding: 7px 8px !important;
        border-radius: 12px !important;
        background: rgba(244, 248, 243, .94) !important;
        border: 1px solid rgba(36,48,43,.10) !important;
      }

      .dd-offer-line {
        display: flex !important;
        align-items: center !important;
        flex-wrap: wrap !important;
        gap: 5px !important;
        font-size: 15px !important;
        font-weight: 900 !important;
        color: #24302b !important;
        line-height: 1.25 !important;
      }

      .dd-offer-label {
        min-width: 52px !important;
        color: #607066 !important;
        font-size: 12px !important;
        font-weight: 950 !important;
        text-transform: uppercase !important;
      }

      .dd-log {
        max-height: 160px !important;
        overflow: auto !important;
      }

      .dd-muted {
        color: #66756d !important;
      }

      .dd-results {
        display: grid !important;
        gap: 8px !important;
      }

      .dd-rank {
        display: grid !important;
        grid-template-columns: auto 1fr auto !important;
        gap: 8px !important;
        align-items: center !important;
        background: rgba(255,255,255,.78) !important;
        border: 1px solid rgba(36,48,43,.13) !important;
        border-radius: 14px !important;
        padding: 9px !important;
      }

      .dd-rank-num {
        width: 34px !important;
        text-align: center !important;
        font-weight: 950 !important;
      }

      .dd-vote-card {
        width: 100% !important;
        min-height: 66px !important;
        justify-content: center !important;
      }

      @media (max-width: 720px) {
        .dd-wrap {
          padding: 7px !important;
        }

        .dd-two {
          grid-template-columns: 1fr !important;
        }

        .dd-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        .dd-title {
          font-size: 22px !important;
        }

        .dd-picker-grid {
          grid-template-columns: repeat(4, 50px) !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function getZoom() {
    if (!state || !state.ui) return 1;
    return state.ui.zoom || 1;
  }

  function setZoom(value) {
    if (!state) return;
    state.ui = state.ui || {};
    state.ui.zoom = clamp(value, 0.65, 1.85);
  }

  function touchDistance(touches) {
    if (!touches || touches.length < 2) return 0;

    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;

    return Math.sqrt(dx * dx + dy * dy);
  }

  function render() {
    installStyles();

    const mount = findMount();
    const zoom = getZoom();

    mount.innerHTML =
      "<div class=\"dd-wrap\" id=\"deceptionApp\">" +
        "<div class=\"dd-zoom-tools\">" +
          "<button class=\"dd-zoom-btn\" type=\"button\" data-zoom=\"out\">−</button>" +
          "<span class=\"dd-zoom-label\">" + Math.round(zoom * 100) + "%</span>" +
          "<button class=\"dd-zoom-btn\" type=\"button\" data-zoom=\"in\">+</button>" +
        "</div>" +
        "<div class=\"dd-scroll\" id=\"ddScroll\">" +
          "<div class=\"dd-inner\" id=\"ddInner\" style=\"zoom:" + zoom + "\">" +
            renderCurrent() +
          "</div>" +
        "</div>" +
      "</div>";

    wireEvents();
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

  function renderTop(note) {
    const me = human();

    return "" +
      "<div class=\"dd-card dd-top-card\">" +
        "<div class=\"dd-top\">" +
          "<div>" +
            "<div class=\"dd-title\">" + GAME_TITLE + "</div>" +
            "<div class=\"dd-sub\">" + esc(note || "hidden until final") + "</div>" +
          "</div>" +
          "<div class=\"dd-pills\">" +
            "<span class=\"dd-pill\">R " + state.round + "/" + MAX_ROUNDS + "</span>" +
            "<span class=\"dd-pill dd-you-pill\">YOU " + (me ? icon(me, true) : "") + "</span>" +
            "<span class=\"dd-pill dd-money-pill\">" + (me ? money(me.money) : "🪙0") + "</span>" +
          "</div>" +
        "</div>" +
      "</div>" +
      renderActionLog();
  }

  function renderActionLog() {
    if (!state || !state.log || !state.log.length) {
      return "" +
        "<div class=\"dd-card dd-action-log\">" +
          "<div class=\"dd-current-action\">Current: none</div>" +
        "</div>";
    }

    const current = state.log[state.log.length - 1];
    const history = state.log.slice().reverse();

    return "" +
      "<div class=\"dd-card dd-action-log\">" +
        "<div class=\"dd-current-action\">" + current + "</div>" +
        "<details class=\"dd-log-details\">" +
          "<summary>history</summary>" +
          "<div class=\"dd-log dd-top-history\">" +
            history.map(function (line) {
              return "<div class=\"dd-logitem\">" + line + "</div>";
            }).join("") +
          "</div>" +
        "</details>" +
      "</div>";
  }

  function renderLobby() {
    return "" +
      "<div class=\"dd-card\">" +
        "<div class=\"dd-top\">" +
          "<div>" +
            "<div class=\"dd-title\">" + GAME_CARD_TITLE + "</div>" +
            "<div class=\"dd-sub\">in-game: " + GAME_TITLE + "</div>" +
          "</div>" +
          "<span class=\"dd-pill dd-ok-pill\">🎭</span>" +
        "</div>" +
        "<div class=\"dd-logitem\">same symbols all game · names reveal at final</div>" +
      "</div>" +

      "<div class=\"dd-card\">" +
        "<div class=\"dd-section\">Start</div>" +
        "<div class=\"dd-row\">" +
          "<label class=\"dd-label\">name" +
            "<input class=\"dd-input\" id=\"ddNameInput\" value=\"You\" maxlength=\"18\">" +
          "</label>" +
          "<label class=\"dd-label\">players" +
            "<input class=\"dd-input\" id=\"ddPlayerCount\" type=\"number\" min=\"6\" max=\"16\" value=\"8\">" +
          "</label>" +
          "<button class=\"dd-btn\" id=\"ddStartBtn\">▶</button>" +
        "</div>" +
      "</div>" +

      "<div class=\"dd-card\">" +
        "<div class=\"dd-section\">Keys</div>" +
        "<div class=\"dd-pills\">" +
          "<span class=\"dd-pill\">🤝 deal</span>" +
          "<span class=\"dd-pill\">✓ vote</span>" +
          "<span class=\"dd-pill\">🪙 money</span>" +
          "<span class=\"dd-pill\">🏆 win</span>" +
          "<span class=\"dd-pill\">👁 expose</span>" +
        "</div>" +
      "</div>";
  }

  function renderPlayers(showNames) {
    return "<div class=\"dd-grid\">" + state.players.map(function (p) {
      return "" +
        "<div class=\"dd-player" + (p.kind === "human" ? " me" : "") + "\">" +
          icon(p, false) +
          "<div class=\"dd-tag\">" + (p.kind === "human" ? "YOU" : "hidden") + "</div>" +
          (showNames ? "<div class=\"dd-mini\">" + esc(realName(p)) + " · " + money(p.money) + "</div>" : "") +
        "</div>";
    }).join("") + "</div>";
  }

  function renderDealPhase() {
    const me = human();

    return "" +
      renderTop("🤝 deal") +

      "<div class=\"dd-card\">" +
        "<div class=\"dd-section\">Players</div>" +
        renderPlayers(false) +
      "</div>" +

      "<div class=\"dd-two\">" +
        "<div class=\"dd-card\">" +
          "<div class=\"dd-section\">🤝 Make</div>" +
          renderDealBuilder(me) +
        "</div>" +
        "<div class=\"dd-card\">" +
          "<div class=\"dd-section\">📥 Yours</div>" +
          renderIncomingDeals(me) +
        "</div>" +
      "</div>" +

      "<div class=\"dd-card\">" +
        "<div class=\"dd-section\">✓ Promises</div>" +
        renderMyDeals(me) +
      "</div>" +

      "<div class=\"dd-card\">" +
        "<button class=\"dd-btn gold\" id=\"ddGoVoteBtn\">✓ Vote</button> " +
        "<button class=\"dd-btn light\" id=\"ddRestartBtn\">↻</button>" +
      "</div>";
  }

  function ensureDealUi(me) {
    state.ui = state.ui || {};

    const possible = others(me.id);

    if (!state.ui.dealTo || !getPlayer(state.ui.dealTo) || state.ui.dealTo === me.id) {
      state.ui.dealTo = possible[0] ? possible[0].id : "";
    }

    if (!state.ui.dealTarget || !getPlayer(state.ui.dealTarget) || state.ui.dealTarget === me.id) {
      state.ui.dealTarget = possible[0] ? possible[0].id : "";
    }

    if (!state.ui.dealType) {
      state.ui.dealType = "payForVote";
    }

    if (state.ui.dealAmount == null) {
      state.ui.dealAmount = 8;
    }

    if (!state.ui.openPicker) {
      state.ui.openPicker = "";
    }
  }

  function renderDealBuilder(me) {
    ensureDealUi(me);

    const targets = others(me.id);

    return "" +
      "<div class=\"dd-row\">" +
        "<label class=\"dd-label\">to" +
          renderPlayerPicker("dealTo", state.ui.dealTo, targets) +
        "</label>" +

        "<label class=\"dd-label\">type" +
          renderTypePicker("dealType", state.ui.dealType) +
        "</label>" +

        "<label class=\"dd-label\">🪙" +
          "<input class=\"dd-input\" id=\"ddDealAmount\" type=\"number\" min=\"0\" max=\"99\" value=\"" + esc(state.ui.dealAmount) + "\">" +
        "</label>" +

        "<label class=\"dd-label\">target" +
          renderPlayerPicker("dealTarget", state.ui.dealTarget, targets) +
        "</label>" +
      "</div>" +

      "<div style=\"margin-top:9px\">" +
        "<button class=\"dd-btn\" id=\"ddSendDealBtn\">🤝 Send</button>" +
      "</div>";
  }

  function renderPlayerPicker(name, selectedId, players) {
    const selected = getPlayer(selectedId) || players[0];
    const open = state.ui && state.ui.openPicker === name;

    return "" +
      "<div class=\"dd-picker\">" +
        "<button class=\"dd-picker-btn\" type=\"button\" data-picker-toggle=\"" + esc(name) + "\">" +
          "<span>" + icon(selected, true) + "</span>" +
          "<span>⌄</span>" +
        "</button>" +
        (open ? "" +
          "<div class=\"dd-picker-menu\">" +
            "<div class=\"dd-picker-grid\">" +
              players.map(function (p) {
                return "" +
                  "<button type=\"button\" class=\"dd-picker-option" + (p.id === selectedId ? " selected" : "") + "\" " +
                    "data-picker-name=\"" + esc(name) + "\" data-picker-value=\"" + esc(p.id) + "\" title=\"" + esc(identityText(p)) + "\">" +
                    icon(p, true) +
                  "</button>";
              }).join("") +
            "</div>" +
          "</div>" : "") +
      "</div>";
  }

  function renderTypePicker(name, selectedId) {
    const selected = DEAL_TYPES.find(function (type) {
      return type.id === selectedId;
    }) || DEAL_TYPES[0];

    const open = state.ui && state.ui.openPicker === name;

    return "" +
      "<div class=\"dd-picker\">" +
        "<button class=\"dd-picker-btn\" type=\"button\" data-picker-toggle=\"" + esc(name) + "\">" +
          "<span>" + esc(selected.label) + "</span>" +
          "<span>⌄</span>" +
        "</button>" +
        (open ? "" +
          "<div class=\"dd-picker-menu dd-picker-type-menu\">" +
            DEAL_TYPES.map(function (type) {
              return "" +
                "<button type=\"button\" class=\"dd-picker-option" + (type.id === selectedId ? " selected" : "") + "\" " +
                  "data-picker-name=\"" + esc(name) + "\" data-picker-value=\"" + esc(type.id) + "\">" +
                  esc(type.label) +
                "</button>";
            }).join("") +
          "</div>" : "") +
      "</div>";
  }

  function renderIncomingDeals(me) {
    const incoming = state.deals.filter(function (deal) {
      return deal.to === me.id && deal.status === "pending";
    });

    if (!incoming.length) {
      return "<div class=\"dd-logitem dd-muted\">none</div>";
    }

    return incoming.map(function (deal) {
      return renderDealCard(deal, "incoming");
    }).join("");
  }

  function renderMyDeals(me) {
    const mine = state.deals.filter(function (deal) {
      return !deal.privateBotDeal &&
        deal.status === "accepted" &&
        (
          deal.from === me.id ||
          deal.to === me.id ||
          deal.payer === me.id ||
          deal.payee === me.id
        );
    });

    if (!mine.length) {
      return "<div class=\"dd-logitem dd-muted\">none</div>";
    }

    return mine.map(function (deal) {
      return renderDealCard(deal, "mine");
    }).join("");
  }

  function renderDealCard(deal, mode) {
    const from = getPlayer(deal.from);

    return "" +
      "<div class=\"dd-deal\">" +
        "<div class=\"dd-deal-top\">" +
          "<div class=\"dd-symbol-line\">" +
            icon(from, true) +
            "<span class=\"dd-offers-word\">" + (mode === "incoming" ? "offers" : "deal") + "</span>" +
          "</div>" +
          "<span class=\"dd-pill\">" + statusMark(deal.status) + "</span>" +
        "</div>" +

        renderOfferDetails(deal) +

        (mode === "incoming" ? "" +
          "<div class=\"dd-row\" style=\"margin-top:8px\">" +
            "<button class=\"dd-btn small\" data-accept-deal=\"" + deal.id + "\">✓</button>" +
            "<button class=\"dd-btn small light\" data-reject-deal=\"" + deal.id + "\">✗</button>" +
          "</div>" : "") +
      "</div>";
  }

  function renderOfferDetails(deal) {
    const me = human();
    const from = getPlayer(deal.from);
    const to = getPlayer(deal.to);
    const target = getPlayer(deal.target);

    const fromIsMe = from && from.id === me.id;

    let gives = "";
    let wants = "";

    if (deal.type === "payForVote") {
      if (fromIsMe) {
        gives = "you give " + money(deal.amount);
        wants = "they vote ✓ for you " + icon(me, true);
      } else {
        gives = "they give you " + money(deal.amount);
        wants = "you vote ✓ for them " + icon(from, true);
      }
    }

    if (deal.type === "sellVote") {
      if (fromIsMe) {
        gives = "you vote ✓ for them " + icon(to, true);
        wants = "they give you " + money(deal.amount);
      } else {
        gives = "they vote ✓ for you " + icon(me, true);
        wants = "you give them " + money(deal.amount);
      }
    }

    if (deal.type === "voteTarget") {
      gives = fromIsMe ? "you vote ✓ for " + icon(target, true) : "they vote ✓ for " + icon(target, true);
      wants = fromIsMe ? "they vote ✓ for " + icon(target, true) : "you vote ✓ for " + icon(target, true);
    }

    if (deal.type === "winnerSplit") {
      if (fromIsMe) {
        gives = "if you win 🏆, you give " + icon(to, true) + " " + money(deal.amount);
        wants = "they vote ✓ for you " + icon(me, true);
      } else {
        gives = "if they win 🏆, they give you " + money(deal.amount);
        wants = "you vote ✓ for them " + icon(from, true);
      }
    }

    if (!gives) gives = "offer";
    if (!wants) wants = "deal";

    return "" +
      "<div class=\"dd-offer-box\">" +
        "<div class=\"dd-offer-line\"><span class=\"dd-offer-label\">Gives:</span> " + gives + "</div>" +
        "<div class=\"dd-offer-line\"><span class=\"dd-offer-label\">Wants:</span> " + wants + "</div>" +
      "</div>";
  }

  function statusMark(status) {
    if (status === "accepted") return "✓";
    if (status === "rejected") return "✗";
    if (status === "pending") return "?";
    if (status === "expired") return "⌛";
    return status;
  }

  function renderVotePhase() {
    const me = human();

    return "" +
      renderTop("✓ vote") +
      "<div class=\"dd-card\">" +
        "<div class=\"dd-section\">Pick</div>" +
        "<div class=\"dd-grid\">" +
          others(me.id).map(function (p) {
            return "<button class=\"dd-btn light dd-vote-card\" data-vote-for=\"" + p.id + "\">" + icon(p, false) + "</button>";
          }).join("") +
        "</div>" +
      "</div>" +
      "<div class=\"dd-card\">" +
        "<div class=\"dd-section\">🤝 Yours</div>" +
        renderMyDeals(me) +
      "</div>";
  }

  function renderSettlementPhase() {
    const me = human();

    const owed = state.deals.filter(function (deal) {
      return deal.status === "accepted" &&
        deal.round === state.round &&
        deal.payer === me.id &&
        deal.moneyOwed > 0 &&
        deal.settlement === "unsettled";
    });

    return "" +
      renderTop("🪙 settle") +

      "<div class=\"dd-card\">" +
        "<div class=\"dd-section\">Round</div>" +
        renderVoteResults() +
      "</div>" +

      "<div class=\"dd-card\">" +
        "<div class=\"dd-section\">You owe</div>" +
        (owed.length ? owed.map(renderSettleCard).join("") : "<div class=\"dd-logitem dd-muted\">none</div>") +
      "</div>" +

      "<div class=\"dd-card\">" +
        "<button class=\"dd-btn gold\" id=\"ddFinishSettlementBtn\">Next 👁</button>" +
      "</div>";
  }

  function renderSettleCard(deal) {
    const payee = getPlayer(deal.payee);
    const amount = num(deal.moneyOwed);
    const half = Math.floor(amount / 2);

    return "" +
      "<div class=\"dd-deal\">" +
        "<div class=\"dd-symbol-line\">me → " + icon(payee, true) + " " + money(amount) + "</div>" +
        "<div class=\"dd-row\" style=\"margin-top:8px\">" +
          "<button class=\"dd-btn small\" data-settle-full=\"" + deal.id + "\">✓ " + money(amount) + "</button>" +
          "<button class=\"dd-btn small warn\" data-settle-half=\"" + deal.id + "\">½ " + money(half) + "</button>" +
          "<button class=\"dd-btn small bad\" data-settle-break=\"" + deal.id + "\">✗</button>" +
        "</div>" +
      "</div>";
  }

  function renderExposePhase() {
    const me = human();

    const broken = state.deals.filter(function (deal) {
      return deal.status === "accepted" &&
        deal.round === state.round &&
        deal.settlement === "broken" &&
        deal.payee === me.id &&
        !deal.exposed &&
        me.exposeToken;
    });

    return "" +
      renderTop("👁 expose") +

      "<div class=\"dd-card\">" +
        "<div class=\"dd-section\">Options</div>" +
        (broken.length ? broken.map(function (deal) {
          return "" +
            "<div class=\"dd-deal\">" +
              "<div class=\"dd-symbol-line\">" + icon(getPlayer(deal.payer), true) + " ✗ " + money(deal.moneyOwed) + "</div>" +
              "<button class=\"dd-btn small bad\" data-expose=\"" + deal.id + "\">👁</button>" +
            "</div>";
        }).join("") : "<div class=\"dd-logitem dd-muted\">none</div>") +
      "</div>" +

      "<div class=\"dd-card\">" +
        "<button class=\"dd-btn gold\" id=\"ddNextRoundBtn\">" + (state.round >= MAX_ROUNDS ? "🏁 Final" : "▶ Next") + "</button>" +
      "</div>";
  }

  function renderFinal() {
    const ranked = state.players.slice().sort(function (a, b) {
      return b.money - a.money;
    });

    return "" +
      "<div class=\"dd-card\">" +
        "<div class=\"dd-top\">" +
          "<div>" +
            "<div class=\"dd-title\">Final 👁</div>" +
            "<div class=\"dd-sub\">names revealed</div>" +
          "</div>" +
          "<button class=\"dd-btn light\" id=\"ddRestartBtn\">↻</button>" +
        "</div>" +
      "</div>" +

      renderActionLog() +

      "<div class=\"dd-card\">" +
        "<div class=\"dd-results\">" +
          ranked.map(function (p, index) {
            const place = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "#" + (index + 1);

            return "" +
              "<div class=\"dd-rank\">" +
                "<div class=\"dd-rank-num\">" + place + "</div>" +
                "<div>" +
                  "<div>" + icon(p, true) + " <b>" + esc(realName(p)) + "</b>" + (p.kind === "human" ? " <span class=\"dd-pill dd-you-pill\">YOU</span>" : "") + "</div>" +
                  "<div class=\"dd-mini\">" + esc(identityText(p)) + "</div>" +
                "</div>" +
                "<div class=\"dd-pill dd-money-pill\">" + money(p.money) + "</div>" +
              "</div>";
          }).join("") +
        "</div>" +
      "</div>";
  }

  function renderVoteResults() {
    const entries = Object.keys(state.lastVoteCounts || {}).map(function (id) {
      return {
        player: getPlayer(id),
        count: state.lastVoteCounts[id] || 0
      };
    }).filter(function (entry) {
      return !!entry.player;
    }).sort(function (a, b) {
      return b.count - a.count;
    });

    const winners = state.lastWinnerIds.map(getPlayer).filter(Boolean);
    const payout = Math.floor(ROUND_PAYOUTS[state.round] / Math.max(1, winners.length));

    return "" +
      "<div class=\"dd-result\">🏆 " + winners.map(function (p) {
        return icon(p, true);
      }).join(" ") + " +" + money(payout) + "</div>" +
      entries.map(function (entry) {
        return "<div class=\"dd-result\">" + icon(entry.player, true) + " ✓ " + entry.count + "</div>";
      }).join("");
  }

  function wireEvents() {
    const startBtn = byId("ddStartBtn");

    if (startBtn) {
      startBtn.addEventListener("click", function () {
        const total = clamp(byId("ddPlayerCount").value, 6, 16);
        const name = (byId("ddNameInput").value || "You").trim() || "You";
        startNewGame(total, name);
      });
    }

    document.querySelectorAll("[data-zoom]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const action = btn.getAttribute("data-zoom");

        if (action === "in") {
          setZoom(getZoom() + 0.10);
        } else if (action === "out") {
          setZoom(getZoom() - 0.10);
        }

        render();
      });
    });

    const scroll = byId("ddScroll");

    if (scroll) {
      scroll.addEventListener("touchstart", function (event) {
        if (event.touches && event.touches.length === 2) {
          ddPinchStartDistance = touchDistance(event.touches);
          ddPinchStartZoom = getZoom();
        }
      }, { passive: true });

      scroll.addEventListener("touchmove", function (event) {
        if (event.touches && event.touches.length === 2) {
          event.preventDefault();

          const currentDistance = touchDistance(event.touches);
          if (!ddPinchStartDistance || !currentDistance) return;

          setZoom(ddPinchStartZoom * (currentDistance / ddPinchStartDistance));

          const inner = byId("ddInner");
          const label = document.querySelector(".dd-zoom-label");

          if (inner) {
            inner.style.zoom = getZoom();
          }

          if (label) {
            label.textContent = Math.round(getZoom() * 100) + "%";
          }
        }
      }, { passive: false });
    }

    document.querySelectorAll("[data-picker-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function (event) {
        event.stopPropagation();

        const name = btn.getAttribute("data-picker-toggle");
        state.ui = state.ui || {};
        state.ui.openPicker = state.ui.openPicker === name ? "" : name;

        const amountInput = byId("ddDealAmount");
        if (amountInput) {
          state.ui.dealAmount = clamp(amountInput.value, 0, 99);
        }

        render();
      });
    });

    document.querySelectorAll("[data-picker-name]").forEach(function (btn) {
      btn.addEventListener("click", function (event) {
        event.stopPropagation();

        const name = btn.getAttribute("data-picker-name");
        const value = btn.getAttribute("data-picker-value");

        state.ui = state.ui || {};
        state.ui[name] = value;
        state.ui.openPicker = "";

        const amountInput = byId("ddDealAmount");
        if (amountInput) {
          state.ui.dealAmount = clamp(amountInput.value, 0, 99);
        }

        render();
      });
    });

    document.querySelectorAll("#ddRestartBtn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state = {
          phase: "lobby",
          round: 1,
          ui: {
            zoom: getZoom()
          }
        };

        render();
      });
    });

    const amountInput = byId("ddDealAmount");

    if (amountInput) {
      amountInput.addEventListener("input", function () {
        state.ui = state.ui || {};
        state.ui.dealAmount = clamp(amountInput.value, 0, 99);
      });
    }

    const sendDealBtn = byId("ddSendDealBtn");
    if (sendDealBtn) sendDealBtn.addEventListener("click", makeHumanDeal);

    const voteBtn = byId("ddGoVoteBtn");
    if (voteBtn) {
      voteBtn.addEventListener("click", function () {
        state.phase = "vote";
        state.ui.openPicker = "";
        render();
      });
    }

    document.querySelectorAll("[data-accept-deal]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        acceptDeal(btn.getAttribute("data-accept-deal"));
        render();
      });
    });

    document.querySelectorAll("[data-reject-deal]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        rejectDeal(btn.getAttribute("data-reject-deal"));
        render();
      });
    });

    document.querySelectorAll("[data-vote-for]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        castHumanVote(btn.getAttribute("data-vote-for"));
      });
    });

    document.querySelectorAll("[data-settle-full]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        settleDeal(btn.getAttribute("data-settle-full"), "full");
        render();
      });
    });

    document.querySelectorAll("[data-settle-half]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        settleDeal(btn.getAttribute("data-settle-half"), "half");
        render();
      });
    });

    document.querySelectorAll("[data-settle-break]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        settleDeal(btn.getAttribute("data-settle-break"), "break");
        render();
      });
    });

    const finishBtn = byId("ddFinishSettlementBtn");

    if (finishBtn) {
      finishBtn.addEventListener("click", function () {
        autoBreakHumanUnsettled();
        autoExposeBots();
        state.phase = "expose";
        render();
      });
    }

    document.querySelectorAll("[data-expose]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        exposeDeal(btn.getAttribute("data-expose"), human().id);
        render();
      });
    });

    const nextBtn = byId("ddNextRoundBtn");

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        if (state.round >= MAX_ROUNDS) {
          state.phase = "final";
          log("final reveal");
        } else {
          state.round += 1;
          startRound();
        }

        render();
      });
    }
  }

  function makePlayer(id, kind, name, identityCard) {
    return {
      id: id,
      kind: kind,
      realName: name,
      color: identityCard.color,
      shape: identityCard.shape,
      money: STARTING_MONEY,
      exposeToken: true,
      honesty: kind === "human" ? 0.55 : Math.random() * 0.45 + 0.35,
      boldness: kind === "human" ? 0.5 : Math.random() * 0.55 + 0.20
    };
  }

  function startNewGame(totalPlayers, humanName) {
    const deck = identitiesDeck();
    const names = shuffle(BOT_NAMES);
    const players = [makePlayer("P0", "human", humanName, deck.shift())];

    for (let i = 1; i < totalPlayers; i += 1) {
      players.push(makePlayer("P" + i, "bot", names[i - 1] || ("Bot " + i), deck.shift()));
    }

    state = {
      phase: "deal",
      round: 1,
      players: players,
      deals: [],
      votes: {},
      lastVoteCounts: {},
      lastWinnerIds: [],
      log: [],
      dealSerial: 1,
      ui: {
        zoom: 1,
        openPicker: "",
        dealType: "payForVote",
        dealAmount: 8
      }
    };

    log("started · YOU " + icon(players[0], true));
    startRound();
    render();
  }

  function startRound() {
    state.phase = "deal";
    state.votes = {};
    state.lastVoteCounts = {};
    state.lastWinnerIds = [];
    state.ui.openPicker = "";

    const income = roundIncome(state.round);

    state.players.forEach(function (p) {
      p.money += income;
    });

    state.deals.forEach(function (deal) {
      if (deal.status === "pending") {
        deal.status = "expired";
      }
    });

    log("R" + state.round + " +" + money(income));
    generateBotOffersToHuman();
    generateHiddenBotDeals();
  }

  function roundIncome(round) {
    if (round <= 2) return 10;
    if (round <= 4) return 12;
    return 15;
  }

  function log(html) {
    state.log.push(html);

    if (state.log.length > 120) {
      state.log.shift();
    }
  }

  function newDeal(data) {
    const deal = {
      id: "D" + state.dealSerial,
      round: state.round,
      from: data.from,
      to: data.to,
      type: data.type,
      target: data.target || null,
      amount: num(data.amount),
      status: data.status || "pending",
      payer: data.payer || null,
      payee: data.payee || null,
      voteExpectation: data.voteExpectation || null,
      moneyOwed: 0,
      possibleMoney: num(data.possibleMoney),
      settlement: "none",
      exposed: false,
      privateBotDeal: !!data.privateBotDeal
    };

    state.dealSerial += 1;
    state.deals.push(deal);

    return deal;
  }

  function buildDealData(fromId, toId, type, amount, targetId, privateBotDeal) {
    const data = {
      from: fromId,
      to: toId,
      type: type,
      amount: amount,
      target: targetId,
      privateBotDeal: !!privateBotDeal,
      possibleMoney: amount
    };

    if (type === "payForVote") {
      data.target = fromId;
      data.payer = fromId;
      data.payee = toId;
      data.voteExpectation = {
        voter: toId,
        target: fromId
      };
    } else if (type === "sellVote") {
      data.target = toId;
      data.payer = toId;
      data.payee = fromId;
      data.voteExpectation = {
        voter: fromId,
        target: toId
      };
    } else if (type === "voteTarget") {
      data.amount = 0;
      data.possibleMoney = 0;
      data.target = targetId;
      data.payer = null;
      data.payee = null;
      data.voteExpectation = {
        voter: toId,
        target: targetId
      };
    } else if (type === "winnerSplit") {
      data.target = fromId;
      data.payer = fromId;
      data.payee = toId;
      data.voteExpectation = {
        voter: toId,
        target: fromId
      };
    }

    return data;
  }

  function makeHumanDeal() {
    const me = human();
    ensureDealUi(me);

    const toId = state.ui.dealTo;
    const type = state.ui.dealType;
    const amount = clamp(state.ui.dealAmount, 0, 99);
    const targetId = state.ui.dealTarget;

    if (!toId || toId === me.id) return;

    const deal = newDeal(buildDealData(me.id, toId, type, amount, targetId, false));
    const accepted = botRespondsToDeal(deal);

    log("YOU 🤝 " + icon(getPlayer(toId), true) + " " + (accepted ? "✓" : "✗"));
    render();
  }

  function acceptDeal(id) {
    const deal = state.deals.find(function (d) {
      return d.id === id;
    });

    if (!deal || deal.status !== "pending") return;

    deal.status = "accepted";
    log("YOU ✓ " + icon(getPlayer(deal.from), true));
  }

  function rejectDeal(id) {
    const deal = state.deals.find(function (d) {
      return d.id === id;
    });

    if (!deal || deal.status !== "pending") return;

    deal.status = "rejected";
    log("YOU ✗ " + icon(getPlayer(deal.from), true));
  }

  function botRespondsToDeal(deal) {
    const bot = getPlayer(deal.to);

    if (!bot || bot.kind !== "bot") return false;

    let acceptChance = 0.42;

    if (deal.amount >= 5) acceptChance += 0.12;
    if (deal.amount >= 10) acceptChance += 0.12;
    if (deal.amount >= 15) acceptChance += 0.08;
    if (deal.type === "voteTarget") acceptChance = 0.55;
    if (deal.payer === bot.id && deal.amount > bot.money) acceptChance -= 0.20;
    if (deal.type === "winnerSplit") acceptChance -= 0.04;

    const accepted = chance(acceptChance);
    deal.status = accepted ? "accepted" : "rejected";

    return accepted;
  }

  function generateBotOffersToHuman() {
    const me = human();
    const bots = shuffle(botPlayers());
    const count = Math.min(randomInt(1, 3), bots.length);

    bots.slice(0, count).forEach(function (bot) {
      const type = choice(["payForVote", "sellVote", "voteTarget", "winnerSplit"]);
      const amount = randomInt(4, 14);
      const target = choice(others(bot.id));

      newDeal(buildDealData(bot.id, me.id, type, amount, target.id, false));
    });
  }

  function generateHiddenBotDeals() {
    const bots = shuffle(botPlayers());
    const count = Math.min(randomInt(1, 3), Math.floor(bots.length / 2));

    for (let i = 0; i < count; i += 1) {
      const from = bots[i];
      const possibleTo = bots.filter(function (bot) {
        return bot.id !== from.id;
      });

      const to = choice(possibleTo);
      const type = choice(["payForVote", "sellVote", "voteTarget", "winnerSplit"]);
      const target = choice(state.players.filter(function (p) {
        return p.id !== from.id;
      }));

      const deal = newDeal(buildDealData(from.id, to.id, type, randomInt(3, 15), target.id, true));
      deal.status = chance(0.62) ? "accepted" : "rejected";
    }
  }

  function castHumanVote(targetId) {
    const me = human();

    if (!getPlayer(targetId) || targetId === me.id) return;

    state.votes[me.id] = targetId;
    log("YOU ✓ " + icon(getPlayer(targetId), true));

    autoCastBotVotes();
    resolveVotes();

    state.phase = "settlement";
    render();
  }

  function autoCastBotVotes() {
    botPlayers().forEach(function (bot) {
      state.votes[bot.id] = chooseBotVote(bot);
    });
  }

  function chooseBotVote(bot) {
    const candidates = others(bot.id);
    const scores = {};

    candidates.forEach(function (p) {
      scores[p.id] = Math.random() * 8;

      if (p.money > bot.money) scores[p.id] -= 1;
      if (p.money < bot.money) scores[p.id] += 1;
    });

    state.deals.forEach(function (deal) {
      if (deal.round !== state.round || deal.status !== "accepted") return;

      if (deal.voteExpectation && deal.voteExpectation.voter === bot.id) {
        scores[deal.voteExpectation.target] = (scores[deal.voteExpectation.target] || 0) + 9 + (deal.amount || 0);
      }

      if (deal.type === "voteTarget" && (deal.from === bot.id || deal.to === bot.id) && deal.target) {
        scores[deal.target] = (scores[deal.target] || 0) + 8;
      }
    });

    let bestId = candidates[0].id;

    candidates.forEach(function (p) {
      if ((scores[p.id] || 0) > (scores[bestId] || 0)) {
        bestId = p.id;
      }
    });

    if (chance(bot.boldness * 0.18)) {
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

    const winners = Object.keys(counts).filter(function (id) {
      return counts[id] === maxVotes;
    });

    state.lastVoteCounts = counts;
    state.lastWinnerIds = winners;

    const payoutEach = Math.floor(ROUND_PAYOUTS[state.round] / Math.max(1, winners.length));

    winners.forEach(function (id) {
      getPlayer(id).money += payoutEach;
    });

    Object.keys(state.votes).forEach(function (voterId) {
      const votedForWinner = winners.includes(state.votes[voterId]);

      if (votedForWinner && !winners.includes(voterId)) {
        getPlayer(voterId).money += VOTER_BONUS;
      }
    });

    log("🏆 " + winners.map(function (id) {
      return icon(getPlayer(id), true);
    }).join(" ") + " +" + money(payoutEach));

    log("✓→🏆 +" + money(VOTER_BONUS));

    activateTriggeredDeals(winners);
    autoSettleBotDeals();
  }

  function activateTriggeredDeals(winners) {
    state.deals.forEach(function (deal) {
      if (deal.round !== state.round || deal.status !== "accepted") return;
      if (!deal.payer || !deal.payee || !deal.possibleMoney) return;

      let triggered = false;

      if (deal.type === "winnerSplit") {
        triggered = winners.includes(deal.payer);
      } else if (deal.voteExpectation) {
        triggered = state.votes[deal.voteExpectation.voter] === deal.voteExpectation.target;
      }

      if (triggered) {
        deal.moneyOwed = deal.possibleMoney;
        deal.settlement = "unsettled";
      } else {
        deal.moneyOwed = 0;
        deal.settlement = "none";
      }
    });
  }

  function autoSettleBotDeals() {
    state.deals.filter(function (deal) {
      const payer = getPlayer(deal.payer);

      return deal.round === state.round &&
        deal.status === "accepted" &&
        deal.moneyOwed > 0 &&
        deal.settlement === "unsettled" &&
        payer &&
        payer.kind === "bot";
    }).forEach(function (deal) {
      const payer = getPlayer(deal.payer);
      const canAfford = payer.money >= deal.moneyOwed;

      let payChance = payer.honesty + (canAfford ? 0.24 : -0.18);

      if (deal.type === "winnerSplit" && state.lastWinnerIds.includes(payer.id)) {
        payChance += 0.12;
      }

      if (chance(payChance)) {
        payDeal(deal, deal.moneyOwed, "paid");
      } else if (chance(0.35) && payer.money > 0) {
        payDeal(deal, Math.floor(deal.moneyOwed / 2), "partial");
      } else {
        deal.settlement = "broken";

        if (!deal.privateBotDeal && deal.payee === human().id) {
          log(icon(payer, true) + " ✗ " + money(deal.moneyOwed));
        }
      }
    });
  }

  function settleDeal(id, mode) {
    const deal = state.deals.find(function (d) {
      return d.id === id;
    });

    if (!deal || deal.settlement !== "unsettled") return;

    if (mode === "full") {
      payDeal(deal, deal.moneyOwed, "paid");
    } else if (mode === "half") {
      payDeal(deal, Math.floor(deal.moneyOwed / 2), "partial");
    } else {
      deal.settlement = "broken";
      log("YOU ✗ " + icon(getPlayer(deal.payee), true) + " " + money(deal.moneyOwed));
    }
  }

  function payDeal(deal, amount, status) {
    const payer = getPlayer(deal.payer);
    const payee = getPlayer(deal.payee);

    if (!payer || !payee) return;

    const paid = Math.min(payer.money, num(amount));

    payer.money -= paid;
    payee.money += paid;

    deal.settlement = status === "paid" && paid >= deal.moneyOwed ? "paid" : "partial";

    if (!deal.privateBotDeal || payer.kind === "human" || payee.kind === "human") {
      log(icon(payer, true) + " → " + icon(payee, true) + " " + money(paid));
    }
  }

  function autoBreakHumanUnsettled() {
    state.deals.filter(function (deal) {
      return deal.round === state.round &&
        deal.status === "accepted" &&
        deal.moneyOwed > 0 &&
        deal.settlement === "unsettled" &&
        deal.payer === human().id;
    }).forEach(function (deal) {
      settleDeal(deal.id, "break");
    });
  }

  function autoExposeBots() {
    state.deals.filter(function (deal) {
      const payee = getPlayer(deal.payee);

      return deal.round === state.round &&
        deal.status === "accepted" &&
        deal.settlement === "broken" &&
        payee &&
        payee.kind === "bot" &&
        payee.exposeToken &&
        !deal.exposed;
    }).forEach(function (deal) {
      const payee = getPlayer(deal.payee);

      if (chance(0.45)) {
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

    if (!deal.privateBotDeal || exposer.kind === "human" || liar.kind === "human") {
      log(icon(exposer, true) + " 👁 " + icon(liar, true) + " " + money(EXPOSE_REWARD));
    }
  }

  function startDeceptionGame() {
    if (window.cleanupRunningGameEngine && window.cleanupRunningGameEngine !== cleanupDeceptionGame) {
      previousCleanup = window.cleanupRunningGameEngine;

      try {
        previousCleanup();
      } catch (e) {}
    }

    openChaserStage();

    window.cleanupRunningGameEngine = cleanupDeceptionGame;

    state = {
      phase: "lobby",
      round: 1,
      ui: {
        zoom: 1,
        openPicker: ""
      }
    };

    render();
  }

  function cleanupDeceptionGame() {
    const mount = findMount();

    if (mount && byId("deceptionApp")) {
      mount.innerHTML = "";
    }

    state = null;
  }

  function isDeceptionName(name) {
    const text = String(name || "").toLowerCase();

    return text === "deception" ||
      text.includes("deception") ||
      text.includes("deceit") ||
      text.includes("deceipt") ||
      text.includes("deals");
  }

  function installLaunchWrapper() {
    if (window.__deceptionLaunchWrapperInstalled) return;
    window.__deceptionLaunchWrapperInstalled = true;

    const oldLaunch = window.launchGameEngine;

    if (typeof oldLaunch === "function") {
      window.launchGameEngine = function (gameName, iconValue) {
        if (isDeceptionName(gameName)) {
          startDeceptionGame();
          return;
        }

        return oldLaunch.apply(this, arguments);
      };
    }
  }

  document.addEventListener("click", function (event) {
    const gameButton = event.target.closest("[data-game], #deceptionGameButton, #dealsDeceptionButton");

    if (!gameButton) return;

    const value = String(gameButton.getAttribute("data-game") || gameButton.id || "");

    if (isDeceptionName(value)) {
      event.preventDefault();
      event.stopPropagation();
      startDeceptionGame();
    }
  }, true);

  window.startDeceptionGame = startDeceptionGame;
  window.startDealsDeceitGame = startDeceptionGame;
  window.startDealsDeceptionGame = startDeceptionGame;
  window.cleanupDeceptionGame = cleanupDeceptionGame;

  window.CHASER_GAMES = window.CHASER_GAMES || {};
  window.CHASER_GAMES.deception = startDeceptionGame;
  window.CHASER_GAMES.dealsDeception = startDeceptionGame;

  installLaunchWrapper();
  setTimeout(installLaunchWrapper, 300);
  setTimeout(installLaunchWrapper, 1000);
})();
