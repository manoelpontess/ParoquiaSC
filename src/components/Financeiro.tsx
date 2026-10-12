'use client'
import { useMemo } from 'react'
import {
  Banknote,
  Check,
  Clock,
  Coins,
  CreditCard,
  QrCode,
  TrendingUp,
  User,
  Wallet,
} from 'lucide-react'
import { dataHora, moeda, numMesa } from '@/lib/format'
import {
  FORMAS_PAGAMENTO,
  TOTAL_MESAS,
  labelForma,
  type FormaPagamento,
  type Mesa,
} from '@/lib/types'
import { COR_FORMA, IconeForma } from './ui'

export function Financeiro({ mesas }: { mesas: Mesa[] }) {
  // Cálculos financeiros
  const vendidas = useMemo(() => mesas.filter(m => m.status === 'vendida'), [mesas])
  const reservadas = useMemo(() => mesas.filter(m => m.status === 'reservada'), [mesas])

  const totalArrecadado = useMemo(() => {
    return vendidas.reduce((s, m) => s + (m.preco ?? 30), 0)
  }, [vendidas])

  const totalPendente = useMemo(() => {
    return reservadas.reduce((s, m) => s + (m.preco ?? 30), 0)
  }, [reservadas])

  // Ranking de responsáveis
  const rankingResponsaveis = useMemo(() => {
    const mapa = new Map<string, { total: number; qtd: number }>()

    for (const m of vendidas) {
      const resp = m.venda?.responsavel?.trim() || 'Direto / Secretaria'
      const atual = mapa.get(resp) || { total: 0, qtd: 0 }
      mapa.set(resp, {
        total: atual.total + (m.preco ?? 30),
        qtd: atual.qtd + 1,
      })
    }

    return Array.from(mapa.entries())
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.total - a.total)
  }, [vendidas])

  const maxRanking = rankingResponsaveis[0]?.total || 1

  // Últimas vendas confirmadas
  const ultimasVendas = useMemo(() => {
    return [...vendidas]
      .sort((a, b) => {
        const da = new Date(a.venda?.pago_em || a.reservado_em || 0).getTime()
        const db = new Date(b.venda?.pago_em || b.reservado_em || 0).getTime()
        return db - da
      })
      .slice(0, 10)
  }, [vendidas])

  return (
    <section>
      <div className="section-head">
        <div>
          <h2 className="section-title">Extrato Financeiro</h2>
          <div className="section-sub">Resumo de arrecadação do Passeio Paroquial</div>
        </div>
      </div>

      <div className="fin-top">
        <div className="fin-total">
          <div className="fin-total-label">
            <TrendingUp size={18} /> Total Arrecadado (Confirmado)
          </div>
          <div className="fin-total-value">{moeda(totalArrecadado)}</div>
          <div className="fin-total-meta">
            <span>
              Mesas pagas: <b>{vendidas.length}</b> de {TOTAL_MESAS}
            </span>
            <span>
              Taxa de ocupação: <b>{Math.round((vendidas.length / TOTAL_MESAS) * 100)}%</b>
            </span>
          </div>
        </div>

        <div className="card fin-pend">
          <div>
            <div className="fin-card-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} color="var(--amber)" /> A Receber (Reservadas)
            </div>
            <div className="fin-pend-value">{moeda(totalPendente)}</div>
            <div className="fin-card-meta">
              {reservadas.length} mesa{reservadas.length === 1 ? '' : 's'} aguardando confirmação
            </div>
          </div>
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--ink-3)',
                marginBottom: 6,
              }}
            >
              <span>Progresso geral</span>
              <span>{vendidas.length + reservadas.length} de {TOTAL_MESAS} mesas</span>
            </div>
            <div className="progress">
              <span
                style={{
                  width: `${(vendidas.length / TOTAL_MESAS) * 100}%`,
                  background: 'var(--green)',
                }}
              />
              <span
                style={{
                  width: `${(reservadas.length / TOTAL_MESAS) * 100}%`,
                  background: 'var(--amber)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="fin-grid">
        <div className="card fin-card">
          <div className="fin-card-head">
            <div className="fin-icon" style={{ ['--c' as string]: 'var(--c-pix)' }}>
              <QrCode size={20} />
            </div>
            <div>
              <div className="fin-card-label">Pix Confirmado</div>
              <div className="fin-card-meta" style={{ margin: 0 }}>
                {vendidas.length} mesa{vendidas.length === 1 ? '' : 's'} pagas
              </div>
            </div>
          </div>
          <div className="fin-card-value">{moeda(totalArrecadado)}</div>
        </div>

        <div className="card fin-card">
          <div className="fin-card-head">
            <div className="fin-icon" style={{ ['--c' as string]: 'var(--amber)' }}>
              <Clock size={20} />
            </div>
            <div>
              <div className="fin-card-label">Pix a Receber</div>
              <div className="fin-card-meta" style={{ margin: 0 }}>
                {reservadas.length} mesa{reservadas.length === 1 ? '' : 's'} reservadas
              </div>
            </div>
          </div>
          <div className="fin-card-value">{moeda(totalPendente)}</div>
        </div>

        <div className="card fin-card">
          <div className="fin-card-head">
            <div className="fin-icon" style={{ ['--c' as string]: 'var(--primary)' }}>
              <Coins size={20} />
            </div>
            <div>
              <div className="fin-card-label">Mesas Disponíveis</div>
              <div className="fin-card-meta" style={{ margin: 0 }}>
                para novas vendas
              </div>
            </div>
          </div>
          <div className="fin-card-value">
            {TOTAL_MESAS - vendidas.length - reservadas.length} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-3)' }}>livres</span>
          </div>
        </div>

        <div className="card fin-card">
          <div className="fin-card-head">
            <div className="fin-icon" style={{ ['--c' as string]: 'var(--green)' }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="fin-card-label">Meta Total (50 mesas)</div>
              <div className="fin-card-meta" style={{ margin: 0 }}>
                {moeda(30)} / mesa
              </div>
            </div>
          </div>
          <div className="fin-card-value">{moeda(TOTAL_MESAS * 30)}</div>
        </div>
      </div>

      <div className="fin-cols">
        {/* Ranking por Responsável */}
        <div className="card fin-block">
          <div className="fin-block-title">
            <User size={18} /> Vendas por Responsável
          </div>
          {rankingResponsaveis.length === 0 ? (
            <div className="empty" style={{ padding: '24px 0' }}>
              <p>Nenhuma venda com responsável ainda.</p>
            </div>
          ) : (
            <div className="rank">
              {rankingResponsaveis.map(r => (
                <div key={r.nome} className="rank-row">
                  <div className="rank-name">
                    <span>{r.nome}</span>
                    <span className="badge badge-neutral" style={{ fontSize: 11, padding: '1px 6px' }}>
                      {r.qtd} mesa{r.qtd === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="rank-value">{moeda(r.total)}</div>
                  <div className="progress">
                    <span style={{ width: `${(r.total / maxRanking) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimas vendas confirmadas */}
        <div className="card fin-block">
          <div className="fin-block-title">
            <Check size={18} /> Últimas Confirmações
          </div>
          {ultimasVendas.length === 0 ? (
            <div className="empty" style={{ padding: '24px 0' }}>
              <p>Nenhuma confirmação recente.</p>
            </div>
          ) : (
            <div className="feed">
              {ultimasVendas.map(m => {
                const v = m.venda!
                return (
                  <div key={m.numero} className="feed-row">
                    <span className="mesa-chip sm green">#{numMesa(m.numero)}</span>
                    <div className="feed-main">
                      <div className="feed-title">{v.comprador.nome}</div>
                      <div className="feed-meta">
                        {dataHora(v.pago_em || m.reservado_em)} · {v.responsavel || 'Sem responsável'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="feed-value">{moeda(m.preco ?? 30)}</div>
                      <span className="badge badge-neutral" style={{ fontSize: 10, padding: '1px 6px' }}>
                        Pix
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
