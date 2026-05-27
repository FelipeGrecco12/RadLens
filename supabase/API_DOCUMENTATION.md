# RADILENS Backend API Documentation

## Overview

RADILENS backend is built using Supabase Edge Functions (Deno runtime) with PostgreSQL database. All endpoints require authentication via JWT token.

**Base URL:** `{SUPABASE_URL}/functions/v1/`

**Authentication:**
All requests must include:
```
Authorization: Bearer {JWT_TOKEN}
```

---

## Edge Functions

### 1. Exams Management (`/exams`)

#### GET /exams
List exams with optional filters.

**Query Parameters:**
- `status` - Filter by status: `pending_review`, `uploaded`, `in_review`, `reported`, `signed`
- `priority` - Filter by priority: `routine`, `urgent`, `critical`, `stat`
- `assigned` - Filter by assignment: `me` (current user's exams)
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset

**Response:**
```json
{
  "exams": [...],
  "total": 100
}
```

#### GET /exams/:id
Get single exam with all details.

**Response:**
```json
{
  "id": "uuid",
  "accession_number": "ACC-20240527-0001",
  "exam_type": "CT Scan",
  "body_part": "Chest",
  "modality": "CT",
  "status": "ai_completed",
  "priority": "critical",
  "patient": {...},
  "findings": [...],
  "report": {...}
}
```

#### POST /exams
Create new exam.

**Body:**
```json
{
  "patient_id": "uuid",
  "exam_type": "CT Scan",
  "body_part": "Chest",
  "modality": "CT",
  "clinical_indication": "Suspected PE",
  "priority": "urgent",
  "requesting_physician": "Dr. Smith",
  "institution": "General Hospital",
  "image_count": 245
}
```

#### PUT /exams/:id
Update exam status or priority.

**Body:**
```json
{
  "status": "in_review",
  "priority": "critical"
}
```

#### POST /exams/:id/assign
Assign exam to radiologist.

**Body:**
```json
{
  "radiologist_id": "uuid"
}
```

---

### 2. AI Analysis (`/ai-analysis`)

#### POST /ai-analysis
Webhook endpoint for AI service to submit analysis results.

**Body:**
```json
{
  "exam_id": "uuid",
  "priority_score": 0.92,
  "summary": "Multiple findings detected...",
  "findings": [
    {
      "finding_type": "Nodule",
      "location": "Right Upper Lobe",
      "size_mm": 8,
      "severity": "suspicious",
      "description": "Spiculated nodule...",
      "confidence_score": 0.92
    }
  ]
}
```

#### POST /ai-analysis/trigger
Trigger AI analysis for an exam (simulated for demo).

**Body:**
```json
{
  "exam_id": "uuid"
}
```

#### GET /ai-analysis/:exam_id
Get AI analysis status and results.

---

### 3. Reports (`/reports`)

#### GET /reports
List reports with filters.

**Query Parameters:**
- `status` - `signed` or `preliminary`
- `limit`, `offset` - Pagination

#### GET /reports/:id
Get single report with full details.

#### POST /reports
Create new report.

**Body:**
```json
{
  "exam_id": "uuid",
  "findings_text": "Detailed findings...",
  "impression": "Clinical impression...",
  "recommendations": "Follow-up in 3 months",
  "classification_system": "Lung-RADS",
  "classification_code": "4B",
  "ai_suggestions_used": true
}
```

#### PUT /reports/:id
Update report content.

#### POST /reports/:id/sign
Sign report (finalizes it).

#### POST /reports/:id/addendum
Add addendum to signed report.

**Body:**
```json
{
  "text": "Additional findings noted..."
}
```

---

### 4. Notifications (`/notifications`)

#### GET /notifications
List user notifications.

**Query Parameters:**
- `unread` - `true` to show only unread
- `limit` - Max results

#### PUT /notifications/:id/read
Mark notification as read.

#### PUT /notifications/mark-all-read
Mark all notifications as read.

#### DELETE /notifications/:id
Delete notification.

#### GET /notifications/unread-count
Get count of unread notifications.

#### POST /notifications/broadcast
Send notification to multiple users (admin only).

**Body:**
```json
{
  "title": "System Alert",
  "message": "Message content",
  "type": "info",
  "user_ids": ["uuid1", "uuid2"],
  "exam_id": "uuid"
}
```

---

### 5. Patients (`/patients`)

#### GET /patients
List patients with search.

**Query Parameters:**
- `search` - Search by name or MRN
- `limit`, `offset` - Pagination

#### GET /patients/:id
Get patient with full details and exam history.

#### POST /patients
Create new patient.

**Body:**
```json
{
  "mrn": "MRN-001",
  "full_name": "Maria Santos",
  "birth_date": "1965-03-15",
  "gender": "Female",
  "phone": "+55 11 98765-4321",
  "email": "maria@email.com"
}
```

#### PUT /patients/:id
Update patient information.

#### GET /patients/:id/exams
Get patient's exam history.

#### POST /patients/sync-fhir
Sync patient from FHIR server.

**Body:**
```json
{
  "fhir_patient_id": "12345",
  "fhir_server_url": "https://fhir.hospital.com",
  "fhir_api_key": "optional_api_key"
}
```

---

### 6. Real-time Statistics (`/realtime`)

#### GET /realtime/stats
Get live dashboard statistics.

**Response:**
```json
{
  "total_exams": 500,
  "pending_review": 23,
  "critical_pending": 3,
  "reported_today": 15,
  "avg_turnaround_minutes": 120,
  "by_status": {...},
  "by_priority": {...}
}
```

#### GET /realtime/activities
Get recent audit activities.

**Query Parameters:**
- `limit` - Number of activities

#### GET /realtime/radiologist-workload
Get workload breakdown per radiologist.

#### GET /realtime/sla-status
Get SLA compliance status with warnings and breaches.

---

## Database Views

### pending_exams_view
Pre-built view for worklist with all relevant joins.

```sql
SELECT * FROM pending_exams_view;
```

---

## Database Functions

### get_least_busy_radiologist()
Returns the UUID of the radiologist with fewest assigned exams.

### generate_accession_number()
Generates a unique accession number in format `ACC-YYYYMMDD-XXXX`.

### check_sla_compliance(exam_id)
Returns JSON with SLA status for a specific exam.

### get_worklist_stats()
Returns aggregated statistics for the worklist.

---

## Triggers

### on_auth_user_created
Automatically creates a profile when a new user signs up.

### trigger_update_exam_status
Updates exam status when report is created or signed.

### trigger_notify_critical_finding
Creates notifications when critical findings are detected by AI.

### trigger_auto_assign_critical
Automatically assigns critical/stat exams to least busy radiologist.

---

## Status Flow

```
pending_upload → uploaded → ai_processing → ai_completed → in_review → reported → signed → delivered
```

## Priority Levels

1. **stat** - Life-threatening, immediate attention required
2. **critical** - Urgent findings requiring prompt review
3. **urgent** - High priority, review within hours
4. **routine** - Standard priority, review within days

## Classification Systems Supported

- **BI-RADS** - Breast Imaging
- **Lung-RADS** - Lung Nodules
- **TI-RADS** - Thyroid
- **PI-RADS** - Prostate
- **LI-RADS** - Liver

---

## Error Handling

All endpoints return errors in this format:
```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400` - Bad request (missing/invalid parameters)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Internal server error

---

## CORS Configuration

All Edge Functions include CORS headers for browser access:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Client-Info, Apikey`

---

## Security

- All endpoints require JWT authentication
- Row Level Security (RLS) enforced on all database operations
- Audit logs recorded for all critical actions
- Automatic profile creation on user signup
- Notification system for critical events
