import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextInput } from './TextInput'

describe('TextInput (ADR-006)', () => {
  it('ADR-006 與 label 關聯後可被查到，輸入觸發 onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<() => void>()
    render(
      <>
        <label htmlFor="kw">關鍵字</label>
        <TextInput id="kw" onChange={onChange} />
      </>,
    )
    const input = screen.getByLabelText('關鍵字')
    expect(input).toHaveAttribute('type', 'text')
    await user.type(input, 'abc')
    expect(onChange).toHaveBeenCalledTimes(3)
    expect(input).toHaveValue('abc')
  })

  it('ADR-006 type="number" 時 role 為 spinbutton', () => {
    render(<TextInput type="number" aria-label="最低價" />)
    expect(screen.getByRole('spinbutton', { name: '最低價' })).toBeInTheDocument()
  })

  it('ADR-006 disabled 時無法輸入', async () => {
    const user = userEvent.setup()
    render(<TextInput aria-label="關鍵字" disabled />)
    const input = screen.getByLabelText('關鍵字')
    await user.type(input, 'abc')
    expect(input).toHaveValue('')
  })
})
