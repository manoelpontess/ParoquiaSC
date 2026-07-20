'use client'
import { useEffect, useRef, useState } from 'react'
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
  // Usamos uma ref para evitar que a mudança de mesasIniciais
  // (que é recriado a cada render do pai) cause re-renders em cascata
  const inicializadoRef = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    // Busca o estado real do banco ao montar
    // (garante que mesas já vendidas antes do carregamento apareçam corretamente)
    const buscarMesas = async () => {
      const { data, error } = await supabase
        .from('mesas')
        .select('numero, setor, preco, status, venda_id, reservado_em')
        .order('numero', { ascending: true })

      if (!error && data && data.length > 0) {
        setMesas(data as Mesa[])
      }
      inicializadoRef.current = true
    }

    buscarMesas()

    // Subscreve ao canal realtime para receber atualizações em tempo real
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Executar apenas uma vez ao montar

  return mesas
}
