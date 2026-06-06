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
    window.triviaBatch              = null;
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

    // Use a fixed cell size so every row is identical height regardless of content
    const boardPx = Math.min(300, Math.floor((window.innerWidth - 32) * 0.92));
    const cellPx  = Math.floor(boardPx / 8);
    const actualBoardPx = cellPx * 8;

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;padding:8px;box-sizing:border-box;">
        <div style="color:#ffd700;font-weight:bold;font-size:14px;margin-bottom:4px;">
            ${turn === 1 ? '🔴 Red\'s Turn' : '⚫ Black\'s Turn'}
        </div>
        <div style="display:grid;grid-template-columns:repeat(8,${cellPx}px);grid-template-rows:repeat(8,${cellPx}px);width:${actualBoardPx}px;height:${actualBoardPx}px;border:3px solid #ffd700;border-radius:6px;overflow:hidden;">`;

    for (let i = 0; i < 64; i++) {
        const r = Math.floor(i / 8), c = i % 8;
        const isDark   = (r + c) % 2 === 1;
        const piece    = board[i];
        const isTarget = validMoves.includes(i);
        const bgColor  = isDark
            ? (isTarget ? '#b8860b' : '#2d6a30')
            : '#e2f0d9';

        const piecePx = Math.floor(cellPx * 0.76);
        const dotPx   = Math.floor(cellPx * 0.40);

        let pieceHtml = '';
        if (piece === 1) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff6b6b,#c00);border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.5);flex-shrink:0;"></div>`;
        if (piece === 2) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#555,#111);border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.5);flex-shrink:0;"></div>`;
        if (piece === 3) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff6b6b,#c00);border:3px solid #ffd700;box-shadow:0 2px 6px rgba(255,215,0,0.8);display:flex;align-items:center;justify-content:center;font-size:${Math.floor(cellPx*0.3)}px;flex-shrink:0;">👑</div>`;
        if (piece === 4) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#555,#111);border:3px solid #ffd700;box-shadow:0 2px 6px rgba(255,215,0,0.8);display:flex;align-items:center;justify-content:center;font-size:${Math.floor(cellPx*0.3)}px;flex-shrink:0;">👑</div>`;
        if (isTarget && !piece) pieceHtml = `<div style="width:${dotPx}px;height:${dotPx}px;border-radius:50%;background:rgba(255,215,0,0.6);border:2px dashed #ffd700;flex-shrink:0;"></div>`;

        html += `<div onclick="handleCheckerTap(${i})"
            style="width:${cellPx}px;height:${cellPx}px;background:${bgColor};display:flex;align-items:center;justify-content:center;cursor:pointer;box-sizing:border-box;${sel===i?'outline:3px solid #ffd700;outline-offset:-3px;':''}">
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
 *  2.  UNO  (setup screen, draw pile, turn order, reverse/skip)
 * ─────────────────────────────────────────────────────────── */
function initChaserUnoGame() {
    // Show player count setup screen first
    gameCanvasContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:20px;width:100%;box-sizing:border-box;height:100%;">
            <div style="color:#ffd700;font-size:20px;font-weight:900;text-align:center;">How many players?</div>
            <div style="display:flex;gap:14px;">
                ${[2,3,4].map(n => `
                    <button onclick="unoStartWithPlayers(${n})"
                        style="width:64px;height:64px;border-radius:14px;border:3px solid #ffd700;background:#2d6a30;color:#ffd700;font-size:28px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.4);">
                        ${n}
                    </button>`).join('')}
            </div>
            <div style="color:#a3cfbb;font-size:12px;text-align:center;">Each player takes a turn on this device</div>
        </div>`;
}

window.unoStartWithPlayers = function(numPlayers) {
    const colors = ['Red','Yellow','Green','Blue'];
    const values = ['0','1','2','3','4','5','6','7','8','9','Skip','⇋','Wild','Wild'];
    window.unoDeckState = [];
    colors.forEach(c => values.forEach(v => window.unoDeckState.push({ color: c, value: v })));
    // Add Wild Draw Four
    for(let i=0;i<4;i++) window.unoDeckState.push({ color:'Wild', value:'W+4' });
    window.unoDeckState.sort(() => Math.random() - 0.5);

    window.unoNumPlayers       = numPlayers;
    window.unoCurrentPlayer    = 0; // 0-indexed
    window.unoDirection        = 1; // 1=clockwise, -1=counter
    window.unoWildChoosingActive = false;
    window.unoWildPendingIdx   = null;
    window.unoMustDrawPending  = false;

    // Deal 5 cards to each player
    window.unoHands = [];
    for(let p = 0; p < numPlayers; p++) {
        window.unoHands.push([]);
        for(let i = 0; i < 5; i++) window.unoHands[p].push(window.unoDeckState.pop());
    }

    // First discard — must be a number card
    let startCard;
    do { startCard = window.unoDeckState.pop(); } while(startCard.value === 'Wild' || startCard.value === 'W+4');
    window.unoDiscardPile = startCard;

    renderUnoLayout();
};

