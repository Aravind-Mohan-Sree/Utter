export interface Tutor {
    id: string;
    name: string;
    email: string;
    knownLanguages: string[];
    yearsOfExperience: string;
    bio: string;
    role: string;
    isBlocked: boolean;
    isVerified: boolean;
    certificationType: string[];
    rejectionReason: string | null;
    pendingLanguages: string[];
    pendingCertification: string | null;
    languageVerificationStatus: 'pending' | 'approved' | 'rejected' | null;
    certificates: string[];
    createdAt: string;
    averageRating?: number;
}

export interface Session {
    id: string;
    tutorId: string;
    scheduledAt: string;
    duration: number;
    language: string;
    topic: string;
    price: number;
    status: string;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface GetTutorDetailsResponse {
    message: string;
    tutor: Tutor;
}

export interface GetTutorSessionsResponse {
    message: string;
    sessions: Session[];
}

export interface GetTutorsResponse {
    message: string;
    tutorsData: {
        totalTutorsCount: number;
        filteredTutorsCount: number;
        tutors: Tutor[];
    };
}

export interface VerifyPaymentRequest {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    sessionId: string;
    tutorId?: string;
    amount: number;
    currency: string;
}

export interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

export interface RazorpayError {
    error: {
        code: string;
        description: string;
        source: string;
        step: string;
        reason: string;
        metadata: {
            order_id: string;
            payment_id: string;
        };
    };
}

export interface RazorpayOptions {
    key: string | undefined;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    handler: (response: RazorpayResponse) => void;
    prefill: {
        name?: string;
        email?: string;
        contact?: string;
    };
    theme: {
        color: string;
    };
}

export interface CreateSessionRequest {
    date: string;
    time: string;
    language: string;
    topic: string;
    price: number;
    scheduledAt?: string;
}

export interface CreateSessionResponse {
    message: string;
    session: Session;
}

export interface TutorGetSessionsResponse {
    sessions: Session[];
}
