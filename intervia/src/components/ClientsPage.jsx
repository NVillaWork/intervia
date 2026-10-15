import { useEffect, useState } from 'react'
import ClientForm from './clients/ClientForm.jsx'
import DeleteClientDialog from './clients/DeleteClientDialog.jsx'
import '../styles/Clients.css'
import {
  createClient,
  deleteClient,
  listClients,
  updateClient,
} from '../api/clients.js'

function sortClients(clients) {
  return [...clients].sort((first, second) =>
    first.name.localeCompare(second.name, 'it', { sensitivity: 'base' }),
  )
}

function ClientsPage() {
  const [clients, setClients] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [formClient, setFormClient] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [clientToDelete, setClientToDelete] = useState(null)
  const [deletingClientId, setDeletingClientId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase('it')

  const filteredClients = clients.filter((client) =>
    client.name.toLocaleLowerCase('it').includes(normalizedSearchQuery),
  )

  useEffect(() => {
    const controller = new AbortController()

    listClients({ signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) {
          setClients(sortClients(result))
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
    setFormClient(null)
    setIsFormOpen(true)
  }

  function openEditForm(client) {
    setActionError('')
    setSuccessMessage('')
    setFormClient(client)
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setFormClient(null)
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
      const savedClient = formClient
        ? await updateClient(formClient.id, values)
        : await createClient(values)

      setClients((current) =>
        sortClients([
          ...current.filter((client) => client.id !== savedClient.id),
          savedClient,
        ]),
      )
      closeForm()
      setSuccessMessage(
        formClient
          ? 'Le modifiche al cliente sono state salvate.'
          : 'Il cliente è stato creato.',
      )
    } catch (error) {
      setActionError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    const client = clientToDelete
    if (!client) {
      return
    }
    setDeletingClientId(client.id)
    setActionError('')
    setSuccessMessage('')

    try {
      await deleteClient(client.id)
      setClients((current) =>
        current.filter((currentClient) => currentClient.id !== client.id),
      )
      setClientToDelete(null)
      setSuccessMessage(`Il cliente "${client.name}" è stato eliminato.`)
    } catch (error) {
      setActionError(error.message)
      setClientToDelete(null)
    } finally {
      setDeletingClientId(null)
    }
  }

  return (
    <section className="clients-panel">
      <div className="clients-toolbar">
        <div>
          <h2>Elenco clienti</h2>
          <p>
            {normalizedSearchQuery
              ? `${filteredClients.length} di ${clients.length} ${
                  clients.length === 1 ? 'cliente trovato' : 'clienti trovati'
                }`
              : clients.length === 1
                ? '1 cliente registrato'
                : `${clients.length} clienti registrati`}
          </p>
        </div>
        <div className="clients-toolbar-actions">
          <label className="client-search">
            <span aria-hidden="true" className="client-search-icon">
              ⌕
            </span>
            <span className="visually-hidden">Cerca un cliente per nome</span>
            <input
              autoComplete="off"
              disabled={isLoading || Boolean(loadError)}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cerca un cliente..."
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
              isFormOpen ||
              isSaving ||
              deletingClientId !== null
            }
            onClick={openCreateForm}
            type="button"
          >
            <span>+</span> Nuovo cliente
          </button>
        </div>
      </div>

      {isFormOpen && (
        <ClientForm
          key={formClient?.id ?? 'new-client'}
          client={formClient}
          isSaving={isSaving}
          onCancel={closeForm}
          onSave={handleSave}
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

      {clientToDelete && (
        <DeleteClientDialog
          client={clientToDelete}
          isDeleting={deletingClientId === clientToDelete.id}
          onCancel={() => setClientToDelete(null)}
          onConfirm={handleDelete}
        />
      )}

      {isLoading ? (
        <p className="client-list-state" role="status">
          Caricamento clienti...
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
          <h3>Nessun cliente registrato</h3>
          <p>Crea il primo cliente per iniziare a organizzare la gestione.</p>
          <button
            className="secondary-button"
            onClick={openCreateForm}
            type="button"
          >
            Aggiungi il primo cliente
          </button>
        </div>
      ) : normalizedSearchQuery && filteredClients.length === 0 ? (
        <div className="client-list-state">
          <h3>Nessun cliente trovato</h3>
          <p>Prova a modificare la ricerca o a cancellarla per vedere tutti i clienti.</p>
          <button
            className="secondary-button"
            onClick={() => setSearchQuery('')}
            type="button"
          >
            Cancella ricerca
          </button>
        </div>
      ) : (
        <div className="client-list" aria-label="Clienti registrati" role="list">
          {filteredClients.map((client) => (
            <article className="client-row" key={client.id} role="listitem">
              <div className="client-summary">
                <h3>{client.name}</h3>
                <span className="client-id">ID {client.id}</span>
              </div>
              <dl className="client-details">
                <div>
                  <dt>Partita IVA</dt>
                  <dd>{client.vat_number || 'Non inserita'}</dd>
                </div>
                <div>
                  <dt>Contatti</dt>
                  <dd>
                    {client.email && <a href={`mailto:${client.email}`}>{client.email}</a>}
                    {client.email && client.phone && <span> · </span>}
                    {client.phone && <a href={`tel:${client.phone}`}>{client.phone}</a>}
                    {!client.email && !client.phone && 'Non inseriti'}
                  </dd>
                </div>
                <div>
                  <dt>Indirizzo</dt>
                  <dd>{client.address || 'Non inserito'}</dd>
                </div>
              </dl>
              <div className="client-actions">
                <button
                  className="secondary-button"
                  disabled={isFormOpen || isSaving || deletingClientId !== null}
                  onClick={() => openEditForm(client)}
                  type="button"
                >
                  Modifica
                </button>
                <button
                  className="danger-button"
                  disabled={isFormOpen || isSaving || deletingClientId !== null}
                  onClick={() => setClientToDelete(client)}
                  type="button"
                >
                  {deletingClientId === client.id ? 'Eliminazione...' : 'Elimina'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default ClientsPage
