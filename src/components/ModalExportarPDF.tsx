'use client'

import { useState } from 'react'
import { getListaCompletaParaExportacao } from '@/app/actions'

type Props = {
  isOpen: boolean
  onClose: () => void
}

type BlocoId = 'TODOS' | 'A' | 'B' | 'C' | 'D'

interface BlocoDef {
  id: 'A' | 'B' | 'C' | 'D'
  nome: string
  descricao: string
  minMesa: number
  maxMesa: number
}

const BLOCOS: BlocoDef[] = [
  { id: 'A', nome: 'Bloco A', descricao: 'Esquerda Superior (Mesas 141 a 200)', minMesa: 141, maxMesa: 200 },
  { id: 'B', nome: 'Bloco B', descricao: 'Esquerda Inferior (Mesas 81 a 140)', minMesa: 81, maxMesa: 140 },
  { id: 'C', nome: 'Bloco C', descricao: 'Direita Superior (Mesas 41 a 80)', minMesa: 41, maxMesa: 80 },
  { id: 'D', nome: 'Bloco D', descricao: 'Direita Inferior (Mesas 1 a 40)', minMesa: 1, maxMesa: 40 },
]

export function ModalExportarPDF({ isOpen, onClose }: Props) {
  const [blocoSelecionado, setBlocoSelecionado] = useState<BlocoId>('TODOS')
  const [apenasOcupadas, setApenasOcupadas] = useState(false)
  const [incluirCheck, setIncluirCheck] = useState(true)
  const [incluirAgente, setIncluirAgente] = useState(true)
  const [gerando, setGerando] = useState(false)

  if (!isOpen) return null

  const handleExportar = async () => {
    setGerando(true)
    try {
      const dados = await getListaCompletaParaExportacao()
      if (!dados || dados.length === 0) {
        alert('Nenhum dado encontrado para exportação.')
        setGerando(false)
        return
      }

      const agora = new Date().toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
      })

      const blocosParaProcessar = blocoSelecionado === 'TODOS'
        ? BLOCOS
        : BLOCOS.filter(b => b.id === blocoSelecionado)

      const blocosHTML = blocosParaProcessar.map((bloco) => {
        let mesasDoBloco = dados.filter(m => m.numero >= bloco.minMesa && m.numero <= bloco.maxMesa)

        // Estatísticas completas do bloco (antes de filtrar livres se opção apenas ocupadas)
        const totalMesas = mesasDoBloco.length
        const totalPagas = mesasDoBloco.filter(m => m.status === 'vendida').length
        const totalReservadas = mesasDoBloco.filter(m => m.status === 'reservada').length
        const totalLivres = mesasDoBloco.filter(m => m.status === 'livre').length

        if (apenasOcupadas) {
          mesasDoBloco = mesasDoBloco.filter(m => m.status !== 'livre')
        }

        const linhas = mesasDoBloco.map((m: any) => {
          const venda = Array.isArray(m.vendas) ? m.vendas[0] : m.vendas
          const comprador = Array.isArray(venda?.compradores) ? venda?.compradores[0] : venda?.compradores
          const statusLabel = m.status === 'vendida' ? '✅ PAGO' : m.status === 'reservada' ? '⏳ RESERVADA' : '⚪ LIVRE'
          const badgeClass = m.status === 'vendida' ? 'badge-pago' : m.status === 'reservada' ? 'badge-res' : 'badge-livre'
          const area = venda?.area_missionaria || '—'

          return `
            <tr>
              ${incluirCheck ? '<td class="col-check"><span class="checkbox-sq"></span></td>' : ''}
              <td style="font-weight:800;color:#15803d;font-size:13px">#${String(m.numero).padStart(3, '0')}</td>
              <td style="font-weight:600">${comprador?.nome || '<span style="color:#94a3b8">—</span>'}</td>
              <td style="color:#374151">${comprador?.telefone || '—'}</td>
              <td style="font-size:11px;color:#4b5563">${area}</td>
              <td><span class="badge-status ${badgeClass}">${statusLabel}</span></td>
              <td style="width:120px;border-bottom:1px solid #e5e7eb"></td>
            </tr>
          `
        }).join('')

        return `
          <div class="bloco-page">
            <div class="bloco-header">
              <div>
                <div class="bloco-tag">${bloco.nome}</div>
                <div class="bloco-title">🎰 Bingão Paróquia Santa Cruz</div>
                <div class="bloco-sub">${bloco.descricao}</div>
              </div>
              ${incluirAgente ? `
                <div class="agent-box">
                  <div class="agent-label">Agente Responsável do Bloco:</div>
                  <div class="agent-line">_______________________________________</div>
                </div>
              ` : ''}
            </div>

            <div class="stats-bar">
              <span class="stat-pill">Capacidade: <b>${totalMesas} mesas</b></span>
              <span>·</span>
              <span class="stat-pill stat-pago">Pagas: <b>${totalPagas}</b></span>
              <span>·</span>
              <span class="stat-pill stat-res">Reservadas: <b>${totalReservadas}</b></span>
              <span>·</span>
              <span class="stat-pill stat-livre">Livres: <b>${totalLivres}</b></span>
              <span style="margin-left:auto;color:#6b7280;font-size:11px">Gerado em: ${agora}</span>
            </div>

            ${mesasDoBloco.length === 0 ? `
              <div style="padding:20px;text-align:center;color:#6b7280;font-style:italic;background:#f9fafb;border-radius:8px">
                Nenhuma mesa encontrada neste bloco com os filtros selecionados.
              </div>
            ` : `
              <table>
                <thead>
                  <tr>
                    ${incluirCheck ? '<th class="col-check">Presença</th>' : ''}
                    <th style="width:60px">Mesa</th>
                    <th>Comprador</th>
                    <th>Telefone</th>
                    <th>Área Missionária</th>
                    <th>Status</th>
                    <th>Observação / Assinatura</th>
                  </tr>
                </thead>
                <tbody>
                  ${linhas}
                </tbody>
              </table>
            `}
          </div>
        `
      }).join('')

      const htmlFinal = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Relatório de Blocos — Bingão Paróquia Santa Cruz</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #111827;
      background: #f3f4f6;
      padding: 20px;
    }

    @page {
      size: A4 portrait;
      margin: 10mm 10mm;
    }

    .no-print {
      max-width: 900px;
      margin: 0 auto 20px auto;
      padding: 16px 20px;
      background: #15803d;
      color: white;
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .btn-print {
      background: white;
      color: #15803d;
      border: none;
      padding: 10px 22px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }

    .btn-print:hover {
      background: #f0fdf4;
      transform: translateY(-1px);
    }

    .bloco-page {
      background: white;
      max-width: 900px;
      margin: 0 auto 24px auto;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    @media print {
      body {
        padding: 0;
        background: white;
      }
      .no-print {
        display: none !important;
      }
      .bloco-page {
        max-width: 100%;
        margin: 0;
        padding: 0;
        border-radius: 0;
        box-shadow: none;
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
      }
      .bloco-page:last-child {
        page-break-after: avoid;
        break-after: avoid;
      }
    }

    .bloco-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 2px solid #16a34a;
    }

    .bloco-tag {
      display: inline-block;
      background: #15803d;
      color: white;
      font-size: 13px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .bloco-title {
      font-size: 20px;
      font-weight: 800;
      color: #14532d;
    }

    .bloco-sub {
      font-size: 12px;
      color: #4b5563;
      margin-top: 2px;
    }

    .agent-box {
      border: 1.5px dashed #9ca3af;
      background: #f9fafb;
      padding: 8px 14px;
      border-radius: 8px;
      min-width: 280px;
    }

    .agent-label {
      font-size: 10px;
      font-weight: 700;
      color: #374151;
      text-transform: uppercase;
      margin-bottom: 6px;
      letter-spacing: 0.04em;
    }

    .agent-line {
      font-size: 12px;
      color: #9ca3af;
    }

    .stats-bar {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 14px;
      background: #f8fafc;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      border: 1px solid #e2e8f0;
    }

    .stat-pill {
      font-weight: 600;
    }

    .stat-pago { color: #16a34a; }
    .stat-res { color: #d97706; }
    .stat-livre { color: #64748b; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    th {
      background: #f0fdf4;
      color: #166534;
      text-align: left;
      padding: 7px 10px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 2px solid #bbf7d0;
    }

    td {
      padding: 7px 10px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: middle;
    }

    tr:nth-child(even) td {
      background: #fdfdfd;
    }

    .col-check {
      width: 60px;
      text-align: center;
    }

    .checkbox-sq {
      display: inline-block;
      width: 15px;
      height: 15px;
      border: 1.5px solid #9ca3af;
      border-radius: 3px;
      background: white;
    }

    .badge-status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
    }

    .badge-pago { background: #dcfce7; color: #15803d; }
    .badge-res { background: #fef3c7; color: #b45309; }
    .badge-livre { background: #f1f5f9; color: #64748b; }
  </style>
</head>
<body>
  <div class="no-print">
    <div>
      <strong style="font-size:16px">📄 Relatório para Agentes de Bloco</strong>
      <div style="font-size:12px;opacity:0.9">Clique no botão ao lado para Imprimir ou Salvar em PDF</div>
    </div>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
  </div>

  ${blocosHTML}
</body>
</html>`

      const janela = window.open('', '_blank')
      if (janela) {
        janela.document.write(htmlFinal)
        janela.document.close()
      }
      onClose()
    } catch (e) {
      console.error('Erro ao gerar exportação:', e)
      alert('Ocorreu um erro ao gerar a exportação.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>📄 Exportar Relatório em PDF</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--gray-500)' }}
          >
            ✕
          </button>
        </div>

        <p className="step-sub" style={{ marginBottom: '16px' }}>
          Selecione os blocos e opções de impressão para gerar as folhas dos agentes organizadores.
        </p>

        {/* Seleção do Bloco */}
        <div className="field">
          <label>Selecione o Bloco</label>
          <select
            value={blocoSelecionado}
            onChange={e => setBlocoSelecionado(e.target.value as BlocoId)}
            style={{
              width: '100%',
              padding: '11px 14px',
              borderRadius: 'var(--radius)',
              border: '1.5px solid var(--gray-200)',
              background: 'var(--gray-50)',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--ink)'
            }}
          >
            <option value="TODOS">🌟 TODOS OS BLOCOS (A, B, C e D — Pág. separadas)</option>
            <option value="A">🅰️ BLOCO A (Mesas 141 a 200 — Esq. Superior)</option>
            <option value="B">🅱️ BLOCO B (Mesas 81 a 140 — Esq. Inferior)</option>
            <option value="C">🅲 BLOCO C (Mesas 41 a 80 — Dir. Superior)</option>
            <option value="D">🅹 BLOCO D (Mesas 1 a 40 — Dir. Inferior)</option>
          </select>
        </div>

        {/* Opções de Filtro de Mesas */}
        <div className="field" style={{ marginTop: '16px' }}>
          <label>Filtro de Mesas</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setApenasOcupadas(false)}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1.5px solid',
                borderColor: !apenasOcupadas ? 'var(--green-600)' : 'var(--gray-200)',
                background: !apenasOcupadas ? 'var(--green-50)' : 'white',
                color: !apenasOcupadas ? 'var(--green-800)' : 'var(--gray-700)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              📋 Todas as Mesas (inclui Livres)
            </button>
            <button
              type="button"
              onClick={() => setApenasOcupadas(true)}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1.5px solid',
                borderColor: apenasOcupadas ? 'var(--green-600)' : 'var(--gray-200)',
                background: apenasOcupadas ? 'var(--green-50)' : 'white',
                color: apenasOcupadas ? 'var(--green-800)' : 'var(--gray-700)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              ✅ Apenas Ocupadas (Pagas/Reser.)
            </button>
          </div>
        </div>

        {/* Opções adicionais de layout */}
        <div style={{ background: 'var(--gray-50)', padding: '14px', borderRadius: 'var(--radius)', marginTop: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '10px', textTransform: 'uppercase' }}>
            Opções de Formulário para Impressão
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '8px', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={incluirAgente}
              onChange={e => setIncluirAgente(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--green-600)' }}
            />
            Incluir campo "Agente Responsável do Bloco" no cabeçalho
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={incluirCheck}
              onChange={e => setIncluirCheck(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--green-600)' }}
            />
            Incluir coluna de marcação de Presença / Check-in 🔲
          </label>
        </div>

        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button className="secondary-btn" onClick={onClose} disabled={gerando}>
            Cancelar
          </button>
          <button className="primary-btn" onClick={handleExportar} disabled={gerando}>
            {gerando ? '⌛ Gerando...' : '🖨️ Gerar PDF / Imprimir'}
          </button>
        </div>
      </div>
    </div>
  )
}
