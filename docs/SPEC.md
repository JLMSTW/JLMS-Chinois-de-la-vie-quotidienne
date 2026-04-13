# JLMS Chinois de la vie quotidienne｜JLMS 生活華語

## 專案規格書 Project Specification

> **版本**：v1.2
> **日期**：2026-04-13
> **狀態**：已上線，持續開發中

---

## 1. 專案概述 Overview

### 1.1 專案簡介

JLMS 生活華語是一個中文教學輔助網站，專為法語母語的中文學習者設計，搭配同名實體教材使用。網站提供例句跟讀（Shadowing）、互動遊戲、單課測驗等多元學習工具，幫助學生在課後進行自主練習。

### 1.2 教材結構

| 書本 | 課程範圍 | 備註 |
|------|---------|------|
| Book 1 (B1) | L1 ~ L5 | 已上線 |
| Book 2 (B2) | L6 ~ L10 | 已上線 |
| Book 3 (B3) | L11 ~ L15 | 已上線 |
| Book 4 (B4) | L16 ~ L20 | 已上線 |
| Book 5 (B5) | L21 ~ L25 | 已上線 |

> **備註**：教材未來可能新增更多冊次，書本與課程資料透過 Google Sheet 管理，方便擴充。

### 1.3 目標使用者

- 法語母語的中文學習者（主要）
- 英語使用者（部分功能支援英文介面）

### 1.4 部署資訊

- **前端託管**：GitHub Pages
- **後端託管**：Vercel（Serverless Functions）
- **網站類型**：前後端分離（前端靜態網站 + Vercel 輕量後端）
- **前端網址**：`https://jlmstw.github.io/JLMS-Chinois-de-la-vie-quotidienne/`

---

## 2. 技術架構 Technical Architecture

### 2.1 架構總覽

本專案採用前後端分離架構：前端為靜態網站，部署於 GitHub Pages；後端使用 Vercel Serverless Functions 作為輕量後端（API Proxy），負責保護 API key 並代理外部 API 請求。

```
學生瀏覽器（前端）
    ↓ 請求
GitHub Pages（HTML / CSS / JS）
    ↓ API 請求
Vercel Serverless Functions（輕量後端）
    ├── 安全存放 API Key（環境變數）
    └── 代理呼叫 OpenAI API
    ↓ 回傳結果
學生聽到語音 / 收到 AI 回應
```

### 2.2 前端技術

- **HTML / CSS / JavaScript**：純前端，無使用前端框架（如 React、Vue 等）
- **靜態網站**：部署於 GitHub Pages

### 2.3 輕量後端 Backend（Vercel Serverless Functions）

| 項目 | 說明 |
|------|------|
| **平台** | Vercel |
| **功能** | Serverless Functions（無伺服器函式） |
| **主要用途** | 作為 API Proxy，保護 API key 不暴露在前端程式碼中 |
| **運作方式** | 前端發送請求 → Vercel 函式收到 → 使用環境變數中的 API key 呼叫 OpenAI API → 將結果回傳前端 |
| **對應檔案** | 專案中的 `api/` 資料夾 |

> **為什麼需要這層？** 如果把 API key 直接寫在前端 JavaScript 中，任何人都能透過瀏覽器開發者工具看到，造成 key 外洩和費用風險。Vercel Serverless Functions 將 key 安全地存放在伺服器端的環境變數中，前端無法直接存取。

### 2.4 第三方雲端服務

| 服務 | 類型 | 用途 |
|------|------|------|
| **Vercel** | 輕量後端（Serverless） | API Proxy，保護 API key 並代理 OpenAI 請求 |
| **Firebase Authentication** | 驗證服務（BaaS） | 學生帳號登入驗證 |
| **Google Sheets API** | 資料庫（BaaS） | 生詞、例句、學生權限、遊戲管理 |
| **OpenAI TTS API** | AI 服務 | 自然語音合成（Natural Voice） |
| **Web Speech API** | 瀏覽器內建 API | 瀏覽器語音合成（備用方案，解決 API 延遲問題） |
| **Chart.js** | 前端圖表庫 | 單課測驗結算雷達圖 |

