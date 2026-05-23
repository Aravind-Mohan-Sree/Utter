/**
 * Domain entity representing a tutor's feedback on a student's performance during a session.
 */
export class Feedback {
  constructor(
    public readonly id: string | undefined,
    public readonly bookingId: string,
    public readonly userId: string,
    public readonly tutorId: string,
    public readonly language: string,
    public readonly topic: string,
    public readonly rating: number,
    public readonly grammar: number,
    public readonly vocabulary: number,
    public readonly pronunciation: number,
    public readonly speaking: number,
    public readonly notes: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly tutorName?: string,
    public readonly tutorAvatar?: string,
  ) {}
}
