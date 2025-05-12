export interface Specialist {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone?: string;
  availability: {
    weekdays: number[];
    weekends: number[];
  };
}

export interface SecondOpinionRequest {
  id: string;
  case_id: string;
  requesting_staff_id: string;
  specialist_id?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Consultation {
  id: string;
  request_id: string;
  scheduled_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ConsultationFeedback {
  id: string;
  consultation_id: string;
  specialist_id: string;
  feedback_type: 'diagnosis' | 'treatment' | 'both';
  feedback: string;
  recommendations: string[];
  created_at: string;
  updated_at: string;
}

export interface WebSocketPayload {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  commit_timestamp: string;
  new: any;
  old: any;
} 