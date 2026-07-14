export interface Discente {
  id: string;
  aziendaId: string;
  matricola?: string | null;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  luogoNascita?: string | null;
  email?: string | null;
  cellulare?: string | null;
  dataNascita?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
