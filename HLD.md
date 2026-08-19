# High-Level Design (HLD) & Scalable Architecture Specification
## AI-Powered Internship Management System

**Version:** 1.0  
**Status:** Approved Architecture Baseline  
**Document Owner:** Senior Software Architect  

---

## 1. System Overview

The **AI-Powered Internship Management System** is a enterprise-grade, role-based institutional web platform designed to streamline, automate, and govern the end-to-end internship lifecycle for universities, colleges, and technical institutes. The system serves four primary user personas: **Student**, **Company**, **Training & Placement (T&P)**, and **Faculty Mentor**.

The platform unifies fragmented placement processes into a single, cohesive digital workflow:
`Student Registration & Profile → Profile Verification → Eligibility Evaluation → Vacancy Posting → AI Candidate Matching → Student Application → Company Review & Selection → Offer Letter Generation → T&P Verification → Mentor Assignment → Weekly Progress Tracking → Mentor & Company Evaluation → Internship Completion → PPO Recording → Institutional Analytics & QR Verification.`

---

## 2. Goals

- **Workflow Centralization**: Replace disjointed spreadsheets, emails, and paper forms with an audit-logged, state-driven platform.
- **Deterministic & Configurable Eligibility**: Automatically check student qualifications against multi-factor vacancy criteria with itemized rule failure explanations.
- **AI Assistive Matching & Intelligence**: Utilize AI to rank eligible candidates, analyze skill gaps, generate resume feedback, and answer contextual student queries without compromising deterministic governance.
- **Role-Based Security & Governance**: Enforce server-side RBAC, strict resource ownership, private document access controls, and tamper-proof audit trails for sensitive verification events.
- **Institutional Visibility**: Provide real-time analytics dashboards for T&P officers to monitor placement funnels, stipend distributions, branch performance, and skill deficiencies.
- **High Scalability & Reliability**: Design a stateless, horizontally scalable modular architecture capable of handling high-concurrency placement drives with zero-downtime availability.

---

## 3. Non-Goals

- **Full HRMS & Payroll System**: The platform does not handle employee payroll, tax deductions, or full HR lifecycle outside of the internship scope.
- **Autonomous AI Hiring Decisions**: AI models will NEVER automatically select, hire, reject, or approve candidates, offers, or completion certificates. Selection is strictly human-in-the-loop.
- **Physical Access & Hardware Integration**: Physical turnstiles, biometric hardware, or IoT attendance devices are out of scope for the software platform.
- **Legal KYC / Background Verification**: The platform verifies institutional identity; it does not replace third-party criminal or government background checks.

---

## 4. Actors & Personas

1. **Student Persona**: Engineering/University students seeking, applying for, executing, and reporting on internships.
2. **Company Recruiter Persona**: Industry hiring managers and HR personnel creating vacancies, reviewing matched candidates, issuing offer letters, evaluating performance, and offering PPOs.
3. **Training & Placement (T&P) Admin Persona**: Placement cell officers governing authentications, approving profiles/offers/completions, assigning faculty mentors, monitoring risk flags, and analyzing university metrics.
4. **Faculty Mentor Persona**: Academic faculty assigned to guide students, review weekly progress logs, provide feedback, flag progress issues, and conduct final academic rubrics.
5. **System Administrator / System**: Background service routines, AI gateway integrations, audit loggers, and automated notification engines.

---

## 5. Role Responsibilities Matrix

