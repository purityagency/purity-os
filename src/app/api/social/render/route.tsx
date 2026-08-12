import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs" // Prisma ne supporte pas toujours Edge facilement dans tous les setups

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const draftId = searchParams.get("draftId")

    if (!draftId) {
      return new Response("Missing draftId", { status: 400 })
    }

    const draft = await prisma.contentDraft.findUnique({
      where: { id: draftId }
    })

    if (!draft) {
      return new Response("Draft not found", { status: 404 })
    }

    const s = (draft.structured as Record<string, any>) || {}
    const hook = s.hook || "Pas de titre"
    const pillar = s.pillar || "N/A"
    
    // Extrait les deux premières phrases pour le corps, ou le caption entier
    const captionFull = s.caption || draft.postText || ""
    const bodyMatch = captionFull.match(/^(?:.*?[.!?]){1,2}/)
    const bodySnippet = bodyMatch ? bodyMatch[0] : captionFull.slice(0, 150) + "..."

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#060309",
            backgroundImage: "radial-gradient(circle at 50% -20%, #7c3aed33 0%, transparent 60%)",
            color: "#f8fafc",
            fontFamily: "sans-serif", // next/og uses a default font if not provided
            padding: "80px",
          }}
        >
          {/* Logo / Marque */}
          <div style={{ display: "flex", alignItems: "center", position: "absolute", top: "60px", left: "60px" }}>
            <div style={{ display: "flex", width: "32px", height: "32px", backgroundColor: "#7c3aed", borderRadius: "8px", marginRight: "16px" }} />
            <div style={{ display: "flex", fontSize: "24px", fontWeight: "bold", letterSpacing: "-0.5px" }}>PURITY</div>
          </div>
          
          {/* Pilier */}
          <div style={{
            display: "flex",
            position: "absolute",
            top: "60px",
            right: "60px",
            fontSize: "18px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#c4b5fd",
            backgroundColor: "rgba(124, 58, 237, 0.15)",
            border: "1px solid rgba(124, 58, 237, 0.3)",
            padding: "8px 24px",
            borderRadius: "99px",
          }}>
            {pillar}
          </div>

          {/* Contenu central */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "40px" }}>
            <h1 style={{ 
              fontSize: "72px", 
              fontWeight: 800, 
              lineHeight: 1.1, 
              margin: 0,
              color: "#ffffff"
            }}>
              {hook}
            </h1>
            
            <p style={{ 
              fontSize: "32px", 
              fontWeight: 400, 
              lineHeight: 1.5, 
              color: "#cbd5e1",
              maxWidth: "80%",
              margin: 0
            }}>
              {bodySnippet}
            </p>
          </div>

          {/* Footer UI (Swipe) */}
          <div style={{ 
            display: "flex", 
            position: "absolute", 
            bottom: "60px", 
            alignItems: "center",
            color: "#94a3b8",
            fontSize: "20px",
            fontWeight: 500
          }}>
            Swipe pour découvrir ➜
          </div>

          {/* Liquid Glass Overlay (Border) */}
          <div style={{
            display: "flex",
            position: "absolute",
            top: "24px",
            left: "24px",
            right: "24px",
            bottom: "24px",
            border: "2px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "40px",
          }} />
        </div>
      ),
      {
        width: 1080,
        height: 1080,
      }
    )
  } catch (error: any) {
    console.error("Erreur génération image:", error)
    return new Response("Failed to generate image", { status: 500 })
  }
}
