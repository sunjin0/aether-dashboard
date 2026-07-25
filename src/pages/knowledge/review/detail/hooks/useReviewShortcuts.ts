import { useEffect } from 'react'

interface ShortcutHandlers {
  onAccept?: () => void
  onReject?: () => void
  onNext?: () => void
  onPrev?: () => void
  onBatchAccept?: () => void
}

export const useReviewShortcuts = (
  enabled: boolean,
  handlers: ShortcutHandlers,
) => {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.closest('.monaco-editor'))
      ) {
        return
      }

      switch (e.key.toLowerCase()) {
        case 'a':
          e.preventDefault()
          handlers.onAccept?.()
          break
        case 'r':
          e.preventDefault()
          handlers.onReject?.()
          break
        case 'n':
        case 'arrowdown':
          e.preventDefault()
          handlers.onNext?.()
          break
        case 'p':
        case 'arrowup':
          e.preventDefault()
          handlers.onPrev?.()
          break
        case 'b':
          e.preventDefault()
          handlers.onBatchAccept?.()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handlers])
}
