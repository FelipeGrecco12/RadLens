/*
  # RADILENS Seed Data for Demonstration

  This migration populates the database with realistic sample data for:
  - Patients with demographics
  - Exams in various states
  - AI-detected findings
  - Audit log entries

  Note: This data is for demonstration purposes only.
*/

-- ============================================
-- PATIENTS (10 sample patients)
-- ============================================

INSERT INTO patients (mrn, full_name, birth_date, gender, phone, email) VALUES
('MRN-2024-001', 'Maria Santos Silva', '1965-03-15', 'Female', '+55 11 98765-4321', 'maria.santos@email.com'),
('MRN-2024-002', 'Joao Carlos de Oliveira', '1978-08-22', 'Male', '+55 11 91234-5678', 'joao.oliveira@email.com'),
('MRN-2024-003', 'Ana Paula Ferreira', '1990-11-05', 'Female', '+55 11 92345-6789', 'ana.ferreira@email.com'),
('MRN-2024-004', 'Carlos Eduardo Santos', '1955-06-18', 'Male', '+55 11 93456-7890', 'carlos.santos@email.com'),
('MRN-2024-005', 'Fernanda Lima Costa', '1982-04-30', 'Female', '+55 11 94567-8901', 'fernanda.costa@email.com'),
('MRN-2024-006', 'Roberto Alves Filho', '1972-12-10', 'Male', '+55 11 95678-9012', 'roberto.alves@email.com'),
('MRN-2024-007', 'Luciana Mendes', '1988-07-25', 'Female', '+55 11 96789-0123', 'luciana.mendes@email.com'),
('MRN-2024-008', 'Pedro Henrique Souza', '1995-02-14', 'Male', '+55 11 97890-1234', 'pedro.souza@email.com'),
('MRN-2024-009', 'Mariana Ribeiro', '1970-09-03', 'Female', '+55 11 98901-2345', 'mariana.ribeiro@email.com'),
('MRN-2024-010', 'Thiago Martins', '1985-01-28', 'Male', '+55 11 99012-3456', 'thiago.martins@email.com');

-- ============================================
-- EXAMS (Various states and priorities)
-- ============================================

-- Critical/STAT exams pending review
INSERT INTO exams (patient_id, accession_number, exam_type, body_part, modality, status, priority, clinical_indication, image_count, ai_analysis_complete, ai_priority_score, ai_findings_summary, requesting_physician, institution) VALUES
((SELECT id FROM patients WHERE mrn = 'MRN-2024-001'), 'ACC-20240527-0001', 'CT Scan', 'Chest', 'CT', 'ai_completed', 'critical', 'Suspected pulmonary embolism with sudden onset dyspnea', 245, true, 0.95, 'Possible PE in right lower lobe. Also noted 8mm nodule in right upper lobe.', 'Dr. Francisco Lima', 'Hospital Central'),
((SELECT id FROM patients WHERE mrn = 'MRN-2024-002'), 'ACC-20240527-0002', 'MRI', 'Brain', 'MRI', 'ai_completed', 'stat', 'Acute stroke symptoms, left-sided weakness', 320, true, 0.98, 'Large acute infarct in right MCA territory. No hemorrhage', 'Dr. Carmen Rodriguez', 'Hospital das Clinicas'),
((SELECT id FROM patients WHERE mrn = 'MRN-2024-004'), 'ACC-20240527-0003', 'CT Scan', 'Abdomen', 'CT', 'in_review', 'urgent', 'Right lower quadrant pain, suspected appendicitis', 180, true, 0.82, 'Dilated appendix with inflammatory changes', 'Dr. Ricardo Nunes', 'Emergency Dept');

-- Urgent exams
INSERT INTO exams (patient_id, accession_number, exam_type, body_part, modality, status, priority, clinical_indication, image_count, ai_analysis_complete, ai_priority_score, ai_findings_summary, requesting_physician, institution) VALUES
((SELECT id FROM patients WHERE mrn = 'MRN-2024-003'), 'ACC-20240527-0004', 'CT Scan', 'Chest', 'CT', 'ai_completed', 'urgent', 'Persistent cough, weight loss, evaluate for malignancy', 250, true, 0.78, 'Multiple bilateral pulmonary nodules. Mediastinal lymphadenopathy.', 'Dr. Helena Martins', 'Oncology Center'),
((SELECT id FROM patients WHERE mrn = 'MRN-2024-005'), 'ACC-20240527-0005', 'Mammography', 'Breast', 'MG', 'uploaded', 'urgent', 'Palpable mass right breast', 8, false, null, null, 'Dr. Lucia Ferreira', 'Breast Center'),
((SELECT id FROM patients WHERE mrn = 'MRN-2024-006'), 'ACC-20240527-0006', 'MRI', 'Prostate', 'MRI', 'ai_processing', 'urgent', 'Elevated PSA 8.5 ng/mL', 200, false, null, null, 'Dr. Antonio Carlos', 'Urology Clinic');

