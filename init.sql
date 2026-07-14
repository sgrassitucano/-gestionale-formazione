-- CreateEnum
CREATE TYPE "Ruolo" AS ENUM ('SUPERADMIN', 'SEGRETERIA', 'AMMINISTRAZIONE', 'VISUALIZZATORE');

-- CreateEnum
CREATE TYPE "TipoCorso" AS ENUM ('FORMAZIONE', 'AGGIORNAMENTO');

-- CreateEnum
CREATE TYPE "TipoErogazione" AS ENUM ('AULA_FAD', 'E_LEARNING');

-- CreateEnum
CREATE TYPE "StatoAula" AS ENUM ('PIANIFICATA', 'IN_CORSO', 'CONCLUSA');

-- CreateEnum
CREATE TYPE "ModalitaErogazione" AS ENUM ('PRESENZA', 'FAD_SINCRONA', 'FAD_ASINCRONA');

-- CreateTable
CREATE TABLE "ProfiloUtente" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "ruolo" "Ruolo" NOT NULL,
    "nome" TEXT,
    "cognome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProfiloUtente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuloPermesso" (
    "id" TEXT NOT NULL,
    "ruolo" "Ruolo" NOT NULL,
    "moduloId" INTEGER NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuloPermesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAudit" (
    "id" TEXT NOT NULL,
    "utenteId" TEXT NOT NULL,
    "azione" TEXT NOT NULL,
    "tabella" TEXT,
    "recordId" TEXT,
    "dettagli" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Azienda" (
    "id" TEXT NOT NULL,
    "ragioneSociale" TEXT NOT NULL,
    "pIva" TEXT NOT NULL,
    "codiceFiscale" TEXT NOT NULL,
    "emailReferente" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Azienda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discente" (
    "id" TEXT NOT NULL,
    "matricola" TEXT,
    "cognome" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dataNascita" TIMESTAMP(3),
    "luogoNascita" TEXT,
    "codiceFiscale" TEXT NOT NULL,
    "email" TEXT,
    "cellulare" TEXT,
    "aziendaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Discente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogoCorso" (
    "codice" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "tipo" "TipoCorso" NOT NULL,
    "oreAula" INTEGER NOT NULL,
    "oreElearning" INTEGER NOT NULL DEFAULT 0,
    "validitaAnni" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CatalogoCorso_pkey" PRIMARY KEY ("codice")
);

-- CreateTable
CREATE TABLE "ListinoPrezzi" (
    "id" TEXT NOT NULL,
    "corsoCodec" TEXT NOT NULL,
    "tipoErogazione" "TipoErogazione" NOT NULL,
    "costo" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ListinoPrezzi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL,
    "utenteId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rowsProcessed" INTEGER NOT NULL,
    "errorsCount" INTEGER NOT NULL DEFAULT 0,
    "errorsDetail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Docente" (
    "id" TEXT NOT NULL,
    "cognome" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tariffaOraria" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Docente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aula" (
    "id" TEXT NOT NULL,
    "corsoCodec" TEXT NOT NULL,
    "modalita" "ModalitaErogazione" NOT NULL,
    "luogo" TEXT NOT NULL,
    "stato" "StatoAula" NOT NULL DEFAULT 'PIANIFICATA',
    "dataInizio" TIMESTAMP(3),
    "dataFine" TIMESTAMP(3),
    "costoAffitto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "creatoDay" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Aula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lezione" (
    "id" TEXT NOT NULL,
    "aulaId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "oraInizio" TEXT NOT NULL,
    "oraFine" TEXT NOT NULL,
    "googleCalendarEventId" TEXT,
    "googleCalendarSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Lezione_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocenteLezione" (
    "id" TEXT NOT NULL,
    "aulaId" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "oreEffettiveDocenza" DECIMAL(10,2) NOT NULL,
    "trasferAcosto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dataInizio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFine" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DocenteLezione_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IscrizioneAula" (
    "id" TEXT NOT NULL,
    "aulaId" TEXT NOT NULL,
    "discenteId" TEXT NOT NULL,
    "cantiere" TEXT,
    "sottocantiere" TEXT,
    "responsabile" TEXT,
    "attestatoUrl" TEXT,
    "registroUrl" TEXT,
    "dataIscrizione" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "IscrizioneAula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleCalendarConfig" (
    "id" TEXT NOT NULL,
    "utenteId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "chiave" TEXT NOT NULL,
    "valoreEncrypted" TEXT NOT NULL,
    "descrizione" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "creatoDay" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateField" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "nomeCampo" TEXT NOT NULL,
    "placeholder" TEXT NOT NULL,
    "sorgenteDato" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateMapping" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "corsoCodec" TEXT NOT NULL,
    "modalita" "ModalitaErogazione",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchivioAula" (
    "id" TEXT NOT NULL,
    "aulaId" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadDay" TEXT NOT NULL,
    "dataUpload" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ArchivioAula_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfiloUtente_email_key" ON "ProfiloUtente"("email");

-- CreateIndex
CREATE INDEX "ProfiloUtente_ruolo_idx" ON "ProfiloUtente"("ruolo");

-- CreateIndex
CREATE INDEX "ProfiloUtente_deletedAt_idx" ON "ProfiloUtente"("deletedAt");

-- CreateIndex
CREATE INDEX "ModuloPermesso_ruolo_idx" ON "ModuloPermesso"("ruolo");

-- CreateIndex
CREATE UNIQUE INDEX "ModuloPermesso_ruolo_moduloId_key" ON "ModuloPermesso"("ruolo", "moduloId");

-- CreateIndex
CREATE INDEX "LogAudit_utenteId_idx" ON "LogAudit"("utenteId");

-- CreateIndex
CREATE INDEX "LogAudit_createdAt_idx" ON "LogAudit"("createdAt");

-- CreateIndex
CREATE INDEX "LogAudit_azione_idx" ON "LogAudit"("azione");

-- CreateIndex
CREATE UNIQUE INDEX "Azienda_pIva_key" ON "Azienda"("pIva");

-- CreateIndex
CREATE UNIQUE INDEX "Azienda_codiceFiscale_key" ON "Azienda"("codiceFiscale");

-- CreateIndex
CREATE INDEX "Azienda_pIva_idx" ON "Azienda"("pIva");

-- CreateIndex
CREATE INDEX "Azienda_deletedAt_idx" ON "Azienda"("deletedAt");

-- CreateIndex
CREATE INDEX "Discente_aziendaId_idx" ON "Discente"("aziendaId");

-- CreateIndex
CREATE INDEX "Discente_codiceFiscale_idx" ON "Discente"("codiceFiscale");

-- CreateIndex
CREATE INDEX "Discente_deletedAt_idx" ON "Discente"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Discente_codiceFiscale_key" ON "Discente"("codiceFiscale");

-- CreateIndex
CREATE INDEX "CatalogoCorso_tipo_idx" ON "CatalogoCorso"("tipo");

-- CreateIndex
CREATE INDEX "CatalogoCorso_deletedAt_idx" ON "CatalogoCorso"("deletedAt");

-- CreateIndex
CREATE INDEX "ListinoPrezzi_corsoCodec_idx" ON "ListinoPrezzi"("corsoCodec");

-- CreateIndex
CREATE INDEX "ListinoPrezzi_deletedAt_idx" ON "ListinoPrezzi"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ListinoPrezzi_corsoCodec_tipoErogazione_key" ON "ListinoPrezzi"("corsoCodec", "tipoErogazione");

-- CreateIndex
CREATE INDEX "ImportLog_utenteId_idx" ON "ImportLog"("utenteId");

-- CreateIndex
CREATE INDEX "ImportLog_createdAt_idx" ON "ImportLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Docente_email_key" ON "Docente"("email");

-- CreateIndex
CREATE INDEX "Docente_email_idx" ON "Docente"("email");

-- CreateIndex
CREATE INDEX "Docente_deletedAt_idx" ON "Docente"("deletedAt");

-- CreateIndex
CREATE INDEX "Aula_corsoCodec_idx" ON "Aula"("corsoCodec");

-- CreateIndex
CREATE INDEX "Aula_stato_idx" ON "Aula"("stato");

-- CreateIndex
CREATE INDEX "Aula_modalita_idx" ON "Aula"("modalita");

-- CreateIndex
CREATE INDEX "Aula_dataInizio_idx" ON "Aula"("dataInizio");

-- CreateIndex
CREATE INDEX "Aula_deletedAt_idx" ON "Aula"("deletedAt");

-- CreateIndex
CREATE INDEX "Lezione_aulaId_idx" ON "Lezione"("aulaId");

-- CreateIndex
CREATE INDEX "Lezione_data_idx" ON "Lezione"("data");

-- CreateIndex
CREATE INDEX "Lezione_deletedAt_idx" ON "Lezione"("deletedAt");

-- CreateIndex
CREATE INDEX "DocenteLezione_aulaId_idx" ON "DocenteLezione"("aulaId");

-- CreateIndex
CREATE INDEX "DocenteLezione_docenteId_idx" ON "DocenteLezione"("docenteId");

-- CreateIndex
CREATE INDEX "DocenteLezione_dataFine_idx" ON "DocenteLezione"("dataFine");

-- CreateIndex
CREATE INDEX "DocenteLezione_deletedAt_idx" ON "DocenteLezione"("deletedAt");

-- CreateIndex
CREATE INDEX "IscrizioneAula_aulaId_idx" ON "IscrizioneAula"("aulaId");

-- CreateIndex
CREATE INDEX "IscrizioneAula_discenteId_idx" ON "IscrizioneAula"("discenteId");

-- CreateIndex
CREATE INDEX "IscrizioneAula_cantiere_idx" ON "IscrizioneAula"("cantiere");

-- CreateIndex
CREATE INDEX "IscrizioneAula_deletedAt_idx" ON "IscrizioneAula"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IscrizioneAula_aulaId_discenteId_key" ON "IscrizioneAula"("aulaId", "discenteId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarConfig_utenteId_key" ON "GoogleCalendarConfig"("utenteId");

-- CreateIndex
CREATE INDEX "GoogleCalendarConfig_utenteId_idx" ON "GoogleCalendarConfig"("utenteId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_chiave_key" ON "SystemSettings"("chiave");

-- CreateIndex
CREATE INDEX "SystemSettings_chiave_idx" ON "SystemSettings"("chiave");

-- CreateIndex
CREATE INDEX "Template_creatoDay_idx" ON "Template"("creatoDay");

-- CreateIndex
CREATE INDEX "Template_deletedAt_idx" ON "Template"("deletedAt");

-- CreateIndex
CREATE INDEX "TemplateField_templateId_idx" ON "TemplateField"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateField_templateId_placeholder_key" ON "TemplateField"("templateId", "placeholder");

-- CreateIndex
CREATE INDEX "TemplateMapping_templateId_idx" ON "TemplateMapping"("templateId");

-- CreateIndex
CREATE INDEX "TemplateMapping_corsoCodec_idx" ON "TemplateMapping"("corsoCodec");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateMapping_templateId_corsoCodec_modalita_key" ON "TemplateMapping"("templateId", "corsoCodec", "modalita");

-- CreateIndex
CREATE INDEX "ArchivioAula_aulaId_idx" ON "ArchivioAula"("aulaId");

-- CreateIndex
CREATE INDEX "ArchivioAula_tipoDocumento_idx" ON "ArchivioAula"("tipoDocumento");

-- CreateIndex
CREATE INDEX "ArchivioAula_uploadDay_idx" ON "ArchivioAula"("uploadDay");

-- CreateIndex
CREATE INDEX "ArchivioAula_deletedAt_idx" ON "ArchivioAula"("deletedAt");

-- AddForeignKey
ALTER TABLE "LogAudit" ADD CONSTRAINT "LogAudit_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "ProfiloUtente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discente" ADD CONSTRAINT "Discente_aziendaId_fkey" FOREIGN KEY ("aziendaId") REFERENCES "Azienda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListinoPrezzi" ADD CONSTRAINT "ListinoPrezzi_corsoCodec_fkey" FOREIGN KEY ("corsoCodec") REFERENCES "CatalogoCorso"("codice") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportLog" ADD CONSTRAINT "ImportLog_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "ProfiloUtente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aula" ADD CONSTRAINT "Aula_corsoCodec_fkey" FOREIGN KEY ("corsoCodec") REFERENCES "CatalogoCorso"("codice") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lezione" ADD CONSTRAINT "Lezione_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocenteLezione" ADD CONSTRAINT "DocenteLezione_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocenteLezione" ADD CONSTRAINT "DocenteLezione_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Docente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IscrizioneAula" ADD CONSTRAINT "IscrizioneAula_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IscrizioneAula" ADD CONSTRAINT "IscrizioneAula_discenteId_fkey" FOREIGN KEY ("discenteId") REFERENCES "Discente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarConfig" ADD CONSTRAINT "GoogleCalendarConfig_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "ProfiloUtente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_creatoDay_fkey" FOREIGN KEY ("creatoDay") REFERENCES "ProfiloUtente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateField" ADD CONSTRAINT "TemplateField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateMapping" ADD CONSTRAINT "TemplateMapping_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateMapping" ADD CONSTRAINT "TemplateMapping_corsoCodec_fkey" FOREIGN KEY ("corsoCodec") REFERENCES "CatalogoCorso"("codice") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivioAula" ADD CONSTRAINT "ArchivioAula_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivioAula" ADD CONSTRAINT "ArchivioAula_uploadDay_fkey" FOREIGN KEY ("uploadDay") REFERENCES "ProfiloUtente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

