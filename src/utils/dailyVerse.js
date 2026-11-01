const verses = [
  { text: 'O Senhor é o meu pastor; nada me faltará.', reference: 'Salmos 23:1' },
  { text: 'Tudo posso naquele que me fortalece.', reference: 'Filipenses 4:13' },
  { text: 'O amor é paciente, o amor é bondoso.', reference: '1 Coríntios 13:4' },
  { text: 'A resposta branda desvia o furor.', reference: 'Provérbios 15:1' },
  { text: 'A alegria do Senhor é a vossa força.', reference: 'Neemias 8:10' },
  { text: 'Entrega o teu caminho ao Senhor; confia nele.', reference: 'Salmos 37:5' },
  { text: 'O coração alegre aformoseia o rosto.', reference: 'Provérbios 15:13' },
  { text: 'Não temas, porque eu sou contigo.', reference: 'Isaías 41:10' },
  { text: 'A fé é o firme fundamento das coisas que se esperam.', reference: 'Hebreus 11:1' },
  { text: 'O Senhor é a minha luz e a minha salvação.', reference: 'Salmos 27:1' },
  { text: 'Em todo o tempo ama o amigo.', reference: 'Provérbios 17:17' },
  { text: 'A esperança não traz confusão.', reference: 'Romanos 5:5' },
]

function diaDoAno(date) {
  const inicio = Date.UTC(date.getFullYear(), 0, 0)
  const hoje = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor((hoje - inicio) / 86_400_000)
}

function hashUsuario(userId) {
  let hash = 0
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0
  }
  return hash
}

export function getDailyVerse(userId, date = new Date()) {
  const index = (diaDoAno(date) + hashUsuario(userId || 'visitante')) % verses.length
  return verses[index]
}

export function millisecondsUntilLocalMidnight(date = new Date()) {
  const tomorrow = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  return tomorrow.getTime() - date.getTime()
}
