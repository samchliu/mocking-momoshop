---
id: ARCH-001
title: 前端架構總覽
type: architecture
knowledge_state: authoritative
status: approved
owner: RD
authors: [RD, AI]
created: 2026-11-20
updated: 2026-11-20
last_reviewed: 2026-11-20
approved_by:
  who: RD
  date: 2026-11-20
source_of_truth: self
related:
  - id: REQ-001
    rel: implements
  - id: REQ-002
    rel: implements
  - id: REQ-003
    rel: implements
  - id: ADR-001
    rel: governed_by
  - id: ADR-002
    rel: governed_by
  - id: ADR-003
    rel: governed_by
  - id: ADR-005
    rel: governed_by
  - path: src/app/routes.tsx
    rel: implemented_in
tags: [architecture]
---

# ARCH-001：前端架構總覽

## 概觀

Vite + React 19 + TypeScript（strict）的 CSR SPA（ADR-001）。以「依賴方向單向」的分層組織程式碼，讓每個功能（feature）可以由一個 agent 獨立開發、由人逐份 review。

```
app/  (routes、providers、layout)
  │ 組裝
pages/  ──────────────►  features/<domain>/  ──►  api/  ──►  mock backend
  │ 只組裝，不含業務        │ query hooks、規則純函式、     (唯一網路出口)   (API-001)
  ▼                         │ 領域元件
components/  ◄──────────────┘  無業務的共用 UI
lib/  純函式（money、format、safeUrl、sanitize、storage）
```

**依賴規則**：`pages → features → api/lib/components`；feature 之間不互相 import（共用的放到 `features/catalog` 或 `lib`）；`components/` 與 `lib/` 不 import features。

## 元件

| 模組               | 職責                                                            | 對應             |
| ------------------ | --------------------------------------------------------------- | ---------------- |
| `app/`             | 路由（lazy route）、QueryClient、Toast、Layout、版頭            | ADR-005          |
| `api/`             | `request()`：型別 parser、AbortSignal、timeout、統一 `ApiError` | ADR-003          |
| `api/mock/`        | 確定性 mock 資料與 handler、故障注入                            | API-001、ADR-003 |
| `features/catalog` | 商品型別與 parser、`ProductCard`、價格顯示規則                  | BR-001           |
| `features/search`  | URL 條件 ↔ 查詢參數、`useSearchQuery`、篩選／排序／分頁 UI      | REQ-001、BR-002  |
| `features/goods`   | `useProductQuery`、價格區塊、規格與數量、加入購物車             | REQ-002          |
| `features/cart`    | `cartReducer`（純函式）、`CartProvider`、樂觀更新與回滾、持久化 | BR-003           |
| `features/home`    | 輪播、限時搶購（倒數）、商品帶                                  | REQ-003          |
| `lib/telemetry`    | 事件匯流排：API 指標、錯誤、Web Vitals                          | OPS-001          |

## 資料流

- **Server state**：TanStack Query。query key = 完整條件（例：`['search', {keyword, sort, brands, min, max, page}]`），queryFn 傳入 `signal` → 條件切換時取消舊請求（ADR-002）。
- **URL state**：搜尋條件全部在 URL；`features/search/params.ts` 負責 URL ↔ 型別化條件的雙向轉換與正規化（BR-002#R1、R5、R6）。
- **Client state**：購物車 = Context + `useReducer`，持久化到 localStorage（BR-003#R6）。
- **衍生資料**（總數、折數）在 render 時計算，不存 state。

## 介面

前端只透過 `api/request()` 存取 API-001 定義的端點；所有回應經 parser 驗證後才進入 React。

## 效能

- Route-level code splitting；首屏以下區塊 `LazySection`。
- 圖片固定寬高（CLS）、LCP 圖 `priority`、其餘 lazy。
- Query 快取（staleTime 30s）讓「搜尋 → 商品 → 返回搜尋」不重新請求。
- 以 Lighthouse CI 門檻驗證（OPS-001）。

## 安全

- 不使用 `dangerouslySetInnerHTML`；URL 走 `safeUrl`；關鍵字經 BR-002#R1 正規化。
- API 回應與 localStorage 一律 parser 驗證。
- Build 時注入 CSP。

## 失效處理

| 失效            | 處理                                          |
| --------------- | --------------------------------------------- |
| API 慢          | 骨架畫面；8 秒 timeout                        |
| API 5xx／網路   | 自動重試 2 次（指數退避）→ 錯誤畫面＋重試按鈕 |
| 4xx（404／409） | 不重試；顯示對應訊息                          |
| 元件例外        | 各區塊 ErrorBoundary，不讓整頁白屏            |
| 離線            | 離線橫幅                                      |

## 擴展性

- 新增路由（`/discover`、`/live`）= 新增 `features/<domain>` + 一個 lazy route，不需改既有 feature。
- 實站的屬性篩選：API-001 的 `facets` 已設計為「facet 陣列」，新增屬性 facet 不需改 UI 元件結構。
- 改接真實 API：只換 `api/` 的 transport，parser 保留作為契約檢查。

## 相關 ADR

ADR-001、ADR-002、ADR-003、ADR-004、ADR-005

## 規劃中（尚未實作）

- SSR/ISR 版本的商品頁（ADR-001 的演進方向）
- telemetry 送往實際的收集端點（目前只到 console 與 dev 面板）

## 變更歷史

| 日期       | 變更          |
| ---------- | ------------- |
| 2026-11-20 | 建立（draft） |
