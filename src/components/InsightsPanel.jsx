import React from 'react'

const ICONS = { alerta: '⚠', atencao: '◐', positivo: '✓' }

export default function InsightsPanel({ insights }) {
  if (!insights || insights.length === 0) return null

  return (
    <section className="panel insights-panel">
      <h2>Insights financeiros</h2>
      <p className="muted small insights-sub">Análise automática dos seus lançamentos, orçamentos e metas.</p>
      <div className="insights-list">
        {insights.map((ins, i) => (
          <div key={i} className={'insight-card insight-' + ins.level}>
            <span className="insight-icon">{ICONS[ins.level]}</span>
            <div>
              <strong>{ins.title}</strong>
              <p>{ins.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
