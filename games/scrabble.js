/* CHASER SCRABBLE - SEPARATE GAME FILE */
(function () {
    "use strict";

    window.initScrabbleGame = function () {
        const canvas = document.getElementById("gameCanvasContainer");
        const stage = document.getElementById("activeGameStage");
        const roomDisplay = document.getElementById("roomDisplayCode");
        const headerBtns = document.getElementById("headerActionButtonsContainer");
        const chatHeader = document.getElementById("chatHeader");

        if (stage) stage.classList.add("open");
        if (roomDisplay) roomDisplay.innerText = "🔤 Scrabble";
        if (headerBtns) headerBtns.style.display = "none";
        if (chatHeader) chatHeader.classList.add("game-active-mode");

        if (!canvas) return;

        canvas.innerHTML = `
            <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;color:white;text-align:center;padding:20px;box-sizing:border-box;">
                <div style="font-family:Impact,sans-serif;font-size:38px;color:#ffd700;">SCRABBLE</div>
                <div style="font-size:18px;margin-top:10px;">Scrabble file loaded successfully.</div>
                <div style="font-size:14px;margin-top:8px;color:#a3cfbb;">Next: board, tile rack, turns, and scoring.</div>
            </div>
        `;
    };
})();
