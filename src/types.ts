export const statuses = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED'] as const
export type CandidateStatus = (typeof statuses)[number]

export interface Candidate {
  id: number
  fullName: string
  currentRole: string
  email: string
  phone: string | null
  skills: string | null
  experienceYears: number
  location: string | null
  status: CandidateStatus
  createdAt: string
  updatedAt: string
}

export interface CandidatePayload {
  fullName: string
  currentRole: string
  email: string
  phone: string | null
  skills: string
  experienceYears: number
  location: string
  status: CandidateStatus | null
}

export interface CandidatePage {
  content: Candidate[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface ApiError {
  timestamp?: string
  status?: number
  message?: string
  fieldErrors?: Record<string, string>
}
