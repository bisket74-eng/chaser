/* ============================================================
   CHASER ARCADE ENGINE  –  games.js (PART 1)
   ============================================================ */

/* ── Multiplayer sync handlers ───────────────────────────── */
window.handleIncomingCheckersSync = (p) => {
    window.syncCheckersBoard = p.boardState;
    window.checkersTurn      = p.activeTurn;
    window.consecutiveJumpsActive = p.consecutiveActive || false;
    if (activeGameStage.classList.contains('open') && activeGameLabelTitle.innerText.includes('Checkers')) renderCheckersGrid();
};

window.handleIncomingUnoSync = (p) => {
    window.unoDiscardPile   = p.currentDiscard;
    window.unoCurrentPlayer = p.turn;
    window.unoHands         = p.hands;
    window.unoDeckState     = p.deck;
    window.unoDirection     = p.direction;
    if (activeGameStage.classList.contains('open') && activeGameLabelTitle.innerText.includes('Uno')) renderUnoLayout();
};

window.handleIncomingTriviaSync = (p) => {
    window.sharedRoomTriviaQuestion = p.triviaData;
    window.triviaQuestionCount      = p.count;
    if (activeGameStage.classList.contains('open') && activeGameLabelTitle.innerText.includes('Trivia')) renderSharedTriviaUI();
};

window.handleIncomingSequenceSync = (p) => {
    window.seqBoard         = p.boardState;
    window.seqTurn          = p.turnState;
    window.seqSequences     = p.sequenceScores;
    if (activeGameStage.classList.contains('open') && activeGameLabelTitle.innerText.includes('Sequence')) renderSequenceBoard();
};

/* ── Game launcher / teardown ────────────────────────────── */
window.launchGameEngine = function (gameName, gameIcon) {
    gameHubOverlay.classList.remove('open');
    
    // FIX: Properly shut down the old game before opening a new one
    window.shutdownActiveGame(true); 
    
    activeGameLabelTitle.innerText = gameIcon + '  ' + gameName;
    activeGameStage.classList.add('open');

    const map = {
        'Crew Trivia' : initTriviaGame,
        'Battle Uno'  : initChaserUnoGame,
        'Checkers'    : initCheckersGame,
        'Sequence'    : initSequenceGame,
        'Solitaire'   : initSolitaireGame,
        'Hangman'     : initHangmanGame,
    };
    if (map[gameName]) map[gameName]();
};

window.shutdownActiveGame = function (isSwitching = false) {
    if (!isSwitching) activeGameStage.classList.remove('open');
    gameCanvasContainer.innerHTML = '';
    window.syncCheckersBoard        = null;
    window.unoDiscardPile           = undefined;
    window.sharedRoomTriviaQuestion = undefined;
    window.triviaQuestionCount      = 0;
    window.triviaScorePoints        = 0;
    window.triviaBatch              = null;
    window.hangmanState             = null;
    window.seqBoard                 = null;
};

/* ═══════════════════════════════════════════════════════════
   1.  CHECKERS
   ═══════════════════════════════════════════════════════════ */
function initCheckersGame() {
    window.syncCheckersBoard = Array(64).fill(0).map((_, i) => {
        const r = Math.floor(i / 8), c = i % 8;
        if ((r + c) % 2 === 1) {
            if (r < 3) return 1; 
            if (r > 4) return 2; 
        }
        return 0;
    });
    window.checkersTurn           = 1;
    window.selectedCheckerIdx     = null;
    window.consecutiveJumpsActive = false;
    renderCheckersGrid();
}

