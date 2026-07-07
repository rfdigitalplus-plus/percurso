import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

const CATEGORIAS = [
  { value: 'combustivel', label: 'Combustível' },
  { value: 'portagens', label: 'Portagens' },
  { value: 'refeicoes', label: 'Refeições' },
  { value: 'estacionamento', label: 'Estacionamento' },
  { value: 'outro', label: 'Outro' }
]

function labelCategoria(value) {
  return CATEGORIAS.find((c) => c.value === value)?.label || value
}

export default function Despesas() {
  const { user } = useAuth()
  const [despesas, setDespesas] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const [novaData, setNovaData] = useState(new Date().toISOString().slice(0, 10))
  const [novaCategoria, setNovaCategoria] = useState('outro')
  const [novaDescricao, setNovaDescricao] = useState('')
  const [novoValor, setNovoValor] = useState('')

  const carregarDespesas = async () => {
    const { data, error } = await supabase
      .from('despesas')
      .select('*')
      .order('data', { ascending: false })
    if (!error) setDespesas(data || [])
    setLoading(false)
  }

  useEffect(() => {
    carregarDespesas()
  }, [])

  const pendentes = despesas.filter((d) => d.deteccao_ia && !d.confirmado)
  const confirmadas = despesas.filter((d) => d.confirmado)

  const handleAddManual = async (e) => {
    e.preventDefault()
    setError('')
    if (!novoValor || Number.isNaN(Number(novoValor))) {
      setError('Indica um valor válido.')
      return
    }
    const { error: insertError } = await supabase.from('despesas').insert({
      user_id: user.id,
      data: novaData,
      categoria: novaCategoria,
      descricao: novaDescricao,
      valor: Number(novoValor),
      deteccao_ia: false,
      confirmado: true
    })
    if (insertError) {
      setError('Não foi possível guardar a despesa.')
      return
    }
    setNovaDescricao('')
    setNovoValor('')
    carregarDespesas()
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)

    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('faturas')
        .upload(path, file, { contentType: file.type })

      if (uploadError) throw uploadError

      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token

      const response = await fetch('/api/parse-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, accessToken })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Erro ao processar a fatura')

      await carregarDespesas()
    } catch (err) {
      console.error(err)
      setError('Não foi possível processar a fatura. Podes sempre adicioná-la manualmente.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleConfirmar = async (despesa, alteracoes) => {
    const { error } = await supabase
      .from('despesas')
      .update({ ...alteracoes, confirmado: true })
      .eq('id', despesa.id)
    if (!error) carregarDespesas()
  }

  const handleEliminar = async (despesa) => {
    const { error } = await supabase.from('despesas').delete().eq('id', despesa.id)
    if (!error) carregarDespesas()
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
          Despesas
        </h2>
        <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>
          Regista manualmente ou envia uma foto/PDF da fatura para a IA preencher por ti.
        </p>

        {error && <div className="error-box">{error}</div>}

        {/* Upload de fatura */}
        <div className="placeholder-card" style={{ textAlign: 'left', marginBottom: 24 }}>
          <label
            htmlFor="fatura"
            className="btn-primary"
            style={{ display: 'inline-block', width: 'auto', cursor: 'pointer' }}
          >
            {uploading ? 'A processar…' : 'Enviar fatura (foto ou PDF)'}
          </label>
          <input
            id="fatura"
            type="file"
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            onChange={handleUpload}
            disabled={uploading}
          />
        </div>

        {/* Pendentes de confirmação */}
        {pendentes.length > 0 && (
          <>
            <h3 className="font-display" style={{ fontSize: '1rem', marginBottom: 10 }}>
              Por confirmar ({pendentes.length})
            </h3>
            {pendentes.map((d) => (
              <PendenteRow
                key={d.id}
                despesa={d}
                onConfirmar={handleConfirmar}
                onEliminar={handleEliminar}
              />
            ))}
          </>
        )}

        {/* Formulário manual */}
        <h3 className="font-display" style={{ fontSize: '1rem', margin: '24px 0 10px' }}>
          Adicionar manualmente
        </h3>
        <form onSubmit={handleAddManual} style={{ marginBottom: 28 }}>
          <div className="field">
            <label htmlFor="novaData">Data</label>
            <input
              id="novaData"
              type="date"
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="novaCategoria">Categoria</label>
            <select
              id="novaCategoria"
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--paper)'
              }}
            >
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="novaDescricao">Descrição</label>
            <input
              id="novaDescricao"
              type="text"
              value={novaDescricao}
              onChange={(e) => setNovaDescricao(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="novoValor">Valor (EUR)</label>
            <input
              id="novoValor"
              type="number"
              step="0.01"
              value={novoValor}
              onChange={(e) => setNovoValor(e.target.value)}
            />
          </div>
          <button className="btn-primary" type="submit">
            Adicionar despesa
          </button>
        </form>

        {/* Lista confirmadas */}
        <h3 className="font-display" style={{ fontSize: '1rem', marginBottom: 10 }}>
          Confirmadas
        </h3>
        {confirmadas.length === 0 ? (
          <div className="placeholder-card">Ainda não há despesas confirmadas.</div>
        ) : (
          confirmadas.map((d) => (
            <div
              key={d.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid var(--line)'
              }}
            >
              <div>
                <div>{d.descricao || labelCategoria(d.categoria)}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                  {d.data} · {labelCategoria(d.categoria)}
                </div>
              </div>
              <div className="data">{Number(d.valor).toFixed(2)} €</div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}

function PendenteRow({ despesa, onConfirmar, onEliminar }) {
  const [data, setData] = useState(despesa.data)
  const [categoria, setCategoria] = useState(despesa.categoria)
  const [descricao, setDescricao] = useState(despesa.descricao || '')
  const [valor, setValor] = useState(despesa.valor)

  return (
    <div
      className="placeholder-card"
      style={{ textAlign: 'left', marginBottom: 12, borderColor: 'var(--accent)' }}
    >
      <div style={{ fontSize: '0.8rem', color: 'var(--accent-ink)', marginBottom: 8 }}>
        Detetado por IA — confirma os dados antes de contar para os totais
      </div>
      <div className="field">
        <label>Data</label>
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      <div className="field">
        <label>Categoria</label>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--paper-raised)'
          }}
        >
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Descrição</label>
        <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </div>
      <div className="field">
        <label>Valor (EUR)</label>
        <input
          type="number"
          step="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn-primary"
          style={{ width: 'auto', flex: 1 }}
          onClick={() => onConfirmar(despesa, { data, categoria, descricao, valor: Number(valor) })}
        >
          Confirmar
        </button>
        <button className="btn-ghost" onClick={() => onEliminar(despesa)}>
          Eliminar
        </button>
      </div>
    </div>
  )
}
