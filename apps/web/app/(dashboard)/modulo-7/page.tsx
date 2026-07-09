"use client";

export default function Modulo7() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Modulo 7: Centri di Costo</h1>
      <p className="text-gray-600">Implementation in progress...</p>
      <ul className="mt-4 list-disc list-inside space-y-2 text-gray-600">
        <li>Cost distribution formula (total_cost / total_discenti × discenti_per_cantiere)</li>
        <li>Report: cantiere × corso with attributed cost</li>
        <li>Drill-down by responsabile, sottocantiere</li>
        <li>Snapshot on aula closure (immutable)</li>
      </ul>
    </div>
  );
}
