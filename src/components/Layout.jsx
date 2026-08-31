import React, { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import BrandMark from './BrandMark'

const links = [
  { to: '/', label: 'Painel', icon: '▤' },
  { to: '/transacoes', label: 'Transações', icon: '≡' },
  { to: '/contas', label: 'Contas', icon: '▢' },
  { to: '/metas', label: 'Metas', icon: '◎' },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="app-shell">
      <button className="mobile-topbar-toggle" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
        <span className="hamburger">☰</span>
        <BrandMark size={20} />
        <span>Controle financeiro</span>
      </button>

      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={'sidebar' + (mobileOpen ? ' open' : '')}>
        <div className="sidebar-brand-row">
          <div className="sidebar-brand">
            <BrandMark size={24} />
            <span>Controle financeiro</span>
          </div>
          <button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">✕</button>
        </div>
        <nav className="sidebar-nav">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} onClick={() => setMobileOpen(false)} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <span className="nav-icon">{l.icon}</span>{l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ Ativar modo claro' : '🌙 Ativar modo escuro'}
          </button>
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
