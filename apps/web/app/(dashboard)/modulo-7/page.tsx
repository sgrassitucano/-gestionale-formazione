"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function Modulo7Page() {
  const [aule, setAule] = useState<any[]>([]);
  const [selectedAula, setSelectedAula] = useState("");
  const [drillDown, setDrillDown] = useState<any[]>([]);
  const [expandedCantiere, setExpandedCantiere] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/aule").then((res) => setAule(res.data.aule || [])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCentriCosto();
  }, [selectedAula]);

  const loadCentriCosto = async () => {
    try {
      const params: any = {};
      if (selectedAula) params.aulaId = selectedAula;

      const res = await axios.get("/api/reports/centri-costo", { params });
      setDrillDown(res.data.drillDown || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (selectedAula) params.append("aulaId", selectedAula);
    params.append("format", "xlsx");
    window.open(`/api/reports/centri-costo?${params.toString()}`, "_blank");
  };

  const totale = drillDown.reduce((sum, c) => sum + c.totale, 0);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Modulo 7: Centri di Costo</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Seleziona Aula</label>
          <select
            value={selectedAula}
            onChange={(e) => setSelectedAula(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="">Tutte le aule (AULA_FAD chiuse)</option>
            {aule.map((a: any) => (
              <option key={a.id} value={a.id}>{a.corso?.titolo} — {a.luogo}</option>
            ))}
          </select>
        </div>
        <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Export XLS
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <p className="text-sm text-gray-500">Totale Costi Distribuiti</p>
        <p className="text-3xl font-bold text-blue-600">€ {totale.toFixed(2)}</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {drillDown.length === 0 ? (
          <p className="p-6 text-gray-500">Nessun dato disponibile. Chiudi un'aula AULA_FAD per generare centri costo.</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Cantiere</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Costo Totale</th>
                <th className="px-6 py-3 text-left text-sm font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {drillDown.map((c) => (
                <>
                  <tr
                    key={c.cantiere}
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedCantiere(expandedCantiere === c.cantiere ? null : c.cantiere)}
                  >
                    <td className="px-6 py-3 text-sm font-semibold">{c.cantiere}</td>
                    <td className="px-6 py-3 text-sm">€ {c.totale.toFixed(2)}</td>
                    <td className="px-6 py-3 text-sm text-blue-600">
                      {expandedCantiere === c.cantiere ? "▲ Chiudi" : "▼ Dettaglio"}
                    </td>
                  </tr>
                  {expandedCantiere === c.cantiere &&
                    c.sottocantieri.map((sub: any) => (
                      <tr key={`${c.cantiere}-${sub.nome}`} className="border-t bg-gray-50">
                        <td className="px-6 py-2 text-sm pl-12 text-gray-600">
                          {sub.nome} {sub.responsabile ? `(Resp: ${sub.responsabile})` : ""}
                        </td>
                        <td className="px-6 py-2 text-sm text-gray-600">€ {sub.totale.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    ))}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
