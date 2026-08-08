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

export async function getTelefonesCompradores() {
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
        compradores (
          nome,
          telefone
        )
      )
    `)
    .neq('status', 'livre')
    .order('numero', { ascending: true })

  if (error) {
    console.error('Erro ao buscar telefones dos compradores:', error)
    return []
  }

  // Agrupa mesas por comprador (um comprador pode ter várias mesas)
  const mapaCompradores: Record<string, { nome: string; telefone: string; mesas: number[] }> = {}

  for (const mesa of data as any[]) {
    const comprador = mesa.vendas?.compradores
    if (!comprador?.telefone) continue

    const chave = comprador.telefone.replace(/\D/g, '')
    if (!chave) continue

    if (!mapaCompradores[chave]) {
      mapaCompradores[chave] = {
        nome: comprador.nome || 'Comprador',
        telefone: comprador.telefone,
        mesas: [],
      }
    }
    mapaCompradores[chave].mesas.push(mesa.numero)
  }

  return Object.values(mapaCompradores)
}

export async function atualizarTelefoneComprador(vendaId: string, novoTelefone: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { success: false, error: 'Configuração do Supabase ausente' }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Busca o comprador_id a partir da venda
  const { data: venda, error: errVenda } = await supabase
    .from('vendas')
    .select('comprador_id')
    .eq('id', vendaId)
    .single()

  if (errVenda || !venda?.comprador_id) {
    return { success: false, error: 'Venda ou comprador não encontrado' }
  }

  const { error } = await supabase
    .from('compradores')
    .update({ telefone: novoTelefone })
    .eq('id', venda.comprador_id)

  if (error) {
    console.error('Erro ao atualizar telefone:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function confirmarPagamentoReserva(vendaId: string, numeroMesa: number, formaPagamento: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { success: false, error: 'Configuração do Supabase ausente' }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Busca o preço real da mesa no banco para garantir o total correto
  const { data: mesaData, error: errPreco } = await supabase
    .from('mesas')
    .select('preco')
    .eq('numero', numeroMesa)
    .single()

  if (errPreco || !mesaData) {
    return { success: false, error: errPreco?.message || 'Mesa não encontrada' }
  }

  const totalCorreto = mesaData.preco

  // Confirma pagamento na venda atualizando também o total com o preço correto da mesa
  const { error: errVenda } = await supabase
    .from('vendas')
    .update({ status: 'pago', forma_pagamento: formaPagamento, total: totalCorreto })
    .eq('id', vendaId)

  if (errVenda) {
    return { success: false, error: errVenda.message }
  }

  // Atualiza status da mesa para vendida
  const { error: errMesa } = await supabase
    .from('mesas')
    .update({ status: 'vendida' })
    .eq('numero', numeroMesa)

  if (errMesa) {
    return { success: false, error: errMesa.message }
  }

  return { success: true }
}



