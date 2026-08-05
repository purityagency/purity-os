import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalSecret, readSignedBody } from "@/lib/internalAuth"

export const dynamic = "force-dynamic"

// Remplace le stockage fichier local (data/orders/*.json) du site public —
// ce service Render tourne sans disque persistant (confirmé le 2026-08-05 via
// l'API Render : plan free, aucun disque attaché), donc tout fichier local y
// est perdu à chaque redéploiement/restart. Le site appelle cette route au
// lieu d'écrire sur son propre disque.

type DateField = string | null | undefined

function toDate(value: DateField): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

interface OrderPayload {
  id: string
  status?: string
  sector?: string | null
  pack?: string | null
  name?: string | null
  price?: number | null
  deposit?: number | null
  remaining?: number | null
  monthly?: number | null
  clientName?: string | null
  company?: string | null
  bce?: string | null
  email?: string | null
  phone?: string | null
  paymentMode?: string | null
  options?: unknown
  intake?: unknown
  brief?: unknown
  molliePaymentId?: string | null
  mollieCustomerId?: string | null
  mollieSubscriptionId?: string | null
  dashboardUrl?: string | null
  webhookProcessingAt?: DateField
  paidAt?: DateField
  provisioningStatus?: string | null
  provisionedAt?: DateField
  provisioningError?: string | null
}

// POST — upsert (write) intégral, appelé après chaque changement d'état côté site.
export async function POST(request: Request) {
  try {
    const { rawText, body } = await readSignedBody(request)
    if (!verifyInternalSecret(request, rawText)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const order = body.order as OrderPayload | undefined
    if (!order?.id) {
      return NextResponse.json({ error: "missing_order_id" }, { status: 400 })
    }

    const data = {
      status: order.status ?? "pending",
      sector: order.sector ?? null,
      pack: order.pack ?? null,
      name: order.name ?? null,
      price: order.price ?? null,
      deposit: order.deposit ?? null,
      remaining: order.remaining ?? null,
      monthly: order.monthly ?? null,
      clientName: order.clientName ?? null,
      company: order.company ?? null,
      bce: order.bce ?? null,
      email: order.email ?? null,
      phone: order.phone ?? null,
      paymentMode: order.paymentMode ?? null,
      options: order.options ?? undefined,
      intake: order.intake ?? undefined,
      brief: order.brief ?? undefined,
      molliePaymentId: order.molliePaymentId || null,
      mollieCustomerId: order.mollieCustomerId ?? null,
      mollieSubscriptionId: order.mollieSubscriptionId ?? null,
      dashboardUrl: order.dashboardUrl ?? null,
      webhookProcessingAt: toDate(order.webhookProcessingAt),
      paidAt: toDate(order.paidAt),
      provisioningStatus: order.provisioningStatus ?? null,
      provisionedAt: toDate(order.provisionedAt),
      provisioningError: order.provisioningError ?? null,
    }

    await prisma.order.upsert({
      where: { id: order.id },
      create: { id: order.id, ...data },
      update: data,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[internal/orders] write failed", err)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}

// GET — lecture par id, molliePaymentId ou mollieSubscriptionId (dans cet
// ordre de priorité). Bearer simple : pas de corps à signer sur un GET.
export async function GET(request: Request) {
  if (!verifyInternalSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const molliePaymentId = searchParams.get("molliePaymentId")
  const mollieSubscriptionId = searchParams.get("mollieSubscriptionId")

  const where = id
    ? { id }
    : molliePaymentId
    ? { molliePaymentId }
    : mollieSubscriptionId
    ? { mollieSubscriptionId }
    : null

  if (!where) {
    return NextResponse.json({ error: "missing_query" }, { status: 400 })
  }

  const order = await prisma.order.findFirst({ where })
  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  return NextResponse.json({ order })
}
