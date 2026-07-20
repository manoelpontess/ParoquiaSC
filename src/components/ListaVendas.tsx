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

function formatarData(iso: string | null) {
  if (!iso) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function ListaVendas() {
  const [vendas, setVendas] = useState<MesaVendida[]>([])
  const [loading, setLoading] = useState(true)
  const [ultimaAtualiz, setUltimaAtualiz] = useState<Date | null>(null)

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

  const mesasVendidas = vendas.filter(v => v.status === 'vendida').length
  const mesasReservadas = vendas.filter(v => v.status === 'reservada').length

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
        <button className="ghost-btn refresh-btn" onClick={carregarVendas} disabled={loading}>
          {loading ? '⏳' : '🔄'} Atualizar
        </button>
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
                <th>Reservado em</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map((mesa) => {
                const comprador = mesa.vendas?.compradores
                
                let linkWhats = ''
                if (comprador?.telefone) {
                  const apenasNumeros = comprador.telefone.replace(/\D/g, '')
                  if (apenasNumeros) {
                    const numFinal = apenasNumeros.length <= 11 ? `55${apenasNumeros}` : apenasNumeros
                    const msg = `Olá ${comprador.nome}, sua compra da mesa ${mesa.numero} no Bingão da Paróquia Santa Cruz foi registrada com sucesso!`
                    linkWhats = `https://wa.me/${numFinal}?text=${encodeURIComponent(msg)}`
                  }
                }

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
                    <td className="col-data">{formatarData(mesa.reservado_em)}</td>
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
