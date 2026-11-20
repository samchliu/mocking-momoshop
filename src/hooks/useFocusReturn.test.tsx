import { render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { useFocusReturn } from './useFocusReturn'

function Harness({
  pending,
  disabled = false,
  show = true,
}: {
  pending: boolean
  disabled?: boolean
  show?: boolean
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const capture = useFocusReturn(ref, pending)
  return (
    <>
      {show && (
        <button ref={ref} type="button" disabled={pending || disabled} onClick={capture}>
          go
        </button>
      )}
      <input aria-label="other" />
    </>
  )
}

const button = () => screen.getByRole('button', { name: 'go' })

/** Keyboard activation, then the browser drops focus to <body> (jsdom keeps it on disabled buttons). */
const activateAndLoseFocus = () => {
  button().focus()
  button().click()
  button().blur()
}

describe('useFocusReturn (ADR-006)', () => {
  it('ADR-006 pending 結束後，把遺失的焦點還給按鈕', () => {
    const { rerender } = render(<Harness pending={false} />)
    activateAndLoseFocus()
    rerender(<Harness pending />)
    rerender(<Harness pending={false} />)
    expect(button()).toHaveFocus()
  })

  it('ADR-006 pending 結束時按鈕轉為 disabled（例如加入後售完）則不還原', () => {
    const { rerender } = render(<Harness pending={false} />)
    activateAndLoseFocus()
    rerender(<Harness pending />)
    rerender(<Harness pending={false} disabled />)
    expect(button()).not.toHaveFocus()
  })

  it('ADR-006 按鈕已卸載時不還原、不拋錯', () => {
    const { rerender } = render(<Harness pending={false} />)
    activateAndLoseFocus()
    rerender(<Harness pending />)
    rerender(<Harness pending={false} show={false} />)
    expect(document.body).toHaveFocus()
  })

  it('ADR-006 啟動時按鈕沒有焦點（滑鼠點擊未聚焦）則不還原', () => {
    const { rerender } = render(<Harness pending={false} />)
    button().click()
    rerender(<Harness pending />)
    rerender(<Harness pending={false} />)
    expect(button()).not.toHaveFocus()
  })

  it('ADR-006 pending 期間使用者已把焦點移到別處，則不搶回', () => {
    const { rerender } = render(<Harness pending={false} />)
    activateAndLoseFocus()
    rerender(<Harness pending />)
    screen.getByLabelText('other').focus()
    rerender(<Harness pending={false} />)
    expect(screen.getByLabelText('other')).toHaveFocus()
  })
})
