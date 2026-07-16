/**
 * Tarification livraison et avantages parrainage ShopSenegal.
 * - Livraison : ≥ 20 000 FCFA → 1 000 FCFA ; sinon 6 % du panier (avant réductions).
 * - Code parrain valide + panier ≥ 5 500 → +300 FCFA parrain et filleul (crédits).
 * - Code parrain valide + panier ≥ 20 000 → −50 % sur la livraison.
 */
const ShopPricing = (() => {
  const runtime = window.SHOPSENEGAL_RUNTIME || {};

  function num(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  const THRESHOLD_CREDIT = num(runtime.SHOPSENEGAL_REFERRAL_CREDIT_THRESHOLD_FCFA, 5500);
  const THRESHOLD_DELIVERY_DISCOUNT = num(runtime.SHOPSENEGAL_DELIVERY_THRESHOLD_FCFA, 20000);
  const DELIVERY_FLAT_FEE = num(runtime.SHOPSENEGAL_DELIVERY_FLAT_FCFA, 1000);
  const DELIVERY_PERCENT = num(runtime.SHOPSENEGAL_DELIVERY_PERCENT, 6) / 100;
  const CREDIT_AMOUNT = num(runtime.SHOPSENEGAL_REFERRAL_CREDIT_AMOUNT, 300);
  const DELIVERY_DISCOUNT_PERCENT = 0.5;

  function computeDeliveryFee(subtotalFcfa) {
    const sub = Math.max(0, Math.round(subtotalFcfa));
    if (sub >= THRESHOLD_DELIVERY_DISCOUNT) return DELIVERY_FLAT_FEE;
    return Math.round(sub * DELIVERY_PERCENT);
  }

  function computePricing({ subtotalFcfa, referralCodeValid = false }) {
    const subtotal = Math.max(0, Math.round(subtotalFcfa));
    const deliveryFeeFcfa = computeDeliveryFee(subtotal);
    let deliveryDiscountFcfa = 0;

    if (referralCodeValid && subtotal >= THRESHOLD_DELIVERY_DISCOUNT) {
      deliveryDiscountFcfa = Math.round(deliveryFeeFcfa * DELIVERY_DISCOUNT_PERCENT);
    }

    const deliveryNetFcfa = deliveryFeeFcfa - deliveryDiscountFcfa;
    const grandTotalFcfa = subtotal + deliveryNetFcfa;
    const referralCreditsEligible = referralCodeValid && subtotal >= THRESHOLD_CREDIT;

    return {
      subtotalFcfa: subtotal,
      deliveryFeeFcfa,
      deliveryDiscountFcfa,
      deliveryNetFcfa,
      grandTotalFcfa,
      referralCreditsEligible,
      referralCreditAmount: referralCreditsEligible ? CREDIT_AMOUNT : 0
    };
  }

  function formatFcfa(amount) {
    return `${Math.round(amount).toLocaleString("fr-FR")} FCFA`;
  }

  function computeOrderGrandTotalFromStored(order) {
    const subtotal = Math.max(
      0,
      Math.round(
        order?.subtotalFcfa ??
          order?.estimatedTotalFcfa ??
          order?.estimated_total_fcfa ??
          0
      )
    );
    const deliveryFeeFcfa =
      typeof order?.deliveryFeeFcfa === "number"
        ? order.deliveryFeeFcfa
        : typeof order?.delivery_fee_fcfa === "number"
          ? order.delivery_fee_fcfa
          : computeDeliveryFee(subtotal);
    const deliveryDiscountFcfa =
      typeof order?.deliveryDiscountFcfa === "number"
        ? order.deliveryDiscountFcfa
        : typeof order?.delivery_discount_fcfa === "number"
          ? order.delivery_discount_fcfa
          : 0;
    return Math.max(0, subtotal + deliveryFeeFcfa - deliveryDiscountFcfa);
  }

  return {
    THRESHOLD_CREDIT,
    THRESHOLD_DELIVERY_DISCOUNT,
    DELIVERY_FLAT_FEE,
    DELIVERY_PERCENT,
    CREDIT_AMOUNT,
    computeDeliveryFee,
    computePricing,
    computeOrderGrandTotalFromStored,
    formatFcfa
  };
})();

window.ShopPricing = ShopPricing;
