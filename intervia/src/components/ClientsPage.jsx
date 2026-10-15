import { useEffect, useRef, useState } from 'react'
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

function ClientForm({ client, isSaving, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    name: client?.name ?? '',
    vat_number: client?.vat_number ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    address: client?.address ?? '',
  }))

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handlePhoneChange(event) {
    const value = event.target.value
      .replace(/[^0-9+().\-\s]/g, '')
      .replace(/(?!^)\+/g, '')

    event.target.setCustomValidity('')
    setForm((current) => ({ ...current, phone: value }))
  }

  function validatePhoneField(input) {
    const phone = input.value.trim()
    if (!phone) {
      input.setCustomValidity('')
      return
    }

    const digits = phone.replace(/\D/g, '').length
    const validFormat = /^\+?[0-9][0-9 ().-]*$/.test(phone)
    let depth = 0
    let digitsInsideParentheses = 0
    let balancedParentheses = true

    for (const character of phone) {
      if (character === '(') {
        if (depth) {
          balancedParentheses = false
          break
        }
        depth = 1
        digitsInsideParentheses = 0
      } else if (/\d/.test(character) && depth) {
        digitsInsideParentheses += 1
      } else if (character === ')') {
        if (!depth || digitsInsideParentheses === 0) {
          balancedParentheses = false
          break
        }
        depth = 0
      }
    }
    balancedParentheses =
      balancedParentheses && depth === 0 && /\d$/.test(phone)

    const isValid =
      validFormat &&
      balancedParentheses &&
      digits >= 7 &&
      digits <= 15
    input.setCustomValidity(
      isValid ? '' : 'inserisci un numero di telefono valido',
    )
  }

  function handleSubmit(event) {
    event.preventDefault()
    const phoneInput = event.currentTarget.elements.phone
    validatePhoneField(phoneInput)
    if (!event.currentTarget.reportValidity()) {
      return
    }

    onSave({
      ...form,
      name: form.name.trim(),
      vat_number: form.vat_number.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
    })
  }

  return (
    <form className="client-form" onSubmit={handleSubmit}>
      <div className="client-form-heading">
        <div>
          <h3>{client ? 'Modifica cliente' : 'Nuovo cliente'}</h3>
          <p>I campi contrassegnati con * sono obbligatori.</p>
        </div>
      </div>

      <div className="client-form-grid">
        <label className="client-field">
          <span>Nome azienda *</span>
          <input
            autoComplete="organization"
            maxLength={200}
            name="name"
            onChange={handleChange}
            required
            value={form.name}
          />
        </label>

        <label className="client-field">
          <span>Partita IVA *</span>
          <input
            autoComplete="off"
            inputMode="numeric"
            maxLength={11}
            name="vat_number"
            onChange={handleChange}
            pattern="[0-9]{11}"
            placeholder="11 cifre"
            required
            title="Inserisci una partita IVA italiana di 11 cifre."
            value={form.vat_number}
          />
        </label>

        <label className="client-field">
          <span>Email{form.phone.trim() ? '' : ' *'}</span>
          <input
            autoComplete="email"
            maxLength={254}
            name="email"
            onChange={handleChange}
            required={!form.phone.trim()}
            type="email"
            value={form.email}
          />
        </label>

        <label className="client-field">
          <span>Telefono{form.email.trim() ? '' : ' *'}</span>
          <input
            autoComplete="tel"
            maxLength={50}
            name="phone"
            onBlur={(event) => validatePhoneField(event.currentTarget)}
            onChange={handlePhoneChange}
            pattern="\+?[0-9][0-9 ().-]*[0-9]"
            placeholder="+39 02 1234 5678"
            required={!form.email.trim()}
            type="tel"
            value={form.phone}
            title="Inserisci 7-15 cifre; puoi usare + iniziale, spazi, parentesi, trattini e punti."
          />
          <span className="client-field-hint">
            7–15 cifre; formato internazionale o nazionale, ad esempio +39 02
            1234 5678.
          </span>
        </label>

        <label className="client-field client-field-full">
          <span>Indirizzo *</span>
          <input
            autoComplete="street-address"
            maxLength={300}
            name="address"
            onChange={handleChange}
            required
            value={form.address}
          />
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
          {isSaving ? 'Salvataggio...' : client ? 'Salva modifiche' : 'Crea cliente'}
        </button>
      </div>
    </form>
  )
}

function DeleteClientDialog({ client, isDeleting, onCancel, onConfirm }) {
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
      aria-describedby="delete-client-description"
      aria-labelledby="delete-client-title"
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
        <p className="delete-dialog-eyebrow">ELIMINAZIONE CLIENTE</p>
        <h2 id="delete-client-title">Vuoi eliminare questo cliente?</h2>
        <p id="delete-client-description" className="delete-dialog-description">
          <strong>{client.name}</strong> verrà rimosso dall’elenco. Questa
          operazione non può essere annullata.
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
            {isDeleting ? 'Eliminazione...' : 'Elimina cliente'}
          </button>
        </div>
      </div>
    </dialog>
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
