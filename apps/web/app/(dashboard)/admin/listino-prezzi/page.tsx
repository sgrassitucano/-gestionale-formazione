"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const EMPTY_FORM = { corsoCodec: "", tipoErogazione: "AULA_FAD", costo: 0, costoPiattaformaPerDiscente: "" };

export default function ListinoPrezziPage() {
  const [listini, setListini] = useState<any[]>([]);
  const [corsi, setCorsi] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ costo: 0, costoPiattaformaPerDiscente: "" });

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
    await axios.post("/api/listini", {
      corsoCodec: form.corsoCodec,
      tipoErogazione: form.tipoErogazione,
      costo: form.costo,
      costoPiattaformaPerDiscente: form.costoPiattaformaPerDiscente ? parseFloat(form.costoPiattaformaPerDiscente) : null,
    });
    setForm(EMPTY_FORM);
    load();
  };

  const startEdit = (l: any) => {
    setEditingId(l.id);
    setEditForm({
      costo: Number(l.costo),
      costoPiattaformaPerDiscente: l.costoPiattaformaPerDiscente != null ? String(Number(l.costoPiattaformaPerDiscente)) : "",
    });
  };

  const saveEdit = async (id: string) => {
    await axios.put(`/api/listini/${id}`, {
      costo: editForm.costo,
      costoPiattaformaPerDiscente: editForm.costoPiattaformaPerDiscente ? parseFloat(editForm.costoPiattaformaPerDiscente) : null,
    });
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questa voce di listino?")) return;
    await axios.delete(`/api/listini/${id}`);
    load();
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold text-foreground mb-1">Listino Prezzi</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Costi per corso: fisso per aula (Presenza/FAD Sync) o per discente (FAD Async). Il "Costo Piattaforma" è il costo esterno FAD/EBAFOS per corsista, fisso per tipo corso — impostalo una volta qui, non serve inserirlo a mano ogni chiusura aula.
      </p>

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
            <div className="space-y-1.5">
              <Label>Costo Piattaforma / discente (€)</Label>
              <Input type="number" step="0.01" placeholder="opzionale" value={form.costoPiattaformaPerDiscente} onChange={(e) => setForm({ ...form, costoPiattaformaPerDiscente: e.target.value })} className="w-40" />
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
            <TableHead>Costo Piattaforma / discente</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listini.map((l) => {
            const editing = editingId === l.id;
            return (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.corso.titolo}</TableCell>
                <TableCell>{l.tipoErogazione === "AULA_FAD" ? "Presenza/FAD Sync" : "FAD Async"}</TableCell>
                <TableCell className="font-data tabular-nums">
                  {editing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.costo}
                      onChange={(e) => setEditForm({ ...editForm, costo: parseFloat(e.target.value) })}
                      className="w-28 h-8"
                    />
                  ) : (
                    `€ ${Number(l.costo).toFixed(2)}`
                  )}
                </TableCell>
                <TableCell className="font-data tabular-nums">
                  {editing ? (
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="opzionale"
                      value={editForm.costoPiattaformaPerDiscente}
                      onChange={(e) => setEditForm({ ...editForm, costoPiattaformaPerDiscente: e.target.value })}
                      className="w-32 h-8"
                    />
                  ) : l.costoPiattaformaPerDiscente != null ? (
                    `€ ${Number(l.costoPiattaformaPerDiscente).toFixed(2)}`
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    {editing ? (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => saveEdit(l.id)} title="Salva">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingId(null)} title="Annulla">
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-sky-600 hover:text-sky-700 hover:bg-sky-50" onClick={() => startEdit(l)} title="Modifica">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(l.id)} title="Elimina">
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
