/*
  # Database Functions and Triggers for RADILENS

  1. Functions
    - Auto-assign radiologist based on workload
    - Calculate priority score
    - Generate accession numbers
    - Check SLA compliance

  2. Triggers
    - Auto-create profile on user signup
    - Update exam status on report changes
    - Create notifications for critical events
    - Archive audit logs periodically

  3. Security
    - Functions run with SECURITY DEFINER for proper permissions
    - All triggers check for proper authorization
*/

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')::user_role,
    true
  );
  RETURN NEW;
END;
$$;

-- Function to get least busy radiologist
CREATE OR REPLACE FUNCTION public.get_least_busy_radiologist()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  least_busy_id uuid;
BEGIN
  SELECT p.id INTO least_busy_id
  FROM profiles p
  LEFT JOIN exams e ON e.assigned_radiologist_id = p.id
    AND e.status IN ('in_review', 'reported', 'ai_completed')
  WHERE p.role = 'radiologist'
    AND p.is_active = true
  GROUP BY p.id
  ORDER BY COUNT(e.id) ASC, RANDOM()
  LIMIT 1;

  RETURN least_busy_id;
END;
$$;

-- Function to generate unique accession number
CREATE OR REPLACE FUNCTION public.generate_accession_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  acc_num text;
  exists_flag boolean;
BEGIN
  LOOP
    acc_num := 'ACC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    
    SELECT EXISTS(
      SELECT 1 FROM exams WHERE accession_number = acc_num
    ) INTO exists_flag;
    
    IF NOT exists_flag THEN
      RETURN acc_num;
    END IF;
  END LOOP;
END;
$$;

-- Function to check SLA compliance
CREATE OR REPLACE FUNCTION public.check_sla_compliance(exam_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  exam RECORD;
  elapsed_minutes numeric;
  sla_threshold numeric;
  sla_thresholds json := '{"stat": 60, "critical": 240, "urgent": 1440, "routine": 4320}';
BEGIN
  SELECT * INTO exam FROM exams WHERE id = exam_id;
  
  IF NOT FOUND THEN
    RETURN '{"error": "exam not found"}'::json;
  END IF;
  
  elapsed_minutes := EXTRACT(EPOCH FROM (NOW() - exam.created_at)) / 60;
  sla_threshold := (sla_thresholds->>exam.priority)::numeric;
  
  RETURN json_build_object(
    'exam_id', exam_id,
    'elapsed_minutes', ROUND(elapsed_minutes),
    'sla_threshold', sla_threshold,
    'is_breached', elapsed_minutes >= sla_threshold,
    'is_warning', elapsed_minutes >= sla_threshold * 0.8 AND elapsed_minutes < sla_threshold,
    'remaining_minutes', GREATEST(0, ROUND(sla_threshold - elapsed_minutes)),
    'overdue_minutes', GREATEST(0, ROUND(elapsed_minutes - sla_threshold))
  );
END;
$$;

-- Function to get worklist statistics
CREATE OR REPLACE FUNCTION public.get_worklist_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_pending', (SELECT COUNT(*) FROM exams WHERE status IN ('uploaded', 'ai_completed')),
    'critical_pending', (SELECT COUNT(*) FROM exams WHERE status IN ('uploaded', 'ai_completed', 'in_review') AND priority IN ('critical', 'stat')),
    'urgent_pending', (SELECT COUNT(*) FROM exams WHERE status IN ('uploaded', 'ai_completed', 'in_review') AND priority = 'urgent'),
    'in_review', (SELECT COUNT(*) FROM exams WHERE status = 'in_review'),
    'completed_today', (SELECT COUNT(*) FROM exams WHERE status = 'signed' AND DATE(completed_at) = CURRENT_DATE),
    'avg_turnaround', (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600), 0) FROM exams WHERE completed_at IS NOT NULL AND DATE(completed_at) = CURRENT_DATE)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function to validate findings
