# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Name:** Gestionale Formazione Sicurezza "Il Tucano"  
**Type:** Full-stack web app, 7 moduli (compliance + training management)  
**Stack:** Next.js 14 (TypeScript) + Supabase (PostgreSQL) + Prisma ORM  
**Deployment:** Vercel (frontend), Supabase hosted (database)

---

## Architecture

### Monorepo Structure (Turborepo)

```
apps/
  └── web/                    # Next.js 14 frontend + API routes
      ├── app/                # App Router (auth layout, dashboard layout, 7 moduli)
      ├── components/         # Shadcn/ui, forms, tables, charts, calendar
      ├── lib/                # auth, db, validation, encryption, google-calendar
      ├── hooks/
      ├── middleware.ts       # JWT validation + RLS context
      └── package.json

packages/
  ├── db/                     # Prisma schema + migrations
  │   ├── prisma/schema.prisma
  │   ├── src/
  │   │   ├── client.ts       # Prisma client singleton
  │   │   ├── middleware/     # audit.ts, encryption.ts
  │   │   └── seeds/
  │   └── package.json
  ├── types/                  # Shared TS types (users, corsi, aule, etc.)
  └── utils/                  # Shared utilities (validators, formatters, calculations, encryption)

docs/                         # ARCHITETTURA.md, MODULI.md, API.md, SECURITY.md, DEPLOYMENT.md
```

**Key:** Turborepo handles parallel builds/tests. Shared packages (`types`, `utils`) importable across `apps/web` and `packages/db`.

---

## Tech Stack & Key Libraries

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | Next.js 14 (App Router) | TypeScript, React 19 |
| **UI** | Tailwind CSS + Shadcn/ui | Component library |
| **Database** | PostgreSQL (Supabase) | Self-hosted or cloud |
| **ORM** | Prisma | Schema-driven, migrations in `packages/db/prisma/migrations/` |
| **Auth** | Supabase native (JWT) | 24h session, RLS enforcement |
| **Storage** | Supabase Storage | Private buckets per tenant |
| **Calendar** | Google Calendar API | OAuth 2.0, sync on aula creation/update |
| **Encryption** | TweetNaCl.js (Prisma middleware) | PII: CF, email, cellulare, data_nascita |
| **CI/CD** | GitHub Actions | `.github/workflows/test.yml`, `deploy.yml` |

---

## Roles & Permissions (4 roles + RLS)

**Database enforced via RLS policies** (all tables):

| Role | Moduli Access | Notes |
|------|-------|-------|
| **SUPERADMIN** | 1-7 (ALL) | Full admin, can configure module visibility per role |
| **SEGRETERIA** | 1,2,3,4 | Create aulas, import discenti, manage docs; no billing/reports |
| **AMMINISTRAZIONE** | 1,5,6,7 | Billing, reports, cost distribution; no aula/discenti creation |
| **VISUALIZZATORE** | 1-7 (READ) | Read-only everywhere |

**ProfiloUtente enum:** `SUPERADMIN | SEGRETERIA | AMMINISTRAZIONE | VISUALIZZATORE`  
**ModuloPermesso table:** Superadmin configures `(ruolo, moduloId, visible)` per module.

---

## 7 Moduli & Dependency Order

1. **Modulo 1: Autenticazione + Gestione Permessi** (Week 1-2)
   - Login, logout, JWT refresh, role-based access
   - Admin panel: manage users, roles, module visibility
   - **No dependencies**

2. **Modulo 2: Importazione + Catalogo Corsi** (Week 3-4)
   - XLS upload → upsert `Discente` + `Azienda`
   - Catalog CRUD (corsi, docenti)
   - **Deps:** Modulo 1

3. **Modulo 3: Aule + Calendario + Google Calendar Sync** (Week 5-7)
   - Create aule, assign discenti + docenti, visual drag-drop calendar
   - Google Calendar OAuth → sync `Lezione` as calendar events
   - Aula state machine: Pianificata → In Corso → Conclusa
   - **Deps:** Modulo 1, 2

4. **Modulo 4: Modulistica Dinamica** (Week 8-9)
   - Template manager (registri, verbali, attestati)
   - PDF generator (pre-fill from aula/discenti)
   - Archive upload to Supabase Storage
   - **Deps:** Modulo 1, 3

5. **Modulo 5: Prefatturazione** (Week 10-11)
   - Bilancio snapshot (immutable on aula closure): ricavo - costi docenti = margine
   - Real-time preview, cost breakdown per discente
   - **Deps:** Modulo 1, 3 | **Trigger:** Aula state → Conclusa

