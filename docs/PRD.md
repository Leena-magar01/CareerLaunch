# AI-Powered Internship Management System — PRD

## 1. Product Overview
A role-based Internship Management System that centralizes the complete internship lifecycle for Students, Companies, Training & Placement (T&P), and Faculty Mentors.

**Core lifecycle:** Student → Company → T&P → Faculty Mentor → Completion → PPO → Analytics.

## 2. Problem Statement
Internship management is often fragmented across forms, emails, spreadsheets, messages, and documents. This creates repeated data entry, difficulty checking eligibility, unclear application status, document-management problems, limited mentor/T&P visibility, and weak institutional analytics.

The product should reduce manual work, automate eligibility checking, help companies find suitable students, track internships from application through completion, organize approvals/documents, provide real-time status, and turn internship data into useful insights.

## 3. Product Vision
Build a practical platform that a real college can use to manage internships from registration to PPO.

**Value proposition:** Verify → Match → Apply → Select → Track → Evaluate → Complete → Convert → Analyze.

## 4. Users & Goals

| User | Goal | Responsibilities |
|---|---|---|
| Student | Get the right internship and complete it successfully | Profile, eligibility, discovery, application, progress, completion, PPO |
| Company | Find and select suitable student talent | Vacancy, criteria, matching, review, selection, offer, evaluation, PPO |
| T&P | Ensure internships are authentic, approved and tracked | Verification, approval, mentor assignment, monitoring, completion, PPO, analytics |
| Faculty Mentor | Guide students and ensure progress | Assigned students, weekly reports, feedback, issue tracking, final evaluation |

## 5. End-to-End Workflow

```text
👨‍🎓 STUDENT
    ↓
Build Profile
    ↓
Eligibility
    ↓
🏢 COMPANY
    ↓
Create Vacancy
    ↓
Define Criteria
    ↓
Eligible / Matched Students
    ↓
Application
    ↓
Review / Shortlist
    ↓
Selection
    ↓
Offer Letter
    ↓
🎓 T&P
    ↓
Verification
    ↓
Approve / Reject
    ↓
Mentor Assignment
    ↓
👨‍🏫 MENTOR
    ↓
Weekly Progress
    ↓
Feedback
    ↓
Issue Tracking
    ↓
Evaluation
    ↓
Internship Completion
    ↓
Completion Certificate
    ↓
PPO
    ↓
🎓 T&P Analytics
```

## 6. Functional Requirements

### 6.1 Student
- Registration/login
- Student profile
- Academic details, CGPA, backlog status
- Skills, projects, certifications
- Resume
- Profile verification
- Eligibility status with reasons
- Internship discovery
- AI-recommended internships
- Application
- Application status tracking
- Offer/acceptance/joining documents
- Weekly progress reports
- Completion status
- PPO status

### 6.2 Company
- Company profile
- Company verification
- Create internship vacancy
- Define eligibility and role requirements
- Specify duration, mode, stipend, vacancies and deadline
- View eligible/matched candidates
- Candidate ranking
- Candidate review
- Shortlisting
- Selection
- Offer-letter upload/issue
- Internship monitoring
- Company evaluation
- Completion document
- PPO status

### 6.3 T&P
- Student/profile verification
- Internship/offer verification
- Approve/reject/request correction
- Mentor assignment
- Institution-wide internship monitoring
- Document tracking
- Completion verification
- PPO recording
- Institutional analytics

### 6.4 Faculty Mentor
- View assigned students
- Accept assignment
- View internship details
- Review weekly reports
- Approve/request changes
- Feedback
- Issue identification
- Final evaluation
- Completion recommendation

## 7. Eligibility Engine
The system should evaluate configurable criteria such as:
- CGPA
- Backlogs
- Department/branch
- Passing year
- Required skills
- Certifications
- Experience
- Company-specific criteria

The system should explain why a student is ineligible.

## 8. AI Features

### AI Candidate Matching
Company requirements → eligibility filter → AI matching/ranking → recommended candidates → company decision.

### AI Internship Recommendation
Student profile + skills + academic criteria + preferences → recommended internships with match scores and explanations.

### AI Skill-Gap Analysis
Student skills vs internship requirements → missing skills → recommended learning path.

### AI Resume Analyzer
Resume → skills/projects/experience analysis → score + actionable improvements.

### AI Internship Copilot
Context-aware assistant for eligibility, application status, missing documents, reports and skill gaps.

### QR Offer Verification
After T&P approval, generate a verification ID/QR code linked to a public verification page with limited information.

## 9. Document Management

| Document | Owner | Purpose |
|---|---|---|
| College ID | Student | Identity/profile verification |
| Academic Record | Student | Eligibility |
| Resume | Student | Candidate profile |
| Certifications | Student | Skill evidence |
| Company Verification Proof | Company | Company verification |
| Offer Letter | Company | Selection/T&P verification |
| Acceptance Letter | Student | Acceptance |
| Joining Letter | Student/Company | Joining confirmation |
| Weekly Progress Reports | Student | Tracking |
| Mentor Evaluation | Mentor | Performance evaluation |
| Company Evaluation | Company | Performance evaluation |
| Completion Certificate | Company | Completion proof |
| PPO Letter | Company | PPO outcome |

