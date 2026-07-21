'use client'

import { useState } from 'react'
import { MapaMesas } from '@/components/MapaMesas'
import { ModalComprador } from '@/components/ModalComprador'
import { ModalPagamento } from '@/components/ModalPagamento'
import { ModalSucesso } from '@/components/ModalSucesso'
import { ListaVendas } from '@/components/ListaVendas'
import { Configuracoes } from '@/components/Configuracoes'
import { Dashboard } from '@/components/Dashboard'
import { useMesasRealtime, Mesa } from '@/hooks/useMesasRealtime'
import { createClient } from '@/lib/supabase/client'
import { gerarPayloadPix } from '@/lib/pix'
import { formatWhatsAppNumber } from '@/lib/whatsapp'
import { OPENWA_URL, OPENWA_KEY, OPENWA_SESSION } from '@/lib/openwa'
import { atualizarVenda } from '@/app/actions'

// Fallback: todas livres — será substituído pelos dados reais do banco no hook
const fallbackMesas: Mesa[] = Array.from({ length: 200 }, (_, i) => {
  const n = i + 1
  return {
    numero: n,
    setor: n > 140 ? 'A' : n > 80 ? 'B' : n > 40 ? 'C' : 'D',
    preco: 40,
    status: 'livre',
  }
})

export default function Home() {
  const [activeTab, setActiveTab] = useState<'mapa' | 'lista' | 'config' | 'dashboard'>('mapa')
  const mesas = useMesasRealtime(fallbackMesas)

  const mesasLivres = mesas.filter(m => m.status === 'livre').length

  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set())
  const [preco, setPreco] = useState(40)
  const [recebedorNome, setRecebedorNome] = useState('Paroquia Santa Cruz')
  const [recebedorCidade, setRecebedorCidade] = useState('Manaus')

  const [modalCompradorOpen, setModalCompradorOpen] = useState(false)
  const [modalPagamentoOpen, setModalPagamentoOpen] = useState(false)
  const [modalSucessoOpen, setModalSucessoOpen] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [erroReserva, setErroReserva] = useState('')

  const [compradorAtual, setCompradorAtual] = useState({ nome: '', telefone: '', areaMissionaria: '' })
  const [vendaAtual, setVendaAtual] = useState<{ id: string, total: number, mesas: number[] } | null>(null)
  const [payloadPix, setPayloadPix] = useState('')

  const total = selecionadas.size * preco

  const listaMesasTexto = () =>
    Array.from(selecionadas).sort((a, b) => a - b).join(', ')

  const toggleMesa = (num: number) => {
    setSelecionadas(prev => {
      const next = new Set(prev)
      next.has(num) ? next.delete(num) : next.add(num)
      return next
    })
  }

  const handleAvançar = () => {
    if (selecionadas.size === 0) return
    setErroReserva('')
    setModalCompradorOpen(true)
  }

  const handleCompradorContinue = async (nome: string, telefone: string, areaMissionaria: string) => {
    setCompradorAtual({ nome, telefone, areaMissionaria })
    
    const supabase = createClient()
    const mesasArray = Array.from(selecionadas)

    try {
      const { data, error } = await supabase.rpc('reservar_mesas', {
        p_mesa_numeros: mesasArray,
        p_nome: nome,
        p_telefone: telefone,
      })

      if (error) throw error

      setVendaAtual({ id: data.venda_id, total: total, mesas: mesasArray })

      let txidMesas = ''
      if (mesasArray.length === 1) {
        txidMesas = 'MESA' + mesasArray[0].toString().padStart(2, '0')
      } else {
        const nums = mesasArray.sort((a,b)=>a-b).map(m => m.toString().padStart(2, '0')).join('')
        txidMesas = 'M' + nums.slice(0, 15)
      }

      const pix = gerarPayloadPix({
        chave: '04026811002590',
        nome: recebedorNome || 'Paroquia Santa Cruz',
        cidade: recebedorCidade || 'Manaus',
        valor: total,
        txid: 'BINGAOSC' + txidMesas,
      })

      setPayloadPix(pix)
      setModalCompradorOpen(false)
      setModalPagamentoOpen(true)
    } catch (err: any) {
      setErroReserva(`Erro ao reservar: ${err.message}`)
    }
  }

  const handleConfirmarPagamento = async (formaPagamento: string) => {
    if (!vendaAtual) return
    setIsConfirming(true)

    const supabase = createClient()
    await supabase.rpc('confirmar_pagamento', { p_venda_id: vendaAtual.id })
    await atualizarVenda(vendaAtual.id, formaPagamento, vendaAtual.total, compradorAtual.areaMissionaria)

    try {
      if (OPENWA_URL && compradorAtual.telefone) {
        const numeroFinal = formatWhatsAppNumber(compradorAtual.telefone)
        if (numeroFinal) {
          const mesasStr = vendaAtual.mesas.join(', ')
          const msg = `Olá ${compradorAtual.nome}, o pagamento da mesa ${mesasStr} no Bingão da Paróquia Santa Cruz foi confirmado com sucesso! 🎉`

          const baseURL = OPENWA_URL.replace(/\/$/, '')
          const resList = await fetch(`${baseURL}/api/sessions`, {
            headers: { 'x-api-key': OPENWA_KEY || '' }
          })
          if (resList.ok) {
            const sessions = await resList.json()
            const sessionData = sessions.find((s: any) => s.name === OPENWA_SESSION)
            
            if (sessionData && sessionData.id) {
              await fetch(`${baseURL}/api/sessions/${sessionData.id}/messages/send-text`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': OPENWA_KEY || ''
                },
                body: JSON.stringify({
                  chatId: `${numeroFinal}@c.us`,
                  text: msg
                })
              })
            }
          }
        }
      }
    } catch (e) {
      console.error('Erro ao notificar OpenWA:', e)
    }

    setIsConfirming(false)
    setModalPagamentoOpen(false)
    setModalSucessoOpen(true)
  }

  const handleFecharSucesso = () => {
    setSelecionadas(new Set())
    setVendaAtual(null)
    setCompradorAtual({ nome: '', telefone: '', areaMissionaria: '' })
    setModalSucessoOpen(false)
  }

  return (
    <>
      <header>
        <div className="header-top">
          <div>
            <h1>Bingão Paróquia Santa Cruz</h1>
            <div className="subtitle">Gestão de Mesas e Reservas</div>
          </div>
          <div className="mesas-counter">
            <span className="counter-num">{mesasLivres}</span>
            <span className="counter-label">de 200 livres</span>
          </div>
        </div>

        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === 'mapa' ? 'active' : ''}`}
            onClick={() => setActiveTab('mapa')}
          >
            🗺️ Mapa de Mesas
          </button>
          <button
            className={`tab-btn ${activeTab === 'lista' ? 'active' : ''}`}
            onClick={() => setActiveTab('lista')}
          >
            📋 Lista de Vendas
          </button>
          <button
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Extrato
          </button>
          <button
            className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            ⚙️ Configurações
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

      {activeTab === 'mapa' && (
        <>
          <MapaMesas mesas={mesas} selecionadas={selecionadas} onToggleMesa={toggleMesa} />

          <div className="summary-bar">
            <div className="summary-text" id="summary">
              {erroReserva ? (
                <span className="erro-inline">⚠️ {erroReserva}</span>
              ) : selecionadas.size === 0 ? (
                'Nenhuma mesa selecionada'
              ) : (
                <>
                  <b>{selecionadas.size} mesa(s)</b> selecionada(s): {listaMesasTexto()}
                  {' '}&nbsp;·&nbsp; Total: <b>R$ {total.toFixed(2).replace('.', ',')}</b>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {selecionadas.size > 0 && (
                <button className="ghost-btn" onClick={() => setSelecionadas(new Set())}>
                  Limpar
                </button>
              )}
              <button className="primary-btn" disabled={selecionadas.size === 0} onClick={handleAvançar}>
                Avançar
              </button>
            </div>
          </div>

          <ModalComprador
            isOpen={modalCompradorOpen}
            onClose={() => setModalCompradorOpen(false)}
            onContinue={handleCompradorContinue}
            resumoMesas={`${selecionadas.size} mesa(s): ${listaMesasTexto()} — Total R$ ${total.toFixed(2).replace('.', ',')}`}
          />

          <ModalPagamento
            isOpen={modalPagamentoOpen}
            onClose={() => {
              setModalPagamentoOpen(false)
              setModalCompradorOpen(true)
            }}
            onConfirm={handleConfirmarPagamento}
            resumoMesas={`${compradorAtual.nome} — ${selecionadas.size} mesa(s): ${listaMesasTexto()}`}
            total={vendaAtual?.total || total}
            payloadPix={payloadPix}
            isLoading={isConfirming}
          />

          <ModalSucesso
            isOpen={modalSucessoOpen}
            onClose={handleFecharSucesso}
            mesas={vendaAtual?.mesas || []}
            comprador={compradorAtual.nome}
            total={vendaAtual?.total || 0}
          />
        </>
      )}

      {activeTab === 'lista' && (
        <ListaVendas />
      )}

      {activeTab === 'dashboard' && (
        <Dashboard />
      )}

      {activeTab === 'config' && (
        <Configuracoes />
      )}
    </>
  )
}
