/* ============================================================
   EUC DRIFT â€” Chaser arcade integration
   Drop-in replacement for /games/eucdrift.js

   Restored control layout:
   - Left side: up/down dodge buttons
   - Right side: speed slider, left=SLOW/brake, right=FAST/power
   - No jump button

   Gameplay fixes:
   - Ramps launch automatically; no jump button needed
   - Checkpoints at the start of each zone
   - If you crash in countryside/track, you restart at that zone start
   - Downhill naturally speeds you up; slider left slows/brakes
   - Uphill naturally slows you down; slider right powers uphill
   - Removed rocks/crates/cones as main obstacles; ramps are the main feature
   ============================================================ */

window.initEucDriftGame = function () {
  const container = document.getElementById("gameCanvasContainer");
  if (!container) return;
  if (window.__eucDriftCleanup) {
    try { window.__eucDriftCleanup(); } catch (e) {}
  }

  container.innerHTML = `
<style>
#eucRoot {
  position:relative; width:100%; height:100%; min-height:480px;
  overflow:hidden; background:#0c1116;
  font-family:-apple-system,'Segoe UI',Roboto,sans-serif;
  box-sizing:border-box; border-radius:10px; touch-action:none;
}
#eucCanvas { position:absolute; inset:0; width:100%; height:100%; display:block; }

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

#eucCenterHud {
  position:absolute; top:8px; left:50%; transform:translateX(-50%);
  pointer-events:none; z-index:10; display:flex; flex-direction:column; align-items:center; gap:2px;
}
#eucLivesHud { font-size:14px; letter-spacing:3px; }
#eucCoinHud { font-size:11px; font-weight:700; color:#ffd700; text-shadow:0 1px 4px rgba(0,0,0,.5); }

#eucBattBar {
  position:absolute; bottom:92px; right:12px; z-index:11; pointer-events:none;
  display:flex; flex-direction:column; align-items:flex-end; gap:2px;
}
#eucBattLabel { font-size:8px; font-weight:700; color:rgba(234,242,248,.45); letter-spacing:.8px; }
#eucBattTrack {
  width:48px; height:9px; background:rgba(255,255,255,.1);
  border-radius:5px; overflow:hidden; border:1px solid rgba(255,255,255,.15);
}
#eucBattFill { height:100%; width:100%; background:#4fd1c5; border-radius:5px; }

#eucMotorBanner, #eucHillBanner {
  position:absolute; left:50%; transform:translateX(-50%);
  z-index:12; font-size:11px; font-weight:800; letter-spacing:.6px;
  padding:5px 14px; border-radius:100px; white-space:nowrap; pointer-events:none;
}
#eucMotorBanner { top:38px; background:rgba(40,8,8,.9); border:1.5px solid #ff3a3a; color:#ff6b6b; animation:eucPulse .4s infinite; }
#eucHillBanner { top:38px; }
#eucMotorBanner.eucHide, #eucHillBanner.eucHide { display:none; }
#eucHillBanner.climb { background:rgba(60,38,8,.9); border:1.5px solid #ffaa3c; color:#ffc77a; }
#eucHillBanner.descend { background:rgba(8,28,48,.9); border:1.5px solid #50a0ff; color:#8cc4ff; }
@keyframes eucPulse { 0%,100%{opacity:1} 50%{opacity:.45} }

#eucPauseBtn {
  position:absolute; top:8px; right:10px; width:28px; height:28px; z-index:11;
  color:rgba(234,242,248,.55); background:transparent; border:none; padding:0;
  display:flex; align-items:center; justify-content:center; pointer-events:auto;
}
#eucPauseBtn svg { width:100%; height:100%; }

#eucControls {
  position:absolute; bottom:0; left:0; right:0;
  padding:0 14px 14px; display:flex; justify-content:space-between;
  align-items:flex-end; z-index:10; box-sizing:border-box;
}
.eucDodgePad {
  display:flex; flex-direction:column; align-items:center;
  background:rgba(255,255,255,.05); border:1.5px solid rgba(255,255,255,.13);
  border-radius:18px; overflow:hidden; width:64px;
}
.eucDodgeBtn {
  width:64px; height:64px; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:3px;
  background:transparent; border:none; color:rgba(234,242,248,.67);
  font-family:inherit; padding:0; transition:background .08s,color .08s;
}
.eucDodgeBtn.active { background:rgba(255,255,255,.18); color:#fff; }
.eucDodgeBtn svg { width:22px; height:22px; }
.eucDodgeLbl { font-size:9px; font-weight:700; letter-spacing:.5px; }
.eucDodgeDiv { width:38px; height:1.5px; background:rgba(255,255,255,.14); }

.eucSliderWrap { display:flex; align-items:center; }
.eucSliderTrack {
  position:relative; width:168px; height:64px;
  background:rgba(255,255,255,.05); border:1.5px solid rgba(255,255,255,.13);
  border-radius:32px; touch-action:none; user-select:none;
}
.eucSliderMid {
  position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
  width:2px; height:28px; background:rgba(255,255,255,.2); border-radius:1px; pointer-events:none;
}
.eucSliderLbl {
  position:absolute; top:50%; transform:translateY(-50%);
  font-size:9px; font-weight:800; letter-spacing:.5px; color:rgba(234,242,248,.38); pointer-events:none;
}
.eucSliderLbl.L { left:10px; } .eucSliderLbl.R { right:10px; }
.eucSliderPuck {
  position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
  width:48px; height:48px; border-radius:50%;
  background:radial-gradient(circle at 38% 32%,rgba(255,255,255,.22),rgba(255,255,255,.06));
  border:2px solid rgba(255,255,255,.28); box-shadow:0 2px 12px rgba(0,0,0,.35);
  pointer-events:none; will-change:transform;
}
.eucSliderPuck.fwd { border-color:rgba(79,209,197,.75); background:radial-gradient(circle at 38% 32%,rgba(79,209,197,.35),rgba(79,209,197,.12)); }
.eucSliderPuck.rev { border-color:rgba(255,120,80,.75); background:radial-gradient(circle at 38% 32%,rgba(255,120,80,.35),rgba(255,120,80,.12)); }

.eucOverlay {
  position:absolute; inset:0; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  background:rgba(8,12,16,.9); z-index:20; text-align:center;
  padding:20px; box-sizing:border-box;
}
.eucOverlay.eucHide { display:none; }
.eucLogo { font-size:30px; font-weight:800; color:#fff; letter-spacing:-.5px; margin-bottom:4px; font-family:Impact,'Arial Black',sans-serif; }
.eucLogo span { color:#4fd1c5; }
.eucSub { font-size:13px; color:#8fa3b3; margin-bottom:20px; max-width:280px; line-height:1.5; }
.eucBigStat { font-size:42px; font-weight:800; color:#4fd1c5; line-height:1; }
.eucBigLbl { font-size:10px; font-weight:700; color:#8fa3b3; letter-spacing:1.2px; text-transform:uppercase; margin-bottom:4px; }
.eucStatRow { display:flex; gap:26px; margin:16px 0 6px; }
.eucCrashTxt { font-size:14px; font-weight:700; color:#ff8a7a; margin-bottom:14px; max-width:280px; line-height:1.4; }
.eucBtn {
  margin-top:18px; background:#4fd1c5; color:#06201d; border:none;
  font-size:15px; font-weight:800; padding:13px 38px; border-radius:100px;
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
#eucMedalAward { font-size:90px; line-height:1; margin-bottom:8px; }
#eucMedalName { font-size:26px; font-weight:800; margin-bottom:4px; }
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
    <div id="eucLivesHud">â¤ï¸â¤ï¸â¤ï¸</div>
    <div id="eucCoinHud">âš¡ 0</div>
  </div>

  <div id="eucBattBar">
    <div id="eucBattLabel">MOTOR</div>
    <div id="eucBattTrack"><div id="eucBattFill"></div></div>
  </div>

  <div id="eucMotorBanner" class="eucHide">âš  MOTOR CUTOUT â€” EASE OFF</div>
  <div id="eucHillBanner" class="eucHide"></div>

  <button id="eucPauseBtn" type="button" aria-label="Pause">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
    </svg>
  </button>

  <div id="eucControls">
    <div class="eucDodgePad">
      <button class="eucDodgeBtn" id="eucUp" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
        <span class="eucDodgeLbl">DODGE</span>
      </button>
      <div class="eucDodgeDiv"></div>
      <button class="eucDodgeBtn" id="eucDn" type="button">
        <span class="eucDodgeLbl">DODGE</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
      </button>
    </div>

    <div class="eucSliderWrap">
      <div class="eucSliderTrack" id="eucSliderTrack">
        <div class="eucSliderMid"></div>
        <div class="eucSliderLbl L">SLOW</div>
        <div class="eucSliderLbl R">FAST</div>
        <div class="eucSliderPuck" id="eucPuck"></div>
      </div>
    </div>
  </div>

  <div class="eucOverlay" id="eucStart">
    <div class="eucLogo">EUC<span>DRIFT</span></div>
    <div class="eucSub">Use the speed slider to power up hills and brake downhill. Ramps launch automatically.</div>
    <div class="eucColorLbl">YOUR COLOR</div>
    <div id="eucSwatches"></div>
    <button class="eucBtn" id="eucPlayBtn" type="button">RIDE</button>
  </div>

  <div class="eucOverlay eucHide" id="eucOver">
    <div class="eucCrashTxt" id="eucOverMsg"></div>
    <div id="eucLivesOver" style="font-size:20px;margin-bottom:10px;letter-spacing:3px"></div>
    <div class="eucBigLbl">distance (ft)</div>
    <div class="eucBigStat" id="eucOverDist">0</div>
    <div class="eucStatRow">
      <div><div class="eucBigLbl">best</div><div style="font-size:18px;font-weight:700;color:#cdd9e1" id="eucBest">0</div></div>
      <div><div class="eucBigLbl">top speed</div><div style="font-size:18px;font-weight:700;color:#cdd9e1" id="eucTopSpd">0 mph</div></div>
    </div>
    <button class="eucBtn" id="eucRetryBtn" type="button">RIDE AGAIN</button>
  </div>

  <div class="eucOverlay eucHide" id="eucMedal">
    <div id="eucMedalAward">ðŸ¥‰</div>
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

  <div class="eucOverlay eucHide" id="eucPause">
    <div class="eucLogo" style="font-size:24px">PAUSED</div>
    <button class="eucBtn" id="eucResumeBtn" type="button" style="margin-top:16px">RESUME</button>
  </div>
</div>`;

  window.__eucDriftRunGame();
};

