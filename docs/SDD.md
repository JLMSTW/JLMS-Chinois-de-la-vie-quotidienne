# JLMS 生活華語｜Software Design Document (SDD)

> **版本**：v1.0  
> **日期**：2026-04-20  
> **對應 SPEC**：v1.4  
> **用途**：自用設計紀錄——修改現有功能或未來建立類似專案時的參考依據

---

## 目錄

1. [系統架構](#1-系統架構)
2. [模組設計](#2-模組設計)
3. [資料流](#3-資料流)
4. [狀態管理模式](#4-狀態管理模式)
5. [資料庫與 GAS API](#5-資料庫與-gas-api)
6. [認證與權限](#6-認證與權限)
7. [語音系統](#7-語音系統)
8. [UI 設計系統](#8-ui-設計系統)
9. [新增遊戲 SOP](#9-新增遊戲-sop)
10. [部署流程](#10-部署流程)
11. [已知限制與注意事項](#11-已知限制與注意事項)

---

## 1. 系統架構

### 1.1 全站架構圖

```
[瀏覽器]
    │
    ├─ HTML/CSS/JS (靜態檔案)
    │   └─ 部署於 GitHub Pages
    │
    ├─ Google Apps Script (GAS) Web App ──→ Google Sheets
    │   └─ 資料 API（JSON 格式）
    │       ├─ GAS_ENDPOINT：遊戲/生詞/例句資料
    │       └─ ACCESS_ENDPOINT：學生帳號與 accessLevel
    │
    ├─ Firebase Authentication
    │   └─ 帳號密碼登入驗證
    │
    └─ Vercel Serverless (輕量後端)
        └─ api/speak.js：OpenAI TTS 代理
            └─ 保護 OPENAI_API_KEY（環境變數）
```

### 1.2 頁面層級關係

```
index.html          ← 登入入口（Firebase Auth）
    └── dashboard.html   ← My Learning Hub（登入後才能進入）
            ├── home.html           ← Shadowing 跟讀（需登入）
            ├── games/index.html    ← 遊戲列表（不需登入）
            │       ├── memory-match/
            │       ├── flash-cards/
            │       ├── sentence-puzzle/
            │       └── classifier-quiz/
            ├── lesson-quiz/index.html   ← 單課測驗（需登入）
            └── speaking.html            ← 口說練習（開發中）
```

### 1.3 JS 模組依賴圖

```
所有頁面
    └── js/config.js          ← 唯一端點設定來源

需登入頁面
    └── js/auth.js            ← Firebase 登入/登出/狀態監聽
        └── js/firebase-config.js

遊戲/測驗 JS
    ├── js/shared/dataAdapter.js   ← GAS 資料正規化
    ├── js/shared/shuffle.js       ← 洗牌與抽樣
    ├── js/shared/timer.js         ← 計時格式化
    ├── js/shared/urlState.js      ← URL 參數持久化
    ├── js/shared/dom.js           ← HTML 逸出工具
    └── js/shared/errorUi.js       ← 載入錯誤提示
```

---

## 2. 模組設計

### 2.1 js/config.js — 端點設定

**職責**：全站唯一一份端點與分頁名稱設定，所有模組 import 此處取得 API URL。

```javascript
// 端點
export const GAS_ENDPOINT    // 主資料 API（生詞 / 例句 / 遊戲）
export const ACCESS_ENDPOINT // 學生帳號 API（accessLevel / name）

// 試算表設定
export const SHEET_ID        // Google Sheet ID（備用）
export const SHEETS = {
  games:    "Games",
  memory:   "Memory Match",
  sentence: "Sentence Builder",
}

// 欄位偏好（預設繁體台灣）
export const PREF = {
  hanzi:  "chinese_tr",
  pinyin: "pinyin_tw",
}
```

**修改時機**：GAS 重新部署後 URL 會變動，只需改這裡一處。

---

### 2.2 js/shared/dataAdapter.js — 資料正規化

**職責**：將 GAS 回傳的原始物件（欄位名稱可能大小寫不一）轉為統一格式。

```javascript
adaptMemoryItem(x, PREF) → {
  id, book, lesson, level, pos,
  hanzi, pinyin,
  meaning: { fr, en },
  active
}
```

**設計原則**：使用 `??` 鏈式 fallback 處理欄位別名（如 `set_id ?? setId`），呼叫端不需再處理大小寫問題。

**使用者**：Memory Match、Flashcards、Lesson Quiz Round 1 / 4 / 5

---

### 2.3 js/shared/shuffle.js — 隨機工具

```javascript
shuffle(array)       // Fisher-Yates 原地洗牌，回傳同陣列
sample(array, n)     // 隨機抽 n 個不重複元素，回傳新陣列
```

**使用者**：所有遊戲的選項生成與題目抽取。

---

### 2.4 js/shared/timer.js — 計時器

```javascript
formatTime(seconds) → "mm:ss"   // 格式化顯示
```

計時邏輯由各頁面自行維護 `setInterval`，timer.js 只負責格式化。

---

### 2.5 js/shared/urlState.js — URL 參數

**職責**：讀寫 URL query string，讓篩選條件（book/lesson/lang 等）在重新整理後保留。

**支援參數**：`difficulty`, `book`, `lesson`, `level`, `pos`, `lang`, `set`

---

### 2.6 api/speak.js — OpenAI TTS 代理

**職責**：接受前端 POST 請求（含 `text` 參數），呼叫 OpenAI TTS API，回傳 MP3 音訊。

```
POST /api/speak
Body: { text: "你好", voice: "nova" }
→ 200 Content-Type: audio/mpeg + binary MP3
```

**CORS**：OPTIONS 預檢回 204；正式請求附 CORS header。  
**安全**：`OPENAI_API_KEY` 存於 Vercel 環境變數，前端不可見。

---

### 2.7 遊戲模組共同模式

所有遊戲（Sentence Puzzle / Memory Match / Flashcards / Lesson Quiz）皆遵循相同結構：

```javascript
// 1. 全域狀態物件
const S = { lang, book, lesson, /* 各遊戲特有欄位 */ };

// 2. DOM 捷徑
const $ = id => document.getElementById(id);
const sh = id => $(id).classList.remove('hidden');
const hd = id => $(id).classList.add('hidden');

// 3. 資料載入
async function fetchSheet(sheet) {
  const r = await fetch(`${GAS_ENDPOINT}?sheet=...`);
  return (await r.json()).items || [];
}

// 4. 初始化進入點
async function init() {
  // 載入資料 → 綁定事件 → 顯示篩選畫面
}

init();
```

---

### 2.8 Lesson Quiz（lesson-quiz.js）架構

**狀態機**：`showScreen(name)` 控制四個畫面互斥顯示：

| Screen | 用途 |
|--------|------|
| `filter` | 書本 / 課次 / 語言選擇 |
| `intro` | 關卡說明頁（進關時暫停計時） |
| `question` | 答題畫面 |
| `results` | 雷達圖結算 |

**回合配置（ROUND_DEF）**：

```javascript
const ROUND_DEF = [
  { type: 'vocab-match',    qCount: 10, pts: 0.5 },  // R1: Q0–9
  { type: 'fill-blank',     qCount: 5,  pts: 1   },  // R2: Q10–14
  { type: 'sentence-build', qCount: 5,  pts: 1   },  // R3: Q15–19
  { type: 'listening',      qCount: 10, pts: 0.5 },  // R4: Q20–29
  { type: 'pinyin',         qCount: 5,  pts: 1   },  // R5: Q30–34
];
const Q_START = [0, 10, 15, 20, 30];  // 每回合的全局題號起點
```

**關鍵函式**：

| 函式 | 職責 |
|------|------|
| `buildRounds()` | 從 vocab/sents 各抽題，組裝 5 個回合的問題陣列 |
| `mc4(correct, pool, getFn)` | 生成四選一選項（1 正確 + 3 干擾） |
| `renderQuestion()` | 依 `S.ri` 分派到各 round renderer |
| `gradeAnswer(ans)` | 評分並存入 `S.answers[]` |
| `toneVariants(pinyin)` | 生成同字四聲變體（Round 5 用） |
| `showResults()` | 計分 + 繪 Chart.js 雷達圖 |

**計時設計**：
- 全程一個計時器（`S.timerSec`、`S._tid`）
- 進介紹頁 `pauseTimer()`，答題頁 `startTimer()`
- 結算時記錄 `S.totalTime`

---

### 2.9 Sentence Puzzle（sentence-puzzle.js）架構

**篩選邏輯**：

```javascript
// book 篩選：LESSON_MAP[book] = [lessonMin, lessonMax]
const LESSON_MAP = { B1:[1,5], B2:[6,10], ... };

// lesson 篩選：'all' 或 'L{n}' → 轉為數字比對
// 資料需有 segments_tr（非空）才納入題目
```

**互動機制（點選 + 拖曳）**：

```javascript
// buildState 追蹤當前題目狀態
S.buildState = {
  q,           // 當前問題物件
  arranged,    // 已放入答案區的 [segIdx, ...]
  pool,        // 尚未放入的 [segIdx, ...]
  graded,      // 是否已送出（送出後鎖定）
};
```

- 點選詞組 → `moveSegToAnswer(segIdx)` / `removeSegFromAnswer(pos)`
- 拖曳使用 HTML5 Drag and Drop API（`dragstart` / `dragover` / `drop`）
- 每次互動後呼叫 `renderBuildState()` 重繪 DOM

**評分**：字串完整比對 `arranged.join('') === q.segments_tr.join('')`

---

## 3. 資料流

### 3.1 遊戲資料載入流程

```
頁面載入
  → init()
  → fetch(GAS_ENDPOINT?sheet=Memory+Match)
  → GAS Web App 讀取 Google Sheet 回傳 JSON
  → { items: [ { set_id, chinese_tr, ... }, ... ] }
  → adaptMemoryItem() 正規化
  → 存入 S._allVocab / S._allSents
  → 顯示篩選畫面，等待使用者選擇

使用者按「開始」
  → 依 book/lesson 篩選
  → shuffle() + sample() 抽題
  → 進入遊戲
```

### 3.2 學生登入與 accessLevel 流程

```
Firebase signInWithEmailAndPassword(email, password)
  → 成功 → 取得 Firebase user.email
  → fetch(ACCESS_ENDPOINT?email=...)
  → GAS 查詢「學生資料總表」回傳 { accessLevel, name }
  → 存入 localStorage + 全域狀態
  → 依 accessLevel 灰化超出權限的 Book 按鈕
```

### 3.3 TTS 語音播放流程

```
使用者點擊「發音」按鈕
  │
  ├─ Natural Voice（OpenAI）
  │   → fetch('/api/speak', { text })
  │   → Vercel api/speak.js → OpenAI TTS API
  │   → 回傳 MP3 → new Audio(blobURL).play()
  │
  └─ Web Speech API（備用 / Sentence Puzzle）
      → speechSynthesis.speak(new SpeechSynthesisUtterance(text))
      → 設定 lang='zh-TW', rate=0.9
```

---

## 4. 狀態管理模式

本專案**無使用框架**，以「全域狀態物件 S + 手動 DOM 更新」取代 React/Vue 的響應式系統。

### 4.1 S 物件慣例

每個遊戲/測驗頁面都有一個 `const S = { ... }` 作為單一狀態來源（Single Source of Truth）。

```javascript
const S = {
  // 篩選條件
  lang: 'fr', book: 'B1', lesson: 'all',

  // 原始資料（從 GAS 載入後不再修改）
  _allVocab: [], _allSents: [],

  // 工作資料（每次開始遊戲重新生成）
  vocab: [], sents: [], questions: [],

  // 進行中狀態（每題更新）
  ri: 0, qi: 0,
  answers: [], scores: [],

  // 複雜互動狀態（fill-blank / sentence-build 專用）
  fillState: null, buildState: null,
};
```

**規則**：
- `_` 前綴 = 原始完整資料，不要直接修改
- 無前綴 = 當前篩選/遊戲用的工作資料
- 每次重新開始 (`startGame()`) 時重設工作資料，不重設 `_all*`

### 4.2 DOM 更新慣例

```javascript
// ❌ 避免散落各處的 document.getElementById
// ✅ 統一用捷徑
const $ = id => document.getElementById(id);
const sh = id => $(id).classList.remove('hidden');
const hd = id => $(id).classList.add('hidden');

// 畫面切換：用 classList.toggle('hidden') 而非 display style
function showScreen(name) {
  ['filter','intro','question','results'].forEach(s =>
    $('screen-' + s).classList.toggle('hidden', s !== name)
  );
}
```

---

## 5. 資料庫與 GAS API

### 5.1 GAS 端點呼叫格式

```javascript
// 讀取分頁資料
GET {GAS_ENDPOINT}?sheet={分頁名稱}
→ { items: [ {...}, {...} ] }

// 讀取學生資料
GET {ACCESS_ENDPOINT}?email={email}
→ { accessLevel: 3, name: "王小明" }
```

### 5.2 Memory Match 分頁欄位對應

| GAS 欄位 | adaptMemoryItem 輸出 | 說明 |
|----------|---------------------|------|
| `set_id` | `id` | 格式：`B1_L1` |
| `book` | `book` | `B1`~`B5` |
| `Lesson` | `lesson` | 數字字串，如 `"1"` |
| `chinese_tr` | `hanzi` | 繁體漢字 |
| `pinyin_tw` | `pinyin` | 台灣拼音 |
| `meaning_fr` | `meaning.fr` | 法文 |
| `meaning_en` | `meaning.en` | 英文 |
| `tocfl_level` | `level` | `A2`/`B1`/`B2` |
| `pos` | `pos` | `n.`/`v.`/`adj.` 等 |
| `active` | `active` | `"TRUE"` → `true` |

### 5.3 Sentence Builder 分頁關鍵欄位

| 欄位 | 用途 |
|------|------|
| `set_id` | `B1_L1` |
| `book` | `B1`~`B5` |
| `Lesson` | 課號（數字字串） |
| `gram_no` | 文法編號（顯示用） |
| `chinese_tr` | 完整例句 |
| `pinyin_tw` | 完整例句拼音 |
| `segments_tr` | 以 `/` 分隔的詞組（造句遊戲用）|
| `segments_pinyin_tw` | 斷句拼音 |
| `french_tr` | 法文翻譯 |
| `english_tr` | 英文翻譯 |
| `active` | 是否啟用 |

> **注意**：`segments_tr` 欄位仍在填寫中，程式篩選時需排除空值：
> ```javascript
> sents.filter(s => s.segments_tr && s.segments_tr.length > 0)
> ```

### 5.4 篩選邏輯（通用）

```javascript
// book 篩選
const [min, max] = LESSON_MAP[book]; // e.g. B2 → [6, 10]
items.filter(x => {
  const n = parseInt(x.lesson);
  return n >= min && n <= max;
});

// lesson 篩選（'all' 或 'L3'）
if (lesson !== 'all') {
  const n = parseInt(lesson.replace('L', ''));
  items = items.filter(x => parseInt(x.lesson) === n);
}

// active 篩選（永遠要加）
items = items.filter(x => x.active);
```

---

## 6. 認證與權限

### 6.1 Firebase Auth 設定

- **方式**：Email / Password
- **設定檔**：`js/firebase-config.js`（包含 apiKey 等 Firebase 公開設定，非機密）
- **登入邏輯**：`js/auth.js`

### 6.2 需登入頁面的保護模式

```javascript
// 每個需登入的頁面頂部
import { auth } from '../js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/.../firebase-auth.js';

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = '../index.html';  // 未登入重導
    return;
  }
  // 已登入 → 繼續初始化頁面
});
```

### 6.3 accessLevel 書本權限控制

```
accessLevel 1 → 可用 Book 1
accessLevel 2 → 可用 Book 1–2
accessLevel N → 可用 Book 1–N
accessLevel 10 → 全開（測試/管理員）
```

```javascript
// Book 按鈕渲染
books.forEach((book, i) => {
  const bookNum = i + 1;
  btn.disabled = bookNum > accessLevel && accessLevel !== 10;
  btn.style.opacity = btn.disabled ? '0.4' : '1';
});
```

---

## 7. 語音系統

### 7.1 雙軌語音架構

| 軌道 | API | 速度 | 品質 | 費用 | 使用場景 |
|------|-----|------|------|------|---------|
| Web Speech | 瀏覽器內建 | 快（即時） | 中 | 免費 | Sentence Puzzle、Lesson Quiz 詞組 |
| Natural Voice | OpenAI TTS via `/api/speak` | 慢（~1s） | 高 | 付費 | Shadowing、Lesson Quiz 句子 |

### 7.2 Web Speech 呼叫方式

```javascript
function speak(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-TW';
  u.rate = 0.9;
  speechSynthesis.cancel();   // 取消前一句（避免排隊）
  speechSynthesis.speak(u);
}
```

### 7.3 OpenAI TTS 呼叫方式

```javascript
async function speakNatural(text, rate = 1.0) {
  const res = await fetch('/api/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice: 'nova' }),
  });
  const blob = await res.blob();
  const audio = new Audio(URL.createObjectURL(blob));
  audio.playbackRate = rate;
  audio.play();
}
```

---

## 8. UI 設計系統

### 8.1 設計代幣（Design Tokens）

| Token | 值 | 用途 |
|-------|----|------|
| `--bg` | `#1f213b` | 頁面背景（深藍） |
| `--card` | `#566fb8` | 主要卡片、按鈕 |
| `--card-dark` | `#3d5294` | 次要卡片、hover 狀態 |
| `--red` | `#c64049` | 文法編號標示 |
| `--btn-radius` | `999px` | 藥丸形按鈕 |

### 8.2 共用 CSS 架構

```
style/
├── base.css       ← CSS reset、變數、通用元素
├── main.css       ← 全域版面（nav、container）
├── dashboard.css  ← Dashboard 功能卡片
└── shadowing.css  ← Shadowing 專用
```

每個遊戲也有自己的 `[game].css`，只放遊戲專用樣式，通用樣式從 `style/base.css` 繼承。

### 8.3 多語言（EN/FR）

```javascript
// 語言偏好存於 localStorage
const lang = localStorage.getItem('lang') || 'fr';

// 語言切換按鈕（每頁右上角）
btnFR.addEventListener('click', () => setLang('fr'));
btnEN.addEventListener('click', () => setLang('en'));

function setLang(l) {
  localStorage.setItem('lang', l);
  S.lang = l;
  renderUI();  // 重新繪製所有文字
}
```

---

## 9. 新增遊戲 SOP

### 9.1 Google Sheet 端

1. 確認資料分頁存在於 Games DB
2. 在 `Games` 分頁新增一列：填寫 `slug`、`title`、`path`、`active=TRUE` 等欄位

### 9.2 前端檔案

```
games/
└── your-game/
    ├── index.html
    ├── your-game.css
    └── your-game.js
```

### 9.3 JS 骨架（複製這個開始）

```javascript
import { GAS_ENDPOINT, SHEETS } from '../../js/config.js';
import { shuffle, sample } from '../../js/shared/shuffle.js';
import { adaptMemoryItem } from '../../js/shared/dataAdapter.js';

const S = {
  lang: localStorage.getItem('lang') || 'fr',
  book: 'B1', lesson: 'all',
  _allItems: [], items: [],
};

const $ = id => document.getElementById(id);
const sh = id => $(id).classList.remove('hidden');
const hd = id => $(id).classList.add('hidden');

async function fetchSheet(sheet) {
  const r = await fetch(`${GAS_ENDPOINT}?sheet=${encodeURIComponent(sheet)}`, { credentials: 'omit' });
  return (await r.json()).items || [];
}

async function init() {
  const raw = await fetchSheet(SHEETS.memory);  // 或 SHEETS.sentence
  S._allItems = raw.map(x => adaptMemoryItem(x)).filter(x => x.active);
  // 綁定篩選按鈕事件
  // 顯示篩選畫面
}

init();
```

### 9.4 注意事項

- 篩選時永遠先 `.filter(x => x.active)`
- `lesson` 欄位是**字串型數字**，比較前先 `parseInt()`
- `segments_tr` 可能為空，使用前需檢查
- 多語言文字統一用 `S.lang` 決定顯示 `meaning.fr` 或 `meaning.en`

---

## 10. 部署流程

### 10.1 前端（GitHub Pages）

```bash
git add .
git commit -m "feat: ..."
git push origin main
# GitHub Actions 或 Pages 自動部署
# 部署網址：https://jlmstw.github.io/JLMS-Chinois-de-la-vie-quotidienne/
```

### 10.2 Vercel 後端（api/）

- 推送到 main 分支後 Vercel 自動部署
- 環境變數 `OPENAI_API_KEY` 在 Vercel Dashboard 設定，不進 git

### 10.3 GAS 更新

- 修改 Google Apps Script 後須手動點「部署 → 管理部署 → 建立新版本」
- 若 URL 改變，更新 `js/config.js` 的端點

---

## 11. 已知限制與注意事項

### 11.1 GAS API 限制

- **免費額度**：Google Apps Script 每日 20,000 次呼叫上限（免費帳號）
- **冷啟動延遲**：GAS 久未使用時首次呼叫可能慢 2–5 秒
- **CORS**：GAS Web App 已設定允許所有來源，但需部署模式為「任何人，包含匿名使用者」

### 11.2 segments_tr 資料不完整

- 目前 Sentence Builder 分頁的 `segments_tr` 欄位仍在填寫中
- Sentence Puzzle 和 Lesson Quiz Round 3 需篩除空值
- 若某課的句子全無 `segments_tr`，遊戲開始時會無題可出

### 11.3 segments_alt_tr 尚未實作

- 部分句子的詞序可互換（如「我昨天」↔「昨天我」）
- 目前只接受主答案，計畫新增 `segments_alt_tr` 欄位支援備選答案
- 程式端預留架構，等欄位上線後擴充

### 11.4 iOS Safari 相容性

- Web Speech API 在 iOS 需使用者操作觸發（不能自動播放）
- 列印功能在 iOS 需透過「分享 → 儲存至檔案」，已加提示

### 11.5 純前端架構限制

- 無法做伺服器端的學習紀錄儲存（目前測驗結果不存檔）
- 學習分析（Learning Analytics）功能需另建後端或改用 Firebase Firestore

---

## 附錄：常用程式碼片段

### 從 GAS 抓資料

```javascript
async function fetchSheet(sheet) {
  const r = await fetch(
    `${GAS_ENDPOINT}?sheet=${encodeURIComponent(sheet)}`,
    { credentials: 'omit' }
  );
  return (await r.json()).items || [];
}
```

### 四選一干擾項生成

```javascript
function mc4(correct, pool, getFn) {
  const distractors = sample(
    pool.filter(v => getFn(v) && getFn(v) !== correct),
    3
  ).map(getFn);
  while (distractors.length < 3) distractors.push('—');
  return shuffle([correct, ...distractors]);
}
```

### Pinyin 四聲變體（Lesson Quiz Round 5）

```javascript
function toneVariants(pinyin) {
  // 找到聲調符號，生成 1–4 聲四個版本
  // 無聲調時 fallback 至隨機干擾項
}
```

### URL 狀態持久化

```javascript
import { loadFromUrl, saveToUrl } from '../../js/shared/urlState.js';

// 頁面載入時恢復
const saved = loadFromUrl();
if (saved.book) S.book = saved.book;

// 使用者選擇後儲存
saveToUrl({ book: S.book, lesson: S.lesson, lang: S.lang });
```
