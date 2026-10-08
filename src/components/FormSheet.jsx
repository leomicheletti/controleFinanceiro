import React, { useState } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import Sheet from './Sheet'

// No computador mostra o formulário normalmente na página.
// No celular, esconde o formulário atrás de um botão flutuante "+" e o abre
// numa gaveta que sobe de baixo, fechando sozinha depois de enviar.
export default function FormSheet({ title, fabLabel, children }) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  if (!isMobile) return children

  return (
    <>
      <button className="fab" onClick={() => setOpen(true)} aria-label={fabLabel || title}>
        <span aria-hidden="true">+</span>
        <span className="fab-label">{fabLabel || title}</span>
      </button>

      {open && (
        <Sheet title={title} onClose={() => setOpen(false)}>
          <div onSubmit={() => setOpen(false)}>{children}</div>
        </Sheet>
      )}
    </>
  )
}
