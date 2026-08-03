// Site-wide progressive enhancements. Vanilla JS only — no dependencies.

// Mobile nav toggle
const toggle = document.querySelector(".menu-toggle");
const navList = document.getElementById("site-nav");
if (toggle && navList) {
  toggle.addEventListener("click", () => {
    const open = navList.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

// Scroll-triggered entrances (skipped for reduced-motion users; CSS also
// neutralizes the animation for them).
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const targets = document.querySelectorAll(".anim-fade-up");
if (reduced || !("IntersectionObserver" in window)) {
  targets.forEach((el) => el.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 },
  );
  targets.forEach((el) => observer.observe(el));
}
