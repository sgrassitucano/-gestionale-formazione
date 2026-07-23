"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Download, ChevronDown, ChevronUp, Landmark, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const TIPO_CORSO_LABELS: Record<string, string> = {
  FORMAZIONE: "Formazione",
  AGGIORNAMENTO: "Aggiornamento",
};

export default function Modulo7Page() {
  const [mese, setMese] = useState(""); // vuoto = tutti i periodi
  const [aulaId, setAulaId] = useState("");
  const [tipoCorso, setTipoCorso] = useState("");
  const [aule, setAule] = useState<any[]>([]);
  const [drillDown, setDrillDown] = useState<any[]>([]);
  const [expandedCantiere, setExpandedCantiere] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/aule", { params: { stato: "CONCLUSA" } }).then((res) => setAule(res.data.aule || []));
  }, []);

  useEffect(() => {
    loadCentriCosto();
  }, [mese, aulaId, tipoCorso]);

  const filtriAttivi = () => {
    const params: Record<string, string> = {};
    if (mese) params.mese = mese;
    if (aulaId) params.aulaId = aulaId;
    if (tipoCorso) params.tipoCorso = tipoCorso;
    return params;
  };

  const loadCentriCosto = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/reports/centri-costo", { params: filtriAttivi() });
      setDrillDown(res.data.drillDown || []);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams({ ...filtriAttivi(), format: "xlsx" });
    window.open(`/api/reports/centri-costo?${params.toString()}`, "_blank");
  };

  const totale = drillDown.reduce((sum, c) => sum + c.totale, 0);

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold text-foreground mb-1">Centri di Costo</h1>
      <p className="text-sm text-muted-foreground mb-6">Distribuzione costi per cantiere, aggregata per mese</p>

      <Card className="mb-6">
        <CardContent className="p-4 flex gap-4 items-end flex-wrap">
          <div className="space-y-1.5">
            <Label>Mese</Label>
            <div className="flex items-center gap-1">
              <Input type="month" value={mese} onChange={(e) => setMese(e.target.value)} placeholder="Tutti i periodi" />
              {mese && (
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setMese("")} title="Rimuovi filtro mese (tutti i periodi)">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Aula</Label>
            <select
              value={aulaId}
              onChange={(e) => setAulaId(e.target.value)}
              className="flex h-10 w-56 rounded-md border border-input bg-card px-3 py-2 text-sm"
            >
              <option value="">Tutte le aule</option>
              {aule.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome ? `${a.nome} — ` : ""}{a.corso?.titolo}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo Corso</Label>
            <select
              value={tipoCorso}
              onChange={(e) => setTipoCorso(e.target.value)}
              className="flex h-10 w-44 rounded-md border border-input bg-card px-3 py-2 text-sm"
            >
              <option value="">Tutti</option>
              {Object.entries(TIPO_CORSO_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <Button variant="success" onClick={handleExport}><Download className="h-4 w-4" /> Export XLS</Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Totale Costi Distribuiti</p>
            <p className="text-3xl font-bold text-primary">€ {totale.toFixed(2)}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Landmark className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : drillDown.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            Nessun dato disponibile per i filtri selezionati.
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cantiere</TableHead>
              <TableHead>Ricavo Fatturato</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drillDown.map((c) => (
              <>
                <TableRow
                  key={c.cantiere}
                  className="cursor-pointer"
                  onClick={() => setExpandedCantiere(expandedCantiere === c.cantiere ? null : c.cantiere)}
                >
                  <TableCell className="font-semibold">{c.cantiere}</TableCell>
                  <TableCell className="font-data tabular-nums">€ {c.totale.toFixed(2)}</TableCell>
                  <TableCell className="text-primary flex items-center gap-1 text-sm">
                    {expandedCantiere === c.cantiere ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Dettaglio
                  </TableCell>
                </TableRow>
                {expandedCantiere === c.cantiere &&
                  c.sottocantieri.map((sub: any) => (
                    <TableRow key={`${c.cantiere}-${sub.nome}`} className="bg-secondary/30 align-top">
                      <TableCell className="pl-10 text-muted-foreground text-sm">
                        <div>{sub.nome} {sub.responsabile ? `(Resp: ${sub.responsabile})` : ""}</div>
                        {sub.lavoratori?.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground/80">
                            {sub.lavoratori.map((l: any, i: number) => (
                              <li key={i}>{l.cognome} {l.nome} — <span className="italic">{l.corso}</span></li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm font-data tabular-nums">€ {sub.totale.toFixed(2)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))}
              </>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
