import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useFinanceData } from '../hooks/useFinanceData'
import { formatBRL, formatDate } from '../utils/format'

const emptyForm = { description: '', amount: '', type: 'despesa', account_id: '', category_id: '', date: new Date().toISOString().slice(0, 10) }

export default function Transactions() {
  const { user } = useAuth()
  const { accounts, categories, transactions, reload, loading } = useFinanceData()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [showCatForm, setShowCatForm] = useState(false)
  const [newCat, setNewCat] = useState({ name: '', type: 'despesa' })

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.description.trim() || !form.amount || !form.account_id) return
    setSaving(true)
    await supabase.from('transactions').insert({
      user_id: user.id,
      description: form.description.trim(),
      amount: Number(form.amount),
      type: form.type,
      account_id: form.account_id,
      category_id: form.category_id || null,
      date: form.date,
    })
    setForm({ ...emptyForm, account_id: form.account_id })
    setSaving(false)
    reload()
  }

  async function handleAddCategory(e) {
    e.preventDefault()
    if (!newCat.name.trim()) return
    await supabase.from('categories').insert({ user_id: user.id, name: newCat.name.trim(), type: newCat.type })
    setNewCat({ name: '', type: 'despesa' })
    setShowCatForm(false)
    reload()
  }

  async function handleDelete(id) {
    await supabase.from('transactions').delete().eq('id', id)
    reload()
  }

  const categoriasFiltradas = categories.filter(c => c.type === form.type)

  return (
    <div>
      <header className="page-header">
        <h1>Transações</h1>
        <p className="muted">Lançamentos de receitas e despesas</p>
      </header>

      <form onSubmit={handleAdd} className="tx-form">
        <div className="tx-type-toggle">
          <button type="button" className={form.type === 'receita' ? 'active income' : ''} onClick={() => setForm({ ...form, type: 'receita', category_id: '' })}>Receita</button>
          <button type="button" className={form.type === 'despesa' ? 'active expense' : ''} onClick={() => setForm({ ...form, type: 'despesa', category_id: '' })}>Despesa</button>
        </div>

        <input placeholder="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
        <input type="number" step="0.01" min="0.01" placeholder="Valor" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />

        <select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })} required>
          <option value="">Conta…</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
          <option value="">Sem categoria</option>
          {categoriasFiltradas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />

        <button type="submit" className="btn-primary" disabled={saving}>Lançar</button>
        <button type="button" className="btn-ghost" onClick={() => setShowCatForm(s => !s)}>+ categoria</button>
      </form>

      {showCatForm && (
        <form onSubmit={handleAddCategory} className="inline-form small">
          <input placeholder="Nome da categoria" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} required />
          <select value={newCat.type} onChange={e => setNewCat({ ...newCat, type: e.target.value })}>
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
          <button type="submit" className="btn-primary">Salvar categoria</button>
        </form>
      )}

      {accounts.length === 0 && !loading && (
        <p className="muted">Cadastre uma conta primeiro na aba "Contas" para começar a lançar transações.</p>
      )}

      <div className="ledger">
        <div className="ledger-row ledger-head">
          <span>Data</span><span>Descrição</span><span>Conta</span><span>Categoria</span><span className="num">Valor</span><span></span>
        </div>
        {loading ? <p className="muted">Carregando…</p> : transactions.length === 0 ? <p className="muted">Nenhuma transação ainda.</p> : (
          transactions.map(t => (
            <div key={t.id} className="ledger-row">
              <span>{formatDate(t.date)}</span>
              <span>{t.description}</span>
              <span>{t.accounts?.name}</span>
              <span>
                {t.categories?.name && <span className="tag" style={{ background: t.categories.color + '22', color: t.categories.color }}>{t.categories.name}</span>}
              </span>
              <span className={'num ' + (t.type === 'receita' ? 'income' : 'expense')}>
                {t.type === 'receita' ? '+' : '−'} {formatBRL(t.amount)}
              </span>
              <button className="btn-icon" onClick={() => handleDelete(t.id)} title="Excluir">✕</button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
