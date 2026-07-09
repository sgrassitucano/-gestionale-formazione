# Gestionale Formazione Sicurezza — Il Tucano

Full-stack web app for training management, compliance, and billing automation. Built with Next.js 14, Supabase, Prisma, and Turborepo.

## Quick Start

### Prerequisites
- Node.js 18+ (with npm)
- Docker & Docker Compose (for local Supabase)

### 1. Setup Environment

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Fill in .env.local with your Supabase credentials (or use local defaults)
```

### 2. Start Local Supabase (Optional but Recommended)

```bash
# Start Docker containers (Postgres + Supabase)
docker-compose up -d

# Check status
docker-compose ps
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate:dev

# Seed initial data (superadmin user, roles, module permissions)
npm run db:seed

# Open Prisma Studio to inspect DB
npm run db:studio
```

### 4. Start Development

```bash
# Start dev server (Next.js on http://localhost:3000)
npm run dev
```

Navigate to `http://localhost:3000` and login with:
- Email: `admin@example.com`
- Password: `admin123` (from seed)

## Project Structure

See [CLAUDE.md](./CLAUDE.md) for detailed architecture, commands, and conventions.

```
gestionale-formazione/
├── apps/
│   └── web/                 # Next.js 14 app (frontend + API routes)
├── packages/
│   ├── db/                  # Prisma schema + migrations
│   ├── types/               # Shared TypeScript types
│   └── utils/               # Shared utilities
├── docs/                    # Architecture & API docs
├── CLAUDE.md                # Developer guidance
├── BLUEPRINT_SUMMARY.md     # Project overview
└── turbo.json               # Turborepo config
```

## Available Commands

### Development
```bash
npm run dev              # Start all services (dev mode)
npm run build            # Build all packages
npm run lint             # Lint all packages
npm run format           # Format code with Prettier
npm run test             # Run all tests
npm run typecheck        # TypeScript check
```

### Database
```bash
npm run db:generate      # Generate Prisma client
npm run db:migrate:dev   # Create migration + apply
npm run db:studio        # Open Prisma GUI
npm run db:seed          # Seed initial data
npm run db:reset         # Reset DB (dev only)
```

## 7 Moduli

| Module | Status | Description |
|--------|--------|-------------|
| 1. Autenticazione | Planning | Login, roles, permissions, audit log |
| 2. Importazione | Planning | XLS upload, discenti, catalog |
| 3. Aule + Calendario | Planning | Aula creation, lessons, Google Calendar sync |
| 4. Modulistica | Planning | Templates, PDF generator, archiving |
| 5. Prefatturazione | Planning | Billing snapshot, revenue/cost/margin |
| 6. Report | Planning | KPI dashboard, analytics |
| 7. Centri Costo | Planning | Cost distribution per cantiere |

See [PROGETTO_STRUCT.md](./PROGETTO_STRUCT.md) for timeline and dependencies.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 19, TypeScript
- **UI:** Tailwind CSS, Shadcn/ui
- **Database:** PostgreSQL (Supabase), Prisma ORM
- **Auth:** Supabase native (JWT)
- **Storage:** Supabase Storage
- **Calendar:** Google Calendar API (OAuth 2.0)
- **Build:** Turborepo
- **Testing:** Vitest
- **CI/CD:** GitHub Actions

## Documentation

- [CLAUDE.md](./CLAUDE.md) — Developer guide, architecture, conventions
- [BLUEPRINT_SUMMARY.md](./BLUEPRINT_SUMMARY.md) — Project overview
- [PROGETTO_STRUCT.md](./PROGETTO_STRUCT.md) — Structure, moduli, roadmap
- [MODULI_DETTAGLIO.md](./MODULI_DETTAGLIO.md) — Functional specs
- [schema.prisma](./schema.prisma) — Database schema
- [RLS_POLICY.md](./RLS_POLICY.md) — Security policies
- [docs/](./docs/) — Architecture, API, security, deployment

## Owner

**Stefano Grassi** (stefanograssi89@gmail.com)

## License

Proprietary — Do not share outside organization.
