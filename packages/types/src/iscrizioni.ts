export interface Iscrizione {
  id: string;
  aula_id: string;
  discente_id: string;
  cantiere?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
