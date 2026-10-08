import React, { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { formatBRL } from '../../utils/format'
import { EXPENSE_KINDS, PLATFORMS, toLocalInput } from '../../utils/delivery'

// Todos os formulários do módulo seguem o mesmo contrato:
// salvam no Supabase e chamam onDone() para fechar a janela e recarregar.

function useSubmit(onDone) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function run(fn) {
    setSaving(true)
    setError('')
    const { error: err } = (await fn()) || {}
    setSaving(false)
    if (err) setError('Não foi possível salvar: ' + err.message)
    else onDone()
  }
  return { saving, error, run }
}

function Field({ label, children }) {
  return <label className="field">{label}{children}</label>
}

export function StartShiftForm({ lastOdometer, onDone }) {
  const { user } = useAuth()
  const [form, setForm] = useState({ start_time: toLocalInput(), start_odometer: lastOdometer ?? '' })
  const { saving, error, run } = useSubmit(onDone)

  return (
    <form className="inline-form stacked" onSubmit={e => {
      e.preventDefault()
      run(() => supabase.from('delivery_shifts').insert({
        user_id: user.id,
        start_time: new Date(form.start_time).toISOString(),
        start_odometer: Number(form.start_odometer),
      }))
    }}>
      <Field label="Km do painel agora">
        <input type="number" inputMode="decimal" step="0.1" min="0" value={form.start_odometer} onChange={e => setForm({ ...form, start_odometer: e.target.value })} required autoFocus />
      </Field>
      <Field label="Início">
        <input type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} required />
      </Field>
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={saving}>Iniciar jornada</button>
    </form>
  )
}

export function EndShiftForm({ shift, onDone }) {
  const [form, setForm] = useState({ end_time: toLocalInput(), end_odometer: '' })
  const { saving, error, run } = useSubmit(onDone)
  const km = form.end_odometer ? Number(form.end_odometer) - Number(shift.start_odometer) : null

  return (
    <form className="inline-form stacked" onSubmit={e => {
      e.preventDefault()
      if (km < 0) return
      run(() => supabase.from('delivery_shifts').update({
        end_time: new Date(form.end_time).toISOString(),
        end_odometer: Number(form.end_odometer),
      }).eq('id', shift.id))
    }}>
      <Field label={`Km do painel agora (início: ${Number(shift.start_odometer).toLocaleString('pt-BR')})`}>
        <input type="number" inputMode="decimal" step="0.1" min={shift.start_odometer} value={form.end_odometer} onChange={e => setForm({ ...form, end_odometer: e.target.value })} required autoFocus />
      </Field>
      {km != null && <p className={km < 0 ? 'auth-error' : 'muted small'}>{km < 0 ? 'O km final não pode ser menor que o inicial.' : `${km.toLocaleString('pt-BR')} km rodados nesta jornada`}</p>}
      <Field label="Fim">
        <input type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} required />
      </Field>
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={saving}>Encerrar jornada</button>
    </form>
  )
}

export function EarningForm({ shift, onDone }) {
  const { user } = useAuth()
  const [form, setForm] = useState({ platform: PLATFORMS[0], amount: '', tips: '', deliveries: '1' })
  const { saving, error, run } = useSubmit(onDone)

  return (
    <form className="inline-form stacked" onSubmit={e => {
      e.preventDefault()
      run(() => supabase.from('delivery_earnings').insert({
        user_id: user.id,
        shift_id: shift.id,
        platform: form.platform,
        amount: Number(form.amount),
        tips: Number(form.tips) || 0,
        deliveries: Number(form.deliveries) || 0,
      }))
    }}>
      <div className="chip-picker" role="radiogroup" aria-label="Plataforma">
        {PLATFORMS.map(p => (
          <button key={p} type="button" role="radio" aria-checked={form.platform === p} className={form.platform === p ? 'active' : ''} onClick={() => setForm({ ...form, platform: p })}>{p}</button>
        ))}
      </div>
      <Field label="Valor recebido">
        <input type="number" inputMode="decimal" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
      </Field>
      <div className="field-row">
        <Field label="Nº de entregas">
          <input type="number" inputMode="numeric" step="1" min="0" value={form.deliveries} onChange={e => setForm({ ...form, deliveries: e.target.value })} />
        </Field>
        <Field label="Gorjeta (opcional)">
          <input type="number" inputMode="decimal" step="0.01" min="0" value={form.tips} onChange={e => setForm({ ...form, tips: e.target.value })} />
        </Field>
      </div>
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={saving}>Adicionar ganho</button>
    </form>
  )
}