function unoColorClass(color) {
    return { Red:'uno-card-red', Yellow:'uno-card-yellow', Green:'uno-card-green', Blue:'uno-card-blue', Wild:'uno-card-wild' }[color] || 'uno-card-wild';
}

function unoCardLabel(value) {
    if (value === '⇋')  return '⇋';
    if (value === 'Skip') return '⊘';
    if (value === 'W+4') return '+4';
    return value;
}

function renderUnoLayout() {
    const discard   = window.unoDiscardPile;
    const cp        = window.unoCurrentPlayer;
    const hand      = window.unoHands[cp];
    const numP      = window.unoNumPlayers;
    const playerLabel = numP === 1 ? 'Your Turn' : `Player ${cp + 1}'s Turn`;
    const dirArrow  = window.unoDirection === 1 ? '→' : '←';

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px;width:100%;box-sizing:border-box;">`;

    // Turn banner
    html += `<div style="background:#2d6a30;border-radius:8px;padding:6px 16px;color:#ffd700;font-size:14px;font-weight:900;letter-spacing:0.5px;">
        🎴 ${playerLabel} &nbsp; <span style="font-size:11px;opacity:0.8;">${dirArrow} ${window.unoDirection===1?'Clockwise':'Counter'}</span>
    </div>`;

    // Piles row
    html += `<div style="display:flex;gap:18px;align-items:flex-end;">`;

    // Draw pile (face down) — tap to draw
    html += `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="color:#a3cfbb;font-size:10px;font-weight:bold;">DRAW</div>
        <div onclick="unoDrawCard()" class="uno-card-body" style="background:linear-gradient(135deg,#1e4620,#2d6a30);border:3px solid #ffd700;cursor:pointer;position:relative;box-shadow:3px 3px 0 #0a2010,6px 6px 0 #051508;">
            <div class="uno-oval-center"></div>
            <div class="uno-number-label" style="font-size:22px;color:#ffd700;">🂠</div>
        </div>
    </div>`;

    // Discard pile (face up)
    html += `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="color:#a3cfbb;font-size:10px;font-weight:bold;">DISCARD</div>
        <div class="uno-card-body ${unoColorClass(discard.color)}" style="pointer-events:none;">
            <div class="uno-oval-center"></div>
            <div class="uno-number-label">${unoCardLabel(discard.value)}</div>
        </div>
    </div>`;

    html += `</div>`; // end piles row

    // Wild color chooser
    if (window.unoWildChoosingActive) {
        html += `<div style="color:#ffd700;font-size:13px;font-weight:bold;margin-top:4px;">Choose a color:</div>
        <div style="display:flex;gap:8px;">
            ${['Red','Yellow','Green','Blue'].map(col =>
                `<div onclick="unoPickWildColor('${col}')" class="uno-card-body ${unoColorClass(col)}" style="width:44px;height:64px;cursor:pointer;"></div>`
            ).join('')}
        </div>`;
    }

    // Hand label
    html += `<div style="color:#e2f0d9;font-size:12px;font-weight:bold;margin-top:2px;">
        ${numP > 1 ? `Player ${cp+1}'s Hand (${hand.length} cards)` : `Your Hand (${hand.length} cards)`}
    </div>`;

    // Cards in hand
    html += `<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:320px;">`;
    hand.forEach((card, i) => {
        const playable = card.color === discard.color || card.value === discard.value ||
                         card.color === 'Wild' || card.value === 'Wild' || card.value === 'W+4';
        html += `<div onclick="unoPlayCard(${i})" class="uno-card-body ${unoColorClass(card.color)}"
            style="width:54px;height:80px;font-size:26px;opacity:${playable?1:0.4};cursor:${playable?'pointer':'default'};transform:${playable?'translateY(-5px)':'none'};transition:transform 0.15s;">
            <div class="uno-oval-center"></div>
            <div class="uno-number-label">${unoCardLabel(card.value)}</div>
        </div>`;
    });
    html += `</div>`;

    // Other players' card counts
    if(numP > 1) {
        html += `<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:4px;">`;
        for(let p = 0; p < numP; p++) {
            if(p === cp) continue;
            html += `<div style="background:rgba(255,255,255,0.1);border-radius:6px;padding:4px 10px;color:#e2f0d9;font-size:11px;font-weight:bold;">
                P${p+1}: ${window.unoHands[p].length} cards
            </div>`;
        }
        html += `</div>`;
    }

    html += `</div>`;
    gameCanvasContainer.innerHTML = html;
}

