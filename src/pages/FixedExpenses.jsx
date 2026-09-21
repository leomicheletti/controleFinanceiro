import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useFinanceData } from '../hooks/useFinanceData'
import { formatBRL } from '../utils/format'

const emptyForm = { name: '', amount: '', category_id: '', account_id: '', due_day: '5' }

export default function FixedExpenses() {
  const { user } = useAuth()
  const { accounts, categories, fixedExpenses, reload, loading } = useFinanceData()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const categoriasDespesa = categories.filter(c => c.type === 'despesa')
  const totalFixoAtivo = fixedExpenses.filter(fe => fe.active).reduce((s, fe) => s + Number(fe.amount), 0)

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.amount || !form.account_id) return
    setSaving(true)
    await supabase.from('fixed_expenses').insert({
      user_id: user.id,
      name: form.name.trim(),
      amount: Number(form.amount),
      category_id: form.category_id || null,
      account_id: form.account_id,
      due_day: Number(form.due_day),
    })
    setForm({ ...emptyForm, account_id: form.account_id })
    setSaving(false)
    reload()
  }

  async function handleToggleActive(fe) {
    await supabase.from('fixed_expenses').update({ active: !fe.active }).eq('id', fe.id)
    reload()
  }

  async function handleDelete(id) {
    if (!confirm('Excluir esta despesa fixa? Os lançamentos já feitos continuam no histórico.')) return
    await supabase.from('fixed_expenses').delete().eq('id', id)
    reload()
  }

  async function handlePostNow(fe) {
    await supabase.from('transactions').insert({
      user_id: user.id,
      description: fe.name,
      amount: fe.amount,
      type: 'despesa',
      account_id: fe.account_id,
      category_id: fe.category_id,
      date: new Date().toISOString().slice(0, 10),
      is_fixed: true,
      fixed_expense_id: fe.id,
    })
    reload()
  }

  return (
    <div>
      <header className="page-header">
        <h1>Despesas fixas</h1>
        <p className="muted">Aluguel, assinaturas, internet e outros custos recorrentes</p>
      </header>

      <section className="cards-row">
        <div className="stat-card expense">
          <span className="stat-label">Total fixo mensal (ativas)</span>
          <span className="stat-value">{formatBRL(totalFixoAtivo)}</span>
        </div>
      </section>

      <form onSubmit={handleAdd} className="inline-form">
        <input placeholder="Nome (ex: Aluguel)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <input type="number" step="0.01" min="0.01" placeholder="Valor" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
        <select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })} required>
          <option value="">Conta…</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
          <option value="">Sem categoria</option>
          {categoriasDespesa.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="number" min="1" max="31" placeholder="Dia venc." value={form.due_day} onChange={e => setForm({ ...form, due_day: e.target.value })} required style={{ width: 90 }} />
        <button type="submit" className="btn-primary" disabled={saving}>Cadastrar</button>
      </form>

      {accounts.length === 0 && !loading && (
        <p className="muted">Cadastre uma conta primeiro na aba "Contas" para conseguir vincular uma despesa fixa.</p>
      )}

      <div className="ledger">
        <div className="ledger-row ledger-head fixed-head">
          <span>Dia</span><span>Nome</span><span>Categoria</span><span className="num">Valor</span><span>Status</span><span></span>
        </div>
        {loading ? <p className="muted">Carregando…</p> : fixedExpenses.length === 0 ? <p className="muted">Nenhuma despesa fixa cadastrada ainda.</p> : (
          fixedExpenses.map(fe => (
            <div key={fe.id} className={'ledger-row fixed-row' + (fe.active ? '' : ' inactive')}>
              <span className="num-day">{String(fe.due_day).padStart(2, '0')}</span>
              <span>{fe.name}</span>
              <span>{fe.categories?.name && <span className="tag">{fe.categories.name}</span>}</span>
              <span className="num expense">{formatBRL(fe.amount)}</span>
              <span>
                {!fe.active ? <span className="status-pill muted-pill">Pausada</span> :
                  fe.posted_this_month ? <span className="status-pill ok-pill">Lançada este mês</span> :
                    <span className="status-pill pending-pill">Pendente</span>}
              </span>
              <span className="fixed-actions">
                {fe.active && !fe.posted_this_month && (
                  <button className="btn-ghost small" onClick={() => handlePostNow(fe)}>Lançar agora</button>
                )}
                <button className="btn-icon" onClick={() => handleToggleActive(fe)} title={fe.active ? 'Pausar' : 'Reativar'}>
                  {fe.active ? '⏸' : '▶'}
                </button>
                <button className="btn-icon" onClick={() => handleDelete(fe.id)} title="Excluir">✕</button>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
