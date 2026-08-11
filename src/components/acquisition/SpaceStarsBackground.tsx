"use client"

import React, { useMemo } from "react"

interface Star {
  id: number
  top: number // percentage
  left: number // percentage
  size: number // px
  color: string
  animation: string
  delay: number // seconds
  opacity: number
}

export function SpaceStarsBackground({ children }: { children?: React.ReactNode }) {
  // Génération déterministe d'un champ de 120 étoiles scintillantes
  const stars = useMemo<Star[]>(() => {
    const starColors = ["#ffffff", "#e0e7ff", "#c084fc", "#a5f3fc", "#d9f99d"]
    const animClasses = ["space-twinkle-1", "space-twinkle-2", "space-twinkle-3"]
    const list: Star[] = []

    for (let i = 0; i < 120; i++) {
      // Pseudo-random déterministe basé sur l'index
      const top = (i * 17.3 + (i % 7) * 11.1) % 100
      const left = (i * 23.7 + (i % 11) * 7.9) % 100
      const size = (i % 5 === 0) ? 3 : (i % 3 === 0) ? 2 : 1.2
      const color = starColors[i % starColors.length]
      const animation = animClasses[i % animClasses.length]
      const delay = (i * 0.27) % 6
      const opacity = 0.3 + ((i % 7) / 10) * 0.6

      list.push({ id: i, top, left, size, color, animation, delay, opacity })
    }
    return list
  }, [])

  return (
    <div className="relative min-h-full w-full bg-[#050309] text-zinc-100 overflow-hidden">
      {/* Styles d'animations stellaires fluides en boucle sans fin */}
      <style jsx global>{`
        @keyframes space-twinkle-1 {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50% { opacity: 0.95; transform: scale(1.2); }
        }
        @keyframes space-twinkle-2 {
          0%, 100% { opacity: 0.8; transform: scale(1.1); }
          50% { opacity: 0.2; transform: scale(0.7); }
        }
        @keyframes space-twinkle-3 {
          0%, 100% { opacity: 0.25; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.4); filter: drop-shadow(0 0 4px currentColor); }
        }
        @keyframes space-nebula-slow {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes shooting-star {
          0% { transform: translate(0, 0) rotate(-35deg) scaleX(0); opacity: 0; }
          5% { opacity: 1; transform: translate(-30px, 30px) rotate(-35deg) scaleX(1); }
          20% { opacity: 0; transform: translate(-300px, 300px) rotate(-35deg) scaleX(2); }
          100% { opacity: 0; transform: translate(-300px, 300px) rotate(-35deg) scaleX(2); }
        }
        .space-twinkle-1 { animation: space-twinkle-1 3.5s ease-in-out infinite; }
        .space-twinkle-2 { animation: space-twinkle-2 4.8s ease-in-out infinite; }
        .space-twinkle-3 { animation: space-twinkle-3 6.2s ease-in-out infinite; }
        .space-nebula-anim { animation: space-nebula-slow 90s linear infinite; transform-origin: center center; }
        .shooting-star-anim { animation: shooting-star 12s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .shooting-star-anim-delayed { animation: shooting-star 16s cubic-bezier(0.4, 0, 0.2, 1) infinite 7s; }
      `}</style>

      {/* Rendu du Fond Espace & Nébuleuses (Cosmic Gradient Layers) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Nébuleuse Violette / Indigo Profond (Haut Droite) */}
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-radial from-purple-900/25 via-indigo-950/15 to-transparent blur-[120px] space-nebula-anim" />

        {/* Nébuleuse Cyan / Deep Blue (Bas Gauche) */}
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-radial from-blue-950/20 via-violet-950/10 to-transparent blur-[100px] space-nebula-anim" style={{ animationDirection: "reverse", animationDuration: "110s" }} />

        {/* Halo Néon Vert Purity Accent (#c4f82a / 5%) au centre */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-radial from-[#c4f82a]/[0.03] via-transparent to-transparent blur-[140px]" />

        {/* Grille Stellaire de 120 Étoiles Scintillantes */}
        <div className="absolute inset-0">
          {stars.map((star) => (
            <div
              key={star.id}
              className={`absolute rounded-full ${star.animation}`}
              style={{
                top: `${star.top}%`,
                left: `${star.left}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                backgroundColor: star.color,
                boxShadow: star.size > 2 ? `0 0 ${star.size * 2}px ${star.color}` : "none",
                animationDelay: `${star.delay}s`,
                opacity: star.opacity,
              }}
            />
          ))}
        </div>

        {/* Étoiles Filantes (Shooting Stars Loop) */}
        <div className="absolute top-10 right-1/4 w-32 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent shooting-star-anim" />
        <div className="absolute top-1/3 right-10 w-44 h-[1.5px] bg-gradient-to-r from-transparent via-[#c4f82a] to-transparent shooting-star-anim-delayed" />
      </div>

      {/* Contenu du Dashboard au-dessus du fond spatial */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
