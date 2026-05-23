(function () {
  const grid = document.getElementById("products-grid");
  const status = document.getElementById("products-status");
  const meta = document.getElementById("products-meta");
  const filterInput = document.getElementById("products-filter");

  if (!grid || !status) return;

  let allProducts = [];
  let bundleMeta = { scrapedAt: "", source: "" };

  function normalize(s) {
    return String(s ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function ariaChunk(s) {
    return String(s ?? "").replace(/\s+/g, " ").trim().slice(0, 140);
  }

  function render(list) {
    grid.innerHTML = "";
    if (!list.length) {
      grid.innerHTML = '<p class="muted">Aucun produit ne correspond au filtre.</p>';
      return;
    }

    function openProduct(url) {
      const u = String(url || "").trim();
      if (!u) return;
      const w = window.open(u, "_blank", "noopener,noreferrer");
      if (w) w.opener = null;
    }

      const frag = document.createDocumentFragment();
    list.forEach((p, index) => {
      const promo = p.promotion && String(p.promotion).trim();
      const brand = p.brand && String(p.brand).trim();

      const card = document.createElement("article");
      card.className = "product-card";
      card.style.setProperty("--card-i", String(index % 40));

      const mediaBtn = document.createElement("button");
      mediaBtn.type = "button";
      mediaBtn.className = "product-card__media product-card__open";
      mediaBtn.setAttribute(
        "aria-label",
        `Ouvrir le produit sur Auchan — ${ariaChunk(p.productName) || "fiche externe"}`
      );
      mediaBtn.addEventListener("click", () => openProduct(p.productUrl));

      const img = document.createElement("img");
      img.src = String(p.imageUrl || "");
      img.alt = "";
      img.loading = "lazy";
      img.width = 320;
      img.height = 320;
      mediaBtn.appendChild(img);

      if (promo) {
        const peel = document.createElement("span");
        peel.className = "product-card__promo-ribbon";
        peel.setAttribute("aria-hidden", "true");
        peel.textContent = "Promo";
        mediaBtn.appendChild(peel);
      }

      const body = document.createElement("div");
      body.className = "product-card__body";

      const cat = document.createElement("p");
      cat.className = "product-card__category";
      cat.textContent = p.category || "—";

      const h2 = document.createElement("h2");
      h2.className = "product-card__title";

      const titleBtn = document.createElement("button");
      titleBtn.type = "button";
      titleBtn.className = "product-card__title-btn";
      titleBtn.textContent = p.productName || "";
      titleBtn.setAttribute(
        "aria-label",
        `Ouvrir le produit sur Auchan — ${ariaChunk(p.productName)}`
      );
      titleBtn.addEventListener("click", () => openProduct(p.productUrl));
      h2.appendChild(titleBtn);

      const priceEl = document.createElement("p");
      priceEl.className = "product-card__price";
      priceEl.textContent = p.price || "—";

      const priceRow = document.createElement("div");
      priceRow.className = "product-card__price-row";
      priceRow.appendChild(priceEl);

      body.appendChild(cat);
      body.appendChild(h2);
      body.appendChild(priceRow);

      if (promo) {
        const promoP = document.createElement("p");
        promoP.className = "product-card__promo";
        const lab = document.createElement("span");
        lab.className = "product-card__promo-label";
        lab.textContent = "Promo";
        promoP.appendChild(lab);
        promoP.appendChild(document.createTextNode(` ${promo}`));
        body.appendChild(promoP);
      }

      if (brand) {
        const brandP = document.createElement("p");
        brandP.className = "product-card__brand";
        const muted = document.createElement("span");
        muted.className = "muted";
        muted.textContent = "Marque";
        brandP.appendChild(muted);
        brandP.appendChild(document.createTextNode(` ${brand}`));
        body.appendChild(brandP);
      }

      const desc = document.createElement("p");
      desc.className = "product-card__desc";
      desc.textContent = p.description || "";

      const foot = document.createElement("div");
      foot.className = "product-card__foot";
      const hint = document.createElement("span");
      hint.className = "product-card__hint";
      hint.setAttribute("aria-hidden", "true");
      hint.textContent = "Voir sur auchan.sn";
      foot.appendChild(hint);

      body.appendChild(desc);
      body.appendChild(foot);

      card.appendChild(mediaBtn);
      card.appendChild(body);
      frag.appendChild(card);
    });

    grid.classList.remove("products-grid--revealed");
    grid.appendChild(frag);
    requestAnimationFrame(() => {
      grid.classList.add("products-grid--revealed");
    });

  }

  function applyFilter() {
    const q = normalize(filterInput?.value || "").trim();
    const list = q
      ? allProducts.filter((p) => {
          const hay = normalize(
            [p.productName, p.category, p.brand, p.description, p.promotion, p.price].join(" ")
          );
          return hay.includes(q);
        })
      : allProducts;
    render(list);
    if (meta) {
      const total = allProducts.length;
      const shown = list.length;
      const when = bundleMeta.scrapedAt
        ? new Date(bundleMeta.scrapedAt).toLocaleString("fr-SN")
        : "";
      meta.textContent = when
        ? `${shown} / ${total} produits affichés — export ${when}`
        : `${shown} / ${total} produits affichés`;
    }
  }

  filterInput?.addEventListener("input", () => {
    applyFilter();
  });

  fetch("data/auchan-products.json", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error("Fichier data/auchan-products.json introuvable.");
      return r.json();
    })
    .then((data) => {
      allProducts = Array.isArray(data.products) ? data.products : [];
      bundleMeta.scrapedAt = data.scrapedAt || "";
      bundleMeta.source = data.source || "";
      status.textContent = "";
      applyFilter();
    })
    .catch((err) => {
      status.textContent =
        err.message ||
        "Impossible de charger les produits. Exécutez python3 scrape_auchan.py pour générer data/auchan-products.json.";
    });
})();
