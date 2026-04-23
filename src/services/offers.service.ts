// src/services/offers.service.ts

import crypto from 'crypto';
import { OfferStatus } from '@prisma/client';
import { offersRepository, OfferItemData, UpdateOfferData } from '../repositories/offers.repository';
import { CreateOfferInput, UpdateOfferInput, OfferItemInput } from '../types';
import { generateOfferNumber } from '../utils/offerNumber';
import { emailService } from './email';
import { getDecryptedSmtpConfig } from './settings.service';
import { buildItemWithTotals, calculateOfferTotals, ItemWithTotals } from './shared/offer-calculations';
import { triggerPostMortem } from './shared/postmortem.utils';
import { NotFoundError, ValidationError, ExternalServiceError } from '../errors/domain.errors';

function mapItemToData(item: ItemWithTotals): OfferItemData {
    return {
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        discount: item.discount,
        totalNet: item.totalNet,
        totalVat: item.totalVat,
        totalGross: item.totalGross,
        position: item.position,
        isOptional: item.isOptional,
        isSelected: item.isSelected,
        minQuantity: item.minQuantity,
        maxQuantity: item.maxQuantity,
        variantName: item.variantName,
    };
}

export class OffersService {
    async create(userId: string, data: CreateOfferInput) {
        const client = await offersRepository.findById(data.clientId, userId).catch(() => null);

        const clientExists = await offersRepository
            .findAll({ userId, clientId: data.clientId, limit: '1', page: '1' })
            .then(() => true)
            .catch(() => false);

        void clientExists;

        const clientRecord = await (async () => {
            const result = await offersRepository.findAll({
                userId,
                clientId: data.clientId,
                limit: '1',
                page: '1',
            });
            return result.offers.length > 0 || data.clientId;
        })();

        if (!clientRecord) {
            throw new NotFoundError('Klient');
        }

        const number = await generateOfferNumber(userId);

        const itemsWithTotals = data.items.map((item: OfferItemInput, index: number) =>
            buildItemWithTotals(item, index),
        );

        const offerTotals = calculateOfferTotals(itemsWithTotals);

        return offersRepository.create({
            number,
            title: data.title,
            description: data.description,
            validUntil: data.validUntil ? new Date(data.validUntil) : null,
            notes: data.notes,
            terms: data.terms,
            paymentDays: data.paymentDays ?? 14,
            requireAuditTrail: data.requireAuditTrail ?? false,
            totalNet: offerTotals.totalNet,
            totalVat: offerTotals.totalVat,
            totalGross: offerTotals.totalGross,
            userId,
            clientId: data.clientId,
            items: itemsWithTotals.map(mapItemToData),
        });
    }

    async findById(id: string, userId: string) {
        const offer = await offersRepository.findById(id, userId);
        if (!offer) throw new NotFoundError('Oferta');
        return offer;
    }

    async findAll(
        userId: string,
        query: Record<string, string | undefined>,
    ) {
        return offersRepository.findAll({ userId, ...query });
    }

    async update(id: string, userId: string, data: UpdateOfferInput) {
        const existing = await offersRepository.findById(id, userId);
        if (!existing) throw new NotFoundError('Oferta');

        const previousStatus = existing.status;

        const updateData: UpdateOfferData = {
            title: data.title,
            description: data.description,
            validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
            notes: data.notes,
            terms: data.terms,
            paymentDays: data.paymentDays,
        };

        if (data.requireAuditTrail !== undefined) {
            updateData.requireAuditTrail = data.requireAuditTrail;
        }

        if (data.status) {
            updateData.status = data.status as OfferStatus;
            const now = new Date();
            const statusTimestamps: Partial<Record<string, keyof UpdateOfferData>> = {
                SENT: 'sentAt',
                VIEWED: 'viewedAt',
                ACCEPTED: 'acceptedAt',
                REJECTED: 'rejectedAt',
            };
            const timestampKey = statusTimestamps[data.status];
            if (timestampKey) {
                (updateData as Record<string, unknown>)[timestampKey] = now;
            }
        }

        let result;

        if (data.items && data.items.length > 0) {
            const itemsWithTotals = data.items.map((item: OfferItemInput, index: number) =>
                buildItemWithTotals(item, index),
            );

            const offerTotals = calculateOfferTotals(itemsWithTotals);

            result = await offersRepository.updateWithItems(
                id,
                {
                    ...updateData,
                    totalNet: offerTotals.totalNet,
                    totalVat: offerTotals.totalVat,
                    totalGross: offerTotals.totalGross,
                },
                itemsWithTotals.map(mapItemToData),
            );
        } else {
            result = await offersRepository.update(id, updateData);
        }

        const isTerminalChange =
            data.status &&
            (data.status === 'ACCEPTED' || data.status === 'REJECTED') &&
            previousStatus !== data.status;

        if (isTerminalChange) {
            triggerPostMortem(userId, id, data.status as 'ACCEPTED' | 'REJECTED', 'manual');
        }

        return result;
    }

    async delete(id: string, userId: string) {
        const existing = await offersRepository.findById(id, userId);
        if (!existing) throw new NotFoundError('Oferta');
        return offersRepository.delete(id);
    }

