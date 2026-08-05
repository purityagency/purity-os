import { prisma } from '@/lib/prisma';
import { AgentLogger } from '@/lib/AgentLogger';

/**
 * Bruno Dechamps, Invoice Agent — pôle 04 Finance. Contrairement aux
 * agents du pôle Acquisition, celui-ci n'appelle jamais de LLM : générer
 * une facture est un calcul déterministe à partir de données réelles
 * (Project.totalPrice/depositAmount/remainingAmount), jamais un texte
 * inventé par un modèle. Le seul risque à éviter ici est une erreur de
 * TVA ou de mention légale, pas une hallucination de contenu créatif.
 */
export class InvoiceAgent {
  private logger: AgentLogger;

  constructor() {
    this.logger = new AgentLogger('Invoice Agent', '04_FINANCE');
  }

  /**
   * Purity Agency est sous régime de la franchise de taxe (art. 56bis
   * CTVA, voir purity_catalogue_officiel_v2.md en-tête) — TVA non
   * applicable. Une facture émise sous ce régime doit porter cette
   * mention légale exacte, jamais un taux de TVA calculé (0% n'est pas la
   * même chose qu'"exempté par franchise" aux yeux du fisc belge).
   */
  private static readonly LEGAL_MENTION =
    "Régime de la franchise de taxe — TVA non applicable, article 56bis du Code de la TVA.";

  private async nextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count({
      where: { invoiceNumber: { startsWith: `${year}-` } },
    });
    return `${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Génère une facture DRAFT à partir de données réellement en base — ne
   * calcule ni n'invente jamais un montant. `kind` détermine QUEL montant
   * réel du projet est facturé.
   */
  public async generateInvoice(
    projectId: string,
    kind: 'DEPOSIT' | 'BALANCE' | 'FULL',
    paymentId?: string
  ) {
    await this.logger.startTask(`Génération facture (${kind}) pour le projet ${projectId}`);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true },
    });
    if (!project) {
      await this.logger.logError(`Projet introuvable: ${projectId}`);
      throw new Error(`Projet introuvable: ${projectId}`);
    }

    const amountByKind: Record<typeof kind, number | null> = {
      DEPOSIT: project.depositAmount,
      BALANCE: project.remainingAmount,
      FULL: project.totalPrice,
    };
    const amount = amountByKind[kind];
    if (amount == null || amount <= 0) {
      await this.logger.logError(`Aucun montant réel (${kind}) sur ce projet — facture refusée.`);
      throw new Error(
        `Le projet "${project.name}" n'a pas de montant "${kind}" renseigné — impossible de générer une facture sur un montant inconnu.`
      );
    }

    const kindLabel = { DEPOSIT: 'Acompte', BALANCE: 'Solde', FULL: 'Prestation complète' }[kind];
    const invoiceNumber = await this.nextInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        projectId: project.id,
        paymentId: paymentId ?? null,
        invoiceNumber,
        clientName: project.client.name ?? project.client.email,
        clientEmail: project.client.email,
        lineItems: [
          {
            description: `${project.name}${project.sector ? ` (${project.sector})` : ''} — ${kindLabel}`,
            quantity: 1,
            unitPrice: amount,
            total: amount,
          },
        ],
        totalAmount: amount,
        legalMention: InvoiceAgent.LEGAL_MENTION,
        status: 'DRAFT',
      },
    });

    await this.logger.finishTask(`Facture ${invoiceNumber} générée (${amount}€, statut DRAFT).`);
    return invoice;
  }

  /**
   * Transmission Peppol réelle — nécessite un point d'accès certifié,
   * jamais un XML UBL fait main (voir skill peppol-einvoicing-be : une UBL
   * mal formée est rejetée silencieusement par le logiciel du destinataire,
   * pas juste "moche").
   *
   * Décision 2026-08-05 : Billit, plan gratuit (0€/mois, "factures de vente
   * uniquement" — exactement notre cas, Purity ne reçoit pas de factures
   * fournisseurs via Peppol). Compte pas encore créé — nécessite le numéro
   * BCE de Purity Agency, donc une action humaine (Amir), pas automatisable.
   * L'accès API sur le plan gratuit n'est pas confirmé : une fois le compte
   * créé, vérifier la doc développeur Billit avant de coder l'appel API —
   * si absent sur le gratuit, l'envoi reste manuel (copier les données de
   * cette facture DRAFT dans l'interface Billit) jusqu'à décision contraire.
   */
  public async sendViaPeppol(_invoiceId: string): Promise<never> {
    throw new Error(
      "[InvoiceAgent] Compte Billit (plan gratuit, factures de vente) pas encore créé — " +
      "nécessite le numéro BCE de Purity Agency, action humaine uniquement. " +
      "Une fois créé, vérifier si l'API est disponible sur le plan gratuit avant d'automatiser."
    );
  }
}

