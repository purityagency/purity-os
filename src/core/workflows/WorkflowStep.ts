export interface WorkflowStep<TContext> {
  readonly name: string;
  execute(context: TContext): Promise<void>;
}

/**
 * Rapport d'échec d'une étape. `core/` ne connaît ni la base ni les emails :
 * le module appelant branche l'implémentation qui rend l'échec visible
 * (événement `SYSTEM` dans la boîte de réception, alerte, etc.).
 *
 * Sans reporter, un échec ne vit que dans les logs de la plateforme — donc
 * personne ne le voit. C'est le mode dégradé, pas le mode normal.
 */
export interface WorkflowFailureReporter<TContext> {
  (info: {
    workflowName: string;
    stepName: string;
    error: unknown;
    context: TContext;
    durationMs: number;
  }): Promise<void> | void;
}