| Operation / Feature | Student | Company | T&P Admin | Faculty Mentor | System / AI |
|---|---|---|---|---|---|
| **Register & Manage Profile** | Owner | - | - | - | Validate format |
| **Verify Student Profile** | - | - | **Approve / Reject** | - | Audit log |
| **Create & Publish Vacancies** | View (if open) | **Owner** | View | View | Index vacancy |
| **Evaluate Eligibility** | View Result | View Filtered | View Filtered | - | **Deterministic Engine** |
| **Rank Candidates** | - | View Matches | View Matches | - | **AI Match Service** |
| **Apply to Internship** | **Trigger** | View Applicants | View Applicants | - | Deduplicate |
| **Shortlist & Select** | View Status | **Decision Maker** | View | - | Notify Student |
| **Issue Offer Letter** | - | **Upload & Issue** | Queue View | - | Gen Verification Code |
| **Offer Verification** | Accept/Decline | View Response | **Approve / Reject** | - | Update State & QR |
| **Assign Faculty Mentor** | View Mentor | - | **Assign Mentor** | View Mentees | Notify Mentor & Student |
| **Weekly Progress Log** | **Submit Log** | View Summary | View Summary | **Review & Feedback** | Check Due Dates |
| **Issue Flagging** | - | View | View Risk | **Flag Issue** | Calculate Severity |
| **Final Performance Eval** | View Summary | **Submit Rubric** | View Summary | **Submit Rubric** | Compute Overall Score |
| **Completion Verification** | View Cert | Upload Cert | **Verify & Approve** | View | Generate Proof |
| **PPO Recording** | View PPO | **Update Status** | **Record / Audit** | View | Analytics Aggregation |
| **Institutional Analytics** | - | - | **Full Dashboard** | View Department | Compute SQL Aggregations |

---

## 6. System Context Diagram

```text
                               ┌──────────────────────────────────────────┐
                               │           PUBLIC VERIFIERS               │
                               │  (Browsers, Third-Party Companies)       │
                               └────────────────────┬─────────────────────┘
                                                    │ Public GET /verify/offer/:code
                                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   API GATEWAY / EDGE PROXY                              │
│  - HTTPS Termination    - CORS Filter    - Rate Limiting    - JWT Token Authentication  │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
│   STUDENT PORTAL (REACT)  │  │   COMPANY PORTAL (REACT)  │  │  T&P & MENTOR PORTALS     │
└──────────────┬────────────┘  └────────────┬──────────────┘  └────────────┬──────────────┘
               │                            │                            │
               └────────────────────────────┼────────────────────────────┘
                                            │ REST / JSON (Authenticated)
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           MODULAR BACKEND APPLICATION SERVICES                          │
│                                                                                         │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────────────┐ │
│  │ Auth & Identity Svc   │ │ Student Profile Svc   │ │ Company & Vacancy Service     │ │
│  └───────────────────────┘ └───────────────────────┘ └───────────────────────────────┘ │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────────────┐ │
│  │ Eligibility Engine    │ │ Application Service   │ │ Candidate Matching Service    │ │
│  └───────────────────────┘ └───────────────────────┘ └───────────────────────────────┘ │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────────────┐ │
│  │ Offer & Verification  │ │ Mentor & Progress Svc │ │ Evaluation & Completion Svc   │ │
│  └───────────────────────┘ └───────────────────────┘ └───────────────────────────────┘ │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────────────┐ │
│  │ PPO Lifecycle Service │ │ Document Service      │ │ Analytics & Audit Service     │ │
│  └───────────────────────┘ └───────────────────────┘ └───────────────────────────────┘ │
└───────────────────┬───────────────────────┬────────────────────────────┬────────────────┘
                    │                       │                            │
                    ▼                       ▼                            ▼
┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
│   RELATIONAL DATABASE     │  │   OBJECT STORAGE (S3)     │  │   AI SERVICE GATEWAY      │
│  PostgreSQL               │  │  MinIO / AWS S3           │  │  Google Gemini LLM API    │
│  - ACIDs & Constraints    │  │  - Private Bucket         │  │  - Assistive Explanations │
│  - Indexed Tables         │  │  - Pre-Signed URLs        │  │  - Skill-Gap Roadmaps     │
└───────────────────────────┘  └───────────────────────────┘  └───────────────────────────┘
```

---

## 7. High-Level Architecture

The system utilizes a **Modular Monolith** architecture pattern with strict internal boundary separation. This offers rapid local execution and testability while providing a seamless evolutionary path toward independent microservices as university scale increases.

### Key Architectural Characteristics:
1. **Stateless App Tier**: Application servers store no session state in-memory. Authentication state is validated via stateless JWT tokens or centralized cache, allowing frictionless horizontal scaling behind a load balancer.
2. **Deterministic Governance Core**: Hard business rules (eligibility calculations, authorization checks, verification sign-offs) operate deterministically in code without third-party AI dependency.
3. **Asynchronous AI Service Integration**: AI interactions (resume parsing, candidate match scoring, skill-gap analysis) execute via isolated service handlers with circuit-breaker fallbacks.
4. **Relational Persistence**: PostgreSQL ensures strict transactional consistency (ACID) across multi-step state transitions (e.g. Application → Selection → Offer → Verification).

