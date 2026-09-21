// Motor de insights financeiros: analisa transações, orçamentos, despesas
// fixas e metas para gerar recomendações em linguagem natural.
// Roda inteiramente no navegador — sem custo, sem API externa.
import { formatBRL } from './format'

function mesAtual(dateStr) {
  return dateStr.slice(0, 7)
}

function nomesMeses(offset) {
  const d = new Date()
  d.setMonth(d.getMonth() - offset)
  return d.toISOString().slice(0, 7)
}

export function buildInsights({ transactions, categories, fixedExpenses, goals, balances }) {
  const insights = []
  const chave = mesAtual(new Date().toISOString())
  const chaveAnterior = nomesMeses(1)

  const txMesAtual = transactions.filter(t => mesAtual(t.date) === chave)
  const txMesAnterior = transactions.filter(t => mesAtual(t.date) === chaveAnterior)

  const despesasAtual = txMesAtual.filter(t => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0)
  const despesasAnterior = txMesAnterior.filter(t => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0)
  const receitasAtual = txMesAtual.filter(t => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0)

  // 1. Comparação de gasto total mês a mês
  if (despesasAnterior > 0) {
    const variacao = ((despesasAtual - despesasAnterior) / despesasAnterior) * 100
    if (variacao >= 15) {
      insights.push({
        level: 'alerta',
        title: 'Gastos subindo',
        text: `Suas despesas este mês já somam ${formatBRL(despesasAtual)}, ${variacao.toFixed(0)}% a mais que no mês passado (${formatBRL(despesasAnterior)}). Vale revisar o que mudou.`,
      })
    } else if (variacao <= -15) {
      insights.push({
        level: 'positivo',
        title: 'Gastos em queda',
        text: `Você reduziu as despesas em ${Math.abs(variacao).toFixed(0)}% em relação ao mês passado. Continue assim.`,
      })
    }
  }

  // 2. Saldo do mês (receita - despesa)
  if (txMesAtual.length > 0) {
    const saldoMes = receitasAtual - despesasAtual
    if (saldoMes < 0) {
      insights.push({
        level: 'alerta',
        title: 'Mês no vermelho',
        text: `Até agora você gastou ${formatBRL(Math.abs(saldoMes))} a mais do que recebeu neste mês. Se o padrão continuar, o saldo das contas vai cair.`,
      })
    }
  }

  // 3. Categorias estourando o orçamento definido
  const porCategoria = {}
  txMesAtual.filter(t => t.type === 'despesa').forEach(t => {
    const id = t.category_id
    if (!id) return
    porCategoria[id] = (porCategoria[id] || 0) + Number(t.amount)
  })
  categories.filter(c => c.type === 'despesa' && c.monthly_budget > 0).forEach(c => {
    const gasto = porCategoria[c.id] || 0
    const pct = (gasto / Number(c.monthly_budget)) * 100
    if (pct >= 100) {
      insights.push({
        level: 'alerta',
        title: `Orçamento de "${c.name}" estourado`,
        text: `Você já gastou ${formatBRL(gasto)} nessa categoria, ${(pct - 100).toFixed(0)}% acima do orçamento de ${formatBRL(c.monthly_budget)}.`,
      })
    } else if (pct >= 80) {
      insights.push({
        level: 'atencao',
        title: `Orçamento de "${c.name}" quase no limite`,
        text: `Você já usou ${pct.toFixed(0)}% do orçamento mensal dessa categoria (${formatBRL(gasto)} de ${formatBRL(c.monthly_budget)}).`,
      })
    }
  })

  // 4. Despesas fixas ainda não lançadas perto do vencimento
  const hoje = new Date().getDate()
  ;(fixedExpenses || []).filter(fe => fe.active && !fe.posted_this_month).forEach(fe => {
    const diasParaVencer = fe.due_day - hoje
    if (diasParaVencer <= 5 && diasParaVencer >= -3) {
      insights.push({
        level: diasParaVencer < 0 ? 'alerta' : 'atencao',
        title: diasParaVencer < 0 ? `"${fe.name}" pode estar atrasado` : `"${fe.name}" vence em breve`,
        text: diasParaVencer < 0
          ? `O vencimento (dia ${fe.due_day}) já passou e não encontrei o lançamento deste mês.`
          : `Vence dia ${fe.due_day} (${formatBRL(fe.amount)}) e ainda não foi lançado este mês.`,
      })
    }
  })

  // 5. Peso dos custos fixos sobre a receita
  const totalFixo = (fixedExpenses || []).filter(fe => fe.active).reduce((s, fe) => s + Number(fe.amount), 0)
  if (receitasAtual > 0 && totalFixo > 0) {
    const pctFixo = (totalFixo / receitasAtual) * 100
    if (pctFixo >= 60) {
      insights.push({
        level: 'alerta',
        title: 'Custos fixos pesados',
        text: `Seus custos fixos (${formatBRL(totalFixo)}) consomem ${pctFixo.toFixed(0)}% da sua receita do mês. O ideal costuma ficar abaixo de 50-60%.`,
      })
    }
  }

  // 6. Metas com prazo apertado e progresso baixo
  ;(goals || []).forEach(g => {
    if (!g.deadline) return
    const hojeDate = new Date()
    const prazo = new Date(g.deadline + 'T00:00:00')
    const diasRestantes = Math.ceil((prazo - hojeDate) / 86400000)
    const pct = (Number(g.current_amount) / Number(g.target_amount)) * 100
    if (diasRestantes > 0 && diasRestantes <= 30 && pct < 80) {
      const falta = Number(g.target_amount) - Number(g.current_amount)
      insights.push({
        level: 'atencao',
        title: `Meta "${g.name}" no prazo final`,
        text: `Faltam ${diasRestantes} dias e ainda falta juntar ${formatBRL(falta)} (${pct.toFixed(0)}% concluído).`,
      })
    }
  })

  // 7. Saldo negativo em alguma conta
  ;(balances || []).forEach(b => {
    if (Number(b.balance) < 0) {
      insights.push({
        level: 'alerta',
        title: `Conta "${b.name}" negativa`,
        text: `O saldo está em ${formatBRL(b.balance)}. Considere transferir fundos ou revisar os próximos lançamentos dessa conta.`,
      })
    }
  })

  // 8. Nada de errado — reforço positivo
  if (insights.length === 0 && txMesAtual.length > 0) {
    insights.push({
      level: 'positivo',
      title: 'Tudo sob controle',
      text: 'Não encontrei nenhum sinal de alerta nas suas finanças este mês. Continue registrando os lançamentos em dia.',
    })
  }

  const ordem = { alerta: 0, atencao: 1, positivo: 2 }
  return insights.sort((a, b) => ordem[a.level] - ordem[b.level])
}
