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
                font-size: 19px;
                font-weight: 700;
                text-shadow: 0 2px 6px rgba(0,0,0,0.5);
                letter-spacing: 0.5px;
            }

            #eucScoreLabel {
                font-size: 9px;
                font-weight: 600;
                color: #8fa3b3;
                letter-spacing: 1.2px;
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
                font-size: 16px;
                font-weight: 700;
                text-shadow: 0 2px 6px rgba(0,0,0,0.5);
            }

            #eucZoneLabel {
                font-size: 9px;
                font-weight: 600;
                color: #8fa3b3;
                letter-spacing: 1.2px;
                text-transform: uppercase;
                margin-top: 2px;
            }

            #eucPauseBtn {
                position: absolute;
                top: 8px;
                right: 10px;
                width: 28px; height: 28px;
                z-index: 11;
                color: rgba(234,242,248,0.55);
                pointer-events: auto;
                background: transparent;
                border: none;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #eucPauseBtn svg { width: 100%; height: 100%; }

            #eucControls {
                position: absolute;
                bottom: 0; left: 0; right: 0;
                padding-bottom: 14px;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                padding-left: 14px;
                padding-right: 14px;
                z-index: 10;
                box-sizing: border-box;
            }

            .eucJumpZone {
                width: 84px; height: 84px;
                border-radius: 50%;
                background: radial-gradient(circle at 35% 30%, rgba(255,180,90,0.35), rgba(255,140,60,0.18));
                border: 1.5px solid rgba(255,170,90,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #ffd9a8;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 1px;
                text-transform: uppercase;
                transition: transform 0.08s, background 0.08s;
            }
            .eucJumpZone.active {
                transform: scale(0.92);
                background: radial-gradient(circle at 35% 30%, rgba(255,200,110,0.55), rgba(255,150,70,0.3));
            }

            .eucPadZone {
                position: relative;
                width: 128px; height: 128px;
            }
            .eucPadRing {
                position: absolute; inset: 0;
                border-radius: 50%;
                background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
                border: 1.5px solid rgba(255,255,255,0.12);
            }
            .eucPadArrow {
                position: absolute;
                width: 40px; height: 40px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: rgba(234,242,248,0.55);
                transition: background 0.08s, color 0.08s, transform 0.08s;
                border-radius: 10px;
                gap: 1px;
            }
            .eucPadArrow.active {
                background: rgba(255,255,255,0.16);
                color: #fff;
                transform: scale(1.08);
            }
            .eucPadArrow svg { width: 16px; height: 16px; }
            .eucPadArrow .eucDodgeLabel {
                font-size: 7px; font-weight: 700; letter-spacing: 0.5px;
            }
            #eucPadUp    { top: 4px;  left: 44px; }
            #eucPadDown  { bottom: 4px; left: 44px; }
            #eucPadLeft  { left: 4px; top: 44px; }
            #eucPadRight { right: 4px; top: 44px; }
            #eucPadCenter {
                position: absolute; left: 44px; top: 44px; width: 40px; height: 40px;
                border-radius: 50%;
                background: rgba(255,255,255,0.06);
            }
            #eucPadCenterLabel {
                position: absolute; left: 0; top: 0; width: 100%; height: 100%;
                display: flex; align-items: center; justify-content: center;
                font-size: 7px; font-weight: 700; color: rgba(234,242,248,0.3); letter-spacing: 1px;
            }

            .eucOverlay {
                position: absolute; inset: 0;
                display: flex; flex-direction: column;
                align-items: center; justify-content: center;
                background: rgba(8,12,16,0.88);
                z-index: 20;
                text-align: center;
                padding: 20px;
                box-sizing: border-box;
            }
            .eucOverlay.eucHidden { display: none; }

            .eucTitleLogo {
                font-size: 30px;
                font-weight: 800;
                color: #fff;
                letter-spacing: -0.5px;
                margin-bottom: 4px;
                font-family: Impact, 'Arial Black', sans-serif;
            }
            .eucTitleLogo span { color: #4fd1c5; }

            .eucSubtitle {
                font-size: 13px;
                color: #8fa3b3;
                margin-bottom: 22px;
                max-width: 260px;
                line-height: 1.5;
            }

            .eucBigStat {
                font-size: 42px;
                font-weight: 800;
                color: #4fd1c5;
                line-height: 1;
            }
            .eucBigStatLabel {
                font-size: 10px;
                font-weight: 600;
                color: #8fa3b3;
                letter-spacing: 1.2px;
                text-transform: uppercase;
                margin-bottom: 5px;
            }
            .eucStatRow { display: flex; gap: 26px; margin: 18px 0 6px; }

            .eucPlayBtn {
                margin-top: 20px;
                background: #4fd1c5;
                color: #06201d;
                border: none;
                font-size: 15px;
                font-weight: 700;
                padding: 13px 38px;
                border-radius: 100px;
                box-shadow: 0 6px 20px rgba(79,209,197,0.35);
            }
            .eucPlayBtn:active { transform: scale(0.96); }
        </style>

        <div id="eucDriftRoot">
            <canvas id="eucDriftCanvas"></canvas>

            <div id="eucDriftHud">
                <div>
                    <div id="eucScore">0</div>
                    <div id="eucScoreLabel">meters</div>
                </div>
                <div id="eucSpeedWrap">
                    <div id="eucSpeedVal">0 <span style="font-size:10px;font-weight:600;">km/h</span></div>
                    <div id="eucZoneLabel">city</div>
                </div>
            </div>

            <button id="eucPauseBtn" type="button" aria-label="Pause">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            </button>

            <div id="eucControls">
                <div class="eucJumpZone" id="eucJumpZone">JUMP</div>

                <div class="eucPadZone" id="eucPadZone">
                    <div class="eucPadRing"></div>
                    <div id="eucPadCenter"></div>
                    <div id="eucPadCenterLabel">LEAN</div>
                    <div class="eucPadArrow" id="eucPadUp">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                        <span class="eucDodgeLabel">DODGE</span>
                    </div>
                    <div class="eucPadArrow" id="eucPadDown">
                        <span class="eucDodgeLabel">DODGE</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
                    </div>
                    <div class="eucPadArrow" id="eucPadLeft"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></div>
                    <div class="eucPadArrow" id="eucPadRight"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
                </div>
            </div>

            <div class="eucOverlay" id="eucStartOverlay">
                <div class="eucTitleLogo">EUC<span>DRIFT</span></div>
                <div class="eucSubtitle">Lean into it. Ride the wheel through the city, the backroads, and the open track.</div>
                <button class="eucPlayBtn" id="eucPlayBtn" type="button">RIDE</button>
            </div>

            <div class="eucOverlay eucHidden" id="eucGameOverOverlay">
                <div class="eucBigStatLabel">distance</div>
                <div class="eucBigStat" id="eucFinalScore">0</div>
                <div class="eucStatRow">
                    <div>
                        <div class="eucBigStatLabel">best</div>
                        <div style="font-size:19px;font-weight:700;color:#cdd9e1;" id="eucBestScore">0</div>
                    </div>
                    <div>
                        <div class="eucBigStatLabel">top speed</div>
                        <div style="font-size:19px;font-weight:700;color:#cdd9e1;" id="eucTopSpeed">0</div>
                    </div>
                </div>
                <button class="eucPlayBtn" id="eucRetryBtn" type="button">RIDE AGAIN</button>
            </div>

            <div class="eucOverlay eucHidden" id="eucPauseOverlay">
                <div class="eucTitleLogo" style="font-size:24px;">PAUSED</div>
                <button class="eucPlayBtn" id="eucResumeBtn" type="button" style="margin-top:16px;">RESUME</button>
            </div>
        </div>
    `;

    window.__eucDriftRunGame();
};

window.__eucDriftRunGame = function () {
    const root = document.getElementById("eucDriftRoot");
    const canvas = document.getElementById("eucDriftCanvas");
    if (!root || !canvas) return;

    const ctx = canvas.getContext("2d");

    let W = 0, H = 0, DPR = 1;
    let destroyed = false;

    function resize() {
        if (destroyed) return;
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        const rect = root.getBoundingClientRect();
        W = Math.max(280, rect.width);
        H = Math.max(420, rect.height);
        canvas.width = W * DPR;
        canvas.height = H * DPR;
        canvas.style.width = W + "px";
        canvas.style.height = H + "px";
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(root);
    }
    window.addEventListener("resize", resize);
    resize();

    function groundY() { return H * 0.72; }

    // ------------------------------------------------------------
    // Game state
    // ------------------------------------------------------------
    const STATE = { MENU: "menu", PLAY: "play", PAUSE: "pause", OVER: "over" };
    let gameState = STATE.MENU;

    function safeLocalGet(key, fallback) {
        try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
    }
    function safeLocalSet(key, val) {
        try { localStorage.setItem(key, val); } catch (e) {}
    }

    const game = {
        distance: 0,
        speedNorm: 0.45,
        baseScroll: 320,
        best: parseInt(safeLocalGet("eucdrift_best", "0")) || 0,
        topSpeedDisplay: 0,
        zoneIndex: 0,
        zoneNames: ["city", "countryside", "track"],
    };

    // ------------------------------------------------------------
    // Input
    // ------------------------------------------------------------
    const input = {
        leanLeft: false,
        leanRight: false,
    };

    const listenerCleanups = [];
    function on(el, ev, fn, opts) {
        el.addEventListener(ev, fn, opts);
        listenerCleanups.push(() => el.removeEventListener(ev, fn, opts));
    }

    function setupPad() {
        const leanMap = [
            ["eucPadLeft", "leanLeft"],
            ["eucPadRight", "leanRight"],
        ];
        leanMap.forEach(([id, key]) => {
            const el = document.getElementById(id);
            if (!el) return;
            const down = (e) => { e.preventDefault(); input[key] = true; el.classList.add("active"); };
            const up = (e) => { if (e) e.preventDefault(); input[key] = false; el.classList.remove("active"); };
            on(el, "touchstart", down, { passive: false });
            on(el, "touchend", up, { passive: false });
            on(el, "touchcancel", up, { passive: false });
            on(el, "mousedown", down);
            on(el, "mouseup", up);
            on(el, "mouseleave", up);
        });

        const dodgeMap = [
            ["eucPadUp", 1],
            ["eucPadDown", -1],
        ];
        dodgeMap.forEach(([id, dir]) => {
            const el = document.getElementById(id);
            if (!el) return;
            const down = (e) => { e.preventDefault(); el.classList.add("active"); triggerDodge(dir); };
            const up = (e) => { if (e) e.preventDefault(); el.classList.remove("active"); };
            on(el, "touchstart", down, { passive: false });
            on(el, "touchend", up, { passive: false });
            on(el, "touchcancel", up, { passive: false });
            on(el, "mousedown", down);
            on(el, "mouseup", up);
            on(el, "mouseleave", up);
        });

        const jumpEl = document.getElementById("eucJumpZone");
        if (jumpEl) {
            const jumpDown = (e) => { e.preventDefault(); jumpEl.classList.add("active"); triggerJump(); };
            const jumpUp = (e) => { if (e) e.preventDefault(); jumpEl.classList.remove("active"); };
            on(jumpEl, "touchstart", jumpDown, { passive: false });
            on(jumpEl, "touchend", jumpUp, { passive: false });
            on(jumpEl, "touchcancel", jumpUp, { passive: false });
            on(jumpEl, "mousedown", jumpDown);
            on(jumpEl, "mouseup", jumpUp);
            on(jumpEl, "mouseleave", jumpUp);
        }
    }

    function keydownHandler(e) {
        if (e.repeat) return;
        if (e.code === "ArrowLeft" || e.code === "KeyA") input.leanLeft = true;
        if (e.code === "ArrowRight" || e.code === "KeyD") input.leanRight = true;
        if (e.code === "ArrowDown" || e.code === "KeyS") triggerDodge(-1);
        if (e.code === "ArrowUp" || e.code === "KeyW") triggerDodge(1);
        if (e.code === "Space") triggerJump();
    }
    function keyupHandler(e) {
        if (e.code === "ArrowLeft" || e.code === "KeyA") input.leanLeft = false;
        if (e.code === "ArrowRight" || e.code === "KeyD") input.leanRight = false;
    }
    on(window, "keydown", keydownHandler);
    on(window, "keyup", keyupHandler);

    setupPad();

    // ============================================================
    // RIDER
    // ============================================================
    const rider = {
        x: 0, y: 0, baseY: 0, vy: 0,
        onGround: true, jumping: false,
        lean: 0, targetLean: 0,
        lateral: 0, dodgeDir: 0, dodging: false, dodgeTimer: 0,
        wheelAngle: 0, wobble: 0,
        hitFlash: 0,
    };

    const JUMP_GRAVITY = 2200;
    const JUMP_VELOCITY = -760;
    const RIDER_HEIGHT = 86;
    const WHEEL_RADIUS = 19;

    function resetRider() {
        rider.vy = 0;
        rider.onGround = true;
        rider.jumping = false;
        rider.lean = 0;
        rider.targetLean = 0;
        rider.lateral = 0;
        rider.dodgeDir = 0;
        rider.dodging = false;
        rider.dodgeTimer = 0;
        rider.wheelAngle = 0;
        rider.hitFlash = 0;
    }

    function triggerJump() {
        if (gameState !== STATE.PLAY) return;
        if (!rider.onGround) return;
        rider.vy = JUMP_VELOCITY;
        rider.onGround = false;
        rider.jumping = true;
    }

    function triggerDodge(dir) {
        if (gameState !== STATE.PLAY) return;
        if (rider.dodging) return;
        rider.dodging = true;
        rider.dodgeDir = dir;
        rider.dodgeTimer = 0.34;
    }

    function updateRider(dt) {
        let leanTarget = 0;
        if (input.leanLeft) leanTarget -= 1;
        if (input.leanRight) leanTarget += 1;
        rider.targetLean = leanTarget;
        rider.lean += (rider.targetLean - rider.lean) * Math.min(1, dt * 6);

        if (rider.dodging) {
            rider.dodgeTimer -= dt;
            if (rider.dodgeTimer <= 0) rider.dodging = false;
        }
        const lateralTarget = rider.dodging ? rider.dodgeDir : 0;
        rider.lateral += (lateralTarget - rider.lateral) * Math.min(1, dt * 9);

        if (!rider.onGround) {
            rider.vy += JUMP_GRAVITY * dt;
            rider.y += rider.vy * dt;
            if (rider.y >= rider.baseY) {
                rider.y = rider.baseY;
                rider.vy = 0;
                rider.onGround = true;
                rider.jumping = false;
            }
        } else {
            rider.y = rider.baseY;
        }

        rider.wobble += dt * 5.2;
        rider.wheelAngle += dt * (6 + game.speedNorm * 16);

        if (rider.hitFlash > 0) rider.hitFlash -= dt;
    }

    function riderScale() {
        return Math.min(1.1, Math.max(0.7, H / 700));
    }

    function riderHitbox() {
        const scale = riderScale();
        const h = RIDER_HEIGHT * scale;
        const w = 30 * scale;
        const cx = rider.x;
        const top = rider.y - h - WHEEL_RADIUS * scale * 1.5;
        return {
            x: cx - w / 2, y: top, w: w, h: h,
            wheelCenterY: rider.y - WHEEL_RADIUS * scale,
            wheelR: WHEEL_RADIUS * scale,
            airborne: !rider.onGround,
            lateral: rider.lateral,
        };
    }

    function drawRider() {
        const scale = riderScale();
        ctx.save();
        ctx.translate(rider.x, rider.y);

        const leanAngle = rider.lean * 0.22 + rider.lateral * 0.16;
        const bob = rider.onGround ? Math.sin(rider.wobble) * 1.6 * scale : 0;
        ctx.translate(0, bob);
        ctx.rotate(leanAngle);

        const lateralOffset = -rider.lateral * 22 * scale;

        const wheelY = -WHEEL_RADIUS * scale;
        ctx.save();
        ctx.translate(0, wheelY);
        ctx.rotate(rider.wheelAngle);
        ctx.beginPath();
        ctx.arc(0, 0, WHEEL_RADIUS * scale, 0, Math.PI * 2);
        ctx.fillStyle = "#1a2126";
        ctx.fill();
        ctx.strokeStyle = "#0a0d0f";
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, WHEEL_RADIUS * scale * 0.58, 0, Math.PI * 2);
        ctx.fillStyle = "#3a4753";
        ctx.fill();
        ctx.strokeStyle = "#26303a";
        ctx.lineWidth = 1.6 * scale;
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * WHEEL_RADIUS * scale * 0.55, Math.sin(a) * WHEEL_RADIUS * scale * 0.55);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, 3.4 * scale, 0, Math.PI * 2);
        ctx.fillStyle = "#4fd1c5";
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(0, wheelY);
        ctx.fillStyle = "#0d1114";
        ctx.fillRect(-WHEEL_RADIUS * scale * 1.05, -3 * scale, WHEEL_RADIUS * scale * 2.1, 4.5 * scale);
        ctx.restore();

        const hipY = wheelY - 30 * scale + lateralOffset * 0.5;
        const kneeY = wheelY - 10 * scale + lateralOffset * 0.3;
        const legSpread = 8 * scale;

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#1c252c";
        ctx.lineWidth = 8 * scale;

        ctx.beginPath();
        ctx.moveTo(-legSpread * 0.3, hipY);
        ctx.quadraticCurveTo(-legSpread * 1.3, kneeY, -legSpread * 0.6, wheelY + 2 * scale);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(legSpread * 0.3, hipY);
        ctx.quadraticCurveTo(legSpread * 1.3, kneeY, legSpread * 0.6, wheelY + 2 * scale);
        ctx.stroke();

        const shoulderY = hipY - 34 * scale + lateralOffset * 0.4;
        const torsoLean = rider.lean * 6 * scale;
        ctx.strokeStyle = "#212b33";
        ctx.lineWidth = 11 * scale;
        ctx.beginPath();
        ctx.moveTo(0, hipY);
        ctx.quadraticCurveTo(torsoLean * 0.5, (hipY + shoulderY) / 2, torsoLean, shoulderY);
        ctx.stroke();

        ctx.strokeStyle = "#4fd1c5";
        ctx.lineWidth = 2.4 * scale;
        ctx.beginPath();
        ctx.moveTo(2 * scale, hipY - 4 * scale);
        ctx.quadraticCurveTo(torsoLean * 0.5 + 2 * scale, (hipY + shoulderY) / 2, torsoLean + 2 * scale, shoulderY + 4 * scale);
        ctx.stroke();

        const armBackX = torsoLean - 14 * scale - rider.lean * 4 * scale;
        const armBackY = shoulderY + 16 * scale;
        ctx.strokeStyle = "#1c252c";
        ctx.lineWidth = 6.5 * scale;
        ctx.beginPath();
        ctx.moveTo(torsoLean, shoulderY + 2 * scale);
        ctx.quadraticCurveTo(torsoLean - 10 * scale, shoulderY + 10 * scale, armBackX, armBackY);
        ctx.stroke();

        const armFrontX = torsoLean + 16 * scale + rider.lean * 6 * scale;
        const armFrontY = shoulderY + 14 * scale;
        ctx.beginPath();
        ctx.moveTo(torsoLean, shoulderY + 2 * scale);
        ctx.quadraticCurveTo(torsoLean + 12 * scale, shoulderY + 8 * scale, armFrontX, armFrontY);
        ctx.stroke();

        const headY = shoulderY - 14 * scale;
        const headX = torsoLean + rider.lean * 3 * scale;
        ctx.beginPath();
        ctx.arc(headX, headY, 9.5 * scale, 0, Math.PI * 2);
        ctx.fillStyle = "#27323b";
        ctx.fill();
        ctx.fillStyle = "#4fd1c5";
        ctx.beginPath();
        ctx.ellipse(headX + 3.5 * scale, headY - 1 * scale, 4.6 * scale, 2.6 * scale, 0.3, 0, Math.PI * 2);
        ctx.fill();

        if (rider.hitFlash > 0) {
            ctx.globalAlpha = Math.max(0, rider.hitFlash) * 0.6;
            ctx.beginPath();
            ctx.arc(headX, (headY + hipY) / 2, 40 * scale, 0, Math.PI * 2);
            ctx.fillStyle = "#ff4d4d";
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        if (rider.lean > 0.4) {
            ctx.strokeStyle = "rgba(79,209,197," + ((rider.lean - 0.4) * 0.5) + ")";
            ctx.lineWidth = 2 * scale;
            for (let i = 0; i < 3; i++) {
                const ly = hipY - 20 * scale + i * 14 * scale;
                ctx.beginPath();
                ctx.moveTo(-30 * scale - i * 6 * scale, ly);
                ctx.lineTo(-50 * scale - i * 6 * scale, ly);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    // ============================================================
    // WORLD / BACKGROUND
    // ============================================================
    const world = { scrollX: 0 };

    function makeLayer(pieceWidthRange, generator) {
        return { pieces: [], cursor: 0, pieceWidthRange, generator };
    }

    function ensureLayer(layer, viewWidth, parallax) {
        while (layer.cursor < world.scrollX * parallax + viewWidth + 400) {
            const w = layer.pieceWidthRange[0] + Math.random() * (layer.pieceWidthRange[1] - layer.pieceWidthRange[0]);
            layer.pieces.push(layer.generator(layer.cursor, w));
            layer.cursor += w;
        }
        while (layer.pieces.length && (layer.pieces[0].x + layer.pieces[0].w) < world.scrollX * parallax - 200) {
            layer.pieces.shift();
        }
    }

    const cityFar = makeLayer([90, 160], (x, w) => ({ x, w, h: 80 + Math.random() * 160, hue: 200 + Math.random() * 20 }));
    const cityNear = makeLayer([60, 110], (x, w) => ({ x, w, h: 60 + Math.random() * 220, windows: Math.random() > 0.3 }));
    const hillsFar = makeLayer([220, 340], (x, w) => ({ x, w, h: 60 + Math.random() * 70 }));
    const treesNear = makeLayer([50, 90], (x, w) => ({ x, w, h: 70 + Math.random() * 60, type: Math.random() > 0.5 ? "round" : "tall" }));
    const trackPylons = makeLayer([140, 220], (x, w) => ({ x, w, stripe: Math.random() > 0.5 }));

    function currentZoneName() {
        return game.zoneNames[game.zoneIndex % game.zoneNames.length];
    }

    const ZONE_LENGTH = 700;
    function updateZone() {
        game.zoneIndex = Math.floor(game.distance / ZONE_LENGTH) % game.zoneNames.length;
    }

    function zoneSkyColors(name) {
        switch (name) {
            case "city": return ["#1b2838", "#2c4156"];
            case "countryside": return ["#2b3a4f", "#5a7a8c"];
            case "track": return ["#221b30", "#3d2f55"];
            default: return ["#1b2838", "#2c4156"];
        }
    }

    function drawSky() {
        const [top, bottom] = zoneSkyColors(currentZoneName());
        const g = ctx.createLinearGradient(0, 0, 0, groundY());
        g.addColorStop(0, top);
        g.addColorStop(1, bottom);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, groundY());

        if (currentZoneName() === "track") {
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            for (let i = 0; i < 28; i++) {
                const sx = (i * 137 + world.scrollX * 0.02) % W;
                const sy = (i * 53) % (groundY() * 0.6);
                ctx.fillRect(sx, sy, 1.5, 1.5);
            }
        }
    }

    function drawCityLayers() {
        ensureLayer(cityFar, W, 0.25);
        ensureLayer(cityNear, W, 0.55);

        cityFar.pieces.forEach(p => {
            const sx = p.x - world.scrollX * 0.25;
            if (sx > W || sx + p.w < 0) return;
            const top = groundY() - p.h;
            ctx.fillStyle = `hsl(${p.hue}, 22%, 22%)`;
            ctx.fillRect(sx, top, p.w - 4, p.h);
        });

        cityNear.pieces.forEach(p => {
            const sx = p.x - world.scrollX * 0.55;
            if (sx > W || sx + p.w < 0) return;
            const top = groundY() - p.h;
            ctx.fillStyle = "#2e4257";
            ctx.fillRect(sx, top, p.w - 6, p.h);
            if (p.windows) {
                ctx.fillStyle = "rgba(255, 214, 130, 0.55)";
                const cols = Math.max(1, Math.floor((p.w - 6) / 14));
                const rows = Math.max(1, Math.floor(p.h / 18));
                for (let cx = 0; cx < cols; cx++) {
                    for (let cy = 0; cy < rows; cy++) {
                        if ((cx * 7 + cy * 13 + Math.floor(p.x)) % 5 === 0) continue;
                        ctx.fillRect(sx + 5 + cx * 14, top + 8 + cy * 18, 5, 7);
                    }
                }
            }
        });
    }

    function drawCountrysideLayers() {
        ensureLayer(hillsFar, W, 0.2);
        ensureLayer(treesNear, W, 0.5);

        hillsFar.pieces.forEach(p => {
            const sx = p.x - world.scrollX * 0.2;
            if (sx > W + 200 || sx + p.w < -200) return;
            ctx.fillStyle = "#3a5a45";
            ctx.beginPath();
            ctx.moveTo(sx, groundY());
            ctx.quadraticCurveTo(sx + p.w / 2, groundY() - p.h, sx + p.w, groundY());
            ctx.closePath();
            ctx.fill();
        });

        treesNear.pieces.forEach(p => {
            const sx = p.x - world.scrollX * 0.5;
            if (sx > W || sx + p.w < 0) return;
            const baseY = groundY();
            ctx.strokeStyle = "#3f3327";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(sx + p.w / 2, baseY);
            ctx.lineTo(sx + p.w / 2, baseY - p.h * 0.45);
            ctx.stroke();
            ctx.fillStyle = "#456b3e";
            if (p.type === "round") {
                ctx.beginPath();
                ctx.arc(sx + p.w / 2, baseY - p.h * 0.6, p.h * 0.32, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.moveTo(sx + p.w / 2, baseY - p.h);
                ctx.lineTo(sx + p.w / 2 - p.h * 0.18, baseY - p.h * 0.4);
                ctx.lineTo(sx + p.w / 2 + p.h * 0.18, baseY - p.h * 0.4);
                ctx.closePath();
                ctx.fill();
            }
        });
    }

    function drawTrackLayers() {
        ensureLayer(trackPylons, W, 0.4);
        trackPylons.pieces.forEach(p => {
            const sx = p.x - world.scrollX * 0.4;
            if (sx > W || sx + p.w < 0) return;
            ctx.fillStyle = p.stripe ? "#5a3d7a" : "#41305c";
            ctx.fillRect(sx, groundY() - 70, 10, 70);
            ctx.fillStyle = "#caa6ff";
            ctx.fillRect(sx, groundY() - 70, 10, 6);
        });
        ctx.fillStyle = "rgba(120, 80, 200, 0.18)";
        ctx.fillRect(0, groundY() - 110, W, 40);
    }

    function drawBackground() {
        drawSky();
        const zone = currentZoneName();
        if (zone === "city") drawCityLayers();
        else if (zone === "countryside") drawCountrysideLayers();
        else drawTrackLayers();

        ctx.fillStyle = zone === "track" ? "#191220" : (zone === "countryside" ? "#2e3a28" : "#15191d");
        ctx.fillRect(0, groundY(), W, H - groundY());

        const roadH = 14;
        ctx.fillStyle = zone === "track" ? "#2a2138" : "#21262b";
        ctx.fillRect(0, groundY() - 2, W, roadH);

        ctx.fillStyle = zone === "track" ? "#caa6ff" : "#5a6a72";
        const dashW = 26, gapW = 22, period = dashW + gapW;
        const offset = world.scrollX % period;
        for (let x = -offset; x < W; x += period) {
            ctx.fillRect(x, groundY() + 4, dashW, 3.5);
        }
    }

    // ============================================================
    // OBSTACLES
    // ============================================================
    const obstacles = [];
    let nextObstacleAt = 900;
    let obstacleIdSeq = 0;

    const OBSTACLE_DEFS = {
        low: { w: 30, h: 34, color: "#d8553a" },
        wide: { w: 56, h: 16, color: "#555f63" },
    };

    function spawnObstacle() {
        const r = Math.random();
        const type = r < 0.5 ? "low" : "wide";
        const def = OBSTACLE_DEFS[type];
        obstacles.push({
            id: obstacleIdSeq++, type,
            x: world.scrollX + W + 80,
            w: def.w, h: def.h,
        });
    }

    function updateObstacles(dt) {
        const minGap = Math.max(260, 460 - game.distance * 0.06);
        const maxGap = Math.max(380, 680 - game.distance * 0.08);

        if (world.scrollX + W > nextObstacleAt) {
            spawnObstacle();
            nextObstacleAt = world.scrollX + W + minGap + Math.random() * (maxGap - minGap);
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
            if (obstacles[i].x + obstacles[i].w < world.scrollX - 100) obstacles.splice(i, 1);
        }
    }

    function obstacleScreenX(o) { return o.x - world.scrollX; }

    function drawObstacles() {
        const gy = groundY();
        obstacles.forEach(o => {
            const sx = obstacleScreenX(o);
            if (sx > W + 50 || sx < -120) return;
            const def = OBSTACLE_DEFS[o.type];

            if (o.type === "low") {
                ctx.fillStyle = def.color;
                ctx.fillRect(sx, gy - o.h, o.w, o.h);
                ctx.strokeStyle = "rgba(0,0,0,0.25)";
                ctx.lineWidth = 2;
                ctx.strokeRect(sx + 2, gy - o.h + 2, o.w - 4, o.h - 4);
            } else if (o.type === "wide") {
                ctx.fillStyle = def.color;
                ctx.beginPath();
                ctx.ellipse(sx + o.w / 2, gy - 2, o.w / 2, o.h / 2 + 4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#3a4145";
                ctx.beginPath();
                ctx.ellipse(sx + o.w * 0.35, gy - 3, o.w * 0.18, o.h * 0.3, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    function checkCollisions() {
        const hb = riderHitbox();
        const riderLeft = hb.x, riderRight = hb.x + hb.w;

        for (const o of obstacles) {
            const sx = obstacleScreenX(o);
            const oLeft = sx, oRight = sx + o.w;
            if (oRight < riderLeft || oLeft > riderRight) continue;

            if (o.type === "low") {
                if (hb.airborne) continue;
                registerHit();
                return;
            }
            if (o.type === "wide") {
                if (Math.abs(hb.lateral) > 0.5) continue;
                if (hb.airborne) continue;
                registerHit();
                return;
            }
        }
    }

    function registerHit() {
        if (rider.hitFlash > 0) return;
        rider.hitFlash = 0.5;
        endGame();
    }

    // ============================================================
    // HUD elements
    // ============================================================
    const el = {
        score: document.getElementById("eucScore"),
        speedVal: document.getElementById("eucSpeedVal"),
        zoneLabel: document.getElementById("eucZoneLabel"),
        startOverlay: document.getElementById("eucStartOverlay"),
        gameOverOverlay: document.getElementById("eucGameOverOverlay"),
        pauseOverlay: document.getElementById("eucPauseOverlay"),
        finalScore: document.getElementById("eucFinalScore"),
        bestScore: document.getElementById("eucBestScore"),
        topSpeed: document.getElementById("eucTopSpeed"),
        playBtn: document.getElementById("eucPlayBtn"),
        retryBtn: document.getElementById("eucRetryBtn"),
        resumeBtn: document.getElementById("eucResumeBtn"),
        pauseBtn: document.getElementById("eucPauseBtn"),
    };

    function updateHUD() {
        el.score.textContent = Math.floor(game.distance);
        const kmh = Math.round(18 + game.speedNorm * 64);
        el.speedVal.innerHTML = kmh + ' <span style="font-size:10px;font-weight:600;">km/h</span>';
        if (kmh > game.topSpeedDisplay) game.topSpeedDisplay = kmh;
        el.zoneLabel.textContent = currentZoneName();
    }

    // ============================================================
    // LIFECYCLE
    // ============================================================
    let lastTime = 0;
    let rafId = null;

    function startGame() {
        game.distance = 0;
        game.speedNorm = 0.45;
        game.topSpeedDisplay = 0;
        world.scrollX = 0;
        obstacles.length = 0;
        nextObstacleAt = 900;
        resetRider();
        rider.baseY = groundY();
        rider.y = rider.baseY;
        rider.x = Math.min(110, W * 0.22);

        el.startOverlay.classList.add("eucHidden");
        el.gameOverOverlay.classList.add("eucHidden");
        el.pauseOverlay.classList.add("eucHidden");
        gameState = STATE.PLAY;
        lastTime = performance.now();
        rafId = requestAnimationFrame(loop);
    }

    function endGame() {
        gameState = STATE.OVER;
        const finalDist = Math.floor(game.distance);
        if (finalDist > game.best) {
            game.best = finalDist;
            safeLocalSet("eucdrift_best", String(game.best));
        }
        el.finalScore.textContent = finalDist;
        el.bestScore.textContent = game.best;
        el.topSpeed.textContent = game.topSpeedDisplay + " km/h";
        setTimeout(() => {
            if (!destroyed) el.gameOverOverlay.classList.remove("eucHidden");
        }, 550);
    }

    function pauseGame() {
        if (gameState !== STATE.PLAY) return;
        gameState = STATE.PAUSE;
        el.pauseOverlay.classList.remove("eucHidden");
    }

    function resumeGame() {
        if (gameState !== STATE.PAUSE) return;
        gameState = STATE.PLAY;
        el.pauseOverlay.classList.add("eucHidden");
        lastTime = performance.now();
        rafId = requestAnimationFrame(loop);
    }

    on(el.playBtn, "click", startGame);
    on(el.retryBtn, "click", startGame);
    on(el.resumeBtn, "click", resumeGame);
    on(el.pauseBtn, "click", pauseGame);

    function update(dt) {
        rider.baseY = groundY();

        const accel = rider.lean * 0.55;
        game.speedNorm += accel * dt;
        if (Math.abs(rider.lean) < 0.05) {
            game.speedNorm += (0.45 - game.speedNorm) * dt * 0.5;
        }
        game.speedNorm = Math.max(0.18, Math.min(1.25, game.speedNorm));

        const scrollSpeed = game.baseScroll * game.speedNorm;
        world.scrollX += scrollSpeed * dt;
        game.distance += scrollSpeed * dt * 0.06;

        updateZone();
        updateRider(dt);
        updateObstacles(dt);
        checkCollisions();
        updateHUD();
    }

    function render() {
        ctx.clearRect(0, 0, W, H);
        drawBackground();
        drawObstacles();
        drawRider();
    }

    function loop(now) {
        if (destroyed) return;
        if (gameState !== STATE.PLAY) return;
        const dt = Math.min(0.04, (now - lastTime) / 1000);
        lastTime = now;
        update(dt);
        render();
        rafId = requestAnimationFrame(loop);
    }

    function idleRender() {
        rider.baseY = groundY();
        rider.y = rider.baseY;
        rider.x = Math.min(110, W * 0.22);
        render();
    }
    idleRender();

    const idleResizeHandler = () => { if (gameState !== STATE.PLAY && !destroyed) idleRender(); };
    on(window, "resize", idleResizeHandler);

    el.bestScore.textContent = game.best;

    // ============================================================
    // CLEANUP — called by Chaser's exit/shutdown flow
    // ============================================================
    window.__eucDriftCleanup = function () {
        destroyed = true;
        gameState = STATE.MENU;
        if (rafId) cancelAnimationFrame(rafId);
        if (resizeObserver) {
            try { resizeObserver.disconnect(); } catch (e) {}
        }
        listenerCleanups.forEach(fn => { try { fn(); } catch (e) {} });
        listenerCleanups.length = 0;
        window.__eucDriftCleanup = null;
    };
};

/* Hook EUC Drift's teardown into Chaser's universal game exit, so
   switching games or closing the arcade doesn't leave its RAF loop
   or window listeners running in the background. */
(function () {
    if (typeof window.cleanupRunningGameEngine !== "function") return;
    if (window.cleanupRunningGameEngine.__eucDriftWrapped) return;

    const oldCleanup = window.cleanupRunningGameEngine;

    window.cleanupRunningGameEngine = function () {
        if (window.__eucDriftCleanup) {
            try { window.__eucDriftCleanup(); } catch (e) {}
        }
        return oldCleanup.apply(this, arguments);
    };

    window.cleanupRunningGameEngine.__eucDriftWrapped = true;
})();
