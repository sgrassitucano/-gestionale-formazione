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

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function BilancioGeneraleTab() {
  const [da, setDa] = useState(currentMonth());
  const [a, setA] = useState(currentMonth());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    descrizione: "",
    categoria: "",
    tipo: "USCITA" as "ENTRATA" | "USCITA",
    importo: 0,
    dataInizio: currentMonth() + "-01",
    dataFine: "",
    ricorrente: true,
  });

  useEffect(() => {
    load();
  }, [da, a]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/reports/bilancio-generale", { params: { da, a } });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post("/api/voci-contabili", {
      ...form,
      dataFine: form.dataFine || null,
    });
    setForm({ descrizione: "", categoria: "", tipo: "USCITA", importo: 0, dataInizio: currentMonth() + "-01", dataFine: "", ricorrente: true });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questa voce?")) return;
    await axios.delete(`/api/voci-contabili/${id}`);
    load();
  };

  if (loading && !data) return <div className="text-muted-foreground">Loading...</div>;

  const categorie = data?.categorie || {};

  return (
    <div>
      <Card className="mb-6">
        <CardContent className="p-4 flex gap-4 items-end flex-wrap">
          <div className="space-y-1.5">
            <Label>Da</Label>
            <Input type="month" value={da} onChange={(e) => setDa(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>A</Label>
            <Input type="month" value={a} onChange={(e) => setA(e.target.value)} />
          </div>
          <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"} className="ml-auto">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Annulla" : "Nuova Voce"}
          </Button>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <form onSubmit={handleCreate} className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Descrizione</Label>
                <Input value={form.descrizione} onChange={(e) => setForm({ ...form, descrizione: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="es. Piattaforma, EBAFOS" required />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as any })} className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
                  <option value="USCITA">Uscita</option>
                  <option value="ENTRATA">Entrata</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Importo (€) {form.ricorrente && "/ mese"}</Label>
                <Input type="number" step="0.01" value={form.importo} onChange={(e) => setForm({ ...form, importo: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Ricorrente</Label>
                <select value={form.ricorrente ? "1" : "0"} onChange={(e) => setForm({ ...form, ricorrente: e.target.value === "1" })} className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
                  <option value="1">Sì, ogni mese</option>
                  <option value="0">No, una tantum</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>{form.ricorrente ? "Attiva da" : "Data"}</Label>
                <Input type="month" value={form.dataInizio.slice(0, 7)} onChange={(e) => setForm({ ...form, dataInizio: e.target.value + "-01" })} required />
              </div>
              {form.ricorrente && (
                <div className="space-y-1.5">
                  <Label>Attiva fino a (vuoto = sempre)</Label>
                  <Input type="month" value={form.dataFine ? form.dataFine.slice(0, 7) : ""} onChange={(e) => setForm({ ...form, dataFine: e.target.value ? e.target.value + "-01" : "" })} />
                </div>
              )}
              <Button type="submit" variant="success" className="col-span-3">Salva Voce</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Entrate Totali</p>
            <p className="text-2xl font-bold text-success">€ {(data?.totaleEntrate ?? 0).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Uscite Totali</p>
            <p className="text-2xl font-bold text-destructive">€ {(data?.totaleUscite ?? 0).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Margine</p>
            <p className="text-2xl font-bold text-primary">€ {(data?.margine ?? 0).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Entrate</TableHead>
                <TableHead>Uscite</TableHead>
                <TableHead>Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(categorie).map(([cat, v]: [string, any]) => (
                <TableRow key={cat}>
                  <TableCell className="font-medium">{cat}</TableCell>
                  <TableCell className="text-success">{v.entrate > 0 ? `€ ${v.entrate.toFixed(2)}` : "-"}</TableCell>
                  <TableCell className="text-destructive">{v.uscite > 0 ? `€ ${v.uscite.toFixed(2)}` : "-"}</TableCell>
                  <TableCell className="font-semibold">€ {(v.entrate - v.uscite).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data?.vociManuali?.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <p className="font-semibold text-foreground p-4 pb-0 text-sm">Voci Manuali nel Periodo</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Importo/mese</TableHead>
                  <TableHead>Mesi</TableHead>
                  <TableHead>Totale periodo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.vociManuali.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.descrizione}</TableCell>
                    <TableCell>{v.categoria}</TableCell>
                    <TableCell><Badge variant={v.tipo === "ENTRATA" ? "success" : "destructive"} dot>{v.tipo}</Badge></TableCell>
                    <TableCell>€ {v.importoMensile.toFixed(2)} {v.ricorrente && <span className="text-xs text-muted-foreground">(ricorrente)</span>}</TableCell>
                    <TableCell>{v.mesiConteggiati}</TableCell>
                    <TableCell className="font-semibold">€ {v.importoTotale.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(v.id)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
