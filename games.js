/* ============================================================
   CHASER ARCADE ENGINE  –  games.js  (complete, single file)
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
    if (p.type === 'seq-join')  { handleSeqPlayerJoin(p); return; }
    if (p.type === 'seq-start') { handleSeqStart(p); return; }
    window.seqBoard     = p.boardState;
    window.seqTurn      = p.turnState;
    window.seqSequences = p.sequenceScores;
    if (p.newCard && window.seqMyColor) window.seqHands[window.seqMyColor].push(p.newCard);
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
    window.seqMyColor               = null;
    window.seqGameStarted           = false;
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
    const board   = window.syncCheckersBoard;
    const sel     = window.selectedCheckerIdx;
    const turn    = window.checkersTurn;
    const boardPx = Math.min(330, Math.floor((window.innerWidth - 32) * 0.95));
    const cellPx  = Math.floor(boardPx / 8);
    const piecePx = Math.floor(cellPx * 0.80);

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;padding:4px;box-sizing:border-box;">
        <div style="color:#ffd700;font-weight:bold;font-size:16px;margin-bottom:2px;font-family:Impact,sans-serif;">
            ${turn===1?'🔴 RED TURN':'⚫ BLACK TURN'}${window.consecutiveJumpsActive?' — DOUBLE JUMP!':''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(8,${cellPx}px);grid-template-rows:repeat(8,${cellPx}px);border:4px solid #ffd700;border-radius:8px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.5);">`;

    for (let i = 0; i < 64; i++) {
        const r = Math.floor(i/8), c = i%8;
        const isDark  = (r+c)%2===1;
        const piece   = board[i];
        const bgColor = isDark ? '#2d6a30' : '#e2f0d9';
        let pieceHtml = '';
        if (piece===1) pieceHtml=`<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff6b6b,#c00);border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>`;
        if (piece===2) pieceHtml=`<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#555,#111);border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>`;
        if (piece===3) pieceHtml=`<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff6b6b,#c00);border:3px solid #ffd700;display:flex;align-items:center;justify-content:center;font-size:${Math.floor(cellPx*0.4)}px;">👑</div>`;
        if (piece===4) pieceHtml=`<div style="width:${piecePx}px;height:${piecePx}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#555,#111);border:3px solid #ffd700;display:flex;align-items:center;justify-content:center;font-size:${Math.floor(cellPx*0.4)}px;">👑</div>`;
        html+=`<div onclick="handleCheckerTap(${i})" style="width:${cellPx}px;height:${cellPx}px;background:${bgColor};display:flex;align-items:center;justify-content:center;cursor:pointer;box-sizing:border-box;${sel===i?'outline:4px solid #ffd700;outline-offset:-4px;':''}">
            ${pieceHtml}
        </div>`;
    }
    html += `</div></div>`;
    gameCanvasContainer.innerHTML = html;
}

function getCheckerMoves(idx, board, turn, jumpOnly) {
    const piece=board[idx]; if(!piece) return [];
    const isRed=piece===1||piece===3, isKing=piece===3||piece===4;
    const enemy=isRed?[2,4]:[1,3];
    const r=Math.floor(idx/8), c=idx%8, dirs=[];
    if(!isRed||isKing) dirs.push([-1,-1],[-1,1]);
    if(isRed||isKing)  dirs.push([1,-1],[1,1]);
    const moves=[];
    dirs.forEach(([dr,dc])=>{
        const nr=r+dr,nc=c+dc,ni=nr*8+nc;
        if(nr<0||nr>7||nc<0||nc>7) return;
        if(!board[ni]&&!jumpOnly){moves.push(ni);return;}
        if(enemy.includes(board[ni])){const jr=nr+dr,jc=nc+dc,ji=jr*8+jc;if(jr>=0&&jr<=7&&jc>=0&&jc<=7&&!board[ji])moves.push(ji);}
    });
    return moves;
}

window.handleCheckerTap = function(idx) {
    const board=window.syncCheckersBoard,turn=window.checkersTurn,piece=board[idx],owned=turn===1?[1,3]:[2,4];
    if(window.selectedCheckerIdx===null){
        if(owned.includes(piece)){if(window.consecutiveJumpsActive&&idx!==window.lastJumpDestinationIdx)return;window.selectedCheckerIdx=idx;renderCheckersGrid();}
        return;
    }
    const from=window.selectedCheckerIdx,moves=getCheckerMoves(from,board,turn,window.consecutiveJumpsActive);
    if(!moves.includes(idx)){
        if(owned.includes(piece)&&!window.consecutiveJumpsActive){window.selectedCheckerIdx=idx;renderCheckersGrid();}
        else if(!window.consecutiveJumpsActive){window.selectedCheckerIdx=null;renderCheckersGrid();}
        return;
    }
    const isJump=Math.abs(idx-from)>10;
    board[idx]=board[from];board[from]=0;
    if(isJump) board[Math.floor((from+idx)/2)]=0;
    const destRow=Math.floor(idx/8);
    if(board[idx]===1&&destRow===7) board[idx]=3;
    if(board[idx]===2&&destRow===0) board[idx]=4;
    let hasMore=false;
    if(isJump){const extra=getCheckerMoves(idx,board,turn,true);if(extra.length>0){hasMore=true;window.consecutiveJumpsActive=true;window.lastJumpDestinationIdx=idx;window.selectedCheckerIdx=idx;}}
    if(!hasMore){window.selectedCheckerIdx=null;window.consecutiveJumpsActive=false;window.checkersTurn=turn===1?2:1;}
    if(typeof channel!=='undefined') channel.send({type:'broadcast',event:'checkers-sync-move',payload:{boardState:board,activeTurn:window.checkersTurn,consecutiveActive:window.consecutiveJumpsActive}});
    renderCheckersGrid();
};

/* ═══════════════════════════════════════════════════════════
   2.  UNO
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
    const colors=['Red','Yellow','Green','Blue'];
    window.unoDeckState=[];
    colors.forEach(c=>{
        window.unoDeckState.push({color:c,value:'0'});
        ['1','2','3','4','5','6','7','8','9','Skip','⇋','+2'].forEach(v=>{
            window.unoDeckState.push({color:c,value:v});
            window.unoDeckState.push({color:c,value:v});
        });
    });
    for(let i=0;i<4;i++){window.unoDeckState.push({color:'Wild',value:'Wild'});window.unoDeckState.push({color:'Wild',value:'+4'});}
    window.unoDeckState.sort(()=>Math.random()-0.5);
    window.unoNumPlayers=numPlayers;window.unoCurrentPlayer=0;window.unoDirection=1;
    window.unoWildChoosingActive=false;window.unoWildPendingIdx=null;
    window.unoHands=[];
    for(let p=0;p<numPlayers;p++){window.unoHands.push([]);for(let i=0;i<7;i++)window.unoHands[p].push(window.unoDeckState.pop());}
    let startCard;
    do{startCard=window.unoDeckState.pop();}while(startCard.value==='Wild'||startCard.value==='+4');
    window.unoDiscardPile=startCard;
    triggerUnoNetworkSync();
    renderUnoLayout();
};

function triggerUnoNetworkSync(){
    if(typeof channel!=='undefined') channel.send({type:'broadcast',event:'uno-sync-discard',payload:{currentDiscard:window.unoDiscardPile,turn:window.unoCurrentPlayer,hands:window.unoHands,deck:window.unoDeckState,direction:window.unoDirection}});
}

function unoColorClass(color){return{Red:'uno-card-red',Yellow:'uno-card-yellow',Green:'uno-card-green',Blue:'uno-card-blue',Wild:'uno-card-wild'}[color]||'uno-card-wild';}
function unoFaceLabel(value){if(value==='Wild')return'★';return value;}

function renderUnoLayout(){
    const discard=window.unoDiscardPile,cp=window.unoCurrentPlayer,hand=window.unoHands[cp]||[];
    let html=`<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:4px;width:100%;box-sizing:border-box;">`;
    html+=`<div style="background:#2d6a30;border-radius:6px;padding:4px 16px;color:#ffd700;font-size:16px;font-weight:900;font-family:Impact,sans-serif;">🎴 PLAYER ${cp+1} TURN</div>`;
    html+=`<div style="display:flex;gap:24px;align-items:flex-end;margin-top:2px;">`;
    html+=`<div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
        <div style="color:#a3cfbb;font-size:11px;font-weight:bold;">DRAW</div>
        <div onclick="unoDrawCard()" class="uno-card-body" style="background:linear-gradient(135deg,#1a1a1a,#3a3a3a);border:3px solid #ffd700;cursor:pointer;width:58px;height:86px;overflow:hidden;">
            <div class="uno-oval-center" style="background:rgba(255,255,255,0.08);"></div>
            <div class="uno-number-label" style="font-size:18px;font-weight:900;font-style:italic;color:#fff;transform:rotate(-20deg);font-family:Impact,sans-serif;">UNO</div>
        </div>
    </div>`;
    const dfs=(discard.value==='Skip'||discard.value==='+2'||discard.value==='+4')?'22px':'36px';
    html+=`<div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
        <div style="color:#a3cfbb;font-size:11px;font-weight:bold;">PLAY</div>
        <div class="uno-card-body ${unoColorClass(discard.color)}" style="pointer-events:none;width:58px;height:86px;overflow:hidden;">
            <div class="uno-oval-center"></div>
            <div class="uno-number-label" style="font-size:${dfs};text-shadow:2px 2px 0 rgba(0,0,0,0.4);max-width:52px;text-align:center;overflow:hidden;">${unoFaceLabel(discard.value)}</div>
        </div>
    </div>`;
    html+=`</div>`;
    if(window.unoWildChoosingActive){
        html+=`<div style="display:grid;grid-template-columns:1fr 1fr;width:90px;height:90px;border-radius:10px;overflow:hidden;border:3px solid #fff;margin:4px 0;">
            ${['Red','Yellow','Green','Blue'].map(col=>`<div onclick="unoPickWildColor('${col}')" style="background:${{Red:'#c00',Yellow:'#ffb703',Green:'#00b050',Blue:'#00b0ff'}[col]};cursor:pointer;"></div>`).join('')}
        </div>`;
    }
    if(window.unoNumPlayers>1){
        html+=`<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">`;
        for(let p=0;p<window.unoNumPlayers;p++){if(p===cp)continue;html+=`<div style="background:rgba(255,255,255,0.1);border-radius:6px;padding:3px 9px;color:#e2f0d9;font-size:11px;font-weight:bold;">P${p+1}: ${window.unoHands[p].length} cards</div>`;}
        html+=`</div>`;
    }
    html+=`<div style="color:#e2f0d9;font-size:11px;font-weight:bold;align-self:flex-start;padding-left:4px;">Player ${cp+1}'s Hand</div>
    <div style="display:flex;gap:6px;overflow-x:auto;padding:8px 4px 10px 4px;width:100%;box-sizing:border-box;-webkit-overflow-scrolling:touch;" id="unoHandScrollWrapper">`;
    hand.forEach((card,i)=>{
        const playable=card.color===discard.color||card.value===discard.value||card.color==='Wild';
        const cfs=(card.value==='Skip'||card.value==='+2'||card.value==='+4')?'20px':'34px';
        html+=`<div onclick="unoPlayCard(${i})" class="uno-card-body ${unoColorClass(card.color)}" style="flex-shrink:0;width:52px;height:78px;font-size:${cfs};overflow:hidden;opacity:${playable?1:0.65};cursor:pointer;transform:${playable?'translateY(-4px)':'none'};transition:transform 0.15s;">
            <div class="uno-oval-center"></div>
            <div class="uno-number-label" style="max-width:46px;text-align:center;overflow:hidden;text-shadow:2px 2px 0 rgba(0,0,0,0.4);">${unoFaceLabel(card.value)}</div>
        </div>`;
    });
    html+=`</div></div>`;
    gameCanvasContainer.innerHTML=html;
    setTimeout(()=>{const el=document.getElementById('unoHandScrollWrapper');if(el)el.scrollTo({left:el.scrollWidth,behavior:'smooth'});},100);
}

window.unoPlayCard=function(idx){
    const cp=window.unoCurrentPlayer,card=window.unoHands[cp][idx],discard=window.unoDiscardPile;
    const playable=card.color===discard.color||card.value===discard.value||card.color==='Wild';
    if(!playable||window.unoWildChoosingActive)return;
    if(card.color==='Wild'||card.value==='+4'){window.unoWildPendingIdx=idx;window.unoWildChoosingActive=true;renderUnoLayout();return;}
    window.unoHands[cp].splice(idx,1);
    window.unoDiscardPile=card;
    const numP=window.unoNumPlayers;
    let skipNext=false;
    if(card.value==='⇋'){window.unoDirection*=-1;if(numP===2)skipNext=true;}
    if(card.value==='Skip')skipNext=true;
    if(card.value==='+2'){const t=(cp+window.unoDirection+numP)%numP;window.unoHands[t].push(window.unoDeckState.pop(),window.unoDeckState.pop());skipNext=true;}
    window.unoCurrentPlayer=(cp+(skipNext?window.unoDirection*2:window.unoDirection)+numP)%numP;
    if(!window.unoHands[cp].length){gameCanvasContainer.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;height:100%;padding:20px;text-align:center;"><div style="font-size:52px;">🎉</div><div style="color:#ffd700;font-size:26px;font-weight:900;">Player ${cp+1} wins!</div><button onclick="initChaserUnoGame()" style="background:#2d6a30;color:white;border:none;border-radius:8px;padding:12px 28px;font-size:15px;font-weight:bold;cursor:pointer;">Play Again</button></div>`;return;}
    triggerUnoNetworkSync();
    if(numP>1)showUnoPassScreen();else renderUnoLayout();
};

window.unoPickWildColor=function(color){
    const cp=window.unoCurrentPlayer,idx=window.unoWildPendingIdx,wasD4=window.unoHands[cp][idx].value==='+4';
    window.unoHands[cp].splice(idx,1);
    window.unoDiscardPile={color,value:wasD4?'+4':'Wild'};
    window.unoWildChoosingActive=false;
    const numP=window.unoNumPlayers;
    if(wasD4){const t=(cp+window.unoDirection+numP)%numP;for(let i=0;i<4;i++)window.unoHands[t].push(window.unoDeckState.pop());window.unoCurrentPlayer=(cp+window.unoDirection*2+numP)%numP;}
    else{window.unoCurrentPlayer=(cp+window.unoDirection+numP)%numP;}
    triggerUnoNetworkSync();
    if(numP>1)showUnoPassScreen();else renderUnoLayout();
};

window.unoDrawCard=function(){
    const cp=window.unoCurrentPlayer,numP=window.unoNumPlayers;
    window.unoHands[cp].push(window.unoDeckState.pop());
    window.unoCurrentPlayer=(cp+window.unoDirection+numP)%numP;
    triggerUnoNetworkSync();
    if(numP>1)showUnoPassScreen();else renderUnoLayout();
};

function showUnoPassScreen(){
    const next=window.unoCurrentPlayer;
    gameCanvasContainer.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;height:100%;padding:20px;text-align:center;">
        <div style="font-size:40px;">📱</div>
        <div style="color:#ffd700;font-size:18px;font-weight:900;">Pass to Player ${next+1}</div>
        <div style="color:#a3cfbb;font-size:12px;">Only Player ${next+1} should tap below</div>
        <button onclick="renderUnoLayout()" style="background:#2d6a30;color:white;border:none;border-radius:8px;padding:14px 32px;font-size:16px;font-weight:bold;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.3);">I'm Player ${next+1} — Show My Hand</button>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════
   3.  SEQUENCE  — correct board, chat-multiplayer only
   ═══════════════════════════════════════════════════════════ */

