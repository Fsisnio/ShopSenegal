/**
 * Cree une facture PayDunya Checkout (PAR), recalcule le montant depuis la commande Supabase,
 * puis renvoie l'URL de redirection (response_text officielle PayDunya).
 *
 * Secrets: PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY, PAYDUNYA_TOKEN,
 * PAYDUNYA_SANDBOX (true par defaut),
 * SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * SITE_PUBLIC_URL (ex https://monsite.sn) OU PAYDUNYA_RETURN_URL et PAYDUNYA_CANCEL_URL,
 * PAYDUNYA_CHECKOUT_SECRET (optionnel mais recommande en prod),
 * STORE_NAME_PAYDUNYA (optionnel, defaut ShopSenegal)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import {
  orderTotalFcfaFromBesoins,
  paydunyaCreateCheckoutInvoice
} from "../_shared/paydunya.ts";
import { computeOrderPricing } from "../_shared/pricing.ts";
import { isReferralCodeValidForOrder } from "../_shared/referral.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paydunya-checkout-secret"
};

interface CreateBody {
  orderId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const secret = Deno.env.get("PAYDUNYA_CHECKOUT_SECRET");
    const sent = req.headers.get("x-paydunya-checkout-secret") || "";
    if (secret && sent !== secret) {
      return new Response(JSON.stringify({ error: "Non autorise" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = (await req.json()) as CreateBody;
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Supabase backend non configure" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const masterKey = Deno.env.get("PAYDUNYA_MASTER_KEY") ?? "";
    const privateKey = Deno.env.get("PAYDUNYA_PRIVATE_KEY") ?? "";
    const tokenKey = Deno.env.get("PAYDUNYA_TOKEN") ?? "";
    if (!masterKey || !privateKey || !tokenKey) {
      return new Response(JSON.stringify({ error: "Cles PayDunya non configurees" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const sandbox = Deno.env.get("PAYDUNYA_SANDBOX") !== "false";
    const storeName = Deno.env.get("STORE_NAME_PAYDUNYA") || "ShopSenegal";

    const site =
      Deno.env.get("SITE_PUBLIC_URL")?.replace(/\/$/, "") ||
      "";

    const returnUrlRaw = Deno.env.get("PAYDUNYA_RETURN_URL")?.trim()
      ? Deno.env.get("PAYDUNYA_RETURN_URL")!.trim()
      : site
      ? `${site}/payment-return.html`
      : "";
    const cancelUrlRaw = Deno.env.get("PAYDUNYA_CANCEL_URL")?.trim()
      ? Deno.env.get("PAYDUNYA_CANCEL_URL")!.trim()
      : site
      ? `${site}/index.html#commande`
      : "";

    const callbackUrl =
      `${supabaseUrl.replace(/\/$/, "")}/functions/v1/paydunya-ipn`;

    /**
     * URL de retour client : inclure l’id commande pour la page payment-return.html
     * (polling Supabase). Paydunya ajoute souvent `token=` en plus.
     */
    function appendOrderReturnParam(urlRaw: string, oid: string): string {
      const u = urlRaw.trim();
      if (!u || !oid || /[\?&]order=/.test(u)) return u;
      const hashIdx = u.indexOf("#");
      const base = hashIdx >= 0 ? u.slice(0, hashIdx) : u;
      const hashPart = hashIdx >= 0 ? u.slice(hashIdx) : "";
      const join = base.includes("?") ? "&" : "?";
      return `${base}${join}order=${encodeURIComponent(oid)}${hashPart}`;
    }

    const returnUrlBuilt = appendOrderReturnParam(returnUrlRaw, orderId);
    const cancelUrlBuilt = appendOrderReturnParam(cancelUrlRaw, orderId);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: row, error: selErr } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();

    if (selErr || !row) {
      return new Response(JSON.stringify({ error: "Commande introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if ((row.paiement as string) !== "paydunya") {
      return new Response(JSON.stringify({ error: "Cette commande n'est pas Paydunya" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const subtotal = orderTotalFcfaFromBesoins(row.besoins);
    const referralCodeUsed =
      typeof row.referral_code_used === "string" ? row.referral_code_used.trim() : "";
    const referralCodeValid = referralCodeUsed
      ? await isReferralCodeValidForOrder(admin, referralCodeUsed, row.telephone)
      : false;
    const pricing = computeOrderPricing(subtotal, referralCodeValid);
    const total = pricing.grandTotalFcfa;

    if (!Number.isFinite(total) || total < 100) {
      return new Response(
        JSON.stringify({
          error: "Montant invalide ou trop faible. Chaque ligne doit avoir un prix unitaire (FCFA)."
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const invoiceItems: Record<string, Record<string, string | number>> = {};
    const besoinsArr = Array.isArray(row.besoins) ? row.besoins as Array<Record<string, unknown>> : [];
    besoinsArr.forEach((item, idx) => {
      const qty = Number(item.quantity) || 1;
      const unit = item.amount !== null && item.amount !== undefined ? Number(item.amount) : NaN;
      if (!Number.isFinite(unit) || unit < 0) return;
      invoiceItems[`item_${idx}`] = {
        name: String(item.name || "Article"),
        quantity: qty,
        unit_price: String(Math.round(unit)),
        total_price: String(Math.round(qty * unit)),
        description: String(item.brand || "")
      };
    });

    let itemIndex = besoinsArr.length;
    if (pricing.deliveryNetFcfa > 0) {
      invoiceItems[`item_${itemIndex}`] = {
        name: "Livraison",
        quantity: 1,
        unit_price: String(pricing.deliveryNetFcfa),
        total_price: String(pricing.deliveryNetFcfa),
        description:
          pricing.deliveryDiscountFcfa > 0
            ? `Frais ${pricing.deliveryFeeFcfa} FCFA, reduction parrainage -${pricing.deliveryDiscountFcfa}`
            : ""
      };
      itemIndex += 1;
    }

    await admin.from("orders").update({
      delivery_fee_fcfa: pricing.deliveryFeeFcfa,
      delivery_discount_fcfa: pricing.deliveryDiscountFcfa,
      estimated_total_fcfa: subtotal
    }).eq("id", orderId);

    const payload: Record<string, unknown> = {
      invoice: {
        items: invoiceItems,
        total_amount: total,
        description: `Commande ${orderId} — ${storeName}`,
        customer: {
          name: row.client || "",
          email: "",
          phone: ((row.telephone as string) || "").replace(/^\+/, "")
        }
      },
      store: {
        name: storeName
      },
      custom_data: { order_id: orderId },
      actions: {} as Record<string, string>
    };

    const actionsBlock = payload.actions as Record<string, string>;
    if (returnUrlBuilt) actionsBlock.return_url = returnUrlBuilt;
    if (cancelUrlBuilt) actionsBlock.cancel_url = cancelUrlBuilt;
    if (callbackUrl) actionsBlock.callback_url = callbackUrl;

    const pdRes = await paydunyaCreateCheckoutInvoice(payload, {
      masterKey,
      privateKey,
      token: tokenKey
    }, sandbox);

    const pdBody = await pdRes.json() as Record<string, unknown>;

    if (pdBody.response_code !== "00") {
      return new Response(
        JSON.stringify({
          error: "Paydunya refusal",
          details: pdBody.response_text ?? pdBody
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const checkoutUrl =
      typeof pdBody.response_text === "string"
        ? pdBody.response_text
        : "";

    const invToken = typeof pdBody.token === "string" ? pdBody.token : "";

    if (!checkoutUrl || !invToken) {
      return new Response(JSON.stringify({ error: "Reponse Paydunya inattendue", details: pdBody }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    await admin.from("orders").update({
      paydunya_invoice_token: invToken,
      estimated_total_fcfa: subtotal
    }).eq("id", orderId);

    return new Response(
      JSON.stringify({
        checkoutUrl,
        invoiceToken: invToken
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
