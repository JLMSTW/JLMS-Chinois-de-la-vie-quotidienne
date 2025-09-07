import { GAS_ENDPOINT, SHEETS, PREF } from "/js/config.js";

// ---- constants / state ----
const FLIP_BACK_DELAY = 2000; // 放慢為 2.0s
const boardEl   = document.getElementById("board");
const loadingEl = document.getElementById("loading");
const movesEl   = document.getElementById("moves");
const matchesEl = document.getElementById("matches");
const timerEl   = document.getElementById("timer");
const levelTag  = document.getElementById("levelTag");
const victoryEl = document.getElementById("victory");

const selDifficulty = document.getElementById("difficulty");
const selBook   = document.getElementById("filterBook");
const selLesson = document.getElementById("filterLesson");
const selLevel  = document.getElementById("filterLevel");
const selPos    = document.getElementById("filterPos");
const selLang  = document.getElementById("filterLang");

const params = new URLSearchParams(location.search);
const SET_FROM_URL = params.get("set") || ""; // e.g. B4_L16

let rawItems = [];   // 來自 GAS 的原始資料
let pool     = [];   // 依篩選後可用的資料
let deck     = [];   // 牌庫（兩倍）
let game     = {};   // 遊戲狀態
let timerId  = null;

// ---- helpers ----
const by = (k) => (a,b)=> (a[k]||"").localeCompare(b[k]||"");
const uniq = (arr)=> Array.from(new Set(arr.filter(Boolean)));
const fmtTime = (s)=> {
  const mm = String(Math.floor(s/60)).padStart(2,"0");
  const ss = String(s%60).padStart(2,"0");
  return `${mm}:${ss}`;
};
const setLoading = (on)=> loadingEl.textContent = on ? "Loading…" : "";

const updateURL = ()=>{
  const u = new URL(location.href);
  u.searchParams.set("mode", selDifficulty.value);
  u.searchParams.set("book", selBook.value);
  u.searchParams.set("lesson", selLesson.value);
  u.searchParams.set("level", selLevel.value);
  u.searchParams.set("pos", selPos.value);
  if (SET_FROM_URL) u.searchParams.set("set", SET_FROM_URL);
  history.replaceState(null, "", u);
};

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
  rawItems = (data.items || []).map(x => ({
    set_id:       x.set_id ?? x.setId ?? "",
    book:         x.book ?? x.Book ?? "",
    lesson:       x.lesson ?? x.Lesson ?? "",
    chinese_tr:   x.chinese_tr ?? x.chineseTR ?? x.chinesetr ?? x[PREF?.hanzi] ?? "",
    pinyin_tw:    x.pinyin_tw ?? x.pinyintw ?? x[PREF?.pinyin] ?? "",
    meaning_fr:   x.meaning_fr ?? x.meaningFR ?? "",
    meaning_en:   x.meaning_en ?? x.meaningEN ?? "",
    tocfl_level:  x.tocfl_level ?? x.TOCFL_Level ?? x.tocfl ?? "",
    pos:          x.pos ?? x.part_of_speech ?? "",
    active:       String(x.active ?? x.Active ?? "").toUpperCase() === "TRUE",
  }));

  setLoading(false);
}

