import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'
import BrandMark from './BrandMark'

const links = [
  { to: '/', label: 'Painel', short: 'Painel', icon: '▤' },
  { to: '/transacoes', label: 'Transações', short: 'Lançar', icon: '≡' },
  { to: '/fixas', label: 'Despesas fixas', short: 'Fixas', icon: '⟲' },
  { to: '/acerto', label: 'Acerto do casal', short: 'Acerto', icon: '⇄' },
  { to: '/contas', label: 'Contas', short: 'Contas', icon: '▢' },
  { to: '/metas', label: 'Metas', short: 'Metas', icon: '◎' },
]

// Quantos links aparecem direto na barra inferior do celular; o resto vai para "Mais"
const BOTTOM_COUNT = 4

const COLLAPSE_KEY = 'sidebar-collapsed'

function readCollapsed() {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
}

export default function Layout() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileShell /> : <DesktopShell />
}

function DesktopShell() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(readCollapsed)

  function toggleCollapsed() {
    setCollapsed(c => {
      try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1') } catch {}
      return !c
    })
  }

  return (
    <div className={'app-shell' + (collapsed ? ' sidebar-collapsed' : '')}>
      <aside className="sidebar">
        <div className="sidebar-brand-row">
          <div className="sidebar-brand">
            <BrandMark size={24} />
            <span className="sidebar-text">Controle financeiro</span>
          </div>
        </div>

        <button className="sidebar-collapse-btn" onClick={toggleCollapsed} aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} title={collapsed ? 'Expandir menu' : 'Recolher menu'}>
          <span className="nav-icon">{collapsed ? '»' : '«'}</span>
          <span className="sidebar-text">Recolher menu</span>
        </button>

        <nav className="sidebar-nav">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} title={collapsed ? l.label : undefined} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <span className="nav-icon">{l.icon}</span>
              <span className="sidebar-text">{l.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="theme-toggle-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}>
            <span className="nav-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span className="sidebar-text">{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
          </button>
          <span className="sidebar-email sidebar-text" title={user?.email}>{user?.email}</span>
          <button className="btn-ghost sidebar-signout" onClick={signOut} title="Sair">
            <span className="nav-icon">⏻</span>
            <span className="sidebar-text">Sair</span>
          </button>
        </div>
      </aside>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}

function MobileShell() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const [barsHidden, setBarsHidden] = useState(false)

  const current = links.find(l => l.to === '/' ? location.pathname === '/' : location.pathname.startsWith(l.to))
  const bottomLinks = links.slice(0, BOTTOM_COUNT)
  const moreLinks = links.slice(BOTTOM_COUNT)
  const moreActive = moreLinks.some(l => l === current)

  // Fecha a gaveta e volta ao topo ao trocar de página
  useEffect(() => {
    setMoreOpen(false)
    setBarsHidden(false)
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Esconde as barras ao rolar para baixo e mostra de novo ao rolar para cima
  useEffect(() => {
    let lastY = window.scrollY
    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        const nearBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 8
        if (y < 60 || nearBottom) setBarsHidden(false)
        else if (y > lastY + 6) setBarsHidden(true)
        else if (y < lastY - 6) setBarsHidden(false)
        lastY = y
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('no-scroll', moreOpen)
    return () => document.body.classList.remove('no-scroll')
  }, [moreOpen])

  return (
    <div className={'mobile-shell' + (barsHidden ? ' bars-hidden' : '')}>
      <header className="mobile-topbar">
        <BrandMark size={22} />
        <span className="mobile-topbar-title">{current?.label || 'Controle financeiro'}</span>
        <button className="topbar-icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Navegação principal">
        {bottomLinks.map(l => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}>
            <span className="bottom-nav-icon">{l.icon}</span>
            <span>{l.short}</span>
          </NavLink>
        ))}
        <button className={'bottom-nav-item' + (moreActive || moreOpen ? ' active' : '')} onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen}>
          <span className="bottom-nav-icon">☰</span>
          <span>Mais</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="sheet-root" role="dialog" aria-modal="true" aria-label="Mais opções">
          <div className="sheet-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h2>Menu</h2>
              <button className="sheet-close" onClick={() => setMoreOpen(false)} aria-label="Fechar">✕</button>
            </div>
            <div className="sheet-body">
              <nav className="sheet-nav">
                {moreLinks.map(l => (
                  <NavLink key={l.to} to={l.to} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                    <span className="nav-icon">{l.icon}</span>{l.label}
                  </NavLink>
                ))}
              </nav>
              <div className="sheet-account">
                <span className="sidebar-email">{user?.email}</span>
                <button className="btn-ghost" onClick={signOut}>Sair</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
