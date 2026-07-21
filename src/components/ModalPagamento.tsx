'use client'
import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

type Props = {
  isOpen: boolean
  onClose: () => void
  onConfirm: (formaPagamento: string) => void
  resumoMesas: string
  total: number
  payloadPix: string
  isLoading: boolean
}

export function ModalPagamento({ isOpen, onClose, onConfirm, resumoMesas, total, payloadPix, isLoading }: Props) {
  const [metodo, setMetodo] = useState<'pix' | 'dinheiro' | 'debito' | 'credito' | null>(null)

  if (!isOpen) return null

  const copiarPixCola = () => {
    navigator.clipboard.writeText(payloadPix).then(() => {
      alert('Código Pix copiado! Cole no app do banco em "Pix Copia e Cola".')
    }).catch(() => {
      prompt('Copie o código Pix abaixo:', payloadPix)
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal pix-box" style={{ maxWidth: '400px' }}>
        <h2>Forma de Pagamento</h2>
        <div className="step-sub">Passo 2 de 2</div>
        <div className="resumo-mesas">{resumoMesas}</div>
        <div className="pix-total" style={{ marginBottom: '20px' }}>
          R$ {total.toFixed(2).replace('.', ',')}
        </div>

        {!metodo ? (
          <div className="forma-pag-grid">
            <button className={`forma-pag-btn ${metodo === 'pix' ? 'selected' : ''}`} onClick={() => setMetodo('pix')}>
              <span className="icon">💜</span>
              Pix
            </button>
            <button className={`forma-pag-btn ${metodo === 'dinheiro' ? 'selected' : ''}`} onClick={() => setMetodo('dinheiro')}>
              <span className="icon">💵</span>
              Dinheiro
            </button>
            <button className={`forma-pag-btn ${metodo === 'debito' ? 'selected' : ''}`} onClick={() => setMetodo('debito')}>
              <span className="icon">💳</span>
              Débito
            </button>
            <button className={`forma-pag-btn ${metodo === 'credito' ? 'selected' : ''}`} onClick={() => setMetodo('credito')}>
              <span className="icon">🔶</span>
              Crédito
            </button>
          </div>
        ) : (
          <>
            {metodo === 'pix' && (
              <>
                <div className="qrcode-container">
                  {payloadPix && <QRCodeSVG value={payloadPix} size={190} />}
                </div>
                <div className="pix-key-box">
                  <div className="label">Chave Pix (CNPJ)</div>
                  <div className="value">04.026.811/0025-90</div>
                  <button className="copy-btn" onClick={copiarPixCola}>
                    📋 Copiar código Pix (Copia e Cola)
                  </button>
                </div>
              </>
            )}

            {metodo !== 'pix' && (
              <div style={{ textAlign: 'center', padding: '24px', background: 'var(--gray-50)', borderRadius: '12px', marginBottom: '20px', border: '1.5px dashed var(--gray-200)' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>
                  {metodo === 'dinheiro' ? '💵' : metodo === 'debito' ? '💳' : '🔶'}
                </div>
                <p style={{ color: 'var(--gray-600)', fontSize: '14px', margin: 0, fontWeight: 500 }}>
                  Confirme o recebimento via <strong>{metodo.charAt(0).toUpperCase() + metodo.slice(1)}</strong> antes de prosseguir.
                </p>
              </div>
            )}
          </>
        )}

        <div className="modal-actions">
          <button className="ghost-btn" onClick={() => metodo ? setMetodo(null) : onClose()} disabled={isLoading}>
            {metodo ? 'Trocar Forma' : 'Voltar'}
          </button>
          <button 
            className="primary-btn" 
            onClick={() => metodo && onConfirm(metodo)} 
            disabled={isLoading || !metodo}
          >
            {isLoading ? 'Confirmando...' : 'Confirmar recebimento'}
          </button>
        </div>
      </div>
    </div>
  )
}
