<!-- BACKEND -->
<!-- smartquote_backend/README.pl.md -->

<div align="center">
  <img src="https://github.com/Shellty-IT/SmartQuote-AI/blob/master/public/favicon.svg" alt="SmartQuote AI" width="100" height="100">

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

> **Wypróbuj na żywo:** [smartquote-ai.netlify.app](https://smartquote-ai.netlify.app)  
> *(Dane testowe dostępne na stronie logowania)*

---

## 🛠️ Stack Technologiczny

| Warstwa | Technologia | Dlaczego wybrałem |
|---------|-------------|-------------------|
| **Język** | TypeScript 5.5 | Bezpieczeństwo typów, lepsze DX |
| **Framework** | Express.js 4.21 | Standard branżowy, elastyczny |
| **Baza danych** | PostgreSQL + Prisma ORM | Dane relacyjne, type-safe queries |
| **AI** | Google Gemini 2.5 Flash | Szybkie odpowiedzi AI w czasie rzeczywistym |
| **Autentykacja** | JWT + bcrypt | Stateless auth z cache (5min) |
| **Walidacja** | Zod | Runtime type checking |
| **Logowanie** | Pino | Strukturalne logi JSON |
| **Testy** | Jest | Testy jednostkowe logiki biznesowej |
| **CI/CD** | GitHub Actions | Auto-deploy do Railway przy push |
| **Deployment** | Railway | PostgreSQL bez konfiguracji + auto-scaling |

---

## 🏗️ Architektura

Wzorzec Clean Architecture: **Controller → Service → Repository → Database**

```mermaid
flowchart TB
    A[HTTP Request] --> B[Warstwa Middleware]
    B --> C{Cache Auth}
    C -->|Trafienie| D[Controller]
    C -->|Pudło| E[Baza Danych]
    E --> D
    D --> F[Warstwa Serwisów]
    F --> G[Repository]
    G --> H[(PostgreSQL)]
    F --> I[Serwis AI]
    F --> J[Serwis PDF]
    F --> K[Serwis Email]
    I --> L[Google Gemini]
    J --> M[PDFKit]
    K --> N[Nodemailer]
    
    style B fill:#e3f2fd
    style F fill:#fff3e0
    style G fill:#f1f8e9
    style H fill:#e8f5e9
Kluczowe decyzje projektowe:

Szczupłe Controllery — Tylko try/catch + next(err), zero logiki biznesowej
Grube Serwisy — Cała logika domenowa, kalkulacje, wywołania zewnętrzne
Czyste Repozytoria — Tylko zapytania Prisma, zwracają surowe dane
Cache Auth (5min TTL) — Redukcja obciążenia DB o ~80% na endpointach wymagających autoryzacji
Globalny Error Handler — Jedno źródło prawdy dla odpowiedzi błędów + logowania
Strukturalne Logowanie — JSON w prod (dla agregatów logów), pretty-print w dev
📁 Struktura Projektu


src/
├── controllers/       # Warstwa HTTP (14 kontrolerów)
├── services/          # Logika biznesowa
│   ├── ai/           # Modułowe serwisy AI (8 plików)
│   ├── pdf/          # Generowanie PDF (10 plików)
│   ├── email/        # Obsługa emaili (5 plików)
│   └── shared/       # Współdzielone narzędzia
├── repositories/      # Warstwa dostępu do danych (7 repo)
├── routes/           # Definicje tras API
├── middleware/       # Auth, walidacja, obsługa błędów
├── validators/       # Schematy Zod (11 walidatorów)
├── lib/              # Podstawowe biblioteki (Prisma, logger, cache)
├── types/            # Definicje TypeScript
├── utils/            # Funkcje pomocnicze
└── __tests__/        # Testy jednostkowe Jest

prisma/
├── schema.prisma     # 15 modeli z relacjami
└── migrations/       # Wersjonowane zmiany DB

fonts/                # DejaVu Sans dla UTF-8 w PDF
✨ Co zbudowałem
Podstawowy CRM
Zarządzanie klientami — Firmy i osoby prywatne z pełnymi danymi kontaktowymi
Cykl życia oferty — 7 statusów (DRAFT → SENT → VIEWED → ACCEPTED/REJECTED)
Workflow umów — Podpis cyfrowy z certyfikacją SHA-256
System follow-upów — Automatyczne przypomnienia emailowe dla zaległych zadań
Analityka dashboard — Metryki sprzedaży i współczynniki konwersji w czasie rzeczywistym
Funkcje AI (Google Gemini)
Asystent Chat — Interfejs języka naturalnego dla operacji CRM
Generator ofert — Tworzenie ofert z opisów tekstowych
Szablony emaili — Profesjonalne emaile generowane przez AI
Price Insight — Rekomendacje cenowe oparte na rynku
Tryb Observer — Analityka wydajności ofert w czasie rzeczywistym
Strategia zamknięcia — Sugestie AI do finalizacji transakcji
Feedback Loop — Analiza post-mortem wygranych/przegranych ofert
Generowanie dokumentów
Silnik PDF — Własny renderer z DejaVu Sans (polskie znaki UTF-8)
Dynamiczny branding — Logo i kolor główny per użytkownik
Kalkulacje VAT — Multi-walutowe z automatycznym liczeniem podatku
Certyfikaty akceptacji — Prawnie wiążący audit trail w PDF
Integracje
KSeF Bridge — Webhook zewnętrznego systemu fakturowania
Email Composer — Bogate emaile HTML z załącznikami PDF
Publiczne strony ofert — Linki do udostępnienia z wyborem wariantów
Podpisy elektroniczne — Podpis canvas z weryfikacją kryptograficzną
🚀 Szybki Start
Bash

# 1. Sklonuj i zainstaluj
git clone https://github.com/Shellty-IT/SmartQuote_backend.git
cd SmartQuote_backend
npm install

# 2. Skonfiguruj środowisko
cp .env.example .env
# Edytuj .env: URL bazy danych, JWT secret, klucz Gemini API

# 3. Setup bazy danych
npx prisma generate
npx prisma migrate dev
npm run seed  # Opcjonalnie: dodaj przykładowe dane

# 4. Uruchom serwer deweloperski
npm run dev
# Serwer działa na http://localhost:5000
🔐 Zmienne Środowiskowe
Zmienna	Wymagana	Opis
DATABASE_URL	✅	Connection string PostgreSQL
JWT_SECRET	✅	Sekret do podpisywania JWT (min. 32 znaki)
GEMINI_API_KEY	✅	Klucz API Google Gemini
FRONTEND_URL	✅	URL frontendu dla CORS
ENCRYPTION_KEY	✅	32-znakowy klucz szyfrowania
SMTP_*	❌	Konfiguracja serwera email (opcjonalnie)
KSEF_MASTER_*	❌	Zewnętrzne fakturowanie (opcjonalnie)
Zobacz .env.example dla pełnej listy.

📡 Przegląd API
Base URL: /api

Endpoint	Metody	Opis
/auth	POST	Login, rejestracja, odświeżanie tokenu
/clients	GET, POST, PUT, DELETE	Zarządzanie klientami
/offers	GET, POST, PUT, DELETE	CRUD ofert + publikacja
/offers/:id/pdf	GET	Generowanie PDF
/offers/:id/analytics	GET	Liczba wyświetleń, interakcje
/contracts	GET, POST, PUT, DELETE	Zarządzanie umowami
/contracts/:id/pdf	GET	Generowanie PDF z podpisem
/ai/chat	POST	Chat z asystentem AI
/ai/generate-offer	POST	Generowanie oferty z opisu
/ai/price-insight	POST	Rekomendacja cenowa
/ai/insights	GET	Lista analiz post-mortem
/emails	GET, POST	Logi i szablony emaili
/offer-templates	GET, POST, PUT, DELETE	Szablony ofert wielokrotnego użytku
/ksef	POST	Wywołanie zewnętrznej faktury
/public/offers/:token	GET, POST	Publiczny widok i akceptacja oferty
/public/contracts/:token	GET, POST	Publiczny widok i podpis umowy
Format odpowiedzi:

JSON

{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 50 }
}
🧪 Testy i CI/CD
Bash

# Uruchom testy jednostkowe
npm test

# Z pokryciem kodu
npm run test:coverage

# Tryb watch
npm run test:watch
Pipeline CI/CD (GitHub Actions):


1. Push do main
2. Uruchomienie testów Jest
3. Sprawdzenie typów TypeScript
4. Auto-deploy do Railway (jeśli testy przechodzą)
🎓 Czego się nauczyłem
Budując ten projekt nauczyłem się:

Clean Architecture w praktyce — separacja odpowiedzialności na dużą skalę
Optymalizacja wydajności — cache auth zredukował zapytania DB o 80%
Integracja AI — obsługa streaming responses, prompt engineering
Wzorce produkcyjne — strukturalne logowanie, obsługa błędów, graceful shutdowns
Projektowanie bazy danych — 15 modeli Prisma ze złożonymi relacjami i indeksami
Bezpieczeństwo — JWT auth, hashowanie SHA-256, walidacja wejścia z Zod
Generowanie PDF — Własny silnik renderowania z obsługą fontów UTF-8
CI/CD — Zautomatyzowany pipeline testowania i deploymentu
📄 Licencja
Proprietary — Wszelkie prawa zastrzeżone. Może zostać skomercjalizowana w przyszłości.

🔗 Linki
Repozytorium Frontend: github.com/Shellty-IT/SmartQuote-AI
Aplikacja na żywo: smartquote-ai.netlify.app
Autor: Twój profil GitHub
<div align="center">
Zbudowane z ❤️ używając TypeScript, Express.js i Google Gemini AI

</div> 