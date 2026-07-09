"use client";

import { useEffect, useState } from "react";
import axios from "axios";

const RUOLI = ["SUPERADMIN", "SEGRETERIA", "AMMINISTRAZIONE", "VISUALIZZATORE"];

export default function UtentiPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    ruolo: "VISUALIZZATORE",
    nome: "",
    cognome: "",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await axios.get("/api/admin/users");
      setUsers(res.data.users || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/admin/users", newUser);
      setNewUser({ email: "", password: "", ruolo: "VISUALIZZATORE", nome: "", cognome: "" });
      setShowForm(false);
      loadUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || "Errore creazione utente");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Eliminare questo utente?")) return;
    try {
      await axios.delete(`/api/admin/users/${userId}`);
      loadUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || "Errore eliminazione");
    }
  };

  const handleRoleChange = async (userId: string, ruolo: string) => {
    try {
      await axios.put(`/api/admin/users/${userId}`, { ruolo });
      loadUsers();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestione Utenti</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? "Annulla" : "Nuovo Utente"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="border px-3 py-2 rounded"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="border px-3 py-2 rounded"
              required
              minLength={6}
            />
            <input
              type="text"
              placeholder="Nome"
              value={newUser.nome}
              onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
              className="border px-3 py-2 rounded"
            />
            <input
              type="text"
              placeholder="Cognome"
              value={newUser.cognome}
              onChange={(e) => setNewUser({ ...newUser, cognome: e.target.value })}
              className="border px-3 py-2 rounded"
            />
            <select
              value={newUser.ruolo}
              onChange={(e) => setNewUser({ ...newUser, ruolo: e.target.value })}
              className="border px-3 py-2 rounded col-span-2"
            >
              {RUOLI.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
            Crea Utente
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Ruolo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-3 text-sm">{u.email}</td>
                <td className="px-6 py-3 text-sm">{u.nome} {u.cognome}</td>
                <td className="px-6 py-3 text-sm">
                  <select
                    value={u.ruolo}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    {RUOLI.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-3 text-sm">
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Elimina
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
