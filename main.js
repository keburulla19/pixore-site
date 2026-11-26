// Pixore website: the hero (the game's menu art, drifting clouds), walking characters, screenshot carousels, news,
// scroll fade-ins. Pixel art is always drawn at a whole-number scale with nearest-neighbour filtering.
(function () {
  "use strict";
  const root = document.documentElement;

  // ── links + texts from site.js ────────────────────────────────────────────────────────────────────────────────
  const file = (f) => SITE.repo.startsWith("OWNER/") ? "#download" : `https://github.com/${SITE.repo}/releases/latest/download/${f}`;
  const links = {
    windows: "#download", android: "#download",                       // hero icons: to the install steps
    "windows-file": file(SITE.windows.file), "android-file": file(SITE.android.file),
    discord: SITE.discord,
  };
  document.querySelectorAll("[data-link]").forEach((a) => { if (links[a.dataset.link]) a.href = links[a.dataset.link]; });

  // before the launch the download buttons count down instead of downloading; at the launch they switch by themselves
  const launch = SITE.launch ? new Date(SITE.launch).getTime() : 0;
  const dlButtons = [...document.querySelectorAll('[data-link="windows-file"], [data-link="android-file"]')];
  const label = dlButtons.map((b) => b.textContent);
  function countdown() {
    const left = launch - Date.now();
    if (left <= 0) {
      dlButtons.forEach((b, i) => { b.textContent = label[i]; b.href = links[b.dataset.link]; b.classList.remove("btn-wait"); });
      document.querySelectorAll(".launch-note").forEach((n) => n.remove());
      return;
    }
    const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000), sec = Math.floor((left % 60000) / 1000);
    const txt = h > 0 ? "Opens in " + h + "h " + m + "m" : "Opens in " + m + "m " + sec + "s";
    dlButtons.forEach((b) => { b.textContent = txt; b.removeAttribute("href"); b.classList.add("btn-wait"); });
    setTimeout(countdown, 1000);
  }
  if (launch) countdown();
  const texts = { version: SITE.version, "windows-size": SITE.windows.size, "android-size": SITE.android.size };
  document.querySelectorAll("[data-text]").forEach((el) => { if (texts[el.dataset.text]) el.textContent = texts[el.dataset.text]; });

  // ── the hero: integer scale, layer strips, parallax ───────────────────────────────────────────────────────────
  const W = 640, H = 360;
  const hero = document.querySelector(".hero");
  const layers = [...document.querySelectorAll(".hero .layer")];
  let k = 2;

  function fit() {
    const vw = root.clientWidth;
    // compact: the biggest whole scale where the hero is at most ~85% of the window tall (Leevi 2026-11-26: it was
    // too tall); the mirrored layer strips fill any width
    const vh = window.innerHeight;
    k = Math.max(vw < 560 ? 1 : 2, Math.min(4, Math.floor((vh * 0.85) / H)));
    root.style.setProperty("--k", String(vw < 560 ? 1 : Math.min(3, k)));
    root.style.setProperty("--art", String(k));
    hero.style.height = H * k + "px";
    for (const el of layers) {
      const name = el.dataset.layer;
      const strip = name === "clouds" ? "../menu/clouds" : `layer_${name}`;
      el.style.backgroundImage = `url("img/hero/${strip}.png")`;
      const sw = (name === "clouds" ? 1280 : 2 * W) * k;
      el.style.backgroundSize = `${sw}px ${H * k}px`;
      // the original (unmirrored) picture centred on the screen; the mirror strips carry it on both sides
      if (name !== "clouds") el.style.backgroundPositionX = `${Math.round(vw / 2 - (W * k) / 2)}px`;
      else el.style.width = `${vw + sw}px`;   // one strip wider than the screen: it slides, never runs out
    }
  }

  window.addEventListener("resize", fit);
  fit();

  // clouds drift smoothly (4 art px a second), sub-pixel like the game menu's smooth cloud shader (Leevi 2026-11-26:
  // whole-pixel steps looked like snapping)
  const clouds = document.querySelector(".layer-clouds");
  let cloudX = 0, last = performance.now();
  function drift(now) {
    cloudX = (cloudX + ((now - last) / 1000) * 4) % 1280;
    last = now;
    clouds.style.transform = `translate3d(${-(cloudX * k).toFixed(2)}px, 0, 0)`;
    requestAnimationFrame(drift);
  }
  requestAnimationFrame(drift);

  // the wanderers (walking characters, click = pixel burst) live in walkers.js
  window.PIXORE_HERO = { hero, getK: () => k };

  // ── screenshot carousels: real game pictures, arrows + slow auto-advance ──────────────────────────────────────
  document.querySelectorAll(".carousel").forEach((car) => {
    const shots = car.dataset.shots.split(",");
    let i = 0;
    car.innerHTML = shots.map((s, n) => `<img src="img/shots/${s}.png" alt="" class="${n === 0 ? "on" : ""}" loading="lazy">`).join("");
    if (shots.length < 2) return;
    const imgs = car.querySelectorAll("img");
    const show = (n) => { imgs[i].classList.remove("on"); i = (n + shots.length) % shots.length; imgs[i].classList.add("on"); };
    for (const [cls, step] of [["prev", -1], ["next", 1]]) {
      const b = document.createElement("button");
      b.className = "car-btn car-" + cls;
      b.setAttribute("aria-label", cls === "prev" ? "Previous picture" : "Next picture");
      b.addEventListener("click", () => show(i + step));
      car.appendChild(b);
    }
    setInterval(() => { if (!document.hidden) show(i + 1); }, 4500);
  });

  // ── news ──────────────────────────────────────────────────────────────────────────────────────────────────────
  const nl = document.getElementById("news-list");
  const fmt = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  for (const post of NEWS) {
    const art = document.createElement("article");
    art.className = "news-post reveal";
    if (post.image) {
      const im = document.createElement("img");
      im.className = "news-img";
      im.src = `img/shots/${post.image}.png`;
      im.alt = "";
      im.loading = "lazy";
      art.appendChild(im);
    }
    const body = document.createElement("div");
    body.className = "news-body";
    const h = document.createElement("h3");
    h.textContent = post.title;
    const d = document.createElement("p");
    d.className = "date";
    d.textContent = fmt(post.date);
    body.append(h, d);
    for (const block of post.body.split(/\n\s*\n/)) {
      const lines = block.split("\n");
      if (lines.every((l) => l.startsWith("- "))) {
        const ul = document.createElement("ul");
        for (const l of lines) { const li = document.createElement("li"); li.textContent = l.slice(2); ul.appendChild(li); }
        body.appendChild(ul);
      } else {
        const p = document.createElement("p");
        p.textContent = block;
        body.appendChild(p);
      }
    }
    art.appendChild(body);
    nl.appendChild(art);
  }

  // ── the nav: a plank bar once the hero is scrolled past ──────────────────────────────────────────────────────
  const nav = document.getElementById("nav");
  const navState = () => nav.classList.toggle("solid", window.scrollY > hero.offsetHeight - 90);
  window.addEventListener("scroll", navState, { passive: true });
  navState();

  // ── fade in as you scroll ─────────────────────────────────────────────────────────────────────────────────────
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("seen"); io.unobserve(e.target); }
  }, { threshold: 0.15 });
  // opened on a link to a section (pixore.../#download): show everything at once, no fade-in to wait for
  if (location.hash) document.querySelectorAll(".reveal").forEach((el) => el.classList.add("seen"));
  else document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();
