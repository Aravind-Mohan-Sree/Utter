export interface IPingBookingUseCase {
    execute(bookingId: string, userId: string, role: string): Promise<{ completed: boolean }>;
}
