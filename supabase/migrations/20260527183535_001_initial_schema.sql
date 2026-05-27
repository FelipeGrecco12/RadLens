/*
  # RADILENS Initial Database Schema

  1. New Tables
    - `profiles` - User profile data linked to auth.users
    - `patients` - Patient information
    - `exams` - Imaging studies/exams
    - `findings` - Radiological findings detected
    - `reports` - Medical reports (laudos)
    - `audit_logs` - Complete audit trail
    - `notifications` - System notifications for users

  2. Security
    - RLS enabled on all tables
    - Policies ensure users can only access authorized data
    - Audit trail is immutable for compliance

  3. Important Notes
    - Uses auth.uid() for user identification
    - Status enums for exam workflow
    - Priority levels for triage
    - JSONB for flexible finding data
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Priority enum
CREATE TYPE exam_priority AS ENUM ('routine', 'urgent', 'critical', 'stat');

-- Exam status enum
CREATE TYPE exam_status AS ENUM (
  'pending_upload',
  'uploaded',
  'ai_processing',
  'ai_completed',
  'in_review',
  'reported',
  'signed',
  'delivered'
);

-- User roles
CREATE TYPE user_role AS ENUM ('radiologist', 'technician', 'admin', 'viewer');

-- Findings severity
CREATE TYPE finding_severity AS ENUM ('benign', 'probably_benign', 'indeterminate', 'suspicious', 'malignant');

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  crm_number text UNIQUE,
  specialization text,
  role user_role NOT NULL DEFAULT 'viewer',
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn text UNIQUE NOT NULL,
  full_name text NOT NULL,
  birth_date date,
  gender text,
  phone text,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Exams table
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  assigned_radiologist_id uuid REFERENCES profiles(id),
  accession_number text UNIQUE NOT NULL,
  exam_type text NOT NULL,
  body_part text NOT NULL,
  modality text NOT NULL,
  study_date timestamptz DEFAULT now(),
  status exam_status NOT NULL DEFAULT 'pending_upload',
  priority exam_priority NOT NULL DEFAULT 'routine',
  clinical_indication text,
  requesting_physician text,
  institution text,
  ai_analysis_complete boolean DEFAULT false,
  ai_priority_score decimal(3,2),
  ai_findings_summary text,
  image_count integer DEFAULT 0,
  study_instance_uid text,
  urgency_reason text,
  assigned_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Findings table
CREATE TABLE IF NOT EXISTS findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  finding_type text NOT NULL,
  location text,
  laterality text,
  size_mm decimal(5,2),
  severity finding_severity,
  description text NOT NULL,
  ai_confidence_score decimal(3,2),
  is_ai_detected boolean DEFAULT true,
  validated_by_radiologist boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  radiologist_id uuid NOT NULL REFERENCES profiles(id),
  findings_text text NOT NULL,
  impression text NOT NULL,
  recommendations text,
  classification_system text,
  classification_code text,
  is_preliminary boolean DEFAULT true,
  is_signed boolean DEFAULT false,
  signed_at timestamptz,
  ai_suggestions_used boolean DEFAULT false,
  ai_suggestions jsonb,
  addendum text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  exam_id uuid REFERENCES exams(id),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND role = 'admin'
    )
  );

-- Patients policies
CREATE POLICY "Radiologists can view assigned patients"
  ON patients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.patient_id = patients.id
      AND (
        exams.assigned_radiologist_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND role IN ('admin', 'viewer')
        )
      )
    )
  );

-- Exams policies
CREATE POLICY "Users can view authorized exams"
  ON exams FOR SELECT
  TO authenticated
  USING (
    assigned_radiologist_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND role IN ('admin', 'viewer')
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND role IN ('technician')
    )
  );

CREATE POLICY "Radiologists can update assigned exams"
  ON exams FOR UPDATE
  TO authenticated
  USING (
    assigned_radiologist_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND role = 'admin'
    )
  );

-- Findings policies
CREATE POLICY "Users can view findings from authorized exams"
  ON findings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = findings.exam_id
      AND (
        exams.assigned_radiologist_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND role IN ('admin', 'viewer')
        )
      )
    )
  );

-- Reports policies
CREATE POLICY "Users can view reports from authorized exams"
  ON reports FOR SELECT
  TO authenticated
  USING (
    radiologist_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = reports.exam_id
      AND exams.assigned_radiologist_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND role IN ('admin', 'viewer')
      )
    )
  );

CREATE POLICY "Radiologists can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (
    radiologist_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND role IN ('radiologist', 'admin')
    )
  );

CREATE POLICY "Radiologists can update own reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (radiologist_id = auth.uid())
  WITH CHECK (radiologist_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_priority ON exams(priority);
CREATE INDEX IF NOT EXISTS idx_exams_assigned_radiologist ON exams(assigned_radiologist_id);
CREATE INDEX IF NOT EXISTS idx_exams_patient ON exams(patient_id);
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON exams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_findings_exam ON findings(exam_id);
CREATE INDEX IF NOT EXISTS idx_reports_exam ON reports(exam_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exams_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();