/* ============================================================
   CHASER ARCADE ENGINE  –  games.js (PART 1 OF 2)
   ============================================================ */

/* ── Multiplayer sync handlers ───────────────────────────── */
window.handleIncomingCheckersSync = (p) => {
    window.syncCheckersBoard = p.boardState;
    window.checkersTurn      = p.activeTurn;
    window.consecutiveJumpsActive = p.consecutiveActive || false;
    if (activeGameStage.classList.contains('open') && activeGameLabelTitle.innerText.includes('Checkers')) {
        renderCheckersGrid();
    }
};

window.handleIncomingUnoSync = (p) => {
    window.unoDiscardPile   = p.currentDiscard;
    window.unoCurrentPlayer = p.turn;
    window.unoHands         = p.hands;
    window.unoDeckState     = p.deck;
    window.unoDirection     = p.direction;
    if (activeGameStage.classList.contains('open') && activeGameLabelTitle.innerText.includes('Uno')) {
        renderUnoLayout();
    }
};

window.handleIncomingTriviaSync = (p) => {
    window.sharedRoomTriviaQuestion = p.triviaData;
    window.triviaQuestionCount      = p.count;
    window.roomTriviaScores         = p.scores || {};
    if (activeGameStage.classList.contains('open') && activeGameLabelTitle.innerText.includes('Trivia')) {
        renderSharedTriviaUI();
    }
};

window.handleIncomingSequenceSync = (p) => {
    window.seqBoard         = p.boardState;
    window.seqTurn          = p.turnState;
    window.seqSequences     = p.sequenceScores;
    if (activeGameStage.classList.contains('open') && activeGameLabelTitle.innerText.includes('Sequence')) {
        renderSequenceBoard();
    }
};

/* ── Game launcher / teardown ────────────────────────────── */
window.launchGameEngine = function (gameName, gameIcon) {
    gameHubOverlay.classList.remove('open');
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
   1.  CHECKERS (NO FORESHADOW, DOUBLE JUMP RULES)
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
    const boardPx    = Math.min(320, Math.floor((window.innerWidth - 32) * 0.95));
    const cellPx     = Math.floor(boardPx / 8);
    const actualBoardPx = cellPx * 8;
    const piecePx    = Math.floor(cellPx * 0.80);

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;padding:4px;box-sizing:border-box;">
        <div style="color:#ffd700;font-weight:bold;font-size:16px;font-family:Impact,sans-serif;">
            ${turn === 1 ? '🔴 RED TEAM TURN' : '⚫ BLACK TEAM TURN'} ${window.consecutiveJumpsActive ? ' - JUMP BONUS!' : ''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(8,${cellPx}px);grid-template-rows:repeat(8,${cellPx}px);width:${actualBoardPx}px;height:${actualBoardPx}px;border:4px solid #ffd700;border-radius:8px;overflow:hidden;">`;

    for (let i = 0; i < 64; i++) {
        const p = board[i];
        const bgColor = (Math.floor(i / 8) + i % 8) % 2 === 1 ? '#2d6a30' : '#e2f0d9';
        let pieceHtml = '';
        if (p === 1) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff6b6b,#c00);border:2px solid #fff;"></div>`;
        if (p === 2) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#555,#111);border:2px solid #fff;"></div>`;
        if (p === 3) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff6b6b,#c00);border:3px solid #ffd700;display:flex;align-items:center;justify-content:center;font-size:${Math.floor(cellPx*0.4)}px;color:white;">👑</div>`;
        if (p === 4) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#555,#111);border:3px solid #ffd700;display:flex;align-items:center;justify-content:center;font-size:${Math.floor(cellPx*0.4)}px;color:white;">👑</div>`;

        html += `<div onclick="handleCheckerTap(${i})" style="width:${cellPx}px;height:${cellPx}px;background:${bgColor};display:flex;align-items:center;justify-content:center;cursor:pointer;box-sizing:border-box;${sel===i?'outline:4px solid #ffd700;outline-offset:-4px;':''}">
            ${pieceHtml}
        </div>`;
    }
    gameCanvasContainer.innerHTML = html + `</div></div>`;
}

function getCheckerMoves(idx, board, turn, jumpOnly) {
    const p = board[idx], isRed = p === 1 || p === 3, isKing = p === 3 || p === 4, enemy = isRed ? [2, 4] : [1, 3], r = Math.floor(idx / 8), c = idx % 8, moves = [];
    const dirs = [];
    if (!isRed || isKing) dirs.push([-1, -1], [-1, 1]);
    if (isRed || isKing) dirs.push([1, -1], [1, 1]);
    dirs.forEach(([dr, dc]) => {
        const nr = r + dr, nc = c + dc, ni = nr * 8 + nc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            if (!board[ni] && !jumpOnly) moves.push(ni);
            else if (enemy.includes(board[ni])) {
                const jr = nr + dr, jc = nc + dc, ji = jr * 8 + jc;
                if (jr >= 0 && jr < 8 && jc >= 0 && jc <= 7 && !board[ji]) moves.push(ji);
            }
        }
    });
    return moves;
}

