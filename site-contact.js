/**
 * Numéro officiel ShopSenegal — téléphone, SMS et WhatsApp.
 * Surcharge Render : SHOPSENEGAL_PHONE_LOCAL=766565967 (9 chiffres, sans +221).
 */
(function () {
  const runtime = window.SHOPSENEGAL_RUNTIME || {};
  const localRaw = String(runtime.SHOPSENEGAL_PHONE_LOCAL || "766565967").replace(/\D/g, "");
  const localDigits = localRaw.length >= 9 ? localRaw.slice(-9) : localRaw;
  const countryCode = "221";
  const waDigits = `${countryCode}${localDigits}`;

  function formatDisplay(digits) {
    if (digits.length !== 9) return `+${countryCode} ${digits}`;
    return `+${countryCode} ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  }

  function whatsappUrl(text) {
    const base = `https://api.whatsapp.com/send?phone=${waDigits}`;
    if (typeof text === "string" && text.trim().length > 0) {
      return `${base}&text=${encodeURIComponent(text)}`;
    }
    return base;
  }

  function telUrl() {
    return `tel:+${waDigits}`;
  }

  function smsUrl(text) {
    const base = `sms:+${waDigits}`;
    if (typeof text === "string" && text.trim().length > 0) {
      return `${base}?body=${encodeURIComponent(text)}`;
    }
    return base;
  }

  function patchContactLinks() {
    document.querySelectorAll("[data-contact-tel]").forEach((el) => {
      el.setAttribute("href", telUrl());
      if (el.hasAttribute("data-contact-display")) {
        el.textContent = formatDisplay(localDigits);
      }
    });
    document.querySelectorAll("[data-contact-whatsapp]").forEach((el) => {
      el.setAttribute("href", whatsappUrl());
      if (el.hasAttribute("data-contact-display")) {
        el.textContent = formatDisplay(localDigits);
      }
    });
    document.querySelectorAll("[data-contact-display-only]").forEach((el) => {
      el.textContent = formatDisplay(localDigits);
    });
  }

  window.ShopContact = {
    localDigits,
    countryCode,
    waDigits,
    e164: `+${waDigits}`,
    display: formatDisplay(localDigits),
    whatsappUrl,
    telUrl,
    smsUrl,
    patchContactLinks
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", patchContactLinks);
  } else {
    patchContactLinks();
  }
})();
