"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, X } from "lucide-react";
import { AuleSubNav } from "@/components/layout/AuleSubNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

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
    await axios.post("/api/docenti", form);
    setForm({ nome: "", cognome: "", email: "", tariffaOraria: 0 });
    setShowForm(false);
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {docenti.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">{d.cognome} {d.nome}</TableCell>
              <TableCell>{d.email}</TableCell>
              <TableCell className="font-data tabular-nums">€ {Number(d.tariffaOraria).toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
