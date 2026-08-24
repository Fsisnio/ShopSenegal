(function () {
  const LISTS = [
    [
      { qty: "1 kg", name: "Yaboy frais" },
      { qty: "500g", name: "Tomate fraîche" },
      { qty: "2", name: "Oignons moyens" },
      { qty: "1 L", name: "Huile Kirène" },
      { qty: "2", name: "Baguettes" }
    ],
    [
      { qty: "1 kg", name: "Thiof entier" },
      { qty: "1", name: "Chou moyen" },
      { qty: "2 kg", name: "Pomme de terre" },
      { qty: "1", name: "Savon Madar" },
      { qty: "5 kg", name: "Riz brisé" }
    ],
    [
      { qty: "2", name: "Poulets vidés" },
      { qty: "500g", name: "Pâte d'arachide" },
      { qty: "1 L", name: "Huile Kirène" },
      { qty: "1 kg", name: "Sucre en poudre" },
      { qty: "3", name: "Maggi Star" }
    ]
  ];

  const itemsEl = document.getElementById("home-list-items");
  const countEl = document.getElementById("home-list-count");
  const typedEl = document.getElementById("home-list-typed");
  if (!itemsEl || !countEl || !typedEl) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let listIndex = 0;
  let running = true;

  function sleep(ms) {
    if (reduceMotion) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function setCount(n) {
    countEl.textContent = `${n} article${n > 1 ? "s" : ""}`;
  }

  function addItem(qty, name) {
    const row = document.createElement("div");
    row.className = "home-list-item";
    row.innerHTML =
      '<span class="home-list-item__check" aria-hidden="true"></span>' +
      `<span class="home-list-item__qty">${qty}</span>` +
      `<span class="home-list-item__name">${name}</span>`;
    itemsEl.appendChild(row);
  }

  async function typeText(text) {
    if (reduceMotion) {
      typedEl.textContent = text;
      return;
    }
    typedEl.textContent = "";
    for (let i = 1; i <= text.length; i += 1) {
      typedEl.textContent = text.slice(0, i);
      await sleep(40 + Math.random() * 30);
    }
  }

  function renderListInstant(list) {
    itemsEl.innerHTML = "";
    list.forEach((item) => addItem(item.qty, item.name));
    setCount(list.length);
    typedEl.textContent = "";
  }

  async function runLoop() {
    if (reduceMotion) {
      renderListInstant(LISTS[0]);
      return;
    }

    while (running) {
      const list = LISTS[listIndex];
      itemsEl.innerHTML = "";
      setCount(0);
      typedEl.textContent = "";

      for (const item of list) {
        if (!running) return;
        await typeText(`${item.qty}  ·  ${item.name}`);
        await sleep(350);
        addItem(item.qty, item.name);
        setCount(itemsEl.children.length);
        typedEl.textContent = "";
        await sleep(550);
      }

      await sleep(3200);
      listIndex = (listIndex + 1) % LISTS.length;
    }
  }

  runLoop();

  const shareBtn = document.getElementById("home-share-code");
  if (shareBtn) {
    const prefix = "Salut ! J'utilise ShopSenegal pour mes courses à Thiès. Voici mon code : ";

    async function setShareHref() {
      let code = "";
      try {
        const session = window.ShopData?.getClientSession?.();
        if (session?.phone && window.ShopData?.getUserByPhone) {
          const user = await window.ShopData.getUserByPhone(session.phone);
          code = user?.referralCode || "";
        }
      } catch {
        code = "";
      }
      const message = prefix + (code || "");
      shareBtn.setAttribute("href", `https://wa.me/?text=${encodeURIComponent(message)}`);
    }

    setShareHref();
  }
})();
