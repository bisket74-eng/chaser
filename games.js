/* ============================================================
   CHASER ARCADE ENGINE  –  games.js (PART 1 OF 3)
   ============================================================ */

/* ── Global Multiplayer Room Handshaking & Seating Sync ──── */
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
    window.unoRoomSeats     = p.roomSeats || [];
    if (activeGameStage.classList.contains('open') && activeGameLabelTitle.innerText.includes('Uno')) {
        renderUnoLayout();
    }
};

window.handleIncomingTriviaSync = (p) => {
    if (!activeGameStage.classList.contains('open') || !activeGameLabelTitle.innerText.includes('Trivia')) return;
    if (p.phase === 'question') {
        window.sharedRoomTriviaQuestion = p.triviaData;
        window.triviaQuestionCount = p.count;
        runLocalTriviaTimerPhase('question');
    } else if (p.phase === 'vote') {
        runLocalTriviaTimerPhase('vote');
    } else if (p.phase === 'reveal') {
        window.triviaRoomVotes = p.votes || {};
        runLocalTriviaTimerPhase('reveal');
    }
};

window.handleIncomingSequenceSync = (p) => {
    window.seqBoard         = p.boardState;
    window.seqTurn          = p.turnState;
    window.seqSequences     = p.sequenceScores;
    window.seqRoomSeats     = p.roomSeats || [];
    if (activeGameStage.classList.contains('open') && activeGameLabelTitle.innerText.includes('Sequence')) {
        renderSequenceBoard();
    }
};

/* ── Dynamic Layout Manager & Master Memory Scrubbers ────── */
window.launchGameEngine = function (gameName, gameIcon) {
    gameHubOverlay.classList.remove('open');
    window.shutdownActiveGame(true); // Hard purge of old game memory variables
    
    // STRICT FORMATTING MANDATE: Strips away old legacy names wholly and permanently
    let displayTitle = gameName;
    if (gameName === 'Battle Uno' || gameName === 'Uno') displayTitle = 'Uno';
    if (gameName === 'Crew Trivia' || gameName === 'Trivia') displayTitle = 'Trivia';
    
    activeGameLabelTitle.innerText = gameIcon + '  ' + displayTitle;
    activeGameStage.classList.add('open');

    // EXPANDED VIEWPORT FRAME: Elongates the box down over the chat stream to prevent squishing
    activeGameStage.style.height = "72vh";
    activeGameStage.style.maxHeight = "580px";

    // Global selector tag font upscaling fix
    activeGameLabelTitle.style.fontSize = "5.5vw";
    activeGameLabelTitle.style.fontWeight = "900";

    if (gameName === 'Crew Trivia' || gameName === 'Trivia') {
        initTriviaGame();
    } else if (gameName === 'Battle Uno' || gameName === 'Uno') {
        initChaserUnoGame();
    } else if (gameName === 'Checkers') {
        initCheckersGame();
    } else if (gameName === 'Sequence') {
        initSequenceGame();
    } else if (gameName === 'Solitaire') {
        initSolitaireGame();
    } else if (gameName === 'Hangman') {
        initHangmanGame();
    }
};

window.shutdownActiveGame = function (isSwitching = false) {
    if (window.triviaLocalInterval) clearInterval(window.triviaLocalInterval);
    if (window.triviaLocalTimeout) clearTimeout(window.triviaLocalTimeout);
    
    // Restore default layout constraints on teardown
    if (!isSwitching) {
        activeGameStage.classList.remove('open');
        activeGameStage.style.height = "";
        activeGameStage.style.maxHeight = "";
    }
    gameCanvasContainer.innerHTML = '';
    
    // Hard scrub to prevent memory leaks or duplicated boards across sessions
    window.syncCheckersBoard        = null;
    window.unoDiscardPile           = undefined;
    window.unoHands                 = [[],[]];
    window.unoDeckState             = [];
    window.unoRoomSeats             = [];
    window.sharedRoomTriviaQuestion = undefined;
    window.triviaQuestionCount      = 0;
    window.triviaScorePoints        = 0;
    window.hangmanState             = null;
    window.seqBoard                 = null;
    window.seqRoomSeats             = [];
};

/* ═══════════════════════════════════════════════════════════
   1.  CHECKERS ENGINE
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
    const boardPx    = Math.min(320, Math.floor((window.innerWidth - 16) * 0.95));
    const cellPx     = Math.floor(boardPx / 8);
    const actualBoardPx = cellPx * 8;
    const piecePx    = Math.floor(cellPx * 0.80);

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:2vw;width:100%;box-sizing:border-box;user-select:none;">
        <div style="color:#ffd700;font-weight:bold;font-size:5vw;font-family:Impact,sans-serif;letter-spacing:0.5px;">
            ${turn === 1 ? '🔴 RED TEAM TURN' : '⚫ BLACK TEAM TURN'} ${window.consecutiveJumpsActive ? ' - BONUS JUMP!' : ''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(8,${cellPx}px);grid-template-rows:repeat(8,${cellPx}px);width:${actualBoardPx}px;height:${actualBoardPx}px;border:3px solid #ffd700;border-radius:6px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.4);">`;

    for (let i = 0; i < 64; i++) {
        const p = board[i];
        const bgColor = (Math.floor(i / 8) + i % 8) % 2 === 1 ? '#2d6a30' : '#e2f0d9';
        let pieceHtml = '';
        if (p === 1) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff6b6b,#c00);border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.4);"></div>`;
        if (p === 2) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#555,#111);border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.4);"></div>`;
        if (p === 3) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff6b6b,#c00);border:3px solid #ffd700;display:flex;align-items:center;justify-content:center;font-size:4vw;color:white;font-weight:900;">👑</div>`;
        if (p === 4) pieceHtml = `<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#555,#111);border:3px solid #ffd700;display:flex;align-items:center;justify-content:center;font-size:4vw;color:white;font-weight:900;">👑</div>`;

        html += `<div onclick="handleCheckerTap(${i})" style="width:${cellPx}px;height:${cellPx}px;background:${bgColor};display:flex;align-items:center;justify-content:center;cursor:pointer;box-sizing:border-box;${sel===i?'outline:3px solid #ffd700;outline-offset:-3px;':''}">
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
                if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && !board[ji]) moves.push(ji);
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
   
};/* ============================================================
   CHASER ARCADE ENGINE  –  games.js (PART 2 OF 3)
   ============================================================ */

/* ═══════════════════════════════════════════════════════════
   2.  SEQUENCE ENGINE (AUTHENTIC REGULATION GRID COORDINATES)
   ═══════════════════════════════════════════════════════════ */
