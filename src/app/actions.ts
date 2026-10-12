'use server'

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  CONFIG_PADRAO,
  type Config,
  type FormaPagamento,
  type Mesa,
  type Responsavel,
  type Resultado,
} from '@/lib/types'

// ------------------------------------------------------------
//  Cliente Supabase com SERVICE ROLE (ignora RLS) — só no servidor
// ------------------------------------------------------------
function db(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

const SEM_BANCO = 'Banco de dados não configurado (verifique o .env.local).'

const falha = (error: string): { ok: false; error: string } => ({ ok: false, error })

// Supabase pode devolver relações como objeto ou array
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const um = <T,>(v: any): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

// ------------------------------------------------------------
//  LEITURA
// ------------------------------------------------------------
export async function getMesas(): Promise<Resultado<Mesa[]>> {
  const supabase = db()
  if (!supabase) return falha(SEM_BANCO)

  const { data, error } = await supabase
    .from('mesas')
    .select(`
      numero, status, preco, reservado_em,
      vendas (
        id, status, forma_pagamento, total, responsavel, created_at, pago_em,
        compradores ( nome, telefone )
      )
    `)
    .order('numero', { ascending: true })

  if (error) return falha(error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mesas: Mesa[] = (data ?? []).map((m: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = um<any>(m.vendas)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = v ? um<any>(v.compradores) : null
    return {
      numero: m.numero,
      status: m.status,
      preco: m.preco !== null ? Number(m.preco) : null,
      reservado_em: m.reservado_em,
      venda: v
        ? {
            id: v.id,
            status: v.status,
            forma_pagamento: v.forma_pagamento,
            total: Number(v.total) || 0,
            responsavel: v.responsavel,
            created_at: v.created_at,
            pago_em: v.pago_em,
            comprador: { nome: c?.nome ?? 'Sem nome', telefone: c?.telefone ?? null },
          }
        : null,
    }
  })

  return { ok: true, data: mesas }
}

export async function getConfig(): Promise<Resultado<Config>> {
  const supabase = db()
  if (!supabase) return { ok: true, data: CONFIG_PADRAO }

  const { data, error } = await supabase
    .from('configuracoes')
    .select('preco_mesa, pix_chave, pix_nome, pix_cidade')
    .eq('id', 1)
    .maybeSingle()

  if (error) return falha(error.message)
  if (!data) return { ok: true, data: CONFIG_PADRAO }

  return { ok: true, data: { ...data, preco_mesa: Number(data.preco_mesa) } }
}

export async function getResponsaveis(): Promise<Resultado<Responsavel[]>> {
  const supabase = db()
  if (!supabase) return { ok: true, data: [] }

  const { data, error } = await supabase
    .from('responsaveis')
    .select('id, nome')
    .order('nome', { ascending: true })

  if (error) return falha(error.message)
  return { ok: true, data: data ?? [] }
}

// ------------------------------------------------------------
//  VENDAS
// ------------------------------------------------------------
export async function registrarVenda(input: {
  mesas: number[]
  nome: string
  telefone: string
  responsavel: string
  formaPagamento: FormaPagamento | null
  pago: boolean
}): Promise<Resultado<{ vendaId: string }>> {
  const supabase = db()
  if (!supabase) return falha(SEM_BANCO)

  const { data, error } = await supabase.rpc('registrar_venda', {
    p_mesas: input.mesas,
    p_nome: input.nome,
    p_telefone: input.telefone,
    p_responsavel: input.responsavel,
    p_forma_pagamento: input.pago ? input.formaPagamento : null,
    p_pago: input.pago,
  })

  if (error) return falha(error.message)
  return { ok: true, data: { vendaId: data as string } }
}

export async function confirmarPagamento(
  vendaId: string,
  formaPagamento: FormaPagamento,
): Promise<Resultado> {
  const supabase = db()
  if (!supabase) return falha(SEM_BANCO)

  const { error } = await supabase.rpc('confirmar_pagamento', {
    p_venda_id: vendaId,
    p_forma_pagamento: formaPagamento,
  })
  if (error) return falha(error.message)
  return { ok: true, data: undefined }
}

export async function liberarMesa(numero: number): Promise<Resultado> {
  const supabase = db()
  if (!supabase) return falha(SEM_BANCO)

  const { error } = await supabase.rpc('liberar_mesa', { p_numero: numero })
  if (error) return falha(error.message)
  return { ok: true, data: undefined }
}

export async function cancelarVenda(vendaId: string): Promise<Resultado> {
  const supabase = db()
  if (!supabase) return falha(SEM_BANCO)

  const { error } = await supabase.rpc('cancelar_venda', { p_venda_id: vendaId })
  if (error) return falha(error.message)
  return { ok: true, data: undefined }
}

export async function editarVenda(
  vendaId: string,
  dados: { nome: string; telefone: string; responsavel: string },
): Promise<Resultado> {
  const supabase = db()
  if (!supabase) return falha(SEM_BANCO)
  if (!dados.nome.trim()) return falha('Informe o nome do comprador.')

  const { data: venda, error: errVenda } = await supabase
    .from('vendas')
    .update({ responsavel: dados.responsavel.trim() || null })
    .eq('id', vendaId)
    .select('comprador_id')
    .single()

  if (errVenda) return falha(errVenda.message)

  if (venda?.comprador_id) {
    const { error } = await supabase
      .from('compradores')
      .update({ nome: dados.nome.trim(), telefone: dados.telefone.trim() || null })
      .eq('id', venda.comprador_id)
    if (error) return falha(error.message)
  }

  return { ok: true, data: undefined }
}

// ------------------------------------------------------------
//  CONFIGURAÇÕES
// ------------------------------------------------------------
export async function salvarConfig(config: Config): Promise<Resultado> {
  const supabase = db()
  if (!supabase) return falha(SEM_BANCO)

  if (!(config.preco_mesa >= 0)) return falha('Valor da mesa inválido.')
  if (!config.pix_chave.trim()) return falha('Informe a chave Pix.')

  const { error } = await supabase
    .from('configuracoes')
    .upsert({
      id: 1,
      preco_mesa: config.preco_mesa,
      pix_chave: config.pix_chave.trim(),
      pix_nome: config.pix_nome.trim(),
      pix_cidade: config.pix_cidade.trim(),
      updated_at: new Date().toISOString(),
    })

  if (error) return falha(error.message)
  return { ok: true, data: undefined }
}

export async function adicionarResponsavel(nome: string): Promise<Resultado> {
  const supabase = db()
  if (!supabase) return falha(SEM_BANCO)

  const limpo = nome.trim().replace(/\s+/g, ' ')
  if (!limpo) return falha('Informe o nome da pessoa.')

  const { error } = await supabase.from('responsaveis').insert({ nome: limpo })
  if (error) {
    if (error.code === '23505') return falha('Essa pessoa já está cadastrada.')
    return falha(error.message)
  }
  return { ok: true, data: undefined }
}

export async function removerResponsavel(id: string): Promise<Resultado> {
  const supabase = db()
  if (!supabase) return falha(SEM_BANCO)

  const { error } = await supabase.from('responsaveis').delete().eq('id', id)
  if (error) return falha(error.message)
  return { ok: true, data: undefined }
}
