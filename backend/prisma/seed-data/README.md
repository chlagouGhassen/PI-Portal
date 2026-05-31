# seed-data/

Données métier post-ETL, importées par `npm run import` (script
`prisma/import-csv.ts`). Les fichiers `.csv` à la racine de ce dossier sont
**gitignorés** (cf. `.gitignore` racine) : ce sont vos exports réels.

## Fichiers attendus

| Fichier               | Colonnes (en-tête)                                                                                                                                                                                   |
|-----------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `dim_entreprise.csv`  | `NomEntreprise`                                                                                                                                                                                       |
| `dim_temps.csv`       | `Annee`                                                                                                                                                                                               |
| `fact_performance.csv`| `NomEntreprise`, `Annee`, `TotalActifFact`, `CapitauxPropres`, `TotalCAFact`, `TotalResultatNet`, `ROEMoyen`, `ROAMoyen`, `ROCEMoyen`, `TauxProfitabilite`, `RatioLiquiditeMoyen`, `TauxEndettementMoyen`, `VAR_ROA`, `Tendance_ROE`, `Couleur_Endettement`, `Couleur_Liquidite`, `Couleur_ROE` |

## Formats tolérés (auto-détection)

- **Encodage** : UTF-8, UTF-8 BOM, UTF-16 LE BOM (l'export par défaut de Power BI Desktop FR).
- **Délimiteur** : `,` ou `;` ou tabulation.
- **Décimales** : `1,5` ou `1.5`. Espaces dans les nombres (`1 234,5`) tolérés.
- **Lignes vides** ignorées.

## Tester le pipeline sans données réelles

Les CSV d'exemple (`_examples/`) sont fournis pour valider l'import :

```bash
cp prisma/seed-data/_examples/*.csv prisma/seed-data/
npm run import
```

10 entreprises × 4 ans = 40 lignes dans `FactPerformance`.

## Export depuis Power BI Desktop

1. Ouvrir `data/PI_FINALE.pbix` dans Power BI Desktop.
2. Passer en vue **Données** (icône table à gauche).
3. Pour chaque table (`DimEntreprise`, `DimTemps`, `FactPerformance`) :
   - Clic droit sur le nom de table → **Copier la table**, puis coller dans
     un tableur et enregistrer en CSV.
   - Alternative : clic droit → **Exporter les données** (si disponible).
4. Renommer en `dim_entreprise.csv`, `dim_temps.csv`, `fact_performance.csv`
   et placer dans `prisma/seed-data/` (ce dossier).
5. `cd backend && npm run import`.

## Idempotence

Le script fait **truncate-then-insert** : il vide d'abord les 3 tables métier
puis importe. Re-lancer `npm run import` produit toujours le même état (à
condition que les CSV n'aient pas changé). Aucune migration nécessaire entre
deux imports.

Les tables `User`, `Dashboard`, `DashboardAccess` ne sont pas touchées par
l'import - elles relèvent du `seed.ts`.
