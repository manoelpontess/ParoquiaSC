'use client'

type Props = {
  isOpen: boolean
  onClose: () => void
  mesas: number[]
  comprador: string
  total: number
  telefone?: string
  areaMissionaria?: string
}

export function ModalSucesso({ isOpen, onClose, mesas, comprador, total, telefone, areaMissionaria }: Props) {
  if (!isOpen) return null

  const mesasOrdenadas = [...mesas].sort((a, b) => a - b)
  const mesasTexto = mesasOrdenadas.map(m => `#${m}`).join(', ')
  const valorTotalStr = `R$ ${total.toFixed(2).replace('.', ',')}`
  const dataHoje = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

  const getWhatsAppUrl = () => {
    const mensagem =
`*🎉 BINGÃO PARÓQUIA SANTA CRUZ*
*COMPROVANTE DE RESERVA DE MESA*

👤 *Comprador:* ${comprador}
🪑 *Mesa(s):* ${mesasTexto}
💰 *Valor Total:* ${valorTotalStr}
📍 *Status:* ✅ PAGAMENTO CONFIRMADO
${areaMissionaria ? `🏛️ *Área Missionária:* ${areaMissionaria}\n` : ''}📅 *Data:* ${dataHoje}

Muito obrigado por colaborar com a nossa comunidade! Deus abençoe! 🙏✨`

    if (telefone) {
      const apenasNumeros = telefone.replace(/\D/g, '')
      if (apenasNumeros) {
        const numFinal = apenasNumeros.length <= 11 ? `55${apenasNumeros}` : apenasNumeros
        return `https://wa.me/${numFinal}?text=${encodeURIComponent(mensagem)}`
      }
    }
    return `https://wa.me/?text=${encodeURIComponent(mensagem)}`
  }

  const handleImprimirComprovante = () => {
    const htmlRecibo = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Comprovante de Venda — Bingão Paróquia Santa Cruz</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #f3f4f6; color: #111827; padding: 20px; }
    .recibo-card {
      max-width: 440px;
      margin: 20px auto;
      background: white;
      padding: 28px;
      border-radius: 16px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
      border: 2px solid #16a34a;
    }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 1.5px dashed #e5e7eb; padding-bottom: 16px; }
    .header h1 { font-size: 20px; color: #14532d; font-weight: 800; }
    .header p { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .badge { display: inline-block; background: #dcfce7; color: #15803d; font-weight: 800; font-size: 12px; padding: 4px 12px; border-radius: 20px; margin: 12px 0 4px; }
    .linha { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .linha .label { color: #6b7280; font-size: 12px; }
    .linha .valor { font-weight: 700; color: #111827; }
    .total-linha { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 14px; border-top: 2px solid #16a34a; }
    .total-valor { font-size: 22px; font-weight: 800; color: #16a34a; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #6b7280; border-top: 1.5px dashed #e5e7eb; padding-top: 14px; }
    .no-print { margin-bottom: 16px; text-align: center; }
    .btn-print { background: #16a34a; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; }
    @media print { .no-print { display: none; } body { padding: 0; background: white; } .recibo-card { box-shadow: none; margin: 0; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
  </div>
  <div class="recibo-card">
    <div class="header">
      <h1>🎰 Bingão Paróquia Santa Cruz</h1>
      <p>Comprovante Oficial de Reserva de Mesa</p>
      <div class="badge">✅ PAGAMENTO CONFIRMADO</div>
    </div>
    <div class="linha">
      <span class="label">COMPRADOR</span>
      <span class="valor">${comprador}</span>
    </div>
    ${telefone ? `
    <div class="linha">
      <span class="label">TELEFONE</span>
      <span class="valor">${telefone}</span>
    </div>` : ''}
    <div class="linha">
      <span class="label">MESA(S) RESERVADA(S)</span>
      <span class="valor" style="color:#15803d;font-size:16px">${mesasTexto}</span>
    </div>
    ${areaMissionaria ? `
    <div class="linha">
      <span class="label">ÁREA MISSIONÁRIA</span>
      <span class="valor">${areaMissionaria}</span>
    </div>` : ''}
    <div class="linha">
      <span class="label">DATA DO REGISTRO</span>
      <span class="valor">${dataHoje}</span>
    </div>
    <div class="total-linha">
      <span style="font-weight:700">VALOR TOTAL</span>
      <span class="total-valor">${valorTotalStr}</span>
    </div>
    <div class="footer">
      Obrigado pela sua colaboração com a Paróquia Santa Cruz! 🙏
    </div>
  </div>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(htmlRecibo)
      win.document.close()
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal sucesso-box">
        <div className="sucesso-icone">✅</div>
        <h2>Venda Registrada!</h2>
        <p className="sucesso-sub">Pagamento confirmado com sucesso.</p>

        <div className="sucesso-detalhes">
          <div className="sucesso-linha">
            <span className="label">Comprador</span>
            <span className="value">{comprador}</span>
          </div>
          <div className="sucesso-linha">
            <span className="label">Mesa(s)</span>
            <span className="value">{mesas.sort((a,b)=>a-b).join(', ')}</span>
          </div>
          <div className="sucesso-linha">
            <span className="label">Total</span>
            <span className="value verde">R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        {/* Botões de Ação para Envio e Impressão do Comprovante */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginBottom: '12px' }}>
          <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-sucesso-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: '#25D366',
              color: 'white',
              padding: '12px',
              borderRadius: 'var(--radius)',
              fontWeight: 700,
              fontSize: '15px',
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(37,211,102,0.3)',
              transition: 'all 0.2s'
            }}
          >
            💬 Enviar Comprovante via WhatsApp
          </a>

          <button
            type="button"
            onClick={handleImprimirComprovante}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'white',
              color: 'var(--gray-800)',
              border: '1.5px solid var(--gray-300)',
              padding: '10px',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            📄 Imprimir / Salvar PDF do Recibo
          </button>
        </div>

        <button className="primary-btn sucesso-btn" onClick={onClose}>
          Nova Venda
        </button>
      </div>
    </div>
  )
}
