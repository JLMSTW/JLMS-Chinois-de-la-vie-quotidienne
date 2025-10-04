// FCv1.3：回合式抽牌（不重複直到抽完再重洗）+ POS/任意篩選皆可覆蓋 pool
import { GAS_ENDPOINT, SHEETS, PREF } from "../../js/config.js";
import { adaptMemoryItem } from "../../js/shared/dataAdapter.js";
import { showDataLoadError } from "../../js/shared/errorUi.js";
import { escapeHtml } from "../../js/shared/dom.js";
import { get as getUrlState, set as setUrlState } from "../../js/shared/urlState.js";

const all = { items: [] }; // 全量資料（未過濾）

const state = {
  // 本回合要顯示的卡片（size 張）
  items: [],
  index: 0,

  // 偏好
  lang: "fr",           // 'fr' | 'en'
  showPinyin: true,
  mode: "front-zh",     // 'front-zh' | 'front-foreign'
  size: 20,             // 1~50

  // 計時/翻面
  timerId: null,
  sec: 0,
  isFront: true,

  // 牌堆（跨回合）
  deck: {
    signature: "",      // 由會影響 pool 的條件組成（book|lesson|level|pos）
    idToItem: new Map(),// id -> item
    poolIds: [],        // 此篩選下的所有 id
    remainingIds: [],   // 尚未抽出的 id（洗牌後的序列，抽空再重洗）
  },
};

// ---- TTS 管理 ----
const tts = {
  lastUtter: null,
  speak(text, lang) {
    if (!text) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || "zh-TW"; // zh-TW / fr-FR / en-US
      u.rate = 0.8;
      u.pitch = 0.8;
      this.lastUtter = u;
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn("TTS not available", e);
    }
  },
  cancel() {
    try { window.speechSynthesis.cancel(); } catch (_) {}
    this.lastUtter = null;
  }
};

// DOM helpers / refs
const el = (id) => document.getElementById(id);

const cardEl   = el("card");
const frontEl  = cardEl?.querySelector(".front");
const backEl   = cardEl?.querySelector(".back");
const progressEl = el("progress");
const timerEl    = el("timer");

const selBook   = el("filterBook");
const selLesson = el("filterLesson");
const selLevel  = el("filterLevel");
const selPos    = el("filterPos");
const selLang   = el("filterLang");
const chkPinyin = el("chkPinyin");
const selSize   = el("selSize");
const btnStart  = el("startBtn");
const modeBox   = el("modeBox");

// Buttons
const prevBtn = el("prevBtn");
const nextBtn = el("nextBtn");
const speakBtn = el("speakBtn");

// 將在 buildModes() 後被賦值
let modeZh = null;
let modeForeign = null;

// ---------- 資料 ----------
async function loadAllItems() {
  try {
    const u = new URL(GAS_ENDPOINT);
    u.searchParams.set("sheet", SHEETS.memory);
    u.searchParams.set("active", "true");

    const res = await fetch(u.toString(), { credentials: "omit" });
    if (!res.ok) throw new Error(`Fetch failed ${res.status}`);

    const data = await res.json();
    const items = (data.items || [])
      .map(x => adaptMemoryItem(x, PREF))
      .filter(i => i.active && i.hanzi && (i.meaning?.fr || i.meaning?.en));

    console.log("[FlashCards] Loaded", items.length, "items");
    all.items = items;
  } catch (e) {
    console.error(e);
    showDataLoadError({
      sheetName: SHEETS.memory,
      url: new URL(GAS_ENDPOINT).toString(),
      hintList: [
        "確認 Google Apps Script 權限（Anyone with the link）",
        "檢查 sheet 名稱拼字是否一致",
        "若有 CORS 問題，可先用 proxy 或在 GAS 設定允許",
      ],
    });
  }
}

// ---------- 工具 ----------
const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

/** Fisher–Yates 洗牌（原地洗） */
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 試算表項目唯一 id（若沒有 id，就用 book|lesson|hanzi 作為後備） */
function itemId(i){
  return i.id || [i.book||"", i.lesson||"", i.hanzi||"", i.pinyin||""].join("|");
}

/** 用會影響 pool 的篩選條件做簽章 */
function makeSignature({book, lesson, level, posSel}){
  const lvl = (level||"").toUpperCase();
  const pos = (posSel||"").toLowerCase();
  return [book||"", lesson||"", lvl, pos].join("|");
}

