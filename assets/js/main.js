(() => {
  "use strict";

  const WA_NUMBER = "56952177645";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- Year ---------- */
  const year = $("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Mobile menu ---------- */
  const toggle = $("[data-menu-toggle]");
  const menu = $("[data-menu]");
  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
  };
  toggle?.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle?.getAttribute("aria-expanded") === "true") { setMenu(false); toggle.focus(); }
  });

  /* ---------- Logo press on touch: play the hover motion, never block navigation ---------- */
  const brand = $(".brand");
  if (brand) {
    const release = () => brand.classList.remove("is-pressed");
    brand.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") brand.classList.add("is-pressed"); });
    brand.addEventListener("pointercancel", release);
    window.addEventListener("pageshow", release); // back/forward cache restores the page un-pressed
  }

  /* ---------- Header state + floating WhatsApp ---------- */
  const header = $("[data-header]");
  const fab = $("[data-fab]");
  const heroCta = $("[data-hero-cta]");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  if (fab && heroCta && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      fab.classList.toggle("is-visible", !entry.isIntersecting && entry.boundingClientRect.top < 0);
    }).observe(heroCta);
  }

  /* ---------- Offer (data/offer.json) ---------- */
  const offerEl = $("[data-offer]");
  const chip = $("[data-offer-chip]");
  const fmtDate = (d) =>
    d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });

  const hideOffer = () => {
    offerEl.hidden = true;
    if (chip) chip.hidden = true;
  };

  const renderOffer = (o) => {
    if (!o || o.active === false) return hideOffer();
    let until = null;
    if (o.validUntil) {
      until = new Date(`${o.validUntil}T23:59:59`);
      if (!isNaN(until) && until < new Date()) return hideOffer();
    }
    const set = (sel, val) => { const el = $(sel); if (el && val != null) el.textContent = val; };
    set("[data-offer-title]", o.title);
    set("[data-offer-desc]", o.description);
    set("[data-offer-cta-text]", o.cta);

    const hasDiscount = typeof o.discount === "number" && o.discount > 0;
    const fig = $("[data-offer-figure]");
    if (fig) fig.hidden = !hasDiscount;
    if (hasDiscount) set("[data-offer-num]", String(o.discount));

    const brands = $("[data-offer-brands]");
    if (brands) {
      brands.replaceChildren(...(o.brands || []).map((b) => Object.assign(document.createElement("li"), { textContent: b })));
      brands.hidden = !(o.brands && o.brands.length);
    }

    const cta = $("[data-offer-cta]");
    if (cta && o.whatsappText) cta.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(o.whatsappText)}`;

    const valid = $("[data-offer-valid]");
    if (valid) {
      valid.hidden = !(until && !isNaN(until));
      if (!valid.hidden) valid.textContent = `Válida hasta el ${fmtDate(until)}`;
    }

    const chipText = $("[data-offer-chip-text]");
    if (chipText) {
      const brandTxt = (o.brands || []).join(" y ");
      chipText.textContent = o.chip || (hasDiscount
        ? `${o.discount}% en ${o.title.toLowerCase().replace("servicio de ", "")}${brandTxt ? " " + brandTxt : ""}`
        : o.title);
    }
  };

  const offerReady = offerEl
    ? fetch("data/offer.json", { cache: "no-cache" })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then(renderOffer)
        .catch(() => { /* keep the HTML fallback */ })
    : Promise.resolve();

  /* ---------- In-page anchors ----------
     Scroll to the visible content of a section, not its padded box:
     centered under the header when it fits, flush under the header when it doesn't. */
  // offsetTop/offsetHeight ignore transforms, so reveal animations in progress don't skew the math
  const pageTop = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
  const contentBox = (el) => {
    const kids = Array.from(el.children).filter((c) => !c.hidden && c.offsetHeight > 0);
    const first = kids[0] || el;
    const last = kids[kids.length - 1] || el;
    const top = pageTop(first);
    return { top, height: pageTop(last) + last.offsetHeight - top, firstEl: first };
  };
  const hasFill = (el) => {
    const bg = getComputedStyle(el).backgroundColor;
    return bg && bg !== "transparent" && !/rgba\(.*,\s*0\)$/.test(bg);
  };
  const scrollToSection = (target, smooth = true) => {
    const headerH = header.getBoundingClientRect().height;
    const avail = window.innerHeight - headerH;
    const box = contentBox(target);
    let top;
    if (box.height <= avail) {
      top = box.top - headerH - (avail - box.height) / 2;
    } else {
      top = box.top - headerH - (hasFill(box.firstEl) ? 0 : 24);
    }
    const instant = !smooth || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: Math.max(0, Math.round(top)), behavior: instant ? "instant" : "smooth" });
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  };
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = a.getAttribute("href").slice(1);
    const target = id && document.getElementById(id);
    if (!target || target.hidden) return;
    e.preventDefault();
    history.pushState(null, "", `#${id}`);
    scrollToSection(target);
  });
  window.addEventListener("load", () => {
    const target = location.hash && document.getElementById(location.hash.slice(1));
    if (target && !target.hidden) requestAnimationFrame(() => scrollToSection(target, false));
  });

  /* ---------- Motion ---------- */
  const marquee = $("[data-marquee]");
  const track = $("[data-marquee-track]");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || /[?&]nomotion/.test(location.search);

  if (!window.gsap || reduce) {
    marquee?.classList.add("is-static");
    return;
  }

  const { gsap } = window;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
  gsap.defaults({ ease: "expo.out", duration: 0.9 });

  /* Hero intro: stripes wipe, title rises, car arrives and settles */
  const tl = gsap.timeline({ delay: 0.05 });
  tl.from(".stripe", {
      clipPath: "inset(0 100% 0 0)", duration: 1, stagger: 0.07, ease: "expo.inOut",
    })
    .from(".hero-title .line > span", { yPercent: 105, duration: 0.9, stagger: 0.08 }, 0.15)
    .from(".offer-chip", { y: 12, opacity: 0, duration: 0.6 }, 0.2)
    .from([".hero-sub", ".hero-actions"], { y: 16, opacity: 0, duration: 0.7, stagger: 0.06 }, 0.45)
    .fromTo(".hero-car", {
      xPercent: 34, opacity: 0, filter: "blur(10px) drop-shadow(0px 28px 22px rgba(13,23,38,0.28))",
    }, {
      xPercent: 0, opacity: 1, filter: "blur(0px) drop-shadow(0px 28px 22px rgba(13,23,38,0.28))",
      duration: 1.2, ease: "power4.out",
    }, 0.35)
    .to(".hero-car", { y: 3, duration: 0.18, ease: "power2.out" }, 1.2)
    .to(".hero-car", { y: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" }, 1.38)
    .from(".road", { scaleX: 0.3, opacity: 0, duration: 1 }, 0.5)
    .from(".hero-rail li", { y: 16, opacity: 0, duration: 0.6, stagger: 0.06 }, 0.7);

  if (!window.ScrollTrigger) return;
  const ST = window.ScrollTrigger;

  /* Hero car drifts on scroll */
  gsap.to(".hero-car", {
    x: () => window.innerWidth * 0.06, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 },
  });

  /* One reveal for every section: same rise + fade, same timing, triggered early
     so content is already in place by the time it is read. */
  const reveal = (targets, trigger, onEnter) =>
    gsap.from(targets, {
      y: 24, opacity: 0, duration: 0.7, stagger: 0.07, ease: "expo.out",
      scrollTrigger: { trigger, start: "top 92%", once: true, onEnter },
    });

  /* Offer: same reveal, plus the discount counting up */
  const countUp = () => {
    const num = $("[data-offer-num]");
    const target = parseInt(num?.textContent, 10) || 0;
    if (!num || !target || offerEl?.hidden) return;
    const counter = { v: 0 };
    num.textContent = "0";
    gsap.to(counter, {
      v: target, duration: 1.1, delay: 0.15, ease: "power3.out",
      onUpdate: () => { num.textContent = Math.round(counter.v); },
    });
  };
  if (offerEl) {
    reveal([".offer-title > span", ".offer-desc", ".offer-brands", ".offer-actions", ".offer-figure"], ".offer-band", countUp);
  }
  reveal(".services .section-head > *", ".services .section-head");
  reveal(".service-list li", ".service-list");
  reveal(".why-title", ".why-inner");
  reveal(".pillars li", ".pillars");
  /* the hairline above each pillar draws itself left → right */
  gsap.from(".pillars li", {
    "--line": 0, duration: 1.1, stagger: 0.1, ease: "expo.out",
    scrollTrigger: { trigger: ".pillars", start: "top 92%", once: true },
  });
  reveal(".reviews-head > *", ".reviews-head");
  reveal(".marquee", ".marquee");
  reveal([".contact-copy > *", ".map"], ".contact-grid");
  reveal(".footer-grid > *", ".footer");
  offerReady.then(() => ST.refresh());

  /* Workshop photo parallax */
  gsap.fromTo("[data-why-img]", { yPercent: -6 }, {
    yPercent: 6, ease: "none",
    scrollTrigger: { trigger: ".why", start: "top bottom", end: "bottom top", scrub: true },
  });

  /* Reviews marquee: clone once, loop, pause on hover/focus */
  if (marquee && track) {
    const originals = $$(".review", track);
    originals.forEach((li) => {
      const c = li.cloneNode(true);
      c.setAttribute("aria-hidden", "true");
      track.appendChild(c);
    });
    const loop = gsap.to(track, { xPercent: -50, ease: "none", duration: originals.length * 6, repeat: -1 });
    const slow = (to) => gsap.to(loop, { timeScale: to, duration: 0.5, ease: "power2.out", overwrite: true });
    marquee.addEventListener("pointerenter", () => slow(0));
    marquee.addEventListener("pointerleave", () => slow(1));
    marquee.addEventListener("focusin", () => slow(0));
    marquee.addEventListener("focusout", () => slow(1));
    ST.create({ trigger: marquee, start: "top bottom", end: "bottom top", onToggle: (s) => (s.isActive ? loop.play() : loop.pause()) });
  }

  window.addEventListener("load", () => ST.refresh());
})();
