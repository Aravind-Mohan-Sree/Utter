import { Quiz, IQuestion } from '~entities/Quiz';
import { IQuizRepository } from '~repository-interfaces/IQuizRepository';
import { IGeminiService } from '~service-interfaces/IGeminiService';
import { IGenerateQuizUseCase } from '~use-case-interfaces/user/IGenerateQuizUseCase';

export class GenerateQuizUseCase implements IGenerateQuizUseCase {
  constructor(
    private _quizRepository: IQuizRepository,
    private _geminiService: IGeminiService,
  ) { }

  async execute(
    userId: string,
    language: string,
    difficulty: string,
    volume: number,
  ): Promise<Quiz> {
    // 1. Fetch past quizzes for this language and difficulty to extract candidate questions
    const pastQuizzes = await this._quizRepository.findAllByField({
      language,
      difficulty,
    });

    const questionPool: IQuestion[] = [];
    const seenTexts = new Set<string>();

    if (pastQuizzes) {
      for (const q of pastQuizzes) {
        if (q.questions) {
          for (const question of q.questions) {
            const normalizedText = question.text.trim().toLowerCase();
            if (!seenTexts.has(normalizedText)) {
              seenTexts.add(normalizedText);
              questionPool.push(question);
            }
          }
        }
      }
    }

    // 2. Select up to 50% from cache to strike a balance, and generate the rest.
    // If no past questions exist, generate 100%.
    const cachedTargetCount = Math.floor(volume / 2);
    const actualCachedCount = Math.min(cachedTargetCount, questionPool.length);
    const generateCount = volume - actualCachedCount;

    const selectedQuestions: IQuestion[] = [];
    if (actualCachedCount > 0) {
      // Randomly select actualCachedCount questions from the pool
      const shuffledPool = [...questionPool].sort(() => 0.5 - Math.random());
      selectedQuestions.push(...shuffledPool.slice(0, actualCachedCount));
    }

    if (generateCount > 0) {
      // Collect all question texts we want to exclude
      const excludeTexts = questionPool.map((q) => q.text);
      const newQuestions = await this._geminiService.generateQuiz(
        language,
        difficulty,
        generateCount,
        excludeTexts,
      );
      selectedQuestions.push(...newQuestions);
    }

    // Shuffle the final combined list of questions so they are in a random order
    const questions = [...selectedQuestions].sort(() => 0.5 - Math.random());

    const quiz = new Quiz(
      userId,
      language,
      difficulty,
      volume,
      questions,
      0, // initial score
      volume, // total questions
      0, // correct answers
      0, // total time taken
      false, // isCompleted
      new Date(), // startedAt
      null, // completedAt
    );

    return this._quizRepository.create(quiz);
  }
}
