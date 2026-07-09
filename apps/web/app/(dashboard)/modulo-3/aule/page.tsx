"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";

const STATO_COLORS: Record<string, string> = {
  PIANIFICATA: "bg-yellow-100 text-yellow-800",
  IN_CORSO: "bg-blue-100 text-blue-800",
  CONCLUSA: "bg-green-100 text-green-800",
};

export default function AulePage() {
  const [aule, setAule] = useState<any[]>([]);
  const [corsi, setCorsi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ corsoCodec: "", luogo: "", dataInizio: "" });
  const [filterStato, setFilterStato] = useState("");

  useEffect(() => {
    loadAule();
    axios.get("/api/corsi").then((res) => setCorsi(res.data.corsi || []));
  }, [filterStato]);

  const loadAule = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStato) params.stato = filterStato;
      const res = await axios.get("/api/aule", { params });
      setAule(res.data.aule || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/aule", form);
      setForm({ corsoCodec: "", luogo: "", dataInizio: "" });
      setShowForm(false);
      loadAule();
    } catch (error: any) {
      alert(error.response?.data?.error || "Errore creazione aula");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Aule</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? "Annulla" : "Nuova Aula"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <select
              value={form.corsoCodec}
              onChange={(e) => setForm({ ...form, corsoCodec: e.target.value })}
              className="border px-3 py-2 rounded"
              required
            >
              <option value="">Seleziona corso</option>
              {corsi.map((c) => (
                <option key={c.codice} value={c.codice}>{c.titolo}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Luogo"
              value={form.luogo}
              onChange={(e) => setForm({ ...form, luogo: e.target.value })}
              className="border px-3 py-2 rounded"
              required
            />
            <input
              type="date"
              value={form.dataInizio}
              onChange={(e) => setForm({ ...form, dataInizio: e.target.value })}
              className="border px-3 py-2 rounded"
            />
          </div>
          <button type="submit" className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
            Crea Aula
          </button>
        </form>
      )}

      <div className="flex gap-2 mb-4">
        {["", "PIANIFICATA", "IN_CORSO", "CONCLUSA"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStato(s)}
            className={`px-3 py-1 rounded text-sm ${filterStato === s ? "bg-blue-600 text-white" : "bg-gray-100"}`}
          >
            {s || "Tutte"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Corso</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Luogo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Stato</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Discenti</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Docenti</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Data Inizio</th>
              <th className="px-6 py-3 text-left text-sm font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {aule.map((a) => (
              <tr key={a.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-3 text-sm">{a.corso?.titolo}</td>
                <td className="px-6 py-3 text-sm">{a.luogo}</td>
                <td className="px-6 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATO_COLORS[a.stato]}`}>
                    {a.stato}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm">{a.iscrizioni?.length || 0}</td>
                <td className="px-6 py-3 text-sm">{a.docentilezioni?.length || 0}</td>
                <td className="px-6 py-3 text-sm">
                  {a.dataInizio ? new Date(a.dataInizio).toLocaleDateString("it-IT") : "-"}
                </td>
                <td className="px-6 py-3 text-sm">
                  <Link href={`/modulo-3/aule/${a.id}`} className="text-blue-600 hover:text-blue-800">
                    Apri →
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
