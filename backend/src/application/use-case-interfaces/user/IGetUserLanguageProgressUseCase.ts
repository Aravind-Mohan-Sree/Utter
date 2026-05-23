/**
 * Progress stats structure for a specific language.
 */
export interface ILanguageProgress {
  language: string;
  sessionCount: number;
  averageRating: number;
  averageGrammar: number;
  averageVocabulary: number;
  averagePronunciation: number;
  averageSpeaking: number;
  history: {
    date: Date;
    rating: number;
  }[];
}

/**
 * Use case interface for retrieving user language progress stats.
 */
export interface IGetUserLanguageProgressUseCase {
  execute(userId: string): Promise<ILanguageProgress[]>;
}
