-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "projectId" TEXT;

-- CreateIndex
CREATE INDEX "Document_projectId_uploadedAt_idx" ON "Document"("projectId", "uploadedAt");

-- CreateIndex
CREATE INDEX "Document_uploadedAt_idx" ON "Document"("uploadedAt");

-- CreateIndex
CREATE INDEX "Event_status_createdAt_idx" ON "Event"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Event_type_createdAt_idx" ON "Event"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");

-- CreateIndex
CREATE INDEX "Event_email_idx" ON "Event"("email");

-- CreateIndex
CREATE INDEX "Event_projectId_idx" ON "Event"("projectId");

-- CreateIndex
CREATE INDEX "Message_projectId_createdAt_idx" ON "Message"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_stageId_idx" ON "Message"("stageId");

-- CreateIndex
CREATE INDEX "Message_authorId_idx" ON "Message"("authorId");

-- CreateIndex
CREATE INDEX "Payment_projectId_createdAt_idx" ON "Payment"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Project_clientId_idx" ON "Project"("clientId");

-- CreateIndex
CREATE INDEX "Project_status_updatedAt_idx" ON "Project"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Project_updatedAt_idx" ON "Project"("updatedAt");

-- CreateIndex
CREATE INDEX "Stage_projectId_orderIndex_idx" ON "Stage"("projectId", "orderIndex");

-- CreateIndex
CREATE INDEX "Stage_updatedAt_idx" ON "Stage"("updatedAt");

-- CreateIndex
CREATE INDEX "User_role_createdAt_idx" ON "User"("role", "createdAt");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
