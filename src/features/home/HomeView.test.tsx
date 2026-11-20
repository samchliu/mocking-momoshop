import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fastMock, renderRoute } from '@/test/render'

describe('Home page', () => {
  beforeEach(fastMock)

  it('REQ-003#AC1 renders a skeleton first, then carousel, flash sale and hot keywords', async () => {
    renderRoute('/')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'momo 購物首頁' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('首頁載入中')).toHaveAttribute('aria-busy', 'true')

    expect(await screen.findByRole('region', { name: '主打活動' })).toBeInTheDocument()
    expect(screen.queryByLabelText('首頁載入中')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '限時搶購' })).toBeInTheDocument()
    expect(screen.getByRole('timer', { name: '距離結束' })).toHaveTextContent(/^\d{2}:\d{2}:\d{2}$/)
    expect(screen.getByRole('link', { name: 'iphone' })).toHaveAttribute('href', '/search/iphone')
    expect(screen.getByRole('heading', { level: 2, name: '大家都在買' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('shows an error with 「重試」 that recovers', async () => {
    window.history.replaceState(null, '', '/?latency=0&fail=1')
    renderRoute('/')
    const retry = await screen.findByRole('button', { name: '重試' })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fastMock()
    await userEvent.click(retry)
    expect(await screen.findByRole('region', { name: '主打活動' })).toBeInTheDocument()
  })
})
