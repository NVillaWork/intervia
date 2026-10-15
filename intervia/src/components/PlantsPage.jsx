import { useEffect, useRef, useState } from 'react'
import { listClients } from '../api/clients.js'
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

function PlantForm({ clients, isSaving, onCancel, onSave, plant }) {
  const clientPickerRef = useRef(null)
  const [form, setForm] = useState(() => ({
    name: plant?.name ?? '',
    client_id: plant ? String(plant.client_id) : '',
    location: plant?.location ?? '',
  }))
  const [clientQuery, setClientQuery] = useState(
    () => clients.find((client) => client.id === plant?.client_id)?.name ?? '',
  )
  const [isClientListOpen, setIsClientListOpen] = useState(false)

  const filteredClients = clients.filter((client) =>
    client.name.toLocaleLowerCase('it').includes(clientQuery.trim().toLocaleLowerCase('it')),
  )

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleClientQueryChange(event) {
    const { value } = event.target
    event.target.setCustomValidity('')
    setClientQuery(value)
    setForm((current) => ({ ...current, client_id: '' }))
    setIsClientListOpen(true)
  }

  function selectClient(client) {
    setClientQuery(client.name)
    setForm((current) => ({ ...current, client_id: String(client.id) }))
    setIsClientListOpen(false)
    clientPickerRef.current?.querySelector('input')?.setCustomValidity('')
  }

  function handleClientKeyDown(event) {
    if (event.key === 'Escape') {
      setIsClientListOpen(false)
    } else if (event.key === 'ArrowDown' && isClientListOpen) {
      event.preventDefault()
      clientPickerRef.current
        ?.querySelector('[role="option"]')
        ?.focus()
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    const clientInput = clientPickerRef.current?.querySelector('input')
    clientInput?.setCustomValidity(
      form.client_id ? '' : 'Seleziona un cliente dall’elenco.',
    )
    if (!event.currentTarget.reportValidity()) {
      return
    }

    onSave({
      name: form.name.trim(),
      client_id: Number(form.client_id),
      location: form.location.trim() || null,
    })
  }

  return (
    <form className="client-form" onSubmit={handleSubmit}>
      <div className="client-form-heading">
        <div>
          <h3>{plant ? 'Modifica impianto' : 'Nuovo impianto'}</h3>
          <p>Il codice impianto viene assegnato automaticamente.</p>
        </div>
      </div>

      <div className="client-form-grid">
        <label className="client-field">
          <span>Nome impianto *</span>
          <input
            autoComplete="off"
            maxLength={200}
            name="name"
            onChange={handleChange}
            placeholder="Es. Climatizzazione uffici"
            required
            value={form.name}
          />
        </label>

        <div className="client-field">
          <label htmlFor="plant-client-search">Cliente *</label>
          <div className="client-picker" ref={clientPickerRef}>
            <input
              aria-autocomplete="list"
              aria-controls="plant-client-options"
              aria-expanded={isClientListOpen}
              autoComplete="off"
              id="plant-client-search"
              onBlur={(event) => {
                if (
                  !clientPickerRef.current?.contains(event.relatedTarget)
                ) {
                  setIsClientListOpen(false)
                }
              }}
              onChange={handleClientQueryChange}
              onFocus={() => setIsClientListOpen(true)}
              onKeyDown={handleClientKeyDown}
              placeholder="Cerca un cliente..."
              required
              role="combobox"
              value={clientQuery}
            />
            {isClientListOpen && (
              <div
                className="client-picker-options"
                id="plant-client-options"
                role="listbox"
              >
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <button
                      aria-selected={form.client_id === String(client.id)}
                      className="client-picker-option"
                      key={client.id}
                      onClick={() => selectClient(client)}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          setIsClientListOpen(false)
                          clientPickerRef.current
                            ?.querySelector('input')
                            ?.focus()
                        } else if (event.key === 'ArrowDown') {
                          event.preventDefault()
                          event.currentTarget.nextElementSibling?.focus()
                        } else if (event.key === 'ArrowUp') {
                          event.preventDefault()
                          if (event.currentTarget.previousElementSibling) {
                            event.currentTarget.previousElementSibling.focus()
                          } else {
                            clientPickerRef.current
                              ?.querySelector('input')
                              ?.focus()
                          }
                        }
                      }}
                      role="option"
                      type="button"
                    >
                      {client.name}
                    </button>
                  ))
                ) : (
                  <p className="client-picker-empty" role="status">
                    Nessun cliente trovato
                  </p>
                )}
              </div>
            )}
          </div>
          <span className="client-field-hint">
            Digita per filtrare e seleziona un cliente dall’elenco.
          </span>
        </div>

        <label className="client-field client-field-full">
          <span>Indirizzo impianto</span>
          <input
            autoComplete="street-address"
            maxLength={300}
            name="location"
            onChange={handleChange}
            placeholder="Facoltativo, se diverso dalla sede del cliente"
            value={form.location}
          />
          <span className="client-field-hint">
            L’indirizzo viene normalizzato prima di essere salvato.
          </span>
        </label>
      </div>

      <div className="client-form-actions">
        <button
          className="secondary-button"
          disabled={isSaving}
          onClick={onCancel}
          type="button"
        >
          Annulla
        </button>
        <button className="primary-button" disabled={isSaving} type="submit">
          {isSaving
            ? 'Salvataggio...'
            : plant
              ? 'Salva modifiche'
              : 'Crea impianto'}
        </button>
      </div>
    </form>
  )
}

function DeletePlantDialog({ isDeleting, onCancel, onConfirm, plant }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) {
      dialog.showModal()
    }

    return () => {
      if (dialog?.open) {
        dialog.close()
      }
    }
  }, [])

  return (
    <dialog
      aria-describedby="delete-plant-description"
      aria-labelledby="delete-plant-title"
      className="delete-dialog"
      onCancel={(event) => {
        event.preventDefault()
        if (!isDeleting) {
          onCancel()
        }
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !isDeleting) {
          onCancel()
        }
      }}
      ref={dialogRef}
    >
      <div className="delete-dialog-content">
        <div aria-hidden="true" className="delete-dialog-icon">
          !
        </div>
        <p className="delete-dialog-eyebrow">ELIMINAZIONE IMPIANTO</p>
        <h2 id="delete-plant-title">Vuoi eliminare questo impianto?</h2>
        <p className="delete-dialog-description" id="delete-plant-description">
          <strong>{plant.name}</strong> ({plant.code}) verrà rimosso dall’elenco.
          Questa operazione non può essere annullata.
        </p>
        <div className="delete-dialog-actions">
          <button
            autoFocus
            className="secondary-button"
            disabled={isDeleting}
            onClick={onCancel}
            type="button"
          >
            Annulla
          </button>
          <button
            className="danger-button delete-confirm-button"
            disabled={isDeleting}
            onClick={onConfirm}
            type="button"
          >
            {isDeleting ? 'Eliminazione...' : 'Elimina impianto'}
          </button>
        </div>
      </div>
    </dialog>
  )
}

function PlantsPage() {
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
              <div className="client-actions">
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