### 2.5 專案檔案結構（目前）

```
JLMS-Chinois-de-la-vie-quotidienne/
├── api/                    # Vercel Serverless Functions（輕量後端）
├── archive/                # 舊版本地 JSON 資料備份（已遷移至 Google Sheet）
├── data/                   # 本地資料檔案
├── docs/                   # 規格書
│   └── SPEC.md
├── games/                  # 互動遊戲區（不需登入）
│   ├── classifier-quiz/
│   ├── flash-cards/
│   ├── memory-match/
│   ├── sentence-builder/   # 造句練習（開發中）
│   ├── games.css
│   ├── games.js
│   └── index.html
├── js/                     # 共用 JavaScript
│   ├── config.js           # GAS 端點、分頁名稱設定
│   └── shared/
│       ├── dataAdapter.js  # GAS 資料轉換器
│       ├── shuffle.js      # 隨機工具（shuffle / sample）
│       └── timer.js        # 計時格式化工具
├── lesson-quiz/            # 單課測驗（需登入）
│   ├── index.html
│   ├── lesson-quiz.css
│   └── lesson-quiz.js
├── style/                  # 共用樣式
│   ├── base.css
│   ├── dashboard.css
│   ├── main.css
│   └── shadowing.css
├── dashboard.html          # 功能總覽頁（My Learning Hub）
├── home.html               # Shadowing 例句跟讀
├── index.html              # 登入入口
└── speaking.html           # 口說練習頁面
```

---

## 3. 登入與權限系統 Authentication & Access Control

### 3.1 登入流程

1. 教師在 Firebase Console 預先建立學生帳號（email + 固定密碼）
2. 學生使用指定的 email 和密碼登入
3. 登入成功後，系統讀取 Google Sheet「學生資料總表」中該 email 對應的 `accessLevel`
4. 根據 `accessLevel` 控制可存取的書本範圍

### 3.2 權限邏輯

- `accessLevel = 1` → 僅能存取 B1
- `accessLevel = 2` → 可存取 B1、B2
- `accessLevel = 5` → 可存取 B1 ~ B5（全部）
- `accessLevel = 10` → 測試帳號 / 管理員
- 超出權限的書本按鈕顯示為灰色（disabled）

### 3.3 登入需求

| 功能 | 是否需要登入 |
|------|-------------|
| Interactive Games（遊戲區） | 不需要 |
| 句子跟讀練習 Shadowing | 需要登入 |
| 單課測驗 Lesson Quiz | 需要登入 |
| 口說練習 Speaking | 需要登入（計畫中） |

### 3.4 學生資料總表欄位

| 欄位 | 說明 |
|------|------|
| Name | 學生姓名 |
| email | 登入用 email |
| accessLevel | 權限等級（對應可存取的書本數） |
| nationality | 國籍 |
| organisation | 所屬機構 |
| student ID | 學號 |
| contact Name | 聯絡人姓名 |
| Contact Number | 聯絡電話 |
| Contact mail | 聯絡信箱 |

---

## 4. 資料庫設計 Database Design（Google Sheets）

所有資料集中於同一份 Google Sheet：**JLMS_chinois de la vie quotidienne_Games DB**

### 4.1 Games 分頁 — 遊戲管理

控制遊戲列表的顯示與設定。

| 欄位 | 說明 |
|------|------|
| slug | 遊戲識別碼（如 `memory-match`） |
| title | 顯示名稱 |
| description | 遊戲簡介 |
| howto_steps | 操作步驟說明 |
| path | 檔案路徑 |
| active | 是否啟用（TRUE/FALSE） |
| icon | 遊戲圖示 |
| url | 連結網址 |
| tags | 標籤（如 reading、matching、shadowing） |
| order | 顯示排序 |
| login_required | 是否需要登入 |
| enabled | 是否開放 |

### 4.2 Memory Match 分頁 — 生詞庫

供 Memory Match、Flashcards、單課測驗 Round 1 & 4 & 5 共用，約 379 筆資料。

