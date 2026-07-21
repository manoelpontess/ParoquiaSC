'use server'

import { createClient } from '@supabase/supabase-js'

export async function getListaVendas() {
  // Verificamos se as chaves existem para não quebrar localmente caso o usuário não as tenha configurado
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase URL ou Service Role Key ausentes.')
    return []
  }

  // Usamos o supabase-js puro com a SERVICE_ROLE_KEY para contornar o RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await supabase
    .from('mesas')
    .select(`
      numero,
      status,
      reservado_em,
      vendas (
        id,
        total,
        status,
        forma_pagamento,
        area_missionaria,
        compradores (
          nome,
          telefone
        )
      )
    `)
    .neq('status', 'livre')
    .order('numero', { ascending: true })

  if (error) {
    console.error('Erro ao buscar lista de vendas:', error)
    return []
  }

  return data
}

export async function atualizarVenda(vendaId: string, formaPagamento: string, totalDaVenda: number, areaMissionaria: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { success: false, error: 'Configuração do Supabase ausente' }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { error } = await supabase
    .from('vendas')
    .update({ 
      forma_pagamento: formaPagamento,
      total: totalDaVenda,
      area_missionaria: areaMissionaria
    })
    .eq('id', vendaId)

  if (error) {
    console.error('Erro ao atualizar forma de pagamento:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function liberarMesa(numeroMesa: number) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { success: false, error: 'Configuração do Supabase ausente' }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { error } = await supabase
    .from('mesas')
    .update({ 
      status: 'livre',
      venda_id: null,
      reservado_em: null 
    })
    .eq('numero', numeroMesa)

  if (error) {
    console.error('Erro ao liberar mesa:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getAllMesas() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await supabase
    .from('mesas')
    .select('numero, setor, preco, status, venda_id, reservado_em')
    .order('numero', { ascending: true })

  if (error) {
    console.error('Erro ao buscar todas as mesas:', error)
    return null
  }

  return data
}

export async function getListaCompletaParaExportacao() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return []
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await supabase
    .from('mesas')
    .select(`
      numero,
      status,
      vendas (
        id,
        total,
        status,
        forma_pagamento,
        area_missionaria,
        compradores (
          nome,
          telefone
        )
      )
    `)
    .order('numero', { ascending: true })

  if (error) {
    console.error('Erro ao buscar lista completa:', error)
    return []
  }

  return data
}

