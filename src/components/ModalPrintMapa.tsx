'use client'

import { useState, useMemo } from 'react'
import { Mesa } from '@/hooks/useMesasRealtime'

type Props = {
  isOpen: boolean
  onClose: () => void
  mesas: Mesa[]
}

type BlocoFiltro = 'TODOS' | 'A' | 'B' | 'C' | 'D'

export function ModalPrintMapa({ isOpen, onClose, mesas }: Props) {
  const [blocoSelecionado, setBlocoSelecionado] = useState<BlocoFiltro>('TODOS')

  const mesasMap = useMemo(() => {
    const map = new Map<number, Mesa>()
    mesas.forEach(m => map.set(m.numero, m))
    return map
  }, [mesas])

  if (!isOpen) return null

  // Estatísticas gerais
  const totalLivres = mesas.filter(m => m.status === 'livre').length
  const totalReservadas = mesas.filter(m => m.status === 'reservada').length
  const totalVendidas = mesas.filter(m => m.status === 'vendida').length

  const renderBlockGrid = (startTop: number, rows: number, cols: number) => {
    const items = []
    for (let r = 0; r < rows; r++) {
      const rowStart = startTop - cols * r
      for (let c = 0; c < cols; c++) {
        const num = rowStart - c
        const mesa = mesasMap.get(num)
        const status = mesa?.status || 'livre'
        const statusClass = status === 'vendida' ? 'vendida' : status === 'reservada' ? 'reservada' : 'livre'

        items.push(
          <div key={num} className={`print-mesa-box ${statusClass}`}>
            {num}
          </div>
        )
      }
    }
    return items
  }

  const handleImprimirMapa = () => {
    const agora = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

    const renderHTMLGrid = (startTop: number, rows: number, cols: number) => {
      let gridHTML = ''
      for (let r = 0; r < rows; r++) {
        const rowStart = startTop - cols * r
        for (let c = 0; c < cols; c++) {
          const num = rowStart - c
          const mesa = mesasMap.get(num)
          const status = mesa?.status || 'livre'
          const bg = status === 'vendida' ? '#cbd5e1' : status === 'reservada' ? '#fde047' : '#22c55e'
          const color = status === 'vendida' ? '#475569' : status === 'reservada' ? '#854d0e' : '#ffffff'
          const border = status === 'vendida' ? '#94a3b8' : status === 'reservada' ? '#eab308' : '#16a34a'

          gridHTML += `
            <div style="
              background:${bg};
              color:${color};
              border:1px solid ${border};
              border-radius:4px;
              display:flex;
              align-items:center;
              justify-content:center;
              font-weight:800;
              font-size:12px;
              aspect-ratio: 1;
              box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            ">${num}</div>
          `
        }
      }
      return gridHTML
    }

    const showA = blocoSelecionado === 'TODOS' || blocoSelecionado === 'A'
    const showB = blocoSelecionado === 'TODOS' || blocoSelecionado === 'B'
    const showC = blocoSelecionado === 'TODOS' || blocoSelecionado === 'C'
    const showD = blocoSelecionado === 'TODOS' || blocoSelecionado === 'D'

    const htmlMapContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Mapa Visual de Mesas — Bingão Paróquia Santa Cruz</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', sans-serif;
            background: #ffffff;
            color: #111827;
            padding: 16px;
          }
          @page { size: A4 portrait; margin: 10mm; }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }
          .no-print {
            background: #15803d;
            color: white;
            padding: 14px 20px;
            border-radius: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          .btn-print {
            background: white;
            color: #15803d;
            border: none;
            padding: 8px 18px;
            border-radius: 8px;
            font-weight: 800;
            font-size: 14px;
            cursor: pointer;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #16a34a;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .title { font-size: 20px; font-weight: 800; color: #14532d; }
          .subtitle { font-size: 12px; color: #4b5563; }
          .legend {
            display: flex;
            gap: 16px;
            align-items: center;
            background: #f8fafc;
            padding: 10px 14px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 20px;
          }
          .dot { width: 12px; height: 12px; border-radius: 3px; display: inline-block; vertical-align: middle; margin-right: 4px; }
          .dot-livre { background: #22c55e; }
          .dot-res { background: #fde047; border: 1px solid #eab308; }
          .dot-vendida { background: #cbd5e1; }
          
          .blocks-container {
            display: grid;
            grid-template-columns: ${blocoSelecionado === 'TODOS' ? '1fr 1fr' : '1fr'};
            gap: 16px;
          }
          .block-card {
            border: 1.5px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px;
            background: #ffffff;
          }
          .block-title {
            font-size: 14px;
            font-weight: 800;
            color: #15803d;
            margin-bottom: 8px;
            text-transform: uppercase;
          }
          .grid6 { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; }
          .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
        </style>
      </head>
      <body>
        <div class="no-print">
          <div>
            <strong>🗺️ Mapa Visual de Mesas para Vendas</strong>
            <div style="font-size:12px;opacity:0.9">Mostre aos clientes ou tire um print da tela para enviar</div>
          </div>
          <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
        </div>

        <div class="header">
          <div>
            <div class="title">🎰 Bingão Paróquia Santa Cruz</div>
            <div class="subtitle">Mapa Geral de Mesas Disponíveis — Atualizado em ${agora}</div>
          </div>
        </div>

        <div class="legend">
          <span><span class="dot dot-livre"></span> 🟢 LIVRE (${totalLivres})</span>
          <span><span class="dot dot-res"></span> 🟡 RESERVADA (${totalReservadas})</span>
          <span><span class="dot dot-vendida"></span> ⚪ VENDIDA (${totalVendidas})</span>
        </div>

        <div class="blocks-container">
          ${showA ? `
            <div class="block-card">
              <div class="block-title">BLOCO A (Mesas 141 a 200 — Esq. Superior)</div>
              <div class="grid6">${renderHTMLGrid(200, 10, 6)}</div>
            </div>
          ` : ''}

          ${showB ? `
            <div class="block-card">
              <div class="block-title">BLOCO B (Mesas 81 a 140 — Esq. Inferior)</div>
              <div class="grid6">${renderHTMLGrid(140, 10, 6)}</div>
            </div>
          ` : ''}

          ${showC ? `
            <div class="block-card">
              <div class="block-title">BLOCO C (Mesas 41 a 80 — Dir. Superior)</div>
              <div class="grid4">${renderHTMLGrid(80, 10, 4)}</div>
            </div>
          ` : ''}

          ${showD ? `
            <div class="block-card">
              <div class="block-title">BLOCO D (Mesas 1 a 40 — Dir. Inferior)</div>
              <div class="grid4">${renderHTMLGrid(40, 10, 4)}</div>
            </div>
          ` : ''}
        </div>
      </body>
      </html>
    `

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(htmlMapContent)
      win.document.close()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '640px', width: '95%' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2>📱 Print / Mapa das Mesas</h2>
            <div className="step-sub" style={{ margin: 0 }}>Visualização limpa das mesas disponíveis para mostrar aos clientes</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--gray-500)' }}>
            ✕
          </button>
        </div>

        {/* Legenda com contadores */}
        <div style={{
          display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--gray-50)',
          padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: '13px', fontWeight: 600, marginBottom: '16px'
        }}>
          <span style={{ color: '#16a34a' }}>🟢 Livres: <b>{totalLivres}</b></span>
          <span>·</span>
          <span style={{ color: '#d97706' }}>🟡 Reservadas: <b>{totalReservadas}</b></span>
          <span>·</span>
          <span style={{ color: '#64748b' }}>⚪ Vendidas: <b>{totalVendidas}</b></span>
        </div>

        {/* Seletor de Bloco para Print */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {(['TODOS', 'A', 'B', 'C', 'D'] as const).map(bloco => (
            <button
              key={bloco}
              onClick={() => setBlocoSelecionado(bloco)}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                border: '1.5px solid',
                cursor: 'pointer',
                background: blocoSelecionado === bloco ? 'var(--green-700)' : 'white',
                color: blocoSelecionado === bloco ? 'white' : 'var(--gray-700)',
                borderColor: blocoSelecionado === bloco ? 'var(--green-700)' : 'var(--gray-300)'
              }}
            >
              {bloco === 'TODOS' ? '🌟 Todos os Blocos' : `Bloco ${bloco}`}
            </button>
          ))}
        </div>

        {/* Visualização interativa reduzida para print ou captura */}
        <div style={{
          maxHeight: '420px',
          overflowY: 'auto',
          border: '1px solid var(--gray-200)',
          borderRadius: 'var(--radius)',
          padding: '14px',
          background: '#f8fafc'
        }}>
          <style>{`
            .print-grid6 { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; }
            .print-grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
            .print-mesa-box {
              aspect-ratio: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 11px;
              border-radius: 4px;
              border: 1px solid;
            }
            .print-mesa-box.livre { background: #22c55e; color: white; border-color: #16a34a; }
            .print-mesa-box.reservada { background: #fde047; color: #854d0e; border-color: #eab308; }
            .print-mesa-box.vendida { background: #cbd5e1; color: #475569; border-color: #94a3b8; }
          `}</style>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(blocoSelecionado === 'TODOS' || blocoSelecionado === 'A') && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--green-800)', marginBottom: '6px' }}>BLOCO A (Mesas 141 - 200)</div>
                <div className="print-grid6">{renderBlockGrid(200, 10, 6)}</div>
              </div>
            )}

            {(blocoSelecionado === 'TODOS' || blocoSelecionado === 'B') && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--green-800)', marginBottom: '6px' }}>BLOCO B (Mesas 81 - 140)</div>
                <div className="print-grid6">{renderBlockGrid(140, 10, 6)}</div>
              </div>
            )}

            {(blocoSelecionado === 'TODOS' || blocoSelecionado === 'C') && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--green-800)', marginBottom: '6px' }}>BLOCO C (Mesas 41 - 80)</div>
                <div className="print-grid4">{renderBlockGrid(80, 10, 4)}</div>
              </div>
            )}

            {(blocoSelecionado === 'TODOS' || blocoSelecionado === 'D') && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--green-800)', marginBottom: '6px' }}>BLOCO D (Mesas 1 - 40)</div>
                <div className="print-grid4">{renderBlockGrid(40, 10, 4)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button className="secondary-btn" onClick={onClose}>
            Fechar
          </button>
          <button className="primary-btn" onClick={handleImprimirMapa}>
            🖨️ Abrir / Imprimir / PDF do Mapa Visual
          </button>
        </div>
      </div>
    </div>
  )
}
