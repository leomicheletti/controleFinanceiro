const PALETTE = [
  '#7C5CFC', '#22D3EE', '#34D399', '#FBBF54', '#FB7185',
  '#60A5FA', '#F472B6', '#A3E635', '#F97316', '#38BDF8',
  '#C084FC', '#4ADE80',
]

// Gera sempre a mesma cor para o mesmo id/nome de categoria (hash simples),
// assim cada categoria fica visualmente distinta sem precisar guardar
// a cor manualmente no banco.
export function getCategoryColor(key) {
  const str = String(key || 'sem-categoria')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % PALETTE.length
  return PALETTE[index]
}
