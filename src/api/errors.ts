export type ApiErrorKind = 'network' | 'timeout' | 'aborted' | 'http' | 'parse'

/** Single error shape for every request, so UI can decide message + recovery uniformly. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }

  /** Whether retrying could help (used by the query client's retry policy). */
  get retryable(): boolean {
    return this.kind === 'network' || this.kind === 'timeout' || (this.status ?? 0) >= 500
  }
}

/** User-facing message: what happened + what to do next. */
export function toUserMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return '發生未預期的錯誤，請重新整理頁面。'
  switch (error.kind) {
    case 'network':
      return '網路連線異常，請確認網路後重試。'
    case 'timeout':
      return '伺服器回應逾時，請稍後再試。'
    case 'http':
      if (error.status === 404) return '找不到您要的資料。'
      if (error.status === 409) return '資料已變更（例如庫存不足），請重新確認。'
      if ((error.status ?? 0) >= 500) return '服務暫時無法使用，請稍後再試。'
      return '請求失敗，請稍後再試。'
    default:
      return '資料讀取失敗，請重試。'
  }
}
