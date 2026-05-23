const needForm = document.getElementById("need-form");
const needNameInput = document.getElementById("need-name");
const needQuantityInput = document.getElementById("need-quantity");
const needUnitInput = document.getElementById("need-unit");
const needBrandInput = document.getElementById("need-brand");
const needAmountInput = document.getElementById("need-amount");
const needsList = document.getElementById("needs-list");
const summaryLines = document.getElementById("summary-lines");
const summaryQty = document.getElementById("summary-qty");
const photoInput = document.getElementById("photo-input");
const photoPreview = document.getElementById("photo-preview");
const ocrButton = document.getElementById("ocr-button");
const ocrStatus = document.getElementById("ocr-status");
const voiceButton = document.getElementById("voice-button");
const voiceTranscript = document.getElementById("voice-transcript");
const voiceApplyButton = document.getElementById("voice-apply-button");
const voiceStatus = document.getElementById("voice-status");
const orderForm = document.getElementById("order-form");
const customerName = document.getElementById("customer-name");
const customerPhone = document.getElementById("customer-phone");
const customerAddress = document.getElementById("customer-address");
const customerNote = document.getElementById("customer-note");
const deliverySlot = document.getElementById("delivery-slot");
const paymentMethod = document.getElementById("payment-method");
const paydunyaPayTip = document.getElementById("paydunya-pay-tip");
const paySubmitHint = document.getElementById("pay-submit-hint");
const sendOrderButton = document.getElementById("send-order-button");
const orderStatus = document.getElementById("order-status");
const orderActions = document.getElementById("order-actions");
const whatsappLink = document.getElementById("whatsapp-link");
const smsLink = document.getElementById("sms-link");
const orderHistory = document.getElementById("order-history");

const needs = [];
const frenchNumbers = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10
};

function getNeeds() {
  return needs.map((need) => ({ ...need }));
}

function cartTotalFcfa(lines) {
  return lines.reduce((sum, item) => {
    const qty = Number(item.quantity);
    const unit = item.amount !== null && item.amount !== undefined ? Number(item.amount) : NaN;
    if (!Number.isFinite(qty) || qty < 1 || !Number.isFinite(unit) || unit < 0) return sum;
    return sum + Math.round(qty * unit);
  }, 0);
}

function paydunyaCanUseHostedCheckout() {
  const cfg = window.SUPABASE_CONFIG || {};
  return Boolean(
    typeof cfg.url === "string" &&
      cfg.url.length > 0 &&
      typeof cfg.anonKey === "string" &&
      cfg.anonKey.length > 0
  );
}

function syncPaydunyaPayTip() {
  if (!paymentMethod || !paydunyaPayTip) return;
  paydunyaPayTip.classList.toggle("hidden", paymentMethod.value !== "paydunya");
}

function syncPaymentChoiceButtons() {
  if (!paymentMethod || !orderForm) return;
  const current = paymentMethod.value;
  orderForm.querySelectorAll("[data-pay]").forEach((el) => {
    const active = el.dataset.pay === current;
    el.setAttribute("aria-pressed", active ? "true" : "false");
    if (el.classList.contains("payment-choice")) {
      el.classList.toggle("payment-choice--active", active);
    }
    if (el.classList.contains("payment-chip")) {
      el.classList.toggle("payment-chip--active", active);
    }
  });
}

function updateOrderSubmitLabel() {
  if (!sendOrderButton || !paymentMethod) return;
  if (paymentMethod.value === "paydunya") {
    sendOrderButton.textContent = "Continuer vers le paiement sécurisé";
  } else if (paymentMethod.value === "a_la_livraison") {
    sendOrderButton.textContent = "Envoyer ma commande (paiement au livreur)";
  } else {
    sendOrderButton.textContent = "Envoyer ma commande";
  }
}

