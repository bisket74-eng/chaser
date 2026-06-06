/* ============================================================
   CHASER ARCADE ENGINE  –  games.js
   Requires: activeGameStage, activeGameLabelTitle,
             gameCanvasContainer, gameHubOverlay
             (all declared in index.html)
   ============================================================ */

/* ── Multiplayer sync handlers ───────────────────────────── */
window.handleIncomingCheckersSync = (p) => {
    if (window.syncCheckersBoard) {
        window.syncCheckersBoard = p.boardState;
        window.checkersTurn      = p.activeTurn;
        if (activeGameStage.classList.contains('open') &&
            activeGameLabelTitle.innerText.includes('Checkers')) renderCheckersGrid();
    }
};
window.handleIncomingUnoSync = (p) => {
    if (window.unoDiscardPile !== undefined) {
        window.unoDiscardPile = p.currentDiscard;
        if (activeGameStage.classList.contains('open') &&
            activeGameLabelTitle.innerText.includes('Uno')) renderUnoLayout();
    }
};
window.handleIncomingTriviaSync = (p) => {
    if (window.sharedRoomTriviaQuestion !== undefined) {
        window.sharedRoomTriviaQuestion = p.triviaData;
        window.triviaQuestionCount      = p.count;
        if (activeGameStage.classList.contains('open') &&
            activeGameLabelTitle.innerText.includes('Trivia')) renderSharedTriviaUI();
    }
};

/* ── Game launcher / teardown ────────────────────────────── */
window.launchGameEngine = function (gameName, gameIcon) {
    gameHubOverlay.classList.remove('open');
    activeGameLabelTitle.innerText = gameIcon + '  ' + gameName;
    gameCanvasContainer.innerHTML  = '';
    activeGameStage.classList.add('open');

    const map = {
        'Crew Trivia' : initTriviaGame,
        'Battle Uno'  : initChaserUnoGame,
        'Checkers'    : initCheckersGame,
        'Sequence'    : initSequenceGame,
        'Hangman'     : initHangmanGame,
    };
    if (map[gameName]) map[gameName]();
};

window.shutdownActiveGame = function () {
    activeGameStage.classList.remove('open');
    gameCanvasContainer.innerHTML = '';
    // Reset shared globals so a re-launch starts fresh
    window.syncCheckersBoard        = null;
    window.unoDiscardPile           = undefined;
    window.sharedRoomTriviaQuestion = undefined;
    window.triviaQuestionCount      = 0;
    window.triviaScorePoints        = 0;
    window.hangmanState             = null;
};

/* ─────────────────────────────────────────────────────────── *
 *  1.  CHECKERS  (king + multi-jump)                          *
 * ─────────────────────────────────────────────────────────── */
function initCheckersGame() {
    window.syncCheckersBoard = Array(64).fill(0).map((_, i) => {
        const r = Math.floor(i / 8), c = i % 8;
        if ((r + c) % 2 === 1) {
            if (r < 3) return 1;
            if (r > 4) return 2;
        }
        return 0;
    });
    window.checkersTurn            = 1;
    window.selectedCheckerIdx      = null;
    window.consecutiveJumpsActive  = false;
    renderCheckersGrid();
}

