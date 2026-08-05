"use server"

import { revalidatePath } from "next/cache"
import { requireAdminSession } from "@/lib/session"
import { AppError } from "@/lib/errors"
import { InvoiceAgent } from "@/lib/agents/finance/InvoiceAgent"

export type FinanceActionResult = { ok: true; message: string } | { ok: false; message: string }

const invoiceAgent = new InvoiceAgent()

export async function generateInvoice(
  projectId: string,
  kind: "DEPOSIT" | "BALANCE" | "FULL",
  _prevState: FinanceActionResult | null
): Promise<FinanceActionResult> {
  await requireAdminSession()
  void _prevState

  try {
    const invoice = await invoiceAgent.generateInvoice(projectId, kind)
    revalidatePath(`/admin/projects/${projectId}`)
    return { ok: true, message: `Facture ${invoice.invoiceNumber} générée (${invoice.totalAmount}€, brouillon).` }
  } catch (e) {
    const message = e instanceof AppError || e instanceof Error ? e.message : "Erreur inattendue."
    return { ok: false, message }
  }
}
