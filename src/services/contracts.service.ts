// smartquote_backend/src/services/contracts.service.ts

import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import {
    ContractItemInput,
    CreateContractInput,
    UpdateContractInput,
    GetContractsParams
} from '@/types';

function toDate(value: Date | string | undefined | null): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    return new Date(value);
}

async function generateContractNumber(userId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.contract.count({
        where: {
            userId,
            createdAt: {
                gte: new Date(`${year}-01-01`),
                lt: new Date(`${year + 1}-01-01`),
            },
        },
    });
    const number = String(count + 1).padStart(3, '0');
    return `UMW/${year}/${number}`;
}

function calculateItem(item: ContractItemInput) {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const vatRate = Number(item.vatRate ?? 23);
    const discount = Number(item.discount ?? 0);

    const netBeforeDiscount = quantity * unitPrice;
    const discountAmount = netBeforeDiscount * (discount / 100);
    const totalNet = netBeforeDiscount - discountAmount;
    const totalVat = totalNet * (vatRate / 100);
    const totalGross = totalNet + totalVat;

    return {
        name: item.name,
        description: item.description,
        quantity,
        unit: item.unit ?? 'szt.',
        unitPrice,
        vatRate,
        discount,
        totalNet,
        totalVat,
        totalGross,
        position: item.position ?? 0,
    };
}

export async function getContracts(params: GetContractsParams) {
    const { userId, page = 1, limit = 10, status, clientId, search } = params;

    const where: Prisma.ContractWhereInput = { userId };

    if (status) {
        where.status = status;
    }

    if (clientId) {
        where.clientId = clientId;
    }

    if (search) {
        where.OR = [
            { number: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
            { client: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }

    const [contracts, total] = await Promise.all([
        prisma.contract.findMany({
            where,
            include: {
                client: true,
                _count: { select: { items: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.contract.count({ where }),
    ]);

    return {
        data: contracts,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

export async function getContractById(id: string, userId: string) {
    const contract = await prisma.contract.findFirst({
        where: { id, userId },
        include: {
            client: true,
            offer: true,
            items: { orderBy: { position: 'asc' } },
            signatureLog: true,
        },
    });

    return contract;
}

export async function createContract(userId: string, data: CreateContractInput) {
    const number = await generateContractNumber(userId);

    const calculatedItems = data.items.map((item, index) => ({
        ...calculateItem(item),
        position: item.position ?? index,
    }));

    const totalNet = calculatedItems.reduce((sum, item) => sum + item.totalNet, 0);
    const totalVat = calculatedItems.reduce((sum, item) => sum + item.totalVat, 0);
    const totalGross = calculatedItems.reduce((sum, item) => sum + item.totalGross, 0);

    const contract = await prisma.contract.create({
        data: {
            number,
            title: data.title,
            description: data.description,
            clientId: data.clientId,
            offerId: data.offerId,
            userId,
            startDate: toDate(data.startDate),
            endDate: toDate(data.endDate),
            terms: data.terms,
            paymentTerms: data.paymentTerms,
            paymentDays: data.paymentDays ?? 14,
            notes: data.notes,
            totalNet,
            totalVat,
            totalGross,
            items: {
                create: calculatedItems,
            },
        },
        include: {
            client: true,
            items: true,
        },
    });

    return contract;
}

export async function updateContract(id: string, userId: string, data: UpdateContractInput) {
    const existing = await prisma.contract.findFirst({
        where: { id, userId },
    });

    if (!existing) {
        return null;
    }

    let itemsData = undefined;
    let totals = {};

    if (data.items) {
        await prisma.contractItem.deleteMany({ where: { contractId: id } });

        const calculatedItems = data.items.map((item, index) => ({
            ...calculateItem(item),
            position: item.position ?? index,
        }));

        itemsData = { create: calculatedItems };

        totals = {
            totalNet: calculatedItems.reduce((sum, item) => sum + item.totalNet, 0),
            totalVat: calculatedItems.reduce((sum, item) => sum + item.totalVat, 0),
            totalGross: calculatedItems.reduce((sum, item) => sum + item.totalGross, 0),
        };
    }

    const contract = await prisma.contract.update({
        where: { id },
        data: {
            title: data.title,
            description: data.description,
            status: data.status,
            startDate: data.startDate !== undefined ? toDate(data.startDate) : undefined,
            endDate: data.endDate !== undefined ? toDate(data.endDate) : undefined,
            signedAt: data.signedAt !== undefined ? toDate(data.signedAt) : undefined,
            terms: data.terms,
            paymentTerms: data.paymentTerms,
            paymentDays: data.paymentDays,
            notes: data.notes,
            ...totals,
            items: itemsData,
        },
        include: {
            client: true,
            items: { orderBy: { position: 'asc' } },
        },
    });

    return contract;
}

export async function deleteContract(id: string, userId: string) {
    const existing = await prisma.contract.findFirst({
        where: { id, userId },
    });

    if (!existing) {
        return false;
    }

    await prisma.contract.delete({ where: { id } });
    return true;
}

export async function createContractFromOffer(offerId: string, userId: string) {
    const offer = await prisma.offer.findFirst({
        where: { id: offerId, userId },
        include: {
            client: true,
            items: { orderBy: { position: 'asc' } },
        },
    });

    if (!offer) {
        return null;
    }

    const contractData: CreateContractInput = {
        title: `Umowa - ${offer.title}`,
        description: offer.description ?? undefined,
        clientId: offer.clientId,
        offerId: offer.id,
        terms: offer.terms ?? undefined,
        paymentDays: offer.paymentDays,
        items: offer.items.map(item => ({
            name: item.name,
            description: item.description ?? undefined,
            quantity: Number(item.quantity),
            unit: item.unit,
            unitPrice: Number(item.unitPrice),
            vatRate: Number(item.vatRate),
            discount: Number(item.discount),
            position: item.position,
        })),
    };

    return createContract(userId, contractData);
}

export async function getContractsStats(userId: string) {
    const [total, byStatus, values] = await Promise.all([
        prisma.contract.count({ where: { userId } }),
        prisma.contract.groupBy({
            by: ['status'],
            where: { userId },
            _count: { status: true },
        }),
        prisma.contract.aggregate({
            where: { userId },
            _sum: { totalGross: true },
        }),
        prisma.contract.aggregate({
            where: { userId, status: 'ACTIVE' },
            _sum: { totalGross: true },
        }),
    ]);

    const statusCounts: Record<string, number> = {
        DRAFT: 0,
        PENDING_SIGNATURE: 0,
        ACTIVE: 0,
        COMPLETED: 0,
        TERMINATED: 0,
        EXPIRED: 0,
    };

    byStatus.forEach(item => {
        statusCounts[item.status] = item._count.status;
    });

    const activeContracts = await prisma.contract.aggregate({
        where: { userId, status: 'ACTIVE' },
        _sum: { totalGross: true },
    });

    return {
        total,
        byStatus: statusCounts,
        totalValue: Number(values._sum.totalGross ?? 0),
        activeValue: Number(activeContracts._sum.totalGross ?? 0),
    };
}

export default {
    getContracts,
    getContractById,
    createContract,
    updateContract,
    deleteContract,
    createContractFromOffer,
    getContractsStats,
};