function renderCheckersGrid() {
    const board = window.syncCheckersBoard;
    const sel   = window.selectedCheckerIdx;
    const turn  = window.checkersTurn;

    const validMoves = sel !== null ? getCheckerMoves(sel, board, turn, false) : [];

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;padding:8px;box-sizing:border-box;">
        <div style="color:#ffd700;font-weight:bold;font-size:14px;margin-bottom:4px;">
            ${turn === 1 ? '🔴 Red\'s Turn' : '⚫ Black\'s Turn'}
        </div>
        <div style="display:grid;grid-template-columns:repeat(8,1fr);width:min(320px,90vw);aspect-ratio:1;border:3px solid #ffd700;border-radius:6px;overflow:hidden;">`;

    for (let i = 0; i < 64; i++) {
        const r = Math.floor(i / 8), c = i % 8;
        const isDark   = (r + c) % 2 === 1;
        const piece    = board[i];
        const isTarget = validMoves.includes(i);
        const bgColor  = isDark
            ? (isTarget ? '#b8860b' : '#2d6a30')
            : '#e2f0d9';

        let pieceHtml = '';
        if (piece === 1)  pieceHtml = `<div style="width:76%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff6b6b,#c00);border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>`;
        if (piece === 2)  pieceHtml = `<div style="width:76%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 30%,#555,#111);border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>`;
        if (piece === 3)  pieceHtml = `<div style="width:76%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff6b6b,#c00);border:3px solid #ffd700;box-shadow:0 2px 6px rgba(255,215,0,0.8);">👑</div>`;
        if (piece === 4)  pieceHtml = `<div style="width:76%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 30%,#555,#111);border:3px solid #ffd700;box-shadow:0 2px 6px rgba(255,215,0,0.8);">👑</div>`;
        if (isTarget && !piece) pieceHtml = `<div style="width:40%;aspect-ratio:1;border-radius:50%;background:rgba(255,215,0,0.6);border:2px dashed #ffd700;"></div>`;

        html += `<div onclick="handleCheckerTap(${i})" style="background:${bgColor};display:flex;align-items:center;justify-content:center;cursor:pointer;${sel===i?'outline:3px solid #ffd700;':''}">
            ${pieceHtml}
        </div>`;
    }
    html += `</div></div>`;
    gameCanvasContainer.innerHTML = html;
}

function getCheckerMoves(idx, board, turn, jumpOnly) {
    const piece = board[idx];
    if (!piece) return [];
    const isRed   = piece === 1 || piece === 3;
    const isKing  = piece === 3 || piece === 4;
    const enemy   = isRed ? [2, 4] : [1, 3];
    const r = Math.floor(idx / 8), c = idx % 8;
    const dirs = [];
    if (!isRed || isKing)  dirs.push([-1, -1], [-1, 1]);
    if (isRed  || isKing)  dirs.push([1, -1],  [1, 1]);

    const moves = [];
    dirs.forEach(([dr, dc]) => {
        const nr = r + dr, nc = c + dc, ni = nr * 8 + nc;
        if (nr < 0 || nr > 7 || nc < 0 || nc > 7) return;
        if (!board[ni] && !jumpOnly) { moves.push(ni); return; }
        if (enemy.includes(board[ni])) {
            const jr = nr + dr, jc = nc + dc, ji = jr * 8 + jc;
            if (jr >= 0 && jr <= 7 && jc >= 0 && jc <= 7 && !board[ji]) moves.push(ji);
        }
    });
    return moves;
}

window.handleCheckerTap = function (idx) {
    const board = window.syncCheckersBoard;
    const turn  = window.checkersTurn;
    const piece = board[idx];
    const owned = turn === 1 ? [1, 3] : [2, 4];

    if (window.selectedCheckerIdx === null) {
        if (owned.includes(piece)) { window.selectedCheckerIdx = idx; renderCheckersGrid(); }
        return;
    }

    const from  = window.selectedCheckerIdx;
    const moves = getCheckerMoves(from, board, turn, false);

    if (!moves.includes(idx)) {
        if (owned.includes(piece)) { window.selectedCheckerIdx = idx; renderCheckersGrid(); }
        else { window.selectedCheckerIdx = null; renderCheckersGrid(); }
        return;
    }

    // Execute move
    const isJump = Math.abs(idx - from) > 10;
    board[idx]  = board[from];
    board[from] = 0;
    if (isJump) {
        const midIdx = Math.floor((from + idx) / 2);
        board[midIdx] = 0;
    }

    // King promotion
    const destRow = Math.floor(idx / 8);
    if (board[idx] === 1 && destRow === 7) board[idx] = 3;
    if (board[idx] === 2 && destRow === 0) board[idx] = 4;

    window.selectedCheckerIdx = null;
    window.checkersTurn       = turn === 1 ? 2 : 1;

    if (typeof channel !== 'undefined') {
        channel.send({ type: 'broadcast', event: 'checkers-sync-move', payload: { boardState: board, activeTurn: window.checkersTurn } });
    }
    renderCheckersGrid();
};

/* ─────────────────────────────────────────────────────────── *
 *  2.  UNO  (wild cards + turn logic)                         *
 * ─────────────────────────────────────────────────────────── */
