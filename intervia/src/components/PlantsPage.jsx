import { useEffect, useState } from 'react'
import { listClients } from '../api/clients.js'
import PlantForm from './plants/PlantForm.jsx'
import DeletePlantDialog from './plants/DeletePlantDialog.jsx'
import '../styles/Plants.css'
import {
  createPlant,
  deletePlant,
  listPlants,
  updatePlant,
} from '../api/plants.js'

function sortPlants(plants) {
  return [...plants].sort((first, second) =>
    first.name.localeCompare(second.name, 'it', { sensitivity: 'base' }),
  )
}

function PlantsPage({ onViewInterventions }) {
  const [plants, setPlants] = useState([])
  const [clients, setClients] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [plantToEdit, setPlantToEdit] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [plantToDelete, setPlantToDelete] = useState(null)
  const [deletingPlantId, setDeletingPlantId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('it')
  const filteredPlants = plants.filter((plant) =>
    [plant.name, plant.code, plant.client_name].some((value) =>
      value.toLocaleLowerCase('it').includes(normalizedQuery),
    ),
  )

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      listPlants({ signal: controller.signal }),
      listClients({ signal: controller.signal }),
    ])
      .then(([plantResults, clientResults]) => {
        if (!controller.signal.aborted) {
          setPlants(sortPlants(plantResults))
          setClients(clientResults)
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
    setPlantToEdit(null)
    setIsFormOpen(true)
  }

  function openEditForm(plant) {
    setActionError('')
    setSuccessMessage('')
    setPlantToEdit(plant)
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setPlantToEdit(null)
  }

  function retryLoading() {
    setIsLoading(true)
    setLoadError('')
    setReloadKey((current) => current + 1)
  }

  async function handleSave(values) {
    setIsSaving(true)
    setActionError('')
    setSuccessMessage('')

    try {
      const savedPlant = plantToEdit
        ? await updatePlant(plantToEdit.id, values)
        : await createPlant(values)

      setPlants((current) =>
        sortPlants([
          ...current.filter((plant) => plant.id !== savedPlant.id),
          savedPlant,
        ]),
      )
      closeForm()
      setSuccessMessage(
        plantToEdit
          ? 'Le modifiche all’impianto sono state salvate.'
          : 'L’impianto è stato creato.',
      )
    } catch (error) {
      setActionError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    const plant = plantToDelete
    if (!plant) {
      return
    }

    setDeletingPlantId(plant.id)
    setActionError('')
    setSuccessMessage('')

    try {
      await deletePlant(plant.id)
      setPlants((current) =>
        current.filter((currentPlant) => currentPlant.id !== plant.id),
      )
      setPlantToDelete(null)
      setSuccessMessage(`L’impianto "${plant.name}" è stato eliminato.`)
    } catch (error) {
      setActionError(error.message)
      setPlantToDelete(null)
    } finally {
      setDeletingPlantId(null)
    }
  }

  return (
    <section className="clients-panel">
      <div className="clients-toolbar">
        <div>
          <h2>Elenco impianti</h2>
          <p>
            {normalizedQuery
              ? `${filteredPlants.length} di ${plants.length} ${
                  plants.length === 1
                    ? 'impianto trovato'
                    : 'impianti trovati'
                }`
              : plants.length === 1
                ? '1 impianto registrato'
                : `${plants.length} impianti registrati`}
          </p>
        </div>
        <div className="clients-toolbar-actions">
          <label className="client-search">
            <span aria-hidden="true" className="client-search-icon">
              ⌕
            </span>
            <span className="visually-hidden">
              Cerca un impianto per nome, codice o cliente
            </span>
            <input
              autoComplete="off"
              disabled={isLoading || Boolean(loadError)}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cerca un impianto..."
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
              clients.length === 0 ||
              isFormOpen ||
              isSaving ||
              deletingPlantId !== null
            }
            onClick={openCreateForm}
            type="button"
          >
            <span>+</span> Nuovo impianto
          </button>
        </div>
      </div>

      {isFormOpen && (
        <PlantForm
          key={plantToEdit?.id ?? 'new-plant'}
          clients={clients}
          isSaving={isSaving}
          onCancel={closeForm}
          onSave={handleSave}
          plant={plantToEdit}
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

      {plantToDelete && (
        <DeletePlantDialog
          isDeleting={deletingPlantId === plantToDelete.id}
          onCancel={() => setPlantToDelete(null)}
          onConfirm={handleDelete}
          plant={plantToDelete}
        />
      )}

      {isLoading ? (
        <p className="client-list-state" role="status">
          Caricamento impianti...
        </p>
      ) : loadError ? (
        <div className="client-list-state">
          <p className="client-message error" role="alert">
            {loadError}
          </p>
          <button
            className="secondary-button"
            onClick={retryLoading}
            type="button"
          >
            Riprova
          </button>
        </div>
      ) : clients.length === 0 ? (
        <div className="client-list-state">
          <h3>Prima registra un cliente</h3>
          <p>
            Ogni impianto deve essere associato a un cliente. Aggiungi un
            cliente prima di creare il primo impianto.
          </p>
        </div>
      ) : plants.length === 0 ? (
        <div className="client-list-state">
          <h3>Nessun impianto registrato</h3>
          <p>Crea il primo impianto per iniziare a organizzare la manutenzione.</p>
          <button
            className="secondary-button"
            onClick={openCreateForm}
            type="button"
          >
            Aggiungi il primo impianto
          </button>
        </div>
      ) : normalizedQuery && filteredPlants.length === 0 ? (
        <div className="client-list-state">
          <h3>Nessun impianto trovato</h3>
          <p>
            Prova a modificare la ricerca o a cancellarla per vedere tutti gli
            impianti.
          </p>
          <button
            className="secondary-button"
            onClick={() => setSearchQuery('')}
            type="button"
          >
            Cancella ricerca
          </button>
        </div>
      ) : (
        <div className="client-list" aria-label="Impianti registrati" role="list">
          {filteredPlants.map((plant) => (
            <article className="client-row" key={plant.id} role="listitem">
              <div className="client-summary">
                <h3>{plant.name}</h3>
                <span className="client-id">
                  {plant.code} · ID {plant.id}
                </span>
              </div>
              <dl className="client-details plant-details">
                <div>
                  <dt>Cliente</dt>
                  <dd>{plant.client_name}</dd>
                </div>
                <div>
                  <dt>Indirizzo impianto</dt>
                  <dd>{plant.location || 'Non specificato'}</dd>
                </div>
              </dl>
              <div className="client-actions plant-actions">
                <button
                  className="secondary-button"
                  disabled={
                    isFormOpen || isSaving || deletingPlantId !== null
                  }
                  onClick={() => onViewInterventions(plant)}
                  type="button"
                >
                  Interventi
                </button>
                <button
                  className="secondary-button"
                  disabled={
                    isFormOpen || isSaving || deletingPlantId !== null
                  }
                  onClick={() => openEditForm(plant)}
                  type="button"
                >
                  Modifica
                </button>
                <button
                  className="danger-button"
                  disabled={
                    isFormOpen || isSaving || deletingPlantId !== null
                  }
                  onClick={() => setPlantToDelete(plant)}
                  type="button"
                >
                  {deletingPlantId === plant.id
                    ? 'Eliminazione...'
                    : 'Elimina'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default PlantsPage
