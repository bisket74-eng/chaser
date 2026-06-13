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
/* CHASER PATCH A – Sequence layout + Hangman spacing + Trivia host/timer */
(function () {
    const gameCanvas = document.getElementById("gameCanvasContainer");
    const gameStage = document.getElementById("activeGameStage");

    function myId() {
        return window.myId || localStorage.getItem("rider_id") || "local-player";
    }

    function isHost() {
        return window.chaserGame && window.chaserGame.hostId === myId();
    }

    function send(event, payload) {
        if (typeof channel !== "undefined" && channel) {
            channel.send({
                type: "broadcast",
                event,
                payload: {
                    ...payload,
                    senderId: myId(),
                    roomGameId: window.chaserGame?.activeGameId || null
                }
            });
        }
           
    }
       /* -------- Trivia host-controlled synced phases -------- */
    const TRIVIA_POOL = [
        { q:"What planet is known as the Red Planet?", c:"Mars", a:["Venus","Mars","Jupiter","Saturn"] },
        { q:"How many sides does a hexagon have?", c:"6", a:["5","6","7","8"] },
        { q:"Which ocean is the largest?", c:"Pacific Ocean", a:["Atlantic Ocean","Indian Ocean","Pacific Ocean","Arctic Ocean"] },
        { q:"What is the capital of France?", c:"Paris", a:["Rome","Madrid","Paris","Berlin"] },
        { q:"What color do you get by mixing red and blue?", c:"Purple", a:["Green","Orange","Purple","Yellow"] },
        { q:"How many days are in a leap year?", c:"366", a:["365","366","364","360"] },
        { q:"What gas do plants absorb?", c:"Carbon dioxide", a:["Oxygen","Hydrogen","Carbon dioxide","Nitrogen"] },
        { q:"Which country invented pizza?", c:"Italy", a:["France","Italy","Mexico","Greece"] },
        { q:"How many continents are there?", c:"7", a:["5","6","7","8"] },
        { q:"Which animal is known as man's best friend?", c:"Dog", a:["Cat","Horse","Dog","Rabbit"] }
    ];

    function shuffle(arr) {
        const a = arr.slice();
        for (let i=a.length-1; i>0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function safe(str) {
        return String(str ?? "")
            .replace(/&/g,"&amp;")
            .replace(/</g,"&lt;")
            .replace(/>/g,"&gt;");
    }

    window.initTriviaGame = function () {
        window.chaserGame.activeGame = "Trivia";

        if (isHost() || !window.triviaState) {
            window.triviaState = {
                players: window.chaserGame.players || [{ id:myId(), name:"Player", seat:0 }],
                round:0,
                totalRounds:20,
                score:{},
                votes:{},
                current:null,
                phase:"menu",
                timer:0,
                phaseEndsAt:0
            };

            window.triviaState.players.forEach(p => {
                window.triviaState.score[p.id] = 0;
            });

            syncTrivia();
        }

        renderTriviaBetter();
    };

    function syncTrivia() {
        send("sync-room-trivia", { state:window.triviaState });
    }

    window.receiveTriviaSync = function (p) {
        if (!p || !p.state) return;
        if (p.roomGameId && window.chaserGame?.activeGameId && p.roomGameId !== window.chaserGame.activeGameId) return;

        window.triviaState = p.state;

        if (window.chaserGame) window.chaserGame.activeGame = "Trivia";

        renderTriviaBetter();
        runLocalTriviaClock();
    };

    function startHostPhase(phase, seconds) {
        const s = window.triviaState;
        s.phase = phase;
        s.timer = seconds;
        s.phaseEndsAt = Date.now() + seconds * 1000;
        syncTrivia();
        renderTriviaBetter();
        runLocalTriviaClock();
    }

    window.startTriviaRound = function () {
        if (!isHost()) return;

        const s = window.triviaState;
        const item = TRIVIA_POOL[Math.floor(Math.random() * TRIVIA_POOL.length)];

        s.current = {
            q:item.q,
            c:item.c,
            a:shuffle(item.a)
        };

        s.votes = {};
        s.round++;

        startHostPhase("question", 8);
    };

    function hostAdvanceTriviaPhase() {
    if (!isHost()) return;

    const s = window.triviaState;
    if (!s) return;

    if (s.phase === "question") {
        startHostPhase("vote", 8);

    } else if (s.phase === "vote") {
        Object.keys(s.votes).forEach(pid => {
            if (s.votes[pid] === s.current.c) {
                s.score[pid] = (s.score[pid] || 0) + 1;
            }
        });

        startHostPhase("reveal", 5);

    } else if (s.phase === "reveal") {
        if (s.round >= s.totalRounds) {
            s.phase = "done";
            syncTrivia();
            renderTriviaBetter();
        } else {
            window.startTriviaRound();
        }
    }
}

    function runLocalTriviaClock() {
        if (window.triviaBetterTimer) clearInterval(window.triviaBetterTimer);

        window.triviaBetterTimer = setInterval(() => {
            const s = window.triviaState;
            if (!s || !s.phaseEndsAt || ["menu","done"].includes(s.phase)) {
                clearInterval(window.triviaBetterTimer);
                return;
            }

            const remaining = Math.max(0, Math.ceil((s.phaseEndsAt - Date.now()) / 1000));
            s.timer = remaining;
            renderTriviaBetter();

            if (remaining <= 0) {
                clearInterval(window.triviaBetterTimer);
                if (isHost()) hostAdvanceTriviaPhase();
            }
        }, 350);
    }

    window.submitTriviaAnswer = function (answer) {
        const s = window.triviaState;
        if (!s || s.phase !== "vote") return;

        s.votes[myId()] = answer;
        syncTrivia();
        renderTriviaBetter();
    };

    function renderTriviaBetter() {
        const s = window.triviaState;
        if (!s || !gameCanvas) return;

        if (s.phase === "menu") {
            gameCanvas.innerHTML = `
                <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
                    gap:14px;text-align:center;color:white;padding:18px;box-sizing:border-box;">
                    <div style="font-size:30px;color:#ffd700;font-family:Impact,sans-serif;font-weight:900;">TRIVIA</div>
                    <div style="font-size:15px;color:#e2f0d9;font-weight:bold;">Question → Answers → Reveal</div>
                    ${isHost() ? `
                        <button onclick="window.startTriviaRound()"
                            style="background:#ffd700;color:#1e4620;border:none;border-radius:10px;padding:14px 26px;
                            font-size:22px;font-weight:900;font-family:Impact,sans-serif;box-shadow:0 4px 10px rgba(0,0,0,.35);">
                            START
                        </button>
                    ` : `<div style="color:#a3cfbb;font-weight:bold;">Waiting for host to start...</div>`}
                </div>`;
            return;
        }

        if (s.phase === "done") {
            const sorted = s.players.slice().sort((a,b) => (s.score[b.id] || 0) - (s.score[a.id] || 0));
            const winner = sorted[0];

            gameCanvas.innerHTML = `
                <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
                    gap:12px;text-align:center;color:white;padding:18px;box-sizing:border-box;">
                    <div style="font-size:30px;color:#ffd700;font-family:Impact,sans-serif;">TRIVIA COMPLETE</div>
                    <div style="font-size:22px;color:#00b050;font-weight:900;">Winner: ${safe(winner?.name || "Player")}</div>
                    <div style="width:100%;max-width:320px;display:flex;flex-direction:column;gap:6px;">
                        ${sorted.map(p => `
                            <div style="background:#e2f0d9;color:#1e4620;border-radius:8px;padding:8px;font-weight:900;
                                display:flex;justify-content:space-between;">
                                <span>${safe(p.name)}</span>
                                <span>${s.score[p.id] || 0}</span>
                            </div>
                        `).join("")}
                    </div>
                </div>`;
            return;
        }

        const q = s.current;
        const voted = !!s.votes[myId()];

        gameCanvas.innerHTML = `
            <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;gap:8px;
                color:white;padding:8px;box-sizing:border-box;user-select:none;overflow:auto;">

                <div style="width:100%;display:flex;justify-content:space-between;color:#ffd700;font-weight:900;font-size:13px;">
                    <span>Round ${s.round}/${s.totalRounds}</span>
                    <span>${s.phase.toUpperCase()}: ${s.timer}</span>
                    <span>Score: ${s.score[myId()] || 0}</span>
                </div>

                <div style="background:rgba(0,0,0,.45);border:3px solid #ffd700;border-radius:10px;
                    padding:12px;font-size:18px;font-weight:900;text-align:center;line-height:1.2;width:100%;box-sizing:border-box;">
                    ${safe(q.q)}
                </div>

                ${s.phase === "question" ? `
                    <div style="margin-top:20px;color:#a3cfbb;font-weight:900;font-size:18px;">
                        Answers coming up...
                    </div>
                ` : `
                    <div style="display:flex;flex-direction:column;gap:7px;width:100%;">
                        ${q.a.map(ans => {
                            let bg = "#e2f0d9";
                            let color = "#1e4620";

                            if (s.phase === "reveal") {
                                if (ans === q.c) {
                                    bg = "#00b050";
                                    color = "#fff";
                                } else if (s.votes[myId()] === ans) {
                                    bg = "#dc3545";
                                    color = "#fff";
                                }
                            } else if (s.votes[myId()] === ans) {
                                bg = "#00b0ff";
                                color = "#fff";
                            }

                            return `
                                <button onclick="window.submitTriviaAnswer('${String(ans).replace(/'/g, "\\'")}')"
                                    ${s.phase !== "vote" || voted ? "disabled" : ""}
                                    style="background:${bg};color:${color};border:none;border-radius:8px;padding:11px;
                                    font-size:15px;font-weight:900;text-align:left;box-shadow:0 2px 5px rgba(0,0,0,.25);">
                                    ${safe(ans)}
                                </button>`;
                        }).join("")}
                    </div>
                `}

                <div style="font-size:12px;color:#a3cfbb;font-weight:bold;">
                    Votes: ${Object.keys(s.votes || {}).length}/${s.players.length}
                </div>

                ${s.phase === "reveal" ? `
    <div style="font-weight:900; color:#1e4620; margin-top:8px;">
        Next question starting soon...
    </div>
` : ""}
            </div>`;
    }
       
})();
    /* Trivia: fetch broad online questions and avoid repeats */
    window.chaserUsedTriviaQuestions = window.chaserUsedTriviaQuestions || [];

    async function fetchFreshTriviaQuestion() {
        try {
            const res = await fetch("https://opentdb.com/api.php?amount=1&difficulty=easy&type=multiple");
            const data = await res.json();

            if (!data.results || !data.results.length) throw new Error("No trivia returned");

            const item = data.results[0];
            const q = decodeHTML(item.question);

            if (window.chaserUsedTriviaQuestions.includes(q) && window.chaserUsedTriviaQuestions.length < 500) {
                return fetchFreshTriviaQuestion();
            }

            window.chaserUsedTriviaQuestions.push(q);
            if (window.chaserUsedTriviaQuestions.length > 500) {
                window.chaserUsedTriviaQuestions.shift();
            }

            const correct = decodeHTML(item.correct_answer);
            const choices = shuffle([
                correct,
                ...item.incorrect_answers.map(decodeHTML)
            ]);

            return { q, c: correct, a: choices };
        } catch (err) {
            const fallback = [
                { q:"Which planet is closest to the Sun?", c:"Mercury", a:["Venus","Mercury","Mars","Earth"] },
                { q:"What is the largest mammal?", c:"Blue whale", a:["Elephant","Blue whale","Giraffe","Orca"] },
                { q:"Which instrument has keys, pedals, and strings?", c:"Piano", a:["Guitar","Piano","Violin","Flute"] },
                { q:"What is the hardest natural substance?", c:"Diamond", a:["Gold","Iron","Diamond","Quartz"] },
                { q:"Which country is shaped like a boot?", c:"Italy", a:["Spain","Italy","Greece","Chile"] }
            ];
            return fallback[Math.floor(Math.random() * fallback.length)];
        }
    }

    window.startTriviaRound = async function () {
        if (!isHost()) return;

        const s = window.triviaState;
        if (!s) return;

        const item = await fetchFreshTriviaQuestion();

        s.current = item;
        s.votes = {};
        s.round++;
        s.phase = "question";
        s.timer = 8;
        s.phaseEndsAt = Date.now() + 8000;

        send("sync-room-trivia", { state: s });

        if (typeof window.receiveTriviaSync === "function") {
            window.receiveTriviaSync({ state: s, roomGameId: window.chaserGame.activeGameId });
        }
    };
}
