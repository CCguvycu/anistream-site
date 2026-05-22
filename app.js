// ═══════════════════════════════════════════════
//  AniStream — Shared Utils + AniList API Layer
// ═══════════════════════════════════════════════

const ANILIST = 'https://graphql.anilist.co';

// Core GraphQL fetcher with retry on 429
async function gql(query, vars = {}, _retry = 0) {
  const r = await fetch(ANILIST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: vars })
  });
  if (r.status === 429 && _retry < 3) {
    await new Promise(res => setTimeout(res, 1500 * (_retry + 1)));
    return gql(query, vars, _retry + 1);
  }
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0].message);
  return j.data;
}

// Shared media fields used in all queries
const MF = `
  id
  title { romaji english native }
  coverImage { extraLarge large color }
  bannerImage
  episodes
  status
  averageScore
  popularity
  genres
  season
  seasonYear
  format
  description(asHtml: false)
`;

// Query library
const Q = {
  trending:    `{ Page(page:1,perPage:20){ media(type:ANIME,sort:TRENDING_DESC,status:RELEASING){ ${MF} } } }`,
  popular:     `{ Page(page:1,perPage:20){ media(type:ANIME,sort:POPULARITY_DESC){ ${MF} } } }`,
  topRated:    `{ Page(page:1,perPage:20){ media(type:ANIME,sort:SCORE_DESC,averageScore_greater:72){ ${MF} } } }`,
  newReleases: `{ Page(page:1,perPage:20){ media(type:ANIME,sort:START_DATE_DESC,status:RELEASING){ ${MF} } } }`,

  seasonal: `query($season:MediaSeason,$year:Int){
    Page(page:1,perPage:20){
      media(type:ANIME,season:$season,seasonYear:$year,sort:POPULARITY_DESC,status_not:NOT_YET_RELEASED){ ${MF} }
    }
  }`,

  search: `query($s:String,$p:Int){
    Page(page:$p,perPage:24){
      pageInfo{ hasNextPage currentPage total }
      media(type:ANIME,search:$s,sort:SEARCH_MATCH){ ${MF} }
    }
  }`,

  genre: `query($g:String,$p:Int){
    Page(page:$p,perPage:24){
      pageInfo{ hasNextPage }
      media(type:ANIME,genre_in:[$g],sort:POPULARITY_DESC){ ${MF} }
    }
  }`,

  browse: `query($sort:[MediaSort],$p:Int){
    Page(page:$p,perPage:24){
      pageInfo{ hasNextPage }
      media(type:ANIME,sort:$sort){ ${MF} }
    }
  }`,

  byMalIds: `query($ids:[Int],$page:Int){
    Page(page:$page,perPage:50){
      pageInfo{ hasNextPage currentPage total }
      media(type:ANIME,idMal_in:$ids,sort:SCORE_DESC){ ${MF} }
    }
  }`,

  detail: `query($id:Int){
    Media(id:$id,type:ANIME){
      ${MF}
      trailer { id site thumbnail }
      studios(isMain:true){ nodes{ name } }
      nextAiringEpisode{ episode airingAt }
      characters(perPage:12,sort:ROLE){
        nodes{ id name{ full } image{ large } }
      }
      relations{
        edges{
          relationType
          node{ id title{ romaji } coverImage{ large } type format }
        }
      }
      recommendations(perPage:8){
        nodes{ mediaRecommendation{ id title{ romaji } coverImage{ large } } }
      }
    }
  }`,
};

// Current season helper
function currentSeason() {
  const m = new Date().getMonth() + 1;
  if (m <= 3) return 'WINTER';
  if (m <= 6) return 'SPRING';
  if (m <= 9) return 'SUMMER';
  return 'FALL';
}

// ─── LocalStorage helpers ─────────────────────
const S = {
  _get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  _set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),

  history() { return this._get('as_history') || []; },
  pushHistory(anime, ep) {
    let h = this.history().filter(x => x.id !== anime.id);
    h.unshift({
      id: anime.id, ep,
      title: anime.title.english || anime.title.romaji,
      img: anime.coverImage?.large,
      ts: Date.now()
    });
    this._set('as_history', h.slice(0, 30));
  },

  watchlist()        { return this._get('as_wl') || []; },
  inWatchlist(id)    { return this.watchlist().some(x => x.id === id); },
  addToWatchlist(a)  {
    const wl = this.watchlist().filter(x => x.id !== a.id);
    wl.unshift({ id: a.id, title: a.title.english || a.title.romaji, img: a.coverImage?.large, genres: a.genres, score: a.averageScore, ts: Date.now() });
    this._set('as_wl', wl);
  },
  removeFromWatchlist(id) { this._set('as_wl', this.watchlist().filter(x => x.id !== id)); },
  toggleWatchlist(a) { this.inWatchlist(a.id) ? this.removeFromWatchlist(a.id) : this.addToWatchlist(a); },

  progress(id) { return this._get(`as_p${id}`) || { eps: [], last: null }; },
  saveProgress(id, ep) {
    const p = this.progress(id);
    p.last = ep;
    if (!p.eps.includes(ep)) p.eps.push(ep);
    this._set(`as_p${id}`, p);
  },
  watched(id, ep) { return this.progress(id).eps.includes(ep); },
};

