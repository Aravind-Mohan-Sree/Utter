import nodemailer from 'nodemailer';
import { env } from '~config/env';
import { emailTemplate } from '~constants/emailTemplate';
import { IMailService } from '~service-interfaces/IMailService';

export interface IMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Concrete service for sending transactional emails using Nodemailer.
 * Handles OTPs, welcome messages, booking confirmations, and administrative notifications.
 */
export class MailService implements IMailService {
  // Transporter configured using environment variables
  private _transporter = nodemailer.createTransport({
    host: env.NODEMAILER_HOST,
    port: parseInt(env.NODEMAILER_PORT),
    secure: env.NODEMAILER_PORT === '465',
    auth: {
      user: env.NODEMAILER_USER,
      pass: env.NODEMAILER_PASS,
    },
  });

  /**
   * Generic internal method to send any email.
   */
  async send(options: IMailOptions): Promise<void> {
    await this._transporter.sendMail({
      from: env.NODEMAILER_USER,
      ...options,
    });
  }

  /**
   * Sends a 6-digit OTP for email verification.
   */
  async sendOtp(name: string, email: string, otp: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP is ${otp}`,
      html: emailTemplate(
        name,
        'Please verify your email with the OTP given below.',
        otp,
      ),
    });
  }

  /**
   * Notifies a tutor when their application status is updated (specifically rejections).
   */
  async sendVerificationUpdate(name: string, email: string, reason?: string): Promise<void> {
    const websiteLink = 'http://localhost:3000';

    await this.send({
      to: email,
      subject: 'Verification Process Completed',
      text: `Please sign in to know more`,
      html: emailTemplate(
        name,
        `The verification process is now complete. Unfortunately, your application was not approved at this time.${
          reason ? `<br><br><b>Reason:</b> ${reason}` : ''
        }<br><br>Please <a href="${websiteLink}" style="font-weight: bold;">sign in</a> to know more about the next steps.`,
      ),
    });
  }

  /**
   * Sends a welcome email upon successful registration.
   */
  async sendWelcome(name: string, email: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Welcome to Utter!',
      text: `Hi ${name}, welcome aboard!`,
      html: emailTemplate(
        name,
        `Welcome to Utter. We're glad to have you with us. Your account is now active and ready to use.`,
      ),
    });
  }

  /**
   * Notifies participants of a confirmed session booking.
   */
  async sendBookingConfirmation(name: string, email: string, sessionTopic: string, language: string, sessionDate: string, isTutor: boolean): Promise<void> {
    const roleText = isTutor ? 'You have a new booking' : 'Your session has been booked';
    const body = `${roleText}.<br><br><b>Topic:</b> ${sessionTopic}<br><b>Language:</b> ${language}<br><b>Date:</b> ${sessionDate}`;

    await this.send({
      to: email,
      subject: `Booking Confirmation: ${sessionTopic}`,
      html: emailTemplate(name, body),
    });
  }

  /**
   * Notifies participants when a session is cancelled and details the refund if applicable.
   */
  async sendBookingCancellation(name: string, email: string, sessionTopic: string, language: string, sessionDate: string, amount?: number): Promise<void> {
    let body = `The session "<b>${sessionTopic}</b>" (${language}) scheduled for ${sessionDate} has been cancelled.`;

    if (amount) {
      body += `<br><br>The amount of <b>₹${amount}</b> has been credited back to your wallet.`;
    }

    await this.send({
      to: email,
      subject: `Session Cancelled: ${sessionTopic}`,
      html: emailTemplate(name, body),
    });
  }

  /**
   * Notifies participants when a session is rescheduled.
   */
  async sendBookingRescheduled(name: string, email: string, sessionTopic: string, language: string, oldDate: string, newDate: string): Promise<void> {
    const body = `The session "<b>${sessionTopic}</b>" (${language}) has been rescheduled.<br><br><b>Old Time:</b> ${oldDate}<br><b>New Time:</b> ${newDate}`;
    await this.send({
      to: email,
      subject: `Session Rescheduled: ${sessionTopic}`,
      html: emailTemplate(name, body),
    });
  }

  /**
   * Notifies a reported user of the action taken or the reporter of the status update.
   */
  async sendReportUpdate(name: string, email: string, status: 'Resolved' | 'Rejected', reason?: string): Promise<void> {
    const subject = status === 'Resolved' ? 'Action Taken on Account' : 'Status Update on Reported Interaction';
    const body = status === 'Resolved' 
      ? `We have reviewed a report regarding your recent interaction and have decided to <b>Restrict Your Account</b> due to a violation of our community standards.`
      : `We have reviewed the report regarding your recent interaction and have decided <b>Not to Take Any Action</b> at this time.${reason ? `<br><br><b>Administrative Note:</b> ${reason}` : ''}`;

    await this.send({
      to: email,
      subject,
      html: emailTemplate(name, body),
    });
  }

  /**
   * Notifies a tutor of the outcome of their request to add new languages to their profile.
   */
  async sendLanguageVerificationUpdate(
    name: string,
    email: string,
    status: 'started' | 'approved' | 'rejected',
    languages?: string[],
    reason?: string,
  ): Promise<void> {
    let subject = '';
    let body = '';

    if (status === 'started') {
      subject = 'Language Verification Started';
      body = `Your request to add new languages (${languages?.join(
        ', ',
      )}) has been received and is currently under verification by our admin team. You will be notified once the verification is complete.`;
    } else if (status === 'approved') {
      subject = 'Language Verification Approved';
      body =
        'Great news! Your request to add new languages has been approved. Your profile has been updated with the new languages.';
    } else {
      subject = 'Language Verification Rejected';
      body =
        `We regret to inform you that your request to add new languages has been rejected by our admin team after reviewing your certification.${
          reason ? `<br><br><b>Reason:</b> ${reason}` : ''
        }`;
    }

    await this.send({
      to: email,
      subject,
      html: emailTemplate(name, body),
    });
  }

  /**
   * Utility to generate a random 6-digit numeric OTP.
   */
  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Utility to compare entered OTP with the stored one.
   */
  verifyOtp(entered: string, stored: string): boolean {
    return entered.trim() === stored;
  }
}
