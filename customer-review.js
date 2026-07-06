/**
 * Avis client ShopSenegal — après achat ou visite.
 */
(function () {
  const STORAGE_REVIEWS = "shopsenegal.reviews";
  const STORAGE_LAST_SUBMIT = "shopsenegal.review.lastSubmit";
  const SESSION_VISIT_PROMPTED = "shopsenegal.review.visitPrompted";
  const VISIT_COOLDOWN_DAYS = 7;
  const VISIT_DELAY_MS = 12000;
  const PURCHASE_DELAY_MS = 6000;

  let open = false;
  let pendingTimer = null;

  function isAdminPage() {
    return /enangon_Admin\.html$/i.test(location.pathname || "");
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

  function daysSince(iso) {
    if (!iso) return Infinity;
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return Infinity;
    return (Date.now() - then) / 86400000;
  }

  function shouldSkipVisitPrompt() {
    if (isAdminPage()) return true;
    if (sessionStorage.getItem(SESSION_VISIT_PROMPTED) === "1") return true;
    if (daysSince(localStorage.getItem(STORAGE_LAST_SUBMIT)) < VISIT_COOLDOWN_DAYS) return true;
    if (document.body.classList.contains("shop-feedback-open")) return true;
    return false;
  }

  function ensureRoot() {
    let root = document.getElementById("shop-review-root");
    if (root) return root;
    root = document.createElement("div");
    root.id = "shop-review-root";
    root.setAttribute("aria-live", "polite");
    document.body.appendChild(root);
    return root;
  }

  function closePopup() {
    const root = document.getElementById("shop-review-root");
    if (root) root.innerHTML = "";
    document.body.classList.remove("shop-review-open");
    open = false;
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  }

  async function persistReview(payload) {
    const entry = {
      id: `r-${Date.now()}`,
      rating: payload.rating,
      comment: payload.comment || "",
      source: payload.source || "visit",
      page: payload.page || location.pathname || "",
      orderId: payload.orderId || null,
      clientPhone: window.ShopData?.getClientSession?.()?.phone || null,
      createdAt: new Date().toISOString()
    };

    try {
      const raw = localStorage.getItem(STORAGE_REVIEWS);
      const list = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(list) ? [entry, ...list] : [entry];
      localStorage.setItem(STORAGE_REVIEWS, JSON.stringify(next.slice(0, 200)));
    } catch {
      localStorage.setItem(STORAGE_REVIEWS, JSON.stringify([entry]));
    }

    localStorage.setItem(STORAGE_LAST_SUBMIT, entry.createdAt);

    if (window.ShopData?.saveCustomerReview) {
      try {
        await window.ShopData.saveCustomerReview(entry);
      } catch (err) {
        console.warn("ShopReview.saveCustomerReview:", err);
      }
    }
  }

  function showThanks() {
    if (!window.ShopFeedback) {
      closePopup();
      return;
    }
    closePopup();
    window.ShopFeedback.success(
      "Merci pour votre avis",
      "Votre retour nous aide à améliorer ShopSenegal."
    );
  }

  function openPopup(options = {}) {
    if (open || isAdminPage()) return;
    if (document.body.classList.contains("shop-feedback-open")) return;

    const source = options.source === "purchase" ? "purchase" : "visit";
    const orderId = options.orderId || null;

    open = true;
    const root = ensureRoot();
    root.innerHTML = "";

    const overlay = document.createElement("div");
    overlay.className = "shop-review";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "shop-review-title");

    overlay.innerHTML = `
      <div class="shop-review__backdrop" data-review-close="true"></div>
      <div class="shop-review__panel">
        <p class="shop-review__eyebrow">Votre avis compte</p>
        <h2 id="shop-review-title" class="shop-review__title">
          Comment avez-vous trouvé votre expérience sur ShopSenegal ?
        </h2>
        <div class="shop-review__stars" role="group" aria-label="Note de 1 à 5">
          ${[1, 2, 3, 4, 5]
            .map(
              (n) =>
                `<button type="button" class="shop-review__star" data-rating="${n}" aria-label="${n} sur 5">★</button>`
            )
            .join("")}
        </div>
        <p class="shop-review__stars-hint muted">Touchez les étoiles pour noter</p>
        <label class="shop-review__comment-label" for="shop-review-comment">Commentaire (optionnel)</label>
        <textarea
          id="shop-review-comment"
          class="shop-review__comment"
          rows="3"
          maxlength="500"
          placeholder="Dites-nous ce qui vous a plu ou ce qu'on peut améliorer…"
        ></textarea>
        <div class="shop-review__actions">
          <button type="button" class="shop-review__submit" disabled>Envoyer mon avis</button>
          <button type="button" class="shop-review__later" data-review-close="true">Plus tard</button>
        </div>
      </div>
    `;

    root.appendChild(overlay);
    document.body.classList.add("shop-review-open");

    let selectedRating = 0;
    const stars = overlay.querySelectorAll(".shop-review__star");
    const submitBtn = overlay.querySelector(".shop-review__submit");
    const commentEl = overlay.querySelector("#shop-review-comment");

    function updateStars() {
      stars.forEach((star) => {
        const value = Number(star.dataset.rating);
        star.classList.toggle("shop-review__star--active", value <= selectedRating);
        star.setAttribute("aria-pressed", value === selectedRating ? "true" : "false");
      });
      if (submitBtn) submitBtn.disabled = selectedRating < 1;
    }

    stars.forEach((star) => {
      star.addEventListener("click", () => {
        selectedRating = Number(star.dataset.rating) || 0;
        updateStars();
      });
    });

    overlay.addEventListener("click", async (event) => {
      if (event.target.closest("[data-review-close]")) {
        if (source === "visit") sessionStorage.setItem(SESSION_VISIT_PROMPTED, "1");
        closePopup();
        return;
      }

      if (!event.target.closest(".shop-review__submit")) return;
      if (selectedRating < 1) return;

      submitBtn.disabled = true;
      submitBtn.textContent = "Envoi…";

      await persistReview({
        rating: selectedRating,
        comment: commentEl?.value?.trim() || "",
        source,
        page: location.pathname || "",
        orderId
      });

      if (source === "visit") sessionStorage.setItem(SESSION_VISIT_PROMPTED, "1");
      showThanks();
    });

    const onKey = (event) => {
      if (event.key === "Escape") {
        if (source === "visit") sessionStorage.setItem(SESSION_VISIT_PROMPTED, "1");
        closePopup();
        document.removeEventListener("keydown", onKey);
      }
    };
    document.addEventListener("keydown", onKey);

    overlay.querySelector(".shop-review__star")?.focus();
  }

  function schedulePrompt(options = {}) {
    const delayMs =
      typeof options.delayMs === "number"
        ? options.delayMs
        : options.source === "purchase"
          ? PURCHASE_DELAY_MS
          : VISIT_DELAY_MS;

    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      openPopup(options);
    }, delayMs);
  }

  function promptAfterPurchase(options = {}) {
    sessionStorage.setItem(SESSION_VISIT_PROMPTED, "1");
    schedulePrompt({ ...options, source: "purchase" });
  }

  function promptAfterVisit(options = {}) {
    if (shouldSkipVisitPrompt()) return;
    schedulePrompt({ ...options, source: "visit" });
  }

  window.ShopReview = {
    promptAfterPurchase,
    promptAfterVisit,
    close: closePopup
  };

  if (!isAdminPage()) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => promptAfterVisit());
    } else {
      promptAfterVisit();
    }
  }
})();