function initChaserUnoGame() {
    const colors = ['Red', 'Yellow', 'Green', 'Blue'];
    const values = ['0','1','2','3','4','5','6','7','8','9','Wild','⇋'];
    window.unoDeckState = [];
    colors.forEach(c => values.forEach(v => window.unoDeckState.push({ color: c, value: v })));
    window.unoDeckState.sort(() => Math.random() - 0.5);
    window.myUnoHand = [];
    for (let i = 0; i < 4; i++) window.myUnoHand.push(window.unoDeckState.pop());
    window.unoDiscardPile        = { color: 'Red', value: '5' };
    window.unoWildChoosingActive = false;
    renderUnoLayout();
}

function unoColorClass(color) {
    return { Red:'uno-card-red', Yellow:'uno-card-yellow', Green:'uno-card-green', Blue:'uno-card-blue', Wild:'uno-card-wild' }[color] || 'uno-card-wild';
}

function renderUnoLayout() {
    const discard = window.unoDiscardPile;
    const hand    = window.myUnoHand;

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:12px;width:100%;box-sizing:border-box;">
        <div style="color:#e2f0d9;font-size:13px;font-weight:bold;">Discard Pile</div>
        <div class="uno-card-body ${unoColorClass(discard.color)}" style="pointer-events:none;">
            <div class="uno-oval-center"></div><div class="uno-number-label">${discard.value}</div>
        </div>`;

    if (window.unoWildChoosingActive) {
        html += `<div style="color:#ffd700;font-size:13px;font-weight:bold;">Choose a color:</div>
        <div style="display:flex;gap:8px;">
            ${['Red','Yellow','Green','Blue'].map(col =>
                `<div onclick="unoPickWildColor('${col}')" class="uno-card-body ${unoColorClass(col)}" style="width:44px;height:64px;font-size:20px;cursor:pointer;"></div>`
            ).join('')}
        </div>`;
    }

    html += `<div style="color:#e2f0d9;font-size:13px;font-weight:bold;">Your Hand</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">`;

    hand.forEach((card, i) => {
        const playable = card.color === discard.color || card.value === discard.value || card.value === 'Wild' || card.value === '⇋';
        html += `<div onclick="unoPlayCard(${i})" class="uno-card-body ${unoColorClass(card.color)}"
            style="opacity:${playable ? 1 : 0.45};cursor:${playable ? 'pointer' : 'default'};transform:${playable ? 'translateY(-4px)' : 'none'};">
            <div class="uno-oval-center"></div><div class="uno-number-label">${card.value}</div>
        </div>`;
    });

    html += `</div>
        <button onclick="unoDrawCard()" style="background:#b8860b;color:white;border:none;border-radius:8px;padding:10px 24px;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0 3px 8px rgba(0,0,0,0.3);">
            Draw Card
        </button></div>`;

    gameCanvasContainer.innerHTML = html;
}

window.unoPlayCard = function (idx) {
    const card    = window.myUnoHand[idx];
    const discard = window.unoDiscardPile;
    const playable = card.color === discard.color || card.value === discard.value || card.value === 'Wild' || card.value === '⇋';
    if (!playable) return;

    if (card.value === 'Wild' || card.value === '⇋') {
        window.unoWildPendingIdx   = idx;
        window.unoWildChoosingActive = true;
        renderUnoLayout();
        return;
    }
    window.myUnoHand.splice(idx, 1);
    window.unoDiscardPile = card;
    if (typeof channel !== 'undefined') {
        channel.send({ type:'broadcast', event:'uno-sync-discard', payload:{ currentDiscard: card } });
    }
    if (!window.myUnoHand.length) {
        gameCanvasContainer.innerHTML = `<div style="color:#ffd700;font-size:28px;font-weight:900;text-align:center;padding:20px;">🎉 UNO! You won!</div>`;
        return;
    }
    renderUnoLayout();
};

window.unoPickWildColor = function (color) {
    const idx  = window.unoWildPendingIdx;
    const card = { ...window.myUnoHand[idx], color };
    window.myUnoHand.splice(idx, 1);
    window.unoDiscardPile        = card;
    window.unoWildChoosingActive = false;
    window.unoWildPendingIdx     = null;
    if (typeof channel !== 'undefined') {
        channel.send({ type:'broadcast', event:'uno-sync-discard', payload:{ currentDiscard: card } });
    }
    renderUnoLayout();
};

