import axios from "~utils/axiosConfig";

export interface Booking {
    id: string;
    sessionId: string;
    topic: string;
    language: string;
    status: 'Available' | 'Booked' | 'Completed' | 'Cancelled' | 'Incomplete';
    date: string;
    price: number;
    otherPartyName: string;
    otherPartyAvatar: string;
    otherPartyId: string;
    otherPartyRole: 'user' | 'tutor';
    transactionId?: string;
    paymentProvider?: string;
    activeSeconds?: number;
    duration?: number;
}

export interface GetBookingsResponse {
    upcoming: Booking[];
    history: {
        data: Booking[];
        totalPage: number;
        currentPage: number;
        totalCount: number;
    };
    callJoinThresholdMinutes: number;
}

export interface GetBookingsParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    date?: string;
    language?: string;
    sort?: 'Newest' | 'Oldest';
}

export const getBookings = async (params: GetBookingsParams, role: string): Promise<GetBookingsResponse> => {
    try {
        const endpoint = role === 'tutor' ? '/tutor/bookings' : '/user/bookings';
        const response = await axios.get(endpoint, { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const cancelBooking = async (bookingId: string, role: string): Promise<void> => {
    try {
        const url = role === 'tutor' ? `/tutor/bookings/${bookingId}/cancel` : `/user/bookings/${bookingId}/cancel`;
        await axios.patch(url);
    } catch (error) {
        throw error;
    }
};

