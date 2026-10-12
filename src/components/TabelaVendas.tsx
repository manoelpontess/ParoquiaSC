'use client'
import { useMemo, useState } from 'react'
import {
  Check,
  CircleAlert,
  Clock,
  Eye,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import {
  confirmarPagamento,
  liberarMesa,
} from '@/app/actions'
import { dataHora, moeda, numMesa } from '@/lib/format'
import { imprimirComprovante, imprimirLista } from '@/lib/impressao'
import {
  FORMAS_PAGAMENTO,
  labelForma,
  type FormaPagamento,
  type Mesa,
  type Responsavel,
} from '@/lib/types'
import {
  Avatar,
  BotaoConfirmar,
  COR_FORMA,
  IconeForma,
  Modal,
  useToast,
} from './ui'

type FiltroStatus = 'todas' | 'pago' | 'reservada'

export function TabelaVendas({
  mesas,
  responsaveis,
  onRecarregar,
  onAbrirMesa,
}: {
  mesas: Mesa[]
  responsaveis: Responsavel[]
  onRecarregar: () => void
  onAbrirMesa: (numero: number) => void
}) {
  const toast = useToast()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<FiltroStatus>('todas')
  const [modalExportarAberto, setModalExportarAberto] = useState(false)
  const [exportarApenasOcupadas, setExportarApenasOcupadas] = useState(true)
  const [exportarComPresenca, setExportarComPresenca] = useState(true)

  // Ação rápida: confirmação de pagamento inline
  const [confirmandoMesa, setConfirmandoMesa] = useState<Mesa | null>(null)
  const [formaRapida, setFormaRapida] = useState<FormaPagamento>('pix')
  const [salvandoRapido, setSalvandoRapido] = useState(false)

  // Mesas ocupadas (vendidas ou reservadas)
  const ocupadas = useMemo(() => {
    return mesas
      .filter(m => m.status !== 'livre' && m.venda)
      .sort((a, b) => a.numero - b.numero)
  }, [mesas])

  const contagem = useMemo(() => ({
    todas: ocupadas.length,
    pago: ocupadas.filter(m => m.status === 'vendida').length,
    reservada: ocupadas.filter(m => m.status === 'reservada').length,
  }), [ocupadas])

  const termo = busca.trim().toLowerCase()
  const filtradas = useMemo(() => {
    return ocupadas.filter(m => {
      if (filtro === 'pago' && m.status !== 'vendida') return false
      if (filtro === 'reservada' && m.status !== 'reservada') return false

      if (!termo) return true
      if (String(m.numero) === termo.replace(/^0+/, '')) return true

      const v = m.venda!
      return (
        v.comprador.nome.toLowerCase().includes(termo) ||
        (v.responsavel ?? '').toLowerCase().includes(termo) ||
        (v.comprador.telefone ?? '').replace(/\D/g, '').includes(termo.replace(/\D/g, '') || '§')
      )
    })
  }, [ocupadas, filtro, termo])

  const totalArrecadadoFiltradas = filtradas
    .filter(m => m.status === 'vendida')
    .reduce((s, m) => s + (m.preco ?? 30), 0)

  const handleConfirmarPagamentoRapido = async () => {
    if (!confirmandoMesa?.venda) return
    setSalvandoRapido(true)
    const res = await confirmarPagamento(confirmandoMesa.venda.id, formaRapida)
    setSalvandoRapido(false)

    if (res.ok) {
      toast(`Pagamento da mesa #${numMesa(confirmandoMesa.numero)} confirmado!`)
      setConfirmandoMesa(null)
      onRecarregar()
    } else {
      toast(res.error, 'error')
    }
  }

  const handleLiberarMesa = async (num: number) => {
    const res = await liberarMesa(num)
    if (res.ok) {
      toast(`Mesa #${numMesa(num)} liberada!`)
      onRecarregar()
    } else {
      toast(res.error, 'error')
    }
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <h2 className="section-title">Controle de Vendas</h2>
          <div className="section-sub">
            {ocupadas.length} mesa{ocupadas.length === 1 ? '' : 's'} ocupada{ocupadas.length === 1 ? '' : 's'} de 50
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setModalExportarAberto(true)}
            id="exportar-lista-btn"
          >
            <Printer size={15} /> Imprimir / PDF
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onRecarregar}
            title="Atualizar lista"
            id="recarregar-vendas-btn"
          >
            <RefreshCw size={15} /> Atualizar
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="chips">
          <button
            className={`chip ${filtro === 'todas' ? 'active' : ''}`}
            onClick={() => setFiltro('todas')}
          >
            Todas <span className="chip-count">{contagem.todas}</span>
          </button>
          <button
            className={`chip ${filtro === 'pago' ? 'active' : ''}`}
            onClick={() => setFiltro('pago')}
          >
            Pagas <span className="chip-count">{contagem.pago}</span>
          </button>
          <button
            className={`chip ${filtro === 'reservada' ? 'active' : ''}`}
            onClick={() => setFiltro('reservada')}
          >
            Reservadas <span className="chip-count">{contagem.reservada}</span>
          </button>
        </div>

        <div className="search">
          <Search size={16} />
          <input
            id="busca-vendas"
            className="input"
            placeholder="Buscar por comprador, mesa ou responsável..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
      </div>

      <div className="card table-card">
        {filtradas.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">
              <Search size={28} />
            </div>
            <h3>Nenhuma venda encontrada</h3>
            <p>
              {ocupadas.length === 0
                ? 'Nenhuma mesa foi vendida ou reservada ainda.'
                : 'Nenhum resultado corresponde aos filtros selecionados.'}
            </p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Mesa</th>
                <th>Comprador</th>
                <th>Responsável</th>
                <th>Status</th>
                <th className="num">Valor</th>
                <th>Data</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(m => {
                const v = m.venda!
                const isVendida = m.status === 'vendida'
                return (
                  <tr key={m.numero}>
                    <td data-label="Mesa">
                      <span className={`mesa-chip sm ${isVendida ? 'green' : 'amber'}`}>
                        #{numMesa(m.numero)}
                      </span>
                    </td>

                    <td data-label="Comprador" className="cell-buyer">
                      <div className="buyer">
                        <Avatar nome={v.comprador.nome} size={32} />
                        <div>
                          <div className="buyer-name">{v.comprador.nome}</div>
                          {v.comprador.telefone && (
                            <div className="buyer-phone">{v.comprador.telefone}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td data-label="Responsável">
                      {v.responsavel ? (
                        <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{v.responsavel}</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>

                    <td data-label="Status">
                      {isVendida ? (
                        <span className="badge badge-pago">
                          <Check size={11} strokeWidth={3} /> Pago (Pix)
                        </span>
                      ) : (
                        <span className="badge badge-reservada">
                          <Clock size={11} strokeWidth={3} /> Reservada
                        </span>
                      )}
                    </td>

                    <td data-label="Valor" className="num strong">
                      {moeda(m.preco ?? 30)}
                    </td>

                    <td data-label="Data" className="muted" style={{ fontSize: 12 }}>
                      {dataHora(m.reservado_em || v.created_at)}
                    </td>

                    <td className="cell-actions" style={{ textAlign: 'right' }}>
                      <div className="row-actions">
                        {!isVendida && (
                          <button
                            className="btn btn-success btn-sm"
                            style={{ padding: '0 10px', fontSize: 12 }}
                            onClick={() => {
                              setConfirmandoMesa(m)
                              setFormaRapida('pix')
                            }}
                            title="Confirmar pagamento desta mesa"
                          >
                            <Check size={13} /> Confirmar
                          </button>
                        )}
                        <button
                          className="icon-btn"
                          onClick={() => onAbrirMesa(m.numero)}
                          title="Ver detalhes da mesa"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() =>
                            imprimirComprovante({
                              mesas: [m.numero],
                              nome: v.comprador.nome,
                              telefone: v.comprador.telefone,
                              responsavel: v.responsavel,
                              forma: 'pix',
                              pago: isVendida,
                              total: m.preco ?? 30,
                              data: v.created_at,
                            })
                          }
                          title="Imprimir comprovante"
                        >
                          <Printer size={16} />
                        </button>
                        <BotaoConfirmar
                          className="icon-btn danger"
                          confirmar={<Check size={14} />}
                          onConfirmar={() => handleLiberarMesa(m.numero)}
                        >
                          <Trash2 size={16} />
                        </BotaoConfirmar>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de confirmação rápida de pagamento */}
      {confirmandoMesa && (
        <Modal
          aberto
          onFechar={() => setConfirmandoMesa(null)}
          titulo={`Confirmar Pagamento Pix · Mesa #${numMesa(confirmandoMesa.numero)}`}
          subtitulo={`Comprador: ${confirmandoMesa.venda?.comprador.nome}`}
          rodape={
            <>
              <button className="btn btn-secondary" onClick={() => setConfirmandoMesa(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-success"
                onClick={handleConfirmarPagamentoRapido}
                disabled={salvandoRapido}
              >
                {salvandoRapido ? 'Salvando...' : 'Confirmar recebimento Pix'}
              </button>
            </>
          }
        >
          <div style={{ padding: '8px 0 16px' }}>
            <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>
              Confirmar o recebimento do <b>Pix</b> no valor de{' '}
              <b>{moeda(confirmandoMesa.preco ?? 30)}</b> para a mesa{' '}
              <b>#{numMesa(confirmandoMesa.numero)}</b>?
            </p>
          </div>
        </Modal>
      )}

      {/* Modal de Impressão / Exportação da lista de controle */}
      {modalExportarAberto && (
        <Modal
          aberto
          onFechar={() => setModalExportarAberto(false)}
          titulo="Imprimir Lista de Mesas"
          subtitulo="Gere uma folha para conferência e recepção no evento"
          rodape={
            <>
              <button className="btn btn-secondary" onClick={() => setModalExportarAberto(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  imprimirLista(mesas, {
                    apenasOcupadas: exportarApenasOcupadas,
                    presenca: exportarComPresenca,
                  })
                  setModalExportarAberto(false)
                }}
              >
                <Printer size={16} /> Abrir para Impressão / PDF
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label className="label">Mesas incluídas</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={`btn ${exportarApenasOcupadas ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  style={{ flex: 1 }}
                  onClick={() => setExportarApenasOcupadas(true)}
                >
                  Apenas Ocupadas ({contagem.todas})
                </button>
                <button
                  type="button"
                  className={`btn ${!exportarApenasOcupadas ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  style={{ flex: 1 }}
                  onClick={() => setExportarApenasOcupadas(false)}
                >
                  Todas as 50 Mesas
                </button>
              </div>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                padding: '12px 14px',
                borderRadius: 'var(--r)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={exportarComPresenca}
                onChange={e => setExportarComPresenca(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
              />
              Incluir caixas de marcação (Check-in / Presença)
            </label>
          </div>
        </Modal>
      )}
    </section>
  )
}
