// Pixore website: the wanderers on the hero grass. Dressed Pixore characters (real rig renders from
// scripts/tools/export_site_sprites.gd: img/hero/walk_<name>.png + idle_<name>.png, 8 frames of 48 x 64, facing
// right) stroll in from either side, stop now and then, sometimes turn round, and wander off. Click one: it bursts
// into its own pixels (every opaque pixel of the frame on screen flies out, falls and fades), and someone new comes.
(function () {
  "use strict";
  const { hero, getK } = window.PIXORE_HERO;
  const NAMES = ["barnaby", "pirate", "forager", "chef", "witch", "astronaut", "frog", "knight", "prince",
    "skier", "ronin", "neon", "cocoa", "polar"];
  const CW = 48, CH = 64, FR = 8, MAX = 5;
  const stage = document.getElementById("walkers");
  const fx = document.createElement("canvas");
  fx.className = "burst";
  hero.appendChild(fx);
  const fctx = fx.getContext("2d");
  const rnd = (a, b) => a + Math.random() * (b - a);

  // the strips' pixels, for the bursts: name -> { walk: ImageData, idle: ImageData }
  const pixels = {};
  function loadPixels(name) {
    if (pixels[name]) return;
    pixels[name] = {};
    for (const anim of ["walk", "idle"]) {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement("canvas");
        c.width = im.width;
        c.height = im.height;
        const x = c.getContext("2d");
        x.drawImage(im, 0, 0);
        try { pixels[name][anim] = x.getImageData(0, 0, im.width, im.height); } catch (e) { /* file:// preview */ }
      };
      im.src = "img/hero/" + anim + "_" + name + ".png";
    }
  }

  const walkers = [];
  let lastName = "";
  function spawn(at) {
    if (walkers.length >= MAX) return null;
    const k = getK();
    let name;
    let tries = 0;
    do { name = NAMES[Math.floor(Math.random() * NAMES.length)]; tries++; }
    while ((name === lastName || walkers.some((w) => w.name === name)) && tries < 30);
    lastName = name;
    loadPixels(name);
    const el = document.createElement("div");
    el.className = "walker";
    stage.appendChild(el);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const w = {
      name, el, dir,
      x: at !== undefined ? at : (dir > 0 ? -CW * k : stage.clientWidth),
      speed: rnd(16, 30), state: "walk", t: rnd(2.5, 7), frame: 0, ft: Math.random() * FR, anim: "",
    };
    el.addEventListener("click", () => burst(w));
    walkers.push(w);
    return w;
  }

  function setAnim(w, anim) {
    if (w.anim === anim) return;
    w.anim = anim;
    w.el.style.backgroundImage = 'url("img/hero/' + anim + "_" + w.name + '.png")';
  }

  function remove(w) {
    w.el.remove();
    const i = walkers.indexOf(w);
    if (i >= 0) walkers.splice(i, 1);
  }

  const parts = [];
  function burst(w) {
    const k = getK();
    const data = pixels[w.name] && pixels[w.name][w.anim];
    const r = w.el.getBoundingClientRect();
    const hr = hero.getBoundingClientRect();
    const ox = r.left - hr.left;
    const oy = r.top - hr.top;
    // POOF (Leevi 2026-11-26: "less pixels, like a POOF!"): a few chunky bits of the character (every 4th pixel,
    // 3 px chunks) pop out, plus a quick white smoke puff swelling from the middle
    if (data) {
      for (let py = 2; py < CH; py += 4) {
        for (let px = 2; px < CW; px += 4) {
          const i = (py * data.width + w.frame * CW + px) * 4;
          if (data.data[i + 3] < 128) continue;
          const sx = w.dir > 0 ? px : CW - 1 - px;   // the sprite is mirrored when walking left
          const dx = sx - CW / 2;
          const dy = py - CH * 0.6;
          parts.push({
            x: ox + sx * k, y: oy + py * k, size: 3,
            vx: (dx * 6 + rnd(-50, 50)) * k / 2,
            vy: (dy * 3 - rnd(120, 260)) * k / 2,
            c: "rgb(" + data.data[i] + "," + data.data[i + 1] + "," + data.data[i + 2] + ")",
            life: rnd(0.35, 0.6), grav: true,
          });
        }
      }
    }
    const cx = ox + (CW / 2) * k;
    const cy = oy + CH * 0.62 * k;
    for (let n = 0; n < 9; n++) {   // the smoke puff: round-ish pixel balls drifting out, growing, then gone
      const a = (n / 9) * Math.PI * 2 + rnd(-0.3, 0.3);
      const sp = rnd(40, 90) * k / 2;
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - 20 * k / 2, puff: true,
        r0: rnd(3, 5), r1: rnd(7, 11), life: rnd(0.3, 0.45), max: 0.45, c: n % 3 === 0 ? "#e9eef2" : "#ffffff" });
    }
    remove(w);
    setTimeout(() => spawn(), rnd(1500, 4000));
  }

  let last = performance.now();
  let nextSpawn = 0;
  function tick(now) {
    const k = getK();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (now > nextSpawn) { spawn(); nextSpawn = now + rnd(2500, 6000); }
    const width = stage.clientWidth;
    for (const w of walkers.slice()) {
      w.t -= dt;
      if (w.t <= 0) {   // walk <-> stand still; sometimes turn round when setting off again
        if (w.state === "walk") { w.state = "idle"; w.t = rnd(1.5, 4.5); }
        else { w.state = "walk"; w.t = rnd(2.5, 8); if (Math.random() < 0.3) w.dir = -w.dir; }
      }
      setAnim(w, w.state);
      w.ft += dt * (w.state === "walk" ? 10 : 4);
      w.frame = Math.floor(w.ft) % FR;
      if (w.state === "walk") w.x += w.dir * w.speed * k * dt;
      if (w.x < -CW * k * 1.5 || w.x > width + CW * k * 0.5) { remove(w); continue; }
      w.el.style.transform = "translate3d(" + Math.round(w.x) + "px, 0, 0) scaleX(" + w.dir + ")";
      w.el.style.backgroundPositionX = -w.frame * CW * k + "px";
    }
    if (fx.width !== hero.clientWidth || fx.height !== hero.clientHeight) {
      fx.width = hero.clientWidth;
      fx.height = hero.clientHeight;
    }
    fctx.clearRect(0, 0, fx.width, fx.height);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      if (p.grav) p.vy += 900 * dt * k / 2;
      else { p.vx *= 0.9; p.vy *= 0.9; }   // smoke slows down
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      fctx.fillStyle = p.c;
      if (p.puff) {   // a pixel-stepped disc (whole art pixels) growing from r0 to r1
        const t = 1 - p.life / p.max;
        const r = Math.round(p.r0 + (p.r1 - p.r0) * t);
        fctx.globalAlpha = Math.min(1, p.life * 5);
        for (let yy = -r; yy <= r; yy++) {
          const half = Math.floor(Math.sqrt(r * r - yy * yy));
          fctx.fillRect(Math.round(p.x) - half * k, Math.round(p.y) + yy * k, (half * 2 + 1) * k, k);
        }
      } else {
        fctx.globalAlpha = Math.min(1, p.life * 4);
        fctx.fillRect(Math.round(p.x), Math.round(p.y), p.size * k, p.size * k);
      }
    }
    fctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }

  // two already on the grass when the page opens
  spawn(stage.clientWidth * 0.18);
  spawn(stage.clientWidth * 0.68);
  requestAnimationFrame(tick);
})();
