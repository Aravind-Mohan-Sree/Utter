export interface IRescheduleBookingUseCase {
  execute(bookingId: string, newSessionId: string, userId: string, role: string): Promise<boolean>;
}
