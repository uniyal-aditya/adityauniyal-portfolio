import { createContext, useContext, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface ToastItem {
  id: number
  msg: string
  error: boolean
}

const Ctx = createContext<{ toast: (msg: string, error?: boolean) => void } | null>(null)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  function toast(msg: string, error = false) {
    const id = nextId++
    setItems((prev) => [...prev.slice(-3), { id, msg, error }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 3600)
  }

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div
        className="toast-region"
        role="status"
        aria-live="polite"
        style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 2000 }}
      >
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              className={'toast' + (t.error ? ' error' : '')}
            >
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
