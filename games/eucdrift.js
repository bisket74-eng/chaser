/* ============================================================
   EUC DRIFT — Chaser arcade integration
   Solo arcade game (no Supabase sync needed, same pattern as
   Solitaire / Hangman: window.initEucDriftGame() builds the
   whole thing inside #gameCanvasContainer).
   ============================================================ */

window.initEucDriftGame = function () {
    const container = document.getElementById("gameCanvasContainer");
    if (!container) return;

    // Tear down any previous instance cleanly (re-launch from hub)
    if (window.__eucDriftCleanup) {
        try { window.__eucDriftCleanup(); } catch (e) {}
    }

    container.innerHTML = `
        <style>
            #eucDriftRoot {
                position: relative;
                width: 100%;
                height: 100%;
                min-height: 480px;
                overflow: hidden;
                background: #0c1116;
                font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
                box-sizing: border-box;
                border-radius: 10px;
                touch-action: none;
            }

            #eucDriftCanvas {
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                display: block;
            }

            #eucDriftHud {
                position: absolute;
                top: 0; left: 0; right: 0;
                padding: 10px 14px 0 14px;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                pointer-events: none;
                z-index: 10;
                box-sizing: border-box;
            }

            #eucScore {
                color: #eaf2f8;
                font-size: 32px;
                font-weight: 800;
                text-shadow: 0 2px 6px rgba(0,0,0,0.5);
                letter-spacing: 0.5px;
            }

            #eucScoreLabel {
                font-size: 12px;
                font-weight: 700;
                color: #b8c8d4;
                letter-spacing: 1.4px;
                text-transform: uppercase;
            }

            #eucSpeedWrap {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                color: #eaf2f8;
                padding-right: 36px;
            }

            #eucSpeedVal {
                font-size: 26px;
                font-weight: 800;
                text-shadow: 0 2px 6px rgba(0,0,0,0.5);
            }

            #eucZoneLabel {
                font-size: 12px
