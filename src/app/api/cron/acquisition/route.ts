import { NextResponse } from 'next/server';

// DÉSACTIVÉ TEMPORAIREMENT — ne pas réactiver sans lire ce commentaire en entier.
//
// Cette route importait IntelligenceAnalyst/CreativeCopywriter depuis
// `ai/01_ACQUISITION/*` (hors de purity-os/). `vercel --prod` depuis ce
// dossier n'upload que son propre arbre : ces fichiers n'existent pas dans
// le bundle déployé, et le build échoue en entier (pas juste cette route).
//
// Un simple copier-coller des workers ne suffirait pas non plus : leur base
// (ai/01_ACQUISITION/_Shared/AgentCore.ts) lit `secrets/.gemini-key` et les
// fichiers de connaissance (BrandRules.md, etc.) via le système de fichiers
// local (`process.cwd() + '../'`), en supposant tout le monorepo présent sur
// disque. Sur Vercel, ce chemin n'existe pas — l'agent tournerait avec une
// clé Gemini vide et zéro base de connaissances, en silence, sans jamais
// crasher pour le signaler. GEMINI_API_KEY n'est de toute façon pas encore
// configuré comme variable d'environnement sur ce projet Vercel.
//
// Ce qu'il faut faire avant de rouvrir cette route :
//   1. Rapatrier IntelligenceAnalyst, CreativeCopywriter et AgentCore dans
//      purity-os/src/ (ou un package partagé importé proprement, pas par
//      chemin relatif hors-projet).
//   2. Faire lire les fichiers de connaissance depuis la base (table dédiée,
//      ou au minimum bundlés dans src/) plutôt que du filesystem local.
//   3. Ajouter GEMINI_API_KEY aux variables d'environnement Vercel.
//   4. Retester un déploiement `vercel --prod` complet avant de committer.
//
// Voir prisma/schema.prisma pour les modèles Mission/Lead/EmailDraft, déjà
// en place et fonctionnels — seul ce déclencheur cron est bloqué.

export async function GET() {
  return NextResponse.json(
    { error: 'not_deployed', reason: 'agent workers not yet bundled for Vercel — see route.ts comment' },
    { status: 501 },
  );
}
