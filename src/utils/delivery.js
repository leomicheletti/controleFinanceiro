// Cálculos do módulo de entregas.
//
// O carro também é usado fora das entregas, então o custo de combustível de
// uma jornada NÃO é o que foi abastecido, e sim:
//   km rodados na jornada × custo por km
// onde custo por km = preço do litro ÷ km/l real.

export const PLATFORMS = ['Lalamove', 'Mercado Livre', 'Shopee', 'iFood', 'Uber Flash', '99Entrega', 'Loggi', 'Outro']
export const EXPENSE_KINDS = ['Pedágio', 'Estacionamento', 'Alimentação', 'Lavagem', 'Outro']

const sum = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0)
const safeDiv = (a, b) => (b > 0 ? a / b : null)

// km/l real: soma dos km entre tanques cheios ÷ litros colocados nesse intervalo.
// Abastecimentos parciais no meio do caminho entram nos litros do trecho.
export function computeKmPerLiter(fuelUps, fallback) {
  const sorted = [...fuelUps].sort((a, b) => Number(a.odometer) - Number(b.odometer))
  let km = 0, liters = 0, segments = 0
  let lastFull = null, pendingLiters = 0
  for (const f of sorted) {
    if (lastFull) pendingLiters += Number(f.liters)
    if (f.full_tank) {
      if (lastFull && pendingLiters > 0 && Number(f.odometer) > Number(lastFull.odometer)) {
        km += Number(f.odometer) - Number(lastFull.odometer)
        liters += pendingLiters
        segments++
      }
      lastFull = f
      pendingLiters = 0
    }
  }
  if (segments === 0) return { value: Number(fallback) || null, measured: false, segments: 0 }
  return { value: km / liters, measured: true, segments }
}

// Preço do litro vigente numa data: o do abastecimento mais recente até ela
// (ou o primeiro registrado, se a jornada for anterior a todos).
export function priceAt(fuelUps, isoDate) {
  if (fuelUps.length === 0) return null
  const byDate = [...fuelUps].sort((a, b) => a.date.localeCompare(b.date))
  const day = isoDate.slice(0, 10)
  let chosen = byDate[0]
  for (const f of byDate) if (f.date <= day) chosen = f
  return Number(chosen.total_cost) / Number(chosen.liters)
}

export function shiftMetrics(shift, { fuelUps, kmPerLiter }) {
  const earnings = sum(shift.delivery_earnings || [], e => Number(e.amount) + Number(e.tips))
  const tips = sum(shift.delivery_earnings || [], e => Number(e.tips))
  const deliveries = sum(shift.delivery_earnings || [], e => Number(e.deliveries))
  const expenses = sum(shift.delivery_expenses || [], e => Number(e.amount))
  const closed = !!shift.end_time && shift.end_odometer != null
  const km = closed ? Number(shift.end_odometer) - Number(shift.start_odometer) : 0
  const end = shift.end_time ? new Date(shift.end_time) : new Date()
  const hours = Math.max(0, (end - new Date(shift.start_time)) / 3600000)
  const price = priceAt(fuelUps, shift.start_time)
  const costPerKm = price && kmPerLiter ? price / kmPerLiter : null
  const fuelCost = costPerKm ? km * costPerKm : 0
  const profit = earnings - fuelCost - expenses
  return { earnings, tips, deliveries, expenses, km, hours, costPerKm, fuelCost, profit, closed, missingFuel: closed && km > 0 && !costPerKm }
}

