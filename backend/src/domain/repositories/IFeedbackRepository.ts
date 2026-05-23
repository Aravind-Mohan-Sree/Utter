import { Feedback } from '~entities/Feedback';
import { IBaseRepository, FilterQuery } from './IBaseRepository';
import { IFeedback } from '~models/FeedbackModel';

/**
 * Repository interface for Feedback database operations.
 */
export interface IFeedbackRepository extends IBaseRepository<Feedback, IFeedback> {
  countDocuments(filter: FilterQuery<IFeedback>): Promise<number>;
}
