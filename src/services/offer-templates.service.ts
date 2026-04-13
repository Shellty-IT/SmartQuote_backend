// src/services/offer-templates.service.ts

import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

export interface OfferTemplateItemInput {
    name: string;
    description?: string | null;
    quantity: number;
    unit?: string;
    unitPrice: number;
    vatRate?: number;
    discount?: number;
    isOptional?: boolean;
    variantName?: string | null;
}

export interface CreateOfferTemplateInput {
    name: string;
    description?: string | null;
    category?: string | null;
    defaultPaymentDays?: number;
    defaultTerms?: string | null;
    defaultNotes?: string | null;
    items: OfferTemplateItemInput[];
}

export interface UpdateOfferTemplateInput {
    name?: string;
    description?: string | null;
    category?: string | null;
    defaultPaymentDays?: number;
    defaultTerms?: string | null;
    defaultNotes?: string | null;
    items?: OfferTemplateItemInput[];
}

export interface GetOfferTemplatesParams {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
}

export class OfferTemplatesService {
    async create(userId: string, data: CreateOfferTemplateInput) {
        return prisma.offerTemplate.create({
            data: {
                userId,
                name: data.name,
                description: data.description,
                category: data.category,
                defaultPaymentDays: data.defaultPaymentDays ?? 14,
                defaultTerms: data.defaultTerms,
                defaultNotes: data.defaultNotes,
                items: {
                    create: data.items.map((item, index) => ({
                        name: item.name,
                        description: item.description,
                        quantity: item.quantity,
                        unit: item.unit ?? 'szt.',
                        unitPrice: item.unitPrice,
                        vatRate: item.vatRate ?? 23,
                        discount: item.discount ?? 0,
                        isOptional: item.isOptional ?? false,
                        variantName: item.variantName,
                        position: index,
                    })),
                },
            },
            include: {
                items: { orderBy: { position: 'asc' } },
            },
        });
    }

    async findById(id: string, userId: string) {
        return prisma.offerTemplate.findFirst({
            where: { id, userId },
            include: {
                items: { orderBy: { position: 'asc' } },
            },
        });
    }

    async findAll(userId: string, params: GetOfferTemplatesParams) {
        const page = params.page ?? 1;
        const limit = params.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.OfferTemplateWhereInput = { userId };

        if (params.search) {
            where.OR = [
                { name: { contains: params.search, mode: 'insensitive' } },
                { description: { contains: params.search, mode: 'insensitive' } },
                { category: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        if (params.category) {
            where.category = { equals: params.category, mode: 'insensitive' };
        }

        const [templates, total] = await Promise.all([
            prisma.offerTemplate.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    items: { orderBy: { position: 'asc' } },
                    _count: { select: { items: true } },
                },
            }),
            prisma.offerTemplate.count({ where }),
        ]);

        return { templates, total, page, limit };
    }

    async getCategories(userId: string) {
        const templates = await prisma.offerTemplate.findMany({
            where: { userId, category: { not: null } },
            select: { category: true },
            distinct: ['category'],
            orderBy: { category: 'asc' },
        });

        return templates
            .map((t) => t.category)
            .filter((c): c is string => c !== null);
    }

    async update(id: string, userId: string, data: UpdateOfferTemplateInput) {
        const existing = await prisma.offerTemplate.findFirst({
            where: { id, userId },
        });

        if (!existing) return null;

        const updateData: Prisma.OfferTemplateUpdateInput = {
            name: data.name,
            description: data.description,
            category: data.category,
            defaultPaymentDays: data.defaultPaymentDays,
            defaultTerms: data.defaultTerms,
            defaultNotes: data.defaultNotes,
        };

        if (data.items && data.items.length > 0) {
            return prisma.$transaction(async (tx) => {
                await tx.offerTemplateItem.deleteMany({ where: { templateId: id } });

                return tx.offerTemplate.update({
                    where: { id },
                    data: {
                        ...updateData,
                        items: {
                            create: data.items!.map((item, index) => ({
                                name: item.name,
                                description: item.description,
                                quantity: item.quantity,
                                unit: item.unit ?? 'szt.',
                                unitPrice: item.unitPrice,
                                vatRate: item.vatRate ?? 23,
                                discount: item.discount ?? 0,
                                isOptional: item.isOptional ?? false,
                                variantName: item.variantName,
                                position: index,
                            })),
                        },
                    },
                    include: {
                        items: { orderBy: { position: 'asc' } },
                    },
                });
            });
        }

        return prisma.offerTemplate.update({
            where: { id },
            data: updateData,
            include: {
                items: { orderBy: { position: 'asc' } },
            },
        });
    }

    async delete(id: string, userId: string) {
        const existing = await prisma.offerTemplate.findFirst({
            where: { id, userId },
        });

        if (!existing) return null;

        return prisma.offerTemplate.delete({ where: { id } });
    }
}

export const offerTemplatesService = new OfferTemplatesService();