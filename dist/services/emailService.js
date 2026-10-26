"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.DevelopmentEmailService = void 0;
class DevelopmentEmailService {
    async sendPasswordReset(email, token) {
        // In production, use a real email provider.
        console.log(`[DEV EMAIL SERVICE] Sending password reset link to ${email} with token: ${token}`);
    }
}
exports.DevelopmentEmailService = DevelopmentEmailService;
exports.emailService = new DevelopmentEmailService();
