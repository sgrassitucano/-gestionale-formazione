"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";

export default function EsigenzePage() {
  const [discenti, setDiscenti] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    axios.get("/api/discenti/esigenze").then((res) => setDiscenti(res.data.discenti || [])).finally(() => setLoading(false));
  }, []);

  const filtered = discenti.filter(
    (d) =>
      d.cognome.toLowerCase().includes(search.toLowerCase()) ||
      d.nome.toLowerCase().includes(search.toLowerCase()) ||
      d.azienda?.ragioneSociale?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Esigenze Pendenti</h1>
      <p className="text-gray-600 mb-4">
        Discenti importati senza aula assegnata ({discenti.length} totali).
      </p>

      <input
        type="text"
        placeholder="Cerca per nome, cognome, azienda..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border px-3 py-2 rounded mb-4"
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Cognome Nome</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">CF</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Azienda</th>
              <th className="px-6 py-3 text-left text-sm font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-3 text-sm">{d.cognome} {d.nome}</td>
                <td className="px-6 py-3 text-sm font-mono">{d.codiceFiscale}</td>
                <td className="px-6 py-3 text-sm">{d.azienda?.ragioneSociale}</td>
                <td className="px-6 py-3 text-sm">
                  <Link href="/modulo-3/aule" className="text-blue-600 hover:text-blue-800">
                    Assegna ad Aula →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
