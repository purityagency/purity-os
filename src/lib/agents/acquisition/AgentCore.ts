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

export interface AgentContext {
  role: string;
  department: string;
  knowledgeFiles?: string[];
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

    try {
      const model = google(this.modelName);

      const object = schema
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

      if (logTaskName) await this.logger.finishTask(`${logTaskName} - Réflexion terminée`);
      return object as T;
    } catch (error: any) {
      if (logTaskName) await this.logger.logError(`Erreur LLM (${logTaskName}): ${error.message}`);
      throw error;
    }
  }
}
