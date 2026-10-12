// Tipos compartilhados entre servidor e cliente

export const TOTAL_MESAS = 50
export const NOME_EVENTO = 'Passeio Paroquial'
export const NOME_PAROQUIA = 'Paróquia Santa Cruz'

export type StatusMesa = 'livre' | 'reservada' | 'vendida'
export type FormaPagamento = 'pix' | 'dinheiro' | 'debito' | 'credito'

export type Venda = {
  id: string
  status: 'reservada' | 'pago'
  forma_pagamento: FormaPagamento | null
  total: number
  responsavel: string | null
  created_at: string
  pago_em: string | null
  comprador: { nome: string; telefone: string | null }
}

export type Mesa = {
  numero: number
  status: StatusMesa
  preco: number | null
  reservado_em: string | null
  venda: Venda | null
}

export type Config = {
  preco_mesa: number
  pix_chave: string
  pix_nome: string
  pix_cidade: string
}

export type Responsavel = {
  id: string
  nome: string
}

/** Uma venda agrupada com todas as suas mesas */
export type VendaAgrupada = Venda & { mesas: number[] }

export type Resultado<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export const CONFIG_PADRAO: Config = {
  preco_mesa: 15,
  pix_chave: '44539002287',
  pix_nome: 'Paroquia Santa Cruz',
  pix_cidade: 'Manaus',
}

export const FORMAS_PAGAMENTO: { id: FormaPagamento; label: string }[] = [
  { id: 'pix', label: 'Pix' },
  { id: 'dinheiro', label: 'Dinheiro' },
  { id: 'debito', label: 'Débito' },
  { id: 'credito', label: 'Crédito' },
]

export function labelForma(forma: FormaPagamento | null | undefined) {
  return FORMAS_PAGAMENTO.find(f => f.id === forma)?.label ?? '—'
}

/** Agrupa as mesas ocupadas por venda */
export function agruparVendas(mesas: Mesa[]): VendaAgrupada[] {
  const mapa = new Map<string, VendaAgrupada>()
  for (const m of mesas) {
    if (!m.venda) continue
    const atual = mapa.get(m.venda.id)
    if (atual) atual.mesas.push(m.numero)
    else mapa.set(m.venda.id, { ...m.venda, mesas: [m.numero] })
  }
  return Array.from(mapa.values())
    .map(v => ({ ...v, mesas: v.mesas.sort((a, b) => a - b) }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}
