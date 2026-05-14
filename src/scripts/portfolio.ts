// Portfolio interactions — single controller for all client-side behaviors.
// Ported from Claude Design's app.jsx (React) → vanilla TS for Astro.

type Lang = "fr" | "en";

const LANG_STORAGE = "pa-portfolio-lang";
const SECTIONS = ["home", "about", "projets", "parcours", "extra", "contact"] as const;

// ============== LANG ==============

function getInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE);
    if (stored === "fr" || stored === "en") return stored;
  } catch {
    /* localStorage may be blocked */
  }
  const browser = (navigator.language || "fr").toLowerCase();
  return browser.startsWith("en") ? "en" : "fr";
}

function setLang(lang: Lang) {
  document.documentElement.dataset.lang = lang;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(LANG_STORAGE, lang);
  } catch {
    /* noop */
  }
  document.querySelectorAll<HTMLButtonElement>("[data-lang-set]").forEach((btn) => {
    btn.classList.toggle("on", btn.dataset.langSet === lang);
  });
  window.dispatchEvent(new CustomEvent("pa:lang-change", { detail: { lang } }));
}

function initLang() {
  const initial = getInitialLang();
  setLang(initial);
  document.querySelectorAll<HTMLButtonElement>("[data-lang-set]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.dataset.langSet as Lang;
      if (next === "fr" || next === "en") setLang(next);
    });
  });
}

// ============== BACKDROP PARALLAX ==============

function initParallax() {
  const slow = document.querySelector<HTMLElement>("[data-bd-layer='slow']");
  const med = document.querySelector<HTMLElement>("[data-bd-layer='med']");
  const grid = document.querySelector<HTMLElement>("[data-bd-layer='grid']");
  const radar = document.querySelector<HTMLElement>("[data-bd-layer='radar']");
  if (!slow && !med && !grid && !radar) return;

  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    if (slow) slow.style.transform = `translateY(${y * 0.15}px)`;
    if (med) med.style.transform = `translateY(${y * 0.3}px)`;
    if (grid) grid.style.transform = `perspective(800px) rotateX(70deg) translateY(${y * 0.2}px)`;
    if (radar) radar.style.transform = `translate(-50%,-50%) translateY(${y * 0.1}px)`;
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );
  update();
}

// ============== SECTION INDICATOR ==============

function initSectionIndicator() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-section-target]"));
  if (buttons.length === 0) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.sectionTarget!;
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    });
  });

  const updateActive = () => {
    let bestIdx = 0;
    let bestDist = Infinity;
    SECTIONS.forEach((id, i) => {
      const el = document.getElementById(id);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dist = Math.abs(r.top + r.height / 2 - window.innerHeight / 2);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });
    buttons.forEach((btn, i) => btn.classList.toggle("active", i === bestIdx));
  };

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateActive();
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true }
  );
  updateActive();
}

// ============== CARD TILT + GLOW ==============

function initCardEffects() {
  const cards = document.querySelectorAll<HTMLElement>(".pcard");
  // .glow is safe at all times (uses ::after pseudo-element, no transform conflict).
  // .tilt sets transform on the .pcard itself which fights .reveal's translateY(40px) —
  // only enable it once the card has been revealed (.in class) so the entry animation isn't clobbered.
  cards.forEach((card) => card.classList.add("glow"));

  document.addEventListener(
    "mousemove",
    (e) => {
      cards.forEach((card) => {
        if (!card.classList.contains("tilt") && card.classList.contains("in")) {
          card.classList.add("tilt");
        }
        const r = card.getBoundingClientRect();
        const inside =
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom;
        if (inside) {
          const mx = ((e.clientX - r.left) / r.width) * 100;
          const my = ((e.clientY - r.top) / r.height) * 100;
          card.style.setProperty("--mx", `${mx}%`);
          card.style.setProperty("--my", `${my}%`);
          const rx = ((e.clientY - r.top) / r.height - 0.5) * -8;
          const ry = ((e.clientX - r.left) / r.width - 0.5) * 8;
          card.style.setProperty("--rx", `${rx}deg`);
          card.style.setProperty("--ry", `${ry}deg`);
        } else {
          card.style.setProperty("--rx", "0deg");
          card.style.setProperty("--ry", "0deg");
        }
      });
    },
    { passive: true }
  );
}

// ============== SCROLL REVEAL ==============

function initScrollReveal() {
  // Reveal animation lives in CSS (`@keyframes pa-reveal` on .glass, .pcard).
  // JS only marks `.in` once an element has scrolled into view, so initCardEffects
  // can safely enable tilt on .pcard elements after their entry animation.
  // Use IntersectionObserver (browser-throttled) instead of a scroll listener — much
  // cheaper and avoids running on every scroll frame.
  const targets = document.querySelectorAll<HTMLElement>(".glass, .pcard");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -10% 0px" }
  );
  targets.forEach((t) => io.observe(t));
}

// ============== TERMINAL ==============

interface TermLine {
  type: "in" | "out";
  text: string;
}

