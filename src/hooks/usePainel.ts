'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getConfig, getMesas, getResponsaveis } from '@/app/actions'
import { CONFIG_PADRAO, TOTAL_MESAS, type Config, type Mesa, type Responsavel } from '@/lib/types'

const mesasVazias: Mesa[] = Array.from({ length: TOTAL_MESAS }, (_, i) => ({
  numero: i + 1,
  status: 'livre',
  preco: null,
  reservado_em: null,
  venda: null,
}))

/**
 * Estado central do painel: mesas (com venda/comprador), configurações e responsáveis.
 * Atualiza por polling (5s) + Supabase Realtime quando disponível.
 */
export function usePainel() {
  const [mesas, setMesas] = useState<Mesa[]>(mesasVazias)
  const [config, setConfig] = useState<Config>(CONFIG_PADRAO)
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null)
  const emAndamento = useRef(false)

  const recarregarMesas = useCallback(async () => {
    if (emAndamento.current) return
    emAndamento.current = true
    try {
      const res = await getMesas()
      if (res.ok) {
        if (res.data.length > 0) setMesas(res.data)
        setErro(null)
        setAtualizadoEm(new Date())
      } else {
        setErro(res.error)
      }
    } finally {
      emAndamento.current = false
      setCarregando(false)
    }
  }, [])

  const recarregarConfig = useCallback(async () => {
    const res = await getConfig()
    if (res.ok) setConfig(res.data)
  }, [])

  const recarregarResponsaveis = useCallback(async () => {
    const res = await getResponsaveis()
    if (res.ok) setResponsaveis(res.data)
  }, [])

  useEffect(() => {
    // Carga inicial assíncrona: os setState ocorrem após o await
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recarregarMesas()
    recarregarConfig()
    recarregarResponsaveis()

    const intervalo = setInterval(recarregarMesas, 5000)
    const aoFocar = () => recarregarMesas()
    window.addEventListener('focus', aoFocar)

    let limparCanal: (() => void) | undefined
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = createClient()
      const canal = supabase
        .channel('mesas-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => recarregarMesas())
        .subscribe()
      limparCanal = () => { supabase.removeChannel(canal) }
    }

    return () => {
      clearInterval(intervalo)
      window.removeEventListener('focus', aoFocar)
      limparCanal?.()
    }
  }, [recarregarMesas, recarregarConfig, recarregarResponsaveis])

  return {
    mesas,
    config,
    responsaveis,
    erro,
    carregando,
    atualizadoEm,
    recarregarMesas,
    recarregarConfig,
    recarregarResponsaveis,
  }
}