export function ExpenseForm({ shift, onDone }) {
  const { user } = useAuth()
  const [form, setForm] = useState({ kind: EXPENSE_KINDS[0], amount: '', description: '' })
  const { saving, error, run } = useSubmit(onDone)

  return (
    <form className="inline-form stacked" onSubmit={e => {
      e.preventDefault()
      run(() => supabase.from('delivery_expenses').insert({
        user_id: user.id,
        shift_id: shift.id,
        kind: form.kind,
        amount: Number(form.amount),
        description: form.description.trim() || null,
      }))
    }}>
      <div className="chip-picker" role="radiogroup" aria-label="Tipo de gasto">
        {EXPENSE_KINDS.map(k => (
          <button key={k} type="button" role="radio" aria-checked={form.kind === k} className={form.kind === k ? 'active' : ''} onClick={() => setForm({ ...form, kind: k })}>{k}</button>
        ))}
      </div>
      <Field label="Valor">
        <input type="number" inputMode="decimal" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
      </Field>
      <Field label="Observação (opcional)">
        <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      </Field>
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={saving}>Adicionar gasto</button>
    </form>
  )
}

export function FuelForm({ lastOdometer, onDone }) {
  const { user } = useAuth()
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), liters: '', total_cost: '', odometer: lastOdometer ?? '', full_tank: true })
  const { saving, error, run } = useSubmit(onDone)
  const price = form.liters && form.total_cost ? Number(form.total_cost) / Number(form.liters) : null

  return (
    <form className="inline-form stacked" onSubmit={e => {
      e.preventDefault()
      run(() => supabase.from('fuel_ups').insert({
        user_id: user.id,
        date: form.date,
        liters: Number(form.liters),
        total_cost: Number(form.total_cost),
        odometer: Number(form.odometer),
        full_tank: form.full_tank,
      }))
    }}>
      <div className="field-row">
        <Field label="Valor pago">
          <input type="number" inputMode="decimal" step="0.01" min="0.01" value={form.total_cost} onChange={e => setForm({ ...form, total_cost: e.target.value })} required autoFocus />
        </Field>
        <Field label="Litros">
          <input type="number" inputMode="decimal" step="0.001" min="0.001" value={form.liters} onChange={e => setForm({ ...form, liters: e.target.value })} required />
        </Field>
      </div>
      {price && <p className="muted small">Preço do litro: {formatBRL(price)}</p>}
      <Field label="Km do painel">
        <input type="number" inputMode="decimal" step="0.1" min="0" value={form.odometer} onChange={e => setForm({ ...form, odometer: e.target.value })} required />
      </Field>
      <Field label="Data">
        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
      </Field>
      <label className="checkbox-label">
        <input type="checkbox" checked={form.full_tank} onChange={e => setForm({ ...form, full_tank: e.target.checked })} />
        Completei o tanque (necessário para calcular o km/l real)
      </label>
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={saving}>Salvar abastecimento</button>
    </form>
  )
}

export function SettingsForm({ settings, coupleNames, onDone }) {
  const { user } = useAuth()
  const [form, setForm] = useState({ driver: settings.driver, initial_km_per_liter: settings.initial_km_per_liter })
  const { saving, error, run } = useSubmit(onDone)

  return (
    <form className="inline-form stacked" onSubmit={e => {
      e.preventDefault()
      run(() => supabase.from('delivery_settings').upsert({
        user_id: user.id,
        driver: form.driver,
        initial_km_per_liter: Number(form.initial_km_per_liter),
        updated_at: new Date().toISOString(),
      }))
    }}>
      <Field label="Quem faz as entregas">
        <select value={form.driver} onChange={e => setForm({ ...form, driver: e.target.value })}>
          <option value="a">{coupleNames.a}</option>
          <option value="b">{coupleNames.b}</option>
        </select>
      </Field>
      <Field label="Km/l estimado do carro">
        <input type="number" inputMode="decimal" step="0.1" min="0.1" value={form.initial_km_per_liter} onChange={e => setForm({ ...form, initial_km_per_liter: e.target.value })} required />
      </Field>
      <p className="muted small">O km/l estimado só é usado até existirem dois abastecimentos com tanque cheio. Depois disso o app usa o consumo real medido.</p>
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={saving}>Salvar</button>
    </form>
  )
}

function accountOptions(accounts, coupleNames) {
  const ownerLabel = { a: coupleNames.a, b: coupleNames.b, conjunta: 'conjunta' }
  return accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({ownerLabel[a.owner || 'conjunta']})</option>)
}

function defaultAccount(accounts, owner) {
  return (accounts.find(a => a.owner === owner) || accounts[0])?.id || ''
}

