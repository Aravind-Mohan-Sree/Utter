import { ITutor, TutorModel } from '~models/TutorModel';
import { BaseRepository } from './BaseRepository';
import { Tutor } from '~entities/Tutor';
import { Document, PipelineStage, mongo } from 'mongoose';
import { ITutorRepository } from '~repository-interfaces/ITutorRepository';

/**
 * Concrete repository for Tutor entities using Mongoose.
 * Manages complex filtering for tutor discovery, including verification and language status.
 */
export class TutorRepository
  extends BaseRepository<Tutor, ITutor>
  implements ITutorRepository {
  constructor() {
    super(TutorModel);
  }

  override async findOneById(id: string): Promise<Tutor | null> {
    const pipeline: PipelineStage[] = [
      { $match: { _id: new mongo.ObjectId(id) } },
      {
        $lookup: {
          from: 'reviews',
          let: { tutorId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$tutorId', '$$tutorId'] } } },
            { $group: { _id: null, avgRating: { $avg: '$rating' } } },
          ],
          as: 'ratingInfo',
        },
      },
      {
        $addFields: {
          averageRating: { $ifNull: [{ $arrayElemAt: ['$ratingInfo.avgRating', 0] }, 0] },
        },
      },
    ];

    const result = await this.model.aggregate(pipeline);
    if (result.length === 0) return null;

    return this.toEntity(result[0] as ITutor & Document);
  }

  /**
   * Fetches tutors with advanced filtering for both admins and students.
   * Handles verification states (Approved, Pending, Rejected) and language verification tasks.
   * 
   * @param page Page number.
   * @param limit Page size.
   * @param query Search query (name, email, languages).
   * @param filter Status filter (Active, Blocked, Approved, Pending, Rejected, etc.).
   * @param sort Sorting field (newest, oldest, a-z, z-a).
   * @param language Filter by a specific known language.
   * @param isAdmin If true, allows filtering by internal states like 'Rejected' or 'Pending'.
   */
  async fetchTutors(
    page: number,
    limit: number,
    query: string,
    filter: string,
    sort = 'newest',
    language = 'All',
    isAdmin = false,
    minRating?: number,
  ): Promise<{
    totalTutorsCount: number;
    filteredTutorsCount: number;
    tutors: Tutor[];
  }> {
    const pipeline: PipelineStage[] = [];
    const totalTutorsCount = await this.model.countDocuments({});
    const matchStage: mongo.Filter<ITutor> = {};

    // Admin view supports multiple status-based filters
    if (isAdmin) {
      if (filter !== 'All') {
        if (filter === 'Blocked') matchStage.isBlocked = true;
        else if (filter === 'Active') matchStage.isBlocked = false;
        else if (filter === 'Approved') {
          matchStage.isVerified = true;
        } else if (filter === 'Pending') {
          matchStage.isVerified = false;
          matchStage.rejectionReason = null;
        } else if (filter === 'Rejected') {
          matchStage.rejectionReason = { $ne: null };
        } else if (filter === 'LanguageVerificationPending') {
          matchStage.languageVerificationStatus = 'pending';
        }
      }
    } else {
      // Public view only shows verified and non-blocked tutors
      matchStage.isVerified = true;
      matchStage.isBlocked = false;
    }

    // Filter by language
    if (language && language !== 'All') {
      matchStage.knownLanguages = { $in: [language] };
    }

    // Filter by search query across multiple fields
    if (query) {
      const searchConditions: mongo.Filter<ITutor>[] = [
        { name: { $regex: query, $options: 'i' } },
        { knownLanguages: { $elemMatch: { $regex: query, $options: 'i' } } },
      ];

      // Admin can search by email too
      if (isAdmin) {
        searchConditions.push({ email: { $regex: query, $options: 'i' } });
      }

      matchStage.$or = searchConditions;
    }

    pipeline.push({ $match: matchStage as Record<string, unknown> });

    // Look up reviews and calculate average rating for each tutor
    pipeline.push({
      $lookup: {
        from: 'reviews',
        let: { tutorId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$tutorId', '$$tutorId'] } } },
          { $group: { _id: null, avgRating: { $avg: '$rating' } } },
        ],
        as: 'ratingInfo',
      },
    });

    pipeline.push({
      $addFields: {
        averageRating: { $ifNull: [{ $arrayElemAt: ['$ratingInfo.avgRating', 0] }, 0] },
      },
    });

    if (minRating !== undefined && minRating > 0) {
      pipeline.push({
        $match: { averageRating: { $gte: minRating } },
      });
    }

    // Set sorting stage
    let sortStage: Record<string, 1 | -1> = { createdAt: -1, _id: 1 };

    if (sort === 'oldest') sortStage = { createdAt: 1, _id: 1 };
    else if (sort === 'a-z') sortStage = { name: 1, _id: 1 };
    else if (sort === 'z-a') sortStage = { name: -1, _id: 1 };

    // Execute aggregation with $facet for data and total count
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $sort: sortStage },
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ],
      },
    });

    const result = await this.model.aggregate(pipeline);
    const tutors = result[0].data || [];
    const filteredTutorsCount = result[0].metadata[0]?.total || 0;

    return {
      totalTutorsCount,
      filteredTutorsCount,
      tutors: tutors.map((t: ITutor & Document) => this.toEntity(t)!),
    };
  }

  /**
   * Internal mapper to convert domain entity to Mongoose schema object.
   */
  protected toSchema(entity: Tutor | Partial<Tutor>): ITutor | Partial<ITutor> {
    return {
      name: entity.name,
      email: entity.email,
      knownLanguages: entity.knownLanguages,
      yearsOfExperience: entity.yearsOfExperience,
      bio: entity.bio,
      password: entity.password,
      googleId: entity.googleId,
      role: entity.role,
      isVerified: entity.isVerified,
      isBlocked: entity.isBlocked,
      certificationType: entity.certificationType,
      certificates: entity.certificates,
      rejectionReason: entity.rejectionReason,
      pendingLanguages: entity.pendingLanguages,
      pendingCertification: entity.pendingCertification,
      languageVerificationStatus: entity.languageVerificationStatus,
    };
  }

  /**
   * Internal mapper to convert Mongoose document to domain entity.
   */
  protected toEntity(doc: (ITutor & Document) | null): Tutor | null {
    if (!doc) return null;

    return new Tutor(
      doc.name,
      doc.email,
      doc.knownLanguages,
      doc.yearsOfExperience,
      doc.bio,
      doc.password,
      doc.googleId,
      doc.role,
      doc.isBlocked,
      doc.isVerified,
      doc.certificationType,
      doc.rejectionReason,
      doc.pendingLanguages,
      doc.pendingCertification,
      doc.languageVerificationStatus,
      doc.certificates,
      String(doc._id),
      doc.expiresAt,
      doc.createdAt,
      doc.updatedAt,
      (doc as unknown as { averageRating?: number }).averageRating,
    );
  }

  /**
   * Helper to get most recently registered/approved tutors.
   */
  getRecentVerifications = async (limit: number): Promise<Tutor[]> => {
    const docs = await this.model.find({ isVerified: true })
      .sort({ createdAt: -1 })
      .limit(limit);
    return docs.map((doc) => this.toEntity(doc as ITutor & Document)!);
  };
}