6. **Modulo 6: Report** (Week 12)
   - KPI dashboard: active aulas, discenti per corso, avg cost
   - Charts (revenue trend, utilization, docent hours)
   - **Deps:** Modulo 1, 5 | **Trigger:** Aula closure

7. **Modulo 7: Centri di Costo** (Week 13)
   - Cost distribution formula: `(aula_costo_totale / aula_discenti_n) × discenti_per_cantiere`
   - Per-cantiere/sottocantiere breakdown
   - **Deps:** Modulo 1, 3, 5 | **Trigger:** Aula closure

---

## Database Design Principles

- **Soft-delete everywhere:** `deletedAt` field on all models (10-year retention for audit)
- **RLS on all tables:** Policies per role (SELECT/INSERT/UPDATE/DELETE filtered by Ruolo)
- **Audit logging:** `LogAudit` table tracks all user actions (azione, tabella, recordId, dettagli)
- **Encryption middleware:** Prisma middleware encrypts `ProfiloUtente.email`, `Discente.cf / data_nascita / cellulare / email` at rest
- **Snapshot immutability:** `BilancioAula` and `CentriCosto` records created on closure are immutable (no updates)
- **Flexible docent hours:** `Lezione.ore_aula` (classroom hours) ≠ `docenti_in_lezione.ore_pagata` (paid hours)

---

## Common Development Commands

### Setup (First Time)
```bash
# Install deps
npm install

# Copy .env.example to .env.local and fill Supabase credentials
cp .env.example .env.local

# Start Supabase local (Docker required)
docker-compose up -d

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate:dev

# Seed initial data (superadmin, roles)
npm run db:seed
```

### Development
```bash
# Start dev server (all packages, Turborepo parallel)
npm run dev

# Dev single package (e.g., web app only)
npm run dev --filter=web

# Watch Prisma schema changes
npm run db:generate

# Create new migration (after schema.prisma change)
npm run db:migrate:dev --name "description_here"
```

### Testing & Quality
```bash
# Run tests (all packages)
npm run test

# Test single package
npm run test --filter=db

# Run single test file
npm run test -- packages/db/src/middleware/__tests__/encryption.test.ts

# Lint (ESLint + Prettier)
npm run lint

# Format code
npm run format

# Type check
npm run typecheck
```

### Build & Deploy
```bash
# Build all packages
npm run build

# Build single package
npm run build --filter=web

# Dry-run local production build
npm run start

# Deploy to Vercel (auto on main branch via GitHub Actions)
git push origin main
```

### Database
```bash
# Open Prisma Studio (GUI for local DB)
npm run db:studio

# Reset local DB (careful!)
npm run db:reset

# Check DB status
npm run db:status

# Pull schema from Supabase (if remote is source of truth)
npx prisma db pull
```

---

## File Organization Guidelines

- **API routes:** `apps/web/app/api/[resource]/route.ts` (one resource per folder, GET/POST/PUT/DELETE in same file)
- **UI Components:** `apps/web/components/` organized by category (ui/, forms/, tables/, modals/, charts/, calendar/)
- **Types:** Always use shared types from `packages/types/src/*.ts`, never duplicate
- **Utils:** Shared logic (validation, encryption, calculations) in `packages/utils/src/`
- **Database:** Schema and migrations in `packages/db/`; Prisma client in `packages/db/src/client.ts`
- **Middleware:** Encryption & audit hooks in `packages/db/src/middleware/`; HTTP middleware in `apps/web/middleware.ts`

---

## Key Technical Decisions

✅ **RLS as primary authorization:** Every table has SQL-level policies; app logic trusts RLS.  
✅ **Soft-delete everywhere:** No hard-delete; audit trail via `deletedAt` + `LogAudit`.  
✅ **Snapshot immutability:** Bilancio/CentriCosto locked on aula closure to prevent retroactive changes.  
✅ **Encryption middleware:** Prisma pre/post hooks encrypt PII before DB write, decrypt on read.  
✅ **Google Calendar sync:** Lezioni auto-create/-update as calendar events; user OAuth required once.  
✅ **Flexible docent hours:** Aula can be 12h (classroom) but docent paid 8h (e.g., travel time excluded).  
✅ **Modular permissions:** Superadmin can hide entire modules per role via `ModuloPermesso`.

---

## Environment Variables (.env.local)

Required for local dev:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=[from docker compose output]
SUPABASE_SERVICE_ROLE_KEY=[from docker compose output]
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres

# Google Calendar (OAuth credentials from Google Cloud Console)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Encryption (base64-encoded NaCl secret key, generate via `tweetnacl.js`)
ENCRYPTION_KEY=...

