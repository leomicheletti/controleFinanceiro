import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useFinanceData } from '../hooks/useFinanceData'
import { formatBRL } from '../utils/format'
import { computeSettlement, incomeShareA } from '../utils/split'

const defaultSettings = { person_a_name: 'Pessoa A', person_b_name: 'Pessoa B', split_mode: 'igual', share_a: 50 }

function monthRange(month) {
  const [y, m] = month.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  return [`${month}-01`, `${next}-01`]
}

export default function CoupleSplit() {
  const { user } = useAuth()
  const { accounts, loading: loadingAccounts } = useFinanceData()
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [settings, setSettings] = useState(defaultSettings)
  const [settingsForm, setSettingsForm] = useState(defaultSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [start, end] = monthRange(month)
    const [setRes, txRes, trRes] = await Promise.all([
      supabase.from('couple_settings').select('*').maybeSingle(),
      supabase.from('transactions').select('id, description, amount, type, account_id, split, date').gte('date', start).lt('date', end),
      supabase.from('couple_transfers').select('*').eq('month', month).order('created_at'),
    ])
    const err = setRes.error || txRes.error || trRes.error
    setError(err ? 'Não foi possível carregar os dados. Verifique se o arquivo supabase/migration_003_acerto_casal.sql já foi executado no Supabase.' : '')
    const s = { ...defaultSettings, ...(setRes.data || {}) }
    setSettings(s)
    setSettingsForm(s)
    setTransactions(txRes.data || [])
    setTransfers(trRes.data || [])
    setLoading(false)
  }, [user, month])

  useEffect(() => { load() }, [load])

  const ownerByAccount = useMemo(
    () => Object.fromEntries(accounts.map(a => [a.id, a.owner || 'conjunta'])),
    [accounts]
  )

  const names = { a: settings.person_a_name, b: settings.person_b_name, conjunta: 'Conta conjunta' }

  const incomePct = useMemo(() => incomeShareA(transactions, ownerByAccount), [transactions, ownerByAccount])
  const shareA = settings.split_mode === 'igual' ? 50
    : settings.split_mode === 'proporcional' ? (incomePct ?? 50)
      : Number(settings.share_a)

  const result = useMemo(
    () => computeSettlement({ transactions, ownerByAccount, shareA, transfers }),
    [transactions, ownerByAccount, shareA, transfers]
  )

  async function handleSaveSettings(e) {
    e.preventDefault()
    await supabase.from('couple_settings').upsert({
      user_id: user.id,
      person_a_name: settingsForm.person_a_name.trim() || 'Pessoa A',
      person_b_name: settingsForm.person_b_name.trim() || 'Pessoa B',
      split_mode: settingsForm.split_mode,
      share_a: Math.min(100, Math.max(0, Number(settingsForm.share_a) || 0)),
      updated_at: new Date().toISOString(),
    })
    setShowSettings(false)
    load()
  }

  async function handleRegisterMove(move) {
    if (!confirm(`Registrar que ${names[move.from]} transferiu ${formatBRL(move.amount)} para ${names[move.to]}?`)) return
    await supabase.from('couple_transfers').insert({
      user_id: user.id, month, from_person: move.from, to_person: move.to, amount: move.amount,
    })
    load()
  }

  async function handleDeleteTransfer(id) {
    await supabase.from('couple_transfers').delete().eq('id', id)
    load()
  }

  const semTitular = accounts.filter(a => (a.owner || 'conjunta') === 'conjunta').length === accounts.length && accounts.length > 0
  const pctLabel = `${shareA.toFixed(0)}% / ${(100 - shareA).toFixed(0)}%`

  return (
    <div>
      <header className="page-header">
        <h1>Acerto do casal</h1>
        <p className="muted">Quanto cada um precisa transferir para fechar as contas do mês</p>
      </header>

      <div className="inline-form">
        <input type="month" value={month} onChange={e => e.target.value && setMonth(e.target.value)} />
        <span className="muted small">Divisão: <strong>{names.a}</strong> {pctLabel} <strong>{names.b}</strong>
          {settings.split_mode === 'proporcional' && (incomePct === null ? ' (sem receitas no mês, usando 50/50)' : ' (proporcional à renda)')}
        </span>
        <button type="button" className="btn-ghost" onClick={() => setShowSettings(s => !s)}>Configurar divisão</button>
      </div>

      {showSettings && (
        <form onSubmit={handleSaveSettings} className="inline-form small">
          <input placeholder="Nome da pessoa A" value={settingsForm.person_a_name} onChange={e => setSettingsForm({ ...settingsForm, person_a_name: e.target.value })} />
          <input placeholder="Nome da pessoa B" value={settingsForm.person_b_name} onChange={e => setSettingsForm({ ...settingsForm, person_b_name: e.target.value })} />
          <select value={settingsForm.split_mode} onChange={e => setSettingsForm({ ...settingsForm, split_mode: e.target.value })}>
            <option value="igual">Meio a meio (50/50)</option>
            <option value="proporcional">Proporcional à renda do mês</option>
            <option value="personalizado">Percentual personalizado</option>
          </select>
          {settingsForm.split_mode === 'personalizado' && (
            <input type="number" min="0" max="100" step="1" placeholder={`% de ${settingsForm.person_a_name}`} value={settingsForm.share_a} onChange={e => setSettingsForm({ ...settingsForm, share_a: e.target.value })} title={`Percentual que cabe a ${settingsForm.person_a_name}`} />
          )}
          <button type="submit" className="btn-primary">Salvar</button>
        </form>
      )}

      {error && <p className="auth-error">{error}</p>}
      {semTitular && (
        <p className="muted">Dica: na aba "Contas", indique de quem é cada conta (titular). Hoje todas estão como conjuntas, então o app considera que nenhum dos dois pagou nada do próprio bolso.</p>
      )}

      {loading || loadingAccounts ? <p className="muted">Carregando…</p> : (
        <>
          <section className="cards-row">
            <div className="stat-card expense">
              <span className="stat-label">Despesas do casal</span>
              <span className="stat-value">{formatBRL(result.shared)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Parte de {names.a}</span>
              <span className="stat-value">{formatBRL(result.respA)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Parte de {names.b}</span>
              <span className="stat-value">{formatBRL(result.respB)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Saiu da conjunta</span>
              <span className="stat-value">{formatBRL(result.paidJoint)}</span>
            </div>
          </section>

          <section className="panel">
            <h2>Transferências para fechar o mês</h2>
            {result.moves.length === 0 ? (
              <p className="muted">Tudo certo: ninguém precisa transferir nada neste mês.</p>
            ) : (
              <div className="settle-list">
                {result.moves.map(m => (
                  <div key={m.from + m.to} className="settle-move">
                    <span className="settle-text"><strong>{names[m.from]}</strong> → <strong>{names[m.to]}</strong></span>
                    <span className="num settle-amount">{formatBRL(m.amount)}</span>
                    <button className="btn-ghost small" onClick={() => handleRegisterMove(m)}>Marcar como feita</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <h2>Como chegamos nesse valor</h2>
            <div className="ledger settle-table">
              <div className="tx-item settle-head">
                <span className="tx-item-main"></span>
                <span className="num">{names.a}</span>
                <span className="num">{names.b}</span>
              </div>
              <Row label={`Parte nas despesas do casal (${pctLabel})`} a={result.shared * shareA / 100} b={result.shared * (100 - shareA) / 100} />
              <Row label="Despesas pessoais" a={result.personalA} b={result.personalB} />
              <Row label="(−) Já pagou da própria conta" a={-result.paidA} b={-result.paidB} />
              <Row label="(−) Transferências registradas (enviado − recebido)" a={-result.transferredA} b={-result.transferredB} />
              <Row label="= Saldo a acertar" a={result.dueA} b={result.dueB} strong />
            </div>
            <p className="muted small">Saldo positivo = ainda precisa transferir; negativo = pagou a mais e tem a receber.</p>
          </section>

          {transfers.length > 0 && (
            <section className="panel">
              <h2>Transferências registradas no mês</h2>
              <div className="ledger">
                {transfers.map(tr => (
                  <div key={tr.id} className="tx-item">
                    <div className="tx-item-main">
                      <span className="tx-desc">{names[tr.from_person]} → {names[tr.to_person]}</span>
                    </div>
                    <div className="tx-item-right">
                      <span className="num">{formatBRL(tr.amount)}</span>
                      <button className="btn-icon" onClick={() => handleDeleteTransfer(tr.id)} title="Remover registro">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function Row({ label, a, b, strong }) {
  return (
    <div className={'tx-item' + (strong ? ' settle-total' : '')}>
      <span className="tx-item-main">{label}</span>
      <span className="num">{formatBRL(a)}</span>
      <span className="num">{formatBRL(b)}</span>
    </div>
  )
}
