<!-- BACKEND -->
<!-- smartquote_backend/README.md -->

<div align="center">
  <img src="https://raw.githubusercontent.com/Shellty-IT/SmartQuote-AI/master/public/favicon.svg" alt="SmartQuote AI" width="100" height="100">

# SmartQuote AI - Backend

**AI-powered CRM backend built with TypeScript, Express.js and Google Gemini**

[![CI Status](https://github.com/Shellty-IT/SmartQuote_backend/workflows/CI/badge.svg)](https://github.com/Shellty-IT/SmartQuote_backend/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-Proprietary-red)](./LICENSE)

**[🚀 Live Demo](https://smartquote-ai.netlify.app)** • [Frontend Repo](https://github.com/Shellty-IT/SmartQuote-AI) • [🇵🇱 Wersja polska](./README.pl.md)
</div>

---

## 🎯 What is this?

RESTful API backend for a sales CRM with AI-powered features. Handles clients, offers, contracts, automated emails, PDF generation, and integrates Google Gemini for intelligent sales insights.


---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Language** | TypeScript 5.5 | Type safety, strict mode |
| **Framework** | Express.js 4.21 | Industry standard, flexible |
| **Database** | PostgreSQL + Prisma ORM | Relational data, type-safe queries |
| **AI** | Google Gemini 2.5 Flash | Fast AI for real-time features |
| **Auth** | JWT + bcrypt | Stateless auth with 5min cache layer |
| **Validation** | Zod | Runtime schema validation |
| **Logging** | Pino | Structured JSON logs |
| **Testing** | Jest | Unit tests for critical logic |
| **CI/CD** | GitHub Actions | Auto-deploy to Render on push |
| **Deployment** | Render | Zero-config PostgreSQL + auto-scaling |

---

## 🏗️ Architecture

**Clean Architecture** - strict separation of concerns:

**Request Flow:**
Client → Middleware → Controller → Service → Repository → Database
↓
External APIs (Gemini, PDFKit, SMTP)



**Layer Responsibilities:**

| Layer | Responsibility | Rules |
|-------|----------------|-------|
| **Middleware** | Cross-cutting concerns | Auth cache (5min TTL), Zod validation, Pino logging |
| **Controller** | HTTP interface | Only `try/catch + next(err)` - **zero business logic** |
| **Service** | Business logic | Domain rules, calculations, orchestrates repositories & external APIs |
| **Repository** | Data access | Only Prisma queries, returns raw data - **zero logic** |
| **External Services** | Third-party integrations | Google Gemini AI, PDFKit (PDF generation), Nodemailer (SMTP) |

**Key Principles:**
- Controllers are **dumb** - they only forward errors to the global handler
- Services are **smart** - all domain logic lives here
- Repositories are **pure** - no business logic, only database queries
- Auth cache reduces DB load by ~80% on authenticated requests

## 📁 Project Structure

| Directory | Contents |
|-----------|----------|
| `src/controllers/` | HTTP request handlers - 14 controllers |
| `src/services/ai/` | Modular AI services (chat, analysis, price insight, observer, closing strategy, feedback loop) |
| `src/services/pdf/` | PDF rendering engine (offer, contract, signature, audit cert) |
| `src/services/email/` | Email sending, templates, attachments |
| `src/services/shared/` | Shared calculations and utilities |
| `src/repositories/` | Prisma database queries - 7 repositories |
| `src/routes/` | Express route definitions - 14 route files |
| `src/middleware/` | Auth (JWT + cache), Zod validation, global error handler |
| `src/validators/` | Zod schemas for request validation - 11 validators |
| `src/lib/` | Prisma client, Pino logger, auth cache (5min TTL) |
| `src/types/` | TypeScript type definitions |
| `src/utils/` | API response helpers, calculations, crypto, offer numbering |
| `src/errors/` | Custom domain error classes |
| `src/config/` | Centralized app configuration |
| `src/__tests__/` | Jest unit tests |
| `prisma/` | Schema (15 models) + migration history |
| `fonts/` | DejaVu Sans TTF - UTF-8 support for Polish characters in PDFs |

---

## ✨ What I Built

### Core CRM
- **Client Management** - Companies & individuals with full contact history
- **Offer Lifecycle** - 7 statuses: DRAFT → SENT → VIEWED → ACCEPTED / REJECTED
- **Contract Workflow** - DRAFT → PENDING_SIGNATURE → ACTIVE → COMPLETED
- **Follow-up System** - Automated email reminders for overdue tasks
- **Dashboard Analytics** - Real-time sales metrics and conversion rates

### AI Features (Google Gemini 2.5 Flash)
- **Chat Assistant** - Natural language interface for CRM operations
- **Offer Generator** - Create structured offers from text descriptions
- **Price Insight** - Market-based pricing recommendations
- **Observer Mode** - Real-time offer performance analysis
- **Closing Strategy** - AI suggestions for deal finalization
- **Feedback Loop** - Post-mortem analysis of won/lost deals

### Document Generation
- **PDF Engine** - Custom renderer with DejaVu Sans (Polish UTF-8 support)
- **Dynamic Branding** - Per-user logo and primary color in PDFs
- **VAT Calculations** - Automatic tax computation per line item
- **Acceptance Certificates** - SHA-256 signed audit trail embedded in PDF

### Integrations
- **KSeF Bridge** - External invoicing system webhook
- **Email Composer** - HTML emails with PDF attachments via Nodemailer
- **Public Offer Pages** - Shareable token-based links with variant selection
- **Electronic Signatures** - Canvas-based signing with cryptographic verification

---

## 🚀 Quick Start

```bash
# 1. Clone & install
git clone https://github.com/Shellty-IT/SmartQuote_backend.git
cd SmartQuote_backend
npm install

# 2. Setup environment
cp .env.example .env
# Fill in your DATABASE_URL, JWT_SECRET, GEMINI_API_KEY

# 3. Database setup
npx prisma generate
npx prisma migrate dev
npm run seed        # optional: add sample data

# 4. Start dev server
npm run dev
# → http://localhost:5000
🔐 Environment Variables
Variable	Required	Description
DATABASE_URL	✅	PostgreSQL connection string
JWT_SECRET	✅	JWT signing secret (min. 32 chars)
GEMINI_API_KEY	✅	Google Gemini API key
FRONTEND_URL	✅	Frontend URL for CORS
ENCRYPTION_KEY	✅	32-char encryption key
SMTP_HOST	❌	SMTP server hostname
SMTP_PORT	❌	SMTP server port (default: 587)
SMTP_USER	❌	SMTP username
SMTP_PASS	❌	SMTP password
SMTP_FROM	❌	Default sender email
KSEF_MASTER_URL	❌	External invoicing API URL
KSEF_MASTER_API_KEY	❌	External invoicing API key
CRON_SECRET	❌	Secret for cron job auth
See .env.example for full template.

📡 API Reference
Base URL: /api

Endpoint	Methods	Description
/health	GET	Health check + DB status
/auth	POST	Login, register, token refresh
/clients	GET POST PUT DELETE	Client management
/offers	GET POST PUT DELETE	Offer CRUD + publish
/offers/:id/pdf	GET	Generate offer PDF
/offers/:id/analytics	GET	Views and interactions
/contracts	GET POST PUT DELETE	Contract management
/contracts/:id/pdf	GET	Contract PDF with signature
/ai/chat	POST	Chat with AI assistant
/ai/generate-offer	POST	Generate offer from description
/ai/price-insight	POST	Pricing recommendation
/ai/insights	GET	Post-mortem analysis list
/emails	GET POST	Email logs and composer
/offer-templates	GET POST PUT DELETE	Reusable offer templates
/ksef	POST	Trigger external invoice
/public/offers/:token	GET POST	Public offer view and accept
/public/contracts/:token	GET POST	Public contract view and sign
Response format:

JSON

{
  "success": true,
  "data": {},
  "meta": { "page": 1, "limit": 10, "total": 50 }
}
🧪 Testing
Bash

npm test                   # run unit tests
npm run test:coverage      # with coverage report
npm run test:watch         # watch mode
🔄 CI/CD
Every push to master triggers the pipeline:


Push to master → Jest Tests → TypeScript Check → Deploy to Render
Pipeline defined in .github/workflows/ci.yml

🎓 What I Learned
Clean Architecture in practice - strict separation of concerns across 100+ files
Performance - Auth cache reduced DB queries by ~80% on every authenticated request
AI integration - Prompt engineering, conversation history, streaming with Gemini
PDF generation - Custom rendering engine with UTF-8 font support (DejaVu Sans)
Database design - 15 Prisma models, complex relations, performance indexes
Security - JWT auth, SHA-256 content hashing, Zod input validation
Production patterns - Structured logging (Pino), graceful shutdowns, error boundaries
🔗 Links
Frontend Repository: github.com/Shellty-IT/SmartQuote-AI
Live Application: smartquote-ai.netlify.app
📄 License
Proprietary - All rights reserved. May be commercialized in the future.

Built with TypeScript · Express.js · PostgreSQL · Google Gemini AI