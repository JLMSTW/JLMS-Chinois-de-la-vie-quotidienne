// /games/flash-cards/flash-cards.js
// FCv1.2-2：渲染第一張卡 + 進度（先不做 Flip/Prev/Next / URL）

import { GAS_ENDPOINT, SHEETS, PREF } from "/js/config.js";
import { adaptMemoryItem } from "/js/shared/dataAdapter.js";
import { showDataLoadError } from "/js/shared/errorUi.js";
import { escapeHtml } from "/js/shared/dom.js"; // 用於安全插入字串

// --- 簡單的頁面狀態（MVP 預設） ---
const state = {
  items: [],
  index: 0,              // 目前卡片索引（0-based）
  lang: "fr",            // 背面語言：'fr' | 'en'（MVP 先預設 fr）
  showPinyin: true,      // 是否在正面顯示拼音（預設 ON）
  mode: "front-zh",      // 'front-zh'（正面中文），MVP 不切換
};

// --- DOM 參照 ---
const cardEl = document.getElementById("card");
const frontEl = cardEl?.querySelector(".front");
const backEl  = cardEl?.querySelector(".back");
const progressEl = document.getElementById("progress");

// --- 讀資料（與 FCv1.2-1 相同，但回傳 items） ---
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

// --- 渲染：依 state.index 顯示卡片內容 ---
function renderCard() {
  if (!frontEl || !backEl || !progressEl) return;

  const total = state.items.length;
  if (total === 0) {
    // 空資料提示（之後會用更漂亮的樣式）
    frontEl.innerHTML = "—";
    backEl.innerHTML = "No cards. Try adjusting filters.";
    progressEl.textContent = "0 / 0";
    return;
  }

  // 安全處理 index（預防超界）
  if (state.index < 0) state.index = 0;
  if (state.index >= total) state.index = total - 1;

  const item = state.items[state.index];

  // 正面：中文 +（可選）拼音
  const hanzi = escapeHtml(item.hanzi || "");
  const pinyin = state.showPinyin ? `<div class="pinyin">${escapeHtml(item.pinyin || "")}</div>` : "";
  // 依語言選義（fr 預設；若無則退回另一語言）
  const meaning =
    state.lang === "fr"
      ? (item.meaning?.fr || item.meaning?.en || "")
      : (item.meaning?.en || item.meaning?.fr || "");

  // 依 mode 決定誰是正面
  if (state.mode === "front-zh") {
    frontEl.innerHTML = `<div class="hanzi" style="font-size:2.2rem">${hanzi}</div>${pinyin}`;
    backEl.innerHTML = `<div class="meaning">${escapeHtml(meaning)}</div>`;
  } else {
    // 如果之後要做「顯示外語」，這裡會反過來；MVP 先只處理 front-zh
    frontEl.innerHTML = `<div class="meaning">${escapeHtml(meaning)}</div>`;
    backEl.innerHTML   = `<div class="hanzi" style="font-size:2.2rem">${hanzi}</div>${pinyin}`;
  }

  // 進度
  progressEl.textContent = `${state.index + 1} / ${total}`;
}

// --- 初始化流程：抓資料 → 存到 state → 渲染第一張 ---
async function init() {
  const items = await loadData();
  state.items = items;
  state.index = 0;
  renderCard();
}

init();
