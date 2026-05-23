export interface ICreateBookingOrderUseCase {
    execute(amount: number, currency: string, sessionId: string, userId: string): Promise<{
        id: string;
        currency: string;
        amount: number;
    }>;
}

export interface IVerifyPaymentAndBookUseCase {
    execute(data: {
        orderId: string;
        paymentId: string;
        signature: string;
        sessionId: string;
        userId: string;
        tutorId: string;
        amount: number;
        currency: string;
    }): Promise<null>;
}

export interface IBookWithWalletUseCase {
    execute(data: {
        sessionId: string;
        userId: string;
        tutorId: string;
    }): Promise<null>;
}