Document statuses: **Pending, Under Review, Verified, Rejected, Correction Required**.

## 10. Dashboards

### Student
Profile completion, eligibility, recommended internships, applications, progress, documents, reports, evaluation, PPO.

### Company
Vacancies, applications, eligible candidates, candidate ranking, shortlisted/selected candidates, offers, interns, evaluations, PPO.

### T&P
Pending verifications, approved/rejected internships, active internships, missing documents, mentor assignments, completion verification, PPO, analytics.

### Mentor
Assigned students, progress, pending reports, feedback queue, students needing attention, final evaluations.

## 11. Analytics
The T&P dashboard should answer:
- How many students applied, were selected and completed internships?
- Which departments have the most internships?
- Which companies hired students?
- Where are students getting internships?
- What is the internship conversion rate?
- What skills are missing?
- What are stipend statistics?
- How many PPOs were offered/converted?
- Which documents/verifications are pending?

## 12. Data Model
Core entities:
`User`, `Student`, `Company`, `Faculty/Mentor`, `Internship`, `Eligibility`, `Application`, `Selection`, `OfferLetter`, `Verification`, `MentorAssignment`, `ProgressReport`, `Evaluation`, `Document`, `Completion`, `PPO`, `Notification`.

Key relationships:
- Student applies to Internship
- Company posts Internship
- Company selects Student
- Company issues Offer
- T&P verifies Offer/Internship
- T&P assigns Mentor
- Student submits Progress Reports
- Mentor and Company evaluate Student
- Company submits Completion Certificate
- Company updates PPO
- T&P records/validates institutional outcome

## 13. Initial API Plan

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/student/profile` | Get profile |
| PUT | `/api/student/profile` | Update profile |
| GET | `/api/student/eligibility` | Eligibility |
| GET | `/api/internships` | List internships |
| POST | `/api/internships` | Create vacancy |
| POST | `/api/internships/:id/apply` | Apply |
| GET | `/api/company/applications` | Applications |
| POST | `/api/company/select/:studentId` | Select candidate |
| POST | `/api/offers` | Create/upload offer |
| POST | `/api/tnp/verify-offer` | Verify offer |
| POST | `/api/mentor/assign` | Assign mentor |
| POST | `/api/progress` | Submit report |
| POST | `/api/evaluation` | Submit evaluation |
| GET | `/api/analytics` | Analytics |

## 14. UI Screen Plan

**Common:** Landing, Login, Registration, Forgot Password.

**Student:** Dashboard, Profile, Eligibility, Internship Marketplace, Internship Details, Applications, Tracking, Documents, Weekly Reports, Evaluation, PPO.

**Company:** Dashboard, Company Profile, Create Vacancy, Applications, Candidate Ranking, Candidate Details, Selected Interns, Evaluation, PPO.

**T&P:** Dashboard, Student Verification, Internship Verification, Documents, Mentor Assignment, Monitoring, Completion Verification, PPO, Analytics.

**Mentor:** Dashboard, Assigned Students, Student Details, Weekly Reports, Feedback, Issues, Final Evaluation.

## 15. Security
- Role-based access control
- Protected student/company documents
- Input and upload validation
- Audit information for approval/rejection
- Privacy-preserving public verification
- Safe sample/demo data

## 16. MVP Priorities

### P0 — Must Work
Login/roles, student profile, eligibility engine, vacancy, application, shortlist/selection, offer, T&P verification, mentor assignment, weekly progress, evaluation, completion, PPO, database, useful dashboard.

### P1 — High Value
AI matching, AI internship recommendation, AI skill-gap analysis, QR offer verification, resume analyzer.

### P2 — Nice to Have
AI chat assistant, automated notifications, attendance, certificate verification, advanced analytics, mobile integration.

## 17. Demo Flow
Use one student journey:
1. Student registers.
2. Profile is completed.
3. Eligibility engine verifies the student.
4. Company posts an internship.
5. System filters/ranks candidates.
6. Student applies.
7. Company selects student.
8. Offer letter is issued.
9. T&P verifies and approves.
10. Mentor is assigned.
11. Student submits weekly progress.
12. Mentor reviews and gives feedback.
13. Mentor/company complete evaluations.
14. Company uploads completion certificate.
15. T&P verifies completion.
16. Company updates PPO.
17. T&P analytics update.

## 18. Success Criteria
- Complete lifecycle can be demonstrated end-to-end.
- Each role has appropriate permissions.
- Eligibility produces understandable results.
- Application and selection status are traceable.
- T&P can verify offers/documents.
- Mentor can monitor progress.
- Completion and PPO are recorded.
- At least one AI feature works meaningfully.
- Analytics provide actionable institutional insight.
- UI is clear and usable.

## 19. Development Folder

```text
Internship-Management-System/
├── 01_PRD/
├── 02_Roles/
├── 03_User_Flows/
├── 04_Database/
├── 05_UI_UX/
├── 06_API/
├── 07_AI/
├── 08_Demo/
└── README.md
```

## 20. Final Product Principle
Do not build disconnected features just to increase feature count. Build one convincing, working journey:

**Register → Verify → Match → Apply → Select → Approve → Mentor → Track → Evaluate → Complete → PPO → Analyze.**
