// src/repositories/contracts.repository.ts

import { Prisma, ContractStatus } from '@prisma/client';
import prisma from '../lib/prisma';

export interface ContractsFilter {
    userId: string;
    page?: number;
    limit?: number;
    status?: ContractStatus;
    clientId?: string;
    search?: string;
}

export interface ContractItemData {
    name: string;
    description?: string | null;
    quantity: number;
    unit: string;
    unitPrice: number;
    vatRate: number;
    discount: number;
    totalNet: number;
    totalVat: number;
    totalGross: number;
    position: number;
}

export interface CreateContractData {
    number: string;
    title: string;
    description?: string | null;
    clientId: string;
    offerId?: string | null;
    userId: string;
    startDate?: Date | null;
    endDate?: Date | null;
    terms?: string | null;
    paymentTerms?: string | null;
    paymentDays: number;
    notes?: string | null;
    totalNet: number;
    totalVat: number;
    totalGross: number;
    items: ContractItemData[];
}

export interface UpdateContractData {
    title?: string;
    description?: string | null;
    status?: ContractStatus;
    startDate?: Date | null;
    endDate?: Date | null;
    signedAt?: Date | null;
    sentAt?: Date | null;
    terms?: string | null;
    paymentTerms?: string | null;
    paymentDays?: number;
    notes?: string | null;
    totalNet?: number;
    totalVat?: number;
    totalGross?: number;
    publicToken?: string | null;
}

const contractWithClientInclude = {
    client: true,
    _count: { select: { items: true } as const },
} as const;

const contractFullInclude = {
    client: true,
    offer: true,
    items: { orderBy: { position: 'asc' } as const },
    signatureLog: true,
} as const;

const contractWithUserInclude = {
    client: true,
    items: { orderBy: { position: 'asc' } as const },
    signatureLog: true,
    user: {
        select: {
            id: true,
            email: true,
            name: true,
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
                    logo: true,
                } as const,
            },
        } as const,
    },
} as const;

export class ContractsRepository {
    async findAll(filter: ContractsFilter) {
        const page = filter.page ?? 1;
        const limit = filter.limit ?? 10;

        const where: Prisma.ContractWhereInput = { userId: filter.userId };

        if (filter.status) where.status = filter.status;
        if (filter.clientId) where.clientId = filter.clientId;

        if (filter.search) {
            where.OR = [
                { number: { contains: filter.search, mode: 'insensitive' } },
                { title: { contains: filter.search, mode: 'insensitive' } },
                { client: { name: { contains: filter.search, mode: 'insensitive' } } },
            ];
        }

        const [contracts, total] = await Promise.all([
            prisma.contract.findMany({
                where,
                include: contractWithClientInclude,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.contract.count({ where }),
        ]);

        return { contracts, total, page, limit };
    }

    async findById(id: string, userId: string) {
        return prisma.contract.findFirst({
            where: { id, userId },
            include: contractFullInclude,
        });
    }

    async findByIdWithUser(id: string, userId: string) {
        return prisma.contract.findFirst({
            where: { id, userId },
            include: contractWithUserInclude,
        });
    }

    async findPublicToken(id: string, userId: string) {
        return prisma.contract.findFirst({
            where: { id, userId },
            select: { id: true, publicToken: true },
        });
    }

    async findByIdForPDFAttachment(id: string, userId: string) {
        return prisma.contract.findFirst({
            where: { id, userId },
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } as const },
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
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
                            } as const,
                        },
                    } as const,
                },
                signatureLog: true,
            },
        });
    }

    async create(data: CreateContractData) {
        const { items, ...contractData } = data;

        return prisma.contract.create({
            data: {
                ...contractData,
                items: { create: items },
            },
            include: {
                client: true,
                items: true,
            },
        });
    }

    async update(id: string, data: UpdateContractData) {
        return prisma.contract.update({
            where: { id },
            data,
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } as const },
            },
        });
    }

    async updateWithItems(
        id: string,
        data: UpdateContractData,
        items: ContractItemData[],
    ) {
        return prisma.$transaction(async (tx) => {
            await tx.contractItem.deleteMany({ where: { contractId: id } });

            return tx.contract.update({
                where: { id },
                data: {
                    ...data,
                    items: { create: items },
                },
                include: {
                    client: true,
                    items: { orderBy: { position: 'asc' } as const },
                },
            });
        });
    }

    async delete(id: string) {
        await prisma.contract.delete({ where: { id } });
    }

    async countByYear(userId: string, year: number) {
        return prisma.contract.count({
            where: {
                userId,
                createdAt: {
                    gte: new Date(`${year}-01-01`),
                    lt: new Date(`${year + 1}-01-01`),
                },
            },
        });
    }

    async count(userId: string) {
        return prisma.contract.count({ where: { userId } });
    }

    async groupByStatus(userId: string) {
        return prisma.contract.groupBy({
            by: ['status'],
            where: { userId },
            _count: { status: true },
        });
    }

    async aggregateTotalGross(userId: string, statusFilter?: ContractStatus) {
        return prisma.contract.aggregate({
            where: { userId, ...(statusFilter ? { status: statusFilter } : {}) },
            _sum: { totalGross: true },
        });
    }

    async findOfferForContract(offerId: string, userId: string) {
        return prisma.offer.findFirst({
            where: { id: offerId, userId },
            include: {
                client: true,
                items: { orderBy: { position: 'asc' } as const },
            },
        });
    }
}

export const contractsRepository = new ContractsRepository();