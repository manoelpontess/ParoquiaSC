'use client'
import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { CircleAlert, Copy, Hourglass, LoaderCircle } from 'lucide-react'
import { registrarVenda } from '@/app/actions'
import { gerarPayloadPix } from '@/lib/pix'
import { exibirChavePix, listaMesas, mascaraTelefone, moeda, numMesa } from '@/lib/format'
import { FORMAS_PAGAMENTO, type Config, type FormaPagamento, type Responsavel } from '@/lib/types'
import { COR_FORMA, IconeForma, Modal, useToast } from './ui'

export type VendaConcluida = {
  mesas: number[]
  nome: string
  telefone: string
  responsavel: string
  forma: FormaPagamento | null
  pago: boolean
  total: number
}

type Opcao = FormaPagamento | 'reservar'

export function ModalVenda({
  mesas,
  config,
  responsaveis,
  onFechar,
  onConcluido,
  onIrParaPessoas,
}: {
  mesas: number[]
  config: Config
  responsaveis: Responsavel[]
  onFechar: () => void
  onConcluido: (v: VendaConcluida) => void
  onIrParaPessoas: () => void
}) {
  const toast = useToast()
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [opcao, setOpcao] = useState<Opcao | null>('pix')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const ordenadas = useMemo(() => [...mesas].sort((a, b) => a - b), [mesas])
  const total = ordenadas.length * config.preco_mesa

  const payloadPix = useMemo(() => gerarPayloadPix({
    chave: config.pix_chave,
    nome: config.pix_nome,
    cidade: config.pix_cidade,
    valor: total,
    txid: 'PASSEIO' + ordenadas.map(numMesa).join(''),
  }), [config, total, ordenadas])

  const chave = exibirChavePix(config.pix_chave)

  const copiarPix = async () => {
    try {
      await navigator.clipboard.writeText(payloadPix)
      toast('Código Pix copiado!')
    } catch {
      window.prompt('Copie o código Pix:', payloadPix)
    }
  }

  const confirmar = async () => {
    if (!nome.trim()) return setErro('Informe o nome do comprador.')
    if (!opcao) return setErro('Escolha a forma de pagamento.')

    setErro('')
    setSalvando(true)
    const pago = opcao !== 'reservar'
    const forma = pago ? 'pix' : null

    const res = await registrarVenda({
      mesas: ordenadas,
      nome: nome.trim(),
      telefone,
      responsavel,
      formaPagamento: forma,
      pago,
    })
    setSalvando(false)

    if (!res.ok) return setErro(res.error)
    onConcluido({ mesas: ordenadas, nome: nome.trim(), telefone, responsavel, forma, pago, total })
  }

  return (
    <Modal
      aberto
      onFechar={() => !salvando && onFechar()}
      titulo="Nova venda"
      subtitulo="Preencha os dados do comprador e pagamento via Pix"
      rodape={
        <>
          <button className="btn btn-secondary" onClick={onFechar} disabled={salvando}>Voltar</button>
          <button
            id="confirmar-venda"
            className={opcao === 'reservar' ? 'btn btn-primary' : 'btn btn-success'}
            onClick={confirmar}
            disabled={salvando}
          >
            {salvando && <LoaderCircle size={18} className="spin" />}
            {salvando ? 'Salvando...' : opcao === 'reservar' ? 'Reservar mesas' : 'Confirmar recebimento Pix'}
          </button>
        </>
      }
    >
      <div className="summary-box">
        <div style={{ minWidth: 0 }}>
          <div className="mesa-chips">
            {ordenadas.map(n => <span key={n} className="mesa-chip">{numMesa(n)}</span>)}
          </div>
          <div className="summary-meta">
            {ordenadas.length} × {moeda(config.preco_mesa)}
          </div>
        </div>
        <div className="summary-total">{moeda(total)}</div>
      </div>

      <div className="field">
        <label className="label" htmlFor="venda-nome">Nome do comprador</label>
        <input
          id="venda-nome"
          className="input"
          placeholder="Ex.: Maria da Silva"
          value={nome}
          autoFocus
          autoComplete="off"
          onChange={e => { setNome(e.target.value); setErro('') }}
        />
      </div>

      <div className="form-grid" style={{ marginTop: 14 }}>
        <div className="field">
          <label className="label" htmlFor="venda-telefone">Telefone <span className="opt">(opcional)</span></label>
          <input
            id="venda-telefone"
            className="input"
            type="tel"
            inputMode="tel"
            placeholder="(92) 90000-0000"
            value={telefone}
            onChange={e => setTelefone(mascaraTelefone(e.target.value))}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="venda-responsavel">Responsável <span className="opt">(opcional)</span></label>
          <select
            id="venda-responsavel"
            className="select"
            value={responsavel}
            onChange={e => setResponsavel(e.target.value)}
          >
            <option value="">{responsaveis.length ? 'Selecione...' : 'Nenhuma pessoa cadastrada'}</option>
            {responsaveis.map(r => <option key={r.id} value={r.nome}>{r.nome}</option>)}
          </select>
          {responsaveis.length === 0 && (
            <span className="hint">
              Cadastre em <button type="button" className="link-btn" onClick={onIrParaPessoas}>Configurações → Pessoas</button>
            </span>
          )}
        </div>
      </div>

      <div className="divider-label">Pagamento (Apenas Pix)</div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          id="pagar-pix"
          type="button"
          className={`pay-opt ${opcao === 'pix' ? 'active' : ''}`}
          style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', padding: '12px', ['--c' as string]: COR_FORMA['pix'] }}
          onClick={() => { setOpcao('pix'); setErro('') }}
        >
          <IconeForma forma="pix" size={20} />
          Pagar via Pix
        </button>
        <button
          id="pagar-reservar"
          type="button"
          className={`pay-opt ${opcao === 'reservar' ? 'active' : ''}`}
          style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', padding: '12px', ['--c' as string]: 'var(--amber)' }}
          onClick={() => { setOpcao('reservar'); setErro('') }}
        >
          <Hourglass size={20} />
          Pagar depois (Reserva)
        </button>
      </div>

      {opcao === 'pix' && (
        <div className="pix-card">
          <div className="pix-qr">
            <QRCodeSVG value={payloadPix} size={148} level="M" />
          </div>
          <div className="pix-info">
            <div className="pix-label">Chave Pix · {chave.tipo}</div>
            <div className="pix-key">{chave.valor}</div>
            <div className="pix-name">{config.pix_nome} · {moeda(total)}</div>
            <button className="btn btn-secondary btn-sm" onClick={copiarPix} id="copiar-pix" type="button">
              <Copy size={15} /> Copiar Pix copia e cola
            </button>
          </div>
        </div>
      )}

      {opcao === 'reservar' && (
        <div className="note-box amber">
          <Hourglass size={18} />
          <span>As mesas {listaMesas(ordenadas)} ficarão <b>reservadas</b>. O pagamento deverá ser feito via <b>Pix</b> posteriormente.</span>
        </div>
      )}

      {erro && <div className="form-error"><CircleAlert size={16} />{erro}</div>}
      <div style={{ height: 8 }} />
    </Modal>
  )
}
