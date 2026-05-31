#!/usr/bin/env python3
"""Pipeline série temporelle pour le cours de clôture d'une entreprise.

Reproduit la logique des 4 notebooks (EUROCYCLE, NBL, SAH, PLAST) :
  1. Lecture du CSV bourse journalier
  2. Filtre période 2015-2024 (par défaut)
  3. Test ADF de stationnarité sur série et série différenciée
  4. Décomposition STL multiplicative (période 252 jours)
  5. ARIMA(2,1,1) walk-forward one-step sur la période test (20% chronologique)
  6. SARIMA(1,1,0)(5,1,0,5) walk-forward, refit every-10 pour la performance
  7. Métriques RMSE / MAE / MAPE pour les deux modèles

Convention : le CSV doit être à data/bourse/[ENTREPRISE]_stock_bourse.xls
(relatif au cwd du backend). Le nom exact varie selon l'entreprise.

Usage : predict_timeseries.py --entreprise EUROCYCLE [--start 2015-01-01] [--end 2024-12-31]
Stdout : JSON {series, decomposition, stationarity, models, ...}
Stderr : JSON {error: "..."}
Exit : 0 succès, 1 runtime, 2 args
"""

import argparse
import json
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.stattools import adfuller

warnings.filterwarnings("ignore")

# Convention de nom de fichier — utilisateur place ses .xls ici.
DATA_DIR = Path("data/bourse")

# Map entreprise -> nom de fichier (suit le nommage des notebooks d'origine)
FILE_PATTERN = {
    "EUROCYCLE": "EUROCYCLES_stock bourse.xls",
    "NBL": "NBL_stock bourse.xls",
    "SAH": "SAH_stock bourse.xls",
    "PLAST": "PLAST_stock bourse.xls",
}

# Orders ARIMA/SARIMA hardcodés (convergent dans tous les notebooks)
ARIMA_ORDER = (2, 1, 1)
SARIMA_ORDER = (1, 1, 0)
SARIMA_SEASONAL_ORDER = (5, 1, 0, 5)
SARIMA_REFIT_EVERY = 10


def adf_test(series: pd.Series) -> dict:
    """Test ADF : statistique, p-value, stationnaire ou non."""
    series = series.dropna()
    if len(series) < 10:
        return {"adf": None, "pvalue": None, "isStationary": False, "n": int(len(series))}
    result = adfuller(series, autolag="AIC")
    return {
        "adf": float(result[0]),
        "pvalue": float(result[1]),
        "isStationary": bool(result[1] < 0.05),
        "n": int(len(series)),
    }


def load_data(entreprise: str, start: str, end: str, data_dir: Path) -> pd.DataFrame:
    """Lit le CSV bourse, indexe par Date, filtre la plage."""
    filename = FILE_PATTERN.get(entreprise)
    if filename is None:
        raise RuntimeError(
            f"Entreprise inconnue : {entreprise}. Valides : {list(FILE_PATTERN.keys())}"
        )
    path = data_dir / filename
    if not path.is_file():
        raise RuntimeError(
            f"Fichier introuvable : {path}. "
            f"Placez vos données bourse dans {data_dir}/ avec le nommage attendu."
        )

    # Les .xls référencés dans les notebooks sont en réalité du CSV malgré l'extension
    df = pd.read_csv(path, index_col=0, parse_dates=True)
    # Re-parse l'index avec le format jour/mois/année (commun à tous les exports)
    df.index = pd.to_datetime(df.index, format="%d/%m/%Y", errors="coerce")
    # Drop les lignes où l'index n'a pas pu être parsé (NaT) — sans utiliser
    # subset=[index.name] qui crash car l'index n'est pas une colonne.
    df = df[df.index.notna()]
    df = df.sort_index()
    df = df[(df.index >= start) & (df.index <= end)]

    if "Cloture" not in df.columns:
        raise RuntimeError(
            f"Colonne 'Cloture' absente. Colonnes trouvées : {list(df.columns)}"
        )

    # Normalisation des colonnes numériques : certains fichiers (PLAST) utilisent
    # la virgule comme séparateur décimal et l'espace comme séparateur de
    # milliers. Sans cette étape, Cloture reste typée 'object' (str) et les
    # opérations arithmétiques (.diff(), ADF, ARIMA…) crashent avec
    # TypeError: unsupported operand type(s) for -: 'str' and 'str'.
    if df["Cloture"].dtype == "object":
        df["Cloture"] = (
            df["Cloture"]
            .astype(str)
            .str.replace("\xa0", "", regex=False)  # espace insécable
            .str.replace(" ", "", regex=False)     # espace séparateur de milliers
            .str.replace(",", ".", regex=False)    # virgule décimale → point
        )
    df["Cloture"] = pd.to_numeric(df["Cloture"], errors="coerce")

    return df


