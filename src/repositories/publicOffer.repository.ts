// src/repositories/publicOffer.repository.ts
import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

const offerPublicIncludeFull = {
    items: { orderBy: { position: 'asc' } },
    client: {
        select: {
            name: true,
            company: true,
            email: true,
        },
    },
    user: {
        select: {
            name: true,
            email: true,
            phone: true,
            companyInfo: {
                select: {
                    name: true,
                    nip: true,
                    address: true,
                    city: true,
                    postalCode: true,
                    phone: true,
                    email: true,
                    website: true,
                    logo: true,
                    primaryColor: true,
                },
            },
        },
    },
    comments: {
        orderBy: { createdAt: 'asc' as const },
    },
    acceptanceLog: {
        select: {
            contentHash: true,
            acceptedAt: true,
            selectedVariant: true,
            totalGross: true,
            currency: true,
        },
    },
} satisfies Prisma.OfferInclude;

const offerPublicIncludeForView = {
    client: { select: { name: true } },
} satisfies Prisma.OfferInclude;

const offerPublicIncludeForAccept = {
    items: { orderBy: { position: 'asc' as const } },
    client: { select: { id: true, name: true, company: true, email: true } },
    user: {
        select: {
            id: true,
            email: true,
            name: true,
            companyInfo: { select: { name: true } },
        },
    },
} satisfies Prisma.OfferInclude;

const offerPublicIncludeForReject = {
    client: { select: { id: true, name: true, company: true } },
    user: { select: { id: true, email: true, name: true } },
} satisfies Prisma.OfferInclude;

const offerPublicIncludeForComment = {
    client: { select: { name: true } },
    user: { select: { email: true } },
} satisfies Prisma.OfferInclude;

export const publicOfferRepository = {
    findByTokenFull(token: string) {
        return prisma.offer.findFirst({
            where: { publicToken: token, isInteractive: true },
            include: offerPublicIncludeFull,
        });
    },

    findByTokenForView(token: string) {
        return prisma.offer.findFirst({
            where: { publicToken: token, isInteractive: true },
            select: {
                id: true,
                validUntil: true,
                status: true,
                userId: true,
                number: true,
                title: true,
                client: { select: { name: true } },
            },
        });
    },

    findByTokenForAccept(token: string) {
        return prisma.offer.findFirst({
            where: { publicToken: token, isInteractive: true },
            include: offerPublicIncludeForAccept,
        });
    },

    findByTokenForReject(token: string) {
        return prisma.offer.findFirst({
            where: { publicToken: token, isInteractive: true },
            include: offerPublicIncludeForReject,
        });
    },

    findByTokenForComment(token: string) {
        return prisma.offer.findFirst({
            where: { publicToken: token, isInteractive: true },
            select: {
                id: true,
                validUntil: true,
                status: true,
                userId: true,
                number: true,
                title: true,
                client: { select: { name: true } },
                user: { select: { email: true } },
            },
        });
    },

    findByTokenForTracking(token: string) {
        return prisma.offer.findFirst({
            where: { publicToken: token, isInteractive: true },
            select: { id: true, validUntil: true },
        });
    },

    async registerViewTransaction(
        offerId: string,
        isFirstView: boolean,
        ipAddress: string | null,
        userAgent: string | null,
    ) {
        const statusUpdate: Prisma.OfferUpdateInput = {
            viewCount: { increment: 1 },
            lastViewedAt: new Date(),
            ...(isFirstView ? { status: 'VIEWED' } : {}),
        };

        return prisma.$transaction([
            prisma.offerView.create({
                data: { offerId, ipAddress, userAgent },
            }),
            prisma.offerInteraction.create({
                data: {
                    offerId,
                    type: 'VIEW',
                    details: { ipAddress, userAgent },
                },
            }),
            prisma.offer.update({
                where: { id: offerId },
                data: statusUpdate,
            }),
        ]);
    },

    async acceptOfferTransaction(
        offerId: string,
        acceptedAt: Date,
        clientSelectedData: Prisma.InputJsonValue,
        interactionDetails: Prisma.InputJsonValue,
        auditLog: {
            ipAddress: string;
            userAgent: string;
            contentHash: string;
            acceptedData: Prisma.InputJsonValue;
            clientName: string;
            clientEmail: string;
            selectedVariant: string | null;
            totalNet: number;
            totalVat: number;
            totalGross: number;
            currency: string;
        } | null,
    ) {
        const ops: Prisma.PrismaPromise<unknown>[] = [
            prisma.offer.update({
                where: { id: offerId },
                data: {
                    status: 'ACCEPTED',
                    acceptedAt,
                    clientSelectedData,
                },
            }),
            prisma.offerInteraction.create({
                data: { offerId, type: 'ACCEPT', details: interactionDetails },
            }),
        ];

        if (auditLog) {
            ops.push(
                prisma.offerAcceptanceLog.create({
                    data: { offerId, ...auditLog },
                }),
            );
        }

        return prisma.$transaction(ops);
    },

    rejectOfferTransaction(offerId: string, reason: string | null) {
        return prisma.$transaction([
            prisma.offer.update({
                where: { id: offerId },
                data: { status: 'REJECTED', rejectedAt: new Date() },
            }),
            prisma.offerInteraction.create({
                data: { offerId, type: 'REJECT', details: { reason } },
            }),
        ]);
    },

    async addCommentTransaction(offerId: string, content: string) {
        const [comment] = await prisma.$transaction([
            prisma.offerComment.create({
                data: { offerId, author: 'CLIENT', content },
            }),
            prisma.offerInteraction.create({
                data: {
                    offerId,
                    type: 'COMMENT',
                    details: { content, author: 'CLIENT' },
                },
            }),
        ]);
        return comment;
    },

    trackSelectionInteraction(
        offerId: string,
        items: Array<{ id: string; isSelected: boolean; quantity: number }>,
        selectedVariant: string | null,
    ) {
        return prisma.offerInteraction.create({
            data: {
                offerId,
                type: 'ITEM_SELECT',
                details: { items, selectedVariant },
            },
        });
    },
};