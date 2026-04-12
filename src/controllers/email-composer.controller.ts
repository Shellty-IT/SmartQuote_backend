// src/controllers/email-composer.controller.ts
import { Response } from 'express';
import { emailComposerService } from '../services/email-composer.service';
import { successResponse, errorResponse } from '../utils/apiResponse';
import type { AuthenticatedRequest, EmailLogStatus } from '../types';

export const emailComposerController = {
    async sendEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const result = await emailComposerService.sendEmail(userId, req.body);

            if (result.status === 'FAILED') {
                res.status(200).json({
                    success: true,
                    data: {
                        id: result.id,
                        status: result.status,
                        warning: 'Wiadomość nie została wysłana — sprawdź konfigurację SMTP',
                    },
                });
                return;
            }

            res.status(201).json({ success: true, data: result });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Błąd wysyłki';

            if (message === 'SMTP_NOT_CONFIGURED') {
                res.status(422).json({
                    success: false,
                    error: 'SMTP_NOT_CONFIGURED',
                    message: 'Brak konfiguracji SMTP. Przejdź do Ustawienia → SMTP aby skonfigurować skrzynkę pocztową.',
                });
                return;
            }

            res.status(500).json({ success: false, error: 'SEND_EMAIL_ERROR', message });
        }
    },

    async sendDraft(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const result = await emailComposerService.sendDraft(userId, id);
            res.json({ success: true, data: result });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Błąd wysyłki szkicu';

            if (message === 'SMTP_NOT_CONFIGURED') {
                res.status(422).json({
                    success: false,
                    error: 'SMTP_NOT_CONFIGURED',
                    message: 'Brak konfiguracji SMTP. Przejdź do Ustawienia → SMTP aby skonfigurować skrzynkę pocztową.',
                });
                return;
            }

            res.status(500).json({ success: false, error: 'SEND_DRAFT_ERROR', message });
        }
    },

    async updateDraft(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const result = await emailComposerService.updateDraft(userId, id, req.body);
            res.json({ success: true, data: result });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Błąd aktualizacji szkicu';
            res.status(500).json({ success: false, error: 'UPDATE_DRAFT_ERROR', message });
        }
    },

    async deleteEmailLog(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            await emailComposerService.deleteEmailLog(userId, id);
            res.json({ success: true, data: { deleted: true } });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Błąd usuwania';
            res.status(500).json({ success: false, error: 'DELETE_EMAIL_ERROR', message });
        }
    },

    async getEmailLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const {
                page,
                limit,
                status,
                clientId,
                offerId,
                contractId,
                search,
            } = req.query as Record<string, string | undefined>;

            const result = await emailComposerService.getEmailLogs({
                userId,
                page: page ? parseInt(page) : 1,
                limit: limit ? Math.min(parseInt(limit), 50) : 20,
                status: status as EmailLogStatus | undefined,
                clientId,
                offerId,
                contractId,
                search,
            });

            res.json({
                success: true,
                data: result.items,
                meta: result.meta,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Błąd pobierania wiadomości';
            res.status(500).json({ success: false, error: 'GET_EMAIL_LOGS_ERROR', message });
        }
    },

    async getEmailLogById(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const log = await emailComposerService.getEmailLogById(userId, id);
            res.json({ success: true, data: log });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Błąd pobierania wiadomości';
            res.status(404).json({ success: false, error: 'EMAIL_LOG_NOT_FOUND', message });
        }
    },

    async getTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const templates = await emailComposerService.getTemplates(userId);
            res.json({ success: true, data: templates });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Błąd pobierania szablonów';
            res.status(500).json({ success: false, error: 'GET_TEMPLATES_ERROR', message });
        }
    },

    async getTemplateById(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const template = await emailComposerService.getTemplateById(userId, id);
            res.json({ success: true, data: template });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Szablon nie znaleziony';
            res.status(404).json({ success: false, error: 'TEMPLATE_NOT_FOUND', message });
        }
    },

    async createTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const template = await emailComposerService.createTemplate(userId, req.body);
            res.status(201).json({ success: true, data: template });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Błąd tworzenia szablonu';
            res.status(500).json({ success: false, error: 'CREATE_TEMPLATE_ERROR', message });
        }
    },

    async updateTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const template = await emailComposerService.updateTemplate(userId, id, req.body);
            res.json({ success: true, data: template });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Błąd aktualizacji szablonu';
            res.status(500).json({ success: false, error: 'UPDATE_TEMPLATE_ERROR', message });
        }
    },

    async deleteTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            await emailComposerService.deleteTemplate(userId, id);
            res.json({ success: true, data: { deleted: true } });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Błąd usuwania szablonu';
            res.status(500).json({ success: false, error: 'DELETE_TEMPLATE_ERROR', message });
        }
    },
};