"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSystemPrompt = buildSystemPrompt;
exports.buildChatPrompt = buildChatPrompt;
exports.buildOfferGenerationPrompt = buildOfferGenerationPrompt;
exports.buildEmailPrompt = buildEmailPrompt;
exports.buildClientAnalysisPrompt = buildClientAnalysisPrompt;
exports.buildPriceInsightPrompt = buildPriceInsightPrompt;
exports.buildObserverPrompt = buildObserverPrompt;
exports.buildClosingStrategyPrompt = buildClosingStrategyPrompt;
exports.buildPostMortemPrompt = buildPostMortemPrompt;
const core_1 = require("./core");
function buildSystemPrompt(context) {
    return `Jesteś SmartQuote AI - inteligentnym asystentem do zarządzania ofertami, umowami i relacjami z klientami.

TWOJE MOŻLIWOŚCI:
1. Pomagasz tworzyć profesjonalne oferty handlowe
2. Analizujesz klientów i sugerujesz działania follow-up
3. Generujesz treści: emaile, opisy produktów, notatki
4. Odpowiadasz na pytania o dane w systemie
5. Sugerujesz optymalizacje i najlepsze praktyki sprzedażowe

KONTEKST UŻYTKOWNIKA:
- Liczba klientów: ${context.stats?.totalClients || 0}
- Aktywne oferty: ${context.stats?.activeOffers || 0}
- Zaległe follow-upy: ${context.stats?.pendingFollowUps || 0}
- Przychód w tym miesiącu: ${context.stats?.monthlyRevenue?.toLocaleString('pl-PL')} PLN

OSTATNI KLIENCI (do 10):
${context.clients?.slice(0, 10).map(c => `- ${c.name}${c.company ? ` (${c.company})` : ''} - ${c.type === 'PERSON' ? 'Osoba' : 'Firma'}`).join('\n') || 'Brak klientów'}

OSTATNIE OFERTY (do 5):
${context.offers?.slice(0, 5).map(o => `- ${o.number}: ${o.title} - ${core_1.offerStatusLabels[o.status] || o.status} - ${o.totalGross} PLN dla ${o.client?.name || o.client?.company || 'Nieznany'}`).join('\n') || 'Brak ofert'}

ZALEGŁE FOLLOW-UPY:
${context.followUps?.filter(f => f.status === 'PENDING').slice(0, 5).map(f => `- ${f.title} (${core_1.followUpTypeLabels[f.type] || f.type}) - priorytet: ${core_1.priorityLabels[f.priority] || f.priority} - termin: ${new Date(f.dueDate).toLocaleDateString('pl-PL')}`).join('\n') || 'Brak zaległych follow-upów'}

ZASADY:
- Odpowiadaj zawsze po polsku
- Bądź konkretny i profesjonalny
- Formatuj odpowiedzi używając Markdown
- Jeśli nie masz wystarczających informacji, dopytaj
- Sugeruj konkretne kwoty w PLN gdy to możliwe
- Pamiętaj o stawkach VAT (23%, 8%, 5%, 0%)
- Używaj polskich nazw dla statusów i priorytetów`;
}
function buildChatPrompt(systemPrompt, conversationHistory, message) {
    let fullPrompt = systemPrompt + '\n\n';
    if (conversationHistory.length > 0) {
        fullPrompt += 'POPRZEDNIA ROZMOWA:\n';
        conversationHistory.forEach(msg => {
            const role = msg.role === 'user' ? 'Użytkownik' : 'Asystent';
            fullPrompt += `${role}: ${msg.content}\n`;
        });
        fullPrompt += '\n';
    }
    fullPrompt += `Użytkownik: ${message}\n\nAsystent:`;
    return fullPrompt;
}
function buildOfferGenerationPrompt(description) {
    return `Na podstawie poniższego opisu wygeneruj szczegółową ofertę handlową w formacie JSON.

OPIS: ${description}

Zwróć TYLKO JSON (bez żadnego dodatkowego tekstu, bez markdown) w formacie:
{
  "title": "Tytuł oferty",
  "items": [
    {
      "name": "Nazwa pozycji",
      "description": "Opis",
      "quantity": 1,
      "unit": "szt.",
      "unitPrice": 1000,
      "vatRate": 23
    }
  ],
  "notes": "Uwagi do oferty",
  "validDays": 14
}

Pamiętaj:
- Ceny podawaj netto w PLN
- Używaj realistycznych stawek rynkowych
- Dodaj 2-5 pozycji
- VAT zazwyczaj 23%`;
}
function buildEmailPrompt(type, context) {
    const templates = {
        offer_send: `Napisz profesjonalny email do klienta ${context.clientName} z przesłaniem oferty "${context.offerTitle || 'handlowej'}".`,
        followup: `Napisz uprzejmy email follow-up do klienta ${context.clientName} w sprawie wcześniejszej oferty.`,
        thank_you: `Napisz email z podziękowaniem dla klienta ${context.clientName} za współpracę.`,
        reminder: `Napisz delikatne przypomnienie dla klienta ${context.clientName} o zbliżającym się terminie.`,
    };
    return `${templates[type]}

${context.customContext ? `Dodatkowy kontekst: ${context.customContext}` : ''}

Zasady:
- Ton profesjonalny ale przyjazny
- Język polski
- Długość: 3-5 zdań
- Zakończ wezwaniem do działania
- Zwróć TYLKO treść emaila, bez tematu`;
}
function buildClientAnalysisPrompt(client) {
    return `Przeanalizuj tego klienta i zasugeruj działania:

KLIENT:
- Nazwa: ${client.name}
- Firma: ${client.company || 'Brak'}
- Typ: ${client.type}
- Email: ${client.email}
- Status: ${client.isActive ? 'Aktywny' : 'Nieaktywny'}

OFERTY (${client.offers.length}):
${client.offers.map(o => `- ${o.title}: ${o.status} - ${o.totalGross} PLN`).join('\n') || 'Brak'}

UMOWY (${client.contracts.length}):
${client.contracts.map(c => `- ${c.title}: ${c.status}`).join('\n') || 'Brak'}

FOLLOW-UPY (${client.followUps.length}):
${client.followUps.map(f => `- ${f.title}: ${f.status} (${f.type})`).join('\n') || 'Brak'}

Zwróć TYLKO JSON (bez żadnego dodatkowego tekstu, bez markdown) w formacie:
{
  "score": 7,
  "potential": "wysoki",
  "summary": "Krótkie podsumowanie",
  "recommendations": ["Rekomendacja 1", "Rekomendacja 2"],
  "nextAction": "Sugerowane następne działanie",
  "risks": ["Potencjalne ryzyko 1"]
}`;
}
function buildPriceInsightPrompt(itemName, category, historicalSummary, legacySummary) {
    return `Przeanalizuj cenę usługi/produktu i zasugeruj optymalne widełki cenowe.

USŁUGA/PRODUKT: "${itemName}"
${category ? `KATEGORIA: ${category}` : ''}

DANE HISTORYCZNE UŻYTKOWNIKA:
${historicalSummary}

WNIOSKI Z ZAKOŃCZONYCH OFERT (Feedback Loop):
${legacySummary}

Na podstawie danych historycznych użytkownika i Twojej wiedzy o cenach rynkowych w Polsce, zwróć TYLKO JSON (bez markdown):
{
  "suggestedMin": <number - dolna granica sugerowanej ceny netto w PLN>,
  "suggestedMax": <number - górna granica sugerowanej ceny netto w PLN>,
  "marketAnalysis": "<string - krótka analiza rynkowa 2-3 zdania po polsku>",
  "marginWarning": "<string | null - ostrzeżenie jeśli historyczne ceny są poniżej rynku, inaczej null>",
  "confidence": "<low | medium | high - na podstawie ilości danych historycznych>"
}`;
}
function buildObserverPrompt(data) {
    return `Przeanalizuj zachowanie klienta na interaktywnej ofercie i określ jego intencje zakupowe.

OFERTA: ${data.offerNumber} — ${data.offerTitle}
KLIENT: ${data.clientName}${data.clientCompany ? ` (${data.clientCompany})` : ''}, typ: ${data.clientType}
WARTOŚĆ: ${data.totalGross} PLN brutto
STATUS: ${data.statusLabel}

POZYCJE OFERTY:
${data.itemsFormatted}

WYŚWIETLENIA (${data.viewCount}):
${data.viewsFormatted}

INTERAKCJE (${data.interactionCount}):
${data.interactionsFormatted}

KOMENTARZE KLIENTA (${data.clientCommentCount}):
${data.clientCommentsFormatted}

Na podstawie powyższych danych, zwróć TYLKO JSON (bez markdown):
{
  "summary": "<string - naturalny opis zachowania klienta po polsku, 3-4 zdania>",
  "keyFindings": ["<string>", "<string>"],
  "clientIntent": "<likely_accept | undecided | likely_reject | unknown>",
  "interestAreas": ["<string - czym klient się interesuje>"],
  "concerns": ["<string - potencjalne obawy klienta>"],
  "engagementScore": <number 1-10>
}`;
}
function buildClosingStrategyPrompt(data) {
    return `Na podstawie kontekstu oferty i zachowań klienta, wygeneruj 3 strategie negocjacyjne.

OFERTA: ${data.offerNumber} — ${data.offerTitle}
KLIENT: ${data.clientName}${data.clientCompany ? ` (${data.clientCompany})` : ''}, typ: ${data.clientType}
WARTOŚĆ: ${data.totalGross} PLN brutto

POZYCJE:
${data.itemsFormatted}

ANALIZA ZACHOWAŃ (Observer):
${data.observerSummary}

KOMENTARZE KLIENTA:
${data.clientCommentsText}

DOTYCHCZASOWE ODPOWIEDZI SPRZEDAWCY:
${data.sellerCommentsText}

Wygeneruj 3 strategie negocjacyjne. Każda z suggestedResponse gotowym do wklejenia jako odpowiedź w komentarzu (po polsku, profesjonalnie, 3-5 zdań).

Zwróć TYLKO JSON (bez markdown):
{
  "aggressive": {
    "title": "<string - nazwa strategii>",
    "description": "<string - opis podejścia 1-2 zdania>",
    "suggestedResponse": "<string - gotowa odpowiedź do wklejenia>",
    "riskLevel": "<low | medium | high>"
  },
  "partnership": {
    "title": "<string>",
    "description": "<string>",
    "suggestedResponse": "<string>",
    "proposedConcessions": ["<string - konkretne ustępstwo>"]
  },
  "quickClose": {
    "title": "<string>",
    "description": "<string>",
    "suggestedResponse": "<string>",
    "maxDiscountPercent": <number 1-15>
  },
  "contextSummary": "<string - podsumowanie kontekstu negocjacji po polsku>"
}`;
}
function buildPostMortemPrompt(data) {
    return `Przeanalizuj zakończoną ofertę handlową i wyciągnij wnioski na przyszłość.

OFERTA: ${data.offerNumber} — ${data.offerTitle}
WYNIK: ${data.outcome === 'ACCEPTED' ? 'ZAAKCEPTOWANA' : 'ODRZUCONA'}
KLIENT: ${data.clientName}${data.clientCompany ? ` (${data.clientCompany})` : ''} — typ: ${data.clientType}
WARTOŚĆ: ${data.totalGross} PLN brutto

${data.variantBlock}

FINALNA KONFIGURACJA / WYBÓR KLIENTA:
${data.selectionSummary}

POZYCJE:
${data.itemsList}

LICZBA WYŚWIETLEŃ: ${data.viewCount}
TIMELINE INTERAKCJI (${data.interactionCount}):
${data.interactionTimeline}

KOMENTARZE:
${data.commentsText}

Zwróć TYLKO JSON (bez markdown):
{
  "summary": "Krótkie 2-3 zdaniowe podsumowanie co się wydarzyło",
  "keyLessons": ["Lekcja 1", "Lekcja 2"],
  "pricingInsight": "Wnioski dotyczące wyceny — czy ceny były adekwatne",
  "improvementSuggestions": ["Sugestia 1", "Sugestia 2"],
  "industryNote": "Obserwacja dot. branży lub typu klienta",
  "variantInsight": "Jeśli oferta ma warianty: wnioski o wyborze wariantu i rekomendacje jak to wykorzystać"
}`;
}
