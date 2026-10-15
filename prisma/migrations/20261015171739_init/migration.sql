-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "Pillar" AS ENUM ('SAILING_FOR_IMPACT', 'COASTAL_SCHOOL_RENEWAL', 'BLUE_HORIZONS_SCHOLARSHIPS', 'ANNUAL_GALA');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('IDEA', 'UNDER_REVIEW', 'APPROVED', 'FUNDRAISING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED', 'SPAM');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'NOT_CONFIGURED');

-- CreateEnum
CREATE TYPE "ContactTopic" AS ENUM ('GENERAL', 'VOLUNTEERING', 'SCHOOL_OR_PARTNER_REFERRAL', 'PRESS', 'SUPPORT_INTEREST', 'OTHER');

-- CreateEnum
CREATE TYPE "InquirySource" AS ENUM ('CONTACT_FORM', 'DONATE_INTEREST');

-- CreateEnum
CREATE TYPE "SupportType" AS ENUM ('ONE_OFF', 'RECURRING', 'CORPORATE', 'IN_KIND', 'VOLUNTEERING', 'UNDECIDED');

-- CreateEnum
CREATE TYPE "SponsorPackage" AS ENUM ('FOUNDING_PARTNER', 'REGATTA_PARTNER', 'COMMUNITY_PARTNER', 'IN_KIND', 'UNDECIDED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('REGATTA', 'GALA', 'PARTNERSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'MOCK');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('UNRECONCILED', 'RECONCILED', 'DISCREPANCY');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('SCHOOL', 'SAILING_CLUB', 'NONPROFIT', 'PUBLIC_BODY', 'OTHER');

