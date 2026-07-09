"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Download, ChevronDown, ChevronUp, Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default function Modulo7Page() {
  const [aule, setAule] = useState<any[]>([]);
  const [selectedAula, setSelectedAula] = useState("");
  const [drillDown, setDrillDown] = useState<any[]>([]);
  const [expandedCantiere, setExpandedCantiere] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/aule").then((res) => setAule(res.data.aule || [])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCentriCosto();
  }, [selectedAula]);

  const loadCentriCosto = async () => {
    const params: any = {};
    if (selectedAula) params.aulaId = selectedAula;
    const res = await axios.get("/api/reports/centri-costo", { params });
    setDrillDown(res.data.drillDown || []);
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (selectedAula) params.append("aulaId", selectedAula);
    params.append("format", "xlsx");
    window.open(`/api/reports/centri-costo?${params.toString()}`, "_blank");
  };

  const totale = drillDown.reduce((sum, c) => sum + c.totale, 0);

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Centri di Costo</h1>
      <p className="text-sm text-muted-foreground mb-6">Distribuzione costi per cantiere</p>

      <Card className="mb-6">
        <CardContent className="p-4 flex gap-4 items-end">
          <div className="flex-1 space-y-1.5">
            <Label>Seleziona Aula</Label>
            <select
              value={selectedAula}
              onChange={(e) => setSelectedAula(e.target.value)}
              className="w-full flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm"
            >
              <option value="">Tutte le aule (AULA_FAD chiuse)</option>
              {aule.map((a: any) => (
                <option key={a.id} value={a.id}>{a.corso?.titolo} — {a.luogo}</option>
              ))}
            </select>
          </div>
          <Button variant="success" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export XLS
          </Button>
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

      {drillDown.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            Nessun dato disponibile. Chiudi un'aula AULA_FAD per generare centri costo.
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cantiere</TableHead>
              <TableHead>Costo Totale</TableHead>
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
                  <TableCell>€ {c.totale.toFixed(2)}</TableCell>
                  <TableCell className="text-primary flex items-center gap-1 text-sm">
                    {expandedCantiere === c.cantiere ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Dettaglio
                  </TableCell>
                </TableRow>
                {expandedCantiere === c.cantiere &&
                  c.sottocantieri.map((sub: any) => (
                    <TableRow key={`${c.cantiere}-${sub.nome}`} className="bg-secondary/30">
                      <TableCell className="pl-10 text-muted-foreground text-sm">
                        {sub.nome} {sub.responsabile ? `(Resp: ${sub.responsabile})` : ""}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">€ {sub.totale.toFixed(2)}</TableCell>
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
