"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function DocentiPage() {
  const [docenti, setDocenti] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", cognome: "", email: "", tariffaOraria: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await axios.get("/api/docenti");
      setDocenti(res.data.docenti || []);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/docenti", form);
      setForm({ nome: "", cognome: "", email: "", tariffaOraria: 0 });
      setShowForm(false);
      load();
    } catch (error: any) {
      alert(error.response?.data?.error || "Errore creazione docente");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Docenti</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {showForm ? "Annulla" : "Nuovo Docente"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="border px-3 py-2 rounded" required />
            <input type="text" placeholder="Cognome" value={form.cognome} onChange={(e) => setForm({ ...form, cognome: e.target.value })} className="border px-3 py-2 rounded" required />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border px-3 py-2 rounded" required />
            <input type="number" step="0.01" placeholder="Tariffa Oraria €" value={form.tariffaOraria} onChange={(e) => setForm({ ...form, tariffaOraria: parseFloat(e.target.value) })} className="border px-3 py-2 rounded" required />
          </div>
          <button type="submit" className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
            Crea Docente
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Tariffa/h</th>
            </tr>
          </thead>
          <tbody>
            {docenti.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="px-6 py-3 text-sm">{d.cognome} {d.nome}</td>
                <td className="px-6 py-3 text-sm">{d.email}</td>
                <td className="px-6 py-3 text-sm">€ {Number(d.tariffaOraria).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
