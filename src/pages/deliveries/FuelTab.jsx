import React from 'react'
import { supabase } from '../../supabaseClient'
import { formatBRL, formatDate } from '../../utils/format'

export default function FuelTab({ fuelUps, kmPerLiter, onAdd, onLaunch, onChanged }) {
  async function remove(f) {
    if (!confirm('Excluir este abastecimento?' + (f.transaction_id ? ' A despesa já lançada nas Transações continua lá.' : ''))) return
    await supabase.from('fuel_ups').delete().eq('id', f.id)
    onChanged()
  }

  return (
    <div>
      <section className="panel fuel-summary">
        <div>
          <span className="stat-label">Consumo {kmPerLiter.measured ? 'medido' : 'estimado'}</span>
          <span className="stat-value">{kmPerLiter.value ? `${kmPerLiter.value.toFixed(1)} km/l` : '—'}</span>
        </div>
        <button className="btn-primary" onClick={onAdd}>+ Abastecimento</button>
      </section>
      {!kmPerLiter.measured && (
        <p className="muted small">Para medir o km/l real: complete o tanque, anote o km do painel e, no próximo abastecimento de tanque cheio, registre de novo. O app calcula o consumo entre os dois.</p>
      )}

      <div className="ledger compact">
        {fuelUps.length === 0 ? <p className="muted empty-pad">Nenhum abastecimento registrado.</p> : fuelUps.map(f => (
          <div key={f.id} className="tx-item">
            <div className="tx-item-main">
              <div className="tx-item-title">
                <span className="tx-desc">{Number(f.liters).toLocaleString('pt-BR')} L · {formatBRL(Number(f.total_cost) / Number(f.liters))}/L</span>
                {f.full_tank && <span className="fixed-badge">tanque cheio</span>}
              </div>
              <div className="tx-item-meta">
                <span>{formatDate(f.date)}</span><span className="dot">•</span>
                <span>{Number(f.odometer).toLocaleString('pt-BR')} km</span>
                {f.transaction_id
                  ? <><span className="dot">•</span><span className="status-pill ok-pill">no financeiro</span></>
                  : <><span className="dot">•</span><button className="link-btn" onClick={() => onLaunch(f)}>Lançar no financeiro</button></>}
              </div>
            </div>
            <div className="tx-item-right">
              <span className="num expense">{formatBRL(f.total_cost)}</span>
              <button className="btn-icon" onClick={() => remove(f)} title="Excluir">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
