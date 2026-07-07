import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A palavra-passe deve ter pelo menos 6 caracteres.')
      return
    }

    setSubmitting(true)
    const { error } = await signUp({ email, password, fullName })
    setSubmitting(false)

    if (error) {
      setError('Não foi possível criar a conta. Tenta novamente.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="auth-screen">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="route-line" style={{ marginBottom: 14 }}>
            <span className="dot" />
            <span className="dash" />
            <span className="dot end" />
          </div>
          <h1 className="font-display" style={{ marginBottom: 10 }}>
            Confirma o teu email
          </h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Enviámos um link de confirmação para <strong>{email}</strong>. Depois de
            confirmares, já podes entrar.
          </p>
          <p className="auth-switch">
            <Link to="/entrar">Voltar a entrar</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="route-line" style={{ marginBottom: 14 }}>
            <span className="dot" />
            <span className="dash" />
            <span className="dot end" />
          </div>
          <h1 className="font-display">Criar conta</h1>
          <p>Regista-te para começares a acompanhar os teus km e despesas.</p>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="fullName">Nome</label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Palavra-passe</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'A criar conta…' : 'Criar conta'}
          </button>
        </form>

        <p className="auth-switch">
          Já tens conta? <Link to="/entrar">Entra aqui</Link>
        </p>
      </div>
    </div>
  )
}
