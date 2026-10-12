'use client'
import { Cross } from 'lucide-react'
import { moeda } from '@/lib/format'
import { NOME_EVENTO, NOME_PAROQUIA, TOTAL_MESAS, type Mesa } from '@/lib/types'

export function Hero({ mesas }: { mesas: Mesa[] }) {
  const vendidas = mesas.filter(m => m.status === 'vendida').length
  const reservadas = mesas.filter(m => m.status === 'reservada').length
  const livres = TOTAL_MESAS - vendidas - reservadas
  const arrecadado = mesas
    .filter(m => m.status === 'vendida')
    .reduce((s, m) => s + (m.preco ?? 0), 0)

  const R = 46
  const C = 2 * Math.PI * R
  const pVend = vendidas / TOTAL_MESAS
  const pRes = (vendidas + reservadas) / TOTAL_MESAS

  return (
    <header className="hero">
      <div className="hero-top">
        <div className="brand">
          <div className="brand-mark" aria-hidden>
            <Cross size={26} strokeWidth={2.4} />
          </div>
          <div style={{ minWidth: 0 }}>
            {NOME_PAROQUIA ? <div className="brand-eyebrow">{NOME_PAROQUIA}</div> : null}
            <h1>{NOME_EVENTO}</h1>
            <div className="brand-sub">Controle de venda das {TOTAL_MESAS} mesas</div>
          </div>
        </div>

        <div className="ring" title={`${vendidas + reservadas} de ${TOTAL_MESAS} mesas ocupadas`}>
          <svg viewBox="0 0 108 108">
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(150 80% 60%)" />
                <stop offset="100%" stopColor="hsl(165 85% 42%)" />
              </linearGradient>
            </defs>
            <circle className="ring-track" cx="54" cy="54" r={R} fill="none" strokeWidth="9" />
            <circle
              className="ring-res"
              cx="54" cy="54" r={R} fill="none" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - pRes)}
            />
            <circle
              className="ring-sold"
              cx="54" cy="54" r={R} fill="none" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - pVend)}
            />
          </svg>
          <div className="ring-center">
            <div className="ring-num">{vendidas + reservadas}</div>
            <div className="ring-label">DE {TOTAL_MESAS}</div>
          </div>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label"><i className="stat-dot" style={{ background: '#fff' }} />Livres</div>
          <div className="stat-value">{livres}</div>
        </div>
        <div className="stat">
          <div className="stat-label"><i className="stat-dot" style={{ background: 'var(--amber)' }} />Reservadas</div>
          <div className="stat-value">{reservadas}</div>
        </div>
        <div className="stat">
          <div className="stat-label"><i className="stat-dot" style={{ background: 'hsl(150 80% 55%)' }} />Vendidas</div>
          <div className="stat-value">{vendidas}</div>
        </div>
        <div className="stat">
          <div className="stat-label"><i className="stat-dot" style={{ background: 'var(--gold)' }} />Arrecadado</div>
          <div className="stat-value">{moeda(arrecadado)}</div>
        </div>
      </div>
    </header>
  )
}