/** 依 Book 建立 Lesson 選項（Book 空白 = 全部 Lesson） */
function setLessonOptionsForBook(bookValue, keepCurrent = true) {
  if (!selLesson) return;

  const current = keepCurrent ? (selLesson.value || "") : "";
  const lessons = uniq(
    all.items
      .filter(i => !bookValue || i.book === bookValue)
      .map(i => i.lesson)
  ).sort();

  const prefix = bookValue ? `All in ${bookValue}` : "All";
  const opt = (val, text)=> `<option value="${val}">${text}</option>`;
  selLesson.innerHTML = opt("", `Lesson: ${prefix}`) + lessons.map(v=>opt(v, v || "—")).join("");

  // 如果原本選的 lesson 還在清單內，就保留；否則清空
  if (keepCurrent && current && lessons.includes(current)) {
    selLesson.value = current;
  } else {
    selLesson.value = "";
  }
}

function buildFiltersOptions() {
  const items = all.items;
  const books   = uniq(items.map(i=>i.book)).sort();
  const lvls    = uniq(items.map(i=>i.level)).sort();
  const posTokens = uniq(
    items.flatMap(i => (i.pos||"").toLowerCase().match(/\b[a-z]{1,6}\./g) || [])
  ).sort();

  const opt = (val, text)=> `<option value="${val}">${text}</option>`;
  if (selBook) {
    selBook.innerHTML = opt("","Book: All") + books.map(v=>opt(v,v||"—")).join("");
  }

  // 初次建立 Lesson：先不限定（等 restoreFromUrl 後會依 Book 再重建一次）
  if (selLesson) {
    const lessonsAll = uniq(items.map(i=>i.lesson)).sort();
    selLesson.innerHTML = opt("","Lesson: All") + lessonsAll.map(v=>opt(v,v||"—")).join("");
  }

  if (selLevel)  selLevel.innerHTML  = opt("","TOCFL: All")  + lvls.map(v=>opt(v,v||"—")).join("");
  if (selPos)    selPos.innerHTML    = opt("","POS: All")    + posTokens.map(v=>opt(v,v||"—")).join("");
}

function formatTime(sec){
  const m = String(Math.floor(sec/60)).padStart(2,"0");
  const s = String(sec%60).padStart(2,"0");
  return `${m}:${s}`;
}

function startTimer(){
  stopTimer();
  state.sec = 0;
  if (timerEl) timerEl.textContent = "00:00";
  state.timerId = setInterval(()=>{
    state.sec += 1;
    if (timerEl) timerEl.textContent = formatTime(state.sec);
  }, 1000);
}
function stopTimer(){
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
}

/** 確保 3D 翻牌骨架存在：.card > .card-inner > (.front/.back) */
function ensureFlipDom(){
  const card = document.getElementById("card");
  if (!card) return;
  let inner = card.querySelector(".card-inner");
  const front = card.querySelector(".front");
  const back  = card.querySelector(".back");
  if (!inner && (front || back)) {
    inner = document.createElement("div");
    inner.className = "card-inner";
    if (front) inner.appendChild(front);
    if (back)  inner.appendChild(back);
    card.appendChild(inner);
  }
}

/** 由 JS 生成模式選項，避免重複 */
function buildModes(){
  if (!modeBox) return;
  modeBox.innerHTML = ""; // 關鍵：先清空

  const modes = [
    { id: "modeZh",      label: "See Chinese → Guess meaning",      value: "front-zh",      checked: true  },
    { id: "modeForeign", label: "See French/English → Say Chinese", value: "front-foreign", checked: false },
  ];

  for (const m of modes) {
    const lab = document.createElement("label");
    lab.className = "radio";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "mode";
    input.id = m.id;
    input.value = m.value;
    if (m.checked) input.checked = true;

    const span = document.createElement("span");
    span.textContent = m.label;

    lab.appendChild(input);
    lab.appendChild(span);
    modeBox.appendChild(lab);
  }

  // 更新全域參考
  modeZh = el("modeZh");
  modeForeign = el("modeForeign");
}

function getCheckedMode(){
  const m = document.querySelector('input[name="mode"]:checked');
  return m ? m.value : "front-zh";
}

// 依語言更新 Mode 顯示文字（確實抓到 span，不用 lastChild）
function refreshModeLabels(){
  const langText = selLang && selLang.value === "fr" ? "French" : "English";

  const lbl1 = modeZh ? modeZh.closest("label") : null;
  const lbl2 = modeForeign ? modeForeign.closest("label") : null;

  const span1 = lbl1 ? lbl1.querySelector("span") : null;
  const span2 = lbl2 ? lbl2.querySelector("span") : null;

  if (span1) span1.textContent = "See Chinese → Guess meaning";
  if (span2) span2.textContent = `See ${langText} → Say Chinese`;
}