window.handleCheckerTap = function (idx) {
    const board = window.syncCheckersBoard, turn = window.checkersTurn, owned = turn === 1 ? [1, 3] : [2, 4];
    if (window.selectedCheckerIdx === null) {
        if (owned.includes(board[idx])) {
            if (window.consecutiveJumpsActive && idx !== window.lastJumpDestinationIdx) return;
            window.selectedCheckerIdx = idx; renderCheckersGrid();
        }
        return;
    }
    const from = window.selectedCheckerIdx;
    const moves = getCheckerMoves(from, board, turn, window.consecutiveJumpsActive);
    if (!moves.includes(idx)) {
        if (owned.includes(board[idx]) && !window.consecutiveJumpsActive) { window.selectedCheckerIdx = idx; renderCheckersGrid(); }
        else if (!window.consecutiveJumpsActive) { window.selectedCheckerIdx = null; renderCheckersGrid(); }
        return;
    }
    const isJump = Math.abs(idx - from) > 10;
    board[idx] = board[from]; board[from] = 0;
    if (isJump) board[Math.floor((from + idx) / 2)] = 0;
    if (board[idx] === 1 && Math.floor(idx / 8) === 7) board[idx] = 3;
    if (board[idx] === 2 && Math.floor(idx / 8) === 0) board[idx] = 4;
    
    let hasMoreJumps = false;
    if (isJump) {
        const extraJumps = getCheckerMoves(idx, board, turn, true);
        if (extraJumps.length > 0) {
            hasMoreJumps = true; window.consecutiveJumpsActive = true;
            window.lastJumpDestinationIdx = idx; window.selectedCheckerIdx = idx;
        }
    }
    if (!hasMoreJumps) { window.selectedCheckerIdx = null; window.consecutiveJumpsActive = false; window.checkersTurn = turn === 1 ? 2 : 1; }
    if (typeof channel !== 'undefined') channel.send({ type:'broadcast', event:'checkers-sync-move', payload:{ boardState:board, activeTurn:window.checkersTurn, consecutiveActive:window.consecutiveJumpsActive } });
    renderCheckersGrid();
};

/* ═══════════════════════════════════════════════════════════
   2.  UNO (ROOM CHANNEL BASED, CUSTOM DESIGNED DRAW PILE)
   ═══════════════════════════════════════════════════════════ */
function initChaserUnoGame() {
    window.myPlayerNumber = window.myPlayerNumber !== undefined ? window.myPlayerNumber : 0; 
    const colors = ['Red','Yellow','Green','Blue'];
    window.unoDeckState = [];
    colors.forEach(c => {
        window.unoDeckState.push({color:c,value:'0'});
        ['1','2','3','4','5','6','7','8','9','Skip','⇋','+2'].forEach(v => {
            window.unoDeckState.push({color:c,value:v},{color:c,value:v});
        });
    });
    for(let i=0;i<4;i++) window.unoDeckState.push({color:'Wild',value:'Wild'}, {color:'Wild',value:'+4'});
    window.unoDeckState.sort(() => Math.random() - 0.5);

    window.unoNumPlayers         = 2; 
    window.unoCurrentPlayer      = 0;
    window.unoDirection          = 1;
    window.unoWildChoosingActive = false;
    window.unoWildPendingIdx     = null;

    window.unoHands = [[],[]];
    for(let p=0;p<2;p++) {
        for(let i=0;i<7;i++) window.unoHands[p].push(window.unoDeckState.pop());
    }
    
    let startCard;
    do { startCard = window.unoDeckState.pop(); } while(startCard.value==='Wild'||startCard.value==='+4');
    window.unoDiscardPile = startCard;
    
    triggerUnoNetworkSync();
    renderUnoLayout();
}

function triggerUnoNetworkSync() {
    if (typeof channel !== 'undefined') {
        channel.send({
            type: 'broadcast',
            event: 'uno-sync-discard',
            payload: { currentDiscard: window.unoDiscardPile, turn: window.unoCurrentPlayer, hands: window.unoHands, deck: window.unoDeckState, direction: window.unoDirection }
        });
    }
}

function unoColorClass(color) {
    return {Red:'#e63946',Yellow:'#ffb703',Green:'#00b050',Blue:'#00b0ff',Wild:'#222'}[color]||'#222';
}

