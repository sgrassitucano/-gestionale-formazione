export type AulaStato = "Pianificata" | "In Corso" | "Conclusa";

export interface Aula {
  id: string;
  corso_id: string;
  stato: AulaStato;
  data_inizio: Date;
  data_fine?: Date | null;
  luogo?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
