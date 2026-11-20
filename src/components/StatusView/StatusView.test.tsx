import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/api'
import { StatusView } from './StatusView'

describe('StatusView', () => {
  it('shows a loading status while pending', () => {
    render(
      <StatusView isPending error={null}>
        content
      </StatusView>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('載入中')
    expect(screen.queryByText('content')).not.toBeInTheDocument()
  })

  it('shows an actionable error with retry', async () => {
    const onRetry = vi.fn<() => void>()
    render(
      <StatusView isPending={false} error={new ApiError('network', 'x')} onRetry={onRetry}>
        content
      </StatusView>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('網路連線異常')
    await userEvent.click(screen.getByRole('button', { name: '重試' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('disables retry while retrying (no duplicate requests)', () => {
    render(
      <StatusView
        isPending={false}
        error={new ApiError('timeout', 'x')}
        onRetry={() => {}}
        isRetrying
      >
        content
      </StatusView>,
    )
    expect(screen.getByRole('button', { name: '重試中…' })).toBeDisabled()
  })

  it('ADR-006 以鍵盤重試且重試失敗時，焦點回到「重試」按鈕', async () => {
    const user = userEvent.setup()
    const error = new ApiError('network', 'x')
    const view = (isRetrying: boolean) => (
      <StatusView isPending={false} error={error} onRetry={() => {}} isRetrying={isRetrying}>
        content
      </StatusView>
    )
    const { rerender } = render(view(false))
    const button = screen.getByRole('button', { name: '重試' })
    button.focus()
    await user.keyboard('{Enter}')
    rerender(view(true))
    expect(screen.getByRole('button', { name: '重試中…' })).toHaveAttribute('aria-busy', 'true')
    rerender(view(false))
    expect(screen.getByRole('button', { name: '重試' })).toHaveFocus()
  })

  it('shows the empty state with a hint', () => {
    render(
      <StatusView
        isPending={false}
        error={null}
        isEmpty
        emptyTitle="查無結果"
        emptyHint={<p>換個關鍵字</p>}
      >
        content
      </StatusView>,
    )
    expect(screen.getByText('查無結果')).toBeInTheDocument()
    expect(screen.getByText('換個關鍵字')).toBeInTheDocument()
  })

  it('renders content on success', () => {
    render(
      <StatusView isPending={false} error={null}>
        content
      </StatusView>,
    )
    expect(screen.getByText('content')).toBeInTheDocument()
  })
})