function renderUnoLayout() {
    const discard = window.unoDiscardPile;
    const cp      = window.unoCurrentPlayer;
    const hand    = window.unoHands[window.myPlayerNumber] || [];
    
    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:4px;width:100%;box-sizing:border-box;">`;
    html += `<div style="background:#2d6a30;border-radius:6px;padding:6px 20px;color:#ffd700;font-size:16px;font-weight:900;font-family:Impact,sans-serif;">
        🎴 PLAYER ${cp+1}'S TURN ${window.myPlayerNumber === cp ? '(YOU)' : ''}
    </div>`;

    html += `<div style="display:flex;gap:35px;align-items:flex-end;margin-bottom:10px;">`;
    
    // DRAW PILE: Gray/Black with a white bold center label and yellow safety border matrix
    html += `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <div style="color:#a3cfbb;font-size:11px;font-weight:bold;">DRAW</div>
        <div onclick="unoDrawCard()" style="background:linear-gradient(135deg,#3c3c3c,#1a1a1a);border:3px solid #ffd700;box-shadow:0 4px 8px rgba(0,0,0,0.4);cursor:pointer;width:64px;height:94px;border-radius:8px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
            <div style="color:#fff;font-size:18px;font-weight:900;font-family:Impact,sans-serif;transform:rotate(-15deg);">UNO</div>
        </div>
    </div>`;

    // PLAY PILE: Card size matches with gigantic number scaling inside card
    const isLongText = discard.value.length > 2;
    html += `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <div style="color:#a3cfbb;font-size:11px;font-weight:bold;">PLAY</div>
        <div style="background:${unoColorClass(discard.color)};width:64px;height:94px;border:2px solid #fff;border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 8px rgba(0,0,0,0.4);box-sizing:border-box;position:relative;overflow:hidden;">
            <div style="position:absolute;width:54px;height:34px;background:rgba(255,255,255,0.15);border-radius:50%;transform:rotate(-25deg);"></div>
            <div style="color:#fff;font-size:${isLongText?'16px':'42px'};font-weight:900;font-family:Impact,sans-serif;z-index:2;text-shadow:2px 2px 4px rgba(0,0,0,0.4); max-width: 100%; text-align:center;">
                ${discard.value === 'Wild' ? '★' : discard.value === '⇋' ? '⇋' : discard.value}
            </div>
        </div>
    </div>`;
    html += `</div>`;

    if(window.unoWildChoosingActive && window.myPlayerNumber === cp) {
        html += `<div style="display:grid;grid-template-columns:1fr 1fr;width:90px;height:90px;border-radius:10px;overflow:hidden;border:3px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.4);">
            ${['Red','Yellow','Green','Blue'].map(col=>
                `<div onclick="unoPickWildColor('${col}')" style="background:${unoColorClass(col)};cursor:pointer;"></div>`
            ).join('')}
        </div>`;
    }

    // HAND CONTAINER: Thicker custom styled scroll bar + visual card edge clipping alignment
    html += `<style>
        #unoHandScrollWrapper::-webkit-scrollbar { height: 10px; }
        #unoHandScrollWrapper::-webkit-scrollbar-thumb { background: #ffd700; border-radius: 5px; }
        #unoHandScrollWrapper::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); }
    </style>
    <div id="unoHandScrollWrapper" style="display:flex;gap:8px;overflow-x:auto;padding:12px 6px;width:100%;box-sizing:border-box;-webkit-overflow-scrolling:touch;">`;

    hand.forEach((card, i) => {
        const playable = card.color===discard.color || card.value===discard.value || card.color==='Wild';
        const cardTxtLong = card.value.length > 2;
        html += `<div onclick="unoPlayCard(${i})" style="flex-shrink:0;width:56px;height:84px;background:${unoColorClass(card.color)};opacity:${playable?1:0.65};border:2px solid #fff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:${cardTxtLong?'14px':'34px'};color:#fff;font-family:Impact,sans-serif;font-weight:900;box-shadow:0 3px 6px rgba(0,0,0,0.3);cursor:pointer;position:relative;">
            <div style="position:absolute;width:44px;height:28px;background:rgba(255,255,255,0.12);border-radius:50%;transform:rotate(-25deg);"></div>
            <span style="z-index:2;text-shadow:1px 1px 3px rgba(0,0,0,0.5);text-align:center;max-width:100%;overflow:hidden;">${card.value==='Wild'?'★':card.value}</span>
        </div>`;
    });

    // Dummy empty end-anchor card to enforce horizontal overflow visual clipping layout cues
    if(hand.length > 4) {
        html += `<div style="flex-shrink:0;width:24px;height:84px;opacity:0;pointer-events:none;"></div>`;
    }

    html += `</div></div>`;
    gameCanvasContainer.innerHTML = html;
}

