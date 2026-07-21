'use client'
import { useEffect, useState } from 'react'

const AREAS_MISSIONARIAS = [
  'SECRETARIA',
  'Santa Cruz',
  'Nossa Senhora do Bom Parto',
  'Sagrada Família',
  'Santa Rita de Cássia',
]

type Props = {
  isOpen: boolean
  onClose: () => void
  onContinue: (nome: string, telefone: string, areaMissionaria: string) => void
  resumoMesas: string
}

export function ModalComprador({ isOpen, onClose, onContinue, resumoMesas }: Props) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [areaMissionaria, setAreaMissionaria] = useState('')
  const [erro, setErro] = useState('')

  // Limpa o estado quando o modal fecha
  useEffect(() => {
    if (!isOpen) {
      setNome('')
      setTelefone('')
      setAreaMissionaria('')
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
            onKeyDown={(e) => e.key === 'Enter' && document.getElementById('telComprador')?.focus()}
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
          />
        </div>
        <div className="field">
          <label htmlFor="areaMissionaria">Área Missionária</label>
          <select
            id="areaMissionaria"
            value={areaMissionaria}
            onChange={(e) => { setAreaMissionaria(e.target.value); setErro('') }}
            style={{
              width: '100%',
              padding: '11px 14px',
              border: '1.5px solid var(--gray-200)',
              borderRadius: 'var(--radius)',
              fontSize: '14px',
              fontFamily: "'Inter', sans-serif",
              color: areaMissionaria ? 'var(--ink)' : 'var(--gray-400)',
              background: 'var(--gray-50)',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
            }}
          >
            <option value="" disabled>Selecione a área missionária...</option>
            {AREAS_MISSIONARIAS.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
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
              if (!areaMissionaria) {
                setErro('Por favor, selecione a área missionária.')
                return
              }
              onContinue(nome, telefone, areaMissionaria)
            }}
          >
            Continuar para pagamento
          </button>
        </div>
      </div>
    </div>
  )
}
