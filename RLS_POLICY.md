# RLS Policy — Row-Level Security

Supabase/PostgreSQL RLS attivo su tutte le tabelle. Policy applicate per ruolo utente.

## Schema Policy

Ogni tabella ha policy SELECT, INSERT, UPDATE, DELETE filtrate per ruolo.

---

## MODULO 1: Autenticazione + Permessi

### ProfiloUtente
```sql
-- SUPERADMIN: ALL
SELECT: auth.uid() = utenti.id OR ruolo = 'SUPERADMIN'
INSERT: ruolo = 'SUPERADMIN'
UPDATE: ruolo = 'SUPERADMIN'
DELETE: FALSE (soft-delete via trigger)

-- SEGRETERIA, AMMINISTRAZIONE, VISUALIZZATORE: Self-read only
SELECT: auth.uid() = utenti.id
INSERT: FALSE
UPDATE: auth.uid() = utenti.id (solo nome/cognome, no ruolo/email)
DELETE: FALSE
```

### ModuloPermesso
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: ruolo = 'SUPERADMIN'
UPDATE: ruolo = 'SUPERADMIN'
DELETE: FALSE (soft-delete via trigger)

-- SEGRETERIA, AMMINISTRAZIONE, VISUALIZZATORE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

### LogAudit
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: TRUE (creato via app logic)
UPDATE: FALSE
DELETE: FALSE

-- SEGRETERIA, AMMINISTRAZIONE, VISUALIZZATORE: Self-read
SELECT: utente_id = auth.uid()
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

---

## MODULO 2: Importazione + Catalogo Corsi

### Azienda
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: ruolo = 'SUPERADMIN'
UPDATE: ruolo = 'SUPERADMIN'
DELETE: FALSE

-- SEGRETERIA: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE

-- AMMINISTRAZIONE, VISUALIZZATORE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

### Discente
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: ruolo = 'SUPERADMIN' OR ruolo = 'SEGRETERIA'
UPDATE: ruolo = 'SUPERADMIN' OR ruolo = 'SEGRETERIA'
DELETE: FALSE

-- SEGRETERIA: CRU
SELECT: TRUE
INSERT: TRUE
UPDATE: TRUE
DELETE: FALSE

-- AMMINISTRAZIONE: No access
SELECT: FALSE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE

-- VISUALIZZATORE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

### CatalogoCorso
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: TRUE
UPDATE: TRUE
DELETE: FALSE

-- SEGRETERIA: CRU
SELECT: TRUE
INSERT: TRUE
UPDATE: TRUE
DELETE: FALSE

-- AMMINISTRAZIONE: No access
SELECT: FALSE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE

-- VISUALIZZATORE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

### ListinoPrezzi
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: TRUE
UPDATE: TRUE
DELETE: FALSE

-- AMMINISTRAZIONE: CRUD
SELECT: TRUE
INSERT: TRUE
UPDATE: TRUE
DELETE: FALSE

-- SEGRETERIA: No access
SELECT: FALSE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE

-- VISUALIZZATORE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

### ImportLog
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: TRUE
UPDATE: FALSE
DELETE: FALSE

-- SEGRETERIA: Self-read (proprio import log)
SELECT: utente_id = auth.uid()
INSERT: utente_id = auth.uid() (creato via app logic)
UPDATE: FALSE
DELETE: FALSE

-- AMMINISTRAZIONE, VISUALIZZATORE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

---

## MODULO 3: Aule, Lezioni, Docenti, Iscrizioni

### Docente
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: TRUE
UPDATE: TRUE
DELETE: FALSE

-- SEGRETERIA: CRUD
SELECT: TRUE
INSERT: TRUE
UPDATE: TRUE
DELETE: FALSE

-- AMMINISTRAZIONE: No access
SELECT: FALSE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE

-- VISUALIZZATORE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

### Aula
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: TRUE
UPDATE: TRUE
DELETE: FALSE

-- SEGRETERIA: CRUD
SELECT: TRUE
INSERT: TRUE
UPDATE: TRUE
DELETE: FALSE

