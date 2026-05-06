(function () {
  const toggle = document.querySelector(".nav-toggle");
  const panel = document.getElementById("primary-nav");
  const backdrop = document.getElementById("nav-backdrop");
  if (!toggle || !panel) return;

  function drawerTop() {
    const nav = document.querySelector(".top-nav");
    if (!nav) return;
    document.documentElement.style.setProperty(
      "--nav-drawer-top",
      `${nav.getBoundingClientRect().bottom}px`
    );
  }

  function setOpen(open) {
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("nav-open", open);
    if (backdrop) {
      backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    }
    if (open) drawerTop();
  }

  function close() {
    setOpen(false);
  }

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    if (!open) drawerTop();
    setOpen(!open);
  });

  backdrop?.addEventListener("click", close);

  panel.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", close);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  window.addEventListener("resize", () => {
    if (document.body.classList.contains("nav-open")) drawerTop();
  });

  drawerTop();
})();