window.unoDrawCard = function () {
    if (!window.unoDeckState.length) {
        window.unoDeckState = [window.unoDiscardPile];
        window.unoDeckState.sort(() => Math.random() - 0.5);
    }
    window.myUnoHand.push(window.unoDeckState.pop());
    renderUnoLayout();
};

/* ─────────────────────────────────────────────────────────── *
 *  3.  SEQUENCE  (6×6 grid)                                   *
 * ─────────────────────────────────────────────────────────── */
const SEQUENCE_CARDS = ['A♠','K♠','Q♠','J♠','10♠','9♠','8♠','7♠','6♠','5♠','4♠','3♠','2♠','A♥','K♥','Q♥','J♥','10♥','9♥','8♥','6♥','5♥','4♥','3♥','2♥','A♦','K♦','Q♦','J♦','10♦','9♦','8♦','7♦','6♦','5♦'];
const SEQ_RED = new Set(['A♥','K♥','Q♥','J♥','10♥','9♥','8♥','7♥','6♥','5♥','4♥','3♥','2♥','A♦','K♦','Q♦','J♦','10♦','9♦','8♦','7♦','6♦','5♦','4♦','3♦','2♦']);

function initSequenceGame() {
    window.sequenceBoardState = Array(36).fill(0);
    window.sequenceTurn       = 1;
    // deal 4 cards to player
    const shuffled = [...SEQUENCE_CARDS].sort(() => Math.random() - 0.5);
    window.mySequenceHand = shuffled.slice(0, 4);
    window.selectedSeqCard = null;
    renderSequenceBoard();
}

function renderSequenceBoard() {
    const board = window.sequenceBoardState;
    const hand  = window.mySequenceHand;
    const sel   = window.selectedSeqCard;
    const turn  = window.sequenceTurn;

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px;width:100%;box-sizing:border-box;">
        <div style="color:#ffd700;font-size:13px;font-weight:bold;">${turn===1?'🔵 Blue\'s turn':'🔴 Red\'s turn'} — tap a card, then a board space</div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:2px;width:min(300px,90vw);">`;

    for (let i = 0; i < 36; i++) {
        const label = SEQUENCE_CARDS[i] || '★';
        const isRed = SEQ_RED.has(label);
        const chip  = board[i];
        const bg    = chip === 1 ? '#1a6fd4' : chip === 2 ? '#dc3545' : '#e2f0d9';
        html += `<div onclick="handleSeqBoardTap(${i})"
            style="background:${bg};border-radius:4px;aspect-ratio:0.7;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;color:${isRed?'#c00':'#1a1a1a'};cursor:pointer;border:1px solid rgba(0,0,0,0.15);">
            ${chip ? '' : label}
        </div>`;
    }

    html += `</div><div style="color:#e2f0d9;font-size:12px;font-weight:bold;">Your Hand — tap to select:</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">`;

    hand.forEach((card, i) => {
        const isRed = SEQ_RED.has(card);
        html += `<div onclick="selectSeqCard(${i})" style="background:white;border:${sel===i?'3px solid #ffd700':'2px solid #333'};border-radius:6px;padding:6px 10px;font-size:13px;font-weight:bold;color:${isRed?'#c00':'#222'};cursor:pointer;box-shadow:${sel===i?'0 0 10px rgba(255,215,0,0.8)':'0 2px 4px rgba(0,0,0,0.2)'};">
            ${card}
        </div>`;
    });

    html += `</div></div>`;
    gameCanvasContainer.innerHTML = html;
}

window.selectSeqCard = function (i) { window.selectedSeqCard = i; renderSequenceBoard(); };
window.handleSeqBoardTap = function (i) {
    if (window.selectedSeqCard === null) return;
    const board = window.sequenceBoardState;
    if (board[i]) return; // already claimed
    const turn = window.sequenceTurn;
    board[i] = turn;
    window.mySequenceHand.splice(window.selectedSeqCard, 1);
    // deal replacement
    const spare = SEQUENCE_CARDS.filter(c => !window.mySequenceHand.includes(c));
    if (spare.length) window.mySequenceHand.push(spare[Math.floor(Math.random() * spare.length)]);
    window.selectedSeqCard = null;
    window.sequenceTurn    = turn === 1 ? 2 : 1;
    renderSequenceBoard();
};