function renderCheckersGrid() {
    const board = window.syncCheckersBoard;
    const sel   = window.selectedCheckerIdx;
    const turn  = window.checkersTurn;

    const boardPx    = Math.min(330, Math.floor((window.innerWidth - 32) * 0.95));
    const cellPx     = Math.floor(boardPx / 8);
    const piecePx    = Math.floor(cellPx * 0.80);

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;padding:4px;box-sizing:border-box;">
        <div style="color:#ffd700;font-weight:bold;font-size:16px;margin-bottom:2px;font-family:Impact,sans-serif;">
            ${turn === 1 ? '🔴 RED TEAM TURN' : '⚫ BLACK TEAM TURN'} ${window.consecutiveJumpsActive ? ' - DOUBLE JUMP BONUS!' : ''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(8,${cellPx}px);grid-template-rows:repeat(8,${cellPx}px);border:4px solid #ffd700;border-radius:8px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.5);">`;

    for (let i = 0; i < 64; i++) {
        const r       = Math.floor(i / 8), c = i % 8;
        const isDark  = (r + c) % 2 === 1;
        const piece   = board[i];
        const bgColor = isDark ? '#2d6a30' : '#e2f0d9';

        let pieceHtml = '';
        if (piece === 1) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff6b6b,#c00);border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>`;
        if (piece === 2) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#555,#111);border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>`;
        if (piece === 3) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff6b6b,#c00);border:3px solid #ffd700;display:flex;align-items:center;justify-content:center;font-size:${Math.floor(cellPx*0.4)}px;color:white;">👑</div>`;
        if (piece === 4) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#555,#111);border:3px solid #ffd700;display:flex;align-items:center;justify-content:center;font-size:${Math.floor(cellPx*0.4)}px;color:white;">👑</div>`;

        html += `<div onclick="handleCheckerTap(${i})" style="width:${cellPx}px;height:${cellPx}px;background:${bgColor};display:flex;align-items:center;justify-content:center;cursor:pointer;box-sizing:border-box;${sel===i?'outline:4px solid #ffd700;outline-offset:-4px;':''}">
            ${pieceHtml}
        </div>`;
    }
    html += `</div></div>`;
    gameCanvasContainer.innerHTML = html;
}

function getCheckerMoves(idx, board, turn, jumpOnly) {
    const piece = board[idx];
    if (!piece) return [];
    const isRed  = piece === 1 || piece === 3;
    const isKing = piece === 3 || piece === 4;
    const enemy  = isRed ? [2, 4] : [1, 3];
    const r = Math.floor(idx / 8), c = idx % 8;
    const dirs = [];
    if (!isRed || isKing) dirs.push([-1, -1], [-1, 1]);
    if (isRed  || isKing) dirs.push([1, -1],  [1, 1]);
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
        if (owned.includes(piece)) {
            if (window.consecutiveJumpsActive && idx !== window.lastJumpDestinationIdx) return;
            window.selectedCheckerIdx = idx; renderCheckersGrid();
        }
        return;
    }
    const from  = window.selectedCheckerIdx;
    const moves = getCheckerMoves(from, board, turn, window.consecutiveJumpsActive);
    if (!moves.includes(idx)) {
        if (owned.includes(piece) && !window.consecutiveJumpsActive) { window.selectedCheckerIdx = idx; renderCheckersGrid(); } 
        else if (!window.consecutiveJumpsActive) { window.selectedCheckerIdx = null; renderCheckersGrid(); }
        return;
    }
    const isJump = Math.abs(idx - from) > 10;
    board[idx]   = board[from];
    board[from]  = 0;
    if (isJump) board[Math.floor((from + idx) / 2)] = 0;
    const destRow = Math.floor(idx / 8);
    if (board[idx] === 1 && destRow === 7) board[idx] = 3;
    if (board[idx] === 2 && destRow === 0) board[idx] = 4;
    
    let hasMoreJumps = false;
    if (isJump) {
        const extraJumps = getCheckerMoves(idx, board, turn, true);
        if (extraJumps.length > 0) {
            hasMoreJumps = true; window.consecutiveJumpsActive = true;
            window.lastJumpDestinationIdx = idx; window.selectedCheckerIdx = idx;
        }
    }
    if (!hasMoreJumps) {
        window.selectedCheckerIdx = null; window.consecutiveJumpsActive = false;
        window.checkersTurn = turn === 1 ? 2 : 1;
    }
    if (typeof channel !== 'undefined') channel.send({ type:'broadcast', event:'checkers-sync-move', payload:{ boardState:board, activeTurn:window.checkersTurn, consecutiveActive:window.consecutiveJumpsActive } });
    renderCheckersGrid();
};

/* ═══════════════════════════════════════════════════════════
   2.  UNO
   ═══════════════════════════════════════════════════════════ */
