'use client'
import { useState } from 'react'
import {
  CircleAlert,
  Coins,
  LoaderCircle,
  Plus,
  QrCode,
  Save,
  Trash2,
  User,
  Users,
} from 'lucide-react'
import {
  adicionarResponsavel,
  removerResponsavel,
  salvarConfig,
} from '@/app/actions'
import { formatarCPF } from '@/lib/format'
import type { Config, Responsavel } from '@/lib/types'
import { BotaoConfirmar, useToast } from './ui'

type AbaConfig = 'geral' | 'pessoas'

export function Configuracoes({
  config,
  responsaveis,
  onRecarregarConfig,
  onRecarregarResponsaveis,
  abaInicial = 'geral',
}: {
  config: Config
  responsaveis: Responsavel[]
  onRecarregarConfig: () => void
  onRecarregarResponsaveis: () => void
  abaInicial?: AbaConfig
}) {
  const toast = useToast()
  const [aba, setAba] = useState<AbaConfig>(abaInicial)

  // Formulário Geral
  const [precoMesa, setPrecoMesa] = useState(String(config.preco_mesa))
  const [pixChave, setPixChave] = useState(config.pix_chave)
  const [pixNome, setPixNome] = useState(config.pix_nome)
  const [pixCidade, setPixCidade] = useState(config.pix_cidade)
  const [salvandoGeral, setSalvandoGeral] = useState(false)
  const [erroGeral, setErroGeral] = useState('')

  // Formulário Pessoas
  const [novoNome, setNovoNome] = useState('')
  const [adicionandoPessoa, setAdicionandoPessoa] = useState(false)
  const [erroPessoa, setErroPessoa] = useState('')

  const handleSalvarGeral = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroGeral('')
    const valorNum = parseFloat(precoMesa.replace(',', '.'))
    if (isNaN(valorNum) || valorNum < 0) {
      setErroGeral('Informe um valor de mesa válido.')
      return
    }
    if (!pixChave.trim()) {
      setErroGeral('A chave Pix é obrigatória.')
      return
    }

    setSalvandoGeral(true)
    const res = await salvarConfig({
      preco_mesa: valorNum,
      pix_chave: pixChave.trim(),
      pix_nome: pixNome.trim() || 'Paróquia Santa Cruz',
      pix_cidade: pixCidade.trim() || 'Manaus',
    })
    setSalvandoGeral(false)

    if (res.ok) {
      toast('Configurações salvas com sucesso!')
      onRecarregarConfig()
    } else {
      setErroGeral(res.error)
    }
  }

  const handleAdicionarPessoa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNome.trim()) {
      setErroPessoa('Digite o nome da pessoa.')
      return
    }
    setErroPessoa('')
    setAdicionandoPessoa(true)
    const res = await adicionarResponsavel(novoNome.trim())
    setAdicionandoPessoa(false)

    if (res.ok) {
      toast(`${novoNome.trim()} cadastrado(a)!`)
      setNovoNome('')
      onRecarregarResponsaveis()
    } else {
      setErroPessoa(res.error)
    }
  }

  const handleRemoverPessoa = async (id: string, nome: string) => {
    const res = await removerResponsavel(id)
    if (res.ok) {
      toast(`${nome} removido(a)!`)
      onRecarregarResponsaveis()
    } else {
      toast(res.error, 'error')
    }
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <h2 className="section-title">Configurações</h2>
          <div className="section-sub">Ajustes gerais do sistema e cadastro de pessoas</div>
        </div>
      </div>

      <div className="config-layout">
        {/* Sub-navegação lateral */}
        <div className="card subnav">
          <button
            type="button"
            className={`subnav-btn ${aba === 'geral' ? 'active' : ''}`}
            onClick={() => setAba('geral')}
          >
            <QrCode size={18} /> Geral & Pix
          </button>
          <button
            type="button"
            className={`subnav-btn ${aba === 'pessoas' ? 'active' : ''}`}
            onClick={() => setAba('pessoas')}
          >
            <Users size={18} /> Pessoas ({responsaveis.length})
          </button>
        </div>

        {/* Painel do conteúdo */}
        <div className="card config-panel">
          {aba === 'geral' && (
            <form onSubmit={handleSalvarGeral}>
              <div className="config-panel-head">
                <h3 className="config-panel-title">Geral & Pagamentos</h3>
                <p className="hint">
                  Defina o valor cobrado por mesa e a chave Pix para geração dos QR Codes.
                </p>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label className="label" htmlFor="cfg-preco">
                    Valor por Mesa (R$)
                  </label>
                  <div className="input-prefix">
                    <span>R$</span>
                    <input
                      id="cfg-preco"
                      className="input"
                      type="number"
                      step="0.50"
                      min="0"
                      value={precoMesa}
                      onChange={e => setPrecoMesa(e.target.value)}
                      placeholder="15,00"
                      required
                    />
                  </div>
                  <span className="hint">Padrão definido: R$ 15,00</span>
                </div>

                <div className="field">
                  <label className="label" htmlFor="cfg-chave">
                    Chave Pix (CPF)
                  </label>
                  <input
                    id="cfg-chave"
                    className="input"
                    value={pixChave}
                    onChange={e => setPixChave(e.target.value)}
                    placeholder="445.390.022-87"
                    required
                  />
                  <span className="hint">CPF configurado: 445.390.022-87</span>
                </div>

                <div className="field">
                  <label className="label" htmlFor="cfg-nome">
                    Nome do Recebedor Pix
                  </label>
                  <input
                    id="cfg-nome"
                    className="input"
                    value={pixNome}
                    onChange={e => setPixNome(e.target.value)}
                    placeholder="Paróquia Santa Cruz"
                  />
                </div>

                <div className="field">
                  <label className="label" htmlFor="cfg-cidade">
                    Cidade
                  </label>
                  <input
                    id="cfg-cidade"
                    className="input"
                    value={pixCidade}
                    onChange={e => setPixCidade(e.target.value)}
                    placeholder="Manaus"
                  />
                </div>
              </div>

              {erroGeral && (
                <div className="form-error">
                  <CircleAlert size={16} /> {erroGeral}
                </div>
              )}

              <div className="save-bar">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={salvandoGeral}
                  id="salvar-config-btn"
                >
                  {salvandoGeral && <LoaderCircle size={16} className="spin" />}
                  <Save size={16} /> Salvar Configurações
                </button>
              </div>
            </form>
          )}

          {aba === 'pessoas' && (
            <div>
              <div className="config-panel-head">
                <h3 className="config-panel-title">Pessoas / Responsáveis</h3>
                <p className="hint">
                  Cadastre as pessoas autorizadas a vender ou responsáveis pelas mesas. Ao registrar uma
                  venda, você poderá atribuir a mesa a uma pessoa cadastrada aqui.
                </p>
              </div>

              <form onSubmit={handleAdicionarPessoa} className="add-row">
                <input
                  id="novo-responsavel"
                  className="input"
                  placeholder="Nome da pessoa (Ex.: João Silva, Pastoral Familiar...)"
                  value={novoNome}
                  onChange={e => {
                    setNovoNome(e.target.value)
                    setErroPessoa('')
                  }}
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={adicionandoPessoa || !novoNome.trim()}
                  id="adicionar-pessoa-btn"
                >
                  {adicionandoPessoa && <LoaderCircle size={16} className="spin" />}
                  <Plus size={16} /> Adicionar
                </button>
              </form>

              {erroPessoa && (
                <div className="form-error" style={{ marginTop: 10 }}>
                  <CircleAlert size={16} /> {erroPessoa}
                </div>
              )}

              <div className="divider-label" style={{ marginTop: 24 }}>
                Pessoas Cadastradas ({responsaveis.length})
              </div>

              {responsaveis.length === 0 ? (
                <div className="empty" style={{ padding: '32px 0' }}>
                  <div className="empty-icon">
                    <User size={24} />
                  </div>
                  <h3>Nenhuma pessoa cadastrada</h3>
                  <p>Adicione acima os nomes das pessoas responsáveis pela venda de mesas.</p>
                </div>
              ) : (
                <div className="people">
                  {responsaveis.map(p => (
                    <div key={p.id} className="person">
                      <div className="person-name">{p.nome}</div>
                      <BotaoConfirmar
                        className="icon-btn danger"
                        confirmar={<Trash2 size={14} />}
                        onConfirmar={() => handleRemoverPessoa(p.id, p.nome)}
                      >
                        <Trash2 size={16} />
                      </BotaoConfirmar>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