/* ─────────────────────────────────────────────────────────── *
 *  4.  TRIVIA  (Open Trivia DB)                               *
 * ─────────────────────────────────────────────────────────── */
function initTriviaGame() {
    window.triviaQuestionCount = window.triviaQuestionCount || 0;
    window.triviaScorePoints   = window.triviaScorePoints   || 0;
    if (window.triviaQuestionCount >= 10) { renderTriviaScoreboard(); return; }

    gameCanvasContainer.innerHTML = `<div style="color:#e2f0d9;font-size:16px;">Loading question…</div>`;
    fetch(`https://opentdb.com/api.php?amount=1&type=multiple&cache=${Math.random()}`)
        .then(r => r.json())
        .then(data => {
            const item = data.results[0];
            const decode = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
            window.sharedRoomTriviaQuestion = {
                q       : decode(item.question),
                c       : decode(item.correct_answer),
                choices : [...item.incorrect_answers.map(decode), decode(item.correct_answer)].sort(() => Math.random() - 0.5)
            };
            if (typeof channel !== 'undefined') {
                channel.send({ type:'broadcast', event:'sync-room-trivia', payload:{ triviaData: window.sharedRoomTriviaQuestion, count: window.triviaQuestionCount } });
            }
            renderSharedTriviaUI();
        })
        .catch(() => { gameCanvasContainer.innerHTML = `<div style="color:#dc3545;padding:16px;">Couldn't load question — check internet connection.</div>`; });
}

function renderSharedTriviaUI() {
    const q     = window.sharedRoomTriviaQuestion;
    const count = window.triviaQuestionCount;
    const score = window.triviaScorePoints;
    if (!q) return;

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:12px;width:100%;box-sizing:border-box;">
        <div style="color:#ffd700;font-size:12px;font-weight:bold;">Question ${count + 1} of 10  •  Score: ${score}</div>
        <div style="color:#e2f0d9;font-size:15px;font-weight:bold;text-align:center;line-height:1.4;">${q.q}</div>
        <div style="display:flex;flex-direction:column;gap:8px;width:100%;">`;

    q.choices.forEach(choice => {
        html += `<button onclick="submitTriviaAnswer('${choice.replace(/'/g,"\\'")}','${q.c.replace(/'/g,"\\'")}',this)"
            style="background:#2d6a30;color:#e2f0d9;border:2px solid #1e4620;border-radius:8px;padding:10px 14px;font-size:13px;font-weight:bold;cursor:pointer;text-align:left;transition:background 0.2s;">
            ${choice}
        </button>`;
    });

    html += `</div></div>`;
    gameCanvasContainer.innerHTML = html;
}

window.submitTriviaAnswer = function (chosen, correct, btn) {
    // Disable all buttons
    btn.parentElement.querySelectorAll('button').forEach(b => b.disabled = true);
    const isCorrect = chosen === correct;
    if (isCorrect) {
        window.triviaScorePoints++;
        btn.style.background = '#00b050';
    } else {
        btn.style.background = '#dc3545';
        btn.parentElement.querySelectorAll('button').forEach(b => {
            if (b.innerText.trim() === correct) b.style.background = '#00b050';
        });
    }
    window.triviaQuestionCount++;
    setTimeout(() => initTriviaGame(), 1400);
};

function renderTriviaScoreboard() {
    const score = window.triviaScorePoints;
    const grade = score >= 9 ? '🏆 Perfect!' : score >= 7 ? '🌟 Great job!' : score >= 5 ? '👍 Not bad!' : '😅 Better luck next time!';
    gameCanvasContainer.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:20px;text-align:center;">
        <div style="font-size:48px;">${grade.split(' ')[0]}</div>
        <div style="color:#ffd700;font-size:24px;font-weight:900;">Score: ${score} / 10</div>
        <div style="color:#e2f0d9;font-size:16px;">${grade.split(' ').slice(1).join(' ')}</div>
        <button onclick="window.triviaQuestionCount=0;window.triviaScorePoints=0;initTriviaGame();"
            style="background:#2d6a30;color:white;border:none;border-radius:8px;padding:12px 28px;font-size:15px;font-weight:bold;cursor:pointer;margin-top:8px;">
            Play Again
        </button>
    </div>`;
}

