import { IGetUserLanguageProgressUseCase, ILanguageProgress } from '~use-case-interfaces/user/IGetUserLanguageProgressUseCase';
import { IFeedbackRepository } from '~repository-interfaces/IFeedbackRepository';
import { FilterQuery } from '~repository-interfaces/IBaseRepository';
import { IFeedback } from '~models/FeedbackModel';

/**
 * Use case to aggregate and calculate language-specific progress stats
 * for a user based on cumulative tutor feedback metrics.
 */
export class GetUserLanguageProgressUseCase implements IGetUserLanguageProgressUseCase {
  constructor(private _feedbackRepository: IFeedbackRepository) {}

  async execute(userId: string): Promise<ILanguageProgress[]> {
    // 1. Fetch all feedback documents recorded for the user
    const feedbacks = await this._feedbackRepository.findAllByField({
      userId,
    } as unknown as FilterQuery<IFeedback>);

    if (!feedbacks || feedbacks.length === 0) {
      return [];
    }

    // 2. Group feedbacks by language
    const languageGroups: Record<string, typeof feedbacks> = {};
    for (const feedback of feedbacks) {
      const lang = feedback.language;
      if (!languageGroups[lang]) {
        languageGroups[lang] = [];
      }
      languageGroups[lang].push(feedback);
    }

    const progressList: ILanguageProgress[] = [];

    // 3. For each language, compute averages and build a progress timeline
    for (const [language, langFeedbacks] of Object.entries(languageGroups)) {
      let sumRating = 0;
      let sumGrammar = 0;
      let sumVocabulary = 0;
      let sumPronunciation = 0;
      let sumSpeaking = 0;

      for (const f of langFeedbacks) {
        sumRating += f.rating;
        sumGrammar += f.grammar;
        sumVocabulary += f.vocabulary;
        sumPronunciation += f.pronunciation;
        sumSpeaking += f.speaking;
      }

      const count = langFeedbacks.length;

      // Extract a history timeline of ratings, reversed so it flows chronological (oldest to newest)
      const history = langFeedbacks
        .map((f) => ({
          date: f.createdAt,
          rating: f.rating,
        }))
        .reverse();

      progressList.push({
        language,
        sessionCount: count,
        averageRating: Number((sumRating / count).toFixed(1)),
        averageGrammar: Number((sumGrammar / count).toFixed(1)),
        averageVocabulary: Number((sumVocabulary / count).toFixed(1)),
        averagePronunciation: Number((sumPronunciation / count).toFixed(1)),
        averageSpeaking: Number((sumSpeaking / count).toFixed(1)),
        history,
      });
    }

    return progressList;
  }
}