| 欄位 | 說明 |
|------|------|
| set_id | 資料集 ID（如 `B5_L21`） |
| book | 書本編號（B1 ~ B5） |
| Lesson | 課程編號 |
| item_id | 詞彙 ID（如 `B5_L21_01`） |
| vocab_id | 詞彙索引 |
| chinese_tr | 繁體中文 |
| pinyin_tw | 台灣拼音 |
| pinyin_num | 聲調編號 |
| chinese | 簡體中文 |
| pinyin_cn | 中國拼音 |
| pos | 詞性（n. noun / v. verb / adj. / adv. / exp.） |
| meaning_fr | 法語釋義 |
| meaning_en | 英語釋義 |
| default_lang | 預設語言 |
| tocfl_level | TOCFL 中文能力等級（A2 / B1 / B2） |
| active | 是否啟用 |
| review_status | 審核狀態 |

### 4.3 Sentence Builder 分頁 — 文法例句庫

供 Sentence Builder 遊戲、Shadowing 跟讀、單課測驗 Round 2 & 3 & 4 使用。

| 欄位 | 說明 | 狀態 |
|------|------|------|
| set_id | 資料集 ID（如 `B1_L1`） | ✅ |
| book | 書本編號 | ✅ |
| Lesson | 課程編號 | ✅ |
| gram_no | 文法編號（對應實體課本中的文法號碼） | ✅ |
| phrase_id | 例句 ID（如 `B1L010301`） | ✅ |
| grammar_tag_tr | 繁體文法標籤 | ✅ |
| chinese_tr | 繁體中文例句 | ✅ |
| pinyin_tw | 台灣拼音 | ✅ |
| segments_tr | 繁體斷句（以 `/` 分隔，供拖曳排序用） | 🔧 填寫中 |
| segments_pinyin_tw | 斷句拼音 | 🔧 填寫中 |
| grammar_tag_sp | 簡體文法標籤 | ✅ |
| chinese_sp | 簡體中文 | ✅ |
| pinyin_cn | 中國拼音 | ✅ |
| segments_sp | 簡體斷句 | 🔧 填寫中 |
| segments_pinyin_cn | 簡體斷句拼音 | 🔧 填寫中 |
| **french_tr** | **法語例句翻譯** | ⏳ 待新增 |
| **english_tr** | **英語例句翻譯** | ⏳ 待新增 |
| tocfl_level | TOCFL 等級 | ✅ |
| active | 是否啟用 | ✅ |
| review_status | 審核狀態 | ✅ |

> **注意**：`french_tr` 和 `english_tr` 為計畫新增欄位，新增後可啟用單課測驗 Round 4 的**句子聽力理解題**功能。

### 4.4 JLMS_ChatbotPrompt設定 分頁

預留給未來 Speaking Practice 功能使用，存放 OpenAI Chat API 的 system prompt 設定，可依課別或場景管理不同的 prompt。

---

## 5. 已上線功能 Current Features

### 5.0 全站 UI 設計系統

> 自 v1.2 起，所有頁面統一採用以下設計語言：

| 項目 | 值 |
|------|------|
| 背景色 | `#1f213b`（深藍） |
| 主卡片色 | `#566fb8`（中藍） |
| 深卡片色 | `#3d5294` |
| 按鈕形狀 | 藥丸形（`border-radius: 999px`） |
| 字體 | `ui-sans-serif, system-ui`（標題），`Noto Sans TC`（中文） |
| 語言切換 | EN / FR 雙語，`localStorage` 保存偏好 |

### 5.1 登入頁 Login（index.html）

- Firebase Authentication 帳號密碼登入
- 「Play without login」藥丸按鈕 → 直接進遊戲區
- 設計：深藍底色、#566fb8 登入按鈕、藥丸樣式

### 5.2 功能總覽頁 Dashboard（dashboard.html）

**目的**：學生登入後先進入功能總覽頁「My Learning Hub」，一覽所有學習工具。

**頁面結構**：四個功能入口卡片，排列順序暗示學習路徑

