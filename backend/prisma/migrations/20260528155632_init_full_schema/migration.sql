-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dashboard" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardAccess" (
    "userId" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardAccess_pkey" PRIMARY KEY ("userId","dashboardId")
);

-- CreateTable
CREATE TABLE "DimEntreprise" (
    "EntrepriseID" INTEGER NOT NULL,
    "NomEntreprise" TEXT NOT NULL,

    CONSTRAINT "DimEntreprise_pkey" PRIMARY KEY ("EntrepriseID")
);

-- CreateTable
CREATE TABLE "DimTemps" (
    "AnneeID" INTEGER NOT NULL,
    "Annee" INTEGER NOT NULL,
    "PeriodeLabel" TEXT,

    CONSTRAINT "DimTemps_pkey" PRIMARY KEY ("AnneeID")
);

-- CreateTable
CREATE TABLE "DimBilan" (
    "BilanID" INTEGER NOT NULL,
    "EntrepriseID" INTEGER NOT NULL,
    "AnneeID" INTEGER NOT NULL,
    "TotalActif" DOUBLE PRECISION,
    "ActifsNonCourants" DOUBLE PRECISION,
    "ActifsCourants" DOUBLE PRECISION,
    "Stocks" DOUBLE PRECISION,
    "CreancesClients" DOUBLE PRECISION,
    "Tresorerie" DOUBLE PRECISION,
    "TotalPassif" DOUBLE PRECISION,
    "CapitauxPropresAvtResult" DOUBLE PRECISION,
    "CapitauxPropres" DOUBLE PRECISION,
    "DettesLT" DOUBLE PRECISION,
    "PassifsCourants" DOUBLE PRECISION,
    "DetteFournisseurs" DOUBLE PRECISION,
    "Emprunt" DOUBLE PRECISION,
    "TotalCapitauxPassif" DOUBLE PRECISION,
    "ProduitExploitation" DOUBLE PRECISION,
    "ChargesExploitation" DOUBLE PRECISION,
    "FluxTresoExploitation" DOUBLE PRECISION,
    "FluxTresoInvestissement" DOUBLE PRECISION,
    "FluxTresoFinancement" DOUBLE PRECISION,
    "VariationTresorerie" DOUBLE PRECISION,
    "CapitalSocial" DOUBLE PRECISION,
    "ChargesPersonnel" DOUBLE PRECISION,

    CONSTRAINT "DimBilan_pkey" PRIMARY KEY ("BilanID")
);

-- CreateTable
CREATE TABLE "DimResultat" (
    "ResultatID" INTEGER NOT NULL,
    "EntrepriseID" INTEGER NOT NULL,
    "AnneeID" INTEGER NOT NULL,
    "ChiffreAffaires" DOUBLE PRECISION,
    "TotalProduitsExploitation" DOUBLE PRECISION,
    "CoutDesVentes" DOUBLE PRECISION,
    "TotalChargesExploitation" DOUBLE PRECISION,
    "EBIT" DOUBLE PRECISION,
    "ChargesFinancieres" DOUBLE PRECISION,
    "ResultatNet" DOUBLE PRECISION,
    "FluxTresoExploitation" DOUBLE PRECISION,

    CONSTRAINT "DimResultat_pkey" PRIMARY KEY ("ResultatID")
);

-- CreateTable
CREATE TABLE "DimRatios" (
    "RatiosID" INTEGER NOT NULL,
    "EntrepriseID" INTEGER NOT NULL,
    "AnneeID" INTEGER NOT NULL,
    "BFR" DOUBLE PRECISION,
    "FondsDeRoulement" DOUBLE PRECISION,
    "TresorerieNette" DOUBLE PRECISION,
    "RatioImmobilisation" DOUBLE PRECISION,
    "RatioActifCourant" DOUBLE PRECISION,
    "RatioStocksActifCourant" DOUBLE PRECISION,
    "RatioCreancesCA" DOUBLE PRECISION,
    "TauxEndettement" DOUBLE PRECISION,
    "TauxEndettementNet" DOUBLE PRECISION,
    "CouvertureChargesFinanc" DOUBLE PRECISION,
    "AutonomiFinanciere" DOUBLE PRECISION,
    "Solvabilite" DOUBLE PRECISION,
    "CurrentRatio" DOUBLE PRECISION,
    "QuickRatio" DOUBLE PRECISION,
    "CashRatio" DOUBLE PRECISION,
    "ROE" DOUBLE PRECISION,
    "ROA" DOUBLE PRECISION,
    "ROCE" DOUBLE PRECISION,
    "MargeNette" DOUBLE PRECISION,
    "MargeBrute" DOUBLE PRECISION,
    "RotationStocks" DOUBLE PRECISION,
    "DSO" DOUBLE PRECISION,
    "DPO" DOUBLE PRECISION,
    "RotationActifs" DOUBLE PRECISION,

    CONSTRAINT "DimRatios_pkey" PRIMARY KEY ("RatiosID")
);

