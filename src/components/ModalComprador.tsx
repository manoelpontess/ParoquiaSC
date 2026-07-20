'use client'
import { useEffect, useState } from 'react'

type Props = {
  isOpen: boolean
  onClose: () => void
  onContinue: (nome: string, telefone: string) => void
  resumoMesas: string
}

export function ModalComprador({ isOpen, onClose, onContinue, resumoMesas }: Props) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [erro, setErro] = useState('')

  // Limpa o estado quando o modal fecha
  useEffect(() => {
    if (!isOpen) {
      setNome('')
      setTelefone('')
      setErro('')
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Dados do comprador</h2>
        <div className="step-sub">Passo 1 de 2</div>
        <div className="resumo-mesas">{resumoMesas}</div>
        <div className="field">
          <label htmlFor="nomeComprador">Nome completo</label>
          <input
            type="text"
            id="nomeComprador"
            placeholder="Ex.: Maria da Silva"
            value={nome}
            autoFocus
            onChange={(e) => { setNome(e.target.value); setErro('') }}
            onKeyDown={(e) => e.key === 'Enter' && document.getElementById('continuarBtn')?.click()}
          />
        </div>
        <div className="field">
          <label htmlFor="telComprador">Telefone (opcional)</label>
          <input
            type="tel"
            id="telComprador"
            placeholder="(92) 90000-0000"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && document.getElementById('continuarBtn')?.click()}
          />
        </div>
        {erro && <div className="modal-erro">{erro}</div>}
        <div className="modal-actions">
          <button className="ghost-btn" onClick={onClose}>Voltar</button>
          <button
            id="continuarBtn"
            className="primary-btn"
            onClick={() => {
              if (!nome.trim()) {
                setErro('Por favor, informe o nome do comprador.')
                return
              }
              onContinue(nome, telefone)
            }}
          >
            Continuar para pagamento
          </button>
        </div>
      </div>
    </div>
  )
}
