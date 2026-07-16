export interface Discente {
  id: string;
  aziendaId: string;
  matricola?: string | null;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  luogoNascita?: string | null;
  provinciaNascita?: string | null;
  regioneNascita?: string | null;
  email?: string | null;
  cellulare?: string | null;
  sesso?: string | null;
  indirizzoResidenza?: string | null;
  capResidenza?: string | null;
  cittaResidenza?: string | null;
  provinciaResidenza?: string | null;
  regioneResidenza?: string | null;
  mansione?: string | null;
  codiceAteco?: string | null;
  dataNascita?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