// OFFICIAL TRADITIONAL BOARD SEQUENCE LAYOUT (EXACT REPLICA MAP)
const SEQUENCE_MATRIX_GRID = [
    'FREE','2♠','3♠','4♠','5♠','6♠','7♠','8♠','9♠','FREE',
    '6♣','5♣','4♣','3♣','2♣','A♥','K♥','Q♥','10♥','10♠',
    '7♣','A♠','2♦','3♦','4♦','5♦','6♦','7♦','9♥','Q♠',
    '8♣','K♠','6♣','5♣','4♣','3♣','2♣','8♦','8♥','K♠',
    '9♣','Q♠','7♣','6♥','5♥','4♥','A♠','9♦','7♥','A♠',
    '10♣','10♠','8♣','7♥','2♥','3♥','K♠','10♦','6♥','2♦',
    'Q♣','J♠','9♣','8♥','A♦','K♦','Q♦','J♦','5♥','3♦',
    'K♣','Q♣','10♣','9♥','10♥','Q♥','K♥','A♥','4♥','4♦',
    'A♣','3♦','2♦','A♠','K♠','Q♠','J♠','10♠','9♠','5♦',
    'FREE','A♣','K♣','Q♣','J♣','10♣','9♣','8♣','7♣','FREE'
];

function initSequenceGame() {
    window.seqBoard = Array(100).fill(0);
    window.seqTurn  = 1; // 1 = Blue Team, 2 = Red Team
    window.seqSequences = [0, 0];
    window.seqSelectedCardIdx = null;
    window.seqIsZoomedActive  = false;

    // ROCK-SOLID NETWORKING SEAT HANDSHAKE
    let activeRoster = typeof currentRoomUsers !== 'undefined' ? currentRoomUsers : [];
    if (activeRoster.length === 0 && typeof getRoomUsersList === 'function') activeRoster = getRoomUsersList();
    
    let myUid = typeof currentUserUID !== 'undefined' ? currentUserUID : 'localPlayer';
    window.seqRoomSeats = activeRoster.map(u => u.uid || u.id);
    
    // Seat assignment matrix
    window.mySequenceTeam = 1; 
    let mySeatIndex = window.seqRoomSeats.indexOf(myUid);
    if (mySeatIndex === 1) window.mySequenceTeam = 2; // Second player automatically logs into Red Team 2

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
            payload: { boardState: window.seqBoard, turnState: window.seqTurn, sequenceScores: window.seqSequences, roomSeats: window.seqRoomSeats }
        });
    }
}

function toggleLocalSequenceZoom() {
    window.seqIsZoomedActive = !window.seqIsZoomedActive;
    renderSequenceBoard();
}

