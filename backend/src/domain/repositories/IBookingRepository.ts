import { Booking } from '~entities/Booking';
import { IBaseRepository } from './IBaseRepository';
import { IBooking } from '~models/BookingModel';

export interface IBookingDetail {
    id: string;
    sessionId: string;
    topic: string;
    language: string;
    status: string;
    date: Date;
    price: number;
    otherPartyName: string;
    otherPartyAvatar: string | null;
    otherPartyId: string;
    otherPartyRole: 'user' | 'tutor';
    transactionId: string;
    paymentProvider: string;
    activeSeconds: number;
    createdAt: Date;
    duration?: number;
}

export interface IFetchBookingsParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    date?: string;
    language?: string;
    sort?: 'Newest' | 'Oldest';
    userId?: string;
    tutorId?: string;
}

export interface IFetchBookingsResponse {
    upcoming: IBookingDetail[];
    history: {
        data: IBookingDetail[];
        totalPage: number;
        currentPage: number;
        totalCount: number;
    };
    callJoinThresholdMinutes: number;
}

export interface IPeriodStats {
    totalEarnings: number;
    completedSessions: number;
}

export interface IBookingRepository extends IBaseRepository<Booking, IBooking> {
    fetchBookings(params: IFetchBookingsParams): Promise<IFetchBookingsResponse>;
    getDashboardStats(): Promise<{ totalEarnings: number; completedSessions: number; languageStats: { language: string; sessionCount: number }[] }>;
    getStatsForPeriod(startDate: Date, endDate: Date): Promise<IPeriodStats>;
    getRecentSessions(limit: number): Promise<IBookingDetail[]>;
    getTutorDashboardStats(tutorId: string): Promise<{ totalEarnings: number; completedSessionsCount: number; totalTeachTime: number; languageStats: { language: string; sessionCount: number }[] }>;
}
