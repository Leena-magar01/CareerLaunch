# Technical Requirements Document (TRD)
## AI-Powered Internship Management System

**Version:** 1.0  
**Purpose:** Define how the product should be technically implemented.

---

## 1. Technical Objective

Build a secure, modular, responsive web application capable of supporting the complete internship lifecycle while remaining simple enough for a hackathon MVP.

The challenge requires a working prototype/MVP, sample/demo data, a clear user flow, technology-stack explanation, security/roles and practical usefulness.

## 2. Recommended Architecture

```text
                    ┌─────────────────────┐
                    │   Web Frontend      │
                    │ Student/Company/    │
                    │ T&P/Mentor          │
                    └──────────┬──────────┘
                               │ HTTPS/JSON
                               ▼
                    ┌─────────────────────┐
                    │ API / Backend       │
                    │ Auth + RBAC         │
                    │ Business Logic      │
                    │ Workflow Engine     │
                    └──────┬─────┬────────┘
                           │     │
                ┌──────────┘     └─────────────┐
                ▼                              ▼
       ┌────────────────┐             ┌────────────────┐
       │ PostgreSQL/    │             │ Object Storage │
       │ MySQL          │             │ Documents      │
       └────────────────┘             └────────────────┘
                │
                ▼
       ┌────────────────┐
       │ AI Service     │
       │ Matching       │
       │ Recommendation │
       │ Skill Gap      │
       │ Resume         │
       └────────────────┘
```

## 3. Recommended Technology Stack

### Frontend
- React + TypeScript
- Vite or equivalent
- Tailwind CSS
- Component library if required
- Chart library for analytics

### Backend
- Node.js + Express/NestJS, or equivalent
- REST API
- JWT/session-based authentication
- RBAC middleware
- Validation layer

### Database
- PostgreSQL preferred
- MySQL acceptable
- ORM: Prisma/Drizzle/Sequelize equivalent

### File Storage
- S3-compatible object storage or secure cloud storage
- Local storage for hackathon demo only

### AI
- LLM API for explanation/copilot/resume analysis
- Embeddings/vector search only if recommendation scale requires it
- Deterministic rules for hard eligibility

### Deployment
- Frontend: Vercel/Netlify equivalent
- Backend: Render/Railway/Fly.io/cloud equivalent
- DB: managed PostgreSQL/MySQL
- Object storage: S3-compatible service

## 4. Architecture Principles

1. Keep hard business rules deterministic.
2. Keep AI assistive, not authoritative.
3. Separate role permissions from UI hiding.
4. Validate on both client and server.
5. Store files outside relational tables where appropriate.
6. Keep audit records for sensitive state changes.
7. Use modular services so features can be extended.
8. Prefer a monolith for hackathon speed unless scale requires microservices.

## 5. Authentication

### Required
- Registration
- Login
- Logout
- Password reset
- Session/token validation

### Roles
`STUDENT`, `COMPANY`, `TNP`, `MENTOR`, optional `ADMIN/HOD`.

### Security
- Password hashing with Argon2/bcrypt
- Short-lived access token + refresh mechanism if using JWT
- Secure cookies where appropriate
- Rate limiting
- Server-side authorization

## 6. RBAC

Authorization must be enforced server-side.

Example:
- Student can modify own profile.
- Company can modify only its vacancies.
- T&P can verify institution-level records.
- Mentor can modify reports/evaluations only for assigned students.

Never rely only on frontend route protection.

## 7. Eligibility Engine

Use a deterministic rules engine.

Input:
```json
{
  "student": {
    "cgpa": 8.2,
    "backlogs": 0,
    "branch": "IT",
    "passingYear": 2027,
    "skills": ["Java", "SQL", "React"],
    "certifications": ["Java"],
    "experience": 1
  },
  "internship": {
    "minCgpa": 7.5,
    "maxBacklogs": 0,
    "branches": ["IT", "CSE"],
    "passingYears": [2027],
    "requiredSkills": ["Java", "SQL"]
  }
}
```

