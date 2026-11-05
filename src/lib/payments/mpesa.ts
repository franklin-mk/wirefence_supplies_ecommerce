/**
 * M-Pesa Express (STK Push) via Safaricom Daraja.
 *
 * v1: sandbox STK Push. The PaymentProvider interface below is what the rest of
 * the app depends on, so v2 (live Paybill / Till) only changes env vars
 * (MPESA_ENV, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_TRANSACTION_TYPE) or adds
 * another provider class, without touching checkout code.
 */
export type StkRequest = {
  phone: string; // 2547XXXXXXXX
  amount: number; // whole KES
  accountRef: string; // order number
  description: string;
};

export type StkResponse = { checkoutRequestId: string; merchantRequestId: string };

export interface PaymentProvider {
  initiate(req: StkRequest): Promise<StkResponse>;
}

const base = () =>
  process.env.MPESA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

function timestamp() {
  // Daraja expects YYYYMMDDHHmmss. Use East Africa Time consistently.
  const eat = new Date(Date.now() + 3 * 3600_000);
  return eat.toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

let tokenCache: { token: string; exp: number } | null = null;

async function getToken() {
  if (tokenCache && tokenCache.exp > Date.now() + 30_000) return tokenCache.token;
  const basic = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString("base64");
  const r = await fetch(`${base()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${basic}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Daraja auth failed (${r.status})`);
  const j = (await r.json()) as { access_token: string; expires_in: string };
  tokenCache = { token: j.access_token, exp: Date.now() + Number(j.expires_in) * 1000 };
  return j.access_token;
}

export function callbackUrl() {
  const url = new URL(process.env.MPESA_CALLBACK_URL!);
  // Safaricom does not sign callbacks; a secret query token lets us reject forged ones.
  url.searchParams.set("token", process.env.MPESA_CALLBACK_SECRET ?? "");
  return url.toString();
}

export class DarajaStkProvider implements PaymentProvider {
  async initiate(req: StkRequest): Promise<StkResponse> {
    const ts = timestamp();
    const shortcode = process.env.MPESA_SHORTCODE!;
    const password = Buffer.from(`${shortcode}${process.env.MPESA_PASSKEY}${ts}`).toString("base64");
    const token = await getToken();

    const r = await fetch(`${base()}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: ts,
        TransactionType: process.env.MPESA_TRANSACTION_TYPE ?? "CustomerPayBillOnline",
        Amount: Math.ceil(req.amount),
        PartyA: req.phone,
        PartyB: shortcode,
        PhoneNumber: req.phone,
        CallBackURL: callbackUrl(),
        AccountReference: req.accountRef.slice(0, 12),
        TransactionDesc: req.description.slice(0, 13),
      }),
    });
    const j = await r.json();
    if (!r.ok || j.ResponseCode !== "0") {
      throw new Error(j.errorMessage ?? j.ResponseDescription ?? `STK push failed (${r.status})`);
    }
    return { checkoutRequestId: j.CheckoutRequestID, merchantRequestId: j.MerchantRequestID };
  }
}

export const paymentProvider: PaymentProvider = new DarajaStkProvider();

/** Shape of the callback Daraja POSTs after the customer responds. */
export type StkCallbackBody = {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: { Item: { Name: string; Value?: string | number }[] };
    };
  };
};

export function parseCallback(body: StkCallbackBody) {
  const cb = body.Body.stkCallback;
  const meta = Object.fromEntries((cb.CallbackMetadata?.Item ?? []).map((i) => [i.Name, i.Value]));
  return {
    checkoutRequestId: cb.CheckoutRequestID,
    success: cb.ResultCode === 0,
    resultDesc: cb.ResultDesc,
    receipt: meta.MpesaReceiptNumber as string | undefined,
    amount: meta.Amount as number | undefined,
  };
}
