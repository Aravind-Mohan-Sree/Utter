import { IValidateDataService } from '~service-interfaces/IValidateDataService';
import { BadRequestError } from '~errors/HttpError';

/**
 * Data Transfer Object for submitting tutor-to-student feedback.
 * Validates the booking ID, sub-ratings (grammar, vocabulary, pronunciation, speaking), and text notes.
 */
export class SubmitFeedbackDTO {
  bookingId: string;
  rating: number;
  grammar: number;
  vocabulary: number;
  pronunciation: number;
  speaking: number;
  notes: string;

  constructor(
    data: {
      bookingId: string;
      rating: number;
      grammar: number;
      vocabulary: number;
      pronunciation: number;
      speaking: number;
      notes: string;
    },
    validator: IValidateDataService,
  ) {
    if (!data.bookingId) {
      throw new BadRequestError('Booking ID is required');
    }

    const ratings = [
      { name: 'Overall rating', value: data.rating },
      { name: 'Grammar rating', value: data.grammar },
      { name: 'Vocabulary rating', value: data.vocabulary },
      { name: 'Pronunciation rating', value: data.pronunciation },
      { name: 'Speaking rating', value: data.speaking },
    ];

    for (const r of ratings) {
      const result = validator.validateRating(r.value);
      if (!result.success) {
        throw new BadRequestError(`${r.name}: ${result.message}`);
      }
    }

    const notesResult = validator.validateReviewNote(data.notes);
    if (!notesResult.success) {
      throw new BadRequestError(notesResult.message);
    }

    this.bookingId = data.bookingId;
    this.rating = data.rating;
    this.grammar = data.grammar;
    this.vocabulary = data.vocabulary;
    this.pronunciation = data.pronunciation;
    this.speaking = data.speaking;
    this.notes = data.notes.trim();
  }
}