function initChaserUnoGame() {
    gameCanvasContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;width:100%;box-sizing:border-box;">
            <div style="color:#ffd700;font-size:22px;font-weight:900;font-family:Impact,sans-serif;">SELECT ROOM PLAYERS</div>
            <div style="display:flex;gap:14px;">
                ${[1,2,3,4].map(n => `<button onclick="unoStartWithRoomCount(${n})" style="width:58px;height:58px;border-radius:12px;border:3px solid #ffd700;background:#2d6a30;color:#ffd700;font-size:26px;font-weight:900;cursor:pointer;">${n}</button>`).join('')}
            </div>
            <div style="color:#a3cfbb;font-size:13px;text-align:center;font-weight:bold;">Assigning synced shared tables across matching devices</div>
        </div>`;
}

window.unoStartWithRoomCount = function(numPlayers) {
    const colors = ['Red','Yellow','Green','Blue'];
    window.unoDeckState = [];
    colors.forEach(c => {
        window.unoDeckState.push({color:c,value:'0'});
        ['1','2','3','4','5','6','7','8','9','Skip','⇋','+2'].forEach(v => { window.unoDeckState.push({color:c,value:v}); window.unoDeckState.push({color:c,value:v}); });
    });
    for(let i=0;i<4;i++) window.unoDeckState.push({color:'Wild',value:'Wild'}, {color:'Wild',value:'+4'});
    window.unoDeckState.sort(() => Math.random() - 0.5);

    window.unoNumPlayers         = numPlayers;
    window.unoCurrentPlayer      = 0;
    window.unoDirection          = 1;
    window.unoWildChoosingActive = false;
    window.unoWildPendingIdx     = null;
    window.unoHands = [];
    for(let p=0;p<numPlayers;p++) { window.unoHands.push([]); for(let i=0;i<7;i++) window.unoHands[p].push(window.unoDeckState.pop()); }
    
    let startCard;
    do { startCard = window.unoDeckState.pop(); } while(startCard.value==='Wild'||startCard.value==='+4');
    window.unoDiscardPile = startCard;
    
    triggerUnoNetworkSync();
    renderUnoLayout();
};

function triggerUnoNetworkSync() {
    if (typeof channel !== 'undefined') channel.send({ type: 'broadcast', event: 'uno-sync-discard', payload: { currentDiscard: window.unoDiscardPile, turn: window.unoCurrentPlayer, hands: window.unoHands, deck: window.unoDeckState, direction: window.unoDirection } });
}

function unoColorClass(color) { return {Red:'uno-card-red',Yellow:'uno-card-yellow',Green:'uno-card-green',Blue:'uno-card-blue',Wild:'uno-card-wild'}[color]||'uno-card-wild'; }

function renderUnoLayout() {
    const discard = window.unoDiscardPile;
    const cp      = window.unoCurrentPlayer;
    const hand    = window.unoHands[cp] || [];
    
    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:4px;width:100%;box-sizing:border-box;">`;
    html += `<div style="background:#2d6a30;border-radius:6px;padding:4px 16px;color:#ffd700;font-size:16px;font-weight:900;font-family:Impact,sans-serif;">🎴 PLAYER ${cp+1} TURN</div>`;
    html += `<div style="display:flex;gap:24px;align-items:flex-end;margin-top:2px;">`;
    
    // FIX: Draw pile says "UNO"
    html += `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
        <div style="color:#a3cfbb;font-size:11px;font-weight:bold;">DRAW</div>
        <div onclick="unoDrawCard()" class="uno-card-body" style="background:linear-gradient(135deg,#1e4620,#2d6a30);border:3px solid #ffd700;cursor:pointer;width:58px;height:86px;">
            <div class="uno-oval-center"></div>
            <div class="uno-number-label" style="font-size:20px;font-weight:900;transform:rotate(-20deg);font-style:italic;">UNO</div>
        </div>
    </div>`;

    // FIX: Much bigger font on face cards
    html += `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
        <div style="color:#a3cfbb;font-size:11px;font-weight:bold;">PLAY</div>
        <div class="uno-card-body ${unoColorClass(discard.color)}" style="pointer-events:none;width:58px;height:86px;">
            <div class="uno-oval-center"></div>
            <div class="uno-number-label" style="font-size:36px;text-shadow:3px 3px 0 rgba(0,0,0,0.5);">${discard.value === 'Wild' ? '★' : discard.value}</div>
        </div>
    </div></div>`;

    if(window.unoWildChoosingActive) {
        html += `<div style="display:grid;grid-template-columns:1fr 1fr;width:90px;height:90px;border-radius:10px;overflow:hidden;border:3px solid #fff;margin:4px 0;">
            ${['Red','Yellow','Green','Blue'].map(col=> `<div onclick="unoPickWildColor('${col}')" style="background:${{Red:'#c00',Yellow:'#ffb703',Green:'#00b050',Blue:'#00b0ff'}[col]};cursor:pointer;"></div>`).join('')}
        </div>`;
    }

    html += `<div style="display:flex;gap:6px;overflow-x:auto;padding:8px 4px;width:100%;box-sizing:border-box;" id="unoHandScrollWrapper">`;
    hand.forEach((card, i) => {
        const playable = card.color===discard.color || card.value===discard.value || card.color==='Wild';
        // FIX: Much bigger font in hand
        html += `<div onclick="unoPlayCard(${i})" class="uno-card-body ${unoColorClass(card.color)}" style="flex-shrink:0;width:52px;height:78px;font-size:34px;text-shadow:3px 3px 0 rgba(0,0,0,0.5);opacity:${playable?1:0.35};cursor:pointer;">
            <div class="uno-oval-center"></div>
            <div class="uno-number-label">${card.value==='Wild'?'★':card.value}</div>
        </div>`;
    });
    html += `</div></div>`;
    gameCanvasContainer.innerHTML = html;

    setTimeout(() => { const el = document.getElementById('unoHandScrollWrapper'); if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' }); }, 100);
}

window.unoPlayCard = function(idx) {
    const cp = window.unoCurrentPlayer;
    const card = window.unoHands[cp][idx];
    if (card.color === 'Wild' || card.value === 'Wild' || card.value === '+4') {
        window.unoWildPendingIdx = idx; window.unoWildChoosingActive = true; renderUnoLayout(); return;
    }
    window.unoHands[cp].splice(idx, 1);
    window.unoDiscardPile = card;
    const numP = window.unoNumPlayers;
    if (card.value === '⇋') window.unoDirection *= -1;
    let skipNextPlayer = (card.value === 'Skip');
    if (card.value === '+2') {
        const targetP = (cp + window.unoDirection + numP) % numP;
        window.unoHands[targetP].push(window.unoDeckState.pop(), window.unoDeckState.pop());
        skipNextPlayer = true;
    }
    window.unoCurrentPlayer = (cp + (skipNextPlayer ? window.unoDirection * 2 : window.unoDirection) + numP) % numP;
    triggerUnoNetworkSync(); renderUnoLayout();
};

window.unoPickWildColor = function(color) {
    const cp = window.unoCurrentPlayer;
    const idx = window.unoWildPendingIdx;
    const wasD4 = window.unoHands[cp][idx].value === '+4';
    window.unoHands[cp].splice(idx, 1);
    window.unoDiscardPile = { color: color, value: wasD4 ? '+4' : 'Wild' };
    window.unoWildChoosingActive = false;
    const numP = window.unoNumPlayers;
    if (wasD4) {
        const targetP = (cp + window.unoDirection + numP) % numP;
        for(let i=0;i<4;i++) window.unoHands[targetP].push(window.unoDeckState.pop());
        window.unoCurrentPlayer = (cp + (window.unoDirection * 2) + numP) % numP;
    } else {
        window.unoCurrentPlayer = (cp + window.unoDirection + numP) % numP;
    }
    triggerUnoNetworkSync(); renderUnoLayout();
};

window.unoDrawCard = function() {
    const cp = window.unoCurrentPlayer;
    window.unoHands[cp].push(window.unoDeckState.pop());
    window.unoCurrentPlayer = (cp + window.unoDirection + window.unoNumPlayers) % window.unoNumPlayers;
    triggerUnoNetworkSync(); renderUnoLayout();
};

/* ═══════════════════════════════════════════════════════════
   3.  SEQUENCE
   ═══════════════════════════════════════════════════════════ */
const SEQUENCE_MATRIX_GRID = [
    'FREE','2♠','3♠','4♠','5♠','6♠','7♠','8♠','9♠','FREE',
    '6♣','A♦','K♦','Q♦','J♦','10♦','9♦','8♦','7♦','10♠',
    '5♣','Q♥','A♠','2♥','3♥','4♥','5♥','6♥','6♦','J♠',
    '4♣','J♥','K♠','A♥','2♣','3♣','4♣','7♥','5♦','Q♠',
    '3♣','10♥','9♠','K♥','K♣','Q♣','8♣','8♥','4♦','K♠',
    '2♣','9♥','8♠','7♠','6♠','5♠','4♠','9♥','3♦','A♠',
    'A♥','8♥','7♥','6♥','5♥','4♥','3♥','10♥','2♦','2♠',
    'K♥','K♦','Q♦','J♦','10♦','9♦','8♦','7♦','A♦','3♠',
    'Q♥','A♣','2♣','3♣','4♣','5♣','6♣','7♣','Q♥','4♠',
    'FREE','K♣','Q♣','J♣','10♣','9♣','8♣','7♣','A♣','FREE'
];

function initSequenceGame() {
    window.seqBoard    = Array(100).fill(0);
    window.seqTurn     = 1; 
    window.seqSequences = [0, 0];
    window.seqSelectedCardIdx = null;
    
    const cardSuits = ['♠','♣','♥','♦'];
    const cardRanks = ['2','3','4','5','6','7','8','9','10','Q','K','A'];
    window.mySequenceHand = [];
    for(let i=0; i<7; i++) {
        let s = cardSuits[Math.floor(Math.random()*cardSuits.length)];
        let r = cardRanks[Math.floor(Math.random()*cardRanks.length)];
        window.mySequenceHand.push({ r, s, isRed: (s==='♥'||s==='♦') });
    }
    triggerSequenceNetworkSync();
    renderSequenceBoard();
}

function triggerSequenceNetworkSync() {
    if (typeof channel !== 'undefined') channel.send({ type: 'broadcast', event: 'sequence-sync-state', payload: { boardState: window.seqBoard, turnState: window.seqTurn, sequenceScores: window.seqSequences } });
}

function renderSequenceBoard() {
    const board = window.seqBoard;
    const turn  = window.seqTurn;
    const sel   = window.seqSelectedCardIdx;

    // FIX: Adjusted padding/sizing to prevent cutoff edges
    const boardW = Math.min(window.innerWidth - 30, 330);
    const cellPx = Math.floor(boardW / 10);
    
    // FIX: Added color dot indicator
    const dotColor = turn === 1 ? '#00b0ff' : '#e63946';

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;box-sizing:border-box;padding-top:10px;">
        <div style="display:grid;grid-template-columns:repeat(10,${cellPx}px);grid-template-rows:repeat(10,${cellPx}px);gap:1px;background:#111;padding:2px;border:3px solid #ffd700;border-radius:6px;">`;

    for (let i = 0; i < 100; i++) {
        const label = SEQUENCE_MATRIX_GRID[i];
        const token = board[i];
        const isRed = label.includes('♥') || label.includes('♦');

        let tokenMark = '';
        if (token === 1) tokenMark = '<div style="width:70%;height:70%;border-radius:50%;background:#00b0ff;border:2px solid #fff;position:absolute;"></div>';
        if (token === 2) tokenMark = '<div style="width:70%;height:70%;border-radius:50%;background:#e63946;border:2px solid #fff;position:absolute;"></div>';

        // FIX: Bigger fonts, and highlight logic reinstated for local view
        let highlightStyle = '';
        if (sel !== null && !token && label !== 'FREE' && label === (window.mySequenceHand[sel].r + window.mySequenceHand[sel].s)) {
            highlightStyle = 'box-shadow:inset 0 0 0 3px #ffd700;background:rgba(255,215,0,0.3);';
        }

        html += `<div onclick="handleSequenceGridCellTap(${i})" style="position:relative;background:#fff;color:${isRed?'#c00':'#111'};font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;border:1px solid #44px;aspect-ratio:1;${highlightStyle}">
            <span>${label === 'FREE' ? '★' : label}</span>
            ${tokenMark}
        </div>`;
    }

    // FIX: Removed the colon text, added color dot
    html += `</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
            <div style="width:18px;height:18px;border-radius:50%;background:${dotColor};border:2px solid #fff;"></div>
            <div style="color:#fff;font-size:14px;font-weight:bold;">Your Hand</div>
        </div>
        <div style="display:flex;gap:5px;width:100%;justify-content:center;overflow-x:auto;padding-bottom:10px;">`;

    window.mySequenceHand.forEach((card, idx) => {
        let isHighlighted = (sel === idx) ? 'border:3px solid #ffd700;background:#fff;' : 'border:2px solid #aaa;background:#eee;';
        html += `<button onclick="window.seqSelectedCardIdx=${idx===window.seqSelectedCardIdx ? null : idx};renderSequenceBoard();" style="${isHighlighted}border-radius:6px;width:42px;height:62px;font-weight:900;font-size:16px;color:${card.isRed?'#c00':'#111'};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0;">
            <span>${card.r}</span><span>${card.s}</span>
        </button>`;
    });

    html += `</div></div>`;
    gameCanvasContainer.innerHTML = html;
}

window.handleSequenceGridCellTap = function(idx) {
    if (window.seqSelectedCardIdx === null || window.seqBoard[idx] !== 0) return;
    const card = window.mySequenceHand[window.seqSelectedCardIdx];
    const targetLabel = SEQUENCE_MATRIX_GRID[idx];
    if (targetLabel !== (card.r + card.s) && targetLabel !== 'FREE') return;
    window.seqBoard[idx] = window.seqTurn;
    const cardSuits = ['♠','♣','♥','♦'];
    const cardRanks = ['2','3','4','5','6','7','8','9','10','Q','K','A'];
    let s = cardSuits[Math.floor(Math.random()*cardSuits.length)];
    let r = cardRanks[Math.floor(Math.random()*cardRanks.length)];
    window.mySequenceHand[window.seqSelectedCardIdx] = { r, s, isRed: (s==='♥'||s==='♦') };
    window.seqSelectedCardIdx = null;
    window.seqTurn = (window.seqTurn === 1) ? 2 : 1;
    triggerSequenceNetworkSync(); renderSequenceBoard();
};
/* ═══════════════════════════════════════════════════════════
   4.  CREW TRIVIA (STYLED MENU, AUTO-ADVANCE)
   ═══════════════════════════════════════════════════════════ */
function initTriviaGame() {
    window.triviaQuestionCount = 0;
    window.triviaScorePoints   = 0;
    
    // FIX: Aesthetically pleasing dropdown matched to your website colors
    gameCanvasContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:20px;width:100%;box-sizing:border-box;height:100%;">
            <div style="color:#ffd700;font-size:28px;font-weight:bold;font-family:Impact,sans-serif;text-shadow:2px 2px 4px rgba(0,0,0,0.6);text-align:center;">TRIVIA CATEGORY</div>
            
            <div style="position:relative;width:100%;max-width:280px;">
                <select id="triviaCategoryPicker" style="width:100%;padding:16px;font-size:18px;font-weight:900;border-radius:12px;border:3px solid #ffd700;background:#2d6a30;color:#fff;outline:none;box-shadow:0 6px 15px rgba(0,0,0,0.4);appearance:none;text-align:center;cursor:pointer;">
                    <option value="9">Mixed Bag (General)</option>
                    <option value="11">Movies & Cinema</option>
                    <option value="12">Music & Tracks</option>
                    <option value="14">Television Shows</option>
                    <option value="15">Video Games</option>
                    <option value="17">Science & Nature</option>
                    <option value="22">Geography Matrix</option>
                    <option value="23">History Channels</option>
                    <option value="26">Celebrity Pop Culture</option>
                    <option value="21">Sports Arena</option>
                </select>
                <div style="position:absolute;right:16px;top:50%;transform:translateY(-50%);pointer-events:none;color:#ffd700;font-size:20px;">▼</div>
            </div>

            <button onclick="launchLiveTriviaEngine()" style="width:100%;max-width:280px;padding:16px;background:#ffd700;color:#1e4620;font-weight:900;font-size:22px;border:none;border-radius:12px;cursor:pointer;font-family:Impact,sans-serif;box-shadow:0 6px 15px rgba(0,0,0,0.4);margin-top:10px;">START GAME</button>
        </div>`;
}

window.launchLiveTriviaEngine = function() {
    const category = document.getElementById('triviaCategoryPicker') ? document.getElementById('triviaCategoryPicker').value : '9';
    gameCanvasContainer.innerHTML = `<div style="color:white;font-size:20px;font-weight:bold;text-align:center;padding:40px;">Fetching question...</div>`;
    
    fetch(`https://opentdb.com/api.php?amount=1&type=multiple&category=${category}&cache=${Math.random()}`)
        .then(res => res.json())
        .then(data => {
            if(!data.results || data.results.length === 0) { initTriviaGame(); return; }
            const item = data.results[0];
            
            const decode = s => { let t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
            const questionText = decode(item.question);
            const correctAnswer = decode(item.correct_answer);
            let choices = item.incorrect_answers.map(ans => decode(ans));
            choices.splice(Math.floor(Math.random() * (choices.length + 1)), 0, correctAnswer);

            window.sharedRoomTriviaQuestion = { q: questionText, c: correctAnswer, choices: choices, cat: category };
            
            if (typeof channel !== 'undefined') {
                channel.send({
                    type: 'broadcast',
                    event: 'sync-room-trivia',
                    payload: { triviaData: window.sharedRoomTriviaQuestion, count: window.triviaQuestionCount }
                });
            }
            renderSharedTriviaUI();
        })
        .catch(() => { initTriviaGame(); });
};

function renderSharedTriviaUI() {
    const q = window.sharedRoomTriviaQuestion;
    if (!q) return;

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;padding:4px;box-sizing:border-box;">
        <div style="color:#ffd700;font-size:18px;font-weight:bold;font-family:Impact,sans-serif;">QUESTION: ${window.triviaQuestionCount + 1}/20 &nbsp;|&nbsp; SCORE: ${window.triviaScorePoints}</div>
        <div style="background:rgba(0,0,0,0.5);padding:16px;border-radius:10px;font-size:24px;color:#fff;font-weight:900;text-align:center;width:100%;box-sizing:border-box;border:2px solid #ffd700;line-height:1.3;">${q.q}</div>
        <div style="display:flex;flex-direction:column;gap:10px;width:100%;margin-top:8px;">`;

    q.choices.forEach(choice => {
        html += `<button class="trivia-inline-choice-btn" data-choice="${choice.replace(/"/g, '&quot;')}" style="width:100%;padding:16px;background:#e2f0d9;color:#1e4620;border:none;border-radius:10px;font-weight:900;font-size:18px;text-align:left;cursor:pointer;box-shadow:0 4px 6px rgba(0,0,0,0.3);" onclick="evaluateRoomTriviaClick(this, \`${choice.replace(/'/g, "\\'")}\`)" >${choice}</button>`;
    });
    
    // Hidden picker state so it remembers the category when auto-advancing
    html += `<input type="hidden" id="triviaCategoryPicker" value="${q.cat || '9'}">`;
    html += `</div></div>`;
    gameCanvasContainer.innerHTML = html;
}

