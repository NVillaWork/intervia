import { useState } from 'react'

export default function ClientForm({ client, isSaving, onCancel, onSave }) {
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
