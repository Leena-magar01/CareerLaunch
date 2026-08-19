import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENV } from '../config/env';

let aiClient: GoogleGenerativeAI | null = null;
if (ENV.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
  } catch (e) {
    console.warn('Failed to initialize Gemini AI client:', e);
  }
}

export interface CandidateMatchingInput {
  student: {
    fullName: string;
    department: string;
    cgpa: number;
    backlogs?: number;
    skills: string[];
    projects?: { title: string; technologies?: string | null; description?: string | null }[];
    experiences?: { company: string; role: string; description?: string | null }[] | number;
    certifications?: string[];
    preferredDomains?: string[] | string;
    preferredMode?: string;
  };
  internship: {
    title: string;
    description: string;
    requiredSkills: string[];
    minCgpa: number;
    mode?: string;
  };
}

export interface CandidateMatchResult {
  matchScore: number;
  factors: {
    skillMatch: number;
    domainMatch: number;
    academicFit: number;
    experienceMatch: number;
    projectMatch: number;
  };
  explanation: string;
}

/**
 * Helper to parse arrays from potential JSON or CSV strings
 */
function toArray(val: any): string[] {
  if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
  if (typeof val === 'string' && val.trim().length > 0) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map(s => String(s).trim()).filter(Boolean);
    } catch {
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

/**
 * Explainable Candidate Match Scoring Engine
 * 
 * Computes deterministic multi-factor match score across 5 explicit dimensions:
 * 1. Skills Match (35%)
 * 2. Domain & Mode Preference Match (20%)
 * 3. Academic Profile & CGPA Fit (20%)
 * 4. Past Work & Internship Experience (15%)
 * 5. Practical Project Stack Relevance (10%)
 * 
 * Optionally synthesizes qualitative insights via Gemini LLM when API key is provided.
 */
export const calculateCandidateMatch = async (input: CandidateMatchingInput): Promise<CandidateMatchResult> => {
  const { student, internship } = input;

  // 1. Skill overlap calculation (35%)
  const reqSkills = (internship.requiredSkills || []).map(s => s.toLowerCase().trim()).filter(Boolean);
  const studentSkills = (student.skills || []).map(s => s.toLowerCase().trim()).filter(Boolean);

  let matchedSkillsCount = 0;
  const matchedSkillNames: string[] = [];
  const missingSkillNames: string[] = [];

  reqSkills.forEach(req => {
    const isMatched = studentSkills.some(st => st.includes(req) || req.includes(st));
    if (isMatched) {
      matchedSkillsCount++;
      matchedSkillNames.push(req);
    } else {
      missingSkillNames.push(req);
    }
  });

  const skillMatch = reqSkills.length > 0
    ? Math.min(100, Math.round((matchedSkillsCount / reqSkills.length) * 100))
    : (studentSkills.length > 0 ? 90 : 70);

  // 2. Domain & Mode Preference Match (20%)
  const studentDomains = toArray(student.preferredDomains).map(d => d.toLowerCase());
  const internshipContext = `${internship.title} ${internship.description}`.toLowerCase();

  let domainMatch = 70; // baseline if no domain preference set
  if (studentDomains.length > 0) {
    const domainHits = studentDomains.filter(d => internshipContext.includes(d)).length;
    if (domainHits > 0) {
      domainMatch = Math.min(100, 80 + domainHits * 10);
    } else {
      domainMatch = 60;
    }
  }

  // Work Mode bonus/penalty
  if (student.preferredMode && internship.mode) {
    const sMode = student.preferredMode.toUpperCase();
    const iMode = internship.mode.toUpperCase();
    if (sMode === 'ANY' || sMode === iMode) {
      domainMatch = Math.min(100, domainMatch + 10);
    }
  }

  // 3. Academic Profile Fit (20%)
  const cgpaMargin = (student.cgpa || 0) - (internship.minCgpa || 0);
  let academicFit = 75;
  if (cgpaMargin >= 1.5) academicFit = 100;
  else if (cgpaMargin >= 0.5) academicFit = 90;
  else if (cgpaMargin >= 0) academicFit = 80;
  else academicFit = Math.max(40, Math.round(70 + cgpaMargin * 20));

  if ((student.backlogs || 0) > 0) {
    academicFit = Math.max(30, academicFit - (student.backlogs || 0) * 15);
  }

  // 4. Past Work & Internship Experience Match (15%)
  let experienceCount = 0;
  if (Array.isArray(student.experiences)) {
    experienceCount = student.experiences.length;
  } else if (typeof student.experiences === 'number') {
    experienceCount = student.experiences;
  }

  let experienceMatch = 50;
  if (experienceCount >= 2) experienceMatch = 100;
  else if (experienceCount === 1) experienceMatch = 85;
  else experienceMatch = 60;

  // 5. Project Relevance Match (10%)
  const studentProjects = student.projects || [];
  let projectMatch = 50;
  if (studentProjects.length > 0) {
    const projectAllText = studentProjects.map(p => `${p.title} ${p.technologies || ''} ${p.description || ''}`).join(' ').toLowerCase();
    const projectSkillHits = reqSkills.filter(req => projectAllText.includes(req)).length;
    projectMatch = Math.min(100, Math.round((projectSkillHits / Math.max(1, reqSkills.length)) * 50 + 50));
  }

  // Overall Weighted Score
  const matchScore = Math.min(100, Math.max(0, Math.round(
    skillMatch * 0.35 +
    domainMatch * 0.20 +
    academicFit * 0.20 +
    experienceMatch * 0.15 +
    projectMatch * 0.10
  )));

  // Explainable Human-Readable Explanation
  let explanation = `Skill Match: ${skillMatch}% (${matchedSkillsCount}/${reqSkills.length} required skills matched). ` +
    `Domain Fit: ${domainMatch}%. ` +
    `Academic Profile: ${academicFit}% (CGPA ${student.cgpa.toFixed(2)} vs Min ${internship.minCgpa.toFixed(2)}). ` +
    `Experience: ${experienceMatch}% (${experienceCount} prior experiences).`;

  // Optional Gemini LLM qualitative synthesis
  if (aiClient) {
    try {
      const model = aiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Provide a concise 2-sentence match explanation for why candidate ${student.fullName} (CGPA ${student.cgpa}, Skills: ${student.skills.join(', ')}) fits the role "${internship.title}" (Required skills: ${internship.requiredSkills.join(', ')}). Calculated match score is ${matchScore}%. Highlight key strengths.`;
      const response = await model.generateContent(prompt);
      const text = response.response.text();
      if (text) {
        explanation = text.trim();
      }
    } catch (err) {
      console.warn('Gemini LLM match explanation call skipped/failed:', err);
    }
  }

  return {
    matchScore,
    factors: {
      skillMatch,
      domainMatch,
      academicFit,
      experienceMatch,
      projectMatch,
    },
    explanation,
  };
};

export const analyzeSkillGap = async (studentSkills: string[], requiredSkills: string[]) => {
  const reqNormalized = requiredSkills.map(s => s.trim());
  const studentNorm = studentSkills.map(s => s.toLowerCase().trim());

  const missingSkills = reqNormalized.filter(req => !studentNorm.some(st => st.includes(req.toLowerCase()) || req.toLowerCase().includes(st)));

  const recommendations = missingSkills.map(skill => `Complete a practical project or certified course covering ${skill}.`);

  let aiAdvice = `You possess ${requiredSkills.length - missingSkills.length} of ${requiredSkills.length} key required skills. Focus on learning: ${missingSkills.join(', ')}.`;

  if (aiClient && missingSkills.length > 0) {
    try {
      const model = aiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const res = await model.generateContent(
        `Provide actionable, step-by-step learning advice for a computer science student missing the following skills for an internship: ${missingSkills.join(', ')}. Keep under 100 words.`
      );
      const text = res.response.text();
      if (text) aiAdvice = text.trim();
    } catch (e) {
      console.warn('Gemini skill-gap API error:', e);
    }
  }

  return {
    missingSkills,
    recommendations,
    aiAdvice,
  };
};

export const analyzeResume = async (resumeText: string) => {
  let score = 82;
  let strengths = ['Clear academic details', 'Listed technical skill keywords', 'Project section present'];
  let weaknesses = ['Quantifiable metrics could be improved', 'Certification evidence links recommended'];
  let suggestions = ['Add specific metrics (e.g. reduced load time by 30%)', 'Include GitHub repository links for all projects'];

  if (aiClient && resumeText) {
    try {
      const model = aiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Analyze the following student resume text and output JSON with structure { "score": number, "strengths": string[], "weaknesses": string[], "suggestions": string[] }: \n\n${resumeText.slice(0, 1500)}`;
      const res = await model.generateContent(prompt);
      const text = res.response.text();
      if (text) {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return parsed;
      }
    } catch (e) {
      console.warn('Gemini resume analyzer error:', e);
    }
  }

  return { score, strengths, weaknesses, suggestions };
};

export const runCopilotQuery = async (query: string, userContext: any) => {
  let answer = `Based on your profile, you are logged in as ${userContext.fullName || userContext.email} (${userContext.role}). `;

  if (query.toLowerCase().includes('eligible')) {
    answer += `Your CGPA is ${userContext.cgpa || 'N/A'} with ${userContext.backlogs ?? 0} active backlogs. Check the Eligibility page to see individual vacancy rule breakdowns.`;
  } else if (query.toLowerCase().includes('application') || query.toLowerCase().includes('status')) {
    answer += `You have active applications submitted. Check the Applications tab for current status timelines.`;
  } else if (query.toLowerCase().includes('report') || query.toLowerCase().includes('weekly')) {
    answer += `Weekly progress reports are submitted every week under the Internship Progress tab for your assigned faculty mentor to review.`;
  } else {
    answer += `You can discover internships, track application status, submit weekly progress, and view verified offers directly from your dashboard.`;
  }

  if (aiClient) {
    try {
      const model = aiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `You are an AI Internship Copilot assistant for a college platform. User query: "${query}". User context: ${JSON.stringify(userContext)}. Give a helpful, grounded response in 2-3 sentences.`;
      const res = await model.generateContent(prompt);
      const text = res.response.text();
      if (text) answer = text.trim();
    } catch (e) {
      console.warn('Gemini copilot error:', e);
    }
  }

  return { answer };
};