function initTerminal() {
  const toggle = document.querySelector<HTMLButtonElement>("[data-term-toggle]");
  const panel = document.querySelector<HTMLElement>("[data-term-panel]");
  const body = document.querySelector<HTMLElement>("[data-term-body]");
  const form = document.querySelector<HTMLFormElement>("[data-term-form]");
  const input = document.querySelector<HTMLInputElement>("[data-term-input]");
  if (!toggle || !panel || !body || !form || !input) return;

  let history: TermLine[] = [];
  let opened = false;

  const render = () => {
    body.innerHTML = "";
    history.forEach((h) => {
      const div = document.createElement("div");
      div.className = "term-line";
      if (h.type === "in") {
        div.innerHTML = `<span class="term-prompt">›</span> ${escapeHTML(h.text)}`;
      } else {
        const span = document.createElement("span");
        span.style.color = "#cfe8ff";
        span.textContent = h.text;
        div.appendChild(span);
      }
      body.appendChild(div);
    });
    body.scrollTop = body.scrollHeight;
  };

  const out = (text: string | string[]) => {
    const arr = Array.isArray(text) ? text : [text];
    arr.forEach((t) => history.push({ type: "out", text: t }));
    render();
  };

  const handle = (raw: string) => {
    const cmd = raw.trim().toLowerCase();
    history.push({ type: "in", text: raw });
    if (cmd === "help") {
      out([
        "available commands:",
        "  whoami         — about me",
        "  skills         — tech stack",
        "  projects       — list project codenames",
        "  contact        — reach me",
        "  lang <fr|en>   — switch language",
        "  ascii          — surprise",
        "  clear          — clear screen",
      ]);
    } else if (cmd === "whoami") {
      out(
        "pierre-antoine andriès · imt atlantique · signal/telecom/ai · seeking 6mo gap-year internship from july 2026"
      );
    } else if (cmd === "skills") {
      out("python · matlab · pytorch · nlp · fastapi · sql · git · arduino · linux · latex");
    } else if (cmd === "projects") {
      out([
        "  [01] adaptive-spatial-anti-jam   thales x imt   2025-26",
        "  [02] business-doc-classifier     gdańsk         2026",
        "  [03] explainable-misinfo         imt            2025-26",
        "  [04] solar-irradiance            imt            2024-25",
      ]);
    } else if (cmd === "contact") {
      out([
        "  email    pierreantoineandries@gmail.com",
        "  linkedin /in/pa-andries",
        "  github   /pa-andries",
        "  phone    +33 7 69 01 76 23",
      ]);
    } else if (cmd === "lang fr" || cmd === "lang en") {
      const target = cmd.endsWith("fr") ? "fr" : "en";
      setLang(target as Lang);
      out(`language → ${target}`);
    } else if (cmd === "ascii") {
      out(
        [
          "        .          .                 .          ",
          "   .       *           .       .         *      ",
          "        ___                                      ",
          "       /   \\___        ⟶  signal locked          ",
          "      |  o  o  |                                 ",
          "       \\___v___/        snr ↑  ber ↓             ",
        ].join("\n")
      );
    } else if (cmd === "clear") {
      history = [];
      render();
    } else if (cmd === "") {
      render();
    } else {
      out(`command not found: ${cmd} · try 'help'`);
    }
  };

  toggle.addEventListener("click", () => {
    opened = !opened;
    panel.hidden = !opened;
    toggle.textContent = opened ? "×" : "_";
    if (opened && history.length === 0) {
      history.push({ type: "out", text: "pa-portfolio v2.0 · type 'help' for commands" });
      render();
      setTimeout(() => input.focus(), 0);
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    handle(input.value);
    input.value = "";
  });
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============== INIT ==============

function initNavAutoHide() {
  const nav = document.querySelector<HTMLElement>("[data-nav]");
  const trigger = document.querySelector<HTMLElement>("[data-nav-trigger]");
  if (!nav || !trigger) return;

  const TOP_THRESHOLD = 80; // px from top: nav always visible above this scroll
  const REVEAL_ZONE = 80; // px from top: mouse here reveals nav
  const HIDE_ZONE = 140; // px from top: mouse beyond here re-hides nav

  let hidden = false;
  let navHovered = false;

  const showNav = () => {
    nav.classList.remove("nav-hidden");
    trigger.classList.remove("visible");
    hidden = false;
  };
  const hideNav = () => {
    if (window.scrollY < TOP_THRESHOLD) return;
    if (navHovered) return;
    nav.classList.add("nav-hidden");
    trigger.classList.add("visible");
    hidden = true;
  };

  let scrollEndTimer: number | null = null;
  const clearScrollEndTimer = () => {
    if (scrollEndTimer !== null) {
      clearTimeout(scrollEndTimer);
      scrollEndTimer = null;
    }
  };

  // Debounced hide: each scroll event RESETS the timer. The slide-up only fires
  // ~220ms AFTER the user has stopped scrolling — by then the page is calm and
  // the transition (0.55s) is clearly visible instead of getting lost in scroll motion.
  const onScroll = () => {
    clearScrollEndTimer();

    if (window.scrollY < TOP_THRESHOLD) {
      showNav();
      return;
    }
    if (hidden || navHovered) return;

    scrollEndTimer = window.setTimeout(() => {
      scrollEndTimer = null;
      hideNav();
    }, 220);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (window.scrollY < TOP_THRESHOLD) return;
    if (e.clientY < REVEAL_ZONE) {
      if (hidden) showNav();
    } else if (e.clientY > HIDE_ZONE) {
      if (!hidden) hideNav();
    }
  };

  nav.addEventListener("mouseenter", () => {
    navHovered = true;
  });
  nav.addEventListener("mouseleave", () => {
    navHovered = false;
  });

  trigger.addEventListener("click", showNav);

  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("mousemove", onMouseMove, { passive: true });

  onScroll();
}

let initialized = false;
function init() {
  if (initialized) return; // guard against HMR double-fire
  initialized = true;
  initLang();
  initParallax();
  initSectionIndicator();
  initCardEffects();
  initScrollReveal();
  initNavAutoHide();
  initTerminal();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