window.unoPlayCard = function(idx) {
    const cp = window.unoCurrentPlayer;
    if (window.myPlayerNumber !== cp) return; 
    const card = window.unoHands[cp][idx];
    const discard = window.unoDiscardPile;
    const playable = card.color===discard.color || card.value===discard.value || card.color==='Wild';
    if(!playable) return;

    if (card.color === 'Wild' || card.value === 'Wild' || card.value === '+4') {
        window.unoWildPendingIdx = idx;
        window.unoWildChoosingActive = true;
        renderUnoLayout();
        return;
    }

    window.unoHands[cp].splice(idx, 1);
    window.unoDiscardPile = card;

    const numP = window.unoNumPlayers;
    if (card.value === '⇋') window.unoDirection *= -1;
    let skipNext = (card.value === 'Skip');
    if (card.value === '+2') {
        const nextP = (cp + window.unoDirection + numP) % numP;
        window.unoHands[nextP].push(window.unoDeckState.pop(), window.unoDeckState.pop());
        skipNext = true;
    }

    window.unoCurrentPlayer = (cp + (skipNext ? window.unoDirection * 2 : window.unoDirection) + numP) % numP;
    triggerUnoNetworkSync();
    renderUnoLayout();
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
        const nextP = (cp + window.unoDirection + numP) % numP;
        for(let i=0;i<4;i++) window.unoHands[nextP].push(window.unoDeckState.pop());
        window.unoCurrentPlayer = (cp + (window.unoDirection * 2) + numP) % numP;
    } else {
        window.unoCurrentPlayer = (cp + window.unoDirection + numP) % numP;
    }
    triggerUnoNetworkSync();
    renderUnoLayout();
};

window.unoDrawCard = function() {
    if (window.unoCurrentPlayer !== window.myPlayerNumber) return;
    const cp = window.unoCurrentPlayer;
    window.unoHands[cp].push(window.unoDeckState.pop());
    window.unoCurrentPlayer = (cp + window.unoDirection + window.unoNumPlayers) % window.unoNumPlayers;
    triggerUnoNetworkSync();
    renderUnoLayout();
};

/* ═══════════════════════════════════════════════════════════
   3.  SEQUENCE (COMPACT NO-SCROLL LAYOUT, PRIVATE HIGHLIGHTS)
   ═══════════════════════════════════════════════════════════ */
function initSequenceGame() {
    window.seqBoard    = Array(100).fill(0);
    window.seqTurn     = 1; 
    window.seqSequences = [0, 0];
    window.seqSelectedCardIdx = null;
    
    // Network player auto setup baseline
    window.mySequenceTeam = window.mySequenceTeam !== undefined ? window.mySequenceTeam : 1; 

    const suits = ['♠','♣','♥','♦'];
    const ranks = ['2','3','4','5','6','7','8','9','10','Q','K','A'];
    window.mySequenceHand = [];
    for(let i=0; i<7; i++) {
        let s = suits[Math.floor(Math.random()*suits.length)];
        let r = ranks[Math.floor(Math.random()*ranks.length)];
        window.mySequenceHand.push({ r, s, isRed: (s==='♥'||s==='♦') });
    }
    triggerSequenceNetworkSync();
    renderSequenceBoard();
}

function triggerSequenceNetworkSync() {
    if (typeof channel !== 'undefined') {
        channel.send({
            type: 'broadcast',
            event: 'sequence-sync-state',
            payload: { boardState: window.seqBoard, turnState: window.seqTurn, sequenceScores: window.seqSequences }
        });
    }
}

