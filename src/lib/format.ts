export const moeda = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const dataHora = (iso: string | null | undefined) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const numMesa = (n: number) => n.toString().padStart(2, '0')

export const listaMesas = (mesas: number[]) =>
  [...mesas].sort((a, b) => a - b).map(numMesa).join(', ')

export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? ''

/** Formata CPF: 44539002287 → 445.390.022-87 */
export const formatarCPF = (cpf: string) => {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/** Identifica o tipo de chave Pix e formata para exibição */
export const exibirChavePix = (chave: string): { tipo: string; valor: string } => {
  const c = chave.trim()
  const digitos = c.replace(/\D/g, '')
  if (/^[\d.\-/\s]+$/.test(c) && digitos.length === 11) return { tipo: 'CPF', valor: formatarCPF(digitos) }
  if (/^[\d.\-/\s]+$/.test(c) && digitos.length === 14) {
    return { tipo: 'CNPJ', valor: digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') }
  }
  if (c.includes('@')) return { tipo: 'E-mail', valor: c }
  if (c.startsWith('+')) return { tipo: 'Telefone', valor: c }
  return { tipo: 'Chave aleatória', valor: c }
}

/** Máscara de telefone brasileiro enquanto digita */
export const mascaraTelefone = (valor: string) => {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Escapa texto para inserir em HTML gerado (impressões) */
export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