# Session
NEXT_PUBLIC_SESSION_SECRET=dev-secret-change-in-prod
```

See `.env.example` for full list.

---

## Architecture Patterns

### API Endpoints
All routes follow: `apps/web/app/api/[resource]/route.ts`

**Pattern:**
```typescript
// GET /api/aule
export async function GET(req: NextRequest) {
  const user = await getSession(req);
  const aule = await db.aula.findMany({
    where: { /* RLS enforced by Supabase */ }
  });
  return NextResponse.json(aule);
}
```

RLS handles filtering; app checks role for coarse-grained access, RLS enforces fine-grained.

### Database Transactions
For multi-table operations (e.g., close aula → snapshot bilancio → update KPI):

```typescript
// packages/db/src/client.ts
await db.$transaction(async (tx) => {
  await tx.aula.update({ ... });
  await tx.bilancioAula.create({ ... });
  await tx.logAudit.create({ azione: "CHIUDE_AULA", ... });
});
```

### State Machines
Aula state: `Pianificata` → `In Corso` → `Conclusa`  
Transitions checked at API level; state enforcement via RLS (only Segreteria can transition).

### Encryption
- **At rest:** Prisma middleware intercepts writes, encrypts PII fields
- **In transit:** HTTPS only (enforced by Supabase + Vercel)
- **Key rotation:** Handled manually (update `ENCRYPTION_KEY` in `.env`, re-encrypt via script)

---

## Testing Strategy

- **Unit:** `packages/utils/__tests__/`, `packages/types/__tests__/` (pure functions)
- **Integration:** `packages/db/__tests__/` (Prisma queries against test DB)
- **E2E:** `apps/web/__tests__/e2e/` (full flow: login → import → create aula → close)
- **Run:** `npm run test` (Vitest)

---

## Debugging

### Local Supabase
```bash
# View Postgres logs
docker-compose logs postgres

# Connect to local DB
psql postgresql://postgres:postgres@localhost:5432/postgres

# Inspect RLS policies
SELECT * FROM information_schema.table_privileges WHERE table_schema='public';
```

### Prisma
```bash
# Enable query logging
DEBUG=prisma* npm run dev

# Inspect migrations
npm run db:studio
```

### Google Calendar Sync
Add debug logging in `apps/web/lib/google-calendar.ts` and check `LogAudit` for failures.

---

## Performance Considerations

- **Pagination:** API endpoints support `limit` + `offset` query params (default 50, max 200)
- **Indexing:** Key fields indexed in schema (ruolo, deletedAt, email, createdAt)
- **Database pooling:** Supabase handles connection pooling; Prisma uses 10-connection pool by default
- **Caching:** Consider ISR (Incremental Static Regeneration) for reports if data doesn't change frequently
- **Large uploads:** XLS imports stream-process rows (no load entire file into RAM)

---

## Security Checklist

Before deploying to production:
- ✅ RLS policies reviewed and tested
- ✅ Encryption key rotated (not dev-secret)
- ✅ HTTPS enforced (Vercel + Supabase)
- ✅ CORS configured (allow only frontend domain)
- ✅ API rate-limiting in place (prevent brute-force auth)
- ✅ Audit logs retained for 10 years
- ✅ Soft-delete audit trail verified
- ✅ Google OAuth credentials scoped (calendar-only)

---

## CI/CD (GitHub Actions)

**Workflows:**
- `.github/workflows/test.yml`: Run tests on PR (Vitest)
- `.github/workflows/deploy.yml`: Deploy to Vercel on merge to `main`

**Protect main branch:** Require PR + tests passing + 1 approval before merge.

---

## Useful References

| Document | Purpose |
|----------|---------|
| `BLUEPRINT_SUMMARY.md` | 30-second overview (this file) |
| `PROGETTO_STRUCT.md` | Folder structure + moduli breakdown + roadmap |
| `MODULI_DETTAGLIO.md` | Detailed functional spec per modulo |
| `schema.prisma` | Database schema + relations |
| `RLS_POLICY.md` | Row-level security policies (SQL) |
| `docs/ARCHITETTURA.md` | Deep architecture + design decisions |
| `docs/SECURITY.md` | Security architecture + threat model |
| `docs/API.md` | API endpoint reference |
| `docs/DEPLOYMENT.md` | Production deployment steps |

---

## Contact & Questions

**Owner:** Stefano Grassi  
**For architecture changes:** See `CLAUDE.md` (this file) + `docs/ARCHITETTURA.md`