---

## 8. Component Architecture

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FRONTEND SPA LAYER                                  │
│  React 18 + TypeScript + Tailwind CSS + Vite                                           │
│  - Router & Protected Routes    - Auth Context Provider    - Recharts Dashboard Engine  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTPS / REST API
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   API & MIDDLEWARE LAYER                               │
│  - CORS & Compression      - Rate Limiting Middleware      - Request Validator (Zod)  │
│  - Auth JWT Middleware     - Server-Side RBAC Middleware   - Global Error Handler     │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DOMAIN SERVICES LAYER                               │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────────┐  │
│  │ EligibilityEngine    │  │ MatchingEngine       │  │ ApplicationService           │  │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────────────┘  │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────────┐  │
│  │ OfferService         │  │ VerificationService  │  │ MentorAssignmentService      │  │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────────────┘  │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────────┐  │
│  │ ProgressReportService│  │ EvaluationService    │  │ PPONotifierService           │  │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────────────┘  │
└───────────────────┬───────────────────────┬────────────────────────────┬───────────────┘
                    │                       │                            │
                    ▼                       ▼                            ▼
┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
│     PERSISTENCE (ORM)     │  │    STORAGE INTEGRATOR     │  │     EXTERNAL AI CLIENT    │
│  Prisma ORM over Postgres │  │  AWS S3 SDK Integrator    │  │  Google Generative AI SDK │
└───────────────────────────┘  └───────────────────────────┘  └───────────────────────────┘
```

---

## 9. Module Boundaries & Responsibility Ownership

To preserve clean code architecture and maintainability, ownership for major business operations is explicitly partitioned into dedicated modules:

| Domain Module | Primary Ownership & Responsibilities | Prohibited Actions / Scope Boundaries |
|---|---|---|
| **Auth & Identity Service** | User registration, password hashing (bcrypt/argon2), JWT token generation/validation, session management. | Must not modify student academic data or vacancy rules. |
| **Student Management Service** | Profile management, academic details, skill tags, project experience, certification records, profile submission. | Must not perform institutional verifications or issue offers. |
| **Company & Vacancy Service** | Recruiter company profiles, vacancy creation, multi-factor criteria definition, vacancy status updates. | Must not directly modify student eligibility status. |
| **Eligibility Service** | **Deterministic rule execution** (CGPA, backlogs, branch, passing year, skills). Generates itemized pass/fail reasons. | **AI models cannot override this service.** Must remain 100% deterministic. |
| **Candidate Matching Service** | Calculates weighted match scores (Skills 40%, Projects 25%, Academics 20%, Certs 15%) and generates match explanations. | Cannot declare an ineligible candidate as eligible. |
| **Application Service** | Application lifecycle management (`APPLIED` → `SHORTLISTED` → `SELECTED` → `REJECTED`), deduplication checks. | Cannot bypass eligibility validation checks. |
| **Offer Service** | Offer letter record creation, student acceptance/decline responses, verification code generation. | Cannot mark offer as `APPROVED` without T&P sign-off. |
| **T&P Verification Service** | Verification queue management for Student Profiles, Offers, and Completions; audit logging decisions. | Cannot alter vacancy criteria retroactively. |
| **Mentor & Tracking Service** | Faculty mentor directory, mentee assignments, weekly progress log submission, log reviews, issue flagging (`On Track`, `Needs Attention`, `Critical`). | Cannot modify company selection statuses. |
| **Evaluation Service** | Structured final performance rubrics for mentors and company supervisors; overall score computation. | Cannot alter historical submitted report logs. |
| **PPO Lifecycle Service** | Pre-Placement Offer status recording, CTC offer logging, PPO registry management. | Cannot issue PPOs without valid preceding internship records. |
| **Document Management Service** | Storage key generation, file MIME/size checks, pre-signed PUT/GET URL generation. | Direct public bucket access is prohibited. |
| **Analytics Service** | Institutional SQL aggregations, placement conversion funnels, department metrics, stipend statistics, skill gap reports. | Must execute read-only queries against database. |
| **AI Integration Service** | LLM API gateway for resume feedback, skill-gap learning roadmaps, contextual copilot assistance. | **Must NEVER execute automated hiring, verification, or rejection logic.** |

---

## 10. Data Flow Across End-to-End Lifecycle

```text
[1. Student Profile Created & Verified]
   │
   ▼
