// js/config.js

// ✅ 你的 Web App /exec 連結（一定要 /exec）
export const GAS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycby8K9W8qZliOl55y4ueQTeRmvLV1cYJGiW0yRmluMu-W8eGQZNWyJPlI3fR6ugrin9j1Q/exec";

// （可留可不留；用 GAS 模式前端其實不需要 SHEET_ID）
export const SHEET_ID = "1nb2Nnxq26adk9NxDF6k7HAjdW1yDffzKkm58bnJpeWc";

export const SHEETS = {
  games: "Games",
  memory: "Memory Match",
  sentence: "Sentence Builder",
};

// ✅ 和 Google Sheet 欄位一致
export const PREF = {
  hanzi: "chinese_tr",
  pinyin: "pinyin_tw",
  // 需要時可加：meaningPriority: ["meaning_fr", "meaning_en"]
};