/* Official Sequence board — each non-Jack card appears exactly
   twice, four FREE corners. Jacks are wild (not on board).    */
const SEQ_GRID = [
    'FREE','2♠', '3♠', '4♠', '5♠', '6♠', '7♠', '8♠', '9♠', 'FREE',
    '6♣',  'A♦', 'K♦', 'Q♦', 'J♦', '10♦','9♦', '8♦', '7♦', '10♠',
    '5♣',  'Q♥', 'A♠', '2♥', '3♥', '4♥', '5♥', '6♥', '6♦', 'J♠',
    '4♣',  'J♥', 'K♠', 'A♥', '2♣', '3♣', '4♣', '7♥', '5♦', 'Q♠',
    '3♣',  '10♥','Q♠', 'K♥', 'K♣', 'Q♣', '5♣', '8♥', '4♦', 'K♠',
    '2♣',  '9♥', 'J♠', 'A♠', 'A♣', 'J♣', '6♣', '9♥', '3♦', 'A♠',
    'A♥',  '8♥', '10♠','K♠', 'Q♠', 'J♠', '10♠','10♥','2♦', '2♠',
    'K♥',  '7♥', '9♠', '8♠', '7♠', '6♠', '5♠', '4♠', 'A♦', '3♠',
    'Q♥',  '6♥', '5♥', '4♥', '3♥', '2♥', 'A♥', 'K♥', 'Q♥', '4♠',
    'FREE','J♥', '10♥','9♥', '8♥', '7♥', '6♥', '5♥', '4♥', 'FREE'
];

