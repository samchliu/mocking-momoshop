# Mock momoshop

純前端的 momo 電商 mock：**搜尋 → 商品 → 加入購物車**，加上首頁。重點不在畫面還原，而在於一個**可以被長期維護、可以讓 AI agent 安全地持續演進**的前端系統。

> 我把自己定位成這個系統的長期維護者。所以需求、規則、決策都放在 `docs/` 的知識庫（[living-kb](https://github.com/samchliu/living-kb)），和程式碼一起演進、一起被驗證。

## 快速開始

需求：Node.js 20 以上

```bash
npm install
npm run dev                 # http://localhost:5173
```

不需要環境變數：資料來自 repo 內的 mock 後端（[ADR-003](docs/decisions/ADR-003.md)），不呼叫任何真實網站 API。

| 試試看         | 網址                                                                |
| -------------- | ------------------------------------------------------------------- |
| 搜尋           | `/search/iphone?sort=price_asc&brand=Apple`                         |
| 商品           | `/goods/<id>`（舊網址 `/goods/GoodsDetail.jsp?i_code=<id>` 也可以） |
| 慢速網路       | 任一頁加 `?latency=3000`                                            |
| 30% 請求失敗   | `?fail=0.3`                                                         |
| 離線           | `?offline=1`                                                        |
| 觀察 telemetry | `?debug=1`                                                          |

## 指令

| 指令                      | 說明                                                                     |
| ------------------------- | ------------------------------------------------------------------------ |
| `npm run verify`          | 知識驗證 → 型別 → lint → 格式 → 知識↔測試追溯 → 單元測試                 |
| `npm run e2e`             | Playwright（desktop + mobile），首次需 `npx playwright install chromium` |
| `npm run lhci`            | Lighthouse CI                                                            |
| `npm run kb:build`        | 產生知識庫的閱讀產物（`docs/_build/`）                                   |
| `npm run kb:trace BR-002` | 查某條規則的上下游（需求、決策、程式碼、測試）                           |

## 怎麼讀這個專案

建議閱讀順序：

1. **題目與範圍**：[REF-001 題目摘要](docs/reference/REF-001.md) → [EXP-001 選題與範圍探索](docs/exploration/EXP-001.md)
2. **要做什麼**：[REQ-001 搜尋](docs/requirements/REQ-001.md)、[REQ-002 商品頁](docs/requirements/REQ-002.md)、[REQ-003 首頁](docs/requirements/REQ-003.md)
3. **必須成立的規則**：[BR-001 價格](docs/business-rules/BR-001.md)、[BR-002 搜尋](docs/business-rules/BR-002.md)、[BR-003 購物車](docs/business-rules/BR-003.md)
4. **怎麼做、為什麼**：[ARCH-001](docs/architecture/ARCH-001.md)、[ADR-001～005](docs/decisions/)、[API-001](docs/api/API-001.md)
5. **怎麼驗證與觀測**：[OPS-001](docs/operations/OPS-001.md)
6. **人機協作與差異分析**：[RPT-001 Agent 協作紀錄](docs/records/RPT-001.md)、RPT-002 實作與實站差異

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
人：探索 → 升級為 REQ / BR / ADR（人核准）
          → kb build → ai-context.md（只含已決定的知識）
AI：先寫測試（名稱含 REQ-001#AC2）→ 實作
閘門：npm run verify（含 kb validate 與知識↔測試追溯）→ 人 review → 合併 → 錯誤記入 RPT-001
```

詳見 [ADR-004](docs/decisions/ADR-004.md)。

## 優先順序與刻意不做

| 優先     | 內容                                                                     |
| -------- | ------------------------------------------------------------------------ |
| P0       | 搜尋（排序、品牌篩選、價格區間、分頁、URL 狀態）、商品頁、加入購物車     |
| P1       | 錯誤／空狀態細節、首頁（輪播、限時搶購、商品帶）、舊網址相容             |
| 刻意不做 | `/discover`、`/live`、購物車頁與結帳、會員、屬性篩選（尺寸、容量…）、SSR |

每一項「不做」的理由寫在對應 REQ 的「不在範圍內」。

## 品質報告

（Phase 2 結束後填寫：知識↔測試追溯、測試數、E2E、Lighthouse、bundle 大小）

## 已知限制

（Phase 2 結束後填寫）

## 後續演進方向

（Phase 2 結束後填寫）
