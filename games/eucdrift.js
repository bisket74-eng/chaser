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
                font-size: 24px;
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
                font-size: 19px;
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
                width: 100px; height: 100px;
                border-radius: 50%;
                background: radial-gradient(circle at 35% 30%, rgba(255,180,90,0.35), rgba(255,140,60,0.18));
                border: 1.5px solid rgba(255,170,90,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #ffd9a8;
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 1px;
                text-transform: uppercase;
                transition: transform 0.08s, background 0.08s;
                text-align: center;
                line-height: 1.2;
            }
            .eucJumpZone.active {
                transform: scale(0.92);
                background: radial-gradient(circle at 35% 30%, rgba(255,200,110,0.55), rgba(255,150,70,0.3));
            }

            .eucPadZone {
                position: relative;
                width: 152px; height: 152px;
            }
            .eucPadRing {
                position: absolute; inset: 0;
                border-radius: 50%;
                background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
                border: 1.5px solid rgba(255,255,255,0.12);
            }
            .eucPadArrow {
                position: absolute;
                width: 48px; height: 48px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: rgba(234,242,248,0.55);
                transition: background 0.08s, color 0.08s, transform 0.08s;
                border-radius: 12px;
                gap: 2px;
            }
            .eucPadArrow.active {
                background: rgba(255,255,255,0.16);
                color: #fff;
                transform: scale(1.08);
            }
            .eucPadArrow svg { width: 19px; height: 19px; }
            .eucPadArrow .eucDodgeLabel {
                font-size: 8px; font-weight: 700; letter-spacing: 0.5px;
            }
            #eucPadUp    { top: 4px;  left: 52px; }
            #eucPadDown  { bottom: 4px; left: 52px; }
            #eucPadLeft  { left: 4px; top: 52px; }
            #eucPadRight { right: 4px; top: 52px; }
            #eucPadCenter {
                position: absolute; left: 52px; top: 52px; width: 48px; height: 48px;
                border-radius: 50%;
                background: rgba(255,255,255,0.06);
            }
            #eucPadCenterLabel {
                position: absolute; left: 0; top: 0; width: 100%; height: 100%;
                display: flex; align-items: center; justify-content: center;
                font-size: 8px; font-weight: 700; color: rgba(234,242,248,0.3); letter-spacing: 1px;
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
                    <div id="eucScoreLabel">feet</div>
                </div>
                <div id="eucSpeedWrap">
                    <div id="eucSpeedVal">0 <span style="font-size:10px;font-weight:600;">mph</span></div>
                    <div id="eucZoneLabel">city</div>
                </div>
            </div>

            <button id="eucPauseBtn" type="button" aria-label="Pause">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            </button>

            <div id="eucControls">
                <div class="eucJumpZone" id="eucJumpZone">STAND</div>

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
                <div class="eucBigStatLabel">distance (ft)</div>
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
    const STATE = { MENU: "menu", PLAY: "play", PAUSE: "pause", CRASHING: "crashing", OVER: "over" };
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
        trickScoreFlash: null,
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
            const jumpDown = (e) => { e.preventDefault(); jumpEl.classList.add("active"); triggerTrickButton(); };
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
        if (e.code === "Space") triggerTrickButton();
    }
    function keyupHandler(e) {
        if (e.code === "ArrowLeft" || e.code === "KeyA") input.leanLeft = false;
        if (e.code === "ArrowRight" || e.code === "KeyD") input.leanRight = false;
    }
    on(window, "keydown", keydownHandler);
    on(window, "keyup", keyupHandler);

    setupPad();

    // ============================================================
    // LANES + RIDER
    // ============================================================
    // Two lanes: TOP (lane 0) and BOTTOM (lane 1). The rider's
    // visual Y position is derived from groundY() + a per-lane
    // offset, and dodge up/down smoothly slides between them.
    const LANE_TOP = 0;
    const LANE_BOTTOM = 1;
    const LANE_GAP = 0; // set per-frame in layout(), road band height / 2 ish

    const rider = {
        x: 0,
        lane: LANE_BOTTOM,       // which lane the rider currently occupies (logical)
        laneT: 1,                // 0 = top lane visually, 1 = bottom lane visually (smoothed)
        targetLaneT: 1,
        y: 0, baseY: 0, vy: 0,
        airborne: false,
        launchSpeedNorm: 0,       // speedNorm captured at the moment of takeoff (height/distance scale)
        lean: 0, targetLean: 0,
        wheelAngle: 0, wobble: 0,
        hitFlash: 0,
        sitting: false,           // ground-only pose toggle from the trick button
        sitT: 0,                  // smoothed 0..1 sit amount
        tricks: [],                // tricks performed during current air time: [{name, t}]
        trickFlashTimer: 0,        // brief on-screen "+trick" label timer
        trickFlashLabel: "",
        crashed: false,
        crashTimer: 0,
    };

    const JUMP_GRAVITY = 1900;
    const RIDER_HEIGHT = 100;
    const WHEEL_RADIUS = 23;

    // Minimum speedNorm required to launch off a ramp at all.
    const MIN_LAUNCH_SPEED = 0.42;
    // Brake strength when leaning back hard (lets you nearly stop for a lane hazard).
    const BRAKE_STRENGTH = 1.35;

    const TRICK_NAMES = ["360 spin", "tabletop", "backflip-ish wobble", "one-foot grab", "superman lean"];

    function resetRider() {
        rider.lane = LANE_BOTTOM;
        rider.laneT = 1;
        rider.targetLaneT = 1;
        rider.vy = 0;
        rider.airborne = false;
        rider.launchSpeedNorm = 0;
        rider.lean = 0;
        rider.targetLean = 0;
        rider.wheelAngle = 0;
        rider.hitFlash = 0;
        rider.sitting = false;
        rider.sitT = 0;
        rider.tricks = [];
        rider.trickFlashTimer = 0;
        rider.crashed = false;
        rider.crashTimer = 0;
    }

    function laneCenterOffset(laneT) {
        // laneT: 0 = top lane, 1 = bottom lane. Returns a vertical offset
        // (px, positive = lower on screen) from the road's overall center,
        // applied on top of groundY() baseline. Lane spacing scales with H.
        const spacing = Math.max(54, H * 0.16);
        return (laneT - 0.5) * spacing;
    }

    function triggerDodge(dir) {
        if (gameState !== STATE.PLAY) return;
        if (rider.crashed) return;
        // dir +1 = dodge "up" input -> top lane, dir -1 = dodge "down" input -> bottom lane
        const newLane = dir > 0 ? LANE_TOP : LANE_BOTTOM;
        if (newLane === rider.lane) return;
        rider.lane = newLane;
        rider.targetLaneT = newLane === LANE_TOP ? 0 : 1;
    }

    function triggerTrickButton() {
        if (gameState !== STATE.PLAY) return;
        if (rider.crashed) return;

        if (rider.airborne) {
            if (rider.tricks.length >= 3) return; // cap chained tricks
            const name = TRICK_NAMES[Math.floor(Math.random() * TRICK_NAMES.length)];
            rider.tricks.push({ name, t: 0 });
            rider.trickFlashLabel = name;
            rider.trickFlashTimer = 0.9;
        } else {
            // ground toggle: sit / stand
            rider.sitting = !rider.sitting;
        }
    }

    // Called when the rider's lane-center crosses a ramp's x position
    // while in the ramp's lane and on the ground — launches a jump.
    function launchFromRamp() {
        if (rider.airborne || rider.crashed) return;
        if (game.speedNorm < MIN_LAUNCH_SPEED) return; // too slow to get real air
        rider.airborne = true;
        rider.launchSpeedNorm = game.speedNorm;
        rider.tricks = [];
        // air time + height both scale with speed at takeoff
        const speedFactor = Math.min(1.4, game.speedNorm / 0.6);
        rider.vy = -(620 + speedFactor * 420);
        rider.sitting = false;
    }

    function updateRider(dt) {
        if (rider.crashed) {
            rider.crashTimer -= dt;
            rider.wheelAngle += dt * 2;
            return;
        }

        // lean target from input (back = brake/-1, forward = accelerate/+1)
        let leanTarget = 0;
        if (input.leanLeft) leanTarget -= 1;
        if (input.leanRight) leanTarget += 1;
        rider.targetLean = leanTarget;
        rider.lean += (rider.targetLean - rider.lean) * Math.min(1, dt * 6);

        // lane slide (dodge)
        rider.laneT += (rider.targetLaneT - rider.laneT) * Math.min(1, dt * 10);

        // ground sit/stand smoothing (locked out while airborne)
        const sitTarget = (!rider.airborne && rider.sitting) ? 1 : 0;
        rider.sitT += (sitTarget - rider.sitT) * Math.min(1, dt * 9);

        // vertical jump physics
        if (rider.airborne) {
            rider.vy += JUMP_GRAVITY * dt;
            rider.y += rider.vy * dt;

            if (rider.y >= 0) {
                // landing
                rider.y = 0;
                rider.vy = 0;

                const finishedTricks = rider.tricks.length;
                const allTricksLanded = rider.tricks.every(t => t.t >= 0.6);

                if (finishedTricks > 0 && !allTricksLanded) {
                    crashRider();
                } else {
                    if (finishedTricks > 0) {
                        const bonus = finishedTricks * finishedTricks * 40; // chained tricks multiply
                        game.distance += bonus * 0.06;
                        game.trickScoreFlash = { amount: bonus, timer: 1.2 };
                    }
                    rider.airborne = false;
                    rider.tricks = [];
                }
            }
        } else {
            rider.y = 0;
        }

        // advance trick animation timers (each trick needs ~0.6s to "land" safely)
        if (rider.tricks.length) {
            rider.tricks.forEach(t => { t.t += dt; });
        }
        if (rider.trickFlashTimer > 0) rider.trickFlashTimer -= dt;

        rider.wobble += dt * 5.2;
        rider.wheelAngle += dt * (6 + game.speedNorm * 16);

        if (rider.hitFlash > 0) rider.hitFlash -= dt;
    }

    function crashRider() {
        rider.crashed = true;
        rider.crashTimer = 0.9;
        rider.hitFlash = 0.6;
        endGame();
    }

    function riderScale() {
        return Math.min(1.25, Math.max(0.85, H / 700)) * 1.18; // overall bigger per request
    }

    function riderGroundY() {
        return groundY() + laneCenterOffset(rider.laneT);
    }

    function riderHitbox() {
        const scale = riderScale();
        const sitShrink = rider.sitT * 0.3;
        const h = RIDER_HEIGHT * scale * (1 - sitShrink);
        const w = 32 * scale;
        const cx = rider.x;
        const baseY = riderGroundY() + rider.y;
        const top = baseY - h - WHEEL_RADIUS * scale * 1.4;
        return {
            x: cx - w / 2, y: top, w: w, h: h,
            lane: rider.lane,
            airborne: rider.airborne,
        };
    }

    function drawRider() {
        if (rider.crashed && rider.crashTimer <= 0) return;

        const scale = riderScale();
        const baseY = riderGroundY();
        ctx.save();
        ctx.translate(rider.x, baseY + rider.y);

        if (rider.crashed) {
            // simple tumble effect
            const tumble = (0.9 - Math.max(0, rider.crashTimer)) * 6;
            ctx.rotate(tumble);
            ctx.globalAlpha = Math.max(0.15, rider.crashTimer / 0.9);
        }

        const leanAngle = rider.airborne
            ? Math.min(0.5, (rider.tricks.length * 0.35)) * Math.sin(performance.now() / 120)
            : rider.lean * 0.22;
        const bob = (!rider.airborne && !rider.crashed) ? Math.sin(rider.wobble) * 1.6 * scale : 0;
        ctx.translate(0, bob);
        ctx.rotate(leanAngle);

        const sit = rider.sitT;
        const crouch = sit * 20 * scale;

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
        ctx.arc(0, 0, 3.8 * scale, 0, Math.PI * 2);
        ctx.fillStyle = "#4fd1c5";
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(0, wheelY);
        ctx.fillStyle = "#0d1114";
        ctx.fillRect(-WHEEL_RADIUS * scale * 1.05, -3.4 * scale, WHEEL_RADIUS * scale * 2.1, 5 * scale);
        ctx.restore();

        const hipY = wheelY - 34 * scale + crouch * 0.5;
        const kneeY = wheelY - 11 * scale + crouch * 0.7;
        const legSpread = 9 * scale;

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#1c252c";
        ctx.lineWidth = 9 * scale;

        ctx.beginPath();
        ctx.moveTo(-legSpread * 0.3, hipY);
        ctx.quadraticCurveTo(-legSpread * 1.3, kneeY, -legSpread * 0.6, wheelY + 2 * scale);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(legSpread * 0.3, hipY);
        ctx.quadraticCurveTo(legSpread * 1.3, kneeY, legSpread * 0.6, wheelY + 2 * scale);
        ctx.stroke();

        const shoulderY = hipY - 36 * scale * (1 - sit * 0.4);
        const torsoLean = rider.lean * 6 * scale;
        ctx.strokeStyle = "#212b33";
        ctx.lineWidth = 12 * scale;
        ctx.beginPath();
        ctx.moveTo(0, hipY);
        ctx.quadraticCurveTo(torsoLean * 0.5, (hipY + shoulderY) / 2, torsoLean, shoulderY);
        ctx.stroke();

        ctx.strokeStyle = "#4fd1c5";
        ctx.lineWidth = 2.6 * scale;
        ctx.beginPath();
        ctx.moveTo(2 * scale, hipY - 4 * scale);
        ctx.quadraticCurveTo(torsoLean * 0.5 + 2 * scale, (hipY + shoulderY) / 2, torsoLean + 2 * scale, shoulderY + 4 * scale);
        ctx.stroke();

        const armBackX = torsoLean - 15 * scale - rider.lean * 4 * scale;
        const armBackY = shoulderY + 17 * scale;
        ctx.strokeStyle = "#1c252c";
        ctx.lineWidth = 7 * scale;
        ctx.beginPath();
        ctx.moveTo(torsoLean, shoulderY + 2 * scale);
        ctx.quadraticCurveTo(torsoLean - 11 * scale, shoulderY + 11 * scale, armBackX, armBackY);
        ctx.stroke();

        const armFrontX = torsoLean + 17 * scale + rider.lean * 6 * scale;
        const armFrontY = shoulderY + 15 * scale;
        ctx.beginPath();
        ctx.moveTo(torsoLean, shoulderY + 2 * scale);
        ctx.quadraticCurveTo(torsoLean + 13 * scale, shoulderY + 9 * scale, armFrontX, armFrontY);
        ctx.stroke();

        const headY = shoulderY - 15 * scale;
        const headX = torsoLean + rider.lean * 3 * scale;
        ctx.beginPath();
        ctx.arc(headX, headY, 10.2 * scale, 0, Math.PI * 2);
        ctx.fillStyle = "#27323b";
        ctx.fill();
        ctx.fillStyle = "#4fd1c5";
        ctx.beginPath();
        ctx.ellipse(headX + 3.8 * scale, headY - 1 * scale, 5 * scale, 2.8 * scale, 0.3, 0, Math.PI * 2);
        ctx.fill();

        if (rider.hitFlash > 0) {
            ctx.globalAlpha = Math.max(0, rider.hitFlash) * 0.6;
            ctx.beginPath();
            ctx.arc(headX, (headY + hipY) / 2, 44 * scale, 0, Math.PI * 2);
            ctx.fillStyle = "#ff4d4d";
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        if (!rider.airborne && rider.lean > 0.4) {
            ctx.strokeStyle = "rgba(79,209,197," + ((rider.lean - 0.4) * 0.5) + ")";
            ctx.lineWidth = 2.2 * scale;
            for (let i = 0; i < 3; i++) {
                const ly = hipY - 20 * scale + i * 14 * scale;
                ctx.beginPath();
                ctx.moveTo(-32 * scale - i * 6 * scale, ly);
                ctx.lineTo(-54 * scale - i * 6 * scale, ly);
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

    function laneBandTop() {
        const spacing = Math.max(54, H * 0.16);
        return groundY() - spacing * 0.5 - 26;
    }
    function laneBandHeight() {
        const spacing = Math.max(54, H * 0.16);
        return spacing + 52;
    }

    function drawBackground() {
        drawSky();
        const zone = currentZoneName();
        if (zone === "city") drawCityLayers();
        else if (zone === "countryside") drawCountrysideLayers();
        else drawTrackLayers();

        const bandTop = laneBandTop();
        const bandH = laneBandHeight();
        const bandMid = bandTop + bandH / 2;

        // ground below the road band
        ctx.fillStyle = zone === "track" ? "#191220" : (zone === "countryside" ? "#2e3a28" : "#15191d");
        ctx.fillRect(0, bandTop + bandH, W, H - (bandTop + bandH));

        // road surface band (covers both lanes)
        ctx.fillStyle = zone === "track" ? "#2a2138" : "#21262b";
        ctx.fillRect(0, bandTop, W, bandH);

        // outer edge lines
        ctx.fillStyle = zone === "track" ? "#caa6ff" : "#7a8a92";
        ctx.fillRect(0, bandTop, W, 3);
        ctx.fillRect(0, bandTop + bandH - 3, W, 3);

        // center divider (dashed) — this is the line you dodge across
        ctx.fillStyle = zone === "track" ? "#ffd86a" : "#e8c34a";
        const dashW = 30, gapW = 20, period = dashW + gapW;
        const offset = world.scrollX % period;
        for (let x = -offset; x < W; x += period) {
            ctx.fillRect(x, bandMid - 2, dashW, 4);
        }
    }


    // ============================================================
    // OBSTACLES
    // ============================================================
    // Three kinds:
    //  'crate'   - sits in ONE lane. Must be in the OTHER lane to pass.
    //  'barrier' - spans BOTH lanes. Must be airborne to clear it,
    //              regardless of lane (a forced jump).
    //  'ramp'    - sits in ONE lane, not a hazard. Riding over it while
    //              on the ground and in that lane launches a jump.
    //              Standing in the other lane just rides past it.
    const obstacles = [];
    let nextObstacleAt = 900;
    let obstacleIdSeq = 0;

    const OBSTACLE_DEFS = {
        crate:   { w: 40, h: 40, color: "#d8553a" },
        barrier: { w: 26, h: 46, color: "#c9a23b" },
        ramp:    { w: 60, h: 26, color: "#4fd1c5" },
    };

    function spawnObstacle() {
        const r = Math.random();
        let type;
        if (r < 0.42) type = "crate";
        else if (r < 0.62) type = "barrier";
        else type = "ramp";

        const def = OBSTACLE_DEFS[type];
        const lane = Math.random() < 0.5 ? LANE_TOP : LANE_BOTTOM;

        const entry = {
            id: obstacleIdSeq++, type,
            x: world.scrollX + W + 80,
            w: def.w, h: def.h,
            lane: type === "barrier" ? null : lane, // barriers span both lanes
            triggered: false, // ramps: only launch once per pass
        };

        obstacles.push(entry);

        // Place a ramp shortly before most barriers so a fast rider has a
        // natural way to already be airborne when it arrives. Skipped at
        // low chance to keep some barriers a real "must already be flying" test.
        if (type === "barrier" && Math.random() < 0.6) {
            obstacles.push({
                id: obstacleIdSeq++, type: "ramp",
                x: entry.x - 170,
                w: OBSTACLE_DEFS.ramp.w, h: OBSTACLE_DEFS.ramp.h,
                lane: Math.random() < 0.5 ? LANE_TOP : LANE_BOTTOM,
                triggered: false,
            });
        }
    }

    function updateObstacles(dt) {
        const minGap = Math.max(300, 520 - game.distance * 0.05);
        const maxGap = Math.max(440, 760 - game.distance * 0.07);

        if (world.scrollX + W > nextObstacleAt) {
            spawnObstacle();
            nextObstacleAt = world.scrollX + W + minGap + Math.random() * (maxGap - minGap);
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
            if (obstacles[i].x + obstacles[i].w < world.scrollX - 100) obstacles.splice(i, 1);
        }

        // ramp launch check: rider must be on ground, in the ramp's lane,
        // and overlapping it horizontally
        if (!rider.airborne && !rider.crashed) {
            for (const o of obstacles) {
                if (o.type !== "ramp" || o.triggered) continue;
                if (o.lane !== rider.lane) continue;
                const sx = obstacleScreenX(o);
                if (sx <= rider.x && sx + o.w >= rider.x - 6) {
                    o.triggered = true;
                    launchFromRamp();
                }
            }
        }
    }

    function obstacleScreenX(o) { return o.x - world.scrollX; }

    function obstacleLaneY(o) {
        const laneT = o.lane === LANE_TOP ? 0 : (o.lane === LANE_BOTTOM ? 1 : 0.5);
        return groundY() + laneCenterOffset(laneT);
    }

    function drawObstacles() {
        obstacles.forEach(o => {
            const sx = obstacleScreenX(o);
            if (sx > W + 60 || sx < -140) return;
            const def = OBSTACLE_DEFS[o.type];

            if (o.type === "crate") {
                const gy = obstacleLaneY(o);
                ctx.fillStyle = def.color;
                ctx.fillRect(sx, gy - o.h, o.w, o.h);
                ctx.strokeStyle = "rgba(0,0,0,0.3)";
                ctx.lineWidth = 2.5;
                ctx.strokeRect(sx + 3, gy - o.h + 3, o.w - 6, o.h - 6);
                ctx.beginPath();
                ctx.moveTo(sx, gy - o.h); ctx.lineTo(sx + o.w, gy);
                ctx.moveTo(sx + o.w, gy - o.h); ctx.lineTo(sx, gy);
                ctx.strokeStyle = "rgba(0,0,0,0.22)";
                ctx.stroke();
            } else if (o.type === "barrier") {
                const bandTop = laneBandTop();
                const bandH = laneBandHeight();
                ctx.fillStyle = def.color;
                ctx.fillRect(sx, bandTop + 4, o.w, bandH - 8);
                ctx.fillStyle = "rgba(0,0,0,0.25)";
                for (let stripeY = bandTop + 8; stripeY < bandTop + bandH - 6; stripeY += 14) {
                    ctx.fillRect(sx + 2, stripeY, o.w - 4, 6);
                }
            } else if (o.type === "ramp") {
                const gy = obstacleLaneY(o);
                ctx.fillStyle = def.color;
                ctx.beginPath();
                ctx.moveTo(sx, gy);
                ctx.lineTo(sx + o.w, gy);
                ctx.lineTo(sx + o.w * 0.62, gy - o.h);
                ctx.lineTo(sx + o.w * 0.18, gy - o.h * 0.7);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = "rgba(255,255,255,0.5)";
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        });
    }

    function checkCollisions() {
        if (rider.crashed) return;
        const hb = riderHitbox();
        const riderLeft = hb.x, riderRight = hb.x + hb.w;

        for (const o of obstacles) {
            if (o.type === "ramp") continue; // never a hazard
            const sx = obstacleScreenX(o);
            const oLeft = sx, oRight = sx + o.w;
            if (oRight < riderLeft || oLeft > riderRight) continue;

            if (o.type === "crate") {
                if (hb.airborne) continue;       // jumping clears any crate too
                if (o.lane !== hb.lane) continue; // safe if in the other lane
                registerHit();
                return;
            }
            if (o.type === "barrier") {
                if (hb.airborne) continue; // must be jumping — lane doesn't matter
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
        jumpZone: document.getElementById("eucJumpZone"),
    };

    function updateHUD() {
        el.score.textContent = Math.floor(game.distance);
        const mph = Math.round(11 + game.speedNorm * 40);
        el.speedVal.innerHTML = mph + ' <span style="font-size:10px;font-weight:600;">mph</span>';
        if (mph > game.topSpeedDisplay) game.topSpeedDisplay = mph;
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
        game.trickScoreFlash = null;
        world.scrollX = 0;
        obstacles.length = 0;
        nextObstacleAt = 900;
        resetRider();
        rider.y = 0;
        rider.x = Math.min(110, W * 0.22);

        el.startOverlay.classList.add("eucHidden");
        el.gameOverOverlay.classList.add("eucHidden");
        el.pauseOverlay.classList.add("eucHidden");
        gameState = STATE.PLAY;
        lastTime = performance.now();
        rafId = requestAnimationFrame(loop);
    }

    function endGame() {
        gameState = STATE.CRASHING;
        const finalDist = Math.floor(game.distance);
        if (finalDist > game.best) {
            game.best = finalDist;
            safeLocalSet("eucdrift_best", String(game.best));
        }
        el.finalScore.textContent = finalDist;
        el.bestScore.textContent = game.best;
        el.topSpeed.textContent = game.topSpeedDisplay + " mph";
        setTimeout(() => {
            if (destroyed) return;
            gameState = STATE.OVER;
            el.gameOverOverlay.classList.remove("eucHidden");
        }, 900);
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
        // Speed control: lean forward accelerates, lean back BRAKES (can
        // pull you down near a stop if held), no input drifts gently back
        // toward a comfortable cruise speed.
        if (rider.lean > 0.02) {
            game.speedNorm += rider.lean * 0.55 * dt;
        } else if (rider.lean < -0.02) {
            // braking is strong and proportional to how hard you lean back,
            // so holding it can actually bring you to a near-stop in time
            game.speedNorm += rider.lean * BRAKE_STRENGTH * dt;
        } else {
            game.speedNorm += (0.45 - game.speedNorm) * dt * 0.5;
        }
        game.speedNorm = Math.max(0.05, Math.min(1.3, game.speedNorm));

        const scrollSpeed = game.baseScroll * game.speedNorm;
        world.scrollX += scrollSpeed * dt;
        game.distance += scrollSpeed * dt * 0.06;

        updateZone();
        updateRider(dt);
        updateObstacles(dt);
        checkCollisions();
        updateHUD();

        if (game.trickScoreFlash && game.trickScoreFlash.timer > 0) {
            game.trickScoreFlash.timer -= dt;
        }
    }

    function render() {
        ctx.clearRect(0, 0, W, H);
        drawBackground();
        drawObstacles();
        drawRider();
        drawTrickFlash();
        updateTrickButtonLabel();
    }

    function drawTrickFlash() {
        if (rider.trickFlashTimer > 0) {
            const a = Math.min(1, rider.trickFlashTimer / 0.5);
            ctx.globalAlpha = a;
            ctx.fillStyle = "#4fd1c5";
            ctx.font = "bold " + Math.round(16 * riderScale()) + "px -apple-system, sans-serif";
            ctx.textAlign = "center";
            const labelY = riderGroundY() + rider.y - RIDER_HEIGHT * riderScale() - 70;
            ctx.fillText(rider.trickFlashLabel + "!", rider.x, labelY);
            ctx.globalAlpha = 1;
        }
        if (game.trickScoreFlash && game.trickScoreFlash.timer > 0) {
            const a = Math.min(1, game.trickScoreFlash.timer / 0.5);
            ctx.globalAlpha = a;
            ctx.fillStyle = "#ffd86a";
            ctx.font = "bold " + Math.round(18 * riderScale()) + "px -apple-system, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("+" + Math.round(game.trickScoreFlash.amount), rider.x, riderGroundY() - 90);
            ctx.globalAlpha = 1;
        }
    }

    function updateTrickButtonLabel() {
        if (!el.jumpZone) return;
        let label;
        if (rider.airborne) {
            label = rider.tricks.length >= 3 ? "MAX" : "TRICK";
        } else {
            label = rider.sitting ? "STAND" : "SIT";
        }
        if (el.jumpZone.textContent !== label) {
            el.jumpZone.textContent = label;
        }
    }

    function loop(now) {
        if (destroyed) return;
        if (gameState !== STATE.PLAY && gameState !== STATE.CRASHING) return;
        const dt = Math.min(0.04, (now - lastTime) / 1000);
        lastTime = now;
        if (gameState === STATE.PLAY) {
            update(dt);
        } else {
            updateRider(dt); // crash tumble only, no scrolling/obstacles/scoring
        }
        render();
        rafId = requestAnimationFrame(loop);
    }

    function idleRender() {
        rider.y = 0;
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
