import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { user, signOut } = useAuth()

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
        <button className="btn-ghost" onClick={signOut}>
          Sair
        </button>
      </header>

      <main className="app-main">
        <h2 className="font-display" style={{ fontSize: '1.3rem', marginBottom: 6 }}>
          Olá, {user?.user_metadata?.full_name || user?.email}
        </h2>
        <p style={{ color: 'var(--ink-soft)', marginBottom: 24 }}>
          A tua conta e a base de dados já estão prontas.
        </p>

        <div className="placeholder-card">
          Deslocações, despesas e relatórios entram na próxima fase.
        </div>
      </main>
    </div>
  )
}