-- CreateTable
CREATE TABLE "FactPerformance" (
    "FactID" INTEGER NOT NULL,
    "EntrepriseID" INTEGER NOT NULL,
    "AnneeID" INTEGER NOT NULL,
    "BilanID" INTEGER,
    "RatiosID" INTEGER,
    "ResultatID" INTEGER,
    "TotalActif" DOUBLE PRECISION,
    "CapitauxPropres" DOUBLE PRECISION,
    "ChiffreAffaires" DOUBLE PRECISION,
    "ResultatNet" DOUBLE PRECISION,
    "EBIT" DOUBLE PRECISION,
    "ROE" DOUBLE PRECISION,
    "ROA" DOUBLE PRECISION,
    "ROCE" DOUBLE PRECISION,
    "MargeNette" DOUBLE PRECISION,
    "MargeBrute" DOUBLE PRECISION,
    "BFR" DOUBLE PRECISION,
    "CurrentRatio" DOUBLE PRECISION,

    CONSTRAINT "FactPerformance_pkey" PRIMARY KEY ("FactID")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Dashboard_slug_key" ON "Dashboard"("slug");

-- CreateIndex
CREATE INDEX "DashboardAccess_dashboardId_idx" ON "DashboardAccess"("dashboardId");

-- CreateIndex
CREATE INDEX "DimBilan_EntrepriseID_AnneeID_idx" ON "DimBilan"("EntrepriseID", "AnneeID");

-- CreateIndex
CREATE INDEX "DimResultat_EntrepriseID_AnneeID_idx" ON "DimResultat"("EntrepriseID", "AnneeID");

-- CreateIndex
CREATE INDEX "DimRatios_EntrepriseID_AnneeID_idx" ON "DimRatios"("EntrepriseID", "AnneeID");

-- CreateIndex
CREATE INDEX "FactPerformance_EntrepriseID_AnneeID_idx" ON "FactPerformance"("EntrepriseID", "AnneeID");

-- AddForeignKey
ALTER TABLE "DashboardAccess" ADD CONSTRAINT "DashboardAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardAccess" ADD CONSTRAINT "DashboardAccess_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Dashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DimBilan" ADD CONSTRAINT "DimBilan_EntrepriseID_fkey" FOREIGN KEY ("EntrepriseID") REFERENCES "DimEntreprise"("EntrepriseID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DimBilan" ADD CONSTRAINT "DimBilan_AnneeID_fkey" FOREIGN KEY ("AnneeID") REFERENCES "DimTemps"("AnneeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DimResultat" ADD CONSTRAINT "DimResultat_EntrepriseID_fkey" FOREIGN KEY ("EntrepriseID") REFERENCES "DimEntreprise"("EntrepriseID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DimResultat" ADD CONSTRAINT "DimResultat_AnneeID_fkey" FOREIGN KEY ("AnneeID") REFERENCES "DimTemps"("AnneeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DimRatios" ADD CONSTRAINT "DimRatios_EntrepriseID_fkey" FOREIGN KEY ("EntrepriseID") REFERENCES "DimEntreprise"("EntrepriseID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DimRatios" ADD CONSTRAINT "DimRatios_AnneeID_fkey" FOREIGN KEY ("AnneeID") REFERENCES "DimTemps"("AnneeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactPerformance" ADD CONSTRAINT "FactPerformance_EntrepriseID_fkey" FOREIGN KEY ("EntrepriseID") REFERENCES "DimEntreprise"("EntrepriseID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactPerformance" ADD CONSTRAINT "FactPerformance_AnneeID_fkey" FOREIGN KEY ("AnneeID") REFERENCES "DimTemps"("AnneeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactPerformance" ADD CONSTRAINT "FactPerformance_BilanID_fkey" FOREIGN KEY ("BilanID") REFERENCES "DimBilan"("BilanID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactPerformance" ADD CONSTRAINT "FactPerformance_RatiosID_fkey" FOREIGN KEY ("RatiosID") REFERENCES "DimRatios"("RatiosID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactPerformance" ADD CONSTRAINT "FactPerformance_ResultatID_fkey" FOREIGN KEY ("ResultatID") REFERENCES "DimResultat"("ResultatID") ON DELETE SET NULL ON UPDATE CASCADE;
