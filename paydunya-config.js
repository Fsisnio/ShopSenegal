/**
 * Paiements Paydunya (Redirect Checkout).
 *
 * Déployez les Edge Functions puis renseignez l’URL, par exemple :
 * https://VOTRE_REF.supabase.co/functions/v1/paydunya-checkout
 *
 * Possibilités (par ordre) :
 * 1) Méta-balise avant ce script dans index.html :
 *    <meta name="shopsenegal-paydunya-checkout-url" content="https://.../paydunya-checkout" />
 * 2) localStorage : shopsenegal.paydunya.checkoutFnUrl
 * 3) Mettre checkoutFnUrl codé dur plus bas pour la prod uniquement — ne pas committer de secrets réels ;
 *    PAYDUNYA_CHECKOUT_SECRET (Edge Function + checkoutSecret ci-dessous même valeur).
 */
(function () {
  const metaCheckout = document.querySelector(
    'meta[name="shopsenegal-paydunya-checkout-url"]'
  )?.content?.trim?.();

  window.PAYDUNYA_CONFIG = {
    checkoutFnUrl:
      metaCheckout ||
      localStorage.getItem("shopsenegal.paydunya.checkoutFnUrl") ||
      "",

    checkoutSecret: localStorage.getItem("shopsenegal.paydunya.checkoutSecret") || ""
  };
})();
