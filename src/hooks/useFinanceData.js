import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useFinanceData() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [balances, setBalances] = useState([])
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [goals, setGoals] = useState([])
  const [fixedExpenses, setFixedExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [accRes, balRes, catRes, txRes, goalRes, fixedRes] = await Promise.all([
      supabase.from('accounts').select('*').order('created_at'),
      supabase.from('account_balances').select('*'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('transactions').select('*, categories(name,color), accounts(name)').order('date', { ascending: false }).limit(200),
      supabase.from('goals').select('*').order('created_at'),
      supabase.from('fixed_expenses_status').select('*, categories(name), accounts(name)').order('due_day'),
    ])
    setAccounts(accRes.data || [])
    setBalances(balRes.data || [])
    setCategories(catRes.data || [])
    setTransactions(txRes.data || [])
    setGoals(goalRes.data || [])
    setFixedExpenses(fixedRes.data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { reload() }, [reload])

  return { accounts, balances, categories, transactions, goals, fixedExpenses, loading, reload }
}
