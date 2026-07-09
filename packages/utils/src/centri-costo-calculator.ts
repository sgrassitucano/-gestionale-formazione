export interface CentroCostoEntry {
  cantiere: string;
  sottocantiere: string | null;
  responsabile: string | null;
  costoAttribuito: number;
}

export function calculateCentriCosto(
  costoTotale: number,
  iscrizioni: Array<{ cantiere: string | null; sottocantiere: string | null; responsabile: string | null }>
): CentroCostoEntry[] {
  const totalDiscenti = iscrizioni.length;
  if (totalDiscenti === 0) return [];

  // Group by cantiere + sottocantiere + responsabile
  const groups = new Map<string, { cantiere: string; sottocantiere: string | null; responsabile: string | null; count: number }>();

  for (const iscr of iscrizioni) {
    const cantiere = iscr.cantiere || "Non Assegnato";
    const key = `${cantiere}|${iscr.sottocantiere || ""}|${iscr.responsabile || ""}`;

    if (!groups.has(key)) {
      groups.set(key, {
        cantiere,
        sottocantiere: iscr.sottocantiere,
        responsabile: iscr.responsabile,
        count: 0,
      });
    }
    groups.get(key)!.count++;
  }

  return Array.from(groups.values()).map((g) => ({
    cantiere: g.cantiere,
    sottocantiere: g.sottocantiere,
    responsabile: g.responsabile,
    costoAttribuito: (costoTotale / totalDiscenti) * g.count,
  }));
}