function updatePaySubmitHint() {
  if (!paySubmitHint || !paymentMethod) return;
  if (paymentMethod.value === "paydunya") {
    paySubmitHint.textContent =
      "Une fois le formulaire rempli, redirection vers Paydunya pour payer (Wave, Orange Money, carte).";
    paySubmitHint.classList.remove("hidden");
  } else if (paymentMethod.value === "a_la_livraison") {
    paySubmitHint.textContent =
      "Après envoi : lien WhatsApp. Vous payez lorsque vous recevez la livraison.";
    paySubmitHint.classList.remove("hidden");
  } else {
    paySubmitHint.textContent =
      "Après envoi : lien WhatsApp pour confirmer le mode Wave / Orange / Free.";
    paySubmitHint.classList.remove("hidden");
  }
}

function syncPaymentUIMode() {
  syncPaydunyaPayTip();
  syncPaymentChoiceButtons();
  updateOrderSubmitLabel();
  updatePaySubmitHint();
}

function applyPaymentFromURL() {
  if (!paymentMethod) return;
  try {
    const params = new URLSearchParams(window.location.search);
    const pre = params.get("paiement");
    if (
      !pre ||
      ![...paymentMethod.options].some((option) => {
        return option.value === pre;
      })
    ) {
      return;
    }
    paymentMethod.value = pre;
  } catch {
    /** Non bloquant **/
  }
}

function updateSummary() {
  const qty = needs.reduce((sum, need) => sum + Number(need.quantity), 0);
  summaryLines.textContent = `${needs.length} ligne(s)`;
  summaryQty.textContent = `${qty} article(s)`;
}

