(() => {
  // Umami loads asynchronously and may be blocked; never let tracking break the page.
  const track = (name, data) => {
    try {
      if (window.umami && typeof window.umami.track === "function") window.umami.track(name, data);
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

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  // ---------------------------------------------------------------
  // Project rail (scrollspy)
  // Built from every <article class="project" id="..." data-short="...">,
  // so a new project shows up in the rail with no extra markup.
  // Each project gets a bar that fills as you read through it; the
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
      if (r.top <= line && r.bottom > line) active = item;
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