function renderSequenceBoard() {
    const board = window.seqBoard;
    const turn  = window.seqTurn;
    const sel   = window.seqSelectedCardIdx;

    const boardW = Math.min(window.innerWidth - 20, 320);
    const cellPx = Math.floor(boardW / 10);
    const actualBoardW = cellPx * 10;
    
    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:100%;box-sizing:border-box;">
        <div style="font-size:15px;color:#ffd700;font-family:Impact,sans-serif;">
            TURN: ${turn === 1 ? '🔵 BLUE PLAYER' : '🔴 RED PLAYER'} ${window.mySequenceTeam === turn ? '(YOU)' : ''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(10,${cellPx}px);grid-template-rows:repeat(10,${cellPx}px);gap:1px;background:#111;padding:1px;border:3px solid #ffd700;border-radius:6px;width:${actualBoardW}px;height:${actualBoardW}px;">`;

    for (let i = 0; i < 100; i++) {
        const label = SEQUENCE_MATRIX_GRID[i];
        const token = board[i];
        const isRed = label.includes('♥') || label.includes('♦');
        const num = label.replace(/[♠♣♥♦]/g,'');
        const suit = label.replace(/[^♠♣♥♦]/g,'');

        let tokenMark = '';
        if (token === 1) tokenMark = '<div style="width:75%;height:75%;border-radius:50%;background:#00b0ff;border:2px solid #fff;position:absolute;z-index:2;"></div>';
        if (token === 2) tokenMark = '<div style="width:75%;height:75%;border-radius:50%;background:#e63946;border:2px solid #fff;position:absolute;z-index:2;"></div>';

        // PRIVATE HIGHLIGHT REINSTATED: Gorgeous subtle amber translucent overlay (only visible to you)
        let highlightMarkup = '';
        if (sel !== null && !token && label !== 'FREE') {
            const selectedCardMatch = window.mySequenceHand[sel].r + window.mySequenceHand[sel].s;
            if (label === selectedCardMatch) {
                highlightMarkup = 'background:#fff3cd;box-shadow:inset 0 0 0 2px #ffc107;';
            }
        }

        html += `<div onclick="handleSequenceGridCellTap(${i})" style="position:relative;background:#fff;color:${isRed?'#c00':'#111'};display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid #ddd;box-sizing:border-box;line-height:1;height:${cellPx}px;width:${cellPx}px;${highlightMarkup}">
            ${label==='FREE'?'<span style="color:#ffd700;font-size:14px;">★</span>':`
                <span style="font-size:11px;font-weight:900;margin-top:-2px;">${num}</span>
                <span style="font-size:12px;margin-top:1px;">${suit}</span>
            `}
            ${tokenMark}
        </div>`;
    }

    // Mini subtle unobtrusive indicator dot positioning loop
    const dotClr = window.mySequenceTeam === 1 ? '#00b0ff' : '#e63946';
    html += `</div>
        <div style="display:flex;align-items:center;gap:6px;margin:2px 0;">
            <div style="width:10px;height:10px;border-radius:50%;background:${dotClr};border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>
        </div>
        <div style="display:flex;gap:4px;width:100%;justify-content:center;overflow-x:auto;padding-bottom:2px;">`;

    window.mySequenceHand.forEach((card, idx) => {
        let isHighlighted = (sel === idx) ? 'border:3px solid #ffd700;background:#fff;transform:translateY(-3px);' : 'border:1px solid #777;background:#eee;';
        html += `<button onclick="window.seqSelectedCardIdx=(window.seqSelectedCardIdx===${idx}?null:${idx});renderSequenceBoard();" style="${isHighlighted}border-radius:4px;width:38px;height:52px;font-weight:900;color:${card.isRed?'#c00':'#111'};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0;box-shadow:0 2px 4px rgba(0,0,0,0.2);transition:transform 0.1s;">
            <span style="font-size:12px;font-weight:900;line-height:1;">${card.r}</span>
            <span style="font-size:13px;line-height:1;margin-top:1px;">${card.s}</span>
        </button>`;
    });

    html += `</div></div>`;
    gameCanvasContainer.innerHTML = html;
}

window.handleSequenceGridCellTap = function(idx) {
    if (window.seqTurn !== window.mySequenceTeam) return; 
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
    
    triggerSequenceNetworkSync();
    renderSequenceBoard();
};
/* ============================================================
   CHASER ARCADE ENGINE  –  games.js (PART 2 OF 2)
   ============================================================ */

/* ═══════════════════════════════════════════════════════════
   4.  CREW TRIVIA (20 QUESTIONS SYNC, CUSTOM SELECTOR)
   ═══════════════════════════════════════════════════════════ */
function initTriviaGame() {
    window.triviaQuestionCount = 0;
    window.triviaScorePoints   = 0;
    
    // BEAUTIFUL AESTHETIC DROP-DOWN MATRIX MATCHING THE CHASER SITE THEME
    gameCanvasContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:16px;width:100%;box-sizing:border-box;height:100%;">
            <div style="color:#ffd700;font-size:24px;font-weight:bold;font-family:Impact,sans-serif;text-shadow:2px 2px 4px rgba(0,0,0,0.5);text-align:center;letter-spacing:1px;">SELECT TRIVIA CORE</div>
            
            <div style="position:relative;width:100%;max-width:280px;">
                <select id="triviaCategoryPicker" style="width:100%;padding:14px;font-size:16px;font-weight:900;border-radius:10px;border:3px solid #ffd700;background:#2d6a30;color:#fff;outline:none;box-shadow:0 4px 10px rgba(0,0,0,0.3);appearance:none;text-align:center;cursor:pointer;">
                    <option value="9">General Knowledge Pool</option>
                    <option value="11">Movies & Cinema</option>
                    <option value="12">Music & Tracks</option>
                    <option value="14">Television Shows</option>
                    <option value="17">Science & Nature</option>
                    <option value="23">History Channels</option>
                    <option value="26">Celebrity Pop Culture</option>
                    <option value="21">Sports Arena</option>
                </select>
                <div style="position:absolute;right:14px;top:50%;transform:translateY(-50%);pointer-events:none;color:#ffd700;font-size:16px;">▼</div>
            </div>

            <button onclick="launchLiveTriviaEngine()" style="width:100%;max-width:280px;padding:14px;background:#ffd700;color:#1e4620;font-weight:900;font-size:20px;border:none;border-radius:10px;cursor:pointer;font-family:Impact,sans-serif;box-shadow:0 4px 10px rgba(0,0,0,0.3);margin-top:6px;letter-spacing:1px;">START CAMPAIGN</button>
        </div>`;
}

window.launchLiveTriviaEngine = function() {
    const e = document.getElementById('triviaCategoryPicker');
    const cat = e ? e.value : '9';
    gameCanvasContainer.innerHTML = `<div style="color:white;font-size:18px;font-weight:bold;text-align:center;padding:40px;">Fetching global room questions...</div>`;
    
    fetch(`https://opentdb.com/api.php?amount=1&type=multiple&category=${cat}&cache=${Math.random()}`)
        .then(res => res.json())
        .then(data => {
            if(!data.results || data.results.length === 0) { initTriviaGame(); return; }
            const item = data.results[0];
            
            const decode = s => { let t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
            const questionText = decode(item.question);
            const correctAnswer = decode(item.correct_answer);
            let choices = item.incorrect_answers.map(ans => decode(ans));
            choices.splice(Math.floor(Math.random() * (choices.length + 1)), 0, correctAnswer);

            window.sharedRoomTriviaQuestion = { q: questionText, c: correctAnswer, choices: choices, cat: cat };
            
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

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;padding:4px;box-sizing:border-box;">
        <div style="color:#ffd700;font-size:18px;font-weight:bold;font-family:Impact,sans-serif;letter-spacing:1px;">QUESTION: ${window.triviaQuestionCount + 1}/20 &nbsp;|&nbsp; SCORE: ${window.triviaScorePoints}</div>
        <div style="background:rgba(0,0,0,0.5);padding:14px;border-radius:10px;font-size:22px;color:#fff;font-weight:900;text-align:center;width:100%;box-sizing:border-box;border:2px solid #ffd700;line-height:1.3;text-shadow:1px 1px 2px #000;">${q.q}</div>
        <div style="display:flex;flex-direction:column;gap:8px;width:100%;margin-top:4px;">`;

    q.choices.forEach(choice => {
        html += `<button class="trivia-inline-choice-btn" data-choice="${choice.replace(/"/g, '&quot;')}" style="width:100%;padding:14px;background:#e2f0d9;color:#1e4620;border:none;border-radius:8px;font-weight:900;font-size:16px;text-align:left;cursor:pointer;box-shadow:0 3px 5px rgba(0,0,0,0.25);" onclick="evaluateRoomTriviaClick(this, \`${choice.replace(/'/g, "\\'")}\`)" >${choice}</button>`;
    });
    
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

    // AUTO ADVANCE MECHANIC ROLLS NEXT QUESTION AFTER DELAY UP TO 20 MARKS
    setTimeout(() => {
        if (window.triviaQuestionCount >= 20) {
            gameCanvasContainer.innerHTML = `
                <div style="text-align:center;padding:20px;">
                    <h2 style="color:#ffd700;font-family:Impact;font-size:32px;text-shadow:2px 2px 4px rgba(0,0,0,0.5);">CAMPAIGN COMPLETED</h2>
                    <div style="font-size:48px;font-weight:900;color:white;margin:12px 0;font-family:Impact;">${window.triviaScorePoints} / 20</div>
                    <button onclick="initTriviaGame()" style="padding:14px 28px;font-size:18px;background:#ffd700;color:#1e4620;border:none;border-radius:10px;font-weight:900;cursor:pointer;font-family:Impact,sans-serif;box-shadow:0 4px 8px rgba(0,0,0,0.3);">NEW DEPLOYMENT</button>
                </div>`;
        } else {
            window.launchLiveTriviaEngine();
        }
    }, 1800);
};