Output:
```json
{
  "eligible": true,
  "reasons": [],
  "failedRules": []
}
```

For failure:
```json
{
  "eligible": false,
  "failedRules": [
    {
      "rule": "MIN_CGPA",
      "message": "CGPA below required criteria"
    }
  ]
}
```

## 8. Matching Architecture

Stage 1: hard eligibility filter.

Stage 2: candidate scoring:
- Skill overlap
- Preferred role
- Relevant projects
- Certifications
- Experience
- Academic fit
- Student preferences

Stage 3: optional AI explanation.

Never let an LLM override hard eligibility.

## 9. File Handling

- Validate file type and size.
- Generate unique object key.
- Do not trust original filenames.
- Scan files where infrastructure permits.
- Store metadata in DB.
- Use signed/private URLs.
- Log access where needed.

## 10. Workflow State Machine

Implement server-side state transitions.

Example:
```text
APPLICATION:
APPLIED → UNDER_REVIEW → SHORTLISTED → SELECTED
                              └──────→ REJECTED
```

Invalid transitions must return a controlled error.

## 11. Notifications

Use an internal notification table first.

Optional external integrations:
- Email
- WhatsApp

Do not make external messaging a dependency for the core workflow.

## 12. Audit Trail

Audit:
- Login/security events
- Profile verification
- Offer approval/rejection
- Mentor assignment
- Completion verification
- PPO update
- Important document decisions

Fields:
`actorId, action, entityType, entityId, oldValue, newValue, reason, timestamp`.

## 13. API Standards

- RESTful resource naming
- JSON
- Consistent HTTP status codes
- Pagination for lists
- Filtering/sorting
- Validation errors in consistent format
- Correlation/request ID for debugging

## 14. Error Response

```json
{
  "success": false,
  "error": {
    "code": "ELIGIBILITY_FAILED",
    "message": "Student is not eligible",
    "details": [
      "CGPA below required criteria"
    ]
  }
}
```

## 15. Performance Targets for MVP

Recommended targets:
- Dashboard API p95 < 1.5s for normal demo load
- Standard CRUD API p95 < 800ms excluding external AI/file operations
- Eligibility calculation < 300ms for normal profile
- UI first useful render < 3s on reasonable broadband
- Analytics queries should use indexed/filterable fields

These are engineering targets, not requirements stated by the hackathon guide.

## 16. Scalability

Start as modular monolith:
```text
auth
students
companies
internships
applications
offers
verification
mentors
progress
evaluations
documents
ppo
analytics
ai
notifications
```

Later services can be separated if required.

## 17. Observability

- Structured logs
- API error logging
- Audit logs
- Basic health endpoint
- Database migration tracking
- AI request/error logging without storing sensitive prompt data unnecessarily

## 18. Environment Variables

```text
DATABASE_URL=
JWT_SECRET=
STORAGE_ENDPOINT=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
AI_API_KEY=
EMAIL_API_KEY=
APP_BASE_URL=
```

Never commit secrets.

## 19. Backup / Recovery

For a real deployment:
- Automated DB backups
- File-storage versioning
- Recovery testing
- Retention policy

For hackathon MVP:
- Use managed DB backups where available
- Keep seeded demo data reproducible

## 20. Deployment

```text
GitHub
  ↓
CI/CD
  ↓
Frontend deployment
  ↓
Backend deployment
  ↓
Managed DB
  ↓
Object storage
  ↓
AI provider
```

## 21. Technical Acceptance Criteria

- All four core roles can authenticate.
- Server-side RBAC prevents unauthorized actions.
- Complete lifecycle works end-to-end.
- Eligibility is deterministic and explainable.
- Documents are securely stored.
- State transitions cannot be bypassed.
- AI failures do not break the core workflow.
- Analytics reflect transactional data.
- System can be seeded with demo data.
