'use client'
import { useState, useEffect } from 'react'
import { getListaVendas } from '@/app/actions'
import { Loader2 } from 'lucide-react'

type VendaExtrato = {
  mesa: number
  comprador: string
  telefone: string
  data: string
  formaPagamento: string
  valorMesa: number
  areaMissionaria: string
}

export function Dashboard() {
  const [extrato, setExtrato] = useState<VendaExtrato[]>([])
  const [loading, setLoading] = useState(true)
  
  // Resumo
  const [totalGeral, setTotalGeral] = useState(0)
  const [totalPix, setTotalPix] = useState(0)
  const [totalDinheiro, setTotalDinheiro] = useState(0)
  const [totalDebito, setTotalDebito] = useState(0)
  const [totalCredito, setTotalCredito] = useState(0)

  const carregarDados = async () => {
    setLoading(true)
    const data = await getListaVendas()
    
    let extratoTemp: VendaExtrato[] = []
    let tGeral = 0, tPix = 0, tDinheiro = 0, tDebito = 0, tCredito = 0

    if (data) {
      // Primeiro, conta quantas mesas tem em cada venda (para dividir o total da venda)
      const contagemMesasPorVenda: Record<string, number> = {}
      data.forEach((mesa: any) => {
        if (mesa.vendas && mesa.vendas.id) {
          contagemMesasPorVenda[mesa.vendas.id] = (contagemMesasPorVenda[mesa.vendas.id] || 0) + 1
        }
      })

      data.forEach((mesa: any) => {
        if (mesa.status === 'vendida' && mesa.vendas) {
          const forma = mesa.vendas.forma_pagamento || 'pix' // default para antigos
          const comprador = mesa.vendas.compradores
          
          const valorTotalVenda = mesa.vendas.total || 0
          const quantidadeMesas = contagemMesasPorVenda[mesa.vendas.id] || 1
          const VALOR_MESA = valorTotalVenda > 0 ? (valorTotalVenda / quantidadeMesas) : 40 // Fallback para antigas

          extratoTemp.push({
            mesa: mesa.numero,
            comprador: comprador?.nome || 'Desconhecido',
            telefone: comprador?.telefone || '',
            data: mesa.reservado_em,
            formaPagamento: forma,
            valorMesa: VALOR_MESA,
            areaMissionaria: mesa.vendas.area_missionaria || '—'
          })

          tGeral += VALOR_MESA
          if (forma === 'pix') tPix += VALOR_MESA
          if (forma === 'dinheiro') tDinheiro += VALOR_MESA
          if (forma === 'debito') tDebito += VALOR_MESA
          if (forma === 'credito') tCredito += VALOR_MESA
        }
      })
    }

    // Ordenar do mais recente para o mais antigo
    extratoTemp.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

    setExtrato(extratoTemp)
    setTotalGeral(tGeral)
    setTotalPix(tPix)
    setTotalDinheiro(tDinheiro)
    setTotalDebito(tDebito)
    setTotalCredito(tCredito)
    setLoading(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const formatarMoeda = (valor: number) => `R$ ${valor.toFixed(2).replace('.', ',')}`
  const formatarData = (dataStr: string) => {
    if (!dataStr) return '-'
    const d = new Date(dataStr)
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const getFormaBadge = (forma: string) => {
    const map: Record<string, string> = {
      'pix': 'pix',
      'dinheiro': 'dinheiro',
      'debito': 'debito',
      'credito': 'credito'
    }
    const labels: Record<string, string> = {
      'pix': '💜 Pix',
      'dinheiro': '💵 Dinheiro',
      'debito': '💳 Débito',
      'credito': '🔶 Crédito'
    }
    const cls = map[forma] || 'pix'
    return (
      <span className={`forma-badge ${cls}`}>
        {labels[forma] || 'Pix'}
      </span>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="vendas-header">
        <h2 className="dashboard-title">📊 Extrato Financeiro</h2>
        <button className="ghost-btn refresh-btn" onClick={carregarDados}>
          🔄 Atualizar
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#22C55E', display: 'block' }} />
          Carregando extrato...
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card total">
              <span className="icon">💰</span>
              <div className="label">Total Arrecadado</div>
              <div className="value">{formatarMoeda(totalGeral)}</div>
            </div>
            <div className="stat-card pix">
              <span className="icon">💜</span>
              <div className="label">Pix</div>
              <div className="value">{formatarMoeda(totalPix)}</div>
            </div>
            <div className="stat-card dinheiro">
              <span className="icon">💵</span>
              <div className="label">Dinheiro</div>
              <div className="value">{formatarMoeda(totalDinheiro)}</div>
            </div>
            <div className="stat-card debito">
              <span className="icon">💳</span>
              <div className="label">Débito</div>
              <div className="value">{formatarMoeda(totalDebito)}</div>
            </div>
            <div className="stat-card credito">
              <span className="icon">🔶</span>
              <div className="label">Crédito</div>
              <div className="value">{formatarMoeda(totalCredito)}</div>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="vendas-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Mesa</th>
                  <th>Comprador</th>
                  <th>Telefone</th>
                  <th>Área Missionária</th>
                  <th>Forma Pgto.</th>
                  <th>Valor</th>
                  <th>Data/Hora</th>
                </tr>
              </thead>
              <tbody>
                {extrato.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Nenhuma venda confirmada ainda.</td>
                  </tr>
                ) : (
                  extrato.map((v, i) => (
                    <tr key={i}>
                      <td className="col-mesa"><b>{v.mesa.toString().padStart(3, '0')}</b></td>
                      <td>{v.comprador}</td>
                      <td>{v.telefone}</td>
                      <td style={{ fontSize: '12px', color: 'var(--gray-600)' }}>{v.areaMissionaria}</td>
                      <td>{getFormaBadge(v.formaPagamento)}</td>
                      <td style={{ fontWeight: 'bold', color: '#111827' }}>{formatarMoeda(v.valorMesa)}</td>
                      <td className="col-data">{formatarData(v.data)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
