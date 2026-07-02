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
                font-size: 12px;
                font-weight: 700;
                color: #b8c8d4;
                letter-spacing: 1.4px;
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

            #eucOverheatBanner {
                position: absolute;
                top: 40px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 12;
                background: rgba(40,8,8,0.88);
                border: 1.5px solid #ff3a3a;
                color: #ff6b6b;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 0.6px;
                padding: 6px 14px;
                border-radius: 100px;
                white-space: nowrap;
                pointer-events: none;
                animation: eucOverheatPulse 0.4s infinite;
            }
            #eucOverheatBanner.eucHidden { display: none; }
            @keyframes eucOverheatPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
            }

            #eucHillBanner {
                position: absolute;
                top: 40px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 12;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 0.6px;
                padding: 6px 14px;
                border-radius: 100px;
                white-space: nowrap;
                pointer-events: none;
            }
            #eucHillBanner.eucHidden { display: none; }
            #eucHillBanner.eucHillClimb {
                background: rgba(60,38,8,0.88);
                border: 1.5px solid #ffaa3c;
                color: #ffc77a;
            }
            #eucHillBanner.eucHillDescent {
                background: rgba(8,28,48,0.88);
                border: 1.5px solid #50a0ff;
                color: #8cc4ff;
            }

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

            /* Left thumb: vertical dodge pad (up/down lane switch).
               Right thumb: horizontal speed pad (forward/back).
               Both are the exact same component, just rotated — same
               pill shape, same divider, same button styling. */
            .eucDodgePad {
                display: flex;
                flex-direction: column;
                align-items: center;
                background: rgba(255,255,255,0.04);
                border: 1.5px solid rgba(255,255,255,0.12);
                border-radius: 18px;
                overflow: hidden;
                width: 64px;
            }
            .eucDodgeArrow {
                width: 64px; height: 64px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 3px;
                background: transparent;
                border: none;
                color: rgba(234,242,248,0.6);
                font-family: inherit;
                padding: 0;
                transition: background 0.08s, color 0.08s;
            }
            .eucDodgeArrow.active {
                background: rgba(255,255,255,0.16);
                color: #fff;
            }
            .eucDodgeArrow svg { width: 22px; height: 22px; }
            .eucDodgeLabel { font-size: 9px; font-weight: 700; letter-spacing: 0.5px; }
            .eucDodgeDivider {
                width: 38px; height: 1.5px;
                background: rgba(255,255,255,0.14);
            }

            /* Right thumb: self-centering horizontal speed slider.
               Drag right = forward throttle, drag left = brake/reverse.
               Releases spring back to center; speed decays naturally. */
            .eucSpeedSliderWrap {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .eucSliderTrack {
                position: relative;
                width: 160px;
                height: 64px;
                background: rgba(255,255,255,0.04);
                border: 1.5px solid rgba(255,255,255,0.12);
                border-radius: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: visible;
                touch-action: none;
                user-select: none;
            }
            .eucSliderCenter {
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                width: 2px;
                height: 28px;
                background: rgba(255,255,255,0.18);
                border-radius: 1px;
                pointer-events: none;
            }
            .eucSliderLabel {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 0.5px;
                color: rgba(234,242,248,0.35);
                pointer-events: none;
            }
            .eucSliderLabelLeft  { left: 10px; }
            .eucSliderLabelRight { right: 10px; }
            .eucSliderPuck {
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: radial-gradient(circle at 38% 32%,
                    rgba(255,255,255,0.22),
                    rgba(255,255,255,0.06));
                border: 2px solid rgba(255,255,255,0.28);
                box-shadow: 0 2px 12px rgba(0,0,0,0.35);
                transition: background 0.1s, border-color 0.1s, transform 0.08s;
                pointer-events: none;
                will-change: transform;
            }
            .eucSliderPuck.active {
                background: radial-gradient(circle at 38% 32%,
                    rgba(255,255,255,0.38),
                    rgba(255,255,255,0.12));
                border-color: rgba(255,255,255,0.55);
            }
            .eucSliderPuck.forward {
                border-color: rgba(79,209,197,0.7);
                background: radial-gradient(circle at 38% 32%,
                    rgba(79,209,197,0.35),
                    rgba(79,209,197,0.12));
            }
            .eucSliderPuck.reverse {
                border-color: rgba(255,120,80,0.7);
                background: radial-gradient(circle at 38% 32%,
                    rgba(255,120,80,0.35),
                    rgba(255,120,80,0.12));
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

            .eucCrashReason {
                font-size: 15px;
                font-weight: 700;
                color: #ff8a7a;
                margin-bottom: 16px;
                max-width: 260px;
                line-height: 1.4;
            }

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

            .eucColorLabel {
                font-size: 10px;
                font-weight: 700;
                color: #8fa3b3;
                letter-spacing: 1.2px;
                margin-top: 6px;
                margin-bottom: 10px;
            }
            #eucColorSwatches {
                display: flex;
                gap: 10px;
                justify-content: center;
                flex-wrap: wrap;
                max-width: 260px;
            }
            .eucSwatch {
                width: 30px; height: 30px;
                border-radius: 50%;
                border: 2.5px solid transparent;
                padding: 0;
                box-shadow: inset 0 0 0 1.5px rgba(255,255,255,0.25);
                transition: transform 0.1s, border-color 0.1s;
            }
            .eucSwatch.selected {
                border-color: #fff;
                transform: scale(1.18);
            }
            .eucSwatch:active { transform: scale(0.92); }
        </style>

        <div id="eucDriftRoot">
            <canvas id="eucDriftCanvas"></canvas>

            <div id="eucDriftHud">
                <div>
                    <div id="eucScore">0</div>
                    <div id="eucScoreLabel">feet</div>
                </div>
                <div id="eucSpeedWrap">
                    <div id="eucSpeedVal">0 <span style="font-size:13px;font-weight:700;">mph</span></div>
                    <div id="eucZoneLabel">city</div>
                </div>
            </div>

            <div id="eucOverheatBanner" class="eucHidden">⚠ BATTERY LOW — EASE OFF</div>
            <div id="eucHillBanner" class="eucHidden"></div>

            <button id="eucPauseBtn" type="button" aria-label="Pause">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            </button>

            <div id="eucControls">
                <div class="eucDodgePad" id="eucDodgePad">
                    <button class="eucDodgeArrow" id="eucPadUp" type="button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                        <span class="eucDodgeLabel">DODGE</span>
                    </button>
                    <div class="eucDodgeDivider"></div>
                    <button class="eucDodgeArrow" id="eucPadDown" type="button">
                        <span class="eucDodgeLabel">DODGE</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
                    </button>
                </div>

                <div class="eucSpeedSliderWrap" id="eucSpeedSliderWrap">
                    <div class="eucSliderTrack" id="eucSliderTrack">
                        <div class="eucSliderCenter"></div>
                        <div class="eucSliderLabel eucSliderLabelLeft">SLOW</div>
                        <div class="eucSliderLabel eucSliderLabelRight">FAST</div>
                        <div class="eucSliderPuck" id="eucSliderPuck"></div>
                    </div>
                </div>
            </div>

            <div class="eucOverlay" id="eucStartOverlay">
                <div class="eucTitleLogo">EUC<span>DRIFT</span></div>
                <div class="eucSubtitle">Lean into it. Ride the wheel through the city, the backroads, and the open track.</div>
                <div class="eucColorLabel">YOUR COLOR</div>
                <div id="eucColorSwatches"></div>
                <button class="eucPlayBtn" id="eucPlayBtn" type="button">RIDE</button>
            </div>

            <div class="eucOverlay eucHidden" id="eucGameOverOverlay">
                <div class="eucCrashReason" id="eucCrashReason"></div>
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

    function groundY() { return H * 0.52; }

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

    // ------------------------------------------------------------
    // Rider color customization
    // ------------------------------------------------------------
    const RIDER_COLOR_PALETTE = [
        "#ee1c25", // bright red (default)
        "#a020f0", // bright purple
        "#ff6a00", // bright orange
        "#ffe600", // bright yellow
        "#0074ff", // bright blue
        "#00c200", // bright green
        "#ffffff", // bright white
        "#111111", // black
    ];

    function shadeHex(hex, amt) {
        // amt: -1..1, negative darkens, positive lightens
        const c = hex.replace("#", "");
        const num = parseInt(c, 16);
        let r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
        const adjust = (ch) => {
            if (amt < 0) return Math.max(0, Math.round(ch * (1 + amt)));
            return Math.min(255, Math.round(ch + (255 - ch) * amt));
        };
        r = adjust(r); g = adjust(g); b = adjust(b);
        return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
    }

    let riderColor = safeLocalGet("eucdrift_color", RIDER_COLOR_PALETTE[0]);
    if (RIDER_COLOR_PALETTE.indexOf(riderColor) === -1) riderColor = RIDER_COLOR_PALETTE[0];

    function setRiderColor(hex) {
        riderColor = hex;
        safeLocalSet("eucdrift_color", hex);
        renderColorSwatches();
    }

    function renderColorSwatches() {
        const wrap = document.getElementById("eucColorSwatches");
        if (!wrap) return;
        wrap.querySelectorAll(".eucSwatch").forEach(sw => {
            sw.classList.toggle("selected", sw.dataset.color === riderColor);
        });
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
    // Hills — steep, obstacle-free climb/descent interludes that occur
    // once per zone cycle. Modeled as a physics-only slope (affects
    // speedNorm via gravity) with a visual tilt/pitch cue, rather than
    // actually reshaping the road geometry — keeps this self-contained
    // instead of touching every lane/obstacle Y-position calculation.
    // ------------------------------------------------------------
    const HILL_PERIOD = 700;          // matches ZONE_LENGTH — one hill per zone
    const HILL_START_OFFSET = 380;    // hill begins this far into each zone cycle
    const HILL_CLIMB_LENGTH = 130;    // distance (ft-equivalent) of the uphill
    const HILL_CREST_LENGTH = 40;     // flat-ish top between climb and descent
    const HILL_DESCENT_LENGTH = 150;  // distance of the downhill
    const HILL_GRAVITY_FORWARD = 0.85; // how hard downhill gravity accelerates you (per second, speedNorm units)
    const HILL_GRAVITY_BRAKE = 0.35;    // how hard uphill gravity decelerates you if you're not compensating — must stay well below the 0.55/s FAST acceleration rate, or climbing becomes mathematically impossible even at full throttle

    // Returns a slope value for the given world distance:
    //  0          = flat ground
    //  positive   = climbing (uphill, gravity opposes forward motion)
    //  negative   = descending (downhill, gravity adds to forward motion)
    // Magnitude is 0..1 (steepness), smoothly eased in/out at the edges
    // of the climb/descent so it doesn't feel like a sudden wall.
    function hillSlopeAt(distance) {
        const posInCycle = ((distance % HILL_PERIOD) + HILL_PERIOD) % HILL_PERIOD;
        const climbStart = HILL_START_OFFSET;
        const climbEnd = climbStart + HILL_CLIMB_LENGTH;
        const crestEnd = climbEnd + HILL_CREST_LENGTH;
        const descentEnd = crestEnd + HILL_DESCENT_LENGTH;

        if (posInCycle < climbStart || posInCycle >= descentEnd) return 0;

        if (posInCycle < climbEnd) {
            const t = (posInCycle - climbStart) / HILL_CLIMB_LENGTH;
            return Math.sin(t * Math.PI); // eases up then back down to 0 at the crest
        }
        if (posInCycle < crestEnd) {
            return 0; // flat crest
        }
        const t = (posInCycle - crestEnd) / HILL_DESCENT_LENGTH;
        return -Math.sin(t * Math.PI); // eases into the descent and back to flat at the bottom
    }

    function onHillRightNow() {
        return Math.abs(hillSlopeAt(game.distance)) > 0.02;
    }

    // ------------------------------------------------------------
    // Input
    // ------------------------------------------------------------
    const input = {
        leanLeft: false,   // keyboard only (legacy / dev)
        leanRight: false,  // keyboard only (legacy / dev)
        sliderT: 0,        // -1..+1 from the speed slider; 0 = centered/released
    };

    const listenerCleanups = [];
    function on(el, ev, fn, opts) {
        el.addEventListener(ev, fn, opts);
        listenerCleanups.push(() => el.removeEventListener(ev, fn, opts));
    }

    function setupPad() {
        // ── LEFT PAD: vertical dodge (up/down lane switch) ──────────────
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

        // ── RIGHT PAD: self-centering horizontal speed slider ────────────
        // sliderInput is a signed value -1..+1 read each frame by update()
        // (replaces the old leanLeft/leanRight boolean flags for speed).
        // When the thumb lifts, it springs back to 0 and speed decays.
        const track = document.getElementById("eucSliderTrack");
        const puck  = document.getElementById("eucSliderPuck");
        if (!track || !puck) return;

        const TRACK_HALF = 56;   // px either side of center the puck can travel
        const DEADZONE   = 0.08; // fraction of travel below which = no input

        let sliderActive = false;
        let sliderOriginX = 0;   // x coord of the initial touch on the track
        let sliderRawT = 0;      // raw position -1..+1

        // Haptic: vibrate(pattern) on supported devices (Android Chrome)
        let hapticInterval = null;
        function startHaptic(intensity) {
            // intensity 0..1; pulse width scales with it
            stopHaptic();
            if (!navigator.vibrate) return;
            const pulse = Math.max(8, Math.round(intensity * 40));
            const gap   = Math.max(20, Math.round(60 - intensity * 40));
            hapticInterval = setInterval(() => {
                navigator.vibrate(pulse);
            }, pulse + gap);
        }
        function stopHaptic() {
            if (hapticInterval) { clearInterval(hapticInterval); hapticInterval = null; }
            if (navigator.vibrate) navigator.vibrate(0);
        }

        function updateSliderVisual(t) {
            // t: -1..+1
            const offsetPx = t * TRACK_HALF;
            // Use CSS transform so it's GPU-accelerated
            puck.style.transform = `translate(calc(-50% + ${offsetPx}px), -50%)`;
            puck.classList.toggle("forward", t >  DEADZONE);
            puck.classList.toggle("reverse", t < -DEADZONE);
        }

        function onSliderStart(clientX) {
            sliderActive = true;
            sliderOriginX = clientX;
            sliderRawT = 0;
            puck.classList.add("active");
            // Initial gentle buzz on contact — confirms the control is live
            if (navigator.vibrate) navigator.vibrate(12);
        }

        function onSliderMove(clientX) {
            if (!sliderActive) return;
            const rect = track.getBoundingClientRect();
            const trackCenterX = rect.left + rect.width / 2;
            const dx = clientX - trackCenterX;
            sliderRawT = Math.max(-1, Math.min(1, dx / TRACK_HALF));
            updateSliderVisual(sliderRawT);

            // Haptic intensity proportional to how far off-center
            const intensity = Math.abs(sliderRawT);
            if (intensity > DEADZONE) {
                startHaptic(intensity);
            } else {
                stopHaptic();
            }

            // Feed directly into the input system
            input.sliderT = sliderRawT;
        }

        function onSliderEnd() {
            if (!sliderActive) return;
            sliderActive = false;
            sliderRawT = 0;
            input.sliderT = 0;
            puck.classList.remove("active");
            stopHaptic();
            // Animate puck springing back to center
            puck.style.transition = "transform 0.18s cubic-bezier(0.34,1.56,0.64,1)";
            updateSliderVisual(0);
            setTimeout(() => {
                if (puck) puck.style.transition = "";
            }, 220);
        }

        // Touch events
        on(track, "touchstart", (e) => {
            e.preventDefault();
            onSliderStart(e.touches[0].clientX);
        }, { passive: false });
        on(track, "touchmove", (e) => {
            e.preventDefault();
            onSliderMove(e.touches[0].clientX);
        }, { passive: false });
        on(track, "touchend",   (e) => { e.preventDefault(); onSliderEnd(); }, { passive: false });
        on(track, "touchcancel",(e) => { e.preventDefault(); onSliderEnd(); }, { passive: false });

        // Mouse events (desktop / dev testing)
        let mouseDown = false;
        on(track, "mousedown", (e) => { mouseDown = true; onSliderStart(e.clientX); });
        on(window,"mousemove", (e) => { if (mouseDown) onSliderMove(e.clientX); });
        on(window,"mouseup",   ()   => { if (mouseDown) { mouseDown = false; onSliderEnd(); } });

        // Expose cleanup for the haptic interval
        listenerCleanups.push(() => stopHaptic());
    }

    function keydownHandler(e) {
        if (e.repeat) return;
        if (e.code === "ArrowLeft"  || e.code === "KeyA") { input.leanLeft = true;  input.sliderT = -1; }
        if (e.code === "ArrowRight" || e.code === "KeyD") { input.leanRight = true; input.sliderT =  1; }
        if (e.code === "ArrowDown"  || e.code === "KeyS") triggerDodge(-1);
        if (e.code === "ArrowUp"    || e.code === "KeyW") triggerDodge(1);
    }
    function keyupHandler(e) {
        if (e.code === "ArrowLeft"  || e.code === "KeyA") { input.leanLeft = false;  if (!input.leanRight) input.sliderT = 0; }
        if (e.code === "ArrowRight" || e.code === "KeyD") { input.leanRight = false; if (!input.leanLeft)  input.sliderT = 0; }
    }
    on(window, "keydown", keydownHandler);
    on(window, "keyup", keyupHandler);

    setupPad();

    function setupColorSwatches() {
        const wrap = document.getElementById("eucColorSwatches");
        if (!wrap) return;
        wrap.innerHTML = RIDER_COLOR_PALETTE.map(hex =>
            `<button class="eucSwatch" type="button" data-color="${hex}" style="background:${hex};"></button>`
        ).join("");
        wrap.querySelectorAll(".eucSwatch").forEach(sw => {
            const handler = (e) => { e.preventDefault(); setRiderColor(sw.dataset.color); };
            on(sw, "click", handler);
        });
        renderColorSwatches();
    }
    setupColorSwatches();

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
    const RIDER_HEIGHT = 118;
    const WHEEL_RADIUS = 24;

    // Speed conversion must match updateHUD's mph formula (mph = 11 + speedNorm*40)
    // speedNorm is now a true signed velocity scale: 0 = stopped,
    // positive = forward, negative = reverse (EUCs can ride backward).
    function speedNormToMph(norm) { return norm * 50; }
    function mphToSpeedNorm(mph) { return mph / 50; }

    // Landing check: hit the ramp going 30 mph or faster to land clean.
    // Below 30 = too slow, you drop off the front. Lowered from 45 so
    // players can actually succeed on early ramps before they've built
    // up full speed — getting airborne should feel rewarding, not fatal.
    const LANDING_MPH_MIN = 30;

    // Brake strength when leaning back hard (lets you nearly stop for a lane hazard).
    const BRAKE_STRENGTH = 1.35;
    const MAX_REVERSE_SPEED_NORM = -0.35; // reverse caps out well below forward top speed
    const STATIONARY_FALL_SECONDS = 2; // standing still with no input this long -> you fall

    const TRICK_NAMES = ["360 spin", "tabletop", "one-foot grab", "superman lean", "tailwhip"];

    function resetRider() {
        rider.lane = LANE_BOTTOM;
        rider.laneT = 1;
        rider.targetLaneT = 1;
        rider.vy = 0;
        rider.airborne = false;
        rider.launchSpeedNorm = 0;
        rider.landingOutcome = null; // 'clean' | 'tooSlow'
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
        rider.skidTimer = 0;
        rider.throttleHeldTime = 0;
        rider.letOffTime = 0;
        rider.overheatWarning = false;
        rider.overheatWarnTimer = 0;
        rider.beepIndex = 0;
        rider.lastBeepAt = -1;
        rider.beepFlash = 0;
        rider.onRamp = null;
        rider.cutoutFlying = false;
        rider.cutoutTimer = 0;
        rider.stationaryTimer = 0;
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

        // shaky controls while skidding on an oil slick — dodge input has
        // a real chance of just not responding in time
        if (rider.skidTimer > 0 && Math.random() < 0.45) return;

        // dir +1 = dodge "up" input -> top lane, dir -1 = dodge "down" input -> bottom lane
        const newLane = dir > 0 ? LANE_TOP : LANE_BOTTOM;
        if (newLane === rider.lane) return;
        rider.lane = newLane;
        rider.targetLaneT = newLane === LANE_TOP ? 0 : 1;
    }

    function maybeAutoTrick(dt) {
        // tricks now fire automatically while airborne (no button) — a
        // higher/longer jump naturally racks up more of them
        rider.trickTimer = (rider.trickTimer || 0) + dt;
        if (rider.trickTimer < 0.45) return;
        rider.trickTimer = 0;

        const name = TRICK_NAMES[Math.floor(Math.random() * TRICK_NAMES.length)];
        rider.tricks.push({ name, t: 0 });
        rider.trickFlashLabel = name;
        rider.trickFlashTimer = 0.9;

        const bonus = 30 + rider.tricks.length * 15; // each additional trick in the same air time is worth a bit more
        game.distance += bonus * 0.06;
        game.trickScoreFlash = { amount: bonus, timer: 1.0 };
    }

    // Called when the rider's lane-center crosses a ramp's x position
    // while in the ramp's lane and on the ground — launches a jump.
    // Landing safety is locked in right here, based on takeoff speed only.
    // Rolling up a ramp: instead of an instant vertical "pop" the moment
    // the rider touches the ramp, the rider's height is locked to follow
    // the ramp's slope as they cross its width, and the actual airborne
    // launch only happens once they reach the peak (the far/right edge),
    // with a much smaller, mostly-horizontal-feeling kick instead of a
    // huge vertical trampoline bounce.
    function rampSurfaceYAtRiderX(o) {
        // Returns how far ABOVE the lane's ground line (in px, positive =
        // higher) the ramp surface is at the rider's current x position.
        const sx = obstacleScreenX(o);
        const t = Math.max(0, Math.min(1, (rider.x - sx) / o.w)); // 0 at entry (left), 1 at peak (right)
        return t * o.h;
    }

    function launchFromRamp(o) {
        if (rider.airborne || rider.crashed) return;

        const mph = speedNormToMph(game.speedNorm);
        rider.launchSpeedNorm = game.speedNorm;

        // Carry the peak height the slope had already lifted the rider to
        // straight into the launch — no snap back to ground level. The
        // wheel leaves from the very edge of the ramp, already elevated,
        // then gets a clear upward pop on top of that.
        const peakHeight = o.h; // o.h is the ramp's full height at its peak (t=1)
        rider.y = -peakHeight;

        rider.airborne = true;
        rider.onRamp = null;
        rider.tricks = [];
        rider.sitting = false;
        rider.landingOutcome = (mph < LANDING_MPH_MIN) ? "tooSlow" : "clean";

        // Pop up off the edge — speed still scales how much air you get,
        // but it now reads as "rolling off the end of a ramp and popping
        // up" rather than a trampoline bounce straight up from the ground.
        const speedFactor = Math.min(1.4, game.speedNorm / 0.6);
        rider.vy = -(180 + speedFactor * 200);
    }

    // ------------------------------------------------------------
    // Overheat / speed cutout — holding full throttle too long trips a
    // real-EUC-style low-battery safety cutout: 10s sustained full lean-forward
    // triggers a 5-beep, ~2s warning (blinking red light), and unless
    // you genuinely let off the throttle for a full second within that
    // window, the battery cuts out and you go flying forward into a crash.
    // ------------------------------------------------------------
    const OVERHEAT_TRIGGER_SECONDS = 10;
    const OVERHEAT_WARNING_SECONDS = 2;
    const OVERHEAT_BEEP_COUNT = 5;
    const OVERHEAT_LETOFF_SECONDS = 1;

    function updateOverheatState(dt) {
        // Holding full forward throttle counts, same as always. So does
        // barreling down a steep hill under gravity alone — the motor has
        // to work just as hard holding you back as it does pushing you
        // forward, so going fast downhill burns into the same risk window
        // even with no input held at all. Actively braking (SLOW) counts
        // as managing the descent correctly and does NOT trigger this.
        const onSteepDescent = hillSlopeAt(game.distance) < -0.3 && game.speedNorm > 0.5 && !input.leanLeft;
        const fullThrottle = (input.leanRight && !input.leanLeft) || onSteepDescent;

        if (fullThrottle) {
            rider.throttleHeldTime += dt;
            rider.letOffTime = 0;
        } else {
            rider.letOffTime += dt;
            if (!rider.overheatWarning) {
                // not currently in the danger window — any let-off at all
                // starts easing the held-time back down
                rider.throttleHeldTime = Math.max(0, rider.throttleHeldTime - dt * 2);
            }
        }

        if (!rider.overheatWarning && rider.throttleHeldTime >= OVERHEAT_TRIGGER_SECONDS) {
            rider.overheatWarning = true;
            rider.overheatWarnTimer = 0;
            rider.beepIndex = 0;
            rider.lastBeepAt = -1;
        }

        if (rider.overheatWarning) {
            rider.overheatWarnTimer += dt;

            // a genuine 1-second let-off cancels the whole sequence
            if (rider.letOffTime >= OVERHEAT_LETOFF_SECONDS) {
                rider.overheatWarning = false;
                rider.overheatWarnTimer = 0;
                rider.throttleHeldTime = 0;
                rider.beepIndex = 0;
                return;
            }

            // fire beeps at evenly spaced points across the warning window
            const beepSlot = Math.floor((rider.overheatWarnTimer / OVERHEAT_WARNING_SECONDS) * OVERHEAT_BEEP_COUNT);
            if (beepSlot > rider.lastBeepAt && beepSlot < OVERHEAT_BEEP_COUNT) {
                rider.lastBeepAt = beepSlot;
                rider.beepIndex = beepSlot + 1;
                rider.beepFlash = 0.25; // brief visual flash per beep
            }

            if (rider.overheatWarnTimer >= OVERHEAT_WARNING_SECONDS) {
                // out of time without a real let-off — battery cuts out
                rider.overheatWarning = false;
                triggerOverheatCutout();
            }
        }

        if (rider.beepFlash > 0) rider.beepFlash -= dt;
    }

    function triggerOverheatCutout() {
        if (rider.crashed) return;
        rider.cutoutFlying = true;
        rider.cutoutTimer = 0.5; // brief Superman-forward fling before impact
        rider.cutoutSpeedNorm = game.speedNorm;
    }

    function updateRider(dt) {
        if (rider.crashed) {
            rider.crashTimer -= dt;
            rider.wheelAngle += dt * 2;
            return;
        }

        if (rider.cutoutFlying) {
            // battery's cut out — no more steering, just sailing forward
            // (Superman pose) until impact
            rider.cutoutTimer -= dt;
            rider.wheelAngle += dt * 25; // wheel spins freely now, no traction
            if (rider.cutoutTimer <= 0) {
                rider.cutoutFlying = false;
                crashRider("cutout");
            }
            return;
        }

        if (rider.skidTimer > 0) {
            rider.skidTimer = Math.max(0, rider.skidTimer - dt);
        }

        // lean target from input (back = brake/-1, forward = accelerate/+1)
        // Lean is proportional to the slider position, not just binary on/off.
        // This means body angle, arm pose, and speed lines all smoothly
        // reflect exactly how hard you're pushing — feels much more EUC-like.
        let leanTarget = input.sliderT; // -1..+1 continuous from the slider

        if (rider.skidTimer > 0) {
            // jittery/unreliable steering while skidding on the oil slick —
            // the lean target randomly wobbles away from what you're
            // actually holding, making fine control unreliable for a beat
            leanTarget += (Math.random() - 0.5) * 1.6;
            leanTarget = Math.max(-1, Math.min(1, leanTarget));
        }

        rider.targetLean = leanTarget;
        rider.lean += (rider.targetLean - rider.lean) * Math.min(1, dt * 6);

        updateOverheatState(dt);

        // lane slide (dodge)
        rider.laneT += (rider.targetLaneT - rider.laneT) * Math.min(1, dt * 10);

        // ground sit/stand smoothing (locked out while airborne) — note:
        // sitting is now only ever toggled by other future input if added;
        // kept here so the visual system stays intact even though the
        // action button no longer triggers it on the ground.
        const sitTarget = (!rider.airborne && rider.sitting) ? 1 : 0;
        rider.sitT += (sitTarget - rider.sitT) * Math.min(1, dt * 9);

        // vertical jump physics
        if (rider.airborne) {
            rider.vy += JUMP_GRAVITY * dt;
            rider.y += rider.vy * dt;

            maybeAutoTrick(dt);

            if (rider.y >= 0) {
                rider.y = 0;
                rider.vy = 0;

                if (rider.landingOutcome === "clean") {
                    rider.airborne = false;
                    rider.tricks = [];
                } else {
                    // tooSlow — the takeoff speed already decided this,
                    // tricks performed mid-air don't change it
                    crashRider(rider.landingOutcome);
                }
            }
        } else if (!rider.onRamp) {
            // Ground level — but NOT while actively riding up a ramp's
            // slope (rider.onRamp is set), since that height is owned by
            // the ramp-riding logic in updateObstacles. Stomping it to 0
            // here every frame was causing the rider to visually snap
            // down to ground level for one frame right at the moment of
            // launch, instead of taking off from the ramp's peak height.
            rider.y = 0;
        }

        // advance trick animation timers (purely cosmetic now, no fail risk)
        if (rider.tricks.length) {
            rider.tricks.forEach(t => { t.t += dt; });
        }
        if (rider.trickFlashTimer > 0) rider.trickFlashTimer -= dt;

        rider.wobble += dt * 5.2;
        rider.wheelAngle += dt * (game.speedNorm * 16 + (game.speedNorm >= 0 ? 6 : -6));

        if (rider.hitFlash > 0) rider.hitFlash -= dt;
    }

    function crashRider(reason) {
        // reason: 'tooSlow' (drop off the front) | 'hit' (obstacle) | 'cutout' (battery cutout) | 'fellOver' (stood still too long)
        rider.crashed = true;
        rider.crashReason = reason || "hit";
        rider.crashTimer = 0.9;
        rider.hitFlash = 0.6;
        endGame();
    }

    function riderScale() {
        return Math.min(1.25, Math.max(0.85, H / 700)) * 1.4; // bigger rider + bigger wheel per request
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

    // Drawn during the brief cutout fling — the rider has left the wheel
    // entirely and is sailing forward arms-out (Superman pose) toward an
    // impact. The wheel itself tumbles/skids away separately beneath them.
    function drawCutoutFlyingPose() {
        const scale = riderScale();
        const baseY = riderGroundY();
        const progress = 1 - Math.max(0, rider.cutoutTimer) / 0.5; // 0..1 across the fling
        const forwardDrift = progress * 70 * scale;
        const riseFall = Math.sin(progress * Math.PI) * -26 * scale; // small arc: up then down toward impact

        // tumbling wheel, left behind and spinning out
        ctx.save();
        ctx.translate(rider.x - forwardDrift * 0.4, baseY - WHEEL_RADIUS * scale + 6 * scale * progress);
        ctx.rotate(rider.wheelAngle);
        ctx.beginPath();
        ctx.arc(0, 0, WHEEL_RADIUS * scale, 0, Math.PI * 2);
        ctx.fillStyle = "#1a2126";
        ctx.fill();
        ctx.strokeStyle = "#0a0d0f";
        ctx.lineWidth = 2.2 * scale;
        ctx.stroke();
        ctx.restore();

        // flying rider
        ctx.save();
        ctx.translate(rider.x + forwardDrift, baseY - 30 * scale + riseFall);
        ctx.rotate(0.18 + progress * 0.25); // pitching forward as it goes

        const clothColor = riderColor;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // back leg, trailing
        ctx.strokeStyle = "#1c252c";
        ctx.lineWidth = 9 * scale;
        ctx.beginPath();
        ctx.moveTo(-4 * scale, 6 * scale);
        ctx.quadraticCurveTo(-22 * scale, 10 * scale, -34 * scale, 4 * scale);
        ctx.stroke();

        // front leg, trailing slightly higher
        ctx.beginPath();
        ctx.moveTo(2 * scale, 4 * scale);
        ctx.quadraticCurveTo(-14 * scale, -4 * scale, -28 * scale, -10 * scale);
        ctx.stroke();

        // torso, horizontal-ish, pitched forward
        ctx.strokeStyle = "#212b33";
        ctx.lineWidth = 13 * scale;
        ctx.beginPath();
        ctx.moveTo(0, 4 * scale);
        ctx.lineTo(24 * scale, -8 * scale);
        ctx.stroke();

        ctx.strokeStyle = clothColor;
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.moveTo(2 * scale, 2 * scale);
        ctx.lineTo(22 * scale, -8 * scale);
        ctx.stroke();

        // both arms thrown forward, Superman-style
        ctx.strokeStyle = "#1c252c";
        ctx.lineWidth = 7 * scale;
        ctx.beginPath();
        ctx.moveTo(20 * scale, -9 * scale);
        ctx.quadraticCurveTo(34 * scale, -14 * scale, 46 * scale, -16 * scale);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(18 * scale, -6 * scale);
        ctx.quadraticCurveTo(32 * scale, -8 * scale, 44 * scale, -9 * scale);
        ctx.stroke();

        // head, looking forward toward impact
        const headX = 28 * scale, headY = -12 * scale;
        ctx.beginPath();
        ctx.arc(headX, headY, 10.2 * scale, 0, Math.PI * 2);
        ctx.fillStyle = "#27323b";
        ctx.fill();
        ctx.fillStyle = clothColor;
        ctx.beginPath();
        ctx.ellipse(headX + 4 * scale, headY - 1 * scale, 5 * scale, 2.8 * scale, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // motion streaks behind
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 2 * scale;
        for (let i = 0; i < 4; i++) {
            const ly = -6 * scale + i * 6 * scale;
            ctx.beginPath();
            ctx.moveTo(-40 * scale - i * 8 * scale, ly);
            ctx.lineTo(-60 * scale - i * 8 * scale, ly);
            ctx.stroke();
        }

        ctx.restore();
    }

    function drawRider() {
        if (rider.crashed && rider.crashTimer <= 0) return;

        if (rider.cutoutFlying) {
            drawCutoutFlyingPose();
            return;
        }

        const scale = riderScale();
        const baseY = riderGroundY();
        ctx.save();
        const skidJitterX = rider.skidTimer > 0 ? (Math.random() - 0.5) * 6 * scale : 0;
        ctx.translate(rider.x + skidJitterX, baseY + rider.y);

        if (rider.crashed) {
            // simple tumble effect
            const tumble = (0.9 - Math.max(0, rider.crashTimer)) * 6;
            ctx.rotate(tumble);
            ctx.globalAlpha = Math.max(0.15, rider.crashTimer / 0.9);
        }

        const hillPitch = (!rider.airborne && !rider.crashed) ? hillSlopeAt(game.distance) * 0.16 : 0;
        const leanAngle = rider.airborne
            ? Math.min(0.5, (rider.tricks.length * 0.35)) * Math.sin(performance.now() / 120)
            : rider.lean * 0.22 + hillPitch;
        const bob = (!rider.airborne && !rider.crashed) ? Math.sin(rider.wobble) * 1.6 * scale : 0;
        ctx.translate(0, bob);
        ctx.rotate(leanAngle);

        const sit = rider.sitT;
        const crouch = sit * 20 * scale;
        const clothColor = riderColor;
        const denimColor = "#3a5a8c";   // fixed blue-denim jeans, not user-selectable
        const denimDark = "#2a4368";    // shaded side of the denim (far leg / seams)

        // ---------------- WHEEL ----------------
        const wheelY = -WHEEL_RADIUS * scale;
        ctx.save();
        ctx.translate(0, wheelY);
        ctx.rotate(rider.wheelAngle);
        ctx.beginPath();
        ctx.arc(0, 0, WHEEL_RADIUS * scale, 0, Math.PI * 2);
        ctx.fillStyle = "#2a333b";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 1.6 * scale;
        ctx.stroke();
        ctx.strokeStyle = "#11161a";
        ctx.lineWidth = 2.2 * scale;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, WHEEL_RADIUS * scale * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = "#52606c";
        ctx.fill();
        ctx.strokeStyle = "#33404a";
        ctx.lineWidth = 1.8 * scale;
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * WHEEL_RADIUS * scale * 0.56, Math.sin(a) * WHEEL_RADIUS * scale * 0.56);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, 4.4 * scale, 0, Math.PI * 2);
        ctx.fillStyle = clothColor;
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(0, wheelY);
        ctx.fillStyle = "#22282e";
        ctx.fillRect(-WHEEL_RADIUS * scale * 1.05, -3.8 * scale, WHEEL_RADIUS * scale * 2.1, 5.5 * scale);
        ctx.restore();

        // front warning light — sits on the leading edge of the footplate,
        // blinks bright red on each overheat beep
        if (rider.overheatWarning && rider.beepFlash > 0) {
            ctx.save();
            ctx.translate(0, wheelY);
            ctx.beginPath();
            ctx.arc(WHEEL_RADIUS * scale * 1.05, 0, 4.2 * scale, 0, Math.PI * 2);
            ctx.fillStyle = "#ff2a2a";
            ctx.globalAlpha = Math.min(1, rider.beepFlash / 0.25);
            ctx.fill();
            ctx.globalAlpha = 1;
            // glow halo
            ctx.beginPath();
            ctx.arc(WHEEL_RADIUS * scale * 1.05, 0, 8 * scale, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,42,42,0.25)";
            ctx.fill();
            ctx.restore();
        }

        // saddle — a small colored seat peeking up between the legs right
        // above the wheel, so the EUC reads as "tucked between the thighs"
        // up to about mid-thigh height rather than a bare wheel below the body
        const saddleY = wheelY - 9 * scale;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(-5 * scale, saddleY + 6 * scale);
        ctx.quadraticCurveTo(-6 * scale, saddleY - 4 * scale, 0, saddleY - 7 * scale);
        ctx.quadraticCurveTo(6 * scale, saddleY - 4 * scale, 5 * scale, saddleY + 6 * scale);
        ctx.closePath();
        ctx.fillStyle = clothColor;
        ctx.fill();
        ctx.restore();

        // ---------------- POSE POINTS ----------------
        // True side-profile: the rider faces right (direction of travel).
        // Only ONE leg and ONE arm are drawn as the visible "near" limb;
        // a short, mostly-hidden hint of the far leg peeks out at the hip
        // so it doesn't look like a single peg leg, but there is no
        // second symmetric limb mirrored out the other side of the wheel.
        const hipY = wheelY - 34 * scale + crouch * 0.5;
        const kneeY = wheelY - 11 * scale + crouch * 0.7;
        const footY = wheelY + 2 * scale;
        const shoulderY = hipY - 36 * scale * (1 - sit * 0.4);
        const torsoLean = rider.lean * 6 * scale;
        const headY = shoulderY - 15 * scale;
        const headX = torsoLean + rider.lean * 3 * scale;

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // far leg hint: a short denim-shaded stub right at the hip, barely
        // peeking out behind the near leg — implies depth without drawing
        // a full second leg out to the side.
        ctx.strokeStyle = denimDark;
        ctx.lineWidth = 7 * scale;
        ctx.beginPath();
        ctx.moveTo(2 * scale, hipY + 2 * scale);
        ctx.quadraticCurveTo(7 * scale, kneeY + 6 * scale, 5 * scale, footY - 2 * scale);
        ctx.stroke();

        // near leg (the one fully visible, slightly forward toward travel direction) — blue jeans
        ctx.strokeStyle = denimColor;
        ctx.lineWidth = 10 * scale;
        ctx.beginPath();
        ctx.moveTo(1 * scale, hipY);
        ctx.quadraticCurveTo(13 * scale, kneeY, 7 * scale, footY);
        ctx.stroke();

        // foot — dark boot, but lighter than pure black so it doesn't vanish
        ctx.fillStyle = "#2b3338";
        ctx.beginPath();
        ctx.ellipse(8 * scale, footY + 1.5 * scale, 8 * scale, 4.2 * scale, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // torso (filled jacket in the chosen color — full fill, not just a stripe)
        ctx.strokeStyle = clothColor;
        ctx.lineWidth = 13 * scale;
        ctx.beginPath();
        ctx.moveTo(0, hipY);
        ctx.quadraticCurveTo(torsoLean * 0.5, (hipY + shoulderY) / 2, torsoLean, shoulderY);
        ctx.stroke();

        // dark center seam/zip line down the jacket for a bit of definition
        ctx.strokeStyle = "rgba(0,0,0,0.28)";
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(2 * scale, hipY - 4 * scale);
        ctx.quadraticCurveTo(torsoLean * 0.5 + 2 * scale, (hipY + shoulderY) / 2, torsoLean + 2 * scale, shoulderY + 4 * scale);
        ctx.stroke();

        // ---------------- ARM POSE — driven by lean ----------------
        // Forward lean -> arm reaches out front (racing tuck).
        // Backward lean (braking) -> arm tucks in close to the side.
        // Neutral -> arm relaxed, slightly forward, natural riding pose.
        const leanT = Math.max(-1, Math.min(1, rider.lean)); // -1 back .. 0 neutral .. +1 forward
        let armElbowX, armElbowY, armHandX, armHandY;

        if (leanT >= 0) {
            // neutral -> forward: elbow/hand extend further out front as lean increases
            const reach = leanT; // 0..1
            armElbowX = torsoLean + (9 + reach * 10) * scale;
            armElbowY = shoulderY + (10 - reach * 2) * scale;
            armHandX = torsoLean + (14 + reach * 22) * scale;
            armHandY = shoulderY + (16 - reach * 6) * scale;
        } else {
            // tucking back toward the side as brake lean increases
            const tuck = -leanT; // 0..1
            armElbowX = torsoLean + (9 - tuck * 6) * scale;
            armElbowY = shoulderY + (10 + tuck * 4) * scale;
            armHandX = torsoLean + (14 - tuck * 11) * scale;
            armHandY = shoulderY + (16 + tuck * 14) * scale;
        }

        ctx.strokeStyle = clothColor;
        ctx.lineWidth = 7.5 * scale;
        ctx.beginPath();
        ctx.moveTo(torsoLean, shoulderY + 2 * scale);
        ctx.quadraticCurveTo(armElbowX, armElbowY, armHandX, armHandY);
        ctx.stroke();

        // hand — skin tone so it doesn't just blend into the sleeve
        ctx.fillStyle = "#e0a878";
        ctx.beginPath();
        ctx.arc(armHandX, armHandY, 3.6 * scale, 0, Math.PI * 2);
        ctx.fill();

        // ---------------- HEAD / HELMET ----------------
        // whole helmet shell in the chosen color; the face shield is the
        // dark contrasting cutout, not the other way around
        ctx.beginPath();
        ctx.arc(headX, headY, 10.2 * scale, 0, Math.PI * 2);
        ctx.fillStyle = clothColor;
        ctx.fill();

        // dark face shield / visor, facing forward (right) — the one part
        // of the helmet that's NOT the rider color
        ctx.fillStyle = "#1a2024";
        ctx.beginPath();
        ctx.ellipse(headX + 3.6 * scale, headY - 0.5 * scale, 5.4 * scale, 3.4 * scale, 0.25, 0, Math.PI * 2);
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
            ctx.strokeStyle = "rgba(255,255,255," + ((rider.lean - 0.4) * 0.4) + ")";
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
        // Same reverse-safety fix as the obstacle pruning: only drop
        // pieces once they're FAR behind, not just past the screen edge,
        // since layer.cursor never rewinds — once a piece is dropped here
        // it can never be regenerated, so a small buffer left permanent
        // empty gaps in the scenery whenever the player backed up.
        const pruneBuffer = Math.max(viewWidth * 3, 1800);
        while (layer.pieces.length && (layer.pieces[0].x + layer.pieces[0].w) < world.scrollX * parallax - pruneBuffer) {
            layer.pieces.shift();
        }
    }

    // City: far skyline silhouette, mid-distance buildings, and a dense
    // near row right behind the road so it actually reads as a city.
    const cityFarSkyline = makeLayer([50, 90], (x, w) => ({ x, w, h: 100 + Math.random() * 200, hue: 205 + Math.random() * 25 }));
    const cityMid = makeLayer([40, 70], (x, w) => ({ x, w, h: 90 + Math.random() * 170, windows: Math.random() > 0.15 }));
    const cityNear = makeLayer([30, 55], (x, w) => ({ x, w, h: 70 + Math.random() * 230, windows: Math.random() > 0.1, antenna: Math.random() > 0.7 }));

    // Countryside: rolling hills far back, a dense mid row of trees, and a
    // packed near row of trees/bushes/sticks right behind the road.
    const hillsFar = makeLayer([200, 320], (x, w) => ({ x, w, h: 60 + Math.random() * 70 }));
    const treesMid = makeLayer([34, 56], (x, w) => ({ x, w, h: 80 + Math.random() * 70, type: Math.random() > 0.5 ? "round" : "tall" }));
    const treesNear = makeLayer([22, 38], (x, w) => ({
        x, w,
        h: 60 + Math.random() * 90,
        type: Math.random() < 0.45 ? "round" : (Math.random() < 0.8 ? "tall" : "stick"),
    }));

    // Track: distant stadium structure, bleacher crowd rows, and the
    // pylon/flag line right at trackside.
    const trackStadiumFar = makeLayer([70, 110], (x, w) => ({ x, w, h: 70 + Math.random() * 60 }));
    const trackCrowd = makeLayer([26, 40], (x, w) => ({ x, w, seed: Math.random() }));
    const trackPylons = makeLayer([90, 140], (x, w) => ({ x, w, stripe: Math.random() > 0.5 }));

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
        ensureLayer(cityFarSkyline, W, 0.18);
        ensureLayer(cityMid, W, 0.4);
        ensureLayer(cityNear, W, 0.65);

        // far skyline silhouette — dense, dark, low contrast
        cityFarSkyline.pieces.forEach(p => {
            const sx = p.x - world.scrollX * 0.18;
            if (sx > W + 20 || sx + p.w < -20) return;
            const top = groundY() - p.h;
            ctx.fillStyle = `hsl(${p.hue}, 20%, 16%)`;
            ctx.fillRect(sx, top, p.w - 2, p.h);
        });

        // mid buildings — more saturated, lit windows
        cityMid.pieces.forEach(p => {
            const sx = p.x - world.scrollX * 0.4;
            if (sx > W + 20 || sx + p.w < -20) return;
            const top = groundY() - p.h;
            ctx.fillStyle = "#283c4f";
            ctx.fillRect(sx, top, p.w - 3, p.h);
            if (p.windows) {
                ctx.fillStyle = "rgba(255, 214, 130, 0.4)";
                const cols = Math.max(1, Math.floor((p.w - 3) / 10));
                const rows = Math.max(1, Math.floor(p.h / 14));
                for (let cx = 0; cx < cols; cx++) {
                    for (let cy = 0; cy < rows; cy++) {
                        if ((cx * 7 + cy * 13 + Math.floor(p.x)) % 4 === 0) continue;
                        ctx.fillRect(sx + 3 + cx * 10, top + 6 + cy * 14, 4, 6);
                    }
                }
            }
        });

        // near buildings — tall, dense, packed right behind the road
        cityNear.pieces.forEach(p => {
            const sx = p.x - world.scrollX * 0.65;
            if (sx > W + 20 || sx + p.w < -20) return;
            const top = groundY() - p.h;
            ctx.fillStyle = "#2e4257";
            ctx.fillRect(sx, top, p.w - 4, p.h);
            if (p.antenna) {
                ctx.strokeStyle = "#2e4257";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(sx + (p.w - 4) / 2, top);
                ctx.lineTo(sx + (p.w - 4) / 2, top - 16);
                ctx.stroke();
                ctx.fillStyle = "#ff5a5a";
                ctx.beginPath();
                ctx.arc(sx + (p.w - 4) / 2, top - 16, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            if (p.windows) {
                ctx.fillStyle = "rgba(255, 214, 130, 0.55)";
                const cols = Math.max(1, Math.floor((p.w - 4) / 11));
                const rows = Math.max(1, Math.floor(p.h / 16));
                for (let cx = 0; cx < cols; cx++) {
                    for (let cy = 0; cy < rows; cy++) {
                        if ((cx * 5 + cy * 11 + Math.floor(p.x)) % 5 === 0) continue;
                        ctx.fillRect(sx + 4 + cx * 11, top + 7 + cy * 16, 5, 7);
                    }
                }
            }
        });
    }

    function drawCountrysideLayers() {
        ensureLayer(hillsFar, W, 0.2);
        ensureLayer(treesMid, W, 0.38);
        ensureLayer(treesNear, W, 0.58);

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

        function drawTree(sx, w, h, type, leafColor, trunkColor) {
            const baseY = groundY();
            ctx.strokeStyle = trunkColor;
            ctx.lineWidth = Math.max(3, w * 0.12);
            ctx.beginPath();
            ctx.moveTo(sx + w / 2, baseY);
            ctx.lineTo(sx + w / 2, baseY - h * 0.45);
            ctx.stroke();
            ctx.fillStyle = leafColor;
            if (type === "round") {
                ctx.beginPath();
                ctx.arc(sx + w / 2, baseY - h * 0.6, h * 0.32, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === "tall") {
                ctx.beginPath();
                ctx.moveTo(sx + w / 2, baseY - h);
                ctx.lineTo(sx + w / 2 - h * 0.18, baseY - h * 0.4);
                ctx.lineTo(sx + w / 2 + h * 0.18, baseY - h * 0.4);
                ctx.closePath();
                ctx.fill();
            } else {
                // bare stick/branch silhouette — no canopy, just a thin
                // trunk with a few angled twigs, for forest-floor clutter
                ctx.strokeStyle = trunkColor;
                ctx.lineWidth = Math.max(2, w * 0.08);
                ctx.beginPath();
                ctx.moveTo(sx + w / 2, baseY - h * 0.45);
                ctx.lineTo(sx + w / 2, baseY - h * 0.85);
                ctx.moveTo(sx + w / 2, baseY - h * 0.65);
                ctx.lineTo(sx + w / 2 - w * 0.4, baseY - h * 0.8);
                ctx.moveTo(sx + w / 2, baseY - h * 0.75);
                ctx.lineTo(sx + w / 2 + w * 0.4, baseY - h * 0.9);
                ctx.stroke();
            }
        }

        treesMid.pieces.forEach(p => {
            const sx = p.x - world.scrollX * 0.38;
            if (sx > W + 20 || sx + p.w < -20) return;
            drawTree(sx, p.w, p.h, p.type, "#3c5c38", "#33291f");
        });

        treesNear.pieces.forEach(p => {
            const sx = p.x - world.scrollX * 0.58;
            if (sx > W + 20 || sx + p.w < -20) return;
            drawTree(sx, p.w, p.h, p.type, "#456b3e", "#3f3327");
        });
    }

    function drawTrackLayers() {
        ensureLayer(trackStadiumFar, W, 0.22);
        ensureLayer(trackCrowd, W, 0.42);
        ensureLayer(trackPylons, W, 0.55);

        // distant stadium/grandstand structure silhouette
        trackStadiumFar.pieces.forEach(p => {
            const sx = p.x - world.scrollX * 0.22;
            if (sx > W + 20 || sx + p.w < -20) return;
            const top = groundY() - p.h;
            ctx.fillStyle = "#2a2040";
            ctx.fillRect(sx, top, p.w - 3, p.h);
            ctx.fillStyle = "#3d2f55";
            ctx.fillRect(sx, top, p.w - 3, 6);
        });

        // fake crowd: a packed band of small colored dot "heads" along a
        // bleacher row, dense enough to read as a stand full of people
        trackCrowd.pieces.forEach(p => {
            const sx = p.x - world.scrollX * 0.42;
            if (sx > W + 20 || sx + p.w < -20) return;
            const bandTop = groundY() - 86;
            const bandH = 40;
            ctx.fillStyle = "#352a4a";
            ctx.fillRect(sx, bandTop, p.w, bandH);
            const hueOptions = [355, 40, 200, 95, 280, 0];
            const cols = Math.max(2, Math.floor(p.w / 7));
            const rows = 3;
            for (let cy = 0; cy < rows; cy++) {
                for (let cx = 0; cx < cols; cx++) {
                    const seed = (cx * 13 + cy * 7 + p.seed * 1000) % 11;
                    if (seed < 2) continue; // gaps so it's not a solid block
                    const hue = hueOptions[Math.floor(seed) % hueOptions.length];
                    ctx.fillStyle = `hsl(${hue}, 55%, ${45 + (cy * 6)}%)`;
                    ctx.beginPath();
                    ctx.arc(sx + 4 + cx * 7, bandTop + 8 + cy * 11, 2.6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        });

        // trackside pylons/flags
        trackPylons.pieces.forEach(p => {
            const sx = p.x - world.scrollX * 0.55;
            if (sx > W + 20 || sx + p.w < -20) return;
            ctx.fillStyle = p.stripe ? "#5a3d7a" : "#41305c";
            ctx.fillRect(sx, groundY() - 70, 8, 70);
            ctx.fillStyle = "#caa6ff";
            ctx.fillRect(sx, groundY() - 70, 8, 6);
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

        // hill tint — a subtle color wash over the road so a climb/descent
        // is visually obvious even without checking the HUD indicator.
        // Amber for climbing (effort), cool blue for descending (caution).
        const slope = hillSlopeAt(game.distance);
        if (slope > 0.02) {
            ctx.fillStyle = `rgba(255,170,60,${Math.min(0.22, slope * 0.26)})`;
            ctx.fillRect(0, bandTop, W, bandH);
        } else if (slope < -0.02) {
            ctx.fillStyle = `rgba(80,160,255,${Math.min(0.22, -slope * 0.26)})`;
            ctx.fillRect(0, bandTop, W, bandH);
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
        crate:        { w: 44, h: 44 },
        smallBarrier: { w: 26, h: 40 },
        fullBarrier:  { w: 30, h: 50 },
        ramp:         { w: 92, h: 46, color: "#ffb238" },
    };

    // Zone-themed visual variants. Mechanical behavior (dodge vs jump vs
    // crate-rules) is identical within a type — only the look (and, for
    // the oil slick, a bonus non-fatal skid effect) differs by zone.
    const ZONE_VARIANTS = {
        city: {
            crate: "trashcan",
            smallBarrier: "trafficCone",
            fullBarrier: "tape",
            ramp: "ramp",
        },
        countryside: {
            crate: ["rock", "twigs"],
            smallBarrier: ["rock", "twigs"],
            fullBarrier: "log",
            ramp: "dirtRamp",
        },
        track: {
            crate: "tireStack",
            smallBarrier: "trafficCone",
            fullBarrier: "oilSlick",
            ramp: "ramp",
        },
    };

    function pickVariant(zone, type) {
        const v = (ZONE_VARIANTS[zone] || ZONE_VARIANTS.city)[type];
        if (Array.isArray(v)) return v[Math.floor(Math.random() * v.length)];
        return v;
    }

    function spawnObstacle() {
        // Early game (first 400ft): no paired blocks — only single-lane
        // obstacles the player can dodge around. Paired blocks (which
        // force a ramp jump) don't appear until the player has had
        // enough time to learn the controls and build some speed.
        const earlyGame = game.distance < 400;
        const r = Math.random();
        let type;
        if (r < 0.42) type = "crate";
        else if (r < 0.62) type = "smallBarrier";
        else if (r < 0.76 && !earlyGame) type = "pairedBlock";
        else type = "ramp";

        const zone = currentZoneName();
        const spawnX = world.scrollX + W + 80;

        if (type === "pairedBlock") {
            // Instead of a banner/tape stretching across both lanes on
            // poles, put a crate in one lane and a cone in the other at
            // the same position — no ground path is clear, so the only
            // way through is to be airborne over both at once. Looks
            // like real obstacles you recognize, reads immediately as
            // "jump this," and no finish-line visual confusion.
            const crateDef = OBSTACLE_DEFS.crate;
            const coneDef = OBSTACLE_DEFS.smallBarrier;

            // crate goes in top lane, cone in bottom (or vice versa randomly)
            const crateIsTop = Math.random() < 0.5;
            const crateLane = crateIsTop ? LANE_TOP : LANE_BOTTOM;
            const coneLane = crateIsTop ? LANE_BOTTOM : LANE_TOP;

            obstacles.push({
                id: obstacleIdSeq++, type: "crate",
                variant: pickVariant(zone, "crate"),
                x: spawnX,
                w: crateDef.w, h: crateDef.h,
                lane: crateLane,
                triggered: false,
            });
            obstacles.push({
                id: obstacleIdSeq++, type: "smallBarrier",
                variant: pickVariant(zone, "smallBarrier"),
                x: spawnX,
                w: coneDef.w, h: coneDef.h,
                lane: coneLane,
                triggered: false,
            });

            // Always preceded by a ramp so there's always a way to be
            // airborne when the pair arrives — same guarantee the old
            // fullBarrier had, now without the ugly banner.
            const rampLane = Math.random() < 0.5 ? LANE_TOP : LANE_BOTTOM;
            obstacles.push({
                id: obstacleIdSeq++, type: "ramp",
                variant: pickVariant(zone, "ramp"),
                x: spawnX - 190,
                w: OBSTACLE_DEFS.ramp.w, h: OBSTACLE_DEFS.ramp.h,
                lane: rampLane,
                triggered: false,
            });
            return; // early return — no further processing needed
        }

        const def = OBSTACLE_DEFS[type];
        const lane = Math.random() < 0.5 ? LANE_TOP : LANE_BOTTOM;

        const entry = {
            id: obstacleIdSeq++, type,
            variant: pickVariant(zone, type),
            x: spawnX,
            w: def.w, h: def.h,
            lane: lane,
            triggered: false,
        };

        obstacles.push(entry);
    }

    function updateObstacles(dt) {
        const minGap = Math.max(360, 700 - game.distance * 0.06);
        const maxGap = Math.max(520, 980 - game.distance * 0.08);

        if (world.scrollX + W > nextObstacleAt) {
            spawnObstacle();
            nextObstacleAt = world.scrollX + W + minGap + Math.random() * (maxGap - minGap);
        }

        // Prune obstacles only once they're FAR behind — not just past
        // the screen edge — so reversing back into recently-passed
        // obstacles (crates, barriers, ramps) still finds them there.
        // The old 100px buffer was deleting anything you'd reverse back
        // toward; this is now generous enough to support real backing up
        // while still eventually cleaning up very old, truly-unreachable
        // obstacles so the array doesn't grow forever on a long run.
        const PRUNE_BEHIND_BUFFER = Math.max(W * 3, 1800);
        for (let i = obstacles.length - 1; i >= 0; i--) {
            if (obstacles[i].x + obstacles[i].w < world.scrollX - PRUNE_BEHIND_BUFFER) obstacles.splice(i, 1);
        }

        // ramp riding: while the rider's x overlaps a ramp in their lane
        // and they're on the ground, their height follows the ramp's
        // slope. Only once they pass the ramp's far/peak edge do they
        // actually launch airborne.
        if (!rider.airborne && !rider.crashed) {
            let onAnyRamp = false;

            for (const o of obstacles) {
                if (o.type !== "ramp" || o.triggered) continue;
                if (o.lane !== rider.lane) continue;
                const sx = obstacleScreenX(o);

                if (sx <= rider.x && sx + o.w > rider.x) {
                    // currently riding up the slope — lock height to it
                    onAnyRamp = true;
                    rider.onRamp = o;
                    rider.y = -rampSurfaceYAtRiderX(o);
                } else if (rider.onRamp === o && rider.x >= sx + o.w) {
                    // just passed the peak — launch
                    o.triggered = true;
                    rider.onRamp = null;
                    launchFromRamp(o);
                }
            }

            if (!onAnyRamp) {
                // not riding any ramp right now — clear a stale reference
                // and make sure height resets to ground level if it was
                // left elevated from a slope that despawned mid-ride
                // (edge case safety net; also covers an orphaned onRamp
                // pointing at an obstacle no longer in the array at all)
                rider.onRamp = null;
                if (!rider.airborne) rider.y = 0;
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
            // Some variants (tape, oil slick) are drawn considerably wider
            // than their narrow collision hitbox for visual clarity, so
            // the on-screen cull needs extra margin or they'd pop in/out
            // or get asymmetrically clipped while still technically
            // within the old, hitbox-sized bounds.
            if (sx > W + 160 || sx < -260) return;

            if (o.type === "crate" || o.type === "smallBarrier") {
                drawLaneObstacleVariant(o, sx);
            } else if (o.type === "fullBarrier") {
                drawFullBarrierVariant(o, sx);
            } else if (o.type === "ramp") {
                drawRampVariant(o, sx);
            }
        });
    }

    // ---------------- ONE-LANE OBSTACLES (crate + smallBarrier) ----------------
    // All of these are dodge-or-jump obstacles; only the look changes.
    function drawLaneObstacleVariant(o, sx) {
        const gy = obstacleLaneY(o);
        const w = o.w, h = o.h;

        switch (o.variant) {
            case "trashcan": {
                ctx.fillStyle = "#5a6a6e";
                ctx.fillRect(sx, gy - h, w, h);
                ctx.fillStyle = "#3f4d50";
                ctx.fillRect(sx, gy - h, w, 6);
                ctx.strokeStyle = "rgba(0,0,0,0.35)";
                ctx.lineWidth = 2;
                for (let lx = sx + w * 0.25; lx < sx + w; lx += w * 0.25) {
                    ctx.beginPath();
                    ctx.moveTo(lx, gy - h + 8);
                    ctx.lineTo(lx, gy - 3);
                    ctx.stroke();
                }
                break;
            }
            case "tireStack": {
                const tireR = w / 2;
                [0, 1, 2].forEach(i => {
                    const ty = gy - tireR - i * tireR * 1.15;
                    ctx.fillStyle = "#181818";
                    ctx.beginPath();
                    ctx.ellipse(sx + tireR, ty, tireR, tireR * 0.78, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = "#000";
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.fillStyle = "#0d0d0d";
                    ctx.beginPath();
                    ctx.ellipse(sx + tireR, ty, tireR * 0.45, tireR * 0.36, 0, 0, Math.PI * 2);
                    ctx.fill();
                });
                break;
            }
            case "trafficCone": {
                const baseW = w, topW = w * 0.18;
                const topY = gy - h, baseY = gy;
                ctx.beginPath();
                ctx.moveTo(sx + w / 2 - topW / 2, topY);
                ctx.lineTo(sx + w / 2 + topW / 2, topY);
                ctx.lineTo(sx + baseW, baseY);
                ctx.lineTo(sx, baseY);
                ctx.closePath();
                ctx.fillStyle = "#ff5a1f";
                ctx.fill();
                ctx.fillStyle = "#fff";
                const stripeY = gy - h * 0.42;
                const stripeTopW = topW + (baseW - topW) * 0.42;
                ctx.fillRect(sx + (w - stripeTopW) / 2, stripeY, stripeTopW, h * 0.16);
                ctx.fillStyle = "#cc4416";
                ctx.fillRect(sx, baseY - 5, baseW, 5);
                break;
            }
            case "rock": {
                ctx.fillStyle = "#6e6a63";
                ctx.beginPath();
                ctx.moveTo(sx, gy);
                ctx.lineTo(sx + w * 0.1, gy - h * 0.7);
                ctx.lineTo(sx + w * 0.4, gy - h);
                ctx.lineTo(sx + w * 0.75, gy - h * 0.75);
                ctx.lineTo(sx + w, gy - h * 0.2);
                ctx.lineTo(sx + w, gy);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = "rgba(255,255,255,0.12)";
                ctx.beginPath();
                ctx.moveTo(sx + w * 0.4, gy - h);
                ctx.lineTo(sx + w * 0.75, gy - h * 0.75);
                ctx.lineTo(sx + w * 0.55, gy - h * 0.55);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = "rgba(0,0,0,0.3)";
                ctx.lineWidth = 1.5;
                ctx.stroke();
                break;
            }
            case "twigs": {
                ctx.fillStyle = "#4a3320";
                ctx.beginPath();
                ctx.ellipse(sx + w / 2, gy - 4, w / 2, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#6b4a2a";
                ctx.lineWidth = 4;
                ctx.lineCap = "round";
                for (let i = 0; i < 4; i++) {
                    const x0 = sx + 4 + i * (w - 8) / 3;
                    ctx.beginPath();
                    ctx.moveTo(x0, gy - 2);
                    ctx.lineTo(x0 + 8 - i * 2, gy - h * (0.5 + i * 0.08));
                    ctx.stroke();
                }
                break;
            }
            default: {
                // fallback generic crate (shouldn't normally hit this)
                ctx.fillStyle = "#d8553a";
                ctx.fillRect(sx, gy - h, w, h);
            }
        }
    }

    // ---------------- FULL-WIDTH BARRIERS (span both lanes, jump-only) ----------------
    function drawFullBarrierVariant(o, sx) {
        const bandTop = laneBandTop();
        const bandH = laneBandHeight();
        const w = o.w;

        switch (o.variant) {
            case "tape": {
                // A taut caution-tape barrier strung tight between two
                // posts, spanning the full road width. Drawn as a solid
                // hazard-striped band (not a deep sagging rope) so it
                // reads as "this blocks the road, jump it" rather than a
                // finish-line ribbon you're meant to ride through.
                const tapeCenterX = sx + w / 2;
                const tapeSpan = Math.max(w, 150);
                const postLeftX = tapeCenterX - tapeSpan / 2;
                const postRightX = tapeCenterX + tapeSpan / 2;
                const postW = 5;
                const tapeTop = bandTop + bandH * 0.32;
                const tapeBandH = bandH * 0.22;
                const tapeSag = bandH * 0.06; // just a slight, realistic sag — not a deep U

                ctx.fillStyle = "#3a3a3a";
                ctx.fillRect(postLeftX - postW / 2, bandTop - 4, postW, bandH + 8);
                ctx.fillRect(postRightX - postW / 2, bandTop - 4, postW, bandH + 8);

                // taut tape band — nearly straight, only a slight sag
                ctx.beginPath();
                ctx.moveTo(postLeftX, tapeTop);
                ctx.quadraticCurveTo(tapeCenterX, tapeTop + tapeSag, postRightX, tapeTop);
                ctx.lineTo(postRightX, tapeTop + tapeBandH);
                ctx.quadraticCurveTo(tapeCenterX, tapeTop + tapeBandH + tapeSag, postLeftX, tapeTop + tapeBandH);
                ctx.closePath();
                ctx.fillStyle = "#ffd400";
                ctx.fill();
                ctx.strokeStyle = "#cc9f00";
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // bold diagonal black hazard stripes across the taut band —
                // the classic caution-tape look, clipped to the band shape
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(postLeftX, tapeTop);
                ctx.quadraticCurveTo(tapeCenterX, tapeTop + tapeSag, postRightX, tapeTop);
                ctx.lineTo(postRightX, tapeTop + tapeBandH);
                ctx.quadraticCurveTo(tapeCenterX, tapeTop + tapeBandH + tapeSag, postLeftX, tapeTop + tapeBandH);
                ctx.closePath();
                ctx.clip();
                ctx.fillStyle = "#1a1a1a";
                const stripeW = 14;
                for (let tx = postLeftX - tapeBandH; tx < postRightX + tapeBandH; tx += stripeW * 2) {
                    ctx.save();
                    ctx.translate(tx, tapeTop);
                    ctx.rotate(0.6);
                    ctx.fillRect(0, -10, stripeW, tapeBandH + 40);
                    ctx.restore();
                }
                ctx.restore();
                break;
            }
            case "log": {
                // big downed tree trunk across both lanes
                ctx.fillStyle = "#5c4226";
                ctx.fillRect(sx, bandTop + 6, w, bandH - 12);
                ctx.fillStyle = "#3e2c19";
                ctx.fillRect(sx, bandTop + 6, w, 6);
                // bark rings / texture
                ctx.strokeStyle = "rgba(0,0,0,0.25)";
                ctx.lineWidth = 2;
                for (let ly = bandTop + 16; ly < bandTop + bandH - 8; ly += 10) {
                    ctx.beginPath();
                    ctx.moveTo(sx + 2, ly);
                    ctx.lineTo(sx + w - 2, ly + 2);
                    ctx.stroke();
                }
                // cut-end rings at the near edge for readability
                ctx.strokeStyle = "rgba(255,255,255,0.18)";
                ctx.beginPath();
                ctx.ellipse(sx + 4, bandTop + bandH / 2, 3, bandH / 2 - 6, 0, 0, Math.PI * 2);
                ctx.stroke();
                break;
            }
            case "oilSlick": {
                // A flat, glossy puddle that spans the FULL road width
                // (both lanes), same footprint as the tape/log barriers,
                // so it unmistakably reads as "blocks the whole street."
                // High-contrast neon edge so it doesn't just blend into
                // the dark track surface.
                const puddleSpan = Math.max(w, 130);
                const puddleCenterX = sx + w / 2;
                const puddleLeft = puddleCenterX - puddleSpan / 2;
                const puddleTop = bandTop + bandH * 0.18;
                const puddleH = bandH * 0.64;

                ctx.fillStyle = "#070708";
                ctx.beginPath();
                ctx.ellipse(puddleCenterX, puddleTop + puddleH / 2, puddleSpan / 2, puddleH / 2, 0, 0, Math.PI * 2);
                ctx.fill();

                // bright neon-purple rim so the puddle's edge is unmistakable
                // against the dark track surface, even at speed
                ctx.strokeStyle = "rgba(190,110,255,0.85)";
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.ellipse(puddleCenterX, puddleTop + puddleH / 2, puddleSpan / 2 - 1.5, puddleH / 2 - 1.5, 0, 0, Math.PI * 2);
                ctx.stroke();

                // glossy highlight streaks across the puddle surface
                ctx.fillStyle = "rgba(255,255,255,0.22)";
                ctx.beginPath();
                ctx.ellipse(puddleLeft + puddleSpan * 0.3, puddleTop + puddleH * 0.4, puddleSpan * 0.16, puddleH * 0.16, 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(puddleLeft + puddleSpan * 0.68, puddleTop + puddleH * 0.6, puddleSpan * 0.1, puddleH * 0.1, -0.2, 0, Math.PI * 2);
                ctx.fill();

                // rainbow oily sheen bands
                ctx.strokeStyle = "rgba(120,200,255,0.3)";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.ellipse(puddleCenterX, puddleTop + puddleH / 2, puddleSpan / 2 - 6, puddleH / 2 - 6, 0, 0, Math.PI * 2);
                ctx.stroke();
                break;
            }

            default: {
                ctx.fillStyle = "#c9a23b";
                ctx.fillRect(sx, bandTop + 4, w, bandH - 8);
            }
        }
    }

    // ---------------- RAMPS ----------------
    function drawRampVariant(o, sx) {
        const gy = obstacleLaneY(o);
        const rampW = o.w;
        const rampH = o.h;

        // The world scrolls right-to-left past the rider (who sits fixed
        // on screen), so the rider always meets an obstacle's LEFT edge
        // first. Every ramp variant is low/flat on the left (entry) and
        // rises to its peak on the right (launch point).

        const surfaceColor = o.variant === "dirtRamp" ? "#8a5a2e" : "#ffb238";
        const baseColor = o.variant === "dirtRamp" ? "#4a3318" : "#3a4046";
        const edgeColor = o.variant === "dirtRamp" ? "#d9b27a" : "#fff3d6";

        // base/shadow wedge
        ctx.beginPath();
        ctx.moveTo(sx, gy);
        ctx.lineTo(sx + rampW, gy);
        ctx.lineTo(sx + rampW, gy - rampH);
        ctx.lineTo(sx + rampW * 0.82, gy - rampH * 0.18);
        ctx.closePath();
        ctx.fillStyle = baseColor;
        ctx.fill();

        // sloped riding surface
        ctx.beginPath();
        ctx.moveTo(sx, gy);
        ctx.lineTo(sx + rampW, gy - rampH);
        ctx.lineTo(sx + rampW, gy);
        ctx.closePath();
        ctx.fillStyle = surfaceColor;
        ctx.fill();

        if (o.variant === "dirtRamp") {
            // clumpy dirt texture instead of hazard stripes
            ctx.fillStyle = "rgba(0,0,0,0.18)";
            for (let i = 0; i < 6; i++) {
                const t = (i + 0.5) / 6;
                const x = sx + rampW * t;
                const y = gy - rampH * t * 0.92;
                ctx.beginPath();
                ctx.ellipse(x, y + 4, 5, 3, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // hazard stripes across the ramp face
            ctx.strokeStyle = "rgba(20,16,8,0.55)";
            ctx.lineWidth = 3;
            const stripeCount = 4;
            for (let i = 1; i <= stripeCount; i++) {
                const t = i / (stripeCount + 1);
                const x = sx + rampW * t;
                ctx.beginPath();
                ctx.moveTo(x, gy - rampH * t);
                ctx.lineTo(x, gy);
                ctx.stroke();
            }
        }

        // bright edge outline so the silhouette is unmistakable
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, gy);
        ctx.lineTo(sx + rampW, gy - rampH);
        ctx.lineTo(sx + rampW, gy);
        ctx.stroke();

        // small "launch" chevron above the peak
        ctx.fillStyle = o.variant === "dirtRamp" ? "rgba(217,178,122,0.85)" : "rgba(255,178,56,0.85)";
        ctx.beginPath();
        ctx.moveTo(sx + rampW * 0.78, gy - rampH - 10);
        ctx.lineTo(sx + rampW * 0.78 + 9, gy - rampH - 20);
        ctx.lineTo(sx + rampW * 0.78 + 18, gy - rampH - 10);
        ctx.closePath();
        ctx.fill();
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

            if (o.type === "crate" || o.type === "smallBarrier") {
                if (hb.airborne) continue;        // jumping clears it too
                if (o.lane !== hb.lane) continue;  // safe if in the other lane
                registerHit();
                return;
            }
            if (o.type === "fullBarrier") {
                if (hb.airborne) continue; // must be jumping — lane doesn't matter, dodge can't help

                if (o.variant === "oilSlick") {
                    // non-fatal: a skid instead of a crash, but only
                    // triggers once per pass through the same slick
                    if (!o.triggered) {
                        o.triggered = true;
                        triggerOilSkid();
                    }
                    continue;
                }

                registerHit();
                return;
            }
        }
    }

    function triggerOilSkid() {
        // brief, non-fatal penalty: lose a chunk of speed immediately,
        // plus jittery/unreliable steering for about a second. Can now
        // genuinely slow you toward a stop — if you don't get back on
        // the throttle you risk the stationary-fall timer too.
        game.speedNorm = Math.max(0, game.speedNorm - 0.35);
        rider.skidTimer = 1.0;
    }

    function registerHit() {
        if (rider.crashed) return;
        crashRider("hit");
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
        crashReason: document.getElementById("eucCrashReason"),
        bestScore: document.getElementById("eucBestScore"),
        topSpeed: document.getElementById("eucTopSpeed"),
        playBtn: document.getElementById("eucPlayBtn"),
        retryBtn: document.getElementById("eucRetryBtn"),
        resumeBtn: document.getElementById("eucResumeBtn"),
        pauseBtn: document.getElementById("eucPauseBtn"),
        overheatBanner: document.getElementById("eucOverheatBanner"),
        hillBanner: document.getElementById("eucHillBanner"),
        jumpZone: document.getElementById("eucJumpZone"),
    };

    function updateHUD() {
        el.score.textContent = Math.floor(game.distance);
        const mph = Math.round(speedNormToMph(game.speedNorm));
        if (mph < 0) {
            el.speedVal.innerHTML = Math.abs(mph) + ' <span style="font-size:13px;font-weight:700;">mph REV</span>';
        } else {
            el.speedVal.innerHTML = mph + ' <span style="font-size:13px;font-weight:700;">mph</span>';
        }
        if (mph > game.topSpeedDisplay) game.topSpeedDisplay = mph;
        el.zoneLabel.textContent = currentZoneName();

        if (el.overheatBanner) {
            el.overheatBanner.classList.toggle("eucHidden", !rider.overheatWarning);
        }

        if (el.hillBanner) {
            const slope = hillSlopeAt(game.distance);
            if (slope > 0.05) {
                el.hillBanner.textContent = "▲ CLIMBING — HOLD FAST";
                el.hillBanner.className = "eucHillClimb";
            } else if (slope < -0.05) {
                el.hillBanner.textContent = "▼ DESCENDING — EASE OFF";
                el.hillBanner.className = "eucHillDescent";
            } else {
                el.hillBanner.className = "eucHidden";
            }
        }
    }

    // ============================================================
    // LIFECYCLE
    // ============================================================
    let lastTime = 0;
    let rafId = null;

    function resetBackgroundLayers() {
        // Layers only ever grow forward and never rewind, so without this
        // a second playthrough would have its scenery cursors far ahead
        // of the freshly-reset world.scrollX = 0, leaving a long empty
        // gap before anything scrolls into view (looked like "the city
        // doesn't start for several hundred feet" on repeat plays).
        [cityFarSkyline, cityMid, cityNear, hillsFar, treesMid, treesNear, trackStadiumFar, trackCrowd, trackPylons].forEach(layer => {
            layer.pieces.length = 0;
            layer.cursor = 0;
        });
    }

    function startGame() {
        game.distance = 0;
        game.speedNorm = 0.25;
        game.topSpeedDisplay = 0;
        game.trickScoreFlash = null;
        world.scrollX = 0;
        obstacles.length = 0;
        nextObstacleAt = 900;
        resetBackgroundLayers();
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

        if (el.crashReason) {
            const reasonText = {
                tooSlow: "Too slow off the ramp — you dropped off the front.",
                hit: "You hit an obstacle.",
                cutout: "Battery cut out — you went flying at full speed.",
                fellOver: "You stood still too long and the wheel tipped over.",
            }[rider.crashReason] || "";
            el.crashReason.textContent = reasonText;
        }

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
        if (rider.cutoutFlying) {
            // battery's already cut out — no steering, no scrolling, just
            // playing out the forward fling until impact
            updateRider(dt);
            updateHUD();
            return;
        }

        // Speed control driven by the self-centering slider.
        // sliderT = -1..+1: positive = forward throttle, negative = brake/reverse.
        // When the slider is released it returns to 0 and speed decays naturally.
        const sliderT = input.sliderT;
        const activeInput = Math.abs(sliderT) > 0.08; // outside the deadzone

        if (sliderT > 0.08) {
            // Forward throttle — scales with how far right the puck is pushed
            game.speedNorm += sliderT * 0.55 * dt;
        } else if (sliderT < -0.08) {
            // Brake / reverse — scales with how far left the puck is pushed
            game.speedNorm += sliderT * BRAKE_STRENGTH * dt;
        } else {
            // Slider centered / released — decay toward a dead stop
            const decay = Math.sign(game.speedNorm) * Math.min(Math.abs(game.speedNorm), 0.9 * dt);
            game.speedNorm -= decay;
        }

        // Keep lean flags in sync for the visual arm-pose and overheat systems
        input.leanLeft  = sliderT < -0.08;
        input.leanRight = sliderT >  0.08;

        // Hill gravity — applies on top of whatever the player is doing.
        // Uphill (positive slope) fights forward motion, so you have to
        // actively hold FAST to keep climbing or you'll stall out.
        // Downhill (negative slope) accelerates you forward automatically,
        // even with no input at all, so you have to actively brake or
        // you'll keep speeding up.
        const slope = hillSlopeAt(game.distance);
        if (slope > 0) {
            // uphill: gravity pulls speed down, proportional to steepness
            game.speedNorm -= slope * HILL_GRAVITY_BRAKE * dt;
        } else if (slope < 0) {
            // downhill: gravity pushes speed up, proportional to steepness
            game.speedNorm += (-slope) * HILL_GRAVITY_FORWARD * dt;
        }

        game.speedNorm = Math.max(MAX_REVERSE_SPEED_NORM, Math.min(1.3, game.speedNorm));

        // Stationary-fall: only once you're truly at a dead stop (0mph)
        // AND holding neither button does the clock start. Holding
        // either FAST or SLOW — even at 0mph — counts as active
        // balancing input and keeps you up indefinitely.
        const atFullStop = Math.abs(game.speedNorm) < 0.01;
        if (atFullStop && !activeInput && !rider.airborne && !rider.crashed) {
            rider.stationaryTimer = (rider.stationaryTimer || 0) + dt;
            if (rider.stationaryTimer >= STATIONARY_FALL_SECONDS) {
                crashRider("fellOver");
            }
        } else {
            rider.stationaryTimer = 0;
        }

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

    // Maximum visual tilt applied to the whole scene during the steepest
    // part of a hill (radians). The camera rotates around the rider's
    // fixed screen position, so the road and background visibly slope
    // while the rider itself stays anchored where the controls expect it.
    const HILL_MAX_TILT_RADIANS = 0.22;

    function render() {
        ctx.clearRect(0, 0, W, H);

        const slope = (!rider.airborne && !rider.crashed) ? hillSlopeAt(game.distance) : 0;
        const tilt = slope * HILL_MAX_TILT_RADIANS;

        if (tilt !== 0) {
            ctx.save();
            const pivotX = rider.x;
            const pivotY = riderGroundY();
            ctx.translate(pivotX, pivotY);
            // climbing (slope>0) tilts the horizon down to the right,
            // i.e. the road rises ahead of the rider; descending tilts
            // the other way, road dropping away ahead
            ctx.rotate(-tilt);
            ctx.translate(-pivotX, -pivotY);
        }

        drawBackground();
        drawObstacles();
        drawRider();
        drawTrickFlash();
        updateTrickButtonLabel();

        if (tilt !== 0) {
            ctx.restore();
        }
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
        if (rider.skidTimer > 0) {
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = "#ff6b5a";
            ctx.font = "bold " + Math.round(15 * riderScale()) + "px -apple-system, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("SKIDDING!", rider.x, riderGroundY() - RIDER_HEIGHT * riderScale() - 50);
            ctx.globalAlpha = 1;
        }
    }

    function updateTrickButtonLabel() {
        // no-op: the manual trick/action button has been removed —
        // tricks now fire automatically while airborne (see maybeAutoTrick)
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