window.evaluateRoomTriviaClick = function(btn, choice) {
    const allButtons = document.querySelectorAll('.trivia-inline-choice-btn');
    allButtons.forEach(b => b.disabled = true);
    
    window.triviaQuestionCount++;

    if (choice === window.sharedRoomTriviaQuestion.c) {
        btn.style.background = '#00ff88'; 
        btn.style.color = '#000';
        window.triviaScorePoints++;
    } else {
        btn.style.background = '#e63946';
        btn.style.color = '#fff';
        allButtons.forEach(b => {
            if (b.getAttribute('data-choice') === window.sharedRoomTriviaQuestion.c) {
                b.style.background = '#00ff88';
                b.style.color = '#000';
            }
        });
    }

    // FIX: Automatically moves to the next question after 2 seconds
    setTimeout(() => {
        if (window.triviaQuestionCount >= 20) {
            gameCanvasContainer.innerHTML = `
                <div style="text-align:center;padding:20px;">
                    <h2 style="color:#ffd700;font-family:Impact;font-size:36px;text-shadow:2px 2px 4px rgba(0,0,0,0.5);">ROUND COMPLETE!</h2>
                    <div style="font-size:54px;font-weight:900;color:white;margin:16px 0;">${window.triviaScorePoints} / 20</div>
                    <button onclick="initTriviaGame()" style="padding:16px 32px;font-size:20px;background:#ffd700;color:#1e4620;border:none;border-radius:8px;font-weight:900;cursor:pointer;font-family:Impact,sans-serif;">PLAY AGAIN</button>
                </div>`;
        } else {
            window.launchLiveTriviaEngine();
        }
    }, 2000);
};

