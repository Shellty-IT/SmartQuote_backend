"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
// smartquote_backend/src/services/email/index.ts
const sender_1 = require("./sender");
class EmailService {
    constructor() {
        this.sender = new sender_1.EmailSender();
    }
    testConnection(config) {
        return this.sender.testConnection(config);
    }
    sendOfferAccepted(to, data, smtpConfig) {
        return this.sender.sendOfferAccepted(to, data, smtpConfig);
    }
    sendOfferRejected(to, data, smtpConfig) {
        return this.sender.sendOfferRejected(to, data, smtpConfig);
    }
    sendNewComment(to, data, smtpConfig) {
        return this.sender.sendNewComment(to, data, smtpConfig);
    }
    sendOfferLink(to, data, smtpConfig) {
        return this.sender.sendOfferLink(to, data, smtpConfig);
    }
    sendAcceptanceConfirmation(to, data, smtpConfig) {
        return this.sender.sendAcceptanceConfirmation(to, data, smtpConfig);
    }
    sendSignatureConfirmation(to, data, smtpConfig) {
        return this.sender.sendSignatureConfirmation(to, data, smtpConfig);
    }
    sendFollowUpReminder(to, data, smtpConfig) {
        return this.sender.sendFollowUpReminder(to, data, smtpConfig);
    }
}
exports.emailService = new EmailService();
