import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button (ADR-006)', () => {
  it('ADR-006 未傳 type 時為 type="button"；傳 submit 時為 submit', () => {
    const { rerender } = render(<Button>送出</Button>)
    expect(screen.getByRole('button', { name: '送出' })).toHaveAttribute('type', 'button')
    rerender(<Button type="submit">送出</Button>)
    expect(screen.getByRole('button', { name: '送出' })).toHaveAttribute('type', 'submit')
  })

  it('ADR-006 取得焦點後，點擊、Enter、Space 各觸發 onClick 1 次', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn<() => void>()
    render(<Button onClick={onClick}>加入</Button>)
    const button = screen.getByRole('button', { name: '加入' })

    await user.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
    button.focus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(2)
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(3)
  })

  it('ADR-006 pending 時為 disabled 且 aria-busy="true"', () => {
    render(<Button pending>加入</Button>)
    const button = screen.getByRole('button', { name: '加入' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('ADR-006 BR-003#R4 pending 時點擊、Enter、Space 都不觸發 onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn<() => void>()
    const { rerender } = render(<Button onClick={onClick}>加入</Button>)
    const button = screen.getByRole('button', { name: '加入' })
    button.focus()
    rerender(
      <Button onClick={onClick} pending>
        加入
      </Button>,
    )

    await user.click(button)
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('ADR-006 pending 且 disabled={false} 時仍為 disabled', () => {
    render(
      <Button pending disabled={false}>
        加入
      </Button>,
    )
    expect(screen.getByRole('button', { name: '加入' })).toBeDisabled()
  })

  it('ADR-006 非 pending 時不輸出 aria-busy', () => {
    render(<Button>加入</Button>)
    expect(screen.getByRole('button', { name: '加入' })).not.toHaveAttribute('aria-busy')
  })

  it('ADR-006 disabled 時點擊不觸發 onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn<() => void>()
    render(
      <Button onClick={onClick} disabled>
        已售完
      </Button>,
    )
    await user.click(screen.getByRole('button', { name: '已售完' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('ADR-006 tone 只能搭配 primary（型別檢查）', () => {
    render(
      <>
        <Button tone="cart">a</Button>
        <Button variant="primary" tone="nav">
          b
        </Button>
        {/* @ts-expect-error tone is only allowed with variant="primary" */}
        <Button variant="secondary" tone="cart">
          c
        </Button>
        {/* @ts-expect-error tone is only allowed with variant="primary" */}
        <Button variant="text" tone="nav">
          d
        </Button>
      </>,
    )
    expect(screen.getAllByRole('button')).toHaveLength(4)
  })
})
