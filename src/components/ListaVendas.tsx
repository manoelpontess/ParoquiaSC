'use client'
import { useEffect, useState } from 'react'
import { getListaVendas, liberarMesa, getListaCompletaParaExportacao, atualizarTelefoneComprador, confirmarPagamentoReserva } from '@/app/actions'
import { ModalExportarPDF } from '@/components/ModalExportarPDF'

export type MesaVendida = {
  numero: number
  status: string
  reservado_em: string | null
  vendas: {
    id: string
    total: number
    status: string
    area_missionaria: string | null
    compradores: {
      nome: string
      telefone: string | null
    }
  } | null
}

function formatarData(iso: string | null) {
  if (!iso) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

const formatarMoeda = (valor: number) => `R$ ${valor.toFixed(2).replace('.', ',')}`

function gerarSetor(mesa: number): string {
  if (mesa >= 141) return 'Bloco A (esq. superior)'
  if (mesa >= 81)  return 'Bloco B (esq. inferior)'
  if (mesa >= 41)  return 'Bloco C (dir. superior)'
  return 'Bloco D (dir. inferior)'
}

export function ListaVendas() {
  const [vendas, setVendas] = useState<MesaVendida[]>([])
  const [loading, setLoading] = useState(true)
  const [ultimaAtualiz, setUltimaAtualiz] = useState<Date | null>(null)
  const [processandoCancelamento, setProcessandoCancelamento] = useState<number | null>(null)
  const [modalExportarOpen, setModalExportarOpen] = useState(false)

  // Edição de telefone
  const [editandoTelefone, setEditandoTelefone] = useState<number | null>(null)
  const [novoTelefone, setNovoTelefone] = useState('')
  const [salvandoTelefone, setSalvandoTelefone] = useState(false)

  // Confirmar pagamento de reserva
  const [confirmandoPagamento, setConfirmandoPagamento] = useState<number | null>(null)
  const [formaPagamentoReserva, setFormaPagamentoReserva] = useState<string>('')
  const [processandoPagamento, setProcessandoPagamento] = useState(false)

  const carregarVendas = async () => {
    setLoading(true)
    const dados = await getListaVendas()
    setVendas(dados as any)
    setUltimaAtualiz(new Date())
    setLoading(false)
  }

  useEffect(() => {
    carregarVendas()
    const handleFocus = () => carregarVendas()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCancelarMesa = async (numero: number) => {
    if (!window.confirm(`⚠️ ATENÇÃO: Tem certeza que deseja cancelar e liberar a mesa #${numero}? Ela voltará a ficar disponível para compra.`)) {
      return
    }
    setProcessandoCancelamento(numero)
    const res = await liberarMesa(numero)
    if (res.success) {
      setVendas(prev => prev.filter(m => m.numero !== numero))
    } else {
      alert(`Erro ao cancelar mesa: ${res.error}`)
    }
    setProcessandoCancelamento(null)
  }

  const handleIniciarEdicaoTelefone = (mesa: MesaVendida) => {
    setEditandoTelefone(mesa.numero)
    setNovoTelefone(mesa.vendas?.compradores?.telefone || '')
    setConfirmandoPagamento(null)
  }

  const handleSalvarTelefone = async (mesa: MesaVendida) => {
    if (!mesa.vendas?.id) return
    setSalvandoTelefone(true)
    const res = await atualizarTelefoneComprador(mesa.vendas.id, novoTelefone)
    if (res.success) {
      setVendas(prev => prev.map(m =>
        m.numero === mesa.numero
          ? { ...m, vendas: m.vendas ? { ...m.vendas, compradores: { ...m.vendas.compradores, telefone: novoTelefone } } : m.vendas }
          : m
      ))
      setEditandoTelefone(null)
    } else {
      alert(`Erro ao salvar telefone: ${res.error}`)
    }
    setSalvandoTelefone(false)
  }

  const handleConfirmarPagamentoReserva = async (mesa: MesaVendida) => {
    if (!mesa.vendas?.id || !formaPagamentoReserva) return
    setProcessandoPagamento(true)
    const res = await confirmarPagamentoReserva(mesa.vendas.id, mesa.numero, formaPagamentoReserva)
    if (res.success) {
      setVendas(prev => prev.map(m =>
        m.numero === mesa.numero ? { ...m, status: 'vendida' } : m
      ))
      setConfirmandoPagamento(null)
      setFormaPagamentoReserva('')
    } else {
      alert(`Erro ao confirmar pagamento: ${res.error}`)
    }
    setProcessandoPagamento(false)
  }

  const mesasVendidas = vendas.filter(v => v.status === 'vendida').length
  const mesasReservadas = vendas.filter(v => v.status === 'reservada').length

  const contagemMesasPorVenda: Record<string, number> = {}
  vendas.forEach((mesa) => {
    if (mesa.vendas && mesa.vendas.id) {
      contagemMesasPorVenda[mesa.vendas.id] = (contagemMesasPorVenda[mesa.vendas.id] || 0) + 1
    }
  })

  return (
    <div className="lista-vendas-container">
      <div className="vendas-header">
        <div>
          <h2>Mesas Ocupadas ({vendas.length})</h2>
          <div className="vendas-subheader">
            {mesasVendidas > 0 && <span className="status-badge vendida">{mesasVendidas} vendida(s)</span>}
            {mesasReservadas > 0 && <span className="status-badge reservada" style={{marginLeft:'6px'}}>{mesasReservadas} reservada(s)</span>}
            {ultimaAtualiz && (
              <span className="ultima-atualizacao">
                Atualizado às {ultimaAtualiz.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="ghost-btn refresh-btn" onClick={() => setModalExportarOpen(true)} title="Exportar relatório de mesas separado por blocos em PDF">
            📄 Exportar PDF por Blocos
          </button>
          <button className="ghost-btn refresh-btn" onClick={carregarVendas} disabled={loading}>
            {loading ? '⏳' : '🔄'} Atualizar
          </button>
        </div>
      </div>

      {loading && <div className="loading-state">Carregando lista de vendas...</div>}

      {!loading && vendas.length === 0 && (
        <div className="empty-state">
          <div style={{fontSize:'48px', marginBottom:'12px'}}>🎉</div>
          Nenhuma mesa foi vendida ou reservada ainda.
        </div>
      )}

      {!loading && vendas.length > 0 && (
        <div className="table-wrapper">
          <table className="vendas-table">
            <thead>
              <tr>
                <th>Mesa</th>
                <th>Status</th>
                <th>Comprador</th>
                <th>Telefone</th>
                <th>Área Missionária</th>
                <th>Valor</th>
                <th>Reservado em</th>
                <th style={{textAlign: 'right'}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map((mesa) => {
                const comprador = mesa.vendas?.compradores

                const valorTotalVenda = mesa.vendas?.total || 0
                const quantidadeMesas = (mesa.vendas && contagemMesasPorVenda[mesa.vendas.id]) || 1
                const valorMesa = valorTotalVenda > 0 ? (valorTotalVenda / quantidadeMesas) : 40

                let linkWhats = ''
                if (comprador?.telefone) {
                  const apenasNumeros = comprador.telefone.replace(/\D/g, '')
                  if (apenasNumeros) {
                    const numFinal = apenasNumeros.length <= 11 ? `55${apenasNumeros}` : apenasNumeros
                    const msg = `Olá ${comprador.nome}, sua compra da mesa ${mesa.numero} no Bingão da Paróquia Santa Cruz foi registrada com sucesso!`
                    linkWhats = `https://wa.me/${numFinal}?text=${encodeURIComponent(msg)}`
                  }
                }

                const isCanceling = processandoCancelamento === mesa.numero
                const isEditingPhone = editandoTelefone === mesa.numero
                const isConfirmingPayment = confirmandoPagamento === mesa.numero

                return (
                  <>
                    <tr key={mesa.numero}>
                      <td className="col-mesa"><strong>#{mesa.numero}</strong></td>
                      <td>
                        <span className={`status-badge ${mesa.status}`}>
                          {mesa.status === 'vendida' ? '✅ PAGO' : '⏳ RESERVADA'}
                        </span>
                      </td>
                      <td>{comprador?.nome || 'N/A'}</td>

                      {/* Coluna de telefone com edição inline */}
                      <td>
                        {isEditingPhone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="tel"
                              value={novoTelefone}
                              onChange={e => setNovoTelefone(e.target.value)}
                              placeholder="(92) 9 9999-9999"
                              autoFocus
                              style={{
                                padding: '4px 8px', border: '1.5px solid #22c55e',
                                borderRadius: '6px', fontSize: '13px', width: '140px', outline: 'none'
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSalvarTelefone(mesa)
                                if (e.key === 'Escape') setEditandoTelefone(null)
                              }}
                            />
                            <button
                              onClick={() => handleSalvarTelefone(mesa)}
                              disabled={salvandoTelefone}
                              title="Salvar"
                              style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                            >
                              {salvandoTelefone ? '...' : '✓'}
                            </button>
                            <button
                              onClick={() => setEditandoTelefone(null)}
                              title="Cancelar"
                              style={{ background: 'white', color: '#6B7280', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '13px' }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: comprador?.telefone ? 'inherit' : '#9CA3AF' }}>
                              {comprador?.telefone || 'sem telefone'}
                            </span>
                            {linkWhats && (
                              <a href={linkWhats} target="_blank" rel="noopener noreferrer" className="whatsapp-btn" title="Enviar WhatsApp">
                                WhatsApp 💬
                              </a>
                            )}
                            {mesa.vendas?.id && (
                              <button
                                onClick={() => handleIniciarEdicaoTelefone(mesa)}
                                title="Editar telefone"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', color: '#6B7280', lineHeight: 1 }}
                              >
                                ✏️
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      <td style={{ fontSize: '12px', color: 'var(--gray-600)' }}>{(mesa.vendas as any)?.area_missionaria || '—'}</td>
                      <td style={{ fontWeight: 'bold', color: '#111827' }}>{formatarMoeda(valorMesa)}</td>
                      <td className="col-data">{formatarData(mesa.reservado_em)}</td>
                      <td style={{textAlign: 'right'}}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {/* Botão confirmar pagamento — só aparece para RESERVADAS */}
                          {mesa.status === 'reservada' && mesa.vendas?.id && (
                            <button
                              onClick={() => {
                                setConfirmandoPagamento(isConfirmingPayment ? null : mesa.numero)
                                setFormaPagamentoReserva('')
                                setEditandoTelefone(null)
                              }}
                              className="primary-btn"
                              style={{ fontSize: '12px', padding: '5px 10px' }}
                              title="Confirmar pagamento desta reserva"
                            >
                              ✅ Confirmar Pago
                            </button>
                          )}
                          <button
                            onClick={() => handleCancelarMesa(mesa.numero)}
                            disabled={isCanceling}
                            className="cancel-btn"
                            title="Cancelar e liberar esta mesa"
                          >
                            {isCanceling ? '...' : '❌ Cancelar'}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Linha expandida: seletor de forma de pagamento para RESERVADA */}
                    {isConfirmingPayment && mesa.status === 'reservada' && (
                      <tr key={`pag-${mesa.numero}`} style={{ background: '#f0fdf4' }}>
                        <td colSpan={8} style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#15803d' }}>
                              💰 Confirmar pagamento da Mesa #{mesa.numero} — Como foi pago?
                            </span>
                            {(['pix', 'dinheiro', 'debito', 'credito'] as const).map(forma => (
                              <button
                                key={forma}
                                onClick={() => setFormaPagamentoReserva(forma)}
                                style={{
                                  padding: '6px 14px', borderRadius: '20px', cursor: 'pointer',
                                  fontSize: '13px', fontWeight: 600, border: '1.5px solid',
                                  background: formaPagamentoReserva === forma ? '#15803d' : 'white',
                                  color: formaPagamentoReserva === forma ? 'white' : '#374151',
                                  borderColor: formaPagamentoReserva === forma ? '#15803d' : '#D1D5DB',
                                }}
                              >
                                {forma === 'pix' ? '💜 Pix' : forma === 'dinheiro' ? '💵 Dinheiro' : forma === 'debito' ? '💳 Débito' : '🔶 Crédito'}
                              </button>
                            ))}
                            <button
                              onClick={() => handleConfirmarPagamentoReserva(mesa)}
                              disabled={!formaPagamentoReserva || processandoPagamento}
                              style={{
                                padding: '6px 16px', borderRadius: '8px', cursor: formaPagamentoReserva ? 'pointer' : 'not-allowed',
                                fontSize: '13px', fontWeight: 700, border: 'none',
                                background: formaPagamentoReserva ? '#15803d' : '#E5E7EB',
                                color: formaPagamentoReserva ? 'white' : '#9CA3AF',
                              }}
                            >
                              {processandoPagamento ? 'Salvando...' : '✅ Confirmar'}
                            </button>
                            <button
                              onClick={() => { setConfirmandoPagamento(null); setFormaPagamentoReserva('') }}
                              style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', background: 'white', color: '#6B7280', border: '1px solid #D1D5DB' }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ModalExportarPDF
        isOpen={modalExportarOpen}
        onClose={() => setModalExportarOpen(false)}
      />
    </div>
  )
}
