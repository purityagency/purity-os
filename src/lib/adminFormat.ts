// Formatage et libellés partagés par tout l'espace admin — une seule source de
// vérité pour que le même statut ne s'affiche pas différemment d'une page à l'autre.

export function formatEUR(amount: number) {
  return new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount)
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date))
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("fr-BE", { dateStyle: "short", timeStyle: "short" }).format(new Date(date))
}

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actif",
  ON_HOLD: "En pause",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
}

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-[#7C3AED]/20 text-[#C084FC]",
  ON_HOLD: "bg-amber-500/20 text-amber-300",
  COMPLETED: "bg-emerald-500/20 text-emerald-300",
  CANCELLED: "bg-white/10 text-zinc-400",
}

export const STAGE_STATUS_LABELS: Record<string, string> = {
  PENDING: "À venir",
  IN_PROGRESS: "En cours",
  WAITING_CLIENT: "Attente client",
  BLOCKED: "Bloquée",
  REVIEW: "En relecture",
  COMPLETED: "Terminée",
}

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Acompte",
  BALANCE: "Solde",
  QUOTE: "Devis",
  INVOICE: "Facture",
  PAYMENT: "Paiement",
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PAID: "Payé",
  CANCELLED: "Annulé",
}

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-300",
  PAID: "bg-emerald-500/20 text-emerald-300",
  CANCELLED: "bg-white/10 text-zinc-400",
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  LEAD: "Question / Lead",
  BOOKING: "Rendez-vous",
  ORDER: "Commande",
}

export const EVENT_TYPE_COLORS: Record<string, string> = {
  LEAD: "bg-sky-500/20 text-sky-300",
  BOOKING: "bg-amber-500/20 text-amber-300",
  ORDER: "bg-emerald-500/20 text-emerald-300",
}

export const EVENT_STATUS_LABELS: Record<string, string> = {
  NEW: "Nouveau",
  SEEN: "Vu",
  DONE: "Traité",
}

export const EVENT_STATUS_COLORS: Record<string, string> = {
  NEW: "bg-[#7C3AED]/20 text-[#C084FC]",
  SEEN: "bg-white/10 text-zinc-300",
  DONE: "bg-white/5 text-zinc-500",
}

export const SECTOR_LABELS: Record<string, string> = {
  coiffure: "Coiffure & Beauté",
  artisan: "Artisan & Bâtiment",
  horeca: "HoReCa & Restauration",
  praticien: "Praticien & Bien-être",
  immobilier: "Immobilier",
  avocat: "Avocats & Juridique",
  commerce: "Commerces & Retail",
  fitness: "Sport & Fitness",
  consulting: "Consulting & B2B",
  formation: "Centres de Formation",
  garage: "Garages & Auto",
  finance: "Experts-Comptables",
  photo: "Photographes & Vidéastes",
  veterinaire: "Santé Animale",
  architecte: "Architectes & Déco",
  domicile: "Services à la Personne",
}

export function sectorLabel(sector: string | null | undefined) {
  if (!sector) return null
  return SECTOR_LABELS[sector] ?? sector
}
