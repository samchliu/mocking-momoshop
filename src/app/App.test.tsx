import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { ToastProvider } from '@/components'
import { createQueryClient } from './queryClient'
import { routes } from './routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('App shell', () => {
  it('exposes landmarks, a skip link and the home page', async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { level: 1, name: '首頁' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '跳到主要內容' })).toHaveAttribute('href', '#main')
  })

  it('renders a not-found page with a way back', async () => {
    renderAt('/does-not-exist')
    expect(await screen.findByRole('heading', { name: '找不到這個頁面' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '回到首頁' })).toHaveAttribute('href', '/')
  })
})
