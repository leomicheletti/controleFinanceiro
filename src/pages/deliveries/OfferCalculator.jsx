import React, { useState } from 'react'
import { formatBRL } from '../../utils/format'
import { evaluateOffer } from '../../utils/delivery'

const VERDICTS = {
  boa: { label: 'Vale a pena', className: 'verdict-good', text: 'Paga igual ou melhor que a sua média.' },
  ok: { label: 'Dá para aceitar', className: 'verdict-ok', text: 'Dá lucro, mas um pouco abaixo da sua média.' },
  ruim: { label: 'Não compensa', className: 'verdict-bad', text: 'Bem abaixo da sua média, ou não cobre o combustível.' },
}

export default function OfferCalculator({ costPerKm, summary }) {
  const [form, setForm] = useState({ offer: '', km: '', minutes: '' })
  const offer = Number(form.offer)
  const km = Number(form.km)
  const ready = offer > 0 && km > 0

  const r = ready ? evaluateOffer({
    offer, km, minutes: Number(form.minutes) || 0, costPerKm,
    avgProfitPerKm: summary.profitPerKm, avgProfitPerHour: summary.profitPerHour,
  }) : null
  const v = r && VERDICTS[r.verdict]

  return (
    <div>
      <section className="panel">
        <h2>Vale a pena aceitar esta corrida?</h2>
        <p className="muted small">Some os km até a coleta, a entrega e a volta (se for voltar vazio).</p>
        <div className="calc-grid">
          <label className="field">Valor oferecido
            <input type="number" inputMode="decimal" step="0.01" min="0" value={form.offer} onChange={e => setForm({ ...form, offer: e.target.value })} />
          </label>
          <label className="field">Km totais
            <input type="number" inputMode="decimal" step="0.1" min="0" value={form.km} onChange={e => setForm({ ...form, km: e.target.value })} />
          </label>
          <label className="field">Tempo estimado (min, opcional)
            <input type="number" inputMode="numeric" step="1" min="0" value={form.minutes} onChange={e => setForm({ ...form, minutes: e.target.value })} />
          </label>
        </div>

        {!costPerKm && <p className="notice">Cadastre um abastecimento para a calculadora saber o custo por km.</p>}

        {r && (
          <div className={'verdict ' + v.className}>
            <div className="verdict-head">
              <strong>{v.label}</strong>
              <span className="num">{formatBRL(r.profit)} de lucro</span>
            </div>
            <p>{v.text}</p>
            <div className="verdict-stats">
              <span>Combustível: <strong>{formatBRL(r.fuelCost)}</strong></span>
              <span>Lucro/km: <strong>{r.perKm != null ? formatBRL(r.perKm) : '—'}</strong>{summary.profitPerKm != null && <span className="muted"> (média {formatBRL(summary.profitPerKm)})</span>}</span>
              {r.perHour != null && <span>Lucro/hora: <strong>{formatBRL(r.perHour)}</strong>{summary.profitPerHour != null && <span className="muted"> (média {formatBRL(summary.profitPerHour)})</span>}</span>}
              {r.keptPct != null && <span>Você fica com <strong>{Math.max(0, r.keptPct * 100).toFixed(0)}%</strong> do valor</span>}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
