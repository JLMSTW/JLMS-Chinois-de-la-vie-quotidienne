// /js/shared/urlState.js
export function get() {
    const u = new URL(location.href);
    const q = u.searchParams;
  
    // 1) difficulty / mode 兩個鍵都相容
    const rawDiff = (q.get("difficulty") || q.get("mode") || "easy").trim().toLowerCase();
    // 2) 規範成兩種合法值
    const difficulty = (rawDiff === "advanced") ? "advanced" : "easy";
  
    // 語言也做一下規範（fr/en）
    const rawLang = (q.get("lang") || "fr").trim().toLowerCase();
    const lang = (rawLang === "en") ? "en" : "fr";
  
    // 其他欄位照舊（有就帶，沒有給空字串）
    const book   = q.get("book")   || "";
    const lesson = q.get("lesson") || "";
    const level  = q.get("level")  || "";
    const pos    = q.get("pos")    || "";
    const set    = q.get("set")    || "";
  
    return { difficulty, lang, book, lesson, level, pos, set };
  }
  