    async getStats(userId: string) {
        const [statuses, total, totalValue, acceptedValue] = await Promise.all([
            offersRepository.groupByStatus(userId),
            offersRepository.count(userId),
            offersRepository.aggregateTotalGross(userId),
            offersRepository.aggregateTotalGross(userId, 'ACCEPTED'),
        ]);

        return {
            total,
            byStatus: statuses.reduce(
                (acc, s) => {
                    acc[s.status] = {
                        count: s._count.status,
                        value: s._sum.totalGross?.toNumber() ?? 0,
                    };
                    return acc;
                },
                {} as Record<string, { count: number; value: number }>,
            ),
            totalValue: totalValue._sum.totalGross?.toNumber() ?? 0,
            acceptedValue: acceptedValue._sum.totalGross?.toNumber() ?? 0,
        };
    }

    async duplicate(id: string, userId: string) {
        const original = await offersRepository.findForDuplicate(id, userId);
        if (!original) throw new NotFoundError('Oferta');

        const number = await generateOfferNumber(userId);

        return offersRepository.create({
            number,
            title: `${original.title} (kopia)`,
            description: original.description,
            validUntil: null,
            notes: original.notes,
            terms: original.terms,
            paymentDays: original.paymentDays,
            requireAuditTrail: original.requireAuditTrail,
            totalNet: original.totalNet,
            totalVat: original.totalVat,
            totalGross: original.totalGross,
            userId,
            clientId: original.clientId,
            items: original.items.map((item) => ({
                name: item.name,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                unitPrice: item.unitPrice,
                vatRate: item.vatRate,
                discount: item.discount,
                totalNet: item.totalNet,
                totalVat: item.totalVat,
                totalGross: item.totalGross,
                position: item.position,
                isOptional: item.isOptional,
                isSelected: true,
                minQuantity: item.minQuantity,
                maxQuantity: item.maxQuantity,
                variantName: item.variantName,
            })),
        });
    }

    async publishOffer(offerId: string, userId: string) {
        const offer = await offersRepository.findByIdPublicFields(offerId, userId);
        if (!offer) throw new NotFoundError('Oferta');

        const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');

        if (offer.publicToken && offer.isInteractive) {
            return {
                publicToken: offer.publicToken,
                publicUrl: `${frontendUrl}/offer/view/${offer.publicToken}`,
                alreadyPublished: true,
            };
        }

        const publicToken = crypto.randomBytes(16).toString('base64url');

        const updated = await offersRepository.update(offerId, {
            publicToken,
            isInteractive: true,
            status: offer.status === 'DRAFT' ? 'SENT' : (offer.status as OfferStatus),
            sentAt: offer.status === 'DRAFT' ? new Date() : undefined,
        });

        return {
            publicToken: updated.publicToken,
            publicUrl: `${frontendUrl}/offer/view/${updated.publicToken}`,
            alreadyPublished: false,
        };
    }

    async unpublishOffer(offerId: string, userId: string) {
        const offer = await offersRepository.findById(offerId, userId);
        if (!offer) throw new NotFoundError('Oferta');

        await offersRepository.update(offerId, {
            publicToken: null,
            isInteractive: false,
        });

        return true;
    }

    async sendOfferToClient(offerId: string, userId: string): Promise<{ sent: boolean; email: string }> {
        const offer = await offersRepository.findByIdForEmail(offerId, userId);
        if (!offer) throw new NotFoundError('Oferta');

        if (!offer.client.email) {
            throw new ValidationError('Klient nie ma podanego adresu email');
        }

        const smtpConfig = await getDecryptedSmtpConfig(userId);
        if (!smtpConfig) {
            throw new ValidationError('Skonfiguruj skrzynkę pocztową w ustawieniach');
        }

        const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');
        let publicUrl: string;

        if (offer.publicToken && offer.isInteractive) {
            publicUrl = `${frontendUrl}/offer/view/${offer.publicToken}`;
        } else {
            const publishResult = await this.publishOffer(offerId, userId);
            publicUrl = publishResult.publicUrl;
        }

        const sent = await emailService.sendOfferLink(
            offer.client.email,
            {
                offerNumber: offer.number,
                offerTitle: offer.title,
                clientName: offer.client.name,
                totalGross: Number(offer.totalGross),
                currency: offer.currency,
                validUntil: offer.validUntil ? offer.validUntil.toISOString() : null,
                publicUrl,
                sellerName: offer.user.name ?? offer.user.email,
                companyName: offer.user.companyInfo?.name ?? null,
            },
            smtpConfig,
        );

        if (!sent) {
            throw new ExternalServiceError('SMTP', 'Nie udało się wysłać emaila. Sprawdź konfigurację SMTP');
        }

        return { sent: true, email: offer.client.email };
    }

    async getOfferAnalytics(offerId: string, userId: string) {
        const offer = await offersRepository.findForAnalytics(offerId, userId);
        if (!offer) throw new NotFoundError('Oferta');

        const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');

        const uniqueIps = new Set(
            offer.views.filter((v) => v.ipAddress).map((v) => v.ipAddress),
        );

        return {
            ...offer,
            uniqueVisitors: uniqueIps.size,
            publicUrl: offer.publicToken ? `${frontendUrl}/offer/view/${offer.publicToken}` : null,
        };
    }

    async getOfferComments(offerId: string, userId: string) {
        const offer = await offersRepository.findById(offerId, userId);
        if (!offer) throw new NotFoundError('Oferta');
        return offersRepository.findComments(offerId);
    }

    async addSellerComment(offerId: string, userId: string, content: string) {
        const offer = await offersRepository.findById(offerId, userId);
        if (!offer) throw new NotFoundError('Oferta');
        return offersRepository.createCommentWithInteraction(offerId, content);
    }
}

export const offersService = new OffersService();