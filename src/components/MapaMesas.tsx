'use client'

import { useState, useMemo } from 'react'
import { Mesa } from '@/hooks/useMesasRealtime'
import { ModalPrintMapa } from '@/components/ModalPrintMapa'

type Props = {
  mesas: Mesa[]
  selecionadas: Set<number>
  onToggleMesa: (num: number) => void
}

type BlocoFiltro = 'TODOS' | 'A' | 'B' | 'C' | 'D'

export function MapaMesas({ mesas, selecionadas, onToggleMesa }: Props) {
  const [blocoFiltro, setBlocoFiltro] = useState<BlocoFiltro>('TODOS')
  const [modalPrintOpen, setModalPrintOpen] = useState(false)

  // Converte a lista em Map para busca O(1)
  const mesasMap = useMemo(() => {
    const m = new Map<number, Mesa>()
    mesas.forEach(mesa => m.set(mesa.numero, mesa))
    return m
  }, [mesas])

  // Contagem de mesas livres por bloco
  const estatisticasBlocos = useMemo(() => {
    const contarLivres = (min: number, max: number) =>
      mesas.filter(m => m.numero >= min && m.numero <= max && m.status === 'livre').length

    return {
      A: contarLivres(141, 200),
      B: contarLivres(81, 140),
      C: contarLivres(41, 80),
      D: contarLivres(1, 40),
    }
  }, [mesas])

  const renderBlock = (startTop: number, rows: number, cols: number) => {
    const botoes = []
    for (let r = 0; r < rows; r++) {
      const rowStart = startTop - cols * r
      for (let c = 0; c < cols; c++) {
        const num = rowStart - c
        const mesa = mesasMap.get(num)
        const status = mesa?.status || 'livre'
        const isSelected = selecionadas.has(num)

        let className = 'mesa'
        if (status === 'vendida') className += ' vendida'
        else if (status === 'reservada') className += ' reservada'
        else if (isSelected) className += ' selecionada'

        botoes.push(
          <button
            key={num}
            className={className}
            disabled={status !== 'livre'}
            onClick={() => onToggleMesa(num)}
            title={status !== 'livre' ? `Mesa ${num} — ${status}` : `Mesa ${num} — livre`}
          >
            {num}
          </button>
        )
      }
    }
    return botoes
  }

  return (
    <div className="floor-wrapper">
      {/* Barra de Ferramentas Mobile & Filtro por Blocos */}
      <div className="mapa-toolbar">
        <div className="blocos-tabs">
          <button
            className={`tab-bloco ${blocoFiltro === 'TODOS' ? 'active' : ''}`}
            onClick={() => setBlocoFiltro('TODOS')}
          >
            🌟 Ver Todos os Blocos
          </button>
          <button
            className={`tab-bloco ${blocoFiltro === 'A' ? 'active' : ''}`}
            onClick={() => setBlocoFiltro('A')}
          >
            🅰️ Bloco A <span className="badge-livres">{estatisticasBlocos.A} livres</span>
          </button>
          <button
            className={`tab-bloco ${blocoFiltro === 'B' ? 'active' : ''}`}
            onClick={() => setBlocoFiltro('B')}
          >
            🅱️ Bloco B <span className="badge-livres">{estatisticasBlocos.B} livres</span>
          </button>
          <button
            className={`tab-bloco ${blocoFiltro === 'C' ? 'active' : ''}`}
            onClick={() => setBlocoFiltro('C')}
          >
            🅲 Bloco C <span className="badge-livres">{estatisticasBlocos.C} livres</span>
          </button>
          <button
            className={`tab-bloco ${blocoFiltro === 'D' ? 'active' : ''}`}
            onClick={() => setBlocoFiltro('D')}
          >
            🅹 Bloco D <span className="badge-livres">{estatisticasBlocos.D} livres</span>
          </button>
        </div>

        <button
          className="print-mapa-btn"
          onClick={() => setModalPrintOpen(true)}
          title="Abrir imagem visual do mapa de mesas para mostrar ao cliente"
        >
          📱 Gerar Print do Mapa (para Cliente)
        </button>
      </div>

      {/* Exibição do Mapa — Visão Completa vs Foco em Bloco */}
      {blocoFiltro === 'TODOS' ? (
        <div className="floor">
          <div className="floor-inner">
            <div className="box entrada">ENTRADA</div>
            <div className="box blue igreja">IGREJA</div>
            <div className="box blue caixa">CAIXA</div>

            <div className="barracas-left">
              <div className="box barraca">BARRACAS</div>
              <div className="box barraca">BARRACAS</div>
            </div>
            <div className="barracas-right">
              <div className="box barraca">BARRACAS</div>
              <div className="box barraca">BARRACAS</div>
            </div>

            <div className="table-block block-a">
              <div className="block-label">BLOCO A (Mesas 141-200)</div>
              <div className="grid6">{renderBlock(200, 10, 6)}</div>
            </div>
            <div className="table-block block-b">
              <div className="block-label">BLOCO B (Mesas 81-140)</div>
              <div className="grid6">{renderBlock(140, 10, 6)}</div>
            </div>
            <div className="table-block block-c">
              <div className="block-label">BLOCO C (Mesas 41-80)</div>
              <div className="grid4">{renderBlock(80, 10, 4)}</div>
            </div>
            <div className="table-block block-d">
              <div className="block-label">BLOCO D (Mesas 1-40)</div>
              <div className="grid4">{renderBlock(40, 10, 4)}</div>
            </div>

            <div className="box palco">PALCO</div>
          </div>
        </div>
      ) : (
        /* Visão Focada em 1 Bloco Otimizada para Celular */
        <div className="bloco-focused-container">
          <div className="bloco-focused-header">
            <h3>
              {blocoFiltro === 'A' && '🅰️ BLOCO A (Mesas 141 a 200 — Esq. Superior)'}
              {blocoFiltro === 'B' && '🅱️ BLOCO B (Mesas 81 a 140 — Esq. Inferior)'}
              {blocoFiltro === 'C' && '🅲 BLOCO C (Mesas 41 a 80 — Dir. Superior)'}
              {blocoFiltro === 'D' && '🅹 BLOCO D (Mesas 1 a 40 — Dir. Inferior)'}
            </h3>
            <span className="sub">Toque nos números verdes para selecionar para compra</span>
          </div>

          <div className="table-block focused">
            <div className={blocoFiltro === 'A' || blocoFiltro === 'B' ? 'grid6' : 'grid4'}>
              {blocoFiltro === 'A' && renderBlock(200, 10, 6)}
              {blocoFiltro === 'B' && renderBlock(140, 10, 6)}
              {blocoFiltro === 'C' && renderBlock(80, 10, 4)}
              {blocoFiltro === 'D' && renderBlock(40, 10, 4)}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Print e Visualização do Mapa */}
      <ModalPrintMapa
        isOpen={modalPrintOpen}
        onClose={() => setModalPrintOpen(false)}
        mesas={mesas}
      />
    </div>
  )
}
