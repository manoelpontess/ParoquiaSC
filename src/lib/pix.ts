// lib/pix.ts — Gerador de payload Pix estático (padrão EMVCo / BR Code)

function tlv(id: string, value: string) {
  return id + value.length.toString().padStart(2, '0') + value
}

function crc16(str: string) {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** Remove acentos e caracteres fora do ASCII (exigência do BR Code) */
function limpar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
}

/**
 * Normaliza a chave: CPF/CNPJ (com ou sem pontuação) vira só dígitos;
 * e-mail, telefone (+55...) e chave aleatória são mantidos.
 */
export function normalizarChavePix(chave: string) {
  const c = chave.trim()
  if (/^[\d.\-/\s]+$/.test(c)) return c.replace(/\D/g, '')
  return c
}

export function gerarPayloadPix({
  chave, nome, cidade, valor, txid,
}: { chave: string; nome: string; cidade: string; valor: number; txid: string }) {
  const txidLimpo = limpar(txid).replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***'
  const mai = tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('01', normalizarChavePix(chave)))
  const semCRC =
    tlv('00', '01') + mai + tlv('52', '0000') + tlv('53', '986') +
    tlv('54', valor.toFixed(2)) + tlv('58', 'BR') +
    tlv('59', limpar(nome).substring(0, 25) || 'Recebedor') +
    tlv('60', limpar(cidade).substring(0, 15) || 'Manaus') +
    tlv('62', tlv('05', txidLimpo)) + '6304'
  return semCRC + crc16(semCRC)
}
