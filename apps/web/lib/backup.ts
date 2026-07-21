// Backup dati completo: export/import in JSON cifrato (stesso meccanismo di
// cifratura già usato per i dati sensibili — NaCl secretbox, ENCRYPTION_KEY).
// Scelto invece di un vero pg_dump perché gira su Vercel serverless, dove
// non c'è accesso a binari nativi Postgres. Il file scaricato è un blob
// cifrato, decifrabile solo con la stessa ENCRYPTION_KEY dell'ambiente
// (motivo per cui l'export contiene già PII in chiaro nel JSON PRIMA di
// essere cifrato come blob — protetto comunque, stesso livello di
// sicurezza dei dati a riposo nel DB).
//
// Ordine di export/import: genitori prima dei figli, per rispettare le
// foreign key durante il ripristino (upsert riga per riga, mai un
// DELETE — il ripristino unisce/aggiorna, non sostituisce mai i dati
// esistenti, per non rischiare una cancellazione accidentale).
export const BACKUP_MODEL_ORDER = [
  "ProfiloUtente",
  "ModuloPermesso",
  "Azienda",
  "CatalogoCorso",
  "Docente",
  "Luogo",
  "Discente",
  "ListinoPrezzi",
  "Template",
  "TemplateField",
  "TemplateMapping",
  "Aula",
  "Lezione",
  "DocenteLezione",
  "IscrizioneAula",
  "BilancioAula",
  "CentroCostoSnapshot",
  "ArchivioAula",
  "ChiusuraAula",
  "VoceContabile",
  "GoogleCalendarConfig",
  "SystemSettings",
  "ImportLog",
  "LogAudit",
] as const;

export function toCamelCase(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

// Unico modello con chiave primaria diversa da "id" (tutti gli altri usano
// id cuid). Necessario per l'upsert generico riga-per-riga nel ripristino.
const CHIAVE_PRIMARIA_SPECIALE: Record<string, string> = {
  CatalogoCorso: "codice",
};

export function chiavePrimaria(modelName: string): string {
  return CHIAVE_PRIMARIA_SPECIALE[modelName] ?? "id";
}

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  tables: Record<string, any[]>;
}

// Backup "scaduto" oltre questa soglia — mostrata come banner di
// promemoria nella pagina admin/backup e registrata dal cron giornaliero.
export const GIORNI_SCADENZA_BACKUP = 30;