/* ═══════════════════════════════════════════════════════════
   5.  CLASSIC KLONDIKE SOLITAIRE (LIGHTNING BACKS, HUGE FONT)
   ═══════════════════════════════════════════════════════════ */
window.initSolitaireGame = function() {
    const suits = ['♠','♣','♥','♦'];
    const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    let deck = [];
    
    suits.forEach(s => ranks.forEach((r, val) => {
        deck.push({ r, s, val: val + 1, isRed: (s==='♥'||s==='♦'), open: false });
    }));
    deck.sort(() => Math.random() - 0.5);

    window.solTableau = Array(7).fill(0).map(() => []);
    for (let i = 0; i < 7; i++) {
        for (let j = i; j < 7; j++) {
            window.solTableau[j].push(deck.pop());
        }
        window.solTableau[i][window.solTableau[i].length - 1].open = true;
    }

    window.solDeck = deck;      
    window.solWaste = [];       
    window.solFoundations = Array(4).fill(0).map(() => []); 
    window.solSelected = null;  

    renderSolitaireBoard();
};

function renderSolitaireBoard() {
    const screenW = Math.min(window.innerWidth - 10, 360);
    const cardW = Math.floor(screenW / 7.5);
    const cardH = Math.floor(cardW * 1.35); // Slightly taller to fit big font
    
    let html = `<div style="display:flex;flex-direction:column;gap:12px;width:100%;box-sizing:border-box;padding:2px;user-select:none;">`;
    html += `<div style="display:flex;justify-content:between;width:100%;gap:4px;">`;
    
    // FIX: Draw pile lightning bolt design
    html += `<div onclick="drawSolitaireCard()" style="width:${cardW}px;height:${cardH}px;border-radius:6px;background:${window.solDeck.length?'linear-gradient(135deg,#0a192f,#1e4620)':'rgba(255,255,255,0.05)'};border:2px solid #ffd700;display:flex;align-items:center;justify-content:center;color:#ffd700;font-size:28px;cursor:pointer;">
        ${window.solDeck.length ? '⚡' : '↻'}
    </div>`;

    const topWaste = window.solWaste[window.solWaste.length - 1];
    let wasteSel = (window.solSelected && window.solSelected.type === 'waste') ? 'outline:3px solid #ffd700;' : '';
    
    // FIX: Massive font on face-up cards
    html += `<div onclick="selectSolitaireWaste()" style="width:${cardW}px;height:${cardH}px;border-radius:6px;background:${topWaste?'#fff':'rgba(0,0,0,0.2)'};color:${topWaste?.isRed?'#c00':'#111'};${wasteSel}display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;font-size:20px;cursor:pointer;">
        ${topWaste ? `<span>${topWaste.r}</span><span style="font-size:24px;">${topWaste.s}</span>` : ''}
    </div>`;

    html += `<div style="flex-grow:1;"></div>`;

    for (let i = 0; i < 4; i++) {
        const fPile = window.solFoundations[i];
        const topF = fPile[fPile.length - 1];
        html += `<div onclick="targetSolitaireFoundation(${i})" style="width:${cardW}px;height:${cardH}px;border-radius:6px;background:${topF?'#fff':'rgba(255,255,255,0.05)'};border:2px dashed rgba(255,215,0,0.4);color:${topF?.isRed?'#c00':'#111'};display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;font-size:20px;cursor:pointer;">
            ${topF ? `<span>${topF.r}</span><span style="font-size:24px;">${topF.s}</span>` : '<span style="color:rgba(255,255,255,0.3)">A</span>'}
        </div>`;
    }
    html += `</div>`; 

    html += `<div style="display:flex;gap:4px;width:100%;justify-content:space-between;align-items:flex-start;min-height:260px;">`;
    for (let c = 0; c < 7; c++) {
        const colCards = window.solTableau[c];
        html += `<div onclick="targetSolitaireColumn(${c})" style="display:flex;flex-direction:column;width:${cardW}px;min-height:${cardH}px;border-radius:6px;background:${colCards.length?'transparent':'rgba(255,255,255,0.02)'};position:relative;">`;
        
        colCards.forEach((card, idx) => {
            const isSel = (window.solSelected && window.solSelected.type === 'tableau' && window.solSelected.col === c && window.solSelected.idx === idx);
            let style = `width:100%;height:${cardH}px;border-radius:6px;position:${idx===0?'relative':'absolute'};margin-top:${idx * 22}px;box-shadow:0 3px 6px rgba(0,0,0,0.4);box-sizing:border-box;`;
            
            if (!card.open) {
                // FIX: Lightning bolt on face-down cards
                html += `<div style="${style}background:linear-gradient(135deg,#0a192f,#1e4620);border:1px solid #ffd700;display:flex;align-items:center;justify-content:center;color:#ffd700;font-size:20px;opacity:0.9;">⚡</div>`;
            } else {
                let borderStyle = isSel ? 'border:3px solid #ffd700;' : 'border:1px solid #aaa;';
                // FIX: Massive font on tableau face cards
                html += `<div onclick="event.stopPropagation(); selectSolitaireCard(${c}, ${idx})" style="${style}background:#fff;color:${card.isRed?'#c00':'#111'};${borderStyle}display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;font-size:20px;line-height:1;cursor:pointer;">
                    <span>${card.r}</span><span style="font-size:24px;">${card.s}</span>
                </div>`;
            }
        });
        html += `</div>`;
    }
    html += `</div></div>`;
    gameCanvasContainer.innerHTML = html;
}

