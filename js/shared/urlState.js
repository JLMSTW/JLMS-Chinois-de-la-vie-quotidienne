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
// —— 新增的通用小工具 ——
// 取單一 key
export function getOne(key, fallback = null) {
  const params = new URLSearchParams(location.search);
  return params.has(key) ? params.get(key) : fallback;
}

// 一次覆蓋全部參數（不管原本有什麼）
export function replaceAll(state = {}) {
  const u = new URL(location.href);
  u.search = ""; // 清空參數
  for (const [key, val] of Object.entries(state)) {
    if (val !== undefined && val !== null && val !== "") {
      u.searchParams.set(key, String(val));
    }
  }
  history.replaceState(null, "", u);
}