-- AMMINISTRAZIONE: No access
SELECT: FALSE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE

-- VISUALIZZATORE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

### Lezione
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: TRUE
UPDATE: TRUE
DELETE: FALSE

-- SEGRETERIA: CRUD (solo per aule proprie)
SELECT: aula_id IN (SELECT id FROM aule WHERE creato_da = auth.uid())
INSERT: aula_id IN (SELECT id FROM aule WHERE creato_da = auth.uid())
UPDATE: aula_id IN (SELECT id FROM aule WHERE creato_da = auth.uid())
DELETE: FALSE

-- AMMINISTRAZIONE: No access
SELECT: FALSE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE

-- VISUALIZZATORE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

### DocenteLezione
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: TRUE
UPDATE: TRUE (data_fine = sostituzione)
DELETE: FALSE

-- SEGRETERIA: CRUD (solo per aule proprie)
SELECT: aula_id IN (SELECT id FROM aule WHERE creato_da = auth.uid())
INSERT: aula_id IN (SELECT id FROM aule WHERE creato_da = auth.uid())
UPDATE: aula_id IN (SELECT id FROM aule WHERE creato_da = auth.uid())
DELETE: FALSE

-- AMMINISTRAZIONE: No access
SELECT: FALSE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE

-- VISUALIZZATORE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

### IscrizioneAula
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: TRUE
UPDATE: TRUE
DELETE: FALSE

-- SEGRETERIA: CRUD (solo per aule proprie)
SELECT: aula_id IN (SELECT id FROM aule WHERE creato_da = auth.uid())
INSERT: aula_id IN (SELECT id FROM aule WHERE creato_da = auth.uid())
UPDATE: aula_id IN (SELECT id FROM aule WHERE creato_da = auth.uid())
DELETE: FALSE

-- AMMINISTRAZIONE: No access
SELECT: FALSE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE

-- VISUALIZZATORE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

### GoogleCalendarConfig
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: TRUE
UPDATE: TRUE
DELETE: FALSE

-- Ruolo owner (SEGRETERIA che setup GCal): Self-CRUD
SELECT: utente_id = auth.uid()
INSERT: utente_id = auth.uid()
UPDATE: utente_id = auth.uid()
DELETE: FALSE

-- AMMINISTRAZIONE, VISUALIZZATORE: Read-only
SELECT: utente_id = auth.uid() (solo proprio)
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

---

## MODULO 4: Modulistica

### Template
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: TRUE
UPDATE: TRUE
DELETE: FALSE

-- SEGRETERIA: CRU
SELECT: TRUE
INSERT: TRUE
UPDATE: TRUE (solo nome, no fileUrl)
DELETE: FALSE

-- AMMINISTRAZIONE: No access
SELECT: FALSE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE

-- VISUALIZZATORE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

### TemplateMapping
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: TRUE
UPDATE: FALSE
DELETE: FALSE

-- SEGRETERIA: CR
SELECT: TRUE
INSERT: TRUE
UPDATE: FALSE
DELETE: FALSE

-- AMMINISTRAZIONE, VISUALIZZATORE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

### ArchivioAula
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: TRUE
UPDATE: FALSE
DELETE: FALSE

-- SEGRETERIA: CR (upload documenti per aule proprie)
SELECT: aula_id IN (SELECT id FROM aule WHERE creato_da = auth.uid())
INSERT: aula_id IN (SELECT id FROM aule WHERE creato_da = auth.uid())
UPDATE: FALSE
DELETE: FALSE

-- AMMINISTRAZIONE: No access
SELECT: FALSE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE

-- VISUALIZZATORE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

---

## MODULO 5: Prefatturazione

### AulaBilancioSnapshot
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: TRUE (creato via trigger chiusura aula)
UPDATE: FALSE (immutabile)
DELETE: FALSE

-- AMMINISTRAZIONE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE

-- SEGRETERIA: No access
SELECT: FALSE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE

-- VISUALIZZATORE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

---

## MODULO 6 & 7: Report + Centri Costo

