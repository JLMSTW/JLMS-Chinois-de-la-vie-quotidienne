// games/memory-match/memory-match.js  ← 檔案在這層
// 改用相對路徑（從 /games/memory-match/ 回到 /js = ../../js）

import { GAS_ENDPOINT, SHEETS, PREF } from "../../js/config.js";
import { escapeHtml } from "../../js/shared/dom.js";
import { shuffle, sample } from "../../js/shared/shuffle.js";
import { createTimer, formatTime } from "../../js/shared/timer.js";
import * as urlState from "../../js/shared/urlState.js";
import { adaptMemoryItem } from "../../js/shared/dataAdapter.js";
import { showDataLoadError } from "../../js/shared/errorUi.js";

// ---- constants / state ----
const FLIP_BACK_DELAY = 2000; // 放慢為 2.0s
const boardEl   = document.getElementById("board");
const loadingEl = document.getElementById("loading");
const movesEl   = document.getElementById("moves");
const matchesEl = document.getElementById("matches");
const timerEl   = document.getElementById("timer");
const levelTag  = document.getElementById("levelTag");
const victoryEl = document.getElementById("victory");

// 建立共用計時器：每秒把秒數格式化後寫到畫面
const timer = createTimer((sec) => {
  timerEl.textContent = formatTime(sec);
});

const selDifficulty = document.getElementById("difficulty");
const selBook   = document.getElementById("filterBook");
const selLesson = document.getElementById("filterLesson");
const selLevel  = document.getElementById("filterLevel");
const selPos    = document.getElementById("filterPos");
const selLang   = document.getElementById("filterLang");

// 讀 URL（統一用 urlState）
const url = urlState.get();     // {difficulty, book, lesson, level, pos, lang, set}
const SET_FROM_URL = url.set;   // 暫時保留同名變數給後面程式用

let rawItems = [];   // 來自 GAS 的原始資料
let pool     = [];   // 依篩選後可用的資料
let deck     = [];   // 牌庫（兩倍）
let game     = {};   // 遊戲狀態（moves / matches / flipped 等）

// ---- helpers ----
const uniq = (arr)=> Array.from(new Set(arr.filter(Boolean)));
const setLoading = (on)=> loadingEl.textContent = on ? "Loading…" : "";

// ---- fetch from GAS ----
async function fetchItems(){
  setLoading(true);
  const url = new URL(GAS_ENDPOINT);
  url.searchParams.set("sheet", SHEETS.memory);
  url.searchParams.set("active", "true");
  if (SET_FROM_URL) url.searchParams.set("set", SET_FROM_URL);

  const res = await fetch(url.toString(), { credentials: "omit" });
  if(!res.ok) throw new Error(`Fetch failed ${res.status}`);
  const data = await res.json();

  // 正規化 key（保守處理大小寫/底線）
  rawItems = (data.items || []).map(x => adaptMemoryItem(x, PREF));

  setLoading(false);
}

// ---- build filters ----
function setLessonOptionsForBook(bookValue, keepCurrent = true) {
  if (!selLesson) return;
  const current = keepCurrent ? (selLesson.value || "") : "";
  const lessons = uniq(
    rawItems
      .filter(i => !bookValue || i.book === bookValue)
      .map(i => i.lesson)
  ).sort();
  const prefix = bookValue ? `All in ${bookValue}` : "All";
  const opt = (val, text) => `<option value="${val}">${text}</option>`;
  selLesson.innerHTML = opt("", `Lesson: ${prefix}`) + lessons.map(v => opt(v, v || "—")).join("");
  selLesson.value = (keepCurrent && current && lessons.includes(current)) ? current : "";
}

function buildFilters(){
  const opt = (val, text)=> `<option value="${val}">${text}</option>`;
  const books   = uniq(rawItems.map(i=>i.book)).sort();
  const lvls = uniq(rawItems.map(i=>i.level)).sort();

  // 從 pos 欄位擷取縮寫 token（adj. / n. / v. / prep. / pron. / conj. / adv. / mw. / aux. / expr.）
  const posTokens = uniq(
    rawItems.flatMap(i => {
      const s = (i.pos || "").toLowerCase();
      const m = s.match(/\b[a-z]{1,6}\./g);
      return m || [];
    })
  ).sort();

  selBook.innerHTML  = opt("", "Book: All")  + books.map(b=>opt(b, b||"—")).join("");
  selLevel.innerHTML = opt("", "TOCFL: All") + lvls.map(l=>opt(l, l||"—")).join("");
  selPos.innerHTML   = opt("", "POS: All")   + posTokens.map(p=>opt(p, p||"—")).join("");

  // 從 URL 還原
  selBook.value  = url.book  || "";
  setLessonOptionsForBook(selBook.value, false);
  selLesson.value = url.lesson || "";
  selLevel.value = url.level || "";
  selPos.value   = url.pos   || "";

  // NEW：語言（預設 fr）
  const lang = (url.lang || "fr").toLowerCase();
  selLang.value = (lang === "en" ? "en" : "fr");
}

