import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
    console.log('🌱 Seedowanie bazy danych...\n');

    // Usuń istniejące dane
    await prisma.offerItem.deleteMany();
    await prisma.followUp.deleteMany();
    await prisma.offer.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();

    // Utwórz użytkownika
    const password = await bcrypt.hash('Test123!', 12);
    const user = await prisma.user.create({
        data: {
            email: 'test@smartquote.pl',
            password,
            name: 'Jan Kowalski',
        },
    });

    console.log(`✅ Użytkownik: ${user.email} / Test123!`);

    // Utwórz klientów
    const clients = await Promise.all([
        prisma.client.create({
            data: {
                userId: user.id,
                type: 'COMPANY',
                name: 'TechCorp Sp. z o.o.',
                email: 'kontakt@techcorp.pl',
                phone: '+48 123 456 789',
                company: 'TechCorp',
                nip: '1234567890',
                city: 'Warszawa',
                address: 'ul. Technologiczna 15',
                postalCode: '00-001',
            },
        }),
        prisma.client.create({
            data: {
                userId: user.id,
                type: 'COMPANY',
                name: 'Marketing Pro',
                email: 'biuro@marketingpro.pl',
                phone: '+48 987 654 321',
                company: 'Marketing Pro S.A.',
                nip: '0987654321',
                city: 'Kraków',
            },
        }),
        prisma.client.create({
            data: {
                userId: user.id,
                type: 'PERSON',
                name: 'Anna Nowak',
                email: 'anna.nowak@gmail.com',
                phone: '+48 555 123 456',
                city: 'Gdańsk',
            },
        }),
    ]);

    console.log(`✅ Klienci: ${clients.length}`);

    // Utwórz oferty
    const offers = await Promise.all([
        prisma.offer.create({
            data: {
                userId: user.id,
                clientId: clients[0].id,
                number: 'OFF/2024/001',
                title: 'System CRM Enterprise',
                description: 'Kompleksowy system CRM z modułami sprzedaży i marketingu',
                status: 'SENT',
                totalNet: 45000,
                totalVat: 10350,
                totalGross: 55350,
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                sentAt: new Date(),
                items: {
                    create: [
                        {
                            name: 'Licencja CRM Enterprise',
                            quantity: 1,
                            unitPrice: 30000,
                            vatRate: 23,
                            totalNet: 30000,
                            totalVat: 6900,
                            totalGross: 36900,
                            position: 0,
                        },
                        {
                            name: 'Wdrożenie i konfiguracja',
                            quantity: 40,
                            unit: 'godz.',
                            unitPrice: 250,
                            vatRate: 23,
                            totalNet: 10000,
                            totalVat: 2300,
                            totalGross: 12300,
                            position: 1,
                        },
                        {
                            name: 'Szkolenie użytkowników',
                            quantity: 20,
                            unit: 'godz.',
                            unitPrice: 250,
                            vatRate: 23,
                            totalNet: 5000,
                            totalVat: 1150,
                            totalGross: 6150,
                            position: 2,
                        },
                    ],
                },
            },
        }),
        prisma.offer.create({
            data: {
                userId: user.id,
                clientId: clients[1].id,
                number: 'OFF/2024/002',
                title: 'Strona internetowa + SEO',
                status: 'DRAFT',
                totalNet: 12500,
                totalVat: 2875,
                totalGross: 15375,
                items: {
                    create: [
                        {
                            name: 'Projekt i wykonanie strony',
                            quantity: 1,
                            unitPrice: 8000,
                            vatRate: 23,
                            totalNet: 8000,
                            totalVat: 1840,
                            totalGross: 9840,
                            position: 0,
                        },
                        {
                            name: 'Optymalizacja SEO',
                            quantity: 1,
                            unitPrice: 4500,
                            vatRate: 23,
                            totalNet: 4500,
                            totalVat: 1035,
                            totalGross: 5535,
                            position: 1,
                        },
                    ],
                },
            },
        }),
    ]);

    console.log(`✅ Oferty: ${offers.length}`);
    console.log('\n✅ Seedowanie zakończone!');
}

seed()
    .catch((e) => {
        console.error('❌ Błąd:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });