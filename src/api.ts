import type { ApiError, Candidate, CandidatePage, CandidatePayload, CandidateStatus } from './types'

const API_ROOT = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1').replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      ...init,
      headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    })
  } catch {
    throw new Error('Could not reach the candidate API. Make sure the Spring Boot server is running.')
  }

  if (!response.ok) {
    let error: ApiError = {}
    try { error = await response.json() as ApiError } catch { /* response may not contain JSON */ }
    const fieldMessages = Object.values(error.fieldErrors ?? {})
    throw new Error(fieldMessages.length ? fieldMessages.join(' · ') : error.message ?? `Request failed (${response.status})`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export interface CandidateFilters {
  q: string
  skills: string[]
  statuses: CandidateStatus[]
  minExperience: string
  maxExperience: string
}

export async function getCandidates(filters: CandidateFilters, page: number, size: number): Promise<CandidatePage> {
  const loadStatus = async (status?: CandidateStatus): Promise<CandidatePage> => {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,desc' })
    if (filters.q.trim()) params.set('q', filters.q.trim())
    filters.skills.forEach((skill) => params.append('skill', skill))
    if (status) params.set('status', status)
    if (filters.minExperience) params.set('minExperience', filters.minExperience)
    if (filters.maxExperience) params.set('maxExperience', filters.maxExperience)
    return request<CandidatePage>(`/candidates?${params}`)
  }

  if (filters.statuses.length <= 1) return loadStatus(filters.statuses[0])
  const pages = await Promise.all(filters.statuses.map((status) => loadStatus(status)))
  const allCandidates = pages.flatMap((result) => result.content)
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime() || first.id - second.id)
  const start = page * size
  return {
    content: allCandidates.slice(start, start + size), page, size,
    totalElements: pages.reduce((sum, result) => sum + result.totalElements, 0),
    totalPages: Math.ceil(pages.reduce((sum, result) => sum + result.totalElements, 0) / size),
    first: page === 0, last: start + size >= pages.reduce((sum, result) => sum + result.totalElements, 0),
  }
}

export const getCandidate = (id: number) => request<Candidate>(`/candidates/${id}`)
export const createCandidate = (payload: CandidatePayload) => request<Candidate>('/candidates', { method: 'POST', body: JSON.stringify(payload) })
export const updateCandidate = (id: number, payload: CandidatePayload) => request<Candidate>(`/candidates/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
export const deleteCandidate = (id: number) => request<void>(`/candidates/${id}`, { method: 'DELETE' })
