export function formatWhatsAppNumber(phone: string): string {
  let num = phone.replace(/\D/g, '')
  
  if (num.startsWith('55')) {
    num = num.substring(2)
  }
  
  // Remove prefixos locais se a pessoa digitou 092 em vez de 92 (raro, mas possivel)
  if (num.length === 12 && num.startsWith('0')) {
    num = num.substring(1)
  }

  // Aqui `num` deve ter o DDD + Numero (ex: 92994358659 com 11 digitos, ou 9294358659 com 10 digitos)
  if (num.length === 11) {
    const ddd = parseInt(num.substring(0, 2))
    // Apenas remove o 9 extra para DDDs > 28
    if (ddd > 28 && num[2] === '9') {
      num = num.substring(0, 2) + num.substring(3)
    }
  }
  
  return `55${num}`
}
