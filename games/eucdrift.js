/* ============================================================
   EUC DRIFT — Chaser arcade integration  (clean rewrite)
   Drop-in replacement for /games/eucdrift.js
   All features confirmed, no curves, no broken systems.
   ============================================================ */

window.initEucDriftGame = function () {
    const container = document.getElementById("gameCanvasContainer");
    if (!container) return;
    if (window.__eucDriftCleanup) { try { window.__eucDriftCleanup(); } catch(e){} }

    container.innerHTML = `
<style>
#eucRoot {
    position:relative; width:100%; height:100%; min-height:480px;
    overflow:hidden; background:#0c1116;
    font-family:-apple-system,'Segoe UI',Roboto,sans-serif;
    box-sizing:border-box; border-radius:10px; touch-action:none;
}
#eucCanvas { position:absolute; top:0; left:0; width:100%; height:100%; display:block; }

/* HUD */
#eucHud {
    position:absolute; top:0; left:0; right:0;
    padding:8px 14px 0; display:flex; justify-content:space-between;
    align-items:flex-start; pointer-events:none; z-index:10; box-sizing:border-box;
}
#eucScore { color:#eaf2f8; font-size:30px; font-weight:800; text-shadow:0 2px 6px rgba(0,0,0,.5); }
#eucScoreLabel { font-size:11px; font-weight:700; color:#b8c8d4; letter-spacing:1.4px; text-transform:uppercase; }
#eucSpeedWrap { display:flex; flex-direction:column; align-items:flex-end; color:#eaf2f8; padding-right:32px; }
#eucSpeedVal { font-size:24px; font-weight:800; text-shadow:0 2px 6px rgba(0,0,0,.5); }
#eucZoneLabel { font-size:11px; font-weight:700; color:#b8c8d4; letter-spacing:1.4px; text-transform:uppercase; margin-top:2px; }

/* Center HUD: lives + coins */
#eucCenterHud {
    position:absolute; top:8px; left:50%; transform:translateX(-50%);
    pointer-events:none; z-index:10; display:flex; flex-direction:column; align-items:center; gap:2px;
}
#eucLivesHud  { font-size:14px; letter-spacing:3px; }
#eucCoinHud   { font-size:11px; font-weight:700; color:#ffd700; text-shadow:0 1px 4px rgba(0,0,0,.5); }

/* Battery bar */
#eucBattBar {
    position:absolute; bottom:92px; right:12px; z-index:11; pointer-events:none;
    display:flex; flex-direction:column; align-items:flex-end; gap:2px;
}
#eucBattLabel { font-size:8px; font-weight:700; color:rgba(234,242,248,.45); letter-spacing:.8px; }
#eucBattTrack {
    width:48px; height:9px; background:rgba(255,255,255,.1);
    border-radius:5px; overflow:hidden; border:1px solid rgba(255,255,255,.15);
}
#eucBattFill { height:100%; width:100%; background:#4fd1c5; border-radius:5px; transition:background .3s; }

/* Banners */
#eucMotorBanner, #eucHillBanner {
    position:absolute; left:50%; transform:translateX(-50%);
    z-index:12; font-size:11px; font-weight:800; letter-spacing:.6px;
    padding:5px 14px; border-radius:100px; white-space:nowrap; pointer-events:none;
}
#eucMotorBanner { top:38px; background:rgba(40,8,8,.9); border:1.5px solid #ff3a3a; color:#ff6b6b; animation:eucPulse .4s infinite; }
#eucHillBanner  { top:38px; }
#eucMotorBanner.eucHide, #eucHillBanner.eucHide { display:none; }
#eucHillBanner.climb  { background:rgba(60,38,8,.9); border:1.5px solid #ffaa3c; color:#ffc77a; }
#eucHillBanner.descend{ background:rgba(8,28,48,.9);  border:1.5px solid #50a0ff; color:#8cc4ff; }
@keyframes eucPulse { 0%,100%{opacity:1} 50%{opacity:.4} }

/* Pause btn */
#eucPauseBtn {
    position:absolute; top:8px; right:10px; width:28px; height:28px; z-index:11;
    color:rgba(234,242,248,.5); background:transparent; border:none; padding:0;
    display:flex; align-items:center; justify-content:center; pointer-events:auto;
}
#eucPauseBtn svg { width:100%; height:100%; }

/* Controls */
#eucControls {
    position:absolute; bottom:0; left:0; right:0;
    padding:0 14px 14px; display:flex; justify-content:space-between;
    align-items:flex-end; z-index:10; box-sizing:border-box;
}

/* 2D joystick pad — right thumb only, handles both speed and lane dodge */
.eucJoyWrap { display:flex; align-items:center; }
.eucJoyTrack {
    position:relative; width:160px; height:140px;
    background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.12);
    border-radius:24px; touch-action:none; user-select:none;
}
/* Center crosshair */
.eucJoyCross {
    position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
    pointer-events:none;
}
.eucJoyCross::before, .eucJoyCross::after {
    content:""; position:absolute; background:rgba(255,255,255,.14); border-radius:1px;
}
.eucJoyCross::before { width:2px; height:32px; left:-1px; top:-16px; }
.eucJoyCross::after  { width:32px; height:2px; left:-16px; top:-1px; }
/* Labels */
.eucJoyLbl {
    position:absolute; font-size:9px; font-weight:700; letter-spacing:.5px;
    color:rgba(234,242,248,.3); pointer-events:none;
}
.eucJoyLbl.L { left:9px;  top:50%; transform:translateY(-50%); }
.eucJoyLbl.R { right:9px; top:50%; transform:translateY(-50%); }
.eucJoyLbl.U { top:9px;   left:50%; transform:translateX(-50%); }
.eucJoyLbl.D { bottom:9px;left:50%; transform:translateX(-50%); }
/* Puck */
.eucJoyPuck {
    position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
    width:52px; height:52px; border-radius:50%;
    background:radial-gradient(circle at 38% 32%,rgba(255,255,255,.22),rgba(255,255,255,.06));
    border:2px solid rgba(255,255,255,.28); box-shadow:0 2px 14px rgba(0,0,0,.4);
    pointer-events:none; will-change:transform; transition:background .1s,border-color .1s;
}
.eucJoyPuck.fwd { border-color:rgba(79,209,197,.7); background:radial-gradient(circle at 38% 32%,rgba(79,209,197,.35),rgba(79,209,197,.12)); }
.eucJoyPuck.rev { border-color:rgba(255,120,80,.7);  background:radial-gradient(circle at 38% 32%,rgba(255,120,80,.35),rgba(255,120,80,.12)); }
.eucJoyPuck.up  { border-color:rgba(180,130,255,.7); background:radial-gradient(circle at 38% 32%,rgba(180,130,255,.35),rgba(180,130,255,.12)); }
.eucJoyPuck.dn  { border-color:rgba(255,200,80,.7);  background:radial-gradient(circle at 38% 32%,rgba(255,200,80,.35),rgba(255,200,80,.12)); }

/* Legacy dodge pad — hidden now that joystick handles dodging */
.eucDodgePad { display:none; }

/* Jump button — left thumb, pre-load mechanic */
#eucJumpWrap {
    position:relative; width:72px; height:140px;
    display:flex; align-items:center; justify-content:center;
}
#eucJumpRing {
    position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
    pointer-events:none;
}
#eucJumpArc { width:72px; height:72px; }
#eucJumpBtn {
    width:56px; height:56px; border-radius:50%;
    background:rgba(255,255,255,.07); border:2px solid rgba(255,255,255,.2);
    color:rgba(234,242,248,.7); font-family:inherit;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:2px; padding:0; transition:background .08s, border-color .08s; cursor:pointer;
    position:relative; z-index:1;
}
#eucJumpBtn.loading {
    background:rgba(79,209,197,.15); border-color:rgba(79,209,197,.6);
    color:#4fd1c5;
}
#eucJumpBtn.ready {
    background:rgba(79,209,197,.3); border-color:#4fd1c5;
    color:#fff; box-shadow:0 0 16px rgba(79,209,197,.5);
}
#eucJumpIcon { font-size:20px; line-height:1; }
#eucJumpLbl  { font-size:8px; font-weight:700; letter-spacing:.5px; }

/* Overlays */
.eucOverlay {
    position:absolute; inset:0; display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    background:rgba(8,12,16,.9); z-index:20; text-align:center;
    padding:20px; box-sizing:border-box;
}
.eucOverlay.eucHide { display:none; }
.eucLogo { font-size:30px; font-weight:800; color:#fff; letter-spacing:-.5px; margin-bottom:4px; font-family:Impact,'Arial Black',sans-serif; }
.eucLogo span { color:#4fd1c5; }
.eucSub { font-size:13px; color:#8fa3b3; margin-bottom:20px; max-width:260px; line-height:1.5; }
.eucBigStat { font-size:42px; font-weight:800; color:#4fd1c5; line-height:1; }
.eucBigLbl  { font-size:10px; font-weight:600; color:#8fa3b3; letter-spacing:1.2px; text-transform:uppercase; margin-bottom:4px; }
.eucStatRow { display:flex; gap:26px; margin:16px 0 6px; }
.eucCrashTxt { font-size:14px; font-weight:700; color:#ff8a7a; margin-bottom:14px; max-width:260px; line-height:1.4; }
.eucBtn {
    margin-top:18px; background:#4fd1c5; color:#06201d; border:none;
    font-size:15px; font-weight:700; padding:13px 38px; border-radius:100px;
    box-shadow:0 6px 20px rgba(79,209,197,.35); cursor:pointer;
}
.eucBtn:active { transform:scale(.96); }
.eucColorLbl { font-size:10px; font-weight:700; color:#8fa3b3; letter-spacing:1.2px; margin:6px 0 10px; }
#eucSwatches { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; max-width:260px; }
.eucSwatch {
    width:30px; height:30px; border-radius:50%; border:2.5px solid transparent; padding:0;
    box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.25); transition:transform .1s,border-color .1s; cursor:pointer;
}
.eucSwatch.sel { border-color:#fff; transform:scale(1.18); }

/* Medal overlay extras */
#eucMedalAward { font-size:90px; line-height:1; margin-bottom:8px; }
#eucMedalName  { font-size:26px; font-weight:800; margin-bottom:4px; }
</style>

<div id="eucRoot">
  <canvas id="eucCanvas"></canvas>

  <div id="eucHud">
    <div>
      <div id="eucScore">0</div>
      <div id="eucScoreLabel">feet</div>
    </div>
    <div id="eucSpeedWrap">
      <div id="eucSpeedVal">0 <span style="font-size:12px;font-weight:700">mph</span></div>
      <div id="eucZoneLabel">city</div>
    </div>
  </div>

  <div id="eucCenterHud">
    <div id="eucLivesHud">❤️❤️❤️</div>
    <div id="eucCoinHud">⚡ 0</div>
  </div>

  <div id="eucBattBar">
    <div id="eucBattLabel">MOTOR</div>
    <div id="eucBattTrack"><div id="eucBattFill"></div></div>
  </div>

  <div id="eucMotorBanner" class="eucHide">⚠ MOTOR CUTOUT — EASE OFF</div>
  <div id="eucHillBanner"  class="eucHide"></div>

  <button id="eucPauseBtn" type="button" aria-label="Pause">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
    </svg>
  </button>

  <div id="eucControls">
    <!-- Left thumb: pre-load jump button -->
    <div id="eucJumpWrap">
      <div id="eucJumpRing">
        <svg id="eucJumpArc" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="4"/>
          <circle id="eucJumpProgress" cx="36" cy="36" r="30" fill="none"
            stroke="#4fd1c5" stroke-width="4" stroke-linecap="round"
            stroke-dasharray="188.5" stroke-dashoffset="188.5"
            transform="rotate(-90 36 36)"/>
        </svg>
      </div>
      <button id="eucJumpBtn" type="button">
        <span id="eucJumpIcon">↑</span>
        <span id="eucJumpLbl">HOLD</span>
      </button>
    </div>
    <!-- Right thumb: 2D joystick -->
    <div class="eucJoyWrap">
      <div class="eucJoyTrack" id="eucJoyTrack">
        <div class="eucJoyCross"></div>
        <span class="eucJoyLbl L">SLOW</span>
        <span class="eucJoyLbl R">FAST</span>
        <span class="eucJoyLbl U">↑</span>
        <span class="eucJoyLbl D">↓</span>
        <div class="eucJoyPuck" id="eucJoyPuck"></div>
      </div>
    </div>
  </div>

  <!-- START -->
  <div class="eucOverlay" id="eucStart">
    <div class="eucLogo">EUC<span>DRIFT</span></div>
    <div class="eucSub">Lean in. Ride the city, the backroads, and the track.</div>
    <div class="eucColorLbl">YOUR COLOR</div>
    <div id="eucSwatches"></div>
    <button class="eucBtn" id="eucPlayBtn" type="button">RIDE</button>
  </div>

  <!-- CRASH / GAME OVER -->
  <div class="eucOverlay eucHide" id="eucOver">
    <div class="eucCrashTxt"  id="eucOverMsg"></div>
    <div id="eucLivesOver" style="font-size:20px;margin-bottom:10px;letter-spacing:3px"></div>
    <div class="eucBigLbl">distance (ft)</div>
    <div class="eucBigStat" id="eucOverDist">0</div>
    <div class="eucStatRow">
      <div><div class="eucBigLbl">best</div><div style="font-size:18px;font-weight:700;color:#cdd9e1" id="eucBest">0</div></div>
      <div><div class="eucBigLbl">top speed</div><div style="font-size:18px;font-weight:700;color:#cdd9e1" id="eucTopSpd">0 mph</div></div>
    </div>
    <button class="eucBtn" id="eucRetryBtn" type="button">RIDE AGAIN</button>
  </div>

  <!-- MEDAL SCREEN -->
  <div class="eucOverlay eucHide" id="eucMedal">
    <div id="eucMedalAward">🥉</div>
    <div id="eucMedalName" style="color:#cd7f32">BRONZE</div>
    <div style="font-size:13px;color:#8fa3b3;margin:4px 0 16px">You completed all three zones!</div>
    <div class="eucBigLbl">final score</div>
    <div class="eucBigStat" id="eucMedalScore">0</div>
    <div class="eucStatRow">
      <div><div class="eucBigLbl">distance</div><div style="font-size:18px;font-weight:700;color:#cdd9e1" id="eucMedalDist">0 ft</div></div>
      <div><div class="eucBigLbl">coins</div><div style="font-size:18px;font-weight:700;color:#ffd700" id="eucMedalCoins">0</div></div>
    </div>
    <button class="eucBtn" id="eucMedalRetry" type="button">RIDE AGAIN</button>
  </div>

  <!-- PAUSE -->
  <div class="eucOverlay eucHide" id="eucPause">
    <div class="eucLogo" style="font-size:24px">PAUSED</div>
    <button class="eucBtn" id="eucResumeBtn" type="button" style="margin-top:16px">RESUME</button>
  </div>
</div>`;

    window.__eucDriftRunGame();
};