// ─── URL param helpers ────────────────────────
const P = {
  get: n => new URLSearchParams(location.search).get(n),
  go(page, params) {
    const u = new URL(page, location.origin);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    location.href = u.toString();
  }
};

// ─── DOM shortcuts ────────────────────────────
const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
const mk = (tag, cls = '', html = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

// ─── Formatters ───────────────────────────────
const fmt = {
  status: s => ({ RELEASING:'Airing', FINISHED:'Finished', NOT_YET_RELEASED:'Upcoming', CANCELLED:'Cancelled', HIATUS:'On Hiatus' }[s] || s || '—'),
  season: (s, y) => s ? `${s[0]}${s.slice(1).toLowerCase()} ${y||''}`.trim() : (y || '—'),
  score:  s => s ? (s / 10).toFixed(1) : null,
  plain:  h => h ? h.replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'').trim() : '',
};

// ─── Anime card renderer ──────────────────────
function card(a, extraCls = '') {
  const title = a.title.english || a.title.romaji;
  const img   = a.coverImage?.extraLarge || a.coverImage?.large || '';
  const score = a.averageScore ? `<span class="acard-score">★ ${fmt.score(a.averageScore)}</span>` : '';
  const eps   = a.episodes ? `<span>${a.episodes}ep</span>` : '';
  const sep   = score && eps ? ' · ' : '';

  const saved = S.inWatchlist(a.id);
  const prog  = S.progress(a.id);
  const pct   = (a.episodes && prog.eps?.length) ? Math.round((prog.eps.length / a.episodes) * 100) : 0;
  const progBar = pct > 0
    ? `<div class="acard-prog"><div class="acard-prog-fill" style="width:${pct}%"></div></div>`
    : '';

  const c = mk('div', `acard ${extraCls}`);
  c.innerHTML = `
    <img src="${img}" alt="" loading="lazy">
    ${progBar}
    <div class="acard-info">
      <div class="acard-title">${title}</div>
      <div class="acard-meta">${score}${sep}${eps}</div>
    </div>
    <div class="acard-play">▶</div>
    <button class="acard-heart${saved ? ' saved' : ''}" title="${saved ? 'Remove from list' : 'Add to list'}">♥</button>`;

  c.querySelector('img').onerror = function () {
    this.parentElement.style.background = 'var(--card-hover)';
    this.style.display = 'none';
  };
  c.querySelector('.acard-heart').addEventListener('click', e => {
    e.stopPropagation();
    S.toggleWatchlist(a);
    const btn = e.currentTarget;
    const nowSaved = S.inWatchlist(a.id);
    btn.classList.toggle('saved', nowSaved);
    btn.title = nowSaved ? 'Remove from list' : 'Add to list';
    toast(nowSaved ? `Added to My List` : `Removed from My List`);
  });
  c.addEventListener('click', () => P.go('anime.html', { id: a.id }));
  return c;
}

// ─── Skeleton placeholders ────────────────────
function skels(el, n = 10) {
  el.innerHTML = Array(n).fill('<div class="acard skel" style="aspect-ratio:3/4"></div>').join('');
}

// ─── Toast notification ───────────────────────
function toast(msg, ms = 3000) {
  const t = mk('div', 'toast', msg);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

// ─── Navbar live search ───────────────────────
function initSearch() {
  const inp = $('#navSearch');
  const drop = $('#searchDrop');
  if (!inp || !drop) return;

  let debounce;
  inp.addEventListener('input', () => {
    clearTimeout(debounce);
    const q = inp.value.trim();
    if (q.length < 2) { drop.classList.remove('open'); return; }

    debounce = setTimeout(async () => {
      try {
        const d = await gql(Q.search, { s: q, p: 1 });
        const items = d.Page.media.slice(0, 6);
        if (!items.length) {
          drop.innerHTML = '<div style="padding:1rem;color:var(--dim);font-size:0.82rem">No results</div>';
        } else {
          drop.innerHTML = items.map(a => {
            const t = a.title.english || a.title.romaji;
            return `<div class="sdrop-item" data-id="${a.id}">
              <img src="${a.coverImage?.large||''}" alt="" loading="lazy" onerror="this.style.display='none'">
              <div>
                <div class="sdrop-title">${t}</div>
                <div class="sdrop-meta">${fmt.status(a.status)} · ${a.episodes||'?'} ep</div>
              </div>
            </div>`;
          }).join('');
          $$('.sdrop-item', drop).forEach(el => {
            el.addEventListener('click', () => P.go('anime.html', { id: el.dataset.id }));
          });
        }
        drop.classList.add('open');
      } catch (e) { console.error('[search]', e); }
    }, 280);
  });

  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && inp.value.trim()) {
      drop.classList.remove('open');
      P.go('search.html', { q: inp.value.trim() });
    }
    if (e.key === 'Escape') { drop.classList.remove('open'); }
  });

  document.addEventListener('click', e => {
    if (!inp.contains(e.target) && !drop.contains(e.target)) drop.classList.remove('open');
  });
}

