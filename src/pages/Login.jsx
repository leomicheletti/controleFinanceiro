import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('entrar') // 'entrar' | 'criar'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    const action = mode === 'entrar' ? signIn(email, password) : signUp(email, password)
    const { data, error } = await action
    setLoading(false)
    if (error) {
      setError(traduzErro(error.message))
      return
    }
    if (mode === 'criar' && !data.session) {
      setInfo('Conta criada. Verifique seu e-mail para confirmar o cadastro antes de entrar.')
      return
    }
    navigate('/')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark">₡</span>
          <h1>Micheletti</h1>
        </div>
        <p className="auth-sub">Seu controle financeiro, do jeito de um livro-caixa.</p>

        <div className="auth-tabs">
          <button className={mode === 'entrar' ? 'active' : ''} onClick={() => setMode('entrar')} type="button">Entrar</button>
          <button className={mode === 'criar' ? 'active' : ''} onClick={() => setMode('criar')} type="button">Criar conta</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            E-mail
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" />
          </label>
          <label>
            Senha
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="mínimo 6 caracteres" />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {info && <p className="auth-info">{info}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  )
}

function traduzErro(msg) {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (msg.includes('already registered')) return 'Este e-mail já está cadastrado.'
  return msg
}
