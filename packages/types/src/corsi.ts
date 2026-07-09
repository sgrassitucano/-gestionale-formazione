export interface Corso {
  id: string;
  nome: string;
  descrizione?: string | null;
  ore?: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
