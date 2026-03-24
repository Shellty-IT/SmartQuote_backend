// smartquote_backend/src/services/email/index.ts
import { EmailSender } from './sender';
import type { SmtpConfig } from '../../types';

class EmailService {
    private sender = new EmailSender();

    testConnection(config: SmtpConfig) {
        return this.sender.testConnection(config);
    }

    sendOfferAccepted(to: string, data: any, smtpConfig: SmtpConfig) {
        return this.sender.sendOfferAccepted(to, data, smtpConfig);
    }

    sendOfferRejected(to: string, data: any, smtpConfig: SmtpConfig) {
        return this.sender.sendOfferRejected(to, data, smtpConfig);
    }

    sendNewComment(to: string, data: any, smtpConfig: SmtpConfig) {
        return this.sender.sendNewComment(to, data, smtpConfig);
    }

    sendOfferLink(to: string, data: any, smtpConfig: SmtpConfig) {
        return this.sender.sendOfferLink(to, data, smtpConfig);
    }

    sendAcceptanceConfirmation(to: string, data: any, smtpConfig: SmtpConfig) {
        return this.sender.sendAcceptanceConfirmation(to, data, smtpConfig);
    }

    sendSignatureConfirmation(to: string, data: any, smtpConfig: SmtpConfig) {
        return this.sender.sendSignatureConfirmation(to, data, smtpConfig);
    }

    sendFollowUpReminder(to: string, data: any, smtpConfig: SmtpConfig) {
        return this.sender.sendFollowUpReminder(to, data, smtpConfig);
    }
}

export const emailService = new EmailService();