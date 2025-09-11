/* /games/games.js  — 直接覆蓋貼上 */

const SHEET_ID = "1nb2Nnxq26adk9NxDF6k7HAjdW1yDffzKkm58bnJpeWc"; // 你的試算表 ID
const SHEET_NAME = "Games";                                  // 分頁名稱
const CACHE_KEY = "jlms_games_cache_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;                    // 24h

const grid = document.getElementById("gamesGrid");
const backBtn = document.querySelector(".back-btn");

// ---------- Back 按鈕：依情境導向 ----------
(function setupSmartBack() {
  const params = new URLSearchParams(location.search);
  if (params.get("guest") === "1") {
    sessionStorage.setItem("jlms_guest", "1");
  }

  let target = "../home.html"; // 預設：回主站首頁（已登入）
  const ref = document.referrer || "";
  const sameOrigin = ref.startsWith(location.origin);

  if (sessionStorage.getItem("jlms_guest") === "1") {
    target = "../index.html"; // 未登入玩家回登入頁
  } else if (sameOrigin && ref) {
    target = ref; // 同網域且有上一頁 → 回上一頁
  }

  if (backBtn) backBtn.href = target;
})();

// ---------- 讀表 + 快取 ----------
async function fetchGames() {
  // 讀快取
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL_MS) return data;
    }
  } catch (_) {}

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(
    SHEET_NAME
  )}&tqx=out:json`;

  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  const json = parseGViz(text);
  const rows = toObjects(json);

  // 存快取
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data: rows })
    );
  } catch (_) {}

  return rows;
}

// 解析 gviz
function parseGViz(txt) {
  const m = txt.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\)/);
  if (!m) throw new Error("GViz payload not recognized");
  return JSON.parse(m[1]);
}

// table → objects（用表頭當 key）
function toObjects(gvizJson) {
  const cols = gvizJson.table.cols.map((c) => (c.label || c.id || "").trim());
  return gvizJson.table.rows.map((r) => {
    const obj = {};
    r.c.forEach((cell, i) => {
      obj[cols[i]] = cell ? cell.v : "";
    });
    return obj;
  });
}

function asBool(v) {
  if (typeof v === "boolean") return v;
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "y" || s === "yes" || s === "1";
}

function splitTags(s) {
  if (!s) return [];
  return String(s)
    .split(/[,;、\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// 產生絕對連結（path 相對於 repo root）
function resolveHref(row) {
  if (row.url) return row.url;
  if (row.path) {
    // 將相對路徑轉成絕對
    const base = location.origin + location.pathname.replace(/\/games\/.*$/, "/");
    return new URL(row.path.replace(/^\//, ""), base).href;
  }
  return "#";
}

// ---------- 渲染 ----------
function render(data) {
  grid.innerHTML = ""; // 清骨架

  // 過濾 + 排序
  const list = data
    .filter((r) => asBool(r.enabled) && (r.active === "" || asBool(r.active)))
    .sort((a, b) => (parseInt(a.order || 999, 10) - parseInt(b.order || 999, 10)));

  if (list.length === 0) {
    grid.innerHTML =
      '<div class="error-box">No games available right now. Please check back later.</div>';
    return;
  }

  const frag = document.createDocumentFragment();

  list.forEach((row) => {
    const href = resolveHref(row);
    const needLogin = asBool(row.login_required);
    const isLocked = needLogin;

    const a = document.createElement("a");
    a.className = "card" + (isLocked ? " locked" : "");
    a.href = isLocked ? "../index.html" : href;
    a.target = "_blank";
    a.rel = "noopener";

    const icon = row.icon ? `<div class="icon" aria-hidden="true">${row.icon}</div>` : "";
    const title = `<div class="title">${row.title || row.slug || "Untitled"}</div>`;
    const desc = row.description ? `<div class="desc">${row.description}</div>` : "";

    const tags = splitTags(row.tags)
      .map((t) => `<span>${t}</span>`)
      .join("");

    a.innerHTML = `
      ${icon}
      ${title}
      ${desc}
      <div class="tags">${tags}</div>
      ${isLocked ? `<span class="lock-badge">🔒 Login required</span>` : ""}
    `;

    frag.appendChild(a);
  });

  grid.appendChild(frag);
}

// ---------- 初始化 ----------
(async function init() {
  try {
    // 若有骨架，可先放兩個
    if (grid && grid.children.length === 0) {
      grid.innerHTML = `<div class="card skeleton"><div class="skel-line w60"></div><div class="skel-line w80"></div></div>
                        <div class="card skeleton"><div class="skel-line w60"></div><div class="skel-line w80"></div></div>`;
    }
    const rows = await fetchGames();
    render(rows);
  } catch (err) {
    console.error(err);
    grid.innerHTML =
      '<div class="error-box">Failed to load games. Please refresh or try again later.</div>';
  }
})();
