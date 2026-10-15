import { request } from './request.js'

export function listPlants(options) {
  return request('/api/plants', options)
}

export function createPlant(plant) {
  return request('/api/plants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plant),
  })
}

export function updatePlant(id, plant) {
  return request(`/api/plants/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plant),
  })
}

export function deletePlant(id) {
  return request(`/api/plants/${id}`, { method: 'DELETE' })
}
