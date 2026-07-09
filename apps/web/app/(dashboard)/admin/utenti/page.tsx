"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, X, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const RUOLI = ["SUPERADMIN", "SEGRETERIA", "AMMINISTRAZIONE", "VISUALIZZATORE"];

const ROLE_VARIANT: Record<string, "default" | "secondary" | "success" | "warning"> = {
  SUPERADMIN: "warning",
  SEGRETERIA: "default",
  AMMINISTRAZIONE: "success",
  VISUALIZZATORE: "secondary",
};

export default function UtentiPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", ruolo: "VISUALIZZATORE", nome: "", cognome: "" });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await axios.get("/api/admin/users");
      setUsers(res.data.users || []);
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
    await axios.put(`/api/admin/users/${userId}`, { ruolo });
    loadUsers();
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestione Utenti</h1>
          <p className="text-sm text-muted-foreground">Crea e gestisci gli account di sistema</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Annulla" : "Nuovo Utente"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} />
              </div>
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={newUser.nome} onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Cognome</Label>
                <Input value={newUser.cognome} onChange={(e) => setNewUser({ ...newUser, cognome: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Ruolo</Label>
                <select
                  value={newUser.ruolo}
                  onChange={(e) => setNewUser({ ...newUser, ruolo: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                >
                  {RUOLI.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <Button type="submit" variant="success" className="col-span-2">Crea Utente</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Ruolo</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.nome} {u.cognome}</TableCell>
              <TableCell>
                <select
                  value={u.ruolo}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                >
                  {RUOLI.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(u.id)} className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