window.unoPlayCard = function(idx) {
    const cp      = window.unoCurrentPlayer;
    const card    = window.unoHands[cp][idx];
    const discard = window.unoDiscardPile;
    const playable = card.color === discard.color || card.value === discard.value ||
                     card.color === 'Wild' || card.value === 'Wild' || card.value === 'W+4';
    if (!playable || window.unoWildChoosingActive) return;

    if (card.color === 'Wild' || card.value === 'Wild' || card.value === 'W+4') {
        window.unoWildPendingIdx     = idx;
        window.unoWildChoosingActive = true;
        renderUnoLayout();
        return;
    }

    // Play the card
    window.unoHands[cp].splice(idx, 1);
    window.unoDiscardPile = card;

    if (typeof channel !== 'undefined') {
        channel.send({ type:'broadcast', event:'uno-sync-discard', payload:{ currentDiscard: card } });
    }

    // Check win
    if (!window.unoHands[cp].length) {
        gameCanvasContainer.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;height:100%;padding:20px;text-align:center;">
            <div style="font-size:52px;">🎉</div>
            <div style="color:#ffd700;font-size:26px;font-weight:900;">Player ${cp+1} wins!</div>
            <button onclick="initChaserUnoGame()" style="background:#2d6a30;color:white;border:none;border-radius:8px;padding:12px 28px;font-size:15px;font-weight:bold;cursor:pointer;">Play Again</button>
        </div>`;
        return;
    }

    // Handle special cards
    const numP = window.unoNumPlayers;
    let skip = false;
    if (card.value === '⇋') {
        window.unoDirection *= -1;
        if (numP === 2) skip = true; // reverse acts as skip in 2-player
    }
    if (card.value === 'Skip') skip = true;

    unoAdvanceTurn(skip);
};

window.unoPickWildColor = function(color) {
    const cp  = window.unoCurrentPlayer;
    const idx = window.unoWildPendingIdx;
    const isDrawFour = window.unoHands[cp][idx].value === 'W+4';
    const card = { color, value: window.unoHands[cp][idx].value };
    window.unoHands[cp].splice(idx, 1);
    window.unoDiscardPile        = card;
    window.unoWildChoosingActive = false;
    window.unoWildPendingIdx     = null;

    if (typeof channel !== 'undefined') {
        channel.send({ type:'broadcast', event:'uno-sync-discard', payload:{ currentDiscard: card } });
    }

    if (isDrawFour) {
        // Next player draws 4 and is skipped
        const numP = window.unoNumPlayers;
        const nextP = ((cp + window.unoDirection) + numP) % numP;
        for(let i=0;i<4;i++) {
            if(!window.unoDeckState.length) unoReshuffleDeck();
            window.unoHands[nextP].push(window.unoDeckState.pop());
        }
        unoAdvanceTurn(true);
    } else {
        unoAdvanceTurn(false);
    }
};

function unoAdvanceTurn(skipNext) {
    const numP = window.unoNumPlayers;
    let next = ((window.unoCurrentPlayer + window.unoDirection) + numP) % numP;
    if (skipNext) next = ((next + window.unoDirection) + numP) % numP;
    window.unoCurrentPlayer = next;

    if(numP > 1) {
        // Show "pass device" screen
        gameCanvasContainer.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;height:100%;padding:20px;text-align:center;">
            <div style="font-size:40px;">📱</div>
            <div style="color:#ffd700;font-size:18px;font-weight:900;">Pass to Player ${next+1}</div>
            <button onclick="renderUnoLayout()" style="background:#2d6a30;color:white;border:none;border-radius:8px;padding:14px 32px;font-size:16px;font-weight:bold;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
                I'm Player ${next+1} — Show My Hand
            </button>
        </div>`;
    } else {
        renderUnoLayout();
    }
}

