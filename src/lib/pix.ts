// lib/pix.ts
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

export function gerarPayloadPix({
  chave, nome, cidade, valor, txid,
}: { chave: string; nome: string; cidade: string; valor: number; txid: string }) {
  const mai = tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('01', chave))
  const semCRC =
    tlv('00', '01') + mai + tlv('52', '0000') + tlv('53', '986') +
    tlv('54', valor.toFixed(2)) + tlv('58', 'BR') +
    tlv('59', nome.substring(0, 25)) + tlv('60', cidade.substring(0, 15)) +
    tlv('62', tlv('05', txid)) + '6304'
  return semCRC + crc16(semCRC)
}
