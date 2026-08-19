# Functional Requirements Document (FRD)
## AI-Powered Internship Management System

**Version:** 1.0  
**Status:** Development Baseline  
**Source basis:** GHR Inter-Track Hackathon 2026 guide + finalized project workflow

---

## 1. Purpose

This FRD defines what the Internship Management System must do from a functional perspective. It converts the finalized workflow into implementable modules, user actions, business rules, states, validations and acceptance criteria.

The hackathon requires a working MVP covering student profile, automatic eligibility, company internship posting, application/selection, internship workflow, document management, tracking/evaluation, dashboards/analytics, and security/roles. The required journey runs from student registration/profile through verification, eligibility, company posting, application, selection, offer, T&P verification, mentor assignment, weekly tracking, evaluation, completion, PPO and analytics. 

## 2. Product Scope

### In scope
- Role-based authentication
- Student registration/profile
- Profile verification
- Automatic eligibility checking
- Internship vacancy management
- Candidate matching/ranking
- Internship applications
- Shortlisting and selection
- Offer-letter workflow
- T&P verification
- Mentor assignment
- Weekly progress tracking
- Mentor/company evaluation
- Completion verification
- PPO status
- Document management
- Notifications/status updates
- Role-specific dashboards
- Institutional analytics
- AI-assisted recommendation/matching features

### Out of scope for MVP
- Full payroll management
- Full HRMS
- Complex attendance hardware integration
- Real-world legal/KYC automation
- Autonomous hiring decisions
- Full mobile application if web MVP is sufficient

## 3. Roles

| Role | Scope |
|---|---|
| Student | Own profile, eligibility, applications, internship and documents |
| Company | Own company, vacancies, candidates and interns |
| T&P | Institution-wide verification, approvals, assignments and analytics |
| Faculty Mentor | Assigned students and their progress/evaluation |
| HOD/Admin | Optional read-only/relevant institutional reports |

## 4. Global Status Model

### Profile
`DRAFT → SUBMITTED → UNDER_REVIEW → VERIFIED / REJECTED / CORRECTION_REQUIRED`

### Internship Vacancy
`DRAFT → PUBLISHED → OPEN → CLOSED → ARCHIVED`

### Application
`APPLIED → UNDER_REVIEW → SHORTLISTED → SELECTED / REJECTED / WITHDRAWN`

### Offer
`DRAFT → ISSUED → ACCEPTED → TNP_REVIEW → APPROVED / REJECTED / CORRECTION_REQUIRED`

### Internship
`NOT_STARTED → ONGOING → COMPLETION_PENDING → COMPLETED`

### Document
`UPLOADED → UNDER_REVIEW → VERIFIED / REJECTED / CORRECTION_REQUIRED`

### Mentor Assignment
`ASSIGNED → ACCEPTED → ACTIVE → COMPLETED`

### PPO
`NOT_APPLICABLE → UNDER_CONSIDERATION → OFFERED → DECLINED / ACCEPTED`

## 5. Student Functional Requirements

### FR-STU-001 Registration
The system shall allow a student to create an account using approved institutional credentials/email.

**Acceptance criteria**
- Required fields are validated.
- Duplicate account is prevented.
- Account receives correct `STUDENT` role.
- Student is redirected to profile completion.

### FR-STU-002 Profile
Student shall maintain:
- Personal information
- Academic details
- Department/branch
- Passing year
- CGPA
- Backlogs
- Skills
- Certifications
- Projects
- Resume
- Internship history

### FR-STU-003 Profile Verification
Student shall submit profile for verification. T&P shall be able to verify, reject or request correction.

### FR-STU-004 Eligibility
The system shall automatically evaluate company/internship criteria including minimum CGPA, backlogs, branch, passing year, required skills, certifications, experience and company-specific conditions.

The system shall display both:
- `Eligible`
- `Not Eligible`

and the exact reason(s).

Example:
- CGPA below required criterion
- Active backlog not allowed
- Required skill missing
- Branch not accepted

### FR-STU-005 Internship Discovery
Student shall see internships that are open and may view:
- Role
- Company
- Location/mode
- Duration
- Stipend
- Vacancies
- Eligibility
- Skills
- Deadline

### FR-STU-006 Apply
Eligible students shall apply to an internship.

Business rules:
- Ineligible students cannot apply unless an authorized override exists.
- Duplicate applications to the same vacancy are blocked.
- Application closes after deadline.
- Student can withdraw only while policy permits.

### FR-STU-007 Application Tracking
Student shall see status timeline:
`Applied → Under Review → Shortlisted → Selected/Rejected`.

### FR-STU-008 Documents
Student shall upload/view permitted documents such as academic record, resume, acceptance/joining documents and weekly reports.

