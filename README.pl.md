<!-- BACKEND -->
<!-- smartquote_backend/README.pl.md -->

<div align="center">
  <img src="https://raw.githubusercontent.com/Shellty-IT/SmartQuote-AI/master/public/favicon.svg" alt="SmartQuote AI" width="100" height="100">

# SmartQuote AI — Backend

**Backend CRM z AI zbudowany w TypeScript, Express.js i Google Gemini**

[![CI Status](https://github.com/Shellty-IT/SmartQuote_backend/workflows/CI/badge.svg)](https://github.com/Shellty-IT/SmartQuote_backend/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-Proprietary-red)](./LICENSE)

**[🚀 Demo na żywo](https://smartquote-ai.netlify.app)** • [Repozytorium Frontend](https://github.com/Shellty-IT/SmartQuote-AI) • [🇬🇧 English version](./README.md)
</div>

---

## 🎯 Co to jest?

RESTful API backend dla systemu CRM sprzedażowego z funkcjami AI. Obsługuje klientów, oferty, umowy, automatyczne emaile, generowanie PDF oraz integrację z Google Gemini do inteligentnych analiz sprzedażowych.


---

## 🛠️ Stack Technologiczny

| Warstwa | Technologia | Dlaczego |
|---------|-------------|----------|
| **Język** | TypeScript 5.5 | Bezpieczeństwo typów, strict mode |
| **Framework** | Express.js 4.21 | Standard branżowy, elastyczny |
| **Baza danych** | PostgreSQL + Prisma ORM | Dane relacyjne, type-safe queries |
| **AI** | Google Gemini 2.5 Flash | Szybkie AI dla funkcji real-time |
| **Auth** | JWT + bcrypt | Stateless auth z cache (5min TTL) |
| **Walidacja** | Zod | Runtime schema validation |
| **Logowanie** | Pino | Strukturalne logi JSON |
| **Testy** | Jest | Testy jednostkowe logiki biznesowej |
| **CI/CD** | GitHub Actions | Auto-deploy do Railway przy push |
| **Deployment** | Railway | PostgreSQL bez konfiguracji + auto-scaling |

---


## 🏗️ Architektura

**Clean Architecture** — ścisła separacja odpowiedzialności:

**Przepływ żądania:**
Klient → Middleware → Controller → Service → Repository → Baza danych
↓
Zewnętrzne API (Gemini, PDFKit, SMTP)



**Odpowiedzialności warstw:**

| Warstwa | Odpowiedzialność | Zasady |
|---------|------------------|--------|
| **Middleware** | Zagadnienia przekrojowe | Cache auth (5min TTL), walidacja Zod, logowanie Pino |
| **Controller** | Interfejs HTTP | Tylko `try/catch + next(err)` — **zero logiki biznesowej** |
| **Service** | Logika biznesowa | Reguły domenowe, kalkulacje, orkiestracja repozytoriów i zewnętrznych API |
| **Repository** | Dostęp do danych | Tylko zapytania Prisma, zwraca surowe dane — **zero logiki** |
| **Serwisy zewnętrzne** | Integracje third-party | Google Gemini AI, PDFKit (generowanie PDF), Nodemailer (SMTP) |

**Kluczowe zasady:**
- Controllery są **głupie** — tylko przekazują błędy do globalnego handlera
- Serwisy są **mądre** — cała logika domenowa tu się znajduje
- Repozytoria są **czyste** — bez logiki biznesowej, tylko zapytania do bazy
- Cache auth redukuje obciążenie DB o ~80% na żądaniach wymagających uwierzytelnienia

## 📁 Struktura Projektu

| Katalog | Zawartość |
|---------|-----------|
| `src/controllers/` | Handlery żądań HTTP — 14 kontrolerów |
| `src/services/ai/` | Modułowe serwisy AI (chat, analiza, price insight, observer, closing strategy, feedback loop) |
| `src/services/pdf/` | Silnik renderowania PDF (oferta, umowa, podpis, certyfikat) |
| `src/services/email/` | Wysyłanie emaili, szablony, załączniki |
| `src/services/shared/` | Współdzielone kalkulacje i narzędzia |
| `src/repositories/` | Zapytania Prisma do bazy — 7 repozytoriów |
| `src/routes/` | Definicje tras Express — 14 plików route |
| `src/middleware/` | Auth (JWT + cache), walidacja Zod, globalny error handler |
| `src/validators/` | Schematy Zod dla walidacji żądań — 11 walidatorów |
| `src/lib/` | Prisma client, Pino logger, cache auth (5min TTL) |
| `src/types/` | Definicje typów TypeScript |
| `src/utils/` | Helpery API response, kalkulacje, crypto, numeracja ofert |
| `src/errors/` | Własne klasy błędów domenowych |
| `src/config/` | Centralna konfiguracja aplikacji |
| `src/__tests__/` | Testy jednostkowe Jest |
| `prisma/` | Schema (15 modeli) + historia migracji |
| `fonts/` | DejaVu Sans TTF — obsługa UTF-8 dla polskich znaków w PDF |

---

## ✨ Co zbudowałem

### Podstawowy CRM
- **Zarządzanie klientami** — Firmy i osoby prywatne z historią kontaktów
- **Cykl życia oferty** — 7 statusów: DRAFT → SENT → VIEWED → ACCEPTED / REJECTED
- **Workflow umów** — DRAFT → PENDING_SIGNATURE → ACTIVE → COMPLETED
- **System follow-upów** — Automatyczne przypomnienia emailowe dla zaległych zadań
- **Analityka dashboard** — Metryki sprzedaży i współczynniki konwersji

### Funkcje AI (Google Gemini 2.5 Flash)
- **Asystent Chat** — Interfejs języka naturalnego dla operacji CRM
- **Generator ofert** — Tworzenie ofert z opisów tekstowych
- **Price Insight** — Rekomendacje cenowe oparte na rynku
- **Tryb Observer** — Analiza wydajności ofert w czasie rzeczywistym
- **Strategia zamknięcia** — Sugestie AI do finalizacji transakcji
- **Feedback Loop** — Analiza post-mortem wygranych/przegranych ofert

### Generowanie dokumentów
- **Silnik PDF** — Własny renderer z DejaVu Sans (polskie znaki UTF-8)
- **Dynamiczny branding** — Logo i kolor główny per użytkownik w PDF
- **Kalkulacje VAT** — Automatyczne liczenie podatku per pozycja
- **Certyfikaty akceptacji** — Audit trail z podpisem SHA-256 w PDF

### Integracje
- **KSeF Bridge** — Webhook zewnętrznego systemu fakturowania
- **Email Composer** — Emaile HTML z załącznikami PDF przez Nodemailer
- **Publiczne strony ofert** — Linki z tokenem i wyborem wariantów
- **Podpisy elektroniczne** — Podpis canvas z weryfikacją kryptograficzną

---

## 🚀 Szybki Start

```bash
# 1. Sklonuj i zainstaluj
git clone https://github.com/Shellty-IT/SmartQuote_backend.git
cd SmartQuote_backend
npm install

# 2. Skonfiguruj środowisko
cp .env.example .env
# Uzupełnij DATABASE_URL, JWT_SECRET, GEMINI_API_KEY

# 3. Setup bazy danych
npx prisma generate
npx prisma migrate dev
npm run seed        # opcjonalnie: dodaj przykładowe dane

# 4. Uruchom serwer deweloperski
npm run dev
# → http://localhost:5000
🔐 Zmienne Środowiskowe
Zmienna	Wymagana	Opis
DATABASE_URL	✅	Connection string PostgreSQL
JWT_SECRET	✅	Sekret JWT (min. 32 znaki)
GEMINI_API_KEY	✅	Klucz API Google Gemini
FRONTEND_URL	✅	URL frontendu dla CORS
ENCRYPTION_KEY	✅	32-znakowy klucz szyfrowania
SMTP_HOST	❌	Hostname serwera SMTP
SMTP_PORT	❌	Port serwera SMTP (domyślnie: 587)
SMTP_USER	❌	Nazwa użytkownika SMTP
SMTP_PASS	❌	Hasło SMTP
SMTP_FROM	❌	Domyślny email nadawcy
KSEF_MASTER_URL	❌	URL zewnętrznego API fakturowania
KSEF_MASTER_API_KEY	❌	Klucz API zewnętrznego fakturowania
CRON_SECRET	❌	Sekret do uwierzytelniania cron jobów
Zobacz .env.example dla pełnego szablonu.

📡 Przegląd API
Base URL: /api

Endpoint	Metody	Opis
/health	GET	Health check + status DB
/auth	POST	Login, rejestracja, odświeżanie tokenu
/clients	GET POST PUT DELETE	Zarządzanie klientami
/offers	GET POST PUT DELETE	CRUD ofert + publikacja
/offers/:id/pdf	GET	Generowanie PDF oferty
/offers/:id/analytics	GET	Wyświetlenia i interakcje
/contracts	GET POST PUT DELETE	Zarządzanie umowami
/contracts/:id/pdf	GET	PDF umowy z podpisem
/ai/chat	POST	Chat z asystentem AI
/ai/generate-offer	POST	Generowanie oferty z opisu
/ai/price-insight	POST	Rekomendacja cenowa
/ai/insights	GET	Lista analiz post-mortem
/emails	GET POST	Logi i kompozytor emaili
/offer-templates	GET POST PUT DELETE	Szablony ofert
/ksef	POST	Wywołanie zewnętrznej faktury
/public/offers/:token	GET POST	Publiczny widok i akceptacja oferty
/public/contracts/:token	GET POST	Publiczny widok i podpis umowy
Format odpowiedzi:

JSON

{
  "success": true,
  "data": {},
  "meta": { "page": 1, "limit": 10, "total": 50 }
}
🧪 Testy
Bash

npm test                   # uruchom testy jednostkowe
npm run test:coverage      # z raportem pokrycia
npm run test:watch         # tryb watch
🔄 CI/CD
Każdy push do master uruchamia pipeline:


Push do master → Testy Jest → Sprawdzenie TypeScript → Deploy do Railway
Pipeline zdefiniowany w .github/workflows/ci.yml

🎓 Czego się nauczyłem
Clean Architecture w praktyce — ścisła separacja odpowiedzialności w 100+ plikach
Optymalizacja wydajności — Cache auth zredukował zapytania DB o ~80%
Integracja AI — Prompt engineering, historia konwersacji, streaming z Gemini
Generowanie PDF — Własny silnik renderowania z obsługą fontów UTF-8
Projektowanie bazy danych — 15 modeli Prisma, złożone relacje, indeksy wydajności
Bezpieczeństwo — JWT auth, hashowanie SHA-256, walidacja wejścia z Zod
Wzorce produkcyjne — Strukturalne logowanie (Pino), graceful shutdowns, error boundaries
🔗 Linki
Repozytorium Frontend: github.com/Shellty-IT/SmartQuote-AI
Aplikacja na żywo: smartquote-ai.netlify.app
📄 Licencja
Proprietary — Wszelkie prawa zastrzeżone. Może zostać skomercjalizowana w przyszłości.

Zbudowane w TypeScript · Express.js · PostgreSQL · Google Gemini AI