window.__eucDriftRunGame = function () {
  const root = document.getElementById("eucRoot");
  const canvas = document.getElementById("eucCanvas");
  if (!root || !canvas) return;

  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1, destroyed = false, raf = null, ro = null;
  const cleanups = [];

  function on(el, ev, fn, opts) {
    if (!el) return;
    el.addEventListener(ev, fn, opts);
    cleanups.push(() => el.removeEventListener(ev, fn, opts));
  }
  function ls(k, fb) { try { return localStorage.getItem(k) || fb; } catch { return fb; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch {} }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * clamp(t, 0, 1); }

  function resize() {
    if (destroyed) return;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const r = root.getBoundingClientRect();
    W = Math.max(280, r.width || 320);
    H = Math.max(420, r.height || 520);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(resize);
    ro.observe(root);
  }
  on(window, "resize", resize);
  resize();

  const ST = { MENU:"menu", PLAY:"play", PAUSE:"pause", CRASH:"crash", OVER:"over", MEDAL:"medal" };
  const LANE_TOP = 0, LANE_BOTTOM = 1;
  const ZONES = ["city", "countryside", "track"];
  const ZONE_LEN = 720;
  const FINISH_OFFSET = 680;
  const MEDAL_BRONZE = 2500, MEDAL_SILVER = 5000, MEDAL_GOLD = 9000;
  const WHEEL_R = 24, RIDER_H = 118;
  const MAX_REV = -0.38;
  const STILL_FALL = 2.1;
  const LAND_MPH_MIN = 25;
  const JUMP_G = 1850;

  const PALETTE = ["#ee1c25","#a020f0","#ff6a00","#ffe600","#0074ff","#00c200","#ffffff","#111111"];
  let riderColor = ls("eucdrift_color", PALETTE[0]);
  if (!PALETTE.includes(riderColor)) riderColor = PALETTE[0];

  let state = ST.MENU;
  let lastTime = performance.now();

  const game = {
    dist:0,
    speedNorm:0,
    baseScroll:320,
    best:parseInt(ls("eucdrift_best","0"),10) || 0,
    topSpeed:0,
    zoneIdx:0,
    coins:0,
    batt:1,
    lives:3,
    cpZone:0,
    cpDist:0,
    zonesFinished:0,
    finishWorldX:-1,
    finishCrossed:false,
    finishFlash:0,
    nextCoinAt:520
  };

  const input = { sliderT:0 };
  const rider = {
    x:0,
    lane:LANE_BOTTOM,
    laneT:1,
    targetLaneT:1,
    y:0,
    vy:0,
    airborne:false,
    lean:0,
    wheelAngle:0,
    wobble:0,
    sitT:0,
    stationaryT:0,
    onRamp:null,
    landingOutcome:null,
    crashed:false,
    crashTimer:0,
    crashReason:"",
    cutoutFlying:false,
    cutoutTimer:0,
    overheatWarning:false,
    beepFlash:0,
    trickFlashLbl:"",
    trickFlashT:0
  };

  const world = { scrollX:0 };
  const ramps = [];
  const coins = [];
  let nextRampAt = 1150;
  let nextDecorAt = 0;
  let nearMissFlash = null;

  function groundY() { return H * 0.52; }
  function laneGap() { return Math.max(54, H * 0.16); }
  function laneOffset(t) { return (t - 0.5) * laneGap(); }
  function riderBaseY() { return groundY() + laneOffset(rider.laneT) + rider.y; }
  function rScale() { return Math.min(1.25, Math.max(0.85, H / 700)) * 1.4; }
  function currentZone() { return ZONES[game.zoneIdx % ZONES.length]; }
  function zoneLabel() { const z = currentZone(); return z === "countryside" ? "forest" : z; }

  function hillSlope(d) {
    // Positive means uphill; negative means downhill.
    const zoneLocal = ((d % ZONE_LEN) + ZONE_LEN) % ZONE_LEN;
    if (zoneLocal < 120) return 0;
    if (zoneLocal < 270) return Math.sin((zoneLocal - 120) / 150 * Math.PI);
    if (zoneLocal < 330) return 0;
    if (zoneLocal < 500) return -Math.sin((zoneLocal - 330) / 170 * Math.PI);
    return 0;
  }

  function triggerDodge(dir) {
    if (state !== ST.PLAY || rider.crashed) return;
    const nl = dir > 0 ? LANE_TOP : LANE_BOTTOM;
    if (nl === rider.lane) return;
    rider.lane = nl;
    rider.targetLaneT = nl === LANE_TOP ? 0 : 1;
  }

  [["eucUp", 1], ["eucDn", -1]].forEach(([id, dir]) => {
    const el = document.getElementById(id);
    const dn = e => { e.preventDefault(); el.classList.add("active"); triggerDodge(dir); };
    const up = e => { if (e) e.preventDefault(); el.classList.remove("active"); };
    on(el, "touchstart", dn, {passive:false});
    on(el, "touchend", up, {passive:false});
    on(el, "touchcancel", up, {passive:false});
    on(el, "mousedown", dn);
    on(el, "mouseup", up);
    on(el, "mouseleave", up);
  });

  const sliderTrack = document.getElementById("eucSliderTrack");
  const puck = document.getElementById("eucPuck");
  const HALF = 58, DZ = 0.08;
  let sliderDown = false;

  function updatePuck(t) {
    if (!puck) return;
    puck.style.transform = `translate(calc(-50% + ${t * HALF}px),-50%)`;
    puck.classList.toggle("fwd", t > DZ);
    puck.classList.toggle("rev", t < -DZ);
  }
  function sliderSet(clientX) {
    const r = sliderTrack.getBoundingClientRect();
    const t = clamp((clientX - r.left - r.width / 2) / HALF, -1, 1);
    input.sliderT = t;
    updatePuck(t);
  }
  function sliderRelease() {
    sliderDown = false;
    input.sliderT = 0;
    puck.style.transition = "transform .18s cubic-bezier(.34,1.56,.64,1)";
    updatePuck(0);
    setTimeout(() => { if (puck) puck.style.transition = ""; }, 220);
  }
  on(sliderTrack, "touchstart", e => { e.preventDefault(); sliderDown = true; sliderSet(e.touches[0].clientX); }, {passive:false});
  on(sliderTrack, "touchmove", e => { e.preventDefault(); if (sliderDown) sliderSet(e.touches[0].clientX); }, {passive:false});
  on(sliderTrack, "touchend", e => { e.preventDefault(); sliderRelease(); }, {passive:false});
  on(sliderTrack, "touchcancel", e => { e.preventDefault(); sliderRelease(); }, {passive:false});
  on(sliderTrack, "mousedown", e => { sliderDown = true; sliderSet(e.clientX); });
  on(window, "mousemove", e => { if (sliderDown) sliderSet(e.clientX); });
  on(window, "mouseup", () => { if (sliderDown) sliderRelease(); });

  on(window, "keydown", e => {
    if (e.repeat) return;
    if (e.code === "ArrowRight" || e.code === "KeyD") { input.sliderT = 1; updatePuck(1); }
    if (e.code === "ArrowLeft" || e.code === "KeyA") { input.sliderT = -1; updatePuck(-1); }
    if (e.code === "ArrowUp" || e.code === "KeyW") triggerDodge(1);
    if (e.code === "ArrowDown" || e.code === "KeyS") triggerDodge(-1);
  });
  on(window, "keyup", e => {
    if (["ArrowRight","KeyD","ArrowLeft","KeyA"].includes(e.code)) {
      input.sliderT = 0;
      updatePuck(0);
    }
  });

  (function initSwatches() {
    const w = document.getElementById("eucSwatches");
    if (!w) return;
    w.innerHTML = PALETTE.map(h => `<button class="eucSwatch" type="button" data-c="${h}" style="background:${h}"></button>`).join("");
    w.querySelectorAll(".eucSwatch").forEach(sw => {
      on(sw, "click", e => {
        e.preventDefault();
        riderColor = sw.dataset.c;
        lsSet("eucdrift_color", riderColor);
        refreshSwatches();
      });
    });
    refreshSwatches();
  })();
  function refreshSwatches() {
    document.querySelectorAll(".eucSwatch").forEach(s => s.classList.toggle("sel", s.dataset.c === riderColor));
  }

  function resetWorldLists() {
    ramps.length = 0;
    coins.length = 0;
    nextRampAt = world.scrollX + W + 850;
    game.nextCoinAt = world.scrollX + W + 380;
  }

  function spawnRamp() {
    const z = currentZone();
    const lane = Math.random() < 0.5 ? LANE_TOP : LANE_BOTTOM;
    const width = z === "track" ? 104 : z === "countryside" ? 96 : 92;
    const height = z === "track" ? 48 : z === "countryside" ? 42 : 38;
    const spX = world.scrollX + W + 80;
    ramps.push({
      x: spX,
      lane,
      w: width,
      h: height,
      variant: z === "countryside" ? "dirt" : z === "track" ? "trackRamp" : "ramp",
      triggered:false
    });
  }

  function updateRamps(dt) {
    // Fewer things to dodge. Ramps are the main feature.
    const minGap = currentZone() === "track" ? 520 : 620;
    const maxGap = currentZone() === "track" ? 780 : 940;
    if (world.scrollX + W > nextRampAt) {
      spawnRamp();
      nextRampAt = world.scrollX + W + minGap + Math.random() * (maxGap - minGap);
    }

    const prune = world.scrollX - Math.max(W * 2.5, 1400);
    for (let i = ramps.length - 1; i >= 0; i--) {
      if (ramps[i].x + ramps[i].w < prune) ramps.splice(i, 1);
    }

    if (!rider.airborne && !rider.crashed) {
      let onRamp = false;
      for (const o of ramps) {
        if (o.triggered || o.lane !== rider.lane) continue;
        const sx = o.x - world.scrollX;
        if (sx <= rider.x && sx + o.w > rider.x) {
          onRamp = true;
          rider.onRamp = o;
          const t = clamp((rider.x - sx) / o.w, 0, 1);
          rider.y = -(t * o.h);
        } else if (rider.onRamp === o && rider.x >= sx + o.w) {
          o.triggered = true;
          rider.onRamp = null;
          launchRamp(o);
        }
      }
      if (!onRamp) {
        rider.onRamp = null;
        if (!rider.airborne) rider.y = 0;
      }
    }
  }

  function launchRamp(o) {
    if (rider.airborne || rider.crashed) return;
    const mph = Math.abs(game.speedNorm * 50);
    rider.y = -o.h;
    rider.airborne = true;
    rider.landingOutcome = mph < LAND_MPH_MIN ? "tooSlow" : "clean";
    const sf = clamp(mph / 45, 0.55, 1.45);
    rider.vy = -(170 + sf * 205);
    spawnRampCoins(o);
  }

  function spawnCoinGroup() {
    const spX = world.scrollX + W + 100;
    const lane = Math.random() < 0.5 ? LANE_TOP : LANE_BOTTOM;
    const count = 5 + Math.floor(Math.random() * 4);
    const spacing = 55;
    for (let i = 0; i < count; i++) {
      coins.push({ x: spX + i * spacing, lane, collected:false, bobT:Math.random() * Math.PI * 2, airY:0 });
    }
  }
  function spawnRampCoins(o) {
    for (let i = 0; i < 5; i++) {
      coins.push({
        x:o.x + o.w + 22 + i * 45,
        lane:o.lane,
        collected:false,
        bobT:Math.random() * Math.PI * 2,
        airY:-(o.h * (1 - i * 0.14))
      });
    }
  }
  function updateCoins(dt) {
    if (world.scrollX + W > game.nextCoinAt) {
      spawnCoinGroup();
      game.nextCoinAt = world.scrollX + W + 420 + Math.random() * 360;
    }
    const prune = world.scrollX - W * 2;
    for (let i = coins.length - 1; i >= 0; i--) {
      if (coins[i].x < prune) coins.splice(i, 1);
    }
    coins.forEach(c => {
      c.bobT += dt * 3.2;
      if (c.airY) c.airY = Math.min(0, c.airY + 34 * dt);
    });

    if (!rider.crashed) {
      for (const c of coins) {
        if (c.collected || c.lane !== rider.lane) continue;
        const sx = c.x - world.scrollX;
        if (Math.abs(sx - rider.x) < 30) {
          c.collected = true;
          game.coins++;
          game.dist += 2;
        }
      }
    }
  }

  function updateBattery(dt) {
    const CUTOUT_TIME = 10.0;
    const WARN_TIME = 8.0;
    const atMaxSpeed = input.sliderT > 0.88 && game.speedNorm > 1.05;
    if (atMaxSpeed) game.batt = Math.max(0, game.batt - dt / CUTOUT_TIME);
    else game.batt = 1.0;

    rider.overheatWarning = game.batt < (1 - WARN_TIME / CUTOUT_TIME) && atMaxSpeed;
    if (rider.overheatWarning) rider.beepFlash = 0.3;
    else if (rider.beepFlash > 0) rider.beepFlash -= dt;

    if (game.batt <= 0 && !rider.crashed && !rider.cutoutFlying && atMaxSpeed) {
      game.batt = 0;
      rider.cutoutFlying = true;
      rider.cutoutTimer = 0.5;
    }
  }

  function updateRider(dt) {
    if (rider.crashed) {
      rider.crashTimer -= dt;
      rider.wheelAngle += dt * 2;
      return;
    }
    if (rider.cutoutFlying) {
      rider.cutoutTimer -= dt;
      rider.wheelAngle += dt * 25;
      if (rider.cutoutTimer <= 0) {
        rider.cutoutFlying = false;
        crashRider("cutout");
      }
      return;
    }

    rider.lean += (input.sliderT - rider.lean) * Math.min(1, dt * 6);
    rider.laneT += (rider.targetLaneT - rider.laneT) * Math.min(1, dt * 10);

    updateBattery(dt);

    if (rider.airborne) {
      rider.vy += JUMP_G * dt;
      rider.y += rider.vy * dt;
      if (rider.trickFlashT <= 0 && Math.abs(game.speedNorm) > 0.65) {
        rider.trickFlashLbl = "air!";
        rider.trickFlashT = 0.55;
      }
      if (rider.y >= 0) {
        rider.y = 0;
        rider.vy = 0;
        if (rider.landingOutcome === "clean") {
          rider.airborne = false;
          rider.landingOutcome = null;
        } else {
          crashRider("tooSlow");
        }
      }
    } else if (!rider.onRamp) {
      rider.y = 0;
    }

    if (rider.trickFlashT > 0) rider.trickFlashT -= dt;
    rider.wobble += dt * 5.2;
    rider.wheelAngle += dt * (game.speedNorm * 16 + (game.speedNorm >= 0 ? 6 : -6));
    if (rider.hitFlash > 0) rider.hitFlash -= dt;
  }

  function update(dt) {
    if (rider.cutoutFlying) {
      updateRider(dt);
      updateHUD();
      return;
    }

    const t = input.sliderT;
    const active = Math.abs(t) > DZ;
    const slope = hillSlope(game.dist);

    // Slider and hill behavior:
    // - Uphill tries to slow/pull you back.
    // - Downhill adds speed.
    // - Right slider gives power, left slider brakes/slows.
    const power = t > DZ ? t : 0;
    const brake = t < -DZ ? -t : 0;

    if (power > 0) {
      const target = 0.18 + power * 1.16;
      game.speedNorm += (target - game.speedNorm) * Math.min(1, dt * 3.2);
    } else if (brake > 0) {
      game.speedNorm -= brake * (1.45 + Math.abs(game.speedNorm) * 0.35) * dt;
    } else {
      const decay = Math.sign(game.speedNorm) * Math.min(Math.abs(game.speedNorm), 0.45 * dt);
      game.speedNorm -= decay;
    }

    if (slope > 0.02) {
      // Climbing: gravity slows you, so the slider naturally feels like it wants left/back.
      game.speedNorm -= slope * 0.52 * dt;
    } else if (slope < -0.02) {
      // Descending: gravity speeds you up unless you hold SLOW.
      game.speedNorm += (-slope) * 0.82 * dt;
    }

    game.speedNorm = clamp(game.speedNorm, MAX_REV, 1.32);

    if (Math.abs(game.speedNorm) < 0.012 && !active && !rider.airborne && !rider.crashed) {
      rider.stationaryT += dt;
      if (rider.stationaryT >= STILL_FALL) crashRider("fellOver");
    } else {
      rider.stationaryT = 0;
    }

    const scroll = game.baseScroll * game.speedNorm;
    world.scrollX += scroll * dt;
    game.dist += scroll * dt * 0.06;
    if (game.dist < 0) game.dist = 0;

    const newZone = Math.floor(game.dist / ZONE_LEN) % ZONES.length;
    if (newZone !== game.zoneIdx) {
      game.zoneIdx = newZone;
      game.cpZone = newZone;
      game.cpDist = Math.floor(game.dist / ZONE_LEN) * ZONE_LEN;
      resetWorldLists();
    }

    updateRider(dt);
    updateRamps(dt);
    updateCoins(dt);
    updateFinish(dt);
    updateHUD();
  }

  function crashRider(reason) {
    if (rider.crashed) return;
    rider.crashed = true;
    rider.crashReason = reason || "hit";
    rider.crashTimer = 0.9;
    rider.hitFlash = 0.6;
    if (navigator.vibrate) navigator.vibrate([60, 40, 90]);
    game.lives--;
    endGame(game.lives <= 0);
  }

  function endGame(isOver) {
    state = ST.CRASH;
    const dist = Math.floor(game.dist);
    if (dist > game.best) {
      game.best = dist;
      lsSet("eucdrift_best", String(game.best));
    }

    const cause = {
      tooSlow:"Too slow off the ramp.",
      cutout:"Motor cutout â€” you pushed it too long.",
      fellOver:"You stopped rolling and tipped over.",
      hit:"Wipeout."
    }[rider.crashReason] || "Wipeout.";

    document.getElementById("eucOverMsg").textContent = isOver ? `${cause} Ride over.` : `${cause} Restarting at this zone.`;
    document.getElementById("eucOverDist").textContent = dist;
    document.getElementById("eucBest").textContent = game.best;
    document.getElementById("eucTopSpd").textContent = game.topSpeed + " mph";
    document.getElementById("eucLivesOver").textContent = "â¤ï¸".repeat(game.lives) + "ðŸ–¤".repeat(3 - game.lives);
    document.getElementById("eucRetryBtn").textContent = isOver ? "RIDE AGAIN" : "GET BACK ON";

    setTimeout(() => {
      if (destroyed) return;
      state = ST.OVER;
      document.getElementById("eucOver").classList.remove("eucHide");
    }, 850);
  }

  function resetRider() {
    rider.lane = LANE_BOTTOM;
    rider.laneT = 1;
    rider.targetLaneT = 1;
    rider.y = 0;
    rider.vy = 0;
    rider.airborne = false;
    rider.landingOutcome = null;
    rider.lean = 0;
    rider.wheelAngle = 0;
    rider.wobble = 0;
    rider.hitFlash = 0;
    rider.sitT = 0;
    rider.trickFlashT = 0;
    rider.crashed = false;
    rider.crashTimer = 0;
    rider.crashReason = "";
    rider.stationaryT = 0;
    rider.onRamp = null;
    rider.cutoutFlying = false;
    rider.cutoutTimer = 0;
    rider.overheatWarning = false;
    rider.beepFlash = 0;
  }

  function respawn() {
    // Fixed: restart at beginning of the current reached zone, not always city.
    game.dist = game.cpDist;
    world.scrollX = game.cpDist / (game.baseScroll * 0.06);
    game.speedNorm = 0;
    game.zoneIdx = game.cpZone;
    game.batt = 1;
    resetWorldLists();
    resetRider();
    rider.x = Math.min(110, W * 0.22);
    document.getElementById("eucOver").classList.add("eucHide");
    state = ST.PLAY;
    lastTime = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function startGame() {
    game.dist = 0;
    game.speedNorm = 0;
    game.topSpeed = 0;
    game.coins = 0;
    game.batt = 1;
    game.lives = 3;
    game.cpZone = 0;
    game.cpDist = 0;
    game.zonesFinished = 0;
    game.finishWorldX = -1;
    game.finishCrossed = false;
    game.finishFlash = 0;
    game.nextCoinAt = 600;
    game.zoneIdx = 0;
    world.scrollX = 0;
    nextRampAt = 1150;
    nearMissFlash = null;
    resetWorldLists();
    resetRider();
    rider.x = Math.min(110, W * 0.22);
    input.sliderT = 0;
    updatePuck(0);

    document.getElementById("eucStart").classList.add("eucHide");
    document.getElementById("eucOver").classList.add("eucHide");
    document.getElementById("eucMedal").classList.add("eucHide");
    document.getElementById("eucPause").classList.add("eucHide");

    state = ST.PLAY;
    lastTime = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function updateFinish(dt) {
    if (game.finishFlash > 0) game.finishFlash -= dt;
    const posInZone = ((game.dist % ZONE_LEN) + ZONE_LEN) % ZONE_LEN;
    const zoneStart = Math.floor(game.dist / ZONE_LEN) * ZONE_LEN;

    if (posInZone > FINISH_OFFSET - 210 && !game.finishCrossed) {
      if (game.finishWorldX < zoneStart) {
        game.finishWorldX = (zoneStart + FINISH_OFFSET) / (game.baseScroll * 0.06);
      }
    }
    if (posInZone < 60 && game.finishCrossed) {
      game.finishCrossed = false;
      game.finishWorldX = -1;
    }

    if (!game.finishCrossed && game.finishWorldX > 0) {
      const fsx = game.finishWorldX - world.scrollX;
      if (fsx < rider.x && !rider.crashed) {
        game.finishCrossed = true;
        game.zonesFinished++;
        game.finishFlash = 2.2;
        const bonus = 50 * game.zonesFinished;
        game.coins += bonus;
        game.dist += bonus * 0.5;

        // Reached next zone checkpoint.
        const nextZone = Math.min(2, game.zoneIdx + 1);
        game.cpZone = nextZone;
        game.cpDist = nextZone * ZONE_LEN;

        if (game.zoneIdx === 2 && game.zonesFinished >= 3) {
          setTimeout(() => { if (!destroyed) showMedal(); }, 1800);
        }
      }
    }
  }

  function showMedal() {
    state = ST.MEDAL;
    const totalScore = Math.floor(game.dist) + game.coins;
    let medal = "ðŸ¥‰", name = "BRONZE", color = "#cd7f32";
    if (totalScore >= MEDAL_GOLD) { medal = "âš¡"; name = "GOLD"; color = "#ffd700"; }
    else if (totalScore >= MEDAL_SILVER) { medal = "ðŸ¥ˆ"; name = "SILVER"; color = "#c0c0c0"; }

    document.getElementById("eucMedalAward").textContent = medal;
    document.getElementById("eucMedalName").textContent = name + " MEDAL";
    document.getElementById("eucMedalName").style.color = color;
    document.getElementById("eucMedalScore").textContent = totalScore;
    document.getElementById("eucMedalDist").textContent = Math.floor(game.dist) + " ft";
    document.getElementById("eucMedalCoins").textContent = game.coins;
    if (totalScore > game.best) lsSet("eucdrift_best", String(totalScore));
    document.getElementById("eucMedal").classList.remove("eucHide");
  }

  function updateHUD() {
    const mph = Math.round(game.speedNorm * 50);
    if (Math.abs(mph) > game.topSpeed) game.topSpeed = Math.abs(mph);

    const sv = document.getElementById("eucSpeedVal");
    if (sv) sv.innerHTML = Math.abs(mph) + ' <span style="font-size:12px;font-weight:700">' + (mph < 0 ? "mph REV" : "mph") + "</span>";
    const sc = document.getElementById("eucScore");
    if (sc) sc.textContent = Math.floor(game.dist);
    const zl = document.getElementById("eucZoneLabel");
    if (zl) zl.textContent = zoneLabel();
    const lh = document.getElementById("eucLivesHud");
    if (lh) lh.textContent = "â¤ï¸".repeat(game.lives) + "ðŸ–¤".repeat(3 - game.lives);
    const ch = document.getElementById("eucCoinHud");
    if (ch) ch.textContent = "âš¡ " + game.coins;

    const bf = document.getElementById("eucBattFill");
    if (bf) {
      bf.style.width = Math.round(game.batt * 100) + "%";
      bf.style.background = game.batt > 0.5 ? "#4fd1c5" : game.batt > 0.25 ? "#ffd700" : "#ff4444";
    }

    const mb = document.getElementById("eucMotorBanner");
    if (mb) mb.classList.toggle("eucHide", !rider.overheatWarning);

    const hb = document.getElementById("eucHillBanner");
    if (hb) {
      const s = hillSlope(game.dist);
      if (s > 0.05) {
        hb.textContent = "â–² UPHILL â€” PUSH FAST";
        hb.className = "climb";
      } else if (s < -0.05) {
        hb.textContent = "â–¼ DOWNHILL â€” USE SLOW";
        hb.className = "descend";
      } else {
        hb.className = "eucHide";
      }
    }
  }

  function zoneSky(z) {
    if (z === "city") return ["#1b2838", "#2c4156"];
    if (z === "countryside") return ["#2b3a4f", "#5a7a8c"];
    return ["#221b30", "#3d2f55"];
  }

  function drawBackground() {
    const zone = currentZone();
    const [st, sb] = zoneSky(zone);
    const gy = groundY();
    const g = ctx.createLinearGradient(0, 0, 0, gy);
    g.addColorStop(0, st);
    g.addColorStop(1, sb);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, gy);

    if (zone === "city") drawCityBackground();
    else if (zone === "countryside") drawForestBackground();
    else drawTrackBackground();

    drawRoadBand();
  }

  function drawCityBackground() {
    for (let i = -2; i < 12; i++) {
      const x = ((i * 75 - world.scrollX * 0.35) % (W + 160)) - 80;
      const h = 80 + ((i * 47) % 160);
      ctx.fillStyle = i % 2 ? "#283c4f" : "#31465c";
      ctx.fillRect(x, groundY() - h, 52, h);
      ctx.fillStyle = "rgba(255,214,130,.45)";
      for (let yy = groundY() - h + 12; yy < groundY() - 8; yy += 18) {
        for (let xx = x + 8; xx < x + 46; xx += 14) {
          if ((Math.floor(xx + yy) % 3) !== 0) ctx.fillRect(xx, yy, 5, 8);
        }
      }
    }
  }

  function drawForestBackground() {
    ctx.fillStyle = "#385f41";
    for (let i = -2; i < 10; i++) {
      const x = ((i * 150 - world.scrollX * 0.18) % (W + 300)) - 150;
      const h = 55 + (i * 23 % 45);
      ctx.beginPath();
      ctx.moveTo(x, groundY());
      ctx.quadraticCurveTo(x + 80, groundY() - h, x + 170, groundY());
      ctx.closePath();
      ctx.fill();
    }

    for (let i = -4; i < 18; i++) {
      const x = ((i * 48 - world.scrollX * 0.55) % (W + 140)) - 70;
      const h = 70 + ((i * 19) % 60);
      const by = groundY();
      ctx.strokeStyle = "#3f3327";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x, by);
      ctx.lineTo(x, by - h * 0.58);
      ctx.stroke();
      ctx.fillStyle = "#456b3e";
      ctx.beginPath();
      ctx.arc(x, by - h * 0.72, h * 0.23, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTrackBackground() {
    ctx.fillStyle = "rgba(120,80,200,.18)";
    ctx.fillRect(0, groundY() - 110, W, 40);
    for (let i = -2; i < 14; i++) {
      const x = ((i * 82 - world.scrollX * 0.42) % (W + 160)) - 80;
      ctx.fillStyle = i % 2 ? "#352a4a" : "#40305d";
      ctx.fillRect(x, groundY() - 88, 64, 42);
      ctx.fillStyle = "#caa6ff";
      for (let c = 0; c < 6; c++) {
        ctx.beginPath();
        ctx.arc(x + 8 + c * 9, groundY() - 76 + (c % 3) * 10, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawRoadBand() {
    const zone = currentZone();
    const sp = laneGap();
    const bandTop = groundY() - sp * 0.5 - 26;
    const bandH = sp + 52;
    const bandMid = bandTop + bandH / 2;

    ctx.fillStyle = zone === "track" ? "#191220" : zone === "countryside" ? "#24341f" : "#15191d";
    ctx.fillRect(0, bandTop + bandH, W, H - (bandTop + bandH));

    ctx.fillStyle = zone === "track" ? "#2a2138" : zone === "countryside" ? "#34402a" : "#21262b";
    ctx.fillRect(0, bandTop, W, bandH);

    ctx.fillStyle = zone === "track" ? "#caa6ff" : "#7a8a92";
    ctx.fillRect(0, bandTop, W, 3);
    ctx.fillRect(0, bandTop + bandH - 3, W, 3);

    ctx.fillStyle = zone === "track" ? "#ffd86a" : zone === "countryside" ? "#b68b54" : "#e8c34a";
    const dw = 30, gw = 20, per = dw + gw, off = world.scrollX % per;
    for (let x = -off; x < W; x += per) ctx.fillRect(x, bandMid - 2, dw, 4);

    const sl = hillSlope(game.dist);
    if (sl > 0.02) {
      ctx.fillStyle = `rgba(255,170,60,${Math.min(0.22, sl * 0.26)})`;
      ctx.fillRect(0, bandTop, W, bandH);
    } else if (sl < -0.02) {
      ctx.fillStyle = `rgba(80,160,255,${Math.min(0.22, -sl * 0.26)})`;
      ctx.fillRect(0, bandTop, W, bandH);
    }
  }

  function drawRamps() {
    ramps.forEach(o => {
      const sx = o.x - world.scrollX;
      if (sx > W + 160 || sx < -260) return;
      const gy = groundY() + laneOffset(o.lane === LANE_TOP ? 0 : 1);
      const rw = o.w, rh = o.h;
      const isDirt = o.variant === "dirt";
      const isTrack = o.variant === "trackRamp";

      ctx.beginPath();
      ctx.moveTo(sx, gy);
      ctx.lineTo(sx + rw, gy);
      ctx.lineTo(sx + rw, gy - rh);
      ctx.lineTo(sx + rw * 0.82, gy - rh * 0.18);
      ctx.closePath();
      ctx.fillStyle = isDirt ? "#4a3318" : isTrack ? "#32254a" : "#3a4046";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(sx, gy);
      ctx.lineTo(sx + rw, gy - rh);
      ctx.lineTo(sx + rw, gy);
      ctx.closePath();
      ctx.fillStyle = isDirt ? "#8a5a2e" : isTrack ? "#caa6ff" : "#ffb238";
      ctx.fill();

      ctx.strokeStyle = isDirt ? "#d9b27a" : isTrack ? "#ffffff" : "#fff3d6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, gy);
      ctx.lineTo(sx + rw, gy - rh);
      ctx.lineTo(sx + rw, gy);
      ctx.stroke();

      ctx.fillStyle = isDirt ? "rgba(217,178,122,.85)" : isTrack ? "rgba(202,166,255,.85)" : "rgba(255,178,56,.85)";
      ctx.beginPath();
      ctx.moveTo(sx + rw * 0.78, gy - rh - 10);
      ctx.lineTo(sx + rw * 0.78 + 9, gy - rh - 20);
      ctx.lineTo(sx + rw * 0.78 + 18, gy - rh - 10);
      ctx.closePath();
      ctx.fill();
    });
  }

  function drawCoins() {
    const zone = currentZone();
    const zc = zone === "city" ? {f:"#ffd700", r:"#ffaa00", s:"rgba(255,255,220,.8)"} :
      zone === "countryside" ? {f:"#7ec850", r:"#5a9e38", s:"rgba(200,255,180,.7)"} :
      {f:"#c084ff", r:"#8040cc", s:"rgba(220,180,255,.8)"};

    coins.forEach(c => {
      if (c.collected) return;
      const sx = c.x - world.scrollX;
      if (sx > W + 20 || sx < -20) return;
      const gy = groundY() + laneOffset(c.lane === LANE_TOP ? 0 : 1);
      const cy = gy - 22 + Math.sin(c.bobT) * 4 + (c.airY || 0);
      ctx.beginPath();
      ctx.arc(sx, cy, 9, 0, Math.PI * 2);
      ctx.fillStyle = zc.f;
      ctx.fill();
      ctx.strokeStyle = zc.r;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = zc.s;
      ctx.beginPath();
      ctx.arc(sx - 2.5, cy - 2.5, 3.4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawFinish() {
    if (game.finishWorldX < 0) return;
    const sx = game.finishWorldX - world.scrollX;
    if (sx > W + 60 || sx < -60) return;
    const sp = laneGap();
    const bandTop = groundY() - sp * 0.5 - 26;
    const bandH = sp + 52;
    const sq = 14;
    const cols = Math.ceil(bandH / sq);
    for (let i = 0; i < cols; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#fff" : "#000";
      ctx.fillRect(sx - sq, bandTop + i * sq, sq, sq);
      ctx.fillStyle = i % 2 === 0 ? "#000" : "#fff";
      ctx.fillRect(sx, bandTop + i * sq, sq, sq);
    }
    ctx.fillStyle = "#aaa";
    ctx.fillRect(sx - sq - 4, bandTop - 20, 4, bandH + 20);
    ctx.fillRect(sx + sq, bandTop - 20, 4, bandH + 20);
    ctx.fillStyle = "#ff3366";
    ctx.fillRect(sx - sq - 4, bandTop - 20, sq * 2 + 8, 10);
  }

  function drawFinishFlash() {
    if (game.finishFlash <= 0) return;
    const a = Math.min(1, game.finishFlash) * 0.3;
    ctx.fillStyle = `rgba(255,215,0,${a})`;
    ctx.fillRect(0, 0, W, H);

    if (game.finishFlash > 1.2) {
      const fa = (game.finishFlash - 1.2) * 0.8;
      ctx.fillStyle = `rgba(255,255,255,${fa})`;
      ctx.font = "bold 26px -apple-system,sans-serif";
      ctx.textAlign = "center";
      const label = zoneLabel()[0].toUpperCase() + zoneLabel().slice(1);
      ctx.fillText(`âœ“ ${label} Complete!`, W / 2, H / 2 - 20);
      ctx.fillStyle = `rgba(255,215,0,${fa})`;
      ctx.font = "bold 17px -apple-system,sans-serif";
      ctx.fillText(`+${50 * game.zonesFinished} coins!`, W / 2, H / 2 + 14);
      ctx.textAlign = "left";
    }
  }

  function drawRider() {
    if (rider.crashed && rider.crashTimer <= 0) return;
    if (rider.cutoutFlying) {
      drawCutout();
      return;
    }

    const sc = rScale();
    const by = groundY() + laneOffset(rider.laneT);

    ctx.save();
    ctx.translate(rider.x, by + rider.y);

    if (rider.crashed) {
      const tumble = (0.9 - Math.max(0, rider.crashTimer)) * 4.5;
      ctx.rotate(tumble);
      ctx.globalAlpha = Math.max(0.15, rider.crashTimer / 0.9);
    }

    const hp = (!rider.airborne && !rider.crashed) ? hillSlope(game.dist) * 0.16 : 0;
    const la = rider.airborne ? 0.2 * Math.sin(performance.now() / 120) : rider.lean * 0.22 + hp;
    const bob = (!rider.airborne && !rider.crashed) ? Math.sin(rider.wobble) * 1.6 * sc : 0;
    ctx.translate(0, bob);
    ctx.rotate(la);

    const cc = riderColor;
    const pants = "#1f4f9a";
    const pantsDark = "#14356f";
    const boot = "#14356f";
    const wy = -WHEEL_R * sc;

    // Wheel
    ctx.save();
    ctx.translate(0, wy);
    ctx.rotate(rider.wheelAngle);
    ctx.beginPath();
    ctx.arc(0, 0, WHEEL_R * sc, 0, Math.PI * 2);
    ctx.fillStyle = "#2a333b";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.lineWidth = 1.6 * sc;
    ctx.stroke();
    ctx.strokeStyle = "#11161a";
    ctx.lineWidth = 2.2 * sc;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, WHEEL_R * sc * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = "#52606c";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 4.4 * sc, 0, Math.PI * 2);
    ctx.fillStyle = cc;
    ctx.fill();
    ctx.restore();

    // EUC body / shell
    ctx.save();
    ctx.translate(0, wy - 7 * sc);
    ctx.fillStyle = cc;
    ctx.beginPath();
    ctx.roundRect(-10 * sc, -22 * sc, 20 * sc, 34 * sc, 8 * sc);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.24)";
    ctx.fillRect(-7 * sc, -10 * sc, 14 * sc, 4 * sc);
    ctx.restore();

    // Footplate
    ctx.save();
    ctx.translate(0, wy);
    ctx.fillStyle = "#22282e";
    ctx.fillRect(-WHEEL_R * sc * 1.05, -3.8 * sc, WHEEL_R * sc * 2.1, 5.5 * sc);
    ctx.restore();

    const speedPose = clamp(input.sliderT, -1, 1);
    const sit = speedPose < -0.1 ? -speedPose : 0;
    const fly = speedPose > 0.35 ? (speedPose - 0.35) / 0.65 : 0;

    const hipY = wy - (34 - sit * 8) * sc;
    const kneeY = wy - (11 - sit * 8) * sc;
    const footY = wy + 2 * sc;
    const shoulderY = hipY - (36 - sit * 8) * sc;
    const tl = rider.lean * 6 * sc + fly * 10 * sc - sit * 8 * sc;
    const headY = shoulderY - 15 * sc;
    const headX = tl + rider.lean * 3 * sc;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Far leg, blue
    ctx.strokeStyle = pantsDark;
    ctx.lineWidth = 7 * sc;
    ctx.beginPath();
    ctx.moveTo(2 * sc, hipY + 2 * sc);
    ctx.quadraticCurveTo(7 * sc + rider.lean * 8 * sc, kneeY + 6 * sc, 5 * sc, footY - 2 * sc);
    ctx.stroke();

    // Near leg, blue
    ctx.strokeStyle = pants;
    ctx.lineWidth = 10 * sc;
    ctx.beginPath();
    ctx.moveTo(sc, hipY);
    ctx.quadraticCurveTo(13 * sc + rider.lean * 12 * sc, kneeY, 7 * sc, footY);
    ctx.stroke();

    // Blue boot
    ctx.fillStyle = boot;
    ctx.beginPath();
    ctx.ellipse(8 * sc, footY + 1.5 * sc, 8 * sc, 4.2 * sc, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Jacket/body
    ctx.strokeStyle = cc;
    ctx.lineWidth = 13 * sc;
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.quadraticCurveTo(tl * 0.5, (hipY + shoulderY) / 2, tl, shoulderY);
    ctx.stroke();

    ctx.strokeStyle = "rgba(0,0,0,.28)";
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    ctx.moveTo(2 * sc, hipY - 4 * sc);
    ctx.quadraticCurveTo(tl * 0.5 + 2 * sc, (hipY + shoulderY) / 2, tl + 2 * sc, shoulderY + 4 * sc);
    ctx.stroke();

    // Arms: forward Superman pose with speed, lower/back when braking
    let ex, ey, hx, hy;
    if (fly > 0) {
      ex = tl + (12 + fly * 20) * sc;
      ey = shoulderY - fly * 8 * sc;
      hx = tl + (20 + fly * 32) * sc;
      hy = shoulderY - fly * 10 * sc;
    } else if (sit > 0) {
      ex = tl + (7 - sit * 10) * sc;
      ey = shoulderY + (12 + sit * 8) * sc;
      hx = tl + (12 - sit * 18) * sc;
      hy = shoulderY + (18 + sit * 18) * sc;
    } else {
      ex = tl + 9 * sc;
      ey = shoulderY + 10 * sc;
      hx = tl + 14 * sc;
      hy = shoulderY + 16 * sc;
    }
    ctx.strokeStyle = cc;
    ctx.lineWidth = 7.5 * sc;
    ctx.beginPath();
    ctx.moveTo(tl, shoulderY + 2 * sc);
    ctx.quadraticCurveTo(ex, ey, hx, hy);
    ctx.stroke();
    ctx.fillStyle = "#e0a878";
    ctx.beginPath();
    ctx.arc(hx, hy, 3.6 * sc, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.beginPath();
    ctx.arc(headX, headY, 10.2 * sc, 0, Math.PI * 2);
    ctx.fillStyle = cc;
    ctx.fill();
    ctx.fillStyle = "#1a2024";
    ctx.beginPath();
    ctx.ellipse(headX + 3.6 * sc, headY - 0.5 * sc, 5.4 * sc, 3.4 * sc, 0.25, 0, Math.PI * 2);
    ctx.fill();

    if (rider.hitFlash > 0) {
      ctx.globalAlpha = Math.max(0, rider.hitFlash) * 0.6;
      ctx.beginPath();
      ctx.arc(headX, (headY + hipY) / 2, 44 * sc, 0, Math.PI * 2);
      ctx.fillStyle = "#ff4d4d";
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawCutout() {
    const sc = rScale();
    const by = groundY() + laneOffset(rider.laneT);
    const prog = 1 - Math.max(0, rider.cutoutTimer) / 0.5;
    const fd = prog * 70 * sc;
    const rf = Math.sin(prog * Math.PI) * -26 * sc;

    ctx.save();
    ctx.translate(rider.x - fd * 0.4, by - WHEEL_R * sc + 6 * sc * prog);
    ctx.rotate(rider.wheelAngle);
    ctx.beginPath();
    ctx.arc(0, 0, WHEEL_R * sc, 0, Math.PI * 2);
    ctx.fillStyle = "#1a2126";
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(rider.x + fd, by - 30 * sc + rf);
    ctx.rotate(0.18 + prog * 0.25);
    const cc = riderColor;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1f4f9a";
    ctx.lineWidth = 9 * sc;
    ctx.beginPath();
    ctx.moveTo(-4 * sc, 6 * sc);
    ctx.quadraticCurveTo(-22 * sc, 10 * sc, -34 * sc, 4 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2 * sc, 4 * sc);
    ctx.quadraticCurveTo(-14 * sc, -4 * sc, -28 * sc, -10 * sc);
    ctx.stroke();

    ctx.strokeStyle = cc;
    ctx.lineWidth = 13 * sc;
    ctx.beginPath();
    ctx.moveTo(0, 4 * sc);
    ctx.lineTo(24 * sc, -8 * sc);
    ctx.stroke();

    const hx = 28 * sc, hy = -12 * sc;
    ctx.beginPath();
    ctx.arc(hx, hy, 10.2 * sc, 0, Math.PI * 2);
    ctx.fillStyle = cc;
    ctx.fill();
    ctx.restore();
  }

  function drawFlashes() {
    if (rider.trickFlashT > 0) {
      const a = Math.min(1, rider.trickFlashT / 0.5);
      ctx.globalAlpha = a;
      ctx.fillStyle = "#4fd1c5";
      ctx.font = `bold ${Math.round(16 * rScale())}px -apple-system,sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(rider.trickFlashLbl, rider.x, groundY() + laneOffset(rider.laneT) + rider.y - RIDER_H * rScale() - 40);
      ctx.globalAlpha = 1;
      ctx.textAlign = "left";
    }
    if (nearMissFlash && nearMissFlash.t > 0) {
      nearMissFlash.t -= 1 / 60;
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    const sl = (!rider.airborne && !rider.crashed) ? hillSlope(game.dist) : 0;
    const tilt = sl * 0.22;
    if (tilt !== 0) {
      ctx.save();
      const py = groundY() + laneOffset(rider.laneT);
      ctx.translate(rider.x, py);
      ctx.rotate(-tilt);
      ctx.translate(-rider.x, -py);
    }
    drawBackground();
    drawFinish();
    drawCoins();
    drawRamps();
    drawRider();
    drawFlashes();
    if (tilt !== 0) ctx.restore();
    drawFinishFlash();
  }

  function idleRender() {
    rider.y = 0;
    rider.x = Math.min(110, W * 0.22);
    render();
  }

  function loop(now) {
    if (destroyed) return;
    if (state !== ST.PLAY && state !== ST.CRASH) return;
    const dt = Math.min(0.04, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    if (state === ST.PLAY) update(dt);
    else updateRider(dt);

    render();
    raf = requestAnimationFrame(loop);
  }

  on(document.getElementById("eucPlayBtn"), "click", startGame);
  on(document.getElementById("eucRetryBtn"), "click", () => { game.lives > 0 ? respawn() : startGame(); });
  on(document.getElementById("eucMedalRetry"), "click", startGame);
  on(document.getElementById("eucResumeBtn"), "click", () => {
    if (state !== ST.PAUSE) return;
    state = ST.PLAY;
    document.getElementById("eucPause").classList.add("eucHide");
    lastTime = performance.now();
    raf = requestAnimationFrame(loop);
  });
  on(document.getElementById("eucPauseBtn"), "click", () => {
    if (state !== ST.PLAY) return;
    state = ST.PAUSE;
    document.getElementById("eucPause").classList.remove("eucHide");
  });

  const bestEl = document.getElementById("eucBest");
  if (bestEl) bestEl.textContent = game.best;

  idleRender();
  updateHUD();

  window.__eucDriftCleanup = function () {
    destroyed = true;
    state = ST.MENU;
    if (raf) cancelAnimationFrame(raf);
    if (ro) { try { ro.disconnect(); } catch {} }
    cleanups.forEach(fn => { try { fn(); } catch {} });
    cleanups.length = 0;
    window.__eucDriftCleanup = null;
  };
};

(function () {
  if (typeof window.cleanupRunningGameEngine !== "function") return;
  if (window.cleanupRunningGameEngine.__eucDriftWrapped) return;
  const old = window.cleanupRunningGameEngine;
  window.cleanupRunningGameEngine = function () {
    if (window.__eucDriftCleanup) {
      try { window.__eucDriftCleanup(); } catch {}
    }
    return old.apply(this, arguments);
  };
  window.cleanupRunningGameEngine.__eucDriftWrapped = true;
})();
