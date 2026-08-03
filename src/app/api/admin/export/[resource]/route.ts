import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { UnauthorizedError } from "@/lib/errors"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function csvEscape(value: unknown): string {
  if (value == null) return ""
  const s = String(value)
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCsv(headers: string[], rows: unknown[][]): string {
  // BOM UTF-8 pour qu'Excel (config FR/BE) ouvre les accents correctement.
  const lines = [headers.join(";"), ...rows.map((r) => r.map(csvEscape).join(";"))]
  return "﻿" + lines.join("\r\n")
}

export async function GET(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  try {
    await requireAdminSession()
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
    throw error
  }

  const { resource } = await params
  const { searchParams } = new URL(request.url)

  let csv: string
  let filename: string

  switch (resource) {
    case "clients": {
      const q = (searchParams.get("q") ?? "").trim().slice(0, 100)
      const clients = await prisma.user.findMany({
        where: {
          role: "CLIENT",
          ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: { projects: { select: { id: true } } },
      })
      csv = toCsv(
        ["Nom", "Email", "Accès activé", "Nb projets", "Client depuis"],
        clients.map((c) => [c.name, c.email, c.passwordHash ? "Oui" : "Non", c.projects.length, c.createdAt.toISOString().slice(0, 10)])
      )
      filename = "clients"
      break
    }
    case "projects": {
      const status = searchParams.get("status") ?? undefined
      const projects = await prisma.project.findMany({
        where: status ? { status } : {},
        orderBy: { updatedAt: "desc" },
        include: { client: { select: { name: true, email: true } } },
      })
      csv = toCsv(
        ["Projet", "Client", "Statut", "Secteur", "Prix total", "Acompte", "Solde", "Mensuel", "Livraison estimée"],
        projects.map((p) => [
          p.name,
          p.client.name || p.client.email,
          p.status,
          p.sector,
          p.totalPrice,
          p.depositAmount,
          p.remainingAmount,
          p.monthlyAmount,
          p.estimatedDelivery?.toISOString().slice(0, 10),
        ])
      )
      filename = "projets"
      break
    }
    case "payments": {
      const status = searchParams.get("status") ?? undefined
      const payments = await prisma.payment.findMany({
        where: status ? { status } : {},
        orderBy: { createdAt: "desc" },
        include: { project: { select: { name: true, client: { select: { name: true, email: true } } } } },
      })
      csv = toCsv(
        ["Projet", "Client", "Type", "Montant", "Statut", "Date"],
        payments.map((p) => [
          p.project.name,
          p.project.client.name || p.project.client.email,
          p.type,
          p.amount,
          p.status,
          p.createdAt.toISOString().slice(0, 10),
        ])
      )
      filename = "paiements"
      break
    }
    case "leads": {
      const leads = await prisma.lead.findMany({
        orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      })
      csv = toCsv(
        ["Entreprise", "Site web", "Localisation", "Statut", "Score", "Contact", "Email", "Créé le"],
        leads.map((l) => [
          l.companyName,
          l.websiteUrl,
          l.location,
          l.status,
          l.score,
          l.contactName,
          l.contactEmail,
          l.createdAt.toISOString().slice(0, 10),
        ])
      )
      filename = "leads"
      break
    }
    default:
      return NextResponse.json({ error: "resource inconnue" }, { status: 400 })
  }

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="purity-${filename}-${date}.csv"`,
    },
  })
}