/* ─────────────────────────────────────────────────────────── *
 *  5.  HANGMAN                                                *
 * ─────────────────────────────────────────────────────────── */
const HANGMAN_WORDS = [
    'CHASER','BICYCLE','ADVENTURE','JOURNEY','MOUNTAIN','HIGHWAY','SHORTCUT',
    'THROTTLE','VELOCITY','NAVIGATOR','COMPASS','HORIZON','WAYPOINT','CRUISING',
    'EXPEDITION','DETOUR','TAILWIND','LANDMARK','CARAVAN','TRAILHEAD'
];

function initHangmanGame() {
    const word = HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)];
    window.hangmanState = { word, guessed: new Set(), wrong: 0, maxWrong: 6 };
    renderHangmanGame();
}

function renderHangmanGame() {
    const { word, guessed, wrong, maxWrong } = window.hangmanState;
    const display  = word.split('').map(l => guessed.has(l) ? l : '_').join(' ');
    const isWin    = word.split('').every(l => guessed.has(l));
    const isLose   = wrong >= maxWrong;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    // Simple ASCII scaffold
    const scaffolds = [
        '  +--+\n  |  |\n     |\n     |\n     |\n     |\n====',
        '  +--+\n  |  |\n  O  |\n     |\n     |\n     |\n====',
        '  +--+\n  |  |\n  O  |\n  |  |\n     |\n     |\n====',
        '  +--+\n  |  |\n  O  |\n /|  |\n     |\n     |\n====',
        '  +--+\n  |  |\n  O  |\n /|\\ |\n     |\n     |\n====',
        '  +--+\n  |  |\n  O  |\n /|\\ |\n /   |\n     |\n====',
        '  +--+\n  |  |\n  O  |\n /|\\ |\n / \\ |\n     |\n====',
    ];

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:12px;width:100%;box-sizing:border-box;">
        <pre style="color:#e2f0d9;font-size:13px;line-height:1.3;font-family:monospace;text-align:left;">${scaffolds[wrong]}</pre>
        <div style="color:#ffd700;font-size:22px;font-weight:900;letter-spacing:6px;">${display}</div>`;

    if (isWin) {
        html += `<div style="color:#00b050;font-size:18px;font-weight:bold;">🎉 You got it! The word was ${word}</div>
            <button onclick="initHangmanGame()" style="background:#2d6a30;color:white;border:none;border-radius:8px;padding:10px 24px;font-size:14px;font-weight:bold;cursor:pointer;">Play Again</button>`;
    } else if (isLose) {
        html += `<div style="color:#dc3545;font-size:18px;font-weight:bold;">💀 Game over! The word was <strong style="color:#ffd700;">${word}</strong></div>
            <button onclick="initHangmanGame()" style="background:#2d6a30;color:white;border:none;border-radius:8px;padding:10px 24px;font-size:14px;font-weight:bold;cursor:pointer;">Try Again</button>`;
    } else {
        html += `<div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center;max-width:300px;">`;
        alphabet.forEach(letter => {
            const used = guessed.has(letter);
            const isWrong = used && !word.includes(letter);
            html += `<button onclick="hangmanGuess('${letter}')" ${used ? 'disabled' : ''}
                style="width:32px;height:32px;border-radius:6px;border:none;font-weight:bold;font-size:13px;cursor:${used?'default':'pointer'};
                background:${isWrong?'#dc3545':used?'#2d6a30':'#e2f0d9'};
                color:${used?'white':'#1e4620'};opacity:${used?0.6:1};">
                ${letter}
            </button>`;
        });
        html += `</div><div style="color:#e2f0d9;font-size:12px;">Wrong guesses: ${wrong} / ${maxWrong}</div>`;
    }

    html += `</div>`;
    gameCanvasContainer.innerHTML = html;
}

window.hangmanGuess = function (letter) {
    const state = window.hangmanState;
    if (!state || state.guessed.has(letter)) return;
    state.guessed.add(letter);
    if (!state.word.includes(letter)) state.wrong++;
    renderHangmanGame();
};
