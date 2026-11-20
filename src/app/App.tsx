import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { ToastProvider } from '@/components'
import { CartProvider } from '@/features/cart'
import { createQueryClient } from './queryClient'
import { routes } from './routes'

const router = createBrowserRouter(routes)

export default function App() {
  const [queryClient] = useState(createQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <CartProvider>
          <RouterProvider router={router} />
        </CartProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