window.unoDrawCard = function() {
    const cp = window.unoCurrentPlayer;
    if (!window.unoDeckState.length) unoReshuffleDeck();
    window.unoHands[cp].push(window.unoDeckState.pop());
    // After drawing, turn passes
    unoAdvanceTurn(false);
};

function unoReshuffleDeck() {
    const top = window.unoDiscardPile;
    window.unoDeckState = [top]; // keep top card
    window.unoDeckState.sort(() => Math.random() - 0.5);
}

/* ─────────────────────────────────────────────────────────── *
 *  3.  SEQUENCE  (10×10 board, 7-card hand, sequence detection)*
 * ─────────────────────────────────────────────────────────── */

// Real Sequence board layout — each non-corner card appears twice
// Corners are FREE spaces (value 'FREE')
const SEQ_BOARD_LAYOUT = [
    'FREE','2♠','3♠','4♠','5♠','6♠','7♠','8♠','9♠','FREE',
    '6♣',  'A♦','K♦','Q♦','J♦','10♦','9♦','8♦','7♦','10♠',
    '5♣',  'Q♥','A♠','2♥','3♥','4♥','5♥','6♥','6♦','J♠',
    '4♣',  'J♥','K♠','A♥','2♣','3♣','4♣','7♥','5♦','Q♠',
    '3♣',  '10♥','Q♠','K♥','K♣','Q♣','5♣','8♥','4♦','K♠',
    '2♣',  '9♥','J♠','A♠','A♣','J♣','6♣','9♥','3♦','A♠',
    'A♥',  '8♥','10♠','K♠','Q♠','J♠','10♠','10♥','2♦','2♠',
    'K♥',  '7♥','9♠','8♠','7♠','6♠','5♠','4♠','A♦','3♠',
    'Q♥',  '6♥','5♥','4♥','3♥','2♥','A♥','K♥','Q♥','4♠',
    'FREE','J♥','10♥','9♥','8♥','7♥','6♥','5♥','4♥','FREE'
];

// Which cards are red-suited
const SEQ_RED_SUITS = new Set();
['♥','♦'].forEach(suit => {
    ['2','3','4','5','6','7','8','9','10','J','Q','K','A'].forEach(v => SEQ_RED_SUITS.add(v+suit));
});

// Full deck for dealing (each card appears twice on board, so deck has pairs)
function buildSeqDeck() {
    const suits = ['♠','♣','♥','♦'];
    const vals  = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const deck  = [];
    suits.forEach(s => vals.forEach(v => { deck.push(v+s); deck.push(v+s); }));
    return deck.sort(() => Math.random() - 0.5);
}

function initSequenceGame() {
    window.seqBoard      = Array(100).fill(0); // 0=empty,1=blue,2=red; FREE corners = 3
    // Mark corners as free
    [0,9,90,99].forEach(i => window.seqBoard[i] = 3);
    window.seqTurn       = 0; // 0=blue,1=red
    window.seqDeck       = buildSeqDeck();
    window.seqHands      = [ [], [] ];
    window.seqSequences  = [0, 0]; // completed sequences per team
    window.seqSelectedCard = null;

    for(let p=0;p<2;p++) for(let i=0;i<7;i++) window.seqHands[p].push(window.seqDeck.pop());

    renderSequenceBoard();
}

function checkSeqSequences(board) {
    // Returns [blueCount, redCount] of completed sequences
    const lines = [];
    // Rows
    for(let r=0;r<10;r++) { const row=[]; for(let c=0;c<10;c++) row.push(r*10+c); lines.push(row); }
    // Cols
    for(let c=0;c<10;c++) { const col=[]; for(let r=0;r<10;r++) col.push(r*10+c); lines.push(col); }
    // Diagonals
    for(let s=0;s<10;s++) { const d1=[],d2=[]; for(let i=0;i<10-s;i++) { d1.push((i+s)*10+i); d2.push(i*10+(i+s)); } lines.push(d1); lines.push(d2); }
    for(let s=1;s<10;s++) { const d1=[],d2=[]; for(let i=0;i<10-s;i++) { d1.push(i*10+(i+s)); d2.push((i+s)*10+i); } lines.push(d1); lines.push(d2); }

    let blue=0, red=0;
    lines.forEach(line => {
        for(let start=0;start<=line.length-5;start++) {
            const slice = line.slice(start, start+5);
            const vals  = slice.map(i => board[i]);
            // FREE corners (3) count as either color
            if(vals.every(v => v===1||v===3)) blue++;
            if(vals.every(v => v===2||v===3)) red++;
        }
    });
    return [Math.floor(blue/1), Math.floor(red/1)]; // rough count
}

