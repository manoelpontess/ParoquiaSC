'use client'
import { useState, useEffect, useRef } from 'react'
import { OPENWA_URL, OPENWA_KEY, OPENWA_SESSION } from '@/lib/openwa'
import { Wifi, QrCode, Loader2, StopCircle } from 'lucide-react' // ícones sugeridos

export function Configuracoes() {
  const [sessionStatus, setSessionStatus] = useState<string>('UNKNOWN')
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [isPolling, setIsPolling] = useState(false)
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const checkStatus = async () => {
    if (!OPENWA_URL || !OPENWA_SESSION) return
    const baseURL = OPENWA_URL.replace(/\/$/, '')
    
    try {
      const res = await fetch(`${baseURL}/api/sessions`, {
        headers: { 'x-api-key': OPENWA_KEY }
      })
      
      if (!res.ok) {
        setSessionStatus('ERROR')
        return
      }

      const sessions = await res.json()
      const sessionData = sessions.find((s: any) => s.name === OPENWA_SESSION)
      
      if (!sessionData) {
        setSessionStatus('NOT_FOUND')
        return
      }

      const status = sessionData.status?.toUpperCase() || 'UNKNOWN'
      setSessionStatus(status)

      if (status === 'QRCODE' || status === 'UNAUTHENTICATED' || status === 'CREATED' || status === 'STARTING' || status === 'INITIALIZING' || status === 'QR_READY') {
        if (status === 'QRCODE' || status === 'UNAUTHENTICATED' || status === 'QR_READY') {
          fetchQrCode(baseURL, OPENWA_KEY, sessionData.id)
        } else {
          setQrCodeUrl('') // ainda gerando
        }
        startPolling()
      } else if (status === 'READY' || status === 'CONNECTED' || status === 'AUTHENTICATED') {
        stopPolling()
        setQrCodeUrl('')
      }
    } catch (err) {
      setSessionStatus('ERROR')
    }
  }

  const fetchQrCode = async (baseURL: string, key: string, sessionId: string) => {
    try {
      const res = await fetch(`${baseURL}/api/sessions/${sessionId}/qr`, {
        headers: { 'x-api-key': key, 'Accept': 'image/png' }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.qrCode) {
          setQrCodeUrl(data.qrCode)
        }
      } else {
        setQrCodeUrl('')
      }
    } catch (err) {
      setQrCodeUrl('')
    }
  }

  const startSession = async () => {
    if (!OPENWA_URL || !OPENWA_SESSION) return
    const baseURL = OPENWA_URL.replace(/\/$/, '')
    setSessionStatus('STARTING')
    try {
      const resList = await fetch(`${baseURL}/api/sessions`, {
        headers: { 'x-api-key': OPENWA_KEY }
      })
      
      if (resList.ok) {
        const sessions = await resList.json()
        const sessionData = sessions.find((s: any) => s.name === OPENWA_SESSION)
        
        if (sessionData && sessionData.id) {
          await fetch(`${baseURL}/api/sessions/${sessionData.id}/start`, {
            method: 'POST',
            headers: { 'x-api-key': OPENWA_KEY }
          })
          setTimeout(() => checkStatus(), 2000)
          return
        }

        const resCreate = await fetch(`${baseURL}/api/sessions`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-key': OPENWA_KEY 
          },
          body: JSON.stringify({ name: OPENWA_SESSION })
        })

        if (resCreate.ok) {
          const newData = await resCreate.json()
          if (newData.id) {
            await fetch(`${baseURL}/api/sessions/${newData.id}/start`, {
              method: 'POST',
              headers: { 'x-api-key': OPENWA_KEY }
            })
            setTimeout(() => checkStatus(), 2000)
            return
          }
        }
      }

      alert(`Não foi possível criar a sessão no servidor.`)
      setSessionStatus('NOT_FOUND')

    } catch (err) {
      alert('Erro ao tentar iniciar a sessão.')
      setSessionStatus('ERROR')
    }
  }

  const handleDisconnect = async () => {
    setSessionStatus('NOT_FOUND')
    setQrCodeUrl('')
    stopPolling()

    try {
      const baseURL = OPENWA_URL.replace(/\/$/, '')
      
      const resList = await fetch(`${baseURL}/api/sessions`, {
        headers: { 'x-api-key': OPENWA_KEY }
      })
      
      if (!resList.ok) return

      const sessions = await resList.json()
      const s = sessions.find((x: any) => x.name === OPENWA_SESSION)
      
      if (s && s.id) {
        await fetch(`${baseURL}/api/sessions/${s.id}`, {
          method: 'DELETE',
          headers: { 'x-api-key': OPENWA_KEY }
        })
      }
    } catch (err: any) {
      console.error(err)
    }
  }

  const startPolling = () => {
    if (pollingRef.current) return
    setIsPolling(true)
    pollingRef.current = setInterval(() => {
      checkStatus()
    }, 3000)
  }

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setIsPolling(false)
  }

  useEffect(() => {
    checkStatus()
    return () => stopPolling()
  }, [])

  const isConnected = sessionStatus === 'CONNECTED' || sessionStatus === 'AUTHENTICATED' || sessionStatus === 'READY'
  const isDisconnected = sessionStatus === 'NOT_FOUND' || sessionStatus === 'ERROR'
  const isWaiting = sessionStatus === 'QRCODE' || sessionStatus === 'UNAUTHENTICATED' || sessionStatus === 'CREATED' || sessionStatus === 'STARTING' || sessionStatus === 'INITIALIZING' || sessionStatus === 'QR_READY'

  return (
    <div className="config-container">
      <div className="vendas-header" style={{ marginBottom: '24px' }}>
        <h2>Configurações do Sistema</h2>
      </div>
      
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '32px' }}>
        
        {/* Cabeçalho Conexão */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Wifi size={24} color="#10B981" />
          <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Conexão WhatsApp</h3>
        </div>
        <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '32px' }}>
          Conecte o WhatsApp do seu celular para enviar os comprovantes das mesas automaticamente aos compradores.
        </p>

        {/* Caixa de Status - Desconectado */}
        {isDisconnected && (
          <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '24px', background: '#FAFAFA' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }}></div>
              <span style={{ fontWeight: '600', color: '#374151' }}>Desconectado</span>
            </div>
            <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '24px' }}>
              Nenhum celular conectado. Suas mensagens automáticas não serão enviadas.
            </p>
            <button 
              onClick={startSession}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: '#2563EB', color: 'white', border: 'none', 
                padding: '10px 20px', borderRadius: '6px', fontWeight: '500',
                cursor: 'pointer', fontSize: '14px'
              }}
            >
              <QrCode size={18} />
              Conectar Celular
            </button>
          </div>
        )}

        {/* Caixa de Status - Aguardando Leitura */}
        {isWaiting && (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
            <div style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: '8px', padding: '24px', background: '#FAFAFA', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }}></div>
                <span style={{ fontWeight: '600', color: '#374151' }}>Aguardando Leitura...</span>
              </div>
              <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: 'auto' }}>
                Abra o WhatsApp no seu celular, vá em <strong>Aparelhos Conectados</strong> e leia o QR Code ao lado.
              </p>
              <div style={{ marginTop: '24px' }}>
                <button 
                  onClick={handleDisconnect}
                  style={{
                    background: 'white', color: '#374151', border: '1px solid #D1D5DB', 
                    padding: '8px 16px', borderRadius: '6px', fontWeight: '500',
                    cursor: 'pointer', fontSize: '14px'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>

            {/* QR Code Box */}
            <div style={{ 
              width: '220px', height: '220px', border: '1px solid #E5E7EB', borderRadius: '8px', 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'white', flexShrink: 0
            }}>
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code" style={{ width: '200px', height: '200px', objectFit: 'contain' }} />
              ) : (
                <>
                  <Loader2 size={32} color="#3B82F6" className="animate-spin" style={{ marginBottom: '12px' }} />
                  <span style={{ color: '#6B7280', fontSize: '13px' }}>Gerando código...</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Caixa de Status - Conectado */}
        {isConnected && (
          <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '24px', background: '#FAFAFA' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }}></div>
              <span style={{ fontWeight: '600', color: '#374151' }}>Conectado</span>
            </div>
            <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '24px' }}>
              Seu WhatsApp está pareado e pronto para enviar mensagens automáticas.
            </p>
            <button 
              onClick={handleDisconnect}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'white', color: '#EF4444', border: '1px solid #EF4444', 
                padding: '10px 20px', borderRadius: '6px', fontWeight: '500',
                cursor: 'pointer', fontSize: '14px'
              }}
            >
              <StopCircle size={18} />
              Desconectar Celular
            </button>
          </div>
        )}
        
        {sessionStatus === 'UNKNOWN' && (
           <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
             <Loader2 size={32} color="#9CA3AF" className="animate-spin" />
           </div>
        )}

      </div>
    </div>
  )
}
