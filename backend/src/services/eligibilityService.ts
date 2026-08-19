export interface StudentEligibilityData {
  cgpa: number;
  backlogs: number;
  department: string;
  passingYear: number;
  skills: Array<string | { skillName: string }>;
  documents?: Array<{ documentType: string; status?: string }> | string[];
  experiences?: Array<any> | number;
  profileStatus?: string;
  resumeDocumentId?: string | null;
}

export interface InternshipEligibilityCriteria {
  minCgpa?: number;
  maxBacklogs?: number;
  allowedBranches?: string[] | string; // array or JSON string
  passingYears?: number[] | string;    // array or JSON string
  requiredSkills?: string[] | string;  // array or JSON string
  requiredDocuments?: string[] | string; // e.g. ['RESUME', 'COLLEGE_ID']
  requiredExperience?: number;         // min experiences count or months
  requireVerifiedProfile?: boolean;    // institutional policy rule
}

export interface EligibilityCheckInput {
  student: StudentEligibilityData;
  internship: InternshipEligibilityCriteria;
}

export interface FailedRule {
  rule: string;
  criterion: string;
  message: string;
  required: any;
  actual: any;
}

export interface RuleEvaluation {
  rule: string;
  criterion: string;
  passed: boolean;
  message: string;
  required?: any;
  actual?: any;
}

export interface EligibilityResult {
  eligible: boolean;
  status: 'ELIGIBLE' | 'NOT_ELIGIBLE';
  score: number;
  reasons: string[];
  passedRules: string[];
  failedRules: FailedRule[];
  ruleBreakdown: Record<string, RuleEvaluation>;
}

/**
 * Helper to parse array fields if passed as JSON string or comma-separated string
 */
function parseStringOrArray<T = any>(val: any, defaultVal: T[] = []): T[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim().length > 0) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split(',').map(s => s.trim()).filter(Boolean) as any;
    }
  }
  return defaultVal;
}

/**
 * Deterministic Eligibility Engine
 * 
 * Evaluates candidate qualifications against configurable multi-factor criteria.
 * STRICTLY RULE-BASED: Zero AI models or non-deterministic heuristics are involved.
 */
