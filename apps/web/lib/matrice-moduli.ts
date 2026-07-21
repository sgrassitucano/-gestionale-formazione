import { type Ruolo } from "@gestionale/types";

// Matrice di visibilità menu per modulo, decisa esplicitamente dall'utente
// (2026-07-21). Guida sia il seed di ModuloPermesso per nuovi utenti
// (createUser in lib/auth.ts) sia lo script di aggiornamento una-tantum
// delle righe esistenti (packages/db/scripts/aggiorna-modulo-permessi.ts).
// Nota: questa è la visibilità del MENU — l'enforcement reale di lettura/
// scrittura è nelle singole route API (vedi lib/permessi.ts per Mod.5/6/7)
// e nelle policy RLS; questa tabella è difesa-in-profondità a livello UI,
// non l'unica barriera.
export const MODULI_VISIBILI: Record<Ruolo, number[]> = {
  SUPERADMIN: [1, 2, 3, 4, 5, 6, 7],
  SEGRETERIA: [1, 2, 3, 4], // scrittura aule/import, non tocca prefatturazione/report/centri costo
  AMMINISTRAZIONE: [1, 5, 7], // solo home + prefatturazione + centri costo (scrittura), non Mod.6 Report
  VISUALIZZATORE: [1, 2, 3, 4, 5, 6, 7], // legge tutto
};

export function moduloVisibilePerRuolo(ruolo: Ruolo, moduloId: number): boolean {
  return MODULI_VISIBILI[ruolo]?.includes(moduloId) ?? false;
}
