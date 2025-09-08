// /js/shared/timer.js

/** 把秒數格式化成 mm:ss */
export function formatTime(s = 0) {
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }
  
  /**
   * 建立一個簡單計時器
   * @param {(sec:number)=>void} onTick - 每秒呼叫一次，把累計秒數丟回來
   * @returns {{ start():void, stop():void, reset():void }}
   */
  export function createTimer(onTick = () => {}) {
    let startedAt = null;   // 起始時間（ms）
    let id = null;          // setInterval 的 id
    let lastSec = 0;        // 最近一次回報的秒數
  
    function start() {
      if (id) return;                 // 已在跑就不重複啟動
      startedAt = Date.now();
      id = setInterval(() => {
        const sec = Math.floor((Date.now() - startedAt) / 1000);
        if (sec !== lastSec) {
          lastSec = sec;
          onTick(sec);
        }
      }, 250); // 稍微密一點，避免卡頓造成跳秒
    }
  
    function stop() {
      if (id) {
        clearInterval(id);
        id = null;
      }
    }
  
    function reset() {
      stop();
      startedAt = null;
      lastSec = 0;
      onTick(0);
    }
  
    return { start, stop, reset };
  }
  