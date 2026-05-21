# ⟐ AniStream

A fast, minimal anime streaming front-end that aggregates 60 confirmed-embeddable streaming sites into one clean interface.

**Live site → [ccguvycu.github.io/anistream-site](https://ccguvycu.github.io/anistream-site/)**

---

## Features

- **60 streaming sources** — all verified embeddable (no X-Frame-Options block)
- **AniList integration** — metadata, covers, ratings, and episode counts via the AniList GraphQL API
- **Watch page** — embedded player with Animetsu + AnimeLok sources, episode sidebar, source switcher
- **My List** — heart any anime card to save it to localStorage watchlist
- **Browse Free** — full-screen embed of any of the 60 sites via dropdown
- **Search** — live search with dropdown suggestions powered by AniList

## Pages

| Page | Description |
|---|---|
| `index.html` | Home — full-screen streaming site embed with 60-site picker |
| `anime.html` | Anime detail — AniList metadata, episode list, watchlist button |
| `watch.html` | Watch — embedded player with episode navigation |
| `search.html` | Search / genre / sort results grid |
| `watchlist.html` | My List — saved anime from localStorage |
| `browse.html` | Browse Free — full-screen site embed |

## Running locally

```bash
python -m http.server 8899
# open http://localhost:8899
```

No build step. Pure HTML, CSS, and vanilla JS.

## Sources

Sites are tested for iframe embeddability (no `X-Frame-Options` header). The full list is in `index.html` — 60 sites covering English sub/dub, Arabic, Italian, and Chinese (Donghua) audiences.
