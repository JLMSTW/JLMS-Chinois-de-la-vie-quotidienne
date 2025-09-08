// /js/shared/urlState.js

// 讀取網址參數 → 回傳統一物件
export function get() {
    const p = new URLSearchParams(location.search);
    return {
      // 舊參數名相容：mode / difficulty 都吃
      difficulty: p.get("difficulty") || p.get("mode") || "",
      book:      p.get("book")   || "",
      lesson:    p.get("lesson") || "",
      level:     p.get("level")  || "",
      pos:       p.get("pos")    || "",
      lang:     (p.get("lang")   || "fr").toLowerCase(),
      set:       p.get("set")    || "",
    };
  }
  
  // 寫回網址參數（不存在就刪除），並 history.replaceState 不重整
  export function set(state = {}) {
    const u = new URL(location.href);
    const p = u.searchParams;
  
    // 小工具：有值就 set，沒值就 delete
    const put = (key, val) => {
      if (val === undefined || val === null || val === "") p.delete(key);
      else p.set(key, String(val));
    };
  
    if ("difficulty" in state) {
      put("difficulty", state.difficulty);
      // 舊連結相容：同步寫 mode
      put("mode", state.difficulty);
    }
    if ("book"   in state) put("book",   state.book);
    if ("lesson" in state) put("lesson", state.lesson);
    if ("level"  in state) put("level",  state.level);
    if ("pos"    in state) put("pos",    state.pos);
    if ("lang"   in state) put("lang",   (state.lang || "fr").toLowerCase());
  
    // set 特別處理：明確給 undefined 代表不要動；給空字串/空值則刪掉
    if ("set"    in state) {
      if (state.set === undefined) {
        // do nothing
      } else {
        put("set", state.set);
      }
    }
  
    history.replaceState(null, "", u);
  }
  