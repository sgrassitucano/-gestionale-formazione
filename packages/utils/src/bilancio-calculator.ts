export interface BilancioResult {
  ricavo: number;
  costoTotale: number;
  margine: number;
  marginePct: number;
}

export function calculateRicavo(
  tipoErogazione: "AULA_FAD" | "E_LEARNING",
  costoListino: number,
  discentiCount: number
): number {
  if (tipoErogazione === "E_LEARNING") {
    return costoListino * discentiCount;
  }
  // AULA_FAD: costo fisso per aula
  return costoListino;
}

export function calculateCostoDocenti(
  docentiLezioni: Array<{ oreEffettiveDocenza: number; tariffaOraria: number; trasferAcosto: number }>
): number {
  return docentiLezioni.reduce(
    (sum, d) => sum + d.oreEffettiveDocenza * d.tariffaOraria + Number(d.trasferAcosto || 0),
    0
  );
}

export function calculateCostoPiattaforma(
  costoPiattaformaPerDiscente: number | null | undefined,
  discentiCount: number
): number {
  return (costoPiattaformaPerDiscente || 0) * discentiCount;
}

export function calculateBilancio(ricavo: number, costoTotale: number): BilancioResult {
  const margine = ricavo - costoTotale;
  const marginePct = ricavo > 0 ? (margine / ricavo) * 100 : 0;

  return { ricavo, costoTotale, margine, marginePct };
}