window.drawSolitaireCard = function() {
    window.solSelected = null;
    if (window.solDeck.length === 0) {
        window.solDeck = window.solWaste.reverse().map(c => ({ ...c, open: false }));
        window.solWaste = [];
    } else {
        let card = window.solDeck.pop();
        card.open = true;
        window.solWaste.push(card);
    }
    renderSolitaireBoard();
};

window.selectSolitaireWaste = function() {
    if (window.solWaste.length === 0) return;
    window.solSelected = { type: 'waste' };
    renderSolitaireBoard();
};

window.selectSolitaireCard = function(col, idx) {
    if (!window.solTableau[col][idx].open) return;
    window.solSelected = { type: 'tableau', col, idx };
    renderSolitaireBoard();
};

window.targetSolitaireColumn = function(toCol) {
    if (!window.solSelected) return;
    const targetPile = window.solTableau[toCol];
    const topTarget = targetPile[targetPile.length - 1];
    
    let movingCards = [];
    if (window.solSelected.type === 'waste') {
        movingCards = [window.solWaste[window.solWaste.length - 1]];
    } else {
        movingCards = window.solTableau[window.solSelected.col].slice(window.solSelected.idx);
    }

    const firstMovingCard = movingCards[0];
    
    let isValid = false;
    if (!topTarget) {
        if (firstMovingCard.val === 13) isValid = true; 
    } else if (topTarget.open && topTarget.isRed !== firstMovingCard.isRed && topTarget.val === firstMovingCard.val + 1) {
        isValid = true;
    }

    if (isValid) {
        if (window.solSelected.type === 'waste') {
            targetPile.push(window.solWaste.pop());
        } else {
            const originCol = window.solTableau[window.solSelected.col];
            window.solTableau[window.solSelected.col] = originCol.slice(0, window.solSelected.idx);
            movingCards.forEach(c => targetPile.push(c));
            if (window.solTableau[window.solSelected.col].length > 0) {
                window.solTableau[window.solSelected.col][window.solTableau[window.solSelected.col].length - 1].open = true;
            }
        }
        checkSolitaireVictory();
    }
    window.solSelected = null;
    renderSolitaireBoard();
};

