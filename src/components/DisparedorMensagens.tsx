'use client'
import { useState, useEffect } from 'react'
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
}

function montarMensagem(template: string, destinatario: Destinatario): string {
  const mesas = destinatario.mesas.sort((a, b) => a - b).join(', ')
  return template
    .replace(/\{\{nome\}\}/gi, destinatario.nome)
    .replace(/\{\{mesa\}\}/gi, mesas)
    .replace(/\{\{mesas\}\}/gi, mesas)
}

export function DisparedorMensagens() {
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([])
  const [loading, setLoading] = useState(true)
  const [mensagem, setMensagem] = useState(
    'Olá {{nome}}! 🎉 Lembramos que sua(s) mesa(s) {{mesa}} estão reservadas para o Bingão da Paróquia Santa Cruz. Contamos com sua presença!'
  )
  const [progresso, setProgresso] = useState(0)
  const [resultados, setResultados] = useState<ResultadoEnvio[]>([])
  const [fase, setFase] = useState<'idle' | 'enviando' | 'concluido'>('idle')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [whatsappConectado, setWhatsappConectado] = useState(false)

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
        setWhatsappConectado(
          status === 'READY' || status === 'CONNECTED' || status === 'AUTHENTICATED'
        )
        setSessionId(sess.id)
      }
    } catch {
      // sem conexão com OpenWA
    }
  }

  const destinatariosValidos = destinatarios.filter(d => {
    const num = d.telefone.replace(/\D/g, '')
    return num.length >= 8
  })

  const previewMensagem =
    destinatariosValidos.length > 0
      ? montarMensagem(mensagem, destinatariosValidos[0])
      : montarMensagem(mensagem, { nome: 'João Silva', telefone: '', mesas: [42, 43] })

  const getSessionIdFromAPI = async (baseURL: string): Promise<string | null> => {
    try {
      const res = await fetch(`${baseURL}/api/sessions`, {
        headers: { 'x-api-key': OPENWA_KEY || '' }
      })
      if (!res.ok) return null
      const sessions = await res.json()
      const sess = sessions.find((s: any) => s.name === OPENWA_SESSION)
      return sess?.id || null
    } catch {
      return null
    }
  }

  const handleEnviar = async () => {
    if (!mensagem.trim()) {
      alert('Escreva a mensagem antes de enviar.')
      return
    }
    if (!whatsappConectado) {
      alert('O WhatsApp não está conectado. Acesse ⚙️ Configurações para conectar.')
      return
    }
    if (destinatariosValidos.length === 0) {
      alert('Nenhum comprador com telefone cadastrado encontrado.')
      return
    }
    const confirmacao = window.confirm(
      `⚠️ Confirma o disparo para ${destinatariosValidos.length} destinatário(s)?\n\nEsta ação enviará a mensagem para todos os compradores com telefone cadastrado.`
    )
    if (!confirmacao) return

    setFase('enviando')
    setProgresso(0)
    setResultados([])

    const baseURL = OPENWA_URL.replace(/\/$/, '')
    const novosResultados: ResultadoEnvio[] = []
    let currentSessionId = sessionId

    if (!currentSessionId) {
      currentSessionId = await getSessionIdFromAPI(baseURL)
      if (currentSessionId) setSessionId(currentSessionId)
    }

    for (let i = 0; i < destinatariosValidos.length; i++) {
      const dest = destinatariosValidos[i]
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
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': OPENWA_KEY || ''
              },
              body: JSON.stringify({
                chatId: `${numeroFinal}@c.us`,
                text: msg
              })
            }
          )
          sucesso = res.ok
          if (!res.ok) erro = `HTTP ${res.status}`
        }
      } catch (e: any) {
        erro = e?.message || 'Erro desconhecido'
      }

      novosResultados.push({ nome: dest.nome, telefone: dest.telefone, sucesso, erro })
      setProgresso(i + 1)
      setResultados([...novosResultados])

      if (i < destinatariosValidos.length - 1) {
        await new Promise(r => setTimeout(r, 600))
      }
    }

    setFase('concluido')
  }

  const handleReiniciar = () => {
    setFase('idle')
    setResultados([])
    setProgresso(0)
    carregarDestinatarios()
  }

  const sucessos = resultados.filter(r => r.sucesso).length
  const falhas = resultados.filter(r => !r.sucesso).length
  const porcentagem =
    destinatariosValidos.length > 0
      ? Math.round((progresso / destinatariosValidos.length) * 100)
      : 0

  return (
    <div className="lista-vendas-container">
      <div className="vendas-header">
        <div>
          <h2>📣 Disparo de Mensagens</h2>
          <div className="vendas-subheader">
            Envie uma mensagem personalizada via WhatsApp para todos os compradores de mesas.
          </div>
        </div>
        <button className="ghost-btn refresh-btn" onClick={carregarDestinatarios} disabled={loading || fase === 'enviando'}>
          {loading ? '⏳' : '🔄'} Atualizar
        </button>
      </div>

      {/* Status WhatsApp */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '13px',
        fontWeight: 600,
        background: whatsappConectado ? '#f0fdf4' : '#fff7ed',
        border: `1px solid ${whatsappConectado ? '#bbf7d0' : '#fed7aa'}`,
        color: whatsappConectado ? '#15803d' : '#b45309',
      }}>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: whatsappConectado ? '#22c55e' : '#f97316',
          display: 'inline-block', flexShrink: 0
        }} />
        {whatsappConectado
          ? 'WhatsApp conectado — pronto para enviar'
          : 'WhatsApp desconectado — conecte em ⚙️ Configurações antes de disparar'}
      </div>

      {/* ── FASE: IDLE (editor) ── */}
      {fase === 'idle' && (
        <>
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
                }}>
                  {destinatariosValidos.length} com telefone
                </span>
              )}
            </div>
            {loading ? (
              <div className="loading-state">Carregando compradores...</div>
            ) : destinatariosValidos.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>📭</div>
                Nenhum comprador com telefone cadastrado encontrado.
              </div>
            ) : (
              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
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

          {/* Editor de mensagem */}
          <div style={{
            background: 'white', border: '1px solid #E5E7EB',
            borderRadius: '12px', padding: '20px 24px', marginBottom: '20px',
          }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#111827' }}>✍️ Mensagem</h3>
            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
              Use{' '}
              <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '4px' }}>{'{{nome}}'}</code>
              {' '}para o nome do comprador e{' '}
              <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '4px' }}>{'{{mesa}}'}</code>
              {' '}para o(s) número(s) da(s) mesa(s).
            </p>
            <textarea
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              rows={5}
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
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#111827' }}>👁️ Preview da Mensagem</h3>
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

          {/* Botão de disparo */}
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
              📤 Enviar para {destinatariosValidos.length} destinatário(s)
            </button>
          </div>
        </>
      )}

      {/* ── FASE: ENVIANDO ── */}
      {fase === 'enviando' && (
        <div style={{
          background: 'white', border: '1px solid #E5E7EB',
          borderRadius: '12px', padding: '32px 24px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📤</div>
            <h3 style={{ margin: '0 0 4px', color: '#111827' }}>Enviando mensagens...</h3>
            <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
              {progresso} de {destinatariosValidos.length} enviados
            </p>
          </div>
          <div style={{
            background: '#F3F4F6', borderRadius: '999px',
            height: '12px', overflow: 'hidden', marginBottom: '8px',
          }}>
            <div style={{
              height: '100%', width: `${porcentagem}%`,
              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
              borderRadius: '999px', transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ textAlign: 'right', fontSize: '13px', color: '#6B7280', marginBottom: '24px' }}>
            {porcentagem}%
          </div>
          {resultados.length > 0 && (
            <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[...resultados].reverse().map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px', borderRadius: '8px',
                  background: r.sucesso ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${r.sucesso ? '#bbf7d0' : '#fecaca'}`,
                  fontSize: '13px',
                }}>
                  <span>{r.sucesso ? '✅' : '❌'}</span>
                  <span style={{ flex: 1, color: '#374151', fontWeight: 500 }}>{r.nome}</span>
                  <span style={{ color: '#6B7280' }}>{r.telefone}</span>
                  {!r.sucesso && <span style={{ color: '#ef4444', fontSize: '11px' }}>{r.erro}</span>}
                </div>
              ))}
            </div>
          )}
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
              {falhas === 0 ? '🎉' : '⚠️'}
            </div>
            <h3 style={{ margin: '0 0 8px', color: '#111827', fontSize: '20px' }}>Disparo concluído!</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{
                background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0',
                padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 700
              }}>
                ✅ {sucessos} enviado(s)
              </span>
              {falhas > 0 && (
                <span style={{
                  background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                  padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 700
                }}>
                  ❌ {falhas} falha(s)
                </span>
              )}
            </div>
          </div>
          <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
            {resultados.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', borderRadius: '8px',
                background: r.sucesso ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${r.sucesso ? '#bbf7d0' : '#fecaca'}`,
                fontSize: '13px',
              }}>
                <span>{r.sucesso ? '✅' : '❌'}</span>
                <span style={{ flex: 1, color: '#374151', fontWeight: 500 }}>{r.nome}</span>
                <span style={{ color: '#6B7280' }}>{r.telefone}</span>
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