"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpService = exports.DevelopmentOtpService = void 0;
class DevelopmentOtpService {
    async sendOtp(identifier, code) {
        // In production, this would integrate with Twilio, SendGrid, etc.
        console.log(`[DEV OTP SERVICE] Sending OTP ${code} to ${identifier}`);
    }
}
exports.DevelopmentOtpService = DevelopmentOtpService;
exports.otpService = new DevelopmentOtpService();
