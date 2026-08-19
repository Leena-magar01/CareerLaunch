import { checkEligibility } from '../src/services/eligibilityService';

describe('Deterministic Eligibility Engine Service', () => {
  it('should pass eligibility when all student criteria are satisfied', () => {
    const result = checkEligibility({
      student: {
        cgpa: 8.5,
        backlogs: 0,
        department: 'CSE',
        passingYear: 2026,
        skills: ['Java', 'SQL']
      },
      internship: {
        minCgpa: 7.5,
        maxBacklogs: 0,
        allowedBranches: ['CSE', 'IT'],
        passingYears: [2026, 2027],
        requiredSkills: ['Java', 'SQL']
      }
    });

    expect(result.eligible).toBe(true);
    expect(result.score).toBe(100);
    expect(result.failedRules.length).toBe(0);
  });

  it('should fail eligibility when student CGPA is below minimum threshold', () => {
    const result = checkEligibility({
      student: {
        cgpa: 6.8,
        backlogs: 0,
        department: 'CSE',
        passingYear: 2026,
        skills: ['Java']
      },
      internship: {
        minCgpa: 7.5,
        maxBacklogs: 0,
        allowedBranches: ['CSE'],
        passingYears: [2026],
        requiredSkills: ['Java']
      }
    });

    expect(result.eligible).toBe(false);
    expect(result.failedRules.some(r => r.rule === 'MIN_CGPA')).toBe(true);
  });

  it('should fail eligibility when student has active backlogs exceeding maximum allowed', () => {
    const result = checkEligibility({
      student: {
        cgpa: 8.0,
        backlogs: 2,
        department: 'IT',
        passingYear: 2026,
        skills: ['React']
      },
      internship: {
        minCgpa: 7.0,
        maxBacklogs: 0,
        allowedBranches: ['IT'],
        passingYears: [2026],
        requiredSkills: ['React']
      }
    });

    expect(result.eligible).toBe(false);
    expect(result.failedRules.some(r => r.rule === 'MAX_BACKLOGS')).toBe(true);
  });
});
