export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type exam_priority = 'routine' | 'urgent' | 'critical' | 'stat';
export type exam_status =
  | 'pending_upload'
  | 'uploaded'
  | 'ai_processing'
  | 'ai_completed'
  | 'in_review'
  | 'reported'
  | 'signed'
  | 'delivered';
export type user_role = 'radiologist' | 'technician' | 'admin' | 'viewer';
export type finding_severity =
  | 'benign'
  | 'probably_benign'
  | 'indeterminate'
  | 'suspicious'
  | 'malignant';

export interface Profile {
  id: string;
  full_name: string;
  crm_number?: string;
  specialization?: string;
  role: user_role;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  mrn: string;
  full_name: string;
  birth_date?: string;
  gender?: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  patient_id: string;
  assigned_radiologist_id?: string;
  accession_number: string;
  exam_type: string;
  body_part: string;
  modality: string;
  study_date: string;
  status: exam_status;
  priority: exam_priority;
  clinical_indication?: string;
  requesting_physician?: string;
  institution?: string;
  ai_analysis_complete: boolean;
  ai_priority_score?: number;
  ai_findings_summary?: string;
  image_count: number;
  study_instance_uid?: string;
  urgency_reason?: string;
  assigned_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  radiologist?: Profile;
}

export interface Finding {
  id: string;
  exam_id: string;
  finding_type: string;
  location?: string;
  laterality?: string;
  size_mm?: number;
  severity?: finding_severity;
  description: string;
  ai_confidence_score?: number;
  is_ai_detected: boolean;
  validated_by_radiologist: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  exam_id: string;
  radiologist_id: string;
  findings_text: string;
  impression: string;
  recommendations?: string;
  classification_system?: string;
  classification_code?: string;
  is_preliminary: boolean;
  is_signed: boolean;
  signed_at?: string;
  ai_suggestions_used: boolean;
  ai_suggestions?: Json;
  addendum?: string;
  created_at: string;
  updated_at: string;
  radiologist?: Profile;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: Json;
  new_values?: Json;
  ip_address?: string;
  user_agent?: string;
  duration_ms?: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  exam_id?: string;
  is_read: boolean;
  created_at: string;
}
