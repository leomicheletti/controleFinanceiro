import { useEffect, useState } from 'react'

// Mesmo ponto de quebra usado no CSS para trocar o menu lateral pela barra inferior
export const MOBILE_QUERY = '(max-width: 860px)'

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = e => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
