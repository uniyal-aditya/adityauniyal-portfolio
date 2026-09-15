/**
 * Dialog event bus — plain functions, no React.
 * Rendered by <DialogHost /> in useDialog.tsx. See that file for usage.
 */

export interface ConfirmOptions {
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  /** 'lime' default confirm · 'rust' destructive · 'info' notice with single OK */
  tone?: 'lime' | 'rust' | 'info'
}

export interface PromptOptions extends ConfirmOptions {
  placeholder?: string
  initial?: string
  inputLabel?: string
}

export interface ActiveDialog extends ConfirmOptions {
  kind: 'confirm' | 'prompt'
  placeholder?: string
  initial?: string
  inputLabel?: string
  resolve: (v: boolean | string | null) => void
}

export const DIALOG_EVENT = 'au:dialog'

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent(DIALOG_EVENT, {
        detail: { ...opts, kind: 'confirm', resolve: (v: boolean | string | null) => resolve(v === true) },
      }),
    )
  })
}

export function promptDialog(opts: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent(DIALOG_EVENT, {
        detail: {
          ...opts,
          kind: 'prompt',
          tone: opts.tone ?? 'lime',
          resolve: (v: boolean | string | null) => resolve(typeof v === 'string' ? v : null),
        },
      }),
    )
  })
}

export function infoDialog(opts: ConfirmOptions): void {
  void confirmDialog({ ...opts, tone: 'info', confirmLabel: opts.confirmLabel ?? 'OK', cancelLabel: '' })
}
