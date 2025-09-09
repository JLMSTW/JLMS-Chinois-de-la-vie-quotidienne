// /games/flash-cards/flash-cards.js
// FCv1.2-1：只讀資料並正規化，先在 Console 驗證，不渲染 UI

import { GAS_ENDPOINT, SHEETS, PREF } from "/js/config.js";
import { adaptMemoryItem } from "/js/shared/dataAdapter.js";
import { showDataLoadError } from "/js/shared/errorUi.js";

async function loadData() {
  try {
    const u = new URL(GAS_ENDPOINT);
    u.searchParams.set("sheet", SHEETS.memory);
    u.searchParams.set("active", "true");

    const res = await fetch(u.toString(), { credentials: "omit" });
    if (!res.ok) throw new Error(`Fetch failed ${res.status}`);

    const data = await res.json();

    // 正規化＋基礎過濾（僅保留可用的卡片）
    const items = (data.items || [])
      .map(x => adaptMemoryItem(x, PREF))
      .filter(i => i.active && i.hanzi && (i.meaning?.fr || i.meaning?.en));

    console.log("[FlashCards] Loaded", items.length, "items");
    if (items[0]) console.log("[FlashCards] First item:", items[0]);

    // 先暫存到全域，下一步會用來渲染
    window.__flashCards = { items };
  } catch (e) {
    console.error(e);
    showDataLoadError({
      sheetName: SHEETS.memory,
      url: new URL(GAS_ENDPOINT).toString(),
      hintList: [
        "確認 Google Apps Script 權限（Anyone with the link）",
        "檢查 sheet 名稱拼字是否一致",
        "若有 CORS 問題，可先用 proxy 或在 GAS 設定允許"
      ]
    });
  }
}

loadData();