function renderNeeds() {
  needsList.innerHTML = "";
  needs.forEach((need, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${need.name}</td>
      <td>${need.quantity}</td>
      <td>${need.unit}</td>
      <td>${need.brand || "-"}</td>
      <td>${Number.isFinite(need.amount) ? need.amount.toFixed(2) : "-"}</td>
      <td>
        <button type="button" class="table-btn table-btn--edit" data-action="edit" data-index="${index}">Modifier</button>
        <button type="button" class="table-btn table-btn--delete" data-action="delete" data-index="${index}">Supprimer</button>
      </td>
    `;
    needsList.appendChild(tr);
  });
  updateSummary();
}

function addNeed({ name, quantity, unit = "piece", brand = "", amount = "" }) {
  const cleanName = name.trim();
  const cleanBrand = brand.trim();
  const parsedQuantity = Number(quantity);
  const parsedAmount = Number(amount);
  const hasAmount = String(amount).trim() !== "";

  if (!cleanName || !Number.isFinite(parsedQuantity) || parsedQuantity < 1) return false;
  if (hasAmount && (!Number.isFinite(parsedAmount) || parsedAmount < 0)) return false;
  needs.push({
    name: cleanName,
    quantity: Math.floor(parsedQuantity),
    unit: unit || "piece",
    brand: cleanBrand,
    amount: hasAmount ? parsedAmount : null
  });
  renderNeeds();
  return true;
}

function parseVoiceLine(line) {
  const cleanLine = line.trim();
  if (!cleanLine) return null;

  const csvParts = cleanLine
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (csvParts.length >= 2) {
    return {
      name: csvParts[0],
      quantity: Number(csvParts[1]) || 1,
      unit: csvParts[2] || "piece",
      brand: csvParts[3] || "",
      amount: csvParts[4] || ""
    };
  }

  const tokens = cleanLine.toLowerCase().split(" ");
  let quantity = 1;
  if (tokens.length > 1) {
    const firstToken = tokens[0];
    const digitQuantity = Number(firstToken);
    if (Number.isFinite(digitQuantity) && digitQuantity >= 1) {
      quantity = digitQuantity;
      tokens.shift();
    } else if (frenchNumbers[firstToken]) {
      quantity = frenchNumbers[firstToken];
      tokens.shift();
    }
  }

  let unit = "piece";
  const knownUnits = ["kg", "litre", "paquet", "boite", "piece"];
  if (tokens.length > 1 && knownUnits.includes(tokens[0])) {
    unit = tokens.shift();
  }

  return {
    name: tokens.join(" ").trim() || cleanLine,
    quantity,
    unit,
    brand: "",
    amount: ""
  };
}

function renderPhotoPreview() {
  photoPreview.innerHTML = "";
  const files = Array.from(photoInput.files || []);

  files.forEach((file) => {
    if (!file.type.startsWith("image/")) return;
    const image = document.createElement("img");
    image.alt = "Apercu du besoin";
    image.src = URL.createObjectURL(file);
    photoPreview.appendChild(image);
  });
}

function buildOrderMessage(orderPayload) {
  const lines = orderPayload.besoins.map(
    (item) =>
      `- ${item.name} (${item.quantity} ${item.unit})${item.brand ? ` marque ${item.brand}` : ""}${
        Number.isFinite(item.amount) ? ` - ${item.amount.toFixed(2)} FCFA` : ""
      }`
  );
  const estFcfa =
    typeof orderPayload.estimatedTotalFcfa === "number" &&
    Number.isFinite(orderPayload.estimatedTotalFcfa)
      ? orderPayload.estimatedTotalFcfa
      : cartTotalFcfa(orderPayload.besoins || []);
  const totalLine =
    estFcfa > 0 ? `Estimation totale liste (FCFA, hors livraison): ${estFcfa}` : null;

  const baseLines = [
    `Commande ShopSenegal`,
    `Reference: ${orderPayload.id}`,
    `Client: ${orderPayload.client}`,
    `Telephone: ${orderPayload.telephone}`,
    `Adresse: ${orderPayload.adresse}`,
    `Creneau: ${orderPayload.creneau}`,
    `Paiement: ${orderPayload.paiement}`,
    ...(totalLine ? [totalLine] : []),
    `Produits:`,
    ...lines,
    `Note: ${orderPayload.note || "Aucune"}`
  ];

  return baseLines.join("\n");
}

async function renderHistory() {
  const orders = await window.ShopData.getOrders();
  orderHistory.innerHTML = "";
  if (orders.length === 0) {
    orderHistory.innerHTML = `<p class="muted">Aucune commande precedente.</p>`;
    return;
  }

  orders.slice(0, 8).forEach((order) => {
    const item = document.createElement("article");
    item.className = "history-item";
    item.innerHTML = `
      <div>
        <strong>${order.client}</strong>
        <p>${order.besoins.length} produit(s) - ${order.paiement}</p>
      </div>
      <button type="button" class="table-btn table-btn--edit" data-repeat="${order.id}">
        Recommander
      </button>
    `;
    orderHistory.appendChild(item);
  });
}

function resetFormAfterOrder() {
  orderForm.reset();
  needs.length = 0;
  voiceTranscript.value = "";
  photoInput.value = "";
  photoPreview.innerHTML = "";
  renderNeeds();
}

needForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const success = addNeed({
    name: needNameInput.value,
    quantity: needQuantityInput.value,
    unit: needUnitInput.value,
    brand: needBrandInput.value,
    amount: needAmountInput.value
  });
  if (!success) return;
  needNameInput.value = "";
  needQuantityInput.value = "1";
  needUnitInput.value = "piece";
  needBrandInput.value = "";
  needAmountInput.value = "";
  needNameInput.focus();
});

needsList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const index = Number(button.dataset.index);
  const selectedNeed = needs[index];
  if (!selectedNeed) return;

  if (button.dataset.action === "delete") {
    needs.splice(index, 1);
    renderNeeds();
    return;
  }

  needNameInput.value = selectedNeed.name;
  needQuantityInput.value = selectedNeed.quantity;
  needUnitInput.value = selectedNeed.unit;
  needBrandInput.value = selectedNeed.brand;
  needAmountInput.value = Number.isFinite(selectedNeed.amount) ? selectedNeed.amount : "";
  needs.splice(index, 1);
  renderNeeds();
  needNameInput.focus();
});

photoInput.addEventListener("change", renderPhotoPreview);

ocrButton.addEventListener("click", async () => {
  const file = (photoInput.files || [])[0];
  if (!file) {
    ocrStatus.textContent = "Choisissez d'abord une photo.";
    return;
  }
  if (!window.Tesseract) {
    ocrStatus.textContent = "OCR indisponible pour ce navigateur.";
    return;
  }

  ocrStatus.textContent = "Lecture OCR en cours...";
  try {
    const result = await window.Tesseract.recognize(file, "fra+eng");
    const text = result.data.text.trim();
    if (!text) {
      ocrStatus.textContent = "Aucun texte detecte.";
      return;
    }
    voiceTranscript.value = voiceTranscript.value
      ? `${voiceTranscript.value}\n${text}`
      : text;
    ocrStatus.textContent = "Texte extrait. Verifiez puis validez la transcription.";
  } catch {
    ocrStatus.textContent = "Echec OCR. Essayez une image plus nette.";
  }
});

if (paymentMethod) {
  paymentMethod.addEventListener("change", syncPaymentUIMode);
}

if (orderForm && paymentMethod) {
  orderForm.addEventListener("click", (event) => {
    const payerBtn = event.target.closest("[data-pay]");
    if (!payerBtn || !orderForm.contains(payerBtn)) return;
    paymentMethod.value = payerBtn.dataset.pay;
    syncPaymentUIMode();
  });
}

voiceApplyButton.addEventListener("click", () => {
  const transcriptText = voiceTranscript.value.trim();
  if (!transcriptText) {
    voiceStatus.textContent = "Aucune transcription a valider.";
    return;
  }

  const lines = transcriptText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let addedCount = 0;
  lines.forEach((line) => {
    const parsed = parseVoiceLine(line);
    if (!parsed) return;
    if (addNeed(parsed)) addedCount += 1;
  });

  if (addedCount === 0) {
    voiceStatus.textContent = "Format non reconnu. Exemple: tomates, 3, boite, roma";
    return;
  }

  voiceTranscript.value = "";
  voiceStatus.textContent = `${addedCount} produit(s) ajoute(s) depuis la transcription.`;
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  orderActions.classList.add("hidden");

  if (voiceTranscript.value.trim()) {
    orderStatus.textContent =
      "Validez d'abord la transcription vocale avant l'envoi de la commande.";
    return;
  }

  const cart = getNeeds();
  if (cart.length === 0) {
    orderStatus.textContent = "Ajoutez au moins un besoin avant d'envoyer votre commande.";
    return;
  }

  const estimatedTotalFcfa = cartTotalFcfa(cart);
  if (paymentMethod.value === "paydunya") {
    if (!paydunyaCanUseHostedCheckout()) {
      orderStatus.textContent =
        "Paydunya requiert un projet Supabase configure (voir supabase-config.js) et PAYDUNYA.md.";
      orderActions.classList.add("hidden");
      return;
    }
    if (estimatedTotalFcfa < 100) {
      orderStatus.textContent =
        "Pour Paydunya, remplissez le prix unitaire (FCFA) de chaque produit dans la liste avant envoi.";
      orderActions.classList.add("hidden");
      return;
    }
    const payCfg = window.PAYDUNYA_CONFIG || {};
    if (!payCfg.checkoutFnUrl?.trim?.()) {
      orderStatus.textContent =
        'Configurez l’URL Paydunya (paydunya-config.js ou cle localStorage shopsenegal.paydunya.checkoutFnUrl).';
      orderActions.classList.add("hidden");
      return;
    }
  }

  const orderPayload = {
    id: `o-${Date.now()}`,
    client: customerName.value.trim(),
    telephone: customerPhone.value.trim(),
    adresse: customerAddress.value.trim(),
    note: customerNote.value.trim(),
    creneau: deliverySlot.value,
    paiement: paymentMethod.value,
    besoins: cart,
    photos: Array.from(photoInput.files || []).length,
    status: "Nouvelle",
    paymentStatus: "Non paye",
    estimatedTotalFcfa: estimatedTotalFcfa > 0 ? estimatedTotalFcfa : null,
    createdAt: new Date().toISOString()
  };

  const persisted = await window.ShopData.saveOrder(orderPayload, {
    supabaseExclusive: paymentMethod.value === "paydunya"
  });

  if (paymentMethod.value === "paydunya") {
    if (persisted !== "supabase") {
      orderStatus.textContent =
        persisted === "failed"
          ? "Commande refusee par Supabase (executez les migrations PAYDUNYA.md / colonnes orders)."
          : "Paydunya requiert une base Supabase disponible.";
      orderActions.classList.add("hidden");
      return;
    }
    const payCfg = window.PAYDUNYA_CONFIG || {};
    try {
      const anonKey = window.SUPABASE_CONFIG?.anonKey || "";
      const res = await fetch(payCfg.checkoutFnUrl.trim(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(anonKey ? { Authorization: `Bearer ${anonKey}`, apikey: anonKey } : {}),
          ...(payCfg.checkoutSecret?.trim?.()
            ? { "x-paydunya-checkout-secret": payCfg.checkoutSecret.trim() }
            : {})
        },
        body: JSON.stringify({ orderId: orderPayload.id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Creation facture Paydunya impossible."
        );
      }
      window.location.assign(data.checkoutUrl);
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      orderStatus.textContent = `Paydunya: ${msg} Vous pouvez contacter WhatsApp avec votre reference ${orderPayload.id}.`;
      const messageFallback = buildOrderMessage(orderPayload);
      const encoded = encodeURIComponent(messageFallback);
      whatsappLink.href = `https://wa.me/221773542551?text=${encoded}`;
      smsLink.href = `sms:+221773542551?body=${encoded}`;
      orderActions.classList.remove("hidden");
      await renderHistory();
      resetFormAfterOrder();
      return;
    }
  }

  const message = buildOrderMessage(orderPayload);
  const encoded = encodeURIComponent(message);
  whatsappLink.href = `https://wa.me/221773542551?text=${encoded}`;
  smsLink.href = `sms:+221773542551?body=${encoded}`;
  orderActions.classList.remove("hidden");

  orderStatus.textContent = `Commande enregistree pour ${orderPayload.client}.`;
  await renderHistory();
  resetFormAfterOrder();
});

