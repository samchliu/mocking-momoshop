# Mock momoshop

純前端的 momo 電商 mock：**搜尋 → 商品 → 加入購物車**，加上首頁。重點不在畫面還原，而在於一個**可以被長期維護、可以讓 AI agent 安全地持續演進**的前端系統。

> 我把自己定位成這個系統的長期維護者。所以需求、規則、決策都放在 `docs/` 的知識庫（[living-kb](https://github.com/samchliu/living-kb)），和程式碼一起演進、一起被驗證。

## 快速開始

需求：Node.js 20 以上

```bash
npm install
npm run dev                 # http://localhost:5173
```

或用 Docker（不需要在本機安裝 Node）：

```bash
docker compose up --build   # http://localhost:5173，改原始碼會即時熱更新
docker compose down         # 停止（加 -v 會一併清除容器內的 node_modules volume）
```

若檔案變更沒有觸發更新（部分 Windows／網路磁碟），改用 `VITE_POLLING=1 docker compose up`。

不需要環境變數：資料來自 repo 內的 mock 後端（[ADR-003](docs/decisions/ADR-003.md)），不呼叫任何真實網站 API。

| 試試看         | 網址                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------- |
| 搜尋           | `/search/iphone?sort=price_asc&brand=Apple`                                                       |
| 商品           | `/goods/P10001`（多規格）、`/goods/P10003`（售完）；舊網址 `/goods/GoodsDetail.jsp?i_code=P10002` |
| 慢速網路       | 任一頁加 `?latency=3000`                                                                          |
| 30% 請求失敗   | `?fail=0.3`                                                                                       |
| 離線           | `?offline=1`                                                                                      |
| 觀察 telemetry | `?debug=1`                                                                                        |

## 指令

| 指令                      | 說明                                                                     |
| ------------------------- | ------------------------------------------------------------------------ |
| `npm run verify`          | 知識驗證 → 型別 → lint → 格式 → 知識↔測試追溯 → 單元測試                 |
| `npm run e2e`             | Playwright（desktop + mobile），首次需 `npx playwright install chromium` |
| `npm run lhci`            | Lighthouse CI                                                            |
| `npm run kb:build`        | 產生知識庫的閱讀產物（`docs/_build/`）                                   |
| `npm run kb:trace BR-002` | 查某條規則的上下游（需求、決策、程式碼、測試）                           |

CI（`.github/workflows/ci.yml`）在 push 到 main 與每個 PR 上跑同一套關卡：`verify`（含 `kb validate --strict`）通過後，平行執行 e2e 與 Lighthouse 預算檢查；失敗時上傳 Playwright 報告。

## 怎麼讀這個專案

建議閱讀順序：

1. **題目與範圍**：[REF-001 題目摘要](docs/reference/REF-001.md) → [EXP-001 選題與範圍探索](docs/exploration/EXP-001.md)
2. **要做什麼**：[REQ-001 搜尋](docs/requirements/REQ-001.md)、[REQ-002 商品頁](docs/requirements/REQ-002.md)、[REQ-003 首頁](docs/requirements/REQ-003.md)、[REQ-004 全站版面骨架](docs/requirements/REQ-004.md)；變更走 [CR-001](docs/change-requests/CR-001.md)
3. **必須成立的規則**：[BR-001 價格](docs/business-rules/BR-001.md)、[BR-002 搜尋](docs/business-rules/BR-002.md)、[BR-003 購物車](docs/business-rules/BR-003.md)
4. **怎麼做、為什麼**：[ARCH-001](docs/architecture/ARCH-001.md)、[ADR-001～005](docs/decisions/)、[API-001](docs/api/API-001.md)
5. **怎麼驗證與觀測**：[OPS-001](docs/operations/OPS-001.md)
6. **人機協作與差異分析**：[RPT-001 實作階段的 agent 協作](docs/records/RPT-001.md)、[RPT-003 規格階段的歧義檢查](docs/records/RPT-003.md)、[RPT-002 實作與實站差異](docs/records/RPT-002.md)

或執行 `npm run kb:build`，閱讀 `docs/_build/features/REQ-xxx/overview.md`（單頁功能總覽）。

## 架構一覽

```
app (routes, providers) → pages → features/{search, goods, cart, home, catalog} → api → mock backend
                                        ↘ components（無業務 UI）  ↘ lib（money, telemetry…）
```

| 狀態           | 放在                              | 理由                             |
| -------------- | --------------------------------- | -------------------------------- |
| 搜尋結果、商品 | TanStack Query                    | 快取、去重、切換條件時取消舊請求 |
| 搜尋條件       | URL                               | 可分享、重新整理不遺失           |
| 購物車         | Context + reducer（localStorage） | 純函式可測試，樂觀更新可回滾     |

詳見 [ARCH-001](docs/architecture/ARCH-001.md) 與 [ADR-002](docs/decisions/ADR-002.md)。

## 人機協作架構（Human-Agent Iteration）

```
AI：起草 REQ / BR / API / ADR（draft）
    → /ambiguity-check：乾淨 context 的 subagent 找出需要猜測的地方（只回報）
人：決定答案 → AI 回填 → 人核准（npm run approve）
          → kb build → ai-context.md（只含已決定的知識）
AI：先寫測試（名稱含 REQ-001#AC2）→ 實作
閘門：npm run verify（含 kb validate 與知識↔測試追溯）→ 人 review → 合併 → 錯誤記入 RPT-001
```

詳見 [ADR-004](docs/decisions/ADR-004.md)；核准前檢查的實際效果見 [RPT-003](docs/records/RPT-003.md)（7 份文件、119 處在核准前被找出，其中 3 處矛盾是 AI 自己回填時引入的）。

## 優先順序與刻意不做

| 優先     | 內容                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------- |
| P0       | 搜尋（排序、品牌篩選、價格區間、分頁、URL 狀態）、商品頁（含資訊表、詳情分頁）、加入購物車、全站版面骨架 |
| P1       | 錯誤／空狀態細節、首頁（輪播、限時搶購、商品帶）、舊網址相容                                             |
| 刻意不做 | `/discover`、`/live`、購物車頁與結帳、會員與頂端工具列、屬性篩選（尺寸、容量…）、熱門推薦、SSR           |

每一項「不做」的理由寫在對應 REQ 的「不在範圍內」。

## 品質報告

| 項目                                      | 結果                                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| Lighthouse（首頁、搜尋、商品頁，desktop） | Performance／A11y／Best Practices／SEO 皆 **100**；LCP ≈ 0.5s、CLS ≤ 0.003、TBT 0            |
| 單元／元件測試                            | 207 passed                                                                                   |
| E2E（desktop + mobile）                   | 37 passed（1 skipped：容器寬度只量 desktop），含慢速網路骨架、頁碼修正、加入購物車、版面量測 |
| 知識↔測試追溯（`spec:check`）             | REQ-001 9/9、REQ-002 11/11、REQ-003 4/4、REQ-004 5/5；BR-001～003 每條規則皆有測試           |
| 入口 bundle                               | gzip 75.9 kB；各頁 chunk ≤ 3.7 kB；mock 資料延遲載入                                         |

詳見 [RPT-002](docs/records/RPT-002.md)（含與實站逐項差異）。

## 已知限制

- 純前端 mock：資料為固定種子產生，圖片為 inline SVG；Lighthouse 數字不代表真實網路與圖片下的表現。
- 只有 CSR：搜尋與商品頁沒有 SSR／SSG，SEO 依賴爬蟲執行 JS（取捨見 [ADR-001](docs/decisions/ADR-001.md)）。
- 購物車只存在 localStorage，沒有購物車頁與結帳；伺服端限購檢查只在 mock 中。
- 實作時 agent 回報的 6 個規格缺口已全部定案並寫入 REQ-001～003、ADR-005（[RPT-001](docs/records/RPT-001.md)），目前沒有待決定的規格問題。

## 明天上線，我最擔心的三件事

1. **伺服端規則與前端不一致**：BR-002（搜尋）、BR-003（限購）現在由 mock 執行；接真實後端時，若後端規則不同，前端會顯示錯誤的件數或允許超量。→ 用 API-001 + 同一組 BR 測試案例做契約測試。
2. **真實圖片下的 LCP**：目前 LCP 0.5s 建立在 inline SVG 上。→ 上線前要有 `srcset`／CDN 圖片尺寸，並在 mobile 4G 條件下量測。
3. **觀測只到瀏覽器內**：telemetry 目前只輸出到 console 與 `?debug=1` 面板。→ 需要收集端點、取樣率與 PII 遮罩（OPS-001「上線前需要補上」）。

## 後續演進方向

完整內容（現況證據、做法、成本、風險、完成的定義）見 [ARCH-002](docs/architecture/ARCH-002.md)（draft）。篩選標準：**不做會在上線第一週造成使用者可見的錯誤或無法排查，而且現在被 mock 藏起來**。

### 上線前必做

| 項目                         | 被 mock 藏起來的問題                                                        | 做法摘要                                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 真實圖片管線                 | 圖片是 inline SVG，LCP 0.5s 不代表真實表現                                  | `ImageAsset` 加尺寸變體 → `SmartImage` 產生 `srcset`／`sizes`；CDN 出 AVIF／WebP；Lighthouse 加 mobile 4G |
| 加入購物車的冪等與伺服端權威 | mock 不會逾時、沒有多分頁：逾時但伺服端已成功時會重複加入，多分頁會超過限購 | `Idempotency-Key`；逾時先「確認中」再決定是否回滾；限購以伺服端為準；`storage` 事件同步分頁               |
| telemetry 送到收集端點       | 事件只到 console 與 `?debug=1`                                              | `subscribe()` 接 sendBeacon 批次送出；附 release 與路由樣板；取樣；PII 遮罩；告警                         |
| CI 成為合併閘門              | `ci.yml` 已寫好，但 repo 沒有 remote，從未執行                              | 分支保護＋必要檢查；CI 跑 commitlint；Lighthouse 門檻收緊到抓退步；bundle 預算                            |

建議順序：CI 閘門 → 多分頁同步（純前端）→ telemetry → 圖片管線（需 CDN，最早開始溝通）→ 冪等與伺服端購物車（需後端與 CR）。

### 推翻現有決策的訊號

| 決策                            | 看到這個訊號就重新評估                                       |
| ------------------------------- | ------------------------------------------------------------ |
| CSR SPA（ADR-001）              | 商品頁自然搜尋流量占比高、未被索引，或 mobile LCP p75 > 2.5s |
| 購物車在 localStorage（BR-003） | 有登入，或重複加入／超過限購出現在數據中                     |
| 不新增 runtime 依賴             | 自行實作的部分（vitals、虛擬化、sink）出現第 2 個同類 bug    |

門檻數字為提議值，待負責人定案；其餘方向（購物車頁、屬性篩選、SSR、契約測試、開發流程改善）為何不排在上線前，見 ARCH-002 第 4 節。