const SEQ_IS_RED = l => l.includes('♥') || l.includes('♦');

function buildSeqDeckPool() {
    const suits=['♠','♣','♥','♦'], ranks=['A','2','3','4','5','6','7','8','9','10','Q','K'];
    const deck=[];
    suits.forEach(s=>ranks.forEach(r=>{deck.push(r+s);deck.push(r+s);}));
    return deck.sort(()=>Math.random()-0.5);
}

function initSequenceGame() {
    window.seqBoard        = Array(100).fill(0);
    window.seqTurn         = 1;
    window.seqSequences    = [0,0];
    window.seqDeck         = buildSeqDeckPool();
    window.seqHands        = {1:[],2:[]};
    window.seqMyColor      = null;
    window.seqOpponentId   = null;
    window.seqGameStarted  = false;
    window.seqSelectedCard = null;

    // Broadcast join request; first player claims blue (1), second gets green (2)
    if (typeof channel !== 'undefined') {
        channel.send({type:'broadcast',event:'sequence-sync-state',payload:{type:'seq-join',riderId:myId}});
    }
    renderSeqLobby();
}

function renderSeqLobby() {
    const myColor = window.seqMyColor;
    const dot     = myColor ? `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${myColor===1?'#6ab0ff':'#7dcc8a'};border:2px solid #fff;vertical-align:middle;margin-right:6px;"></span>` : '';
    const msg     = myColor
        ? `${dot}You are <b>${myColor===1?'Blue':'Green'}</b>. Waiting for opponent…`
        : 'Waiting for a chat buddy to join…';
    gameCanvasContainer.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;height:100%;padding:24px;text-align:center;">
        <div style="font-size:38px;">🎯</div>
        <div style="color:#ffd700;font-size:20px;font-weight:900;font-family:Impact,sans-serif;">SEQUENCE</div>
        <div style="color:#e2f0d9;font-size:14px;line-height:1.6;">${msg}</div>
        <div style="color:#a3cfbb;font-size:12px;">Both players must be in the same chat room.<br>Colors are assigned automatically — no switching.</div>
    </div>`;
}

function handleSeqPlayerJoin(p) {
    if (p.riderId === myId) {
        // Our own echo — we are the first player, claim blue
        if (window.seqMyColor === null) {
            window.seqMyColor = 1;
            renderSeqLobby();
        }
        return;
    }
    // Opponent joined
    window.seqOpponentId = p.riderId;
    if (window.seqMyColor === null) {
        // We haven't claimed a color yet — we're second, take green
        window.seqMyColor = 2;
    }
    if (!window.seqGameStarted) {
        // Deal hands — whoever sees both join messages starts the game
        window.seqHands[1] = Array(7).fill(0).map(()=>window.seqDeck.pop());
        window.seqHands[2] = Array(7).fill(0).map(()=>window.seqDeck.pop());
        window.seqGameStarted = true;
        if (typeof channel !== 'undefined') {
            channel.send({type:'broadcast',event:'sequence-sync-state',payload:{
                type:'seq-start',
                boardState:window.seqBoard,
                turnState:window.seqTurn,
                sequenceScores:window.seqSequences,
                hand1:window.seqHands[1],
                hand2:window.seqHands[2]
            }});
        }
        renderSequenceBoard();
    }
}

function handleSeqStart(p) {
    window.seqBoard        = p.boardState;
    window.seqTurn         = p.turnState;
    window.seqSequences    = p.sequenceScores;
    window.seqGameStarted  = true;
    if (window.seqMyColor === null) window.seqMyColor = 1;
    window.seqHands[window.seqMyColor] = p[`hand${window.seqMyColor}`] || [];
    if (activeGameStage.classList.contains('open') && activeGameLabelTitle.innerText.includes('Sequence')) renderSequenceBoard();
}

function triggerSeqSync(extra={}) {
    if (typeof channel !== 'undefined') {
        channel.send({type:'broadcast',event:'sequence-sync-state',payload:{
            boardState:window.seqBoard,
            turnState:window.seqTurn,
            sequenceScores:window.seqSequences,
            ...extra
        }});
    }
}

function renderSequenceBoard() {
    if (!window.seqGameStarted || !window.seqMyColor) { renderSeqLobby(); return; }

    const board    = window.seqBoard;
    const myColor  = window.seqMyColor;
    const isMyTurn = window.seqTurn === myColor;
    const sel      = window.seqSelectedCard;
    const hand     = window.seqHands[myColor] || [];
    const chipCol  = myColor===1 ? '#1a6fd4' : '#2d8c3c';
    const myName   = myColor===1 ? '🔵 Blue' : '🟢 Green';

    /* Board sizing — gap:1px + dark bg between cells = card-on-table look */
    const boardW  = Math.min(window.innerWidth - 14, 346);
    const cellPx  = Math.floor((boardW - 12) / 10);
    const totalW  = cellPx * 10 + 11;

    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:100%;box-sizing:border-box;padding:2px;">`;

    /* Turn header */
    html += `<div style="font-size:13px;font-weight:900;font-family:Impact,sans-serif;">
        ${isMyTurn
            ? `<span style="color:#ffd700;">${myName} — YOUR TURN</span>`
            : `<span style="color:#a3cfbb;">Opponent's turn…</span>`}
        &nbsp;<span style="font-size:10px;color:#e2f0d9;font-family:sans-serif;">🔵${window.seqSequences[0]} 🟢${window.seqSequences[1]}</span>
    </div>`;

    /* Board grid — 1px gaps, dark bg shows through, each cell is a white mini-card */
    html += `<div style="display:grid;grid-template-columns:repeat(10,${cellPx}px);gap:1px;background:#1a3a1a;padding:1px;border:2px solid #ffd700;border-radius:5px;width:${totalW}px;flex-shrink:0;">`;

    for (let i = 0; i < 100; i++) {
        const label  = SEQ_GRID[i];
        const isFree = label === 'FREE';
        const chip   = board[i];
        const isRed  = SEQ_IS_RED(label);
        /* Subtle highlight: just a barely-there warm tint — no dark overlay */
        const cardMatch = isMyTurn && sel !== null && !chip && !isFree && hand[sel] === label;
        let bg;
        if (isFree)       bg = '#1e4620';
        else if (chip===1) bg = '#1a6fd4';
        else if (chip===2) bg = '#2d8c3c';
        else               bg = cardMatch ? 'rgba(255,238,180,0.7)' : '#ffffff';

        const fs  = cellPx <= 26 ? 5 : 6;
        const col = isRed ? '#c00' : '#111';

        let inner = '';
        if (isFree) {
            inner = `<span style="color:#ffd700;font-size:${fs+2}px;line-height:1;">★</span>`;
        } else if (chip===1 || chip===2) {
            const cL = chip===1 ? '#6ab0ff' : '#7dcc8a';
            const cD = chip===1 ? '#1a6fd4' : '#2d8c3c';
            inner = `<div style="width:${Math.floor(cellPx*0.68)}px;height:${Math.floor(cellPx*0.68)}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,${cL},${cD});border:1px solid rgba(255,255,255,0.8);"></div>`;
        } else {
            const num  = label.replace(/[♠♣♥♦]/g,'');
            const suit = label.replace(/[^♠♣♥♦]/g,'');
            inner = `<div style="width:100%;height:100%;position:relative;box-sizing:border-box;">
                <span style="position:absolute;top:1px;left:1px;font-size:${fs}px;font-weight:900;color:${col};line-height:1;">${num}</span>
                <span style="position:absolute;bottom:0;right:1px;font-size:${fs+1}px;color:${col};line-height:1;">${suit}</span>
            </div>`;
        }

        html += `<div onclick="handleSeqCellTap(${i})" style="width:${cellPx}px;height:${cellPx}px;background:${bg};border-radius:2px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-sizing:border-box;overflow:hidden;${cardMatch?'outline:1px solid rgba(255,200,50,0.5);':''}">
            ${inner}
        </div>`;
    }
    html += `</div>`;

    /* Tiny color dot — no label */
    html += `<div style="width:7px;height:7px;border-radius:50%;background:${chipCol};border:1px solid rgba(255,255,255,0.5);align-self:flex-start;margin-left:3px;flex-shrink:0;"></div>`;

    /* Hand — only shown on your turn */
    if (isMyTurn) {
        html += `<div style="display:flex;gap:4px;overflow-x:auto;padding:3px 2px 5px 2px;width:100%;box-sizing:border-box;flex-wrap:nowrap;-webkit-overflow-scrolling:touch;">`;
        hand.forEach((card,i) => {
            const red  = SEQ_IS_RED(card);
            const num  = card.replace(/[♠♣♥♦]/g,'');
            const suit = card.replace(/[^♠♣♥♦]/g,'');
            html += `<div onclick="selectSeqCard(${i})" style="flex-shrink:0;background:white;border:${sel===i?'3px solid #ffd700':'2px solid #999'};border-radius:5px;padding:3px 5px;cursor:pointer;box-shadow:${sel===i?'0 0 6px rgba(255,215,0,0.6)':'0 1px 3px rgba(0,0,0,0.2)'};display:flex;flex-direction:column;align-items:center;line-height:1.15;min-width:24px;">
                <span style="font-size:13px;font-weight:900;color:${red?'#c00':'#111'};">${num}</span>
                <span style="font-size:14px;color:${red?'#c00':'#111'};">${suit}</span>
            </div>`;
        });
        html += `</div>`;
    } else {
        html += `<div style="color:#a3cfbb;font-size:12px;padding:6px 0;">Waiting for opponent's move…</div>`;
    }

    html += `</div>`;
    gameCanvasContainer.innerHTML = html;
}

