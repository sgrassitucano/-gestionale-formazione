"use client";

import { useState } from "react";
import axios from "axios";
import { Search, User, GraduationCap, MapPin } from "lucide-react";
import { AuleSubNav } from "@/components/layout/AuleSubNav";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const TABS = [
  { key: "discenti", label: "Discente", icon: User },
  { key: "docenti", label: "Docente", icon: GraduationCap },
  { key: "luoghi", label: "Luogo", icon: MapPin },
];

const MODALITA_LABELS: Record<string, string> = {
  PRESENZA: "Presenza",
  FAD_SINCRONA: "FAD Sincrona",
  FAD_ASINCRONA: "FAD Asincrona",
};

function fmtData(d: string | null) {
  return d ? new Date(d).toLocaleDateString("it-IT") : "-";
}

export default function RicercaPage() {
  const [tab, setTab] = useState<"discenti" | "docenti" | "luoghi">("discenti");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (q.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await axios.get(`/api/ricerca/${tab}`, { params: { q: q.trim() } });
      setResults(res.data[tab] || []);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t: typeof tab) => {
    setTab(t);
    setResults([]);
    setSearched(false);
    setQ("");
  };

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Aule</h1>
      <p className="text-sm text-muted-foreground mb-4">Anagrafica corsi, docenti e gestione aule</p>
      <AuleSubNav />

      <div className="flex gap-1 mb-4 bg-secondary/60 p-1 rounded-lg w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <Button key={t.key} size="sm" variant={tab === t.key ? "default" : "ghost"} onClick={() => switchTab(t.key as any)}>
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </Button>
          );
        })}
      </div>

      <div className="flex gap-2 mb-6">
        <Input
          placeholder={
            tab === "discenti" ? "Cerca per nome, cognome o codice fiscale..." :
            tab === "docenti" ? "Cerca per nome o cognome..." :
            "Cerca per nome sede..."
          }
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={q.trim().length < 2 || loading}>
          <Search className="h-4 w-4" />
          {loading ? "Ricerca..." : "Cerca"}
        </Button>
      </div>

      {searched && results.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">Nessun risultato.</p>
      )}

      {tab === "discenti" && results.map((d: any) => (
        <Card key={d.id} className="mb-4">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-foreground">{d.cognome} {d.nome}</p>
                <p className="text-xs text-muted-foreground font-mono">{d.codiceFiscale} — {d.azienda?.ragioneSociale}</p>
              </div>
              <Badge variant="secondary">{d.iscrizioni.length} corsi</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Corso</TableHead>
                  <TableHead>Modalità</TableHead>
                  <TableHead>Luogo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Stato Aula</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.iscrizioni.map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.aula.corso?.titolo}</TableCell>
                    <TableCell>{MODALITA_LABELS[i.aula.modalita] || i.aula.modalita}</TableCell>
                    <TableCell>{i.aula.luogo?.nome ?? "-"}</TableCell>
                    <TableCell>{fmtData(i.aula.dataInizio)}</TableCell>
                    <TableCell><Badge variant="secondary" dot>{i.aula.stato}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {tab === "docenti" && results.map((doc: any) => {
        const totale = doc.docentilezioni.reduce(
          (sum: number, dl: any) => sum + Number(dl.oreEffettiveDocenza) * Number(doc.tariffaOraria) + Number(dl.trasferAcosto),
          0
        );
        return (
          <Card key={doc.id} className="mb-4">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">{doc.cognome} {doc.nome}</p>
                  <p className="text-xs text-muted-foreground">{doc.email} — € {Number(doc.tariffaOraria).toFixed(2)}/h</p>
                </div>
                <Badge variant="secondary">Totale: € {totale.toFixed(2)}</Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Corso</TableHead>
                    <TableHead>Luogo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ore</TableHead>
                    <TableHead>Trasferta</TableHead>
                    <TableHead>Costo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doc.docentilezioni.map((dl: any) => (
                    <TableRow key={dl.id}>
                      <TableCell className="font-medium">{dl.aula.corso?.titolo}</TableCell>
                      <TableCell>{dl.aula.luogo?.nome ?? "-"}</TableCell>
                      <TableCell>{fmtData(dl.aula.dataInizio)}</TableCell>
                      <TableCell className="font-data tabular-nums">{Number(dl.oreEffettiveDocenza)}h</TableCell>
                      <TableCell className="font-data tabular-nums">€ {Number(dl.trasferAcosto).toFixed(2)}</TableCell>
                      <TableCell className="font-data tabular-nums">€ {(Number(dl.oreEffettiveDocenza) * Number(doc.tariffaOraria) + Number(dl.trasferAcosto)).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {tab === "luoghi" && results.map((l: any) => {
        const totaleAffitto = l.aule.reduce((sum: number, a: any) => sum + Number(a.costoAffitto), 0);
        return (
          <Card key={l.id} className="mb-4">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">{l.nome}</p>
                  <p className="text-xs text-muted-foreground">{l.indirizzo || "-"}</p>
                </div>
                <Badge variant="secondary">{l.aule.length} aule — € {totaleAffitto.toFixed(2)} affitto tot.</Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Corso</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Discenti</TableHead>
                    <TableHead>Docenti</TableHead>
                    <TableHead>Costo Affitto</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {l.aule.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.corso?.titolo}</TableCell>
                      <TableCell>{fmtData(a.dataInizio)}</TableCell>
                      <TableCell className="font-data tabular-nums">{a.iscrizioni.length}</TableCell>
                      <TableCell>{a.docentilezioni.map((dl: any) => `${dl.docente.cognome}`).join(", ") || "-"}</TableCell>
                      <TableCell className="font-data tabular-nums">€ {Number(a.costoAffitto).toFixed(2)}</TableCell>
                      <TableCell><Badge variant="secondary" dot>{a.stato}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