-- CreateEnum
CREATE TYPE "DueDiligenceStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" "RoleName" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pillar" "Pillar" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'IDEA',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "titleEn" TEXT NOT NULL,
    "titleIt" TEXT NOT NULL,
    "summaryEn" TEXT NOT NULL,
    "summaryIt" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionIt" TEXT NOT NULL,
    "locationEn" TEXT NOT NULL,
    "locationIt" TEXT NOT NULL,
    "region" TEXT,
    "goalsEn" TEXT[],
    "goalsIt" TEXT[],
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "budgetCents" INTEGER NOT NULL DEFAULT 0,
    "budgetIsIllustrative" BOOLEAN NOT NULL DEFAULT true,
    "budgetLines" JSONB NOT NULL DEFAULT '[]',
    "pledgedCents" INTEGER NOT NULL DEFAULT 0,
    "spentCents" INTEGER NOT NULL DEFAULT 0,
    "privacyNoteEn" TEXT,
    "privacyNoteIt" TEXT,
    "coverMediaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleIt" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionIt" TEXT,
    "targetLabelEn" TEXT,
    "targetLabelIt" TEXT,
    "completedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectUpdate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleIt" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyIt" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "data" BYTEA,
    "externalUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "altEn" TEXT NOT NULL DEFAULT '',
    "altIt" TEXT NOT NULL DEFAULT '',
    "credit" TEXT,
    "license" TEXT,
    "sourceUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "depictsMinors" BOOLEAN NOT NULL DEFAULT false,
    "guardianConsentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeneficiaryOrganization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "region" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "dueDiligenceStatus" "DueDiligenceStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "dueDiligenceNotes" TEXT,
    "publicNameConsent" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BeneficiaryOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'PROPOSED',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "interestOpen" BOOLEAN NOT NULL DEFAULT true,
    "titleEn" TEXT NOT NULL,
    "titleIt" TEXT NOT NULL,
    "summaryEn" TEXT NOT NULL,
    "summaryIt" TEXT NOT NULL,
    "locationEn" TEXT NOT NULL,
    "locationIt" TEXT NOT NULL,
    "dateLabelEn" TEXT NOT NULL,
    "dateLabelIt" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventInterest" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organization" TEXT,
    "partySize" INTEGER,
    "message" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "consentAt" TIMESTAMP(3) NOT NULL,
    "privacyVersion" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "emailStatus" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "emailError" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorInquiry" (
    "id" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "packageInterest" "SponsorPackage" NOT NULL DEFAULT 'UNDECIDED',
    "message" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "consentAt" TIMESTAMP(3) NOT NULL,
    "privacyVersion" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "emailStatus" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "emailError" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactInquiry" (
    "id" TEXT NOT NULL,
    "source" "InquirySource" NOT NULL DEFAULT 'CONTACT_FORM',
    "topic" "ContactTopic" NOT NULL DEFAULT 'GENERAL',
    "supportType" "SupportType",
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "consentAt" TIMESTAMP(3) NOT NULL,
    "privacyVersion" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "emailStatus" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "emailError" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "PaymentProvider" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "amountReceivedCents" INTEGER,
    "idempotencyKey" TEXT NOT NULL,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "livemode" BOOLEAN NOT NULL DEFAULT false,
    "donorEmail" TEXT,
    "projectId" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "completedAt" TIMESTAMP(3),
    "reconciliationStatus" "ReconciliationStatus" NOT NULL DEFAULT 'UNRECONCILED',
    "reconciledAt" TIMESTAMP(3),
    "reconciledById" TEXT,
    "reconciliationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationEvent" (
    "id" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "donationId" TEXT,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "_BeneficiaryOrganizationToProject" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BeneficiaryOrganizationToProject_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_pillar_idx" ON "Project"("pillar");

-- CreateIndex
CREATE INDEX "Project_isPublished_sortOrder_idx" ON "Project"("isPublished", "sortOrder");

-- CreateIndex
CREATE INDEX "ProjectMilestone_projectId_sortOrder_idx" ON "ProjectMilestone"("projectId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProjectUpdate_projectId_publishedAt_idx" ON "ProjectUpdate"("projectId", "publishedAt");

-- CreateIndex
CREATE INDEX "MediaAsset_projectId_idx" ON "MediaAsset"("projectId");

-- CreateIndex
CREATE INDEX "MediaAsset_kind_isPublic_idx" ON "MediaAsset"("kind", "isPublic");

-- CreateIndex
CREATE INDEX "MediaAsset_sha256_idx" ON "MediaAsset"("sha256");

-- CreateIndex
CREATE INDEX "BeneficiaryOrganization_dueDiligenceStatus_idx" ON "BeneficiaryOrganization"("dueDiligenceStatus");

-- CreateIndex
CREATE UNIQUE INDEX "BeneficiaryOrganization_name_region_key" ON "BeneficiaryOrganization"("name", "region");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_type_status_idx" ON "Event"("type", "status");

-- CreateIndex
CREATE INDEX "Event_isPublished_sortOrder_idx" ON "Event"("isPublished", "sortOrder");

-- CreateIndex
CREATE INDEX "EventInterest_status_createdAt_idx" ON "EventInterest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventInterest_eventId_email_key" ON "EventInterest"("eventId", "email");

-- CreateIndex
CREATE INDEX "SponsorInquiry_status_createdAt_idx" ON "SponsorInquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SponsorInquiry_email_idx" ON "SponsorInquiry"("email");

-- CreateIndex
CREATE INDEX "ContactInquiry_source_status_createdAt_idx" ON "ContactInquiry"("source", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ContactInquiry_email_idx" ON "ContactInquiry"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_idempotencyKey_key" ON "Donation"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_stripeCheckoutSessionId_key" ON "Donation"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_stripePaymentIntentId_key" ON "Donation"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Donation_status_createdAt_idx" ON "Donation"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Donation_reconciliationStatus_idx" ON "Donation"("reconciliationStatus");

-- CreateIndex
CREATE INDEX "Donation_projectId_idx" ON "Donation"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "DonationEvent_providerEventId_key" ON "DonationEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "DonationEvent_donationId_idx" ON "DonationEvent"("donationId");

-- CreateIndex
CREATE INDEX "DonationEvent_type_createdAt_idx" ON "DonationEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "_BeneficiaryOrganizationToProject_B_index" ON "_BeneficiaryOrganizationToProject"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUpdate" ADD CONSTRAINT "ProjectUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInterest" ADD CONSTRAINT "EventInterest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationEvent" ADD CONSTRAINT "DonationEvent_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BeneficiaryOrganizationToProject" ADD CONSTRAINT "_BeneficiaryOrganizationToProject_A_fkey" FOREIGN KEY ("A") REFERENCES "BeneficiaryOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BeneficiaryOrganizationToProject" ADD CONSTRAINT "_BeneficiaryOrganizationToProject_B_fkey" FOREIGN KEY ("B") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
