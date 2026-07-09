# Moduli — Dettaglio Funzionalità

## MODULO 1: Autenticazione + Gestione Permessi Dinamici

### Funzionalità Core
- **Login:** Email + Password. Niente OAuth.
- **Session:** JWT token (Supabase native). Scadenza 24h.
- **Ruoli Fissi:** 4 ruoli pre-definiti (non customizzabili singolarmente).
- **Permessi Dinamici:** Superadmin attiva/disattiva visibilità di un intero modulo (1-7) per ogni ruolo.

### Utenti Coinvolti
- **Superadmin:** Accesso totale + UI per gestire permessi
- **Segreteria:** Accesso moduli abilitati
- **Amministrazione:** Accesso moduli abilitati
- **Visualizzatore:** Accesso moduli abilitati (sola lettura)

### UI
- **Login Page:** Form email/password semplice. Logo Tucano.
- **Admin Panel — Permessi:** Griglia ruoli × moduli (toggle visibilità).
- **Sidebar Navigation:** Mostra solo moduli abilitati per il ruolo dell'utente.
- **Audit Log:** Superadmin vede log login/logout + permessi modificati.

### DB Entities
- `profili_utenti` (ID, email, password_hash, ruolo)
- `modulo_permessi` (ruolo, modulo_id, visible)
- `audit_logs` (utente_id, azione, timestamp, dettagli)

### Constraints
- Un utente = un ruolo (no multi-ruolo).
- Permessi cambiano in real-time (niente cache).
- RLS: ogni query filtrata per ruolo utente.

---

## MODULO 2: Importazione + Catalogo Corsi

### Funzionalità Core
- **Upload XLS:** Formato standard da gestionali aziendali.
- **Validazione:** Schema colonne obbligatorie (anagrafiche, cantiere, responsabile, tipo corso).
- **Upsert Discenti:** Match su `codice_fiscale`. Se esiste → aggiorna logistica. Se no → crea.
- **Catalogo Corsi:** CRUD corsi (codice, titolo, tipo, ore, validità).
- **Esigenze Pendenti:** Vista filtrabile di discenti importati senza aula assegnata.

### Utenti Coinvolti
- **Segreteria:** Upload, crea corsi, vede esigenze.
- **Amministrazione:** Lettura catalogo + esigenze.
- **Visualizzatore:** Lettura sola.

### UI
- **Upload Panel:** Drag-drop XLS. Preview colonne.
- **Validation Report:** Errori/warnings per riga (es: "CF duplicato", "Colonna tipo_corso assente").
- **Catalogo Corsi:** Tabella con CRUD inline (edit/delete).
- **Esigenze Pendenti:** Tabella filtrata per corso, cantiere. Selezione bulk.

### DB Entities
- `catalogo_corsi` (codice PK, titolo, tipo, ore_aula, ore_elearning, validita_anni)
- `discenti` (ID, matricola, cognome, nome, data_nascita, CF, mail, cellulare, azienda_id)
- `aziende` (ID, ragione_sociale, p_iva, cf, email_referente)
- `import_logs` (ID, utente_id, data_import, file_name, rows_processed, errors_count)

### Constraints
- CF unico per discente (enforce a DB).
- Validazione ore: ore_aula + ore_elearning > 0.
- Colonne XLS: ordine fisso, case-insensitive.

---

## MODULO 3: Aule + Calendario + Google Calendar

### Funzionalità Core
- **Creazione Aula:** Seleziona corso → discenti da esigenze → luogo → stato `Pianificata`.
- **Calendario Visivo:** Drag-drop lezioni su timeline. Spezzamento flessibile ore.
- **Assegnazione Docenti:** Aggiungi N docenti. Ore effettive per docente (no vincolo ore totali).
- **Google Calendar Sync:** 
  - Ogni lezione crea evento Google Calendar (titolo, data/ora, luogo, discenti, docenti).
  - Campi DB: `google_calendar_event_id`, `google_calendar_sync_timestamp`, `sync_enabled`.
  - Aggiornamenti lezione → sincronizza evento GCal.
  - Cancellazione lezione → cancella evento GCal.
- **Validazioni Overlap:**
  - Docente non può insegnare 2 aule stessa data/ora.
  - Luogo non può ospitare 2 aule stessa data/ora.