| 順序 | 功能名稱 | 狀態 | 學習階段 |
|------|---------|------|---------|
| 1 | Shadowing 例句跟讀 | ✅ 已上線 | 輸入：先聽、先模仿 |
| 2 | Interactive Games 互動遊戲 | ✅ 已上線 | 練習：邊玩邊記 |
| 3 | Lesson Quiz 單課測驗 | ✅ 已上線 | 驗收：學完了？來測試 |
| 4 | Speaking Practice 口說練習 | 🔧 開發中（顯示 opacity 0.3） | 輸出：實戰對話 |

**功能細節**：
- EN / FR 語言切換按鈕（右上角）
- 未上線功能卡片透明度 0.3，不可點擊
- 各功能頁均有「← Back to Homepage」藥丸按鈕返回

### 5.3 句子跟讀練習 Shadowing（home.html，需登入）

**操作流程**：登入 → Dashboard → 選 Book + Lesson → 瀏覽文法例句跟讀

**功能細節**：
- 語速控制 Speed slider（0.5 ~ 1.5x）
- Show Pinyin 開關
- 雙軌語音：Web Speech API（快）/ Natural Voice OpenAI TTS（品質高）
- 自然語音按鈕：`#33406f` 深藍藥丸樣式
- 文法編號標示：`#c64049` 深紅色

### 5.4 互動遊戲區 Interactive Games（games/index.html，不需登入）

進入遊戲區後以卡片呈現，遊戲列表由 Google Sheet Games 分頁控制。

#### 5.4.1 Memory Match 記憶配對 ✅

**篩選**：Book、Lesson、TOCFL、POS、Meaning 語言

**難度**：Easy（6 詞 12 牌）/ Advanced（11 詞 22 牌）

**機制**：翻牌配對（中文 ↔ 外語），計時、計步

#### 5.4.2 Classifier Quiz 量詞大挑戰 ✅

**資料**：寫死於 JS，25 個量詞，共 75 題

**機制**：四選一、即時回饋、連續答對 Streak、星星結算

#### 5.4.3 Flashcards 閃卡練習 ✅

**篩選**：Book、Lesson、TOCFL、POS、Meaning 語言

**模式**：看中文猜外語 / 看外語說中文，Show Pinyin 開關，計時

#### 5.4.4 Sentence Builder 造句練習 🔧 開發中

**待完成**：`segments_tr` 欄位填寫完畢後即可啟用拖曳重組功能

### 5.5 單課測驗 Lesson Quiz（lesson-quiz/，需登入）✅

**目的**：學生學完一課後進行綜合測驗，評估學習成效。

**篩選**：Book（B1–B5）、Lesson（單課 or All lessons in this book）、語言（EN/FR）

**系統設計**：
- 全程一個計時器，進關卡介紹頁時暫停
- 每關顯示關卡介紹頁（說明玩法）再進入答題
- 題數顯示：`Q1/25`（選擇題）/ `Q11–15/25`（填空整關）
- 題目每次隨機抽取，可無限重玩

**測驗結構（目前）**：5 關，共 25 題，滿分 20 分

| 關卡 | 類型 | 題數 | 分數 | 狀態 |
|------|------|------|------|------|
| 1 🔤 Vocabulary Match | 看漢字+拼音，點發音，四選一外文意思 | 10 | 0.5×10 = 5 | ✅ |
| 2 ✏️ Fill in the Blank | 8 生字（5+3干擾）填入 5 個句子 | 5 | 1×5 = 5 | ✅ |
| 3 🧩 Sentence Building | 詞組拖曳重組 | — | 0 | ⏳ Coming Soon |
| 4 🔊 Listening | 聽生詞發音，四選一外文意思 | 5 | 1×5 = 5 | ✅ |
| 5 🎵 Pinyin Quiz | 看漢字+意思，四選一聲調（同字四聲） | 5 | 1×5 = 5 | ✅ |

**Round 2 Fill in the Blank 細節**：
- 生字卡片顯示漢字 + 拼音
- 句子框內漢字下方顯示拼音，答案位置用 `___` 遮蔽
- 空格為半透明圓角色塊，整塊可點選
- 互動：點擊選字+點空格（手機）/ HTML5 drag-and-drop（電腦）

