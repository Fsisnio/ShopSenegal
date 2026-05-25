/**
 * Pop-ups succès / échec / avertissement — ShopSenegal
 * Usage : ShopFeedback.success("Titre", "Message détaillé");
 */
(function () {
  const AUTO_CLOSE_MS = 5500;

  function ensureRoot() {
    let root = document.getElementById("shop-feedback-root");
    if (root) return root;
    root = document.createElement("div");
    root.id = "shop-feedback-root";
    root.setAttribute("aria-live", "polite");
    document.body.appendChild(root);
    return root;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => {
      switch (ch) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case "\"":
          return "&quot;";
        case "'":
          return "&#39;";
        default:
          return ch;
      }
    });
  }

  function iconFor(type) {
    if (type === "success") return "✓";
    if (type === "error") return "✕";
    return "!";
  }

  function labelFor(type) {
    if (type === "success") return "Succès";
    if (type === "error") return "Échec";
    return "Attention";
  }

  let autoTimer = null;

  function closePopup() {
    const root = document.getElementById("shop-feedback-root");
    if (!root) return;
    root.innerHTML = "";
    document.body.classList.remove("shop-feedback-open");
    if (autoTimer) {
      clearTimeout(autoTimer);
      autoTimer = null;
    }
  }

  function show(type, title, message, options = {}) {
    const root = ensureRoot();
    const kind = type === "success" || type === "error" || type === "warn" ? type : "warn";
    const autoClose = options.autoClose !== false && kind === "success";

    closePopup();

    const overlay = document.createElement("div");
    overlay.className = "shop-feedback";
    overlay.setAttribute("role", "alertdialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "shop-feedback-title");
    overlay.setAttribute("aria-describedby", "shop-feedback-message");

    overlay.innerHTML = `
      <div class="shop-feedback__backdrop" data-feedback-close="true"></div>
      <div class="shop-feedback__panel shop-feedback__panel--${kind}">
        <div class="shop-feedback__icon" aria-hidden="true">${iconFor(kind)}</div>
        <p class="shop-feedback__eyebrow">${escapeHtml(labelFor(kind))}</p>
        <h2 id="shop-feedback-title" class="shop-feedback__title">${escapeHtml(title)}</h2>
        <p id="shop-feedback-message" class="shop-feedback__message">${escapeHtml(message)}</p>
        <button type="button" class="shop-feedback__btn" data-feedback-close="true">OK</button>
      </div>
    `;

    root.appendChild(overlay);
    document.body.classList.add("shop-feedback-open");

    overlay.addEventListener("click", (event) => {
      if (event.target.closest("[data-feedback-close]")) closePopup();
    });

    const onKey = (event) => {
      if (event.key === "Escape") {
        closePopup();
        document.removeEventListener("keydown", onKey);
      }
    };
    document.addEventListener("keydown", onKey);

    const btn = overlay.querySelector(".shop-feedback__btn");
    btn?.focus();

    if (autoClose) {
      autoTimer = setTimeout(closePopup, AUTO_CLOSE_MS);
    }
  }

  window.ShopFeedback = {
    success(title, message, options) {
      show("success", title, message, options);
    },
    error(title, message, options) {
      show("error", title, message, { autoClose: false, ...options });
    },
    warn(title, message, options) {
      show("warn", title, message, { autoClose: false, ...options });
    },
    close: closePopup
  };
})();
