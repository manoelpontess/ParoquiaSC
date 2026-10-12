'use client'
import { useMemo, useState } from 'react'
import { ArrowRight, Check, Clock, Search } from 'lucide-react'
import { listaMesas, moeda, numMesa, primeiroNome } from '@/lib/format'
import type { Mesa, StatusMesa } from '@/lib/types'

type Filtro = 'todas' | StatusMesa

export function GradeMesas({
  mesas,
  selecionadas,
  preco,
  onToggle,
  onLimpar,
  onVender,
  onAbrirMesa,
}: {
  mesas: Mesa[]
  selecionadas: Set<number>
  preco: number
  onToggle: (n: number) => void
  onLimpar: () => void
  onVender: () => void
  onAbrirMesa: (n: number) => void
}) {
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [busca, setBusca] = useState('')

  const contagem = useMemo(() => ({
    todas: mesas.length,
    livre: mesas.filter(m => m.status === 'livre').length,
    reservada: mesas.filter(m => m.status === 'reservada').length,
    vendida: mesas.filter(m => m.status === 'vendida').length,
  }), [mesas])

  const termo = busca.trim().toLowerCase()
  const corresponde = (m: Mesa) => {
    if (filtro !== 'todas' && m.status !== filtro) return false
    if (!termo) return true
    if (String(m.numero) === termo.replace(/^0+/, '')) return true
    const v = m.venda
    return !!v && (
      v.comprador.nome.toLowerCase().includes(termo) ||
      (v.responsavel ?? '').toLowerCase().includes(termo) ||
      (v.comprador.telefone ?? '').replace(/\D/g, '').includes(termo.replace(/\D/g, '') || '§')
    )
  }

  const filtros: { id: Filtro; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'livre', label: 'Livres' },
    { id: 'reservada', label: 'Reservadas' },
    { id: 'vendida', label: 'Vendidas' },
  ]

  const qtd = selecionadas.size

  return (
    <section>
      <div className="toolbar">
        <div className="chips" role="tablist">
          {filtros.map(f => (
            <button
              key={f.id}
              id={`filtro-${f.id}`}
              className={`chip ${filtro === f.id ? 'active' : ''}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.label}
              <span className="chip-count">{contagem[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="search">
          <Search size={16} />
          <input
            id="busca-mesas"
            className="input"
            placeholder="Buscar nº, comprador ou responsável"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
      </div>

      <div className="grid-mesas">
        {mesas.map((m, i) => {
          const sel = selecionadas.has(m.numero)
          const visivel = corresponde(m)
          const classe = sel ? 'is-sel' : `is-${m.status}`
          const tag =
            sel ? 'Selecionada'
            : m.status === 'livre' ? 'Livre'
            : primeiroNome(m.venda?.comprador.nome ?? '') || (m.status === 'vendida' ? 'Vendida' : 'Reservada')

          return (
            <button
              key={m.numero}
              id={`mesa-${m.numero}`}
              className={`mesa ${classe} ${visivel ? '' : 'is-dim'}`}
              style={{ ['--i' as string]: i }}
              onClick={() => (m.status === 'livre' ? onToggle(m.numero) : onAbrirMesa(m.numero))}
              aria-pressed={sel}
              aria-label={`Mesa ${m.numero} — ${tag}`}
            >
              {(sel || m.status === 'vendida') && (
                <span className="mesa-icon"><Check size={12} strokeWidth={3.5} /></span>
              )}
              {!sel && m.status === 'reservada' && (
                <span className="mesa-icon"><Clock size={11} strokeWidth={3} /></span>
              )}
              <span className="mesa-num">{numMesa(m.numero)}</span>
              <span className="mesa-tag">{tag}</span>
            </button>
          )
        })}
      </div>

      <div className="legend">
        <span><i style={{ background: '#fff', border: '1.5px solid var(--border-strong)' }} />Livre — toque para selecionar</span>
        <span><i style={{ background: 'var(--primary)' }} />Selecionada</span>
        <span><i style={{ background: 'var(--amber)' }} />Reservada (falta pagar)</span>
        <span><i style={{ background: 'var(--green)' }} />Vendida</span>
      </div>

      {qtd > 0 && (
        <div className="checkout" role="region" aria-label="Mesas selecionadas">
          <div className="checkout-count">{qtd}</div>
          <div className="checkout-info">
            <div className="checkout-title">{qtd === 1 ? '1 mesa selecionada' : `${qtd} mesas selecionadas`}</div>
            <div className="checkout-mesas">Mesas {listaMesas(Array.from(selecionadas))}</div>
          </div>
          <div className="checkout-total">{moeda(qtd * preco)}</div>
          <button className="btn btn-ghost btn-sm" onClick={onLimpar} id="limpar-selecao">Limpar</button>
          <button className="btn btn-primary" onClick={onVender} id="vender-btn">
            Vender <ArrowRight size={18} />
          </button>
        </div>
      )}
    </section>
  )
}
