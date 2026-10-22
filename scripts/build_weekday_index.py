#!/usr/bin/env python3
"""
Build src/sim/data/weekday_index.json from the UCI Online Retail II dataset
(plans/04 §1).

The dataset is a **gift-ware wholesaler**, not a grocery store, and it has **no
Saturday trading**. It is used only as a real-world *shape* of weekday ordering
behaviour, which src/sim/weekday.ts blends 50/50 with a documented grocery
prior. This script emits that shape; the app cites it (and labels the proxy
honestly, including the Saturday imputation).

Download the data once from the UCI Machine Learning Repository:
    https://archive.ics.uci.edu/dataset/502/online+retail+ii
(11 MB zipped / ~45 MB as both sheets; the zip contains online_retail_II.xlsx)

Usage:
    python scripts/build_weekday_index.py path/to/online_retail_ii.zip
    python scripts/build_weekday_index.py path/to/online_retail_II.xlsx

Requires pandas and openpyxl (`pip install pandas openpyxl`).
"""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
import zipfile
from datetime import date
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = REPO_ROOT / "src" / "sim" / "data" / "weekday_index.json"


def load_frames(path: Path) -> pd.DataFrame:
    """Read every sheet of the workbook (the zip holds one .xlsx)."""
    if path.suffix.lower() == ".zip":
        with tempfile.TemporaryDirectory() as tmp:
            with zipfile.ZipFile(path) as archive:
                xlsx = [name for name in archive.namelist() if name.lower().endswith(".xlsx")]
                if not xlsx:
                    sys.exit(f"No .xlsx found inside {path}")
                archive.extractall(tmp)
                sheets = pd.read_excel(Path(tmp) / xlsx[0], sheet_name=None)
    else:
        sheets = pd.read_excel(path, sheet_name=None)

    frames = [frame for frame in sheets.values() if not frame.empty]
    if not frames:
        sys.exit(f"No sheets with data in {path}")
    return pd.concat(frames, ignore_index=True)


def build_index(frame: pd.DataFrame) -> tuple[list[float], bool]:
    """Mean daily units per weekday, normalized so the week averages 1."""
    # Drop cancellations (invoice numbers beginning with "C") and non-sales rows.
    frame = frame[~frame["Invoice"].astype(str).str.startswith("C")]
    frame = frame[(frame["Quantity"] > 0) & (frame["Price"] > 0)]

    frame["date"] = pd.to_datetime(frame["InvoiceDate"]).dt.normalize()
    daily = frame.groupby("date")["Quantity"].sum()

    # Mean daily units per weekday, Monday = 0. Saturday is effectively empty:
    # there is no real Saturday trading in the source (only a handful of B2B
    # orders), so it is imputed from Friday and Sunday rather than trusted.
    dow = daily.groupby(daily.index.dayofweek).mean().reindex(range(7))

    saturday_missing = bool(pd.isna(dow[5]))
    weekday_mean = dow.mean()
    weak_saturday = (not saturday_missing) and dow[5] < 0.5 * weekday_mean
    saturday_imputed = saturday_missing or weak_saturday
    if saturday_imputed:
        dow[5] = dow[[4, 6]].mean()

    if dow.isna().any():
        missing = [day for day, value in dow.items() if pd.isna(value)]
        sys.exit(f"Could not compute a value for weekday(s) {missing}")

    index = (dow / dow.mean()).round(3).tolist()
    return index, saturday_imputed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="the Online Retail II .zip or .xlsx")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="output JSON path")
    args = parser.parse_args()

    if not args.input.exists():
        sys.exit(f"Input not found: {args.input}")

    frame = load_frames(args.input)
    index, saturday_imputed = build_index(frame)

    payload = {
        "source": "UCI Online Retail II (gift-ware wholesaler; B2B proxy)",
        "monToSun": index,
        "accessDate": date.today().isoformat(),
        "note": (
            "Saturday imputed from the mean of Friday and Sunday — the source "
            "trades only marginally on Saturdays (a few B2B orders), which is not "
            "representative of a grocery week. Blended 50/50 with the grocery "
            "prior in weekday.ts."
            if saturday_imputed
            else "No imputation needed."
        ),
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {args.out}")
    print("Mon..Sun:", index)


if __name__ == "__main__":
    main()
