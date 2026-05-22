# ⟐ AnimeWeb

A free, open anime discovery and streaming hub built with vanilla HTML/CSS/JS and the AniList GraphQL API.

**Live site → [ccguvycu.github.io](https://ccguvycu.github.io/)**

---

## Features

### Discovery
- **Rich home page** — auto-rotating hero banner, genre chip bar (15 genres), This Season, New Releases, Trending, Popular, and Top Rated rows
- **Featured series section** — Initial D complete series (all 9 entries in chronological order)
- **Movies page** — dedicated anime film browser with Popular / Top Rated / Trending / Recent filters and featured hero
- **Search** — live navbar search with instant dropdown, full results page, genre filtering, sort options
- **Anime detail pages** — YouTube trailer embed, character grid (12 chars), related anime, episode grid, synopsis, recommendations

### Watching
- **Browse Free** — 60 embeddable streaming sites in a full-screen iframe with a dropdown picker
- **Watch page** — embedded player (AnimeLok default, Animetsu fallback), auto-loads, episode sidebar, source switcher, fullscreen button
- **Movie deep links** — clicking a movie card takes you to Browse Free pre-searching that title on Animetsu

### Personal
- **My List** — heart any anime to save it, persisted in localStorage, no account needed
- **Watch progress** — episode progress tracked per anime in localStorage
- **Watchlist page** — full grid of saved anime with AniList metadata

### Technical
- **sessionStorage caching** — 5 minute TTL on all AniList queries, instant repeat visits
- **429 auto-retry** — 3 retries with backoff when AniList rate limits
- **Staggered loading** — hero + trending loads first, remaining rows fill in after
- **SVG favicon + navbar logo** — AW monogram, purple-to-pink gradient

---

## Pages

| File | Description |
|---|---|
| `index.html` | Home — hero, genre chips, 5 content rows, Initial D section |
| `anime.html` | Detail — trailer, characters, relations, episodes, synopsis |
| `watch.html` | Player — AnimeLok/Animetsu embed, episode sidebar, fullscreen |
| `movies.html` | Movies — featured hero, format:MOVIE grid, 4 sort tabs |
| `search.html` | Search / genre / sort results with load more |
| `watchlist.html` | My List — localStorage saved anime |
| `browse.html` | Browse Free — 60-site full-screen iframe, accepts `?q=` deep link |
| `about.html` | About — stats, feature list, credits |
| `app.js` | Shared utils — AniList gql(), card renderers, localStorage, URL helpers |
| `style.css` | Dark theme design system |
| `logo.svg` | AW monogram, purple gradient |

---

## Streaming Sources

60 sites confirmed embeddable (no `X-Frame-Options` response header), tested May 2026. Covers English sub/dub, Arabic, Italian, French, Spanish, Portuguese, and Chinese (Donghua) audiences.

Sources include: Animetsu, AnimeLok, aniwave, AllManga, AniHQ, AnimeRealms, Lunar, AniZone, AniKuro, AnimeParadise, Rive, AnimeHub, Anidap, AnimeOnsen, FireAnime, JustAnime, Enma, Senshi, yugen, 1anime, AniPlay, AnimeKhor, KayoAnime, AnimeSilo, AnimeNoSub, Kiroku, ReAnime, AniDoor, AnimeXin, LMAnime, CKSub, MyAnime, Anoboye, Yomi, KissAnime, WCOStream, AnimeDAO, AnimeFLV, GogoAnimes, AnimeRush, AnimeFreak, GenoAnime, AnimeOwl, Marin, AnimeFever, BestDubAnime, AnimeLatino, VostFree, aniwave.live, Animes.Vision, OtakuStream, GogoAnime, AnimeLand, KawaiiAnime, LuciferDonghua, AnimeStream, AnimeSaturn, and more.

---

## Running Locally

```bash
cd anime-site
python -m http.server 8899
# open http://localhost:8899
```

No build step. No dependencies. Pure HTML, CSS, and vanilla JS.

---

## Credits

- **Anime metadata** — [AniList GraphQL API](https://anilist.gitbook.io/anilist-apiv2-docs/) (no auth required)
- **Hosted on** — GitHub Pages
