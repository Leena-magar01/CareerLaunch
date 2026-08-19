# API Specification
## AI-Powered Internship Management System

**Base URL:** `/api/v1`

---

## 1. API Conventions

### Authentication
Use:
`Authorization: Bearer <access_token>`

### Response
Success:
```json
{
  "success": true,
  "data": {}
}
```

Error:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  }
}
```

### Pagination
```text
?page=1&pageSize=20&sort=createdAt&order=desc
```

## 2. Authentication

### POST /auth/register
Register user.

Request:
```json
{
  "email": "student@example.com",
  "password": "********",
  "role": "STUDENT"
}
```

### POST /auth/login
Returns access/refresh credentials.

### POST /auth/logout
Invalidates session/refresh token.

### POST /auth/forgot-password
Starts reset flow.

## 3. Student APIs

### GET /students/me
Returns current student profile.

### PUT /students/me
Updates profile.

### POST /students/me/submit-verification
Submits profile for T&P review.

### GET /students/me/eligibility
Returns current eligibility status.

Example:
```json
{
  "eligible": false,
  "reasons": [
    {
      "rule": "MIN_CGPA",
      "required": 8.0,
      "actual": 7.6,
      "message": "CGPA below required criteria"
    }
  ]
}
```

### GET /students/me/recommendations
Returns recommended internships.

### GET /internships
Public/authenticated internship discovery with filters.

### GET /internships/:id
Returns internship details.

### POST /internships/:id/applications
Creates application.

### GET /students/me/applications
Returns student's applications.

### PATCH /applications/:id/withdraw
Withdraws application if allowed.

### GET /students/me/progress
Returns progress timeline.

### POST /internships/:id/progress-reports
Creates weekly report.

## 4. Company APIs

### GET /companies/me
Company profile.

### PUT /companies/me
Update company profile.

### POST /companies/me/verification
Submit verification.

### POST /internships
Create vacancy.

### PUT /internships/:id
Update vacancy.

### POST /internships/:id/publish
Publish vacancy.

### POST /internships/:id/close
Close vacancy.

### GET /companies/me/internships
Company vacancies.

### GET /internships/:id/applications
List candidates.

Filters:
`status, skills, minCgpa, matchScore`

### GET /applications/:id
Candidate/application detail.

### PATCH /applications/:id/status
Shortlist/reject.

### POST /applications/:id/select
Select candidate.

### POST /applications/:id/offer
Issue offer.

### POST /internships/:id/evaluations
Company evaluation.

### POST /internships/:id/completion-document
Upload completion document.

### PATCH /internships/:id/ppo
Update PPO status.

## 5. T&P APIs

### GET /tnp/verification-queue
Pending verification records.

### GET /tnp/verifications/:id
Verification detail.

### POST /tnp/verifications/:id/approve
Approve.

### POST /tnp/verifications/:id/reject
Reject with reason.

### POST /tnp/verifications/:id/request-correction
Request correction.

### POST /tnp/mentor-assignments
Assign mentor.

Request:
```json
{
  "studentId": "...",
  "internshipId": "...",
  "mentorId": "..."
}
```

### GET /tnp/internships
Institution-wide internship monitoring.

### POST /tnp/completions/:id/verify
Verify completion.

### GET /tnp/analytics/overview
Institutional analytics.

## 6. Mentor APIs

### GET /mentors/me/assignments
Assigned students.

### POST /mentor-assignments/:id/accept
Accept assignment.

### GET /mentor-assignments/:id/student
Assigned student details.

### GET /mentor-assignments/:id/reports
Weekly reports.

### PATCH /progress-reports/:id/review
Approve/request changes.

Request:
```json
{
  "status": "CHANGES_REQUIRED",
  "feedback": "Please add evidence for the API testing task."
}
```

### POST /internships/:id/issues
Create issue.

### PATCH /issues/:id
Update issue.

### POST /internships/:id/mentor-evaluation
Submit final evaluation.

## 7. Document APIs

### POST /documents/upload
Upload document.

Recommended flow:
1. Request upload permission.
2. Upload to object storage.
3. Confirm upload.
4. Store metadata.

### GET /documents/:id
Metadata/authorized access.

### POST /documents/:id/review
Reviewer decision.

## 8. Notification APIs

### GET /notifications
List notifications.

### PATCH /notifications/:id/read
Mark as read.

## 9. Analytics APIs

### GET /analytics/applications
Application funnel.

### GET /analytics/departments
Department distribution.

### GET /analytics/companies
Company hiring.

### GET /analytics/stipends
Stipend statistics.

### GET /analytics/ppo
PPO statistics.

### GET /analytics/skill-gaps
Skill-gap statistics.

### GET /analytics/pending-actions
Pending verification/documents.

## 10. AI APIs

### POST /ai/match
Rank candidates against internship.

### GET /ai/recommendations
Student internship recommendations.

### POST /ai/skill-gap
Compare profile with internship.

### POST /ai/resume-analyze
Analyze resume.

### POST /ai/copilot
Contextual assistant request.

AI endpoints must respect the authenticated user's permissions.

## 11. QR Verification

### GET /verify/offer/:verificationCode
Public-safe verification page/API.

Response:
```json
{
  "verified": true,
  "studentName": "T. B.",
  "company": "Example Technologies",
  "role": "Software Developer Intern",
  "duration": "3 months",
  "verifiedBy": "T&P Department"
}
```

Do not expose private academic data.

## 12. HTTP Status Codes

- 200 OK
- 201 Created
- 204 No Content
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 422 Validation Error
- 429 Rate Limited
- 500 Internal Server Error

## 13. API Security

- Authentication on protected routes
- RBAC authorization
- Ownership checks
- Input validation
- Rate limiting
- File validation
- Audit important actions
- Never trust role sent by client
