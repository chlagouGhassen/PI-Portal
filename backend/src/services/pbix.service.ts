// Extraction de métadonnées depuis un .pbix.
//
// Un .pbix est un ZIP. On lit Report/definition/pages/*.json et visuals/*.json
// pour reconstituer la structure du rapport (pages, visuels, tables référencées,
// custom visuals). Les VALEURS des tables (rows) ne sont pas accessibles - elles
// vivent dans le blob DataModel compressé en XPress9 (proprio Microsoft).
//
// Si la structure du .pbix ne contient pas Report/definition/ (ancien format
// PBIDocument), on bascule sur les anciens chemins (Report/Layout).

import AdmZip from 'adm-zip';

export interface PageMeta {
  id: string;
  displayName: string;
  visualCount: number;
  visualTypes: Record<string, number>;
}

export interface PbixMetadata {
  pages: PageMeta[];
  tables: string[];                   // ex. ["DimEntreprise", "DimTemps", "FactPerformance"]
  columns: string[];                  // ex. ["FactPerformance.ROEMoyen", ...]
  visualTypeCounts: Record<string, number>;
  customVisuals: string[];
  totalVisuals: number;
}

/**
 * Décompresse un .pbix (buffer) et extrait ses métadonnées.
 * Throws si l'archive n'est pas un .pbix valide ou si la structure attendue est absente.
 */
export function extractPbixMetadata(buffer: Buffer): PbixMetadata {
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new Error('Fichier invalide : ce n\'est pas un .pbix lisible (échec de l\'ouverture ZIP).');
  }

  const entries = zip.getEntries();
  const pagesEntries = entries.filter(
    (e) => e.entryName.startsWith('Report/definition/pages/') && e.entryName.endsWith('/page.json'),
  );
  const visualEntries = entries.filter(
    (e) =>
      e.entryName.startsWith('Report/definition/pages/') &&
      e.entryName.endsWith('/visual.json'),
  );

  if (pagesEntries.length === 0) {
    throw new Error(
      "Format non reconnu : Report/definition/pages/ est absent. Ce .pbix est peut-être trop ancien (format PBIDocument legacy).",
    );
  }

  const pages: PageMeta[] = [];
  const tablesSet = new Set<string>();
  const columnsSet = new Set<string>();
  const visualTypeCounts: Record<string, number> = {};
  let totalVisuals = 0;

  for (const pageEntry of pagesEntries) {
    const pageJson = parseJson(pageEntry.getData().toString('utf8'));
    const pageId = (pageJson.name as string | undefined) ?? pageEntry.entryName;
    const displayName = (pageJson.displayName as string | undefined) ?? '(sans nom)';

    // Visuels appartenant à cette page (préfixe entryName).
    const prefix = pageEntry.entryName.replace('/page.json', '/visuals/');
    const ownVisuals = visualEntries.filter((v) => v.entryName.startsWith(prefix));

    const pageVisualTypes: Record<string, number> = {};

    for (const v of ownVisuals) {
      const visualJson = parseJson(v.getData().toString('utf8'));
      // Power BI a deux structures dans visual.json :
      //  - { visual: { visualType: "areaChart", ... } }   → vrai visuel
      //  - { visualGroup: { displayName, groupMode } }    → conteneur qui groupe d'autres visuels
      const type =
        (visualJson.visual as { visualType?: string } | undefined)?.visualType ??
        (visualJson.visualGroup !== undefined ? 'visualGroup' : 'unknown');

      pageVisualTypes[type] = (pageVisualTypes[type] ?? 0) + 1;
      visualTypeCounts[type] = (visualTypeCounts[type] ?? 0) + 1;
      totalVisuals += 1;

      // Extraction des tables/colonnes référencées dans les projections.
      walkQuery(visualJson, (entity, property) => {
        tablesSet.add(entity);
        if (property) columnsSet.add(`${entity}.${property}`);
      });
    }

    pages.push({
      id: pageId,
      displayName,
      visualCount: ownVisuals.length,
      visualTypes: pageVisualTypes,
    });
  }

  // Custom visuals : dossiers sous Report/CustomVisuals/*/
  const customVisualsSet = new Set<string>();
  for (const e of entries) {
    const match = e.entryName.match(/^Report\/CustomVisuals\/([^\/]+)\//);
    if (match && match[1]) customVisualsSet.add(match[1]);
  }

  return {
    pages,
    tables: [...tablesSet].sort(),
    columns: [...columnsSet].sort(),
    visualTypeCounts,
    customVisuals: [...customVisualsSet].sort(),
    totalVisuals,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseJson(text: string): Record<string, unknown> {
  // Power BI peut écrire un BOM UTF-8 au début des JSON.
  const cleaned = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return JSON.parse(cleaned) as Record<string, unknown>;
}

/**
 * Parcours récursif d'un objet JSON pour trouver les références
 * { SourceRef: { Entity: "..." }, Property: "..." } (format Power BI).
 */
function walkQuery(node: unknown, onRef: (entity: string, property: string | null) => void): void {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) walkQuery(item, onRef);
    return;
  }
  const obj = node as Record<string, unknown>;
  // Pattern 1 : { Column: { Expression: { SourceRef: { Entity } }, Property } }
  // Pattern 2 : { Measure: { Expression: { SourceRef: { Entity } }, Property } }
  const colOrMeasure = (obj.Column ?? obj.Measure) as
    | { Expression?: { SourceRef?: { Entity?: string } }; Property?: string }
    | undefined;
  if (colOrMeasure?.Expression?.SourceRef?.Entity) {
    onRef(colOrMeasure.Expression.SourceRef.Entity, colOrMeasure.Property ?? null);
  }
  // Récursion sur toutes les valeurs (pour attraper les structures imbriquées).
  for (const value of Object.values(obj)) walkQuery(value, onRef);
}
