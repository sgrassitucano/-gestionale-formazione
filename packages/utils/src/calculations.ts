export interface BilancioCalc {
  ricavo: number;
  costDocenti: number;
  margine: number;
  percentualeMargine: number;
}

export function calculateBilancio(ricavo: number, costDocenti: number): BilancioCalc {
  const margine = ricavo - costDocenti;
  const percentualeMargine = ricavo > 0 ? (margine / ricavo) * 100 : 0;

  return {
    ricavo,
    costDocenti,
    margine,
    percentualeMargine,
  };
}

export function calculateCentriCosto(
  costTotale: number,
  discentiPerCantiere: Record<string, number>,
  discentiTotali: number
): Record<string, number> {
  const centriCosto: Record<string, number> = {};

  Object.entries(discentiPerCantiere).forEach(([cantiere, n]) => {
    centriCosto[cantiere] = discentiTotali > 0 ? (costTotale / discentiTotali) * n : 0;
  });

  return centriCosto;
}
