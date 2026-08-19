export interface ProfileCompletenessResult {
  completenessScore: number;
  isComplete: boolean;
  breakdown: {
    personal: {
      score: number;
      maxScore: number;
      completed: boolean;
      missing: string[];
    };
    academic: {
      score: number;
      maxScore: number;
      completed: boolean;
      missing: string[];
    };
    skills: {
      score: number;
      maxScore: number;
      completed: boolean;
      count: number;
      missing: string[];
    };
    projectsAndExperience: {
      score: number;
      maxScore: number;
      completed: boolean;
      projectCount: number;
      experienceCount: number;
      missing: string[];
    };
    resume: {
      score: number;
      maxScore: number;
      completed: boolean;
      hasResume: boolean;
      missing: string[];
    };
    documents: {
      score: number;
      maxScore: number;
      completed: boolean;
      count: number;
      missing: string[];
    };
    preferences: {
      score: number;
      maxScore: number;
      completed: boolean;
      missing: string[];
    };
  };
  missingSections: string[];
  recommendations: string[];
}

/**
 * Deterministic, server-authoritative profile completeness calculation.
 * Ensures completeness cannot be manipulated or spoofed by client.
 */
export function calculateProfileCompleteness(profile: any, documentsCount: number = 0): ProfileCompletenessResult {
  let score = 0;
  const missingSections: string[] = [];
  const recommendations: string[] = [];

  // 1. Personal Details (20 points max)
  let personalScore = 0;
  const personalMissing: string[] = [];

  if (profile?.fullName && profile.fullName.trim().length > 0) {
    personalScore += 5;
  } else {
    personalMissing.push('Full Name');
  }

  if (profile?.bio && profile.bio.trim().length >= 10) {
    personalScore += 5;
  } else {
    personalMissing.push('Bio / Professional Summary (min 10 chars)');
  }

  if (profile?.phone && profile.phone.trim().length >= 7) {
    personalScore += 5;
  } else {
    personalMissing.push('Contact Phone Number');
  }

  if (profile?.linkedinUrl || profile?.githubUrl || profile?.portfolioUrl) {
    personalScore += 5;
  } else {
    personalMissing.push('Social / Portfolio link (LinkedIn, GitHub, or Portfolio)');
  }

  score += personalScore;
  if (personalScore < 20) {
    missingSections.push('Personal Information');
    recommendations.push(`Complete your personal profile: add ${personalMissing.join(', ')}.`);
  }

  // 2. Academic Information (20 points max)
  let academicScore = 0;
  const academicMissing: string[] = [];

  if (profile?.department && profile.department.trim().length > 0) {
    academicScore += 5;
  } else {
    academicMissing.push('Department / Branch');
  }

  if (profile?.passingYear && Number(profile.passingYear) >= 2000) {
    academicScore += 5;
  } else {
    academicMissing.push('Graduation Year');
  }

  if (profile?.cgpa !== undefined && profile?.cgpa !== null && Number(profile.cgpa) >= 0 && Number(profile.cgpa) <= 10) {
    academicScore += 5;
  } else {
    academicMissing.push('Valid CGPA (0.00 - 10.00)');
  }

  if (profile?.backlogs !== undefined && profile?.backlogs !== null && Number(profile.backlogs) >= 0) {
    academicScore += 5;
  } else {
    academicMissing.push('Active Backlogs Count');
  }

  score += academicScore;
  if (academicScore < 20) {
    missingSections.push('Academic Information');
    recommendations.push(`Complete academic info: specify ${academicMissing.join(', ')}.`);
  }

  // 3. Skills (15 points max)
  let skillsScore = 0;
  const skillsList = Array.isArray(profile?.skills) ? profile.skills : [];
  const skillsMissing: string[] = [];

  if (skillsList.length >= 1) {
    skillsScore += 5;
  } else {
    skillsMissing.push('Add at least 1 technical skill');
  }

  if (skillsList.length >= 3) {
    skillsScore += 5;
  } else if (skillsList.length > 0) {
    skillsMissing.push('Add at least 3 skills for better matching');
  }

  const hasProficiency = skillsList.some((s: any) => s.proficiency && ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(s.proficiency));
  if (hasProficiency) {
    skillsScore += 5;
  } else if (skillsList.length > 0) {
    skillsMissing.push('Set skill proficiency level');
  }

  score += skillsScore;
  if (skillsScore < 15) {
    missingSections.push('Skills');
    recommendations.push(`Enhance your skills: ${skillsMissing.join(', ')}.`);
  }

  // 4. Projects & Experience (15 points max)
  let projExpScore = 0;
  const projectsList = Array.isArray(profile?.projects) ? profile.projects : [];
  const expList = Array.isArray(profile?.experiences) ? profile.experiences : [];
  const projExpMissing: string[] = [];

  if (projectsList.length >= 1) {
    projExpScore += 10;
  } else {
    projExpMissing.push('Add at least 1 technical project');
  }

  if (expList.length >= 1 || projectsList.length >= 2) {
    projExpScore += 5;
  } else {
    projExpMissing.push('Add work/internship experience or a second project');
  }

  score += projExpScore;
  if (projExpScore < 15) {
    missingSections.push('Projects & Experience');
    recommendations.push(`Add portfolio evidence: ${projExpMissing.join(', ')}.`);
  }

  // 5. Resume (15 points max)
  let resumeScore = 0;
  const resumeMissing: string[] = [];

  if (profile?.resumeDocumentId) {
    resumeScore = 15;
  } else {
    resumeMissing.push('Upload official PDF resume');
    missingSections.push('Resume');
    recommendations.push('Upload an updated PDF resume for recruiters.');
  }
  score += resumeScore;

  // 6. Verification Documents (10 points max)
  let docScore = 0;
  const docMissing: string[] = [];
  if (documentsCount >= 1) {
    docScore = 10;
  } else {
    docMissing.push('Upload at least 1 verification document (College ID or Marksheet)');
    missingSections.push('Verification Documents');
    recommendations.push('Upload your College ID or academic marksheet for T&P verification.');
  }
  score += docScore;

  // 7. Preferences (5 points max)
  let prefScore = 0;
  const prefMissing: string[] = [];
  const hasPreferredDomains = profile?.preferredDomains && profile.preferredDomains !== '[]' && profile.preferredDomains !== '';
  const hasPreferredMode = Boolean(profile?.preferredMode);

  if (hasPreferredDomains || hasPreferredMode) {
    prefScore = 5;
  } else {
    prefMissing.push('Set preferred domains or internship mode');
    missingSections.push('Preferences');
    recommendations.push('Set your preferred internship domains and working mode.');
  }
  score += prefScore;

  const normalizedScore = Math.min(100, Math.max(0, Math.round(score)));

  return {
    completenessScore: normalizedScore,
    isComplete: normalizedScore >= 80,
    breakdown: {
      personal: {
        score: personalScore,
        maxScore: 20,
        completed: personalScore === 20,
        missing: personalMissing
      },
      academic: {
        score: academicScore,
        maxScore: 20,
        completed: academicScore === 20,
        missing: academicMissing
      },
      skills: {
        score: skillsScore,
        maxScore: 15,
        completed: skillsScore === 15,
        count: skillsList.length,
        missing: skillsMissing
      },
      projectsAndExperience: {
        score: projExpScore,
        maxScore: 15,
        completed: projExpScore === 15,
        projectCount: projectsList.length,
        experienceCount: expList.length,
        missing: projExpMissing
      },
      resume: {
        score: resumeScore,
        maxScore: 15,
        completed: resumeScore === 15,
        hasResume: Boolean(profile?.resumeDocumentId),
        missing: resumeMissing
      },
      documents: {
        score: docScore,
        maxScore: 10,
        completed: docScore === 10,
        count: documentsCount,
        missing: docMissing
      },
      preferences: {
        score: prefScore,
        maxScore: 5,
        completed: prefScore === 5,
        missing: prefMissing
      }
    },
    missingSections,
    recommendations
  };
}