/* ═══════════════════════════════════════════════════════════
   5.  SOLITAIRE (GIANT EMBLEMS, MATTE BOLD COLORS, NO SHADOWS)
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
    const screenW = Math.min(window.innerWidth - 24, 340);
    const cardW = Math.floor(screenW / 7.6);
    const cardH = Math.floor(cardW * 1.35); 
    
    let html = `<div style="display:flex;flex-direction:column;gap:10px;width:100%;box-sizing:border-box;padding:2px;user-select:none;">`;
    html += `<div style="display:flex;justify-content:space-between;width:100%;">`;
    
    // Draw pile with clean electric yellow lightning emblem card back
    html += `<div onclick="drawSolitaireCard()" style="width:${cardW}px;height:${cardH}px;border-radius:6px;background:${window.solDeck.length?'linear-gradient(135deg,#111,#2a2a2a)':'rgba(255,255,255,0.05)'};border:2px solid #ffd700;display:flex;align-items:center;justify-content:center;color:#ffd700;font-size:24px;cursor:pointer;box-sizing:border-box;">
        ${window.solDeck.length ? '⚡' : '↻'}
    </div>`;

    const topWaste = window.solWaste[window.solWaste.length - 1];
    let wasteSel = (window.solSelected && window.solSelected.type === 'waste') ? 'outline:3px solid #ffd700;outline-offset:-3px;' : 'border:1px solid #888;';
    
    // SOLID STYLED CORES: Huge color coordinated card center layouts without drop shadows
    html += `<div onclick="selectSolitaireWaste()" style="width:${cardW}px;height:${cardH}px;border-radius:6px;background:${topWaste?'#fff':'rgba(0,0,0,0.2)'};color:${topWaste?.isRed?'#e63946':'#111'};${wasteSel}display:flex;align-items:center;justify-content:center;font-weight:900;font-family:Impact,sans-serif;font-size:24px;cursor:pointer;position:relative;box-sizing:border-box;">
        ${topWaste ? `<span style="font-size:36px;opacity:0.25;position:absolute;">${topWaste.s}</span><span style="z-index:2;">${topWaste.r}</span>` : ''}
    </div>`;

    html += `<div style="flex-grow:1;"></div>`;

    for (let i = 0; i < 4; i++) {
        const fPile = window.solFoundations[i];
        const topF = fPile[fPile.length - 1];
        html += `<div onclick="targetSolitaireFoundation(${i})" style="width:${cardW}px;height:${cardH}px;border-radius:6px;background:${topF?'#fff':'rgba(255,255,255,0.05)'};border:2px dashed rgba(255,215,0,0.3);color:${topF?.isRed?'#e63946':'#111'};display:flex;align-items:center;justify-content:center;font-weight:900;font-family:Impact,sans-serif;font-size:24px;cursor:pointer;position:relative;box-sizing:border-box;">
            ${topF ? `<span style="font-size:36px;opacity:0.25;position:absolute;">${topF.s}</span><span style="z-index:2;">${topF.r}</span>` : '<span style="color:rgba(255,255,255,0.15);font-size:16px;">A</span>'}
        </div>`;
    }
    html += `</div>`; 

    html += `<div style="display:flex;width:100%;justify-content:space-between;align-items:flex-start;min-height:260px;padding-bottom:12px;">`;
    for (let c = 0; c < 7; c++) {
        const colCards = window.solTableau[c];
        html += `<div onclick="targetSolitaireColumn(${c})" style="display:flex;flex-direction:column;width:${cardW}px;min-height:${cardH}px;border-radius:6px;background:${colCards.length?'transparent':'rgba(255,255,255,0.02)'};position:relative;">`;
        
        colCards.forEach((card, idx) => {
            const isSel = (window.solSelected && window.solSelected.type === 'tableau' && window.solSelected.col === c && window.solSelected.idx === idx);
            let style = `width:100%;height:${cardH}px;border-radius:6px;position:${idx===0?'relative':'absolute'};margin-top:${idx * 18}px;box-sizing:border-box;`;
            
            if (!card.open) {
                html += `<div style="${style}background:linear-gradient(135deg,#111,#2a2a2a);border:1px solid #ffd700;display:flex;align-items:center;justify-content:center;color:#ffd700;font-size:16px;">⚡</div>`;
            } else {
                let cardBorder = isSel ? 'outline:3px solid #ffd700;outline-offset:-3px;' : 'border:1px solid #888;';
                html += `<div onclick="event.stopPropagation(); selectSolitaireCard(${c}, ${idx})" style="${style}background:#fff;color:${card.isRed?'#e63946':'#111'};${cardBorder}display:flex;align-items:center;justify-content:center;font-weight:900;font-family:Impact,sans-serif;font-size:24px;cursor:pointer;position:relative;">
                    <span style="font-size:40px;opacity:0.22;position:absolute;z-index:1;">${card.s}</span>
                    <span style="z-index:2;">${card.r}</span>
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
            gameCanvasContainer.innerHTML = `<div style="text-align:center;padding:20px;color:#ffd700;font-family:Impact;font-size:32px;">👑 SOLITAIRE VICTORY!</div>`;
        }, 300);
    }
}

/* ═══════════════════════════════════════════════════════════
   6.  HANGMAN (SHRUNK COMPACT OVERVIEW, LOWERED SCAFFOLD POLE)
   ═══════════════════════════════════════════════════════════ */
