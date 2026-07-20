'use client'

import { useState } from 'react'
import { MapaMesas } from '@/components/MapaMesas'
import { ModalComprador } from '@/components/ModalComprador'
import { ModalPix } from '@/components/ModalPix'
import { ListaVendas } from '@/components/ListaVendas'
import { useMesasRealtime, Mesa } from '@/hooks/useMesasRealtime'
import { createClient } from '@/lib/supabase/client'
import { gerarPayloadPix } from '@/lib/pix'

const fallbackMesas: Mesa[] = Array.from({ length: 200 }, (_, i) => {
  const n = i + 1
  return {
    numero: n,
    setor: n > 140 ? 'A' : n > 80 ? 'B' : n > 40 ? 'C' : 'D',
    preco: 50,
    status: 'livre',
  }
})

export default function Home() {
  const [activeTab, setActiveTab] = useState<'mapa' | 'lista'>('mapa')
  const mesas = useMesasRealtime(fallbackMesas) 
  
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set())
  const [preco, setPreco] = useState(50)
  const [recebedorNome, setRecebedorNome] = useState('Paroquia Santa Cruz')
  const [recebedorCidade, setRecebedorCidade] = useState('Manaus')

  const [modalCompradorOpen, setModalCompradorOpen] = useState(false)
  const [modalPixOpen, setModalPixOpen] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const [compradorAtual, setCompradorAtual] = useState({ nome: '', telefone: '' })
  const [vendaAtual, setVendaAtual] = useState<{ id: string, total: number } | null>(null)
  const [payloadPix, setPayloadPix] = useState('')

  const total = selecionadas.size * preco

  const listaMesasTexto = () => {
    return Array.from(selecionadas).sort((a, b) => a - b).join(', ')
  }

  const toggleMesa = (num: number) => {
    const novaSelecionadas = new Set(selecionadas)
    if (novaSelecionadas.has(num)) {
      novaSelecionadas.delete(num)
    } else {
      novaSelecionadas.add(num)
    }
    setSelecionadas(novaSelecionadas)
  }

  const handleAvançar = () => {
    if (selecionadas.size === 0) return
    setModalCompradorOpen(true)
  }

  const handleCompradorContinue = async (nome: string, telefone: string) => {
    setCompradorAtual({ nome, telefone })
    setModalCompradorOpen(false)

    const supabase = createClient()
    const mesasArray = Array.from(selecionadas)
    
    // Tratando local/fallback para caso as env vars do supabase não existam ainda
    let venda_id = crypto.randomUUID()
    let valor_final = total

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { data, error } = await supabase.rpc('reservar_mesas', {
        p_mesa_numeros: mesasArray,
        p_nome: nome,
        p_telefone: telefone,
      })
      if (error) {
        console.error(error)
        alert('Ocorreu um erro ao tentar reservar as mesas (Supabase). Usando modo fallback local.')
      } else {
        venda_id = data.venda_id
        valor_final = data.total
      }
    }

    setVendaAtual({ id: venda_id, total: valor_final })
    
    const pix = gerarPayloadPix({
      chave: '04026811002590',
      nome: recebedorNome || 'Paroquia Santa Cruz',
      cidade: recebedorCidade || 'Manaus',
      valor: valor_final,
      txid: 'BINGAOSC' + venda_id.slice(0, 8).toUpperCase(),
    })
    
    setPayloadPix(pix)
    setModalPixOpen(true)
  }

  const handleConfirmarPagamento = async () => {
    if (!vendaAtual) return
    setIsConfirming(true)

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = createClient()
      const { error } = await supabase.rpc('confirmar_pagamento', {
        p_venda_id: vendaAtual.id
      })
      if (error) console.error(error)
    }

    setIsConfirming(false)
    setSelecionadas(new Set())
    setModalPixOpen(false)
    alert('Venda registrada com sucesso!\n\n(Em produção, o comprovante seria impresso e a mesa marcada como vendida no banco de dados para todos os vendedores em tempo real.)')
  }

  return (
    <>
      <header>
        <h1>Bingão Paróquia Santa Cruz</h1>
        <div className="subtitle">Gestão de Mesas e Reservas</div>
        
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'mapa' ? 'active' : ''}`}
            onClick={() => setActiveTab('mapa')}
          >
            Mapa de Mesas
          </button>
          <button 
            className={`tab-btn ${activeTab === 'lista' ? 'active' : ''}`}
            onClick={() => setActiveTab('lista')}
          >
            Lista de Vendas
          </button>
        </div>

        {activeTab === 'mapa' && (
          <div className="legend">
            <span><span className="dot" style={{ background: '#EFF6EE', border: '1px solid var(--green-line)' }}></span>Livre</span>
            <span><span className="dot" style={{ background: 'var(--amber)' }}></span>Selecionada</span>
            <span><span className="dot" style={{ background: 'var(--sold)' }}></span>Vendida/Reservada</span>
            <div className="config-row">
              <span>
                <label htmlFor="preco">Valor/mesa (R$)</label>{' '}
                <input type="number" id="preco" value={preco} onChange={e => setPreco(Number(e.target.value))} min="0" step="5" />
              </span>
              <span>
                <label htmlFor="recebedorNome">Recebedor Pix</label>{' '}
                <input type="text" id="recebedorNome" value={recebedorNome} onChange={e => setRecebedorNome(e.target.value)} />
              </span>
              <span>
                <label htmlFor="recebedorCidade">Cidade</label>{' '}
                <input type="text" id="recebedorCidade" value={recebedorCidade} onChange={e => setRecebedorCidade(e.target.value)} />
              </span>
            </div>
          </div>
        )}
      </header>

      {activeTab === 'mapa' ? (
        <>
          <MapaMesas mesas={mesas} selecionadas={selecionadas} onToggleMesa={toggleMesa} />

          <div className="summary-bar">
            <div className="summary-text" id="summary">
              {selecionadas.size === 0 ? (
                'Nenhuma mesa selecionada'
              ) : (
                <>
                  <b>{selecionadas.size} mesa(s)</b> selecionada(s): {listaMesasTexto()}
                  {' '}&nbsp;·&nbsp; Total: <b>R$ {total.toFixed(2).replace('.', ',')}</b>
                </>
              )}
            </div>
            <button className="primary-btn" disabled={selecionadas.size === 0} onClick={handleAvançar}>
              Avançar
            </button>
          </div>

          <ModalComprador
            isOpen={modalCompradorOpen}
            onClose={() => setModalCompradorOpen(false)}
            onContinue={handleCompradorContinue}
            resumoMesas={`${selecionadas.size} mesa(s): ${listaMesasTexto()} — Total R$ ${total.toFixed(2).replace('.', ',')}`}
          />

          <ModalPix
            isOpen={modalPixOpen}
            onClose={() => {
              setModalPixOpen(false)
              setModalCompradorOpen(true)
            }}
            onConfirm={handleConfirmarPagamento}
            resumoMesas={`${compradorAtual.nome} — ${selecionadas.size} mesa(s): ${listaMesasTexto()}`}
            total={vendaAtual?.total || total}
            payloadPix={payloadPix}
            isLoading={isConfirming}
          />
        </>
      ) : (
        <ListaVendas />
      )}
    </>
  )
}
