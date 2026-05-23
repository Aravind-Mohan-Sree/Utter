import { IBookingDetail } from '~repository-interfaces/IBookingRepository';

export class BookingMapper {
  static toResponse(data: IBookingDetail) {
    return {
      id: data.id,
      sessionId: data.sessionId,
      topic: data.topic,
      language: data.language,
      status: data.status,
      date: data.date,
      price: data.price,
      otherPartyName: data.otherPartyName,
      otherPartyAvatar: data.otherPartyAvatar,
      otherPartyId: data.otherPartyId,
      otherPartyRole: data.otherPartyRole,
      transactionId: data.transactionId,
      paymentProvider: data.paymentProvider,
      activeSeconds: data.activeSeconds,
      createdAt: data.createdAt,
    };
  }
}

export type BookingResponseDTO = ReturnType<typeof BookingMapper.toResponse>;
