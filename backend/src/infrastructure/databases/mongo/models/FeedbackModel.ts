import mongoose, { Schema, Document } from 'mongoose';

/**
 * Mongoose model interface for IFeedback.
 */
export interface IFeedback extends Document {
  bookingId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tutorId: mongoose.Types.ObjectId;
  language: string;
  topic: string;
  rating: number;
  grammar: number;
  vocabulary: number;
  pronunciation: number;
  speaking: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema: Schema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'bookings', required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    tutorId: { type: Schema.Types.ObjectId, ref: 'tutors', required: true },
    language: { type: String, required: true },
    topic: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    grammar: { type: Number, required: true, min: 1, max: 5 },
    vocabulary: { type: Number, required: true, min: 1, max: 5 },
    pronunciation: { type: Number, required: true, min: 1, max: 5 },
    speaking: { type: Number, required: true, min: 1, max: 5 },
    notes: { type: String, required: true },
  },
  { timestamps: true },
);

FeedbackSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IFeedback>('Feedback', FeedbackSchema);
