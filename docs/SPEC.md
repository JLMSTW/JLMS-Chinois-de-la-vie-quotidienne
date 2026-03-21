# JLMS Chinois de la vie quotidienne｜JLMS 生活華語

## 專案規格書 Project Specification

> **版本**：v1.0  
> **日期**：2026-03-20  
> **狀態**：已上線，持續開發中

---

## 1. 專案概述 Overview

### 1.1 專案簡介

JLMS 生活華語是一個中文教學輔助網站，專為法語母語的中文學習者設計，搭配同名實體教材使用。網站提供例句跟讀（Shadowing）、互動遊戲、測驗等多元學習工具，幫助學生在課後進行自主練習。

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

### 2.5 專案檔案結構（目前）

```
JLMS-Chinois-de-la-vie-quotidienne/
├── api/                    # Vercel Serverless Functions（輕量後端）
├── data/                   # 本地資料檔案（JSON）
├── games/                  # 互動遊戲區
│   ├── classifier-quiz/    # 量詞大挑戰
│   │   ├── classifier-quiz.css
│   │   ├── classifier-quiz.js
│   │   └── index.html
│   ├── flash-cards/        # 閃卡練習
│   ├── memory-match/       # 記憶配對
│   ├── sentence-builder/   # 造句練習（開發中）
│   ├── games.css
│   ├── games.js
│   └── index.html
├── js/                     # 共用 JavaScript
├── style/                  # 共用樣式
├── home-v1-complete.html   # 首頁舊版（建議清理或歸檔）
├── home.html               # 首頁
├── index.html              # 網站入口
└── speaking.html           # 口說練習頁面
```

### 2.6 建議的檔案結構優化

