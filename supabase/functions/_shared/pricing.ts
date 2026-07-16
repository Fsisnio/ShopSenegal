/** Tarification livraison et parrainage (miroir de pricing.js côté Edge Functions). */

export const PRICING = {
  THRESHOLD_CREDIT: 5500,
  THRESHOLD_DELIVERY_DISCOUNT: 20000,
  DELIVERY_FLAT_FEE: 1000,
  DELIVERY_PERCENT: 0.06,
  CREDIT_AMOUNT: 300,
  DELIVERY_DISCOUNT_PERCENT: 0.5
};

export function computeDeliveryFee(subtotalFcfa: number): number {
  const sub = Math.max(0, Math.round(subtotalFcfa));
  if (sub >= PRICING.THRESHOLD_DELIVERY_DISCOUNT) return PRICING.DELIVERY_FLAT_FEE;
  return Math.round(sub * PRICING.DELIVERY_PERCENT);
}

export type OrderPricing = {
  subtotalFcfa: number;
  deliveryFeeFcfa: number;
  deliveryDiscountFcfa: number;
  deliveryNetFcfa: number;
  grandTotalFcfa: number;
  referralCreditsEligible: boolean;
  referralCreditAmount: number;
};

export function computeOrderPricing(
  subtotalFcfa: number,
  referralCodeValid = false
): OrderPricing {
  const subtotal = Math.max(0, Math.round(subtotalFcfa));
  const deliveryFeeFcfa = computeDeliveryFee(subtotal);
  let deliveryDiscountFcfa = 0;

  if (referralCodeValid && subtotal >= PRICING.THRESHOLD_DELIVERY_DISCOUNT) {
    deliveryDiscountFcfa = Math.round(deliveryFeeFcfa * PRICING.DELIVERY_DISCOUNT_PERCENT);
  }

  const deliveryNetFcfa = deliveryFeeFcfa - deliveryDiscountFcfa;
  const grandTotalFcfa = subtotal + deliveryNetFcfa;
  const referralCreditsEligible =
    referralCodeValid && subtotal >= PRICING.THRESHOLD_CREDIT;

  return {
    subtotalFcfa: subtotal,
    deliveryFeeFcfa,
    deliveryDiscountFcfa,
    deliveryNetFcfa,
    grandTotalFcfa,
    referralCreditsEligible,
    referralCreditAmount: referralCreditsEligible ? PRICING.CREDIT_AMOUNT : 0
  };
}
