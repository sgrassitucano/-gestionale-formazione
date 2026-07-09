export interface KpiFilters {
  dataInizio?: Date;
  dataFine?: Date;
  corsoCodec?: string;
}

export interface KpiResult {
  aulesAttiveCount: number;
  aulesConcluseCount: number;
  discentiTotalCount: number;
  discentiPerCorso: Record<string, number>;
  costoMedioDiscente: number;
  marginePerTipo: Record<string, number>;
  revenueTrend: Array<{ month: string; revenue: number }>;
}

export function buildRevenueTrend(
  snapshots: Array<{ dataChiusura: Date; ricavo: number }>
): Array<{ month: string; revenue: number }> {
  const monthMap = new Map<string, number>();

  for (const s of snapshots) {
    const key = `${s.dataChiusura.getFullYear()}-${String(s.dataChiusura.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) || 0) + s.ricavo);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({ month, revenue }));
}

export function getDateRangePreset(preset: "30" | "60" | "90"): { dataInizio: Date; dataFine: Date } {
  const dataFine = new Date();
  const dataInizio = new Date();
  dataInizio.setDate(dataInizio.getDate() - parseInt(preset));

  return { dataInizio, dataFine };
}
