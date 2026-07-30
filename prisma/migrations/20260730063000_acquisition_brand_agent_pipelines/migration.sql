-- Réconciliation de dérive de schéma : ces 7 tables existaient déjà en base
-- (créées hors du système de migration, probablement via `prisma db push` ou
-- SQL brut) mais n'avaient aucune entrée dans _prisma_migrations. Cette
-- migration documente enfin leur structure réelle ; elle est marquée comme
-- appliquée sans être ré-exécutée, la base les ayant déjà.

-- CreateTable: Pôle 01 Acquisition
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Mission_status_createdAt_idx" ON "Mission"("status", "createdAt");

CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "googleMapsUrl" TEXT,
    "location" TEXT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactRole" TEXT,
    "auditData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Lead_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Lead_missionId_status_idx" ON "Lead"("missionId", "status");
CREATE INDEX "Lead_status_updatedAt_idx" ON "Lead"("status", "updatedAt");

CREATE TABLE "EmailDraft" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDraft_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EmailDraft_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "EmailDraft_leadId_status_idx" ON "EmailDraft"("leadId", "status");
CREATE INDEX "EmailDraft_status_createdAt_idx" ON "EmailDraft"("status", "createdAt");

-- CreateTable: Pôle 02 Brand
CREATE TABLE "BrandCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrandCampaign_status_createdAt_idx" ON "BrandCampaign"("status", "createdAt");

CREATE TABLE "ContentDraft" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "postText" TEXT NOT NULL,
    "mediaUrls" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING_GUARDIAN_APPROVAL',
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentDraft_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ContentDraft_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "BrandCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ContentDraft_campaignId_status_idx" ON "ContentDraft"("campaignId", "status");
CREATE INDEX "ContentDraft_status_createdAt_idx" ON "ContentDraft"("status", "createdAt");

CREATE TABLE "BrandMemory" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT,
    "relevance" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandMemory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrandMemory_type_idx" ON "BrandMemory"("type");

-- CreateTable: Système nerveux (état live des agents)
CREATE TABLE "AgentActivity" (
    "id" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "currentTask" TEXT,
    "lastLog" TEXT,
    "history" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentActivity_agentName_key" ON "AgentActivity"("agentName");
CREATE INDEX "AgentActivity_department_idx" ON "AgentActivity"("department");
CREATE INDEX "AgentActivity_status_idx" ON "AgentActivity"("status");
