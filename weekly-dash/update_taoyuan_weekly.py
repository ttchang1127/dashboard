#!/usr/bin/env python3

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path


SPREADSHEET_ID = "1GjhgGAUuI5g6rtOGiUceMLgeGy12sp93fNQlWKM-UGc"
SHEET_TITLE = "工作表6"
SHEET_RANGE = "A1:F200"
OUTPUT_PATH = Path(__file__).resolve().parent / "taoyuan_weekly_data.json"


def fetch_values() -> dict:
    api_key = os.environ.get("GOOGLE_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is missing")

    encoded_range = urllib.parse.quote(f"{SHEET_TITLE}!{SHEET_RANGE}", safe="")
    url = (
        f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/"
        f"{encoded_range}?key={urllib.parse.quote(api_key, safe='')}"
    )

    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Google Sheets request failed: {detail}") from exc

    if "values" not in payload:
        raise RuntimeError(f"Google Sheets response missing values: {json.dumps(payload, ensure_ascii=False)}")

    return payload


def extract_week_label(raw: str) -> str:
    text = raw.strip().strip('"')
    match = re.search(r"(\d{2}/\d{2}～\d{2}/\d{2})", text)
    return match.group(1) if match else text


def build_output(payload: dict) -> dict:
    values = payload.get("values", [])
    header = values[0] if values else []
    groups = [(cell.split("\n")[0].strip() if cell else "") for cell in header[1:6]]
    groups = [group for group in groups if group]

    weeks = []
    for row in values[2:]:
        week_cell = row[0].strip() if row else ""
        group_cells = [row[i].strip() if len(row) > i else "" for i in range(1, 6)]
        if not week_cell or not any(group_cells):
            continue
        weeks.append(
            {
                "week": extract_week_label(week_cell),
                "groups": {group: group_cells[idx] if idx < len(group_cells) else "" for idx, group in enumerate(groups)},
            }
        )

    return {
        "source": {
            "spreadsheetId": SPREADSHEET_ID,
            "sheetTitle": SHEET_TITLE,
            "range": f"{SHEET_TITLE}!{SHEET_RANGE}",
        },
        "generatedAt": datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S %z"),
        "groups": groups,
        "weeks": weeks,
    }


def merge_with_existing(fresh_data: dict) -> dict:
    if not OUTPUT_PATH.exists():
        return fresh_data

    try:
        existing = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return fresh_data

    comparable_keys = ("source", "groups", "weeks")
    if all(existing.get(key) == fresh_data.get(key) for key in comparable_keys):
        fresh_data["generatedAt"] = existing.get("generatedAt", fresh_data["generatedAt"])

    return fresh_data


def main() -> None:
    payload = fetch_values()
    output = merge_with_existing(build_output(payload))
    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(str(OUTPUT_PATH))


if __name__ == "__main__":
    main()
