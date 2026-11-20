import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Dialog } from './Dialog'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="選擇規格">
        <p>body</p>
      </Dialog>
    </>
  )
}

describe('Dialog', () => {
  it('opens as a labelled modal and closes via the close button', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'open' }))
    expect(screen.getByRole('dialog', { name: '選擇規格' })).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: '關閉' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on ESC (native cancel event)', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'open' }))
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
