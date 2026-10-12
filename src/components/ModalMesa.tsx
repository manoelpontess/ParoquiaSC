'use client'
import { useState } from 'react'
import {
  Banknote,
  Check,
  CircleAlert,
  Clock,
  CreditCard,
  Hourglass,
  LoaderCircle,
  Pencil,
  Printer,
  QrCode,
  Save,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import {
  confirmarPagamento,
  editarVenda,
  liberarMesa,
} from '@/app/actions'
import { dataHora, mascaraTelefone, moeda, numMesa } from '@/lib/format'
import { imprimirComprovante } from '@/lib/impressao'
import {
  FORMAS_PAGAMENTO,
  labelForma,
  type FormaPagamento,
  type Mesa,
  type Responsavel,
} from '@/lib/types'
import {
  BotaoConfirmar,
  COR_FORMA,
  IconeForma,
  Modal,
  useToast,
} from './ui'

export function ModalMesa({
  mesa,
  responsaveis,
  onFechar,
  onAtualizado,
}: {
  mesa: Mesa
  responsaveis: Responsavel[]
  onFechar: () => void
  onAtualizado: () => void
}) {
  const toast = useToast()
  const v = mesa.venda

  const [editando, setEditando] = useState(false)
  const [nomeEdit, setNomeEdit] = useState(v?.comprador.nome ?? '')
  const [telEdit, setTelEdit] = useState(v?.comprador.telefone ?? '')
  const [respEdit, setRespEdit] = useState(v?.responsavel ?? '')
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  // Confirmação de pagamento para reserva
  const [confirmandoPagamento, setConfirmandoPagamento] = useState(false)
  const [formaSelecionada, setFormaSelecionada] = useState<FormaPagamento>('pix')
  const [processandoPagamento, setProcessandoPagamento] = useState(false)

  // Liberação de mesa
  const [liberando, setLiberando] = useState(false)
  const [erro, setErro] = useState('')

  if (!v) return null

  const isReservada = mesa.status === 'reservada'

  const handleSalvarEdicao = async () => {
    if (!nomeEdit.trim()) {
      setErro('O nome do comprador não pode ser vazio.')
      return
    }
    setErro('')
    setSalvandoEdicao(true)
    const res = await editarVenda(v.id, {
      nome: nomeEdit.trim(),
      telefone: telEdit,
      responsavel: respEdit,
    })
    setSalvandoEdicao(false)

    if (res.ok) {
      toast('Dados do comprador atualizados!')
      setEditando(false)
      onAtualizado()
    } else {
      setErro(res.error)
    }
  }

  const handleConfirmarPagamento = async () => {
    setProcessandoPagamento(true)
    setErro('')
    const res = await confirmarPagamento(v.id, formaSelecionada)
    setProcessandoPagamento(false)

    if (res.ok) {
      toast(`Pagamento da mesa #${numMesa(mesa.numero)} confirmado!`)
      setConfirmandoPagamento(false)
      onAtualizado()
      onFechar()
    } else {
      setErro(res.error)
    }
  }

  const handleLiberarMesa = async () => {
    setLiberando(true)
    setErro('')
    const res = await liberarMesa(mesa.numero)
    setLiberando(false)

    if (res.ok) {
      toast(`Mesa #${numMesa(mesa.numero)} liberada com sucesso!`)
      onAtualizado()
      onFechar()
    } else {
      setErro(res.error)
    }
  }

  const handleImprimir = () => {
    imprimirComprovante({
      mesas: [mesa.numero],
      nome: v.comprador.nome,
      telefone: v.comprador.telefone,
      responsavel: v.responsavel,
      forma: v.forma_pagamento,
      pago: mesa.status === 'vendida',
      total: mesa.preco ?? 15,
      data: v.created_at,
    })
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo={`Mesa #${numMesa(mesa.numero)}`}
      subtitulo={
        mesa.status === 'vendida' ? (
          <span className="badge badge-pago">
            <Check size={12} /> Paga · {labelForma(v.forma_pagamento)}
          </span>
        ) : (
          <span className="badge badge-reservada">
            <Clock size={12} /> Reservada · Aguardando pagamento
          </span>
        )
      }
      rodape={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 10 }}>
          <BotaoConfirmar
            id="liberar-mesa-btn"
            className="btn btn-danger btn-sm"
            disabled={liberando}
            confirmar="Confirmar liberação?"
            onConfirmar={handleLiberarMesa}
          >
            <Trash2 size={15} /> Liberar mesa
          </BotaoConfirmar>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleImprimir} id="imprimir-mesa-btn">
              <Printer size={15} /> Comprovante
            </button>
            <button className="btn btn-primary btn-sm" onClick={onFechar}>
              Fechar
            </button>
          </div>
        </div>
      }
    >
      {/* Box de confirmação de pagamento para reservas */}
      {isReservada && !confirmandoPagamento && (
        <div
          style={{
            background: 'var(--green-soft)',
            border: '1.5px solid var(--green-line)',
            borderRadius: 'var(--r)',
            padding: '14px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: 'var(--green-strong)', fontSize: 13.5 }}>
              Confirmar recebimento
            </div>
            <div style={{ fontSize: 12, color: 'var(--green)' }}>
              Esta mesa ainda não foi paga ({moeda(mesa.preco ?? 15)})
            </div>
          </div>
          <button
            className="btn btn-success btn-sm"
            onClick={() => setConfirmandoPagamento(true)}
            id="iniciar-confirmacao-pagamento"
          >
            <Check size={16} /> Confirmar Pago
          </button>
        </div>
      )}

      {/* Seletor de forma de pagamento expandido */}
      {confirmandoPagamento && (
        <div
          style={{
            background: 'var(--surface-2)',
            border: '1.5px solid var(--border-strong)',
            borderRadius: 'var(--r)',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
            Selecione a forma de pagamento:
          </div>
          <div className="pay-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 12 }}>
            {FORMAS_PAGAMENTO.map(f => (
              <button
                key={f.id}
                type="button"
                className={`pay-opt ${formaSelecionada === f.id ? 'active' : ''}`}
                style={{ ['--c' as string]: COR_FORMA[f.id] }}
                onClick={() => setFormaSelecionada(f.id)}
              >
                <IconeForma forma={f.id} size={20} />
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setConfirmandoPagamento(false)}
              disabled={processandoPagamento}
            >
              Cancelar
            </button>
            <button
              className="btn btn-success btn-sm"
              onClick={handleConfirmarPagamento}
              disabled={processandoPagamento}
              id="salvar-confirmacao-pagamento"
            >
              {processandoPagamento && <LoaderCircle size={15} className="spin" />}
              Salvar como Pago
            </button>
          </div>
        </div>
      )}

      {/* Dados do comprador */}
      {!editando ? (
        <div className="details">
          <div className="details-row">
            <span>Comprador</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{v.comprador.nome}</span>
              <button
                className="icon-btn"
                style={{ width: 28, height: 28 }}
                onClick={() => setEditando(true)}
                title="Editar comprador"
                aria-label="Editar comprador"
              >
                <Pencil size={14} />
              </button>
            </div>
          </div>
          <div className="details-row">
            <span>Telefone</span>
            <span>{v.comprador.telefone || <span className="muted">Não informado</span>}</span>
          </div>
          <div className="details-row">
            <span>Responsável</span>
            <span>{v.responsavel || <span className="muted">Nenhum</span>}</span>
          </div>
          <div className="details-row">
            <span>Valor da mesa</span>
            <span>{moeda(mesa.preco ?? 15)}</span>
          </div>
          <div className="details-row">
            <span>Registrado em</span>
            <span>{dataHora(mesa.reservado_em || v.created_at)}</span>
          </div>
          {v.pago_em && (
            <div className="details-row">
              <span>Pago em</span>
              <span>{dataHora(v.pago_em)}</span>
            </div>
          )}
        </div>
      ) : (
        /* Formulário de edição dos dados */
        <div
          style={{
            background: 'var(--surface-2)',
            padding: 16,
            borderRadius: 'var(--r)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Editar Comprador</div>
          <div className="field">
            <label className="label" htmlFor="edit-nome">Nome</label>
            <input
              id="edit-nome"
              className="input"
              value={nomeEdit}
              onChange={e => setNomeEdit(e.target.value)}
              autoFocus
            />
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label className="label" htmlFor="edit-tel">Telefone</label>
            <input
              id="edit-tel"
              className="input"
              value={telEdit}
              onChange={e => setTelEdit(mascaraTelefone(e.target.value))}
            />
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label className="label" htmlFor="edit-resp">Responsável</label>
            <select
              id="edit-resp"
              className="select"
              value={respEdit}
              onChange={e => setRespEdit(e.target.value)}
            >
              <option value="">Nenhum</option>
              {responsaveis.map(r => (
                <option key={r.id} value={r.nome}>{r.nome}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setEditando(false)
                setNomeEdit(v.comprador.nome)
                setTelEdit(v.comprador.telefone ?? '')
                setRespEdit(v.responsavel ?? '')
              }}
              disabled={salvandoEdicao}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSalvarEdicao}
              disabled={salvandoEdicao}
              id="salvar-edicao-comprador"
            >
              {salvandoEdicao && <LoaderCircle size={15} className="spin" />}
              <Save size={15} /> Salvar alterações
            </button>
          </div>
        </div>
      )}

      {erro && (
        <div className="form-error" style={{ marginTop: 12 }}>
          <CircleAlert size={16} /> {erro}
        </div>
      )}
    </Modal>
  )
}
