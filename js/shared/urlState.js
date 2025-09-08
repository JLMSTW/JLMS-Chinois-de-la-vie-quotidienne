// /js/shared/urlState.js
// 只做讀取（get）；寫入(set) 我們下一步再加

export function get() {
    const p = new URLSearchParams(location.search);
  
    // 舊鍵相容：mode -> difficulty
    const difficulty = (p.get("difficulty") || p.get("mode") || "easy").toLowerCase();
  
    const state = {
      difficulty,
      book:   p.get("book")   || "",
      lesson: p.get("lesson") || "",
      level:  p.get("level")  || "",
      pos:    p.get("pos")    || "",
      lang:   ((p.get("lang") || "fr").toLowerCase() === "en" ? "en" : "fr"),
      set:    p.get("set")    || ""
    };
  
    return state;
  }
  