const HANGMAN_DICTIONARY_POOL = ['CHASER','UNICYCLE','ADVENTURE','JOURNEY','HIGHWAY','VELOCITY','NAVIGATOR','COMPASS','HORIZON','PASSPORT','WANDERER','ROUTING','POSTAL','BATTERY','SURVIVAL','FLOORING'];

function initHangmanGame() {
    const targetWord = HANGMAN_DICTIONARY_POOL[Math.floor(Math.random() * HANGMAN_DICTIONARY_POOL.length)];
    window.hangmanState = { word: targetWord, guessed: [], wrong: 0, maxWrong: 6, dying: false };
    renderHangmanGame();
}

function buildHangmanSVG(wrong, dying) {
    const bodyColor = dying ? '#dc3545' : '#e2f0d9';
    const shake     = dying ? 'style="animation:hangShake 0.5s ease-in-out 3"' : '';
    const p = { head: wrong>=1, body: wrong>=2, leftA: wrong>=3, rightA: wrong>=4, leftL: wrong>=5, rightL: wrong>=6 };
    
    // SCAFFOLD MOVED DOWN: Lowered heights and modified viewBox to fit safely below headers
    return `<svg viewBox="0 0 120 130" width="120" height="130" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
        <style>@keyframes hangShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}</style>
        <line x1="15" y1="125" x2="105" y2="125" stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>
        <line x1="35" y1="125" x2="35"  y2="10"  stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>
        <line x1="35" y1="10"  x2="80"  y2="10"  stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>
        <line x1="80" y1="10"  x2="80"  y2="26"  stroke="#ffd700" stroke-width="3" stroke-linecap="round"/>
        <g ${shake} transform-origin="80 34">
            ${p.head?`<circle cx="80" cy="34" r="10" stroke="${bodyColor}" stroke-width="3" fill="none"/>`:'' }
            ${p.head&&dying?`<text x="73" y="38" font-size="11" font-weight="bold" fill="${bodyColor}">xx</text>`
              :p.head?`<circle cx="77" cy="31" r="1.5" fill="${bodyColor}"/><circle cx="83" cy="31" r="1.5" fill="${bodyColor}"/><path d="M76 39 Q80 42 84 39" stroke="${bodyColor}" stroke-width="1.5" fill="none"/>`:'' }
            ${p.body  ?`<line x1="80" y1="44" x2="80" y2="82" stroke="${bodyColor}" stroke-width="3" stroke-linecap="round"/>`:'' }
            ${p.leftA ?`<line x1="80" y1="52" x2="60" y2="68" stroke="${bodyColor}" stroke-width="3" stroke-linecap="round"/>`:'' }
            ${p.rightA?`<line x1="80" y1="52" x2="100" y2="68" stroke="${bodyColor}" stroke-width="3" stroke-linecap="round"/>`:'' }
            ${p.leftL ?`<line x1="80" y1="82" x2="64" y2="106" stroke="${bodyColor}" stroke-width="3" stroke-linecap="round"/>`:'' }
            ${p.rightL?`<line x1="80" y1="82" x2="96" y2="106" stroke="${bodyColor}" stroke-width="3" stroke-linecap="round"/>`:'' }
        </g>
    </svg>`;
}