// Lança no financeiro os ganhos (receita) e os gastos (despesa) das jornadas
// ainda não lançadas, e marca as jornadas para não lançar duas vezes.
export function LaunchShiftsForm({ pending, accounts, coupleNames, driver, onDone }) {
  const { user } = useAuth()
  const [accountId, setAccountId] = useState(defaultAccount(accounts, driver))
  const { saving, error, run } = useSubmit(onDone)

  const earnings = pending.reduce((s, x) => s + x.m.earnings, 0)
  const expenses = pending.reduce((s, x) => s + x.m.expenses, 0)
  const dates = pending.map(x => x.shift.start_time.slice(0, 10)).sort()
  const fmt = d => d.split('-').reverse().slice(0, 2).join('/')
  const label = dates[0] === dates[dates.length - 1] ? fmt(dates[0]) : `${fmt(dates[0])} a ${fmt(dates[dates.length - 1])}`
  const lastDate = dates[dates.length - 1]

  async function launch() {
    const ids = pending.map(x => x.shift.id)
    if (earnings > 0) {
      const { data, error: err } = await supabase.from('transactions').insert({
        user_id: user.id, type: 'receita', description: `Entregas ${label}`,
        amount: Math.round(earnings * 100) / 100, account_id: accountId, date: lastDate, is_fixed: false,
      }).select('id').single()
      if (err) return { error: err }
      const upd = await supabase.from('delivery_shifts').update({ income_transaction_id: data.id }).in('id', ids)
      if (upd.error) return upd
    }
    if (expenses > 0) {
      const { data, error: err } = await supabase.from('transactions').insert({
        user_id: user.id, type: 'despesa', description: `Gastos das entregas ${label}`,
        amount: Math.round(expenses * 100) / 100, account_id: accountId, date: lastDate, is_fixed: false, split: driver,
      }).select('id').single()
      if (err) return { error: err }
      const upd = await supabase.from('delivery_shifts').update({ expense_transaction_id: data.id }).in('id', ids)
      if (upd.error) return upd
    }
    return {}
  }

  return (
    <form className="inline-form stacked" onSubmit={e => { e.preventDefault(); run(launch) }}>
      <p className="muted small">
        {pending.length} jornada(s) de {label} ainda não lançada(s). O combustível não entra aqui porque ele é lançado na aba Abastecimentos.
      </p>
      <div className="launch-preview">
        <div><span className="muted small">Receita (ganhos + gorjetas)</span><span className="num income">{formatBRL(earnings)}</span></div>
        {expenses > 0 && <div><span className="muted small">Despesa (gastos, só de {coupleNames[driver]})</span><span className="num expense">{formatBRL(expenses)}</span></div>}
      </div>
      <Field label="Conta">
        <select value={accountId} onChange={e => setAccountId(e.target.value)} required>
          <option value="">Escolha a conta…</option>
          {accountOptions(accounts, coupleNames)}
        </select>
      </Field>
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={saving || !accountId}>Lançar no financeiro</button>
    </form>
  )
}

export function LaunchFuelForm({ fuel, accounts, coupleNames, driver, onDone }) {
  const { user } = useAuth()
  const [accountId, setAccountId] = useState(defaultAccount(accounts, driver))
  const [split, setSplit] = useState('casal')
  const { saving, error, run } = useSubmit(onDone)

  async function launch() {
    const { data, error: err } = await supabase.from('transactions').insert({
      user_id: user.id, type: 'despesa',
      description: `Combustível (${Number(fuel.liters).toLocaleString('pt-BR')} L)`,
      amount: Number(fuel.total_cost), account_id: accountId, date: fuel.date, is_fixed: false, split,
    }).select('id').single()
    if (err) return { error: err }
    return supabase.from('fuel_ups').update({ transaction_id: data.id }).eq('id', fuel.id)
  }

  return (
    <form className="inline-form stacked" onSubmit={e => { e.preventDefault(); run(launch) }}>
      <div className="launch-preview">
        <div><span className="muted small">Despesa de combustível</span><span className="num expense">{formatBRL(fuel.total_cost)}</span></div>
      </div>
      <Field label="Conta que pagou">
        <select value={accountId} onChange={e => setAccountId(e.target.value)} required>
          <option value="">Escolha a conta…</option>
          {accountOptions(accounts, coupleNames)}
        </select>
      </Field>
      <Field label="De quem é esta despesa">
        <select value={split} onChange={e => setSplit(e.target.value)}>
          <option value="casal">Do casal (carro também é usado pela família)</option>
          <option value={driver}>Só de {coupleNames[driver]}</option>
        </select>
      </Field>
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={saving || !accountId}>Lançar no financeiro</button>
    </form>
  )
}
