export class Booking {
  constructor(
    public sessionId: string,
    public userId: string,
    public tutorId: string,
    public payment: {
      provider: string;
      transactionId: string;
      status: string;
      currency: string;
    },
    public status: string,
    public activeSeconds = 0,
    public topic = 'Unknown Topic',
    public language = 'N/A',
    public price = 0,
    public id?: string,
    public createdAt?: Date,
    public updatedAt?: Date,
  ) { }
}
