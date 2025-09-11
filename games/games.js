// ====== Config ======
const SHEET_ID   = "1nb2Nnxq26adk9NxDF6k7HAjdW1yDffzKkm58bnJpeWc"; // 你的 Games DB 試算表 ID
const SHEET_NAME = "Games";                                        // 分頁名稱
const LOGIN_URL  = "https://jlmstw.github.io/JLMS-Chinois-de-la-vie-quotidienne/index.html";

const CACHE_KEY  = "jlms_games_db_v1";
const TTL_MS     = 24 * 60 * 60 * 1000; // 24h

// ====== Utils ======
const $ = (sel, root = document) => root.querySelector(sel);

function getGVizUrl(sheetId, sheetName) {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`;
  const params = new URLSearchParams({
    tqx: "out:json",
    sheet: sheetName,
    headers: "1",
  });
  return `${base}?${params}`;
}

function parseGVizResponse(text) {
  // gviz 會包一層 js 函式，需要剝殼
  const json = JSON.parse(text.replace(/^[\s\S]*setResponse\(/, "").replace(/\);\s*$/, ""));
  const table = json.table;
  const cols = table.cols.map(c => (c.label || c.id || "").toString().trim().toLowerCase());
  const rows = table.rows || [];

  const list = rows.map(r => {
    const obj = {};
    cols.forEach((name, idx) => {
      const cell = r.c[idx];
      let v = (cell && (cell.v ?? cell.f)) ?? "";
      if (typeof v === "string") v = v.trim();
      obj[name] = v;
    });
    return obj;
  });
  return list;
}

function splitTags(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String).map(s => s.trim()).filter(Boolean);
  // 去除 chip 可能殘留的括號/引號
  const cleaned = String(val).replace(/[\[\]"'“”‘’]/g, " ");
  return cleaned.split(/[,;|｜\s]+/g).map(s => s.trim()).filter(Boolean);
}

function toBool(v, def = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return !/^(false|0|no|n)$/i.test(v.trim());
  return def;
}

function toNumber(v, def = 9999) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function buildGameUrl(row) {
  const url = row.url && String(row.url).trim();
  const path = row.path && String(row.path).trim();
  const slug = row.slug && String(row.slug).trim();
  if (url)  return url;                 // 完整網址優先
  if (path) return path;                // 相對路徑
  if (slug) return `./${slug}/`;        // 備援：用 slug
  return "#";
}

function setCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

function getCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (!ts || !data) return null;
    if (Date.now() - ts > TTL_MS) return null;
    return data;
  } catch { return null; }
}

// ====== Render ======
function renderCards(rows) {
  const grid = $("#gamesGrid");
  grid.innerHTML = ""; // 清占位

  if (!rows.length) {
    grid.innerHTML = `<p style="color:#fff">No games available.</p>`;
    return;
  }

  // 篩選 & 排序
  const filtered = rows.filter(r => toBool(r.active, true) && toBool(r.enabled, true));
  filtered.sort((a, b) => toNumber(a.order) - toNumber(b.order));

  for (const r of filtered) {
    const icon  = (r.icon || "🎮");
    const title = r.title || r.slug || "Untitled";
    const desc  = r.description || "";
    const tags  = splitTags(r.tags);

    const gameUrl = buildGameUrl(r);
    const locked  = toBool(r.login_required, false);

    const a = document.createElement("a");
    a.className = "card";
    a.href = locked
      ? `${LOGIN_URL}?redirect=${encodeURIComponent(gameUrl)}`
      : gameUrl;

    if (!locked) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    } else {
      a.classList.add("locked");
      const lock = document.createElement("span");
      lock.className = "lock-badge";
      lock.textContent = "🔒";
      a.appendChild(lock);
    }

    const iconEl = document.createElement("div");
    iconEl.className = "icon";
    iconEl.textContent = icon;

    const titleEl = document.createElement("div");
    titleEl.className = "title";
    titleEl.textContent = title;

    const descEl = document.createElement("div");
    descEl.className = "desc";
    descEl.textContent = desc;

    const tagsWrap = document.createElement("div");
    tagsWrap.className = "tags";
    for (const t of tags) {
      const s = document.createElement("span");
      s.textContent = t;
      tagsWrap.appendChild(s);
    }

    a.appendChild(iconEl);
    a.appendChild(titleEl);
    a.appendChild(descEl);
    a.appendChild(tagsWrap);

    $("#gamesGrid").appendChild(a);
  }
}

// ====== Main ======
async function loadGames() {
  const q = new URLSearchParams(location.search);
  const noCache = q.get("nocache") === "1";

  if (!noCache) {
    const cached = getCache();
    if (cached) {
      renderCards(cached);
      // 背景更新（不阻塞畫面）
      tryFetchAndUpdateCache().catch(()=>{});
      return;
    }
  }
  await tryFetchAndUpdateCache(true);
}

async function tryFetchAndUpdateCache(renderImmediately = false) {
  const url = getGVizUrl(SHEET_ID, SHEET_NAME);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  const text = await res.text();
  const rows = parseGVizResponse(text);
  setCache(rows);
  if (renderImmediately) renderCards(rows);
}

loadGames().catch(err => {
  console.error(err);
  // 失敗備援：顯示靜態兩張卡
  const fallback = [
    {
      slug: "flash-cards",
      title: "Flash Cards",
      description: "See the prompt, guess, flip to check. Pinyin & timer.",
      icon: "🃏",
      url: "./flash-cards/",
      tags: "reading recall",
      order: 1,
      active: true,
      enabled: true,
      login_required: false
    },
    {
      slug: "memory-match",
      title: "Memory Match",
      description: "Flip cards to match hanzi with meaning/pinyin.",
      icon: "🧠",
      url: "./memory-match/",
      tags: "matching recognition",
      order: 2,
      active: true,
      enabled: true,
      login_required: false
    }
  ];
  renderCards(fallback);
});
