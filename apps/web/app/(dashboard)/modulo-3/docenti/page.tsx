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

const EMPTY_FORM = { nome: "", cognome: "", email: "", tariffaOraria: 0 };

export default function DocentiPage() {
  const [docenti, setDocenti] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

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
    await axios.post("/api/docenti", form);
    setForm(EMPTY_FORM);
    setShowForm(false);
    load();
  };

  const startEdit = (d: any) => {
    setEditingId(d.id);
    setEditForm({ nome: d.nome, cognome: d.cognome, email: d.email, tariffaOraria: Number(d.tariffaOraria) });
  };

  const saveEdit = async (id: string) => {
    await axios.put(`/api/docenti/${id}`, editForm);
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questo docente?")) return;
    await axios.delete(`/api/docenti/${id}`);
    load();
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold text-foreground mb-1">Aule</h1>
      <p className="text-sm text-muted-foreground mb-4">Anagrafica corsi, docenti e gestione aule</p>
      <AuleSubNav />

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-foreground">Anagrafica Docenti</h2>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Annulla" : "Nuovo Docente"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Cognome</Label>
                <Input value={form.cognome} onChange={(e) => setForm({ ...form, cognome: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Tariffa Oraria €</Label>
                <Input type="number" step="0.01" value={form.tariffaOraria} onChange={(e) => setForm({ ...form, tariffaOraria: parseFloat(e.target.value) })} required />
              </div>
              <Button type="submit" variant="success" className="col-span-2">Crea Docente</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Tariffa/h</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docenti.map((d) => {
            const editing = editingId === d.id;
            return (
              <TableRow key={d.id}>
                <TableCell className="font-medium">
                  {editing ? (
                    <div className="flex gap-2">
                      <Input value={editForm.cognome} onChange={(e) => setEditForm({ ...editForm, cognome: e.target.value })} className="h-8 w-28" placeholder="Cognome" />
                      <Input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} className="h-8 w-28" placeholder="Nome" />
                    </div>
                  ) : (
                    `${d.cognome} ${d.nome}`
                  )}
                </TableCell>
                <TableCell>
                  {editing ? (
                    <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="h-8 w-48" />
                  ) : (
                    d.email
                  )}
                </TableCell>
                <TableCell className="font-data tabular-nums">
                  {editing ? (
                    <Input type="number" step="0.01" value={editForm.tariffaOraria} onChange={(e) => setEditForm({ ...editForm, tariffaOraria: parseFloat(e.target.value) })} className="h-8 w-24" />
                  ) : (
                    `€ ${Number(d.tariffaOraria).toFixed(2)}`
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    {editing ? (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => saveEdit(d.id)} title="Salva">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingId(null)} title="Annulla">
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-sky-600 hover:text-sky-700 hover:bg-sky-50" onClick={() => startEdit(d)} title="Modifica">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(d.id)} title="Elimina">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
