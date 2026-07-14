"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, X, Pencil, Trash2, Check } from "lucide-react";
import { AuleSubNav } from "@/components/layout/AuleSubNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default function LuoghiPage() {
  const [luoghi, setLuoghi] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", indirizzo: "" });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", indirizzo: "" });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await axios.get("/api/luoghi");
      setLuoghi(res.data.luoghi || []);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post("/api/luoghi", form);
    setForm({ nome: "", indirizzo: "" });
    setShowForm(false);
    load();
  };

  const startEdit = (l: any) => {
    setEditingId(l.id);
    setEditForm({ nome: l.nome, indirizzo: l.indirizzo || "" });
  };

  const saveEdit = async (id: string) => {
    await axios.put(`/api/luoghi/${id}`, editForm);
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questo luogo?")) return;
    await axios.delete(`/api/luoghi/${id}`);
    load();
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Aule</h1>
      <p className="text-sm text-muted-foreground mb-4">Anagrafica corsi, docenti e gestione aule</p>
      <AuleSubNav />

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-foreground">Anagrafica Luoghi</h2>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Annulla" : "Nuovo Luogo"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome Sede</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Indirizzo</Label>
                <Input value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: e.target.value })} />
              </div>
              <Button type="submit" variant="success" className="col-span-2">Crea Luogo</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Indirizzo</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {luoghi.map((l) => (
            <TableRow key={l.id}>
              {editingId === l.id ? (
                <>
                  <TableCell>
                    <Input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} className="h-8" autoFocus />
                  </TableCell>
                  <TableCell>
                    <Input value={editForm.indirizzo} onChange={(e) => setEditForm({ ...editForm, indirizzo: e.target.value })} className="h-8" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => saveEdit(l.id)}>
                        <Check className="h-3.5 w-3.5 text-success" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="font-medium">{l.nome}</TableCell>
                  <TableCell>{l.indirizzo || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(l)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(l.id)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
