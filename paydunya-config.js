/**
 * Paydunya (redirect checkout).
 * Priorité des sources pour `checkoutFnUrl` :
 * 1) variables Render Docker : PAYDUNYA_CHECKOUT_FN_URL (ou PAYDUNYA_CHECKOUT_URL)
 * 2) meta shopsenegal-paydunya-checkout-url avant ce script
 * 3) localStorage shopsenegal.paydunya.checkoutFnUrl
 *
 * Secret optionnel PAYDUNYA_CHECKOUT_SECRET côté conteneur (même secret que Edge Function si activé).
 */
(function () {
  var rt =
    typeof window.SHOPSENEGAL_RUNTIME === "object" &&
    window.SHOPSENEGAL_RUNTIME !== null &&
    !Array.isArray(window.SHOPSENEGAL_RUNTIME)
      ? window.SHOPSENEGAL_RUNTIME
      : {};

  var metaCheckoutEl = document.querySelector('meta[name="shopsenegal-paydunya-checkout-url"]');
  var metaCheckout =
    typeof metaCheckoutEl?.content === "string" ? metaCheckoutEl.content.trim() : "";

  var runtimeFn =
    typeof rt.PAYDUNYA_CHECKOUT_FN_URL === "string" ? rt.PAYDUNYA_CHECKOUT_FN_URL.trim() : "";
  var runtimeSecret =
    typeof rt.PAYDUNYA_CHECKOUT_SECRET === "string" ? rt.PAYDUNYA_CHECKOUT_SECRET.trim() : "";

  window.PAYDUNYA_CONFIG = {
    checkoutFnUrl:
      runtimeFn ||
      metaCheckout ||
      localStorage.getItem("shopsenegal.paydunya.checkoutFnUrl") ||
      "",
    checkoutSecret:
      runtimeSecret ||
      localStorage.getItem("shopsenegal.paydunya.checkoutSecret") ||
      ""
  };
})();
