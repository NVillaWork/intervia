import { useState } from 'react'

const recurrenceOptions = [
  ['once', 'Una sola volta'],
  ['monthly', 'Mensile'],
  ['quarterly', 'Trimestrale'],
  ['semiannual', 'Semestrale'],
  ['annual', 'Annuale'],
  ['custom_days', 'Ogni N giorni'],
]

export default function InterventionForm({
  intervention,
  isSaving,
  onCancel,
  onSave,
  plants,
}) {
  const [form, setForm] = useState(() => ({
    plant_id: intervention ? String(intervention.plant_id) : '',
    title: intervention?.title ?? '',
    notes: intervention?.notes ?? '',
    due_date: intervention?.due_date ?? '',
    recurrence: intervention?.recurrence ?? 'once',
    recurrence_days: intervention?.recurrence_days
      ? String(intervention.recurrence_days)
      : '',
  }))

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSave({
      plant_id: Number(form.plant_id),
      title: form.title.trim(),
      notes: form.notes.trim() || null,
      due_date: form.due_date,
      recurrence: form.recurrence,
      recurrence_days:
        form.recurrence === 'custom_days' ? Number(form.recurrence_days) : null,
    })
  }

  return (
    <form className="client-form intervention-form" onSubmit={handleSubmit}>
      <div className="client-form-heading">
        <div>
          <h3>{intervention ? 'Modifica intervento' : 'Nuovo intervento'}</h3>
          <p>Indica l’impianto, la scadenza e se l’attività si ripete.</p>
        </div>
      </div>

      <div className="client-form-grid">
        <label className="client-field">
          <span>Impianto *</span>
          <select
            name="plant_id"
            onChange={handleChange}
            required
            value={form.plant_id}
          >
            <option value="">Seleziona un impianto</option>
            {plants.map((plant) => (
              <option key={plant.id} value={plant.id}>
                {plant.code} · {plant.name} — {plant.client_name}
              </option>
            ))}
          </select>
        </label>

        <label className="client-field">
          <span>Data prevista *</span>
          <input
            name="due_date"
            onChange={handleChange}
            required
            type="date"
            value={form.due_date}
          />
        </label>

        <label className="client-field client-field-full">
          <span>Intervento *</span>
          <input
            autoComplete="off"
            maxLength={200}
            name="title"
            onChange={handleChange}
            placeholder="Es. Manutenzione ordinaria caldaia"
            required
            value={form.title}
          />
        </label>

        <label className="client-field">
          <span>Ripetizione</span>
          <select
            name="recurrence"
            onChange={handleChange}
            value={form.recurrence}
          >
            {recurrenceOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {form.recurrence === 'custom_days' && (
          <label className="client-field">
            <span>Intervallo in giorni *</span>
            <input
              min="1"
              max="36500"
              name="recurrence_days"
              onChange={handleChange}
              required
              type="number"
              value={form.recurrence_days}
            />
          </label>
        )}

        <label className="client-field client-field-full">
          <span>Note</span>
          <textarea
            maxLength={2000}
            name="notes"
            onChange={handleChange}
            rows="3"
            value={form.notes}
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
          {isSaving
            ? 'Salvataggio...'
            : intervention
              ? 'Salva modifiche'
              : 'Crea intervento'}
        </button>
      </div>
    </form>
  )
}
