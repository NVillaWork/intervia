import { useEffect, useState } from 'react'
import { listClients } from './api/clients.js'
import { listInterventions } from './api/interventions.js'
import ClientsPage from './components/ClientsPage.jsx'
import InterventionsPage from './components/InterventionsPage.jsx'
import { listPlants } from './api/plants.js'
import PlantsPage from './components/PlantsPage.jsx'
import './styles/App.css'
import './styles/Dashboard.css'
import './styles/Records.css'

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'clienti', label: 'Clienti', icon: '♙' },
  { id: 'impianti', label: 'Impianti', icon: '▤' },
  { id: 'interventi', label: 'Interventi', icon: '☷' },
]

function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [interventionFilter, setInterventionFilter] = useState('open')
  const [interventionPlant, setInterventionPlant] = useState(null)

  const activeItem = navigation.find(
    (item) => item.id === activePage,
  )

  function navigateToInterventions(filter = 'open') {
    setInterventionFilter(filter)
    setInterventionPlant(null)
    setActivePage('interventi')
  }

  function navigateToPlantInterventions(plant) {
    setInterventionFilter('all')
    setInterventionPlant(plant)
    setActivePage('interventi')
  }

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
                aria-label={item.label}
                aria-current={activePage === item.id ? 'page' : undefined}
                onClick={() => {
                  if (item.id === 'interventi') {
                    navigateToInterventions()
                  } else {
                    setActivePage(item.id)
                  }
                }}
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
          </section>

          {activePage === 'dashboard' ? (
            <Dashboard
              onNavigate={navigateToInterventions}
              onNavigatePage={setActivePage}
            />
          ) : activePage === 'clienti' ? (
            <ClientsPage />
          ) : activePage === 'impianti' ? (
            <PlantsPage onViewInterventions={navigateToPlantInterventions} />
          ) : activePage === 'interventi' ? (
            <InterventionsPage
              key={`${interventionFilter}-${interventionPlant?.id ?? 'all'}`}
              initialFilter={interventionFilter}
              plant={interventionPlant}
              onClearPlantFilter={() => setInterventionPlant(null)}
            />
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
            <span>Dati aggiornati dal database locale</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

function Dashboard({ onNavigate, onNavigatePage }) {
  const [clientCount, setClientCount] = useState(null)
  const [clientCountError, setClientCountError] = useState('')
  const [plantCount, setPlantCount] = useState(null)
  const [plantCountError, setPlantCountError] = useState('')
  const [interventions, setInterventions] = useState([])
  const [interventionError, setInterventionError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [today, setToday] = useState('')
  const [nextWeek, setNextWeek] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    Promise.allSettled([
      listClients({ signal: controller.signal }),
      listPlants({ signal: controller.signal }),
      listInterventions({ signal: controller.signal }),
    ])
      .then(([clientResult, plantResult, interventionResult]) => {
        if (!controller.signal.aborted) {
          const currentDate = new Date()
          currentDate.setHours(0, 0, 0, 0)
          const weekEnd = new Date(currentDate)
          weekEnd.setDate(weekEnd.getDate() + 7)
          const localDateValue = (date) =>
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
              date.getDate(),
            ).padStart(2, '0')}`
          setToday(localDateValue(currentDate))
          setNextWeek(localDateValue(weekEnd))

          if (clientResult.status === 'fulfilled') {
            setClientCount(
              clientResult.value.filter((client) => client.status === 'active')
                .length,
            )
          } else {
            setClientCountError(clientResult.reason.message)
          }
          if (plantResult.status === 'fulfilled') {
            setPlantCount(
              plantResult.value.filter((plant) => plant.status === 'active')
                .length,
            )
          } else {
            setPlantCountError(plantResult.reason.message)
          }
          if (interventionResult.status === 'fulfilled') {
            setInterventions(interventionResult.value)
          } else {
            setInterventionError(interventionResult.reason.message)
          }
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setClientCountError(error.message)
          setPlantCountError(error.message)
          setInterventionError(error.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  const openInterventions = interventions.filter(
    (intervention) => intervention.status !== 'completed',
  )
  const overdueCount = interventions.filter(
    (intervention) => intervention.status === 'overdue',
  ).length
  const nextWeekCount = openInterventions.filter((intervention) => {
    return intervention.due_date >= today && intervention.due_date <= nextWeek
  }).length

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
      onClick: () => onNavigatePage('clienti'),
    },
    {
      label: 'Impianti registrati',
      value: plantCount === null ? '—' : String(plantCount),
      change:
        plantCountError
          ? 'Non disponibile'
          : plantCount === null
            ? 'Caricamento...'
            : 'Nel database locale',
      icon: '▤',
      tone: 'violet',
      onClick: () => onNavigatePage('impianti'),
    },
    {
      label: 'Interventi da svolgere',
      value:
        interventionError || isLoading ? '—' : String(openInterventions.length),
      change: interventionError
        ? 'Non disponibile'
        : isLoading
          ? 'Caricamento...'
          : 'In programma o in ritardo',
      icon: '☷',
      tone: 'orange',
      onClick: () => onNavigate(),
    },
    {
      label: 'Interventi scaduti',
      value: interventionError || isLoading ? '—' : String(overdueCount),
      change: interventionError
        ? 'Non disponibile'
        : isLoading
          ? 'Caricamento...'
          : 'Richiedono attenzione',
      icon: '!',
      tone: 'red',
      onClick: () => onNavigate('overdue'),
    },
  ]

  return (
    <>
      <section className="metrics-grid">
        {metrics.map((metric) => {
          const Card = metric.onClick ? 'button' : 'article'
          return (
            <Card
              className={
                metric.onClick
                  ? `metric-card metric-card-button metric-card-button-${metric.tone}`
                  : 'metric-card'
              }
              key={metric.label}
              onClick={metric.onClick}
              type={metric.onClick ? 'button' : undefined}
            >
              <div className="metric-top">
                <span className="metric-label">{metric.label}</span>
                <span className={`metric-icon ${metric.tone}`}>
                  {metric.icon}
                </span>
              </div>
              <strong className="metric-value">{metric.value}</strong>
              <span className="metric-caption">{metric.change}</span>
            </Card>
          )
        })}
      </section>

      {(clientCountError || plantCountError || interventionError) && (
        <p className="client-message error dashboard-message" role="alert">
          {clientCountError || plantCountError || interventionError}
        </p>
      )}

      <section className="content-grid">
        <article className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Prossimi interventi</h2>
              <p>Scadenze da tenere sotto controllo</p>
            </div>
            <button
              className="text-button"
              onClick={() => onNavigate()}
              type="button"
            >
              Gestisci interventi →
            </button>
          </div>

          <div className="activity-list">
            {openInterventions.slice(0, 3).map((intervention) => (
              <div className="activity-row" key={intervention.id}>
                <div
                  className={`activity-indicator ${
                    intervention.status === 'overdue' ? 'overdue' : ''
                  }`}
                >
                  {intervention.status === 'overdue' ? '!' : '◷'}
                </div>

                <div className="activity-details">
                  <strong>{intervention.title}</strong>
                  <span>
                    {intervention.plant_code} · {intervention.plant_name} ·{' '}
                    {intervention.client_name}
                  </span>
                </div>

                <div className="activity-meta">
                  <span
                    className={`status ${
                      intervention.status === 'overdue' ? 'status-3' : 'status-1'
                    }`}
                  >
                    {intervention.status === 'overdue' ? 'Scaduto' : 'Attivo'}
                    <span aria-hidden="true" className="status-symbol">
                      {intervention.status === 'overdue' ? 'X' : '✓'}
                    </span>
                  </span>
                  <time>
                    {new Date(
                      `${intervention.due_date}T00:00:00`,
                    ).toLocaleDateString('it-IT')}
                  </time>
                </div>
              </div>
            ))}
            {!isLoading && openInterventions.length === 0 && (
              <p className="dashboard-empty">Nessun intervento da svolgere.</p>
            )}
            {isLoading && (
              <p className="dashboard-empty">Caricamento interventi...</p>
            )}
          </div>
        </article>

        <article className="panel attention-panel">
          <div className="panel-heading">
            <div>
              <h2>Da tenere d'occhio</h2>
              <p>Attività che richiedono attenzione</p>
            </div>
          </div>

          <button
            aria-label="Apri gli interventi scaduti"
            className="attention-item attention-item-button"
            onClick={() => onNavigate('overdue')}
            type="button"
          >
            <span className="attention-symbol red">!</span>
            <div>
              <strong>Interventi scaduti</strong>
              <p>Da pianificare o completare</p>
            </div>
            <span className="attention-count">
              {isLoading || interventionError ? '—' : overdueCount}
            </span>
          </button>

          <div className="attention-item">
            <span className="attention-symbol orange">◷</span>
            <div>
              <strong>Entro i prossimi 7 giorni</strong>
              <p>In scadenza</p>
            </div>
            <span className="attention-count">
              {isLoading || interventionError ? '—' : nextWeekCount}
            </span>
          </div>

          <div className="attention-note">
            Clienti, impianti e scadenze sono aggiornati dal database locale.
          </div>
        </article>
      </section>
    </>
  )
}

export default App