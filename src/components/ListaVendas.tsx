'use client'
import { useEffect, useState } from 'react'
import { getListaVendas, liberarMesa, getListaCompletaParaExportacao } from '@/app/actions'

export type MesaVendida = {
  numero: number
  status: string
  reservado_em: string | null
  vendas: {
    id: string
    total: number
    status: string
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

async function exportarLista() {
  const dados = await getListaCompletaParaExportacao()
  if (!dados || dados.length === 0) {
    alert('Nenhum dado para exportar.')
    return
  }

  const agora = new Date().toLocaleString('pt-BR')

  const linhas = dados.map((m: any) => {
    const venda = m.vendas
    const comprador = venda?.compradores
    const statusLabel = m.status === 'vendida' ? 'PAGO' : m.status === 'reservada' ? 'RESERVADA' : 'LIVRE'
    const statusCor = m.status === 'vendida' ? '#16a34a' : m.status === 'reservada' ? '#d97706' : '#94a3b8'
    const setor = gerarSetor(m.numero)
    return `
      <tr style="background:${m.status === 'livre' ? '#f9fafb' : 'white'}">
        <td style="font-weight:700;color:#15803d;font-size:15px">#${String(m.numero).padStart(3,'0')}</td>
        <td>${comprador?.nome || '<span style="color:#94a3b8">—</span>'}</td>
        <td style="color:#4b5563">${comprador?.telefone || '—'}</td>
        <td style="font-size:12px;color:#6b7280">${setor}</td>
        <td><span style="background:${statusCor}22;color:${statusCor};padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700">${statusLabel}</span></td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lista de Mesas — Bingão Paróquia Santa Cruz</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, sans-serif; color: #111827; padding: 24px; background: white; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #16a34a; }
    .title { font-size: 22px; font-weight: 800; color: #14532d; }
    .subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .meta { text-align: right; font-size: 12px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f0fdf4; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #4b5563; text-transform: uppercase; letter-spacing: .05em; border-bottom: 1px solid #e5e7eb; }
    td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .no-print { margin-bottom: 16px; }
    @media print {
      .no-print { display: none; }
      body { padding: 12px; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()" style="background:#16a34a;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Imprimir / Salvar PDF</button>
  </div>
  <div class="header">
    <div>
      <div class="title">🎰 Bingão Paróquia Santa Cruz</div>
      <div class="subtitle">Lista de Mesas — Controle de Entrada</div>
    </div>
    <div class="meta">Gerado em ${agora}<br>Total de mesas: ${dados.length}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Mesa</th>
        <th>Comprador</th>
        <th>Telefone</th>
        <th>Local</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>
</body>
</html>`

  const janela = window.open('', '_blank')
  if (janela) {
    janela.document.write(html)
    janela.document.close()
  }
}

export function ListaVendas() {
  const [vendas, setVendas] = useState<MesaVendida[]>([])
  const [loading, setLoading] = useState(true)
  const [ultimaAtualiz, setUltimaAtualiz] = useState<Date | null>(null)
  const [processandoCancelamento, setProcessandoCancelamento] = useState<number | null>(null)

  const carregarVendas = async () => {
    setLoading(true)
    const dados = await getListaVendas()
    setVendas(dados as any)
    setUltimaAtualiz(new Date())
    setLoading(false)
  }

  // Carrega ao montar e recarrega quando o usuário volta para esta aba do navegador
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
      // Remove da lista localmente para resposta imediata da UI
      setVendas(prev => prev.filter(m => m.numero !== numero))
    } else {
      alert(`Erro ao cancelar mesa: ${res.error}`)
    }
    setProcessandoCancelamento(null)
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
          <button className="ghost-btn refresh-btn" onClick={exportarLista} title="Exportar lista de mesas ordenada 1→200 para imprimir na entrada">
            📋 Exportar Lista
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
                const valorMesa = valorTotalVenda > 0 ? (valorTotalVenda / quantidadeMesas) : 50

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

                return (
                  <tr key={mesa.numero}>
                    <td className="col-mesa"><strong>#{mesa.numero}</strong></td>
                    <td>
                      <span className={`status-badge ${mesa.status}`}>
                        {mesa.status === 'vendida' ? '✅ PAGO' : '⏳ RESERVADA'}
                      </span>
                    </td>
                    <td>{comprador?.nome || 'N/A'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {comprador?.telefone || '-'}
                        {linkWhats && (
                          <a 
                            href={linkWhats}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="whatsapp-btn"
                            title="Enviar WhatsApp"
                          >
                            WhatsApp 💬
                          </a>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 'bold', color: '#111827' }}>{formatarMoeda(valorMesa)}</td>
                    <td className="col-data">{formatarData(mesa.reservado_em)}</td>
                    <td style={{textAlign: 'right'}}>
                      <button 
                        onClick={() => handleCancelarMesa(mesa.numero)}
                        disabled={isCanceling}
                        className="cancel-btn"
                        title="Cancelar e liberar esta mesa"
                      >
                        {isCanceling ? '...' : '❌ Cancelar'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
