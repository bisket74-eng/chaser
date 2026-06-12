alert("TRIVIA JS FILE LOADED");
/* ============================================================
       4. TRIVIA – 1 TO 10 PLAYERS
       ============================================================ */

    const LOCAL_TRIVIA = [
        { q: "What planet is known as the Red Planet?", c: "Mars", a: ["Venus", "Mars", "Jupiter", "Saturn"] },
        { q: "How many sides does a hexagon have?", c: "6", a: ["5", "6", "7", "8"] },
        { q: "Which ocean is the largest?", c: "Pacific Ocean", a: ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"] },
        { q: "What is the capital of France?", c: "Paris", a: ["Rome", "Madrid", "Paris", "Berlin"] },
        { q: "Which animal is known as man's best friend?", c: "Dog", a: ["Cat", "Horse", "Dog", "Rabbit"] },
        { q: "What color do you get by mixing red and blue?", c: "Purple", a: ["Green", "Orange", "Purple", "Yellow"] },
        { q: "How many days are in a leap year?", c: "366", a: ["365", "366", "364", "360"] },
        { q: "What gas do plants absorb?", c: "Carbon dioxide", a: ["Oxygen", "Hydrogen", "Carbon dioxide", "Nitrogen"] },
        { q: "Which country invented pizza?", c: "Italy", a: ["France", "Italy", "Mexico", "Greece"] },
        { q: "How many continents are there?", c: "7", a: ["5", "6", "7", "8"] }
    ];

    window.initTriviaGame = function () {
        window.chaserGame.activeGame = "Trivia";

        const isHost = window.chaserGame.hostId === myGameId();

        if (isHost || !window.triviaState) {
            window.triviaState = {
                players: window.chaserGame.players || [{ id: myGameId(), name: "Player", seat: 0 }],
                round: 0,
                totalRounds: 20,
                score: {},
                votes: {},
                current: null,
                phase: "menu",
                timer: 0,
                winner: null
            };

            window.triviaState.players.forEach(p => {
                window.triviaState.score[p.id] = 0;
            });

            syncTrivia();
        }

        renderTriviaMenu();
    };

    function syncTrivia() {
        sendGameEvent("sync-room-trivia", {
            state: window.triviaState
        });
    }

    window.receiveTriviaSync = function (p) {
        if (!p || !p.state) return;
        if (p.roomGameId && window.chaserGame.activeGameId && p.roomGameId !== window.chaserGame.activeGameId) return;

        window.triviaState = p.state;

        if (gameStage && gameStage.classList.contains("open") && window.chaserGame.activeGame === "Trivia") {
            renderTriviaScreen();
        }
    };

    function renderTriviaMenu() {
        gameCanvas.innerHTML = `
            <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
                gap:14px;text-align:center;color:white;padding:18px;box-sizing:border-box;">
                <div style="font-size:30px;color:#ffd700;font-family:Impact,sans-serif;font-weight:900;">TRIVIA</div>
                <div style="font-size:15px;color:#e2f0d9;font-weight:bold;">20 rounds • pick your answer fast</div>
                <button onclick="window.startTriviaRound()"
                    style="background:#ffd700;color:#1e4620;border:none;border-radius:10px;padding:14px 26px;
                    font-size:22px;font-weight:900;font-family:Impact,sans-serif;box-shadow:0 4px 10px rgba(0,0,0,0.35);">
                    START
                </button>
            </div>`;
    }

   async function getTriviaBatch() {
    const fallback = LOCAL_TRIVIA.slice();

    try {
        const res = await fetch("https://opentdb.com/api.php?amount=20&difficulty=easy&type=multiple");
        const data = await res.json();

        if (!data.results || !data.results.length) throw new Error("No questions");

        return data.results.map(item => {
            const decode = (txt) => {
                const box = document.createElement("textarea");
                box.innerHTML = txt;
                return box.value;
            };

            const correct = decode(item.correct_answer);
            const answers = [
                correct,
                ...item.incorrect_answers.map(decode)
            ];

            return {
                q: decode(item.question),
                c: correct,
                a: shuffle(answers)
            };
        });
    } catch (e) {
        return fallback;
    }
}

window.startTriviaRound = async function () {
    const s = window.triviaState;
    if (!s) return;

    if (!s.questionBank || !s.questionBank.length) {
        s.questionBank = await getTriviaBatch();
        s.usedQuestions = [];
    }

    let q = s.questionBank.shift();

    while (q && s.usedQuestions && s.usedQuestions.includes(q.q)) {
        q = s.questionBank.shift();
    }

    if (!q) {
        s.questionBank = await getTriviaBatch();
        q = s.questionBank.shift();
    }

    s.usedQuestions = s.usedQuestions || [];
    s.usedQuestions.push(q.q);

    s.current = q;
    s.votes = {};
    s.phase = "vote";
    s.timer = 12;
    s.round++;

    syncTrivia();
    runTriviaTimer();
    renderTriviaScreen();
};

window.nextTriviaRound = function () {
    const s = window.triviaState;
    if (!s) return;

    if (s.round >= 20) {
        s.phase = "done";
        syncTrivia();
        renderTriviaScreen();
    } else {
        window.startTriviaRound();
    }
};

    function renderTriviaScreen() {
        const s = window.triviaState;
        if (!s) return;

        if (s.phase === "menu") {
            renderTriviaMenu();
            return;
        }

        if (s.phase === "done") {
            const sorted = s.players.slice().sort((a, b) => (s.score[b.id] || 0) - (s.score[a.id] || 0));
            const winner = sorted[0];

            gameCanvas.innerHTML = `
                <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
                    gap:12px;text-align:center;color:white;padding:18px;box-sizing:border-box;">
                    <div style="font-size:30px;color:#ffd700;font-family:Impact,sans-serif;">TRIVIA COMPLETE</div>
                    <div style="font-size:22px;color:#00b050;font-weight:900;">Winner: ${escapeHtml(winner?.name || "Player")}</div>
                    <div style="width:100%;max-width:320px;display:flex;flex-direction:column;gap:6px;">
                        ${sorted.map(p => `
                            <div style="background:#e2f0d9;color:#1e4620;border-radius:8px;padding:8px;font-weight:900;
                                display:flex;justify-content:space-between;">
                                <span>${escapeHtml(p.name)}</span>
                                <span>${s.score[p.id] || 0}</span>
                            </div>
                        `).join("")}
                    </div>
                    <button onclick="window.initTriviaGame()"
                        style="background:#ffd700;color:#1e4620;border:none;border-radius:10px;padding:12px 22px;
                        font-size:18px;font-weight:900;font-family:Impact,sans-serif;">NEW GAME</button>
                </div>`;
            return;
        }

        const voted = !!s.votes[myGameId()];
        const q = s.current;

        gameCanvas.innerHTML = `
            <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;gap:8px;
                color:white;padding:8px;box-sizing:border-box;user-select:none;">
                <div style="width:100%;display:flex;justify-content:space-between;color:#ffd700;font-weight:900;font-size:13px;">
                    <span>Round ${s.round}/${s.totalRounds}</span>
                    <span>${s.phase === "vote" ? "Time: " + s.timer : "Reveal"}</span>
                    <span>Score: ${s.score[myGameId()] || 0}</span>
                </div>

                <div style="background:rgba(0,0,0,0.45);border:3px solid #ffd700;border-radius:10px;
                    padding:12px;font-size:18px;font-weight:900;text-align:center;line-height:1.2;width:100%;box-sizing:border-box;">
                    ${escapeHtml(q.q)}
                </div>

                <div style="display:flex;flex-direction:column;gap:7px;width:100%;">
                    ${q.a.map(ans => {
                        let bg = "#e2f0d9";
                        let color = "#1e4620";

                        if (s.phase === "reveal") {
                            if (ans === q.c) {
                                bg = "#00b050";
                                color = "#fff";
                            } else if (s.votes[myGameId()] === ans) {
                                bg = "#dc3545";
                                color = "#fff";
                            }
                        } else if (s.votes[myGameId()] === ans) {
                            bg = "#00b0ff";
                            color = "#fff";
                        }

                        return `
                            <button onclick="window.submitTriviaAnswer('${String(ans).replace(/'/g, "\\'")}')"
                                ${s.phase !== "vote" || voted ? "disabled" : ""}
                                style="background:${bg};color:${color};border:none;border-radius:8px;padding:11px;
                                font-size:15px;font-weight:900;text-align:left;box-shadow:0 2px 5px rgba(0,0,0,0.25);">
                                ${escapeHtml(ans)}
                            </button>`;
                    }).join("")}
                </div>

                <div style="font-size:12px;color:#a3cfbb;font-weight:bold;">
                    Votes: ${Object.keys(s.votes).length}/${s.players.length}
                </div>

                ${s.phase === "reveal" ? `
                    <button onclick="window.nextTriviaRound()"
                        style="background:#ffd700;color:#1e4620;border:none;border-radius:8px;padding:10px 20px;
                        font-size:16px;font-weight:900;font-family:Impact,sans-serif;">
                        ${s.round >= s.totalRounds ? "FINISH" : "NEXT"}
                    </button>
                ` : ""}
            </div>`;
    }
