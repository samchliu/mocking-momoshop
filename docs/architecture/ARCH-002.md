---
id: ARCH-002
title: 演進路線圖：上線前必做與推翻現有決策的訊號
type: architecture
knowledge_state: authoritative
status: draft
owner: RD
authors: [AI]
created: 2026-11-20
updated: 2026-11-20
source_of_truth: self
related:
  - id: ARCH-001
    rel: relates_to
  - id: ADR-001
    rel: relates_to
  - id: ADR-002
    rel: relates_to
  - id: ADR-003
    rel: relates_to
  - id: BR-003
    rel: relates_to
  - id: API-001
    rel: relates_to
  - id: OPS-001
    rel: relates_to
tags: [architecture, roadmap]
---

# ARCH-002：演進路線圖

> **草稿（AI 起草，待 RD 核准）。** ARCH-001 描述「現在的系統」；本文件描述「接下來要變成什麼、為什麼是這個順序、什麼情況下要回頭改決定」。
> 文中標示 **〔提議值〕** 的數字是起草者的建議門檻，不是已決定的規格，需由負責人定案。

## 1. 怎麼排優先順序

候選方向有 20 多項（產品功能、架構效能、後端契約、觀測、品質流程、人機協作）。本文件只把四項列為**上線前必做**，篩選標準是：

1. **不做會在上線第一週造成使用者可見的錯誤或無法排查**（不是「做了更好」）。
2. **現在的 mock 環境會讓問題被藏起來**：測試全綠、Lighthouse 100，但在真實條件下會失效。
3. **成本可控**：不新增 runtime 依賴、不需要改動已核准的 REQ／BR 行為。

| #   | 項目                         | 被 mock 藏起來的問題                                    | 不做的後果                                     |
| --- | ---------------------------- | ------------------------------------------------------- | ---------------------------------------------- |
| B2  | 真實圖片管線                 | 圖片是 inline SVG，LCP 0.5s 是假的                      | 首頁、商品頁在 mobile 4G 下 LCP 可能數倍劣化   |
| C2  | 加入購物車的冪等與伺服端權威 | mock 不會逾時、不會有多分頁，前端狀態永遠等於「伺服端」 | 重複加入、超過限購、徽章數量與實際購物車不一致 |
| D1  | telemetry 送到收集端點       | 事件只到 console 與 `?debug=1`，上線後看不到            | 出事時沒有資料，只能靠客訴                     |
| E1  | CI 成為真正的合併閘門        | `ci.yml` 寫好了，但 repo 沒有 remote，**從來沒有跑過**  | 本機 hook 可被 `--no-verify` 或網頁編輯繞過    |

## 2. 上線前必做

### B2：真實圖片管線

**現況（有證據）**

- 圖片由 mock 產生 inline SVG；`ImageAsset` 只有 `src`、`alt`、`width`、`height`（`src/features/catalog/types.ts`）。
- `SmartImage` 已做好：寬高必填（防 CLS）、只有 LCP 圖 `priority`（`eager`＋`fetchPriority=high`），其餘 `lazy`；載入失敗換成中性佔位圖。
- 全專案沒有 `srcset`／`sizes`。Lighthouse 只跑 desktop preset（`lighthouserc.json`）。

**做法**

1. API-001 的 `ImageAsset` 新增可選的 `srcset`（或 `variants: {width, src}[]`），先走 CR 變更 API，再改 parser。可選欄位 → 舊回應仍合法，可漸進上線。
2. `SmartImage` 依 `variants` 產生 `srcset` 與 `sizes`；`sizes` 由呼叫端依版面傳入（商品卡 5 欄／2 欄、商品頁主圖）。
3. 圖片由 CDN 依寬度出圖並協商 AVIF／WebP；這是後端／基礎設施工作，前端只消費 URL。
4. LCP 圖加 `<link rel="preload" imagesrcset>`；首頁輪播只有第一張 `priority`。
5. Lighthouse CI 加入 mobile preset（模擬 4G、4× CPU 降速），並用一組**真實尺寸的測試圖片**跑，而不是 SVG。

**成本**：前端約 1–2 天（CR、parser、SmartImage、測試）；CDN 設定另計。

**風險**：`sizes` 寫錯會下載過大的圖，Lighthouse 不一定會失敗 → 在 E2E 加一個檢查：商品卡實際載入的圖片寬度 ≤ 顯示寬度 × DPR × 1.5〔提議值〕。

**完成的定義**：mobile preset 下首頁、搜尋、商品頁 LCP p75 ≤ 2.5s〔提議值〕，CLS 維持 ≤ 0.1。

### C2：加入購物車的冪等與伺服端權威

**現況（有證據）**

- `useAddToCart`（`src/features/cart/useAddToCart.ts`）：樂觀加上徽章數量 → 失敗時 `revert` 並顯示原因（BR-003#R5）。連點保護是**元件內的 `useRef`**（BR-003#R4），只在同一個元件實例有效。
- mutation 不重試（`queryClient.ts`：`mutations: { retry: false }`），請求 8 秒逾時（`api/client.ts`）。
- 限購檢查（BR-003#R7）靠前端送出 `inCart`（從 localStorage 讀的數量），由 mock 判斷。
- 購物車沒有監聽 `storage` 事件，多個分頁之間不同步。

