// Cálculo do acerto do casal.
//
// Para cada despesa do mês sabemos:
//   - de quem ela é (split): 'casal' (dividida pelo percentual) ou só 'a' / 'b'
//   - quem pagou (titular da conta): 'a', 'b' ou 'conjunta'
// A "responsabilidade" de cada um é a parte que lhe cabe nas despesas;
// o "pago" é o que saiu das contas pessoais de cada um. A diferença é o
// quanto cada um ainda precisa colocar: na conta conjunta (para cobrir o
// que saiu dela) ou diretamente para o outro (quando um pagou a mais).

const round2 = v => Math.round(v * 100) / 100

export function incomeShareA(transactions, ownerByAccount) {
  let a = 0, b = 0
  transactions.filter(t => t.type === 'receita').forEach(t => {
    const owner = ownerByAccount[t.account_id]
    if (owner === 'a') a += Number(t.amount)
    if (owner === 'b') b += Number(t.amount)
  })
  if (a + b === 0) return null
  return (a / (a + b)) * 100
}

export function computeSettlement({ transactions, ownerByAccount, shareA, transfers = [] }) {
  const pctA = shareA / 100
  const r = {
    shared: 0, personalA: 0, personalB: 0,
    respA: 0, respB: 0,
    paidA: 0, paidB: 0, paidJoint: 0,
    transferredA: 0, transferredB: 0,
  }

  transactions.filter(t => t.type === 'despesa').forEach(t => {
    const amount = Number(t.amount)
    const split = t.split || 'casal'
    if (split === 'a') { r.personalA += amount; r.respA += amount }
    else if (split === 'b') { r.personalB += amount; r.respB += amount }
    else { r.shared += amount; r.respA += amount * pctA; r.respB += amount * (1 - pctA) }

    const owner = ownerByAccount[t.account_id] || 'conjunta'
    if (owner === 'a') r.paidA += amount
    else if (owner === 'b') r.paidB += amount
    else r.paidJoint += amount
  })

  // Saldo devedor de cada um (positivo = ainda precisa transferir).
  // Transferências já registradas abatem do saldo de quem enviou e,
  // quando vão direto para o outro, aumentam o saldo de quem recebeu.
  let dueA = r.respA - r.paidA
  let dueB = r.respB - r.paidB
  transfers.forEach(tr => {
    const amount = Number(tr.amount)
    if (tr.from_person === 'a') { dueA -= amount; r.transferredA += amount }
    if (tr.from_person === 'b') { dueB -= amount; r.transferredB += amount }
    if (tr.to_person === 'a') { dueA += amount; r.transferredA -= amount }
    if (tr.to_person === 'b') { dueB += amount; r.transferredB -= amount }
  })
  dueA = round2(dueA)
  dueB = round2(dueB)
  // O que ainda falta entrar na conta conjunta = dueA + dueB
  const jointDue = round2(dueA + dueB)

  const moves = []
  if (dueA <= 0 && dueB <= 0) {
    // Ninguém deve nada (a conjunta recebeu tudo o que precisava, ou mais)
  } else if (dueA >= 0 && dueB >= 0) {
    if (dueA > 0) moves.push({ from: 'a', to: 'conjunta', amount: dueA })
    if (dueB > 0) moves.push({ from: 'b', to: 'conjunta', amount: dueB })
  } else if (dueA < 0) {
    // A pagou a mais: B devolve para A e cobre o que faltar na conjunta
    moves.push({ from: 'b', to: 'a', amount: round2(-dueA) })
    if (jointDue > 0) moves.push({ from: 'b', to: 'conjunta', amount: jointDue })
  } else {
    moves.push({ from: 'a', to: 'b', amount: round2(-dueB) })
    if (jointDue > 0) moves.push({ from: 'a', to: 'conjunta', amount: jointDue })
  }

  return { ...r, dueA, dueB, jointDue, moves }
}
