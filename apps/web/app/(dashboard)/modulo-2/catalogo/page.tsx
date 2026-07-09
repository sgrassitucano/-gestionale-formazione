"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function CatalogoPage() {
  const [corsi, setCorsi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCorso, setNewCorso] = useState({
    codice: "",
    titolo: "",
    tipo: "FORMAZIONE",
    oreAula: 8,
    oreElearning: 0,
    validitaAnni: 1,
  });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadCorsi();
  }, []);

  const loadCorsi = async () => {
    try {
      const response = await axios.get("/api/corsi");
      setCorsi(response.data.corsi || []);
    } catch (error) {
      console.error("Error loading corsi:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCorso = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/corsi", newCorso);
      setNewCorso({
        codice: "",
        titolo: "",
        tipo: "FORMAZIONE",
        oreAula: 8,
        oreElearning: 0,
        validitaAnni: 1,
      });
      setShowForm(false);
      loadCorsi();
    } catch (error) {
      console.error("Error creating corso:", error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Catalogo Corsi</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? "Annulla" : "Nuovo Corso"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreateCorso}
          className="bg-white rounded-lg shadow p-6 mb-6"
        >
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Codice"
              value={newCorso.codice}
              onChange={(e) =>
                setNewCorso({ ...newCorso, codice: e.target.value })
              }
              className="border px-3 py-2 rounded"
              required
            />
            <input
              type="text"
              placeholder="Titolo"
              value={newCorso.titolo}
              onChange={(e) =>
                setNewCorso({ ...newCorso, titolo: e.target.value })
              }
              className="border px-3 py-2 rounded"
              required
            />
            <select
              value={newCorso.tipo}
              onChange={(e) =>
                setNewCorso({ ...newCorso, tipo: e.target.value })
              }
              className="border px-3 py-2 rounded"
            >
              <option value="FORMAZIONE">Formazione</option>
              <option value="AGGIORNAMENTO">Aggiornamento</option>
            </select>
            <input
              type="number"
              placeholder="Ore Aula"
              value={newCorso.oreAula}
              onChange={(e) =>
                setNewCorso({
                  ...newCorso,
                  oreAula: parseInt(e.target.value),
                })
              }
              className="border px-3 py-2 rounded"
              required
            />
            <input
              type="number"
              placeholder="Ore E-learning"
              value={newCorso.oreElearning}
              onChange={(e) =>
                setNewCorso({
                  ...newCorso,
                  oreElearning: parseInt(e.target.value),
                })
              }
              className="border px-3 py-2 rounded"
            />
            <input
              type="number"
              placeholder="Validità (anni)"
              value={newCorso.validitaAnni}
              onChange={(e) =>
                setNewCorso({
                  ...newCorso,
                  validitaAnni: parseInt(e.target.value),
                })
              }
              className="border px-3 py-2 rounded"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
          >
            Crea Corso
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Codice</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Titolo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Tipo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Ore Aula</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Ore E-learning</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Validità</th>
            </tr>
          </thead>
          <tbody>
            {corsi.map((corso) => (
              <tr key={corso.codice} className="border-t hover:bg-gray-50">
                <td className="px-6 py-3 text-sm font-mono">{corso.codice}</td>
                <td className="px-6 py-3 text-sm">{corso.titolo}</td>
                <td className="px-6 py-3 text-sm">{corso.tipo}</td>
                <td className="px-6 py-3 text-sm">{corso.oreAula}</td>
                <td className="px-6 py-3 text-sm">{corso.oreElearning}</td>
                <td className="px-6 py-3 text-sm">{corso.validitaAnni} anni</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
