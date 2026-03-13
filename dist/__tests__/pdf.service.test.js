"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// smartquote_backend/src/__tests__/pdf.service.test.ts
const library_1 = require("@prisma/client/runtime/library");
const pdf_service_1 = require("../services/pdf.service");
function d(val) {
    return new library_1.Decimal(val);
}
function createTestOffer(overrides = {}) {
    return {
        id: 'offer-test-001',
        number: 'OF/2025/001',
        title: 'Oferta testowa E2E',
        description: 'Opis oferty testowej',
        status: 'SENT',
        totalNet: d(1000),
        totalVat: d(230),
        totalGross: d(1230),
        currency: 'PLN',
        validUntil: new Date('2025-12-31'),
        notes: 'Uwagi do oferty',
        terms: 'Warunki platnosci: 14 dni',
        paymentDays: 14,
        createdAt: new Date('2025-06-01'),
        client: {
            id: 'client-001',
            type: 'COMPANY',
            name: 'Jan Kowalski',
            email: 'jan@example.com',
            phone: '+48 123 456 789',
            company: 'Firma ABC Sp. z o.o.',
            nip: '1234567890',
            address: 'ul. Testowa 15',
            city: 'Warszawa',
            postalCode: '00-001',
        },
        items: [
            {
                id: 'item-001',
                name: 'Usluga programistyczna',
                description: 'Implementacja systemu',
                quantity: d(10),
                unit: 'godz.',
                unitPrice: d(100),
                vatRate: d(23),
                discount: d(0),
                totalNet: d(1000),
                totalVat: d(230),
                totalGross: d(1230),
            },
        ],
        user: {
            id: 'user-001',
            email: 'sprzedawca@firma.pl',
            name: 'Adam Nowak',
            company: 'MojaFirma Sp. z o.o.',
            phone: '+48 987 654 321',
        },
        ...overrides,
    };
}
function createTestContract(overrides = {}) {
    return {
        id: 'contract-test-001',
        number: 'UM/2025/001',
        title: 'Umowa testowa',
        description: 'Opis umowy testowej',
        status: 'ACTIVE',
        totalNet: d(5000),
        totalVat: d(1150),
        totalGross: d(6150),
        currency: 'PLN',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        signedAt: new Date('2025-01-01'),
        terms: 'Warunki umowy ramowej',
        paymentTerms: 'Przelew na konto',
        paymentDays: 30,
        notes: 'Notatki do umowy',
        createdAt: new Date('2025-01-01'),
        client: {
            id: 'client-002',
            type: 'COMPANY',
            name: 'Maria Wisniewska',
            email: 'maria@example.com',
            phone: '+48 111 222 333',
            company: 'Klient XYZ S.A.',
            nip: '9876543210',
            address: 'ul. Przykladowa 7',
            city: 'Krakow',
            postalCode: '30-001',
        },
        items: [
            {
                id: 'citem-001',
                name: 'Abonament miesięczny',
                description: 'Wsparcie techniczne',
                quantity: d(12),
                unit: 'mies.',
                unitPrice: d(250),
                vatRate: d(23),
                discount: d(0),
                totalNet: d(3000),
                totalVat: d(690),
                totalGross: d(3690),
            },
            {
                id: 'citem-002',
                name: 'Licencja roczna',
                description: null,
                quantity: d(1),
                unit: 'szt.',
                unitPrice: d(2000),
                vatRate: d(23),
                discount: d(0),
                totalNet: d(2000),
                totalVat: d(460),
                totalGross: d(2460),
            },
        ],
        user: {
            id: 'user-001',
            email: 'sprzedawca@firma.pl',
            name: 'Adam Nowak',
            company: 'MojaFirma Sp. z o.o.',
            phone: '+48 987 654 321',
        },
        ...overrides,
    };
}
describe('PDFService — generateOfferPDF', () => {
    it('returns a valid PDF buffer', async () => {
        const offer = createTestOffer();
        const buffer = await pdf_service_1.pdfService.generateOfferPDF(offer);
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(500);
        const header = buffer.subarray(0, 5).toString('ascii');
        expect(header).toBe('%PDF-');
    });
    it('generates PDF with multiple items', async () => {
        const offer = createTestOffer({
            items: [
                {
                    id: 'i1',
                    name: 'Pozycja pierwsza',
                    description: 'Opis',
                    quantity: d(5),
                    unit: 'szt.',
                    unitPrice: d(200),
                    vatRate: d(23),
                    discount: d(10),
                    totalNet: d(900),
                    totalVat: d(207),
                    totalGross: d(1107),
                },
                {
                    id: 'i2',
                    name: 'Pozycja druga',
                    description: null,
                    quantity: d(1),
                    unit: 'godz.',
                    unitPrice: d(500),
                    vatRate: d(8),
                    discount: d(0),
                    totalNet: d(500),
                    totalVat: d(40),
                    totalGross: d(540),
                },
                {
                    id: 'i3',
                    name: 'Pozycja trzecia z dluga nazwa',
                    description: 'Bardzo dlugi opis pozycji',
                    quantity: d(100),
                    unit: 'mb',
                    unitPrice: d(15),
                    vatRate: d(0),
                    discount: d(5),
                    totalNet: d(1425),
                    totalVat: d(0),
                    totalGross: d(1425),
                },
            ],
        });
        const buffer = await pdf_service_1.pdfService.generateOfferPDF(offer);
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(1000);
    });
    it('handles offer with no description and no terms', async () => {
        const offer = createTestOffer({
            description: null,
            terms: null,
            notes: null,
        });
        const buffer = await pdf_service_1.pdfService.generateOfferPDF(offer);
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(500);
    });
    it('handles offer with no validUntil date', async () => {
        const offer = createTestOffer({ validUntil: null });
        const buffer = await pdf_service_1.pdfService.generateOfferPDF(offer);
        expect(buffer).toBeInstanceOf(Buffer);
    });
    it('handles PERSON client type', async () => {
        const offer = createTestOffer({
            client: {
                id: 'c-person',
                type: 'PERSON',
                name: 'Tomasz Osobowy',
                email: 'tomasz@example.com',
                phone: null,
                company: null,
                nip: null,
                address: null,
                city: null,
                postalCode: null,
            },
        });
        const buffer = await pdf_service_1.pdfService.generateOfferPDF(offer);
        expect(buffer).toBeInstanceOf(Buffer);
    });
    it('handles zero-value items', async () => {
        const offer = createTestOffer({
            totalNet: d(0),
            totalVat: d(0),
            totalGross: d(0),
            items: [
                {
                    id: 'zero',
                    name: 'Gratis',
                    description: 'Pozycja darmowa',
                    quantity: d(1),
                    unit: 'szt.',
                    unitPrice: d(0),
                    vatRate: d(23),
                    discount: d(0),
                    totalNet: d(0),
                    totalVat: d(0),
                    totalGross: d(0),
                },
            ],
        });
        const buffer = await pdf_service_1.pdfService.generateOfferPDF(offer);
        expect(buffer).toBeInstanceOf(Buffer);
    });
    it('handles user without company name', async () => {
        const offer = createTestOffer({
            user: {
                id: 'u-solo',
                email: 'solo@test.pl',
                name: 'Freelancer',
                company: null,
                phone: null,
            },
        });
        const buffer = await pdf_service_1.pdfService.generateOfferPDF(offer);
        expect(buffer).toBeInstanceOf(Buffer);
    });
});
describe('PDFService — generateContractPDF', () => {
    it('returns a valid PDF buffer', async () => {
        const contract = createTestContract();
        const buffer = await pdf_service_1.pdfService.generateContractPDF(contract);
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(500);
        const header = buffer.subarray(0, 5).toString('ascii');
        expect(header).toBe('%PDF-');
    });
    it('handles contract without optional fields', async () => {
        const contract = createTestContract({
            description: null,
            terms: null,
            paymentTerms: null,
            notes: null,
            startDate: null,
            endDate: null,
            signedAt: null,
        });
        const buffer = await pdf_service_1.pdfService.generateContractPDF(contract);
        expect(buffer).toBeInstanceOf(Buffer);
    });
    it('handles contract with many items', async () => {
        const items = Array.from({ length: 15 }, (_, i) => ({
            id: `item-${i}`,
            name: `Pozycja numer ${i + 1}`,
            description: i % 2 === 0 ? `Opis pozycji ${i + 1}` : null,
            quantity: d(i + 1),
            unit: 'szt.',
            unitPrice: d(100 + i * 50),
            vatRate: d(23),
            discount: d(i % 3 === 0 ? 5 : 0),
            totalNet: d((100 + i * 50) * (i + 1)),
            totalVat: d(Math.round((100 + i * 50) * (i + 1) * 0.23)),
            totalGross: d(Math.round((100 + i * 50) * (i + 1) * 1.23)),
        }));
        const contract = createTestContract({ items });
        const buffer = await pdf_service_1.pdfService.generateContractPDF(contract);
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(2000);
    });
    it('handles PERSON client with full address', async () => {
        const contract = createTestContract({
            client: {
                id: 'c-person',
                type: 'PERSON',
                name: 'Anna Osobowa',
                email: 'anna@example.com',
                phone: '+48 555 666 777',
                company: null,
                nip: null,
                address: 'ul. Prywatna 3/12',
                city: 'Gdansk',
                postalCode: '80-001',
            },
        });
        const buffer = await pdf_service_1.pdfService.generateContractPDF(contract);
        expect(buffer).toBeInstanceOf(Buffer);
    });
});