-- Routine exams
INSERT INTO exams (patient_id, accession_number, exam_type, body_part, modality, status, priority, clinical_indication, image_count, ai_analysis_complete, ai_priority_score, ai_findings_summary, requesting_physician, institution) VALUES
((SELECT id FROM patients WHERE mrn = 'MRN-2024-007'), 'ACC-20240527-0007', 'X-Ray', 'Chest', 'XR', 'uploaded', 'routine', 'Routine pre-operative clearance', 2, false, null, null, 'Dr. Marcela Costa', 'Surgical Center'),
((SELECT id FROM patients WHERE mrn = 'MRN-2024-008'), 'ACC-20240527-0008', 'Ultrasound', 'Abdomen', 'US', 'uploaded', 'routine', 'Right upper quadrant pain', 15, false, null, null, 'Dr. Felipe Santos', 'Radiology'),
((SELECT id FROM patients WHERE mrn = 'MRN-2024-009'), 'ACC-20240527-0009', 'CT Scan', 'Lumbar Spine', 'CT', 'uploaded', 'routine', 'Chronic low back pain', 120, false, null, null, 'Dr. Patricia Lima', 'Orthopedics'),
((SELECT id FROM patients WHERE mrn = 'MRN-2024-010'), 'ACC-20240527-0010', 'X-Ray', 'Cervical Spine', 'XR', 'uploaded', 'routine', 'Neck pain after accident', 4, false, null, null, 'Dr. Roberto Almeida', 'Emergency');

-- Signed/Completed exams
INSERT INTO exams (patient_id, accession_number, exam_type, body_part, modality, status, priority, clinical_indication, image_count, ai_analysis_complete, ai_priority_score, ai_findings_summary, requesting_physician, institution, completed_at) VALUES
((SELECT id FROM patients WHERE mrn = 'MRN-2024-001'), 'ACC-20240526-0001', 'CT Scan', 'Head', 'CT', 'signed', 'routine', 'Headache evaluation', 150, true, 0.45, 'No acute intracranial abnormality', 'Dr. Francisco Lima', 'Neurology', NOW() - INTERVAL '2 days'),
((SELECT id FROM patients WHERE mrn = 'MRN-2024-002'), 'ACC-20240525-0002', 'MRI', 'Knee', 'MRI', 'delivered', 'routine', 'Knee pain, rule out meniscal tear', 180, true, 0.52, 'Complex tear of medial meniscus', 'Dr. Carmen Rodriguez', 'Sports Medicine', NOW() - INTERVAL '3 days'),
((SELECT id FROM patients WHERE mrn = 'MRN-2024-003'), 'ACC-20240524-0003', 'X-Ray', 'Chest', 'XR', 'signed', 'urgent', 'Dyspnea, rule out pneumonia', 2, true, 0.68, 'No acute cardiopulmonary abnormality', 'Dr. Helena Martins', 'Pulmonology', NOW() - INTERVAL '4 days');

-- ============================================
-- FINDINGS (AI-detected findings)
-- ============================================

