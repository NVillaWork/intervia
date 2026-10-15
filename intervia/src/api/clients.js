async function request(path, options = {}) {
  let response
  try {
    response = await fetch(path, options)
  } catch (error) {
    throw new Error(
      'Impossibile contattare il server. Verifica che il backend sia avviato.',
      { cause: error },
    )
  }

  if (response.status === 204) {
    return null
  }

  const responseBody = await response.text()
  let result

  if (responseBody.trim()) {
    try {
      result = JSON.parse(responseBody)
    } catch (error) {
      if (response.ok) {
        throw new Error(
          `Il backend ha restituito una risposta non valida (HTTP ${response.status}).`,
          { cause: error },
        )
      }
    }
  }

  if (!response.ok) {
    if (!result && response.status >= 500) {
      throw new Error(
        `Il backend non è disponibile o ha restituito un errore (HTTP ${response.status}). Avvia FastAPI e riprova.`,
      )
    }

    const detail = result?.detail
    const message = Array.isArray(detail)
      ? detail.map((issue) => issue.msg).join(' ')
      : detail

    throw new Error(
      message || `La richiesta non è riuscita (HTTP ${response.status}).`,
    )
  }

  if (result === undefined) {
    throw new Error(
      `Il backend ha restituito una risposta vuota (HTTP ${response.status}).`,
    )
  }

  return result
}

export function listClients(options) {
  return request('/api/clients', options)
}

export function createClient(client) {
  return request('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(client),
  })
}

export function updateClient(id, client) {
  return request(`/api/clients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(client),
  })
}

export function deleteClient(id) {
  return request(`/api/clients/${id}`, { method: 'DELETE' })
}
