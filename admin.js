const adminOrders = document.getElementById("admin-orders");
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
const adminUsers = document.getElementById("admin-users");
const adminKpis = document.getElementById("admin-kpis");
const filterStatus = document.getElementById("filter-status");
const filterPayment = document.getElementById("filter-payment");
const filterSearch = document.getElementById("filter-search");
const statusChartCanvas = document.getElementById("status-chart");
const paymentChartCanvas = document.getElementById("payment-chart");
const orderDetailsRoot = document.getElementById("order-details-root");
const downloadOrderPngButton = document.getElementById("download-order-png");

let statusChart;
let paymentChart;
let selectedOrderId = null;
let editingDriverId = null;
let editingPlaceId = null;

function setDriverFormMode() {
  if (editingDriverId) {
    driverSubmitButton.textContent = "Mettre a jour livreur";
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
    placeSubmitButton.textContent = "Mettre a jour lieu";
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

function formatDate(dateString) {
  return new Date(dateString).toLocaleString("fr-FR");
}

function formatAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return `${amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA`;
}

function getOrderTotalAmount(order) {
  return order.besoins.reduce((sum, item) => {
    const amount = Number(item.amount);
    return Number.isFinite(amount) && amount >= 0 ? sum + amount : sum;
  }, 0);
}

function buildSegmentation(orders, key) {
  return orders.reduce((acc, order) => {
    const value = order[key] || "Non defini";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

async function getFilteredOrders() {
  const orders = await window.ShopData.getOrders();
  const statusValue = filterStatus.value;
  const paymentValue = filterPayment.value;
  const searchValue = filterSearch.value.trim().toLowerCase();

  return orders.filter((order) => {
    const statusMatch = statusValue === "all" || order.status === statusValue;
    const paymentMatch = paymentValue === "all" || order.paiement === paymentValue;
    const searchMatch =
      !searchValue ||
      order.client.toLowerCase().includes(searchValue) ||
      order.telephone.toLowerCase().includes(searchValue);
    return statusMatch && paymentMatch && searchMatch;
  });
}

async function renderOrderDetails(orderId) {
  const orders = await window.ShopData.getOrders();
  const order = orders.find((entry) => entry.id === orderId);
  if (!order) {
    selectedOrderId = null;
    orderDetailsRoot.classList.add("muted");
    orderDetailsRoot.innerHTML = "Aucune commande selectionnee.";
    downloadOrderPngButton.disabled = true;
    return;
  }

  selectedOrderId = orderId;
  const productsRows = order.besoins
    .map(
      (item) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>${item.unit || "-"}</td>
          <td>${item.brand || "-"}</td>
          <td>${formatAmount(item.amount)}</td>
        </tr>
      `
    )
    .join("");

  orderDetailsRoot.classList.remove("muted");
  orderDetailsRoot.innerHTML = `
    <article id="order-detail-card" class="detail-card">
      <h3>Commande ${order.id}</h3>
      <p><strong>Client:</strong> ${order.client}</p>
      <p><strong>Telephone:</strong> ${order.telephone}</p>
      <p><strong>Adresse:</strong> ${order.adresse}</p>
      <p><strong>Creneau:</strong> ${order.creneau || "-"}</p>
      <p><strong>Paiement:</strong> ${order.paiement || "-"}</p>
      <p><strong>Statut commande:</strong> ${order.status || "Nouvelle"}</p>
      <p><strong>Statut paiement:</strong> ${order.paymentStatus || "Non paye"}</p>
      <p><strong>Livreur:</strong> ${order.assignedDriver || "Non assigne"}</p>
      <p><strong>Date:</strong> ${formatDate(order.createdAt)}</p>
      <p><strong>Note:</strong> ${order.note || "Aucune"}</p>
      <div class="table-wrap">
        <table class="summary-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Quantite</th>
              <th>Unite</th>
              <th>Marque</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>${productsRows}</tbody>
        </table>
      </div>
    </article>
  `;
  downloadOrderPngButton.disabled = false;
}

async function renderKpis() {
  const [orders, users, drivers, places] = await Promise.all([
    window.ShopData.getOrders(),
    window.ShopData.getUsers(),
    window.ShopData.getDrivers(),
    window.ShopData.getPlaces()
  ]);

  const deliveredOrders = orders.filter((order) => order.status === "Livree").length;
  const totalAmount = orders.reduce((sum, order) => sum + getOrderTotalAmount(order), 0);
  const avgBasketAmount = orders.length ? totalAmount / orders.length : 0;
  const avgBasketAmountLabel = avgBasketAmount.toLocaleString("fr-FR", {
    maximumFractionDigits: 0
  });

  adminKpis.innerHTML = `
    <article class="kpi-card"><span>Commandes total</span><strong>${orders.length}</strong></article>
    <article class="kpi-card"><span>Commandes livrees</span><strong>${deliveredOrders}</strong></article>
    <article class="kpi-card"><span>Panier moyen (FCFA)</span><strong>${avgBasketAmountLabel}</strong></article>
    <article class="kpi-card"><span>Utilisateurs inscrits</span><strong>${users.length}</strong></article>
    <article class="kpi-card"><span>Livreurs actifs</span><strong>${drivers.length}</strong></article>
    <article class="kpi-card"><span>Lieux actifs</span><strong>${places.length}</strong></article>
  `;
}

async function renderCharts() {
  if (!window.Chart) return;
  const orders = await getFilteredOrders();
  const statusData = buildSegmentation(orders, "status");
  const paymentData = buildSegmentation(orders, "paiement");

  if (statusChart) statusChart.destroy();
  if (paymentChart) paymentChart.destroy();

  statusChart = new window.Chart(statusChartCanvas, {
    type: "doughnut",
    data: {
      labels: Object.keys(statusData),
      datasets: [{ data: Object.values(statusData), backgroundColor: ["#38bdf8", "#f59e0b", "#22c55e", "#94a3b8"] }]
    },
    options: { plugins: { legend: { position: "bottom" } } }
  });

  paymentChart = new window.Chart(paymentChartCanvas, {
    type: "bar",
    data: {
      labels: Object.keys(paymentData),
      datasets: [{ label: "Commandes", data: Object.values(paymentData), backgroundColor: "#0ea5e9" }]
    },
    options: {
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      plugins: { legend: { display: false } }
    }
  });
}

async function renderOrders() {
  const [orders, drivers] = await Promise.all([getFilteredOrders(), window.ShopData.getDrivers()]);
  adminOrders.innerHTML = "";
  if (orders.length === 0) {
    adminOrders.innerHTML = `<tr><td colspan="7">Aucune commande pour le moment.</td></tr>`;
    return;
  }

  orders.forEach((order) => {
    const row = document.createElement("tr");
    row.dataset.orderId = order.id;
    row.className = selectedOrderId === order.id ? "order-row order-row--selected" : "order-row";
    const options = drivers
      .map(
        (driver) =>
          `<option value="${driver.firstName} ${driver.lastName}" ${
            order.assignedDriver === `${driver.firstName} ${driver.lastName}` ? "selected" : ""
          }>${driver.firstName} ${driver.lastName}</option>`
      )
      .join("");

    row.innerHTML = `
      <td>${order.client}</td>
      <td>${order.telephone}</td>
      <td>${order.besoins.length}</td>
      <td><span class="status-pill">${order.status || "Nouvelle"}</span></td>
      <td>
        <select data-order-id="${order.id}" data-type="payment-status">
          <option value="Non paye" ${order.paymentStatus === "Non paye" ? "selected" : ""}>Non paye</option>
          <option value="En attente" ${order.paymentStatus === "En attente" ? "selected" : ""}>En attente Paydunya</option>
          <option value="Partiellement paye" ${order.paymentStatus === "Partiellement paye" ? "selected" : ""}>Partiellement paye</option>
          <option value="Paye" ${order.paymentStatus === "Paye" ? "selected" : ""}>Paye</option>
          <option value="Annule" ${order.paymentStatus === "Annule" ? "selected" : ""}>Annule / echoue</option>
          <option value="Rembourse" ${order.paymentStatus === "Rembourse" ? "selected" : ""}>Rembourse</option>
        </select>
      </td>
      <td>
        <select data-order-id="${order.id}" data-type="driver">
          <option value="">Non assigne</option>
          ${options}
        </select>
      </td>
      <td>
        <div class="quick-status-actions">
          <button type="button" class="table-btn table-btn--neutral" data-set-status="${order.id}" data-status-value="En cours">En cours</button>
          <button type="button" class="table-btn table-btn--success" data-set-status="${order.id}" data-status-value="Livree">Livree</button>
          <button type="button" class="table-btn table-btn--warning" data-set-status="${order.id}" data-status-value="Retournee">Retournee</button>
          <button type="button" class="table-btn table-btn--delete" data-set-status="${order.id}" data-status-value="Perdue">Perdue</button>
        </div>
        <div class="quick-status-actions">
          <button type="button" class="table-btn table-btn--edit" data-save-driver="${order.id}">Maj livreur</button>
          <button type="button" class="table-btn table-btn--edit" data-save-payment="${order.id}">Maj paiement</button>
        </div>
      </td>
    `;
    adminOrders.appendChild(row);
  });
}

async function renderUsers() {
  const users = await window.ShopData.getUsers();
  adminUsers.innerHTML = "";
  if (users.length === 0) {
    adminUsers.innerHTML = `<p class="muted">Aucun utilisateur inscrit pour le moment.</p>`;
    return;
  }

  users.forEach((user) => {
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <div>
        <strong>${user.fullName}</strong>
        <p>${user.phone} ${user.email ? `- ${user.email}` : ""}</p>
      </div>
      <span class="muted">${new Date(user.createdAt).toLocaleDateString("fr-FR")}</span>
    `;
    adminUsers.appendChild(item);
  });
}

async function renderDrivers() {
  const drivers = await window.ShopData.getDrivers();
  adminDrivers.innerHTML = "";
  drivers.forEach((driver) => {
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <div>
        <strong>${driver.firstName} ${driver.lastName}</strong>
        <p>${driver.zone}</p>
      </div>
      <div class="quick-status-actions">
        <button type="button" class="table-btn table-btn--edit" data-edit-driver="${driver.id}">Modifier</button>
        <button type="button" class="table-btn table-btn--delete" data-remove-driver="${driver.id}">Supprimer</button>
      </div>
    `;
    adminDrivers.appendChild(item);
  });
}

async function renderPlaces() {
  const places = await window.ShopData.getPlaces();
  adminPlaces.innerHTML = "";
  places.forEach((place) => {
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <div>
        <strong>${place.name}</strong>
        <p>${place.area}</p>
      </div>
      <div class="quick-status-actions">
        <button type="button" class="table-btn table-btn--edit" data-edit-place="${place.id}">Modifier</button>
        <button type="button" class="table-btn table-btn--delete" data-remove-place="${place.id}">Supprimer</button>
      </div>
    `;
    adminPlaces.appendChild(item);
  });
}

async function refreshDashboard() {
  await Promise.all([renderOrders(), renderDrivers(), renderPlaces(), renderUsers(), renderKpis(), renderCharts()]);
  if (selectedOrderId) await renderOrderDetails(selectedOrderId);
}

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
  await refreshDashboard();
});

placeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await window.ShopData.upsertPlace({
    id: editingPlaceId || undefined,
    name: placeName.value.trim(),
    area: placeArea.value.trim()
  });
  resetPlaceFormMode();
  await refreshDashboard();
});

