import { Feedback } from '~entities/Feedback';
import { IFeedbackRepository } from '~repository-interfaces/IFeedbackRepository';
import FeedbackModel, { IFeedback } from '~models/FeedbackModel';
import { BaseRepository } from './BaseRepository';
import mongoose from 'mongoose';
import { FilterQuery } from '~repository-interfaces/IBaseRepository';

interface PopulatedFeedback extends Omit<IFeedback, 'tutorId'> {
  tutorId: {
    _id: mongoose.Types.ObjectId;
    name: string;
  };
}

/**
 * Mongoose repository for Feedback database operations.
 * Automatically maps schema documents to the domain entity and handles tutor details population.
 */
export class FeedbackRepository
  extends BaseRepository<Feedback, IFeedback>
  implements IFeedbackRepository
{
  constructor() {
    super(FeedbackModel);
  }

  protected toSchema(
    entity: Feedback | Partial<Feedback>,
  ): IFeedback | Partial<IFeedback> {
    return {
      bookingId: entity.bookingId ? new mongoose.Types.ObjectId(entity.bookingId) : undefined,
      userId: entity.userId ? new mongoose.Types.ObjectId(entity.userId) : undefined,
      tutorId: entity.tutorId ? new mongoose.Types.ObjectId(entity.tutorId) : undefined,
      language: entity.language,
      topic: entity.topic,
      rating: entity.rating,
      grammar: entity.grammar,
      vocabulary: entity.vocabulary,
      pronunciation: entity.pronunciation,
      speaking: entity.speaking,
      notes: entity.notes,
    } as Partial<IFeedback>;
  }

  protected toEntity(doc: IFeedback | null): Feedback | null {
    if (!doc) {
      return null;
    }

    const populatedDoc = doc as unknown as PopulatedFeedback;
    const tutorId = populatedDoc.tutorId?._id || doc.tutorId;
    const bookingId = doc.bookingId;
    const userId = doc.userId;

    return new Feedback(
      String(doc._id),
      String(bookingId),
      String(userId),
      String(tutorId),
      doc.language,
      doc.topic,
      doc.rating,
      doc.grammar,
      doc.vocabulary,
      doc.pronunciation,
      doc.speaking,
      doc.notes,
      doc.createdAt,
      doc.updatedAt,
      populatedDoc.tutorId?.name,
    );
  }

  async findOneById(id: string): Promise<Feedback | null> {
    const doc = await FeedbackModel.findById(id).populate(
      'tutorId',
      'name',
    );
    return this.toEntity(doc);
  }

  async findOneByField(filter: FilterQuery<IFeedback>): Promise<Feedback | null> {
    const doc = await FeedbackModel.findOne(filter).populate(
      'tutorId',
      'name',
    );
    return this.toEntity(doc);
  }

  async findAllByField(
    filter: FilterQuery<IFeedback>,
    options?: { skip?: number; limit?: number },
  ): Promise<Feedback[]> {
    let query = FeedbackModel.find(filter)
      .populate('tutorId', 'name')
      .sort({ createdAt: -1 });

    if (options?.skip !== undefined) {
      query = query.skip(options.skip);
    }
    if (options?.limit !== undefined) {
      query = query.limit(options.limit);
    }

    const docs = await query;
    return docs.map((doc) => this.toEntity(doc)!);
  }

  async countDocuments(filter: FilterQuery<IFeedback>): Promise<number> {
    return FeedbackModel.countDocuments(filter);
  }
}
