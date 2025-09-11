// ====== Config ======
const SHEET_ID   = "1nb2Nnxq26adk9NxDF6k7HAjdW1yDffzKkm58bnJpeWc"; // Games DB Sheet ID
const SHEET_NAME = "Games";                                        // 工作表名稱
const LOGIN_URL  = "https://jlmstw.github.io/JLMS-Chinois-de-la-vie-quotidienne/index.html";

// ====== Small helpers ======
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
  if (url)  return url;          // 完整網址優先
  if (path) return path;         // 相對路徑
  if (slug) return `./${slug}/`; // 備援：slug
  return "#";
}

// ====== JSONP 讀 gviz（避開 CORS）======
function getGVizJsonpUrl(sheetId, sheetName, cbName) {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`;
  const params = new URLSearchParams({
    sheet: sheetName,
    headers: "1",
    tqx: `out:json;responseHandler=${cbName}`,
  });
  return `${base}?${params}`;
}
function jsonp(url, cbName, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("JSONP timeout"));
    }, timeoutMs);

    window[cbName] = (json) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(json);
    };

    function cleanup() {
      clearTimeout(timer);
      try { delete window[cbName]; } catch { window[cbName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    script.src = url;
    script.onerror = () => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("JSONP network error"));
    };
    document.head.appendChild(script);
  });
}

// gviz 物件 -> 列資料
function rowsFromGvizObject(json) {
  const table = json.table;
  const cols = table.cols.map(c => (c.label || c.id || "").toString().trim().toLowerCase());
  const rows = table.rows || [];
  return rows.map(r => {
    const obj = {};
    cols.forEach((name, idx) => {
      const cell = r.c[idx];
      let v = (cell && (cell.v ?? cell.f)) ?? "";
      if (typeof v === "string") v = v.trim();
      obj[name] = v;
    });
    return obj;
  });
}

// ====== Render ======
function showError(msg) {
  const grid = $("#gamesGrid");
  grid.innerHTML = "";
  const box = document.createElement("div");
  box.className = "error-box";
  box.textContent = msg;
  grid.appendChild(box);
}

function renderCards(rows) {
  const grid = $("#gamesGrid");
  grid.innerHTML = "";

  const filtered = rows
    .filter(r => toBool(r.active, true) && toBool(r.enabled, true))
    .sort((a, b) => toNumber(a.order) - toNumber(b.order));

  if (!filtered.length) {
    showError("No games available.");
    return;
  }

  for (const r of filtered) {
    const icon  = r.icon || "🎮";
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

    grid.appendChild(a);
  }
}

// ====== Main ======
async function loadGames() {
  try {
    const cb = "__JLMS_GVIZ_CB__" + Math.random().toString(36).slice(2);
    const url = getGVizJsonpUrl(SHEET_ID, SHEET_NAME, cb);
    const json = await jsonp(url, cb);
    const rows = rowsFromGvizObject(json);
    renderCards(rows);
  } catch (err) {
    console.error(err);
    showError("Failed to load games. Please refresh or try again later.");
  }
}

loadGames();
