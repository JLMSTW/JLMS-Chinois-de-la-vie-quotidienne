// ====== Config ======
const SHEET_ID   = "1nb2Nnxq26adk9NxDF6k7HAjdW1yDffzKkm58bnJpeWc"; // Games DB 試算表 ID
const SHEET_NAME = "Games";                                        // 分頁名稱
const LOGIN_URL  = "../index.html";                                // 登入頁（相對）
const HOME_URL   = "../home.html";                                 // 已登入首頁（相對）

// ====== Utils ======
const $ = (sel, root = document) => root.querySelector(sel);

function splitTags(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String).map(s => s.trim()).filter(Boolean);
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
  const url  = row.url  && String(row.url).trim();
  const path = row.path && String(row.path).trim();
  const slug = row.slug && String(row.slug).trim();
  if (url)  return url;           // 完整網址優先
  if (path) return path;          // 相對路徑
  if (slug) return `./${slug}/`;  // 備援：用 slug
  return "#";
}

// ====== Back 行為（已登入 vs guest） ======
function setBackHomeLink() {
  const a = $("#backHome");
  if (!a) return;

  const params = new URLSearchParams(location.search);
  const isGuest = params.get("guest") === "1" || params.get("from") === "guest";

  const ref = document.referrer || "";
  const fromSameSite = ref.startsWith(location.origin);
  const cameFromHome = /\/home\.html(\?|#|$)/.test(ref);

  if (fromSameSite && cameFromHome) {
    // 從已登入首頁來 → 回上一頁
    a.href = ref;
  } else if (isGuest) {
    // 未登入（Play without login）→ 回登入頁
    a.href = LOGIN_URL;
  } else {
    // 其他情況 → 回已登入首頁
    a.href = HOME_URL;
  }
}

// ====== 用 JSONP 讀 Google Sheet（避開 CORS） ======
function fetchGamesJSONP() {
  return new Promise((resolve, reject) => {
    const cbName = "__gvizHook_" + Math.random().toString(36).slice(2);
    window[cbName] = (obj) => {
      try {
        const table = obj?.table;
        const cols = (table?.cols || []).map(c => (c.label || c.id || "").toString().trim().toLowerCase());
        const rows = table?.rows || [];
        const list = rows.map(r => {
          const o = {};
          cols.forEach((name, idx) => {
            const cell = r.c[idx];
            let v = (cell && (cell.v ?? cell.f)) ?? "";
            if (typeof v === "string") v = v.trim();
            o[name] = v;
          });
          return o;
        });
        resolve(list);
      } catch (e) {
        reject(e);
      } finally {
        cleanup();
      }
    };

    const qs = new URLSearchParams({
      tqx: `out:json;responseHandler:${cbName}`,
      sheet: SHEET_NAME,
      headers: "1",
    });
    const src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${qs}`;

    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onerror = () => { cleanup(); reject(new Error("JSONP load error")); };
    document.head.appendChild(s);

    function cleanup() {
      try { delete window[cbName]; } catch {}
      try { s.remove(); } catch {}
    }
  });
}

// ====== Render ======
function renderCards(rows) {
  const grid = $("#gamesGrid");
  grid.innerHTML = ""; // 清占位

  if (!rows.length) {
    grid.innerHTML = `<div class="error-box">No games available.</div>`;
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

    if (locked) {
      // 要登入 → 導去登入頁並帶 redirect
      const u = new URL(LOGIN_URL, location.href);
      u.searchParams.set("redirect", gameUrl);
      a.href = u.toString();
      a.classList.add("locked");
      const lock = document.createElement("span");
      lock.className = "lock-badge";
      lock.textContent = "🔒";
      a.appendChild(lock);
    } else {
      // 不需登入 → 直接新分頁開啟
      a.href = gameUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
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

    grid.appendChild(a);
  }
}

function showError(msg) {
  const grid = $("#gamesGrid");
  grid.innerHTML = `<div class="error-box">${msg}</div>`;
}

// ====== Init ======
async function init() {
  setBackHomeLink();
  try {
    const rows = await fetchGamesJSONP();   // 直接 JSONP（不做 localStorage 快取）
    renderCards(rows);
  } catch (e) {
    console.error(e);
    showError("Failed to load games. Please refresh or try again later.");
    // 備援：需要可開啟，取消下列註解
    // renderCards([
    //   { slug:"flash-cards", title:"Flash Cards", description:"See the prompt, guess, flip to check. Pinyin & timer.", icon:"🃏", url:"./flash-cards/", tags:"reading recall", order:1, active:true, enabled:true, login_required:false },
    //   { slug:"memory-match", title:"Memory Match", description:"Flip cards to match hanzi with meaning/pinyin.", icon:"🧠", url:"./memory-match/", tags:"matching recognition", order:2, active:true, enabled:true, login_required:false }
    // ]);
  }
}
init();
