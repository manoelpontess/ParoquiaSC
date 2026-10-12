// Geração de páginas para impressão / PDF (abrem em nova aba)
import { escapeHtml as e, listaMesas, moeda, numMesa } from './format'
import { labelForma, NOME_EVENTO, NOME_PAROQUIA, type FormaPagamento, type Mesa } from './types'

const BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #12141b; background: #f4f3ef; padding: 24px; }
  .no-print { max-width: 820px; margin: 0 auto 18px; display: flex; justify-content: space-between; align-items: center; gap: 12px;
    padding: 14px 18px; border-radius: 16px; color: #fff; background: linear-gradient(135deg,#0b0f26,#191d58 55%,#352a8a); }
  .no-print button { border: 0; border-radius: 10px; padding: 10px 18px; font: 700 14px inherit; font-family: inherit; cursor: pointer; background: #fff; color: #191d58; }
  @media print { body { background: #fff; padding: 0; } .no-print { display: none !important; } }
`

function abrir(html: string) {
  const janela = window.open('', '_blank')
  if (!janela) {
    alert('Permita pop-ups para imprimir.')
    return
  }
  janela.document.write(html)
  janela.document.close()
}

export function imprimirComprovante(d: {
  mesas: number[]
  nome: string
  telefone?: string | null
  responsavel?: string | null
  forma: FormaPagamento | null
  pago: boolean
  total: number
  data?: string
}) {
  const data = new Date(d.data ?? Date.now()).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  const status = d.pago ? 'PAGAMENTO CONFIRMADO' : 'RESERVADA — AGUARDANDO PAGAMENTO'

  abrir(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Comprovante — ${NOME_EVENTO}</title>
<style>${BASE_CSS}
  .card { max-width: 420px; margin: 0 auto; background: #fff; border-radius: 22px; overflow: hidden; box-shadow: 0 20px 40px -16px rgba(0,0,0,.25); }
  .top { padding: 24px; color: #fff; text-align: center; background: linear-gradient(135deg,#0b0f26,#191d58 55%,#352a8a); }
  .top small { display:block; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #fcd679; font-weight: 700; }
  .top h1 { font-size: 24px; font-weight: 800; letter-spacing: -.02em; margin-top: 2px; }
  .top p { font-size: 12px; opacity: .7; margin-top: 2px; }
  .badge { display: inline-block; margin-top: 12px; padding: 5px 12px; border-radius: 99px; font-size: 11px; font-weight: 800;
    background: ${d.pago ? '#dcfce7' : '#fef3c7'}; color: ${d.pago ? '#166534' : '#9a3412'}; }
  .body { padding: 8px 22px 20px; }
  .row { display: flex; justify-content: space-between; gap: 16px; padding: 11px 0; border-bottom: 1px dashed #e6e3dc; font-size: 13.5px; }
  .row span:first-child { color: #868b97; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
  .row span:last-child { font-weight: 700; text-align: right; }
  .mesas { font-size: 18px !important; color: #4338ca; }
  .total { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding: 14px 16px; border-radius: 14px; background: #f4f3ef; }
  .total b { font-size: 22px; color: #166534; }
  .foot { text-align: center; font-size: 12px; color: #868b97; padding: 0 22px 22px; }
  @media print { .card { box-shadow: none; border: 1px solid #ddd; } }
</style></head><body>
<div class="no-print"><b>Comprovante da venda</b><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
<div class="card">
  <div class="top">
    <small>${e(NOME_PAROQUIA)}</small>
    <h1>${e(NOME_EVENTO)}</h1>
    <p>Comprovante de mesa</p>
    <div class="badge">${status}</div>
  </div>
  <div class="body">
    <div class="row"><span>Comprador</span><span>${e(d.nome)}</span></div>
    ${d.telefone ? `<div class="row"><span>Telefone</span><span>${e(d.telefone)}</span></div>` : ''}
    <div class="row"><span>Mesa(s)</span><span class="mesas">${listaMesas(d.mesas)}</span></div>
    ${d.pago ? `<div class="row"><span>Pagamento</span><span>${labelForma(d.forma)}</span></div>` : ''}
    ${d.responsavel ? `<div class="row"><span>Responsável</span><span>${e(d.responsavel)}</span></div>` : ''}
    <div class="row"><span>Data</span><span>${data}</span></div>
    <div class="total"><span style="font-weight:700">Total</span><b>${moeda(d.total)}</b></div>
  </div>
  <div class="foot">Obrigado por participar! Deus abençoe. ✝</div>
</div></body></html>`)
}

export function imprimirLista(mesas: Mesa[], opcoes: { apenasOcupadas: boolean; presenca: boolean }) {
  const lista = opcoes.apenasOcupadas ? mesas.filter(m => m.status !== 'livre') : mesas
  const vendidas = mesas.filter(m => m.status === 'vendida').length
  const reservadas = mesas.filter(m => m.status === 'reservada').length
  const livres = mesas.length - vendidas - reservadas
  const arrecadado = mesas.filter(m => m.status === 'vendida').reduce((s, m) => s + (m.preco ?? 0), 0)
  const agora = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

  const linhas = lista.map(m => {
    const v = m.venda
    const status = m.status === 'vendida' ? '<span class="b pago">Pago</span>'
      : m.status === 'reservada' ? '<span class="b res">Reservada</span>'
      : '<span class="b livre">Livre</span>'
    return `<tr>
      ${opcoes.presenca ? '<td class="c"><span class="sq"></span></td>' : ''}
      <td class="n">${numMesa(m.numero)}</td>
      <td class="nome">${v ? e(v.comprador.nome) : '<span class="m">—</span>'}</td>
      <td>${v?.comprador.telefone ? e(v.comprador.telefone) : '<span class="m">—</span>'}</td>
      <td>${v?.responsavel ? e(v.responsavel) : '<span class="m">—</span>'}</td>
      <td>${status}</td>
      <td>${m.status === 'vendida' ? labelForma(v?.forma_pagamento) : '<span class="m">—</span>'}</td>
    </tr>`
  }).join('')

  abrir(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lista de mesas — ${NOME_EVENTO}</title>
<style>${BASE_CSS}
  @page { size: A4 portrait; margin: 12mm; }
  .page { max-width: 820px; margin: 0 auto; background: #fff; border-radius: 18px; padding: 26px; box-shadow: 0 10px 30px -14px rgba(0,0,0,.2); }
  .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; padding-bottom: 14px; border-bottom: 2px solid #191d58; }
  .head small { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #b45309; font-weight: 800; }
  .head h1 { font-size: 24px; font-weight: 800; letter-spacing: -.02em; }
  .head p { font-size: 12px; color: #868b97; }
  .stats { display: flex; gap: 8px; flex-wrap: wrap; margin: 14px 0; }
  .stats span { padding: 6px 12px; border-radius: 99px; background: #f4f3ef; font-size: 12px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { text-align: left; padding: 8px 10px; font-size: 10px; letter-spacing: .06em; text-transform: uppercase; color: #868b97; border-bottom: 1px solid #e6e3dc; background: #faf9f6; }
  td { padding: 8px 10px; border-bottom: 1px solid #f1efe9; }
  tr { page-break-inside: avoid; }
  .n { font-weight: 800; color: #4338ca; font-size: 14px; width: 48px; }
  .nome { font-weight: 700; }
  .m { color: #c0c3cb; }
  .c { width: 40px; text-align: center; }
  .sq { display: inline-block; width: 15px; height: 15px; border: 1.5px solid #868b97; border-radius: 4px; }
  .b { display: inline-block; padding: 2px 9px; border-radius: 99px; font-size: 10.5px; font-weight: 800; }
  .pago { background: #dcfce7; color: #166534; } .res { background: #fef3c7; color: #9a3412; } .livre { background: #f1efe9; color: #868b97; }
  @media print { .page { box-shadow: none; padding: 0; border-radius: 0; } }
</style></head><body>
<div class="no-print"><b>Lista de controle das mesas</b><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
<div class="page">
  <div class="head">
    <div><small>${e(NOME_PAROQUIA)}</small><h1>${e(NOME_EVENTO)} — Mesas</h1></div>
    <p>Gerado em ${agora}</p>
  </div>
  <div class="stats">
    <span>Vendidas: <b>${vendidas}</b></span><span>Reservadas: <b>${reservadas}</b></span>
    <span>Livres: <b>${livres}</b></span><span>Arrecadado: <b>${moeda(arrecadado)}</b></span>
  </div>
  <table><thead><tr>
    ${opcoes.presenca ? '<th class="c">✓</th>' : ''}
    <th>Mesa</th><th>Comprador</th><th>Telefone</th><th>Responsável</th><th>Status</th><th>Pagamento</th>
  </tr></thead><tbody>${linhas || '<tr><td colspan="7" style="text-align:center;padding:30px;color:#868b97">Nenhuma mesa ocupada.</td></tr>'}</tbody></table>
</div></body></html>`)
}