```
JLMS-Chinois-de-la-vie-quotidienne/
├── README.md               # 專案說明
├── docs/
│   └── SPEC.md             # 本規格書
├── api/
├── data/
├── games/
│   ├── classifier-quiz/
│   ├── flash-cards/
│   ├── memory-match/
│   ├── sentence-builder/
│   ├── games.css
│   ├── games.js
│   └── index.html
├── js/
├── style/
├── index.html              # 入口頁保留在根目錄
├── home.html
└── speaking.html
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

### 3.3 登入需求（目前規則，未來可能調整）

| 功能 | 是否需要登入 |
|------|-------------|
| Interactive Games | 不需要 |
| 句子跟讀練習（Shadowing） | 需要登入 |

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

供 Memory Match 和 Flashcards 共用，約 379 筆資料。

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

供 Sentence Builder 遊戲及首頁 Shadowing 跟讀練習使用。

| 欄位 | 說明 |
|------|------|
| set_id | 資料集 ID（如 `B1_L1`） |
| book | 書本編號 |
| Lesson | 課程編號 |
| gram_no | 文法編號（對應實體課本中的文法號碼） |
| phrase_id | 例句 ID（如 `B1L010301`） |
| grammar_tag_tr | 繁體文法標籤 |
| chinese_tr | 繁體中文例句 |
| pinyin_tw | 台灣拼音 |
| segments_tr | 繁體斷句（以 `/` 分隔，供拖曳排序用） |
| segments_pinyin_tw | 斷句拼音 |
| grammar_tag_sp | 簡體文法標籤 |
| chinese_sp | 簡體中文 |
| pinyin_cn | 中國拼音 |
| segments_sp | 簡體斷句 |
| segments_pinyin_cn | 簡體斷句拼音 |
| tocfl_level | TOCFL 等級 |
| active | 是否啟用 |
| review_status | 審核狀態 |

### 4.4 JLMS_ChatbotPrompt設定 分頁

預留給未來 Speaking Practice 功能使用，存放 OpenAI Chat API 的 system prompt 設定，可依課別或場景管理不同的 prompt。

---

## 5. 已上線功能 Current Features

### 5.1 句子跟讀練習 Shadowing（需登入）

**功能說明**：學生選擇書本和課程，瀏覽該課的文法例句，進行跟讀練習。

**操作流程**：
1. 登入後進入主頁
2. 選擇 Book（B1 ~ B5，依權限顯示）
3. 選擇 Lesson（依所選 Book 顯示對應課程）
4. 瀏覽例句列表，按照文法編號分組

**功能細節**：
- **語速控制**：拉條（Speed slider）調整播放速度，預設 1.0
- **拼音顯示**：Show pinyin 勾選框，可開/關拼音
- **雙軌語音系統**：
  - 點擊拼音 → 使用瀏覽器 Web Speech API（速度快，品質較低）
  - 點擊「Natural Voice」按鈕 → 串接 OpenAI TTS API（品質好，有延遲）

**目前狀態**：例句資料寫死在本地 JSON 檔案中  
**計畫**：遷移至 Google Sheet（Sentence Builder 分頁），方便即時更新內容

### 5.2 Interactive Games 互動遊戲區（不需登入）

進入遊戲區後，以卡片形式呈現可用遊戲，遊戲列表由 Google Sheet Games 分頁控制。

#### 5.2.1 Memory Match 記憶配對（已上線）

**資料來源**：Google Sheet — Memory Match 分頁（生詞庫）

**篩選功能**：
- Book（書本）
- Lesson（課程）
- TOCFL（中文能力等級）
- POS（詞性）
- Meaning（法語 / 英語）

**難度設定**：
- Easy（6 字）：6 個詞彙，共 12 張牌
- Advanced：11 個詞彙，共 22 張牌

**遊戲機制**：
- 翻牌配對：中文 ↔ 法語 / 英語
- 計分追蹤：Moves（翻牌次數）、Matches（配對成功數）、Time（計時）
- New Game 按鈕重新開始

#### 5.2.2 Classifier Quiz 量詞大挑戰（已上線）

**資料來源**：寫死在 JavaScript 檔案中（資料固定，25 個常見量詞，共 75 題）

**設定選項**：
- 語言選擇：Français / English
- 題數選擇：10 / 15 / 20 / 30 題
- 隨機出題

**遊戲機制**：
- 四選一：顯示帶量詞的詞組，選出正確的量詞
- 即時回饋：答對/答錯都顯示解釋（以所選語言呈現）
- 計分：Score（得分）、Streak（連續答對數）
- 進度條：Question X / Y
- 結算畫面：星星評價 + 最終分數

**介面特色**：三語並呈（中文 + 法文 + 英文），含拼音與翻譯

#### 5.2.3 Flashcards 閃卡練習（已上線）

**資料來源**：Google Sheet — Memory Match 分頁（與 Memory Match 共用生詞庫）

**篩選功能**：Book、Lesson、TOCFL、POS、Meaning 語言

**練習模式**：
- See Chinese → Guess meaning（看中文猜外語意思）
- See French → Say Chinese（看法文說中文）

**功能細節**：
- Show Pinyin 開關：控制是否顯示拼音
- Number of cards：自訂卡片數量
- 隨機出牌，每次練習順序不同
- 計時器（Time）
- Speak 按鈕：點擊聽詞彙發音
- Prev / Next 導覽按鈕
- 進度顯示（如 1/20）

---

## 6. 開發中功能 In Development

### 6.1 Sentence Builder 造句練習

**狀態**：資料庫已建立，遊戲功能開發中  
**資料來源**：Google Sheet — Sentence Builder 分頁

**篩選功能**：Book、Lesson

**遊戲機制**：
- 從 `segments_tr` 欄位讀取以 `/` 分隔的詞組
- 打亂詞組順序
- 學生透過拖曳將詞組排列成正確句子
- 點擊或拖曳詞組時可聽發音

**介面設定**：
- 顯示模式：拼音 + 漢字 / 僅漢字
- 課本範圍篩選

---

## 7. 計畫功能 Planned Features

### 7.1 單課測驗 Lesson Quiz

**目的**：學生學完一課後，進行綜合測驗以評估學習成效。

**篩選**：僅需選擇 Book + Lesson

**測驗結構**：5 個關卡，每關 5 題，共 25 題 25 分

| 關卡 | 名稱 | 題型 | 資料來源 |
|------|------|------|---------|
| 1 | 生詞意思配對 | 中文與外語意思配對 | 生詞庫（Memory Match 分頁） |
| 2 | 句子填空 | 閱讀句子，選擇正確生詞填入空格 | 例句庫（Sentence Builder 分頁） |
| 3 | Sentence Building | 拖曳詞組排列成正確句子 | 例句庫（Sentence Builder 分頁） |
| 4 | 聽力練習 | 聽句子發音，從四個選項選出正確意思 | 例句庫（Sentence Builder 分頁） |
| 5 | 拼音測驗 | 看漢字與外語意思，選出/輸入正確拼音（含聲調） | 生詞庫（Memory Match 分頁） |

> **備註**：關卡 5 的作答方式待定。方案 A：學生自行輸入拼音（含聲調），須完全正確才得分。方案 B：四選一，選項為發音相近或聲調易混淆的拼音。

**結算畫面**：
- 雷達圖（Spider Chart）呈現五個關卡的表現分布
- 依答題正確率給予評語：

| 正確率 | 評語 |
|-------|------|
| 90%+ | 完美 |
| 80%+ | 優秀 |
| 70%+ | 不錯 |
| 60%+ | 加油 |
| <60% | 繼續努力 |

### 7.2 Speaking Practice 口說練習

**目的**：學生針對特定課程的文法與詞彙，與 AI 進行對話練習。

**篩選**：選擇 Book + Lesson，限定該課範圍

**技術方案**：
- 串接 OpenAI Chat API
- System prompt 從 Google Sheet「JLMS_ChatbotPrompt設定」分頁讀取
- 語音輸入：Web Speech API（免費）或 OpenAI Whisper API（付費，辨識度更高）
- 語音輸出：復用現有 OpenAI TTS API

**開發建議**：分階段實作
1. **Phase 1**：文字版對話（先上線基本功能）
2. **Phase 2**：加入語音輸入與輸出

### 7.3 Scenario-based Speaking Practice 情境口說練習

**目的**：設定生活場景（如餐廳點餐、租房子、看醫生），學生進行更自由的對話練習。

**與 Speaking Practice 的差異**：
- Speaking Practice → 限定單一課程的文法和詞彙
- Scenario-based → 混合多課內容，以場景為導向，更貼近真實溝通

**技術方案**：
- 同樣串接 OpenAI Chat API
- Prompt 設計結合場景設定 + 從 Sentence Builder 資料庫撈取相關文法和例句
- 讓 AI 知道學生已學過哪些內容，對話時自然運用

### 7.4 學習成果紀錄 Learning Analytics（構想階段）

**目的**：記錄並追蹤學生的學習歷程。

**可能功能**：
- 單課測驗成績存入 Google Sheet
- 教師端：查看每位學生的測驗紀錄與各關卡表現
- 學生端：查看自己的歷史成績與進步趨勢
- 數據分析：各課程 / 各題型的整體通過率

---

## 8. 資料遷移計畫 Data Migration Plan

### 8.1 例句資料遷移

| 項目 | 現狀 | 目標 |
|------|------|------|
| Shadowing 例句 | 寫死在 JSON 檔案中 | 改為讀取 Google Sheet（Sentence Builder 分頁） |

**優點**：
- 不需修改程式碼即可新增或更新例句
- Shadowing 與 Sentence Builder 共用同一份資料，確保一致性
- 透過 Google Sheet 的 `active` 欄位控制啟用/停用

---

## 9. Google Sheet 資料庫總覽

| Google Sheet | 分頁 | 用途 | 使用功能 |
|-------------|------|------|---------|
| Games DB | Games | 遊戲列表管理 | Interactive Games 首頁 |
| Games DB | Memory Match | 生詞庫（~379 筆） | Memory Match、Flashcards、單課測驗關卡 1 & 5 |
| Games DB | Sentence Builder | 文法例句庫 | Shadowing、Sentence Builder、單課測驗關卡 2, 3, 4 |
| Games DB | （未命名）工作表4 | 待確認 | — |
| 學生資料 | JLMS_學生資料總表 | 學生帳號與權限管理 | 登入驗證、accessLevel 權限控制 |
| 學生資料 | JLMS_ChatbotPrompt設定 | AI 對話 prompt 管理 | Speaking Practice（計畫中） |

---

## 10. 導覽結構 Navigation Structure

```
首頁（需登入後完整顯示）
├── Book 1 ~ Book 5          ← 依 accessLevel 顯示
│   └── Lesson 選擇          ← 依書本顯示對應課程
│       └── 例句跟讀 Shadowing
├── Speaking Practice          ← 計畫中，尚無內容
├── Scenario-based Speaking    ← 計畫中，尚無內容
└── Interactive Games          ← 不需登入
    ├── Memory Match           ✅ 已上線
    ├── Classifier Quiz        ✅ 已上線
    ├── Flashcards             ✅ 已上線
    └── Sentence Builder       🔧 開發中
```

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

---

## 附錄 B：版本紀錄 Changelog

| 版本 | 日期 | 說明 |
|------|------|------|
| v1.0 | 2026-03-20 | 初版規格書，記錄所有已上線與計畫中功能 |
