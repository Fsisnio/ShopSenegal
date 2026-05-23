export type BesoinLine = {
  quantity?: number;
  amount?: number | null;
};

export function orderTotalFcfaFromBesoins(besoins: unknown): number {
  if (!Array.isArray(besoins)) return 0;
  let total = 0;
  for (const line of besoins as BesoinLine[]) {
    const qty = Number(line.quantity);
    const unit = line.amount === null || line.amount === undefined ? NaN : Number(line.amount);
    if (!Number.isFinite(qty) || qty < 1) continue;
    if (!Number.isFinite(unit) || unit < 0) continue;
    total += Math.round(qty * unit);
  }
  return Math.round(total);
}

export function paydunyaApiBase(sandbox: boolean): string {
  return sandbox ? "https://app.paydunya.com/sandbox-api/v1" : "https://app.paydunya.com/api/v1";
}

export async function paydunyaCreateCheckoutInvoice(payload: Record<string, unknown>, keys: {
  masterKey: string;
  privateKey: string;
  token: string;
}, sandbox: boolean): Promise<Response> {
  const base = paydunyaApiBase(sandbox);
  return await fetch(`${base}/checkout-invoice/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "PAYDUNYA-MASTER-KEY": keys.masterKey,
      "PAYDUNYA-PRIVATE-KEY": keys.privateKey,
      "PAYDUNYA-TOKEN": keys.token
    },
    body: JSON.stringify(payload)
  });
}

export async function paydunyaConfirmInvoice(invToken: string, keys: {
  masterKey: string;
  privateKey: string;
  token: string;
}, sandbox: boolean): Promise<unknown> {
  const base = paydunyaApiBase(sandbox);
  const res = await fetch(`${base}/checkout-invoice/confirm/${encodeURIComponent(invToken)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "PAYDUNYA-MASTER-KEY": keys.masterKey,
      "PAYDUNYA-PRIVATE-KEY": keys.privateKey,
      "PAYDUNYA-TOKEN": keys.token
    }
  });
  return await res.json();
}
