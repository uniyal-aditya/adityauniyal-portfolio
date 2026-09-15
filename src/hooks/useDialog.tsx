import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TriangleAlert, Info } from 'lucide-react'
import { DIALOG_EVENT, type ActiveDialog } from './dialog-bus'

/**
 * Designed dialog host — replaces every native confirm/alert/prompt.
 * Mount once (main.tsx). Fire dialogs from anywhere via dialog-bus.ts:
 *   const ok  = await confirmDialog({ title: 'Delete post?', tone: 'rust' })
 *   const url = await promptDialog({ title: 'Link URL', placeholder: 'https://…' })
 *   infoDialog({ title: 'Something went wrong', body: msg })
 */

export function DialogHost() {
  const [dlg, setDlg] = useState<ActiveDialog | null>(null)
  const [value, setValue] = useState('')
  const confirmRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onAsk = (e: Event) => {
      const detail = (e as CustomEvent).detail as ActiveDialog
      setValue(detail.kind === 'prompt' ? (detail.initial ?? '') : '')
      setDlg(detail)
    }
    window.addEventListener(DIALOG_EVENT, onAsk)
    return () => window.removeEventListener(DIALOG_EVENT, onAsk)
  }, [])

  // focus: prompt → its input, confirm → the primary button
  useEffect(() => {
    if (!dlg) return
    const t = window.setTimeout(() => {
      if (dlg.kind === 'prompt') inputRef.current?.focus()
      else confirmRef.current?.focus()
    }, 30)
    return () => window.clearTimeout(t)
  }, [dlg])

  // Escape cancels while a dialog is open
  useEffect(() => {
    if (!dlg) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finish closes the active dialog instance
  }, [dlg])

  function finish(v: boolean | string | null) {
    if (!dlg) return
    dlg.resolve(v)
    setDlg(null)
  }

  const rust = dlg?.tone === 'rust'
  const info = dlg?.tone === 'info'
  const accent = rust ? 'var(--rust)' : 'var(--lime)'

  return (
    <AnimatePresence>
      {dlg && (
        <motion.div
          className="au-dialog-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => { if (!info) finish(false) }}
        >
          <motion.div
            className="au-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="au-dialog-title"
            style={{ borderLeftColor: accent }}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="au-dialog-kicker meta">
              {rust && <TriangleAlert size={12} aria-hidden="true" />}
              {info && <Info size={12} aria-hidden="true" />}
              {rust ? 'AU_ / CONFIRM' : info ? 'AU_ / NOTICE' : dlg.kind === 'prompt' ? 'AU_ / INPUT' : 'AU_ / CONFIRM'}
            </div>
            <h3 id="au-dialog-title" className="au-dialog-title">{dlg.title}</h3>
            {dlg.body && <p className="au-dialog-body">{dlg.body}</p>}
            {dlg.kind === 'prompt' ? (
              <form
                className="au-dialog-form"
                onSubmit={(e) => { e.preventDefault(); finish(value.trim() || null) }}
              >
                <label className="cf-label" htmlFor="au-dialog-input">{dlg.inputLabel ?? 'Value'}</label>
                <input
                  ref={inputRef}
                  id="au-dialog-input"
                  className="cf-input"
                  value={value}
                  placeholder={dlg.placeholder}
                  onChange={(e) => setValue(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <div className="au-dialog-actions">
                  <button type="button" className="btn-ghost-line btn-small" onClick={() => finish(null)}>Cancel</button>
                  <button type="submit" className="btn-lime btn-small">{dlg.confirmLabel ?? 'OK'}</button>
                </div>
              </form>
            ) : (
              <div className="au-dialog-actions">
                {!info && (
                  <button type="button" className="btn-ghost-line btn-small" onClick={() => finish(false)}>
                    {dlg.cancelLabel ?? 'Cancel'}
                  </button>
                )}
                <button
                  ref={confirmRef}
                  type="button"
                  className={(rust ? 'btn-rust' : 'btn-lime') + ' btn-small'}
                  onClick={() => finish(true)}
                >
                  {dlg.confirmLabel ?? 'Confirm'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
