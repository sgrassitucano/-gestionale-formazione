-- Discente.dataNascita era tipizzata timestamp (DateTime) ma il middleware
-- di cifratura ci scrive un ciphertext (stringa base64) — incompatibilità
-- strutturale: ogni scrittura cifrata di questo campo con un valore reale
-- falliva sempre ("invalid characters, expected ISO-8601 DateTime"), mai
-- esercitata finora con un caricamento reale di massa. Converte la colonna
-- a testo, come già cognome/nome/email/cellulare/codiceFiscale (tutti gli
-- altri campi cifrati di Discente sono già String).
ALTER TABLE "Discente" ALTER COLUMN "dataNascita" TYPE TEXT USING "dataNascita"::TEXT;
