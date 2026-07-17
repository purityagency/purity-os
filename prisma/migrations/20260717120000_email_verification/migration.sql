-- Ajoute la vérification d'email pour l'auto-inscription client
-- et scope les tokens à usage unique par intention (PASSWORD_SET / EMAIL_VERIFY)

ALTER TABLE "User" ADD COLUMN "emailVerified" DATETIME;
ALTER TABLE "MagicLinkToken" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'PASSWORD_SET';
