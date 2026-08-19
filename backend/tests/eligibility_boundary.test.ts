import { checkEligibility } from '../src/services/eligibilityService';

describe('Phase 6: Deterministic Eligibility Engine - Boundary & Multi-Factor Tests', () => {
  const baseStudent = {
    cgpa: 8.0,
    backlogs: 0,
    department: 'CSE',
    passingYear: 2026,
    skills: ['Java', 'SQL', 'React'],
    documents: [{ documentType: 'RESUME' }, { documentType: 'COLLEGE_ID' }],
    resumeDocumentId: 'doc-resume-uuid-101',
    profileStatus: 'VERIFIED'
  };

  const baseInternship = {
    minCgpa: 7.5,
    maxBacklogs: 0,
    allowedBranches: ['CSE', 'IT'],
    passingYears: [2026, 2027],
    requiredSkills: ['Java', 'SQL']
  };

  // 1. CGPA BOUNDARY TESTS
  describe('CGPA Boundary Evaluation', () => {
    it('should PASS when CGPA is EXACTLY at the threshold (7.50 vs 7.50)', () => {
      const result = checkEligibility({
        student: { ...baseStudent, cgpa: 7.5 },
        internship: { ...baseInternship, minCgpa: 7.5 }
      });

      expect(result.eligible).toBe(true);
      expect(result.status).toBe('ELIGIBLE');
      expect(result.ruleBreakdown['CGPA'].passed).toBe(true);
      expect(result.reasons).toContainEqual(expect.stringContaining('CGPA satisfied'));
    });

    it('should FAIL when CGPA is slightly below threshold (7.49 vs 7.50)', () => {
      const result = checkEligibility({
        student: { ...baseStudent, cgpa: 7.49 },
        internship: { ...baseInternship, minCgpa: 7.5 }
      });

      expect(result.eligible).toBe(false);
      expect(result.status).toBe('NOT_ELIGIBLE');
      expect(result.failedRules.some(r => r.rule === 'MIN_CGPA')).toBe(true);
      expect(result.reasons).toContainEqual(expect.stringContaining('CGPA below required threshold'));
    });

    it('should PASS when CGPA is slightly above threshold (7.51 vs 7.50)', () => {
      const result = checkEligibility({
        student: { ...baseStudent, cgpa: 7.51 },
        internship: { ...baseInternship, minCgpa: 7.5 }
      });

      expect(result.eligible).toBe(true);
      expect(result.status).toBe('ELIGIBLE');
      expect(result.ruleBreakdown['CGPA'].passed).toBe(true);
    });

    it('should PASS when minimum CGPA is 0.0 (open to all)', () => {
      const result = checkEligibility({
        student: { ...baseStudent, cgpa: 5.2 },
        internship: { ...baseInternship, minCgpa: 0.0 }
      });

      expect(result.eligible).toBe(true);
    });
  });

  // 2. BACKLOGS BOUNDARY TESTS
  describe('Backlogs Boundary Evaluation', () => {
    it('should PASS when backlogs are EXACTLY at the limit of 0 (0 vs 0)', () => {
      const result = checkEligibility({
        student: { ...baseStudent, backlogs: 0 },
        internship: { ...baseInternship, maxBacklogs: 0 }
      });

      expect(result.eligible).toBe(true);
      expect(result.ruleBreakdown['BACKLOGS'].passed).toBe(true);
    });

    it('should FAIL when student has 1 backlog and maxBacklogs is 0', () => {
      const result = checkEligibility({
        student: { ...baseStudent, backlogs: 1 },
        internship: { ...baseInternship, maxBacklogs: 0 }
      });

      expect(result.eligible).toBe(false);
      expect(result.failedRules.some(r => r.rule === 'MAX_BACKLOGS')).toBe(true);
      expect(result.reasons).toContainEqual(expect.stringContaining('Backlogs exceed allowed limit'));
    });

    it('should PASS when student has 2 backlogs and maxBacklogs is EXACTLY 2 (2 vs 2)', () => {
      const result = checkEligibility({
        student: { ...baseStudent, backlogs: 2 },
        internship: { ...baseInternship, maxBacklogs: 2 }
      });

      expect(result.eligible).toBe(true);
      expect(result.ruleBreakdown['BACKLOGS'].passed).toBe(true);
    });

    it('should FAIL when student has 3 backlogs and maxBacklogs is 2', () => {
      const result = checkEligibility({
        student: { ...baseStudent, backlogs: 3 },
        internship: { ...baseInternship, maxBacklogs: 2 }
      });

      expect(result.eligible).toBe(false);
      expect(result.failedRules.some(r => r.rule === 'MAX_BACKLOGS')).toBe(true);
    });
  });

  // 3. DEPARTMENT / BRANCH BOUNDARY TESTS
  describe('Department / Branch Evaluation', () => {
    it('should PASS when student department is in allowed list', () => {
      const result = checkEligibility({
        student: { ...baseStudent, department: 'IT' },
        internship: { ...baseInternship, allowedBranches: ['CSE', 'IT'] }
      });

      expect(result.eligible).toBe(true);
      expect(result.reasons).toContainEqual(expect.stringContaining('Department satisfied'));
    });

    it('should FAIL when student department is NOT in allowed list (MECH vs [CSE, IT])', () => {
      const result = checkEligibility({
        student: { ...baseStudent, department: 'MECH' },
        internship: { ...baseInternship, allowedBranches: ['CSE', 'IT'] }
      });

      expect(result.eligible).toBe(false);
      expect(result.failedRules.some(r => r.rule === 'ALLOWED_BRANCHES')).toBe(true);
      expect(result.reasons).toContainEqual(expect.stringContaining("Department not eligible: Branch 'MECH'"));
    });

    it('should PASS with case-insensitive matching (cse matching CSE)', () => {
      const result = checkEligibility({
        student: { ...baseStudent, department: 'cse' },
        internship: { ...baseInternship, allowedBranches: ['CSE', 'IT'] }
      });

      expect(result.eligible).toBe(true);
    });

    it('should PASS for any department when allowedBranches includes "ALL"', () => {
      const result = checkEligibility({
        student: { ...baseStudent, department: 'CIVIL' },
        internship: { ...baseInternship, allowedBranches: ['ALL'] }
      });

      expect(result.eligible).toBe(true);
    });
  });

  // 4. PASSING YEAR TESTS
  describe('Graduation Batch Evaluation', () => {
    it('should PASS when passing year matches', () => {
      const result = checkEligibility({
        student: { ...baseStudent, passingYear: 2026 },
        internship: { ...baseInternship, passingYears: [2026, 2027] }
      });

      expect(result.eligible).toBe(true);
      expect(result.reasons).toContainEqual(expect.stringContaining('Academic year satisfied'));
    });

    it('should FAIL when passing year is not in allowed batches', () => {
      const result = checkEligibility({
        student: { ...baseStudent, passingYear: 2025 },
        internship: { ...baseInternship, passingYears: [2026, 2027] }
      });

      expect(result.eligible).toBe(false);
      expect(result.failedRules.some(r => r.rule === 'PASSING_YEAR')).toBe(true);
    });
  });

  // 5. REQUIRED SKILLS TESTS
  describe('Required Skills Evaluation', () => {
    it('should PASS when all required skills are present', () => {
      const result = checkEligibility({
        student: { ...baseStudent, skills: ['Java', 'SQL', 'Docker'] },
        internship: { ...baseInternship, requiredSkills: ['Java', 'SQL'] }
      });

      expect(result.eligible).toBe(true);
      expect(result.reasons).toContainEqual(expect.stringContaining('Required skills satisfied'));
    });

    it('should FAIL when a required skill is missing', () => {
      const result = checkEligibility({
        student: { ...baseStudent, skills: ['Java'] },
        internship: { ...baseInternship, requiredSkills: ['Java', 'SQL', 'Spring Boot'] }
      });

      expect(result.eligible).toBe(false);
      expect(result.failedRules.some(r => r.rule === 'REQUIRED_SKILLS')).toBe(true);
      expect(result.reasons).toContainEqual(expect.stringContaining('Missing required skills: Candidate is missing [SQL, Spring Boot]'));
    });
  });

  // 6. REQUIRED DOCUMENTS TESTS
  describe('Required Documents Evaluation', () => {
    it('should PASS when mandatory document (RESUME) is uploaded', () => {
      const result = checkEligibility({
        student: { ...baseStudent, resumeDocumentId: 'doc-123' },
        internship: { ...baseInternship, requiredDocuments: ['RESUME'] }
      });

      expect(result.eligible).toBe(true);
      expect(result.reasons).toContainEqual(expect.stringContaining('Required documents satisfied'));
    });

    it('should FAIL when mandatory document (COLLEGE_ID) is missing', () => {
      const result = checkEligibility({
        student: { ...baseStudent, documents: [] },
        internship: { ...baseInternship, requiredDocuments: ['COLLEGE_ID'] }
      });

      expect(result.eligible).toBe(false);
      expect(result.failedRules.some(r => r.rule === 'REQUIRED_DOCUMENTS')).toBe(true);
      expect(result.reasons).toContainEqual(expect.stringContaining('Missing required document(s): [COLLEGE_ID]'));
    });
  });

  // 7. INSTITUTIONAL PROFILE STATUS VERIFICATION POLICY
  describe('Institutional Verification Policy Rule', () => {
    it('should PASS when verified profile is required and student is VERIFIED', () => {
      const result = checkEligibility({
        student: { ...baseStudent, profileStatus: 'VERIFIED' },
        internship: { ...baseInternship, requireVerifiedProfile: true }
      });

      expect(result.eligible).toBe(true);
      expect(result.reasons).toContainEqual(expect.stringContaining('Profile verification satisfied'));
    });

    it('should FAIL when verified profile is required but student is in DRAFT status', () => {
      const result = checkEligibility({
        student: { ...baseStudent, profileStatus: 'DRAFT' },
        internship: { ...baseInternship, requireVerifiedProfile: true }
      });

      expect(result.eligible).toBe(false);
      expect(result.failedRules.some(r => r.rule === 'PROFILE_STATUS')).toBe(true);
      expect(result.reasons).toContainEqual(expect.stringContaining('Profile verification required'));
    });
  });
});
