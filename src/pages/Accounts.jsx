import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useFinanceData } from '../hooks/useFinanceData'
import { formatBRL } from '../utils/format'

const TIPOS = [
  { value: 'corrente', label: 'Conta corrente' },
  { value: 'poupanca', label: 'Poupança' },
  { value: 'cartao', label: 'Cartão de crédito' },
  { value: 'carteira', label: 'Carteira / dinheiro' },
  { value: 'investimento', label: 'Investimento' },
  { value: 'outro', label: 'Outro' },
]

export default function Accounts() {
  const { user } = useAuth()
  const { balances, reload, loading } = useFinanceData()
  const [form, setForm] = useState({ name: '', type: 'corrente', initial_balance: '' })
  const [saving, setSaving] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('accounts').insert({
      user_id: user.id,
      name: form.name.trim(),
      type: form.type,
      initial_balance: Number(form.initial_balance) || 0,
    })
    setForm({ name: '', type: 'corrente', initial_balance: '' })
    setSaving(false)
    reload()
  }

  async function handleDelete(id) {
    if (!confirm('Excluir esta conta e todas as transações associadas?')) return
    await supabase.from('accounts').delete().eq('id', id)
    reload()
  }

  return (
    <div>
      <header className="page-header">
        <h1>Contas</h1>
        <p className="muted">Corrente, poupança, cartão de crédito, carteira — quantas precisar.</p>
      </header>

      <form onSubmit={handleAdd} className="inline-form">
        <input placeholder="Nome da conta (ex: Nubank)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input type="number" step="0.01" placeholder="Saldo inicial" value={form.initial_balance} onChange={e => setForm({ ...form, initial_balance: e.target.value })} />
        <button type="submit" className="btn-primary" disabled={saving}>Adicionar conta</button>
      </form>

      {loading ? <p className="muted">Carregando…</p> : (
        <div className="ledger-grid">
          {balances.length === 0 && <p className="muted">Nenhuma conta cadastrada ainda.</p>}
          {balances.map(b => (
            <div key={b.account_id} className="account-card" style={{ borderColor: b.color }}>
              <div className="account-card-top">
                <span className="account-type">{TIPOS.find(t => t.value === b.type)?.label || b.type}</span>
                <button className="btn-icon" onClick={() => handleDelete(b.account_id)} title="Excluir conta">✕</button>
              </div>
              <h3>{b.name}</h3>
              <span className="account-balance">{formatBRL(b.balance)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