orderHistory.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-repeat]");
  if (!button) return;
  const orderId = button.dataset.repeat;
  const orders = await window.ShopData.getOrders();
  const order = orders.find((entry) => entry.id === orderId);
  if (!order) return;

  needs.length = 0;
  order.besoins.forEach((item) => needs.push({ ...item }));
  renderNeeds();
  customerName.value = order.client;
  customerPhone.value = order.telephone;
  customerAddress.value = order.adresse;
  customerNote.value = order.note || "";
  deliverySlot.value = order.creneau || "maintenant";
  if (paymentMethod) {
    paymentMethod.value = order.paiement || "a_la_livraison";
    syncPaymentUIMode();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  voiceButton.disabled = true;
  voiceStatus.textContent = "La commande vocale n'est pas supportee sur ce navigateur.";
} else {
  const recognition = new SpeechRecognition();
  recognition.lang = "fr-FR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  voiceButton.addEventListener("click", () => {
    voiceStatus.textContent = "Ecoute en cours... parlez maintenant.";
    recognition.start();
  });

  recognition.addEventListener("result", (event) => {
    const transcript = event.results[0][0].transcript;
    const previousText = voiceTranscript.value.trim();
    voiceTranscript.value = previousText ? `${previousText}\n${transcript}` : transcript;
    voiceStatus.textContent =
      'Transcription recue. Verifiez, modifiez puis cliquez "Valider la transcription".';
  });

  recognition.addEventListener("error", () => {
    voiceStatus.textContent = "Impossible de lire votre voix. Reessayez.";
  });
}

async function initHomePage() {
  renderNeeds();
  renderPhotoPreview();
  applyPaymentFromURL();
  syncPaymentUIMode();
  await renderHistory();
}

initHomePage();
