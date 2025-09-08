// /js/shared/shuffle.js

/** 亂數打散（Fisher–Yates） */
export function shuffle(arr = []) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  
  /** 從陣列中等機率抽 n 個，最多不超過原長度 */
  export function sample(arr = [], n = 0) {
    const k = Math.max(0, Math.min(n, arr.length));
    return shuffle(arr).slice(0, k);
  }
  