- **Transizioni Stato:**
  - `Pianificata` → `In Corso` (quando data inizio raggiunta).
  - `In Corso` → `Conclusa` (manuale da segreteria) → **Trigger batch aggiornamento Moduli 5, 6, 7**.

### Utenti Coinvolti
- **Segreteria:** Crea aule, assegna discenti/docenti, gestisce calendario, gestisce stato.
- **Amministrazione:** Lettura, export aule.
- **Visualizzatore:** Lettura sola.

### UI
- **Aula Detail:** Form corso → discenti selezionabili (da esigenze) → luogo → docenti add/remove → toggle sync GCal.
- **Calendario:** Grid settimanale/mensile. Lezioni draggabili. Click = edit data/ora/docente.
- **Conflict Checker:** Avviso real-time overlap (rosso se conflitto).
- **Lista Aule:** Tabella filtrata per stato, corso, data. Colonna "Margine Aula" (solo admin). Colonna "GCal Sync Status".

### DB Entities
- `aule` (ID, corso_codice FK, luogo, stato, creato_da, data_inizio, data_fine)
- `lezioni` (ID, aula_id FK, data, ora_inizio, ora_fine, google_calendar_event_id, google_calendar_sync_timestamp)
- `docenti_lezioni` (aula_id FK, docente_id FK, ore_effettive_docenza)
- `iscrizioni_aula` (ID, aula_id FK, discente_id FK, cantiere, sottocantiere, responsabile, data_iscrizione)
- `docenti` (ID, cognome, nome, email, tariffa_oraria)
- `google_calendar_config` (ID, utente_id FK, calendar_id, access_token_encrypted, refresh_token_encrypted, sync_enabled)

### Constraints
- Aula non può avere lezioni senza discenti.
- Docente tariffa_oraria > 0.
- Overlap validation: query pre-salvataggio lezione.
- Google Calendar API: OAuth 2.0 scoped su `calendar.events`.
- Token refresh automatico prima scadenza.

---

## MODULO 4: Modulistica Dinamica

### Funzionalità Core
- **Template Manager:** Upload template PDF/Word → catalogazione.
- **Mapping Template-Corso:** Associa template a corsi (es: "Foglio Firme" → "FORM_BASE").
- **PDF Generator:** Click "Genera PDF" → pre-compila dati discenti, date, orari, docenti firmatari.
- **Archivio Manuale:** Post-corso, upload registri firmati, verbali, test, attestati. Storage privato.

### Utenti Coinvolti
- **Segreteria:** Upload template, genera PDF, carica documenti finali.
- **Amministrazione:** Lettura archivio.
- **Visualizzatore:** Lettura sola.

### UI
- **Template Panel:** Upload area. Tabella template con mapping corso.
- **Aula Detail — Tab "Modulistica":** Bottone "Genera PDF" per ogni template mappato. Preview prima di download.
- **Archivio Aula:** Upload area per registri/verbali/attestati. Visualizzazione file con link download.

### DB Entities
- `templates` (ID, nome, file_url, creato_da, data_upload)
- `template_mapping` (ID, template_id FK, corso_codice FK)
- `archivio_aula` (ID, aula_id FK, tipo_documento, file_url, upload_da, data_upload)

### Constraints
- Template file_url = Supabase Storage privato.
- Solo PDF/Word accettati (MIME type check).
- Retention: archivio conservato 10 anni (soft-delete).

---

## MODULO 5: Prefatturazione

### Funzionalità Core
- **Bilancio Aula Real-Time:**
  - Ricavo = (corso tipo `AULA_FAD` → costo fisso) oppure (`E_LEARNING` → costo unitario × discenti iscritti).
  - Costo = Σ(ore_effettive_docenza × tariffa_oraria) per tutti docenti aula.
  - Margine = Ricavo - Costo.
- **Report Prefatturazione:** Tabella aule con ricavo/costo/margine. Filtri per corso, data, stato.
- **Trigger Chiusura Aula:** Quando aula va a stato `Conclusa` → fissa bilancio snapshot (no recalc future se listini cambiano).

### Utenti Coinvolti
- **Amministrazione:** Accesso totale reports + configurazione listini.
- **Segreteria:** Lettura report (no edit listini).
- **Visualizzatore:** Lettura sola.

### UI
- **Listini Panel:** Tabella corso × tipo_erogazione → costo. Inline edit (admin).
- **Report Prefatturazione:** Tabella aule (ricavo/costo/margine). Export XLS.
- **Bilancio Aula Detail:** Card ricavo, costo, margine con breakdown per docente.

