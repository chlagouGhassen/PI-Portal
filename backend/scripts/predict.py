#!/usr/bin/env python3
"""Pipeline de prédiction du Chiffre d'Affaires pour une entreprise donnée.

Reproduit le pipeline des 4 scripts originaux (Eurocycle, NBL, OfficePlast, SAH)
mais en lisant les données depuis Postgres au lieu d'Excel, avec un feature set
unifié (toutes les entreprises ont les mêmes colonnes après ETL .pbix).

Pipeline :
  1. SELECT joint DimEntreprise + DimTemps + DimBilan + DimResultat pour
     l'entreprise demandée, triée par année.
  2. Imputation médiane sur les NaN résiduels.
  3. StandardScaler sur les features (X) ; y = ChiffreAffaires brut.
  4. Leave-One-Out CV sur 4 modèles : Ridge(α=1), Ridge(α=0.1),
     GradientBoosting, RandomForest. Sélection sur LOO R².
  5. Extrapolation linéaire (polyfit deg=1) des features pour horizon années futures.
  6. Prédiction CA futures avec le best model. Bande de confiance ±8%.

Usage : predict.py --entreprise <NomEntreprise> --horizon <years> --database-url <url>
Stdout : JSON {historical, predictions, models, bestModel, ...}
Stderr : JSON {error: "..."} si exception
Exit : 0 succès, 1 erreur runtime, 2 erreur d'argument
"""

import argparse
import json
import sys
from typing import Any
from urllib.parse import urlparse, urlunparse

import numpy as np
import pandas as pd
import psycopg2
import psycopg2.extras
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import LeaveOneOut
from sklearn.preprocessing import StandardScaler

# Features unifiés : disponibles pour les 4 entreprises après ETL .pbix.
# Sélection basée sur l'intersection des hand-picked des 4 scripts originaux
# + ce qui est cohérent côté schéma Prisma (DimBilan + DimResultat).
FEATURES = [
    "TotalActif",
    "ActifsCourants",
    "Stocks",
    "CreancesClients",
    "Tresorerie",
    "CapitauxPropres",
    "ResultatNet",
]

TARGET = "ChiffreAffaires"

# Modèles évalués en LOO-CV (paramètres conservateurs : dataset très court n≈14)
MODELS = {
    "Ridge α=1": lambda: Ridge(alpha=1),
    "Ridge α=0.1": lambda: Ridge(alpha=0.1),
    "GradientBoosting": lambda: GradientBoostingRegressor(
        n_estimators=50, max_depth=2, learning_rate=0.15, random_state=42
    ),
    "RandomForest": lambda: RandomForestRegressor(
        n_estimators=100, max_depth=2, min_samples_leaf=2, random_state=42
    ),
}


def fetch_dataframe(conn, entreprise: str) -> pd.DataFrame:
    """Récupère le DataFrame agrégé pour une entreprise.

    Joint DimEntreprise (filtre par nom), DimTemps (année), DimBilan (bilan
    consolidé), DimResultat (compte de résultat). Une ligne = une année.
    """
    sql = """
        SELECT
          t."Annee"            AS annee,
          b."TotalActif"       AS "TotalActif",
          b."ActifsCourants"   AS "ActifsCourants",
          b."Stocks"           AS "Stocks",
          b."CreancesClients"  AS "CreancesClients",
          b."Tresorerie"       AS "Tresorerie",
          b."CapitauxPropres"  AS "CapitauxPropres",
          r."ResultatNet"      AS "ResultatNet",
          r."ChiffreAffaires"  AS "ChiffreAffaires"
        FROM "DimEntreprise" e
        JOIN "DimBilan"      b ON b."EntrepriseID" = e."EntrepriseID"
        JOIN "DimResultat"   r ON r."EntrepriseID" = e."EntrepriseID" AND r."AnneeID" = b."AnneeID"
        JOIN "DimTemps"      t ON t."AnneeID" = b."AnneeID"
        WHERE e."NomEntreprise" = %s
        ORDER BY t."Annee" ASC
    """
    with conn.cursor() as cur:
        cur.execute(sql, (entreprise,))
        cols = [d.name for d in cur.description]
        rows = cur.fetchall()
    return pd.DataFrame(rows, columns=cols)


def jsonable(v: Any) -> Any:
    """Coerce np/pd types into JSON-safe Python types."""
    if v is None:
        return None
    if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
        return None
    if hasattr(v, "item"):
        x = v.item()
        if isinstance(x, float) and (np.isnan(x) or np.isinf(x)):
            return None
        return x
    return v


