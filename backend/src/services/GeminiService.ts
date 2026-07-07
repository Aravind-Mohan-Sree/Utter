import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { IQuestion } from '~entities/Quiz';
import { IGeminiService } from '../domain/services/IGeminiService';
import { env } from '../config/env';

/**
 * Concrete implementation of IGeminiService using Google Generative AI.
 * Handles AI-powered content generation, specifically language learning quizzes.
 */
export class GeminiService implements IGeminiService {
  private _genAI: GoogleGenerativeAI;
  private _model: GenerativeModel;

  constructor() {
    this._genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    // Using a flash model for faster response times in interactive quizzes
    this._model = this._genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite-preview',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 1.0,
      },
    });
  }

  /**
   * Generates a dynamic quiz based on language, difficulty, and question count.
   * Leverages structured JSON output from Gemini for direct parsing.
   */
  async generateQuiz(
    language: string,
    difficulty: string,
    volume: number,
    excludeQuestions?: string[],
  ): Promise<IQuestion[]> {
    let exclusionInstructions = '';
    if (excludeQuestions && excludeQuestions.length > 0) {
      exclusionInstructions = `Do not generate questions that are similar or identical to the following list:
      ${excludeQuestions.map((q, idx) => `${idx + 1}. "${q}"`).join('\n')}
      `;
    }

    const prompt = `Generate a language learning quiz for ${language} at ${difficulty} difficulty.
    Volume: ${volume} questions.
    Each question must have:
    - text: The question text.
    - options: 4 distinct choices.
    - correctAnswerIndex: Index (0-3) of the correct answer.
    - explanation: A brief context for why the answer is correct.
    
    ${exclusionInstructions}

    Return the response as a JSON array of objects following this structure:
    [
      {
        "text": "...",
        "options": ["...", "...", "...", "..."],
        "correctAnswerIndex": 0,
        "explanation": "..."
      }
    ]`;

    try {
      const result = await this._model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      return JSON.parse(text) as IQuestion[];
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate quiz: ${error.message}`);
      }
      throw new Error('Failed to generate quiz via Gemini API');
    }
  }
}
