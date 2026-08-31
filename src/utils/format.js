export function formatBRL(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}
