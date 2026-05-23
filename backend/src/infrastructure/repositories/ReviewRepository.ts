import { Review } from '~entities/Review';
import { IReviewRepository } from '~repository-interfaces/IReviewRepository';
import ReviewModel, { IReview } from '~models/ReviewModel';
import { BaseRepository } from './BaseRepository';
import { BookingModel } from '~models/BookingModel';
import mongoose from 'mongoose';
import { FilterQuery } from '~repository-interfaces/IBaseRepository';

interface PopulatedReview extends Omit<IReview, 'userId'> {
  userId: {
    _id: mongoose.Types.ObjectId;
    name: string;
    avatarUrl: string;
  };
}

/**
 * Concrete repository for Review entities using Mongoose.
 * Handles storage and retrieval of tutor reviews, including user population.
 */
export class ReviewRepository
  extends BaseRepository<Review, IReview>
  implements IReviewRepository
{
  constructor() {
    super(ReviewModel);
  }

  /**
   * Internal mapper to convert domain entity to Mongoose schema object.
   */
  protected toSchema(
    entity: Review | Partial<Review>,
  ): IReview | Partial<IReview> {
    return {
      userId: entity.userId ? new mongoose.Types.ObjectId(entity.userId) : undefined,
      tutorId: entity.tutorId ? new mongoose.Types.ObjectId(entity.tutorId) : undefined,
      rating: entity.rating,
      note: entity.note,
    } as Partial<IReview>;
  }

  /**
   * Internal mapper to convert Mongoose document to domain entity.
   * Extracts populated user data (name, avatar) if available.
   */
  protected toEntity(doc: IReview | null): Review | null {
    if (!doc) return null;

    const populatedDoc = doc as unknown as PopulatedReview;
    const userId = populatedDoc.userId?._id || doc.userId;
    const tutorId = doc.tutorId;

    return new Review(
      String(doc._id),
      String(userId),
      String(tutorId),
      doc.rating,
      doc.note,
      doc.createdAt,
      doc.updatedAt,
      populatedDoc.userId?.name,
      populatedDoc.userId?.avatarUrl,
    );
  }

  /**
   * Overridden findOneById to include user population.
   */
  async findOneById(id: string): Promise<Review | null> {
    const doc = await ReviewModel.findById(id).populate(
      'userId',
      'name avatarUrl',
    );
    return this.toEntity(doc);
  }

  /**
   * Overridden findOneByField to include user population.
   */
  async findOneByField(filter: FilterQuery<IReview>): Promise<Review | null> {
    const doc = await ReviewModel.findOne(filter).populate(
      'userId',
      'name avatarUrl',
    );
    return this.toEntity(doc);
  }

  /**
   * Overridden findAllByField to include user population and custom sorting.
   */
  async findAllByField(
    filter: FilterQuery<IReview>,
    options?: { skip?: number; limit?: number },
  ): Promise<Review[]> {
    let query = ReviewModel.find(filter)
      .populate('userId', 'name avatarUrl')
      .sort({ createdAt: -1 });

    if (options?.skip !== undefined) query = query.skip(options.skip);
    if (options?.limit !== undefined) query = query.limit(options.limit);

    const docs = await query;
    return docs.map((doc) => this.toEntity(doc)!);
  }

  /**
   * Standard document count for reviews.
   */
  async countDocuments(filter: FilterQuery<IReview>): Promise<number> {
    return ReviewModel.countDocuments(filter);
  }

  /**
   * Business logic helper to verify if a user has successfully completed a session with a tutor.
   * This is used to gate review submission.
   */
  async checkSessionCompletion(
    userId: string,
    tutorId: string,
  ): Promise<boolean> {
    const count = await BookingModel.countDocuments({
      userId,
      tutorId,
      status: 'Completed',
    });
    return count > 0;
  }

  /**
   * Calculates the average rating for a specific tutor.
   */
  async getAverageRating(tutorId: string): Promise<number> {
    const result = await ReviewModel.aggregate([
      { $match: { tutorId: new mongoose.Types.ObjectId(tutorId) } },
      { $group: { _id: null, averageRating: { $avg: '$rating' } } },
    ]);
    return result[0]?.averageRating || 0;
  }
}
