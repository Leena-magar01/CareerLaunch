export interface EligibilityCheckInput {
  student: {
    cgpa: number;
    backlogs: number;
    department: string;
    passingYear: number;
    skills: string[];
  };
  internship: {
    minCgpa: number;
    maxBacklogs: number;
    allowedBranches: string[]; // parsed array
    passingYears: number[];    // parsed array
    requiredSkills: string[];  // parsed array
  };
}

export interface FailedRule {
  rule: string;
  message: string;
  required: any;
  actual: any;
}

export interface EligibilityResult {
  eligible: boolean;
  score: number;
  reasons: string[];
  failedRules: FailedRule[];
  passedRules: string[];
}

export const checkEligibility = (input: EligibilityCheckInput): EligibilityResult => {
  const { student, internship } = input;
  const failedRules: FailedRule[] = [];
  const passedRules: string[] = [];
  const reasons: string[] = [];

  // 1. CGPA Rule
  if (student.cgpa < internship.minCgpa) {
    const msg = `CGPA of ${student.cgpa.toFixed(2)} is below required minimum of ${internship.minCgpa.toFixed(2)}`;
    failedRules.push({ rule: 'MIN_CGPA', message: msg, required: internship.minCgpa, actual: student.cgpa });
    reasons.push(msg);
  } else {
    passedRules.push(`CGPA (${student.cgpa.toFixed(2)} >= ${internship.minCgpa.toFixed(2)})`);
  }

  // 2. Backlog Rule
  if (student.backlogs > internship.maxBacklogs) {
    const msg = `Active backlogs (${student.backlogs}) exceed maximum allowed (${internship.maxBacklogs})`;
    failedRules.push({ rule: 'MAX_BACKLOGS', message: msg, required: internship.maxBacklogs, actual: student.backlogs });
    reasons.push(msg);
  } else {
    passedRules.push(`Backlogs (${student.backlogs} <= ${internship.maxBacklogs})`);
  }

  // 3. Department / Branch Rule
  if (internship.allowedBranches.length > 0) {
    const normalize = (b: string) => b.trim().toUpperCase();
    const studentDept = normalize(student.department);
    const allowed = internship.allowedBranches.map(normalize);
    if (!allowed.includes(studentDept) && !allowed.includes('ALL')) {
      const msg = `Department '${student.department}' is not in allowed list [${internship.allowedBranches.join(', ')}]`;
      failedRules.push({ rule: 'ALLOWED_BRANCHES', message: msg, required: internship.allowedBranches, actual: student.department });
      reasons.push(msg);
    } else {
      passedRules.push(`Branch '${student.department}' matches requirements`);
    }
  }

  // 4. Passing Year Rule
  if (internship.passingYears.length > 0) {
    if (!internship.passingYears.includes(student.passingYear)) {
      const msg = `Passing year ${student.passingYear} is not in eligible batches [${internship.passingYears.join(', ')}]`;
      failedRules.push({ rule: 'PASSING_YEAR', message: msg, required: internship.passingYears, actual: student.passingYear });
      reasons.push(msg);
    } else {
      passedRules.push(`Passing year (${student.passingYear}) matches target batch`);
    }
  }

  // Calculate score
  const totalRules = 4;
  const passedCount = totalRules - failedRules.length;
  const score = Math.round((passedCount / totalRules) * 100);

  return {
    eligible: failedRules.length === 0,
    score,
    reasons,
    failedRules,
    passedRules
  };
};