def downsample_for_chart(series: pd.Series, max_points: int = 500) -> pd.Series:
    """Réduit le nombre de points pour le chart (frontend) sans perdre la forme.
    Pour ~2500 points journaliers, downsample à ~500 (week-ish granularity)."""
    if len(series) <= max_points:
        return series
    step = max(1, len(series) // max_points)
    return series.iloc[::step]


def arima_forecast(train: pd.Series, test: pd.Series) -> pd.Series:
    """Fit ARIMA sur train, forecast tout l'horizon test en une fois.

    Différence avec les notebooks (walk-forward refit-each-step) : on ne re-fit
    pas à chaque pas. Trade-off : moins précis sur les long horizons (le modèle
    ne voit pas les nouvelles observations test au fil de l'eau), mais ~50x
    plus rapide. Adapté à un dashboard interactif < 30s de wait.
    """
    model = ARIMA(train.values, order=ARIMA_ORDER).fit()
    preds = model.forecast(steps=len(test))
    return pd.Series(preds, index=test.index)


def sarima_forecast(train: pd.Series, test: pd.Series) -> pd.Series:
    """Fit SARIMA une fois, forecast batch (cf. arima_forecast)."""
    model = SARIMAX(
        train.values,
        order=SARIMA_ORDER,
        seasonal_order=SARIMA_SEASONAL_ORDER,
    ).fit(disp=False, method="powell", maxiter=50)
    preds = model.forecast(steps=len(test))
    return pd.Series(preds, index=test.index)


def compute_metrics(actual: pd.Series, predicted: pd.Series) -> dict:
    rmse = float(np.sqrt(mean_squared_error(actual, predicted)))
    mae = float(mean_absolute_error(actual, predicted))
    # MAPE : éviter division par zéro
    mask = actual != 0
    mape = (
        float(np.mean(np.abs((actual[mask].values - predicted[mask].values) / actual[mask].values)) * 100)
        if mask.any()
        else None
    )
    return {"rmse": rmse, "mae": mae, "mape": mape}


def serialize_series(series: pd.Series) -> list:
    """Liste de {date, value} JSON-safe, NaN → null."""
    out = []
    for ts, val in series.items():
        v = None if pd.isna(val) else float(val)
        out.append({"date": ts.strftime("%Y-%m-%d"), "value": v})
    return out


def run_pipeline(entreprise: str, start: str, end: str, max_chart_points: int, data_dir: Path) -> dict:
    df = load_data(entreprise, start, end, data_dir)
    close = df["Cloture"].dropna()

    if len(close) < 100:
        raise RuntimeError(
            f"Pas assez de points pour entraîner ({len(close)} < 100). Élargissez la plage."
        )

    # ─── Stationnarité ────────────────────────────────────────────────────
    adf_original = adf_test(close)
    diff = close.diff().dropna()
    adf_diff = adf_test(diff)

    # ─── Décomposition STL ────────────────────────────────────────────────
    # period=252 = ~1 an de jours boursiers ; nécessite au moins 2 périodes
    decomp = None
    if len(close) >= 504:
        decomp_obj = seasonal_decompose(close, model="multiplicative", period=252)
        decomp = {
            "trend": serialize_series(downsample_for_chart(decomp_obj.trend.dropna(), max_chart_points)),
            "seasonal": serialize_series(downsample_for_chart(decomp_obj.seasonal.dropna(), max_chart_points)),
            "residual": serialize_series(downsample_for_chart(decomp_obj.resid.dropna(), max_chart_points)),
        }

    # ─── Split 80/20 chronologique ───────────────────────────────────────
    size = int(len(close) * 0.8)
    train = close.iloc[:size]
    test = close.iloc[size:]

    # ─── ARIMA batch forecast ────────────────────────────────────────────
    arima_pred = arima_forecast(train, test)
    arima_metrics = compute_metrics(test, arima_pred)

    # ─── SARIMA batch forecast ───────────────────────────────────────────
    sarima_pred = sarima_forecast(train, test)
    sarima_metrics = compute_metrics(test, sarima_pred)

    best_model = "ARIMA" if arima_metrics["rmse"] <= sarima_metrics["rmse"] else "SARIMA"

    return {
        "entreprise": entreprise,
        "dataSource": str(data_dir / FILE_PATTERN[entreprise]),
        "dateRange": {
            "start": str(close.index.min().date()),
            "end": str(close.index.max().date()),
            "nObservations": int(len(close)),
        },
        "split": {
            "trainEnd": str(train.index.max().date()),
            "testStart": str(test.index.min().date()),
            "trainSize": int(len(train)),
            "testSize": int(len(test)),
        },
        "stationarity": {
            "original": adf_original,
            "differenced": adf_diff,
        },
        "decomposition": decomp,
        "train": serialize_series(downsample_for_chart(train, max_chart_points)),
        "test": serialize_series(downsample_for_chart(test, max_chart_points)),
        "arimaPredictions": serialize_series(downsample_for_chart(arima_pred, max_chart_points)),
        "sarimaPredictions": serialize_series(downsample_for_chart(sarima_pred, max_chart_points)),
        "models": [
            {
                "name": f"ARIMA{ARIMA_ORDER}",
                "rmse": arima_metrics["rmse"],
                "mae": arima_metrics["mae"],
                "mape": arima_metrics["mape"],
            },
            {
                "name": f"SARIMA{SARIMA_ORDER}{SARIMA_SEASONAL_ORDER}",
                "rmse": sarima_metrics["rmse"],
                "mae": sarima_metrics["mae"],
                "mape": sarima_metrics["mape"],
            },
        ],
        "bestModel": best_model,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--entreprise", required=True, choices=list(FILE_PATTERN.keys()))
    parser.add_argument("--start", default="2015-01-01")
    parser.add_argument("--end", default="2024-12-31")
    parser.add_argument("--max-chart-points", type=int, default=500)
    parser.add_argument(
        "--data-dir",
        default="../data/bourse",
        help="Dossier des CSV bourse (relatif au cwd du backend)",
    )
    args = parser.parse_args()

    try:
        result = run_pipeline(
            args.entreprise, args.start, args.end, args.max_chart_points, Path(args.data_dir),
        )
        json.dump(result, sys.stdout, default=str)
        return 0
    except RuntimeError as exc:
        json.dump({"error": str(exc)}, sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001
        json.dump({"error": f"{type(exc).__name__}: {exc}"}, sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