[2. Company Posts Vacancy & Multi-Factor Criteria]
   │
   ▼
[3. Deterministic Eligibility Engine Filter Executed] ──► (Checks CGPA, Backlogs, Branch, Year)
   │
   ▼
[4. Eligible Student Applies to Internship] ──► (Application record: APPLIED)
   │
   ▼
[5. AI Match Engine Ranks Applicants] ──► (Weighted Scoring + AI Match Explanation)
   │
   ▼
[6. Company Shortlists & Selects Candidate] ──► (Application status: SELECTED)
   │
   ▼
[7. Company Issues Offer Letter] ──► (Offer record created: ISSUED)
   │
   ▼
[8. Student Accepts Offer] ──► (Offer status: ACCEPTED; Queued to T&P)
   │
   ▼
[9. T&P Reviews & Approves Offer] ──► (Offer status: APPROVED; Verification Code & QR Generated)
   │
   ▼
[10. T&P Assigns Faculty Mentor] ──► (MentorAssignment status: ACTIVE)
   │
   ▼
[11. Internship Starts & Student Logs Weekly Reports] ──► (ProgressReport: SUBMITTED)
   │
   ▼
[12. Mentor Reviews Report & Submits Feedback] ──► (ProgressReport: APPROVED)
   │
   ▼
[13. Company & Mentor Complete Final Evaluations] ──► (Rubric Scores Recorded)
   │
   ▼
[14. Company Uploads Completion Certificate] ──► (Completion record: PENDING)
   │
   ▼
[15. T&P Verifies Completion & Records PPO] ──► (Completion: APPROVED; PPO: OFFERED)
   │
   ▼
[16. Data Aggregated in Institutional Analytics & Public QR Verification Active]
```

---

## 11. Authentication Architecture

- **Token Strategy**: Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256 (`JWT_SECRET`).
- **Payload Schema**:
  ```json
  {
    "id": "usr_998124",
    "email": "student@college.edu",
    "role": "STUDENT",
    "iat": 1771340000,
    "exp": 1771944800
  }
  ```
- **Password Security**: Passwords hashed using bcrypt (cost factor = 10) or Argon2id. Plaintext passwords are never logged or stored.
- **Header Structure**: `Authorization: Bearer <access_token>`

---

## 12. Authorization & RBAC Architecture

Authorization is enforced strictly on the server side using two complementary validation layers:

1. **Role-Based Access Control (RBAC)**: Route middleware validates that `req.user.role` exists in the allowed roles array for the target endpoint:
   ```typescript
   authorizeRoles('TNP', 'ADMIN')
   ```
2. **Resource Ownership Control**: Controller logic verifies that the authenticated user owns or has explicit governance over the specific resource ID being accessed:
   - **Student**: Allowed to modify only own profile (`userId === req.user.id`).
   - **Company**: Allowed to modify only own vacancies and candidate applications to own vacancies.
   - **Mentor**: Allowed to review reports only for students in active `MentorAssignment` records where `mentorId === req.user.mentorProfile.id`.
   - **T&P Admin**: Allowed institution-wide read/write permissions for verification, mentor assignment, analytics, and audit logging.

---

## 13. Internship Lifecycle State Machines

Every core entity operates under a strict server-side state machine. Invalid state transitions result in a `400 Bad Request` or `409 Conflict` error response.

```text
[Profile Status]
DRAFT ──► SUBMITTED ──► UNDER_REVIEW ──┬──► VERIFIED
                                       ├──► REJECTED
                                       └──► CORRECTION_REQUIRED

[Vacancy Status]
DRAFT ──► PUBLISHED ──► OPEN ──► CLOSED ──► ARCHIVED

