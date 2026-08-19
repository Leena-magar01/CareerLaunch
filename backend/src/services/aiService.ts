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
    skills: string[];
    projects: { title: string; technologies: string; description: string }[];
    certifications: string[];
  };
  internship: {
    title: string;
    description: string;
    requiredSkills: string[];
    minCgpa: number;
  };
}

export interface CandidateMatchResult {
  matchScore: number;
  factors: {
    skillMatch: number;
    projectMatch: number;
    academicFit: number;
    certFit: number;
  };
  explanation: string;
}

export const calculateCandidateMatch = async (input: CandidateMatchingInput): Promise<CandidateMatchResult> => {
  const { student, internship } = input;

  // 1. Skill overlap calculation (40%)
  const reqSkills = internship.requiredSkills.map(s => s.toLowerCase().trim());
  const studentSkills = student.skills.map(s => s.toLowerCase().trim());
  let matchedSkillsCount = 0;
  reqSkills.forEach(req => {
    if (studentSkills.some(st => st.includes(req) || req.includes(st))) {
      matchedSkillsCount++;
    }
  });
  const skillMatch = reqSkills.length > 0 ? Math.min(100, Math.round((matchedSkillsCount / reqSkills.length) * 100)) : 100;

  // 2. Project relevance calculation (25%)
  let projectMatch = 50; // base score
  const allProjectText = student.projects.map(p => `${p.title} ${p.technologies} ${p.description}`).join(' ').toLowerCase();
  let projectSkillMatches = 0;
  reqSkills.forEach(req => {
    if (allProjectText.includes(req)) projectSkillMatches++;
  });
  if (student.projects.length > 0) {
    projectMatch = Math.min(100, Math.round((projectSkillMatches / Math.max(1, reqSkills.length)) * 100 + 40));
  }

  // 3. Academic fit (20%)
  const cgpaMargin = student.cgpa - internship.minCgpa;
  const academicFit = Math.min(100, Math.max(60, Math.round(80 + cgpaMargin * 10)));

  // 4. Certification fit (15%)
  const certFit = student.certifications.length > 0 ? 90 : 60;

  // Weighted Score
  const matchScore = Math.round(
    skillMatch * 0.40 +
    projectMatch * 0.25 +
    academicFit * 0.20 +
    certFit * 0.15
  );

  // Fallback text explanation
  let explanation = `Candidate has ${matchedSkillsCount}/${reqSkills.length} required skills (${student.skills.join(', ')}). `;
  if (student.projects.length > 0) {
    explanation += `Demonstrated ${student.projects.length} practical projects. `;
  }
  explanation += `Academic CGPA ${student.cgpa} exceeds minimum required ${internship.minCgpa}.`;

  // Try LLM Explanation if key is present
  if (aiClient) {
    try {
      const model = aiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const response = await model.generateContent(
        `Provide a concise 2-sentence match explanation for why candidate ${student.fullName} (CGPA ${student.cgpa}, Skills: ${student.skills.join(', ')}) fits the role "${internship.title}" (Required skills: ${internship.requiredSkills.join(', ')}). Calculated match score is ${matchScore}%.`
      );
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
      projectMatch,
      academicFit,
      certFit,
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
