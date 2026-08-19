# UI/UX Design Specification
## AI-Powered Internship Management System

---

## 1. Design Objective

Create a clean, modern, responsive and role-specific interface that makes the internship lifecycle understandable at a glance.

The hackathon emphasizes a working prototype and clear user flow. UI should support the workflow rather than overwhelm users with features.

## 2. UX Principles

1. **Role-first:** every user sees only relevant actions.
2. **Status-first:** always show what happens next.
3. **Progressive disclosure:** show summary first, details on demand.
4. **Explain decisions:** eligibility failures and verification rejections need reasons.
5. **Action-oriented dashboards:** every pending item should lead to an action.
6. **Consistent states:** use consistent status labels/icons.
7. **Accessible:** readable text, keyboard support, sufficient contrast and clear form errors.
8. **Responsive:** desktop-first for T&P/company, mobile-friendly for students/mentors.

## 3. Global Navigation

### Student
Dashboard | Internships | Applications | Progress | Documents | Profile | Notifications

### Company
Dashboard | Vacancies | Candidates | Selected Interns | Evaluations | Documents | Company Profile

### T&P
Dashboard | Verifications | Students | Internships | Mentors | Documents | Completion | PPO | Analytics

### Mentor
Dashboard | My Students | Reports | Issues | Evaluations | Notifications

## 4. Global Components

- Top navigation
- Sidebar
- User profile menu
- Notification bell
- Search
- Breadcrumb
- Status badge
- Progress bar
- Data table
- Filter drawer
- Modal
- Confirmation dialog
- File uploader
- Timeline
- Empty state
- Loading skeleton
- Toast
- Error state
- Pagination

## 5. Status Design

Use text + icon, not color alone.

| Status | Meaning |
|---|---|
| Draft | Not submitted |
| Pending | Action/review required |
| Under Review | Being reviewed |
| Verified/Approved | Accepted |
| Correction Required | User must fix something |
| Rejected | Not accepted |
| Ongoing | Internship active |
| Completed | Finished |
| Needs Attention | Progress concern |
| Critical | Immediate attention |

## 6. Student Screens

### 6.1 Registration
Fields:
- Name
- Institutional email
- Student ID
- Password
- Department
- Passing year

### 6.2 Profile
Sections:
- Personal
- Academic
- Skills
- Projects
- Certifications
- Resume
- Links

Show completion percentage.

### 6.3 Eligibility
Hero card:
`Eligible for internships`

or:
`Not Eligible`

Below it show rule results:
- CGPA ✓
- Backlogs ✓
- Branch ✓
- Skills ✕ — Java missing

### 6.4 Internship Marketplace
Cards/table with:
- Company
- Role
- Match score
- Stipend
- Duration
- Mode
- Deadline
- Eligibility
- Apply

Filters:
- Skill
- Stipend
- Mode
- Duration
- Company
- Match score

### 6.5 Internship Detail
Sections:
- Overview
- Responsibilities
- Skills
- Eligibility
- Stipend
- Duration
- Company
- Deadline

Primary CTA:
`Apply Now`

### 6.6 Application Tracker
Timeline:
`Applied → Review → Shortlisted → Selected`

### 6.7 Internship Progress
Show:
- Current week
- Overall progress
- Reports submitted
- Mentor feedback
- Company feedback
- Pending actions

### 6.8 Documents
Document cards with status and upload/view actions.

### 6.9 PPO
Show:
- PPO status
- Company
- Role
- Offer date
- Letter if available

## 7. Company Screens

### 7.1 Company Dashboard
Cards:
- Active vacancies
- Applications
- Shortlisted
- Selected
- Ongoing interns
- Pending evaluations

### 7.2 Create Vacancy
Use multi-step form:
1. Basic information
2. Role description
3. Eligibility
4. Skills
5. Internship details
6. Review & publish

### 7.3 Candidate Matching
Show:
- Match score
- Eligibility status
- Skill overlap
- Relevant projects
- CGPA
- Certifications

Filters and sorting should be visible.

### 7.4 Candidate Detail
Show only permitted candidate data:
- Profile
- Skills
- Projects
- Resume
- Eligibility
- Match explanation

Actions:
`Shortlist`, `Reject`, `Select`

### 7.5 Selected Intern
Show:
- Offer status
- Joining status
- Progress
- Evaluation
- Completion
- PPO

## 8. T&P Screens

### 8.1 T&P Dashboard
High-level cards:
- Students
- Active internships
- Pending verification
- Pending documents
- Completion pending
- PPOs

### 8.2 Verification Queue
Table:
Student | Company | Role | Document | Status | Submitted | Action

Actions:
`Approve`, `Reject`, `Request Correction`

### 8.3 Verification Detail
Show source information, document preview and validation checklist.

### 8.4 Mentor Assignment
Show unassigned approved internships and mentor capacity.

### 8.5 Monitoring
Filters:
- Department
- Company
- Mentor
- Status
- Delayed report

### 8.6 Analytics
Charts should answer real questions:
- Applications → selections → completions
- Department distribution
- Company hiring
- Stipend distribution
- PPO conversion
- Skill gaps
- Pending documents

## 9. Mentor Screens

### Dashboard
Cards:
- Assigned students
- On track
- Needs attention
- Critical
- Pending reports
- Evaluations

### Assigned Students
Table/card:
Student | Company | Week | Progress | Last report | Status

### Weekly Report Review
Show:
- Tasks
- Learning
- Challenges
- Evidence
- Previous feedback

Actions:
`Approve`, `Request Changes`, `Add Feedback`, `Flag Issue`

### Final Evaluation
Rubric:
- Technical skills
- Problem solving
- Communication
- Professionalism
- Teamwork
- Overall performance

## 10. Information Architecture

```text
App
├── Authentication
├── Dashboard
├── Profile
├── Internships
├── Applications
├── Selection
├── Offers
├── Verification
├── Mentor Assignment
├── Progress
├── Evaluations
├── Documents
├── Completion
├── PPO
├── Notifications
└── Analytics
```

## 11. UX for Eligibility Explanation

Never show only “Not Eligible.”

Use:
```text
Not Eligible

✕ CGPA
Required: 8.0
Your CGPA: 7.6

✓ Branch
✓ Passing Year
✓ Backlogs

Improve:
Focus on opportunities with CGPA ≤ 7.6
```

## 12. UX for AI Matching

Example:
```text
92% Match

Skill Match       95%
Academic Fit      100%
Project Relevance 90%
Preference Fit    85%

Why recommended:
Strong Java + SQL skills and relevant backend project.

[View Details] [Apply]
```

The UI must make clear that the company retains the final selection decision.

## 13. Responsive Rules

Desktop:
- Sidebar + content
- Data tables
- Multi-column analytics

Tablet:
- Collapsible sidebar
- Two-column cards

Mobile:
- Bottom navigation or compact drawer
- Cards instead of wide tables
- Sticky primary CTA
- Upload/report forms optimized for touch

## 14. Accessibility

- Semantic HTML
- Keyboard navigation
- Focus states
- Labels for form fields
- Error messages connected to inputs
- No color-only meaning
- Accessible file upload
- Responsive text
