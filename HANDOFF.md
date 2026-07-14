# Handoff — Gestionale Formazione "Il Tucano"

Stato al 2026-07-09. Leggi questo file all'apertura di una nuova chat per riprendere il contesto.

## Stack
Next.js 14 + Prisma + Supabase (Postgres), monorepo Turborepo (`apps/web`, `packages/db`, `packages/types`, `packages/utils`). Design system custom (Shadcn-style, Tailwind, palette blu/arancio, logo Tucano).

## Cosa è fatto

**Moduli (5, non più 7):**
1. **Aule** — anagrafica corsi (+ mapping template↔modalità), anagrafica docenti, wizard creazione aula (3 step: tipo/modalità → upload XLS discenti → dati aula+docenti), lista aule, dettaglio aula (calendario, discenti, docenti, modulistica, Google Calendar sync)
2. **Modulistica** — upload template (PDF/DOCX/HTML), estrazione automatica campi `{{placeholder}}`, mapping a dati (discente/corso/aula/docente)
3. **Prefatturazione** — "cosa fatturare questo mese", live-computed da `Aula.dataInizio`. Presenza+FAD Sincrona = fattura singola per aula. FAD Asincrona = aggregata (somma corsisti multi-aula stesso mese)
4. **Report** — tab Bilancio Aule (ricavo/costo/margine) + tab KPI Dashboard (grafici Recharts, date range 30/60/90/custom)
5. **Centri di Costo** — distribuzione per cantiere/sottocantiere, filtro mese, drill-down

**Admin (superadmin):** Utenti, Permessi moduli, Listino Prezzi, Impostazioni (Google OAuth config), Audit Log

## Decisioni chiave da ricordare
- Niente più import XLS separato: l'unico upload discenti è dentro il wizard creazione aula (step 2), con colonne cantiere/sottocantiere/responsabile opzionali
- Niente più "chiudi aula" per generare bilancio: tutto calcolato live per mese da `Aula.dataInizio` (query dirette, no snapshot immutabili — le tabelle `AulaBilancioSnapshot`/`CentriCostoSnapshot`/`KpiSnapshot` sono state rimosse dallo schema)
- `Aula.modalita`: enum `PRESENZA | FAD_SINCRONA | FAD_ASINCRONA` — Presenza e FAD Sincrona si comportano uguale per fatturazione (singola, per aula) ma hanno documenti diversi; FAD Asincrona è aggregata
- `TemplateMapping` ha `corsoCodec` + `modalita` opzionale (null = vale per tutte le modalità del corso) — mapping libero gestito da Anagrafica Corsi, non da Modulistica
- `Aula.costoAffitto` nuovo campo per costo locali (oltre a costo docenti da tariffa oraria)

## Cosa manca / prossimi passi
1. **DB non ancora collegato**: `.env.local` in `apps/web/` ha placeholder. File SQL pronto in `init.sql` (root progetto), generato da `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` dentro `packages/db/`. Utente deve:
   - Fornire credenziali Supabase reali (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`)
   - Caricare `init.sql` su Supabase
   - Rigenerare `init.sql` se lo schema è cambiato da allora (`cd packages/db && npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`)
   - Eseguire `npm run db:seed` (crea `admin@example.com` / `admin123` + permessi)
2. **Preview mode attivo**: `apps/web/middleware.ts` ha `PREVIEW_MODE = true` che bypassa l'auth — **da rimuovere** quando il DB è collegato e si vuole testare il login vero. Stesso discorso per il fallback mock in `apps/web/app/(dashboard)/layout.tsx` (cerca commenti `TODO: remove`)
3. **Non testato end-to-end** con dati reali (wizard creazione aula, generazione PDF, sync Google Calendar) — solo verificato che compila e renderizza
4. Preview server gira su porta **3001** (non 3000, riservata ad altra sessione) — vedi `.claude/launch.json`

## File di riferimento
- Piano dettagliato ultimo rework: `C:\Users\utente\.claude\plans\elegant-imagining-ripple.md`
- Schema Prisma: `packages/db/prisma/schema.prisma` (sincronizzato anche su root `schema.prisma`)
- SQL init: `init.sql` (root)

## Note di stile utente
- Vuole risposte terse, italiano, no fronzoli (caveman mode attivo nelle chat precedenti)
- Attento ai token: evitare screenshot ripetuti/inutili, preferire verifica rapida (eval leggero) o chiedere all'utente di testare in locale
- Preferisce discutere l'architettura prima di implementare (ha corretto più volte l'impostazione moduli prima di dare il via libera)