adminDrivers.addEventListener("click", async (event) => {
  const editButton = event.target.closest("button[data-edit-driver]");
  if (editButton) {
    const drivers = await window.ShopData.getDrivers();
    const driver = drivers.find((entry) => entry.id === editButton.dataset.editDriver);
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

  const button = event.target.closest("button[data-remove-driver]");
  if (!button) return;
  await window.ShopData.removeDriver(button.dataset.removeDriver);
  if (editingDriverId === button.dataset.removeDriver) {
    resetDriverFormMode();
  }
  await refreshDashboard();
});

adminPlaces.addEventListener("click", async (event) => {
  const editButton = event.target.closest("button[data-edit-place]");
  if (editButton) {
    const places = await window.ShopData.getPlaces();
    const place = places.find((entry) => entry.id === editButton.dataset.editPlace);
    if (!place) return;
    editingPlaceId = place.id;
    placeName.value = place.name;
    placeArea.value = place.area;
    setPlaceFormMode();
    placeName.focus();
    return;
  }

  const button = event.target.closest("button[data-remove-place]");
  if (!button) return;
  await window.ShopData.removePlace(button.dataset.removePlace);
  if (editingPlaceId === button.dataset.removePlace) {
    resetPlaceFormMode();
  }
  await refreshDashboard();
});

driverCancelEditButton.addEventListener("click", () => {
  resetDriverFormMode();
});

placeCancelEditButton.addEventListener("click", () => {
  resetPlaceFormMode();
});

adminOrders.addEventListener("click", async (event) => {
  const clickedRow = event.target.closest("tr[data-order-id]");
  const clickedControl = event.target.closest("button,select");
  if (clickedRow && !clickedControl) {
    await renderOrderDetails(clickedRow.dataset.orderId);
    await renderOrders();
    return;
  }

  const statusButton = event.target.closest("button[data-set-status]");
  if (statusButton) {
    const orderId = statusButton.dataset.setStatus;
    const newStatus = statusButton.dataset.statusValue;
    const driverSelect = adminOrders.querySelector(`select[data-order-id="${orderId}"][data-type="driver"]`);
    await window.ShopData.updateOrder(orderId, {
      status: newStatus,
      assignedDriver: driverSelect ? driverSelect.value : ""
    });
    await refreshDashboard();
    await renderOrderDetails(orderId);
    return;
  }

  const driverButton = event.target.closest("button[data-save-driver]");
  if (driverButton) {
    const orderId = driverButton.dataset.saveDriver;
    const driverSelect = adminOrders.querySelector(`select[data-order-id="${orderId}"][data-type="driver"]`);
    await window.ShopData.updateOrder(orderId, { assignedDriver: driverSelect ? driverSelect.value : "" });
    await refreshDashboard();
    await renderOrderDetails(orderId);
    return;
  }

  const paymentButton = event.target.closest("button[data-save-payment]");
  if (!paymentButton) return;
  const orderId = paymentButton.dataset.savePayment;
  const paymentStatusSelect = adminOrders.querySelector(
    `select[data-order-id="${orderId}"][data-type="payment-status"]`
  );
  await window.ShopData.updateOrder(orderId, {
    paymentStatus: paymentStatusSelect.value
  });
  await refreshDashboard();
  await renderOrderDetails(orderId);
});

downloadOrderPngButton.addEventListener("click", async () => {
  if (!selectedOrderId) return;
  const detailCard = document.getElementById("order-detail-card");
  if (!detailCard || !window.html2canvas) return;

  const canvas = await window.html2canvas(detailCard, {
    backgroundColor: "#ffffff",
    scale: 2
  });
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `commande-${selectedOrderId}.png`;
  link.click();
});

filterStatus.addEventListener("change", async () => {
  await renderOrders();
  await renderCharts();
});

filterPayment.addEventListener("change", async () => {
  await renderOrders();
  await renderCharts();
});

filterSearch.addEventListener("input", async () => {
  await renderOrders();
  await renderCharts();
});

async function initAdminPage() {
  setDriverFormMode();
  setPlaceFormMode();
  await refreshDashboard();
  await renderOrderDetails(selectedOrderId);
}

initAdminPage();
