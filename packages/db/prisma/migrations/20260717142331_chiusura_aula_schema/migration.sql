-- CreateEnum
CREATE TYPE "FaseChiusuraDocumento" AS ENUM ('DOCUMENTI', 'ATTESTATI');

-- CreateEnum
CREATE TYPE "FaseChiusuraAula" AS ENUM ('DOCUMENTI', 'ATTESA_ATTESTATI', 'COUNTDOWN', 'COMPLETATA');

-- AlterTable
ALTER TABLE "ArchivioAula" ADD COLUMN     "confidenza" DECIMAL(4,3),
ADD COLUMN     "discenteId" TEXT,
ADD COLUMN     "fase" "FaseChiusuraDocumento" NOT NULL DEFAULT 'DOCUMENTI',
ADD COLUMN     "metodoClassificazione" TEXT;

-- CreateTable
CREATE TABLE "ChiusuraAula" (
    "id" TEXT NOT NULL,
    "aulaId" TEXT NOT NULL,
    "fase" "FaseChiusuraAula" NOT NULL DEFAULT 'DOCUMENTI',
    "countdownAvviatoAt" TIMESTAMP(3),
    "dataEliminazionePrevista" TIMESTAMP(3),
    "confermatoDay" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChiusuraAula_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChiusuraAula_aulaId_key" ON "ChiusuraAula"("aulaId");

-- CreateIndex
CREATE INDEX "ChiusuraAula_fase_idx" ON "ChiusuraAula"("fase");

-- CreateIndex
CREATE INDEX "ChiusuraAula_dataEliminazionePrevista_idx" ON "ChiusuraAula"("dataEliminazionePrevista");

-- CreateIndex
CREATE INDEX "ArchivioAula_discenteId_idx" ON "ArchivioAula"("discenteId");

-- CreateIndex
CREATE INDEX "ArchivioAula_fase_idx" ON "ArchivioAula"("fase");

-- AddForeignKey
ALTER TABLE "ArchivioAula" ADD CONSTRAINT "ArchivioAula_discenteId_fkey" FOREIGN KEY ("discenteId") REFERENCES "Discente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChiusuraAula" ADD CONSTRAINT "ChiusuraAula_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

