import React, { useEffect, useState } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'

// No computador mostra o formulário normalmente na página.
// No celular, esconde o formulário atrás de um botão flutuante "+" e o abre
// numa gaveta que sobe de baixo, fechando sozinha depois de enviar.
export default function FormSheet({ title, fabLabel, children }) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    document.body.classList.add('no-scroll')
    const onKey = e => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('no-scroll')
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!isMobile) return children

  return (
    <>
      <button className="fab" onClick={() => setOpen(true)} aria-label={fabLabel || title}>
        <span aria-hidden="true">+</span>
        <span className="fab-label">{fabLabel || title}</span>
      </button>

      {open && (
        <div className="sheet-root" role="dialog" aria-modal="true" aria-label={title}>
          <div className="sheet-backdrop" onClick={() => setOpen(false)} />
          <div className="sheet" onSubmit={() => setOpen(false)}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h2>{title}</h2>
              <button className="sheet-close" onClick={() => setOpen(false)} aria-label="Fechar">✕</button>
            </div>
            <div className="sheet-body">{children}</div>
          </div>
        </div>
      )}
    </>
  )
}
