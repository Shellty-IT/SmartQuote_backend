import prisma from '../lib/prisma';

export async function generateOfferNumber(userId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `OFF/${year}/`;

    // Znajdź ostatni numer oferty dla tego użytkownika w tym roku
    const lastOffer = await prisma.offer.findFirst({
        where: {
            userId,
            number: { startsWith: prefix },
        },
        orderBy: { number: 'desc' },
        select: { number: true },
    });

    let nextNumber = 1;

    if (lastOffer) {
        const lastNumberStr = lastOffer.number.replace(prefix, '');
        const lastNum = parseInt(lastNumberStr, 10);
        if (!isNaN(lastNum)) {
            nextNumber = lastNum + 1;
        }
    }

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
}