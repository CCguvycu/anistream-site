"""
Jikan scraper -- fetches MAL IDs and merges into data/anime-ids.json.
Runs locally and as a GitHub Action (weekly cron).
"""
import json, time, datetime, os, requests
from pathlib import Path

BASE  = "https://api.jikan.moe/v4"
DELAY = 0.5
ROOT  = Path(__file__).parent.parent
OUT   = ROOT / "data" / "anime-ids.json"

# Top-rated: pages 1-20 = up to 500 titles
TOP_PAGES = list(range(1, 21))

# Genres (Jikan genre IDs for anime)
GENRE_IDS = [
    1,   # Action
    2,   # Adventure
    4,   # Comedy
    7,   # Mystery
    8,   # Drama
    9,   # Ecchi
    10,  # Fantasy
    14,  # Horror
    18,  # Mecha
    19,  # Music
    22,  # Romance
    23,  # School
    24,  # Sci-Fi
    25,  # Shoujo
    27,  # Shounen
    29,  # Space
    36,  # Slice of Life
    37,  # Supernatural
    41,  # Suspense
]

# Past seasons (year, season) to pull from
PAST_SEASONS = [
    (2024, "winter"), (2024, "spring"), (2024, "summer"), (2024, "fall"),
    (2023, "winter"), (2023, "spring"), (2023, "summer"), (2023, "fall"),
    (2022, "winter"), (2022, "spring"), (2022, "summer"), (2022, "fall"),
    (2021, "winter"), (2021, "spring"), (2021, "summer"), (2021, "fall"),
    (2020, "winter"), (2020, "spring"), (2020, "summer"), (2020, "fall"),
]


def build_endpoints():
    eps = []

    # Top-rated (pages 1-20)
    for p in TOP_PAGES:
        eps.append(("/top/anime", {"page": p, "limit": 25}))

    # Top by filter
    for f in ("airing", "upcoming", "bypopularity", "favorite"):
        eps.append(("/top/anime", {"filter": f, "limit": 25}))

    # By type
    for t in ("movie", "ova", "special", "music"):
        for p in range(1, 5):
            eps.append(("/top/anime", {"type": t, "page": p, "limit": 25}))

    # Current + upcoming season
    eps.append(("/seasons/now", {}))
    eps.append(("/seasons/upcoming", {}))

    # Past seasons
    for year, season in PAST_SEASONS:
        eps.append((f"/seasons/{year}/{season}", {}))

    # By genre (page 1 each)
    for gid in GENRE_IDS:
        eps.append(("/anime", {"genres": gid, "order_by": "score", "sort": "desc", "limit": 25}))

    return eps


def fetch(ep, params):
    for attempt in range(3):
        try:
            r = requests.get(f"{BASE}{ep}", params=params, timeout=15)
            if r.status_code == 429:
                wait = 3 * (attempt + 1)
                print(f"    rate-limited, waiting {wait}s...")
                time.sleep(wait)
                continue
            r.raise_for_status()
            time.sleep(DELAY)
            data = r.json()
            # seasons endpoint returns list directly; anime endpoint wraps in data
            return data.get("data", [])
        except Exception as e:
            print(f"  warn: {ep} {params} -> {e}")
            time.sleep(1)
    return []


def main():
    print("Jikan ID scraper (expanded)")

    existing = set()
    if OUT.exists():
        with open(OUT) as f:
            existing = set(json.load(f).get("ids", []))
    print(f"  existing: {len(existing)} IDs")

    endpoints = build_endpoints()
    print(f"  endpoints: {len(endpoints)}")

    new_ids = set()
    for i, (ep, params) in enumerate(endpoints, 1):
        items = fetch(ep, params)
        batch = {a["mal_id"] for a in items if a.get("mal_id")}
        new_ids |= batch
        added = len(batch - existing - new_ids) + len(batch - existing)
        gained_so_far = len(new_ids - existing)
        label = list(params.values())[:2]
        print(f"  [{i:3d}/{len(endpoints)}] {ep} {label} -> {len(batch)} fetched | total new: {gained_so_far}")

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

    print(f"\n  Done: {len(all_ids)} total IDs (+{gained} new) -> {OUT}")


if __name__ == "__main__":
    main()
