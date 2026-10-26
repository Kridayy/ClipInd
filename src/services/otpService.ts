export interface OtpService {
  sendOtp(identifier: string, code: string): Promise<void>;
}

export class DevelopmentOtpService implements OtpService {
  async sendOtp(identifier: string, code: string): Promise<void> {
    // In production, this would integrate with Twilio, SendGrid, etc.
    console.log(`[DEV OTP SERVICE] Sending OTP ${code} to ${identifier}`);
  }
}

export const otpService = new DevelopmentOtpService();
