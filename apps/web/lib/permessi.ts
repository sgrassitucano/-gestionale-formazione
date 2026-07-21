import { type SessionUser } from "@gestionale/types";

// Matrice permessi Moduli 5/6/7, decisa esplicitamente dall'utente
// (2026-07-21, sessione audit Fase 5 seguito):
// - Mod.5 Prefatturazione ("cosa fatturare questo mese"): SUPERADMIN +
//   AMMINISTRAZIONE (scrittura/lettura), VISUALIZZATORE (sola lettura).
//   SEGRETERIA non ci lavora — ha scrittura solo su Mod.1-4 (aule).
// - Mod.6 Report/KPI (dashboard bilancio/KPI, distinto da prefatturazione
//   e centri costo): solo SUPERADMIN + VISUALIZZATORE. Né AMMINISTRAZIONE
//   né SEGRETERIA — AMMINISTRAZIONE vede solo home + lavora su
//   prefatturazione/centri costo, non sulla dashboard Report.
// - Mod.7 Centri Costo: stessa matrice del Mod.5 (SUPERADMIN +
//   AMMINISTRAZIONE + VISUALIZZATORE, SEGRETERIA esclusa).
export const RUOLI_PREFATTURAZIONE_CENTRI_COSTO = ["SUPERADMIN", "AMMINISTRAZIONE", "VISUALIZZATORE"] as const;
export const RUOLI_REPORT_KPI = ["SUPERADMIN", "VISUALIZZATORE"] as const;

export function hasRuolo(
  user: SessionUser | null,
  ruoliConsentiti: readonly string[]
): user is SessionUser {
  return !!user && ruoliConsentiti.includes(user.ruolo);
}
