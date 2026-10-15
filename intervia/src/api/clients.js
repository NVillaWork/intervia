import { request } from './request.js'

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