**Round 4 Listening 細節**：
- 進題自動播放，可重播
- 速度滑桿（0.5x – 1.5x），設定跨題保留

**Round 5 Pinyin Quiz 細節**：
- `toneVariants()` 自動產生同字四個聲調選項（如 `mǎi → māi / mái / mǎi / mài`）
- 無聲調符號時 fallback 至隨機四選一

**結算畫面**：
- 雷達圖（Chart.js，五個維度）
- 總分 + 用時
- 「Review Answers」展開各題對錯詳情（預設隱藏）

---

## 6. 開發中功能 In Development

### 6.1 Round 3 Sentence Building（單課測驗內）

**狀態**：UI 框架已完成，顯示「Coming Soon」  
**待完成**：Google Sheet Sentence Builder 分頁的 `segments_tr` 欄位填寫完畢後即可實作

### 6.2 Round 4 句子聽力理解（單課測驗內）

**目標**：在現有 5 題生詞聽力之外，新增 5 題句子聽力理解

**設計**：
- 播放句子音頻 → 四選一選出正確外文意思
- 每題 0.5 分（5 題 = 2.5 分）
- 按語法點選句：每個 `gram_no` 至少選出一句

**前置條件**：Sentence Builder 分頁需新增 `french_tr` 和 `english_tr` 欄位

**新增後分數結構**：

| 關卡 | 題數 | 分數 |
|------|------|------|
| 1 Vocabulary Match | 10 | 5 |
| 2 Fill in the Blank | 5 | 5 |
| 3 Sentence Building | 5 | 5 |
| 4 Listening — 生詞 | 5 | 5 |
| 4 Listening — 句子 | 5 | 2.5 |
| 5 Pinyin Quiz | 5 | 5 |
| **合計** | **35** | **27.5** |

> 待 Round 3 與 Round 4 句子題完成後，分數結構需重新確認。

### 6.3 Sentence Builder 造句遊戲（games/sentence-builder/）

**狀態**：資料庫已建立，遊戲邏輯待開發  
**待完成**：`segments_tr` 欄位填好後實作拖曳重組

---

## 7. 計畫中功能 Planned Features

### 7.1 Speaking Practice 口說練習

**目的**：學生針對特定課程的文法與詞彙，與 AI 進行對話練習。

**技術方案**：
- 串接 OpenAI Chat API
- System prompt 從 Google Sheet「JLMS_ChatbotPrompt設定」分頁讀取
- 語音輸入：Web Speech API（免費）或 OpenAI Whisper API（付費，辨識度更高）
- 語音輸出：復用現有 OpenAI TTS API

**開發建議**：分階段實作
1. **Phase 1**：文字版對話（先上線基本功能）
2. **Phase 2**：加入語音輸入與輸出

### 7.2 Scenario-based Speaking Practice 情境口說練習

**目的**：設定生活場景（如餐廳點餐、租房子、看醫生），學生進行更自由的對話練習。

**與 Speaking Practice 的差異**：
- Speaking Practice → 限定單一課程的文法和詞彙
- Scenario-based → 混合多課內容，以場景為導向，更貼近真實溝通

### 7.3 學習成果紀錄 Learning Analytics（構想階段）

**可能功能**：
- 單課測驗成績存入 Google Sheet
- 教師端：查看每位學生的測驗紀錄與各關卡表現
- 學生端：查看自己的歷史成績與進步趨勢

---

## 8. 資料遷移計畫 Data Migration Plan

### 8.1 例句資料遷移

**狀態**：✅ 已完成

| 項目 | 現狀 |
|------|------|
| Shadowing 例句 | 已遷移至 Google Sheet（Sentence Builder 分頁） |
| 舊版 JSON 檔案 | 保留於 `archive/` 資料夾作為備份 |

---

## 9. Google Sheet 資料庫總覽

