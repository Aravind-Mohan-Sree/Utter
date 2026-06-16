export interface IMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface IMailService {
  send(options: IMailOptions): Promise<void>;
  sendOtp(name: string, email: string, otp: string): Promise<void>;
  sendVerificationUpdate(name: string, email: string, reason?: string): Promise<void>;
  sendWelcome(name: string, email: string): Promise<void>;
  sendBookingConfirmation(name: string, email: string, sessionTopic: string, language: string, sessionDate: string, isTutor: boolean): Promise<void>;
  sendBookingCancellation(name: string, email: string, sessionTopic: string, language: string, sessionDate: string, amount?: number): Promise<void>;
  sendReportUpdate(name: string, email: string, status: 'Resolved' | 'Rejected', reason?: string): Promise<void>;
  sendBookingRescheduled(name: string, email: string, sessionTopic: string, language: string, oldDate: string, newDate: string): Promise<void>;
  sendLanguageVerificationUpdate(
    name: string,
    email: string,
    status: 'started' | 'approved' | 'rejected',
    languages?: string[],
    reason?: string,
  ): Promise<void>;
  generateOtp(): string;
  verifyOtp(entered: string, stored: string): boolean;
}
