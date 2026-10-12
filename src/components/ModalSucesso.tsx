'use client'
import { Check, Printer, Sparkles } from 'lucide-react'
import { listaMesas, moeda } from '@/lib/format'
import { labelForma } from '@/lib/types'
import { imprimirComprovante } from '@/lib/impressao'
import type { VendaConcluida } from './ModalVenda'
import { Modal } from './ui'

export function ModalSucesso({
  venda,
  onFechar,
}: {
  venda: VendaConcluida
  onFechar: () => void
}) {
  const statusTexto = venda.pago ? 'Venda confirmada!' : 'Reserva realizada!'
  const statusSub = venda.pago
    ? 'O pagamento foi registrado com sucesso.'
    : 'A mesa está reservada. O pagamento pode ser confirmado depois.'

  return (
    <Modal
      aberto
      onFechar={onFechar}
      semCabecalho
      rodape={
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            className="btn btn-secondary"
            onClick={() => imprimirComprovante(venda)}
            id="imprimir-comprovante-sucesso"
          >
            <Printer size={16} /> Imprimir comprovante
          </button>
          <button className="btn btn-primary" onClick={onFechar} id="fechar-sucesso" autoFocus>
            Concluir
          </button>
        </div>
      }
    >
      <div className="success">
        <div className={`success-icon ${venda.pago ? '' : 'amber'}`}>
          {venda.pago ? <Check size={44} strokeWidth={3} /> : <Sparkles size={40} strokeWidth={2.4} />}
        </div>
        <h2>{statusTexto}</h2>
        <p>{statusSub}</p>

        <div className="details">
          <div className="details-row">
            <span>Comprador</span>
            <span>{venda.nome}</span>
          </div>
          {venda.telefone && (
            <div className="details-row">
              <span>Telefone</span>
              <span>{venda.telefone}</span>
            </div>
          )}
          <div className="details-row">
            <span>Mesa(s)</span>
            <div className="mesa-chips" style={{ justifyContent: 'flex-end' }}>
              {venda.mesas.map(m => (
                <span key={m} className={`mesa-chip sm ${venda.pago ? 'green' : 'amber'}`}>
                  #{m.toString().padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>
          {venda.responsavel && (
            <div className="details-row">
              <span>Responsável</span>
              <span>{venda.responsavel}</span>
            </div>
          )}
          {venda.pago && (
            <div className="details-row">
              <span>Forma de pagamento</span>
              <span>{labelForma(venda.forma)}</span>
            </div>
          )}
          <div className="details-row total">
            <span>Total</span>
            <span>{moeda(venda.total)}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