function renderSequenceBoard() {
    const board = window.seqBoard;
    const turn  = window.seqTurn;
    const hand  = window.seqHands[turn];
    const sel   = window.seqSelectedCard;
    const teamColor = turn === 0 ? '#1a6fd4' : '#dc3545';
    const teamName  = turn === 0 ? '🔵 Blue' : '🔴 Red';

    // Calculate cell size to fit in container without scrolling
    // Container is roughly min(window.innerWidth, 340) wide with padding
    const containerW = Math.min(window.innerWidth - 20, 340);
    const cellPx = Math.floor((containerW - 16) / 10); // 16px for padding
    const boardPx = cellPx * 10;

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px;width:100%;box-sizing:border-box;">`;

    // Turn + sequence count header
    html += `<div style="display:flex;gap:12px;align-items:center;">
        <div style="background:${teamColor};color:white;border-radius:6px;padding:4px 12px;font-size:13px;font-weight:900;">${teamName}'s Turn</div>
        <div style="color:#e2f0d9;font-size:11px;">🔵 ${window.seqSequences[0]} seq &nbsp; 🔴 ${window.seqSequences[1]} seq</div>
    </div>`;

    // Board
    html += `<div style="display:grid;grid-template-columns:repeat(10,${cellPx}px);grid-template-rows:repeat(10,${cellPx}px);width:${boardPx}px;height:${boardPx}px;border:2px solid #ffd700;border-radius:4px;overflow:hidden;flex-shrink:0;">`;

    for(let i=0;i<100;i++) {
        const label   = SEQ_BOARD_LAYOUT[i];
        const isFree  = label === 'FREE';
        const chip    = board[i];
        const isRed   = SEQ_RED_SUITS.has(label);
        const fontSize = cellPx <= 28 ? 7 : 8;

        let bg = '#e2f0d9';
        let chipHtml = '';
        if(isFree) { bg = '#1e4620'; chipHtml = `<div style="font-size:${fontSize+1}px;color:#ffd700;font-weight:bold;">★</div>`; }
        else if(chip === 1) { bg = '#1a6fd4'; chipHtml = `<div style="width:${Math.floor(cellPx*0.7)}px;height:${Math.floor(cellPx*0.7)}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#6ab0ff,#1a6fd4);border:1px solid #fff;flex-shrink:0;"></div>`; }
        else if(chip === 2) { bg = '#dc3545'; chipHtml = `<div style="width:${Math.floor(cellPx*0.7)}px;height:${Math.floor(cellPx*0.7)}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff6b6b,#c00);border:1px solid #fff;flex-shrink:0;"></div>`; }
        else if(chip === 3) { bg = '#2d6a30'; chipHtml = `<div style="font-size:${fontSize+1}px;color:#ffd700;">★</div>`; }
        else {
            // Show card label — number on top, suit below
            const numPart  = label.replace(/[♠♣♥♦]/g,'');
            const suitPart = label.replace(/[^♠♣♥♦]/g,'');
            const cardColor = isRed ? '#c00' : '#111';
            chipHtml = `<div style="display:flex;flex-direction:column;align-items:center;line-height:1;gap:0;">
                <span style="font-size:${fontSize+1}px;font-weight:900;color:${cardColor};">${numPart}</span>
                <span style="font-size:${fontSize+2}px;color:${cardColor};">${suitPart}</span>
            </div>`;
        }

        // Highlight if selected card matches this space
        let highlight = '';
        if(sel !== null && !chip && !isFree) {
            if(hand[sel] === label) highlight = 'outline:2px solid #ffd700;outline-offset:-2px;';
        }

        html += `<div onclick="handleSeqBoardTap(${i})"
            style="width:${cellPx}px;height:${cellPx}px;background:${bg};display:flex;align-items:center;justify-content:center;cursor:pointer;box-sizing:border-box;${highlight}">
            ${chipHtml}
        </div>`;
    }
    html += `</div>`; // end board grid

    // Chip pile indicators
    html += `<div style="display:flex;gap:16px;align-items:center;">
        <div style="display:flex;align-items:center;gap:4px;">
            ${Array(3).fill(0).map((_,i) =>
                `<div style="width:${14+i*2}px;height:${14+i*2}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#6ab0ff,#1a6fd4);border:1px solid #fff;margin-left:${i?-8:0}px;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`
            ).join('')}
            <span style="color:#e2f0d9;font-size:11px;margin-left:4px;">Blue</span>
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
            ${Array(3).fill(0).map((_,i) =>
                `<div style="width:${14+i*2}px;height:${14+i*2}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff6b6b,#c00);border:1px solid #fff;margin-left:${i?-8:0}px;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`
            ).join('')}
            <span style="color:#e2f0d9;font-size:11px;margin-left:4px;">Red</span>
        </div>
    </div>`;

    // Hand
    html += `<div style="color:#e2f0d9;font-size:11px;font-weight:bold;">${teamName}'s Hand — tap card, then tap board</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:center;max-width:${boardPx}px;">`;

    hand.forEach((card, i) => {
        const isRed = SEQ_RED_SUITS.has(card);
        const numPart  = card.replace(/[♠♣♥♦]/g,'');
        const suitPart = card.replace(/[^♠♣♥♦]/g,'');
        html += `<div onclick="selectSeqCard(${i})"
            style="background:white;border:${sel===i?'3px solid #ffd700':'2px solid #555'};border-radius:6px;padding:4px 7px;cursor:pointer;
            box-shadow:${sel===i?'0 0 10px rgba(255,215,0,0.8)':'0 2px 4px rgba(0,0,0,0.25)'};
            display:flex;flex-direction:column;align-items:center;line-height:1.1;min-width:26px;">
            <span style="font-size:13px;font-weight:900;color:${isRed?'#c00':'#111'};">${numPart}</span>
            <span style="font-size:15px;color:${isRed?'#c00':'#111'};">${suitPart}</span>
        </div>`;
    });

    html += `</div></div>`;
    gameCanvasContainer.innerHTML = html;
}

