// Import transactionnel du contenu extrait d'un .pbix dans Postgres.
//
// Stratégie :
//   1. Le script Python a déjà tout en mémoire (les tables + leurs lignes,
//      les NaN convertis en null).
//   2. On vérifie que les 6 tables attendues sont présentes.
//   3. On vide les tables métier (ordre FK), on insère les dims puis le fact,
//      le tout dans UNE transaction Prisma. Tout passe ou rien ne bouge.
//   4. Les colonnes pbix (PascalCase) sont mappées vers les champs Prisma
//      (camelCase) via une fonction utilitaire - Prisma stocke côté DB en
//      PascalCase grâce aux @map (cf. schema.prisma).

import { log } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import type { ExtractedPbix, ExtractedTable } from './pbix-extractor.service.js';

export interface ImportSummary {
  dimEntreprise: number;
  dimTemps: number;
  dimBilan: number;
  dimResultat: number;
  dimRatios: number;
  factPerformance: number;
  skippedOrphans: number; // lignes ignorées car FK vers IDs absents
}

const EXPECTED_TABLES = [
  'DimEntreprise',
  'DimTemps',
  'DimBilan',
  'DimResultat',
  'DimRatios',
  'FactPerformance',
] as const;

export class PbixImportError extends Error {}

export async function importExtractedPbix(extracted: ExtractedPbix): Promise<ImportSummary> {
  // Validation : toutes les tables attendues doivent être présentes et sans erreur.
  for (const name of EXPECTED_TABLES) {
    const t = extracted.tables[name];
    if (!t) throw new PbixImportError(`Table manquante : ${name}`);
    if ('error' in t) throw new PbixImportError(`Erreur sur ${name} : ${t.error}`);
  }

  const dimEntreprise = extracted.tables.DimEntreprise as ExtractedTable;
  const dimTemps = extracted.tables.DimTemps as ExtractedTable;
  const dimBilan = extracted.tables.DimBilan as ExtractedTable;
  const dimResultat = extracted.tables.DimResultat as ExtractedTable;
  const dimRatios = extracted.tables.DimRatios as ExtractedTable;
  const factPerformance = extracted.tables.FactPerformance as ExtractedTable;

  // Mapping ligne pbix → ligne Prisma (les helpers prennent une row pbixray et
  // sortent un objet avec les champs Prisma camelCase + types coercés).
  const entrepriseData = dimEntreprise.rows.map((r) => ({
    entrepriseId: int(r, 'EntrepriseID'),
    nomEntreprise: str(r, 'NomEntreprise'),
  }));
  const tempsData = dimTemps.rows.map((r) => ({
    anneeId: int(r, 'AnneeID'),
    annee: int(r, 'Annee'),
    periodeLabel: strOrNull(r, 'PeriodeLabel'),
  }));
  const bilanData = dimBilan.rows.map((r) => ({
    bilanId: int(r, 'BilanID'),
    entrepriseId: int(r, 'EntrepriseID'),
    anneeId: int(r, 'AnneeID'),
    totalActif: numOrNull(r, 'TotalActif'),
    actifsNonCourants: numOrNull(r, 'ActifsNonCourants'),
    actifsCourants: numOrNull(r, 'ActifsCourants'),
    stocks: numOrNull(r, 'Stocks'),
    creancesClients: numOrNull(r, 'CreancesClients'),
    tresorerie: numOrNull(r, 'Tresorerie'),
    totalPassif: numOrNull(r, 'TotalPassif'),
    capitauxPropresAvtResult: numOrNull(r, 'CapitauxPropresAvtResult'),
    capitauxPropres: numOrNull(r, 'CapitauxPropres'),
    dettesLT: numOrNull(r, 'DettesLT'),
    passifsCourants: numOrNull(r, 'PassifsCourants'),
    detteFournisseurs: numOrNull(r, 'DetteFournisseurs'),
    emprunt: numOrNull(r, 'Emprunt'),
    totalCapitauxPassif: numOrNull(r, 'TotalCapitauxPassif'),
    produitExploitation: numOrNull(r, 'ProduitExploitation'),
    chargesExploitation: numOrNull(r, 'ChargesExploitation'),
    fluxTresoExploitation: numOrNull(r, 'FluxTresoExploitation'),
    fluxTresoInvestissement: numOrNull(r, 'FluxTresoInvestissement'),
    fluxTresoFinancement: numOrNull(r, 'FluxTresoFinancement'),
    variationTresorerie: numOrNull(r, 'VariationTresorerie'),
    capitalSocial: numOrNull(r, 'CapitalSocial'),
    chargesPersonnel: numOrNull(r, 'ChargesPersonnel'),
  }));
  const resultatData = dimResultat.rows.map((r) => ({
    resultatId: int(r, 'ResultatID'),
    entrepriseId: int(r, 'EntrepriseID'),
    anneeId: int(r, 'AnneeID'),
    chiffreAffaires: numOrNull(r, 'ChiffreAffaires'),
    totalProduitsExploitation: numOrNull(r, 'TotalProduitsExploitation'),
    coutDesVentes: numOrNull(r, 'CoutDesVentes'),
    totalChargesExploitation: numOrNull(r, 'TotalChargesExploitation'),
    ebit: numOrNull(r, 'EBIT'),
    chargesFinancieres: numOrNull(r, 'ChargesFinancieres'),
    resultatNet: numOrNull(r, 'ResultatNet'),
    fluxTresoExploitation: numOrNull(r, 'FluxTresoExploitation'),
  }));
  const ratiosData = dimRatios.rows.map((r) => ({
    ratiosId: int(r, 'RatiosID'),
    entrepriseId: int(r, 'EntrepriseID'),
    anneeId: int(r, 'AnneeID'),
    bfr: numOrNull(r, 'BFR'),
    fondsDeRoulement: numOrNull(r, 'FondsDeRoulement'),
    tresorerieNette: numOrNull(r, 'TresorerieNette'),
    ratioImmobilisation: numOrNull(r, 'RatioImmobilisation'),
    ratioActifCourant: numOrNull(r, 'RatioActifCourant'),
    ratioStocksActifCourant: numOrNull(r, 'RatioStocksActifCourant'),
    ratioCreancesCA: numOrNull(r, 'RatioCreancesCA'),
    tauxEndettement: numOrNull(r, 'TauxEndettement'),
    tauxEndettementNet: numOrNull(r, 'TauxEndettementNet'),
    couvertureChargesFinanc: numOrNull(r, 'CouvertureChargesFinanc'),
    autonomieFinanciere: numOrNull(r, 'AutonomiFinanciere'),
    solvabilite: numOrNull(r, 'Solvabilite'),
    currentRatio: numOrNull(r, 'CurrentRatio'),
    quickRatio: numOrNull(r, 'QuickRatio'),
    cashRatio: numOrNull(r, 'CashRatio'),
    roe: numOrNull(r, 'ROE'),
    roa: numOrNull(r, 'ROA'),
    roce: numOrNull(r, 'ROCE'),
    margeNette: numOrNull(r, 'MargeNette'),
    margeBrute: numOrNull(r, 'MargeBrute'),
    rotationStocks: numOrNull(r, 'RotationStocks'),
    dso: numOrNull(r, 'DSO'),
    dpo: numOrNull(r, 'DPO'),
    rotationActifs: numOrNull(r, 'RotationActifs'),
  }));
  const factData = factPerformance.rows.map((r) => ({
    factId: int(r, 'FactID'),
    entrepriseId: int(r, 'EntrepriseID'),
    anneeId: int(r, 'AnneeID'),
    bilanId: intOrNull(r, 'BilanID'),
    ratiosId: intOrNull(r, 'RatiosID'),
    resultatId: intOrNull(r, 'ResultatID'),
    totalActif: numOrNull(r, 'TotalActif'),
    capitauxPropres: numOrNull(r, 'CapitauxPropres'),
    chiffreAffaires: numOrNull(r, 'ChiffreAffaires'),
    resultatNet: numOrNull(r, 'ResultatNet'),
    ebit: numOrNull(r, 'EBIT'),
    roe: numOrNull(r, 'ROE'),
    roa: numOrNull(r, 'ROA'),
    roce: numOrNull(r, 'ROCE'),
    margeNette: numOrNull(r, 'MargeNette'),
    margeBrute: numOrNull(r, 'MargeBrute'),
    bfr: numOrNull(r, 'BFR'),
    currentRatio: numOrNull(r, 'CurrentRatio'),
  }));

  // Filtrage des orphelins : si une ligne d'un dim secondaire (Bilan/Resultat/
  // Ratios) référence un EntrepriseID ou AnneeID qui n'existe pas dans les dims
  // pivot, on l'ignore. Cas observé sur PI_FINALE.pbix : un exercice futur
  // saisi en bilan mais pas encore créé dans DimTemps. Plutôt que d'échouer
  // toute la transaction, on log et on continue.
  const validEntrepriseIds = new Set(entrepriseData.map((r) => r.entrepriseId));
  const validAnneeIds = new Set(tempsData.map((r) => r.anneeId));

  const isValid = (r: { entrepriseId: number; anneeId: number }) =>
    validEntrepriseIds.has(r.entrepriseId) && validAnneeIds.has(r.anneeId);

  const bilanClean = bilanData.filter(isValid);
  const resultatClean = resultatData.filter(isValid);
  const ratiosClean = ratiosData.filter(isValid);
  const validBilanIds = new Set(bilanClean.map((r) => r.bilanId));
  const validRatiosIds = new Set(ratiosClean.map((r) => r.ratiosId));
  const validResultatIds = new Set(resultatClean.map((r) => r.resultatId));

  // Le fact référence en plus les IDs de bilan/resultat/ratios. Si une de ces
  // dims a été filtrée, on nettoie les FK du fact (null si absent - l'union
  // avec validId peut nullifier les optionnels).
  const factClean = factData
    .filter(isValid)
    .map((r) => ({
      ...r,
      bilanId: r.bilanId !== null && validBilanIds.has(r.bilanId) ? r.bilanId : null,
      ratiosId: r.ratiosId !== null && validRatiosIds.has(r.ratiosId) ? r.ratiosId : null,
      resultatId: r.resultatId !== null && validResultatIds.has(r.resultatId) ? r.resultatId : null,
    }));

  const skippedOrphans =
    (bilanData.length - bilanClean.length) +
    (resultatData.length - resultatClean.length) +
    (ratiosData.length - ratiosClean.length) +
    (factData.length - factClean.length);

  if (skippedOrphans > 0) {
    log.warn('pbix.import.orphans', {
      bilan: bilanData.length - bilanClean.length,
      resultat: resultatData.length - resultatClean.length,
      ratios: ratiosData.length - ratiosClean.length,
      fact: factData.length - factClean.length,
    });
  }

  // Une seule transaction : tout passe ou rien ne bouge.
  return await prisma.$transaction(
    async (tx) => {
      await tx.factPerformance.deleteMany();
      await tx.dimBilan.deleteMany();
      await tx.dimResultat.deleteMany();
      await tx.dimRatios.deleteMany();
      await tx.dimEntreprise.deleteMany();
      await tx.dimTemps.deleteMany();

      await tx.dimEntreprise.createMany({ data: entrepriseData });
      await tx.dimTemps.createMany({ data: tempsData });
      await tx.dimBilan.createMany({ data: bilanClean });
      await tx.dimResultat.createMany({ data: resultatClean });
      await tx.dimRatios.createMany({ data: ratiosClean });
      await tx.factPerformance.createMany({ data: factClean });

      return {
        dimEntreprise: entrepriseData.length,
        dimTemps: tempsData.length,
        dimBilan: bilanClean.length,
        dimResultat: resultatClean.length,
        dimRatios: ratiosClean.length,
        factPerformance: factClean.length,
        skippedOrphans,
      };
    },
    { timeout: 30_000 },
  );
}

// ─── Coercions de types (les rows pbixray peuvent contenir des string/float pour des entiers) ─

function int(row: Record<string, unknown>, key: string): number {
  const v = row[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new PbixImportError(`Champ ${key} : valeur ${JSON.stringify(v)} n'est pas un nombre`);
  }
  return Math.trunc(v);
}

function intOrNull(row: Record<string, unknown>, key: string): number | null {
  const v = row[key];
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return Math.trunc(v);
}

function numOrNull(row: Record<string, unknown>, key: string): number | null {
  const v = row[key];
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function str(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new PbixImportError(`Champ ${key} : valeur ${JSON.stringify(v)} attendue string non-vide`);
  }
  return v;
}

function strOrNull(row: Record<string, unknown>, key: string): string | null {
  const v = row[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}