**真實環境會出現、mock 不會出現的三個情境**

| 情境                | 發生什麼                                                          | 結果                                  |
| ------------------- | ----------------------------------------------------------------- | ------------------------------------- |
| 逾時但伺服端已成功  | 8 秒逾時 → 前端回滾徽章、顯示錯誤；但伺服端其實已經加入           | 使用者再按一次 → **加入兩次**         |
| 多分頁              | 分頁 A、B 各自讀 localStorage；A 加入後 B 的 `inCart` 仍是舊值    | B 送出的 `inCart` 偏低 → **超過限購** |
| 前端計算的 `inCart` | `inCart` 是客戶端說了算；被竄改或資料過期，伺服端就以錯的數字判斷 | 限購規則失效                          |

**做法**

1. **冪等鍵**：每次「使用者按下放入購物車」產生一個 `Idempotency-Key`（`crypto.randomUUID()`，不需新依賴）；重送同一次操作時沿用同一把鍵，伺服端對同一把鍵只執行一次並回傳第一次的結果。
2. **逾時不等於失敗**：逾時時不立即回滾，而是顯示「確認中」並以同一把鍵查詢結果（或重送一次），確定失敗才回滾。這會修改 BR-003#R5 的行為，需要 CR。
3. **伺服端為權威**：接真實後端後，限購以伺服端購物車數量判斷，`inCart` 從請求中移除（API-001 變更，需 CR）。localStorage 降級為「未登入時的暫存」與離線顯示。
4. **多分頁同步**：在 `CartProvider` 監聽 `storage` 事件，讀回時沿用 `lib/storage` 的驗證（BR-003#R6）。這一步不依賴後端，可以最先做。

**成本**：步驟 4 約半天；步驟 1–3 需要後端配合與兩份 CR（BR-003、API-001）。

**風險**：步驟 2 讓「失敗」的判定變慢，按鈕停用時間變長 → 「確認中」最多 N 秒〔提議值：5 秒〕，超過就顯示「無法確認是否已加入，請查看購物車」。

**完成的定義**：E2E 以 `?latency` 讓請求逾時，驗證只加入一次；開兩個分頁加入同一商品，驗證第二個分頁拿到 409。

### D1：telemetry 送到收集端點

**現況（有證據）**

- `lib/telemetry` 是無依賴的事件匯流排：`api`、`error`、`vital`、`action` 四種事件，最多保留 50 筆；`subscribe()` 已預留給正式環境的 sink。
- `api` 事件已移除 query string（搜尋關鍵字可能含個資）。
- `lib/vitals.ts` 以 PerformanceObserver 收 LCP、CLS、INP 近似值，頁面隱藏時回報一次。
- OPS-001「上線前需要補上」已列出：收集端點與取樣率、PII 遮罩、告警、release 標記。

**做法**

1. 新增一個 sink：`subscribe()` 收到事件後放進批次，`visibilitychange → hidden` 或滿 N 筆時用 `navigator.sendBeacon` 送出（不新增依賴）。是否改用 Sentry 是另一個決策，要寫 ADR（新增 runtime 依賴需要 ADR 允許）。
2. **每個事件附上**：release 版本（build 時注入）、路由**樣板**（`/goods/:id`，不是實際網址）、session 內的隨機 ID（不跨 session）。
3. **取樣**：`vital` 與 `action` 全收；`api` 成功事件取樣〔提議值：10%〕，失敗事件全收。
4. **PII**：只送路由樣板；`error.message` 截斷並移除 email、手機號碼格式的字串；不送使用者輸入。
5. **告警**（收集端）：API 錯誤率、加入購物車失敗率、LCP p75 依路由分組劣化。

**成本**：前端 sink 約 1 天；收集端與儀表板視平台而定。

**風險**：sendBeacon 有大小上限、可能被廣告阻擋器攔截 → 數據是下限而不是全量，告警門檻要以相對變化為主。

**完成的定義**：`?fail=0.3` 時，收集端 5 分鐘內看得到錯誤率上升並觸發告警；送出的資料中找不到搜尋關鍵字。

### E1：CI 成為真正的合併閘門

**現況（有證據）**

- `.github/workflows/ci.yml` 已有三個 job：`verify`（kb validate → typecheck → lint → format → spec:check → unit）、`e2e`（desktop＋mobile）、`lighthouse`。
- **repo 沒有設定 git remote，CI 從未執行過。** 目前所有閘門都只靠本機 husky hook。
- Lighthouse 門檻偏鬆：performance ≥ 0.9，但實測是 100；只跑 desktop。
- 沒有 bundle 大小預算（2026-11-20 量測：入口 chunk gzip 75.6 kB，加上 modulepreload 的共用 chunk 共 125.9 kB）。
- commitlint（知識 ID 規則）只在本機 `commit-msg` hook 執行；用網頁編輯或 `--no-verify` 的 commit 不會被檢查。

