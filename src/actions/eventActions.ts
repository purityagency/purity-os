"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAdminSession } from "@/lib/session"

export async function markEventSeen(eventId: string) {
  await requireAdminSession()

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, status: true } })
  if (!event) throw new Error("Event not found")
  if (event.status === "NEW") {
    await prisma.event.update({ where: { id: event.id }, data: { status: "SEEN", seenAt: new Date() } })
  }

  revalidatePath("/admin/inbox")
  revalidatePath("/admin")
}

export async function markEventDone(eventId: string) {
  await requireAdminSession()

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } })
  if (!event) throw new Error("Event not found")

  await prisma.event.update({ where: { id: event.id }, data: { status: "DONE", seenAt: new Date() } })

  revalidatePath("/admin/inbox")
  revalidatePath("/admin")
}
