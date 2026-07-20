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
        status,
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
