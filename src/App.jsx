import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Accounts from './pages/Accounts'
import Goals from './pages/Goals'

function PrivateRoute({ children }) {
  const { session } = useAuth()
  if (session === undefined) return <div className="loading-screen">Carregando…</div>
  if (!session) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { session } = useAuth()
  if (session === undefined) return <div className="loading-screen">Carregando…</div>
  if (session) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="transacoes" element={<Transactions />} />
          <Route path="contas" element={<Accounts />} />
          <Route path="metas" element={<Goals />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
