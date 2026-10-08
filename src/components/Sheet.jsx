import React, { useEffect } from 'react'

// Janela de formulário: gaveta que sobe de baixo no celular e
// caixa centralizada no computador (ver .sheet no CSS).
export default function Sheet({ title, onClose, children }) {
  useEffect(() => {
    document.body.classList.add('no-scroll')
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('no-scroll')
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="sheet-root" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h2>{title}</h2>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}
