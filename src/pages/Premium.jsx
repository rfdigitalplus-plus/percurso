import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export default function Premium() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  const [iniciando, setIniciando] = useState(false)
  const [error, setError] = useState('')

  const isNative = Capacitor.isNativePlatform()

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single()
      setIsPremium(data?.is_premium || false)
      setLoading(false)
    }
    carregar()
  }, [user.id])

  const handleAssinar = async () => {
    setIniciando(true)
    setError('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Erro ao iniciar o pagamento')
      window.location.href = result.url
    } catch (err) {
      setError(err.message)
      setIniciando(false)
    }
  }

  if (loading) return null

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="route-line" style={{ maxWidth: 40 }}>
            <span className="dot" />
            <span className="dash" />
            <span className="dot end" />
          </div>
          Percurso
        </div>
        <Link className="btn-ghost" to="/">
          Voltar
        </Link>
      </header>

      <main className="app-main">
        <h2 className="font-display" style={{ fontSize: '1.3rem', marginBottom: 6 }}>
          Premium
        </h2>

        {searchParams.get('sucesso') && (
          <div className="error-box" style={{ background: '#EAF3EE', color: 'var(--route)' }}>
            Pagamento confirmado — a tua conta deve ficar Premium em poucos segundos.
          </div>
        )}
        {searchParams.get('cancelado') && (
          <div className="error-box">Pagamento cancelado — não te foi cobrado nada.</div>
        )}
        {error && <div className="error-box">{error}</div>}

        {isPremium ? (
          <div className="placeholder-card">
            Já és Premium. Alertas WhatsApp, deteção de faturas por IA e relatórios
            ilimitados estão ativos na tua conta.
          </div>
        ) : (
          <div className="placeholder-card" style={{ textAlign: 'left' }}>
            <p style={{ marginTop: 0 }}>
              <strong>Premium desbloqueia:</strong> alertas WhatsApp, deteção automática
              de faturas por IA, relatórios PDF ilimitados, sem anúncios, e exportação
              para o contabilista.
            </p>

            {isNative ? (
              <p style={{ color: 'var(--ink-soft)', marginBottom: 0 }}>
                Para assinares o Premium, vai a{' '}
                <strong>percurso.rfdigitalplus.pt/premium</strong> no browser do teu
                telemóvel ou computador. A tua conta fica Premium automaticamente assim
                que o pagamento for confirmado — não precisas de fazer mais nada aqui.
              </p>
            ) : (
              <button className="btn-primary" onClick={handleAssinar} disabled={iniciando}>
                {iniciando ? 'A abrir pagamento…' : 'Assinar Premium'}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
