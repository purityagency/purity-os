// Client Mollie minimal via fetch — pas de SDK, l'API REST Mollie n'en a pas
// besoin. Le webhook Mollie ne transporte qu'un `id`, jamais de statut ni de
// signature : la seule source de vérité est un GET /payments/{id} authentifié
// avec notre clé secrète (voir https://docs.mollie.com/docs/webhooks).

const MOLLIE_API_BASE = "https://api.mollie.com/v2";

function getMollieApiKey(): string {
  const key = process.env.MOLLIE_API_KEY;
  if (!key) {
    throw new Error(
      "[mollie] MOLLIE_API_KEY manquant — variable d'environnement Vercel en production, " +
      "purity-os/.env en local. Aucun repli silencieux."
    );
  }
  return key;
}

export type MolliePaymentStatus =
  | "open" | "canceled" | "pending" | "authorized"
  | "expired" | "failed" | "paid";

export interface MolliePayment {
  id: string;
  status: MolliePaymentStatus;
  metadata: Record<string, unknown> | null;
  _links: { checkout?: { href: string } };
}

async function mollieFetch(path: string, init?: RequestInit): Promise<MolliePayment> {
  const res = await fetch(`${MOLLIE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getMollieApiKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[mollie] ${init?.method ?? "GET"} ${path} → ${res.status}: ${body}`);
  }

  return res.json();
}

export async function createMolliePayment(params: {
  amountEUR: number;
  description: string;
  redirectUrl: string;
  webhookUrl: string;
  paymentId: string; // notre Payment.id, propagé en metadata pour retrouver la ligne côté webhook
}): Promise<MolliePayment> {
  return mollieFetch("/payments", {
    method: "POST",
    body: JSON.stringify({
      amount: { currency: "EUR", value: params.amountEUR.toFixed(2) },
      description: params.description,
      redirectUrl: params.redirectUrl,
      webhookUrl: params.webhookUrl,
      metadata: { paymentId: params.paymentId },
    }),
  });
}

export async function getMolliePayment(molliePaymentId: string): Promise<MolliePayment> {
  return mollieFetch(`/payments/${molliePaymentId}`);
}
