export interface Patient {
  id: string
  name: string
  date_of_birth: string
  gender: string
  phone: string
  email: string
  address: string
  emergency_contact: string
  medical_history: string
  insurance_provider: string
  insurance_number: string
  allergies: string
  medications: string
  conditions: string
  created_at?: string
  updated_at?: string
} 