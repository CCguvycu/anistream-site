"""
Sync data/anime-ids.json from AnimeDb (source of truth).
Replaces the old Jikan scraper — AnimeDb already runs Jikan daily.
No API keys needed: AnimeDb's catalog is publicly hosted via GitHub Pages.
"""
import json, datetime, sys
from pathlib import Path

try:
    import requests
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

ANIMEDB_URL = "https://ccguvycu.github.io/animedb-site/api/anime-ids.json"
OUT         = Path(__file__).parent.parent / "data" / "anime-ids.json"

def main():
    print("AnimeWeb sync — fetching catalog from AnimeDb")

    # Fetch from AnimeDb
    res = requests.get(ANIMEDB_URL, timeout=30)
    res.raise_for_status()
    src = res.json()
    src_ids = src.get("ids", [])
    print(f"  AnimeDb catalog: {len(src_ids):,} IDs (updated {src.get('updated','?')})")

    # Load existing local ids
    existing_ids = []
    if OUT.exists():
        try:
            existing_ids = json.loads(OUT.read_text(encoding="utf-8")).get("ids", [])
        except Exception:
            pass
    print(f"  Current AnimeWeb: {len(existing_ids):,} IDs")

    # Merge (keeps any locally-added IDs too)
    merged = sorted(set(existing_ids) | set(src_ids))
    added  = len(merged) - len(existing_ids)

    if added == 0:
        print("  Already up to date — nothing to write")
        return

    out = {
        "ids":     merged,
        "count":   len(merged),
        "updated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "source":  "animedb-sync",
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"  Done: {len(merged):,} total IDs (+{added} new) → data/anime-ids.json")

if __name__ == "__main__":
    main()
