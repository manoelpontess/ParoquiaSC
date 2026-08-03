'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { getTelefonesCompradores } from '@/app/actions'
import { OPENWA_URL, OPENWA_KEY, OPENWA_SESSION } from '@/lib/openwa'
import { formatWhatsAppNumber } from '@/lib/whatsapp'

type Destinatario = {
  nome: string
  telefone: string
  mesas: number[]
}

type ResultadoEnvio = {
  nome: string
  telefone: string
  sucesso: boolean
  erro?: string
  lote: number
}

function montarMensagem(template: string, destinatario: Destinatario): string {
  const mesas = destinatario.mesas.sort((a, b) => a - b).join(', ')
  return template
    .replace(/\{\{nome\}\}/gi, destinatario.nome)
    .replace(/\{\{mesa\}\}/gi, mesas)
    .replace(/\{\{mesas\}\}/gi, mesas)
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Delay aleatório entre min e max segundos (parece mais humano)
function randomDelay(minSeg: number, maxSeg: number) {
  const ms = (minSeg + Math.random() * (maxSeg - minSeg)) * 1000
  return sleep(ms)
}

export function DisparedorMensagens() {
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([])
  const [loading, setLoading] = useState(true)
  const [mensagem, setMensagem] = useState(
    'Olá {{nome}}! 🎉 Lembramos que sua(s) mesa(s) {{mesa}} estão reservadas para o Bingão da Paróquia Santa Cruz. Contamos com sua presença!'
  )

  // Configurações de lote
  const [tamLote, setTamLote] = useState(10)
  const [intervaloMinutos, setIntervaloMinutos] = useState(5)
  const [delayMsgSeg, setDelayMsgSeg] = useState(8)

  // Estado de execução
  const [progresso, setProgresso] = useState(0)
  const [resultados, setResultados] = useState<ResultadoEnvio[]>([])
  const [fase, setFase] = useState<'idle' | 'enviando' | 'aguardando' | 'concluido'>('idle')
  const [loteAtual, setLoteAtual] = useState(0)
  const [totalLotes, setTotalLotes] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const [cancelado, setCancelado] = useState(false)

  // WhatsApp
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [whatsappConectado, setWhatsappConectado] = useState(false)

  const canceladoRef = useRef(false)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    carregarDestinatarios()
    verificarConexaoWhatsapp()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const carregarDestinatarios = async () => {
    setLoading(true)
    const dados = await getTelefonesCompradores()
    setDestinatarios(dados as Destinatario[])
    setLoading(false)
  }

  const verificarConexaoWhatsapp = async () => {
    if (!OPENWA_URL || !OPENWA_SESSION) return
    try {
      const baseURL = OPENWA_URL.replace(/\/$/, '')
      const res = await fetch(`${baseURL}/api/sessions`, {
        headers: { 'x-api-key': OPENWA_KEY || '' }
      })
      if (!res.ok) return
      const sessions = await res.json()
      const sess = sessions.find((s: any) => s.name === OPENWA_SESSION)
      if (sess && sess.id) {
        const status = sess.status?.toUpperCase() || ''
        setWhatsappConectado(status === 'READY' || status === 'CONNECTED' || status === 'AUTHENTICATED')
        setSessionId(sess.id)
      }
    } catch { /* sem conexão */ }
  }

  const getSessionIdFromAPI = async (baseURL: string): Promise<string | null> => {
    try {
      const res = await fetch(`${baseURL}/api/sessions`, { headers: { 'x-api-key': OPENWA_KEY || '' } })
      if (!res.ok) return null
      const sessions = await res.json()
      const sess = sessions.find((s: any) => s.name === OPENWA_SESSION)
      return sess?.id || null
    } catch { return null }
  }

  const destinatariosValidos = destinatarios.filter(d => d.telefone.replace(/\D/g, '').length >= 8)

  const previewMensagem = destinatariosValidos.length > 0
    ? montarMensagem(mensagem, destinatariosValidos[0])
    : montarMensagem(mensagem, { nome: 'João Silva', telefone: '', mesas: [42, 43] })

  const iniciarCountdown = useCallback((segundos: number): Promise<void> => {
    return new Promise(resolve => {
      setCountdown(segundos)
      let restante = segundos
      countdownRef.current = setInterval(() => {
        restante -= 1
        setCountdown(restante)
        if (restante <= 0 || canceladoRef.current) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          resolve()
        }
      }, 1000)
    })
  }, [])

  const handleEnviar = async () => {
    if (!mensagem.trim()) { alert('Escreva a mensagem antes de enviar.'); return }
    if (!whatsappConectado) { alert('O WhatsApp não está conectado. Acesse ⚙️ Configurações.'); return }
    if (destinatariosValidos.length === 0) { alert('Nenhum comprador com telefone cadastrado.'); return }

    const totalL = Math.ceil(destinatariosValidos.length / tamLote)
    const confirmacao = window.confirm(
      `⚠️ Confirma o disparo em lotes?\n\n` +
      `👥 Total: ${destinatariosValidos.length} destinatários\n` +
      `📦 Lotes: ${totalL} × ${tamLote} contatos\n` +
      `⏱ Intervalo: ${intervaloMinutos} min entre lotes\n` +
      `⏳ Tempo estimado: ~${Math.ceil(totalL * intervaloMinutos)} minutos`
    )
    if (!confirmacao) return

    canceladoRef.current = false
    setCancelado(false)
    setFase('enviando')
    setProgresso(0)
    setResultados([])
    setTotalLotes(totalL)

    const baseURL = OPENWA_URL.replace(/\/$/, '')
    let currentSessionId = sessionId || await getSessionIdFromAPI(baseURL)
    if (currentSessionId) setSessionId(currentSessionId)

    const novosResultados: ResultadoEnvio[] = []

    for (let l = 0; l < totalL; l++) {
      if (canceladoRef.current) break

      setLoteAtual(l + 1)
      setFase('enviando')

      const inicio = l * tamLote
      const fim = Math.min(inicio + tamLote, destinatariosValidos.length)
      const loteDestinatarios = destinatariosValidos.slice(inicio, fim)

      for (let i = 0; i < loteDestinatarios.length; i++) {
        if (canceladoRef.current) break

        const dest = loteDestinatarios[i]
        const msg = montarMensagem(mensagem, dest)
        const numeroFinal = formatWhatsAppNumber(dest.telefone)

        let sucesso = false
        let erro = ''

        try {
          if (!numeroFinal) {
            erro = 'Número inválido'
          } else if (!currentSessionId) {
            erro = 'Sessão não encontrada'
          } else {
            const res = await fetch(
              `${baseURL}/api/sessions/${currentSessionId}/messages/send-text`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': OPENWA_KEY || '' },
                body: JSON.stringify({ chatId: `${numeroFinal}@c.us`, text: msg })
              }
            )
            sucesso = res.ok
            if (!res.ok) erro = `HTTP ${res.status}`
          }
        } catch (e: any) {
          erro = e?.message || 'Erro desconhecido'
        }

        novosResultados.push({ nome: dest.nome, telefone: dest.telefone, sucesso, erro, lote: l + 1 })
        setProgresso(novosResultados.length)
        setResultados([...novosResultados])

        // Delay aleatório entre mensagens (mais humano)
        if (i < loteDestinatarios.length - 1 && !canceladoRef.current) {
          await randomDelay(delayMsgSeg * 0.7, delayMsgSeg * 1.3)
        }
      }

      // Se não for o último lote, aguarda intervalo
      if (l < totalL - 1 && !canceladoRef.current) {
        setFase('aguardando')
        await iniciarCountdown(intervaloMinutos * 60)
      }
    }

    if (countdownRef.current) clearInterval(countdownRef.current)
    setFase(canceladoRef.current ? 'concluido' : 'concluido')
    setCancelado(canceladoRef.current)
  }

  const handleCancelar = () => {
    canceladoRef.current = true
    if (countdownRef.current) clearInterval(countdownRef.current)
    setFase('concluido')
    setCancelado(true)
  }

  const handleReiniciar = () => {
    setFase('idle')
    setResultados([])
    setProgresso(0)
    setLoteAtual(0)
    setTotalLotes(0)
    setCountdown(0)
    setCancelado(false)
    carregarDestinatarios()
  }

  const sucessos = resultados.filter(r => r.sucesso).length
  const falhas = resultados.filter(r => !r.sucesso).length
  const porcentagem = destinatariosValidos.length > 0
    ? Math.round((progresso / destinatariosValidos.length) * 100)
    : 0
  const totalLotesCalc = Math.ceil(destinatariosValidos.length / tamLote)
  const tempoEstimadoMin = Math.ceil(totalLotesCalc * intervaloMinutos)

  const formatCountdown = (seg: number) => {
    const m = Math.floor(seg / 60)
    const s = seg % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="lista-vendas-container">
      <div className="vendas-header">
        <div>
          <h2>📣 Disparo de Mensagens</h2>
          <div className="vendas-subheader">
            Envie mensagens em lotes para evitar bloqueio do WhatsApp.
          </div>
        </div>
        <button className="ghost-btn refresh-btn" onClick={carregarDestinatarios}
          disabled={loading || fase === 'enviando' || fase === 'aguardando'}>
          {loading ? '⏳' : '🔄'} Atualizar
        </button>
      </div>

      {/* Status WhatsApp */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 16px', borderRadius: '8px', marginBottom: '20px',
        fontSize: '13px', fontWeight: 600,
        background: whatsappConectado ? '#f0fdf4' : '#fff7ed',
        border: `1px solid ${whatsappConectado ? '#bbf7d0' : '#fed7aa'}`,
        color: whatsappConectado ? '#15803d' : '#b45309',
      }}>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: whatsappConectado ? '#22c55e' : '#f97316',
          display: 'inline-block', flexShrink: 0
        }} />
        {whatsappConectado ? 'WhatsApp conectado — pronto para enviar' : 'WhatsApp desconectado — conecte em ⚙️ Configurações'}
      </div>

      {/* ── FASE: IDLE (editor + config) ── */}
      {fase === 'idle' && (
        <>
          {/* Config de lotes */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #bbf7d0', borderRadius: '12px',
            padding: '20px 24px', marginBottom: '20px',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⚙️ Configuração Anti-Bloqueio
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  📦 Contatos por lote
                </label>
                <input
                  type="number" min={1} max={50} value={tamLote}
                  onChange={e => setTamLote(Math.max(1, Math.min(50, Number(e.target.value))))}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB',
                    borderRadius: '8px', fontSize: '15px', fontWeight: 700,
                    color: '#15803d', background: 'white', boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#6B7280' }}>Recomendado: 5–15</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  ⏱ Intervalo entre lotes (min)
                </label>
                <input
                  type="number" min={1} max={60} value={intervaloMinutos}
                  onChange={e => setIntervaloMinutos(Math.max(1, Math.min(60, Number(e.target.value))))}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB',
                    borderRadius: '8px', fontSize: '15px', fontWeight: 700,
                    color: '#15803d', background: 'white', boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#6B7280' }}>Recomendado: 5–10 min</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  💬 Delay entre msgs (seg)
                </label>
                <input
                  type="number" min={3} max={60} value={delayMsgSeg}
                  onChange={e => setDelayMsgSeg(Math.max(3, Math.min(60, Number(e.target.value))))}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB',
                    borderRadius: '8px', fontSize: '15px', fontWeight: 700,
                    color: '#15803d', background: 'white', boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#6B7280' }}>Recomendado: 5–15 seg</span>
              </div>
            </div>

            {/* Resumo estimado */}
            {destinatariosValidos.length > 0 && (
              <div style={{
                marginTop: '16px', padding: '10px 14px',
                background: 'white', borderRadius: '8px',
                border: '1px solid #bbf7d0',
                fontSize: '13px', color: '#374151',
                display: 'flex', flexWrap: 'wrap', gap: '16px'
              }}>
                <span>📦 <strong>{totalLotesCalc} lote(s)</strong></span>
                <span>👥 <strong>{destinatariosValidos.length} destinatários</strong></span>
                <span>⏳ Tempo estimado: <strong>~{tempoEstimadoMin} min</strong></span>
              </div>
            )}
          </div>

          {/* Destinatários */}
          <div style={{
            background: 'white', border: '1px solid #E5E7EB',
            borderRadius: '12px', padding: '20px 24px', marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#111827' }}>👥 Destinatários</h3>
              {!loading && (
                <span style={{
                  background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0',
                  padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 700
                }}>{destinatariosValidos.length} com telefone</span>
              )}
            </div>
            {loading ? (
              <div className="loading-state">Carregando compradores...</div>
            ) : destinatariosValidos.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>📭</div>
                Nenhum comprador com telefone cadastrado.
              </div>
            ) : (
              <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {destinatariosValidos.map((d, i) => (
                  <span key={i} style={{
                    background: '#f9fafb', border: '1px solid #E5E7EB',
                    borderRadius: '20px', padding: '4px 10px', fontSize: '12px', color: '#374151'
                  }}>
                    {d.nome} — Mesa(s): {d.mesas.sort((a, b) => a - b).join(', ')}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Editor */}
          <div style={{
            background: 'white', border: '1px solid #E5E7EB',
            borderRadius: '12px', padding: '20px 24px', marginBottom: '20px',
          }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#111827' }}>✍️ Mensagem</h3>
            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
              Use{' '}<code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '4px' }}>{'{{nome}}'}</code>
              {' '}e{' '}<code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '4px' }}>{'{{mesa}}'}</code>
            </p>
            <textarea
              value={mensagem} onChange={e => setMensagem(e.target.value)} rows={5}
              placeholder="Escreva sua mensagem aqui..."
              style={{
                width: '100%', padding: '12px', border: '1px solid #D1D5DB',
                borderRadius: '8px', fontSize: '14px', lineHeight: '1.6',
                resize: 'vertical', fontFamily: 'inherit', color: '#111827',
                boxSizing: 'border-box', outline: 'none',
              }}
            />
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px', textAlign: 'right' }}>
              {mensagem.length} caracteres
            </div>
          </div>

          {/* Preview */}
          <div style={{
            background: 'white', border: '1px solid #E5E7EB',
            borderRadius: '12px', padding: '20px 24px', marginBottom: '24px',
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#111827' }}>👁️ Preview</h3>
            <div style={{
              background: '#DCF8C6', borderRadius: '12px 12px 4px 12px',
              padding: '12px 16px', maxWidth: '400px', marginLeft: 'auto',
              fontSize: '14px', lineHeight: '1.6', color: '#111827',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
            }}>
              {previewMensagem || '…'}
            </div>
            {destinatariosValidos.length > 0 && (
              <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px', textAlign: 'right' }}>
                Preview com dados de: <strong>{destinatariosValidos[0].nome}</strong>
              </p>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleEnviar}
              disabled={!whatsappConectado || destinatariosValidos.length === 0 || !mensagem.trim() || loading}
              className="primary-btn"
              style={{
                fontSize: '15px', padding: '12px 28px',
                opacity: (!whatsappConectado || destinatariosValidos.length === 0 || !mensagem.trim() || loading) ? 0.5 : 1,
                cursor: (!whatsappConectado || destinatariosValidos.length === 0 || !mensagem.trim() || loading) ? 'not-allowed' : 'pointer',
              }}
            >
              📤 Iniciar disparo em lotes
            </button>
          </div>
        </>
      )}

      {/* ── FASE: ENVIANDO ── */}
      {(fase === 'enviando' || fase === 'aguardando') && (
        <div style={{
          background: 'white', border: '1px solid #E5E7EB',
          borderRadius: '12px', padding: '32px 24px',
        }}>
          {/* Header com lote atual */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            {fase === 'enviando' ? (
              <>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>📤</div>
                <h3 style={{ margin: '0 0 4px', color: '#111827' }}>
                  Enviando Lote {loteAtual} de {totalLotes}
                </h3>
                <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
                  {progresso} de {destinatariosValidos.length} enviados no total
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>⏳</div>
                <h3 style={{ margin: '0 0 4px', color: '#111827' }}>
                  Aguardando para o Lote {loteAtual + 1} de {totalLotes}
                </h3>
                <p style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 12px' }}>
                  Pausa para evitar bloqueio do WhatsApp
                </p>
                {/* Countdown */}
                <div style={{
                  display: 'inline-block',
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: '12px', padding: '12px 28px',
                  fontSize: '36px', fontWeight: 800, color: '#15803d',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '2px',
                }}>
                  {formatCountdown(countdown)}
                </div>
              </>
            )}
          </div>

          {/* Barra de progresso geral */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
              <span>Progresso geral</span>
              <span>{porcentagem}%</span>
            </div>
            <div style={{ background: '#F3F4F6', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${porcentagem}%`,
                background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                borderRadius: '999px', transition: 'width 0.4s ease',
              }} />
            </div>
          </div>

          {/* Indicadores de lotes */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {Array.from({ length: totalLotes }).map((_, i) => {
              const loteNum = i + 1
              const concluido = loteNum < loteAtual
              const atual = loteNum === loteAtual
              return (
                <div key={i} style={{
                  flex: '1', minWidth: '28px', height: '8px', borderRadius: '4px',
                  background: concluido ? '#22c55e' : atual ? '#f59e0b' : '#E5E7EB',
                  transition: 'background 0.3s',
                }} title={`Lote ${loteNum}`} />
              )
            })}
          </div>

          {/* Log em tempo real */}
          {resultados.length > 0 && (
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '20px' }}>
              {[...resultados].reverse().map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 12px', borderRadius: '8px',
                  background: r.sucesso ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${r.sucesso ? '#bbf7d0' : '#fecaca'}`,
                  fontSize: '13px',
                }}>
                  <span>{r.sucesso ? '✅' : '❌'}</span>
                  <span style={{ flex: 1, color: '#374151', fontWeight: 500 }}>{r.nome}</span>
                  <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Lote {r.lote}</span>
                  {!r.sucesso && <span style={{ color: '#ef4444', fontSize: '11px' }}>{r.erro}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Botão cancelar */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={handleCancelar} style={{
              background: 'white', color: '#ef4444', border: '1px solid #fca5a5',
              padding: '8px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'
            }}>
              ⛔ Cancelar disparo
            </button>
          </div>
        </div>
      )}

      {/* ── FASE: CONCLUÍDO ── */}
      {fase === 'concluido' && (
        <div style={{
          background: 'white', border: '1px solid #E5E7EB',
          borderRadius: '12px', padding: '32px 24px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {cancelado ? '⛔' : falhas === 0 ? '🎉' : '⚠️'}
            </div>
            <h3 style={{ margin: '0 0 8px', color: '#111827', fontSize: '20px' }}>
              {cancelado ? 'Disparo cancelado' : 'Disparo concluído!'}
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 700 }}>
                ✅ {sucessos} enviado(s)
              </span>
              {falhas > 0 && (
                <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 700 }}>
                  ❌ {falhas} falha(s)
                </span>
              )}
              {cancelado && (
                <span style={{ background: '#fff7ed', color: '#b45309', border: '1px solid #fed7aa', padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 700 }}>
                  ⏩ {destinatariosValidos.length - progresso} pulado(s)
                </span>
              )}
            </div>
          </div>

          <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '24px' }}>
            {resultados.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '7px 12px', borderRadius: '8px',
                background: r.sucesso ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${r.sucesso ? '#bbf7d0' : '#fecaca'}`,
                fontSize: '13px',
              }}>
                <span>{r.sucesso ? '✅' : '❌'}</span>
                <span style={{ flex: 1, color: '#374151', fontWeight: 500 }}>{r.nome}</span>
                <span style={{ color: '#6B7280', fontSize: '12px' }}>{r.telefone}</span>
                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Lote {r.lote}</span>
                {!r.sucesso && <span style={{ color: '#ef4444', fontSize: '11px' }}>{r.erro}</span>}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={handleReiniciar} className="ghost-btn" style={{ padding: '10px 24px', fontSize: '14px' }}>
              🔄 Novo disparo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