window.targetSolitaireFoundation = function(fIdx) {
    if (!window.solSelected || window.solSelected.type === 'tableau' && window.solSelected.idx !== window.solTableau[window.solSelected.col].length - 1) return;
    
    let card = (window.solSelected.type === 'waste') 
        ? window.solWaste[window.solWaste.length - 1] 
        : window.solTableau[window.solSelected.col][window.solSelected.idx];
        
    const fPile = window.solFoundations[fIdx];
    const topF = fPile[fPile.length - 1];
    
    let isValid = false;
    if (!topF) {
        if (card.val === 1) isValid = true; 
    } else if (topF.s === card.s && card.val === topF.val + 1) {
        isValid = true;
    }

    if (isValid) {
        if (window.solSelected.type === 'waste') {
            fPile.push(window.solWaste.pop());
        } else {
            fPile.push(window.solTableau[window.solSelected.col].pop());
            if (window.solTableau[window.solSelected.col].length > 0) {
                window.solTableau[window.solSelected.col][window.solTableau[window.solSelected.col].length - 1].open = true;
            }
        }
        checkSolitaireVictory();
    }
    window.solSelected = null;
    renderSolitaireBoard();
};

function checkSolitaireVictory() {
    if (window.solFoundations.reduce((acc, current) => acc + current.length, 0) === 52) {
        setTimeout(() => {
            gameCanvasContainer.innerHTML = `<div style="text-align:center;padding:20px;color:#ffd700;font-family:Impact;font-size:32px;text-shadow:2px 2px 5px #000;">👑 SOLITAIRE VICTORY!</div>`;
        }, 300);
    }
}

/* ═══════════════════════════════════════════════════════════
   6.  HANGMAN (RESTORED ANIMATIONS, CLEAR DASHES, BIG LETTERS)
   ═══════════════════════════════════════════════════════════ */
const HANGMAN_DICTIONARY_POOL = ['CHASER','UNICYCLE','ADVENTURE','JOURNEY','HIGHWAY','VELOCITY','NAVIGATOR','COMPASS','HORIZON','PASSPORT','WANDERER','ROUTING','POSTAL','BATTERY','SURVIVAL','FLOORING'];

function initHangmanGame() {
    const targetWord = HANGMAN_DICTIONARY_POOL[Math.floor(Math.random() * HANGMAN_DICTIONARY_POOL.length)];
    window.hangmanState = { word: targetWord, guessed: [], wrong: 0, maxWrong: 6, dying: false };
    renderHangmanGame();
}

