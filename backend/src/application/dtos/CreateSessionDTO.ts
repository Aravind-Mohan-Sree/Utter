import { BadRequestError } from '~errors/HttpError';

export class CreateSessionDTO {
  tutorId: string;
  scheduledAt: Date;
  duration: number;
  language: string;
  topic: string;
  price: number;
  expiresAt: Date;

  constructor(data: {
    tutorId: string;
    date: string;
    time: string;
    language: string;
    topic: string;
    price: number;
    scheduledAt?: string;
  }) {
    if (!data.tutorId || !data.date || !data.time || !data.language || !data.topic || !data.price) {
      throw new BadRequestError('All fields are required');
    }

    this.tutorId = data.tutorId;
    this.duration = 60;
    this.language = data.language;
    this.topic = data.topic;
    this.price = data.price;

    const [year, month, day] = data.date.split('-').map(Number);
    const [hours, minutes] = data.time.split(':').map(Number);

    if (data.scheduledAt) {
      this.scheduledAt = new Date(data.scheduledAt);
    } else {
      this.scheduledAt = new Date(year, month - 1, day, hours, minutes);
    }

    this.expiresAt = new Date(this.scheduledAt.getTime() - 30 * 60000);

    if (isNaN(this.scheduledAt.getTime())) {
      throw new BadRequestError('Invalid date or time');
    }
  }
}