document.addEventListener('DOMContentLoaded', initSearch);

// ─── Episode tracking (notifications) ────────
Object.assign(S, {
  tracking()       { return this._get('as_track') || []; },
  inTracking(id)   { return this.tracking().some(t => t.id === id); },
  track(a) {
    const list = this.tracking().filter(t => t.id !== a.id);
    list.push({ id: a.id, title: a.title?.english || a.title?.romaji || 'Anime', lastNotif: 0 });
    this._set('as_track', list);
  },
  untrack(id)      { this._set('as_track', this.tracking().filter(t => t.id !== id)); },
  toggleTrack(a)   { this.inTracking(a.id) ? this.untrack(a.id) : this.track(a); },
  setLastNotif(id) {
    const list = this.tracking().map(t => t.id === id ? { ...t, lastNotif: Date.now() } : t);
    this._set('as_track', list);
  },
});

// ─── Service Worker registration ──────────────
async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const scope = location.pathname.includes('/anistream-site/') ? '/anistream-site/' : '/';
    const reg = await navigator.serviceWorker.register(
      location.pathname.includes('/anistream-site/') ? '/anistream-site/sw.js' : '/sw.js',
      { scope }
    );
    return reg;
  } catch (e) {
    console.warn('[SW] registration failed:', e);
    return null;
  }
}

// ─── Notification helpers ─────────────────────
async function requestNotifPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function sendNotif(title, body, url = '') {
  const tag = 'animeweb-' + Date.now();
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'NOTIFY', title, body, tag, url });
  } else if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/anistream-site/logo.svg' });
  }
}

async function checkTrackedEpisodes() {
  const tracked = S.tracking();
  if (!tracked.length) return;

  const idList = tracked.map(t => t.id);
  const query = `query {
    ${idList.map((id, i) => `a${i}: Media(id:${id},type:ANIME){ id nextAiringEpisode{ episode airingAt } }`).join('\n')}
  }`;

  try {
    const data = await gql(query);
    tracked.forEach((t, i) => {
      const media = data[`a${i}`];
      if (!media?.nextAiringEpisode) return;
      const epNum  = media.nextAiringEpisode.episode;
      const airsMs = media.nextAiringEpisode.airingAt * 1000;
      // Notify if episode aired after last notification
      if (Date.now() >= airsMs && airsMs > t.lastNotif) {
        sendNotif(
          `${t.title} — Episode ${epNum} is out!`,
          'New episode available on streaming sites.',
          `anime.html?id=${t.id}`
        );
        S.setLastNotif(t.id);
      }
    });
  } catch (e) {
    console.warn('[notif] check failed:', e);
  }
}

// ─── Nyaa.si torrent search ───────────────────
async function fetchNyaa(title) {
  const q     = encodeURIComponent(title);
  const nyaa  = `https://nyaa.si/?page=rss&q=${q}&c=1_2&f=0`;
  const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(nyaa)}`;
  const r     = await fetch(proxy, { cache: 'no-cache' });
  const j     = await r.json();
  const xml   = new DOMParser().parseFromString(j.contents, 'text/xml');
  return [...xml.querySelectorAll('item')].slice(0, 20).map(item => ({
    title:   item.querySelector('title')?.textContent   || '',
    magnet:  item.querySelector('torrent\\:magnetUri, magnetUri')?.textContent || '',
    link:    item.querySelector('link')?.textContent    || '',
    seeders: item.querySelector('nyaa\\:seeders, seeders')?.textContent       || '?',
    leechers:item.querySelector('nyaa\\:leechers, leechers')?.textContent     || '?',
    size:    item.querySelector('nyaa\\:size, size')?.textContent             || '',
    date:    item.querySelector('pubDate')?.textContent || '',
  }));
}

// ─── Progress bar CSS injection ───────────────
(function injectProgressCSS() {
  const s = document.createElement('style');
  s.textContent = `
    .acard-prog { position:absolute; bottom:0; left:0; right:0; height:3px; background:rgba(0,0,0,.4); }
    .acard-prog-fill { height:100%; background:var(--purple); border-radius:0 2px 2px 0; transition:width .3s; }
  `;
  document.head.appendChild(s);
})();
