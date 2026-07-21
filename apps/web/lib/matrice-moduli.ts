import { type Ruolo } from "@gestionale/types";

// Matrice di visibilità menu per modulo (2026-07-21, corretta il giorno
// dopo). ATTENZIONE: questo moduloId NON è la numerazione Modulo 1-7 di
// CLAUDE.md (Auth/Import/Aule/Modulistica/Prefatturazione/Report/
// CentriCosto) — è uno schema LOCALE diverso, definito dalle mappe
// MODULE_NAMES/MODULE_ROUTES in apps/web/app/(dashboard)/layout.tsx, che
// coprono solo 5 voci di menu (Auth e Import/Catalogo non hanno mai avuto
// una voce di nav propria):
//   1 = Aule           (route /modulo-3/aule)
//   2 = Modulistica     (route /modulo-4)
//   3 = Prefatturazione (route /modulo-5, endpoint da-fatturare)
//   4 = Report          (route /modulo-6, endpoint kpi/bilancio-generale/prefatturazione)
//   5 = Centri Costo    (route /modulo-7, endpoint centri-costo)
//
// Bug reale trovato: la prima versione di questa matrice usava la
// numerazione CLAUDE.md (1-7), scrivendo righe ModuloPermesso con
// moduloId 6/7 che MODULE_NAMES/MODULE_ROUTES non riconoscono ->
// `<Link href={undefined}>` -> crash React, dashboard vuota per
// SUPERADMIN/VISUALIZZATORE (unici ruoli con quei moduli "visibili").
// Trovato testando il login reale su tutti i ruoli, non dall'audit.
//
// La corretta matrice qui sotto è comunque coerente con l'enforcement
// API reale (apps/web/lib/permessi.ts): id 3/5 (Prefatturazione/Centri
// Costo) = RUOLI_PREFATTURAZIONE_CENTRI_COSTO; id 4 (Report) =
// RUOLI_REPORT_KPI — quella parte era già corretta, solo la numerazione
// del menu era sbagliata.
export const MODULI_VISIBILI: Record<Ruolo, number[]> = {
  SUPERADMIN: [1, 2, 3, 4, 5],
  SEGRETERIA: [1, 2], // scrittura aule/modulistica, non tocca prefatturazione/report/centri costo
  AMMINISTRAZIONE: [3, 5], // solo prefatturazione + centri costo (scrittura), non aule/modulistica/report
  VISUALIZZATORE: [1, 2, 3, 4, 5], // legge tutto
};

export function moduloVisibilePerRuolo(ruolo: Ruolo, moduloId: number): boolean {
  return MODULI_VISIBILI[ruolo]?.includes(moduloId) ?? false;
}
