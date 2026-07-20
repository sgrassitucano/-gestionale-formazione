"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Plus, ArrowRight } from "lucide-react";
import { AuleSubNav } from "@/components/layout/AuleSubNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const STATO_VARIANT: Record<string, "warning" | "default" | "success"> = {
  PIANIFICATA: "warning",
  IN_CORSO: "default",
  CONCLUSA: "success",
};

const MODALITA_LABELS: Record<string, string> = {
  PRESENZA: "Presenza",
  FAD_SINCRONA: "FAD Sincrona",
  FAD_ASINCRONA: "FAD Asincrona",
};

export default function AulePage() {
  const [aule, setAule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStato, setFilterStato] = useState("");

  useEffect(() => {
    loadAule();
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

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Aule</h1>
      <p className="text-sm text-muted-foreground mb-4">Anagrafica corsi, docenti e gestione aule</p>
      <AuleSubNav />

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {["", "PIANIFICATA", "IN_CORSO", "CONCLUSA"].map((s) => (
            <Button key={s} size="sm" variant={filterStato === s ? "default" : "outline"} onClick={() => setFilterStato(s)}>
              {s || "Tutte"}
            </Button>
          ))}
        </div>
        <Link href="/modulo-3/aule/new">
          <Button><Plus className="h-4 w-4" /> Nuova Aula</Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Corso</TableHead>
            <TableHead>Modalità</TableHead>
            <TableHead>Luogo</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead>Discenti</TableHead>
            <TableHead>Docenti</TableHead>
            <TableHead>Data Aula</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aule.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.corso?.titolo}</TableCell>
              <TableCell><Badge variant="secondary">{MODALITA_LABELS[a.modalita] || a.modalita}</Badge></TableCell>
              <TableCell>{a.luogo?.nome ?? "-"}</TableCell>
              <TableCell><Badge variant={STATO_VARIANT[a.stato]} dot>{a.stato}</Badge></TableCell>
              <TableCell>{a.iscrizioni?.length || 0}</TableCell>
              <TableCell>{a.docentilezioni?.length || 0}</TableCell>
              <TableCell>{a.dataInizio ? new Date(a.dataInizio).toLocaleDateString("it-IT") : "-"}</TableCell>
              <TableCell>
                <Link href={`/modulo-3/aule/${a.id}`}>
                  <Button variant="ghost" size="sm">Apri <ArrowRight className="h-3.5 w-3.5" /></Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
