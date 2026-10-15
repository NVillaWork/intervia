import { useEffect, useState } from 'react'
import { listClients } from './api/clients.js'
import ClientsPage from './components/ClientsPage.jsx'
import './App.css'

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'clienti', label: 'Clienti', icon: '♙' },
  { id: 'impianti', label: 'Impianti', icon: '▤' },
  { id: 'interventi', label: 'Interventi', icon: '☷' },
]

const initialActivities = [
  {
    id: 1,
    title: 'Manutenzione completata',
    customer: 'Alfa S.r.l.',
    detail: 'Impianto di climatizzazione',
    date: 'Oggi, 09:42',
    status: 'Completato',
  },
  {
    id: 2,
    title: 'Manutenzione programmata',
    customer: 'Beta S.p.A.',
    detail: 'Impianto elettrico',
    date: 'Oggi, 08:15',
    status: 'Pianificato',
  },
  {
    id: 3,
    title: 'Controllo periodico',
    customer: 'Gamma S.r.l.',
    detail: 'Impianto antincendio',
    date: 'Ieri, 16:30',
    status: 'In attesa',
  },
]

function App() {
  const [activePage, setActivePage] = useState('dashboard')

  const activeItem = navigation.find(
    (item) => item.id === activePage,
  )

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setActivePage('dashboard')}>
          <span className="brand-mark">i</span>
          <span className="brand-name">intervia</span>
        </a>

        <div className="sidebar-section">
          <p className="sidebar-heading">MENU PRINCIPALE</p>

          <nav className="navigation">
            {navigation.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${
                  activePage === item.id ? 'active' : ''
                }`}
                onClick={() => setActivePage(item.id)}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">?</span>
            <div>
              <strong>Hai bisogno di aiuto?</strong>
              <p>Consulta la documentazione</p>
            </div>
          </div>

          <div className="user-profile">
            <div className="avatar">AM</div>
            <div className="user-info">
              <strong>Andrea Moretti</strong>
              <span>Amministratore</span>
            </div>
            <button className="profile-menu" aria-label="Opzioni profilo">
              ⋯
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Intervia</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{activeItem.label}</strong>
          </div>

          <div className="topbar-actions">
            <span className="environment-label">AMBIENTE DEMO</span>
            <button className="notification-button" aria-label="Notifiche">
              ♧
              <span className="notification-dot" />
            </button>
            <div className="topbar-avatar">AM</div>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <p className="eyebrow">PANORAMICA OPERATIVA</p>
              <h1>{activeItem.label}</h1>
              <p className="page-description">
                {activePage === 'dashboard'
                  ? 'Tieni sotto controllo clienti, impianti e attività.'
                  : `Gestisci e consulta ${activeItem.label.toLowerCase()}.`}
              </p>
            </div>

            {activePage !== 'clienti' && (
              <button
                className="primary-button"
                onClick={() => {
                  const nextPage =
                    activePage === 'impianti'
                      ? 'un impianto'
                      : 'un intervento'

                  window.alert(
                    `La funzione per aggiungere ${nextPage} verrà implementata in seguito.`,
                  )
                }}
              >
                <span>+</span> Nuovo elemento
              </button>
            )}
          </section>

          {activePage === 'dashboard' ? (
            <Dashboard />
          ) : activePage === 'clienti' ? (
            <ClientsPage />
          ) : (
            <section className="placeholder-panel">
              <div className="placeholder-icon">
                {activeItem.icon}
              </div>
              <h2>{activeItem.label}</h2>
              <p>
                Questa sezione verrà sviluppata nel prossimo passaggio.
                La navigazione è già funzionante.
              </p>
              <button
                className="secondary-button"
                onClick={() => setActivePage('dashboard')}
              >
                Torna alla dashboard
              </button>
            </section>
          )}

          <footer className="page-footer">
            <span>Intervia · Gestione operativa</span>
            <span>
              {activePage === 'clienti'
                ? 'Clienti salvati nel database locale'
                : 'Prototipo iniziale · Dati dimostrativi'}
            </span>
          </footer>
        </div>
      </main>
    </div>
  )
}

function Dashboard() {
  const [clientCount, setClientCount] = useState(null)
  const [clientCountError, setClientCountError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    listClients({ signal: controller.signal })
      .then((clients) => {
        if (!controller.signal.aborted) {
          setClientCount(
            clients.filter((client) => client.status === 'active').length,
          )
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setClientCountError(error.message)
        }
      })

    return () => controller.abort()
  }, [])

  const metrics = [
    {
      label: 'Clienti attivi',
      value: clientCount === null ? '—' : String(clientCount),
      change:
        clientCountError
          ? 'Non disponibile'
          : clientCount === null
            ? 'Caricamento...'
            : 'Nel database locale',
      icon: '♙',
      tone: 'blue',
    },
    {
      label: 'Impianti registrati',
      value: '68',
      change: 'Dati dimostrativi',
      icon: '▤',
      tone: 'violet',
    },
    {
      label: 'Interventi da svolgere',
      value: '7',
      change: '3 nei prossimi 7 giorni',
      icon: '☷',
      tone: 'orange',
    },
    {
      label: 'Manutenzioni scadute',
      value: '3',
      change: 'Richiedono attenzione',
      icon: '!',
      tone: 'red',
    },
  ]

  return (
    <>
      <section className="metrics-grid">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className="metric-top">
              <span className="metric-label">{metric.label}</span>
              <span className={`metric-icon ${metric.tone}`}>
                {metric.icon}
              </span>
            </div>
            <strong className="metric-value">{metric.value}</strong>
            <span className="metric-caption">{metric.change}</span>
          </article>
        ))}
      </section>

      {clientCountError && (
        <p className="client-message error dashboard-message" role="alert">
          {clientCountError}
        </p>
      )}

      <section className="content-grid">
        <article className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Attività recenti</h2>
              <p>Ultimi aggiornamenti registrati</p>
            </div>
            <button className="text-button">Visualizza tutte →</button>
          </div>

          <div className="activity-list">
            {initialActivities.map((activity) => (
              <div className="activity-row" key={activity.id}>
                <div className="activity-indicator">
                  {activity.id === 1
                    ? '✓'
                    : activity.id === 2
                      ? '◷'
                      : '!'}
                </div>

                <div className="activity-details">
                  <strong>{activity.title}</strong>
                  <span>
                    {activity.customer} · {activity.detail}
                  </span>
                </div>

                <div className="activity-meta">
                  <span
                    className={`status status-${activity.id}`}
                  >
                    {activity.status}
                  </span>
                  <time>{activity.date}</time>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel attention-panel">
          <div className="panel-heading">
            <div>
              <h2>Da tenere d'occhio</h2>
              <p>Attività che richiedono attenzione</p>
            </div>
          </div>

          <div className="attention-item">
            <span className="attention-symbol red">!</span>
            <div>
              <strong>Manutenzioni scadute</strong>
              <p>3 impianti da verificare</p>
            </div>
            <span className="attention-count">3</span>
          </div>

          <div className="attention-item">
            <span className="attention-symbol orange">◷</span>
            <div>
              <strong>Interventi imminenti</strong>
              <p>Nei prossimi 7 giorni</p>
            </div>
            <span className="attention-count">7</span>
          </div>

          <div className="attention-note">
            Il conteggio clienti è aggiornato dal database locale; gli altri
            dati sono dimostrativi.
          </div>
        </article>
      </section>
    </>
  )
}

export default App