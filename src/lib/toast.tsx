import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'info'
type ToastItem = { id: number; kind: ToastKind; message: string }

type ToastContextValue = (message: string, kind?: ToastKind) => void

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_DURATION_MS = 4000
const TOAST_ICON: Record<ToastKind, typeof CheckCircle2> = { success: CheckCircle2, error: XCircle, info: Info }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback<ToastContextValue>((message, kind = 'success') => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, kind, message }])
    setTimeout(() => dismiss(id), TOAST_DURATION_MS)
  }, [dismiss])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-viewport" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = TOAST_ICON[toast.kind]
          return (
            <div key={toast.id} className={`toast toast-${toast.kind}`}>
              <Icon size={18} />
              <span>{toast.message}</span>
              <button type="button" onClick={() => dismiss(toast.id)} aria-label="Fechar aviso"><X size={14} /></button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// Hook pra disparar notificações rápidas (sucesso, erro, aviso) sem travar a tela.
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de um <ToastProvider>.')
  return ctx
}