[Application Status]
APPLIED ──► UNDER_REVIEW ──► SHORTLISTED ──┬──► SELECTED
                                           ├──► REJECTED
                                           └──► WITHDRAWN

[Offer Status]
DRAFT ──► ISSUED ──► ACCEPTED ──► TNP_REVIEW ──┬──► APPROVED
                                               ├──► REJECTED
                                               └──► CORRECTION_REQUIRED

[Mentor Assignment Status]
ASSIGNED ──► ACCEPTED ──► ACTIVE ──► COMPLETED

[Progress Report Status]
SUBMITTED ──┬──► APPROVED
            └──► CHANGES_REQUIRED

[PPO Status]
NOT_APPLICABLE ──► UNDER_CONSIDERATION ──► OFFERED ──┬──► ACCEPTED
                                                    └──► DECLINED
```

---

## 14. AI Architecture & Safety Boundaries

### AI Service Pipeline:
1. **Hard Eligibility Filtering (Deterministic)**: The system filters out all students failing minimum CGPA, backlog, branch, or passing year constraints.
2. **Feature Extraction**: Constructs a structured JSON representation of student skills, projects, certifications, and academic performance.
3. **Scoring & Match Ranking**: Calculates transparent weighted scores (Skill Match 40%, Project Match 25%, Academic Fit 20%, Cert Fit 15%).
4. **LLM Natural Language Generation**: Invokes Google Gemini LLM API (`gemini-1.5-flash`) to generate concise, human-readable match explanations and skill-gap learning roadmaps.

### AI Boundary Rules:
> [!IMPORTANT]
> **Strict AI Boundary Rules**:
> 1. AI models shall **NEVER** directly approve, reject, select, or complete any application, offer, profile, or PPO.
> 2. AI output is strictly **assistive** and **informational**.
> 3. If the external AI API service is unavailable, the application gracefully falls back to deterministic rule scoring and static recommendations without throwing errors.

---

## 15. Document Management Architecture

- **Storage Engine**: S3-compatible Object Storage (MinIO for local development, AWS S3 for production).
- **Upload Flow**:
  1. Client requests document upload permission.
  2. Server checks user authentication and validates file MIME type (`application/pdf`, `image/jpeg`, `image/png`) and file size (`<= 10MB`).
  3. Server stores file using an isolated, non-predictable UUID storage key (e.g. `doc-uuid-8812.pdf`).
  4. Server creates a `Document` record in PostgreSQL storing metadata (`storageKey`, `originalName`, `mimeType`, `size`, `status`).
- **Access Flow**: Direct public bucket access is disabled. File access requires calling `/api/v1/documents/:id` which validates RBAC/ownership before serving the file or issuing a short-lived signed URL.

---

## 16. Notification Architecture

- **Notification Storage**: System alerts are stored in the relational `Notification` table (`id, userId, type, title, message, readAt, createdAt`).
- **Event Triggers**: System triggers automated notifications upon key lifecycle state changes:
  - Profile submitted / verified / rejected
  - Candidate shortlisted / selected / rejected
  - Offer letter issued by company
  - Offer verified by T&P
  - Faculty mentor assigned
  - Progress report submitted / reviewed
  - PPO offered

---

## 17. Analytics Architecture

- **Transactional Aggregation Engine**: Computes institutional metrics dynamically using database aggregation queries (`COUNT`, `AVG`, `MAX`, `MIN`, `GROUP BY`).
- **Institutional Metric Indicators**:
  - **Conversion Funnel**: Applied → Shortlisted → Selected → Offer Approved → Active Interns → Completed → PPO Offered.
  - **Departmental Metrics**: Student distribution and average CGPA per engineering branch.
  - **Stipend Metrics**: Maximum, minimum, and average monthly stipends across hiring partners.
  - **PPO Conversion Metrics**: Percentage of ongoing internships converting to full-time PPOs.
- **Frontend Visualization**: Visualized using SVG charting components (`Recharts`).

---

## 18. Security Architecture

1. **Input Sanitization & Schema Validation**: All request bodies, query params, and route variables are validated at the middleware layer using `Zod` schemas.
2. **SQL Injection Defense**: Handled automatically via Prisma ORM parameterized SQL queries.
3. **XSS Defense**: HTML escaping built into React SPA rendering engine.
4. **CORS Policy**: Configured to accept requests only from trusted frontend origin domains.
5. **Rate Limiting**: API Gateway rate limiters prevent brute-force login and API abuse.
6. **Audit Logging**: Every sensitive action creates an immutable `AuditLog` record storing `actorId`, `action`, `entityType`, `entityId`, `oldDataJson`, `newDataJson`, `reason`, and `createdAt`.

---

## 19. Scalability Strategy

- **Stateless Backend Servers**: Application nodes carry zero session state and can scale horizontally behind an NGINX / AWS ALB load balancer.
- **Database Indexing Strategy**: Indexes applied to high-frequency query paths:
  - `User(email)`
  - `StudentProfile(userId, studentCode, department, passingYear)`
  - `Internship(companyId, status, deadline)`
  - `Application(internshipId, studentId, status)`
  - `ProgressReport(studentId, internshipId, weekNumber)`
  - `Offer(verificationCode)`
- **Query Pagination**: All list endpoints enforce standard pagination parameters (`?page=1&pageSize=20`).
- **Static Asset Offloading**: Client single-page app bundled and served via CDN.

---

## 20. Reliability & Fault Tolerance Strategy

- **Graceful Fallbacks**: If the external Gemini AI service experiences outages or rate limits, the system falls back to rule-based algorithms for candidate matching and static recommendations.
- **Global Error Handler**: Unhandled exceptions are caught by Express global error handling middleware, logging error trace details while returning a sanitized JSON error payload to the client.
- **Database Connection Pooling**: Prisma Client manages connection pooling to handle concurrent requests efficiently.

---

## 21. Deployment Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                     CDN / EDGE LAYER                                    │
│  Cloudflare / Vercel Edge CDN (Serves React Static Frontend SPA Assets)                │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                LOAD BALANCER / REVERSE PROXY                            │
│  NGINX / AWS Application Load Balancer (SSL Termination, Rate Limiting)                │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
┌─────────────────────────────────────────┐               ┌───────────────────────────────┐
│ BACKEND CONTAINER NODE 1 (DOCKER)       │               │ BACKEND CONTAINER NODE 2      │
│ Node.js + Express + Prisma Runtime      │               │ Node.js + Express + Prisma    │
└────────────────────┬────────────────────┘               └───────────────┬───────────────┘
                     │                                                    │
                     └──────────────────────┬─────────────────────────────┘
                                            │
            ┌───────────────────────────────┼───────────────────────────────┐
            ▼                               ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐       ┌───────────────────────┐
│  MANAGED POSTGRESQL   │       │  S3 OBJECT STORAGE    │       │  EXTERNAL AI PROVIDER │
│  AWS RDS / Managed DB │       │  AWS S3 / MinIO       │       │  Google Gemini API    │
└───────────────────────┘       └───────────────────────┘       └───────────────────────┘
```

