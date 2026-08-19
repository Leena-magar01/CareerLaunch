import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENV } from '../../config/env';

export interface IAIProvider {
  name: string;
  isAvailable(): boolean;
  generateText(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string>;
  generateStructured<T>(prompt: string, fallback: T): Promise<T>;
}

/**
 * Google Gemini Generative AI Provider
 */
export class GeminiProvider implements IAIProvider {
  name = 'Gemini';
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    if (ENV.GEMINI_API_KEY) {
      try {
        this.client = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
      } catch (e) {
        console.warn('Failed to initialize Gemini AI client:', e);
      }
    }
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async generateText(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    if (!this.client) {
      throw new Error('Gemini API is not configured or unavailable');
    }

    try {
      const model = this.client.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: options?.temperature ?? 0.2,
          maxOutputTokens: options?.maxTokens ?? 1024
        }
      });

      // Wrap with 8-second timeout to guarantee application responsiveness
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI provider request timed out')), 8000)
      );

      const apiPromise = model.generateContent(prompt).then(res => res.response.text());
      const responseText = await Promise.race([apiPromise, timeoutPromise]);
      return responseText.trim();
    } catch (err: any) {
      console.warn('GeminiProvider generateText error:', err.message);
      throw err;
    }
  }

  async generateStructured<T>(prompt: string, fallback: T): Promise<T> {
    try {
      const text = await this.generateText(prompt);
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned) as T;
    } catch (err) {
      return fallback;
    }
  }
}

/**
 * Deterministic Fallback AI Provider
 * Operates offline or when external AI services fail/timeout.
 */
export class FallbackAIProvider implements IAIProvider {
  name = 'DeterministicFallback';

  isAvailable(): boolean {
    return true;
  }

  async generateText(prompt: string): Promise<string> {
    if (prompt.toLowerCase().includes('copilot') || prompt.toLowerCase().includes('eligib')) {
      return 'Based on your verified academic profile and system records, your eligibility and application status are displayed on your dashboard.';
    }
    return 'Analysis completed using verified platform records.';
  }

  async generateStructured<T>(_prompt: string, fallback: T): Promise<T> {
    return fallback;
  }
}

// Factory to resolve active AI provider
let activeProvider: IAIProvider | null = null;

export const getAIProvider = (): IAIProvider => {
  if (!activeProvider) {
    const gemini = new GeminiProvider();
    activeProvider = gemini.isAvailable() ? gemini : new FallbackAIProvider();
  }
  return activeProvider;
};

export const setAIProvider = (provider: IAIProvider) => {
  activeProvider = provider;
};