function renderHangmanGame() {
    const state = window.hangmanState;
    if(!state || !state.word) return;
    
    let isWin = state.word.split('').every(l => state.guessed.includes(l));
    let isLose = state.wrong >= state.maxWrong;

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;box-sizing:border-box;justify-content:space-between;">`;
    html += `<div style="width:100%;max-height:130px;overflow:hidden;">${buildHangmanSVG(state.wrong, state.dying || isLose)}</div>`;

    // BLOWN UP DASHES: Highly visible letter slots centered on screen
    html += `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:6px 0;">`;
    state.word.split('').forEach(letter => {
        const revealed = state.guessed.includes(letter) || isLose;
        html += `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
            <div style="font-size:28px;font-weight:900;color:${revealed?(isLose && !state.guessed.includes(letter)?'#dc3545':'#ffd700'):'transparent'};min-width:24px;text-align:center;font-family:Impact,sans-serif;line-height:1;">${letter}</div>
            <div style="width:24px;height:4px;background:#e2f0d9;border-radius:2px;"></div>
        </div>`;
    });
    html += `</div>`;

    if (isWin) {
        html += `<div style="color:#00b050;font-size:20px;font-weight:bold;text-align:center;">🎉 YOU GOT IT!</div>
            <button onclick="initHangmanGame()" style="background:#ffd700;color:#1e4620;border:none;border-radius:6px;padding:10px 24px;font-size:16px;font-weight:900;cursor:pointer;margin-top:4px;">NEW GAME</button>`;
    } else if (isLose) {
        html += `<div style="color:#dc3545;font-size:18px;font-weight:bold;text-align:center;">💀 GAME OVER</div>
            <button onclick="initHangmanGame()" style="background:#ffd700;color:#1e4620;border:none;border-radius:6px;padding:10px 24px;font-size:16px;font-weight:900;cursor:pointer;margin-top:4px;">RETRY</button>`;
    } else {
        // DOCKED INPUT INTERFACE: Placed firmly at the base with large key text sizes
        html += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;width:100%;max-width:320px;padding:4px 0;">`;
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
            const used = state.guessed.includes(letter);
            const isWrong = used && !state.word.includes(letter);
            const isRight = used && state.word.includes(letter);
            html += `<button onclick="handleHangmanClick('${letter}')" ${used?'disabled':''}
                style="width:100%;height:36px;border-radius:5px;border:none;font-weight:900;font-size:16px;
                cursor:${used?'default':'pointer'};
                background:${isWrong?'#dc3545':isRight?'#00b050':'#e2f0d9'};
                color:${used?'white':'#1e4620'};opacity:${used?0.4:1};box-shadow:0 2px 4px rgba(0,0,0,0.2);font-family:Impact,sans-serif;">
                ${letter}
            </button>`;
        });
        html += `</div>`;
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