---

## 22. External Integrations

1. **Google Gemini LLM API**: Contextual match explanations, resume feedback, skill-gap roadmaps, copilot chat responses.
2. **AWS S3 / MinIO Object Storage API**: Secure file upload, storage, and pre-signed URL download handling.
3. **Public Verification Resolver (`/api/v1/verify/offer/:code`)**: Unauthenticated public endpoint verifying authentic offer certificates.

---

## 23. Disaster Recovery & Data Protection

- **Database Backups**: Automated daily full snapshots with Write-Ahead Logging (WAL) enabled for point-in-time recovery (RPO < 1 hour).
- **Object Store Replication**: S3 versioning enabled on document buckets to prevent accidental deletion or corruption.
- **Reproducible Demo Seeding**: `npm run prisma:seed` script provides complete, self-contained initial database state for instant environment recovery.

---

## 24. Future Extensibility

- **Multi-Tenant University Support**: Schema designed to easily accommodate multiple college campuses under a single deployment by adding `tenant_id` to institutional models.
- **Automated Email / WhatsApp Webhooks**: Webhook event dispatchers can be plugged into the notification service for automated SMS/email alerts.
- **External HRMS Synchronization**: Standard REST API schema enables seamless integration with institutional ERP systems (e.g. SAP, Workday, Canvas).

---
*End of High-Level Design (HLD) Document.*
