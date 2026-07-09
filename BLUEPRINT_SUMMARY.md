# Gestionale Formazione Sicurezza — Blueprint Summary

**Status:** Design phase complete. Ready for development.

---

## Project Overview

**Name:** Gestionale Formazione Sicurezza "Il Tucano"
**Scope:** 7 moduli, full-stack web app (Next.js + Supabase)
**Timeline:** 15 weeks (v0.1 → v1.0)
**Users:** Stefano (Segreteria), 2 Amministrativi, Titolare (Viewer)

---

## Design Documents

| File | Purpose | Status |
|------|---------|--------|
| `PROGETTO_STRUCT.md` | Folder structure, moduli breakdown, roadmap | ✅ Complete |
| `MODULI_DETTAGLIO.md` | Detailed functionality per modulo (7 moduli) | ✅ Complete |
| `schema.prisma` | Database schema (20+ tables, Prisma ORM) | ✅ Complete |
| `RLS_POLICY.md` | Row-level security policies (Supabase) | ✅ Complete |

---

## Architecture Decision

### Stack
- **Frontend/Backend:** Next.js 14 (App Router) + TypeScript
- **Database:** PostgreSQL (Supabase self-hosted)
- **ORM:** Prisma
- **UI:** Tailwind CSS + Shadcn/ui
- **Storage:** Supabase Storage (privato)
- **Calendar:** Google Calendar API (OAuth 2.0)
- **Auth:** Supabase native (JWT, 24h session)

### Security
- RLS enforced on all tables (4 roles: Superadmin, Segreteria, Amministrazione, Visualizzatore)
- Field-level encryption: CF, data_nascita, cellulare, email (Prisma middleware)
- Soft-delete everywhere (10 anni retention, audit log)
- Audit log: all changes tracked

### Key Features
1. **Dynamic Permissions:** Superadmin configures module visibility per role
2. **Flexible Docent Hours:** Docent paid hours ≠ aula total hours (e.g., 12h aula / 8h docent)
3. **Google Calendar Sync:** Automatic event creation/update per lezione
4. **Snapshot Bilancio:** Immutable cost calculation at aula closure
5. **Centri di Costo:** Auto-distribution formula to cantieri (closure trigger)

---

## Moduli Overview

| Mod | Name | Dev Order | Users | Features |
|-----|------|-----------|-------|----------|
| 1 | Auth + Perms | 1st | All | Login, roles, dynamic perms, audit log |
| 2 | Importazione | 2nd | Segreteria | XLS upload, discenti upsert, catalogo CRUD |
| 3 | Aule | 3rd | Segreteria | Aula creation, calendario, GCal sync, docenti assign |
| 4 | Modulistica | 4th | Segreteria | Template manager, PDF generator, archivio |
| 5 | Prefatturazione | 5th | Amministrazione | Bilancio snapshot, ricavo/costo/margine calc |
| 6 | Report | 6th | Amministrazione | KPI dashboard, grafici, analytics |
| 7 | Centri Costo | 7th | Amministrazione | Costo distribution calc per cantiere |

---

## Permission Matrix

| Modulo | Superadmin | Segreteria | Amministrazione | Visualizzatore |
|--------|-----------|-----------|-----------------|----------------|
| 1: Auth | ALL | R(self) | R(self) | R(self) |
| 2: Importazione | ALL | CRUD | - | R |
| 3: Aule | ALL | CRUD | - | R |
| 4: Modulistica | ALL | CRUD | - | R |
| 5: Prefatturazione | ALL | - | CRUD | R |
| 6: Report | ALL | - | R | R |
| 7: Centri Costo | ALL | - | R | R |

- Visualizzatore: READ ovunque
- Segreteria: NO listino, bilancio, report, centri costo
- Amministrazione: ONLY moduli 5,7 + listino (mod 2,3,4 blocked)

---

## Data Flow (Cascata Utilizzo)

```
1. Importa XLS discenti (Mod 2)
   ↓
2. Crea aula → assegna discenti → assegna docenti → calendario → GCal sync (Mod 3)
   ↓
3. Genera PDF pre-compilati (Mod 4)
   ↓
4. Upload registri/verbali/attestati (Mod 4)
   ↓
5. Chiudi aula (stato = CONCLUSA)
   └─→ TRIGGER BATCH:
       ├─ Mod 5: Snapshot bilancio (ricavo/costo/margine immutabile)
       ├─ Mod 6: Update KPI dashboard
       └─ Mod 7: Calcola distribuzione centri costo
```

---

## Key Technical Decisions

✅ **Soft-delete everywhere** — no hard-delete, 10-year retention  
✅ **RLS at database level** — permessi enforcement via SQL policies  
✅ **Snapshot immutability** — bilancio/centri costo fixed at closure  
✅ **Google Calendar via OAuth** — sync lezioni as events  
✅ **Flexible docent hours** — ore pagata indipendente da ore aula  
✅ **Trasferta cost** — optional field per docente per aula  
✅ **Docent substitution** — soft-delete old, add new with history  
✅ **Encryption middleware** — Prisma PII encryption (CF, email, cellulare, data_nascita)

---

## File Locations

All files in: `C:\Users\utente\Documents\Assistente_Claude\Progetti\Gestionale_formazione\`

```
gestionale-formazione/
├── PROGETTO_STRUCT.md
├── MODULI_DETTAGLIO.md
├── schema.prisma
├── RLS_POLICY.md
├── BLUEPRINT_SUMMARY.md (this file)
└── (repo to be init)
```

---

## Next Steps

1. **Init repo:** Create monorepo structure (apps/web, packages/db, packages/types, packages/utils)
2. **Setup Prisma:** Copy schema.prisma, init migrations
3. **Setup Supabase:** Docker-compose local, enable RLS, seed initial data
4. **Modulo 1:** Implement auth + admin panel (Week 1-2)
5. **Modulo 2:** Importazione (Week 3-4)
6. ... (see timeline in PROGETTO_STRUCT.md)

---

## Sign-Off

**Design approved:** ✅  
**Ready for development:** ✅  
**Owner:** Stefano Grassi  
**Date:** 2026-07-09

---

*Per domande/modifiche architettura, vedi documentazione nel progetto.*
