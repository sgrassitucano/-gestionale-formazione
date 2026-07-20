"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default function ListinoPrezziPage() {
  const [listini, setListini] = useState<any[]>([]);
  const [corsi, setCorsi] = useState<any[]>([]);
  const [form, setForm] = useState({ corsoCodec: "", tipoErogazione: "AULA_FAD", costo: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [listiniRes, corsiRes] = await Promise.all([axios.get("/api/listini"), axios.get("/api/corsi")]);
      setListini(listiniRes.data.listini || []);
      setCorsi(corsiRes.data.corsi || []);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post("/api/listini", form);
    setForm({ corsoCodec: "", tipoErogazione: "AULA_FAD", costo: 0 });
    load();
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Listino Prezzi</h1>
      <p className="text-sm text-muted-foreground mb-6">Costi per corso: fisso per aula (Presenza/FAD Sync) o per discente (FAD Async)</p>

      <Card className="mb-6">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="flex gap-4 items-end flex-wrap">
            <div className="space-y-1.5">
              <Label>Corso</Label>
              <select
                value={form.corsoCodec}
                onChange={(e) => setForm({ ...form, corsoCodec: e.target.value })}
                className="flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm"
                required
              >
                <option value="">Seleziona corso</option>
                {corsi.map((c) => <option key={c.codice} value={c.codice}>{c.titolo}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo Erogazione</Label>
              <select
                value={form.tipoErogazione}
                onChange={(e) => setForm({ ...form, tipoErogazione: e.target.value })}
                className="flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm"
              >
                <option value="AULA_FAD">Presenza / FAD Sincrona (per aula)</option>
                <option value="E_LEARNING">FAD Asincrona (per discente)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Costo (€)</Label>
              <Input type="number" step="0.01" value={form.costo} onChange={(e) => setForm({ ...form, costo: parseFloat(e.target.value) })} className="w-32" required />
            </div>
            <Button type="submit" variant="success">Salva Listino</Button>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Corso</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Costo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listini.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="font-medium">{l.corso.titolo}</TableCell>
              <TableCell>{l.tipoErogazione === "AULA_FAD" ? "Presenza/FAD Sync" : "FAD Async"}</TableCell>
              <TableCell className="font-data tabular-nums">€ {Number(l.costo).toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
