/* ============================================================
   CHASER ARCADE ENGINE  –  games.js  PART 1 of 2
   Paste this first, then paste Part 2 immediately below.
   ============================================================ */

/* ── Multiplayer sync handlers ───────────────────────────── */
window.handleIncomingCheckersSync = (p) => {
    window.syncCheckersBoard      = p.boardState;
    window.checkersTurn           = p.activeTurn;
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
    window.seqBoard     = p.boardState;
    window.seqTurn      = p.turnState;
    window.seqSequences = p.sequenceScores;
    if (activeGameStage.classList.contains('open') && activeGameLabelTitle.innerText.includes('Sequence')) renderSequenceBoard();
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
    gameCanvasContainer.innerHTML   = '';
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
        if ((r + c) % 2 === 1) { if (r < 3) return 1; if (r > 4) return 2; }
        return 0;
    });
    window.checkersTurn           = 1;
    window.selectedCheckerIdx     = null;
    window.consecutiveJumpsActive = false;
    renderCheckersGrid();
}

function renderCheckersGrid() {
    const board  = window.syncCheckersBoard;
    const sel    = window.selectedCheckerIdx;
    const turn   = window.checkersTurn;
    const boardPx = Math.min(330, Math.floor((window.innerWidth - 32) * 0.95));
    const cellPx  = Math.floor(boardPx / 8);
    const piecePx = Math.floor(cellPx * 0.80);

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;padding:4px;box-sizing:border-box;">
        <div style="color:#ffd700;font-weight:bold;font-size:16px;margin-bottom:2px;font-family:Impact,sans-serif;">
            ${turn === 1 ? '🔴 RED TEAM TURN' : '⚫ BLACK TEAM TURN'}${window.consecutiveJumpsActive ? ' — DOUBLE JUMP!' : ''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(8,${cellPx}px);grid-template-rows:repeat(8,${cellPx}px);border:4px solid #ffd700;border-radius:8px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.5);">`;

    for (let i = 0; i < 64; i++) {
        const r = Math.floor(i / 8), c = i % 8;
        const isDark  = (r + c) % 2 === 1;
        const piece   = board[i];
        const bgColor = isDark ? '#2d6a30' : '#e2f0d9';
        let pieceHtml = '';
        if (piece === 1) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff6b6b,#c00);border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>`;
        if (piece === 2) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#555,#111);border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>`;
        if (piece === 3) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff6b6b,#c00);border:3px solid #ffd700;display:flex;align-items:center;justify-content:center;font-size:${Math.floor(cellPx*0.4)}px;">👑</div>`;
        if (piece === 4) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#555,#111);border:3px solid #ffd700;display:flex;align-items:center;justify-content:center;font-size:${Math.floor(cellPx*0.4)}px;">👑</div>`;
        html += `<div onclick="handleCheckerTap(${i})" style="width:${cellPx}px;height:${cellPx}px;background:${bgColor};display:flex;align-items:center;justify-content:center;cursor:pointer;box-sizing:border-box;${sel===i?'outline:4px solid #ffd700;outline-offset:-4px;':''}">
            ${pieceHtml}
        </div>`;
    }
    html += `</div></div>`;
    gameCanvasContainer.innerHTML = html;
}

function getCheckerMoves(idx, board, turn, jumpOnly) {
    const piece = board[idx]; if (!piece) return [];
    const isRed = piece===1||piece===3, isKing = piece===3||piece===4;
    const enemy = isRed ? [2,4] : [1,3];
    const r = Math.floor(idx/8), c = idx%8, dirs = [];
    if (!isRed||isKing) dirs.push([-1,-1],[-1,1]);
    if (isRed||isKing)  dirs.push([1,-1],[1,1]);
    const moves = [];
    dirs.forEach(([dr,dc]) => {
        const nr=r+dr,nc=c+dc,ni=nr*8+nc;
        if (nr<0||nr>7||nc<0||nc>7) return;
        if (!board[ni]&&!jumpOnly) { moves.push(ni); return; }
        if (enemy.includes(board[ni])) { const jr=nr+dr,jc=nc+dc,ji=jr*8+jc; if (jr>=0&&jr<=7&&jc>=0&&jc<=7&&!board[ji]) moves.push(ji); }
    });
    return moves;
}

window.handleCheckerTap = function (idx) {
    const board=window.syncCheckersBoard, turn=window.checkersTurn, piece=board[idx], owned=turn===1?[1,3]:[2,4];
    if (window.selectedCheckerIdx===null) {
        if (owned.includes(piece)) { if (window.consecutiveJumpsActive&&idx!==window.lastJumpDestinationIdx) return; window.selectedCheckerIdx=idx; renderCheckersGrid(); }
        return;
    }
    const from=window.selectedCheckerIdx, moves=getCheckerMoves(from,board,turn,window.consecutiveJumpsActive);
    if (!moves.includes(idx)) {
        if (owned.includes(piece)&&!window.consecutiveJumpsActive) { window.selectedCheckerIdx=idx; renderCheckersGrid(); }
        else if (!window.consecutiveJumpsActive) { window.selectedCheckerIdx=null; renderCheckersGrid(); }
        return;
    }
    const isJump=Math.abs(idx-from)>10;
    board[idx]=board[from]; board[from]=0;
    if (isJump) board[Math.floor((from+idx)/2)]=0;
    const destRow=Math.floor(idx/8);
    if (board[idx]===1&&destRow===7) board[idx]=3;
    if (board[idx]===2&&destRow===0) board[idx]=4;
    let hasMore=false;
    if (isJump) { const extra=getCheckerMoves(idx,board,turn,true); if (extra.length>0) { hasMore=true; window.consecutiveJumpsActive=true; window.lastJumpDestinationIdx=idx; window.selectedCheckerIdx=idx; } }
    if (!hasMore) { window.selectedCheckerIdx=null; window.consecutiveJumpsActive=false; window.checkersTurn=turn===1?2:1; }
    if (typeof channel!=='undefined') channel.send({type:'broadcast',event:'checkers-sync-move',payload:{boardState:board,activeTurn:window.checkersTurn,consecutiveActive:window.consecutiveJumpsActive}});
    renderCheckersGrid();
};

/* ═══════════════════════════════════════════════════════════
   2.  UNO  — official deck, locked turns, scrollable hand
   ═══════════════════════════════════════════════════════════ */
function initChaserUnoGame() {
    gameCanvasContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;width:100%;box-sizing:border-box;">
            <div style="color:#ffd700;font-size:22px;font-weight:900;font-family:Impact,sans-serif;">SELECT PLAYERS</div>
            <div style="display:flex;gap:14px;">
                ${[2,3,4].map(n=>`<button onclick="unoStartWithRoomCount(${n})" style="width:58px;height:58px;border-radius:12px;border:3px solid #ffd700;background:#2d6a30;color:#ffd700;font-size:26px;font-weight:900;cursor:pointer;">${n}</button>`).join('')}
            </div>
            <div style="color:#a3cfbb;font-size:13px;text-align:center;font-weight:bold;">Pass the device between players each turn</div>
        </div>`;
}

window.unoStartWithRoomCount = function(numPlayers) {
    const colors = ['Red','Yellow','Green','Blue'];
    window.unoDeckState = [];
    colors.forEach(c => {
        window.unoDeckState.push({color:c,value:'0'});
        ['1','2','3','4','5','6','7','8','9','Skip','⇋','+2'].forEach(v => {
            window.unoDeckState.push({color:c,value:v});
            window.unoDeckState.push({color:c,value:v});
        });
    });
    for(let i=0;i<4;i++) { window.unoDeckState.push({color:'Wild',value:'Wild'}); window.unoDeckState.push({color:'Wild',value:'+4'}); }
    window.unoDeckState.sort(()=>Math.random()-0.5);
    window.unoNumPlayers         = numPlayers;
    window.unoCurrentPlayer      = 0;
    window.unoDirection          = 1;
    window.unoWildChoosingActive = false;
    window.unoWildPendingIdx     = null;
    window.unoHands = [];
    for(let p=0;p<numPlayers;p++) { window.unoHands.push([]); for(let i=0;i<7;i++) window.unoHands[p].push(window.unoDeckState.pop()); }
    let startCard;
    do { startCard=window.unoDeckState.pop(); } while(startCard.value==='Wild'||startCard.value==='+4');
    window.unoDiscardPile = startCard;
    triggerUnoNetworkSync();
    renderUnoLayout();
};

function triggerUnoNetworkSync() {
    if (typeof channel!=='undefined') channel.send({type:'broadcast',event:'uno-sync-discard',payload:{currentDiscard:window.unoDiscardPile,turn:window.unoCurrentPlayer,hands:window.unoHands,deck:window.unoDeckState,direction:window.unoDirection}});
}

function unoColorClass(color) {
    return {Red:'uno-card-red',Yellow:'uno-card-yellow',Green:'uno-card-green',Blue:'uno-card-blue',Wild:'uno-card-wild'}[color]||'uno-card-wild';
}

/* Label for card face — Skip is smaller so it fits */
function unoFaceLabel(value) {
    if (value==='Wild') return '★';
    return value; // +2, +4, ⇋, Skip, 0-9 all render as-is
}

function renderUnoLayout() {
    const discard = window.unoDiscardPile;
    const cp      = window.unoCurrentPlayer;
    const hand    = window.unoHands[cp] || [];

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:4px;width:100%;box-sizing:border-box;">`;
    html += `<div style="background:#2d6a30;border-radius:6px;padding:4px 16px;color:#ffd700;font-size:16px;font-weight:900;font-family:Impact,sans-serif;">🎴 PLAYER ${cp+1} TURN</div>`;

    html += `<div style="display:flex;gap:24px;align-items:flex-end;margin-top:2px;">`;

    /* Draw pile — dark card, white UNO text, yellow border */
    html += `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
        <div style="color:#a3cfbb;font-size:11px;font-weight:bold;">DRAW</div>
        <div onclick="unoDrawCard()" class="uno-card-body" style="background:linear-gradient(135deg,#1a1a1a,#3a3a3a);border:3px solid #ffd700;cursor:pointer;width:58px;height:86px;overflow:hidden;">
            <div class="uno-oval-center" style="background:rgba(255,255,255,0.08);"></div>
            <div class="uno-number-label" style="font-size:18px;font-weight:900;font-style:italic;color:#ffffff;transform:rotate(-20deg);font-family:Impact,sans-serif;text-shadow:1px 1px 3px rgba(0,0,0,0.8);">UNO</div>
        </div>
    </div>`;

    /* Play pile — large face, nothing overflows */
    const discardFontSize = (discard.value==='Skip'||discard.value==='+2'||discard.value==='+4') ? '22px' : '36px';
    html += `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
        <div style="color:#a3cfbb;font-size:11px;font-weight:bold;">PLAY</div>
        <div class="uno-card-body ${unoColorClass(discard.color)}" style="pointer-events:none;width:58px;height:86px;overflow:hidden;">
            <div class="uno-oval-center"></div>
            <div class="uno-number-label" style="font-size:${discardFontSize};text-shadow:2px 2px 0 rgba(0,0,0,0.4);max-width:52px;text-align:center;overflow:hidden;">${unoFaceLabel(discard.value)}</div>
        </div>
    </div>`;

    html += `</div>`; // end piles row

    /* Wild color picker — four-quadrant */
    if (window.unoWildChoosingActive) {
        html += `<div style="display:grid;grid-template-columns:1fr 1fr;width:90px;height:90px;border-radius:10px;overflow:hidden;border:3px solid #fff;margin:4px 0;">
            ${['Red','Yellow','Green','Blue'].map(col=>`<div onclick="unoPickWildColor('${col}')" style="background:${{Red:'#c00',Yellow:'#ffb703',Green:'#00b050',Blue:'#00b0ff'}[col]};cursor:pointer;"></div>`).join('')}
        </div>`;
    }

    /* Other players card counts */
    if (window.unoNumPlayers > 1) {
        html += `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">`;
        for (let p=0;p<window.unoNumPlayers;p++) {
            if (p===cp) continue;
            html += `<div style="background:rgba(255,255,255,0.1);border-radius:6px;padding:3px 9px;color:#e2f0d9;font-size:11px;font-weight:bold;">P${p+1}: ${window.unoHands[p].length} cards</div>`;
        }
        html += `</div>`;
    }

    /* Hand — single scrollable row, unplayable cards at 0.65 opacity (not 0.35) */
    html += `<div style="color:#e2f0d9;font-size:11px;font-weight:bold;align-self:flex-start;padding-left:4px;">Player ${cp+1}'s Hand</div>
    <div style="display:flex;gap:6px;overflow-x:auto;padding:8px 4px 10px 4px;width:100%;box-sizing:border-box;-webkit-overflow-scrolling:touch;" id="unoHandScrollWrapper">`;

    hand.forEach((card,i) => {
        const playable = card.color===discard.color||card.value===discard.value||card.color==='Wild';
        const cardFontSize = (card.value==='Skip'||card.value==='+2'||card.value==='+4') ? '20px' : '34px';
        html += `<div onclick="unoPlayCard(${i})" class="uno-card-body ${unoColorClass(card.color)}"
            style="flex-shrink:0;width:52px;height:78px;font-size:${cardFontSize};overflow:hidden;
            opacity:${playable?1:0.65};cursor:pointer;transform:${playable?'translateY(-4px)':'none'};transition:transform 0.15s;">
            <div class="uno-oval-center"></div>
            <div class="uno-number-label" style="max-width:46px;text-align:center;overflow:hidden;text-shadow:2px 2px 0 rgba(0,0,0,0.4);">${unoFaceLabel(card.value)}</div>
        </div>`;
    });

    html += `</div></div>`;
    gameCanvasContainer.innerHTML = html;
    setTimeout(()=>{ const el=document.getElementById('unoHandScrollWrapper'); if(el) el.scrollTo({left:el.scrollWidth,behavior:'smooth'}); },100);
}

window.unoPlayCard = function(idx) {
    const cp=window.unoCurrentPlayer, card=window.unoHands[cp][idx], discard=window.unoDiscardPile;
    const playable=card.color===discard.color||card.value===discard.value||card.color==='Wild';
    if (!playable||window.unoWildChoosingActive) return;
    if (card.color==='Wild'||card.value==='+4') { window.unoWildPendingIdx=idx; window.unoWildChoosingActive=true; renderUnoLayout(); return; }
    window.unoHands[cp].splice(idx,1);
    window.unoDiscardPile=card;
    const numP=window.unoNumPlayers;
    let skipNext=false;
    if (card.value==='⇋') { window.unoDirection*=-1; if(numP===2) skipNext=true; }
    if (card.value==='Skip') skipNext=true;
    if (card.value==='+2') { const t=(cp+window.unoDirection+numP)%numP; window.unoHands[t].push(window.unoDeckState.pop(),window.unoDeckState.pop()); skipNext=true; }
    window.unoCurrentPlayer=(cp+(skipNext?window.unoDirection*2:window.unoDirection)+numP)%numP;
    if (!window.unoHands[cp].length) { gameCanvasContainer.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;height:100%;padding:20px;text-align:center;"><div style="font-size:52px;">🎉</div><div style="color:#ffd700;font-size:26px;font-weight:900;">Player ${cp+1} wins!</div><button onclick="initChaserUnoGame()" style="background:#2d6a30;color:white;border:none;border-radius:8px;padding:12px 28px;font-size:15px;font-weight:bold;cursor:pointer;">Play Again</button></div>`; return; }
    triggerUnoNetworkSync();
    if (numP>1) showUnoPassScreen(); else renderUnoLayout();
};

window.unoPickWildColor = function(color) {
    const cp=window.unoCurrentPlayer, idx=window.unoWildPendingIdx, wasD4=window.unoHands[cp][idx].value==='+4';
    window.unoHands[cp].splice(idx,1);
    window.unoDiscardPile={color,value:wasD4?'+4':'Wild'};
    window.unoWildChoosingActive=false;
    const numP=window.unoNumPlayers;
    if (wasD4) { const t=(cp+window.unoDirection+numP)%numP; for(let i=0;i<4;i++) window.unoHands[t].push(window.unoDeckState.pop()); window.unoCurrentPlayer=(cp+window.unoDirection*2+numP)%numP; }
    else { window.unoCurrentPlayer=(cp+window.unoDirection+numP)%numP; }
    triggerUnoNetworkSync();
    if (numP>1) showUnoPassScreen(); else renderUnoLayout();
};

window.unoDrawCard = function() {
    const cp=window.unoCurrentPlayer, numP=window.unoNumPlayers;
    window.unoHands[cp].push(window.unoDeckState.pop());
    window.unoCurrentPlayer=(cp+window.unoDirection+numP)%numP;
    triggerUnoNetworkSync();
    if (numP>1) showUnoPassScreen(); else renderUnoLayout();
};

function showUnoPassScreen() {
    const next=window.unoCurrentPlayer;
    gameCanvasContainer.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;height:100%;padding:20px;text-align:center;">
        <div style="font-size:40px;">📱</div>
        <div style="color:#ffd700;font-size:18px;font-weight:900;">Pass to Player ${next+1}</div>
        <div style="color:#a3cfbb;font-size:12px;">Only Player ${next+1} should tap below</div>
        <button onclick="renderUnoLayout()" style="background:#2d6a30;color:white;border:none;border-radius:8px;padding:14px 32px;font-size:16px;font-weight:bold;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
            I'm Player ${next+1} — Show My Hand
        </button>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════
   3.  SEQUENCE  — two-player enforced, per-player hands,
                   subtle highlight, corner-label cards
   ═══════════════════════════════════════════════════════════ */
const SEQ_GRID = [
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

const SEQ_IS_RED = (label) => label.includes('♥')||label.includes('♦');

function buildSeqHandDeck() {
    const suits=['♠','♣','♥','♦'], ranks=['2','3','4','5','6','7','8','9','10','Q','K','A'];
    const deck=[];
    suits.forEach(s=>ranks.forEach(r=>{ deck.push(r+s); deck.push(r+s); }));
    return deck.sort(()=>Math.random()-0.5);
}

function initSequenceGame() {
    window.seqBoard         = Array(100).fill(0);
    window.seqTurn          = 1; // 1=blue, 2=green
    window.seqSequences     = [0,0];
    window.seqDeck          = buildSeqHandDeck();
    // Each player has their own private hand
    window.seqHands         = {
        1: Array(7).fill(0).map(()=>window.seqDeck.pop()),
        2: Array(7).fill(0).map(()=>window.seqDeck.pop())
    };
    window.seqSelectedCard  = null;
    // Show pass screen immediately so P2 doesn't see P1's hand
    renderSeqPassScreen();
}

function renderSeqPassScreen() {
    const turn=window.seqTurn;
    const color=turn===1?'#1a6fd4':'#2d8c3c';
    const name =turn===1?'Blue':'Green';
    gameCanvasContainer.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;height:100%;padding:20px;text-align:center;">
        <div style="font-size:36px;">📱</div>
        <div style="color:#ffd700;font-size:18px;font-weight:900;">Pass to ${name} Player</div>
        <button onclick="renderSequenceBoard()" style="background:${color};color:white;border:none;border-radius:8px;padding:14px 32px;font-size:16px;font-weight:bold;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
            I'm ${name} — Show My Hand
        </button>
    </div>`;
}

function triggerSequenceNetworkSync() {
    if (typeof channel!=='undefined') channel.send({type:'broadcast',event:'sequence-sync-state',payload:{boardState:window.seqBoard,turnState:window.seqTurn,sequenceScores:window.seqSequences}});
}

function renderSequenceBoard() {
    const board=window.seqBoard, turn=window.seqTurn, sel=window.seqSelectedCard;
    const hand=window.seqHands[turn];
    const boardW=Math.min(window.innerWidth-20,340);
    const cellPx=Math.floor(boardW/10);
    const chipColor=turn===1?'#1a6fd4':'#2d8c3c';
    const teamName =turn===1?'🔵 Blue':'🟢 Green';

    let html=`<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:100%;box-sizing:border-box;padding:2px;">`;
    html+=`<div style="display:flex;gap:10px;align-items:center;">
        <div style="background:${chipColor};color:white;border-radius:6px;padding:3px 12px;font-size:13px;font-weight:900;">${teamName}'s Turn</div>
        <div style="color:#e2f0d9;font-size:10px;">🔵 ${window.seqSequences[0]} 🟢 ${window.seqSequences[1]}</div>
    </div>`;

    html+=`<div style="display:grid;grid-template-columns:repeat(10,${cellPx}px);grid-template-rows:repeat(10,${cellPx}px);border:2px solid #ffd700;border-radius:4px;overflow:hidden;flex-shrink:0;">`;

    for(let i=0;i<100;i++){
        const label=SEQ_GRID[i], isFree=label==='FREE', chip=board[i], isRed=SEQ_IS_RED(label);
        const cardMatch=sel!==null&&!chip&&!isFree&&hand[sel]===label;
        // Subtle golden highlight — light, not dark
        const highlight=cardMatch?'box-shadow:inset 0 0 0 2px rgba(255,215,0,0.55);background:rgba(255,215,0,0.18);':'';
        let bg=isFree?'#1e4620':chip===1?'#1a6fd4':chip===2?'#2d8c3c':chip===3?'#2d6a30':'#f5f5f5';
        const borderR=i%10!==9?'border-right:1px solid rgba(0,0,0,0.1);':'';

        // Corner-label layout: rank top-left, suit bottom-right
        let inner='';
        if(isFree||chip===3) inner=`<span style="color:#ffd700;font-size:${cellPx<=28?7:8}px;">★</span>`;
        else if(chip===1||chip===2){
            const chipC=chip===1?'#6ab0ff':'#7dcc8a', chipDark=chip===1?'#1a6fd4':'#2d8c3c';
            inner=`<div style="width:${Math.floor(cellPx*0.72)}px;height:${Math.floor(cellPx*0.72)}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,${chipC},${chipDark});border:1px solid #fff;flex-shrink:0;"></div>`;
        } else {
            const num=label.replace(/[♠♣♥♦]/g,''), suit=label.replace(/[^♠♣♥♦]/g,''), fs=cellPx<=28?6:7;
            const col=isRed?'#c00':'#111';
            // Rank top-left, suit bottom-right — fits in small cell
            inner=`<div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:1px;box-sizing:border-box;">
                <span style="font-size:${fs+1}px;font-weight:900;color:${col};line-height:1;align-self:flex-start;">${num}</span>
                <span style="font-size:${fs+2}px;color:${col};line-height:1;align-self:flex-end;">${suit}</span>
            </div>`;
        }

        html+=`<div onclick="handleSeqCellTap(${i})" style="width:${cellPx}px;height:${cellPx}px;background:${bg};display:flex;align-items:center;justify-content:center;cursor:pointer;box-sizing:border-box;${borderR}${highlight}">
            ${inner}
        </div>`;
    }
    html+=`</div>`;

    // Small color dot next to hand — no "your hand" text
    html+=`<div style="display:flex;align-items:center;gap:5px;align-self:flex-start;padding-left:3px;">
        <div style="width:8px;height:8px;border-radius:50%;background:${chipColor};border:1px solid #fff;flex-shrink:0;"></div>
    </div>`;

    // Hand — all 7 cards in one row, no wrap
    html+=`<div style="display:flex;gap:4px;overflow-x:auto;padding:3px 2px 6px 2px;width:100%;box-sizing:border-box;flex-wrap:nowrap;">`;
    hand.forEach((card,i)=>{
        const red=SEQ_IS_RED(card), num=card.replace(/[♠♣♥♦]/g,''), suit=card.replace(/[^♠♣♥♦]/g,'');
        html+=`<div onclick="selectSeqCard(${i})" style="
            flex-shrink:0;background:white;
            border:${sel===i?'3px solid #ffd700':'2px solid #888'};
            border-radius:6px;padding:4px 5px;cursor:pointer;
            box-shadow:${sel===i?'0 0 8px rgba(255,215,0,0.7)':'0 1px 4px rgba(0,0,0,0.2)'};
            display:flex;flex-direction:column;align-items:center;line-height:1.15;min-width:26px;">
            <span style="font-size:13px;font-weight:900;color:${red?'#c00':'#111'};">${num}</span>
            <span style="font-size:15px;color:${red?'#c00':'#111'};">${suit}</span>
        </div>`;
    });
    html+=`</div></div>`;
    gameCanvasContainer.innerHTML=html;
}

window.selectSeqCard=function(i){ window.seqSelectedCard=window.seqSelectedCard===i?null:i; renderSequenceBoard(); };

window.handleSeqCellTap=function(i){
    const sel=window.seqSelectedCard; if(sel===null) return;
    const board=window.seqBoard, turn=window.seqTurn, hand=window.seqHands[turn], label=SEQ_GRID[i];
    if(label==='FREE'||board[i]) return;
    if(hand[sel]!==label) return;
    board[i]=turn;
    hand.splice(sel,1);
    if(window.seqDeck.length) hand.push(window.seqDeck.pop());
    window.seqSelectedCard=null;
    // Check win
    const lines=[], b=board;
    for(let r=0;r<10;r++){const row=[];for(let c=0;c<10;c++)row.push(r*10+c);lines.push(row);}
    for(let c=0;c<10;c++){const col=[];for(let r=0;r<10;r++)col.push(r*10+c);lines.push(col);}
    for(let s=0;s<6;s++){const d1=[],d2=[];for(let i=0;i+s<10;i++){d1.push((i+s)*10+i);d2.push(i*10+(i+s));}if(d1.length>=5)lines.push(d1);if(s>0&&d2.length>=5)lines.push(d2);}
    let seq1=0,seq2=0;
    lines.forEach(line=>{for(let s=0;s<=line.length-5;s++){const sl=line.slice(s,s+5).map(x=>b[x]);if(sl.every(v=>v===1||v===3))seq1++;if(sl.every(v=>v===2||v===3))seq2++;}});
    window.seqSequences=[seq1,seq2];
    triggerSequenceNetworkSync();
    if(seq1>=2||seq2>=2){
        const w=seq1>=2?'🔵 Blue':'🟢 Green';
        gameCanvasContainer.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;height:100%;padding:20px;text-align:center;">
            <div style="font-size:52px;">🏆</div>
            <div style="color:#ffd700;font-size:24px;font-weight:900;">${w} wins!</div>
            <button onclick="initSequenceGame()" style="background:#2d6a30;color:white;border:none;border-radius:8px;padding:12px 28px;font-size:15px;font-weight:bold;cursor:pointer;">Play Again</button>
        </div>`;
        return;
    }
    window.seqTurn=turn===1?2:1;
    renderSeqPassScreen();
   
};/* ============================================================
   CHASER ARCADE ENGINE  –  games.js  PART 2 of 2
   Paste this immediately below Part 1.
   ============================================================ */

/* ═══════════════════════════════════════════════════════════
   4.  CREW TRIVIA  — batch fetch, no reset bug, bigger font
   ═══════════════════════════════════════════════════════════ */
function initTriviaGame() {
    window.triviaQuestionCount = 0;
    window.triviaScorePoints   = 0;
    window.triviaBatch         = null;

    gameCanvasContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:20px;width:100%;box-sizing:border-box;height:100%;">
            <div style="color:#ffd700;font-size:28px;font-weight:bold;font-family:Impact,sans-serif;text-align:center;">TRIVIA CATEGORY</div>
            <div style="position:relative;width:100%;max-width:280px;">
                <select id="triviaCategoryPicker" style="width:100%;padding:16px;font-size:18px;font-weight:900;border-radius:12px;border:3px solid #ffd700;background:#2d6a30;color:#fff;outline:none;box-shadow:0 6px 15px rgba(0,0,0,0.4);appearance:none;text-align:center;cursor:pointer;">
                    <option value="9">Mixed Bag (General)</option>
                    <option value="11">Movies &amp; Cinema</option>
                    <option value="12">Music &amp; Tracks</option>
                    <option value="14">Television Shows</option>
                    <option value="15">Video Games</option>
                    <option value="17">Science &amp; Nature</option>
                    <option value="22">Geography</option>
                    <option value="23">History</option>
                    <option value="26">Pop Culture</option>
                    <option value="21">Sports</option>
                </select>
                <div style="position:absolute;right:16px;top:50%;transform:translateY(-50%);pointer-events:none;color:#ffd700;font-size:20px;">▼</div>
            </div>
            <button onclick="launchLiveTriviaEngine()" style="width:100%;max-width:280px;padding:16px;background:#ffd700;color:#1e4620;font-weight:900;font-size:22px;border:none;border-radius:12px;cursor:pointer;font-family:Impact,sans-serif;box-shadow:0 6px 15px rgba(0,0,0,0.4);">START GAME</button>
        </div>`;
}

window.launchLiveTriviaEngine = function() {
    // If we still have questions in the batch, use them — never go back to the menu mid-game
    if (window.triviaBatch && window.triviaBatch.length > 0) {
        window.sharedRoomTriviaQuestion = window.triviaBatch.shift();
        renderSharedTriviaUI();
        return;
    }

    // Save the category from picker if it's present, else reuse last saved one
    const picker = document.getElementById('triviaCategoryPicker');
    if (picker) window.triviaLastCategory = picker.value;
    const category = window.triviaLastCategory || '9';

    gameCanvasContainer.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#e2f0d9;font-size:18px;font-weight:bold;">Fetching questions…</div>`;

    fetch(`https://opentdb.com/api.php?amount=10&type=multiple&category=${category}`)
        .then(r => { if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
        .then(data => {
            if (!data.results || data.results.length === 0) throw new Error('No results');
            const decode = s => { const t=document.createElement('textarea'); t.innerHTML=s; return t.value; };
            window.triviaBatch = data.results.map(item => ({
                q       : decode(item.question),
                c       : decode(item.correct_answer),
                choices : [...item.incorrect_answers.map(decode), decode(item.correct_answer)].sort(()=>Math.random()-0.5),
                cat     : category
            }));
            window.sharedRoomTriviaQuestion = window.triviaBatch.shift();
            if (typeof channel !== 'undefined') {
                channel.send({type:'broadcast',event:'sync-room-trivia',payload:{triviaData:window.sharedRoomTriviaQuestion,count:window.triviaQuestionCount}});
            }
            renderSharedTriviaUI();
        })
        .catch(() => {
            gameCanvasContainer.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;height:100%;padding:20px;text-align:center;">
                <div style="font-size:36px;">📡</div>
                <div style="color:#dc3545;font-size:16px;font-weight:bold;">Couldn't reach the trivia server.</div>
                <div style="color:#a3cfbb;font-size:13px;">Check your connection and try again.</div>
                <button onclick="window.triviaBatch=null;launchLiveTriviaEngine();" style="background:#2d6a30;color:white;border:none;border-radius:8px;padding:10px 24px;font-size:14px;font-weight:bold;cursor:pointer;">Retry</button>
            </div>`;
        });
};

function renderSharedTriviaUI() {
    const q=window.sharedRoomTriviaQuestion; if(!q) return;
    let html=`<div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:14px;width:100%;box-sizing:border-box;">
        <div style="color:#ffd700;font-size:15px;font-weight:bold;font-family:Impact,sans-serif;">QUESTION ${window.triviaQuestionCount+1}/10 &nbsp;|&nbsp; SCORE: ${window.triviaScorePoints}</div>
        <div style="background:rgba(0,0,0,0.45);padding:14px;border-radius:10px;font-size:20px;color:#fff;font-weight:bold;text-align:center;width:100%;box-sizing:border-box;border:2px solid #ffd700;line-height:1.35;">${q.q}</div>
        <div style="display:flex;flex-direction:column;gap:10px;width:100%;">`;
    q.choices.forEach(choice => {
        html+=`<button onclick="evaluateRoomTriviaClick(this,'${choice.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')"
            style="width:100%;padding:14px 16px;background:#e2f0d9;color:#1e4620;border:none;border-radius:10px;font-weight:900;font-size:17px;text-align:left;cursor:pointer;box-shadow:0 3px 6px rgba(0,0,0,0.25);line-height:1.3;"
            data-choice="${choice.replace(/"/g,'&quot;')}">${choice}</button>`;
    });
    html+=`</div></div>`;
    gameCanvasContainer.innerHTML=html;
}

window.evaluateRoomTriviaClick = function(btn, choice) {
    document.querySelectorAll('#gameCanvasContainer button').forEach(b=>b.disabled=true);
    window.triviaQuestionCount++;
    if (choice===window.sharedRoomTriviaQuestion.c) {
        btn.style.background='#00c96a'; btn.style.color='#000'; window.triviaScorePoints++;
    } else {
        btn.style.background='#e63946'; btn.style.color='#fff';
        document.querySelectorAll('#gameCanvasContainer button').forEach(b=>{ if(b.getAttribute('data-choice')===window.sharedRoomTriviaQuestion.c){b.style.background='#00c96a';b.style.color='#000';} });
    }
    setTimeout(()=>{
        if (window.triviaQuestionCount>=10) {
            gameCanvasContainer.innerHTML=`<div style="text-align:center;padding:20px;">
                <h2 style="color:#ffd700;font-family:Impact;font-size:32px;">ROUND COMPLETE!</h2>
                <div style="font-size:52px;font-weight:900;color:white;margin:16px 0;">${window.triviaScorePoints} / 10</div>
                <button onclick="initTriviaGame()" style="padding:16px 32px;font-size:20px;background:#ffd700;color:#1e4620;border:none;border-radius:8px;font-weight:900;cursor:pointer;">PLAY AGAIN</button>
            </div>`;
        } else {
            window.launchLiveTriviaEngine();
        }
    },1800);
};

/* ═══════════════════════════════════════════════════════════
   5.  SOLITAIRE — big suit covers card, number centered white
   ═══════════════════════════════════════════════════════════ */
window.initSolitaireGame = function() {
    const suits=['♠','♣','♥','♦'], ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    let deck=[];
    suits.forEach(s=>ranks.forEach((r,val)=>deck.push({r,s,val:val+1,isRed:(s==='♥'||s==='♦'),open:false})));
    deck.sort(()=>Math.random()-0.5);
    window.solTableau=Array(7).fill(0).map(()=>[]);
    for(let i=0;i<7;i++){for(let j=i;j<7;j++)window.solTableau[j].push(deck.pop());window.solTableau[i][window.solTableau[i].length-1].open=true;}
    window.solDeck=deck; window.solWaste=[]; window.solFoundations=Array(4).fill(0).map(()=>[]); window.solSelected=null;
    renderSolitaireBoard();
};

function solCardFace(card, w, h, extraStyle='') {
    // Big suit fills the card, rank centered in white on top
    const suitColor = card.isRed ? '#c00' : '#111';
    const suitFontSize = Math.floor(h * 0.65);
    const rankFontSize = Math.floor(h * 0.32);
    return `<div style="width:${w}px;height:${h}px;border-radius:6px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;${extraStyle}">
        <span style="font-size:${suitFontSize}px;color:${suitColor};line-height:1;position:absolute;">${card.s}</span>
        <span style="font-size:${rankFontSize}px;font-weight:900;color:#fff;position:relative;z-index:1;text-shadow:0 1px 3px rgba(0,0,0,0.8),0 0 6px rgba(0,0,0,0.6);">${card.r}</span>
    </div>`;
}

function renderSolitaireBoard() {
    const sw=Math.min(window.innerWidth-10,360);
    const cw=Math.floor(sw/7.5), ch=Math.floor(cw*1.4);
    let html=`<div style="display:flex;flex-direction:column;gap:10px;width:100%;box-sizing:border-box;padding:2px;user-select:none;">`;

    // Top row: draw pile, waste, spacer, 4 foundations
    html+=`<div style="display:flex;justify-content:space-between;width:100%;gap:3px;align-items:flex-start;">`;
    html+=`<div onclick="drawSolitaireCard()" style="width:${cw}px;height:${ch}px;border-radius:6px;background:${window.solDeck.length?'linear-gradient(135deg,#1a1a1a,#3a3a3a)':'rgba(255,255,255,0.05)'};border:2px solid #ffd700;display:flex;align-items:center;justify-content:center;color:#ffd700;font-size:${Math.floor(ch*0.35)}px;cursor:pointer;flex-shrink:0;">
        ${window.solDeck.length?'⚡':'↻'}
    </div>`;
    const tw=window.solWaste[window.solWaste.length-1];
    const wSel=(window.solSelected&&window.solSelected.type==='waste')?`outline:3px solid #ffd700;outline-offset:-3px;`:'';
    if(tw) html+=`<div onclick="selectSolitaireWaste()" style="flex-shrink:0;">${solCardFace(tw,cw,ch,wSel)}</div>`;
    else   html+=`<div onclick="selectSolitaireWaste()" style="width:${cw}px;height:${ch}px;border-radius:6px;background:rgba(0,0,0,0.2);border:1px dashed rgba(255,255,255,0.2);flex-shrink:0;"></div>`;
    html+=`<div style="flex:1;"></div>`;
    for(let i=0;i<4;i++){
        const fp=window.solFoundations[i], tf=fp[fp.length-1];
        if(tf) html+=`<div onclick="targetSolitaireFoundation(${i})" style="flex-shrink:0;">${solCardFace(tf,cw,ch,'border:2px solid #ffd700;')}</div>`;
        else   html+=`<div onclick="targetSolitaireFoundation(${i})" style="width:${cw}px;height:${ch}px;border-radius:6px;background:rgba(255,255,255,0.04);border:2px dashed rgba(255,215,0,0.4);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.25);font-size:${Math.floor(ch*0.3)}px;cursor:pointer;flex-shrink:0;">A</div>`;
    }
    html+=`</div>`;

    // Tableau
    html+=`<div style="display:flex;gap:3px;width:100%;justify-content:space-between;align-items:flex-start;min-height:${ch+120}px;">`;
    for(let c=0;c<7;c++){
        const col=window.solTableau[c];
        html+=`<div onclick="targetSolitaireColumn(${c})" style="display:flex;flex-direction:column;width:${cw}px;position:relative;min-height:${ch}px;">`;
        if(!col.length) html+=`<div style="width:${cw}px;height:${ch}px;border-radius:6px;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.1);"></div>`;
        col.forEach((card,idx)=>{
            const isSel=window.solSelected&&window.solSelected.type==='tableau'&&window.solSelected.col===c&&window.solSelected.idx===idx;
            const mt=idx===0?0:22;
            if(!card.open){
                html+=`<div style="width:${cw}px;height:${ch}px;border-radius:6px;background:linear-gradient(135deg,#1a1a1a,#3a3a3a);border:1px solid rgba(255,215,0,0.4);display:flex;align-items:center;justify-content:center;color:#ffd700;font-size:${Math.floor(ch*0.3)}px;margin-top:${mt}px;flex-shrink:0;">⚡</div>`;
            } else {
                const selStyle=isSel?'outline:3px solid #ffd700;outline-offset:-3px;':'';
                html+=`<div onclick="event.stopPropagation();selectSolitaireCard(${c},${idx})" style="margin-top:${mt}px;flex-shrink:0;cursor:pointer;">
                    ${solCardFace(card,cw,ch,selStyle)}
                </div>`;
            }
        });
        html+=`</div>`;
    }
    html+=`</div></div>`;
    gameCanvasContainer.innerHTML=html;
}

window.drawSolitaireCard=function(){
    window.solSelected=null;
    if(!window.solDeck.length){window.solDeck=window.solWaste.reverse().map(c=>({...c,open:false}));window.solWaste=[];}
    else{let card=window.solDeck.pop();card.open=true;window.solWaste.push(card);}
    renderSolitaireBoard();
};
window.selectSolitaireWaste=function(){if(window.solWaste.length){window.solSelected={type:'waste'};renderSolitaireBoard();}};
window.selectSolitaireCard=function(col,idx){if(!window.solTableau[col][idx].open)return;window.solSelected={type:'tableau',col,idx};renderSolitaireBoard();};
window.targetSolitaireColumn=function(toCol){
    if(!window.solSelected)return;
    const tp=window.solTableau[toCol],tt=tp[tp.length-1];
    let mc=window.solSelected.type==='waste'?[window.solWaste[window.solWaste.length-1]]:window.solTableau[window.solSelected.col].slice(window.solSelected.idx);
    const fc=mc[0];
    let valid=!tt?(fc.val===13):(tt.open&&tt.isRed!==fc.isRed&&tt.val===fc.val+1);
    if(valid){
        if(window.solSelected.type==='waste'){tp.push(window.solWaste.pop());}
        else{const oc=window.solTableau[window.solSelected.col];window.solTableau[window.solSelected.col]=oc.slice(0,window.solSelected.idx);mc.forEach(c=>tp.push(c));if(window.solTableau[window.solSelected.col].length)window.solTableau[window.solSelected.col][window.solTableau[window.solSelected.col].length-1].open=true;}
        checkSolitaireVictory();
    }
    window.solSelected=null;renderSolitaireBoard();
};
window.targetSolitaireFoundation=function(fi){
    if(!window.solSelected)return;
    if(window.solSelected.type==='tableau'&&window.solSelected.idx!==window.solTableau[window.solSelected.col].length-1)return;
    let card=window.solSelected.type==='waste'?window.solWaste[window.solWaste.length-1]:window.solTableau[window.solSelected.col][window.solSelected.idx];
    const fp=window.solFoundations[fi],tf=fp[fp.length-1];
    let valid=!tf?(card.val===1):(tf.s===card.s&&card.val===tf.val+1);
    if(valid){
        if(window.solSelected.type==='waste'){fp.push(window.solWaste.pop());}
        else{fp.push(window.solTableau[window.solSelected.col].pop());if(window.solTableau[window.solSelected.col].length)window.solTableau[window.solSelected.col][window.solTableau[window.solSelected.col].length-1].open=true;}
        checkSolitaireVictory();
    }
    window.solSelected=null;renderSolitaireBoard();
};
function checkSolitaireVictory(){
    if(window.solFoundations.reduce((a,c)=>a+c.length,0)===52)setTimeout(()=>{gameCanvasContainer.innerHTML=`<div style="text-align:center;padding:20px;color:#ffd700;font-family:Impact;font-size:32px;">👑 SOLITAIRE VICTORY!</div>`;},300);
}

/* ═══════════════════════════════════════════════════════════
   6.  HANGMAN — shrunk to fit, SVG scaffold, big dashes
   ═══════════════════════════════════════════════════════════ */
const HANGMAN_FALLBACK=[
    'CHASER','BICYCLE','ADVENTURE','JOURNEY','HIGHWAY','VELOCITY','NAVIGATOR','COMPASS',
    'HORIZON','PASSPORT','WANDERER','ROUTING','BATTERY','SURVIVAL','FLOORING','LABYRINTH',
    'PRISM','TUNDRA','FRACTURE','ECLIPSE','CATALYST','VORTEX','PHANTOM','CRESCENT',
    'INFERNO','FORTRESS','TEMPEST','CRIMSON','SOLITUDE','MIRAGE','ANTHEM','DYNASTY'
];

function initHangmanGame() {
    window.hangmanState={word:null,guessed:[],wrong:0,maxWrong:6,dying:false};
    gameCanvasContainer.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#e2f0d9;font-size:15px;">Finding a word…</div>`;
    fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:50,messages:[{role:'user',content:'Give me exactly ONE English word for a Hangman game. Requirements: 5-14 letters, no proper nouns, no hyphens, moderately challenging. Respond with ONLY the word in ALL CAPS, nothing else.'}]})
    })
    .then(r=>r.json())
    .then(data=>{
        const raw=(data.content?.[0]?.text||'').trim().toUpperCase().replace(/[^A-Z]/g,'');
        window.hangmanState.word=(raw.length>=5&&raw.length<=14)?raw:HANGMAN_FALLBACK[Math.floor(Math.random()*HANGMAN_FALLBACK.length)];
        renderHangmanGame();
    })
    .catch(()=>{
        window.hangmanState.word=HANGMAN_FALLBACK[Math.floor(Math.random()*HANGMAN_FALLBACK.length)];
        renderHangmanGame();
    });
}

/* SVG is smaller (100×130) so it clears the game header bar */
function buildHangmanSVG(wrong,dying){
    const bc=dying?'#dc3545':'#e2f0d9';
    const sh=dying?'style="animation:hangShake 0.5s ease-in-out 3"':'';
    const p={head:wrong>=1,body:wrong>=2,la:wrong>=3,ra:wrong>=4,ll:wrong>=5,rl:wrong>=6};
    return `<svg viewBox="0 0 100 130" width="100" height="130" xmlns="http://www.w3.org/2000/svg">
        <style>@keyframes hangShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}</style>
        <line x1="8" y1="124" x2="92" y2="124" stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>
        <line x1="24" y1="124" x2="24" y2="8" stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>
        <line x1="24" y1="8"   x2="62" y2="8"  stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>
        <line x1="62" y1="8"   x2="62" y2="22" stroke="#ffd700" stroke-width="3" stroke-linecap="round"/>
        <g ${sh} transform-origin="62 31">
            ${p.head?`<circle cx="62" cy="31" r="10" stroke="${bc}" stroke-width="3" fill="none"/>`:''  }
            ${p.head&&dying?`<text x="55" y="36" font-size="10" font-weight="bold" fill="${bc}">xx</text>`
              :p.head?`<circle cx="58" cy="28" r="2" fill="${bc}"/><circle cx="66" cy="28" r="2" fill="${bc}"/><path d="M58 35 Q62 39 66 35" stroke="${bc}" stroke-width="1.5" fill="none"/>`:''  }
            ${p.body?`<line x1="62" y1="41" x2="62" y2="78" stroke="${bc}" stroke-width="3" stroke-linecap="round"/>`:''  }
            ${p.la  ?`<line x1="62" y1="50" x2="44" y2="66" stroke="${bc}" stroke-width="3" stroke-linecap="round"/>`:''  }
            ${p.ra  ?`<line x1="62" y1="50" x2="80" y2="66" stroke="${bc}" stroke-width="3" stroke-linecap="round"/>`:''  }
            ${p.ll  ?`<line x1="62" y1="78" x2="47" y2="100" stroke="${bc}" stroke-width="3" stroke-linecap="round"/>`:'' }
            ${p.rl  ?`<line x1="62" y1="78" x2="77" y2="100" stroke="${bc}" stroke-width="3" stroke-linecap="round"/>`:'' }
        </g>
    </svg>`;
}

function renderHangmanGame(){
    const state=window.hangmanState; if(!state||!state.word)return;
    const{word,guessed,wrong,maxWrong,dying}=state;
    const isWin=word.split('').every(l=>guessed.includes(l)), isLose=wrong>=maxWrong;

    let html=`<div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:100%;box-sizing:border-box;padding:6px 8px;">`;
    html+=`<div style="transform:scale(0.88);transform-origin:top center;">${buildHangmanSVG(wrong,dying||isLose)}</div>`;

    // Letter dashes
    html+=`<div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:center;margin:2px 0;">`;
    word.split('').forEach(letter=>{
        const rev=guessed.includes(letter)||isLose;
        const col=rev?(isLose&&!guessed.includes(letter)?'#dc3545':'#ffd700'):'transparent';
        html+=`<div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
            <div style="font-size:24px;font-weight:900;color:${col};min-width:22px;text-align:center;font-family:Impact,sans-serif;">${letter}</div>
            <div style="width:22px;height:4px;background:#e2f0d9;border-radius:2px;"></div>
        </div>`;
    });
    html+=`</div>`;

    if(isWin){
        html+=`<div style="color:#00b050;font-size:20px;font-weight:bold;text-align:center;">🎉 YOU GOT IT!</div>
            <button onclick="initHangmanGame()" style="background:#ffd700;color:#1e4620;border:none;border-radius:8px;padding:12px 26px;font-size:16px;font-weight:900;cursor:pointer;">NEW WORD</button>`;
    } else if(isLose){
        html+=`<div style="color:#dc3545;font-size:20px;font-weight:bold;text-align:center;">💀 GAME OVER</div>
            <button onclick="initHangmanGame()" style="background:#ffd700;color:#1e4620;border:none;border-radius:8px;padding:12px 26px;font-size:16px;font-weight:900;cursor:pointer;">TRY AGAIN</button>`;
    } else {
        html+=`<div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center;max-width:300px;">`;
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter=>{
            const used=guessed.includes(letter),wrong2=used&&!word.includes(letter),right=used&&word.includes(letter);
            html+=`<button onclick="handleHangmanClick('${letter}')" ${used?'disabled':''}
                style="width:32px;height:38px;border-radius:6px;border:none;font-weight:900;font-size:16px;
                cursor:${used?'default':'pointer'};
                background:${wrong2?'#dc3545':right?'#00b050':'#e2f0d9'};
                color:${used?'white':'#1e4620'};opacity:${used?0.55:1};box-shadow:0 2px 4px rgba(0,0,0,0.3);">
                ${letter}
            </button>`;
        });
        html+=`</div><div style="color:#ffd700;font-size:12px;font-weight:bold;margin-top:4px;">Mistakes: ${wrong}/${maxWrong}</div>`;
    }
    html+=`</div>`;
    gameCanvasContainer.innerHTML=html;
}

window.handleHangmanClick=function(letter){
    const state=window.hangmanState; if(!state||!state.word||state.guessed.includes(letter))return;
    state.guessed.push(letter);
    if(!state.word.includes(letter)){
        state.wrong++;
        if(state.wrong>=state.maxWrong){state.dying=true;renderHangmanGame();setTimeout(()=>{state.dying=false;renderHangmanGame();},1600);return;}
    }
    renderHangmanGame();
};

