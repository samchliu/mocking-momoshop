# Project Guide（給 AI agent 與協作者）

## 知識在哪裡（先讀）

本專案以 [living-kb](https://github.com/samchliu/living-kb) 管理知識。**`docs/` 是事實來源，程式碼是實作。**

| 我要…                | 讀                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------ |
| 實作或修改某個功能   | `npx kb build` 後讀 `docs/_build/features/REQ-xxx/ai-context.md`（只含已決定的知識） |
| 知道某條規則影響什麼 | `npx kb trace BR-002`                                                                |
| 知道為什麼這樣設計   | `docs/decisions/ADR-*.md`、`docs/architecture/ARCH-001.md`                           |
| 知道 API 長什麼樣    | `docs/api/API-001.md`                                                                |
| 知道怎麼驗證         | `docs/operations/OPS-001.md`                                                         |

### AI 的權限（ADR-004、living-kb AI 政策）

- 可以：起草任何文件（`status: draft`、`authors` 含 `AI`）、補連結、修錯字、提出 diff。
- **不得**：填寫 `approved_by`；把 draft 改為 approved／active；把 EXP／REF 的內容直接當成規格；修改 `docs/reference/`、已封存的紀錄；執行 `kb seal --reseal`。
- 程式碼與 REQ／BR 不一致時：**不要**選邊修改，回報 DRIFT 給負責人（`OWNERSHIP.md`）。
- 規格沒寫到的：不要發明，列為問題回報。
- 起草或修改的權威文件（REQ／BR／API／ADR），**核准前先跑 `/ambiguity-check <ID>`**（`.claude/skills/ambiguity-check/`）：由乾淨 context 的 subagent 找出需要猜測的地方，只回報、不改文件。

## 開發流程（SDD：Spec → Test → Code）— 必須遵守

1. **開 branch + worktree**：`npm run worktree -- <name>`，會建立 `feat/<name>` 分支與 `.worktrees/<name>`。所有開發都在 worktree 裡進行，**不直接在 main 上改程式碼**。
2. 讀 `ai-context.md`（`npm run kb:build`）與被指派的檔案範圍。
3. **先寫測試**：測試名稱包含知識 ID，例如 `it('REQ-001#AC2 價格低→高排序並回到第 1 頁', …)`、`it('BR-002#R5 頁碼超出範圍時修正到最後一頁', …)`。執行並**確認是紅的**。
4. **再實作**到綠；重構。在關鍵位置加註解 `// knowledge: BR-002#R5`。
5. **commit 前必須通過 lint、typecheck、test**（pre-commit hook 強制執行，另含 lint-staged 格式化與 `kb validate`）。不得使用 `--no-verify` 略過。
6. 分支內檢查自己負責的知識：`npm run spec:check -- REQ-001 BR-002`（P0 必須全有測試）。先完成 P0，再做 P1。
7. 回報：修改的檔案、做了哪些假設、與規格不一致之處。
8. **合併回 main**（由整合者執行）：review diff → `git merge --no-ff feat/<name>` → 在 main 跑 `npm run verify`（全量 `spec:check`）→ 移除 worktree：`git worktree remove .worktrees/<name>`。

### 測試先行的 commit 方式

pre-commit 要求測試全綠，所以「紅燈階段」不 commit。一個 commit 包含「測試 + 讓它變綠的實作」。如果需要保存進度，用 `git stash` 或在 worktree 內暫不 commit。

## Commands

| 指令                    | 用途                                                                             |
| ----------------------- | -------------------------------------------------------------------------------- |
| `npm run verify`        | kb validate → typecheck → lint → format → spec:check → unit test（**完成定義**） |
| `npm run kb:build`      | 產生 `docs/_build/`（功能總覽、QA 清單、ai-context）                             |
| `npm run kb:trace <ID>` | 追溯某份知識的上下游                                                             |
| `npm run e2e`           | Playwright（desktop + mobile）                                                   |
| `npm run lhci`          | Lighthouse CI                                                                    |
| 故障注入                | 網址加 `?latency=3000`、`?fail=0.3`、`?offline=1`；`?debug=1` 開 telemetry 面板  |

## 目錄與歸屬（ARCH-001）

```
src/
  app/              routes、providers、Layout、SiteHeader、queryClient      (integrator)
  api/              request()：parser、AbortSignal、timeout、ApiError；mock/ 為 mock 後端（API-001）
  features/<domain>/  catalog | search | goods | cart | home：query hooks、規則純函式、領域元件、測試
  pages/            路由頁面（lazy），只組裝 features
  components/       無業務共用 UI：SmartImage / SafeLink / LazySection / ErrorBoundary /
                    StatusView / Spinner / Toast / Dialog / OfflineBanner / Button / TextInput
  hooks/            useSearchParamsState / useInView / useOnlineStatus / useFocusReturn
  lib/              money / format / safeUrl / sanitize / storage / telemetry
  styles/           tokens.css / global.css                                 (integrator)
docs/               知識庫（living-kb）
```

- 依賴方向：`pages → features → api / lib / components`。**feature 之間不互相 import**（共用的放 `features/catalog` 或 `lib`）。
- 被指派單一 feature 時，只能修改 `src/features/<domain>/**`（以及該 feature 的 page）。需要共用型別、token、API 變更時，回報給整合者。

## Coding rules

- TS strict；API 回應一律經 parser 驗證，不得用 `any` 或 `as` 斷言 API 資料。
- Server state 一律 `api/request` + TanStack Query（query key 含全部條件，queryFn 傳 `signal`）。**禁止 useEffect 抓資料**。
- 搜尋條件放 URL（`useSearchParamsState`）；衍生資料在 render 時計算，不存 state、不用 effect 同步。
- 購物車：Context + `useReducer`（純函式 + 單元測試）；持久化用 `lib/storage`（讀回驗證）。
- 金額一律整數，用 `lib/money`；顯示用 `formatPrice`（BR-001）。
- 會改變資料的操作：pending 時停用按鈕、用 `useToast` 回饋、失敗回滾（BR-003）。
- 非同步畫面用 `<StatusView>`；錯誤訊息用 `toUserMessage`；Modal 用 `<Dialog>`。
- 有文字的按鈕用 `<Button>`（請求進行中傳 `pending`，其他停用原因傳 `disabled`；pending 結束要還原焦點時用 `useFocusReturn`）；text／search／number 輸入框用 `<TextInput>`。純圖示按鈕、其他 input type、textarea、以及 ADR-006 遷移清單標為「不遷」的種類除外（ADR-006）。
- 樣式只用 CSS module + `var(--token)`，不寫 inline `style`（oxlint `react/forbid-dom-props` 強制；執行期動態值例外，需 `oxlint-disable-next-line` 並註明原因）；圖片用 `<SmartImage>`（寬高必填，只有 LCP 圖加 `priority`）；連結用 `<SafeLink>`；首屏以下用 `LazySection`。
- 語意化 HTML、可鍵盤操作、觸控目標 ≥ 44px。
- 禁止 `dangerouslySetInnerHTML`、`eval`；前端不放 secret。
- 不新增 runtime 依賴，除非 ADR 允許。`memo`／`useMemo` 只在量測證明需要時才加。

## Testing rules

- 以 `getByRole`／`getByLabelText` 查詢；測行為不測實作。
- 業務規則（BR）在純函式或 mock 後端層做單元測試；元件測試驗證 REQ 的驗收條件。
- 需要 router／query 的元件測試：用 `createMemoryRouter` + `createQueryClient()`（參考 `src/app/App.test.tsx`）。
- 慢速、失敗、連點都要有測試。

## Commit

- Conventional commits（commitlint 強制，`commitlint.config.mjs`）：type 為 feat／fix／docs／style／refactor／perf／test／build／ci／chore／revert；header 最長 100 字；可用中文。
- **`feat`／`fix` 必須附知識 ID**（commitlint 自訂規則 `knowledge-reference`），例如 `feat(search): sort & paginate results (REQ-001#AC2, BR-002#R5)`。
- 結尾加上 `Co-Authored-By: Claude <noreply@anthropic.com>`。

### Hooks（husky）

| Hook         | 執行                                                                                    |
| ------------ | --------------------------------------------------------------------------------------- |
| `pre-commit` | lint-staged（prettier + oxlint）→ lint → typecheck → test → `kb validate --code-root .` |
| `commit-msg` | commitlint（conventional + 知識 ID 規則）                                               |
