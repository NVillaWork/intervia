import { request } from './request.js'

export function listInterventions(options) {
  return request('/api/interventions', options)
}

export function createIntervention(intervention) {
  return request('/api/interventions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(intervention),
  })
}

export function updateIntervention(id, intervention) {
  return request(`/api/interventions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(intervention),
  })
}

export function completeIntervention(id) {
  return request(`/api/interventions/${id}/complete`, { method: 'POST' })
}

export function deleteIntervention(id) {
  return request(`/api/interventions/${id}`, { method: 'DELETE' })
}
