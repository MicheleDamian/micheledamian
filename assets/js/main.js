(() => {
  // Umami loads asynchronously and may be blocked; never let tracking break the page.
  const track = (name, data) => {
    try {
      if (window.umami && typeof window.umami.track === "function") window.umami.track(name, data);
    } catch (_) { /* ignore */ }
  };

  // Record a page view (e.g. "/#tennis-robot", keeping any ?utm_campaign) the first time a reader reaches each project.
  // On a one-page site Umami otherwise sees a single page view per visit, so every visit
  // reads as 0 s long and a bounce. Retries for a few seconds while Umami is still loading.
  const pageview = (path, title, tries = 20) => {
    try {
      if (window.umami && typeof window.umami.track === "function") {
        window.umami.track((props) => ({ ...props, url: path, title }));
      } else if (tries > 0) {
        setTimeout(() => pageview(path, title, tries - 1), 500);
      }
    } catch (_) { /* ignore */ }
  };

  // Count the first play of each self-hosted video (add data-track="event-name" to the <video>)
  document.querySelectorAll("video[data-track]").forEach((video) => {
    let sent = false;
    video.addEventListener("play", () => {
      if (sent) return;
      sent = true;
      track(video.dataset.track);
    });
  });

  // ---------------------------------------------------------------
  // Short looping clips (<video data-loop>): play only while on screen.
  // With reduced motion, don't autoplay; show the poster and controls.
  // ---------------------------------------------------------------
  const loops = document.querySelectorAll("video[data-loop]");
  if (loops.length) {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const play = (v) => { const p = v.play(); if (p) p.catch(() => {}); };
    loops.forEach((v) => {
      if (still) {
        v.removeAttribute("autoplay");
        v.pause();
        v.controls = true;
      }
    });
    if (!still && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) e.isIntersecting ? play(e.target) : e.target.pause();
      });
      loops.forEach((v) => io.observe(v));
    }
  }

  // ---------------------------------------------------------------
  // House map: drive the car round the house, lighting up each camera's
  // view while the car is inside it. The tracking box and tag show only
  // while some camera sees it. Runs only while the map is on screen; with
  // reduced motion the map keeps its static frame (camera 2 sees the car
  // at the back gate).
  // ---------------------------------------------------------------
  const map = document.querySelector("svg.map");
  const route = map && map.querySelector("#map-route");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (route && !reduceMotion && "IntersectionObserver" in window) {
    const car = map.querySelector(".map__car");
    const body = map.querySelector(".map__car-body");
    const tag = map.querySelector(".map__tag");
    const fovs = [...map.querySelectorAll(".map__fov")].map((el) => ({
      el,
      cam: map.querySelector(`.map__cam[data-cam="${el.dataset.cam}"]`),
      x: +el.dataset.x, y: +el.dataset.y,
      dir: +el.dataset.dir, half: +el.dataset.half, range: +el.dataset.range,
    }));

    const sees = (f, p) => {
      const dx = p.x - f.x, dy = p.y - f.y;
      if (Math.hypot(dx, dy) > f.range) return false;
      const off = ((Math.atan2(dy, dx) * 180) / Math.PI - f.dir + 540) % 360 - 180;
      return Math.abs(off) <= f.half;
    };

    const SIZE = 600, BOX = 17, TAG_W = 92, TAG_H = 24;   // match the markup
    const SPEED = 95;                                    // map units per second
    const PAUSE = 1.2;                                   // seconds off the map between laps
    const total = route.getTotalLength();
    const lap = total / SPEED + PAUSE;
    let elapsed = 0, last = null, raf = 0;

    const frame = (now) => {
      if (last !== null) elapsed += Math.min(now - last, 100) / 1000;   // no jump after a stall
      last = now;

      const s = Math.min((elapsed % lap) * SPEED, total);
      const p = route.getPointAtLength(s);
      const a = route.getPointAtLength(Math.max(0, s - 1));
      const b = route.getPointAtLength(Math.min(total, s + 1));
      const heading = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

      car.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      body.setAttribute("transform", `rotate(${heading.toFixed(1)})`);

      let seen = null;
      for (const f of fovs) {
        const on = !seen && sees(f, p);
        if (on) seen = f;
        f.el.classList.toggle("is-active", on);
        f.cam.classList.toggle("is-active", on);
      }
      map.classList.toggle("is-seen", !!seen);

      if (seen) {
        let tx = p.x - BOX, ty = p.y - BOX - TAG_H;
        if (tx + TAG_W > SIZE - 6) tx = p.x + BOX - TAG_W;
        if (ty < 6) ty = p.y + BOX;
        tag.setAttribute("transform", `translate(${tx.toFixed(1)} ${ty.toFixed(1)})`);
      }

      raf = requestAnimationFrame(frame);
    };

    new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      last = null;
      if (entry.isIntersecting) raf = requestAnimationFrame(frame);
    }).observe(map);
  }

  // ---------------------------------------------------------------
  // Project rail (scrollspy)
  // Built from every <article class="project" id="..." data-short="...">,
  // so a new project shows up in the rail with no extra markup.
  // Each project gets a bar that fills as you read through it (in the rail,
  // and under its link in the top nav, so it shows at every width); the
  // project under the reading line is highlighted in the rail and the nav.
  // ---------------------------------------------------------------
  const projects = [...document.querySelectorAll("article.project[id]")];
  const rail = document.querySelector(".rail");
  const work = document.getElementById("work");
  if (!projects.length || !rail || !work) return;

  const list = rail.querySelector("ol");
  const navLinks = new Map(
    [...document.querySelectorAll('.nav__links a[href^="#"]')].map((a) => [a.getAttribute("href").slice(1), a])
  );

  const items = projects.map((project) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "rail__link";
    a.href = "#" + project.id;

    const bar = document.createElement("span");
    bar.className = "rail__bar";
    const fill = document.createElement("span");
    fill.className = "rail__fill";
    bar.appendChild(fill);

    const label = document.createElement("span");
    label.className = "rail__label";
    label.textContent = project.dataset.short || project.id;

    a.append(bar, label);
    li.appendChild(a);
    list.appendChild(li);
    return { project, a, fill, nav: navLinks.get(project.id) };
  });

  const setActive = (el, on) => {
    if (!el) return;
    el.classList.toggle("is-active", on);
    if (on) el.setAttribute("aria-current", "true");
    else el.removeAttribute("aria-current");
  };

  // Projects already recorded as page views. The one a visitor landed on (a short link or
  // "#" link) is already in Umami's own first page view, so it isn't sent twice.
  const viewed = new Set([location.hash.slice(1)]);

  let queued = false;

  const update = () => {
    queued = false;
    const vh = window.innerHeight;
    const line = vh * 0.4;          // the "reading line", 40% down the screen
    let active = null;

    for (const item of items) {
      const r = item.project.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (line - r.top) / r.height));
      item.fill.style.transform = `scaleY(${progress})`;
      if (item.nav) item.nav.style.setProperty("--progress", progress);
      if (r.top <= line && r.bottom > line) active = item;
    }

    if (active && !viewed.has(active.project.id)) {
      viewed.add(active.project.id);
      pageview("/" + location.search + "#" + active.project.id, active.project.dataset.short || active.project.id);
    }

    for (const item of items) {
      setActive(item.a, item === active);
      setActive(item.nav, item === active);
    }

    // Only show the rail while the projects are on screen, not over the hero
    const w = work.getBoundingClientRect();
    rail.classList.toggle("is-visible", w.top < vh * 0.5 && w.bottom > vh * 0.5);
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  update();
})();
