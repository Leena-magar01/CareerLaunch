# AI Requirements & Design Document
## AI-Powered Internship Management System

---

## 1. AI Objective

Use AI only where it provides measurable value: recommendation, matching, explanation, resume improvement, skill-gap analysis and contextual assistance.

The hackathon guide explicitly lists AI-based company recommendation, AI resume scoring/improvement, AI skill-gap analysis and chat support as possible innovations, and also suggests QR offer verification, digital logbook, progress/attendance tracking and automated certificate verification. It emphasizes that a small feature that works well is better than many impressive-sounding features that do not work.

## 2. AI Principles

1. AI assists; it does not make irreversible hiring decisions.
2. Hard eligibility remains deterministic.
3. Recommendations should be explainable.
4. User data must be protected.
5. AI failures must not break core workflows.
6. Store model/version information for reproducibility.
7. Avoid unnecessary sensitive attributes.
8. Give users a way to correct profile data.

## 3. AI Feature Priority

### P1
- Candidate matching
- Internship recommendation
- Skill-gap analysis

### P1/P2
- Resume analyzer

### P2
- Internship copilot
- Automated document/certificate assistance

## 4. AI Candidate Matching

### Objective
Help companies find suitable candidates faster after hard eligibility filtering.

### Pipeline

```text
Company Requirements
        ↓
Deterministic Eligibility
        ↓
Eligible Candidates
        ↓
Feature Extraction
        ↓
Scoring / Embedding Similarity
        ↓
AI Explanation
        ↓
Ranked Candidate List
        ↓
Company Final Decision
```

### Suggested scoring
Use a transparent weighted score, for example:
- Skill match: 40%
- Relevant project match: 20%
- Academic fit: 15%
- Certification/experience: 10%
- Preference/role fit: 15%

Weights should be configurable.

### Output
```json
{
  "candidateId": "...",
  "matchScore": 92,
  "factors": {
    "skills": 95,
    "projects": 90,
    "academic": 100,
    "preferences": 85
  },
  "explanation": "Strong Java and SQL skills with a relevant backend project."
}
```

AI must not rank a candidate as eligible when deterministic criteria fail.

## 5. AI Internship Recommendation

### Inputs
- Student skills
- Projects
- CGPA/academic fit
- Certifications
- Preferences
- Past applications
- Internship criteria

### Output
Top recommended internships:
- Match score
- Why recommended
- Missing requirements
- Apply CTA

### Example
`92% Match — Strong Java + SQL skills and relevant backend project.`

## 6. AI Skill-Gap Analysis

### Objective
Tell students what they should learn to become suitable for an internship.

### Pipeline
```text
Student Profile
     +
Internship Requirements
     ↓
Skill Comparison
     ↓
Missing Skills
     ↓
Priority
     ↓
Learning Recommendations
```

Output:
```json
{
  "missingSkills": [
    {"skill": "Spring Boot", "priority": "HIGH"},
    {"skill": "Docker", "priority": "MEDIUM"}
  ],
  "recommendations": [
    "Learn REST API development with Spring Boot",
    "Build and containerize one backend project"
  ]
}
```

## 7. AI Resume Analyzer

### Input
PDF/DOCX resume text.

### Analyze
- Skills
- Projects
- Experience
- Keywords
- Clarity
- Role alignment
- Missing evidence

### Output
- Score
- Strengths
- Weaknesses
- Suggested improvements
- Missing keywords based on selected internship

Do not claim a resume score is an objective measure of employability.

## 8. AI Internship Copilot

### Supported questions
- Am I eligible?
- Why am I not eligible?
- What internships match my profile?
- What documents are pending?
- What is my application status?
- What should I include in my weekly report?
- What skills am I missing?

### Architecture
```text
User
 ↓
Permission Check
 ↓
Retrieve allowed platform data
 ↓
Context Builder
 ↓
LLM
 ↓
Grounded Answer
```

The copilot must not reveal another user's private data.

## 9. Prompting Strategy

Prompts should:
- Define role
- Define task
- Provide structured context
- Require concise explanation
- Require JSON for machine-consumed outputs
- State prohibited actions

Example system instruction:
```text
You are an internship matching assistant.
Never override deterministic eligibility rules.
Use only the candidate and internship information provided.
Return a match explanation based on observable criteria.
Do not infer protected or sensitive personal attributes.
```

## 10. Hallucination Control

- Use structured database values as source of truth.
- Do not let AI invent eligibility criteria.
- Validate AI-generated structured outputs.
- Show source factors behind recommendations.
- If information is missing, say it is missing.
- Fall back to deterministic logic.

## 11. AI Evaluation

### Matching
Measure:
- Precision of top recommendations
- Human reviewer agreement
- Explanation usefulness

### Recommendations
Measure:
- Click-through rate
- Application rate
- User feedback

### Skill gap
Measure:
- Relevance of identified missing skills
- Student usefulness feedback

### Resume
Measure:
- Human-rated usefulness of suggestions

For hackathon MVP, human evaluation with sample data is acceptable.

## 12. AI Data Security

- Do not send unnecessary personal information to an external AI provider.
- Minimize document content.
- Redact data where possible.
- Do not expose passwords/tokens.
- Define retention policy.
- Log model/version and request purpose rather than sensitive raw prompts where possible.

## 13. AI Failure Handling

If AI service fails:
- Candidate matching falls back to rule-based/weighted scoring.
- Internship recommendation falls back to filters and deterministic ranking.
- Skill-gap feature shows unavailable state.
- Copilot returns a controlled error.
- Core internship workflow remains usable.

## 14. Recommended Hackathon AI Demo

The strongest single AI demo is:

```text
Company creates:
Software Developer Internship
Required: Java, SQL, Spring Boot

       ↓

System filters:
124 eligible students

       ↓

AI Matching:
Top 10 candidates

       ↓

Candidate card:
92% Match
Java ✓
SQL ✓
Spring Boot ✓
Backend Project ✓

Why:
"Strong backend skills and relevant project."

       ↓

Company selects candidate
```

This directly improves the core workflow instead of adding unrelated AI.