function renderSequenceBoard() {
    const board = window.seqBoard;
    const turn  = window.seqTurn;
    const sel   = window.seqSelectedCardIdx;
    const isZoomed = window.seqIsZoomedActive;

    const parentContainerW = Math.min(window.innerWidth - 16, 335);
    const cellPx = isZoomed ? Math.floor(420 / 10) : Math.floor(parentContainerW / 10);
    const actualGridW = cellPx * 10;
    
    let html = `<div style="display:flex;flex-direction:column;align-items:center;width:100%;box-sizing:border-box;height:100%;overflow:hidden;justify-content:space-between;gap:4px;">`;
    
    let teamText = turn === 1 ? '🔵 BLUE TEAM' : '🔴 RED TEAM';
    if (window.mySequenceTeam === turn) teamText += ' (YOUR TURN)';
    else teamText += ' (WAITING...)';
    
    html += `<div style="display:flex;justify-content:space-between;width:100%;align-items:center;padding:0 2px;">
        <div style="font-size:4vw;color:#ffd700;font-family:Impact,sans-serif;letter-spacing:0.5px;">${teamText}</div>
        <button onclick="toggleLocalSequenceZoom()" style="background:#ffd700;color:#1e4620;border:none;border-radius:4px;padding:3px 8px;font-size:3.5vw;font-weight:900;font-family:Impact;cursor:pointer;">${isZoomed?'🔍 UNZOOM':'🔍 ZOOM BOARD'}</button>
    </div>`;

    // VIEWPORT FRAME CORE OVERLAPS
    html += `<div id="sequenceScrollFrame" style="width:${parentContainerW}px;height:${parentContainerW}px;overflow:${isZoomed?'auto':'hidden'};border:3px solid #ffd700;border-radius:6px;background:#111;-webkit-overflow-scrolling:touch;">
        <div style="display:grid;grid-template-columns:repeat(10,${cellPx}px);grid-template-rows:repeat(10,${cellPx}px);gap:1px;width:${actualGridW}px;height:${actualGridW}px;background:#222;">`;

    for (let i = 0; i < 100; i++) {
        const label = SEQUENCE_MATRIX_GRID[i];
        const token = board[i];
        const isRed = label.includes('♥') || label.includes('♦');
        
        let num = label.replace(/[♠♣♥♦]/g,'');
        let suit = label.replace(/[^♠♣♥♦]/g,'');

        let tokenMark = '';
        if (token === 1) tokenMark = '<div style="width:74%;height:74%;border-radius:50%;background:#00b0ff;border:2px solid #fff;position:absolute;z-index:2;box-shadow:0 2px 4px rgba(0,0,0,0.4);"></div>';
        if (token === 2) tokenMark = '<div style="width:74%;height:74%;border-radius:50%;background:#e63946;border:2px solid #fff;position:absolute;z-index:2;box-shadow:0 2px 4px rgba(0,0,0,0.4);"></div>';

        let localHighlight = '';
        if (sel !== null && !token && label !== 'FREE') {
            if (label === (window.mySequenceHand[sel].r + window.mySequenceHand[sel].s)) {
                localHighlight = 'background:#fff3cd;box-shadow:inset 0 0 0 2.5px #ffc107;';
            }
        }

        html += `<div onclick="handleSequenceGridCellTap(${i})" style="position:relative;background:#fff;color:${isRed?'#c00':'#111'};display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;line-height:1;height:${cellPx}px;width:${cellPx}px;cursor:pointer;${localHighlight}">
            ${label==='FREE'?'<span style="color:#ffd700;font-size:5vw;text-shadow:1px 1px 1px #000;">★</span>':`
                <span style="font-size:${isZoomed?'3.5vw':'2.8vw'};font-weight:900;margin-top:-1px;">${num}</span>
                <span style="font-size:${isZoomed?'4vw':'3.2vw'};margin-top:1px;">${suit}</span>
            `}
            ${tokenMark}
        </div>`;
    }
    html += `</div></div>`;

    // FIXED DECK HAND ROWS
    html += `<div style="display:flex;gap:4px;width:100%;justify-content:center;padding:2px 0;">`;
    window.mySequenceHand.forEach((card, idx) => {
        let isHighlighted = (sel === idx) ? 'border:2.5px solid #ffd700;background:#fff;transform:translateY(-3px);box-shadow:0 4px 8px rgba(0,0,0,0.3);' : 'border:1px solid #666;background:#eee;';
        html += `<button onclick="window.seqSelectedCardIdx=(window.seqSelectedCardIdx===${idx}?null:${idx});renderSequenceBoard();" style="${isHighlighted}border-radius:5px;width:12.5vw;max-width:44px;height:16.5vw;max-height:58px;font-weight:900;color:${card.isRed?'#c00':'#111'};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0;box-shadow:0 2px 4px rgba(0,0,0,0.2);cursor:pointer;">
            <span style="font-size:3.8vw;font-weight:900;line-height:1;">${card.r}</span>
            <span style="font-size:4.2vw;line-height:1;margin-top:2px;">${card.s}</span>
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
    window.seqTurn = (window.seqTurn === 1) ? 2 : 1; // Switches control back-and-forth natively
    
    triggerSequenceNetworkSync();
    renderSequenceBoard();
};

/* ============================================================
   CHASER ARCADE ENGINE  –  games.js (PART 3 OF 3)
   ============================================================ */

/* ═══════════════════════════════════════════════════════════
   3.  UNO ENGINE (HOST DEALER LOCK & EDGE SCROLL AUTO-FOCUS)
   ═══════════════════════════════════════════════════════════ */
function initChaserUnoGame() {
    window.myPlayerNumber = 0;
    
    let activeRoster = typeof currentRoomUsers !== 'undefined' ? currentRoomUsers : [];
    if (activeRoster.length === 0 && typeof getRoomUsersList === 'function') activeRoster = getRoomUsersList();
    
    let myUid = typeof currentUserUID !== 'undefined' ? currentUserUID : 'localPlayer';
    window.unoRoomSeats = activeRoster.map(u => ({ uid: u.uid || u.id, name: u.display_name || u.name || 'User' }));
    
    for (let i = 0; i < window.unoRoomSeats.length; i++) {
        if (window.unoRoomSeats[i].uid === myUid) {
            window.myPlayerNumber = i;
            break;
        }
    }

    // STRICT HOST DEALER LOCK: Eliminates twin mirrored hand duplication anomalies
    if (window.myPlayerNumber === 0) {
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

        window.unoNumPlayers = Math.max(2, window.unoRoomSeats.length);
        window.unoCurrentPlayer = 0;
        window.unoDirection = 1;
        window.unoWildChoosingActive = false;
        window.unoWildPendingIdx = null;
        window.unoHands = Array(window.unoNumPlayers).fill(0).map(() => []);

        for(let p=0; p < window.unoNumPlayers; p++) {
            for(let i=0;i<7;i++) {
                if (window.unoDeckState.length) window.unoHands[p].push(window.unoDeckState.pop());
            }
        }
        
        window.unoDiscardPile = window.unoDeckState.pop();
        while(window.unoDiscardPile && window.unoDiscardPile.color === 'Wild') {
            window.unoDeckState.unshift(window.unoDiscardPile);
            window.unoDiscardPile = window.unoDeckState.pop();
        }
        triggerUnoNetworkSync();
    }
    renderUnoLayout();
}

function triggerUnoNetworkSync() {
    if (typeof channel !== 'undefined') {
        channel.send({
            type: 'broadcast',
            event: 'uno-sync-discard',
            payload: { 
                currentDiscard: window.unoDiscardPile, 
                turn: window.unoCurrentPlayer, 
                hands: window.unoHands, 
                deck: window.unoDeckState, 
                direction: window.unoDirection,
                roomSeats: window.unoRoomSeats
            }
        });
    }
}

function unoColorClass(c) { return {Red:'#e63946',Yellow:'#ffb703',Green:'#00b050',Blue:'#00b0ff',Wild:'#1e1e1e'}[c]||'#1e1e1e'; }

function renderUnoLayout() {
    const discard = window.unoDiscardPile || { color: 'Red', value: '0' };
    const cp = window.unoCurrentPlayer;
    const hand = window.unoHands ? (window.unoHands[window.myPlayerNumber] || []) : [];
    
    let activeProfileName = `Player ${cp + 1}`;
    if (window.unoRoomSeats && window.unoRoomSeats[cp]) {
        activeProfileName = window.unoRoomSeats[cp].name;
    }
    
    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:3vw;width:100%;box-sizing:border-box;user-select:none;">`;
    html += `<div style="background:#2d6a30;border-radius:4px;padding:4px 16px;color:#ffd700;font-size:4.2vw;font-weight:900;font-family:Impact,sans-serif;box-shadow:0 2px 5px rgba(0,0,0,0.3);letter-spacing:0.5px;">
        🎴 TURN: ${activeProfileName.toUpperCase()} ${window.myPlayerNumber === cp ? '(YOU)' : ''}
    </div>`;

    html += `<div style="display:flex;gap:8vw;align-items:flex-end;margin-bottom:2vw;">`;
    
    // DRAW BACK CORE: Rich charcoal center body + clear white text + golden border rim frame
    html += `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="color:#a3cfbb;font-size:3vw;font-weight:bold;font-family:sans-serif;">DRAW</div>
        <div onclick="unoDrawCard()" style="background:linear-gradient(135deg,#242424,#111111);border:3px solid #ffd700;box-shadow:0 4px 8px rgba(0,0,0,0.4);cursor:pointer;width:16vw;height:24vw;max-width:64px;max-height:94px;border-radius:8px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;position:relative;">
            <div style="color:#fff;font-size:4vw;font-weight:900;font-family:Impact,sans-serif;transform:rotate(-15deg);letter-spacing:0.5px;">UNO</div>
        </div>
    </div>`;

    // PLAY PILE
    const isSkipFont = discard.value === 'Skip';
    html += `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="color:#a3cfbb;font-size:3vw;font-weight:bold;font-family:sans-serif;">PLAY</div>
        <div style="background:${unoColorClass(discard.color)};width:16vw;height:24vw;max-width:64px;max-height:94px;border:2px solid #fff;border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 8px rgba(0,0,0,0.4);box-sizing:border-box;position:relative;overflow:hidden;">
            <div style="position:absolute;width:130%;height:40%;background:rgba(255,255,255,0.15);border-radius:50%;transform:rotate(-25deg);"></div>
            <div style="color:#fff;font-size:${isSkipFont?'3.5vw':'8vw'};font-weight:900;font-family:Impact,sans-serif;z-index:2;text-shadow:2px 2px 4px rgba(0,0,0,0.4);text-align:center;padding:2px;max-width:100%;white-space:nowrap;overflow:hidden;">
                ${discard.value}
            </div>
        </div>
    </div>`;
    html += `</div>`;

    if(window.unoWildChoosingActive && window.myPlayerNumber === cp) {
        html += `<div style="display:grid;grid-template-columns:1fr 1fr;width:80px;height:80px;border-radius:8px;overflow:hidden;border:3px solid #fff;box-shadow:0 4px 8px rgba(0,0,0,0.4);margin-bottom:2vw;">
            ${['Red','Yellow','Green','Blue'].map(col=> `<div onclick="unoPickWildColor('${col}')" style="background:${unoColorClass(col)};cursor:pointer;"></div>`).join('')}
        </div>`;
    }

    html += `<style>
        #unoHandScrollWrapper { scroll-behavior: smooth; }
        #unoHandScrollWrapper::-webkit-scrollbar { height: 9px !important; display: block !important; }
        #unoHandScrollWrapper::-webkit-scrollbar-thumb { background-color: #ffd700 !important; border-radius: 4px !important; }
        #unoHandScrollWrapper::-webkit-scrollbar-track { background: rgba(255,255,255,0.08) !important; }
    </style>
    <div id="unoHandScrollWrapper" style="display:flex;gap:1.5vw;overflow-x:auto;padding:10px 4px;width:100%;box-sizing:border-box;-webkit-overflow-scrolling:touch;">`;

    hand.forEach((card, i) => {
        const playable = card.color===discard.color || card.value===discard.value || card.color==='Wild';
        const innerTxtSkip = card.value === 'Skip';
        html += `<div onclick="unoPlayCard(${i})" style="flex-shrink:0;width:14vw;height:21vw;max-width:56px;max-height:84px;background:${unoColorClass(card.color)};opacity:${playable?1:0.65};border:2px solid #fff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:${innerTxtSkip?'3vw':'6.5vw'};color:#fff;font-family:Impact,sans-serif;font-weight:900;box-shadow:0 3px 6px rgba(0,0,0,0.3);cursor:pointer;position:relative;overflow:hidden;">
            <div style="position:absolute;width:130%;height:45%;background:rgba(255,255,255,0.12);border-radius:50%;transform:rotate(-25deg);"></div>
            <span style="z-index:2;text-shadow:1px 1px 3px rgba(0,0,0,0.5);text-align:center;padding:1px;white-space:nowrap;max-width:100%;overflow:hidden;">${card.value}</span>
        </div>`;
    });

    if(hand.length > 4) {
        html += `<div style="flex-shrink:0;width:5vw;height:10px;opacity:0;pointer-events:none;"></div>`;
    }

    html += `</div></div>`;
    gameCanvasContainer.innerHTML = html;
}

window.unoPlayCard = function(idx) {
    const cp = window.unoCurrentPlayer;
    if (window.myPlayerNumber !== cp) return;
    const card = window.unoHands[cp][idx];
    const discard = window.unoDiscardPile;
    if(card.color!==discard.color && card.value!==discard.value && card.color!=='Wild') return;

    if (card.color === 'Wild') {
        window.unoWildPendingIdx = idx; window.unoWildChoosingActive = true; renderUnoLayout(); return;
    }
    window.unoHands[cp].splice(idx, 1);
    window.unoDiscardPile = card;
    const numP = window.unoNumPlayers || 2;
    if (card.value === '⇋') window.unoDirection *= -1;
    let skip = (card.value === 'Skip');
    if (card.value === '+2') {
        const nxt = (cp + window.unoDirection + numP) % numP;
        if (window.unoHands[nxt]) window.unoHands[nxt].push(window.unoDeckState.pop(), window.unoDeckState.pop());
        skip = true;
    }
    window.unoCurrentPlayer = (cp + (skip ? window.unoDirection * 2 : window.unoDirection) + numP) % numP;
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
    const numP = window.unoNumPlayers || 2;
    if (wasD4) {
        const nxt = (cp + window.unoDirection + numP) % numP;
        for(let i=0;i<4;i++) {
            if (window.unoDeckState.length) window.unoHands[nxt].push(window.unoDeckState.pop());
        }
        window.unoCurrentPlayer = (cp + (window.unoDirection * 2) + numP) % numP;
    } else {
        window.unoCurrentPlayer = (cp + window.unoDirection + numP) % numP;
    }
    triggerUnoNetworkSync(); 
    renderUnoLayout();
};

window.unoDrawCard = function() {
    if (window.unoCurrentPlayer !== window.myPlayerNumber) return;
    if (window.unoDeckState.length === 0) return;
    
    window.unoHands[window.unoCurrentPlayer].push(window.unoDeckState.pop());
    window.unoCurrentPlayer = (window.unoCurrentPlayer + window.unoDirection + (window.unoNumPlayers || 2)) % (window.unoNumPlayers || 2);
    triggerUnoNetworkSync(); 
    renderUnoLayout();
    
    // DYNAMIC EDGE FOCUS: Forces horiz-slider tracking directly to latest drawn card element right flush edge
    setTimeout(() => {
        const scroller = document.getElementById('unoHandScrollWrapper');
        if (scroller) scroller.scrollLeft = scroller.scrollWidth;
    }, 50);
};

/* ═══════════════════════════════════════════════════════════
   4.  SYNCHRONIZED CO-OP TRIVIA ENGINE (5-5 HIDDEN SPLIT LOOP)
   ═══════════════════════════════════════════════════════════ */
/* ============================================================
   CHASER ARCADE: STREAMLINED REAL-TIME TRIVIA ENGINE
   ============================================================ */

window.initTriviaGame = function() {
    window.triviaQuestionCount = 0;
    window.triviaScorePoints   = 0;
    window.triviaRoomVotes     = {};
    // Track question text during this campaign run to completely eliminate duplicates
    window.triviaSessionHistory = []; 
    
    gameCanvasContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4vw;padding:4vw;width:100%;box-sizing:border-box;height:100%;user-select:none;">
            <div style="color:#ffd700;font-size:5.5vw;font-weight:bold;font-family:Impact,sans-serif;text-shadow:2px 2px 4px rgba(0,0,0,0.5);text-align:center;letter-spacing:0.5px;">TRIVIA CATEGORY</div>
            
            <div style="position:relative;width:100%;max-width:280px;">
                <select id="triviaCategoryPicker" style="width:100%;padding:14px;font-size:4vw;font-weight:900;border-radius:10px;border:3px solid #ffd700;background:#2d6a30;color:#fff;outline:none;box-shadow:0 4px 10px rgba(0,0,0,0.3);appearance:none;text-align:center;cursor:pointer;">
                    <option value="9">General Knowledge Pool</option>
                    <option value="11">Movies & Cinema</option>
                    <option value="12">Music & Tracks</option>
                    <option value="14">Television Shows</option>
                    <option value="17">Science & Nature</option>
                    <option value="23">History Channels</option>
                </select>
                <div style="position:absolute;right:14px;top:50%;transform:translateY(-50%);pointer-events:none;color:#ffd700;font-size:4vw;">▼</div>
            </div>

            <button onclick="launchLiveTriviaEngine()" style="width:100%;max-width:280px;padding:14px;background:#ffd700;color:#1e4620;font-weight:900;font-size:5vw;border:none;border-radius:10px;cursor:pointer;font-family:Impact,sans-serif;box-shadow:0 4px 10px rgba(0,0,0,0.3);letter-spacing:0.5px;">START CAMPAIGN</button>
        </div>`;
};

window.launchLiveTriviaEngine = function() {
    const picker = document.getElementById('triviaCategoryPicker');
    const cat = picker ? picker.value : '9';
    gameCanvasContainer.innerHTML = `<div style="color:white;font-size:4.5vw;font-weight:bold;text-align:center;padding:40px;font-family:sans-serif;">Fetching synchronized question...</div>`;
    
    // Safety recursive function ensuring unique item extraction up to 5 loop retries
    function fetchUniqueQuestion(attempts = 0) {
        fetch(`https://opentdb.com/api.php?amount=1&type=multiple&category=${cat}&cache=${Math.random()}`)
            .then(res => res.json())
            .then(data => {
                if(!data.results || data.results.length === 0) { initTriviaGame(); return; }
                const item = data.results[0];
                const decode = s => { let t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
                
                const questionText = decode(item.question);
                
                // If question was already played this match, fetch another unless we hit an infrastructure wall
                if (window.triviaSessionHistory.includes(questionText) && attempts < 5) {
                    fetchUniqueQuestion(attempts + 1);
                    return;
                }
                
                // Save unique string key to current running collection
                window.triviaSessionHistory.push(questionText);

                const correctAnswer = decode(item.correct_answer);
                let choices = item.incorrect_answers.map(ans => decode(ans));
                choices.splice(Math.floor(Math.random() * (choices.length + 1)), 0, correctAnswer);

                window.sharedRoomTriviaQuestion = { q: questionText, c: correctAnswer, choices: choices, cat: cat };
                window.triviaRoomVotes = {};

                broadcastTriviaState('question', window.sharedRoomTriviaQuestion, window.triviaQuestionCount);
                runLocalTriviaTimerPhase('question');
            })
            .catch(() => { initTriviaGame(); });
    }

    fetchUniqueQuestion();
};

function broadcastTriviaState(phase, data, count, votes = {}) {
    if (typeof channel !== 'undefined') {
        channel.send({
            type: 'broadcast',
            event: 'sync-room-trivia',
            payload: { phase, triviaData: data, count, votes }
        });
    }
}

function runLocalTriviaTimerPhase(phase) {
    if (window.triviaLocalInterval) clearInterval(window.triviaLocalInterval);
    if (window.triviaLocalTimeout) clearTimeout(window.triviaLocalTimeout);

    window.triviaCurrentPhase = phase;
    let secondsLeft = phase === 'question' ? 5 : phase === 'vote' ? 5 : 3;

    updateTriviaUI(secondsLeft);

    window.triviaLocalInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
            clearInterval(window.triviaLocalInterval);
            if (window.myPlayerNumber === 0) { 
                if (phase === 'question') {
                    broadcastTriviaState('vote', window.sharedRoomTriviaQuestion, window.triviaQuestionCount);
                    runLocalTriviaTimerPhase('vote');
                } else if (phase === 'vote') {
                    broadcastTriviaState('reveal', window.sharedRoomTriviaQuestion, window.triviaQuestionCount, window.triviaRoomVotes);
                    runLocalTriviaTimerPhase('reveal');
                } else if (phase === 'reveal') {
                    window.triviaQuestionCount++;
                    if (window.triviaQuestionCount >= 20) {
                        // Game ends automatically via evaluation below inside render updates
                    } else {
                        window.launchLiveTriviaEngine();
                    }
                }
            }
        } else {
            updateTriviaUI(secondsLeft);
        }
    }, 1000);
}

