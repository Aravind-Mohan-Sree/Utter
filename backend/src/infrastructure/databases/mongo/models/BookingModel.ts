import mongoose, { Schema, Document } from 'mongoose';

export interface IBooking extends Document {
  sessionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tutorId: mongoose.Types.ObjectId;
  payment: {
    provider: string;
    transactionId: string;
    status: string;
    currency: string;
  };
  status: string;
  activeSeconds: number;
  topic: string;
  language: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'sessions', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    tutorId: { type: Schema.Types.ObjectId, ref: 'tutors', required: true },
    payment: {
      provider: { type: String, required: true },
      transactionId: { type: String, required: true },
      status: { type: String, required: true },
      currency: { type: String, required: true },
    },
    status: { type: String, required: true },
    activeSeconds: { type: Number, default: 0 },
    topic: { type: String, required: true, default: 'Unknown Topic' },
    language: { type: String, required: true, default: 'N/A' },
    price: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  },
);

export const BookingModel = mongoose.model<IBooking>('Booking', bookingSchema);
