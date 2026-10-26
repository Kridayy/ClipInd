export interface EmailService {
  sendPasswordReset(email: string, token: string): Promise<void>;
}

export class DevelopmentEmailService implements EmailService {
  async sendPasswordReset(email: string, token: string): Promise<void> {
    // In production, use a real email provider.
    console.log(`[DEV EMAIL SERVICE] Sending password reset link to ${email} with token: ${token}`);
  }
}

export const emailService = new DevelopmentEmailService();
