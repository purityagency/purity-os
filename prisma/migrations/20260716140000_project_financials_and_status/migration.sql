-- Ajoute les champs financiers issus des commandes du site public
-- et permet de tracer l'origine (externalOrderId) pour relier Project <-> data/orders/*.json

ALTER TABLE "Project" ADD COLUMN "externalOrderId" TEXT;
ALTER TABLE "Project" ADD COLUMN "sector" TEXT;
ALTER TABLE "Project" ADD COLUMN "totalPrice" REAL;
ALTER TABLE "Project" ADD COLUMN "depositAmount" REAL;
ALTER TABLE "Project" ADD COLUMN "remainingAmount" REAL;
ALTER TABLE "Project" ADD COLUMN "monthlyAmount" REAL;

CREATE UNIQUE INDEX "Project_externalOrderId_key" ON "Project"("externalOrderId");