// FIX: Restored the animated SVG Stick Figure
function buildHangmanSVG(wrong, dying) {
    const bodyColor = dying ? '#dc3545' : '#e2f0d9';
    const shake     = dying ? 'style="animation:hangShake 0.5s ease-in-out 3"' : '';
    const p = { head: wrong>=1, body: wrong>=2, leftA: wrong>=3, rightA: wrong>=4, leftL: wrong>=5, rightL: wrong>=6 };
    return `<svg viewBox="0 0 120 160" width="140" height="180" xmlns="http://www.w3.org/2000/svg">
        <style>@keyframes hangShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}</style>
        <line x1="10" y1="155" x2="110" y2="155" stroke="#ffd700" stroke-width="5" stroke-linecap="round"/>
        <line x1="30"  y1="155" x2="30"  y2="10"  stroke="#ffd700" stroke-width="5" stroke-linecap="round"/>
        <line x1="30"  y1="10"  x2="75"  y2="10"  stroke="#ffd700" stroke-width="5" stroke-linecap="round"/>
        <line x1="75"  y1="10"  x2="75"  y2="28"  stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>
        <g ${shake} transform-origin="75 36">
            ${p.head?`<circle cx="75" cy="40" r="14" stroke="${bodyColor}" stroke-width="4" fill="none"/>`:'' }
            ${p.head&&dying?`<text x="66" y="46" font-size="14" font-weight="bold" fill="${bodyColor}">X X</text>`
              :p.head?`<circle cx="70" cy="36" r="2.5" fill="${bodyColor}"/><circle cx="80" cy="36" r="2.5" fill="${bodyColor}"/><path d="M70 45 Q75 50 80 45" stroke="${bodyColor}" stroke-width="2" fill="none"/>`:'' }
            ${p.body  ?`<line x1="75" y1="54" x2="75" y2="100" stroke="${bodyColor}" stroke-width="4" stroke-linecap="round"/>`:'' }
            ${p.leftA ?`<line x1="75" y1="65" x2="50" y2="85" stroke="${bodyColor}" stroke-width="4" stroke-linecap="round"/>`:'' }
            ${p.rightA?`<line x1="75" y1="65" x2="100" y2="85" stroke="${bodyColor}" stroke-width="4" stroke-linecap="round"/>`:'' }
            ${p.leftL ?`<line x1="75" y1="100" x2="55" y2="130" stroke="${bodyColor}" stroke-width="4" stroke-linecap="round"/>`:'' }
            ${p.rightL?`<line x1="75" y1="100" x2="95" y2="130" stroke="${bodyColor}" stroke-width="4" stroke-linecap="round"/>`:'' }
        </g>
    </svg>`;
}

function renderHangmanGame() {
    const state = window.hangmanState;
    if(!state || !state.word) return;
    
    let isWin = state.word.split('').every(l => state.guessed.includes(l));
    let isLose = state.wrong >= state.maxWrong;

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;box-sizing:border-box;padding-top:10px;">`;
    html += `<div>${buildHangmanSVG(state.wrong, state.dying || isLose)}</div>`;

    // FIX: Clearer dashes, properly spaced, responsive to word length
    html += `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:10px 0;">`;
    state.word.split('').forEach(letter => {
        const revealed = state.guessed.includes(letter) || isLose;
        html += `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="font-size:32px;font-weight:900;color:${revealed?(isLose && !state.guessed.includes(letter)?'#dc3545':'#ffd700'):'transparent'};min-width:28px;text-align:center;font-family:Impact,sans-serif;">${letter}</div>
            <div style="width:28px;height:5px;background:#e2f0d9;border-radius:2px;box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>
        </div>`;
    });
    html += `</div>`;

    if (isWin) {
        html += `<div style="color:#00b050;font-size:24px;font-weight:bold;text-align:center;text-shadow:1px 1px 2px #000;">🎉 YOU GOT IT!</div>
            <button onclick="initHangmanGame()" style="background:#ffd700;color:#1e4620;border:none;border-radius:8px;padding:14px 30px;font-size:18px;font-weight:900;cursor:pointer;margin-top:10px;box-shadow:0 4px 8px rgba(0,0,0,0.4);">NEW WORD</button>`;
    } else if (isLose) {
        html += `<div style="color:#dc3545;font-size:24px;font-weight:bold;text-align:center;text-shadow:1px 1px 2px #000;">💀 GAME OVER</div>
            <button onclick="initHangmanGame()" style="background:#ffd700;color:#1e4620;border:none;border-radius:8px;padding:14px 30px;font-size:18px;font-weight:900;cursor:pointer;margin-top:10px;box-shadow:0 4px 8px rgba(0,0,0,0.4);">TRY AGAIN</button>`;
    } else {
        // FIX: Much bigger keyboard letters at the bottom
        html += `<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:320px;">`;
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
            const used = state.guessed.includes(letter);
            const isWrong = used && !state.word.includes(letter);
            const isRight = used && state.word.includes(letter);
            html += `<button onclick="handleHangmanClick('${letter}')" ${used?'disabled':''}
                style="width:36px;height:42px;border-radius:6px;border:none;font-weight:900;font-size:18px;
                cursor:${used?'default':'pointer'};
                background:${isWrong?'#dc3545':isRight?'#00b050':'#e2f0d9'};
                color:${used?'white':'#1e4620'};opacity:${used?0.5:1};box-shadow:0 3px 5px rgba(0,0,0,0.3);">
                ${letter}
            </button>`;
        });
        html += `</div><div style="color:#ffd700;font-size:14px;font-weight:bold;margin-top:8px;">Mistakes: ${state.wrong} / ${state.maxWrong}</div>`;
    }
    html += `</div>`;
    gameCanvasContainer.innerHTML = html;
}

window.handleHangmanClick = function(letter) {
    const state = window.hangmanState;
    if(!state || !state.word || state.guessed.includes(letter)) return;
    
    state.guessed.push(letter);
    if(!state.word.includes(letter)) {
        state.wrong++;
        if(state.wrong >= state.maxWrong) {
            state.dying = true;
            renderHangmanGame();
            setTimeout(()=>{ state.dying=false; renderHangmanGame(); }, 1600);
            return;
        }
    }
    renderHangmanGame();
};
