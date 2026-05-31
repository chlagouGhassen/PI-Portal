import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDashboardForUser } from './dashboard.service.js';

/**
 * Ligne dénormalisée envoyée aux dashboards React. Mélange FactPerformance
 * (mesures principales) + DimRatios (ratios complémentaires comme le taux
 * d'endettement non présent dans le fact dénormalisé).
 */
export interface PerformanceRow {
  factId: number;
  entrepriseId: number;
  entrepriseNom: string;
  annee: number;
  periodeLabel: string | null;

  // Bilan
  totalActif: number | null;
  capitauxPropres: number | null;
  bfr: number | null;

  // Compte de résultat
  chiffreAffaires: number | null;
  resultatNet: number | null;
  ebit: number | null;

  // Rentabilité
  roe: number | null;
  roa: number | null;
  roce: number | null;
  margeNette: number | null;
  margeBrute: number | null;

  // Liquidité & endettement
  currentRatio: number | null;       // alias commercial : ratio de liquidité
  tauxEndettement: number | null;    // depuis DimRatios (pas dans FactPerformance)
  autonomieFinanciere: number | null;
}

export async function getDashboardData(
  slug: string,
  userId: string,
  role: Role,
): Promise<{ rows: PerformanceRow[] }> {
  await getDashboardForUser(slug, userId, role);

  const facts = await prisma.factPerformance.findMany({
    include: {
      entreprise: { select: { entrepriseId: true, nomEntreprise: true } },
      temps: { select: { annee: true, periodeLabel: true } },
      ratios: {
        select: { tauxEndettement: true, autonomieFinanciere: true },
      },
    },
    orderBy: [{ temps: { annee: 'asc' } }, { entreprise: { nomEntreprise: 'asc' } }],
  });

  const rows: PerformanceRow[] = facts.map((f) => ({
    factId: f.factId,
    entrepriseId: f.entreprise.entrepriseId,
    entrepriseNom: f.entreprise.nomEntreprise,
    annee: f.temps.annee,
    periodeLabel: f.temps.periodeLabel,

    totalActif: f.totalActif,
    capitauxPropres: f.capitauxPropres,
    bfr: f.bfr,

    chiffreAffaires: f.chiffreAffaires,
    resultatNet: f.resultatNet,
    ebit: f.ebit,

    roe: f.roe,
    roa: f.roa,
    roce: f.roce,
    margeNette: f.margeNette,
    margeBrute: f.margeBrute,

    currentRatio: f.currentRatio,
    tauxEndettement: f.ratios?.tauxEndettement ?? null,
    autonomieFinanciere: f.ratios?.autonomieFinanciere ?? null,
  }));

  return { rows };
}
