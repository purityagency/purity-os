import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "").trim()

    const secret = process.env.INTERNAL_API_SECRET
    if (!secret || token !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const email = String(body.email || "").trim().toLowerCase()
    const name = String(body.name || "").trim()
    const projectName = String(body.projectName || "Nouveau projet").trim()
    const orderId = String(body.orderId || "").trim() || null
    const sector = String(body.sector || "").trim() || null
    const totalPrice = Number(body.totalPrice)
    const depositAmount = Number(body.depositAmount)
    const remainingAmount = Number(body.remainingAmount)
    const monthlyAmount = Number(body.monthlyAmount)

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 })
    }

    // Idempotence : si cette commande a déjà provisionné un projet, ne pas en recréer un second
    if (orderId) {
      const existing = await prisma.project.findUnique({ where: { externalOrderId: orderId } })
      if (existing) {
        return NextResponse.json({ ok: true, projectId: existing.id, userId: existing.clientId, alreadyExists: true }, { status: 200 })
      }
    }

    // Upsert the client user
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        // If they already exist, we might update the name if missing
      },
      create: {
        email,
        name: name || null,
        role: "CLIENT",
      },
    })

    // Create the new project
    const project = await prisma.project.create({
      data: {
        clientId: user.id,
        name: projectName,
        status: "ACTIVE",
        externalOrderId: orderId,
        sector,
        totalPrice: Number.isFinite(totalPrice) ? totalPrice : null,
        depositAmount: Number.isFinite(depositAmount) ? depositAmount : null,
        remainingAmount: Number.isFinite(remainingAmount) ? remainingAmount : null,
        monthlyAmount: Number.isFinite(monthlyAmount) ? monthlyAmount : null,
      },
    })

    // Acompte déjà encaissé par Stripe côté site (le webhook n'appelle provision qu'après paiement confirmé)
    if (Number.isFinite(depositAmount) && depositAmount > 0) {
      await prisma.payment.create({
        data: {
          projectId: project.id,
          amount: depositAmount,
          status: "PAID",
          type: "DEPOSIT",
        },
      })
    }

    // Solde dû à la livraison — encaissé manuellement (hors Stripe), à pointer plus tard par l'admin
    if (Number.isFinite(remainingAmount) && remainingAmount > 0) {
      await prisma.payment.create({
        data: {
          projectId: project.id,
          amount: remainingAmount,
          status: "PENDING",
          type: "BALANCE",
        },
      })
    }

    return NextResponse.json({ ok: true, projectId: project.id, userId: user.id }, { status: 200 })
  } catch (error) {
    console.error("[internal-provision]", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