// ---------- 渲染 ----------
function renderCard() {
  if (!frontEl || !backEl || !progressEl) return;
  const total = state.items.length;

  if (total === 0){
    frontEl.innerHTML = "—";
    backEl.innerHTML  = "No cards. Try adjusting filters.";
    progressEl.textContent = "0 / 0";
    showFace(true);
    return;
  }

  // 循環邊界
  state.index = (state.index + total) % total;

  const item = state.items[state.index];
  const hanzi  = escapeHtml(item.hanzi || "");
  const pinyin = state.showPinyin ? `<div class="pinyin">${escapeHtml(item.pinyin || "")}</div>` : "";
  const meaning =
    state.lang === "fr"
      ? (item.meaning?.fr || item.meaning?.en || "")
      : (item.meaning?.en || item.meaning?.fr || "");

  if (state.mode === "front-zh"){
    frontEl.innerHTML = `<div class="hanzi" style="font-size:2.2rem">${hanzi}</div>${pinyin}`;
    backEl.innerHTML  = `<div class="meaning">${escapeHtml(meaning)}</div>`;
  }else{
    frontEl.innerHTML = `<div class="meaning">${escapeHtml(meaning)}</div>`;
    backEl.innerHTML  = `<div class="hanzi" style="font-size:2.2rem">${hanzi}</div>${pinyin}`;
  }

  progressEl.textContent = `${state.index + 1} / ${total}`;
  showFace(state.isFront); // 以 3D 翻牌顯示正反面
}

/** 以 3D 翻牌控制顯示：切換 .card.flipped */
function showFace(front){
  state.isFront = front;
  if (cardEl) cardEl.classList.toggle("flipped", !front);
}

// ---------- 牌堆：建立/重置/抽一回合 ----------
/** 由目前 pool 重置 deck（洗牌） */
function resetDeck(poolItems, signature){
  const idToItem = new Map();
  const poolIds = poolItems.map(it => {
    const id = itemId(it);
    idToItem.set(id, it);
    return id;
  });
  shuffleInPlace(poolIds);

  state.deck.signature   = signature;
  state.deck.idToItem    = idToItem;
  state.deck.poolIds     = poolIds;
  state.deck.remainingIds= poolIds.slice(); // 複製一份當「尚未抽出」
}

/** 從 deck.remainingIds 取 size 張；不夠就重洗補滿；回傳 items[] */
function drawOneRound(size){
  const d = state.deck;
  if (!d.poolIds.length) return [];

  const takeIds = [];
  while (takeIds.length < size) {
    if (d.remainingIds.length === 0) {
      // 抽完一輪 → 重洗整個 pool，繼續補
      d.remainingIds = d.poolIds.slice();
      shuffleInPlace(d.remainingIds);
    }
    takeIds.push(d.remainingIds.shift());
  }
  return takeIds.map(id => d.idToItem.get(id)).filter(Boolean);
}

// ---------- 套用篩選 + 生成牌堆 + 抽本回合 ----------
function applyAndStart(){
  // 讀控制項值
  const book   = selBook?.value || "";
  const lesson = selLesson?.value || "";
  const level  = selLevel?.value || "";
  const posSel = (selPos?.value || "").toLowerCase();
  const lang   = (selLang && selLang.value === "en") ? "en" : "fr";
  const showPinyin = !!(chkPinyin && chkPinyin.checked);
  const size   = Math.min(50, Math.max(1, parseInt(selSize?.value||"20",10)));
  const mode   = getCheckedMode();

  // 寫回 URL（不把 deck 狀態寫入）
  setUrlState({
    book, lesson, level, pos: selPos?.value || "", lang, set: undefined,
    difficulty: undefined,
    mode, showPinyin, size
  });

  // 記到 state
  state.lang = lang;
  state.showPinyin = showPinyin;
  state.mode = mode;
  state.size = size;

  // 依條件過濾出 pool
  let pool = all.items.slice();
  if (book)   pool = pool.filter(i => i.book === book);
  if (lesson) pool = pool.filter(i => i.lesson === lesson);
  if (level)  pool = pool.filter(i => (i.level||"").toUpperCase() === level.toUpperCase());
  if (posSel) pool = pool.filter(i => (i.pos||"").toLowerCase().includes(posSel));

  // 建立/檢查簽章；若條件或 pool 變動 → 重置 deck
  const signature = makeSignature({book, lesson, level, posSel});
  const poolChanged = (()=>{
    if (signature !== state.deck.signature) return true;
    // 快速比對：數量不同必定改變；數量相同再抽樣比對幾個 id
    if (pool.length !== state.deck.idToItem.size) return true;
    // 粗略檢查前 20 個 id 是否都在 deck 中（夠用）
    const sample = pool.slice(0, 20);
    for (const it of sample) {
      if (!state.deck.idToItem.has(itemId(it))) return true;
    }
    return false;
  })();

  if (poolChanged) {
    resetDeck(pool, signature);
  }

  // 抽本回合 size 張（不夠就自動重洗補滿）
  state.items = drawOneRound(size);

  // 重置顯示狀態與計時
  state.index = 0;
  state.isFront = true;
  startTimer();

  // 渲染
  renderCard();
  refreshModeLabels();
}

