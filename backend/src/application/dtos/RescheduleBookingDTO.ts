import { BadRequestError } from '~errors/HttpError';

export class RescheduleBookingDTO {
  bookingId: string;
  newSessionId: string;

  constructor(data: { bookingId?: string; newSessionId?: string }) {
    if (!data.bookingId || !data.newSessionId) {
      throw new BadRequestError('bookingId and newSessionId are required');
    }
    this.bookingId = String(data.bookingId).trim();
    this.newSessionId = String(data.newSessionId).trim();
  }
}
