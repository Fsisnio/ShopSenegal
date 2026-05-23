/**
 * Back-office ShopSenegal — version onglets.
 *
 * Sections : tableau de bord, commandes, produits, utilisateurs, livreurs & lieux, exports.
 * Reste sans dépendance de bundling : Chart.js + html2canvas + supabase-js sont chargés
 * en CDN dans admin.html.
 */

(function () {
  // ============================================================
  // AUTHENTIFICATION ADMIN (client-side gate)
  // ------------------------------------------------------------
  // Gate simple basé sur SHA-256 du mot de passe.
  // - Identifiants par défaut : faladespero1@gmail.com / Decroissant@2026
  // - Surchargeables via runtime-env.js (variables Render) :
  //     ADMIN_EMAIL                — email autorisé
  //     ADMIN_PASSWORD_SHA256      — hash SHA-256 (hex, 64 chars) du mot de passe
  // - Stockage de session :
  //     sessionStorage shopsenegal.admin.session = "1"          (onglet)
  //     localStorage   shopsenegal.admin.persistent = "1"       (case "Me garder connecté")
  // SÉCURITÉ : ce gate empêche un accès "casual" mais n'est pas une vraie
  // authentification serveur. Pour de la sécurité forte, brancher Supabase Auth.
  // ============================================================
  const DEFAULT_ADMIN_EMAIL = "faladespero1@gmail.com";
  const DEFAULT_ADMIN_PASSWORD_SHA256 =
    "0c75e7ccf95e35f2aed43c7a5d5636a267e198349094f84242003e41ffa82b47"; // Decroissant@2026

  const runtimeEnv =
    typeof window.SHOPSENEGAL_RUNTIME === "object" && window.SHOPSENEGAL_RUNTIME !== null
      ? window.SHOPSENEGAL_RUNTIME
      : {};
  const ADMIN_EMAIL =
    (typeof runtimeEnv.ADMIN_EMAIL === "string" && runtimeEnv.ADMIN_EMAIL.trim()) ||
    DEFAULT_ADMIN_EMAIL;
  const ADMIN_PASSWORD_SHA256 =
    (typeof runtimeEnv.ADMIN_PASSWORD_SHA256 === "string" &&
      runtimeEnv.ADMIN_PASSWORD_SHA256.trim().toLowerCase()) ||
    DEFAULT_ADMIN_PASSWORD_SHA256;

  const SESSION_KEY = "shopsenegal.admin.session";
  const PERSISTENT_KEY = "shopsenegal.admin.persistent";

  const loginOverlay = document.getElementById("admin-login-overlay");
  const loginForm = document.getElementById("admin-login-form");
  const loginEmailInput = document.getElementById("admin-login-email");
  const loginPasswordInput = document.getElementById("admin-login-password");
  const loginRememberInput = document.getElementById("admin-login-remember");
  const loginErrorEl = document.getElementById("admin-login-error");
  const loginSubmitBtn = document.getElementById("admin-login-submit");
  const sessionBar = document.getElementById("admin-session");
  const sessionEmail = document.getElementById("admin-session-email");
  const logoutButton = document.getElementById("admin-logout");

  async function sha256Hex(text) {
    if (!window.crypto?.subtle) {
      throw new Error("Web Crypto indisponible sur ce navigateur.");
    }
    const buf = new TextEncoder().encode(text);
    const digest = await window.crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function isAuthed() {
    return (
      sessionStorage.getItem(SESSION_KEY) === "1" ||
      localStorage.getItem(PERSISTENT_KEY) === "1"
    );
  }

  function showLogin() {
    if (!loginOverlay) return;
    loginOverlay.classList.remove("hidden");
    document.body.classList.add("admin-locked");
    setTimeout(() => loginEmailInput?.focus(), 50);
  }

  function hideLogin() {
    if (!loginOverlay) return;
    loginOverlay.classList.add("hidden");
    document.body.classList.remove("admin-locked");
  }

  function showSessionBar() {
    if (!sessionBar) return;
    sessionBar.classList.remove("hidden");
    if (sessionEmail) sessionEmail.textContent = ADMIN_EMAIL;
  }

  function setLoginError(message) {
    if (!loginErrorEl) return;
    if (!message) {
      loginErrorEl.classList.add("hidden");
      loginErrorEl.textContent = "";
    } else {
      loginErrorEl.classList.remove("hidden");
      loginErrorEl.textContent = message;
    }
  }

  function persistSession(remember) {
    sessionStorage.setItem(SESSION_KEY, "1");
    if (remember) localStorage.setItem(PERSISTENT_KEY, "1");
    else localStorage.removeItem(PERSISTENT_KEY);
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(PERSISTENT_KEY);
  }

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoginError("");
    if (loginSubmitBtn) {
      loginSubmitBtn.disabled = true;
      loginSubmitBtn.textContent = "Vérification…";
    }
    try {
      const email = (loginEmailInput.value || "").trim().toLowerCase();
      const password = loginPasswordInput.value || "";
      if (!email || !password) {
        setLoginError("Renseignez l'email et le mot de passe.");
        return;
      }
      const expectedEmail = ADMIN_EMAIL.toLowerCase();
      const expectedHash = ADMIN_PASSWORD_SHA256.toLowerCase();
      const hash = (await sha256Hex(password)).toLowerCase();
      const ok = email === expectedEmail && hash === expectedHash;
      if (!ok) {
        setLoginError("Identifiants invalides.");
        return;
      }
      persistSession(Boolean(loginRememberInput?.checked));
      loginPasswordInput.value = "";
      hideLogin();
      showSessionBar();
      bootDashboard();
    } catch (err) {
      setLoginError(err?.message || "Erreur de connexion.");
    } finally {
      if (loginSubmitBtn) {
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.textContent = "Se connecter";
      }
    }
  });

  logoutButton?.addEventListener("click", () => {
    clearSession();
    location.reload();
  });

  // ============================================================
  // DOM
  // ============================================================
  const tabs = Array.from(document.querySelectorAll(".admin-tab"));
  const panels = Array.from(document.querySelectorAll(".admin-panel"));
  const dataBanner = document.getElementById("admin-data-banner");

  // Dashboard
  const adminKpis = document.getElementById("admin-kpis");
  const metricsPeriod = document.getElementById("metrics-period");
  const refreshDashboardBtn = document.getElementById("refresh-dashboard");
  const dailyOrdersCanvas = document.getElementById("daily-orders-chart");
  const dailyRevenueCanvas = document.getElementById("daily-revenue-chart");
  const statusChartCanvas = document.getElementById("status-chart");
  const paymentChartCanvas = document.getElementById("payment-chart");
  const topProductsBody = document.getElementById("top-products-body");

  // Orders
  const adminOrders = document.getElementById("admin-orders");
  const filterStatus = document.getElementById("filter-status");
  const filterPayment = document.getElementById("filter-payment");
  const filterPaymentStatus = document.getElementById("filter-payment-status");
  const filterSearch = document.getElementById("filter-search");
  const ordersSummary = document.getElementById("orders-summary");
  const orderDetailsRoot = document.getElementById("order-details-root");
  const downloadOrderPngButton = document.getElementById("download-order-png");
  const deleteOrderButton = document.getElementById("delete-order-button");
  const exportOrdersCsvBtn = document.getElementById("export-orders-csv");

  // Products
  const productForm = document.getElementById("product-form");
  const productName = document.getElementById("product-name");
  const productBrand = document.getElementById("product-brand");
  const productCategory = document.getElementById("product-category");
  const productPrice = document.getElementById("product-price");
  const productImage = document.getElementById("product-image");
  const productSource = document.getElementById("product-source");
  const productInStock = document.getElementById("product-instock");
  const productDescription = document.getElementById("product-description");
  const productSubmitButton = document.getElementById("product-submit-button");
  const productCancelEditButton = document.getElementById("product-cancel-edit");
  const productFormTitle = document.getElementById("product-form-title");
  const productFormStatus = document.getElementById("product-form-status");
  const adminProducts = document.getElementById("admin-products");
  const productsCount = document.getElementById("products-count");
  const productFilter = document.getElementById("product-filter");
  const exportProductsCsvBtn = document.getElementById("export-products-csv");

  // Users
  const adminUsers = document.getElementById("admin-users");
  const usersCount = document.getElementById("users-count");
  const usersFilter = document.getElementById("users-filter");
  const exportUsersCsvBtn = document.getElementById("export-users-csv");
  const userModal = document.getElementById("user-modal");
  const userModalTitle = document.getElementById("user-modal-title");
  const userModalBody = document.getElementById("user-modal-body");
  const userModalDelete = document.getElementById("user-modal-delete");

  // Drivers / Places
  const driverForm = document.getElementById("driver-form");
  const driverFirstname = document.getElementById("driver-firstname");
  const driverLastname = document.getElementById("driver-lastname");
  const driverZone = document.getElementById("driver-zone");
  const driverPhoto = document.getElementById("driver-photo");
  const driverSubmitButton = document.getElementById("driver-submit-button");
  const driverCancelEditButton = document.getElementById("driver-cancel-edit");
  const adminDrivers = document.getElementById("admin-drivers");
  const placeForm = document.getElementById("place-form");
  const placeName = document.getElementById("place-name");
  const placeArea = document.getElementById("place-area");
  const placeSubmitButton = document.getElementById("place-submit-button");
  const placeCancelEditButton = document.getElementById("place-cancel-edit");
  const adminPlaces = document.getElementById("admin-places");

  // ============================================================
  // État
  // ============================================================
  /** @type {any} */ let statusChart;
  /** @type {any} */ let paymentChart;
  /** @type {any} */ let dailyOrdersChart;
  /** @type {any} */ let dailyRevenueChart;
  let selectedOrderId = null;
  let editingDriverId = null;
  let editingPlaceId = null;
  let editingProductId = null;
  let selectedUserId = null;
  let activeTab = "dashboard";

  // ============================================================
  // Helpers
  // ============================================================
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

  function formatDate(dateString) {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleString("fr-FR");
    } catch {
      return String(dateString);
    }
  }

  function formatShortDate(dateString) {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("fr-FR");
    } catch {
      return "";
    }
  }

  function formatAmount(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "-";
    return `${amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA`;
  }

  function lineAmountFcfa(item) {
    const qty = Number(item.quantity);
    const price = Number(item.amount);
    if (!Number.isFinite(qty) || qty < 1 || !Number.isFinite(price) || price < 0) return 0;
    return Math.round(qty * price);
  }

  function getOrderTotalAmount(order) {
    if (typeof order.estimatedTotalFcfa === "number" && order.estimatedTotalFcfa > 0) {
      return order.estimatedTotalFcfa;
    }
    return (order.besoins || []).reduce((sum, item) => sum + lineAmountFcfa(item), 0);
  }

  function buildSegmentation(orders, key) {
    return orders.reduce((acc, order) => {
      const value = order[key] || "Non defini";
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  function showBanner(message, kind = "info") {
    if (!dataBanner) return;
    if (!message) {
      dataBanner.classList.add("hidden");
      dataBanner.textContent = "";
      return;
    }
    dataBanner.textContent = message;
    dataBanner.classList.remove("hidden");
    dataBanner.dataset.kind = kind;
  }

  function csvEscape(value) {
    const v = value === null || value === undefined ? "" : String(value);
    if (/[",\n;]/.test(v)) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  }

  function downloadCsv(filename, rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      alert("Aucune donnée à exporter.");
      return;
    }
    const headers = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row || {}).forEach((k) => set.add(k));
        return set;
      }, new Set())
    );
    const lines = [headers.map(csvEscape).join(",")];
    rows.forEach((row) => {
      lines.push(headers.map((h) => csvEscape(row?.[h])).join(","));
    });
    // BOM UTF-8 pour Excel sur Windows
    const blob = new Blob(["\ufeff", lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function getPeriodDays() {
    const v = metricsPeriod?.value ?? "30";
    if (v === "all") return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 30;
  }

  function inPeriod(order, days) {
    if (days === null) return true;
    const t = new Date(order.createdAt).getTime();
    if (!Number.isFinite(t)) return false;
    const cutoff = Date.now() - days * 86400000;
    return t >= cutoff;
  }

  // ============================================================
  // Onglets
  // ============================================================
  function setActiveTab(tabId) {
    activeTab = tabId;
    tabs.forEach((btn) => {
      const active = btn.dataset.tab === tabId;
      btn.classList.toggle("admin-tab--active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    panels.forEach((p) => {
      p.classList.toggle("hidden", p.dataset.panel !== tabId);
    });
  }

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  // ============================================================
  // Bannière statut Supabase
  // ============================================================
  function refreshDataBanner() {
    const supabaseOk =
      typeof window.ShopData?.isSupabaseConfigured === "function" &&
      window.ShopData.isSupabaseConfigured();
    if (supabaseOk) {
      showBanner("");
    } else {
      showBanner(
        "Supabase non configuré sur ce serveur : les données affichées proviennent uniquement du localStorage de ce navigateur. Définissez SUPABASE_URL et SUPABASE_ANON_KEY sur Render et redéployez.",
        "warn"
      );
    }
  }

  // ============================================================
  // KPIs + top produits
  // ============================================================
  async function renderKpisAndTop() {
    const [orders, users, drivers, places, products] = await Promise.all([
      window.ShopData.getOrders(),
      window.ShopData.getUsers(),
      window.ShopData.getDrivers(),
      window.ShopData.getPlaces(),
      window.ShopData.getProducts()
    ]);

    const days = getPeriodDays();
    const periodOrders = orders.filter((o) => inPeriod(o, days));

    const delivered = periodOrders.filter((o) => o.status === "Livree").length;
    const inProgress = periodOrders.filter((o) =>
      ["Nouvelle", "En cours"].includes(o.status)
    ).length;
    const paid = periodOrders.filter((o) => o.paymentStatus === "Paye").length;
    const totalRevenue = periodOrders
      .filter((o) => o.paymentStatus === "Paye")
      .reduce((sum, o) => sum + getOrderTotalAmount(o), 0);
    const grossEstimated = periodOrders.reduce(
      (sum, o) => sum + getOrderTotalAmount(o),
      0
    );
    const conversionRate = periodOrders.length
      ? Math.round((paid / periodOrders.length) * 100)
      : 0;
    const avgBasket = paid ? Math.round(totalRevenue / paid) : 0;

    adminKpis.innerHTML = `
      <article class="kpi-card"><span>Commandes (période)</span><strong>${periodOrders.length}</strong></article>
      <article class="kpi-card"><span>En attente</span><strong>${inProgress}</strong></article>
      <article class="kpi-card"><span>Livrées</span><strong>${delivered}</strong></article>
      <article class="kpi-card"><span>Paiements reçus</span><strong>${paid}</strong></article>
      <article class="kpi-card"><span>Revenu encaissé</span><strong>${formatAmount(totalRevenue)}</strong></article>
      <article class="kpi-card"><span>Volume estimé</span><strong>${formatAmount(grossEstimated)}</strong></article>
      <article class="kpi-card"><span>Panier moyen (payé)</span><strong>${formatAmount(avgBasket)}</strong></article>
      <article class="kpi-card"><span>Conversion paiement</span><strong>${conversionRate}%</strong></article>
      <article class="kpi-card"><span>Utilisateurs</span><strong>${users.length}</strong></article>
      <article class="kpi-card"><span>Livreurs</span><strong>${drivers.length}</strong></article>
      <article class="kpi-card"><span>Lieux</span><strong>${places.length}</strong></article>
      <article class="kpi-card"><span>Produits catalogue</span><strong>${products.length}</strong></article>
    `;

    renderTopProducts(periodOrders);
  }

  function renderTopProducts(orders) {
    const map = new Map();
    orders.forEach((order) => {
      (order.besoins || []).forEach((item) => {
        const name = String(item.name || "").trim();
        if (!name) return;
        const key = name.toLowerCase();
        const prev = map.get(key) || { name, orders: 0, quantity: 0, amount: 0 };
        prev.orders += 1;
        prev.quantity += Number(item.quantity) || 0;
        prev.amount += lineAmountFcfa(item);
        map.set(key, prev);
      });
    });
    const top = Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity || b.orders - a.orders)
      .slice(0, 10);

    if (top.length === 0) {
      topProductsBody.innerHTML = `<tr><td colspan="4" class="muted">Aucune ligne de commande sur la période.</td></tr>`;
      return;
    }

    topProductsBody.innerHTML = top
      .map(
        (p) => `
          <tr>
            <td>${escapeHtml(p.name)}</td>
            <td>${p.orders}</td>
            <td>${p.quantity}</td>
            <td>${formatAmount(p.amount)}</td>
          </tr>
        `
      )
      .join("");
  }

  // ============================================================
  // Charts
  // ============================================================
  function destroyChart(ref) {
    if (ref && typeof ref.destroy === "function") ref.destroy();
  }

  async function renderCharts() {
    if (!window.Chart) return;
    const allOrders = await window.ShopData.getOrders();
    const days = getPeriodDays();
    const periodOrders = allOrders.filter((o) => inPeriod(o, days));

    // Segmentation
    const statusData = buildSegmentation(periodOrders, "status");
    const paymentData = buildSegmentation(periodOrders, "paiement");

    destroyChart(statusChart);
    destroyChart(paymentChart);

    statusChart = new window.Chart(statusChartCanvas, {
      type: "doughnut",
      data: {
        labels: Object.keys(statusData),
        datasets: [
          {
            data: Object.values(statusData),
            backgroundColor: [
              "#0ea5e9",
              "#f59e0b",
              "#22c55e",
              "#94a3b8",
              "#ef4444",
              "#a855f7"
            ]
          }
        ]
      },
      options: { plugins: { legend: { position: "bottom" } } }
    });

    paymentChart = new window.Chart(paymentChartCanvas, {
      type: "bar",
      data: {
        labels: Object.keys(paymentData),
        datasets: [
          {
            label: "Commandes",
            data: Object.values(paymentData),
            backgroundColor: "#0a6b3a"
          }
        ]
      },
      options: {
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        plugins: { legend: { display: false } }
      }
    });

    // Séries par jour : 14 derniers buckets (ou tout l'historique si "all" et moins)
    const buckets = computeDailyBuckets(periodOrders, days);

    destroyChart(dailyOrdersChart);
    destroyChart(dailyRevenueChart);

    dailyOrdersChart = new window.Chart(dailyOrdersCanvas, {
      type: "line",
      data: {
        labels: buckets.labels,
        datasets: [
          {
            label: "Commandes",
            data: buckets.orderCounts,
            borderColor: "#0a6b3a",
            backgroundColor: "rgba(10, 107, 58, 0.15)",
            tension: 0.3,
            fill: true,
            pointRadius: 3
          }
        ]
      },
      options: {
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        plugins: { legend: { display: false } }
      }
    });

    dailyRevenueChart = new window.Chart(dailyRevenueCanvas, {
      type: "bar",
      data: {
        labels: buckets.labels,
        datasets: [
          {
            label: "Revenu estimé (FCFA)",
            data: buckets.revenue,
            backgroundColor: "#0e7490"
          }
        ]
      },
      options: {
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { display: false } }
      }
    });
  }

  function computeDailyBuckets(orders, days) {
    const span = days === null ? 30 : Math.min(days, 90);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const labels = [];
    const orderCounts = [];
    const revenue = [];
    const map = new Map();

    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      if (!Number.isFinite(d.getTime())) return;
      const key = d.toISOString().slice(0, 10);
      const prev = map.get(key) || { orders: 0, revenue: 0 };
      prev.orders += 1;
      prev.revenue += getOrderTotalAmount(o);
      map.set(key, prev);
    });

    for (let i = span - 1; i >= 0; i -= 1) {
      const d = new Date(today.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      labels.push(d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }));
      const bucket = map.get(key) || { orders: 0, revenue: 0 };
      orderCounts.push(bucket.orders);
      revenue.push(bucket.revenue);
    }
    return { labels, orderCounts, revenue };
  }

  // ============================================================
  // Commandes
  // ============================================================
  async function getFilteredOrders() {
    const orders = await window.ShopData.getOrders();
    const statusValue = filterStatus.value;
    const paymentValue = filterPayment.value;
    const paymentStatusValue = filterPaymentStatus.value;
    const searchValue = filterSearch.value.trim().toLowerCase();

    return orders.filter((order) => {
      const statusMatch = statusValue === "all" || order.status === statusValue;
      const paymentMatch = paymentValue === "all" || order.paiement === paymentValue;
      const psMatch =
        paymentStatusValue === "all" || (order.paymentStatus || "Non paye") === paymentStatusValue;
      const haystack = [order.client, order.telephone, order.id, order.adresse]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const searchMatch = !searchValue || haystack.includes(searchValue);
      return statusMatch && paymentMatch && psMatch && searchMatch;
    });
  }

  async function renderOrders() {
    const [orders, drivers] = await Promise.all([
      getFilteredOrders(),
      window.ShopData.getDrivers()
    ]);
    adminOrders.innerHTML = "";

    if (ordersSummary) {
      const total = orders.reduce((sum, o) => sum + getOrderTotalAmount(o), 0);
      ordersSummary.textContent = `${orders.length} commande(s) affichée(s) — total estimé ${formatAmount(total)}.`;
    }

    if (orders.length === 0) {
      adminOrders.innerHTML = `<tr><td colspan="7" class="muted">Aucune commande pour ce filtre.</td></tr>`;
      return;
    }

    orders.forEach((order) => {
      const row = document.createElement("tr");
      row.dataset.orderId = order.id;
      row.className = selectedOrderId === order.id ? "order-row order-row--selected" : "order-row";
      const driverOptions = drivers
        .map((driver) => {
          const full = `${driver.firstName} ${driver.lastName}`;
          return `<option value="${escapeHtml(full)}" ${
            order.assignedDriver === full ? "selected" : ""
          }>${escapeHtml(full)}</option>`;
        })
        .join("");

      row.innerHTML = `
        <td>
          <strong>${escapeHtml(order.client)}</strong>
          <p class="muted" style="margin:0;font-size:0.78rem;">${escapeHtml(order.id)} · ${formatShortDate(order.createdAt)}</p>
        </td>
        <td>${escapeHtml(order.telephone)}</td>
        <td>${(order.besoins || []).length} ligne(s)<br><span class="muted">${formatAmount(getOrderTotalAmount(order))}</span></td>
        <td><span class="status-pill">${escapeHtml(order.status || "Nouvelle")}</span></td>
        <td>
          <select data-order-id="${escapeHtml(order.id)}" data-type="payment-status">
            <option value="Non paye" ${order.paymentStatus === "Non paye" ? "selected" : ""}>Non paye</option>
            <option value="En attente" ${order.paymentStatus === "En attente" ? "selected" : ""}>En attente</option>
            <option value="Partiellement paye" ${order.paymentStatus === "Partiellement paye" ? "selected" : ""}>Partiel</option>
            <option value="Paye" ${order.paymentStatus === "Paye" ? "selected" : ""}>Payé</option>
            <option value="Annule" ${order.paymentStatus === "Annule" ? "selected" : ""}>Annulé</option>
            <option value="Rembourse" ${order.paymentStatus === "Rembourse" ? "selected" : ""}>Remboursé</option>
          </select>
          <p class="muted" style="margin:0.2rem 0 0;font-size:0.72rem;">${escapeHtml(order.paiement || "-")}</p>
        </td>
        <td>
          <select data-order-id="${escapeHtml(order.id)}" data-type="driver">
            <option value="">Non assigné</option>
            ${driverOptions}
          </select>
        </td>
        <td>
          <div class="quick-status-actions">
            <button type="button" class="table-btn table-btn--neutral" data-set-status="${escapeHtml(order.id)}" data-status-value="En cours">En cours</button>
            <button type="button" class="table-btn table-btn--success" data-set-status="${escapeHtml(order.id)}" data-status-value="Livree">Livrée</button>
            <button type="button" class="table-btn table-btn--warning" data-set-status="${escapeHtml(order.id)}" data-status-value="Retournee">Retournée</button>
            <button type="button" class="table-btn table-btn--delete" data-set-status="${escapeHtml(order.id)}" data-status-value="Perdue">Perdue</button>
          </div>
          <div class="quick-status-actions">
            <button type="button" class="table-btn table-btn--edit" data-save-driver="${escapeHtml(order.id)}">Maj livreur</button>
            <button type="button" class="table-btn table-btn--edit" data-save-payment="${escapeHtml(order.id)}">Maj paiement</button>
          </div>
        </td>
      `;
      adminOrders.appendChild(row);
    });
  }

  async function renderOrderDetails(orderId) {
    const orders = await window.ShopData.getOrders();
    const order = orders.find((entry) => entry.id === orderId);
    if (!order) {
      selectedOrderId = null;
      orderDetailsRoot.classList.add("muted");
      orderDetailsRoot.innerHTML = "Aucune commande sélectionnée.";
      if (downloadOrderPngButton) downloadOrderPngButton.disabled = true;
      if (deleteOrderButton) deleteOrderButton.disabled = true;
      return;
    }

    selectedOrderId = orderId;
    const productsRows = (order.besoins || [])
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.quantity)}</td>
            <td>${escapeHtml(item.unit || "-")}</td>
            <td>${escapeHtml(item.brand || "-")}</td>
            <td>${formatAmount(item.amount)}</td>
            <td>${formatAmount(lineAmountFcfa(item))}</td>
          </tr>
        `
      )
      .join("");

    orderDetailsRoot.classList.remove("muted");
    orderDetailsRoot.innerHTML = `
      <article id="order-detail-card" class="detail-card">
        <h3>Commande ${escapeHtml(order.id)}</h3>
        <p><strong>Client :</strong> ${escapeHtml(order.client)}</p>
        <p><strong>Téléphone :</strong> ${escapeHtml(order.telephone)}</p>
        <p><strong>Adresse :</strong> ${escapeHtml(order.adresse)}</p>
        <p><strong>Créneau :</strong> ${escapeHtml(order.creneau || "-")}</p>
        <p><strong>Paiement :</strong> ${escapeHtml(order.paiement || "-")}</p>
        <p><strong>Statut commande :</strong> ${escapeHtml(order.status || "Nouvelle")}</p>
        <p><strong>Statut paiement :</strong> ${escapeHtml(order.paymentStatus || "Non paye")}</p>
        <p><strong>Livreur :</strong> ${escapeHtml(order.assignedDriver || "Non assigné")}</p>
        <p><strong>Date :</strong> ${formatDate(order.createdAt)}</p>
        <p><strong>Total estimé :</strong> ${formatAmount(getOrderTotalAmount(order))}</p>
        <p><strong>Note :</strong> ${escapeHtml(order.note || "Aucune")}</p>
        <div class="table-wrap">
          <table class="summary-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Quantité</th>
                <th>Unité</th>
                <th>Marque</th>
                <th>PU</th>
                <th>Sous-total</th>
              </tr>
            </thead>
            <tbody>${productsRows || "<tr><td colspan='6' class='muted'>Aucune ligne</td></tr>"}</tbody>
          </table>
        </div>
      </article>
    `;
    if (downloadOrderPngButton) downloadOrderPngButton.disabled = false;
    if (deleteOrderButton) deleteOrderButton.disabled = false;
  }

  // ============================================================
  // Produits
  // ============================================================
  function setProductFormMode() {
    if (editingProductId) {
      productFormTitle.textContent = "Modifier le produit";
      productSubmitButton.textContent = "Mettre à jour";
      productCancelEditButton.classList.remove("hidden");
    } else {
      productFormTitle.textContent = "Ajouter un produit";
      productSubmitButton.textContent = "Ajouter le produit";
      productCancelEditButton.classList.add("hidden");
    }
  }

  function resetProductForm() {
    editingProductId = null;
    productForm.reset();
    productInStock.value = "true";
    setProductFormMode();
    if (productFormStatus) productFormStatus.textContent = "";
  }

  async function renderProducts() {
    const products = await window.ShopData.getProducts();
    const query = (productFilter?.value || "").trim().toLowerCase();
    const filtered = query
      ? products.filter((p) =>
          [p.name, p.brand, p.category, p.description]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query)
        )
      : products;

    if (productsCount) productsCount.textContent = String(products.length);
    adminProducts.innerHTML = "";

    if (filtered.length === 0) {
      adminProducts.innerHTML = `<p class="muted">Aucun produit pour le moment.</p>`;
      return;
    }

    filtered.forEach((p) => {
      const card = document.createElement("article");
      card.className = "admin-product-card";
      const img = p.imageUrl
        ? `<img class="admin-product-card__img" src="${escapeHtml(p.imageUrl)}" alt="" loading="lazy" />`
        : `<div class="admin-product-card__img admin-product-card__img--placeholder">📦</div>`;
      card.innerHTML = `
        ${img}
        <div class="admin-product-card__body">
          <header>
            <h3>${escapeHtml(p.name)}</h3>
            <span class="status-pill status-pill--${p.inStock ? "ok" : "ko"}">
              ${p.inStock ? "En stock" : "Rupture"}
            </span>
          </header>
          <p class="muted admin-product-card__meta">
            ${escapeHtml(p.category || "—")} · ${escapeHtml(p.brand || "Sans marque")}
          </p>
          <p class="admin-product-card__price">${
            typeof p.priceFcfa === "number" ? formatAmount(p.priceFcfa) : "Prix non défini"
          }</p>
          ${p.description ? `<p class="admin-product-card__desc">${escapeHtml(p.description)}</p>` : ""}
          <div class="quick-status-actions">
            <button type="button" class="table-btn table-btn--edit" data-edit-product="${escapeHtml(p.id)}">Modifier</button>
            <button type="button" class="table-btn table-btn--delete" data-remove-product="${escapeHtml(p.id)}">Supprimer</button>
            ${p.sourceUrl ? `<a class="table-btn table-btn--neutral" href="${escapeHtml(p.sourceUrl)}" target="_blank" rel="noreferrer">Fiche</a>` : ""}
          </div>
        </div>
      `;
      adminProducts.appendChild(card);
    });
  }

  // ============================================================
  // Utilisateurs
  // ============================================================
  async function renderUsers() {
    const users = await window.ShopData.getUsers();
    const query = (usersFilter?.value || "").trim().toLowerCase();
    const filtered = query
      ? users.filter((u) =>
          [u.fullName, u.phone, u.email, u.address]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query)
        )
      : users;

    if (usersCount) usersCount.textContent = String(users.length);
    adminUsers.innerHTML = "";

    if (filtered.length === 0) {
      adminUsers.innerHTML = `<p class="muted">Aucun utilisateur ne correspond.</p>`;
      return;
    }

    filtered.forEach((user) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "history-item history-item--button";
      item.dataset.openUser = user.id;
      item.innerHTML = `
        <div>
          <strong>${escapeHtml(user.fullName)}</strong>
          <p>${escapeHtml(user.phone)}${user.email ? ` · ${escapeHtml(user.email)}` : ""}</p>
        </div>
        <span class="muted">${formatShortDate(user.createdAt)}</span>
      `;
      adminUsers.appendChild(item);
    });
  }

  async function openUserModal(userId) {
    const [users, orders] = await Promise.all([
      window.ShopData.getUsers(),
      window.ShopData.getOrders()
    ]);
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    selectedUserId = userId;
    userModalTitle.textContent = user.fullName || "Utilisateur";

    const userOrders = orders.filter(
      (o) =>
        (user.phone && o.telephone === user.phone) ||
        (user.fullName && o.client && o.client.toLowerCase() === user.fullName.toLowerCase())
    );
    const totalPaid = userOrders
      .filter((o) => o.paymentStatus === "Paye")
      .reduce((sum, o) => sum + getOrderTotalAmount(o), 0);

    const ordersList = userOrders.length
      ? `
          <div class="table-wrap">
            <table class="summary-table">
              <thead>
                <tr><th>Date</th><th>Statut</th><th>Paiement</th><th>Total</th></tr>
              </thead>
              <tbody>
                ${userOrders
                  .map(
                    (o) => `
                      <tr>
                        <td>${formatDate(o.createdAt)}</td>
                        <td>${escapeHtml(o.status || "-")}</td>
                        <td>${escapeHtml(o.paymentStatus || "-")}</td>
                        <td>${formatAmount(getOrderTotalAmount(o))}</td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `
      : `<p class="muted">Aucune commande associée à ce numéro.</p>`;

    userModalBody.innerHTML = `
      <p><strong>Téléphone :</strong> ${escapeHtml(user.phone || "-")}</p>
      <p><strong>Email :</strong> ${escapeHtml(user.email || "-")}</p>
      <p><strong>Adresse :</strong> ${escapeHtml(user.address || "-")}</p>
      <p><strong>Inscription :</strong> ${formatDate(user.createdAt)}</p>
      <p><strong>Commandes :</strong> ${userOrders.length} — Payé cumulé : ${formatAmount(totalPaid)}</p>
      ${ordersList}
    `;
    userModal.classList.remove("hidden");
  }

  function closeUserModal() {
    selectedUserId = null;
    userModal.classList.add("hidden");
  }

  // ============================================================
  // Livreurs & lieux
  // ============================================================
  function setDriverFormMode() {
    if (editingDriverId) {
      driverSubmitButton.textContent = "Mettre à jour livreur";
      driverCancelEditButton.classList.remove("hidden");
    } else {
      driverSubmitButton.textContent = "Ajouter livreur";
      driverCancelEditButton.classList.add("hidden");
    }
  }
  function resetDriverFormMode() {
    editingDriverId = null;
    driverForm.reset();
    setDriverFormMode();
  }
  function setPlaceFormMode() {
    if (editingPlaceId) {
      placeSubmitButton.textContent = "Mettre à jour lieu";
      placeCancelEditButton.classList.remove("hidden");
    } else {
      placeSubmitButton.textContent = "Ajouter lieu";
      placeCancelEditButton.classList.add("hidden");
    }
  }
  function resetPlaceFormMode() {
    editingPlaceId = null;
    placeForm.reset();
    setPlaceFormMode();
  }

  async function renderDrivers() {
    const drivers = await window.ShopData.getDrivers();
    adminDrivers.innerHTML = "";
    if (drivers.length === 0) {
      adminDrivers.innerHTML = `<p class="muted">Aucun livreur.</p>`;
      return;
    }
    drivers.forEach((driver) => {
      const item = document.createElement("div");
      item.className = "history-item";
      item.innerHTML = `
        <div>
          <strong>${escapeHtml(driver.firstName)} ${escapeHtml(driver.lastName)}</strong>
          <p>${escapeHtml(driver.zone)}</p>
        </div>
        <div class="quick-status-actions">
          <button type="button" class="table-btn table-btn--edit" data-edit-driver="${escapeHtml(driver.id)}">Modifier</button>
          <button type="button" class="table-btn table-btn--delete" data-remove-driver="${escapeHtml(driver.id)}">Supprimer</button>
        </div>
      `;
      adminDrivers.appendChild(item);
    });
  }

  async function renderPlaces() {
    const places = await window.ShopData.getPlaces();
    adminPlaces.innerHTML = "";
    if (places.length === 0) {
      adminPlaces.innerHTML = `<p class="muted">Aucun lieu.</p>`;
      return;
    }
    places.forEach((place) => {
      const item = document.createElement("div");
      item.className = "history-item";
      item.innerHTML = `
        <div>
          <strong>${escapeHtml(place.name)}</strong>
          <p>${escapeHtml(place.area)}</p>
        </div>
        <div class="quick-status-actions">
          <button type="button" class="table-btn table-btn--edit" data-edit-place="${escapeHtml(place.id)}">Modifier</button>
          <button type="button" class="table-btn table-btn--delete" data-remove-place="${escapeHtml(place.id)}">Supprimer</button>
        </div>
      `;
      adminPlaces.appendChild(item);
    });
  }

  // ============================================================
  // Refresh global
  // ============================================================
  async function refreshAll() {
    refreshDataBanner();
    await Promise.all([
      renderKpisAndTop(),
      renderOrders(),
      renderProducts(),
      renderUsers(),
      renderDrivers(),
      renderPlaces(),
      renderCharts()
    ]);
    if (selectedOrderId) await renderOrderDetails(selectedOrderId);
  }

  // ============================================================
  // Wiring : Commandes
  // ============================================================
  adminOrders.addEventListener("click", async (event) => {
    const row = event.target.closest("tr[data-order-id]");
    const control = event.target.closest("button,select");
    if (row && !control) {
      await renderOrderDetails(row.dataset.orderId);
      await renderOrders();
      return;
    }

    const statusButton = event.target.closest("button[data-set-status]");
    if (statusButton) {
      const orderId = statusButton.dataset.setStatus;
      const newStatus = statusButton.dataset.statusValue;
      const driverSelect = adminOrders.querySelector(
        `select[data-order-id="${CSS.escape(orderId)}"][data-type="driver"]`
      );
      await window.ShopData.updateOrder(orderId, {
        status: newStatus,
        assignedDriver: driverSelect ? driverSelect.value : ""
      });
      await refreshAll();
      await renderOrderDetails(orderId);
      return;
    }

    const driverButton = event.target.closest("button[data-save-driver]");
    if (driverButton) {
      const orderId = driverButton.dataset.saveDriver;
      const sel = adminOrders.querySelector(
        `select[data-order-id="${CSS.escape(orderId)}"][data-type="driver"]`
      );
      await window.ShopData.updateOrder(orderId, {
        assignedDriver: sel ? sel.value : ""
      });
      await refreshAll();
      await renderOrderDetails(orderId);
      return;
    }

    const paymentButton = event.target.closest("button[data-save-payment]");
    if (!paymentButton) return;
    const orderId = paymentButton.dataset.savePayment;
    const sel = adminOrders.querySelector(
      `select[data-order-id="${CSS.escape(orderId)}"][data-type="payment-status"]`
    );
    if (!sel) return;
    await window.ShopData.updateOrder(orderId, { paymentStatus: sel.value });
    await refreshAll();
    await renderOrderDetails(orderId);
  });

  [filterStatus, filterPayment, filterPaymentStatus, filterSearch].forEach((el) => {
    el?.addEventListener(el.tagName === "INPUT" ? "input" : "change", async () => {
      await renderOrders();
      await renderCharts();
    });
  });

  downloadOrderPngButton?.addEventListener("click", async () => {
    if (!selectedOrderId) return;
    const card = document.getElementById("order-detail-card");
    if (!card || !window.html2canvas) return;
    const canvas = await window.html2canvas(card, { backgroundColor: "#ffffff", scale: 2 });
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `commande-${selectedOrderId}.png`;
    link.click();
  });

  deleteOrderButton?.addEventListener("click", async () => {
    if (!selectedOrderId) return;
    if (!window.confirm(`Supprimer la commande ${selectedOrderId} ? Cette action est irréversible.`)) return;
    const res = await window.ShopData.removeOrder(selectedOrderId);
    if (!res?.ok) {
      alert(`Suppression refusée : ${res?.error || "inconnu"}`);
      return;
    }
    selectedOrderId = null;
    await refreshAll();
    await renderOrderDetails(null);
  });

  // ============================================================
  // Wiring : Produits
  // ============================================================
  productForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (productFormStatus) productFormStatus.textContent = "Enregistrement…";
    const priceRaw = productPrice.value.trim();
    const priceFcfa = priceRaw ? Number(priceRaw) : null;
    const res = await window.ShopData.upsertProduct({
      id: editingProductId || undefined,
      name: productName.value.trim(),
      brand: productBrand.value.trim(),
      category: productCategory.value.trim(),
      description: productDescription.value.trim(),
      priceFcfa: Number.isFinite(priceFcfa) ? priceFcfa : null,
      imageUrl: productImage.value.trim(),
      sourceUrl: productSource.value.trim(),
      inStock: productInStock.value === "true"
    });
    if (!res?.ok) {
      if (productFormStatus) {
        productFormStatus.textContent = `Refus base : ${res?.error || "voir console (F12)."}`;
      }
      return;
    }
    resetProductForm();
    if (productFormStatus) {
      productFormStatus.textContent =
        res.source === "supabase"
          ? "Produit enregistré dans Supabase."
          : "Produit enregistré localement (Supabase indisponible).";
    }
    await renderProducts();
    await renderKpisAndTop();
  });

  productCancelEditButton?.addEventListener("click", () => resetProductForm());
  productFilter?.addEventListener("input", () => renderProducts());

  adminProducts.addEventListener("click", async (event) => {
    const editBtn = event.target.closest("button[data-edit-product]");
    if (editBtn) {
      const products = await window.ShopData.getProducts();
      const p = products.find((entry) => entry.id === editBtn.dataset.editProduct);
      if (!p) return;
      editingProductId = p.id;
      productName.value = p.name || "";
      productBrand.value = p.brand || "";
      productCategory.value = p.category || "";
      productPrice.value = typeof p.priceFcfa === "number" ? String(p.priceFcfa) : "";
      productImage.value = p.imageUrl || "";
      productSource.value = p.sourceUrl || "";
      productInStock.value = p.inStock === false ? "false" : "true";
      productDescription.value = p.description || "";
      setProductFormMode();
      setActiveTab("products");
      productName.focus();
      return;
    }
    const delBtn = event.target.closest("button[data-remove-product]");
    if (!delBtn) return;
    if (!window.confirm("Supprimer ce produit ?")) return;
    const res = await window.ShopData.removeProduct(delBtn.dataset.removeProduct);
    if (!res?.ok) {
      alert(`Suppression refusée : ${res?.error || "inconnu"}`);
      return;
    }
    if (editingProductId === delBtn.dataset.removeProduct) resetProductForm();
    await renderProducts();
    await renderKpisAndTop();
  });

  // ============================================================
  // Wiring : Utilisateurs
  // ============================================================
  usersFilter?.addEventListener("input", () => renderUsers());

  adminUsers.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-open-user]");
    if (!btn) return;
    openUserModal(btn.dataset.openUser);
  });

  userModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-modal-close]")) {
      closeUserModal();
    }
  });

  userModalDelete.addEventListener("click", async () => {
    if (!selectedUserId) return;
    if (!window.confirm("Supprimer ce compte ? Les commandes associées resteront en base.")) return;
    const res = await window.ShopData.removeUser(selectedUserId);
    if (!res?.ok) {
      alert(`Suppression refusée : ${res?.error || "inconnu"}`);
      return;
    }
    closeUserModal();
    await renderUsers();
    await renderKpisAndTop();
  });

  // ============================================================
  // Wiring : Livreurs & lieux
  // ============================================================
  driverForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await window.ShopData.upsertDriver({
      id: editingDriverId || undefined,
      firstName: driverFirstname.value.trim(),
      lastName: driverLastname.value.trim(),
      zone: driverZone.value.trim(),
      photo: driverPhoto.value.trim()
    });
    resetDriverFormMode();
    await renderDrivers();
    await renderOrders();
    await renderKpisAndTop();
  });

  placeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await window.ShopData.upsertPlace({
      id: editingPlaceId || undefined,
      name: placeName.value.trim(),
      area: placeArea.value.trim()
    });
    resetPlaceFormMode();
    await renderPlaces();
    await renderKpisAndTop();
  });

  adminDrivers.addEventListener("click", async (event) => {
    const editBtn = event.target.closest("button[data-edit-driver]");
    if (editBtn) {
      const drivers = await window.ShopData.getDrivers();
      const driver = drivers.find((entry) => entry.id === editBtn.dataset.editDriver);
      if (!driver) return;
      editingDriverId = driver.id;
      driverFirstname.value = driver.firstName;
      driverLastname.value = driver.lastName;
      driverZone.value = driver.zone;
      driverPhoto.value = driver.photo;
      setDriverFormMode();
      driverFirstname.focus();
      return;
    }
    const delBtn = event.target.closest("button[data-remove-driver]");
    if (!delBtn) return;
    if (!window.confirm("Supprimer ce livreur ?")) return;
    await window.ShopData.removeDriver(delBtn.dataset.removeDriver);
    if (editingDriverId === delBtn.dataset.removeDriver) resetDriverFormMode();
    await renderDrivers();
    await renderOrders();
    await renderKpisAndTop();
  });

  adminPlaces.addEventListener("click", async (event) => {
    const editBtn = event.target.closest("button[data-edit-place]");
    if (editBtn) {
      const places = await window.ShopData.getPlaces();
      const place = places.find((entry) => entry.id === editBtn.dataset.editPlace);
      if (!place) return;
      editingPlaceId = place.id;
      placeName.value = place.name;
      placeArea.value = place.area;
      setPlaceFormMode();
      placeName.focus();
      return;
    }
    const delBtn = event.target.closest("button[data-remove-place]");
    if (!delBtn) return;
    if (!window.confirm("Supprimer ce lieu ?")) return;
    await window.ShopData.removePlace(delBtn.dataset.removePlace);
    if (editingPlaceId === delBtn.dataset.removePlace) resetPlaceFormMode();
    await renderPlaces();
    await renderKpisAndTop();
  });

  driverCancelEditButton?.addEventListener("click", () => resetDriverFormMode());
  placeCancelEditButton?.addEventListener("click", () => resetPlaceFormMode());

  // ============================================================
  // Période + refresh
  // ============================================================
  metricsPeriod?.addEventListener("change", async () => {
    await renderKpisAndTop();
    await renderCharts();
  });
  refreshDashboardBtn?.addEventListener("click", refreshAll);

  // ============================================================
  // Exports CSV
  // ============================================================
  async function exportData(kind) {
    if (kind === "orders") {
      const orders = await getFilteredOrders();
      downloadCsv(
        `shopsenegal-commandes-${new Date().toISOString().slice(0, 10)}.csv`,
        orders.map((o) => ({
          id: o.id,
          date: o.createdAt,
          client: o.client,
          telephone: o.telephone,
          adresse: o.adresse,
          creneau: o.creneau,
          paiement: o.paiement,
          paymentStatus: o.paymentStatus,
          status: o.status,
          assignedDriver: o.assignedDriver,
          lignes: (o.besoins || []).length,
          totalFcfa: getOrderTotalAmount(o),
          note: o.note
        }))
      );
    } else if (kind === "users") {
      const users = await window.ShopData.getUsers();
      downloadCsv(
        `shopsenegal-utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`,
        users.map((u) => ({
          id: u.id,
          fullName: u.fullName,
          phone: u.phone,
          email: u.email,
          address: u.address,
          createdAt: u.createdAt
        }))
      );
    } else if (kind === "products") {
      const products = await window.ShopData.getProducts();
      downloadCsv(
        `shopsenegal-produits-${new Date().toISOString().slice(0, 10)}.csv`,
        products.map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          category: p.category,
          priceFcfa: p.priceFcfa,
          inStock: p.inStock,
          imageUrl: p.imageUrl,
          sourceUrl: p.sourceUrl,
          description: p.description
        }))
      );
    } else if (kind === "drivers") {
      const drivers = await window.ShopData.getDrivers();
      downloadCsv(`shopsenegal-livreurs.csv`, drivers);
    } else if (kind === "places") {
      const places = await window.ShopData.getPlaces();
      downloadCsv(`shopsenegal-lieux.csv`, places);
    }
  }

  document.querySelectorAll("[data-export]").forEach((btn) => {
    btn.addEventListener("click", () => exportData(btn.dataset.export));
  });
  exportOrdersCsvBtn?.addEventListener("click", () => exportData("orders"));
  exportProductsCsvBtn?.addEventListener("click", () => exportData("products"));
  exportUsersCsvBtn?.addEventListener("click", () => exportData("users"));

  // ============================================================
  // Boot
  // ============================================================
  function bootDashboard() {
    setProductFormMode();
    setDriverFormMode();
    setPlaceFormMode();
    setActiveTab("dashboard");
    refreshAll();
  }

  if (isAuthed()) {
    hideLogin();
    showSessionBar();
    bootDashboard();
  } else {
    showLogin();
  }
})();