def run_pipeline(df: pd.DataFrame, horizon: int, exclude_last_year: bool) -> dict:
    """Applique le pipeline ML complet, retourne un dict prêt à JSON-dumper."""

    # Exclusion optionnelle du dernier exercice — utile si l'année courante est
    # partielle (ex. 2025 saisi à 6 mois) et fausserait le polyfit + LOO.
    excluded_year = None
    if exclude_last_year and len(df) >= 2:
        excluded_year = int(df["annee"].max())
        df = df[df["annee"] != excluded_year].reset_index(drop=True)

    # Validation après exclusion
    if len(df) < 5:
        raise RuntimeError(
            f"Pas assez d'années pour entraîner (besoin ≥5, trouvé {len(df)})"
        )
    if df[TARGET].isna().all():
        raise RuntimeError(f"Aucune valeur de {TARGET} disponible")

    # Imputation médiane sur features et target manquants (rare grâce à l'ETL)
    for col in FEATURES + [TARGET]:
        if col in df.columns and df[col].isna().any():
            df[col] = df[col].fillna(df[col].median())

    # Feature engineering : Annee_norm
    yr_min = int(df["annee"].min())
    df["Annee_norm"] = df["annee"] - yr_min
    feat_final = FEATURES + ["Annee_norm"]

    X = df[feat_final].values.astype(float)
    y = df[TARGET].values.astype(float)

    scaler = StandardScaler()
    X_sc = scaler.fit_transform(X)

    # ─── LOO Cross-Validation sur 4 modèles ────────────────────────────────
    loo = LeaveOneOut()
    results = {}
    fitted_models = {}

    for name, factory in MODELS.items():
        y_loo = np.zeros(len(y))
        for train_idx, test_idx in loo.split(X_sc):
            m_tmp = factory()
            m_tmp.fit(X_sc[train_idx], y[train_idx])
            y_loo[test_idx] = m_tmp.predict(X_sc[test_idx])

        m_full = factory()
        m_full.fit(X_sc, y)
        y_pred = m_full.predict(X_sc)

        results[name] = {
            "name": name,
            "r2_cv": float(r2_score(y, y_loo)),
            "r2_train": float(r2_score(y, y_pred)),
            "mae": float(mean_absolute_error(y, y_pred)),
        }
        fitted_models[name] = m_full

    best_name = max(results, key=lambda k: results[k]["r2_cv"])
    best_model = fitted_models[best_name]

    # ─── Extrapolation des features pour les années futures ────────────────
    years_hist = df["annee"].values
    last_year = int(years_hist.max())
    future_years = [last_year + i + 1 for i in range(horizon)]

    future_feats = []
    for yr in future_years:
        row = []
        for feat in FEATURES:
            # polyfit linéaire sur (Annee_norm, valeur) puis évaluation à yr
            poly = np.polyfit(years_hist - yr_min, df[feat].values, 1)
            row.append(float(np.polyval(poly, yr - yr_min)))
        row.append(yr - yr_min)  # Annee_norm
        future_feats.append(row)

    X_fut = scaler.transform(np.array(future_feats))
    y_fut = best_model.predict(X_fut)

    # ─── Sortie ────────────────────────────────────────────────────────────
    return {
        "entreprise": str(df.attrs.get("entreprise", "")),
        "yearRange": {"min": int(years_hist.min()), "max": last_year},
        "excludedYear": excluded_year,
        "features": FEATURES,
        "target": TARGET,
        "historical": [
            {
                "annee": int(row["annee"]),
                "ca": jsonable(row[TARGET]),
                **{f: jsonable(row[f]) for f in FEATURES},
            }
            for _, row in df.iterrows()
        ],
        "predictions": [
            {
                "annee": int(yr),
                "caPredicted": float(p),
                "caLower": float(p * 0.92),
                "caUpper": float(p * 1.08),
            }
            for yr, p in zip(future_years, y_fut)
        ],
        "models": [results[n] for n in MODELS.keys()],
        "bestModel": best_name,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--entreprise", required=True)
    parser.add_argument("--horizon", type=int, default=5)
    parser.add_argument("--database-url", required=True)
    parser.add_argument(
        "--exclude-last-year",
        action="store_true",
        help="Drop le dernier exercice du training (utile si année partielle).",
    )
    args = parser.parse_args()

    if args.horizon < 1 or args.horizon > 10:
        json.dump({"error": "horizon doit être dans [1, 10]"}, sys.stderr)
        return 2

    # Prisma ajoute ?schema=public dans DATABASE_URL — psycopg2 ne le reconnaît
    # pas comme query param valide. On strip la querystring avant connexion.
    parsed = urlparse(args.database_url)
    cleaned_dsn = urlunparse(parsed._replace(query=""))

    try:
        conn = psycopg2.connect(cleaned_dsn)
    except Exception as exc:  # noqa: BLE001
        json.dump(
            {"error": f"Connexion Postgres échouée: {type(exc).__name__}: {exc}"},
            sys.stderr,
        )
        return 1

    try:
        df = fetch_dataframe(conn, args.entreprise)
        if df.empty:
            json.dump(
                {"error": f"Aucune donnée pour entreprise '{args.entreprise}'"},
                sys.stderr,
            )
            return 1

        df.attrs["entreprise"] = args.entreprise
        result = run_pipeline(df, args.horizon, args.exclude_last_year)
        json.dump(result, sys.stdout, default=str)
        return 0
    except Exception as exc:  # noqa: BLE001
        json.dump(
            {"error": f"{type(exc).__name__}: {exc}"},
            sys.stderr,
        )
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