### DB Entities
- `listino_prezzi` (ID, corso_codice FK, tipo_erogazione, costo)
- `aula_bilancio_snapshot` (ID, aula_id FK, ricavo, costo_totale, margine, data_chiusura) [creato a chiusura aula]

### Constraints
- Costo listino ≥ 0.
- Snapshot immutabile dopo chiusura aula.

---

## MODULO 6: Report

### Funzionalità Core
- **Dashboard KPI:**
  - N aule attive/concluse.
  - N discenti per tipologia corso.
  - Costo medio/discente.
  - Margine medio per tipo aula.
  - Trend ricavi (timeline).
- **Grafici:** Torta discenti per corso, bar margini per corso, timeline ricavi.
- **Trigger Chiusura Aula:** Aggiorna KPI al salvataggio snapshot bilancio.

### Utenti Coinvolti
- **Amministrazione:** Accesso totale + filtri.
- **Visualizzatore:** Lettura sola.

### UI
- **Dashboard:** Layout grid con card KPI + grafici Recharts.
- **Filtri:** Per data range, corso, stato aula.
- **Export:** XLS della sottosezione visibile.

### DB Entities
- Calcolate views: `kpi_aule_attive`, `kpi_discenti_per_corso`, `kpi_costo_medio`, `kpi_margine_per_tipo`.

### Constraints
- Dati calcolati da `aula_bilancio_snapshot` (dati storici immutabili).

---

## MODULO 7: Centri di Costo

### Funzionalità Core
- **Distribuzione Centri di Costo:** Per aule AULA_FAD, distribuisci costo totale su cantieri:
  - `Costo_Cantiere = (Costo_Totale_Aula / N_Discenti_Totali) × N_Discenti_Cantiere`
- **Report Centri di Costo:** Tabella cantiere × corso con costo attribuito. Drill-down per responsabile, sottocantiere.
- **Trigger Chiusura Aula:** Calcola distribuzione al salvataggio snapshot bilancio.

### Utenti Coinvolti
- **Amministrazione:** Accesso totale reports.
- **Visualizzatore:** Lettura sola.

### UI
- **Centri Costo Report:** Tabella cantiere × corso (costo attribuito). Filtri per data range, cantiere, responsabile.
- **Drill-Down:** Click cantiere → vedi sottocantieri/responsabili.
- **Export:** XLS della sottosezione visibile.

### DB Entities
- `centri_costo_snapshot` (ID, aula_id FK, cantiere, sottocantiere, responsabile, costo_attribuito, data_calcolo)

### Constraints
- Calcolato solo per aule tipo `AULA_FAD` (E_LEARNING no).
- Snapshot immutabile dopo calcolo.

---

## Permission Matrix (RLS)

| Modulo | Segreteria | Amministrazione | Visualizzatore |
|--------|-----------|----------------|----------------|
| 1: Auth | R | R | R |
| 2: Importazione | CRU | R | R |
| 3: Aule | CRU | R | R |
| 4: Modulistica | CRU | R | R |
| 5: Prefatturazione | R | CRUD | R |
| 6: Report | R | R | R |
| 7: Centri Costo | R | R | R |

- C = Create, R = Read, U = Update, D = Delete
- Superadmin = ALL
- Tutti = Soft-delete only (no hard-delete)

---

## Cascata Utilizzo (Flusso Operativo Revisited)

1. **Importa XLS discenti** (Mod 2) → discenti in stato "Esigenza Pendente"
2. **Crea aula** + assegna discenti + assegna docenti + costruisci calendario + sincronizza Google Calendar (Mod 3)
3. **Genera PDF pre-compilati** (Mod 4) (registri, firme, autodichiarazioni)
4. **Upload registri/verbali/attestati** finali (Mod 4) (scansioni/PDF)
5. **Chiudi aula** (stato = Conclusa) → **Trigger batch:**
   - Modulo 5: Fissa bilancio snapshot (ricavo/costo/margine immutabile)
   - Modulo 6: Aggiorna KPI dashboard
   - Modulo 7: Calcola distribuzione centri di costo

---

## Prossimo Step
→ **Schema DB (Prisma)** con relazioni, RLS policy, campi encryption-ready, Google Calendar fields
