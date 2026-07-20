'use client'
import { QRCodeSVG } from 'qrcode.react'

type Props = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  resumoMesas: string
  total: number
  payloadPix: string
  isLoading: boolean
}

export function ModalPix({ isOpen, onClose, onConfirm, resumoMesas, total, payloadPix, isLoading }: Props) {
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
      <div className="modal pix-box">
        <h2>Pagamento via Pix</h2>
        <div className="step-sub">Passo 2 de 2</div>
        <div className="resumo-mesas">{resumoMesas}</div>
        <div className="pix-total">
          R$ {total.toFixed(2).replace('.', ',')}
        </div>
        <div className="qrcode-container">
          {payloadPix && <QRCodeSVG value={payloadPix} size={190} />}
        </div>
        <div className="pix-key-box">
          <div className="label">Chave Pix (CNPJ)</div>
          <div className="value">04.026.811/0025-90</div>
          <button className="copy-btn" onClick={copiarPixCola}>
            Copiar código Pix (Copia e Cola)
          </button>
        </div>
        <div className="modal-actions">
          <button className="ghost-btn" onClick={onClose} disabled={isLoading}>
            Voltar
          </button>
          <button className="primary-btn" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Confirmando...' : 'Confirmar pagamento recebido'}
          </button>
        </div>
      </div>
    </div>
  )
}