// ---------- 還原 URL 狀態到控制項 ----------
function setModeRadio(val){
  const v = (val === "front-foreign") ? "front-foreign" : "front-zh";
  const m = document.getElementById(v === "front-foreign" ? "modeForeign" : "modeZh");
  if (m) m.checked = true;
}

function restoreFromUrl(){
  const u = getUrlState(); // { book, lesson, level, pos, lang, mode, showPinyin, size ...}

  if (selBook)   selBook.value   = u.book   || "";
  // 先依「已還原的 book」重建對應 lessons，再套用 URL 裡的 lesson
  setLessonOptionsForBook(selBook ? selBook.value : "", false);

  if (selLesson) selLesson.value = u.lesson || "";
  if (selLevel)  selLevel.value  = u.level  || "";
  if (selPos)    selPos.value    = u.pos    || "";
  if (selLang)   selLang.value   = (u.lang || "fr").toLowerCase() === "en" ? "en" : "fr";
  if (chkPinyin) chkPinyin.checked = (String(u.showPinyin ?? "true") !== "false");
  if (selSize)   selSize.value   = String(Math.min(50, Math.max(1, parseInt(u.size || "20",10))));

  setModeRadio(u.mode || "front-zh");
  refreshModeLabels();

  // 同步到 state（尚未抽牌；按 Start 或自動 init 時會抽）
  state.lang = selLang ? selLang.value : "fr";
  state.showPinyin = !!(chkPinyin && chkPinyin.checked);
  state.mode = getCheckedMode();
  state.size = parseInt(selSize?.value || "20", 10);
}

// ---------- 語音：念目前卡 ----------
function speakCurrent() {
  if (!state.items.length) return;
  const item = state.items[state.index];

  if (state.mode === "front-zh") {
    if (state.isFront) {
      tts.speak(item.hanzi || "", "zh-TW");
    } else {
      if (state.lang === "fr") tts.speak(item.meaning?.fr || item.meaning?.en || "", "fr-FR");
      else tts.speak(item.meaning?.en || item.meaning?.fr || "", "en-US");
    }
  } else {
    if (state.isFront) {
      if (state.lang === "fr") tts.speak(item.meaning?.fr || item.meaning?.en || "", "fr-FR");
      else tts.speak(item.meaning?.en || item.meaning?.fr || "", "en-US");
    } else {
      tts.speak(item.hanzi || "", "zh-TW");
    }
  }
}

// ---------- 互動 ----------
function go(delta){
  tts.cancel();
  const len = state.items.length;
  if (!len) return;
  state.index = (state.index + delta + len) % len;
  state.isFront = true;
  renderCard();
}

function flip(){
  tts.cancel();
  showFace(!state.isFront);
}

// 綁定
if (btnStart) btnStart.addEventListener("click", applyAndStart);
if (selLang)  selLang.addEventListener("change", () => refreshModeLabels());

// ✅ 新增：Book 改變時，重建對應 Lesson 選單（若原選項不在清單內則清空）
if (selBook) {
  selBook.addEventListener("change", () => {
    const before = selLesson ? selLesson.value : "";
    setLessonOptionsForBook(selBook.value || "", true);
    // 如果原來選的 lesson 不在新清單中，setLessonOptionsForBook 已清空
  });
}

if (prevBtn) prevBtn.addEventListener("click", ()=> go(-1));
if (nextBtn) nextBtn.addEventListener("click", ()=> go(+1));
if (cardEl)  cardEl.addEventListener("click", flip);

// Speak 按鈕 + 快捷鍵
if (speakBtn) speakBtn.addEventListener("click", speakCurrent);
window.addEventListener("keydown", (e)=>{
  if (e.key === "ArrowLeft") go(-1);
  else if (e.key === "ArrowRight") go(+1);
  else if (e.key === " " || e.key === "Enter") flip();
  else if (e.key?.toLowerCase?.() === "s") speakCurrent();
});

// ---------- 初始化 ----------
async function init(){
  ensureFlipDom();        // 1) 先確保翻牌骨架
  buildModes();           // 2) 產生模式（避免重複）
  await loadAllItems();   // 3) 載資料
  buildFiltersOptions();  // 4) 建立篩選下拉
  restoreFromUrl();       // 5) 從網址還原控制項與模式

  // 預設：直接起一回合（依目前 URL 篩選）
  applyAndStart();        // 6) Start（會建立/沿用牌堆並抽本回合）
}
init();
