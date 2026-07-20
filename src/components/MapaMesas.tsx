'use client'
import { useMemo } from 'react'
import { Mesa } from '@/hooks/useMesasRealtime'

type Props = {
  mesas: Mesa[]
  selecionadas: Set<number>
  onToggleMesa: (num: number) => void
}

export function MapaMesas({ mesas, selecionadas, onToggleMesa }: Props) {
  // Converte a lista em Map para busca O(1) em vez de O(n) por mesa
  const mesasMap = useMemo(() => {
    const m = new Map<number, Mesa>()
    mesas.forEach(mesa => m.set(mesa.numero, mesa))
    return m
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
          <div className="grid6">{renderBlock(200, 10, 6)}</div>
        </div>
        <div className="table-block block-b">
          <div className="grid6">{renderBlock(140, 10, 6)}</div>
        </div>
        <div className="table-block block-c">
          <div className="grid4">{renderBlock(80, 10, 4)}</div>
        </div>
        <div className="table-block block-d">
          <div className="grid4">{renderBlock(40, 10, 4)}</div>
        </div>

        <div className="box palco">PALCO</div>
      </div>
    </div>
  )
}
