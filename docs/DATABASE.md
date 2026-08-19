# Database Design Document
## AI-Powered Internship Management System

---

## 1. Database Objective

The database must represent the complete internship lifecycle while preserving role ownership, auditability, document status, progress history and analytics.

Recommended relational DB: PostgreSQL or MySQL.

## 2. Core Entity Relationship

```text
User
 ├── StudentProfile
 ├── CompanyProfile
 └── MentorProfile

Company ──< Internship ──< Application >── Student
                         │
                         └── Selection
                               │
                               └── Offer
                                     │
                                     └── T&P Verification
                                           │
                                           └── Mentor Assignment
                                                 │
Student ──< ProgressReport ────────────────> Mentor
Student ──< Document
Company ──< Document
T&P ──────< Verification
Company ──< Evaluation
Mentor ───< Evaluation
Internship ── Completion ── PPO
```

## 3. Tables

### users
| Column | Type | Rules |
|---|---|---|
| id | UUID/BIGINT | PK |
| email | VARCHAR | UNIQUE |
| password_hash | VARCHAR | NOT NULL |
| role | ENUM | STUDENT/COMPANY/TNP/MENTOR/ADMIN |
| status | ENUM | ACTIVE/INACTIVE/PENDING |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### students
| Column | Type | Rules |
|---|---|---|
| id | UUID | PK |
| user_id | FK | UNIQUE |
| student_code | VARCHAR | UNIQUE |
| full_name | VARCHAR | |
| department_id | FK | |
| passing_year | INT | |
| cgpa | DECIMAL | |
| backlogs | INT | |
| bio | TEXT | |
| linkedin_url | VARCHAR | |
| github_url | VARCHAR | |
| profile_status | ENUM | |
| created_at | TIMESTAMP | |

### student_skills
`student_id FK, skill_id FK, proficiency, evidence`

### skills
`id, name, category`

### certifications
`id, student_id, name, issuer, issue_date, expiry_date, document_id`

### projects
`id, student_id, title, description, technologies, project_url`

### companies
`id, user_id, name, website, industry, description, contact_name, contact_email, verification_status`

### internships
| Column | Type |
|---|---|
| id | UUID |
| company_id | FK |
| title | VARCHAR |
| description | TEXT |
| duration_months | INT |
| mode | ENUM |
| location | VARCHAR |
| stipend | DECIMAL |
| vacancies | INT |
| deadline | DATE |
| start_date | DATE |
| status | ENUM |
| created_at | TIMESTAMP |

### internship_criteria
`id, internship_id, min_cgpa, max_backlogs, allowed_branches, passing_years, required_experience, other_rules`

### internship_skills
`internship_id, skill_id, required, weight`

### applications
| Column | Type |
|---|---|
| id | UUID |
| internship_id | FK |
| student_id | FK |
| status | ENUM |
| applied_at | TIMESTAMP |
| withdrawn_at | TIMESTAMP nullable |

Unique constraint:
`(internship_id, student_id)`

### application_scores
`application_id, eligibility_score, ai_match_score, skill_score, academic_score, explanation, model_version`

### offers
`id, application_id, document_id, issued_at, acceptance_deadline, student_response, status`

### verifications
`id, entity_type, entity_id, verifier_id, status, reason, reviewed_at`

### mentor_assignments
`id, student_id, internship_id, mentor_id, assigned_by, status, assigned_at, accepted_at`

### progress_reports
`id, internship_id, student_id, mentor_id, week_number, submitted_at, tasks, learning, challenges, hours, status`

### progress_feedback
`id, progress_report_id, mentor_id, feedback, action_required, created_at`

### issues
`id, internship_id, student_id, mentor_id, severity, title, description, status, created_at, resolved_at`

### evaluations
`id, internship_id, evaluator_id, evaluator_role, technical_score, problem_solving_score, communication_score, professionalism_score, teamwork_score, overall_score, comments`

### documents
`id, owner_user_id, entity_type, entity_id, document_type, storage_key, original_name, mime_type, size, status, uploaded_at`

### completion
`id, internship_id, student_id, certificate_document_id, verified_by, verified_at, status`

### ppo
`id, internship_id, student_id, company_id, status, role, offered_ctc, offer_date, document_id`

### notifications
`id, user_id, type, title, message, read_at, created_at`

### audit_logs
`id, actor_id, action, entity_type, entity_id, old_data_json, new_data_json, reason, created_at`

## 4. Indexes

Recommended:
- users(email)
- students(student_code, department_id, passing_year)
- internships(status, deadline, company_id)
- applications(internship_id, student_id, status)
- progress_reports(student_id, internship_id, week_number)
- documents(entity_type, entity_id, status)
- notifications(user_id, read_at)
- audit_logs(entity_type, entity_id, created_at)

## 5. Constraints

- CGPA range 0–10.
- Backlogs >= 0.
- Vacancies > 0.
- Internship deadline >= creation date.
- Unique application per student/internship.
- Mentor assignment unique per active internship/student unless reassignment is explicitly supported.
- Scores constrained to defined scale.
- PPO only belongs to a valid internship/student/company relationship.

## 6. Data Lifecycle

```text
Student
 ↓
Profile
 ↓
Eligibility result
 ↓
Application
 ↓
Selection
 ↓
Offer
 ↓
Verification
 ↓
Mentor Assignment
 ↓
Progress Reports
 ↓
Evaluations
 ↓
Completion
 ↓
PPO
```

## 7. Analytics Strategy

Use transactional tables as source of truth. For hackathon scale, SQL aggregation is sufficient.

For larger scale, introduce materialized views/fact tables for:
- applications
- selections
- active internships
- completion
- PPO
- stipend
- skill gaps

## 8. Data Privacy

- Do not store passwords in plaintext.
- Store private document references, not public URLs.
- Restrict access by role and ownership.
- Avoid exposing unnecessary student information to companies.
- Public QR verification must show only verification-safe information.
