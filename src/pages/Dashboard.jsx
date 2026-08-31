import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useFinanceData } from '../hooks/useFinanceData'
import { formatBRL } from '../utils/format'
import { getCategoryColor } from '../utils/categoryColor'

export default function Dashboard() {
  const { balances, transactions, goals, loading } = useFinanceData()

  const totalBalance = useMemo(() => balances.reduce((s, b) => s + Number(b.balance), 0), [balances])

  const mesAtual = new Date().toISOString().slice(0, 7)
  const txMes = transactions.filter(t => t.date.startsWith(mesAtual))
  const receitasMes = txMes.filter(t => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0)
  const despesasMes = txMes.filter(t => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0)

  const porCategoria = useMemo(() => {
    const map = {}
    txMes.filter(t => t.type === 'despesa').forEach(t => {
      const nome = t.categories?.name || 'Sem categoria'
      const cor = getCategoryColor(t.category_id || nome)
      if (!map[nome]) map[nome] = { name: nome, value: 0, color: cor }
      map[nome].value += Number(t.amount)
    })
    return Object.values(map)
  }, [txMes])

  const ultimosMeses = useMemo(() => {
    const map = {}
    transactions.forEach(t => {
      const mes = t.date.slice(0, 7)
      if (!map[mes]) map[mes] = { mes, receita: 0, despesa: 0 }
      map[mes][t.type === 'receita' ? 'receita' : 'despesa'] += Number(t.amount)
    })
    return Object.values(map).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-6)
  }, [transactions])

  if (loading) return <p className="muted">Carregando…</p>

  return (
    <div>
      <header className="page-header">
        <h1>Painel</h1>
        <p className="muted">Resumo geral das suas finanças</p>
      </header>

      <section className="cards-row">
        <div className="stat-card">
          <span className="stat-label">Saldo total</span>
          <span className="stat-value">{formatBRL(totalBalance)}</span>
        </div>
        <div className="stat-card income">
          <span className="stat-label">Receitas do mês</span>
          <span className="stat-value">{formatBRL(receitasMes)}</span>
        </div>
        <div className="stat-card expense">
          <span className="stat-label">Despesas do mês</span>
          <span className="stat-value">{formatBRL(despesasMes)}</span>
        </div>
      </section>

      <section className="charts-row">
        <div className="panel">
          <h2>Despesas por categoria (mês)</h2>
          {porCategoria.length === 0 ? <p className="muted">Sem despesas registradas neste mês ainda.</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={porCategoria} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                  {porCategoria.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => formatBRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="panel">
          <h2>Receitas x despesas (últimos meses)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ultimosMeses}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D8D2C2" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatBRL(v)} />
              <Bar dataKey="receita" fill="#3F7D5C" radius={[3, 3, 0, 0]} />
              <Bar dataKey="despesa" fill="#B54834" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {goals.length > 0 && (
        <section className="panel">
          <h2>Metas em andamento</h2>
          <div className="goals-mini">
            {goals.slice(0, 3).map(g => {
              const pct = Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100)
              return (
                <div key={g.id} className="goal-mini">
                  <div className="goal-mini-head">
                    <span>{g.name}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="goal-bar"><div className="goal-bar-fill" style={{ width: pct + '%', background: g.color }} /></div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
