import React, { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { formatBRL } from '../../utils/format'
import { formatHours, shiftMetrics } from '../../utils/delivery'

function formatDay(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// Cartão de uma jornada: resumo sempre visível e detalhes (ganhos/gastos) ao tocar.
export default function ShiftCard({ shift, ctx, open: initiallyOpen = false, onAddEarning, onAddExpense, onEnd, onChanged }) {
  const [open, setOpen] = useState(initiallyOpen)
  const m = shiftMetrics(shift, ctx)
  const active = !shift.end_time
  const launched = shift.income_transaction_id || shift.expense_transaction_id

  async function removeItem(table, id) {
    if (!confirm('Excluir este lançamento?')) return
    await supabase.from(table).delete().eq('id', id)
    onChanged()
  }

  async function removeShift() {
    if (!confirm('Excluir esta jornada com todos os ganhos e gastos dela?' + (launched ? ' O que já foi lançado nas Transações continua lá.' : ''))) return
    await supabase.from('delivery_shifts').delete().eq('id', shift.id)
    onChanged()
  }

  return (
    <div className={'shift-card' + (active ? ' active' : '')}>
      <button type="button" className="shift-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <div className="shift-head-main">
          <span className="shift-title">
            {active && <span className="live-dot" aria-hidden="true" />}
            {active ? 'Jornada em andamento' : formatDay(shift.start_time)}
            {launched && <span className="fixed-badge">lançada</span>}
          </span>
          <span className="tx-item-meta">
            <span>{formatTime(shift.start_time)}{shift.end_time && ` – ${formatTime(shift.end_time)}`}</span>
            <span className="dot">•</span><span>{formatHours(m.hours)}</span>
            {!active && <><span className="dot">•</span><span>{m.km.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km</span></>}
            <span className="dot">•</span><span>{m.deliveries} entrega(s)</span>
          </span>
        </div>
        <div className="shift-head-values">
          <span className="num income">{formatBRL(m.earnings)}</span>
          {!active && <span className={'num small-num ' + (m.profit >= 0 ? '' : 'expense')}>lucro {formatBRL(m.profit)}</span>}
        </div>
        <span className={'chevron' + (open ? ' open' : '')} aria-hidden="true">›</span>
      </button>

      {active && (
        <div className="shift-actions">
          <button className="btn-primary" onClick={onAddEarning}>+ Ganho</button>
          <button className="btn-ghost" onClick={onAddExpense}>+ Gasto</button>
          <button className="btn-ghost" onClick={onEnd}>Encerrar</button>
        </div>
      )}

      {open && (
        <div className="shift-details">
          {(shift.delivery_earnings || []).length === 0 && (shift.delivery_expenses || []).length === 0 && (
            <p className="muted small">Nenhum ganho ou gasto lançado.</p>
          )}
          {(shift.delivery_earnings || []).map(e => (
            <div key={e.id} className="detail-row">
              <span>{e.platform} <span className="muted small">· {e.deliveries} entrega(s){Number(e.tips) > 0 && ` · gorjeta ${formatBRL(e.tips)}`}</span></span>
              <span className="num income">+ {formatBRL(Number(e.amount) + Number(e.tips))}</span>
              <button className="btn-icon" onClick={() => removeItem('delivery_earnings', e.id)} title="Excluir">✕</button>
            </div>
          ))}
          {(shift.delivery_expenses || []).map(e => (
            <div key={e.id} className="detail-row">
              <span>{e.kind}{e.description && <span className="muted small"> · {e.description}</span>}</span>
              <span className="num expense">− {formatBRL(e.amount)}</span>
              <button className="btn-icon" onClick={() => removeItem('delivery_expenses', e.id)} title="Excluir">✕</button>
            </div>
          ))}
          {!active && (
            <div className="detail-row muted">
              <span>Combustível ({m.costPerKm ? `${formatBRL(m.costPerKm)}/km` : 'sem abastecimento cadastrado'})</span>
              <span className="num expense">− {formatBRL(m.fuelCost)}</span>
              <span className="btn-icon-spacer" />
            </div>
          )}
          <div className="shift-detail-actions">
            {!active && <button className="btn-ghost small" onClick={onAddEarning}>+ Ganho</button>}
            {!active && <button className="btn-ghost small" onClick={onAddExpense}>+ Gasto</button>}
            <button className="btn-ghost small danger" onClick={removeShift}>Excluir jornada</button>
          </div>
        </div>
      )}
    </div>
  )
}
