'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type Mesa = {
  numero: number
  setor: string
  preco: number
  status: 'livre' | 'reservada' | 'vendida'
  venda_id?: string
  reservado_em?: string
}

export function useMesasRealtime(mesasIniciais: Mesa[]) {
  const [mesas, setMesas] = useState(mesasIniciais)

  // Atualiza as mesas iniciais se a propriedade mudar
  useEffect(() => {
    setMesas(mesasIniciais)
  }, [mesasIniciais])

  useEffect(() => {
    const supabase = createClient()
    const canal = supabase
      .channel('mesas-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mesas' },
        (payload) => {
          setMesas((atuais) =>
            atuais.map((m) => (m.numero === (payload.new as any).numero ? { ...m, ...payload.new } : m))
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [])

  return mesas
}