window.selectSeqCard = function(i) {
    window.seqSelectedCard = window.seqSelectedCard === i ? null : i;
    renderSequenceBoard();
};

window.handleSeqBoardTap = function(i) {
    const sel   = window.seqSelectedCard;
    if(sel === null) return;
    const board = window.seqBoard;
    const turn  = window.seqTurn;
    const hand  = window.seqHands[turn];
    const label = SEQ_BOARD_LAYOUT[i];

    if(label === 'FREE' || board[i]) return;
    if(hand[sel] !== label) return; // card must match space

    // Place chip
    board[i] = turn === 0 ? 1 : 2;

    // Remove played card and draw replacement
    hand.splice(sel, 1);
    if(window.seqDeck.length) hand.push(window.seqDeck.pop());
    window.seqSelectedCard = null;

    // Check for sequences
    const [b, r] = checkSeqSequences(board);
    window.seqSequences = [b, r];
    const winsNeeded = 2;
    if(b >= winsNeeded || r >= winsNeeded) {
        const winner = b >= winsNeeded ? '🔵 Blue' : '🔴 Red';
        gameCanvasContainer.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;height:100%;padding:20px;text-align:center;">
            <div style="font-size:52px;">🏆</div>
            <div style="color:#ffd700;font-size:24px;font-weight:900;">${winner} wins!</div>
            <div style="color:#e2f0d9;font-size:14px;">${b >= winsNeeded ? b : r} sequences completed</div>
            <button onclick="initSequenceGame()" style="background:#2d6a30;color:white;border:none;border-radius:8px;padding:12px 28px;font-size:15px;font-weight:bold;cursor:pointer;">Play Again</button>
        </div>`;
        return;
    }

    // Advance turn
    window.seqTurn = turn === 0 ? 1 : 0;
    renderSequenceBoard();
};

/* ─────────────────────────────────────────────────────────── *
 *  4.  TRIVIA  (Open Trivia DB with retry logic)              *
 * ─────────────────────────────────────────────────────────── */
function initTriviaGame() {
    window.triviaQuestionCount = window.triviaQuestionCount || 0;
    window.triviaScorePoints   = window.triviaScorePoints   || 0;
    if (window.triviaQuestionCount >= 10) { renderTriviaScoreboard(); return; }

    gameCanvasContainer.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#e2f0d9;font-size:16px;">Loading question…</div>`;

    // Use a session token to avoid repeats; fetch a batch of 10 at once to avoid rate limits
    if (!window.triviaBatch || window.triviaBatch.length === 0) {
        fetch(`https://opentdb.com/api.php?amount=10&type=multiple`)
            .then(r => {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(data => {
                if (!data.results || !data.results.length) throw new Error('No results');
                const decode = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
                window.triviaBatch = data.results.map(item => ({
                    q       : decode(item.question),
                    c       : decode(item.correct_answer),
                    choices : [...item.incorrect_answers.map(decode), decode(item.correct_answer)].sort(() => Math.random() - 0.5)
                }));
                window.sharedRoomTriviaQuestion = window.triviaBatch.shift();
                if (typeof channel !== 'undefined') {
                    channel.send({ type:'broadcast', event:'sync-room-trivia', payload:{ triviaData: window.sharedRoomTriviaQuestion, count: window.triviaQuestionCount } });
                }
                renderSharedTriviaUI();
            })
            .catch(() => {
                gameCanvasContainer.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;height:100%;padding:20px;text-align:center;">
                    <div style="font-size:36px;">📡</div>
                    <div style="color:#dc3545;font-size:15px;font-weight:bold;">Couldn't reach the trivia server.</div>
                    <div style="color:#a3cfbb;font-size:12px;">Check your connection and try again.</div>
                    <button onclick="window.triviaBatch=null;initTriviaGame();" style="background:#2d6a30;color:white;border:none;border-radius:8px;padding:10px 24px;font-size:14px;font-weight:bold;cursor:pointer;">Retry</button>
                </div>`;
            });
    } else {
        // Use cached batch
        window.sharedRoomTriviaQuestion = window.triviaBatch.shift();
        renderSharedTriviaUI();
    }
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
 *  5.  HANGMAN  (SVG scaffold, big dashes, death animation)   *
 * ─────────────────────────────────────────────────────────── */
const HANGMAN_WORDS = [
    'CHASER','BICYCLE','ADVENTURE','JOURNEY','MOUNTAIN','HIGHWAY','SHORTCUT',
    'THROTTLE','VELOCITY','NAVIGATOR','COMPASS','HORIZON','WAYPOINT','CRUISING',
    'EXPEDITION','DETOUR','TAILWIND','LANDMARK','CARAVAN','TRAILHEAD'
];

function initHangmanGame() {
    const word = HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)];
    window.hangmanState = { word, guessed: new Set(), wrong: 0, maxWrong: 6, dying: false };
    renderHangmanGame();
}

function buildHangmanSVG(wrong, dying) {
    // Gallows is always drawn in full; body parts appear as wrong increases
    const shake = dying ? 'style="animation:hangShake 0.5s ease-in-out 3"' : '';
    const bodyColor = dying ? '#dc3545' : '#e2f0d9';

    const parts = {
        head  : wrong >= 1,
        body  : wrong >= 2,
        leftA : wrong >= 3,
        rightA: wrong >= 4,
        leftL : wrong >= 5,
        rightL: wrong >= 6,
    };

    return `<svg viewBox="0 0 120 160" width="120" height="160" xmlns="http://www.w3.org/2000/svg">
        <style>@keyframes hangShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}</style>
        <!-- Gallows structure -->
        <line x1="10" y1="155" x2="110" y2="155" stroke="#a3cfbb" stroke-width="4" stroke-linecap="round"/>
        <line x1="30"  y1="155" x2="30"  y2="10"  stroke="#a3cfbb" stroke-width="4" stroke-linecap="round"/>
        <line x1="30"  y1="10"  x2="75"  y2="10"  stroke="#a3cfbb" stroke-width="4" stroke-linecap="round"/>
        <line x1="75"  y1="10"  x2="75"  y2="28"  stroke="#a3cfbb" stroke-width="3" stroke-linecap="round"/>
        <!-- Body parts -->
        <g ${shake} transform-origin="75 36">
            ${parts.head   ? `<circle cx="75" cy="36" r="12" stroke="${bodyColor}" stroke-width="3" fill="none"/>` : ''}
            ${parts.head && dying ? `<text x="70" y="41" font-size="11" fill="${bodyColor}">✕✕</text>` : parts.head ? `<circle cx="71" cy="33" r="2" fill="${bodyColor}"/><circle cx="79" cy="33" r="2" fill="${bodyColor}"/><path d="M71 40 Q75 43 79 40" stroke="${bodyColor}" stroke-width="1.5" fill="none"/>` : ''}
            ${parts.body   ? `<line x1="75" y1="48" x2="75" y2="95" stroke="${bodyColor}" stroke-width="3" stroke-linecap="round"/>` : ''}
            ${parts.leftA  ? `<line x1="75" y1="58" x2="55" y2="78" stroke="${bodyColor}" stroke-width="3" stroke-linecap="round"/>` : ''}
            ${parts.rightA ? `<line x1="75" y1="58" x2="95" y2="78" stroke="${bodyColor}" stroke-width="3" stroke-linecap="round"/>` : ''}
            ${parts.leftL  ? `<line x1="75" y1="95" x2="55" y2="120" stroke="${bodyColor}" stroke-width="3" stroke-linecap="round"/>` : ''}
            ${parts.rightL ? `<line x1="75" y1="95" x2="95" y2="120" stroke="${bodyColor}" stroke-width="3" stroke-linecap="round"/>` : ''}
        </g>
    </svg>`;
}

function renderHangmanGame() {
    const { word, guessed, wrong, maxWrong, dying } = window.hangmanState;
    const isWin    = word.split('').every(l => guessed.has(l));
    const isLose   = wrong >= maxWrong;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:12px;width:100%;box-sizing:border-box;">`;

    // SVG scaffold
    html += `<div>${buildHangmanSVG(wrong, dying || isLose)}</div>`;

    // Letter dashes — big and clear
    html += `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:4px 0;">`;
    word.split('').forEach(letter => {
        const revealed = guessed.has(letter);
        html += `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
            <div style="font-size:24px;font-weight:900;color:${revealed?'#ffd700':'transparent'};min-width:22px;text-align:center;letter-spacing:0;">${letter}</div>
            <div style="width:22px;height:3px;background:${revealed?'#ffd700':'#e2f0d9'};border-radius:2px;"></div>
        </div>`;
    });
    html += `</div>`;

    if (isWin) {
        html += `<div style="color:#00b050;font-size:17px;font-weight:bold;text-align:center;">🎉 You got it!</div>
            <button onclick="initHangmanGame()" style="background:#2d6a30;color:white;border:none;border-radius:8px;padding:10px 24px;font-size:14px;font-weight:bold;cursor:pointer;">Play Again</button>`;
    } else if (isLose) {
        html += `<div style="color:#dc3545;font-size:16px;font-weight:bold;text-align:center;">💀 The word was: <span style="color:#ffd700;">${word}</span></div>
            <button onclick="initHangmanGame()" style="background:#2d6a30;color:white;border:none;border-radius:8px;padding:10px 24px;font-size:14px;font-weight:bold;cursor:pointer;">Try Again</button>`;
    } else {
        // Alphabet keyboard
        html += `<div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center;max-width:300px;">`;
        alphabet.forEach(letter => {
            const used     = guessed.has(letter);
            const isWrong  = used && !word.includes(letter);
            const isRight  = used && word.includes(letter);
            html += `<button onclick="hangmanGuess('${letter}')" ${used ? 'disabled' : ''}
                style="width:30px;height:30px;border-radius:6px;border:none;font-weight:bold;font-size:13px;
                cursor:${used?'default':'pointer'};
                background:${isWrong?'#dc3545':isRight?'#2d6a30':'#e2f0d9'};
                color:${used?'white':'#1e4620'};
                opacity:${used?0.65:1};">
                ${letter}
            </button>`;
        });
        html += `</div>`;
        html += `<div style="color:#a3cfbb;font-size:11px;">${wrong} / ${maxWrong} wrong</div>`;
    }

    html += `</div>`;
    gameCanvasContainer.innerHTML = html;
}

window.hangmanGuess = function(letter) {
    const state = window.hangmanState;
    if (!state || state.guessed.has(letter)) return;
    state.guessed.add(letter);
    if (!state.word.includes(letter)) {
        state.wrong++;
        if (state.wrong >= state.maxWrong) {
            // Trigger death animation briefly before final render
            state.dying = true;
            renderHangmanGame();
            setTimeout(() => { state.dying = false; renderHangmanGame(); }, 1600);
            return;
        }
    }
    renderHangmanGame();
};
