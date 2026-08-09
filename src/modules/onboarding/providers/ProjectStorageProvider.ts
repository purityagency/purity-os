import { IStorageProvider } from '@/core/providers';
import { logger } from '@/core/logger';

/**
 * Espace de stockage projet — remplace l'ancien "S3StorageProvider" (qui
 * exigeait S3_BUCKET_NAME/S3_ACCESS_KEY inexistants et throwait, alors que son
 * implémentation était de toute façon vide).
 *
 * Réalité du repo : les documents sont rattachés à leur projet par la clé
 * étrangère `Document.projectId` (voir modèle Prisma + /api/documents). Le
 * "préfixe de stockage" logique, c'est donc l'id du projet lui-même — aucun
 * bucket externe n'est nécessaire. Cette étape ne fait plus qu'acter ce
 * namespace, sans dépendance AWS ni échec silencieux. Le jour où un stockage
 * objet réel est ajouté (Cloudflare R2, etc.), il suffira d'implémenter ici.
 */
export class ProjectStorageProvider implements IStorageProvider {
  async createProjectPrefix(projectId: string): Promise<void> {
    logger.info(`[Storage] Namespace documents = projet ${projectId} (rattachement par projectId en base).`);
  }
}
