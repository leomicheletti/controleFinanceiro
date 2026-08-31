import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useFinanceData } from '../hooks/useFinanceData'
import { formatBRL, formatDate } from '../utils/format'

const emptyForm = { name: '', target_amount: '', current_amount: '', deadline: '' }

export default function Goals() {
  const { user } = useAuth()
  const { goals, reload, loading } = useFinanceData()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.target_amount) return
    setSaving(true)
    await supabase.from('goals').insert({
      user_id: user.id,
      name: form.name.trim(),
      target_amount: Number(form.target_amount),
      current_amount: Number(form.current_amount) || 0,
      deadline: form.deadline || null,
    })
    setForm(emptyForm)
    setSaving(false)
    reload()
  }

  async function handleAddValue(goal, delta) {
    const novoValor = Math.max(0, Number(goal.current_amount) + delta)
    await supabase.from('goals').update({ current_amount: novoValor }).eq('id', goal.id)
    reload()
  }

  async function handleDelete(id) {
    await supabase.from('goals').delete().eq('id', id)
    reload()
  }

  return (
    <div>
      <header className="page-header">
        <h1>Metas</h1>
        <p className="muted">Defina objetivos e acompanhe o progresso</p>
      </header>

      <form onSubmit={handleAdd} className="inline-form">
        <input placeholder="Nome da meta (ex: Reserva de emergência)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <input type="number" step="0.01" placeholder="Valor alvo" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} required />
        <input type="number" step="0.01" placeholder="Já tenho (opcional)" value={form.current_amount} onChange={e => setForm({ ...form, current_amount: e.target.value })} />
        <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
        <button type="submit" className="btn-primary" disabled={saving}>Criar meta</button>
      </form>

      {loading ? <p className="muted">Carregando…</p> : (
        <div className="goals-grid">
          {goals.length === 0 && <p className="muted">Nenhuma meta cadastrada ainda.</p>}
          {goals.map(g => {
            const pct = Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100)
            return (
              <div key={g.id} className="goal-card">
                <div className="goal-card-top">
                  <h3>{g.name}</h3>
                  <button className="btn-icon" onClick={() => handleDelete(g.id)} title="Excluir">✕</button>
                </div>
                <div className="goal-bar big"><div className="goal-bar-fill" style={{ width: pct + '%' }} /></div>
                <div className="goal-numbers">
                  <span>{formatBRL(g.current_amount)}</span>
                  <span className="muted">de {formatBRL(g.target_amount)}</span>
                </div>
                {g.deadline && <span className="muted small">Até {formatDate(g.deadline)}</span>}
                <div className="goal-actions">
                  <button className="btn-ghost" onClick={() => handleAddValue(g, 50)}>+ R$ 50</button>
                  <button className="btn-ghost" onClick={() => handleAddValue(g, 100)}>+ R$ 100</button>
                  <button className="btn-ghost" onClick={() => handleAddValue(g, -50)}>− R$ 50</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
