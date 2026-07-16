/**
 * Reception IPN PayDunya (application/x-www-form-urlencoded, cle `data`).
 * Verifie le statut via l'endpoint confirm Paydunya (source de verite).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import { paydunyaConfirmInvoice } from "../_shared/paydunya.ts";
import { grantReferralRewards } from "../_shared/referral.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type"
};

function extractInvoiceToken(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;

  const inv = o.invoice;
  if (inv && typeof inv === "object" && typeof (inv as { token?: unknown }).token === "string") {
    const t = (inv as { token: string }).token.trim();
    if (t) return t;
  }
  if (typeof o.token === "string" && o.token.trim()) {
    return o.token.trim();
  }
  if ("data" in o && typeof o.data === "object") {
    return extractInvoiceToken(o.data);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("METHOD_NOT_ALLOWED", { status: 405, headers: corsHeaders });
    }

    const masterKey = Deno.env.get("PAYDUNYA_MASTER_KEY") ?? "";
    const privateKey = Deno.env.get("PAYDUNYA_PRIVATE_KEY") ?? "";
    const tokenKey = Deno.env.get("PAYDUNYA_TOKEN") ?? "";
    const sandbox = Deno.env.get("PAYDUNYA_SANDBOX") !== "false";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!masterKey || !privateKey || !tokenKey || !supabaseUrl || !serviceKey) {
      return new Response("CONFIG_ERROR", { status: 500, headers: corsHeaders });
    }

    const ct = req.headers.get("content-type") || "";
    let payloadParse: unknown = null;

    if (ct.includes("application/json")) {
      payloadParse = await req.json();
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);
      const raw = params.get("data");
      if (raw) {
        try {
          payloadParse = JSON.parse(raw);
        } catch {
          payloadParse = null;
        }
      }
    }

    const invoiceToken = extractInvoiceToken(payloadParse);

    if (!invoiceToken) {
      return new Response(JSON.stringify({ ok: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const confirmed = await paydunyaConfirmInvoice(invoiceToken, {
      masterKey,
      privateKey,
      token: tokenKey
    }, sandbox) as Record<string, unknown>;

    /** Statut facture PAR : COMPLETED/PENDING/CANCELLED (doc Paydunya) ; parfois en minuscules. */
    const invBlock = confirmed.invoice;
    let statusRaw: unknown =
      typeof confirmed.status === "string"
        ? confirmed.status
        : invBlock &&
            typeof invBlock === "object" &&
            typeof (invBlock as { status?: unknown }).status === "string"
          ? (invBlock as { status: string }).status
          : "";
    const status = typeof statusRaw === "string" ? statusRaw.trim().toLowerCase() : "";

    if (confirmed.response_code !== "00") {
      return new Response(JSON.stringify({ ok: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const cd = confirmed.custom_data as Record<string, string> | undefined;
    const orderIdFromCustom = cd?.order_id?.trim?.() ?? "";

    const admin = createClient(supabaseUrl, serviceKey);

    const paidStatuses = new Set(["completed", "paid", "success"]);
    const pendingStatuses = new Set(["pending", "processing"]);
    const failedStatuses = new Set([
      "cancelled",
      "canceled",
      "failed",
      "fail",
      "abandoned",
      "expired"
    ]);

    let paymentStatus: string | null = null;

    if (paidStatuses.has(status)) {
      paymentStatus = "Paye";
    } else if (pendingStatuses.has(status)) {
      paymentStatus = "En attente";
    } else if (failedStatuses.has(status)) {
      paymentStatus = "Annule";
    }

    if (paymentStatus) {
      const updateRow = {
        payment_status: paymentStatus,
        paydunya_invoice_token: invoiceToken
      };
      if (orderIdFromCustom) {
        await admin.from("orders").update(updateRow).eq("id", orderIdFromCustom);
        if (paymentStatus === "Paye") {
          await grantReferralRewards(admin, orderIdFromCustom);
        }
      } else {
        const { data: matchedOrders } = await admin
          .from("orders")
          .select("id")
          .eq("paydunya_invoice_token", invoiceToken)
          .limit(1);
        await admin.from("orders").update(updateRow).eq("paydunya_invoice_token", invoiceToken);
        if (paymentStatus === "Paye" && matchedOrders?.[0]?.id) {
          await grantReferralRewards(admin, matchedOrders[0].id);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch {
    return new Response("ERROR", { status: 500, headers: corsHeaders });
  }
});