window.__eucDriftRunGame = function() {
    // ─── Canvas setup ────────────────────────────────────────────────
    const root   = document.getElementById("eucRoot");
    const canvas = document.getElementById("eucCanvas");
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    let W=0, H=0, DPR=1, destroyed=false;

    function resize() {
        if (destroyed) return;
        DPR = Math.min(window.devicePixelRatio||1, 2);
        const r = root.getBoundingClientRect();
        W = Math.max(280, r.width);
        H = Math.max(420, r.height);
        canvas.width  = W*DPR; canvas.height = H*DPR;
        canvas.style.width  = W+"px"; canvas.style.height = H+"px";
        ctx.setTransform(DPR,0,0,DPR,0,0);
    }
    let ro = null;
    if (typeof ResizeObserver!=="undefined") { ro=new ResizeObserver(resize); ro.observe(root); }
    window.addEventListener("resize", resize);
    resize();

    // ─── Helpers ─────────────────────────────────────────────────────
    const cleanups = [];
    function on(el, ev, fn, opts) { el.addEventListener(ev,fn,opts); cleanups.push(()=>el.removeEventListener(ev,fn,opts)); }
    function ls(k,fb) { try{return localStorage.getItem(k)||fb}catch{return fb} }
    function lsSet(k,v) { try{localStorage.setItem(k,v)}catch{} }

    // ─── Constants ───────────────────────────────────────────────────
    const LANE_TOP=0, LANE_BOTTOM=1;
    const ZONE_LEN=700;
    const ZONES=["city","countryside","track"];
    const WHEEL_R=24, RIDER_H=118;
    const JUMP_G=1900;
    const LAND_MPH_MIN=30;
    const BRAKE=1.35;
    const MAX_REV=-0.60;       // ~30 mph reverse
    const STILL_FALL=2.0;      // seconds standing still → fall

    // Hills
    const HILL_PERIOD=700, HILL_OFFSET=380, HILL_CLIMB=130, HILL_CREST=40, HILL_DESC=150;
    const HILL_UP=0.35, HILL_DOWN=0.85;

    // Battery
    const BATT_WARN=0.25;      // warning threshold
    // Medals
    const MEDAL_BRONZE=2500, MEDAL_SILVER=5000, MEDAL_GOLD=9000;

    // ─── Color palette ───────────────────────────────────────────────
    const PALETTE=["#ee1c25","#a020f0","#ff6a00","#ffe600","#0074ff","#00c200","#ffffff","#111111"];
    let riderColor = ls("eucdrift_color", PALETTE[0]);
    if (!PALETTE.includes(riderColor)) riderColor=PALETTE[0];

    // ─── State ───────────────────────────────────────────────────────
    const ST = {MENU:"menu",PLAY:"play",PAUSE:"pause",CRASH:"crash",OVER:"over",MEDAL:"medal"};
    let state=ST.MENU, lastTime=0, raf=null;

    const game = {
        dist:0, speedNorm:0, baseScroll:320,
        best: parseInt(ls("eucdrift_best","0"))||0,
        topSpeed:0, zoneIdx:0,
        coins:0, score:0,
        batt:1.0,
        lives:3, cpZone:0, cpDist:0,
        zonesFinished:0,
        finishWorldX:-1, finishCrossed:false, finishFlash:0,
        nextCoinAt:600,
    };

    const input = { sliderT:0, leanLeft:false, leanRight:false };

    const rider = {
        x:0, lane:LANE_BOTTOM, laneT:1, targetLaneT:1,
        y:0, vy:0, airborne:false,
        lean:0, targetLean:0, wheelAngle:0, wobble:0,
        sitT:0, tricks:[], trickTimer:0,
        trickFlashLbl:"", trickFlashT:0,
        hitFlash:0, crashed:false, crashTimer:0, crashReason:"",
        stationaryT:0, onRamp:null,
        cutoutFlying:false, cutoutTimer:0,
        // Pre-load jump
        jumpHeld:false, jumpCharge:0,  // 0..1, builds while button held
        jumpReady:false,               // true once charge >= threshold

        overheatWarning:false, beepFlash:0,
        landingOutcome:null,
    };

    const world = { scrollX:0 };
    const obstacles=[], coins=[];
    let nextObstAt=1400, obstIdSeq=0;

    // ─── Hill math ───────────────────────────────────────────────────
    function hillSlope(d) {
        const pos = ((d%HILL_PERIOD)+HILL_PERIOD)%HILL_PERIOD;
        const cs=HILL_OFFSET, ce=cs+HILL_CLIMB, cr=ce+HILL_CREST, de=cr+HILL_DESC;
        if (pos<cs||pos>=de) return 0;
        if (pos<ce) return Math.sin((pos-cs)/HILL_CLIMB*Math.PI);
        if (pos<cr) return 0;
        return -Math.sin((pos-cr)/HILL_DESC*Math.PI);
    }

    // ─── Layout helpers ──────────────────────────────────────────────
    function groundY() { return H*0.52; }
    function laneOffset(t) { return (t-0.5)*Math.max(54,H*0.16); }
    function riderGY() { return groundY()+laneOffset(rider.laneT)+rider.y; }
    function rScale() { return Math.min(1.25,Math.max(0.85,H/700))*1.4; }
    function obLaneY(o) {
        const t = o.lane===LANE_TOP?0:1;
        return groundY()+laneOffset(t);
    }
    function obScreenX(o) { return o.x-world.scrollX; }

    // ─── Input setup ────────────────────────────────────────────────
    function triggerDodge(dir) {
        if (state!==ST.PLAY||rider.crashed) return;
        const nl = dir>0?LANE_TOP:LANE_BOTTOM;
        if (nl===rider.lane) return;
        rider.lane=nl; rider.targetLaneT=nl===LANE_TOP?0:1;
    }

    // ── 2D Joystick — right thumb handles both speed and lane dodge ──
    // Horizontal axis: speed (center=0, right=forward, left=reverse)
    // Vertical axis: dodge trigger (fire once when crossing ±40% threshold,
    //   re-arms only after returning within 20% of vertical center)
    const joyTrack = document.getElementById("eucJoyTrack");
    const joyPuck  = document.getElementById("eucJoyPuck");
    const JOY_HRANGE = 56;   // px horizontal travel each side
    const JOY_VRANGE = 44;   // px vertical travel each side
    const H_DZ = 0.08;       // horizontal deadzone
    const V_FIRE = 0.40;     // vertical fraction to fire a dodge
    const V_REARM = 0.20;    // vertical fraction to re-arm for next dodge

    let joyDown = false;
    let joyDodgeArmed = true; // ready to fire a dodge

    function updatePuck(tx, ty) {
        // tx, ty both -1..+1
        const px = tx * JOY_HRANGE;
        const py = ty * JOY_VRANGE;
        joyPuck.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
        const fwd = tx >  H_DZ;
        const rev = tx < -H_DZ;
        const up  = ty < -V_FIRE;
        const dn  = ty >  V_FIRE;
        joyPuck.classList.toggle("fwd", fwd && !up && !dn);
        joyPuck.classList.toggle("rev", rev && !up && !dn);
        joyPuck.classList.toggle("up",  up);
        joyPuck.classList.toggle("dn",  dn);
    }

    function joySet(clientX, clientY) {
        if (!joyTrack) return;
        const r = joyTrack.getBoundingClientRect();
        const cx = r.left + r.width  / 2;
        const cy = r.top  + r.height / 2;
        const tx = Math.max(-1, Math.min(1, (clientX - cx) / JOY_HRANGE));
        const ty = Math.max(-1, Math.min(1, (clientY - cy) / JOY_VRANGE));

        // Horizontal → speed
        input.sliderT   = tx;
        input.leanLeft  = tx < -H_DZ;
        input.leanRight = tx >  H_DZ;

        // Vertical → dodge (fires once per gesture, re-arms at center)
        if (joyDodgeArmed) {
            if (ty < -V_FIRE) {
                triggerDodge(1);       // push up = dodge to top lane
                joyDodgeArmed = false;
            } else if (ty > V_FIRE) {
                triggerDodge(-1);      // push down = dodge to bottom lane
                joyDodgeArmed = false;
            }
        } else if (Math.abs(ty) < V_REARM) {
            joyDodgeArmed = true;      // returned near center — ready to fire again
        }

        updatePuck(tx, ty);
    }

    function joyRelease() {
        joyDown = false;
        joyDodgeArmed = true;
        input.sliderT = 0; input.leanLeft = false; input.leanRight = false;
        joyPuck.style.transition = "transform .18s cubic-bezier(.34,1.56,.64,1)";
        updatePuck(0, 0);
        setTimeout(() => { if (joyPuck) joyPuck.style.transition = ""; }, 220);
    }

    if (joyTrack) {
        on(joyTrack, "touchstart",  e => { e.preventDefault(); joyDown = true; joySet(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
        on(joyTrack, "touchmove",   e => { e.preventDefault(); if (joyDown) joySet(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
        on(joyTrack, "touchend",    e => { e.preventDefault(); joyRelease(); }, { passive: false });
        on(joyTrack, "touchcancel", e => { e.preventDefault(); joyRelease(); }, { passive: false });
        on(joyTrack, "mousedown",   e => { joyDown = true;  joySet(e.clientX, e.clientY); });
        on(window,   "mousemove",   e => { if (joyDown) joySet(e.clientX, e.clientY); });
        on(window,   "mouseup",     () => { if (joyDown) joyRelease(); });
    }

    // ── Jump button — left thumb, pre-load mechanic ──────────────────
    // Hold to compress (charge builds over ~0.5s), release to spring.
    // The longer you hold, the higher you jump. Short tap = barely any air.
    const JUMP_CHARGE_TIME = 0.5;  // seconds to reach full charge
    const JUMP_MIN_CHARGE  = 0.25; // minimum charge fraction to get any real air
    const jumpBtn = document.getElementById("eucJumpBtn");
    const jumpProg = document.getElementById("eucJumpProgress");
    const jumpLbl  = document.getElementById("eucJumpLbl");
    const jumpIcon = document.getElementById("eucJumpIcon");
    const DASHLEN  = 188.5; // circumference of the SVG progress ring

    function jumpStart() {
        if (state !== ST.PLAY || rider.crashed || rider.airborne) return;
        rider.jumpHeld = true;
        if (jumpBtn) jumpBtn.classList.add("loading");
    }

    function jumpRelease() {
        if (!rider.jumpHeld) return;
        rider.jumpHeld = false;
        const charge = rider.jumpCharge;
        rider.jumpCharge = 0; rider.jumpReady = false;
        if (jumpBtn) { jumpBtn.classList.remove("loading","ready"); }
        if (jumpProg) jumpProg.style.strokeDashoffset = DASHLEN;
        if (jumpLbl)  jumpLbl.textContent = "HOLD";
        if (jumpIcon) jumpIcon.textContent = "↑";

        if (state !== ST.PLAY || rider.crashed || rider.airborne) return;
        if (charge >= JUMP_MIN_CHARGE) {
            // Launch — height proportional to charge, compressed squat snaps upward
            rider.airborne = true; rider.y = 0; rider.tricks = [];
            rider.landingOutcome = "clean";
            const power = Math.min(1, charge); // 0..1
            rider.vy = -(600 + power * 900);  // gentle hop to full EUC hop
            if (navigator.vibrate) navigator.vibrate(30);
        }
    }

    if (jumpBtn) {
        on(jumpBtn, "touchstart",  e => { e.preventDefault(); jumpStart(); },  { passive: false });
        on(jumpBtn, "touchend",    e => { e.preventDefault(); jumpRelease(); }, { passive: false });
        on(jumpBtn, "touchcancel", e => { e.preventDefault(); jumpRelease(); }, { passive: false });
        on(jumpBtn, "mousedown",   () => jumpStart());
        on(jumpBtn, "mouseup",     () => jumpRelease());
        on(jumpBtn, "mouseleave",  () => jumpRelease());
    }

    // Keyboard: hold Space to pre-load, release to jump
    on(window, "keydown", e => {
        if (e.code === "Space" && !e.repeat) jumpStart();
    });
    on(window, "keyup", e => {
        if (e.code === "Space") jumpRelease();
    });

    function updateJumpCharge(dt) {
        if (!rider.jumpHeld || rider.airborne || rider.crashed) return;
        rider.jumpCharge = Math.min(1, rider.jumpCharge + dt / JUMP_CHARGE_TIME);
        const wasReady = rider.jumpReady;
        rider.jumpReady = rider.jumpCharge >= 1.0;

        // Update ring
        if (jumpProg) {
            const offset = DASHLEN * (1 - rider.jumpCharge);
            jumpProg.style.strokeDashoffset = offset;
        }
        // Button visual
        if (jumpBtn) {
            if (rider.jumpReady) {
                jumpBtn.classList.add("ready");
                if (!wasReady && jumpIcon) jumpIcon.textContent = "🔥";
            }
        }
        if (jumpLbl) {
            jumpLbl.textContent = rider.jumpReady ? "RELEASE!" : Math.round(rider.jumpCharge*100)+"%";
        }
    }

    // Keyboard
    on(window,"keydown",e=>{
        if(e.repeat)return;
        if(e.code==="ArrowRight"||e.code==="KeyD"){input.sliderT=1;input.leanRight=true;updatePuck(1);}
        if(e.code==="ArrowLeft"||e.code==="KeyA"){input.sliderT=-1;input.leanLeft=true;updatePuck(-1);}
        if(e.code==="ArrowUp"||e.code==="KeyW") triggerDodge(1);
        if(e.code==="ArrowDown"||e.code==="KeyS") triggerDodge(-1);
    });
    on(window,"keyup",e=>{
        if(e.code==="ArrowRight"||e.code==="KeyD"){if(!input.leanLeft){input.sliderT=0;updatePuck(0);}input.leanRight=false;}
        if(e.code==="ArrowLeft"||e.code==="KeyA"){if(!input.leanRight){input.sliderT=0;updatePuck(0);}input.leanLeft=false;}
    });

    // ─── Color swatches ─────────────────────────────────────────────
    (function(){
        const w=document.getElementById("eucSwatches"); if(!w)return;
        w.innerHTML=PALETTE.map(h=>`<button class="eucSwatch" type="button" data-c="${h}" style="background:${h}"></button>`).join("");
        w.querySelectorAll(".eucSwatch").forEach(sw=>{
            on(sw,"click",e=>{e.preventDefault();riderColor=sw.dataset.c;lsSet("eucdrift_color",riderColor);refreshSwatches();});
        });
        refreshSwatches();
    })();
    function refreshSwatches(){
        document.querySelectorAll(".eucSwatch").forEach(s=>s.classList.toggle("sel",s.dataset.c===riderColor));
    }

    // ─── Background layers ──────────────────────────────────────────
    function mkLayer(rng,gen){ return {pieces:[],cursor:0,rng,gen}; }
    const cityFar  = mkLayer([50,90], (x,w)=>({x,w,h:100+Math.random()*200,hue:205+Math.random()*25}));
    const cityMid  = mkLayer([40,70], (x,w)=>({x,w,h:90+Math.random()*170,win:Math.random()>.15}));
    const cityNear = mkLayer([30,55], (x,w)=>({x,w,h:70+Math.random()*230,win:Math.random()>.1,ant:Math.random()>.7}));
    const hillsFar = mkLayer([200,320],(x,w)=>({x,w,h:60+Math.random()*70}));
    const treesMid = mkLayer([34,56], (x,w)=>({x,w,h:80+Math.random()*70,t:Math.random()>.5?"round":"tall"}));
    const treesNear= mkLayer([22,38], (x,w)=>({x,w,h:60+Math.random()*90,t:Math.random()<.45?"round":Math.random()<.8?"tall":"stick"}));
    const stadFar  = mkLayer([70,110],(x,w)=>({x,w,h:70+Math.random()*60}));
    const crowd    = mkLayer([26,40], (x,w)=>({x,w,seed:Math.random()}));
    const pylons   = mkLayer([90,140],(x,w)=>({x,w,stripe:Math.random()>.5}));
    const allLayers=[cityFar,cityMid,cityNear,hillsFar,treesMid,treesNear,stadFar,crowd,pylons];

    function ensureLayer(lay,par){
        while(lay.cursor<world.scrollX*par+W+400){
            const w=lay.rng[0]+Math.random()*(lay.rng[1]-lay.rng[0]);
            lay.pieces.push(lay.gen(lay.cursor,w)); lay.cursor+=w;
        }
        const buf=Math.max(W*3,1800);
        while(lay.pieces.length&&(lay.pieces[0].x+lay.pieces[0].w)<world.scrollX*par-buf) lay.pieces.shift();
    }
    function resetLayers(){ allLayers.forEach(l=>{l.pieces.length=0;l.cursor=0;}); }

    function zoneSky(z){
        return z==="city"?["#1b2838","#2c4156"]:z==="countryside"?["#2b3a4f","#5a7a8c"]:["#221b30","#3d2f55"];
    }
    function currentZone(){ return ZONES[game.zoneIdx%ZONES.length]; }

    function drawBackground(){
        const zone=currentZone();
        const [st,sb]=zoneSky(zone);
        const g=ctx.createLinearGradient(0,0,0,groundY());
        g.addColorStop(0,st); g.addColorStop(1,sb);
        ctx.fillStyle=g; ctx.fillRect(0,0,W,groundY());

        if(zone==="track"){
            ctx.fillStyle="rgba(255,255,255,.5)";
            for(let i=0;i<28;i++){ctx.fillRect((i*137+world.scrollX*.02)%W,(i*53)%(groundY()*.6),1.5,1.5);}
        }

        if(zone==="city") drawCity();
        else if(zone==="countryside") drawCountry();
        else drawTrack();

        // Road band
        const sp=Math.max(54,H*.16);
        const bandTop=groundY()-sp*.5-26, bandH=sp+52, bandMid=bandTop+bandH/2;

        ctx.fillStyle=zone==="track"?"#191220":zone==="countryside"?"#2e3a28":"#15191d";
        ctx.fillRect(0,bandTop+bandH,W,H-(bandTop+bandH));

        ctx.fillStyle=zone==="track"?"#2a2138":"#21262b";
        ctx.fillRect(0,bandTop,W,bandH);

        ctx.fillStyle=zone==="track"?"#caa6ff":"#7a8a92";
        ctx.fillRect(0,bandTop,W,3); ctx.fillRect(0,bandTop+bandH-3,W,3);

        ctx.fillStyle=zone==="track"?"#ffd86a":"#e8c34a";
        const dw=30,gw=20,per=dw+gw, off=world.scrollX%per;
        for(let x=-off;x<W;x+=per) ctx.fillRect(x,bandMid-2,dw,4);

        // Hill tint
        const sl=hillSlope(game.dist);
        if(sl>0.02){ctx.fillStyle=`rgba(255,170,60,${Math.min(.22,sl*.26)})`;ctx.fillRect(0,bandTop,W,bandH);}
        else if(sl<-.02){ctx.fillStyle=`rgba(80,160,255,${Math.min(.22,-sl*.26)})`;ctx.fillRect(0,bandTop,W,bandH);}
    }

    function drawCity(){
        ensureLayer(cityFar,.18); ensureLayer(cityMid,.4); ensureLayer(cityNear,.65);
        cityFar.pieces.forEach(p=>{
            const sx=p.x-world.scrollX*.18; if(sx>W+20||sx+p.w<-20)return;
            ctx.fillStyle=`hsl(${p.hue},20%,16%)`; ctx.fillRect(sx,groundY()-p.h,p.w-2,p.h);
        });
        cityMid.pieces.forEach(p=>{
            const sx=p.x-world.scrollX*.4; if(sx>W+20||sx+p.w<-20)return;
            ctx.fillStyle="#283c4f"; ctx.fillRect(sx,groundY()-p.h,p.w-3,p.h);
            if(p.win){
                ctx.fillStyle="rgba(255,214,130,.4)";
                const cols=Math.max(1,Math.floor((p.w-3)/10)), rows=Math.max(1,Math.floor(p.h/14));
                for(let c=0;c<cols;c++) for(let r=0;r<rows;r++){
                    if((c*7+r*13+Math.floor(p.x))%4===0)continue;
                    ctx.fillRect(sx+3+c*10,groundY()-p.h+6+r*14,4,6);
                }
            }
        });
        cityNear.pieces.forEach(p=>{
            const sx=p.x-world.scrollX*.65; if(sx>W+20||sx+p.w<-20)return;
            const top=groundY()-p.h;
            ctx.fillStyle="#2e4257"; ctx.fillRect(sx,top,p.w-4,p.h);
            if(p.ant){
                ctx.strokeStyle="#2e4257"; ctx.lineWidth=2;
                ctx.beginPath(); ctx.moveTo(sx+(p.w-4)/2,top); ctx.lineTo(sx+(p.w-4)/2,top-16); ctx.stroke();
                ctx.fillStyle="#ff5a5a"; ctx.beginPath(); ctx.arc(sx+(p.w-4)/2,top-16,2,0,Math.PI*2); ctx.fill();
            }
            if(p.win){
                ctx.fillStyle="rgba(255,214,130,.55)";
                const cols=Math.max(1,Math.floor((p.w-4)/11)), rows=Math.max(1,Math.floor(p.h/16));
                for(let c=0;c<cols;c++) for(let r=0;r<rows;r++){
                    if((c*5+r*11+Math.floor(p.x))%5===0)continue;
                    ctx.fillRect(sx+4+c*11,top+7+r*16,5,7);
                }
            }
        });
    }

    function drawCountry(){
        ensureLayer(hillsFar,.2); ensureLayer(treesMid,.38); ensureLayer(treesNear,.58);
        hillsFar.pieces.forEach(p=>{
            const sx=p.x-world.scrollX*.2; if(sx>W+200||sx+p.w<-200)return;
            ctx.fillStyle="#3a5a45"; ctx.beginPath();
            ctx.moveTo(sx,groundY()); ctx.quadraticCurveTo(sx+p.w/2,groundY()-p.h,sx+p.w,groundY());
            ctx.closePath(); ctx.fill();
        });
        function dTree(sx,w,h,t,lc,tc){
            const by=groundY();
            ctx.strokeStyle=tc; ctx.lineWidth=Math.max(3,w*.12); ctx.lineCap="round";
            ctx.beginPath(); ctx.moveTo(sx+w/2,by); ctx.lineTo(sx+w/2,by-h*.45); ctx.stroke();
            ctx.fillStyle=lc;
            if(t==="round"){ctx.beginPath();ctx.arc(sx+w/2,by-h*.6,h*.32,0,Math.PI*2);ctx.fill();}
            else if(t==="tall"){ctx.beginPath();ctx.moveTo(sx+w/2,by-h);ctx.lineTo(sx+w/2-h*.18,by-h*.4);ctx.lineTo(sx+w/2+h*.18,by-h*.4);ctx.closePath();ctx.fill();}
            else{ctx.strokeStyle=tc;ctx.lineWidth=Math.max(2,w*.08);ctx.beginPath();ctx.moveTo(sx+w/2,by-h*.45);ctx.lineTo(sx+w/2,by-h*.85);ctx.moveTo(sx+w/2,by-h*.65);ctx.lineTo(sx+w/2-w*.4,by-h*.8);ctx.moveTo(sx+w/2,by-h*.75);ctx.lineTo(sx+w/2+w*.4,by-h*.9);ctx.stroke();}
        }
        treesMid.pieces.forEach(p=>{const sx=p.x-world.scrollX*.38;if(sx>W+20||sx+p.w<-20)return;dTree(sx,p.w,p.h,p.t,"#3c5c38","#33291f");});
        treesNear.pieces.forEach(p=>{const sx=p.x-world.scrollX*.58;if(sx>W+20||sx+p.w<-20)return;dTree(sx,p.w,p.h,p.t,"#456b3e","#3f3327");});
    }

    function drawTrack(){
        ensureLayer(stadFar,.22); ensureLayer(crowd,.42); ensureLayer(pylons,.55);
        stadFar.pieces.forEach(p=>{
            const sx=p.x-world.scrollX*.22; if(sx>W+20||sx+p.w<-20)return;
            const top=groundY()-p.h;
            ctx.fillStyle="#2a2040"; ctx.fillRect(sx,top,p.w-3,p.h);
            ctx.fillStyle="#3d2f55"; ctx.fillRect(sx,top,p.w-3,6);
        });
        crowd.pieces.forEach(p=>{
            const sx=p.x-world.scrollX*.42; if(sx>W+20||sx+p.w<-20)return;
            const bt=groundY()-86, bh=40;
            ctx.fillStyle="#352a4a"; ctx.fillRect(sx,bt,p.w,bh);
            const hues=[355,40,200,95,280,0], cols=Math.max(2,Math.floor(p.w/7));
            for(let cy=0;cy<3;cy++) for(let cx=0;cx<cols;cx++){
                const seed=(cx*13+cy*7+p.seed*1000)%11; if(seed<2)continue;
                ctx.fillStyle=`hsl(${hues[Math.floor(seed)%6]},55%,${45+cy*6}%)`;
                ctx.beginPath(); ctx.arc(sx+4+cx*7,bt+8+cy*11,2.6,0,Math.PI*2); ctx.fill();
            }
        });
        pylons.pieces.forEach(p=>{
            const sx=p.x-world.scrollX*.55; if(sx>W+20||sx+p.w<-20)return;
            ctx.fillStyle=p.stripe?"#5a3d7a":"#41305c"; ctx.fillRect(sx,groundY()-70,8,70);
            ctx.fillStyle="#caa6ff"; ctx.fillRect(sx,groundY()-70,8,6);
        });
        ctx.fillStyle="rgba(120,80,200,.18)"; ctx.fillRect(0,groundY()-110,W,40);
    }

    // ─── Obstacles ──────────────────────────────────────────────────
    const ODEFS={ crate:{w:44,h:44}, cone:{w:26,h:40}, ramp:{w:92,h:46}, rock:{w:28,h:18} };

    function spawnObst(){
        const isTrack=currentZone()==="track";
        if(isTrack) return; // track bonus = no obstacles

        const earlyGame=game.dist<400;
        const r=Math.random();
        let type;
        if(r<0.42) type="crate";
        else if(r<0.62) type="cone";
        else if(r<0.76&&!earlyGame) type="paired";
        else type="ramp";

        const zone=currentZone();
        const spX=world.scrollX+W+80;

        if(type==="paired"){
            const crateTop=Math.random()<.5;
            obstacles.push({id:obstIdSeq++,type:"crate",variant:crateVariant(zone),x:spX,w:ODEFS.crate.w,h:ODEFS.crate.h,lane:crateTop?LANE_TOP:LANE_BOTTOM,triggered:false});
            obstacles.push({id:obstIdSeq++,type:"cone",variant:"cone",x:spX,w:ODEFS.cone.w,h:ODEFS.cone.h,lane:crateTop?LANE_BOTTOM:LANE_TOP,triggered:false});
            obstacles.push({id:obstIdSeq++,type:"ramp",variant:rampVariant(zone),x:spX-190,w:ODEFS.ramp.w,h:ODEFS.ramp.h,lane:Math.random()<.5?LANE_TOP:LANE_BOTTOM,triggered:false});
            return;
        }
        if(type==="ramp"){
            obstacles.push({id:obstIdSeq++,type:"ramp",variant:rampVariant(zone),x:spX,w:ODEFS.ramp.w,h:ODEFS.ramp.h,lane:Math.random()<.5?LANE_TOP:LANE_BOTTOM,triggered:false});
            return;
        }
        const def=type==="crate"?ODEFS.crate:ODEFS.cone;
        const lane=Math.random()<.5?LANE_TOP:LANE_BOTTOM;
        obstacles.push({id:obstIdSeq++,type,variant:type==="crate"?crateVariant(zone):"cone",x:spX,w:def.w,h:def.h,lane,triggered:false});
        // 60% chance: place a jump rock in the same lane ~120px before the obstacle
        // so the player can see it coming and pre-load their jump in time
        if(Math.random()<0.6){
            obstacles.push({id:obstIdSeq++,type:"rock",variant:"rock",x:spX-120,w:ODEFS.rock.w,h:ODEFS.rock.h,lane,triggered:false,linkedObst:spX});
        }
    }
    function crateVariant(z){ return z==="city"?"trash":z==="countryside"?Math.random()<.5?"rock":"twigs":"tires"; }
    function rampVariant(z){ return z==="countryside"?"dirt":"ramp"; }

    function updateObst(dt){
        const isTrack=currentZone()==="track";
        if(!isTrack){
            const mg=Math.max(400,900-game.dist*.06), xg=Math.max(580,1200-game.dist*.08);
            if(world.scrollX+W>nextObstAt){ spawnObst(); nextObstAt=world.scrollX+W+mg+Math.random()*(xg-mg); }
        }
        const prune=Math.max(W*3,1800);
        for(let i=obstacles.length-1;i>=0;i--){ if(obstacles[i].x+obstacles[i].w<world.scrollX-prune) obstacles.splice(i,1); }

        // Ramp riding
        if(!rider.airborne&&!rider.crashed){
            let onRamp=false;
            for(const o of obstacles){
                if(o.type!=="ramp"||o.triggered) continue;
                if(o.lane!==rider.lane) continue;
                const sx=obScreenX(o);
                if(sx<=rider.x&&sx+o.w>rider.x){
                    onRamp=true; rider.onRamp=o;
                    const t=Math.max(0,Math.min(1,(rider.x-sx)/o.w));
                    rider.y=-(t*o.h);
                } else if(rider.onRamp===o&&rider.x>=sx+o.w){
                    o.triggered=true; rider.onRamp=null; launchRamp(o);
                }
            }
            if(!onRamp){ rider.onRamp=null; if(!rider.airborne) rider.y=0; }
        }
    }

    function launchRamp(o){
        if(rider.airborne||rider.crashed) return;
        const mph=game.speedNorm*50;
        rider.y=-o.h; rider.airborne=true; rider.onRamp=null; rider.tricks=[];
        rider.landingOutcome=mph<LAND_MPH_MIN?"tooSlow":"clean";
        const sf=Math.min(1.4,game.speedNorm/.6);
        rider.vy=-(180+sf*200);
    }

    // ─── Coins ──────────────────────────────────────────────────────
    function spawnCoinGroup(){
        const zone=currentZone(), spX=world.scrollX+W+100;
        const lane=Math.random()<.5?LANE_TOP:LANE_BOTTOM;
        const count=5+Math.floor(Math.random()*4), spacing=55;
        const pat=Math.random();

        // Bonus: arc of coins off any recent ramp peaks
        for(let i=0;i<count;i++){
            let cl=lane;
            if(pat>.6) cl=i%2===0?LANE_TOP:LANE_BOTTOM;
            else if(pat>.3) cl=Math.random()<.5?LANE_TOP:LANE_BOTTOM;
            coins.push({x:spX+i*spacing,lane:cl,collected:false,bobT:Math.random()*Math.PI*2});
        }
    }

    function spawnRampCoins(o){
        // Arc of coins launches off ramp peak
        for(let i=0;i<5;i++){
            coins.push({
                x: o.x+o.w+20+i*45,
                lane: o.lane,
                collected:false, bobT:Math.random()*Math.PI*2,
                airY: -(o.h*(1-i*.18)), // visual height above lane ground
            });
        }
    }

    function updateCoins(dt){
        if(world.scrollX+W>game.nextCoinAt){
            spawnCoinGroup();
            game.nextCoinAt=world.scrollX+W+350+Math.random()*250;
        }
        const prune=world.scrollX-W*2;
        for(let i=coins.length-1;i>=0;i--) if(coins[i].x<prune) coins.splice(i,1);
        coins.forEach(c=>{c.bobT+=dt*3.2; if(c.airY) c.airY=Math.max(0,c.airY-40*dt);});

        if(!rider.crashed){
            const rl=rider.lane;
            coins.forEach(c=>{
                if(c.collected) return;
                if(c.lane!==rl) return;
                const sx=c.x-world.scrollX;
                if(Math.abs(sx-rider.x)<30){ c.collected=true; game.coins++; game.dist+=2; }
            });
        }
    }

    function drawCoins(){
        const zc = currentZone()==="city"?{f:"#ffd700",r:"#ffaa00",s:"rgba(255,255,220,.8)"}:
                   currentZone()==="countryside"?{f:"#7ec850",r:"#5a9e38",s:"rgba(200,255,180,.7)"}:
                   {f:"#c084ff",r:"#8040cc",s:"rgba(220,180,255,.8)"};
        const CR=9;
        coins.forEach(c=>{
            if(c.collected) return;
            const sx=c.x-world.scrollX; if(sx>W+20||sx<-20)return;
            const gy=groundY()+laneOffset(c.lane===LANE_TOP?0:1);
            const bob=Math.sin(c.bobT)*4;
            const cy=gy-CR*2.4+bob-(c.airY||0);
            ctx.beginPath(); ctx.arc(sx,cy,CR,0,Math.PI*2);
            ctx.fillStyle=zc.f; ctx.fill();
            ctx.strokeStyle=zc.r; ctx.lineWidth=2; ctx.stroke();
            ctx.beginPath(); ctx.arc(sx-2.5,cy-2.5,CR*.38,0,Math.PI*2);
            ctx.fillStyle=zc.s; ctx.fill();
            ctx.fillStyle=zc.r;
            ctx.font=`bold ${Math.round(CR*1.1)}px -apple-system,sans-serif`;
            ctx.textAlign="center"; ctx.textBaseline="middle";
            ctx.fillText("$",sx,cy+1); ctx.textBaseline="alphabetic";
        });
    }

    // ─── Finish lines ───────────────────────────────────────────────
    const FINISH_OFFSET=680;
    function updateFinish(dt){
        if(game.finishFlash>0) game.finishFlash-=dt;
        const posInZone=game.dist%ZONE_LEN;
        const zoneStart=Math.floor(game.dist/ZONE_LEN)*ZONE_LEN;

        if(posInZone>FINISH_OFFSET-200&&!game.finishCrossed){
            if(game.finishWorldX<zoneStart)
                game.finishWorldX=(zoneStart+FINISH_OFFSET)/(game.baseScroll*.06);
        }
        if(posInZone<50&&game.finishCrossed){ game.finishCrossed=false; game.finishWorldX=-1; }

        if(!game.finishCrossed&&game.finishWorldX>0){
            const fsx=game.finishWorldX-world.scrollX;
            if(fsx<rider.x&&!rider.crashed){
                game.finishCrossed=true; game.zonesFinished++;
                game.finishFlash=2.2;
                const bonus=50*game.zonesFinished;
                game.coins+=bonus; game.dist+=bonus*.5;
                if(game.zoneIdx>game.cpZone){ game.cpZone=game.zoneIdx; game.cpDist=game.zoneIdx*ZONE_LEN; }

                // If this was the track finish (3rd zone completed) → medal!
                if(game.zoneIdx===2&&game.zonesFinished>=3){
                    setTimeout(()=>{ if(!destroyed) showMedal(); },2000);
                }
            }
        }
    }

    function drawFinish(){
        if(game.finishWorldX<0) return;
        const sx=game.finishWorldX-world.scrollX; if(sx>W+60||sx<-60)return;
        const sp=Math.max(54,H*.16), bandTop=groundY()-sp*.5-26, bandH=sp+52;
        const sq=14, cols=Math.ceil(bandH/sq);
        for(let i=0;i<cols;i++){
            ctx.fillStyle=i%2===0?"#ffffff":"#000000"; ctx.fillRect(sx-sq,bandTop+i*sq,sq,sq);
            ctx.fillStyle=i%2===0?"#000000":"#ffffff"; ctx.fillRect(sx,bandTop+i*sq,sq,sq);
        }
        ctx.fillStyle="#aaa"; ctx.fillRect(sx-sq-4,bandTop-20,4,bandH+20); ctx.fillRect(sx+sq,bandTop-20,4,bandH+20);
        ctx.fillStyle="#ff3366"; ctx.fillRect(sx-sq-4,bandTop-20,sq*2+8,10);
    }

    function drawFinishFlash(){
        if(game.finishFlash<=0) return;
        const a=Math.min(1,game.finishFlash)*.3;
        ctx.fillStyle=`rgba(255,215,0,${a})`; ctx.fillRect(0,0,W,H);
        if(game.finishFlash>1.2){
            const fa=(game.finishFlash-1.2)*.8;
            ctx.fillStyle=`rgba(255,255,255,${fa})`;
            ctx.font="bold 26px -apple-system,sans-serif"; ctx.textAlign="center";
            const zn=ZONES[(game.zoneIdx)%ZONES.length]; const zl=zn[0].toUpperCase()+zn.slice(1);
            ctx.fillText(`✓ ${zl} Complete!`,W/2,H/2-20);
            ctx.fillStyle=`rgba(255,215,0,${fa})`; ctx.font="bold 17px -apple-system,sans-serif";
            ctx.fillText(`+${50*game.zonesFinished} coins!`,W/2,H/2+14);
            ctx.textAlign="left";
        }
    }

    // ─── Near-miss ──────────────────────────────────────────────────
    let nearMissFlash=null;
    function checkNearMiss(){
        if(rider.airborne||rider.crashed) return;
        for(const o of obstacles){
            if(o.type==="ramp") continue;
            if(o.lane===rider.lane) continue;
            const sx=obScreenX(o);
            if(Math.abs(sx+o.w/2-rider.x)<55&&!o.nearMissed){
                o.nearMissed=true; nearMissFlash={t:1.2}; game.coins+=3; game.dist+=5;
            }
        }
    }

    // ─── Battery / Motor cutout ──────────────────────────────────────
    function updateBattery(dt){
        // Motor cutout works as a simple 10-second timer at near-max speed.
        // The moment you ease off, the timer resets completely to zero —
        // not a slow recharge, an instant full reset. Hit it again immediately
        // and you get another full 10 seconds. This means: warning appears
        // at 8 seconds, ease off for even a fraction of a second = 10 full
        // seconds again on your next push. No cumulative penalty.
        const CUTOUT_TIME = 10.0;  // seconds at max before cutout
        const WARN_TIME   = 8.0;   // seconds before warning appears
        const sf = Math.max(0, game.speedNorm / 1.3); // 0..1
        const atMaxSpeed = sf > 0.85; // only counts when near max throttle

        if(atMaxSpeed){
            game.batt = Math.max(0, game.batt - dt / CUTOUT_TIME);
        } else {
            // Any let-off = instant full reset
            game.batt = 1.0;
        }

        // Warning banner appears in the last 2 seconds before cutout
        rider.overheatWarning = game.batt < (1 - WARN_TIME/CUTOUT_TIME) && atMaxSpeed;
        if(rider.overheatWarning) rider.beepFlash = .3;
        else if(rider.beepFlash > 0) rider.beepFlash -= dt;

        // Cutout only fires at zero — and only if still at max speed
        if(game.batt <= 0 && !rider.crashed && !rider.cutoutFlying && atMaxSpeed){
            game.batt = 0;
            rider.cutoutFlying = true; rider.cutoutTimer = .5;
        }
    }

    // ─── Rider update ────────────────────────────────────────────────
    const TRICKS=["360 spin","tabletop","one-foot grab","superman lean","tailwhip"];

    function updateRider(dt){
        if(rider.crashed){ rider.crashTimer-=dt; rider.wheelAngle+=dt*2; return; }
        if(rider.cutoutFlying){
            rider.cutoutTimer-=dt; rider.wheelAngle+=dt*25;
            if(rider.cutoutTimer<=0){ rider.cutoutFlying=false; crashRider("cutout"); }
            return;
        }
        rider.lean+=(input.sliderT-rider.lean)*Math.min(1,dt*6);
        input.leanLeft=input.sliderT<-H_DZ; input.leanRight=input.sliderT>H_DZ;

        updateBattery(dt);

        rider.laneT+=(rider.targetLaneT-rider.laneT)*Math.min(1,dt*10);
        // Jump pre-load: charging compresses the rider into a crouch (sitT goes up)
        updateJumpCharge(dt);
        const jumpSitTarget = rider.jumpHeld ? rider.jumpCharge : 0;
        rider.sitT += (jumpSitTarget - rider.sitT) * Math.min(1, dt * 9);

        if(rider.airborne){
            rider.vy+=JUMP_G*dt; rider.y+=rider.vy*dt;
            rider.trickTimer=(rider.trickTimer||0)+dt;
            if(rider.trickTimer>.45){
                rider.trickTimer=0;
                const n=TRICKS[Math.floor(Math.random()*TRICKS.length)];
                rider.tricks.push({n,t:0}); rider.trickFlashLbl=n; rider.trickFlashT=.9;
                const b=30+rider.tricks.length*15; game.dist+=b*.06;
            }
            if(rider.y>=0){
                rider.y=0; rider.vy=0;
                if(rider.landingOutcome==="clean"){ rider.airborne=false; rider.tricks=[]; }
                else crashRider("tooSlow");
            }
        } else if(!rider.onRamp){
            rider.y=0;
        }

        if(rider.tricks.length) rider.tricks.forEach(t=>{t.t+=dt;});
        if(rider.trickFlashT>0) rider.trickFlashT-=dt;
        rider.wobble+=dt*5.2;
        rider.wheelAngle+=dt*(game.speedNorm*16+(game.speedNorm>=0?6:-6));
        if(rider.hitFlash>0) rider.hitFlash-=dt;
    }

    // ─── Crash / lives ───────────────────────────────────────────────
    function crashRider(reason){
        if(rider.crashed) return;
        rider.crashed=true; rider.crashReason=reason||"hit";
        rider.crashTimer=.9; rider.hitFlash=.6;
        if(navigator.vibrate) navigator.vibrate([80,40,120]);
        game.lives--;
        if(game.lives<=0) endGame(true);
        else endGame(false);
    }

    function endGame(isOver){
        state=ST.CRASH;
        const dist=Math.floor(game.dist);
        if(dist>game.best){ game.best=dist; lsSet("eucdrift_best",String(game.best)); }

        const cause={hit:"You hit an obstacle.",tooSlow:"Too slow off the ramp.",cutout:"Motor cutout — you pushed it too long!",fellOver:"You stood still too long and tipped over.",offRoad:""}[rider.crashReason]||"";
        const injury=isOver?"You broke your leg — you're done!":game.lives===2?"You broke your arm! Shake it off!":"You broke your wrist! Get back on!";

        document.getElementById("eucOverMsg").textContent=cause+" "+injury;
        document.getElementById("eucOverDist").textContent=dist;
        document.getElementById("eucBest").textContent=game.best;
        document.getElementById("eucTopSpd").textContent=game.topSpeed+" mph";
        document.getElementById("eucLivesOver").textContent="❤️".repeat(game.lives)+"🖤".repeat(3-game.lives);
        document.getElementById("eucRetryBtn").textContent=isOver?"RIDE AGAIN":"GET BACK ON";

        setTimeout(()=>{ if(destroyed)return; state=ST.OVER; document.getElementById("eucOver").classList.remove("eucHide"); },900);
    }

    function respawn(){
        game.dist=game.cpDist; world.scrollX=game.cpDist/(game.baseScroll*.06);
        game.speedNorm=0; game.zoneIdx=game.cpZone; game.trickScoreFlash=null; game.batt=1.0;
        obstacles.length=0; coins.length=0;
        nextObstAt=world.scrollX+W+1400; game.nextCoinAt=world.scrollX+W+300;
        resetLayers(); resetRider();
        rider.x=Math.min(110,W*.22); rider.y=0;
        document.getElementById("eucOver").classList.add("eucHide");
        state=ST.PLAY; lastTime=performance.now(); raf=requestAnimationFrame(loop);
    }

    function resetRider(){
        rider.lane=LANE_BOTTOM; rider.laneT=1; rider.targetLaneT=1;
        rider.y=0; rider.vy=0; rider.airborne=false; rider.landingOutcome=null;
        rider.lean=0; rider.wheelAngle=0; rider.wobble=0; rider.hitFlash=0;
        rider.sitT=0; rider.tricks=[]; rider.trickTimer=0; rider.trickFlashT=0;
        rider.crashed=false; rider.crashTimer=0; rider.crashReason="";
        rider.stationaryT=0; rider.onRamp=null;
        rider.cutoutFlying=false; rider.cutoutTimer=0;
        rider.jumpHeld=false; rider.jumpCharge=0; rider.jumpReady=false;
        rider.overheatWarning=false; rider.beepFlash=0;
    }

    function startGame(){
        game.dist=0; game.speedNorm=0; game.topSpeed=0; game.coins=0; game.score=0;
        game.batt=1.0; game.lives=3; game.cpZone=0; game.cpDist=0;
        game.zonesFinished=0; game.finishWorldX=-1; game.finishCrossed=false; game.finishFlash=0;
        game.nextCoinAt=600; game.zoneIdx=0;
        world.scrollX=0; obstacles.length=0; coins.length=0;
        nextObstAt=1400; obstIdSeq=0; nearMissFlash=null;
        resetLayers(); resetRider();
        rider.x=Math.min(110,W*.22); rider.y=0;
        document.getElementById("eucStart").classList.add("eucHide");
        document.getElementById("eucOver").classList.add("eucHide");
        document.getElementById("eucMedal").classList.add("eucHide");
        document.getElementById("eucPause").classList.add("eucHide");
        state=ST.PLAY; lastTime=performance.now(); raf=requestAnimationFrame(loop);
    }

    // ─── Medal screen ───────────────────────────────────────────────
    function showMedal(){
        state=ST.MEDAL;
        const totalScore=Math.floor(game.dist)+game.coins;
        let medal, name, color, symbol;
        if(totalScore>=MEDAL_GOLD){ medal="⚡"; name="GOLD"; color="#ffd700"; symbol="lightning"; }
        else if(totalScore>=MEDAL_SILVER){ medal="🥈"; name="SILVER"; color="#c0c0c0"; }
        else { medal="🥉"; name="BRONZE"; color="#cd7f32"; }

        const aw=document.getElementById("eucMedalAward");
        const nm=document.getElementById("eucMedalName");

        if(symbol==="lightning"){
            // Custom gold medal with lightning bolt
            aw.textContent="";
            aw.innerHTML=`<svg width="90" height="90" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r="42" fill="#ffd700" stroke="#b8960c" stroke-width="3"/>
                <circle cx="45" cy="45" r="36" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="2"/>
                <polygon points="52,18 36,46 47,46 38,72 60,40 48,40" fill="#fff" opacity=".95"/>
            </svg>`;
        } else {
            aw.textContent=medal;
        }
        nm.textContent=name+" MEDAL";
        nm.style.color=color;

        document.getElementById("eucMedalScore").textContent=totalScore;
        document.getElementById("eucMedalDist").textContent=Math.floor(game.dist)+" ft";
        document.getElementById("eucMedalCoins").textContent=game.coins;

        if(totalScore>parseInt(ls("eucdrift_best","0"))||0)
            lsSet("eucdrift_best",String(totalScore));

        document.getElementById("eucMedal").classList.remove("eucHide");
    }

    // ─── Collision detection ─────────────────────────────────────────
    function checkCollisions(){
        if(rider.crashed) return;
        const sc=rScale(), w=32*sc;
        const rx=rider.x, rl=rider.lane, airborne=rider.airborne;
        const rL=rx-w/2, rR=rx+w/2;

        for(const o of obstacles){
            if(o.triggered) continue;
            const sx=obScreenX(o), oL=sx, oR=sx+o.w;
            if(oR<rL||oL>rR) continue;
            if(o.lane!==rl) continue;

            if(o.type==="ramp") continue;

            if(o.type==="rock"){
                o.triggered=true;
                if(airborne){
                    // Hit rock while airborne (from pre-load jump) = boost!
                    rider.vy=Math.min(rider.vy,-400); // extra upward kick
                } else {
                    // Hit rock on ground = stumble — scrub some speed,
                    // but the obstacle behind it is what actually crashes them
                    game.speedNorm=Math.max(0,game.speedNorm-0.2);
                }
                continue;
            }

            // Normal obstacle — crash if on ground
            if(airborne) continue;
            crashRider("hit"); return;
        }
    }

    // ─── Main update ─────────────────────────────────────────────────
    function update(dt){
        if(rider.cutoutFlying){ updateRider(dt); updateHUD(); return; }

        // Speed (absolute slider position = target speed)
        const t=input.sliderT;
        const active=Math.abs(t)>H_DZ;
        if(active){
            const target=t*1.3;
            game.speedNorm+=( target-game.speedNorm)*Math.min(1,dt*3.5);
        } else {
            const decay=Math.sign(game.speedNorm)*Math.min(Math.abs(game.speedNorm),.9*dt);
            game.speedNorm-=decay;
        }

        // Hill gravity on top of slider
        const sl=hillSlope(game.dist);
        if(sl>0)       game.speedNorm-=sl*HILL_UP*dt;
        else if(sl<0)  game.speedNorm+=(-sl)*HILL_DOWN*dt;

        game.speedNorm=Math.max(MAX_REV,Math.min(1.3,game.speedNorm));

        // Stationary fall
        if(Math.abs(game.speedNorm)<.01&&!active&&!rider.airborne&&!rider.crashed){
            rider.stationaryT=(rider.stationaryT||0)+dt;
            if(rider.stationaryT>=STILL_FALL) crashRider("fellOver");
        } else { rider.stationaryT=0; }

        const scroll=game.baseScroll*game.speedNorm;
        world.scrollX+=scroll*dt;
        game.dist+=scroll*dt*.06;
        if(game.dist<0) game.dist=0;

        // Zone
        const newZ=Math.floor(game.dist/ZONE_LEN)%ZONES.length;
        if(newZ>game.zoneIdx){ game.zoneIdx=newZ; }

        updateRider(dt);
        updateObst(dt);
        updateCoins(dt);
        updateFinish(dt);
        checkCollisions();
        checkNearMiss();
        updateHUD();
    }

    // ─── HUD update ──────────────────────────────────────────────────
    function updateHUD(){
        const mph=Math.round(game.speedNorm*50);
        const sv=document.getElementById("eucSpeedVal");
        if(sv) sv.innerHTML=Math.abs(mph)+' <span style="font-size:12px;font-weight:700">'+(mph<0?"mph REV":"mph")+"</span>";
        if(mph>game.topSpeed) game.topSpeed=Math.abs(mph);
        const sc=document.getElementById("eucScore"); if(sc) sc.textContent=Math.floor(game.dist);
        const zl=document.getElementById("eucZoneLabel"); if(zl) zl.textContent=currentZone();
        const lh=document.getElementById("eucLivesHud"); if(lh) lh.textContent="❤️".repeat(game.lives)+"🖤".repeat(3-game.lives);
        const ch=document.getElementById("eucCoinHud"); if(ch) ch.textContent="⚡ "+game.coins;
        const bf=document.getElementById("eucBattFill"); if(bf){
            bf.style.width=Math.round(game.batt*100)+"%";
            bf.style.background=game.batt>.5?"#4fd1c5":game.batt>.25?"#ffd700":"#ff4444";
        }
        const mb=document.getElementById("eucMotorBanner"); if(mb) mb.classList.toggle("eucHide",!rider.overheatWarning);
        const hb=document.getElementById("eucHillBanner"); if(hb){
            const s=hillSlope(game.dist);
            if(s>.05){ hb.textContent="▲ CLIMBING — HOLD FAST"; hb.className="climb"; }
            else if(s<-.05){ hb.textContent="▼ DESCENDING — EASE OFF"; hb.className="descend"; }
            else hb.className="eucHide";
        }
    }

    // ─── Hill tilt render ────────────────────────────────────────────
    const MAX_TILT=0.22;
    function render(){
        ctx.clearRect(0,0,W,H);
        const sl=(!rider.airborne&&!rider.crashed)?hillSlope(game.dist):0;
        const tilt=sl*MAX_TILT;
        if(tilt!==0){
            ctx.save();
            const py=groundY()+laneOffset(rider.laneT);
            ctx.translate(rider.x,py); ctx.rotate(-tilt); ctx.translate(-rider.x,-py);
        }
        drawBackground();
        drawFinish();
        drawCoins();
        drawObstacles();
        drawRider();
        drawFlashes();
        if(tilt!==0) ctx.restore();
        drawFinishFlash();
    }

    // ─── Draw obstacles ──────────────────────────────────────────────
    function drawObstacles(){
        obstacles.forEach(o=>{
            const sx=obScreenX(o); if(sx>W+160||sx<-260)return;
            if(o.type==="ramp") drawRamp(o,sx);
            else if(o.type==="rock") drawRockHint(o,sx);
            else drawLaneObst(o,sx);
        });
    }

    function drawRockHint(o,sx){
        // Small jump-cue rock — draws flat and low on the road surface.
        // Has a small "↑ JUMP" label above it so new players know what it means.
        const gy=obLaneY(o), w=o.w, h=o.h;
        // Rock body
        ctx.fillStyle="#6e6a63";
        ctx.beginPath();
        ctx.moveTo(sx,gy);
        ctx.lineTo(sx+w*.12,gy-h*.65);
        ctx.lineTo(sx+w*.38,gy-h);
        ctx.lineTo(sx+w*.72,gy-h*.8);
        ctx.lineTo(sx+w,gy-h*.25);
        ctx.lineTo(sx+w,gy);
        ctx.closePath(); ctx.fill();
        // Shine
        ctx.fillStyle="rgba(255,255,255,.13)";
        ctx.beginPath();
        ctx.moveTo(sx+w*.38,gy-h);
        ctx.lineTo(sx+w*.72,gy-h*.8);
        ctx.lineTo(sx+w*.58,gy-h*.6);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle="rgba(0,0,0,.3)"; ctx.lineWidth=1.5; ctx.stroke();
        // Jump hint label above rock
        if(!o.triggered){
            ctx.fillStyle="rgba(79,209,197,.85)";
            ctx.font="bold 10px -apple-system,sans-serif";
            ctx.textAlign="center";
            ctx.fillText("↑ JUMP",sx+w/2,gy-h-8);
            ctx.textAlign="left";
        }
    }

    function drawLaneObst(o,sx){
        const gy=obLaneY(o), w=o.w, h=o.h;
        switch(o.variant){
            case "trash":
                ctx.fillStyle="#5a6a6e"; ctx.fillRect(sx,gy-h,w,h);
                ctx.fillStyle="#3f4d50"; ctx.fillRect(sx,gy-h,w,6);
                ctx.strokeStyle="rgba(0,0,0,.35)"; ctx.lineWidth=2;
                for(let lx=sx+w*.25;lx<sx+w;lx+=w*.25){ctx.beginPath();ctx.moveTo(lx,gy-h+8);ctx.lineTo(lx,gy-3);ctx.stroke();}
                break;
            case "rock":
                ctx.fillStyle="#6e6a63"; ctx.beginPath();
                ctx.moveTo(sx,gy);ctx.lineTo(sx+w*.1,gy-h*.7);ctx.lineTo(sx+w*.4,gy-h);ctx.lineTo(sx+w*.75,gy-h*.75);ctx.lineTo(sx+w,gy-h*.2);ctx.lineTo(sx+w,gy);ctx.closePath();ctx.fill();
                ctx.fillStyle="rgba(255,255,255,.12)"; ctx.beginPath();ctx.moveTo(sx+w*.4,gy-h);ctx.lineTo(sx+w*.75,gy-h*.75);ctx.lineTo(sx+w*.55,gy-h*.55);ctx.closePath();ctx.fill();
                ctx.strokeStyle="rgba(0,0,0,.3)"; ctx.lineWidth=1.5; ctx.stroke();
                break;
            case "twigs":
                ctx.fillStyle="#4a3320"; ctx.beginPath(); ctx.ellipse(sx+w/2,gy-4,w/2,6,0,0,Math.PI*2); ctx.fill();
                ctx.strokeStyle="#6b4a2a"; ctx.lineWidth=4; ctx.lineCap="round";
                for(let i=0;i<4;i++){const x0=sx+4+i*(w-8)/3;ctx.beginPath();ctx.moveTo(x0,gy-2);ctx.lineTo(x0+8-i*2,gy-h*(.5+i*.08));ctx.stroke();}
                break;
            case "tires":{
                const tr=w/2;
                [0,1,2].forEach(i=>{const ty=gy-tr-i*tr*1.15;ctx.fillStyle="#181818";ctx.beginPath();ctx.ellipse(sx+tr,ty,tr,tr*.78,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#000";ctx.lineWidth=2;ctx.stroke();ctx.fillStyle="#0d0d0d";ctx.beginPath();ctx.ellipse(sx+tr,ty,tr*.45,tr*.36,0,0,Math.PI*2);ctx.fill();});
                break;}
            default: // cone
                ctx.beginPath();ctx.moveTo(sx+w/2-w*.09,gy-h);ctx.lineTo(sx+w/2+w*.09,gy-h);ctx.lineTo(sx+w,gy);ctx.lineTo(sx,gy);ctx.closePath();ctx.fillStyle="#ff5a1f";ctx.fill();
                ctx.fillStyle="#fff";ctx.fillRect(sx+(w-w*.5)/2,gy-h*.42,w*.5,h*.16);
                ctx.fillStyle="#cc4416";ctx.fillRect(sx,gy-5,w,5);
        }
    }

    function drawRamp(o,sx){
        const gy=obLaneY(o), rw=o.w, rh=o.h;
        const isDirt=o.variant==="dirt";
        ctx.beginPath();ctx.moveTo(sx,gy);ctx.lineTo(sx+rw,gy);ctx.lineTo(sx+rw,gy-rh);ctx.lineTo(sx+rw*.82,gy-rh*.18);ctx.closePath();
        ctx.fillStyle=isDirt?"#4a3318":"#3a4046";ctx.fill();
        ctx.beginPath();ctx.moveTo(sx,gy);ctx.lineTo(sx+rw,gy-rh);ctx.lineTo(sx+rw,gy);ctx.closePath();
        ctx.fillStyle=isDirt?"#8a5a2e":"#ffb238";ctx.fill();
        if(!isDirt){
            ctx.strokeStyle="rgba(20,16,8,.55)";ctx.lineWidth=3;
            for(let i=1;i<=4;i++){const t=i/5;ctx.beginPath();ctx.moveTo(sx+rw*t,gy-rh*t);ctx.lineTo(sx+rw*t,gy);ctx.stroke();}
        }
        ctx.strokeStyle=isDirt?"#d9b27a":"#fff3d6";ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(sx,gy);ctx.lineTo(sx+rw,gy-rh);ctx.lineTo(sx+rw,gy);ctx.stroke();
        ctx.fillStyle=isDirt?"rgba(217,178,122,.85)":"rgba(255,178,56,.85)";
        ctx.beginPath();ctx.moveTo(sx+rw*.78,gy-rh-10);ctx.lineTo(sx+rw*.78+9,gy-rh-20);ctx.lineTo(sx+rw*.78+18,gy-rh-10);ctx.closePath();ctx.fill();
    }

    // ─── Draw rider ──────────────────────────────────────────────────
    function drawRider(){
        if(rider.crashed&&rider.crashTimer<=0) return;
        if(rider.cutoutFlying){ drawCutout(); return; }
        const sc=rScale(), by=groundY()+laneOffset(rider.laneT);
        ctx.save();
        ctx.translate(rider.x,by+rider.y);
        if(rider.crashed){
            const tumble=(0.9-Math.max(0,rider.crashTimer))*6;
            ctx.rotate(tumble); ctx.globalAlpha=Math.max(.15,rider.crashTimer/.9);
        }
        const hp=(!rider.airborne&&!rider.crashed)?hillSlope(game.dist)*.16:0;
        const la=rider.airborne?Math.min(.5,rider.tricks.length*.35)*Math.sin(performance.now()/120):rider.lean*.22+hp;
        const bob=(!rider.airborne&&!rider.crashed)?Math.sin(rider.wobble)*1.6*sc:0;
        ctx.translate(0,bob); ctx.rotate(la);

        const cc=riderColor, dc="#3a5a8c", dd="#2a4368";
        const wy=-WHEEL_R*sc;

        // Wheel
        ctx.save(); ctx.translate(0,wy); ctx.rotate(rider.wheelAngle);
        ctx.beginPath();ctx.arc(0,0,WHEEL_R*sc,0,Math.PI*2);ctx.fillStyle="#2a333b";ctx.fill();
        ctx.strokeStyle="rgba(255,255,255,.35)";ctx.lineWidth=1.6*sc;ctx.stroke();
        ctx.strokeStyle="#11161a";ctx.lineWidth=2.2*sc;ctx.stroke();
        ctx.beginPath();ctx.arc(0,0,WHEEL_R*sc*.6,0,Math.PI*2);ctx.fillStyle="#52606c";ctx.fill();
        ctx.strokeStyle="#33404a";ctx.lineWidth=1.8*sc;
        for(let i=0;i<5;i++){const a=i/5*Math.PI*2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*WHEEL_R*sc*.56,Math.sin(a)*WHEEL_R*sc*.56);ctx.stroke();}
        ctx.beginPath();ctx.arc(0,0,4.4*sc,0,Math.PI*2);ctx.fillStyle=cc;ctx.fill();
        ctx.restore();

        // Footplate
        ctx.save();ctx.translate(0,wy);ctx.fillStyle="#22282e";ctx.fillRect(-WHEEL_R*sc*1.05,-3.8*sc,WHEEL_R*sc*2.1,5.5*sc);ctx.restore();

        // Warning light
        if(rider.overheatWarning&&rider.beepFlash>0){
            ctx.save();ctx.translate(0,wy);
            ctx.beginPath();ctx.arc(WHEEL_R*sc*1.05,0,4.2*sc,0,Math.PI*2);ctx.fillStyle="#ff2a2a";ctx.globalAlpha=Math.min(1,rider.beepFlash/.25);ctx.fill();ctx.globalAlpha=1;
            ctx.beginPath();ctx.arc(WHEEL_R*sc*1.05,0,8*sc,0,Math.PI*2);ctx.fillStyle="rgba(255,42,42,.25)";ctx.fill();
            ctx.restore();
        }

        // Saddle
        const sy=wy-9*sc;
        ctx.save();ctx.beginPath();ctx.moveTo(-5*sc,sy+6*sc);ctx.quadraticCurveTo(-6*sc,sy-4*sc,0,sy-7*sc);ctx.quadraticCurveTo(6*sc,sy-4*sc,5*sc,sy+6*sc);ctx.closePath();ctx.fillStyle=cc;ctx.fill();ctx.restore();

        // Pose points
        const hipY=wy-34*sc, kneeY=wy-11*sc, footY=wy+2*sc;
        const shoulderY=hipY-36*sc, tl=rider.lean*6*sc;
        const headY=shoulderY-15*sc, headX=tl+rider.lean*3*sc;

        ctx.lineCap="round"; ctx.lineJoin="round";
        // Far leg
        ctx.strokeStyle=dd;ctx.lineWidth=7*sc;ctx.beginPath();ctx.moveTo(2*sc,hipY+2*sc);ctx.quadraticCurveTo(7*sc,kneeY+6*sc,5*sc,footY-2*sc);ctx.stroke();
        // Near leg
        ctx.strokeStyle=dc;ctx.lineWidth=10*sc;ctx.beginPath();ctx.moveTo(sc,hipY);ctx.quadraticCurveTo(13*sc,kneeY,7*sc,footY);ctx.stroke();
        // Boot
        ctx.fillStyle="#2b3338";ctx.beginPath();ctx.ellipse(8*sc,footY+1.5*sc,8*sc,4.2*sc,.1,0,Math.PI*2);ctx.fill();
        // Jacket
        ctx.strokeStyle=cc;ctx.lineWidth=13*sc;ctx.beginPath();ctx.moveTo(0,hipY);ctx.quadraticCurveTo(tl*.5,(hipY+shoulderY)/2,tl,shoulderY);ctx.stroke();
        ctx.strokeStyle="rgba(0,0,0,.28)";ctx.lineWidth=2*sc;ctx.beginPath();ctx.moveTo(2*sc,hipY-4*sc);ctx.quadraticCurveTo(tl*.5+2*sc,(hipY+shoulderY)/2,tl+2*sc,shoulderY+4*sc);ctx.stroke();

        // Arm
        const lt=Math.max(-1,Math.min(1,rider.lean));
        let ex,ey,hx,hy;
        if(lt>=0){const r=lt;ex=tl+(9+r*10)*sc;ey=shoulderY+(10-r*2)*sc;hx=tl+(14+r*22)*sc;hy=shoulderY+(16-r*6)*sc;}
        else{const k=-lt;ex=tl+(9-k*6)*sc;ey=shoulderY+(10+k*4)*sc;hx=tl+(14-k*11)*sc;hy=shoulderY+(16+k*14)*sc;}
        ctx.strokeStyle=cc;ctx.lineWidth=7.5*sc;ctx.beginPath();ctx.moveTo(tl,shoulderY+2*sc);ctx.quadraticCurveTo(ex,ey,hx,hy);ctx.stroke();
        ctx.fillStyle="#e0a878";ctx.beginPath();ctx.arc(hx,hy,3.6*sc,0,Math.PI*2);ctx.fill();

        // Helmet
        ctx.beginPath();ctx.arc(headX,headY,10.2*sc,0,Math.PI*2);ctx.fillStyle=cc;ctx.fill();
        ctx.fillStyle="#1a2024";ctx.beginPath();ctx.ellipse(headX+3.6*sc,headY-.5*sc,5.4*sc,3.4*sc,.25,0,Math.PI*2);ctx.fill();

        // Hit flash
        if(rider.hitFlash>0){
            ctx.globalAlpha=Math.max(0,rider.hitFlash)*.6;
            ctx.beginPath();ctx.arc(headX,(headY+hipY)/2,44*sc,0,Math.PI*2);ctx.fillStyle="#ff4d4d";ctx.fill();
            ctx.globalAlpha=1;
        }
        // Speed lines
        if(!rider.airborne&&rider.lean>.4){
            ctx.strokeStyle=`rgba(255,255,255,${(rider.lean-.4)*.4})`;ctx.lineWidth=2.2*sc;
            for(let i=0;i<3;i++){const ly=hipY-20*sc+i*14*sc;ctx.beginPath();ctx.moveTo(-32*sc-i*6*sc,ly);ctx.lineTo(-54*sc-i*6*sc,ly);ctx.stroke();}
        }
        ctx.restore();
    }

    function drawCutout(){
        const sc=rScale(), by=groundY()+laneOffset(rider.laneT);
        const prog=1-Math.max(0,rider.cutoutTimer)/.5;
        const fd=prog*70*sc, rf=Math.sin(prog*Math.PI)*-26*sc;
        ctx.save();ctx.translate(rider.x-fd*.4,by-WHEEL_R*sc+6*sc*prog);ctx.rotate(rider.wheelAngle);
        ctx.beginPath();ctx.arc(0,0,WHEEL_R*sc,0,Math.PI*2);ctx.fillStyle="#1a2126";ctx.fill();ctx.restore();
        ctx.save();ctx.translate(rider.x+fd,by-30*sc+rf);ctx.rotate(.18+prog*.25);
        const cc=riderColor;ctx.lineCap="round";
        ctx.strokeStyle="#1c252c";ctx.lineWidth=9*sc;ctx.beginPath();ctx.moveTo(-4*sc,6*sc);ctx.quadraticCurveTo(-22*sc,10*sc,-34*sc,4*sc);ctx.stroke();
        ctx.beginPath();ctx.moveTo(2*sc,4*sc);ctx.quadraticCurveTo(-14*sc,-4*sc,-28*sc,-10*sc);ctx.stroke();
        ctx.strokeStyle=cc;ctx.lineWidth=13*sc;ctx.beginPath();ctx.moveTo(0,4*sc);ctx.lineTo(24*sc,-8*sc);ctx.stroke();
        ctx.strokeStyle="#1c252c";ctx.lineWidth=7*sc;
        ctx.beginPath();ctx.moveTo(20*sc,-9*sc);ctx.quadraticCurveTo(34*sc,-14*sc,46*sc,-16*sc);ctx.stroke();
        ctx.beginPath();ctx.moveTo(18*sc,-6*sc);ctx.quadraticCurveTo(32*sc,-8*sc,44*sc,-9*sc);ctx.stroke();
        const hx=28*sc,hy=-12*sc;
        ctx.beginPath();ctx.arc(hx,hy,10.2*sc,0,Math.PI*2);ctx.fillStyle="#27323b";ctx.fill();
        ctx.fillStyle=cc;ctx.beginPath();ctx.ellipse(hx+4*sc,hy-sc,5*sc,2.8*sc,.3,0,Math.PI*2);ctx.fill();
        ctx.restore();
    }

    function drawFlashes(){
        // Trick flash
        if(rider.trickFlashT>0&&rider.tricks.length){
            const a=Math.min(1,rider.trickFlashT/.5);
            ctx.globalAlpha=a;ctx.fillStyle="#4fd1c5";
            ctx.font=`bold ${Math.round(16*rScale())}px -apple-system,sans-serif`;ctx.textAlign="center";
            ctx.fillText(rider.trickFlashLbl+"!",rider.x,groundY()+laneOffset(rider.laneT)+rider.y-RIDER_H*rScale()-70);
            ctx.globalAlpha=1;ctx.textAlign="left";
        }
        // Near miss
        if(nearMissFlash&&nearMissFlash.t>0){
            nearMissFlash.t-=1/60;
            const a=Math.min(1,nearMissFlash.t/.6);
            ctx.globalAlpha=a;ctx.fillStyle="#00ffcc";
            ctx.font=`bold ${Math.round(14*rScale())}px -apple-system,sans-serif`;ctx.textAlign="center";
            ctx.fillText("NEAR MISS! +3",rider.x,groundY()+laneOffset(rider.laneT)+rider.y-RIDER_H*rScale()-40);
            ctx.globalAlpha=1;ctx.textAlign="left";
        }
    }

    // ─── Main loop ───────────────────────────────────────────────────
    function loop(now){
        if(destroyed) return;
        if(state!==ST.PLAY&&state!==ST.CRASH) return;
        const dt=Math.min(.04,(now-lastTime)/1000); lastTime=now;
        if(state===ST.PLAY) update(dt);
        else updateRider(dt);
        render();
        raf=requestAnimationFrame(loop);
    }

    // ─── Idle render ─────────────────────────────────────────────────
    function idleRender(){
        rider.y=0; rider.x=Math.min(110,W*.22); render();
    }
    idleRender();
    on(window,"resize",()=>{ if(state!==ST.PLAY&&!destroyed) idleRender(); });

    // ─── Button wiring ───────────────────────────────────────────────
    on(document.getElementById("eucPlayBtn"),  "click", startGame);
    on(document.getElementById("eucRetryBtn"), "click", ()=>{ game.lives>0?respawn():startGame(); });
    on(document.getElementById("eucMedalRetry"),"click",startGame);
    on(document.getElementById("eucResumeBtn"),"click",()=>{
        if(state!==ST.PAUSE)return;
        state=ST.PLAY; document.getElementById("eucPause").classList.add("eucHide");
        lastTime=performance.now(); raf=requestAnimationFrame(loop);
    });
    on(document.getElementById("eucPauseBtn"), "click",()=>{
        if(state!==ST.PLAY)return;
        state=ST.PAUSE; document.getElementById("eucPause").classList.remove("eucHide");
    });

    document.getElementById("eucBest").textContent=game.best;

    // ─── Cleanup ─────────────────────────────────────────────────────
    window.__eucDriftCleanup=function(){
        destroyed=true; state=ST.MENU;
        if(raf) cancelAnimationFrame(raf);
        if(ro){try{ro.disconnect();}catch{}}
        cleanups.forEach(fn=>{try{fn();}catch{}});
        cleanups.length=0; window.__eucDriftCleanup=null;
    };
};

(function(){
    if(typeof window.cleanupRunningGameEngine!=="function") return;
    if(window.cleanupRunningGameEngine.__eucDriftWrapped) return;
    const old=window.cleanupRunningGameEngine;
    window.cleanupRunningGameEngine=function(){
        if(window.__eucDriftCleanup){try{window.__eucDriftCleanup();}catch{}}
        return old.apply(this,arguments);
    };
    window.cleanupRunningGameEngine.__eucDriftWrapped=true;
})();