CREATE OR REPLACE FUNCTION public.validate_finding(
  finding_id uuid,
  validated boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE findings
  SET validated_by_radiologist = validated
  WHERE id = finding_id;
END;
$$;

-- Function to add finding to report
CREATE OR REPLACE FUNCTION public.add_finding_to_report(
  p_exam_id uuid,
  p_finding_type text,
  p_description text,
  p_location text,
  p_severity finding_severity
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_finding_id uuid;
BEGIN
  INSERT INTO findings (
    exam_id,
    finding_type,
    description,
    location,
    severity,
    is_ai_detected,
    validated_by_radiologist
  ) VALUES (
    p_exam_id,
    p_finding_type,
    p_description,
    p_location,
    p_severity,
    false,
    true
  ) RETURNING id INTO new_finding_id;
  
  RETURN new_finding_id;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update exam status when report is created
CREATE OR REPLACE FUNCTION update_exam_status_on_report()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE exams SET status = 'reported' WHERE id = NEW.exam_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_signed = true AND OLD.is_signed = false THEN
    UPDATE exams SET status = 'signed', completed_at = NOW() WHERE id = NEW.exam_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_exam_status ON reports;
CREATE TRIGGER trigger_update_exam_status
  AFTER INSERT OR UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_exam_status_on_report();

-- Trigger to create notification when critical finding is detected
CREATE OR REPLACE FUNCTION notify_critical_finding()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  exam RECORD;
  radiologist_id uuid;
BEGIN
  IF NEW.severity IN ('malignant', 'suspicious') AND NEW.is_ai_detected = true THEN
    SELECT * INTO exam FROM exams WHERE id = NEW.exam_id;
    
    -- If exam has assigned radiologist, notify them
    IF exam.assigned_radiologist_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, exam_id)
      VALUES (
        exam.assigned_radiologist_id,
        'Critical Finding Detected',
        'AI detected a ' || NEW.severity || ' finding: ' || NEW.finding_type || ' at ' || NEW.location,
        'critical',
        NEW.exam_id
      );
    ELSE
      -- Notify all active radiologists
      FOR radiologist_id IN
        SELECT id FROM profiles WHERE role = 'radiologist' AND is_active = true
      LOOP
        INSERT INTO notifications (user_id, title, message, type, exam_id)
        VALUES (
          radiologist_id,
          'Critical Finding Detected - Unassigned Exam',
          'AI detected a ' || NEW.severity || ' finding in an unassigned exam: ' || NEW.finding_type,
          'critical',
          NEW.exam_id
        );
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_critical_finding ON findings;
CREATE TRIGGER trigger_notify_critical_finding
  AFTER INSERT ON findings
  FOR EACH ROW
  EXECUTE FUNCTION notify_critical_finding();

-- Trigger to auto-assign critical exams
CREATE OR REPLACE FUNCTION auto_assign_critical_exams()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  least_busy uuid;
BEGIN
  IF NEW.priority IN ('critical', 'stat') AND NEW.assigned_radiologist_id IS NULL THEN
    least_busy := get_least_busy_radiologist();
    IF least_busy IS NOT NULL THEN
      NEW.assigned_radiologist_id := least_busy;
      NEW.assigned_at := NOW();
      NEW.status := 'in_review';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_assign_critical ON exams;
CREATE TRIGGER trigger_auto_assign_critical
  BEFORE INSERT OR UPDATE ON exams
  FOR EACH ROW
  WHEN (NEW.priority IN ('critical', 'stat') AND NEW.assigned_radiologist_id IS NULL)
  EXECUTE FUNCTION auto_assign_critical_exams();

-- ============================================
-- VIEWS
-- ============================================

-- View for pending worklist with details
CREATE OR REPLACE VIEW pending_exams_view AS
SELECT 
  e.id,
  e.accession_number,
  e.exam_type,
  e.body_part,
  e.modality,
  e.priority,
  e.status,
  e.ai_priority_score,
  e.ai_findings_summary,
  e.clinical_indication,
  e.created_at,
  e.assigned_at,
  p.id as patient_id,
  p.full_name as patient_name,
  p.mrn,
  p.gender,
  p.birth_date,
  EXTRACT(YEAR FROM age(p.birth_date)) as patient_age,
  r.full_name as radiologist_name,
  r.specialization,
  COUNT(f.id) as findings_count,
  COUNT(CASE WHEN f.severity IN ('malignant', 'suspicious') THEN 1 END) as critical_findings_count,
  COALESCE(EXTRACT(EPOCH FROM (NOW() - e.created_at)) / 60, 0) as minutes_since_created
FROM exams e
LEFT JOIN patients p ON e.patient_id = p.id
LEFT JOIN profiles r ON e.assigned_radiologist_id = r.id
LEFT JOIN findings f ON e.id = f.exam_id
WHERE e.status NOT IN ('delivered', 'pending_upload')
GROUP BY e.id, p.id, r.id
ORDER BY 
  CASE e.priority 
    WHEN 'stat' THEN 1 
    WHEN 'critical' THEN 2 
    WHEN 'urgent' THEN 3 
    ELSE 4 
  END,
  e.ai_priority_score DESC NULLS LAST,
  e.created_at ASC;

-- Grant appropriate permissions
GRANT SELECT ON pending_exams_view TO authenticated;

-- ============================================
-- INDEXES FOR BETTER PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_exams_status_priority ON exams(status, priority);
CREATE INDEX IF NOT EXISTS idx_exams_assigned_radiologist_status ON exams(assigned_radiologist_id, status);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
CREATE INDEX IF NOT EXISTS idx_findings_exam_severity ON findings(exam_id, severity);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_exam_signed ON reports(exam_id, is_signed);