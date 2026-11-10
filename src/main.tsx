import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { LazyMotion, domAnimation } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './styles/index.css'
import { AuthProvider } from '@/hooks/useAuth'
import { ToastProvider } from '@/hooks/useToast'
import { DialogHost } from '@/hooks/useDialog'
import { SocialModalProvider } from '@/components/system/SocialModalProvider'
import { FxRoot } from '@/components/system/FxRoot'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* domAnimation + `m` components: same animations, about half the eager framer-motion payload */}
    <LazyMotion features={domAnimation}>
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <SocialModalProvider>
                <App />
                <FxRoot />
              </SocialModalProvider>
              <DialogHost />
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </LazyMotion>
  </StrictMode>,
)
