'use client'
import { useEffect, useState } from 'react'
import { getListaVendas } from '@/app/actions'

export type MesaVendida = {
  numero: number
  status: string
  reservado_em: string | null
  vendas: {
    status: string
    compradores: {
      nome: string
      telefone: string | null
    }
  } | null
}

export function ListaVendas() {
  const [vendas, setVendas] = useState<MesaVendida[]>([])
  const [loading, setLoading] = useState(true)

  const carregarVendas = async () => {
    setLoading(true)
    const dados = await getListaVendas()
    setVendas(dados as any)
    setLoading(false)
  }

  useEffect(() => {
    carregarVendas()
  }, [])

  if (loading) {
    return <div className="lista-vendas-container"><div className="loading-state">Carregando lista de vendas...</div></div>
  }

  if (vendas.length === 0) {
    return (
      <div className="lista-vendas-container">
        <div className="empty-state">Nenhuma mesa foi vendida ou reservada ainda.</div>
      </div>
    )
  }

  return (
    <div className="lista-vendas-container">
      <div className="vendas-header">
        <h2>Mesas Vendidas/Reservadas ({vendas.length})</h2>
        <button className="ghost-btn refresh-btn" onClick={carregarVendas}>Atualizar Lista</button>
      </div>
      
      <div className="table-wrapper">
        <table className="vendas-table">
          <thead>
            <tr>
              <th>Mesa</th>
              <th>Status</th>
              <th>Comprador</th>
              <th>Telefone</th>
            </tr>
          </thead>
          <tbody>
            {vendas.map((mesa) => {
              const comprador = mesa.vendas?.compradores
              return (
                <tr key={mesa.numero}>
                  <td className="col-mesa"><strong>{mesa.numero}</strong></td>
                  <td>
                    <span className={`status-badge ${mesa.status}`}>
                      {mesa.status.toUpperCase()}
                    </span>
                  </td>
                  <td>{comprador?.nome || 'N/A'}</td>
                  <td>{comprador?.telefone || '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