function updateTriviaUI(timerSeconds) {
    const q = window.sharedRoomTriviaQuestion;
    if (!q) return;

    const phase = window.triviaCurrentPhase;
    let statusText = phase === 'question' ? `READING TIME: ${timerSeconds}s` : phase === 'vote' ? `VOTE NOW: ${timerSeconds}s` : `REVEAL: ${timerSeconds}s`;
    let statusColor = phase === 'question' ? '#ffb703' : phase === 'vote' ? '#00b0ff' : '#00b050';
/* ============================================================
   CHASER ARCADE: FIXED TRIVIA (FADE-IN REPAIR & UNFREEZE)
   ============================================================ */

window.initTriviaGame = function() {
    window.triviaQuestionCount = 0;
    window.triviaScorePoints   = 0;
    window.triviaRoomVotes     = {};
    window.triviaSessionHistory = []; 
    
    gameCanvasContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4vw;padding:4vw;width:100%;box-sizing:border-box;height:100%;user-select:none;">
            <div style="color:#ffd700;font-size:5.5vw;font-weight:bold;font-family:Impact,sans-serif;text-shadow:2px 2px 4px rgba(0,0,0,0.5);text-align:center;letter-spacing:0.5px;">TRIVIA CATEGORY</div>
            
            <div style="position:relative;width:100%;max-width:280px;">
                <select id="triviaCategoryPicker" style="width:100%;padding:14px;font-size:4vw;font-weight:900;border-radius:10px;border:3px solid #ffd700;background:#2d6a30;color:#fff;outline:none;box-shadow:0 4px 10px rgba(0,0,0,0.3);appearance:none;text-align:center;cursor:pointer;">
                    <option value="9">General Knowledge Pool</option>
                    <option value="11">Movies & Cinema</option>
                    <option value="12">Music & Tracks</option>
                    <option value="14">Television Shows</option>
                    <option value="17">Science & Nature</option>
                    <option value="23">History Channels</option>
                </select>
                <div style="position:absolute;right:14px;top:50%;transform:translateY(-50%);pointer-events:none;color:#ffd700;font-size:4vw;">▼</div>
            </div>

            <button onclick="launchLiveTriviaEngine()" style="width:100%;max-width:280px;padding:14px;background:#ffd700;color:#1e4620;font-weight:900;font-size:5vw;border:none;border-radius:10px;cursor:pointer;font-family:Impact,sans-serif;box-shadow:0 4px 10px rgba(0,0,0,0.3);letter-spacing:0.5px;">START CAMPAIGN</button>
        </div>`;
};

window.launchLiveTriviaEngine = function() {
    const picker = document.getElementById('triviaCategoryPicker');
    const cat = picker ? picker.value : '9';
    gameCanvasContainer.innerHTML = `<div style="color:white;font-size:4.5vw;font-weight:bold;text-align:center;padding:40px;font-family:sans-serif;">Fetching synchronized question...</div>`;
    
    function fetchUniqueQuestion(attempts = 0) {
        fetch(`https://opentdb.com/api.php?amount=1&type=multiple&category=${cat}&cache=${Math.random()}`)
            .then(res => res.json())
            .then(data => {
                if(!data.results || data.results.length === 0) { initTriviaGame(); return; }
                const item = data.results[0];
                const decode = s => { let t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
                
                const questionText = decode(item.question);
                
                if (window.triviaSessionHistory.includes(questionText) && attempts < 5) {
                    fetchUniqueQuestion(attempts + 1);
                    return;
                }
                
                window.triviaSessionHistory.push(questionText);

                const correctAnswer = decode(item.correct_answer);
                let choices = item.incorrect_answers.map(ans => decode(ans));
                choices.splice(Math.floor(Math.random() * (choices.length + 1)), 0, correctAnswer);

                window.sharedRoomTriviaQuestion = { q: questionText, c: correctAnswer, choices: choices, cat: cat };
                window.triviaRoomVotes = {};

                broadcastTriviaState('question', window.sharedRoomTriviaQuestion, window.triviaQuestionCount);
                runLocalTriviaTimerPhase('question');
            })
            .catch(() => { initTriviaGame(); });
    }

    fetchUniqueQuestion();
};

function broadcastTriviaState(phase, data, count, votes = {}) {
    if (typeof channel !== 'undefined') {
        channel.send({
            type: 'broadcast',
            event: 'sync-room-trivia',
            payload: { phase, triviaData: data, count, votes }
        });
    }
}

function runLocalTriviaTimerPhase(phase) {
    if (window.triviaLocalInterval) clearInterval(window.triviaLocalInterval);
    if (window.triviaLocalTimeout) clearTimeout(window.triviaLocalTimeout);

    window.triviaCurrentPhase = phase;
    let secondsLeft = phase === 'question' ? 5 : phase === 'vote' ? 5 : 3;

    updateTriviaUI(secondsLeft);

    window.triviaLocalInterval = setInterval(() => {
        secondsLeft--;
        
        if (secondsLeft <= 0) {
            clearInterval(window.triviaLocalInterval);
            
            // UNFREEZE REMEDIAL FIX: Local client auto-advances phases independently of player number flags
            if (phase === 'question') {
                broadcastTriviaState('vote', window.sharedRoomTriviaQuestion, window.triviaQuestionCount);
                runLocalTriviaTimerPhase('vote');
            } else if (phase === 'vote') {
                broadcastTriviaState('reveal', window.sharedRoomTriviaQuestion, window.triviaQuestionCount, window.triviaRoomVotes);
                runLocalTriviaTimerPhase('reveal');
            } else if (phase === 'reveal') {
                window.triviaQuestionCount++;
                if (window.triviaQuestionCount >= 20) {
                    // Campaign completed triggers organically inside render loop
                } else {
                    window.launchLiveTriviaEngine();
                }
            }
        } else {
            updateTriviaUI(secondsLeft);
        }
    }, 1000);
}

function updateTriviaUI(timerSeconds) {
    const q = window.sharedRoomTriviaQuestion;
    if (!q) return;

    const phase = window.triviaCurrentPhase;
    let statusText = phase === 'question' ? `READING TIME: ${timerSeconds}s` : phase === 'vote' ? `VOTE NOW: ${timerSeconds}s` : `REVEAL: ${timerSeconds}s`;
    let statusColor = phase === 'question' ? '#ffb703' : phase === 'vote' ? '#00b0ff' : '#00b050';

    // FIX 1: Safety check to completely stop the missing player number freeze
    let pNum = typeof window.myPlayerNumber !== 'undefined' ? window.myPlayerNumber : 0;

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:2vw;width:100%;padding:4px;box-sizing:border-box;user-select:none;">
        <div style="display:flex;justify-content:space-between;width:100%;color:#ffd700;font-size:3.8vw;font-weight:bold;font-family:Impact,sans-serif;">
            <span>ROUND: ${window.triviaQuestionCount + 1}/20</span>
            <span style="color:${statusColor}">${statusText}</span>
            <span>SCORE: ${window.triviaScorePoints}</span>
        </div>
        <div style="background:rgba(0,0,0,0.5);padding:12px;border-radius:8px;font-size:4.8vw;color:#fff;font-weight:900;text-align:center;width:100%;box-sizing:border-box;border:2px solid #ffd700;line-height:1.2;text-shadow:1px 1px 2px #000;">${q.q}</div>
        <div style="display:flex;flex-direction:column;gap:2vw;width:100%;margin-top:2px;">`;

    q.choices.forEach((choice, index) => {
        let btnBg = '#e2f0d9';
        let btnColor = '#1e4620';
        let isDisabled = (phase !== 'vote');
        let customStyle = "";

        // FIX 2: Smoothly build visibility up over 5 seconds based on your feedback
        if (phase === 'question') {
            isDisabled = true;
            let calculatedOpacity = 1 - (timerSeconds * 0.17); 
            if (calculatedOpacity < 0.15) calculatedOpacity = 0.15;
            customStyle = `opacity: ${calculatedOpacity}; transition: opacity 0.5s ease-in-out; font-weight: 500;`;
        } else if (phase === 'vote') {
            customStyle = `font-weight: 900;`; // Turns bold instantly when voting begins
            if (window.triviaRoomVotes[pNum] === choice) {
                btnBg = '#00b0ff';
                btnColor = '#fff';
            }
        } else if (phase === 'reveal') {
            isDisabled = true;
            customStyle = `font-weight: 900;`;
            if (choice === q.c) {
                btnBg = '#00b050'; 
                btnColor = '#fff';
            } else if (window.triviaRoomVotes[pNum] === choice) {
                btnBg = '#e63946'; 
                btnColor = '#fff';
            }
        }

        // FIX 3: Pull text via element ID to completely stop apostrophes from crashing the buttons
        html += `<button class="trivia-inline-choice-btn" id="trivia-choice-${index}" ${isDisabled?'disabled':''} style="width:100%;padding:12px;background:${btnBg};color:${btnColor};border:none;border-radius:6px;font-size:3.8vw;text-align:left;box-shadow:0 2px 4px rgba(0,0,0,0.2);${customStyle}" onclick="submitLocalTriviaVote(document.getElementById('trivia-choice-${index}').innerText)" >${choice}</button>`;
    });
    
    html += `</div></div>`;

    if (phase === 'reveal' && window.triviaQuestionCount >= 19 && timerSeconds === 1) {
        setTimeout(() => {
            gameCanvasContainer.innerHTML = `
                <div style="text-align:center;padding:20px;user-select:none;">
                    <h2 style="color:#ffd700;font-family:Impact;font-size:7vw;text-shadow:2px 2px 4px rgba(0,0,0,0.5);">CAMPAIGN COMPLETED</h2>
                    <div style="font-size:12vw;font-weight:900;color:white;margin:12px 0;font-family:Impact;">${window.triviaScorePoints} / 20</div>
                    <button onclick="initTriviaGame()" style="padding:12px 24px;font-size:4.5vw;background:#ffd700;color:#1e4620;border:none;border-radius:8px;font-weight:900;cursor:pointer;font-family:Impact,sans-serif;">NEW GAME</button>
                </div>`;
        }, 1000);
    } else {
        gameCanvasContainer.innerHTML = html;
    }
}

window.submitLocalTriviaVote = function(choice) {
    if (window.triviaCurrentPhase !== 'vote') return;
    
    // Safety check fallback matching your UI lookup logic above
    let pNum = typeof window.myPlayerNumber !== 'undefined' ? window.myPlayerNumber : 0;
    
    window.triviaRoomVotes[pNum] = choice;
    if (choice === window.sharedRoomTriviaQuestion.c) {
        window.triviaScorePoints++;
    }
    broadcastTriviaState('vote', window.sharedRoomTriviaQuestion, window.triviaQuestionCount, window.triviaRoomVotes);
    updateTriviaUI(5);
};
   


/* ═══════════════════════════════════════════════════════════
   5.  SOLITAIRE ENGINE (95% GIANT FULL-BODY BACKGROUND SUITS)
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
    const screenW = Math.min(window.innerWidth - 16, 335);
    const cardW = Math.floor(screenW / 7.6);
    const cardH = Math.floor(cardW * 1.35); 
    
    let html = `<div style="display:flex;flex-direction:column;gap:8px;width:100%;box-sizing:border-box;padding:2px;user-select:none;">`;
    html += `<div style="display:flex;justify-content:space-between;width:100%;">`;
    
    // Draw trigger deck
    html += `<div onclick="drawSolitaireCard()" style="width:${cardW}px;height:${cardH}px;border-radius:5px;background:linear-gradient(135deg,#222,#111);border:2px solid #ffd700;display:flex;align-items:center;justify-content:center;color:#ffd700;font-size:4vw;cursor:pointer;box-sizing:border-box;">
        ${window.solDeck.length ? '⚡' : '↻'}
    </div>`;

    const topWaste = window.solWaste[window.solWaste.length - 1];
    let wasteSel = (window.solSelected && window.solSelected.type === 'waste') ? 'outline:2.5px solid #ffd700;outline-offset:-2.5px;' : 'border:1px solid #777;';
    
    // Waste Stack Card: 95% Giant Emblem Centered Backing + White Traced Font Layer
    html += `<div onclick="selectSolitaireWaste()" style="width:${cardW}px;height:${cardH}px;border-radius:5px;background:${topWaste?'#fff':'rgba(0,0,0,0.2)'};color:${topWaste?.isRed?'#e63946':'#111'};${wasteSel}display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;box-sizing:border-box;overflow:hidden;">
        ${topWaste ? `
            <span style="font-size:9.5vw;position:absolute;color:${topWaste.isRed?'#e63946':'#111'};opacity:1;z-index:1;top:50%;left:50%;transform:translate(-50%,-50%);width:100%;text-align:center;line-height:1;">${topWaste.s}</span>
            <span style="z-index:2;color:${topWaste.isRed?'#e63946':'#111'};font-size:5vw;font-weight:900;font-family:Impact;text-shadow:-1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff;line-height:1;">${topWaste.r}</span>` : ''}
    </div>`;

    html += `<div style="flex-grow:1;"></div>`;

    for (let i = 0; i < 4; i++) {
        const fPile = window.solFoundations[i];
        const topF = fPile[fPile.length - 1];
        html += `<div onclick="targetSolitaireFoundation(${i})" style="width:${cardW}px;height:${cardH}px;border-radius:5px;background:${topF?'#fff':'rgba(255,255,255,0.05)'};border:1.5px dashed rgba(255,215,0,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;box-sizing:border-box;overflow:hidden;">
            ${topF ? `
                <span style="font-size:9.5vw;position:absolute;color:${topF.isRed?'#e63946':'#111'};opacity:1;z-index:1;top:50%;left:50%;transform:translate(-50%,-50%);width:100%;text-align:center;line-height:1;">${topF.s}</span>
                <span style="z-index:2;color:${topF.isRed?'#e63946':'#111'};font-size:5vw;font-weight:900;font-family:Impact;text-shadow:-1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff;line-height:1;">${topF.r}</span>` : '<span style="color:rgba(255,255,255,0.15);font-size:3.5vw;font-weight:900;">A</span>'}
        </div>`;
    }
    html += `</div>`; 

    // UNIFIED COLUMN CARDS RE-ENGINEERING: Packs cards sequentially downwards onto a clean single layout matrix
    html += `<div style="display:flex;width:100%;justify-content:space-between;align-items:flex-start;min-height:280px;padding-top:4px;">`;
    for (let c = 0; c < 7; c++) {
        const colCards = window.solTableau[c];
        
        // EMPTY TARGET CATCHER: Builds interactive dashed boxes if column sets dry out completely to receive Kings
        html += `<div onclick="targetSolitaireColumn(${c})" style="display:flex;flex-direction:column;width:${cardW}px;min-height:${cardH}px;border-radius:5px;background:${colCards.length?'transparent':'rgba(255,255,255,0.03)'};border:${colCards.length?'none':'1.5px dashed rgba(255,215,0,0.25)'};position:relative;box-sizing:border-box;">`;
        
        colCards.forEach((card, idx) => {
            const isSel = (window.solSelected && window.solSelected.type === 'tableau' && window.solSelected.col === c && window.solSelected.idx === idx);
            
            // Tight overlaps: compresses cards smoothly into unified, clear cascades
            let verticalOffset = 0;
            for (let k = 0; k < idx; k++) {
                verticalOffset += colCards[k].open ? 18 : 6;
            }

            let style = `width:100%;height:${cardH}px;border-radius:5px;position:${idx===0?'relative':'absolute'};margin-top:${idx===0?0:verticalOffset}px;box-sizing:border-box;overflow:hidden;`;
            
            if (!card.open) {
                html += `<div style="${style}background:linear-gradient(135deg,#222,#111);border:1px solid #ffd700;display:flex;align-items:center;justify-content:center;color:#ffd700;font-size:3.2vw;">⚡</div>`;
            } else {
                let cardBorder = isSel ? 'outline:2.5px solid #ffd700;outline-offset:-2.5px;' : 'border:1px solid #777;';
                // FIXED INTERACTION WIRE: Tap listeners hook directly into visible cards instead of covered face-downs
                html += `<div onclick="event.stopPropagation(); selectSolitaireCard(${c}, ${idx})" style="${style}background:#fff;color:${card.isRed?'#e63946':'#111'};${cardBorder}display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;">
                    <span style="font-size:9.5vw;position:absolute;color:${card.isRed?'#e63946':'#111'};opacity:1;z-index:1;top:50%;left:50%;transform:translate(-50%,-50%);width:100%;text-align:center;line-height:1;">${card.s}</span>
                    <span style="z-index:2;color:${card.isRed?'#e63946':'#111'};font-size:5vw;font-weight:900;font-family:Impact;text-shadow:-1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff;line-height:1;">${card.r}</span>
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
    // WASTE REDIRECTION TUNNEL: Intercepts active waste nodes to merge them safely down into stacks
    if (window.solSelected.type === 'waste') {
        movingCards = [window.solWaste[window.solWaste.length - 1]];
    } else {
        movingCards = window.solTableau[window.solSelected.col].slice(window.solSelected.idx);
    }

    if (!movingCards || movingCards.length === 0 || !movingCards[0]) {
        window.solSelected = null;
        return;
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
    if (!window.solSelected || (window.solSelected.type === 'tableau' && window.solSelected.idx !== window.solTableau[window.solSelected.col].length - 1)) return;
    
    let card = (window.solSelected.type === 'waste') 
        ? window.solWaste[window.solWaste.length - 1] 
        : window.solTableau[window.solSelected.col][window.solSelected.idx];
        
    if (!card) return;
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
            gameCanvasContainer.innerHTML = `<div style="text-align:center;padding:20px;color:#ffd700;font-family:Impact;font-size:7vw;">👑 SOLITAIRE VICTORY!</div>`;
        }, 300);
    }
}

