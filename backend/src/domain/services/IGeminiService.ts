import { IQuestion } from '~entities/Quiz';

export interface IGeminiService {
  generateQuiz(
    language: string,
    difficulty: string,
    volume: number,
    excludeQuestions?: string[],
  ): Promise<IQuestion[]>;
}
