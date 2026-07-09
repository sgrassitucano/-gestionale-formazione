"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Plus, X, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const STATO_VARIANT: Record<string, "warning" | "default" | "success"> = {
  PIANIFICATA: "warning",
  IN_CORSO: "default",
  CONCLUSA: "success",
};

export default function AulePage() {
  const [aule, setAule] = useState<any[]>([]);
  const [corsi, setCorsi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ corsoCodec: "", luogo: "", dataInizio: "" });
  const [filterStato, setFilterStato] = useState("");

  useEffect(() => {
    loadAule();
    axios.get("/api/corsi").then((res) => setCorsi(res.data.corsi || []));
  }, [filterStato]);

  const loadAule = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStato) params.stato = filterStato;
      const res = await axios.get("/api/aule", { params });
      setAule(res.data.aule || []);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/aule", form);
      setForm({ corsoCodec: "", luogo: "", dataInizio: "" });
      setShowForm(false);
      loadAule();
    } catch (error: any) {
      alert(error.response?.data?.error || "Errore creazione aula");
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aule</h1>
          <p className="text-sm text-muted-foreground">Gestione aule, calendario, docenti</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Annulla" : "Nuova Aula"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <form onSubmit={handleCreate} className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Corso</Label>
                <select
                  value={form.corsoCodec}
                  onChange={(e) => setForm({ ...form, corsoCodec: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  required
                >
                  <option value="">Seleziona corso</option>
                  {corsi.map((c) => <option key={c.codice} value={c.codice}>{c.titolo}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Luogo</Label>
                <Input value={form.luogo} onChange={(e) => setForm({ ...form, luogo: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Data Inizio</Label>
                <Input type="date" value={form.dataInizio} onChange={(e) => setForm({ ...form, dataInizio: e.target.value })} />
              </div>
              <Button type="submit" variant="success" className="col-span-3">
                Crea Aula
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 mb-4">
        {["", "PIANIFICATA", "IN_CORSO", "CONCLUSA"].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filterStato === s ? "default" : "outline"}
            onClick={() => setFilterStato(s)}
          >
            {s || "Tutte"}
          </Button>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Corso</TableHead>
            <TableHead>Luogo</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead>Discenti</TableHead>
            <TableHead>Docenti</TableHead>
            <TableHead>Data Inizio</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aule.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.corso?.titolo}</TableCell>
              <TableCell>{a.luogo}</TableCell>
              <TableCell>
                <Badge variant={STATO_VARIANT[a.stato]}>{a.stato}</Badge>
              </TableCell>
              <TableCell>{a.iscrizioni?.length || 0}</TableCell>
              <TableCell>{a.docentilezioni?.length || 0}</TableCell>
              <TableCell>{a.dataInizio ? new Date(a.dataInizio).toLocaleDateString("it-IT") : "-"}</TableCell>
              <TableCell>
                <Link href={`/modulo-3/aule/${a.id}`}>
                  <Button variant="ghost" size="sm">
                    Apri <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
