/**
 * Page retour après Paydunya : lit ?order=&token= puis interroge Supabase (polling)
 * jusqu’à paiement reconnu ou timeout. Nécessite supabase-js + supabase-config.js chargés avant.
 */
(function () {
  const POLL_MS = 2200;
  const MAX_POLLS = 42;

  function contactDisplay() {
    return window.ShopContact?.display || "+221 76 622 66 01";
  }

  function contactTelUrl() {
    return window.ShopContact?.telUrl?.() || "tel:+221766226601";
  }

  function contactWhatsappUrl(text) {
    if (window.ShopContact?.whatsappUrl) return window.ShopContact.whatsappUrl(text);
    const encoded = encodeURIComponent(text || "");
    return `https://api.whatsapp.com/send?phone=221766226601&text=${encoded}`;
  }

  function contactSmsUrl(text) {
    if (window.ShopContact?.smsUrl) return window.ShopContact.smsUrl(text);
    const encoded = encodeURIComponent(text || "");
    return `sms:+221766226601?body=${encoded}`;
  }

  const titleEl = document.getElementById("pr-title");
  const msgEl = document.getElementById("pr-message");
  const hintEl = document.getElementById("pr-hint");
  const detailsEl = document.getElementById("pr-details");
  const spinnerEl = document.getElementById("pr-spinner");
  const whatsEl = document.getElementById("pr-whatsapp");
  const smsEl = document.getElementById("pr-sms");

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function formatMoney(n) {
    if (typeof n !== "number" || !Number.isFinite(n)) return null;
    return `${Math.round(n).toLocaleString("fr-SN")} FCFA`;
  }

  function buildWhatsAppBody(row) {
    const lines = [
      "Bonjour ShopSenegal — retour depuis Paydunya.",
      `Référence commande : ${row.id}`,
      `Client : ${row.client}`,
      `Téléphone : ${row.telephone}`,
      `État paiement : ${row.payment_status || "-"}`,
      `Mode : ${row.paiement || "-"}`
    ];
    const tot = row.estimated_total_fcfa;
    const totFmt = formatMoney(tot);
    if (totFmt) lines.push(`Total liste (indicatif facture Paydunya) : ${totFmt}`);
    if (row.adresse) lines.push(`Adresse : ${row.adresse}`);
    lines.push("Merci de confirmer la livraison.");
    return lines.filter(Boolean).join("\n");
  }

  function setLinks(row) {
    const body = buildWhatsAppBody(row);
    if (whatsEl) whatsEl.href = contactWhatsappUrl(body);
    if (smsEl) smsEl.href = contactSmsUrl(body);
  }

  function renderBasics(row) {
    if (titleEl) titleEl.textContent = "Merci pour votre achat.";
    const ps = row.payment_status || "";

    let short = "";
    if (ps === "Paye") short = "Paiement bien reçu. Nous pouvons traiter votre commande.";
    else if (ps === "En attente" || ps === "Non paye")
      short =
        "Confirmation du paiement en cours (quelques secondes). Si ça bouge encore, envoyez nous un message WhatsApp avec votre référence.";
    else if (ps === "Annule")
      short = "Ce paiement a été abandonné ou annulé. Vous pouvez repasser une commande ou nous écrire.";
    else short = ps ? `État paiement actuel : ${ps}.` : "Statut de paiement inconnu pour l’instant.";

    if (msgEl) msgEl.textContent = short;

    if (detailsEl) {
      detailsEl.classList.remove("hidden");
      detailsEl.innerHTML = `
        <dt>Référence</dt><dd><strong>${escapeHtml(row.id)}</strong></dd>
        <dt>Client</dt><dd>${escapeHtml(row.client || "-")}</dd>
        <dt>Téléphone</dt><dd>${escapeHtml(row.telephone || "-")}</dd>
        <dt>Montant indicatif liste</dt><dd>${
          formatMoney(row.estimated_total_fcfa) ?? "—"
        }</dd>
        <dt>Paiement</dt><dd>${escapeHtml(row.paiement || "-")}</dd>
        <dt>Statut paiement</dt><dd><strong>${escapeHtml(ps || "-")}</strong></dd>
      `;
    }

    if (hintEl && !hintEl.dataset.prHintDone) {
      hintEl.dataset.prHintDone = "1";
      hintEl.innerHTML =
        `Numéro officiel : <a href="${contactTelUrl()}">${contactDisplay()}</a> — <a href="${contactWhatsappUrl()}" target="_blank" rel="noopener noreferrer">Ouvrir WhatsApp</a>.`;
    }

    setLinks(row);
    if (ps === "Paye") {
      sessionStorage.removeItem("shopsenegal.pendingPayOrderId");
    }
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function run() {
    const params = new URLSearchParams(window.location.search);
    let orderKey = (params.get("order") || "").trim();
    const sessionOrder = sessionStorage.getItem("shopsenegal.pendingPayOrderId") || "";
    if (!orderKey && sessionOrder) orderKey = sessionOrder.trim();

    let tokenHint = (
      params.get("token") ||
      params.get("invoice_token") ||
      params.get("invoiceToken") ||
      ""
    ).trim();

    const cfg = window.SUPABASE_CONFIG || {};
    const okCfg =
      typeof cfg.url === "string" &&
      cfg.url.length > 0 &&
      typeof cfg.anonKey === "string" &&
      cfg.anonKey.length > 0 &&
      typeof window.supabase?.createClient === "function";

    if (!titleEl || !msgEl) return;

    if (!okCfg) {
      if (spinnerEl) spinnerEl.classList.add("hidden");
      titleEl.textContent = "Merci.";
      msgEl.textContent =
        "Le suivi automatique nécessite supabase-config.js (URL projet + clé anon). Sinon contactez ShopSenegal par WhatsApp avec votre référence.";
      return;
    }

    if (!orderKey && !tokenHint) {
      if (spinnerEl) spinnerEl.classList.add("hidden");
      titleEl.textContent = "Retour paiement";
      msgEl.textContent =
        "Aucune référence (order ou token) dans l’URL. Gardez l’email / SMS avec votre lien Paydunya, ou envoyez nous un message depuis l’accueil.";
      return;
    }

    const client = window.supabase.createClient(cfg.url, cfg.anonKey);

    const fetchRow = async () => {
      if (orderKey) {
        return client
          .from("orders")
          .select(
            "id,client,telephone,adresse,paiement,payment_status,estimated_total_fcfa,paydunya_invoice_token"
          )
          .eq("id", orderKey)
          .maybeSingle();
      }
      if (tokenHint) {
        return client
          .from("orders")
          .select(
            "id,client,telephone,adresse,paiement,payment_status,estimated_total_fcfa,paydunya_invoice_token"
          )
          .eq("paydunya_invoice_token", tokenHint)
          .maybeSingle();
      }
      return { data: null, error: { message: "no key" } };
    };

    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
      const { data: row, error } = await fetchRow();
      if (!error && row && row.id) {
        renderBasics(row);
        if (
          typeof row.paydunya_invoice_token === "string" &&
          row.paydunya_invoice_token.trim()
        ) {
          tokenHint = row.paydunya_invoice_token.trim();
        }
        if (!orderKey) orderKey = row.id;

        const ps = row.payment_status || "";
        if (ps === "Paye" || ps === "Annule") {
          if (spinnerEl) spinnerEl.classList.add("hidden");
          titleEl.textContent =
            ps === "Paye" ? "Merci pour votre paiement." : titleEl.textContent;
          return;
        }
      }

      await sleep(POLL_MS);
    }

    if (spinnerEl) spinnerEl.classList.add("hidden");

    const { data: snapshot, error: snapErr } = await fetchRow();
    if (!snapErr && snapshot && snapshot.id) {
      renderBasics(snapshot);
      if (
        snapshot.payment_status !== "Paye" &&
        snapshot.payment_status !== "Annule" &&
        msgEl
      ) {
        msgEl.textContent += " Si nécessaire, joignez-nous sur WhatsApp — la réponse IPN peut prendre jusqu’à une minute.";
      }
      return;
    }

    titleEl.textContent = "Merci pour votre temps.";
    if (msgEl) {
      msgEl.textContent =
        "Nous n'avons pas encore retrouvé la commande depuis cette page. Envoyez nous un WhatsApp avec la référence Paydunya ou le numéro de commande (affichée avant paiement).";
    }
    const refLine = orderKey || tokenHint;
    if (refLine && whatsEl) {
      const body = `Bonjour ShopSenegal — aide suivi Paydunya\nRéf : ${refLine}`;
      whatsEl.href = contactWhatsappUrl(body);
      if (smsEl) smsEl.href = contactSmsUrl(body);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
