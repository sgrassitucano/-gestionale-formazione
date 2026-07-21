-- Rate limiting login: contatore tentativi falliti + lockout temporaneo,
-- persistito su riga utente (vedi packages/db/src/context.ts per il perché
-- non un limiter in-memory: Vercel serverless, istanze multiple).
ALTER TABLE "ProfiloUtente" ADD COLUMN "tentativiFalliti" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProfiloUtente" ADD COLUMN "bloccatoFino" TIMESTAMP(3);
