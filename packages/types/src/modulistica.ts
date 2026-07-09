export interface Template {
  id: string;
  nome: string;
  tipo: string; // registro, verbale, attestato
  contenuto?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ArchivioAula {
  id: string;
  aula_id: string;
  nome_file: string;
  url: string;
  tipo: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
