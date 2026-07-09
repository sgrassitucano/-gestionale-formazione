export interface CentriCostoDistribuzione {
  id: string;
  aula_id: string;
  cantiere: string;
  importo: number;
  percentuale: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
