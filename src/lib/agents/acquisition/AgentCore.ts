import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { AgentLogger } from '@/lib/AgentLogger';

// La clé Gemini vit exclusivement en variable d'environnement — jamais de
// repli sur le filesystem local (voir MASTER_COO_DIRECTIVE.md §5, "zéro
// dégradation silencieuse"). Un secret absent doit faire échouer bruyamment.
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  throw new Error(
    '[AgentCore] GEMINI_API_KEY manquant — variable d\'environnement Vercel en production, ' +
    'purity-os/.env en local. Jamais lu depuis secrets/.gemini-key par un agent déployé.'
  );
}

const google = createGoogleGenerativeAI({ apiKey: geminiApiKey });

/**
 * Un seul projet Google = un seul quota Gemini, partagé par TOUS les
 * agents de ce pôle (10 req/min, 250 req/jour sur le tier gratuit — voir
 * la conversation du 2026-08-03). Avant ce correctif, chaque agent
 * appelait `generateObject` sans aucune coordination : un lot de résultats
 * de recherche pouvait déclencher 10+ appels en quelques secondes et
 * cogner le plafond RPM en silence. Cette file d'attente partagée force un
 * espacement minimal entre CHAQUE appel Gemini, tous agents confondus.
 */
const MIN_INTERVAL_MS = 6_500; // ~9,2 req/min max, sous le plafond gratuit de 10
let geminiCallQueue: Promise<void> = Promise.resolve();

function throttleGeminiCall(): Promise<void> {
  const next = geminiCallQueue.then(async () => {
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS));
  });
  geminiCallQueue = next.catch(() => {});
  return next;
}

function isRateLimitError(error: unknown): boolean {
  const err = error as { statusCode?: number; message?: string } | undefined;
  return err?.statusCode === 429 || /rate.?limit|quota|429/i.test(String(err?.message ?? ''));
}

export interface AgentContext {
  role: string;
  department: string;
  knowledgeFiles?: string[];
  skills?: string[];
}

/**
 * Les fichiers de connaissance vivent désormais dans `purity-os/src/knowledge/`
 * — copiés depuis leur source (`purity_catalogue_officiel_v2.md` à la racine
 * du monorepo, `ai/02_BRAND/_Knowledge/*`) pour être réellement inclus dans
 * le bundle déployé sur Vercel. Avant cette migration, `AgentCore.ts` lisait
 * `process.cwd() + '../'`, un chemin qui n'existe que sur une machine avec le
 * monorepo complet sur disque — jamais sur Vercel (voir l'ancien commentaire
 * de route.ts). Seul le nom de fichier compte ici ; tout chemin fourni est
 * réduit à son basename pour retrouver la bonne copie locale.
 *
 * Rappel du gap qui subsiste : ces copies peuvent diverger de la source si
 * l'une est éditée sans l'autre — même risque que documenté dans le
 * blueprint pour le catalogue interne vs. le site public. Pas résolu ici,
 * juste déplacé au bon endroit pour fonctionner en prod.
 */
function loadKnowledgeFile(filePath: string): string | null {
  const filename = path.basename(filePath);
  const resolved = path.join(process.cwd(), 'src/knowledge', filename);
  try {
    return fs.readFileSync(resolved, 'utf8');
  } catch {
    return null;
  }
}

export abstract class AutonomousAgent {
  protected logger: AgentLogger;
  protected modelName: string;
  protected systemInstruction: string;

  constructor(
    protected agentName: string,
    protected context: AgentContext,
    // ⚠️ MIGRATION OBLIGATOIRE avant le 2026-10-16 (retrait officiel Gemini 2.5
    // par Google) — passer à 'gemini-3.5-flash' (ou la version stable GA la
    // plus récente à ce moment-là). Tâche planifiée pour le 2026-10-15.
    modelName: string = 'gemini-2.5-flash'
  ) {
    this.logger = new AgentLogger(this.agentName, this.context.department);
    this.modelName = modelName;
    this.systemInstruction = `Tu es ${this.agentName}, un agent autonome du département ${this.context.department} chez Purity Agency.\nRole: ${this.context.role}`;

    if (this.context.skills && this.context.skills.length > 0) {
      this.systemInstruction += `\n\n## Skills ECC intégrés (AI configuration)\nTu disposes et dois agir selon les directives des compétences suivantes :\n`;
      for (const skill of this.context.skills) {
        this.systemInstruction += `- \`${skill}\`\n`;
      }
    }

    if (this.context.knowledgeFiles && this.context.knowledgeFiles.length > 0) {
      this.systemInstruction += `\n\n## Base de connaissances (Contexte Purity)\n`;
      for (const filePath of this.context.knowledgeFiles) {
        const content = loadKnowledgeFile(filePath);
        if (content) {
          this.systemInstruction += `\n--- Fichier: ${path.basename(filePath)} ---\n${content}\n`;
        } else {
          console.error(
            `[AgentCore:${this.agentName}] ÉCHEC lecture base de connaissances '${filePath}' — ` +
            `l'agent tourne SANS cette connaissance, dégradé mais pas silencieusement (ce log le prouve).`
          );
        }
      }
    }
  }

  protected async think<T>(
    prompt: string,
    logTaskName?: string,
    schema?: z.ZodType<T>
  ): Promise<T> {
    if (logTaskName) await this.logger.startTask(logTaskName);

    const callOnce = async () => {
      await throttleGeminiCall();
      const model = google(this.modelName);
      return schema
        ? (await generateObject({
            model,
            system: this.systemInstruction,
            prompt,
            schema: schema as z.ZodTypeAny,
          })).object
        : (await generateObject({
            model,
            system: this.systemInstruction,
            prompt,
            output: 'no-schema',
          })).object;
    };

    try {
      let object: unknown;
      try {
        object = await callOnce();
      } catch (error: unknown) {
        // Un seul retry, avec une pause longue, uniquement sur une vraie
        // erreur de quota — jamais sur une erreur de schéma ou de contenu.
        if (isRateLimitError(error)) {
          await new Promise((resolve) => setTimeout(resolve, 20_000));
          object = await callOnce();
        } else {
          throw error;
        }
      }

      if (logTaskName) await this.logger.finishTask(`${logTaskName} - Réflexion terminée`);
      return object as T;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (logTaskName) await this.logger.logError(`Erreur LLM (${logTaskName}): ${message}`);
      throw error;
    }
  }
}
