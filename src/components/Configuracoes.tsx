'use client'
import { useState, useEffect } from 'react'

export function Configuracoes() {
  const [openwaUrl, setOpenwaUrl] = useState('')
  const [openwaKey, setOpenwaKey] = useState('')
  const [openwaSession, setOpenwaSession] = useState('default')
  const [isSaved, setIsSaved] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  // Carrega as configurações do LocalStorage ao montar
  useEffect(() => {
    const url = localStorage.getItem('openwa_url') || ''
    const key = localStorage.getItem('openwa_key') || ''
    const session = localStorage.getItem('openwa_session') || 'default'
    setOpenwaUrl(url)
    setOpenwaKey(key)
    setOpenwaSession(session)
  }, [])

  const handleSave = () => {
    localStorage.setItem('openwa_url', openwaUrl)
    localStorage.setItem('openwa_key', openwaKey)
    localStorage.setItem('openwa_session', openwaSession)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  const handleTest = async () => {
    const numStr = prompt('Digite um número de WhatsApp com DDD (ex: 92999999999) para enviar o teste:')
    if (!numStr) return

    const numero = numStr.replace(/\D/g, '')
    const numeroFinal = numero.length <= 11 ? `55${numero}` : numero

    setIsTesting(true)
    try {
      const baseURL = openwaUrl.replace(/\/$/, '')
      
      // O padrão mais comum de APIs baseadas em Baileys / WPPConnect / OpenWA
      const res = await fetch(`${baseURL}/api/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openwaKey}`,
          'x-api-key': openwaKey
        },
        body: JSON.stringify({
          session: openwaSession,
          chatId: `${numeroFinal}@c.us`,
          phone: numeroFinal,
          text: '✅ Teste de integração do sistema Bingão Paróquia Santa Cruz funcionando com sucesso!',
          isGroup: false
        })
      })

      if (res.ok) {
        alert('Mensagem enviada com sucesso! Verifique o WhatsApp.')
      } else {
        const text = await res.text()
        alert(`Erro ao enviar. O servidor respondeu: ${res.status} - ${text}`)
      }
    } catch (err: any) {
      alert(`Falha na conexão com o servidor OpenWA: ${err.message}`)
    }
    setIsTesting(false)
  }

  return (
    <div className="config-container">
      <div className="vendas-header">
        <h2>Configurações do Sistema</h2>
      </div>
      
      <div className="config-box">
        <h3>Integração OpenWA (WhatsApp Automático)</h3>
        <p style={{fontSize: '14px', color: '#666', marginBottom: '20px'}}>
          Configure aqui os dados do seu servidor OpenWA para enviar mensagens automáticas 
          aos compradores logo após a confirmação do pagamento no sistema.
        </p>

        <div className="form-group">
          <label>URL do Servidor OpenWA</label>
          <input 
            type="text" 
            placeholder="ex: http://192.168.1.10:3000 ou https://sua-api.com" 
            value={openwaUrl}
            onChange={e => setOpenwaUrl(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>API Key (Chave de Segurança)</label>
          <input 
            type="password" 
            placeholder="Sua chave de acesso (se configurado)" 
            value={openwaKey}
            onChange={e => setOpenwaKey(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Nome da Sessão</label>
          <input 
            type="text" 
            placeholder="ex: default" 
            value={openwaSession}
            onChange={e => setOpenwaSession(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button className="primary-btn" onClick={handleSave}>
            {isSaved ? '✅ Salvo!' : '💾 Salvar Configurações'}
          </button>
          
          <button className="ghost-btn" onClick={handleTest} disabled={isTesting || !openwaUrl}>
            {isTesting ? 'Enviando...' : '💬 Enviar Teste'}
          </button>
        </div>
        
        {isSaved && <div style={{ color: '#10B981', marginTop: '12px', fontSize: '14px', fontWeight: 'bold' }}>
          Configurações salvas neste navegador!
        </div>}
      </div>
    </div>
  )
}
