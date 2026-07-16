import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import { orderTotalFcfaFromBesoins } from "./paydunya.ts";
import { PRICING } from "./pricing.ts";

function normalizePhone(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/[^\d+]/g, "")
    .replace(/^\+/, "");
}

function phonesMatch(a: unknown, b: unknown): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const tail = (digits: string) => (digits.length >= 9 ? digits.slice(-9) : digits);
  return tail(na) === tail(nb);
}

export async function isReferralCodeValidForOrder(
  admin: SupabaseClient,
  codeRaw: unknown,
  orderPhone: unknown
): Promise<boolean> {
  const code = String(codeRaw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!code) return false;

  const { data: referrer, error } = await admin
    .from("users")
    .select("id, phone")
    .eq("referral_code", code)
    .maybeSingle();

  if (error || !referrer) return false;
  if (phonesMatch(referrer.phone, orderPhone)) return false;
  return true;
}

export async function grantReferralRewards(
  admin: SupabaseClient,
  orderId: string
): Promise<{ ok: boolean; skipped?: boolean; reason?: string }> {
  const { data: order, error: selErr } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (selErr || !order) {
    return { ok: false, reason: "order_not_found" };
  }

  if (order.referral_reward_granted === true) {
    return { ok: true, skipped: true, reason: "already_granted" };
  }

  const codeUsed =
    typeof order.referral_code_used === "string" ? order.referral_code_used.trim().toUpperCase() : "";
  if (!codeUsed) {
    return { ok: true, skipped: true, reason: "no_code" };
  }

  const subtotal =
    typeof order.estimated_total_fcfa === "number" && Number.isFinite(order.estimated_total_fcfa)
      ? Math.round(order.estimated_total_fcfa)
      : orderTotalFcfaFromBesoins(order.besoins);

  if (subtotal < PRICING.THRESHOLD_CREDIT) {
    return { ok: true, skipped: true, reason: "below_threshold" };
  }

  const { data: referrer, error: refErr } = await admin
    .from("users")
    .select("id, phone, referral_credit_fcfa")
    .eq("referral_code", codeUsed)
    .maybeSingle();

  if (refErr || !referrer) {
    return { ok: true, skipped: true, reason: "invalid_code" };
  }

  if (phonesMatch(referrer.phone, order.telephone)) {
    return { ok: true, skipped: true, reason: "self_referral" };
  }

  const credit = PRICING.CREDIT_AMOUNT;
  const referrerCredit =
    (typeof referrer.referral_credit_fcfa === "number" ? referrer.referral_credit_fcfa : 0) + credit;

  const { error: refUpdateErr } = await admin
    .from("users")
    .update({ referral_credit_fcfa: referrerCredit })
    .eq("id", referrer.id);

  if (refUpdateErr) {
    return { ok: false, reason: "referrer_update_failed" };
  }

  const phoneTail = normalizePhone(order.telephone);
  const tail = phoneTail.length >= 9 ? phoneTail.slice(-9) : phoneTail;
  if (tail.length >= 7) {
    const { data: refereeRows } = await admin
      .from("users")
      .select("id, phone, referral_credit_fcfa")
      .ilike("phone", `%${tail}`);

    const referee = (refereeRows || []).find((row) => phonesMatch(row.phone, order.telephone));
    if (referee && referee.id !== referrer.id) {
      const refereeCredit =
        (typeof referee.referral_credit_fcfa === "number" ? referee.referral_credit_fcfa : 0) +
        credit;
      await admin
        .from("users")
        .update({ referral_credit_fcfa: refereeCredit })
        .eq("id", referee.id);
    }
  }

  await admin.from("orders").update({ referral_reward_granted: true }).eq("id", orderId);

  return { ok: true };
}
