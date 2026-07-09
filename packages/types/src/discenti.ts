export interface Discente {
  id: string;
  azienda_id: string;
  nome: string;
  cognome: string;
  cf?: string | null;
  email?: string | null;
  cellulare?: string | null;
  data_nascita?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
