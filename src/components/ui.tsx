'use client'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Banknote, CircleAlert, CircleCheck, CreditCard, QrCode, Wallet, X } from 'lucide-react'
import type { FormaPagamento } from '@/lib/types'

// ------------------------------------------------------------
//  Modal (desktop: centralizado · mobile: bottom sheet)
// ------------------------------------------------------------
export function Modal({
  aberto,
  onFechar,
  titulo,
  subtitulo,
  children,
  rodape,
  grande,
  semCabecalho,
}: {
  aberto: boolean
  onFechar: () => void
  titulo?: ReactNode
  subtitulo?: ReactNode
  children: ReactNode
  rodape?: ReactNode
  grande?: boolean
  semCabecalho?: boolean
}) {
  useEffect(() => {
    if (!aberto) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [aberto, onFechar])

  if (!aberto) return null

  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onFechar()}>
      <div className={`sheet ${grande ? 'sheet-lg' : ''}`} role="dialog" aria-modal="true">
        {!semCabecalho && (
          <div className="sheet-head">
            <div>
              {titulo && <h2 className="sheet-title">{titulo}</h2>}
              {subtitulo && <div className="sheet-sub">{subtitulo}</div>}
            </div>
            <button className="icon-btn" onClick={onFechar} aria-label="Fechar" id="modal-fechar">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {rodape && <div className="sheet-foot">{rodape}</div>}
      </div>
    </div>
  )
}

// ------------------------------------------------------------
//  Botão com confirmação em dois cliques
// ------------------------------------------------------------
export function BotaoConfirmar({
  children,
  confirmar = 'Tem certeza?',
  onConfirmar,
  className = 'btn btn-danger',
  disabled,
  id,
}: {
  children: ReactNode
  confirmar?: ReactNode
  onConfirmar: () => void
  className?: string
  disabled?: boolean
  id?: string
}) {
  const [armado, setArmado] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return (
    <button
      id={id}
      className={className}
      disabled={disabled}
      style={armado ? { background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' } : undefined}
      onClick={() => {
        if (armado) {
          setArmado(false)
          onConfirmar()
          return
        }
        setArmado(true)
        timer.current = setTimeout(() => setArmado(false), 3500)
      }}
    >
      {armado ? confirmar : children}
    </button>
  )
}

// ------------------------------------------------------------
//  Avatar com cor derivada do nome
// ------------------------------------------------------------
const CORES_AVATAR = [
  'linear-gradient(135deg,#6366f1,#4338ca)',
  'linear-gradient(135deg,#14b8a6,#0f766e)',
  'linear-gradient(135deg,#f59e0b,#c2410c)',
  'linear-gradient(135deg,#ec4899,#be185d)',
  'linear-gradient(135deg,#8b5cf6,#6d28d9)',
  'linear-gradient(135deg,#22c55e,#15803d)',
  'linear-gradient(135deg,#0ea5e9,#0369a1)',
]

export function Avatar({ nome, size = 36 }: { nome: string; size?: number }) {
  const iniciais = nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('')
  let hash = 0
  for (const ch of nome) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return (
    <span
      className="avatar"
      style={{ background: CORES_AVATAR[hash % CORES_AVATAR.length], width: size, height: size, fontSize: size * 0.36 }}
    >
      {iniciais || '?'}
    </span>
  )
}

// ------------------------------------------------------------
//  Formas de pagamento
// ------------------------------------------------------------
export const COR_FORMA: Record<FormaPagamento, string> = {
  pix: 'var(--c-pix)',
  dinheiro: 'var(--c-dinheiro)',
  debito: 'var(--c-debito)',
  credito: 'var(--c-credito)',
}

export function IconeForma({ forma, size = 20 }: { forma: FormaPagamento; size?: number }) {
  if (forma === 'pix') return <QrCode size={size} />
  if (forma === 'dinheiro') return <Banknote size={size} />
  if (forma === 'debito') return <CreditCard size={size} />
  return <Wallet size={size} />
}

// ------------------------------------------------------------
//  Toasts
// ------------------------------------------------------------
type Toast = { id: number; texto: string; tipo: 'success' | 'error' }
const ToastCtx = createContext<(texto: string, tipo?: Toast['tipo']) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const mostrar = useCallback((texto: string, tipo: Toast['tipo'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, texto, tipo }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }, [])

  return (
    <ToastCtx.Provider value={mostrar}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.tipo}`}>
            {t.tipo === 'success' ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
            {t.texto}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
