import { useRef, useState } from 'react'

export default function PlantForm({ clients, isSaving, onCancel, onSave, plant }) {
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
