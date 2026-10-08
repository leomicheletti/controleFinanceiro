import React from 'react'
import { formatBRL } from '../../utils/format'
import { formatHours } from '../../utils/delivery'

const brlOrDash = v => (v == null ? '—' : formatBRL(v))
const pct = v => (v == null ? '—' : `${(v * 100).toFixed(0)}%`)

export default function SummaryTab({ summary, kmPerLiter, pendingCount, onLaunch }) {
  const s = summary

  if (s.shifts === 0) {
    return <p className="muted">Nenhuma jornada encerrada neste período. Inicie uma jornada para começar a ver seus números.</p>
  }

  const best = s.platforms.find(p => p.profitPerHour != null)
  const worst = [...s.platforms].reverse().find(p => p.profitPerHour != null)

  return (
    <div>
      {s.missingFuel && (
        <p className="notice">Cadastre ao menos um abastecimento para o app calcular o custo de combustível. Enquanto isso, o lucro abaixo considera combustível zero.</p>
      )}

      <section className="cards-row">
        <div className="stat-card income">
          <span className="stat-label">Lucro líquido</span>
          <span className="stat-value">{formatBRL(s.profit)}</span>
          <span className="stat-sub">margem {pct(s.margin)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Lucro por hora</span>
          <span className="stat-value">{brlOrDash(s.profitPerHour)}</span>
          <span className="stat-sub">{formatHours(s.hours)} trabalhadas</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Lucro por km</span>
          <span className="stat-value">{brlOrDash(s.profitPerKm)}</span>
          <span className="stat-sub">{s.km.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km rodados</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Lucro por entrega</span>
          <span className="stat-value">{brlOrDash(s.profitPerDelivery)}</span>
          <span className="stat-sub">{s.deliveries} entregas · {s.shifts} jornada(s)</span>
        </div>
      </section>

      <section className="panel">
        <h2>De onde veio e para onde foi</h2>
        <div className="breakdown">
          <div><span>Ganhos das plataformas</span><span className="num income">{formatBRL(s.earnings - s.tips)}</span></div>
          {s.tips > 0 && <div><span>Gorjetas</span><span className="num income">{formatBRL(s.tips)}</span></div>}
          <div><span>Combustível ({brlOrDash(s.costPerKm)}/km)</span><span className="num expense">− {formatBRL(s.fuelCost)}</span></div>
          <div><span>Gastos das jornadas</span><span className="num expense">− {formatBRL(s.expenses)}</span></div>
          <div className="breakdown-total"><span>Lucro líquido</span><span className="num">{formatBRL(s.profit)}</span></div>
        </div>
        <p className="muted small">
          Consumo usado: {kmPerLiter.value ? `${kmPerLiter.value.toFixed(1)} km/l` : '—'}
          {kmPerLiter.measured ? ` (medido em ${kmPerLiter.segments} tanque(s) cheio(s))` : ' (estimado — registre abastecimentos com tanque cheio para medir o real)'}.
          {' '}Faturamento por km: {brlOrDash(s.earningsPerKm)}.
        </p>
      </section>

      <section className="panel">
        <h2>Comparação entre plataformas</h2>
        {best && worst && best !== worst && (
          <p className="insight-line">
            <strong>{best.platform}</strong> rendeu {formatBRL(best.profitPerHour)}/h, contra {formatBRL(worst.profitPerHour)}/h de <strong>{worst.platform}</strong>.
          </p>
        )}
        <div className="ledger platform-table">
          <div className="tx-item settle-head">
            <span className="tx-item-main">Plataforma</span>
            <span className="num">Lucro</span>
            <span className="num">R$/hora</span>
            <span className="num">R$/km</span>
            <span className="num">R$/entrega</span>
          </div>
          {s.platforms.map(p => (
            <div key={p.platform} className="tx-item">
              <span className="tx-item-main"><strong>{p.platform}</strong><span className="muted small">{p.deliveries} entregas · faturou {formatBRL(p.earnings)}</span></span>
              <span className="num" data-label="Lucro">{formatBRL(p.profit)}</span>
              <span className="num" data-label="R$/hora">{brlOrDash(p.profitPerHour)}</span>
              <span className="num" data-label="R$/km">{brlOrDash(p.profitPerKm)}</span>
              <span className="num" data-label="R$/entrega">{brlOrDash(p.profitPerDelivery)}</span>
            </div>
          ))}
        </div>
        <p className="muted small">Numa jornada com mais de uma plataforma, km, horas e custos são divididos pelo número de entregas — o que pode distorcer plataformas com muitos pacotes por rota. Para uma comparação exata, encerre a jornada e abra outra ao trocar de plataforma.</p>
      </section>

      <section className="panel launch-panel">
        <div>
          <h2>Lançar no financeiro</h2>
          <p className="muted small">
            {pendingCount > 0
              ? `${pendingCount} jornada(s) deste período ainda não estão nas Transações.`
              : 'Todas as jornadas deste período já foram lançadas nas Transações.'}
          </p>
        </div>
        {pendingCount > 0 && <button className="btn-primary" onClick={onLaunch}>Lançar ganhos</button>}
      </section>
    </div>
  )
}
