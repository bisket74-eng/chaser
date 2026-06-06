/* CHASER ARCADE ENGINE */
window.handleIncomingCheckersSync = (p) => { 
    if(window.syncCheckersBoard) { window.syncCheckersBoard = p.boardState; window.checkersTurn = p.activeTurn; if(activeGameStage.classList.contains('open') && activeGameLabelTitle.innerText.includes('Checkers')) renderCheckersGrid(); }
};
window.handleIncomingUnoSync = (p) => { 
    if(window.unoDiscardPile) { window.unoDiscardPile = p.currentDiscard; if(activeGameStage.classList.contains('open') && activeGameLabelTitle.innerText.includes('Uno')) renderUnoLayout(); }
};
window.handleIncomingTriviaSync = (p) => { 
    if(window.sharedRoomTriviaQuestion) { window.sharedRoomTriviaQuestion = p.triviaData; window.triviaQuestionCount = p.count; if(activeGameStage.classList.contains('open') && activeGameLabelTitle.innerText.includes('Trivia')) renderSharedTriviaUI(); }
};

/* --- 1. CHECKERS (KING + MULTI-JUMP) --- */
function initCheckersGame() {
    window.syncCheckersBoard = Array(64).fill(0).map((_,i) => {
        let r=Math.floor(i/8), c=i%8;
        if((r+c)%2===1) { if(r<3) return 1; if(r>4) return 2; }
        return 0;
    });
    window.checkersTurn = 1;
    window.selectedCheckerIdx = null;
    window.consecutiveJumpsActive = false;
    renderCheckersGrid();
}

/* --- 2. UNO (WILD CARDS + TURN LOGIC) --- */
function initChaserUnoGame() {
    window.unoDeckState = [];
    window.myUnoHand = [];
    const colors = ['Red', 'Yellow', 'Green', 'Blue'];
    const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Wild', '⇋'];
    colors.forEach(c => values.forEach(v => unoDeckState.push({color: c, value: v})));
    unoDeckState.sort(() => Math.random() - 0.5);
    for(let i=0; i<4; i++) myUnoHand.push(unoDeckState.pop());
    window.unoDiscardPile = {color: 'Red', value: '5'};
    window.unoWildChoosingActive = false;
    renderUnoLayout();
}

/* --- 3. SEQUENCE MATRIX --- */
function initSequenceGame() {
    window.sequenceBoardState = Array(36).fill(0);
    window.mySequenceHand = Array(4).fill(0).map(() => ({r:'A', s:'♠', isRed:false}));
    window.sequenceTurn = 1;
    renderSequenceBoard();
}

/* --- 4. TRIVIA (RANDOMIZED) --- */
function initTriviaGame() {
    window.triviaQuestionCount = window.triviaQuestionCount || 0;
    window.triviaScorePoints = window.triviaScorePoints || 0;
    if (triviaQuestionCount >= 20) { renderTriviaScoreboard(); return; }
    
    fetch(`https://opentdb.com/api.php?amount=1&type=multiple&category=9&cache=${Math.random()}`)
        .then(res => res.json())
        .then(data => {
            const item = data.results[0];
            window.sharedRoomTriviaQuestion = { q: item.question, c: item.correct_answer, choices: [...item.incorrect_answers, item.correct_answer].sort(() => Math.random() - 0.5) };
            renderSharedTriviaUI();
        });
}

// ... [Note: You would maintain your rendering functions here, utilizing the global variables initialized above]
// To keep this uploadable, ensure all your render functions (renderCheckersGrid, renderUnoLayout, etc.) 
// are pasted immediately below this block in the same file.
