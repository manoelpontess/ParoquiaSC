'use client'

import { useState } from 'react'
import {
  ChartPie,
  CircleAlert,
  LayoutGrid,
  List,
  LoaderCircle,
  Settings,
} from 'lucide-react'
import { usePainel } from '@/hooks/usePainel'
import { Hero } from '@/components/Hero'
import { GradeMesas } from '@/components/GradeMesas'
import { TabelaVendas } from '@/components/TabelaVendas'
import { Financeiro } from '@/components/Financeiro'
import { Configuracoes } from '@/components/Configuracoes'
import { ModalVenda, type VendaConcluida } from '@/components/ModalVenda'
import { ModalMesa } from '@/components/ModalMesa'
import { ModalSucesso } from '@/components/ModalSucesso'
import { ToastProvider } from '@/components/ui'
import type { Mesa } from '@/lib/types'

type AbaPrincipal = 'mesas' | 'vendas' | 'financeiro' | 'config'

export default function Home() {
  const {
    mesas,
    config,
    responsaveis,
    erro,
    carregando,
    recarregarMesas,
    recarregarConfig,
    recarregarResponsaveis,
  } = usePainel()

  const [aba, setAba] = useState<AbaPrincipal>('mesas')
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set())

  // Modais
  const [modalVendaAberto, setModalVendaAberto] = useState(false)
  const [mesaSelecionadaDetalhe, setMesaSelecionadaDetalhe] = useState<Mesa | null>(null)
  const [vendaSucesso, setVendaSucesso] = useState<VendaConcluida | null>(null)
  const [abaConfigInicial, setAbaConfigInicial] = useState<'geral' | 'pessoas'>('geral')

  const toggleMesa = (num: number) => {
    setSelecionadas(prev => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  const limparSelecao = () => setSelecionadas(new Set())

  const handleAbrirMesa = (num: number) => {
    const encontrada = mesas.find(m => m.numero === num)
    if (encontrada && encontrada.status !== 'livre') {
      setMesaSelecionadaDetalhe(encontrada)
    }
  }

  const handleVendaConcluida = (venda: VendaConcluida) => {
    setModalVendaAberto(false)
    limparSelecao()
    setVendaSucesso(venda)
    recarregarMesas()
  }

  const handleIrParaPessoas = () => {
    setModalVendaAberto(false)
    setAbaConfigInicial('pessoas')
    setAba('config')
  }

  return (
    <ToastProvider>
      <main className="app">
        {/* Cabeçalho do evento com estatísticas e anel de ocupação */}
        <Hero mesas={mesas} />

        {/* Alerta de erro de banco de dados, se houver */}
        {erro && (
          <div className="banner" style={{ marginTop: 16 }}>
            <CircleAlert size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Atenção:</strong> {erro}
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
                Para configurar o novo banco de dados no Supabase, execute o script disponível em{' '}
                <code>supabase/schema.sql</code> no SQL Editor do seu projeto Supabase.
              </div>
            </div>
          </div>
        )}

        {/* Navegação por abas em pílula moderna */}
        <div className="nav-wrap">
          <nav className="nav" role="tablist" aria-label="Abas principais">
            <button
              id="tab-mesas"
              role="tab"
              aria-selected={aba === 'mesas'}
              className={`nav-btn ${aba === 'mesas' ? 'active' : ''}`}
              onClick={() => setAba('mesas')}
            >
              <LayoutGrid size={17} /> Mesas
            </button>
            <button
              id="tab-vendas"
              role="tab"
              aria-selected={aba === 'vendas'}
              className={`nav-btn ${aba === 'vendas' ? 'active' : ''}`}
              onClick={() => setAba('vendas')}
            >
              <List size={17} /> Vendas
            </button>
            <button
              id="tab-financeiro"
              role="tab"
              aria-selected={aba === 'financeiro'}
              className={`nav-btn ${aba === 'financeiro' ? 'active' : ''}`}
              onClick={() => setAba('financeiro')}
            >
              <ChartPie size={17} /> Extrato
            </button>
            <button
              id="tab-config"
              role="tab"
              aria-selected={aba === 'config'}
              className={`nav-btn ${aba === 'config' ? 'active' : ''}`}
              onClick={() => {
                setAbaConfigInicial('geral')
                setAba('config')
              }}
            >
              <Settings size={17} /> Configurações
            </button>
          </nav>
        </div>

        {/* Conteúdo das abas */}
        {aba === 'mesas' && (
          <GradeMesas
            mesas={mesas}
            selecionadas={selecionadas}
            preco={config.preco_mesa}
            onToggle={toggleMesa}
            onLimpar={limparSelecao}
            onVender={() => setModalVendaAberto(true)}
            onAbrirMesa={handleAbrirMesa}
          />
        )}

        {aba === 'vendas' && (
          <TabelaVendas
            mesas={mesas}
            responsaveis={responsaveis}
            onRecarregar={recarregarMesas}
            onAbrirMesa={handleAbrirMesa}
          />
        )}

        {aba === 'financeiro' && <Financeiro mesas={mesas} />}

        {aba === 'config' && (
          <Configuracoes
            config={config}
            responsaveis={responsaveis}
            onRecarregarConfig={recarregarConfig}
            onRecarregarResponsaveis={recarregarResponsaveis}
            abaInicial={abaConfigInicial}
          />
        )}

        {/* Modal de checkout / venda */}
        {modalVendaAberto && selecionadas.size > 0 && (
          <ModalVenda
            mesas={Array.from(selecionadas)}
            config={config}
            responsaveis={responsaveis}
            onFechar={() => setModalVendaAberto(false)}
            onConcluido={handleVendaConcluida}
            onIrParaPessoas={handleIrParaPessoas}
          />
        )}

        {/* Modal de detalhes da mesa ocupada */}
        {mesaSelecionadaDetalhe && (
          <ModalMesa
            mesa={mesaSelecionadaDetalhe}
            responsaveis={responsaveis}
            onFechar={() => setMesaSelecionadaDetalhe(null)}
            onAtualizado={() => {
              recarregarMesas()
              setMesaSelecionadaDetalhe(null)
            }}
          />
        )}

        {/* Modal de confirmação de sucesso com recibo */}
        {vendaSucesso && (
          <ModalSucesso
            venda={vendaSucesso}
            onFechar={() => setVendaSucesso(null)}
          />
        )}

        <footer className="footer">
          Passeio Paroquial — Manaus, AM
        </footer>
      </main>
    </ToastProvider>
  )
}
