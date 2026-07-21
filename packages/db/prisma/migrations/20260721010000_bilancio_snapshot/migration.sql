-- Snapshot immutabile bilancio/centri-costo alla chiusura aula.
CREATE TABLE "BilancioAula" (
    "id" TEXT NOT NULL,
    "aulaId" TEXT NOT NULL,
    "corsoTitolo" TEXT NOT NULL,
    "modalita" "ModalitaErogazione" NOT NULL,
    "discentiCount" INTEGER NOT NULL,
    "ricavo" DECIMAL(10,2) NOT NULL,
    "costoDocenti" DECIMAL(10,2) NOT NULL,
    "costoAffitto" DECIMAL(10,2) NOT NULL,
    "costoTotale" DECIMAL(10,2) NOT NULL,
    "margine" DECIMAL(10,2) NOT NULL,
    "marginePct" DECIMAL(6,2) NOT NULL,
    "dataChiusura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BilancioAula_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BilancioAula_aulaId_key" ON "BilancioAula"("aulaId");
CREATE INDEX "BilancioAula_dataChiusura_idx" ON "BilancioAula"("dataChiusura");

ALTER TABLE "BilancioAula" ADD CONSTRAINT "BilancioAula_aulaId_fkey"
    FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CentroCostoSnapshot" (
    "id" TEXT NOT NULL,
    "aulaId" TEXT NOT NULL,
    "cantiere" TEXT NOT NULL,
    "sottocantiere" TEXT,
    "responsabile" TEXT,
    "discentiCount" INTEGER NOT NULL,
    "costoAttribuito" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CentroCostoSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CentroCostoSnapshot_aulaId_idx" ON "CentroCostoSnapshot"("aulaId");
CREATE INDEX "CentroCostoSnapshot_cantiere_idx" ON "CentroCostoSnapshot"("cantiere");

ALTER TABLE "CentroCostoSnapshot" ADD CONSTRAINT "CentroCostoSnapshot_aulaId_fkey"
    FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
