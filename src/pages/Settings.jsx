import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export default function Settings() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [ativo, setAtivo] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('profiles')
        .select('whatsapp_number, callmebot_apikey, whatsapp_ativo, is_premium')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setWhatsappNumber(data.whatsapp_number || '')
        setApiKey(data.callmebot_apikey || '')
        setAtivo(data.whatsapp_ativo || false)
        setIsPremium(data.is_premium || false)
      }
      setLoading(false)
    }
    load()
  }, [user.id])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('profiles')
      .update({
        whatsapp_number: whatsappNumber,
        callmebot_apikey: apiKey,
        whatsapp_ativo: ativo
      })
      .eq('id', user.id)

    setSaving(false)
    setMessage(error ? 'Não foi possível guardar. Tenta novamente.' : 'Definições guardadas.')
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
          Alertas WhatsApp
        </h2>
        <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>
          Lembretes para registares deslocações e um resumo no início de cada mês.
        </p>

        {!isPremium && (
          <div className="error-box" style={{ background: '#FBF3E4', color: 'var(--accent-ink)' }}>
            Esta é uma funcionalidade Premium. Podes configurar já, mas os alertas só
            começam a ser enviados quando a tua conta passar a Premium.
          </div>
        )}

        <div className="placeholder-card" style={{ textAlign: 'left', marginBottom: 20 }}>
          <strong>Como obter a tua apikey do CallMeBot:</strong>
          <ol style={{ paddingLeft: 18, margin: '10px 0 0', color: 'var(--ink-soft)' }}>
            <li>Adiciona o contacto +34 644 59 71 67 no WhatsApp.</li>
            <li>
              Envia a mensagem: <span className="data">"I allow callmebot to send me messages"</span>
            </li>
            <li>O CallMeBot responde com a tua apikey pessoal — copia-a para aqui em baixo.</li>
          </ol>
        </div>

        {message && <div className="error-box" style={{ background: '#EAF3EE', color: 'var(--route)' }}>{message}</div>}

        <form onSubmit={handleSave}>
          <div className="field">
            <label htmlFor="whatsappNumber">Número de WhatsApp (com indicativo)</label>
            <input
              id="whatsappNumber"
              type="tel"
              placeholder="+351912345678"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="apiKey">Apikey do CallMeBot</label>
            <input
              id="apiKey"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              id="ativo"
              type="checkbox"
              style={{ width: 'auto' }}
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
            />
            <label htmlFor="ativo" style={{ margin: 0 }}>
              Ativar alertas WhatsApp
            </label>
          </div>
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </form>
      </main>
    </div>
  )
}
