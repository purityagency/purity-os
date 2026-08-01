export type LeadStatus = 'NEW' | 'ENRICHED' | 'DRAFTED' | 'CONTACTED' | 'BOUNCED' | 'REPLIED' | 'MEETING_BOOKED';

export interface MissionOrder {
  missionId: string;
  name: string; // ex: "BTP Wallonie Q3"
  parameters: {
    sectors: string[];
    locations: string[];
    maxLeads: number;
    requiredTechStack?: string[]; // Si on cherche spécifiquement des sites WordPress par ex.
  };
  createdAt: Date;
}

export interface RawLead {
  id: string;
  missionId: string;
  companyName: string;
  websiteUrl: string | null;
  googleMapsUrl?: string;
  location: string;
  source: 'EXA' | 'GOOGLE_PLACES' | 'LINKEDIN';
  status: LeadStatus;
  createdAt: Date;
}

export interface AuditPayload {
  lighthouseScore?: {
    performance: number;
    accessibility: number;
    seo: number;
  };
  hasMobileResponsiveness?: boolean;
  gmbRating?: number;
  gmbReviewCount?: number;
  identifiedPainPoints: string[]; // ex: ["LCP > 4s", "No HTTPS"]
}

export interface EnrichedLead extends RawLead {
  contactName?: string;
  contactEmail?: string;
  contactRole?: string;
  techStack?: string[]; // Ajouté pour l'extraction Exa
  auditData: AuditPayload;
  recommendedModules?: string[]; // ex: ["M04", "M13"]
}

export interface EmailDraft {
  draftId: string;
  leadId: string;
  subject: string;
  bodyHtml: string;
  tone: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
}
