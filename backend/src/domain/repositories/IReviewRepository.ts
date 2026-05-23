import { Review } from '~entities/Review';
import { IBaseRepository, FilterQuery } from './IBaseRepository';
import { IReview } from '~models/ReviewModel';

export interface IReviewRepository extends IBaseRepository<Review, IReview> {
  checkSessionCompletion(userId: string, tutorId: string): Promise<boolean>;
  countDocuments(filter: FilterQuery<IReview>): Promise<number>;
  getAverageRating(tutorId: string): Promise<number>;
}
