// FCv1.2-4 + FCv1.2-5：篩選列 + Start + URL 還原/寫回 + Size/ShowPinyin/Mode + TTS Speak
import { GAS_ENDPOINT, SHEETS, PREF } from "/js/config.js";
import { adaptMemoryItem } from "/js/shared/dataAdapter.js";
import { showDataLoadError } from "/js/shared/errorUi.js";
import { escapeHtml } from "/js/shared/dom.js";
import { get as getUrlState, set as setUrlState } from "/js/shared/urlState.js";

const all = { items: [] }; // 全量資料（未過濾）

const state = {
  items: [],
  index: 0,
  lang: "fr",           // 'fr' | 'en'
  showPinyin: true,
  mode: "front-zh",     // 'front-zh' | 'front-foreign'
  size: 20,             // 10~50
  timerId: null,
  sec: 0,
  isFront: true,
};

// ---- TTS 管理 ----
const tts = {
  lastUtter: null,
  speak(text, lang) {
    if (!text) return;
    try {
      window.speechSynthesis.cancel(); // 先停掉上一段
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || "zh-TW"; // zh-TW / fr-FR / en-US
      u.rate = 1.0;
      u.pitch = 1.0;
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

// DOM
const el = (id) => document.getElementById(id);
const cardEl = el("card");
const frontEl = cardEl?.querySelector(".front");
const backEl  = cardEl?.querySelector(".back");
const progressEl = el("progress");
const timerEl = el("timer");

const selBook   = el("filterBook");
const selLesson = el("filterLesson");
const selLevel  = el("filterLevel");
const selPos    = el("filterPos");
const selLang   = el("filterLang");
const chkPinyin = el("chkPinyin");
const selSize   = el("selSize");
const btnStart  = el("startBtn");
const modeZh    = el("modeZh");
const modeForeign = el("modeForeign");

// Buttons already in your HTML
const prevBtn = el("prevBtn");
const nextBtn = el("nextBtn");
const speakBtn = el("speakBtn");

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
const by    = (k) => (a,b)=> String(a[k]||"").localeCompare(String(b[k]||""));

function buildFiltersOptions() {
  const items = all.items;
  const books   = uniq(items.map(i=>i.book)).sort();
  const lessons = uniq(items.map(i=>i.lesson)).sort(by(undefined));
  const lvls    = uniq(items.map(i=>i.level)).sort();
  const posTokens = uniq(
    items.flatMap(i => (i.pos||"").toLowerCase().match(/\b[a-z]{1,6}\./g) || [])
  ).sort();

  const opt = (val, text)=> `<option value="${val}">${text}</option>`;
  selBook.innerHTML   = opt("","Book: All")   + books.map(v=>opt(v,v||"—")).join("");
  selLesson.innerHTML = opt("","Lesson: All") + lessons.map(v=>opt(v,v||"—")).join("");
  selLevel.innerHTML  = opt("","TOCFL: All")  + lvls.map(v=>opt(v,v||"—")).join("");
  selPos.innerHTML    = opt("","POS: All")    + posTokens.map(v=>opt(v,v||"—")).join("");
}

function formatTime(sec){
  const m = String(Math.floor(sec/60)).padStart(2,"0");
  const s = String(sec%60).padStart(2,"0");
  return `${m}:${s}`;
}

function startTimer(){
  stopTimer();
  state.sec = 0;
  timerEl.textContent = "00:00";
  state.timerId = setInterval(()=>{
    state.sec += 1;
    timerEl.textContent = formatTime(state.sec);
  }, 1000);
}
function stopTimer(){
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
}

// 依語言更新 Mode 顯示文字
function refreshModeLabels(){
  const langText = selLang.value === "fr" ? "French" : "English";
  const lbl1 = modeZh.parentElement;
  const lbl2 = modeForeign.parentElement;
  if (lbl1) lbl1.lastChild.textContent = " See Chinese → Guess meaning";
  if (lbl2) lbl2.lastChild.textContent = ` See ${langText} → Say Chinese`;
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
  showFace(state.isFront);
}

function showFace(front){
  state.isFront = front;
  frontEl.style.display = front ? "block" : "none";
  backEl.style.display  = front ? "none"  : "block";
}

// ---------- 套用篩選 + 生成牌堆 ----------
function applyAndStart(){
  // 讀控制項值
  const book   = selBook.value || "";
  const lesson = selLesson.value || "";
  const level  = selLevel.value || "";
  const posSel = (selPos.value || "").toLowerCase();
  const lang   = selLang.value === "en" ? "en" : "fr";
  const showPinyin = !!chkPinyin.checked;
  const size   = Math.min(50, Math.max(1, parseInt(selSize.value||"20",10)));
  const mode   = (modeForeign.checked ? "front-foreign" : "front-zh");

  // 寫回 URL
  setUrlState({
    book, lesson, level, pos: selPos.value || "", lang, set: undefined,
    difficulty: undefined,  // 清掉跟另個遊戲無關的
    mode, showPinyin, size
  });

  // 把選擇記到 state
  state.lang = lang;
  state.showPinyin = showPinyin;
  state.mode = mode;
  state.size = size;

  // 過濾
  let pool = all.items.slice();
  if (book)   pool = pool.filter(i => i.book === book);
  if (lesson) pool = pool.filter(i => i.lesson === lesson);
  if (level)  pool = pool.filter(i => (i.level||"").toUpperCase() === level.toUpperCase());
  if (posSel) pool = pool.filter(i => (i.pos||"").toLowerCase().includes(posSel));

  // 限制數量（順序取前 size）
  state.items = pool.slice(0, size);

  // 重置狀態與計時器
  state.index = 0;
  state.isFront = true;
  startTimer();

  // 渲染
  renderCard();

  // 依 lang 更新模式文字
  refreshModeLabels();
}

// ---------- 還原 URL 狀態到控制項 ----------
function restoreFromUrl(){
  const u = getUrlState(); // { book, lesson, level, pos, lang, mode, showPinyin, size ...}
  selBook.value   = u.book   || "";
  selLesson.value = u.lesson || "";
  selLevel.value  = u.level  || "";
  selPos.value    = u.pos    || "";
  selLang.value   = (u.lang || "fr").toLowerCase() === "en" ? "en" : "fr";
  chkPinyin.checked = (String(u.showPinyin ?? "true") !== "false");
  selSize.value   = String(Math.min(50, Math.max(1, parseInt(u.size || "20",10))));
  if ((u.mode || "front-zh") === "front-foreign"){
    modeForeign.checked = true;
  }else{
    modeZh.checked = true;
  }
  // 先更新模式文字
  refreshModeLabels();

  // 同步到 state（尚未套用過濾，等按 Start）
  state.lang = selLang.value;
  state.showPinyin = chkPinyin.checked;
  state.mode = modeForeign.checked ? "front-foreign" : "front-zh";
  state.size = parseInt(selSize.value,10);
}

// ---------- 語音：念目前卡 ----------
function speakCurrent() {
  if (!state.items.length) return;
  const item = state.items[state.index];

  if (state.mode === "front-zh") {
    if (state.isFront) {
      // 正面：念中文
      tts.speak(item.hanzi || "", "zh-TW");
    } else {
      // 背面：念外語
      if (state.lang === "fr") tts.speak(item.meaning?.fr || item.meaning?.en || "", "fr-FR");
      else tts.speak(item.meaning?.en || item.meaning?.fr || "", "en-US");
    }
  } else {
    // 之後若切到 front-foreign 模式
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
  tts.cancel(); // 新增：換卡停止前一段語音
  if (state.items.length === 0) return;
  state.index = (state.index + delta + state.items.length) % state.items.length;
  state.isFront = true;
  renderCard();
}
function flip(){
  tts.cancel(); // 新增：翻面停止前一段語音
  showFace(!state.isFront);
}

// 綁定
if (btnStart) btnStart.addEventListener("click", applyAndStart);
if (selLang)  selLang.addEventListener("change", () => refreshModeLabels());

const prevBtnEl = prevBtn, nextBtnEl = nextBtn;
if (prevBtnEl) prevBtnEl.addEventListener("click", ()=> go(-1));
if (nextBtnEl) nextBtnEl.addEventListener("click", ()=> go(+1));
if (cardEl)    cardEl.addEventListener("click", flip);

// Speak 按鈕 + 快捷鍵（S）
if (speakBtn) speakBtn.addEventListener("click", speakCurrent);
window.addEventListener("keydown", (e)=>{
  if (e.key === "ArrowLeft") go(-1);
  else if (e.key === "ArrowRight") go(+1);
  else if (e.key === " " || e.key === "Enter") flip();
  else if (e.key?.toLowerCase?.() === "s") speakCurrent();
});

// ---------- 初始化 ----------
async function init(){
  await loadAllItems();
  buildFiltersOptions();
  restoreFromUrl();   // 從網址還原控制項
  // 初次載入也直接依 URL 狀態開始一次（等同按 Start）
  applyAndStart();
}
init();
