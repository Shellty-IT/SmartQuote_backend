// src/services/contracts.service.ts
import { ContractStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { config } from '../config';
import {
    contractsRepository,
    ContractItemData,
    UpdateContractData,
} from '../repositories/contracts.repository';
import {
    ContractItemInput,
    CreateContractInput,
    UpdateContractInput,
    GetContractsParams,
} from '../types';
import { NotFoundError } from '../errors/domain.errors';

function toDate(value: Date | string | undefined | null): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    return new Date(value);
}

function generateContractNumberFormat(count: number): string {
    const year = new Date().getFullYear();
    const number = String(count + 1).padStart(3, '0');
    return `UMW/${year}/${number}`;
}

function calculateItem(item: ContractItemInput): ContractItemData {
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

function sumItems(items: ContractItemData[]) {
    return {
        totalNet: items.reduce((sum, i) => sum + i.totalNet, 0),
        totalVat: items.reduce((sum, i) => sum + i.totalVat, 0),
        totalGross: items.reduce((sum, i) => sum + i.totalGross, 0),
    };
}

async function generateContractNumber(userId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await contractsRepository.countByYear(userId, year);
    return generateContractNumberFormat(count);
}

export class ContractsService {
    async getContracts(params: GetContractsParams) {
        const { userId, page = 1, limit = 10, status, clientId, search } = params;

        const result = await contractsRepository.findAll({
            userId,
            page,
            limit,
            status: status as ContractStatus | undefined,
            clientId,
            search,
        });

        return {
            data: result.contracts,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: Math.ceil(result.total / result.limit),
            },
        };
    }

    async getContractById(id: string, userId: string) {
        return contractsRepository.findById(id, userId);
    }

    async createContract(userId: string, data: CreateContractInput) {
        const number = await generateContractNumber(userId);

        const calculatedItems = data.items.map((item: ContractItemInput, index: number) => ({
            ...calculateItem(item),
            position: item.position ?? index,
        }));

        const totals = sumItems(calculatedItems);

        return contractsRepository.create({
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
            ...totals,
            items: calculatedItems,
        });
    }

    async updateContract(id: string, userId: string, data: UpdateContractInput) {
        const existing = await contractsRepository.findById(id, userId);
        if (!existing) throw new NotFoundError('Umowa');

        const updateData: UpdateContractData = {
            title: data.title,
            description: data.description,
            status: data.status as ContractStatus | undefined,
            startDate: data.startDate !== undefined ? toDate(data.startDate) : undefined,
            endDate: data.endDate !== undefined ? toDate(data.endDate) : undefined,
            signedAt: data.signedAt !== undefined ? toDate(data.signedAt) : undefined,
            terms: data.terms,
            paymentTerms: data.paymentTerms,
            paymentDays: data.paymentDays,
            notes: data.notes,
        };

        if (data.items && data.items.length > 0) {
            const calculatedItems = data.items.map((item: ContractItemInput, index: number) => ({
                ...calculateItem(item),
                position: item.position ?? index,
            }));

            const totals = sumItems(calculatedItems);

            return contractsRepository.updateWithItems(
                id,
                { ...updateData, ...totals },
                calculatedItems,
            );
        }

        return contractsRepository.update(id, updateData);
    }

    async updateContractStatus(id: string, userId: string, status: ContractStatus) {
        const existing = await contractsRepository.findById(id, userId);
        if (!existing) throw new NotFoundError('Umowa');

        const updateData: UpdateContractInput = { status };

        if (status === 'ACTIVE') {
            updateData.signedAt = new Date();
        } else if (status === 'PENDING_SIGNATURE') {
            (updateData as Record<string, unknown>).sentAt = new Date();
        }

        return this.updateContract(id, userId, updateData);
    }

    async deleteContract(id: string, userId: string) {
        const existing = await contractsRepository.findById(id, userId);
        if (!existing) throw new NotFoundError('Umowa');
        await contractsRepository.delete(id);
        return true;
    }

    async createContractFromOffer(offerId: string, userId: string) {
        const offer = await contractsRepository.findOfferForContract(offerId, userId);
        if (!offer) throw new NotFoundError('Oferta');

        return this.createContract(userId, {
            title: `Umowa - ${offer.title}`,
            description: offer.description ?? undefined,
            clientId: offer.clientId,
            offerId: offer.id,
            terms: offer.terms ?? undefined,
            paymentDays: offer.paymentDays,
            items: offer.items.map((item) => ({
                name: item.name,
                description: item.description ?? undefined,
                quantity: Number(item.quantity),
                unit: item.unit,
                unitPrice: Number(item.unitPrice),
                vatRate: Number(item.vatRate),
                discount: Number(item.discount),
                position: item.position,
            })),
        });
    }

    async getContractsStats(userId: string) {
        const [total, byStatus, values, activeContracts] = await Promise.all([
            contractsRepository.count(userId),
            contractsRepository.groupByStatus(userId),
            contractsRepository.aggregateTotalGross(userId),
            contractsRepository.aggregateTotalGross(userId, 'ACTIVE'),
        ]);

        const statusCounts: Record<string, number> = {
            DRAFT: 0,
            PENDING_SIGNATURE: 0,
            ACTIVE: 0,
            COMPLETED: 0,
            TERMINATED: 0,
            EXPIRED: 0,
        };

        byStatus.forEach((item) => {
            statusCounts[item.status] = item._count.status;
        });

        return {
            total,
            byStatus: statusCounts,
            totalValue: Number(values._sum.totalGross ?? 0),
            activeValue: Number(activeContracts._sum.totalGross ?? 0),
        };
    }

    async publishContract(id: string, userId: string) {
        const contract = await contractsRepository.findPublicToken(id, userId);
        if (!contract) throw new NotFoundError('Umowa');

        const frontendUrl = config.frontendUrl.replace(/\/$/, '');

        if (contract.publicToken) {
            return {
                publicToken: contract.publicToken,
                publicUrl: `${frontendUrl}/contract/view/${contract.publicToken}`,
                alreadyPublished: true,
            };
        }

        const token = randomBytes(32).toString('hex');
        await contractsRepository.update(id, { publicToken: token });

        return {
            publicToken: token,
            publicUrl: `${frontendUrl}/contract/view/${token}`,
            alreadyPublished: false,
        };
    }

    async unpublishContract(id: string, userId: string) {
        const contract = await contractsRepository.findById(id, userId);
        if (!contract) throw new NotFoundError('Umowa');

        await contractsRepository.update(id, { publicToken: null });
        return { unpublished: true };
    }
}

export const contractsService = new ContractsService();