**做法**

1. 推到遠端，設定分支保護：`verify`、`e2e`、`lighthouse` 為必要檢查，禁止直接推 main，merge 需要 review。
2. CI 加一個 job 對 PR 範圍內的每個 commit 跑 commitlint（與本機規則相同）。
3. **收緊 Lighthouse 門檻**到接近實測值〔提議值：performance ≥ 0.95〕，並加入 mobile preset（與 B2 一起做）。門檻的目的在於「抓退步」，而不是「及格」。
4. **bundle 預算**：build 後用一支小腳本讀 `dist/` 的 gzip 大小，入口 chunk 超過 85 kB、首次載入 JS 總量超過 140 kB〔提議值〕即失敗；不需要新增依賴。
5. E2E 失敗時保留 trace，PR 留言附上連結。

**成本**：約半天（不含遠端與權限設定）。

**風險**：門檻收緊後偶發的 Lighthouse 波動會讓 CI 不穩 → `numberOfRuns: 3` 取中位數已在設定中；若仍不穩，performance 改為 warn、LCP／CLS 維持 error。

**完成的定義**：一個故意讓 `spec:check` 失敗的 PR 無法合併；一個讓入口 bundle 增加 20 kB 的 PR 被擋下。

### 建議順序

```
E1（閘門先到位，後面三項的退步才擋得住）
 → C2 步驟 4（多分頁同步，純前端，半天）
 → D1（上線前要先看得到）
 → B2（需要 CDN 與後端配合，時程最長，最早開始溝通）
 → C2 步驟 1–3（需要後端與 CR）
```

## 3. 推翻現有決策的訊號

每個重要決策都是在「mock、單人、限時」的條件下做的。條件改變時，下表說明**看到什麼訊號就該重新評估**，避免決策變成慣性。

| 決策                                     | 現在的理由                         | 該重新評估的訊號                                                                                    | 可能的方向                                                        |
| ---------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| CSR SPA，不做 SSR（ADR-001）             | mock 下 SEO 收益無法展示；交付速度 | 商品頁自然搜尋流量占比 > 30%〔提議值〕，或 Search Console 顯示商品頁未被索引；mobile LCP p75 > 2.5s | 商品頁先預渲染熱門商品，再 SSR/ISR；搜尋頁維持 CSR                |
| 資料來自 repo 內 mock（ADR-003）         | 不呼叫真實網站；可控、可故障注入   | 有真實 API 可用                                                                                     | 換 `api/` 的 transport，保留 parser 當契約檢查                    |
| 購物車存在 localStorage（BR-003#R6）     | 沒有會員與購物車 API               | 有登入、或 C2 的多分頁／逾時問題在數據中出現                                                        | 伺服端購物車為權威，localStorage 只做暫存（需新 BR 規定合併規則） |
| 狀態分層：Query＋URL＋Context（ADR-002） | 三種狀態性質不同，各用最適合的工具 | 出現需要跨 feature 共享、又不屬於伺服端狀態的資料（例如比較清單、最近瀏覽）超過 2 種                | 評估是否需要客戶端 store；在那之前維持 Context                    |
| 不新增 runtime 依賴                      | bundle 小、供應鏈風險低            | 自行實作的部分（vitals、虛擬化、telemetry sink）出現第 2 個同類 bug，或維護成本超過引入成本         | 寫 ADR 引入成熟套件（例如 web-vitals）                            |
| 商品流虛擬化自行實作（REQ-005#AC8）      | 需求單純、無依賴                   | 需要支援不同高度的卡片、或水平虛擬化                                                                | 寫 ADR 引入虛擬化套件                                             |

## 4. 這次沒有列為上線前必做的方向

| 方向                                                         | 為什麼不是現在                                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 購物車頁到結帳（EXP-003、BR-004）                            | 進行中，由另一個工作階段負責；結帳需要會員與金流，範圍另開 REQ                                |
| 屬性篩選、評價排序                                           | 功能擴充，不影響上線正確性；API-001 的 `facets` 已預留結構                                    |
| SSR                                                          | 見第 3 節的訊號；沒有流量數據前，成本大於可證明的收益                                         |
| 契約測試（BR 案例同時跑 mock 與真實後端）                    | 價值高，但前提是有真實後端；接後端的同一個迭代就要做                                          |
| 自動化 a11y（axe）、視覺回歸                                 | 現有 E2E 已量測版面（REQ-004、REQ-005），oxlint 有 a11y 規則；屬於加強而非缺口                |
| 文件與程式碼不一致的自動偵測、AC 編號穩定規則、worktree 清理 | 屬於開發流程改善，不影響上線；但本次開發已實際遇到（舊分支引用已改號的 AC），建議近期另寫 ADR |

## 變更歷史

| 日期       | 變更                   |
| ---------- | ---------------------- |
| 2026-11-20 | 建立（draft，AI 起草） |