| Google Sheet | 分頁 | 用途 | 使用功能 |
|-------------|------|------|---------|
| Games DB | Games | 遊戲列表管理 | Interactive Games 首頁 |
| Games DB | Memory Match | 生詞庫（~379 筆） | Memory Match、Flashcards、單課測驗 R1、R4（生詞）、R5 |
| Games DB | Sentence Builder | 文法例句庫 | Shadowing、Sentence Builder、單課測驗 R2、R3、R4（句子，待翻譯欄位） |
| 學生資料 | JLMS_學生資料總表 | 學生帳號與權限管理 | 登入驗證、accessLevel 權限控制 |
| 學生資料 | JLMS_ChatbotPrompt設定 | AI 對話 prompt 管理 | Speaking Practice（計畫中） |

---

## 10. 導覽結構 Navigation Structure

```
登入（index.html）
└── 功能總覽 My Learning Hub（dashboard.html）
    │
    ├── 1. 例句跟讀 Shadowing（home.html）           ← 先聽、先模仿
    │   └── 選 Book + Lesson → 文法例句跟讀
    │
    ├── 2. 互動遊戲 Games（games/index.html）         ← 邊玩邊記
    │   ├── Memory Match           ✅ 已上線
    │   ├── Classifier Quiz        ✅ 已上線
    │   ├── Flashcards             ✅ 已上線
    │   └── Sentence Builder       🔧 開發中
    │
    ├── 3. 單課測驗 Lesson Quiz（lesson-quiz/）        ← 學完了？來測試
    │   └── 選 Book + Lesson + 語言
    │       → Round 1 生詞配對（10 題）
    │       → Round 2 句子填空（5 題）
    │       → Round 3 Sentence Building（Coming Soon）
    │       → Round 4 聽力（5 題，句子題待翻譯欄位）
    │       → Round 5 拼音聲調（5 題）
    │       → 雷達圖結算 + 答題檢討
    │
    └── 4. 口說練習 Speaking（speaking.html）         ← 實戰對話（開發中）
        ├── Speaking Practice
        └── Scenario-based Speaking
```

**備註**：
- 四個功能排列順序暗示學習路徑：輸入 → 練習 → 驗收 → 輸出
- 各功能頁均有「← Back to Homepage」藥丸按鈕返回 Dashboard

---

## 附錄 A：技術名詞對照

| 英文 | 中文 | 說明 |
|------|------|------|
| Shadowing | 跟讀 | 聽到語音後跟著複述的學習方法 |
| TTS (Text-to-Speech) | 語音合成 | 將文字轉換為語音 |
| Web Speech API | 瀏覽器語音 API | 瀏覽器內建的語音合成功能 |
| Firebase Authentication | Firebase 驗證服務 | Google 提供的登入驗證服務 |
| TOCFL | 華語文能力測驗 | 台灣的中文能力分級標準 |
| POS (Part of Speech) | 詞性 | 名詞、動詞、形容詞等分類 |
| Radar Chart | 雷達圖 / 蜘蛛網圖 | 多維度表現的視覺化圖表 |
| System Prompt | 系統指令 | 給 AI 的角色設定與行為指引 |
| Static Site | 靜態網站 | 不需後端伺服器的網站 |
| accessLevel | 存取權限等級 | 控制學生可查看的書本範圍 |
| gram_no | 文法編號 | 對應課本中的文法點編號 |
| segments_tr | 斷句 | 以 `/` 分隔的詞組，供造句拖曳排序用 |

---

## 附錄 B：版本紀錄 Changelog

| 版本 | 日期 | 說明 |
|------|------|------|
| v1.0 | 2026-03-20 | 初版規格書，記錄所有已上線與計畫中功能 |
| v1.1 | 2026-04-01 | 新增 Dashboard；Shadowing 例句遷移至 Google Sheet；單課測驗 Round 5 確定四選一方案；更新導覽結構 |
| v1.2 | 2026-04-13 | 單課測驗 Lesson Quiz 正式上線（Round 1、2、4、5 完成，Round 3 Coming Soon）；全站 UI 設計系統統一（#1f213b / #566fb8 / 藥丸按鈕）；新增 Sentence Builder 翻譯欄位規劃（french_tr / english_tr）；更新檔案結構、登入規則、資料庫欄位說明 |
