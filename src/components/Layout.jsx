import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Painel', icon: '▤' },
  { to: '/transacoes', label: 'Transações', icon: '≡' },
  { to: '/contas', label: 'Contas', icon: '▢' },
  { to: '/metas', label: 'Metas', icon: '◎' },
]

export default function Layout() {
  const { user, signOut } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="auth-brand-mark">₡</span>
          <span>Caderneta</span>
        </div>
        <nav className="sidebar-nav">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <span className="nav-icon">{l.icon}</span>{l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="sidebar-email" title={user?.email}>{user?.email}</span>
          <button className="btn-ghost" onClick={signOut}>Sair</button>
        </div>
      </aside>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