### CentriCostoSnapshot
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: TRUE (creato via trigger chiusura aula)
UPDATE: FALSE (immutabile)
DELETE: FALSE

-- AMMINISTRAZIONE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE

-- VISUALIZZATORE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE

-- SEGRETERIA: No access
SELECT: FALSE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

### KpiSnapshot
```sql
-- SUPERADMIN: ALL
SELECT: TRUE
INSERT: TRUE (creato via batch job)
UPDATE: FALSE
DELETE: FALSE

-- AMMINISTRAZIONE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE

-- VISUALIZZATORE: Read-only
SELECT: TRUE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE

-- SEGRETERIA: No access
SELECT: FALSE
INSERT: FALSE
UPDATE: FALSE
DELETE: FALSE
```

---

## Implementazione Supabase RLS

### Enable RLS su tutte le tabelle
```sql
ALTER TABLE profili_utenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_permesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_audit ENABLE ROW LEVEL SECURITY;
-- ... etc per tutte le tabelle
```

### Helper: Funzione per ottenere ruolo utente
```sql
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT ruolo::TEXT FROM profili_utenti WHERE id = user_id LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Cache 5 min per performance
```

### Trigger soft-delete
```sql
CREATE OR REPLACE FUNCTION soft_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE [table_name] SET deleted_at = NOW() WHERE id = OLD.id;
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applica trigger a tutte le tabelle con deleted_at
```

### Trigger AulaBilancioSnapshot (a chiusura aula)
```sql
CREATE OR REPLACE FUNCTION create_bilancio_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stato = 'CONCLUSA' AND OLD.stato != 'CONCLUSA' THEN
    -- Calcola ricavo da listino
    -- Calcola costo da docenti_lezioni
    -- Inserisci snapshot
    INSERT INTO aula_bilancio_snapshot (aula_id, ricavo, costo_totale, margine, data_chiusura)
    VALUES (NEW.id, [ricavo_calc], [costo_calc], [margine_calc], NOW());
    
    -- Calcola centri costo
    INSERT INTO centri_costo_snapshot (aula_id, cantiere, sottocantiere, responsabile, costo_attribuito, data_calcolo)
    SELECT NEW.id, ia.cantiere, ia.sottocantiere, ia.responsabile, [costo_attr_calc], NOW()
    FROM iscrizioni_aula ia WHERE ia.aula_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Permission Matrix Riepilogo

| Tabella | Superadmin | Segreteria | Amministrazione | Visualizzatore |
|---------|-----------|-----------|-----------------|----------------|
| Profili | ALL | R(self) | R(self) | R(self) |
| ModuloPermesso | ALL | R | R | R |
| LogAudit | ALL | R(self) | R(self) | R |
| Discenti | ALL | CRUD | - | R |
| CatalogoCorso | ALL | CRU | - | R |
| ListinoPrezzi | ALL | - | CRUD | R |
| Aule | ALL | CRUD | - | R |
| Lezioni | ALL | CRUD(self) | - | R |
| DocenteLezione | ALL | CRUD(self) | - | R |
| Iscrizioni | ALL | CRUD(self) | - | R |
| Template | ALL | CRU | - | R |
| ArchivioAula | ALL | CR(self) | - | R |
| AulaBilancioSnapshot | ALL | - | R | R |
| CentriCostoSnapshot | ALL | - | R | R |
| KpiSnapshot | ALL | - | R | R |

---

## Notes

- **SEGRETERIA:** "self" = solo aule create da loro (`creato_da = auth.uid()`)
- **AMMINISTRAZIONE:** Legge listini + prefatturazione, no inserimenti/modifiche dati operativi
- **VISUALIZZATORE:** Read-only su tutto, no report finanziari sensibili
- **Encryption:** CF, data_nascita, cellulare, email crittografati via Prisma middleware
- **Soft-delete:** No hard-delete. Trigger su DELETE → UPDATE deleted_at = NOW()
- **Trigger chiusura aula:** Batch insert snapshot bilancio + centri costo