### FR-STU-009 Progress
Student shall submit weekly reports containing:
- Week number
- Work completed
- Technologies/skills used
- Challenges
- Learning
- Hours/activity if enabled
- Supporting evidence if required

### FR-STU-010 Completion/PPO
Student shall see completion verification and PPO outcome.

## 6. Company Functional Requirements

### FR-CMP-001 Company Profile
Company shall create and maintain:
- Company name
- Website
- Industry
- Description
- Contact person
- Official email
- Verification information

### FR-CMP-002 Vacancy Creation
Company shall create an internship with:
- Job title
- Description
- Duration
- Mode
- Location
- Stipend
- Number of vacancies
- Last date
- Minimum CGPA
- Backlog rule
- Branch/department
- Passing year
- Required skills
- Certifications
- Experience
- Other criteria

### FR-CMP-003 Candidate Matching
System shall first filter by hard eligibility and then optionally rank candidates by matching score.

### FR-CMP-004 Candidate Review
Company shall view permitted candidate information and compare shortlisted candidates.

### FR-CMP-005 Shortlist/Selection
Company shall update candidates to shortlist, select or reject.

### FR-CMP-006 Offer
Company shall issue/upload offer letter for selected candidate(s).

### FR-CMP-007 Intern Monitoring
Company shall view selected interns and relevant progress/status.

### FR-CMP-008 Evaluation
Company shall complete final evaluation.

### FR-CMP-009 Completion/PPO
Company shall upload completion documentation and update PPO decision/status.

## 7. T&P Functional Requirements

### FR-TNP-001 Verification Queue
T&P shall have queues for:
- Student profiles
- Internship/offer verification
- Documents
- Completion

### FR-TNP-002 Verification Decision
T&P can:
- Approve
- Reject
- Request correction

Every decision should store actor, timestamp and reason.

### FR-TNP-003 Mentor Assignment
After internship approval, T&P shall assign a faculty mentor.

### FR-TNP-004 Institution Monitoring
T&P shall view:
- Active internships
- Pending documents
- Delayed reports
- Completion pending
- PPO outcomes

### FR-TNP-005 Completion
T&P shall verify completion only when required documents/evaluations are present.

### FR-TNP-006 Analytics
T&P shall view decision-oriented analytics.

## 8. Mentor Functional Requirements

### FR-MEN-001 Assignment
Mentor shall receive assignment and accept it.

### FR-MEN-002 Assigned Student List
Mentor shall see only assigned students unless authorized otherwise.

### FR-MEN-003 Progress Review
Mentor shall open weekly reports and:
- Approve
- Request changes
- Add feedback

### FR-MEN-004 Issue Tracking
Mentor shall flag students as:
- On Track
- Needs Attention
- Critical

and record issue/remarks.

### FR-MEN-005 Final Evaluation
Mentor shall submit final evaluation and completion recommendation.

## 9. Document Management

Required document types are based on the challenge and finalized product plan:
- College ID
- Academic record
- Resume
- Certifications
- Company verification proof
- Offer letter
- Acceptance letter
- Joining letter
- Weekly progress reports
- Completion certificate
- PPO letter

Mentor/company evaluations may be digital forms.

Each document shall store:
- Type
- Owner
- File reference
- Uploaded time
- Status
- Reviewer
- Review time
- Review comment
- Version

## 10. Notifications

System should notify relevant users when:
- Profile requires correction
- Eligibility is calculated
- Application is shortlisted/selected/rejected
- Offer is issued
- T&P action is pending
- Mentor is assigned
- Weekly report is due/late
- Feedback is added
- Completion is approved
- PPO status changes

## 11. Analytics

Required questions include:
- Applications, selections and completions
- Department/branch distribution
- Companies hiring students
- Internship locations
- Conversion rate
- Skill gaps
- Highest/average/lowest stipend
- PPO recommendations/conversions
- Pending verifications/documents

## 12. Business Rules

1. A student must have a verified profile before applying.
2. Eligibility must be evaluated against the vacancy's criteria.
3. Ineligible students must receive reasons.
4. Only open vacancies accept applications.
5. Company makes the final candidate decision; AI only assists.
6. Selected candidates require an offer before T&P verification.
7. Mentor assignment follows approved internship/offer verification.
8. Mentor sees only assigned students.
9. Completion requires configured final checks.
10. PPO is optional and may be unavailable for an internship.
11. Important approval/rejection actions must be auditable.

## 13. Acceptance Criteria

The MVP is functionally acceptable when a demo can complete:
Registration → Profile → Eligibility → Vacancy → Matching → Application → Selection → Offer → T&P Approval → Mentor Assignment → Weekly Report → Evaluation → Completion → PPO → Analytics.

---

# End of FRD