// ---- build filters ----
function buildFilters(){
  const opt = (val, text)=> `<option value="${val}">${text}</option>`;
  const books   = uniq(rawItems.map(i=>i.book)).sort();
  const lessons = uniq(rawItems.map(i=>i.lesson)).sort(by(undefined));
  const lvls    = uniq(rawItems.map(i=>i.tocfl_level)).sort();
   // 從 pos 欄位擷取縮寫 token（adj. / n. / v. / prep. / pron. / conj. / adv. / mw. / aux. / expr.）
  const posTokens = uniq(
   rawItems.flatMap(i => {
     const s = (i.pos || "").toLowerCase();
     const m = s.match(/\b[a-z]{1,6}\./g);
     return m || [];
   })
   ).sort();

  selBook.innerHTML   = opt("", "Book: All")   + books.map(b=>opt(b, b||"—")).join("");
  selLesson.innerHTML = opt("", "Lesson: All") + lessons.map(l=>opt(l, l||"—")).join("");
  selLevel.innerHTML  = opt("", "TOCFL: All")  + lvls.map(l=>opt(l, l||"—")).join("");
  selPos.innerHTML    = opt("", "POS: All")    + poses.map(p=>opt(p, p||"—")).join("");

  // 從 URL 還原
  selBook.value   = params.get("book")   ?? "";
  selLesson.value = params.get("lesson") ?? "";
  selLevel.value  = params.get("level")  ?? "";
  selPos.value    = params.get("pos")    ?? "";

  // NEW：語言（預設 fr）
  const lang = (params.get("lang") || "fr").toLowerCase();
  selLang.value = (lang === "en" ? "en" : "fr");
}

// ---- apply filters ----
function filterPool(){
  pool = rawItems.filter(i =>
    i.active &&
    i.chinese_tr &&
    (i.meaning_fr || i.meaning_en)
  );

  if (selBook.value)   pool = pool.filter(i => i.book === selBook.value);
  if (selLesson.value) pool = pool.filter(i => i.lesson === selLesson.value);
  if (selLevel.value)  pool = pool.filter(i => (i.tocfl_level||"").toUpperCase() === selLevel.value.toUpperCase());

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
function pickN(arr, n){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a.slice(0, n);
}

function buildDeck(){
const pairs = selDifficulty.value === "advanced" ? 11 : 6;
const chosen = pickN(pool, Math.min(pairs, pool.length));

const lang = selLang.value || "fr"; // 'fr' or 'en'
const getMeaning = (i) => {
if (lang === "fr") return i.meaning_fr || i.meaning_en || "";
return i.meaning_en || i.meaning_fr || "";
};

const temp = [];
chosen.forEach((item, idx)=>{
const hanzi   = item.chinese_tr;
const pinyin  = item.pinyin_tw || "";
const meaning = getMeaning(item);
if(!hanzi || !meaning) return;

temp.push({ type:"hanzi",   pair:idx, hanzi, pinyin });
temp.push({ type:"meaning", pair:idx, meaning });
});

deck = pickN(temp, temp.length); // 打散
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
  timerEl.textContent = "00:00";
  if (timerId) clearInterval(timerId);
  game.startedAt = 0;
}

function startTimer(){
  game.startedAt = Date.now();
  timerId = setInterval(()=>{
    const sec = Math.floor((Date.now() - game.startedAt)/1000);
    timerEl.textContent = fmtTime(sec);
  }, 1000);
}

function onFlip(card){
  if (card.classList.contains("flipped") || card.classList.contains("matched")) return;
  if (game.flipped.length >= 2) return;

  // 開始計時
  if (!game.startedAt) startTimer();

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
  if (timerId) clearInterval(timerId);
  if (victory){
    setTimeout(()=> victoryEl.style.display = "grid", 300);
  }
}

// ---- main flows ----
async function init(){
  // Difficulty/filters 初始值（可從 URL 還原）
  selDifficulty.value = params.get("mode") || "easy";

  try{
    await fetchItems();
    buildFilters();
    applyAndStart();
  }catch(e){
    console.error(e);
    loadingEl.textContent = "Failed to load data.";
  }

  // bind UI
  document.getElementById("newGameBtn").addEventListener("click", ()=>{ applyAndStart(); });
  document.getElementById("playAgainBtn").addEventListener("click", ()=>{
    victoryEl.style.display = "none";
    applyAndStart();
  });

  [selDifficulty, selBook, selLesson, selLevel, selPos, selLang].forEach(sel=>{
    sel.addEventListener("change", ()=>{
      updateURL();
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

// ---- utils ----
function escapeHtml(s=""){
  return String(s).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'
  }[m]));
}

// GO!
init();
