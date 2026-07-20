'use client'
import { useState } from 'react'

type Props = {
  isOpen: boolean
  onClose: () => void
  mesas: number[]
  comprador: string
  total: number
}

export function ModalSucesso({ isOpen, onClose, mesas, comprador, total }: Props) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal sucesso-box">
        <div className="sucesso-icone">✅</div>
        <h2>Venda Registrada!</h2>
        <p className="sucesso-sub">Pagamento confirmado com sucesso.</p>
        <div className="sucesso-detalhes">
          <div className="sucesso-linha">
            <span className="label">Comprador</span>
            <span className="value">{comprador}</span>
          </div>
          <div className="sucesso-linha">
            <span className="label">Mesa(s)</span>
            <span className="value">{mesas.sort((a,b)=>a-b).join(', ')}</span>
          </div>
          <div className="sucesso-linha">
            <span className="label">Total</span>
            <span className="value verde">R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
        <button className="primary-btn sucesso-btn" onClick={onClose}>
          Nova Venda
        </button>
      </div>
    </div>
  )
}