/* ═══════════════════════════════════════════════════════════
   6.  HANGMAN ENGINE
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
    
    return `<svg viewBox="0 0 120 120" width="105" height="105" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
        <style>@keyframes hangShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}</style>
        <line x1="15" y1="115" x2="105" y2="115" stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>
        <line x1="35" y1="115" x2="35"  y2="12"  stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>
        <line x1="35" y1="12"  x2="80"  y2="12"  stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>
        <line x1="80" y1="12"  x2="80"  y2="28"  stroke="#ffd700" stroke-width="3" stroke-linecap="round"/>
        <g ${shake} transform-origin="80 34">
            ${p.head?`<circle cx="80" cy="36" r="9" stroke="${bodyColor}" stroke-width="3" fill="none"/>`:'' }
            ${p.head&&dying?`<text x="74" y="40" font-size="10" font-weight="bold" fill="${bodyColor}">xx</text>`
              :p.head?`<circle cx="77" cy="33" r="1" fill="${bodyColor}"/><circle cx="83" cy="33" r="1" fill="${bodyColor}"/><path d="M77 41 Q80 43 83 41" stroke="${bodyColor}" stroke-width="1.5" fill="none"/>`:'' }
            ${p.body  ?`<line x1="80" y1="45" x2="80" y2="80" stroke="${bodyColor}" stroke-width="3" stroke-linecap="round"/>`:'' }
            ${p.leftA ?`<line x1="80" y1="52" x2="62" y2="66" stroke="${bodyColor}" stroke-width="3" stroke-linecap="round"/>`:'' }
            ${p.rightA?`<line x1="80" y1="52" x2="98" y2="66" stroke="${bodyColor}" stroke-width="3" stroke-linecap="round"/>`:'' }
            ${p.leftL ?`<line x1="80" y1="80" x2="65" y2="104" stroke="${bodyColor}" stroke-width="3" stroke-linecap="round"/>`:'' }
            ${p.rightL?`<line x1="80" y1="80" x2="95" y2="104" stroke="${bodyColor}" stroke-width="3" stroke-linecap="round"/>`:'' }
        </g>
    </svg>`;
}

function renderHangmanGame() {
    const state = window.hangmanState;
    if(!state || !state.word) return;
    
    let isWin = state.word.split('').every(l => state.guessed.includes(l));
    let isLose = state.wrong >= state.maxWrong;

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:100%;box-sizing:border-box;user-select:none;">`;
    html += `<div style="width:100%;max-height:105px;overflow:hidden;">${buildHangmanSVG(state.wrong, state.dying || isLose)}</div>`;

    html += `<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:4px 0;">`;
    state.word.split('').forEach(letter => {
        const revealed = state.guessed.includes(letter) || isLose;
        html += `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
            <div style="font-size:6vw;font-weight:900;color:${revealed?(isLose && !state.guessed.includes(letter)?'#dc3545':'#ffd700'):'transparent'};min-width:22px;text-align:center;font-family:Impact,sans-serif;line-height:1;">${letter}</div>
            <div style="width:22px;height:3.5px;background:#e2f0d9;border-radius:2px;"></div>
        </div>`;
    });
    html += `</div>`;

    if (isWin) {
        html += `<div style="color:#00b050;font-size:4.5vw;font-weight:bold;text-align:center;">🎉 YOU GOT IT!</div>
            <button onclick="initHangmanGame()" style="background:#ffd700;color:#1e4620;border:none;border-radius:6px;padding:10px 22px;font-size:3.8vw;font-weight:900;cursor:pointer;margin-top:2px;font-family:Impact,sans-serif;">NEW GAME</button>`;
    } else if (isLose) {
        html += `<div style="color:#dc3545;font-size:4.2vw;font-weight:bold;text-align:center;">💀 GAME OVER</div>
            <button onclick="initHangmanGame()" style="background:#ffd700;color:#1e4620;border:none;border-radius:6px;padding:10px 22px;font-size:3.8vw;font-weight:900;cursor:pointer;margin-top:2px;font-family:Impact,sans-serif;">RETRY</button>`;
    } else {
        html += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;width:100%;max-width:320px;padding:2px 0;">`;
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
            const used = state.guessed.includes(letter);
            const isWrong = used && !state.word.includes(letter);
            const isRight = used && state.word.includes(letter);
            html += `<button onclick="handleHangmanClick('${letter}')" ${used?'disabled':''}
                style="width:100%;height:32px;border-radius:4px;border:none;font-weight:900;font-size:3.8vw;
                cursor:${used?'default':'pointer'};
                background:${isWrong?'#dc3545':isRight?'#00b050':'#e2f0d9'};
                color:${used?'white':'#1e4620'};opacity:${used?0.4:1};box-shadow:0 2px 4px rgba(0,0,0,0.15);font-family:Impact,sans-serif;">
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

