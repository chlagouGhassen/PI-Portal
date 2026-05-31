// Seed pour la phase 3 :
//   - 1 compte ADMIN par défaut
//   - 1 compte USER de démo (pour valider le filtrage par accès)
//   - 2 dashboards correspondant aux 2 pages du .pbix
//   - Accès USER → uniquement le 1er dashboard (l'admin voit tout via court-circuit)
//
// Phase 4 enrichira ce seed avec le chargement des CSV métier depuis ./seed-data/.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DASHBOARDS = [
  {
    slug: 'performance-investissements',
    title: 'Performance Investissements',
    description:
      "Évolution temporelle des indicateurs financiers : actif total, capitaux propres, CA, résultat net, ROA/ROE moyens.",
    category: 'Analyse temporelle',
  },
  {
    slug: 'analyse-comparative',
    title: 'Analyse comparative inter-entreprises',
    description:
      'Benchmark des entreprises sur les ratios de rentabilité (ROA·ROE·ROCE), de liquidité et d\'endettement.',
    category: 'Benchmark',
  },
  {
    slug: 'prediction',
    title: 'Prédiction du Chiffre d\'Affaires',
    description:
      "Pipeline ML (Ridge / GradientBoosting / RandomForest) avec LOO Cross-Validation. Sélectionnez une entreprise et un horizon (1-10 ans) pour générer une projection de CA, avec bande de confiance ±8% et comparaison des modèles.",
    category: 'Modélisation',
  },
  {
    slug: 'serie-temporelle',
    title: 'Série temporelle - Cours bourse',
    description:
      "Analyse du cours de clôture journalier (2015-2024) avec décomposition STL, test ADF de stationnarité, et prédiction walk-forward ARIMA(2,1,1) vs SARIMA(1,1,0)(5,1,0,5). Métriques RMSE / MAE / MAPE.",
    category: 'Séries temporelles',
  },
];

const DEFAULT_ADMIN_PASSWORD = 'ChangeMe!2026';
const DEFAULT_DEMO_PASSWORD = 'Demo!2026';

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@pi-portal.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
  const demoEmail = process.env.SEED_DEMO_EMAIL ?? 'demo@pi-portal.local';
  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? DEFAULT_DEMO_PASSWORD;

  // Garde-fou : refuser les mots de passe par défaut en production.
  if (process.env.NODE_ENV === 'production') {
    if (adminPassword === DEFAULT_ADMIN_PASSWORD || demoPassword === DEFAULT_DEMO_PASSWORD) {
      console.error(
        '❌ Refus de seed avec un mot de passe par défaut en production.\n' +
          '   Définissez SEED_ADMIN_PASSWORD (et SEED_DEMO_PASSWORD si vous voulez le user démo).',
      );
      process.exit(1);
    }
  }

  const adminHash = await bcrypt.hash(adminPassword, 12);
  const demoHash = await bcrypt.hash(demoPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, password: adminHash, name: 'Administrateur', role: 'ADMIN' },
  });

  const demo = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: { email: demoEmail, password: demoHash, name: 'Utilisateur démo', role: 'USER' },
  });

  const dashboards = [];
  for (const d of DASHBOARDS) {
    dashboards.push(
      await prisma.dashboard.upsert({
        where: { slug: d.slug },
        update: { title: d.title, description: d.description, category: d.category },
        create: d,
      }),
    );
  }

  // Le user démo a accès à TOUS les dashboards (compte de démonstration
  // utilisé pour parcourir l'app). On itère sur le tableau au lieu d'une liste
  // de slugs hardcodée → si on ajoute un dashboard via le seed, demo y aura
  // accès automatiquement sans intervention.
  for (const dash of dashboards) {
    await prisma.dashboardAccess.upsert({
      where: { userId_dashboardId: { userId: demo.id, dashboardId: dash.id } },
      update: {},
      create: { userId: demo.id, dashboardId: dash.id },
    });
  }

  console.log('✓ Seed terminé');
  console.log(`  ADMIN: ${admin.email} / ${adminPassword}`);
  console.log(`  USER:  ${demo.email} / ${demoPassword}  (accès à ${dashboards.length}/${DASHBOARDS.length} dashboards)`);
  console.log(`  Dashboards: ${dashboards.map((d) => d.slug).join(', ')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