-- Findings for critical exam ACC-20240527-0001
INSERT INTO findings (exam_id, finding_type, location, laterality, size_mm, severity, description, ai_confidence_score, is_ai_detected, validated_by_radiologist) VALUES
((SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0001'), 'Pulmonary Embolism', 'Right Lower Lobe Pulmonary Artery', 'Right', null, 'malignant', 'Segmental filling defect consistent with PE', 0.95, true, false),
((SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0001'), 'Pulmonary Nodule', 'Right Upper Lobe', 'Right', 8, 'suspicious', 'Spiculated nodule with irregular margins', 0.88, true, false),
((SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0001'), 'Calcified Granuloma', 'Right Hilar Region', 'Right', 5, 'benign', 'Calcified granuloma, prior infection sequela', 0.92, true, false);

-- Findings for stat exam ACC-20240527-0002
INSERT INTO findings (exam_id, finding_type, location, laterality, size_mm, severity, description, ai_confidence_score, is_ai_detected, validated_by_radiologist) VALUES
((SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0002'), 'Acute Infarct', 'Right MCA Territory', 'Right', null, 'malignant', 'Large acute infarction right MCA territory', 0.98, true, false),
((SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0002'), 'Mass Effect', 'Right Cerebral Hemisphere', 'Right', null, 'suspicious', 'Mild mass effect with ventricle compression', 0.85, true, false);

-- Findings for urgent exam ACC-20240527-0003
INSERT INTO findings (exam_id, finding_type, location, laterality, size_mm, severity, description, ai_confidence_score, is_ai_detected, validated_by_radiologist) VALUES
((SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0003'), 'Appendicitis', 'Right Lower Quadrant', null, 12, 'suspicious', 'Dilated appendix with inflammatory changes', 0.89, true, false),
((SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0003'), 'Appendicolith', 'Appendix', null, 5, 'benign', 'Calcified appendicolith', 0.78, true, false);

-- Findings for urgent exam ACC-20240527-0004
INSERT INTO findings (exam_id, finding_type, location, laterality, size_mm, severity, description, ai_confidence_score, is_ai_detected, validated_by_radiologist) VALUES
((SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0004'), 'Pulmonary Nodule', 'Left Lower Lobe', 'Left', 15, 'suspicious', 'Large spiculated nodule with irregular margins', 0.91, true, false),
((SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0004'), 'Pulmonary Nodule', 'Right Upper Lobe', 'Right', 8, 'indeterminate', 'Smaller nodule, indeterminate significance', 0.75, true, false),
((SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0004'), 'Lymphadenopathy', 'Mediastinum', null, null, 'suspicious', 'Enlarged mediastinal lymph nodes', 0.82, true, false);

-- ============================================
-- AUDIT LOGS (Sample activity)
-- ============================================

INSERT INTO audit_logs (action, resource_type, resource_id, created_at) VALUES
('AI_ANALYSIS_COMPLETE', 'exam', (SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0001'), NOW() - INTERVAL '30 minutes'),
('AI_ANALYSIS_COMPLETE', 'exam', (SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0002'), NOW() - INTERVAL '45 minutes'),
('AI_ANALYSIS_COMPLETE', 'exam', (SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0003'), NOW() - INTERVAL '1 hour'),
('ASSIGN_EXAM', 'exam', (SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0003'), NOW() - INTERVAL '30 minutes'),
('UPLOAD_IMAGES', 'exam', (SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0004'), NOW() - INTERVAL '2 hours'),
('CREATE_EXAM', 'exam', (SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0001'), NOW() - INTERVAL '3 hours'),
('CREATE_EXAM', 'exam', (SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0002'), NOW() - INTERVAL '4 hours'),
('CREATE_EXAM', 'exam', (SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0003'), NOW() - INTERVAL '5 hours'),
('VIEW_EXAM', 'exam', (SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0001'), NOW() - INTERVAL '15 minutes'),
('VIEW_EXAM', 'exam', (SELECT id FROM exams WHERE accession_number = 'ACC-20240527-0002'), NOW() - INTERVAL '20 minutes');

-- ============================================
-- Update exam timestamps
-- ============================================

UPDATE exams SET created_at = NOW() - INTERVAL '3 hours' WHERE accession_number = 'ACC-20240527-0001';
UPDATE exams SET created_at = NOW() - INTERVAL '4 hours' WHERE accession_number = 'ACC-20240527-0002';
UPDATE exams SET created_at = NOW() - INTERVAL '5 hours' WHERE accession_number = 'ACC-20240527-0003';
UPDATE exams SET created_at = NOW() - INTERVAL '2 hours' WHERE accession_number = 'ACC-20240527-0004';
UPDATE exams SET created_at = NOW() - INTERVAL '1 hour' WHERE accession_number = 'ACC-20240527-0005';
UPDATE exams SET created_at = NOW() - INTERVAL '45 minutes' WHERE accession_number = 'ACC-20240527-0006';
UPDATE exams SET created_at = NOW() - INTERVAL '30 minutes' WHERE accession_number = 'ACC-20240527-0007';
UPDATE exams SET created_at = NOW() - INTERVAL '20 minutes' WHERE accession_number = 'ACC-20240527-0008';
UPDATE exams SET created_at = NOW() - INTERVAL '15 minutes' WHERE accession_number = 'ACC-20240527-0009';
UPDATE exams SET created_at = NOW() - INTERVAL '10 minutes' WHERE accession_number = 'ACC-20240527-0010';