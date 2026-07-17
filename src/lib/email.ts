// Envoi d'email via Resend — dégrade en silence si la clé n'est pas configurée
// (même logique que purity-agency-site/server.js : 0 blocage, juste pas de mail).
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey === "re_xxx") {
    // Pas de clé configurée (dev local) — on logue le contenu au lieu de le perdre silencieusement
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email:dev] to=${to} subject="${subject}"\n${html}`)
    }
    return
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM || "Purity Agency <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    })
    if (!res.ok) {
      console.error("[email] resend", res.status, await res.text().catch(() => ""))
    }
  } catch (e) {
    console.error("[email] network", e)
  }
}
