-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "score" INTEGER;

-- CreateIndex
CREATE INDEX "Lead_score_idx" ON "Lead"("score");