// Junta as métricas de várias jornadas encerradas em indicadores do período
export function summarize(shifts, ctx) {
  const closed = shifts.filter(s => s.end_time && s.end_odometer != null)
  const ms = closed.map(s => ({ shift: s, m: shiftMetrics(s, ctx) }))
  const t = {
    shifts: closed.length,
    earnings: sum(ms, x => x.m.earnings),
    tips: sum(ms, x => x.m.tips),
    deliveries: sum(ms, x => x.m.deliveries),
    expenses: sum(ms, x => x.m.expenses),
    fuelCost: sum(ms, x => x.m.fuelCost),
    km: sum(ms, x => x.m.km),
    hours: sum(ms, x => x.m.hours),
    missingFuel: ms.some(x => x.m.missingFuel),
  }
  t.profit = t.earnings - t.fuelCost - t.expenses
  t.margin = safeDiv(t.profit, t.earnings)
  t.profitPerHour = safeDiv(t.profit, t.hours)
  t.profitPerKm = safeDiv(t.profit, t.km)
  t.profitPerDelivery = safeDiv(t.profit, t.deliveries)
  t.earningsPerKm = safeDiv(t.earnings, t.km)
  t.costPerKm = safeDiv(t.fuelCost, t.km)
  t.platforms = byPlatform(ms)
  return t
}

// Numa jornada com várias plataformas, km, horas, combustível e gastos são
// rateados entre elas pelo nº de entregas (ou pelo valor, se não houver contagem).
function byPlatform(ms) {
  const map = {}
  for (const { shift, m } of ms) {
    const list = shift.delivery_earnings || []
    const totalDeliveries = sum(list, e => Number(e.deliveries))
    const totalValue = sum(list, e => Number(e.amount) + Number(e.tips))
    for (const e of list) {
      const value = Number(e.amount) + Number(e.tips)
      const share = totalDeliveries > 0 ? Number(e.deliveries) / totalDeliveries
        : totalValue > 0 ? value / totalValue : 1 / list.length
      const p = map[e.platform] ||= { platform: e.platform, earnings: 0, deliveries: 0, km: 0, hours: 0, costs: 0 }
      p.earnings += value
      p.deliveries += Number(e.deliveries)
      p.km += m.km * share
      p.hours += m.hours * share
      p.costs += (m.fuelCost + m.expenses) * share
    }
  }
  return Object.values(map).map(p => {
    const profit = p.earnings - p.costs
    return {
      ...p, profit,
      profitPerHour: safeDiv(profit, p.hours),
      profitPerKm: safeDiv(profit, p.km),
      profitPerDelivery: safeDiv(profit, p.deliveries),
    }
  }).sort((a, b) => (b.profitPerHour ?? -Infinity) - (a.profitPerHour ?? -Infinity))
}

// Simulação de uma oferta de corrida
export function evaluateOffer({ offer, km, minutes, costPerKm, avgProfitPerKm, avgProfitPerHour }) {
  const fuelCost = km * (costPerKm || 0)
  const profit = offer - fuelCost
  const perKm = safeDiv(profit, km)
  const perHour = minutes > 0 ? profit / (minutes / 60) : null
  // Compara com a média do período; sem histórico, só olha se dá lucro
  const refs = []
  if (avgProfitPerKm != null && perKm != null) refs.push(perKm / avgProfitPerKm)
  if (avgProfitPerHour != null && perHour != null) refs.push(perHour / avgProfitPerHour)
  const ratio = refs.length ? Math.min(...refs) : null
  const verdict = profit <= 0 ? 'ruim' : ratio == null ? 'ok' : ratio >= 1 ? 'boa' : ratio >= 0.75 ? 'ok' : 'ruim'
  return { fuelCost, profit, perKm, perHour, verdict, keptPct: safeDiv(profit, offer) }
}

export function periodRange(period) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let end = null
  if (period === 'semana') {
    const dow = (start.getDay() + 6) % 7 // segunda = 0
    start.setDate(start.getDate() - dow)
  } else if (period === 'mes') {
    start.setDate(1)
  } else if (period === 'mes_passado') {
    start.setDate(1); start.setMonth(start.getMonth() - 1)
    end = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (period === '90d') {
    start.setDate(start.getDate() - 89)
  }
  return { start: start.toISOString(), end: end ? end.toISOString() : null }
}

export function toLocalInput(date = new Date()) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export function formatHours(h) {
  if (h == null) return '—'
  const total = Math.round(h * 60)
  return `${Math.floor(total / 60)}h${String(total % 60).padStart(2, '0')}`
}
