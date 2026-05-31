#!/usr/bin/env python3
"""Extrait toutes les tables, lignes et relations d'un .pbix via pbixray.

Invoqué par le backend Node.js (services/pbix-extractor.service.ts) lors de
l'upload admin. Communication par stdin/stdout/stderr :

Usage : python extract_pbix.py <path-to-pbix>
Stdout : JSON {tables: {name: {columns, rowCount, rows}}, relationships}
Stderr : JSON {error: "..."} si exception
Exit   : 0 si succès, 1 si erreur de parsing, 2 si erreur d'argument

Stratégie de robustesse :
 - Une exception lors de la lecture d'UNE table n'aborte pas tout le script.
   La table est juste marquée avec un champ "error" et on continue.
 - Les NaN/NaT/Inf de pandas sont convertis en null JSON pour éviter
   d'émettre du JSON invalide (JS ne sait pas parser "NaN").
"""

import json
import math
import sys
from pathlib import Path

from pbixray import PBIXRay


def to_jsonable(value):
    """Convertit une valeur pandas/numpy en type JSON-sérialisable."""
    if value is None:
        return None
    if isinstance(value, float):
        return None if math.isnan(value) or math.isinf(value) else value
    if hasattr(value, "item"):  # numpy scalar
        try:
            v = value.item()
        except (ValueError, TypeError):
            return str(value)
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            return None
        return v
    if hasattr(value, "isoformat"):  # datetime / pandas Timestamp
        return value.isoformat()
    return value


def main() -> int:
    if len(sys.argv) != 2:
        json.dump({"error": "Usage: extract_pbix.py <path-to-pbix>"}, sys.stderr)
        return 2

    pbix_path = Path(sys.argv[1])
    if not pbix_path.is_file():
        json.dump({"error": f"File not found: {pbix_path}"}, sys.stderr)
        return 2

    try:
        pbix = PBIXRay(str(pbix_path))
    except Exception as exc:  # noqa: BLE001 - on veut tout attraper pour reporter
        json.dump({"error": f"Failed to open .pbix: {type(exc).__name__}: {exc}"}, sys.stderr)
        return 1

    output = {"tables": {}, "relationships": []}

    for table_name in pbix.tables:
        try:
            df = pbix.get_table(table_name)
            columns = list(df.columns)
            rows = [
                {col: to_jsonable(row[col]) for col in columns}
                for _, row in df.iterrows()
            ]
            output["tables"][table_name] = {
                "columns": columns,
                "rowCount": len(rows),
                "rows": rows,
            }
        except Exception as exc:  # noqa: BLE001
            output["tables"][table_name] = {
                "error": f"{type(exc).__name__}: {exc}",
            }

    try:
        rels = pbix.relationships
        if rels is not None and len(rels) > 0:
            for _, r in rels.iterrows():
                output["relationships"].append(
                    {
                        "fromTable": r.get("FromTableName"),
                        "fromColumn": r.get("FromColumnName"),
                        "toTable": r.get("ToTableName"),
                        "toColumn": r.get("ToColumnName"),
                    }
                )
    except Exception:  # noqa: BLE001 - les relations sont best-effort
        pass

    json.dump(output, sys.stdout, ensure_ascii=False, default=str)
    return 0


if __name__ == "__main__":
    sys.exit(main())
