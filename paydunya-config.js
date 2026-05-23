/**
 * Paiements Paydunya (Redirect Checkout).
 *
 * Déployez les Edge Functions dans supabase/functions/ puis définissez l'URL ici :
 * exemple : https://VOTRE_REF.supabase.co/functions/v1/paydunya-checkout
 *
 * En production, utilisez PAYDUNYA_CHECKOUT_SECRET côté function et la même valeur
 * dans PAYDUNYA_CONFIG.checkoutSecret (localStorage ou remplissez checkoutSecret ci-dessous — évitez de commit des secrets réels).
 */
window.PAYDUNYA_CONFIG = {
  checkoutFnUrl:
    localStorage.getItem("shopsenegal.paydunya.checkoutFnUrl") ||
    "",

  checkoutSecret:
    localStorage.getItem("shopsenegal.paydunya.checkoutSecret") || ""
};