export function checkEligibility(input: EligibilityCheckInput): EligibilityResult {
  const { student, internship } = input;
  const failedRules: FailedRule[] = [];
  const passedRules: string[] = [];
  const reasons: string[] = [];
  const ruleBreakdown: Record<string, RuleEvaluation> = {};

  let totalEvaluatedRules = 0;
  let passedRulesCount = 0;

  // 1. CGPA CRITERION (Configurable threshold, default 0.0)
  const minCgpa = internship.minCgpa !== undefined && internship.minCgpa !== null ? Number(internship.minCgpa) : 0.0;
  const studentCgpa = Number(student.cgpa || 0);
  totalEvaluatedRules++;

  // Precise decimal comparison with epsilon tolerance (e.g. 7.500000000000001)
  const cgpaDiff = studentCgpa - minCgpa;
  const isCgpaSatisfied = cgpaDiff >= -0.0001;

  if (isCgpaSatisfied) {
    passedRulesCount++;
    const msg = `CGPA satisfied: Student CGPA (${studentCgpa.toFixed(2)}) meets or exceeds required minimum (${minCgpa.toFixed(2)})`;
    passedRules.push(msg);
    reasons.push(msg);
    ruleBreakdown['CGPA'] = {
      rule: 'MIN_CGPA',
      criterion: 'Minimum CGPA Requirement',
      passed: true,
      message: msg,
      required: minCgpa,
      actual: studentCgpa
    };
  } else {
    const msg = `CGPA below required threshold: Student CGPA (${studentCgpa.toFixed(2)}) is below required minimum (${minCgpa.toFixed(2)})`;
    failedRules.push({
      rule: 'MIN_CGPA',
      criterion: 'Minimum CGPA Requirement',
      message: msg,
      required: minCgpa,
      actual: studentCgpa
    });
    reasons.push(msg);
    ruleBreakdown['CGPA'] = {
      rule: 'MIN_CGPA',
      criterion: 'Minimum CGPA Requirement',
      passed: false,
      message: msg,
      required: minCgpa,
      actual: studentCgpa
    };
  }

  // 2. BACKLOGS CRITERION (Configurable maximum limit, default 0)
  const maxBacklogs = internship.maxBacklogs !== undefined && internship.maxBacklogs !== null ? Number(internship.maxBacklogs) : 0;
  const studentBacklogs = Number(student.backlogs || 0);
  totalEvaluatedRules++;

  if (studentBacklogs <= maxBacklogs) {
    passedRulesCount++;
    const msg = `Backlog condition satisfied: Active backlogs (${studentBacklogs}) do not exceed maximum allowed limit (${maxBacklogs})`;
    passedRules.push(msg);
    reasons.push(msg);
    ruleBreakdown['BACKLOGS'] = {
      rule: 'MAX_BACKLOGS',
      criterion: 'Maximum Active Backlogs Limit',
      passed: true,
      message: msg,
      required: maxBacklogs,
      actual: studentBacklogs
    };
  } else {
    const msg = `Backlogs exceed allowed limit: Student has ${studentBacklogs} active backlog(s), but maximum allowed is ${maxBacklogs}`;
    failedRules.push({
      rule: 'MAX_BACKLOGS',
      criterion: 'Maximum Active Backlogs Limit',
      message: msg,
      required: maxBacklogs,
      actual: studentBacklogs
    });
    reasons.push(msg);
    ruleBreakdown['BACKLOGS'] = {
      rule: 'MAX_BACKLOGS',
      criterion: 'Maximum Active Backlogs Limit',
      passed: false,
      message: msg,
      required: maxBacklogs,
      actual: studentBacklogs
    };
  }

  // 3. DEPARTMENT / BRANCH CRITERION (Configurable branch list)
  const rawAllowedBranches = parseStringOrArray<string>(internship.allowedBranches, []);
  if (rawAllowedBranches.length > 0) {
    totalEvaluatedRules++;
    const normalize = (b: string) => (b || '').trim().toUpperCase();
    const studentDept = normalize(student.department);
    const allowedDepts = rawAllowedBranches.map(normalize);

    const isDeptAllowed = allowedDepts.includes('ALL') || allowedDepts.includes(studentDept);

    if (isDeptAllowed) {
      passedRulesCount++;
      const msg = `Department satisfied: Branch '${student.department}' is eligible for this opportunity`;
      passedRules.push(msg);
      reasons.push(msg);
      ruleBreakdown['DEPARTMENT'] = {
        rule: 'ALLOWED_BRANCHES',
        criterion: 'Eligible Academic Department',
        passed: true,
        message: msg,
        required: rawAllowedBranches,
        actual: student.department
      };
    } else {
      const msg = `Department not eligible: Branch '${student.department}' is not in allowed list [${rawAllowedBranches.join(', ')}]`;
      failedRules.push({
        rule: 'ALLOWED_BRANCHES',
        criterion: 'Eligible Academic Department',
        message: msg,
        required: rawAllowedBranches,
        actual: student.department
      });
      reasons.push(msg);
      ruleBreakdown['DEPARTMENT'] = {
        rule: 'ALLOWED_BRANCHES',
        criterion: 'Eligible Academic Department',
        passed: false,
        message: msg,
        required: rawAllowedBranches,
        actual: student.department
      };
    }
  }

  // 4. PASSING / GRADUATION YEAR CRITERION (Configurable batch list)
  const rawPassingYears = parseStringOrArray<number>(internship.passingYears, []).map(Number);
  if (rawPassingYears.length > 0) {
    totalEvaluatedRules++;
    const studentYear = Number(student.passingYear);
    const isYearAllowed = rawPassingYears.includes(studentYear);

    if (isYearAllowed) {
      passedRulesCount++;
      const msg = `Academic year satisfied: Passing year (${studentYear}) matches target recruitment batch`;
      passedRules.push(msg);
      reasons.push(msg);
      ruleBreakdown['PASSING_YEAR'] = {
        rule: 'PASSING_YEAR',
        criterion: 'Eligible Graduation Batch',
        passed: true,
        message: msg,
        required: rawPassingYears,
        actual: studentYear
      };
    } else {
      const msg = `Academic year not eligible: Passing year (${studentYear}) is not in eligible batches [${rawPassingYears.join(', ')}]`;
      failedRules.push({
        rule: 'PASSING_YEAR',
        criterion: 'Eligible Graduation Batch',
        message: msg,
        required: rawPassingYears,
        actual: studentYear
      });
      reasons.push(msg);
      ruleBreakdown['PASSING_YEAR'] = {
        rule: 'PASSING_YEAR',
        criterion: 'Eligible Graduation Batch',
        passed: false,
        message: msg,
        required: rawPassingYears,
        actual: studentYear
      };
    }
  }

  // 5. REQUIRED SKILLS CRITERION (Configurable mandatory skills)
  const rawRequiredSkills = parseStringOrArray<string>(internship.requiredSkills, []);
  if (rawRequiredSkills.length > 0) {
    totalEvaluatedRules++;
    const studentSkillNames = (student.skills || []).map(s => {
      if (typeof s === 'string') return s.trim().toLowerCase();
      return (s.skillName || '').trim().toLowerCase();
    });

    const missingSkills = rawRequiredSkills.filter(reqSk => {
      const normalizedReq = reqSk.trim().toLowerCase();
      return !studentSkillNames.includes(normalizedReq);
    });

    if (missingSkills.length === 0) {
      passedRulesCount++;
      const msg = `Required skills satisfied: Candidate possesses all required skills [${rawRequiredSkills.join(', ')}]`;
      passedRules.push(msg);
      reasons.push(msg);
      ruleBreakdown['SKILLS'] = {
        rule: 'REQUIRED_SKILLS',
        criterion: 'Mandatory Technical Skills',
        passed: true,
        message: msg,
        required: rawRequiredSkills,
        actual: studentSkillNames
      };
    } else {
      const msg = `Missing required skills: Candidate is missing [${missingSkills.join(', ')}]`;
      failedRules.push({
        rule: 'REQUIRED_SKILLS',
        criterion: 'Mandatory Technical Skills',
        message: msg,
        required: rawRequiredSkills,
        actual: missingSkills
      });
      reasons.push(msg);
      ruleBreakdown['SKILLS'] = {
        rule: 'REQUIRED_SKILLS',
        criterion: 'Mandatory Technical Skills',
        passed: false,
        message: msg,
        required: rawRequiredSkills,
        actual: missingSkills
      };
    }
  }

  // 6. REQUIRED DOCUMENTS CRITERION (e.g. RESUME, COLLEGE_ID)
  const rawRequiredDocs = parseStringOrArray<string>(internship.requiredDocuments, []);
  if (rawRequiredDocs.length > 0) {
    totalEvaluatedRules++;
    const studentDocTypes: string[] = [];

    if (student.resumeDocumentId) {
      studentDocTypes.push('RESUME');
    }

    if (Array.isArray(student.documents)) {
      student.documents.forEach((d: any) => {
        if (typeof d === 'string') studentDocTypes.push(d.toUpperCase());
        else if (d?.documentType) studentDocTypes.push(d.documentType.toUpperCase());
      });
    }

    const missingDocs = rawRequiredDocs.filter(reqDoc => {
      const norm = reqDoc.trim().toUpperCase();
      return !studentDocTypes.includes(norm);
    });

    if (missingDocs.length === 0) {
      passedRulesCount++;
      const msg = `Required documents satisfied: All mandatory verification documents [${rawRequiredDocs.join(', ')}] are present`;
      passedRules.push(msg);
      reasons.push(msg);
      ruleBreakdown['DOCUMENTS'] = {
        rule: 'REQUIRED_DOCUMENTS',
        criterion: 'Mandatory Proof Documents',
        passed: true,
        message: msg,
        required: rawRequiredDocs,
        actual: studentDocTypes
      };
    } else {
      const msg = `Missing required document(s): [${missingDocs.join(', ')}] must be uploaded before applying`;
      failedRules.push({
        rule: 'REQUIRED_DOCUMENTS',
        criterion: 'Mandatory Proof Documents',
        message: msg,
        required: rawRequiredDocs,
        actual: missingDocs
      });
      reasons.push(msg);
      ruleBreakdown['DOCUMENTS'] = {
        rule: 'REQUIRED_DOCUMENTS',
        criterion: 'Mandatory Proof Documents',
        passed: false,
        message: msg,
        required: rawRequiredDocs,
        actual: missingDocs
      };
    }
  }

  // 7. INSTITUTIONAL PROFILE VERIFICATION RULE (Optional Policy)
  if (internship.requireVerifiedProfile) {
    totalEvaluatedRules++;
    const isProfileVerified = student.profileStatus === 'VERIFIED';
    if (isProfileVerified) {
      passedRulesCount++;
      const msg = `Profile verification satisfied: Student profile has been approved and verified by T&P`;
      passedRules.push(msg);
      reasons.push(msg);
      ruleBreakdown['PROFILE_STATUS'] = {
        rule: 'PROFILE_STATUS',
        criterion: 'Institutional Profile Verification',
        passed: true,
        message: msg,
        required: 'VERIFIED',
        actual: student.profileStatus
      };
    } else {
      const msg = `Profile verification required: Student profile must be verified by T&P cell (current status: ${student.profileStatus || 'DRAFT'})`;
      failedRules.push({
        rule: 'PROFILE_STATUS',
        criterion: 'Institutional Profile Verification',
        message: msg,
        required: 'VERIFIED',
        actual: student.profileStatus || 'DRAFT'
      });
      reasons.push(msg);
      ruleBreakdown['PROFILE_STATUS'] = {
        rule: 'PROFILE_STATUS',
        criterion: 'Institutional Profile Verification',
        passed: false,
        message: msg,
        required: 'VERIFIED',
        actual: student.profileStatus || 'DRAFT'
      };
    }
  }

  const isEligible = failedRules.length === 0;
  const score = totalEvaluatedRules > 0 ? Math.round((passedRulesCount / totalEvaluatedRules) * 100) : 100;

  return {
    eligible: isEligible,
    status: isEligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
    score,
    reasons,
    passedRules,
    failedRules,
    ruleBreakdown
  };
}
