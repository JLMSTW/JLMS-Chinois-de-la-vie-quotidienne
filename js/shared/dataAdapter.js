// /js/shared/dataAdapter.js
// 把 GAS 回傳的一筆 raw 轉成統一物件（給 Memory / Flash Cards 共用）
// PREF 只用來決定你的「漢字鍵名」與「拼音鍵名」（如 'chinese_tr'、'pinyin_tw'）

export function adaptMemoryItem(x, PREF = {}) {
    return {
      id:     x.set_id ?? x.setId ?? "",
      book:   x.book ?? "",
      lesson: x.lesson ?? "",
      level:  x.tocfl_level ?? x.tocfl ?? "",
      pos:    x.pos ?? "",
  
      // 文字本體
      hanzi:  x.chinese_tr ?? x[PREF.hanzi] ?? "",
      pinyin: x.pinyin_tw  ?? x[PREF.pinyin] ?? "",
  
      // 語義
      meaning: {
        fr: x.meaning_fr ?? "",
        en: x.meaning_en ?? "",
      },
  
      // 狀態
      active: String(x.active ?? x.Active ?? "").toUpperCase() === "TRUE",
    };
  }
  