window.selectSeqCard = function(i) {
    window.seqSelectedCard = window.seqSelectedCard===i ? null : i;
    renderSequenceBoard();
};

window.handleSeqCellTap = function(i) {
    if (!window.seqGameStarted || !window.seqMyColor) return;
    if (window.seqTurn !== window.seqMyColor) return;
    const sel = window.seqSelectedCard; if (sel===null) return;
    const board=window.seqBoard, myColor=window.seqMyColor, hand=window.seqHands[myColor], label=SEQ_GRID[i];
    if (label==='FREE'||board[i]) return;
    if (hand[sel]!==label) return;
    board[i] = myColor;
    hand.splice(sel,1);
    const newCard = window.seqDeck.length ? window.seqDeck.pop() : null;
    if (newCard) hand.push(newCard);
    window.seqSelectedCard = null;

    // Sequence detection
    const lines=[],b=board;
    for(let r=0;r<10;r++){const row=[];for(let c=0;c<10;c++)row.push(r*10+c);lines.push(row);}
    for(let c=0;c<10;c++){const col=[];for(let r=0;r<10;r++)col.push(r*10+c);lines.push(col);}
    for(let s=0;s<6;s++){const d1=[],d2=[];for(let j=0;j+s<10;j++){d1.push((j+s)*10+j);d2.push(j*10+(j+s));}if(d1.length>=5)lines.push(d1);if(s>0&&d2.length>=5)lines.push(d2);}
    let seq1=0,seq2=0;
    lines.forEach(line=>{for(let s=0;s<=line.length-5;s++){const sl=line.slice(s,s+5).map(x=>b[x]);if(sl.every(v=>v===1||v===3))seq1++;if(sl.every(v=>v===2||v===3))seq2++;}});
    window.seqSequences=[seq1,seq2];
    window.seqTurn = myColor===1?2:1;
    triggerSeqSync({ newCardForOpponent: newCard });

    if (seq1>=2||seq2>=2) {
        const w=seq1>=2?'🔵 Blue':'🟢 Green';
        gameCanvasContainer.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;height:100%;padding:20px;text-align:center;">
            <div style="font-size:52px;">🏆</div>
            <div style="color:#ffd700;font-size:24px;font-weight:900;">${w} wins!</div>
            <button onclick="initSequenceGame()" style="background:#2d6a30;color:white;border:none;border-radius:8px;padding:12px 28px;font-size:15px;font-weight:bold;cursor:pointer;">Play Again</button>
        </div>`;
        return;
    }
    renderSequenceBoard();
};

/* ═══════════════════════════════════════════════════════════
   4.  CREW TRIVIA
   ═══════════════════════════════════════════════════════════ */
function initTriviaGame() {
    window.triviaQuestionCount=0;
    window.triviaScorePoints=0;
    window.triviaBatch=null;
    gameCanvasContainer.innerHTML=`
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:20px;width:100%;box-sizing:border-box;height:100%;">
            <div style="color:#ffd700;font-size:28px;font-weight:bold;font-family:Impact,sans-serif;text-align:center;">TRIVIA CATEGORY</div>
            <div style="position:relative;width:100%;max-width:280px;">
                <select id="triviaCategoryPicker" style="width:100%;padding:16px;font-size:18px;font-weight:900;border-radius:12px;border:3px solid #ffd700;background:#2d6a30;color:#fff;outline:none;appearance:none;text-align:center;cursor:pointer;">
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
            <button onclick="launchLiveTriviaEngine()" style="width:100%;max-width:280px;padding:16px;background:#ffd700;color:#1e4620;font-weight:900;font-size:22px;border:none;border-radius:12px;cursor:pointer;font-family:Impact,sans-serif;">START GAME</button>
        </div>`;
}

window.launchLiveTriviaEngine = function() {
    if (window.triviaBatch && window.triviaBatch.length > 0) {
        window.sharedRoomTriviaQuestion = window.triviaBatch.shift();
        renderSharedTriviaUI(); return;
    }
    const picker = document.getElementById('triviaCategoryPicker');
    if (picker) window.triviaLastCategory = picker.value;
    const category = window.triviaLastCategory || '9';
    gameCanvasContainer.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#e2f0d9;font-size:18px;font-weight:bold;">Fetching questions…</div>`;
    fetch(`https://opentdb.com/api.php?amount=10&type=multiple&category=${category}`)
        .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
        .then(data=>{
            if(!data.results||!data.results.length)throw new Error('No results');
            const decode=s=>{const t=document.createElement('textarea');t.innerHTML=s;return t.value;};
            window.triviaBatch=data.results.map(item=>({
                q:decode(item.question),
                c:decode(item.correct_answer),
                choices:[...item.incorrect_answers.map(decode),decode(item.correct_answer)].sort(()=>Math.random()-0.5),
                cat:category
            }));
            window.sharedRoomTriviaQuestion=window.triviaBatch.shift();
            if(typeof channel!=='undefined') channel.send({type:'broadcast',event:'sync-room-trivia',payload:{triviaData:window.sharedRoomTriviaQuestion,count:window.triviaQuestionCount}});
            renderSharedTriviaUI();
        })
        .catch(()=>{
            gameCanvasContainer.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;height:100%;padding:20px;text-align:center;">
                <div style="font-size:36px;">📡</div>
                <div style="color:#dc3545;font-size:16px;font-weight:bold;">Couldn't reach the trivia server.</div>
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
    q.choices.forEach(choice=>{
        html+=`<button onclick="evaluateRoomTriviaClick(this,'${choice.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')"
            style="width:100%;padding:14px 16px;background:#e2f0d9;color:#1e4620;border:none;border-radius:10px;font-weight:900;font-size:17px;text-align:left;cursor:pointer;box-shadow:0 3px 6px rgba(0,0,0,0.25);line-height:1.3;"
            data-choice="${choice.replace(/"/g,'&quot;')}">${choice}</button>`;
    });
    html+=`</div></div>`;
    gameCanvasContainer.innerHTML=html;
}

window.evaluateRoomTriviaClick=function(btn,choice){
    document.querySelectorAll('#gameCanvasContainer button').forEach(b=>b.disabled=true);
    window.triviaQuestionCount++;
    if(choice===window.sharedRoomTriviaQuestion.c){btn.style.background='#00c96a';btn.style.color='#000';window.triviaScorePoints++;}
    else{btn.style.background='#e63946';btn.style.color='#fff';document.querySelectorAll('#gameCanvasContainer button').forEach(b=>{if(b.getAttribute('data-choice')===window.sharedRoomTriviaQuestion.c){b.style.background='#00c96a';b.style.color='#000';}});}
    setTimeout(()=>{
        if(window.triviaQuestionCount>=10){
            gameCanvasContainer.innerHTML=`<div style="text-align:center;padding:20px;">
                <h2 style="color:#ffd700;font-family:Impact;font-size:32px;">ROUND COMPLETE!</h2>
                <div style="font-size:52px;font-weight:900;color:white;margin:16px 0;">${window.triviaScorePoints} / 10</div>
                <button onclick="initTriviaGame()" style="padding:16px 32px;font-size:20px;background:#ffd700;color:#1e4620;border:none;border-radius:8px;font-weight:900;cursor:pointer;">PLAY AGAIN</button>
            </div>`;
        } else { window.launchLiveTriviaEngine(); }
    },1800);
};

/* ═══════════════════════════════════════════════════════════
   5.  SOLITAIRE  — correct deal, proper card layout
   ═══════════════════════════════════════════════════════════ */
window.initSolitaireGame = function() {
    const suits=['♠','♣','♥','♦'], ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    let deck=[];
    suits.forEach(s=>ranks.forEach((r,val)=>deck.push({r,s,val:val+1,isRed:(s==='♥'||s==='♦'),open:false})));
    deck.sort(()=>Math.random()-0.5);

    window.solTableau     = Array(7).fill(0).map(()=>[]);
    window.solDeck        = [];
    window.solWaste       = [];
    window.solFoundations = Array(4).fill(0).map(()=>[]);
    window.solSelected    = null;

    // Standard Klondike deal: col 0 gets 1 card, col 1 gets 2, etc.
    // Only the top (last) card in each column is face-up
    for (let col=0; col<7; col++) {
        for (let row=0; row<=col; row++) {
            const card=deck.pop();
            card.open=(row===col);
            window.solTableau[col].push(card);
        }
    }
    window.solDeck = deck; // remaining cards
    renderSolitaireBoard();
};

function solFaceCard(card, w, h, extraStyle) {
    const sc   = card.isRed ? '#c00' : '#111';
    const ssz  = Math.floor(h * 0.60);
    const rsz  = Math.floor(h * 0.28);
    return `<div style="width:${w}px;height:${h}px;border-radius:5px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;${extraStyle||''}">
        <span style="font-size:${ssz}px;color:${sc};line-height:1;">${card.s}</span>
        <span style="font-size:${rsz}px;font-weight:900;color:#fff;line-height:1;text-shadow:0 1px 4px rgba(0,0,0,0.95),0 0 8px rgba(0,0,0,0.7);">${card.r}</span>
    </div>`;
}
function solBackCard(w,h){
    return `<div style="width:${w}px;height:${h}px;border-radius:5px;background:linear-gradient(135deg,#1a1a1a,#3a3a3a);border:1px solid rgba(255,215,0,0.3);display:flex;align-items:center;justify-content:center;color:#ffd700;font-size:${Math.floor(h*0.26)}px;flex-shrink:0;">⚡</div>`;
}

function renderSolitaireBoard() {
    const sw  = Math.min(window.innerWidth-8,360);
    const cw  = Math.floor((sw-24)/7); // 7 cols, ~3px gap each
    const ch  = Math.floor(cw*1.38);
    const ovl = Math.floor(ch*0.27);   // tableau overlap

    let html=`<div style="display:flex;flex-direction:column;gap:6px;width:${sw}px;box-sizing:border-box;padding:2px;user-select:none;">`;

    /* Top row */
    html+=`<div style="display:flex;gap:3px;width:100%;align-items:flex-start;">`;
    // Draw pile
    html+=`<div onclick="drawSolitaireCard()" style="cursor:pointer;flex-shrink:0;">`;
    html+= window.solDeck.length ? solBackCard(cw,ch) : `<div style="width:${cw}px;height:${ch}px;border-radius:5px;background:rgba(255,255,255,0.05);border:1px dashed rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;color:#a3cfbb;font-size:${Math.floor(ch*0.28)}px;">↻</div>`;
    html+=`</div>`;
    // Waste
    const tw=window.solWaste[window.solWaste.length-1];
    const wSel=window.solSelected?.type==='waste';
    html+=`<div onclick="selectSolitaireWaste()" style="cursor:pointer;flex-shrink:0;">`;
    html+= tw ? solFaceCard(tw,cw,ch,wSel?'outline:3px solid #ffd700;outline-offset:-3px;border:1px solid #ccc;':'border:1px solid #ccc;')
               : `<div style="width:${cw}px;height:${ch}px;border-radius:5px;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.12);"></div>`;
    html+=`</div>`;
    html+=`<div style="flex:1;"></div>`;
    // Foundations
    for(let f=0;f<4;f++){
        const fp=window.solFoundations[f],tf=fp[fp.length-1];
        html+=`<div onclick="targetSolitaireFoundation(${f})" style="cursor:pointer;flex-shrink:0;">`;
        html+= tf ? solFaceCard(tf,cw,ch,'border:2px solid #ffd700;')
                  : `<div style="width:${cw}px;height:${ch}px;border-radius:5px;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,215,0,0.3);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.18);font-size:${Math.floor(ch*0.26)}px;">A</div>`;
        html+=`</div>`;
    }
    html+=`</div>`; // end top row

    /* Tableau */
    const maxLen=Math.max(...window.solTableau.map(c=>c.length),1);
    const tblH=ch+(maxLen-1)*ovl+4;
    html+=`<div style="display:flex;gap:3px;width:100%;align-items:flex-start;height:${tblH}px;">`;
    for(let col=0;col<7;col++){
        const cards=window.solTableau[col];
        html+=`<div onclick="targetSolitaireColumn(${col})" style="width:${cw}px;position:relative;flex-shrink:0;height:${tblH}px;">`;
        if(!cards.length){
            html+=`<div style="width:${cw}px;height:${ch}px;border-radius:5px;background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.08);"></div>`;
        } else {
            cards.forEach((card,idx)=>{
                const isSel=window.solSelected?.type==='tableau'&&window.solSelected.col===col&&window.solSelected.idx===idx;
                html+=`<div style="position:absolute;top:${idx*ovl}px;left:0;" onclick="event.stopPropagation();selectSolitaireCard(${col},${idx})">`;
                html+= card.open
                    ? solFaceCard(card,cw,ch,isSel?'outline:3px solid #ffd700;outline-offset:-3px;border:1px solid #ccc;':'border:1px solid #ccc;')
                    : solBackCard(cw,ch);
                html+=`</div>`;
            });
        }
        html+=`</div>`;
    }
    html+=`</div>`; // end tableau
    html+=`</div>`; // end board
    gameCanvasContainer.innerHTML=html;
}

window.drawSolitaireCard=function(){
    window.solSelected=null;
    if(!window.solDeck.length){window.solDeck=window.solWaste.reverse().map(c=>({...c,open:false}));window.solWaste=[];}
    else{const card=window.solDeck.pop();card.open=true;window.solWaste.push(card);}
    renderSolitaireBoard();
};
window.selectSolitaireWaste=function(){if(window.solWaste.length){window.solSelected={type:'waste'};renderSolitaireBoard();}};
window.selectSolitaireCard=function(col,idx){if(!window.solTableau[col][idx].open)return;window.solSelected={type:'tableau',col,idx};renderSolitaireBoard();};
window.targetSolitaireColumn=function(toCol){
    if(!window.solSelected)return;
    const tp=window.solTableau[toCol],tt=tp[tp.length-1];
    let mc=window.solSelected.type==='waste'?[window.solWaste[window.solWaste.length-1]]:window.solTableau[window.solSelected.col].slice(window.solSelected.idx);
    const fc=mc[0];
    const valid=!tt?(fc.val===13):(tt.open&&tt.isRed!==fc.isRed&&tt.val===fc.val+1);
    if(valid){
        if(window.solSelected.type==='waste'){tp.push(window.solWaste.pop());}
        else{const src=window.solTableau[window.solSelected.col];window.solTableau[window.solSelected.col]=src.slice(0,window.solSelected.idx);mc.forEach(c=>tp.push(c));const sn=window.solTableau[window.solSelected.col];if(sn.length)sn[sn.length-1].open=true;}
        checkSolitaireVictory();
    }
    window.solSelected=null;renderSolitaireBoard();
};
window.targetSolitaireFoundation=function(fi){
    if(!window.solSelected)return;
    if(window.solSelected.type==='tableau'&&window.solSelected.idx!==window.solTableau[window.solSelected.col].length-1)return;
    const card=window.solSelected.type==='waste'?window.solWaste[window.solWaste.length-1]:window.solTableau[window.solSelected.col][window.solSelected.idx];
    const fp=window.solFoundations[fi],tf=fp[fp.length-1];
    const valid=!tf?(card.val===1):(tf.s===card.s&&card.val===tf.val+1);
    if(valid){
        if(window.solSelected.type==='waste'){fp.push(window.solWaste.pop());}
        else{fp.push(window.solTableau[window.solSelected.col].pop());const sn=window.solTableau[window.solSelected.col];if(sn.length)sn[sn.length-1].open=true;}
        checkSolitaireVictory();
    }
    window.solSelected=null;renderSolitaireBoard();
};
function checkSolitaireVictory(){
    if(window.solFoundations.reduce((a,c)=>a+c.length,0)===52)setTimeout(()=>{gameCanvasContainer.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;height:100%;text-align:center;padding:20px;"><div style="font-size:52px;">👑</div><div style="color:#ffd700;font-size:28px;font-weight:900;font-family:Impact,sans-serif;">SOLITAIRE VICTORY!</div><button onclick="window.initSolitaireGame()" style="background:#2d6a30;color:white;border:none;border-radius:8px;padding:12px 28px;font-size:15px;font-weight:bold;cursor:pointer;">Play Again</button></div>`;},300);
}

/* ═══════════════════════════════════════════════════════════
   6.  HANGMAN  — SVG scaffold, AI words, big dashes
   ═══════════════════════════════════════════════════════════ */
const HANGMAN_FALLBACK=[
    'CHASER','BICYCLE','ADVENTURE','JOURNEY','HIGHWAY','VELOCITY','NAVIGATOR',
    'COMPASS','HORIZON','PASSPORT','LABYRINTH','PRISM','FRACTURE','ECLIPSE',
    'CATALYST','VORTEX','PHANTOM','CRESCENT','INFERNO','FORTRESS','TEMPEST',
    'CRIMSON','SOLITUDE','MIRAGE','ANTHEM','DYNASTY','WANDERER','TRIBUTARY'
];

function initHangmanGame(){
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
    .catch(()=>{window.hangmanState.word=HANGMAN_FALLBACK[Math.floor(Math.random()*HANGMAN_FALLBACK.length)];renderHangmanGame();});
}

function buildHangmanSVG(wrong,dying){
    const bc=dying?'#dc3545':'#e2f0d9';
    const sh=dying?'style="animation:hangShake 0.5s ease-in-out 3"':'';
    const p={head:wrong>=1,body:wrong>=2,la:wrong>=3,ra:wrong>=4,ll:wrong>=5,rl:wrong>=6};
    return `<svg viewBox="0 0 100 130" width="100" height="130" xmlns="http://www.w3.org/2000/svg">
        <style>@keyframes hangShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}</style>
        <line x1="8"  y1="124" x2="92" y2="124" stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>
        <line x1="24" y1="124" x2="24" y2="8"   stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>
        <line x1="24" y1="8"   x2="62" y2="8"   stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>
        <line x1="62" y1="8"   x2="62" y2="22"  stroke="#ffd700" stroke-width="3" stroke-linecap="round"/>
        <g ${sh} transform-origin="62 31">
            ${p.head?`<circle cx="62" cy="31" r="10" stroke="${bc}" stroke-width="3" fill="none"/>`:'' }
            ${p.head&&dying?`<text x="55" y="36" font-size="10" font-weight="bold" fill="${bc}">xx</text>`
              :p.head?`<circle cx="58" cy="28" r="2" fill="${bc}"/><circle cx="66" cy="28" r="2" fill="${bc}"/><path d="M58 35 Q62 39 66 35" stroke="${bc}" stroke-width="1.5" fill="none"/>`:'' }
            ${p.body?`<line x1="62" y1="41" x2="62" y2="78" stroke="${bc}" stroke-width="3" stroke-linecap="round"/>`:'' }
            ${p.la  ?`<line x1="62" y1="50" x2="44" y2="66" stroke="${bc}" stroke-width="3" stroke-linecap="round"/>`:'' }
            ${p.ra  ?`<line x1="62" y1="50" x2="80" y2="66" stroke="${bc}" stroke-width="3" stroke-linecap="round"/>`:'' }
            ${p.ll  ?`<line x1="62" y1="78" x2="47" y2="100" stroke="${bc}" stroke-width="3" stroke-linecap="round"/>`:'' }
            ${p.rl  ?`<line x1="62" y1="78" x2="77" y2="100" stroke="${bc}" stroke-width="3" stroke-linecap="round"/>`:'' }
        </g>
    </svg>`;
}

function renderHangmanGame(){
    const state=window.hangmanState; if(!state||!state.word)return;
    const{word,guessed,wrong,maxWrong,dying}=state;
    const isWin=word.split('').every(l=>guessed.includes(l)),isLose=wrong>=maxWrong;
    let html=`<div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:100%;box-sizing:border-box;padding:6px 8px;">`;
    html+=`<div style="transform:scale(0.88);transform-origin:top center;">${buildHangmanSVG(wrong,dying||isLose)}</div>`;
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
            const used=guessed.includes(letter),isBad=used&&!word.includes(letter),isGood=used&&word.includes(letter);
            html+=`<button onclick="handleHangmanClick('${letter}')" ${used?'disabled':''}
                style="width:32px;height:38px;border-radius:6px;border:none;font-weight:900;font-size:16px;
                cursor:${used?'default':'pointer'};
                background:${isBad?'#dc3545':isGood?'#00b050':'#e2f0d9'};
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