// ---- apply filters ----
function filterPool(){
  pool = rawItems.filter(i =>
    i.active &&
    i.hanzi &&
    (i.meaning.fr || i.meaning.en)
  );

  if (selBook.value)   pool = pool.filter(i => i.book === selBook.value);
  if (selLesson.value) pool = pool.filter(i => i.lesson === selLesson.value);
  if (selLevel.value)  pool = pool.filter(i => (i.level||"").toUpperCase() === selLevel.value.toUpperCase());

  // NEW：pos 只要包含所選 token 就通過（例如 'adj.'）
  if (selPos.value){
    const token = selPos.value.toLowerCase();
    pool = pool.filter(i => (i.pos || "").toLowerCase().includes(token));
  }

  if (SET_FROM_URL){
    pool = pool.filter(i => (i.set_id||"").toLowerCase() === SET_FROM_URL.toLowerCase());
  }
}

// ---- build deck ----
function buildDeck(){
  const pairs = selDifficulty.value === "advanced" ? 11 : 6;
  const chosen = sample(pool, Math.min(pairs, pool.length));

  const lang = selLang.value || "fr"; // 'fr' or 'en'
  const getMeaning = (i) => {
    if (lang === "fr") return i.meaning.fr || i.meaning.en || "";
    return i.meaning.en || i.meaning.fr || "";
  };

  const temp = [];
  chosen.forEach((item, idx)=>{
    const hanzi  = item.hanzi;
    const pinyin = item.pinyin || "";
    const meaning = getMeaning(item);
    if(!hanzi || !meaning) return;

    temp.push({ type:"hanzi",   pair:idx, hanzi, pinyin });
    temp.push({ type:"meaning", pair:idx, meaning });
  });

  deck = shuffle(temp); // 打散
}

// ---- rendering ----
function cardEl(card){
  const el = document.createElement("div");
  el.className = "card";
  el.dataset.pair = card.pair;

  const inner = document.createElement("div");
  inner.className = "card-inner";

  const front = document.createElement("div");
  front.className = "face front";
  front.innerHTML = `<div style="font-size:2.2rem">🀄</div>`;

  const back = document.createElement("div");
  back.className = "face back" + (card.type === "meaning" ? " french" : "");
  back.innerHTML = card.type === "hanzi"
    ? `<div class="hanzi">${escapeHtml(card.hanzi)}</div><div class="pinyin">${escapeHtml(card.pinyin)}</div>`
    : `<div class="meaning">${escapeHtml(card.meaning)}</div>`;

  inner.append(front, back);
  el.append(inner);
  el.addEventListener("click", ()=> onFlip(el));
  return el;
}

function renderBoard(){
  boardEl.innerHTML = "";
  deck.forEach(c => boardEl.appendChild(cardEl(c)));
}

// ---- game logic ----
function resetStats(){
  game.moves = 0;
  game.matches = 0;
  game.flipped = [];

  movesEl.textContent = "0";
  matchesEl.textContent = "0";

  // 以共用計時器為準
  timer.stop();
  timer.reset();
  timerEl.textContent = "00:00";
}

function onFlip(card){
  if (card.classList.contains("flipped") || card.classList.contains("matched")) return;
  if (game.flipped.length >= 2) return;

  // 第一次翻牌就啟動（重複呼叫也安全）
  timer.start();

  card.classList.add("flipped");
  game.flipped.push(card);

  if (game.flipped.length === 2){
    game.moves++;
    movesEl.textContent = game.moves.toString();

    const [a,b] = game.flipped;
    const same = a.dataset.pair === b.dataset.pair;

    if (same){
      setTimeout(()=> {
        a.classList.add("matched");
        b.classList.add("matched");
        game.flipped = [];
        game.matches++;
        matchesEl.textContent = game.matches.toString();
        if (game.matches * 2 >= deck.length) endGame(true);
      }, 220); // 小延遲以顯示翻面效果
    }else{
      // 放慢 2 秒再蓋回
      setTimeout(()=>{
        a.classList.remove("flipped");
        b.classList.remove("flipped");
        game.flipped = [];
      }, FLIP_BACK_DELAY);
    }
  }
}

function endGame(victory){
  timer.stop();
  if (victory){
    setTimeout(()=> victoryEl.style.display = "grid", 300);
  }
}

// ---- main flows ----
async function init(){
  // Difficulty/filters 初始值（可從 URL 還原）
  try{
    await fetchItems();
    buildFilters();
    // ← 改成在這裡再還原（確保不被預設值覆蓋）
    selDifficulty.value = url.difficulty || "easy";

    applyAndStart();
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

  // bind UI
  document.getElementById("newGameBtn").addEventListener("click", ()=>{ applyAndStart(); });
  document.getElementById("playAgainBtn").addEventListener("click", ()=>{
    victoryEl.style.display = "none";
    applyAndStart();
  });

  selBook.addEventListener("change", () => {
    setLessonOptionsForBook(selBook.value, true);
  });

  [selDifficulty, selBook, selLesson, selLevel, selPos, selLang].forEach(sel => {
    sel.addEventListener("change", () => {
      // 寫回 URL（集中在 /js/shared/urlState.js）
      urlState.set({
        difficulty: selDifficulty.value,
        book:       selBook.value,
        lesson:     selLesson.value,
        level:      selLevel.value,
        pos:        selPos.value,
        lang:       selLang.value || "fr",
        set:        SET_FROM_URL || undefined, // 有帶 set 的話保留，沒有就別寫
      });
      applyAndStart();
    });
  });
}

function applyAndStart(){
  levelTag.textContent = selDifficulty.value === "advanced" ? "Advanced" : "Easy";

  filterPool();
  buildDeck();
  renderBoard();
  resetStats();
}

// GO!
init();
