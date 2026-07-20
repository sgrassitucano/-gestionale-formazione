-- RLS reale, basata su variabili di sessione Postgres (app.user_id/app.user_role)
-- settate da packages/db/src/context.ts::withUserContext dentro una transazione
-- (SET LOCAL, sicuro con connection pooling in modalità transazione).
-- Ruoli e permessi ricalcano la tabella in CLAUDE.md (SUPERADMIN tutto,
-- SEGRETERIA moduli 1-4, AMMINISTRAZIONE moduli 1,5-7, VISUALIZZATORE read-all).
--
-- ATTIVATA IN PRODUZIONE il 2026-07-20 (packages/db/scripts/apply-rls.ts).
-- Ruolo dedicato non-superuser "app_user" creato (packages/db/scripts/create-app-role.ts),
-- DATABASE_URL aggiornato in apps/web/.env.local. Tutti gli endpoint API
-- migrati a withUserContext/withServiceContext (packages/db/src/context.ts).
-- Verificata con packages/db/scripts/test-rls.ts: isolamento per ruolo,
-- deny-by-default senza contesto, lettura/scrittura per ruolo confermate.

CREATE OR REPLACE FUNCTION app_current_role() RETURNS text AS $$
  SELECT current_setting('app.user_role', true);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS text AS $$
  SELECT current_setting('app.user_id', true);
$$ LANGUAGE sql STABLE;

-- ============================================================
-- Tabelle operative (Moduli 2/3/4): tutti e 4 i ruoli leggono,
-- solo SUPERADMIN/SEGRETERIA scrivono.
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'Azienda', 'Discente', 'CatalogoCorso', 'ListinoPrezzi', 'ImportLog',
    'Aula', 'Lezione', 'Docente', 'DocenteLezione', 'IscrizioneAula', 'Luogo',
    'GoogleCalendarConfig', 'Template', 'TemplateField', 'TemplateMapping',
    'ArchivioAula', 'ChiusuraAula'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t); -- vale solo se il ruolo connesso NON è superuser/owner-esente
    EXECUTE format('DROP POLICY IF EXISTS op_select ON %I', t);
    EXECUTE format(
      'CREATE POLICY op_select ON %I FOR SELECT USING (app_current_role() IN (''SUPERADMIN'',''SEGRETERIA'',''AMMINISTRAZIONE'',''VISUALIZZATORE''))',
      t
    );
    EXECUTE format('DROP POLICY IF EXISTS op_write ON %I', t);
    EXECUTE format(
      'CREATE POLICY op_write ON %I FOR ALL USING (app_current_role() IN (''SUPERADMIN'',''SEGRETERIA'')) WITH CHECK (app_current_role() IN (''SUPERADMIN'',''SEGRETERIA''))',
      t
    );
  END LOOP;
END $$;

-- ListinoPrezzi: solo SUPERADMIN scrive i prezzi (già incluso sopra in lettura
-- larga, qui restringiamo la scrittura togliendo SEGRETERIA).
DROP POLICY IF EXISTS op_write ON "ListinoPrezzi";
CREATE POLICY op_write ON "ListinoPrezzi" FOR ALL
  USING (app_current_role() = 'SUPERADMIN')
  WITH CHECK (app_current_role() = 'SUPERADMIN');

-- ============================================================
-- Tabella finanziaria (Modulo 5): SUPERADMIN + AMMINISTRAZIONE scrivono,
-- tutti leggono (serve anche a SEGRETERIA/VISUALIZZATORE per i report incrociati).
-- ============================================================
ALTER TABLE "VoceContabile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VoceContabile" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vc_select ON "VoceContabile";
CREATE POLICY vc_select ON "VoceContabile" FOR SELECT
  USING (app_current_role() IN ('SUPERADMIN','SEGRETERIA','AMMINISTRAZIONE','VISUALIZZATORE'));
DROP POLICY IF EXISTS vc_write ON "VoceContabile";
CREATE POLICY vc_write ON "VoceContabile" FOR ALL
  USING (app_current_role() IN ('SUPERADMIN','AMMINISTRAZIONE'))
  WITH CHECK (app_current_role() IN ('SUPERADMIN','AMMINISTRAZIONE'));

-- ============================================================
-- Tabelle amministrative sensibili (Modulo 1): accesso ristretto.
-- ============================================================

-- ProfiloUtente: SUPERADMIN vede/gestisce tutti; ogni utente vede sempre e
-- solo la propria riga (serve per /api/auth/me e verifiche sessione).
ALTER TABLE "ProfiloUtente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfiloUtente" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pu_select ON "ProfiloUtente";
CREATE POLICY pu_select ON "ProfiloUtente" FOR SELECT
  USING (app_current_role() = 'SUPERADMIN' OR id = app_current_user_id());
DROP POLICY IF EXISTS pu_write ON "ProfiloUtente";
CREATE POLICY pu_write ON "ProfiloUtente" FOR ALL
  USING (app_current_role() = 'SUPERADMIN')
  WITH CHECK (app_current_role() = 'SUPERADMIN');

-- ModuloPermesso: lettura per tutti gli utenti autenticati (serve a costruire
-- il menu), scrittura solo SUPERADMIN.
ALTER TABLE "ModuloPermesso" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ModuloPermesso" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mp_select ON "ModuloPermesso";
CREATE POLICY mp_select ON "ModuloPermesso" FOR SELECT
  USING (app_current_role() IN ('SUPERADMIN','SEGRETERIA','AMMINISTRAZIONE','VISUALIZZATORE'));
DROP POLICY IF EXISTS mp_write ON "ModuloPermesso";
CREATE POLICY mp_write ON "ModuloPermesso" FOR ALL
  USING (app_current_role() = 'SUPERADMIN')
  WITH CHECK (app_current_role() = 'SUPERADMIN');

-- SystemSettings: contiene segreti (OAuth) cifrati — solo SUPERADMIN.
ALTER TABLE "SystemSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SystemSettings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ss_all ON "SystemSettings";
CREATE POLICY ss_all ON "SystemSettings" FOR ALL
  USING (app_current_role() = 'SUPERADMIN')
  WITH CHECK (app_current_role() = 'SUPERADMIN');

-- LogAudit: append-only per chiunque sia autenticato (ogni azione la logga),
-- lettura riservata a SUPERADMIN (pagina Audit Log è admin-only).
ALTER TABLE "LogAudit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LogAudit" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS la_select ON "LogAudit";
CREATE POLICY la_select ON "LogAudit" FOR SELECT
  USING (app_current_role() = 'SUPERADMIN');
DROP POLICY IF EXISTS la_insert ON "LogAudit";
CREATE POLICY la_insert ON "LogAudit" FOR INSERT
  WITH CHECK (app_current_role() IN ('SUPERADMIN','SEGRETERIA','AMMINISTRAZIONE','VISUALIZZATORE'));
