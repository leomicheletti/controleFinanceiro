import React, { useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useFinanceData } from '../hooks/useFinanceData'
import { formatBRL, formatDate } from '../utils/format'
import { getCategoryColor } from '../utils/categoryColor'

const emptyForm = { description: '', amount: '', type: 'despesa', account_id: '', category_id: '', date: new Date().toISOString().slice(0, 10), is_fixed: false }

export default function Transactions() {
  const { user } = useAuth()
  const { accounts, categories, transactions, reload, loading } = useFinanceData()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [showCatForm, setShowCatForm] = useState(false)
  const [newCat, setNewCat] = useState({ name: '', type: 'despesa', monthly_budget: '' })
  const [filtroFixo, setFiltroFixo] = useState('todos') // todos | fixo | variavel

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
      is_fixed: form.type === 'despesa' ? form.is_fixed : false,
    })
    setForm({ ...emptyForm, account_id: form.account_id })
    setSaving(false)
    reload()
  }

  async function handleAddCategory(e) {
    e.preventDefault()
    if (!newCat.name.trim()) return
    await supabase.from('categories').insert({
      user_id: user.id,
      name: newCat.name.trim(),
      type: newCat.type,
      monthly_budget: newCat.monthly_budget ? Number(newCat.monthly_budget) : null,
    })
    setNewCat({ name: '', type: 'despesa', monthly_budget: '' })
    setShowCatForm(false)
    reload()
  }

  async function handleDelete(id) {
    await supabase.from('transactions').delete().eq('id', id)
    reload()
  }

  const categoriasFiltradas = categories.filter(c => c.type === form.type)

  const transacoesFiltradas = useMemo(() => {
    if (filtroFixo === 'fixo') return transactions.filter(t => t.is_fixed)
    if (filtroFixo === 'variavel') return transactions.filter(t => !t.is_fixed)
    return transactions
  }, [transactions, filtroFixo])

  return (
    <div>
      <header className="page-header">
        <h1>Transações</h1>
        <p className="muted">Lançamentos de receitas e despesas, fixas ou variáveis</p>
      </header>

      <form onSubmit={handleAdd} className="tx-form">
        <div className="tx-type-toggle">
          <button type="button" className={form.type === 'receita' ? 'active income' : ''} onClick={() => setForm({ ...form, type: 'receita', category_id: '', is_fixed: false })}>Receita</button>
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

        {form.type === 'despesa' && (
          <label className="checkbox-label">
            <input type="checkbox" checked={form.is_fixed} onChange={e => setForm({ ...form, is_fixed: e.target.checked })} />
            Custo fixo
          </label>
        )}

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
          {newCat.type === 'despesa' && (
            <input type="number" step="0.01" placeholder="Orçamento mensal (opcional)" value={newCat.monthly_budget} onChange={e => setNewCat({ ...newCat, monthly_budget: e.target.value })} />
          )}
          <button type="submit" className="btn-primary">Salvar categoria</button>
        </form>
      )}

      {accounts.length === 0 && !loading && (
        <p className="muted">Cadastre uma conta primeiro na aba "Contas" para começar a lançar transações.</p>
      )}

      <div className="filter-row">
        <button className={filtroFixo === 'todos' ? 'active' : ''} onClick={() => setFiltroFixo('todos')}>Todas</button>
        <button className={filtroFixo === 'fixo' ? 'active' : ''} onClick={() => setFiltroFixo('fixo')}>Fixas</button>
        <button className={filtroFixo === 'variavel' ? 'active' : ''} onClick={() => setFiltroFixo('variavel')}>Variáveis</button>
      </div>

      <div className="ledger">
        {loading ? <p className="muted">Carregando…</p> : transacoesFiltradas.length === 0 ? <p className="muted">Nenhuma transação encontrada.</p> : (
          transacoesFiltradas.map(t => (
            <div key={t.id} className="tx-item">
              <div className="tx-item-main">
                <div className="tx-item-title">
                  <span className="tx-desc">{t.description}</span>
                  {t.is_fixed && <span className="fixed-badge">fixo</span>}
                </div>
                <div className="tx-item-meta">
                  <span>{formatDate(t.date)}</span>
                  <span className="dot">•</span>
                  <span>{t.accounts?.name}</span>
                  {t.categories?.name && (() => {
                    const cor = getCategoryColor(t.category_id)
                    return <span className="tag" style={{ background: cor + '22', color: cor }}>{t.categories.name}</span>
                  })()}
                </div>
              </div>
              <div className="tx-item-right">
                <span className={'num ' + (t.type === 'receita' ? 'income' : 'expense')}>
                  {t.type === 'receita' ? '+' : '−'} {formatBRL(t.amount)}
                </span>
                <button className="btn-icon" onClick={() => handleDelete(t.id)} title="Excluir">✕</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
