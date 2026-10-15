import { useEffect, useState } from 'react'
import {
  completeIntervention,
  createIntervention,
  deleteIntervention,
  listInterventions,
  updateIntervention,
} from '../api/interventions.js'
import { listPlants } from '../api/plants.js'
import DeleteInterventionDialog from './interventions/DeleteInterventionDialog.jsx'
import InterventionForm from './interventions/InterventionForm.jsx'
import '../styles/Interventions.css'

const filters = [
  { id: 'open', label: 'Attivi' },
  { id: 'overdue', label: 'Scaduti' },
  { id: 'completed', label: 'Completati' },
  { id: 'all', label: 'Tutti' },
]

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function recurrenceLabel(intervention) {
  const labels = {
    once: 'Una sola volta',
    monthly: 'Mensile',
    quarterly: 'Trimestrale',
    semiannual: 'Semestrale',
    annual: 'Annuale',
  }
  return intervention.recurrence === 'custom_days'
    ? `Ogni ${intervention.recurrence_days} giorni`
    : labels[intervention.recurrence]
}

function InterventionsPage({
  initialFilter = 'open',
  onClearPlantFilter,
  plant,
}) {
  const [interventions, setInterventions] = useState([])
  const [plants, setPlants] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState(initialFilter)
  const [interventionToEdit, setInterventionToEdit] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [interventionToDelete, setInterventionToDelete] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [completingId, setCompletingId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('it')
  const scopedInterventions = plant
    ? interventions.filter(
        (intervention) => intervention.plant_id === plant.id,
      )
    : interventions
  const visibleInterventions = scopedInterventions.filter((intervention) => {
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'completed' && intervention.status === 'completed') ||
      (activeFilter === 'overdue' && intervention.status === 'overdue') ||
      (activeFilter === 'open' && intervention.status !== 'completed')
    const matchesQuery = [
      intervention.title,
      intervention.plant_name,
      intervention.plant_code,
      intervention.client_name,
    ].some((value) => value.toLocaleLowerCase('it').includes(normalizedQuery))
    return matchesFilter && matchesQuery
  })

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      listInterventions({ signal: controller.signal }),
      listPlants({ signal: controller.signal }),
    ])
      .then(([interventionResults, plantResults]) => {
        if (!controller.signal.aborted) {
          setInterventions(interventionResults)
          setPlants(plantResults)
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setLoadError(error.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [reloadKey])

  function openCreateForm() {
    setActionError('')
    setSuccessMessage('')
    setInterventionToEdit(null)
    setIsFormOpen(true)
  }

  function openEditForm(intervention) {
    setActionError('')
    setSuccessMessage('')
    setInterventionToEdit(intervention)
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setInterventionToEdit(null)
  }

  function reloadData() {
    setIsLoading(true)
    setLoadError('')
    setReloadKey((current) => current + 1)
  }

  async function handleSave(values) {
    setIsSaving(true)
    setActionError('')
    setSuccessMessage('')

    try {
      if (interventionToEdit) {
        await updateIntervention(interventionToEdit.id, values)
        setSuccessMessage('L’intervento è stato aggiornato.')
      } else {
        await createIntervention(values)
        setSuccessMessage('L’intervento è stato creato.')
      }
      closeForm()
      reloadData()
    } catch (error) {
      setActionError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleComplete(intervention) {
    setCompletingId(intervention.id)
    setActionError('')
    setSuccessMessage('')

    try {
      await completeIntervention(intervention.id)
      setSuccessMessage(
        intervention.recurrence === 'once'
          ? 'L’intervento è stato segnato come completato.'
          : 'Intervento completato e prossima scadenza pianificata.',
      )
      reloadData()
    } catch (error) {
      setActionError(error.message)
    } finally {
      setCompletingId(null)
    }
  }

  async function handleDelete() {
    const intervention = interventionToDelete
    if (!intervention) {
      return
    }

    setDeletingId(intervention.id)
    setActionError('')
    setSuccessMessage('')

    try {
      await deleteIntervention(intervention.id)
      setInterventionToDelete(null)
      setSuccessMessage('L’intervento è stato eliminato.')
      reloadData()
    } catch (error) {
      setActionError(error.message)
    } finally {
      setDeletingId(null)
    }
  }

  const filterCounts = {
    open: scopedInterventions.filter((item) => item.status !== 'completed').length,
    overdue: scopedInterventions.filter((item) => item.status === 'overdue').length,
    completed: scopedInterventions.filter((item) => item.status === 'completed').length,
    all: scopedInterventions.length,
  }

  return (
    <section className="clients-panel">
      <div className="clients-toolbar">
        <div>
          <h2>
            {plant ? `Interventi · ${plant.name}` : 'Interventi pianificati'}
          </h2>
          <p>
            {filterCounts.open === 1
              ? '1 intervento da svolgere'
              : `${filterCounts.open} interventi da svolgere`}
          </p>
          {plant && (
            <button
              className="intervention-clear-plant"
              onClick={onClearPlantFilter}
              type="button"
            >
              Mostra tutti gli interventi
            </button>
          )}
        </div>
        <div className="clients-toolbar-actions">
          <label className="client-search">
            <span aria-hidden="true" className="client-search-icon">
              ⌕
            </span>
            <span className="visually-hidden">
              Cerca per intervento, impianto o cliente
            </span>
            <input
              autoComplete="off"
              disabled={isLoading || Boolean(loadError)}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cerca interventi..."
              type="search"
              value={searchQuery}
            />
            {searchQuery && (
              <button
                aria-label="Cancella ricerca"
                className="client-search-clear"
                onClick={() => setSearchQuery('')}
                type="button"
              >
                ×
              </button>
            )}
          </label>
          <button
            className="primary-button"
            disabled={
              isLoading ||
              Boolean(loadError) ||
              plants.length === 0 ||
              isFormOpen ||
              isSaving ||
              deletingId !== null ||
              completingId !== null
            }
            onClick={openCreateForm}
            type="button"
          >
            <span>+</span> Nuovo intervento
          </button>
        </div>
      </div>

      {plants.length > 0 && (
        <div aria-label="Filtra interventi" className="intervention-filters">
          {filters.map((filter) => (
            <button
              aria-pressed={activeFilter === filter.id}
              className={
                activeFilter === filter.id
                  ? 'intervention-filter active'
                  : 'intervention-filter'
              }
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              type="button"
            >
              {filter.label}
              <span>{filterCounts[filter.id]}</span>
            </button>
          ))}
        </div>
      )}

      {isFormOpen && (
        <InterventionForm
          key={interventionToEdit?.id ?? 'new-intervention'}
          intervention={interventionToEdit}
          isSaving={isSaving}
          onCancel={closeForm}
          onSave={handleSave}
          plants={plants}
        />
      )}

      {actionError && (
        <p className="client-message error" role="alert">
          {actionError}
        </p>
      )}
      {successMessage && (
        <p className="client-message success" role="status">
          {successMessage}
        </p>
      )}

      {interventionToDelete && (
        <DeleteInterventionDialog
          intervention={interventionToDelete}
          isDeleting={deletingId === interventionToDelete.id}
          onCancel={() => setInterventionToDelete(null)}
          onConfirm={handleDelete}
        />
      )}

      {isLoading ? (
        <p className="client-list-state" role="status">
          Caricamento interventi...
        </p>
      ) : loadError ? (
        <div className="client-list-state">
          <p className="client-message error" role="alert">
            {loadError}
          </p>
          <button
            className="secondary-button"
            onClick={reloadData}
            type="button"
          >
            Riprova
          </button>
        </div>
      ) : plants.length === 0 ? (
        <div className="client-list-state">
          <h3>Prima registra un impianto</h3>
          <p>Ogni intervento deve essere associato a un impianto.</p>
        </div>
      ) : visibleInterventions.length === 0 ? (
        <div className="client-list-state">
          <h3>
            {normalizedQuery
              ? 'Nessun intervento trovato'
              : activeFilter === 'overdue'
                ? 'Nessun intervento scaduto'
                : activeFilter === 'completed'
                  ? 'Nessun intervento completato'
                  : activeFilter === 'open'
                    ? 'Nessun intervento attivo'
                    : 'Nessun intervento registrato'}
          </h3>
          <p>
            {normalizedQuery
              ? 'Prova a modificare la ricerca.'
              : activeFilter === 'overdue'
                ? 'Gli interventi scaduti appariranno qui.'
                : activeFilter === 'open'
                  ? 'Gli interventi attivi appariranno qui con la loro scadenza.'
                  : 'Crea un intervento per iniziare a pianificare la manutenzione.'}
          </p>
          {!normalizedQuery &&
            activeFilter !== 'completed' &&
            activeFilter !== 'overdue' && (
            <button
              className="secondary-button"
              onClick={openCreateForm}
              type="button"
            >
              Aggiungi il primo intervento
            </button>
          )}
        </div>
      ) : (
        <div
          aria-label="Interventi registrati"
          className="intervention-list"
          role="list"
        >
          {visibleInterventions.map((intervention) => (
            <article
              className="intervention-row"
              key={intervention.id}
              role="listitem"
            >
              <div className="intervention-summary">
                <span
                  className={`intervention-status ${intervention.status}`}
                >
                  {intervention.status === 'overdue'
                    ? 'Scaduto'
                    : intervention.status === 'completed'
                      ? 'Completato'
                      : 'Attivo'}
                  {intervention.status === 'overdue' ? (
                    <span aria-hidden="true" className="status-symbol">
                      X
                    </span>
                  ) : intervention.status === 'pending' ? (
                    <span aria-hidden="true" className="status-symbol">
                      ✓
                    </span>
                  ) : null}
                </span>
                <h3>{intervention.title}</h3>
                <p>
                  {intervention.plant_code} · {intervention.plant_name} ·{' '}
                  {intervention.client_name}
                </p>
              </div>
              <div className="intervention-schedule">
                <strong>{formatDate(intervention.due_date)}</strong>
                <span>{recurrenceLabel(intervention)}</span>
              </div>
              <div className="intervention-actions">
                {intervention.status !== 'completed' && (
                  <>
                    <button
                      className="primary-button"
                      disabled={
                        isFormOpen ||
                        isSaving ||
                        deletingId !== null ||
                        completingId !== null
                      }
                      onClick={() => handleComplete(intervention)}
                      type="button"
                    >
                      {completingId === intervention.id
                        ? 'Salvataggio...'
                        : 'Segna completato'}
                    </button>
                    <button
                      className="secondary-button"
                      disabled={
                        isFormOpen ||
                        isSaving ||
                        deletingId !== null ||
                        completingId !== null
                      }
                      onClick={() => openEditForm(intervention)}
                      type="button"
                    >
                      Modifica
                    </button>
                  </>
                )}
                <button
                  className="danger-button"
                  disabled={
                    isFormOpen ||
                    isSaving ||
                    deletingId !== null ||
                    completingId !== null
                  }
                  onClick={() => setInterventionToDelete(intervention)}
                  type="button"
                >
                  Elimina
                </button>
              </div>
              {intervention.notes && (
                <p className="intervention-notes">{intervention.notes}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default InterventionsPage
