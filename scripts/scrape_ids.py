"""
Jikan scraper — fetches MAL IDs and merges into data/anime-ids.json.
Runs locally and as a GitHub Action (weekly cron).
"""
import json, time, datetime, os, requests
from pathlib import Path

BASE  = "https://api.jikan.moe/v4"
DELAY = 0.45
ROOT  = Path(__file__).parent.parent
OUT   = ROOT / "data" / "anime-ids.json"

ENDPOINTS = [
    ("/top/anime", {"page": 1, "limit": 25}),
    ("/top/anime", {"page": 2, "limit": 25}),
    ("/top/anime", {"page": 3, "limit": 25}),
    ("/top/anime", {"page": 4, "limit": 25}),
    ("/top/anime", {"page": 5, "limit": 25}),
    ("/top/anime", {"page": 6, "limit": 25}),
    ("/top/anime", {"filter": "airing",      "limit": 25}),
    ("/top/anime", {"filter": "upcoming",    "limit": 25}),
    ("/top/anime", {"filter": "bypopularity","limit": 25}),
    ("/top/anime", {"filter": "favorite",    "limit": 25}),
    ("/top/anime", {"type": "movie",  "page": 1, "limit": 25}),
    ("/top/anime", {"type": "movie",  "page": 2, "limit": 25}),
    ("/top/anime", {"type": "ova",    "page": 1, "limit": 25}),
    ("/top/anime", {"type": "ova",    "page": 2, "limit": 25}),
    ("/top/anime", {"type": "special","page": 1, "limit": 25}),
    ("/seasons/now",      {}),
    ("/seasons/upcoming", {}),
]


def fetch(ep, params):
    for attempt in range(3):
        try:
            r = requests.get(f"{BASE}{ep}", params=params, timeout=15)
            if r.status_code == 429:
                time.sleep(2 * (attempt + 1))
                continue
            r.raise_for_status()
            time.sleep(DELAY)
            return r.json().get("data", [])
        except Exception as e:
            print(f"  warn: {ep} {params} → {e}")
            time.sleep(1)
    return []


def main():
    print("⟐ Jikan ID scraper")

    # Load existing IDs
    existing = set()
    if OUT.exists():
        with open(OUT) as f:
            existing = set(json.load(f).get("ids", []))
    print(f"  existing: {len(existing)} IDs")

    new_ids = set()
    for ep, params in ENDPOINTS:
        items = fetch(ep, params)
        batch = {a["mal_id"] for a in items if a.get("mal_id")}
        new_ids |= batch
        added = len(batch - existing)
        print(f"  {ep} {list(params.values())[:1]} → {len(batch)} fetched, {added} new")

    all_ids = sorted(existing | new_ids)
    gained  = len(new_ids - existing)

    out = {
        "ids":     all_ids,
        "count":   len(all_ids),
        "updated": datetime.datetime.now(datetime.UTC).isoformat(),
        "source":  "Jikan API v4",
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(out, f)

    print(f"\n  ✓ {len(all_ids)} total IDs (+{gained} new) → {OUT}")


if __name__ == "__main__":
    main()
