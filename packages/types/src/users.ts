export type Ruolo = "SUPERADMIN" | "SEGRETERIA" | "AMMINISTRAZIONE" | "VISUALIZZATORE";

export interface ProfiloUtente {
  id: string;
  email: string;
  ruolo: Ruolo;
  nome?: string | null;
  cognome?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ModuloPermesso {
  id: string;
  ruolo: Ruolo;
  moduloId: number; // 1-7
  visible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionUser {
  id: string;
  email: string;
  ruolo: Ruolo;
  nome?: string | null;
  cognome?: string | null;
}
