<!-- BACKEND -->
<!-- smartquote_backend/README.md -->

<div align="center">
  <img src="https://github.com/Shellty-IT/SmartQuote-AI/blob/master/public/favicon.svg" alt="SmartQuote AI" width="100" height="100">

# SmartQuote AI — Backend

**AI-powered CRM backend built with TypeScript, Express.js, and Google Gemini**

[![CI Status](https://github.com/Shellty-IT/SmartQuote_backend/workflows/CI/badge.svg)](https://github.com/Shellty-IT/SmartQuote_backend/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-Proprietary-red)](./LICENSE)

**[🚀 Live Demo](https://smartquote-ai.netlify.app)** • [Frontend Repo](https://github.com/Shellty-IT/SmartQuote-AI) • [🇵🇱 Wersja polska](./README.pl.md)

</div>

---

## 🎯 What is this?

RESTful API backend for a sales CRM with AI-powered features. Handles clients, offers, contracts, automated emails, PDF generation, and integrates Google Gemini for intelligent sales insights.

> **Try it live:** [smartquote-ai.netlify.app](https://smartquote-ai.netlify.app)  

---

## 🛠️ Tech Stack

| Layer | Technology | Why I chose it |
|-------|-----------|----------------|
| **Language** | TypeScript 5.5 | Type safety, better DX |
| **Framework** | Express.js 4.21 | Industry standard, flexible |
| **Database** | PostgreSQL + Prisma ORM | Relational data, type-safe queries |
| **AI** | Google Gemini 2.5 Flash | Fast AI responses for real-time features |
| **Auth** | JWT + bcrypt | Stateless auth with 5min cache layer |
| **Validation** | Zod | Runtime type checking |
| **Logging** | Pino | Structured JSON logs |
| **Testing** | Jest | Unit tests for critical logic |
| **CI/CD** | GitHub Actions | Auto-deploy to Railway on push |
| **Deployment** | Railway | Zero-config PostgreSQL + auto-scaling |

---

## 🏗️ Architecture

Clean Architecture pattern: **Controller → Service → Repository → Database**

```mermaid
flowchart TB
    A[HTTP Request] --> B[Middleware Layer]
    B --> C{Auth Cache}
    C -->|Hit| D[Controller]
    C -->|Miss| E[Database]
    E --> D
    D --> F[Service Layer]
    F --> G[Repository]
    G --> H[(PostgreSQL)]
    F --> I[AI Service]
    F --> J[PDF Service]
    F --> K[Email Service]
    I --> L[Google Gemini]
    J --> M[PDFKit]
    K --> N[Nodemailer]
    
    style B fill:#e3f2fd
    style F fill:#fff3e0
    style G fill:#f1f8e9
    style H fill:#e8f5e9
Key Design Decisions:

Slim Controllers — Only try/catch + next(err), zero business logic
Fat Services — All domain logic, calculations, external calls
Pure Repositories — Only Prisma queries, return raw data
Auth Cache (5min TTL) — Reduced DB load by ~80% on authenticated endpoints
Global Error Handler — Single source of truth for error responses + logging
Structured Logging — JSON in prod (for log aggregators), pretty-print in dev
📁 Project Structure

src/
├── controllers/       # HTTP layer (14 controllers)
├── services/          # Business logic
│   ├── ai/           # Modular AI services (8 files)
│   ├── pdf/          # PDF generation (10 files)
│   ├── email/        # Email handling (5 files)
│   └── shared/       # Shared utilities
├── repositories/      # Data access layer (7 repos)
├── routes/           # API route definitions
├── middleware/       # Auth, validation, error handling
├── validators/       # Zod schemas (11 validators)
├── lib/              # Core libraries (Prisma, logger, cache)
├── types/            # TypeScript definitions
├── utils/            # Helper functions
└── __tests__/        # Jest unit tests

prisma/
├── schema.prisma     # 15 models with relations
└── migrations/       # Version-controlled DB changes

fonts/                # DejaVu Sans for UTF-8 PDFs
✨ What I Built
Core CRM
Client Management — Companies & individuals with full contact info
Offer Lifecycle — 7 statuses (DRAFT → SENT → VIEWED → ACCEPTED/REJECTED)
Contract Workflow — Digital signature with SHA-256 certification
Follow-up System — Automated email reminders for overdue tasks
Dashboard Analytics — Real-time sales metrics and conversion rates
AI Features (Google Gemini)
Chat Assistant — Natural language interface for CRM operations
Offer Generator — Create offers from text descriptions
Email Templates — AI-generated professional emails
Price Insight — Market-based pricing recommendations
Observer Mode — Real-time offer performance analytics
Closing Strategy — AI suggestions for deal finalization
Feedback Loop — Post-mortem analysis of won/lost deals
Document Generation
PDF Engine — Custom renderer with DejaVu Sans (Polish UTF-8 support)
Dynamic Branding — Per-user logo & primary color
VAT Calculations — Multi-currency with automatic tax computation
Acceptance Certificates — Legally-binding audit trail in PDFs
Integrations
KSeF Bridge — External invoicing system webhook
Email Composer — Rich HTML emails with PDF attachments
Public Offer Pages — Shareable links with variant selection
Electronic Signatures — Canvas-based signing with crypto verification
🚀 Quick Start
Bash

# 1. Clone & install
git clone https://github.com/Shellty-IT/SmartQuote_backend.git
cd SmartQuote_backend
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your database URL, JWT secret, Gemini API key

# 3. Database setup
npx prisma generate
npx prisma migrate dev
npm run seed  # Optional: add sample data

# 4. Start development server
npm run dev
# Server runs on http://localhost:5000
🔐 Environment Variables
Variable	Required	Description
DATABASE_URL	✅	PostgreSQL connection string
JWT_SECRET	✅	Secret for JWT signing (min. 32 chars)
GEMINI_API_KEY	✅	Google Gemini API key
FRONTEND_URL	✅	Frontend URL for CORS
ENCRYPTION_KEY	✅	32-char encryption key
SMTP_*	❌	Email server config (optional)
KSEF_MASTER_*	❌	External invoicing (optional)
See .env.example for full list.

📡 API Overview
Base URL: /api

Endpoint	Methods	Description
/auth	POST	Login, register, refresh token
/clients	GET, POST, PUT, DELETE	Client management
/offers	GET, POST, PUT, DELETE	Offer CRUD + publish/unpublish
/offers/:id/pdf	GET	Generate PDF
/offers/:id/analytics	GET	View count, interactions
/contracts	GET, POST, PUT, DELETE	Contract management
/contracts/:id/pdf	GET	Generate PDF with signature
/ai/chat	POST	Chat with AI assistant
/ai/generate-offer	POST	Generate offer from description
/ai/price-insight	POST	Get pricing recommendation
/ai/insights	GET	Post-mortem analysis list
/emails	GET, POST	Email logs & templates
/offer-templates	GET, POST, PUT, DELETE	Reusable offer templates
/ksef	POST	Trigger external invoice
/public/offers/:token	GET, POST	Public offer view & accept
/public/contracts/:token	GET, POST	Public contract view & sign
Response Format:

JSON

{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 50 }
}
🧪 Testing & CI/CD
Bash

# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
CI/CD Pipeline (GitHub Actions):

text

1. Push to main
2. Run Jest tests
3. TypeScript type check
4. Auto-deploy to Railway (if tests pass)
🎓 What I Learned
Building this project taught me:

Clean Architecture in practice — separation of concerns at scale
Performance optimization — auth caching reduced DB queries by 80%
AI integration — handling streaming responses, prompt engineering
Production patterns — structured logging, error handling, graceful shutdowns
Database design — 15 Prisma models with complex relations & indexes
Security — JWT auth, SHA-256 hashing, input validation with Zod
PDF generation — Custom rendering engine with UTF-8 font support
CI/CD — Automated testing and deployment pipeline
📄 License
Proprietary — All rights reserved. May be commercialized in the future.

🔗 Links
Frontend Repository: github.com/Shellty-IT/SmartQuote-AI
Live Application: smartquote-ai.netlify.app
Author: Your GitHub Profile
<div align="center">
Built with ❤️ using TypeScript, Express.js, and Google Gemini AI

</div>