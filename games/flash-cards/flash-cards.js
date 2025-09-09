// FCv1.2-3：Flip / Prev / Next（循環）＋進度同步
import { GAS_ENDPOINT, SHEETS, PREF } from "/js/config.js";
import { adaptMemoryItem } from "/js/shared/dataAdapter.js";
import { showDataLoadError } from "/js/shared/errorUi.js";
import { escapeHtml } from "/js/shared/dom.js";

const state = {
  items: [],
  index: 0,              // 0-based
  lang: "fr",            // 背面語言
  showPinyin: true,      // 正面是否顯示拼音
  mode: "front-zh",      // 'front-zh'（MVP先用這個）
  isFront: true,         // true=看正面，false=看背面
};

// DOM
const cardEl = document.getElementById("card");
const frontEl = cardEl?.querySelector(".front");
const backEl  = cardEl?.querySelector(".back");
const progressEl = document.getElementById("progress");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

// ---------- 資料 ----------
async function loadData() {
  try {
    const u = new URL(GAS_ENDPOINT);
    u.searchParams.set("sheet", SHEETS.memory);
    u.searchParams.set("active", "true");

    const res = await fetch(u.toString(), { credentials: "omit" });
    if (!res.ok) throw new Error(`Fetch failed ${res.status}`);

    const data = await res.json();

    const items = (data.items || [])
      .map(x => adaptMemoryItem(x, PREF))
      .filter(i => i.active && i.hanzi && (i.meaning?.fr || i.meaning?.en));

    console.log("[FlashCards] Loaded", items.length, "items");
    if (items[0]) console.log("[FlashCards] First item:", items[0]);

    return items;
  } catch (e) {
    console.error(e);
    showDataLoadError({
      sheetName: SHEETS.memory,
      url: new URL(GAS_ENDPOINT).toString(),
      hintList: [
        "確認 Google Apps Script 權限（Anyone with the link）",
        "檢查 sheet 名稱拼字是否一致",
        "若有 CORS 問題，可先用 proxy 或在 GAS 設定允許",
      ],
    });
    return [];
  }
}

// ---------- 渲染 ----------
function renderCard() {
  if (!frontEl || !backEl || !progressEl) return;

  const total = state.items.length;
  if (total === 0) {
    frontEl.innerHTML = "—";
    backEl.innerHTML = "No cards. Try adjusting filters.";
    progressEl.textContent = "0 / 0";
    showFace(true);
    return;
  }

  // 邊界保護
  if (state.index < 0) state.index = (total + (state.index % total)) % total;
  if (state.index >= total) state.index = state.index % total;

  const item = state.items[state.index];

  // 正面：中文 +（可選）拼音
  const hanzi = escapeHtml(item.hanzi || "");
  const pinyin = state.showPinyin ? `<div class="pinyin">${escapeHtml(item.pinyin || "")}</div>` : "";

  // 背面：義（fr預設，沒有就退到en）
  const meaning =
    state.lang === "fr"
      ? (item.meaning?.fr || item.meaning?.en || "")
      : (item.meaning?.en || item.meaning?.fr || "");

  if (state.mode === "front-zh") {
    frontEl.innerHTML = `<div class="hanzi" style="font-size:2.2rem">${hanzi}</div>${pinyin}`;
    backEl.innerHTML = `<div class="meaning">${escapeHtml(meaning)}</div>`;
  } else {
    // 未來做「顯示外語」時才用；MVP 仍以 front-zh 為主
    frontEl.innerHTML = `<div class="meaning">${escapeHtml(meaning)}</div>`;
    backEl.innerHTML   = `<div class="hanzi" style="font-size:2.2rem">${hanzi}</div>${pinyin}`;
  }

  // 進度
  progressEl.textContent = `${state.index + 1} / ${total}`;

  // 顯示面
  showFace(state.isFront);
}

// 只切換可見面（先用 display 控制，之後可改 3D 翻面）
function showFace(front) {
  state.isFront = front;
  if (!frontEl || !backEl) return;
  frontEl.style.display = front ? "block" : "none";
  backEl.style.display  = front ? "none"  : "block";
}

// ---------- 互動 ----------
function go(delta) {
  const total = state.items.length;
  if (total === 0) return;
  state.index = (state.index + delta + total) % total; // 循環
  state.isFront = true; // 換卡片時回到正面
  renderCard();
}

function flip() {
  showFace(!state.isFront);
}

// 事件綁定
if (prevBtn) prevBtn.addEventListener("click", () => go(-1));
if (nextBtn) nextBtn.addEventListener("click", () => go(+1));
if (cardEl)  cardEl.addEventListener("click", flip);

// 鍵盤快速鍵（可選）
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft")  go(-1);
  else if (e.key === "ArrowRight") go(+1);
  else if (e.key === " " || e.key === "Enter") flip();
});

// ---------- 初始化 ----------
async function init() {
  state.items = await loadData();
  state.index = 0;
  state.isFront = true;
  renderCard();
}

init();
