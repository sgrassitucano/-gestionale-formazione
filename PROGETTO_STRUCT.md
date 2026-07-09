# Gestionale Formazione — Struttura Progetto

## Folder Structure

```
gestionale-formazione/
├── .github/
│   └── workflows/
│       ├── test.yml
│       └── deploy.yml
├── apps/
│   ├── web/                          # Next.js frontend + API routes
│   │   ├── app/
│   │   │   ├── (auth)/               # Auth layout group
│   │   │   │   ├── login/
│   │   │   │   └── logout/
│   │   │   ├── (dashboard)/          # Protected layout group
│   │   │   │   ├── dashboard/
│   │   │   │   ├── modulo-1/         # Auth + Gestione Permessi
│   │   │   │   ├── modulo-2/         # Importazione + Catalogo
│   │   │   │   ├── modulo-3/         # Aule + Calendario + Google Calendar
│   │   │   │   ├── modulo-4/         # Modulistica
│   │   │   │   ├── modulo-5/         # Prefatturazione
│   │   │   │   ├── modulo-6/         # Report
│   │   │   │   └── modulo-7/         # Centri di Costo
│   │   │   ├── api/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── corsi/
│   │   │   │   ├── aule/
│   │   │   │   ├── lezioni/
│   │   │   │   ├── docenti/
│   │   │   │   ├── discenti/
│   │   │   │   ├── iscrizioni/
│   │   │   │   ├── modulistica/
│   │   │   │   ├── upload/
│   │   │   │   ├── reports/
│   │   │   │   ├── google-calendar/
│   │   │   │   └── audit/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                   # Shadcn components
│   │   │   ├── forms/
│   │   │   ├── tables/
│   │   │   ├── modals/
│   │   │   ├── charts/
│   │   │   ├── calendar/             # Calendario visivo
│   │   │   └── layout/
│   │   ├── lib/
│   │   │   ├── auth.ts
│   │   │   ├── db.ts
│   │   │   ├── utils.ts
│   │   │   ├── validation.ts
│   │   │   ├── encryption.ts
│   │   │   └── google-calendar.ts    # Integrazione GCal
│   │   ├── hooks/
│   │   ├── styles/
│   │   ├── public/
│   │   │   └── assets/
│   │   │       └── logo-tucano.svg
│   │   ├── middleware.ts
│   │   ├── next.config.js
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── api/                          # Backend API separato (optional, per scale future)
│       └── (vuoto per ora — Next.js API routes sufficienti)
│
├── packages/
│   ├── db/                           # Prisma schema + migrations
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # DB schema
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── client.ts             # Prisma client singleton
│   │   │   ├── middleware/
│   │   │   │   ├── audit.ts
│   │   │   │   └── encryption.ts
│   │   │   └── seeds/
│   │   │       └── seed.ts
│   │   └── package.json
│   │
│   ├── types/                        # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── users.ts
│   │   │   ├── corsi.ts
│   │   │   ├── aule.ts
│   │   │   ├── discenti.ts
│   │   │   ├── iscrizioni.ts
│   │   │   ├── modulistica.ts
│   │   │   ├── reports.ts
│   │   │   ├── centri-costo.ts
│   │   │   └── api.ts
│   │   └── package.json
│   │
│   └── utils/                        # Shared utilities
│       ├── src/
│       │   ├── validators.ts
│       │   ├── formatters.ts
│       │   ├── calculations.ts
│       │   ├── encryption.ts
│       │   └── google-calendar.ts
│       └── package.json
│
├── docs/
│   ├── ARCHITETTURA.md
│   ├── MODULI.md
│   ├── API.md
│   ├── SECURITY.md
│   ├── DEPLOYMENT.md
│   └── CHANGELOG.md
│
├── .env.example
├── .env.local                        # (non committare)
├── docker-compose.yml                # Supabase local
├── README.md
├── package.json                      # Monorepo root
└── turbo.json                        # Turbo config per build parallelizzato
```

---

## Moduli Breakdown

### **Modulo 1: Autenticazione + Gestione Permessi Dinamici**
**Scope:** Login, ruoli, permessi dinamici per modulo (superadmin configura).
**Dipendenze:** Nessuna.

---

### **Modulo 2: Importazione + Catalogo Corsi**
**Scope:** Upload XLS, upsert discenti, gestione catalogo corsi.
**Dipendenze:** Modulo 1 (auth).

---

### **Modulo 3: Aule + Calendario + Google Calendar**
**Scope:** 
- Creazione aule con discenti + docenti
- Calendario visivo drag-drop lezioni
- Integrazione Google Calendar (sincronizzazione eventi)
- Stato aula: Pianificata → In Corso → Conclusa

**Dipendenze:** Modulo 1, Modulo 2 (discenti).

---

### **Modulo 4: Modulistica Dinamica**
**Scope:** Template manager, PDF generator pre-compilati, archivio upload.
**Dipendenze:** Modulo 1, Modulo 3 (aule).

---

### **Modulo 5: Prefatturazione**
**Scope:** Bilancio aula real-time (ricavo - costo docenti = margine). Report prefatturazione.
**Dipendenze:** Modulo 1, Modulo 3 (aule, lezioni, docenti).
**Trigger:** Aggiorna alla chiusura aula (stato = Conclusa).

---

### **Modulo 6: Report**
**Scope:** KPI dashboard, grafici, analytics (aule attive, discenti per corso, costo medio).
**Dipendenze:** Modulo 1, Modulo 5 (dati bilancio).
**Trigger:** Aggiorna alla chiusura aula.

---

### **Modulo 7: Centri di Costo**
**Scope:** Distribuzione costi su cantieri/sottocantieri (formula: costo totale / N discenti × N discenti cantiere).
**Dipendenze:** Modulo 1, Modulo 3 (iscrizioni), Modulo 5 (costi aula).
**Trigger:** Aggiorna alla chiusura aula.

---

## Cascata Utilizzo (Flusso Operativo)

1. **Importa XLS discenti** (Modulo 2)
2. **Crea aula** + assegna discenti + assegna docenti + **costruisci calendario** + **sincronizza Google Calendar** (Modulo 3)
3. **Genera PDF pre-compilati** (Modulo 4)
4. **Upload registri/verbali/attestati** finali (Modulo 4)
5. **Chiudi aula** (stato = Conclusa) → **Trigger batch:** Moduli 5, 6, 7 aggiornano bilancio, KPI, centri costo

---

## Roadmap Implementazione

| Fase | Modulo | Timeline | Priority |
|------|--------|----------|----------|
| **v0.1** | DB Schema + Modulo 1 (Auth) | Week 1-2 | CRITICAL |
| **v0.2** | Modulo 2 (Importazione) | Week 3-4 | HIGH |
| **v0.3** | Modulo 3 (Aule + Calendario + GCal) | Week 5-7 | HIGH |
| **v0.4** | Modulo 4 (Modulistica) | Week 8-9 | MEDIUM |
| **v0.5** | Modulo 5 (Prefatturazione) | Week 10-11 | HIGH |
| **v0.6** | Modulo 6 (Report) | Week 12 | MEDIUM |
| **v0.7** | Modulo 7 (Centri Costo) | Week 13 | MEDIUM |
| **v1.0** | Polish + Deploy | Week 14-15 | HIGH |

---

## Prossimo Step
→ **Schema DB (Prisma)** con relazioni, RLS policy, campi encryption-ready, calendario fields
