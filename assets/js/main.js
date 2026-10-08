(() => {
  // Umami loads asynchronously and may be blocked; never let tracking break the page.
  const track = (name, data) => {
    try {
      if (window.umami && typeof window.umami.track === "function") window.umami.track(name, data);
    } catch (_) { /* ignore */ }
  };

  // Record a page view for a section of this one-page site (e.g. "/#tennis-robot", keeping any
  // ?utm_campaign). Retries for a few seconds while Umami is still loading.
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

    const SIZE = 600, BOX = 17, TAG_W = 93;              // match the markup
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
        let tx = p.x - BOX - 6, ty = p.y - BOX - 28;      // label floats above the brackets
        if (tx + TAG_W > SIZE - 6) tx = p.x + BOX + 6 - TAG_W;
        if (ty < 6) ty = p.y + BOX + 4;
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

  // ---------------------------------------------------------------
  // Time per section, for Umami. Sections: "top" (the opening screen) and each project.
  // - A section counts once it has stayed under the reading line for 1 s, so sections
  //   scrolled past on the way somewhere else don't count. Entering one records a page view
  //   for it ("/", "/#security-agent", ...); the landing section is Umami's own page view.
  // - Leaving a section records "time-<section>" with {seconds} (time with the page visible).
  //   Umami shows the total, average and median seconds of each event.
  // - Closing the page records "page-left" with {section, seconds}: the last section and the
  //   total visible time of the visit. Some mobile browsers (e.g. iOS Safari) don't send it
  //   when the app is swiped away; the section times are still sent when the page is hidden.
  // ---------------------------------------------------------------
  const DWELL = 1000;
  const lastId = items[items.length - 1].project.id;
  const secs = (ms) => Math.round(ms / 100) / 10;
  const urlOf = (id) => "/" + location.search + (id === "top" ? "" : "#" + id);
  const titleOf = (id) => id === "top" ? document.title : (document.getElementById(id).dataset.short || id);

  let current = null;   // { id, since }: the section being read; since = null while hidden
  let pending = null;   // { id, since, timer }: a section waiting out the 1 s
  let total = 0;        // visible ms over the whole visit
  let left = false;

  const cancelPending = () => {
    if (pending) clearTimeout(pending.timer);
    pending = null;
  };

  const closeCurrent = (until) => {
    if (!current || current.since === null) return;
    const ms = until - current.since;
    current.since = null;
    total += ms;
    if (ms >= 500) track("time-" + current.id, { seconds: secs(ms) });
  };

  const observe = (id) => {
    if (!id || left || document.hidden) return;
    if (!current) { current = { id, since: performance.now() }; return; }
    if (id === current.id) { cancelPending(); return; }
    if (pending && pending.id === id) return;
    cancelPending();
    const since = performance.now();
    pending = {
      id,
      since,
      timer: setTimeout(() => {
        pending = null;
        closeCurrent(since);
        current = { id, since };
        pageview(urlOf(id), titleOf(id));
      }, DWELL),
    };
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelPending();
      closeCurrent(performance.now());
    } else if (current && !left) {
      current.since = performance.now();
      schedule();
    }
  });

  window.addEventListener("pagehide", () => {
    if (left) return;
    left = true;
    cancelPending();
    closeCurrent(performance.now());
    if (current) track("page-left", { section: current.id, seconds: secs(total) });
  });

  // Back from the browser's back/forward cache: the same visit carries on
  window.addEventListener("pageshow", (e) => {
    if (!e.persisted || !current) return;
    left = false;
    current.since = performance.now();
  });

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

    for (const item of items) {
      setActive(item.a, item === active);
      setActive(item.nav, item === active);
    }

    // Only show the rail while the projects are on screen, not over the hero
    const w = work.getBoundingClientRect();
    rail.classList.toggle("is-visible", w.top < vh * 0.5 && w.bottom > vh * 0.5);

    // Below the last project (the footer) still counts as reading it
    observe(active ? active.project.id : w.top > line ? "top" : lastId);
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
