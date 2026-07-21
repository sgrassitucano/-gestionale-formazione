CREATE TYPE "TipoBackup" AS ENUM ('EXPORT', 'IMPORT');

CREATE TABLE "BackupLog" (
    "id" TEXT NOT NULL,
    "tipo" "TipoBackup" NOT NULL,
    "utenteId" TEXT NOT NULL,
    "righeTotali" INTEGER NOT NULL,
    "dimensioneByte" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BackupLog_tipo_idx" ON "BackupLog"("tipo");
CREATE INDEX "BackupLog_createdAt_idx" ON "BackupLog"("createdAt");

ALTER TABLE "BackupLog" ADD CONSTRAINT "BackupLog_utenteId_fkey"
    FOREIGN KEY ("utenteId") REFERENCES "ProfiloUtente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
