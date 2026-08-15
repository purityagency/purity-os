"use client"

import { useSyncExternalStore } from "react"

function subscribe(callback: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
  mq.addEventListener("change", callback)
  return () => mq.removeEventListener("change", callback)
}

function getSnapshot(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function getServerSnapshot(): boolean {
  return false
}

/**
 * SSR-safe via useSyncExternalStore : renvoie `false` au rendu serveur (pas de
 * hydration mismatch), puis la vraie préférence OS dès le montage client, et
 * se met à jour si l'utilisateur change ce réglage en cours de session.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
